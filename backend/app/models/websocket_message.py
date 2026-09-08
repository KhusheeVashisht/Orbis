"""
Orbis WebSocket Message Model

Defines the structure of messages exchanged between
the Orbis backend and connected clients.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class WebSocketMessage:
    """
    Represents a message exchanged through the
    Orbis WebSocket connection.
    """

    type: str
    data: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """
        Convert the message into a dictionary
        suitable for JSON serialization.
        """

        return {
            "type": self.type,
            "data": self.data,
        }