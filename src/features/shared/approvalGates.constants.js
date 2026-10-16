/**
 * approvalGates.constants.js
 * Declarative constants and registry definitions for the Maker-Checker
 * Dual-Control Approval Architecture.
 */

export const APPROVAL_ROLES = {
  DIRECTOR: "director",
  VICE_DIRECTOR: "vice_director",
  DIVISION_MANAGER: "manager", // Canonical (Authoritative Blueprint v3.1 §5.4)
  INSTRUCTOR_LEADER: "instructorleader",
  OPS_LEAD: "opslead",
};

export const APPROVAL_MODES = {
  BLOCKING: "blocking",
  LOGGED: "logged",
};

export const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/**
 * Internal engineering control levels (proposed architectural vocabulary).
 * Internal engineering wording only; not ratified in canonical Blueprint.
 */
export const CONTROL_LEVELS = Object.freeze({
  L0: "L0", // Routine: Low-consequence, authorized role executes directly
  L1: "L1", // Domain-controlled: Bounded domain leader (Course Mgr, Kinder Mgr, Ops Lead, Instructor Leader)
  L2: "L2", // Material / Cross-functional: Operational executive coordination (Vice Director)
  L3: "L3", // Strategic / High-impact: Major irreversible, staff authority, or pricing policy (Director)
  L4: "L4", // Exceptional dual-sign: Reserved name, requires both executives when explicitly mandated
});

/**
 * Scope hierarchy classification.
 */
export const SCOPE_LEVELS = Object.freeze({
  RECORD_LOCAL: "record-local",
  DOMAIN_LOCAL: "domain-local",
  BRANCH_LOCAL: "branch-local",
  CROSS_FUNCTIONAL: "cross-functional",
  MULTI_BRANCH: "multi-branch",
  PROVINCE_WIDE: "province-wide",
  ORGANIZATION_WIDE: "organization-wide",
});

/**
 * Supported risk escalation modifier identifiers.
 * Enables risk evaluation without hardcoded numeric scores.
 */
export const RISK_MODIFIERS = Object.freeze({
  CROSS_BRANCH: "cross_branch",
  PROVINCE_WIDE: "province_wide",
  HIGH_FINANCIAL_IMPACT: "high_financial_impact",
  STAFF_AUTHORITY_IMPACT: "staff_authority_impact",
  PRIVILEGE_EXPANSION: "privilege_expansion",
  SENSITIVE_PERSONAL_DATA: "sensitive_personal_data",
  HARD_TO_REVERSE: "hard_to_reverse",
  POLICY_EXCEPTION: "policy_exception",
  STRATEGIC_IMPACT: "strategic_impact",
  EXTERNAL_REPUTATIONAL_RISK: "external_reputational_risk",
  CONFLICT_OF_INTEREST: "conflict_of_interest",
  OUTSIDE_DELEGATED_SCOPE: "outside_delegated_scope",
  PAYROLL_IMPACT: "payroll_impact",
});

/**
 * Canonical registry of dual-control gated actions with full schema fields.
 * Seed values for primaryController represent today's approverRole (marked provisional).
 */
export const GATED_ACTIONS = Object.freeze({
  // ── Executive Tier Gates (Owner / Director Tier — Staff Authority & Pricing Policy) ──
  STAFF_ROLE_ELEVATION: Object.freeze({
    id: "STAFF_ROLE_ELEVATION",
    label: "Staff Role / Permission Elevation",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    primaryController: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    requiredDomain: "staff",
    requiredScope: SCOPE_LEVELS.ORGANIZATION_WIDE,
    controlLevel: CONTROL_LEVELS.L3,
    escalationTarget: null,
    delegationAllowed: false, // Explicitly excluded from Acting Director delegation (§4.3)
    separationRequired: true,
    locked: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.STAFF_AUTHORITY_IMPACT,
      RISK_MODIFIERS.PRIVILEGE_EXPANSION,
      RISK_MODIFIERS.HARD_TO_REVERSE,
    ]),
  }),
  NEW_STAFF_ACCOUNT: Object.freeze({
    id: "NEW_STAFF_ACCOUNT",
    label: "New Staff Account Creation",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    primaryController: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    requiredDomain: "staff",
    requiredScope: SCOPE_LEVELS.ORGANIZATION_WIDE,
    controlLevel: CONTROL_LEVELS.L2,
    escalationTarget: null,
    delegationAllowed: true,
    separationRequired: true,
    locked: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.STAFF_AUTHORITY_IMPACT,
      RISK_MODIFIERS.PRIVILEGE_EXPANSION,
    ]),
  }),
  STAFF_DEACTIVATION: Object.freeze({
    id: "STAFF_DEACTIVATION",
    label: "Staff Deactivation / Termination",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    primaryController: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    requiredDomain: "staff",
    requiredScope: SCOPE_LEVELS.ORGANIZATION_WIDE,
    controlLevel: CONTROL_LEVELS.L3,
    escalationTarget: null,
    delegationAllowed: false,
    separationRequired: true,
    locked: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.STAFF_AUTHORITY_IMPACT,
      RISK_MODIFIERS.HARD_TO_REVERSE,
      RISK_MODIFIERS.STRATEGIC_IMPACT,
    ]),
  }),
  DISCOUNT_OR_REFUND: Object.freeze({
    id: "DISCOUNT_OR_REFUND",
    label: "Discounts & Refunds",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    primaryController: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "finance",
    requiredDomain: "finance",
    requiredScope: SCOPE_LEVELS.ORGANIZATION_WIDE,
    controlLevel: CONTROL_LEVELS.L2,
    escalationTarget: null,
    delegationAllowed: true,
    separationRequired: true,
    locked: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT,
      RISK_MODIFIERS.POLICY_EXCEPTION,
    ]),
  }),
  PAYMENT_CORRECTION_OR_VOID: Object.freeze({
    id: "PAYMENT_CORRECTION_OR_VOID",
    label: "Payment Correction / Void Reversal",
    approverRole: APPROVAL_ROLES.VICE_DIRECTOR,
    primaryController: APPROVAL_ROLES.VICE_DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "finance",
    requiredDomain: "finance",
    requiredScope: SCOPE_LEVELS.ORGANIZATION_WIDE,
    controlLevel: CONTROL_LEVELS.L2,
    escalationTarget: APPROVAL_ROLES.DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    locked: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT,
      RISK_MODIFIERS.HARD_TO_REVERSE,
      RISK_MODIFIERS.POLICY_EXCEPTION,
    ]),
  }),

  // ── Division Manager Gates (Division Operations & Status Oversight) ──
  CASH_DISCREPANCY: Object.freeze({
    id: "CASH_DISCREPANCY",
    label: "Cash Discrepancy Escalation",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER, // Provisional seed; dynamically tier-resolved
    primaryController: APPROVAL_ROLES.OPS_LEAD, // Owner decision §4.5: Ops Lead (< Rp 20.000)
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.VICE_DIRECTOR,
      APPROVAL_ROLES.DIRECTOR,
    ]),
    // Owner decision 2026-10-09 (OD-IL-ENF4): relabelled from BLOCKING. Nothing in
    // firestore.rules consumes a CASH_DISCREPANCY envelope, so a "blocking" label
    // overstated the control. The real control is unchanged and lives in
    // shiftsRepository: the shift cannot close unless the ticket is successfully
    // submitted — but a merely *pending* ticket still lets it close, and by then the
    // cash has already been counted at the desk (same reasoning as DISCOUNT_OR_REFUND).
    mode: APPROVAL_MODES.LOGGED,
    domain: "finance",
    requiredDomain: "finance",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT,
      RISK_MODIFIERS.CONFLICT_OF_INTEREST,
    ]),
  }),
  TUITION_PLAN_CHANGE: Object.freeze({
    id: "TUITION_PLAN_CHANGE",
    label: "Tuition Plan Modification (Create / Edit)",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER,
    primaryController: APPROVAL_ROLES.DIVISION_MANAGER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "finance",
    requiredDomain: "finance",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT,
      RISK_MODIFIERS.POLICY_EXCEPTION,
    ]),
  }),
  STUDENT_WITHDRAWAL_OR_FREEZE: Object.freeze({
    id: "STUDENT_WITHDRAWAL_OR_FREEZE",
    label: "Student Withdrawal / Enrollment Freeze",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER,
    primaryController: APPROVAL_ROLES.DIVISION_MANAGER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "students",
    requiredDomain: "students",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.EXTERNAL_REPUTATIONAL_RISK,
    ]),
  }),

  // ── Instructor Leader Gates (Pedagogy & Coverage) ──
  PLACEMENT_LEVEL_OVERRIDE: Object.freeze({
    id: "PLACEMENT_LEVEL_OVERRIDE",
    label: "Placement Level Override",
    approverRole: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    primaryController: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.INSTRUCTOR_LEADER,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "students",
    requiredDomain: "students",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([]),
  }),
  SUBSTITUTE_INSTRUCTOR: Object.freeze({
    id: "SUBSTITUTE_INSTRUCTOR",
    label: "Substitute Instructor Assignment",
    approverRole: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    primaryController: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.INSTRUCTOR_LEADER,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "staff",
    requiredDomain: "staff",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([]),
  }),

  // ── Ops / Front Office Lead Gates (Scheduling & Operations) ──
  CLASS_CANCELLATION_OR_RESCHEDULE: Object.freeze({
    id: "CLASS_CANCELLATION_OR_RESCHEDULE",
    label: "Whole-Class Cancellation / Reschedule",
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    primaryController: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "classes",
    requiredDomain: "classes",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.CROSS_BRANCH,
    ]),
  }),
  RETROACTIVE_STUDENT_ATTENDANCE: Object.freeze({
    id: "RETROACTIVE_STUDENT_ATTENDANCE",
    label: "Retroactive Student Attendance Edit",
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    primaryController: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "attendance",
    requiredDomain: "attendance",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([]),
  }),
  STUDENT_CLASS_TRANSFER: Object.freeze({
    id: "STUDENT_CLASS_TRANSFER",
    label: "Student Class / Batch Transfer",
    approverRole: "dynamic_branch",
    primaryController: "dynamic_branch",
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.VICE_DIRECTOR,
      APPROVAL_ROLES.DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "classes",
    requiredDomain: "classes",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([]),
  }),
  STAFF_SHIFT_SELF_CORRECTION: Object.freeze({
    id: "STAFF_SHIFT_SELF_CORRECTION",
    label: "Staff Shift / Clock-in Self-Correction",
    approverRole: "dynamic_hierarchy",
    primaryController: "dynamic_hierarchy",
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "attendance",
    requiredDomain: "attendance",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.CONFLICT_OF_INTEREST,
      RISK_MODIFIERS.PAYROLL_IMPACT,
    ]),
  }),
  STAFF_STATUS_CHANGE: Object.freeze({
    id: "STAFF_STATUS_CHANGE",
    label: "Staff Status / Leave Authorization",
    approverRole: "dynamic_superior",
    primaryController: "dynamic_superior",
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.INSTRUCTOR_LEADER,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.VICE_DIRECTOR,
      APPROVAL_ROLES.DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    requiredDomain: "staff",
    requiredScope: SCOPE_LEVELS.BRANCH_LOCAL,
    controlLevel: CONTROL_LEVELS.L1,
    escalationTarget: APPROVAL_ROLES.VICE_DIRECTOR,
    delegationAllowed: true,
    separationRequired: true,
    riskModifiers: Object.freeze([
      RISK_MODIFIERS.STAFF_AUTHORITY_IMPACT,
      RISK_MODIFIERS.CONFLICT_OF_INTEREST,
    ]),
  }),
});
