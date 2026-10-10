import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OfficeBoyDashboard from "./OfficeBoyDashboard";
import { ToastProvider } from "../shared";
import { useStaffDirectives } from "../staff";

vi.mock("../staff", () => ({
  useStaffDirectives: vi.fn(),
}));

vi.mock("../../utils/urlAction", () => ({
  getUrlAction: vi.fn().mockReturnValue(null),
  clearUrlAction: vi.fn(),
}));

describe("OfficeBoyDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders assigned directives correctly with urgent/overdue stat card", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [
        {
          id: "task-1",
          text: "Clean classrooms and prep whiteboards",
          type: "CLEANING",
          priority: "urgent",
          dueDate: "2099-09-28",
        },
        {
          id: "task-2",
          text: "Replace projector lamp",
          type: "MAINTENANCE",
          priority: "normal",
          dueDate: "2020-01-01",
        },
      ],
      completedDirectives: [],
      pendingCount: 2,
      loading: false,
      error: null,
      handleToggle: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Campus Support");
    expect(html).toContain("Clean classrooms and prep whiteboards");
    expect(html).toContain("Urgent / Overdue");
    expect(html).toContain("2");
    expect(html).not.toContain("In Progress");
    expect(html).not.toContain("Campus Readiness");
  });

  it("renders error card when hook returns error and does NOT show 'All caught up!'", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [],
      completedDirectives: [],
      pendingCount: 0,
      loading: false,
      error: new Error("Permission denied to read directives"),
      handleToggle: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Unable to load assigned directives");
    expect(html).toContain("Permission denied to read directives");
    expect(html).not.toContain("All caught up!");
    expect(html).not.toContain("No tasks right now");
  });

  it("renders 'All caught up!' when active directives are empty and no error exists", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [],
      completedDirectives: [],
      pendingCount: 0,
      loading: false,
      error: null,
      handleToggle: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Urgent / Overdue");
    expect(html).toContain("All caught up! No tasks right now.");
    expect(html).not.toContain("Campus Readiness");
    expect(html).not.toContain("Unable to load assigned directives");
  });

  it("renders completed directives without an unauthorized reopen button", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [],
      completedDirectives: [
        {
          id: "task-completed-1",
          text: "Restocked classroom water dispenser",
          completed: true,
          completedByName: "Support Staff",
        },
      ],
      pendingCount: 0,
      loading: false,
      error: null,
      handleToggle: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Completed Tasks (1)");
    expect(html).not.toContain("Reopen task");
    expect(html).not.toContain("title=\"Reopen task\"");
  });
});
