import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Shield, Brain, FileAudio, CheckCircle, XCircle, Loader2, Copy, Key, Globe, Waves, BarChart3, Cpu, Fingerprint, Mic, Radio, ScanLine, AudioWaveform, Square, MicOff, ChevronDown } from "lucide-react";
import { supportedLanguages, type VoiceDetectionResponse } from "@shared/schema";

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [bootLines, setBootLines] = useState<string[]>([]);

  const tasks = [
    { progress: 10, text: "Initializing neural network modules..." },
    { progress: 25, text: "Loading acoustic analysis engine..." },
    { progress: 40, text: "Calibrating voice pattern detectors..." },
    { progress: 55, text: "Connecting to Gemini AI backend..." },
    { progress: 65, text: "Loading auto-detect language engine..." },
    { progress: 85, text: "Running system diagnostics..." },
    { progress: 95, text: "Finalizing security protocols..." },
    { progress: 100, text: "System online. Ready." },
  ];

  useEffect(() => {
    let taskIndex = 0;
    const interval = setInterval(() => {
      if (taskIndex < tasks.length) {
        const task = tasks[taskIndex];
        setProgress(task.progress);
        setCurrentTask(task.text);
        setBootLines((prev) => [...prev, `[${new Date().toISOString().split("T")[1].split(".")[0]}] ${task.text}`]);
        taskIndex++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col items-center justify-center">
      <div className="absolute inset-0 cyber-grid opacity-30" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-scan-line" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-glow-pulse" />
            <div className="relative p-4 rounded-full border border-cyan-500/30 bg-[#0d1117]">
              <Shield className="h-12 w-12 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-wider text-white" style={{ fontFamily: "'Oxanium', sans-serif" }}>
            KARTAVYAA
          </h1>
          <p className="text-cyan-500/60 text-sm font-mono tracking-widest uppercase">
            AI Voice Detection System
          </p>
          <p className="text-cyan-500/40 text-xs tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            HCL-GUVI AI IMPACT SUMMIT
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative h-2 bg-[#1a1f2e] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500 ease-out animate-progress-glow"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-cyan-500/80 text-xs font-mono">{currentTask}</span>
            <span className="text-cyan-400 text-xs font-mono font-bold">{progress}%</span>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-cyan-900/30 rounded-md p-3 max-h-40 overflow-y-auto font-mono text-xs">
          {bootLines.map((line, i) => (
            <div key={i} className="text-cyan-600/80 leading-relaxed">
              <span className="text-cyan-400/50">{">"}</span> {line}
            </div>
          ))}
          <span className="inline-block w-2 h-3 bg-cyan-400 animate-pulse ml-1" />
        </div>

        <div className="flex items-center justify-center gap-6 text-cyan-600/40 text-xs font-mono">
          <span>v2.5 PRO</span>
          <span>|</span>
          <span>GEMINI ENGINE</span>
          <span>|</span>
          <span>5 LANG</span>
        </div>
      </div>
    </div>
  );
}

function WaveformVisualizer({ isActive, variant }: { isActive: boolean; variant?: "small" | "large" }) {
  const barCount = variant === "small" ? 12 : 24;
  const maxH = variant === "small" ? 16 : 32;
  const heights = useMemo(
    () => Array.from({ length: barCount }, () => Math.random() * maxH + 4),
    [barCount, maxH]
  );
  const durations = useMemo(
    () => Array.from({ length: barCount }, () => 0.8 + Math.random() * 0.8),
    [barCount]
  );
  return (
    <div className="flex items-center justify-center gap-[2px]" style={{ minHeight: variant === "small" ? 20 : 40 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full transition-all duration-300 ${
            isActive ? "bg-cyan-400" : "bg-cyan-900/30"
          }`}
          style={{
            height: isActive ? `${h}px` : "4px",
            animationDelay: `${i * 0.08}s`,
            animation: isActive ? `waveform ${durations[i]}s ease-in-out infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

function GlowCard({ children, className = "", glowColor = "cyan" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 hover:border-cyan-500/40",
    green: "border-emerald-500/20 hover:border-emerald-500/40",
    red: "border-red-500/20 hover:border-red-500/40",
    purple: "border-purple-500/20 hover:border-purple-500/40",
  };
  return (
    <div className={`relative rounded-md border bg-card/80 backdrop-blur-sm transition-colors duration-300 ${colorMap[glowColor] || colorMap.cyan} ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>("");
  const [result, setResult] = useState<VoiceDetectionResponse | null>(null);
  const [apiKey, setApiKey] = useState<string>("sk_test_demo_key_123");
  const [language, setLanguage] = useState<string>("auto");
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [apiDocsOpen, setApiDocsOpen] = useState(false);
  const [audioInputMode, setAudioInputMode] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "webm";
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setAudioBase64(base64);
          setAudioFile(new File([blob], `recording_${Date.now()}.${ext}`, { type: mimeType }));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      setResult(null);
      setRecordedBlob(null);
      setAudioBase64("");
      setAudioFile(null);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      setMicPermission("denied");
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings to record audio.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => setShowContent(true), 100);
    }
  }, [isLoading]);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/voice-detection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          ...(language !== "auto" ? { language } : {}),
          audioFormat: audioFile?.type?.includes("webm") ? "webm" : audioFile?.type?.includes("mp4") ? "mp4" : audioFile?.name?.endsWith(".wav") ? "wav" : "mp3",
          audioBase64: audioBase64,
        }),
      });
      return response.json();
    },
    onSuccess: (data: VoiceDetectionResponse) => {
      setResult(data);
      if (data.status === "success") {
        toast({
          title: "Analysis Complete",
          description: `Voice classified as ${data.classification}`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
        toast({
          title: "Invalid File",
          description: "Please upload an audio file (MP3, WAV, WebM supported)",
          variant: "destructive",
        });
        return;
      }
      setAudioFile(file);
      setResult(null);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAudioBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyApiEndpoint = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/voice-detection`);
    toast({ title: "Copied!", description: "API endpoint copied to clipboard" });
  };

  const copyCurlCommand = () => {
    const bodyObj = language !== "auto"
      ? { language, audioFormat: "mp3", audioBase64: "YOUR_BASE64_ENCODED_AUDIO" }
      : { audioFormat: "mp3", audioBase64: "YOUR_BASE64_ENCODED_AUDIO" };
    const curlCommand = `curl -X POST ${window.location.origin}/api/voice-detection \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '${JSON.stringify(bodyObj, null, 4)}'`;
    navigator.clipboard.writeText(curlCommand);
    toast({ title: "Copied!", description: "cURL command copied to clipboard" });
  };

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 cyber-grid pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-cyan-500/10 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-md blur-md animate-glow-pulse" />
                <div className="relative p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                  <Shield className="h-5 w-5 text-cyan-500" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>
                  KARTAVYAA
                </h1>
                <p className="text-xs text-muted-foreground font-mono tracking-wide">AI VOICE DETECTION</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <Radio className="h-3 w-3" />
                <span className="font-mono text-xs">LIVE</span>
              </Badge>
              <Badge variant="outline" className="gap-1 border-purple-500/20 text-purple-600 dark:text-purple-400">
                <Cpu className="h-3 w-3" />
                <span className="font-mono text-xs">GEMINI 2.5 PRO</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto px-4 py-8 transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}>
        <div className="text-center mb-12 space-y-5">
          <div className="inline-block mb-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 tracking-wider text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HCL-GUVI AI IMPACT SUMMIT - BUILDATHON
            </Badge>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <WaveformVisualizer isActive variant="small" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Oxanium', sans-serif" }}>
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Kartavyaa</span>
            </h2>
            <WaveformVisualizer isActive variant="small" />
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Detect <span className="text-cyan-500 font-semibold">AI-Generated</span> Voices with Two-Layer Neural Analysis
          </p>

          <div className="max-w-2xl mx-auto py-3 px-6 rounded-md bg-gradient-to-r from-cyan-500/[0.06] via-purple-500/[0.06] to-amber-500/[0.06] border border-cyan-500/15">
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-center bg-gradient-to-r from-amber-300 via-amber-200 to-cyan-300 bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif", lineHeight: 1.4 }}>
              "Let's not just make in India but Transform From India"
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {supportedLanguages.map((lang) => (
              <Badge key={lang} variant="secondary" className="font-mono text-xs">
                {lang}
              </Badge>
            ))}
          </div>

          <p className="text-xs text-muted-foreground tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Prepared by <span className="text-foreground font-medium">Anurag Manik</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <GlowCard>
              <div className="p-5 space-y-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-cyan-500" />
                  <h3 className="font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Voice Analysis Scanner</h3>
                </div>
                <p className="text-sm text-muted-foreground">Upload or record audio for AI detection analysis</p>
              </div>
              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Authentication Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-500/50" />
                    <Input
                      id="api-key"
                      data-testid="input-api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pl-10 font-mono text-sm border-cyan-500/10 focus:border-cyan-500/30"
                      placeholder="sk_test_..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Language (optional)</Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val)}>
                    <SelectTrigger id="language" data-testid="select-language" className="border-cyan-500/10 focus:border-cyan-500/30">
                      <Globe className="h-4 w-4 mr-2 text-cyan-500/50" />
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" data-testid="option-language-auto">
                        Auto-Detect
                      </SelectItem>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang} data-testid={`option-language-${lang.toLowerCase()}`}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {language === "auto" && (
                    <p className="text-xs text-cyan-500/60 font-mono">Languages will be automatically detected from audio</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Audio Source</Label>
                  <div className="flex gap-1 p-1 bg-muted/30 rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("upload")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono tracking-wider transition-colors duration-200 ${
                        audioInputMode === "upload"
                          ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"
                          : "text-muted-foreground border border-transparent"
                      }`}
                      data-testid="button-mode-upload"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      UPLOAD FILE
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("record")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-mono tracking-wider transition-colors duration-200 ${
                        audioInputMode === "record"
                          ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"
                          : "text-muted-foreground border border-transparent"
                      }`}
                      data-testid="button-mode-record"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      RECORD LIVE
                    </button>
                  </div>

                  {audioInputMode === "upload" ? (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.wav,.webm,.ogg,.m4a,audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                        data-testid="input-audio-file"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-cyan-500/20 rounded-md p-6 text-center cursor-pointer transition-colors duration-300 hover:border-cyan-500/40 hover:bg-cyan-500/[0.02] group"
                        data-testid="button-audio-upload"
                      >
                        {audioFile && !isRecording ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="p-2 rounded-md bg-cyan-500/10">
                                <FileAudio className="h-5 w-5 text-cyan-500" />
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{audioFile.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{(audioFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <WaveformVisualizer isActive={true} variant="small" />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-3 rounded-full bg-muted/50 inline-block transition-colors duration-300 group-hover:bg-cyan-500/10">
                              <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-cyan-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Click to upload audio file</p>
                              <p className="text-xs text-muted-foreground font-mono mt-1">MP3, WAV, WebM formats supported</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="border border-dashed border-cyan-500/20 rounded-md p-6 text-center" data-testid="recording-area" style={{ minHeight: 180 }}>
                      {isRecording ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-lg animate-pulse" />
                            <div className="relative p-4 rounded-full bg-red-500/10 border border-red-500/30">
                              <Mic className="h-8 w-8 text-red-500 animate-pulse" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-500 font-mono tracking-wider">RECORDING</p>
                            <p className="text-2xl font-mono font-bold text-red-400 mt-1" data-testid="text-recording-duration">
                              {formatDuration(recordingDuration)}
                            </p>
                          </div>
                          <WaveformVisualizer isActive={true} variant="large" />
                          <Button
                            onClick={stopRecording}
                            variant="destructive"
                            className="font-mono tracking-wider"
                            data-testid="button-stop-recording"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            STOP RECORDING
                          </Button>
                        </div>
                      ) : recordedBlob ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="p-2 rounded-md bg-emerald-500/10">
                              <Mic className="h-5 w-5 text-emerald-500" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Recording captured</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {formatDuration(recordingDuration)} | {(recordedBlob.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <WaveformVisualizer isActive={true} variant="small" />
                          <Button
                            variant="outline"
                            onClick={startRecording}
                            className="font-mono text-xs tracking-wider"
                            data-testid="button-re-record"
                          >
                            <Mic className="h-3.5 w-3.5 mr-2" />
                            RECORD AGAIN
                          </Button>
                        </div>
                      ) : micPermission === "denied" ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-full bg-red-500/10 inline-block">
                            <MicOff className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm text-red-500 font-medium">Microphone access denied</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Please allow microphone access in your browser settings
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={startRecording}
                            className="font-mono text-xs tracking-wider"
                            data-testid="button-retry-mic"
                          >
                            TRY AGAIN
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 rounded-full bg-muted/50 inline-block">
                            <Mic className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Record audio from your device microphone</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">Click below to start recording</p>
                          </div>
                          <Button
                            onClick={startRecording}
                            className="bg-cyan-600 text-white border-cyan-500 font-mono tracking-wider"
                            data-testid="button-start-recording"
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            START RECORDING
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => analysisMutation.mutate()}
                  disabled={!audioBase64 || analysisMutation.isPending || isRecording}
                  className="w-full bg-cyan-600 text-white border-cyan-500"
                  size="lg"
                  data-testid="button-analyze"
                >
                  {analysisMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-mono tracking-wider">ANALYZING...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4" />
                      <span className="font-mono tracking-wider">SCAN VOICE</span>
                    </span>
                  )}
                </Button>

                {analysisMutation.isPending && (
                  <div className="space-y-3 p-4 rounded-md bg-cyan-500/[0.03] border border-cyan-500/10">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-cyan-500/80">
                      <span>Processing neural analysis...</span>
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                    <WaveformVisualizer isActive={true} variant="large" />
                    <div className="space-y-1 text-xs font-mono text-muted-foreground">
                      <p>Auto-detecting languages...</p>
                      <p>Layer 1: Acoustic pattern extraction</p>
                      <p>Layer 2: Naturalness evaluation</p>
                    </div>
                  </div>
                )}
              </div>
            </GlowCard>

            {result && result.status === "success" && (
              <GlowCard glowColor={result.classification === "AI_GENERATED" ? "red" : "green"}>
                <div className={`p-5 border-b ${result.classification === "AI_GENERATED" ? "bg-red-500/[0.03] border-red-500/10" : "bg-emerald-500/[0.03] border-emerald-500/10"}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      {result.classification === "AI_GENERATED" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      )}
                      <h3 className="font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analysis Result</h3>
                    </div>
                    <Badge
                      variant={result.classification === "AI_GENERATED" ? "destructive" : "default"}
                      className={`font-mono text-xs tracking-wider ${result.classification !== "AI_GENERATED" ? "bg-emerald-600 text-white border-emerald-500" : ""}`}
                      data-testid="badge-classification"
                    >
                      {result.classification === "AI_GENERATED" ? "AI GENERATED" : "HUMAN VERIFIED"}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Confidence Score</span>
                      <span className="text-sm font-mono font-bold" data-testid="text-confidence">
                        {((result.confidenceScore || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={(result.confidenceScore || 0) * 100} className="h-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="bg-muted/30 rounded-md p-3 border border-border">
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</span>
                      <p className="font-medium capitalize mt-1 flex items-center gap-1">
                        <Radio className="h-3 w-3 text-emerald-500" />
                        {result.status}
                      </p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            )}

            {result && result.status === "error" && (
              <GlowCard glowColor="red">
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold text-red-500">Error</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </GlowCard>
            )}
          </div>

          <div className="space-y-6">
            <GlowCard glowColor="purple">
              <button
                type="button"
                onClick={() => setApiDocsOpen(!apiDocsOpen)}
                className="w-full p-5 flex items-center justify-between gap-4 cursor-pointer text-left"
                data-testid="button-toggle-api-docs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AudioWaveform className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>API Documentation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Integration guide for developers</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${apiDocsOpen ? "rotate-180" : ""}`} />
              </button>
              {apiDocsOpen && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <Tabs defaultValue="endpoint">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="endpoint" data-testid="tab-endpoint" className="font-mono text-xs">ENDPOINT</TabsTrigger>
                      <TabsTrigger value="request" data-testid="tab-request" className="font-mono text-xs">REQUEST</TabsTrigger>
                      <TabsTrigger value="response" data-testid="tab-response" className="font-mono text-xs">RESPONSE</TabsTrigger>
                    </TabsList>

                    <TabsContent value="endpoint" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">API Endpoint</Label>
                        <div className="flex gap-2">
                          <code className="flex-1 px-3 py-2 bg-muted/50 rounded-md text-sm font-mono overflow-x-auto border border-border">
                            POST /api/voice-detection
                          </code>
                          <Button size="icon" variant="outline" onClick={copyApiEndpoint} data-testid="button-copy-endpoint">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Headers</Label>
                        <div className="bg-muted/30 rounded-md p-3 font-mono text-sm space-y-1 border border-border">
                          <p><span className="text-cyan-500">Content-Type:</span> application/json</p>
                          <p><span className="text-cyan-500">x-api-key:</span> YOUR_API_KEY</p>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full font-mono text-xs tracking-wider" onClick={copyCurlCommand} data-testid="button-copy-curl">
                        <Copy className="h-4 w-4 mr-2" />
                        COPY cURL COMMAND
                      </Button>
                    </TabsContent>

                    <TabsContent value="request" className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Request Body</Label>
                        <Textarea
                          readOnly
                          className="font-mono text-sm min-h-[150px] border-border"
                          value={JSON.stringify(
                            {
                              language: "(optional) auto-detected if omitted",
                              audioFormat: "mp3",
                              audioBase64: "BASE64_ENCODED_MP3_AUDIO",
                            },
                            null,
                            2
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Supported Languages</Label>
                        <div className="flex flex-wrap gap-2">
                          {supportedLanguages.map((lang) => (
                            <Badge key={lang} variant="secondary" className="font-mono text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="response" className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-emerald-500">Success Response</Label>
                        <Textarea
                          readOnly
                          className="font-mono text-sm min-h-[200px] border-border"
                          value={JSON.stringify(
                            {
                              status: "success",
                              classification: "AI_GENERATED",
                              confidenceScore: 0.92,
                            },
                            null,
                            2
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-red-500">Error Response</Label>
                        <Textarea
                          readOnly
                          className="font-mono text-sm min-h-[80px] border-border"
                          value={JSON.stringify(
                            {
                              status: "error",
                              message: "Invalid API key or malformed request",
                            },
                            null,
                            2
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </GlowCard>

            <GlowCard>
              <div className="p-5 space-y-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-500" />
                  <h3 className="font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Detection Architecture</h3>
                </div>
                <p className="text-sm text-muted-foreground">Two-layer model-first neural system</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-md bg-cyan-500/[0.03] border border-cyan-500/10">
                  <div className="p-2 bg-cyan-500/10 rounded-md shrink-0">
                    <Waves className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Layer 1: Acoustic Analysis</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gemini detects spectral artifacts, pitch consistency, and prosody patterns.
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs font-mono">60% WEIGHT</Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md bg-purple-500/[0.03] border border-purple-500/10">
                  <div className="p-2 bg-purple-500/10 rounded-md shrink-0">
                    <Brain className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Layer 2: Naturalness Analysis</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gemini AI evaluates pitch variation, emotional prosody, breathing patterns, and speech rhythm.
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs font-mono">40% WEIGHT</Badge>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Model-First Decision</h4>
                  <code className="text-xs font-mono bg-muted/50 px-3 py-2 rounded-md block border border-border text-cyan-600 dark:text-cyan-400">
                    Both layers vote &rarr; Agreement = final verdict
                  </code>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Disagree &rarr; numeric score tiebreaker (&gt; 0.60 = AI)
                  </p>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </main>

      <footer className="border-t border-cyan-500/10 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-500/50" />
              <span className="tracking-wider font-medium" style={{ fontFamily: "'Oxanium', sans-serif" }}>KARTAVYAA</span>
              <span className="text-muted-foreground/50">|</span>
              <span className="text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AI Voice Detection</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {supportedLanguages.map((lang) => (
                <span key={lang} className="text-xs font-mono text-muted-foreground">{lang}</span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground/60 text-center space-y-1">
              <p style={{ fontFamily: "'Space Grotesk', sans-serif" }}>HCL-GUVI AI IMPACT SUMMIT - BUILDATHON</p>
              <p>Prepared by <span className="text-muted-foreground">Anurag Manik</span></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
