import time

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


MODEL_NAME = "facebook/nllb-200-distilled-600M"


LANGUAGES = {
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


def translate(
    model,
    tokenizer,
    text,
    source_language,
    target_language,
):
    tokenizer.src_lang = LANGUAGES[source_language]

    inputs = tokenizer(
        text,
        return_tensors="pt",
    )

    translated_tokens = model.generate(
        **inputs,
        forced_bos_token_id=tokenizer.convert_tokens_to_ids(
            LANGUAGES[target_language]
        ),
        max_length=128,
    )

    return tokenizer.batch_decode(
        translated_tokens,
        skip_special_tokens=True,
    )[0]


def main():

    print("=" * 50)
    print("ORBIS NLLB-200 TRANSLATION BENCHMARK")
    print("=" * 50)

    print("\nLoading tokenizer...")

    start_time = time.perf_counter()

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME
    )

    print("Tokenizer loaded.")

    print("\nLoading NLLB model...")

    model = AutoModelForSeq2SeqLM.from_pretrained(
        MODEL_NAME
    )

    model_load_time = time.perf_counter() - start_time

    print("Model loaded.")

    print(
        f"\nModel loading time: "
        f"{model_load_time:.2f} seconds"
    )

    tests = [
        (
            "Hello, how are you?",
            "en",
            "de",
        ),
        (
            "Good morning, welcome to Orbis.",
            "en",
            "fr",
        ),
        (
            "This is a real-time translation test.",
            "en",
            "es",
        ),
        (
            "Hello, welcome to the meeting.",
            "en",
            "hi",
        ),
        (
            "आप कैसे हैं?",
            "hi",
            "en",
        ),
        (
            "Guten Morgen, wie geht es Ihnen?",
            "de",
            "en",
        ),
    ]

    print("\n" + "=" * 50)
    print("TRANSLATION TESTS")
    print("=" * 50)

    for text, source, target in tests:

        start_time = time.perf_counter()

        result = translate(
            model,
            tokenizer,
            text,
            source,
            target,
        )

        translation_time = (
            time.perf_counter() - start_time
        )

        print("\n----------------------------------------")

        print(
            f"Source      : {source}"
        )

        print(
            f"Target      : {target}"
        )

        print(
            f"Input       : {text}"
        )

        print(
            f"Translation : {result}"
        )

        print(
            f"Latency     : "
            f"{translation_time:.3f} seconds"
        )

    print("\n" + "=" * 50)
    print("BENCHMARK COMPLETE")
    print("=" * 50)


if __name__ == "__main__":
    main()