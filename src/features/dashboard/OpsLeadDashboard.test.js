import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Firebase
vi.mock("../../../firebase", () => ({
  auth: { currentUser: { uid: "opslead_1", email: "opslead@myliberty.id" } },
  db: {},
}));

// Mock useDashboardData
vi.mock("./useDashboardData", () => ({
  useDashboardData: () => ({
    users: [
      { id: "u1", firstName: "Staff", lastName: "One", role: "frontoffice", status: "active" },
      { id: "u2", firstName: "Staff", lastName: "Two", role: "officeboy", status: "active" },
    ],
    classes: [
      { id: "c1", className: "Level 1", classDay: "mon_wed", startTime: "14:00" },
    ],
    instructors: [
      { id: "i1", displayName: "Instructor A" },
    ],
    students: [
      { id: "s1", displayName: "Learner 1", status: "active", currentLevel: "warrior" },
    ],
    todos: [
      { id: "t1", title: "Clean classroom 1", completed: false, assignedToName: "Office Boy" },
    ],
    getStudentClasses: vi.fn().mockReturnValue([]),
    handleAddTodo: vi.fn(),
    handleToggleTodo: vi.fn(),
    handleDeleteTodo: vi.fn(),
  }),
}));

// Mock ApprovalInbox
vi.mock("../shared/ApprovalInbox", () => {
  const Inbox = () => React.createElement("div", { "data-testid": "approval-inbox-mock" }, "Approval Inbox Mock");
  return {
    default: Inbox,
    ApprovalInbox: Inbox,
  };
});

// Mock deskInquiriesRepository
vi.mock("./frontoffice/deskInquiriesRepository", () => ({
  fetchRecentDeskInquiries: vi.fn().mockResolvedValue([
    { id: "inq1", parentName: "Parent A", studentName: "Child A", phone: "08123456789", status: "new", division: "courses" },
    { id: "inq2", parentName: "Parent B", studentName: "Child B", phone: "08198765432", status: "contacted", division: "kindergarten" },
  ]),
}));

// Mock StudentRoster
vi.mock("../students", () => ({
  StudentRoster: () => React.createElement("div", { "data-testid": "student-roster-mock" }, "Student Roster Mock"),
}));

// Mock AvailableBatches
vi.mock("../classes", () => ({
  AvailableBatches: () => React.createElement("div", { "data-testid": "available-batches-mock" }, "Available Batches Mock"),
}));

// Mock FrontOfficeReportsTab
vi.mock("./frontoffice/FrontOfficeReportsTab", () => ({
  default: () => React.createElement("div", { "data-testid": "front-office-reports-mock" }, "Front Office Reports Mock"),
}));

// Mock paymentsRepository
vi.mock("../finance/paymentsRepository", () => ({
  getPaymentsForRecordedDay: vi.fn().mockResolvedValue([
    { id: "p1", studentName: "Learner A", amount: 150000, method: "cash", recordedAt: "2026-10-08T09:00:00Z" },
    { id: "p2", studentName: "Learner B", amount: 200000, method: "qris", recordedAt: "2026-10-08T10:00:00Z" },
  ]),
}));

// Mock usePendingApprovalsCount
vi.mock("../shared/usePendingApprovalsCount", () => ({
  usePendingApprovalsCount: () => 2,
}));

import { ToastProvider, ConfirmProvider } from "../shared";

import OpsLeadDashboard from "./OpsLeadDashboard";
import OpsLeadOverviewTab from "./opslead/OpsLeadOverviewTab";
import OpsLeadReconciliationTab from "./opslead/OpsLeadReconciliationTab";
import OpsLeadFacilitiesTab from "./opslead/OpsLeadFacilitiesTab";
import FrontOfficePerformanceTab from "./opslead/FrontOfficePerformanceTab";

describe("OpsLeadDashboard Component Suite (Phase 1 & Phase 2 Conformance)", () => {
  it("renders OpsLeadDashboard with all operational tabs", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(OpsLeadDashboard, {
            role: "opslead",
            branch: "Kota Gorontalo",
          })
        )
      )
    );
    expect(html).toContain("Operational Leader Portal");
    expect(html).toContain("Branch-Site Operations");
    expect(html).toContain("Overview");
    expect(html).toContain("Approvals");
    expect(html).toContain("Cash Reconciliation");
    expect(html).toContain("Facilities &amp; Support");
    expect(html).toContain("Front Desk Intake");
    expect(html).toContain("Campus Learners");
    expect(html).toContain("Capacity &amp; Batches");
    expect(html).toContain("Live Schedule Board");
    expect(html).toContain("Operational Reports");
    expect(html).toContain("Events &amp; Logistics");
  });

  it("renders FrontOfficePerformanceTab with intake metrics and queue", () => {
    const html = renderToStaticMarkup(
      React.createElement(FrontOfficePerformanceTab, {
        myBranch: "Kota Gorontalo",
        targetBranchId: "kota_gorontalo",
      })
    );
    expect(html).toContain("Front Office Intake &amp; Desk Performance");
    expect(html).toContain("Needs Follow-Up");
    expect(html).toContain("Contacted Leads");
    expect(html).toContain("Trials Booked");
    expect(html).toContain("Read-Only Operational Coordination");
  });

  it("renders OpsLeadOverviewTab with on-duty staff, KPI counters, and operational bottlenecks cockpit", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadOverviewTab, {
        myBranch: "Kota Gorontalo",
        users: [
          { id: "u1", displayName: "Front Office Staff", role: "frontoffice", status: "active", branch: "Kota Gorontalo" },
          { id: "u2", displayName: "Cleaning Staff", role: "officeboy", status: "active", branch: "Kota Gorontalo" },
        ],
        classes: [],
        pendingApprovalsCount: 2,
        dailyPayments: [{ id: "p1", amount: 350000 }],
        todos: [{ id: "t1", completed: false }],
        uncontactedInquiriesCount: 3,
      })
    );
    expect(html).toContain("Operational Leader Command Center");
    expect(html).toContain("Branch-Site Operational Bottlenecks &amp; Action Required");
    expect(html).toContain("Dual-Control Approvals");
    expect(html).toContain("Facility Tasks");
    expect(html).toContain("uncontacted leads");
  });

  it("renders OpsLeadReconciliationTab with tiered authority banner and cash breakdown", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadReconciliationTab, {
        dailyPayments: [
          { id: "p1", amount: 150000, method: "cash", studentName: "Alice" },
          { id: "p2", amount: 200000, method: "qris", studentName: "Bob" },
        ],
        myBranch: "Kota Gorontalo",
        loading: false,
      })
    );
    expect(html).toContain("Shift Cash Reconciliation &amp; Discrepancy Oversight");
    expect(html).toContain("Ratified Decision G-009 Tiered Authority");
    expect(html).toContain("Under Rp 20.000");
  });

  it("renders OpsLeadFacilitiesTab with maintenance dispatch form and active tasks", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OpsLeadFacilitiesTab, {
          todos: [
            { id: "t1", title: "Clean classroom 2", completed: false, assignedToName: "Office Boy" },
          ],
          users: [
            { id: "u2", displayName: "Ahmad OB", role: "officeboy", status: "active" },
          ],
          myBranch: "Kota Gorontalo",
        })
      )
    );
    expect(html).toContain("Branch Facilities &amp; Maintenance Coordination");
    expect(html).toContain("Dispatch Site Maintenance / Cleaning Task");
    expect(html).toContain("Clean classroom 2");
  });

  it("filters office support staff strictly to selected branch in Executive preview mode", () => {
    const crossBranchUsers = [
      { id: "ob_gto", displayName: "Ahmad Kota", role: "officeboy", status: "active", branch: "Kota Gorontalo" },
      { id: "ob_boba", displayName: "Budi Bone", role: "officeboy", status: "active", branch: "Bone Bolango" },
      { id: "ob_limb", displayName: "Citra Limboto", role: "officeboy", status: "active", branch: "Limboto" },
    ];

    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(OpsLeadFacilitiesTab, {
          todos: [],
          users: crossBranchUsers,
          myBranch: "Kota Gorontalo",
        })
      )
    );
    expect(html).toContain("1 Office Support on duty");
    expect(html).toContain("Ahmad Kota");
    expect(html).not.toContain("Budi Bone");
    expect(html).not.toContain("Citra Limboto");
  });
});
