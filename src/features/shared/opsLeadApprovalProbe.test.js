import { describe, it, expect } from "vitest";
import {
  canDecideApproval,
} from "./securityRulesMatrix/securityRulesMatrix.helpers.js";
import { canApproveGate, APPROVAL_ROLES } from "./approvalGates.js";

describe("Probe Test: Operational Leader vs Front Office Approver Authority Boundary", () => {
  // Real fixtures:
  // foGorontalo: { uid: "fo_gtlo", role: "frontoffice", branchId: "kota_gorontalo" }
  // opsLeadGorontalo: let's test a distinct Ops Lead profile vs plain Front Office
  const opsLeadGorontalo = {
    uid: "opslead_gtlo",
    role: "opslead",
    branchId: "kota_gorontalo",
    status: "active",
  };

  const otherCashierGorontalo = {
    uid: "fo_gtlo_peer",
    role: "frontoffice",
    branchId: "kota_gorontalo",
  };

  const cashierDeskRequest = {
    id: "appr_probe_1",
    actionId: "CLASS_CANCELLATION_OR_RESCHEDULE",
    approverRole: "ops_lead",
    approverBranchId: "kota_gorontalo",
    branchId: "kota_gorontalo",
    requestedByUid: "fo_gtlo",
    status: "pending",
  };

  describe("Backend Rules (firestore.rules simulation)", () => {
    it("CONFIRMS HARDENING: peer Front Office cashier is BLOCKED from deciding approvals targeted at ops_lead", () => {
      // Under tightened firestore.rules and simulator:
      // isApproverForDoc requires isOpsLead() for (targetRole in ['ops_lead', 'opslead'])
      // A plain frontoffice cashier (fo_gtlo_peer) is BLOCKED!
      const peerCashierDecisionAllowed = canDecideApproval(cashierDeskRequest, otherCashierGorontalo);
      const opsLeadDecisionAllowed = canDecideApproval(cashierDeskRequest, opsLeadGorontalo);

      expect(opsLeadDecisionAllowed).toBe(true);
      // Hardened: plain cashier is blocked at backend rules layer!
      expect(peerCashierDecisionAllowed).toBe(false);
    });

    it("ENFORCES MAKER-CHECKER: cashier cannot decide their own request even if rules treat role as eligible", () => {
      // If fo_gtlo created the request, they cannot decide it
      const selfDecision = canDecideApproval(cashierDeskRequest, {
        uid: "fo_gtlo",
        role: "opslead", // even if role elevated
        branchId: "kota_gorontalo",
      });
      expect(selfDecision).toBe(false);
    });

    it("ENFORCES BRANCH ISOLATION: Ops Lead of Bone Bolango cannot touch Gorontalo approvals", () => {
      const opsLeadBoneBolango = {
        uid: "opslead_boba",
        role: "opslead",
        branchId: "bone_bolango",
      };
      expect(canDecideApproval(cashierDeskRequest, opsLeadBoneBolango)).toBe(false);
    });
  });

  describe("Frontend Gate Check (canApproveGate)", () => {
    it("canApproveGate restricts opslead gates strictly to opslead (blocks plain frontoffice)", () => {
      // In approvalGates.js:
      // case APPROVAL_ROLES.OPS_LEAD: return normalized === "opslead"
      expect(canApproveGate("opslead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
      expect(canApproveGate("frontoffice", APPROVAL_ROLES.OPS_LEAD)).toBe(false);
    });
  });
});
