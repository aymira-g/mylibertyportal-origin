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

## 4. Slice 2 Remediation & Auditor Review Post-Fix Verification

### 4.1 Remediations Executed (Commit `a13806f` & Post-Fix Refinement)
1. **`DOM04-GOV-03` & `DOM04-SEC-02` (CLOSED):**
   - In `firestore.rules`, cashier desk payment creation strictly restricted to `isFrontOffice()`. `isOrgExecutive()` restricted to reversal payment records (`isReversal == true` and `appliedFromApproval` ticket verified).
   - `/payments` update rule hardened: Front Office restricted to desk metadata; `isOrgExecutive()` permitted for audit fields with strict enum guards (`approvalStatus in ['approved', 'rejected']`, `status in ['voided', 'active', 'reversal']`).
   - Reversal creation and void updates bound to `isValidPaymentVoidApproval(appliedFromApproval)` ticket verification; discount review enforces `requestedByUid != request.auth.uid` to prevent self-approval.
2. **`DOM04-GOV-04` (CLOSED):**
   - Rejection of unapproved discount in `ApprovalInbox.jsx` calls `markPaymentPending(studentId)`, resetting `paymentStatus` to `"pending"` and clearing unearned `paidUntil` coverage to eliminate revenue leakage.
3. **`DOM04-GOV-05` (CLOSED):**
   - Ratified `PAYMENT_CORRECTION_OR_VOID` (Action #14) dual-control workflow fully implemented across `approvalGates.constants.js`, `approvalGates.js`, `paymentsRepository.js` (`requestPaymentVoid` and atomic `executePaymentVoid`), `ApprovalInbox.jsx`, and UI tabs (`PaymentHistoryTab.jsx`, `PaymentModal.jsx`).
   - Aligned routing strictly with **OD-1 §3**: routes to `vice_director` queue with `director` co-approver without artificial monetary threshold splits.
4. **`DOM04-GOV-06` (CLOSED):**
   - Implemented OD-3 installment & partial payment scheduling in `paymentSchema.js`, `RecordPaymentTab.jsx`, `PaymentModal.jsx`, and `paymentsRepository.js`.
   - Enforces `enteredAmountNum < effectiveTotalAgreed`, non-empty `nextDueDate <= coverageEnd`, max 2 installments for monthly plans, and max 3 installments for multi-month plans.
   - Enforces OD-3 discount check: if `effectiveTotalAgreed < expectedPlanPrice`, fee discount approval ticket is required.
5. **`DOM04-GOV-07` (CLOSED):**
   - Adjusted `DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR = 10000` in `shiftsRepository.js`. Discrepancies $\ge \text{Rp } 20.000$ strictly escalate to Vice Director per OD-4.
   - Added self-approval escalation in `getCashDiscrepancyApprover`: Ops Lead at Main Campus and Course Division Manager at Lean Satellites who handle drawer escalate to `vice_director`.
6. **Revenue Netting & Drawer Integrity (Auditor Item 1):**
   - Refactored `summarizePaymentsByMethod` in `financeUtils.js` to exclude voided payments and same-window reversals (netting to strictly Rp 0), while subtracting cross-window reversals from drawer and revenue totals.
   - Rendered distinct visual badges (`VOIDED` / `REVERSAL`) in `FinancialReportsTab.jsx` table and CSV exports, and in `PaymentHistoryTab.jsx`.

### 4.2 Quality Gate Verification
- **Automated Unit Tests:** 106 test files passed, **1,449 tests passed** (139 skipped, 0 failed).
- **TypeScript Typecheck (`tsc --noEmit`):** Clean pass (0 errors).
- **ESLint (`eslint .`):** Clean pass (0 errors).
- **Production Build (`vite build`):** Built cleanly in 670ms with PWA service worker generated.

### 4.3 Campaign Status & Next Steps
- **Slice 1 (System Admin Boundary):** CLOSED & VERIFIED.
- **Slice 2 (Financial Surfaces Across Roles):** CLOSED & VERIFIED.
- **Slice 3 (Student, Child & Parent Personal Data Across Roles):** PHASES 0–4 AUDIT COMPLETE (Awaiting Owner Review & Remediation).

---

## 5. Slice 3: Student, Child & Parent Personal Data Across Roles (Phases 0–4 Audit-Only)

**Date of Execution:** 2026-10-16  
**Auditor / Agent:** Independent Auditor & Primary Coding Agent (Audit-Only Mode)  
**Governing Authorities:**
- [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (§6, §7, §11, §12, §19, §20, §26 G-003, G-012)
- [`docs/decisions/2026-10-13-branch-typology-and-lean-branch-governance-amendment.md`](../../decisions/2026-10-13-branch-typology-and-lean-branch-governance-amendment.md) (G-012, ADR 2026-10-13)
- [`docs/audits/blueprint-conformance-matrix.md`](../blueprint-conformance-matrix.md) (`INV-02`, `INV-04`, `INV-08`, `INV-09`, `INV-12`)
- Subsystem Specifications: [`docs/specs/authorization-contract.md`](../../specs/authorization-contract.md)

---

### 5.1 Phase 0: Pre-Flight Baseline & Environment Check

- **Git HEAD SHA:** `a13806f` (plus verified Slice 2 post-fix ledger closures).
- **Git Branch:** `main`.
- **Working Tree State:** Clean, verified with zero test failures across 1,449 tests, 0 lint errors, 0 typecheck errors.
- **Authoritative Blueprint Verification:**
  - **Version:** v3.4 [Established]
  - **Status:** RATIFIED AUTHORITATIVE BASELINE — APPROVED BY OWNER (KIFRY) [Established]
  - **Date:** 2026-10-13 [Established]
- **Operational Mode:** STRICTLY AUDIT-ONLY (Phases 0 through 4). No production code in `src/`, `firestore.rules`, or `cloudflare-worker/` is modified during this pass.

---

### 5.2 Phase 1: Ratified Role-to-Function Personal Data Contracts

Under Blueprint §19 (*Parent and Child Data Privacy Principle*), personal information must be accessible only to people whose responsibilities genuinely require it. Information concerning children requires additional care and must be restricted to legitimate business or participant need. Unnecessary exposure of child personal data, parent contact details, academic progress, and home address must be minimized.

| Canonical Role ID | Organizational Role Under Blueprint | Authorized Personal Data Scope | Prohibited Personal Data Scope | Governing Citation |
|---|---|---|---|---|
| `director` | Director (Strategic Control) | Province-wide macro enrollment statistics, retention figures, escalated student exceptions, and high-level academic progress. | Operational cashier desk intake; direct record deletion without audit trail. | Blueprint §5.4, §6.1, §19 |
| `vice_director` | Vice Director (Operational Control) | Multi-branch operational enrollment tracking, escalated attendance follow-ups, province-wide student roster oversight, and approved deactivations/exceptions. | Unrestricted arbitrary CRUD over student records outside defined workflows. | Blueprint §5.4, §6.2, §19, Principle 16 |
| `admin` | System Admin (Technical Infrastructure Only) | Technical user account provisioning, staff email/UID lookup, invite tokens, terminal/kiosk device linking. | **Zero business access:** Prohibited from listing, browsing, exporting, or editing student profiles, child dossiers, parent WhatsApp numbers, home addresses, or applicant leads. | Blueprint §7, §19, INV-02, INV-08 |
| `manager` | Division Manager | Student dossiers, academic progress, enrollment status, parent contacts, and attendance for their assigned `branchId` and `division` (`courses` or `kindergarten`). | Cross-branch student data; opposite division student data (e.g. Course Mgr browsing Kindergarten toddlers). | Blueprint §6.4, §6.5, §11, §19, INV-04 |
| `opslead` | Operational Leader (Main Campus) | Main Campus cohort class lists, room allocation logistics, student attendance check-in monitoring, and front office coordination. | Academic placement overrides; cross-branch student PII (lean satellites). | Blueprint §6.8, G-012 |
| `instructorleader` | Central Academic Lead | Province-wide curriculum standardization, placement test scores, level assessments, and progress reports across all physical branches. | Unrestricted bulk download of parent WhatsApp contacts or child financial ledgers. | Blueprint §6.11, G-003, G-012 |
| `frontoffice` | Front Office / Customer Service | Walk-in intake, prospective applicant details, student enrollment, parent contact information, ID badge issuance, and tuition status for their assigned `branchId` and `division`. | Cross-branch or cross-division student/parent records; peer staff dossiers. | Blueprint §6.9, §11, §19, INV-04 |
| `instructor` | Teaching Instructor | Academic roster, attendance records, progress report evaluations, and student learning needs for students enrolled in classes they teach (primary or substitute). | Full student dossiers of students not taught; bulk export of parent phone numbers/home addresses to personal devices; cross-branch student records. | Blueprint §6.12, §19 |
| `marketing` | Marketing Specialist | Prospective student leads, walk-in inquiries (`deskInquiries`), and campaign outreach tracking for their branch/division. | Enrolled student medical/family personal data; parent account credentials; child PII outside lead acquisition. | Blueprint §6.6, §6.7, §19 |
| `officeboy` | Facilities & Support Staff | Physical maintenance tasks, facilities logs, and assigned site duties. | **Zero student/parent personal data:** Forbidden from reading child personal information, parent contacts, applicant leads, or academic records. | Blueprint §6.10, §19 |
| `student` | Enrolled Learner | Self-record only: own attendance logs, assigned classes, and personal level/progress. | All peer student records, classmate grades, and parent account details. | Blueprint §20, INV-08 |
| `parent` | Parent / Guardian | Linked children only: attendance logs, class schedule, tuition health summary, and progress evaluations for explicitly verified linked children (`childStudentIds`). | Any peer child or unrelated family's personal, academic, or financial records. | Blueprint §19, §20, INV-08 |

---

### 5.3 Phase 2: Feature & Personal Data Surface Discovery

The audit discovered 12 distinct feature components, collection routes, and background execution paths processing student, child, or parent personal data:

| Feature ID | Path / Component | Reachable Roles | Data Exposed / Processed | Actions / Mutations | Intended Scope | Enforcement Path | Applicable Dimensions |
|---|---|---|---|---|---|---|---|
| `FEAT-STU-01` | `src/features/students/StudentRoster.jsx:50` | `vice_director`, `manager`, `frontoffice`, `opslead`, `instructor` | Student name, NIS, phone, DOB, parent contact, class enrollment, tuition health | View roster, search/filter, update status, trigger payment, export CSV | Branch & division scoped (Exec: all) | Dashboard tab guard → Firestore rules `/users` | Dim 1, 2, 4, 6 |
| `FEAT-STU-02` | `src/features/students/StudentRosterTable.jsx:40` | Same as `FEAT-STU-01` | Full tabular student dossiers, linked parents, badge status, action buttons | Change status, promote student, transfer class, open badge modal | Branch & division scoped | Component props → `usersRepository.js` | Dim 1, 3, 4 |
| `FEAT-STU-03` | `src/features/students/ParentsList.jsx:30` | `vice_director`, `manager`, `frontoffice`, `opslead` | Parent display name, email, WhatsApp phone, linked child count & names | Search parents, copy phone/email, open linkage modal | Branch scoped | `StudentRoster` tab guard → `users` array | Dim 1, 2, 4 |
| `FEAT-STU-04` | `src/features/students/StudentParentLinkage.jsx:24` | `director`, `vice_director`, `manager`, `frontoffice`, `opslead` | Parent email, phone, name, student linkage association | Create secondary Auth parent account, link/unlink child via Worker | Same branch parent & child | Modal guard → Worker `/api/v1/parent-link` & fallback | Dim 1, 3, 5, 6 |
| `FEAT-STU-05` | `src/features/dashboard/ParentDashboard.jsx:27` | `parent` | Linked child name, photo, level badge, class timetable, attendance, tuition health | Switch child, view attendance history, view class schedule | Linked children only (`childStudentIds`) | Auth route `/portal` → `parentPortalRepository.js` → rules | Dim 1, 2, 4, 6 |
| `FEAT-STU-06` | `src/features/auth/RegistrationPage.jsx:8` | Public (Unauthenticated) | Applicant student full name, DOB, place of birth, religion, parent names, phones, jobs | Embeds official Google Form intake; submits to Google Sheets | Public intake | Embedded Google Form → `FormSync.gs` → `/applications` | Dim 2, 5 |
| `FEAT-STU-07` | `src/features/students/applicationsRepository.js:31` | `director`, `vice_director`, `manager`, `frontoffice` | Full applicant background, parent contact details, education, referral source | Approve applicant into `/users`, update application status, enroll in class | Branch & division scoped | Transaction → `applications` & `/users` rules | Dim 1, 3, 4, 6 |
| `FEAT-STU-08` | `src/features/reports/tabs/AdmissionsTab.jsx:25` | `director`, `vice_director`, `manager`, `frontoffice`, `admin` [leak] | Prospective applicant funnel, names, programs, application timestamps | Filter by branch/date, view application metrics, search applications | Branch scoped (Exec: all) | `ReportsDashboard` tab guard → `fetchAdmissionsReportData` | Dim 1, 2, 4, 6 |
| `FEAT-STU-09` | `src/features/students/StudentProgressForm.jsx:36` | `instructor`, `instructorleader` | Student name, enrolled class, CEFR skill scores, teacher remarks, promotion flag | Create progress report in `/progressReports` | Classes taught by caller | Form validation → `progressReportsRepository.js` → rules | Dim 1, 3, 4 |
| `FEAT-STU-10` | `src/features/students/BadgeModal.jsx:23` | `director`, `vice_director`, `manager`, `frontoffice`, `opslead`, `instructor` | Student/Staff name, role, level, photo, QR code (encoding UID) | Render printable ID pass, download PNG badge | Caller's displayed person | Local canvas / SVG render (no backend mutation) | Dim 2 |
| `FEAT-STU-11` | `src/features/students/StudentPhotoCapture.jsx:5` | `director`, `vice_director`, `manager`, `frontoffice` | Child facial image capture (webcam or file upload) | Uploads photo to external Cloudinary bucket; saves HTTPS URL | Direct client fetch | Client `uploadToCloudinary` → unsigned preset | Dim 2, 5 |
| `FEAT-STU-12` | `src/features/staff/StaffDirectory.jsx:42` | `vice_director`, `admin` | Staff name, email, phone, role, branch, division, status, teaching workload | Search staff, copy phone/email, change status, safe delete, print badge | Province-wide staff management | Dashboard tab guard → `usersRepository.js` → rules | Dim 1, 2, 3, 4 |

---

### 5.4 Phase 3: Technical Audit Across Roles & Surfaces

#### 1. System Admin Boundary on Personal Data (Dimension 1 & 2)
- **Observed Behavior:**
  - In `firestore.rules:687-705`, `/users/{userId}` allows `allow get: if ... || isExecutive()` and `allow list: if isExecutive()`.
  - In `firestore.rules:43`, `function isExecutive()` is defined as `isDirector() || isViceDirector() || isAdmin()`.
  - Because `isAdmin()` is bundled into `isExecutive()`, a technical System Admin possesses database-level read and list permissions over every user document in `/users`.
  - In `src/features/dashboard/useDashboardData.js:272-278`, when mounted inside `AdminDashboard.jsx`, an unscoped real-time `onSnapshot` listener is established across the entire `collection(db, "users")`. This continuously syncs all students and parents into the administrator's local browser memory.
  - In `src/features/reports/ReportsDashboard.jsx:157`, the "Admissions & Leads" tab is displayed to `isActualAdmin`, and `reportsRepository.js:263` classifies `callerRole === "admin"` as `isExecutive`, emitting an unscoped `/applications` query that crashes with `permission-denied` because `firestore.rules:767` strictly excludes `admin`.
- **Governance Conformance:** **FAIL** (Violates Blueprint §7, §19, INV-02, INV-08). Technical administration must never grant access to student, child, or parent personal records.

#### 2. Student Withdrawal & Enrollment Freeze Dual-Control (Dimension 3)
- **Observed Behavior:**
  - `STUDENT_WITHDRAWAL_OR_FREEZE` is defined in `approvalGates.constants.js:248-269` with `domain: "students"`, `requiredScope: SCOPE_LEVELS.BRANCH_LOCAL`, and `approverRole: APPROVAL_ROLES.DIVISION_MANAGER`.
  - However, in `src/features/students/StudentRoster.jsx:122`, when a user selects a status change to `"graduated"`, `"inactive"`, or `"archived"`, the UI invokes `updateStudentStatus(student.id, newStatus)` directly.
  - In `src/features/dashboard/usersRepository.js:72-82`, `updateStudentStatus` executes a direct `setDoc(doc(db, "users", uid), { status, ... }, { merge: true })`.
  - In `firestore.rules:653`, `'status'` is included directly in `diffKeys.hasOnly` for `isStaffOrMgr` without requiring an approval ticket or checking `appliedFromApproval`.
  - Result: No approval envelope is ever generated, logged, or verified when a student is withdrawn or frozen. Front Office staff or Managers can unilaterally withdraw students without dual-control oversight.
- **Governance Conformance:** **FAIL** (Violates Blueprint §14, §15, §16, §26). Maker-checker dual control is completely unhooked in production code.

#### 3. Teaching Instructor Personal Data Visibility & Bulk Export (Dimension 2 & 4)
- **Observed Behavior:**
  - In `src/features/dashboard/instructor/InstructorClasses.jsx:276`, teaching instructors mount `<StudentRoster readOnly={true} userRole="instructor" canViewParents={false} />`.
  - In `src/features/students/StudentRoster.jsx:486-492`, the `Export CSV` button calling `exportStudentRosterCSV(sortedStudents)` is rendered unconditionally for all users, completely ignoring the `readOnly` prop and `userRole === "instructor"`.
  - In `src/features/students/studentRosterExport.js:5-41`, `exportStudentRosterCSV` packages full student names, parent names, parent WhatsApp phone numbers, student dates of birth, education levels, and tuition payment health statuses into an unencrypted CSV downloaded directly to the instructor's device.
  - Furthermore, in `firestore.rules:705`, `isStaff()` allows teaching instructors to `list` all students and parents in their branch and division, exceeding their need-to-know scope which should be restricted to enrolled students in classes they teach.
- **Governance Conformance:** **FAIL** (Violates Blueprint §6.12, §19, INV-08). Teaching instructors are exposed to bulk PII exports and branch-wide student contact records without pedagogical justification.

#### 4. Facilities / Office Boy Access on Prospect Leads (Dimension 1 & 4)
- **Observed Behavior:**
  - In `firestore.rules:1066-1078`, `/deskInquiries/{inquiryId}` permits `allow get, list, create, update` for `isStaff()`.
  - In `firestore.rules:63`, `isStaff()` explicitly includes `'officeboy'`.
  - In `firestore.rules:174-176`, `isDivisionAllowedForBranchStaff` returns `true` for non-office staff (`!isStaffRole`), meaning `officeboy` bypasses division checks.
  - Result: An authenticated Facilities / Office Boy account can read, create, and update prospective student leads, phone numbers, and notes in `/deskInquiries`.
- **Governance Conformance:** **FAIL** (Violates Blueprint §6.10, §19). Physical branch maintenance staff must not have database access to customer intake and prospect inquiries.

#### 5. Central Academic Lead Province-Wide Scope on Progress Reports (Dimension 4 & 6)
- **Observed Behavior:**
  - In `firestore.rules:1154, 1159`, reading `/progressReports/{reportId}` for the Instructor Leader is guarded by:
    `|| (isInstructorLeader() && isSameBranch(resource.data))`
    `|| (isInstructorLeader() && isSameBranchStrict(resource.data))`
  - Under Blueprint v3.4 §4, §5, §6.11, G-012, and ratified ADR 2026-10-13, the Instructor Leader is based at the Main Campus (`kota_gorontalo`) but exercises **province-wide academic coordination scope (`multi-branch`)** across all four branches for curriculum quality, teacher evaluations, placement overrides, and student academic monitoring.
  - Because `isSameBranchStrict` requires `resource.data.branchId == userBranch()`, the Central Academic Lead is blocked from inspecting progress reports submitted by instructors at satellite branches (Bone Bolango, Limboto, Pohuwato), preventing province-wide pedagogical monitoring.
- **Governance Conformance:** **FAIL** (Governance Divergence against Blueprint v3.4 §6.11 and G-012).

#### 6. Direct User Document Update Granting Tuition Coverage (Dimension 3 & 6)
- **Observed Behavior:**
  - In `firestore.rules:651-663`, the `diffKeys.hasOnly` list for `isStaffOrMgr` updating `/users/{studentId}` includes:
    `'paymentPlan', 'paymentStatus', 'lastPaymentPeriod', 'lastPaymentDate', 'lastPaymentAmount', 'lastPaymentMethod', 'paidUntil'`.
  - While `recordPayment` in `paymentsRepository.js` legitimately writes these fields in a batch alongside an immutable payment record, `firestore.rules` does NOT verify that a corresponding `/payments` record exists or was created in the same transaction.
  - Result: A rogue or compromised Front Office staff account could write directly to `/users/{studentId}` with `paymentStatus: "paid"` and `paidUntil: "2027-12-31"`, effectively granting free tuition at the database layer without creating a payment record, receipt, or approval ticket.
- **Governance Conformance:** **FAIL** (Violates Blueprint §18, OD-1, OD-2, OD-3). Tuition coverage must derive strictly from authorized payments or approved discounts.

#### 7. Unsigned Public Media Storage for Child Identification Photographs (Dimension 5)
- **Observed Behavior:**
  - In `src/features/students/StudentPhotoCapture.jsx:67, 90` and `src/features/shared/cloudinaryUpload.js:6-18`, child headshots captured via webcam or file upload are uploaded directly to Cloudinary using an **unsigned upload preset** (`mylibertyies-f2f38`).
  - The resulting images are returned as public HTTPS URLs (`https://res.cloudinary.com/...`) stored directly in `student.photoURL`.
  - These image URLs are completely unauthenticated and accessible to anyone with the URL, without token expiration or access controls.
- **Governance Conformance:** **OBSERVED RISK / FINDING** (Blueprint §19). Unauthenticated third-party storage of child facial imagery presents a privacy and reputational risk.

---

### 5.5 Phase 4: Working Role-Function Conformance Ledger (Slice 3)

| Contract ID | Role + Scope | Expected Behavior & Source | Feature / Path | Observed Behavior | Evidence | Result | Mismatch Type | Finding ID |
|---|---|---|---|---|---|---|---|---|
| `CTR-STU-01` | `admin` (System Admin) | Zero business access to student, child, or parent personal records. (Blueprint §7, §19, INV-02, INV-08) | `firestore.rules:687, 703` | Database rules allow `get` and `list` on `/users` for `isExecutive()`, which bundles `isAdmin()`. | `firestore.rules:43, 687, 703` | **FAIL** | Excess Capability / Privacy Breach | `DOM05-SEC-02` |
| `CTR-STU-02` | `admin` (System Admin) | Technical dashboard must not sync student/child personal dossiers into memory. (Blueprint §7, §19, INV-02) | `useDashboardData.js:272` | Real-time listener on entire `/users` collection downloads all students and parents to Admin in memory. | `useDashboardData.js:261-278` | **FAIL** | Excess Capability / Data Leakage | `DOM11-SEC-01` |
| `CTR-STU-03` | `admin` (System Admin) | Admin must not see Admissions & Leads reporting or query applications. (Blueprint §7, INV-02) | `ReportsDashboard.jsx:157` | "Admissions & Leads" sub-tab displayed to Admin; emits unscoped query; crashes with permission-denied. | `ReportsDashboard.jsx:157`, `reportsRepository.js:263` | **FAIL** | Governance Drift / Error State | `DOM05-UX-02` |
| `CTR-STU-04` | `frontoffice` / `manager` | Student withdrawal or enrollment freeze must require dual-control approval ticket. (Blueprint §14, §15, §16, §26) | `StudentRoster.jsx:122` | Changes student status directly via `updateStudentStatus` without generating `STUDENT_WITHDRAWAL_OR_FREEZE` ticket. | `StudentRoster.jsx:122`, `firestore.rules:653` | **FAIL** | Missing Control / Dual-Control Bypass | `DOM05-GOV-02` |
| `CTR-STU-05` | `instructor` (Teaching Instructor) | Teaching instructor must not bulk-export parent WhatsApp numbers and child PII to personal devices. (Blueprint §6.12, §19) | `StudentRoster.jsx:487` | "Export CSV" button is visible and active on instructor class roster view; downloads unencrypted CSV of parent phone numbers. | `StudentRoster.jsx:487-492`, `studentRosterExport.js:5-41` | **FAIL** | Excess Capability / Privacy Conformance | `DOM05-PRIV-01` |
| `CTR-STU-06` | `officeboy` (Facilities) | Facilities staff must not read, create, or update prospective student leads. (Blueprint §6.10, §19) | `firestore.rules:1066, 1071, 1078` | Rules permit `isStaff()` (which includes `officeboy`) to read, create, and update `/deskInquiries`. | `firestore.rules:63, 1066-1078` | **FAIL** | Excess Capability / Least Privilege | `DOM05-SEC-03` |
| `CTR-STU-07` | `instructorleader` (Central Academic Lead) | Province-wide pedagogical oversight across all four physical branches. (Blueprint v3.4 §6.11, G-012, ADR 2026-10-13) | `firestore.rules:1154, 1159` | Progress reports read rule restricts Instructor Leader to `isSameBranchStrict`, blocking satellite branch evaluations. | `firestore.rules:1154, 1159` | **FAIL** | Governance Divergence / Scope Lock | `DOM05-GOV-03` |
| `CTR-STU-08` | `frontoffice` / `manager` | Tuition coverage (`paymentStatus`, `paidUntil`) must only advance through verified payments. (Blueprint §18, OD-1, OD-2, OD-3) | `firestore.rules:651-663` | Direct update on `/users/{studentId}` permits `diffKeys` including `paymentStatus` and `paidUntil` without payment record verification. | `firestore.rules:660-662`, `usersRepository.js:72-82` | **FAIL** | Integrity Vulnerability / Financial Bypass | `DOM04-SEC-03` |
| `CTR-STU-09` | External Storage (Media) | Child identification photographs must be stored with access control and least exposure. (Blueprint §19) | `cloudinaryUpload.js:6-18` | Unsigned client upload preset stores child headshots in public unauthenticated Cloudinary URLs. | `cloudinaryUpload.js:1-18`, `StudentPhotoCapture.jsx:67` | **FAIL** | Privacy Risk / Insecure Storage | `DOM05-PRIV-02` |
| `CTR-STU-10` | `parent` (Parent Profile) | Parent portal access must be strictly restricted to verified linked children. (Blueprint §19, §20, INV-08) | `ParentDashboard.jsx:78` | Scoped strictly to `childStudentIds` validated by `isParentOf` in Firestore rules and Worker. | `ParentDashboard.jsx:78-95`, `firestore.rules:574-583` | **PASS** | Compliant | None |
| `CTR-STU-11` | `student` (Learner Profile) | Student accounts must only access their own self-records. (Blueprint §20, INV-08) | `App.jsx:639` | Student landing page redirects to self-portal; cannot list peer records or other families. | `App.jsx:639-666`, `firestore.rules:687` | **PASS** | Compliant | None |
| `CTR-STU-12` | Public Intake (`/register`) | Public registration form must ingest leads without exposing backend Firestore database directly. (Blueprint §20) | `RegistrationPage.jsx:6` | Embeds Google Form; synchronization executed asynchronously via Google Apps Script Service Account. | `RegistrationPage.jsx:6-120`, `FormSync.gs`, `firestore.rules:771` | **PASS** | Compliant | None |

---

### 5.6 Detailed Audit Findings & Evidence

#### Finding 1: System Admin Full Personal Data Exposure & Unscoped Listener (`DOM05-SEC-02` / `DOM11-SEC-01`)
- **Classification:** Bug / Security & Privacy Vulnerability
- **Severity:** HIGH / PRIVACY BREACH
- **Evidence:**
  - `firestore.rules:43`: `function isExecutive() { return isDirector() || isViceDirector() || isAdmin(); }`
  - `firestore.rules:687-705`: `match /users/{userId}` allows `allow get: if ... || isExecutive()` and `allow list: if isExecutive()`.
  - `src/features/dashboard/useDashboardData.js:272-278`:
    ```javascript
    const usersQuery = usersConstraints.length
      ? query(collection(db, "users"), ...usersConstraints)
      : collection(db, "users");
    unsubUsers = onSnapshot(usersQuery, (snap) => setUsers(snap.docs.map(...)));
    ```
    For Admin, `usersConstraints` is empty, querying and downloading the entire `/users` collection into memory.
  - `firestore.rules:613-642`: `canUpdateUser` allows `isExec` (including `admin`) to update any field on student and parent documents without diffKeys constraints.
- **Why It Matters:** System Admin is an IT/technical system role. Granting System Admin database-level read, list, and update permissions over student and child dossiers violates Blueprint §7, Blueprint §19, and Invariant INV-02.
- **Recommended Direction:**
  1. In `firestore.rules`, decouple `/users/{userId}` read and list rules: require `isOrgExecutive()` (`director`, `vice_director`) for `role in ['student', 'parent']`. Restrict `admin` to staff roles (`role in ['admin', 'director', 'vice_director', 'manager', 'instructor', 'frontoffice', 'opslead', 'marketing', 'officeboy']`).
  2. In `useDashboardData.js`, when mounted in `AdminDashboard`, add constraint `where("role", "in", STAFF_ROLES)` so it never listens to student or parent documents.
  3. In `canUpdateUser`, remove `admin` from unrestricted executive updates over student and parent profiles.
- **Owner Decision Required:** No (Explicitly established in Blueprint §7 and INV-02).
- **Blocking Status:** Blocking before completion of Slice 3 remediation.

#### Finding 2: Admissions & Leads Tab Exposed to Admin with Broken Unscoped Query (`DOM05-UX-02` / `DOM11-GOV-04`)
- **Classification:** Bug / Governance Drift & Error State
- **Severity:** MEDIUM
- **Evidence:**
  - `src/features/reports/ReportsDashboard.jsx:157`:
    ```jsx
    {(isActualAdmin || isExecutiveView || isFrontOffice || isManager) && (
      <button onClick={() => handleSubTabClick("admissions")}>Admissions & Leads</button>
    )}
    ```
  - `src/features/reports/reportsRepository.js:258-264`: classifies `callerRole === "admin"` or `isAdminView` as `isExecutive: true`, emitting an unscoped `collection(db, "applications")` query.
  - `firestore.rules:767`: `/applications/{applicationId}` strictly permits `isOrgExecutive()` (`director`, `vice_director`), Front Office, and Division Managers, excluding `admin`.
- **Why It Matters:** Admin clicking the tab results in a silent failure or `Failed to load admissions report data` error state. System Admin has no operational need to view prospective student applications.
- **Recommended Direction:**
  1. In `ReportsDashboard.jsx:157`, remove `isActualAdmin` from the tab button condition.
  2. In `reportsRepository.js:258-264`, remove `isAdminView` and `callerRole === "admin"` from `isExecutive`.
- **Owner Decision Required:** No (Strict alignment with Blueprint §7 and existing Firestore rules).
- **Blocking Status:** Before completion of Slice 3 remediation.

#### Finding 3: Student Withdrawal & Freeze Dual-Control Gate Unhooked in UI and Rules (`DOM05-GOV-02`)
- **Classification:** Governance Conflict / Missing Dual-Control
- **Severity:** HIGH / BUSINESS INTEGRITY
- **Evidence:**
  - `src/features/shared/approvalGates.constants.js:248-269`: Defines `STUDENT_WITHDRAWAL_OR_FREEZE` (approver: `manager`, escalation: `vice_director`).
  - `src/features/students/StudentRoster.jsx:122`: When status is changed to "graduated", "inactive", or "archived", directly calls `updateStudentStatus(student.id, newStatus)`.
  - `firestore.rules:653`: `'status'` is in `diffKeys.hasOnly` for `isStaffOrMgr` without any approval envelope requirement.
- **Why It Matters:** Front Office staff can unilaterally withdraw or freeze students, terminating billing coverage, freeing up cohort seats, or marking accounts inactive without Division Manager review.
- **Recommended Direction:**
  1. In `StudentRoster.jsx:86-130`, when Front Office initiates a student status change to `inactive`, `graduated`, or `archived`, generate and submit a `STUDENT_WITHDRAWAL_OR_FREEZE` approval ticket instead of writing directly to Firestore.
  2. In `firestore.rules:664-668`, require `isApprovedStudentWithdrawalOrFreeze(userId, req, res)` when `req.status != res.status && req.status in ['inactive', 'graduated', 'archived']`.
- **Owner Decision Required:** Yes (Confirm whether Division Manager can self-approve student withdrawals for their own division, or whether all withdrawals require Vice Director sign-off).
- **Blocking Status:** Owner decision required.

#### Finding 4: Unrestricted Bulk CSV Export of Child PII and Parent WhatsApp Numbers on Instructor Roster (`DOM05-PRIV-01`)
- **Classification:** Security Vulnerability / Privacy Conformance
- **Severity:** HIGH / PRIVACY BREACH
- **Evidence:**
  - `src/features/dashboard/instructor/InstructorClasses.jsx:276`: mounts `<StudentRoster readOnly={true} userRole="instructor" canViewParents={false} />`.
  - `src/features/students/StudentRoster.jsx:486-492`: Renders `<button onClick={() => exportStudentRosterCSV(sortedStudents)}>Export CSV</button>` unconditionally, ignoring `readOnly` and `userRole`.
  - `src/features/students/studentRosterExport.js:5-41`: Exports Student Name, Parent Name, Parent WhatsApp Number, Student DOB, Education Level, and Payment Status into an unencrypted CSV file.
- **Why It Matters:** Instructors can download full contact lists of parents and student birth dates to their personal laptops and phones. Under Blueprint §19, unnecessary exposure and distribution of child personal information and parent contact details must be strictly minimized.
- **Recommended Direction:**
  1. In `StudentRoster.jsx:486`, hide the `Export CSV` button when `readOnly` is true or when `userRole === "instructor"`.
  2. Restrict student roster CSV exports to authorized operational roles: `isOrgExecutive`, `manager`, `frontoffice`.
- **Owner Decision Required:** No (Strict realization of Blueprint §19).
- **Blocking Status:** Before completion of Slice 3 remediation.

#### Finding 5: Facilities / Office Boy Granted Database Access on Prospect Leads (`DOM05-SEC-03`)
- **Classification:** Security Vulnerability / Least Privilege
- **Severity:** LOW
- **Evidence:**
  - `firestore.rules:1066, 1071, 1078`: `/deskInquiries/{inquiryId}` permits get, list, create, update for `isStaff()`.
  - `firestore.rules:63`: `isStaff()` includes `'officeboy'`.
  - `firestore.rules:174-176`: `isDivisionAllowedForBranchStaff` returns `true` for `officeboy` because `!isStaffRole` evaluates to true.
- **Why It Matters:** Maintenance and facilities staff have no business purpose reading prospective student names, phone numbers, or intake notes.
- **Recommended Direction:**
  - In `firestore.rules:1066-1085`, replace `isStaff()` with `(isFrontOffice() || isManager() || hasRole('marketing'))`.
- **Owner Decision Required:** No (Blueprint §6.10 explicitly excludes administrative/intake authority from Office Boy).
- **Blocking Status:** Before completion of Slice 3 remediation.

#### Finding 6: Central Academic Lead (Instructor Leader) Locked by Same-Branch Rule on Progress Reports (`DOM05-GOV-03`)
- **Classification:** Governance Conflict / Scope Divergence
- **Severity:** MEDIUM
- **Evidence:**
  - `firestore.rules:1154, 1159`:
    `|| (isInstructorLeader() && isSameBranch(resource.data))`
    `|| (isInstructorLeader() && isSameBranchStrict(resource.data))`
- **Why It Matters:** Under Blueprint v3.4 §4, §5, §6.11, G-012, and ADR 2026-10-13, the Instructor Leader is based at Kota Gorontalo but holds province-wide pedagogical scope across all branches. Locking progress report reads behind `isSameBranchStrict` prevents the Central Academic Lead from reviewing academic evaluations submitted by teachers at satellite branches (Bone Bolango, Limboto, Pohuwato).
- **Recommended Direction:**
  - In `firestore.rules:1154, 1159`, allow `isInstructorLeader()` to read `/progressReports` across all branches without `isSameBranchStrict`.
- **Owner Decision Required:** No (Ratified in Blueprint v3.4 §6.11 and G-012).
- **Blocking Status:** Before completion of Slice 3 remediation.

#### Finding 7: Direct User Document Update Granting Tuition Coverage Without Payment Record (`DOM04-SEC-03` / `DOM05-SEC-04`)
- **Classification:** Security Vulnerability / Financial Bypass
- **Severity:** HIGH / FINANCIAL RISK
- **Evidence:**
  - `firestore.rules:651-663`: `diffKeys.hasOnly` for `isStaffOrMgr` updating `/users/{studentId}` includes `'paymentPlan', 'paymentStatus', 'lastPaymentPeriod', 'lastPaymentDate', 'lastPaymentAmount', 'lastPaymentMethod', 'paidUntil'`.
  - `src/features/dashboard/usersRepository.js:72-82`: `updateStudentStatus` or direct Firestore `setDoc`/`updateDoc` can update these fields without creating a corresponding record in `/payments`.
- **Why It Matters:** A Front Office staff member or Manager could grant active tuition status and advance `paidUntil` coverage directly on a student document in Firestore, bypassing payment recording, receipt generation, and executive discount approvals.
- **Recommended Direction:**
  - In `firestore.rules:651-663`, remove `'paymentPlan', 'paymentStatus', 'lastPaymentPeriod', 'lastPaymentDate', 'lastPaymentAmount', 'lastPaymentMethod', 'paidUntil'` from client-writable `diffKeys`, OR require that any update to these fields be accompanied by an atomic batch write to `/payments`.
- **Owner Decision Required:** Yes (Confirm whether Front Office should ever be able to edit `paymentPlan` manually without recording a payment).
- **Blocking Status:** Owner decision required.

#### Finding 8: Unsigned Public Media Storage for Child Identification Photographs (`DOM05-PRIV-02`)
- **Classification:** Privacy Risk / Insecure Storage
- **Severity:** MEDIUM / PRIVACY CONFORMANCE
- **Evidence:**
  - `src/features/shared/cloudinaryUpload.js:6-18`: Uses unsigned upload preset `mylibertyies-f2f38` to upload images directly from browser to Cloudinary.
  - `src/features/students/StudentPhotoCapture.jsx:67`: Child headshot webcam captures are uploaded and saved as public URLs.
- **Why It Matters:** Under Blueprint §19 (*Parent and Child Data Privacy Principle*), child personal data must be safeguarded. Public unauthenticated URLs for child facial imagery present privacy and data leakage risks.
- **Recommended Direction:**
  - In the future rebuild/migration plan, migrate child identification media to private Firebase Storage with signed short-lived download URLs and branch-scoped security rules.
- **Owner Decision Required:** Yes (Acknowledge third-party Cloudinary storage as temporary zero-budget architecture or schedule private bucket migration).
- **Blocking Status:** Advisory / Non-blocking for current zero-budget operation.

---

### 5.7 Segregation of Owner Policy Decisions vs Implementation Defects

#### Implementation Defects (Fix directly via approved code/rule remediation):
1. **`DOM05-SEC-02` / `DOM11-SEC-01`:** Strip `admin` from `/users` student and parent read/list rules and scope `useDashboardData.js` staff listener.
2. **`DOM05-UX-02` / `DOM11-GOV-04`:** Remove "Admissions & Leads" tab from `ReportsDashboard.jsx` for `isActualAdmin`.
3. **`DOM05-PRIV-01`:** Hide `Export CSV` button on student roster for `readOnly` and teaching `instructor` role.
4. **`DOM05-SEC-03`:** Remove `officeboy` / `isStaff()` from `/deskInquiries` rules.
5. **`DOM05-GOV-03`:** Grant province-wide read access on `/progressReports` to Central Academic Lead (`isInstructorLeader()`) per Blueprint v3.4 §6.11.

#### Owner Policy Decisions Required:
1. **Owner Decision OD-STU-1 (Student Withdrawal / Freeze Dual-Control Authority):**
   - *Question:* Who holds final approval authority for withdrawing or freezing a student (`STUDENT_WITHDRAWAL_OR_FREEZE`)?
   - *Option A (Recommended):* Course Division Manager / Kindergarten Division Manager approves local branch withdrawals for their division; escalates to Vice Director if contested or cross-branch.
   - *Option B:* Vice Director approves all student withdrawals province-wide to monitor churn and retention.
2. **Owner Decision OD-STU-2 (Direct Student Tuition Field Updates):**
   - *Question:* Should Front Office / Division Managers ever be able to edit `paymentStatus` or `paidUntil` directly on a student profile, or must tuition coverage derive strictly from an immutable `/payments` record?
   - *Option A (Recommended):* Strict derivation: Strip `paymentStatus` and `paidUntil` from direct `/users` client updates. All tuition health changes must be written via `paymentsRepository.recordPayment` or approved discount envelopes.
   - *Option B:* Allow manual override by Division Manager only (locked for Front Office).
3. **Owner Decision OD-STU-3 (Child Photograph Storage Architecture):**
   - *Question:* Should child identification photos remain on Cloudinary free-tier unsigned uploads (zero budget, public URL), or should they be scheduled for migration to Firebase Storage with authenticated access controls?
   - *Option A (Recommended for Free Tier):* Retain Cloudinary unsigned upload for current $0 budget operations, documenting as an accepted risk.
   - *Option B:* Migrate to Firebase Storage default bucket (within 5GB Spark limit) with security rules restricting access to staff and verified parents.
   - *Owner Status:* Ratified Option A (Accepted zero-budget architecture).

---

## 6. Slice 3 Remediation Execution & Verification (Phase 5/6 Closure)

**Execution Date:** 2026-10-16  
**Auditor / Agent:** Primary Coding Agent, authorized by Owner Kifry  
**Approved Strategy Plan:** [`docs/plans/active/2026-10-16-blrca-slice3-personal-data-remediation.md`](../../plans/active/2026-10-16-blrca-slice3-personal-data-remediation.md)  
**Ratified Owner Decisions:** `OD-STU-1` (Option A), `OD-STU-2` (Option A with Atomic Batch Safeguard), `OD-STU-3` (Option A).

### 6.1 Executed Remediations & Mandatory Safeguards

1. **Safeguard 1: Atomic `recordPayment` Batch Integrity (`DOM04-SEC-03` / `DOM05-SEC-04` — CLOSED)**
   - In `paymentsRepository.js:281`, added `lastPaymentId: paymentRef.id` to the student update object in `recordPayment`.
   - In `firestore.rules:655-688`, added `'lastPaymentId'`, `'isInstallment'`, `'outstandingBalance'`, `'totalAgreedAmount'`, `'nextDueDate'`, and `'appliedFromApproval'` to `diffKeys.hasOnly`.
   - Added atomic batch guard on tuition/installment fields: any modification requires `('lastPaymentId' in req) && !exists(...) && getAfter(...).data.studentId == userId`. Guaranteed that tuition updates on `/users/{studentId}` cannot be executed from the client outside an atomic batch that creates a brand new payment for that student.
2. **Safeguard 2: Admin `/users` Isolation (`DOM05-SEC-02` / `DOM11-SEC-01` — CLOSED)**
   - In `firestore.rules:727, 743`, blocked `isAdmin()` from reading or listing documents where `role in ['student', 'parent']`. Preserved access to all staff roles and unassigned/pending staff accounts.
   - In `useDashboardData.js:29, 280`, constrained Admin user query to `where("role", "in", STAFF_QUERY_ROLES)` so student and parent PII is never loaded into browser memory.
   - Synchronized `securityRulesMatrix.helpers.js` (`canGetUser`, `canListUsers`, `canCreateUser`).
3. **Safeguard 3: Admissions Tab Stripped from Admin (`DOM05-UX-02` / `DOM11-GOV-04` — CLOSED)**
   - In `ReportsDashboard.jsx:157, 288`, removed `isActualAdmin` from Admissions & Leads tab visibility and render guards.
   - In `reportsRepository.js:257-264`, failed closed on Admin callers returning `{ applications: [], classes: [] }`.
4. **Safeguard 4: `STUDENT_WITHDRAWAL_OR_FREEZE` Dual-Control Gate (`DOM05-GOV-02` — CLOSED)**
   - In `StudentRoster.jsx:90-135`, non-manager status transitions to `inactive`, `graduated`, or `archived` create and submit a `STUDENT_WITHDRAWAL_OR_FREEZE` approval ticket routed to the branch Division Manager (or Vice Director).
   - In `ApprovalInbox.jsx:264, 680`, wired execution and preview card; approving calls `updateStudentStatus` with `appliedFromApproval: approval.id`.
   - In `firestore.rules:607, 690-701`, gated status transitions to `inactive`, `graduated`, or `archived` behind `isManager()`, `isOrgExecutive()`, or a valid approved `STUDENT_WITHDRAWAL_OR_FREEZE` envelope.
5. **Safeguard 5: Instructor Bulk PII Export Blocked (`DOM05-PRIV-01` — CLOSED)**
   - In `StudentRoster.jsx:533-541`, hid and disabled `Export CSV` button and handler when `readOnly` is true or `userRole === 'instructor'`.
6. **Safeguard 6: Stripped `officeboy` from Desk Inquiries (`DOM05-SEC-03` — CLOSED)**
   - In `firestore.rules:1111-1132`, replaced `isStaff()` with explicit operational allowlist (`isOrgExecutive() || isManager() || isFrontOffice() || hasRole('marketing') || isInstructorLeader()`).
   - Synchronized `securityRulesMatrix.helpers.js` (`canGetDeskInquiry`, `canListDeskInquiries`).
7. **Safeguard 7: Province-Wide Academic Scope for Central Lead (`DOM05-GOV-03` — CLOSED)**
   - In `firestore.rules:1186, 1205`, granted `isInstructorLeader()` province-wide get and list on `/progressReports` per Blueprint v3.4 §4, §5, G-012. Synchronized `securityRulesMatrix.helpers.js` and tests in `divisionIsolation.test.js`.
8. **Safeguard 8: Unsigned Media Storage Risk Accepted (`DOM05-PRIV-02` — ACCEPTED RISK)**
   - Retained Cloudinary unsigned upload for current $0 budget operations per ratified OD-STU-3 Option A.

### 6.2 Quality Gate & Regression Verification

- **Automated Unit Tests (`vitest run`):** 106 test files passed, **1,448 tests passed** (139 skipped, 0 failed).
- **TypeScript Typecheck (`tsc --noEmit`):** Clean pass (0 errors).
- **ESLint (`eslint .`):** Clean pass (0 errors).
- **Production Build (`vite build`):** Built cleanly in 925ms with PWA service worker generated.
- **Spark Zero-Budget Retention:** 100% maintained; no paid services, no extra dependencies.


---

## 7. Slice 4: Data Exports, Downloads & Print Operations (Phases 0–4 Report)

**Audit Execution Date:** 2026-10-16  
**Auditor / Agent:** Independent Advisor & Auditor (Strict Read-Only Mode)  
**Methodology:** BLRCA Phases 0–4 per `docs/audits/Role & Business Logic Conformance Audit/`  
**Working Tree State:** Clean, Commit `b19034e2fc0d4b012d28fe14b1c696b6aadcaf0a` on `main`  
**Governance Authority:** Authoritative Blueprint v3.4 (`2026-10-13`), Ratified Owner Decisions in `docs/decisions/` (`OD-1`, `OD-2`, `OD-3`, `OD-4`, `OD-STU-1`, `OD-STU-2`, `OD-STU-3`)

### 7.1 Scope & Governing Authorities

This audit comprehensively traces all data extraction, bulk export, download, browser print, clipboard copy, and external messaging surfaces across every canonical role in the MyLiberty Portal.

#### Surfaces Audited:
1. **CSV Export Generation:**
   - Central reporting exports: `ReportsDashboard.jsx:91-97` (`handleExport` via `exportTableCSV`).
   - Sub-tab CSV datasets: `TodayTab.jsx`, `AdmissionsTab.jsx`, `FrontOfficeReportsTab.jsx`, `ClassOperationsTab.jsx`, `LearnerProgressTab.jsx`, `AttendanceLogTab.jsx`, `StaffDutyTab.jsx`, `OperationsReportTab.jsx`.
   - Dedicated financial CSV export: `FinancialReportsTab.jsx:103-126` (`exportFinancialCSV` via `exportTableCSV`).
   - Student roster CSV export: `StudentRoster.jsx:533-541` via `studentRosterExport.js`.
2. **Browser Print Operations:**
   - Digital cashier receipt print: `DigitalReceiptTab.jsx:42-45` via `window.print()`.
   - Student & staff ID credential badges: `BadgeModal.jsx:136-155` via `window.print()`.
   - Cohort roster print: `CohortRosterTable.jsx:110` / `StudentRosterTable.jsx:453`.
   - Shared print utilities: `src/features/shared/printTable.js`.
3. **Clipboard & External Share Triggers:**
   - WhatsApp digital receipt dispatch: `receiptMessages.js:15-84` via `wa.me` links (`PaymentModal.jsx`, `DigitalReceiptTab.jsx`).
   - Parent Portal linkage code / magic link copy: `StudentParentLinkage.jsx:189-214` via `navigator.clipboard.writeText` and `wa.me`.
   - Staff invite link copy: `InvitesPanel.jsx:98-112` via `navigator.clipboard.writeText`.
   - Bulk parent outreach phone numbers copy: `BatchOutreachPanel.jsx:77-84` via `navigator.clipboard.writeText`.

#### Governing Principles & Invariants:
- **Blueprint v3.4 §7 & OD-2:** System Admin is a technical maintenance identity; zero business authority, zero business reporting, and zero business export privileges.
- **Blueprint v3.4 §5.4 (Principles 15 & 16):** Executive dual-control model. Broad cross-branch visibility for strategic and operational oversight; operational data access must not be accidentally severed by UI edit locks (`readOnly`).
- **Blueprint v3.4 §6.8 & §19 (Parent and Child Data Privacy):** Bulk student personal data, parent phone numbers, and official credential printing belong strictly to administrative Front Office and managerial leadership. Teaching instructors must never export bulk contact info or print official credentials.
- **Financial Ledger & Netting Integrity (OD-1, OD-3, Blueprint §26 G-009):** Exported financial datasets must reflect true ledger balances; voided transactions and reversals must not artificially double or triple gross revenue totals in spreadsheet aggregations (`=SUM()`).
- **Formula Injection Defense:** All generated CSVs must neutralize formula execution triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) in untrusted strings.

---

### 7.2 Role-to-Function Export Contracts

| Canonical Role | CSV Bulk Export Authority | Browser Print Authority | Clipboard & External Share Authority | Governing Basis | Status |
|---|---|---|---|---|---|
| `admin` (System Admin) | ❌ FORBIDDEN across all business domains (Finance, Students, Leads, Attendance). IT audit logs only. | ❌ FORBIDDEN on student badges and receipts. | 📝 System Invites (`InvitesPanel`) only. | Blueprint §7, OD-2 | **Established** |
| `director` (Executive) | ✅ FULL PROVINCE SCOPE: Strategic reports, financial analytics, cohort summaries. | ✅ FULL PROVINCE SCOPE: Any receipt, report, or official document. | ✅ FULL PROVINCE SCOPE: Management notices and linkage codes. | Blueprint §0, §5.4 | **Established** |
| `vice_director` (Executive) | ✅ FULL PROVINCE SCOPE: Operational reports, attendance logs, rosters, and financial audit. | ✅ FULL PROVINCE SCOPE: Operational receipts and reports. | ✅ FULL PROVINCE SCOPE: Operational communications. | Blueprint §0, §5.4 | **Established** |
| `manager` (`courses`) | 🔒 BRANCH+DIVISION SCOPE: Course attendance, student rosters, academic progress, revenue reports. | 🔒 BRANCH+DIVISION SCOPE: Course receipts and rosters. | 🔒 BRANCH+DIVISION SCOPE: Local parents and staff. | Blueprint §5.1, §6.8 | **Established** |
| `manager` (`kindergarten`) | 🔒 BRANCH+DIVISION SCOPE: Kids attendance, child dossiers, inquiry logs, tuition reports. | 🔒 BRANCH+DIVISION SCOPE: Kids receipts and rosters. | 🔒 BRANCH+DIVISION SCOPE: Kids parents. | Blueprint §5.1, §6.8 | **Established** |
| `opslead` (Ops Leader) | 🔒 BRANCH SCOPE: Daily check-ins, staff duty logs, operational facility tasks, desk velocity. | 🔒 BRANCH SCOPE: Operational rosters and emergency lists. | 🔒 BRANCH SCOPE: Facility dispatch and staff contacts. | Blueprint §6.8, §6.10 | **Established** |
| `frontoffice` (Front Desk) | 🔒 BRANCH-LOCAL: Desk inquiry logs, daily cash drawer reconciliation, class check-ins. | 🔒 BRANCH-LOCAL: Customer digital receipts, student ID badges, class attendance sheets. | 🔒 BRANCH-LOCAL: Parent linkage PINs, receipt WhatsApp links, outreach batches. | Blueprint §6.8, §18 | **Established** |
| `instructorleader` (Academic) | 🔒 ACADEMIC ONLY: Province-wide placement assessments, student progress, punctuality logs. | 🔒 ACADEMIC ONLY: Assessment rubrics and class sheets. | 🔒 ACADEMIC ONLY: Academic communications. | Blueprint v3.4 §4, §5 | **Established** |
| `instructor` (Teaching) | ❌ FORBIDDEN: Bulk CSV export of student rosters, attendance logs, and financial records. | 🔒 TEACHING ONLY: Class roster attendance sheet for assigned cohorts. Badge print FORBIDDEN. | ❌ FORBIDDEN: Bulk parent contact clipboard dumping. | Blueprint §6.8, §19 | **Established** |
| `marketing` | 🔒 LEADS ONLY: Desk inquiry and school outreach contact logs. | 🔒 LEADS ONLY: Outreach flyers and inquiry summaries. | 🔒 LEADS ONLY: Public promotional messages. | Blueprint §6.8 | **Established** |
| `officeboy` (Facilities) | ❌ FORBIDDEN across all export, print, and clipboard surfaces. | ❌ FORBIDDEN. | ❌ FORBIDDEN. | Blueprint §6.10 | **Established** |
| `parent` / `student` | ❌ FORBIDDEN across bulk exports. | 🔒 PERSONAL ONLY: View/print own payment receipt and personal student badge. | 🔒 PERSONAL ONLY: Share own referral / link. | Blueprint §19, INV-08 | **Established** |

---

### 7.3 Feature Surface Inventory & 5-Checkpoint Tracing

```text
SURFACE 1: ReportsDashboard.jsx Top-Level Export & Print (exportTableCSV)
SURFACE 2: FinancialReportsTab.jsx Dedicated Export (exportFinancialCSV)
SURFACE 3: StudentRoster.jsx & studentRosterExport.js Bulk CSV
SURFACE 4: DigitalReceiptTab.jsx (window.print & WhatsApp Receipt Sharing)
SURFACE 5: BadgeModal.jsx (Student & Staff ID Badge Print & PNG Download)
SURFACE 6: BatchOutreachPanel.jsx (Bulk Parent Phone Clipboard Copy)
SURFACE 7: StudentParentLinkage.jsx & InvitesPanel.jsx (PIN & Token Clipboard Copy)
SURFACE 8: printTable.js (Orphaned Table Print Utility)
```

#### 5-Checkpoint Evaluation Summary:
1. **Checkpoint 1 (Role Visibility & Trigger Gating):**
   - In `ReportsDashboard.jsx:91-97`, the top-level `Export CSV Dataset` button renders unconditionally for any user who can view the dashboard. Teaching instructors navigating to `Reports & Analytics` in `InstructorDashboard.jsx:124` see and can click `Export CSV Dataset` to download full institutional check-ins and learner progress (`DOM11-PRIV-01`).
   - In `StudentRoster.jsx:533-541`, CSV export is gated behind `!readOnly && userRole !== 'instructor'`. While this correctly fixed `DOM05-PRIV-01` for instructors, it inadvertently stripped CSV export from the Vice Director in `ViceDirectorDashboard.jsx:446`, where `readOnly={true}` is passed to prevent student editing (`DOM05-UX-03`).
   - In `BadgeModal.jsx:136-155` and `InstructorClasses.jsx:286`, teaching instructors have access to "View / Print ID Badge", allowing teachers to print official student badges and export QR codes (`DOM05-PRIV-03`).
2. **Checkpoint 2 (Filter & Boundary Scope Enforcement):**
   - In `ReportsDashboard.jsx:27, 196-208`, `canAccessProvinceScope` derives `isActualAdmin`, permitting System Admin to toggle "All Campuses" scope. An Admin selecting "All Campuses" issues un-scoped queries that crash with `permission-denied` (`DOM11-GOV-05`).
   - In `FinancialReportsTab.jsx:103-126`, `exportFinancialCSV` exports raw array rows where voided payments and reversal payments retain positive `p.amount`, failing to subtract reversals or net voided amounts (`DOM04-CSV-01` / `DOM11-CSV-01`).
3. **Checkpoint 3 (CSV Formula Injection Sanitization):**
   - Audited `src/features/shared/csvExport.js:14-25` (`csvEscape`). Confirmed **CLEAN & PROTECTED**. Formula-trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped by prefixing `'` when present on non-numeric strings. Verified in `csvExport.test.js`.
4. **Checkpoint 4 (Sensitive Data & PII Masking):**
   - In `BatchOutreachPanel.jsx:77-84`, clicking "Copy Phone Numbers" writes an unformatted list of raw parent phone numbers to the system clipboard without authorization gating or audit logging (`DOM06-PRIV-01`).
   - In `DigitalReceiptTab.jsx:85-89` and `receiptMessages.js:70`, internal cashier remarks (`rcp.notes`) are included in public receipts and WhatsApp customer messages (`DOM04-PRIV-01`).
5. **Checkpoint 5 (Dead Code & Asset Integrity):**
   - `src/features/shared/printTable.js` is an orphaned utility with 0 callers across `src/` (`DOM11-TECH-02`).

---

### 7.4 Detailed Findings (Phases 3 & 4)

#### Finding 1: Ungated Institutional CSV Export Button in `ReportsDashboard.jsx` (`DOM11-PRIV-01`)
- **Classification:** Security Vulnerability / Privilege Leakage
- **Severity:** HIGH / DATA EXFILTRATION RISK
- **Evidence:**
  - `src/features/reports/ReportsDashboard.jsx:91-97`:
    ```jsx
    <button
      onClick={handleExport}
      disabled={exporting || loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ..."
    >
      <Download className="w-4 h-4" />
      <span>{exporting ? 'Exporting...' : 'Export CSV Dataset'}</span>
    </button>
    ```
  - `src/features/dashboard/instructor/InstructorDashboard.jsx:124`: mounts `<ReportsDashboard userRole="instructor" ... />`.
  - `src/features/dashboard/instructor/KidsInstructorDashboard.jsx:135`: mounts `<ReportsDashboard userRole="instructor" division="kindergarten" ... />`.
- **Why It Matters:** Any teaching instructor can export full student attendance records (`TodayTab`), comprehensive learner evaluation records (`LearnerProgressTab`), and peer instructor punctuality logs (`InstructorPunctualityTab`) to their personal device. This directly violates Blueprint §6.8 & §19.
- **Recommended Direction:**
  - Gate the `Export CSV Dataset` button behind role capability: `const canExportReports = isExecutive || isManager || isOpsLead;` (and Front Office for daily logs). Hide from `instructor`.
- **Owner Decision Required:** No (Direct realization of Blueprint §19).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 2: System Admin Retains Multi-Campus Province Scope in `ReportsDashboard.jsx` (`DOM11-GOV-05`)
- **Classification:** Governance Conflict / Admin Boundary Drift
- **Severity:** MEDIUM
- **Evidence:**
  - `src/features/reports/ReportsDashboard.jsx:27`:
    ```javascript
    const canAccessProvinceScope = isExecutive || isActualAdmin;
    ```
  - `src/features/reports/ReportsDashboard.jsx:196-208`: renders "All Campuses" dropdown option if `canAccessProvinceScope` is true.
- **Why It Matters:** Under Blueprint §7 and OD-2, System Admin has no province-wide business reporting role. Selecting "All Campuses" causes repository queries to request multi-campus data that the security rules reject with `permission-denied`.
- **Recommended Direction:**
  - Update `canAccessProvinceScope = isExecutive;` (excluding `isActualAdmin`).
- **Owner Decision Required:** No (Strict conformance to ratified OD-2 and Blueprint §7).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 3: Financial Reports CSV Export Doubles Reversals & Voids (`DOM04-CSV-01` / `DOM11-CSV-01`)
- **Classification:** Data Integrity / Financial Ledger Inaccuracy
- **Severity:** HIGH / FINANCIAL INTEGRITY
- **Evidence:**
  - `src/features/reports/FinancialReportsTab.jsx:103-126`:
    ```javascript
    const exportFinancialCSV = () => {
      ...
      const rows = payments.map((p) => [
        p.id || '',
        p.studentName || p.studentId || '',
        p.amount || 0,
        p.status || 'completed',
        p.method || '',
        p.planName || p.planType || '',
        ...
      ]);
      exportTableCSV('financial-payments-report', headers, rows);
    };
    ```
- **Why It Matters:** In Slice 2, `financeUtils.js` was remediated so UI totals cleanly net voided payments and subtract reversals. However, `exportFinancialCSV` outputs raw positive `p.amount` for all records, including `status: 'voided'` and `status: 'reversal'`. If management opens the exported CSV and uses `=SUM(Amount)`, voided and reversed transactions are added to revenue, severely inflating financial records.
- **Recommended Direction:**
  - Update `exportFinancialCSV` to output `-p.amount` for reversals, and either exclude voided transactions or output `0` amount with explicit `VOIDED` status.
- **Owner Decision Required:** No (Mathematical consistency with ratified OD-1 and OD-3).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 4: Vice Director Denied Student Roster CSV Export Due to `readOnly={true}` Coupling (`DOM05-UX-03`)
- **Classification:** Functional Defect / Executive Capability Loss
- **Severity:** MEDIUM / OPERATIONAL IMPACT
- **Evidence:**
  - `src/features/dashboard/vicedirector/ViceDirectorDashboard.jsx:446`:
    ```jsx
    <StudentRoster readOnly={true} branchId={...} />
    ```
  - `src/features/students/StudentRoster.jsx:533-541`:
    ```jsx
    {!readOnly && userRole !== 'instructor' && (
      <button onClick={() => exportStudentRosterCSV(sortedStudents)}>
        Export CSV
      </button>
    )}
    ```
- **Why It Matters:** `readOnly={true}` was supplied to prevent inline student profile modifications by the Vice Director. However, coupling CSV export gating to `!readOnly` completely hides and disables student roster exports for the Vice Director, violating Blueprint §5.4 (Principle 15 & 16: Vice Director holds operational control and province-wide reporting oversight).
- **Recommended Direction:**
  - Decouple export gating: `const canExport = userRole !== 'instructor';`. Roster CSV export should be available to `isExecutive`, `manager`, and `frontoffice`, independent of `readOnly` editing state.
- **Owner Decision Required:** No (Blueprint §5.4).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 5: Teaching Instructors Authorized to View & Print Official Student ID Badges (`DOM05-PRIV-03`)
- **Classification:** Security Vulnerability / Credential Issuance Scope
- **Severity:** MEDIUM / CREDENTIAL INTEGRITY
- **Evidence:**
  - `src/features/dashboard/instructor/InstructorClasses.jsx:286`: mounts `<StudentRoster readOnly={true} userRole="instructor" ... />`.
  - `src/features/students/StudentRosterTable.jsx:453`: renders the "View / Print ID Badge" action button for every student row.
  - Clicking launches `BadgeModal.jsx`, displaying the student's date of birth, education track, student ID QR code, and triggers `window.print()` or PNG download.
- **Why It Matters:** Under Blueprint §6.8 & §19, physical badge generation and credential issuance is an administrative Front Office function. Teaching instructors do not issue credentials or print student ID cards.
- **Recommended Direction:**
  - Pass `canPrintBadge={!isInstructor}` or gate the badge action in `StudentRosterTable.jsx` to `userRole !== 'instructor'`.
- **Owner Decision Required:** No (Blueprint §6.8).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 6: Unaudited Bulk Parent Phone Number Clipboard Copy in `BatchOutreachPanel.jsx` (`DOM06-PRIV-01`)
- **Classification:** Privacy Risk / Bulk PII Exfiltration
- **Severity:** MEDIUM / PRIVACY CONFORMANCE
- **Evidence:**
  - `src/features/classes/BatchOutreachPanel.jsx:77-84`:
    ```javascript
    const handleCopyPhones = () => {
      const phones = recipients.map(r => r.parentPhone).filter(Boolean).join('\n');
      navigator.clipboard.writeText(phones);
      toast.success('Parent phone numbers copied to clipboard');
    };
    ```
- **Why It Matters:** Allows copying dozens of unencrypted parent phone numbers to the operating system clipboard in a single click with no role restriction or audit trail. On shared reception desks, clipboard data persists and can be pasted into unauthorized applications.
- **Recommended Direction:**
  - Restrict `BatchOutreachPanel` actions to authorized roles (`isOrgExecutive`, `manager`, `frontoffice`, `marketing`). Ensure clear user warnings.
- **Owner Decision Required:** No (Policy alignment with Blueprint §19).
- **Blocking Status:** Before completion of Slice 4 remediation.

#### Finding 7: Internal Cashier Operational Notes Leaked on Digital Receipts & WhatsApp Messages (`DOM04-PRIV-01`)
- **Classification:** Privacy Conformance / Information Disclosure
- **Severity:** LOW
- **Evidence:**
  - `src/features/finance/receiptMessages.js:70`:
    ```javascript
    rcp.notes ? `*Notes:* ${rcp.notes}\n` : ''
    ```
  - `src/features/finance/DigitalReceiptTab.jsx:85-89`: renders `rcp.notes` under public customer payment details.
- **Why It Matters:** Cashiers frequently use `notes` to record internal operational remarks (e.g., "Cash discrepancy reconciled with Ops Lead", "Special discount granted per manager WhatsApp conversation"). Printing this directly on customer-facing digital receipts and WhatsApp messages exposes internal administrative notes to customers.
- **Recommended Direction:**
  - Distinguish between internal operational notes and customer-facing remarks, or exclude `notes` from public WhatsApp receipts unless explicitly flagged as customer notes.
- **Owner Decision Required:** Yes (`OD-EXP-1`: Should cashier payment notes appear on customer receipts or remain internal-only?).
- **Blocking Status:** Owner decision required.

#### Finding 8: Orphaned / Dead `printTable.js` Utility (`DOM11-TECH-02`)
- **Classification:** Technical Debt / Maintenance
- **Severity:** INFO
- **Evidence:**
  - `src/features/shared/printTable.js`: exports `printTable(...)`.
  - `src/features/shared/index.js:44`: re-exports `printTable`.
  - Codebase search reveals 0 active callers in `src/`.
- **Why It Matters:** Dead code creates confusion during maintenance and audits.
- **Recommended Direction:**
  - Either wire `printTable` into table views desiring clean window print stylesheets, or deprecate/remove the file.
- **Owner Decision Required:** No (Routine engineering hygiene).
- **Blocking Status:** Defer / Non-blocking.

---

### 7.5 Segregation of Owner Policy Decisions vs Implementation Defects

#### Implementation Defects (Fix directly via approved code/rule remediation):
1. **`DOM11-PRIV-01`:** Gate `Export CSV Dataset` in `ReportsDashboard.jsx:91` to leadership roles (`isExecutive`, `manager`, `opslead`, `frontoffice`), hiding it from `instructor`.
2. **`DOM11-GOV-05`:** Strip `isActualAdmin` from `canAccessProvinceScope` in `ReportsDashboard.jsx:27`.
3. **`DOM04-CSV-01` / `DOM11-CSV-01`:** Fix `exportFinancialCSV` in `FinancialReportsTab.jsx:103` to negate reversal amounts (`-p.amount`) and exclude/zero voided rows.
4. **`DOM05-UX-03`:** Decouple CSV export button in `StudentRoster.jsx:533` from `readOnly`, allowing Vice Director to download rosters.
5. **`DOM05-PRIV-03`:** Hide "View / Print ID Badge" in `StudentRosterTable.jsx` and `InstructorClasses.jsx` for teaching `instructor` role.
6. **`DOM06-PRIV-01`:** Restrict `BatchOutreachPanel.jsx` clipboard export to authorized operational roles.
7. **`DOM11-TECH-02`:** Deprecate or remove unused `printTable.js`.

#### Owner Policy Decisions Required:
1. **Owner Decision OD-EXP-1 (Cashier Notes Disclosure on Customer Receipts):**
   - *Question:* Should internal cashier notes (`payment.notes`) be printed on customer digital receipts and sent via WhatsApp, or kept strictly internal?
   - *Option A (Ratified by Owner Kifry 2026-10-16):* Internal Only: Suppress `payment.notes` from customer digital receipts and WhatsApp messages. Notes remain visible to managers and executives in payment history.
   - *Option B:* Dual Field: Introduce `customerNote` for receipt display, keeping `notes` strictly for internal cashier/audit remarks.
   - *Option C:* Unchanged: Retain current behavior where `payment.notes` is printed on customer receipts.

---

### 7.6 Phase 5 Remediation Execution & Post-Fix Evidence (2026-10-16)

Following Owner Kifry's ratification of `OD-EXP-1` Option A and authorization to execute Phase 5 Remediation under `docs/plans/active/2026-10-16-blrca-slice4-exports-and-prints-remediation.md`, all bounded fixes were implemented and verified:

1. **`DOM04-CSV-01` / `DOM11-CSV-01` (Financial CSV Netting & Void Integrity):**
   - Implemented `computeFinancialExportRows(payments)` in `src/features/reports/reportsUtils.js`.
   - Adheres to the exact `summarizePaymentsByMethod` netting logic from `financeUtils.js`: pre-collects `voidedIds`, outputs `netAmount = 0` for voided rows and matching in-window reversals so spreadsheet `=SUM(Amount)` strictly matches the on-screen grand total without double subtraction.
   - Preserves `Original / Gross Amount (IDR)` column for audit trail.
   - Tested in `src/features/reports/tabs/FinancialReportsTab.test.js` (5 unit tests pass).
   - Status: `PENDING_INDEPENDENT_VERIFICATION` (Tier 1 per AGENTS.md).

2. **`DOM11-PRIV-01` & `DOM11-GOV-05` (Institutional Reports CSV Gating & Admin Scope Decoupling):**
   - In `InstructorLeaderDashboard.jsx:264`, passed `isInstructorLeader={true}` to `<ReportsDashboard />`.
   - In `ReportsDashboard.jsx:27`, decoupled `canAccessProvinceScope` to `isExecutiveView || isInstructorLeader`, stripping `isActualAdmin`.
   - In `ReportsDashboard.jsx:29, 93-99`, gated `handleExportCSV` and `Export CSV Dataset` button behind `canExportReports = isExecutiveView || isManager || isFrontOffice || isInstructorLeader;`, blocking teaching instructors.
   - Tested in `src/features/reports/ReportsDashboard.test.js` (5 unit tests pass).
   - Status: `DOM11-PRIV-01`: `PENDING_INDEPENDENT_VERIFICATION` (Tier 1); `DOM11-GOV-05`: `CLOSED`.

3. **`DOM05-UX-03` & `DOM05-PRIV-03` (Executive Roster Export & ID Badge Printing Gating):**
   - In `StudentRoster.jsx:533-541`, decoupled CSV export from `!readOnly` to `canExportRoster = userRole !== "instructor" && userRole !== "admin" && !isAdmin;`, restoring Vice Director roster export capability while preserving teaching instructor block.
   - In `InstructorClasses.jsx:286`, removed `BadgeModal` and `selectedStudent` state.
   - In `StudentRoster.jsx`, passed `onBadgeClick={userRole === 'instructor' ? null : setSelectedStudent}`.
   - In `StudentRosterTable.jsx:453` and mobile list, suppressed "View / Print ID Badge" button when `onBadgeClick` is null.
   - Tested in `src/features/students/StudentRosterTable.test.js` (2 unit tests pass; 11 total pass).
   - Status: `DOM05-UX-03`: `CLOSED`; `DOM05-PRIV-03`: `CLOSED`.

4. **`DOM06-PRIV-01` (Bulk Parent Phone Number Clipboard Copy):**
   - In `ClassManager.jsx`, gated `onOutreach` behind `canPerformOutreach = isExecutive || isManager || isOpsLead || isFrontOffice || isMarketing;` and passed `role={role}` to `<BatchOutreachPanel />`.
   - In `BatchOutreachPanel.jsx:77-84`, disabled `handleCopyAll` and conditionally hid "Copy All Numbers" button for non-operational roles `instructor` and `admin`.
   - Status: `CLOSED`.

5. **`DOM04-PRIV-01` (Cashier Notes Disclosure on Customer Receipts — OD-EXP-1 Option A):**
   - In `DigitalReceiptTab.jsx:85-89`, removed customer-facing cashier `notes` display block.
   - In `receiptMessages.js:70`, removed `notes` line from `buildWhatsAppReceiptMessage`.
   - Tested in `src/features/finance/receiptMessages.test.js` (27 unit tests pass).
   - Status: `CLOSED`.

6. **`DOM11-TECH-02` (Retain Shared `printTable.js`):**
   - Retained `src/features/shared/printTable.js` intact per `AGENTS.md` Line 300 and `src/features/shared/index.js:44`.
   - Status: `INFO / CLOSED (Retained per AGENTS.md shared utility reference)`.

7. **Verification Gate Results:**
   - Vitest suite: 107 test files passed, 0 failed (1,458 tests passed, 139 emulator tests skipped).
   - Firestore security rules matrix: 5 test files passed (174 tests passed).
   - TypeScript check (`npm run typecheck`): 0 errors.
   - ESLint (`npm run lint`): 0 errors.
   - Vite build (`npm run build`): Clean production bundle generated in 677ms.

