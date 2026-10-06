import { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from "react";
import { getRecentPayments } from "../../finance/paymentsRepository";
import { formatIDR } from "../../finance/receiptMessages";
import { summarizePaymentsByMethod } from "../../finance/financeUtils";
import { exportTableCSV } from "../../shared";
import { matchesBranchFilter, branchToId } from "../../../constants/branches";
import { matchesDivisionFilter } from "../../../constants/divisions";
import {
  DollarSign,
  Wallet,
  CreditCard,
  QrCode,
  Search,
  RefreshCw,
} from "lucide-react";

const FinancialReportsTab = forwardRef(
  /**
   * @param {{
   *   branchFilter?: string;
   *   rangeDays?: number;
   *   division?: string;
   * }} props
   * @param {any} ref
   */
  function FinancialReportsTab({ branchFilter = "all", rangeDays = 30, division = "all" }, ref) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [methodFilter, setMethodFilter] = useState("all");

    const fetchFinancialData = useCallback(async () => {
      setLoading(true);
      try {
        const canonicalBranchId = branchFilter !== "all" ? branchToId(branchFilter) : null;
        const limitCount = rangeDays === 0 ? 300 : rangeDays <= 7 ? 100 : 200;
        const list = await getRecentPayments(limitCount, canonicalBranchId, division !== "all" ? division : null);
        setPayments(list);
      } catch (err) {
        console.error("Failed to load financial report data:", err);
      } finally {
        setLoading(false);
      }
    }, [branchFilter, rangeDays, division]);

    useEffect(() => {
      fetchFinancialData();
    }, [fetchFinancialData]);

    // Client-side filtering
    const filteredPayments = useMemo(() => {
      return payments.filter((p) => {
        // Branch match
        if (branchFilter !== "all" && !matchesBranchFilter(p.branchId || p.branch, branchFilter)) {
          return false;
        }
        // Division match
        if (division !== "all" && !matchesDivisionFilter(p.division, division)) {
          return false;
        }
        // Payment method match
        if (methodFilter !== "all" && (p.method || "").toLowerCase() !== methodFilter.toLowerCase()) {
          return false;
        }
        // Text search
        if (search.trim()) {
          const q = search.toLowerCase();
          const student = (p.studentName || p.studentId || "").toLowerCase();
          const plan = (p.planName || "").toLowerCase();
          const notes = (p.notes || "").toLowerCase();
          if (!student.includes(q) && !plan.includes(q) && !notes.includes(q)) {
            return false;
          }
        }
        return true;
      });
    }, [payments, branchFilter, division, methodFilter, search]);

    // Financial KPI Summary
    const summary = useMemo(() => {
      return summarizePaymentsByMethod(filteredPayments);
    }, [filteredPayments]);

    // CSV Export binding for parent ReportsDashboard
    useImperativeHandle(ref, () => ({
      exportCSV: () => {
        const headers = [
          "Date (WITA)",
          "Receipt / Payment ID",
          "Student Name",
          "Campus Branch",
          "Division",
          "Plan",
          "Period",
          "Method",
          "Amount (IDR)",
          "Status",
        ];
        const rows = filteredPayments.map((p) => [
          p.recordedAt || "",
          p.id || "",
          p.studentName || p.studentId || "Student",
          p.branch || p.branchId || "",
          p.division || "courses",
          p.planName || "Standard",
          p.period || "",
          p.method || "Cash",
          p.amount || 0,
          p.approvalStatus || "completed",
        ]);
        exportTableCSV(
          `Financial_Tuition_Audit_${branchFilter}_${new Date().toISOString().slice(0, 10)}.csv`,
          headers,
          rows
        );
      },
    }));

    return (
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Total Revenue</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-950 block">
              {formatIDR(summary.grandTotal)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block">
              {summary.count} transaction{summary.count !== 1 ? "s" : ""} recorded
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <Wallet className="w-4 h-4 text-[#1a3a8f]" />
              <span>Cash (Drawer)</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 block">
              {formatIDR(summary.cashTotal)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Physical cash intake
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Bank Transfer</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-blue-950 block">
              {formatIDR(summary.transferTotal)}
            </span>
            <span className="text-[11px] text-blue-700 font-medium block">
              Direct bank payments
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-800 font-bold text-xs">
              <QrCode className="w-4 h-4 text-purple-600" />
              <span>QRIS &amp; Digital</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-purple-950 block">
              {formatIDR(summary.qrisTotal)}
            </span>
            <span className="text-[11px] text-purple-700 font-medium block">
              Digital QR payments
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white w-48 focus:outline-none focus:border-[#1a3a8f]"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-[#1a3a8f]"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="transfer">Bank Transfer</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchFinancialData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a3a8f] hover:underline self-end sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Records</span>
          </button>
        </div>

        {/* Transactions Audit Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Date (WITA)</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Campus Branch</th>
                <th className="py-2.5 px-3">Program / Plan</th>
                <th className="py-2.5 px-3 text-center">Method</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Loading financial audit records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No payment records found for the selected horizon and filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {p.recordedAt ? new Date(p.recordedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {p.studentName || p.studentId || "Student"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">
                      {p.branch || p.branchId || "Campus"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {p.planName || "Tuition"}
                      {p.period && <span className="text-[10px] text-slate-400 block">{p.period}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {p.method || "Cash"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {formatIDR(p.amount || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

FinancialReportsTab.displayName = "FinancialReportsTab";

export default FinancialReportsTab;
