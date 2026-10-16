import { describe, it, expect, vi, beforeEach } from "vitest";
import { fake, firestoreModule } from "../../test/firestoreFake.js";
import {
  promoteStudentLevel,
  createProgressReport,
  fetchInstructorProgressReports,
  fetchPendingPromotions,
  FIRESTORE_BATCH_LIMIT,
} from "./progressReportsRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({ db: {}, auth: {} }));

beforeEach(() => {
  fake.reset();
  vi.restoreAllMocks();
});

describe("progressReportsRepository", () => {
  describe("promoteStudentLevel", () => {
    it("atomically consolidates student level advancement and all pending eligible reports in the same batch", async () => {
      fake.seed("progressReports", [
        { id: "rep-primary", studentId: "student-1", eligibleForPromotion: true, examDate: "2026-10-15" },
        { id: "rep-secondary", studentId: "student-1", eligibleForPromotion: true, examDate: "2026-10-10" },
        { id: "rep-other-student", studentId: "student-2", eligibleForPromotion: true, examDate: "2026-10-12" },
      ]);

      await promoteStudentLevel("student-1", "warrior", "rep-primary");

      const updates = fake.opsOf("update");
      expect(updates).toHaveLength(3); // 1 student + 2 reports for student-1

      const studentOp = updates.find((o) => o.path === "users/student-1");
      expect(studentOp).toBeDefined();
      expect(studentOp.data).toMatchObject({
        currentLevel: "warrior",
        promotedFromReport: "rep-primary",
        rating: "1",
      });

      const primaryOp = updates.find((o) => o.path === "progressReports/rep-primary");
      expect(primaryOp).toBeDefined();
      expect(primaryOp.data).toMatchObject({
        eligibleForPromotion: false,
      });

      const secondaryOp = updates.find((o) => o.path === "progressReports/rep-secondary");
      expect(secondaryOp).toBeDefined();
      expect(secondaryOp.data).toMatchObject({
        eligibleForPromotion: false,
      });

      // Does not touch unrelated student's report
      const otherStudentOp = updates.find((o) => o.path === "progressReports/rep-other-student");
      expect(otherStudentOp).toBeUndefined();
    });

    it("scopes pending-report query by branchId and division: courses, strictly excluding kindergarten reports", async () => {
      fake.seed("progressReports", [
        // Modern courses report
        { id: "rep-modern", studentId: "student-1", branchId: "kota_gorontalo", division: "courses", eligibleForPromotion: true },
        // Secondary courses report
        { id: "rep-secondary", studentId: "student-1", branchId: "kota_gorontalo", division: "courses", eligibleForPromotion: true },
        // Same-student, same-branch kindergarten report (must be strictly excluded)
        { id: "rep-kg-cross", studentId: "student-1", branchId: "kota_gorontalo", division: "kindergarten", eligibleForPromotion: true },
        // Report for same student at a different branch (should not match query)
        { id: "rep-other-branch", studentId: "student-1", branchId: "bone_bolango", division: "courses", eligibleForPromotion: true },
      ]);

      await promoteStudentLevel("student-1", "warrior", "rep-modern", {
        branchId: "Kota Gorontalo",
        division: "courses",
      });

      const updates = fake.opsOf("update");
      const paths = updates.map((u) => u.path);
      expect(paths).toContain("users/student-1");
      expect(paths).toContain("progressReports/rep-modern");
      expect(paths).toContain("progressReports/rep-secondary");
      expect(paths).not.toContain("progressReports/rep-kg-cross");
      expect(paths).not.toContain("progressReports/rep-other-branch");
    });

    it("scopes pending-report query by division when division is kindergarten", async () => {
      fake.seed("progressReports", [
        { id: "rep-kg", studentId: "student-kg", branchId: "kota_gorontalo", division: "kindergarten", eligibleForPromotion: true },
        { id: "rep-courses", studentId: "student-kg", branchId: "kota_gorontalo", division: "courses", eligibleForPromotion: true },
      ]);

      await promoteStudentLevel("student-kg", "star_1", "rep-kg", {
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });

      const updates = fake.opsOf("update");
      const paths = updates.map((u) => u.path);
      expect(paths).toContain("users/student-kg");
      expect(paths).toContain("progressReports/rep-kg");
      expect(paths).not.toContain("progressReports/rep-courses");
    });

    it("aborts the promotion and commits zero writes if querying pending reports fails", async () => {
      fake.seed("progressReports", [
        { id: "rep-primary", studentId: "student-1", eligibleForPromotion: true },
      ]);

      vi.spyOn(firestoreModule, "getDocs").mockRejectedValueOnce(
        new Error("Simulated Firestore query network failure")
      );

      await expect(
        promoteStudentLevel("student-1", "warrior", "rep-primary")
      ).rejects.toThrow("Simulated Firestore query network failure");

      // Verify that no writes whatsoever were committed
      expect(fake.ops).toHaveLength(0);
    });

    it("fails with a clear pre-commit error if operations exceed the 500-write batch limit", async () => {
      // 500 reports + 1 student document = 501 operations > FIRESTORE_BATCH_LIMIT (500)
      const mockReports = Array.from({ length: 500 }, (_, idx) => ({
        id: `rep-${idx}`,
        studentId: "student-1",
        eligibleForPromotion: true,
      }));
      fake.seed("progressReports", mockReports);

      await expect(
        promoteStudentLevel("student-1", "warrior", "rep-0")
      ).rejects.toThrow(
        `Promotion batch exceeds Firestore limit of ${FIRESTORE_BATCH_LIMIT} operations (501 writes requested)`
      );

      // Verify zero writes were committed
      expect(fake.ops).toHaveLength(0);
    });

    it("returns cleanly without executing writes if studentId or nextLevel is missing", async () => {
      await promoteStudentLevel(null, "warrior");
      await promoteStudentLevel("student-1", null);
      await promoteStudentLevel("", "");

      expect(fake.ops).toHaveLength(0);
    });
  });

  describe("createProgressReport", () => {
    it("creates a progress report with normalized branchId and branch name", async () => {
      await createProgressReport({
        studentId: "student-1",
        instructorId: "ins-1",
        branchId: "kota_gorontalo",
        overallScore: 92,
      });

      const adds = fake.opsOf("add");
      expect(adds).toHaveLength(1);
      expect(adds[0].path.startsWith("progressReports/")).toBe(true);
      expect(adds[0].data).toMatchObject({
        studentId: "student-1",
        instructorId: "ins-1",
        branchId: "kota_gorontalo",
        branch: "Kota Gorontalo",
        overallScore: 92,
      });
    });
  });

  describe("fetchInstructorProgressReports", () => {
    it("fetches reports for instructor and sorts by examDate descending", async () => {
      fake.seed("progressReports", [
        { id: "r1", instructorId: "ins-1", examDate: "2026-09-01" },
        { id: "r2", instructorId: "ins-1", examDate: "2026-10-01" },
        { id: "r3", instructorId: "ins-2", examDate: "2026-09-15" },
      ]);

      const res = await fetchInstructorProgressReports("ins-1");
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe("r2");
      expect(res[1].id).toBe("r1");
    });

    it("returns empty array when instructorId is falsy", async () => {
      const res = await fetchInstructorProgressReports(null);
      expect(res).toEqual([]);
    });
  });

  describe("fetchPendingPromotions", () => {
    it("filters by eligibleForPromotion, branchId, and division", async () => {
      fake.seed("progressReports", [
        { id: "r1", eligibleForPromotion: true, branchId: "kota_gorontalo", division: "courses" },
        { id: "r2", eligibleForPromotion: true, branchId: "limboto", division: "courses" },
        { id: "r3", eligibleForPromotion: true, branchId: "kota_gorontalo", division: "kindergarten" },
        { id: "r4", eligibleForPromotion: false, branchId: "kota_gorontalo", division: "courses" },
      ]);

      const coursesKota = await fetchPendingPromotions("kota_gorontalo", "courses");
      expect(coursesKota).toHaveLength(1);
      expect(coursesKota[0].id).toBe("r1");
    });
  });
});
