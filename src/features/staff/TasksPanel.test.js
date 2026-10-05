import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TasksPanel from "./TasksPanel";
import { getAssigneeBadge } from "./tasksUtils";
import { ToastProvider, ConfirmProvider } from "../shared";

describe("TasksPanel Organizational Delegation Hierarchy", () => {
  const mockUsers = [
    { id: "dir-1", displayName: "Pak Director", role: "director", status: "active" },
    { id: "vdir-1", displayName: "Ibu Vice Director", role: "vice_director", status: "active" },
    { id: "adm-1", displayName: "Sys Admin", role: "admin", status: "active" },
    { id: "mgr-gtlo", displayName: "Manager Gorontalo", role: "manager", status: "active" },
    { id: "mgr-limboto", displayName: "Manager Limboto", role: "manager", status: "active" },
    { id: "inst-1", displayName: "Tutor Andi", role: "instructor", status: "active" },
    { id: "fo-1", displayName: "Frontdesk Siti", role: "frontoffice", status: "active" },
    { id: "mkt-1", displayName: "Marketing Budi", role: "marketing", status: "active" },
    { id: "ob-1", displayName: "Facilities Joko", role: "officeboy", status: "active" },
  ];

  it("excludes Director, Vice Director, and Admin from Branch Manager assignee list", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(TasksPanel, {
            users: mockUsers,
            currentUser: { uid: "mgr-gtlo", displayName: "Manager Gorontalo" },
            userRole: "manager",
            branchLabel: "Kota Gorontalo",
            onAddTodo: vi.fn(),
            onDeleteTodo: vi.fn(),
            onToggleTodo: vi.fn(),
          })
        )
      )
    );

    // Executives and peer managers must NOT be available to Branch Manager
    expect(html).not.toContain("Pak Director");
    expect(html).not.toContain("Ibu Vice Director");
    expect(html).not.toContain("Sys Admin");
    expect(html).not.toContain("Manager Limboto");

    // Local branch subordinates and self MUST be available
    expect(html).toContain("Tutor Andi");
    expect(html).toContain("Frontdesk Siti");
    expect(html).toContain("Marketing Budi");
    expect(html).toContain("Facilities Joko");
    expect(html).toContain("Manager Gorontalo");

    // Broadcast option is scoped to branch
    expect(html).toContain("All Branch Staff (Kota Gorontalo)");
    expect(html).toContain("Branch Departments / Broadcast");
  });

  it("permits Executive Director to assign directives to all staff academy-wide", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(TasksPanel, {
            users: mockUsers,
            currentUser: { uid: "dir-1", displayName: "Pak Director" },
            userRole: "director",
            onAddTodo: vi.fn(),
            onDeleteTodo: vi.fn(),
            onToggleTodo: vi.fn(),
          })
        )
      )
    );

    // Director has full academy-wide delegation
    expect(html).toContain("Ibu Vice Director");
    expect(html).toContain("Manager Gorontalo");
    expect(html).toContain("Manager Limboto");
    expect(html).toContain("Tutor Andi");
    expect(html).toContain("All Academy Staff");
    expect(html).toContain("Departments / Broadcast");
  });

  it("formats branch-scoped broadcast badges correctly in getAssigneeBadge", () => {
    const badge = getAssigneeBadge("all", "role", "All Branch Staff (Kota Gorontalo)");
    expect(badge.label).toBe("All Branch Staff (Kota Gorontalo)");

    const individualBadge = getAssigneeBadge("u-1", "individual", "Tutor Andi");
    expect(individualBadge.label).toBe("👤 Tutor Andi");
  });
});
