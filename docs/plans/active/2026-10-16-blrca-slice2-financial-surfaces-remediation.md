# Active Proposal & Plan: BLRCA Slice 2 — Financial Surfaces Remediation

> **Date:** 2026-10-16  
> **Campaign:** Role & Business Logic Conformance Audit (BLRCA) — Level 2  
> **Target:** Slice 2 (Financial Surfaces Across Roles)  
> **Status:** `PROPOSED — PENDING OWNER AUTHORIZATION`  
> **Governing Authorities:** Blueprint v3.4 (§7, §18, §26 G-009, G-012); Owner Decisions OD-1, OD-2, OD-3, OD-4.  

---

## 1. Scope & Objective

Remediate the six confirmed findings and architectural gaps identified during the **BLRCA Slice 2 Financial Surfaces Audit** ([`docs/audits/current/role-business-logic-conformance-audit.md`](../../audits/current/role-business-logic-conformance-audit.md)):

1. **`DOM04-GOV-03` (High — Maker-Checker Collapse in Rules):**
   Remove `(isDirector() || isViceDirector())` from `allow create` and `allow update` on `/payments` in `firestore.rules`. Enforce OD-2 maker restrictions: Front Office (and satellite Course Division Manager desk fallback per G-012) only.
2. **`DOM04-SEC-02` (High — Unverified Direct Payment `approvalStatus` Write):**
   In `firestore.rules`, guard transitions of `approvalStatus` to `"approved"` so client callers cannot bypass the dual-control envelope execution.
3. **`DOM04-GOV-04` (High — Unchecked Student Coverage on Rejected Discount):**
   Fix revenue leak where `ApprovalInbox.jsx` reject action marks payment rejected but fails to revert student `paymentStatus` to `"pending"` or reset `paidUntil`, allowing students to permanently retain unapproved discount coverage.
4. **`DOM04-GOV-05` (High / Gap — Missing Ratified `PAYMENT_CORRECTION_OR_VOID` Workflow):**
   Implement the ratified OD-1/OD-3 two-step dual-control payment void and correction workflow (Blueprint §26 G-006 Action #14), including envelope constants, schemas, cashier UI request trigger, and downstream atomic reversal execution.
5. **`DOM04-GOV-06` (Medium / Gap — OD-3 Partial Payments & Installment Schedules):**
   Add explicit installment schedule handling in `PaymentModal.jsx` and `paymentSchema.js` so partial tuition payments do not trigger erroneous `DISCOUNT_OR_REFUND` tickets when total agreed amount equals standard pricing.
6. **`DOM04-GOV-07` (Medium / Drift — Shift Cash Discrepancy Static Threshold Inconsistency):**
   Align `DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR` in `shiftsRepository.js` from `25000` to `10000` (capped below the Rp 20.000 Vice Director tier) so discrepancies between Rp 20.000 and 25.000 cannot silently close at the front desk without Vice Director review.

---

## 2. Likely Files Involved

### Security Rules & Backend Contracts
- `firestore.rules` (Payment create/update rules, approver checks)
- `src/features/shared/securityRulesMatrix/` (Unit test assertions for payments rules)
- `src/features/shared/firestoreRulesEmulator/finance.emulator.test.js`

### Dual-Control Gates & Approvals
- `src/features/shared/approvalGates.constants.js` (Add `PAYMENT_CORRECTION_OR_VOID` Action #14)
- `src/features/shared/approvalGates.js` (Threshold resolution & approver routing)
- `src/features/shared/ApprovalInbox.jsx` (Reversal execution and discount rejection coverage rollback)
- `src/features/shared/approvalGates.test.js`

### Finance Repository, Modals & Schemas
- `src/schemas/paymentSchema.js` (Add `originalPaymentId`, `reversalOfPaymentId`, `voidReason`, installment fields)
- `src/features/finance/paymentsRepository.js` (Add void request, reversal record, rollback student coverage)
- `src/features/finance/paymentsRepository.test.js`
- `src/features/finance/PaymentModal.jsx` (Installment toggle; link to pending approval state)
- `src/features/finance/PaymentHistoryTab.jsx` (Add "Request Void / Correction" button)
- `src/features/attendance/shiftsRepository.js` (Adjust default threshold to Rp 10.000)
- `src/features/attendance/shiftsRepository.test.js`

### Master Audit Registries
- `docs/audits/current/bug-ledger.md`
- `docs/audits/current/role-business-logic-conformance-audit.md`
- `docs/audits/current/role-function-conformance-ledger.md`
- `docs/audits/current/regression-log.md`
- `docs/audits/audit-log.md`

---

## 3. Detailed Remediation Plan by Finding

### Phase 1: High-Risk Security & Governance Rules (`DOM04-GOV-03` & `DOM04-SEC-02`)
- **`firestore.rules` `/payments` adjustments:**
  - Remove `(isDirector() || isViceDirector())` from `allow create` (line 1010) and `allow update` (line 1017).
  - Restrict `allow create` strictly to:
    ```javascript
    allow create: if isFrontOffice()
      && isSameBranch(request.resource.data)
      && request.resource.data.studentId is string
      && request.resource.data.amount is number
      && request.resource.data.amount > 0;
    ```
  - For `allow update` on `/payments`, enforce that transitions to `approvalStatus == 'approved'` or `approvalStatus == 'rejected'` can only be performed by authorized checkers matching a valid approval envelope, or restrict client updates to notes and non-privileged fields while routing financial state changes through sealed approvals.
  - *MANDATORY RULE:* Delegate authoring/modifying `firestore.rules` to the `firestore-rules-author` subagent per user rules.

### Phase 2: Discount Rejection Coverage Rollback & Threshold Realignment (`DOM04-GOV-04` & `DOM04-GOV-07`)
- **Discount Rejection Downstream Handler (`ApprovalInbox.jsx`):**
  - Update `ApprovalInbox.jsx` line 387: When `actionId === "DISCOUNT_OR_REFUND"` is rejected:
    1. Call `paymentsRepository.revertDiscountCoverage(paymentId, studentId)`.
    2. Reset `users/{studentId}.paymentStatus` to `"pending"`.
    3. Revert `users/{studentId}.paidUntil` to pre-payment expiration date (or calculate prorated coverage based on actual cash received).
    4. Set `payment.approvalStatus = "rejected"` and `payment.notes = notes + " (Discount rejected by executive)"`.
- **Shift Cash Discrepancy Threshold (`shiftsRepository.js`):**
  - In `shiftsRepository.js:24`: change `DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR = 25000` to `DEFAULT_CASH_DISCREPANCY_THRESHOLD_IDR = 10000`.
  - Ensure that `calculateCashDiscrepancyThreshold()` never returns a value $\ge 20000$, ensuring strict alignment with OD-4 (§OD-4: Any discrepancy $\ge$ Rp 20.000 must route to Vice Director).

### Phase 3: OD-3 Payment Corrections, Void Reversals & Installments (`DOM04-GOV-05` & `DOM04-GOV-06`)
- **Register `PAYMENT_CORRECTION_OR_VOID`:**
  - In `approvalGates.constants.js`:
    ```javascript
    PAYMENT_CORRECTION_OR_VOID: Object.freeze({
      id: "PAYMENT_CORRECTION_OR_VOID",
      label: "Payment Correction / Void Reversal",
      approverRole: APPROVAL_ROLES.VICE_DIRECTOR,
      primaryController: APPROVAL_ROLES.VICE_DIRECTOR,
      eligibleApproverRoles: Object.freeze([APPROVAL_ROLES.VICE_DIRECTOR, APPROVAL_ROLES.DIRECTOR]),
      mode: APPROVAL_MODES.BLOCKING,
      domain: "finance",
      requiredScope: SCOPE_LEVELS.PROVINCE_WIDE,
      controlLevel: CONTROL_LEVELS.L2,
      escalationTarget: APPROVAL_ROLES.DIRECTOR, // > Rp 500.000 routes to Director per OD-1/OD-3
      separationRequired: true,
    }),
    ```
- **Downstream Reversal Execution (`ApprovalInbox.jsx` & `paymentsRepository.js`):**
  - When approved: write an offsetting negative payment document (`amount: -originalAmount`, `reversalOf: originalPaymentId`, `type: "reversal"`), mark original payment as `status: "voided"`, and adjust student `paidUntil` accordingly.
- **Installment Schedule Architecture (`PaymentModal.jsx` & `paymentSchema.js`):**
  - Add `isInstallment: boolean`, `installmentIndex: number`, `totalAgreedAmount: number`, `outstandingBalance: number`, `nextDueDate: string`.
  - When cashier checks "Installment Plan" and `enteredAmount < fullPrice`, do not trigger `DISCOUNT_OR_REFUND` if cumulative scheduled payments equal full price. Set student `paymentStatus: "partially_paid"`.

---

## 4. Risks & Free-Tier Cost Check

- **Free-Tier Spark Budget ($0 Cost):**
  - Zero new infrastructure, zero external services, zero paid APIs.
  - All test verification executes locally using Vitest, in-memory fakes, and local Firebase Firestore emulator.
- **AST Expression Limit in `firestore.rules`:**
  - Restricting `/payments` create and update removes Director/Vice Director checks, slightly reducing the expression count.
- **Operational Continuity:**
  - Front Office cashiers retain uninterrupted capability to record payments, issue receipts, and close shifts.
  - Existing completed payments remain completely unaffected (read-only immutable audit trail).

---

## 5. Verification Plan

1. **Targeted Unit Tests:**
   - Run `npx vitest run src/features/finance/paymentsRepository.test.js`
   - Run `npx vitest run src/features/shared/approvalGates.test.js`
   - Run `npx vitest run src/features/attendance/shiftsRepository.test.js`
2. **Security Rules Matrix & Emulator:**
   - Run `npx vitest run src/features/shared/securityRulesMatrix/`
   - Run `npm run test:rules` (local Firestore emulator test suite)
3. **Static Checking & Build:**
   - Run `npm run typecheck` (`tsc --noEmit`)
   - Run `npm run lint` (`eslint .`)
   - Run `npm run build` (Vite production bundle verification)
4. **Audit Registries Update:**
   - Update `bug-ledger.md` (transition findings from `OPEN` to `CLOSED`).
   - Update `role-function-conformance-ledger.md` (transition Slice 2 rows from `FAIL` to `PASS`).
   - Append Level 1 regression check entry to `regression-log.md`.

---

## 6. Required Owner Authorizations & Decisions

Before executing the implementation phase, Owner Kifry is asked to confirm:

1. **Authorization to Execute Slice 2 Remediation:**
   - Approve proceeding with implementation of Phase 1 through Phase 3 code changes per this plan.
2. **Owner Decision on Policy Questions:**
   - **OGQ-FIN-01:** Confirm shift cash drawer desk tolerance of **Rp 10.000** (below which differences are logged in shift notes without an escalation ticket; any discrepancy $\ge$ Rp 20.000 unconditionally escalates to Vice Director).
   - **OGQ-FIN-02:** Confirm policy on discount rejection: student enrollment status reverts to `"pending"` with an outstanding balance alert on the front desk dashboard.
