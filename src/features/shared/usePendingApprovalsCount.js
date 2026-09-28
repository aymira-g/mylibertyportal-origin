import { useState, useEffect } from "react";
import { listenToPendingApprovals } from "./approvalsRepository";

/**
 * Real-time count of pending approvals for a given role and branch.
 * Returns 0 if there are no pending requests or if user is unauthorized.
 *
 * @param {string|null|undefined} userRole
 * @param {string} [branchId]
 * @returns {number}
 */
export function usePendingApprovalsCount(userRole, branchId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userRole) {
      return;
    }

    const unsubscribe = listenToPendingApprovals(
      userRole,
      branchId,
      (approvals) => {
        setCount(Array.isArray(approvals) ? approvals.length : 0);
      },
      (err) => {
        console.warn("usePendingApprovalsCount error:", err);
        setCount(0);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [userRole, branchId]);

  return userRole ? count : 0;
}
