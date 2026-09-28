import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "./LoginPage";
import * as devPresets from "./devPresets";

describe("LoginPage - Production Security & Mode 1 Gating", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("never renders Quick Test Accounts when isDevSwitcherEnabled is false (production)", () => {
    // Spy on isDevSwitcherEnabled to simulate production build environment
    vi.spyOn(devPresets, "isDevSwitcherEnabled", "get").mockReturnValue(false);

    const html = renderToStaticMarkup(
      React.createElement(LoginPage, { onLogin: vi.fn(), loading: false })
    );

    // Verify test accounts panel header is completely absent
    expect(html).not.toContain("Quick Test Accounts (Dev Mode)");
    expect(html).not.toContain("1-click sign in via real Firebase Auth");

    // Verify none of the test account emails are leaked in production markup
    devPresets.MODE_1_TEST_ACCOUNTS.forEach((account) => {
      expect(html).not.toContain(account.email);
    });
  });

  it("renders Quick Test Accounts when isDevSwitcherEnabled is true (development)", () => {
    // Spy on isDevSwitcherEnabled to simulate development environment
    vi.spyOn(devPresets, "isDevSwitcherEnabled", "get").mockReturnValue(true);

    const html = renderToStaticMarkup(
      React.createElement(LoginPage, { onLogin: vi.fn(), loading: false })
    );

    // Verify test accounts panel header is present
    expect(html).toContain("Quick Test Accounts (Dev Mode)");
    expect(html).toContain("1-click sign in via real Firebase Auth");

    // Verify test accounts are rendered
    expect(html).toContain("Admin");
    expect(html).toContain("Manager");
    expect(html).toContain("Instructor");
  });

  it("verifies isDevSwitcherEnabled is strictly tied to import.meta.env.DEV", () => {
    expect(typeof devPresets.isDevSwitcherEnabled).toBe("boolean");
    expect(devPresets.isDevSwitcherEnabled).toBe(Boolean(import.meta.env.DEV));
  });

  it("renders Google Sign In button when onGoogleLogin is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(LoginPage, {
        onLogin: vi.fn(),
        onGoogleLogin: vi.fn(),
        loading: false,
      })
    );

    expect(html).toContain("Sign in with Google");
    expect(html).toContain("Or sign in with email");
  });
});
