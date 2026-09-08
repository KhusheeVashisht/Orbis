"""
Orbis WebSocket Connection Manager

Responsible for managing active WebSocket connections
between the Orbis backend and connected clients.
"""

import json

from fastapi import WebSocket


class ConnectionManager:
    """
    Manages active WebSocket connections.
    """

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """
        Accept and register a new WebSocket connection.
        """

        await websocket.accept()

        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection.
        """

        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(
        self,
        websocket: WebSocket,
        message: dict,
    ) -> None:
        """
        Send a structured JSON message to a specific client.
        """

        await websocket.send_text(
            json.dumps(message)
        )

    async def broadcast(self, message: dict) -> None:
        """
        Send a structured JSON message to every
        connected client.
        """

        message_json = json.dumps(message)

        for connection in self.active_connections:
            await connection.send_text(message_json)