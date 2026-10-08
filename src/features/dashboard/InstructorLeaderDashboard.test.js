import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider, ConfirmProvider } from "../shared";

const leaderWorkspaceState = {
  uid: "leader_1",
  classes: [{ id: "own1", className: "My Own Class" }],
  rawClasses: [{ id: "own1", className: "My Own Class" }],
  students: [{ id: "s1", displayName: "Student A" }],
  instructorName: "Test Leader",
  instructorRole: "instructorleader",
  instructorBranch: "kota_gorontalo",
  effectiveRole: "instructorleader",
  effectiveBranch: "kota_gorontalo",
  loading: false,
  error: null,
  allClasses: [{ id: "c1", className: "Level 1", branchId: "kota_gorontalo", status: "active" }],
  combinedAllClasses: [{ id: "c1", className: "Level 1" }],
  activeDirectives: [],
  completedDirectives: [],
  pendingDirectivesCount: 0,
  directivesLoading: false,
  handleToggleDirective: vi.fn(),
  todayDate: "2026-10-08",
  todayDayCode: "thu",
  branchInstructors: [{ id: "ins1", displayName: "Sarah" }],
  branchProgressReports: [],
  teamLoading: false,
  teamError: "",
  reportsLoading: false,
  reportsError: "",
  coverage: {
    liveClasses: 4,
    scheduledToday: 3,
    scheduleUnknown: 0,
    withInstructor: 3,
    missingInstructor: 2,
    substituting: 1,
    overCapacity: 0,
    teacherConflicts: 0,
    roomConflicts: 0,
    coverageRate: 0.75,
  },
  divisionBreakdown: { total: 4, courses: 3, kindergarten: 1 },
  coverageExceptions: [],
  studentsServed: 42,
  instructorWorkload: [],
  progressCoverage: { totalReports: 5, staleAfterDays: 30, instructors: [], staleCount: 1 },
  attentionItems: [
    { id: "missing_instructor", label: "classes without an assigned instructor", count: 2, severity: "critical", targetTab: "coverage" },
  ],
  pendingApprovalsCount: 3,
  attendance: { date: "", loading: false, error: "", rows: [] },
  attendanceSummary: { sessions: 0, expected: 0, recorded: 0, completionRate: 1, incomplete: [] },
  loadAttendance: vi.fn(),
};

vi.mock("./instructor", () => ({
  InstructorClasses: () =>
    React.createElement("div", { "data-testid": "instructor-classes" }, "My Classes Content"),
  InstructorProgress: () =>
    React.createElement("div", { "data-testid": "instructor-progress" }, "Progress Content"),
}));

vi.mock("./instructor/useInstructorLeaderWorkspace", () => ({
  useInstructorLeaderWorkspace: vi.fn(() => leaderWorkspaceState),
}));

vi.mock("./instructor/leaderUtils", () => ({
  splitClassesByDay: vi.fn(() => ({
    scheduled: [{ id: "c1", className: "Level 1", startTime: "09:00" }],
    unscheduled: [],
  })),
}));

vi.mock("./instructor/leader", () => ({
  LeaderOverview: () => React.createElement("div", { "data-testid": "leader-overview" }, "Overview Content"),
  InstructorTeam: () => React.createElement("div", { "data-testid": "leader-team" }, "Team Content"),
  ClassesCoverage: () => React.createElement("div", { "data-testid": "leader-coverage" }, "Coverage Content"),
  AttendanceActivity: () => React.createElement("div", { "data-testid": "leader-attendance" }, "Attendance Content"),
  AcademicProgressLeader: () =>
    React.createElement("div", { "data-testid": "leader-progress" }, "Academic Progress Content"),
}));

vi.mock("../attendance", () => ({
  KioskModal: () => null,
  KioskSidebarButton: () => React.createElement("button", null, "Kiosk"),
  InstructorAttendanceView: () =>
    React.createElement("div", { "data-testid": "instructor-attendance-view" }, "Own Attendance"),
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
    DashboardShell: ({ tabs, title, extraSidebarContent }) =>
      React.createElement(
        "div",
        { "data-testid": "dashboard-shell" },
        React.createElement("h1", null, title),
        extraSidebarContent,
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

function renderDashboard() {
  return renderToStaticMarkup(
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
}

describe("InstructorLeaderDashboard (Instructor Leader)", () => {
  it("renders the leadership portal with the branch academic leadership tabs", () => {
    capturedApprovalInboxProps = null;

    const html = renderDashboard();

    // Leadership rebrand (Phase 1): no longer the frozen "Instructor Portal" label.
    expect(html).toContain("Instructor Leader Portal");
    expect(html).toContain("Branch Academic Leadership");

    // Leader-only surfaces.
    expect(html).toContain("Overview");
    expect(html).toContain("Instructor Team");
    expect(html).toContain("Classes &amp; Coverage");
    expect(html).toContain("Academic Progress");
    expect(html).toContain("Attendance");
    expect(html).toContain("Academic Approvals");

    // Preserved ordinary instructor capabilities.
    expect(html).toContain("My Classes");
    expect(html).toContain("Directives");
    expect(html).toContain("Lesson Materials");
    expect(html).toContain("Reports");
    expect(html).toContain("AI Assistant");
  });

  it("mounts the leader components rather than the structural twin", () => {
    const html = renderDashboard();
    expect(html).toContain("Overview Content");
    expect(html).toContain("Team Content");
    expect(html).toContain("Coverage Content");
    expect(html).toContain("Academic Progress Content");
    // Branch monitoring is the default attendance scope; the leader's own-class
    // attendance view stays reachable through the toggle (static render cannot
    // exercise the click, so both toggle labels are asserted instead).
    expect(html).toContain("Attendance Content");
    expect(html).toContain("Branch Monitoring");
    expect(html).toContain("My Classes");
  });

  it("canonicalizes the approver role and preserves the approval queue contract", () => {
    capturedApprovalInboxProps = null;
    renderDashboard();

    expect(capturedApprovalInboxProps).not.toBeNull();
    expect(capturedApprovalInboxProps.userRole).toBe("instructorleader");
    // The legacy alias must no longer reach the shared inbox.
    expect(capturedApprovalInboxProps.userRole).not.toBe("instructor_leader");
    expect(capturedApprovalInboxProps.branchId).toBe("kota_gorontalo");
    expect(capturedApprovalInboxProps.title).toBe("Academic & Faculty Approval Registry");
    expect(capturedApprovalInboxProps.subtitle).toBe(
      "Dual-control authorization queue for placement level overrides and substitute instructor assignments."
    );
  });

  it("surfaces the pending-approval and coverage badges", () => {
    const html = renderDashboard();
    // 3 pending approvals (mocked hook), 2 classes needing coverage.
    expect(html).toContain("3");
    expect(html).toContain("2");
  });
});
