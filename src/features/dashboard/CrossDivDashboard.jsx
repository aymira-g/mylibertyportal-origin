import { useState, Suspense, lazy } from "react";
import { Layers, GraduationCap, Baby, LayoutDashboard } from "lucide-react";
import { ErrorBoundary } from "../shared";

// Lazy-load each division's full dashboard to keep chunks separate.
// These are the same dashboard components used for single-division routing,
// preserving all existing logic and behaviour unmodified.
const ManagerDashboard = lazy(() => import("./ManagerDashboard"));
const KidsManagerDashboard = lazy(() => import("./kids/KidsManagerDashboard"));
const FrontOfficeDashboard = lazy(() => import("./FrontOfficeDashboard"));
const KidsFrontOfficeDashboard = lazy(() => import("./kids/KidsFrontOfficeDashboard"));

/** Matches the LoadingFallback in App.jsx */
function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      Loading…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview — cross-divisional summary. Deliberately NOT a merged operational
// table. This is a high-level orientation screen only.
// ---------------------------------------------------------------------------

function CrossDivOverview({ role }) {
  const isManager = role === "manager";

  return (
    <div className="w-full space-y-6">
      {/* Identity banner */}
      <div className="bg-gradient-to-br from-[#1a3a8f] via-[#152e74] to-indigo-950 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">Cross-Divisional Dashboard</h1>
            <p className="text-indigo-200 text-xs font-medium mt-0.5">
              {isManager ? "Operations Manager" : "Front Office"} · All Divisions
            </p>
          </div>
        </div>
        <p className="text-indigo-200/80 text-xs leading-relaxed pl-12">
          You are authorized across <strong className="text-white">Course Academy</strong> and{" "}
          <strong className="text-white">Kids School</strong>. Use the segment tabs below to switch
          into each division&apos;s full operational dashboard.
        </p>
      </div>

      {/* Segment guide cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Courses card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Course Academy</h2>
              <p className="text-[11px] text-slate-500 font-medium">English · TOEFL · Professional</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isManager
              ? "Staff roster, class coverage, outreach tracking, and daily cash overview for the Courses division."
              : "Student registration, cashier, walk-in inquiries, and schedule board for the Courses division."}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Switch to the <strong>Courses</strong> tab to operate
          </div>
        </div>

        {/* Kindergarten card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Baby className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Kids School</h2>
              <p className="text-[11px] text-slate-500 font-medium">PAUD · TK-A · TK-B · Nursery</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isManager
              ? "Kids class management, kindergarten student roster, and divisional operations for Kids School."
              : "Kindergarten student registration, cashier, and schedule board for the Kids School division."}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Switch to the <strong>Kindergarten</strong> tab to operate
          </div>
        </div>
      </div>

      {/* Authorization notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
          <strong>Authorization scope:</strong> Your account holds{" "}
          <code className="bg-amber-100 px-1 rounded text-amber-800 font-mono">division = &quot;all&quot;</code>,
          granting explicit read/write access to both divisions within your assigned branch.
          Firestore security rules enforce this — no cross-branch access is granted.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segment tab bar
// ---------------------------------------------------------------------------

const SEGMENTS = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "courses", label: "Courses", Icon: GraduationCap },
  { id: "kindergarten", label: "Kindergarten", Icon: Baby },
];

function SegmentBar({ active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Division segment selector"
      className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-full sm:w-auto"
    >
      {SEGMENTS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            id={`crossdiv-seg-${id}`}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? "bg-white text-[#1a3a8f] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label === "Kindergarten" ? "Kids" : label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CrossDivDashboard — public export
//
// Props:
//   role: "manager" | "frontoffice" | "opslead" | "frontofficelead" — controls
//         which existing dashboards are rendered for Courses & Kindergarten tabs.
// ---------------------------------------------------------------------------

export default function CrossDivDashboard({ role = "manager" }) {
  const [activeSegment, setActiveSegment] = useState("overview");

  const isManager = role === "manager";

  return (
    <div className="w-full space-y-4">
      {/* Top segment selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Division</span>
        </div>
        <SegmentBar active={activeSegment} onChange={setActiveSegment} />
      </div>

      {/* Segment content */}
      <div role="tabpanel" aria-labelledby={`crossdiv-seg-${activeSegment}`}>
        {activeSegment === "overview" && (
          <CrossDivOverview role={role} />
        )}

        {activeSegment === "courses" && (
          <ErrorBoundary label="Courses dashboard">
            <Suspense fallback={<SectionLoading />}>
              {isManager ? (
                <ManagerDashboard />
              ) : (
                <FrontOfficeDashboard role={role} />
              )}
            </Suspense>
          </ErrorBoundary>
        )}

        {activeSegment === "kindergarten" && (
          <ErrorBoundary label="Kindergarten dashboard">
            <Suspense fallback={<SectionLoading />}>
              {isManager ? (
                <KidsManagerDashboard />
              ) : (
                <KidsFrontOfficeDashboard />
              )}
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
