import { Target, TrendingUp, Award } from "lucide-react";
import { BRANCHES, matchesBranchFilter } from "../../../constants/branches";
import { DivisionBalanceCard } from "./DivisionBalanceCard";

/**
 * StrategicPlanningPanel: Dedicated strategic leadership & long-term planning workspace
 * for the Executive Director (Blueprint §6.1).
 */
export function StrategicPlanningPanel({
  students = [],
  classes = [],
  instructors = [],
}) {
  const branchMetrics = BRANCHES.map((branchName) => {
    const bStudents = students.filter((s) =>
      matchesBranchFilter(s.branchId || s.branch, branchName) &&
      (s.status || "active") === "active"
    ).length;

    const bClasses = classes.filter((c) =>
      matchesBranchFilter(c.branchId || c.branch, branchName)
    ).length;

    const bInstructors = instructors.filter((i) =>
      matchesBranchFilter(i.branchId || i.branch, branchName) &&
      (i.status || "active") === "active"
    ).length;

    const ratio = bInstructors > 0 ? (bStudents / bInstructors).toFixed(1) : "0";

    return {
      branchName,
      activeStudents: bStudents,
      activeClasses: bClasses,
      instructors: bInstructors,
      ratio,
    };
  });

  const totalActiveStudents = students.filter(
    (s) => (s.status || "active") === "active"
  ).length;

  const totalActiveInstructors = instructors.filter(
    (i) => (i.status || "active") === "active"
  ).length;

  const overallRatio =
    totalActiveInstructors > 0
      ? (totalActiveStudents / totalActiveInstructors).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Strategic Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#1a3a8f]" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Strategic Planning &amp; Province-Wide Growth
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Long-term academic capacity planning, faculty-to-learner ratios, and expansion targets across Gorontalo Province.
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-[#1a3a8f] font-bold text-xs rounded-xl border border-indigo-100 self-start sm:self-auto">
            Gorontalo Province Academic Tier
          </span>
        </div>

        {/* Top-Level Strategic KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Enrolled Learners
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalActiveStudents}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Across all 4 physical campuses
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Faculty Instructors
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalActiveInstructors}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Active teaching staff
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Province Learner-Faculty Ratio
            </span>
            <span className="text-2xl font-black text-[#1a3a8f] mt-1 block">
              {overallRatio} : 1
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Average learners per instructor
            </span>
          </div>
        </div>
      </div>

      {/* Division Enrollment Balance Breakdown */}
      <DivisionBalanceCard students={students} selectedBranch="all" />

      {/* Multi-Branch Academic Ratio & Planning Matrix */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1a3a8f]" />
          Campus Academic Balance Matrix
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Physical Campus</th>
                <th className="py-2.5 px-3 text-center">Active Learners</th>
                <th className="py-2.5 px-3 text-center">Active Cohorts</th>
                <th className="py-2.5 px-3 text-center">Instructors</th>
                <th className="py-2.5 px-3 text-center">Learner : Faculty Ratio</th>
                <th className="py-2.5 px-3 text-right">Operating Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchMetrics.map((b) => (
                <tr key={b.branchName} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{b.branchName}</td>
                  <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                    {b.activeStudents}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.activeClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.instructors}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[#1a3a8f]">
                    {b.ratio} : 1
                  </td>
                  <td className="py-3 px-3 text-right">
                    {b.instructors === 0 && b.activeStudents > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        No faculty assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Data active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Milestones (Presentation Layer) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          Strategic Governance &amp; Expansion Status (Presentation Layer)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-950 block">Gorontalo Province 4-Campus Integration</span>
            <p className="text-slate-600 leading-relaxed font-medium">
              Data isolation and multi-branch governance boundaries are active across Kota Gorontalo, Bone Bolango, Pohuwato, and Limboto.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="font-bold text-slate-900 block">Dual-Control Maker-Checker Authority</span>
            <p className="text-slate-600 leading-relaxed font-medium">
              Separation of duties is enforced between Front Office / Division Managers and the Executive Directorate. Formal strategic objective lifecycle workflows remain open governance items (Blueprint v3.3 §26).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
