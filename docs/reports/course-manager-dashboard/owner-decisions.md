# Course Division Manager Dashboard: Governance & Decision Register

> **Document Type:** Governance Traceability & Decision Alignment  
> **Context:** Course Division Manager Dashboard Refinement  
> **Governing Baseline:** Blueprint v3.3 + Formal Owner Decisions G-001 through G-011 (2026-10-07)  
> **Status:** Phase 0 Review  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-07  

---

## 1. Purpose of this Document

In accordance with `AGENTS.md` and the governance authority rules:
- An implementation agent **must never invent organizational rules or authority**.
- Where a governance decision has already been formally made by the Owner / Director (Kifry), the software must **faithfully implement that decision**.
- Where a legacy pattern exists in code, it must be treated as a **reconciliation item**, not as authority.
- Where an open governance question exists, it must be **explicitly presented to the owner** rather than resolved by technical guess.

This document classifies every key aspect of the Course Division Manager's dashboard according to its governance status:
- **[ESTABLISHED & RATIFIED]:** Bound by Blueprint v3.3 and formal Owner Decisions of 2026-10-07. Ready for implementation.
- **[OBSERVED DRIFT]:** Existing code behavior that contradicts established governance and must be reconciled.
- **[PROPOSED UI REFINEMENT]:** Concrete user interface refinements designed to reflect established governance.
- **[OWNER DECISION REQUIRED]:** Questions where owner clarification is requested.

---

## 2. Classification Register

### 2.1 Role Identity & Organizational Scope
| Item | Classification | Details & Source |
|---|---|---|
| **Role Removal: Branch Manager** | **ESTABLISHED & RATIFIED** | The Branch Manager role was eliminated in Blueprint v3.1 §5.4 / v3.3 §5.5 and Principle 22. A branch is a geographic location (`branchId`), not a managerial authority. |
| **Role Identity: Course Division Manager** | **ESTABLISHED & RATIFIED** | The role leads the Course Division within an assigned physical branch (`manager` + `branchId` + `division: "courses"`) (Blueprint §6.4). |
| **Current UI Title: "Branch Manager & Course Division Head"** | **OBSERVED DRIFT** | Found in `ManagerDashboard.jsx` (line 625) and `ManagerOverview.jsx` (line 58). This is legacy naming drift that gives the false impression of branch-wide executive authority. |
| **Proposed UI Title: "Course Division Manager — [Branch] Campus"** | **PROPOSED UI REFINEMENT** | Update portal labels and headers to accurately display *"Course Division Manager"* and portal label *"Course Division Operations"*. |

---

### 2.2 Financial Authority & Cash Drawer Boundaries
| Item | Classification | Details & Source |
|---|---|---|
| **Cash Drawer Discrepancy Approvals** | **ESTABLISHED & RATIFIED** | Under **Ratified Decision G-009**: Cash discrepancies are strictly tiered: < 20k $\rightarrow$ Ops Lead (`opslead`); 20k–50k $\rightarrow$ Vice Director (`vice_director`); $\ge$ 50k $\rightarrow$ Director (`director`). **Course Division Manager has NO cash discrepancy approval authority.** |
| **Routine Tuition Fee Collection** | **ESTABLISHED & RATIFIED** | Handled directly by Front Office cashiers (Blueprint §6.9, G-009). Does not require approval envelopes. |
| **Tuition Plan Modifications (`TUITION_PLAN_CHANGE`)** | **ESTABLISHED & RATIFIED** | Under **Ratified Decision G-006 & G-007**: Division Manager is the Primary Approver (Level 1, Finance Domain). |
| **Discounts & Refunds (`DISCOUNT_OR_REFUND`)** | **ESTABLISHED & RATIFIED** | Under **Ratified Decision G-007 & G-009**: Exclusively approved by Executive Leadership (`director`, `vice_director`). Division Manager cannot approve refunds or discounts. |
| **Current UI: Cash Drawer Reconciliation Widget** | **OBSERVED DRIFT** | `ManagerOverview.jsx` embeds `ManagerCashSummary`, prompting the manager to balance daily cash drawers and review cashier receipts. |
| **Proposed Financial UI Alignment** | **PROPOSED UI REFINEMENT** | Shift the prominent financial card from *daily cashier drawer balance* to **Course Division Tuition Revenue & Enrollment Target Progress** (tracking active enrollments, monthly tuition target, and tuition due / overdue accounts), while keeping daily receipts as an informational intake summary without cashier audit duties. |

---

### 2.3 Approval Inbox & Dual-Control Gates
| Item | Classification | Details & Source |
|---|---|---|
| **Authorized Gates for Course Division Manager** | **ESTABLISHED & RATIFIED** | Under **Ratified Decision G-006 & G-007**: Course Division Manager is Primary Approver for: <br>1. `TUITION_PLAN_CHANGE`<br>2. `STUDENT_WITHDRAWAL_OR_FREEZE`. |
| **Gates Excluded from Course Division Manager** | **ESTABLISHED & RATIFIED** | The following gates belong to other functional leaders and must **not** route to Course Division Manager:<br>• `CASH_DISCREPANCY` $\rightarrow$ Ops Lead / Execs (G-009)<br>• `PLACEMENT_LEVEL_OVERRIDE` $\rightarrow$ Instructor Leader (G-007)<br>• `SUBSTITUTE_INSTRUCTOR` $\rightarrow$ Instructor Leader (G-007)<br>• `CLASS_CANCELLATION_OR_RESCHEDULE` $\rightarrow$ Ops Lead / Front Office (G-007)<br>• `STUDENT_CLASS_TRANSFER` $\rightarrow$ Ops Lead / Front Office (G-007)<br>• `RETROACTIVE_STUDENT_ATTENDANCE` $\rightarrow$ Ops Lead / Front Office (G-007). |
| **Current UI Subtitle in ApprovalInbox** | **OBSERVED DRIFT** | Subtitle claims manager authorizes *"branch cash drawer reconciliations, student schedule transfers, and operational exceptions."* |
| **Proposed UI Subtitle** | **PROPOSED UI REFINEMENT** | Update subtitle to: *"Review and authorize course tuition plan modifications, student withdrawals, and division-level requests."* |

---

### 2.4 Department Directives & Leadership Lines
| Item | Classification | Details & Source |
|---|---|---|
| **Course Division Marketing Leadership** | **ESTABLISHED & RATIFIED** | Course Division Marketing operates **directly under the Course Division Manager** (Blueprint §6.4, §6.6). Established responsibility: target-aligned lead generation. |
| **Operational Staff (Front Office & Office Boy)** | **ESTABLISHED & RATIFIED** | Front Office and Office Boy / Facilities report operationally to the **Operational Leader** (Blueprint §6.8). |
| **Teaching Faculty (Instructors)** | **ESTABLISHED & RATIFIED** | Instructors report upward to the **Instructor Leader** for pedagogical excellence and curriculum standards, and to the **Vice Director** for operational shift coverage (Blueprint §6.3, G-003). |
| **Current Directives Tab** | **OBSERVED DRIFT** | Treats all branch staff as direct subordinates of the manager with equal command directives. |
| **Proposed Directives UI Alignment** | **PROPOSED UI REFINEMENT** | Label task delegations clearly: <br>• **Course Marketing** (*Direct Leadership*)<br>• **Operations & Facilities** (*Cross-Department Request / Coordination*)<br>• **Teaching Staff** (*Academic Coordination*). |

---

## 3. Items for Owner Review & Confirmation

Before executing code changes in Phase 1 and subsequent phases, the owner's guidance is requested on the following 2 UI refinement preferences:

### Decision Item 1: Financial Card Focus on Overview
- **Background:** Currently, the top card is `ManagerCashSummary` (which calculates drawer cash, bank transfers, QRIS, and has a "Copy Cash Report" button).
- **Proposal A (Recommended):** Keep the intake breakdown as an informational card, but update the header to **"Course Division Intake & Collections"** and remove the cashier drawer balancing / WhatsApp cashier report features, replacing the main action with a link to course tuition targets and overdue accounts.
- **Proposal B:** Completely replace the daily intake card with a **"Course Tuition & Enrollment Performance"** card (showing current monthly enrolled student count vs target, tuition collection rate %, and total pending receivables).
- **Default Action if not specified:** We will implement **Proposal A** (safe, non-destructive refinement that maintains collection visibility while stripping cashier drawer audit language).

### Decision Item 2: Teaching Schedule ("My Classes")
- **Background:** The dashboard contains `MyTeachingCohortsView.jsx` in case a Course Division Manager also teaches classes as an instructor.
- **Proposal:** Retain this tab view under Classes & Coverage, allowing dual-role managers who also teach to view their assigned batches, while keeping it secondary to the overall course program schedule.
- **Default Action:** Retain as-is.

---

## 4. Summary & Readiness

All necessary governance foundations are established in Blueprint v3.3 and ratified in the 2026-10-07 Owner Decisions. No open governance gaps impede the cleanup of the Course Manager Dashboard.

We are ready to proceed to **Phase 1 (Identity & Branding Cleanup)** upon your confirmation.
