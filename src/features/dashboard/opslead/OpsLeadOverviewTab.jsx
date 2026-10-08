import { useMemo } from "react";
import { formatIDR } from "../../finance/receiptMessages";
import {
  ShieldAlert,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import OpsLeadBottlenecksSection from "./OpsLeadBottlenecksSection";
import { filterBranchStaffByRole, categorizeFacilityTasks, summarizeShiftPayments } from "./opsLeadUtils";

/**
 * OpsLeadOverviewTab
 *
 * Operational Command Center for the branch site.
 * Displays:
 * 1. Physical Site Health & Multi-Division Capacity Overview
 * 2. Proactive Operational Bottlenecks & Maker-Checker Action Cockpit
 * 3. On-Duty Staff Coordination (Front Office, Office Boy, Instructors)
 * 4. Urgent Operational Actions & Discrepancy Alert Counters
 */
export default function OpsLeadOverviewTab({
  myBranch = "Kota Gorontalo",
  users = [],
  classes = [],
  pendingApprovalsCount = 0,
  dailyPayments = [],
  todos = [],
  uncontactedInquiriesCount = 0,
  drawerVarianceCount = 0,
  onNavigate = null,
}) {
  // Categorized active staff at this branch site
  const { allStaff: branchStaff, officeSupport: officeBoys, frontOffice: frontOfficeStaff } = useMemo(() => {
    return filterBranchStaffByRole(users, myBranch);
  }, [users, myBranch]);

  // Pending tasks summary
  const { pending: pendingTasks } = useMemo(() => {
    return categorizeFacilityTasks(todos);
  }, [todos]);

  // Daily cash drawer total in progress
  const shiftStats = useMemo(() => {
    return summarizeShiftPayments(dailyPayments);
  }, [dailyPayments]);

  const todayTotalIntake = shiftStats.total;
  const effectiveDrawerVariances = drawerVarianceCount > 0 ? drawerVarianceCount : shiftStats.discrepancyCount;

  return (
    <div className="space-y-6">
      {/* Identity & Campus Scope Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-[#1a3a8f] rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-black text-[11px] uppercase tracking-wider border border-orange-500/30">
              Branch-Site Leadership
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Whole-Campus Operations ({myBranch})
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Operational Leader Command Center
          </h2>
          <p className="text-xs text-indigo-200/80 max-w-xl leading-relaxed">
            Coordinating branch-site logistics, facility maintenance, cleaning staff, front-desk throughput, and Maker-Checker operational authorizations.
          </p>
        </div>

        {/* Quick KPI Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
              On-Duty Staff
            </span>
            <span className="text-xl font-black text-white">{branchStaff.length}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
              Active Batches
            </span>
            <span className="text-xl font-black text-white">{classes.length}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
              Today&apos;s Intake
            </span>
            <span className="text-base font-black text-emerald-400">
              {formatIDR(todayTotalIntake)}
            </span>
          </div>
        </div>
      </div>

      {/* Proactive Operational Bottlenecks Cockpit */}
      <OpsLeadBottlenecksSection
        pendingApprovalsCount={pendingApprovalsCount}
        pendingTasksCount={pendingTasks.length}
        uncontactedInquiriesCount={uncontactedInquiriesCount}
        drawerVarianceCount={effectiveDrawerVariances}
        onNavigate={onNavigate}
        myBranch={myBranch}
      />

      {/* Critical Operational Attention Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approvals Action Required */}
        <div
          onClick={() => onNavigate && onNavigate("approvals")}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Dual-Control Approvals
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {pendingApprovalsCount}
              </span>
              <span className="text-xs font-bold text-slate-500">tickets pending</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Attendance edits, class transfers, &amp; &lt; 20k cash
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Site Facilities & Tasks */}
        <div
          onClick={() => onNavigate && onNavigate("facilities")}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Facility Tasks &amp; Support
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {pendingTasks.length}
              </span>
              <span className="text-xs font-bold text-slate-500">active items</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {officeBoys.length} Office Boy / Cleaners assigned
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        {/* Front Desk Reception Status */}
        <div
          onClick={() => onNavigate && onNavigate("reconciliation")}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Shift Cash Reconciliation
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {dailyPayments.length}
              </span>
              <span className="text-xs font-bold text-slate-500">receipts logged</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Review drawer count &amp; cash discrepancies
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Staff Operational Allocation Board */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Branch-Site Operational Staff ({myBranch})
            </h3>
            <p className="text-xs text-slate-500">
              Coordination of Front Office receptionists and Office Support facilities personnel.
            </p>
          </div>
          <span className="text-xs font-bold text-[#1a3a8f] bg-indigo-50 px-2.5 py-1 rounded-xl">
            {frontOfficeStaff.length} Front Office · {officeBoys.length} Office Support
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branchStaff.slice(0, 9).map((staff) => (
            <div
              key={staff.id}
              className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center font-black text-xs text-[#1a3a8f]">
                  {(staff.displayName || staff.firstName || "S")[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                    {staff.displayName || `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || "Staff Member"}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {staff.role === "opslead"
                      ? "Operational Leader"
                      : staff.role === "frontoffice"
                      ? "Front Office Staff"
                      : staff.role === "officeboy"
                      ? "Office Support"
                      : staff.role}
                  </span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Staff" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
