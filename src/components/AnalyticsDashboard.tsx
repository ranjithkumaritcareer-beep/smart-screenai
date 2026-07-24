import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { JobPosting, CandidateProfile, AIEvaluation } from "../types";
import { TrendingUp, Users, Award, BookOpen } from "lucide-react";

interface AnalyticsDashboardProps {
  jobs: JobPosting[];
  candidates: CandidateProfile[];
  evaluations: AIEvaluation[];
}

export default function AnalyticsDashboard({ jobs, candidates, evaluations }: AnalyticsDashboardProps) {
  
  // 1. Compute average match score per job
  const jobStatsData = jobs.map(job => {
    const jobEvals = evaluations.filter(e => e.jobId === job.id);
    const avgScore = jobEvals.length
      ? Math.round(jobEvals.reduce((sum, e) => sum + e.matchScore, 0) / jobEvals.length)
      : 0;
    return {
      name: job.title.length > 20 ? job.title.slice(0, 18) + "..." : job.title,
      "Average Match %": avgScore,
      "Applicants": jobEvals.length
    };
  });

  // 2. Compute overall verdict distribution (accounting for overrides)
  let shortlistedCount = 0;
  let rejectedCount = 0;
  
  evaluations.forEach(e => {
    const finalVerdict = e.manualOverrideVerdict || e.verdict;
    if (finalVerdict === "Shortlisted") {
      shortlistedCount++;
    } else {
      rejectedCount++;
    }
  });

  const verdictDistributionData = [
    { name: "Shortlisted", value: shortlistedCount },
    { name: "Rejected", value: rejectedCount }
  ];

  const COLORS = ["#00D9C0", "#F43F5E"]; // Electric Teal for shortlists, Rose for rejects

  // 3. Compute top skills in demand and candidate match frequency
  const skillFrequencyMap: Record<string, { required: number, possessed: number }> = {};
  
  // Count required skills in jobs
  jobs.forEach(job => {
    job.requiredSkills.forEach(skill => {
      const s = skill.toLowerCase().trim();
      if (!skillFrequencyMap[s]) {
        skillFrequencyMap[s] = { required: 0, possessed: 0 };
      }
      skillFrequencyMap[s].required++;
    });
  });

  // Count candidates possessing those skills
  candidates.forEach(cand => {
    cand.skills.forEach(skill => {
      const s = skill.toLowerCase().trim();
      if (skillFrequencyMap[s]) {
        skillFrequencyMap[s].possessed++;
      }
    });
  });

  // Format into recharts format, sort by required frequency
  const skillStatsData = Object.entries(skillFrequencyMap)
    .map(([key, value]) => ({
      skill: key.toUpperCase(),
      "Required in Jobs": value.required,
      "Possessed by Candidates": value.possessed
    }))
    .sort((a, b) => b["Required in Jobs"] - a["Required in Jobs"])
    .slice(0, 6); // Top 6 skills for visual clarity

  return (
    <div className="space-y-6 text-brand-text">
      
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-lg backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-cyan">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-brand-text-muted font-mono uppercase tracking-widest font-semibold">Scoring Index</div>
            <div className="text-xl font-display font-bold text-white mt-0.5">
              {evaluations.length > 0
                ? Math.round(evaluations.reduce((acc, e) => acc + e.matchScore, 0) / evaluations.length)
                : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-lg backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-purple-light">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-brand-text-muted font-mono uppercase tracking-widest font-semibold">Total Evaluated</div>
            <div className="text-lg font-display font-bold text-white mt-0.5">
              {evaluations.length} Candidates
            </div>
          </div>
        </div>

        <div className="bg-brand-cyan/5 border border-brand-cyan/10 p-4 rounded-xl flex items-center gap-4 shadow-lg backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-brand-cyan/70 font-mono uppercase tracking-widest font-semibold">Shortlist Count</div>
            <div className="text-xl font-display font-bold text-brand-cyan mt-0.5">
              {shortlistedCount}
            </div>
          </div>
        </div>

        <div className="bg-brand-purple/5 border border-brand-purple/10 p-4 rounded-xl flex items-center gap-4 shadow-lg backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple-light">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-brand-purple-light/70 font-mono uppercase tracking-widest font-semibold">Active Jobs</div>
            <div className="text-xl font-display font-bold text-brand-purple-light mt-0.5">
              {jobs.length} Roles
            </div>
          </div>
        </div>
      </div>

      {/* Charts Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Average Match % per job */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-1 font-mono text-white">Role Compatibility Matrix</h4>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-widest leading-relaxed">Average AI compatibility score mapped against published internships.</p>
          </div>
          <div className="h-72 w-full mt-6">
            {jobStatsData.length > 0 && evaluations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobStatsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(11, 31, 58, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#FFFFFF", fontWeight: "600", fontSize: "11px" }}
                    itemStyle={{ color: "#00D9C0" }}
                  />
                  <Bar dataKey="Average Match %" fill="#00D9C0" barSize={30} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-brand-text-muted italic font-mono">
                Awaiting evaluation metrics to render role diagnostics.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Pipeline Shortlist Rate (Donut Chart) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-1 font-mono text-white">Placements Pipeline</h4>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-widest leading-relaxed">Current breakdown of shortlisted and rejected candidates.</p>
          </div>
          <div className="h-56 relative flex items-center justify-center mt-4">
            {evaluations.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictDistributionData}
                      innerRadius={62}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {verdictDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(11, 31, 58, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      itemStyle={{ color: "#FFFFFF", fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Overlay Text in the center of the donut */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-display font-bold text-white">
                    {Math.round((shortlistedCount / evaluations.length) * 100) || 0}%
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-brand-text-muted font-semibold font-mono">Shortlist</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-brand-text-muted italic font-mono">
                Awaiting candidates for pipeline breakdown.
              </div>
            )}
          </div>

          <div className="flex justify-around text-[10px] mt-4 pt-4 border-t border-white/5 font-mono uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#00D9C0] rounded-sm" />
              <span className="text-brand-text-muted font-semibold">Shortlist: {shortlistedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#f43f5e] rounded-sm" />
              <span className="text-brand-text-muted font-semibold">Rejected: {rejectedCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Skills Frequency */}
      <div className="glass-panel rounded-2xl p-5 md:p-6 shadow-xl">
        <h4 className="text-sm font-semibold uppercase tracking-wider mb-1 font-mono text-white">Key Tech Skills Gap Analysis</h4>
        <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-widest leading-relaxed mb-6">Compares skills requested in active job listings with actual student resume prevalence.</p>
        
        <div className="h-64 w-full">
          {skillStatsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={skillStatsData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                <YAxis dataKey="skill" type="category" stroke="rgba(255,255,255,0.4)" fontSize={9} width={90} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(11, 31, 58, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ color: "#FFFFFF", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: "500", fontFamily: "monospace", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }} />
                <Bar dataKey="Required in Jobs" fill="#00D9C0" barSize={12} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Possessed by Candidates" fill="rgba(255,255,255,0.1)" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-brand-text-muted italic font-mono">
              Create job postings and parse resumes to compare skill indexes.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
