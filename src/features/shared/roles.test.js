import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRole,
  normalizeRoleAlias,
  isFrontOfficeRole,
  isInstructorRole,
  isManagerRole,
  isParentRole,
  isStudentRole,
  isStaffRole,
  STAFF_ROLES,
} from "./roles";

describe("roles.js - Centralized Role Normalization", () => {
  it("defines all expected canonical roles", () => {
    expect(CANONICAL_ROLES.ADMIN).toBe("admin");
    expect(CANONICAL_ROLES.MANAGER).toBe("manager");
    expect(CANONICAL_ROLES.INSTRUCTOR).toBe("instructor");
    expect(CANONICAL_ROLES.INSTRUCTOR_LEADER).toBe("instructorleader");
    expect(CANONICAL_ROLES.FRONT_OFFICE).toBe("frontoffice");
    expect(CANONICAL_ROLES.OPS_LEAD).toBe("opslead");
    expect(CANONICAL_ROLES.MARKETING).toBe("marketing");
    expect(CANONICAL_ROLES.OFFICE_BOY).toBe("officeboy");
    expect(CANONICAL_ROLES.STUDENT).toBe("student");
    expect(CANONICAL_ROLES.PARENT).toBe("parent");
  });

  it("normalizes all legacy front office lead aliases to opslead", () => {
    expect(normalizeRole("ops_lead")).toBe("opslead");
    expect(normalizeRole("frontofficelead")).toBe("opslead");
    expect(normalizeRole("front_office_lead")).toBe("opslead");
    expect(normalizeRole("OPS_LEAD")).toBe("opslead");
    expect(normalizeRole("  frontofficelead  ")).toBe("opslead");
  });

  it("normalizes instructor leader aliases to instructorleader", () => {
    expect(normalizeRole("instructor_leader")).toBe("instructorleader");
    expect(normalizeRole("head_instructor")).toBe("instructorleader");
    expect(normalizeRole("INSTRUCTOR_LEADER")).toBe("instructorleader");
  });

  it("normalizes manager and front office aliases", () => {
    expect(normalizeRole("branch_manager")).toBe("manager");
    expect(normalizeRole("front_office")).toBe("frontoffice");
  });

  it("preserves canonical roles without modification", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("manager")).toBe("manager");
    expect(normalizeRole("instructor")).toBe("instructor");
    expect(normalizeRole("instructorleader")).toBe("instructorleader");
    expect(normalizeRole("frontoffice")).toBe("frontoffice");
    expect(normalizeRole("opslead")).toBe("opslead");
    expect(normalizeRole("marketing")).toBe("marketing");
    expect(normalizeRole("officeboy")).toBe("officeboy");
  });

  it("handles null, undefined, empty, and non-string inputs safely", () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeUndefined();
    expect(normalizeRole("")).toBe("");
    expect(normalizeRole(42)).toBe(42);
    expect(normalizeRole({ role: "admin" })).toEqual({ role: "admin" });
  });

  it("exports normalizeRoleAlias identical to normalizeRole", () => {
    expect(normalizeRoleAlias).toBe(normalizeRole);
  });

  it("validates LEGACY_ROLE_ALIASES dictionary integrity", () => {
    Object.entries(LEGACY_ROLE_ALIASES).forEach(([alias, target]) => {
      expect(alias).toBeTruthy();
      expect(Object.values(CANONICAL_ROLES)).toContain(target);
    });
  });

  describe("Role classification helpers", () => {
    it("identifies front office roles correctly", () => {
      expect(isFrontOfficeRole("frontoffice")).toBe(true);
      expect(isFrontOfficeRole("front_office")).toBe(true);
      expect(isFrontOfficeRole("opslead")).toBe(true);
      expect(isFrontOfficeRole("ops_lead")).toBe(true);
      expect(isFrontOfficeRole("frontofficelead")).toBe(true);
      expect(isFrontOfficeRole("instructor")).toBe(false);
      expect(isFrontOfficeRole("admin")).toBe(false);
    });

    it("identifies instructor roles correctly", () => {
      expect(isInstructorRole("instructor")).toBe(true);
      expect(isInstructorRole("instructorleader")).toBe(true);
      expect(isInstructorRole("instructor_leader")).toBe(true);
      expect(isInstructorRole("head_instructor")).toBe(true);
      expect(isInstructorRole("frontoffice")).toBe(false);
      expect(isInstructorRole("manager")).toBe(false);
    });

    it("identifies manager roles correctly", () => {
      expect(isManagerRole("manager")).toBe(true);
      expect(isManagerRole("branch_manager")).toBe(true);
      expect(isManagerRole("admin")).toBe(true);
      expect(isManagerRole("instructor")).toBe(false);
      expect(isManagerRole("opslead")).toBe(false);
    });

    it("identifies parent roles correctly", () => {
      expect(isParentRole("parent")).toBe(true);
      expect(isParentRole("PARENT")).toBe(true);
      expect(isParentRole("  parent  ")).toBe(true);
      expect(isParentRole("student")).toBe(false);
      expect(isParentRole("admin")).toBe(false);
      expect(isParentRole(null)).toBe(false);
      expect(isParentRole(undefined)).toBe(false);
    });

    it("identifies student roles correctly", () => {
      expect(isStudentRole("student")).toBe(true);
      expect(isStudentRole("STUDENT")).toBe(true);
      expect(isStudentRole("  student ")).toBe(true);
      expect(isStudentRole("parent")).toBe(false);
      expect(isStudentRole("instructor")).toBe(false);
      expect(isStudentRole(null)).toBe(false);
      expect(isStudentRole(undefined)).toBe(false);
    });

    it("identifies staff roles correctly and excludes parents and students", () => {
      expect(STAFF_ROLES).toContain("admin");
      expect(STAFF_ROLES).toContain("instructor");
      expect(STAFF_ROLES).not.toContain("parent");
      expect(STAFF_ROLES).not.toContain("student");

      expect(isStaffRole("admin")).toBe(true);
      expect(isStaffRole("manager")).toBe(true);
      expect(isStaffRole("branch_manager")).toBe(true);
      expect(isStaffRole("instructor")).toBe(true);
      expect(isStaffRole("instructorleader")).toBe(true);
      expect(isStaffRole("instructor_leader")).toBe(true);
      expect(isStaffRole("frontoffice")).toBe(true);
      expect(isStaffRole("opslead")).toBe(true);
      expect(isStaffRole("ops_lead")).toBe(true);
      expect(isStaffRole("marketing")).toBe(true);
      expect(isStaffRole("officeboy")).toBe(true);

      // Must strictly exclude parents and students
      expect(isStaffRole("parent")).toBe(false);
      expect(isStaffRole("student")).toBe(false);
      expect(isStaffRole(null)).toBe(false);
      expect(isStaffRole(undefined)).toBe(false);
    });
  });
});
