import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ParentPortalPage from "./ParentPortalPage";

vi.mock("../../firebase", () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      // Simulate unauthenticated user
      cb(null);
      return () => {};
    }),
  },
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

describe("ParentPortalPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dedicated embedded parent login form when unauthenticated", () => {
    const html = renderToStaticMarkup(React.createElement(ParentPortalPage));

    // Must show Parent Portal header
    expect(html).toContain("My Liberty Parent Portal");
    expect(html).toContain("Sign in to your authenticated parent account");

    // Must render embedded login fields
    expect(html).toContain("Email Address");
    expect(html).toContain("Password");
    expect(html).toContain("Sign In to Parent Account");
    expect(html).toContain("Forgot Password?");

    // Must render staff portal escape hatch
    expect(html).toContain("Go to Staff Portal");
  });
});
