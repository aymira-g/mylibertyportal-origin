import { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  GraduationCap,
  Award,
  Layers,
  CheckCircle2,
  Target,
} from "lucide-react";
import { BRANCHES, matchesBranchFilter } from "../../../constants/branches";
import { DivisionBalanceCard } from "./DivisionBalanceCard";
import { ExecutiveTuitionHealthCard } from "./ExecutiveTuitionHealthCard";
import { getTier } from "../../../constants/levels";

/**
 * ExecutiveAnalyticsPanel: Strategic organization-wide analytics synthesis layer
 * for the Executive Director (Blueprint §6.1 & Strategic Cockpit Architecture).
 *
 * @param {{
 *   students?: any[],
 *   classes?: any[],
 *   instructors?: any[],
 *   users?: any[],
 *   selectedBranch?: string,
 *   onNavigateToReports?: (subTab?: string) => void,
 *   onNavigateToStrategic?: () => void,
 *   onNavigateToBranches?: () => void,
 * }} props
 */
export function ExecutiveAnalyticsPanel({
  students = [],
  classes = [],
  instructors = [],
  users = [],
  selectedBranch = "all",
  onNavigateToReports,
  onNavigateToStrategic,
  onNavigateToBranches,
}) {
  const filteredStudents = useMemo(() => {
    if (selectedBranch === "all") return students;
    return students.filter((s) =>
      matchesBranchFilter(s.branchId || s.branch, selectedBranch)
    );
  }, [students, selectedBranch]);

  const filteredClasses = useMemo(() => {
    if (selectedBranch === "all") return classes;
    return classes.filter((c) =>
      matchesBranchFilter(c.branchId || c.branch, selectedBranch)
    );
  }, [classes, selectedBranch]);

  const activeStudents = useMemo(() => {
    return filteredStudents.filter((s) => (s.status || "active") === "active");
  }, [filteredStudents]);

  // Placement level tiers (Beginner, Intermediate, Fluent)
  const tierCounts = useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, fluent: 0, unassigned: 0 };
    activeStudents.forEach((s) => {
      const tier = getTier(s.currentLevel || "warrior");
      if (counts[tier] !== undefined) {
        counts[tier]++;
      } else {
        counts.unassigned++;
      }
    });
    return counts;
  }, [activeStudents]);

  // Overall seat fill rate
  const capacityStats = useMemo(() => {
    let totalCap = 0;
    let enrolled = 0;
    filteredClasses.forEach((cls) => {
      totalCap += Number(cls.capacity) || 12;
      enrolled += Array.isArray(cls.studentIds) ? cls.studentIds.length : 0;
    });
    const fillRate = totalCap > 0 ? Math.round((enrolled / totalCap) * 100) : 0;
    return { totalCap, enrolled, fillRate };
  }, [filteredClasses]);

  // Branch comparative breakdown
  const branchBreakdown = useMemo(() => {
    return BRANCHES.map((bName) => {
      const bLearners = students.filter(
        (s) =>
          matchesBranchFilter(s.branchId || s.branch, bName) &&
          (s.status || "active") === "active"
      ).length;
      const bClasses = classes.filter((c) =>
        matchesBranchFilter(c.branchId || c.branch, bName)
      ).length;
      const bFaculty = instructors.filter(
        (i) =>
          matchesBranchFilter(i.branchId || i.branch, bName) &&
          (i.status || "active") === "active"
      ).length;
      const bStaff = users.filter(
        (u) =>
          matchesBranchFilter(u.branchId || u.branch, bName) &&
          (u.status || "active") === "active"
      ).length;
      const ratio = bFaculty > 0 ? (bLearners / bFaculty).toFixed(1) : "0";

      return {
        branchName: bName,
        learners: bLearners,
        cohorts: bClasses,
        faculty: bFaculty,
        staff: bStaff,
        ratio,
      };
    });
  }, [students, classes, instructors, users]);

  return (
    <div className="space-y-6">
      {/* Executive Analytics Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1a3a8f]" />
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Executive Analytics &amp; Cross-Domain Indicators
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Synthesized performance trends, enrollment distributions, tuition health, and learner retention across Gorontalo Province.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onNavigateToStrategic && (
              <button
                type="button"
                onClick={onNavigateToStrategic}
                className="text-xs font-bold text-[#1a3a8f] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Strategic Plan</span>
              </button>
            )}
            {onNavigateToReports && (
              <button
                type="button"
                onClick={() => onNavigateToReports("overview")}
                className="text-xs font-bold text-[#1a3a8f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition cursor-pointer"
              >
                Full Reports Suite →
              </button>
            )}
          </div>
        </div>

        {/* Synthesized Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Learners
              </span>
              <GraduationCap className="w-4 h-4 text-[#1a3a8f]" />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {activeStudents.length}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {selectedBranch === "all" ? "Province-wide enrollment" : `${selectedBranch} campus`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Seat Utilization
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {capacityStats.fillRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {capacityStats.enrolled} / {capacityStats.totalCap} classroom seats
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Faculty Ratio
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {instructors.filter((i) => (i.status || "active") === "active").length > 0
                ? (
                    activeStudents.length /
                    instructors.filter((i) => (i.status || "active") === "active").length
                  ).toFixed(1)
                : "0"}{" "}
              : 1
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Learners per active instructor
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Physical Campuses
              </span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {BRANCHES.length} Campuses
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Gorontalo Province Network
            </span>
          </div>
        </div>
      </div>

      {/* Division Balance Breakdown */}
      <DivisionBalanceCard students={students} selectedBranch={selectedBranch} />

      {/* High-Level Tuition Collection & Financial Health Indicator */}
      <ExecutiveTuitionHealthCard
        students={filteredStudents}
        onNavigateToStudents={onNavigateToReports ? () => onNavigateToReports("students") : undefined}
        onNavigateToReports={onNavigateToReports ? () => onNavigateToReports("finance") : undefined}
      />

      {/* Academic Proficiency Tier Distribution */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1a3a8f]" />
            Academic Level Progression &amp; Retention Distribution
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            {activeStudents.length} Active Learners
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Beginner Tier
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-900">
                {activeStudents.length > 0
                  ? Math.round((tierCounts.beginner / activeStudents.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <span className="text-2xl font-black text-blue-950 block mt-1">
              {tierCounts.beginner}
            </span>
            <p className="text-[11px] text-blue-800/80 font-medium">
              Warrior &amp; Junior foundation levels
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Intermediate Tier
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-900">
                {activeStudents.length > 0
                  ? Math.round((tierCounts.intermediate / activeStudents.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <span className="text-2xl font-black text-indigo-950 block mt-1">
              {tierCounts.intermediate}
            </span>
            <p className="text-[11px] text-indigo-800/80 font-medium">
              Champion, Leader &amp; Master competencies
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Fluent / Advanced Tier
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                {activeStudents.length > 0
                  ? Math.round((tierCounts.fluent / activeStudents.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-950 block mt-1">
              {tierCounts.fluent}
            </span>
            <p className="text-[11px] text-emerald-800/80 font-medium">
              Grand Master, TOEFL &amp; Academic fluency
            </p>
          </div>
        </div>
      </div>

      {/* Cross-Branch Comparative Overview Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#1a3a8f]" />
            Multi-Campus Comparative Matrix
          </h4>
          {onNavigateToBranches && (
            <button
              type="button"
              onClick={onNavigateToBranches}
              className="text-xs font-bold text-[#1a3a8f] hover:underline cursor-pointer"
            >
              Detailed Branch Performance →
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Physical Campus</th>
                <th className="py-2.5 px-3 text-center">Active Learners</th>
                <th className="py-2.5 px-3 text-center">Active Cohorts</th>
                <th className="py-2.5 px-3 text-center">Faculty Instructors</th>
                <th className="py-2.5 px-3 text-center">Learner : Faculty Ratio</th>
                <th className="py-2.5 px-3 text-right">Academic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchBreakdown.map((b) => (
                <tr key={b.branchName} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{b.branchName}</td>
                  <td className="py-3 px-3 text-center font-extrabold text-slate-800">
                    {b.learners}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.cohorts}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">
                    {b.faculty}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[#1a3a8f]">
                    {b.ratio} : 1
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Balanced
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
