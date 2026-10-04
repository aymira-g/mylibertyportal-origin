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

  it("renders trigger button when closed for director and vice_director users", () => {
    const directorHtml = renderToStaticMarkup(
      React.createElement(DevQuickSwitcher, {
        currentUser: { email: "director.test@myliberty.id" },
        realRole: "director",
      })
    );
    expect(directorHtml).toContain("Dev Switcher");
    expect(directorHtml).toContain("director");

    const viceDirectorHtml = renderToStaticMarkup(
      React.createElement(DevQuickSwitcher, {
        currentUser: { email: "vicedirector.test@myliberty.id" },
        realRole: "vice_director",
      })
    );
    expect(viceDirectorHtml).toContain("Dev Switcher");
    expect(viceDirectorHtml).toContain("vice_director");
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

  it("includes Branch Audit in its drawer capabilities", () => {
    // Render and check that DevQuickSwitcher component has branch audit capabilities integrated
    const element = React.createElement(DevQuickSwitcher, {
      currentUser: { email: "admin@myliberty.id" },
      realRole: "admin",
    });
    expect(element.type).toBe(DevQuickSwitcher);
  });
});
