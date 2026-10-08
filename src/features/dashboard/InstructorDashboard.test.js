import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider, ConfirmProvider } from "../shared";

vi.mock("./instructor", async () => {
  return {
    useInstructorWorkspace: vi.fn(() => ({
      uid: "ins_1",
      classes: [{ id: "c1", className: "Level 1" }],
      rawClasses: [{ id: "c1", className: "Level 1" }],
      students: [{ id: "s1", displayName: "Student A" }],
      instructorName: "Test Instructor",
      instructorRole: "instructor",
      instructorBranch: "kota_gorontalo",
      effectiveRole: "instructor",
      effectiveBranch: "kota_gorontalo",
      loading: false,
      error: null,
      allClasses: [{ id: "c1", className: "Level 1" }],
      combinedAllClasses: [{ id: "c1", className: "Level 1" }],
      activeDirectives: [],
      completedDirectives: [],
      pendingDirectivesCount: 0,
      directivesLoading: false,
      handleToggleDirective: vi.fn(),
    })),
    InstructorOverview: () => React.createElement("div", { "data-testid": "instructor-overview" }, "Overview Content"),
    InstructorClasses: () => React.createElement("div", { "data-testid": "instructor-classes" }, "Classes Content"),
    InstructorProgress: () => React.createElement("div", { "data-testid": "instructor-progress" }, "Progress Content"),
  };
});

vi.mock("../attendance", () => ({
  KioskModal: () => null,
  KioskSidebarButton: () => React.createElement("button", null, "Kiosk"),
  InstructorAttendanceView: () => React.createElement("div", null, "Attendance"),
}));

vi.mock("../classes", () => ({
  ClassPhotoShare: () => null,
  TeachingMaterial: () => React.createElement("div", null, "Materials"),
}));

vi.mock("../reports", () => ({
  ReportsDashboard: () => React.createElement("div", null, "Reports"),
}));

vi.mock("../staff", () => ({
  StaffDirectivesWidget: () => React.createElement("div", null, "Directives"),
}));

vi.mock("../shared", async () => {
  /** @type {any} */
  const actual = await vi.importActual("../shared");
  return {
    ...actual,
    AIAssistant: () => React.createElement("div", null, "AI Assistant"),
    ApprovalInbox: () => React.createElement("div", { "data-testid": "approval-inbox" }, "Approvals"),
  };
});


import InstructorDashboard from "./InstructorDashboard";

describe("InstructorDashboard Component (Ordinary Instructor)", () => {
  it("renders Instructor Portal with exactly 8 ordinary tabs and NO Academic Approvals tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(InstructorDashboard, {
            role: "instructor",
            branch: "kota_gorontalo",
          })
        )
      )
    );

    // Title
    expect(html).toContain("Instructor Portal");

    // Ordinary 8 tabs
    expect(html).toContain("Overview");
    expect(html).toContain("Attendance");
    expect(html).toContain("Directives");
    expect(html).toContain("My Classes");
    expect(html).toContain("Student Progress");
    expect(html).toContain("Lesson Materials");
    expect(html).toContain("Reports");
    expect(html).toContain("AI Assistant");

    // Must NOT contain Academic Approvals
    expect(html).not.toContain("Academic Approvals");
    expect(html).not.toContain("Academic &amp; Faculty Approval Registry");
  });
});
