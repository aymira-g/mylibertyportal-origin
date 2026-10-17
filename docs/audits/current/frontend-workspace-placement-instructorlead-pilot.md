# Frontend Workspace Placement Pass — Instructor Leader (`instructorleader`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** Instructor Leader / Central Academic Lead (`instructorleader`, `instructor_leader`) Workspace Cockpit  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4.1 (§4, §5, §6.11, §6.12, §15, §16, §18, §26 G-003, G-005, G-006, G-007, G-011, G-012, §41), Ratified Owner Decisions G-001–G-011 (2026-10-07), Branch Typology & Central Academic Lead Ratification (ADR 2026-10-13, G-012), Owner-Approved Progress Reports & Class Attendance Read Widening (2026-10-08), Ratified Progress Reports Read Access Decision `OD-OPS-01` (2026-10-17), Ratified Bulk Roster Export Restriction Decision `OD-OPS-02` (2026-10-17), and Ratified Staff Shift History Self-Service Decision `OD-STF-01` (2026-10-17)  
> **Status:** READ-ONLY WORKSPACE PLACEMENT AUDIT COMPLETE — FINDINGS & REMEDIATION OPTIONS DOCUMENTED  
> **Verification Method:** Static code inspection of React components, routing shell, repository contracts, and Firestore security rules, coupled with Level 1 automated regression suites (TypeScript `npm run typecheck` passed with 0 errors; focused Vitest component & repository suite with 76 tests passed across 8 files; security rules matrix suites with 239 tests passed across 5 files; approval gate probe suite with 8 tests passed across 1 file). Firestore Rules emulator suites were skipped in offline Vitest runs, and live production behavior was not tested.

---

## 1. Audit Scope & Executive Summary

This report documents an end-to-end read-only inspection and automated test audit of the **Instructor Leader / Central Academic Lead (`instructorleader`)** workspace under the approved **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3).

### 1.1 Scope Boundaries & Operational Role Identity
- **Single Role Cockpit:** This inspection examines the Instructor Leader workspace mounted via `InstructorLeaderDashboard.jsx` in `src/App.jsx:598-603`. It evaluates the routing shell, 11 mounted tabs, nested components, shared controls, data queries, and underlying Firestore security rules.
- **Central Academic Lead Identity (Blueprint v3.4.1 §4, §5, §6.11, G-012):** Under the Authoritative Blueprint and Ratified Decision G-012 (ADR 2026-10-13), the Instructor Leader is based at the Main Campus (`kota_gorontalo`) and serves as the **Central Academic Lead** for the entire province. In this capacity, the role exercises province-wide pedagogical coordination scope across all physical campuses (Main Campus and Lean Satellite Branches) for:
  1. Province-wide curriculum standardization and pedagogical quality control;
  2. Teacher schedule assignments and coverage coordination;
  3. Teacher performance evaluations;
  4. Academic placement test overrides (`PLACEMENT_LEVEL_OVERRIDE`) and substitute instructor approvals (`SUBSTITUTE_INSTRUCTOR`).
- **Strict Separation from Branch Management & Operations (Blueprint §6.11, G-003, G-011):** The Instructor Leader belongs to the Teaching and Learning Structure, reporting operationally to the **Vice Director** (scheduling, coverage, substitute teaching) and strategically to the **Director** (pedagogy, curriculum standards). The Instructor Leader is a functional peer to the Division Managers and Operational Leader, **not** a Branch Manager, and holds zero general operational, administrative, or financial authority (no cashier intake, no cash discrepancy approval, no student tuition discounting, no staff termination, no class cohort deletion).
- **Dual Role Responsibilities (Leadership + Teaching Delivery):** Unlike pure administrative or operational roles, the Instructor Leader is also an active teaching instructor. Consequently, the workspace legitimately accommodates both **branch leadership oversight** (team monitoring, coverage, branch progress, branch attendance, dual-control approvals) and **personal educational delivery** (own class roster, personal attendance marking, evaluation form, lesson materials).

### 1.2 Summary of Key Findings
1. **Redundant Institutional Reports Tab Mount (Tab 9 Clutter):** Tab 9 mounts `<ReportsDashboard userBranch={effectiveBranch} isInstructorLeader={true} />`. This introduces workspace incoherence: it duplicates the dedicated, purpose-built academic monitoring tabs (Overview, Team, Coverage, Progress, Attendance), exposes irrelevant desk check-in reception logs (`TodayTab`) and personal shift logs (`StaffDutyTab` which under `OD-STF-01` belongs in `ProfilePanel`), and renders confusingly mislabeled controls due to `isSupervisor=false` in `ReportsDashboard.jsx` (Finding 4.1).
2. **Unenforceable Province-Wide Scope Collision & Denial-Looks-Like-Zero Failure:** In `ReportsDashboard.jsx:29`, `canAccessProvinceScope` treats `isInstructorLeader` as having province-wide access across all collections in the reports dashboard, defaulting `branchFilter` to `"all"`. When "All Campuses" is queried, underlying requests to `/attendance` and `/users` lack a `branchId` constraint. Firestore security rules enforce `isSameBranchStrict` on both collections for non-executives (`firestore.rules:1018, 320`), returning `permission-denied`. On `TodayTab`, this triggers an error toast; on `LearnerProgressTab:159`, the error is swallowed by `console.error(err)` and affirmative zero records are displayed (**Denial-Looks-Like-Zero**, violating `03-technical-audit-method.md` Dimension 6) (Finding 4.2).
3. **Bulk Institutional CSV Dataset Export Exposure:** In `ReportsDashboard.jsx:31`, `canExportReports = isExecutiveView || isManager || isInstructorLeader;` renders a top-level bulk CSV export button. This allows downloading full attendance and student rosters from the reports dashboard, creating data privacy exposure inconsistent with recent owner restrictions on other operational roles (DOM05-PRIV-01, Ratified Decision `OD-OPS-02` / `G-014`) (Finding 4.3).
4. **App.jsx Routing Prop Inconsistency:** In `src/App.jsx:601`, `<InstructorLeaderDashboard role={effectiveRole} />` omits the `branch` prop, unlike `OpsLeadDashboard` (`App.jsx:608`), causing initial render to briefly fall back to `"kota_gorontalo"` before the user document loads (Finding 4.4).
5. **Robust Core Academic Leadership Workspaces (Tabs 1–5, 10):** The primary academic leadership tabs (Overview, Instructor Team, Classes & Coverage, Academic Progress, Attendance Activity, and Academic Approvals) are purpose-built, fail closed, provide exception-first coordination, and strictly enforce backend authorization rules without leaking operational or financial mutation controls.

---

## 2. Standardized Frontend Placement Ledger (Instructor Leader Checks)

The following ledger documents all targeted structural checks evaluated for the Instructor Leader workspace, conforming strictly to the 10-column schema defined in [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.5:

| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
|---|---|---|---|---|---|---|---|---|---|
| **`FP-IL-01`** | `instructorleader` (Main Campus / Central) | `src/App.jsx:44-45, 598-603`<br>`src/features/dashboard/InstructorLeaderDashboard.jsx:1-311` | Instructor Leader Dashboard Shell Mount & Route Guard | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11; Ratified Decisions G-003, G-011 | Root app routing `/portal` when `effectiveRole in ['instructorleader', 'instructor_leader']` | Static rule & router inspection; passes component unit tests | `CONFORMS` | Core academic leadership shell baseline. Note: `branch` prop omitted in `App.jsx:601` (Finding 4.4). |
| **`FP-IL-02`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:106-128`<br>`src/features/dashboard/instructor/leader/LeaderOverview.jsx:1-390` | Academic Delivery Overview & Exception Cockpit (`WelcomeBanner`, Needs Attention, Today's Classes, Academic Health) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11; Ratified Decision G-003 | Instructor Leader Dashboard -> Overview Tab (`overview`) | Static rule inspection; passes component unit tests | `CONFORMS` | Exception-first landing screen; leads with unassigned cohorts, clashes, and overdue reports; zero direct mutations. |
| **`FP-IL-03`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:129-144`<br>`src/features/dashboard/instructor/leader/InstructorTeam.jsx:1-249` | Branch Teaching Team Workload & Activity Cockpit (Dual-division instructor cards, workload metrics, progress recency) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11 (All branch instructors report to Instructor Leader; G-003) | Instructor Leader Dashboard -> Instructor Team Tab (`team`), with team size badge | Enforced in rules (`firestore.rules:320`); verified via security rules matrix | `CONFORMS` | Read-only teaching team oversight across Courses & Kindergarten; HR actions, leave approvals, and role elevations omitted. |
| **`FP-IL-04`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:145-159`<br>`src/features/dashboard/instructor/leader/ClassesCoverage.jsx:1-373` | Class Capacity, Timetable Conflicts & Coverage Escalation (Double-booking engine, capacity warnings, level mismatches) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11 (Teacher schedule assignments, coverage coordination; G-003) | Instructor Leader Dashboard -> Classes & Coverage Tab (`coverage`), with missing instructor badge | Enforced in rules: `classes` read allowed (`firestore.rules:423`); class mutations omitted | `CONFORMS` | Detects teacher/room clashes and level mismatches; governed escalation boundary explicitly disclosed; no direct class edits. |
| **`FP-IL-05`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:161-182`<br>`src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx:1-223` | Branch Student Academic Progress Monitoring (Recent evaluations, scores, teacher remarks, stale instructor follow-up) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §41; Owner Decision 2026-10-08 | Instructor Leader Dashboard -> Academic Progress Tab (`progress`) | Enforced in rules: `progressReports` read widened for `isInstructorLeader()` (`firestore.rules:1325, 1336`) | `CONFORMS` | Scoped monitoring across both divisions (limit 100 docs); teacher evaluation gap explicitly disclosed; mutation controls omitted. |
| **`FP-IL-06`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx:189-199`<br>`src/features/dashboard/instructor/InstructorProgress.jsx:1-228` | Personal Student Evaluation Delivery & History (`StudentProgressForm` for classes personally taught) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Direct educational delivery and progress reporting) | Embedded in Academic Progress Tab -> "My Own Teaching Evaluations" slot | Enforced in rules: `progressReports` create allowed for instructor of record (`firestore.rules:1337-1344`) | `CONFORMS` | Legitimate teaching capability; instructor leader authors assessments strictly for assigned cohorts. |
| **`FP-IL-07`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:183-231`<br>`src/features/dashboard/instructor/leader/AttendanceActivity.jsx:1-202` | Branch Class Attendance Completion Monitoring (On-demand date query, % completion, incomplete sessions list) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, G-003; Owner Decision 2026-10-08 | Instructor Leader Dashboard -> Attendance Tab -> Sub-tab "Branch Monitoring" | Enforced in rules: `classAttendance` read allowed for `isSameBranch(classDoc)` (`firestore.rules:1110-1111`) | `CONFORMS` | On-demand chunked read keeps Spark reads bounded; retroactive attendance edit omitted (reserved for Ops Lead / Vice Director). |
| **`FP-IL-08`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:202-230`<br>`src/features/attendance/InstructorAttendanceView.jsx:1-694` | Personal Class Attendance Marking & Session Close-Out (Session roster, manual attendance mark, camera scan) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Direct lesson delivery and attendance logging) | Instructor Leader Dashboard -> Attendance Tab -> Sub-tab "My Classes" | Enforced in rules: `classAttendance` create/update allowed for `isAssignedToClass` (`firestore.rules:1108, 1148`) | `CONFORMS` | Legitimate teaching capability; active instructor leader marks attendance for assigned classes; kiosk camera scanner embedded. |
| **`FP-IL-09`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:233-248`<br>`src/features/dashboard/instructor/InstructorClasses.jsx:1-287` | Personal Teaching Cohorts & Enrolled Roster (`StudentRoster` with `readOnly={true}`, `AvailableBatches`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Teaching instructor cohort management) | Instructor Leader Dashboard -> My Classes Tab (`classes`) | Enforced in UI props: `readOnly={true}`, `canExportRoster={false}`, `canEdit={false}` | `CONFORMS` | Roster editing and student status changes suppressed; parent PII hidden (`canViewParents={false}`); CSV export disabled. |
| **`FP-IL-10`** | `instructorleader` (Staff Operations) | `src/features/dashboard/InstructorLeaderDashboard.jsx:250-262`<br>`src/features/staff/StaffDirectivesWidget.jsx:1-352` | Faculty & Instructor Directives Inbox (Operational orders, due date badges, completion checkboxes) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, G-003 (Staff operational coordination under Vice Director operational control) | Instructor Leader Dashboard -> Directives Tab (`directives`), with pending count badge | Enforced in rules (`firestore.rules:992-1011` update completed status only) | `CONFORMS` | Pure completion tracking for directives issued by Executive / Division Manager leadership; directive authoring omitted. |
| **`FP-IL-11`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:263`<br>`src/features/classes/TeachingMaterial.jsx:1-225` | Personal Lesson Materials Bookmarks (External URLs, Google Drive, PDFs, YouTube links) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.12 (Lesson preparation tools for instructors) | Instructor Leader Dashboard -> Lesson Materials Tab (`materials`) | Enforced in rules: `/materials` scoped to `createdBy == auth.currentUser.uid` (`firestore.rules:1465-1472`) | `CONFORMS` | Personal bookmarks management. Note: Purely individual tool; does not provide province-wide curriculum distribution (Gap 5.4). |
| **`FP-IL-12`** | `instructorleader` (Central Academic Lead) | `src/features/dashboard/InstructorLeaderDashboard.jsx:265-277`<br>`src/features/shared/ApprovalInbox.jsx:1-878` | Academic & Faculty Dual-Control Approval Inbox (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §15, §16; Ratified Decisions G-007, G-012 | Instructor Leader Dashboard -> Academic Approvals Tab (`approvals`), with pending count badge | Enforced in rules: `gateAllowsApprover` (`firestore.rules:337-338`); `isCentralAcademicLead` (`362-364`) | `CONFORMS` | Central Academic Lead province-wide scope verified; non-academic gates strictly blocked by rules; self-approval denied (`firestore.rules:662`). |
| **`FP-IL-13`** | `instructorleader` (Shared Tooling) | `src/features/dashboard/InstructorLeaderDashboard.jsx:278`<br>`src/features/shared/AIAssistant.jsx:1-143` | Shared Staff AI Assistant (Message drafting, lesson & evaluation summary assistance) | `SHARED` | Authoritative Blueprint v3.4.1 §14 (Shared staff productivity tooling) | Instructor Leader Dashboard -> AI Assistant Tab (`ai`) | Authenticated Cloudflare Worker proxy (`Authorization: Bearer <idToken>`) | `CONFORMS` | Read-only AI drafting assistant; zero direct database writes. |
| **`FP-IL-14`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:294-307`<br>`src/features/attendance/KioskModal.jsx:1-66`<br>`src/features/classes/ClassPhotoShare.jsx:1-164` | Attendance Kiosk Modal & Classroom Photo Sharing (`studentsOnly={true}`, WhatsApp redirect) | `PRIMARY` / `SHARED` | Authoritative Blueprint v3.4.1 §6.12 (Student attendance and parental engagement) | Sidebar Button -> "Attendance & Kiosk", and URL actions `?action=kiosk`, `?action=class-photo` | Enforced in rules: `attendance` creation allowed for instructor family (`firestore.rules:1021`) | `CONFORMS` | Full-screen modal for scanning students into active classes and sharing photos with parents via WhatsApp; staff scan locked out. |
| **`FP-IL-15`** | `instructorleader` (Cockpit Clutter) | `src/features/dashboard/InstructorLeaderDashboard.jsx:264`<br>`src/features/reports/ReportsDashboard.jsx:1-336` | Redundant Institutional Reports Tab Mount & Clutter in Leadership Cockpit | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, §7; OD-2, OD-STF-01; ADR 2026-10-13 Option B | Instructor Leader Dashboard -> Reports Tab (`reports`) | Disparate sub-tab queries; `TodayTab` fails on "All Campuses" | `MISPLACED / UNCLEAR` | **Finding 4.1:** Duplicates purpose-built academic tabs; mounts irrelevant receptionist logs (`today`) and personal shift logs (`staff`); mislabels tabs. |
| **`FP-IL-16`** | `instructorleader` (Data Privacy) | `src/features/reports/ReportsDashboard.jsx:31, 98-106` | Bulk Institutional Dataset CSV Export in Reports Dashboard (`canExportReports` check) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, §7.3; DOM05-PRIV-01; Ratified Decisions OD-OPS-02 / G-014, OD-FO-03 | Reports Tab -> Header -> Button "Export CSV Dataset" | Active in UI; triggers component CSV export of active sub-tab data | `MISPLACED / UNCLEAR` | **Finding 4.2:** Exposes bulk CSV download of student and staff PII to Instructor Leader, conflicting with data minimization principles. |
| **`FP-IL-17`** | `instructorleader` (Error Presentation) | `src/features/reports/ReportsDashboard.jsx:29, 63`<br>`src/features/reports/tabs/LearnerProgressTab.jsx:158-162` | Unscoped Province-Wide Query Collision & Denial-Looks-Like-Zero Failure | `INTENTIONALLY ABSENT` | `03-technical-audit-method.md` Dimension 6; `firestore.rules:1018, 320` | Reports Tab -> Sub-tab "students" ("Learner Progress") with default "All Campuses" filter | BLOCKED (403 / permission-denied) by security rules; swallowed in UI | `MISPLACED / UNCLEAR` | **Finding 4.3:** "All Campuses" executes unscoped queries for `/attendance` and `/users`. Rules reject; UI catch displays misleading affirmative empty zero state. |
| **`FP-IL-18`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:1138-1188` | Cashier Payment Intake & Tuition Transactions (`PaymentModal` / `PaymentCashierTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, §18; Ratified Decisions G-007, G-009, OD-2 | Fully unmounted in shell; zero payment intake controls | Enforced in rules: `canCreatePayment` denied to instructor family (`firestore.rules:1138-1188`) | `CONFORMS` | Cleanly omitted from cockpit; strict financial separation from Front Office and Executive cashiers. |
| **`FP-IL-19`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:329-335, 1204-1258` | Administrative Staff HR Actions, Role Elevations, Termination & Staff Leave Approvals | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, G-007, G-011 | Unmounted; Instructor Team view is read-only; no elevation triggers | Enforced in rules: `gateAllowsApprover` restricts staff actions to Director / Vice Director / Manager | `CONFORMS` | Administrative staff authority belongs strictly to Executive Leadership and Division Managers. |
| **`FP-IL-20`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:880-940` | Class Cohort Creation, Modification, Deletion & Room Scheduling | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §6.11; ADR 2026-10-13 Option B | Unmounted; Classes & Coverage is read-only; AvailableBatches mounted with `canEdit={false}` | Enforced in rules: `classes` create/update restricted to Admin, Ops Lead, and Satellite Course Manager | `CONFORMS` | Class cohort scheduling is owned by Operational Leader (Main Campus) and Course Division Manager (Satellites). |

---

## 3. Deep Dive on Academic Dual-Control Authority (`ApprovalInbox.jsx`)

The Instructor Leader's approval inbox (`ApprovalInbox.jsx`, mounted at `InstructorLeaderDashboard.jsx:265-277`) was evaluated against the ratified dual-control governance framework (G-006, G-007, G-012, and Blueprint v3.4.1 §15, §16, §26):

### 3.1 Gated Actions Strictly Assigned to the Instructor Leader
Under Ratified Decision G-007 and Blueprint §6.11, the Instructor Leader owns exactly two gated actions:
1. **`PLACEMENT_LEVEL_OVERRIDE` (Blocking Gate):** Triggered when a new student's diagnostic assessment or placement recommendation differs from default course levels, or when an extraordinary student is recommended for a multi-level jump (Decision 2026-10-13).
   - *Downstream Execution Path (`ApprovalInbox.jsx:145-156`):* Approving the ticket executes `applyApprovedPlacementOverride({ approval, actorUid: currentUid })`, which writes the approved level to the `/deskInquiries` lead document and marks the envelope applied (`markApprovalApplied`).
   - *Backend Binding (`firestore.rules:337`):* `gateAllowsApprover` permits decisions on `PLACEMENT_LEVEL_OVERRIDE` strictly when `approverRole in ['instructorleader', 'instructor_leader']`. Attempts by other roles (such as Front Office or Admin) to decide this ticket fail closed.
2. **`SUBSTITUTE_INSTRUCTOR` (Logged / Advisory Gate):** Triggered when an assigned class instructor is absent or unavailable and an alternate instructor covers the cohort.
   - *Downstream Execution Path (`ApprovalInbox.jsx:324-333`):* Approving the ticket marks the envelope applied in Firestore (`markApprovalApplied`) and records the decision audit trail.
   - *Backend Binding (`firestore.rules:338`):* `gateAllowsApprover` permits decisions on `SUBSTITUTE_INSTRUCTOR` strictly when `approverRole in ['instructorleader', 'instructor_leader']`.

### 3.2 Central Academic Lead Province-Wide Scope Enforcement (G-012)
- **Governance Requirement:** Under ADR 2026-10-13 (Ratified G-012), satellite branches (`bone_bolango`, `limboto`, `pohuwato`) operate as lean single-division campuses without an on-site Instructor Leader. Academic overrides and substitute instructor assignments originating at satellite branches must route to the Central Academic Lead at Main Campus (`kota_gorontalo`).
- **Subscription Query Implementation (`approvalsRepository.js:68-74`):**
  ```javascript
  } else if (normalizedRole === "instructorleader") {
    constraints.push(where("approverRole", "in", [APPROVAL_ROLES.INSTRUCTOR_LEADER, "instructor_leader", "instructorleader"]));
    // Central Academic Lead stationed at Kota Gorontalo holds province-wide pedagogical scope
    // over academic actions under ADR G-012. Branch filter only applies for non-central leads.
    if (normalizedBranch && normalizedBranch !== "kota_gorontalo") {
      constraints.push(where("approverBranchId", "==", normalizedBranch));
    }
  }
  ```
  When the Instructor Leader is stationed at `kota_gorontalo`, the subscription omits the `approverBranchId` filter, ensuring pending tickets from all branches appear in the leader's queue.
- **Backend Rules Enforcement (`firestore.rules:360-368`):**
  ```javascript
  let isCentralAcademicLead = (r in ['instructorleader', 'instructor_leader'])
    && (userBranch() == 'kota_gorontalo')
    && (data != null && 'actionId' in data && (data.actionId == 'PLACEMENT_LEVEL_OVERRIDE' || data.actionId == 'SUBSTITUTE_INSTRUCTOR'));
  let branchMatches = isExec || isCentralAcademicLead || (data != null && 'approverBranchId' in data
    ? data.approverBranchId == userBranch()
    : isSameBranch(data));
  ```
  Backend rules explicitly recognize `isCentralAcademicLead`: an Instructor Leader at `kota_gorontalo` is authorized to decide `PLACEMENT_LEVEL_OVERRIDE` and `SUBSTITUTE_INSTRUCTOR` tickets regardless of the originating `approverBranchId`.

### 3.3 Strict Prevention of Self-Approval & Cross-Gate Escalation
- **Self-Approval Prevention (`firestore.rules:662`):** `allow update` on `/approvals` requires `request.auth.uid != resource.data.requestedByUid`. If the Instructor Leader submits a substitute request for a class they teach, they are strictly blocked from approving it themselves. Verified in `instructorLeaderApprovalProbe.test.js:82-90`.
- **Cross-Gate Defense (`firestore.rules:328-344`):** If an approval envelope for a financial or administrative gate (e.g., `CASH_DISCREPANCY`, `DISCOUNT_OR_REFUND`, `STAFF_ROLE_ELEVATION`, `RETROACTIVE_STUDENT_ATTENDANCE`) erroneously sets `approverRole: 'instructorleader'`, `gateAllowsApprover` fails closed, preventing the Instructor Leader from deciding tickets outside their ratified domain. Verified in `instructorLeaderApprovalProbe.test.js:50-70`.

---

## 4. Detailed Static & Component Observations

### 4.1 Finding `FP-IL-15`: Redundant Institutional Reports Tab Mount & Cockpit Clutter
- **Component Location:** `src/features/dashboard/InstructorLeaderDashboard.jsx:264` mounts `<ReportsDashboard userBranch={effectiveBranch} isInstructorLeader={true} />` as Tab 9 (`reports`).
- **Problem Context & Root Cause Analysis:**
  Mounting `<ReportsDashboard>` in the Instructor Leader dashboard is an earlier workspace placement shortcut that introduces operational clutter and functional confusion:
  1. **Redundancy with Dedicated Academic Cockpits:**
     - Tab 1 (`LeaderOverview.jsx`), Tab 2 (`InstructorTeam.jsx`), Tab 3 (`ClassesCoverage.jsx`), Tab 4 (`AcademicProgressLeader.jsx`), and Tab 5 (`AttendanceActivity.jsx`) already provide dedicated, purpose-built academic monitoring surfaces with exception alerts, clash detection, and workload analytics.
     - Mounting `ReportsDashboard` duplicates student progress (`LearnerProgressTab`) and attendance monitoring (`TodayTab`), fragmenting the user experience.
  2. **Irrelevant Front-Desk Reception Monitoring:**
     - Sub-tab 1 (`TodayTab`) displays front-desk student check-in kiosk scans, expected arrivals, and missing students for reception follow-up. This is an operational front-desk intake workflow belonging to Front Office and the Operational Leader (`OpsLeadDashboard.jsx:199`), not academic pedagogical leadership.
  3. **Confusing Sub-Tab Mislabels Due to Missing Supervisor Context:**
     - In `ReportsDashboard.jsx:26`, `isSupervisor` is derived as:
       `const isSupervisor = isActualAdmin || isManager || isExecutiveView;`
     - Because `isInstructorLeader` was not included in `isSupervisor`, the component derives `isSupervisor = false`.
     - Consequently:
       - The staff duty tab button (line 137) renders as **"My Duty Log"** instead of "Staff Duty Logs".
       - The punctuality tab button (line 198) renders as **"My Punctuality"** instead of "Instructor Punctuality".
  4. **Duplication of Personal Shift History (Ratified `OD-STF-01`):**
     - Sub-tab 2 (`StaffDutyTab`) queries the leader's personal shifts (`fetchStaffShifts(effectiveSupervisor=false, ...)`).
     - Under Ratified Decision `OD-STF-01` (2026-10-17), personal staff shift history was formally relocated outside operational dashboards to the shared global staff profile (`ProfilePanel.jsx:PersonalAttendanceSection.jsx`). Housing it inside operational tabs was explicitly recognized as clutter and removed from `OpsLeadDashboard` (finding `FP-OPS-11B`).
- **Governance Impact:** Exposes redundant views, clutters operational focus, and invites confusion between academic leadership oversight and front-desk reception monitoring.

---

### 4.2 Finding `FP-IL-16`: Bulk Institutional Dataset CSV Export Authority Exposed in Reports
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:31, 98-106`.
- **Pre-Remediation Behavior:**
  - In `ReportsDashboard.jsx:31`:
    `const canExportReports = isExecutiveView || isManager || isInstructorLeader;`
  - When `isInstructorLeader === true`, the top-level header unconditionally renders:
    ```jsx
    <button onClick={handleExportCSV} className="... bg-emerald-600 ...">
      <Download className="w-3.5 h-3.5" />
      <span>Export CSV Dataset</span>
    </button>
    ```
  - Clicking this button executes `exportCSV()` on whichever sub-tab is active:
    - On `TodayTab`: exports student attendance scans, student names, classes, and check-in times.
    - On `StaffDutyTab`: exports staff names, roles, campus branches, and clock in/out times.
    - On `LearnerProgressTab`: exports student names, campus branches, enrolled classes, and diagnostic assessment scores.
    - On `InstructorPunctualityTab`: exports instructor names, branches, and monthly punctuality percentages.
- **Identified Policy Divergence & Privacy Risk:**
  - Under Ratified Decision `OD-OPS-02` (`G-014`, 2026-10-17) and DOM05-PRIV-01, bulk export of institutional student rosters and PII is restricted to Executive Leadership and Division Managers. Ops Leads were explicitly restricted from exporting bulk student roster CSVs while preserving on-screen visibility.
  - Exposing institutional CSV downloads across attendance and staff logs to the Instructor Leader creates an unnecessary bulk data exfiltration path on shared devices, conflicting with data minimization principles.

---

### 4.3 Finding `FP-IL-17`: Unscoped Province-Wide Query Collision & Denial-Looks-Like-Zero Failure
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:29, 63` and `src/features/reports/tabs/LearnerProgressTab.jsx:158-162`.
- **Observed Execution Path:**
  1. In `ReportsDashboard.jsx:29`, `canAccessProvinceScope` is defined as:
     `const canAccessProvinceScope = isExecutiveView || isInstructorLeader;`
  2. In line 63, `branchFilter` initializes with:
     `if (canAccessProvinceScope) return "all";`
  3. Consequently, when an Instructor Leader opens Tab 9 (`reports`), `branchFilter` defaults to `"all"`, and the branch selector exposes "All Campuses".
  4. When Sub-tab 3 (`LearnerProgressTab`) mounts, it calls `fetchStudentProgressData(..., branchId = null)`.
  5. In `reportsRepository.js:217-230`, when `normalizedBranchId` is null, `attendanceQuery` and `usersQuery` omit the `branchId` filter and attempt to scan across all branches.
  6. In `firestore.rules:1018` (`/attendance`) and `firestore.rules:320` (`/users`), list rules for non-executives enforce `isSameBranchStrict(resource.data)`. Because the query has no `branchId` filter, Firestore rejects the request with `Missing or insufficient permissions` (`permission-denied`).
  7. **Silent Failure (`LearnerProgressTab.jsx:158-162`):**
     ```javascript
     } catch (err) {
       console.error(err);
     } finally {
       setStudentsLoading(false);
     }
     ```
     The catch block merely logs to console and sets `studentsLoading = false`. The `students` state remains empty (`[]`), causing the UI to render:
     > *"No student progress records match the current filter range."*
- **Conformance Dimension 6 Failure:** Presenting a `permission-denied` security failure as a legitimate zero result ("0 students") directly violates the fail-closed reporting principle of `03-technical-audit-method.md` Dimension 6.

---

### 4.4 Observation `FP-IL-01B`: Missing `branch` Prop in Root Router Shell (`App.jsx`)
- **Component Location:** `src/App.jsx:598-603`.
- **Observed Behavior:**
  - For the Operational Leader, `App.jsx:608` mounts:
    `<OpsLeadDashboard role={effectiveRole} branch={branch} />`
  - For the Instructor Leader, `App.jsx:601` mounts:
    `<InstructorLeaderDashboard role={effectiveRole} />`
    The `branch` prop is omitted.
  - In `InstructorLeaderDashboard.jsx:42`, `branch` defaults to `""`.
  - In `useInstructorWorkspace.js:33`:
    `const effectiveBranch = branch || instructorBranch || "kota_gorontalo";`
  - Because `branch` is empty, `effectiveBranch` temporarily falls back to `"kota_gorontalo"` on initial render until the user's profile document snapshot loads from Firestore.
  - While this resolves dynamically once `instructorBranch` is populated, passing `branch={branch}` from `App.jsx` (which is already resolved from `userBranch`) would ensure immediate, deterministic branch mounting.

---

## 5. Open Governance Questions & Unresolved Policies

In accordance with `AGENTS.md` rules 4 and 15, the auditor must not infer authority or invent policy for unresolved areas. The following items require formal Owner Decisions:

### 5.1 [Owner Decision Required] Disposition of Redundant Tab 9 (`ReportsDashboard`)
- **Governance Context:** In `OpsLeadDashboard.jsx`, redundant Tab 10 (`FrontOfficeReportsTab`) was cleanly unmounted under Approved Option A (2026-10-17), eliminating duplicate cashier sub-tabs and de-cluttering operational command.
- **Decision Needed from Owner Kifry:** Should Tab 9 (`ReportsDashboard`) be unmounted from `InstructorLeaderDashboard.jsx`?
  - **Option A (De-clutter & Prune — Recommended):** Cleanly unmount Tab 9 from `InstructorLeaderDashboard.jsx`. Tabs 1–5 already provide purpose-built, secure academic monitoring (Overview, Team, Coverage, Progress, Attendance). Eliminates `permission-denied` errors on "All Campuses", eliminates redundant personal shift logs, and removes bulk CSV export risks.
  - **Option B (Retain & Restrict):** Retain Tab 9, but lock `canAccessProvinceScope` to false (locking to own branch), suppress bulk CSV export (`canExportReports = false`), and remove redundant sub-tabs.

### 5.2 [Owner Decision Required] Central Academic Lead Multi-Branch Monitoring Surface
- **Governance Context:** Blueprint v3.4 §4, §5, §6.11, and ADR 2026-10-13 establish the Instructor Leader at Kota Gorontalo as the Central Academic Lead with province-wide pedagogical scope. Currently, `ApprovalInbox` receives province-wide override and substitute requests, and `firestore.rules:1325, 1336` permits province-wide reads of `progressReports`. However, the dashboard cockpit (Tabs 1–5) queries only the leader's assigned branch (`effectiveBranch`).
- **Decision Needed from Owner Kifry:** Does the Central Academic Lead require a multi-branch switcher in the cockpit (e.g. to inspect class coverage or progress reports at satellite branches `bone_bolango`, `limboto`, `pohuwato`), or should satellite academic oversight remain event-driven through the dual-control `ApprovalInbox` (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`)?

### 5.3 [Owner Decision Required] Bulk CSV Dataset Export Policy for Central Academic Lead
- **Governance Context:** Under Ratified Decision `OD-OPS-02` / `G-014`, Ops Leads were restricted from exporting bulk student roster CSVs to prevent data leakage from shared front-desk hardware.
- **Decision Needed from Owner Kifry:** Does the Instructor Leader have a legitimate administrative need to export bulk student attendance and progress datasets to CSV, or should bulk CSV exports be restricted exclusively to Executive Leadership (Director, Vice Director) and Division Managers?

### 5.4 Governance Artifact Gap: Dedicated Teacher Evaluation Subsystem
- **Governance Context:** Blueprint v3.4.1 §6.11 establishes "teacher performance evaluations" as an Instructor Leader responsibility. As documented in `AcademicProgressLeader.jsx:202-219`, no dedicated teacher evaluation subsystem exists in the codebase (no observation rubric, no collection, no workflow).
- **Status:** Recorded as a known governance capability gap; student progress report recency currently serves as an operational proxy for teacher activity.

---

## 6. Remediation Roadmap & Handoff

When authorized by Owner Kifry in a separate implementation task, the following phased remediation is recommended:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Workspace De-cluttering & Report Pruning (Pending Owner Choice)               │
│   - Implement approved disposition for Tab 9 (Option A: Unmount ReportsDashboard).     │
│   - Remove unused imports and adjust tabs array in InstructorLeaderDashboard.jsx.      │
│   - Update InstructorLeaderDashboard.test.js tab count and snapshot assertions.        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Router Shell Prop Synchronization                                             │
│   - Update src/App.jsx:601 to pass branch={branch} to InstructorLeaderDashboard.       │
│   - Eliminates transient initial fallback to "kota_gorontalo".                         │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Fail-Closed Error Handling on Shared Reports (If Tab 9 Retained)              │
│   - If Option B is chosen: add explicit error state and alert banner to                │
│     LearnerProgressTab.jsx, eliminating the "Denial-Looks-Like-Zero" catch block.      │
│   - Restrict canAccessProvinceScope and canExportReports in ReportsDashboard.jsx.      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Verification Evidence & Exact Command Log

The following automated test suites were executed against the codebase to verify existing baseline functionality:

| Suite / Command | Scope & Purpose | Tests Executed | Passed | Failed | Skipped | Observed Result |
|---|---|---|---|---|---|---|
| `npm run typecheck` | TypeScript compiler check across entire repo (`tsc --noEmit`) | Full repo | All | 0 | 0 | **PASSED (0 errors)** in 2.01s |
| `npx vitest run src/features/dashboard/InstructorLeaderDashboard.test.js src/features/dashboard/instructor/ src/features/reports/ReportsDashboard.test.js src/features/shared/ApprovalInbox.test.js src/features/shared/usePendingApprovalsCount.test.js src/features/shared/approvalsRepository.test.js` | Component, hook, and repository unit tests for Instructor Leader, Reports, and Approvals | 8 test files | 76 | 0 | 0 | **PASSED (76/76 passed)** in 1.67s |
| `npx vitest run src/features/shared/securityRulesMatrix/` | Static security rules simulator matrix (Branch isolation, user authorization, division isolation, approvals) | 5 test files | 239 | 0 | 0 | **PASSED (239/239 passed)** in 278ms |
| `npx vitest run src/features/shared/instructorLeaderApprovalProbe.test.js` | Dedicated security probe testing Instructor Leader against peer approval gates | 1 test file | 8 | 0 | 0 | **PASSED (8/8 passed)** in 176ms |
| `src/features/shared/firestoreRulesEmulator/*.emulator.test.js` | Live Firestore security rules emulator test suites | 7 test files | 0 | 0 | 53 | **SKIPPED (53 tests skipped)** — Firestore emulator offline |

### Verification Notes:
- **Code Inspection vs. Runtime Execution:** Code paths, Firestore query shapes, and security rules were traced via direct code inspection. Unit and matrix assertions were verified via live local Vitest runs.
- **Production Boundary:** No deployment was performed; production Firebase rules and Cloudflare Worker endpoints were not tested.
- **Zero Modifications Made:** In accordance with audit instructions, zero files in `src/`, `firestore.rules`, or `docs/decisions/` were modified.
