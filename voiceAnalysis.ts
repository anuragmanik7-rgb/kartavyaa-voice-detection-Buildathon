import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { AnalysisResult, GeminiAnalysis } from "@shared/schema";

const execAsync = promisify(exec);

// Use Replit integration for content generation
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// Use direct Gemini API for file uploads if user provides their own key
const userGeminiKey = process.env.GEMINI_API_KEY;
const directAi = userGeminiKey ? new GoogleGenAI({ apiKey: userGeminiKey }) : null;

const PRIMARY_MODEL = "gemini-2.5-pro";
const FALLBACK_MODEL = "gemini-2.5-flash";

async function generateWithFallback(
  client: GoogleGenAI,
  contents: any[],
  label: string
): Promise<string> {
  try {
    console.log(`[${label}] Trying ${PRIMARY_MODEL}...`);
    const response = await client.models.generateContent({
      model: PRIMARY_MODEL,
      contents,
    });
    return (response.text || "").trim();
  } catch (err: any) {
    const status = err?.status || err?.httpStatusCode || err?.code || "";
    const msg = err?.message || "";
    const isOverloaded =
      status === 429 ||
      status === 503 ||
      msg.includes("overloaded") ||
      msg.includes("unavailable") ||
      msg.includes("quota") ||
      msg.includes("rate") ||
      msg.includes("capacity") ||
      msg.includes("RESOURCE_EXHAUSTED");

    if (isOverloaded) {
      console.log(`[${label}] ${PRIMARY_MODEL} unavailable (${status}), falling back to ${FALLBACK_MODEL}...`);
      const response = await client.models.generateContent({
        model: FALLBACK_MODEL,
        contents,
      });
      return (response.text || "").trim();
    }
    throw err;
  }
}

// Convert audio to Google-friendly format (16kHz mono WAV)
async function convertAudioForGoogle(inputBase64: string, inputFormat: string = "mp3"): Promise<{ base64: string; mimeType: string }> {
  const inputBuffer = Buffer.from(inputBase64, "base64");
  const tempDir = os.tmpdir();
  const ext = inputFormat === "webm" ? "webm" : inputFormat === "wav" ? "wav" : inputFormat === "mp4" ? "mp4" : "mp3";
  const inputPath = path.join(tempDir, `input_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  const outputPath = path.join(tempDir, `output_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  
  try {
    // Write input file
    fs.writeFileSync(inputPath, inputBuffer);
    console.log(`[AudioConvert] Input file: ${inputPath} (${inputBuffer.length} bytes)`);
    
    // Convert to 16kHz mono WAV using ffmpeg
    const cmd = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}" 2>&1`;
    console.log(`[AudioConvert] Running: ${cmd}`);
    
    try {
      await execAsync(cmd, { timeout: 30000 });
    } catch (err: any) {
      console.error(`[AudioConvert] ffmpeg error:`, err.stderr || err.message);
      // If conversion fails, return original audio
      console.log(`[AudioConvert] Falling back to original audio`);
      return { base64: inputBase64, mimeType: "audio/mpeg" };
    }
    
    // Read converted file
    if (!fs.existsSync(outputPath)) {
      console.log(`[AudioConvert] Output file not created, using original`);
      return { base64: inputBase64, mimeType: "audio/mpeg" };
    }
    
    const outputBuffer = fs.readFileSync(outputPath);
    console.log(`[AudioConvert] Converted: ${outputBuffer.length} bytes WAV`);
    
    return {
      base64: outputBuffer.toString("base64"),
      mimeType: "audio/wav",
    };
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}

async function transcribeWithWhisper(audioBase64: string): Promise<{
  transcription: string;
  success: boolean;
}> {
  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.log("[Whisper] No API key configured");
      return { transcription: "", success: false };
    }

    console.log(`[Whisper] Sending ${(audioBuffer.length / 1024).toFixed(1)} KB to Whisper...`);

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "audio/mpeg",
        },
        method: "POST",
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Whisper] API error: ${response.status} - ${errorText.substring(0, 200)}`);
      return { transcription: "", success: false };
    }

    const result = await response.json();
    const transcription = result.text || "";
    console.log(`[Whisper] Transcription: "${transcription.substring(0, 80)}${transcription.length > 80 ? '...' : ''}"`);
    
    return {
      transcription,
      success: true,
    };
  } catch (error) {
    console.error("[Whisper] Transcription error:", error);
    return {
      transcription: "",
      success: false,
    };
  }
}

// Upload file to Gemini and return file reference (converts to WAV first)
async function uploadToGemini(audioBase64: string): Promise<{ file: any; tempPath: string; mimeType: string } | null> {
  if (!directAi) {
    console.log("[Gemini] No direct API key, will use inline base64");
    return null;
  }
  
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  const tempPath = path.join(tempDir, `upload_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  
  try {
    // First write input MP3 file
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync(inputPath, audioBuffer);
    console.log(`[Gemini] Input MP3: ${inputPath} (${audioBuffer.length} bytes)`);
    
    // Convert to 16kHz mono WAV using ffmpeg
    const cmd = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${tempPath}" 2>&1`;
    console.log(`[Gemini] Converting with ffmpeg...`);
    
    let mimeType = "audio/wav";
    try {
      await execAsync(cmd, { timeout: 30000 });
      console.log(`[Gemini] Conversion successful`);
    } catch (err: any) {
      console.error(`[Gemini] ffmpeg conversion failed:`, err.stderr || err.message);
      // Fall back to original MP3
      fs.copyFileSync(inputPath, tempPath);
      mimeType = "audio/mpeg";
    }
    
    // Cleanup input file
    try { fs.unlinkSync(inputPath); } catch {}
    
    const wavBuffer = fs.readFileSync(tempPath);
    console.log(`[Gemini] Uploading: ${tempPath} (${wavBuffer.length} bytes, ${mimeType})`);
    
    const file = await directAi.files.upload({
      file: tempPath,
      config: { mimeType },
    });
    
    console.log(`[Gemini] File uploaded: ${file.name}, state: ${file.state}`);
    
    // Wait for file to be ready
    let uploadedFile = file;
    let attempts = 0;
    while (uploadedFile.state === "PROCESSING" && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      uploadedFile = await directAi.files.get({ name: file.name! });
      attempts++;
    }
    
    if (uploadedFile.state !== "ACTIVE") {
      throw new Error(`File not ready: ${uploadedFile.state}`);
    }
    
    console.log(`[Gemini] File ready: ${uploadedFile.uri}`);
    return { file: uploadedFile, tempPath, mimeType };
  } catch (error) {
    console.error("[Gemini] File upload failed:", error);
    try { fs.unlinkSync(tempPath); } catch {}
    try { fs.unlinkSync(inputPath); } catch {}
    return null;
  }
}

async function cleanupGeminiFile(fileName: string | undefined, tempPath: string) {
  try { fs.unlinkSync(tempPath); } catch {}
  
  if (fileName && directAi) {
    try {
      await directAi.files.delete({ name: fileName });
      console.log(`[Gemini] Deleted file: ${fileName}`);
    } catch {}
  }
}

export interface LanguageDetectionResult {
  primaryLanguage: string;
  detectedLanguages: string[];
  isMultilingual: boolean;
}

export async function detectLanguages(audioBase64: string, mimeType: string = "audio/mpeg"): Promise<LanguageDetectionResult> {
  try {
    console.log(`[LanguageDetection] Analyzing audio (${(audioBase64.length / 1024).toFixed(1)} KB base64)...`);
    
    const prompt = `Listen to this audio carefully and identify ALL languages spoken in it.

The audio may contain speech in one or more of these languages:
- English
- Hindi
- Bengali
- Marathi
- Chhattisgarhi

It is also possible the audio contains OTHER languages not in the list above. If so, identify them too.

The speaker may switch between languages (code-switching) or mix languages within sentences. Detect every language you hear.

Respond ONLY with valid JSON:
{
  "primary_language": "<the main/dominant language>",
  "all_languages": ["<list every language detected, in order of prominence>"],
  "is_multilingual": <true if more than one language detected>
}`;

    let responseText = "";
    
    const contents = [
      {
        role: "user" as const,
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
        ],
      },
    ];

    const client = directAi || ai;
    console.log(`[LanguageDetection] Using ${directAi ? "paid GEMINI_API_KEY" : "Replit AI integration"}`);
    responseText = await generateWithFallback(client, contents, "LanguageDetection");
    
    console.log(`[LanguageDetection] Gemini response: "${responseText}"`);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const allLanguages: string[] = parsed.all_languages || [];
      const primaryRaw: string = parsed.primary_language || "";
      
      const primary = primaryRaw || "English";
      const detected = allLanguages.length > 0 ? allLanguages : [primary];
      
      console.log(`[LanguageDetection] Primary: ${primary}, All: [${detected.join(", ")}], Multilingual: ${detected.length > 1}`);
      
      return {
        primaryLanguage: primary,
        detectedLanguages: detected,
        isMultilingual: detected.length > 1,
      };
    }

    const knownLanguages = ["English", "Hindi", "Bengali", "Marathi", "Chhattisgarhi", "Spanish", "French", "German", "Portuguese", "Arabic", "Chinese", "Japanese", "Korean", "Tamil", "Telugu", "Malayalam", "Kannada", "Gujarati", "Punjabi", "Urdu"];
    const fallback = knownLanguages.find(
      lang => responseText.toLowerCase().includes(lang.toLowerCase())
    ) || "English";

    console.log(`[LanguageDetection] Fallback detection: ${fallback}`);
    return {
      primaryLanguage: fallback,
      detectedLanguages: [fallback],
      isMultilingual: false,
    };
  } catch (error) {
    console.error("[LanguageDetection] Error:", error);
    return {
      primaryLanguage: "English",
      detectedLanguages: ["English"],
      isMultilingual: false,
    };
  }
}

export interface AcousticAnalysisResult {
  score: number;
  features: {
    spectralArtifacts: boolean;
    pitchConsistency: number;
    prosodyScore: number;
    breathingPatterns: boolean;
  };
  reasoning: string;
  verdict?: string;
}

async function analyzeAcousticFeatures(
  audioBase64: string,
  language: string,
  uploadedFile?: any,
  mimeType: string = "audio/mpeg"
): Promise<AcousticAnalysisResult> {
  try {
    console.log(`[Layer1-Acoustic] Starting acoustic analysis for ${language}...`);
    
    const prompt = `You are an audio forensics expert. Listen to this ${language} audio and determine whether it is AI-generated (TTS/voice synthesis) or spoken by a real human.

Analyze the acoustic properties of the audio and make your determination. Provide your honest expert judgment.

Respond ONLY with valid JSON:
{
  "ai_likelihood_score": <0-100, your confidence that this is AI-generated>,
  "spectral_artifacts": <true if synthetic spectral artifacts detected>,
  "pitch_consistency": <0.0-1.0, how unnaturally consistent the pitch is>,
  "prosody_score": <0.0-1.0, how mechanical the prosody/rhythm sounds>,
  "breathing_patterns": <true if natural breathing is detected>,
  "key_indicators": "<2-3 most important observations driving your decision>",
  "verdict": "AI_GENERATED" or "HUMAN"
}`;

    // Build content parts based on whether we have an uploaded file
    const parts: any[] = [{ text: prompt }];
    
    if (uploadedFile && directAi) {
      parts.push({
        fileData: {
          fileUri: uploadedFile.uri,
          mimeType: mimeType,
        },
      });
    } else {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioBase64,
        },
      });
    }

    const client = (uploadedFile && directAi) ? directAi : ai;
    const responseText = await generateWithFallback(client, [{ role: "user", parts }], "Layer1-Acoustic");
    return parseAcousticResponse(responseText);
  } catch (error) {
    console.error("[Layer1-Acoustic] Error:", error);
    throw error;
  }
}

function parseAcousticResponse(responseText: string): AcousticAnalysisResult {
  console.log(`[Layer1-Acoustic] Response (first 200 chars): ${responseText.substring(0, 200)}`);
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.error("[Layer1-Acoustic] Failed to parse response");
    throw new Error("Failed to parse acoustic analysis response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const aiScore = Math.max(0, Math.min(100, parsed.ai_likelihood_score || 50)) / 100;
  
  console.log(`[Layer1-Acoustic] AI likelihood: ${(aiScore * 100).toFixed(0)}%, Verdict: ${parsed.verdict}`);
  
  return {
    score: aiScore,
    features: {
      spectralArtifacts: Boolean(parsed.spectral_artifacts),
      pitchConsistency: Math.max(0, Math.min(1, parsed.pitch_consistency || 0.5)),
      prosodyScore: Math.max(0, Math.min(1, parsed.prosody_score || 0.5)),
      breathingPatterns: Boolean(parsed.breathing_patterns),
    },
    reasoning: parsed.key_indicators || "Acoustic analysis completed",
    verdict: parsed.verdict || undefined,
  };
}

async function analyzeNaturalness(
  audioBase64: string,
  language: string,
  uploadedFile?: any,
  mimeType: string = "audio/mpeg"
): Promise<GeminiAnalysis> {
  try {
    console.log(`[Layer2-Naturalness] Starting naturalness analysis for ${language}...`);
    
    const prompt = `You are an AI voice detection expert. Listen to this ${language} audio and determine if it was generated by AI/TTS or spoken by a real human.

Analyze the voice naturalness and make your honest expert judgment.

Rate each on a scale of 0-10 where 0 = completely natural/human and 10 = clearly artificial/AI:

Respond ONLY with valid JSON:
{
  "pitch_artificialness": <0-10>,
  "emotional_artificialness": <0-10>,
  "breathing_artificialness": <0-10>,
  "rhythm_artificialness": <0-10>,
  "ai_likelihood": <0-10, your overall judgment>,
  "verdict": "AI_GENERATED" or "HUMAN",
  "reasoning": "<explain your detection reasoning>"
}`;

    const parts: any[] = [{ text: prompt }];
    
    if (uploadedFile && directAi) {
      parts.push({
        fileData: {
          fileUri: uploadedFile.uri,
          mimeType: mimeType,
        },
      });
    } else {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioBase64,
        },
      });
    }

    const client = (uploadedFile && directAi) ? directAi : ai;
    const responseText = await generateWithFallback(client, [{ role: "user", parts }], "Layer2-Naturalness");
    return parseNaturalnessResponse(responseText);
  } catch (error) {
    console.error("[Layer2-Naturalness] Error:", error);
    throw error;
  }
}

function parseNaturalnessResponse(responseText: string): GeminiAnalysis & { verdict?: string } {
  console.log(`[Layer2-Naturalness] Response (first 200 chars): ${responseText.substring(0, 200)}`);
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.error("[Layer2-Naturalness] Failed to parse response");
    throw new Error("Failed to parse naturalness analysis response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const aiLikelihood = Math.max(0, Math.min(10, parsed.ai_likelihood || 5));
  
  console.log(`[Layer2-Naturalness] AI likelihood: ${aiLikelihood}/10, Verdict: ${parsed.verdict || "N/A"}`);
  
  return {
    pitchVariation: 10 - Math.max(0, Math.min(10, parsed.pitch_artificialness || 5)),
    emotionalProsody: 10 - Math.max(0, Math.min(10, parsed.emotional_artificialness || 5)),
    breathingPatterns: 10 - Math.max(0, Math.min(10, parsed.breathing_artificialness || 5)),
    speechRhythm: 10 - Math.max(0, Math.min(10, parsed.rhythm_artificialness || 5)),
    naturalness: 10 - aiLikelihood,
    reasoning: parsed.reasoning || "Naturalness analysis completed",
    verdict: parsed.verdict || undefined,
  };
}

export async function performVoiceAnalysis(
  audioBase64: string,
  language?: string,
  audioFormat: string = "mp3"
): Promise<AnalysisResult> {
  const analysisStart = Date.now();
  const resolvedLanguage = language || "English";
  console.log(`[VoiceAnalysis] Starting analysis for ${resolvedLanguage} audio (${(audioBase64.length / 1024).toFixed(1)} KB base64, format: ${audioFormat})`);
  
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioSizeKB = audioBuffer.length / 1024;
  console.log(`[VoiceAnalysis] Decoded audio size: ${audioBuffer.length} bytes (${audioSizeKB.toFixed(1)} KB)`);
  
  const { base64: convertedBase64, mimeType } = await convertAudioForGoogle(audioBase64, audioFormat);
  console.log(`[VoiceAnalysis] Using ${mimeType} format, ${(convertedBase64.length / 1024).toFixed(1)} KB`);
  
  let uploadedFile: any = null;
  let tempPath = "";
  let uploadMimeType = mimeType;
  
  try {
    const uploadResult = await uploadToGemini(convertedBase64);
    if (uploadResult) {
      uploadedFile = uploadResult.file;
      tempPath = uploadResult.tempPath;
      uploadMimeType = uploadResult.mimeType;
    }
    
    const TIMEOUT_MS = 30000;
    const elapsed = Date.now() - analysisStart;
    const remainingMs = Math.max(TIMEOUT_MS - elapsed - 1000, 5000);
    console.log(`[VoiceAnalysis] Time budget: ${remainingMs}ms remaining for analysis tasks`);
    
    const timeout = (ms: number) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    );
    
    let detectedLanguages: string[] = language ? [language] : [];
    
    let whisperResult: { transcription: string; success: boolean };
    let acousticResult: AcousticAnalysisResult;
    let naturalnessResult: GeminiAnalysis & { verdict?: string };
    
    const WHISPER_SIZE_LIMIT_KB = 900;
    const skipWhisper = audioSizeKB > WHISPER_SIZE_LIMIT_KB;
    if (skipWhisper) {
      console.log(`[VoiceAnalysis] Audio ${audioSizeKB.toFixed(1)} KB > ${WHISPER_SIZE_LIMIT_KB} KB — skipping Whisper to save time`);
    }

    const whisperTask = skipWhisper
      ? Promise.resolve({ transcription: "", success: false })
      : transcribeWithWhisper(audioBase64).catch(err => {
          console.error("[VoiceAnalysis] Whisper failed:", err);
          return { transcription: "", success: false };
        });
    const acousticTask = analyzeAcousticFeatures(convertedBase64, resolvedLanguage, uploadedFile, uploadMimeType);
    const naturalnessTask = analyzeNaturalness(convertedBase64, resolvedLanguage, uploadedFile, uploadMimeType);

    if (!language) {
      const langTask = detectLanguages(convertedBase64, uploadMimeType).catch(err => {
        console.error("[VoiceAnalysis] Language detection failed:", err);
        return { primaryLanguage: "English", detectedLanguages: ["English"], isMultilingual: false };
      });
      
      const [langResult, w, a, n] = await Promise.race([
        Promise.all([langTask, whisperTask, acousticTask, naturalnessTask]),
        timeout(remainingMs).then(() => { throw new Error("Analysis timed out"); })
      ]) as [LanguageDetectionResult, typeof whisperResult, AcousticAnalysisResult, GeminiAnalysis & { verdict?: string }];
      
      detectedLanguages = langResult.detectedLanguages;
      whisperResult = w;
      acousticResult = a;
      naturalnessResult = n;
      console.log(`[VoiceAnalysis] Auto-detected: primary=${langResult.primaryLanguage}, all=[${detectedLanguages.join(", ")}]`);
    } else {
      const [w, a, n] = await Promise.race([
        Promise.all([whisperTask, acousticTask, naturalnessTask]),
        timeout(remainingMs).then(() => { throw new Error("Analysis timed out"); })
      ]) as [typeof whisperResult, AcousticAnalysisResult, GeminiAnalysis & { verdict?: string }];
      
      whisperResult = w;
      acousticResult = a;
      naturalnessResult = n;
    }
    
    console.log(`[VoiceAnalysis] Whisper success: ${whisperResult.success}`);

    const normalizeVerdict = (v?: string) => v?.trim().toUpperCase() === "AI_GENERATED" ? "AI_GENERATED" : v?.trim().toUpperCase() === "HUMAN" ? "HUMAN" : null;
    const layer1Verdict = normalizeVerdict(acousticResult.verdict) || (acousticResult.score > 0.5 ? "AI_GENERATED" : "HUMAN");
    const layer2Verdict = normalizeVerdict(naturalnessResult.verdict) || (naturalnessResult.naturalness < 5 ? "AI_GENERATED" : "HUMAN");
    
    const acousticScore = acousticResult.score;
    const aiLikelihood = (10 - naturalnessResult.naturalness) / 10;
    const numericScore = (acousticScore * 0.6) + (aiLikelihood * 0.4);
    
    let classification: "AI_GENERATED" | "HUMAN";
    let confidenceScore: number;
    
    if (layer1Verdict === layer2Verdict) {
      classification = layer1Verdict as "AI_GENERATED" | "HUMAN";
      
      if (classification === "AI_GENERATED") {
        const rawConf = Math.max(acousticScore, aiLikelihood, numericScore);
        confidenceScore = 0.80 + (rawConf * 0.20);
      } else {
        const rawHuman = Math.max(1 - acousticScore, 1 - aiLikelihood, 1 - numericScore);
        confidenceScore = 0.80 + (rawHuman * 0.20);
      }
      console.log(`[VoiceAnalysis] Both models agree: ${classification}, confidence: ${(confidenceScore * 100).toFixed(1)}%`);
    } else {
      classification = numericScore > 0.60 ? "AI_GENERATED" : "HUMAN";
      
      const distance = Math.abs(numericScore - 0.60);
      confidenceScore = 0.60 + (distance * 0.50);
      console.log(`[VoiceAnalysis] Models disagree (L1=${layer1Verdict}, L2=${layer2Verdict}), numeric: ${(numericScore * 100).toFixed(0)}% => ${classification}, confidence: ${(confidenceScore * 100).toFixed(1)}%`);
    }
    
    confidenceScore = Math.max(0, Math.min(1.0, Math.round(confidenceScore * 100) / 100));

    console.log(`[VoiceAnalysis] L1 verdict: ${layer1Verdict} (acoustic=${(acousticScore * 100).toFixed(0)}%), L2 verdict: ${layer2Verdict} (aiLikelihood=${(aiLikelihood * 100).toFixed(0)}%), Combined: ${(numericScore * 100).toFixed(0)}% => ${classification} @ ${(confidenceScore * 100).toFixed(0)}%`);

    const explanationParts: string[] = [];
    
    if (classification === "AI_GENERATED") {
      if (acousticResult.features.spectralArtifacts) explanationParts.push("digital artifacts detected");
      if (acousticResult.features.pitchConsistency > 0.6) explanationParts.push("unnaturally consistent pitch");
      if (!acousticResult.features.breathingPatterns) explanationParts.push("missing natural breathing");
      if (naturalnessResult.naturalness < 4) explanationParts.push("robotic speech patterns");
      if (naturalnessResult.emotionalProsody < 4) explanationParts.push("artificial emotional delivery");
    } else {
      if (acousticResult.features.breathingPatterns) explanationParts.push("natural breathing detected");
      if (naturalnessResult.naturalness >= 6) explanationParts.push("natural speech flow");
      if (naturalnessResult.emotionalProsody >= 6) explanationParts.push("genuine emotional expression");
    }

    if (acousticResult.reasoning && acousticResult.reasoning !== "Acoustic analysis completed") {
      explanationParts.push(acousticResult.reasoning);
    }

    const explanation = explanationParts.length > 0
      ? explanationParts.join(", ").charAt(0).toUpperCase() + explanationParts.join(", ").slice(1)
      : classification === "AI_GENERATED"
        ? "Voice characteristics indicate AI generation"
        : "Voice characteristics indicate human origin";

    const totalTime = Date.now() - analysisStart;
    console.log(`[VoiceAnalysis] Total processing time: ${totalTime}ms`);

    return {
      acousticScore,
      geminiScore: naturalnessResult.naturalness,
      combinedScore: numericScore,
      classification,
      confidenceScore,
      explanation,
      detectedLanguages,
      language: language || detectedLanguages[0] || "English",
    };
  } catch (error) {
    console.error("[VoiceAnalysis] Critical error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      throw new Error("AI service quota exceeded. Please try again later or use a different API key.");
    }
    
    if (errorMessage.includes("timed out")) {
      throw new Error("Analysis timed out. The audio file may be too large or the service is busy.");
    }
    
    if (errorMessage.includes("too small")) {
      throw error;
    }
    
    throw new Error(`Voice analysis failed: ${errorMessage}`);
  } finally {
    if (uploadedFile) {
      await cleanupGeminiFile(uploadedFile.name, tempPath);
    }
  }
}

export { analyzeNaturalness as analyzeWithGemini };
