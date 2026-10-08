import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake, firestoreModule } from "../../../test/firestoreFake.js";
import {
  BRANCH_INSTRUCTOR_ROLES,
  PROGRESS_REPORT_LIMIT,
  fetchClassAttendanceForDate,
  listenToBranchInstructors,
  listenToBranchProgressReports,
} from "./instructorLeaderRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../../test/firestoreFake.js")).firestoreModule
);

vi.mock("../../../firebase", () => ({
  db: { fakeDb: true },
}));

/** Reads the query object the fake query builder actually returned. */
function lastQuery() {
  return firestoreModule.query.mock.results.at(-1).value;
}

describe("instructorLeaderRepository", () => {
  beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
  });

  it("scopes the branch teaching team query to the instructor family AND the resolved branch", () => {
    fake.seed("users", [
      { id: "ins1", role: "instructor", branchId: "kota_gorontalo", displayName: "Sarah" },
      { id: "il1", role: "instructorleader", branchId: "kota_gorontalo", displayName: "Leader" },
      { id: "il2", role: "instructor_leader", branchId: "kota_gorontalo", displayName: "Legacy" },
      { id: "insOther", role: "instructor", branchId: "bone_bolango", displayName: "Other branch" },
      { id: "mgr1", role: "manager", branchId: "kota_gorontalo", displayName: "Manager" },
      { id: "stu1", role: "student", branchId: "kota_gorontalo", displayName: "Student" },
    ]);

    let received = null;
    const unsubscribe = listenToBranchInstructors(
      "Kota Gorontalo",
      (list) => {
        received = list;
      },
      () => {}
    );

    // Branch name is normalized to the canonical id before querying.
    const constraints = lastQuery().constraints;
    expect(constraints).toContainEqual({
      type: "where",
      field: "role",
      op: "in",
      value: BRANCH_INSTRUCTOR_ROLES,
    });
    expect(constraints).toContainEqual({
      type: "where",
      field: "branchId",
      op: "==",
      value: "kota_gorontalo",
    });

    expect(received.map((u) => u.id).sort()).toEqual(["il1", "il2", "ins1"]);
    expect(typeof unsubscribe).toBe("function");
  });

  it("bounds the progress-report listener by branch, recency order and a hard limit", () => {
    fake.seed("progressReports", [
      { id: "p1", branchId: "kota_gorontalo", examDate: "2026-09-10" },
      { id: "p2", branchId: "kota_gorontalo", examDate: "2026-09-20" },
      { id: "p3", branchId: "bone_bolango", examDate: "2026-09-25" },
    ]);

    let received = null;
    listenToBranchProgressReports("kota_gorontalo", (list) => {
      received = list;
    }, () => {});

    const constraints = lastQuery().constraints;
    expect(constraints).toContainEqual({
      type: "where",
      field: "branchId",
      op: "==",
      value: "kota_gorontalo",
    });
    expect(constraints).toContainEqual({ type: "orderBy", field: "examDate", direction: "desc" });
    expect(constraints).toContainEqual({ type: "limit", n: PROGRESS_REPORT_LIMIT });

    // Newest first, and never another branch's report.
    expect(received.map((r) => r.id)).toEqual(["p2", "p1"]);
  });

  it("routes listener failures to the caller instead of throwing", () => {
    const onError = vi.fn();
    /** @type {any} */
    const onSnapshotMock = firestoreModule.onSnapshot;
    onSnapshotMock.mockImplementationOnce((_q, _onNext, onErrorCb) => {
      onErrorCb(new Error("permission denied"));
      return () => {};
    });

    listenToBranchProgressReports("kota_gorontalo", () => {}, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("permission denied");
  });

  it("chunks attendance reads by 30 class ids and flattens the results", async () => {
    fake.seed("classAttendance", [
      { id: "a1", classId: "c1", attendanceDate: "2026-09-27", status: "PRESENT" },
      { id: "a2", classId: "c31", attendanceDate: "2026-09-27", status: "ABSENT" },
      { id: "a3", classId: "c1", attendanceDate: "2026-09-28", status: "PRESENT" },
    ]);

    const classIds = Array.from({ length: 31 }, (_, index) => `c${index + 1}`);
    const records = await fetchClassAttendanceForDate(classIds, "2026-09-27");

    expect(firestoreModule.getDocs).toHaveBeenCalledTimes(2);

    const constraints = lastQuery().constraints;
    const classConstraint = constraints.find((c) => c.field === "classId");
    expect(classConstraint.op).toBe("in");
    expect(classConstraint.value).toHaveLength(1); // the remainder chunk
    expect(constraints).toContainEqual({
      type: "where",
      field: "attendanceDate",
      op: "==",
      value: "2026-09-27",
    });

    // Same-day records only, across both chunks.
    expect(records.map((r) => r.id).sort()).toEqual(["a1", "a2"]);
  });

  it("short-circuits attendance reads with no classes or no date (no wasted reads)", async () => {
    expect(await fetchClassAttendanceForDate([], "2026-09-27")).toEqual([]);
    expect(await fetchClassAttendanceForDate(["c1"], "")).toEqual([]);
    expect(firestoreModule.getDocs).not.toHaveBeenCalled();
  });
});
