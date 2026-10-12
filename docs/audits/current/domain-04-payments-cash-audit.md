# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 4: Payments / Cash / Financial State

> **Audit ID:** `L2-DOM04-2026-10-12`  
> **Section:** Payments / Cash Drawer / Receipts / Financial Reporting / Dual-Control Discount Gates  
> **Target:** [Domain 4 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#4-payments--cash--financial-state)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE — ALL 4 FINDINGS REMEDIATED & VERIFIED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically evaluated the end-to-end payment, cash management, and financial lifecycle:
`Payment intake → Schema validation → Atomic batch commit → Student payment health update → Idempotency / duplicate protection → Electronic receipt generation → WhatsApp message dispatch → Cashier shift reconciliation → Cash discrepancy escalation → Maker-checker discount gates → Financial report aggregation`.

Special scrutiny was applied to Firestore rules query boundaries, division isolation for non-executive staff, missing composite indexes on financial date ranges, idempotency replay mechanisms, drawer discrepancy thresholds, and status synchronization between approval tickets and payment records.

### Core Question
> *"Can money-related state change more than once, leak across branches/divisions, fail silently under Firestore security rules, or operate without a trustworthy audit trail?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - **Atomic Batch Commit:** Payment records and student profile updates (`paymentStatus`, `lastPaymentPeriod`, `lastPaymentDate`, `lastPaymentAmount`, `lastPaymentMethod`, `paidUntil`) are committed in an atomic `writeBatch` in `paymentsRepository.recordPayment`. Either both land or neither does.
  - **Immutability of Financial Records:** In `firestore.rules:864-887`, there is no `allow delete` rule for `/payments`. Payments cannot be deleted by any role (including admin). Updates are strictly restricted to non-financial metadata (`notes`, `approvalStatus`, `referenceNumber`, `updatedAt`). Financial values (`amount`, `studentId`, `method`, `recordedAt`, `recordedBy`) are immutable once written.
  - **Idempotency Protection:** `recordPayment` supports an `idempotencyKey` parameter that uses deterministic document IDs in `/payments/{idempotencyKey}`. If a network retry occurs or the cashier double-clicks, the existing document is returned without double-charging or creating orphan documents.
  - **Fail-Closed Network Guard:** `PaymentModal`, `FrontDeskCashReconcile`, `ShiftReconciliationModal`, and `ApprovalInbox` verify network reachability via `checkNetworkReachability()` before initiating financial mutations, preventing offline write stalls.
  - **Cash Discrepancy Escalation Gate:** If front desk cash drawer discrepancy exceeds the calculated threshold on clock-out, `clockOutShiftWithCashReconciliation` automatically generates a `CASH_DISCREPANCY` approval envelope and submits it to the management queue.

- **Key Discovery 1 (High — DOM04-SEC-01):** In `paymentsRepository.js:49-137` (`getRecentPayments`, `getPaymentsForRecordedDay`, `fetchPaymentHistory`), queries on `/payments` do not enforce caller branch resolution for non-executive roles. When a Division Manager or Front Office opens `FinancialReportsTab` (where `branchFilter = "all"` by default) or calls `getRecentPayments(limit, null)`, the query has no `where("branchId", "==", ...)` filter. Under Firestore security rules (`firestore.rules:869`), non-executives cannot list `/payments` without `isSameBranchStrict`. The query fails with `FirebaseError: Missing or insufficient permissions`, causing the Financial Reports tab to fail silently and display 0 revenue.
- **Key Discovery 2 (High — DOM04-IDX-01):** In `firestore.indexes.json:53-67` and `paymentsRepository.js:94-137`, `getPaymentsForRecordedDay` executes a compound query with `where("branchId", "==", ...)` + `where("division", "==", ...)` + `where("recordedAt", ">=", ...)` + `where("recordedAt", "<", ...)`. The repository contains indexes only for `(branchId, recordedAt)`, lacking `(branchId, division, recordedAt)`. For Kindergarten division cashiers, the query throws `failed-precondition: The query requires an index`. The fallback fetches the oldest 200 documents by key without date ordering, omitting today's payments and reporting IDR 0 expected cash drawer intake.
- **Key Discovery 3 (Medium — DOM04-COR-01):** In `TuitionDueWidget.jsx:41`, `handleSendReminder` calls `buildWhatsAppRenewalReminderMessage(student)` with a direct positional argument, whereas `buildWhatsAppRenewalReminderMessage` in `receiptMessages.js:81` expects an options object `{ student, paidUntil, ... }`. Destructuring extracts `student.student` (undefined), causing the student name to default to `"Student"` and dropping `remainingDays`. Every reminder sent from the Front Office Tuition Due Widget addresses the parent as *"Dear Parent / Student of \*Student\*... The tuition plan for \*Student\* is due for renewal"*.
- **Key Discovery 4 (Medium — DOM04-GOV-01):** In `PaymentModal.jsx:230-264` and `ApprovalInbox.jsx:114-208`, when a payment carries a multi-month plan discount (e.g. quarterly 5%, semester 10%, annual 15%), `payment.approvalStatus` is initialized to `"pending"` and a `DISCOUNT_OR_REFUND` ticket is submitted. When the Director or Vice Director approves the request in `ApprovalInbox`, only the approval ticket is updated; the payment document is never touched. As a result, `payment.approvalStatus` remains permanently `"pending"`, and the parent/student receipt permanently displays `"⏳ Discount pending manager review"`.

---

## 2. Five-Pass Workflow Trace

```text
Front Office Cashier / Modal (`PaymentModal.jsx` / `RecordPaymentTab.jsx`)
  ↓
Validation & Normalization (`paymentRecordSchema` / `branchToId` / `normalizeDivision`)
  ↓
Atomic Batch Write (`paymentsRepository.recordPayment` → `/payments` + `/users`)
  ↓
Receipt & WhatsApp Dispatch (`DigitalReceiptTab` / `buildWhatsAppReceiptMessage`)
  ↓
Shift Reconciliation & Cash Count (`FrontDeskCashReconcile` / `ShiftReconciliationModal`)
  ↓
Discrepancy / Discount Approval Queue (`ApprovalInbox` → `approvalsRepository`)
  ↓
Reporting Aggregation (`FinancialReportsTab` / `financeUtils.summarizePaymentsByMethod`)
```

### Pass 1: Internal Logic & Resource Safety
1. **Financial Immutability:** Payments cannot be deleted via the client or rules. Sensitive financial fields (`amount`, `studentId`, `method`, `recordedAt`, `recordedBy`) cannot be updated once committed.
2. **Atomic Invariant:** A payment cannot exist in `/payments` without updating `users/{studentId}`'s `paymentStatus`, `lastPaymentPeriod`, `lastPaymentAmount`, and `paidUntil` in the same batch.
3. **Bounded Query Limits:** `FinancialReportsTab` bounds queries to `limitCount` (100–300), and `PaymentCashierTab` bounds recent transactions to 50 items.
4. **Listener Safety:** Financial tabs do not leave unbounded Firestore realtime snapshot listeners active on `/payments`; reads are bounded and on-demand.

### Pass 2: Trust Boundary Analysis
1. **Client Role Authority:** Front Office staff can only record payments for students within their own branch and division (`firestore.rules:872`). They cannot create payments for foreign branch students or non-student accounts.
2. **Branch Boundary Leakage:** Non-executive staff attempting to query `/payments` without their branch ID are blocked by `firestore.rules:869` (`isSameBranchStrict`). However, `paymentsRepository.js` fails to resolve the caller's branch when `branchId` is omitted, causing query crashes (**DOM04-SEC-01**).
3. **Division Boundary Isolation:** Kindergarten staff require `where("division", "==", "kindergarten")` on `/payments` list queries. Omission causes `permission-denied` or triggers missing composite index errors (**DOM04-IDX-01**).

### Pass 3: Failure, Edge & Attack Matrix

| Attack / Vector | Scenario | Defense Mechanism | Verdict |
|---|---|---|---|
| **Negative Payment Injection** | Malicious client attempts to record negative payment (unauthorized refund) | Firestore rule enforces `request.resource.data.amount > 0` | **PASS** |
| **Cross-Branch Payment Creation**| Cashier records payment for student belonging to another branch | Firestore rule verifies `isSameBranch(get(.../users/studentId).data)` | **PASS** |
| **Payment Deletion** | Cashier attempts to delete a payment record | Firestore rules omit delete rule (default deny) | **PASS** |
| **Amount Tampering After Write**| Staff attempts to alter `amount` on existing payment document | Rule `diff().affectedKeys().hasOnly(['notes', 'approvalStatus', ...])` blocks change | **PASS** |
| **Double Click / Network Retry**| Cashier rapidly clicks "Record Payment" twice during network lag | `saving` guard + `idempotencyKey` doc lookup returns existing payment | **PASS** |
| **Unscoped List (Manager)** | Manager opens Financial Reports tab with `branchFilter = "all"` | **Query omits `branchId`; rule `isSameBranchStrict` rejects with permission-denied** | **FAIL (DOM04-SEC-01)** |
| **Kindergarten Reconciliation** | Cashier loads daily cash reconciliation for Kindergarten division | **Query requires composite index `(branchId, division, recordedAt)`; fails** | **FAIL (DOM04-IDX-01)** |
| **WhatsApp Reminder Dispatch** | Cashier clicks WhatsApp reminder on Tuition Due widget | **Positional arg bug formats student name as literal "Student"** | **FAIL (DOM04-COR-01)** |
| **Discount Sign-off Sync** | Executive approves discount ticket in Approval Inbox | **Ticket updates but payment remains stuck in "pending" status** | **FAIL (DOM04-GOV-01)** |
| **Offline Cashier Clock-Out** | Tablet loses connection while submitting drawer count | `checkNetworkReachability()` blocks submit before partial state commit | **PASS** |

### Pass 4: Cross-Feature Handoffs
1. **Payments → Student Profile:** `users/{studentId}` reflects new `paidUntil` date, immediately updating `TuitionDueWidget` and `StudentRosterTable`.
2. **Payments → Parent Portal:** `parentPortalRepository.fetchPaymentHistory` queries `/payments` scoped by `studentId`, allowed by `firestore.rules:867` (`resource.data.studentId == auth.uid || isParentOf(...)`).
3. **Payments → Cash Drawer Shift Closing:** `FrontDeskCashReconcile` aggregates today's payments to populate expected cash drawer totals during staff shift clock-out.

### Pass 5: Runtime Proof & Evidence
- **Vitest Payments Test Suite:** `src/features/finance/paymentsRepository.test.js` passed (11 tests).
- **Finance Utils Tests:** `src/features/finance/financeUtils.test.js` passed (4 tests).
- **Receipt Messages Tests:** `src/features/finance/receiptMessages.test.js` passed (11 tests).
- **Firestore Emulator Rules Tests:** `src/features/shared/firestoreRules.emulator.test.js` validated payment creation by Front Office, student ownership check, and immutable fields.

---

## 3. Master Bug Ledger (Domain 4 Findings)

### Finding 1: DOM04-SEC-01 — CLOSED (REMEDIATED)
- **Section / Workflow:** Reports / Financial Reporting (`src/features/finance/paymentsRepository.js:22-50`, `FinancialReportsTab.jsx:32-45`).
- **Trigger:** A Division Manager, Supervisor, or Front Office staff member views `FinancialReportsTab` when `branchFilter = "all"` (the default on mount), or calls `getRecentPayments` / `getPaymentsForRecordedDay` without an explicit `branchId`.
- **Root Cause:** `paymentsRepository.js` constructed an unscoped Firestore list query on `/payments` without `where("branchId", "==", ...)`. Under Firestore security rules (`firestore.rules:869`), non-executives cannot list `/payments` without `isSameBranchStrict`. The query failed with `FirebaseError: Missing or insufficient permissions`, causing the Financial Reports tab to crash/fail silently and display 0 revenue.
- **Remediation Implemented:**
  - Implemented `resolveCallerBranchId(explicitBranchId)` in `src/features/finance/paymentsRepository.js:22-50`. Resolves caller's authorized branch ID, allowing `"all"` only for executive roles (`admin`, `director`, `vice_director`). Restricts non-executives to their assigned branch. Fails closed (returns empty array) if caller cannot be verified.
  - In `src/features/reports/tabs/FinancialReportsTab.jsx:35`, updated `canonicalBranchId` to default to `"all"`, allowing `resolveCallerBranchId` to dynamically scope non-executives to their own branch.
  - Added unit test suite in `src/features/finance/paymentsRepository.test.js` validating that non-executives requesting `"all"` are scoped to their assigned branch.
- **Severity:** High.
- **Status:** **CLOSED (REMEDIATED)**.

### Finding 2: DOM04-IDX-01 — CLOSED (REMEDIATED)
- **Section / Workflow:** Cash Reconciliation / Indexes (`firestore.indexes.json:69-86`, `paymentsRepository.js:131-185`).
- **Trigger:** Front desk cashier or manager opens `FrontDeskCashReconcile.jsx` or `PaymentCashierTab.jsx` for Kindergarten division (`division === "kindergarten"`).
- **Root Cause:** `getPaymentsForRecordedDay` executed a compound range query with `where("branchId", "==", ...)` + `where("division", "==", "kindergarten")` + `where("recordedAt", ">=", ...)` + `where("recordedAt", "<", ...)`. The project lacked composite indexes for `(branchId, division, recordedAt)`, triggering `failed-precondition: The query requires an index`.
- **Remediation Implemented:**
  - Added composite indexes for `payments` collection in `firestore.indexes.json:69-86`:
    - `branchId ASC, division ASC, recordedAt DESC`
    - `branchId ASC, division ASC, recordedAt ASC`
  - Hardened `getPaymentsForRecordedDay` in `src/features/finance/paymentsRepository.js:157-184` with fallback attempting `orderBy("recordedAt", "desc")` before un-ordered limit fallback.
  - Added test coverage in `src/features/finance/paymentsRepository.test.js`.
- **Severity:** High.
- **Status:** **CLOSED (REMEDIATED)**.

### Finding 3: DOM04-COR-01 — CLOSED (REMEDIATED)
- **Section / Workflow:** Tuition Alerts / WhatsApp Messaging (`src/features/dashboard/frontoffice/TuitionDueWidget.jsx:33-50, 128`, `src/features/finance/receiptMessages.js:81-118`).
- **Trigger:** Front Office staff clicks the WhatsApp reminder button on `TuitionDueWidget` for an expired or due-soon student.
- **Root Cause:** `TuitionDueWidget` passed `student` as a single positional argument to `buildWhatsAppRenewalReminderMessage`, which expected an options object `{ student, paidUntil, ... }`. Destructuring extracted `student.student` (`undefined`), defaulting the student's name to literal `"Student"` and dropping `remainingDays`.
- **Remediation Implemented:**
  - Updated `src/features/finance/receiptMessages.js:81-118` to be backwards-compatible and dual-mode: accepts either an options object or a direct student entity (`displayName`, `paidUntil`, `paymentPlan`, `program`).
  - Updated `src/features/dashboard/frontoffice/TuitionDueWidget.jsx:33-50` to pass structured options `{ student, paidUntil: student.paidUntil, remainingDays: health?.remainingDays, planLabel: student.paymentPlan || student.program }`.
  - Added unit test in `src/features/finance/receiptMessages.test.js` validating direct student entity handling.
- **Severity:** Medium.
- **Status:** **CLOSED (REMEDIATED)**.

### Finding 4: DOM04-GOV-01 — CLOSED (REMEDIATED)
- **Section / Workflow:** Dual-Control Approvals / Payment Status (`src/features/finance/PaymentModal.jsx:260-272`, `src/features/shared/ApprovalInbox.jsx:209-224, 274-280`, `src/features/finance/paymentsRepository.js:295-308`).
- **Trigger:** Front Office records a payment with a multi-month plan discount (e.g. quarterly 5%, semester 10%, annual 15%), setting `payment.approvalStatus = "pending"` and submitting a `DISCOUNT_OR_REFUND` approval request. The Director or Vice Director subsequently approves (or rejects) the request in their approval inbox.
- **Root Cause:** `ApprovalInbox.jsx` only updated `/approvals/{approvalId}` upon decision and never updated the associated `/payments` document, leaving payments stuck permanently in `approvalStatus: "pending"`.
- **Remediation Implemented:**
  - In `src/features/finance/PaymentModal.jsx:263`, assigned `discountEnvelope.payload.paymentId = savedPayment.id` before dispatching `submitApprovalRequest`.
  - Exported `updatePaymentApprovalStatus(paymentId, approvalStatus)` in `src/features/finance/paymentsRepository.js:295-308`.
  - In `src/features/shared/ApprovalInbox.jsx:209-224`, handled `DISCOUNT_OR_REFUND` approval by calling `updatePaymentApprovalStatus(approval.payload.paymentId, "approved")` and `markApprovalApplied`.
  - In `src/features/shared/ApprovalInbox.jsx:274-280`, handled `DISCOUNT_OR_REFUND` rejection by calling `updatePaymentApprovalStatus(approval.payload.paymentId, "rejected")`.
  - Added unit test in `src/features/finance/paymentsRepository.test.js` and `src/features/shared/ApprovalInbox.test.js`.
- **Severity:** Medium.
- **Status:** **CLOSED (REMEDIATED)**.

---

## 4. Verification & Regression Results

Following implementation of all 4 remediations, Level 1 Light Regression verification was executed across the full test suite, linter, typechecker, and production build:

| Verification Suite | Target | Result | Output Evidence |
|---|---|---|---|
| **Vitest Finance Suite** | `src/features/finance` | **PASS (50 / 50)** | `financeUtils.test.js` (4), `receiptMessages.test.js` (26), `paymentsRepository.test.js` (20) |
| **Vitest Shared Suite** | `src/features/shared` | **PASS (304 / 304)** | `ApprovalInbox.test.js` (2), `approvalGates.test.js` (24), `approvals.test.js` (33) |
| **Vitest Full Suite** | All 104 test files | **PASS (1,316 / 1,316)** | 103 passed, 1 emulator-only file skipped (122 tests) |
| **ESLint** | `eslint .` | **PASS (0 errors, 0 warnings)** | Clean lint across the workspace |
| **TypeScript Typecheck** | `tsc --noEmit` | **PASS (0 errors)** | Zero typing errors |
| **Production Build** | `vite build` | **PASS** | 2,641 modules transformed, PWA precache generated |

