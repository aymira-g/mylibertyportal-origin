import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DevQuickSwitcher from "./DevQuickSwitcher";

function createMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

const mockLocal = createMockStorage();
const mockSession = createMockStorage();

// @ts-expect-error Mocking browser storage in test environment
globalThis.localStorage = mockLocal;
// @ts-expect-error Mocking browser storage in test environment
globalThis.sessionStorage = mockSession;

describe("DevQuickSwitcher Component", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("renders trigger button when closed for admin user", () => {
    const html = renderToStaticMarkup(
      React.createElement(DevQuickSwitcher, {
        currentUser: { email: "admin@myliberty.id" },
        realRole: "admin",
      })
    );
    expect(html).toContain("Dev Switcher");
    expect(html).toContain("admin");
  });

  it("purges stale localStorage password on mount", () => {
    localStorage.setItem("myliberty_dev_test_password", "old-unsafe-password");
    renderToStaticMarkup(
      React.createElement(DevQuickSwitcher, {
        currentUser: { email: "admin@myliberty.id" },
        realRole: "admin",
      })
    );
    expect(localStorage.getItem("myliberty_dev_test_password")).toBeNull();
  });
});
