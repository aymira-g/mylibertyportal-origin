# Active Plan: Executive Dual-Control & Risk-Based Approval Architecture Refinement

**Date:** 2026-10-07  
**Status:** In Progress (Phase 0 Baseline Established)  
**Governing Context:** Blueprint v3.3 (Proposed) + Unrecorded Owner Decisions of 2026-10-07 (§4.5)  
**Safety Protocol:** Level 1 Light Regression Check + Parity & Negative Authorization Testing  

---

## 1. Baseline Evidence & Change Safety (Phase 0)

### 1.1 Working Environment & Checkpoint State
- **Filesystem / Working Directory:** `/app/applet` (direct filesystem container; `.git` directory not present in sandbox).
- **Uncommitted Files Protected:** None present prior to starting; all existing codebase files preserved in their pristine initial state.
- **Pre-Change Verification Suite:**
  - `npm run typecheck` (`tsc --noEmit`): **PASSED** (0 errors).
  - `npm run lint` (`eslint .`): **PASSED** (0 errors, 0 warnings).
  - `npm test` (`vitest run`): **PASSED** (87 test suites passed, 1 skipped [emulator test], 1090 tests passed, 61 skipped, 0 failures).
  - `compile_applet` (`vite build`): **PASSED** (clean bundle created).
  - `npm run test:rules` (`firebase emulators:exec`): Skipped in container due to absence of Java JRE runtime required by the Firebase emulator (`Error: Could not spawn java -version`). Rule logic is actively verified via Vitest's `securityRulesMatrix` test suites.

---

## 2. Inventory of Existing 13 Approval Gates

| # | Action ID | Label | Domain | Current Client Approver | Current Client Eligible Roles | Current Backend (`firestore.rules`) Approver | Execution Mode | Known Issues & Legacy Behavior |
|---|---|---|---|---|---|---|---|---|
| 1 | `STAFF_ROLE_ELEVATION` | Staff Role / Permission Elevation | `staff` | `director` | `[director, vice_director]` | `director`, `vice_director` | `blocking` | Locked gate. Dual-control required even for Admin. Requester cannot be signer. Target user cannot self-promote. |
| 2 | `NEW_STAFF_ACCOUNT` | New Staff Account Creation | `staff` | `director` | `[director, vice_director]` | `director`, `vice_director` | `blocking` | Locked gate. Allows initial onboarding. Admin currently bypassed via F2. |
| 3 | `STAFF_DEACTIVATION` | Staff Deactivation / Termination | `staff` | `director` | `[director, vice_director]` | `director`, `vice_director` | `blocking` | Locked gate. Temporary leaves are separate from deactivation. Admin currently bypassed via F2. |
| 4 | `DISCOUNT_OR_REFUND` | Discounts & Refunds | `finance` | `director` | `[director, vice_director]` | `director`, `vice_director` | `blocking` | Locked gate under G-009. Admin currently bypassed via F2. |
| 5 | `CASH_DISCREPANCY` | Cash Discrepancy Escalation | `finance` | `manager` (Division Manager) | `[manager, director, vice_director]` | `manager`, `director`, `vice_director` | `blocking` | F1 client/backend agreement on Manager + Executives. Owner decided tiered model based on Rp amount (§4.5). |
| 6 | `TUITION_PLAN_CHANGE` | Tuition Plan Modification | `finance` | `manager` (Division Manager) | `[manager, director, vice_director]` | `manager`, `director`, `vice_director` | `blocking` | Division Manager + Executives. Branch-scoped. |
| 7 | `STUDENT_WITHDRAWAL_OR_FREEZE` | Student Withdrawal / Freeze | `students` | `manager` (Division Manager) | `[manager, director, vice_director]` | `manager`, `director`, `vice_director` | `logged` | Logged mode (immediate execution, async review). Branch-scoped. |
| 8 | `PLACEMENT_LEVEL_OVERRIDE` | Placement Level Override | `students` | `instructorleader` | `[instructorleader, director, vice_director]` (F1) | `instructorleader` ONLY | `blocking` | **F1 Discrepancy:** Client allowed Director/Vice Director; `firestore.rules` allows only `instructorleader`. Client must align to rules. |
| 9 | `SUBSTITUTE_INSTRUCTOR` | Substitute Instructor Assignment | `staff` | `instructorleader` | `[instructorleader, director, vice_director]` (F1) | `instructorleader` ONLY | `logged` | **F1 Discrepancy:** Client allowed Director/Vice Director; `firestore.rules` allows only `instructorleader`. Client must align to rules. |
| 10 | `CLASS_CANCELLATION_OR_RESCHEDULE` | Whole-Class Cancel / Reschedule | `classes` | `opslead` | `[opslead, manager, director, vice_director]` (F1) | `frontoffice` / `opslead` ONLY | `logged` | **F1 Discrepancy:** Client allowed Manager/Director/Vice Director; rules allow only Front Office / Ops Lead. Client must align to rules. |
| 11 | `RETROACTIVE_STUDENT_ATTENDANCE` | Retroactive Student Attendance | `attendance` | `opslead` | `[opslead, manager, director, vice_director]` (F1) | `frontoffice` / `opslead` ONLY | `blocking` | **F1 Discrepancy:** Client allowed Manager/Director/Vice Director; rules allow only Front Office / Ops Lead. Client must align to rules. |
| 12 | `STUDENT_CLASS_TRANSFER` | Student Class / Batch Transfer | `classes` | `opslead` | `[opslead, manager, director, vice_director]` (F1) | `frontoffice` / `opslead` ONLY | `blocking` | **F1 Discrepancy:** Client allowed Manager/Director/Vice Director; rules allow only Front Office / Ops Lead. Client must align to rules. |
| 13 | `STAFF_SHIFT_SELF_CORRECTION` | Staff Shift Self-Correction | `attendance` | `dynamic_hierarchy` | `[opslead, manager, director, vice_director]` | Evaluated by `approverRole` in ticket | `blocking` | **F3 Issue:** Executives were previously exempt (`null`). Owner decided Director and Vice Director review each other's (§4.5). |

---

## 3. Blast Radius Mapping

- **UI Consumers:**
  - `src/features/attendance/ShiftAdjustmentModal.jsx`: calls `createApprovalEnvelope("STAFF_SHIFT_SELF_CORRECTION")`, `submitApprovalRequest`.
  - `src/features/shared/ApprovalInbox.jsx`: displays pending approvals, checks `canApproveGate`, executes decisions.
  - `src/features/shared/usePendingApprovalsCount.js`: badge counter for pending approvals matching user role/branch.
  - `src/features/finance/PaymentModal.jsx`: calls `createApprovalEnvelope("DISCOUNT_OR_REFUND")`.
  - `src/features/classes/BatchModal.jsx`: class management actions.
  - `src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`: walk-in operations.
- **Backend & Data Access:**
  - `firestore.rules`: `isApproverForDoc(data)`, `/approvals/{approvalId}` match block.
  - `src/features/shared/approvalsRepository.js`: `submitApprovalRequest`, `listenToPendingApprovals`, `approveApprovalRequest`, `rejectApprovalRequest`, `markApprovalApplied`.
  - `src/features/shared/roles.js`: role normalization, `isExecutiveRole`, `isManagerRole`.
- **Test Suites Affected:**
  - `src/features/shared/approvalGates.test.js`
  - `src/features/shared/approvalsRepository.test.js`
  - `src/features/shared/securityRulesMatrix/approvals.test.js`
  - `src/features/shared/usePendingApprovalsCount.test.js`

---

## 4. Legacy Compatibility & Search Findings

- `branch_manager`: Aliased to `manager` in `roles.js`, `firestore.rules`, and `approvalGates.js`. Blueprint v3.1 §5.4 removed Branch Manager; the single `manager` key represents Division Managers (`courses` or `kindergarten`). Historical compatibility preserved; does not create a catch-all Branch Head.
- `isAdmin` / `admin`: Under Blueprint §7.3/§7.4 and Owner Decision 2026-10-07, System Admin has no business authority. Removing the Admin exemption in `createApprovalEnvelope` ensures Admin cannot bypass dual-control.
- `isExecutive`: Used in Firestore rules and repository listeners for multi-branch visibility. Does NOT grant unconstrained write/approval authority over domain-local gates.

---

## 5. Phased Implementation Strategy

- **Phase 1 (P1):** Evidence-based fixes:
  - Fix F1 (Client/rules parity): Remove overbroad executive/manager fallback on domain gates (`INSTRUCTOR_LEADER` and `OPS_LEAD`) in `approvalGates.js` and tests.
  - Fix F2 (Admin bypass): Remove `admin` exemption in `createApprovalEnvelope` so admin cannot bypass dual-control.
  - Document and report on F4 (`manager` role key and division scoping).
- **Phase 2 (P2):** Gate Schema Extension:
  - Add `primaryController`, `requiredDomain`, `requiredScope`, `controlLevel`, `escalationTarget`, `delegationAllowed`, `separationRequired`, `riskModifiers`.
  - Seed with today's values; mark provisional without altering unauthorized authority.
  - Add contextual risk evaluation framework `evaluateActionRisk(actionId, context)`.
- **Phase 3 (P3):** Status Workflow, Escalation & Owner Decisions:
  - Cash discrepancy tiers: < Rp 20.000 (Ops Lead), 20.000–49.999 (Vice Director), >= 50.000 (Director). Drawer handler cannot approve.
  - Executive shift self-correction (F3): Director and Vice Director review each other's.
  - Staff status/leave approval resolution (§4.5): superior reviews subordinate; executives review each other; 4-peer fallback chain when both away.
- **Phase 4 (P4):** Acting Director Delegation framework:
  - Explicit delegation record verification (sourceRole, targetRole, leave status check, capability, validity, non-self-approval).
- **Phase 5 (P5):** Canonical Documentation & Parity Verification:
  - Update `docs/specs/authorization-contract.md` and related docs.
  - Run full test suite, lint, typecheck, build.
