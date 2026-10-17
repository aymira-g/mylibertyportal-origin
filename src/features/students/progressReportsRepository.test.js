import { describe, it, expect, vi, beforeEach } from "vitest";
import { fake, firestoreModule } from "../../test/firestoreFake.js";
import {
  promoteStudentLevel,
  createProgressReport,
  fetchInstructorProgressReports,
  fetchPendingPromotions,
  fetchOpsLeadProgressReports,
  resolveOpsLeadQueryLimit,
  DEFAULT_OPS_LEAD_REPORTS_LIMIT,
  MAX_OPS_LEAD_REPORTS_LIMIT,
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

  describe("fetchOpsLeadProgressReports (OD-OPS-01 / Blueprint v3.4.1 / G-013)", () => {
    it("fetches both courses and kindergarten reports for Main Campus when divisionFilter is 'all'", async () => {
      fake.seed("progressReports", [
        { id: "r1", branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-10" },
        { id: "r2", branchId: "kota_gorontalo", division: "kindergarten", examDate: "2026-10-15" },
        { id: "r3", branchId: "bone_bolango", division: "courses", examDate: "2026-10-12" },
      ]);

      const res = await fetchOpsLeadProgressReports("Kota Gorontalo", "all");
      expect(res).toHaveLength(2);
      expect(res.map((r) => r.id)).toEqual(["r2", "r1"]); // Sorted desc by examDate
    });

    it("scopes query strictly to courses division when requested", async () => {
      fake.seed("progressReports", [
        { id: "r1", branchId: "kota_gorontalo", division: "courses" },
        { id: "r2", branchId: "kota_gorontalo", division: "kindergarten" },
      ]);

      const res = await fetchOpsLeadProgressReports("kota_gorontalo", "courses");
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("r1");
    });

    it("scopes query strictly to kindergarten division when requested", async () => {
      fake.seed("progressReports", [
        { id: "r1", branchId: "kota_gorontalo", division: "courses" },
        { id: "r2", branchId: "kota_gorontalo", division: "kindergarten" },
      ]);

      const res = await fetchOpsLeadProgressReports("kota_gorontalo", "kindergarten");
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("r2");
    });

    it("returns empty array for satellite branches without performing unauthorized queries", async () => {
      fake.seed("progressReports", [
        { id: "r1", branchId: "bone_bolango", division: "courses" },
      ]);

      const res = await fetchOpsLeadProgressReports("Bone Bolango", "all");
      expect(res).toEqual([]);
    });

    it("respects limitCount to guard Firestore read costs under the Spark free tier", async () => {
      const reports = Array.from({ length: 15 }, (_, i) => ({
        id: `r-${i}`,
        branchId: "kota_gorontalo",
        division: "courses",
        examDate: `2026-10-${String(i + 1).padStart(2, "0")}`,
      }));
      fake.seed("progressReports", reports);

      const res = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: 5 });
      expect(res).toHaveLength(5);
    });

    it("clamps limitCount to MAX_OPS_LEAD_REPORTS_LIMIT (50) to prevent unbound read quota exhaustion", async () => {
      const reports = Array.from({ length: 60 }, (_, i) => ({
        id: `r-${i}`,
        branchId: "kota_gorontalo",
        division: "courses",
        examDate: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
      }));
      fake.seed("progressReports", reports);

      // Caller asks for 500 or 9999, but should be clamped to 50
      const res500 = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: 500 });
      expect(res500).toHaveLength(MAX_OPS_LEAD_REPORTS_LIMIT);
      expect(res500).toHaveLength(50);

      const res9999 = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: 9999 });
      expect(res9999).toHaveLength(50);
    });

    it("clamps limitCount to DEFAULT (50) when 0, negative, fractional < 1, or invalid", async () => {
      const reports = Array.from({ length: 60 }, (_, i) => ({
        id: `r-${i}`,
        branchId: "kota_gorontalo",
        division: "courses",
        examDate: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
      }));
      fake.seed("progressReports", reports);

      // Zero must never disable query limit
      const resZero = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: 0 });
      expect(resZero).toHaveLength(DEFAULT_OPS_LEAD_REPORTS_LIMIT);
      expect(resZero).toHaveLength(50);

      // Negative values must fall back to 50
      const resNeg = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: -10 });
      expect(resNeg).toHaveLength(50);

      const resNegOne = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: -1 });
      expect(resNegOne).toHaveLength(50);

      // Fractional values < 1 floor to 0 and must fall back to 50
      const resFrac = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: 0.5 });
      expect(resFrac).toHaveLength(50);

      // Non-number / invalid values must fall back to 50
      const resNaN = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: NaN });
      expect(resNaN).toHaveLength(50);

      const resNull = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { limitCount: null });
      expect(resNull).toHaveLength(50);
    });

    it("safely retrieves legacy progress reports without examDate when orderByExamDate is false", async () => {
      fake.seed("progressReports", [
        { id: "legacy-1", branchId: "kota_gorontalo", division: "courses", submittedAt: "2026-09-01T10:00:00Z" },
        { id: "legacy-2", branchId: "kota_gorontalo", division: "courses", createdAt: "2026-09-15T12:00:00Z" },
        { id: "modern-1", branchId: "kota_gorontalo", division: "courses", examDate: "2026-09-10" },
      ]);

      const res = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { orderByExamDate: false });
      expect(res).toHaveLength(3);
      // Client-side sort prioritizes examDate || submittedAt || createdAt descending:
      // legacy-2 (Sept 15) > modern-1 (Sept 10) > legacy-1 (Sept 01)
      expect(res.map((r) => r.id)).toEqual(["legacy-2", "modern-1", "legacy-1"]);
    });

    it("applies daysWindow date filter when specified", async () => {
      // 10 days ago vs 100 days ago
      const recentDate = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];
      const oldDate = new Date(Date.now() - 45 * 86400000).toISOString().split("T")[0];

      fake.seed("progressReports", [
        { id: "recent", branchId: "kota_gorontalo", division: "courses", examDate: recentDate },
        { id: "old", branchId: "kota_gorontalo", division: "courses", examDate: oldDate },
      ]);

      const res = await fetchOpsLeadProgressReports("kota_gorontalo", "courses", { daysWindow: 30 });
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("recent");
    });
  });

  describe("resolveOpsLeadQueryLimit", () => {
    it("returns DEFAULT_OPS_LEAD_REPORTS_LIMIT (50) when limitCount is undefined or null", () => {
      expect(resolveOpsLeadQueryLimit()).toBe(50);
      expect(resolveOpsLeadQueryLimit(undefined)).toBe(50);
      expect(resolveOpsLeadQueryLimit(null)).toBe(50);
    });

    it("clamps limitCount to MAX_OPS_LEAD_REPORTS_LIMIT (50) if higher requested", () => {
      expect(resolveOpsLeadQueryLimit(51)).toBe(50);
      expect(resolveOpsLeadQueryLimit(100)).toBe(50);
      expect(resolveOpsLeadQueryLimit(500)).toBe(50);
      expect(resolveOpsLeadQueryLimit(9999)).toBe(50);
    });

    it("falls back to DEFAULT_OPS_LEAD_REPORTS_LIMIT (50) for zero, negative, fractional < 1, NaN, Infinity, or invalid values", () => {
      expect(resolveOpsLeadQueryLimit(0)).toBe(50);
      expect(resolveOpsLeadQueryLimit(-1)).toBe(50);
      expect(resolveOpsLeadQueryLimit(-5)).toBe(50);
      expect(resolveOpsLeadQueryLimit(-100)).toBe(50);
      expect(resolveOpsLeadQueryLimit(0.5)).toBe(50);
      expect(resolveOpsLeadQueryLimit(0.99)).toBe(50);
      expect(resolveOpsLeadQueryLimit(NaN)).toBe(50);
      expect(resolveOpsLeadQueryLimit(Infinity)).toBe(50);
      expect(resolveOpsLeadQueryLimit(-Infinity)).toBe(50);
      expect(resolveOpsLeadQueryLimit("invalid")).toBe(50);
      expect(resolveOpsLeadQueryLimit("0")).toBe(50);
      expect(resolveOpsLeadQueryLimit({})).toBe(50);
      expect(resolveOpsLeadQueryLimit([])).toBe(50);
    });

    it("preserves positive integer values up to MAX_OPS_LEAD_REPORTS_LIMIT", () => {
      expect(resolveOpsLeadQueryLimit(1)).toBe(1);
      expect(resolveOpsLeadQueryLimit(10)).toBe(10);
      expect(resolveOpsLeadQueryLimit(25)).toBe(25);
      expect(resolveOpsLeadQueryLimit(49)).toBe(49);
      expect(resolveOpsLeadQueryLimit(50)).toBe(50);
    });

    it("floors positive non-integer values >= 1", () => {
      expect(resolveOpsLeadQueryLimit(1.9)).toBe(1);
      expect(resolveOpsLeadQueryLimit(25.7)).toBe(25);
      expect(resolveOpsLeadQueryLimit(49.99)).toBe(49);
    });
  });
});

