import { Compass } from "lucide-react";
import { BRANCHES } from "../../../constants/branches";

/**
 * ExecutiveBranchScopeBar: Scoping selector allowing executives (Director and Vice Director)
 * to switch between Province-Wide (All 4 Campuses) view and a specific campus drill-down.
 */
export function ExecutiveBranchScopeBar({ selectedBranch, onSelectBranch }) {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a3a8f] flex items-center justify-center font-bold shrink-0">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Executive Branch Scope: {selectedBranch === "all" ? "Province-Wide (All Branches)" : selectedBranch}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">
            Select a branch to focus rosters, cohorts, and operational alerts, or view province-wide.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onSelectBranch("all")}
          className={`min-h-11 px-3 py-1.5 rounded-xl transition cursor-pointer text-xs font-bold ${
            selectedBranch === "all"
              ? "bg-[#1a3a8f] text-white shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          All Branches
        </button>
        {BRANCHES.map((bName) => (
          <button
            key={bName}
            type="button"
            onClick={() => onSelectBranch(bName)}
            className={`min-h-11 px-3 py-1.5 rounded-xl transition cursor-pointer text-xs font-bold ${
              selectedBranch === bName
                ? "bg-[#1a3a8f] text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            {bName}
          </button>
        ))}
      </div>
    </div>
  );
}
