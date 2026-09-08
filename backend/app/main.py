from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.connection import ConnectionManager

from app.core.config import settings


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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for Orbis real-time communication.
    """

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
                    response = {
                        "type": "audio_acknowledgement",
                        "data": {
                            "message": "Audio chunk received.",
                            "audio_size": len(audio_data),
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

