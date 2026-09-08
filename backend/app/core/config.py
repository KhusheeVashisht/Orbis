import os


class Settings:
    """
    Central configuration for the Orbis backend.

    Values can later be loaded from environment variables
    instead of being hard-coded into the application.
    """

    # Application
    APP_NAME = "Orbis"
    VERSION = "0.1.0"
    DEBUG = True

    # Backend
    HOST = os.getenv("ORBIS_HOST", "127.0.0.1")
    PORT = int(os.getenv("ORBIS_PORT", "8000"))

    # Audio
    AUDIO_SAMPLE_RATE = 16000
    AUDIO_CHANNELS = 1

    # Speech recognition
    WHISPER_MODEL = os.getenv(
        "WHISPER_MODEL",
        "small"
    )

    # Translation
    DEFAULT_LANGUAGE = "en"

    # Voice cloning
    VOICE_CLONING_ENABLED = os.getenv(
        "VOICE_CLONING_ENABLED",
        "false"
    ).lower() == "true"


settings = Settings()