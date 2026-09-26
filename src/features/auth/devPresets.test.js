import { describe, it, expect, beforeEach } from "vitest";
import {
  isDevSwitcherEnabled,
  MODE_1_TEST_ACCOUNTS,
  PREVIEW_ROLES,
} from "./devPresets";
import {
  setGlobalPreviewMode,
  getIsPreviewMode,
  previewDisabledProps,
} from "../shared/usePreviewMode";

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
