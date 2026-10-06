import { BookOpen, Baby, Building2 } from "lucide-react";
import { normalizeDivision, divisionOfProgram } from "../../../constants/divisions";
import { BRANCHES, matchesBranchFilter } from "../../../constants/branches";

/**
 * DivisionBalanceCard: Visual breakdown showing Course Division vs. Kindergarten Division
 * enrollment distribution across Gorontalo Province campuses (Blueprint §6.1).
 */
export function DivisionBalanceCard({
  students = [],
  selectedBranch = "all",
}) {
  const activeStudents = students.filter((s) => (s.status || "active") === "active");

  const scopedStudents =
    selectedBranch === "all"
      ? activeStudents
      : activeStudents.filter((s) =>
          matchesBranchFilter(s.branchId || s.branch, selectedBranch)
        );

  let coursesCount = 0;
  let kindergartenCount = 0;

  scopedStudents.forEach((s) => {
    const div = normalizeDivision(s.division || divisionOfProgram(s.program));
    if (div === "kindergarten") {
      kindergartenCount += 1;
    } else {
      coursesCount += 1;
    }
  });

  const total = scopedStudents.length;
  const coursesPct = total > 0 ? Math.round((coursesCount / total) * 100) : 0;
  const kindergartenPct = total > 0 ? Math.round((kindergartenCount / total) * 100) : 0;

  // Multi-campus branch breakdown
  const branchBreakdown = BRANCHES.map((bName) => {
    const bStudents = activeStudents.filter((s) =>
      matchesBranchFilter(s.branchId || s.branch, bName)
    );
    let bCourses = 0;
    let bKindergarten = 0;
    bStudents.forEach((s) => {
      const div = normalizeDivision(s.division || divisionOfProgram(s.program));
      if (div === "kindergarten") bKindergarten += 1;
      else bCourses += 1;
    });

    return {
      branchName: bName,
      total: bStudents.length,
      courses: bCourses,
      kindergarten: bKindergarten,
    };
  });

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1a3a8f]" />
            Academic Division Enrollment Distribution
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {selectedBranch === "all"
              ? "Province-wide enrollment balance between Course Academy and Kids School (Kindergarten)."
              : `Division enrollment balance for ${selectedBranch}.`}
          </p>
        </div>
        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 self-start sm:self-auto">
          {total} Total Active Learners
        </span>
      </div>

      {/* Visual Division Balance Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-indigo-800">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Course Academy: {coursesCount} ({coursesPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-cyan-800">
            <Baby className="w-4 h-4 text-cyan-600" />
            Kids School: {kindergartenCount} ({kindergartenPct}%)
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-indigo-600 transition-all duration-500"
            style={{ width: `${coursesPct}%` }}
            title={`Courses: ${coursesCount}`}
          />
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${kindergartenPct}%` }}
            title={`Kindergarten: ${kindergartenCount}`}
          />
        </div>
      </div>

      {/* 4 Campus Micro Table */}
      {selectedBranch === "all" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {branchBreakdown.map((b) => (
            <div
              key={b.branchName}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
            >
              <span className="font-bold text-slate-800 block text-[11px] truncate">
                {b.branchName}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-indigo-700 font-semibold">Courses: {b.courses}</span>
                <span className="text-cyan-700 font-semibold">Kids: {b.kindergarten}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
