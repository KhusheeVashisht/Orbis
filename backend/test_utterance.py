import asyncio
import base64
import json
from pathlib import Path

import websockets


async def test_utterance_websocket():
    uri = "ws://127.0.0.1:8000/ws"
    audio_file = Path(__file__).parent / "test_audio" / "test_audio.wav"

    if not audio_file.exists():
        print(f"Error: Test audio file not found at {audio_file}")
        return

    with open(audio_file, "rb") as file:
        audio_bytes = file.read()

    encoded_audio = base64.b64encode(audio_bytes).decode("utf-8")

    message = {
        "type": "audio_utterance",
        "data": {
            "audio": encoded_audio,
            "target_language": "es",
        },
    }

    print(f"Connecting to Orbis WebSocket at {uri}...")
    async with websockets.connect(uri) as websocket:
        print("Connected to Orbis WebSocket.")
        print(f"Sending audio utterance payload ({len(audio_bytes)} bytes)...")

        await websocket.send(json.dumps(message))

        response = await websocket.recv()
        response_data = json.loads(response)

        print("\n--- Server Response ---")
        print(json.dumps(response_data, indent=4))
        print("-----------------------")

        assert response_data.get("type") == "transcription"
        assert "text" in response_data.get("data", {})
        assert "translated_text" in response_data.get("data", {})
        print("TEST PASSED: Audio utterance successfully processed!")


if __name__ == "__main__":
    asyncio.run(test_utterance_websocket())
