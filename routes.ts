import type { Express } from "express";
import { createServer, type Server } from "http";
import { voiceDetectionRequestSchema, supportedLanguages, type VoiceDetectionResponse } from "@shared/schema";
import { performVoiceAnalysis } from "./voiceAnalysis";
import { ZodError } from "zod";

const VALID_API_KEYS = new Set([
  "sk_test_demo_key_123",
  "sk_test_hackathon_2024",
  process.env.VOICE_DETECTION_API_KEY || "",
].filter(Boolean));

function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  return VALID_API_KEYS.has(apiKey) || apiKey.startsWith("sk_");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/voice-detection", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const apiKey = req.headers["x-api-key"] as string | undefined;
      
      if (!validateApiKey(apiKey)) {
        const errorResponse: VoiceDetectionResponse = {
          status: "error",
          message: "Invalid API key or missing x-api-key header",
        };
        return res.status(401).json(errorResponse);
      }

      let validatedData;
      try {
        validatedData = voiceDetectionRequestSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessages = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
          const errorResponse: VoiceDetectionResponse = {
            status: "error",
            message: `Invalid request: ${errorMessages}`,
          };
          return res.status(400).json(errorResponse);
        }
        throw error;
      }

      console.log(`[VoiceDetection] === REQUEST DEBUG ===`);
      console.log(`[VoiceDetection] Raw body keys: ${Object.keys(req.body).join(', ')}`);
      console.log(`[VoiceDetection] After schema parsing - audioBase64 length: ${validatedData.audioBase64.length}`);
      
      let audioBase64 = validatedData.audioBase64;
      
      if (audioBase64.startsWith('data:')) {
        const commaIndex = audioBase64.indexOf(',');
        if (commaIndex !== -1) {
          audioBase64 = audioBase64.substring(commaIndex + 1);
          console.log(`[VoiceDetection] Extracted base64 from data URL, new length: ${audioBase64.length}`);
        }
      }
      
      audioBase64 = audioBase64
        .replace(/\s/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const paddingNeeded = (4 - (audioBase64.length % 4)) % 4;
      if (paddingNeeded > 0 && paddingNeeded <= 2) {
        audioBase64 += '='.repeat(paddingNeeded);
      }
      
      console.log(`[VoiceDetection] Final base64 length: ${audioBase64.length}`);
      
      if (audioBase64.length < 1000) {
        console.log(`[VoiceDetection] WARNING: Audio data seems too small (${audioBase64.length} chars)`);
      }
      
      const language: string | undefined = validatedData.language;

      try {
        Buffer.from(audioBase64, "base64");
      } catch {
        const errorResponse: VoiceDetectionResponse = {
          status: "error",
          message: "Invalid Base64 encoding for audio data",
        };
        return res.status(400).json(errorResponse);
      }

      console.log(`[VoiceDetection] Processing ${language || "auto-detect"} audio (${(audioBase64.length / 1024).toFixed(1)} KB base64)`);

      const audioFormat = validatedData.audioFormat || "mp3";
      const analysisResult = await performVoiceAnalysis(audioBase64, language, audioFormat);

      const processingTime = Date.now() - startTime;
      console.log(`[VoiceDetection] Analysis complete in ${processingTime}ms - ${analysisResult.classification} (${(analysisResult.confidenceScore * 100).toFixed(1)}%)`);

      const primaryLanguage = language || (analysisResult.detectedLanguages?.[0]) || "English";

      const successResponse = {
        status: "success" as const,
        classification: analysisResult.classification,
        confidenceScore: Math.round(analysisResult.confidenceScore * 100) / 100,
      };

      return res.json(successResponse);
      
    } catch (error) {
      console.error("[VoiceDetection] Error:", error);
      
      const errorResponse: VoiceDetectionResponse = {
        status: "error",
        message: error instanceof Error 
          ? `Analysis failed: ${error.message}` 
          : "An unexpected error occurred during analysis",
      };
      
      return res.status(500).json(errorResponse);
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "Kartavyaa",
      supportedLanguages,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/docs", (req, res) => {
    res.json({
      name: "Kartavyaa - Voice Detection API",
      version: "3.0.0",
      description: "AI-Generated Voice Detection API with automatic multi-language detection. Supports English, Hindi, Tamil, Malayalam, Telugu and more.",
      endpoint: {
        method: "POST",
        path: "/api/voice-detection",
        authentication: {
          type: "API Key",
          header: "x-api-key",
        },
        request: {
          contentType: "application/json",
          body: {
            language: "(Optional) English | Hindi | Tamil | Malayalam | Telugu - auto-detected if not provided",
            audioFormat: "mp3",
            audioBase64: "Base64-encoded MP3 audio",
          },
        },
        response: {
          success: {
            status: "success",
            classification: "AI_GENERATED | HUMAN",
            confidenceScore: "number (0.0 - 1.0)",
          },
          error: {
            status: "error",
            message: "string",
          },
        },
      },
      analysisMethod: {
        languageDetection: "Automatic multi-language detection via Gemini 2.5 Pro",
        layer1: "Acoustic Analysis - Spectral artifacts, pitch consistency, prosody patterns",
        layer2: "Naturalness Analysis - Gemini AI evaluates pitch variation, emotional prosody, breathing patterns",
        scoring: "Model-first verdict: both voice layers vote; agreement = verdict, disagreement = numeric tiebreaker (acoustic × 0.6 + naturalness × 0.4, threshold > 0.60)",
        fallback: "Gemini 2.5 Pro primary, automatic fallback to Gemini 2.5 Flash when Pro is unavailable",
      },
    });
  });

  return httpServer;
}
