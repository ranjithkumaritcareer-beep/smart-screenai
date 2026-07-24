import React, { useState } from "react";
import { Plus, X, Briefcase, Sparkles } from "lucide-react";
import { JobPosting } from "../types";

interface JobFormProps {
  onAddJob: (job: Omit<JobPosting, "id" | "createdAt" | "applicantCount">) => void;
  onCancel: () => void;
}

export default function JobForm({ onAddJob, onCancel }: JobFormProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [cgpaCutoff, setCgpaCutoff] = useState<number>(7.5);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const removeSkill = (indexToRemove: number) => {
    setSkills(skills.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) {
      alert("Please fill in all required fields (Job Title, Company, and Description).");
      return;
    }
    if (skills.length === 0) {
      alert("Please specify at least one required skill.");
      return;
    }

    onAddJob({
      title: title.trim(),
      company: company.trim(),
      cgpaCutoff,
      requiredSkills: skills,
      description: description.trim(),
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 max-w-2xl mx-auto relative text-brand-text shadow-xl">
      <div className="absolute top-4 right-4 text-brand-text-muted/20">
        <Briefcase className="w-6 h-6" />
      </div>

      <h3 className="text-xl font-display font-bold text-white mb-2 flex items-center gap-2 tracking-tight uppercase">
        Post New Internship Role
      </h3>
      <p className="text-[10px] text-brand-text-muted mb-6 font-mono uppercase tracking-widest">
        Specify CGPA cutoffs and technical skills for real-time AI compliance evaluations.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest mb-1.5 font-mono">
              Job Title <span className="text-rose-400 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend Engineering Intern"
              className="w-full glass-input rounded-lg px-4 py-2 text-white placeholder-brand-text-muted/50 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest mb-1.5 font-mono">
              Company Name <span className="text-rose-400 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stitch Tech"
              className="w-full glass-input rounded-lg px-4 py-2 text-white placeholder-brand-text-muted/50 text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest mb-1.5 font-mono">
            Description <span className="text-rose-400 font-bold">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline role responsibilities, projects, learning tracks, and other team requirements..."
            className="w-full glass-input rounded-lg px-4 py-2.5 text-white placeholder-brand-text-muted/50 text-xs resize-none font-sans leading-relaxed"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest font-mono">
              Minimum CGPA Cutoff
            </label>
            <span className="text-brand-cyan font-mono font-bold text-[10px] bg-brand-cyan/10 border border-brand-cyan/20 px-2.5 py-1 rounded-lg">
              {cgpaCutoff.toFixed(1)} / 10.0
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={cgpaCutoff}
            onChange={(e) => setCgpaCutoff(parseFloat(e.target.value))}
            className="w-full accent-brand-cyan cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-brand-text-muted/40 font-mono mt-1">
            <span>0.0 (No Cutoff)</span>
            <span>5.0</span>
            <span>7.5</span>
            <span>10.0</span>
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-semibold text-brand-text-muted uppercase tracking-widest mb-1.5 font-mono">
            Required Technical Skills <span className="text-rose-400 font-bold">*</span>
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onKeyDown={handleKeyDown}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Type a skill & press Enter or comma (e.g. React)"
              className="flex-1 glass-input rounded-lg px-4 py-2 text-white placeholder-brand-text-muted/50 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => handleAddSkill()}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-brand-cyan p-2 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer font-mono"
            >
              Add
            </button>
          </div>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-3 bg-white/5 rounded-lg border border-white/5 max-h-28 overflow-y-auto">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-[10px] font-mono text-brand-cyan font-semibold"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="text-rose-400 hover:text-white ml-1 font-bold cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-brand-text-muted/40 italic font-mono">No skills added yet.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="border border-white/10 bg-white/5 hover:bg-white/10 text-white px-5 py-2 text-xs font-medium uppercase tracking-widest transition-colors rounded-lg font-mono cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-premium px-6 py-2 text-xs font-medium uppercase tracking-widest rounded-lg font-mono cursor-pointer"
          >
            Publish Role
          </button>
        </div>
      </form>
    </div>
  );
}
