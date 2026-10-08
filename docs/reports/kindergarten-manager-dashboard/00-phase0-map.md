# Kindergarten Division Manager Dashboard: Phase 0 Conformance Map & Audit

> **Document Type:** Phase 0 Architecture & Governance Conformance Map  
> **Target Screen:** Kindergarten Division Manager Dashboard (`src/features/dashboard/kids/KidsManagerDashboard.jsx`)  
> **Governing Baseline:** Authoritative Blueprint v3.3 + Ratified Owner Decisions (G-001 through G-011)  
> **Status:** Draft / Proposed Roadmap  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-07  

---

## 1. Context & Governance Baseline

According to the **Authoritative Blueprint v3.3 (§5.3, §6.5)** and **Ratified Owner Decisions**:
1. **Organizational Identity:** The role is the **Kindergarten Division Manager** bound to a specific branch (`branchId`) and the Kindergarten Division (`division: "kindergarten"`).
2. **Authority & Scope:**
   - Direct leadership over Kindergarten pedagogical activities, early childhood learning, student safety, and classroom batch assignments.
   - Lead follow-up and student placement for Kindergarten applicants (`Toddler`, `Playgroup`, `Kindy A`, `Kindy B`).
   - Primary Approver under Dual-Control (G-006 & G-007) for Kindergarten **Tuition Plan Changes** and **Student Withdrawals / Freezes** within the Kindergarten division.
   - Cross-functional coordination with Front Office (reception), Facilities, and operational staff.

---

## 2. Current Implementation Audit & Discrepancy Findings

### Finding 1: Shared `ManagerOverview` Identity Leak
- **Observed:** `KidsManagerDashboard.jsx` renders `ManagerOverview`, but `ManagerOverview.jsx` hardcoded `portalLabel="Course Division Command"` and `roleLabel="Course Division Manager"`.
- **Impact:** When a Kindergarten Manager logs in, the welcome banner says "Course Division Command" and "Course Division Manager".
- **Remediation:** Make `ManagerOverview` accept `portalLabel`, `roleLabel`, `fallbackName`, and `division` props so that both Course and Kindergarten Manager dashboards display authentic divisional branding.

### Finding 2: Missing Core Tabs in Kindergarten Manager View
- **Observed:** `KidsManagerDashboard.jsx` only mounts:
  - Overview (`Command Center`)
  - Directives (`Staff Directives`)
  - Classes (`Classes & Coverage`)
  - Reports (`Reports & Analytics`)
  - AI Assistant
- **Missing Capabilities:**
  1. **Learners & Parents (`StudentRoster`):** Kindergarten managers need visibility into early childhood students, age levels, and parent contacts (read-only roster).
  2. **Kindergarten Approvals (`ApprovalInbox`):** Authorized dual-control approval gate for Kindergarten tuition changes and student withdrawals (`division="kindergarten"`).
  3. **Guestbook & Inquiries (`WalkInInquiryTab`):** Scoped to `division="kindergarten"` to track toddler/kindergarten parent walk-ins.

### Finding 3: Financial Intake & Collections Framing
- **Observed:** `KidsManagerDashboard` does not currently supply `branchPayments` to `ManagerCashSummary` or configure Kindergarten-scoped collections.
- **Remediation:** Wire daily payment totals scoped to `division: "kindergarten"` for the campus branch.

---

## 3. Phased Implementation Roadmap

1. **Phase 1: Identity & Props Generalization**
   - Generalize `ManagerOverview.jsx` props (`portalLabel`, `roleLabel`, `fallbackName`, `division`).
   - Update `KidsManagerDashboard.jsx` title, banners, and branch props.
   - Verify zero regressions for Course Division Manager tests.

2. **Phase 2: Tab Completeness & Dual-Control Approvals**
   - Mount `ApprovalInbox` with `division="kindergarten"` and badge counter for Kindergarten approvals.
   - Mount `StudentRoster` (read-only) for Kindergarten learners and parent links.
   - Mount `WalkInInquiryTab` scoped to `division="kindergarten"`.

3. **Phase 3: Data Isolation & Daily Intake**
   - Connect Kindergarten daily collections to `ManagerCashSummary`.
   - Ensure all query subscriptions and bottleneck counts are strictly partitioned to Kindergarten.

4. **Phase 4: Full Verification & Sign-Off**
   - Create unit tests for `KidsManagerDashboard.test.js`.
   - Run full verification suite (`typecheck`, `lint`, `npm test`, `compile_applet`).
