import { DollarSign, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { getPaymentHealthStatus } from "../../../constants/paymentPlans";

/**
 * ExecutiveTuitionHealthCard: High-level financial & tuition collection health summary
 * widget for executive leadership (Director & Vice Director).
 */
export function ExecutiveTuitionHealthCard({
  students = [],
  onNavigateToStudents,
  onNavigateToReports,
}) {
  const activeStudents = students.filter((s) => (s.status || "active") === "active");

  let activePaid = 0;
  let dueSoon = 0;
  let expired = 0;
  let noPlan = 0;

  activeStudents.forEach((student) => {
    const health = getPaymentHealthStatus(student.paidUntil);
    if (health.status === "active") {
      activePaid += 1;
    } else if (health.status === "due_soon") {
      dueSoon += 1;
    } else if (health.status === "expired") {
      expired += 1;
    } else {
      noPlan += 1;
    }
  });

  const total = activeStudents.length;
  const goodStandingCount = activePaid;
  const goodStandingPct = total > 0 ? Math.round((goodStandingCount / total) * 100) : 0;
  const actionRequiredCount = dueSoon + expired;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Executive Tuition Collection &amp; Financial Health
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Active learner payment standing across Gorontalo Province campuses.
          </p>
        </div>
        {onNavigateToReports && (
          <button
            type="button"
            onClick={onNavigateToReports}
            className="text-xs text-[#1a3a8f] font-bold hover:underline self-start sm:self-auto flex items-center gap-1 cursor-pointer"
          >
            <span>Full Financial Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Good Standing</span>
          </div>
          <span className="text-xl font-extrabold text-emerald-950 mt-1 block">
            {activePaid}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            {goodStandingPct}% of learners
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
          <div className="flex items-center gap-1 text-amber-700 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Due Soon (8 Days)</span>
          </div>
          <span className="text-xl font-extrabold text-amber-950 mt-1 block">
            {dueSoon}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">
            Awaiting renewal
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
          <div className="flex items-center gap-1 text-rose-700 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Overdue / Expired</span>
          </div>
          <span className="text-xl font-extrabold text-rose-950 mt-1 block">
            {expired}
          </span>
          <span className="text-[10px] text-rose-700 font-medium">
            Requires follow-up
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1 text-slate-600 text-xs font-bold">
            <span>No Plan Configured</span>
          </div>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block">
            {noPlan}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            New / legacy records
          </span>
        </div>
      </div>

      {/* Progress & Quick Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Tuition In-Good-Standing Rate</span>
            <span className="font-bold text-slate-800">{goodStandingPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                goodStandingPct >= 80
                  ? "bg-emerald-500"
                  : goodStandingPct >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${goodStandingPct}%` }}
            />
          </div>
        </div>

        {actionRequiredCount > 0 && onNavigateToStudents && (
          <button
            type="button"
            onClick={onNavigateToStudents}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            Review {actionRequiredCount} Expiring / Overdue →
          </button>
        )}
      </div>
    </div>
  );
}
