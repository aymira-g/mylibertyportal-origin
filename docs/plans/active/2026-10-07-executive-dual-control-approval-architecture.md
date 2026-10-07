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

## 5. Phased Implementation Summary & Verification

- **Phase 0 (P0) — Baseline Evidence & Checkpoint:**
  - Pristine tree recorded, test suite passed (1090 tests passed).
- **Phase 1 (P1) — Evidence-Based Parity Fixes:**
  - Fixed F1: Aligned client `canApproveGate` to `firestore.rules` by removing overbroad executive/manager fallback on domain gates (`INSTRUCTOR_LEADER` and `OPS_LEAD`).
  - Fixed F2: Removed `admin` exemption in `createApprovalEnvelope` so admin cannot bypass dual-control workflows.
  - Addressed F4: Preserved `manager` role key and division scoping (`manager` + `branchId` + `division`).
- **Phase 2 (P2) — Gate Schema Extension:**
  - Extended `GATED_ACTIONS` schema across all 13 gates with `primaryController`, `requiredDomain`, `requiredScope`, `controlLevel`, `escalationTarget`, `delegationAllowed`, `separationRequired`, and `riskModifiers`.
  - Added `evaluateActionRisk(actionId, context)` for contextual risk computation without hardcoded numbers.
- **Phase 3 (P3) — Status Workflow, Escalation & Owner Decisions (§4.5):**
  - Cash discrepancy tiers implemented in `getCashDiscrepancyApprover` (< 20k: Ops Lead; 20k–49.999k: Vice Director; >= 50k: Director). Cash drawer handler escalation enforced. Integrated into `createApprovalEnvelope` with support for `reconciliationData.discrepancy`.
  - Executive shift self-correction (F3): Director and Vice Director review each other's in `getSelfCorrectionApprover`.
  - Staff status/leave authorization (§4.5): Domain superiors review subordinates; leadership peers escalate to executives; executives review each other; 4-peer fallback chain when both executives are away; self-request strictly blocked.
- **Phase 4 (P4) — Acting Director Delegation Framework:**
  - Implemented `validateDelegation` requiring Director approved leave, excluding self-promotion / role elevation, and prohibiting double-signing.
- **Phase 5 (P5) — Canonical Documentation & Parity Verification:**
  - Updated `docs/specs/authorization-contract.md` with Section 6 covering dual-control, peer functional authorities, separation of duties, and materiality tiers.
  - Fixed syntax error in `firestore.rules` at line 627 (extra closing parenthesis in `/approvals/{approvalId}` update rule).
  - Aligned `securityRulesMatrix.helpers.js` `canUpdateApproval` to remove obsolete admin bypass.
  - Verified 100% parity across all 13 gates in `securityRulesMatrix/approvals.test.js`.

---

## 6. Verification Results & Definition of Done

- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) $\rightarrow$ **PASSED** (0 errors).
- **Lint:** `npm run lint` (`eslint .`) $\rightarrow$ **PASSED** (0 errors, 0 warnings).
- **Unit & Security Matrix Tests:** `npm test` (`vitest run`) $\rightarrow$ **PASSED** (87 test suites passed, 1116 tests passed, 0 failures).
- **Build:** `npm run build` (`vite build`) $\rightarrow$ **PASSED** (production client bundle and service worker built cleanly).
- **Rules Parity:** 30 tests in `securityRulesMatrix/approvals.test.js` passed, verifying 100% parity between client `canApproveGate` and backend `isApproverForDoc`.
- **Governance Status:**
  - **G-001 through G-011:** **RESOLVED** and ratified by Owner / Director Kifry on 2026-10-07.
  - Formally codified in [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md).
  - Blueprint v3.3 Section 26 ratified and updated to Ratified Authoritative Baseline.
- **Remaining Open Operational Items:**
  - Cumulative cash-discrepancy limit per cashier (deferred for review after 1 month of operations).
  - Controlled timeline for eventual deprecation of the legacy `branch_manager` alias in `roles.js` and `firestore.rules`.
