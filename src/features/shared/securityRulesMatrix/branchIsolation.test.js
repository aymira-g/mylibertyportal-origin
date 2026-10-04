import { describe, it, expect } from "vitest";
import {
  isStaff,
  isSameBranch,
  isAdmin,
  isManager,
  isFrontOffice,
  userBranch,
} from "./securityRulesMatrix.helpers.js";
import {
  adminUser,
  managerGorontalo,
  managerBoneBolango,
  foGorontalo,
  foBoneBolango,
  instructorLeaderGorontalo,
  instructorGorontalo,
} from "./securityRulesMatrix.fixtures.js";

describe("Branch Isolation & Boundary Protection Security Matrix", () => {
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
});
