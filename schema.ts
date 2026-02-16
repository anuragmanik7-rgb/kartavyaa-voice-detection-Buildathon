import { z } from "zod";

export const supportedLanguages = ["English", "Hindi", "Tamil", "Malayalam", "Telugu"] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

const languageMap: Record<string, SupportedLanguage> = {
  english: "English",
  hindi: "Hindi",
  tamil: "Tamil",
  malayalam: "Malayalam",
  telugu: "Telugu",
};

const optionalLanguage = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val !== "string") return undefined;
    const normalized = languageMap[val.toLowerCase()];
    if (normalized) return normalized;
    return val;
  },
  z.string().optional()
);

export const voiceDetectionRequestSchema = z.object({
  language: optionalLanguage,
  audioFormat: z.string().optional().default("mp3"),
  audioBase64: z.string().min(1, "Audio data is required").optional(),
  audio: z.string().optional(),
  data: z.string().optional(),
}).transform((data) => {
  const audioData = data.audioBase64 || data.audio || data.data || "";
  return {
    ...data,
    audioBase64: audioData,
  };
}).refine((data) => data.audioBase64.length > 0, {
  message: "Audio data is required (provide audioBase64, audio, or data field)",
});

export type VoiceDetectionRequest = z.infer<typeof voiceDetectionRequestSchema>;

export const voiceDetectionResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  language: z.string().optional(),
  detectedLanguages: z.array(z.string()).optional(),
  classification: z.enum(["AI_GENERATED", "HUMAN"]).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  explanation: z.string().optional(),
  message: z.string().optional(),
});

export type VoiceDetectionResponse = z.infer<typeof voiceDetectionResponseSchema>;

export interface AnalysisResult {
  acousticScore: number;
  geminiScore: number;
  combinedScore: number;
  classification: "AI_GENERATED" | "HUMAN";
  confidenceScore: number;
  explanation: string;
  detectedLanguages?: string[];
  language?: string;
}

export interface AcousticFeatures {
  spectralArtifacts: boolean;
  pitchConsistency: number;
  prosodyScore: number;
  breathingPatterns: boolean;
  overallScore: number;
}

export interface GeminiAnalysis {
  pitchVariation: number;
  emotionalProsody: number;
  breathingPatterns: number;
  speechRhythm: number;
  naturalness: number;
  reasoning: string;
}
