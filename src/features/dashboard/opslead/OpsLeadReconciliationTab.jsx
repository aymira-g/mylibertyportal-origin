import { useMemo } from "react";
import { formatIDR } from "../../finance/receiptMessages";
import {
  Wallet,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

/**
 * OpsLeadReconciliationTab
 *
 * Implements Ratified Owner Decision OD-O3 & G-009:
 * 1. Read-only oversight of daily cashier shift balancing across Course & Kindergarten intakes.
 * 2. Visual summary of Cash, QRIS, and Transfer totals collected by Front Desk cashiers.
 * 3. Authority overview of tiered Cash Discrepancies:
 *    - < Rp 20.000: Operational Leader authorization tier
 *    - Rp 20.000 - 49.999: Vice Director escalation
 *    - >= Rp 50.000: Director escalation
 *    - Separation of Duties: Ops Lead reviews & reconciles, but does NOT perform cashier intake.
 */
export default function OpsLeadReconciliationTab({
  dailyPayments = [],
  myBranch = "Kota Gorontalo",
  loading = false,
  onRefresh = null,
  onNavigateToApprovals = null,
}) {
  // Aggregate breakdown
  const stats = useMemo(() => {
    let cash = 0;
    let transfer = 0;
    let qris = 0;
    let total = 0;

    for (const p of dailyPayments) {
      const amt = Number(p.amount) || 0;
      total += amt;
      const m = (p.method || "").toLowerCase();
      if (m === "cash") cash += amt;
      else if (m === "transfer") transfer += amt;
      else if (m === "qris") qris += amt;
    }

    return { cash, transfer, qris, total, count: dailyPayments.length };
  }, [dailyPayments]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#1a3a8f]" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Shift Cash Reconciliation &amp; Discrepancy Oversight
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational Leader review for cashier shift counts &amp; tiered cash discrepancies (Ratified Decision G-009).
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Intake</span>
          </button>
        )}
      </div>

      {/* Discrepancy Policy Alert Banner (G-009) */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-amber-900 text-xs uppercase tracking-wide">
              Ratified Decision G-009 Tiered Authority
            </span>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              <strong>Under Rp 20.000:</strong> Primary approver is <strong>Operational Leader</strong>.
              <br />
              <strong>Rp 20.000 – Rp 49.999:</strong> Escalates to <strong>Vice Director</strong>.
              <br />
              <strong>≥ Rp 50.000:</strong> Escalates to <strong>Director</strong>.
              <br />
              <em>Separation of duties: The person who counted the drawer cannot approve discrepancies.</em>
            </p>
          </div>
        </div>

        {onNavigateToApprovals && (
          <button
            onClick={onNavigateToApprovals}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Review Pending Approvals</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Today's Branch Cash Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
            Total Intake Logged
          </span>
          <span className="text-xl font-black text-indigo-950 block mt-1">
            {formatIDR(stats.total)}
          </span>
          <span className="text-[11px] font-medium text-indigo-600 mt-0.5 block">
            {stats.count} transactions today
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
            Physical Cash in Drawer
          </span>
          <span className="text-xl font-black text-emerald-950 block mt-1">
            {formatIDR(stats.cash)}
          </span>
          <span className="text-[11px] font-medium text-emerald-600 mt-0.5 block">
            Requires cashier physical count
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
            Direct QRIS Total
          </span>
          <span className="text-xl font-black text-sky-950 block mt-1">
            {formatIDR(stats.qris)}
          </span>
          <span className="text-[11px] font-medium text-sky-600 mt-0.5 block">
            Settles to corporate bank account
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
            Bank Transfer Total
          </span>
          <span className="text-xl font-black text-slate-900 block mt-1">
            {formatIDR(stats.transfer)}
          </span>
          <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
            Direct account verification
          </span>
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Today&apos;s Front Desk Receipts ({myBranch})
        </h4>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
            Loading today&apos;s transactions...
          </div>
        ) : dailyPayments.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            No payments recorded yet for today at {myBranch}.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {dailyPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50/80 transition text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-slate-800">
                      {p.studentName || "Student Payment"}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="capitalize font-semibold text-slate-600">{p.method || "Cash"}</span>
                      <span>·</span>
                      <span>{p.division || "courses"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900">{formatIDR(p.amount)}</span>
                    <span className="block text-[10px] text-slate-400">
                      {p.recordedAt ? new Date(p.recordedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Today"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
