import base64
import os
import tempfile

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.connection import ConnectionManager
from app.core.config import settings

from app.services.audio_capture import AudioCapture
from app.services.vad import VoiceActivityDetector
from app.services.speech_to_text import SpeechToText
from app.services.language_detection import LanguageDetection
from app.services.translation import TranslationService



app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time AI Voice Translation & Zero-Shot Voice Cloning",
    version=settings.VERSION
)


@app.get("/")
async def root():
    return {
        "project": settings.APP_NAME,
        "status": "running",
        "message": "Your Voice, Without Borders"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "orbis-backend"
    }


manager = ConnectionManager()

audio_capture = AudioCapture()
audio_capture.start()

vad = VoiceActivityDetector()

speech_to_text = SpeechToText(
    model_size="base",
    device="cpu",
    compute_type="int8",
)

language_detection = LanguageDetection()

translation_service = TranslationService()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:

        while True:

            message = await websocket.receive_json()

            message_type = message.get("type")

            if message_type == "audio_chunk":

                audio_data = message.get("data", {}).get("audio")

                target_language = message.get("data", {}).get(
                    "target_language",
                    "en",
                )

                if audio_data is None:

                    response = {
                        "type": "error",
                        "data": {
                            "message": "Audio data is missing."
                        },
                    }

                else:

                    try:

                        decoded_audio = base64.b64decode(
                            audio_data
                        )

                        processed_audio = audio_capture.process_audio(
                            decoded_audio
                        )

                        speech_detected = vad.is_speech(
                            processed_audio
                        )

                        if speech_detected:

                            temporary_file = None

                            try:

                                with tempfile.NamedTemporaryFile(
                                    suffix=".wav",
                                    delete=False,
                                ) as file:

                                    file.write(processed_audio)
                                    temporary_file = file.name

                                transcription = speech_to_text.transcribe(
                                    temporary_file
                                )

                                language_result = language_detection.detect(
                                    transcription["language"],
                                    transcription["language_probability"],
                                )
                                translation_result = translation_service.translate(
                                    transcription["text"],
                                    language_result["language"],
                                    target_language,
                                )

                                response = {
                                    "type": "transcription",
                                    "data": {
                                        "audio_size": len(processed_audio),
                                        "speech_detected": speech_detected,
                                        "text": transcription["text"],
                                        "language": language_result["language"],
                                        "language_probability": language_result["probability"],
                                        "language_reliable": language_result["is_reliable"],
                                        "target_language": translation_result["target_language"],
                                        "translated_text": translation_result["translated_text"],
                                        "segments": transcription["segments"],
                                    },
                                }

                            finally:

                                if temporary_file and os.path.exists(
                                    temporary_file
                                ):
                                    os.remove(temporary_file)

                        else:

                            response = {
                                "type": "audio_analysis",
                                "data": {
                                    "audio_size": len(processed_audio),
                                    "speech_detected": False,
                                },
                            }

                    except Exception as error:

                        response = {
                            "type": "error",
                            "data": {
                                "message": str(error),
                            },
                        }

            else:

                response = {
                    "type": "acknowledgement",
                    "data": {
                        "message": "Orbis received your message.",
                        "received": message,
                    },
                }

            await manager.send_message(
                websocket,
                response,
            )

    except WebSocketDisconnect:

        manager.disconnect(websocket)