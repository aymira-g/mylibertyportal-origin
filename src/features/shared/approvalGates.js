import { branchToId } from "../../constants/branches";
import { normalizeRole } from "./roles";

/**
 * approvalGates.js
 * Central Maker-Checker Dual-Control Approval Registry.
 *
 * Provides a canonical allow-list of actions requiring oversight,
 * their designated approver role, and whether the action is "blocking"
 * or "logged" (immediate execution with async audit review).
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
 * Canonical registry of dual-control gated actions.
 * Locked entries are non-reassignable in config.
 */
export const GATED_ACTIONS = Object.freeze({
  // ── Executive Tier Gates (Owner / Director Tier — Staff Authority & Pricing Policy) ──
  STAFF_ROLE_ELEVATION: Object.freeze({
    id: "STAFF_ROLE_ELEVATION",
    label: "Staff Role / Permission Elevation",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    locked: true, // Non-reassignable in config
  }),
  NEW_STAFF_ACCOUNT: Object.freeze({
    id: "NEW_STAFF_ACCOUNT",
    label: "New Staff Account Creation",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    locked: true,
  }),
  STAFF_DEACTIVATION: Object.freeze({
    id: "STAFF_DEACTIVATION",
    label: "Staff Deactivation / Termination",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "staff",
    locked: true,
  }),
  DISCOUNT_OR_REFUND: Object.freeze({
    id: "DISCOUNT_OR_REFUND",
    label: "Discounts & Refunds",
    approverRole: APPROVAL_ROLES.DIRECTOR,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "finance",
    locked: true,
  }),

  // ── Division Manager Gates (Division Operations & Status Oversight) ──
  CASH_DISCREPANCY: Object.freeze({
    id: "CASH_DISCREPANCY",
    label: "Cash Discrepancy Escalation",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "finance",
  }),
  TUITION_PLAN_CHANGE: Object.freeze({
    id: "TUITION_PLAN_CHANGE",
    label: "Tuition Plan Modification (Create / Edit)",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "finance",
  }),
  STUDENT_WITHDRAWAL_OR_FREEZE: Object.freeze({
    id: "STUDENT_WITHDRAWAL_OR_FREEZE",
    label: "Student Withdrawal / Enrollment Freeze",
    approverRole: APPROVAL_ROLES.DIVISION_MANAGER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "students",
  }),

  // ── Instructor Leader Gates (Pedagogy & Coverage) ──
  PLACEMENT_LEVEL_OVERRIDE: Object.freeze({
    id: "PLACEMENT_LEVEL_OVERRIDE",
    label: "Placement Level Override",
    approverRole: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.INSTRUCTOR_LEADER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "students",
  }),
  SUBSTITUTE_INSTRUCTOR: Object.freeze({
    id: "SUBSTITUTE_INSTRUCTOR",
    label: "Substitute Instructor Assignment",
    approverRole: APPROVAL_ROLES.INSTRUCTOR_LEADER,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.INSTRUCTOR_LEADER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "staff",
  }),

  // ── Ops / Front Office Lead Gates (Scheduling & Operations) ──
  CLASS_CANCELLATION_OR_RESCHEDULE: Object.freeze({
    id: "CLASS_CANCELLATION_OR_RESCHEDULE",
    label: "Whole-Class Cancellation / Reschedule",
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.LOGGED,
    domain: "classes",
  }),
  RETROACTIVE_STUDENT_ATTENDANCE: Object.freeze({
    id: "RETROACTIVE_STUDENT_ATTENDANCE",
    label: "Retroactive Student Attendance Edit",
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "attendance",
  }),
  STUDENT_CLASS_TRANSFER: Object.freeze({
    id: "STUDENT_CLASS_TRANSFER",
    label: "Student Class / Batch Transfer",
    approverRole: APPROVAL_ROLES.OPS_LEAD,
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "classes",
  }),
  STAFF_SHIFT_SELF_CORRECTION: Object.freeze({
    id: "STAFF_SHIFT_SELF_CORRECTION",
    label: "Staff Shift / Clock-in Self-Correction",
    approverRole: "dynamic_hierarchy", // Evaluated via getSelfCorrectionApprover()
    eligibleApproverRoles: Object.freeze([
      APPROVAL_ROLES.OPS_LEAD,
      APPROVAL_ROLES.DIVISION_MANAGER,
      APPROVAL_ROLES.DIRECTOR,
      APPROVAL_ROLES.VICE_DIRECTOR,
    ]),
    mode: APPROVAL_MODES.BLOCKING,
    domain: "attendance",
  }),
});

/**
 * Resolves the designated approver for self-correction actions based on the requester's role.
 * Principle 5: staff < opslead < manager < director.
 *
 * Escalation ladder:
 * - General staff (instructor, marketing, officeboy, instructorleader) -> ops_lead (Front Office Lead)
 * - Front Office / Ops Lead's own record -> manager (Division Manager)
 * - Division Manager's own record -> director (Owner / Director tier)
 * - Executives (director, vice_director, admin) -> exempt (returns null)
 *
 * @param {string} requesterRole
 * @returns {string|null} Approver role key or null if exempt
 */
export function getSelfCorrectionApprover(requesterRole) {
  const normalized = normalizeRole(requesterRole);
  if (
    !normalized ||
    normalized === "admin" ||
    normalized === "director" ||
    normalized === "vice_director"
  ) {
    return null; // Executives are exempt
  }
  if (normalized === "manager") {
    return APPROVAL_ROLES.DIRECTOR;
  }
  if (normalized === "opslead" || normalized === "frontoffice") {
    return APPROVAL_ROLES.DIVISION_MANAGER;
  }
  // All other staff (instructor, marketing, officeboy, instructorleader, etc.)
  return APPROVAL_ROLES.OPS_LEAD;
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
  // Admin is exempt from routine operational gates, but STAFF_ROLE_ELEVATION is strictly dual-controlled
  if (requester.role === "admin" && actionId !== "STAFF_ROLE_ELEVATION") {
    return null;
  }

  const gate = GATED_ACTIONS[actionId];
  if (!gate) {
    throw new Error(`Unknown gated action: "${actionId}"`);
  }

  let resolvedApproverRole = gate.approverRole;
  if (gate.id === "STAFF_SHIFT_SELF_CORRECTION") {
    resolvedApproverRole = getSelfCorrectionApprover(requester.role);
    if (!resolvedApproverRole) {
      return null; // Exempt
    }
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
 * - Director and Vice Director satisfy all operational/business approval gates.
 * - Division Manager satisfies division_manager and ops_lead gates.
 * - Instructor Leader / Head Teacher satisfies instructorleader gates.
 * - Front Office / Operations Lead satisfies opslead gates.
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
      return (
        normalized === "director" ||
        normalized === "vice_director" ||
        normalized === "manager" ||
        normalized === "instructorleader"
      );
    case APPROVAL_ROLES.OPS_LEAD:
    case "opslead":
    case "ops_lead":
      return (
        normalized === "director" ||
        normalized === "vice_director" ||
        normalized === "manager" ||
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
 */
export function isActionOperational(approvalEnvelope) {
  if (!approvalEnvelope) return true; // Ungated actions are always operational
  if (approvalEnvelope.mode === APPROVAL_MODES.LOGGED) return true;
  return approvalEnvelope.status === APPROVAL_STATUS.APPROVED;
}
