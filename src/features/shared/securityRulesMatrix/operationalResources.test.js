import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isManager,
  isFrontOffice,
  isStaff,
  isSameBranch,
  userBranch,
  canGetPayment,
} from "./securityRulesMatrix.helpers.js";
import {
  adminUser,
  managerGorontalo,
  managerBoneBolango,
  foGorontalo,
  foBoneBolango,
  instructorGorontalo,
} from "./securityRulesMatrix.fixtures.js";

describe("Operational Resources Security Rules Matrix", () => {
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
    function isSameBranchStrictLocal(data, user) {
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
      if ((isManager(user) || user.role === "marketing") && isSameBranchStrictLocal(visit, user)) return true;
      return false;
    }

    function canCreateVisitCollectionGroup(visit, user) {
      if (!user) return false;
      const isAuthorizedRole =
        isAdmin(user) || ((isManager(user) || user.role === "marketing") && isSameBranchStrictLocal(visit, user));
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
      if ((isManager(user) || user.role === "marketing") && isSameBranchStrictLocal(visit, user)) return true;
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

    function canGetPaymentLocal(payment, user) {
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

      expect(canGetPaymentLocal(paymentKota, studentUser)).toBe(true);
      expect(canGetPaymentLocal(paymentKota, parentAlice)).toBe(true);
      expect(canGetPaymentLocal(paymentKota, parentBob)).toBe(false);
      expect(canGetPaymentLocal(paymentKota, strangerStudent)).toBe(false);
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
});
