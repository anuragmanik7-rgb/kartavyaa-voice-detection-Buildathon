# Kartavyaa — Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [AI Model & Engine](#ai-model--engine)
5. [Multi-Layer Detection System](#multi-layer-detection-system)
6. [Model-First Scoring Algorithm](#model-first-scoring-algorithm)
7. [Audio Processing Pipeline](#audio-processing-pipeline)
8. [Automatic Language Detection](#automatic-language-detection)
9. [API Reference](#api-reference)
10. [Authentication](#authentication)
11. [Language Support](#language-support)
12. [Tech Stack](#tech-stack)
13. [Project Structure](#project-structure)
14. [How It Works — End to End](#how-it-works--end-to-end)
15. [Classification Logic](#classification-logic)
16. [Error Handling](#error-handling)
17. [Frontend Dashboard](#frontend-dashboard)
18. [Deployment](#deployment)

---

## Overview

**Kartavyaa** is an AI-powered voice detection API that determines whether a given audio sample contains an **AI-generated voice** or a **real human voice**. It is built as a buildathon submission for the **HCL-GUVI AI Impact Summit Buildathon** by **Anurag Manik** and is designed to combat the rising threat of deepfake audio, voice cloning, and AI-generated speech being used for misinformation and impersonation.

**Tagline:** *"Let's not just make in India but Transform From India"*

The system accepts Base64-encoded audio (MP3, WebM, WAV) via a REST API, runs it through a **multi-layer neural analysis** powered by **Google Gemini 2.5 Pro** (with automatic **Gemini 2.5 Flash** fallback), and returns:
- `status`: "success" or "error"
- `classification`: exactly `"AI_GENERATED"` or `"HUMAN"` (uppercase)
- `confidenceScore`: 0.0 to 1.0

---

## Problem Statement

With the rapid advancement of text-to-speech (TTS) and voice cloning technologies (ElevenLabs, Play.ht, Azure TTS, etc.), it has become increasingly difficult to distinguish between AI-generated speech and genuine human speech. This poses serious risks:

- **Misinformation**: Fake audio can be used to spread false statements attributed to public figures.
- **Identity Theft**: Voice-based authentication systems can be compromised.
- **Trust Erosion**: The public's ability to trust audio evidence is undermined.

Kartavyaa addresses this by providing a reliable, multi-language detection system that can identify synthetic speech with high confidence.

---

## Solution Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT REQUEST                                  │
│  { language (optional), audioFormat, audioBase64 } + x-api-key header   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY (Express.js)                           │
│  • API Key Validation (x-api-key header)                                │
│  • Request Schema Validation (Zod)                                      │
│  • Base64 Sanitization & Normalization                                  │
│  • Data URL Handling (strips data: prefix)                              │
│  • Base64 Padding Correction                                            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     AUDIO PREPROCESSING                                  │
│  • Input format detection (MP3/WebM/WAV/MP4)                            │
│  • ffmpeg conversion → 16kHz mono WAV                                   │
│  • Optional: File upload to Gemini Files API (for large files)          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
  ┌───────────────┐   ┌──────────────┐   ┌──────────────────┐
  │   LAYER 1      │   │   WHISPER     │   │   LAYER 2         │
  │   Acoustic     │   │   ASR         │   │   Naturalness     │
  │   Analysis     │   │   (Hugging    │   │   Analysis        │
  │   (Gemini 2.5  │   │    Face)      │   │   (Gemini 2.5     │
  │    Pro/Flash)  │   │   Skipped if  │   │    Pro/Flash)     │
  │               │   │   >900KB      │   │                   │
  └───────┬────────┘   └──────┬───────┘   └────────┬──────────┘
          │                   │                    │
          │     (all run in parallel)               │
          └───────────┼────────────────────────────┘
                      │
      ┌───────────────┴───────────────┐
      │                               │
      ▼                               ▼
┌─────────────────────┐   ┌─────────────────────────┐
│  LANGUAGE DETECTION  │   │  MODEL-FIRST SCORING     │
│  (if not provided)   │   │  ENGINE                  │
│  Gemini 2.5 Pro/     │   │                          │
│  Flash detects       │   │  L1 verdict + L2 verdict │
│  any language        │   │  Agreement = follow      │
│                      │   │  Disagreement = numeric  │
│                      │   │  tiebreaker (>0.60 = AI) │
└──────────┬───────────┘   └─────────┬───────────────┘
           │                         │
           └────────────┬────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          API RESPONSE                                    │
│  {                                                                       │
│    status, classification, confidenceScore                              │
│  }                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## AI Model & Engine

### Primary Model: Google Gemini 2.5 Pro

Kartavyaa uses **Google Gemini 2.5 Pro** as its core AI engine for all voice analysis, naturalness evaluation, and language detection. Gemini 2.5 Pro is a multimodal large language model capable of processing both text and audio natively, making it ideal for audio forensics tasks.

**Why Gemini 2.5 Pro?**

- **Native Audio Understanding**: Gemini can directly process audio data without requiring intermediate feature extraction, enabling it to detect subtle patterns that traditional signal processing might miss.
- **Multimodal Reasoning**: The model can combine acoustic signal analysis with linguistic and contextual understanding.
- **State-of-the-Art Performance**: Gemini 2.5 Pro represents Google's most advanced reasoning model, providing superior analysis compared to earlier versions.
- **Any Language Support**: Native understanding of any language — Gemini handles all languages natively without restriction.

### Automatic Fallback: Gemini 2.5 Flash

When Gemini 2.5 Pro is unavailable due to rate limits, capacity issues, or quota exhaustion, the system **automatically falls back** to **Gemini 2.5 Flash**. This ensures uninterrupted service.

**Fallback Trigger Conditions:**
- HTTP 429 (Rate Limited)
- HTTP 503 (Service Unavailable)
- RESOURCE_EXHAUSTED errors
- Overloaded / capacity messages

The fallback is implemented via the `generateWithFallback()` function which wraps all Gemini API calls across all analysis layers (acoustic, naturalness, and language detection).

**Integration Method:**

The system supports two integration paths:
1. **Replit AI Integration** (default): Uses Replit's managed Gemini API proxy with automatic key rotation and secret management.
2. **Direct Gemini API** (optional): When a user provides their own `GEMINI_API_KEY`, the system uses Google's direct API with file upload support for larger audio files.

### Secondary Model: OpenAI Whisper Large v3

**Whisper Large v3** (via HuggingFace Inference API) is used for automatic speech recognition (transcription). The transcription provides additional context for validation that the audio contains actual speech content.

**Performance Optimization:** For audio files larger than 900 KB, the Whisper call is automatically skipped to stay within the 30-second processing timeout. The two Gemini analysis layers are sufficient for accurate classification.

---

## Multi-Layer Detection System

The core innovation of Kartavyaa is its **multi-layer analysis system** where each layer independently evaluates the audio from different analytical perspectives, all running in parallel for speed.

### Layer 1: Acoustic Analysis (Voice Detection — Weight: 60%)

This layer focuses on the **physical and spectral characteristics** of the audio signal. Gemini 2.5 Pro (or Flash fallback) acts as an expert audio forensics analyst, evaluating:

| Feature | What It Detects | AI Indicator |
|---------|----------------|--------------|
| **Spectral Artifacts** | Digital glitches, unnatural frequency patterns | Present in AI audio |
| **Pitch Consistency** | How uniform the pitch is throughout (0.0–1.0) | >0.6 = unnaturally perfect |
| **Prosody Score** | Rhythm and timing patterns (0.0–1.0) | >0.6 = mechanical pacing |
| **Breathing Patterns** | Presence of natural breath sounds | Missing in AI audio |

**Signs of AI-Generated Voice (Layer 1 looks for):**
- Unnatural perfection — too-clean audio without normal mouth sounds
- Robotic rhythm — overly consistent timing
- Flat intonation — limited emotional range
- Missing micro-variations — lack of natural pitch wobbles
- Synthetic artifacts — digital glitches, unnatural transitions
- Perfect pronunciation — no natural slurring
- Artificial breathing — fake or missing breath sounds
- Consistent volume — human speech naturally varies

**Signs of Real Human Voice:**
- Natural imperfections — small errors, restarts, filler words
- Authentic breathing — real breath sounds
- Emotional depth — genuine emotion
- Micro-variations — subtle pitch and volume fluctuations
- Connected speech — natural blending of words
- Background noise — environmental sounds

**Output:**
- `ai_likelihood_score`: 0–100 (probability the voice is AI-generated)
- `verdict`: "AI_GENERATED" or "HUMAN" (model's own classification)
- `spectral_artifacts`: boolean
- `pitch_consistency`: 0.0–1.0
- `prosody_score`: 0.0–1.0
- `breathing_patterns`: boolean
- `key_indicators`: textual explanation

### Layer 2: Naturalness Analysis (Voice Detection — Weight: 40%)

This layer evaluates the **human-likeness and naturalness** of the speech, focusing on qualities that are difficult for current AI systems to replicate perfectly.

| Criterion | Scale | What It Measures |
|-----------|-------|-----------------|
| **Pitch Artificialness** | 0–10 | How robotic vs natural the pitch sounds |
| **Emotional Artificialness** | 0–10 | Genuine vs fake emotional expression |
| **Breathing Artificialness** | 0–10 | Real vs artificial breathing patterns |
| **Rhythm Artificialness** | 0–10 | Natural flow vs mechanical timing |
| **Overall AI Likelihood** | 0–10 | Combined assessment of AI probability |

Each score is inverted (subtracted from 10) to produce a "naturalness" score where higher = more human-like:
- `pitchVariation = 10 - pitch_artificialness`
- `emotionalProsody = 10 - emotional_artificialness`
- `breathingPatterns = 10 - breathing_artificialness`
- `speechRhythm = 10 - rhythm_artificialness`
- `naturalness = 10 - ai_likelihood`

**Output:**
- `verdict`: "AI_GENERATED" or "HUMAN" (model's own classification)
- `naturalness`: 0–10 (overall naturalness score)
- `reasoning`: textual explanation

### Whisper Transcription (Supporting Layer)

OpenAI Whisper Large v3 transcribes the audio to text. This transcription is:
- Used as supplementary context for validation
- Not factored into the voice classification score directly
- **Automatically skipped** for audio files larger than 900 KB to save processing time

---

## Model-First Scoring Algorithm

Kartavyaa uses a **model-first scoring** approach that trusts the AI model's own judgment over numeric calculations.

### How It Works

Both Layer 1 (Acoustic) and Layer 2 (Naturalness) independently return:
1. A **verdict** — the model's own classification: `"AI_GENERATED"` or `"HUMAN"`
2. A **numeric score** — a quantified assessment

### Decision Logic

```
IF Layer1.verdict == Layer2.verdict:
    → Follow the agreed verdict (highest confidence: 0.80 - 1.00)
    → Both models agree, trust their judgment
ELSE:
    → Models disagree, use numeric tiebreaker
    → combinedScore = (acousticScore × 0.6) + (aiLikelihood × 0.4)
    → IF combinedScore > 0.60 → AI_GENERATED
    → ELSE → HUMAN
    → Confidence based on distance from threshold (0.60 - 0.85)
```

### Weight Rationale

| Layer | Weight | Reasoning |
|-------|--------|-----------|
| Acoustic Analysis | **60%** | Direct signal-level analysis is the most reliable indicator of synthetic audio, as AI generators leave detectable spectral fingerprints |
| Naturalness Analysis | **40%** | Evaluates higher-level speech qualities that complement acoustic analysis, catching sophisticated AI that may pass signal-level checks |

### Why Model-First?

Traditional ensemble systems rely heavily on numeric thresholds which can be brittle. By letting each Gemini analysis provide its own verdict (a qualitative judgment), the system benefits from:
- The model's holistic understanding beyond what a single number captures
- Reduced sensitivity to threshold tuning
- Higher accuracy when both models independently reach the same conclusion

The numeric score only serves as a tiebreaker when the two models disagree, providing a balanced fallback.

### Confidence Score

The confidence score ranges from **0.0 to 1.0**:

```
IF both layers agree:
    IF classification == "AI_GENERATED":
        → rawConf = max(acousticScore, aiLikelihood, numericScore)
        → confidenceScore = 0.80 + (rawConf × 0.20)
    ELSE (HUMAN):
        → rawHuman = max(1 - acousticScore, 1 - aiLikelihood, 1 - numericScore)
        → confidenceScore = 0.80 + (rawHuman × 0.20)
    → Range: 0.80 - 1.00 (high confidence)
ELSE (layers disagree):
    → distance = |combinedScore - 0.60|
    → confidenceScore = 0.60 + (distance × 0.50)
    → Range: 0.60 - 0.85 (moderate confidence)

Final: clamp(confidenceScore, 0.0, 1.0)
```

---

## Audio Processing Pipeline

### Step 1: Input Normalization
- Accept Base64-encoded audio (MP3, WebM, WAV, MP4 formats)
- Handle data URL format (`data:audio/mp3;base64,...`)
- Sanitize Base64: remove whitespace, convert URL-safe characters (`-` → `+`, `_` → `/`)
- Add padding if needed

### Step 2: Audio Conversion
Using **ffmpeg**, the input audio is converted to an optimal format for analysis:
```
ffmpeg -y -i input.[mp3|webm|wav|mp4] -ar 16000 -ac 1 -f wav output.wav
```
- **16kHz sample rate**: Standard for speech processing
- **Mono channel**: Reduces noise and simplifies analysis
- **WAV format**: Uncompressed, preserving all audio details

If ffmpeg conversion fails, the system falls back to the original audio format.

### Step 3: Optional File Upload
If a direct Gemini API key is available (`GEMINI_API_KEY`), the audio is uploaded to Google's Files API for more efficient processing of larger files. The system polls until the file status becomes `ACTIVE` (up to 30 attempts, 1 second apart).

### Step 4: Parallel Analysis (concurrent tasks)
All analysis tasks run **concurrently** using `Promise.all` with a **30-second timeout** (with dynamic time budgeting):
1. **Whisper transcription** (HuggingFace API) — skipped for files > 900 KB
2. **Layer 1: Acoustic analysis** (Gemini 2.5 Pro/Flash)
3. **Layer 2: Naturalness analysis** (Gemini 2.5 Pro/Flash)
4. **Language detection** (Gemini 2.5 Pro/Flash — only if language not provided by user)

### Step 5: Scoring & Classification
- Layer 1 and Layer 2 verdicts are compared (model-first scoring)
- Numeric tiebreaker used only when models disagree
- Classification is exactly `"AI_GENERATED"` or `"HUMAN"` (uppercase)
- Confidence score: 0.0 to 1.0

### Step 6: Cleanup
- Temporary WAV files are deleted
- Uploaded Gemini files are removed from Google's servers

---

## Automatic Language Detection

### How It Works

When the `language` parameter is **not provided** (or omitted) in the API request, Kartavyaa automatically detects the language(s) spoken in the audio using Gemini 2.5 Pro/Flash.

### Multi-Language Detection

The system can detect **multiple languages** in the same audio (code-switching). For example, if a speaker switches between Hindi and English within the same recording, both languages are detected.

### Any Language Support

The API accepts **any language string** — not just the 5 primary languages. Gemini handles all languages natively. You can pass "Spanish", "French", "Japanese", or any other language and the system will analyze accordingly.

### Detection Process

1. The audio is sent to Gemini with a prompt to identify all languages spoken
2. Gemini returns the primary (dominant) language and a list of all detected languages
3. Language information is used internally for analysis context

### Fallback Behavior

- If language detection fails, defaults to "English"

---

## API Reference

### POST `/api/voice-detection`

The main detection endpoint for voice analysis.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `x-api-key` | Yes | API authentication key |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | No | Any language string (e.g., "English", "Hindi", "Tamil", "Malayalam", "Telugu", "Spanish"). Auto-detected if omitted. |
| `audioFormat` | string | No | Audio format: "mp3", "webm", "wav", "mp4". Defaults to "mp3" |
| `audioBase64` | string | Yes | Base64-encoded audio data. Also accepts `audio` or `data` field names |

**Example Request:**
```json
{
  "audioFormat": "mp3",
  "audioBase64": "//uQxAAAAAANIAAAAAExBTUUzLjEw..."
}
```

Note: Language is intentionally omitted — it will be auto-detected.

**Success Response (200):**
```json
{
  "status": "success",
  "classification": "AI_GENERATED",
  "confidenceScore": 0.92
}
```

**Error Response (400/401/500):**
```json
{
  "status": "error",
  "message": "Invalid API key or missing x-api-key header"
}
```

### GET `/api/health`

Health check endpoint returning service status.

**Response:**
```json
{
  "status": "healthy",
  "service": "Kartavyaa",
  "supportedLanguages": ["English", "Hindi", "Tamil", "Malayalam", "Telugu"],
  "timestamp": "2026-02-15T10:30:00.000Z"
}
```

### GET `/api/docs`

Returns comprehensive API documentation in JSON format including endpoint details, request/response schemas, and analysis methodology.

---

## Authentication

The API uses **API key-based authentication** via the `x-api-key` HTTP header.

### Valid API Keys

| Key | Purpose |
|-----|---------|
| `sk_test_demo_key_123` | Demo/testing key |
| `sk_test_hackathon_2024` | Buildathon demo key |
| Any key starting with `sk_` | Accepted for convenience during buildathon |
| Custom key via `VOICE_DETECTION_API_KEY` env var | Production key (if configured) |

### Validation Logic

```
1. Check if key exists in the pre-approved set
2. OR check if key starts with "sk_" prefix
3. If neither → return 401 Unauthorized
```

---

## Language Support

The API accepts **any language string**. Gemini handles all languages natively.

### Primary Languages (with UI dropdown support)

| Language | Code | Script | Region |
|----------|------|--------|--------|
| English | en | Latin script | Global |
| Hindi | hi | Devanagari script | North India |
| Tamil | ta | Tamil script | Tamil Nadu |
| Malayalam | ml | Malayalam script | Kerala |
| Telugu | te | Telugu script | Andhra Pradesh, Telangana |

### Extended Language Support

Any language can be specified via the `language` parameter (e.g., "Spanish", "French", "Japanese", "Arabic"). When auto-detection is used (language parameter omitted), Gemini identifies the language(s) spoken automatically.

The language parameter is **optional**. If omitted, the system automatically detects the language(s) from the audio. When provided, it informs the AI analysis about language-specific speech patterns, prosody, and phonetics. The validation is case-insensitive for the 5 primary languages (e.g., "hindi" → "Hindi").

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Framework** | React | Single-page application |
| **UI Library** | Shadcn/UI + TailwindCSS | Futuristic themed components |
| **State Management** | TanStack Query (React Query v5) | Server state and API calls |
| **Backend Framework** | Express.js | REST API server |
| **Language** | TypeScript | Type-safe development |
| **AI Engine (Primary)** | Google Gemini 2.5 Pro | Voice analysis (2 layers) + language detection |
| **AI Engine (Fallback)** | Google Gemini 2.5 Flash | Automatic fallback when Pro is unavailable |
| **Speech-to-Text** | OpenAI Whisper Large v3 | Audio transcription (via HuggingFace) |
| **Validation** | Zod | Request/response schema validation |
| **Audio Processing** | ffmpeg | Audio format conversion (→ 16kHz mono WAV) |
| **Build Tool** | Vite | Frontend bundling and dev server |
| **Routing** | wouter | Client-side routing |

---

## Project Structure

```
kartavyaa/
├── client/
│   └── src/
│       ├── pages/
│       │   └── home.tsx              # Main testing dashboard with futuristic UI
│       ├── components/
│       │   └── ui/                   # Shadcn/UI component library
│       ├── hooks/
│       │   └── use-toast.ts          # Toast notification hook
│       ├── lib/
│       │   └── queryClient.ts        # TanStack Query configuration
│       ├── App.tsx                   # Root component with routing
│       └── index.css                 # Global styles + cyber theme animations
├── server/
│   ├── routes.ts                    # API endpoint definitions
│   ├── voiceAnalysis.ts             # Core analysis engine (2 layers + language detection)
│   └── index.ts                     # Server entry point
├── shared/
│   └── schema.ts                    # Type definitions and Zod schemas
├── DOCUMENTATION.md                 # This file — detailed technical documentation
└── README.md                        # Project overview and quick start guide
```

---

## How It Works — End to End

Here is the complete flow from when a user uploads audio to receiving the result:

### 1. User Interaction
- User uploads audio file (MP3/WebM/WAV) or records live audio via browser microphone
- Frontend converts audio to Base64 and sends POST request to `/api/voice-detection`
- API key is included in the `x-api-key` header

### 2. Backend Processing
- API key is validated
- Request body is validated against Zod schema
- Base64 audio is decoded and sanitized

### 3. Audio Preprocessing
- Audio is converted to 16kHz mono WAV via ffmpeg
- If GEMINI_API_KEY is available, audio is uploaded to Gemini Files API

### 4. Parallel Analysis (within 30-second timeout)
- **Whisper** transcribes the audio (skipped if file > 900 KB)
- **Layer 1** (Acoustic) analyzes spectral features via Gemini
- **Layer 2** (Naturalness) evaluates human-likeness via Gemini
- **Language Detection** identifies languages (if not provided)

### 5. Scoring & Classification
- Both layer verdicts are compared
- If they agree → verdict is used with high confidence (0.80–1.00)
- If they disagree → numeric tiebreaker determines classification
- Classification is exactly `"AI_GENERATED"` or `"HUMAN"` (uppercase)
- Confidence score: 0.0 to 1.0

### 6. Response
```json
{
  "status": "success",
  "classification": "AI_GENERATED",
  "confidenceScore": 0.92
}
```

---

## Classification Logic

| Scenario | Classification | Confidence Range |
|----------|---------------|-----------------|
| Both layers say AI_GENERATED | AI_GENERATED | 0.80 – 1.00 |
| Both layers say HUMAN | HUMAN | 0.80 – 1.00 |
| Layers disagree, numeric > 0.60 | AI_GENERATED | 0.60 – 0.85 |
| Layers disagree, numeric ≤ 0.60 | HUMAN | 0.60 – 0.85 |

---

## Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Missing/invalid API key | 401 | `{ "status": "error", "message": "Invalid API key or missing x-api-key header" }` |
| Missing audio data | 400 | `{ "status": "error", "message": "Invalid request: Audio data is required" }` |
| Invalid Base64 encoding | 400 | `{ "status": "error", "message": "Invalid Base64 encoding for audio data" }` |
| Analysis timeout (>30s) | 500 | `{ "status": "error", "message": "Analysis failed: Operation timed out after ..." }` |
| Gemini API failure | 500 | `{ "status": "error", "message": "Analysis failed: [error details]" }` |

---

## Frontend Dashboard

The testing dashboard features a **futuristic cyber theme** with:

- **Animated Loading Screen**: System boot sequence with progress indicators
- **Live Audio Recording**: Record from device microphone with waveform visualization
- **File Upload**: Drag-and-drop with format validation
- **Real-Time Results**: Classification badge, confidence meter, status indicator
- **API Documentation**: Collapsible section with request/response examples
- **Language Selector**: English, Hindi, Tamil, Malayalam, Telugu, Auto Detect

### Typography
- **Oxanium**: Brand name and headings
- **Space Grotesk**: Subtitles and body text
- **Playfair Display**: Tagline quote

### Design System
- Cyber/futuristic theme with glowing cards
- Waveform visualizers
- Dark color scheme with accent highlights

---

## Deployment

The application is deployed on **Replit** and runs via the "Start application" workflow which executes `npm run dev`. The server binds to port 5000 and serves both the API and the frontend dashboard.

### Performance Optimizations
- **30-second processing timeout** with dynamic time budgeting
- **Whisper skipped** for audio files > 900 KB to save processing time
- **Parallel execution** of all analysis layers
- **Gemini 2.5 Flash fallback** ensures uptime when Pro is rate-limited

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for voice analysis |
| `HUGGINGFACE_API_KEY` | HuggingFace API key for Whisper transcription |
| `SESSION_SECRET` | Session secret for the application |
