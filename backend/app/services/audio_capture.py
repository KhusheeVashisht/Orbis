"""
Orbis Audio Capture Service

Responsible for capturing audio input and providing
audio data to the Orbis processing pipeline.

Architecture:

Microphone
    ↓
Audio Capture
    ↓
Raw Audio
    ↓
Voice Activity Detection
    ↓
Speech-to-Text
"""


class AudioCapture:
    """
    Handles audio input for the Orbis pipeline.

    The actual browser microphone capture will eventually
    happen through the Chrome Extension using the Web Audio API.

    This service provides the backend-side abstraction for
    receiving and processing audio data.
    """

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.is_active = False

    def start(self) -> None:
        """Start the audio capture pipeline."""
        self.is_active = True
        print("Orbis audio capture started.")

    def stop(self) -> None:
        """Stop the audio capture pipeline."""
        self.is_active = False
        print("Orbis audio capture stopped.")

    def process_audio(self, audio_data: bytes) -> bytes:
        """
        Receive audio data from the client.

        Parameters:
            audio_data: Raw audio bytes.

        Returns:
            The received audio data.

        Later this method will pass audio into
        VAD and speech-to-text processing.
        """
        if not self.is_active:
            raise RuntimeError("Audio capture is not active.")

        return audio_data