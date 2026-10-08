import { useState, useEffect, useMemo, useCallback } from "react";
import { useInstructorWorkspace } from "./useInstructorWorkspace";
import {
  listenToBranchInstructors,
  listenToBranchProgressReports,
  fetchClassAttendanceForDate,
} from "./instructorLeaderRepository";
import {
  buildAttentionItems,
  buildDivisionBreakdown,
  buildInstructorWorkload,
  countUniqueStudents,
  findCoverageExceptions,
  isLiveClass,
  resolveClassDivision,
  summarizeAttendanceCompletion,
  summarizeCoverage,
  summarizeProgressCoverage,
} from "./leaderUtils";
import { getTodayWitaWeekday, todayWita } from "../../../utils/dateWita.js";
import { NUM_TO_DAY_CODE } from "../../../constants/scheduleDays.js";
import { usePendingApprovalsCount } from "../../shared";

const STALE_PROGRESS_DAYS = 30;

/**
 * useInstructorLeaderWorkspace
 *
 * Branch-scope academic leadership data for the Instructor Leader dashboard.
 *
 * Layering:
 * - Reuses `useInstructorWorkspace` for the leader's OWN teaching roster, the
 *   single branch active-classes listener, and the instructor directive inbox.
 *   No listener is duplicated.
 * - Adds exactly two branch-scoped listeners (teaching team, progress reports).
 * - Attendance is fetched on demand only, never as a branch-wide realtime listener.
 *
 * @param {{ role?: string, branch?: string }} [options]
 */
export function useInstructorLeaderWorkspace({ role = "", branch = "" } = {}) {
  const workspace = useInstructorWorkspace({ role, branch });
  const { effectiveBranch, allClasses } = workspace;

  // Owned here rather than by the dashboard because the pending-approval queue must
  // be scoped to the RESOLVED branch, which only exists after the profile loads.
  const pendingApprovalsCount = usePendingApprovalsCount("instructorleader", effectiveBranch);

  const todayDate = useMemo(() => todayWita(), []);
  const todayDayCode = useMemo(() => NUM_TO_DAY_CODE[getTodayWitaWeekday()] || "", []);

  const [teamState, setTeamState] = useState(() => ({ branch: "", list: [], error: "", loaded: false }));
  const [reportState, setReportState] = useState(() => ({ branch: "", list: [], error: "", loaded: false }));
  const [attendance, setAttendance] = useState(() => ({ date: "", loading: false, error: "", rows: [] }));

  useEffect(() => {
    if (!effectiveBranch) return () => {};
    let cancelled = false;

    const unsubscribe = listenToBranchInstructors(
      effectiveBranch,
      (list) => {
        if (cancelled) return;
        setTeamState({ branch: effectiveBranch, list, error: "", loaded: true });
      },
      (err) => {
        if (cancelled) return;
        setTeamState({
          branch: effectiveBranch,
          list: [],
          error: err?.message || "Unable to load the branch teaching team.",
          loaded: true,
        });
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [effectiveBranch]);

  useEffect(() => {
    if (!effectiveBranch) return () => {};
    let cancelled = false;

    const unsubscribe = listenToBranchProgressReports(
      effectiveBranch,
      (list) => {
        if (cancelled) return;
        setReportState({ branch: effectiveBranch, list, error: "", loaded: true });
      },
      (err) => {
        if (cancelled) return;
        setReportState({
          branch: effectiveBranch,
          list: [],
          error:
            err?.code === "failed-precondition"
              ? "The branch progress-report index is not deployed yet. Deploy firestore indexes to enable this view."
              : err?.message || "Unable to load branch progress reports.",
          loaded: true,
        });
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [effectiveBranch]);

  // Wrapped in useMemo so the identity is stable across renders; without this the
  // downstream useMemo dependency arrays would invalidate on every render.
  const branchInstructors = useMemo(
    () => (teamState.branch === effectiveBranch ? teamState.list : []),
    [teamState.branch, teamState.list, effectiveBranch]
  );
  const branchProgressReports = useMemo(
    () => (reportState.branch === effectiveBranch ? reportState.list : []),
    [reportState.branch, reportState.list, effectiveBranch]
  );

  const teamLoading = !teamState.loaded || teamState.branch !== effectiveBranch;
  const teamError = teamState.branch === effectiveBranch ? teamState.error : "";
  const reportsLoading = !reportState.loaded || reportState.branch !== effectiveBranch;
  const reportsError = reportState.branch === effectiveBranch ? reportState.error : "";

  const coverage = useMemo(() => summarizeCoverage(allClasses, todayDayCode), [allClasses, todayDayCode]);
  const divisionBreakdown = useMemo(() => buildDivisionBreakdown(allClasses), [allClasses]);
  const coverageExceptions = useMemo(() => findCoverageExceptions(allClasses), [allClasses]);
  const studentsServed = useMemo(() => countUniqueStudents(allClasses), [allClasses]);

  const instructorWorkload = useMemo(
    () => buildInstructorWorkload(branchInstructors, allClasses),
    [branchInstructors, allClasses]
  );

  const progressCoverage = useMemo(
    () =>
      summarizeProgressCoverage(branchProgressReports, branchInstructors, {
        today: todayDate,
        staleAfterDays: STALE_PROGRESS_DAYS,
      }),
    [branchProgressReports, branchInstructors, todayDate]
  );

  const attendanceSummary = useMemo(
    () => summarizeAttendanceCompletion(attendance.rows),
    [attendance.rows]
  );

  const attentionItems = useMemo(
    () =>
      buildAttentionItems({
        coverage,
        pendingApprovalsCount,
        progressCoverage: reportsError ? undefined : progressCoverage,
        attendance: attendance.rows.length > 0 ? attendanceSummary : undefined,
      }),
    [coverage, pendingApprovalsCount, progressCoverage, reportsError, attendance.rows.length, attendanceSummary]
  );

  const loadAttendance = useCallback(
    async (date) => {
      const targetDate = date || todayWita();
      const liveClasses = (allClasses || []).filter(isLiveClass);
      const classIds = liveClasses.map((cls) => cls.id).filter(Boolean);

      setAttendance((prev) => ({ ...prev, date: targetDate, loading: true, error: "" }));

      try {
        const records = await fetchClassAttendanceForDate(classIds, targetDate);
        const recordedByClass = new Map();
        records.forEach((record) => {
          recordedByClass.set(record.classId, (recordedByClass.get(record.classId) || 0) + 1);
        });

        const rows = liveClasses.map((cls) => ({
          classId: cls.id,
          className: cls.className || "Unnamed class",
          division: resolveClassDivision(cls),
          expected: (cls.studentIds || []).length,
          recorded: recordedByClass.get(cls.id) || 0,
        }));

        setAttendance({ date: targetDate, loading: false, error: "", rows });
      } catch (err) {
        console.error("loadAttendance error:", err);
        setAttendance({
          date: targetDate,
          loading: false,
          error: err?.message || "Unable to load attendance for this date.",
          rows: [],
        });
      }
    },
    [allClasses]
  );

  return {
    // own teaching (unchanged instructor capabilities)
    ...workspace,

    // branch leadership scope
    todayDate,
    todayDayCode,
    branchInstructors,
    branchProgressReports,
    teamLoading,
    teamError,
    reportsLoading,
    reportsError,

    // derived leadership picture
    coverage,
    divisionBreakdown,
    coverageExceptions,
    studentsServed,
    instructorWorkload,
    progressCoverage,
    attentionItems,
    pendingApprovalsCount,

    // on-demand attendance monitoring
    attendance,
    attendanceSummary,
    loadAttendance,
  };
}
