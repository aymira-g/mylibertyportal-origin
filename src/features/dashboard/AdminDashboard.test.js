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
    applications: [],
    invites: [
      { id: "inv-1", email: "newstaff@myliberty.com", used: false },
    ],
    todos: [
      { id: "t-1", text: "Rotate kiosk pairing key", completed: false, isPinned: true },
    ],
    editId: null,
    setEditId: vi.fn(),
    selectedStudent: null,
    setSelectedStudent: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    handleSave: vi.fn(),
    handleEdit: vi.fn(),
    handleAddStaff: vi.fn(),
    handleDelete: vi.fn(),
    handleAddTodo: vi.fn(),
    handleDeleteTodo: vi.fn(),
    handleToggleTodo: vi.fn(),
    handleCreateInvite: vi.fn(),
    handleDeleteInvite: vi.fn(),
    instructors: [
      { id: "u-2", displayName: "Teacher Alice", role: "instructor", status: "active" },
    ],
    students: [],
  }),
}));

vi.mock("./BranchHealthAuditCard", () => ({
  default: () => React.createElement("div", { "data-testid": "branch-health-audit" }, "Branch Health Mock"),
}));

vi.mock("./LogRetentionCard", () => ({
  default: () => React.createElement("div", { "data-testid": "log-retention-card" }, "Log Retention Mock"),
}));

describe("AdminDashboard Component (Technical Administration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders technical administration welcome banner with system administrator role", () => {
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

    expect(html).toContain("Technical Administration Portal");
    expect(html).toContain("System Administrator");
    expect(html).toContain("Active Staff");
    expect(html).toContain("Pending Invites");
    expect(html).toContain("Spark (Free)");
    expect(html).toContain("System Health &amp; Free-Tier Governance");
    expect(html).toContain("Branch Health Mock");
    expect(html).toContain("Log Retention Mock");
  });

  it("strictly enforces separation of duties and does NOT include business approval queues or tuition widgets", () => {
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

    // System Admin is NOT a business approver (§7.3, §7.4)
    expect(html).not.toContain("Review Approvals");
    expect(html).not.toContain("awaiting dual-control approval");
    expect(html).not.toContain("Tuition Due");
    expect(html).not.toContain("Available Batches");
    expect(html).not.toContain("Administrative Attention Required");

    // System Admin does not have unauthorized AI messaging or in-dashboard kiosk scanner
    expect(html).not.toContain("AI Assistant");
    expect(html).not.toContain("Attendance Kiosk");
  });
});
