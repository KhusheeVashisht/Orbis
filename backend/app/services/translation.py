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

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
)


class TranslationService:
    """
    Handles multilingual neural translation using NLLB-200.
    """

    MODEL_NAME = "facebook/nllb-200-distilled-600M"

    LANGUAGE_MAP = {
        "en": "eng_Latn",
        "de": "deu_Latn",
        "fr": "fra_Latn",
        "es": "spa_Latn",
        "hi": "hin_Deva",
        "ja": "jpn_Jpan",
        "zh": "zho_Hans",
        "ko": "kor_Hang",
        "nl": "nld_Latn",
    }

    def __init__(self):
        print("Loading Orbis translation model...")

        self.tokenizer = AutoTokenizer.from_pretrained(
            self.MODEL_NAME
        )

        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            self.MODEL_NAME
        )

        print("Orbis translation model loaded.")

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> dict:
        """
        Translate text using NLLB-200.

        Parameters:
            text:
                Transcribed speech.

            source_language:
                Language detected by Faster-Whisper.

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

        if source_language not in self.LANGUAGE_MAP:
            raise ValueError(
                f"Unsupported source language: {source_language}"
            )

        if target_language not in self.LANGUAGE_MAP:
            raise ValueError(
                f"Unsupported target language: {target_language}"
            )

        source_code = self.LANGUAGE_MAP[source_language]
        target_code = self.LANGUAGE_MAP[target_language]

        # Tell NLLB which language the input is written in.
        self.tokenizer.src_lang = source_code

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
        )

        # Generate translation in the viewer's selected language.
        translated_tokens = self.model.generate(
            **inputs,
            forced_bos_token_id=(
                self.tokenizer.convert_tokens_to_ids(
                    target_code
                )
            ),
            max_length=128,
        )

        translated_text = (
            self.tokenizer.batch_decode(
                translated_tokens,
                skip_special_tokens=True,
            )[0]
        )

        return {
            "source_language": source_language,
            "target_language": target_language,
            "source_text": text,
            "translated_text": translated_text,
        }