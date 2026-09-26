import { describe, it, expect, vi, beforeEach } from "vitest";
import { fake } from "../../test/firestoreFake.js";
import {
  normalizePhoneDigits,
  lookupStudentForParent,
  buildPaymentSummary,
  getStudentParentPortalBundle,
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

  it("handles short or empty search terms gracefully", async () => {
    const results = await lookupStudentForParent("a");
    expect(results).toEqual([]);
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

describe("getStudentParentPortalBundle", () => {
  it("returns the summary from the student doc and never touches the payments collection", async () => {
    fake.seed("users", [
      {
        id: "s1",
        displayName: "Ani",
        paymentStatus: "paid",
        lastPaymentPeriod: "September 2026",
        lastPaymentDate: "2026-09-21",
        lastPaymentAmount: 1050000,
        lastPaymentMethod: "Cash",
        paidUntil: "2026-12-21",
      },
    ]);

    const bundle = await getStudentParentPortalBundle("s1");

    expect(bundle.student.displayName).toBe("Ani");
    expect(bundle.paymentSummary).toMatchObject({ status: "paid", lastPaymentAmount: 1050000 });
    // The portal is anonymous and the payments collection is staff-only in
    // Firestore rules — the bundle must not expose (or even attempt) it.
    expect(bundle).not.toHaveProperty("payments");
  });

  it("returns a none summary for a student without payment fields", async () => {
    fake.seed("users", [{ id: "s2", displayName: "Budi" }]);
    const bundle = await getStudentParentPortalBundle("s2");
    expect(bundle.paymentSummary.status).toBe("none");
  });

  it("throws when the student does not exist", async () => {
    await expect(getStudentParentPortalBundle("missing")).rejects.toThrow("Student not found.");
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
  it("fetches enrolled open classes and attendance records for a student", async () => {
    fake.seed("classes", [
      { id: "c1", className: "English 1", studentIds: ["child_1", "other"], status: "open" },
      { id: "c2", className: "English 2", studentIds: ["other_only"], status: "open" },
      { id: "c3", className: "English Archived", studentIds: ["child_1"], status: "closed" },
    ]);

    fake.seed("classAttendance", [
      { id: "att1", studentId: "child_1", attendanceDate: "2026-09-26", status: "PRESENT" },
      { id: "att2", studentId: "child_1", attendanceDate: "2026-09-25", status: "LATE" },
      { id: "att3", studentId: "other", attendanceDate: "2026-09-26", status: "PRESENT" },
    ]);

    const result = await getChildAttendanceAndClasses("child_1");
    // Returns only open classes enrolled by child_1 (filters out c2 not enrolled and c3 closed)
    expect(result.classes.length).toBe(1);
    expect(result.classes[0].className).toBe("English 1");
    expect(result.attendance.length).toBe(2);
  });
});
