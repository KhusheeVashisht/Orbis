from app.services.speech_to_text import SpeechToText


def main():
    print("Loading Faster-Whisper...")

    transcriber = SpeechToText(
        model_size="base",
        device="cpu",
        compute_type="int8",
    )

    print("Model loaded.")
    print("Transcribing audio...")

    result = transcriber.transcribe(
        "test_audio/test_audio.wav"
    )

    print("\n--- Orbis STT Result ---")
    print("Text:", result["text"])
    print("Language:", result["language"])
    print(
        "Language probability:",
        result["language_probability"],
    )

    print("\nSegments:")

    for segment in result["segments"]:
        print(
            f"[{segment['start']:.2f}s - "
            f"{segment['end']:.2f}s] "
            f"{segment['text']}"
        )


if __name__ == "__main__":
    main()