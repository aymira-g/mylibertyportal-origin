import { describe, it, expect, vi } from "vitest";
import {
  submitApprovalRequest,
  approveApprovalRequest,
  rejectApprovalRequest,
  submitStaffOnboardingRequest,
} from "./approvalsRepository";
import { APPROVAL_STATUS } from "./approvalGates";

vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user_123", displayName: "Test Officer", email: "test@myliberty.com" } },
}));

vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn().mockResolvedValue({ id: "appr_999" }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn().mockReturnValue("SERVER_TIMESTAMP"),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

describe("approvalsRepository", () => {
  it("submits an approval envelope with PENDING status and normalized branchId", async () => {
    const envelope = {
      actionId: "DISCOUNT_OR_REFUND",
      label: "Discounts & Refunds",
      approverRole: "director",
      approverBranchId: "Kota Gorontalo",
      requestedBy: "Staff Member",
    };

    const result = await submitApprovalRequest(envelope);
    expect(result.id).toBe("appr_999");
    expect(result.status).toBe(APPROVAL_STATUS.PENDING);
    expect(result.approverBranchId).toBe("kota_gorontalo");
  });

  it("throws an error when submitting an invalid envelope", async () => {
    await expect(submitApprovalRequest(null)).rejects.toThrow("Invalid approval envelope");
    await expect(submitApprovalRequest({})).rejects.toThrow("Invalid approval envelope");
  });

  it("approves an approval request with decision payload", async () => {
    const result = await approveApprovalRequest("appr_999", {
      approverName: "Branch Manager",
      notes: "Approved after receipt inspection",
    });

    expect(result.id).toBe("appr_999");
    expect(result.status).toBe(APPROVAL_STATUS.APPROVED);
    expect(result.decidedBy).toBe("Branch Manager");
    expect(result.decisionNotes).toBe("Approved after receipt inspection");
  });

  it("rejects an approval request with rejection reason", async () => {
    const result = await rejectApprovalRequest("appr_999", {
      approverName: "Branch Manager",
      reason: "Missing documentation",
    });

    expect(result.id).toBe("appr_999");
    expect(result.status).toBe(APPROVAL_STATUS.REJECTED);
    expect(result.decidedBy).toBe("Branch Manager");
    expect(result.rejectionReason).toBe("Missing documentation");
  });

  it("submits a new staff onboarding approval request with appropriate payload", async () => {
    const result = await submitStaffOnboardingRequest({
      uid: "user_new_google",
      email: "newteacher@gmail.com",
      displayName: "New Teacher",
    });

    expect(result.id).toBe("appr_999");
    expect(result.actionId).toBe("NEW_STAFF_ACCOUNT");
    expect(result.requestedByUid).toBe("user_new_google");
    expect(result.status).toBe(APPROVAL_STATUS.PENDING);
    // Ratified approver for NEW_STAFF_ACCOUNT is the Director (Vice Director fallback).
    // This previously asserted "admin", which matches no isApproverForDoc branch and is
    // also rejected by canApproveGate — so the ticket could be created but never decided.
    expect(result.approverRole).toBe("director");
  });

  it("filters out mismatched division items in listenToPendingApprovals when options.division is provided", async () => {
    let snapshotCallback = null;
    const { onSnapshot } = await import("firebase/firestore");
    /** @type {any} */ (onSnapshot).mockImplementation((_q, onNext) => {
      snapshotCallback = onNext;
      return vi.fn();
    });

    const { listenToPendingApprovals } = await import("./approvalsRepository");

    let receivedItems = [];
    listenToPendingApprovals(
      "manager",
      "kota_gorontalo",
      (items) => {
        receivedItems = items;
      },
      vi.fn(),
      { division: "courses" }
    );

    // Emit a snapshot with course, kindergarten, and shared items
    snapshotCallback({
      docs: [
        { id: "1", data: () => ({ id: "1", label: "Course Item", division: "courses" }) },
        { id: "2", data: () => ({ id: "2", label: "Kindergarten Item", division: "kindergarten" }) },
        { id: "3", data: () => ({ id: "3", label: "Shared Item", division: "all" }) },
      ],
    });

    expect(receivedItems.length).toBe(2);
    expect(receivedItems.map((i) => i.id)).toEqual(["1", "3"]);
  });
});
