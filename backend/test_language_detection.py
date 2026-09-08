from app.services.language_detection import LanguageDetection


def main():
    detector = LanguageDetection()

    result = detector.detect(
        language="en",
        probability=0.88,
    )

    print("--- Orbis Language Detection ---")
    print("Language:", result["language"])
    print("Probability:", result["probability"])
    print("Reliable:", result["is_reliable"])


if __name__ == "__main__":
    main()