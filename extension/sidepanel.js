let websocket = null;

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
    TARGET_SAMPLE_RATE *
    CHUNK_DURATION_SECONDS;


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

startButton.addEventListener(
    "click",
    startMicrophone
);


stopButton.addEventListener(
    "click",
    stopMicrophone
);


async function startMicrophone() {

        try {

        console.log(
            "Connecting to Orbis backend..."
        );

        await connectWebSocket();


        console.log(
            "Requesting microphone access..."
        );

        microphoneStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        console.log(
            "Orbis microphone connected."
        );


        audioContext =
            new AudioContext();


        await audioContext.audioWorklet.addModule(
            chrome.runtime.getURL(
                "audio-processor.js"
            )
        );


        analyser =
            audioContext.createAnalyser();


        analyser.fftSize = 1024;


        microphoneSource =
            audioContext.createMediaStreamSource(
                microphoneStream
            );


        audioWorkletNode =
            new AudioWorkletNode(
                audioContext,
                "orbis-audio-processor"
            );


        audioBuffer = [];


        audioWorkletNode.port.onmessage =
            (event) => {

                const samples =
                    event.data;


                audioBuffer.push(
                    ...samples
                );


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


        microphoneSource.connect(
            analyser
        );


        microphoneSource.connect(
            audioWorkletNode
        );


        await audioContext.resume();


        monitorAudio();


        statusText.textContent =
            "Microphone connected";


        statusIndicator.style.color =
            "green";


        audioStatus.textContent =
            "Microphone is active";


        startButton.disabled = true;

        stopButton.disabled = false;


        console.log(
            "AudioContext state:",
            audioContext.state
        );

    }

    catch (error) {

        console.error(
            "Microphone access failed:",
            error
        );


        statusText.textContent =
            "Microphone access denied";


        statusIndicator.style.color =
            "red";


        audioStatus.textContent =
            "Microphone unavailable";

    }

}

function connectWebSocket() {

    return new Promise(
        (resolve, reject) => {

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


                reject(error);

            };


            websocket.onclose = () => {

                console.log(
                    "Orbis WebSocket disconnected."
                );


                websocketStatus.textContent =
                    "Backend disconnected";


                websocketIndicator.style.color =
                    "#888888";


                websocket = null;

            };


            websocket.onmessage = (event) => {

                console.log(
                    "Server response:",
                    event.data
                );

            };

        }
    );

}

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
                (dataArray[i] - 128) /
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


        if (percentage > 5) {

            audioStatus.textContent =
                "Audio detected";

        }

        else {

            audioStatus.textContent =
                "Listening...";

        }


        animationFrame =
            requestAnimationFrame(
                updateMeter
            );

    }


    updateMeter();

}


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


    if (
        websocket &&
        websocket.readyState === WebSocket.OPEN
    ) {

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


            binary += String.fromCharCode(
                ...chunk
            );

        }


        const base64Audio =
            btoa(binary);


        const targetLanguage =
            document.getElementById(
                "targetLanguage"
            ).value;


        websocket.send(
            JSON.stringify({

                type: "audio_chunk",

                data: {

                    audio: base64Audio,

                    target_language:
                        targetLanguage

                }

            })
        );


        console.log(
            "Audio chunk sent to Orbis backend."
        );

    }

}


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


    writeString(
        view,
        0,
        "RIFF"
    );


    view.setUint32(
        4,
        36 + samples.length * 2,
        true
    );


    writeString(
        view,
        8,
        "WAVE"
    );


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


    view.setUint16(
        20,
        1,
        true
    );


    view.setUint16(
        22,
        1,
        true
    );


    view.setUint32(
        24,
        sampleRate,
        true
    );


    view.setUint32(
        28,
        sampleRate * 2,
        true
    );


    view.setUint16(
        32,
        2,
        true
    );


    view.setUint16(
        34,
        16,
        true
    );


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


        view.setInt16(
            offset,
            sample < 0
                ? sample * 0x8000
                : sample * 0x7fff,
            true
        );


        offset += 2;

    }


    return buffer;

}


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


function stopMicrophone() {

    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;

    }


    if (audioWorkletNode) {

        audioWorkletNode.disconnect();

        audioWorkletNode = null;

    }


    if (microphoneSource) {

        microphoneSource.disconnect();

        microphoneSource = null;

    }


    if (microphoneStream) {

        microphoneStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        microphoneStream = null;

    }


    if (audioContext) {

        audioContext.close();

        audioContext = null;

    }


    analyser = null;

    audioBuffer = [];


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

    if (websocket) {

        websocket.close();

        websocket = null;

    }

    console.log(
        "Orbis microphone disconnected."
    );

}
