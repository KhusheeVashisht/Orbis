let websocket = null;

let microphoneStream = null;
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let animationFrame = null;
let audioWorkletNode = null;

let audioBuffer = [];


/*
 * Orbis audio pipeline
 *
 * Browser microphone:
 *
 * Microphone
 *     ↓
 * Browser AudioContext
 *     ↓
 * AudioWorklet
 *     ↓
 * Resample to 16 kHz
 *     ↓
 * 2-second WAV chunks
 *     ↓
 * WebSocket
 *     ↓
 * Orbis backend
 *
 *
 * Faster-Whisper expects normal speech audio.
 *
 * We therefore make sure the audio sent to the
 * backend is always:
 *
 *     Sample rate: 16000 Hz
 *     Channels:    1
 *     Bit depth:   16-bit PCM
 */


const TARGET_SAMPLE_RATE = 16000;

/*
 * Utterance Endpointing Constants
 */
const SILENCE_HANGOVER_MS = 800;
const PRE_ROLL_MS = 300;
const MAX_UTTERANCE_MS = 30000;
const MIN_UTTERANCE_MS = 300;
const SPEECH_THRESHOLD_MIN = 0.015;

/*
 * Sample counts at 16 kHz
 */
const PRE_ROLL_SAMPLES = Math.floor(
    TARGET_SAMPLE_RATE * (PRE_ROLL_MS / 1000)
);

const SILENCE_HANGOVER_SAMPLES = Math.floor(
    TARGET_SAMPLE_RATE * (SILENCE_HANGOVER_MS / 1000)
);

const MAX_UTTERANCE_SAMPLES = Math.floor(
    TARGET_SAMPLE_RATE * (MAX_UTTERANCE_MS / 1000)
);

const MIN_UTTERANCE_SAMPLES = Math.floor(
    TARGET_SAMPLE_RATE * (MIN_UTTERANCE_MS / 1000)
);

/*
 * State variables for utterance endpointing
 */
let isSpeaking = false;
let utteranceBuffer = [];
let preRollBuffer = [];
let silenceSamples = 0;
let adaptiveNoiseFloor = 0.005;


/*
 * DOM elements
 */

const startButton =
    document.getElementById(
        "startButton"
    );

const stopButton =
    document.getElementById(
        "stopButton"
    );

const statusText =
    document.getElementById(
        "statusText"
    );

const statusIndicator =
    document.getElementById(
        "statusIndicator"
    );

const audioLevel =
    document.getElementById(
        "audioLevel"
    );

const audioStatus =
    document.getElementById(
        "audioStatus"
    );

const audioValue =
    document.getElementById(
        "audioValue"
    );

const websocketStatus =
    document.getElementById(
        "websocketStatus"
    );

const websocketIndicator =
    document.getElementById(
        "websocketIndicator"
    );

const originalText =
    document.getElementById(
        "originalText"
    );

const translatedText =
    document.getElementById(
        "translatedText"
    );

const targetLanguage =
    document.getElementById(
        "targetLanguage"
    );


/*
 * Button events
 */

startButton.addEventListener(
    "click",
    startMicrophone
);

stopButton.addEventListener(
    "click",
    stopMicrophone
);


/*
 * Start microphone
 */

async function startMicrophone() {

    try {

        /*
         * Prevent accidental duplicate starts.
         */

        if (microphoneStream) {

            console.log(
                "Microphone is already running."
            );

            return;
        }


        /*
         * Connect to backend first.
         */

        console.log(
            "Connecting to Orbis backend..."
        );

        await connectWebSocket();


        /*
         * Request microphone access.
         *
         * These constraints ask the browser to
         * provide cleaner mono speech input.
         */

        console.log(
            "Requesting microphone access..."
        );

        microphoneStream =
            await navigator.mediaDevices.getUserMedia({

                audio: {

                    channelCount: 1,

                    echoCancellation: true,

                    noiseSuppression: true,

                    autoGainControl: true

                }

            });


        console.log(
            "Orbis microphone connected."
        );


        /*
         * Display information about the
         * selected microphone.
         */

        const audioTrack =
            microphoneStream.getAudioTracks()[0];


        if (audioTrack) {

            console.log(
                "Microphone device:",
                audioTrack.label
            );

            console.log(
                "Microphone settings:",
                audioTrack.getSettings()
            );

        }


        /*
         * Create AudioContext.
         *
         * IMPORTANT:
         * We do NOT assume the browser runs
         * at 16 kHz.
         */

        audioContext =
            new AudioContext();


        console.log(
            "Actual AudioContext sample rate:",
            audioContext.sampleRate
        );


        console.log(
            "AudioContext state:",
            audioContext.state
        );


        /*
         * Load AudioWorklet processor.
         */

        await audioContext.audioWorklet.addModule(
            chrome.runtime.getURL(
                "audio-processor.js"
            )
        );


        /*
         * Create analyser for the
         * microphone level meter.
         */

        analyser =
            audioContext.createAnalyser();

        analyser.fftSize = 1024;


        /*
         * Create microphone source.
         */

        microphoneSource =
            audioContext.createMediaStreamSource(
                microphoneStream
            );


        /*
         * Create AudioWorklet.
         */

        audioWorkletNode =
            new AudioWorkletNode(
                audioContext,
                "orbis-audio-processor"
            );


        /*
         * Reset audio buffer.
         */

        audioBuffer = [];


        /*
         * Receive audio samples from
         * AudioWorklet.
         */

        audioWorkletNode.port.onmessage =
            (event) => {

                const samples =
                    event.data;


                /*
                 * Convert incoming data to
                 * a normal Float32Array.
                 */

                const incomingSamples =
                    samples instanceof Float32Array
                        ? samples
                        : new Float32Array(samples);


                /*
                 * Add samples to our buffer.
                 *
                 * These samples are still at the
                 * browser AudioContext sample rate.
                 */

                audioBuffer.push(
                    ...incomingSamples
                );


                /*
                 * We intentionally do NOT use
                 * 32000 browser samples anymore.
                 *
                 * Instead, we gather enough input
                 * audio to create a proper 2-second
                 * 16 kHz output chunk.
                 *
                 * The actual amount of input required
                 * depends on the browser sample rate.
                 */

                processAudioBuffer();

            };


        /*
         * Connect microphone to analyser.
         *
         * This is only for monitoring.
         */

        microphoneSource.connect(
            analyser
        );


        /*
         * Connect microphone to AudioWorklet.
         */

        microphoneSource.connect(
            audioWorkletNode
        );


        /*
         * Resume AudioContext.
         */

        await audioContext.resume();


        console.log(
            "AudioContext state after resume:",
            audioContext.state
        );


        /*
         * Start visual audio monitoring.
         */

        monitorAudio();


        /*
         * Update UI.
         */

        statusText.textContent =
            "Microphone connected";

        statusIndicator.style.color =
            "green";

        audioStatus.textContent =
            "Microphone is active";

        startButton.disabled = true;

        stopButton.disabled = false;


        console.log(
            "Orbis audio capture started."
        );

    }

    catch (error) {

        console.error(
            "Microphone access failed:",
            error
        );


        /*
         * Clean up anything that may have
         * been created before the failure.
         */

        cleanupAudio();


        if (websocket) {

            websocket.close();

            websocket = null;

        }


        statusText.textContent =
            "Microphone unavailable";

        statusIndicator.style.color =
            "red";

        audioStatus.textContent =
            "Microphone access failed";

        startButton.disabled = false;

        stopButton.disabled = true;

    }

}


/*
 * Connect to Orbis backend.
 */

function connectWebSocket() {

    return new Promise(
        (resolve, reject) => {

            /*
             * Don't create another connection
             * if one already exists.
             */

            if (
                websocket &&
                websocket.readyState ===
                    WebSocket.OPEN
            ) {

                resolve();

                return;
            }


            websocket =
                new WebSocket(
                    "ws://127.0.0.1:8000/ws"
                );


            websocket.onopen = () => {

                console.log(
                    "Connected to Orbis WebSocket."
                );


                websocketStatus.textContent =
                    "Backend connected";

                websocketIndicator.style.color =
                    "green";


                resolve();

            };


            websocket.onerror = (error) => {

                console.error(
                    "WebSocket error:",
                    error
                );


                websocketStatus.textContent =
                    "Backend connection failed";

                websocketIndicator.style.color =
                    "red";


                reject(
                    new Error(
                        "Could not connect to Orbis backend."
                    )
                );

            };


            websocket.onclose = (event) => {

                console.log(
                    "Orbis WebSocket disconnected.",
                    event
                );


                websocketStatus.textContent =
                    "Backend disconnected";

                websocketIndicator.style.color =
                    "#888888";


                websocket = null;

            };


            websocket.onmessage = (event) => {

                console.log(
                    "FULL ORBIS RESPONSE:",
                    event.data
                );


                try {

                    const response =
                        JSON.parse(
                            event.data
                        );


                    /*
                     * Translation response.
                     */

                    if (
                        response.type ===
                        "transcription"
                    ) {

                        const data =
                            response.data || {};


                        originalText.textContent =
                            data.text ||
                            "No speech detected.";


                        translatedText.textContent =
                            data.translated_text ||
                            "No translation available.";


                        console.log(
                            "Original:",
                            data.text
                        );


                        console.log(
                            "Detected language:",
                            data.language
                        );


                        console.log(
                            "Language confidence:",
                            data.language_probability
                        );


                        console.log(
                            "Translation:",
                            data.translated_text
                        );


                        if (audioStatus) {

                            audioStatus.textContent =
                                "Translation ready";

                            setTimeout(() => {

                                if (
                                    !isSpeaking &&
                                    audioStatus.textContent ===
                                        "Translation ready"
                                ) {

                                    audioStatus.textContent =
                                        "Listening...";

                                }

                            }, 3000);

                        }

                    }


                    /*
                     * Backend audio analysis response.
                     */

                    else if (
                        response.type ===
                        "audio_analysis"
                    ) {

                        console.log(
                            "No speech detected in audio utterance."
                        );


                        if (audioStatus) {

                            audioStatus.textContent =
                                "Listening...";

                        }

                    }


                    /*
                     * Backend error response.
                     */

                    else if (
                        response.type ===
                        "error"
                    ) {

                        const errorMessage =
                            response.data &&
                            response.data.message
                                ? response.data.message
                                : typeof response.data ===
                                  "string"
                                ? response.data
                                : JSON.stringify(
                                      response.data
                                  );


                        console.error(
                            "Orbis backend error message:",
                            errorMessage
                        );


                        if (translatedText) {

                            translatedText.textContent =
                                `Orbis backend error: ${errorMessage}`;

                        }


                        if (audioStatus) {

                            audioStatus.textContent =
                                "Backend error";

                        }

                    }

                    else {

                        console.log(
                            "Orbis received message:",
                            response
                        );

                    }

                }

                catch (error) {

                    console.error(
                        "Failed to process server response:",
                        error
                    );

                }

            };

        }
    );

}


/*
 * Process browser audio.
 *
 * The browser may capture at:
 *
 *     44100 Hz
 *     48000 Hz
 *     or another rate.
 *
 * Whisper input is standardized here
 * to 16000 Hz.
 */

function processAudioBuffer() {

    if (
        !audioContext ||
        audioBuffer.length === 0
    ) {

        return;

    }


    const inputSampleRate =
        audioContext.sampleRate;


    /*
     * Drain incoming raw audio buffer
     * and resample to 16 kHz.
     */

    const rawSamples =
        new Float32Array(
            audioBuffer
        );

    audioBuffer = [];


    const resampled =
        resampleAudio(
            rawSamples,
            inputSampleRate,
            TARGET_SAMPLE_RATE
        );


    if (resampled.length === 0) {

        return;

    }


    /*
     * Process resampled 16 kHz samples in small 10ms frames
     * (160 samples per frame at 16 kHz).
     */

    const frameSize = 160;


    for (
        let offset = 0;
        offset < resampled.length;
        offset += frameSize
    ) {

        const frameEnd =
            Math.min(
                offset + frameSize,
                resampled.length
            );

        const frame =
            resampled.subarray(
                offset,
                frameEnd
            );


        /*
         * Calculate Root Mean Square (RMS) audio energy.
         */

        let sumSquare = 0;

        for (
            let i = 0;
            i < frame.length;
            i++
        ) {

            sumSquare +=
                frame[i] * frame[i];

        }

        const rms =
            Math.sqrt(
                sumSquare / frame.length
            );


        /*
         * Dynamic noise floor adaptation while idle.
         */

        if (!isSpeaking) {

            adaptiveNoiseFloor =
                adaptiveNoiseFloor * 0.98 +
                rms * 0.02;

            adaptiveNoiseFloor =
                Math.min(
                    adaptiveNoiseFloor,
                    0.05
                );

        }


        const speechThreshold =
            Math.max(
                SPEECH_THRESHOLD_MIN,
                adaptiveNoiseFloor * 3.0
            );

        const isFrameSpeech =
            rms > speechThreshold;


        /*
         * Utterance State Machine
         */

        if (isFrameSpeech) {

            if (!isSpeaking) {

                /*
                 * SPEECH START DETECTED!
                 */

                isSpeaking = true;

                silenceSamples = 0;


                /*
                 * Combine pre-roll buffer with current speech frame
                 * to avoid clipping the start of words.
                 */

                utteranceBuffer = [
                    ...preRollBuffer,
                    ...frame
                ];

                preRollBuffer = [];


                if (audioStatus) {

                    audioStatus.textContent =
                        "Speech detected...";

                }

                console.log(
                    "Speech start detected! Pre-roll appended:",
                    utteranceBuffer.length,
                    "samples"
                );

            }

            else {

                /*
                 * CONTINUING SPEECH
                 */

                for (
                    let i = 0;
                    i < frame.length;
                    i++
                ) {

                    utteranceBuffer.push(
                        frame[i]
                    );

                }

                silenceSamples = 0;

            }

        }

        else {

            /*
             * FRAME IS SILENT / BELOW THRESHOLD
             */

            if (!isSpeaking) {

                /*
                 * IDLE: Maintain rolling pre-roll buffer (~300ms)
                 */

                for (
                    let i = 0;
                    i < frame.length;
                    i++
                ) {

                    preRollBuffer.push(
                        frame[i]
                    );

                }


                if (
                    preRollBuffer.length >
                    PRE_ROLL_SAMPLES
                ) {

                    preRollBuffer =
                        preRollBuffer.slice(
                            preRollBuffer.length -
                            PRE_ROLL_SAMPLES
                        );

                }

            }

            else {

                /*
                 * SPEAKING: Short pause or potential utterance end
                 */

                for (
                    let i = 0;
                    i < frame.length;
                    i++
                ) {

                    utteranceBuffer.push(
                        frame[i]
                    );

                }

                silenceSamples +=
                    frame.length;


                /*
                 * Check if sustained silence threshold (800ms) is reached.
                 */

                if (
                    silenceSamples >=
                    SILENCE_HANGOVER_SAMPLES
                ) {

                    console.log(
                        "Sustained silence detected (800ms). Finalizing utterance..."
                    );

                    finalizeUtterance();

                }

            }

        }


        /*
         * Safety cap: Max utterance duration (30 seconds)
         */

        if (
            isSpeaking &&
            utteranceBuffer.length >=
                MAX_UTTERANCE_SAMPLES
        ) {

            console.log(
                "Maximum utterance duration reached (30s). Finalizing utterance..."
            );

            finalizeUtterance();

        }

    }

}


/*
 * Finalize current utterance buffer and transmit to backend.
 */

function finalizeUtterance() {

    if (
        !isSpeaking ||
        utteranceBuffer.length === 0
    ) {

        isSpeaking = false;

        utteranceBuffer = [];

        silenceSamples = 0;

        return;

    }


    const totalSamples =
        utteranceBuffer.length;


    /*
     * Discard utterances that are too short (< 300ms).
     */

    if (
        totalSamples <
        MIN_UTTERANCE_SAMPLES
    ) {

        console.log(
            "Utterance discarded (too short):",
            totalSamples,
            "samples"
        );

        isSpeaking = false;

        utteranceBuffer = [];

        silenceSamples = 0;


        if (audioStatus) {

            audioStatus.textContent =
                "Listening...";

        }

        return;

    }


    /*
     * Trim excess trailing silence beyond a 100ms natural cushion.
     */

    const cushionSamples =
        Math.floor(
            TARGET_SAMPLE_RATE * 0.1
        );

    const trimAmount =
        Math.max(
            0,
            silenceSamples -
            cushionSamples
        );

    const finalSamplesCount =
        Math.max(
            MIN_UTTERANCE_SAMPLES,
            totalSamples - trimAmount
        );


    const finalSamples =
        new Float32Array(
            utteranceBuffer.slice(
                0,
                finalSamplesCount
            )
        );


    console.log(
        "Utterance finalized:",
        finalSamples.length,
        "samples (",
        (
            finalSamples.length /
            TARGET_SAMPLE_RATE
        ).toFixed(2),
        "seconds)"
    );


    if (audioStatus) {

        audioStatus.textContent =
            "Processing utterance...";

    }


    /*
     * Reset state before WebSocket send so new incoming audio frames
     * start fresh while backend processes current utterance.
     */

    isSpeaking = false;

    utteranceBuffer = [];

    silenceSamples = 0;

    preRollBuffer = [];


    createAudioUtterance(
        finalSamples
    );

}


/*
 * Resample audio using linear interpolation.
 *
 * This is intentionally simple for the
 * first working Orbis pipeline.
 *
 * Example:
 *
 * 48000 Hz
 *    ↓
 * 16000 Hz
 *
 * The output contains one third as
 * many samples.
 */

function resampleAudio(
    inputSamples,
    inputSampleRate,
    outputSampleRate
) {

    /*
     * No resampling needed if the rates
     * are already identical.
     */

    if (
        inputSampleRate ===
        outputSampleRate
    ) {

        return new Float32Array(
            inputSamples
        );

    }


    const ratio =
        inputSampleRate /
        outputSampleRate;


    const outputLength =
        Math.floor(
            inputSamples.length /
            ratio
        );


    const output =
        new Float32Array(
            outputLength
        );


    for (
        let i = 0;
        i < outputLength;
        i++
    ) {

        const position =
            i * ratio;


        const leftIndex =
            Math.floor(
                position
            );


        const rightIndex =
            Math.min(
                leftIndex + 1,
                inputSamples.length - 1
            );


        const fraction =
            position -
            leftIndex;


        const leftSample =
            inputSamples[leftIndex];


        const rightSample =
            inputSamples[rightIndex];


        output[i] =
            leftSample +
            (
                rightSample -
                leftSample
            ) *
            fraction;

    }


    return output;

}


/*
 * Monitor microphone level.
 */

function monitorAudio() {

    if (
        !analyser ||
        !microphoneStream
    ) {

        return;

    }


    const dataArray =
        new Uint8Array(
            analyser.fftSize
        );


    function updateMeter() {

        if (
            !microphoneStream ||
            !analyser
        ) {

            return;

        }


        analyser.getByteTimeDomainData(
            dataArray
        );


        let sum = 0;


        for (
            let i = 0;
            i < dataArray.length;
            i++
        ) {

            const normalized =
                (
                    dataArray[i] -
                    128
                ) /
                128;


            sum +=
                normalized *
                normalized;

        }


        const rms =
            Math.sqrt(
                sum /
                dataArray.length
            );


        /*
         * Convert RMS to a UI percentage.
         *
         * This is a visual meter, not a
         * calibrated microphone measurement.
         */

        const percentage =
            Math.min(
                100,
                Math.round(
                    rms * 300
                )
            );


        audioLevel.style.width =
            percentage + "%";


        audioValue.textContent =
            percentage + "%";


        if (!isSpeaking) {

            if (percentage > 5) {

                audioStatus.textContent =
                    "Audio detected";

            }

            else {

                audioStatus.textContent =
                    "Listening...";

            }

        }


        animationFrame =
            requestAnimationFrame(
                updateMeter
            );

    }


    updateMeter();

}


/*
 * Create a WAV audio utterance and send via WebSocket.
 */

function createAudioUtterance(
    samples
) {

    console.log(
        "Creating WAV utterance:",
        samples.length,
        "samples"
    );


    const wavBuffer =
        encodeWav(
            samples,
            TARGET_SAMPLE_RATE
        );


    console.log(
        "WAV utterance size:",
        wavBuffer.byteLength,
        "bytes"
    );


    /*
     * Make sure the WebSocket is available.
     */

    if (
        !websocket ||
        websocket.readyState !==
            WebSocket.OPEN
    ) {

        console.warn(
            "Utterance not sent: backend WebSocket is not connected."
        );


        if (audioStatus) {

            audioStatus.textContent =
                "Listening...";

        }

        return;

    }


    /*
     * Convert WAV ArrayBuffer into Base64.
     */

    const bytes =
        new Uint8Array(
            wavBuffer
        );


    let binary = "";

    const chunkSize = 0x8000;


    for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
    ) {

        const chunk =
            bytes.subarray(
                i,
                Math.min(
                    i + chunkSize,
                    bytes.length
                )
            );


        binary +=
            String.fromCharCode(
                ...chunk
            );

    }


    const base64Audio =
        btoa(binary);


    /*
     * Read target language.
     */

    const selectedTargetLanguage =
        targetLanguage
            ? targetLanguage.value
            : "en";


    /*
     * Send complete utterance to backend.
     */

    websocket.send(
        JSON.stringify({

            type: "audio_utterance",

            data: {

                audio:
                    base64Audio,

                target_language:
                    selectedTargetLanguage

            }

        })
    );


    console.log(
        "Audio utterance sent to Orbis backend."
    );

}


/*
 * Encode Float32 audio as
 * mono 16-bit PCM WAV.
 */

function encodeWav(
    samples,
    sampleRate
) {

    const buffer =
        new ArrayBuffer(
            44 +
            samples.length * 2
        );


    const view =
        new DataView(
            buffer
        );


    /*
     * RIFF header
     */

    writeString(
        view,
        0,
        "RIFF"
    );


    view.setUint32(
        4,
        36 +
        samples.length * 2,
        true
    );


    writeString(
        view,
        8,
        "WAVE"
    );


    /*
     * fmt chunk
     */

    writeString(
        view,
        12,
        "fmt "
    );


    view.setUint32(
        16,
        16,
        true
    );


    /*
     * PCM format
     */

    view.setUint16(
        20,
        1,
        true
    );


    /*
     * Mono
     */

    view.setUint16(
        22,
        1,
        true
    );


    /*
     * Sample rate
     */

    view.setUint32(
        24,
        sampleRate,
        true
    );


    /*
     * Byte rate:
     *
     * sampleRate × channels × bytes/sample
     *
     * 16000 × 1 × 2
     */

    view.setUint32(
        28,
        sampleRate * 2,
        true
    );


    /*
     * Block align
     */

    view.setUint16(
        32,
        2,
        true
    );


    /*
     * 16-bit PCM
     */

    view.setUint16(
        34,
        16,
        true
    );


    /*
     * data chunk
     */

    writeString(
        view,
        36,
        "data"
    );


    view.setUint32(
        40,
        samples.length * 2,
        true
    );


    /*
     * Convert Float32 samples
     * to signed 16-bit PCM.
     */

    let offset = 44;


    for (
        let i = 0;
        i < samples.length;
        i++
    ) {

        const sample =
            Math.max(
                -1,
                Math.min(
                    1,
                    samples[i]
                )
            );


        const pcmSample =
            sample < 0
                ? sample * 0x8000
                : sample * 0x7fff;


        view.setInt16(
            offset,
            pcmSample,
            true
        );


        offset += 2;

    }


    return buffer;

}


/*
 * Write ASCII string into WAV header.
 */

function writeString(
    view,
    offset,
    string
) {

    for (
        let i = 0;
        i < string.length;
        i++
    ) {

        view.setUint8(
            offset + i,
            string.charCodeAt(i)
        );

    }

}


/*
 * Clean up audio resources.
 *
 * This function does NOT close the
 * WebSocket.
 */

function cleanupAudio() {

    /*
     * Stop animation frame.
     */

    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;

    }


    /*
     * Disconnect AudioWorklet.
     */

    if (audioWorkletNode) {

        try {

            audioWorkletNode.disconnect();

        }

        catch (error) {

            console.warn(
                "AudioWorklet disconnect error:",
                error
            );

        }


        audioWorkletNode = null;

    }


    /*
     * Disconnect microphone source.
     */

    if (microphoneSource) {

        try {

            microphoneSource.disconnect();

        }

        catch (error) {

            console.warn(
                "Microphone source disconnect error:",
                error
            );

        }


        microphoneSource = null;

    }


    /*
     * Stop microphone tracks.
     */

    if (microphoneStream) {

        microphoneStream
            .getTracks()
            .forEach(
                track => track.stop()
            );


        microphoneStream = null;

    }


    /*
     * Close AudioContext.
     */

    if (audioContext) {

        try {

            audioContext.close();

        }

        catch (error) {

            console.warn(
                "AudioContext close error:",
                error
            );

        }


        audioContext = null;

    }


    /*
     * Reset audio objects and state.
     */

    analyser = null;

    audioBuffer = [];

    isSpeaking = false;

    utteranceBuffer = [];

    preRollBuffer = [];

    silenceSamples = 0;

}


/*
 * Stop microphone.
 */

function stopMicrophone() {

    console.log(
        "Stopping Orbis audio capture..."
    );


    cleanupAudio();


    /*
     * Reset UI.
     */

    audioLevel.style.width =
        "0%";


    audioValue.textContent =
        "0%";


    audioStatus.textContent =
        "Waiting for microphone...";


    statusText.textContent =
        "Microphone disconnected";


    statusIndicator.style.color =
        "#888888";


    startButton.disabled = false;

    stopButton.disabled = true;


    /*
     * Close backend connection.
     */

    if (websocket) {

        try {

            websocket.close();

        }

        catch (error) {

            console.warn(
                "WebSocket close error:",
                error
            );

        }


        websocket = null;

    }


    websocketStatus.textContent =
        "Backend disconnected";

    websocketIndicator.style.color =
        "#888888";


    console.log(
        "Orbis microphone disconnected."
    );

}