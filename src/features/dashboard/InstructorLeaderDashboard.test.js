import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider, ConfirmProvider } from "../shared";

vi.mock("./instructor", async () => {
  return {
    useInstructorWorkspace: vi.fn(() => ({
      uid: "leader_1",
      classes: [{ id: "c1", className: "Level 1" }],
      rawClasses: [{ id: "c1", className: "Level 1" }],
      students: [{ id: "s1", displayName: "Student A" }],
      instructorName: "Test Leader",
      instructorRole: "instructorleader",
      instructorBranch: "kota_gorontalo",
      effectiveRole: "instructorleader",
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

let capturedApprovalInboxProps = null;

vi.mock("../shared", async () => {
  /** @type {any} */
  const actual = await vi.importActual("../shared");
  return {
    ...actual,
    DashboardShell: ({ tabs, title }) =>
      React.createElement(
        "div",
        { "data-testid": "dashboard-shell" },
        React.createElement("h1", null, title),
        tabs.map((t) =>
          React.createElement(
            "div",
            { key: t.id, "data-testid": `tab-${t.id}` },
            React.createElement("span", null, t.label),
            t.badge ? React.createElement("span", null, t.badge) : null,
            t.component
          )
        )
      ),
    AIAssistant: () => React.createElement("div", null, "AI Assistant"),
    usePendingApprovalsCount: vi.fn(() => 3),
    ApprovalInbox: (props) => {
      capturedApprovalInboxProps = props;
      return React.createElement(
        "div",
        { "data-testid": "approval-inbox-mock" },
        React.createElement("span", { "data-testid": "inbox-title" }, props.title),
        React.createElement("span", { "data-testid": "inbox-role" }, props.userRole),
        React.createElement("span", { "data-testid": "inbox-branch" }, props.branchId)
      );
    },
  };
});



import InstructorLeaderDashboard from "./InstructorLeaderDashboard";

describe("InstructorLeaderDashboard Component (Instructor Leader)", () => {
  it("renders Instructor Portal with 9 tabs including unconditional Academic Approvals and exact ApprovalInbox props", () => {
    capturedApprovalInboxProps = null;

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(InstructorLeaderDashboard, {
            role: "instructorleader",
            branch: "kota_gorontalo",
          })
        )
      )
    );

    // Title
    expect(html).toContain("Instructor Portal");

    // All 9 tabs present
    expect(html).toContain("Overview");
    expect(html).toContain("Attendance");
    expect(html).toContain("Directives");
    expect(html).toContain("My Classes");
    expect(html).toContain("Student Progress");
    expect(html).toContain("Lesson Materials");
    expect(html).toContain("Reports");
    expect(html).toContain("Academic Approvals");
    expect(html).toContain("AI Assistant");

    // Badge count from usePendingApprovalsCount
    expect(html).toContain("3");

    // Verbatim ApprovalInbox props verification
    expect(capturedApprovalInboxProps).not.toBeNull();
    expect(capturedApprovalInboxProps.userRole).toBe("instructor_leader");
    expect(capturedApprovalInboxProps.branchId).toBe("kota_gorontalo");
    expect(capturedApprovalInboxProps.title).toBe("Academic & Faculty Approval Registry");
    expect(capturedApprovalInboxProps.subtitle).toBe(
      "Dual-control authorization queue for placement level overrides and substitute instructor assignments."
    );
  });
});
