# Role & Business Logic Conformance Audit (BLRCA) — Consolidated Campaign Report

> **Campaign Reference:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md)  
> **Campaign Status:** ACTIVE  
> **Authoritative Governance Baseline:** Blueprint v3.4 (`2026-10-13`), Status: **RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER KIFRY**  
> **Target Repository:** `aymira-g/mylibertyportal-origin` (`main`)  
> **Audit Mode:** STRICTLY AUDIT-ONLY (No production code modified during this execution)  
> **Slice 1 Baseline Commit:** `99163ca` (Audited: 2026-10-15; Remediated in `220c10a` & `131f1b2`; Verified & Closed: 2026-10-16 at `3cf8e59`)  
> **Slice 2 Baseline Commit:** `3cf8e59d526bc157642c72f69cd92676cbb019ac` (Audited: 2026-10-16)  

---

## 1. Executive Summary & Campaign Architecture

The **Role & Business Logic Conformance Audit (BLRCA)** is the Level 2 campaign framework of MYLIBERTY designed to systematically verify that actual system behavior (UI routing, presentational gating, repository queries, Cloudflare Worker endpoints, and Cloud Firestore security rules) strictly matches the organizational authority, separation of duties, and data scoping established in the **Authoritative Blueprint v3.4** and accepted **Owner Decisions (OD-1 through OD-4, G-001 through G-012)**.

BLRCA operates slice-by-slice across five modular phases per slice:
1. **Phase 0 & 1:** Target Checkout Baseline & Approved Role Contracts.
2. **Phase 2:** Feature Surface Discovery & Inventory.
3. **Phase 3:** Deep End-to-End Conformance Tracing (5 checkpoints × 6 dimensions).
4. **Phase 4:** Campaign Ledger & Consolidated Defect Indexing.
5. **Phase 5 & 6:** Remediation Execution & Post-Fix Verification.

This document serves as the master, cumulative report for all evaluated slices.

---

## 2. Slice 1: System Admin Boundary (Summary & Verified Closure)

### 2.1 Scope & Objective
Verified the strict technical-only boundary of the System Admin (`role: "admin"`) across all business, financial, student, and approval surfaces, enforcing **Blueprint Principle 4** (§7, §8) and **OD-2** (§OD-2: System Admin is prohibited from business operational actions and financial data access).

### 2.2 Findings Remediated & Closed (2026-10-15 / 2026-10-16)
- **`DOM11-GOV-02` (High, CLOSED):** UI Financial Reports exposure (`AdminDashboard.jsx:274` mounting `ReportsDashboard` with `isAdminView={true}`) and province-wide scope access removed. `FinancialReportsTab.jsx` refactored so `financialCache` is keyed by `currentUserUid` (preventing shared workstation cache leakage), and `catch` blocks set fail-closed error UI with retry banners. Remediated in commit `220c10a`.
- **`DOM01-GOV-03` (High, CLOSED):** Rules helper `isOrgExecutive()` decoupled from `admin` across business collections (`/payments`, `/applications`, `/approvals`, `/progressReports`, `/deskInquiries`); remaining 16 `isExecutive()` occurrences verified strictly technical IT, user management, and read-only calendar contexts. Remediated in commits `220c10a` and `131f1b2`.
- **`DOM01-REP-01` (High, CLOSED):** Frontend helper `isOrgExecutiveRole()` introduced in `src/features/shared/roles.js`; `paymentsRepository.js:41` and `approvalsRepository.js:41` bound to organizational executive scope, blocking Admin from inheriting executive bypasses. Remediated in commit `220c10a`.
- **`DOM01-PERF-01` (Low, CLOSED):** Unscoped real-time `/applications` snapshot listener eliminated for Admin in `useDashboardData.js`, preserving free-tier Spark read quotas. Remediated in commit `220c10a`.
- **Post-Fix Verification:** Completed on 2026-10-16 (194/194 vitest pass, 128/128 emulator suite pass, clean TypeScript checking and ESLint).

---

## 3. Slice 2: Financial Surfaces Across Roles (Audit Report)

### 3.1 Governing Authorities & Ratified References
This audit evaluated the live implementation against the fresh text of:
1. **Authoritative Blueprint v3.4 (`2026-10-13`):**
   - §7 (Separation of Duties & System Admin Non-Business Principle).
   - §18 (Financial Operations, Tuition, Cash Desk & Dual-Control Approvals).
   - §26 (Resolved Governance Questions: G-006 Dual-Control Scope, G-009 Cash Discrepancies, G-012 Branch Typology & Lean Satellites).
2. **Owner Decision OD-1 (`2026-10-05`):** Delegation of Discounts and Refunds to Executives.
3. **Owner Decision OD-2, OD-3, OD-4 (`2026-10-13`):**
   - **OD-2:** Payment Corrections, Void Reversals & Payment Data Access.
   - **OD-3:** Two-Step Dual-Control Payment Correction Workflow & Installment Schedules.
   - **OD-4:** Tiered Shift Cash Discrepancy Routing & Branch Typology Fallback.
4. **Owner Decision G-009 (`2026-10-07`):** Cash Discrepancy Escalation Thresholds.
5. **Owner Decision G-012 (`2026-10-13`):** Branch Typology & Lean Satellite Operating Model.

---

### 3.2 Canonical Role-to-Function Financial Contracts

Every statement below is labeled per BLRCA standards:
- `[Established]`: Grounded in ratified Blueprint text or signed Owner Decisions.
- `[Inferred]`: Necessary logical implementation deduction not explicitly codified.
- `[Owner Decision Required]`: Governance policy gap requiring explicit owner resolution.

| Canonical Role | Payment Desk Creation | Payment Mutation / Direct Edit | Discount & Refund Authority | Shift Cash Reconciliation & Discrepancies | Financial Visibility & Reports |
|---|---|---|---|---|---|
| **`director`** | ❌ **FORBIDDEN** `[Established]` (OD-2 §OD-2: Director must never act as cashier; prevents maker-checker collapse) | ❌ **FORBIDDEN** `[Established]` (OD-2 §OD-2: Direct edit strictly blocked; corrections via OD-1/OD-3 only) | ✅ **FINAL APPROVER** `[Established]` (OD-1: Discounts > 20% or > Rp 500k; Refunds > Rp 1.000.000) | ✅ **FINAL APPROVER** `[Established]` (OD-4, G-009: Discrepancies ≥ Rp 50.000) | ✅ **FULL PROVINCE-WIDE** `[Established]` (OD-2: Read / list all payments, revenue KPIs, analytics) |
| **`vice_director`** | ❌ **FORBIDDEN** `[Established]` (OD-2 §OD-2: Vice Director must never act as cashier) | ❌ **FORBIDDEN** `[Established]` (OD-2 §OD-2: Direct edit strictly blocked) | ✅ **CHECKER / APPROVER** `[Established]` (OD-1: Discounts ≤ 20% & ≤ Rp 500k; Refunds ≤ Rp 1.000.000; Acting Director for higher only when Director on leave) | ✅ **CHECKER / APPROVER** `[Established]` (OD-4, G-009: Rp 20.000–49.999; < Rp 20k fallback when Ops Lead/Manager handled drawer; Acting Director for ≥ 50k when Director on leave) | ✅ **FULL PROVINCE-WIDE** `[Established]` (OD-2: Read / list all payments, revenue KPIs, analytics) |
| **`admin`** (System Admin) | ❌ **FORBIDDEN** `[Established]` (Blueprint §7, OD-2: Technical role only; no cashier authority) | ❌ **FORBIDDEN** `[Established]` (Blueprint §7, OD-2: Zero payment write authority) | ❌ **FORBIDDEN** `[Established]` (Blueprint §7: Cannot request or approve financial tickets) | ❌ **FORBIDDEN** `[Established]` (Blueprint §7, OD-4: Never an approver or drawer handler) | ❌ **FORBIDDEN** `[Established]` (OD-2: Read / list / export `/payments` strictly blocked at rules & repo) |
| **`manager`** (`division="courses"`, Main Campus) | ❌ **FORBIDDEN** `[Established]` (Blueprint §18: Front Office operates desk; Manager does not handle cash at Main Campus) | ❌ **FORBIDDEN** `[Established]` (OD-2: Direct edit blocked) | ❌ **FORBIDDEN** `[Established]` (OD-1: Discounts delegated exclusively to Executives) | ❌ **FORBIDDEN** `[Established]` (OD-4 §3: Main Campus shift oversight remains with Ops Lead) | ✅ **BRANCH & DIVISION SCOPED** `[Established]` (Can view Course payments for `kota_gorontalo` in reports) |
| **`manager`** (`division="courses"`, Lean Satellite) | ⚠️ **DESK FALLBACK ONLY** `[Established]` (OD-2, G-012: On-site supervision; acts as cashier only if FO absent) | ❌ **FORBIDDEN** `[Established]` (OD-2: Direct edit blocked) | ❌ **FORBIDDEN** `[Established]` (OD-1: Discounts delegated exclusively to Executives) | ✅ **LOCAL APPROVER (< Rp 20k)** `[Established]` (OD-4, G-012: Approves < Rp 20.000 at satellite; escalates if handled drawer) | ✅ **BRANCH & DIVISION SCOPED** `[Established]` (Can view Course payments for satellite branch) |
| **`manager`** (`division="kindergarten"`, Main Campus) | ❌ **FORBIDDEN** `[Established]` (Blueprint §18: Handled by Front Office / Kindergarten desk) | ❌ **FORBIDDEN** `[Established]` (OD-2: Direct edit blocked) | ❌ **FORBIDDEN** `[Established]` (OD-1: Discounts delegated exclusively to Executives) | ❌ **FORBIDDEN** `[Established]` (OD-4 §3: Main Campus shift oversight remains with Ops Lead) | ✅ **BRANCH & DIVISION SCOPED** `[Established]` (Can view Kindergarten payments for `kota_gorontalo`) |
| **`opslead`** (Operational Leader) | ⚠️ **DESK FALLBACK ONLY** `[Established]` (OD-2: Main campus supervisor; records only if FO absent) | ❌ **FORBIDDEN** `[Established]` (OD-2: Direct edit blocked) | ❌ **FORBIDDEN** `[Established]` (OD-1: Cannot approve discounts/refunds) | ✅ **LOCAL APPROVER (< Rp 20k)** `[Established]` (OD-4: Approves < Rp 20.000 at Main Campus; escalates if handled drawer) | ⚠️ **BRANCH FINANCIAL READ ONLY** `[Inferred]` (Can view branch cash totals & daily reconciliation; no province-wide finance tab) |
| **`frontoffice`** (Front Desk) | ✅ **PRIMARY MAKER** `[Established]` (Blueprint §18, OD-2: Primary cashier recording payments at desk) | ❌ **FORBIDDEN DIRECTLY** `[Established]` (OD-2, OD-3: Direct edits blocked; must submit correction ticket) | 📝 **MAKER ONLY** `[Established]` (OD-1: Submits discount/refund request via envelope) | 📝 **MAKER ONLY** `[Established]` (OD-4: Performs physical cash drawer count and submits reconciliation) | ✅ **BRANCH & DIVISION OPERATIONAL READ** `[Established]` (Recent payments, desk inquiry, digital receipts) |
| **`instructorleader`** | ❌ **FORBIDDEN** `[Established]` (Academic leadership role only) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` (OD-4: Academic lead has no cash discrepancy authority) | ❌ **FORBIDDEN** `[Established]` (Shift records & payments blocked per `01-phase1-completion-report.md`) |
| **`instructor`** | ❌ **FORBIDDEN** `[Established]` (Pedagogical teaching role only) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` (Cannot view payments, tuition revenue, or receipts) |
| **`marketing`** | ❌ **FORBIDDEN** `[Established]` (Lead generation only) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` (No financial data access) |
| **`officeboy`** | ❌ **FORBIDDEN** `[Established]` (Facilities & cleanliness only) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` (No financial data access) |
| **`parent`** | ❌ **FORBIDDEN** `[Established]` (External consumer) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ✅ **OWN CHILDREN ONLY** `[Established]` (Can read payments & tuition receipts for linked children only) |
| **`student`** | ❌ **FORBIDDEN** `[Established]` (External consumer) | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ❌ **FORBIDDEN** `[Established]` | ✅ **OWN RECORD ONLY** `[Established]` (Can read own payment history & receipts only) |

---

### 3.3 Feature Surface Inventory & End-to-End Tracing

| Financial Surface | Checkpoint 1: UI Route / Dashboard | Checkpoint 2: Component Props & State | Checkpoint 3: Repository / Data Access | Checkpoint 4: Rules / Worker Security | Checkpoint 5: Fail-Closed State & Alerting | Conformance Status |
|---|---|---|---|---|---|---|
| **1. Payment Recording & Desk Intake** | `FrontOfficeDashboard.jsx` (Cashier tab), `KidsFrontOfficeDashboard.jsx`, `StudentRoster.jsx` | `PaymentModal.jsx` (rendered when `paymentModalStudent` active; `readOnly={false}`) | `paymentsRepository.js:recordPayment()` (atomic batch write to `/payments` and `/users/{studentId}`) | `firestore.rules:1010` (`allow create: if ((isDirector() || isViceDirector()) \|\| (isFrontOffice() && ...))`) | Modal rejects negative amount, missing student, unselected plan; returns toast error | 🔴 **FAIL** (`DOM04-GOV-03`: Maker-checker collapse in rules; rules allow Director & Vice Director create) |
| **2. Payment Direct Mutation & Updates** | No direct edit UI exposed in `PaymentHistoryTab` or `PaymentModal` | N/A (UI does not expose field editing) | `paymentsRepository.js:updatePaymentApprovalStatus()` | `firestore.rules:1017, 1025` (`allow update: if (...) && affectedKeys().hasOnly(['notes', 'approvalStatus', 'referenceNumber', 'updatedAt'])`) | Direct client update allowed for unverified `approvalStatus` | 🔴 **FAIL** (`DOM04-SEC-02`: Direct unverified write to `approvalStatus: "approved"` bypasses dual control) |
| **3. Payment Correction & Void Reversals (OD-3)** | Absent from UI; no void or correction button in `PaymentHistoryTab.jsx` or `ApprovalInbox.jsx` | N/A | Missing repository methods for payment void / correction request | Missing `PAYMENT_CORRECTION_OR_VOID` gated action in rules and constants | No fail-closed or pending indicator for voided transactions | 🔴 **FAIL** (`DOM04-GOV-05`: Ratified OD-3 two-step void/correction workflow completely unimplemented) |
| **4. Discounts & Fee Reductions (OD-1)** | `PaymentModal.jsx` (effective discount triggers dual-control envelope) | `createApprovalEnvelope("DISCOUNT_OR_REFUND")` passed to `submitApprovalRequest()` | `paymentsRepository.js:markPaymentPending()` exists but NOT called on desk entry; batch marks `paymentStatus: "paid"` | `firestore.rules:925` (Approvals create/update rules enforce executive eligibility) | **REJECTION LEAK**: When executive rejects ticket in `ApprovalInbox.jsx:387`, student retains `paid` status & extended `paidUntil`! | 🔴 **FAIL** (`DOM04-GOV-04`: Coverage granted before approval; rejection leaves student coverage extended) |
| **5. Installments & Partial Payments (OD-3)** | `PaymentModal.jsx` (any under-payment automatically treated as discount) | N/A (no installment schedule props or fields) | Missing installment tracking (`totalAgreedAmount`, `outstandingBalance`, `nextDueDate`) | No schema or rule validation for installment contracts | Under-payment generates unnecessary discount ticket or blocks cashier | 🟠 **FAIL / GAP** (`DOM04-GOV-06`: OD-3 installment schedule architecture unimplemented) |
| **6. Shift Cash Balancing & Reconciliation (OD-4)** | `FrontOfficeDashboard.jsx` (Clock Out button opens `ShiftReconciliationModal.jsx`) | `countedCash`, `countedQris`, `expectedCash`, `expectedQris`, `discrepancy` | `shiftsRepository.js:clockOutShiftWithCashReconciliation()` | `firestore.rules:925` (`CASH_DISCREPANCY` envelope submission required if discrepancy exceeds threshold) | Shift cannot close if envelope submission fails; fail-closed reachability check enforced | 🟠 **FAIL / INCONSISTENCY** (`DOM04-GOV-07`: Static 25k threshold allows 20k–25k discrepancies to bypass Vice Director review) |
| **7. Financial Reports & Analytics Visibility** | `ReportsDashboard.jsx` (`subTab === "finance"`, rendered via `FinancialReportsTab.jsx`) | `isExecutiveView={true}` or `isManager={true}`; `isAdminView` stripped of finance tab | `paymentsRepository.js:fetchPaymentsForWindow()` (bounds horizon, fails closed on Admin) | `firestore.rules:997` (`allow list: if (isDirector() \|\| isViceDirector()) \|\| (isFrontOffice() && ...) \|\| (isBranchDivisionManager() && ...))`) | Admin returns empty `{ payments: [], isCapped: false }`; UI displays clean error state | 🟢 **PASS** (Strictly conforms to OD-2; Admin blocked; Executive province-wide; Managers scoped) |
| **8. Digital Receipt Issuance & Sharing** | `PaymentModal.jsx` (`activeTab === "receipt"`), `DigitalReceiptTab.jsx` | `activeReceipt` object with `studentName`, `amount`, `method`, `receiptNumber`, `approvalStatus` | Rendered from memory or fetched payment doc; WhatsApp receipt message builder | `firestore.rules:991` (`canGetPayment()` restricts get to student, parent, cashier, manager, exec) | Printable receipt card; WhatsApp URL generated; pending badge displayed | 🟢 **PASS** (Receipt view fail-closes when no receipt; pending discount warning banner displayed) |

---

### 3.4 Detailed Findings & Non-Conformance Records

#### Finding 1: `DOM04-GOV-03` — Maker-Checker Collapse on `/payments` Create and Update in Security Rules
- **Severity:** High (Governance Conflict / Maker-Checker Invariant Violation)
- **Status:** OPEN (Discovered in Baseline Inspection; Traced in Slice 2)
- **Files Affected:** `firestore.rules:1010, 1017`
- **Root Cause & Evidence:**
  In `firestore.rules` under `match /payments/{paymentId}`:
  ```javascript
  // Line 1010:
  allow create: if ((isDirector() || isViceDirector()) || (isFrontOffice() && isSameBranch(request.resource.data) && ...));
  // Line 1017:
  allow update: if ((isDirector() || isViceDirector()) || (isFrontOffice() && isSameBranch(resource.data) && ...));
  ```
  This rule explicitly authorizes `director` and `vice_director` to create new payment records and execute updates on existing payments directly.
- **Why It Matters:**
  This directly violates **OD-2** (§OD-2: Director / Vice Director: Create ❌ Forbidden, Update ❌ Forbidden; reversals via OD-1/OD-3 only). Granting executives cashier write authority collapses maker-checker separation: an executive who approves discounts, refunds, and void reversals could create fictitious payments or alter records without cashier involvement.
- **Required Remediation:**
  Remove `(isDirector() || isViceDirector())` from `allow create` and `allow update` on `/payments`. Restrict create exclusively to `isFrontOffice()` (and verified lean satellite Course Division Manager desk fallback per OD-2/G-012).

---

#### Finding 2: `DOM04-SEC-02` — Direct Unverified Payment `approvalStatus` Write in Rules
- **Severity:** High (Security Vulnerability / Dual-Control Envelope Bypass)
- **Status:** OPEN (Discovered in Slice 2 Deep Trace)
- **Files Affected:** `firestore.rules:1025-1026`
- **Root Cause & Evidence:**
  In `firestore.rules` line 1025:
  ```javascript
  allow update: if (...) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['notes', 'approvalStatus', 'referenceNumber', 'updatedAt']);
  ```
  The rule checks that only these four fields are modified, but **does NOT verify what value `approvalStatus` is changing to, nor does it verify that an approved, sealed approval ticket exists**.
- **Why It Matters:**
  Any authenticated Front Office cashier (or Executive) can invoke Firestore `updateDoc` directly from the browser console to flip `approvalStatus` from `"pending"` to `"approved"`, completely bypassing the dual-control `DISCOUNT_OR_REFUND` approval envelope.
- **Required Remediation:**
  In `firestore.rules`, enforce that transitions to `approvalStatus == 'approved'` can only occur via an approved, unsealed approval ticket seal or Cloudflare Worker execution, or restrict client updates of `approvalStatus` to verified workflows.

---

#### Finding 3: `DOM04-GOV-04` — Unchecked Student Coverage Extension on Rejected Discount
- **Severity:** High (Business Logic Flaw / Revenue Leakage)
- **Status:** OPEN (Discovered in Slice 2 Deep Trace)
- **Files Affected:** `src/features/finance/PaymentModal.jsx:275-283`, `src/features/finance/paymentsRepository.js:267-283`, `src/features/shared/ApprovalInbox.jsx:387`, `src/features/finance/paymentsRepository.js:321-327`
- **Root Cause & Evidence:**
  When a cashier enters a discounted payment at the desk in `PaymentModal.jsx`, `recordPayment` is called immediately in a batch write that sets `users/{studentId}.paymentStatus = "paid"` and extends `users/{studentId}.paidUntil` to the end of the term.
  When the executive rejects the discount in `ApprovalInbox.jsx:387`, the handler calls `updatePaymentApprovalStatus(paymentId, "rejected")`.
  In `paymentsRepository.js:321-327`, `updatePaymentApprovalStatus` updates ONLY the payment document's `approvalStatus: "rejected"`. It **never calls `markPaymentPending`, does not revert `users/{studentId}.paidUntil`, does not reset `users/{studentId}.paymentStatus` to `"pending"`, and generates no invoice for the unapproved discount balance**.
- **Why It Matters:**
  The student permanently receives full course attendance and valid enrollment status at the discounted price, even though executive leadership explicitly rejected the discount.
- **Required Remediation:**
  On discount rejection in `ApprovalInbox.jsx`, trigger a downstream reconciliation transaction that:
  1. Reverts `users/{studentId}.paymentStatus` to `"pending"` (or creates an outstanding balance invoice).
  2. Reverts `users/{studentId}.paidUntil` to its pre-payment expiration date (or prorates coverage to the actual amount paid).
  3. Alerts the Front Office desk that the discount was rejected and the remaining tuition balance must be collected.

---

#### Finding 4: `DOM04-GOV-05` — Ratified `PAYMENT_CORRECTION_OR_VOID` Dual-Control Workflow Unimplemented
- **Severity:** High (Governance Gap / Missing Regulatory Workflow)
- **Status:** OPEN (Discovered in Slice 2 Inventory)
- **Files Affected:** `src/features/shared/approvalGates.constants.js`, `src/features/shared/ApprovalInbox.jsx`, `src/features/finance/paymentsRepository.js`, `src/schemas/paymentSchema.js`
- **Root Cause & Evidence:**
  Owner Decisions **OD-1** and **OD-3** ratified `PAYMENT_CORRECTION_OR_VOID` as the 14th gated action in Blueprint §26 G-006 (Maker: Front Office; Checker: Vice Director for ≤ Rp 500.000 / Director for > Rp 500.000; two-step envelope execution creating linked reversal records).
  In the current codebase:
  1. `PAYMENT_CORRECTION_OR_VOID` is completely absent from `GATED_ACTIONS` in `approvalGates.constants.js`.
  2. `ApprovalInbox.jsx` contains no downstream execution logic for payment reversals.
  3. `paymentSchema.js` lacks `originalPaymentId`, `reversalOfPaymentId`, and `voidReason` fields.
  4. The UI exposes no button or modal for cashiers to request a payment void or correction.
- **Why It Matters:**
  Front Office staff cannot correct mistaken cash entries or void erroneous payments through the approved governance process. If a mistake occurs, there is no governed mechanism to adjust financial records.
- **Required Remediation:**
  Implement the full OD-3 two-step workflow:
  1. Register `PAYMENT_CORRECTION_OR_VOID` in `approvalGates.constants.js` with OD-1/OD-3 thresholds.
  2. Add `originalPaymentId`, `voidReason`, and status fields to `paymentSchema.js`.
  3. Add a "Request Correction / Void" button in `PaymentHistoryTab.jsx` that submits a dual-control envelope.
  4. Implement downstream execution in `ApprovalInbox.jsx` that atomically writes a linked negative reversal payment document and updates student tuition status.

---

#### Finding 5: `DOM04-GOV-06` — Missing OD-3 Partial Payments / Installments Architecture
- **Severity:** Medium (Functional Gap / Contract Drift)
- **Status:** OPEN (Discovered in Slice 2 Feature Inventory)
- **Files Affected:** `src/features/finance/PaymentModal.jsx:236-242`, `src/schemas/paymentSchema.js`
- **Root Cause & Evidence:**
  Per **OD-3**, Front Office cashiers are authorized to record standard agreed installment schedules at the desk without executive pre-approval, provided cumulative payments sum to full tuition.
  In `PaymentModal.jsx:236-242`, any payment amount entered below the standard plan price is automatically treated as an unauthorized **fee discount** (`effectiveDiscount = expectedPlanPrice - enteredAmountNum`), triggering a `DISCOUNT_OR_REFUND` approval request.
  Fields mandated by OD-3 (`totalAgreedAmount`, `outstandingBalance`, `nextDueDate`, and status `partially_paid`) do not exist in schemas or data models.
- **Why It Matters:**
  Legitimate installment payments cannot be recorded without erroneously generating executive discount approval tickets, cluttering the executive inbox and creating false discount records in reports.
- **Required Remediation:**
  Update `PaymentModal.jsx` and `paymentSchema.js` with an explicit "Installment / Partial Payment" toggle per OD-3, tracking `outstandingBalance` and `nextDueDate` without triggering `DISCOUNT_OR_REFUND` tickets when the agreed total equals standard pricing.

---

#### Finding 6: `DOM04-GOV-07` — Shift Cash Discrepancy Static Threshold Inconsistency
- **Severity:** Medium (Governance Threshold Divergence)
- **Status:** OPEN (Discovered in Slice 2 Trace)
- **Files Affected:** `src/features/attendance/shiftsRepository.js:24-35, 454-478`
- **Root Cause & Evidence:**
  In `shiftsRepository.js` lines 24-25:
  ```javascript
  export const DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR = 25000;
  export const DEFAULT_CASH_DISCREPANCY_PERCENT = 0.01;
  ```
  `calculateCashDiscrepancyThreshold()` calculates tolerance up to Rp 25.000. Under line 459, if `Math.abs(discrepancy) <= threshold`, **no approval envelope is created**, and the shift is allowed to close silently.
  However, **OD-4** and **G-009** strictly divide discrepancy approval tiers at **Rp 20.000**:
  - `< Rp 20.000`: Ops Lead (Main Campus) / Course Division Manager (Satellites).
  - `Rp 20.000 – Rp 49.999`: Vice Director.
  - `≥ Rp 50.000`: Director.
  When expected cash is large (e.g. Rp 3.000.000), `threshold` evaluates to Rp 25.000. A discrepancy of Rp 22.000 is treated as "within tolerance" and closed at the desk without creating an envelope, bypassing the Vice Director's mandatory review under OD-4!
- **Why It Matters:**
  Cash discrepancies between Rp 20.000 and Rp 25.000 evade executive oversight depending on total shift volume.
- **Required Remediation:**
  Align `DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR` to never exceed Rp 20.000 (or clarify desk tolerance vs. escalation tiers with Owner Kifry).

---

### 3.5 Open Governance Questions & Owner Decisions Required

| ID | Topic | Established Rule vs. Open Gap | Impact & Options | Recommended Action |
|---|---|---|---|---|
| **OGQ-FIN-01** | Shift Drawer Desk Tolerance vs. Discrepancy Escalation Tier | OD-4 establishes approvers for discrepancies `< Rp 20.000`, `20.000–49.999`, and `≥ 50.000`. It did not define whether an unescalated "desk tolerance" (e.g. Rp 5.000 or 10.000) is permitted without creating any approval ticket. | If tolerance is Rp 0, every Rp 500 coin difference creates an approval ticket for Ops Lead/Manager. If tolerance is Rp 25.000, it encroaches on the Vice Director tier. | `[Owner Decision Required]`: Ratify whether desk tolerance is e.g. Rp 10.000 (below which no ticket is required, only logged in shift notes), and cap tolerance strictly below Rp 20.000. |
| **OGQ-FIN-02** | Handling Student Coverage on Discount Rejection | Blueprint §18 and OD-1 require dual control for discounts but did not specify whether desk cashiers should collect full tuition up front, or whether student coverage should be prorated when a discount is rejected. | Current code leaves student coverage fully active on rejection. Prorating days vs. resetting status to `pending` needs business policy alignment. | `[Owner Decision Required]`: Ratify policy: on discount rejection, student status reverts to `pending` with a 7-day grace period to pay the difference before class lockout. |
| **OGQ-FIN-03** | Lean Satellite Course Manager Cash Desk Operation | G-012 establishes Course Division Manager as satellite supervisor. OD-2 permits them to act as cashier only when Front Office is absent or vacant. | Does the system need a formal "Acting Cashier" shift mode for satellite managers to avoid ambiguity in audit attribution? | `[Inferred / Recommended]`: Satellite manager records payment with `recordedByRole: "manager"` and `actingCashier: true`, preserving clear audit attribution without creating a Branch Manager role. |

---

### 3.6 Clean Conformance & Positive Findings

During the Slice 2 inspection, several critical controls were verified to be functioning cleanly in strict accordance with governance:
1. **System Admin Exclusion (`INV-02`):** `admin` is completely blocked from reading `/payments` at the database layer (`firestore.rules:canGetPayment()`), blocked in repository queries (`paymentsRepository.js:42`), and stripped of the Financial & Tuition tab in `ReportsDashboard.jsx`.
2. **Executive Strategic & Operational Visibility (`OD-2`, `Blueprint §5.4`):** Both `director` and `vice_director` have full province-wide visibility into revenue analytics, payment history, and financial reports without arbitrary branch locks.
3. **Branch & Division Isolation (`INV-04`):** Front Office cashiers and Division Managers are strictly scoped to their assigned `branchId` and `division` in `firestore.rules` (`isSameBranchStrict`, `isSameBranchDivision`) and repository queries.
4. **Parent & Student Data Privacy (`INV-08`):** Students can only read their own payments; parents can only read payments belonging to their verified linked children via `childStudentIds`. Peer and cross-family financial data is completely unreachable.
5. **WITA Timezone Integrity:** Payment date stamping and shift reconciliation time horizons consistently use `Asia/Makassar` (WITA) conventions via `dateWita.js`.

---

## 4. Master Action Plan & Next Steps

1. **Remediation Plan for Slice 2:** Prepare a dedicated implementation proposal (`docs/plans/active/2026-10-16-blrca-slice2-financial-surfaces-remediation.md`) addressing `DOM04-GOV-03` through `DOM04-GOV-07` for Owner Kifry's authorization.
2. **Ledger Synchronization:** Maintain `docs/audits/current/role-function-conformance-ledger.md` with granular testable rows for all Slice 1 and Slice 2 checks.
3. **Campaign Progression:** Upon resolution of Slice 2 remediation, proceed to **Slice 3 — Student, Child & Parent Personal Data Across Roles**.
