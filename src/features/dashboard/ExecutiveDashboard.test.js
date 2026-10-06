import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExecutiveDashboard, { DirectorDashboard, ViceDirectorDashboard } from "./ExecutiveDashboard";
import { ToastProvider, ConfirmProvider } from "../shared";

vi.mock("./useDashboardData", () => ({
  useDashboardData: vi.fn().mockReturnValue({
    users: [
      { id: "u-1", displayName: "Director User", role: "director", status: "active" },
      { id: "u-2", displayName: "Teacher Alice", role: "instructor", status: "active" },
    ],
    classes: [
      { id: "c-1", name: "Level 1 English", program: "General", instructorId: "u-2" },
    ],
    applications: [
      { id: "app-1", studentName: "New Student", status: "pending" },
    ],
    invites: [],
    todos: [],
    editId: null,
    setEditId: vi.fn(),
    selectedStudent: null,
    setSelectedStudent: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    handleSave: vi.fn(),
    handleEdit: vi.fn(),
    handleAddStaff: vi.fn(),
    handleAddStudent: vi.fn(),
    handleDelete: vi.fn(),
    handleAddTodo: vi.fn(),
    handleDeleteTodo: vi.fn(),
    handleToggleTodo: vi.fn(),
    handleCreateInvite: vi.fn(),
    handleDeleteInvite: vi.fn(),
    getStudentClasses: vi.fn().mockReturnValue([]),
    instructors: [
      { id: "u-2", displayName: "Teacher Alice", role: "instructor", status: "active" },
    ],
    students: [
      { id: "s-1", name: "Student Bob", status: "active", division: "courses", paidUntil: "2026-11-30" },
      { id: "s-2", name: "Little Lily", status: "active", division: "kindergarten", paidUntil: "2026-10-06" },
    ],
    unenrolledStudents: [],
    pendingApplications: 1,
  }),
}));

vi.mock("../shared/usePendingApprovalsCount", () => ({
  usePendingApprovalsCount: vi.fn().mockReturnValue(3),
}));

vi.mock("./frontoffice", () => ({
  TuitionDueWidget: () => React.createElement("div", { "data-testid": "tuition-due-widget" }, "Tuition Due Mock"),
}));

vi.mock("../classes", () => ({
  AvailableBatches: () => React.createElement("div", { "data-testid": "available-batches" }, "Available Batches Mock"),
  ClassManager: () => React.createElement("div", null, "Class Manager Mock"),
}));

describe("Executive Dashboard Architecture (Director & Vice Director Split)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes to DirectorDashboard and renders strategic command for director role", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ExecutiveDashboard, { role: "director" })
        )
      )
    );

    expect(html).toContain("Strategic Executive Cockpit");
    expect(html).toContain("Executive Director");
    expect(html).toContain("Pending Decisions");
    expect(html).toContain("Province Learners");
    expect(html).toContain("Multi-Branch Strategic Performance");
    expect(html).toContain("Executive Branch Scope");
    expect(html).toContain("Academic Division Enrollment Distribution");
    expect(html).toContain("Executive Tuition Collection &amp; Financial Health");
  });

  it("routes to ViceDirectorDashboard and renders operational command for vice_director role", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ExecutiveDashboard, { role: "vice_director" })
        )
      )
    );

    expect(html).toContain("Operational Leadership Portal");
    expect(html).toContain("Vice Director");
    expect(html).toContain("Routine Approvals");
    expect(html).toContain("Multi-Branch Operational Performance");
    expect(html).toContain("Executive Branch Scope");
  });

  it("renders DirectorDashboard standalone component with strategic governance focus and enhancements", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(DirectorDashboard)
        )
      )
    );

    expect(html).toContain("Strategic Executive Cockpit");
    expect(html).toContain("Strategic Command &amp; Oversight");
    expect(html).toContain("Kota Gorontalo");
    expect(html).toContain("Bone Bolango");
    expect(html).toContain("Pohuwato");
    expect(html).toContain("Limboto");
    expect(html).toContain("Course Academy");
    expect(html).toContain("Kids School");
    expect(html).toContain("Executive Tuition Collection &amp; Financial Health");
  });

  it("renders ViceDirectorDashboard standalone component with operational health focus", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ViceDirectorDashboard)
        )
      )
    );

    expect(html).toContain("Vice Director Operational Command");
    expect(html).toContain("Operational Command &amp; Follow-up");
    expect(html).toContain("Multi-Branch Operational Performance");
    expect(html).toContain("Capacity Utilization");
  });
});
