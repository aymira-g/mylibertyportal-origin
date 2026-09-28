import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OfficeBoyDashboard from "./OfficeBoyDashboard";
import { ToastProvider } from "../shared";

vi.mock("../staff", () => ({
  useStaffDirectives: vi.fn().mockReturnValue({
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
    loading: false,
    handleToggle: vi.fn(),
  }),
}));

vi.mock("../../utils/urlAction", () => ({
  getUrlAction: vi.fn().mockReturnValue(null),
  clearUrlAction: vi.fn(),
}));

describe("OfficeBoyDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders assigned directives correctly without crashing", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OfficeBoyDashboard, null)
      )
    );
    expect(html).toContain("Campus Support");
    expect(html).toContain("Clean classrooms and prep whiteboards");
  });
});
