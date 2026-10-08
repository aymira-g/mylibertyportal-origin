import { useMemo } from "react";
import {
  ShieldAlert,
  Wrench,
  UserCheck,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { computeOpsLeadBottlenecks } from "./opsLeadUtils";

/**
 * OpsLeadBottlenecksSection
 *
 * Operational bottleneck detection & quick action cockpit for the Operational Leader.
 * Conforms to Blueprint v3.3 (§6.8, §6.10) and Ratified Decisions G-006, G-007, G-009, OD-O1 to OD-O4:
 * 1. Proactively highlights bottlenecks across dual-control approvals, facility tasks, front-desk intake, and cash reconciliation.
 * 2. Provides direct navigation callbacks to the corresponding operational workspaces.
 * 3. Shows a clean, reassuring empty state when all campus systems are operating without friction.
 */
export default function OpsLeadBottlenecksSection({
  pendingApprovalsCount = 0,
  pendingTasksCount = 0,
  uncontactedInquiriesCount = 0,
  drawerVarianceCount = 0,
  onNavigate = null,
  myBranch = "Kota Gorontalo",
}) {
  const bottleneckSummary = useMemo(() => {
    return computeOpsLeadBottlenecks({
      pendingApprovalsCount,
      pendingTasksCount,
      uncontactedInquiriesCount,
      drawerVarianceCount,
    });
  }, [
    pendingApprovalsCount,
    pendingTasksCount,
    uncontactedInquiriesCount,
    drawerVarianceCount,
  ]);

  const { total, severity, breakdown } = bottleneckSummary;

  // Clean, zero-bottleneck state
  if (total === 0) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-emerald-950 tracking-tight">
                All Campus Operations Clear &amp; Smooth
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                0 Bottlenecks
              </span>
            </div>
            <p className="text-xs text-emerald-700/90 mt-0.5 font-medium">
              No pending approvals, overdue facility tasks, or neglected inquiries at {myBranch}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              severity === "urgent"
                ? "bg-rose-50 text-rose-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                ⚡ Branch-Site Operational Bottlenecks &amp; Action Required
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  severity === "urgent"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {total} Action{total > 1 ? "s" : ""} Needed
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Active operational items requiring leadership coordination or authorization (Blueprint §6.8).
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Bottleneck Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Dual-Control Approvals */}
        <div
          onClick={() => onNavigate && onNavigate("approvals")}
          className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 cursor-pointer group ${
            breakdown.approvals > 0
              ? "bg-rose-50/50 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
              : "bg-slate-50/50 border-slate-200/60 opacity-60 hover:opacity-100"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Maker-Checker
              </span>
              <ShieldAlert
                className={`w-4 h-4 ${
                  breakdown.approvals > 0 ? "text-rose-600" : "text-slate-400"
                }`}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {breakdown.approvals}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                pending ticket{breakdown.approvals === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Attendance edits, class transfers, &amp; cash &lt; 20k awaiting authorization.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#1a3a8f] group-hover:translate-x-0.5 transition">
            <span>Open Approvals</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 2. Facility & Cleaning Tasks */}
        <div
          onClick={() => onNavigate && onNavigate("facilities")}
          className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 cursor-pointer group ${
            breakdown.facilityTasks > 0
              ? "bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
              : "bg-slate-50/50 border-slate-200/60 opacity-60 hover:opacity-100"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Office Support
              </span>
              <Wrench
                className={`w-4 h-4 ${
                  breakdown.facilityTasks > 0 ? "text-amber-600" : "text-slate-400"
                }`}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {breakdown.facilityTasks}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                active task{breakdown.facilityTasks === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Campus maintenance &amp; cleaning tasks dispatched to Office Support.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#1a3a8f] group-hover:translate-x-0.5 transition">
            <span>Manage Facilities</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 3. Front Desk Inquiries */}
        <div
          onClick={() => onNavigate && onNavigate("frontoffice")}
          className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 cursor-pointer group ${
            breakdown.uncontactedInquiries > 0
              ? "bg-indigo-50/50 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
              : "bg-slate-50/50 border-slate-200/60 opacity-60 hover:opacity-100"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Intake Queue
              </span>
              <UserCheck
                className={`w-4 h-4 ${
                  breakdown.uncontactedInquiries > 0
                    ? "text-indigo-600"
                    : "text-slate-400"
                }`}
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {breakdown.uncontactedInquiries}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                uncontacted lead{breakdown.uncontactedInquiries === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Walk-in prospects awaiting first response from front desk staff.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#1a3a8f] group-hover:translate-x-0.5 transition">
            <span>Review Intake</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 4. Shift Cash Reconciliation */}
        <div
          onClick={() => onNavigate && onNavigate("reconciliation")}
          className="p-4 rounded-2xl border bg-slate-50/50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition flex flex-col justify-between gap-3 cursor-pointer group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Cashier Drawer
              </span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {breakdown.drawerVariances > 0 ? breakdown.drawerVariances : "Active"}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {breakdown.drawerVariances > 0 ? "discrepancies" : "drawer count"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Shift balancing &amp; G-009 discrepancy tier review (read-only till).
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#1a3a8f] group-hover:translate-x-0.5 transition">
            <span>Inspect Drawer</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
