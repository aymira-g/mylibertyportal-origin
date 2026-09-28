import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MobileDashboardShell from "./MobileDashboardShell";

describe("MobileDashboardShell", () => {
  const dummyTabs = [
    { id: "overview", label: "Overview", component: React.createElement("div", null, "Overview Content") },
    { id: "students", label: "Students", component: React.createElement("div", null, "Students Content") },
    { id: "classes", label: "Classes", component: React.createElement("div", null, "Classes Content") },
    { id: "approvals", label: "Approvals", component: React.createElement("div", null, "Approvals Content") },
    { id: "reports", label: "Reports", component: React.createElement("div", null, "Reports Content") },
    { id: "misc", label: "Tasks", component: React.createElement("div", null, "Tasks Content") },
  ];

  it("renders active tab content and primary navigation tabs", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileDashboardShell, {
        tabs: dummyTabs,
        activeTab: "overview",
        onTabChange: () => {},
        title: "Admin Panel",
        primaryTabIds: ["overview", "students", "classes", "approvals"],
      })
    );

    expect(html).toContain("Overview Content");
    expect(html).toContain("Overview");
    expect(html).toContain("Students");
    expect(html).toContain("Classes");
    expect(html).toContain("Approvals");
    // Bottom nav bar includes More trigger
    expect(html).toContain("More");
  });

  it("falls back to smart priorities for Admin when primaryTabIds is not explicitly set", () => {
    const adminTabs = [
      { id: "overview", label: "Overview", component: React.createElement("div", null, "Overview Content") },
      { id: "applications", label: "Applications", component: React.createElement("div", null, "Applications Content") },
      { id: "students", label: "Students", component: React.createElement("div", null, "Students Content") },
      { id: "classes", label: "Classes", component: React.createElement("div", null, "Classes Content") },
      { id: "approvals", label: "Approvals", component: React.createElement("div", null, "Approvals Content") },
      { id: "reports", label: "Reports", component: React.createElement("div", null, "Reports Content") },
    ];

    const html = renderToStaticMarkup(
      React.createElement(MobileDashboardShell, {
        tabs: adminTabs,
        activeTab: "overview",
        onTabChange: () => {},
        title: "Admin Panel",
      })
    );

    expect(html).toContain("Overview Content");
    expect(html).toContain("Students");
    expect(html).toContain("Classes");
    expect(html).toContain("Approvals");
  });

  it("falls back to smart priorities for Front Office when primaryTabIds is not explicitly set", () => {
    const frontOfficeTabs = [
      { id: "overview", label: "Overview", component: React.createElement("div", null, "Overview Content") },
      { id: "cashier", label: "Cashier", component: React.createElement("div", null, "Cashier Content") },
      { id: "inquiries", label: "Inquiries", component: React.createElement("div", null, "Inquiries Content") },
      { id: "applications", label: "Applications", component: React.createElement("div", null, "Applications Content") },
      { id: "students", label: "Students", component: React.createElement("div", null, "Students Content") },
    ];

    const html = renderToStaticMarkup(
      React.createElement(MobileDashboardShell, {
        tabs: frontOfficeTabs,
        activeTab: "overview",
        onTabChange: () => {},
        title: "Front Desk",
      })
    );

    expect(html).toContain("Overview Content");
    expect(html).toContain("Cashier");
    expect(html).toContain("Inquiries");
    expect(html).toContain("Applications");
  });
});
