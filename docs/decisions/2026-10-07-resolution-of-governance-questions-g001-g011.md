# Formal Owner Decision: Resolution of Governance Questions (G-001 through G-011)

> **Document Type:** Binding Architectural & Operational Policy  
> **Accepted Date:** 2026-10-07  
> **Authority:** Ratified & Approved by Owner / Director (Kifry)  
> **Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (Blueprint v3.3, Section 26)  
> **Status:** Active & Binding  

---

## 1. Context & Executive Summary

The MyLiberty Authoritative Blueprint v3.1–v3.3 removed the former single-manager physical branch head layer and established a four-function peer branch leadership model and an Executive Dual-Control baseline. Section 26 of the blueprint maintained an explicit Owner Decision Register (G-001 through G-011) representing fundamental organizational, reporting, financial, and authority questions intentionally withheld from technical inference.

On **2026-10-07**, the Owner / Director (Kifry) formally reviewed, ratified, and resolved all 11 governance questions. This document codifies those decisions into binding organizational policy and establishes their technical enforcement contracts.

---

## 2. Binding Governance Decisions

### G-001: Blueprint Amendment Authority
* **Decision:** The **Owner / Director (Kifry)** holds sole sovereign constitutional authority to approve, amend, and ratify the Authoritative Governance Blueprint.
* **Binding Rule:** No technical System Admin, AI assistant, or operational delegate may alter the organizational blueprint without explicit owner instruction.

### G-002: System Admin Appointment, Revocation & Oversight
* **Decision:** Appointed and revoked exclusively by the **Director**.
* **Oversight:** Dual-executive visibility (Director & Vice Director). System Admin commands and data mutations generate immutable audit logs.
* **Strict Constraint:** System Admin is strictly technical maintenance (infrastructure, terminal provisioning, user credential initialization) with **zero business or operational approval authority** (Blueprint §7). Admin cannot approve discounts, refunds, or staff leaves, and cannot bypass dual-control workflows.

### G-003: Reporting Line of the Instructor Leader
* **Decision:** The Instructor Leader reports upward to **Executive Leadership**:
  * **Vice Director (Operational Control):** Day-to-day instructor scheduling, class coverage, shift adherence, and substitute assignments.
  * **Director (Strategic Control):** Pedagogical curriculum standards, placement testing criteria, and academic excellence.
* **Subordinate Line:** All branch Instructors report directly to the Instructor Leader.

### G-004: Division of Authority between Director and Vice Director (Executive Dual-Control)
* **Decision:** Executive Dual-Control model is formally ratified:
  * **Director — Strategic Control:** Strategic direction, school expansion, academic standards, tuition pricing policies, staff role elevation/deactivation, and final executive authority.
  * **Vice Director — Operational Control:** Day-to-day execution, multi-branch operational coordination, operational exception follow-up, cross-branch issue resolution, and delegated executive approvals.
  * **Operational Principle:** Complementary leadership domains; dual-control does **not** mean universal joint-sign (which would create deadlock) and does not mean automatic interchangeable substitution.

### G-005: Real-World Kindergarten Organizational Roles
* **Decision:** The Kindergarten educational stream consists of:
  * **Kindergarten Division Manager (`manager` + `division: "kindergarten"`):** Academic and operational head of the early childhood program.
  * **Kindergarten Instructors (`instructor` + `division: "kindergarten"`):** Early childhood educators.
  * **Kindergarten Students (`student` + `division: "kindergarten"`) & Parents (`parent`):** Enrolled learners and guardians.
  * **Shared Operational Staff:** Front Office and Office Boy serve the kindergarten stream either via explicit cross-divisional appointment (`division: "all"`) or campus facility scope (`division: null`).

### G-006 & G-007: Sensitive Actions Classification & Authorized Approvers
* **Decision:** The 13 Dual-Control Gated Actions are formally classified and assigned controllers:

| Action ID | Level | Domain | Primary Approver | Fallback / Escalation |
|---|---|---|---|---|
| `STAFF_ROLE_ELEVATION` | L3 | Staff | `director` | None (Strict Director sign) |
| `STAFF_DEACTIVATION` | L3 | Staff | `director` | None (Strict Director sign) |
| `NEW_STAFF_ACCOUNT` | L2 | Staff | `director` | `vice_director` |
| `DISCOUNT_OR_REFUND` | L2 | Finance | `director` | `vice_director` |
| `TUITION_PLAN_CHANGE` | L1 | Finance | `manager` (Div Mgr) | `vice_director` |
| `STUDENT_WITHDRAWAL_OR_FREEZE` | L1 | Students | `manager` (Div Mgr) | `vice_director` |
| `PLACEMENT_LEVEL_OVERRIDE` | L1 | Students | `instructorleader` | `vice_director` |
| `SUBSTITUTE_INSTRUCTOR` | L1 | Staff | `instructorleader` | `vice_director` |
| `CLASS_CANCELLATION_OR_RESCHEDULE` | L1 | Classes | `opslead` / `frontoffice` | `vice_director` |
| `RETROACTIVE_STUDENT_ATTENDANCE` | L1 | Attendance | `opslead` / `frontoffice` | `vice_director` |
| `STUDENT_CLASS_TRANSFER` | L1 | Classes | `opslead` / `frontoffice` | `vice_director` |
| `STAFF_SHIFT_SELF_CORRECTION` | L1 | Attendance | Dynamic hierarchy | Subordinate $\rightarrow$ Lead; Lead $\rightarrow$ Director; Execs review each other |
| `CASH_DISCREPANCY` | Tiered | Finance | Materiality tier | < 20k: `opslead`; 20k–49.999k: `vice_director`; $\ge$ 50k: `director` |
| `STAFF_STATUS_CHANGE` | Dynamic | Staff | Domain superior | Subordinate $\rightarrow$ Lead; Peers $\rightarrow$ `vice_director`/`director`; Execs review each other |

### G-008: Limited-Staff, Absence & Acting Director Procedure
* **Decision:**
  1. **Acting Director Delegation:** Vice Director acts as Acting Director **exclusively** while Director has active, approved leave status. Strictly excludes role elevations, executive authority modification, and self-actions. Delegate cannot act as second signer if already signed as Vice Director.
  2. **Absence Escalation Chain:** If an approver is on leave, the request escalates to the executive layer. Peer leaders never cover peer leaders.
  3. **Both Executives Away (Status Records Only):** If both Director and Vice Director are simultaneously unavailable, an executive's status record falls back in order: Course Div Manager $\rightarrow$ Kindergarten Div Manager $\rightarrow$ Ops Lead $\rightarrow$ Instructor Leader. High-level business gates wait; deadlock covered by console break-glass runbook.
  4. **Strict Integrity:** Never share accounts or create fake users to simulate separation of duties.

### G-009: Financial Boundaries & Tiered Cash Reconciliation
* **Decision:**
  1. **Routine Tuition Collection:** Front Office cashiers record payments directly without approval envelope.
  2. **Cash Discrepancy Escalation:**
     - `< Rp 20.000:` Approved by **Operational Leader** (`opslead`). Escalates to Vice Director if Ops Lead personally balanced drawer.
     - `Rp 20.000 – Rp 49.999:` Approved by **Vice Director** (`vice_director`).
     - `$\ge$ Rp 50.000:` Approved by **Director** (`director`) (or Vice Director as Acting Director if Director on approved leave).
     - **Separation of Duties:** Drawer handler cannot approve discrepancy (Maker $\ne$ Checker).
  3. **Discounts, Fee Waivers & Refunds:** Exclusively approved by Executive Leadership (`director`, `vice_director`).
  4. **Tuition Plan Structures:** Modified by Division Manager (`manager`).

### G-010: Preservation of Superseded Historical Decisions
* **Decision:** Historical decision documents under `docs/decisions/` are permanently preserved. Superseded decisions are tagged with `Status: SUPERSEDED BY ADR-XXX` / `Blueprint v3.3` with date, rationale, and link to the governing document.

### G-011: Branch Leadership Upward Accountability
* **Decision:** The four branch leadership roles (Course Division Manager, Kindergarten Division Manager, Operational Leader, Instructor Leader) are functional peers.
  - **Operational reporting, daily coordination, and shift coverage** report upward to the **Vice Director** (Operational Control).
  - **Academic standards, strategic planning, and major policy escalations** report upward to the **Director** (Strategic Control).

---

## 3. Supersession Notice
This decision formally supersedes the provisional status of:
- Former Branch Manager cash reconciliation notes in [`2026-10-05-delegation-of-discounts-and-refunds-to-executives.md`](./2026-10-05-delegation-of-discounts-and-refunds-to-executives.md) (superseded by G-009 tiered cash reconciliation).
- The open status of G-001 through G-011 in [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md#26-owner-decision-register--formally-ratified-resolutions-2026-10-07).
