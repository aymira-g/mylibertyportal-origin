import { Activity } from "lucide-react";
import BranchHealthAuditCard from "./BranchHealthAuditCard";
import LogRetentionCard from "./LogRetentionCard";

/**
 * SystemDiagnosticsTab: Dedicated technical diagnostics workspace for System Administrator.
 * Houses the multi-branch isolation partition audit and the free-tier Spark storage retention tool.
 * Strictly excludes any business, academic, financial, or staff performance data.
 */
export default function SystemDiagnosticsTab() {
  return (
    <div className="space-y-6 w-full">
      {/* Header bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1a3a8f] shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                System Diagnostics &amp; Health
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                Spark Free-Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Technical partition isolation audits, storage retention maintenance, and database health inspection.
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostics Cards Section */}
      <div className="space-y-4">
        {/* Multi-Branch Partition Isolation Health Audit */}
        <BranchHealthAuditCard />

        {/* Free-Tier Log Retention & Housekeeping */}
        <LogRetentionCard />
      </div>
    </div>
  );
}
