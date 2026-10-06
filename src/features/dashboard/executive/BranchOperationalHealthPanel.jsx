import { Activity, Users, BookOpen, AlertCircle, CheckCircle } from "lucide-react";
import { BRANCHES, matchesBranchFilter } from "../../../constants/branches";

/**
 * BranchOperationalHealthPanel: Operational health & daily/weekly execution tracking
 * for the Vice Director (Authoritative Blueprint §6.2).
 *
 * @param {{
 *   students?: any[],
 *   classes?: any[],
 *   users?: any[],
 *   applications?: any[],
 *   selectedBranch?: string | null,
 *   onNavigateToApplications?: () => void,
 *   onNavigateToClasses?: () => void,
 *   onNavigateToStudents?: () => void,
 * }} props
 */
export function BranchOperationalHealthPanel({
  students = [],
  classes = [],
  users = [],
  applications = [],
  selectedBranch = null,
  onNavigateToApplications,
  onNavigateToClasses,
  onNavigateToStudents,
}) {
  const displayedBranches = selectedBranch
    ? BRANCHES.filter((b) => matchesBranchFilter(selectedBranch, b))
    : BRANCHES;

  const branchHealthData = displayedBranches.map((branchName) => {
    const bStudents = students.filter(
      (s) =>
        matchesBranchFilter(s.branchId || s.branch, branchName) &&
        (s.status || "active") === "active"
    );

    const bClasses = classes.filter((c) =>
      matchesBranchFilter(c.branchId || c.branch, branchName)
    );

    let totalSeats = 0;
    let enrolledSeats = 0;
    bClasses.forEach((c) => {
      totalSeats += Number(c.capacity) || 12;
      enrolledSeats += Array.isArray(c.studentIds) ? c.studentIds.length : 0;
    });

    const fillRate = totalSeats > 0 ? Math.round((enrolledSeats / totalSeats) * 100) : 0;

    const bStaff = users.filter(
      (u) =>
        (u.status || "active") === "active" &&
        matchesBranchFilter(u.branchId || u.branch, branchName)
    );

    const bPendingApps = applications.filter(
      (a) =>
        (a.status || "pending") === "pending" &&
        matchesBranchFilter(a.branchId || a.branch, branchName)
    ).length;

    return {
      branchName,
      activeStudents: bStudents.length,
      activeClasses: bClasses.length,
      totalSeats,
      enrolledSeats,
      fillRate,
      staffCount: bStaff.length,
      pendingApps: bPendingApps,
    };
  });

  return (
    <div className="space-y-6">
      {/* Operational Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1a3a8f]" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Branch Operational Health &amp; Daily Follow-up
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Daily and weekly operational oversight across campus branches, cohort seat fill rates, and staff allocation.
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-[#1a3a8f] font-bold text-xs rounded-xl border border-blue-100 self-start sm:self-auto">
            Operational Execution
          </span>
        </div>

        {/* Operational Health Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Campus Branch</th>
                <th className="py-2.5 px-3 text-center">Active Learners</th>
                <th className="py-2.5 px-3 text-center">Active Cohorts</th>
                <th className="py-2.5 px-3 text-center">Seat Fill Rate</th>
                <th className="py-2.5 px-3 text-center">Staff On Duty</th>
                <th className="py-2.5 px-3 text-center">Pending Admissions</th>
                <th className="py-2.5 px-3 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchHealthData.map((bh) => (
                <tr key={bh.branchName} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{bh.branchName}</td>
                  <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                    {bh.activeStudents}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {bh.activeClasses}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-slate-800">{bh.fillRate}%</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({bh.enrolledSeats}/{bh.totalSeats} seats)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {bh.staffCount}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {bh.pendingApps > 0 ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {bh.pendingApps} pending
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Operational
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Routine Follow-up Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
            <Users className="w-4 h-4" />
            <span>Admissions Follow-up</span>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Review new applicant files and ensure prompt student onboarding and branch placement.
          </p>
          <button
            type="button"
            onClick={onNavigateToApplications}
            className="text-xs font-bold text-[#1a3a8f] hover:underline pt-1 block cursor-pointer"
          >
            Review Admissions →
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Cohort Scheduling</span>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Check class capacity and coordinate with Division Managers for new batch openings.
          </p>
          <button
            type="button"
            onClick={onNavigateToClasses}
            className="text-xs font-bold text-[#1a3a8f] hover:underline pt-1 block cursor-pointer"
          >
            Manage Classes →
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Roster &amp; Tuition Follow-up</span>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Monitor tuition expiry alerts and verify learner payment renewals with Front Office.
          </p>
          <button
            type="button"
            onClick={onNavigateToStudents}
            className="text-xs font-bold text-[#1a3a8f] hover:underline pt-1 block cursor-pointer"
          >
            Inspect Roster →
          </button>
        </div>
      </div>
    </div>
  );
}
