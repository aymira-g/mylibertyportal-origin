import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PersonalAttendanceSection, { projectAttendanceShift } from "./PersonalAttendanceSection";
import ProfilePanel from "./ProfilePanel";
import * as shiftsRepo from "../attendance/shiftsRepository";

vi.mock("../../firebase", () => ({
  auth: {
    currentUser: {
      uid: "user-ops-lead-1",
      email: "opslead@myliberty.id",
    },
  },
  db: {},
}));

vi.mock("../shared/useToast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("../shared/useOverlayHistory", () => ({
  useOverlayHistory: vi.fn(),
}));

vi.mock("../pwa", () => ({
  InstallButton: () => React.createElement("div", { "data-testid": "pwa-install-btn" }),
}));

vi.mock("./authRepository", () => ({
  fetchOwnProfile: vi.fn().mockResolvedValue({
    displayName: "Ops Lead User",
    phone: "08123456789",
    dob: "1990-01-01",
    role: "opslead",
  }),
  updateProfilePhoto: vi.fn(),
  updateProfileDetails: vi.fn(),
}));

vi.mock("../attendance/shiftsRepository", () => ({
  fetchUserShifts: vi.fn(),
}));

describe("PersonalAttendanceSection & ProfilePanel Integration (Decision 2 / OD-STF-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockShiftsWithReconciliation = [
    {
      id: "shift-comp-01",
      userId: "user-ops-lead-1",
      role: "opslead",
      branchId: "kota_gorontalo",
      clockIn: "2026-10-17T08:00:00.000Z",
      clockOut: "2026-10-17T17:00:00.000Z",
      stationId: "kiosk-gto-01",
      // Sensitive cashier fields that MUST NEVER be displayed
      cashReconciliation: {
        expectedCash: 1500000,
        countedCash: 1500000,
        discrepancy: 0,
      },
      drawerCount: 1500000,
    },
    {
      id: "shift-act-02",
      userId: "user-ops-lead-1",
      role: "opslead",
      branchId: "kota_gorontalo",
      clockIn: "2026-10-18T08:30:00.000Z",
      clockOut: null, // Active shift
      stationId: "reception-02",
    },
  ];

  it("renders collapsed toggle button by default and does not fetch shifts automatically (on-demand default state)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PersonalAttendanceSection, { uid: "user-ops-lead-1" })
    );

    expect(html).toContain("My Attendance &amp; Shifts");
    expect(html).not.toContain("Recent Shift History (Self)");
    expect(shiftsRepo.fetchUserShifts).not.toHaveBeenCalled();
  });

  it("projectAttendanceShift projects raw shifts to attendance-only fields, discarding cashier reconciliation details", () => {
    const rawShift = {
      id: "shift-test-1",
      userId: "user-123",
      clockIn: "2026-10-17T08:00:00.000Z",
      clockOut: "2026-10-17T17:00:00.000Z",
      stationId: "reception-01",
      punctualityStatus: "On Time",
      // Sensitive cashier fields that must be discarded
      cashReconciliation: {
        expectedCash: 500000,
        countedCash: 500000,
        discrepancy: 0,
      },
      drawerCount: 500000,
      reviewStatus: "approved",
    };

    const projected = projectAttendanceShift(rawShift);

    expect(projected).toEqual({
      id: "shift-test-1",
      userId: "user-123",
      clockIn: "2026-10-17T08:00:00.000Z",
      clockOut: "2026-10-17T17:00:00.000Z",
      stationId: "reception-01",
      punctualityStatus: "On Time",
    });
    expect(projected.cashReconciliation).toBeUndefined();
    expect(projected.drawerCount).toBeUndefined();
    expect(projected.reviewStatus).toBeUndefined();
  });

  it("renders shift details (date, in/out times in WITA, duration, station) when expanded with records", () => {
    const html = renderToStaticMarkup(
      React.createElement(PersonalAttendanceSection, {
        uid: "user-ops-lead-1",
        initialOpen: true,
        initialShifts: mockShiftsWithReconciliation,
      })
    );

    // Displays section header
    expect(html).toContain("Recent Shift History (Self)");

    // Displays completed shift status and active shift status
    expect(html).toContain("Completed");
    expect(html).toContain("Active Shift");

    // Displays WITA clock-in and clock-out details
    expect(html).toMatch(/In:\s*16[.:]00\s*WITA/);
    expect(html).toMatch(/Out:\s*01[.:]00\s*WITA/);
    expect(html).toContain("(9.0 hrs)");
    expect(html).toContain("Station: kiosk-gto-01");
  });

  it("strictly omits cashier reconciliation, drawer count, and financial discrepancy details (OD-STF-01)", () => {
    const html = renderToStaticMarkup(
      React.createElement(PersonalAttendanceSection, {
        uid: "user-ops-lead-1",
        initialOpen: true,
        initialShifts: mockShiftsWithReconciliation,
      })
    );

    // Strict negative assertions: no cashier reconciliation terms or numbers
    expect(html).not.toContain("cashReconciliation");
    expect(html).not.toContain("Cash Reconciled");
    expect(html).not.toContain("drawerCount");
    expect(html).not.toContain("Discrepancy");
    expect(html).not.toContain("Balanced");
    expect(html).not.toContain("1500000");
    expect(html).not.toContain("1.500.000");
  });

  it("renders empty state message when the user has zero shift records", () => {
    const html = renderToStaticMarkup(
      React.createElement(PersonalAttendanceSection, {
        uid: "user-ops-lead-1",
        initialOpen: true,
        initialShifts: [],
      })
    );

    expect(html).toContain("No recent shift records found for your account.");
  });

  it("renders 'My Attendance & Shifts' for staff roles (opslead, instructor, frontoffice, manager)", () => {
    for (const staffRole of ["opslead", "instructor", "frontoffice", "manager"]) {
      const html = renderToStaticMarkup(
        React.createElement(ProfilePanel, {
          onClose: vi.fn(),
          onUpdated: vi.fn(),
          onLogout: vi.fn(),
          initialProfile: {
            displayName: "Staff Member",
            role: staffRole,
          },
        })
      );

      expect(html).toContain("My Attendance &amp; Shifts");
    }
  });

  it("strictly hides 'My Attendance & Shifts' for student and parent roles", () => {
    for (const nonStaffRole of ["student", "parent"]) {
      const html = renderToStaticMarkup(
        React.createElement(ProfilePanel, {
          onClose: vi.fn(),
          onUpdated: vi.fn(),
          onLogout: vi.fn(),
          initialProfile: {
            displayName: "Non Staff User",
            role: nonStaffRole,
          },
        })
      );

      expect(html).not.toContain("My Attendance &amp; Shifts");
      expect(html).not.toContain("Recent Shift History");
    }
  });
});
