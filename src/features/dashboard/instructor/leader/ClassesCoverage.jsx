import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Info,
  MapPin,
  Repeat,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge, Card, LevelBadge } from "../../../shared";
import {
  buildInstructorNameMap,
  findCoverageConflicts,
  formatClassSchedule,
  isLiveClass,
  noopNavigate,
  resolveClassDivision,
  resolveInstructorLabel,
} from "../leaderUtils";
import { getBatchAvailability } from "../../../classes/batchAvailability";
import { DivisionBadge, LeaderEmptyState, LeaderErrorNote } from "./leaderUi";

const DIVISION_FILTERS = [
  { id: "all", label: "All divisions" },
  { id: "courses", label: "Course Academy" },
  { id: "kindergarten", label: "Kids School" },
];

const COVERAGE_FILTERS = [
  { id: "all", label: "All classes" },
  { id: "uncovered", label: "Needs coverage" },
  { id: "substitute", label: "Substitute" },
  { id: "full", label: "At/over capacity" },
];

/**
 * ClassesCoverage
 *
 * Branch-scope leadership view of active classes across BOTH divisions, with a
 * coverage-first filter set and the canonical double-booking engine.
 *
 * Read-only by design. Class records are Admin-owned for creation/deletion and
 * Front Office-owned for roster mutation (firestore.rules /classes block), so
 * this view offers an escalation path rather than direct mutation.
 */
export default function ClassesCoverage({
  classes = [],
  branchInstructors = [],
  levelMismatches = [],
  loading = false,
  error = "",
  onNavigate = noopNavigate,
}) {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");

  const nameMap = useMemo(() => buildInstructorNameMap(branchInstructors), [branchInstructors]);

  const liveClasses = useMemo(() => (classes || []).filter(isLiveClass), [classes]);

  const conflicts = useMemo(() => findCoverageConflicts(liveClasses), [liveClasses]);

  const conflictClassIds = useMemo(() => {
    const ids = new Set();
    [...conflicts.teacherConflicts, ...conflicts.roomConflicts].forEach((conflict) => {
      if (conflict.classA?.id) ids.add(conflict.classA.id);
      if (conflict.classB?.id) ids.add(conflict.classB.id);
    });
    return ids;
  }, [conflicts]);

  const rows = useMemo(() => {
    const enriched = liveClasses.map((cls) => {
      const availability = getBatchAvailability(cls);
      const division = resolveClassDivision(cls);
      const hasConflict = conflictClassIds.has(cls.id);
      return {
        cls,
        division,
        availability,
        hasConflict,
        uncovered: !cls.instructorId,
        substituting: Boolean(cls.substituteInstructorId),
      };
    });

    let filtered = enriched;
    if (divisionFilter !== "all") {
      filtered = filtered.filter((row) => row.division === divisionFilter);
    }
    if (coverageFilter === "uncovered") filtered = filtered.filter((row) => row.uncovered);
    if (coverageFilter === "substitute") filtered = filtered.filter((row) => row.substituting);
    if (coverageFilter === "full") {
      filtered = filtered.filter(
        (row) => row.availability.capacity > 0 && row.availability.studentCount >= row.availability.capacity
      );
    }

    return filtered.sort((a, b) => {
      const aTime = a.cls.startTime || "99:99";
      const bTime = b.cls.startTime || "99:99";
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return String(a.cls.className || "").localeCompare(String(b.cls.className || ""));
    });
  }, [liveClasses, divisionFilter, coverageFilter, conflictClassIds]);

  const summary = useMemo(() => {
    const totalStudents = rows.reduce((sum, row) => sum + row.availability.studentCount, 0);
    return {
      shown: rows.length,
      total: liveClasses.length,
      students: totalStudents,
      uncovered: liveClasses.filter((cls) => !cls.instructorId).length,
      substituting: liveClasses.filter((cls) => Boolean(cls.substituteInstructorId)).length,
      teacherConflicts: conflicts.teacherConflicts.length,
      roomConflicts: conflicts.roomConflicts.length,
    };
  }, [rows, liveClasses, conflicts]);

  if (loading) {
    return (
      <Card>
        <p className="p-8 text-center text-slate-400 text-sm font-medium">Loading branch classes…</p>
      </Card>
    );
  }

  if (error) {
    return <LeaderErrorNote title="Could not load branch classes" message={error} />;
  }

  return (
    <div className="space-y-5 w-full">
      {levelMismatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">
              {levelMismatches.length} Student Level Placement Mismatch{levelMismatches.length > 1 ? "es" : ""}:
            </span>{" "}
            Students enrolled in batches differing from their assessed level (or not yet formally assessed).
            Front desk enrollment proceeds normally; academic adjustment remains under Instructor Leadership review.
          </div>
        </div>
      )}

      {/* ── Summary + filters ── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1a3a8f]" />
              <h4 className="font-extrabold text-slate-800 text-sm">Classes &amp; Coverage</h4>
              <Badge tone="indigo">
                {summary.shown}/{summary.total}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Active branch classes across both divisions · {summary.students} enrolled students in view
            </p>
          </div>

          <div className="flex flex-col gap-2">
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
            <div className="flex flex-wrap gap-1.5">
              {COVERAGE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCoverageFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    coverageFilter === filter.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-rose-700/80">Needs coverage</p>
            <p className="text-lg font-black text-rose-800 tabular-nums">{summary.uncovered}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-amber-700/80">Substituting</p>
            <p className="text-lg font-black text-amber-800 tabular-nums">{summary.substituting}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-indigo-700/80">Instructor clashes</p>
            <p className="text-lg font-black text-indigo-800 tabular-nums">{summary.teacherConflicts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-600">Room clashes</p>
            <p className="text-lg font-black text-slate-800 tabular-nums">{summary.roomConflicts}</p>
          </div>
        </div>
      </Card>

      {/* ── Conflict detail ── */}
      {(summary.teacherConflicts > 0 || summary.roomConflicts > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Schedule Conflicts
            </h4>
          </div>
          <ul className="space-y-1.5">
            {[...conflicts.teacherConflicts, ...conflicts.roomConflicts].map((conflict, index) => (
              <li
                key={`${conflict.type}-${conflict.classA?.id}-${conflict.classB?.id}-${index}`}
                className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5"
              >
                <span
                  className={`text-[10px] font-bold uppercase mr-2 ${
                    conflict.type === "teacher" ? "text-rose-600" : "text-amber-700"
                  }`}
                >
                  {conflict.type === "teacher" ? "Instructor" : "Room"}
                </span>
                {conflict.detail}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Class list ── */}
      {rows.length === 0 ? (
        <Card>
          <LeaderEmptyState
            icon={BookOpen}
            title="No classes match these filters"
            message="Try a different division or coverage filter, or confirm the branch has active class records."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ cls, division, availability, hasConflict, uncovered, substituting }) => (
            <Card key={cls.id} className="space-y-2.5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-[#1a3a8f] tabular-nums">
                      {cls.startTime || "--:--"}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900">{cls.className || "Unnamed class"}</span>
                    <DivisionBadge division={division} />
                    {cls.classLevel && <LevelBadge level={cls.classLevel} />}
                    {cls.batchType && (
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {cls.batchType}
                      </span>
                    )}
                    {hasConflict && (
                      <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        Conflict
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      {resolveInstructorLabel(cls, nameMap)}
                    </span>
                    {substituting && (
                      <span className="flex items-center gap-1 text-amber-700 font-bold">
                        <Repeat className="w-3 h-3" />
                        Substitute:{" "}
                        {nameMap[cls.substituteInstructorId] || cls.substituteInstructorName || "Assigned"}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatClassSchedule(cls)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {cls.classRoom || "Main Campus"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-600 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {availability.studentCount}/{availability.capacity}
                  </span>
                  {uncovered ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border text-rose-700 bg-rose-50 border-rose-200">
                      Needs coverage
                    </span>
                  ) : substituting ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border text-amber-800 bg-amber-50 border-amber-200">
                      Substitute
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                      Covered
                    </span>
                  )}
                </div>
              </div>

              {availability.seatsAvailable === 0 && availability.capacity > 0 && (
                <p className="text-[11px] font-bold text-amber-700">
                  Class is full — {availability.studentCount}/{availability.capacity} seats taken.
                </p>
              )}
              {availability.studentCount > availability.capacity && (
                <p className="text-[11px] font-bold text-rose-700">
                  Enrolment exceeds capacity ({availability.studentCount}/{availability.capacity}).
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Governance boundary ── */}
      <Card className="border-dashed">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 font-medium">
            This view is read-only. Class creation/deletion is Admin-owned and roster changes are
            Front Office-owned, so the Instructor Leader escalates coverage problems rather than editing
            class records directly. Use{" "}
            <button
              type="button"
              onClick={() => onNavigate("approvals")}
              className="font-bold text-[#1a3a8f] hover:underline cursor-pointer"
            >
              Academic Approvals
            </button>{" "}
            for substitute-instructor authorisation and{" "}
            <button
              type="button"
              onClick={() => onNavigate("team")}
              className="font-bold text-[#1a3a8f] hover:underline cursor-pointer"
            >
              Instructor Team
            </button>{" "}
            to identify available capacity.
          </p>
        </div>
      </Card>
    </div>
  );
}
