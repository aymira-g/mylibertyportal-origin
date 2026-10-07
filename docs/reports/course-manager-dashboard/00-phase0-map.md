# Course Division Manager Dashboard: Phase 0 Conformance Map & Audit

> **Document Type:** Phase 0 Architecture & Governance Conformance Map  
> **Target Screen:** Course Manager Dashboard (`src/features/dashboard/ManagerDashboard.jsx`) and child components  
> **Governing Baseline:**  
> - [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (Blueprint v3.3, §5.4, §6.4, §6.6, §7)  
> - [`docs/decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md`](../../decisions/2026-10-07-resolution-of-governance-questions-g001-g011.md) (Binding Owner Decisions)  
> - [`docs/specs/authorization-contract.md`](../../specs/authorization-contract.md)  
> **Status:** Completed Phase 0 Analysis (Awaiting Owner Review Before Code Execution)  
> **Author:** Coding / Executor Agent  
> **Date:** 2026-10-07  

---

## 1. Executive Summary & Purpose

The **Course Division Manager Dashboard** serves as the primary operational workspace for the head of the Course Division at an assigned physical branch (`manager` + `division: "courses"` + `branchId`).

In earlier iterations of the MyLiberty Portal, this screen was conceived as a monolithic **"Branch Manager"** command center. However, under **Blueprint v3.1–v3.3** and the **Owner Decisions ratified on 2026-10-07**:
1. **The Branch Manager / Branch Head role was formally removed** from the organization (Blueprint §5.4 / §5.5, Principle 22). A physical branch (`branchId`) is an organizational and data scope boundary, **not a managerial authority role**.
2. **Branch leadership consists of four peer functional leaders** (§5.2, Principle 14, G-011): Course Division Manager, Kindergarten Division Manager, Operational Leader, and Instructor Leader.
3. **No automatic transfer of former Branch Manager authority:** Former Branch Manager duties (e.g. cashier drawer discrepancy balancing, general facility oversight, instructor pedagogical supervision) do **not** silently flow to the Course Division Manager.

This document inventories the current implementation, maps discrepancies against governing truth, evaluates the blast radius of proposed refinements, and presents the structured roadmap for incremental execution.

---

## 2. Safety Baseline & Verification Environment

Prior to any code modification, the codebase environment was verified:
- **Git / Checkpoint:** Pristine sandbox container at `/app/applet`.
- **TypeScript Typecheck (`npm run typecheck`):** PASSED (0 errors).
- **ESLint (`npm run lint`):** Active verification suite.
- **Vitest Suite (`npm test`):** 87 suites passed, 1090 tests passed, 0 failures.
- **Vite Build (`compile_applet`):** Clean production bundle generated.
- **Rule:** No production code edits occur until this Phase 0 Map and the accompanying Owner Decisions Register are reviewed.

---

## 3. Inventory of the Current Implementation (As-Is)

### 3.1 Component Hierarchy & File Structure
```text
src/features/dashboard/
├── ManagerDashboard.jsx                      # Main dashboard shell & data subscriptions
├── ManagerDashboard.test.js                 # Unit tests for manager dashboard & overview
└── manager/
    ├── index.js                              # Module exports
    ├── ManagerOverview.jsx                   # Overview tab (metrics, banners, on-duty staff)
    ├── ManagerCashSummary.jsx                # Cash drawer intake & WhatsApp copy tool
    ├── ClassesAndCoverageTab.jsx             # Course schedule & teacher assignment view
    ├── MyTeachingCohortsView.jsx             # Personal teaching classes if manager also teaches
    ├── OperationalBottlenecksSection.jsx     # Lead, enrollment, & teacher issue alerts
    ├── StaffDirectivesTab.jsx                # Department task delegation panel
    ├── MarketingOutreachTracker.jsx          # School visits, lead tracker, officer breakdown
    ├── RecentVisitsTable.jsx                 # School visit activity log
    ├── SchoolDetailModal.jsx                 # School record modal
    ├── managerUtils.js / .test.js            # Time formatting & punctuality helpers
    └── outreachTrackerUtils.js / .test.js    # Outreach KPI calculation helpers
```

### 3.2 Current Tabs Inventory & Data Sources

| # | Tab ID | Tab Label | Primary Component | Current Data Sources | Current Purpose / Behavior |
|---|---|---|---|---|---|
| 1 | `overview` | Command Center | `ManagerOverview` | `users`, `classes`, `applications`, `shifts`, `dailyPayments`, `schools`, `visits` | Displays welcome banner, quick stats, pending approvals alert, cash summary widget, tuition due widget, bottlenecks, on-duty shift snapshot, and marketing summary. |
| 2 | `students` | Learners & Parents | `StudentRoster` | `users` (filtered to students), `classes` | Read-only student roster for course division; allows viewing parent contact details and enrollment statuses. |
| 3 | `inquiries` | Guestbook & Inquiries | `WalkInInquiryTab` | `deskInquiries` collection | Log and track course prospect inquiries and placement test requests. |
| 4 | `marketing-outreach` | Marketing Outreach | `MarketingOutreachTracker` | `schools`, `outreachVisits` (rolling 90-day window + WITA week) | Monitors school admissions campaigns, field visits by marketing officers, follow-up flags, and conversion leads. |
| 5 | `tasks` | Staff Directives | `StaffDirectivesTab` | `todos` collection | Create and track operational task directives categorized across departments (Front Office, Marketing, Instructors, Office Boy). |
| 6 | `approvals` | Branch Approvals | `ApprovalInbox` | `approvals` collection | Dual-control approval queue for pending requests matching `manager` and `approverBranchId`. |
| 7 | `classes` | Classes & Coverage | `ClassesAndCoverageTab` | `classes`, `users` | Class schedule monitoring, empty room / missing instructor bottleneck detection, and personal teaching schedule view. |
| 8 | `reports` | Reports & Analytics | `ReportsDashboard` | Reporting aggregations | Read-only access to branch-level academic, attendance, and revenue analytics (`isManager=true`, `canEdit=false`). |
| 9 | `ai` | AI Assistant | `AIAssistant` | Assistant interface | AI-assisted operational queries. |

---

## 4. Conformance Audit: Implementation vs. Blueprint & Ratified Decisions

### Finding 1: Legacy "Branch Manager" Branding & Identity Drift
- **Observed Code:**
  - `ManagerDashboard.jsx` (line 625): `title={"Branch Manager & Course Division Head — " + myBranch}`
  - `ManagerOverview.jsx` (line 57–60): 
    - `portalLabel="Branch Operations Command"`
    - `roleLabel="Branch Manager & Course Division Head"`
    - `fallbackName="Branch Manager"`
    - `subtitle="Branch operational leadership, course programs, classroom coverage, and daily cash intake for " + myBranch`
  - `ManagerDashboard.test.js` (lines 47, 90–92): Locks in assertions for `"Branch Operations Command"` and `"Branch Manager & Course Division Head"`.
- **Governing Truth:**
  - **Blueprint §5.4 / §6.4 & Principle 22:** The role of Branch Manager / Branch Head was formally abolished. The physical branch is a geographic scope (`branchId`), not an executive authority role.
  - The Course Division Manager leads the **Course Division** at that branch. The correct title is **Course Division Manager** (or *Kepala Divisi Kursus*).
  - Portraying this role as the overall "Branch Operations Commander" creates organizational confusion with the Operational Leader (§6.8) and Kindergarten Division Manager (§6.5).

### Finding 2: Financial Boundary Drift (Cash Drawer Monitoring & Discrepancies)
- **Observed Code:**
  - `ManagerOverview.jsx` embeds `ManagerCashSummary` directly at the top of the dashboard.
  - `ManagerCashSummary.jsx` displays:
    - Daily cash drawer intake vs bank transfer vs QRIS.
    - "Copy Daily Cash Report to Clipboard" for Front Office cash reconciliation.
  - `ApprovalInbox` subtitle in `ManagerDashboard.jsx` (line 584) claims:
    - *"Review and authorize branch cash drawer reconciliations, student schedule transfers, and operational exceptions."*
- **Governing Truth:**
  - **Blueprint §6.4 & §6.9:** Front Office cashiers record routine tuition collections.
  - **Ratified Decision G-009:** Cash drawer discrepancies are strictly tiered:
    - `< Rp 20.000:` Approved by the **Operational Leader** (`opslead`).
    - `Rp 20.000 – Rp 49.999:` Approved by the **Vice Director** (`vice_director`).
    - `$\ge$ Rp 50.000:` Approved by the **Director** (`director`).
  - **The Course Division Manager has ZERO authority over cashier cash drawer balancing or cash discrepancy sign-off.**
  - **Governed Financial Role of Course Division Manager:**
    - Setting and monitoring **Course Division student enrollment & tuition revenue targets** (Blueprint §5.3, §6.4).
    - Authorizing **Tuition Plan Modifications** (`TUITION_PLAN_CHANGE`) within established fee frameworks (G-006 / G-007).
    - Authorizing **Student Withdrawal / Freeze** (`STUDENT_WITHDRAWAL_OR_FREEZE`) (G-006 / G-007).
    - Monitoring course tuition arrears and collection efficiency (via `TuitionDueWidget`).

### Finding 3: Staff Directives & Departmental Reporting Lines
- **Observed Code:**
  - `StaffDirectivesTab.jsx` provides task assignment filters across:
    - `frontoffice`
    - `marketing`
    - `instructor`
    - `officeboy`
    - `all`
- **Governing Truth:**
  - **Blueprint §6.4 & §6.6:** Course Division Marketing operates **directly under the Course Division Manager** (established responsibility: target-aligned lead generation).
  - **Blueprint §6.8:** Front Office and Office Boy / Facilities are operationally coordinated by the **Operational Leader**, not the Course Division Manager.
  - **Blueprint §6.3 & Ratified Decision G-003:** Instructors report upward to the **Instructor Leader** for pedagogical and curriculum assignments, and to the **Vice Director** for shift coverage.
  - **Refinement Need:** The directives tool should clearly delineate between **Direct Command** (Course Division Marketing & Course Division operations) and **Cross-Functional Coordination / Requests** (requests directed to Front Office, Facilities, or Instructors).

### Finding 4: Approval Inbox Gate Precision
- **Observed Code:**
  - `ManagerDashboard.jsx` mounts `ApprovalInbox` with `userRole="manager"`.
  - In `approvalsRepository.js` (lines 58–60):
    ```javascript
    if (normalizedRole === "manager") {
      constraints.push(where("approverRole", "in", [APPROVAL_ROLES.DIVISION_MANAGER, APPROVAL_ROLES.BRANCH_MANAGER, "manager"]));
      constraints.push(where("approverBranchId", "==", normalizedBranch));
    }
    ```
- **Governing Truth (G-006 & G-007):**
  - Course Division Manager is the designated Primary Approver for:
    1. `TUITION_PLAN_CHANGE` (Level 1, Finance Domain)
    2. `STUDENT_WITHDRAWAL_OR_FREEZE` (Level 1, Students Domain)
  - Course Division Manager is **NOT** the approver for:
    - `CASH_DISCREPANCY` (assigned to `opslead` / `vice_director` / `director` under G-009).
    - `SUBSTITUTE_INSTRUCTOR` or `PLACEMENT_LEVEL_OVERRIDE` (assigned to `instructorleader`).
    - `CLASS_CANCELLATION_OR_RESCHEDULE` or `STUDENT_CLASS_TRANSFER` (assigned to `opslead` / `frontoffice`).
  - **Division Scope Gap:** The approval envelope query filters only by `approverBranchId`, but does not filter by `division: "courses"`. In a branch with both Course and Kindergarten divisions, a Course Division Manager must only see Course Division approval requests.

### Finding 5: Division Data Scope Isolation
- **Observed Code:**
  - `ManagerDashboard.jsx` subscribes to branch-wide collections (`users`, `classes`, `applications`, `shifts`, `todos`) using `where("branchId", "==", managerBranchId)`.
  - Kindergarten documents are filtered out client-side:
    ```javascript
    .filter((u) => !u.division || u.division !== "kindergarten")
    ```
- **Architectural & Security Assessment:**
  - Client-side filtering protects the UI from rendering Kindergarten data.
  - In Firestore rules, read access for managers should align with branch + division scope without leaking cross-divisional student data.
  - Performance note: Branch collections are small (dozens to hundreds of docs), so client-side partition is cost-effective, but explicit `division: "courses"` fields on newly created records ensure clean persistence.

---

## 5. Blast Radius & Downstream Impact

| Component / Artifact | Dependency Nature | Impact of Refinement | Risk Level |
|---|---|---|---|
| `ManagerDashboard.jsx` | Container & Shell | Header title, active tab badges, and approval subtitles updated to Course Division Manager terminology. | LOW |
| `ManagerOverview.jsx` | Presentation | Welcome banner labels updated; cash drawer widget repositioned or reframed toward Course Tuition Revenue Target rather than cashier drawer audit. | LOW-MEDIUM |
| `ManagerCashSummary.jsx` | Presentation | Reframed from cashier drawer reconciliation to Course Division intake overview. (Cash discrepancy approval references removed). | LOW |
| `StaffDirectivesTab.jsx` | Workflow | Clarified department labeling: Course Marketing (Direct) vs Operations/Instructors (Coordination). | LOW |
| `ManagerDashboard.test.js` | Test Suite | Update legacy string assertions (`"Branch Operations Command"` $\rightarrow$ `"Course Division Command"`; `"Branch Manager & Course Division Head"` $\rightarrow$ `"Course Division Manager"`). | LOW |
| `ApprovalInbox.jsx` | Shared Component | Title/subtitle text updated. Backend query ensures Division Manager only reviews their designated gates. | LOW-MEDIUM |

---

## 6. Phased Refinement Roadmap

The refinement will proceed in five focused, verifiable stages:

1. **Phase 1: Identity, Branding & Governance Alignment**
   - Eliminate legacy "Branch Manager" and "Branch Operations Command" labels.
   - Establish authentic "Course Division Manager — [Branch] Campus" identity.
   - Update `ManagerDashboard.jsx`, `ManagerOverview.jsx`, and `ManagerDashboard.test.js`.
2. **Phase 2: Approval Gate & Dual-Control Inbox Conformance**
   - Update `ApprovalInbox` framing to reflect actual authorized gates (`TUITION_PLAN_CHANGE`, `STUDENT_WITHDRAWAL_OR_FREEZE`).
   - Remove misleading references to cashier drawer discrepancy approvals.
   - Ensure division scoping (`division: "courses"`) in approval handling.
3. **Phase 3: Financial Focus Realignment (Tuition Targets vs Drawer Balancing)**
   - Reframe financial metrics in `ManagerOverview` to highlight **Course Division Enrollment & Tuition Revenue Progress** and **Arrears / Tuition Due**.
   - Retain daily intake visibility as informational, but separate it from cashier drawer balancing and discrepancy authority.
4. **Phase 4: Operational Directives & Departmental Delegation Refinement**
   - Update `StaffDirectivesTab` to clearly distinguish Course Marketing leadership from cross-department operational requests (Front Office, Ops Lead, Instructors).
5. **Phase 5: Verification & Safety Sign-off (Level 1 Regression Check)**
   - Run `npm run typecheck`, `npm run lint`, `npm test`, and `compile_applet`.
   - Verify all test suites pass with zero regressions.

---

## 7. Sign-off & Stop for Review

Per agent instructions:
- **Phase 0 is complete.**
- Next file: `docs/reports/course-manager-dashboard/owner-decisions.md` cataloging points requiring owner awareness vs already governed rules.
- **Stop for human review before initiating Phase 1 code changes.**
