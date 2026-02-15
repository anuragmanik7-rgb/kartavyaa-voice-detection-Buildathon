# Kartavyaa - AI Voice Detection API

## Overview
A REST API that detects whether a given voice sample is AI-generated or spoken by a real human. Built for the HCL-GUVI AI Impact Summit Buildathon by Anurag Manik. Accepts **any language** with **automatic multi-language detection** and uses a multi-layer analysis system for accurate detection.

## Features
- **Voice Detection API**: Accepts Base64-encoded audio (MP3, WebM, WAV) and returns classification (`AI_GENERATED` or `HUMAN`)
- **Live Audio Recording**: Record audio directly from device microphone via browser MediaRecorder API
- **Automatic Multi-Language Detection**: Language is auto-detected from audio. Can detect multiple languages in the same audio (code-switching). Language can also be manually specified as optional. Accepts any language string.
- **Multi-Layer Analysis**:
  - Layer 1: Acoustic Analysis via Gemini 2.5 Pro - detects spectral artifacts, pitch consistency, prosody patterns
  - Layer 2: Naturalness Analysis via Gemini 2.5 Pro - evaluates pitch variation, emotional prosody, breathing patterns
  - Whisper Transcription: For additional context (via HuggingFace) — skipped for files > 900 KB
- **Gemini Fallback**: Automatic fallback from Gemini 2.5 Pro to Gemini 2.5 Flash when Pro is unavailable
- **Model-First Scoring**: Both voice analysis layers provide verdicts; if they agree, the verdict is used directly with high confidence (0.80-1.00). Numeric scores (acoustic x 0.6 + naturalness x 0.4) serve as tiebreaker when layers disagree
- **Confidence Score**: 0.0 to 1.0 range
- **Classification**: Exactly `"AI_GENERATED"` or `"HUMAN"` (uppercase only)
- **30-Second Timeout**: Dynamic time budgeting with safety margin
- **API Key Authentication**: Secure access with x-api-key header
- **Response Format**: Only 3 fields returned: `status`, `classification`, `confidenceScore`
- **Futuristic Testing Dashboard**: Frontend UI with cyber theme, loading animations, waveform visualizers, and live recording mode
- **Tagline**: "Let's not just make in India but Transform From India"

## API Endpoints

### POST /api/voice-detection
Main detection endpoint

**Headers:**
- `Content-Type: application/json`
- `x-api-key: YOUR_API_KEY`

**Request Body:**
```json
{
  "language": "Hindi",
  "audioFormat": "mp3",
  "audioBase64": "BASE64_ENCODED_AUDIO"
}
```
Note: Language is optional. If omitted, it will be auto-detected from the audio. Accepts any language string (e.g., "Spanish", "French", "Japanese"). Multiple languages can be detected in the same audio.

**Success Response:**
```json
{
  "status": "success",
  "classification": "AI_GENERATED",
  "confidenceScore": 0.92
}
```

### GET /api/health
Health check endpoint

### GET /api/docs
API documentation endpoint

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn/UI, TanStack Query
- **Backend**: Express.js, TypeScript
- **AI**: Google Gemini 2.5 Pro (with 2.5 Flash fallback) via Replit AI Integrations
- **Speech-to-Text**: OpenAI Whisper Large v3 via HuggingFace
- **Validation**: Zod
- **Audio Processing**: ffmpeg

## Project Structure
```
├── client/src/
│   ├── pages/home.tsx       # Main testing dashboard (futuristic UI)
│   └── App.tsx              # Router setup
├── server/
│   ├── routes.ts            # API routes
│   └── voiceAnalysis.ts     # Multi-layer analysis + language detection logic
├── shared/
│   └── schema.ts            # Type definitions and Zod schemas
├── DOCUMENTATION.md         # Detailed technical documentation
```

## Running the Project
The application runs via the "Start application" workflow which executes `npm run dev`.

## Demo API Keys
- `sk_test_demo_key_123`
- `sk_test_hackathon_2024`
- Any key starting with `sk_`

## Analysis Pipeline
1. Audio received (Base64 MP3/WebM/WAV) → converted to 16kHz mono WAV via ffmpeg
2. If language not provided → auto-detect language(s) via Gemini 2.5 Pro (detects any language)
3. Parallel analysis: Whisper transcription (skipped if >900KB) + Acoustic Analysis (Layer 1) + Naturalness Analysis (Layer 2)
4. Voice layers return a verdict (`AI_GENERATED` or `HUMAN`) plus numeric scores
5. Model verdict priority: If both voice layers agree on verdict → follow their decision (confidence 0.80-1.00). If they disagree → use numeric combined score (acoustic x 0.6 + naturalness x 0.4) with threshold > 0.60 as tiebreaker
6. Classification is exactly `"AI_GENERATED"` or `"HUMAN"` (uppercase only)
7. Confidence score: 0.0 to 1.0
8. Processing timeout: 30 seconds with dynamic time budgeting
9. Response contains only: status, classification, confidenceScore

## UI Design
- Typography: Oxanium (brand), Space Grotesk (subtitles), Playfair Display (quote)
- Theme: Futuristic cyber theme with glowing cards, waveform visualizers
- API Documentation: Collapsible, collapsed by default
- Language input: 5 primary languages in UI dropdown (English, Hindi, Tamil, Malayalam, Telugu) + auto-detect option, API accepts any language
