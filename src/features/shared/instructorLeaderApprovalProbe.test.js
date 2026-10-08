import { describe, it, expect } from "vitest";
import {
  GATE_APPROVER_ROLES,
  canDecideApproval,
  gateAllowsApprover,
} from "./securityRulesMatrix/securityRulesMatrix.helpers.js";
import { GATED_ACTIONS, canApproveGate } from "./approvalGates.js";
import { normalizeRole } from "./roles.js";

/**
 * Probe Test: Instructor Leader vs adjacent-gate approver authority.
 *
 * Companion to `opsLeadApprovalProbe.test.js`. The Operational Leader probe was written
 * after a Phase 0 audit found a peer-role hole; this probe covers the equivalent boundary
 * for the Instructor Leader, and pins the gate-binding hardening agreed on 2026-10-08.
 *
 * Backing evidence: `docs/audits/current/regression-log.md` (escalation record) and
 * `docs/reports/instructor-leader-dashboard/01-phase1-completion-report.md` §6.5.
 */
describe("Probe Test: Instructor Leader vs Adjacent-Gate Approver Authority Boundary", () => {
  const leaderGorontalo = {
    uid: "il_gtlo",
    role: "instructorleader",
    branchId: "kota_gorontalo",
  };

  const leaderLegacyGorontalo = {
    uid: "il_legacy",
    role: "instructor_leader",
    branchId: "kota_gorontalo",
  };

  const leaderBoneBolango = {
    uid: "il_boba",
    role: "instructorleader",
    branchId: "bone_bolango",
  };

  const ticket = (actionId, approverRole, over = {}) => ({
    id: `probe_${actionId}`,
    actionId,
    approverRole,
    approverBranchId: "kota_gorontalo",
    requestedByUid: "ins_gtlo",
    status: "pending",
    ...over,
  });

  describe("Backend Rules (firestore.rules simulation)", () => {
    it("BLOCKS the Instructor Leader from deciding gates the registry never assigned to them", () => {
      // Each of these was ALLOWED before the 2026-10-08 hardening, purely because the
      // envelope's approverRole named the Instructor Leader.
      expect(
        canDecideApproval(ticket("CASH_DISCREPANCY", "instructorleader"), leaderGorontalo)
      ).toBe(false);
      expect(
        canDecideApproval(
          ticket("RETROACTIVE_STUDENT_ATTENDANCE", "instructor_leader"),
          leaderGorontalo
        )
      ).toBe(false);
      expect(
        canDecideApproval(
          ticket("CLASS_CANCELLATION_OR_RESCHEDULE", "instructorleader"),
          leaderGorontalo
        )
      ).toBe(false);
      expect(
        canDecideApproval(ticket("DISCOUNT_OR_REFUND", "instructorleader"), leaderGorontalo)
      ).toBe(false);
      expect(
        canDecideApproval(ticket("TUITION_PLAN_CHANGE", "instructorleader"), leaderGorontalo)
      ).toBe(false);
      expect(
        canDecideApproval(ticket("STAFF_ROLE_ELEVATION", "instructorleader"), leaderGorontalo)
      ).toBe(false);
    });

    it("ALLOWS the Instructor Leader to decide exactly the two gates they own, in both spellings", () => {
      expect(
        canDecideApproval(ticket("PLACEMENT_LEVEL_OVERRIDE", "instructorleader"), leaderGorontalo)
      ).toBe(true);
      expect(
        canDecideApproval(
          ticket("PLACEMENT_LEVEL_OVERRIDE", "instructor_leader"),
          leaderLegacyGorontalo
        )
      ).toBe(true);
      expect(
        canDecideApproval(ticket("SUBSTITUTE_INSTRUCTOR", "instructorleader"), leaderGorontalo)
      ).toBe(true);
      expect(
        canDecideApproval(
          ticket("SUBSTITUTE_INSTRUCTOR", "instructor_leader"),
          leaderLegacyGorontalo
        )
      ).toBe(true);
    });

    it("ENFORCES BRANCH ISOLATION: an Instructor Leader in another branch cannot decide", () => {
      expect(
        canDecideApproval(ticket("PLACEMENT_LEVEL_OVERRIDE", "instructorleader"), leaderBoneBolango)
      ).toBe(false);
    });

    it("ENFORCES MAKER-CHECKER: the requester cannot decide their own request", () => {
      const own = ticket("PLACEMENT_LEVEL_OVERRIDE", "instructorleader", {
        requestedByUid: "il_gtlo",
      });
      expect(canDecideApproval(own, leaderGorontalo)).toBe(false);
    });

    it("FAILS CLOSED for an actionId that is not in the ratified registry", () => {
      expect(gateAllowsApprover("TOTALLY_MADE_UP", "instructorleader")).toBe(false);
      expect(
        canDecideApproval(ticket("TOTALLY_MADE_UP", "instructorleader"), leaderGorontalo)
      ).toBe(false);
    });
  });

  describe("Drift guard: the rules-side binding table IS the ratified registry", () => {
    it("covers exactly the registry's gates, with exactly the registry's eligible roles", () => {
      expect(Object.keys(GATE_APPROVER_ROLES).sort()).toEqual(Object.keys(GATED_ACTIONS).sort());

      Object.entries(GATED_ACTIONS).forEach(([actionId, gate]) => {
        const registryRoles = new Set(gate.eligibleApproverRoles.map(normalizeRole));
        const boundRoles = new Set((GATE_APPROVER_ROLES[actionId] || []).map(normalizeRole));
        // Same canonical role set: legacy alias spellings are the only permitted extras.
        expect(boundRoles).toEqual(registryRoles);
      });
    });
  });

  describe("Frontend Gate Check (canApproveGate)", () => {
    it("agrees with the backend binding table for every gate and the Instructor Leader role", () => {
      Object.keys(GATED_ACTIONS).forEach((actionId) => {
        const uiAllows = canApproveGate("instructorleader", actionId);
        const rulesAllow = (GATE_APPROVER_ROLES[actionId] || []).some(
          (role) => normalizeRole(role) === "instructorleader"
        );
        expect(uiAllows).toBe(rulesAllow);
      });
    });

    it("keeps the Instructor Leader out of financial and operational gates", () => {
      expect(canApproveGate("instructorleader", "CASH_DISCREPANCY")).toBe(false);
      expect(canApproveGate("instructorleader", "DISCOUNT_OR_REFUND")).toBe(false);
      expect(canApproveGate("instructorleader", "RETROACTIVE_STUDENT_ATTENDANCE")).toBe(false);
      expect(canApproveGate("instructorleader", "CLASS_CANCELLATION_OR_RESCHEDULE")).toBe(false);
      expect(canApproveGate("instructorleader", "STUDENT_CLASS_TRANSFER")).toBe(false);
      expect(canApproveGate("instructorleader", "STAFF_ROLE_ELEVATION")).toBe(false);
      expect(canApproveGate("instructorleader", "TUITION_PLAN_CHANGE")).toBe(false);
    });
  });
});
