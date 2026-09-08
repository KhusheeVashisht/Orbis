from app.models.transcription import (
    TranscriptionResult,
    TranscriptionSegment,
)

from app.models.translation import TranslationResult


def main():

    segment = TranscriptionSegment(
        start=0.0,
        end=4.0,
        text="Hello, can we record a test video?",
    )

    transcription = TranscriptionResult(
        text="Hello, can we record a test video?",
        language="en",
        language_probability=0.88,
        segments=[segment],
    )

    translation = TranslationResult(
        source_language="en",
        target_language="de",
        source_text=transcription.text,
        translated_text="Hallo, können wir ein Testvideo aufnehmen?",
    )

    print("--- Orbis Transcription Model ---")
    print("Text:", transcription.text)
    print("Language:", transcription.language)
    print(
        "Language probability:",
        transcription.language_probability,
    )

    print("\n--- Transcription Segment ---")
    print("Start:", segment.start)
    print("End:", segment.end)
    print("Text:", segment.text)

    print("\n--- Orbis Translation Model ---")
    print("Source language:", translation.source_language)
    print("Target language:", translation.target_language)
    print("Source text:", translation.source_text)
    print("Translated text:", translation.translated_text)


if __name__ == "__main__":
    main()