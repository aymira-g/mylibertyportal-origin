import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake } from "../../test/firestoreFake.js";
import {
  fetchStaffShifts,
  fetchTodayScansData,
  fetchStudentProgressData,
  fetchAdmissionsReportData,
  fetchInstructorAnalyticsData,
} from "./reportsRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "admin1" } },
}));

beforeEach(() => {
  fake.reset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchStaffShifts", () => {
  it("normalizes user branch and prioritizes user profile over shift branch", async () => {
    fake.seed("users", [
      { id: "u1", role: "instructor", displayName: "Ms. Rina", branch: "Cabang Utama" },
      { id: "u2", role: "frontoffice", displayName: "Mr. Budi", branch: "  pohuwato  " },
      { id: "u3", role: "instructor", displayName: "Ms. Dewi" }, // missing branch
    ]);

    fake.seed("shifts", [
      {
        id: "s1",
        userId: "u1",
        clockIn: "2026-09-21T08:00:00.000Z",
        clockOut: "2026-09-21T16:00:00.000Z",
        branch: "Raw Old Branch",
      },
      {
        id: "s2",
        userId: "u2",
        clockIn: "2026-09-21T09:00:00.000Z",
        clockOut: null,
      },
      {
        id: "s3",
        userId: "u3",
        clockIn: "2026-09-21T10:00:00.000Z",
        clockOut: null,
      },
    ]);

    fake.seed("staffLeave", []);

    const { shifts, staffMembers } = await fetchStaffShifts(true);

    expect(shifts).toHaveLength(3);
    const byId = Object.fromEntries(shifts.map((s) => [s.id, s.branch]));
    // Legacy alias normalized
    expect(byId.s1).toBe("Kota Gorontalo");
    // Trimmed and canonicalized
    expect(byId.s2).toBe("Pohuwato");
    // Fallback for missing branch
    expect(byId.s3).toBe("Kota Gorontalo");

    // Staff members exclude students
    expect(staffMembers.map((m) => m.displayName)).toEqual(
      expect.arrayContaining(["Ms. Rina", "Mr. Budi", "Ms. Dewi"])
    );
  });

  it("normalizes branch from shift data if user has no branch set", async () => {
    fake.seed("users", [
      { id: "u1", role: "instructor", displayName: "Mr. Alex", branch: "" },
    ]);

    fake.seed("shifts", [
      {
        id: "s1",
        userId: "u1",
        clockIn: "2026-09-21T08:00:00.000Z",
        clockOut: null,
        branch: "bone bolango",
      },
    ]);

    fake.seed("staffLeave", []);

    const { shifts } = await fetchStaffShifts(true);
    expect(shifts[0].branch).toBe("Bone Bolango");
  });

  it("filters shifts, users, and leaves by branchId when provided", async () => {
    fake.seed("users", [
      { id: "u1", role: "instructor", displayName: "Ms. Rina", branchId: "kota_gorontalo" },
      { id: "u2", role: "frontoffice", displayName: "Mr. Budi", branchId: "bone_bolango" },
    ]);

    fake.seed("shifts", [
      {
        id: "s1",
        userId: "u1",
        clockIn: "2026-09-21T08:00:00.000Z",
        clockOut: "2026-09-21T16:00:00.000Z",
        branchId: "kota_gorontalo",
      },
      {
        id: "s2",
        userId: "u2",
        clockIn: "2026-09-21T09:00:00.000Z",
        clockOut: null,
        branchId: "bone_bolango",
      },
    ]);

    fake.seed("staffLeave", [
      { id: "l1", userId: "u1", branchId: "kota_gorontalo" },
      { id: "l2", userId: "u2", branchId: "bone_bolango" },
    ]);

    const result = await fetchStaffShifts(true, null, "Bone Bolango");
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].id).toBe("s2");
    expect(result.staffMembers).toHaveLength(1);
    expect(result.staffMembers[0].id).toBe("u2");
    expect(result.leaves).toHaveLength(1);
    expect(result.leaves[0].id).toBe("l2");
  });
});

describe("fetchTodayScansData", () => {
  it("scopes attendance, classes, and users to branchId when provided", async () => {
    fake.seed("attendance", [
      { id: "att1", timestamp: "2026-09-28T08:00:00.000Z", userId: "st1", branchId: "kota_gorontalo" },
      { id: "att2", timestamp: "2026-09-28T08:30:00.000Z", userId: "st2", branchId: "bone_bolango" },
    ]);
    fake.seed("classes", [
      { id: "c1", className: "English 1", branchId: "kota_gorontalo", instructorId: "ins1" },
      { id: "c2", className: "English 2", branchId: "bone_bolango", instructorId: "ins2" },
    ]);
    fake.seed("users", [
      { id: "st1", role: "student", branchId: "kota_gorontalo" },
      { id: "st2", role: "student", branchId: "bone_bolango" },
    ]);

    const result = await fetchTodayScansData("2026-09-28T00:00:00.000Z", true, false, "kota_gorontalo");
    expect(result.scans).toHaveLength(1);
    expect(result.scans[0].id).toBe("att1");
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].id).toBe("c1");
    expect(result.students).toHaveLength(1);
    expect(result.students[0].id).toBe("st1");
  });

  it("returns all branches when branchId is null for admin view", async () => {
    fake.seed("attendance", [
      { id: "att1", timestamp: "2026-09-28T08:00:00.000Z", userId: "st1", branchId: "kota_gorontalo" },
      { id: "att2", timestamp: "2026-09-28T08:30:00.000Z", userId: "st2", branchId: "bone_bolango" },
    ]);
    fake.seed("classes", [
      { id: "c1", className: "English 1", branchId: "kota_gorontalo" },
      { id: "c2", className: "English 2", branchId: "bone_bolango" },
    ]);
    fake.seed("users", [
      { id: "st1", role: "student", branchId: "kota_gorontalo" },
      { id: "st2", role: "student", branchId: "bone_bolango" },
    ]);

    const result = await fetchTodayScansData("2026-09-28T00:00:00.000Z", true, false, null);
    expect(result.scans).toHaveLength(2);
    expect(result.classes).toHaveLength(2);
    expect(result.students).toHaveLength(2);
  });
});

describe("fetchStudentProgressData", () => {
  it("scopes classes, users, and attendance to branchId", async () => {
    fake.seed("classes", [
      { id: "c1", branchId: "kota_gorontalo" },
      { id: "c2", branchId: "bone_bolango" },
    ]);
    fake.seed("users", [
      { id: "st1", role: "student", branchId: "kota_gorontalo" },
      { id: "st2", role: "student", branchId: "bone_bolango" },
    ]);
    fake.seed("attendance", [
      { id: "att1", timestamp: "2026-09-20T08:00:00.000Z", branchId: "kota_gorontalo" },
      { id: "att2", timestamp: "2026-09-20T08:00:00.000Z", branchId: "bone_bolango" },
    ]);
    fake.seed("progressReports", [
      { id: "p1", studentId: "st1" },
    ]);

    const result = await fetchStudentProgressData(true, false, "2026-09-01T00:00:00.000Z", "Kota Gorontalo");
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].id).toBe("c1");
    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toBe("st1");
    expect(result.attendance).toHaveLength(1);
    expect(result.attendance[0].id).toBe("att1");
  });
});

describe("fetchAdmissionsReportData", () => {
  it("scopes applications and classes to branchId when provided", async () => {
    fake.seed("applications", [
      { id: "app1", displayName: "Applicant 1", branchId: "kota_gorontalo", submittedAt: "2026-09-20T08:00:00.000Z" },
      { id: "app2", displayName: "Applicant 2", branchId: "bone_bolango", submittedAt: "2026-09-20T08:00:00.000Z" },
    ]);
    fake.seed("classes", [
      { id: "c1", branchId: "kota_gorontalo" },
      { id: "c2", branchId: "bone_bolango" },
    ]);

    const result = await fetchAdmissionsReportData("2026-09-01T00:00:00.000Z", "bone_bolango");
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0].id).toBe("app2");
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].id).toBe("c2");
  });
});

describe("fetchInstructorAnalyticsData", () => {
  it("scopes classes, shifts, and instructors to branchId when provided", async () => {
    fake.seed("classes", [
      { id: "c1", branchId: "kota_gorontalo" },
      { id: "c2", branchId: "bone_bolango" },
    ]);
    fake.seed("shifts", [
      { id: "s1", branchId: "kota_gorontalo" },
      { id: "s2", branchId: "bone_bolango" },
    ]);
    fake.seed("users", [
      { id: "ins1", role: "instructor", branchId: "kota_gorontalo" },
      { id: "ins2", role: "instructor", branchId: "bone_bolango" },
    ]);

    const result = await fetchInstructorAnalyticsData(true, "admin1", "Kota Gorontalo");
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].id).toBe("c1");
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].id).toBe("s1");
    expect(result.instructors).toHaveLength(1);
    expect(result.instructors[0].id).toBe("ins1");
  });
});
