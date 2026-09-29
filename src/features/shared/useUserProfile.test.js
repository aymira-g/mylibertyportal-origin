import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useUserProfile } from "./useUserProfile";
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
    expect(hookState.loading).toBe(false);
  });

  it("ensures normalizeRole correctly handles legacy aliases and casing", () => {
    expect(normalizeRole("ops_lead")).toBe("opslead");
    expect(normalizeRole("front_office")).toBe("frontoffice");
    expect(normalizeRole("branch_manager")).toBe("manager");
    expect(normalizeRole("Parent")).toBe("parent");
    expect(normalizeRole("instructor_leader")).toBe("instructorleader");
  });
});
