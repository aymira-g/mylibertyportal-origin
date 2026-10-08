import { describe, it, expect } from "vitest";
import {
  buildAttentionItems,
  buildDivisionBreakdown,
  buildInstructorWorkload,
  countUniqueStudents,
  daysBetweenIso,
  findCoverageConflicts,
  findCoverageExceptions,
  formatClassSchedule,
  isClassScheduledOn,
  isLiveClass,
  resolveClassDivision,
  scheduleCodesFor,
  splitClassesByDay,
  summarizeAttendanceCompletion,
  summarizeCoverage,
  summarizeProgressCoverage,
} from "./leaderUtils";

const courseClass = (over = {}) => ({
  id: "c1",
  className: "Warrior A",
  branchId: "kota_gorontalo",
  division: "courses",
  classDay: "Mon/Wed",
  startTime: "09:00",
  endTime: "10:30",
  classRoom: "Room 1",
  instructorId: "ins1",
  studentIds: ["s1", "s2"],
  maxCapacity: 15,
  minQuorum: 4,
  status: "active",
  ...over,
});

const kidsClass = (over = {}) => ({
  id: "c2",
  className: "TK Bunga",
  branchId: "kota_gorontalo",
  division: "kindergarten",
  classDay: "Tue/Thu",
  startTime: "10:00",
  endTime: "11:00",
  classRoom: "Room 2",
  instructorId: "ins2",
  studentIds: ["s3"],
  maxCapacity: 16,
  minQuorum: 4,
  status: "active",
  ...over,
});

describe("leaderUtils — division and liveness", () => {
  it("prefers the stored division", () => {
    expect(resolveClassDivision(courseClass())).toBe("courses");
    expect(resolveClassDivision(kidsClass())).toBe("kindergarten");
  });

  it("derives division from programId for legacy batches without a division field", () => {
    expect(resolveClassDivision({ programId: "kids_school" })).toBe("kindergarten");
    expect(resolveClassDivision({ programId: "english_course" })).toBe("courses");
  });

  it("defaults to courses when nothing is resolvable", () => {
    expect(resolveClassDivision({})).toBe("courses");
    expect(resolveClassDivision(null)).toBe("courses");
  });

  it("treats completed and cancelled classes as not live", () => {
    expect(isLiveClass({ status: "completed" })).toBe(false);
    expect(isLiveClass({ status: "cancelled" })).toBe(false);
    expect(isLiveClass({ status: "active" })).toBe(true);
    expect(isLiveClass({ status: "open" })).toBe(true);
    // legacy docs without a status still count as live delivery
    expect(isLiveClass({})).toBe(true);
    expect(isLiveClass(null)).toBe(false);
  });
});

describe("leaderUtils — schedule resolution", () => {
  it("parses structured classDay values", () => {
    expect(scheduleCodesFor(courseClass()).has("mon")).toBe(true);
    expect(isClassScheduledOn(courseClass(), "mon")).toBe(true);
    expect(isClassScheduledOn(courseClass(), "tue")).toBe(false);
  });

  it("falls back to the human schedule string", () => {
    expect(isClassScheduledOn({ schedule: "Tue/Thu 10:00" }, "thu")).toBe(true);
  });

  it("reports an unparseable schedule as an empty code set rather than guessing today", () => {
    expect(scheduleCodesFor({ schedule: "by arrangement" }).size).toBe(0);
    expect(isClassScheduledOn({ classDay: "by arrangement" }, "mon")).toBe(false);
    expect(isClassScheduledOn(courseClass(), "")).toBe(false);
  });

  it("splits live classes into scheduled-today and schedule-unknown", () => {
    const { scheduled, unscheduled } = splitClassesByDay(
      [courseClass(), kidsClass(), courseClass({ id: "c3", classDay: "by arrangement" }), courseClass({ id: "c4", status: "completed" })],
      "mon"
    );
    expect(scheduled.map((c) => c.id)).toEqual(["c1"]);
    expect(unscheduled.map((c) => c.id)).toEqual(["c3"]);
  });
});

describe("leaderUtils — branch picture", () => {
  it("breaks live classes down by division", () => {
    expect(buildDivisionBreakdown([courseClass(), kidsClass(), courseClass({ id: "c9", status: "cancelled" })])).toEqual({
      total: 2,
      courses: 1,
      kindergarten: 1,
    });
  });

  it("counts unique students across overlapping classes", () => {
    expect(
      countUniqueStudents([
        courseClass({ studentIds: ["s1", "s2"] }),
        kidsClass({ studentIds: ["s2", "s3"] }),
      ])
    ).toBe(3);
  });

  it("formats a schedule without inventing values", () => {
    expect(formatClassSchedule(courseClass())).toBe("Mon/Wed 09:00-10:30");
    expect(formatClassSchedule({ classDay: "Sat Only" })).toBe("Sat Only");
    expect(formatClassSchedule({ schedule: "TBA" })).toBe("TBA");
    expect(formatClassSchedule(null)).toBe("Schedule TBA");
  });
});

describe("leaderUtils — coverage exceptions", () => {
  it("flags a missing instructor as critical", () => {
    const exceptions = findCoverageExceptions([courseClass({ instructorId: "", minQuorum: 0 })]);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({
      type: "missing_instructor",
      severity: "critical",
      classId: "c1",
      division: "courses",
    });
  });

  it("surfaces a substitute assignment as informational", () => {
    const exceptions = findCoverageExceptions([
      courseClass({ substituteInstructorId: "ins9", substituteInstructorName: "Maria", minQuorum: 0 }),
    ]);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].type).toBe("substitute_assigned");
    expect(exceptions[0].severity).toBe("info");
    expect(exceptions[0].detail).toContain("Maria");
  });

  it("flags over-capacity and at-capacity enrolments", () => {
    const over = findCoverageExceptions([courseClass({ studentIds: ["a", "b", "c"], maxCapacity: 2 })]);
    expect(over.map((e) => e.type)).toEqual(["over_capacity", "below_quorum"]);

    const full = findCoverageExceptions([courseClass({ studentIds: ["a", "b"], maxCapacity: 2, minQuorum: 0 })]);
    expect(full.map((e) => e.type)).toEqual(["at_capacity"]);
  });

  it("flags below-quorum only when the class actually has quorum data", () => {
    expect(findCoverageExceptions([courseClass({ studentIds: ["a"], minQuorum: 0 })])).toHaveLength(0);
    expect(findCoverageExceptions([courseClass({ studentIds: ["a"], minQuorum: 4 })]).map((e) => e.type)).toEqual([
      "below_quorum",
    ]);
  });

  it("ignores completed and cancelled classes entirely", () => {
    expect(findCoverageExceptions([courseClass({ status: "completed", instructorId: "" })])).toHaveLength(0);
    expect(findCoverageExceptions([courseClass({ status: "cancelled", instructorId: "" })])).toHaveLength(0);
  });

  it("does not invent exceptions from missing data", () => {
    // No schedule, no capacity, no quorum and a valid instructor -> nothing to report.
    const minimal = { id: "cx", className: "Bare", instructorId: "ins1", status: "active" };
    expect(findCoverageExceptions([minimal])).toHaveLength(0);
  });

  it("reuses the canonical conflict engine for double-bookings", () => {
    const conflicts = findCoverageConflicts([
      courseClass({ id: "c1", classDay: "Mon/Wed", startTime: "09:00", endTime: "10:30", instructorId: "ins1" }),
      courseClass({ id: "c5", classDay: "Wed Only", startTime: "10:00", endTime: "11:00", instructorId: "ins1" }),
    ]);
    expect(conflicts.teacherConflicts).toHaveLength(1);
  });
});

describe("leaderUtils — coverage summary", () => {
  it("summarizes coverage and reports unparseable schedules separately", () => {
    const summary = summarizeCoverage(
      [
        courseClass(),
        kidsClass(),
        courseClass({ id: "c3", instructorId: "", division: "courses" }),
        courseClass({ id: "c4", classDay: "by arrangement" }),
      ],
      "mon"
    );

    expect(summary.liveClasses).toBe(4);
    expect(summary.scheduledToday).toBe(2); // c1 and c3 both run Mon/Wed
    expect(summary.scheduleUnknown).toBe(1);
    expect(summary.missingInstructor).toBe(1);
    expect(summary.withInstructor).toBe(3);
    expect(summary.coverageRate).toBeCloseTo(0.75);
  });

  it("reports full coverage for an empty branch without dividing by zero", () => {
    expect(summarizeCoverage([], "mon").coverageRate).toBe(1);
  });

  it("counts substituting classes and room conflicts", () => {
    const summary = summarizeCoverage(
      [
        courseClass({ id: "c1", classRoom: "Room 1" }),
        courseClass({ id: "c2", classRoom: "Room 1", instructorId: "ins2" }),
        courseClass({ id: "c3", classRoom: "Room 3", substituteInstructorId: "ins9" }),
      ],
      "mon"
    );
    expect(summary.substituting).toBe(1);
    expect(summary.roomConflicts).toBe(1);
  });
});

describe("leaderUtils — instructor workload", () => {
  const instructors = [
    { id: "ins1", displayName: "Sarah", role: "instructor", division: "courses" },
    { id: "ins2", displayName: "Maria", role: "instructor", division: "kindergarten" },
    { id: "ins3", displayName: "Idle", role: "instructor", division: "courses" },
  ];

  it("counts primary and substitute load per instructor", () => {
    const workload = buildInstructorWorkload(instructors, [
      courseClass({ id: "c1", instructorId: "ins1", studentIds: ["s1", "s2"] }),
      courseClass({ id: "c2", instructorId: "ins1", studentIds: ["s2", "s3"] }),
      kidsClass({ id: "c3", instructorId: "ins2" }),
      courseClass({ id: "c4", instructorId: "ins9", substituteInstructorId: "ins1" }),
    ]);

    const sarah = workload.find((w) => w.uid === "ins1");
    expect(sarah.activeClasses).toBe(2);
    expect(sarah.substituteClasses).toBe(1);
    expect(sarah.studentCount).toBe(3);
    expect(sarah.divisions.sort()).toEqual(["courses"]);

    const maria = workload.find((w) => w.uid === "ins2");
    expect(maria.activeClasses).toBe(1);
    expect(maria.divisions).toEqual(["kindergarten"]);

    const idle = workload.find((w) => w.uid === "ins3");
    expect(idle.activeClasses).toBe(0);
    expect(idle.divisions).toEqual(["courses"]);
  });

  it("ignores closed classes when computing load", () => {
    const workload = buildInstructorWorkload(instructors, [
      courseClass({ id: "c1", instructorId: "ins1", status: "completed" }),
    ]);
    expect(workload.find((w) => w.uid === "ins1").activeClasses).toBe(0);
  });

  it("does not claim a single division for a cross-division load", () => {
    const workload = buildInstructorWorkload(instructors, [
      courseClass({ id: "c1", instructorId: "ins1" }),
      kidsClass({ id: "c2", instructorId: "ins1" }),
    ]);
    expect(workload.find((w) => w.uid === "ins1").divisions.sort()).toEqual(["courses", "kindergarten"]);
  });

  it("falls back to a readable label for nameless profiles", () => {
    const workload = buildInstructorWorkload([{ id: "x", email: "a@b.c" }], []);
    expect(workload[0].name).toBe("a@b.c");
  });
});

describe("leaderUtils — date maths", () => {
  it("computes whole-day differences", () => {
    expect(daysBetweenIso("2026-09-01", "2026-09-11")).toBe(10);
    expect(daysBetweenIso("2026-09-11T04:00:00.000Z", "2026-09-01T22:00:00.000Z")).toBe(-10);
    expect(daysBetweenIso("", "2026-09-01")).toBeNull();
    expect(daysBetweenIso("not-a-date", "2026-09-01")).toBeNull();
  });
});

describe("leaderUtils — progress coverage", () => {
  const instructors = [
    { id: "ins1", displayName: "Sarah" },
    { id: "ins2", displayName: "Maria" },
  ];

  it("flags instructors with no report in the window", () => {
    const summary = summarizeProgressCoverage(
      [{ instructorId: "ins1", examDate: "2026-09-05" }],
      instructors,
      { today: "2026-09-10", staleAfterDays: 30 }
    );

    const sarah = summary.instructors.find((i) => i.uid === "ins1");
    expect(sarah.daysSince).toBe(5);
    expect(sarah.stale).toBe(false);

    const maria = summary.instructors.find((i) => i.uid === "ins2");
    expect(maria.reportCount).toBe(0);
    expect(maria.stale).toBe(true);

    expect(summary.staleCount).toBe(1);
    expect(summary.totalReports).toBe(1);
  });

  it("marks a report older than the window as stale", () => {
    const summary = summarizeProgressCoverage(
      [{ instructorId: "ins1", examDate: "2026-01-01" }],
      instructors,
      { today: "2026-09-10", staleAfterDays: 30 }
    );
    expect(summary.instructors.find((i) => i.uid === "ins1").stale).toBe(true);
  });

  it("uses the newest report when several exist", () => {
    const summary = summarizeProgressCoverage(
      [
        { instructorId: "ins1", examDate: "2026-08-01" },
        { instructorId: "ins1", examDate: "2026-09-08" },
      ],
      instructors,
      { today: "2026-09-10", staleAfterDays: 30 }
    );
    const sarah = summary.instructors.find((i) => i.uid === "ins1");
    expect(sarah.lastReportDate).toBe("2026-09-08");
    expect(sarah.reportCount).toBe(2);
  });
});

describe("leaderUtils — attendance completion", () => {
  it("computes completion and lists incomplete sessions", () => {
    const summary = summarizeAttendanceCompletion([
      { classId: "c1", className: "A", expected: 10, recorded: 10 },
      { classId: "c2", className: "B", expected: 8, recorded: 3 },
    ]);
    expect(summary.expected).toBe(18);
    expect(summary.recorded).toBe(13);
    expect(summary.completionRate).toBeCloseTo(13 / 18);
    expect(summary.incomplete).toHaveLength(1);
    expect(summary.incomplete[0].missing).toBe(5);
  });

  it("treats an empty roster as nothing to complete", () => {
    const summary = summarizeAttendanceCompletion([{ classId: "c1", expected: 0, recorded: 0 }]);
    expect(summary.incomplete).toHaveLength(0);
    expect(summary.completionRate).toBe(1);
  });
});

describe("leaderUtils — attention list", () => {
  it("orders by severity and drops zero counts", () => {
    const items = buildAttentionItems({
      coverage: {
        missingInstructor: 2,
        teacherConflicts: 1,
        roomConflicts: 0,
        overCapacity: 3,
        scheduleUnknown: 0,
      },
      pendingApprovalsCount: 1,
      progressCoverage: { staleAfterDays: 30, staleCount: 4 },
      attendance: { incomplete: [{ missing: 1 }] },
    });

    expect(items.map((i) => i.id)).toEqual([
      "missing_instructor",
      "teacher_conflicts",
      "stale_progress",
      "over_capacity",
      "pending_approvals",
      "attendance_incomplete",
    ]);
    expect(items.every((i) => i.count > 0)).toBe(true);
    expect(items[0].severity).toBe("critical");
  });

  it("returns an empty list when a branch is clear", () => {
    expect(
      buildAttentionItems({
        coverage: { missingInstructor: 0, teacherConflicts: 0, roomConflicts: 0, overCapacity: 0, scheduleUnknown: 0 },
        pendingApprovalsCount: 0,
        progressCoverage: { staleAfterDays: 30, staleCount: 0 },
        attendance: { incomplete: [] },
      })
    ).toEqual([]);
  });

  it("omits progress items when that data could not be loaded", () => {
    const items = buildAttentionItems({ pendingApprovalsCount: 1 });
    expect(items.map((i) => i.id)).toEqual(["pending_approvals"]);
  });
});
