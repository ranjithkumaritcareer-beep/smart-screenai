import React, { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, GraduationCap, ArrowLeft, RefreshCw, Layers, School, Loader2 } from "lucide-react";
import { JobPosting, CandidateProfile, AIEvaluation } from "./types";
import { StorageManager } from "./utils";
import { supabase } from "./lib/supabaseClient";

// Custom Subcomponents
import LandingPage from "./components/LandingPage";
import OfficerConsole from "./components/OfficerConsole";
import StudentPortal from "./components/StudentPortal";
import EvaluationModal from "./components/EvaluationModal";
import AuthScreen from "./components/AuthScreen";
import VoiceAssistant from "./components/VoiceAssistant";

export default function App() {
  // Primary State
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([]);
  
  // Navigation Pathname State (Custom router synchronized with browser history)
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  
  // Supabase Authentication & Role States
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<"student" | "officer" | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [officerProfile, setOfficerProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Google OAuth completion extra steps for Officers
  const [collegeNameInput, setCollegeNameInput] = useState("");
  const [isCompletingOfficerReg, setIsCompletingOfficerReg] = useState(false);
  const [officerRegError, setOfficerRegError] = useState("");
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // One-time Role Selection Picker for new Google Sign-In users
  const handleSelectRole = async (selectedRole: "student" | "officer") => {
    if (!session?.user) return;
    setIsSubmittingRole(true);
    const userId = session.user.id;
    const userEmail = session.user.email || "";
    const fullName = session.user.user_metadata?.full_name || userEmail.split("@")[0] || (selectedRole === "student" ? "Student" : "Officer");

    // 1. Save choice to Supabase "profiles" table (id, role)
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        role: selectedRole,
        email: userEmail.toLowerCase(),
        name: fullName,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Error upserting to profiles table:", err);
    }

    // 2. Insert into specific table (students or officers)
    try {
      if (selectedRole === "student") {
        await supabase.from("students").upsert({
          id: userId,
          name: fullName,
          email: userEmail.toLowerCase()
        });
      } else {
        await supabase.from("officers").upsert({
          id: userId,
          name: fullName,
          email: userEmail.toLowerCase(),
          college_name: "Institution"
        });
      }
    } catch (err) {
      console.warn("Error inserting into role table:", err);
    }

    // 3. LocalStorage persistence fallback
    const profileObj = {
      id: userId,
      name: fullName,
      email: userEmail,
      role: selectedRole,
      college_name: selectedRole === "officer" ? "Institution" : undefined
    };
    localStorage.setItem(`profile_${userId}`, JSON.stringify(profileObj));

    // 4. Update State and Navigate
    setUserRole(selectedRole);
    if (selectedRole === "student") {
      setStudentProfile(profileObj);
      setOfficerProfile(null);
      navigate("/student/dashboard");
    } else {
      setOfficerProfile(profileObj);
      setStudentProfile(null);
      navigate("/officer/dashboard");
    }
    setIsSubmittingRole(false);
  };

  // Modal State for Candidate Detail review
  const [activeReview, setActiveReview] = useState<{
    candidate: CandidateProfile;
    evaluation: AIEvaluation;
    job: JobPosting;
  } | null>(null);

  // Helper navigate function
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
  };

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync /admin legacy view and general /login path
  useEffect(() => {
    if (pathname === "/admin") {
      navigate("/officer/dashboard");
    } else if (pathname === "/login") {
      navigate("/student/login");
    }
  }, [pathname]);

  // Load initial data from Local Storage on mount
  useEffect(() => {
    setJobs(StorageManager.getJobs());
    setCandidates(StorageManager.getCandidates());
    setEvaluations(StorageManager.getEvaluations());
  }, []);

  // Fetch role and details of the user
  const checkUserRoleAndFetchProfile = async (userId: string) => {
    // 1. Check in primary "profiles" table
    try {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (prof && prof.role && !profErr) {
        const role = prof.role as "student" | "officer";
        setUserRole(role);
        if (role === "student") {
          setStudentProfile(prof);
          setOfficerProfile(null);
        } else {
          setOfficerProfile(prof);
          setStudentProfile(null);
        }
        localStorage.setItem(`profile_${userId}`, JSON.stringify(prof));
        return role;
      }
    } catch (err) {
      console.warn("Profiles table check failed, checking role tables:", err);
    }

    try {
      // 2. Check in "students" table
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (student && !studentErr) {
        setUserRole("student");
        setStudentProfile(student);
        setOfficerProfile(null);
        localStorage.setItem(`profile_${userId}`, JSON.stringify({ ...student, role: "student" }));
        return "student";
      }

      // 3. Check in "officers" table
      const { data: officer, error: officerErr } = await supabase
        .from("officers")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (officer && !officerErr) {
        setUserRole("officer");
        setOfficerProfile(officer);
        setStudentProfile(null);
        localStorage.setItem(`profile_${userId}`, JSON.stringify({ ...officer, role: "officer" }));
        return "officer";
      }
    } catch (err) {
      console.warn("Role tables check failed, checking local storage:", err);
    }

    // Secondary fallback: LocalStorage profile
    const localProfileStr = localStorage.getItem(`profile_${userId}`);
    if (localProfileStr) {
      try {
        const localProfile = JSON.parse(localProfileStr);
        if (localProfile.role) {
          setUserRole(localProfile.role);
          if (localProfile.role === "student") {
            setStudentProfile(localProfile);
            setOfficerProfile(null);
          } else {
            setOfficerProfile(localProfile);
            setStudentProfile(null);
          }
          return localProfile.role;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setUserRole(null);
    setStudentProfile(null);
    setOfficerProfile(null);
    return null;
  };

  // 1. Subscribe to Auth Status Change globally
  useEffect(() => {
    const demoUserStr = localStorage.getItem("smartscreen_demo_user");
    if (demoUserStr) {
      try {
        const demoUser = JSON.parse(demoUserStr);
        setSession({ user: demoUser });
        setUserRole(demoUser.role);
        if (demoUser.role === "student") {
          setStudentProfile(demoUser);
          setOfficerProfile(null);
        } else {
          setOfficerProfile(demoUser);
          setStudentProfile(null);
        }
        setIsAuthLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse demo user session:", e);
      }
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (localStorage.getItem("smartscreen_demo_user")) return;
      setSession(initialSession);
      if (initialSession?.user) {
        checkUserRoleAndFetchProfile(initialSession.user.id).finally(() => {
          setIsAuthLoading(false);
        });
      } else {
        setIsAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (localStorage.getItem("smartscreen_demo_user")) return;
      setSession(currentSession);
      if (currentSession?.user) {
        setIsAuthLoading(true);
        await checkUserRoleAndFetchProfile(currentSession.user.id);
        setIsAuthLoading(false);
      } else {
        setUserRole(null);
        setStudentProfile(null);
        setOfficerProfile(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Auto-insert Student row if logged in with Google but no profile row exists
  useEffect(() => {
    const autoRegisterGoogleStudent = async () => {
      if (!isAuthLoading && session?.user && pathname === "/student/dashboard") {
        try {
          // Check if we already registered them in this session to avoid infinite triggers
          const alreadyRegistered = localStorage.getItem(`registered_google_${session.user.id}`);
          if (alreadyRegistered) return;

          const { data: existingStudent, error: selectErr } = await supabase
            .from("students")
            .select("id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!existingStudent && !selectErr) {
            const fullName = session.user.user_metadata?.full_name || "Google Student";
            const email = session.user.email || "";

            const { error: insertErr } = await supabase
              .from("students")
              .insert({
                id: session.user.id,
                name: fullName,
                email: email.toLowerCase()
              });

            if (insertErr) throw insertErr;
          }

          localStorage.setItem(`registered_google_${session.user.id}`, "true");
          await checkUserRoleAndFetchProfile(session.user.id);
        } catch (err) {
          console.warn("Error auto-registering Google student, falling back to LocalStorage:", err);
          // Create fallback profile in LocalStorage
          const fullName = session.user.user_metadata?.full_name || "Google Student";
          const email = session.user.email || "";
          const fallbackStudent = {
            id: session.user.id,
            name: fullName,
            email: email.toLowerCase(),
            role: "student"
          };
          localStorage.setItem(`profile_${session.user.id}`, JSON.stringify(fallbackStudent));
          localStorage.setItem(`registered_google_${session.user.id}`, "true");
          setUserRole("student");
          setStudentProfile(fallbackStudent);
          setOfficerProfile(null);
        }
      }
    };

    autoRegisterGoogleStudent();
  }, [session, userRole, pathname, isAuthLoading]);

  // 3. Route Guard Policy & Role Locking
  useEffect(() => {
    if (isAuthLoading) return;

    const isStudentRoute = pathname.startsWith("/student") || pathname === "/student-login";
    const isOfficerRoute = pathname.startsWith("/officer") || pathname === "/officer-login" || pathname === "/admin";
    const isResetRoute = pathname.includes("reset-password");

    if (!session?.user) {
      // Guest access to restricted dashboards
      if (pathname === "/student/dashboard") {
        navigate("/student-login");
      } else if (pathname === "/officer/dashboard" || pathname === "/admin") {
        navigate("/officer-login");
      }
    } else if (userRole) {
      // Authenticated users with established role
      if (userRole === "student") {
        // Locked to Student Portal: direct access to Officer routes redirects back to Student dashboard
        if (isOfficerRoute) {
          console.warn("Role Lock Enforcement: Student account cannot access Officer routes.");
          navigate("/student/dashboard");
        } else if (pathname === "/student/login" || pathname === "/student-login") {
          navigate("/student/dashboard");
        }
      } else if (userRole === "officer") {
        // Locked to Officer Console: direct access to Student routes redirects back to Officer dashboard
        if (isStudentRoute) {
          console.warn("Role Lock Enforcement: Officer account cannot access Student routes.");
          navigate("/officer/dashboard");
        } else if (pathname === "/officer/login" || pathname === "/officer-login") {
          navigate("/officer/dashboard");
        }
      }
    }
  }, [pathname, session, userRole, isAuthLoading]);

  // Logout utility
  const handleLogout = async () => {
    setIsAuthLoading(true);
    try {
      localStorage.removeItem("smartscreen_demo_user");
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Google OAuth registration completion handler
  const handleCompleteOfficerRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeNameInput.trim()) {
      setOfficerRegError("College or Institution name is required.");
      return;
    }
    setIsCompletingOfficerReg(true);
    setOfficerRegError("");
    try {
      const fullName = session.user.user_metadata?.full_name || "Google Officer";
      const email = session.user.email || "";

      const { error } = await supabase
        .from("officers")
        .insert({
          id: session.user.id,
          name: fullName,
          email: email.toLowerCase(),
          college_name: collegeNameInput.trim()
        });

      if (error) throw error;
      await checkUserRoleAndFetchProfile(session.user.id);
    } catch (err: any) {
      console.warn("Error completing Google Officer row in DB, falling back to LocalStorage:", err);
      try {
        const fullName = session.user.user_metadata?.full_name || "Google Officer";
        const email = session.user.email || "";
        const fallbackOfficer = {
          id: session.user.id,
          name: fullName,
          email: email.toLowerCase(),
          role: "officer",
          college_name: collegeNameInput.trim()
        };
        localStorage.setItem(`profile_${session.user.id}`, JSON.stringify(fallbackOfficer));
        setUserRole("officer");
        setOfficerProfile(fallbackOfficer);
        setStudentProfile(null);
      } catch (fallbackErr) {
        console.error("Critical fallback failure:", fallbackErr);
        setOfficerRegError(err.message || "Failed to finalize officer account.");
      }
    } finally {
      setIsCompletingOfficerReg(false);
    }
  };

  // Job opening actions
  const handleAddJob = (jobInput: Omit<JobPosting, "id" | "createdAt" | "applicantCount">) => {
    const newJob: JobPosting = {
      ...jobInput,
      id: "job-" + Date.now(),
      createdAt: new Date().toISOString().split("T")[0],
      applicantCount: 0
    };
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    StorageManager.saveJobs(updatedJobs);
  };

  const handleDeleteJob = (id: string) => {
    const updatedJobs = jobs.filter(j => j.id !== id);
    setJobs(updatedJobs);
    StorageManager.saveJobs(updatedJobs);

    const updatedEvals = evaluations.filter(e => e.jobId !== id);
    setEvaluations(updatedEvals);
    StorageManager.saveEvaluations(updatedEvals);
  };

  const handleAddEvaluation = (candidate: CandidateProfile, evaluation: AIEvaluation) => {
    const updatedCandidates = [candidate, ...candidates];
    setCandidates(updatedCandidates);
    StorageManager.saveCandidates(updatedCandidates);

    const updatedEvaluations = [evaluation, ...evaluations];
    setEvaluations(updatedEvaluations);
    StorageManager.saveEvaluations(updatedEvaluations);

    const updatedJobs = jobs.map(j => {
      if (j.id === evaluation.jobId) {
        return { ...j, applicantCount: j.applicantCount + 1 };
      }
      return j;
    });
    setJobs(updatedJobs);
    StorageManager.saveJobs(updatedJobs);
  };

  const handleSaveOverride = (verdict: "Shortlisted" | "Rejected", notes: string) => {
    if (!activeReview) return;

    const { candidate, job } = activeReview;

    const updatedEvaluations = evaluations.map(e => {
      if (e.candidateId === candidate.id && e.jobId === job.id) {
        return {
          ...e,
          manualOverrideVerdict: verdict,
          manualNotes: notes,
          evaluatedAt: new Date().toISOString()
        };
      }
      return e;
    });

    setEvaluations(updatedEvaluations);
    StorageManager.saveEvaluations(updatedEvaluations);

    const matchedEval = updatedEvaluations.find(e => e.candidateId === candidate.id && e.jobId === job.id);
    if (matchedEval) {
      setActiveReview({
        candidate,
        job,
        evaluation: matchedEval
      });
    }
  };

  const handleResetSeed = () => {
    if (window.confirm("Are you sure you want to restore the database to seed templates? This will overwrite manual changes.")) {
      StorageManager.resetAll();
      setJobs(StorageManager.getJobs());
      setCandidates(StorageManager.getCandidates());
      setEvaluations(StorageManager.getEvaluations());
      setActiveReview(null);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent/20 selection:text-white flex flex-col justify-between font-sans relative antialiased overflow-x-hidden noise-bg">
      
      {/* Global Header */}
      <header className="sticky top-0 z-40 bg-brand-bg/75 backdrop-blur-md border-b border-white/10 py-4 px-6 flex justify-between items-center shrink-0">
        <div 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4d8eff] to-[#8b5cf6] flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(77,142,255,0.4)]">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold font-serif tracking-tight flex items-center gap-1 leading-none text-white">
              Placement AI<span className="text-[#4cd7f6]">.</span>
            </h1>
            <span className="text-[8px] text-[#c2c6d6]/50 font-mono uppercase tracking-widest">MISSION CONTROL</span>
          </div>
        </div>

        {/* Dynamic header breadcrumb navigation & Sign Out */}
        <div className="flex items-center gap-3 md:gap-4">
          {session ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-brand-text-muted/80 mr-1">
                {pathname === "/officer/dashboard" && (
                  <span className="flex items-center gap-1 text-[#4cd7f6] font-bold"><ShieldCheck className="w-3.5 h-3.5 text-brand-cyan animate-pulse" /> Placement Console</span>
                )}
                {pathname === "/student/dashboard" && (
                  <span className="flex items-center gap-1 text-[#d0bcff] font-bold"><GraduationCap className="w-3.5 h-3.5 text-brand-purple" /> Student Workspace</span>
                )}
              </div>
              
              {pathname === "/" && (
                <button
                  id="header-go-to-dashboard-btn"
                  onClick={() => navigate(userRole === "officer" ? "/officer/dashboard" : "/student/dashboard")}
                  className="flex items-center gap-1.5 text-xs text-[#4cd7f6] border border-[#4cd7f6]/30 bg-[#4cd7f6]/10 hover:bg-[#4cd7f6]/20 px-3 py-1.5 rounded-lg font-medium font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(0,242,254,0.1)]"
                >
                  Dashboard &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                id="header-student-portal-btn"
                onClick={() => navigate("/student/login")}
                className={`text-[10px] font-semibold font-mono uppercase tracking-wider p-1.5 px-2.5 md:px-3.5 rounded-lg border transition-all cursor-pointer ${
                  pathname.startsWith("/student")
                    ? "bg-brand-purple/20 text-white border-brand-purple/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                    : "text-brand-text-muted hover:text-white hover:bg-white/5 border-white/5"
                }`}
              >
                Student Portal
              </button>
              <button
                id="header-officer-portal-btn"
                onClick={() => navigate("/officer/login")}
                className={`text-[10px] font-semibold font-mono uppercase tracking-wider p-1.5 px-2.5 md:px-3.5 rounded-lg border transition-all cursor-pointer ${
                  pathname.startsWith("/officer")
                    ? "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 shadow-[0_0_10px_rgba(0,242,254,0.2)]"
                    : "text-brand-text-muted hover:text-white hover:bg-white/5 border-white/5"
                }`}
              >
                Officer Portal
              </button>
            </div>
          )}

          {pathname !== "/" && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-xs text-brand-text bg-white/5 border border-white/10 hover:border-[#4cd7f6]/50 hover:text-white p-1.5 px-3 transition-all cursor-pointer font-medium font-mono uppercase tracking-wider rounded-lg backdrop-blur-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Main Page</span>
            </button>
          )}

          {session && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white hover:bg-rose-600/30 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 p-1.5 px-3 transition-all cursor-pointer font-medium font-mono uppercase tracking-wider rounded-lg"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 z-10 flex flex-col justify-center">
        {isAuthLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-[#4cd7f6] animate-spin" />
            <p className="text-xs text-brand-text-muted font-mono uppercase tracking-widest">Securing Node Ingress...</p>
          </div>
        ) : (
          <>
            {pathname === "/" && (
              <LandingPage
                jobs={jobs}
                candidates={candidates}
                evaluations={evaluations}
                onNavigate={(view) => {
                  if (view === "admin") navigate("/officer/login");
                  else if (view === "student") navigate("/student/login");
                  else navigate("/");
                }}
              />
            )}

            {(pathname === "/student/login" || pathname === "/student-login") && (
              <AuthScreen
                type="student"
                initialMode="login"
                onSuccess={(s) => setSession(s)}
                onNavigate={navigate}
              />
            )}

            {(pathname === "/officer/login" || pathname === "/officer-login") && (
              <AuthScreen
                type="officer"
                initialMode="login"
                onSuccess={(s) => setSession(s)}
                onNavigate={navigate}
              />
            )}

            {pathname === "/student/reset-password" && (
              <AuthScreen
                type="student"
                initialMode="reset-password"
                onSuccess={(s) => setSession(s)}
                onNavigate={navigate}
              />
            )}

            {pathname === "/officer/reset-password" && (
              <AuthScreen
                type="officer"
                initialMode="reset-password"
                onSuccess={(s) => setSession(s)}
                onNavigate={navigate}
              />
            )}

            {pathname === "/student/dashboard" && (
              <StudentPortal
                jobs={jobs}
                onAddEvaluation={handleAddEvaluation}
                onNavigateHome={() => navigate("/")}
                studentProfile={studentProfile}
                onLogout={handleLogout}
              />
            )}

            {pathname === "/officer/dashboard" && (
              <OfficerConsole
                jobs={jobs}
                candidates={candidates}
                evaluations={evaluations}
                onAddJob={handleAddJob}
                onDeleteJob={handleDeleteJob}
                onResetSeed={handleResetSeed}
                onNavigateHome={() => navigate("/")}
                onLogout={handleLogout}
                onReviewCandidate={(candidate, evaluation) => {
                  const matchedJob = jobs.find(j => j.id === evaluation.jobId);
                  if (matchedJob) {
                    setActiveReview({ candidate, evaluation, job: matchedJob });
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* One-Time Role Picker Screen for First-Time Google Sign-Ins */}
      {session?.user && userRole === null && !isAuthLoading && (
        <div className="fixed inset-0 bg-[#0B1F3A]/95 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl relative text-brand-text">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#00D9C0]/10 border border-[#00D9C0]/30 text-[10px] font-mono uppercase text-[#00D9C0] mb-3 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#00D9C0] animate-pulse" />
                <span>First-Time Account Setup</span>
              </div>
              <h3 className="text-2xl font-bold text-white font-display">Select Your Access Role</h3>
              <p className="text-xs text-brand-text-muted mt-2 font-sans leading-relaxed">
                Welcome to Placement AI! Please choose your account type to save your preferences to your profile and proceed to your dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              {/* Option 1: Student */}
              <button
                type="button"
                onClick={() => handleSelectRole("student")}
                disabled={isSubmittingRole}
                className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-brand-purple/20 hover:border-brand-purple/50 transition-all text-left group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 rounded-lg bg-brand-purple/20 text-brand-purple w-fit mb-3 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white font-display mb-1">
                    I am a Student
                  </h4>
                  <p className="text-[11px] text-brand-text-muted leading-normal font-sans">
                    Upload resumes, view ATS scores, match job roles, and track skill growth.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-[#00D9C0] uppercase font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Select Student</span> &rarr;
                </div>
              </button>

              {/* Option 2: Officer */}
              <button
                type="button"
                onClick={() => handleSelectRole("officer")}
                disabled={isSubmittingRole}
                className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#00D9C0]/20 hover:border-[#00D9C0]/50 transition-all text-left group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 rounded-lg bg-[#00D9C0]/20 text-[#00D9C0] w-fit mb-3 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white font-display mb-1">
                    I am a Placement Officer
                  </h4>
                  <p className="text-[11px] text-brand-text-muted leading-normal font-sans">
                    Post job openings, screen applicant rosters, override eligibility flags, and view analytics.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-[#00D9C0] uppercase font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Select Officer</span> &rarr;
                </div>
              </button>
            </div>

            {isSubmittingRole && (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#00D9C0] mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving choice to profiles table...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Detail Overlay for newly signed-up Google Officers */}
      {session?.user && pathname === "/officer/dashboard" && userRole === null && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple/15 border border-brand-purple/30 text-[10px] font-mono uppercase text-brand-purple mb-3">
                <Sparkles className="w-3 h-3 text-brand-cyan" />
                <span>Additional Detail Required</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">Complete Registration</h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Please enter your associated College or Institution name to finalize your officer account.
              </p>
            </div>

            {officerRegError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs mb-4">
                {officerRegError}
              </div>
            )}

            <form onSubmit={handleCompleteOfficerRegistration} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">College / Institution Name</label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={collegeNameInput}
                    onChange={(e) => setCollegeNameInput(e.target.value)}
                    placeholder="e.g. Indian Institute of Technology"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCompletingOfficerReg}
                className="w-full btn-premium text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCompletingOfficerReg ? (
                  <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Saving Profile...
                  </>
                ) : (
                  "Complete Account Setup"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Review Modal */}
      {activeReview && (
        <EvaluationModal
          candidate={activeReview.candidate}
          evaluation={activeReview.evaluation}
          job={activeReview.job}
          onClose={() => setActiveReview(null)}
          onSaveOverride={handleSaveOverride}
        />
      )}

      {/* Global Footer */}
      <footer className="py-4 px-8 border-t border-white/5 text-[10px] text-[#c2c6d6]/50 font-mono tracking-wider shrink-0 bg-[#070c24]/80 backdrop-blur-sm z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>&copy; 2026 Placement AI &bull; Mission Control Hub</span>
        <div className="flex gap-4 items-center">
          <span>System Status: Optimal</span>
          <span className="text-[#4cd7f6] flex items-center gap-1.5 font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6]/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4cd7f6]"></span>
            </span>
            Adaptive Gemini Shield Enabled
          </span>
        </div>
      </footer>

      {/* Modern AI Voice Calling Portal */}
      <VoiceAssistant />

    </div>
  );
}
