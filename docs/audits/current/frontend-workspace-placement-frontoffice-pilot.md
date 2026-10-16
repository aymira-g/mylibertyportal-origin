# Frontend Workspace Placement Pass — Front Office (`frontoffice`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** Front Office (`frontoffice`) Workspace Pilot (Courses, Kindergarten, and Cross-Divisional)  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4 (§5.0.1, §5.0.2, §5.3, §6.9, §15, §16, §17, §18), Ratified Decision OD-2 (§26), OD-3, OD-4, ADR 2026-10-13, and OD-IL-ENF2  
> **Status:** SCOPED PILOT REPORT — STRICT READ-ONLY AUDIT MODE  
> **Verification Method:** Static code inspection of React components, routing, repository contracts, and Firestore security rules (*Runtime behavior not tested; not runtime-confirmed*)  

---

## 1. Pilot Scope & Executive Summary

This pilot report documents a scoped, read-only static inspection of the **Front Office (`frontoffice`)** workspace under the approved **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3).

### 1.1 Scope Boundaries & Limitations
- **Single Role Pilot:** This inspection is strictly focused on the Front Office (`frontoffice`) role across its operational surfaces: Courses Front Office (`FrontOfficeDashboard.jsx`), Kindergarten Front Office (`KidsFrontOfficeDashboard.jsx`), and Cross-Divisional Desk (`CrossDivDashboard.jsx`). It evaluates the components, routes, shared tools, and Firestore security rules that govern what Front Office users can see and do.
- **Independence from Admin Decision `OD-ADM-01`:** In accordance with audit instructions, Owner Decision `OD-ADM-01` applies specifically to System Admin and the four named report views. It is not extended to Front Office. Front Office operational data access is evaluated on its own merits under Authoritative Blueprint v3.4 §6.9, §18, and related ratified decisions.
- **Evidence Standard (Static Observations Only):** Findings and ledger entries are based strictly on static code inspection of component trees, prop pass-downs, event handlers, and Firestore security rules. Because live browser sessions and Firestore emulator test runs were not executed during this pilot pass, **all findings are preserved as static observations and are NOT runtime-confirmed**. All backend enforcement outcomes are designated as **"static rule inspection; runtime behavior not tested"**.
- **Strict Read-Only Audit Boundaries:** No application code (`src/`), security rules (`firestore.rules`), tests, or canonical governance documents were modified during this audit. All remediation recommendations are deferred to a separate authorized implementation task.
- **No Campaign Completion Claim:** This pilot constitutes one role inspection under the Frontend Workspace Placement Pass and does not mark the full pass or the BLRCA campaign complete.

---

## 2. Standardized Frontend Placement Ledger (Front Office Checks)

The following ledger documents all targeted structural checks evaluated for the Front Office workspace, conforming strictly to the 10-column schema defined in [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.5:

| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
|---|---|---|---|---|---|---|---|---|---|
| **`FP-FO-01`** | `frontoffice` (branch) | `src/features/dashboard/FrontOfficeDashboard.jsx:125-306` | Front Desk Overview Cockpit (`WelcomeBanner`, `TuitionDueWidget`, Desk Needs Attention alert, `TodayScheduleBoard`, WhatsApp Invite Sender, Quick Actions, `AvailableBatches` widget) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9 (Walk-in inquiries, parent communications, tuition due awareness) | Front Office Dashboard -> Overview Tab (`overview`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Core front desk reception baseline (Check 1 & 2: Route & shell) |
| **`FP-FO-02`** | `frontoffice` (branch) | `src/features/dashboard/frontoffice/PaymentCashierTab.jsx:1-422`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:311-321` | Cashier & Finance Desk Tab (Direct payment intake, recent 50 transactions, WhatsApp receipt resending, daily shift reconciliation banner) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9, §18 (Normal tuition-fee collection, operational payment maker); Ratified Decision OD-2 | Front Office Dashboard -> Cashier & Finance Tab (`cashier`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:1138-1188`) | `CONFORMS` | Payment intake is bounded to branch/division; sensitive voids and discounts require approval envelopes |
| **`FP-FO-03`** | `frontoffice` (branch) | `src/features/dashboard/frontoffice/WalkInInquiryTab.jsx:1-536`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:323-333` | Guestbook & Inquiries Tab (Visitor inquiry logging, status pipeline, WhatsApp follow-up, placement test modal launcher, prospect-to-student enrollment) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9 (Walk-in and online inquiries, placement-test scheduling); OD-IL-ENF2 | Front Office Dashboard -> Guestbook & Inquiries Tab (`inquiries`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:1190-1202`) | `CONFORMS` | Front Office logs inquiries; placement level overrides require Instructor Leader approval (`OD-IL-ENF2`) |
| **`FP-FO-04`** | `frontoffice` (branch) | `src/features/students/StudentApplications.jsx:1-409`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:335-347` | Student Admissions Applications Cockpit (Admissions review, placement confirmation, cohort assignment, soft-reject archiving) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9 (Student enrollment handling) | Front Office Dashboard -> Applications Tab (`applications`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:890-896`) | `CONFORMS` | `canPermanentDelete=false` enforced; permanent deletion restricted to Director/Vice Director (`firestore.rules:894`) |
| **`FP-FO-05`** | `frontoffice` (branch) | `src/features/students/StudentRoster.jsx:1-673`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:349-366` | Student Roster Management (Student record display, payment health indicators, linked parent accounts, student profile editing, cohort reassignment) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9 (Student enrollment handling, parent communications); §15 (Maker–Checker) | Front Office Dashboard -> Students Tab (`students`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:820-873`) | `CONFORMS` | `canEditStatus=false` passed; deactivating status changes trigger `STUDENT_WITHDRAWAL_OR_FREEZE` approval request (`StudentRoster.jsx:110`) |
| **`FP-FO-06`** | `frontoffice` (branch) | `src/features/classes/ClassManager.jsx:1-414`<br>`src/features/classes/AvailableBatches.jsx:1-463`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:368-379` | Classes & Cohort Rosters Tab (Timetable schedules, classroom occupancy, student enrollment/transfer into batches) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9 (Student enrollment handling); ADR 2026-10-13 Option B | Front Office Dashboard -> Classes Tab (`classes`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:898-945`) | `CONFORMS` | `canSchedule=false` and `canDelete=false` cleanly disable cohort creation/deletion; Front Office can only enroll/transfer students (`canEnroll=true`, `diffKeys.hasOnly(['studentIds', 'enrollments', 'updatedAt'])`) |
| **`FP-FO-07`** | `frontoffice` (branch) | `src/features/attendance/CorporateEventsPanel.jsx:1-391`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:381-384` | Corporate Events Management Tab (Workshop, training, and company meeting scheduling & cancellation) | `INFORMATIONAL` | Authoritative Blueprint v3.4 §6.8, §6.9; Ratified Owner Decision OD-FO-01 | Front Office Dashboard -> Events Tab (`events`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:1000-1050`) | `CONFORMS` | Retained as read-only informational calendar (`canCreate={false}`, `canCancel={false}`); backend create/cancel rules restricted (OD-FO-01) |
| **`FP-FO-08`** | `frontoffice` (branch) | `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:1-403`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:386-394` | Dedicated Front Office Reports Cockpit (Cash Register Reconciliation, Today's Inquiry Count, Personal Shift Log) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9, §18 (Normal cash drawer balancing, daily reception activity) | Front Office Dashboard -> Reports Tab (`reports`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Courses Front Office uses dedicated, privacy-isolated tab; cross-branch financials, academic progress, and peer staff duty logs are omitted |
| **`FP-FO-09`** | `frontoffice` (branch) | `src/features/shared/ApprovalInbox.jsx`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:308-431` (complete tab array) | Operational Approval Inbox (`ApprovalInbox`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §6.9, §7.3, §15, §16 (Maker–Checker separation of duties); OD-2, OD-4 | Inspected complete `tabs` array in `FrontOfficeDashboard.jsx:308-431`; `ApprovalInbox` is completely unmounted | *static rule inspection; runtime behavior not tested* (`firestore.rules:1204-1258`) | `CONFORMS` | Front Office acts strictly as Maker (submitting envelopes for discounts, voids, withdrawals, placement overrides); approval authority belongs to Leaders/Executives |
| **`FP-FO-10`** | `frontoffice` (branch) | `src/features/staff/InvitesPanel.jsx`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:308-431` (complete tab array) | Staff Onboarding Invitation Generation (`InvitesPanel`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §6.9, §7.2 (Staff account provisioning is technical admin / leadership) | Inspected complete `tabs` array in `FrontOfficeDashboard.jsx:308-431`; `InvitesPanel` is unmounted; `unsubInvites` is disabled under `restrictedRead` (`useDashboardData.js:366`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:875-888`) | `CONFORMS` | Front Office cannot generate staff invites; `useDashboardData.js:366` skips invites listener |
| **`FP-FO-11`** | `frontoffice` (branch) | `src/features/attendance/KioskModal.jsx:1-120`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:462, 467-472` | Reception Student Attendance Scan Station (`KioskModal`) | `SHARED` | Authoritative Blueprint v3.4 §6.9 (Daily reception attendance monitoring) | Front Office Dashboard -> Sidebar Button "Reception Kiosk" or URL action `#attendance` | *static rule inspection; runtime behavior not tested* (`firestore.rules:974-998`) | `CONFORMS` | `studentsOnly={true}` enforced on Front Office modal; staff badge scanning is separated |
| **`FP-FO-12`** | `frontoffice` (branch) | `src/features/finance/PaymentModal.jsx:1-605`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:478-483` | Direct Payment Modal, Installment Tracker & Digital Receipts (`PaymentModal`) | `PRIMARY` | Authoritative Blueprint v3.4 §6.9, §18; OD-3 | Triggered from Overview Tuition Due widget, Cashier Tab, or Student Roster | *static rule inspection; runtime behavior not tested* (`firestore.rules:1138-1188`) | `CONFORMS` | Normal payments recorded directly; custom discounts (>0) trigger approval envelope (`PaymentModal.jsx:298-305`); void requests route through approval queue (`PaymentModal.jsx:425-450`) |
| **`FP-FO-13`** | `frontoffice` (branch) | `firestore.rules:1280`<br>`src/features/students/progressReportsRepository.js:77-100`<br>`src/features/students/StudentRoster.jsx:284-312` | Progress Reports Update & Deletion Authority in Security Rules | `CONDITIONAL` | Authoritative Blueprint v3.4 §6.9, §7.3; Ratified Owner Decision OD-FO-02 | Student Roster -> Action Column -> "Promote" button triggers `promoteStudentLevel`, writing directly to `progressReports` | *static rule inspection; runtime behavior not tested* (`firestore.rules:1280`) | `CONFORMS` | Promotion execution confirmed for Front Office; security rules hardened to strip delete authority and restrict updates strictly to promotion flags (OD-FO-02) |
| **`FP-FO-14`** | `frontoffice` (kindergarten) | `src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx:330-335`<br>`src/features/reports/ReportsDashboard.jsx:31, 98-106, 157-169` | Kindergarten Front Office Reports Tab Inconsistency & Bulk CSV Export | `PRIMARY` | Blueprint v3.4 §5.0.1, §6.9; Ratified Owner Decision OD-FO-03 | Kids Front Office Dashboard -> Reports Tab (`reports`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Kindergarten front desk unified with dedicated `FrontOfficeReportsTab` with end-to-end division scoping; bulk CSV export removed (OD-FO-03) |
| **`FP-FO-15`** | `frontoffice` (branch) | `src/features/staff/TasksPanel.jsx:1-493`<br>`src/features/dashboard/FrontOfficeDashboard.jsx:396-410` | Front Desk Maintenance & Operational Tasks Panel (`TasksPanel`) | `SHARED` | Authoritative Blueprint v3.4 §6.8, §6.9 (Operational coordination and daily desk todo tracking) | Front Office Dashboard -> Tasks Tab (`misc`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:947-972`) | `CONFORMS` | Desk staff can create branch todos and complete assigned directives; cannot reopen or edit completed directives without supervisor authority (`canUpdateTodo`) |

---

## 3. Detailed Static Observations & Placement Findings

> [!IMPORTANT]
> The following findings are preserved strictly as **preliminary static observations** derived from source code and security rule inspection. Because neither live browser UI sessions nor Firestore emulator query runs were performed during this pilot pass, **these observations are not runtime-confirmed**. Concrete rendered states, network error codes, and visual layouts remain subject to dynamic verification during a separate authorized implementation task.

### 3.1 Observation `FP-FO-07`: Corporate Events Scheduling Panel in Front Office Cockpit
- **Component Location:** `src/features/dashboard/FrontOfficeDashboard.jsx:381-384`, `src/features/attendance/CorporateEventsPanel.jsx:1-391`, and `firestore.rules:1000-1050`.
- **Observed Static Implementation (UI Visibility & Actions):**
  - In `FrontOfficeDashboard.jsx:381-384`, `<CorporateEventsPanel />` is mounted directly under top-level tab ID `events` with label "Events".
  - In `CorporateEventsPanel.jsx:29-33`, the prop `canCreate` defaults to `true`. Because `FrontOfficeDashboard` does not pass `canCreate={false}`, the "+ New Event" button is rendered and clickable for Front Office staff.
  - Front Office users can open `CorporateEventModal.jsx`, input an event name, select event dates, configure times and overnight flags, define audience targets (`all`, `branch`, `role`, `division`), and submit new events.
  - Furthermore, on existing active events, Front Office users can click the "Cancel Event" button (`cancelCorporateEvent`), which updates event status to `"cancelled"`.
- **Backend Data Access (Static Rules Observation):**
  - In `firestore.rules:1020-1029`, under `match /corporateEvents/{eventId}`:
    ```firestore
    allow create: if ...
      || (
        (isManager() || isOpsLead() || isFrontOffice())
        && request.resource.data.audienceType == 'branch'
        && ...
      )
    ```
  - In `firestore.rules:1034-1049`, `isFrontOffice()` is also explicitly permitted to `update` and `delete` (or cancel) branch-scoped corporate events.
  - *Runtime Verification Status:* Static rule observation only; live event creation from a Front Office session was not dynamically tested.
- **Governance Context & Boundary Distinction:**
  - Authoritative Blueprint v3.4 §6.9 defines Front Office responsibilities as: *walk-in inquiries, online inquiries, placement-test scheduling, student enrollment handling, tuition-fee collection, parent communications*.
  - Scheduling organizational workshops, faculty meetings, official company closures, or branch-wide training sessions is an operational and supervisory function belonging to the **Operational Leader** (Blueprint §6.8: "site logistics; operational coordination"), **Division Managers** (§6.4/§6.5), or the **Executive** (§6.1/§6.2).
  - Mounting an organizational meeting administration panel with branch-scoped create/cancel access in the Front Office cockpit appears misplaced. It clutters the front-desk reception interface with management directives and risks accidental cancellation or unsanctioned scheduling of branch calendar events.
- **Outcome Status:** **`MISPLACED / UNCLEAR` [Owner Decision Required]**.

---

### 3.2 Observation `FP-FO-13`: Front Office Academic `progressReports` Write/Delete Rule Over-Grant
- **Component Location:** `firestore.rules:1260-1281`, `src/features/students/progressReportsRepository.js:77-100`, and `src/features/students/StudentRoster.jsx:284-312`.
- **Observed Static Implementation (UI Visibility & Actions):**
  - In `StudentRoster.jsx:284-312`, if a student has an instructor evaluation with `eligibleForPromotion: true`, an action button labeled `"Promote"` is rendered.
  - Clicking `"Promote"` invokes `handlePromote()`, which calls `promoteStudentLevel(student.id, nextLevel, report.id)`.
  - In `progressReportsRepository.js:77-100`, `promoteStudentLevel` performs an atomic Firestore `writeBatch` that updates the student profile (`users/{studentId}`) to `currentLevel = nextLevel` AND updates the academic evaluation document (`progressReports/{reportId}`) to `eligibleForPromotion = false, promotedAt = serverTimestamp()`.
  - It also calls `clearStudentPendingPromotions(studentId)`, which queries and updates all eligible `progressReports` docs for that student.
- **Backend Data Access (Static Rules Observation):**
  - In `firestore.rules:1280`, under `match /progressReports/{reportId}`:
    ```firestore
    allow update, delete: if isOrgExecutive() || ((isManager() || isFrontOffice()) && isSameBranch(resource.data) && isDivisionAllowedForManager(resource.data));
    ```
  - Backend security rules grant `isFrontOffice()` unrestricted `update` and `delete` authority over progress report documents in their branch and division.
  - *Runtime Verification Status:* Static rule observation only; direct malicious or accidental document deletion from a Front Office client was not dynamically tested.
- **Governance Context & Boundary Distinction:**
  - Authoritative Blueprint v3.4 §6.9 and §7.3 establish that Front Office holds zero academic, grading, or teaching authority.
  - Academic progress reports (`progressReports`) are official pedagogical evaluations created by teaching instructors and supervised by the Central Academic Lead / Instructor Leader (OD-IL-ENF1, Blueprint §6.11).
  - While Front Office legitimately records student administrative details and assists with class enrollment, granting Front Office broad update and delete permissions over instructor academic evaluations in `firestore.rules:1280` represents an over-grant.
  - Whether Front Office should execute level advancements directly or whether promotion processing belongs exclusively to academic roles (Instructor Leader or Division Manager) is an open governance question. Detailed security rule design—including how to preserve cross-document atomic batch invariants between `users` and `progressReports`—is deferred until the authorized actor and workflow are settled by owner decision and all callers have been traced.
- **Outcome Status:** **`MISPLACED / UNCLEAR` [Owner Decision Required]**.

---

### 3.3 Observation `FP-FO-14`: Kindergarten Front Office Reports Dashboard Divergence & Bulk CSV Export
- **Component Location:** `src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx:330-335`, `src/features/reports/ReportsDashboard.jsx:31, 98-106, 157-169`, and `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:1-403`.
- **Observed Static Implementation (UI Visibility & Actions):**
  - **Courses Front Office:** In `FrontOfficeDashboard.jsx:386-394`, the `reports` tab mounts `<FrontOfficeReportsTab />`. This dedicated component exposes strictly 3 operational desk sub-tabs: Cash Register Reconciliation, Today's Inquiry Count, and My Personal Shift Log. It contains **no bulk CSV export button** and **no learner academic progress sub-tab**.
  - **Kindergarten Front Office:** In `KidsFrontOfficeDashboard.jsx:330-335`, the `reports` tab mounts the shared `<ReportsDashboard isAdminView={false} isFrontOffice={true} division="kindergarten" userBranch={myBranch} />`.
  - In `ReportsDashboard.jsx:31`:
    ```javascript
    const canExportReports = isExecutiveView || isManager || isFrontOffice || isInstructorLeader;
    ```
  - Because `isFrontOffice === true`, the header renders `<button onClick={handleExportCSV}>Export CSV Dataset</button>` (lines 98-106).
  - Furthermore, in `ReportsDashboard.jsx:157-169`, the sub-tab `"Learner Progress"` (`LearnerProgressTab`) is rendered because `!isAdminView` is true.
- **Backend Data Access (Static Rules Observation):**
  - Under `division="kindergarten"`, Front Office can query `/attendance` and `/users` for kindergarten students, and can trigger client-side CSV generation of the active report tab.
  - *Runtime Verification Status:* Static rule observation only; CSV file download was not dynamically tested.
- **Governance Context & Boundary Distinction:**
  - This difference represents an observed workspace inconsistency between Courses Front Office and Kindergarten Front Office at the Main Campus:
    1. Courses desk staff have a dedicated operational desk report tab (`FrontOfficeReportsTab`) focused on daily cashier and inquiry workflows without export controls.
    2. Kindergarten desk staff are routed to the full institutional `ReportsDashboard`, gaining access to Learner Progress evaluations and bulk CSV dataset exports.
  - Blueprint v3.4 §5.0.1 describes the Main Campus dual-division hierarchy and reporting structure, but it does not establish a requirement for identical reporting features across divisions. The observed difference is an inconsistency in workspace composition and operational scope rather than a confirmed breach of an established governance rule. Whether front-desk reporting features and export capabilities should be aligned across divisions remains a question of intent for owner clarification.
  - **Technical Caveat on Division Scoping (Data Isolation):**
    - The existing `FrontOfficeReportsTab.jsx:28` currently accepts no `division` prop. It queries inquiries by branch only (`fetchRecentDeskInquiries(100, myBranch)`) and mounts `FrontDeskCashReconcile` (line 189) without passing a `division`.
    - Meanwhile, `KidsFrontOfficeDashboard` explicitly passes `division="kindergarten"` to its reports component.
    - At the dual-division Main Campus (`kota_gorontalo`), directly dropping the current `FrontOfficeReportsTab` into the Kindergarten dashboard would mix Courses and Kindergarten summaries and inquiries.
    - Therefore, aligning Kindergarten Front Office to a dedicated desk report tab is viable **only after confirming and preserving division-level data scope** for inquiries, payments, and cash reconciliation. Until then, it must remain a conditional proposal rather than a drop-in "same reports" replacement.
- **Outcome Status:** **`MISPLACED / UNCLEAR` [Owner Decision Required]**.

---

## 4. Verification of Intentionally Absent Capabilities

In accordance with [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.4 (Checks 2, 3, 5, 7), the following sensitive capabilities were verified as cleanly excluded or absent from the Front Office workspace:

### 4.1 Absence of Operational Approval Inbox (`FP-FO-09`)
- **Inspection Evidence:** Inspected the complete tab list in `FrontOfficeDashboard.jsx:308-431` and `KidsFrontOfficeDashboard.jsx:260-370`. The `ApprovalInbox` component is **completely unimported and unmounted** in Front Office shells.
- **Maker–Checker Adherence:** Front Office is strictly a **Maker** under Blueprint §15. When a desk action requires authorization (discount on tuition, void of recorded payment, deactivation/freeze of student status, placement level override, or cash discrepancy > threshold), the UI generates an approval envelope and submits it to `approvals` (`submitApprovalRequest`). The Front Office cockpit provides no inbox to self-approve or decide tickets.
- **Backend Rules Check:** In `firestore.rules:1230-1256`, `allow update` on `/approvals/{approvalId}` requires `isApproverForDoc(resource.data) && request.auth.uid != resource.data.requestedByUid`. Front Office users cannot approve envelopes, and cannot self-approve their own submissions.

### 4.2 Absence of Staff Invitation & Provisioning Controls (`FP-FO-10`)
- **Inspection Evidence:** Front Office dashboards contain no "Invites" tab, no `InvitesPanel`, and no user-role selector for creating staff.
- **Query Optimization:** In `useDashboardData.js:365-370`, when `restrictedRead: true` (Front Office), the real-time Firestore listener for `/invites` is skipped entirely, protecting Spark read quotas and preventing invitation tokens from entering front-desk browser memory.
- **Backend Rules Check:** `firestore.rules:886` allows create on `/invites` only for `isExecutive()`. Front Office cannot issue staff onboarding tokens.

### 4.3 Absence of Cohort Schedule Creation & Batch Deletion (`FP-FO-06`)
- **Inspection Evidence:** In `ClassManager.jsx:48-55` and `AvailableBatches.jsx:50-63`, `canSchedule` and `canDelete` evaluate the caller's role. For `role="frontoffice"`:
  - `canSchedule` evaluates to `false`. The "+ New Class Cohort" button and editing modals are suppressed.
  - `canDelete` evaluates to `false` (restricted to Director and Vice Director).
  - Front Office retains only `canEnroll={true}` (adding/transferring students into existing cohorts).
- **Backend Rules Check:** `firestore.rules:941` restricts `create` on `/classes` to Executive, Ops Lead, and Division Manager. `firestore.rules:916-920` strictly restricts Front Office updates on `/classes` to `studentIds`, `enrollments`, and `updatedAt`, within capacity bounds.

### 4.4 Prohibition on Direct Student Record Deletion (`FP-FO-05`)
- **Inspection Evidence:** In `FrontOfficeDashboard.jsx:352-365`, `StudentRoster` is mounted without passing `handleDelete`. In `StudentRoster.jsx:598`, `onDeleteStudent` evaluates to `null`. The red trash/delete button is completely omitted from student rows.
- **Dual-Control Freeze/Withdrawal:** In `StudentRoster.jsx:97-120`, attempting to change a student status to `inactive`, `graduated`, or `archived` triggers an approval prompt and creates an envelope for `STUDENT_WITHDRAWAL_OR_FREEZE` addressed to the Division Manager.
- **Backend Rules Check:** `firestore.rules:871` explicitly denies Front Office from deleting `/users` documents (`allow delete: if isAdmin() && ...`).

### 4.5 Prohibition on Direct Financial Voids & Overrides (`FP-FO-02`, `FP-FO-12`)
- **Inspection Evidence:** In `PaymentCashierTab.jsx` and `PaymentModal.jsx`, Front Office can record payments and issue WhatsApp receipts. When a payment correction or void is needed, `PaymentModal.jsx:425-450` invokes `requestPaymentVoid()`, prompting for an operational reason and submitting a `PAYMENT_CORRECTION_OR_VOID` envelope.
- **Backend Rules Check:** In `firestore.rules:1172-1176`, updating a payment status to `voided` requires an approved `PAYMENT_CORRECTION_OR_VOID` ticket (`isValidPaymentVoidApproval`). Front Office cannot void payments directly.

---

## 5. Uninspected Paths, Governance Questions & Next Steps

### 5.1 Uninspected Front Office Paths
1. **Interactive Receipt Web Share / WhatsApp Gateway:** External WhatsApp URL generation (`https://wa.me/...`) was verified by static string construction in `receiptMessages.js`, but live browser redirection was not tested.
2. **Kiosk Scan Processing Live Hardware Loop:** Scanning physical barcodes via camera or hardware scanner inside `KioskModal.jsx` was verified statically; live video feed decoding was not tested.
3. **Multi-Divisional Desk Switching (`CrossDivDashboard`):** Switching back and forth between Courses and Kindergarten front desks in `CrossDivDashboard.jsx` was verified by component hierarchy inspection; state synchronization across tabs was not dynamically exercised.
4. **Physical Cash Drawer Discrepancy Threshold Calculation:** Mathematical edge cases in `calculateCashDiscrepancyThreshold(expectedTotal)` were verified via unit tests (`corporateEvents.test.js`, `shiftAutoClose.test.js`), but live shift reconciliation form submission was not executed in this pass.
5. **Legacy Progress Reports Missing Division Attribute:** Filtering Courses promotions strictly by `division == "courses"` is mandatory to prevent cross-division leakage of same-branch Kindergarten records. However, legacy `progressReports` documents created without a `division` field are excluded by this query and will not be cleared by the promotion workflow. Reconciling legacy reports is left as a separate proposed data backfill task (documented in [`docs/proposals/2026-10-17-legacy-progress-reports-division-backfill.md`](../../proposals/2026-10-17-legacy-progress-reports-division-backfill.md), requiring separate scoping and read/write cost review) rather than expanding client query scope.

### 5.2 Ratified Owner Decisions (OD-FO-01, OD-FO-02, OD-FO-03)

On 2026-10-17, Owner Kifry reviewed the pilot findings and formally ratified the following binding decisions (documented in [`docs/decisions/2026-10-17-front-office-workspace-placement-and-access-boundaries.md`](../../decisions/2026-10-17-front-office-workspace-placement-and-access-boundaries.md)):

#### Question 1: Corporate Events Panel in Front Office Workspace (`FP-FO-07`) — RATIFIED: Option B (OD-FO-01)
- **Binding Resolution:** Retain the "Events" tab in Front Office as a read-only informational calendar (`canCreate={false}`, `canCancel={false}`) for receptionist awareness. Front Office is stripped of `create`, `update`, and `delete` permissions on `/corporateEvents` in `firestore.rules`.
- **Status:** **RATIFIED AUTHORITATIVE DECISION (OD-FO-01)**.

#### Question 2: Front Office Promotion Authority & `progressReports` Access (`FP-FO-13`) — RATIFIED: Option A (OD-FO-02)
- **Binding Resolution:** Confirm that Front Office is authorized to execute student level advancements based on instructor recommendations. Harden security rules to permanently deny `delete` on `/progressReports` to Front Office, and restrict `update` strictly to setting `eligibleForPromotion: false` and recording `promotedAt` on existing evaluations.
- **Status:** **RATIFIED AUTHORITATIVE DECISION (OD-FO-02)**.

#### Question 3: Reporting & CSV Export Parity Between Courses and Kindergarten (`FP-FO-14`) — RATIFIED: Option A (OD-FO-03)
- **Binding Resolution:** Unify front-desk operational reporting across educational divisions by mounting `<FrontOfficeReportsTab />` in Kindergarten Front Office with end-to-end division scoping (`division="kindergarten"`), and strip `isFrontOffice` from bulk CSV exports in `ReportsDashboard.jsx`.
- **Status:** **RATIFIED AUTHORITATIVE DECISION (OD-FO-03)**.

---

## 6. Implementation & Remediation Record

Implementation authorized and executed under Owner Decisions OD-FO-01, OD-FO-02, and OD-FO-03:

1. **Events Tab Remediation (`FP-FO-07` / OD-FO-01):**
   - In `src/features/attendance/CorporateEventsPanel.jsx`, added `canCancel = true` prop (gating the "Cancel Event" button so it only renders when `canCancel && evt.status === "active"`).
   - In `src/features/dashboard/FrontOfficeDashboard.jsx:383`, mounted `<CorporateEventsPanel canCreate={false} canCancel={false} />`.
   - In `firestore.rules:1020, 1035, 1047`, removed `isFrontOffice()` from `allow create`, `allow update`, and `allow delete` on `/corporateEvents/{eventId}`.
   - Synchronized `securityRulesMatrix.helpers.js` and automated tests.
2. **Progress Reports Authority & Rule Hardening (`FP-FO-13` / OD-FO-02 Option 1):**
   - In `src/features/students/progressReportsRepository.js`, refactored `promoteStudentLevel` into an atomic consolidation workflow: queries all pending eligible reports for the student scoped to `branchId` and `division`, staging both the student level advancement and all report cleanups into a single atomic `writeBatch`.
   - Aborts immediately if the pending-reports query fails, committing zero writes and preventing partial state.
   - Added pre-commit guard against the Firestore 500-write batch limit (`FIRESTORE_BATCH_LIMIT = 500`), failing with a descriptive error if the total operations would exceed the limit.
   - **List Query Hardening (`isDivisionAllowedForProgressReportsList`):** While `promoteStudentLevel` in `progressReportsRepository.js` was scoped with `where("division", "==", division)`, an independent audit identified that `firestore.rules` previously permitted broad list queries without a division filter because `isDivisionAllowedForManager` accepted missing division attributes (`!('division' in data)`). This allowed a Courses Front Office client querying Firestore directly without a division filter to read same-branch Kindergarten reports. To enforce backend division isolation, `firestore.rules:1306-1310` hardened `allow list`:
     - **Executive & Central Academic Lead Scope:** Organizational Executives (`isOrgExecutive()`) and the Central Instructor Leader (`isInstructorLeader()`) hold province-wide listing access across all branches without branch or division scoping (per Blueprint v3.4 §4, §5, §6.11, G-012, and ADR 2026-10-13).
     - **Branch Staff Boundary:** Branch staff (`(isManager() || isFrontDeskStaff())`) are strictly restricted by both physical branch (`isSameBranchStrict(resource.data)`) and explicit division (`isDivisionAllowedForProgressReportsList(resource.data)`). Only an explicit `courses` caller can list Courses reports (`data.division == 'courses'`) and only an explicit `kindergarten` caller can list Kindergarten reports (`data.division == 'kindergarten'`). Unfiltered list queries from branch staff fail closed with `PERMISSION_DENIED`.
     - **Instructors & Parents:** Instructors list authored reports (`resource.data.instructorId == request.auth.uid`), and parents list linked children with branch constraints.
     - **Unstamped/Invalid Divisions:** Accounts with `division: "all"`, missing division, or invalid division values are strictly denied (`PERMISSION_DENIED`) on all list queries until an explicit owner decision establishes their scope.
   - **Explicit Handling of `division: "all"` & Ops Lead Denial — `[Owner Decision Required]`:** Pure Front Office (`isFrontDeskStaff()`) is strictly separated from Operational Leader roles (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`). While the governance decision on Ops Lead academic oversight remains open, Ops Leads have no access through the branch-staff role path (`get`, `list`, `update`, `delete`), regardless of division configuration (`courses`, `kindergarten`, `all`, missing, or invalid), while preserving any independent instructor (authored reports via `instructorId == request.auth.uid`) or parent (`isParentOf(studentId)`) access path.
   - **Direct Document `get` Hardening (`isDivisionAllowedForProgressReportsGet`):** Direct document access (`allow get`) is evaluated separately from write and list rules under `isDivisionAllowedForProgressReportsGet`, restricted to Executive, assigned instructor, linked parent, Instructor Leader, and same-branch Manager or pure Front Office (`isFrontDeskStaff()`):
     - Explicit Courses Front Office and Course Division Manager can read Courses reports (`data.division == 'courses'`) and legacy reports created without a `division` field (`!('division' in data)`), preserving historical record access by document ID per approved legacy-data policies without weakening list query isolation. Direct `get` attempts by Courses staff on Kindergarten documents evaluate to `false` and are strictly denied (`PERMISSION_DENIED`).
     - Explicit Kindergarten Front Office and Kindergarten Division Manager can only read Kindergarten reports (`data.division == 'kindergarten'`). Access to legacy reports lacking division or Courses reports is strictly denied (`PERMISSION_DENIED`).
     - Staff accounts with `division: "all"`, missing division, or invalid division fail closed (`PERMISSION_DENIED`) on direct `get` for all progress reports (Courses, Kindergarten, and legacy unstamped records) until an owner decision establishes their authority.
     - Ops Lead accounts have no direct `get` access through the branch-staff role path across all division values (independent author/parent access paths remain unaffected).
   - **Separation of Read & Write Authorization (`isDivisionAllowedForProgressReportsWrite`):** The approved legacy exception authorizes direct-get readability; it does not authorize modifying or deleting unclassified reports. Mutation rules (`allow update`, `allow delete`) enforce strict division matching via `isDivisionAllowedForProgressReportsWrite(data)`:
     - **Front Office Updates:** Front Office promotion updates require an explicit matching division (`isDivisionAllowedForProgressReportsWrite(resource.data)`). Unstamped legacy reports cannot be updated by Front Office.
     - **Division Manager Updates & Deletes:** Requires an explicit matching division (`isDivisionAllowedForProgressReportsWrite(resource.data) && isDivisionAllowedForProgressReportsWrite(request.resource.data)`). Unstamped legacy reports cannot be updated or deleted by branch managers pending an owner decision (`[Owner Decision Required]`).
     - **Executive Updates & Deletes:** Retained under `isOrgExecutive()`.
   - **Known Limitation & Separate Migration Proposal (Legacy Records):** Cloud Firestore equality queries on `division == 'courses'` do not match legacy documents where the `division` field is missing. Those legacy records are not cleared by this promotion workflow. To avoid cross-division leakage or scanning large collections on client devices, backfilling `division: 'courses'` onto legacy reports is left as a separate proposed data-migration task (see [`docs/proposals/2026-10-17-legacy-progress-reports-division-backfill.md`](../../proposals/2026-10-17-legacy-progress-reports-division-backfill.md)) requiring its own scope, cost estimation, and review.
   - Preserved `clearStudentPendingPromotions` removal across `src/`.
   - In `firestore.rules:1333-1346`, separated `allow delete` (denying Front Office completely) and hardened `allow update` to permit Front Office only within an active student level advancement (`isBatchStudentAdvancement(resource.data.studentId)` requiring `curAfter != '' && curAfter != curBefore && sAfter.promotedFromReport != ''`), strictly constraining diff keys to `['eligibleForPromotion', 'promotedAt', 'updatedAt']` with a mandatory `true -> false` transition on `eligibleForPromotion`.
   - Synchronized `securityRulesMatrix.helpers.js` and added unit test assertions for `canUpdateProgressReport` and `canDeleteProgressReport`.
3. **Kindergarten Front Office Reports Unification & Division Scoping (`FP-FO-14` / OD-FO-03):**
   - Refactored `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx` to accept `division = "courses"`, passing `division` to `fetchRecentDeskInquiries(100, myBranch, division)`, filtering in-memory inquiries by `inq.division === division`, and passing `division={division}` to `<FrontDeskCashReconcile />`.
   - In `src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx`, replaced `ReportsDashboard` with `<FrontOfficeReportsTab myBranch={myBranch} division="kindergarten" students={students} />`.
   - In `src/features/dashboard/FrontOfficeDashboard.jsx`, explicitly passed `division="courses"` to `FrontOfficeReportsTab`.
   - In `src/features/reports/ReportsDashboard.jsx:31`, removed `isFrontOffice` from `canExportReports`.
4. **Verification Record:**
   - Ran repository-level unit tests: `src/features/students/progressReportsRepository.test.js` (10/10 passed).
   - Ran division isolation tests: `src/features/dashboard/frontoffice/FrontOfficeReportsIsolation.test.js` (8/8 passed).
   - Ran full unit test suite: `npm test` (109/109 test files passed, 1536 tests passed, 0 failures).
   - Ran Firestore emulator test suite: `npm run test:rules` (7/7 test files passed, 161 tests passed, 0 failures), including empirical tests proving cross-division list isolation, verifying Division Manager / Front Office scoped queries and direct get boundaries, and verifying that Ops Lead and accounts with `division: "all"`, missing division, or invalid division fail closed across both list and direct get through the branch-staff role path pending an explicit owner decision.
   - Ran linter: `npm run lint` (0 errors).
   - Ran typecheck: `npm run typecheck` (0 errors).
