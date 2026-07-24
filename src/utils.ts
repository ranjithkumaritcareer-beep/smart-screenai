import { JobPosting, CandidateProfile, AIEvaluation, SEED_JOBS, SEED_CANDIDATES, SEED_EVALUATIONS } from "./types";

/**
 * State persistence helpers using localStorage
 */
export const StorageManager = {
  getJobs(): JobPosting[] {
    const data = localStorage.getItem("smartscreen_jobs");
    if (!data) {
      localStorage.setItem("smartscreen_jobs", JSON.stringify(SEED_JOBS));
      return SEED_JOBS;
    }
    return JSON.parse(data);
  },

  saveJobs(jobs: JobPosting[]): void {
    localStorage.setItem("smartscreen_jobs", JSON.stringify(jobs));
  },

  getCandidates(): CandidateProfile[] {
    const data = localStorage.getItem("smartscreen_candidates");
    if (!data) {
      localStorage.setItem("smartscreen_candidates", JSON.stringify(SEED_CANDIDATES));
      return SEED_CANDIDATES;
    }
    return JSON.parse(data);
  },

  saveCandidates(candidates: CandidateProfile[]): void {
    localStorage.setItem("smartscreen_candidates", JSON.stringify(candidates));
  },

  getEvaluations(): AIEvaluation[] {
    const data = localStorage.getItem("smartscreen_evaluations");
    if (!data) {
      localStorage.setItem("smartscreen_evaluations", JSON.stringify(SEED_EVALUATIONS));
      return SEED_EVALUATIONS;
    }
    return JSON.parse(data);
  },

  saveEvaluations(evaluations: AIEvaluation[]): void {
    localStorage.setItem("smartscreen_evaluations", JSON.stringify(evaluations));
  },

  resetAll(): void {
    localStorage.setItem("smartscreen_jobs", JSON.stringify(SEED_JOBS));
    localStorage.setItem("smartscreen_candidates", JSON.stringify(SEED_CANDIDATES));
    localStorage.setItem("smartscreen_evaluations", JSON.stringify(SEED_EVALUATIONS));
  }
};
