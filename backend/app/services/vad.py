"""
Orbis Voice Activity Detection Service

Responsible for determining whether incoming audio
contains human speech.

Pipeline position:

Audio Capture
      ↓
Voice Activity Detection
      ↓
Speech-to-Text
"""


class VoiceActivityDetector:
    """
    Detects whether an audio segment contains speech.

    This is the initial VAD abstraction for Orbis.
    The actual VAD model can be integrated later without
    changing the rest of the pipeline.
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def is_speech(self, audio_data: bytes) -> bool:
        """
        Determine whether the provided audio contains speech.

        Parameters:
            audio_data: Raw audio bytes.

        Returns:
            True if speech is detected, otherwise False.

        The initial implementation only validates that
        audio data was received. A real VAD model will
        replace this logic later.
        """

        if not audio_data:
            return False

        return True