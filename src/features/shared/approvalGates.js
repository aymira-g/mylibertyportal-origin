import { branchToId } from "../../constants/branches";
import { normalizeRole } from "./roles";

/**
 * approvalGates.js
 * Central Maker-Checker Dual-Control Approval Registry & Control Architecture.
 *
 * Implements the Executive Dual-Control Model (Blueprint v3.3 & Owner Decisions 2026-10-07):
 * - Course Division Manager: Course-domain control
 * - Kindergarten Division Manager: Kindergarten-domain control
 * - Operational Leader (Ops Lead): Operations-domain control
 * - Instructor Leader: Academic-domain control
 * - Vice Director: Material, cross-functional, and multi-branch operational control
 * - Director: Strategic, major, and high-impact executive control
 *
 * Ground Formula:
 * Role + Capability + Scope + Workflow State + Approved Delegation = Authorized Action
 * Risk Profile → Control Level → Required Workflow → Authorized Checker/Signer
 */

export const APPROVAL_ROLES = {
  DIRECTOR: "director",
  VICE_DIRECTOR: "vice_director",
  ADMIN: "admin",
  DIVISION_MANAGER: "manager", // Canonical (Authoritative Blueprint v3.1 §5.4)
  BRANCH_MANAGER: "manager", // Deprecated alias retained for backward compatibility
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
      APPROVAL_ROLES.VICE_DIRECTOR,
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
      APPROVAL_ROLES.VICE_DIRECTOR,
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
    mode: APPROVAL_MODES.BLOCKING,
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
      "frontoffice",
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
      "frontoffice",
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
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    primaryController: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      "frontoffice",
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

/**
 * Resolves the designated approver for self-correction actions based on the requester's role.
 * Principle 5 & Owner Decision 2026-10-07 (§4.5):
 * - Staff (instructor, marketing, officeboy, instructorleader) -> ops_lead (Front Office Lead)
 * - Front Office / Ops Lead's own record -> manager (Division Manager)
 * - Division Manager's own record -> director (Owner / Director tier)
 * - Executives' own shift corrections: Director and Vice Director review each other's!
 * - System Admin -> null (Admin is technical maintenance without shifts, blocked from business actions)
 *
 * @param {string | any} requesterRole
 * @returns {string|null} Approver role key or null if exempt/unsupported
 */
export function getSelfCorrectionApprover(requesterRole) {
  const normalized = normalizeRole(requesterRole);
  if (!normalized || normalized === "admin") {
    return null;
  }
  if (normalized === "director") {
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }
  if (normalized === "vice_director") {
    return APPROVAL_ROLES.DIRECTOR;
  }
  if (normalized === "manager") {
    return APPROVAL_ROLES.DIRECTOR;
  }
  if (normalized === "opslead" || normalized === "frontoffice") {
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }
  // All other staff (instructor, marketing, officeboy, instructorleader)
  return APPROVAL_ROLES.OPS_LEAD;
}

/**
 * Resolves the designated approver for cash discrepancy based on materiality tiers.
 * Owner Decision 2026-10-07 (§4.5):
 * - < Rp 20.000: Operational Leader (Ops Lead).
 *   Exception: If Ops Lead handled the cash drawer, escalates to Vice Director.
 * - From Rp 20.000 (inclusive) up to 49.999: Vice Director.
 * - From Rp 50.000 (inclusive): Director.
 *   Exception: If Director is on approved leave, Vice Director acts as Acting Director.
 * Shortage and surplus both count by absolute size.
 *
 * @param {{ amount?: number|string, drawerHandlerUid?: string|null, opsLeadUid?: string|null, isDirectorOnLeave?: boolean }} [params]
 * @returns {string} Approver role from APPROVAL_ROLES
 */
export function getCashDiscrepancyApprover({
  amount = 0,
  drawerHandlerUid = null,
  opsLeadUid = null,
  isDirectorOnLeave = false,
} = {}) {
  const absAmount = Math.abs(Number(amount) || 0);

  if (absAmount >= 50000) {
    if (isDirectorOnLeave) {
      return APPROVAL_ROLES.VICE_DIRECTOR; // Acting Director per §4.5
    }
    return APPROVAL_ROLES.DIRECTOR;
  }

  if (absAmount >= 20000) {
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }

  // < Rp 20.000 tier:
  // If Ops Lead handled the drawer themselves, they cannot approve it -> escalate to Vice Director
  if (drawerHandlerUid && opsLeadUid && drawerHandlerUid === opsLeadUid) {
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }

  return APPROVAL_ROLES.OPS_LEAD;
}

/**
 * Resolves the designated approver for staff status changes (active, on leave, day off, etc.).
 * Owner Decision 2026-10-07 (§4.5):
 * - Maker is always Front Office, never the subject of the request.
 * - Front Office and Office Boy -> Operational Leader (opslead)
 * - Instructors -> Instructor Leader (instructorleader)
 * - Division marketing -> its Division Manager (manager)
 * - Operational Leader, Course Mgr, Kinder Mgr, Instructor Leader -> Vice Director first;
 *   Director if Vice Director is the subject.
 * - Director and Vice Director approve each other's.
 * - Both executives unavailable fallback order: Course Division Mgr -> Kinder Division Mgr -> Ops Lead -> Instructor Leader.
 *
 * @param {{ subjectRole?: string, subjectUid?: string|null, makerUid?: string|null, isDirectorOnLeave?: boolean, isViceDirectorOnLeave?: boolean }} [params]
 * @returns {string} Approver role
 */
export function getStaffStatusApprover({
  subjectRole = "",
  subjectUid = null,
  makerUid = null,
  isDirectorOnLeave = false,
  isViceDirectorOnLeave = false,
} = {}) {
  // Separation of duties check: Maker can NEVER be the subject of leave/status request
  if (makerUid && subjectUid && makerUid === subjectUid) {
    throw new Error("Front Office staff cannot submit status/leave changes for themselves.");
  }

  const normalized = normalizeRole(subjectRole);

  // Subordinate to domain superior:
  if (normalized === "frontoffice" || normalized === "officeboy") {
    return APPROVAL_ROLES.OPS_LEAD;
  }
  if (normalized === "instructor") {
    return APPROVAL_ROLES.INSTRUCTOR_LEADER;
  }
  if (normalized === "marketing") {
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }

  // Branch leadership peers (Ops Lead, Instructor Leader, Division Manager):
  // Escalates to executives: Vice Director first, Director if Vice Director is unavailable
  if (
    normalized === "opslead" ||
    normalized === "instructorleader" ||
    normalized === "manager"
  ) {
    if (isViceDirectorOnLeave) {
      return APPROVAL_ROLES.DIRECTOR;
    }
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }

  // Executives review each other:
  if (normalized === "director") {
    if (isViceDirectorOnLeave) {
      // Both executives away fallback: Course Mgr -> Kinder Mgr -> Ops Lead -> Instructor Leader
      return APPROVAL_ROLES.DIVISION_MANAGER;
    }
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }
  if (normalized === "vice_director") {
    if (isDirectorOnLeave) {
      // Both executives away fallback: Course Mgr -> Kinder Mgr -> Ops Lead -> Instructor Leader
      return APPROVAL_ROLES.DIVISION_MANAGER;
    }
    return APPROVAL_ROLES.DIRECTOR;
  }

  // Default fallback to Ops Lead
  return APPROVAL_ROLES.OPS_LEAD;
}

/**
 * Validates an explicit Acting Director delegation.
 * Blueprint v3.3 §4.3 & Owner Decision 2026-10-07 (§4.5):
 * - Active only while Director's leave status is approved.
 * - Never for the Vice Director's own requests.
 * - Never counts as second signature when Vice Director already signed.
 * - Excludes changes to executive authority and role elevation.
 *
 * @param {{ delegateUid?: string, targetActionId?: string, targetUserId?: string|null, isDirectorOnApprovedLeave?: boolean, previousSignerUids?: string[], delegationRecord?: any }} [params]
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateDelegation({
  delegateUid = "",
  targetActionId = "",
  targetUserId = null,
  isDirectorOnApprovedLeave = false,
  previousSignerUids = [],
  delegationRecord = null,
} = {}) {
  if (!delegateUid) {
    return { valid: false, reason: "Delegate UID is required." };
  }

  // Must have Director approved leave
  if (!isDirectorOnApprovedLeave) {
    return { valid: false, reason: "Acting Director delegation is only active during Director's approved leave." };
  }

  // Cannot self-promote or alter executive authority or staff role elevation
  if (targetActionId === "STAFF_ROLE_ELEVATION" || targetActionId === "STAFF_DEACTIVATION") {
    return { valid: false, reason: "Delegated authority excludes staff role elevation and executive authority modifications." };
  }

  // Cannot act on own requests
  if (targetUserId && targetUserId === delegateUid) {
    return { valid: false, reason: "Delegate cannot exercise authority on their own record." };
  }

  // Cannot act as second signer if already signed
  if (Array.isArray(previousSignerUids) && previousSignerUids.includes(delegateUid)) {
    return { valid: false, reason: "Delegate cannot provide second signature after having already signed." };
  }

  // If explicit delegation record is provided, verify scope and validity window
  if (delegationRecord) {
    const now = Date.now();
    if (delegationRecord.effectiveFrom && new Date(delegationRecord.effectiveFrom).getTime() > now) {
      return { valid: false, reason: "Delegation window is not yet active." };
    }
    if (delegationRecord.effectiveUntil && new Date(delegationRecord.effectiveUntil).getTime() < now) {
      return { valid: false, reason: "Delegation window has expired." };
    }
  }

  return { valid: true };
}

/**
 * Evaluates contextual risk and computes the effective control level for an action.
 *
 * @param {string} actionId
 * @param {any} [context]
 * @returns {any} Risk profile summary
 */
export function evaluateActionRisk(actionId, context = {}) {
  const gate = GATED_ACTIONS[actionId];
  if (!gate) {
    throw new Error(`Unknown gated action: "${actionId}"`);
  }

  const activeModifiers = [];
  let effectiveLevel = gate.controlLevel || CONTROL_LEVELS.L1;

  if (context.isCrossBranch || (context.branchCount && context.branchCount > 1)) {
    activeModifiers.push(RISK_MODIFIERS.CROSS_BRANCH);
    if (effectiveLevel === CONTROL_LEVELS.L1) {
      effectiveLevel = CONTROL_LEVELS.L2;
    }
  }

  if (context.amount && Math.abs(Number(context.amount)) >= 50000) {
    activeModifiers.push(RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT);
    if (effectiveLevel === CONTROL_LEVELS.L1) {
      effectiveLevel = CONTROL_LEVELS.L3;
    }
  } else if (context.amount && Math.abs(Number(context.amount)) >= 20000) {
    activeModifiers.push(RISK_MODIFIERS.HIGH_FINANCIAL_IMPACT);
    if (effectiveLevel === CONTROL_LEVELS.L1) {
      effectiveLevel = CONTROL_LEVELS.L2;
    }
  }

  if (context.isSelfSubject) {
    activeModifiers.push(RISK_MODIFIERS.CONFLICT_OF_INTEREST);
  }

  return {
    actionId: gate.id,
    baseLevel: gate.controlLevel,
    effectiveLevel,
    requiredDomain: gate.requiredDomain,
    primaryController: gate.primaryController,
    escalationTarget: gate.escalationTarget,
    activeModifiers,
    requiresEscalation: effectiveLevel !== gate.controlLevel,
    separationRequired: gate.separationRequired,
  };
}

/**
 * Creates a standard Maker-Checker approval envelope object.
 *
 * @param {string} actionId - Key from GATED_ACTIONS
 * @param {any} [requester] - { name?: string, uid?: string, role?: string, branchId?: string }
 * @param {any} [context] - Optional metadata or reason
 * @returns {any} Canonical approval envelope
 */
export function createApprovalEnvelope(actionId, requester = {}, context = {}) {
  const gate = GATED_ACTIONS[actionId];
  if (!gate) {
    throw new Error(`Unknown gated action: "${actionId}"`);
  }

  let resolvedApproverRole = gate.approverRole;
  if (gate.id === "STAFF_SHIFT_SELF_CORRECTION") {
    resolvedApproverRole = getSelfCorrectionApprover(requester.role);
    if (!resolvedApproverRole) {
      return null;
    }
  } else if (
    gate.id === "CASH_DISCREPANCY" &&
    (context.payload?.discrepancyAmount !== undefined ||
      context.payload?.discrepancy !== undefined ||
      context.amount !== undefined)
  ) {
    const discrepancyAmount =
      context.payload?.discrepancyAmount ??
      context.payload?.discrepancy ??
      context.amount;
    resolvedApproverRole = getCashDiscrepancyApprover({
      amount: discrepancyAmount,
      drawerHandlerUid: requester.uid,
      opsLeadUid: context.payload?.opsLeadUid,
    });
  } else if (gate.id === "STAFF_STATUS_CHANGE" && context.payload?.subjectRole) {
    resolvedApproverRole = getStaffStatusApprover({
      subjectRole: context.payload.subjectRole,
      subjectUid: context.payload.subjectUid,
      makerUid: requester.uid,
    });
  }

  const requestedAt = new Date().toISOString();
  const requestedBy = requester.name || requester.displayName || requester.email || "Staff";
  const rawBranch = requester.branchId || requester.branch || null;
  const approverBranchId = rawBranch ? branchToId(rawBranch) : null;

  return {
    actionId: gate.id,
    label: gate.label,
    domain: gate.domain,
    status: APPROVAL_STATUS.PENDING,
    mode: gate.mode,
    controlLevel: gate.controlLevel,
    primaryController: gate.primaryController,
    requiredDomain: gate.requiredDomain,
    requiredScope: gate.requiredScope,
    separationRequired: gate.separationRequired,
    approverRole: resolvedApproverRole,
    approverBranchId,
    requestedBy,
    requestedByUid: requester.uid || null,
    requestedAt,
    decidedBy: null,
    decidedByUid: null,
    decidedAt: null,
    reason: context.reason || null,
    payload: context.payload || null,
  };
}

/**
 * Evaluates whether a user's role satisfies the required approverRole or gated action.
 *
 * Governance (Authoritative Blueprint v3.1 §4 & §5.3, Principle 14):
 * System Admin is a technical maintenance role, not an organizational authority.
 * System Admin does NOT automatically inherit business approval authority over
 * refunds, discounts, class transfers, or staff attendance self-corrections.
 * System Admin only satisfies APPROVAL_ROLES.ADMIN gates.
 *
 * Role mapping:
 * - Admin satisfies APPROVAL_ROLES.ADMIN only.
 * - Director and Vice Director satisfy director and vice_director gates.
 * - Director and Vice Director satisfy division_manager gates (Interim rule §4.2).
 * - Division Manager satisfies division_manager gates only.
 * - Instructor Leader satisfies instructorleader gates only.
 * - Front Office / Operations Lead satisfies opslead gates only.
 *
 * @param {string} userRole
 * @param {string|{ id?: string }|any} approverRoleOrAction
 * @param {string} [actionId]
 * @returns {boolean}
 */
export function canApproveGate(userRole, approverRoleOrAction, actionId = null) {
  if (!userRole) return false;
  const normalized = normalizeRole(userRole);

  const actionObj =
    approverRoleOrAction && typeof approverRoleOrAction === "object"
      ? /** @type {any} */ (approverRoleOrAction)
      : null;

  // If an actionId or gated action object is provided, evaluate against eligibleApproverRoles
  const targetAction =
    (actionId && GATED_ACTIONS[actionId]) ||
    (typeof approverRoleOrAction === "string" && GATED_ACTIONS[approverRoleOrAction]) ||
    (actionObj?.id && GATED_ACTIONS[actionObj.id]);

  if (targetAction && Array.isArray(targetAction.eligibleApproverRoles)) {
    return targetAction.eligibleApproverRoles.includes(normalized);
  }

  const approverRole =
    typeof approverRoleOrAction === "string" ? approverRoleOrAction : null;
  if (!approverRole) return false;

  switch (approverRole) {
    case APPROVAL_ROLES.ADMIN:
    case "admin":
      return normalized === "admin";
    case APPROVAL_ROLES.DIRECTOR:
    case APPROVAL_ROLES.VICE_DIRECTOR:
    case "director":
    case "vice_director":
      return (
        normalized === "director" ||
        normalized === "vice_director"
      );
    case APPROVAL_ROLES.DIVISION_MANAGER:
    case APPROVAL_ROLES.BRANCH_MANAGER:
    case "manager":
      return (
        normalized === "director" ||
        normalized === "vice_director" ||
        normalized === "manager"
      );
    case APPROVAL_ROLES.INSTRUCTOR_LEADER:
    case "instructorleader":
    case "instructor_leader":
      return normalized === "instructorleader";
    case APPROVAL_ROLES.OPS_LEAD:
    case "opslead":
    case "ops_lead":
      return (
        normalized === "frontoffice" ||
        normalized === "opslead"
      );
    default:
      return false;
  }
}

/**
 * Checks if a record with an approval envelope is currently active/operational.
 * For "blocking" mode: only active if status === "approved".
 * For "logged" mode: active immediately regardless of status.
 *
 * @param {any} approvalEnvelope
 * @returns {boolean}
 */
export function isActionOperational(approvalEnvelope) {
  if (!approvalEnvelope) return true; // Ungated actions are always operational
  if (approvalEnvelope.mode === APPROVAL_MODES.LOGGED) return true;
  return approvalEnvelope.status === APPROVAL_STATUS.APPROVED;
}
