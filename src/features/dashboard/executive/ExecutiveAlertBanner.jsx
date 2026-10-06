import { AlertCircle } from "lucide-react";

/**
 * ExecutiveAlertBanner: Prominently surfaces high-priority executive action items
 * (Pending approvals, pending applications, unassigned students, exception flags).
 *
 * @param {{
 *   pendingApprovalsCount?: number,
 *   pendingApplications?: number,
 *   unenrolledStudentsCount?: number,
 *   riskAlertCount?: number,
 *   onNavigateToApprovals?: () => void,
 *   onNavigateToApplications?: () => void,
 *   onNavigateToStudents?: () => void,
 *   onNavigateToRisk?: () => void,
 *   title?: string,
 * }} props
 */
export function ExecutiveAlertBanner({
  pendingApprovalsCount = 0,
  pendingApplications = 0,
  unenrolledStudentsCount = 0,
  riskAlertCount = 0,
  onNavigateToApprovals,
  onNavigateToApplications,
  onNavigateToStudents,
  onNavigateToRisk,
  title = "Executive Action Required",
}) {
  const hasAlerts =
    (pendingApprovalsCount > 0 && Boolean(onNavigateToApprovals)) ||
    (pendingApplications > 0 && Boolean(onNavigateToApplications)) ||
    (unenrolledStudentsCount > 0 && Boolean(onNavigateToStudents)) ||
    (riskAlertCount > 0 && Boolean(onNavigateToRisk));

  if (!hasAlerts) return null;

  return (
    <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
          <AlertCircle className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
            {title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-medium text-amber-800">
            {pendingApprovalsCount > 0 && onNavigateToApprovals && (
              <span>
                • <strong>{pendingApprovalsCount}</strong> pending authorization
                {pendingApprovalsCount > 1 ? "s" : ""} awaiting review
              </span>
            )}
            {pendingApplications > 0 && onNavigateToApplications && (
              <span>
                • <strong>{pendingApplications}</strong> pending application
                {pendingApplications > 1 ? "s" : ""} awaiting review
              </span>
            )}
            {unenrolledStudentsCount > 0 && onNavigateToStudents && (
              <span>
                • <strong>{unenrolledStudentsCount}</strong> active student
                {unenrolledStudentsCount > 1 ? "s" : ""} unassigned to a class
              </span>
            )}
            {riskAlertCount > 0 && onNavigateToRisk && (
              <span>
                • <strong>{riskAlertCount}</strong> high-risk exception
                {riskAlertCount > 1 ? "s" : ""} flagged for executive review
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {pendingApprovalsCount > 0 && onNavigateToApprovals && (
          <button
            type="button"
            onClick={onNavigateToApprovals}
            className="min-h-11 px-3.5 py-2 bg-[#1a3a8f] hover:bg-[#132c6d] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Review Approvals
          </button>
        )}
        {pendingApplications > 0 && onNavigateToApplications && (
          <button
            type="button"
            onClick={onNavigateToApplications}
            className="min-h-11 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Review Applications
          </button>
        )}
        {unenrolledStudentsCount > 0 && onNavigateToStudents && (
          <button
            type="button"
            onClick={onNavigateToStudents}
            className="min-h-11 px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Assign Students
          </button>
        )}
        {riskAlertCount > 0 && onNavigateToRisk && (
          <button
            type="button"
            onClick={onNavigateToRisk}
            className="min-h-11 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Inspect Risks
          </button>
        )}
      </div>
    </div>
  );
}
