import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useUserProfile, normalizeRole } from "../shared";
import ParentDashboard from "../dashboard/ParentDashboard";
import schoolLogo from "../../assets/school-logo.webp";
import {
  ShieldAlert,
  LogIn,
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

/**
 * ParentPortalPage
 * Authenticated entry route for parents (/parent, /portal, /parent-portal).
 * Strictly requires authentication and role === "parent".
 * Non-parent authenticated users receive an access-denied state with no data leaked.
 */
export default function ParentPortalPage() {
  const { user: currentUser, role: userRole, loading } = useUserProfile();

  // Embedded Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error("Parent login error:", err);
      let msg = "Failed to sign in. Please verify your email and password.";
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password"
      ) {
        msg = "Invalid email or password. Please check your credentials.";
      } else if (err?.code === "auth/too-many-requests") {
        msg = "Too many failed attempts. Please wait a moment and try again.";
      } else if (err?.message) {
        msg = err.message;
      }
      setAuthError(msg);
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setAuthError("Please enter your email address to reset password.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setAuthError(err?.message || "Failed to send reset email.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#1a3a8f] animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Verifying parent authorization...</p>
      </div>
    );
  }

  // 1. Not Authenticated: Render dedicated embedded Parent Login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 max-w-md w-full shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <img
              src={schoolLogo}
              alt="My Liberty"
              className="w-14 h-14 mx-auto rounded-xl object-contain bg-slate-50 p-1 border border-slate-200/80 shadow-xs"
            />
            <h2 className="text-xl font-bold text-slate-800">My Liberty Parent Portal</h2>
            <p className="text-xs text-slate-500">
              Sign in to your authenticated parent account to monitor student attendance, tuition status, and academic progress.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {resetSent ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Password reset link sent to your email. Please check your inbox.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setShowReset(false);
                }}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          ) : showReset ? (
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Parent Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1a3a8f]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#1a3a8f] text-white rounded-xl font-bold hover:bg-[#122b6e] transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>Send Reset Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReset(false);
                  setAuthError("");
                }}
                className="w-full py-2 text-slate-500 text-xs font-semibold hover:text-slate-800 cursor-pointer"
              >
                Cancel and return to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1a3a8f]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReset(true);
                      setAuthError("");
                    }}
                    className="text-[11px] text-[#1a3a8f] hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1a3a8f]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#1a3a8f] text-white rounded-xl font-bold hover:bg-[#122b6e] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Parent Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <span>Staff or Administrator?</span>
              <span className="text-[#1a3a8f] font-semibold underline">Go to Staff Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated but not a parent account -> Deny access
  if (normalizeRole(userRole) !== "parent") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1">
              This portal is strictly reserved for authenticated parent accounts. Non-parent authenticated accounts cannot access parent data.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="w-full py-3 bg-[#1a3a8f] text-white rounded-xl font-bold hover:bg-[#122b6e] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Staff Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. Authenticated parent -> Route to ParentDashboard
  return <ParentDashboard user={currentUser} />;
}
