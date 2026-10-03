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

  it("reports none when the student has no payment records", () => {
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
    expect(noChild).toEqual({ classes: [], attendance: [] });

    const noBranch = await getChildAttendanceAndClasses("child_1", null);
    expect(noBranch).toEqual({ classes: [], attendance: [] });

    const emptyBoth = await getChildAttendanceAndClasses("", "");
    expect(emptyBoth).toEqual({ classes: [], attendance: [] });
  });

  it("fetches enrolled open classes and attendance records scoped to the canonical branch", async () => {
    fake.seed("classes", [
      { id: "c1", className: "English 1", branchId: "kota_gorontalo", studentIds: ["child_1", "other"], status: "open" },
      { id: "c2", className: "English 2 (Other Branch)", branchId: "bone_bolango", studentIds: ["child_1"], status: "open" },
      { id: "c3", className: "English Archived", branchId: "kota_gorontalo", studentIds: ["child_1"], status: "closed" },
    ]);

    fake.seed("classAttendance", [
      { id: "att1", studentId: "child_1", attendanceDate: "2026-09-26", status: "PRESENT" },
      { id: "att2", studentId: "child_1", attendanceDate: "2026-09-25", status: "LATE" },
      { id: "att3", studentId: "other", attendanceDate: "2026-09-26", status: "PRESENT" },
    ]);

    // Pass display name "Kota Gorontalo" to verify branchToId normalization to "kota_gorontalo"
    const result = await getChildAttendanceAndClasses("child_1", "Kota Gorontalo");

    // Returns only open classes enrolled by child_1 in kota_gorontalo (filters out c2 other branch and c3 closed)
    expect(result.classes.length).toBe(1);
    expect(result.classes[0].id).toBe("c1");
    expect(result.classes[0].className).toBe("English 1");
    expect(result.attendance.length).toBe(2);

    // Verify exact Firestore query constraints constructed
    expect(firestoreModule.where).toHaveBeenCalledWith("branchId", "==", "kota_gorontalo");
    expect(firestoreModule.where).toHaveBeenCalledWith("studentIds", "array-contains", "child_1");
    expect(firestoreModule.where).toHaveBeenCalledWith("status", "==", "open");
  });
});
