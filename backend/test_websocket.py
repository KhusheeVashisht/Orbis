import asyncio
import base64
import json
from pathlib import Path

import websockets


async def test_websocket():

    uri = "ws://127.0.0.1:8000/ws"

    audio_file = Path(__file__).parent / "test_audio" / "test_audio.wav"

    with open(audio_file, "rb") as file:
        audio_bytes = file.read()

    encoded_audio = base64.b64encode(
        audio_bytes
    ).decode("utf-8")

    message = {
        "type": "audio_chunk",
        "data": {
            "audio": encoded_audio,
        },
    }

    async with websockets.connect(uri) as websocket:

        print("Connected to Orbis WebSocket.")

        print(
            f"Original audio size: "
            f"{len(audio_bytes)} bytes"
        )

        await websocket.send(
            json.dumps(message)
        )

        response = await websocket.recv()

        response_data = json.loads(response)

        print("\nServer response:")

        print(
            json.dumps(
                response_data,
                indent=4,
            )
        )


if __name__ == "__main__":
    asyncio.run(test_websocket())