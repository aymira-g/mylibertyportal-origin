import { branchToId, isLeanSatelliteBranch } from "../../constants/branches";
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

import {
  APPROVAL_ROLES,
  APPROVAL_MODES,
  APPROVAL_STATUS,
  CONTROL_LEVELS,
  SCOPE_LEVELS,
  RISK_MODIFIERS,
  GATED_ACTIONS,
} from "./approvalGates.constants";

export {
  APPROVAL_ROLES,
  APPROVAL_MODES,
  APPROVAL_STATUS,
  CONTROL_LEVELS,
  SCOPE_LEVELS,
  RISK_MODIFIERS,
  GATED_ACTIONS,
};

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
 * @param {string | { branchId?: string, branch?: string }} [options={}] - Branch ID or options object
 * @returns {string|null} Approver role key or null if exempt/unsupported
 */
export function getSelfCorrectionApprover(requesterRole, options = {}) {
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

  // Extract branchId from options (supports string branchId or object { branchId })
  const rawBranch = typeof options === "string" ? options : options?.branchId || options?.branch;
  if (rawBranch && isLeanSatelliteBranch(rawBranch)) {
    // Lean Satellite campuses lack an Ops Lead; Course Division Manager supervises on-site staff
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }

  if (normalized === "opslead" || normalized === "frontoffice") {
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }
  // All other staff (instructor, marketing, officeboy, instructorleader) at Main Campus
  return APPROVAL_ROLES.OPS_LEAD;
}

/**
 * Resolves the designated approver for cash discrepancy based on materiality tiers.
 * Owner Decision 2026-10-07 (§4.5):
 * - < Rp 20.000: Operational Leader (Ops Lead).
 *   Exception: If Ops Lead handled the cash drawer, escalates to Vice Director.
 * - From Rp 20.000 (inclusive) up to 49.999: Vice Director.
 * - From Rp 50.000 (inclusive): Director.
 * Blueprint v3.3 §26 (G-009) & Owner Decision 2026-10-13 (OD-4):
 * - >= Rp 50.000 -> Director (or Vice Director if Director on approved leave)
 * - Rp 20.000 up to Rp 49.999 -> Vice Director
 * - < Rp 20.000:
 *   - Main Campus (Kota Gorontalo): Ops Lead (escalates to Vice Director if Ops Lead handled drawer or vacant)
 *   - Lean Satellites (Bone Bolango, Limboto, Pohuwato per G-012): Course Division Manager (escalates to Vice Director if Manager handled drawer)
 *   Exception: If Director is on approved leave, Vice Director acts as Acting Director.
 * Shortage and surplus both count by absolute size.
 *
 * @param {{ amount?: number|string, drawerHandlerUid?: string|null, drawerHandlerRole?: string, opsLeadUid?: string|null, isDirectorOnLeave?: boolean, branchId?: string|null, managerUid?: string|null }} [params]
 * @returns {string} Approver role from APPROVAL_ROLES
 */
export function getCashDiscrepancyApprover({
  amount = 0,
  drawerHandlerUid = null,
  drawerHandlerRole = "",
  opsLeadUid = null,
  isDirectorOnLeave = false,
  branchId = null,
  managerUid = null,
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

  const normRole = normalizeRole(drawerHandlerRole);

  // < Rp 20.000 tier:
  // Lean satellite branches (Bone Bolango, Limboto, Pohuwato per Blueprint v3.4 G-012 & OD-4):
  // Course Division Manager approves on-site daily operations.
  // If the Course Division Manager is the drawer handler, escalate to Vice Director.
  if (branchId && isLeanSatelliteBranch(branchId)) {
    if (normRole === "manager" || (drawerHandlerUid && managerUid && drawerHandlerUid === managerUid)) {
      return APPROVAL_ROLES.VICE_DIRECTOR;
    }
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }

  // Main Campus (Kota Gorontalo):
  // If Ops Lead handled the drawer themselves, they cannot approve it -> escalate to Vice Director
  if (
    normRole === "opslead" ||
    normRole === "ops_lead" ||
    normRole === "frontofficelead" ||
    (drawerHandlerUid && opsLeadUid && drawerHandlerUid === opsLeadUid)
  ) {
    return APPROVAL_ROLES.VICE_DIRECTOR;
  }

  return APPROVAL_ROLES.OPS_LEAD;
}

/**
 * Resolves the designated approver for student class transfers.
 * Owner Decision 2026-10-13 (Two-step Dual-Control Transfer Workflow & G-012):
 * - Main Campus (Kota Gorontalo): Operational Leader (opslead) checks.
 * - Satellite Campuses (Bone Bolango, Limboto, Pohuwato): Course Division Manager (manager) checks.
 * - Maker Conflict / Absence: If requester is the checker (or checker absent), escalates to Vice Director (vice_director).
 *
 * @param {{ branchId?: string|null, requesterRole?: string, requesterUid?: string|null, checkerUid?: string|null }} [params]
 * @returns {string} Approver role
 */
export function getStudentTransferApprover({
  branchId = null,
  requesterRole = "",
  requesterUid = null,
  checkerUid = null,
} = {}) {
  const normRole = normalizeRole(requesterRole);

  // Satellite branch: Course Division Manager (manager)
  if (branchId && isLeanSatelliteBranch(branchId)) {
    // If the requester is the manager, escalate to Vice Director
    if (normRole === "manager" || (requesterUid && checkerUid && requesterUid === checkerUid)) {
      return APPROVAL_ROLES.VICE_DIRECTOR;
    }
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }

  // Main branch (Kota Gorontalo): Ops Lead (opslead)
  // If the requester is the opslead, escalate to Vice Director
  if (normRole === "opslead" || (requesterUid && checkerUid && requesterUid === checkerUid)) {
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
 * @param {{ subjectRole?: string, subjectUid?: string|null, makerUid?: string|null, isDirectorOnLeave?: boolean, isViceDirectorOnLeave?: boolean, branchId?: string|null }} [params]
 * @returns {string} Approver role
 */
export function getStaffStatusApprover({
  subjectRole = "",
  subjectUid = null,
  makerUid = null,
  isDirectorOnLeave = false,
  isViceDirectorOnLeave = false,
  branchId = null,
} = {}) {
  // Separation of duties check: Maker can NEVER be the subject of leave/status request
  if (makerUid && subjectUid && makerUid === subjectUid) {
    throw new Error("Front Office staff cannot submit status/leave changes for themselves.");
  }

  const normalized = normalizeRole(subjectRole);

  // Subordinate to domain superior:
  if (normalized === "frontoffice" || normalized === "officeboy") {
    // Under G-012, lean satellite branches have no Ops Lead;
    // Front Office and facility operations route to Course Division Manager
    if (branchId && isLeanSatelliteBranch(branchId)) {
      return APPROVAL_ROLES.DIVISION_MANAGER;
    }
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

  const requestedAt = new Date().toISOString();
  const requestedBy = requester.name || requester.displayName || requester.email || "Staff";
  const rawBranch = requester.branchId || requester.branch || context.branchId || context.payload?.branchId || null;
  const approverBranchId = rawBranch ? branchToId(rawBranch) : null;

  let resolvedApproverRole = gate.approverRole;
  if (gate.id === "STAFF_SHIFT_SELF_CORRECTION") {
    resolvedApproverRole = getSelfCorrectionApprover(requester.role, { branchId: approverBranchId });
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
      drawerHandlerRole: requester.role,
      opsLeadUid: context.payload?.opsLeadUid,
      branchId: approverBranchId,
      managerUid: context.payload?.managerUid,
    });
  } else if (gate.id === "STAFF_STATUS_CHANGE" && context.payload?.subjectRole) {
    resolvedApproverRole = getStaffStatusApprover({
      subjectRole: context.payload.subjectRole,
      subjectUid: context.payload.subjectUid,
      makerUid: requester.uid,
      branchId: approverBranchId,
    });
  } else if (gate.id === "STUDENT_CLASS_TRANSFER") {
    resolvedApproverRole = getStudentTransferApprover({
      branchId: approverBranchId,
      requesterRole: requester.role,
      requesterUid: requester.uid,
      checkerUid: context.payload?.checkerUid,
    });
  } else if (gate.id === "PAYMENT_CORRECTION_OR_VOID") {
    // OD-1 §3: Director or Vice Director approves every payment correction or void regardless of amount.
    // Default queue routes to Vice Director with Director eligible as co-approver under dual-control rules.
    resolvedApproverRole = APPROVAL_ROLES.VICE_DIRECTOR;
  }
  const division =
    requester.division ||
    context.division ||
    context.payload?.division ||
    null;

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
    division,
    requestedBy,
    requestedByUid: requester.uid || null,
    requestedAt,
    decidedBy: null,
    decidedByUid: null,
    decidedAt: null,
    reason: context.reason || null,
    payload: context.payload || (Object.keys(context).some((k) => k !== "reason") ? { ...context } : null),
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
      return normalized === "opslead";
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
