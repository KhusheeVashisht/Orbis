class OrbisAudioProcessor extends AudioWorkletProcessor {

    process(
        inputs,
        outputs,
        parameters
    ) {

        const input =
            inputs[0];


        /*
         * No microphone input available.
         */

        if (
            !input ||
            !input[0]
        ) {

            return true;

        }


        /*
         * We use the first channel only.
         *
         * getUserMedia requested mono audio,
         * but this also protects us if the
         * browser provides multiple channels.
         */

        const channelData =
            input[0];


        /*
         * Copy the samples before sending them
         * to the main thread.
         *
         * The AudioWorklet operates in the
         * browser's actual AudioContext sample rate.
         */

        const samples =
            new Float32Array(
                channelData
            );


        this.port.postMessage(
            samples
        );


        /*
         * Keep processor alive.
         */

        return true;

    }

}


registerProcessor(
    "orbis-audio-processor",
    OrbisAudioProcessor
);