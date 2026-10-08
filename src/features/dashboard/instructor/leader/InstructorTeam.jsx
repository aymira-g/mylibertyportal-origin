import { useMemo, useState } from "react";
import { Users, GraduationCap, Repeat, AlertTriangle } from "lucide-react";
import { Badge, Card } from "../../../shared";
import { noopNavigate } from "../leaderUtils";
import { DivisionBadge, LeaderEmptyState, LeaderErrorNote } from "./leaderUi";

const DIVISION_FILTERS = [
  { id: "all", label: "All divisions" },
  { id: "courses", label: "Course Academy" },
  { id: "kindergarten", label: "Kids School" },
];

/**
 * InstructorTeam
 *
 * Read/monitor surface answering "how is my teaching team doing operationally?"
 * Covers instructors of BOTH divisions within the leader's branch.
 *
 * Deliberately contains no role changes, account administration, termination,
 * privilege changes, payroll editing or leave approval: none of those are
 * Instructor Leader authority (Blueprint v3.3 §6.11, G-011).
 */
export default function InstructorTeam({
  workload = [],
  progressCoverage = null,
  progressError = "",
  teamLoading = false,
  teamError = "",
  currentUid = "",
  onNavigate = noopNavigate,
}) {
  const [divisionFilter, setDivisionFilter] = useState("all");

  const progressByUid = useMemo(() => {
    const map = new Map();
    (progressCoverage?.instructors || []).forEach((row) => map.set(row.uid, row));
    return map;
  }, [progressCoverage]);

  const rows = useMemo(() => {
    const enriched = workload.map((member) => ({
      ...member,
      progress: progressByUid.get(member.uid) || null,
    }));

    const filtered =
      divisionFilter === "all"
        ? enriched
        : enriched.filter((member) => member.divisions.includes(divisionFilter));

    return filtered.sort((a, b) => {
      if (b.activeClasses !== a.activeClasses) return b.activeClasses - a.activeClasses;
      return a.name.localeCompare(b.name);
    });
  }, [workload, progressByUid, divisionFilter]);

  const totals = useMemo(
    () => ({
      instructors: workload.length,
      unassigned: workload.filter((m) => m.activeClasses === 0 && m.substituteClasses === 0).length,
      stale: progressCoverage ? progressCoverage.staleCount : 0,
    }),
    [workload, progressCoverage]
  );

  if (teamLoading) {
    return (
      <Card>
        <p className="p-8 text-center text-slate-400 text-sm font-medium">
          Loading the branch teaching team…
        </p>
      </Card>
    );
  }

  if (teamError) {
    return (
      <LeaderErrorNote
        title="Could not load the branch teaching team"
        message={`${teamError} The Instructor Leader may read same-branch instructor and instructor-leader profiles only.`}
      />
    );
  }

  return (
    <div className="space-y-5 w-full">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1a3a8f]" />
              <h4 className="font-extrabold text-slate-800 text-sm">Branch Teaching Team</h4>
              <Badge tone="indigo">{totals.instructors}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Instructors of both divisions report to the Instructor Leader (G-003). Read-only monitoring.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DIVISION_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setDivisionFilter(filter.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  divisionFilter === filter.id
                    ? "bg-[#1a3a8f] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-semibold">
          <span>{totals.unassigned} with no assigned class</span>
          {progressError ? (
            <span className="text-amber-700">Progress-report recency unavailable</span>
          ) : (
            <span className={totals.stale > 0 ? "text-amber-700" : "text-emerald-700"}>
              {totals.stale} without a progress report in{" "}
              {progressCoverage ? progressCoverage.staleAfterDays : 30} days
            </span>
          )}
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <LeaderEmptyState
            icon={Users}
            title="No instructors in this view"
            message={
              divisionFilter === "all"
                ? "No instructor or instructor-leader profiles were found for this branch."
                : "No instructor in this branch is currently attached to the selected division."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {rows.map((member) => (
            <Card key={member.uid} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm truncate">{member.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge tone={member.role === "instructorleader" ? "purple" : "blue"}>
                      {member.role === "instructorleader" ? "Instructor Leader" : "Instructor"}
                    </Badge>
                    {member.uid === currentUid && <Badge tone="emerald">You</Badge>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {member.divisions.length === 0 ? (
                    <span className="text-[10px] font-bold uppercase text-slate-400">No division</span>
                  ) : (
                    member.divisions.map((division) => (
                      <DivisionBadge key={division} division={division} />
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Classes</p>
                  <p className="text-base font-black text-slate-900 tabular-nums">{member.activeClasses}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Subbing</p>
                  <p
                    className={`text-base font-black tabular-nums ${
                      member.substituteClasses > 0 ? "text-amber-700" : "text-slate-900"
                    }`}
                  >
                    {member.substituteClasses}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Students</p>
                  <p className="text-base font-black text-slate-900 tabular-nums">{member.studentCount}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold space-y-1">
                {member.activeClasses === 0 && member.substituteClasses === 0 && (
                  <p className="flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    No active teaching load in this branch.
                  </p>
                )}

                {progressError ? (
                  <p className="text-slate-400">Progress-report recency unavailable.</p>
                ) : member.progress ? (
                  member.progress.reportCount === 0 ? (
                    <p className="flex items-center gap-1.5 text-amber-700">
                      <GraduationCap className="w-3 h-3" />
                      No progress report in the current window.
                    </p>
                  ) : (
                    <p
                      className={`flex items-center gap-1.5 ${
                        member.progress.stale ? "text-amber-700" : "text-slate-500"
                      }`}
                    >
                      <GraduationCap className="w-3 h-3" />
                      Last report {member.progress.lastReportDate || "unknown"}
                      {member.progress.daysSince !== null && ` · ${member.progress.daysSince}d ago`}
                      {member.progress.stale && " · overdue"}
                    </p>
                  )
                ) : (
                  <p className="text-slate-400">No progress-report data for this instructor.</p>
                )}

                {member.substituteClasses > 0 && (
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Repeat className="w-3 h-3" />
                    Covering {member.substituteClasses} class(es) as substitute.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <p className="text-[11px] text-slate-500 font-medium">
          Looking for class-level coverage detail?{" "}
          <button
            type="button"
            onClick={() => onNavigate("coverage")}
            className="font-bold text-[#1a3a8f] hover:underline cursor-pointer"
          >
            Open Classes &amp; Coverage
          </button>
          .
        </p>
      </Card>
    </div>
  );
}
