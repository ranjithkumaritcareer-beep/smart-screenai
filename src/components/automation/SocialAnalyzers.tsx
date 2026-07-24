import React, { useState } from "react";
import { motion } from "motion/react";
import { Github, Linkedin, Sparkles, Loader2, CheckCircle2, ChevronRight, BarChart2 } from "lucide-react";

interface SocialAnalyzersProps {
  candidate: any;
}

export default function SocialAnalyzers({ candidate }: SocialAnalyzersProps) {
  const [activeTab, setActiveTab] = useState<"github" | "linkedin">("github");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Github States
  const [githubInput, setGithubInput] = useState("github.com/arjunmehta");
  const [githubData, setGithubData] = useState<any>(null);

  // LinkedIn States
  const [linkedinInput, setLinkedinInput] = useState("linkedin.com/in/arjunmehta");
  const [linkedinData, setLinkedinData] = useState<any>(null);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  };

  const handleAnalyzeGithub = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "github-analyzer",
          payload: { githubInput }
        })
      });
      const data = await response.json();
      setGithubData(data);
      showToast("GitHub Portfolio audit complete!");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeLinkedin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "linkedin-analyzer",
          payload: { linkedinInput }
        })
      });
      const data = await response.json();
      setLinkedinData(data);
      showToast("LinkedIn Profile analysis complete!");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-brand-cyan text-brand-bg px-4 py-2 rounded-xl shadow-lg font-mono text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <div className="flex border-b border-white/5 pb-2 gap-4">
        <button
          onClick={() => setActiveTab("github")}
          className={`pb-2 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "github" ? "text-brand-cyan border-b border-brand-cyan font-bold" : "text-brand-text-muted hover:text-white"
          }`}
        >
          GitHub Portfolio Analyzer (M9)
        </button>
        <button
          onClick={() => setActiveTab("linkedin")}
          className={`pb-2 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "linkedin" ? "text-brand-cyan border-b border-brand-cyan font-bold" : "text-brand-text-muted hover:text-white"
          }`}
        >
          LinkedIn Profile Analyzer (M10)
        </button>
      </div>

      {activeTab === "github" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Github className="w-5 h-5 text-brand-cyan" />
              <h4 className="font-mono font-bold text-xs uppercase tracking-wider">GitHub Audit Parameters</h4>
            </div>
            <p className="text-[11px] text-brand-text-muted leading-relaxed">
              Analyze code quality ratings, repo structure, languages utilized, and open-source contributions.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">Profile Link or Paste README</label>
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  className="w-full glass-input text-xs px-3 py-2 rounded-lg"
                  placeholder="github.com/username"
                />
              </div>

              <button
                onClick={handleAnalyzeGithub}
                disabled={loading}
                className="w-full btn-premium py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-widest font-mono flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auditing repositories...
                  </>
                ) : (
                  <>
                    <Github className="w-3.5 h-3.5" /> Start Portfolio Audit
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border-white/5 min-h-[300px]">
            {githubData ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div>
                    <h5 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Portfolio Strength: {githubData.strengthScore}%</h5>
                    <p className="text-[10px] text-brand-cyan mt-0.5 font-mono uppercase">Quality Rating: {githubData.qualityRating || "Good"}</p>
                  </div>
                  <div className="text-[9px] bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Audit Certified
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 border border-white/5 rounded-xl space-y-3 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Programming Languages Breakdown</span>
                    <div className="space-y-2">
                      {githubData.languages?.map((lang: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[10px] text-brand-text-muted">
                            <span>{lang.name}</span>
                            <span>{lang.percentage || lang.percent}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-brand-cyan rounded-full" style={{ width: `${lang.percentage || lang.percent}%` }} />
                          </div>
                        </div>
                      )) || (
                        <div className="space-y-2 text-[10px] text-brand-text-muted">
                          <div className="flex justify-between"><span>TypeScript</span><span>45%</span></div>
                          <div className="w-full h-1 bg-brand-cyan" style={{ width: "45%" }} />
                          <div className="flex justify-between"><span>React</span><span>35%</span></div>
                          <div className="w-full h-1 bg-brand-cyan" style={{ width: "35%" }} />
                          <div className="flex justify-between"><span>Node.js</span><span>20%</span></div>
                          <div className="w-full h-1 bg-brand-cyan" style={{ width: "20%" }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 border border-white/5 rounded-xl space-y-3 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Repo Structure & Quality Review</span>
                    <p className="text-[11px] font-sans text-brand-text-muted leading-relaxed">
                      {githubData.codeQualityReview || "Your code exhibits clean structuring, clear module scoping, and detailed documentation. Enhance quality ratings by utilizing standard lint and workflow automations."}
                    </p>
                  </div>
                </div>

                {githubData.improvementChecklist && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-purple font-bold block mb-2">Improvement Roadmap Tips</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {githubData.improvementChecklist.map((tip: string, idx: number) => (
                        <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5 text-[10px] text-brand-text-muted font-sans flex gap-2">
                          <span className="text-brand-purple font-bold">&bull;</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Github className="w-10 h-10 text-white/15 animate-pulse" />
                <p className="text-xs font-mono uppercase tracking-widest text-brand-text-muted">No Repository Audit Conducted</p>
                <p className="text-[10px] text-brand-text-muted/60 max-w-xs">Audit repository design, technical quality, and language profiles instantly.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Linkedin className="w-5 h-5 text-brand-purple" />
              <h4 className="font-mono font-bold text-xs uppercase tracking-wider">LinkedIn Optimizer Panel</h4>
            </div>
            <p className="text-[11px] text-brand-text-muted leading-relaxed">
              Generate optimized profile headlines, About section copy, and overall branding checklist points.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">Profile URL or Current Bio</label>
                <input
                  type="text"
                  value={linkedinInput}
                  onChange={(e) => setLinkedinInput(e.target.value)}
                  className="w-full glass-input text-xs px-3 py-2 rounded-lg"
                  placeholder="linkedin.com/in/username"
                />
              </div>

              <button
                onClick={handleAnalyzeLinkedin}
                disabled={loading}
                className="w-full btn-premium py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-widest font-mono flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Optimizing brand...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-3.5 h-3.5" /> Start Profile Optimization
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border-white/5 min-h-[300px]">
            {linkedinData ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div>
                    <h5 className="text-sm font-bold text-white font-mono uppercase tracking-wider">LinkedIn Profile Score: {linkedinData.strengthScore}%</h5>
                    <p className="text-[10px] text-brand-purple mt-0.5 font-mono uppercase">Optimized copy structured</p>
                  </div>
                  <div className="text-[9px] bg-brand-purple/10 border border-brand-purple/20 text-brand-purple-light px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Professional Index
                  </div>
                </div>

                <div className="space-y-4">
                  {linkedinData.suggestedHeadlines && (
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-mono font-bold text-slate-400">SEO-Optimized Headlines:</span>
                      <div className="space-y-1.5">
                        {linkedinData.suggestedHeadlines.map((head: string, i: number) => (
                          <div key={i} className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-[11px] text-white flex justify-between items-center">
                            <span>{head}</span>
                            <button
                              onClick={() => copyToClipboard(head)}
                              className="text-[8px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded font-mono"
                            >
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {linkedinData.improvedAbout && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Suggested "About" Copy:</span>
                        <button
                          onClick={() => copyToClipboard(linkedinData.improvedAbout)}
                          className="text-[8px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded font-mono"
                        >
                          Copy Bio
                        </button>
                      </div>
                      <p className="bg-white/5 p-3.5 rounded-xl border border-white/5 text-[11px] text-brand-text-muted leading-relaxed font-sans italic">
                        "{linkedinData.improvedAbout}"
                      </p>
                    </div>
                  )}

                  {linkedinData.profileTips && (
                    <div className="pt-2">
                      <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Branding Checklist Points:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                        {linkedinData.profileTips.map((tip: string, idx: number) => (
                          <div key={idx} className="bg-white/5 p-2 rounded-lg text-[10px] text-brand-text-muted font-sans flex gap-2">
                            <span className="text-brand-purple font-bold">&bull;</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Linkedin className="w-10 h-10 text-white/15 animate-pulse" />
                <p className="text-xs font-mono uppercase tracking-widest text-brand-text-muted">No Profile Optimization Conducted</p>
                <p className="text-[10px] text-brand-text-muted/60 max-w-xs">Restructure summary headings and profile search discoverability rankings instantly.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
