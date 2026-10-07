import { useMemo } from "react";
import {
  Building2,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { BRANCHES, matchesBranchFilter, branchToId } from "../../../constants/branches";
import { ExecutiveBranchScopeBar } from "./ExecutiveBranchScopeBar";
import { MultiBranchPerformanceGrid } from "./MultiBranchPerformanceGrid";

/**
 * BranchPerformancePanel: Dedicated province-wide multi-branch performance oversight module
 * for the Executive Director (Blueprint §6.1 & Section 7).
 *
 * Provides aggregated comparative performance analysis across all 4 physical branches
 * without exposing low-level branch management CRUD.
 *
 * @param {{
 *   students?: any[],
 *   classes?: any[],
 *   users?: any[],
 *   instructors?: any[],
 *   applications?: any[],
 *   selectedBranch?: string,
 *   onSelectBranch?: (branch: string) => void,
 *   onNavigateToDecisions?: () => void,
 *   onNavigateToRisks?: () => void,
 * }} props
 */
export function BranchPerformancePanel({
  students = [],
  classes = [],
  users = [],
  instructors = [],
  applications = [],
  selectedBranch = "all",
  onSelectBranch,
  onNavigateToDecisions,
  onNavigateToRisks,
}) {
  const branchStats = useMemo(() => {
    return BRANCHES.map((branchName) => {
      const branchId = branchToId(branchName);

      const bStudents = students.filter((s) =>
        matchesBranchFilter(s.branchId || s.branch, branchName)
      );
      const bActiveStudents = bStudents.filter(
        (s) => (s.status || "active") === "active"
      ).length;

      const bClasses = classes.filter((c) =>
        matchesBranchFilter(c.branchId || c.branch, branchName)
      );

      let totalCapacity = 0;
      let enrolledSeats = 0;
      bClasses.forEach((cls) => {
        const cap = Number(cls.capacity) || 12;
        totalCapacity += cap;
        const enrolled = Array.isArray(cls.studentIds) ? cls.studentIds.length : 0;
        enrolledSeats += enrolled;
      });
      const capacityPct =
        totalCapacity > 0 ? Math.round((enrolledSeats / totalCapacity) * 100) : 0;

      const bStaff = users.filter(
        (u) =>
          (u.status || "active") === "active" &&
          matchesBranchFilter(u.branchId || u.branch, branchName)
      ).length;

      const bFaculty = instructors.filter(
        (i) =>
          (i.status || "active") === "active" &&
          matchesBranchFilter(i.branchId || i.branch, branchName)
      ).length;

      const bApps = applications.filter(
        (app) =>
          (app.status || "pending") === "pending" &&
          matchesBranchFilter(app.branchId || app.branch, branchName)
      ).length;

      const ratio = bFaculty > 0 ? (bActiveStudents / bFaculty).toFixed(1) : "0";

      return {
        branchName,
        branchId,
        activeStudents: bActiveStudents,
        activeClasses: bClasses.length,
        totalCapacity,
        enrolledSeats,
        capacityPct,
        branchStaff: bStaff,
        facultyCount: bFaculty,
        ratio,
        branchApps: bApps,
      };
    });
  }, [students, classes, users, instructors, applications]);

  const totalProvinceCapacity = useMemo(() => {
    let totalCap = 0;
    let enrolled = 0;
    classes.forEach((cls) => {
      totalCap += Number(cls.capacity) || 12;
      enrolled += Array.isArray(cls.studentIds) ? cls.studentIds.length : 0;
    });
    return {
      totalCap,
      enrolled,
      fillRate: totalCap > 0 ? Math.round((enrolled / totalCap) * 100) : 0,
    };
  }, [classes]);

  return (
    <div className="space-y-6">
      {/* Executive Branch Performance Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1a3a8f]" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Province-Wide Branch Performance &amp; Campus Comparison
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Strategic evaluation of student capacity, classroom utilization, and academic faculty balance across all 4 physical campuses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onNavigateToDecisions && (
              <button
                type="button"
                onClick={onNavigateToDecisions}
                className="text-xs font-bold text-[#1a3a8f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Decision Center</span>
              </button>
            )}
            {onNavigateToRisks && (
              <button
                type="button"
                onClick={onNavigateToRisks}
                className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Strategic Risks</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Province Capacity Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Province Classroom Seats
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalProvinceCapacity.totalCap}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Maximum concurrent capacity across 4 branches
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Enrolled Seats
            </span>
            <span className="text-2xl font-black text-[#1a3a8f] mt-1 block">
              {totalProvinceCapacity.enrolled}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Currently occupied learner seats
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Province Seat Fill Rate
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {totalProvinceCapacity.fillRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Target benchmark: &ge; 75% utilization
            </span>
          </div>
        </div>
      </div>

      {/* Branch Scope Selector */}
      {onSelectBranch && (
        <ExecutiveBranchScopeBar
          selectedBranch={selectedBranch}
          onSelectBranch={onSelectBranch}
        />
      )}

      {/* Multi-Branch Snapshot Cards */}
      <MultiBranchPerformanceGrid
        branchStats={branchStats}
        selectedBranch={selectedBranch}
        onSelectBranch={onSelectBranch}
        title="Physical Campus Performance Comparison (4 Branches)"
        subtitle="Click any campus card below to inspect branch performance metrics."
      />

      {/* Comparative Performance Matrix Table */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1a3a8f]" />
              Strategic Branch Comparison Matrix
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-branch seat utilization, faculty ratio, and strategic performance ratings.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Target Benchmark: 75% Seat Fill
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Campus Branch</th>
                <th className="py-2.5 px-3 text-center">Active Learners</th>
                <th className="py-2.5 px-3 text-center">Active Cohorts</th>
                <th className="py-2.5 px-3 text-center">Faculty</th>
                <th className="py-2.5 px-3 text-center">Seat Capacity</th>
                <th className="py-2.5 px-3 text-center">Fill Rate</th>
                <th className="py-2.5 px-3 text-center">Learner : Faculty</th>
                <th className="py-2.5 px-3 text-right">Strategic Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchStats.map((b) => (
                <tr key={b.branchName} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{b.branchName}</td>
                  <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                    {b.activeStudents}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.activeClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.facultyCount}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {b.enrolledSeats} / {b.totalCapacity}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-slate-800">
                      {b.capacityPct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[#1a3a8f]">
                    {b.ratio} : 1
                  </td>
                  <td className="py-3 px-3 text-right">
                    {b.facultyCount === 0 && b.activeStudents > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> No faculty assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3" /> Data active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance & Authority Boundary Callout */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <Award className="w-4 h-4 text-[#1a3a8f]" />
          <span>Governance &amp; Authority Model (Blueprint v3.3 §5 &amp; §6.1)</span>
        </div>
        <p className="leading-relaxed font-medium">
          The Director evaluates comparative multi-branch metrics and strategic targets. Day-to-day batch scheduling, cohort room assignments, and staff coordination belong to local branch leaders (Course Division Manager, Kindergarten Division Manager, Operational Leader, and Instructor Leader).
        </p>
      </div>
    </div>
  );
}
