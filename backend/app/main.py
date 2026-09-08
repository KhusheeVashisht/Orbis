import base64

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.connection import ConnectionManager
from app.core.config import settings
from app.services.audio_capture import AudioCapture


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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:

        while True:

            message = await websocket.receive_json()

            message_type = message.get("type")

            if message_type == "audio_chunk":

                audio_data = message.get("data", {}).get("audio")

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

                        response = {
                            "type": "audio_acknowledgement",
                            "data": {
                                "message": "Audio chunk received.",
                                "audio_size": len(processed_audio),
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