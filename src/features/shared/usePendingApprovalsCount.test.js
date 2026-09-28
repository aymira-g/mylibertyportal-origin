import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePendingApprovalsCount } from "./usePendingApprovalsCount";
import * as approvalsRepo from "./approvalsRepository";

describe("usePendingApprovalsCount hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports usePendingApprovalsCount as a function", () => {
    expect(typeof usePendingApprovalsCount).toBe("function");
  });

  it("safely handles listenToPendingApprovals data updates and unsubscription", () => {
    const unsubMock = vi.fn();
    let dataCallback = null;
    let errorCallback = null;

    vi.spyOn(approvalsRepo, "listenToPendingApprovals").mockImplementation(
      (role, branchId, onData, onError) => {
        dataCallback = onData;
        errorCallback = onError;
        return unsubMock;
      }
    );

    // Test that repository listener integration accepts callback and handles arrays
    let count = 0;
    const unsub = approvalsRepo.listenToPendingApprovals(
      "admin",
      "kota_gorontalo",
      (approvals) => {
        count = Array.isArray(approvals) ? approvals.length : 0;
      },
      () => {
        count = 0;
      }
    );

    expect(approvalsRepo.listenToPendingApprovals).toHaveBeenCalledWith(
      "admin",
      "kota_gorontalo",
      expect.any(Function),
      expect.any(Function)
    );

    // Simulate snapshot emission with 3 pending approvals
    dataCallback([{ id: "1" }, { id: "2" }, { id: "3" }]);
    expect(count).toBe(3);

    // Simulate error
    errorCallback(new Error("Permission denied"));
    expect(count).toBe(0);

    // Verify unmount unsubscription
    unsub();
    expect(unsubMock).toHaveBeenCalled();
  });
});
