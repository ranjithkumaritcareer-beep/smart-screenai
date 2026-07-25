import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpRight, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  Globe, 
  Zap, 
  Network, 
  Code2, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  Building2, 
  Check, 
  FileText, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  Star, 
  Info, 
  ArrowRight,
  UserCheck,
  Layers,
  Search,
  ExternalLink,
  Cpu,
  Server,
  Mic,
  Volume2
} from "lucide-react";
import { JobPosting, CandidateProfile, AIEvaluation } from "../types";
import { supabase } from "../lib/supabaseClient";

interface LandingPageProps {
  jobs: JobPosting[];
  candidates: CandidateProfile[];
  evaluations: AIEvaluation[];
  onNavigate: (view: "landing" | "admin" | "student" | string) => void;
}

// Animated Counter Component for Stats
function AnimatedCounter({ value, isPercent = false }: { value: number; isPercent?: boolean }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayVal(end);
      return;
    }
    const duration = 1200;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayVal(end);
        clearInterval(timer);
      } else {
        setDisplayVal(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  if (isPercent) return <>{displayVal}%</>;
  return <>{displayVal < 10 ? `0${displayVal}` : displayVal}</>;
}

export default function LandingPage({ jobs, candidates, evaluations, onNavigate }: LandingPageProps) {
  // Compute live analytics metrics
  const activeJobs = jobs.length;
  const screenedCount = candidates.length;
  
  const validScores = evaluations.map(e => e.matchScore);
  const avgMatch = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  
  const shortlistedCount = evaluations.filter(e => {
    const override = e.manualOverrideVerdict;
    return override ? override === "Shortlisted" : e.verdict === "Shortlisted";
  }).length;
  const shortlistRate = screenedCount ? Math.round((shortlistedCount / screenedCount) * 100) : 0;

  // Active Tooltip for stats
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // How it works steps
  const steps = [
    {
      number: "01",
      title: "Upload & AI Parsing",
      description: "Students upload PDF resumes. Gemini 3.6 AI OCR extracts skills, projects, education, and CGPA in under 2 seconds.",
      icon: FileText,
      badge: "Instant OCR",
      color: "border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10"
    },
    {
      number: "02",
      title: "Autonomous Skill Matching",
      description: "Deep semantic intelligence cross-checks candidate profiles against open placement role requirements and tech stacks.",
      icon: BrainCircuit,
      badge: "Gemini 3.6 AI",
      color: "border-brand-purple/40 text-brand-purple bg-brand-purple/10"
    },
    {
      number: "03",
      title: "Diagnostic Match Score",
      description: "Generates an objective compatibility score (0-100%) alongside skill gap analysis and personalized resume tips.",
      icon: TrendingUp,
      badge: "Real-time Feedback",
      color: "border-brand-accent/40 text-brand-accent bg-brand-accent/10"
    },
    {
      number: "04",
      title: "1-Click Officer Shortlist",
      description: "Placement officers view batch candidate matches, review AI explanations, override decisions, and export reports.",
      icon: Award,
      badge: "Enterprise Triage",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
    }
  ];

  // Corporate Hiring Partners
  const hiringPartners = [
    { name: "Google", logo: "Google", color: "from-blue-400 to-green-400", placementCount: "140+ Hired" },
    { name: "Microsoft", logo: "Microsoft", color: "from-cyan-400 to-blue-500", placementCount: "115+ Hired" },
    { name: "Amazon", logo: "AWS", color: "from-amber-400 to-orange-500", placementCount: "180+ Hired" },
    { name: "TCS", logo: "TCS", color: "from-purple-400 to-pink-500", placementCount: "320+ Hired" },
    { name: "Infosys", logo: "Infosys", color: "from-indigo-400 to-cyan-400", placementCount: "260+ Hired" },
    { name: "Accenture", logo: "Accenture", color: "from-purple-500 to-indigo-500", placementCount: "210+ Hired" },
  ];

  // Testimonials / Success Stories
  const testimonials = [
    {
      name: "Aarav Sharma",
      role: "B.Tech Computer Science '25",
      company: "Google",
      package: "28 LPA",
      quote: "The instant AI skill-gap feedback was a game changer! I fixed missing React & Node.js keywords on my resume and landed my dream interview in the first batch.",
      stars: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Dr. Priya Sundaram",
      role: "Placement Director, SRM Institute",
      company: "Officer Hub",
      package: "1200+ Students Screened",
      quote: "Placement AI reduced our resume triage time from weeks to minutes. Automated scoring lets us focus strictly on pre-placement training and mock interviews.",
      stars: 5,
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    {
      name: "Rohan Varma",
      role: "M.Tech Data Science '25",
      company: "Amazon AWS",
      package: "32 LPA",
      quote: "I uploaded my PDF resume, got an 94% match rating for Cloud Engineering, and got shortlisted by the Placement Cell within 24 hours!",
      stars: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
    }
  ];

  // Comparison Features
  const comparisonFeatures = [
    { feature: "AI Resume OCR Parsing", student: true, officer: true, desc: "Automatic extraction of skills, education & CGPA from PDF files" },
    { feature: "Real-time Job Match Score", student: true, officer: true, desc: "Objective compatibility rating computed against active job criteria" },
    { feature: "Skill Gap Analysis & Advice", student: true, officer: false, desc: "Actionable recommendations to improve job alignment" },
    { feature: "Batch Candidate Screening", student: false, officer: true, desc: "Evaluate hundreds of student resumes simultaneously" },
    { feature: "Job Requisition Creation", student: false, officer: true, desc: "Post and manage campus recruitment drives & role requirements" },
    { feature: "Custom AI Recruiter Prompts", student: false, officer: true, desc: "Configure system instructions according to company guidelines" },
    { feature: "Export Shortlists (CSV/PDF)", student: false, officer: true, desc: "Download candidate rosters for corporate HR teams" },
  ];

  // FAQ Items
  const faqs = [
    {
      q: "How does the AI Resume Parsing work?",
      a: "Our server-side Gemini 3.6 AI OCR reads your PDF resume in real time. It extracts technical skills, CGPA, degree, projects, and work experience without storing unneeded personal tracking tokens."
    },
    {
      q: "What file formats are supported for resume uploads?",
      a: "The platform supports standard PDF documents and plain text profiles. PDF resumes with custom column layouts or scanned images are processed via Gemini Multimodal OCR."
    },
    {
      q: "How is the Candidate Match Score calculated?",
      a: "The AI compares the student's extracted skill vector, academic credentials, and project experience against the specific job posting requirements, generating a 0-100% match score with clear reasoning."
    },
    {
      q: "Can Placement Officers override AI decisions?",
      a: "Yes! Placement Officers retain full control. In the Officer Console, officers can manually override any AI 'Shortlisted' or 'Rejected' verdict and add custom notes."
    },
    {
      q: "Is student data kept confidential?",
      a: "All candidate profiles and evaluation scores are stored in encrypted database instances strictly accessible to verified students and campus placement officers."
    }
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto py-2 md:py-4 space-y-12">

      {/* Sticky Navigation Header */}
      <nav className="sticky top-4 z-50 bg-[#0a0f24]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div 
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-1.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-brand-cyan" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight flex items-center gap-1">
            Placement AI<span className="text-brand-cyan animate-pulse">.</span>
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-brand-text-muted">
          <button onClick={() => scrollToSection("workflow")} className="hover:text-brand-cyan transition-colors cursor-pointer">
            How It Works
          </button>
          <button onClick={() => scrollToSection("partners")} className="hover:text-brand-cyan transition-colors cursor-pointer">
            Partners
          </button>
          <button onClick={() => scrollToSection("comparison")} className="hover:text-brand-cyan transition-colors cursor-pointer">
            Features
          </button>
          <button onClick={() => scrollToSection("testimonials")} className="hover:text-brand-cyan transition-colors cursor-pointer">
            Success Stories
          </button>
          <button onClick={() => scrollToSection("faq")} className="hover:text-brand-cyan transition-colors cursor-pointer">
            FAQ
          </button>
        </div>

        {/* CTAs in Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("student")}
            className="px-3.5 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded-lg border border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple transition-all cursor-pointer hidden sm:block"
          >
            Student Login
          </button>
          <button
            onClick={() => onNavigate("admin")}
            className="px-4 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded-lg bg-gradient-to-r from-brand-cyan to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Officer Hub</span>
          </button>
        </div>
      </nav>

      {/* Main Cosmic Grid Container (Hero & Stats) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-px rounded-3xl overflow-hidden hero-circuit-pattern glass-panel border border-white/10 shadow-[0_20px_50px_rgba(7,12,36,0.6)]"
      >
        
        {/* Left Side Panel - Telemetry & Live Stats */}
        <aside className="lg:col-span-4 bg-brand-surface/40 p-8 md:p-10 flex flex-col justify-between space-y-10 border-r border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="editorial-label text-brand-cyan">[ Node Telemetry / PI-01 ]</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 animate-pulse">
                LIVE METRICS
              </span>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Campus Intelligence<span className="text-[#4cd7f6]">.</span>
            </div>
            <p className="text-xs text-brand-text-muted mt-2 leading-relaxed">
              Real-time monitoring of campus drives, student candidate profiles, and placement matching ratios.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <span className="editorial-label block border-b border-white/5 pb-2 text-brand-text-muted flex items-center justify-between">
              <span>Platform Diagnostics</span>
              <Info className="w-3.5 h-3.5 text-slate-500" />
            </span>
            
            {/* Stat Item 1 */}
            <div 
              onMouseEnter={() => setActiveTooltip("jobs")}
              onMouseLeave={() => setActiveTooltip(null)}
              className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all relative cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-muted uppercase tracking-wider font-mono flex items-center gap-2">
                  <Network className="w-4 h-4 text-brand-cyan group-hover:scale-110 transition-transform" />
                  Active Drives
                </span>
                <span className="font-display text-2xl font-bold text-white tracking-tight">
                  <AnimatedCounter value={activeJobs} />
                </span>
              </div>
              <AnimatePresence>
                {activeTooltip === "jobs" && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-brand-cyan mt-2 font-sans border-t border-brand-cyan/20 pt-1.5">
                    Verified open campus recruitment requisitions currently accepting student applications.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Stat Item 2 */}
            <div 
              onMouseEnter={() => setActiveTooltip("resumes")}
              onMouseLeave={() => setActiveTooltip(null)}
              className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all relative cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-muted uppercase tracking-wider font-mono flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-brand-purple group-hover:scale-110 transition-transform" />
                  Screened Resumes
                </span>
                <span className="font-display text-2xl font-bold text-white tracking-tight">
                  <AnimatedCounter value={screenedCount} />
                </span>
              </div>
              <AnimatePresence>
                {activeTooltip === "resumes" && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-brand-purple mt-2 font-sans border-t border-brand-purple/20 pt-1.5">
                    Total student PDF resumes parsed and vectorized through Gemini AI OCR.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Stat Item 3 */}
            <div 
              onMouseEnter={() => setActiveTooltip("match")}
              onMouseLeave={() => setActiveTooltip(null)}
              className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all relative cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-muted uppercase tracking-wider font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent group-hover:scale-110 transition-transform" />
                  Avg Match Score
                </span>
                <span className="font-display text-2xl font-bold text-brand-cyan tracking-tight">
                  <AnimatedCounter value={avgMatch} isPercent />
                </span>
              </div>
              <AnimatePresence>
                {activeTooltip === "match" && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-brand-cyan mt-2 font-sans border-t border-brand-cyan/20 pt-1.5">
                    System-wide average skill-to-job compatibility alignment score across candidates.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Stat Item 4 */}
            <div 
              onMouseEnter={() => setActiveTooltip("ratio")}
              onMouseLeave={() => setActiveTooltip(null)}
              className="group p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all relative cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs text-brand-text-muted uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-purple group-hover:scale-110 transition-transform" />
                  Shortlist Ratio
                </span>
                <span className="font-display text-2xl font-bold text-brand-purple tracking-tight">
                  <AnimatedCounter value={shortlistRate} isPercent />
                </span>
              </div>
              <AnimatePresence>
                {activeTooltip === "ratio" && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-brand-purple mt-2 font-sans border-t border-brand-purple/20 pt-1.5">
                    Percentage of screened candidate evaluations meeting the 70%+ shortlist benchmark.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 relative z-10">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </div>
            <span className="editorial-label text-emerald-400 font-mono">System Status &bull; Operational</span>
          </div>
        </aside>

        {/* Right Main Panel - Mission Control Launchpad */}
        <main className="lg:col-span-8 bg-[#0d1229]/40 p-8 md:p-12 flex flex-col justify-between relative min-h-[580px] overflow-hidden">
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
          
          <header className="mb-6 relative z-10 flex items-center justify-between">
            <span className="editorial-label text-brand-purple/90">[ Campus Recruitment Control Deck ]</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
              Gemini 3.6 Multimodal AI
            </span>
          </header>

          <section className="space-y-6 my-auto relative z-10">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Autonomous <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-blue-400 to-brand-purple">Intelligence</span> <br />
              for Campus Careers.
            </h1>
            
            {/* Feature Bullets Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase">Instant AI OCR</h4>
                  <p className="text-[11px] text-brand-text-muted mt-0.5 leading-snug">Parses PDF resumes & CGPA in seconds</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase">Skill Matching</h4>
                  <p className="text-[11px] text-brand-text-muted mt-0.5 leading-snug">0-100% real-time compatibility score</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase">Officer Hub</h4>
                  <p className="text-[11px] text-brand-text-muted mt-0.5 leading-snug">Batch triage & custom system prompts</p>
                </div>
              </div>
            </div>

            {/* Prominent High-Gloss Portal Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* Portal Card 1: Officer Console */}
              <div 
                onClick={() => onNavigate("admin")}
                className="group p-6 rounded-2xl bg-gradient-to-br from-brand-cyan/15 via-white/[0.04] to-blue-900/20 border border-brand-cyan/30 hover:border-brand-cyan/80 transition-all duration-300 relative overflow-hidden shadow-[0_8px_30px_rgba(0,242,254,0.15)] hover:shadow-[0_12px_40px_rgba(0,242,254,0.3)] hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/10 rounded-full blur-2xl group-hover:bg-brand-cyan/25 transition-colors" />
                <div className="flex items-center justify-between mb-2">
                  <span className="editorial-label text-brand-cyan font-bold">[ Placement Officer ]</span>
                  <ShieldCheck className="w-6 h-6 text-brand-cyan group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-cyan transition-colors">
                  Placement Officer Console
                </h3>
                <p className="text-xs text-brand-text-muted leading-relaxed font-sans mt-2">
                  Manage campus positions, screen candidate pools, run AI recruiter models, and export shortlisted rosters.
                </p>
                
                {/* Action Buttons */}
                <div className="mt-5 space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: { redirectTo: window.location.origin + "/officer/dashboard" }
                      });
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-white text-slate-900 font-bold font-sans text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all cursor-pointer shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("officer-login");
                      }}
                      className="py-2 px-3 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/30 font-bold font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Officer Login</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("admin");
                      }}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-500 text-slate-950 font-bold font-mono text-[11px] uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span>Console</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Portal Card 2: Student Portal */}
              <div 
                onClick={() => onNavigate("student")}
                className="group p-6 rounded-2xl bg-gradient-to-br from-brand-purple/15 via-white/[0.04] to-purple-900/20 border border-brand-purple/30 hover:border-brand-purple/80 transition-all duration-300 relative overflow-hidden shadow-[0_8px_30px_rgba(139,92,246,0.15)] hover:shadow-[0_12px_40px_rgba(139,92,246,0.3)] hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/10 rounded-full blur-2xl group-hover:bg-brand-purple/25 transition-colors" />
                <div className="flex items-center justify-between mb-2">
                  <span className="editorial-label text-brand-purple font-bold">[ Student Candidate ]</span>
                  <GraduationCap className="w-6 h-6 text-brand-purple group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white group-hover:text-brand-purple transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs text-brand-text-muted leading-relaxed font-sans mt-2">
                  Upload your PDF resume, calculate live job compatibility scores, and receive instant AI skill tips.
                </p>
                
                {/* Action Buttons */}
                <div className="mt-5 space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: { redirectTo: window.location.origin + "/student/dashboard" }
                      });
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-white text-slate-900 font-bold font-sans text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all cursor-pointer shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("student-login");
                      }}
                      className="py-2 px-3 rounded-xl bg-brand-purple/20 border border-brand-purple/40 text-brand-purple hover:bg-brand-purple/30 font-bold font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Student Login</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("student");
                      }}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-500 text-white font-bold font-mono text-[11px] uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span>Portal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <footer className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 relative z-10 text-xs text-brand-text-muted">
            <span className="editorial-label text-brand-text-muted">Placement AI &bull; Enterprise Campus Suite</span>
            <div className="flex items-center gap-4">
              <button onClick={() => scrollToSection("workflow")} className="hover:text-white transition-colors">Learn Workflow &rarr;</button>
            </div>
          </footer>
        </main>
      </motion.div>

      {/* Corporate Hiring Partners Banner */}
      <section id="partners" className="py-6 px-6 glass-panel rounded-2xl border border-white/10">
        <div className="text-center mb-6">
          <span className="editorial-label text-brand-cyan">[ Hiring Partners & Enterprise Recruiters ]</span>
          <h2 className="font-display text-xl font-bold text-white mt-1">Trusted by Leading Global Tech Recruiters</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {hiringPartners.map((partner, i) => (
            <div 
              key={i} 
              className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-brand-cyan/40 hover:bg-white/[0.07] transition-all flex flex-col items-center justify-center text-center group cursor-default"
            >
              <Building2 className="w-6 h-6 text-brand-cyan/80 group-hover:text-brand-cyan group-hover:scale-110 transition-all mb-1" />
              <span className="font-display font-bold text-sm text-white">{partner.name}</span>
              <span className="text-[10px] text-brand-text-muted font-mono mt-0.5">{partner.placementCount}</span>
            </div>
          ))}
        </div>
      </section>

      {/* "How It Works" Section */}
      <section id="workflow" className="py-10 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="editorial-label text-brand-purple">[ Automated Campus Workflow ]</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">How Placement AI Works</h2>
          <p className="text-xs text-brand-text-muted">
            End-to-end automated pipeline transforming raw student resumes into objective recruitment intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const IconComp = step.icon;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-2xl glass-panel border border-white/10 hover:border-white/20 transition-all relative flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-bold text-white/30 group-hover:text-brand-cyan transition-colors">
                      {step.number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${step.color}`}>
                      {step.badge}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 w-fit mb-4 border border-white/10 group-hover:scale-110 transition-transform">
                    <IconComp className="w-5 h-5 text-white" />
                  </div>

                  <h3 className="font-display text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-brand-text-muted leading-relaxed font-sans">{step.description}</p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-20">
                    <ArrowRight className="w-5 h-5 text-white/20" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Matrix (Student vs Officer) */}
      <section id="comparison" className="py-10 glass-panel rounded-3xl border border-white/10 p-8 md:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="editorial-label text-brand-cyan">[ Module Comparison ]</span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mt-1">
              Student Gateway vs. Officer Console
            </h2>
            <p className="text-xs text-brand-text-muted mt-1">
              Tailored capabilities designed specifically for candidate prep and placement administration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate("student")} 
              className="px-3.5 py-1.5 text-xs font-bold font-mono rounded-lg border border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10 transition-all cursor-pointer"
            >
              Student Portal &rarr;
            </button>
            <button 
              onClick={() => onNavigate("admin")} 
              className="px-3.5 py-1.5 text-xs font-bold font-mono rounded-lg bg-brand-cyan text-slate-950 hover:bg-brand-cyan/90 transition-all cursor-pointer"
            >
              Officer Console &rarr;
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 font-mono text-brand-text-muted uppercase">
                <th className="py-3 px-4 font-bold">Feature / Capability</th>
                <th className="py-3 px-4 font-bold text-center text-brand-purple">Student Portal</th>
                <th className="py-3 px-4 font-bold text-center text-brand-cyan">Officer Hub</th>
                <th className="py-3 px-4 font-bold hidden md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisonFeatures.map((item, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>{item.feature}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.student ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/40 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.officer ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-brand-text-muted hidden md:table-cell font-sans">
                    {item.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials / Student Success Stories */}
      <section id="testimonials" className="py-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="editorial-label text-brand-accent">[ Social Proof & Outcomes ]</span>
          <h2 className="font-display text-3xl font-bold text-white">Placement Success Stories</h2>
          <p className="text-xs text-brand-text-muted">
            See how students and placement directors leverage Placement AI for campus success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 rounded-2xl glass-panel border border-white/10 hover:border-brand-accent/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">"{t.quote}"</p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                  <div>
                    <h4 className="font-bold text-xs text-white">{t.name}</h4>
                    <p className="text-[11px] text-brand-text-muted font-sans">{t.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
                    {t.package}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-10 glass-panel rounded-3xl border border-white/10 p-8 md:p-10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="editorial-label text-brand-cyan">[ Frequently Asked Questions ]</span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white">Got Questions? We Have Answers</h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 text-left font-display font-semibold text-sm text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-brand-cyan shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-brand-text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 text-xs text-brand-text-muted leading-relaxed font-sans border-t border-white/5 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Bottom Banner */}
      <footer className="pt-6 pb-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-brand-text-muted">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-cyan" />
          <span className="font-display font-bold text-white">Placement AI</span>
          <span>&bull; Campus Recruitment Intelligence System</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <button onClick={() => scrollToSection("workflow")} className="hover:text-white transition-colors">Workflow</button>
          <button onClick={() => scrollToSection("comparison")} className="hover:text-white transition-colors">Features</button>
          <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors">FAQ</button>
          <button onClick={() => onNavigate("student")} className="hover:text-brand-purple transition-colors">Student Portal</button>
          <button onClick={() => onNavigate("admin")} className="hover:text-brand-cyan transition-colors">Officer Hub</button>
        </div>
      </footer>

    </div>
  );
}
