/**
 * Real Firestore Rules Emulator Tests — Approvals and Governance Gates
 */
import { describe, beforeAll, beforeEach, afterAll, it } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  setupEmulatorHarness,
  HAS_EMULATOR,
  USERS,
  PAYMENT_KOTA,
  APPROVAL_KOTA,
  APPROVAL_BOBA,
  SHIFT_KOTA,
  APPROVED_CORRECTION,
} from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Approvals and Governance Gates", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("approvals-gates");
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
      updatedAt: serverTimestamp(),
    });

    it("routes manager approvals to the manager of that branch", async () => {
      await assertSucceeds(getDoc(doc(authed("mgrGto"), "approvals", "appr1")));
      await assertFails(getDoc(doc(authed("mgrBoba"), "approvals", "appr1")));
      await assertSucceeds(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), decision("mgrGto"))
      );
      await assertFails(
        updateDoc(doc(authed("mgrBoba"), "approvals", "appr1"), decision("mgrBoba"))
      );
    });

    it("gives the Bone Bolango manager access to Bone Bolango approvals", async () => {
      await assertSucceeds(getDoc(doc(authed("mgrBoba"), "approvals", "apprBoba")));
      await assertFails(getDoc(doc(authed("mgrGto"), "approvals", "apprBoba")));
      await assertSucceeds(
        updateDoc(doc(authed("mgrBoba"), "approvals", "apprBoba"), decision("mgrBoba"))
      );
    });

    it("allows Central Academic Lead (Kota Gorontalo) to decide satellite academic approvals under G-012 (DOM07-GOV-04)", async () => {
      const satellitePlacement = {
        actionId: "PLACEMENT_LEVEL_OVERRIDE",
        status: "pending",
        approverRole: "instructorleader",
        approverBranchId: "bone_bolango",
        requestedByUid: "insBoba",
        requestedAt: "2026-10-13T00:00:00.000Z",
      };
      await seedDoc(["approvals", "apprAcadBoba"], satellitePlacement);

      // Central Academic Lead at Kota Gorontalo can view and decide satellite academic ticket
      await assertSucceeds(getDoc(doc(authed("ilGto"), "approvals", "apprAcadBoba")));
      await assertSucceeds(
        updateDoc(doc(authed("ilGto"), "approvals", "apprAcadBoba"), decision("ilGto"))
      );

      // Satellite Instructor Leader (Bone Bolango) CANNOT decide main branch academic tickets
      const mainPlacement = {
        actionId: "PLACEMENT_LEVEL_OVERRIDE",
        status: "pending",
        approverRole: "instructorleader",
        approverBranchId: "kota_gorontalo",
        requestedByUid: "insGto",
        requestedAt: "2026-10-13T00:00:00.000Z",
      };
      await seedDoc(["approvals", "apprAcadGto"], mainPlacement);
      await assertFails(getDoc(doc(authed("ilBoba"), "approvals", "apprAcadGto")));
      await assertFails(
        updateDoc(doc(authed("ilBoba"), "approvals", "apprAcadGto"), decision("ilBoba"))
      );

      // Central Academic Lead CANNOT approve non-academic gates from satellite branch
      const satelliteOpsTicket = {
        actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
        status: "pending",
        approverRole: "opslead",
        approverBranchId: "bone_bolango",
        requestedByUid: "foBoba",
        requestedAt: "2026-10-13T00:00:00.000Z",
      };
      await seedDoc(["approvals", "apprOpsBoba"], satelliteOpsTicket);
      await assertFails(getDoc(doc(authed("ilGto"), "approvals", "apprOpsBoba")));
      await assertFails(
        updateDoc(doc(authed("ilGto"), "approvals", "apprOpsBoba"), decision("ilGto"))
      );
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
      const selfDecision = {
        status: "approved",
        decidedByUid: "foGto",
        decidedAt: "t",
        updatedAt: "t",
      };
      await assertFails(updateDoc(doc(authed("foGto"), "approvals", "apprSelf"), selfDecision));
    });

    it("requires decidedByUid to be the deciding user", async () => {
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), {
          ...decision("mgrGto"),
          decidedByUid: "admin",
        })
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
        updateDoc(doc(authed("mgrGto"), "approvals", "appr1"), {
          ...decision("mgrGto"),
          status: "pending",
        })
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
      updatedAt: serverTimestamp(),
    });

    it("denies a decision when the approverRole is not permitted for the actionId", async () => {
      await seedDoc(
        ["approvals", "ilCash"],
        misaddressed({ actionId: "CASH_DISCREPANCY", approverRole: "instructorleader" })
      );
      await seedDoc(
        ["approvals", "ilRetro"],
        misaddressed({
          actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
          approverRole: "instructor_leader",
        })
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
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "approvals", "mgrCancel"), decide("mgrGto"))
      );
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

      await assertSucceeds(
        updateDoc(doc(authed("ilGto"), "approvals", "okLegacy"), decide("ilGto"))
      );
      await assertSucceeds(
        updateDoc(doc(authed("opsGto"), "approvals", "okCash"), decide("opsGto"))
      );
      await seedDoc(
        ["approvals", "okCashExecFallback"],
        misaddressed({ actionId: "CASH_DISCREPANCY", approverRole: "ops_lead" })
      );
      await assertSucceeds(
        updateDoc(doc(authed("dirGto"), "approvals", "okCashExecFallback"), decide("dirGto"))
      );
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
});
