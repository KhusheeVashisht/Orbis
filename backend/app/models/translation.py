"""
Orbis Translation Data Models

Defines the structured data used by the
translation stage of the Orbis pipeline.
"""

from dataclasses import dataclass


@dataclass
class TranslationResult:
    """
    Represents the result of translating
    speech into the viewer's selected language.
    """

    source_language: str
    target_language: str
    source_text: str
    translated_text: str