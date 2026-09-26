import { describe, it, expect, beforeEach } from "vitest";
import {
  isDevSwitcherEnabled,
  MODE_1_TEST_ACCOUNTS,
  MODE_1_LEGACY_ALIAS_ACCOUNTS,
  PREVIEW_ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRoleAlias,
} from "./devPresets";
import {
  setGlobalPreviewMode,
  getIsPreviewMode,
  previewDisabledProps,
} from "../shared/usePreviewMode";
import {
  canApproveGate,
  getSelfCorrectionApprover,
  APPROVAL_ROLES,
} from "../shared/approvalGates";

describe("DevPresets configuration", () => {
  it("exports isDevSwitcherEnabled as a boolean", () => {
    expect(typeof isDevSwitcherEnabled).toBe("boolean");
  });

  it("covers all required roles in Mode 1 test accounts", () => {
    const roles = MODE_1_TEST_ACCOUNTS.map((a) => a.role);
    expect(roles).toContain("admin");
    expect(roles).toContain("manager");
    expect(roles).toContain("instructor");
    expect(roles).toContain("instructorleader");
    expect(roles).toContain("frontoffice");
    expect(roles).toContain("opslead");
    expect(roles).toContain("marketing");
    expect(roles).toContain("officeboy");
    expect(roles).toContain("parent");
  });

  it("includes separate Manager TK, Front Office TK, and Instructor TK test accounts for Kindergarten division testing", () => {
    const tkManager = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "manager" && a.division === "kindergarten"
    );
    expect(tkManager).toBeDefined();
    expect(tkManager?.email).toBe("manager-tk.test@myliberty.id");

    const tkFO = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "frontoffice" && a.division === "kindergarten"
    );
    expect(tkFO).toBeDefined();
    expect(tkFO?.email).toBe("frontoffice-tk.test@myliberty.id");

    const tkInstructor = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "instructor" && a.division === "kindergarten"
    );
    expect(tkInstructor).toBeDefined();
    expect(tkInstructor?.email).toBe("instructor-tk.test@myliberty.id");
  });

  it("includes Front Office Lead (opslead) test account", () => {
    const foLead = MODE_1_TEST_ACCOUNTS.find((a) => a.role === "opslead");
    expect(foLead).toBeDefined();
    expect(foLead?.email).toBe("frontofficelead.test@myliberty.id");
    expect(foLead?.label).toBe("Front Office Lead");
  });

  it("aligns Studio and TK paired test account labels with specification", () => {
    const managerStudio = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "manager" && a.division === "studio"
    );
    expect(managerStudio?.label).toBe("Manager (Studio)");

    const instructorStudio = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "instructor" && a.division === "studio"
    );
    expect(instructorStudio?.label).toBe("Instructor (Studio)");

    const foStudio = MODE_1_TEST_ACCOUNTS.find(
      (a) => a.role === "frontoffice" && a.division === "studio"
    );
    expect(foStudio?.label).toBe("Front Office (Studio)");
  });

  it("ensures every Mode 1 test account has valid structure", () => {
    MODE_1_TEST_ACCOUNTS.forEach((account) => {
      expect(account.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(account.label).toBeTruthy();
      expect(["studio", "kindergarten"]).toContain(account.division);
      expect(account.branch).toBe("kota_gorontalo");
    });
  });

  it("covers all dashboard-routable roles in Mode 2 preview roles", () => {
    const roleKeys = PREVIEW_ROLES.map((r) => r.role);
    expect(roleKeys).toContain("admin");
    expect(roleKeys).toContain("manager");
    expect(roleKeys).toContain("instructor");
    expect(roleKeys).toContain("instructorleader");
    expect(roleKeys).toContain("frontoffice");
    expect(roleKeys).toContain("opslead");
    expect(roleKeys).toContain("marketing");
    expect(roleKeys).toContain("officeboy");
    expect(roleKeys).toContain("parent");
  });
});

describe("Legacy role aliases compatibility", () => {
  it("exports LEGACY_ROLE_ALIASES dictionary mapping aliases to canonical roles", () => {
    expect(LEGACY_ROLE_ALIASES.ops_lead).toBe("opslead");
    expect(LEGACY_ROLE_ALIASES.frontofficelead).toBe("opslead");
    expect(LEGACY_ROLE_ALIASES.instructor_leader).toBe("instructorleader");
  });

  it("normalizes legacy front office lead and instructor leader aliases to canonical roles", () => {
    expect(normalizeRoleAlias("ops_lead")).toBe("opslead");
    expect(normalizeRoleAlias("frontofficelead")).toBe("opslead");
    expect(normalizeRoleAlias("front_office_lead")).toBe("opslead");
    expect(normalizeRoleAlias("instructor_leader")).toBe("instructorleader");
    expect(normalizeRoleAlias("head_instructor")).toBe("instructorleader");
  });

  it("leaves canonical roles unchanged during normalization", () => {
    expect(normalizeRoleAlias("opslead")).toBe("opslead");
    expect(normalizeRoleAlias("instructorleader")).toBe("instructorleader");
    expect(normalizeRoleAlias("admin")).toBe("admin");
    expect(normalizeRoleAlias("manager")).toBe("manager");
    expect(normalizeRoleAlias("instructor")).toBe("instructor");
    expect(normalizeRoleAlias("frontoffice")).toBe("frontoffice");
    expect(normalizeRoleAlias("marketing")).toBe("marketing");
    expect(normalizeRoleAlias("officeboy")).toBe("officeboy");
  });

  it("handles null, undefined, and non-string inputs safely", () => {
    expect(normalizeRoleAlias(null)).toBeNull();
    expect(normalizeRoleAlias(undefined)).toBeUndefined();
    expect(normalizeRoleAlias("")).toBe("");
    expect(normalizeRoleAlias(123)).toBe(123);
  });

  it("provides Mode 1 legacy alias test accounts for regression testing", () => {
    const roles = MODE_1_LEGACY_ALIAS_ACCOUNTS.map((a) => a.role);
    expect(roles).toContain("ops_lead");
    expect(roles).toContain("frontofficelead");
    expect(roles).toContain("instructor_leader");

    MODE_1_LEGACY_ALIAS_ACCOUNTS.forEach((account) => {
      expect(account.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(account.label).toBeTruthy();
      expect(account.branch).toBe("kota_gorontalo");
      expect(normalizeRoleAlias(account.role)).toBe(account.canonicalRole);
    });
  });

  it("ensures legacy aliases satisfy approval gates equivalently to canonical roles", () => {
    // Both canonical opslead and legacy aliases satisfy OPS_LEAD approval gate
    expect(canApproveGate("opslead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
    expect(canApproveGate("ops_lead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);
    expect(canApproveGate("frontofficelead", APPROVAL_ROLES.OPS_LEAD)).toBe(true);

    // Self-correction for all front office lead variants escalates to Branch Manager
    expect(getSelfCorrectionApprover("opslead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
    expect(getSelfCorrectionApprover("ops_lead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);
    expect(getSelfCorrectionApprover("frontofficelead")).toBe(APPROVAL_ROLES.BRANCH_MANAGER);

    // Both canonical instructorleader and legacy instructor_leader satisfy INSTRUCTOR_LEADER approval gate
    expect(canApproveGate("instructorleader", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(true);
    expect(canApproveGate("instructor_leader", APPROVAL_ROLES.INSTRUCTOR_LEADER)).toBe(true);
  });
});

describe("PreviewMode Write Protection", () => {
  beforeEach(() => {
    setGlobalPreviewMode(false);
  });

  it("reflects global preview mode status", () => {
    expect(getIsPreviewMode()).toBe(false);
    setGlobalPreviewMode(true);
    expect(getIsPreviewMode()).toBe(true);
    setGlobalPreviewMode(false);
    expect(getIsPreviewMode()).toBe(false);
  });

  it("returns disabled props when preview mode is active", () => {
    setGlobalPreviewMode(true);
    const props = previewDisabledProps("Custom disabled reason");
    expect(props.disabled).toBe(true);
    expect(props.title).toBe("Custom disabled reason");
    expect(props["aria-disabled"]).toBe("true");
  });

  it("returns empty props when preview mode is inactive", () => {
    setGlobalPreviewMode(false);
    const props = previewDisabledProps();
    expect(props).toEqual({});
  });
});
