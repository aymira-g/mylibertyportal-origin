import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import ParentDashboard from "../dashboard/ParentDashboard";
import schoolLogo from "../../assets/school-logo.webp";
import { ShieldAlert, LogIn, ArrowLeft, Loader2 } from "lucide-react";

/**
 * ParentPortalPage
 * Authenticated entry route for parents (/parent, /portal, /parent-portal).
 * Strictly requires authentication and role === "parent".
 * Non-parent authenticated users receive an access-denied state with no data leaked.
 */
export default function ParentPortalPage() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (active) {
            setUserRole(userDoc.exists() ? userDoc.data()?.role : null);
            setLoading(false);
          }
        } catch (err) {
          console.error("Failed to load user role:", err);
          if (active) {
            setUserRole(null);
            setLoading(false);
          }
        }
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#1a3a8f] animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Verifying parent authorization...</p>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full shadow-sm space-y-4">
          <img
            src={schoolLogo}
            alt="My Liberty"
            className="w-14 h-14 mx-auto rounded-xl object-contain bg-slate-50 p-1 border border-slate-200/80 shadow-xs"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-800">My Liberty Parent Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Please log in to your authenticated parent account to view student attendance, tuition status, and progress.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="w-full py-3 bg-[#1a3a8f] text-white rounded-xl font-bold hover:bg-[#122b6e] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Parent Account
          </button>
        </div>
      </div>
    );
  }

  // 2. Authenticated but not a parent account -> Deny access
  if (userRole !== "parent") {
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
