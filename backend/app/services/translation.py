"""
Orbis Translation Service

Responsible for translating transcribed speech from the
detected source language into the language selected by
the viewer.

Pipeline:

Speech-to-Text
      ↓
Language Detection
      ↓
Translation
      ↓
Target Language Caption
"""


class TranslationService:
    """
    Handles translation between languages.

    The translation engine will be integrated behind this
    service so that the rest of Orbis does not depend on
    a specific translation provider.
    """

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> dict:
        """
        Translate text from the source language to the
        viewer's selected target language.

        Parameters:
            text:
                Transcribed speech.

            source_language:
                Language detected from the speaker's speech.

            target_language:
                Language selected by the viewer.

        Returns:
            Dictionary containing translation information.
        """

        if not text.strip():
            return {
                "source_language": source_language,
                "target_language": target_language,
                "source_text": text,
                "translated_text": "",
            }

        # Temporary implementation.
        # A real neural translation engine will replace this.
        translated_text = text

        return {
            "source_language": source_language,
            "target_language": target_language,
            "source_text": text,
            "translated_text": translated_text,
        }