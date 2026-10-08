# Decision: Delegation of Tuition Discounts, Fee Waivers, and Refunds to Executive Leadership

> **Decision ID:** G-009-DECISION-01  
> **Topic:** Financial Governance & Discount Authority Boundary  
> **Authority Level:** Binding Owner Policy (`docs/decisions/`)  
> **Approved By:** Kifry (Project Owner)  
> **Date:** 2026-10-05  
> **Governance Reference:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md §18, §26 (G-009)`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Status:** ACTIVE *(Points 1–3: exclusive executive discount, waiver, and refund authority)*  
> **Point 4 Status:** `SUPERSEDED BY G-009 — Blueprint v3.3 (2026-10-07)` *(former Branch Manager cash-drawer reconciliation retention removed from the organizational model; successor authority identified by materiality tier — see the Governance Amendment Notice below)*

> [!NOTE]
> **Governance Amendment Notice (2026-10-06 — Blueprint v3.1 §5.4; updated 2026-10-07 by G-009 ratification):**  
> Under Blueprint v3.1, the **Branch Manager role is removed from the organizational model**.  
> - **Points 1–3 (Executive Discount Authority) remain 100% active and binding.** Tuition discounts, fee waivers, promotional pricing, and refunds require Executive Director or Vice Director dual-control approval. Neither branch-level managers nor staff may approve discounts.  
> - **Point 4 is SUPERSEDED (2026-10-07).** The former Branch Manager retention of end-of-day cash drawer reconciliation (`CASH_DISCREPANCY`) was an open governance question under G-009 and has been **resolved by the Owner on 2026-10-07**. Authority now follows **materiality tiers**: `< Rp 20.000` → Operational Leader (`opslead`); `Rp 20.000 – Rp 49.999` → Vice Director (`vice_director`); `≥ Rp 50.000` → Director (`director`). The drawer handler cannot approve their own discrepancy (Maker ≠ Checker). Recorded in [`2026-10-07-resolution-of-governance-questions-g001-g011.md`](./2026-10-07-resolution-of-governance-questions-g001-g011.md) (§G-009) and Blueprint v3.3 §26 (G-009). No cash-reconciliation authority transfers to the Course Division Manager, Kindergarten Division Manager, or Instructor Leader.

---

## 1. Context & Business Problem

Tuition discounts, promotional fee waivers, and refunds directly affect gross academy revenue and operating margins. 

Under earlier provisional routing, fee discounts and refunds were routed to the local **Branch Manager**. However, this created two significant governance and operational risks:
1. **Local Pressure & Revenue Erosion:** Branch Managers, under pressure to hit student enrollment quotas, could offer excessive or uncoordinated discounts without cross-campus oversight.
2. **Lack of Outside Review:** When a discount was entered at the front desk and approved locally by the Branch Manager, the decision stayed entirely within one physical building.
3. **Price Disparity:** Students at different branches could receive inconsistent pricing for identical programs.

---

## 2. Binding Policy & Rule

1. **Exclusive Executive Authority for Discounts & Refunds:**  
   All student tuition discounts, fee waivers, promotional price reductions, and refunds (`DISCOUNT_OR_REFUND`) are strictly delegated to the **Executive Director** and **Vice Director**.
2. **Branch Managers Not Authorized for Discounts:**  
   Branch Managers do **not** possess unilateral authority to grant or sign off on tuition discounts or refunds.
3. **Dual-Control Enforcement:**  
   Discount requests submitted during payment logging at the front desk enter the **Executive Command Dual-Control Registry**. Either the Director or the Vice Director may approve the request, provided Maker-Checker rules are respected (requester cannot self-approve).
4. **Daily Cash Reconciliation Ownership (Formally Superseded by Owner Decision 2026-10-07 G-009):**  
   *(Historical text: Branch Managers retain operational authority over end-of-day cash drawer verification and cash reconciliation discrepancies (`CASH_DISCREPANCY`) for their physical branch.)*  
   **2026-10-07 Ratification:** Formally superseded by [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](./2026-10-07-resolution-of-governance-questions-g001-g011.md). Cash discrepancy ownership is now governed by materiality tiers: `< Rp 20.000` to Operational Leader (`opslead`), `Rp 20.000 – Rp 49.999` to Vice Director (`vice_director`), and `≥ Rp 50.000` to Director (`director`), with strict drawer handler exclusion.

---

## 3. Technical & System Impacts

1. **`src/features/shared/approvalGates.js`:**  
   The `DISCOUNT_OR_REFUND` gate is configured with `approverRole: APPROVAL_ROLES.DIRECTOR` (routing to `director` and `vice_director`).
2. **`firestore.rules`:**  
   The approvals collection rules require that tickets with `actionId == 'DISCOUNT_OR_REFUND'` have `approverRole in ['director', 'vice_director']` and can only be updated/approved by `isDirector() || isViceDirector()`.
3. **Dashboards:**  
   - `ExecutiveDashboard`: Displays pending discount and refund authorizations in the province-wide approvals queue.
   - `ManagerDashboard`: Relieved of discount approval duty; operates as Course Division Manager view. Cash-reconciliation discrepancy authority is **not** held by the Division Manager; per the ratified G-009 (2026-10-07) it follows materiality tiers — Operational Leader, Vice Director, or Director.
