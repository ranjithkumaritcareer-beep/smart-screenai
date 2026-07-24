import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, MessageSquare, ShieldCheck, Mail, Send } from "lucide-react";
import { CandidateProfile, AIEvaluation, JobPosting } from "../types";
import { motion } from "motion/react";

export function getScoreColorAndGlow(score: number) {
  if (score >= 90) {
    return {
      text: "text-emerald-700",
      stroke: "#10b981",
      glow: "border-emerald-200 bg-emerald-50/50",
      dropGlow: "",
      gradient: ["#10b981", "#059669"],
    };
  } else if (score >= 70) {
    return {
      text: "text-cyan-700",
      stroke: "#06b6d4",
      glow: "border-cyan-200 bg-cyan-50/50",
      dropGlow: "",
      gradient: ["#22d3ee", "#06b6d4"],
    };
  } else if (score >= 40) {
    return {
      text: "text-amber-700",
      stroke: "#fbbf24",
      glow: "border-amber-200 bg-amber-50/50",
      dropGlow: "",
      gradient: ["#fbbf24", "#f59e0b"],
    };
  } else {
    return {
      text: "text-rose-700",
      stroke: "#e11d48",
      glow: "border-rose-200 bg-rose-50/50",
      dropGlow: "",
      gradient: ["#f43f5e", "#e11d48"],
    };
  }
}

interface EvaluationModalProps {
  candidate: CandidateProfile;
  evaluation: AIEvaluation;
  job: JobPosting;
  onClose: () => void;
  onSaveOverride: (verdict: "Shortlisted" | "Rejected", notes: string) => void;
}

export default function EvaluationModal({ candidate, evaluation, job, onClose, onSaveOverride }: EvaluationModalProps) {
  const [overrideVerdict, setOverrideVerdict] = useState<"Shortlisted" | "Rejected">(
    evaluation.manualOverrideVerdict || evaluation.verdict
  );
  const [manualNotes, setManualNotes] = useState(evaluation.manualNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  const cgpaUnderCutoff = candidate.cgpa !== null && candidate.cgpa < job.cgpaCutoff;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSaveOverride(overrideVerdict, manualNotes.trim());
      setIsSaving(false);
    }, 400);
  };

  const handleSetOverrideVerdict = (verdict: "Shortlisted" | "Rejected") => {
    setOverrideVerdict(verdict);
    setNotificationSent(false); // Reset notification state if verdict changes
  };

  const handleNotify = () => {
    setIsNotifying(true);
    setTimeout(() => {
      setIsNotifying(false);
      setNotificationSent(true);
    }, 1000);
  };

  // SVG Circular progress constants
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (evaluation.matchScore / 100) * circumference;

  // Decide effective verdict for the header/overview
  const effectiveVerdict = evaluation.manualOverrideVerdict || evaluation.verdict;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-brand-bg/95 border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh] text-brand-text shadow-2xl glass-panel"
      >
        {/* Header */}
        <div className="p-6 bg-brand-bg/50 border-b border-white/5 flex justify-between items-start gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight tracking-tight">{candidate.name}</h2>
              
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-widest border ${
                effectiveVerdict === "Shortlisted"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.1)]"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}>
                {effectiveVerdict}
                {evaluation.manualOverrideVerdict && " (Overridden)"}
              </span>

              {cgpaUnderCutoff && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 font-mono uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cutoff Warning ({job.cgpaCutoff})
                </span>
              )}
            </div>
            
            <p className="text-[10px] text-brand-text-muted mt-2 font-mono uppercase tracking-widest leading-relaxed">
              Applying for: <span className="text-brand-cyan font-bold">{job.title}</span> ({job.company})
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-brand-text-muted/80 font-mono">
              <span>{candidate.email}</span>
              {candidate.phone && <span>• {candidate.phone}</span>}
              {candidate.cgpa !== null && (
                <span className={`font-semibold ${cgpaUnderCutoff ? "text-rose-400" : "text-brand-cyan"}`}>
                  • CGPA: {candidate.cgpa.toFixed(2)}/10.0
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-transparent">
          
          {/* Left Column - Candidate Profile Details */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Education */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <h4 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono mb-2">Education Background</h4>
              <p className="text-sm text-white font-sans leading-relaxed font-semibold">{candidate.education}</p>
            </div>

            {/* Core Skills parsed from Resume */}
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono mb-3">Extracted Tech Stack</h4>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill, index) => {
                  const isMatching = job.requiredSkills.some(
                    rs => rs.toLowerCase().trim() === skill.toLowerCase().trim()
                  );
                  return (
                    <span
                      key={index}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono tracking-wide border ${
                        isMatching
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-semibold"
                          : "bg-white/5 border-white/5 text-brand-text-muted"
                      }`}
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Experience Summary */}
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono mb-2">Relevant Experience</h4>
              <p className="text-sm text-brand-text-muted leading-relaxed bg-white/5 p-3.5 border border-white/5 rounded-xl font-sans">
                {candidate.experience}
              </p>
            </div>

            {/* Projects */}
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono mb-2.5">Key Projects</h4>
              <ul className="space-y-2 font-sans">
                {candidate.projects.map((proj, idx) => (
                  <li key={idx} className="text-sm text-white flex items-start gap-2 bg-brand-purple/5 p-2.5 border border-brand-purple/10 rounded-xl">
                    <span className="text-brand-cyan mt-0.5 font-bold select-none">•</span>
                    <span className="leading-relaxed font-medium">{proj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - AI Matching Score & Manual Overrides */}
          <div className="md:col-span-5 space-y-6 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6">
            
            {/* Circular Progress Area */}
            <div className="bg-brand-bg/40 rounded-xl p-5 border border-white/10 flex items-center gap-5 justify-center md:justify-start transition-all text-white">
              <div className="relative flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke="#00f2fe"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: "drop-shadow(0 0 4px rgba(0,242,254,0.3))" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-semibold font-mono text-white">{evaluation.matchScore}</span>
                  <span className="text-[8px] uppercase text-brand-text-muted font-bold tracking-widest font-mono">Match %</span>
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono">AI Scoring Verdict</h4>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-white uppercase font-mono tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-brand-cyan" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan" />
                    </span>
                    {evaluation.matchScore >= 90 ? "Excellent Match" : evaluation.matchScore >= 70 ? "Highly Compliant" : evaluation.matchScore >= 40 ? "Needs Review" : "Low Compliance"}
                  </span>
                </div>
                <p className="text-[9px] text-brand-text-muted/40 font-mono mt-0.5">Scored on {new Date(evaluation.evaluatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Matched vs Missing Skills Map */}
            <div className="space-y-4">
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5 flex items-center gap-1.5 font-mono">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Matched Skills ({evaluation.matchedSkills.length})
                </h5>
                {evaluation.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {evaluation.matchedSkills.map((s, i) => (
                      <span key={i} className="text-[9px] font-medium font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-brand-text-muted/40 italic font-mono">No exact matched skills found.</p>
                )}
              </div>

              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-1.5 flex items-center gap-1.5 font-mono">
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  Missing Skills ({evaluation.missingSkills.length})
                </h5>
                {evaluation.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {evaluation.missingSkills.map((s, i) => (
                      <span key={i} className="text-[9px] font-medium font-mono px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-400 italic font-mono">Matches all required skills.</p>
                )}
              </div>
            </div>

            {/* AI Reasoning Text */}
            <div className="bg-brand-purple/5 border border-brand-purple/10 rounded-xl p-4">
              <h5 className="text-[9px] font-semibold uppercase tracking-widest text-brand-text-muted font-mono mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand-cyan" />
                AI Analysis Reasoning
              </h5>
              <p className="text-xs text-brand-text-muted leading-[1.6] italic font-sans">
                "{evaluation.reasoning}"
              </p>
            </div>

            {/* Placement Officer Manual Override Section */}
            <div className="bg-brand-bg/60 border border-white/10 rounded-xl p-4 space-y-4">
              <h5 className="text-[9px] font-bold uppercase tracking-widest text-white flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-cyan" />
                Placement Officer Override
              </h5>

              <div className="grid grid-cols-2 gap-2 bg-brand-bg p-1 border border-white/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleSetOverrideVerdict("Shortlisted")}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    overrideVerdict === "Shortlisted"
                      ? "bg-emerald-600 text-white"
                      : "text-brand-text-muted hover:text-white"
                  }`}
                >
                  Shortlist
                </button>
                <button
                  type="button"
                  onClick={() => handleSetOverrideVerdict("Rejected")}
                  className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    overrideVerdict === "Rejected"
                      ? "bg-rose-600 text-white"
                      : "text-brand-text-muted hover:text-white"
                  }`}
                >
                  Reject
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest mb-1.5 font-mono">
                  Officer Comments & Review Notes
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Enter manual comments, override reasons..."
                  className="w-full glass-input rounded-lg p-2.5 text-xs text-white placeholder-brand-text-muted/30 resize-none font-sans"
                />
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="w-full btn-premium py-2.5 rounded-lg font-mono font-semibold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSaving ? "Saving changes..." : "Save Evaluation Review"}
              </button>
            </div>

            {/* Mock Student Notification Section */}
            <div className="bg-brand-bg/60 border border-white/10 rounded-xl p-4 space-y-3">
              <h5 className="text-[9px] font-bold uppercase tracking-widest text-white flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-brand-cyan" />
                Student Notification
              </h5>
              
              <p className="text-[11px] text-brand-text-muted leading-relaxed font-sans">
                Simulate sending a secure outcome notification email to <span className="font-mono text-brand-cyan break-all">{candidate.email}</span>.
              </p>

              {notificationSent ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-[10px] text-emerald-400 font-mono space-y-1"
                >
                  <p className="font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Email Transmitted Successfully!
                  </p>
                  <p className="text-[9px] text-brand-text-muted/60 italic mt-1 leading-normal">
                    Subject: Update on your application for {job.title} ({job.company})
                  </p>
                  <p className="text-[9px] text-emerald-300 leading-normal">
                    Sent status: <span className="font-bold uppercase">{effectiveVerdict}</span>
                  </p>
                </motion.div>
              ) : (
                <button
                  type="button"
                  disabled={isNotifying}
                  onClick={handleNotify}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-brand-cyan font-semibold uppercase tracking-widest text-[10px] py-2.5 rounded-lg transition-all cursor-pointer font-mono flex items-center justify-center gap-1.5"
                >
                  {isNotifying ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
                      Sending Mock Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Notify Result ({effectiveVerdict})
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
