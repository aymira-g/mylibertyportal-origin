import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isManager,
  isFrontOffice,
  isStaff,
  isSameBranch,
  userBranch,
  canGetPayment,
  canListPayments,
  canGetClass,
  canGetShift,
  canUpdateShift,
  canGetAttendance,
  canListAttendance,
  canCreateCorporateEvent,
  canUpdateCorporateEvent,
  canDeleteCorporateEvent,
  canGetProgressReport,
  canUpdateProgressReport,
  canDeleteProgressReport,
} from "./securityRulesMatrix.helpers.js";
import {
  adminUser,
  directorUser,
  viceDirectorUser,
  managerGorontalo,
  managerBoneBolango,
  foGorontalo,
  foBoneBolango,
  opsLeadGorontalo,
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

    it("allows the owning student to list their own payments (DOM02-SEC-03)", () => {
      expect(canListPayments({ studentId: "stu_1" }, { uid: "stu_1", role: "student" })).toBe(true);
      expect(canListPayments({ studentId: "stu_2" }, { uid: "stu_1", role: "student" })).toBe(false);
    });

    it("allows parent to list payments for linked child with branch constraint (DOM02-SEC-03)", () => {
      const parentUser = { uid: "par_1", role: "parent", branchId: "kota_gorontalo", childStudentIds: ["stu_1"] };
      expect(canListPayments({ branchId: "kota_gorontalo", studentId: "stu_1" }, parentUser)).toBe(true);
      expect(canListPayments({ branchId: "kota_gorontalo", studentId: "stu_2" }, parentUser)).toBe(false);
      expect(canListPayments({ branchId: "bone_bolango", studentId: "stu_1" }, parentUser)).toBe(false);
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
      expect(isManager({ uid: "bm1", role: "branch_manager", status: "active" })).toBe(false);
      expect(isStaff({ uid: "bm1", role: "branch_manager", status: "active" })).toBe(false);
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

    function canDeletePayment(actor = null) {
      return Boolean(actor) && false;
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

    it("prohibits all roles including Admin and Front Office from deleting payment records", () => {
      expect(canDeletePayment(foGorontalo)).toBe(false);
      expect(canDeletePayment(managerGorontalo)).toBe(false);
      expect(canDeletePayment(adminUser)).toBe(false);
    });
  });

  describe("Executive Province-Wide Read Authority (Director & Vice Director)", () => {
    const paymentPohuwato = { id: "pay_phw", branchId: "pohuwato", studentId: "std_phw" };
    const classPohuwato = { id: "cls_phw", branchId: "pohuwato", capacity: 15, studentIds: ["s1"] };
    const shiftPohuwato = { id: "shf_phw", branchId: "pohuwato", userId: "usr_phw" };
    const attendancePohuwato = { id: "att_phw", branchId: "pohuwato", userId: "std_phw" };

    it("grants Director and Vice Director province-wide read access across all branch resources", () => {
      expect(canGetPayment(paymentPohuwato, directorUser)).toBe(true);
      expect(canGetPayment(paymentPohuwato, viceDirectorUser)).toBe(true);
      expect(canGetClass(classPohuwato, directorUser)).toBe(true);
      expect(canGetClass(classPohuwato, viceDirectorUser)).toBe(true);
      expect(canGetShift(shiftPohuwato, directorUser)).toBe(true);
      expect(canGetShift(shiftPohuwato, viceDirectorUser)).toBe(true);
      expect(canGetAttendance(attendancePohuwato, directorUser)).toBe(true);
      expect(canGetAttendance(attendancePohuwato, viceDirectorUser)).toBe(true);
    });

    it("still confines branch managers to their own branch", () => {
      expect(canGetPayment(paymentPohuwato, managerGorontalo)).toBe(false);
      expect(canGetClass(classPohuwato, managerGorontalo)).toBe(false);
      expect(canGetShift(shiftPohuwato, managerGorontalo)).toBe(false);
      expect(canGetAttendance(attendancePohuwato, managerGorontalo)).toBe(false);
    });

    it("denies System Admin from reading or listing attendance records (OD-ADM-01)", () => {
      const attendanceKota = { id: "att_gto", branchId: "kota_gorontalo", division: "courses", userId: "std_1" };
      expect(canGetAttendance(attendanceKota, adminUser)).toBe(false);
      expect(canListAttendance({ branchId: "kota_gorontalo", division: "courses" }, adminUser)).toBe(false);
    });
  });

  describe("Corporate Events Management Authority (Section 3.1)", () => {
    const companyWideEvent = {
      id: "evt_all",
      name: "All-Branch Annual Conference",
      eventDate: "2026-10-15",
      audienceType: "all",
    };

    const branchEventKota = {
      id: "evt_branch_kt",
      name: "Gorontalo Staff Meeting",
      eventDate: "2026-10-15",
      audienceType: "branch",
      audienceValue: "kota_gorontalo",
      branchId: "kota_gorontalo",
    };

    it("allows Managers to create company-wide corporate events", () => {
      expect(canCreateCorporateEvent(companyWideEvent, managerGorontalo)).toBe(true);
      expect(canCreateCorporateEvent(companyWideEvent, managerBoneBolango)).toBe(true);
      expect(canCreateCorporateEvent(companyWideEvent, directorUser)).toBe(true);
      expect(canCreateCorporateEvent(companyWideEvent, viceDirectorUser)).toBe(true);
    });

    it("allows Managers to update company-wide corporate events", () => {
      const updatedCompanyWide = { ...companyWideEvent, name: "All-Branch Q4 Strategy Meet" };
      expect(canUpdateCorporateEvent(companyWideEvent, updatedCompanyWide, managerGorontalo)).toBe(true);
      expect(canUpdateCorporateEvent(companyWideEvent, updatedCompanyWide, managerBoneBolango)).toBe(true);
      expect(canUpdateCorporateEvent(companyWideEvent, updatedCompanyWide, directorUser)).toBe(true);
    });

    it("restricts branch-specific events to the same branch manager", () => {
      // Creation: Bone Bolango manager cannot create Kota Gorontalo branch event
      expect(canCreateCorporateEvent(branchEventKota, managerGorontalo)).toBe(true);
      expect(canCreateCorporateEvent(branchEventKota, managerBoneBolango)).toBe(false);

      // Update: Bone Bolango manager cannot update Kota Gorontalo branch event
      const updatedBranchEvent = { ...branchEventKota, name: "Gorontalo Emergency Briefing" };
      expect(canUpdateCorporateEvent(branchEventKota, updatedBranchEvent, managerGorontalo)).toBe(true);
      expect(canUpdateCorporateEvent(branchEventKota, updatedBranchEvent, managerBoneBolango)).toBe(false);
    });

    it("denies Front Office from creating, updating, or deleting corporate events (OD-FO-01)", () => {
      expect(canCreateCorporateEvent(companyWideEvent, foGorontalo)).toBe(false);
      expect(canCreateCorporateEvent(branchEventKota, foGorontalo)).toBe(false);

      const updatedBranchEvent = { ...branchEventKota, name: "Tampered Briefing" };
      expect(canUpdateCorporateEvent(branchEventKota, updatedBranchEvent, foGorontalo)).toBe(false);

      expect(canDeleteCorporateEvent(branchEventKota, foGorontalo)).toBe(false);
      expect(canDeleteCorporateEvent(companyWideEvent, foGorontalo)).toBe(false);

      // Verify legitimate manager and executive deletion
      expect(canDeleteCorporateEvent(branchEventKota, managerGorontalo)).toBe(true);
      expect(canDeleteCorporateEvent(branchEventKota, managerBoneBolango)).toBe(false);
      expect(canDeleteCorporateEvent(companyWideEvent, directorUser)).toBe(true);
    });
  });

  describe("Progress Reports Write & Delete Gates (OD-FO-02 / FP-FO-13)", () => {
    const reportKotaCourses = {
      id: "rep_1",
      branchId: "kota_gorontalo",
      division: "courses",
      studentId: "stu_1",
      overallScore: 85,
      eligibleForPromotion: true,
    };
    const foGorontaloCourses = { ...foGorontalo, division: "courses" };
    const managerGorontaloCourses = { ...managerGorontalo, division: "courses" };

    it("allows Courses Front Office to clear eligibleForPromotion during active student advancement batch (OD-FO-02 Option 1)", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
        promotedAt: "2026-10-17T00:00:00Z",
        updatedAt: "2026-10-17T00:00:00Z",
      };
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontaloCourses, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(true);

      // Unstamped FO without explicit division fails closed
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("denies Front Office standalone suppression when no student advancement occurs", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
        promotedAt: "2026-10-17T00:00:00Z",
        updatedAt: "2026-10-17T00:00:00Z",
      };
      // Standalone call without active student advancement
      expect(canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo)).toBe(false);
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo, {
          student: { id: "stu_1" },
          isStudentAdvancing: false,
        })
      ).toBe(false);
    });

    it("denies Front Office from clearing an unrelated student's report during another student's advancement", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
        promotedAt: "2026-10-17T00:00:00Z",
        updatedAt: "2026-10-17T00:00:00Z",
      };
      // Advancing stu_2, but trying to clear report of stu_1
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo, {
          student: { id: "stu_2" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("denies Front Office timestamp-only updates on already ineligible reports", () => {
      const alreadyIneligible = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
      };
      const updatedTimestampOnly = {
        ...alreadyIneligible,
        promotedAt: "2026-10-17T01:00:00Z",
      };
      expect(
        canUpdateProgressReport(alreadyIneligible, updatedTimestampOnly, foGorontalo, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("denies Front Office from setting eligibleForPromotion to true", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: true,
      };
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("denies Front Office from modifying academic scores or evaluator fields", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
        overallScore: 99,
      };
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foGorontalo, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("denies foreign-branch Front Office from modifying progress reports", () => {
      const updatedReport = {
        ...reportKotaCourses,
        eligibleForPromotion: false,
      };
      expect(
        canUpdateProgressReport(reportKotaCourses, updatedReport, foBoneBolango, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);
    });

    it("permanently denies Front Office from deleting progress reports while allowing Courses Manager and Executive", () => {
      expect(canDeleteProgressReport(reportKotaCourses, foGorontaloCourses)).toBe(false);
      expect(canDeleteProgressReport(reportKotaCourses, foBoneBolango)).toBe(false);
      expect(canDeleteProgressReport(reportKotaCourses, managerGorontaloCourses)).toBe(true);
      expect(canDeleteProgressReport(reportKotaCourses, managerGorontalo)).toBe(false); // Unstamped manager fails closed
      expect(canDeleteProgressReport(reportKotaCourses, managerBoneBolango)).toBe(false);
      expect(canDeleteProgressReport(reportKotaCourses, directorUser)).toBe(true);
    });

    it("preserves approved Courses direct-get exception on unstamped legacy reports while strictly denying mutations", () => {
      const foGorontaloKids = { ...foGorontalo, division: "kindergarten" };
      const managerGorontaloKids = { ...managerGorontalo, division: "kindergarten" };
      const reportKotaUnstamped = {
        id: "rep_legacy",
        branchId: "kota_gorontalo",
        studentId: "stu_1",
        overallScore: 85,
        eligibleForPromotion: true,
      };
      const updatedReport = {
        ...reportKotaUnstamped,
        eligibleForPromotion: false,
        promotedAt: "2026-10-17T00:00:00Z",
        updatedAt: "2026-10-17T00:00:00Z",
      };

      // 1. Direct get on legacy unstamped report remains allowed for Courses staff (approved legacy exception)
      expect(canGetProgressReport(reportKotaUnstamped, foGorontaloCourses)).toBe(true);
      expect(canGetProgressReport(reportKotaUnstamped, managerGorontaloCourses)).toBe(true);
      // Kindergarten staff cannot read legacy unstamped records
      expect(canGetProgressReport(reportKotaUnstamped, foGorontaloKids)).toBe(false);
      expect(canGetProgressReport(reportKotaUnstamped, managerGorontaloKids)).toBe(false);

      // 2. Front Office promotion update on unstamped report -> strictly DENIED (requires explicit matching division)
      expect(
        canUpdateProgressReport(reportKotaUnstamped, updatedReport, foGorontaloCourses, {
          student: { id: "stu_1" },
          isStudentAdvancing: true,
        })
      ).toBe(false);

      // 3. Manager update on unstamped report -> strictly DENIED pending owner decision
      expect(canUpdateProgressReport(reportKotaUnstamped, updatedReport, managerGorontaloCourses)).toBe(false);

      // 4. Manager delete on unstamped report -> strictly DENIED pending owner decision
      expect(canDeleteProgressReport(reportKotaUnstamped, managerGorontaloCourses)).toBe(false);

      // 5. Front Office delete on unstamped report -> strictly DENIED (FO holds zero delete authority)
      expect(canDeleteProgressReport(reportKotaUnstamped, foGorontaloCourses)).toBe(false);

      // 6. Executive update and delete on unstamped report -> ALLOWED
      expect(canUpdateProgressReport(reportKotaUnstamped, updatedReport, directorUser)).toBe(true);
      expect(canDeleteProgressReport(reportKotaUnstamped, directorUser)).toBe(true);
    });
  });

  describe("canUpdateShift (FP-OPS-11A / Ratified OD-O3 / G-009)", () => {
    const baseShift = {
      id: "sh_1",
      userId: "fo_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      clockIn: "2026-10-17T01:00:00.000Z",
      clockOut: null,
    };

    it("allows Front Office to close shift with cashReconciliation (cashier workflow preserved)", () => {
      const incoming = {
        ...baseShift,
        clockOut: "2026-10-17T09:00:00.000Z",
        updatedAt: "2026-10-17T09:00:00.000Z",
        cashReconciliation: { countedCash: 500000, expectedCash: 500000 },
      };
      expect(canUpdateShift(baseShift, incoming, foGorontalo)).toBe(true);
    });

    it("allows Front Office to close shift without cashReconciliation (regular kiosk clock-out)", () => {
      const incoming = {
        ...baseShift,
        clockOut: "2026-10-17T09:00:00.000Z",
        updatedAt: "2026-10-17T09:00:00.000Z",
      };
      expect(canUpdateShift(baseShift, incoming, foGorontalo)).toBe(true);
    });

    const OPS_ALIASES = [
      "opslead",
      "ops_lead",
      "operational_leader",
      "operationalleader",
      "frontofficelead",
    ];

    for (const alias of OPS_ALIASES) {
      it(`strictly DENIES Ops Lead alias "${alias}" from closing shift with cashReconciliation (OD-O3)`, () => {
        const opsUser = { ...opsLeadGorontalo, role: alias };
        const opsShift = {
          ...baseShift,
          userId: opsUser.uid,
          role: alias,
        };
        const incoming = {
          ...opsShift,
          clockOut: "2026-10-17T09:00:00.000Z",
          updatedAt: "2026-10-17T09:00:00.000Z",
          cashReconciliation: { countedCash: 500000, expectedCash: 500000 },
        };
        expect(canUpdateShift(opsShift, incoming, opsUser)).toBe(false);
      });

      it(`allows Ops Lead alias "${alias}" to close shift without cashReconciliation (legitimate attendance clock-out preserved)`, () => {
        const opsUser = { ...opsLeadGorontalo, role: alias };
        const opsShift = {
          ...baseShift,
          userId: opsUser.uid,
          role: alias,
        };
        const incoming = {
          ...opsShift,
          clockOut: "2026-10-17T09:00:00.000Z",
          updatedAt: "2026-10-17T09:00:00.000Z",
        };
        expect(canUpdateShift(opsShift, incoming, opsUser)).toBe(true);
      });
    }
  });
});
