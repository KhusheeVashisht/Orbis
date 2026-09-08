from app.services.translation import TranslationService


def main():
    translator = TranslationService()

    result = translator.translate(
        text="Hello everyone, welcome to Orbis.",
        source_language="en",
        target_language="de",
    )

    print("--- Orbis Translation ---")
    print("Source language:", result["source_language"])
    print("Target language:", result["target_language"])
    print("Source text:", result["source_text"])
    print("Translated text:", result["translated_text"])


if __name__ == "__main__":
    main()