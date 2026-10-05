import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExecutiveDashboard from "./ExecutiveDashboard";
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
      { id: "s-1", name: "Student Bob", status: "active" },
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

describe("ExecutiveDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders executive portal welcome banner for director", () => {
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

    expect(html).toContain("Executive Leadership Portal");
    expect(html).toContain("Executive Director");
    expect(html).toContain("Pending Approvals");
    expect(html).toContain("Province Learners");
    expect(html).toContain("Executive Action Required");
    expect(html).toContain("Review Approvals");
  });

  it("renders role label correctly for vice director", () => {
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

    expect(html).toContain("Vice Director");
    expect(html).toContain("Review Approvals");
  });

  it("renders multi-branch strategic performance cards for all 4 campuses", () => {
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

    expect(html).toContain("Multi-Branch Strategic Performance");
    expect(html).toContain("Kota Gorontalo");
    expect(html).toContain("Bone Bolango");
    expect(html).toContain("Pohuwato");
    expect(html).toContain("Limboto");
    expect(html).toContain("Capacity Utilization");
  });

  it("renders executive branch scope filter bar", () => {
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

    expect(html).toContain("Executive Branch Scope");
    expect(html).toContain("All Branches");
  });
});
