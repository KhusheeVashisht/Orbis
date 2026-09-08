"""
Orbis Speech-to-Text Service

Responsible for converting spoken audio into text using
the Faster-Whisper speech recognition model.

Pipeline:

Audio Capture
      ↓
Voice Activity Detection
      ↓
Speech-to-Text
      ↓
Transcript
"""


from faster_whisper import WhisperModel


class SpeechToText:
    """
    Handles speech recognition using Faster-Whisper.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        """
        Initialize the Faster-Whisper model.

        Parameters:
            model_size:
                Whisper model size.
                Examples: tiny, base, small, medium, large-v3

            device:
                Hardware used for inference.
                "cpu" or "cuda"

            compute_type:
                Numerical precision used by the model.
                "int8" is suitable for CPU inference.
        """

        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe(self, audio_file: str) -> dict:
        """
        Transcribe an audio file.

        Parameters:
            audio_file:
                Path to the audio file.

        Returns:
            Dictionary containing:
                - text
                - language
                - language_probability
                - segments
        """

        segments, info = self.model.transcribe(
            audio_file,
            beam_size=5,
        )

        transcript_segments = []
        text_parts = []

        for segment in segments:
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
            }

            transcript_segments.append(segment_data)
            text_parts.append(segment.text.strip())

        return {
            "text": " ".join(text_parts),
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": transcript_segments,
        }