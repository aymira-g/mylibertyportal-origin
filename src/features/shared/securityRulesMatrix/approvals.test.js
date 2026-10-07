import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isManager,
  isFrontOffice,
  isSameBranch,
  isApproverForDoc,
  canDecideApproval,
  canUpdateApproval,
  isApprovedShiftCorrection,
  isApprovedRoleElevation,
} from "./securityRulesMatrix.helpers.js";
import {
  directorUser,
  viceDirectorUser,
  adminUser,
  managerGorontalo,
  managerBoneBolango,
  foGorontalo,
  foBoneBolango,
  instructorLeaderGorontalo,
} from "./securityRulesMatrix.fixtures.js";
import {
  GATED_ACTIONS,
  canApproveGate,
} from "../approvalGates.js";

describe("Maker-Checker Approvals & Inboxes Security Matrix", () => {
  describe("Dual-Control Maker-Checker Approval Isolation & 4 Inboxes", () => {
    it("routes Manager approvals strictly to Branch Manager of that branch", () => {
      const approvalDoc = {
        actionId: "CASH_DISCREPANCY",
        approverRole: "manager",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      expect(canDecideApproval(approvalDoc, managerGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, managerBoneBolango)).toBe(false);
      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(false);
      // System Admin cannot decide business approvals (Blueprint §7.3, §7.4)
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(false);
    });

    it("routes Discount & Refund approvals exclusively to Executive Director / Vice Director (G-009)", () => {
      const discountDoc = {
        actionId: "DISCOUNT_OR_REFUND",
        approverRole: "director",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      // Executives can decide discounts province-wide
      expect(canDecideApproval(discountDoc, directorUser)).toBe(true);
      expect(canDecideApproval(discountDoc, viceDirectorUser)).toBe(true);
      // Branch Manager cannot approve discounts under G-009!
      expect(canDecideApproval(discountDoc, managerGorontalo)).toBe(false);
      // Front office & instructor leader cannot approve
      expect(canDecideApproval(discountDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(discountDoc, instructorLeaderGorontalo)).toBe(false);
      // System Admin cannot decide business discounts
      expect(canDecideApproval(discountDoc, adminUser)).toBe(false);
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
      // System Admin cannot decide pedagogy approvals
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(false);
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
      // System Admin cannot decide operational attendance approvals
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(false);
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
      // Admin CANNOT approve it (Blueprint §7: Admin is technical maintenance, not business management)
      expect(canDecideApproval(managerSelfShiftCorrection, adminUser)).toBe(false);
      // Executive Director or Vice Director can approve escalated manager corrections (§6.1, §6.2)
      expect(canDecideApproval(managerSelfShiftCorrection, directorUser)).toBe(true);
      expect(canDecideApproval(managerSelfShiftCorrection, viceDirectorUser)).toBe(true);
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

    it("rejects re-opening or tampering with an already decided approval", () => {
      const incoming = {
        ...pendingApproval,
        status: "approved",
        decidedBy: "Manager GTLO",
        decidedByUid: "mgr_gtlo",
        decidedAt: "2026-09-25T10:00:00.000Z",
        decisionNotes: "Re-deciding",
        updatedAt: "ts",
      };
      // Already rejected cannot be flipped to approved
      expect(canUpdateApproval({ ...pendingApproval, status: "rejected" }, incoming, managerGorontalo)).toBe(false);
      // Already approved cannot be re-decided
      expect(canUpdateApproval({ ...pendingApproval, status: "approved" }, incoming, managerGorontalo)).toBe(false);
    });

    it("allows marking an approved ticket as applied to seal against replay", () => {
      const approvedState = {
        ...pendingApproval,
        status: "approved",
        decidedByUid: "mgr_gtlo",
      };
      const appliedUpdate = {
        ...approvedState,
        applied: true,
        appliedAt: "2026-09-25T10:05:00.000Z",
        appliedByUid: "mgr_gtlo",
        updatedAt: "ts",
      };
      expect(canUpdateApproval(approvedState, appliedUpdate, managerGorontalo)).toBe(true);
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

  describe("Executive Tier Gates & Staff Role Elevation Dual-Control (D3)", () => {
    const promotionTicket = {
      id: "appr_elev_1",
      actionId: "STAFF_ROLE_ELEVATION",
      approverRole: "director",
      approverBranchId: null, // Province-wide
      requestedByUid: "director_1",
      status: "pending",
      payload: {
        targetUserId: "ins_gtlo",
        targetRole: "instructorleader",
        currentRole: "instructor",
      },
    };

    it("allows Vice Director to cross-check and sign Director's elevation request", () => {
      expect(canDecideApproval(promotionTicket, viceDirectorUser)).toBe(true);
    });

    it("strictly blocks the requester (Director) from self-approving their own request (D3.1)", () => {
      // Maker cannot be signer!
      expect(canDecideApproval(promotionTicket, directorUser)).toBe(false);
    });

    it("strictly blocks target user from self-promoting even if they hold executive role (D3.2)", () => {
      const selfElevationTicket = {
        ...promotionTicket,
        requestedByUid: "admin_1",
        payload: {
          targetUserId: "director_1",
          targetRole: "director",
        },
      };

      // Director is the target of the elevation -> cannot sign their own promotion
      expect(canDecideApproval(selfElevationTicket, directorUser)).toBe(false);
      // Vice Director can sign it
      expect(canDecideApproval(selfElevationTicket, viceDirectorUser)).toBe(true);
    });

    it("blocks Branch Managers from approving staff role elevation", () => {
      expect(canDecideApproval(promotionTicket, managerGorontalo)).toBe(false);
    });

    it("strictly blocks Admins from approving staff role elevation (Director/Vice Director only)", () => {
      expect(canDecideApproval(promotionTicket, adminUser)).toBe(false);
    });

    it("validates isApprovedRoleElevation contract", () => {
      const approvedDoc = {
        actionId: "STAFF_ROLE_ELEVATION",
        status: "approved",
        applied: false,
        approverRole: "director",
        requestedByUid: "director_1",
        decidedByUid: "vicedirector_1",
        payload: {
          targetUserId: "ins_gtlo",
          targetRole: "instructorleader",
        },
      };

      // Valid elevation ticket
      expect(isApprovedRoleElevation("ins_gtlo", approvedDoc, "instructorleader")).toBe(true);

      // Subordinate spoofing violation: ticket routed to frontoffice or manager is rejected
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, approverRole: "frontoffice" }, "instructorleader")).toBe(false);
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, approverRole: "manager" }, "instructorleader")).toBe(false);
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, approverRole: undefined }, "instructorleader")).toBe(false);

      // Replay attack: already applied ticket is rejected
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, applied: true }, "instructorleader")).toBe(false);

      // Wrong target user is rejected
      expect(isApprovedRoleElevation("other_user", approvedDoc, "instructorleader")).toBe(false);

      // Wrong target role is rejected
      expect(isApprovedRoleElevation("ins_gtlo", approvedDoc, "manager")).toBe(false);

      // Dual-control violation: decidedByUid === requestedByUid is rejected
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, decidedByUid: "director_1" }, "instructorleader")).toBe(false);

      // Self-promotion violation: decidedByUid === targetUserId is rejected
      expect(isApprovedRoleElevation("ins_gtlo", { ...approvedDoc, decidedByUid: "ins_gtlo" }, "instructorleader")).toBe(false);
    });
  });

  describe("Client / Backend Parity & Cross-Role Negative Authorization (F1 & §6)", () => {
    const testUsers = [
      { user: directorUser, role: "director", label: "Director" },
      { user: viceDirectorUser, role: "vice_director", label: "Vice Director" },
      { user: adminUser, role: "admin", label: "System Admin" },
      { user: managerGorontalo, role: "manager", label: "Division Manager GTLO" },
      { user: foGorontalo, role: "frontoffice", label: "Front Office GTLO" },
      { user: instructorLeaderGorontalo, role: "instructorleader", label: "Instructor Leader GTLO" },
      { user: { uid: "ins_1", role: "instructor", branchId: "kota_gorontalo" }, role: "instructor", label: "Instructor GTLO" },
      { user: { uid: "mkt_1", role: "marketing", branchId: "kota_gorontalo" }, role: "marketing", label: "Marketing GTLO" },
      { user: { uid: "ob_1", role: "officeboy", branchId: "kota_gorontalo" }, role: "officeboy", label: "Office Boy GTLO" },
    ];

    it("maintains 100% parity between canApproveGate and isApproverForDoc for every gate", () => {
      Object.values(GATED_ACTIONS).forEach((gate) => {
        // Skip dynamic gates that resolve per-ticket approvers at runtime
        if (gate.approverRole === "dynamic_hierarchy" || gate.approverRole === "dynamic_superior") return;

        testUsers.forEach(({ user, role, label }) => {
          const clientResult = canApproveGate(role, gate);
          const mockDoc = {
            actionId: gate.id,
            approverRole: gate.approverRole,
            approverBranchId: "kota_gorontalo",
            branchId: "kota_gorontalo",
            requestedByUid: "someone_else_uid",
          };
          const backendResult = isApproverForDoc(mockDoc, user);

          expect(
            clientResult,
            `Parity mismatch on gate ${gate.id} for role ${label} (${role}): client says ${clientResult}, backend says ${backendResult}`
          ).toBe(backendResult);
        });
      });
    });

    it("proves negative authority: Course Division Manager cannot approve unrelated domain gates", () => {
      const opsDoc = { actionId: "RETROACTIVE_STUDENT_ATTENDANCE", approverRole: "ops_lead", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const academicDoc = { actionId: "PLACEMENT_LEVEL_OVERRIDE", approverRole: "instructor_leader", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const elevationDoc = { actionId: "STAFF_ROLE_ELEVATION", approverRole: "director", approverBranchId: null, requestedByUid: "director_1" };

      expect(canDecideApproval(opsDoc, managerGorontalo)).toBe(false);
      expect(canDecideApproval(academicDoc, managerGorontalo)).toBe(false);
      expect(canDecideApproval(elevationDoc, managerGorontalo)).toBe(false);
    });

    it("proves negative authority: Operational Leader cannot approve academic or financial gates", () => {
      const academicDoc = { actionId: "PLACEMENT_LEVEL_OVERRIDE", approverRole: "instructor_leader", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const discountDoc = { actionId: "DISCOUNT_OR_REFUND", approverRole: "director", approverBranchId: "kota_gorontalo", requestedByUid: "fo_gtlo" };
      const tuitionDoc = { actionId: "TUITION_PLAN_CHANGE", approverRole: "manager", approverBranchId: "kota_gorontalo", requestedByUid: "fo_gtlo" };

      expect(canDecideApproval(academicDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(discountDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(tuitionDoc, foGorontalo)).toBe(false);
    });

    it("proves negative authority: Instructor Leader cannot approve operational or financial gates", () => {
      const opsDoc = { actionId: "RETROACTIVE_STUDENT_ATTENDANCE", approverRole: "ops_lead", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const discountDoc = { actionId: "DISCOUNT_OR_REFUND", approverRole: "director", approverBranchId: "kota_gorontalo", requestedByUid: "fo_gtlo" };

      expect(canDecideApproval(opsDoc, instructorLeaderGorontalo)).toBe(false);
      expect(canDecideApproval(discountDoc, instructorLeaderGorontalo)).toBe(false);
    });

    it("proves negative authority: Vice Director cannot approve domain-local Ops Lead or Instructor Leader gates (F1)", () => {
      const opsDoc = { actionId: "RETROACTIVE_STUDENT_ATTENDANCE", approverRole: "ops_lead", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const academicDoc = { actionId: "PLACEMENT_LEVEL_OVERRIDE", approverRole: "instructor_leader", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };

      expect(canDecideApproval(opsDoc, viceDirectorUser)).toBe(false);
      expect(canDecideApproval(academicDoc, viceDirectorUser)).toBe(false);
    });

    it("proves negative authority: Director cannot approve domain-local Ops Lead or Instructor Leader gates (F1)", () => {
      const opsDoc = { actionId: "RETROACTIVE_STUDENT_ATTENDANCE", approverRole: "ops_lead", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };
      const academicDoc = { actionId: "PLACEMENT_LEVEL_OVERRIDE", approverRole: "instructor_leader", approverBranchId: "kota_gorontalo", requestedByUid: "ins_1" };

      expect(canDecideApproval(opsDoc, directorUser)).toBe(false);
      expect(canDecideApproval(academicDoc, directorUser)).toBe(false);
    });

    it("proves negative authority: System Admin cannot approve ANY business gates (Blueprint §7)", () => {
      Object.values(GATED_ACTIONS).forEach((gate) => {
        const mockDoc = {
          actionId: gate.id,
          approverRole: gate.approverRole,
          approverBranchId: "kota_gorontalo",
          requestedByUid: "user_req_1",
        };
        expect(
          canDecideApproval(mockDoc, adminUser),
          `System Admin must NOT be allowed to approve business gate: ${gate.id}`
        ).toBe(false);
      });
    });
  });
});
