/**
 * Real Firestore Rules Emulator Tests — Attendance and Shifts
 */
import { describe, beforeAll, beforeEach, afterAll, it } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, updateDoc, collection, addDoc, getDoc, query, where, getDocs } from "firebase/firestore";
import { setupEmulatorHarness, HAS_EMULATOR, SHIFT_KOTA, APPROVED_CORRECTION } from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Attendance and Shifts", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("attendance-shifts");
    testEnv = harness.testEnv;
    authed = harness.authed;
    seedDoc = harness.seedDoc;
    seedUsers = harness.seedUsers;
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsers();
  });

  describe("shifts kiosk flow (C3 guard, H2 autoClosed)", () => {
    beforeEach(async () => {
      await seedDoc(["shifts", "shift1"], SHIFT_KOTA);
    });

    it("lets same-branch front office clock in tracked staff", async () => {
      await assertSucceeds(
        addDoc(collection(authed("foGto"), "shifts"), {
          ...SHIFT_KOTA,
          userId: "insGto",
        })
      );
    });

    it("blocks cross-branch clock-in, closed-shift creation, and untracked roles", async () => {
      await assertFails(
        addDoc(collection(authed("foGto"), "shifts"), { ...SHIFT_KOTA, branchId: "bone_bolango" })
      );
      await assertFails(
        addDoc(collection(authed("foGto"), "shifts"), {
          ...SHIFT_KOTA,
          clockOut: "2026-09-21T09:00:00.000Z",
        })
      );
      await assertFails(
        addDoc(collection(authed("foGto"), "shifts"), { ...SHIFT_KOTA, userId: "student1" })
      );
    });

    it("allows kiosk clock-out with the autoClosed key", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), {
          ...SHIFT_KOTA,
          clockOut: "2026-09-21T09:00:00.000Z",
          updatedAt: "2026-09-21T09:00:00.000Z",
          autoClosed: true,
        })
      );
    });

    it("blocks clock-out payloads that smuggle extra fields like an approval envelope", async () => {
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), {
          ...SHIFT_KOTA,
          clockOut: "2026-09-21T09:00:00.000Z",
          approval: { actionId: "STAFF_SHIFT_SELF_CORRECTION" },
        })
      );
    });

    it("blocks clock-out that rewrites identity or clock-in time", async () => {
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), {
          ...SHIFT_KOTA,
          userId: "student1",
          clockOut: "2026-09-21T09:00:00.000Z",
        })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), {
          ...SHIFT_KOTA,
          clockIn: "2026-09-21T03:00:00.000Z",
          clockOut: "2026-09-21T09:00:00.000Z",
        })
      );
      await assertFails(updateDoc(doc(authed("foBoba"), "shifts", "shift1"), { clockOut: "t" }));
    });
  });

  describe("approved shift self-correction gate (C4)", () => {
    beforeEach(async () => {
      await seedDoc(["shifts", "shift1"], SHIFT_KOTA);
      await seedDoc(["approvals", "corr1"], APPROVED_CORRECTION);
    });

    const applied = (approvalId) => ({
      ...SHIFT_KOTA,
      clockIn: "2026-09-21T00:30:00.000Z",
      corrected: true,
      reviewStatus: "pending",
      appliedFromApproval: approvalId,
    });

    it("applies an approved correction for the matching shift", async () => {
      await assertSucceeds(updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("corr1")));
      await assertSucceeds(updateDoc(doc(authed("mgrGto"), "shifts", "shift1"), applied("corr1")));
    });

    it("allows Director and Vice Director to apply approved corrections across branches (DOM07-SEC-04)", async () => {
      // Main branch shift approved correction
      await assertSucceeds(updateDoc(doc(authed("dirGto"), "shifts", "shift1"), applied("corr1")));
      await assertSucceeds(updateDoc(doc(authed("vdGto"), "shifts", "shift1"), applied("corr1")));

      // Satellite branch shift approved correction
      await seedDoc(["shifts", "shiftBoba"], {
        ...SHIFT_KOTA,
        branchId: "bone_bolango",
        branch: "Bone Bolango",
      });
      await seedDoc(["approvals", "corrBoba"], {
        ...APPROVED_CORRECTION,
        approverBranchId: "bone_bolango",
        payload: {
          ...APPROVED_CORRECTION.payload,
          shiftId: "shiftBoba",
        },
      });
      await assertSucceeds(
        updateDoc(doc(authed("dirGto"), "shifts", "shiftBoba"), {
          ...SHIFT_KOTA,
          branchId: "bone_bolango",
          branch: "Bone Bolango",
          clockIn: "2026-09-21T00:30:00.000Z",
          corrected: true,
          reviewStatus: "pending",
          appliedFromApproval: "corrBoba",
        })
      );

      // Negative test: Executive CANNOT perform arbitrary shift edits without approved envelope
      await assertFails(
        updateDoc(doc(authed("dirGto"), "shifts", "shift1"), {
          ...SHIFT_KOTA,
          clockOut: "2026-09-21T09:00:00.000Z",
        })
      );
    });

    it("blocks corrections without an approved, shift-matching approval", async () => {
      await seedDoc(["approvals", "corrPending"], { ...APPROVED_CORRECTION, status: "pending" });
      await seedDoc(["approvals", "corrOther"], {
        ...APPROVED_CORRECTION,
        payload: { shiftId: "shift999", afterData: { clockIn: "t" } },
      });
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("corrPending"))
      );
      await assertFails(updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("corrOther")));
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("nonexistent"))
      );
    });

    it("blocks corrections touching anything beyond the correction keys", async () => {
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), { ...applied("corr1"), notes: "oops" })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), {
          ...applied("corr1"),
          userId: "student1",
        })
      );
    });

    it("blocks corrections if target values do not match approved afterData (INT-019)", async () => {
      const tampered = {
        ...applied("corr1"),
        clockIn: "2026-09-21T00:00:00.000Z", // does not match approved 00:30:00
      };
      await assertFails(updateDoc(doc(authed("foGto"), "shifts", "shift1"), tampered));
    });

    it("blocks instructors and other branches from applying corrections", async () => {
      await assertFails(updateDoc(doc(authed("insGto"), "shifts", "shift1"), applied("corr1")));
      await assertFails(updateDoc(doc(authed("mgrBoba"), "shifts", "shift1"), applied("corr1")));
    });
  });

  describe("shift audit events (C4 dual-control trail)", () => {
    beforeEach(async () => {
      await seedDoc(["shifts", "shift1"], SHIFT_KOTA);
      await seedDoc(["approvals", "corr1"], APPROVED_CORRECTION);
    });

    it("lets executive log a manual adjustment behind an approved correction, and strictly prevents admin from creating shift audit events (DOM07-SEC-04)", async () => {
      // Executive (Director) can log manual_adjustment behind approved correction
      await assertSucceeds(
        addDoc(collection(authed("dirGto"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "dirGto",
          action: "manual_adjustment",
          appliedFromApproval: "corr1",
        })
      );
      // Admin is strictly barred from appending shift audit events
      await assertFails(
        addDoc(collection(authed("admin"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "admin",
          action: "flag_review",
        })
      );
      await assertFails(
        addDoc(collection(authed("admin"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "admin",
          action: "manual_adjustment",
          appliedFromApproval: "corr1",
        })
      );
    });

    it("lets front office log a manual adjustment only behind an approved correction", async () => {
      await assertSucceeds(
        addDoc(collection(authed("foGto"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "foGto",
          action: "manual_adjustment",
          appliedFromApproval: "corr1",
        })
      );
      await assertFails(
        addDoc(collection(authed("foGto"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "foGto",
          action: "note",
          appliedFromApproval: "corr1",
        })
      );
      await assertFails(
        addDoc(collection(authed("foGto"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "foGto",
          action: "manual_adjustment",
          appliedFromApproval: "bogus",
        })
      );
      await assertFails(
        addDoc(collection(authed("foGto"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "admin",
          action: "manual_adjustment",
          appliedFromApproval: "corr1",
        })
      );
    });

    it("keeps the audit trail append-only", async () => {
      await seedDoc(["shiftAuditEvents", "evt1"], { shiftId: "shift1", actorId: "admin" });
      await assertFails(
        updateDoc(doc(authed("admin"), "shiftAuditEvents", "evt1"), { tampered: true })
      );
      await assertFails(updateDoc(doc(authed("admin"), "shiftAuditEvents", "evt1"), {}));
    });
  });

  describe("facilities isolation on attendance and shift boundaries (DOM05-PRIV-04)", () => {
    beforeEach(async () => {
      await seedDoc(["attendance", "attFacilitiesTest"], {
        userId: "student1",
        branchId: "kota_gorontalo",
        division: "courses",
        timestamp: "2026-09-21T08:00:00.000Z",
        role: "student",
      });
      await seedDoc(["shifts", "shiftOb"], {
        userId: "obGto",
        role: "officeboy",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T06:00:00.000Z",
        clockOut: null,
      });
      await seedDoc(["shifts", "shiftCleaner"], {
        userId: "cleanerGto",
        role: "cleaner",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T06:30:00.000Z",
        clockOut: null,
      });
    });

    it("denies officeboy and cleaner from reading attendance documents", async () => {
      await assertFails(getDoc(doc(authed("obGto"), "attendance", "attFacilitiesTest")));
      await assertFails(getDoc(doc(authed("cleanerGto"), "attendance", "attFacilitiesTest")));
    });

    it("denies System Admin from reading or querying attendance documents (OD-ADM-01) while preserving front office and staff access", async () => {
      // System Admin get and query/list denied under OD-ADM-01
      await assertFails(getDoc(doc(authed("admin"), "attendance", "attFacilitiesTest")));
      await assertFails(getDocs(query(collection(authed("admin"), "attendance"), where("branchId", "==", "kota_gorontalo"))));
      await assertFails(getDocs(collection(authed("admin"), "attendance")));

      // Authorized staff still succeed on direct get
      await assertSucceeds(getDoc(doc(authed("foGto"), "attendance", "attFacilitiesTest")));
      await assertSucceeds(getDoc(doc(authed("insGto"), "attendance", "attFacilitiesTest")));
      await assertSucceeds(getDoc(doc(authed("mgrGto"), "attendance", "attFacilitiesTest")));
      await assertSucceeds(getDoc(doc(authed("dirGto"), "attendance", "attFacilitiesTest")));

      // Authorized staff still succeed on query/list
      await assertSucceeds(getDocs(query(collection(authed("foGto"), "attendance"), where("branchId", "==", "kota_gorontalo"))));
      await assertSucceeds(getDocs(collection(authed("dirGto"), "attendance")));
    });

    it("allows officeboy and cleaner to read their own shift records but denies reading other staff shifts", async () => {
      // Own shift reads allowed
      await assertSucceeds(getDoc(doc(authed("obGto"), "shifts", "shiftOb")));
      await assertSucceeds(getDoc(doc(authed("cleanerGto"), "shifts", "shiftCleaner")));

      // Cross-staff shift reads denied
      await assertFails(getDoc(doc(authed("obGto"), "shifts", "shiftCleaner")));
      await assertFails(getDoc(doc(authed("cleanerGto"), "shifts", "shiftOb")));
      await assertFails(getDoc(doc(authed("obGto"), "shifts", "shift1")));
      await assertFails(getDoc(doc(authed("cleanerGto"), "shifts", "shift1")));
    });
  });
});

