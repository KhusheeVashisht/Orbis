# Orbis

### Real-Time AI Voice Translation & Zero-Shot Voice Cloning Overlay

Orbis is an AI-powered real-time voice translation system designed to help viewers understand multilingual conversations, meetings, interviews, and live streams.

The system captures spoken audio, converts speech into text, detects the spoken language, translates the transcript into the viewer's selected language, and will eventually generate translated speech while preserving the original speaker's voice identity.

---

## Project Vision

The goal of Orbis is to remove language barriers during real-time communication.

Instead of requiring every speaker to communicate in the same language, Orbis allows speakers to communicate naturally while the viewer selects the language they want to understand.

### Example

```text
German Speaker
      ↓
🎤 Audio
      ↓
Faster-Whisper
      ↓
German Transcript
      ↓
Language Detection
      ↓
NLLB-200 Translation
      ↓
Viewer selects English
      ↓
English Caption
      ↓
XTTS Voice Cloning
      ↓
Translated Voice