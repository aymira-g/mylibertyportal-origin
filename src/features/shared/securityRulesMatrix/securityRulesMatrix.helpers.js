/**
 * Test-Only Security Rule Predicate Simulator
 *
 * NOTE: This is a pure-logic mathematical simulation of firestore.rules used
 * for fast unit-level authorization and regression tests. It is NOT production
 * code and is NOT a substitute for real Firestore emulator verification.
 * (Authoritative emulator suite: src/features/shared/firestoreRules.emulator.test.js)
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

export function isManager(user) {
  return Boolean(
    user && isActiveUser(user) && (user.role === "manager" || user.role === "branch_manager")
  );
}

export function isFrontOffice(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["frontoffice", "opslead", "ops_lead", "frontofficelead"].includes(user.role)
  );
}

export function isOpsLead(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["opslead", "ops_lead", "frontofficelead"].includes(user.role)
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
        "branch_manager",
        "instructor",
        "instructorleader",
        "instructor_leader",
        "marketing",
        "frontoffice",
        "opslead",
        "ops_lead",
        "frontofficelead",
        "officeboy",
      ].includes(user.role)
  );
}

export function isParent(user) {
  return Boolean(user && user.role === "parent");
}

export function isParentOf(studentId, user) {
  return (
    isParent(user) &&
    Array.isArray(user.childStudentIds) &&
    user.childStudentIds.includes(studentId)
  );
}

export function isSameBranch(data, user) {
  if (isExecutive(user)) return true;
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
  return (
    !(isManager(user) || isFrontOffice(user) || (user && user.role === "marketing")) ||
    userDivision(user) === "all" ||
    (userDivision(user) === "kindergarten"
      ? isSameDivisionStrict(data, user)
      : !("division" in data) || data.division !== "kindergarten")
  );
}

export function isDivisionAllowedForManager(data, user) {
  return isDivisionAllowedForBranchStaff(data, user);
}

export function canCreateUser(data, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
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
  if (isExecutive(user)) {
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
  if (
    (isFrontDeskStaff(user) || isManager(user)) &&
    existing.role === "student" &&
    incoming.role === "student" &&
    isSameBranch(existing, user) &&
    isSameBranch(incoming, user) &&
    isDivisionAllowedForBranchStaff(existing, user) &&
    isDivisionAllowedForBranchStaff(incoming, user)
  ) {
    return true;
  }
  return false;
}

export function canDeleteUser(existing, user) {
  if (!user) return false;
  if (isAdmin(user) && !["director", "vice_director", "admin"].includes(existing.role)) return true;
  if (
    isFrontDeskStaff(user) &&
    ["student", "parent"].includes(existing.role) &&
    isSameBranch(existing, user) &&
    (existing.role !== "student" || isDivisionAllowedForBranchStaff(existing, user))
  ) {
    return true;
  }
  return false;
}

export function canGetClass(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (isStaff(user) && isSameBranch(doc, user) && isDivisionAllowedForManager(doc, user)) return true;
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
  if (isExecutive(user)) return true;
  if (isStaff(user) && isSameBranchStrict(queryData, user) && isDivisionAllowedForManager(queryData, user))
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
  if (isExecutive(user)) return true;
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
  if (isExecutive(user)) return true;
  if (
    (isFrontOffice(user) || isManager(user) || user.role === "marketing") &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForManager(queryData, user)
  )
    return true;
  return false;
}

export function canGetProgressReport(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForManager(doc, user)
  )
    return true;
  if (doc.instructorId === user.uid) return true;
  if (isParentOf(doc.studentId, user)) return true;
  // Instructor Leader branch-scope academic monitoring (read-only, both divisions).
  if (isInstructorLeader(user) && isSameBranch(doc, user)) return true;
  return false;
}

export function canListProgressReports(queryData, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForManager(queryData, user)
  )
    return true;
  if (queryData.instructorId === user.uid) return true;
  if (
    isParent(user) &&
    Array.isArray(user.childStudentIds) &&
    user.childStudentIds.includes(queryData.studentId)
  )
    return true;
  // Instructor Leader branch-scope academic monitoring (read-only, both divisions).
  if (isInstructorLeader(user) && isSameBranchStrict(queryData, user)) return true;
  return false;
}

export function canGetUser(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (doc.uid === user.uid || doc.id === user.uid) return true;
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
    isStaff(user) &&
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
  if (isExecutive(user)) return true;
  if (
    isManager(user) &&
    isSameBranchStrict(queryData, user) &&
    (queryData.role === "parent" || isDivisionAllowedForBranchStaff(queryData, user))
  )
    return true;
  if (
    isStaff(user) &&
    ["student", "instructor", "instructorleader", "instructor_leader", "parent"].includes(queryData.role) &&
    isSameBranchStrict(queryData, user) &&
    (queryData.role === "parent" || isDivisionAllowedForBranchStaff(queryData, user))
  )
    return true;
  return false;
}

export function isApproverForDoc(data, user) {
  if (!user) return false;

  const targetRole = (data && data.approverRole) || "manager";
  let roleMatches = false;

  if (targetRole === "director" || targetRole === "vice_director") {
    roleMatches = isDirector(user) || isViceDirector(user);
  } else if (targetRole === "manager" && (isManager(user) || isDirector(user) || isViceDirector(user))) {
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

  const branchMatches =
    isDirector(user) ||
    isViceDirector(user) ||
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
    ["director", "vice_director"].includes(approvalDoc.approverRole)
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
  return false;
}

export function canGetAttendance(doc, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (isStaff(user) && isSameBranch(doc, user) && isDivisionAllowedForBranchStaff(doc, user)) return true;
  return false;
}

export function canListAttendance(queryData, user) {
  if (!user) return false;
  if (isExecutive(user)) return true;
  if (isStaff(user) && isSameBranchStrict(queryData, user) && isDivisionAllowedForBranchStaff(queryData, user)) return true;
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
  if (isManager(user) || isFrontOffice(user)) {
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
  if ((isManager(user) || isFrontOffice(user)) && isSameBranch(existing, user)) {
    if (incoming.audienceType !== "branch") return true;
    return incoming.audienceValue === userBranch(user);
  }
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
    approval.payload != null &&
    approval.payload.shiftId === shiftId
  );
}
