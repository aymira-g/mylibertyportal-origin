import { Building2, X } from "lucide-react";

/**
 * MultiBranchPerformanceGrid: Strategic and operational summary cards for all 4 physical campuses
 * (Kota Gorontalo, Bone Bolango, Pohuwato, Limboto).
 */
export function MultiBranchPerformanceGrid({
  branchStats = [],
  selectedBranch = "all",
  onSelectBranch,
  title = "Multi-Branch Strategic Performance (4 Campuses)",
  subtitle = "Click any campus card below to filter the dashboard to that specific branch.",
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1a3a8f]" />
            {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        </div>
        {selectedBranch !== "all" && (
          <button
            type="button"
            onClick={() => onSelectBranch("all")}
            className="text-xs font-bold text-[#1a3a8f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
          >
            <span>Reset to All Branches</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {branchStats.map((branch) => {
          const isSelected = selectedBranch === branch.branchName;
          return (
            <button
              key={branch.branchId}
              type="button"
              onClick={() => onSelectBranch(isSelected ? "all" : branch.branchName)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-blue-50/70 border-[#1a3a8f] ring-2 ring-[#1a3a8f]/20 shadow-xs"
                  : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 tracking-tight">
                    {branch.branchName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isSelected ? "bg-[#1a3a8f] text-white" : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {isSelected ? "Active Filter" : "Drill Down"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                      Learners
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {branch.activeStudents}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                      Cohorts
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {branch.activeClasses}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Capacity Utilization</span>
                  <span className="font-bold text-slate-700">{branch.capacityPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      branch.capacityPct > 90
                        ? "bg-amber-500"
                        : branch.capacityPct > 70
                        ? "bg-emerald-500"
                        : "bg-[#1a3a8f]"
                    }`}
                    style={{ width: `${Math.min(100, branch.capacityPct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>{branch.branchStaff} Staff</span>
                  {branch.branchApps > 0 && (
                    <span className="text-amber-700 font-bold">{branch.branchApps} New Apps</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
