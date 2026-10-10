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

  it("renders assigned directives correctly with active tasks stat card (no campus readiness claim)", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [
        {
          id: "task-1",
          text: "Clean classrooms and prep whiteboards",
          type: "CLEANING",
          priority: "normal",
          dueDate: "2026-09-28",
        },
      ],
      completedDirectives: [],
      pendingCount: 1,
      loading: false,
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
    expect(html).toContain("Active Tasks");
    expect(html).toContain("1 In Progress");
    expect(html).not.toContain("Campus Readiness");
    expect(html).not.toContain("All Clear");
  });

  it("renders 'None Pending' when active directives are empty without claiming campus-wide readiness", () => {
    vi.mocked(useStaffDirectives).mockReturnValue({
      directives: [],
      activeDirectives: [],
      completedDirectives: [],
      pendingCount: 0,
      loading: false,
      handleToggle: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Active Tasks");
    expect(html).toContain("None Pending");
    expect(html).not.toContain("Campus Readiness");
    expect(html).not.toContain("All Clear");
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
