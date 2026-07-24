import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Briefcase, BarChart3, Plus, Search, Trash2, 
  Sparkles, RotateCcw, ArrowUpDown, ChevronRight, 
  AlertTriangle, ArrowLeft, Download, CheckCircle2, XCircle, 
  Clock, ShieldCheck, FileSpreadsheet, LayoutDashboard
} from "lucide-react";
import { JobPosting, CandidateProfile, AIEvaluation } from "../types";
import JobForm from "./JobForm";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { getScoreColorAndGlow } from "./EvaluationModal";

interface OfficerConsoleProps {
  jobs: JobPosting[];
  candidates: CandidateProfile[];
  evaluations: AIEvaluation[];
  onAddJob: (job: Omit<JobPosting, "id" | "createdAt" | "applicantCount">) => void;
  onDeleteJob: (id: string) => void;
  onResetSeed: () => void;
  onNavigateHome: () => void;
  onReviewCandidate: (candidate: CandidateProfile, evaluation: AIEvaluation) => void;
  onLogout?: () => void;
}

export default function OfficerConsole({
  jobs,
  candidates,
  evaluations,
  onAddJob,
  onDeleteJob,
  onResetSeed,
  onNavigateHome,
  onReviewCandidate,
  onLogout
}: OfficerConsoleProps) {
  // 3 Sub-Navigation Tabs as specified in prompt
  const [activeTab, setActiveTab] = useState<"dashboard" | "screening" | "analytics">("dashboard");
  const [showAddJobForm, setShowAddJobForm] = useState(false);

  // Filter & Search states for Applicant Screening
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"score" | "cgpa" | "name">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: "score" | "cgpa" | "name") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Build combined candidate array for display
  const combinedData = candidates.map(cand => {
    const candidateEvaluations = evaluations.filter(e => e.candidateId === cand.id);
    const primaryEval = candidateEvaluations[0];
    const targetJob = jobs.find(j => j.id === primaryEval?.jobId);
    
    return {
      candidate: cand,
      evaluation: primaryEval,
      job: targetJob
    };
  }).filter(item => item.evaluation !== undefined);

  // Filter combined data
  const filteredData = combinedData.filter(item => {
    const nameMatch = item.candidate.name.toLowerCase().includes(searchQuery.toLowerCase());
    const skillMatch = item.candidate.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const textSearchMatch = nameMatch || skillMatch;

    const jobMatch = selectedJobFilter === "all" || item.job?.id === selectedJobFilter;

    const finalVerdict = item.evaluation.manualOverrideVerdict || item.evaluation.verdict;
    const statusMatch = selectedStatusFilter === "all" || finalVerdict === selectedStatusFilter;

    return textSearchMatch && jobMatch && statusMatch;
  });

  // Sort filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;

    if (sortField === "score") {
      valA = a.evaluation.matchScore;
      valB = b.evaluation.matchScore;
    } else if (sortField === "cgpa") {
      valA = a.candidate.cgpa || 0;
      valB = b.candidate.cgpa || 0;
    } else if (sortField === "name") {
      valA = a.candidate.name.toLowerCase();
      valB = b.candidate.name.toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleAddNewJob = (jobData: any) => {
    onAddJob(jobData);
    setShowAddJobForm(false);
    setActiveTab("dashboard");
  };

  // CSV Exporter for Shortlisted Applicants
  const exportShortlistCSV = () => {
    const shortlistedList = filteredData.filter(item => {
      const finalVerdict = item.evaluation.manualOverrideVerdict || item.evaluation.verdict;
      return finalVerdict === "Shortlisted";
    });

    if (shortlistedList.length === 0) {
      alert("No shortlisted candidates found under current filters to export.");
      return;
    }

    const headers = ["Candidate Name", "Email", "Phone", "CGPA", "Target Job", "Company", "ATS Match Score %", "Matched Skills", "Missing Skills"];
    const csvRows = [headers.join(",")];

    shortlistedList.forEach(item => {
      const row = [
        `"${item.candidate.name}"`,
        `"${item.candidate.email}"`,
        `"${item.candidate.phone || "N/A"}"`,
        `"${item.candidate.cgpa !== null ? item.candidate.cgpa.toFixed(2) : "N/A"}"`,
        `"${item.job?.title || "N/A"}"`,
        `"${item.job?.company || "N/A"}"`,
        `"${item.evaluation.matchScore}"`,
        `"${item.evaluation.matchedSkills.join("; ")}"`,
        `"${item.evaluation.missingSkills.join("; ")}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Placement_Shortlist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate Eligible vs Not-Eligible Split for Dashboard Chart
  const totalEvaluated = evaluations.length || 1;
  const eligibleCount = evaluations.filter(e => (e.manualOverrideVerdict || e.verdict) === "Shortlisted").length;
  const pendingCount = evaluations.filter(e => e.manualOverrideVerdict !== null).length;
  const ineligibleCount = evaluations.filter(e => (e.manualOverrideVerdict || e.verdict) === "Rejected").length;

  const eligiblePercent = Math.round((eligibleCount / totalEvaluated) * 100);
  const pendingPercent = Math.round((pendingCount / totalEvaluated) * 100);
  const ineligiblePercent = Math.max(0, 100 - eligiblePercent - pendingPercent);

  return (
    <div className="space-y-6 text-brand-text max-w-7xl mx-auto py-2 px-2 md:px-4">
      
      {/* Sub-Header Toolbar */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Placement Officer Desk</h2>
              <span className="text-[9px] font-mono uppercase tracking-widest bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-2.5 py-0.5 rounded-full font-bold">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-brand-text-muted mt-1 font-mono leading-relaxed">
              Post job criteria, review candidate screening, and analyze drive-wide eligibility splits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onResetSeed}
              className="text-xs text-brand-purple-light border border-brand-purple/30 bg-white/5 hover:bg-brand-purple/10 px-3 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all"
              title="Reset storage back to original seed data"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset DB
            </button>

            <button
              onClick={() => {
                setShowAddJobForm(true);
                setActiveTab("dashboard");
              }}
              className="text-xs btn-premium px-4 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Post Job Role
            </button>

            <button
              onClick={onNavigateHome}
              className="text-xs text-white border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Main Gateway
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white px-3.5 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer transition-all"
              >
                Log Out
              </button>
            )}
          </div>
        </div>

        {/* 3 Main Portal Tabs as requested */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab("dashboard"); setShowAddJobForm(false); }}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-brand-cyan text-slate-950 font-extrabold shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. Officer Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("screening"); setShowAddJobForm(false); }}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "screening"
                ? "bg-brand-purple text-white font-extrabold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Applicant Screening</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("analytics"); setShowAddJobForm(false); }}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-emerald-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                : "text-brand-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>3. Analytics</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* PAGE 1: OFFICER DASHBOARD */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {showAddJobForm ? (
              <JobForm 
                onAddJob={handleAddNewJob} 
                onCancel={() => setShowAddJobForm(false)} 
              />
            ) : (
              <>
                {/* Eligible vs Not-Eligible Split Summary Chart */}
                <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white font-display">Screening Eligibility Split</h3>
                      <p className="text-xs text-brand-text-muted font-mono">
                        Distribution of candidates evaluated across active drive criteria
                      </p>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Eligible ({eligibleCount})
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Clock className="w-3.5 h-3.5" /> Review ({pendingCount})
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Ineligible ({ineligibleCount})
                      </span>
                    </div>
                  </div>

                  {/* Visual Split Distribution Bar */}
                  <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/10">
                    <div 
                      className="bg-emerald-400 h-full rounded-l-full transition-all duration-500" 
                      style={{ width: `${eligiblePercent}%` }}
                      title={`Eligible: ${eligiblePercent}%`}
                    />
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500" 
                      style={{ width: `${pendingPercent}%` }}
                      title={`Requires Review: ${pendingPercent}%`}
                    />
                    <div 
                      className="bg-rose-500 h-full rounded-r-full transition-all duration-500" 
                      style={{ width: `${ineligiblePercent}%` }}
                      title={`Ineligible: ${ineligiblePercent}%`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs pt-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <span className="text-emerald-400 font-bold text-lg block">{eligiblePercent}%</span>
                      <span className="text-[10px] text-brand-text-muted uppercase">Shortlisted Eligible</span>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <span className="text-amber-400 font-bold text-lg block">{pendingPercent}%</span>
                      <span className="text-[10px] text-brand-text-muted uppercase">Pending Override</span>
                    </div>

                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <span className="text-rose-400 font-bold text-lg block">{ineligiblePercent}%</span>
                      <span className="text-[10px] text-brand-text-muted uppercase">Ineligible / Missing Skills</span>
                    </div>
                  </div>
                </div>

                {/* Posted Job Requisitions Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white font-display">Active Recruitment Requisitions ({jobs.length})</h3>
                    <button
                      onClick={() => setShowAddJobForm(true)}
                      className="text-xs font-mono font-bold text-brand-cyan hover:underline flex items-center gap-1"
                    >
                      + Add Requisition Role
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Create New Role Card */}
                    <div 
                      onClick={() => setShowAddJobForm(true)}
                      className="bg-brand-purple/5 border border-dashed border-brand-purple/30 hover:border-brand-cyan rounded-2xl p-6 flex flex-col justify-center items-center text-center cursor-pointer min-h-[180px] group transition-all hover:bg-brand-cyan/5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-3 group-hover:bg-brand-cyan group-hover:text-slate-950 transition-all">
                        <Plus className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-xs font-mono uppercase tracking-wider">Post New Job Role</h4>
                      <p className="text-[10px] text-brand-text-muted mt-1 font-mono uppercase tracking-wider">
                        Set cutoff CGPA, required tech skills &amp; salary
                      </p>
                    </div>

                    {jobs.map(job => {
                      const jobApplicants = evaluations.filter(e => e.jobId === job.id).length;
                      return (
                        <div 
                          key={job.id} 
                          className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:border-brand-cyan transition-all text-brand-text shadow-lg space-y-4"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] font-mono uppercase tracking-widest bg-brand-cyan/10 border border-brand-cyan/20 px-2.5 py-0.5 rounded-full text-brand-cyan font-semibold">
                                {job.company}
                              </span>
                              <button
                                type="button"
                                onClick={() => onDeleteJob(job.id)}
                                className="p-1 rounded-md text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete this role posting"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <h4 className="font-display font-bold text-base text-white mt-3 leading-snug">{job.title}</h4>
                            <p className="text-xs text-brand-text-muted mt-1 line-clamp-2 leading-relaxed">{job.description}</p>
                          </div>

                          <div className="pt-3 border-t border-white/5 space-y-2 text-[10px] font-mono text-brand-text-muted/80">
                            <div className="flex justify-between font-semibold">
                              <span>Cutoff CGPA:</span>
                              <span className="text-brand-cyan font-bold font-mono">{job.cgpaCutoff.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Applicants Screened:</span>
                              <span className="text-white font-semibold font-mono">{jobApplicants} candidates</span>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {job.requiredSkills.map((s, i) => (
                                <span key={i} className="text-[8px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md text-brand-text-muted font-mono">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* PAGE 2: APPLICANT SCREENING VIEW */}
        {activeTab === "screening" && (
          <motion.div
            key="screening"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter & Search Bar */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-brand-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name or skill keywords..."
                    className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-brand-text-muted/50 font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={selectedJobFilter}
                    onChange={(e) => setSelectedJobFilter(e.target.value)}
                    className="glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono cursor-pointer bg-slate-900"
                  >
                    <option value="all">All Role Drives ({jobs.length})</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title} ({j.company})</option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="glass-input rounded-xl px-3.5 py-2 text-xs text-white font-mono cursor-pointer bg-slate-900"
                  >
                    <option value="all">All Verdicts</option>
                    <option value="Shortlisted">Eligible / Shortlisted</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Rejected">Rejected / Ineligible</option>
                  </select>

                  <button
                    onClick={exportShortlistCSV}
                    className="btn-premium px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Export Shortlist CSV</span>
                  </button>
                </div>
              </div>

              {/* Sorting Bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-[10px] font-mono text-brand-text-muted">
                <span>Sort Applicants By:</span>
                <button
                  onClick={() => toggleSort("score")}
                  className={`px-2 py-1 rounded cursor-pointer ${sortField === "score" ? "bg-brand-cyan/20 text-brand-cyan font-bold" : "hover:text-white"}`}
                >
                  ATS Score {sortField === "score" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => toggleSort("cgpa")}
                  className={`px-2 py-1 rounded cursor-pointer ${sortField === "cgpa" ? "bg-brand-cyan/20 text-brand-cyan font-bold" : "hover:text-white"}`}
                >
                  CGPA {sortField === "cgpa" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => toggleSort("name")}
                  className={`px-2 py-1 rounded cursor-pointer ${sortField === "name" ? "bg-brand-cyan/20 text-brand-cyan font-bold" : "hover:text-white"}`}
                >
                  Name {sortField === "name" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
              </div>
            </div>

            {/* Candidate Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 border-b border-white/10 text-[10px] font-mono font-bold uppercase text-brand-text-muted tracking-wider">
                <div className="col-span-4">Candidate Profile</div>
                <div className="col-span-3">Target Placement Role</div>
                <div className="col-span-1.5 text-center">CGPA</div>
                <div className="col-span-1.5 text-center">ATS Score</div>
                <div className="col-span-2 text-center">Status / Audit</div>
              </div>

              {sortedData.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {sortedData.map((item) => {
                    const evalObj = item.evaluation;
                    const cand = item.candidate;
                    const jb = item.job;
                    
                    const cgpaUnder = jb && cand.cgpa !== null && cand.cgpa < jb.cgpaCutoff;
                    const finalVerdict = evalObj.manualOverrideVerdict || evalObj.verdict;

                    return (
                      <div 
                        key={cand.id} 
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-all relative"
                      >
                        {/* 1. Candidate Info */}
                        <div className="col-span-12 md:col-span-4 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-white font-display">{cand.name}</span>
                            {evalObj.manualOverrideVerdict && (
                              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase font-mono">
                                Manual Override
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-brand-text-muted font-mono truncate">{cand.email}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cand.skills.slice(0, 3).map((s, i) => (
                              <span key={i} className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-brand-text-muted border border-white/5 font-mono">
                                {s}
                              </span>
                            ))}
                            {cand.skills.length > 3 && (
                              <span className="text-[9px] text-brand-text-muted/60 font-mono font-bold">+{cand.skills.length - 3}</span>
                            )}
                          </div>
                        </div>

                        {/* 2. Target Job Role */}
                        <div className="col-span-6 md:col-span-3 space-y-0.5">
                          <div className="text-xs font-bold text-white uppercase font-mono">{jb?.title || "Role Unspecified"}</div>
                          <div className="text-[10px] text-brand-cyan font-mono uppercase font-bold">{jb?.company}</div>
                        </div>

                        {/* 3. CGPA */}
                        <div className="col-span-3 md:col-span-1.5 text-center flex md:block items-center justify-between md:justify-center">
                          <span className="md:hidden text-xs text-brand-text-muted font-mono uppercase">CGPA:</span>
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-xs font-bold font-mono ${cgpaUnder ? "text-rose-400" : "text-white"}`}>
                              {cand.cgpa !== null ? cand.cgpa.toFixed(2) : "N/A"}
                            </span>
                            {cgpaUnder && (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" title={`Below Cutoff ${jb?.cgpaCutoff}`} />
                            )}
                          </div>
                        </div>

                        {/* 4. ATS Score */}
                        <div className="col-span-3 md:col-span-1.5 text-center flex md:block items-center justify-between md:justify-center">
                          <span className="md:hidden text-xs text-brand-text-muted font-mono uppercase">ATS Match:</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 border border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan rounded-md">
                            {evalObj.matchScore}%
                          </span>
                        </div>

                        {/* 5. Status & Audit Action */}
                        <div className="col-span-12 md:col-span-2 flex items-center justify-between md:justify-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold font-mono uppercase border w-24 text-center transition-all ${
                            finalVerdict === "Shortlisted"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          }`}>
                            {finalVerdict}
                          </span>

                          <button
                            type="button"
                            onClick={() => onReviewCandidate(cand, evalObj)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-cyan text-white hover:text-brand-cyan transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                            title="Audit AI Screening Reasoning"
                          >
                            <span>Audit</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-brand-text-muted font-mono italic">
                  No applicants match the selected search parameters.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PAGE 3: ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AnalyticsDashboard 
              jobs={jobs} 
              candidates={candidates} 
              evaluations={evaluations} 
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
