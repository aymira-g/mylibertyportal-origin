import { describe, it, expect } from "vitest";
import {
  GATED_ACTIONS,
  APPROVAL_ROLES,
  APPROVAL_MODES,
  APPROVAL_STATUS,
  CONTROL_LEVELS,
  SCOPE_LEVELS,
  RISK_MODIFIERS,
  createApprovalEnvelope,
  canApproveGate,
  isActionOperational,
  getSelfCorrectionApprover,
  getCashDiscrepancyApprover,
  getStaffStatusApprover,
  validateDelegation,
  evaluateActionRisk,
} from "./approvalGates";

describe("Maker-Checker Approval Gates", () => {
  it("defines all locked actions correctly with domains and modes", () => {
    // Executive escalated staff authority actions (Principle 1)
    expect(GATED_ACTIONS.STAFF_ROLE_ELEVATION.locked).toBe(true);
    expect(GATED_ACTIONS.STAFF_ROLE_ELEVATION.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);
    expect(GATED_ACTIONS.STAFF_ROLE_ELEVATION.mode).toBe(APPROVAL_MODES.BLOCKING);

    expect(GATED_ACTIONS.NEW_STAFF_ACCOUNT.locked).toBe(true);
    expect(GATED_ACTIONS.NEW_STAFF_ACCOUNT.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);
    expect(GATED_ACTIONS.NEW_STAFF_ACCOUNT.mode).toBe(APPROVAL_MODES.BLOCKING);

    expect(GATED_ACTIONS.STAFF_DEACTIVATION.locked).toBe(true);
    expect(GATED_ACTIONS.STAFF_DEACTIVATION.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);
    expect(GATED_ACTIONS.STAFF_DEACTIVATION.mode).toBe(APPROVAL_MODES.BLOCKING);

    // Executive pricing actions (Owner Decision G-009)
    expect(GATED_ACTIONS.DISCOUNT_OR_REFUND.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(GATED_ACTIONS.DISCOUNT_OR_REFUND.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);

    expect(GATED_ACTIONS.CASH_DISCREPANCY.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(GATED_ACTIONS.CASH_DISCREPANCY.approverRole).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    expect(GATED_ACTIONS.TUITION_PLAN_CHANGE.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(GATED_ACTIONS.TUITION_PLAN_CHANGE.approverRole).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    // Time-critical logged actions
    expect(GATED_ACTIONS.SUBSTITUTE_INSTRUCTOR.mode).toBe(APPROVAL_MODES.LOGGED);
    expect(GATED_ACTIONS.SUBSTITUTE_INSTRUCTOR.approverRole).toBe(APPROVAL_ROLES.INSTRUCTOR_LEADER);

    expect(GATED_ACTIONS.CLASS_CANCELLATION_OR_RESCHEDULE.mode).toBe(APPROVAL_MODES.LOGGED);
    expect(GATED_ACTIONS.CLASS_CANCELLATION_OR_RESCHEDULE.approverRole).toBe(APPROVAL_ROLES.OPS_LEAD);

    expect(GATED_ACTIONS.STUDENT_WITHDRAWAL_OR_FREEZE.mode).toBe(APPROVAL_MODES.LOGGED);
    expect(GATED_ACTIONS.STUDENT_WITHDRAWAL_OR_FREEZE.approverRole).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
  });

  it("evaluates self-correction ladder correctly (Principle 5)", () => {
    // 1. General staff -> Front Office / Ops Lead
    expect(getSelfCorrectionApprover("instructor")).toBe(APPROVAL_ROLES.OPS_LEAD);
    expect(getSelfCorrectionApprover("marketing")).toBe(APPROVAL_ROLES.OPS_LEAD);
    expect(getSelfCorrectionApprover("officeboy")).toBe(APPROVAL_ROLES.OPS_LEAD);
    expect(getSelfCorrectionApprover("instructor_leader")).toBe(APPROVAL_ROLES.OPS_LEAD);

    // 2. Front Office Lead's own record -> Branch Manager (covers opslead, ops_lead, frontofficelead)
    expect(getSelfCorrectionApprover("frontoffice")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
    expect(getSelfCorrectionApprover("opslead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
    expect(getSelfCorrectionApprover("ops_lead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
    expect(getSelfCorrectionApprover("frontofficelead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    // 3. Branch Manager's own record -> Director (Owner / Director tier)
    expect(getSelfCorrectionApprover("manager")).toBe(APPROVAL_ROLES.DIRECTOR);

    // 4. Executives -> Cross-review each other (Owner Decision 2026-10-07 §4.5); Admin is technical maintenance (null)
    expect(getSelfCorrectionApprover("admin")).toBeNull();
    expect(getSelfCorrectionApprover("director")).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
    expect(getSelfCorrectionApprover("vice_director")).toBe(APPROVAL_ROLES.DIRECTOR);
  });

  it("creates standard approval envelopes with branchId and self-correction resolution", () => {
    const envelope = createApprovalEnvelope(
      "DISCOUNT_OR_REFUND",
      { name: "Alice Frontdesk", uid: "u-123", role: "frontoffice", branchId: "branch_gorontalo_main" },
      { reason: "Family discount 10%" }
    );

    expect(envelope.status).toBe(APPROVAL_STATUS.PENDING);
    expect(envelope.mode).toBe(APPROVAL_MODES.BLOCKING);
    expect(envelope.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);
    expect(envelope.approverBranchId).toBe("branch_gorontalo_main");
    expect(envelope.requestedBy).toBe("Alice Frontdesk");
    expect(envelope.requestedByUid).toBe("u-123");
    expect(envelope.reason).toBe("Family discount 10%");
    expect(envelope.decidedBy).toBeNull();

    // Branch manager retains cash discrepancy escalation
    const cashEnv = createApprovalEnvelope("CASH_DISCREPANCY", {
      role: "frontoffice",
      branchId: "branch_gorontalo_main",
    });
    expect(cashEnv.approverRole).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    // Admin requester is NOT exempt from routine business actions (Blueprint §7 & Owner Decision 2026-10-07)
    const adminAction = createApprovalEnvelope("DISCOUNT_OR_REFUND", { role: "admin", name: "Admin" });
    expect(adminAction).not.toBeNull();
    expect(adminAction.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);

    // STAFF_ROLE_ELEVATION is strictly dual-controlled even when initiated by admin
    const adminElevation = createApprovalEnvelope("STAFF_ROLE_ELEVATION", { role: "admin", uid: "admin-1" });
    expect(adminElevation).not.toBeNull();
    expect(adminElevation.approverRole).toBe(APPROVAL_ROLES.DIRECTOR);

    // Self correction for Front Office Lead -> routes to Branch Manager
    const foSelfCorrection = createApprovalEnvelope(
      "STAFF_SHIFT_SELF_CORRECTION",
      { name: "Budi FO Lead", uid: "u-fo-1", role: "frontoffice", branchId: "branch_gorontalo_main" },
      { reason: "Forgot to clock in after lunch" }
    );
    expect(foSelfCorrection.approverRole).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    // Self correction for Instructor -> routes to Ops Lead
    const instructorSelfCorrection = createApprovalEnvelope(
      "STAFF_SHIFT_SELF_CORRECTION",
      { name: "Siti Teacher", uid: "u-inst-1", role: "instructor", branchId: "branch_gorontalo_main" }
    );
    expect(instructorSelfCorrection.approverRole).toBe(APPROVAL_ROLES.OPS_LEAD);
  });

  it("throws error when creating envelope for unknown action", () => {
    expect(() => createApprovalEnvelope("UNKNOWN_ACTION", { role: "staff" })).toThrow();
  });

  it("evaluates role authority correctly", () => {
    // Executive gates: Director and Vice Director approve; Admin does NOT inherit executive business authority
    expect(canApproveGate("director", APPROVAL_ROLES.DIRECTOR)).toBe(true);
    expect(canApproveGate("vice_director", APPROVAL_ROLES.DIRECTOR)).toBe(true);
    expect(canApproveGate("admin", APPROVAL_ROLES.DIRECTOR)).toBe(false);
    expect(canApproveGate("manager", APPROVAL_ROLES.DIRECTOR)).toBe(false);

    // Director and Vice Director can approve division gates (Interim rule §4.2)
    expect(canApproveGate("director", APPROVAL_ROLES.DIVISION_MANAGER)).toBe(true);
    expect(canApproveGate("vice_director", APPROVAL_ROLES.DIVISION_MANAGER)).toBe(true);
    // Domain gates are strictly peer-separated: Executives do not substitute for Ops Lead or Instructor Leader (F1)
    expect(canApproveGate("director", APPROVAL_ROLES.OPS_LEAD)).toBe(false);
    expect(canApproveGate("vice_director", APPROVAL_ROLES.OPS_LEAD)).toBe(false);
    expect(canApproveGate("director", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(false);
    expect(canApproveGate("vice_director", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(false);

    // System Admin is a technical maintenance role (Blueprint v3.1 §4 & §5.3):
    // Admin only satisfies technical ADMIN gates, NOT business approval gates
    expect(canApproveGate("admin", APPROVAL_ROLES.ADMIN)).toBe(true);
    expect(canApproveGate("admin", APPROVAL_ROLES.DIVISION_MANAGER)).toBe(false);
    expect(canApproveGate("admin", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(false);
    expect(canApproveGate("admin", APPROVAL_ROLES.OPS_LEAD)).toBe(false);

    // Evaluation with specific action IDs against eligibleApproverRoles
    expect(canApproveGate("admin", null, "DISCOUNT_OR_REFUND")).toBe(false);
    expect(canApproveGate("director", null, "DISCOUNT_OR_REFUND")).toBe(true);
    expect(canApproveGate("vice_director", null, "DISCOUNT_OR_REFUND")).toBe(true);
    expect(canApproveGate("manager", null, "CASH_DISCREPANCY")).toBe(true);
    expect(canApproveGate("admin", null, "CASH_DISCREPANCY")).toBe(false);

    // Domain actions route strictly to their domain leads (F1 parity)
    expect(canApproveGate("instructorleader", null, "PLACEMENT_LEVEL_OVERRIDE")).toBe(true);
    expect(canApproveGate("director", null, "PLACEMENT_LEVEL_OVERRIDE")).toBe(false);
    expect(canApproveGate("manager", null, "PLACEMENT_LEVEL_OVERRIDE")).toBe(false);
    expect(canApproveGate("opslead", null, "RETROACTIVE_STUDENT_ATTENDANCE")).toBe(true);
    expect(canApproveGate("director", null, "RETROACTIVE_STUDENT_ATTENDANCE")).toBe(false);
    expect(canApproveGate("manager", null, "RETROACTIVE_STUDENT_ATTENDANCE")).toBe(false);

    // Division manager cannot approve Director escalated actions, nor OpsLead (peers do not approve peers)
    expect(canApproveGate("manager", APPROVAL_ROLES.DIRECTOR)).toBe(false);
    expect(canApproveGate("manager", APPROVAL_ROLES.DIVISION_MANAGER)).toBe(true);
    expect(canApproveGate("manager", APPROVAL_ROLES.OPS_LEAD)).toBe(false);

    // Instructor Leader
    expect(canApproveGate("instructor", APPROVAL_ROLES.BRANCH_MANAGER)).toBe(false);
    expect(canApproveGate("instructor", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(false);
    expect(canApproveGate("head_instructor", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(true);
    expect(canApproveGate("instructor_leader", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(true);
    expect(canApproveGate("instructorleader", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(true);

    // Front office / Ops Lead (covers canonical opslead and legacy aliases ops_lead, frontofficelead)
    expect(canApproveGate("frontoffice", APPROVAL_ROLES.BRANCH_MANAGER)).toBe(false);
    expect(canApproveGate("frontoffice", APPROVAL_ROLES.OPS_LEAD)).toBe(false);
    expect(canApproveGate("opslead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
    expect(canApproveGate("ops_lead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
    expect(canApproveGate("frontofficelead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
    expect(canApproveGate("front_office_lead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
  });

  it("evaluates operational status according to blocking vs logged mode", () => {
    // Blocking action pending -> not operational
    const blockingPending = {
      mode: APPROVAL_MODES.BLOCKING,
      status: APPROVAL_STATUS.PENDING,
    };
    expect(isActionOperational(blockingPending)).toBe(false);

    // Blocking action approved -> operational
    const blockingApproved = {
      mode: APPROVAL_MODES.BLOCKING,
      status: APPROVAL_STATUS.APPROVED,
    };
    expect(isActionOperational(blockingApproved)).toBe(true);

    // Logged action pending -> operational immediately
    const loggedPending = {
      mode: APPROVAL_MODES.LOGGED,
      status: APPROVAL_STATUS.PENDING,
    };
    expect(isActionOperational(loggedPending)).toBe(true);

    // Logged action rejected -> still operational (rejection is informational, no auto-rollback)
    const loggedRejected = {
      mode: APPROVAL_MODES.LOGGED,
      status: APPROVAL_STATUS.REJECTED,
    };
    expect(isActionOperational(loggedRejected)).toBe(true);

    // Ungated
    expect(isActionOperational(null)).toBe(true);
  });

  it("verifies all gate schema fields match the control model (Phase 2)", () => {
    expect(SCOPE_LEVELS.BRANCH_LOCAL).toBe("branch-local");
    expect(SCOPE_LEVELS.ORGANIZATION_WIDE).toBe("organization-wide");

    Object.values(GATED_ACTIONS).forEach((gate) => {
      expect(gate.id).toBeDefined();
      expect(gate.label).toBeDefined();
      expect(gate.primaryController).toBeDefined();
      expect(gate.requiredDomain).toBeDefined();
      expect(gate.requiredScope).toBeDefined();
      expect(gate.controlLevel).toMatch(/^L[123]$/);
      expect(gate.separationRequired).toBe(true);
      expect(Array.isArray(gate.riskModifiers)).toBe(true);
    });

    // Check specific gate levels
    expect(GATED_ACTIONS.STAFF_ROLE_ELEVATION.controlLevel).toBe(CONTROL_LEVELS.L3);
    expect(GATED_ACTIONS.STAFF_DEACTIVATION.controlLevel).toBe(CONTROL_LEVELS.L3);
    expect(GATED_ACTIONS.NEW_STAFF_ACCOUNT.controlLevel).toBe(CONTROL_LEVELS.L2);
    expect(GATED_ACTIONS.DISCOUNT_OR_REFUND.controlLevel).toBe(CONTROL_LEVELS.L2);
    expect(GATED_ACTIONS.PLACEMENT_LEVEL_OVERRIDE.controlLevel).toBe(CONTROL_LEVELS.L1);
    expect(GATED_ACTIONS.SUBSTITUTE_INSTRUCTOR.controlLevel).toBe(CONTROL_LEVELS.L1);
    expect(GATED_ACTIONS.CLASS_CANCELLATION_OR_RESCHEDULE.controlLevel).toBe(CONTROL_LEVELS.L1);
    expect(GATED_ACTIONS.RETROACTIVE_STUDENT_ATTENDANCE.controlLevel).toBe(CONTROL_LEVELS.L1);
    expect(GATED_ACTIONS.STUDENT_CLASS_TRANSFER.controlLevel).toBe(CONTROL_LEVELS.L1);
  });

  describe("Cash Discrepancy Materiality Tiers (Owner Decision §4.5)", () => {
    it("routes < Rp 20.000 to Ops Lead", () => {
      expect(getCashDiscrepancyApprover({ amount: 15000 })).toBe(APPROVAL_ROLES.OPS_LEAD);
      expect(getCashDiscrepancyApprover({ amount: -19999 })).toBe(APPROVAL_ROLES.OPS_LEAD);
      expect(getCashDiscrepancyApprover({ amount: 0 })).toBe(APPROVAL_ROLES.OPS_LEAD);
    });

    it("escalates to Vice Director if Ops Lead handled the drawer themselves (< 20.000)", () => {
      expect(
        getCashDiscrepancyApprover({
          amount: 10000,
          drawerHandlerUid: "user_opslead_1",
          opsLeadUid: "user_opslead_1",
        })
      ).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
    });

    it("routes Rp 20.000 up to Rp 49.999 to Vice Director", () => {
      expect(getCashDiscrepancyApprover({ amount: 20000 })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
      expect(getCashDiscrepancyApprover({ amount: 49999 })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
      expect(getCashDiscrepancyApprover({ amount: -35000 })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
    });

    it("routes >= Rp 50.000 to Director (or Vice Director as Acting Director if Director on approved leave)", () => {
      expect(getCashDiscrepancyApprover({ amount: 50000 })).toBe(APPROVAL_ROLES.DIRECTOR);
      expect(getCashDiscrepancyApprover({ amount: 100000 })).toBe(APPROVAL_ROLES.DIRECTOR);
      expect(getCashDiscrepancyApprover({ amount: -50000 })).toBe(APPROVAL_ROLES.DIRECTOR);

      // Director on approved leave -> Vice Director Acting Director
      expect(
        getCashDiscrepancyApprover({
          amount: 75000,
          isDirectorOnLeave: true,
        })
      ).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
    });
  });

  describe("Staff Status & Leave Authorization Workflow (Owner Decision §4.5)", () => {
    it("routes subordinates to their respective domain superiors", () => {
      expect(getStaffStatusApprover({ subjectRole: "frontoffice" })).toBe(APPROVAL_ROLES.OPS_LEAD);
      expect(getStaffStatusApprover({ subjectRole: "officeboy" })).toBe(APPROVAL_ROLES.OPS_LEAD);
      expect(getStaffStatusApprover({ subjectRole: "instructor" })).toBe(APPROVAL_ROLES.INSTRUCTOR_LEADER);
      expect(getStaffStatusApprover({ subjectRole: "marketing" })).toBe(APPROVAL_ROLES.DIVISION_MANAGER);
    });

    it("routes branch leadership peers to Vice Director (Director if VD is away)", () => {
      expect(getStaffStatusApprover({ subjectRole: "opslead" })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
      expect(getStaffStatusApprover({ subjectRole: "instructorleader" })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
      expect(getStaffStatusApprover({ subjectRole: "manager" })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);

      // If Vice Director is away, routes to Director
      expect(
        getStaffStatusApprover({
          subjectRole: "opslead",
          isViceDirectorOnLeave: true,
        })
      ).toBe(APPROVAL_ROLES.DIRECTOR);
    });

    it("has executives review each other", () => {
      expect(getStaffStatusApprover({ subjectRole: "director" })).toBe(APPROVAL_ROLES.VICE_DIRECTOR);
      expect(getStaffStatusApprover({ subjectRole: "vice_director" })).toBe(APPROVAL_ROLES.DIRECTOR);
    });

    it("falls back to 4-peer leadership chain when both executives are away", () => {
      expect(
        getStaffStatusApprover({
          subjectRole: "director",
          isViceDirectorOnLeave: true,
        })
      ).toBe(APPROVAL_ROLES.DIVISION_MANAGER);
    });

    it("strictly blocks maker from submitting leave for themselves", () => {
      expect(() =>
        getStaffStatusApprover({
          subjectRole: "frontoffice",
          subjectUid: "fo_user_1",
          makerUid: "fo_user_1",
        })
      ).toThrow("Front Office staff cannot submit status/leave changes for themselves.");
    });
  });

  describe("Acting Director Delegation Validation (Blueprint §4.3 & §4.5)", () => {
    it("permits valid delegation while Director is on approved leave", () => {
      const result = validateDelegation({
        delegateUid: "vd_user_1",
        targetActionId: "DISCOUNT_OR_REFUND",
        isDirectorOnApprovedLeave: true,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects delegation if Director is not on approved leave", () => {
      const result = validateDelegation({
        delegateUid: "vd_user_1",
        targetActionId: "DISCOUNT_OR_REFUND",
        isDirectorOnApprovedLeave: false,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("only active during Director's approved leave");
    });

    it("strictly blocks delegation for staff role elevation or deactivation", () => {
      const result = validateDelegation({
        delegateUid: "vd_user_1",
        targetActionId: "STAFF_ROLE_ELEVATION",
        isDirectorOnApprovedLeave: true,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("excludes staff role elevation");
    });

    it("strictly blocks delegate from acting on their own record", () => {
      const result = validateDelegation({
        delegateUid: "vd_user_1",
        targetActionId: "DISCOUNT_OR_REFUND",
        targetUserId: "vd_user_1",
        isDirectorOnApprovedLeave: true,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cannot exercise authority on their own record");
    });

    it("strictly blocks delegate from acting as second signature if they already signed", () => {
      const result = validateDelegation({
        delegateUid: "vd_user_1",
        targetActionId: "NEW_STAFF_ACCOUNT",
        isDirectorOnApprovedLeave: true,
        previousSignerUids: ["vd_user_1"],
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cannot provide second signature after having already signed");
    });
  });

  describe("Contextual Risk Evaluation Framework (Phase 2)", () => {
    it("evaluates base control level and modifiers", () => {
      const risk = evaluateActionRisk("RETROACTIVE_STUDENT_ATTENDANCE");
      expect(risk.baseLevel).toBe(CONTROL_LEVELS.L1);
      expect(risk.effectiveLevel).toBe(CONTROL_LEVELS.L1);
      expect(risk.requiresEscalation).toBe(false);
    });

    it("escalates Level 1 action to Level 2 on cross-branch impact", () => {
      const risk = evaluateActionRisk("CLASS_CANCELLATION_OR_RESCHEDULE", { isCrossBranch: true });
      expect(risk.baseLevel).toBe(CONTROL_LEVELS.L1);
      expect(risk.effectiveLevel).toBe(CONTROL_LEVELS.L2);
      expect(risk.activeModifiers).toContain(RISK_MODIFIERS.CROSS_BRANCH);
      expect(risk.requiresEscalation).toBe(true);
    });

    it("escalates Level 1 action to Level 3 on high financial impact (>= 50.000)", () => {
      const risk = evaluateActionRisk("CASH_DISCREPANCY", { amount: 50000 });
      expect(risk.baseLevel).toBe(CONTROL_LEVELS.L1);
      expect(risk.effectiveLevel).toBe(CONTROL_LEVELS.L3);
      expect(risk.requiresEscalation).toBe(true);
    });
  });
});
