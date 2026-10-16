import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ApprovalInbox } from "./ApprovalInbox";

let mockApprovals = [];
let mockUnappliedApprovals = [];

vi.mock("./approvalsRepository", () => ({
  listenToPendingApprovals: vi.fn((role, branch, onNext) => {
    onNext(mockApprovals);
    return vi.fn();
  }),
  listenToUnappliedApprovals: vi.fn((role, branch, onNext) => {
    onNext(mockUnappliedApprovals);
    return vi.fn();
  }),
  approveApprovalRequest: vi.fn().mockResolvedValue({ status: "approved" }),
  rejectApprovalRequest: vi.fn().mockResolvedValue({ status: "rejected" }),
  markApprovalApplied: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../finance/paymentsRepository", () => ({
  updatePaymentApprovalStatus: vi.fn().mockResolvedValue(undefined),
  executePaymentVoid: vi.fn().mockResolvedValue({ reversalId: "rev-1" }),
  markPaymentPending: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./useToast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("./useConfirm", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock("../../utils/networkReachability", () => ({
  checkNetworkReachability: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../firebase", () => ({
  auth: { currentUser: { uid: "dir_1", email: "director@myliberty.id" } },
}));

describe("ApprovalInbox (DOM04-GOV-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApprovals = [];
  });

  it("renders empty queue message when no pending approvals exist", () => {
    mockApprovals = [];
    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, { userRole: "director", branchId: "all", initialApprovals: [] })
    );

    expect(html).toContain("All clear!");
    expect(html).toContain("no pending dual-control authorization requests");
  });

  it("renders pending DISCOUNT_OR_REFUND approval ticket with details", () => {
    mockApprovals = [
      {
        id: "appr-disc-1",
        actionId: "DISCOUNT_OR_REFUND",
        label: "Fee Discount Request",
        domain: "finance",
        requestedBy: "Front Desk Staff",
        requestedByUid: "fo_1",
        payload: {
          studentId: "s-1",
          studentName: "Budi Santoso",
          amount: 900000,
          discountAmount: 150000,
          paymentId: "pay-101",
          reason: "Family plan discount 15%",
        },
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, { userRole: "director", branchId: "all", initialApprovals: mockApprovals })
    );

    expect(html).toContain("Fee Discount Request");
    expect(html).toContain("1 pending");
  });

  it("renders NEW_STAFF_ACCOUNT onboarding ticket without Admin option and with division selector (DOM09-SEC-04)", () => {
    mockApprovals = [
      {
        id: "appr-staff-1",
        actionId: "NEW_STAFF_ACCOUNT",
        label: "New Staff Account Onboarding",
        domain: "users",
        requestedBy: "Director Office",
        requestedByUid: "dir_1",
        payload: {
          uid: "new_staff_uid_1",
          email: "teacher.maya@myliberty.id",
          displayName: "Maya Sari",
        },
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, { userRole: "director", branchId: "all", initialApprovals: mockApprovals })
    );

    expect(html).toContain("New Staff Account Onboarding");
    expect(html).toContain("teacher.maya@myliberty.id");
    // Verify role dropdown excludes Admin per Blueprint Principle 3
    expect(html).not.toContain('<option value="admin"');
    // Verify role dropdown includes academic and operational leadership
    expect(html).toContain('<option value="instructorleader"');
    expect(html).toContain('<option value="opslead"');
    // Verify division selector is present
    expect(html).toContain("Assign Division:");
    expect(html).toContain('<option value="courses"');
    expect(html).toContain('<option value="kindergarten"');
    expect(html).toContain('<option value="all"');
  });

  it("renders STAFF_DEACTIVATION preview card (DOM09-GOV-02 / F-4)", () => {
    mockApprovals = [
      {
        id: "appr-deact-1",
        actionId: "STAFF_DEACTIVATION",
        label: "Staff Deactivation / Termination",
        domain: "staff",
        requestedBy: "Ops Lead",
        requestedByUid: "ops_1",
        payload: {
          targetUserId: "staff_123",
          targetName: "Budi Siregar",
          targetRole: "instructor",
          targetStatus: "resigned",
          reason: "Voluntary resignation",
        },
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, { userRole: "director", branchId: "all", initialApprovals: mockApprovals })
    );

    expect(html).toContain("Staff Deactivation / Termination");
    expect(html).toContain("Budi Siregar");
    expect(html).toContain("resigned");
  });

  it("renders Action Required / Unapplied tab badge when unapplied tickets exist (DOM09-COR-01 / F-1)", () => {
    mockUnappliedApprovals = [
      {
        id: "appr-unapplied-1",
        actionId: "STUDENT_CLASS_TRANSFER",
        label: "Student Class Transfer",
        domain: "students",
        status: "approved",
        applied: false,
        decidedBy: "Director",
        decidedAt: "2026-10-14T00:00:00.000Z",
        requestedBy: "Front Desk",
        payload: { studentId: "s-1", toClassId: "c-2", fromClassId: "c-1" },
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, {
        userRole: "director",
        branchId: "all",
        initialApprovals: [],
        initialUnappliedApprovals: mockUnappliedApprovals,
      })
    );

    expect(html).toContain("Action Required / Unapplied");
    expect(html).toContain("1 unapplied");
  });

  it("renders pending PAYMENT_CORRECTION_OR_VOID ticket with details (DOM04-GOV-05)", () => {
    mockApprovals = [
      {
        id: "appr-void-1",
        actionId: "PAYMENT_CORRECTION_OR_VOID",
        label: "Payment Correction / Void Reversal",
        domain: "finance",
        requestedBy: "Front Desk Staff",
        requestedByUid: "fo_1",
        payload: {
          studentId: "s-1",
          amount: 350000,
          paymentId: "pay-101",
          receiptNumber: "ML-101",
          reason: "Cashier miskey correction",
        },
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ApprovalInbox, { userRole: "vice_director", branchId: "all", initialApprovals: mockApprovals })
    );

    expect(html).toContain("Payment Correction / Void Reversal");
    expect(html).toContain("ML-101");
    expect(html).toContain("Cashier miskey correction");
  });
});
