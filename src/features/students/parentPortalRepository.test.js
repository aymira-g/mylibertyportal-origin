import { describe, it, expect, vi, beforeEach } from "vitest";
import { fake, firestoreModule } from "../../test/firestoreFake.js";
import {
  normalizePhoneDigits,
  buildPaymentSummary,
  getAuthenticatedParentBundle,
  getChildAttendanceAndClasses,
} from "./parentPortalRepository";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({ db: {}, auth: {} }));

beforeEach(() => fake.reset());

describe("Parent Portal Repository", () => {
  it("normalizes phone numbers to standard country code format", () => {
    expect(normalizePhoneDigits("081234567890")).toBe("6281234567890");
    expect(normalizePhoneDigits("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizePhoneDigits("")).toBe("");
  });
});

describe("buildPaymentSummary", () => {
  it("maps the finance-flow fields on a paid student", () => {
    const summary = buildPaymentSummary({
      paymentStatus: "paid",
      lastPaymentPeriod: "September 2026 – November 2026 (3 Mo)",
      lastPaymentDate: "2026-09-21",
      lastPaymentAmount: 1050000,
      lastPaymentMethod: "Cash",
      paidUntil: "2026-12-21",
    });
    expect(summary).toEqual({
      status: "paid",
      lastPaymentPeriod: "September 2026 – November 2026 (3 Mo)",
      lastPaymentDate: "2026-09-21",
      lastPaymentAmount: 1050000,
      lastPaymentMethod: "Cash",
      paidUntil: "2026-12-21",
    });
  });

  it("reports pending when paymentStatus is pending, even with records", () => {
    const summary = buildPaymentSummary({
      paymentStatus: "pending",
      lastPaymentPeriod: "August 2026",
      lastPaymentDate: "2026-08-01",
    });
    expect(summary.status).toBe("pending");
  });

  it("reports unpaid when paymentStatus is unpaid, even with historical payment records", () => {
    const summaryWithHistory = buildPaymentSummary({
      paymentStatus: "unpaid",
      lastPaymentPeriod: "September 2026",
      lastPaymentDate: "2026-09-01",
      lastPaymentAmount: 350000,
    });
    expect(summaryWithHistory.status).toBe("unpaid");

    const summaryWithoutHistory = buildPaymentSummary({
      paymentStatus: "unpaid",
    });
    expect(summaryWithoutHistory.status).toBe("unpaid");
  });

  it("reports expired when paidUntil is in the past, even if paymentStatus is paid", () => {
    const expiredSummary = buildPaymentSummary({
      paymentStatus: "paid",
      lastPaymentPeriod: "July 2026",
      lastPaymentDate: "2026-07-01",
      paidUntil: "2026-08-01",
    });
    expect(expiredSummary.status).toBe("expired");
  });

  it("reports due_soon when paidUntil expires within threshold days", () => {
    // Current test date is October 2026; mock or calculate 3 days ahead
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 3);
    const dueSoonIso = nearDate.toISOString().split("T")[0];

    const dueSoonSummary = buildPaymentSummary({
      paymentStatus: "paid",
      paidUntil: dueSoonIso,
    });
    expect(dueSoonSummary.status).toBe("due_soon");
  });

  it("falls back to paid on legacy records with historical fields but no explicit paymentStatus", () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const futureIso = futureDate.toISOString().split("T")[0];

    const legacyPaid = buildPaymentSummary({
      lastPaymentPeriod: "Future Period",
      paidUntil: futureIso,
    });
    expect(legacyPaid.status).toBe("paid");
  });

  it("reports none when the student has no payment records and no status", () => {
    expect(buildPaymentSummary({ displayName: "Ani" }).status).toBe("none");
    expect(buildPaymentSummary({}).status).toBe("none");
  });

  it("guards against missing or malformed input", () => {
    expect(buildPaymentSummary(null)).toBeNull();
    expect(buildPaymentSummary("nope")).toBeNull();
    expect(buildPaymentSummary({ lastPaymentAmount: "1.050.000" }).lastPaymentAmount).toBeNull();
  });
});

describe("getAuthenticatedParentBundle", () => {
  it("fetches parent doc and resolves linked child student profiles", async () => {
    fake.seed("users", [
      { id: "parent_1", role: "parent", displayName: "Pak Hendra", childStudentIds: ["child_1", "child_2"] },
      { id: "child_1", role: "student", displayName: "Ayu", currentLevel: "warrior" },
      { id: "child_2", role: "student", displayName: "Bima", currentLevel: "hero" },
    ]);

    const bundle = await getAuthenticatedParentBundle("parent_1");
    expect(bundle.parent.displayName).toBe("Pak Hendra");
    expect(bundle.children.length).toBe(2);
    expect(bundle.children.map((c) => c.displayName)).toEqual(["Ayu", "Bima"]);
    expect(bundle.linkedStudentCount).toBe(2);
    expect(bundle.inactiveChildCount).toBe(0);
  });

  it("separates active vs inactive or frozen linked students", async () => {
    fake.seed("users", [
      { id: "parent_x", role: "parent", displayName: "Ibu Maya", childStudentIds: ["active_1", "frozen_1"] },
      { id: "active_1", role: "student", displayName: "Rian", status: "active" },
      { id: "frozen_1", role: "student", displayName: "Doni", status: "inactive" },
    ]);

    const bundle = await getAuthenticatedParentBundle("parent_x");
    expect(bundle.children.length).toBe(1);
    expect(bundle.children[0].displayName).toBe("Rian");
    expect(bundle.linkedStudentCount).toBe(2);
    expect(bundle.inactiveChildCount).toBe(1);
  });

  it("handles missing parent or empty children list safely", async () => {
    const emptyBundle = await getAuthenticatedParentBundle(null);
    expect(emptyBundle).toEqual({ parent: null, children: [] });

    fake.seed("users", [{ id: "parent_2", role: "parent" }]);
    const noKids = await getAuthenticatedParentBundle("parent_2");
    expect(noKids.children).toEqual([]);
  });
});

describe("getChildAttendanceAndClasses", () => {
  it("fails early and returns empty bundle if childId or branchId is missing", async () => {
    const noChild = await getChildAttendanceAndClasses(null, "kota_gorontalo");
    expect(noChild).toEqual({ classes: [], attendance: [], errorClasses: null, errorAttendance: null });

    const noBranch = await getChildAttendanceAndClasses("child_1", null);
    expect(noBranch).toEqual({ classes: [], attendance: [], errorClasses: null, errorAttendance: null });

    const emptyBoth = await getChildAttendanceAndClasses("", "");
    expect(emptyBoth).toEqual({ classes: [], attendance: [], errorClasses: null, errorAttendance: null });
  });

  it("fetches enrolled classes (including in_progress and full) and attendance records scoped to branch", async () => {
    fake.seed("classes", [
      { id: "c1", className: "English 1", branchId: "kota_gorontalo", studentIds: ["child_1", "other"], status: "open" },
      { id: "c2", className: "English 2 (Other Branch)", branchId: "bone_bolango", studentIds: ["child_1"], status: "open" },
      { id: "c3", className: "English Cancelled", branchId: "kota_gorontalo", studentIds: ["child_1"], status: "cancelled" },
      { id: "c4", className: "English In Progress", branchId: "kota_gorontalo", studentIds: ["child_1"], status: "in_progress" },
      { id: "c5", className: "English Full", branchId: "kota_gorontalo", studentIds: ["child_1"], status: "full" },
    ]);

    fake.seed("classAttendance", [
      { id: "att1", studentId: "child_1", attendanceDate: "2026-09-26", status: "PRESENT" },
      { id: "att2", studentId: "child_1", attendanceDate: "2026-09-25", status: "LATE" },
      { id: "att3", studentId: "other", attendanceDate: "2026-09-26", status: "PRESENT" },
    ]);

    // Pass display name "Kota Gorontalo" to verify branchToId normalization to "kota_gorontalo"
    const result = await getChildAttendanceAndClasses("child_1", "Kota Gorontalo");

    // Returns active classes enrolled by child_1 in kota_gorontalo (c1, c4, c5; filters out c2 other branch and c3 cancelled)
    expect(result.classes.length).toBe(3);
    expect(result.classes.map((c) => c.id)).toEqual(["c1", "c4", "c5"]);
    expect(result.attendance.length).toBe(2);
    expect(result.errorClasses).toBeNull();
    expect(result.errorAttendance).toBeNull();

    // Verify exact Firestore query constraints constructed (without status constraint to avoid composite index requirement)
    expect(firestoreModule.where).toHaveBeenCalledWith("branchId", "==", "kota_gorontalo");
    expect(firestoreModule.where).toHaveBeenCalledWith("studentIds", "array-contains", "child_1");
    expect(firestoreModule.where).not.toHaveBeenCalledWith("status", "==", "open");
  });


  it("propagates query errors rather than silently masking them as empty arrays", async () => {
    const getDocsSpy = vi.spyOn(firestoreModule, "getDocs");
    getDocsSpy.mockRejectedValueOnce(new Error("Network connection lost"));

    const result = await getChildAttendanceAndClasses("child_1", "kota_gorontalo");
    expect(result.classes).toEqual([]);
    expect(result.errorClasses).toBe("Network connection lost");
    expect(result.errorAttendance).toBeNull();

    getDocsSpy.mockRestore();
  });
});
