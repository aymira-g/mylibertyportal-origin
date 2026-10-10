# Front Office Dashboard: Owner Decision Register (OD-FO)

> **Document Type:** Binding Owner Decision Register for Front Office Dashboard Conformance  
> **Audited By:** Coding / Executor Agent  
> **Companion Documents:** [`00-phase0-audit.md`](./00-phase0-audit.md), [`01-phase1-completion-report.md`](./01-phase1-completion-report.md)  
> **Date:** 2026-10-10  
> **Governing Baseline:** Authoritative Blueprint v3.3 (Ratified 2026-10-07)  
> **Status:** RATIFIED & BINDING — APPROVED BY OWNER (KIFRY) ON 2026-10-10  

---

## Authority & Governance Context

In accordance with `AGENTS.md` and the Authoritative Governance Blueprint hierarchy:
- An implementation agent **must never invent organizational rules or authority**.
- Where a governance decision has already been formally made by the Owner / Director (Kifry), the software must **faithfully implement that decision**.
- Where an open governance question exists, it must be **explicitly presented to the owner** rather than resolved by technical guess.

All decisions below were reviewed and ratified by the Owner (Kifry) on **2026-10-10**.

---

### OD-FO-1 (F-03): Approval Authority for Front-Desk Gates
- **Question:** Does the `frontoffice` role hold approval authority for `CLASS_CANCELLATION_OR_RESCHEDULE`, `RETROACTIVE_STUDENT_ATTENDANCE`, and `STUDENT_CLASS_TRANSFER` as Blueprint §26 G-007 line 1355 wrote (`opslead, frontoffice`), or does that authority belong exclusively to `opslead` as the codebase implements?
- **Ratified Decision:** **Option A (`opslead` Only)**
- **Ratification Date:** 2026-10-10
- **Governance Impact:**
  - The Front Office role is strictly **Reception and Cashiering** (operational maker, customer-facing, front-desk collection). Front desk staff hold **no gate approval authority**.
  - All three gates belong exclusively to the **Operational Leader (`opslead`)**.
  - Blueprint §26 G-007 textual reference to `frontoffice` is formally reconciled to `opslead`.
- **Implementation Status:**
  - Backend/Rules: `approvalGates.js` and `firestore.rules` already restrict approvers to `[OPS_LEAD]` / `opslead`.
  - Client: Retire the unreachable and dead "Approvals" tab (`FrontOfficeDashboard.jsx:457-473`) and stale `isLeader` checks (`FrontOfficeDashboard.jsx:358-366`) in Front Office dashboards (closing F-04 and F-08).

---

### OD-FO-2 (F-01): Hard Delete of Student/Parent Records
- **Question:** Should Front Office retain the ability to permanently delete student and parent user profiles directly from the client and Firestore rules, or should hard deletion be restricted to System Admin while operational student exit uses status changes / withdrawal workflows?
- **Ratified Decision:** **Remove Hard Delete from Front Office**
- **Ratification Date:** 2026-10-10
- **Governance Impact:**
  - Front Office staff must not hold unreviewed, permanent data destruction powers over student or parent profiles (Blueprint Principle 5 — Least Necessary Authority; Principle 6 — Separation of Duties).
  - Student departures, drops, or freezes belong under the gated `STUDENT_WITHDRAWAL_OR_FREEZE` workflow.
- **Implementation Status:**
  - **COMPLETED & VERIFIED in Phase 1** (commit pending).
  - Client: Removed `handleDelete` destructuring and prop from `FrontOfficeDashboard.jsx` and `KidsFrontOfficeDashboard.jsx`. Roster renders no delete control for front desk personnel.
  - Rules: the `users` delete clause (then at `firestore.rules:521`, now `:534`) replaced `isFrontDeskStaff()` with `isAdmin() && !(resource.data.role in ['director', 'vice_director', 'admin'])`.
  - Automated tests: 111 rules emulator tests passed. Front desk profile deletion denied; Admin non-executive deletion permitted.

---

### OD-FO-3 (F-11): Authoritative Level Changes vs Placement Level Overrides
- **Question:** Which student level mutations are authoritative educational progressions, and which are overrides subject to approval gating?
- **Ratified Decision:** **Clarified — Authoritative Academic Promotions vs Gated Placement Overrides**
- **Ratification Date:** 2026-10-10
- **Governance Impact:**
  - **Authoritative Academic Progression:** Legitimate level promotions awarded when a student passes an academic level (recorded via progress report evaluations by instructors) are authoritative and direct upon issuance. Front desk executing an instructor-approved promotion from the roster is an operational fulfillment of an academic decision.
  - **Placement Level Override:** When a walk-in inquiry or new student placement differs from the diagnostic test placement tier, it remains strictly gated behind the `PLACEMENT_LEVEL_OVERRIDE` approval gate owned by the Instructor Leader (`instructor_leader`). Front desk staff cannot unilaterally tamper with or bypass placement determinations.
- **Implementation Status:**
  - Roster promotion path remains operational for authorized progress reports.
  - Inquiry enrollment checks ensure pending placement overrides block direct enrollment.
