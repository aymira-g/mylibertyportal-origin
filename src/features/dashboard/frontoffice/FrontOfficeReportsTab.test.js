import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FrontOfficeReportsTab from "./FrontOfficeReportsTab";

vi.mock("../../../firebase", () => ({
  auth: { currentUser: { uid: "test-user-1", email: "user@myliberty.id" } },
  db: {},
}));

vi.mock("../../shared/useToast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("../../finance/paymentsRepository", () => ({
  getPaymentsForRecordedDay: vi.fn().mockResolvedValue([]),
}));

vi.mock("./deskInquiriesRepository", () => ({
  fetchRecentDeskInquiries: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../attendance/shiftsRepository", () => ({
  fetchUserShifts: vi.fn().mockResolvedValue([]),
  fetchOpenShiftFor: vi.fn().mockResolvedValue(null),
}));

vi.mock("./ShiftReconciliationModal", () => ({
  default: () => React.createElement("div", { "data-testid": "shift-reconcile-modal-mock" }),
}));

describe("FrontOfficeReportsTab Integration — Cashier Drawer Separation (FP-OPS-11A / OD-O3)", () => {
  const dummyShift = {
    id: "shift-active-99",
    userId: "test-user-1",
    branchId: "kota_gorontalo",
    clockIn: "2026-10-17T08:00:00Z",
    status: "active",
  };

  it("exposes End Shift & Count Drawer button when rendered for Front Office role", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontOfficeReportsTab, {
        myBranch: "Kota Gorontalo",
        division: "courses",
        activeShift: dummyShift,
        userRole: "frontoffice",
      })
    );

    expect(html).toContain("End Shift &amp; Count Drawer");
    expect(html).not.toContain("Duty Shift Active (Kiosk Attendance Only)");
  });

  it("omits End Shift & Count Drawer and displays Duty Shift Active badge when mounted for Ops Lead", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontOfficeReportsTab, {
        myBranch: "Kota Gorontalo",
        division: "courses",
        activeShift: dummyShift,
        userRole: "opslead",
      })
    );

    expect(html).not.toContain("End Shift &amp; Count Drawer");
    expect(html).toContain("Duty Shift Active (Kiosk Attendance Only)");
  });
});
