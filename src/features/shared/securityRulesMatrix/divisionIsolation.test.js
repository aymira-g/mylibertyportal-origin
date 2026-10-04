import { describe, it, expect } from "vitest";
import {
  canGetClass,
  canListClasses,
  canGetApplication,
  canListApplications,
  canGetProgressReport,
  canListProgressReports,
  canGetUser,
  canListUsers,
  canCreateUser,
  canUpdateUser,
  canDeleteUser,
  canGetPayment,
  canListPayments,
  canGetShift,
  canListShifts,
  canGetAttendance,
  canListAttendance,
  canGetClassAttendance,
} from "./securityRulesMatrix.helpers.js";

describe("Division Isolation Security Matrix (Kindergarten vs Courses vs division='all')", () => {
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

  describe("Section 21: Cross-Divisional (division='all') Authorization & Isolation Matrix", () => {
    const admin = {
      uid: "admin_super",
      role: "admin",
      branchId: "kota_gorontalo",
    };

    const allManagerGorontalo = {
      uid: "all_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "all",
    };

    const allFOGorontalo = {
      uid: "all_fo_gtlo",
      role: "frontoffice",
      branchId: "kota_gorontalo",
      division: "all",
    };

    const coursesManagerGorontalo = {
      uid: "courses_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const kidsManagerGorontalo = {
      uid: "kids_mgr_gtlo",
      role: "manager",
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };

    // Documents in Kota Gorontalo
    const classKidsGtlo = { id: "c_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const classCoursesGtlo = { id: "c_c_gtlo", branchId: "kota_gorontalo", division: "courses" };
    const classLegacyGtlo = { id: "c_legacy_gtlo", branchId: "kota_gorontalo" };

    const appKidsGtlo = { id: "a_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const appCoursesGtlo = { id: "a_c_gtlo", branchId: "kota_gorontalo", division: "courses" };

    const studentKidsGtlo = { id: "s_k_gtlo", role: "student", branchId: "kota_gorontalo", division: "kindergarten" };
    const studentCoursesGtlo = { id: "s_c_gtlo", role: "student", branchId: "kota_gorontalo", division: "courses" };

    const paymentKidsGtlo = { id: "p_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten", studentId: "s_k_gtlo" };
    const paymentCoursesGtlo = { id: "p_c_gtlo", branchId: "kota_gorontalo", division: "courses", studentId: "s_c_gtlo" };

    // Foreign branch documents (Bone Bolango)
    const classKidsBoba = { id: "c_k_boba", branchId: "bone_bolango", division: "kindergarten" };
    const classCoursesBoba = { id: "c_c_boba", branchId: "bone_bolango", division: "courses" };
    const studentKidsBoba = { id: "s_k_boba", role: "student", branchId: "bone_bolango", division: "kindergarten" };
    const studentCoursesBoba = { id: "s_c_boba", role: "student", branchId: "bone_bolango", division: "courses" };

    it("1. division='all' Manager can access BOTH Kindergarten and Courses docs in own branch", () => {
      // Classes
      expect(canGetClass(classKidsGtlo, allManagerGorontalo)).toBe(true);
      expect(canGetClass(classCoursesGtlo, allManagerGorontalo)).toBe(true);
      expect(canGetClass(classLegacyGtlo, allManagerGorontalo)).toBe(true);
      expect(canListClasses({ branchId: "kota_gorontalo" }, allManagerGorontalo)).toBe(true);

      // Applications
      expect(canGetApplication(appKidsGtlo, allManagerGorontalo)).toBe(true);
      expect(canGetApplication(appCoursesGtlo, allManagerGorontalo)).toBe(true);

      // Progress Reports
      expect(canGetProgressReport({ id: "pr_k", branchId: "kota_gorontalo", division: "kindergarten" }, allManagerGorontalo)).toBe(true);
      expect(canGetProgressReport({ id: "pr_c", branchId: "kota_gorontalo", division: "courses" }, allManagerGorontalo)).toBe(true);

      // Students
      expect(canGetUser(studentKidsGtlo, allManagerGorontalo)).toBe(true);
      expect(canGetUser(studentCoursesGtlo, allManagerGorontalo)).toBe(true);

      // Shifts & Attendance
      expect(canGetShift({ id: "sh_k", branchId: "kota_gorontalo", division: "kindergarten" }, allManagerGorontalo)).toBe(true);
      expect(canGetShift({ id: "sh_c", branchId: "kota_gorontalo", division: "courses" }, allManagerGorontalo)).toBe(true);
    });

    it("2. division='all' Front Office can access and create BOTH Kindergarten and Courses docs in own branch", () => {
      // Get students
      expect(canGetUser(studentKidsGtlo, allFOGorontalo)).toBe(true);
      expect(canGetUser(studentCoursesGtlo, allFOGorontalo)).toBe(true);

      // Create students in both divisions
      expect(
        canCreateUser(
          { role: "student", branchId: "kota_gorontalo", division: "kindergarten", displayName: "KG Child" },
          allFOGorontalo
        )
      ).toBe(true);
      expect(
        canCreateUser(
          { role: "student", branchId: "kota_gorontalo", division: "courses", displayName: "Course Teen" },
          allFOGorontalo
        )
      ).toBe(true);

      // Payments
      expect(canGetPayment(paymentKidsGtlo, allFOGorontalo)).toBe(true);
      expect(canGetPayment(paymentCoursesGtlo, allFOGorontalo)).toBe(true);
    });

    it("3. Branch isolation remains strictly enforced for division='all' users (CANNOT access foreign branch)", () => {
      // Manager cannot access Bone Bolango classes or students
      expect(canGetClass(classKidsBoba, allManagerGorontalo)).toBe(false);
      expect(canGetClass(classCoursesBoba, allManagerGorontalo)).toBe(false);
      expect(canGetUser(studentKidsBoba, allManagerGorontalo)).toBe(false);
      expect(canGetUser(studentCoursesBoba, allManagerGorontalo)).toBe(false);

      // Front Office cannot create or access Bone Bolango records
      expect(canGetUser(studentKidsBoba, allFOGorontalo)).toBe(false);
      expect(
        canCreateUser(
          { role: "student", branchId: "bone_bolango", division: "kindergarten", displayName: "KG Child" },
          allFOGorontalo
        )
      ).toBe(false);
    });

    it("4. Single-division users CANNOT cross divisions (isolation preserved)", () => {
      // Courses Manager cannot read Kindergarten
      expect(canGetClass(classKidsGtlo, coursesManagerGorontalo)).toBe(false);
      expect(canGetApplication(appKidsGtlo, coursesManagerGorontalo)).toBe(false);
      expect(canGetUser(studentKidsGtlo, coursesManagerGorontalo)).toBe(false);

      // Kindergarten Manager cannot read Courses
      expect(canGetClass(classCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canGetApplication(appCoursesGtlo, kidsManagerGorontalo)).toBe(false);
      expect(canGetUser(studentCoursesGtlo, kidsManagerGorontalo)).toBe(false);
    });

    it("5. Admin behavior remains completely unrestricted across branches and divisions", () => {
      expect(canGetClass(classKidsGtlo, admin)).toBe(true);
      expect(canGetClass(classCoursesGtlo, admin)).toBe(true);
      expect(canGetClass(classKidsBoba, admin)).toBe(true);
      expect(canGetClass(classCoursesBoba, admin)).toBe(true);
      expect(canGetUser(studentKidsBoba, admin)).toBe(true);
      expect(canGetUser(studentCoursesBoba, admin)).toBe(true);
    });

    it("6. Role hierarchy permissions remain intact for division='all' users", () => {
      // Front Office with division='all' still CANNOT delete managers or instructors
      expect(
        canDeleteUser(
          { role: "instructor", branchId: "kota_gorontalo", division: "courses" },
          allFOGorontalo
        )
      ).toBe(false);

      // Front Office with division='all' still CANNOT create staff users directly
      expect(
        canCreateUser(
          { role: "instructor", branchId: "kota_gorontalo", division: "courses", displayName: "Instructor" },
          allFOGorontalo
        )
      ).toBe(false);
    });
  });

  describe("Section 3.1: Marketing Division Isolation (Strict Kindergarten Shielding)", () => {
    const marketingCourseGorontalo = {
      uid: "mkt_courses_gtlo",
      role: "marketing",
      branchId: "kota_gorontalo",
      division: "courses",
    };

    const marketingLegacyGorontalo = {
      uid: "mkt_legacy_gtlo",
      role: "marketing",
      branchId: "kota_gorontalo",
    };

    const appKidsGtlo = { id: "a_k_gtlo", branchId: "kota_gorontalo", division: "kindergarten" };
    const appCoursesGtlo = { id: "a_c_gtlo", branchId: "kota_gorontalo", division: "courses" };

    it("allows Course Marketing to access same-branch course applications", () => {
      expect(canGetApplication(appCoursesGtlo, marketingCourseGorontalo)).toBe(true);
      expect(canListApplications(appCoursesGtlo, marketingCourseGorontalo)).toBe(true);
    });

    it("strictly blocks Course Marketing from reading or listing Kindergarten applications", () => {
      expect(canGetApplication(appKidsGtlo, marketingCourseGorontalo)).toBe(false);
      expect(canListApplications(appKidsGtlo, marketingCourseGorontalo)).toBe(false);
    });

    it("strictly blocks Legacy/Default Marketing from reading or listing Kindergarten applications", () => {
      expect(canGetApplication(appKidsGtlo, marketingLegacyGorontalo)).toBe(false);
      expect(canListApplications(appKidsGtlo, marketingLegacyGorontalo)).toBe(false);
    });
  });
});
