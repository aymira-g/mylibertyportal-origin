import { Activity, AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { BRANCHES, matchesBranchFilter } from "../../../constants/branches";
import { getPaymentHealthStatus } from "../../../constants/paymentPlans";

/**
 * BranchOperationalHealthPanel: Operational health & daily/weekly execution tracking
 * for the Vice Director (Authoritative Blueprint §6.2 & §6.3).
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
  const displayedBranches = selectedBranch && selectedBranch !== "all"
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

  // Calculate concrete operational exceptions across the active branch scope
  const scopedStudents = selectedBranch && selectedBranch !== "all"
    ? students.filter((s) => matchesBranchFilter(s.branchId || s.branch, selectedBranch))
    : students;

  const unassignedStudents = scopedStudents.filter(
    (s) => (s.status || "active") === "active" && (!s.classIds || s.classIds.length === 0)
  );

  const overdueTuitionStudents = scopedStudents.filter((s) => {
    if ((s.status || "active") !== "active") return false;
    const health = getPaymentHealthStatus(s.paidUntil);
    return health.status === "expired" || health.status === "due_soon";
  });

  const scopedClasses = selectedBranch && selectedBranch !== "all"
    ? classes.filter((c) => matchesBranchFilter(c.branchId || c.branch, selectedBranch))
    : classes;

  const unassignedFacultyCohorts = scopedClasses.filter((c) => !c.instructorId);

  const pendingAppsCount = (
    selectedBranch && selectedBranch !== "all"
      ? applications.filter((a) => matchesBranchFilter(a.branchId || a.branch, selectedBranch))
      : applications
  ).filter((a) => (a.status || "pending") === "pending").length;

  return (
    <div className="space-y-6">
      {/* Operational Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#1a3a8f]" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Branch Operational Health &amp; Execution Follow-up
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-branch operational coordination, cohort capacity monitoring, and daily exception resolution across Gorontalo Province.
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
                <th className="py-2.5 px-3 text-right">Operating Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchHealthData.map((bh) => {
                let statusTone = "bg-slate-100 text-slate-700 border-slate-200";
                let statusLabel = "Data active";

                if (bh.staffCount === 0 && bh.activeStudents > 0) {
                  statusTone = "bg-amber-50 text-amber-800 border-amber-200";
                  statusLabel = "Staff unallocated";
                } else if (bh.pendingApps > 5) {
                  statusTone = "bg-indigo-50 text-indigo-800 border-indigo-200";
                  statusLabel = "Intake backlog";
                } else if (bh.fillRate > 90) {
                  statusTone = "bg-purple-50 text-purple-800 border-purple-200";
                  statusLabel = "High occupancy";
                }

                return (
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
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusTone}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exceptions & Corrective Actions Registry */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Exceptions &amp; Operational Corrective Actions
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Active operational blockers requiring Vice Director coordination and follow-up with branch leaders.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {unassignedStudents.length + overdueTuitionStudents.length + unassignedFacultyCohorts.length + (pendingAppsCount > 0 ? 1 : 0)} Active Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Item 1: Unassigned Students */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Learner Cohort Placement</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${unassignedStudents.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {unassignedStudents.length} Unassigned
                </span>
              </div>
              <p className="text-slate-600 font-medium mt-1 leading-relaxed">
                <strong>Responsible:</strong> Front Office / Division Manager.
                <br />
                <strong>Action:</strong> Place active students into open classroom batches to avoid lost tuition or delayed progress.
              </p>
            </div>
            {onNavigateToStudents && (
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
              >
                <span>Coordinate Learner Placement</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Item 2: Admissions Intake Pipeline */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Admissions Pipeline Backlog</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${pendingAppsCount > 0 ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {pendingAppsCount} Pending
                </span>
              </div>
              <p className="text-slate-600 font-medium mt-1 leading-relaxed">
                <strong>Responsible:</strong> Branch Front Office.
                <br />
                <strong>Action:</strong> Review incoming registration forms, verify document completeness, and finalize enrollment.
              </p>
            </div>
            {onNavigateToApplications && (
              <button
                type="button"
                onClick={onNavigateToApplications}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
              >
                <span>Inspect Admissions Queue</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Item 3: Tuition Health & Renewals */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Tuition Renewal &amp; Expiry</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${overdueTuitionStudents.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {overdueTuitionStudents.length} Due / Expired
                </span>
              </div>
              <p className="text-slate-600 font-medium mt-1 leading-relaxed">
                <strong>Responsible:</strong> Front Office Cashier.
                <br />
                <strong>Action:</strong> Send 1-click WhatsApp renewal notices and record payments before class entry.
              </p>
            </div>
            {onNavigateToStudents && (
              <button
                type="button"
                onClick={onNavigateToStudents}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
              >
                <span>Follow up Tuition Status</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Item 4: Faculty & Cohort Allocation */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Faculty Cohort Assignment</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${unassignedFacultyCohorts.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {unassignedFacultyCohorts.length} Unassigned Batches
                </span>
              </div>
              <p className="text-slate-600 font-medium mt-1 leading-relaxed">
                <strong>Responsible:</strong> Instructor Leader / Division Manager.
                <br />
                <strong>Action:</strong> Assign certified instructors to scheduled classes prior to batch start date.
              </p>
            </div>
            {onNavigateToClasses && (
              <button
                type="button"
                onClick={onNavigateToClasses}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
              >
                <span>Inspect Cohort Schedules</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Escalation & Delegated Authority Gateway (Blueprint §6.2 & §6.3) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-700" />
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Executive Escalation &amp; Delegated Authority Gateway
          </h4>
        </div>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Under <strong>Authoritative Blueprint v3.2 §6.2 &amp; §6.3</strong>, the Vice Director translates approved priorities into operational coordination across physical campuses.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <span className="font-bold text-emerald-950 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Within Vice Director Delegated Authority:
            </span>
            <ul className="text-emerald-900 font-medium list-disc list-inside space-y-0.5 pt-1">
              <li>Routine operational sign-offs &amp; tuition refunds</li>
              <li>Multi-branch capacity &amp; scheduling coordination</li>
              <li>Operational task delegation &amp; follow-up</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
            <span className="font-bold text-indigo-950 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-indigo-700" />
              Requires Escalation to Executive Director:
            </span>
            <ul className="text-indigo-900 font-medium list-disc list-inside space-y-0.5 pt-1">
              <li>Staff role elevations &amp; permanent deactivations</li>
              <li>Strategic expansion budgets &amp; institutional policy</li>
              <li>Unresolved cross-branch governance disputes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
