/**
 * roles.js
 * Centralized operational role definitions, legacy role alias normalization,
 * and role-category helpers for MyLiberties Portal.
 */

export const CANONICAL_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  INSTRUCTOR: "instructor",
  INSTRUCTOR_LEADER: "instructorleader",
  FRONT_OFFICE: "frontoffice",
  OPS_LEAD: "opslead",
  MARKETING: "marketing",
  OFFICE_BOY: "officeboy",
  STUDENT: "student",
  PARENT: "parent",
};

/**
 * Legacy role aliases mapping to canonical operational roles.
 * Supports legacy Firestore documents and historical role representations:
 * - "ops_lead", "frontofficelead", "front_office_lead" -> "opslead"
 * - "instructor_leader", "head_instructor" -> "instructorleader"
 * - "branch_manager" -> "manager"
 * - "front_office" -> "frontoffice"
 */
export const LEGACY_ROLE_ALIASES = {
  ops_lead: "opslead",
  frontofficelead: "opslead",
  front_office_lead: "opslead",
  instructor_leader: "instructorleader",
  head_instructor: "instructorleader",
  branch_manager: "manager",
  front_office: "frontoffice",
};

/**
 * Normalizes any role string to its canonical operational role.
 * Maps legacy role aliases cleanly to canonical identifiers.
 *
 * @param {string | any} role - Raw role string from auth or Firestore document
 * @returns {string | any} Canonical role string, or original value if falsy/non-string
 */
export function normalizeRole(role) {
  if (!role || typeof role !== "string") return role;
  const trimmed = role.trim().toLowerCase();
  return LEGACY_ROLE_ALIASES[trimmed] || trimmed;
}

/**
 * Alias for normalizeRole for backward compatibility with devPresets.
 */
export const normalizeRoleAlias = normalizeRole;

/**
 * Checks whether a role belongs to Front Office staff or leadership.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isFrontOfficeRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === CANONICAL_ROLES.FRONT_OFFICE ||
    normalized === CANONICAL_ROLES.OPS_LEAD
  );
}

/**
 * Checks whether a role belongs to teaching staff or teaching leadership.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isInstructorRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === CANONICAL_ROLES.INSTRUCTOR ||
    normalized === CANONICAL_ROLES.INSTRUCTOR_LEADER
  );
}

/**
 * Checks whether a role represents branch or system management.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isManagerRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === CANONICAL_ROLES.MANAGER ||
    normalized === CANONICAL_ROLES.ADMIN
  );
}

/**
 * Checks whether a role represents an authenticated parent.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isParentRole(role) {
  return normalizeRole(role) === CANONICAL_ROLES.PARENT;
}

/**
 * Checks whether a role represents an enrolled student.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isStudentRole(role) {
  return normalizeRole(role) === CANONICAL_ROLES.STUDENT;
}

