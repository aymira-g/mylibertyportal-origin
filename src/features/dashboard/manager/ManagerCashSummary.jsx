import { useMemo } from "react";
import { formatIDR } from "../../finance/receiptMessages";
import { summarizePaymentsByMethod } from "../../finance/financeUtils";
import { todayWita } from "../../../utils/dateWita";
import {
  Wallet,
  Building2,
  RefreshCw,
  CreditCard,
  QrCode,
  ArrowDownCircle,
  TrendingUp,
} from "lucide-react";

/**
 * Course Division Daily Intake & Collections Summary Component.
 *
 * Provides the Course Division Manager with real-time visibility over recorded
 * student tuition intake and collections for their branch, computing exact totals
 * for cash, bank transfers, QRIS, and overall collections for WITA today.
 * Cash drawer discrepancy approvals belong to the Operational Leader and Executive layer (G-009).
 *
 * @param {{
 *   branch: string,
 *   payments: Array<any>,
 *   loading?: boolean,
 *   onRefresh?: () => void,
 *   onNavigate?: (tab: string) => void,
 * }} props
 */
export function ManagerCashSummary({
  branch = "Kota Gorontalo",
  payments = [],
  loading = false,
  onRefresh = null,
  onNavigate = null,
}) {
  const summary = useMemo(() => {
    return summarizePaymentsByMethod(payments);
  }, [payments]);

  const todayStr = todayWita();

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-800">
                Course Division Intake &amp; Collections
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {branch} Campus
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Course tuition payments recorded today ({todayStr} WITA).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="View Course Tuition Targets"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#1a3a8f]" />
              <span>Tuition Targets &amp; Reports</span>
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Refresh intake"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#1a3a8f]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cash Receipts */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Cash Receipts
            </span>
          </div>
          <div className="text-lg font-black text-emerald-900 tracking-tight">
            {formatIDR(summary.cashTotal)}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Direct cash collections</p>
        </div>

        {/* Bank Transfer */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5" /> Bank Transfer
            </span>
          </div>
          <div className="text-lg font-black text-blue-900 tracking-tight">
            {formatIDR(summary.transferTotal)}
          </div>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Direct account credits</p>
        </div>

        {/* QRIS */}
        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold mb-1">
            <span className="flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> QRIS
            </span>
          </div>
          <div className="text-lg font-black text-purple-900 tracking-tight">
            {formatIDR(summary.qrisTotal)}
          </div>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Digital barcode payments</p>
        </div>

        {/* Total Collections */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Total Collections
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
              {summary.count} txns
            </span>
          </div>
          <div className="text-lg font-black text-white tracking-tight">
            {formatIDR(summary.grandTotal)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">All methods combined</p>
        </div>
      </div>

      {/* Quick link to overdue tuition & targets */}
      {onNavigate && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            Need to review overdue student balances or monthly target progress?
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("tuition-due-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else onNavigate("classes");
              }}
              className="text-[#1a3a8f] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Overdue Student Accounts ↓</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="text-[#1a3a8f] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Tuition Target Reports →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
