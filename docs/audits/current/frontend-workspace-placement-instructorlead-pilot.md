# Frontend Workspace Placement Pass — Instructor Leader (`instructorleader`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** Instructor Leader / Central Academic Lead (`instructorleader`, `instructor_leader`) Workspace Cockpit  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4.1 (§4, §5, §6.11, §6.12, §15, §16, §18, §26 G-003, G-005, G-006, G-007, G-011, G-012, §41), Ratified Owner Decisions G-001–G-011 (2026-10-07), Branch Typology & Central Academic Lead Ratification (ADR 2026-10-13, G-012), Owner-Approved Progress Reports & Class Attendance Read Widening (2026-10-08), Ratified Progress Reports Read Access Decision `OD-OPS-01` (2026-10-17), Ratified Bulk Roster Export Restriction Decision `OD-OPS-02` (2026-10-17; scoped strictly to Ops Lead), and Ratified Staff Shift History Self-Service Decision `OD-STF-01` (2026-10-17)  
> **Audit Status:** `READ-ONLY AUDIT COMPLETE — CODE FINDINGS AND OPEN QUESTIONS RECORDED`  
> **Executive Readiness & Remediation Gating:** `REMEDIATION GATED BY OWNER DECISIONS` — The read-only audit is complete. A confirmed technical UI presentation failure (`FP-IL-17` error-to-empty-state) is documented for independent technical remedy. Policy-sensitive remediation choices regarding Tab 9 placement, bulk CSV export access, and cross-branch monitoring UX remain gated awaiting Owner Decisions.  
> **Verification Method:** Static code inspection of React components, routing shell, repository contracts, and Firestore security rules, coupled with Level 1 automated regression suites (TypeScript `npm run typecheck` passed with 0 errors; focused Vitest component & repository suite with 76 tests passed across 8 files; security rules matrix suites with 239 tests passed across 5 files; approval gate probe suite with 8 tests passed across 1 file). Firestore Rules emulator suites were skipped in offline Vitest runs, and live production behavior was not tested.

---

## 1. Audit Scope & Executive Summary

This report documents an end-to-end read-only inspection and automated test audit of the **Instructor Leader / Central Academic Lead (`instructorleader`)** workspace under the **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3).

### 1.1 Scope Boundaries & Operational Role Identity
- **Single Role Cockpit:** This inspection examines the Instructor Leader workspace mounted via `InstructorLeaderDashboard.jsx` in `src/App.jsx:598-603`. It evaluates the routing shell, 11 mounted tabs, nested components, shared controls, data queries, and underlying Firestore security rules.
- **Central Academic Lead Identity (Blueprint v3.4.1 §4, §5, §6.11, G-012):** Under the Authoritative Blueprint and Ratified Decision G-012 (ADR 2026-10-13), the Instructor Leader is based at the Main Campus (`kota_gorontalo`) and serves as the **Central Academic Lead** for the entire province. In this capacity, the role exercises province-wide pedagogical coordination scope across all physical campuses (Main Campus and Lean Satellite Branches) for:
  1. Province-wide curriculum standardization and pedagogical quality control;
  2. Teacher schedule assignments and coverage coordination;
  3. Teacher performance evaluations;
  4. Academic placement test overrides (`PLACEMENT_LEVEL_OVERRIDE`) and substitute instructor approvals (`SUBSTITUTE_INSTRUCTOR`).
- **Strict Separation from Branch Management & Operations (Blueprint §6.11, G-003, G-011):** The Instructor Leader belongs to the Teaching and Learning Structure, reporting operationally to the **Vice Director** (scheduling, coverage, substitute teaching) and strategically to the **Director** (pedagogy, curriculum standards). The Instructor Leader is a functional peer to the Division Managers and Operational Leader, **not** a Branch Manager, and holds zero general operational, administrative, or financial authority (no cashier intake, no cash discrepancy approval, no student tuition discounting, no staff termination, no class cohort deletion).
- **Dual Role Responsibilities (Leadership + Teaching Delivery):** Unlike pure administrative or operational roles, the Instructor Leader is also an active teaching instructor. Consequently, the workspace legitimately accommodates both **branch leadership oversight** (team monitoring, coverage, branch progress, branch attendance, dual-control approvals) and **personal educational delivery** (own class roster, personal attendance marking, evaluation form, lesson materials).

### 1.2 Executive Verdict & Remediation Gating
- **Audit Completion Status:** `READ-ONLY AUDIT COMPLETE — CODE FINDINGS AND OPEN QUESTIONS RECORDED`
- **Remediation Status:** `REMEDIATION GATED BY OWNER DECISIONS`
- **Detailed Evaluation:**
  - **The Read-Only Audit Is Complete:** The evaluation of all 11 tabs, underlying queries, security rules, and approval gates is fully executed and evidenced. Open governance questions do not prevent completing the audit itself.
  - **Confirmed Technical UI Failure (`FP-IL-17`):** The audit confirmed a concrete technical UI defect in `LearnerProgressTab.jsx`: catching failed queries with `console.error` and displaying `"No enrolled learners match your filters"`. This is an evidenced presentation failure (Denial-Looks-Like-Zero) that can be remediated with its own targeted technical fix (adding an explicit error state and alert banner) independently of any governance decision.
  - **Policy-Gated Remediation Areas:** Remediation implementation choices for the remaining areas cannot proceed without explicit Owner Decisions:
    1. **Tab 9 (`ReportsDashboard`) Placement:** Whether to unmount or retain/restrict Tab 9 is an open governance question (`[Owner Decision Required]`). Recommendations to prune or declutter are advisory guidance for the owner, not mandated policy rules.
    2. **Bulk CSV Dataset Export Policy:** Whether the Instructor Leader should have automated bulk CSV export capabilities remains unratified (`[Owner Decision Required]`). Decision `OD-OPS-02` applies strictly to Operational Leaders and preserved other roles' access; it cannot be applied by inference.
    3. **Central Academic Lead Multi-Branch UX Model:** Whether the Central Academic Lead requires an interactive campus switcher in the cockpit or continues relying exclusively on event-driven routing via the `ApprovalInbox` is an unresolved organizational design choice (`[Owner Decision Required]`).
    4. **Procedural Placement Methodology Ratification Status:** A documentation discrepancy between `docs/audits/Role & Business Logic Conformance Audit/00-README.md:89` (proposed pending review) and `03-technical-audit-method.md:88` (asserted as ratified on 2026-10-17) is submitted for owner clarification.

### 1.3 Summary of Findings & Observations
1. **Redundant Institutional Reports Tab Mount (Tab 9 Clutter / Usability Observation — `FP-IL-15`):** Tab 9 mounts `<ReportsDashboard userBranch={effectiveBranch} isInstructorLeader={true} />`. No accepted source explicitly defines its placement (`[Owner Decision Required]`). Static inspection shows practical operational clutter: it duplicates dedicated academic tabs (Tabs 1–5), mounts front-desk kiosk intake logs (`TodayTab`), and renders mislabeled supervisor buttons ("My Duty Log", "My Punctuality") due to `isSupervisor=false` in `ReportsDashboard.jsx`. Proposed options are advisory recommendations for owner consideration (Finding 4.1).
2. **Visible Bulk Institutional CSV Dataset Export Control (Policy Unresolved — `FP-IL-16`):** In `ReportsDashboard.jsx:31`, `canExportReports = isExecutiveView || isManager || isInstructorLeader;` renders a top-level bulk CSV export button. This control allows downloading data already loaded into the browser via authorized queries. It does not constitute confirmed unauthorized backend disclosure, because the Instructor Leader has approved read access to progress reports and same-branch attendance under security rules. Whether this role should have an automated bulk CSV download utility remains an unratified policy question (`[Owner Decision Required]`) (Finding 4.2).
3. **Unscoped Province-Wide Query Collision & Denial-Looks-Like-Zero UI Failure (`FP-IL-17`):** When "All Campuses" is selected in `ReportsDashboard`, queries to `/users` and `/attendance` omit `branchId` filters. Based on static evaluation against `firestore.rules:862` and `1018`, these unscoped list queries by a non-executive are expected to fail with `permission-denied` (HTTP 403). In `TodayTab.jsx:45`, this triggers an explicit error toast. In `LearnerProgressTab.jsx:158-162`, the error is swallowed by `console.error(err)` and the UI renders `"No enrolled learners match your filters"`, converting a query failure into an affirmative zero result (**Confirmed Technical UI Failure**, violating `03-technical-audit-method.md` Dimension 6) (Finding 4.3).
4. **Router Shell Prop Consistency Observation (`FP-IL-01B`):** In `src/App.jsx:601`, `<InstructorLeaderDashboard role={effectiveRole} />` omits `branch={branch}`. Static analysis shows that `useInstructorWorkspace.js:33` falls back to `"kota_gorontalo"`. Because the Instructor Leader is organizationally invariant to Kota Gorontalo under Blueprint §6.11 and G-012, this initial fallback matches the user's actual branch both before and after the profile loads. No wrong-scope requests, data leakage, or user-visible errors occur. Recorded strictly as a low-priority code-consistency observation (Observation 4.4).
5. **Procedural Methodology Ratification Discrepancy (`FP-IL-PROC-01`):** A status inconsistency exists between the BLRCA campaign README and §3 of the technical audit method regarding whether the placement procedure is formally ratified or proposed pending review (Finding 4.5).
6. **Robust Core Academic Leadership Workspaces (Tabs 1–5, 10):** Primary academic tabs (Overview, Team, Coverage, Progress, Attendance, Approvals) are purpose-built, fail closed, provide double-booking / clash detection, and strictly enforce backend authorization rules without leaking operational or financial mutation controls.

---

## 2. Standardized Frontend Placement Ledger (Instructor Leader Checks)

The following ledger documents all targeted structural checks evaluated for the Instructor Leader workspace, conforming strictly to the 10-column schema defined in [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.5:

| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
|---|---|---|---|---|---|---|---|---|---|
| **`FP-IL-01`** | `instructorleader` (Main Campus / Central) | `src/App.jsx:44-45, 598-603`<br>`src/features/dashboard/InstructorLeaderDashboard.jsx:1-311` | Instructor Leader Dashboard Shell Mount & Route Guard | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11; Ratified Decisions G-003, G-011 | Root app routing `/portal` when `effectiveRole in ['instructorleader', 'instructor_leader']` | Static rule & router inspection; passes component unit tests | `CONFORMS` | Core academic leadership shell baseline. Note: Router prop omission of `branch` in `App.jsx:601` is a low-priority code-consistency observation with zero observed scope leakage due to the Kota Gorontalo campus invariant (Observation 4.4). |
| **`FP-IL-02`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:106-128`<br>`src/features/dashboard/instructor/leader/LeaderOverview.jsx:1-390` | Academic Delivery Overview & Exception Cockpit (`WelcomeBanner`, Needs Attention, Today's Classes, Academic Health) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11; Ratified Decision G-003 | Instructor Leader Dashboard -> Overview Tab (`overview`) | Static rule inspection; passes component unit tests | `CONFORMS` | Exception-first landing screen; leads with unassigned cohorts, clashes, and overdue reports; zero direct mutations. |
| **`FP-IL-03`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:129-144`<br>`src/features/dashboard/instructor/leader/InstructorTeam.jsx:1-249` | Branch Teaching Team Workload & Activity Cockpit (Dual-division instructor cards, workload metrics, progress recency) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11 (All branch instructors report to Instructor Leader; G-003) | Instructor Leader Dashboard -> Instructor Team Tab (`team`), with team size badge | Enforced in rules (`firestore.rules:862`); verified via security rules matrix | `CONFORMS` | Read-only teaching team oversight across Courses & Kindergarten; HR actions, leave approvals, and role elevations omitted. |
| **`FP-IL-04`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:145-159`<br>`src/features/dashboard/instructor/leader/ClassesCoverage.jsx:1-373` | Class Capacity, Timetable Conflicts & Coverage Escalation (Double-booking engine, capacity warnings, level mismatches) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11 (Teacher schedule assignments, coverage coordination; G-003) | Instructor Leader Dashboard -> Classes & Coverage Tab (`coverage`), with missing instructor badge | Enforced in rules: `classes` read allowed (`firestore.rules:963`); class mutations omitted | `CONFORMS` | Detects teacher/room clashes and level mismatches; governed escalation boundary explicitly disclosed; no direct class edits. |
| **`FP-IL-05`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:161-182`<br>`src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx:1-223` | Branch Student Academic Progress Monitoring (Recent evaluations, scores, teacher remarks, stale instructor follow-up) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §41; Owner Decision 2026-10-08 | Instructor Leader Dashboard -> Academic Progress Tab (`progress`) | Enforced in rules: `progressReports` read widened for `isInstructorLeader()` (`firestore.rules:1325, 1336`) | `CONFORMS` | Scoped monitoring across both divisions (limit 100 docs); teacher evaluation gap explicitly disclosed; mutation controls omitted. |
| **`FP-IL-06`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/instructor/leader/AcademicProgressLeader.jsx:189-199`<br>`src/features/dashboard/instructor/InstructorProgress.jsx:1-228` | Personal Student Evaluation Delivery & History (`StudentProgressForm` for classes personally taught) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Direct educational delivery and progress reporting) | Embedded in Academic Progress Tab -> "My Own Teaching Evaluations" slot | Enforced in rules: `progressReports` create allowed for instructor of record (`firestore.rules:1337-1344`) | `CONFORMS` | Legitimate teaching capability; instructor leader authors assessments strictly for assigned cohorts. |
| **`FP-IL-07`** | `instructorleader` (Main Campus / Central) | `src/features/dashboard/InstructorLeaderDashboard.jsx:183-231`<br>`src/features/dashboard/instructor/leader/AttendanceActivity.jsx:1-202` | Branch Class Attendance Completion Monitoring (On-demand date query, % completion, incomplete sessions list) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, G-003; Owner Decision 2026-10-08 | Instructor Leader Dashboard -> Attendance Tab -> Sub-tab "Branch Monitoring" | Enforced in rules: `classAttendance` read allowed for `isSameBranch(classDoc)` (`firestore.rules:1115`) | `CONFORMS` | On-demand chunked read keeps Spark reads bounded; retroactive attendance edit omitted (reserved for Ops Lead / Vice Director). |
| **`FP-IL-08`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:202-230`<br>`src/features/attendance/InstructorAttendanceView.jsx:1-694` | Personal Class Attendance Marking & Session Close-Out (Session roster, manual attendance mark, camera scan) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Direct lesson delivery and attendance logging) | Instructor Leader Dashboard -> Attendance Tab -> Sub-tab "My Classes" | Enforced in rules: `classAttendance` create/update allowed for `isAssignedToClass` (`firestore.rules:1115`) | `CONFORMS` | Legitimate teaching capability; active instructor leader marks attendance for assigned classes; kiosk camera scanner embedded. |
| **`FP-IL-09`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:233-248`<br>`src/features/dashboard/instructor/InstructorClasses.jsx:1-287` | Personal Teaching Cohorts & Enrolled Roster (`StudentRoster` with `readOnly={true}`, `AvailableBatches`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §6.12 (Teaching instructor cohort management) | Instructor Leader Dashboard -> My Classes Tab (`classes`) | Enforced in UI props: `readOnly={true}`, `canExportRoster={false}`, `canEdit={false}` | `CONFORMS` | Roster editing and student status changes suppressed; parent PII hidden (`canViewParents={false}`); CSV export disabled. |
| **`FP-IL-10`** | `instructorleader` (Staff Operations) | `src/features/dashboard/InstructorLeaderDashboard.jsx:250-262`<br>`src/features/staff/StaffDirectivesWidget.jsx:1-352` | Faculty & Instructor Directives Inbox (Operational orders, due date badges, completion checkboxes) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, G-003 (Staff operational coordination under Vice Director operational control) | Instructor Leader Dashboard -> Directives Tab (`directives`), with pending count badge | Enforced in rules (`firestore.rules:986-1011` update completed status only) | `CONFORMS` | Pure completion tracking for directives issued by Executive / Division Manager leadership; directive authoring omitted. |
| **`FP-IL-11`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:263`<br>`src/features/classes/TeachingMaterial.jsx:1-225` | Personal Lesson Materials Bookmarks (External URLs, Google Drive, PDFs, YouTube links) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.12 (Lesson preparation tools for instructors) | Instructor Leader Dashboard -> Lesson Materials Tab (`materials`) | Enforced in rules: `/materials` scoped to `createdBy == auth.currentUser.uid` (`firestore.rules:1465-1472`) | `CONFORMS` | Personal bookmarks management. Note: Purely individual tool; does not provide province-wide curriculum distribution (Gap 5.5). |
| **`FP-IL-12`** | `instructorleader` (Central Academic Lead) | `src/features/dashboard/InstructorLeaderDashboard.jsx:265-277`<br>`src/features/shared/ApprovalInbox.jsx:1-878` | Academic & Faculty Dual-Control Approval Inbox (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.11, §15, §16; Ratified Decisions G-007, G-012 | Instructor Leader Dashboard -> Academic Approvals Tab (`approvals`), with pending count badge | Enforced in rules: `gateAllowsApprover` (`firestore.rules:337-338`); `isCentralAcademicLead` (`360-368`) | `CONFORMS` | Central Academic Lead province-wide scope verified; non-academic gates strictly blocked by rules; self-approval denied (`firestore.rules:1270`). |
| **`FP-IL-13`** | `instructorleader` (Shared Tooling) | `src/features/dashboard/InstructorLeaderDashboard.jsx:278`<br>`src/features/shared/AIAssistant.jsx:1-143` | Shared Staff AI Assistant (Message drafting, lesson & evaluation summary assistance) | `SHARED` | Authoritative Blueprint v3.4.1 §14 (Shared staff productivity tooling) | Instructor Leader Dashboard -> AI Assistant Tab (`ai`) | Authenticated Cloudflare Worker proxy (`Authorization: Bearer <idToken>`) | `CONFORMS` | Read-only AI drafting assistant; zero direct database writes. |
| **`FP-IL-14`** | `instructorleader` (Personal Teaching) | `src/features/dashboard/InstructorLeaderDashboard.jsx:294-307`<br>`src/features/attendance/KioskModal.jsx:1-66`<br>`src/features/classes/ClassPhotoShare.jsx:1-164` | Attendance Kiosk Modal & Classroom Photo Sharing (`studentsOnly={true}`, WhatsApp redirect) | `PRIMARY` / `SHARED` | Authoritative Blueprint v3.4.1 §6.12 (Student attendance and parental engagement) | Sidebar Button -> "Attendance & Kiosk", and URL actions `?action=kiosk`, `?action=class-photo` | Enforced in rules: `attendance` creation allowed for instructor family (`firestore.rules:1021`) | `CONFORMS` | Full-screen modal for scanning students into active classes and sharing photos with parents via WhatsApp; staff scan locked out. |
| **`FP-IL-15`** | `instructorleader` (Cockpit Placement) | `src/features/dashboard/InstructorLeaderDashboard.jsx:264`<br>`src/features/reports/ReportsDashboard.jsx:1-336` | Institutional Reports Tab Mount in Leadership Cockpit | `[Owner Decision Required]` | Unresolved placement. Blueprint §6.11 defines academic duties; no accepted source explicitly assigns or prohibits ReportsDashboard for Instructor Leader. | Instructor Leader Dashboard -> Reports Tab (`reports`) | Disparate sub-tab queries; `TodayTab` fails on "All Campuses" | `NEEDS CLARIFICATION / [Owner Decision Required]` | **Finding 4.1:** Evidence-based UI clutter and usability friction: duplicates academic tabs (1–5), mounts receptionist kiosk intake, and mislabels supervisor buttons due to `isSupervisor=false`. Advisory recommendations provided for owner consideration. |
| **`FP-IL-16`** | `instructorleader` (Data Policy) | `src/features/reports/ReportsDashboard.jsx:31, 98-106` | Bulk Institutional Dataset CSV Export in Reports Dashboard (`canExportReports` check) | `[Owner Decision Required]` | Unresolved export policy. `OD-OPS-02` restricted Ops Leads and explicitly preserved other roles' access (§2.1(4)); no accepted source defines Instructor Leader policy. | Reports Tab -> Header -> Button "Export CSV Dataset" | Active in UI; triggers component CSV export of active sub-tab data | `NEEDS CLARIFICATION / [Owner Decision Required]` | **Finding 4.2:** Visible export control downloads accessible records; not a confirmed unauthorized disclosure. Reassessed as UI Observation / Policy Question. |
| **`FP-IL-17`** | `instructorleader` (Error Presentation) | `src/features/reports/ReportsDashboard.jsx:29, 63`<br>`src/features/reports/tabs/LearnerProgressTab.jsx:158-162` | Unscoped Province-Wide Query Collision & Denial-Looks-Like-Zero UI Failure | `TECHNICAL DEFECT (UI PRESENTATION)` | `03-technical-audit-method.md` Dimension 6; `firestore.rules:862, 1018` | Reports Tab -> Sub-tab "students" ("Learner Progress") with default "All Campuses" filter | Expected rule rejection (403 / permission-denied) based on static query shape; UI swallows error | `CONFIRMED UI FAILURE` | **Finding 4.3:** "All Campuses" issues unscoped queries expected to fail rules. `LearnerProgressTab` silently swallows error and displays "No enrolled learners match your filters" (Denial-Looks-Like-Zero). Confirmed UI failure finding with independent remedy. |
| **`FP-IL-18`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:1176-1228` | Cashier Payment Intake & Tuition Transactions (`PaymentModal` / `PaymentCashierTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, §18; Ratified Decisions G-007, G-009, OD-2 | Fully unmounted in shell; zero payment intake controls | Enforced in rules: `canCreatePayment` denied to instructor family (`firestore.rules:1176`) | `CONFORMS` | Cleanly omitted from cockpit; strict financial separation from Front Office and Executive cashiers. |
| **`FP-IL-19`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:329-335, 1243-1310` | Administrative Staff HR Actions, Role Elevations, Termination & Staff Leave Approvals | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.11, G-007, G-011 | Unmounted; Instructor Team view is read-only; no elevation triggers | Enforced in rules: `gateAllowsApprover` restricts staff actions to Director / Vice Director / Manager | `CONFORMS` | Administrative staff authority belongs strictly to Executive Leadership and Division Managers. |
| **`FP-IL-20`** | `instructorleader` (Global Boundary) | `src/features/dashboard/InstructorLeaderDashboard.jsx`<br>`firestore.rules:963-985` | Class Cohort Creation, Modification, Deletion & Room Scheduling | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §6.11; ADR 2026-10-13 Option B | Unmounted; Classes & Coverage is read-only; AvailableBatches mounted with `canEdit={false}` | Enforced in rules: `classes` create/update restricted to Admin, Ops Lead, and Satellite Course Manager | `CONFORMS` | Class cohort scheduling is owned by Operational Leader (Main Campus) and Course Division Manager (Satellites). |

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
- **Self-Approval Prevention (`firestore.rules:1270`):** `allow update` on `/approvals` requires `request.auth.uid != resource.data.requestedByUid`. If the Instructor Leader submits a substitute request for a class they teach, they are strictly blocked from approving it themselves. Verified in `instructorLeaderApprovalProbe.test.js:82-90`.
- **Cross-Gate Defense (`firestore.rules:328-344`):** If an approval envelope for a financial or administrative gate (e.g., `CASH_DISCREPANCY`, `DISCOUNT_OR_REFUND`, `STAFF_ROLE_ELEVATION`, `RETROACTIVE_STUDENT_ATTENDANCE`) erroneously sets `approverRole: 'instructorleader'`, `gateAllowsApprover` fails closed, preventing the Instructor Leader from deciding tickets outside their ratified domain. Verified in `instructorLeaderApprovalProbe.test.js:50-70`.

---

## 4. Detailed Static & Component Observations

### 4.1 Finding `FP-IL-15`: Tab 9 (`ReportsDashboard`) Placement & Usability Observations
- **Component Location:** `src/features/dashboard/InstructorLeaderDashboard.jsx:264` mounts `<ReportsDashboard userBranch={effectiveBranch} isInstructorLeader={true} />` as Tab 9 (`reports`).
- **Classification:** `[Owner Decision Required]` / Usability Clutter Observation.
- **Audit Conclusion (Evidence-Backed):**
  Neither Authoritative Blueprint v3.4.1 nor any accepted owner decision explicitly assigns or excludes the institutional `ReportsDashboard` for the Instructor Leader. The role's placement here is an unresolved governance question (`[Owner Decision Required]`).
- **Observed UI Clutter & Usability Friction:**
  While not an established policy violation, static code inspection and UI review demonstrate practical operational clutter and functional confusion:
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
  4. **Duplication of Personal Shift History:**
     - Sub-tab 2 (`StaffDutyTab`) queries the leader's personal shifts (`fetchStaffShifts(effectiveSupervisor=false, ...)`).
     - Under Ratified Decision `OD-STF-01` (2026-10-17), personal staff shift history was formally relocated outside operational dashboards to the shared global staff profile (`ProfilePanel.jsx:PersonalAttendanceSection.jsx`).

#### Advisory Remediation Recommendations (Non-Binding Advice for Owner Consideration)
The options below represent advisory recommendations to assist the owner in deciding how to resolve this placement question. Neither the Authoritative Blueprint nor any existing decision mandates either option as a policy requirement:
- **Recommendation Option A (De-clutter & Prune):** Cleanly unmount Tab 9 from `InstructorLeaderDashboard.jsx`. Tabs 1–5 already provide purpose-built, secure academic monitoring (Overview, Team, Coverage, Progress, Attendance). This eliminates operational clutter, avoids `permission-denied` queries on "All Campuses", and removes unvetted bulk export buttons.
- **Recommendation Option B (Retain & Restrict):** Retain Tab 9, but lock `canAccessProvinceScope` to false (locking to own branch), suppress bulk CSV export (`canExportReports = false`), and remove redundant receptionist sub-tabs.

---

### 4.2 Finding `FP-IL-16`: Visible Bulk CSV Export Control in Reports Dashboard (Policy Unresolved)
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:31, 98-106`.
- **Classification:** `[Owner Decision Required]` / UI Usability Observation (Severity: `MEDIUM / POLICY QUESTION`).
- **Observed Behavior:**
  - In `ReportsDashboard.jsx:31`:
    `const canExportReports = isExecutiveView || isManager || isInstructorLeader;`
  - When `isInstructorLeader === true`, the top-level header renders a button:
    ```jsx
    <button onClick={handleExportCSV} className="... bg-emerald-600 ...">
      <Download className="w-3.5 h-3.5" />
      <span>Export CSV Dataset</span>
    </button>
    ```
  - Clicking this button executes `exportCSV()` on the active sub-tab (exporting student attendance scans, progress records, or punctuality logs currently rendered on the screen).
- **Distinction Between UI Control and Data Disclosure:**
  - This control downloads client-side records that the user's browser has already retrieved via authorized queries.
  - The Instructor Leader already has approved read access to progress reports (`firestore.rules:1325, 1336`) and same-branch attendance records (`firestore.rules:1018`).
  - Therefore, this is **not** a confirmed unauthorized backend disclosure or active security breach.
- **Clarification on Decision `OD-OPS-02`:**
  - Ratified Decision `OD-OPS-02` (`G-014`, 2026-10-17) explicitly applied to the **Operational Leader** (`opslead`), restricting bulk student roster CSV export while explicitly preserving other roles' existing access (§2.1(4): *"Do not change CSV export access for other roles"*).
  - `OD-OPS-02` does **not** establish or define an export restriction for the Instructor Leader.
  - Whether the Instructor Leader should have an automated bulk CSV export utility or should be restricted to on-screen viewing only (to minimize bulk PII harvesting on shared branch devices) remains an unratified policy question: `[Owner Decision Required]`.

---

### 4.3 Finding `FP-IL-17`: Unscoped Province-Wide Query Shape & Confirmed Denial-Looks-Like-Zero UI Failure
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:29, 63` and `src/features/reports/tabs/LearnerProgressTab.jsx:158-162`.
- **Classification:** `CONFIRMED TECHNICAL UI PRESENTATION FAILURE` (Severity: `MEDIUM`).
- **Static Query Shape & Expected Rule Outcome (Code Inspection):**
  1. In `ReportsDashboard.jsx:29`, `canAccessProvinceScope` evaluates to `true` for `isInstructorLeader`, initializing `branchFilter` to `"all"` (line 63).
  2. When Sub-tab 3 (`LearnerProgressTab`) mounts with `branchFilter === "all"`, it executes `fetchStudentProgressData(isExecutive=false, isFrontOffice=false, since, branchId=null, isManager=false, division=null)`.
  3. Inside `reportsRepository.js:231-236`, two independent queries omit the `branchId` filter when `normalizedBranchId` is null:
     - **Query A (`usersQuery`, `reportsRepository.js:213-215`):** Queries `collection(db, "users")` filtered only by `role in ['student']`, with NO `branchId` constraint.
       - *Expected Rule Outcome:* In `firestore.rules:862`, list access for non-executives requires `isSameBranchStrict(resource.data)`. Because Firestore queries must guarantee upfront that all documents satisfy the rule, this query shape is expected to be rejected with `permission-denied` (HTTP 403).
     - **Query B (`attendanceQuery`, `reportsRepository.js:227-229`):** Queries `collection(db, "attendance")` filtered only by `timestamp >= since`, with NO `branchId` constraint.
       - *Expected Rule Outcome:* In `firestore.rules:1018`, list access for non-executives requires `isSameBranchStrict(resource.data)`. Because the query omits `branchId`, it is expected to be rejected with `permission-denied` (HTTP 403).
  4. *Verification Note:* Because live Firebase emulator and production runtime execution were skipped in this audit pass, these backend rejections represent the **expected outcome derived from static analysis of the query shape against security rules**, rather than a live-tested denial.
- **Confirmed Technical UI Presentation Failure ("Denial-Looks-Like-Zero"):**
  - **In `LearnerProgressTab.jsx:158-162`:**
    ```javascript
    } catch (err) {
      console.error(err);
    } finally {
      setStudentsLoading(false);
    }
    ```
    Regardless of the reason for query failure (whether an expected permission-denied rejection, network timeout, or server error), the catch block swallows the error with only a `console.error` log. The `students` state remains empty (`[]`), and `studentsLoading` becomes `false`.
    - In lines 276-279, the component renders:
      > *"No enrolled learners match your filters."*
    - **Impact:** The UI converts an error into an affirmative business figure (zero students enrolled), misleading the user. This is an independently evidenced, confirmed technical UI defect violating Dimension 6 ("Interface-to-Enforcement Consistency & Fail-Closed Presentation") of [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md).
  - **Contrast with `TodayTab.jsx:43-46`:**
    In `TodayTab.jsx`, an unscoped `/attendance` query is also expected to fail rules, but `TodayTab.jsx:45` executes `toast("Error loading today's scans: " + err.message, "error")`, surfacing an explicit error toast to the user rather than silently presenting false zeros.
- **Remediation Independence:**
  Fixing this UI presentation defect (adding an explicit error state and alert banner with retry in `LearnerProgressTab.jsx`) is a standard technical bug fix that does not depend on, nor wait for, owner governance decisions on Tab 9.

---

### 4.4 Observation `FP-IL-01B`: Router Shell Prop Consistency (`App.jsx`)
- **Component Location:** `src/App.jsx:598-603`.
- **Classification:** `OBSERVATION (CODE CONSISTENCY)` (Severity: `LOW / INFO`).
- **Observed Behavior & Impact Analysis:**
  - In `src/App.jsx:601`, `<InstructorLeaderDashboard role={effectiveRole} />` omits `branch={branch}` (unlike `OpsLeadDashboard` in line 608 which passes `branch={branch}`).
  - In `InstructorLeaderDashboard.jsx:42`, `branch` defaults to `""`.
  - In `useInstructorWorkspace.js:33`:
    `const effectiveBranch = branch || instructorBranch || "kota_gorontalo";`
  - When mounted without `branch`, `effectiveBranch` momentarily falls back to `"kota_gorontalo"` during the initial render before `useInstructorRoster()` asynchronously loads `instructorBranch` from the user profile.
- **Qualification Against Organizational Invariant:**
  - Under Authoritative Blueprint v3.4.1 §4, §5.5, §6.11 and Ratified Decision G-012 (ADR 2026-10-13), the branch network is partitioned such that Main Campus (`kota_gorontalo`) is the **sole campus staffed with an Instructor Leader**. Lean Satellite branches (`bone_bolango`, `limboto`, `pohuwato`) operate with Course Division Managers and instructors only; they do not have an Instructor Leader.
  - Because the Instructor Leader is organizationally invariant to Kota Gorontalo, falling back to `"kota_gorontalo"` during the initial render matches the user's actual branch. Even in the brief profile-loading window, initial queries target the correct campus.
  - *Qualification:* If an Instructor Leader were ever assigned to a different campus in future unratified models, queries during the brief profile-loading window would momentarily target Kota Gorontalo before flipping. Under the current ratified model, however, this fallback is organizationally harmless.
- **Conclusion:** There is **zero wrong-scope query execution, zero data leakage, and zero user-visible error**. Retained strictly as a low-priority code-consistency observation, not a confirmed defect. Passing `branch={branch}` is recommended purely for uniform prop-passing conventions across dashboards.

---

### 4.5 Finding `FP-IL-PROC-01`: Procedural Placement Methodology Ratification Status Discrepancy
- **Component Location:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md:89`](../Role%20&%20Business%20Logic%20Conformance%20Audit/00-README.md#L89) vs [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md:88`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md#L88).
- **Classification:** `PROCEDURAL DISCREPANCY` (Severity: `LOW / CLARIFICATION`).
- **Observed Inconsistency:**
  - In `00-README.md:89`, §3 is described in the modular file index as:
    > *"proposed Frontend Workspace Placement Pass (`[NEW — PENDING OWNER REVIEW]`)"*
  - In `03-technical-audit-method.md:88`, the section header declares:
    > *"Status: RATIFIED AUTHORITATIVE METHODOLOGY — APPROVED BY OWNER KIFRY (2026-10-17)."*
  - Simultaneously, `03-technical-audit-method.md:4` states:
    > *"Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified."*
- **Governance Action:** In accordance with `AGENTS.md` rules, this audit documents the textual discrepancy without modifying either canonical file, submitting the question to Owner Kifry to clarify which status is authoritative.

---

## 5. Open Governance Questions & Unresolved Policies

In accordance with `AGENTS.md` and `advisor-auditor.md`, the auditor does not invent policy or choose between operational options. The following items require formal Owner Decisions to guide future remediation:

### 5.1 [Owner Decision Required] Disposition of Tab 9 (`ReportsDashboard`)
- **Context:** In `OpsLeadDashboard.jsx`, redundant Tab 10 (`FrontOfficeReportsTab`) was unmounted under an approved owner choice (2026-10-17), eliminating duplicate cashier sub-tabs and de-cluttering operational command. For Instructor Leader, Tabs 1–5 already provide dedicated academic tracking.
- **Advisory Options for Owner Consideration:**
  - **Option A (De-clutter & Prune — Advisory Recommendation):** Cleanly unmount Tab 9 from `InstructorLeaderDashboard.jsx`. Tabs 1–5 already provide purpose-built academic monitoring (Overview, Team, Coverage, Progress, Attendance). Eliminates operational clutter, avoids `permission-denied` queries on "All Campuses", and removes bulk CSV export risks.
  - **Option B (Retain & Restrict — Alternative Option):** Retain Tab 9, but lock `canAccessProvinceScope` to false (locking to own branch), suppress bulk CSV export (`canExportReports = false`), and remove redundant receptionist sub-tabs.

### 5.2 [Owner Decision Required] Central Academic Lead Multi-Branch Monitoring Surface
- **Context:** Blueprint v3.4 §4, §5, §6.11, and ADR 2026-10-13 establish the Instructor Leader at Kota Gorontalo as the Central Academic Lead with province-wide pedagogical scope. Currently, `ApprovalInbox` (Tab 10) receives province-wide override and substitute requests, and `firestore.rules:1325, 1336` permits province-wide reads of `progressReports`. However, the dashboard cockpits (Tabs 1–5) query only the leader's assigned branch (`effectiveBranch`).
- **Decision Needed from Owner Kifry:**
  Does the Central Academic Lead require an interactive multi-branch switcher in the cockpit (e.g. to inspect class coverage or progress reports at satellite branches `bone_bolango`, `limboto`, `pohuwato`), or should satellite academic oversight remain event-driven through the dual-control `ApprovalInbox` (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`)?

### 5.3 [Owner Decision Required] Bulk CSV Dataset Export Policy for Central Academic Lead
- **Context:** Under Ratified Decision `OD-OPS-02` / `G-014`, Ops Leads were restricted from exporting bulk student roster CSVs to prevent data leakage from shared front-desk hardware, while other roles' access was preserved.
- **Decision Needed from Owner Kifry:**
  Does the Instructor Leader have a legitimate administrative need to export bulk student attendance and progress datasets to CSV, or should bulk CSV exports be restricted exclusively to Executive Leadership (Director, Vice Director) and Division Managers?

### 5.4 [Owner Decision Required] Procedural Placement Methodology Status Confirmation
- **Context:** `00-README.md:89` describes the Frontend Workspace Placement Pass as proposed pending owner review, while `03-technical-audit-method.md:88` describes it as ratified on 2026-10-17.
- **Decision Needed from Owner Kifry:**
  Please confirm whether §3 of `03-technical-audit-method.md` is ratified as binding methodology or remains a proposed audit extension.

### 5.5 Governance Artifact Gap: Dedicated Teacher Evaluation Subsystem
- **Context:** Blueprint v3.4.1 §6.11 establishes "teacher performance evaluations" as an Instructor Leader responsibility. As documented in `AcademicProgressLeader.jsx:202-219`, no dedicated teacher evaluation subsystem exists in the codebase (no observation rubric, no collection, no workflow).
- **Status:** Recorded as a known capability gap; student progress report recency currently serves as an operational proxy for teacher activity.

---

## 6. Remediation Roadmap & Handoff

> [!IMPORTANT]
> **Audit Boundary Enforcement:**
> No remediation code was written or executed during this audit. The remediation sequence is bifurcated below into an independent technical fix and policy-gated tracks:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TRACK A: Independent Technical Bug Fixes (Can Proceed Independently)                   │
│   - LearnerProgressTab.jsx (FP-IL-17): Add explicit error state and alert banner with  │
│     retry, eliminating the Denial-Looks-Like-Zero presentation on query failure.       │
│   - App.jsx:601 (FP-IL-01B): Pass branch={branch} defensively for uniform convention.  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TRACK B: Policy-Gated Remediation (Awaiting Owner Decisions)                           │
│   - Tab 9 Placement (Decision 5.1): Implement approved option (Option A unmount, or    │
│     Option B retain & restrict).                                                       │
│   - Export Policy (Decision 5.3): Configure canExportReports toggle accordingly.       │
│   - Multi-Branch UX (Decision 5.2): Implement campus switcher if approved.             │
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

### Verification Notes & Audit Boundaries:
- **Code Inspection vs. Runtime Execution:** Code paths, Firestore query shapes, and security rules were traced via direct static code inspection. Unit and matrix assertions were verified via live local Vitest runs.
- **Rule Enforcement Phrasing:** Unscoped query rejections are classified as expected rule outcomes based on static rule evaluation, noting that live emulator tests were skipped.
- **Production Boundary:** No deployment was performed; live production Firebase rules and Cloudflare Worker endpoints were not tested.
- **Zero Modifications Made:** In accordance with audit instructions, zero files in `src/`, `firestore.rules`, or `docs/decisions/` were modified.
