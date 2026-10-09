import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useUserProfile, resolveProfileBranch } from "./useUserProfile";
import { normalizeRole } from "./roles";

const unsubAuthMock = vi.fn();
const unsubProfileMock = vi.fn();

vi.mock("../../firebase", () => ({
  auth: { currentUser: null },
  db: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => unsubAuthMock),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, _coll, id) => ({ id, path: `users/${id}` })),
  onSnapshot: vi.fn(() => unsubProfileMock),
}));

describe("useUserProfile hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with unauthenticated defaults when currentUser is null", () => {
    let hookState = null;
    function TestComponent() {
      hookState = useUserProfile();
      return React.createElement("div", null, hookState.role || "unauthenticated");
    }

    const html = renderToStaticMarkup(React.createElement(TestComponent));
    expect(html).toContain("unauthenticated");
    expect(hookState).not.toBeNull();
    expect(hookState.user).toBeNull();
    expect(hookState.profile).toBeNull();
    expect(hookState.role).toBeNull();
    expect(hookState.branchId).toBeNull();
    expect(hookState.branch).toBeNull();
    expect(hookState.loading).toBe(false);
  });

  it("ensures normalizeRole correctly handles legacy aliases and casing", () => {
    expect(normalizeRole("ops_lead")).toBe("opslead");
    expect(normalizeRole("front_office")).toBe("frontoffice");
    expect(normalizeRole("Parent")).toBe("parent");
    expect(normalizeRole("instructor_leader")).toBe("instructorleader");
  });

  describe("resolveProfileBranch matrix", () => {
    it("resolves canonical branchId and derived display branch when only branchId is present", () => {
      const result = resolveProfileBranch({ branchId: "bone_bolango" });
      expect(result.branchId).toBe("bone_bolango");
      expect(result.branch).toBe("Bone Bolango");
    });

    it("resolves canonical branchId and display branch when only legacy branch is present", () => {
      const result = resolveProfileBranch({ branch: "Pohuwato" });
      expect(result.branchId).toBe("pohuwato");
      expect(result.branch).toBe("Pohuwato");
    });

    it("prioritizes canonical branchId when both branchId and branch are present but different", () => {
      const result = resolveProfileBranch({
        branchId: "bone_bolango",
        branch: "Kota Gorontalo",
      });
      expect(result.branchId).toBe("bone_bolango");
      expect(result.branch).toBe("Bone Bolango");
    });

    it("returns null for both branchId and branch when neither field is present", () => {
      const result = resolveProfileBranch({});
      expect(result.branchId).toBeNull();
      expect(result.branch).toBeNull();
    });

    it("returns null when profile is null or undefined", () => {
      expect(resolveProfileBranch(null)).toEqual({ branchId: null, branch: null });
      expect(resolveProfileBranch(undefined)).toEqual({ branchId: null, branch: null });
    });
  });
});
