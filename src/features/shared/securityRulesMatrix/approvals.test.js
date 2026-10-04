import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isManager,
  isFrontOffice,
  isSameBranch,
  canDecideApproval,
  canUpdateApproval,
  isApprovedShiftCorrection,
} from "./securityRulesMatrix.helpers.js";
import {
  adminUser,
  managerGorontalo,
  managerBoneBolango,
  foGorontalo,
  foBoneBolango,
  instructorLeaderGorontalo,
} from "./securityRulesMatrix.fixtures.js";

describe("Maker-Checker Approvals & Inboxes Security Matrix", () => {
  describe("Dual-Control Maker-Checker Approval Isolation & 4 Inboxes", () => {
    it("routes Manager approvals strictly to Branch Manager of that branch", () => {
      const approvalDoc = {
        actionId: "DISCOUNT_OR_REFUND",
        approverRole: "manager",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      expect(canDecideApproval(approvalDoc, managerGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, managerBoneBolango)).toBe(false);
      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("routes Pedagogy approvals strictly to Instructor Leader of that branch", () => {
      const approvalDoc = {
        actionId: "PLACEMENT_LEVEL_OVERRIDE",
        approverRole: "instructor_leader",
        branchId: "kota_gorontalo",
        requestedByUid: "ins_gtlo",
      };

      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, managerGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("routes Operational approvals strictly to Front Office / Ops Lead of that branch", () => {
      const approvalDoc = {
        actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
        approverRole: "ops_lead",
        branchId: "kota_gorontalo",
        requestedByUid: "ins_gtlo",
      };

      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, foBoneBolango)).toBe(false);
      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("strictly blocks self-approval: requester cannot approve their own request", () => {
      const managerSelfShiftCorrection = {
        actionId: "STAFF_SHIFT_SELF_CORRECTION",
        approverRole: "manager",
        branchId: "kota_gorontalo",
        requestedByUid: "mgr_gtlo", // Manager is the requester!
      };

      // Even though managerGorontalo is Manager of kota_gorontalo, they cannot self-approve!
      expect(canDecideApproval(managerSelfShiftCorrection, managerGorontalo)).toBe(false);
      // Admin can approve it
      expect(canDecideApproval(managerSelfShiftCorrection, adminUser)).toBe(true);
    });

    it("blocks Ops Lead self-approving their own shift self-correction", () => {
      const foSelfShiftCorrection = {
        actionId: "STAFF_SHIFT_SELF_CORRECTION",
        approverRole: "ops_lead",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      expect(canDecideApproval(foSelfShiftCorrection, foGorontalo)).toBe(false);
    });
  });

  describe("Approval Decision Contract (C2)", () => {
    const pendingApproval = {
      id: "appr_1",
      actionId: "DISCOUNT_OR_REFUND",
      approverRole: "manager",
      approverBranchId: "kota_gorontalo",
      requestedByUid: "fo_gtlo",
      status: "pending",
    };

    it("allows the designated approver to record a decision with canonical fields", () => {
      const incoming = {
        ...pendingApproval,
        status: "approved",
        decidedBy: "Manager GTLO",
        decidedByUid: "mgr_gtlo",
        decidedAt: "2026-09-25T10:00:00.000Z",
        decisionNotes: "Verified with parent",
        updatedAt: "ts",
      };
      expect(canUpdateApproval(pendingApproval, incoming, managerGorontalo)).toBe(true);
    });

    it("rejects decisions recorded under a different uid", () => {
      const incoming = {
        ...pendingApproval,
        status: "approved",
        decidedByUid: "someone_else",
        decidedAt: "2026-09-25T10:00:00.000Z",
      };
      expect(canUpdateApproval(pendingApproval, incoming, managerGorontalo)).toBe(false);
    });

    it("rejects tampering with requester identity or non-decision fields", () => {
      const tamperedRequester = {
        ...pendingApproval,
        requestedByUid: "admin_1",
        status: "approved",
        decidedByUid: "mgr_gtlo",
      };
      expect(canUpdateApproval(pendingApproval, tamperedRequester, managerGorontalo)).toBe(false);

      const extraField = {
        ...pendingApproval,
        status: "approved",
        decidedByUid: "mgr_gtlo",
        amount: 999999,
      };
      expect(canUpdateApproval(pendingApproval, extraField, managerGorontalo)).toBe(false);
    });

    it("rejects statuses outside approved/rejected", () => {
      const backToPending = {
        ...pendingApproval,
        status: "pending",
        decidedByUid: "mgr_gtlo",
      };
      expect(canUpdateApproval(pendingApproval, backToPending, managerGorontalo)).toBe(false);
    });
  });

  describe("Approved Shift Self-Correction Gate (C4)", () => {
    const approvedCorrection = {
      id: "appr_77",
      actionId: "STAFF_SHIFT_SELF_CORRECTION",
      status: "approved",
      payload: { shiftId: "sh_42" },
    };

    it("accepts only approved self-correction envelopes for the exact shift", () => {
      expect(isApprovedShiftCorrection(approvedCorrection, "sh_42")).toBe(true);
      expect(isApprovedShiftCorrection(approvedCorrection, "sh_99")).toBe(false);
      expect(
        isApprovedShiftCorrection({ ...approvedCorrection, status: "pending" }, "sh_42")
      ).toBe(false);
      expect(
        isApprovedShiftCorrection(
          { ...approvedCorrection, actionId: "DISCOUNT_OR_REFUND" },
          "sh_42"
        )
      ).toBe(false);
      expect(isApprovedShiftCorrection({ ...approvedCorrection, payload: null }, "sh_42")).toBe(
        false
      );
      expect(isApprovedShiftCorrection({ ...approvedCorrection, applied: true }, "sh_42")).toBe(
        false
      );
    });
  });

  describe("Shift Review Status Updates", () => {
    function canReviewShift(existing, incoming, user) {
      if (isAdmin(user)) return true;
      if ((isFrontOffice(user) || isManager(user)) && isSameBranch(existing, user)) {
        const diffKeys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
        return diffKeys.length === 1 && diffKeys[0] === "reviewStatus";
      }
      return false;
    }

    const closedShift = {
      id: "sh_closed",
      userId: "ins_gtlo",
      branchId: "kota_gorontalo",
      clockIn: "2026-09-25T01:00:00.000Z",
      clockOut: "2026-09-25T03:00:00.000Z",
    };

    it("allows Front Office and Manager of the same branch to mark closed shift reviewed", () => {
      const updated = { ...closedShift, reviewStatus: "reviewed" };
      expect(canReviewShift(closedShift, updated, foGorontalo)).toBe(true);
      expect(canReviewShift(closedShift, updated, managerGorontalo)).toBe(true);
    });

    it("blocks cross-branch staff from marking shift reviewed", () => {
      const updated = { ...closedShift, reviewStatus: "reviewed" };
      expect(canReviewShift(closedShift, updated, foBoneBolango)).toBe(false);
      expect(canReviewShift(closedShift, updated, managerBoneBolango)).toBe(false);
    });

    it("rejects modifying other fields under the reviewStatus permission", () => {
      const tampered = { ...closedShift, reviewStatus: "reviewed", clockOut: "2026-09-27T05:00:00.000Z" };
      expect(canReviewShift(closedShift, tampered, foGorontalo)).toBe(false);
    });
  });
});
