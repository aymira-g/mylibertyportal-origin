# Formal Owner Decision: Branch Typology and Lean Satellite Branch Governance Amendment

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)  
> **Status:** RATIFIED & ACTIVE  
> **Ratified by:** Owner / Director (Kifry)  
> **Date:** 2026-10-13  
> **Blueprint Alignment:** Authoritative Blueprint v3.3 §4, §5, §6.8, §6.11, §15, §16, §26 (amends §4, §5, §6.8, §6.11, and adds G-012)  

---

## 1. Context and Problem Statement

Under Authoritative Blueprint v3.3 (§4 & §5), MyLiberty was documented under an **"Ideal Campus Assumption"**: every physical branch was modeled as an identical, fully-staffed unit containing both educational divisions (Course Division and Kindergarten Division) and four functional peer leaders:
1. Course Division Manager (`manager` + `courses`)
2. Kindergarten Division Manager (`manager` + `kindergarten`)
3. Operational Leader (`opslead`)
4. Instructor Leader (`instructorleader`)

In real-world practice across Gorontalo Province, organizational reality differs fundamentally by branch scale:
- **Kota Gorontalo (Cabang Utama / Main Campus):** The sole full-service campus, operating both Course Academy and Kindergarten educational streams with dedicated functional leadership.
- **Bone Bolango, Limboto, and Pohuwato (Cabang Pembantu / Lean Satellite Branches):** Lean educational centers operating **Courses only**. They are staffed strictly by a **Course Division Manager**, **Front Office** staff, and teaching **Instructors**. They do **not** have a local Kindergarten division, do **not** have an Operational Leader, and do **not** have a local Instructor Leader.

Under unamended governance, this discrepancy caused severe organizational friction:
1. Satellite branches were treated as permanently "vacant" rather than intentionally lean.
2. Under Blueprint §26 G-008 (*"Peer leaders never cover peer leaders"*), Course Division Managers were barred from coordinating local site operations, scheduling classes, or verifying daily Front Office shift logs.
3. Minor, routine daily events (such as a Rp 10.000 cash drawer difference, student class transfer, or substitute teacher request) were forced to bottleneck at the Vice Director in Gorontalo.

The Owner / Director (Kifry) has resolved this organizational gap by formally ratifying a **Branch Typology Model** and establishing clear operating rules for lean branches.

---

## 2. Binding Decisions Ratified by the Owner

### Decision 1: Formal Branch Typology Classification

MyLiberty physical branches are officially partitioned into two operational tiers:

| Branch Tier | Physical Locations | Active Divisions | Branch Staffing Structure |
|---|---|---|---|
| **Type 1: Main Campus** (*Cabang Utama*) | `kota_gorontalo` (Cabang Utama) | **Course Division** & **Kindergarten Division** | Full 4-peer leadership structure:<br>• Course Division Manager<br>• Kindergarten Division Manager<br>• Operational Leader<br>• Instructor Leader<br>• Front Office, Instructors, Facilities/Office Boy |
| **Type 2: Lean Satellite Branch** (*Cabang Pembantu*) | `bone_bolango`<br>`limboto`<br>`pohuwato` | **Course Division only** *(Kindergarten inactive until explicitly expanded by Owner Decision)* | Lean operational structure:<br>• Course Division Manager<br>• Front Office / Reception<br>• Teaching Instructors<br>• Facilities / Office Boy *(as assigned)* |

---

### Decision 2: Operational Coordination & Site Oversight at Lean Branches

1. **Local Site Operations & Front Office Coordination:**
   - At Lean Satellite Branches lacking an assigned Operational Leader, the **Course Division Manager** officially serves as the **Operational Supervisor** for local site logistics, daily facility readiness, and Front Office administrative performance.
   - The Course Division Manager is the authorized authority for class cohort creation, timetable coordination, and room allocation for the Course Division (re-affirming ADR 2026-10-13 Option B).
2. **Maker–Checker at Lean Branches:**
   - **Daily Shift Verification:** Front Office acts as Maker (clock-in/clock-out); the Course Division Manager acts as local Checker to review completed shifts.
   - **Minor Cash Discrepancies (< Rp 20.000):** Front Office cashiers act as Maker; the Course Division Manager acts as Checker (substituting for the absent Ops Lead under G-009). Discrepancies $\ge$ Rp 20.000 continue to escalate upward to the Vice Director (Rp 20.000–Rp 49.999) and Director ($\ge$ Rp 50.000).

---

### Decision 3: Province-Wide Academic Coordination Scope for Instructor Leader (Central Academic Lead)

1. **Central Academic Leadership:**
   - The **Instructor Leader based at Kota Gorontalo** is officially assigned **Province-Wide / Multi-Branch Academic Scope** (`multi-branch` pedagogical authority).
   - The Instructor Leader functions as the **Central Academic Lead** for all teaching staff across Gorontalo Province.
2. **Pedagogical Authority Across Lean Branches:**
   - The Central Academic Lead standardizes curriculum, conducts instructor evaluations, coordinates cross-branch teaching coverage, and reviews student placement standards across all branches.
   - Dual-Control sensitive academic tickets originating from lean branches—specifically **Placement Level Overrides** (`PLACEMENT_LEVEL_OVERRIDE`) and **Substitute Instructor Assignments** (`SUBSTITUTE_INSTRUCTOR`)—route directly to and are approved by the **Instructor Leader** (with Vice Director as formal executive escalation under G-007).

---

### Decision 4: Financial Boundaries and Separation of Duties Firmly Preserved

The Course Division Manager at a lean satellite branch does **not** become an all-powerful "Branch Manager":
1. **Restricted Financial Actions:**
   - **Discounts and Fee Waivers / Refunds** (`DISCOUNT_OR_REFUND`) remain strictly and exclusively reserved for Executive Leadership (`director`, `vice_director`). A Course Division Manager cannot approve financial discounts or refunds regardless of branch size.
2. **Staff Authorization & Authority Elevation:**
   - Creation of new staff accounts (`NEW_STAFF_ACCOUNT`), staff role elevation (`STAFF_ROLE_ELEVATION`), and staff deactivation (`STAFF_DEACTIVATION`) remain strictly reserved for Executive sign-off (G-002, G-006, G-007).
3. **Strict Separation of Duties (Maker $\ne$ Checker):**
   - Course Division Managers **cannot self-approve** their own shifts, leaves, or status adjustments.
   - Shift corrections for Course Division Managers escalate directly to the Director (or Vice Director) under G-008.

---

## 3. Implementation Contracts

### 3.1 Dual-Control Approval Routing (`approvalGates.js`)
- `PLACEMENT_LEVEL_OVERRIDE` & `SUBSTITUTE_INSTRUCTOR`:
  - Envelopes originating from satellite branches route with `approverRole: APPROVAL_ROLES.INSTRUCTOR_LEADER`.
  - Eligible approver roles include `instructorleader`, with formal escalation to `vice_director`.
- `CASH_DISCREPANCY` (< Rp 20.000):
  - At Kota Gorontalo: routes to `opslead`.
  - At Lean Branches: dynamically resolves to `manager` (Course Division Manager) if no `opslead` exists at that branch and drawer handler was Front Office.
  - At all branches: drawer handler cannot approve (Maker $\ne$ Checker).

### 3.2 Backend Security Rules (`firestore.rules`)
- `isApproverForDoc(data)`:
  - Supports Central Academic Lead approvals across branches: `instructorleader` from Kota Gorontalo can approve academic tickets originating from lean branches (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`).
  - Allows `manager` to approve cash discrepancies < Rp 20.000 within their own branch if no Ops Lead is assigned.
  - Allows `vice_director` to approve escalated tickets across all Level 1 gates when branch leadership is absent or escalated.

### 3.3 UI Presentation & Dashboards
- **ManagerDashboard (`manager` + `courses`):**
  - At lean branches, exposes class cohort management and daily shift review tools.
  - Exposes Front Office desk coordination tools while keeping financial discount and staff elevation controls strictly disabled.
- **InstructorLeaderDashboard (`instructorleader`):**
  - Displays multi-branch / province-wide academic queue, enabling review of placement overrides and teacher coverage across Kota Gorontalo, Bone Bolango, Limboto, and Pohuwato.
- **KidsFrontOfficeDashboard & KidsManagerDashboard:**
  - Strictly confined to `kota_gorontalo` until Kindergarten expansion is formally approved.
