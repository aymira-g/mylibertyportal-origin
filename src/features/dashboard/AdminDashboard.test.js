import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminDashboard from "./AdminDashboard";
import { ToastProvider, ConfirmProvider } from "../shared";

vi.mock("./useDashboardData", () => ({
  useDashboardData: vi.fn().mockReturnValue({
    users: [
      { id: "u-1", displayName: "Admin User", role: "admin", status: "active" },
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
  usePendingApprovalsCount: vi.fn().mockReturnValue(2),
}));

vi.mock("./BranchHealthAuditCard", () => ({
  default: () => React.createElement("div", { "data-testid": "branch-health-audit" }, "Branch Health Mock"),
}));

vi.mock("./LogRetentionCard", () => ({
  default: () => React.createElement("div", { "data-testid": "log-retention-card" }, "Log Retention Mock"),
}));

vi.mock("./frontoffice", () => ({
  TuitionDueWidget: () => React.createElement("div", { "data-testid": "tuition-due-widget" }, "Tuition Due Mock"),
}));

vi.mock("../classes", () => ({
  AvailableBatches: () => React.createElement("div", { "data-testid": "available-batches" }, "Available Batches Mock"),
  ClassManager: () => React.createElement("div", null, "Class Manager Mock"),
}));

vi.mock("../../utils/urlAction", () => ({
  getUrlAction: vi.fn().mockReturnValue(null),
  clearUrlAction: vi.fn(),
}));

describe("AdminDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders administrative portal welcome banner with system administrator role", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(AdminDashboard, null)
        )
      )
    );

    expect(html).toContain("Administrative Portal");
    expect(html).toContain("System Administrator");
    expect(html).toContain("Pending Approvals");
    expect(html).toContain("Active Staff");
    expect(html).toContain("System Health &amp; Free-Tier Governance");
    expect(html).toContain("Administrative Attention Required");
  });

  it("displays dual-control approval attention alert when pending approvals exist", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(AdminDashboard, null)
        )
      )
    );

    expect(html).toContain("Review Approvals");
    expect(html).toContain("awaiting dual-control approval");
  });
});
