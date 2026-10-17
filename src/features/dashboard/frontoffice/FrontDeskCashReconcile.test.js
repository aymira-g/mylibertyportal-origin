import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FrontDeskCashReconcile from "./FrontDeskCashReconcile";

vi.mock("../../shared/useToast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("../../finance/paymentsRepository", () => ({
  getPaymentsForRecordedDay: vi.fn().mockResolvedValue([]),
}));

vi.mock("./ShiftReconciliationModal", () => ({
  default: () => React.createElement("div", { "data-testid": "shift-reconcile-modal-mock" }),
}));

describe("FrontDeskCashReconcile Cashier Drawer G-009 / OD-O3 Separation (FP-OPS-11A)", () => {
  const dummyShift = {
    id: "shift-123",
    userId: "staff-1",
    branchId: "kota_gorontalo",
    clockIn: "2026-10-17T08:00:00Z",
    status: "active",
  };

  it("renders 'End Shift & Count Drawer' button for Front Office staff with active shift", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontDeskCashReconcile, {
        branchLabel: "Kota Gorontalo",
        activeShift: dummyShift,
        userRole: "frontoffice",
        currentUser: { uid: "fo-1", role: "frontoffice" },
      })
    );

    expect(html).toContain("End Shift &amp; Count Drawer");
    expect(html).not.toContain("Duty Shift Active (Kiosk Attendance Only)");
  });

  it("suppresses 'End Shift & Count Drawer' button and renders Duty Shift Active badge for Ops Lead", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontDeskCashReconcile, {
        branchLabel: "Kota Gorontalo",
        activeShift: dummyShift,
        userRole: "opslead",
        currentUser: { uid: "ops-1", role: "opslead" },
      })
    );

    expect(html).not.toContain("End Shift &amp; Count Drawer");
    expect(html).toContain("Duty Shift Active (Kiosk Attendance Only)");
  });

  it("suppresses 'End Shift & Count Drawer' for operational leader aliases", () => {
    for (const role of ["ops_lead", "operational_leader", "frontofficelead"]) {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskCashReconcile, {
          branchLabel: "Kota Gorontalo",
          activeShift: dummyShift,
          userRole: role,
          currentUser: { uid: "ops-1", role },
        })
      );

      expect(html).not.toContain("End Shift &amp; Count Drawer");
      expect(html).toContain("Duty Shift Active (Kiosk Attendance Only)");
    }
  });

  it("does not render End Shift button or Duty badge when no shift is active", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontDeskCashReconcile, {
        branchLabel: "Kota Gorontalo",
        activeShift: null,
        userRole: "frontoffice",
      })
    );

    expect(html).not.toContain("End Shift &amp; Count Drawer");
    expect(html).not.toContain("Duty Shift Active (Kiosk Attendance Only)");
  });

  it("respects explicit canReconcileCashierShift override when provided", () => {
    // Explicit false blocks drawer counting even for frontoffice
    const htmlBlocked = renderToStaticMarkup(
      React.createElement(FrontDeskCashReconcile, {
        branchLabel: "Kota Gorontalo",
        activeShift: dummyShift,
        userRole: "frontoffice",
        canReconcileCashierShift: false,
      })
    );
    expect(htmlBlocked).not.toContain("End Shift &amp; Count Drawer");
    expect(htmlBlocked).toContain("Duty Shift Active (Kiosk Attendance Only)");

    // Explicit true enables drawer counting
    const htmlAllowed = renderToStaticMarkup(
      React.createElement(FrontDeskCashReconcile, {
        branchLabel: "Kota Gorontalo",
        activeShift: dummyShift,
        userRole: "opslead",
        canReconcileCashierShift: true,
      })
    );
    expect(htmlAllowed).toContain("End Shift &amp; Count Drawer");
    expect(htmlAllowed).not.toContain("Duty Shift Active (Kiosk Attendance Only)");
  });
});
