/**
 * Emulator-based tests for the REAL firestore.rules file.
 *
 * Unlike securityRulesMatrix.test.js (a hand-mirrored copy of the rule logic),
 * these tests run the actual rules engine against the actual firestore.rules,
 * so a drift between code and rules fails here. Requires the Firestore
 * emulator: `npm run test:rules`. Skipped silently in a plain `npm test`.
 */
/* global process */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, writeBatch, deleteField, query, where, getDocs } from "firebase/firestore";

const RULES_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../firestore.rules");
const HAS_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv;

const USERS = {
  admin: { role: "admin", branchId: "kota_gorontalo" },
  mgrGto: { role: "manager", branchId: "kota_gorontalo" },
  mgrBoba: { role: "manager", branchId: "bone_bolango" },
  foGto: { role: "frontoffice", branchId: "kota_gorontalo" },
  foKgGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "kindergarten" },
  foBoba: { role: "frontoffice", branchId: "bone_bolango" },
  foResigned: { role: "frontoffice", branchId: "kota_gorontalo", status: "resigned" },
  foTerminated: { role: "frontoffice", branchId: "kota_gorontalo", status: "terminated" },
  foKg: { role: "frontoffice", branchId: "kota_gorontalo", division: "kindergarten" },
  foUnassigned: { role: "frontoffice" },
  mgrUnassigned: { role: "manager" },
  insUnassigned: { role: "instructor" },
  insGto: { role: "instructor", branchId: "kota_gorontalo" },
  opsGto: { role: "opslead", branchId: "kota_gorontalo" },
  dirGto: { role: "director", branchId: "kota_gorontalo" },
  ilGto: { role: "instructorleader", branchId: "kota_gorontalo", division: "kindergarten" },
  ilLegacyGto: { role: "instructor_leader", branchId: "kota_gorontalo" },
  ilBoba: { role: "instructorleader", branchId: "bone_bolango" },
  ilResigned: { role: "instructorleader", branchId: "kota_gorontalo", status: "resigned" },
  mktGto: { role: "marketing", branchId: "kota_gorontalo" },
  obGto: { role: "officeboy", branchId: "kota_gorontalo" },
  cleanerGto: { role: "cleaner", branchId: "kota_gorontalo" },
  parent1: { role: "parent", branchId: "kota_gorontalo", childStudentIds: ["student1"] },
  parent2: { role: "parent", branchId: "bone_bolango", childStudentIds: ["student2"] },
  student1: { role: "student", branchId: "kota_gorontalo" },
  student2: { role: "student", branchId: "bone_bolango" },
};

const FRONT_OFFICE_PROFILE_UID = "frontOfficeOwnProfile";
const FRONT_OFFICE_PROFILE = {
  role: "frontoffice",
  division: "kindergarten",
  branch: "Kota Gorontalo",
  branchId: "kota_gorontalo",
  status: "active",
};

function authed(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

async function seedDoc(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), ...pathSegments), data);
  });
}

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, data] of Object.entries(USERS)) {
      await setDoc(doc(db, "users", uid), { displayName: uid, ...data });
    }
  });
}

const PAYMENT_KOTA = { studentId: "student1", branchId: "kota_gorontalo", amount: 449000 };

const APPROVAL_KOTA = {
  // A Division-Manager-addressed gate. This fixture previously used DISCOUNT_OR_REFUND,
  // which the ratified registry restricts to Director / Vice Director; the gate-binding
  // hardening now enforces that pair, so the fixture was retargeted to keep testing its
  // stated intent ("manager approvals route to the manager of that branch").
  actionId: "TUITION_PLAN_CHANGE",
  status: "pending",
  mode: "blocking",
  approverRole: "manager",
  approverBranchId: "kota_gorontalo",
  requestedBy: "FO Budi",
  requestedByUid: "foGto",
  requestedAt: "2026-09-20T01:00:00.000Z",
  payload: null,
};

const APPROVAL_BOBA = { ...APPROVAL_KOTA, approverBranchId: "bone_bolango", requestedByUid: "foBoba" };

const SHIFT_KOTA = {
  userId: "insGto",
  role: "instructor",
  branchId: "kota_gorontalo",
  clockIn: "2026-09-21T01:00:00.000Z",
  clockOut: null,
};

const APPROVED_CORRECTION = {
  actionId: "STAFF_SHIFT_SELF_CORRECTION",
  status: "approved",
  mode: "blocking",
  approverRole: "manager",
  approverBranchId: "kota_gorontalo",
  requestedBy: "Ms. Rina",
  requestedByUid: "insGto",
  decidedBy: "Manager",
  decidedByUid: "mgrGto",
  payload: { shiftId: "shift1", beforeShift: { clockIn: "2026-09-21T01:00:00.000Z" }, afterData: { clockIn: "2026-09-21T00:30:00.000Z" } },
};

describe.skipIf(!HAS_EMULATOR)("firestore.rules against the real emulator", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "myliberty-rules-test",
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsers();
  });

  describe("Kindergarten Front Office user list queries", () => {
    beforeEach(async () => {
      await seedDoc(["users", "instructorKg"], {
        role: "instructor",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorLeaderKg"], {
        role: "instructorleader",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorLegacyLeaderKg"], {
        role: "instructor_leader",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorCourses"], {
        role: "instructor",
        branchId: "kota_gorontalo",
        division: "courses",
      });
      await seedDoc(["users", "instructorKgBoba"], {
        role: "instructor",
        branchId: "bone_bolango",
        division: "kindergarten",
      });
      await seedDoc(["users", "studentKg"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
    });

    it("lists only same-branch kindergarten instructors, including supported instructor aliases", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toEqual(
        expect.arrayContaining(["instructorKg", "instructorLeaderKg", "instructorLegacyLeaderKg"])
      );
      expect(ids).not.toContain("instructorCourses");
      expect(ids).not.toContain("instructorKgBoba");
    });

    it("rejects an instructor query without the required division constraint", async () => {
      await assertFails(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("lists same-branch parents independently of instructor division", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toContain("parent1");
      expect(ids).not.toContain("parent2");
    });

    it("blocks a kindergarten instructor query for another branch", async () => {
      await assertFails(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "bone_bolango")
          )
        )
      );
    });

    it("keeps the separate kindergarten student query intact", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "==", "student"),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toContain("studentKg");
      expect(ids).not.toContain("student1");
    });
  });

  describe("users own profile get", () => {
    beforeEach(async () => {
      await seedDoc(["users", FRONT_OFFICE_PROFILE_UID], FRONT_OFFICE_PROFILE);
    });

    it("lets an authenticated front office user read their own profile", async () => {
      await assertSucceeds(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", FRONT_OFFICE_PROFILE_UID))
      );
    });

    it("does not let an unrelated role read the front office profile", async () => {
      await assertFails(
        getDoc(doc(authed("cleanerGto"), "users", FRONT_OFFICE_PROFILE_UID))
      );
    });

    it("does not let front office read another same-branch front office profile", async () => {
      await seedDoc(["users", "otherFrontOffice"], {
        role: "frontoffice",
        division: "kindergarten",
        branchId: "kota_gorontalo",
        status: "active",
      });
      await assertFails(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "otherFrontOffice"))
      );
    });

    it("keeps front office profile reads scoped to the same branch", async () => {
      await assertFails(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "student2"))
      );
    });

    it("lets front office read operational staff but denies peers, leadership and executives", async () => {
      await seedDoc(["users", "opsLeadProbe"], {
        role: "opslead",
        branchId: "kota_gorontalo",
        division: "all",
        status: "active",
      });
      await seedDoc(["users", "obBoba"], {
        role: "officeboy",
        branchId: "bone_bolango",
        status: "active",
      });

      // Branch-level operational staff are readable by Front Office...
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "cleanerGto")));
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "obGto")));
      // ...including by a Kindergarten Front Office, since these roles are branch-level
      // rather than division-level (division filter is intentionally bypassed).
      await assertSucceeds(getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "obGto")));

      // Peers, leadership and executives in the same branch are NOT readable.
      await assertFails(getDoc(doc(authed("foGto"), "users", "foKgGto")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "mgrGto")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "admin")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "opsLeadProbe")));

      // Branch isolation still holds for operational staff.
      await assertFails(getDoc(doc(authed("foGto"), "users", "obBoba")));

      // Operational leadership keeps its broader same-branch staff oversight.
      await assertSucceeds(getDoc(doc(authed("opsLeadProbe"), "users", "foKgGto")));
    });
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

  describe("approval decision contract (C2)", () => {
    beforeEach(async () => {
      await seedDoc(["approvals", "appr1"], APPROVAL_KOTA);
      await seedDoc(["approvals", "apprBoba"], APPROVAL_BOBA);
    });

    const decision = (uid) => ({
      status: "approved",
      decidedBy: USERS[uid].role,
      decidedByUid: uid,
      decidedAt: "2026-09-21T02:00:00.000Z",
      updatedAt: "2026-09-21T02:00:00.000Z",
    });

    it("routes manager approvals to the manager of that branch", async () => {
      await assertSucceeds(getDoc(doc(authed("mgrGto"), "approvals", "appr1")));
      await assertFails(getDoc(doc(authed("mgrBoba"), "approvals", "appr1")));
      await assertSucceeds(updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), decision("mgrGto")));
      await assertFails(updateDoc(doc(authed("mgrBoba"), "approvals", "appr1"), decision("mgrBoba")));
    });

    it("gives the Bone Bolango manager access to Bone Bolango approvals", async () => {
      await assertSucceeds(getDoc(doc(authed("mgrBoba"), "approvals", "apprBoba")));
      await assertFails(getDoc(doc(authed("mgrGto"), "approvals", "apprBoba")));
      await assertSucceeds(updateDoc(doc(authed("mgrBoba"), "approvals", "apprBoba"), decision("mgrBoba")));
    });

    it("blocks non-approver roles from deciding", async () => {
      await assertFails(updateDoc(doc(authed("foGto"), "approvals", "appr1"), decision("foGto")));
      await assertFails(updateDoc(doc(authed("insGto"), "approvals", "appr1"), decision("insGto")));
    });

    it("blocks the requester from approving their own request", async () => {
      const opsApproval = {
        ...APPROVAL_KOTA,
        actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
        approverRole: "ops_lead",
        requestedByUid: "foGto",
      };
      await seedDoc(["approvals", "apprSelf"], opsApproval);
      const selfDecision = { status: "approved", decidedByUid: "foGto", decidedAt: "t", updatedAt: "t" };
      await assertFails(updateDoc(doc(authed("foGto"), "approvals", "apprSelf"), selfDecision));
    });

    it("requires decidedByUid to be the deciding user", async () => {
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), { ...decision("mgrGto"), decidedByUid: "admin" })
      );
    });

    it("keeps requestedByUid immutable and the decision fields in the allow-list", async () => {
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), {
          ...decision("mgrGto"),
          requestedByUid: "student1",
        })
      );
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), {
          ...decision("mgrGto"),
          payload: { forged: true },
        })
      );
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), { ...decision("mgrGto"), status: "pending" })
      );
    });

    it("lets staff create only their own pending requests", async () => {
      await assertSucceeds(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "PLACEMENT_LEVEL_OVERRIDE",
          status: "pending",
          approverRole: "instructor_leader",
          requestedByUid: "insGto",
        })
      );
      await assertFails(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "PLACEMENT_LEVEL_OVERRIDE",
          status: "pending",
          approverRole: "instructor_leader",
          requestedByUid: "foGto",
        })
      );
      await assertFails(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "PLACEMENT_LEVEL_OVERRIDE",
          status: "approved",
          approverRole: "instructor_leader",
          requestedByUid: "insGto",
        })
      );
    });
  });

  describe("users frontoffice student fields (H1)", () => {
    it("allows status updates with audit fields on a same-branch student", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foGto",
        })
      );
    });

    it("blocks branch moves, role escalation, and foreign fields", async () => {
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { branchId: "bone_bolango" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { role: "instructor" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { tuitionFee: 0 }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { secretBackdoor: true }));
    });

    it("blocks frontoffice from editing other branches' students or staff", async () => {
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student2"), { status: "inactive" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "insGto"), { status: "inactive" }));
    });

    it("rejects student status update by resigned or terminated front office staff", async () => {
      await assertFails(
        updateDoc(doc(authed("foResigned"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foResigned",
        })
      );
      await assertFails(
        updateDoc(doc(authed("foTerminated"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foTerminated",
        })
      );
    });

    it("rejects student status update across division boundary (Kindergarten FO -> Courses student)", async () => {
      await assertFails(
        updateDoc(doc(authed("foKg"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foKg",
        })
      );
    });

    it("lets a user edit only their own profile basics", async () => {
      await assertSucceeds(updateDoc(doc(authed("insGto"), "users", "insGto"), { displayName: "Rina S." }));
      await assertFails(updateDoc(doc(authed("insGto"), "users", "insGto"), { level: "Advanced" }));
    });
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
        addDoc(collection(authed("foGto"), "shifts"), { ...SHIFT_KOTA, clockOut: "2026-09-21T09:00:00.000Z" })
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

    it("blocks corrections without an approved, shift-matching approval", async () => {
      await seedDoc(["approvals", "corrPending"], { ...APPROVED_CORRECTION, status: "pending" });
      await seedDoc(["approvals", "corrOther"], {
        ...APPROVED_CORRECTION,
        payload: { shiftId: "shift999", afterData: { clockIn: "t" } },
      });
      await assertFails(updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("corrPending")));
      await assertFails(updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("corrOther")));
      await assertFails(updateDoc(doc(authed("foGto"), "shifts", "shift1"), applied("nonexistent")));
    });

    it("blocks corrections touching anything beyond the correction keys", async () => {
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), { ...applied("corr1"), notes: "oops" })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shift1"), { ...applied("corr1"), userId: "student1" })
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

  describe("gate binding hardening (owner-approved 2026-10-08)", () => {
    // Regression tests for the confirmed bypass: firestore.rules previously validated only
    // the document's own approverRole, so whoever wrote the envelope chose the approver.
    // A probe proved an Instructor Leader could decide a CASH_DISCREPANCY ticket merely by
    // addressing it to themselves.
    const misaddressed = (over) => ({
      status: "pending",
      mode: "blocking",
      approverBranchId: "kota_gorontalo",
      requestedBy: "Someone",
      requestedByUid: "insGto",
      requestedAt: "2026-10-08T00:00:00.000Z",
      payload: null,
      ...over,
    });

    const decide = (uid) => ({
      status: "approved",
      decidedBy: uid,
      decidedByUid: uid,
      decidedAt: "2026-10-08T01:00:00.000Z",
      decisionNotes: "",
      rejectionReason: "",
      updatedAt: "2026-10-08T01:00:00.000Z",
    });

    it("denies a decision when the approverRole is not permitted for the actionId", async () => {
      await seedDoc(
        ["approvals", "ilCash"],
        misaddressed({ actionId: "CASH_DISCREPANCY", approverRole: "instructorleader" })
      );
      await seedDoc(
        ["approvals", "ilRetro"],
        misaddressed({ actionId: "RETROACTIVE_STUDENT_ATTENDANCE", approverRole: "instructor_leader" })
      );
      await seedDoc(
        ["approvals", "mgrCancel"],
        misaddressed({ actionId: "CLASS_CANCELLATION_OR_RESCHEDULE", approverRole: "manager" })
      );
      await seedDoc(
        ["approvals", "mgrDiscount"],
        misaddressed({ actionId: "DISCOUNT_OR_REFUND", approverRole: "manager" })
      );

      await assertFails(updateDoc(doc(authed("ilGto"), "approvals", "ilCash"), decide("ilGto")));
      await assertFails(updateDoc(doc(authed("ilGto"), "approvals", "ilRetro"), decide("ilGto")));
      await assertFails(updateDoc(doc(authed("mgrGto"), "approvals", "mgrCancel"), decide("mgrGto")));
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "mgrDiscount"), decide("mgrGto"))
      );
    });

    it("still allows legitimate pairs, including legacy alias spellings", async () => {
      await seedDoc(
        ["approvals", "okLegacy"],
        misaddressed({ actionId: "PLACEMENT_LEVEL_OVERRIDE", approverRole: "instructor_leader" })
      );
      await seedDoc(
        ["approvals", "okCash"],
        misaddressed({ actionId: "CASH_DISCREPANCY", approverRole: "ops_lead" })
      );
      await seedDoc(
        ["approvals", "okTuition"],
        misaddressed({ actionId: "TUITION_PLAN_CHANGE", approverRole: "manager" })
      );

      await assertSucceeds(updateDoc(doc(authed("ilGto"), "approvals", "okLegacy"), decide("ilGto")));
      await assertSucceeds(updateDoc(doc(authed("opsGto"), "approvals", "okCash"), decide("opsGto")));
      await assertSucceeds(
        updateDoc(doc(authed("mgrGto"), "approvals", "okTuition"), decide("mgrGto"))
      );
    });

    it("rejects creating an envelope whose pair is not permitted, and fails closed on unknown actionIds", async () => {
      await assertFails(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "CASH_DISCREPANCY",
          status: "pending",
          approverRole: "instructorleader",
          requestedByUid: "insGto",
        })
      );
      await assertFails(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "PLACEMENT_LEVEL_OVERRIDE",
          status: "pending",
          approverRole: "manager",
          requestedByUid: "insGto",
        })
      );
      await assertFails(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "TOTALLY_MADE_UP",
          status: "pending",
          approverRole: "manager",
          requestedByUid: "insGto",
        })
      );
      // A legitimate envelope is still accepted.
      await assertSucceeds(
        addDoc(collection(authed("insGto"), "approvals"), {
          actionId: "PLACEMENT_LEVEL_OVERRIDE",
          status: "pending",
          approverRole: "instructorleader",
          requestedByUid: "insGto",
        })
      );
    });

    it("prevents a wrong-role approval from being applied to a shift record", async () => {
      await seedDoc(["shifts", "shiftBind"], SHIFT_KOTA);
      await seedDoc(["approvals", "corrWrongRole"], {
        ...APPROVED_CORRECTION,
        approverRole: "instructorleader", // not permitted for STAFF_SHIFT_SELF_CORRECTION
        payload: { shiftId: "shiftBind", afterData: { clockIn: "2026-09-21T00:30:00.000Z" } },
      });
      await assertFails(
        updateDoc(doc(authed("foGto"), "shifts", "shiftBind"), {
          ...SHIFT_KOTA,
          clockIn: "2026-09-21T00:30:00.000Z",
          corrected: true,
          reviewStatus: "pending",
          appliedFromApproval: "corrWrongRole",
        })
      );
    });

    it("routes NEW_STAFF_ACCOUNT to the Director and rejects the old admin addressing", async () => {
      await seedDoc(
        ["approvals", "onboardDirector"],
        misaddressed({ actionId: "NEW_STAFF_ACCOUNT", approverRole: "director" })
      );
      await seedDoc(
        ["approvals", "onboardAdmin"],
        misaddressed({ actionId: "NEW_STAFF_ACCOUNT", approverRole: "admin" })
      );

      await assertSucceeds(
        updateDoc(doc(authed("dirGto"), "approvals", "onboardDirector"), decide("dirGto"))
      );
      // Admin holds no business approval authority (Blueprint §7), and the old addressing
      // is not a permitted pair either.
      await assertFails(
        updateDoc(doc(authed("admin"), "approvals", "onboardDirector"), decide("admin"))
      );
      await assertFails(
        updateDoc(doc(authed("dirGto"), "approvals", "onboardAdmin"), decide("dirGto"))
      );
    });
  });

  describe("shift audit events (C4 dual-control trail)", () => {
    beforeEach(async () => {
      await seedDoc(["shifts", "shift1"], SHIFT_KOTA);
      await seedDoc(["approvals", "corr1"], APPROVED_CORRECTION);
    });

    it("lets admin append any audit event for a shift they acted on", async () => {
      await assertSucceeds(
        addDoc(collection(authed("admin"), "shiftAuditEvents"), {
          shiftId: "shift1",
          actorId: "admin",
          action: "flag_review",
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
      await assertFails(updateDoc(doc(authed("admin"), "shiftAuditEvents", "evt1"), { tampered: true }));
      await assertFails(updateDoc(doc(authed("admin"), "shiftAuditEvents", "evt1"), {}));
    });
  });

  describe("classAttendance collection", () => {
    const CLASS_DOC = {
      instructorId: "insGto",
      substituteInstructorId: "insSub",
      studentIds: ["student1"],
      branchId: "kota_gorontalo",
    };

    beforeEach(async () => {
      await seedDoc(["classes", "class1"], CLASS_DOC);
      await seedDoc(["users", "insSub"], { displayName: "insSub", role: "instructor", branchId: "kota_gorontalo" });
    });

    it("allows assigned instructor to create attendance for enrolled student", async () => {
      await assertSucceeds(
        setDoc(doc(authed("insGto"), "classAttendance", "class1_student1_2026-09-27"), {
          classId: "class1",
          studentId: "student1",
          attendanceDate: "2026-09-27",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "insGto",
        })
      );
    });

    it("denies unassigned instructor or unenrolled student", async () => {
      await assertFails(
        setDoc(doc(authed("insSub"), "classAttendance", "class1_student2_2026-09-27"), {
          classId: "class1",
          studentId: "student2",
          attendanceDate: "2026-09-27",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "insSub",
        })
      );
    });

    it("blocks updates via scan method and enforces method == MANUAL", async () => {
      await seedDoc(["classAttendance", "class1_student1_2026-09-27"], {
        classId: "class1",
        studentId: "student1",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insGto",
      });

      // Attempt update with SCAN method -> fails
      await assertFails(
        setDoc(doc(authed("insGto"), "classAttendance", "class1_student1_2026-09-27"), {
          classId: "class1",
          studentId: "student1",
          attendanceDate: "2026-09-27",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "insGto",
        })
      );

      // Attempt update with MANUAL method -> succeeds
      await assertSucceeds(
        setDoc(doc(authed("insGto"), "classAttendance", "class1_student1_2026-09-27"), {
          classId: "class1",
          studentId: "student1",
          attendanceDate: "2026-09-27",
          status: "ABSENT",
          method: "MANUAL",
          markedBy: "insGto",
        })
      );
    });
  });

  describe("Instructor Leader branch-scope academic monitoring (owner-approved 2026-10-08)", () => {
    const CLASS_KOTA = {
      instructorId: "insGto",
      studentIds: ["student1"],
      branchId: "kota_gorontalo",
      division: "courses",
    };
    const CLASS_KOTA_KIDS = {
      instructorId: "insKids",
      studentIds: ["student3"],
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };
    const CLASS_BOBA = {
      instructorId: "insBoba",
      studentIds: ["student2"],
      branchId: "bone_bolango",
    };

    beforeEach(async () => {
      await seedDoc(["classes", "classKota"], CLASS_KOTA);
      await seedDoc(["classes", "classKotaKids"], CLASS_KOTA_KIDS);
      await seedDoc(["classes", "classBoba"], CLASS_BOBA);

      await seedDoc(["progressReports", "prKotaCourses"], {
        instructorId: "insOther",
        studentId: "student1",
        classId: "classKota",
        branchId: "kota_gorontalo",
        division: "courses",
        examDate: "2026-09-20",
      });
      await seedDoc(["progressReports", "prKotaKids"], {
        instructorId: "insKids",
        studentId: "student3",
        classId: "classKotaKids",
        branchId: "kota_gorontalo",
        division: "kindergarten",
        examDate: "2026-09-21",
      });
      await seedDoc(["progressReports", "prBoba"], {
        instructorId: "insBoba",
        studentId: "student2",
        classId: "classBoba",
        branchId: "bone_bolango",
        examDate: "2026-09-22",
      });

      await seedDoc(["classAttendance", "classKota_student1_2026-09-27"], {
        classId: "classKota",
        studentId: "student1",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insGto",
        branchId: "kota_gorontalo",
      });
      await seedDoc(["classAttendance", "classBoba_student2_2026-09-27"], {
        classId: "classBoba",
        studentId: "student2",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insBoba",
        branchId: "bone_bolango",
      });
    });

    it("reads same-branch progress reports from both divisions, including other instructors'", async () => {
      await assertSucceeds(getDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses")));
      await assertSucceeds(getDoc(doc(authed("ilGto"), "progressReports", "prKotaKids")));
    });

    it("resolves the legacy instructor_leader alias identically", async () => {
      await assertSucceeds(getDoc(doc(authed("ilLegacyGto"), "progressReports", "prKotaCourses")));
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilLegacyGto"), "progressReports"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("denies cross-branch progress reports and branchless listing", async () => {
      await assertFails(getDoc(doc(authed("ilGto"), "progressReports", "prBoba")));
      await assertFails(getDoc(doc(authed("ilBoba"), "progressReports", "prKotaCourses")));
      // list requires the branch constraint: isSameBranchStrict has no fieldless fallback
      await assertFails(getDocs(collection(authed("ilGto"), "progressReports")));
    });

    it("lists only same-branch progress reports when branch-constrained", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilGto"), "progressReports"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((d) => d.id);
      expect(ids).toEqual(expect.arrayContaining(["prKotaCourses", "prKotaKids"]));
      expect(ids).not.toContain("prBoba");
    });

    it("reads branch attendance for classes the leader does not teach, and blocks cross-branch", async () => {
      await assertSucceeds(
        getDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-27"))
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilGto"), "classAttendance"),
            where("classId", "==", "classKota")
          )
        )
      );
      await assertFails(
        getDoc(doc(authed("ilGto"), "classAttendance", "classBoba_student2_2026-09-27"))
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("ilGto"), "classAttendance"),
            where("classId", "==", "classBoba")
          )
        )
      );
    });

    it("does not grant any new write authority over progress reports", async () => {
      await assertFails(
        updateDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses"), { overallScore: 99 })
      );
      await assertFails(deleteDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses")));
      await assertFails(
        setDoc(doc(authed("ilGto"), "progressReports", "ilForged"), {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
        })
      );
    });

    it("does not grant attendance write authority for classes the leader does not teach", async () => {
      // Realigned by governance to Operational Leader / Front Office, never the Instructor Leader.
      await assertFails(
        setDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-28"), {
          classId: "classKota",
          studentId: "student1",
          attendanceDate: "2026-09-28",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "ilGto",
        })
      );
      await assertFails(
        updateDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-27"), {
          status: "ABSENT",
          method: "MANUAL",
        })
      );
    });

    it("leaves shift records closed (financial isolation)", async () => {
      await seedDoc(["shifts", "shiftKota"], SHIFT_KOTA);
      // Own shift stays readable...
      await seedDoc(["shifts", "shiftOwn"], {
        userId: "ilGto",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T01:00:00.000Z",
        clockOut: null,
      });
      await assertSucceeds(getDoc(doc(authed("ilGto"), "shifts", "shiftOwn")));
      // ...but branch shifts carrying cashReconciliation stay out of reach.
      await assertFails(getDoc(doc(authed("ilGto"), "shifts", "shiftKota")));
      await assertFails(
        getDocs(
          query(collection(authed("ilGto"), "shifts"), where("branchId", "==", "kota_gorontalo"))
        )
      );
    });

    it("denies a resigned Instructor Leader", async () => {
      await assertFails(getDoc(doc(authed("ilResigned"), "progressReports", "prKotaCourses")));
      await assertFails(
        getDoc(doc(authed("ilResigned"), "classAttendance", "classKota_student1_2026-09-27"))
      );
    });

    it("still denies a plain Instructor peer progress reports and unassigned attendance", async () => {
      await assertFails(getDoc(doc(authed("insGto"), "progressReports", "prKotaKids")));
      await assertFails(
        getDoc(doc(authed("insGto"), "classAttendance", "classBoba_student2_2026-09-27"))
      );
    });
  });

  describe("fallback deny-all", () => {
    it("denies unauthenticated access to collections without public rules", async () => {
      const anon = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anon, "shifts", "whatever")));
      await assertFails(addDoc(collection(anon, "payments"), PAYMENT_KOTA));
    });

    it("denies unauthenticated access to student user profiles", async () => {
      const anon = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anon, "users", "student1")));
    });

    it("denies everything on collections with no explicit rules", async () => {
      await assertFails(addDoc(collection(authed("admin"), "mysteryCollection"), { x: 1 }));
      await assertFails(getDoc(doc(authed("admin"), "mysteryCollection", "doc1")));
    });
  });

  describe("integration audit verification & remediation (Phase 2)", () => {
    beforeEach(async () => {
      await seedUsers();
    });

    it("INT-004: Front Office can read same-branch staff user doc and shifts, but cross-branch is blocked", async () => {
      // 1. Same-branch staff profile getDoc succeeds
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "cleanerGto")));

      // 2. Cross-branch staff profile getDoc fails
      await assertFails(getDoc(doc(authed("foBoba"), "users", "cleanerGto")));

      // 3. Same-branch staff open shift query succeeds
      await seedDoc(["shifts", "shift_insGto"], {
        userId: "insGto",
        role: "instructor",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T01:00:00.000Z",
        clockOut: null,
      });

      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "shifts"),
            where("userId", "==", "insGto"),
            where("clockOut", "==", null),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 4. Cross-branch staff shift query fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "shifts"),
            where("userId", "==", "insGto"),
            where("clockOut", "==", null),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("INT-002: scoped directives queries succeed and maintain branch isolation; unfiltered queries are blocked", async () => {
      await seedDoc(["todos", "todoKota"], {
        title: "Kota todo",
        branchId: "kota_gorontalo",
        completed: false,
      });
      await seedDoc(["todos", "todoBoba"], {
        title: "Boba todo",
        branchId: "bone_bolango",
        completed: false,
      });
      await seedDoc(["todos", "todoAll"], {
        title: "Academy All todo",
        branchId: "all",
        completed: false,
      });

      // 1. Unfiltered query is now blocked for all staff branches (no more leakage!)
      await assertFails(getDocs(collection(authed("foGto"), "todos")));
      await assertFails(getDocs(collection(authed("foBoba"), "todos")));

      // 2. Branch-scoped query succeeds for Kota Gorontalo and receives Kota + All
      const snapKota = await assertSucceeds(
        getDocs(query(collection(authed("foGto"), "todos"), where("branchId", "in", ["kota_gorontalo", "all"])))
      );
      const kotaIds = snapKota.docs.map((d) => d.id);
      if (!kotaIds.includes("todoKota") || !kotaIds.includes("todoAll") || kotaIds.includes("todoBoba")) {
        throw new Error("Kota query returned incorrect directives: " + JSON.stringify(kotaIds));
      }

      // 3. Branch-scoped query succeeds for Bone Bolango and receives Boba + All
      const snapBoba = await assertSucceeds(
        getDocs(query(collection(authed("foBoba"), "todos"), where("branchId", "in", ["bone_bolango", "all"])))
      );
      const bobaIds = snapBoba.docs.map((d) => d.id);
      if (!bobaIds.includes("todoBoba") || !bobaIds.includes("todoAll") || bobaIds.includes("todoKota")) {
        throw new Error("Boba query returned incorrect directives: " + JSON.stringify(bobaIds));
      }
    });

    it("INT-009: prevents Kota manager from modifying a Bone Bolango corporate event", async () => {
      await seedDoc(["corporateEvents", "bobaEvent"], {
        name: "Bone Bolango Gathering",
        branchId: "bone_bolango",
        audienceType: "branch",
        audienceValue: "Bone Bolango",
        eventDate: "2026-09-30",
      });

      // 1. Cross-branch modification is now BLOCKED by isSameBranch(resource.data)
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "corporateEvents", "bobaEvent"), {
          audienceType: "branch",
          audienceValue: "Kota Gorontalo",
        })
      );

      // 2. Same-branch manager can update their event
      await assertSucceeds(
        updateDoc(doc(authed("mgrBoba"), "corporateEvents", "bobaEvent"), {
          name: "Updated Bone Bolango Gathering",
        })
      );
    });

    it("CE-BRANCH-SCOPE: enforces branch isolation for branch events and company-wide access for all events", async () => {
      await seedDoc(["corporateEvents", "bobaEvent"], {
        name: "Bone Bolango Gathering",
        branchId: "bone_bolango",
        audienceType: "branch",
        audienceValue: "Bone Bolango",
        eventDate: "2026-10-15",
        status: "active",
      });

      await seedDoc(["corporateEvents", "kotaEvent"], {
        name: "Kota Gorontalo Workshop",
        branchId: "kota_gorontalo",
        audienceType: "branch",
        audienceValue: "Kota Gorontalo",
        eventDate: "2026-10-15",
        status: "active",
      });

      await seedDoc(["corporateEvents", "allEvent"], {
        name: "Annual All-Staff Assembly",
        audienceType: "all",
        eventDate: "2026-10-15",
        status: "active",
      });

      // 1. Kota Gorontalo manager lists audienceType == "all" events -> succeeds
      await assertSucceeds(
        getDocs(query(collection(authed("mgrGto"), "corporateEvents"), where("audienceType", "==", "all")))
      );

      // 2. Kota Gorontalo manager lists branchId == "kota_gorontalo" -> succeeds
      await assertSucceeds(
        getDocs(query(collection(authed("mgrGto"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 3. Bone Bolango Front Office lists branchId == "kota_gorontalo" -> fails
      await assertFails(
        getDocs(query(collection(authed("foBoba"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 4. Any non-admin staff lists events with no filter -> fails
      await assertFails(
        getDocs(collection(authed("foGto"), "corporateEvents"))
      );
      await assertFails(
        getDocs(collection(authed("mgrGto"), "corporateEvents"))
      );

      // 5. Staff gets a single Bone Bolango branch event while belonging to Kota Gorontalo -> fails
      await assertFails(
        getDoc(doc(authed("foGto"), "corporateEvents", "bobaEvent"))
      );

      // 6. Staff gets a single company-wide event from any branch -> succeeds
      await assertSucceeds(
        getDoc(doc(authed("foGto"), "corporateEvents", "allEvent"))
      );
      await assertSucceeds(
        getDoc(doc(authed("foBoba"), "corporateEvents", "allEvent"))
      );

      // 7. Marketing user lists branchId == own branch -> succeeds. Other branch -> fails
      await assertSucceeds(
        getDocs(query(collection(authed("mktGto"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );
      await assertFails(
        getDocs(query(collection(authed("mktGto"), "corporateEvents"), where("branchId", "==", "bone_bolango")))
      );

      // 8. Staff with no branchId and no branch lists branchId == "kota_gorontalo" -> fails
      await assertFails(
        getDocs(query(collection(authed("foUnassigned"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 9. Admin lists with no filter -> succeeds
      await assertSucceeds(
        getDocs(collection(authed("admin"), "corporateEvents"))
      );

      // 10. Student and parent cannot list or get any corporate event -> fails
      await assertFails(
        getDoc(doc(authed("student1"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDocs(query(collection(authed("student1"), "corporateEvents"), where("audienceType", "==", "all")))
      );
      await assertFails(
        getDoc(doc(authed("parent1"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDocs(query(collection(authed("parent1"), "corporateEvents"), where("audienceType", "==", "all")))
      );

      // 11. Resigned or terminated staff cannot list or read events -> fails
      await assertFails(
        getDoc(doc(authed("foResigned"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDoc(doc(authed("foTerminated"), "corporateEvents", "allEvent"))
      );

      // 12. Kiosk date query shape:
      // Same branch succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      // Foreign branch fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("branchId", "==", "bone_bolango")
          )
        )
      );
      // Company-wide succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("audienceType", "==", "all")
          )
        )
      );
    });

    it("INT-013: progress reports are branch-isolated for staff and parent-ready", async () => {
      await seedDoc(["progressReports", "bobaReport"], {
        instructorId: "insBoba",
        studentId: "student2",
        classId: "classBoba",
        branchId: "bone_bolango",
      });
      await seedDoc(["progressReports", "kotaReport"], {
        instructorId: "insGto",
        studentId: "student1",
        classId: "class1",
        branchId: "kota_gorontalo",
      });

      // 1. Front office in Kota is BLOCKED from reading Bone Bolango progress report
      await assertFails(getDoc(doc(authed("foGto"), "progressReports", "bobaReport")));

      // 2. Front office in Kota can read Kota progress report
      await assertSucceeds(getDoc(doc(authed("foGto"), "progressReports", "kotaReport")));

      // 3. Parent ready: parent1 can read report for their linked child (student1)
      await assertSucceeds(getDoc(doc(authed("parent1"), "progressReports", "kotaReport")));

      // 4. Parent ready: parent1 CANNOT read report for another child (student2)
      await assertFails(getDoc(doc(authed("parent1"), "progressReports", "bobaReport")));
    });

    it("INT-017: verifies parent class query shape under parent rules", async () => {
      await seedDoc(["classes", "class1"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
        status: "open",
      });

      // Parent1 has childStudentIds: ["student1"] and branchId: "kota_gorontalo". Query with canonical branchId:
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parent1"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );
    });

    it("INT-020: Front Office parent listing and querying with branch isolation", async () => {
      // 1. Kota front office can query students, instructors, and parents
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 2. Bone Bolango front office can query their own branch
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "bone_bolango")
          )
        )
      );

      // 3. Bone Bolango front office CANNOT query Kota Gorontalo branch
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 4. Dedicated parent query with branchId
      const snapGto = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      expect(snapGto.docs.map((d) => d.id)).toContain("parent1");
      expect(snapGto.docs.map((d) => d.id)).not.toContain("parent2");

      // 5. Unfiltered query (no branch filter) for non-Kota staff (foBoba) is blocked
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 6. Test foGto without branchId filter: blocked under isSameBranchStrict
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 6b. Unscoped query without branchId is also blocked for instructor, marketing, and office boy
      await assertFails(
        getDocs(
          query(
            collection(authed("insGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("mktGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("obGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 7. array-contains query for foGto WITHOUT branchId is blocked
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("childStudentIds", "array-contains", "student1")
          )
        )
      );

      // 7b. array-contains query for foGto WITH branchId succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo"),
            where("childStudentIds", "array-contains", "student1")
          )
        )
      );

      // 8. array-contains query for foBoba WITHOUT branchId fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "==", "parent"),
            where("childStudentIds", "array-contains", "student2")
          )
        )
      );

      // 9. array-contains query for foBoba WITH branchId succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "bone_bolango"),
            where("childStudentIds", "array-contains", "student2")
          )
        )
      );

      // 10. Front Office user with NO branch assigned (neither branchId nor branch)
      // must NOT silently become kota_gorontalo and must be rejected from querying or reading
      await assertFails(
        getDocs(
          query(
            collection(authed("foUnassigned"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      await assertFails(
        getDoc(doc(authed("foUnassigned"), "payments", "pay1"))
      );

      // 11. Item B defense-in-depth: Unassigned staff (FO, Manager, Instructor with no branchId and no branch)
      // attempting to query with branchId == null filter must be rejected across all branch-scoped collections
      for (const unassignedUid of ["foUnassigned", "mgrUnassigned", "insUnassigned"]) {
        const authedDb = authed(unassignedUid);

        // users listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "users"),
              where("role", "in", ["student", "instructor", "parent"]),
              where("branchId", "==", null)
            )
          )
        );

        // payments listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "payments"),
              where("branchId", "==", null)
            )
          )
        );

        // attendance listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "attendance"),
              where("branchId", "==", null)
            )
          )
        );

        // classes listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "classes"),
              where("branchId", "==", null)
            )
          )
        );
      }
    });
  });
});
