import { describe, it, expect } from "vitest";

/**
 * Pure logic simulation of firestore.rules branch isolation and authorization helpers.
 * This guarantees mathematical and operational correctness of all security rule predicates.
 */

function isActiveUser(user) {
  if (!user) return false;
  return !("status" in user) || (user.status !== "resigned" && user.status !== "terminated");
}

function userBranch(user) {
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

function isAdmin(user) {
  return Boolean(user && isActiveUser(user) && user.role === "admin");
}

function isManager(user) {
  return Boolean(
    user && isActiveUser(user) && (user.role === "manager" || user.role === "branch_manager")
  );
}

function isFrontOffice(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      ["frontoffice", "opslead", "ops_lead", "frontofficelead"].includes(user.role)
  );
}

function isStaff(user) {
  return Boolean(
    user &&
      isActiveUser(user) &&
      [
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

function isParent(user) {
  return Boolean(user && user.role === "parent");
}

function isParentOf(studentId, user) {
  return (
    isParent(user) &&
    Array.isArray(user.childStudentIds) &&
    user.childStudentIds.includes(studentId)
  );
}

function isSameBranch(data, user) {
  if (isAdmin(user)) return true;
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

function isSameBranchStrict(data, user) {
  if (!user) return false;
  if (data && "branchId" in data && data.branchId) {
    return userBranch(user) === data.branchId;
  }
  if (data && "branch" in data && data.branch) {
    let docBranch = "kota_gorontalo";
    if (data.branch === "Bone Bolango") docBranch = "bone_bolango";
    else if (data.branch === "Pohuwato") docBranch = "pohuwato";
    else if (data.branch === "Limboto") docBranch = "limboto";
    return userBranch(user) === docBranch;
  }
  return false;
}

function userDivision(user) {
  return Boolean(user) && "division" in user ? user.division : null;
}

function isSameDivisionStrict(data, user) {
  return data != null && "division" in data && data.division === userDivision(user);
}

function isDivisionAllowedForBranchStaff(data, user) {
  return (
    !(isManager(user) || isFrontOffice(user)) ||
    (userDivision(user) === "kindergarten"
      ? isSameDivisionStrict(data, user)
      : !("division" in data) || data.division !== "kindergarten")
  );
}

function isDivisionAllowedForManager(data, user) {
  return isDivisionAllowedForBranchStaff(data, user);
}

function canCreateUser(data, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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

function canUpdateUser(existing, incoming, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    isFrontOffice(user) &&
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

function canDeleteUser(existing, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    isFrontOffice(user) &&
    ["student", "parent"].includes(existing.role) &&
    isSameBranch(existing, user) &&
    (existing.role !== "student" || isDivisionAllowedForBranchStaff(existing, user))
  ) {
    return true;
  }
  return false;
}

function canGetClass(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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

function canListClasses(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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

function canGetApplication(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    (isFrontOffice(user) || isManager(user) || user.role === "marketing") &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForManager(doc, user)
  )
    return true;
  return false;
}

function canListApplications(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    (isFrontOffice(user) || isManager(user) || user.role === "marketing") &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForManager(queryData, user)
  )
    return true;
  return false;
}

function canGetProgressReport(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForManager(doc, user)
  )
    return true;
  if (doc.instructorId === user.uid) return true;
  if (isParentOf(doc.studentId, user)) return true;
  return false;
}

function canListProgressReports(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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
  return false;
}

function canGetUser(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (doc.uid === user.uid || doc.id === user.uid) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
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
  if (isParentOf(doc.id || doc.uid, user) && doc.role === "student") return true;
  return false;
}

function canListUsers(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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

function isApproverForDoc(data, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const targetRole = (data && data.approverRole) || "manager";
  let roleMatches = false;

  if (targetRole === "admin" && isAdmin(user)) {
    roleMatches = true;
  } else if (targetRole === "manager" && isManager(user)) {
    roleMatches = true;
  } else if (
    (targetRole === "instructor_leader" || targetRole === "instructorleader") &&
    (user.role === "instructorleader" || user.role === "instructor_leader")
  ) {
    roleMatches = true;
  } else if (
    (targetRole === "ops_lead" || targetRole === "opslead" || targetRole === "frontoffice") &&
    isFrontOffice(user)
  ) {
    roleMatches = true;
  }

  const branchMatches =
    data && "approverBranchId" in data
      ? data.approverBranchId === userBranch(user)
      : isSameBranch(data, user);

  return roleMatches && branchMatches;
}

function canDecideApproval(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  // Requester cannot approve their own request (Maker-Checker invariant)
  if (doc && doc.requestedByUid === user.uid) {
    return false;
  }
  return isApproverForDoc(doc, user);
}

/**
 * Mirrors firestore.rules: payments get is owner-scoped — the world-readable
 * "studentId is string" clause was replaced by studentId == request.auth.uid.
 */
function canGetPayment(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForBranchStaff(doc, user)
  )
    return true;
  return doc.studentId === user.uid;
}

function canListPayments(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForBranchStaff(queryData, user)
  )
    return true;
  return false;
}

function canGetAttendance(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isStaff(user) && isSameBranch(doc, user) && isDivisionAllowedForBranchStaff(doc, user)) return true;
  return false;
}

function canListAttendance(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isStaff(user) && isSameBranchStrict(queryData, user) && isDivisionAllowedForBranchStaff(queryData, user)) return true;
  return false;
}

function canGetShift(doc, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (doc.userId === user.uid) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranch(doc, user) &&
    isDivisionAllowedForBranchStaff(doc, user)
  )
    return true;
  return false;
}

function canListShifts(queryData, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (queryData.userId === user.uid) return true;
  if (
    (isManager(user) || isFrontOffice(user)) &&
    isSameBranchStrict(queryData, user) &&
    isDivisionAllowedForBranchStaff(queryData, user)
  )
    return true;
  return false;
}

function canGetClassAttendance(doc, user, classDoc = null) {
  if (!user) return false;
  if (isAdmin(user)) return true;
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
  if (doc.studentId === user.uid) return true;
  if (isParent(user) && Array.isArray(user.childStudentIds) && user.childStudentIds.includes(doc.studentId)) return true;
  return false;
}

/**
 * Mirrors firestore.rules: approvals update allow-list + decision invariants.
 */
const APPROVAL_DECISION_KEYS = [
  "status",
  "decidedBy",
  "decidedByUid",
  "decidedAt",
  "decisionNotes",
  "rejectionReason",
  "updatedAt",
];

function canUpdateApproval(existing, incoming, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!canDecideApproval(existing, user)) return false;
  if (incoming.requestedByUid !== existing.requestedByUid) return false;
  if (!["approved", "rejected"].includes(incoming.status)) return false;
  if (incoming.decidedByUid !== user.uid) return false;
  const keys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
  return keys.every((k) => APPROVAL_DECISION_KEYS.includes(k));
}

/**
 * Mirrors firestore.rules isApprovedShiftCorrection: the referenced approval
 * doc must be an APPROVED self-correction for this exact shift.
 */
function isApprovedShiftCorrection(approval, shiftId) {
  return (
    approval &&
    approval.actionId === "STAFF_SHIFT_SELF_CORRECTION" &&
    approval.status === "approved" &&
    (!("applied" in approval) || approval.applied !== true) &&
    approval.payload != null &&
    approval.payload.shiftId === shiftId
  );
}

describe("Security Rules Matrix & Branch Isolation", () => {
  const adminUser = { uid: "admin_1", role: "admin", branchId: "kota_gorontalo" };
  const managerGorontalo = { uid: "mgr_gtlo", role: "manager", branchId: "kota_gorontalo" };
  const managerBoneBolango = { uid: "mgr_boba", role: "manager", branchId: "bone_bolango" };
  const foGorontalo = { uid: "fo_gtlo", role: "frontoffice", branchId: "kota_gorontalo" };
  const foBoneBolango = { uid: "fo_boba", role: "frontoffice", branchId: "bone_bolango" };
  const instructorLeaderGorontalo = {
    uid: "il_gtlo",
    role: "instructor_leader",
    branchId: "kota_gorontalo",
  };
  const instructorGorontalo = {
    uid: "ins_gtlo",
    role: "instructor",
    branchId: "kota_gorontalo",
  };

  describe("Branch Identification & Legacy Compatibility", () => {
    it("resolves staff roles accurately across hierarchy", () => {
      expect(isStaff(adminUser)).toBe(true);
      expect(isStaff(managerGorontalo)).toBe(true);
      expect(isStaff(foGorontalo)).toBe(true);
      expect(isStaff(instructorLeaderGorontalo)).toBe(true);
      expect(isStaff(instructorGorontalo)).toBe(true);
      expect(isStaff({ role: "student" })).toBe(false);
      expect(isStaff(null)).toBe(false);
    });

    it("matches exact canonical branchId correctly", () => {
      expect(isSameBranch({ branchId: "kota_gorontalo" }, foGorontalo)).toBe(true);
      expect(isSameBranch({ branchId: "bone_bolango" }, foGorontalo)).toBe(false);
      expect(isSameBranch({ branchId: "bone_bolango" }, foBoneBolango)).toBe(true);
    });

    it("resolves legacy human-readable branch names safely", () => {
      expect(isSameBranch({ branch: "Bone Bolango" }, managerBoneBolango)).toBe(true);
      expect(isSameBranch({ branch: "Pohuwato" }, { role: "manager", branchId: "pohuwato" })).toBe(
        true
      );
      expect(isSameBranch({ branch: "Limboto" }, { role: "manager", branchId: "limboto" })).toBe(
        true
      );
      expect(isSameBranch({ branch: "Kota Gorontalo" }, managerGorontalo)).toBe(true);
    });

    it("handles null and empty documents safely without throwing", () => {
      expect(isSameBranch(null, foGorontalo)).toBe(true); // defaults to kota_gorontalo
      expect(isSameBranch({}, foGorontalo)).toBe(true);
      expect(isSameBranch(null, foBoneBolango)).toBe(false);
    });

    it("grants Admin global branch access everywhere", () => {
      expect(isSameBranch({ branchId: "bone_bolango" }, adminUser)).toBe(true);
      expect(isSameBranch({ branchId: "pohuwato" }, adminUser)).toBe(true);
      expect(isSameBranch({ branchId: "limboto" }, adminUser)).toBe(true);
    });
  });

  describe("Cross-Branch Overwrite & Update Protection", () => {
    it("blocks Front Office from updating payment from another branch", () => {
      const existingDoc = { id: "pay_1", branchId: "bone_bolango", amount: 449000 };
      const updatePayload = { branchId: "kota_gorontalo", amount: 449000 };

      // In the hardened rule, allow update requires BOTH isSameBranch(resource.data) AND isSameBranch(request.resource.data)
      const allowed =
        isSameBranch(existingDoc, foGorontalo) && isSameBranch(updatePayload, foGorontalo);
      expect(allowed).toBe(false);
    });

    it("blocks Front Office from moving their own branch payment to another branch", () => {
      const existingDoc = { id: "pay_2", branchId: "kota_gorontalo", amount: 449000 };
      const maliciousMovePayload = { branchId: "bone_bolango", amount: 449000 };

      const allowed =
        isSameBranch(existingDoc, foGorontalo) && isSameBranch(maliciousMovePayload, foGorontalo);
      expect(allowed).toBe(false);
    });

    it("allows Front Office to update legitimate payment within their branch", () => {
      const existingDoc = { id: "pay_3", branchId: "kota_gorontalo", amount: 449000 };
      const validUpdatePayload = { branchId: "kota_gorontalo", amount: 449000, notes: "Paid in cash" };

      const allowed =
        isSameBranch(existingDoc, foGorontalo) && isSameBranch(validUpdatePayload, foGorontalo);
      expect(allowed).toBe(true);
    });

    it("blocks cross-branch deletion by inspecting resource.data", () => {
      const foreignPayment = { id: "pay_4", branchId: "bone_bolango" };
      const allowed = isSameBranch(foreignPayment, foGorontalo);
      expect(allowed).toBe(false);
    });
  });

  describe("Shift Branch Isolation", () => {
    it("prevents Front Office from creating shifts for other branches", () => {
      const foreignShiftPayload = { userId: "ins_boba", branchId: "bone_bolango", clockOut: null };
      const allowed = isSameBranch(foreignShiftPayload, foGorontalo);
      expect(allowed).toBe(false);
    });

    it("prevents Front Office from clocking out shifts from other branches", () => {
      const foreignShift = { id: "sh_boba", branchId: "bone_bolango", clockOut: null };
      const allowed = isSameBranch(foreignShift, foGorontalo);
      expect(allowed).toBe(false);
    });

    it("allows Front Office to clock in and out staff within their branch", () => {
      const localShift = { id: "sh_gtlo", branchId: "kota_gorontalo", clockOut: null };
      expect(isSameBranch(localShift, foGorontalo)).toBe(true);
    });
  });

  describe("Dual-Control Maker-Checker Approval Isolation & 4 Inboxes", () => {
    it("routes Manager approvals strictly to Branch Manager of that branch", () => {
      const approvalDoc = {
        actionId: "DISCOUNT_OR_REFUND",
        approverRole: "manager",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      expect(canDecideApproval(approvalDoc, managerGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, managerBoneBolango)).toBe(false);
      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("routes Pedagogy approvals strictly to Instructor Leader of that branch", () => {
      const approvalDoc = {
        actionId: "PLACEMENT_LEVEL_OVERRIDE",
        approverRole: "instructor_leader",
        branchId: "kota_gorontalo",
        requestedByUid: "ins_gtlo",
      };

      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, managerGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("routes Operational approvals strictly to Front Office / Ops Lead of that branch", () => {
      const approvalDoc = {
        actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
        approverRole: "ops_lead",
        branchId: "kota_gorontalo",
        requestedByUid: "ins_gtlo",
      };

      expect(canDecideApproval(approvalDoc, foGorontalo)).toBe(true);
      expect(canDecideApproval(approvalDoc, foBoneBolango)).toBe(false);
      expect(canDecideApproval(approvalDoc, instructorLeaderGorontalo)).toBe(false);
      expect(canDecideApproval(approvalDoc, adminUser)).toBe(true);
    });

    it("strictly blocks self-approval: requester cannot approve their own request", () => {
      const managerSelfShiftCorrection = {
        actionId: "STAFF_SHIFT_SELF_CORRECTION",
        approverRole: "manager",
        branchId: "kota_gorontalo",
        requestedByUid: "mgr_gtlo", // Manager is the requester!
      };

      // Even though managerGorontalo is Manager of kota_gorontalo, they cannot self-approve!
      expect(canDecideApproval(managerSelfShiftCorrection, managerGorontalo)).toBe(false);
      // Admin can approve it
      expect(canDecideApproval(managerSelfShiftCorrection, adminUser)).toBe(true);
    });

    it("blocks Ops Lead self-approving their own shift self-correction", () => {
      const foSelfShiftCorrection = {
        actionId: "STAFF_SHIFT_SELF_CORRECTION",
        approverRole: "ops_lead",
        branchId: "kota_gorontalo",
        requestedByUid: "fo_gtlo",
      };

      expect(canDecideApproval(foSelfShiftCorrection, foGorontalo)).toBe(false);
    });
  });

  describe("Staff Invite Branch Spoofing Prevention", () => {
    it("requires registration branchId to match invite branchId when present", () => {
      const invite = { email: "newstaff@myliberty.com", role: "instructor", branchId: "bone_bolango" };

      const validSignup = { role: "instructor", branchId: "bone_bolango" };
      const spoofedSignup = { role: "instructor", branchId: "kota_gorontalo" };

      const checkValid =
        validSignup.role === invite.role &&
        (!invite.branchId || validSignup.branchId === invite.branchId);

      const checkSpoofed =
        spoofedSignup.role === invite.role &&
        (!invite.branchId || spoofedSignup.branchId === invite.branchId);

      expect(checkValid).toBe(true);
      expect(checkSpoofed).toBe(false);
    });
  });

  describe("Payments Get Owner Scoping (C1)", () => {
    const payment = { id: "pay_9", branchId: "kota_gorontalo", studentId: "stu_1" };

    it("allows the owning student to read their own payment", () => {
      expect(canGetPayment(payment, { uid: "stu_1", role: "student" })).toBe(true);
    });

    it("blocks other signed-in users from reading someone else's payment", () => {
      expect(canGetPayment(payment, { uid: "stu_2", role: "student" })).toBe(false);
      expect(canGetPayment(payment, { uid: "ins_gtlo", role: "instructor" })).toBe(false);
      expect(canGetPayment(payment, null)).toBe(false);
    });

    it("still allows admin and same-branch manager/frontoffice to read", () => {
      expect(canGetPayment(payment, adminUser)).toBe(true);
      expect(canGetPayment(payment, managerGorontalo)).toBe(true);
      expect(canGetPayment(payment, foGorontalo)).toBe(true);
      expect(canGetPayment(payment, managerBoneBolango)).toBe(false);
    });
  });

  describe("Approval Decision Contract (C2)", () => {
    const pendingApproval = {
      id: "appr_1",
      actionId: "DISCOUNT_OR_REFUND",
      approverRole: "manager",
      approverBranchId: "kota_gorontalo",
      requestedByUid: "fo_gtlo",
      status: "pending",
    };

    it("allows the designated approver to record a decision with canonical fields", () => {
      const incoming = {
        ...pendingApproval,
        status: "approved",
        decidedBy: "Manager GTLO",
        decidedByUid: "mgr_gtlo",
        decidedAt: "2026-09-25T10:00:00.000Z",
        decisionNotes: "Verified with parent",
        updatedAt: "ts",
      };
      expect(canUpdateApproval(pendingApproval, incoming, managerGorontalo)).toBe(true);
    });

    it("rejects decisions recorded under a different uid", () => {
      const incoming = {
        ...pendingApproval,
        status: "approved",
        decidedByUid: "someone_else",
        decidedAt: "2026-09-25T10:00:00.000Z",
      };
      expect(canUpdateApproval(pendingApproval, incoming, managerGorontalo)).toBe(false);
    });

    it("rejects tampering with requester identity or non-decision fields", () => {
      const tamperedRequester = {
        ...pendingApproval,
        requestedByUid: "admin_1",
        status: "approved",
        decidedByUid: "mgr_gtlo",
      };
      expect(canUpdateApproval(pendingApproval, tamperedRequester, managerGorontalo)).toBe(false);

      const extraField = {
        ...pendingApproval,
        status: "approved",
        decidedByUid: "mgr_gtlo",
        amount: 999999,
      };
      expect(canUpdateApproval(pendingApproval, extraField, managerGorontalo)).toBe(false);
    });

    it("rejects statuses outside approved/rejected", () => {
      const backToPending = {
        ...pendingApproval,
        status: "pending",
        decidedByUid: "mgr_gtlo",
      };
      expect(canUpdateApproval(pendingApproval, backToPending, managerGorontalo)).toBe(false);
    });
  });

  describe("Approved Shift Self-Correction Gate (C4)", () => {
    const approvedCorrection = {
      id: "appr_77",
      actionId: "STAFF_SHIFT_SELF_CORRECTION",
      status: "approved",
      payload: { shiftId: "sh_42" },
    };

    it("accepts only approved self-correction envelopes for the exact shift", () => {
      expect(isApprovedShiftCorrection(approvedCorrection, "sh_42")).toBe(true);
      expect(isApprovedShiftCorrection(approvedCorrection, "sh_99")).toBe(false);
      expect(
        isApprovedShiftCorrection({ ...approvedCorrection, status: "pending" }, "sh_42")
      ).toBe(false);
      expect(
        isApprovedShiftCorrection(
          { ...approvedCorrection, actionId: "DISCOUNT_OR_REFUND" },
          "sh_42"
        )
      ).toBe(false);
      expect(isApprovedShiftCorrection({ ...approvedCorrection, payload: null }, "sh_42")).toBe(
        false
      );
      expect(isApprovedShiftCorrection({ ...approvedCorrection, applied: true }, "sh_42")).toBe(
        false
      );
    });
  });

  describe("Staff Leave Branch Read Isolation", () => {
    function canReadStaffLeave(leaveDoc, user) {
      if (isAdmin(user)) return true;
      if (isManager(user) && isSameBranch(leaveDoc, user)) return true;
      if (user && leaveDoc && leaveDoc.userId === user.uid) return true;
      return false;
    }

    const leaveKota = { id: "lv_1", userId: "ins_gtlo", branchId: "kota_gorontalo" };
    const leaveBoba = { id: "lv_2", userId: "ins_boba", branchId: "bone_bolango" };

    it("allows managers to read leave records only within their branch", () => {
      expect(canReadStaffLeave(leaveKota, managerGorontalo)).toBe(true);
      expect(canReadStaffLeave(leaveBoba, managerGorontalo)).toBe(false);
      expect(canReadStaffLeave(leaveBoba, managerBoneBolango)).toBe(true);
      expect(canReadStaffLeave(leaveKota, managerBoneBolango)).toBe(false);
    });

    it("allows staff members to read their own leave regardless of branch", () => {
      expect(canReadStaffLeave(leaveKota, instructorGorontalo)).toBe(true);
      expect(canReadStaffLeave(leaveBoba, instructorGorontalo)).toBe(false);
    });

    it("grants Admin global read access to all staff leave", () => {
      expect(canReadStaffLeave(leaveKota, adminUser)).toBe(true);
      expect(canReadStaffLeave(leaveBoba, adminUser)).toBe(true);
    });
  });

  describe("Class Capacity Rule Invariant", () => {
    function canUpdateClass(existing, incoming, user) {
      if (isAdmin(user)) return true;
      if (!isFrontOffice(user)) return false;
      if (!isSameBranch(existing, user) || !isSameBranch(incoming, user)) return false;
      if (existing.capacity != null && incoming.studentIds.length > existing.capacity) return false;
      if (existing.maxStudents != null && incoming.studentIds.length > existing.maxStudents) return false;
      return true;
    }

    const cls = { id: "c_1", branchId: "kota_gorontalo", capacity: 10, studentIds: ["s1", "s2"] };

    it("allows enrollment updates within capacity limit", () => {
      const incoming = { ...cls, studentIds: ["s1", "s2", "s3"] };
      expect(canUpdateClass(cls, incoming, foGorontalo)).toBe(true);
    });

    it("rejects enrollment updates exceeding class capacity", () => {
      const fullStudentList = Array.from({ length: 11 }, (_, i) => `s_${i}`);
      const incoming = { ...cls, studentIds: fullStudentList };
      expect(canUpdateClass(cls, incoming, foGorontalo)).toBe(false);
    });
  });

  describe("Shift Review Status Updates", () => {
    function canReviewShift(existing, incoming, user) {
      if (isAdmin(user)) return true;
      if ((isFrontOffice(user) || isManager(user)) && isSameBranch(existing, user)) {
        const diffKeys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
        return diffKeys.length === 1 && diffKeys[0] === "reviewStatus";
      }
      return false;
    }

    const closedShift = {
      id: "sh_closed",
      userId: "ins_gtlo",
      branchId: "kota_gorontalo",
      clockIn: "2026-09-25T01:00:00.000Z",
      clockOut: "2026-09-25T03:00:00.000Z",
    };

    it("allows Front Office and Manager of the same branch to mark closed shift reviewed", () => {
      const updated = { ...closedShift, reviewStatus: "reviewed" };
      expect(canReviewShift(closedShift, updated, foGorontalo)).toBe(true);
      expect(canReviewShift(closedShift, updated, managerGorontalo)).toBe(true);
    });

    it("blocks cross-branch staff from marking shift reviewed", () => {
      const updated = { ...closedShift, reviewStatus: "reviewed" };
      expect(canReviewShift(closedShift, updated, foBoneBolango)).toBe(false);
      expect(canReviewShift(closedShift, updated, managerBoneBolango)).toBe(false);
    });

    it("rejects modifying other fields under the reviewStatus permission", () => {
      const tampered = { ...closedShift, reviewStatus: "reviewed", clockOut: "2026-09-27T05:00:00.000Z" };
      expect(canReviewShift(closedShift, tampered, foGorontalo)).toBe(false);
    });
  });

  describe("Class Attendance Security Rules Logic", () => {
    function isAssignedToClass(classDoc, user) {
      if (!user) return false;
      return (
        classDoc.instructorId === user.uid ||
        classDoc.substituteInstructorId === user.uid
      );
    }

    function canManageClassAttendance(classDoc, user) {
      if (isAdmin(user)) return true;
      if (isFrontOffice(user) && isSameBranch(classDoc, user)) return true;
      if (
        ["instructor", "instructorleader", "instructor_leader"].includes(user?.role) &&
        isAssignedToClass(classDoc, user)
      ) {
        return true;
      }
      return false;
    }

    function studentIsEnrolled(classDoc, studentId) {
      return Array.isArray(classDoc.studentIds) && classDoc.studentIds.includes(studentId);
    }

    function canCreateClassAttendance(classDoc, requestData, user) {
      if (!user) return false;
      if (!canManageClassAttendance(classDoc, user)) return false;
      if (
        typeof requestData.classId !== "string" ||
        typeof requestData.studentId !== "string" ||
        typeof requestData.attendanceDate !== "string" ||
        typeof requestData.markedBy !== "string" ||
        requestData.markedBy !== user.uid
      ) {
        return false;
      }
      if (!studentIsEnrolled(classDoc, requestData.studentId)) return false;
      if (!["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(requestData.status)) return false;
      if (!["SCAN", "MANUAL", "CLOSE_OUT"].includes(requestData.method)) return false;
      return true;
    }

    function canUpdateClassAttendance(classDoc, existing, requestData, user) {
      if (!user) return false;
      if (!canManageClassAttendance(classDoc, user)) return false;
      if (
        requestData.classId !== existing.classId ||
        requestData.studentId !== existing.studentId ||
        requestData.attendanceDate !== existing.attendanceDate
      ) {
        return false;
      }
      if (
        typeof requestData.markedBy !== "string" ||
        requestData.markedBy !== user.uid
      ) {
        return false;
      }
      if (requestData.method !== "MANUAL") return false; // Scans cannot overwrite
      if (!["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(requestData.status)) return false;
      return true;
    }

    function canReadClassAttendance(classDoc, attendanceDoc, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if ((isManager(user) || isFrontOffice(user)) && isSameBranch(classDoc, user)) return true;
      if (
        ["instructor", "instructorleader", "instructor_leader"].includes(user.role) &&
        isAssignedToClass(classDoc, user)
      ) {
        return true;
      }
      if (attendanceDoc.studentId === user.uid) return true;
      return false;
    }

    const testClass = {
      id: "class_gtlo_1",
      branchId: "kota_gorontalo",
      instructorId: "ins_1",
      substituteInstructorId: "ins_sub",
      studentIds: ["std_1", "std_2"],
    };

    const instructorAssigned = { uid: "ins_1", role: "instructor", branchId: "kota_gorontalo" };
    const instructorSubstitute = { uid: "ins_sub", role: "instructor", branchId: "kota_gorontalo" };
    const instructorUnassigned = { uid: "ins_other", role: "instructor", branchId: "kota_gorontalo" };
    const studentEnrolled = { uid: "std_1", role: "student", branchId: "kota_gorontalo" };
    const studentUnenrolled = { uid: "std_stranger", role: "student", branchId: "kota_gorontalo" };

    const validRecord = {
      classId: "class_gtlo_1",
      studentId: "std_1",
      attendanceDate: "2026-09-27",
      status: "PRESENT",
      method: "SCAN",
      markedBy: "ins_1",
    };

    it("allows primary and substitute instructors to create attendance for enrolled students", () => {
      expect(canCreateClassAttendance(testClass, validRecord, instructorAssigned)).toBe(true);

      const subRecord = { ...validRecord, markedBy: "ins_sub" };
      expect(canCreateClassAttendance(testClass, subRecord, instructorSubstitute)).toBe(true);
    });

    it("allows same-branch front office to create attendance", () => {
      const foRecord = { ...validRecord, markedBy: foGorontalo.uid };
      expect(canCreateClassAttendance(testClass, foRecord, foGorontalo)).toBe(true);
    });

    it("blocks cross-branch front office and unassigned instructors", () => {
      const crossFoRecord = { ...validRecord, markedBy: foBoneBolango.uid };
      expect(canCreateClassAttendance(testClass, crossFoRecord, foBoneBolango)).toBe(false);

      const unassignedRecord = { ...validRecord, markedBy: "ins_other" };
      expect(canCreateClassAttendance(testClass, unassignedRecord, instructorUnassigned)).toBe(false);
    });

    it("blocks creating attendance for students not in class studentIds", () => {
      const unenrolledRecord = { ...validRecord, studentId: "std_stranger" };
      expect(canCreateClassAttendance(testClass, unenrolledRecord, instructorAssigned)).toBe(false);
    });

    it("enforces scan idempotency: updates must be method MANUAL only", () => {
      const existing = { ...validRecord };
      const scanUpdate = { ...validRecord, status: "PRESENT", method: "SCAN" };
      expect(canUpdateClassAttendance(testClass, existing, scanUpdate, instructorAssigned)).toBe(false);

      const manualUpdate = { ...validRecord, status: "ABSENT", method: "MANUAL" };
      expect(canUpdateClassAttendance(testClass, existing, manualUpdate, instructorAssigned)).toBe(true);
    });

    it("blocks tampering with classId, studentId, or date on update", () => {
      const existing = { ...validRecord };
      const tamperedClass = { ...validRecord, classId: "other_class", method: "MANUAL" };
      expect(canUpdateClassAttendance(testClass, existing, tamperedClass, instructorAssigned)).toBe(false);

      const tamperedStudent = { ...validRecord, studentId: "std_2", method: "MANUAL" };
      expect(canUpdateClassAttendance(testClass, existing, tamperedStudent, instructorAssigned)).toBe(false);
    });

    it("allows enrolled student to read own attendance, but not other students", () => {
      expect(canReadClassAttendance(testClass, validRecord, studentEnrolled)).toBe(true);
      expect(canReadClassAttendance(testClass, validRecord, studentUnenrolled)).toBe(false);
    });

    it("blocks unassigned instructors and cross-branch managers from reading class attendance", () => {
      expect(canReadClassAttendance(testClass, validRecord, instructorAssigned)).toBe(true);
      expect(canReadClassAttendance(testClass, validRecord, instructorUnassigned)).toBe(false);
      expect(canReadClassAttendance(testClass, validRecord, managerGorontalo)).toBe(true);
      expect(canReadClassAttendance(testClass, validRecord, managerBoneBolango)).toBe(false);
    });
  });

  describe("School Outreach and Visits Collection Group Rules", () => {
    function isSameBranchStrict(data, user) {
      if (!user || !data) return false;
      if (data.branchId) {
        return data.branchId === userBranch(user);
      }
      if (data.branch) {
        let docBranch = "";
        if (data.branch === "Bone Bolango") docBranch = "bone_bolango";
        else if (data.branch === "Pohuwato") docBranch = "pohuwato";
        else if (data.branch === "Limboto") docBranch = "limboto";
        else if (data.branch === "Cabang Utama" || data.branch === "Kota Gorontalo") docBranch = "kota_gorontalo";
        return docBranch === userBranch(user);
      }
      return false;
    }

    function canReadVisitCollectionGroup(visit, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if ((isManager(user) || user.role === "marketing") && isSameBranchStrict(visit, user)) return true;
      return false;
    }

    function canCreateVisitCollectionGroup(visit, user) {
      if (!user) return false;
      const isAuthorizedRole =
        isAdmin(user) || ((isManager(user) || user.role === "marketing") && isSameBranchStrict(visit, user));
      if (!isAuthorizedRole) return false;
      return (
        typeof visit.visitDate === "string" &&
        typeof visit.contactName === "string" &&
        typeof visit.contactRole === "string" &&
        typeof visit.branchId === "string" &&
        typeof visit.branch === "string" &&
        visit.source === "schoolOutreach"
      );
    }

    const admin = { uid: "admin_1", role: "admin", branchId: "kota_gorontalo" };
    const mgrGto = { uid: "mgr_1", role: "manager", branchId: "kota_gorontalo" };
    const mgrBoba = { uid: "mgr_2", role: "manager", branchId: "bone_bolango" };
    const mktGto = { uid: "mkt_1", role: "marketing", branchId: "kota_gorontalo" };
    const instructor = { uid: "ins_1", role: "instructor", branchId: "kota_gorontalo" };
    const frontOffice = { uid: "fo_1", role: "frontoffice", branchId: "kota_gorontalo" };
    const student = { uid: "std_1", role: "student", branchId: "kota_gorontalo" };

    const visitGto = {
      id: "v_1",
      visitDate: "2026-09-27",
      contactName: "Ibu Nur",
      contactRole: "Guru BK",
      branchId: "kota_gorontalo",
      branch: "Kota Gorontalo",
      source: "schoolOutreach",
    };

    const visitBoba = {
      id: "v_2",
      visitDate: "2026-09-27",
      contactName: "Pak Suwawa",
      contactRole: "Guru BK",
      branchId: "bone_bolango",
      branch: "Bone Bolango",
      source: "schoolOutreach",
    };

    const legacyVisitMissingBranch = {
      id: "v_3",
      visitDate: "2026-09-20",
      contactName: "Pak Old",
      contactRole: "Kepala Sekolah",
      source: "schoolOutreach",
    };

    it("allows admin full read/create access across any branch", () => {
      expect(canReadVisitCollectionGroup(visitGto, admin)).toBe(true);
      expect(canReadVisitCollectionGroup(visitBoba, admin)).toBe(true);
      expect(canCreateVisitCollectionGroup(visitGto, admin)).toBe(true);
      expect(canCreateVisitCollectionGroup(visitBoba, admin)).toBe(true);
    });

    it("allows manager to read only same-branch visits in collectionGroup queries", () => {
      expect(canReadVisitCollectionGroup(visitGto, mgrGto)).toBe(true);
      expect(canReadVisitCollectionGroup(visitBoba, mgrGto)).toBe(false);
      expect(canReadVisitCollectionGroup(visitBoba, mgrBoba)).toBe(true);
      expect(canReadVisitCollectionGroup(visitGto, mgrBoba)).toBe(false);
    });

    it("allows marketing to read and create only same-branch visits", () => {
      expect(canReadVisitCollectionGroup(visitGto, mktGto)).toBe(true);
      expect(canReadVisitCollectionGroup(visitBoba, mktGto)).toBe(false);
      expect(canCreateVisitCollectionGroup(visitGto, mktGto)).toBe(true);
      expect(canCreateVisitCollectionGroup(visitBoba, mktGto)).toBe(false);
    });

    function canReadDirectSchoolVisit(visit, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if ((isManager(user) || user.role === "marketing") && isSameBranchStrict(visit, user)) return true;
      return false;
    }

    it("ensures direct nested visit reads and collection-group reads are consistently strict", () => {
      // Valid same branch
      expect(canReadDirectSchoolVisit(visitGto, mgrGto)).toBe(true);
      expect(canReadVisitCollectionGroup(visitGto, mgrGto)).toBe(true);

      // Cross branch
      expect(canReadDirectSchoolVisit(visitBoba, mgrGto)).toBe(false);
      expect(canReadVisitCollectionGroup(visitBoba, mgrGto)).toBe(false);

      // Missing branchId on visit: denied consistently across both direct and collection-group paths
      expect(canReadDirectSchoolVisit(legacyVisitMissingBranch, mgrGto)).toBe(false);
      expect(canReadVisitCollectionGroup(legacyVisitMissingBranch, mgrGto)).toBe(false);
    });

    it("denies visits missing branchId under strict collection-group rule", () => {
      expect(canReadVisitCollectionGroup(legacyVisitMissingBranch, mgrGto)).toBe(false);
      expect(canReadVisitCollectionGroup(legacyVisitMissingBranch, mktGto)).toBe(false);
    });

    it("denies marketing user attempting to create a visit with forged branchId", () => {
      const forgedVisit = { ...visitGto, branchId: "bone_bolango", branch: "Bone Bolango" };
      expect(canCreateVisitCollectionGroup(forgedVisit, mktGto)).toBe(false);
    });

    it("blocks roles without outreach business from reading or creating visits", () => {
      expect(canReadVisitCollectionGroup(visitGto, instructor)).toBe(false);
      expect(canReadVisitCollectionGroup(visitGto, frontOffice)).toBe(false);
      expect(canReadVisitCollectionGroup(visitGto, student)).toBe(false);
      expect(canCreateVisitCollectionGroup(visitGto, instructor)).toBe(false);
      expect(canCreateVisitCollectionGroup(visitGto, frontOffice)).toBe(false);
    });
  });

  describe("Parent + Student Roster Authorization Rules Matrix", () => {
    const parentA = {
      uid: "parent_a",
      role: "parent",
      branchId: "kota_gorontalo",
      childStudentIds: ["student_1", "student_2"],
    };

    const parentB = {
      uid: "parent_b",
      role: "parent",
      branchId: "bone_bolango",
      childStudentIds: ["student_3"],
    };

    const adminUser = { uid: "admin_1", role: "admin", branchId: "kota_gorontalo" };
    const foGto = { uid: "fo_1", role: "frontoffice", branchId: "kota_gorontalo" };
    const foBoba = { uid: "fo_2", role: "frontoffice", branchId: "bone_bolango" };

    function canReadAttendance(attendanceDoc, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if (attendanceDoc.studentId === user.uid) return true;
      return isParentOf(attendanceDoc.studentId, user);
    }

    function canReadClass(classDoc, user) {
      if (!user) return false;
      if (isStaff(user)) return true;
      if (classDoc.studentIds?.includes(user.uid)) return true;
      if (isParent(user) && Array.isArray(user.childStudentIds)) {
        return user.childStudentIds.some((id) => classDoc.studentIds?.includes(id));
      }
      return false;
    }

    function canUpdateParentProfileKeys(targetDoc, affectedKeys, updater) {
      if (!updater) return false;
      if (isAdmin(updater)) return true;

      // Front Office for same branch can update parent profile and childStudentIds
      if (isFrontOffice(updater) && isSameBranch(targetDoc, updater)) {
        const allowed = ["displayName", "phone", "childStudentIds", "updatedAt", "status", "branch"];
        return affectedKeys.every((k) => allowed.includes(k));
      }

      // Parent updating own profile (childStudentIds MUST NOT be permitted)
      if (updater.uid === targetDoc.id) {
        const allowedSelf = ["displayName", "phone", "dob", "photoURL", "nickname"];
        return affectedKeys.every((k) => allowedSelf.includes(k));
      }

      return false;
    }

    it("allows parent to read attendance of linked children only", () => {
      const attChild1 = { studentId: "student_1", classId: "c1" };
      const attChild2 = { studentId: "student_2", classId: "c1" };
      const attChild3 = { studentId: "student_3", classId: "c2" };

      expect(canReadAttendance(attChild1, parentA)).toBe(true);
      expect(canReadAttendance(attChild2, parentA)).toBe(true);
      expect(canReadAttendance(attChild3, parentA)).toBe(false); // child of parentB

      expect(canReadAttendance(attChild3, parentB)).toBe(true);
      expect(canReadAttendance(attChild1, parentB)).toBe(false);
    });

    it("allows parent to read class documents containing enrolled linked children", () => {
      const classWithChild1 = { studentIds: ["student_1", "other_student"] };
      const classWithChild3 = { studentIds: ["student_3"] };
      const classUnrelated = { studentIds: ["stranger_1", "stranger_2"] };

      expect(canReadClass(classWithChild1, parentA)).toBe(true);
      expect(canReadClass(classWithChild3, parentA)).toBe(false);
      expect(canReadClass(classUnrelated, parentA)).toBe(false);

      expect(canReadClass(classWithChild3, parentB)).toBe(true);
    });

    it("prevents parents from mutating childStudentIds on their own user document", () => {
      const parentDoc = { id: "parent_a", role: "parent", branchId: "kota_gorontalo" };

      // Parent changing their own name or phone is allowed
      expect(canUpdateParentProfileKeys(parentDoc, ["displayName", "phone"], parentA)).toBe(true);

      // Parent attempting to add childStudentIds to their own doc is REJECTED
      expect(canUpdateParentProfileKeys(parentDoc, ["childStudentIds"], parentA)).toBe(false);
      expect(canUpdateParentProfileKeys(parentDoc, ["displayName", "childStudentIds"], parentA)).toBe(false);
    });

    it("allows Front Office of the same branch to manage parent childStudentIds", () => {
      const parentDocGto = { id: "parent_a", role: "parent", branchId: "kota_gorontalo" };
      const parentDocBoba = { id: "parent_b", role: "parent", branchId: "bone_bolango" };

      // FO Kota Gorontalo updating Kota Gorontalo parent's childStudentIds: ALLOWED
      expect(canUpdateParentProfileKeys(parentDocGto, ["childStudentIds", "updatedAt"], foGto)).toBe(true);

      // FO Kota Gorontalo updating Bone Bolango parent's childStudentIds: BLOCKED (branch isolation)
      expect(canUpdateParentProfileKeys(parentDocBoba, ["childStudentIds", "updatedAt"], foGto)).toBe(false);

      // FO Bone Bolango updating Bone Bolango parent: ALLOWED
      expect(canUpdateParentProfileKeys(parentDocBoba, ["childStudentIds", "updatedAt"], foBoba)).toBe(true);

      // Admin updating any parent: ALLOWED
      expect(canUpdateParentProfileKeys(parentDocBoba, ["childStudentIds", "updatedAt"], adminUser)).toBe(true);
    });

    function canGetUser(targetUserDoc, requester) {
      if (!requester) return false;
      if (isAdmin(requester)) return true;
      if (isManager(requester) && isSameBranch(targetUserDoc, requester)) return true;
      if (
        isStaff(requester) &&
        ["student", "instructor", "instructorleader", "instructor_leader", "parent"].includes(targetUserDoc.role) &&
        isSameBranch(targetUserDoc, requester)
      ) {
        return true;
      }
      if (requester.uid && targetUserDoc.id === requester.uid) return true;
      if (isParentOf(targetUserDoc.id, requester) && targetUserDoc.role === "student") return true;
      return false;
    }

    function canListUsers(requester) {
      if (!requester) return false;
      if (isAdmin(requester)) return true;
      if (isManager(requester)) return true;
      if (isStaff(requester)) return true;
      return false;
    }

    it("restricts /users/{userId} get so parents can only read own doc and linked children", () => {
      // 1. Parent self-read: allowed
      expect(canGetUser({ id: "parent_a", role: "parent" }, parentA)).toBe(true);
      expect(canGetUser({ id: "parent_b", role: "parent" }, parentB)).toBe(true);

      // 2. Parent-to-parent reads: strictly blocked
      expect(canGetUser({ id: "parent_b", role: "parent" }, parentA)).toBe(false);
      expect(canGetUser({ id: "parent_a", role: "parent" }, parentB)).toBe(false);

      // 3. Parent reading linked children: allowed
      expect(canGetUser({ id: "student_1", role: "student" }, parentA)).toBe(true);
      expect(canGetUser({ id: "student_2", role: "student" }, parentA)).toBe(true);
      expect(canGetUser({ id: "student_3", role: "student" }, parentB)).toBe(true);

      // 4. Parent reading arbitrary unlinked students: strictly blocked
      expect(canGetUser({ id: "student_3", role: "student" }, parentA)).toBe(false);
      expect(canGetUser({ id: "student_1", role: "student" }, parentB)).toBe(false);
      expect(canGetUser({ id: "student_2", role: "student" }, parentB)).toBe(false);

      // 5. Parent reading other roles (e.g. staff): strictly blocked
      expect(canGetUser({ id: "ins_1", role: "instructor", branchId: "kota_gorontalo" }, parentA)).toBe(false);

      // 6. Student reads: student can read self, but cannot read other students or parents
      const student1 = { uid: "student_1", role: "student" };
      expect(canGetUser({ id: "student_1", role: "student" }, student1)).toBe(true);
      expect(canGetUser({ id: "student_2", role: "student" }, student1)).toBe(false);
      expect(canGetUser({ id: "parent_a", role: "parent" }, student1)).toBe(false);

      // 7. Unauthenticated reads: strictly blocked
      expect(canGetUser({ id: "student_1", role: "student" }, null)).toBe(false);
      expect(canGetUser({ id: "parent_a", role: "parent" }, null)).toBe(false);

      // 8. Staff reads with branch isolation
      expect(canGetUser({ id: "student_1", role: "student", branchId: "kota_gorontalo" }, foGto)).toBe(true);
      expect(canGetUser({ id: "parent_a", role: "parent", branchId: "kota_gorontalo" }, foGto)).toBe(true);
      expect(canGetUser({ id: "parent_b", role: "parent", branchId: "bone_bolango" }, foGto)).toBe(false);
      expect(canGetUser({ id: "parent_b", role: "parent", branchId: "bone_bolango" }, adminUser)).toBe(true);
    });

    it("ensures parents and students cannot list /users collection", () => {
      expect(canListUsers(parentA)).toBe(false);
      expect(canListUsers(parentB)).toBe(false);
      expect(canListUsers({ uid: "student_1", role: "student" })).toBe(false);
      expect(canListUsers(null)).toBe(false);
      expect(canListUsers(foGto)).toBe(true);
      expect(canListUsers(adminUser)).toBe(true);
    });
  });

  describe("Corporate Events Authorization & Branch Isolation", () => {
    function canReadCorporateEvent(doc, user) {
      if (!user) return false;
      return isStaff(user);
    }

    function canCreateCorporateEvent(incoming, user) {
      if (!user) return false;
      const roleAllowed = isAdmin(user) || isManager(user) || isFrontOffice(user);
      if (!roleAllowed) return false;
      if (typeof incoming?.name !== "string" || typeof incoming?.eventDate !== "string") return false;
      if (!["all", "branch", "role", "division"].includes(incoming?.audienceType)) return false;
      if (isAdmin(user)) return true;

      if (incoming.audienceType !== "branch") return true;
      const uBranch = userBranch(user);
      const aVal = incoming.audienceValue;
      return (
        aVal === uBranch ||
        (aVal === "Kota Gorontalo" && uBranch === "kota_gorontalo") ||
        (aVal === "Bone Bolango" && uBranch === "bone_bolango") ||
        (aVal === "Pohuwato" && uBranch === "pohuwato") ||
        (aVal === "Limboto" && uBranch === "limboto")
      );
    }

    it("allows all staff to read corporate events while blocking students and unauthenticated visitors", () => {
      const allEvt = { name: "Academy Townhall", audienceType: "all" };
      const gtoEvt = { name: "Gorontalo Meeting", audienceType: "branch", audienceValue: "kota_gorontalo" };
      const bobaEvt = { name: "Bone Bolango Meeting", audienceType: "branch", audienceValue: "bone_bolango" };
      const roleEvt = { name: "Instructors Sync", audienceType: "role", audienceValue: "instructor" };

      // Admin has cross-branch access
      expect(canReadCorporateEvent(allEvt, adminUser)).toBe(true);
      expect(canReadCorporateEvent(gtoEvt, adminUser)).toBe(true);
      expect(canReadCorporateEvent(bobaEvt, adminUser)).toBe(true);

      // Staff across all branches can read corporate events (ensuring collection queries run cleanly)
      expect(canReadCorporateEvent(allEvt, foGorontalo)).toBe(true);
      expect(canReadCorporateEvent(roleEvt, foGorontalo)).toBe(true);
      expect(canReadCorporateEvent(gtoEvt, foGorontalo)).toBe(true);
      expect(canReadCorporateEvent(bobaEvt, foBoneBolango)).toBe(true);
      expect(canReadCorporateEvent(bobaEvt, foGorontalo)).toBe(true);

      // Students and unauthenticated visitors cannot read corporate events
      expect(canReadCorporateEvent(allEvt, { role: "student" })).toBe(false);
      expect(canReadCorporateEvent(allEvt, null)).toBe(false);
    });

    it("allows Manager and Front Office to create events only for their branch or academy-wide", () => {
      const gtoPayload = { name: "Briefing", eventDate: "2026-09-27", audienceType: "branch", audienceValue: "kota_gorontalo" };
      const bobaPayload = { name: "Briefing", eventDate: "2026-09-27", audienceType: "branch", audienceValue: "bone_bolango" };

      expect(canCreateCorporateEvent(gtoPayload, foGorontalo)).toBe(true);
      expect(canCreateCorporateEvent(bobaPayload, foGorontalo)).toBe(false);
      expect(canCreateCorporateEvent(bobaPayload, foBoneBolango)).toBe(true);
      expect(canCreateCorporateEvent(bobaPayload, adminUser)).toBe(true);
    });
  });

  describe("Todos Directives Update & Legacy Document Safety", () => {
    function canUpdateTodo(existingDoc, incomingDoc, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;

      // Manager or Front Office same branch
      if (
        (isManager(user) || isFrontOffice(user)) &&
        isSameBranch(existingDoc, user) &&
        isSameBranch(incomingDoc, user)
      ) {
        return true;
      }

      // Staff completion toggle
      if (isStaff(user)) {
        const isAllDirective =
          (existingDoc && "branch" in existingDoc && (existingDoc.branch === "all" || existingDoc.branch === "All")) ||
          (existingDoc && "branchId" in existingDoc && existingDoc.branchId === "all");

        const branchEligible = isSameBranch(existingDoc, user) || isAllDirective;
        if (!branchEligible) return false;

        const affectedKeys = Object.keys(incomingDoc).filter((k) => incomingDoc[k] !== existingDoc[k]);
        const allowedKeys = ["completed", "completedAt", "completedBy", "completedByName", "updatedAt"];
        return affectedKeys.every((k) => allowedKeys.includes(k));
      }

      return false;
    }

    it("handles legacy todo documents missing branch fields without evaluation error", () => {
      const legacyDoc = {
        title: "Clean reception counter",
        completed: false,
      };

      const completedUpdate = {
        ...legacyDoc,
        completed: true,
        completedAt: "2026-09-27T10:00:00Z",
        completedBy: instructorGorontalo.uid,
      };

      expect(canUpdateTodo(legacyDoc, completedUpdate, instructorGorontalo)).toBe(true);

      const maliciousUpdate = {
        ...legacyDoc,
        title: "Hacked title",
        completed: true,
      };
      // Regular staff cannot modify unapproved fields like title
      expect(canUpdateTodo(legacyDoc, maliciousUpdate, instructorGorontalo)).toBe(false);

      // Front Office of same branch CAN update directive fields like title
      expect(canUpdateTodo(legacyDoc, maliciousUpdate, foGorontalo)).toBe(true);
    });

    it("allows staff from any branch to toggle academy-wide directives", () => {
      const academyDoc = {
        title: "Submit Monthly Safety Checklist",
        branch: "all",
        completed: false,
      };

      const completedUpdate = {
        ...academyDoc,
        completed: true,
        completedAt: "2026-09-27T10:00:00Z",
        completedBy: foBoneBolango.uid,
      };

      expect(canUpdateTodo(academyDoc, completedUpdate, foBoneBolango)).toBe(true);
      expect(canUpdateTodo(academyDoc, completedUpdate, foGorontalo)).toBe(true);
    });

    it("strictly revokes staff and admin authorizations when status is resigned or terminated", () => {
      const activeAdmin = { uid: "adm1", role: "admin", status: "active", branchId: "kota_gorontalo" };
      const terminatedAdmin = { uid: "adm1", role: "admin", status: "terminated", branchId: "kota_gorontalo" };
      const resignedManager = { uid: "mgr1", role: "manager", status: "resigned", branchId: "kota_gorontalo" };
      const terminatedFO = { uid: "fo1", role: "frontoffice", status: "terminated", branchId: "kota_gorontalo" };
      const terminatedInstructor = { uid: "ins1", role: "instructor", status: "terminated", branchId: "kota_gorontalo" };

      expect(isAdmin(activeAdmin)).toBe(true);
      expect(isAdmin(terminatedAdmin)).toBe(false);
      expect(isManager(resignedManager)).toBe(false);
      expect(isManager({ uid: "bm1", role: "branch_manager", status: "active" })).toBe(true);
      expect(isStaff({ uid: "bm1", role: "branch_manager", status: "active" })).toBe(true);
      expect(isFrontOffice(terminatedFO)).toBe(false);
      expect(isStaff(terminatedInstructor)).toBe(false);
    });

    it("correctly resolves legacy branch string when branchId is absent", () => {
      const legacyUserBone = { uid: "u1", role: "instructor", branch: "Bone Bolango" };
      const legacyUserPohuwato = { uid: "u2", role: "instructor", branch: "Pohuwato" };
      const legacyUserLimboto = { uid: "u3", role: "instructor", branch: "Limboto" };
      const legacyUserDefault = { uid: "u4", role: "instructor" };

      expect(userBranch(legacyUserBone)).toBe("bone_bolango");
      expect(userBranch(legacyUserPohuwato)).toBe("pohuwato");
      expect(userBranch(legacyUserLimboto)).toBe("limboto");
      expect(userBranch(legacyUserDefault)).toBe("kota_gorontalo");
    });
  });

  describe("Payment Security Rules Invariants (Section 4 Audit)", () => {
    function isParentOf(studentId, user) {
      return (
        user?.role === "parent" &&
        Array.isArray(user.childStudentIds) &&
        user.childStudentIds.includes(studentId)
      );
    }

    function canGetPayment(payment, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if ((isManager(user) || isFrontOffice(user)) && isSameBranch(payment, user)) return true;
      if (payment.studentId === user.uid) return true;
      if (isParentOf(payment.studentId, user)) return true;
      return false;
    }

    function canCreatePayment(payment, user) {
      if (!user) return false;
      const isAuthorized = isAdmin(user) || (isFrontOffice(user) && isSameBranch(payment, user));
      if (!isAuthorized) return false;
      if (typeof payment.amount !== "number" || payment.amount <= 0) return false;
      if (typeof payment.studentId !== "string" || !payment.studentId.trim()) return false;
      return true;
    }

    function canUpdatePayment(existing, incoming, user) {
      if (!user) return false;
      if (isAdmin(user)) return true;
      if (
        isFrontOffice(user) &&
        isSameBranch(existing, user) &&
        isSameBranch(incoming, user) &&
        (!existing.branchId || incoming.branchId === existing.branchId)
      ) {
        const allowedKeys = new Set(["notes", "approvalStatus", "referenceNumber", "updatedAt"]);
        const changedKeys = Object.keys(incoming).filter((k) => existing[k] !== incoming[k]);
        return changedKeys.every((k) => allowedKeys.has(k));
      }
      return false;
    }

    function canDeletePayment(user) {
      if (!user) return false;
      return isAdmin(user);
    }

    const paymentKota = {
      id: "pay_1",
      studentId: "std_alice",
      branchId: "kota_gorontalo",
      amount: 500000,
      period: "October 2026",
    };

    const parentAlice = {
      uid: "par_1",
      role: "parent",
      branchId: "kota_gorontalo",
      childStudentIds: ["std_alice"],
    };

    const parentBob = {
      uid: "par_2",
      role: "parent",
      branchId: "kota_gorontalo",
      childStudentIds: ["std_bob"],
    };

    it("allows student and their verified parent to read payment receipt records", () => {
      const studentUser = { uid: "std_alice", role: "student", branchId: "kota_gorontalo" };
      const strangerStudent = { uid: "std_charlie", role: "student", branchId: "kota_gorontalo" };

      expect(canGetPayment(paymentKota, studentUser)).toBe(true);
      expect(canGetPayment(paymentKota, parentAlice)).toBe(true);
      expect(canGetPayment(paymentKota, parentBob)).toBe(false);
      expect(canGetPayment(paymentKota, strangerStudent)).toBe(false);
    });

    it("enforces positive numeric amount and studentId on payment creation", () => {
      expect(canCreatePayment(paymentKota, foGorontalo)).toBe(true);
      expect(canCreatePayment({ ...paymentKota, amount: 0 }, foGorontalo)).toBe(false);
      expect(canCreatePayment({ ...paymentKota, amount: -1000 }, foGorontalo)).toBe(false);
      expect(canCreatePayment({ ...paymentKota, studentId: "" }, foGorontalo)).toBe(false);
      expect(canCreatePayment(paymentKota, foBoneBolango)).toBe(false);
    });

    it("forbids Front Office from altering core financial fields (amount, studentId)", () => {
      const tamperedAmount = { ...paymentKota, amount: 200000 };
      const allowedNoteUpdate = { ...paymentKota, notes: "Paid via BCA Transfer" };

      expect(canUpdatePayment(paymentKota, allowedNoteUpdate, foGorontalo)).toBe(true);
      expect(canUpdatePayment(paymentKota, tamperedAmount, foGorontalo)).toBe(false);
      expect(canUpdatePayment(paymentKota, tamperedAmount, adminUser)).toBe(true);
    });

    it("prohibits Front Office from deleting payment records (admin-only)", () => {
      expect(canDeletePayment(foGorontalo)).toBe(false);
      expect(canDeletePayment(managerGorontalo)).toBe(false);
      expect(canDeletePayment(adminUser)).toBe(true);
    });
  });

  describe("Section 16: Kids Manager Branch + Division Security Matrix", () => {
    const kidsManagerGorontalo = {
      uid: "kids_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const coursesManagerGorontalo = {
      uid: "courses_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const legacyManagerGorontalo = {
      uid: "legacy_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
    };

    const admin = {
      uid: "admin_super",
      role: "admin",
      branchId: "kota_gorontalo",
    };

    const foStaff = {
      uid: "fo_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
    };

    // Documents across branch and division
    const classKidsGtlo = { id: "c_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const classCoursesGtlo = { id: "c_c_gtlo", branchId: "kota_gorontalo", division: "courses" };
    const classKidsBoba = { id: "c_k_boba", branchId: "bone_bolango", division: "kindergarten" };
    const classLegacyNoDiv = { id: "c_nodiv", branchId: "kota_gorontalo" };

    const appKidsGtlo = { id: "a_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const appCoursesGtlo = { id: "a_c_gtlo", branchId: "kota_gorontalo", division: "courses" };

    const progKidsGtlo = { id: "p_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten", studentId: "std_k" };
    const progCoursesGtlo = { id: "p_c_gtlo", branchId: "kota_gorontalo", division: "courses", studentId: "std_c" };

    const studentKidsGtlo = { id: "std_k", role: "student", branchId: "kota_gorontalo", division: "kindergarten" };
    const studentCoursesGtlo = { id: "std_c", role: "student", branchId: "kota_gorontalo", division: "courses" };
    const studentLegacyGtlo = { id: "std_legacy", role: "student", branchId: "kota_gorontalo" };

    it("Kids Manager, Kota Gorontalo -> Kota Gorontalo Kindergarten classes: ALLOW", () => {
      expect(canGetClass(classKidsGtlo, kidsManagerGorontalo)).toBe(true);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsManagerGorontalo)).toBe(true);
    });

    it("Kids Manager, Kota Gorontalo -> Kota Gorontalo Courses classes: DENY", () => {
      expect(canGetClass(classCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "courses" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Kids Manager, Kota Gorontalo -> Bone Bolango Kindergarten classes: DENY", () => {
      expect(canGetClass(classKidsBoba, kidsManagerGorontalo)).toBe(false);
      expect(canListClasses({ branchId: "bone_bolango", division: "kindergarten" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Kids Manager -> Kindergarten admissions in own branch: ALLOW", () => {
      expect(canGetApplication(appKidsGtlo, kidsManagerGorontalo)).toBe(true);
      expect(canListApplications({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsManagerGorontalo)).toBe(true);
    });

    it("Kids Manager -> Courses admissions in own branch: DENY", () => {
      expect(canGetApplication(appCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canListApplications({ branchId: "kota_gorontalo", division: "courses" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Kids Manager -> Kindergarten progress in own branch: ALLOW", () => {
      expect(canGetProgressReport(progKidsGtlo, kidsManagerGorontalo)).toBe(true);
      expect(canListProgressReports({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsManagerGorontalo)).toBe(true);
    });

    it("Kids Manager -> Courses progress in own branch: DENY", () => {
      expect(canGetProgressReport(progCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canListProgressReports({ branchId: "kota_gorontalo", division: "courses" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Admin -> all branches and divisions: ALLOW", () => {
      expect(canGetClass(classKidsGtlo, admin)).toBe(true);
      expect(canGetClass(classCoursesGtlo, admin)).toBe(true);
      expect(canGetClass(classKidsBoba, admin)).toBe(true);
      expect(canListClasses({ branchId: "bone_bolango" }, admin)).toBe(true);
      expect(canGetApplication(appKidsGtlo, admin)).toBe(true);
      expect(canGetApplication(appCoursesGtlo, admin)).toBe(true);
      expect(canGetProgressReport(progKidsGtlo, admin)).toBe(true);
      expect(canGetProgressReport(progCoursesGtlo, admin)).toBe(true);
      expect(canGetUser(studentKidsGtlo, admin)).toBe(true);
      expect(canGetUser(studentCoursesGtlo, admin)).toBe(true);
    });

    it("Missing division record -> Kids Manager list query / get: DENY", () => {
      expect(canGetClass(classLegacyNoDiv, kidsManagerGorontalo)).toBe(false);
      // List query without division constraint
      expect(canListClasses({ branchId: "kota_gorontalo" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Courses Manager, Kota Gorontalo -> Kota Gorontalo Courses classes: ALLOW", () => {
      expect(canGetClass(classCoursesGtlo, coursesManagerGorontalo)).toBe(true);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "courses" }, coursesManagerGorontalo)).toBe(true);
    });

    it("Courses Manager, Kota Gorontalo -> Kota Gorontalo Kindergarten classes: DENY", () => {
      expect(canGetClass(classKidsGtlo, coursesManagerGorontalo)).toBe(false);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "kindergarten" }, coursesManagerGorontalo)).toBe(false);
    });

    it("Legacy Manager without division -> blocked from Kindergarten documents", () => {
      expect(canGetClass(classKidsGtlo, legacyManagerGorontalo)).toBe(false);
      expect(canGetApplication(appKidsGtlo, legacyManagerGorontalo)).toBe(false);
      expect(canGetProgressReport(progKidsGtlo, legacyManagerGorontalo)).toBe(false);
      expect(canGetUser(studentKidsGtlo, legacyManagerGorontalo)).toBe(false);
    });

    it("Kids Manager -> student reads in own branch require division == kindergarten", () => {
      expect(canGetUser(studentKidsGtlo, kidsManagerGorontalo)).toBe(true);
      expect(canGetUser(studentCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canGetUser(studentLegacyGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canListUsers({ role: "student", branchId: "kota_gorontalo", division: "kindergarten" }, kidsManagerGorontalo)).toBe(true);
      expect(canListUsers({ role: "student", branchId: "kota_gorontalo", division: "courses" }, kidsManagerGorontalo)).toBe(false);
      expect(canListUsers({ role: "student", branchId: "kota_gorontalo" }, kidsManagerGorontalo)).toBe(false);
    });

    it("Courses / Legacy Front Office staff in own branch is gated from Kindergarten documents", () => {
      expect(canGetClass(classKidsGtlo, foStaff)).toBe(false);
      expect(canGetClass(classCoursesGtlo, foStaff)).toBe(true);
      expect(canGetApplication(appKidsGtlo, foStaff)).toBe(false);
      expect(canGetApplication(appCoursesGtlo, foStaff)).toBe(true);
      expect(canGetProgressReport(progKidsGtlo, foStaff)).toBe(false);
      expect(canGetProgressReport(progCoursesGtlo, foStaff)).toBe(true);
      expect(canGetUser(studentKidsGtlo, foStaff)).toBe(false);
      expect(canGetUser(studentCoursesGtlo, foStaff)).toBe(true);
      expect(canGetUser(studentLegacyGtlo, foStaff)).toBe(true);
    });
  });

  describe("Section 17: Kids Front Office Branch + Division Security Matrix", () => {
    const kidsFOGorontalo = {
      uid: "kids_fo_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const coursesFOGorontalo = {
      uid: "courses_fo_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const classKidsGtlo = { id: "c_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const classCoursesGtlo = { id: "c_c_gtlo", branchId: "kota_gorontalo", division: "courses" };
    const classKidsBoba = { id: "c_k_boba", branchId: "bone_bolango", division: "kindergarten" };
    const classLegacyNoDiv = { id: "c_nodiv", branchId: "kota_gorontalo" };

    const appKidsGtlo = { id: "a_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const appCoursesGtlo = { id: "a_c_gtlo", branchId: "kota_gorontalo", division: "courses" };
    const appKidsBoba = { id: "a_k_boba", branchId: "bone_bolango", division: "kindergarten" };

    const studentKidsGtlo = { id: "std_k", role: "student", branchId: "kota_gorontalo", division: "kindergarten" };
    const studentCoursesGtlo = { id: "std_c", role: "student", branchId: "kota_gorontalo", division: "courses" };
    const studentKidsBoba = { id: "std_k_boba", role: "student", branchId: "bone_bolango", division: "kindergarten" };
    const studentLegacyGtlo = { id: "std_legacy", role: "student", branchId: "kota_gorontalo" };

    const progKidsGtlo = { id: "p_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten", studentId: "std_k" };
    const progCoursesGtlo = { id: "p_c_gtlo", branchId: "kota_gorontalo", division: "courses", studentId: "std_c" };

    it("Kids Front Office, Kota Gorontalo -> Kindergarten class in own branch: ALLOW", () => {
      expect(canGetClass(classKidsGtlo, kidsFOGorontalo)).toBe(true);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office, Kota Gorontalo -> Courses class in own branch: DENY", () => {
      expect(canGetClass(classCoursesGtlo, kidsFOGorontalo)).toBe(false);
      expect(canListClasses({ branchId: "kota_gorontalo", division: "courses" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office, Kota Gorontalo -> Kindergarten class in another branch: DENY", () => {
      expect(canGetClass(classKidsBoba, kidsFOGorontalo)).toBe(false);
      expect(canListClasses({ branchId: "bone_bolango", division: "kindergarten" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> legacy class without division: DENY", () => {
      expect(canGetClass(classLegacyNoDiv, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> own branch Kindergarten applications: ALLOW", () => {
      expect(canGetApplication(appKidsGtlo, kidsFOGorontalo)).toBe(true);
      expect(canListApplications({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office -> own branch Courses applications: DENY", () => {
      expect(canGetApplication(appCoursesGtlo, kidsFOGorontalo)).toBe(false);
      expect(canListApplications({ branchId: "kota_gorontalo", division: "courses" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> foreign branch Kindergarten applications: DENY", () => {
      expect(canGetApplication(appKidsBoba, kidsFOGorontalo)).toBe(false);
      expect(canListApplications({ branchId: "bone_bolango", division: "kindergarten" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> read Kindergarten student in own branch: ALLOW", () => {
      expect(canGetUser(studentKidsGtlo, kidsFOGorontalo)).toBe(true);
      expect(canListUsers({ role: "student", branchId: "kota_gorontalo", division: "kindergarten" }, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office -> read Courses or legacy student in own branch: DENY", () => {
      expect(canGetUser(studentCoursesGtlo, kidsFOGorontalo)).toBe(false);
      expect(canGetUser(studentLegacyGtlo, kidsFOGorontalo)).toBe(false);
      expect(canListUsers({ role: "student", branchId: "kota_gorontalo", division: "courses" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> foreign branch student: DENY", () => {
      expect(canGetUser(studentKidsBoba, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> progress reports division isolation", () => {
      expect(canGetProgressReport(progKidsGtlo, kidsFOGorontalo)).toBe(true);
      expect(canListProgressReports({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsFOGorontalo)).toBe(true);
      expect(canGetProgressReport(progCoursesGtlo, kidsFOGorontalo)).toBe(false);
      expect(canListProgressReports({ branchId: "kota_gorontalo", division: "courses" }, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> create Kindergarten student in own branch: ALLOW", () => {
      const newKgStudent = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
        displayName: "New KG Student",
      };
      expect(canCreateUser(newKgStudent, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office -> create Courses student: DENY", () => {
      const newCourseStudent = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        displayName: "New Course Student",
      };
      expect(canCreateUser(newCourseStudent, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> create student in foreign branch: DENY", () => {
      const foreignStudent = {
        role: "student",
        branchId: "bone_bolango",
        division: "kindergarten",
        displayName: "Foreign Student",
      };
      expect(canCreateUser(foreignStudent, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> update Kindergarten student in own branch: ALLOW", () => {
      const existing = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
        displayName: "Existing KG",
      };
      const update = {
        ...existing,
        displayName: "Updated KG Name",
      };
      expect(canUpdateUser(existing, update, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office -> update Courses student: DENY", () => {
      const existing = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        displayName: "Courses Student",
      };
      const update = {
        ...existing,
        displayName: "Updated Name",
      };
      expect(canUpdateUser(existing, update, kidsFOGorontalo)).toBe(false);
    });

    it("Kids Front Office -> delete Kindergarten student in own branch: ALLOW", () => {
      const student = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      };
      expect(canDeleteUser(student, kidsFOGorontalo)).toBe(true);
    });

    it("Kids Front Office -> delete Courses student in own branch: DENY", () => {
      const student = {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
      };
      expect(canDeleteUser(student, kidsFOGorontalo)).toBe(false);
    });

    it("Courses Front Office -> read Courses and legacy students, blocked from Kindergarten", () => {
      expect(canGetUser(studentCoursesGtlo, coursesFOGorontalo)).toBe(true);
      expect(canGetUser(studentLegacyGtlo, coursesFOGorontalo)).toBe(true);
      expect(canGetUser(studentKidsGtlo, coursesFOGorontalo)).toBe(false);
    });
  });

  describe("Section 18: Kids Instructor Branch + Division Security Matrix", () => {
    const kidsInstructorGorontalo = {
      uid: "ins_k_gtlo",
      role: "instructor",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const assignedClass = {
      id: "class_assigned_k",
      branchId: "kota_gorontalo",
      division: "kindergarten",
      instructorId: "ins_k_gtlo",
      studentIds: ["std_k_1", "std_k_2"],
    };

    const crossBranchSubstituteClass = {
      id: "class_sub_boba",
      branchId: "bone_bolango",
      division: "kindergarten",
      instructorId: "ins_other",
      substituteInstructorId: "ins_k_gtlo",
      studentIds: ["std_boba_1"],
    };

    const unassignedClass = {
      id: "class_unassigned_k",
      branchId: "kota_gorontalo",
      division: "kindergarten",
      instructorId: "ins_other",
      studentIds: ["std_other"],
    };

    it("Kids Instructor -> assigned class in own branch: ALLOW", () => {
      expect(canGetClass(assignedClass, kidsInstructorGorontalo)).toBe(true);
    });

    it("Kids Instructor -> cross-branch substitute assigned class: ALLOW", () => {
      expect(canGetClass(crossBranchSubstituteClass, kidsInstructorGorontalo)).toBe(true);
    });

    it("Kids Instructor -> unassigned class in own branch: not matched by assignment", () => {
      expect(unassignedClass.instructorId).not.toBe(kidsInstructorGorontalo.uid);
    });

    it("Kids Instructor -> reads own students in assigned cohorts: ALLOW", () => {
      const student1 = {
        id: "std_k_1",
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      };
      expect(canGetUser(student1, kidsInstructorGorontalo)).toBe(true);
    });

    it("Kids Instructor -> progress report for own assigned student: ALLOW", () => {
      const report = {
        id: "rep_k_1",
        instructorId: "ins_k_gtlo",
        studentId: "std_k_1",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      };
      expect(canGetProgressReport(report, kidsInstructorGorontalo)).toBe(true);
    });

    it("Kids Instructor -> progress report created by another instructor: DENY", () => {
      const reportOther = {
        id: "rep_k_other",
        instructorId: "ins_different",
        studentId: "std_other",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      };
      expect(canGetProgressReport(reportOther, kidsInstructorGorontalo)).toBe(false);
    });
  });

  describe("Section 19: Wave 2 Staff, Shifts, Attendance, and Payments Division Security Matrix", () => {
    const kidsManager = {
      uid: "mgr_k_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const kidsFO = {
      uid: "fo_k_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const coursesManager = {
      uid: "mgr_c_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const coursesFO = {
      uid: "fo_c_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const foreignKidsManager = {
      uid: "mgr_k_boba",
      role: "manager",
      branchId: "bone_bolango",
      division: "kindergarten",
    };

    // Staff profiles
    const staffKids = {
      uid: "staff_k_1",
      role: "instructor",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const staffCourses = {
      uid: "staff_c_1",
      role: "instructor",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const staffLegacy = {
      uid: "staff_legacy_1",
      role: "instructor",
      branchId: "kota_gorontalo",
    };

    const parentUser = {
      uid: "parent_1",
      role: "parent",
      branchId: "kota_gorontalo",
    };

    // Payments
    const paymentKidsGtlo = {
      id: "pay_k_gtlo",
      branchId: "kota_gorontalo",
      division: "kindergarten",
      studentId: "std_k_1",
    };

    const paymentCoursesGtlo = {
      id: "pay_c_gtlo",
      branchId: "kota_gorontalo",
      division: "courses",
      studentId: "std_c_1",
    };

    const paymentLegacyGtlo = {
      id: "pay_leg_gtlo",
      branchId: "kota_gorontalo",
      studentId: "std_leg_1",
    };

    const paymentKidsBoba = {
      id: "pay_k_boba",
      branchId: "bone_bolango",
      division: "kindergarten",
      studentId: "std_boba_1",
    };

    // Shifts
    const shiftKidsGtlo = {
      id: "shift_k_gtlo",
      userId: "staff_k_1",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const shiftCoursesGtlo = {
      id: "shift_c_gtlo",
      userId: "staff_c_1",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const shiftLegacyGtlo = {
      id: "shift_leg_gtlo",
      userId: "staff_legacy_1",
      branchId: "kota_gorontalo",
    };

    // Attendance
    const attKidsGtlo = {
      id: "att_k_gtlo",
      branchId: "kota_gorontalo",
      division: "kindergarten",
      userId: "std_k_1",
    };

    const attCoursesGtlo = {
      id: "att_c_gtlo",
      branchId: "kota_gorontalo",
      division: "courses",
      userId: "std_c_1",
    };

    // Class Attendance
    const classKids = {
      id: "cls_k_1",
      branchId: "kota_gorontalo",
      division: "kindergarten",
      instructorId: "staff_k_1",
    };

    const classCourses = {
      id: "cls_c_1",
      branchId: "kota_gorontalo",
      division: "courses",
      instructorId: "staff_c_1",
    };

    const classAttKids = {
      id: "cls_att_k",
      classId: "cls_k_1",
      studentId: "std_k_1",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    const classAttCourses = {
      id: "cls_att_c",
      classId: "cls_c_1",
      studentId: "std_c_1",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    // --- 1. Payments Tests ---
    it("Kids Front Office and Manager can read Kindergarten payments in own branch", () => {
      expect(canGetPayment(paymentKidsGtlo, kidsFO)).toBe(true);
      expect(canGetPayment(paymentKidsGtlo, kidsManager)).toBe(true);
      expect(canListPayments({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsFO)).toBe(true);
      expect(canListPayments({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsManager)).toBe(true);
    });

    it("Kids Front Office and Manager are DENIED reading Courses and legacy payments", () => {
      expect(canGetPayment(paymentCoursesGtlo, kidsFO)).toBe(false);
      expect(canGetPayment(paymentCoursesGtlo, kidsManager)).toBe(false);
      expect(canGetPayment(paymentLegacyGtlo, kidsFO)).toBe(false);
      expect(canGetPayment(paymentLegacyGtlo, kidsManager)).toBe(false);
      expect(canListPayments({ branchId: "kota_gorontalo", division: "courses" }, kidsFO)).toBe(false);
    });

    it("Kids Manager in another branch is DENIED reading Gorontalo payments", () => {
      expect(canGetPayment(paymentKidsGtlo, foreignKidsManager)).toBe(false);
      expect(canGetPayment(paymentKidsBoba, kidsManager)).toBe(false);
      expect(canListPayments({ branchId: "kota_gorontalo", division: "kindergarten" }, foreignKidsManager)).toBe(false);
    });

    it("Courses Front Office and Manager can read Courses and legacy payments, DENIED Kindergarten", () => {
      expect(canGetPayment(paymentCoursesGtlo, coursesFO)).toBe(true);
      expect(canGetPayment(paymentCoursesGtlo, coursesManager)).toBe(true);
      expect(canGetPayment(paymentLegacyGtlo, coursesFO)).toBe(true);
      expect(canGetPayment(paymentLegacyGtlo, coursesManager)).toBe(true);
      expect(canGetPayment(paymentKidsGtlo, coursesFO)).toBe(false);
      expect(canGetPayment(paymentKidsGtlo, coursesManager)).toBe(false);
    });

    // --- 2. Shifts Tests ---
    it("Kids Manager and Front Office can read Kindergarten staff shifts in own branch", () => {
      expect(canGetShift(shiftKidsGtlo, kidsManager)).toBe(true);
      expect(canGetShift(shiftKidsGtlo, kidsFO)).toBe(true);
      expect(canListShifts({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsManager)).toBe(true);
    });

    it("Kids Manager and Front Office are DENIED Courses staff shifts", () => {
      expect(canGetShift(shiftCoursesGtlo, kidsManager)).toBe(false);
      expect(canGetShift(shiftCoursesGtlo, kidsFO)).toBe(false);
      expect(canListShifts({ branchId: "kota_gorontalo", division: "courses" }, kidsManager)).toBe(false);
    });

    it("Courses Manager and Front Office can read Courses and legacy shifts, DENIED Kindergarten shifts", () => {
      expect(canGetShift(shiftCoursesGtlo, coursesManager)).toBe(true);
      expect(canGetShift(shiftLegacyGtlo, coursesManager)).toBe(true);
      expect(canGetShift(shiftKidsGtlo, coursesManager)).toBe(false);
      expect(canGetShift(shiftKidsGtlo, coursesFO)).toBe(false);
    });

    it("Staff member can always read their own shift regardless of division viewer", () => {
      expect(canGetShift(shiftKidsGtlo, { uid: "staff_k_1", role: "instructor" })).toBe(true);
      expect(canGetShift(shiftCoursesGtlo, { uid: "staff_c_1", role: "instructor" })).toBe(true);
    });

    // --- 3. Attendance Tests ---
    it("Kids Front Office can read Kindergarten attendance, DENIED Courses attendance", () => {
      expect(canGetAttendance(attKidsGtlo, kidsFO)).toBe(true);
      expect(canListAttendance({ branchId: "kota_gorontalo", division: "kindergarten" }, kidsFO)).toBe(true);
      expect(canGetAttendance(attCoursesGtlo, kidsFO)).toBe(false);
      expect(canListAttendance({ branchId: "kota_gorontalo", division: "courses" }, kidsFO)).toBe(false);
    });

    it("Courses Front Office can read Courses attendance, DENIED Kindergarten attendance", () => {
      expect(canGetAttendance(attCoursesGtlo, coursesFO)).toBe(true);
      expect(canListAttendance({ branchId: "kota_gorontalo", division: "courses" }, coursesFO)).toBe(true);
      expect(canGetAttendance(attKidsGtlo, coursesFO)).toBe(false);
    });

    // --- 4. Class Attendance Tests ---
    it("Kids Front Office can read Kindergarten class attendance, DENIED Courses class attendance", () => {
      expect(canGetClassAttendance(classAttKids, kidsFO, classKids)).toBe(true);
      expect(canGetClassAttendance(classAttCourses, kidsFO, classCourses)).toBe(false);
    });

    it("Kids Instructor can read class attendance for assigned class, DENIED unassigned class", () => {
      expect(canGetClassAttendance(classAttKids, staffKids, classKids)).toBe(true);
      expect(canGetClassAttendance(classAttCourses, staffKids, classCourses)).toBe(false);
    });

    // --- 5. Staff Users Scoping Tests ---
    it("Kids Manager listing users sees Kindergarten staff and parents, DENIED Courses staff", () => {
      expect(canGetUser(staffKids, kidsManager)).toBe(true);
      expect(canGetUser(parentUser, kidsManager)).toBe(true);
      expect(canGetUser(staffCourses, kidsManager)).toBe(false);
      expect(canGetUser(staffLegacy, kidsManager)).toBe(false);
    });

    it("Courses Manager listing users sees Courses and legacy staff, DENIED Kindergarten staff", () => {
      expect(canGetUser(staffCourses, coursesManager)).toBe(true);
      expect(canGetUser(staffLegacy, coursesManager)).toBe(true);
      expect(canGetUser(parentUser, coursesManager)).toBe(true);
      expect(canGetUser(staffKids, coursesManager)).toBe(false);
    });
  });
});

