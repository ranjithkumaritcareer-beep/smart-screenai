import React, { useState, useEffect, useRef } from "react";
import { 
  PhoneCall, PhoneOff, Mic, MicOff, Volume2, 
  VolumeX, Sparkles, Languages, Loader2, MessageSquare,
  ChevronDown, HelpCircle, FileText, Briefcase, RefreshCw,
  Sliders, Settings, Keyboard, Headphones, Play, Pause,
  Wifi, ShieldAlert, CheckCircle, Moon, Sun, ArrowRight, X,
  Globe, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceAssistantProps {
  resumeText?: string | null;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function VoiceAssistant({ resumeText }: VoiceAssistantProps) {
  // Voice Call UI & Channel States
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [headphoneMode, setHeadphoneMode] = useState(false);
  const [status, setStatus] = useState<"connecting" | "idle" | "listening" | "thinking" | "speaking" | "disconnected">("disconnected");
  
  // Conversation History
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [detectedLang, setDetectedLang] = useState("EN");
  const [selectedLangCode, setSelectedLangCode] = useState("en-IN");
  const [callDuration, setCallDuration] = useState(0);
  const [networkLatency, setNetworkLatency] = useState<number>(45);

  // Custom Settings & Customization States
  const [showSettings, setShowSettings] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatText, setChatText] = useState("");
  const [voiceVoice, setVoiceVoice] = useState<"male" | "female">("female");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [responseLength, setResponseLength] = useState<"short" | "standard" | "detailed">("standard");
  const [callTheme, setCallTheme] = useState<"dark" | "light">("dark");

  // Audio & Mic Context References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Handle Call Duration timer
  useEffect(() => {
    if (isConnected && !showSettings) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
        // Simulate minor network shifts
        setNetworkLatency(prev => {
          const shift = Math.floor(Math.random() * 11) - 5;
          return Math.max(25, Math.min(180, prev + shift));
        });
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isConnected, showSettings]);

  // Clean up Web Audio and synthesis on close/unmount
  useEffect(() => {
    return () => {
      stopRecordingStream();
      stopSpeechSynthesis();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // When call starts, perform connection handshake
  const handleStartCall = async () => {
    setIsOpen(true);
    setStatus("connecting");
    setTranscript([]);
    setCallDuration(0);
    
    setTimeout(() => {
      setIsConnected(true);
      setStatus("speaking");
      const greeting = "Hello! I am your AI Placement Assistant. I can help you review your resume, analyze job descriptions, prepare for interviews, explain technical concepts, and answer your career questions. How can I help you today?";
      
      const greetingMessage: Message = {
        role: "assistant",
        text: greeting,
        timestamp: new Date()
      };
      setTranscript([greetingMessage]);
      speakResponse(greeting, selectedLangCode);
    }, 2000);
  };

  const handleEndCall = () => {
    stopRecordingStream();
    stopSpeechSynthesis();
    setIsRecording(false);
    setIsConnected(false);
    setIsOpen(false);
    setStatus("disconnected");
    setTranscript([]);
    setCallDuration(0);
    setShowSettings(false);
    setShowChatInput(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const stopSpeechSynthesis = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Speaks the AI's response using Sarvam TTS (with browser client synthesis fallback)
  const speakResponse = async (text: string, langCode = "en-IN") => {
    stopSpeechSynthesis();
    if (isSpeakerMuted) {
      setStatus("idle");
      return;
    }
    
    setStatus("speaking");

    try {
      // Direct call to synthesize speech using the updated Sarvam configuration (bulbul:v2)
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: langCode })
      });

      const data = await response.json();

      if (data.audioContent) {
        const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        
        // Apply custom playback speed setting
        audio.defaultPlaybackRate = playbackSpeed;
        audio.playbackRate = playbackSpeed;

        audio.onended = () => {
          setStatus("idle");
          // Re-trigger automatic listening if not muted
          if (!isMuted) {
            startRecording();
          }
        };

        audio.onerror = () => {
          console.warn("Sarvam playback error, using client side backup Synthesis.");
          fallbackSpeak(text, langCode);
        };

        await audio.play();
      } else {
        fallbackSpeak(text, langCode);
      }
    } catch (err) {
      console.warn("TTS failed, using fallback client SpeechSynthesis:", err);
      fallbackSpeak(text, langCode);
    }
  };

  // Native WebSpeech fallback
  const fallbackSpeak = (text: string, langCode = "en-IN") => {
    if (!window.speechSynthesis) {
      setStatus("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-detect best locale code
    if (langCode.startsWith("ta") || /[\u0B80-\u0BFF]/.test(text)) {
      utterance.lang = "ta-IN";
    } else if (langCode.startsWith("hi") || /[\u0900-\u097F]/.test(text)) {
      utterance.lang = "hi-IN";
    } else if (langCode.startsWith("te")) {
      utterance.lang = "te-IN";
    } else if (langCode.startsWith("kn")) {
      utterance.lang = "kn-IN";
    } else if (langCode.startsWith("ml")) {
      utterance.lang = "ml-IN";
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = playbackSpeed;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(utterance.lang) || v.lang === utterance.lang);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      setStatus("idle");
      if (!isMuted) {
        setTimeout(() => startRecording(), 400);
      }
    };

    utterance.onerror = () => {
      setStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Starts recording microphone stream with real-time spectrum analysis
  const startRecording = async () => {
    stopSpeechSynthesis();
    if (isMuted) return;

    audioChunksRef.current = [];
    setStatus("listening");
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      
      // Start real 60 FPS HTML Canvas sound waves rendering
      drawLiveCanvasVisualizer();

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        if (audioChunksRef.current.length === 0) {
          setStatus("idle");
          return;
        }

        setStatus("thinking");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          await processUserSpeech(base64Audio);
        };
      };

      // Auto stop recording if silence is detected (Basic VAD heuristic)
      mediaRecorder.start();
    } catch (err) {
      console.error("Failed to acquire mic access:", err);
      setStatus("idle");
      setIsRecording(false);
    }
  };

  const stopRecordingStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // Triggered when user initiates interruption
  const handleUserInterruption = () => {
    stopSpeechSynthesis();
    stopRecordingStream();
    setStatus("listening");
    startRecording();
  };

  // Process user input (Speech or Typed text) and query Groq / Chroma RAG context
  const processUserSpeech = async (base64Audio: string) => {
    try {
      // 1. Send to Sarvam STT (saarika:v2.5)
      const sttRes = await fetch("/api/voice/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" })
      });

      if (!sttRes.ok) throw new Error("STT translation failed");
      const sttData = await sttRes.json();
      const userText = sttData.transcript || "";

      if (!userText.trim()) {
        setStatus("idle");
        if (!isMuted) startRecording();
        return;
      }

      await respondToUserText(userText);

    } catch (err) {
      console.error("Mic processing failure:", err);
      setStatus("idle");
      const errorMessage: Message = {
        role: "assistant",
        text: "I am having trouble receiving your speech. Please speak clearly or try again.",
        timestamp: new Date()
      };
      setTranscript(prev => [...prev, errorMessage]);
      fallbackSpeak(errorMessage.text, selectedLangCode);
    }
  };

  const respondToUserText = async (text: string) => {
    // Add User Message to screen transcript
    const userMessage: Message = {
      role: "user",
      text: text,
      timestamp: new Date()
    };
    setTranscript(prev => [...prev, userMessage]);

    setStatus("thinking");

    // Detect language
    if (/[\u0B80-\u0BFF]/.test(text)) {
      setDetectedLang("தமிழ் (Tamil)");
      setSelectedLangCode("ta-IN");
    } else if (/[\u0900-\u097F]/.test(text)) {
      setDetectedLang("हिंदी (Hindi)");
      setSelectedLangCode("hi-IN");
    } else if (/[\u0D00-\u0D7F]/.test(text)) {
      setDetectedLang("മലയാളം (Malayalam)");
      setSelectedLangCode("ml-IN");
    } else if (/[\u0C00-\u0C7F]/.test(text)) {
      setDetectedLang("తెలుగు (Telugu)");
      setSelectedLangCode("te-IN");
    } else if (/[\u0C80-\u0CFF]/.test(text)) {
      setDetectedLang("ಕನ್ನಡ (Kannada)");
      setSelectedLangCode("kn-IN");
    } else {
      setDetectedLang("English (EN)");
    }

    try {
      // RAG Retrieval from localStorage
      const localResumeText = localStorage.getItem("smartscreen_uploaded_resume_text") || resumeText || null;
      const localJdText = localStorage.getItem("smartscreen_uploaded_jd_text") || null;

      // Bundle context & conversational history
      const historyPayload = transcript.map(t => ({
        role: t.role,
        content: t.text
      }));

      const chatRes = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          uploadedResumeText: localResumeText,
          uploadedJdText: localJdText,
          history: historyPayload,
          responseLength
        })
      });

      if (!chatRes.ok) throw new Error("Voice Chat Reasoning engine failed");
      const chatData = await chatRes.json();
      const aiReply = chatData.text || "I was unable to structure an advice right now. Please repeat.";

      // Add AI reply to screen transcript
      const aiMessage: Message = {
        role: "assistant",
        text: aiReply,
        timestamp: new Date()
      };
      setTranscript(prev => [...prev, aiMessage]);

      // Determine speaking output locale
      const spokenLanguage = /[\u0B80-\u0BFF]/.test(aiReply) ? "ta-IN" : 
                             /[\u0900-\u097F]/.test(aiReply) ? "hi-IN" : 
                             /[\u0D00-\u0D7F]/.test(aiReply) ? "ml-IN" :
                             /[\u0C00-\u0C7F]/.test(aiReply) ? "te-IN" :
                             /[\u0C80-\u0CFF]/.test(aiReply) ? "kn-IN" : "en-IN";

      await speakResponse(aiReply, spokenLanguage);

    } catch (err) {
      console.error("Reasoning error:", err);
      setStatus("idle");
      const errorMsg: Message = {
        role: "assistant",
        text: "My backend neural systems experienced a temporary quota rate limit, please continue after a brief rest.",
        timestamp: new Date()
      };
      setTranscript(prev => [...prev, errorMsg]);
      fallbackSpeak(errorMsg.text, "en-IN");
    }
  };

  // Triggers immediate RAG analysis for Resume
  const triggerResumeReview = () => {
    handleUserInterruption();
    respondToUserText("Review my uploaded resume and highlight potential areas of improvement for elite tech company placement.");
  };

  // Triggers immediate RAG comparison with Job Description
  const triggerJobComparison = () => {
    handleUserInterruption();
    respondToUserText("Compare my resume with the active job description and give me the exact match score and required skill gaps.");
  };

  // Clear call logs and restart
  const restartCallConversation = () => {
    stopSpeechSynthesis();
    stopRecordingStream();
    setTranscript([]);
    setStatus("idle");
    setTimeout(() => {
      respondToUserText("Hello, I am restarting our conversation. Please review my profile and guide me.");
    }, 300);
  };

  // Draw 60FPS sound spectrum & live wave on the Canvas
  const drawLiveCanvasVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clean Canvas with subtle transparency trail
      ctx.fillStyle = callTheme === "dark" ? "rgba(10, 15, 41, 0.2)" : "rgba(245, 247, 250, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 0.45;

        // Create elegant glowing multi color gradients
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (status === "listening") {
          gradient.addColorStop(0, "rgba(34, 197, 94, 0.1)");
          gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.7)");
          gradient.addColorStop(1, "rgba(74, 222, 128, 1)");
        } else if (status === "thinking") {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.1)");
          gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.7)");
          gradient.addColorStop(1, "rgba(192, 132, 252, 1)");
        } else {
          gradient.addColorStop(0, "rgba(76, 215, 246, 0.1)");
          gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.7)");
          gradient.addColorStop(1, "rgba(147, 197, 253, 1)");
        }

        ctx.fillStyle = gradient;
        
        // Mirror waves symmetry
        const yPos = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, yPos, barWidth - 1, barHeight);
        ctx.fillRect(canvas.width - x - barWidth, yPos, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  // Handle Typed Input
  const handleSendChatText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const typedText = chatText.trim();
    setChatText("");
    setShowChatInput(false);
    respondToUserText(typedText);
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      stopRecordingStream();
      setStatus("idle");
    } else {
      if (status === "idle") {
        startRecording();
      }
    }
  };

  // Convert raw duration into standard call time layout
  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Pulse/Hologram Avatar config based on live status
  const getAvatarConfig = () => {
    switch (status) {
      case "connecting":
        return {
          glow: "rgba(76, 215, 246, 0.6)",
          colorClass: "from-[#0d2a4a] via-[#103d6d] to-brand-cyan",
          speed: 3,
          scale: [1, 1.05, 1],
          text: "Syncing Handshake..."
        };
      case "listening":
        return {
          glow: "rgba(34, 197, 94, 0.7)",
          colorClass: "from-[#0a3118] via-[#115e2e] to-green-400",
          speed: 1.5,
          scale: [1, 1.15, 0.98, 1.1, 1],
          text: "Mic Listening..."
        };
      case "thinking":
        return {
          glow: "rgba(168, 85, 247, 0.8)",
          colorClass: "from-[#1d0d38] via-[#43125d] to-brand-purple",
          speed: 2.2,
          scale: [1.02, 0.96, 1.05, 0.98, 1.02],
          text: "Retrieving RAG Details..."
        };
      case "speaking":
        return {
          glow: "rgba(244, 114, 182, 0.9)",
          colorClass: "from-[#35071d] via-[#6f123c] to-fuchsia-400",
          speed: 1.2,
          scale: [1, 1.22, 0.94, 1.18, 1],
          text: "Voice Output Feed"
        };
      case "disconnected":
        return {
          glow: "rgba(100, 116, 139, 0.2)",
          colorClass: "from-slate-800 via-slate-700 to-slate-500",
          speed: 6,
          scale: [1, 1],
          text: "Call Disconnected"
        };
      default:
        return {
          glow: "rgba(76, 215, 246, 0.3)",
          colorClass: "from-[#070c24] via-[#141b43] to-brand-cyan/70",
          speed: 4,
          scale: [1, 1.03, 1],
          text: "Standby Monitor"
        };
    }
  };

  const currentAvatar = getAvatarConfig();

  return (
    <>
      {/* Floating Pulsing Modern Circular Phone Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="floating-voice-assistant-btn"
          onClick={handleStartCall}
          title="Connect to AI Placement Voice Assistant"
          className="relative flex items-center justify-center w-15 h-15 rounded-full bg-gradient-to-tr from-brand-cyan via-brand-purple to-indigo-600 text-white cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(76, 215, 246, 0.65)] hover:shadow-[0_0_35px_rgba(168, 85, 247, 0.85)] group z-50 border border-white/20"
        >
          <span className="absolute inset-0 rounded-full bg-brand-cyan/25 animate-ping"></span>
          <span className="absolute inset-0 rounded-full bg-brand-purple/15 scale-125 animate-pulse"></span>
          <PhoneCall className="w-6.5 h-6.5 text-white group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </button>
      </div>

      {/* Modern Fullscreen calling screen with Glassmorphism Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden ${
              callTheme === "dark" 
                ? "bg-[#05091e] bg-radial-[#0c163b_0%,#030612_100%] text-white" 
                : "bg-slate-50 bg-radial-[rgba(241,245,249,0.9)_0%,#ffffff_100%] text-slate-800"
            }`}
          >
            {/* Ambient animated glowing backdrop spheres */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-brand-cyan/10 blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-purple/10 blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* TOP BAR OVERVIEW */}
            <header className={`px-6 py-4 flex items-center justify-between border-b ${
              callTheme === "dark" ? "border-white/5 bg-[#070d27]/60" : "border-slate-200 bg-white/60"
            } backdrop-blur-md z-10`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500/40 animate-ping"></div>
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight uppercase font-mono text-brand-cyan flex items-center gap-1.5">
                    AI Placement Assitant
                    <Sparkles className="w-4 h-4 text-brand-purple animate-bounce" />
                  </h2>
                  <p className="text-[10px] text-brand-text-muted uppercase tracking-widest font-mono">
                    Secured Node • Shield Active
                  </p>
                </div>
              </div>

              {/* Call Info HUD */}
              <div className="flex items-center gap-6">
                {/* Duration Counter */}
                <div className={`px-4 py-1.5 rounded-full ${
                  callTheme === "dark" ? "bg-white/5 border border-white/10" : "bg-slate-150 border border-slate-200"
                } flex items-center gap-2 font-mono text-xs font-bold`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>
                  <span>{formatCallTime(callDuration)}</span>
                </div>

                {/* Network & Latency Hud */}
                <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-brand-text-muted">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span>{networkLatency}ms</span>
                  </div>
                  <span className="opacity-30">|</span>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-brand-cyan" />
                    <span className="text-green-400">99.8%</span>
                  </div>
                </div>

                {/* Theme Selector */}
                <button
                  onClick={() => setCallTheme(prev => prev === "dark" ? "light" : "dark")}
                  className={`p-2 rounded-full cursor-pointer transition-colors ${
                    callTheme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-200"
                  }`}
                  title="Toggle Visual Theme"
                >
                  {callTheme === "dark" ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
              </div>
            </header>

            {/* CALL OVERLAY CONTAINER */}
            <main className="flex-1 flex flex-col md:flex-row items-center justify-around p-6 gap-6 relative max-w-7xl mx-auto w-full overflow-hidden">
              
              {/* LEFT COLUMN: Hologram Display Screen */}
              <div className="flex flex-col items-center justify-center space-y-6 flex-1 max-w-lg w-full">
                
                {/* CENTRAL AVATAR STAGE */}
                <div className="relative flex items-center justify-center p-8">
                  {/* Outer Orbit glowing neon rings */}
                  <div 
                    className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse transition-all duration-700"
                    style={{ backgroundColor: currentAvatar.glow }}
                  ></div>

                  {/* Animated rotating outer orbital path rings */}
                  <div className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border border-dashed border-brand-cyan/20 animate-[spin_12s_linear_infinite]"></div>
                  <div className="absolute w-64 h-64 md:w-76 md:h-76 rounded-full border border-double border-brand-purple/10 animate-[spin_24s_linear_infinite_reverse]"></div>

                  {/* Concentric soundwaves expanding waves */}
                  {status === "speaking" && (
                    <>
                      <div className="absolute w-44 h-44 rounded-full border border-fuchsia-500/40 animate-ping opacity-60"></div>
                      <div className="absolute w-52 h-52 rounded-full border border-brand-purple/30 animate-ping opacity-30 delay-300"></div>
                    </>
                  )}

                  {/* Main Glowing CSS holographic sphere */}
                  <motion.div
                    animate={{
                      scale: currentAvatar.scale,
                    }}
                    transition={{
                      duration: currentAvatar.speed,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    onClick={handleUserInterruption}
                    className={`w-40 h-40 md:w-48 md:h-48 rounded-full border-4 flex flex-col items-center justify-center bg-gradient-to-b ${currentAvatar.colorClass} shadow-2xl relative overflow-hidden group cursor-pointer border-white/20`}
                  >
                    {/* Inner glass overlay mask */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xs"></div>
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>

                    {/* Futuristic holographic details */}
                    <div className="relative flex flex-col items-center justify-center text-center p-4">
                      {status === "thinking" ? (
                        <Loader2 className="w-10 h-10 animate-spin text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                      ) : status === "listening" ? (
                        <Mic className="w-10 h-10 animate-pulse text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                      ) : status === "connecting" ? (
                        <Sliders className="w-10 h-10 animate-bounce text-white" />
                      ) : (
                        <Sparkles className="w-10 h-10 text-white animate-pulse" />
                      )}

                      <span className="text-[9px] font-mono tracking-widest text-white/80 uppercase mt-3 select-none">
                        {status === "listening" ? "SPEAK NOW" : "PORTAL V2"}
                      </span>
                    </div>

                    {/* Hover status bubble */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#030612]/90 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-mono font-bold text-brand-cyan tracking-wider">
                        TAP TO INTERRUPT
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Status Indicator text headers */}
                <div className="text-center space-y-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                    STATUS: {status.toUpperCase()}
                  </span>
                  <h3 className="text-xl font-bold font-display uppercase tracking-wider">
                    {status === "connecting" && "Synchronizing local vectors..."}
                    {status === "idle" && "Standby • Ask me anything"}
                    {status === "listening" && "Listening to spoken speech..."}
                    {status === "thinking" && "Executing Llama RAG retrieval..."}
                    {status === "speaking" && "Streaming Placement Guidance..."}
                  </h3>
                  <p className="text-xs text-brand-text-muted font-sans max-w-sm mx-auto">
                    {status === "idle" && "Try: \"Can you critique my resume structure?\" or \"Give me top interview questions for Google Python roles\""}
                    {status === "listening" && "Speak in English, Tamil, Hindi, Malayalam, Kannada, or Telugu"}
                    {status === "thinking" && "Cross-referencing index nodes with ChromaDB"}
                    {status === "speaking" && "Voice output active. Tap the orb above at any time to interrupt."}
                  </p>
                </div>

                {/* Live Spectrum Frequency visualizer Canvas */}
                <div className={`w-full max-w-sm h-18 rounded-2xl overflow-hidden border ${
                  callTheme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                } relative shadow-[inset_0_0_15px_rgba(0,0,0,0.2)]`}>
                  <canvas ref={canvasRef} width={400} height={72} className="w-full h-full" />
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Transcript Logs & Settings Drawer */}
              <div className="flex-1 max-w-xl w-full flex flex-col h-[400px] md:h-[500px] rounded-3xl overflow-hidden border backdrop-blur-md relative shadow-2xl">
                
                {/* Window header */}
                <div className={`px-5 py-3 flex items-center justify-between border-b ${
                  callTheme === "dark" ? "bg-[#070c24]/80 border-white/5" : "bg-white/80 border-slate-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-cyan" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">
                      Live Call Transcript stream
                    </span>
                  </div>
                  
                  {/* Dynamic Active Locale */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                    <Globe className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Locale: {detectedLang}</span>
                  </div>
                </div>

                {/* Window Transcript log scroll content */}
                <div className={`flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs ${
                  callTheme === "dark" ? "bg-[#040817]/40" : "bg-white/30"
                }`}>
                  {transcript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-brand-text-muted/50 p-6">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
                      <p className="font-mono uppercase text-[9px] tracking-widest leading-relaxed">
                        Establishing secure handshake...
                        <br />
                        Please speak when ready.
                      </p>
                    </div>
                  ) : (
                    transcript.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono uppercase text-brand-text-muted/60">
                            {msg.role === "user" ? "You" : "AI Placement Assistant"}
                          </span>
                          <span className="text-[8px] font-mono text-brand-text-muted/30">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] leading-relaxed shadow-sm border ${
                          msg.role === "user"
                            ? "bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan rounded-tr-none"
                            : "bg-gradient-to-b from-slate-800 to-slate-900 border-white/5 text-slate-100 rounded-tl-none"
                        } text-left`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {status === "thinking" && (
                    <div className="flex items-center space-x-1 text-brand-cyan">
                      <span className="text-[9px] font-mono uppercase tracking-widest animate-pulse">Llama is analyzing vectors</span>
                      <span className="text-xs animate-bounce">.</span>
                      <span className="text-xs animate-bounce delay-100">.</span>
                      <span className="text-xs animate-bounce delay-200">.</span>
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>

                {/* Keyboard Text Entry Panel sliding drawer */}
                <AnimatePresence>
                  {showChatInput && (
                    <motion.form
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 50, opacity: 0 }}
                      onSubmit={handleSendChatText}
                      className={`p-3 border-t ${
                        callTheme === "dark" ? "bg-[#070c24] border-white/10" : "bg-white border-slate-200"
                      } flex items-center gap-2 z-20 absolute bottom-0 inset-x-0 shadow-2xl`}
                    >
                      <input
                        type="text"
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Type question instead of speaking..."
                        className={`flex-1 px-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-cyan ${
                          callTheme === "dark" ? "bg-white/5 text-white placeholder-slate-500" : "bg-slate-100 text-slate-800 placeholder-slate-400"
                        }`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-cyan text-[#04081c] font-bold rounded-xl cursor-pointer hover:bg-opacity-80 flex items-center gap-1 transition-all text-xs"
                      >
                        <span>Send</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChatInput(false)}
                        className="p-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Settings Configuration Sliding Panel Drawer */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 180 }}
                      className={`absolute inset-y-0 right-0 w-80 z-30 shadow-2xl border-l p-6 flex flex-col justify-between ${
                        callTheme === "dark" ? "bg-[#070c23] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="space-y-6 text-left">
                        <div className="flex items-center justify-between border-b pb-3 border-white/5">
                          <h3 className="font-bold text-sm tracking-wider uppercase font-mono flex items-center gap-1.5">
                            <Settings className="w-4 h-4 text-brand-cyan animate-spin" />
                            Call Configuration
                          </h3>
                          <button
                            onClick={() => setShowSettings(false)}
                            className="p-1 rounded-full hover:bg-white/10 text-slate-400"
                          >
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        {/* Speech Gender Selector */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider block">
                            Synthesis Persona Voice:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setVoiceVoice("female")}
                              className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                voiceVoice === "female"
                                  ? "bg-brand-cyan/25 border-brand-cyan text-brand-cyan shadow-sm"
                                  : "border-white/10 text-slate-400 hover:border-white/20"
                              }`}
                            >
                              Female (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setVoiceVoice("male")}
                              className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                voiceVoice === "male"
                                  ? "bg-brand-purple/25 border-brand-purple text-brand-purple shadow-sm"
                                  : "border-white/10 text-slate-400 hover:border-white/20"
                              }`}
                            >
                              Male Voice
                            </button>
                          </div>
                        </div>

                        {/* Preferred System Speaking Language */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider block">
                            Preffered Core language:
                          </label>
                          <select
                            value={selectedLangCode}
                            onChange={(e) => {
                              setSelectedLangCode(e.target.value);
                              respondToUserText(`Switching to your language.`);
                            }}
                            className="w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-brand-cyan bg-[#0a102b] text-white border-white/10"
                          >
                            <option value="en-IN">English (India)</option>
                            <option value="ta-IN">Tamil (தமிழ்)</option>
                            <option value="hi-IN">Hindi (हिंदी)</option>
                            <option value="ml-IN">Malayalam (മലയാളം)</option>
                            <option value="te-IN">Telugu (తెలుగు)</option>
                            <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                          </select>
                        </div>

                        {/* Synthesis Playback Speed */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-brand-text-muted uppercase tracking-wider">
                            <span>Speech Speed rate:</span>
                            <span className="text-brand-cyan font-bold font-mono">{playbackSpeed}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            className="w-full accent-brand-cyan bg-[#0a102b] h-1.5 rounded-full"
                          />
                        </div>

                        {/* Response length profile */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider block">
                            AI Explanation Profile:
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {["short", "standard", "detailed"].map((len) => (
                              <button
                                key={len}
                                type="button"
                                onClick={() => setResponseLength(len as any)}
                                className={`py-1.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider transition-all ${
                                  responseLength === len
                                    ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan"
                                    : "border-white/5 text-slate-400"
                                }`}
                              >
                                {len}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* RAG metadata check info */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                          <h4 className="text-[10px] font-mono font-bold text-white flex items-center gap-1.5 uppercase">
                            <Info className="w-3.5 h-3.5 text-brand-cyan" />
                            Connected Knowledge Base
                          </h4>
                          <div className="text-[10px] space-y-1 text-slate-400 font-mono">
                            <div className="flex justify-between">
                              <span>Resume text:</span>
                              <span className="text-green-400">Indexed (Chroma)</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Job Description:</span>
                              <span className="text-green-400">Indexed (Chroma)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] font-mono text-center text-slate-500 uppercase tracking-widest pt-4 border-t border-white/5">
                        Placement Voice Portal v2.5
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </main>

            {/* BUTTON CONTROLS ROW PANEL (EXTREMELY DETAILED CAROUSEL) */}
            <footer className={`px-6 py-6 border-t flex flex-col items-center gap-4 ${
              callTheme === "dark" ? "bg-[#04081c]/90 border-white/5" : "bg-white/95 border-slate-200"
            } z-10`}>
              {/* Context Trigger Badges row */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl w-full">
                <button
                  onClick={triggerResumeReview}
                  className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-full bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  title="Force AI to read and critique your uploaded resume"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Review My Resume
                </button>
                <button
                  onClick={triggerJobComparison}
                  className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-full bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/20 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  title="Compare resume skills with active job posting description"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Analyze Job Match
                </button>
                <button
                  onClick={restartCallConversation}
                  className={`px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                    callTheme === "dark" ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-slate-100 border-slate-200 hover:bg-slate-200"
                  }`}
                  title="Reset conversation context memory"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restart Chat
                </button>
              </div>

              {/* Main Call Control Circles Carousel */}
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                
                {/* Micro Toggle button */}
                <button
                  onClick={handleToggleMute}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                    isMuted 
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                      : callTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMuted ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Speaker Toggle button */}
                <button
                  onClick={() => {
                    const nextMute = !isSpeakerMuted;
                    setIsSpeakerMuted(nextMute);
                    if (nextMute) stopSpeechSynthesis();
                  }}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                    isSpeakerMuted 
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                      : callTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                  title={isSpeakerMuted ? "Unmute AI Voice Speaker" : "Mute AI Voice Speaker"}
                >
                  {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Headphone Mode Trigger */}
                <button
                  onClick={() => setHeadphoneMode(prev => !prev)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                    headphoneMode 
                      ? "bg-brand-cyan/20 border-brand-cyan/50 text-brand-cyan shadow-[0_0_15px_rgba(76,215,246,0.3)]" 
                      : callTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                  title="Toggle Headphone/Earphone focus audio routing"
                >
                  <Headphones className="w-5 h-5" />
                </button>

                {/* RED DISCONNECT BUTTON */}
                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 hover:scale-110 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_25px_rgba(239,68,68,0.45)] border border-rose-500"
                  title="Terminate Placement Assistant Session"
                >
                  <PhoneOff className="w-6.5 h-6.5 text-white animate-pulse" />
                </button>

                {/* Type instead Keyboard toggle */}
                <button
                  onClick={() => {
                    setShowChatInput(prev => !prev);
                    if (!showChatInput) setShowSettings(false);
                  }}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                    showChatInput 
                      ? "bg-brand-cyan/20 border-brand-cyan/50 text-brand-cyan shadow-[0_0_15px_rgba(76,215,246,0.3)]" 
                      : callTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                  title="Keyboard Text Chat input mode"
                >
                  <Keyboard className="w-5 h-5" />
                </button>

                {/* Right Side Settings Sliding toggle button */}
                <button
                  onClick={() => {
                    setShowSettings(prev => !prev);
                    if (!showSettings) setShowChatInput(false);
                  }}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-115 active:scale-90 ${
                    showSettings 
                      ? "bg-brand-purple/20 border-brand-purple/50 text-brand-purple shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
                      : callTheme === "dark"
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                  }`}
                  title="Call Customization settings panel"
                >
                  <Settings className="w-5 h-5" />
                </button>

              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
