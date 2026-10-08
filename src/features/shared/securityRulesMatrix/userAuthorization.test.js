import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isManager,
  isFrontOffice,
  isStaff,
  isParent,
  isParentOf,
  isSameBranch,
  canGetUser,
  canUpdateUser,
  canDeleteUser,
} from "./securityRulesMatrix.helpers.js";
import { directorUser } from "./securityRulesMatrix.fixtures.js";

describe("User & Parent/Student Authorization Rules Matrix", () => {
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

    // NOTE: this file previously defined its own local `canGetUser`, which had drifted from both
    // firestore.rules and the shared mirror (it let a manager read any same-branch user and omitted
    // the division check). It now uses the shared, authoritative `canGetUser` import so the matrix
    // cannot silently disagree with the rules it is supposed to mirror.

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

    it("lets Front Office read operational staff but denies peers, leadership and executives", () => {
      const opsLeadGto = { uid: "ol_1", role: "opslead", branchId: "kota_gorontalo", division: "all" };
      const managerGto = { uid: "mgr_1", role: "manager", branchId: "kota_gorontalo", division: "all" };
      const foKg = { uid: "fo_kg", role: "frontoffice", branchId: "kota_gorontalo", division: "kindergarten" };

      const peerFrontOffice = { id: "fo_peer", role: "frontoffice", branchId: "kota_gorontalo" };
      const officeBoy = { id: "ob_1", role: "officeboy", branchId: "kota_gorontalo" };
      const cleanerDoc = { id: "cl_1", role: "cleaner", branchId: "kota_gorontalo" };
      const marketing = { id: "mkt_1", role: "marketing", branchId: "kota_gorontalo" };
      const opsLeadDoc = { id: "ol_doc", role: "opslead", branchId: "kota_gorontalo" };
      const managerDoc = { id: "mgr_doc", role: "manager", branchId: "kota_gorontalo" };
      const directorDoc = { id: "dir_1", role: "director", branchId: "kota_gorontalo" };

      // Academic / student records Front Office legitimately needs.
      expect(canGetUser({ id: "ins_1", role: "instructor", branchId: "kota_gorontalo" }, foGto)).toBe(true);
      expect(canGetUser({ id: "student_1", role: "student", branchId: "kota_gorontalo" }, foGto)).toBe(true);
      expect(canGetUser({ id: "parent_a", role: "parent", branchId: "kota_gorontalo" }, foGto)).toBe(true);

      // Branch-level operational staff (facilities / kiosk) are visible to Front Office.
      expect(canGetUser(officeBoy, foGto)).toBe(true);
      expect(canGetUser(cleanerDoc, foGto)).toBe(true);
      // Operational staff are branch-level, so the division filter does not block them.
      expect(canGetUser(officeBoy, foKg)).toBe(true);

      // Peers, marketing, operational leadership, managers and executives are NOT.
      expect(canGetUser(peerFrontOffice, foGto)).toBe(false);
      expect(canGetUser(marketing, foGto)).toBe(false);
      expect(canGetUser(opsLeadDoc, foGto)).toBe(false);
      expect(canGetUser(managerDoc, foGto)).toBe(false);
      expect(canGetUser(directorDoc, foGto)).toBe(false);

      // Branch isolation is unaffected.
      expect(canGetUser({ id: "ins_boba", role: "instructor", branchId: "bone_bolango" }, foGto)).toBe(false);
      expect(canGetUser({ id: "ob_boba", role: "officeboy", branchId: "bone_bolango" }, foGto)).toBe(false);

      // Operational / division leadership keeps its broader branch staff oversight.
      expect(canGetUser(peerFrontOffice, opsLeadGto)).toBe(true);
      expect(canGetUser(officeBoy, managerGto)).toBe(true);
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

  describe("Executive Account Protection against Deletion and Disabling", () => {
    const adminActor = { uid: "admin_1", role: "admin", branchId: "kota_gorontalo" };
    const directorDoc = { uid: "director_1", role: "director", branchId: "kota_gorontalo" };
    const viceDirectorDoc = { uid: "vice_1", role: "vice_director", branchId: "kota_gorontalo" };
    const regularStaffDoc = { uid: "ins_1", role: "instructor", branchId: "kota_gorontalo" };

    it("prevents Admin from deleting Director, Vice Director, or Admin accounts", () => {
      expect(canDeleteUser(directorDoc, adminActor)).toBe(false);
      expect(canDeleteUser(viceDirectorDoc, adminActor)).toBe(false);
      expect(canDeleteUser(adminActor, adminActor)).toBe(false);
      expect(canDeleteUser(regularStaffDoc, adminActor)).toBe(true);
    });

    it("prevents Admin from disabling Director or Vice Director via status update", () => {
      // Setting status to terminated or resigned on Director is blocked for Admin
      expect(canUpdateUser(directorDoc, { status: "terminated" }, adminActor)).toBe(false);
      expect(canUpdateUser(directorDoc, { status: "resigned" }, adminActor)).toBe(false);
      expect(canUpdateUser(viceDirectorDoc, { status: "terminated" }, adminActor)).toBe(false);
      expect(canUpdateUser(viceDirectorDoc, { status: "resigned" }, adminActor)).toBe(false);

      // Normal field updates or non-executive staff updates are allowed for Admin
      expect(canUpdateUser(directorDoc, { displayName: "Director Updated" }, adminActor)).toBe(true);
      expect(canUpdateUser(regularStaffDoc, { status: "terminated" }, adminActor)).toBe(true);

      // Director can manage executive statuses
      expect(canUpdateUser(viceDirectorDoc, { status: "terminated" }, directorUser)).toBe(true);
    });
  });

  describe("Ops Lead vs Front Office Student Mutation Boundary (Blueprint §6.8 / §6.10)", () => {
    const foStaff = { uid: "fo_1", role: "frontoffice", branchId: "kota_gorontalo" };
    const opsLead = { uid: "ops_1", role: "opslead", branchId: "kota_gorontalo" };
    const studentDoc = { id: "std_1", role: "student", branchId: "kota_gorontalo", division: "courses" };

    it("permits Front Office receptionist to update student within branch, but blocks Ops Lead", () => {
      // FO receptionist can update student profile
      expect(canUpdateUser(studentDoc, { role: "student", branchId: "kota_gorontalo", division: "courses", displayName: "Updated Student" }, foStaff)).toBe(true);

      // Ops Lead has read-only oversight: direct update blocked
      expect(canUpdateUser(studentDoc, { role: "student", branchId: "kota_gorontalo", division: "courses", displayName: "Updated Student" }, opsLead)).toBe(false);
    });

    it("permits Front Office receptionist to delete student within branch, but blocks Ops Lead", () => {
      // FO receptionist can delete student
      expect(canDeleteUser(studentDoc, foStaff)).toBe(true);

      // Ops Lead cannot delete student
      expect(canDeleteUser(studentDoc, opsLead)).toBe(false);
    });
  });
});
