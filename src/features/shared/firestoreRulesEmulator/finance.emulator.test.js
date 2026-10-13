/**
 * Real Firestore Rules Emulator Tests — Finance and Payments
 */
import { describe, beforeAll, beforeEach, afterAll, it } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import {
  setupEmulatorHarness,
  HAS_EMULATOR,
  PAYMENT_KOTA,
} from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Finance and Payments", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("finance");
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

  describe("payments get owner scoping (C1)", () => {
    beforeEach(async () => {
      await seedDoc(["payments", "pay1"], PAYMENT_KOTA);
    });

    it("lets the owning student read their own payment", async () => {
      await assertSucceeds(getDoc(doc(authed("student1"), "payments", "pay1")));
    });

    it("blocks another student from reading it", async () => {
      await assertFails(getDoc(doc(authed("student2"), "payments", "pay1")));
    });

    it("blocks signed-out reads", async () => {
      await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "payments", "pay1")));
    });

    it("lets same-branch front office read it but not another branch", async () => {
      await assertSucceeds(getDoc(doc(authed("foGto"), "payments", "pay1")));
      await assertFails(getDoc(doc(authed("foBoba"), "payments", "pay1")));
    });

    it("blocks cross-branch update and cross-branch moves", async () => {
      await assertFails(
        updateDoc(doc(authed("foBoba"), "payments", "pay1"), { amount: 1 })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "payments", "pay1"), { branchId: "bone_bolango" })
      );
    });

    it("blocks mutation of immutable payment fields (amount, studentId, branchId)", async () => {
      await assertFails(
        updateDoc(doc(authed("foGto"), "payments", "pay1"), { amount: 500000 })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "payments", "pay1"), { studentId: "student2" })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "payments", "pay1"), { branchId: "bone_bolango" })
      );
    });

    it("allows a legitimate same-branch update", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "payments", "pay1"), { notes: "Paid in cash" })
      );
    });

    it("blocks technical Admin from creating or updating payments (DOM04-SEC-02 / OD-2)", async () => {
      await assertFails(
        updateDoc(doc(authed("admin"), "payments", "pay1"), { notes: "Admin note" })
      );
      await assertFails(
        addDoc(collection(authed("admin"), "payments"), PAYMENT_KOTA)
      );
    });

    it("blocks Director from mutating core financial fields on existing payments (DOM04-SEC-02 / OD-1)", async () => {
      await assertFails(
        updateDoc(doc(authed("dirGto"), "payments", "pay1"), { amount: 100000 })
      );
      await assertFails(
        updateDoc(doc(authed("dirGto"), "payments", "pay1"), { studentId: "student2" })
      );
    });

    it("allows Director to update allowed fields on existing payments", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("dirGto"), "payments", "pay1"), { notes: "Executive note" })
      );
    });
  });

  describe("payment recording batch (F1)", () => {
    // Mirrors paymentsRepository.recordPayment: a single batch creates the
    // payment doc and stamps the summary fields on the student doc. The
    // allow-list must contain every field that batch writes, or the whole
    // batch fails — which is exactly what happened in production.
    const SUMMARY_FIELDS = {
      paymentStatus: "paid",
      lastPaymentPeriod: "September 2026 – November 2026 (3 Mo)",
      lastPaymentDate: "2026-09-21",
      lastPaymentAmount: 1050000,
      lastPaymentMethod: "Cash",
      paymentPlan: "quarterly",
      paidUntil: "2026-12-21",
    };

    beforeEach(async () => {
      // A student with an earlier payment on file, so every summary field
      // actually changes during the batch (an unchanged field would not
      // appear in the rule diff and the test would pass trivially).
      await seedDoc(["users", "student1"], {
        displayName: "student1",
        role: "student",
        branchId: "kota_gorontalo",
        paymentStatus: "pending",
        lastPaymentPeriod: "June 2026 – August 2026 (3 Mo)",
        lastPaymentDate: "2026-06-20",
        lastPaymentAmount: 450000,
        lastPaymentMethod: "Transfer",
        paymentPlan: "quarterly",
        paidUntil: "2026-09-20",
      });
    });

    function recordPaymentBatch(db) {
      const batch = writeBatch(db);
      batch.set(doc(db, "payments", "payNew"), {
        studentId: "student1",
        branchId: "kota_gorontalo",
        amount: 1050000,
        method: "Cash",
      });
      batch.set(doc(db, "users", "student1"), SUMMARY_FIELDS, { merge: true });
      return batch.commit();
    }

    it("lets same-branch front office record a payment end to end", async () => {
      await assertSucceeds(recordPaymentBatch(authed("foGto")));
    });

    it("lets front office mark a payment pending (clears paidUntil)", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "users", "student1"), {
          paymentStatus: "pending",
          paidUntil: deleteField(),
        })
      );
    });

    it("blocks other branches and staff without a cashier role", async () => {
      await assertFails(recordPaymentBatch(authed("foBoba")));
      await assertFails(recordPaymentBatch(authed("insGto")));
    });

    it("rejects payment creation by resigned or terminated front office staff", async () => {
      await assertFails(recordPaymentBatch(authed("foResigned")));
      await assertFails(recordPaymentBatch(authed("foTerminated")));
    });

    it("rejects payment creation across division boundary (Kindergarten FO -> Courses student)", async () => {
      await assertFails(recordPaymentBatch(authed("foKg")));
    });

    it("still rejects summary writes that smuggle foreign fields", async () => {
      const db = authed("foGto");
      const batch = writeBatch(db);
      batch.set(doc(db, "payments", "payNew"), PAYMENT_KOTA);
      batch.set(
        doc(db, "users", "student1"),
        { ...SUMMARY_FIELDS, secretBackdoor: true },
        { merge: true }
      );
      await assertFails(batch.commit());
    });
  });

});
