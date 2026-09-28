import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardShell from "./DashboardShell";

describe("DashboardShell History & Rendering", () => {
  const dummyTabs = [
    { id: "overview", label: "Overview", component: React.createElement("div", null, "Overview View") },
    { id: "students", label: "Students", component: React.createElement("div", null, "Students View") },
    { id: "classes", label: "Classes", component: React.createElement("div", null, "Classes View") },
    { id: "cashier", label: "Cashier", component: React.createElement("div", null, "Cashier View") },
  ];

  it("renders active tab content cleanly on server/static render", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardShell, {
        tabs: dummyTabs,
        activeTab: "cashier",
        onTabChange: () => {},
        title: "Front Desk",
      })
    );

    expect(html).toContain("Cashier View");
    expect(html).toContain("Front Desk");
    expect(html).toContain("Students");
    expect(html).toContain("Overview");
  });

  it("defaults to first tab when activeTab is not specified in uncontrolled mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(DashboardShell, {
        tabs: dummyTabs,
        title: "Front Desk",
      })
    );

    expect(html).toContain("Overview View");
  });
});
