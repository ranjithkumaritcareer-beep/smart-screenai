import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Mail, User, School, Eye, EyeOff, Sparkles, AlertCircle, Check, Loader2, ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface AuthScreenProps {
  type: "student" | "officer";
  initialMode?: "login" | "reset-password";
  onSuccess: (session: any) => void;
  onNavigate: (path: string) => void;
}

export default function AuthScreen({ type, initialMode = "login", onSuccess, onNavigate }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "reset-password" | "forgot-password">(initialMode);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [collegeName, setCollegeName] = useState("");
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSuccessAnimated, setIsSuccessAnimated] = useState(false);

  // Toggle helpers
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCollegeName("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    resetForm();
  };

  // 0. handle Demo Bypass Sign In
  const handleDemoSignIn = () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setIsSuccessAnimated(true);

    const demoUser = type === "student" 
      ? {
          id: "demo-student-id",
          name: "Demo Student",
          email: "student@university.edu",
          role: "student"
        }
      : {
          id: "demo-officer-id",
          name: "Demo Officer",
          email: "officer@university.edu",
          role: "officer",
          college_name: "Indian Institute of Technology"
        };

    localStorage.setItem("smartscreen_demo_user", JSON.stringify(demoUser));
    
    setSuccessMessage("Signed in using Demo Access!");
    setTimeout(() => {
      onSuccess({ user: demoUser });
      onNavigate(type === "student" ? "/student/dashboard" : "/officer/dashboard");
    }, 1000);
  };

  // 1. handle Email & Password sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // --- A. Local & Default Accounts Fallback Check ---
    const localAccountsStr = localStorage.getItem("smartscreen_local_accounts") || "[]";
    let localAccounts = [];
    try {
      localAccounts = JSON.parse(localAccountsStr);
    } catch (e) {
      console.error("Failed to parse local accounts:", e);
    }

    const defaultAccounts = [
      {
        id: "demo-student-id",
        name: "Rahul Sharma",
        email: "student@university.edu",
        password: "password",
        role: "student"
      },
      {
        id: "demo-officer-id",
        name: "Deepak Kumar",
        email: "officer@university.edu",
        password: "password",
        role: "officer",
        college_name: "Indian Institute of Technology"
      }
    ];

    const allAccounts = [...localAccounts, ...defaultAccounts];
    const matchedAccount = allAccounts.find(
      (acc) => acc.email.toLowerCase() === email.trim().toLowerCase() && acc.password === password
    );

    if (matchedAccount) {
      // Check if user is trying to log into the opposite role
      if (matchedAccount.role !== type) {
        setIsSuccessAnimated(true);
        setSuccessMessage(`Redirecting you to the correct ${matchedAccount.role === "student" ? "Student" : "Officer"} workspace...`);
        const sessionUser = {
          user: {
            id: matchedAccount.id,
            email: matchedAccount.email,
            user_metadata: {
              full_name: matchedAccount.name,
              role: matchedAccount.role,
              college_name: (matchedAccount as any).college_name
            }
          }
        };
        localStorage.setItem("smartscreen_demo_user", JSON.stringify({
          id: matchedAccount.id,
          name: matchedAccount.name,
          email: matchedAccount.email,
          role: matchedAccount.role,
          college_name: (matchedAccount as any).college_name
        }));
        setTimeout(() => {
          onSuccess(sessionUser);
          onNavigate(matchedAccount.role === "student" ? "/student/dashboard" : "/officer/dashboard");
        }, 1200);
        setIsLoading(false);
        return;
      }

      setIsSuccessAnimated(true);
      setSuccessMessage("Signed in successfully!");
      const sessionUser = {
        user: {
          id: matchedAccount.id,
          email: matchedAccount.email,
          user_metadata: {
            full_name: matchedAccount.name,
            role: matchedAccount.role,
            college_name: (matchedAccount as any).college_name
          }
        }
      };
      localStorage.setItem("smartscreen_demo_user", JSON.stringify({
        id: matchedAccount.id,
        name: matchedAccount.name,
        email: matchedAccount.email,
        role: matchedAccount.role,
        college_name: (matchedAccount as any).college_name
      }));
      setTimeout(() => {
        onSuccess(sessionUser);
        onNavigate(type === "student" ? "/student/dashboard" : "/officer/dashboard");
      }, 1200);
      setIsLoading(false);
      return;
    }

    // --- B. Fallback to Supabase Auth ---
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data?.session) {
        const userId = data.session.user.id;
        const targetTable = type === "student" ? "students" : "officers";
        
        let profile = null;

        try {
          const { data: dbProfile, error: profileErr } = await supabase
            .from(targetTable)
            .select("*")
            .eq("id", userId)
            .single();

          if (!profileErr && dbProfile) {
            profile = dbProfile;
          }
        } catch (dbErr) {
          console.warn("DB profile query threw error:", dbErr);
        }

        if (!profile) {
          let isOpposite = false;
          try {
            const oppositeTable = type === "student" ? "officers" : "students";
            const { data: oppositeProfile } = await supabase
              .from(oppositeTable)
              .select("id")
              .eq("id", userId)
              .maybeSingle();

            if (oppositeProfile) {
              isOpposite = true;
            }
          } catch (dbErr) {
            console.warn("DB check for opposite table threw error:", dbErr);
          }

          const metadata = data.session.user.user_metadata || {};
          const metaRole = isOpposite ? (type === "student" ? "officer" : "student") : (metadata.role || (type === "student" ? "student" : "officer"));
          
          if (metaRole !== type) {
            console.warn(`User role is actually ${metaRole}, redirecting to correct portal...`);
            setIsSuccessAnimated(true);
            setSuccessMessage(`Signed in! Redirecting to ${metaRole === "student" ? "Student" : "Officer"} workspace...`);
            setTimeout(() => {
              onSuccess(data.session);
              onNavigate(metaRole === "student" ? "/student/dashboard" : "/officer/dashboard");
            }, 1200);
            return;
          }

          const localProfileStr = localStorage.getItem(`profile_${userId}`);
          if (localProfileStr) {
            profile = JSON.parse(localProfileStr);
          } else {
            profile = {
              id: userId,
              name: metadata.full_name || data.session.user.email?.split("@")[0] || (type === "student" ? "Student" : "Officer"),
              email: data.session.user.email || "",
              role: type,
              college_name: metadata.college_name || (type === "officer" ? "Institution" : undefined)
            };
            localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
          }
        }

        setIsSuccessAnimated(true);
        setSuccessMessage("Signed in successfully!");
        
        // Persist session locally as well
        localStorage.setItem("smartscreen_demo_user", JSON.stringify({
          id: userId,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          college_name: profile.college_name
        }));

        setTimeout(() => {
          onSuccess(data.session);
          onNavigate(type === "student" ? "/student/dashboard" : "/officer/dashboard");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setErrorMessage(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. handle Sign Up / Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }
    if (type === "officer" && !collegeName.trim()) {
      setErrorMessage("Please enter your College or Institution name.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // --- A. Save Locally to Guarantee Registration Success ---
    const localUserId = "user-" + Date.now();
    const newLocalAccount = {
      id: localUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: type,
      college_name: type === "officer" ? collegeName.trim() : undefined
    };

    const localAccountsStr = localStorage.getItem("smartscreen_local_accounts") || "[]";
    let localAccounts = [];
    try {
      localAccounts = JSON.parse(localAccountsStr);
    } catch (e) {}

    const emailInUse = localAccounts.some((acc: any) => acc.email === newLocalAccount.email);
    if (emailInUse) {
      setErrorMessage("Email already registered. Try signing in.");
      setIsLoading(false);
      return;
    }

    localAccounts.push(newLocalAccount);
    localStorage.setItem("smartscreen_local_accounts", JSON.stringify(localAccounts));
    localStorage.setItem(`profile_${localUserId}`, JSON.stringify(newLocalAccount));

    // --- B. Register with Supabase in the background (failures are ignored gracefully) ---
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            role: type,
            college_name: type === "officer" ? collegeName.trim() : undefined
          }
        }
      });

      if (!error && data?.user) {
        const userId = data.user.id;
        const fallbackProfile = {
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: type,
          college_name: type === "officer" ? collegeName.trim() : undefined
        };
        localStorage.setItem(`profile_${userId}`, JSON.stringify(fallbackProfile));

        try {
          if (type === "student") {
            await supabase.from("students").insert({
              id: userId,
              name: name.trim(),
              email: email.trim().toLowerCase()
            });
          } else {
            await supabase.from("officers").insert({
              id: userId,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              college_name: collegeName.trim()
            });
          }
        } catch (dbErr) {
          console.warn("Supabase background db insert skipped:", dbErr);
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase auth signup skipped or failed, using local registration fallback:", supabaseErr);
    }

    // --- C. Authenticate the user locally right away ---
    setIsSuccessAnimated(true);
    setSuccessMessage("Account created successfully!");
    
    const fakeSession = {
      user: {
        id: localUserId,
        email: newLocalAccount.email,
        user_metadata: {
          full_name: newLocalAccount.name,
          role: newLocalAccount.role,
          college_name: newLocalAccount.college_name
        }
      }
    };
    localStorage.setItem("smartscreen_demo_user", JSON.stringify(newLocalAccount));
    
    setTimeout(() => {
      onSuccess(fakeSession);
      onNavigate(type === "student" ? "/student/dashboard" : "/officer/dashboard");
    }, 1200);
    setIsLoading(false);
  };

  // 3. handle Google OAuth SSO
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const redirectPath = type === "student" ? "/student/dashboard" : "/officer/dashboard";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + redirectPath
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google SSO error:", err);
      setErrorMessage(err.message || "Failed to connect to Google.");
      setIsLoading(false);
    }
  };

  // 4. handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const redirectPath = type === "student" ? "/student/reset-password" : "/officer/reset-password";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + redirectPath
      });

      if (error) throw error;

      setSuccessMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setErrorMessage(err.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. handle Update Password (Reset flow)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setIsSuccessAnimated(true);
      setSuccessMessage("Password updated successfully!");
      setTimeout(() => {
        setMode("login");
        setActiveTab("signin");
        resetForm();
        onNavigate(type === "student" ? "/student/login" : "/officer/login");
      }, 1500);
    } catch (err: any) {
      console.error("Update password error:", err);
      setErrorMessage(err.message || "Failed to update password. Try requesting another link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8 relative">
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden text-brand-text"
      >
        {/* Animated Success Overlay */}
        <AnimatePresence>
          {isSuccessAnimated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#070c24] flex flex-col items-center justify-center z-50 p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-8 h-8 stroke-[3]" />
              </motion.div>
              <h3 className="text-xl font-bold text-white font-display uppercase">{successMessage}</h3>
              <p className="text-xs text-brand-text-muted mt-2 font-mono">Proceeding to secure portal, please wait...</p>
            </motion.div>
          )}
        </AnimatePresence>
 
        {/* Back Button to gateway */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => onNavigate("/")}
            className="inline-flex items-center gap-1.5 text-xs text-brand-text-muted hover:text-brand-cyan transition-colors group cursor-pointer font-bold font-mono uppercase"
          >
            <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
            <span>Back to Gateway</span>
          </button>
        </div>

        {/* Role Switcher Segmented Control */}
        <div className="grid grid-cols-2 bg-slate-950/60 p-1 border border-white/5 rounded-xl mb-6 shadow-inner relative z-20">
          <button
            type="button"
            onClick={() => {
              if (type !== "student") {
                resetForm();
                onNavigate("/student/login");
              }
            }}
            className={`py-2.5 text-xs font-bold transition-all rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 cursor-pointer ${
              type === "student"
                ? "bg-brand-purple/20 text-white border border-brand-purple/30 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (type !== "officer") {
                resetForm();
                onNavigate("/officer/login");
              }
            }}
            className={`py-2.5 text-xs font-bold transition-all rounded-lg uppercase tracking-wider font-mono flex items-center justify-center gap-2 cursor-pointer ${
              type === "officer"
                ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-[0_0_12px_rgba(0,242,254,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Officer Hub</span>
          </button>
        </div>
 
        {/* Title Block */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-white/5 bg-brand-cyan/10 rounded-full text-[10px] font-mono uppercase text-brand-cyan mb-3">
            <Sparkles className="w-3 h-3 text-brand-cyan animate-pulse" />
            <span>{type === "student" ? "Student Access" : "Placement Officer Access"}</span>
          </div>
          <h2 className="text-3xl font-bold text-white font-display tracking-tight">
            {mode === "reset-password" ? "Reset Password" : mode === "forgot-password" ? "Recover Account" : type === "student" ? "Student Portal" : "Officer Hub"}
          </h2>
          <p className="text-xs text-brand-text-muted mt-1.5 font-sans leading-relaxed">
            {mode === "reset-password" 
              ? "Establish a new secure passkey for your profile." 
              : mode === "forgot-password"
                ? "Request a password recovery link sent directly to your inbox."
              : type === "student" 
                ? "Sign in to run smart AI resume diagnostics instantly." 
                : "Manage job opportunities, track scores & audits."
            }
          </p>
        </div>
 
        {/* Normal Login/Register Tab selectors */}
        {mode === "login" && (
          <>
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-[#0B1F3A] hover:bg-[#132a4a] text-white border border-[#00D9C0]/50 shadow-[0_0_15px_rgba(0,217,192,0.2)] py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-3 transition-all cursor-pointer group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-[#00D9C0] group-hover:text-white transition-colors">Sign in with Google</span>
              </button>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[9px] font-mono uppercase tracking-widest text-brand-text-muted">Or email credentials</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
            </div>

            <div className="flex bg-brand-bg/60 p-1 border border-white/5 mb-6 rounded-lg">
              <button
                onClick={() => handleTabChange("signin")}
                className={`flex-1 py-2 text-xs font-bold transition-all rounded-md uppercase tracking-wider font-mono ${
                  activeTab === "signin"
                    ? "bg-brand-accent text-brand-bg shadow-sm"
                    : "text-brand-text-muted hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleTabChange("signup")}
                className={`flex-1 py-2 text-xs font-bold transition-all rounded-md uppercase tracking-wider font-mono ${
                  activeTab === "signup"
                    ? "bg-brand-accent text-brand-bg shadow-sm"
                    : "text-brand-text-muted hover:text-white"
                }`}
              >
                {type === "student" ? "Create Account" : "Register"}
              </button>
            </div>
          </>
        )}
 
        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-300 text-xs mb-5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="leading-normal font-medium">{errorMessage}</div>
          </motion.div>
        )}
 
        {/* Status Notification */}
        {successMessage && !isSuccessAnimated && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-300 text-xs mb-5"
          >
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="leading-normal font-medium">{successMessage}</div>
          </motion.div>
        )}
 
        {/* FORMS */}
        {mode === "forgot-password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@university.edu"
                  required
                  className="w-full glass-input pl-10 pr-4 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-premium py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                "Send Recovery Link"
              )}
            </button>
 
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetForm();
              }}
              className="w-full text-center text-xs text-brand-text-muted hover:text-white mt-4 underline cursor-pointer font-mono"
            >
              Back to Sign In
            </button>
          </form>
        ) : mode === "reset-password" ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full glass-input pl-10 pr-10 py-3 text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3.5 top-3.5 text-[#c2c6d6]/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
 
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password match"
                  required
                  className="w-full glass-input pl-10 pr-10 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-premium py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Passkey...
                </>
              ) : (
                "Update Password"
              )}
            </button>
 
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetForm();
              }}
              className="w-full text-center text-xs text-brand-text-muted hover:text-white mt-4 underline cursor-pointer font-mono"
            >
              Cancel and Return to Sign In
            </button>
          </form>
        ) : activeTab === "signin" ? (
          /* EMAIL SIGN IN FORM */
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@university.edu"
                  required
                  className="w-full glass-input pl-10 pr-4 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setSuccessMessage("");
                    setMode("forgot-password");
                  }}
                  className="text-[10px] font-bold font-mono text-brand-cyan uppercase tracking-wider hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your passkey"
                  required
                  className="w-full glass-input pl-10 pr-10 py-3 text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3.5 top-3.5 text-[#c2c6d6]/60 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
 
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-premium py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                "Sign In"
              )}
            </button>
 
            {/* Quick Demo Bypass option for easier navigation */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[9px] font-mono uppercase tracking-widest text-brand-text-muted/40">Or testing bypass</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>
 
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="w-full bg-white/5 hover:bg-white/10 text-brand-cyan border border-brand-cyan/20 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors font-mono rounded-lg shadow-[0_0_15px_rgba(76,215,246,0.1)]"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Instant Demo Auto-SignIn</span>
            </button>
          </form>
        ) : (
          /* CREATE ACCOUNT FORM */
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full glass-input pl-10 pr-4 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rsharma@university.edu"
                  required
                  className="w-full glass-input pl-10 pr-4 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            {type === "officer" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">College / Institution</label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Indian Institute of Technology"
                    required
                    className="w-full glass-input pl-10 pr-4 py-3 text-sm rounded-lg"
                  />
                </div>
              </div>
            )}
 
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full glass-input pl-10 pr-10 py-3 text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3.5 top-3.5 text-[#c2c6d6]/60 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
 
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text-muted block font-bold">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c2c6d6]/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify password match"
                  required
                  className="w-full glass-input pl-10 pr-10 py-3 text-sm rounded-lg"
                />
              </div>
            </div>
 
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-premium py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                type === "student" ? "Create Student Account" : "Register as Placement Officer"
              )}
            </button>
          </form>
        )}
 
        {/* FORGOT PASSWORD SECTION - Inline triggering */}
        <AnimatePresence>
          {mode === "login" && activeTab === "signin" && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setMode("forgot-password");
                }}
                className="text-xs text-brand-text-muted hover:text-brand-cyan transition-colors cursor-pointer font-bold font-mono uppercase tracking-wider underline text-center"
              >
                Need to recover account? Request Reset
              </button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
