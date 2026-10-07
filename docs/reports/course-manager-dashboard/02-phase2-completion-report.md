# Course Division Manager Dashboard: Phase 2 Completion Report

> **Document Type:** Phase 2 Refinement & Verification Evidence  
> **Subsystem:** Approvals & Dual-Control Inbox Conformance  
> **Target Screen:** Course Division Manager Dashboard (`src/features/dashboard/ManagerDashboard.jsx`)  
> **Governing Baseline:** Blueprint v3.3 + Formal Owner Decisions of 2026-10-07 (G-006 & G-007)  
> **Status:** Implemented & Verified  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-07  

---

## 1. Summary of Changes

Under Ratified Owner Decisions **G-006 & G-007**, the Course Division Manager is the designated Primary Approver for:
1. `TUITION_PLAN_CHANGE` (Level 1, Finance Domain)
2. `STUDENT_WITHDRAWAL_OR_FREEZE` (Level 1, Students Domain)

The Course Division Manager is **not** authorized to approve cashier discrepancies, teacher substitutions, level placement overrides, class cancellations, student class transfers, discounts, or refunds.

In Phase 2, the following technical controls were implemented:

1. **Division Data Scope Isolation (`division: "courses"`):**
   - Updated `listenToPendingApprovals` in `src/features/shared/approvalsRepository.js` to accept `options.division`.
   - When `options.division === "courses"`, any request explicitly assigned to `kindergarten` is filtered out, ensuring Course Division Managers never see or approve Kindergarten tickets.
   - Added automated unit test covering division partition in `approvalsRepository.test.js`.

2. **Scoped Pending Approvals Hook:**
   - Updated `usePendingApprovalsCount` in `src/features/shared/usePendingApprovalsCount.js` to accept `options.division` and pass it to the repository listener.
   - Wired in `ManagerDashboard.jsx`:
     ```javascript
     const pendingApprovalsCount = usePendingApprovalsCount(
       "manager",
       managerBranchId || myBranch,
       { division: "courses" }
     );
     ```
   - The badge counter on the "Course Approvals" tab now strictly counts pending approvals within the Course Division.

3. **Approval Inbox Authority Guardrails (`ApprovalInbox.jsx`):**
   - Added `division` prop to `ApprovalInbox` and passed `division="courses"` from `ManagerDashboard.jsx`.
   - Imported and integrated `canApproveGate(userRole, req.actionId)`:
     - If an out-of-scope ticket ever lands in the inbox, the `Authorize` button is replaced with a clear read-only badge: **`Higher Sign-Off Required`** (with tooltip explaining designated authority).
     - In `handleApprove`, an explicit authorization check prevents processing unauthorized actions even if attempted programmatically.
   - Integrated Maker-Checker self-request protection: If `req.requestedByUid === auth.currentUser.uid`, the button displays **`Self-Request (Cannot Sign)`**, strictly preventing self-approval.

---

## 2. Files Modified

| File | Changes Made |
|---|---|
| `src/features/shared/approvalsRepository.js` | Added `options.division` support to `listenToPendingApprovals` to partition course vs kindergarten approvals. |
| `src/features/shared/usePendingApprovalsCount.js` | Added `options.division` support and proper hook dependency array. |
| `src/features/shared/ApprovalInbox.jsx` | Added `division` prop, integrated `canApproveGate`, and added visual badges for out-of-scope / self-requests. |
| `src/features/dashboard/ManagerDashboard.jsx` | Passed `{ division: "courses" }` to `usePendingApprovalsCount` and `ApprovalInbox`. |
| `src/features/shared/approvalsRepository.test.js` | Added unit test verifying division filtering in `listenToPendingApprovals`. |

---

## 3. Verification Evidence

- **TypeScript Typecheck (`npm run typecheck`):** PASSED (0 errors).
- **ESLint Code Quality (`npm run lint`):** PASSED (0 errors, 0 warnings).
- **Repository Unit Tests (`approvalsRepository.test.js`):** PASSED (6/6 tests passed).
- **Hook Unit Tests (`usePendingApprovalsCount.test.js`):** PASSED (2/2 tests passed).
- **Production Build (`compile_applet`):** Verified clean build.
- **Cost Impact:** Zero. No extra queries or paid APIs added.
