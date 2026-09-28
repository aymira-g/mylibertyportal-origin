import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ProfilePanel, LoginPage } from "./features/auth";
import { loginWithGoogle } from "./features/auth/authRepository";
import { isDevSwitcherEnabled } from "./features/auth/devPresets";
import {
  useToast,
  ErrorBoundary,
  ConnectivityBanner,
  DevQuickSwitcher,
  PreviewModeProvider,
} from "./features/shared";
import { normalizeRole } from "./features/shared/roles";
import { InstallButton, PwaUpdateBanner } from "./features/pwa";
import { AlertTriangle } from "lucide-react";
import schoolLogo from "./assets/school-logo.webp";

// Code-split: each of these becomes its own downloaded chunk, fetched
// only when actually needed — an instructor's browser never downloads
// Admin's code, a marketing user never downloads the Kiosk/QR logic, etc.
const RegistrationPage = lazy(() => import("./features/auth/RegistrationPage"));
const StaffSignup = lazy(() => import("./features/auth/StaffSignup"));
const StandaloneKioskPage = lazy(() =>
  import("./features/attendance").then((m) => ({ default: m.StandaloneKioskPage }))
);
const ParentPortalPage = lazy(() =>
  import("./features/students").then((m) => ({ default: m.ParentPortalPage }))
);
const AdminDashboard = lazy(() => import("./features/dashboard/AdminDashboard"));
const FrontOfficeDashboard = lazy(() => import("./features/dashboard/FrontOfficeDashboard"));
const ManagerDashboard = lazy(() => import("./features/dashboard/ManagerDashboard"));
const InstructorDashboard = lazy(() => import("./features/dashboard/InstructorDashboard"));
const MarketingDashboard = lazy(() => import("./features/dashboard/MarketingDashboard"));
const OfficeBoyDashboard = lazy(() => import("./features/dashboard/OfficeBoyDashboard"));
const KidsFrontOfficeDashboard = lazy(() =>
  import("./features/dashboard/kids/KidsFrontOfficeDashboard")
);
const KidsManagerDashboard = lazy(() => import("./features/dashboard/kids/KidsManagerDashboard"));
const KidsInstructorDashboard = lazy(() =>
  import("./features/dashboard/kids/KidsInstructorDashboard")
);
const ParentDashboard = lazy(() => import("./features/dashboard/ParentDashboard"));

import { normalizeDivision, DEFAULT_DIVISION } from "./constants/divisions";

function LoadingFallback() {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

// ── IDLE TIMEOUT CONFIG ──
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 30 * 1000; // 30 seconds

function App() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [division, setDivision] = useState(DEFAULT_DIVISION);
  const [branch, setBranch] = useState("kota_gorontalo");
  const [previewRole, setPreviewRole] = useState(null);
  const [previewDivision, setPreviewDivision] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [profileError, setProfileError] = useState("");

  const isPreviewAllowed = Boolean(isDevSwitcherEnabled);
  const canUseDevSwitcher = Boolean(isDevSwitcherEnabled || normalizeRole(role) === "admin");

  const effectiveRole = (isPreviewAllowed && previewRole) || role;
  const effectiveDivision = (isPreviewAllowed && previewDivision) || division;

  const handleClearPreview = useCallback(() => {
    setPreviewRole(null);
    setPreviewDivision(null);
  }, []);

  const resetUserState = useCallback(() => {
    setUser(null);
    setRole("");
    setDivision(DEFAULT_DIVISION);
    setBranch("kota_gorontalo");
    setPreviewRole(null);
    setPreviewDivision(null);
    setDisplayName("");
    setNickname("");
    setPhotoURL("");
    setIdleWarning(false);
    setProfileOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("SignOut rejection caught:", err);
    } finally {
      resetUserState();
    }
  }, [resetUserState]);

  useEffect(() => {
    if (!user) return;

    let warningTimer;
    let logoutTimer;

    const resetTimers = () => {
      setIdleWarning(false);
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);

      warningTimer = setTimeout(() => setIdleWarning(true), IDLE_TIMEOUT - WARNING_TIME);
      logoutTimer = setTimeout(() => {
        handleLogout();
      }, IDLE_TIMEOUT);
    };

    // Events to watch for activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((e) => document.addEventListener(e, resetTimers));

    resetTimers(); // Initial start

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimers));
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [user, handleLogout]);

  const refreshProfile = useCallback(
    async (uid) => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const status = data.status || "active";
        if (status === "resigned" || status === "terminated") {
          await handleLogout();
          toast(
            "Your account has been deactivated. Please contact academy administration.",
            "error"
          );
          return false;
        }
        setRole(data.role || "student");
        setDivision(normalizeDivision(data.division));
        setBranch(data.branchId || data.branch || "kota_gorontalo");
        setDisplayName(data.displayName || "");
        setNickname(data.nickname || data.displayName || "");
        setPhotoURL(data.photoURL || "");
        return true;
      }
      // If no Firestore profile document exists yet for this auth user, populate display info from auth token if available
      const currentAuth = auth.currentUser;
      if (currentAuth) {
        setDisplayName(currentAuth.displayName || "");
        setNickname(currentAuth.displayName || "");
        setPhotoURL(currentAuth.photoURL || "");
      }
      return true;
    },
    [toast, handleLogout]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setProfileError("");
      if (currentUser) {
        try {
          const ok = await refreshProfile(currentUser.uid);
          if (ok) {
            setUser(currentUser);
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setProfileError(
            err.message || "Failed to load user profile. Please check your network connection."
          );
          setUser(currentUser);
        }
      } else {
        resetUserState();
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [refreshProfile, resetUserState]);

  // Live Active Session Termination Guard (R20)
  useEffect(() => {
    if (!user) return;
    const unsubDoc = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const status = data.status || "active";
          if (status === "resigned" || status === "terminated") {
            toast("Your account has been deactivated. You have been signed out.", "error");
            handleLogout();
          }
        }
      },
      (err) => {
        console.warn("Active session monitor warning:", err);
      }
    );
    return () => unsubDoc();
  }, [user, toast, handleLogout]);

  // Public route — no login required.
  if (window.location.pathname === "/register") {
    return (
      <ErrorBoundary label="Registration page">
        <Suspense fallback={<LoadingFallback />}>
          <RegistrationPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 👈 New Public route for staff invitation links
  if (window.location.pathname.startsWith("/join/")) {
    return (
      <ErrorBoundary label="Staff invitation page">
        <Suspense fallback={<LoadingFallback />}>
          <StaffSignup />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Standalone Kiosk Routes (/kiosk, /kiosk/staff, /kiosk/students)
  if (window.location.pathname.startsWith("/kiosk")) {
    return (
      <ErrorBoundary label="Standalone Attendance Kiosk">
        <Suspense fallback={<LoadingFallback />}>
          <StandaloneKioskPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Parent & Student Progress Portal (/parent, /portal, /parent-portal)
  if (
    window.location.pathname.startsWith("/parent") ||
    window.location.pathname.startsWith("/portal")
  ) {
    return (
      <ErrorBoundary label="Parent & Student Information Portal">
        <Suspense fallback={<LoadingFallback />}>
          <ParentPortalPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // 👈 3. Re-engineered to receive inputs from LoginPage
  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      toast("Login Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      if (err?.code === "auth/unauthorized-domain") {
        toast(
          "Domain not authorized in Firebase Console > Authentication > Settings > Authorized domains.",
          "error"
        );
        return;
      }
      toast("Google Sign-In Error: " + (err?.message || "Failed to sign in"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <LoadingFallback />;
  }

  if (profileError && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">Unable to Load Profile</h2>
            <p className="text-xs text-slate-500 mt-1">{profileError}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
            >
              Sign Out
            </button>
            <button
              onClick={async () => {
                setCheckingAuth(true);
                setProfileError("");
                try {
                  const ok = await refreshProfile(user.uid);
                  if (ok) setUser(user);
                } catch (err) {
                  setProfileError(err.message || "Retry failed. Please check network connection.");
                } finally {
                  setCheckingAuth(false);
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a3a8f] hover:bg-[#122b6e] text-white font-bold text-xs shadow-xs cursor-pointer transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 👈 4. Render your beautiful, dedicated LoginPage
  if (!user) {
    return (
      <>
        <ConnectivityBanner />
        <PwaUpdateBanner />
        <LoginPage
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          loading={loading}
        />
      </>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col justify-between">
      <ConnectivityBanner />
      <PwaUpdateBanner />
      <div>
        {/* Desktop Top Navigation Bar (md and above - 100% untouched) */}
        <div className="hidden md:block bg-white p-3.5 sm:p-4 md:px-6 shadow-xs border-b border-slate-200/80">
          <div className="flex justify-between items-center w-full mx-auto gap-4">
            {/* Top Left: School Branding */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src={schoolLogo}
                alt="My Liberty Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-slate-50 border border-slate-200/80 p-1 shadow-xs"
              />
              <div className="flex flex-col">
                <span className="font-black text-[#1a3a8f] text-sm sm:text-base leading-none tracking-tight">
                  MY LIBERTY
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#1a3a8f]/80 leading-tight mt-0.5">
                  Fresh, Fun and Elegant
                </span>
              </div>
            </div>

            {/* Top Right: User Profile Button & Sign Out */}
            <div className="flex items-center gap-3">
              <InstallButton variant="pill" showText={true} />
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2.5 text-left group min-w-0"
              >
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Profile"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border group-hover:ring-2 ring-[#1a3a8f] shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1a3a8f] text-white flex items-center justify-center font-bold text-xs sm:text-sm group-hover:ring-2 ring-offset-1 ring-[#1a3a8f] shrink-0">
                    {getInitials(nickname || displayName)}
                  </div>
                )}
                <div className="hidden sm:block min-w-0">
                  <h3 className="font-bold text-gray-800 text-xs sm:text-sm truncate max-w-[140px] md:max-w-[200px]">
                    {nickname || displayName || user.email}
                  </h3>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded uppercase">
                    {role} {division === "kindergarten" ? "· Kindergarten" : ""}
                  </span>
                </div>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <button
                onClick={handleLogout}
                className="text-xs text-[#1a3a8f] hover:underline font-bold shrink-0 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Unified Top App Bar (< md) with safe-area support */}
        <div className="md:hidden bg-white/95 backdrop-blur-md px-3.5 py-2.5 border-b border-slate-200/80 pt-safe sticky top-0 z-30 shadow-2xs">
          <div className="flex justify-between items-center w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={schoolLogo}
                alt="My Liberty Logo"
                className="w-7 h-7 rounded-lg object-contain bg-slate-50 border border-slate-200/80 p-0.5 shadow-2xs shrink-0"
              />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-[#1a3a8f] text-xs tracking-tight truncate">
                  MY LIBERTY
                </span>
                <span className="text-[9px] bg-indigo-50 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-full border border-indigo-100 uppercase shrink-0">
                  {role} {division === "kindergarten" ? "· TK" : ""}
                </span>
              </div>
            </div>

            {/* Mobile Right: Avatar Button opening ProfilePanel */}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-1.5 text-left active:scale-95 transition shrink-0 p-0.5 cursor-pointer"
              aria-label="Open user profile"
            >
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1a3a8f] text-white flex items-center justify-center font-extrabold text-[10px] shadow-2xs">
                  {getInitials(nickname || displayName)}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mode 2 Preview Sticky Warning Banner */}
        {isPreviewAllowed && previewRole && (
          <div className="bg-amber-500 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-40 border-b border-amber-600 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100" />
              <span className="truncate">
                <strong>UI Preview Mode:</strong> [{previewRole.toUpperCase()} ·{" "}
                {effectiveDivision === "kindergarten" ? "Kindergarten" : "English Studio"}] — Layout only. Data &amp; writes belong to your real session ({user?.email || "user"}).
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearPreview}
              className="bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
            >
              Exit Preview
            </button>
          </div>
        )}

        <div className="p-3 sm:p-4 md:p-6 w-full">
          {/* Dynamic Role Router Switcher — wrapped in PreviewModeProvider for write protection */}
          <PreviewModeProvider
            isPreviewMode={Boolean(isPreviewAllowed && previewRole)}
            previewRole={isPreviewAllowed ? previewRole : null}
            previewDivision={effectiveDivision}
            exitPreview={handleClearPreview}
          >
            <Suspense fallback={<LoadingFallback />}>
              {effectiveRole === "admin" && (
                <ErrorBoundary label="Admin dashboard">
                  <AdminDashboard />
                </ErrorBoundary>
              )}
              {effectiveRole === "manager" && (
                <ErrorBoundary label="Manager dashboard">
                  {effectiveDivision === "kindergarten" ? (
                    <KidsManagerDashboard />
                  ) : (
                    <ManagerDashboard />
                  )}
                </ErrorBoundary>
              )}
              {(effectiveRole === "instructor" ||
                effectiveRole === "instructorleader" ||
                effectiveRole === "instructor_leader") && (
                <ErrorBoundary label="Instructor dashboard">
                  {effectiveDivision === "kindergarten" ? (
                    <KidsInstructorDashboard />
                  ) : (
                    <InstructorDashboard role={effectiveRole} />
                  )}
                </ErrorBoundary>
              )}
              {(effectiveRole === "frontoffice" ||
                effectiveRole === "opslead" ||
                effectiveRole === "ops_lead" ||
                effectiveRole === "frontofficelead") && (
                <ErrorBoundary label="Front Office dashboard">
                  {effectiveDivision === "kindergarten" ? (
                    <KidsFrontOfficeDashboard />
                  ) : (
                    <FrontOfficeDashboard role={effectiveRole} />
                  )}
                </ErrorBoundary>
              )}
              {effectiveRole === "marketing" && (
                <ErrorBoundary label="Marketing dashboard">
                  <MarketingDashboard />
                </ErrorBoundary>
              )}
              {effectiveRole === "officeboy" && (
                <ErrorBoundary label="Office Boy dashboard">
                  <OfficeBoyDashboard />
                </ErrorBoundary>
              )}
              {effectiveRole === "parent" && (
                <ErrorBoundary label="Parent dashboard">
                  <ParentDashboard user={user} />
                </ErrorBoundary>
              )}
              {![
                "admin",
                "manager",
                "instructor",
                "instructorleader",
                "instructor_leader",
                "marketing",
                "frontoffice",
                "opslead",
                "ops_lead",
                "frontofficelead",
                "officeboy",
                "parent",
              ].includes(effectiveRole) && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-600 text-sm max-w-md mx-auto space-y-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-lg font-bold">
                    🔒
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Account Pending Role Assignment</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Signed in as <strong className="text-slate-700">{user?.email}</strong>. This account does not have a staff or parent role assigned yet. Please contact your academy administrator.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </Suspense>
          </PreviewModeProvider>
        </div>
      </div>

      {/* Global Application Footer (Desktop only) */}
      <footer className="hidden md:block mt-auto border-t border-slate-200/80 bg-white/80 py-4 px-4 sm:px-6">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-500 text-xs">
          <div className="flex flex-col gap-0.5 text-left">
            <span>&copy; {new Date().getFullYear()} MY LIBERTY International English School</span>
            <a
              href="https://github.com/aymira-git/mylibertyportal-public"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:text-[#1a3a8f] underline font-mono transition"
            >
              https://github.com/aymira-git/mylibertyportal-public
            </a>
          </div>
          <div className="flex items-center gap-3">
            <InstallButton variant="subtle" showText={true} />
            <div className="text-[11px] font-semibold text-slate-400">
              Internal Academic & Operations Portal
            </div>
          </div>
        </div>
      </footer>

      {profileOpen && (
        <ErrorBoundary label="Profile panel">
          <ProfilePanel
            onClose={() => setProfileOpen(false)}
            onUpdated={() => refreshProfile(user.uid)}
            onLogout={handleLogout}
          />
        </ErrorBoundary>
      )}

      {/* 👈 Idle Warning Overlay */}
      {idleWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0c235f]/80 backdrop-blur-md p-6">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border-2 border-amber-400 animate-pulse">
            <p className="text-4xl mb-4">💤</p>
            <h2 className="text-xl font-black text-slate-800">Are you still there?</h2>
            <p className="text-slate-500 text-sm mt-2 mb-6 font-medium">
              You've been idle for a while. For security, you will be logged out in 30 seconds.
            </p>
            <button
              onClick={() => {
                setIdleWarning(false);
                window.dispatchEvent(new Event("mousedown"));
              }}
              className="w-full bg-[#1a3a8f] text-white p-3.5 rounded-xl font-bold hover:bg-[#122b6e] transition shadow-lg"
            >
              Yes, I'm still working!
            </button>
          </div>
        </div>
      )}

      {/* Floating Dev Quick Switcher widget */}
      {canUseDevSwitcher && (
        <DevQuickSwitcher
          currentUser={user}
          realRole={role}
          realDivision={division}
          realBranch={branch}
          previewRole={previewRole}
          previewDivision={previewDivision}
          onSetPreview={(r, d) => {
            setPreviewRole(r);
            setPreviewDivision(d);
          }}
          onClearPreview={handleClearPreview}
          onLogin={handleLogin}
          onLogout={handleLogout}
          loading={loading}
        />
      )}
    </div>
  );
}

export default App;
