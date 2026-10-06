import { ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, Lock } from "lucide-react";

/**
 * RiskExceptionPanel: High-risk operational and financial exception oversight
 * for the Executive Director (Authoritative Blueprint §6.1).
 */
export function RiskExceptionPanel({
  pendingApprovalsCount = 0,
  unenrolledStudentsCount = 0,
  onNavigateToApprovals,
  onNavigateToStudents,
}) {
  return (
    <div className="space-y-6">
      {/* Risk Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                High-Risk &amp; Governance Exception Oversight
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Maker-checker escalation monitoring, cash reconciliation discrepancy oversight, and dual-control integrity checks.
            </p>
          </div>
          <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 self-start sm:self-auto">
            Director Exception Thresholds
          </span>
        </div>

        {/* Risk Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Dual Control Queue Status */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#1a3a8f]" />
                  Dual-Control Authorization Queue
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                  {pendingApprovalsCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                Staff role promotions, large discounts, and financial exceptions require dual-control sign-off before executing.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToApprovals}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <span>Inspect Pending Approvals</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Card 2: Unassigned Student Academic Risk */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Cohort Assignment Risk
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    unenrolledStudentsCount > 0
                      ? "bg-amber-100 text-amber-900"
                      : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {unenrolledStudentsCount} Unassigned
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
                Active students without a designated class cohort can represent lost tuition revenue or stalled learner progress.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToStudents}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <span>Inspect Student Assignments</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Governance & Audit Compliance Log */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Authoritative Governance &amp; Security Controls (v3.1)
        </h4>
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold text-base leading-none">✓</span>
            <div>
              <strong className="text-slate-800">System Admin Separation:</strong>
              <p className="text-slate-600 font-medium mt-0.5">
                System Admin has technical system-access privileges only and cannot execute business approvals or override directorates.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold text-base leading-none">✓</span>
            <div>
              <strong className="text-slate-800">No Self-Approval Invariant:</strong>
              <p className="text-slate-600 font-medium mt-0.5">
                Dual-control rules prevent any user from approving an authorization ticket they requested themselves.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
