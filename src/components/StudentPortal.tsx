import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileUp, BookOpen, AlertCircle, RefreshCw, Check, Loader2, Sparkles, Award, 
  Clipboard, ArrowRight, LayoutDashboard, FileText, Briefcase, TrendingUp, 
  ExternalLink, CheckCircle2, Search, Filter, BookMarked, UserCheck, Zap, 
  ShieldCheck, ArrowUpRight, ChevronRight, PlayCircle
} from "lucide-react";
import { JobPosting, CandidateProfile, AIEvaluation } from "../types";
import { getScoreColorAndGlow } from "./EvaluationModal";

const safeJson = async (res: Response): Promise<any> => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response:", text);
    throw new Error(`Server returned an invalid response structure. Details: ${text.slice(0, 100)}...`);
  }
};

interface StudentPortalProps {
  jobs: JobPosting[];
  onAddEvaluation: (candidate: CandidateProfile, evaluation: AIEvaluation) => void;
  onNavigateHome: () => void;
  studentProfile?: any;
  onLogout?: () => void;
}

export default function StudentPortal({ jobs, onAddEvaluation, onNavigateHome, studentProfile, onLogout }: StudentPortalProps) {
  // Navigation sub-tabs: 4 pages
  const [activeTab, setActiveTab] = useState<"dashboard" | "analyzer" | "jobs" | "skills">("dashboard");

  // Selection & Form States
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || "");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [emailInput, setEmailInput] = useState(studentProfile?.email || "");
  const [phoneInput, setPhoneInput] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Applied jobs tracking
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);

  // Skill Growth Mastered Checkboxes
  const [masteredSkills, setMasteredSkills] = useState<string[]>(["Git", "JavaScript"]);

  // Synchronize emailInput when studentProfile loads
  useEffect(() => {
    if (studentProfile?.email) {
      setEmailInput(studentProfile.email);
    }
  }, [studentProfile]);

  const [statusStep, setStatusStep] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Completed results states (for displaying immediate student feedback)
  const [completedEvaluation, setCompletedEvaluation] = useState<AIEvaluation | null>(null);
  const [completedCandidate, setCompletedCandidate] = useState<CandidateProfile | null>(null);

  // Job Search & Filters
  const [jobSearch, setJobSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setErrorMessage("Please upload a PDF document (.pdf) only.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setErrorMessage("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("Failed to read file as base64 string"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Helper function to handle the full extraction and Gemini integration
  const handleProcessResume = async () => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
    const targetJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

    if (!targetJob) {
      setErrorMessage("Please select an active internship opening first.");
      return;
    }
    if (!showManualInput && !file) {
      setErrorMessage("Please upload a PDF resume or paste your resume text manually.");
      return;
    }
    if (showManualInput && !manualText.trim()) {
      setErrorMessage("Please upload a PDF resume or paste your resume text below.");
      return;
    }
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setErrorMessage("Please enter a valid email address for application tracking.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setStatusStep(1); // Step 1: Reading Resume

    try {
      let parsedProfile: any = null;

      if (!showManualInput && file) {
        const base64PdfString = await toBase64(file);

        setStatusStep(2); // Step 2: Running OCR
        const ocrResponse = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64PdfString, filename: file.name })
        });

        if (!ocrResponse.ok) {
          const errJson = await safeJson(ocrResponse).catch(() => ({}));
          throw new Error(errJson.error || "Could not extract text from this PDF resume. Please try again.");
        }

        const ocrData = await safeJson(ocrResponse);
        const extractedText = ocrData.text || "";
        
        localStorage.setItem("smartscreen_uploaded_resume_text", extractedText);
        localStorage.setItem("smartscreen_uploaded_resume_filename", file.name);

        const parseResponse = await fetch("/api/parse-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: extractedText })
        });

        if (!parseResponse.ok) {
          const errJson = await safeJson(parseResponse).catch(() => ({}));
          throw new Error(errJson.error || "Failed to structure resume content through Gemini API.");
        }

        parsedProfile = await safeJson(parseResponse);
      } else {
        const extractedText = manualText.trim().replace(/\s+/g, " ");
        
        localStorage.setItem("smartscreen_uploaded_resume_text", extractedText);
        localStorage.setItem("smartscreen_uploaded_resume_filename", "Pasted Resume");

        setStatusStep(2);
        const parseResponse = await fetch("/api/parse-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: extractedText })
        });

        if (!parseResponse.ok) {
          const errJson = await safeJson(parseResponse).catch(() => ({}));
          throw new Error(errJson.error || "Failed to structure resume content through Gemini API.");
        }

        parsedProfile = await safeJson(parseResponse);
      }

      setStatusStep(3);

      const candidateProfile: CandidateProfile = {
        id: "cand-" + Date.now(),
        name: studentProfile?.name || parsedProfile.name || "Unknown Candidate",
        email: emailInput.trim(),
        phone: phoneInput.trim() || undefined,
        education: parsedProfile.education || "Extracted from Resume",
        cgpa: parsedProfile.cgpa !== undefined && parsedProfile.cgpa !== null ? parseFloat(parsedProfile.cgpa.toString()) || null : null,
        skills: parsedProfile.skills || [],
        projects: parsedProfile.projects || [],
        experience: parsedProfile.experience || "No experience summary",
        resumeText: !showManualInput && file ? `Natively Parsed PDF: ${studentProfile?.name || parsedProfile.name || "Candidate"}` : manualText
      };

      const scoreResponse = await fetch("/api/score-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: candidateProfile,
          job: targetJob
        })
      });

      if (!scoreResponse.ok) {
        const errJson = await safeJson(scoreResponse).catch(() => ({}));
        throw new Error(errJson.error || "Failed to execute screening scoring against the requirements.");
      }

      const scoringResult = await safeJson(scoreResponse);

      setStatusStep(4);

      const aiEvaluation: AIEvaluation = {
        candidateId: candidateProfile.id,
        jobId: targetJob.id,
        matchScore: scoringResult.matchScore,
        matchedSkills: scoringResult.matchedSkills,
        missingSkills: scoringResult.missingSkills,
        verdict: scoringResult.verdict,
        reasoning: scoringResult.reasoning,
        manualOverrideVerdict: null,
        manualNotes: null,
        evaluatedAt: new Date().toISOString()
      };

      onAddEvaluation(candidateProfile, aiEvaluation);
      
      setCompletedCandidate(candidateProfile);
      setCompletedEvaluation(aiEvaluation);
      if (!appliedJobIds.includes(targetJob.id)) {
        setAppliedJobIds(prev => [...prev, targetJob.id]);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during resume processing.");
    } finally {
      setIsProcessing(false);
      setStatusStep(0);
    }
  };

  const handleResetForm = () => {
    setFile(null);
    setManualText("");
    setCompletedCandidate(null);
    setCompletedEvaluation(null);
    setErrorMessage("");
  };

  const handleApplyToJob = (jobId: string) => {
    if (!appliedJobIds.includes(jobId)) {
      setAppliedJobIds(prev => [...prev, jobId]);
    }
  };

  const toggleMasteredSkill = (skillName: string) => {
    setMasteredSkills(prev => 
      prev.includes(skillName) ? prev.filter(s => s !== skillName) : [...prev, skillName]
    );
  };

  // SVG Circular progress ring calculation
  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  // Student Profile Completion calculation
  const profileCompletion = Math.min(100, Math.round(
    (studentProfile?.name ? 25 : 15) +
    (emailInput ? 20 : 0) +
    (file || completedCandidate ? 35 : 10) +
    (masteredSkills.length * 5)
  ));

  // Curated Learning Resources for Skill Growth Tracker
  const learningResources = [
    {
      skill: "React & Modern Hooks",
      category: "Frontend",
      provider: "Official React Docs & FreeCodeCamp",
      level: "Intermediate",
      duration: "6 Hours",
      url: "https://react.dev/learn",
      desc: "Master component state, custom hooks, context, and performance optimization patterns."
    },
    {
      skill: "TypeScript for Enterprise Applications",
      category: "Frontend",
      provider: "TypeScript Handbook",
      level: "Advanced",
      duration: "4 Hours",
      url: "https://www.typescriptlang.org/docs/",
      desc: "Generics, utility types, type guards, and strict type checking setups."
    },
    {
      skill: "Node.js REST APIs & Express",
      category: "Backend",
      provider: "Mozilla MDN & Node.js Docs",
      level: "Beginner - Intermediate",
      duration: "8 Hours",
      url: "https://nodejs.org/en/docs/guides",
      desc: "Build scalable HTTP servers, middleware pipelines, JWT auth, and database connectors."
    },
    {
      skill: "Docker & Container Architecture",
      category: "Cloud & DevOps",
      provider: "Docker Docs & YouTube Academy",
      level: "Intermediate",
      duration: "5 Hours",
      url: "https://docs.docker.com/get-started/",
      desc: "Containerize web apps, multi-stage Dockerfiles, Docker Compose networking."
    },
    {
      skill: "System Design & Microservices",
      category: "System Design",
      provider: "GitHub System Design Primer",
      level: "Advanced",
      duration: "10 Hours",
      url: "https://github.com/donnemartin/system-design-primer",
      desc: "Load balancing, caching, database sharding, message queues, and API gateways."
    },
    {
      skill: "Python & Machine Learning Foundations",
      category: "AI & Data Science",
      provider: "Kaggle & Scikit-Learn Docs",
      level: "Intermediate",
      duration: "12 Hours",
      url: "https://www.kaggle.com/learn",
      desc: "Data manipulation with Pandas, NumPy vectorization, and baseline predictive models."
    }
  ];

  // Filtered jobs list
  const filteredJobs = jobs.filter(j => {
    const textMatch = j.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
                      j.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
                      j.requiredSkills.some(s => s.toLowerCase().includes(jobSearch.toLowerCase()));
    const deptMatch = deptFilter === "all" || (j.department && j.department.toLowerCase() === deptFilter.toLowerCase());
    return textMatch && deptMatch;
  });

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 md:px-4 text-brand-text space-y-6">
      
      {/* 1. Header & Main Portal Sub-Navigation Tabs */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-purple/20 border border-brand-purple/40">
              <Zap className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-2">
                Student Placement Portal
              </h2>
              <p className="text-xs text-brand-text-muted font-mono uppercase tracking-wider">
                {studentProfile?.name ? `Logged in as ${studentProfile.name}` : "Candidate Workspace"} &bull; Career Accelerator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={onNavigateHome}
              className="btn-premium py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Main
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="py-2 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white"
              >
                Log Out
              </button>
            )}
          </div>
        </div>

        {/* 4 Distinct Sub-Navigation Pages/Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-1.5 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-brand-cyan text-slate-950 font-extrabold shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analyzer")}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "analyzer"
                ? "bg-brand-purple text-white font-extrabold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Analyzer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "jobs"
                ? "bg-brand-accent text-slate-950 font-extrabold shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>3. Job Board</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "skills"
                ? "bg-emerald-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>4. Skill Tracker</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* PAGE 1: HOME / DASHBOARD */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Welcome Banner */}
            <div className="p-6 md:p-8 rounded-2xl glass-panel border border-white/10 relative overflow-hidden bg-gradient-to-r from-brand-cyan/10 via-slate-900 to-brand-purple/10">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan">
                    Campus Candidate Hub
                  </span>
                  <h3 className="font-display text-3xl font-bold text-white tracking-tight">
                    Welcome back, {studentProfile?.name || "Student"}! 👋
                  </h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed font-sans">
                    Your placement profile is synchronized with the campus recruitment network. Upload your latest PDF resume to run Gemini AI compliance diagnostics and discover job matches.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("analyzer")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-500 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upload Resume & Analyze</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl glass-panel border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-brand-text-muted mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Resumes Uploaded</span>
                  <FileText className="w-4 h-4 text-brand-cyan" />
                </div>
                <span className="font-display text-3xl font-bold text-white">
                  {completedCandidate ? "01" : "00"}
                </span>
                <span className="text-[10px] text-brand-cyan font-mono mt-1">PDF Vectorized</span>
              </div>

              <div className="p-4 rounded-xl glass-panel border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-brand-text-muted mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Jobs Matched</span>
                  <Briefcase className="w-4 h-4 text-brand-purple" />
                </div>
                <span className="font-display text-3xl font-bold text-white">
                  {jobs.length}
                </span>
                <span className="text-[10px] text-brand-purple font-mono mt-1">Active Drives</span>
              </div>

              <div className="p-4 rounded-xl glass-panel border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-brand-text-muted mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Profile Completion</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="font-display text-3xl font-bold text-emerald-400">
                  {profileCompletion}%
                </span>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl glass-panel border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-brand-text-muted mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Avg Eligibility</span>
                  <Zap className="w-4 h-4 text-brand-accent" />
                </div>
                <span className="font-display text-3xl font-bold text-brand-accent">
                  {completedEvaluation ? `${completedEvaluation.matchScore}%` : "88%"}
                </span>
                <span className="text-[10px] text-brand-accent font-mono mt-1">AI Evaluated</span>
              </div>
            </div>

            {/* Quick Portal Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveTab("analyzer")}
                className="p-5 rounded-2xl glass-panel border border-white/10 hover:border-brand-purple/60 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="p-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/30 w-fit mb-3 group-hover:scale-110 transition-transform">
                  <FileUp className="w-5 h-5 text-brand-purple" />
                </div>
                <h4 className="font-display font-bold text-base text-white">Resume Analyzer</h4>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Extract PDF skills via Gemini OCR and get a detailed ATS compatibility score.
                </p>
                <span className="mt-4 text-xs font-mono font-bold text-brand-purple flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Launch Analyzer &rarr;
                </span>
              </div>

              <div 
                onClick={() => setActiveTab("jobs")}
                className="p-5 rounded-2xl glass-panel border border-white/10 hover:border-brand-cyan/60 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 w-fit mb-3 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5 text-brand-cyan" />
                </div>
                <h4 className="font-display font-bold text-base text-white">Job Board & Eligibility</h4>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Browse open placements, view per-job match percentages, and apply in 1-click.
                </p>
                <span className="mt-4 text-xs font-mono font-bold text-brand-cyan flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Browse Open Roles &rarr;
                </span>
              </div>

              <div 
                onClick={() => setActiveTab("skills")}
                className="p-5 rounded-2xl glass-panel border border-white/10 hover:border-emerald-400/60 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 w-fit mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="font-display font-bold text-base text-white">Skill Growth Tracker</h4>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Access tailored learning recommendations and free courses to bridge skill gaps.
                </p>
                <span className="mt-4 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Skill Plan &rarr;
                </span>
              </div>
            </div>

            {/* Recent Evaluation Overview */}
            {completedEvaluation && completedCandidate && (
              <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="editorial-label text-brand-cyan">[ Latest AI Resume Assessment ]</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Evaluated
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-display font-bold text-lg text-white">{completedCandidate.name}</h4>
                    <p className="text-xs text-brand-text-muted font-mono mt-0.5">
                      Target Role: <span className="text-brand-cyan font-bold">{currentJob?.title}</span> ({currentJob?.company})
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-center">
                    <span className="text-[10px] text-brand-text-muted uppercase font-mono block">Match Score</span>
                    <span className="font-display text-2xl font-bold text-brand-cyan">{completedEvaluation.matchScore}%</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* PAGE 2: RESUME ANALYZER */}
        {activeTab === "analyzer" && (
          <motion.div
            key="analyzer-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Loading/Processing State */}
            {isProcessing && (
              <div className="glass-panel p-12 text-center flex flex-col items-center justify-center space-y-8 rounded-2xl">
                <div className="relative flex items-center justify-center w-32 h-32 border border-white/10 rounded-2xl bg-brand-bg/60 shadow-[0_0_25px_rgba(76,215,246,0.15)]">
                  <div className="absolute w-20 h-20 border border-dashed border-brand-cyan rounded-xl animate-[spin_6s_linear_infinite]" />
                  <div className="absolute w-12 h-12 border border-white/10 bg-brand-bg/80 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-5 h-5 text-brand-cyan animate-spin stroke-[2]" />
                  </div>
                </div>

                <div className="max-w-md">
                  <h3 className="text-xl font-bold text-white mb-1 font-display">Analyzing Resume via Gemini 3.6 AI</h3>
                  <p className="text-xs text-brand-text-muted mb-6 font-mono tracking-wider">PARSING PDF TEXT &amp; COMPUTING COMPLIANCE</p>

                  <div className="space-y-3 max-w-xs mx-auto text-left">
                    {[
                      { id: 1, label: !showManualInput && file ? "Reading PDF resume..." : "Reading pasted text..." },
                      { id: 2, label: "Structuring skills via Gemini API..." },
                      { id: 3, label: "Calculating match score & gap report..." },
                      { id: 4, label: "Saving analytical candidate profile..." }
                    ].map(step => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold border ${
                          statusStep > step.id
                            ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan"
                            : statusStep === step.id
                              ? "bg-brand-cyan border-brand-cyan text-brand-bg animate-pulse"
                              : "bg-white/5 border-white/10 text-brand-text-muted/40"
                        }`}>
                          {statusStep > step.id ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                        </div>
                        <span className={`text-[11px] font-mono uppercase tracking-wider ${
                          statusStep === step.id ? "text-brand-cyan font-bold" : statusStep > step.id ? "text-brand-text-muted font-medium" : "text-brand-text-muted/40"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Completed Evaluation Results Display */}
            {!isProcessing && completedEvaluation && completedCandidate && (
              <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-white/5">
                  <div className="text-center md:text-left space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full font-mono">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Resume Analysis Complete
                    </div>
                    <h3 className="text-3xl font-bold text-white mt-2 font-display tracking-tight">{completedCandidate.name}</h3>
                    <p className="text-xs text-brand-text-muted font-mono uppercase tracking-widest">
                      Analyzed against: <span className="text-brand-cyan font-bold">{currentJob?.title}</span> at {currentJob?.company}
                    </p>
                  </div>

                  {/* Circular Score Ring */}
                  <div className="flex items-center gap-4 bg-brand-bg/50 p-4 border border-white/5 transition-all rounded-xl shadow-md">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r={radius} stroke="rgba(255, 255, 255, 0.05)" strokeWidth="5" fill="transparent" />
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          stroke="#4cd7f6"
                          strokeWidth="5"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - (completedEvaluation.matchScore / 100) * circumference}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold font-mono text-white">{completedEvaluation.matchScore}%</span>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-brand-text-muted font-bold tracking-widest font-mono">ATS Compatibility</div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-white uppercase font-mono mt-1">
                        <span className={`h-2.5 w-2.5 rounded-full inline-block ${completedEvaluation.verdict === "Shortlisted" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"}`} />
                        {completedEvaluation.verdict === "Shortlisted" ? "Eligible for Interview" : "Skill Gap Detected"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Diagnostic Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-brand-text">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted font-mono mb-2">AI Assessment Reasoning</h4>
                      <p className="text-sm text-brand-text bg-white/5 p-4 border border-white/5 leading-[1.7] italic rounded-xl font-sans">
                        "{completedEvaluation.reasoning}"
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted font-mono mb-2">Matched vs Missing Skills</h4>
                      <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                        <div className="bg-emerald-500/5 p-3 border border-emerald-500/10 rounded-xl">
                          <span className="text-emerald-400 font-bold block mb-1.5 tracking-wider">✓ MATCHED ({completedEvaluation.matchedSkills.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {completedEvaluation.matchedSkills.map((s, i) => (
                              <span key={i} className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-300 text-[9px] font-bold uppercase rounded-md">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-rose-500/5 p-3 border border-rose-500/10 rounded-xl">
                          <span className="text-rose-400 font-bold block mb-1.5 tracking-wider">× MISSING ({completedEvaluation.missingSkills.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {completedEvaluation.missingSkills.map((s, i) => (
                              <span key={i} className="bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-rose-300 text-[9px] font-bold uppercase rounded-md">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-brand-bg/50 p-4 border border-white/5 flex flex-col justify-between rounded-xl font-mono text-xs">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-text-muted mb-3">Extracted Profile Audit</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-brand-text-muted text-[9px] uppercase tracking-wider block font-bold">Education:</span>
                          <span className="text-white font-bold block mt-0.5">{completedCandidate.education}</span>
                        </div>
                        <div>
                          <span className="text-brand-text-muted text-[9px] uppercase tracking-wider block font-bold">CGPA / GPA:</span>
                          <span className="text-brand-cyan font-bold text-sm block mt-0.5">
                            {completedCandidate.cgpa !== null ? completedCandidate.cgpa.toFixed(2) : "Not Specified"} / 10.0
                          </span>
                        </div>
                        <div>
                          <span className="text-brand-text-muted text-[9px] uppercase tracking-wider block font-bold">Extracted Tech Stack:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {completedCandidate.skills.map((s, i) => (
                              <span key={i} className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white border border-white/10">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-brand-purple/10 p-3.5 text-[10px] text-brand-text-muted border border-brand-purple/20 leading-relaxed font-mono uppercase tracking-wider rounded-lg shadow-sm">
                      💡 **Tip**: Switch to the "Skill Tracker" tab to get direct free learning courses for missing skills!
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/5 justify-end">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 font-mono cursor-pointer uppercase tracking-wider"
                  >
                    <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" /> Re-analyze Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("skills")}
                    className="btn-premium font-bold text-xs px-6 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 font-mono cursor-pointer uppercase tracking-wider"
                  >
                    View Skill Growth Plan &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Input Form for Resume Upload */}
            {!isProcessing && !completedEvaluation && (
              <div className="glass-panel p-6 md:p-8 space-y-6 rounded-2xl border-white/10 shadow-xl">
                
                {/* 1. Target Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5 font-mono">
                    <BookOpen className="w-4 h-4 text-brand-cyan" />
                    1. Select Role Requirement to Compare Against <span className="text-brand-cyan">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {jobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-4 rounded-xl cursor-pointer border transition-all text-left flex flex-col justify-between select-none ${
                          selectedJobId === job.id
                            ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                            : "bg-white/5 border-white/10 text-brand-text-muted hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div>
                          <span className="text-[9px] font-mono uppercase bg-brand-purple/20 border border-white/5 px-2 py-0.5 rounded-full text-brand-purple-light font-bold tracking-wider">
                            {job.company}
                          </span>
                          <h4 className="font-bold text-sm text-white mt-3 leading-snug uppercase tracking-wide font-mono">{job.title}</h4>
                        </div>
                        <div className="mt-3 flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2 text-brand-text-muted/60">
                          <span>Cutoff: <span className="font-bold text-white">{job.cgpaCutoff} CGPA</span></span>
                          <span className="font-bold text-brand-cyan">{job.requiredSkills.length} SKILLS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Personal Detail Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2 font-mono">
                      Your Email Address <span className="text-brand-cyan">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. student@university.edu"
                      className="w-full glass-input px-4 py-2.5 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-widest mb-2 font-mono">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full glass-input px-4 py-2.5 rounded-lg"
                    />
                  </div>
                </div>

                {/* 3. Upload or Paste Selection Tabs */}
                <div>
                  <div className="flex border-b border-white/5 mb-4">
                    <button
                      type="button"
                      onClick={() => { setShowManualInput(false); setErrorMessage(""); }}
                      className={`pb-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 font-mono ${
                        !showManualInput ? "border-brand-cyan text-brand-cyan" : "border-transparent text-brand-text-muted hover:text-white"
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5" /> Upload PDF Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowManualInput(true); setErrorMessage(""); }}
                      className={`pb-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 font-mono ${
                        showManualInput ? "border-brand-cyan text-brand-cyan" : "border-transparent text-brand-text-muted hover:text-white"
                      }`}
                    >
                      <Clipboard className="w-3.5 h-3.5" /> Paste Text
                    </button>
                  </div>

                  {!showManualInput ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                        dragActive ? "border-brand-cyan bg-brand-cyan/10" : file ? "border-emerald-400/50 bg-emerald-500/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <FileUp className={`w-8 h-8 ${file ? "text-emerald-400" : "text-brand-cyan"}`} />
                      {file ? (
                        <div>
                          <p className="text-sm font-bold text-white font-mono">{file.name}</p>
                          <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Ready for Gemini OCR Extraction ({(file.size / 1024).toFixed(1)} KB)</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-white font-mono">Drop PDF resume here or click to browse</p>
                          <p className="text-[10px] text-brand-text-muted font-mono mt-1">Supports standard PDF formats up to 10MB</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={6}
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Paste full resume text here (Skills, Projects, Education, Experience)..."
                        className="w-full glass-input p-4 rounded-xl text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProcessResume}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-cyan via-blue-500 to-brand-purple text-slate-950 font-bold font-mono text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Gemini AI Resume Analysis</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* PAGE 3: JOB BOARD & ELIGIBILITY CHECKER */}
        {activeTab === "jobs" && (
          <motion.div
            key="jobs-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Search & Filter Header */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white font-display">Campus Placement Drives</h3>
                  <p className="text-xs text-brand-text-muted font-mono">
                    Explore active recruitment openings and check your automated eligibility score.
                  </p>
                </div>

                {/* Department Filter Pills */}
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {["all", "Engineering", "Software", "Cloud", "Data Science"].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setDeptFilter(dept)}
                      className={`px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer border transition-all ${
                        deptFilter === dept
                          ? "bg-brand-cyan text-slate-950 font-bold border-brand-cyan"
                          : "bg-white/5 text-brand-text-muted border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Search job title, company, or required skill (e.g. React, Python)..."
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Jobs Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => {
                const isApplied = appliedJobIds.includes(job.id);
                const isTargetSelected = selectedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-brand-cyan/50 transition-all flex flex-col justify-between space-y-4 relative"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                          {job.company}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                          {job.stipend || "Competitive Package"}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-lg text-white mt-3">{job.title}</h4>
                      <p className="text-xs text-brand-text-muted mt-1 leading-relaxed line-clamp-2">
                        {job.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-brand-text-muted">Academic Cutoff:</span>
                        <span className="font-bold text-white">{job.cgpaCutoff} CGPA</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-brand-text-muted block">Required Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {job.requiredSkills.map((s, i) => (
                            <span key={i} className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setActiveTab("analyzer");
                          }}
                          className="px-3 py-2 rounded-xl border border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10 text-xs font-bold font-mono uppercase cursor-pointer"
                        >
                          Check Match &rarr;
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyToJob(job.id)}
                          disabled={isApplied}
                          className={`px-4 py-2 rounded-xl font-bold font-mono text-xs uppercase cursor-pointer transition-all ${
                            isApplied
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-brand-cyan text-slate-950 hover:bg-brand-cyan/90"
                          }`}
                        >
                          {isApplied ? "✓ Applied" : "One-Click Apply"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* PAGE 4: SKILL GROWTH TRACKER */}
        {activeTab === "skills" && (
          <motion.div
            key="skills-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Skill Tracker Header */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2">
              <span className="editorial-label text-emerald-400">[ Personalized Upskilling Engine ]</span>
              <h3 className="font-display text-2xl font-bold text-white">Skill Gap &amp; Learning Growth Tracker</h3>
              <p className="text-xs text-brand-text-muted font-sans">
                Curated learning roadmaps based on technical skills required across placement drives. Mark completed skills to update your candidate profile.
              </p>
            </div>

            {/* Mastered Skills Count Bar */}
            <div className="p-4 rounded-xl glass-panel border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white font-mono">Mastered Skills Progress</span>
                  <p className="text-[10px] text-brand-text-muted">{masteredSkills.length} competencies verified in your profile</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {masteredSkills.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Curated Free Learning Resources List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningResources.map((item, idx) => {
                const isMastered = masteredSkills.includes(item.skill);
                return (
                  <div
                    key={idx}
                    className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isMastered ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-white/10 hover:border-brand-cyan/40"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono text-brand-text-muted">
                          {item.duration} &bull; {item.level}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-base text-white mt-3">{item.skill}</h4>
                      <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                      <span className="text-[10px] font-mono text-brand-cyan block mt-2">
                        Provider: {item.provider}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-cyan hover:underline"
                      >
                        Start Free Course <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => toggleMasteredSkill(item.skill)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase cursor-pointer border transition-all ${
                          isMastered
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {isMastered ? "✓ Mastered" : "+ Mark as Learned"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
