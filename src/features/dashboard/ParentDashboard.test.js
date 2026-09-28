import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ParentDashboard from "./ParentDashboard";
import { ToastProvider } from "../shared";

vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "parent123" } },
}));

vi.mock("../students/parentPortalRepository", () => ({
  getAuthenticatedParentBundle: vi.fn().mockResolvedValue({
    parent: { id: "parent123", displayName: "Ibu Rahma" },
    children: [
      { id: "child1", displayName: "Ayu", studentId: "NIS-001", currentLevel: "warrior", program: "General English", branch: "Kota Gorontalo" },
      { id: "child2", displayName: "Bima", studentId: "NIS-002", currentLevel: "hero", program: "Kids English", branch: "Kota Gorontalo" },
    ],
  }),
  getChildAttendanceAndClasses: vi.fn().mockResolvedValue({
    classes: [
      { id: "c1", className: "English Warrior 1", level: "Warrior", scheduleDays: ["Senin", "Rabu"], scheduleTime: "16:00" },
    ],
    attendance: [
      { id: "att1", attendanceDate: "2026-09-26", status: "PRESENT", method: "SCAN" },
      { id: "att2", attendanceDate: "2026-09-24", status: "LATE", method: "MANUAL" },
    ],
  }),
  buildPaymentSummary: vi.fn().mockReturnValue({ status: "paid" }),
}));

describe("ParentDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial loading state markup correctly", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ParentDashboard, { user: { uid: "parent123" } })
      )
    );
    expect(html).toContain("Memuat Portal Orang Tua");
  });
});
