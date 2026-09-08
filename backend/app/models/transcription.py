"""
Orbis Transcription Data Models

Defines the structured data produced by the
speech-to-text stage of the Orbis pipeline.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class TranscriptionSegment:
    """
    Represents a single segment of transcribed speech.
    """

    start: float
    end: float
    text: str


@dataclass
class TranscriptionResult:
    """
    Represents the complete result returned by
    the speech-to-text service.
    """

    text: str
    language: str
    language_probability: float
    segments: List[TranscriptionSegment]