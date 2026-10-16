/**
 * Test-Only Security Rule Predicate Simulator
 *
 * NOTE: This is a pure-logic mathematical simulation of firestore.rules used
 * for fast unit-level authorization and regression tests. It is NOT production
 * code and is NOT a substitute for real Firestore emulator verification.
 * (Authoritative emulator suite: src/features/shared/firestoreRulesEmulator/)
 */

export function isActiveUser(user) {
  if (!user) return false;
  return !("status" in user) || (user.status !== "resigned" && user.status !== "terminated");
}

export function userBranch(user) {
  if (!user) return "kota_gorontalo";
  if (user.branchId) return user.branchId;
  if (user.branch) {
    if (user.branch === "Bone Bolango") return "bone_bolango";
    if (user.branch === "Pohuwato") return "pohuwato";
    if (user.branch === "Limboto") return "limboto";
    return "kota_gorontalo";
  }
  return "kota_gorontalo";
}

export function isAdmin(user) {
  return Boolean(user && isActiveUser(user) && user.role === "admin");
}

export function isDirector(user) {
  return Boolean(user && isActiveUser(user) && user.role === "director");
}

export function isViceDirector(user) {
  return Boolean(user && isActiveUser(user) && user.role === "vice_director");
}

export function isExecutive(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["director", "vice_director", "admin"].includes(user.role)
  );
}

export function isOrgExecutive(user) {
  return isDirector(user) || isViceDirector(user);
}

export function isManager(user) {
  return Boolean(
    user && isActiveUser(user) && user.role === "manager"
  );
}

export function isFrontOffice(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["frontoffice", "opslead", "ops_lead", "operational_leader", "operationalleader", "frontofficelead"].includes(user.role)
  );
}

export function isOpsLead(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["opslead", "ops_lead", "operational_leader", "operationalleader", "frontofficelead"].includes(user.role)
  );
}

export function isFrontDeskStaff(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      user.role === "frontoffice"
  );
}

/**
 * Mirrors firestore.rules `isInstructorLeader()`.
 * Accepts the canonical role and the legacy alias. Grants READ authority only for
 * branch-scope academic monitoring collections (progressReports, classAttendance).
 */
export function isInstructorLeader(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["instructorleader", "instructor_leader"].includes(user.role)
  );
}

export function isStaff(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      [
        "director",
        "vice_director",
        "admin",
        "manager",
        "instructor",
        "instructorleader",
        "instructor_leader",
        "marketing",
        "frontoffice",
        "opslead",
        "ops_lead",
        "operational_leader",
        "operationalleader",
        "frontofficelead",
        "officeboy",
      ].includes(user.role)
  );
}

export function isNonFacilityStaff(user) {
  return Boolean(
    isStaff(user) &&
      user &&
      !("role" in user && ["officeboy", "cleaner"].includes(user.role))
  );
}

export function isParent(user) {
  return Boolean(
    user &&
      (!("status" in user) || user.status === "active") &&
      user.role === "parent"
  );
}

export function isParentOf(studentId, user) {
  return (
    isParent(user) &&
    Array.isArray(user.childStudentIds) &&
    user.childStudentIds.includes(studentId)
  );
}

export function isSameBranch(data, user) {
  if (isOrgExecutive(user)) return true;
  if (!user) return false;

  let docBranch = "kota_gorontalo";
  if (data && "branchId" in data && data.branchId) {
    docBranch = data.branchId;
  } else if (data && "branch" in data && data.branch) {
    if (data.branch === "Bone Bolango") docBranch = "bone_bolango";
    else if (data.branch === "Pohuwato") docBranch = "pohuwato";
    else if (data.branch === "Limboto") docBranch = "limboto";
    else docBranch = "kota_gorontalo";
  }

  return userBranch(user) === docBranch;
}

export function isSameBranchStrict(data, user) {
  if (!user) return false;
  const ub = userBranch(user);
  if (!ub) return false;
  if (data && "branchId" in data && data.branchId) {
    return ub === data.branchId;
  }
  if (data && "branch" in data && data.branch) {
    let docBranch = "kota_gorontalo";
    if (data.branch === "Bone Bolango") docBranch = "bone_bolango";
    else if (data.branch === "Pohuwato") docBranch = "pohuwato";
    else if (data.branch === "Limboto") docBranch = "limboto";
    return ub === docBranch;
  }
  return false;
}

export function userDivision(user) {
  return Boolean(user) && "division" in user ? user.division : null;
}

export function isSameDivisionStrict(data, user) {
  return data != null && "division" in data && data.division === userDivision(user);
}

export function isDivisionAllowedForBranchStaff(data, user) {
  const role = user && "role" in user ? user.role : "";
  const isStaffRole = isManager(user) || isFrontOffice(user) || role === "marketing";
  if (!isStaffRole) return true;

  if (role === "marketing") {
    return !data || !("division" in data) || data.division !== "kindergarten";
  }

  const uDiv = userDivision(user);
  if (uDiv === "all" && !isManager(user)) return true;
  if (uDiv === "kindergarten") {
    return isSameDivisionStrict(data, user);
  }
  return !data || !("division" in data) || data.division !== "kindergarten";
}

export function isDivisionAllowedForManager(data, user) {
  return isDivisionAllowedForBranchStaff(data, user);
}

export function isDivisionAllowedForProgressReportsList(data, user) {
  if (!data || !("division" in data)) return false;
  const uDiv = userDivision(user);
  if (uDiv === "kindergarten") {
    return data.division === "kindergarten";
  }
  if (uDiv === "courses") {
    return data.division === "courses";
  }
  return false;
}

export function isDivisionAllowedForProgressReportsGet(data, user) {
  if (!data) return false;
  const uDiv = userDivision(user);
  if (uDiv === "kindergarten") {
    return Boolean(data && "division" in data && data.division === "kindergarten");
  }
  if (uDiv === "courses") {
    return Boolean(!data || !("division" in data) || data.division === "courses");
  }
  return false;
}

export function isDivisionAllowedForProgressReportsWrite(data, user) {
  if (!data || !("division" in data)) return false;
  const uDiv = userDivision(user);
  if (uDiv === "kindergarten") {
    return data.division === "kindergarten";
  }
  if (uDiv === "courses") {
    return data.division === "courses";
  }
  return false;
}

export function canCreateUser(data, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isAdmin(user)) {
    return !("role" in data) || !["student", "parent"].includes(data.role);
  }
  if (
    isFrontOffice(user) &&
    ["student", "parent"].includes(data.role) &&
    isSameBranch(data, user) &&
    (data.role !== "student" || isDivisionAllowedForBranchStaff(data, user)) &&
    (data.role !== "parent" || !("childStudentIds" in data) || data.childStudentIds.length === 0)
  ) {
    return true;
  }
  return false;
}

export function canUpdateUser(existing, incoming, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) {
    if (
      ["director", "vice_director"].includes(existing.role) &&
      incoming.status &&
      ["resigned", "terminated"].includes(incoming.status) &&
      !isDirector(user) &&
      !isViceDirector(user)
    ) {
      return false;
    }
    return true;
  }
  if (isAdmin(user)) {
    // Admin cannot update student or parent accounts (Blueprint §7, DOM05-SEC-02)
    if (
      ["student", "parent"].includes(existing.role) ||
      ["student", "parent"].includes(incoming.role)
    ) {
      return false;
    }
    if (
      ["director", "vice_director"].includes(existing.role) &&
      incoming.status &&
      ["resigned", "terminated"].includes(incoming.status)
    ) {
      return false;
    }
    return true;
  }
  if (
    (isFrontDeskStaff(user) || isManager(user)) &&
    existing.role === "student" &&
    incoming.role === "student" &&
    isSameBranch(existing, user) &&
    isSameBranch(incoming, user) &&
    isDivisionAllowedForBranchStaff(existing, user) &&
    isDivisionAllowedForBranchStaff(incoming, user)
  ) {
    if (
      incoming.status &&
      ["inactive", "graduated", "archived"].includes(incoming.status) &&
      existing.status !== incoming.status
    ) {
      if (!isManager(user) && !incoming.appliedFromApproval) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function canDeleteUser(existing, user) {
  if (!user) return false;
  // Mirrors firestore.rules `match /users/{userId}` allow delete.
  // Record deletion is a technical maintenance operation reserved to Admin. Front Office holds NO
  // delete: withdrawing or freezing a student is the gated STUDENT_WITHDRAWAL_OR_FREEZE workflow and
  // must not be reachable by deleting the record instead.
  // The guard is a role-EXCLUSION list: director, vice_director and admin accounts are never
  // deletable. Staff role/status changes are governed separately by
  // STAFF_DEACTIVATION / STAFF_ROLE_ELEVATION.
  if (isAdmin(user) && !["director", "vice_director", "admin"].includes(existing.role)) {
    return true;
  }
  return false;
}

export function canGetClass(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isNonFacilityStaff(user) && isSameBranch(doc, user) && isDivisionAllowedForManager(doc, user)) return true;
  if (
    isStaff(user) &&
    (doc.instructorId === user.uid ||
      ("substituteInstructorId" in doc && doc.substituteInstructorId === user.uid))
  )
    return true;
  if (Array.isArray(doc.studentIds) && doc.studentIds.includes(user.uid)) return true;
  if (
    isParent(user) &&
    isSameBranch(doc, user) &&
    Array.isArray(user.childStudentIds) &&
    Array.isArray(doc.studentIds) &&
    doc.studentIds.some((id) => user.childStudentIds.includes(id))
  )
    return true;
  return false;
}

export function canListClasses(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isNonFacilityStaff(user) && isSameBranchStrict(queryData, user) && isDivisionAllowedForManager(queryData, user))
    return true;
  if (
    isStaff(user) &&
    (queryData.instructorId === user.uid ||
      ("substituteInstructorId" in queryData && queryData.substituteInstructorId === user.uid))
  )
    return true;
  if (Array.isArray(queryData.studentIds) && queryData.studentIds.includes(user.uid)) return true;
  if (
    isParent(user) &&
    isSameBranchStrict(queryData, user) &&
    Array.isArray(user.childStudentIds) &&
    Array.isArray(queryData.studentIds) &&
    queryData.studentIds.some((id) => user.childStudentIds.includes(id))
  )
    return true;
  return false;
}

export function canGetApplication(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isFrontOffice(user) || isManager(user) || user.role === "marketing") &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForManager(doc, user)
  )
    return true;
  return false;
}

export function canListApplications(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isFrontOffice(user) || isManager(user) || user.role === "marketing") &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForManager(queryData, user)
  )
    return true;
  return false;
}

export function canGetDeskInquiry(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user) || user.role === "marketing" || isInstructorLeader(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForManager(doc, user)
  )
    return true;
  if (isInstructorLeader(user) && userBranch(user) === "kota_gorontalo") return true;
  return false;
}

export function canListDeskInquiries(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user) || user.role === "marketing" || isInstructorLeader(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForManager(queryData, user)
  )
    return true;
  return false;
}

export function canUpdateDeskInquiry(beforeDoc, afterDoc, user) {
  if (!user) return false;
  const isSameBranchCheck =
    isSameBranch(beforeDoc, user) &&
    isSameBranch(afterDoc, user) &&
    isDivisionAllowedForManager(beforeDoc, user) &&
    isDivisionAllowedForManager(afterDoc, user);
  const isCentralInstructorLeader = isInstructorLeader(user) && userBranch(user) === "kota_gorontalo";

  const isAllowedActor =
    isOrgExecutive(user) ||
    ((isManager(user) || isFrontOffice(user) || user.role === "marketing" || isInstructorLeader(user)) && isSameBranchCheck) ||
    isCentralInstructorLeader;

  if (!isAllowedActor) return false;
  if ("branchId" in beforeDoc && afterDoc.branchId !== beforeDoc.branchId) return false;
  return true;
}

export function canGetProgressReport(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isManager(user) || isFrontDeskStaff(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForProgressReportsGet(doc, user)
  )
    return true;
  if (doc.instructorId === user.uid) return true;
  if (isParentOf(doc.studentId, user)) return true;
  // Instructor Leader province-wide academic monitoring (read-only per Blueprint v3.4 §4, §5, G-012).
  if (isInstructorLeader(user)) return true;
  return false;
}

export function canListProgressReports(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    (isManager(user) || isFrontDeskStaff(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForProgressReportsList(queryData, user)
  )
    return true;
  if (queryData.instructorId === user.uid) return true;
  if (
    isParent(user) &&
    Array.isArray(user.childStudentIds) &&
    user.childStudentIds.includes(queryData.studentId)
  )
    return true;
  // Instructor Leader province-wide academic monitoring (read-only per Blueprint v3.4 §4, §5, G-012).
  if (isInstructorLeader(user)) return true;
  return false;
}

export function canDeleteProgressReport(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isManager(user) && isSameBranch(doc, user) && isDivisionAllowedForProgressReportsWrite(doc, user)) return true;
  return false;
}

export function canUpdateProgressReport(beforeDoc, afterDoc, user, options = {}) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (
    isManager(user) &&
    isSameBranch(beforeDoc, user) &&
    isDivisionAllowedForProgressReportsWrite(beforeDoc, user) &&
    isDivisionAllowedForProgressReportsWrite(afterDoc, user)
  ) return true;
  if (
    isFrontDeskStaff(user) &&
    isSameBranch(beforeDoc, user) &&
    isDivisionAllowedForProgressReportsWrite(beforeDoc, user)
  ) {
    const keys = Object.keys(afterDoc).filter((k) => beforeDoc[k] !== afterDoc[k]);
    const allowedKeys = ["eligibleForPromotion", "promotedAt", "updatedAt"];
    const hasOnlyAllowed = keys.length > 0 && keys.every((k) => allowedKeys.includes(k));
    const modifiesEligibility = keys.includes("eligibleForPromotion");
    const transitionsFromTrueToFalse = beforeDoc.eligibleForPromotion === true && afterDoc.eligibleForPromotion === false;

    // Front Office updates must be part of an active student advancement batch (OD-FO-02 Option 1)
    const student = options.student || null;
    const isAdvancing = student &&
      student.id === beforeDoc.studentId &&
      options.isStudentAdvancing === true;

    return hasOnlyAllowed && modifiesEligibility && transitionsFromTrueToFalse && Boolean(isAdvancing);
  }
  return false;
}

export function canGetUser(doc, user) {
  if (!user) return false;
  if (doc.uid === user.uid || doc.id === user.uid) return true;
  if (isOrgExecutive(user)) return true;
  if (isAdmin(user)) {
    return !("role" in doc) || !["student", "parent"].includes(doc.role);
  }
  // Mirrors firestore.rules `/users/{userId}` allow get: the broad same-branch profile read is
  // scoped to division/operational leadership only. Plain `frontoffice` must NOT reach it, so it
  // cannot read peer staff, marketing, operational leadership, manager or executive profiles.
  if (
    (isManager(user) || isOpsLead(user)) &&
    isSameBranch(doc, user) &&
    (doc.role === "parent" || isDivisionAllowedForBranchStaff(doc, user))
  )
    return true;
  if (
    isNonFacilityStaff(user) &&
    ["student", "instructor", "instructorleader", "instructor_leader", "parent"].includes(doc.role) &&
    isSameBranch(doc, user) &&
    (doc.role === "parent" || isDivisionAllowedForBranchStaff(doc, user))
  )
    return true;
  // Branch-level operational staff are readable by Front Desk, division-exempt (like parents).
  if (isFrontDeskStaff(user) && ["officeboy", "cleaner"].includes(doc.role) && isSameBranch(doc, user)) {
    return true;
  }
  if (isParentOf(doc.id || doc.uid, user) && doc.role === "student") return true;
  return false;
}

export function canListUsers(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isAdmin(user)) {
    return !queryData || !("role" in queryData) || !["student", "parent"].includes(queryData.role);
  }
  if (
    isManager(user) &&
    isSameBranchStrict(queryData, user) &&
    (queryData.role === "parent" || isDivisionAllowedForBranchStaff(queryData, user))
  )
    return true;
  if (
    isNonFacilityStaff(user) &&
    ["student", "instructor", "instructorleader", "instructor_leader", "parent"].includes(queryData.role) &&
    isSameBranchStrict(queryData, user) &&
    (queryData.role === "parent" || isDivisionAllowedForBranchStaff(queryData, user))
  )
    return true;
  return false;
}

/**
 * Ratified gate registry binding: actionId -> permitted approverRole values.
 *
 * Mirrors `gateAllowsApprover` in `firestore.rules` and
 * `GATED_ACTIONS[*].eligibleApproverRoles` in `../approvalGates.js`
 * (ratified by Blueprint v3.3 §26, G-006 / G-007). Legacy alias spellings are accepted so
 * existing documents keep working; canonical values remain preferred.
 *
 * Fails closed: an actionId absent from this table permits no approver role.
 */
export const GATE_APPROVER_ROLES = Object.freeze({
  STAFF_ROLE_ELEVATION: ["director"],
  NEW_STAFF_ACCOUNT: ["director", "vice_director"],
  STAFF_DEACTIVATION: ["director"],
  DISCOUNT_OR_REFUND: ["director", "vice_director"],
  PAYMENT_CORRECTION_OR_VOID: ["director", "vice_director"],
  TUITION_PLAN_CHANGE: ["manager", "director", "vice_director"],
  STUDENT_WITHDRAWAL_OR_FREEZE: ["manager", "director", "vice_director"],
  CASH_DISCREPANCY: ["opslead", "ops_lead", "manager", "director", "vice_director"],
  PLACEMENT_LEVEL_OVERRIDE: ["instructorleader", "instructor_leader"],
  SUBSTITUTE_INSTRUCTOR: ["instructorleader", "instructor_leader"],
  CLASS_CANCELLATION_OR_RESCHEDULE: ["opslead", "ops_lead"],
  RETROACTIVE_STUDENT_ATTENDANCE: ["opslead", "ops_lead"],
  STUDENT_CLASS_TRANSFER: [
    "opslead",
    "ops_lead",
    "manager",
    "director",
    "vice_director",
  ],
  STAFF_SHIFT_SELF_CORRECTION: [
    "opslead",
    "ops_lead",
    "manager",
    "director",
    "vice_director",
  ],
  STAFF_STATUS_CHANGE: [
    "opslead",
    "ops_lead",
    "instructorleader",
    "instructor_leader",
    "manager",
    "director",
    "vice_director",
  ],
});

export function gateAllowsApprover(actionId, approverRole) {
  const allowed = GATE_APPROVER_ROLES[actionId];
  if (!allowed) return false;
  return allowed.includes(approverRole);
}

export function isApproverForDoc(data, user) {
  if (!user) return false;

  const targetRole = (data && data.approverRole) || "manager";
  let roleMatches = false;

  const isStrictDirectorGate =
    data && (data.actionId === "STAFF_ROLE_ELEVATION" || data.actionId === "STAFF_DEACTIVATION");

  if (isStrictDirectorGate) {
    roleMatches = isDirector(user);
  } else if (targetRole === "director" || targetRole === "vice_director") {
    roleMatches = isDirector(user) || isViceDirector(user);
  } else if (
    targetRole === "manager" &&
    ((isManager(user) && isDivisionAllowedForManager(data, user)) || isDirector(user) || isViceDirector(user))
  ) {
    roleMatches = true;
  } else if (
    (targetRole === "instructor_leader" || targetRole === "instructorleader") &&
    (user.role === "instructorleader" || user.role === "instructor_leader")
  ) {
    roleMatches = true;
  } else if (
    (targetRole === "ops_lead" || targetRole === "opslead") &&
    isOpsLead(user)
  ) {
    roleMatches = true;
  } else if (targetRole === "frontoffice" && isFrontOffice(user)) {
    roleMatches = true;
  }

  // Central Academic Lead (Instructor Leader at Kota Gorontalo) has province-wide pedagogical scope
  // over academic actions under ADR G-012. All other roles/actions route strictly by branch.
  const isCentralAcademicLead =
    (user.role === "instructorleader" || user.role === "instructor_leader") &&
    userBranch(user) === "kota_gorontalo" &&
    data &&
    "actionId" in data &&
    (data.actionId === "PLACEMENT_LEVEL_OVERRIDE" || data.actionId === "SUBSTITUTE_INSTRUCTOR");

  const branchMatches =
    isDirector(user) ||
    isViceDirector(user) ||
    isCentralAcademicLead ||
    (data && "approverBranchId" in data
      ? data.approverBranchId === userBranch(user)
      : isSameBranch(data, user));

  return roleMatches && branchMatches;
}

export function canDecideApproval(doc, user) {
  if (!user) return false;
  // Requester cannot approve their own request (Maker-Checker invariant)
  if (doc && doc.requestedByUid === user.uid) {
    return false;
  }
  // Target user cannot approve their own role elevation
  if (doc && doc.actionId === "STAFF_ROLE_ELEVATION" && doc.payload?.targetUserId === user.uid) {
    return false;
  }
  // The (actionId, approverRole) pair must be permitted by the ratified registry. Mirrors the
  // gateAllowsApprover condition on the `approvals` update rule in firestore.rules. It is
  // deliberately not inside isApproverForDoc, which also backs the read path.
  if (!doc || !("approverRole" in doc) || !gateAllowsApprover(doc.actionId, doc.approverRole)) {
    return false;
  }
  return isApproverForDoc(doc, user);
}

export function isApprovedRoleElevation(targetUserId, approvalDoc, targetRole) {
  if (!approvalDoc) return false;
  return (
    approvalDoc.actionId === "STAFF_ROLE_ELEVATION" &&
    approvalDoc.status === "approved" &&
    approvalDoc.applied !== true &&
    approvalDoc.payload != null &&
    approvalDoc.payload.targetUserId === targetUserId &&
    approvalDoc.payload.targetRole === targetRole &&
    approvalDoc.requestedByUid !== approvalDoc.decidedByUid &&
    approvalDoc.decidedByUid !== targetUserId &&
    "approverRole" in approvalDoc &&
    approvalDoc.approverRole === "director"
  );
}

export function isApprovedStaffDeactivation(targetUserId, approvalDoc) {
  if (!approvalDoc) return false;
  return (
    approvalDoc.actionId === "STAFF_DEACTIVATION" &&
    approvalDoc.status === "approved" &&
    approvalDoc.applied !== true &&
    approvalDoc.payload != null &&
    (approvalDoc.payload.targetUserId === targetUserId || approvalDoc.payload.uid === targetUserId) &&
    approvalDoc.requestedByUid !== approvalDoc.decidedByUid &&
    approvalDoc.decidedByUid !== targetUserId &&
    "approverRole" in approvalDoc &&
    approvalDoc.approverRole === "director"
  );
}

export function canGetPayment(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForBranchStaff(doc, user)
  )
    return true;
  return doc.studentId === user.uid;
}

export function canListPayments(queryData, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForBranchStaff(queryData, user)
  )
    return true;
  if (queryData?.studentId && queryData.studentId === (user.uid || user.id)) return true;
  if (
    user.role === "parent" &&
    isSameBranchStrict(queryData, user) &&
    Array.isArray(user.childStudentIds) &&
    queryData?.studentId &&
    user.childStudentIds.includes(queryData.studentId)
  )
    return true;
  return false;
}

export function isValidPaymentVoidApproval(approvalDoc) {
  if (!approvalDoc) return false;
  return (
    approvalDoc.status === "approved" &&
    approvalDoc.actionId === "PAYMENT_CORRECTION_OR_VOID"
  );
}

export function canCreatePayment(data, user, approvalDoc = null) {
  if (!user) return false;
  if (!data || typeof data.amount !== "number" || data.amount <= 0 || typeof data.studentId !== "string") {
    return false;
  }
  const isFrontOfficeCreate =
    isFrontDeskStaff(user) &&
    isSameBranch(data, user) &&
    isDivisionAllowedForBranchStaff(data, user);

  const isExecutiveReversal =
    isOrgExecutive(user) &&
    data.appliedFromApproval &&
    data.isReversal === true &&
    (approvalDoc ? isValidPaymentVoidApproval(approvalDoc) : Boolean(data.appliedFromApproval));

  return isFrontOfficeCreate || isExecutiveReversal;
}

export function canGetAttendance(doc, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isNonFacilityStaff(user) && !isAdmin(user) && isSameBranch(doc, user) && isDivisionAllowedForBranchStaff(doc, user)) return true;
  return false;
}

export function canListAttendance(queryData, user) {
  if (!user) return false;
  if (isOrgExecutive(user)) return true;
  if (isNonFacilityStaff(user) && !isAdmin(user) && isSameBranchStrict(queryData, user) && isDivisionAllowedForBranchStaff(queryData, user)) return true;
  return false;
}

export function canGetShift(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (doc.userId === user.uid) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForBranchStaff(doc, user)
  )
    return true;
  return false;
}

export function canListShifts(queryData, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (queryData.userId === user.uid) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForBranchStaff(queryData, user)
  )
    return true;
  return false;
}

export function canGetClassAttendance(doc, user, classDoc = null) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  const targetClass = classDoc || { branchId: doc.branchId, division: doc.division };
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(targetClass, user) &&
    isDivisionAllowedForBranchStaff(targetClass, user)
  )
    return true;
  if (
    (user.role === "instructor" || user.role === "instructorleader" || user.role === "instructor_leader") &&
    (targetClass.instructorId === user.uid || targetClass.substituteInstructorId === user.uid)
  )
    return true;
  // Instructor Leader branch-scope attendance monitoring (read-only, both divisions).
  // Branch-matched against the class document, mirroring the rules engine.
  if (isInstructorLeader(user) && isSameBranch(targetClass, user)) return true;
  if (doc.studentId === user.uid) return true;
  if (isParent(user) && Array.isArray(user.childStudentIds) && user.childStudentIds.includes(doc.studentId)) return true;
  return false;
}

export function canCreateCorporateEvent(event, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (isManager(user) || isOpsLead(user)) {
    if (event.audienceType !== "branch") return true;
    return (
      event.audienceValue === userBranch(user) ||
      (event.audienceValue === "Kota Gorontalo" && userBranch(user) === "kota_gorontalo") ||
      (event.audienceValue === "Bone Bolango" && userBranch(user) === "bone_bolango") ||
      (event.audienceValue === "Pohuwato" && userBranch(user) === "pohuwato") ||
      (event.audienceValue === "Limboto" && userBranch(user) === "limboto")
    );
  }
  return false;
}

export function canUpdateCorporateEvent(existing, incoming, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (isManager(user) && existing.audienceType === "all" && incoming.audienceType === "all") {
    return true;
  }
  if ((isManager(user) || isOpsLead(user)) && isSameBranch(existing, user)) {
    if (incoming.audienceType !== "branch") return true;
    return incoming.audienceValue === userBranch(user);
  }
  return false;
}

export function canDeleteCorporateEvent(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if ((isManager(user) || isOpsLead(user)) && doc.audienceType === "branch" && isSameBranch(doc, user)) return true;
  return false;
}

export const APPROVAL_DECISION_KEYS = [
  "status",
  "decidedBy",
  "decidedByUid",
  "decidedAt",
  "decisionNotes",
  "rejectionReason",
  "updatedAt",
];

export function canUpdateApproval(existing, incoming, user) {
  if (!user) return false;
  if (!canDecideApproval(existing, user)) return false;
  if (incoming.requestedByUid !== existing.requestedByUid) return false;
  if (existing.status === "approved" && incoming.status === "approved" && incoming.applied === true) {
    if (existing.applied === true) return false;
    if (incoming.appliedByUid !== user.uid) return false;
    const keys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
    return keys.every((k) => ["applied", "appliedAt", "appliedByUid", "updatedAt"].includes(k));
  }
  if (["approved", "rejected"].includes(incoming.status)) {
    if (existing.status !== "pending") return false;
    if (incoming.decidedByUid !== user.uid) return false;
    const keys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
    return keys.every((k) => APPROVAL_DECISION_KEYS.includes(k));
  }
  return false;
}

export function isApprovedShiftCorrection(approval, shiftId) {
  return (
    approval &&
    approval.actionId === "STAFF_SHIFT_SELF_CORRECTION" &&
    approval.status === "approved" &&
    (!("applied" in approval) || approval.applied !== true) &&
    // The approver must be a role the registry permits for this gate.
    "approverRole" in approval &&
    gateAllowsApprover(approval.actionId, approval.approverRole) &&
    approval.payload != null &&
    approval.payload.shiftId === shiftId
  );
}
