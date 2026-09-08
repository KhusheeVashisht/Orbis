import asyncio
import json

import websockets


async def test_websocket():

    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:

        print("Connected to Orbis WebSocket.")

        audio_data = "TEST_AUDIO_DATA"

        message = {
            "type": "audio_chunk",
            "data": {
                "audio": audio_data,
            },
        }

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