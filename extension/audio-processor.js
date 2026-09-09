class OrbisAudioProcessor extends AudioWorkletProcessor {

    process(inputs, outputs, parameters) {

        const input = inputs[0];

        if (!input || !input[0]) {
            return true;
        }

        const channelData = input[0];

        /*
         * Send microphone samples
         * back to the main JavaScript thread.
         */

        this.port.postMessage(
            new Float32Array(channelData)
        );

        return true;
    }
}


registerProcessor(
    "orbis-audio-processor",
    OrbisAudioProcessor
);