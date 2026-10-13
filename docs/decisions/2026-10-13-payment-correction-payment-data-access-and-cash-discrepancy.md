# Owner Decision Record: Payment Correction, Payment-Data Access and Small Cash Discrepancies

**Document Path:** `docs/decisions/2026-10-13-payment-correction-payment-data-access-and-cash-discrepancy.md`  
**Accepted Date:** 2026-10-13  
**Status:** **Active (Ratified by Owner / Director Kifry)**  
**Authority Level:** Binding Technical & Operational Policy (`decisions/`)  
**Origin:** Domain 4 Deep Conformance Audit (`L2-DOM04-2026-10-13-V2`) and Independent Advisor Review  
**Applicability:** All Branches (`kota_gorontalo`, `bone_bolango`, `limboto`, `pohuwato`) and All Divisions  

---

## Executive Summary

This Owner Decision establishes authoritative operational policy and technical enforcement across four critical financial control domains:
1. **OD-1: Payment Correction & Void Workflow** — Immutable original receipts with atomic reversal records approved by Executive dual-control.
2. **OD-2: Payment Data Access Boundaries** — Removal of technical Admin from payment business operations; strict immutability of financial records.
3. **OD-3: Installments, Partial Payments, and Fee Discounts** — Separation of partial payments from discounts, complete with four ratified operational parameters.
4. **OD-4: Cash Discrepancy Materiality Routing (< Rp 20.000)** — Lean satellite routing to Course Division Manager and escalation fallbacks.

---

## OD-1: Correcting or Voiding a Payment

1. **Immutability of Recorded Payments:** A recorded payment document is strictly immutable regarding its financial and auditing core fields:
   - `amount`, `studentId`, `method`, `recordedAt`, `recordedBy`, `branchId`, `division`, `receiptNumber`, `idempotencyKey`, `planId`, `planMonths`, `coverageStart`, `coverageEnd`, `baseRate`, `discountAmount`.
   - No role (including System Admin, Director, or Vice Director) may directly edit, alter, or overwrite these fields on an existing payment record.
2. **Reversal via Linked Record:** A payment correction or void is always executed as a **new, linked transaction record** that:
   - References the original payment ID and receipt number (`originalReceiptNumber`, `originalPaymentId`).
   - Carries an explicit, required operational reason and maker notes.
   - Originates from Front Office staff (maker).
3. **Approval Authority:**
   - **Director or Vice Director** approves every payment correction or void, regardless of the nominal amount.
   - No monetary threshold or local managerial bypass is permitted.
4. **Atomic State Synchronization:**
   - Upon executive approval, the student's payment status, coverage period dates (`coverageStart`, `coverageEnd`), and outstanding balances are updated in the same atomic batch write.
   - Financial reports show both the original receipt and its reversing credit/debit entry, preserving an unbroken historical ledger.
5. **Comprehensive Audit Trail:**
   - The system records who initiated the correction, the exact fields modified, the business justification, the deciding executive, the timestamp, and the before/after student coverage state (§18).
6. **Interim Stance:** Until the automated reversal workflow UI is deployed, original payment documents remain frozen. Any urgent correction requests are logged in writing and queued for executive authorization.
7. **Governance Effect:**
   - A new dual-control gated action `PAYMENT_CORRECTION_OR_VOID` is added to the Authoritative Blueprint §26 G-006 registry.
   - Permitted approvers in G-007 are `director` and `vice_director`.
   - The total number of ratified gated actions expands from 13 to 14.

---

## OD-2: Who May Touch Payment Data

| Role | Create Payment | Update Payment | Read Payments |
|---|---|---|---|
| **System Admin (`admin`)** | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden (Pending Phase 2 cleanup) |
| **Director, Vice Director** | ❌ Forbidden | ❌ Forbidden (Reversals via OD-1) | ✅ Full Access (All branches & divisions) |
| **Front Office (`frontoffice`, `opslead`)** | ✅ Allowed (Own branch & division) | ⚠️ Restricted Fields Only (`notes`, `approvalStatus`, `referenceNumber`, `updatedAt`) | ✅ Allowed (Own branch & division) |
| **Division Manager (`manager`)** | ❌ Forbidden | ❌ Forbidden | ✅ Allowed (Own branch & division) |
| **Student / Parent** | ❌ Forbidden | ❌ Forbidden | ✅ Allowed (Own record / linked child only) |

### Rationale
- **Blueprint Principle 3 & §7 (G-002):** System Admin is technical infrastructure authority and carries zero business operational authority. Technical access must never be used to record, manipulate, or delete student payments.
- **Blueprint Principle 5 & §18 (Maker-Checker Separation):** Executives who approve discounts, fee waivers, refunds, and voids cannot act as cashiers recording payments. Front Office is the sole maker role for desk cashier transactions.
- **Preconditions & Verification:**
  1. The Owner/Director's daily operational account is seeded as `director` (not `admin`).
  2. Financial and operational dashboards for Director render all branch payments properly.
  3. Direct Admin cashier buttons in UI components are removed or routed through Front Office credentials.

---

## OD-3: Discounts, Partial Payments, and Installments

### 1. Distinction Between Partial Payments and Discounts
- **Partial Payment (Installment):** A student pays part of their standard tuition. The total tuition owed for the term is **unchanged**. It records:
  - `amountPaid`: Amount received in this transaction.
  - `totalAgreedAmount`: Full agreed tuition for the period.
  - `outstandingBalance`: Remaining balance owed (`totalAgreedAmount - sum(payments)`).
  - `nextDueDate`: Explicit due date for the remaining balance.
  - **Approval Requirement:** Standard installments require **no executive approval ticket**, because the academy's gross revenue is not discounted.
- **Fee Discount:** The total tuition owed is reduced below standard rates (e.g., promotional discount, financial hardship waiver, executive courtesy).
  - **Approval Requirement:** Any reduction of the total receivable amount is a discount and **strictly requires** executive approval via `DISCOUNT_OR_REFUND` (Director or Vice Director dual-control ticket).
- **Cashier Input Policy:** A cashier typing an amount below the expected tuition must designate either:
  1. An **Installment Payment** (recording the installment sequence, outstanding balance, and due date); OR
  2. A **Discounted Payment** (submitting a `DISCOUNT_OR_REFUND` approval envelope).
  A bare lower amount without either categorization is rejected.

### 2. Ratified Operational Parameters (Owner Decisions)
1. **Coverage Extension (Q1):**
   - A partial payment extends student coverage immediately for the term.
   - The student's account is flagged with `paymentStatus: "partially_paid"` and displays the outstanding balance badge on front office rosters.
2. **Installment Limits & Due Dates (Q2):**
   - **Monthly Plans:** Maximum of **2 installments** per monthly billing cycle.
   - **Multi-Month Plans (Quarterly, Semi-Annual, Annual):** Maximum of **3 installments** per plan cycle.
   - **Latest Due Date:** The final installment must be scheduled and paid **before the expiration** of the current coverage period.
3. **Overdue Balances (Q3):**
   - When an installment passes its due date without settlement, the system generates a **reminder alert** (front office cashier badge and optional WhatsApp notification template).
   - No punitive student lockout or automatic class suspension occurs without explicit operational follow-up.
4. **Approval Routing for Installments (Q4):**
   - Front Office records agreed standard installment schedules at the desk without executive pre-approval, provided cumulative payments sum to full tuition.
   - Any agreement that waives any portion of the tuition must route to the Director or Vice Director via `DISCOUNT_OR_REFUND`.

---

## OD-4: Cash Discrepancies Under Rp 20.000

Tiers of Rp 20.000 and above remain unchanged from Blueprint v3.3 §26 (G-009):
- **Rp 20.000 – Rp 49.999:** Vice Director.
- **≥ Rp 50.000:** Director (Vice Director acts as Acting Director only when Director is on approved leave).

For discrepancies **strictly under Rp 20.000**, branch typology routing applies:
1. **Main Campus (`kota_gorontalo`):**
   - Operational Leader (`ops_lead`) approves.
   - **Fallback & Self-Approval Prevention:** If the Ops Lead is the drawer handler, absent, on leave, or vacant, the ticket escalates to the **Vice Director**.
2. **Lean Satellites (`bone_bolango`, `limboto`, `pohuwato` per Blueprint v3.4 & G-012):**
   - **Course Division Manager (`manager`)** approves, fulfilling on-site daily operational oversight.
   - **Fallback & Self-Approval Prevention:** If the Course Division Manager is the drawer handler, absent, or vacant, the ticket escalates to the **Vice Director or Director**.
3. **Universal Prohibitions:**
   - **System Admin is never an approver** for cash discrepancies at any branch.
   - **Self-Approval is strictly blocked:** The staff member who balanced or handled the cash drawer can never approve their own reconciliation ticket under any circumstance.
   - Main Campus Division Managers gain **no** cash discrepancy approval authority; Main Campus shift oversight remains with the Operational Leader.

---

## Supersession and Consistency Notes

- **Blueprint v3.3 / v3.4 §26:**
  - G-009 is clarified and refined with explicit branch-typology routing and drawer-handler fallback logic.
  - G-006 / G-007 gain `PAYMENT_CORRECTION_OR_VOID` (Action #14).
  - G-012 branch satellite operational scope is directly linked to cash reconciliation approvals.
- **Audit Findings Closed:**
  - `DOM04-SEC-02` (Admin write bypass & lack of diff check on payment update).
  - `DOM04-GOV-02` (Deadlock on cash discrepancy < Rp 20k at lean satellites).
  - `DOM04-FIN-01` (Manual lower amount bypassing discount dual-control envelope).
  - `DOM04-COR-02` (Missing division on discount approval tickets).
