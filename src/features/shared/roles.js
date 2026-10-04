/**
 * roles.js
 * Centralized operational role definitions, legacy role alias normalization,
 * and role-category helpers for MyLiberties Portal.
 */

export const CANONICAL_ROLES = {
  DIRECTOR: "director",
  VICE_DIRECTOR: "vice_director",
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
 * - "vicedirector", "vice-director", "vice_dir" -> "vice_director"
 * - "ops_lead", "frontofficelead", "front_office_lead" -> "opslead"
 * - "instructor_leader", "head_instructor" -> "instructorleader"
 * - "branch_manager" -> "manager"
 * - "front_office" -> "frontoffice"
 */
export const LEGACY_ROLE_ALIASES = {
  vicedirector: "vice_director",
  "vice-director": "vice_director",
  vice_dir: "vice_director",
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
 * Checks whether a role represents the executive Director.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isDirectorRole(role) {
  return normalizeRole(role) === CANONICAL_ROLES.DIRECTOR;
}

/**
 * Checks whether a role represents the executive Vice Director.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isViceDirectorRole(role) {
  return normalizeRole(role) === CANONICAL_ROLES.VICE_DIRECTOR;
}

/**
 * Checks whether a role belongs to executive leadership (Director, Vice Director, or Admin).
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isExecutiveRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === CANONICAL_ROLES.DIRECTOR ||
    normalized === CANONICAL_ROLES.VICE_DIRECTOR ||
    normalized === CANONICAL_ROLES.ADMIN
  );
}

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

/**
 * List of all operational staff roles.
 */
export const STAFF_ROLES = [
  CANONICAL_ROLES.DIRECTOR,
  CANONICAL_ROLES.VICE_DIRECTOR,
  CANONICAL_ROLES.ADMIN,
  CANONICAL_ROLES.MANAGER,
  CANONICAL_ROLES.INSTRUCTOR,
  CANONICAL_ROLES.INSTRUCTOR_LEADER,
  CANONICAL_ROLES.FRONT_OFFICE,
  CANONICAL_ROLES.OPS_LEAD,
  CANONICAL_ROLES.MARKETING,
  CANONICAL_ROLES.OFFICE_BOY,
];

/**
 * Checks whether a role represents a staff member or administrator.
 * Strictly returns false for parents and students.
 *
 * @param {string | any} role
 * @returns {boolean}
 */
export function isStaffRole(role) {
  const normalized = normalizeRole(role);
  return STAFF_ROLES.includes(normalized);
}

