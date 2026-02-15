# Kartavyaa - AI Voice Detection API

> **"Let's not just make in India but Transform From India"**

Kartavyaa is an AI-powered REST API that detects whether a voice sample is **AI-generated** or spoken by a **real human**. Built for the **HCL-GUVI AI Impact Summit Buildathon** by **Anurag Manik**.

---

## Features

- **Voice Classification** - Accepts Base64-encoded audio (MP3, WebM, WAV) and classifies as `AI_GENERATED` or `HUMAN`
- **Live Audio Recording** - Record directly from your microphone via the browser
- **Automatic Language Detection** - Detects language(s) from audio automatically, supports any language
- **Multi-Layer AI Analysis** - Two parallel analysis layers powered by Google Gemini for high accuracy
- **Confidence Scoring** - Confidence score from 0.0 to 1.0
- **Fast Processing** - 30-second timeout with intelligent resource management (Whisper skipped for files > 900 KB)
- **Clean Response** - Only 3 fields returned: `status`, `classification`, `confidenceScore`
- **Futuristic Dashboard** - Cyber-themed testing UI with waveform visualizers and loading animations

---

## How It Works

```
Audio Input (Base64)
    |
    v
Convert to 16kHz Mono WAV (via ffmpeg)
    |
    v
+---+---+---+
|           |           |
v           v           v
Language    Acoustic    Naturalness
Detection   Analysis    Analysis
(Gemini)    (Layer 1)   (Layer 2)
|           |           |
v           v           v
+-------+-------+
        |
        v
  Model Verdict Fusion
  (Agreement = high confidence)
  (Disagreement = numeric tiebreaker)
        |
        v
  Final Classification
  AI_GENERATED or HUMAN
```

### Analysis Layers

| Layer | Model | What It Detects |
|-------|-------|-----------------|
| **Acoustic Analysis** | Gemini 2.5 Pro | Spectral artifacts, pitch consistency, prosody patterns |
| **Naturalness Analysis** | Gemini 2.5 Pro | Pitch variation, emotional prosody, breathing patterns, speech rhythm |
| **Whisper Transcription** | OpenAI Whisper (HuggingFace) | Speech-to-text for additional context (skipped for files > 900 KB) |

### Scoring Logic

- Both layers return a verdict (`AI_GENERATED` or `HUMAN`) plus numeric scores
- **Agreement**: If both layers agree, that verdict is used with high confidence (0.80 - 1.00)
- **Disagreement**: Combined numeric score (acoustic x 0.6 + naturalness x 0.4) serves as tiebreaker
- **Confidence score**: 0.0 to 1.0

---

## API Reference

### POST `/api/voice-detection`

Analyze a voice sample.

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `x-api-key` | Your API key | Yes |

**Request Body:**
```json
{
  "audioFormat": "mp3",
  "audioBase64": "BASE64_ENCODED_AUDIO_DATA",
  "language": "Hindi"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audioBase64` | string | Yes | Base64-encoded audio data |
| `audioFormat` | string | No | Audio format: `mp3`, `webm`, or `wav` (default: `mp3`) |
| `language` | string | No | Any language string (e.g., "English", "Hindi", "Tamil"). Auto-detected if omitted. |

**Success Response (200):**
```json
{
  "status": "success",
  "classification": "AI_GENERATED",
  "confidenceScore": 0.92
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Invalid API key or missing x-api-key header"
}
```

### GET `/api/health`

Health check endpoint. Returns server status.

### GET `/api/docs`

Returns API documentation in JSON format.

---

## Demo API Keys

For testing purposes, you can use:
- `sk_test_demo_key_123`
- `sk_test_hackathon_2024`
- Any key starting with `sk_`

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React, TailwindCSS, Shadcn/UI, TanStack Query |
| **Backend** | Express.js, TypeScript |
| **AI Models** | Google Gemini 2.5 Pro (with 2.5 Flash fallback) |
| **Speech-to-Text** | OpenAI Whisper Large v3 (via HuggingFace) |
| **Validation** | Zod |
| **Audio Processing** | ffmpeg |

---

## Project Structure

```
kartavyaa/
├── client/src/
│   ├── pages/home.tsx          # Main testing dashboard (futuristic UI)
│   ├── App.tsx                 # Router setup
│   └── components/             # Reusable UI components
├── server/
│   ├── index.ts                # Server entry point
│   ├── routes.ts               # API routes and authentication
│   └── voiceAnalysis.ts        # Multi-layer analysis engine
├── shared/
│   └── schema.ts               # Type definitions and Zod validation schemas
├── DOCUMENTATION.md            # Detailed technical documentation
└── README.md                   # This file
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for voice analysis |
| `HUGGINGFACE_API_KEY` | HuggingFace API key for Whisper transcription |
| `SESSION_SECRET` | Session secret for the application |

---

## Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kartavyaa-voice-detection.git
   cd kartavyaa-voice-detection
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file):
   ```
   GEMINI_API_KEY=your_gemini_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   SESSION_SECRET=your_session_secret
   ```

4. Run the application:
   ```bash
   npm run dev
   ```

5. Open your browser and go to `http://localhost:5000`

---

## Quick Test with cURL

```bash
# Encode your audio file to Base64
AUDIO_BASE64=$(base64 -w 0 your_audio_file.mp3)

# Send the request
curl -X POST http://localhost:5000/api/voice-detection \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_test_demo_key_123" \
  -d "{
    \"audioFormat\": \"mp3\",
    \"audioBase64\": \"$AUDIO_BASE64\"
  }"
```

---

## UI Preview

The application features a futuristic cyber-themed dashboard with:
- Animated loading screen with system boot sequence
- Live audio recording with waveform visualization
- File upload with drag-and-drop support
- Real-time analysis results with confidence meters
- Collapsible API documentation section
- Language selector: English, Hindi, Tamil, Malayalam, Telugu, Auto Detect

**Typography:**
- Oxanium (brand/headings)
- Space Grotesk (subtitles)
- Playfair Display (tagline quote)

---

## Built For

**HCL-GUVI AI Impact Summit Buildathon**

By **Anurag Manik**

---

## License

This project is built for the HCL-GUVI AI Impact Summit Buildathon.
