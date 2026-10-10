/**
 * leaderUtils.js
 *
 * Pure derivation helpers for the Instructor Leader dashboard.
 * No React, no Firestore, no side effects — every function is directly testable.
 *
 * Governance anchors:
 * - Blueprint v3.3 §6.11: the Instructor Leader leads academic delivery within the
 *   assigned branch scope (curriculum standardization, academic quality control,
 *   teacher schedule assignments, teacher evaluations).
 * - G-003 (ratified 2026-10-07): all branch Instructors report directly to the
 *   Instructor Leader; the operational line runs to the Vice Director and the
 *   strategic/pedagogical line to the Director.
 * - G-011 (ratified 2026-10-07): the four branch leadership roles are peers.
 *
 * Authority boundary: everything here is DERIVED FROM DATA THE LEADER MAY ALREADY
 * READ (branch classes, branch instructor profiles, branch progress reports,
 * branch attendance). Nothing here may imply a capability the backend forbids.
 * See the Phase 1 completion report for the documented read-authority gaps.
 */

import { normalizeDivision, divisionOfProgram } from "../../../constants/divisions.js";
import { parseScheduleDayCodes } from "../../../constants/scheduleDays.js";
import { hasAssessedLevel } from "../../../constants/levels.js";
// Imported from their modules rather than the `classes` barrel so this pure utility
// does not pull React components (and their Firebase imports) into its module graph.
import { findScheduleConflicts } from "../../classes/scheduleConflict";
import { getBatchAvailability } from "../../classes/batchAvailability";

/** Statuses that no longer represent live academic delivery. */
const CLOSED_CLASS_STATUSES = new Set(["completed", "cancelled"]);

/**
 * Resolves a class document's canonical division.
 * Prefers the stored `division`; falls back to deriving it from `programId` so
 * legacy batches (written before the division field existed) still classify.
 *
 * @param {any} cls
 * @returns {"courses" | "kindergarten"}
 */
export function resolveClassDivision(cls) {
  if (!cls) return "courses";
  if (cls.division) return normalizeDivision(cls.division);
  return divisionOfProgram(cls.programId);
}

/**
 * True when a class is still live academic delivery (not completed/cancelled).
 *
 * @param {any} cls
 * @returns {boolean}
 */
export function isLiveClass(cls) {
  if (!cls) return false;
  return !CLOSED_CLASS_STATUSES.has(String(cls.status || "open").toLowerCase());
}

/**
 * Best-effort set of weekday codes a class runs on.
 * Prefers the structured `classDay`; falls back to parsing the human `schedule`
 * string. An empty set means the schedule could not be determined.
 *
 * @param {any} cls
 * @returns {Set<string>}
 */
export function scheduleCodesFor(cls) {
  if (!cls) return new Set();
  const fromClassDay = parseScheduleDayCodes(cls.classDay);
  if (fromClassDay.size > 0) return fromClassDay;
  return parseScheduleDayCodes(cls.schedule);
}

/**
 * True only when the class provably runs on `dayCode` ("mon", "tue", ...).
 * Unparseable schedules return false — the dashboard reports them separately as
 * "schedule unknown" rather than silently counting them as running today.
 *
 * @param {any} cls
 * @param {string} dayCode
 * @returns {boolean}
 */
export function isClassScheduledOn(cls, dayCode) {
  if (!dayCode) return false;
  return scheduleCodesFor(cls).has(dayCode);
}

/**
 * @param {Array<any>} classes
 * @param {string} dayCode
 * @returns {{ scheduled: Array<any>, unscheduled: Array<any> }}
 */
export function splitClassesByDay(classes = [], dayCode = "") {
  const scheduled = [];
  const unscheduled = [];
  (classes || []).forEach((cls) => {
    if (!cls || !isLiveClass(cls)) return;
    if (scheduleCodesFor(cls).size === 0) {
      unscheduled.push(cls);
      return;
    }
    if (isClassScheduledOn(cls, dayCode)) scheduled.push(cls);
  });
  return { scheduled, unscheduled };
}

/**
 * Counts live classes per division.
 *
 * @param {Array<any>} classes
 * @returns {{ total: number, courses: number, kindergarten: number }}
 */
export function buildDivisionBreakdown(classes = []) {
  const live = (classes || []).filter(isLiveClass);
  const kindergarten = live.filter((c) => resolveClassDivision(c) === "kindergarten").length;
  return {
    total: live.length,
    courses: live.length - kindergarten,
    kindergarten,
  };
}

/**
 * Sums unique enrolled student ids across a set of classes.
 *
 * @param {Array<any>} classes
 * @returns {number}
 */
export function countUniqueStudents(classes = []) {
  const ids = new Set();
  (classes || []).forEach((cls) => {
    (cls?.studentIds || []).forEach((id) => {
      if (typeof id === "string" && id) ids.add(id);
    });
  });
  return ids.size;
}

/** @typedef {"critical" | "attention" | "info"} ExceptionSeverity */

/**
 * Per-class coverage exceptions derived only from reliably present class fields.
 * Deliberately does NOT invent exceptions from missing data: a class with no
 * schedule simply produces no exception here (it is surfaced separately).
 *
 * @param {Array<any>} classes
 * @returns {Array<{ classId: string, className: string, division: string, type: string, severity: ExceptionSeverity, detail: string }>}
 */
export function findCoverageExceptions(classes = []) {
  const exceptions = [];

  (classes || []).filter(isLiveClass).forEach((cls) => {
    if (!cls) return;
    const classId = cls.id || "";
    const className = cls.className || "Unnamed class";
    const division = resolveClassDivision(cls);
    const base = { classId, className, division };

    if (!cls.instructorId) {
      exceptions.push({
        ...base,
        type: "missing_instructor",
        severity: "critical",
        detail: "No instructor assigned to this class.",
      });
    }

    if (cls.substituteInstructorId) {
      exceptions.push({
        ...base,
        type: "substitute_assigned",
        severity: "info",
        detail: `Covered by a substitute instructor${
          cls.substituteInstructorName ? ` (${cls.substituteInstructorName})` : ""
        }.`,
      });
    }

    const { studentCount, capacity, seatsAvailable } = getBatchAvailability(cls);
    if (capacity > 0 && studentCount > capacity) {
      exceptions.push({
        ...base,
        type: "over_capacity",
        severity: "attention",
        detail: `Enrolment ${studentCount} exceeds capacity ${capacity}.`,
      });
    }

    const minQuorum = Number(cls.minQuorum) || 0;
    if (minQuorum > 0 && studentCount > 0 && studentCount < minQuorum) {
      exceptions.push({
        ...base,
        type: "below_quorum",
        severity: "attention",
        detail: `Enrolment ${studentCount} is below the minimum quorum of ${minQuorum}.`,
      });
    }

    if (seatsAvailable === 0 && capacity > 0 && studentCount === capacity) {
      exceptions.push({
        ...base,
        type: "at_capacity",
        severity: "info",
        detail: `Class is full at ${studentCount}/${capacity}.`,
      });
    }
  });

  return exceptions;
}

/**
 * Teacher and room double-bookings, reusing the canonical schedule conflict engine.
 *
 * @param {Array<any>} classes
 * @returns {{ teacherConflicts: Array<any>, roomConflicts: Array<any> }}
 */
export function findCoverageConflicts(classes = []) {
  return findScheduleConflicts(classes || []);
}

/**
 * Aggregated coverage picture for the branch.
 *
 * @param {Array<any>} classes
 * @param {string} dayCode
 * @returns {{
 *   liveClasses: number,
 *   scheduledToday: number,
 *   scheduleUnknown: number,
 *   withInstructor: number,
 *   missingInstructor: number,
 *   substituting: number,
 *   overCapacity: number,
 *   teacherConflicts: number,
 *   roomConflicts: number,
 *   coverageRate: number
 * }}
 */
export function summarizeCoverage(classes = [], dayCode = "") {
  const live = (classes || []).filter(isLiveClass);
  const { scheduled, unscheduled } = splitClassesByDay(live, dayCode);
  const exceptions = findCoverageExceptions(live);
  const { teacherConflicts, roomConflicts } = findCoverageConflicts(live);

  const withInstructor = live.filter((c) => Boolean(c?.instructorId)).length;

  return {
    liveClasses: live.length,
    scheduledToday: scheduled.length,
    scheduleUnknown: unscheduled.length,
    withInstructor,
    missingInstructor: exceptions.filter((e) => e.type === "missing_instructor").length,
    substituting: live.filter((c) => Boolean(c?.substituteInstructorId)).length,
    overCapacity: exceptions.filter((e) => e.type === "over_capacity").length,
    teacherConflicts: teacherConflicts.length,
    roomConflicts: roomConflicts.length,
    coverageRate: live.length === 0 ? 1 : withInstructor / live.length,
  };
}

/**
 * Teaching load per branch instructor, across both divisions.
 *
 * @param {Array<any>} instructors — branch user docs (instructor / instructorleader)
 * @param {Array<any>} classes — branch class docs
 * @returns {Array<{
 *   uid: string,
 *   name: string,
 *   role: string,
 *   division: string,
 *   activeClasses: number,
 *   substituteClasses: number,
 *   studentCount: number,
 *   divisions: string[]
 * }>}
 */
export function buildInstructorWorkload(instructors = [], classes = []) {
  const live = (classes || []).filter(isLiveClass);

  return (instructors || []).map((instructor) => {
    const uid = instructor?.id || instructor?.uid || "";
    const taught = live.filter((c) => c?.instructorId === uid);
    const substituted = live.filter((c) => c?.substituteInstructorId === uid);

    const divisions = new Set();
    [...taught, ...substituted].forEach((c) => divisions.add(resolveClassDivision(c)));
    if (divisions.size === 0 && instructor?.division) {
      const own = normalizeDivision(instructor.division);
      if (instructor.division !== "all") divisions.add(own);
    }

    return {
      uid,
      name: instructor?.displayName || instructor?.name || instructor?.email || "Unnamed instructor",
      role: instructor?.role || "instructor",
      division: instructor?.division || "courses",
      activeClasses: taught.length,
      substituteClasses: substituted.length,
      studentCount: countUniqueStudents(taught),
      divisions: Array.from(divisions),
    };
  });
}

/**
 * Whole-day difference between two ISO-ish date strings (calendar days in UTC).
 * Returns null when either input is unusable.
 *
 * @param {string} fromIso
 * @param {string} toIso
 * @returns {number | null}
 */
export function daysBetweenIso(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${String(fromIso).slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${String(toIso).slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Progress-report recency per instructor, derived from branch progress reports
 * the Instructor Leader is authorized to read.
 *
 * @param {Array<any>} reports — branch progress reports
 * @param {Array<any>} instructors — branch instructor user docs
 * @param {{ today?: string, staleAfterDays?: number }} [options]
 * @returns {{
 *   totalReports: number,
 *   staleAfterDays: number,
 *   instructors: Array<{ uid: string, name: string, lastReportDate: string|null, daysSince: number|null, reportCount: number, stale: boolean }>,
 *   staleCount: number
 * }}
 */
export function summarizeProgressCoverage(reports = [], instructors = [], options = {}) {
  const today = options.today || "";
  const staleAfterDays = Number(options.staleAfterDays) || 30;

  const byInstructor = new Map();
  (reports || []).forEach((report) => {
    const uid = report?.instructorId;
    if (!uid) return;
    const date = String(report.examDate || report.submittedAt || report.createdAt || "").slice(0, 10);
    const entry = byInstructor.get(uid) || { count: 0, lastReportDate: null, daysSince: null };
    entry.count += 1;
    if (date) {
      if (!entry.lastReportDate || date > entry.lastReportDate) {
        entry.lastReportDate = date;
        entry.daysSince = daysBetweenIso(date, today);
      }
    }
    byInstructor.set(uid, entry);
  });

  const rows = (instructors || []).map((instructor) => {
    const uid = instructor?.id || instructor?.uid || "";
    const entry = byInstructor.get(uid) || { count: 0, lastReportDate: null, daysSince: null };
    const stale = entry.count === 0 || (entry.daysSince !== null && entry.daysSince > staleAfterDays);
    return {
      uid,
      name: instructor?.displayName || instructor?.name || instructor?.email || "Unnamed instructor",
      lastReportDate: entry.lastReportDate,
      daysSince: entry.daysSince,
      reportCount: entry.count,
      stale,
    };
  });

  return {
    totalReports: (reports || []).length,
    staleAfterDays,
    instructors: rows,
    staleCount: rows.filter((r) => r.stale).length,
  };
}

/**
 * Attendance completion for an explicit, bounded set of class/date pairs.
 * `expected` is the class roster size; `recorded` is the number of attendance
 * documents returned for that class on that date.
 *
 * @param {Array<{ classId: string, className?: string, division?: string, expected: number, recorded: number }>} rows
 * @returns {{ sessions: number, expected: number, recorded: number, completionRate: number, incomplete: Array<any> }}
 */
export function summarizeAttendanceCompletion(rows = []) {
  let expected = 0;
  let recorded = 0;
  const incomplete = [];

  (rows || []).forEach((row) => {
    if (!row) return;
    const exp = Math.max(0, Number(row.expected) || 0);
    const rec = Math.max(0, Number(row.recorded) || 0);
    expected += exp;
    recorded += rec;
    if (exp > 0 && rec < exp) {
      incomplete.push({ ...row, missing: exp - rec });
    }
  });

  return {
    sessions: (rows || []).length,
    expected,
    recorded,
    completionRate: expected === 0 ? 1 : recorded / expected,
    incomplete,
  };
}

const SEVERITY_RANK = { critical: 0, attention: 1, info: 2 };

/**
 * Builds the exception-first "Needs Attention" list for the overview tab.
 *
 * @param {{
 *   coverage?: { missingInstructor?: number, teacherConflicts?: number, roomConflicts?: number, overCapacity?: number, scheduleUnknown?: number },
 *   pendingApprovalsCount?: number,
 *   progressCoverage?: { staleAfterDays?: number, staleCount?: number },
 *   attendance?: { incomplete?: Array<any> },
 *   levelMismatchesCount?: number
 * }} input
 * @returns {Array<{ id: string, label: string, count: number, severity: ExceptionSeverity, targetTab: string }>}
 */
export function buildAttentionItems(input = {}) {
  const {
    coverage,
    pendingApprovalsCount = 0,
    progressCoverage,
    attendance,
    levelMismatchesCount = 0,
  } = input;
  const items = [];

  const push = (id, label, count, severity, targetTab) => {
    if (Number(count) > 0) items.push({ id, label, count: Number(count), severity, targetTab });
  };

  if (coverage) {
    push("missing_instructor", "classes without an assigned instructor", coverage.missingInstructor, "critical", "coverage");
    push("teacher_conflicts", "instructor double-bookings", coverage.teacherConflicts, "critical", "coverage");
    push("room_conflicts", "room double-bookings", coverage.roomConflicts, "attention", "coverage");
    push("over_capacity", "classes over capacity", coverage.overCapacity, "attention", "coverage");
    push("schedule_unknown", "classes with no parseable schedule", coverage.scheduleUnknown, "info", "coverage");
  }

  push("pending_approvals", "approvals awaiting your decision", pendingApprovalsCount, "attention", "approvals");

  if (levelMismatchesCount > 0) {
    push(
      "level_mismatches",
      "students placed in mismatched class levels (academic review pending)",
      levelMismatchesCount,
      "attention",
      "coverage"
    );
  }

  if (progressCoverage) {
    push("stale_progress", `instructors with no progress report in ${progressCoverage.staleAfterDays} days`, progressCoverage.staleCount, "attention", "progress");
  }

  if (attendance) {
    push("attendance_incomplete", "class sessions with incomplete attendance", attendance.incomplete.length, "attention", "attendance");
  }

  return items.sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return b.count - a.count;
  });
}

/**
 * Formats a class schedule for display without inventing missing values.
 *
 * @param {any} cls
 * @returns {string}
 */
export function formatClassSchedule(cls) {
  if (!cls) return "Schedule TBA";
  const day = cls.classDay || "";
  const start = cls.startTime || "";
  const end = cls.endTime || "";
  const window = start && end ? `${start}-${end}` : start || end;
  if (day && window) return `${day} ${window}`;
  if (day) return String(day);
  if (window) return window;
  return cls.schedule || "Schedule TBA";
}

/**
 * uid -> display name lookup for the branch teaching team.
 *
 * @param {Array<any>} instructors
 * @returns {Record<string, string>}
 */
export function buildInstructorNameMap(instructors = []) {
  /** @type {Record<string, string>} */
  const map = {};
  (instructors || []).forEach((instructor) => {
    const uid = instructor?.id || instructor?.uid;
    if (!uid) return;
    map[uid] = instructor.displayName || instructor.name || instructor.email || "Unnamed instructor";
  });
  return map;
}

/**
 * Resolves the best available instructor label for a class, preferring the live
 * branch roster and falling back to the name denormalized on the class document.
 * Never invents a name.
 *
 * @param {any} cls
 * @param {Record<string, string>} [nameMap]
 * @returns {string}
 */
export function resolveInstructorLabel(cls, nameMap = {}) {
  if (!cls) return "Unassigned";
  const fromMap = cls.instructorId ? nameMap[cls.instructorId] : "";
  return fromMap || cls.instructorName || "Unassigned";
}

/**
 * Default for tab-navigation props. Declared with the target-tab parameter so a
 * real setter (for example React's setActiveTab) remains assignable.
 *
 * @param {string} tabId
 */
export function noopNavigate(tabId) {
  void tabId;
}

/**
 * Default for the on-demand attendance loader. Declared with the date parameter
 * so the real loader remains assignable.
 *
 * @param {string} date
 */
export function noopLoadAttendance(date) {
  void date;
}

/**
 * Detects student-to-class level placement mismatches computed at read time (OD-FO-3 / Q4).
 *
 * An enrolled student in a class with a differing classLevel represents an academic
 * placement condition requiring Instructor Leader review, without blocking the enrollment flow.
 *
 * @param {Array<any>} classes
 * @param {Array<any>} students
 * @returns {Array<{
 *   studentId: string,
 *   studentName: string,
 *   studentLevel: string,
 *   classId: string,
 *   className: string,
 *   classLevel: string,
 *   division: string,
 * }>}
 */
export function findClassLevelMismatches(classes = [], students = []) {
  if (!classes?.length || !students?.length) return [];
  const studentMap = new Map();
  students.forEach((s) => {
    if (s?.id) studentMap.set(s.id, s);
  });

  const mismatches = [];
  classes.forEach((cls) => {
    if (!cls || !isLiveClass(cls)) return;
    const targetLevel = (cls.classLevel || cls.level || "").toLowerCase().trim();
    if (!hasAssessedLevel(targetLevel)) return;

    const studentIds = Array.isArray(cls.studentIds) ? cls.studentIds : [];
    studentIds.forEach((sid) => {
      const student = studentMap.get(sid);
      if (!student) return;
      const currentLevel = (student.currentLevel || "").toLowerCase().trim();
      if (!hasAssessedLevel(currentLevel) || currentLevel !== targetLevel) {
        mismatches.push({
          studentId: sid,
          studentName: student.displayName || "Student",
          studentLevel: hasAssessedLevel(currentLevel) ? currentLevel : "unassessed",
          classId: cls.id,
          className: cls.className || "Class",
          classLevel: targetLevel,
          division: resolveClassDivision(cls),
        });
      }
    });
  });

  return mismatches;
}

