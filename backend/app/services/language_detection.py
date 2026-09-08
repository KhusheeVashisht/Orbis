"""
Orbis Language Detection Service

Responsible for determining the language of a transcript.

Pipeline:

Speech-to-Text
      ↓
Language Detection
      ↓
Translation
"""


class LanguageDetection:
    """
    Detects the language of transcribed speech.

    The initial implementation uses the language information
    provided by Faster-Whisper.

    A more advanced language detection system can be added
    later for mixed-language and code-switched speech.
    """

    def detect(
        self,
        language: str,
        probability: float,
    ) -> dict:
        """
        Analyze language information returned by STT.

        Parameters:
            language:
                Language code detected by the STT system.

            probability:
                Confidence/probability associated with
                the detected language.

        Returns:
            Dictionary containing language information.
        """

        return {
            "language": language,
            "probability": probability,
            "is_reliable": probability >= 0.70,
        }