let microphoneStream = null;
let audioContext = null;
let analyser = null;
let microphoneSource = null;
let animationFrame = null;

let audioWorkletNode = null;

let audioBuffer = [];

const TARGET_SAMPLE_RATE = 16000;

const CHUNK_DURATION_SECONDS = 2;

const CHUNK_SAMPLE_COUNT =
    TARGET_SAMPLE_RATE * CHUNK_DURATION_SECONDS;


const allowButton =
    document.getElementById("allowButton");

const status =
    document.getElementById("status");

const audioLevel =
    document.getElementById("audioLevel");

const audioStatus =
    document.getElementById("audioStatus");

const audioValue =
    document.getElementById("audioValue");


allowButton.addEventListener("click", async () => {

    try {

        /*
         * Request microphone permission.
         */

        console.log(
            "Requesting microphone permission..."
        );

        microphoneStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        console.log(
            "Microphone permission granted."
        );


        console.log(
            "Audio tracks:",
            microphoneStream.getAudioTracks()
        );


        /*
         * Create Web Audio API context.
         */

        audioContext =
            new AudioContext({
                sampleRate: TARGET_SAMPLE_RATE
            });


        console.log(
            "AudioContext state:",
            audioContext.state
        );

        console.log(
            "Actual sample rate:",
            audioContext.sampleRate
        );


        /*
         * Create audio source
         * from microphone stream.
         */

        microphoneSource =
            audioContext.createMediaStreamSource(
                microphoneStream
            );


        /*
         * Load Orbis AudioWorklet.
         */

        await audioContext.audioWorklet.addModule(
            chrome.runtime.getURL(
                "audio-processor.js"
            )
        );


        console.log(
            "Orbis AudioWorklet loaded."
        );


        /*
         * Create analyser.
         */

        analyser =
            audioContext.createAnalyser();

        analyser.fftSize = 1024;


        /*
         * Create AudioWorklet node.
         */

        audioWorkletNode =
            new AudioWorkletNode(
                audioContext,
                "orbis-audio-processor"
            );


        console.log(
            "Orbis AudioWorklet created."
        );


        /*
         * Receive audio samples
         * from the AudioWorklet.
         */

        audioWorkletNode.port.onmessage =
            (event) => {

                const samples =
                    event.data;


                /*
                 * Add samples to our
                 * temporary audio buffer.
                 */

                audioBuffer.push(
                    ...samples
                );


                /*
                 * Once enough samples have
                 * accumulated, create a chunk.
                 */

                while (
                    audioBuffer.length >=
                    CHUNK_SAMPLE_COUNT
                ) {

                    const chunk =
                        audioBuffer.splice(
                            0,
                            CHUNK_SAMPLE_COUNT
                        );


                    createAudioChunk(
                        chunk
                    );
                }
            };


        /*
         * Connect microphone
         * to analyser.
         */

        microphoneSource.connect(
            analyser
        );


        /*
         * Connect microphone
         * to AudioWorklet.
         */

        microphoneSource.connect(
            audioWorkletNode
        );


        /*
         * Update interface.
         */

        status.textContent =
            "Microphone connected successfully.";

        status.style.color =
            "green";

        allowButton.disabled =
            true;


        console.log(
            "Web Audio API connected."
        );


        /*
         * Start audio monitoring.
         */

        monitorAudio();


    } catch (error) {

        console.error(
            "Microphone access failed:",
            error
        );


        status.textContent =
            "Microphone access failed.";

        status.style.color =
            "red";
    }

});


function monitorAudio() {

    if (!analyser) {
        return;
    }


    /*
     * Array containing waveform samples.
     */

    const dataArray =
        new Uint8Array(
            analyser.fftSize
        );


    analyser.getByteTimeDomainData(
        dataArray
    );


    /*
     * Calculate RMS audio level.
     */

    let sumSquares = 0;


    for (const value of dataArray) {

        const normalized =
            (value - 128) / 128;

        sumSquares +=
            normalized * normalized;
    }


    const rms =
        Math.sqrt(
            sumSquares /
            dataArray.length
        );


    /*
     * Convert RMS to percentage.
     */

    const percentage =
        Math.min(
            100,
            Math.round(rms * 500)
        );


    /*
     * Update visual meter.
     */

    audioLevel.style.width =
        `${percentage}%`;


    /*
     * Update numerical level.
     */

    audioValue.textContent =
        `Audio level: ${percentage}%`;


    /*
     * Update audio status.
     */

    if (percentage > 5) {

        audioStatus.textContent =
            "🎙️ Audio detected";

    } else {

        audioStatus.textContent =
            "Listening for audio...";
    }


    /*
     * Occasionally print diagnostic
     * information to DevTools.
     */

    if (Math.random() < 0.02) {

        console.log(
            "Audio level:",
            percentage + "%"
        );
    }


    /*
     * Continue monitoring.
     */

    animationFrame =
        requestAnimationFrame(
            monitorAudio
        );
}


/*
 * Create a WAV chunk from
 * collected PCM samples.
 */

function createAudioChunk(samples) {

    console.log(
        "Audio chunk created:",
        samples.length,
        "samples"
    );


    const wavBuffer =
        encodeWav(
            samples,
            TARGET_SAMPLE_RATE
        );


    console.log(
        "WAV chunk size:",
        wavBuffer.byteLength,
        "bytes"
    );
}


/*
 * Convert Float32 PCM samples
 * into a WAV file buffer.
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
        new DataView(buffer);


    /*
     * RIFF header.
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
     * Format section.
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
     * Audio format:
     * 1 = PCM.
     */

    view.setUint16(
        20,
        1,
        true
    );


    /*
     * Number of channels:
     * 1 = mono.
     */

    view.setUint16(
        22,
        1,
        true
    );


    /*
     * Sample rate.
     */

    view.setUint32(
        24,
        sampleRate,
        true
    );


    /*
     * Byte rate.
     */

    view.setUint32(
        28,
        sampleRate * 2,
        true
    );


    /*
     * Block alignment.
     */

    view.setUint16(
        32,
        2,
        true
    );


    /*
     * Bits per sample.
     */

    view.setUint16(
        34,
        16,
        true
    );


    /*
     * Data section.
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
     * into signed 16-bit PCM.
     */

    let offset = 44;


    for (
        let i = 0;
        i < samples.length;
        i++
    ) {

        let sample =
            Math.max(
                -1,
                Math.min(
                    1,
                    samples[i]
                )
            );


        const intSample =
            sample < 0
                ? sample * 32768
                : sample * 32767;


        view.setInt16(
            offset,
            intSample,
            true
        );


        offset += 2;
    }


    return buffer;
}


/*
 * Write text into a DataView.
 */

function writeString(
    view,
    offset,
    text
) {

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        view.setUint8(
            offset + i,
            text.charCodeAt(i)
        );
    }
}