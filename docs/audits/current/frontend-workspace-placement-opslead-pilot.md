# Frontend Workspace Placement Pass — Operational Leader (`opslead`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** Operational Leader / Ops Lead (`opslead`) Workspace Cockpit  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4.1 (§4, §5, §6.8, §6.10, §6.11, §15, §16, §18, §26 G-009, G-013, §41), Ratified Owner Decisions OD-O1 to OD-O4 (2026-10-08), Class Scheduling & Corporate Events Decision (2026-10-13), and Ratified Progress Reports Read Access Decision `OD-OPS-01` (2026-10-17)  
> **Status:** SCOPED PILOT REPORT — STRICT READ-ONLY AUDIT MODE  
> **Verification Method:** Static code inspection of React components, routing, repository contracts, and Firestore security rules, coupled with targeted read-only Vitest unit and security rules matrix test executions (*Live Firestore emulator skipped due to offline emulator host; rule claims remain static or matrix-supported rather than runtime-confirmed*)  

---

## 1. Pilot Scope & Executive Summary

This pilot report documents a scoped, read-only static inspection and automated test audit of the **Operational Leader / Ops Lead (`opslead`)** workspace under the approved **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3).

### 1.1 Scope Boundaries & Operational Role Identity
- **Single Role Cockpit:** This inspection is strictly focused on the Operational Leader (`opslead`) workspace mounted via `OpsLeadDashboard.jsx` in `src/App.jsx:604-610`. It evaluates the routing shell, 11 mounted tabs and nested components, shared controls, data queries, and underlying Firestore security rules.
- **Strict Separation from Front Office:** Under Authoritative Blueprint v3.4.1 §6.8, §6.9 and Ratified Decisions OD-O1 through OD-O4, the Operational Leader is a branch-site operational coordinator, not a front-desk receptionist or cashier. Although legacy code aliases (`frontofficelead`, `ops_lead`) normalize to `opslead` for backward-compatible routing (OD-O1 Option A), the Operational Leader cockpit is distinct from `FrontOfficeDashboard.jsx`, `KidsFrontOfficeDashboard.jsx`, and `CrossDivDashboard.jsx`. Overlapping role aliases do not make their workspaces, permissions, or separation-of-duties boundaries interchangeable.
- **Binding Governance Baseline for Academic Progress Reports (`OD-OPS-01` / `G-013`):** Under Owner Decision `OD-OPS-01` (ratified 2026-10-17) and Blueprint v3.4.1 (§6.8, G-013, §41), the Operational Leader is granted a narrow, read-only operational visibility exception over student progress reports strictly at the Main Campus (`kota_gorontalo`) across Course Academy and Kindergarten divisions. Operational Leaders hold zero academic, grading, student level promotion, or record mutation authority, and zero access to progress reports at satellite branches (`bone_bolango`, `limboto`, `pohuwato`).
- **Preservation of Unresolved Legacy Reports:** Cloud Firestore query indexing requires explicit equality filters on `division`. Progress reports lacking an explicit `division` attribute (historical legacy records) or lacking `branchId` or `examDate` are excluded from Ops Lead queries and fail closed under security rules. In accordance with audit instructions, this known legacy state is preserved as excluded and unresolved; no historical data was backfilled or inferred during this pass.
- **Strict Read-Only Audit Boundaries:** No application code (`src/`), security rules (`firestore.rules`), tests, or canonical governance documents were modified during this pass. All remediation items are documented as findings or open decisions awaiting owner authorization.

---

## 2. Standardized Frontend Placement Ledger (Ops Lead Checks)

The following ledger documents all targeted structural checks evaluated for the Operational Leader workspace, conforming strictly to the 10-column schema defined in [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.5. Each row uses exactly one allowed placement category (`PRIMARY`, `SHARED`, `CONDITIONAL`, `INFORMATIONAL`, `INTENTIONALLY ABSENT`) and exactly one allowed placement outcome (`CONFORMS`, `MISPLACED / UNCLEAR`, `MISSING_EXPECTED`, `[Owner Decision Required]`, `NOT TESTED`, `NOT APPLICABLE`):

| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
|---|---|---|---|---|---|---|---|---|---|
| **`FP-OPS-01`** | `opslead` (Main Campus) | `src/App.jsx:40, 604-610`<br>`src/features/dashboard/OpsLeadDashboard.jsx:1-310` | Ops Lead Dashboard Shell Mount & Route Guard | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8; Ratified Decisions OD-O1, OD-O2 (Option A) | Root app routing `/portal` when `effectiveRole in ['opslead', 'ops_lead', 'frontofficelead']` | Static rule & router inspection; passes component unit tests | `CONFORMS` | Core branch-site operational command shell baseline (Check 1 & 2: Route & shell) |
| **`FP-OPS-02`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:137-154`<br>`src/features/dashboard/opslead/OpsLeadOverviewTab.jsx:1-232` | Branch-Site Operations Command Overview (`WelcomeBanner`, Site Health KPIs, Staff Allocation Board, `OpsLeadBottlenecksSection`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8, §6.10; OD-O2 | Ops Lead Dashboard -> Overview Tab (`overview`) | Static rule inspection; passes component unit tests | `CONFORMS` | Proactive operational bottleneck & staff coordination cockpit baseline |
| **`FP-OPS-03`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:155-168`<br>`src/features/shared/ApprovalInbox.jsx` | Operational Dual-Control Approvals Inbox (Attendance edits, class transfers, reschedules, cash discrepancies < Rp 20.000) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8, §15, §16; Ratified Decisions G-009, OD-O4 (Option A) | Ops Lead Dashboard -> Approvals Tab (`approvals`), with dynamic pending count badge | Enforced in rules (`firestore.rules:1204-1258`); verified via security rules matrix | `CONFORMS` | Decentralized operational checker queue; cashiers blocked from approving Ops Lead tickets (OD-O4) |
| **`FP-OPS-04`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:170-182`<br>`src/features/dashboard/opslead/OpsLeadReconciliationTab.jsx:1-205` | Shift Cash Reconciliation & Discrepancies Oversight (Read-only drawer breakdown, G-009 policy alert, today's receipts) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8, §18; Ratified Decisions G-009, OD-O3 (Option A) | Ops Lead Dashboard -> Cash Reconciliation Tab (`reconciliation`) | Enforced in rules: `canCreatePayment` denied to `opslead` (`firestore.rules:1138-1188`) | `CONFORMS` | Ops Lead reviews drawer balance; personal cashier payment intake is omitted (preserving Maker-Checker) |
| **`FP-OPS-05`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:183-198`<br>`src/features/dashboard/opslead/OpsLeadFacilitiesTab.jsx:1-174` | Branch Facilities & Maintenance Coordination (Office Boy / Facilities task dispatch & active cleaning checklist) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8, §6.10 (Site logistics, building cleanliness, Office Boy oversight) | Ops Lead Dashboard -> Facilities & Support Tab (`facilities`), with active tasks count badge | Enforced in rules (`firestore.rules:947-972`); verified via security rules matrix | `CONFORMS` | Core facility maintenance coordination; tasks strictly branch-scoped to assigned Office Support staff |
| **`FP-OPS-06`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:199-209`<br>`src/features/dashboard/opslead/FrontOfficePerformanceTab.jsx:1-409` | Front Office Intake & Desk Performance (Inquiry velocity metrics, uncontacted leads alert, dual-division visitor log) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8 (Front-office performance coordination); OD-O2 | Ops Lead Dashboard -> Front Desk Intake Tab (`frontoffice`) | Enforced in rules (`firestore.rules:1190-1202` read-only for branch staff) | `CONFORMS` | Read-only situational awareness of reception responsiveness; direct inquiry logging & mutations omitted |
| **`FP-OPS-07`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:210-227`<br>`src/features/students/StudentRoster.jsx:1-679` | Campus Learners Read-Only Roster Visibility (`StudentRoster` mounted with `readOnly={true}`, `canEditStatus={false}`) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8 (Campus-wide student throughput and logistics monitoring) | Ops Lead Dashboard -> Campus Learners Tab (`students`) | Enforced fail-closed in UI props; all mutation callbacks are null | `CONFORMS` | `readOnly={true}` suppresses enrollment, edit, delete, status toggle, and promotion actions; linked parents visible |
| **`FP-OPS-08`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:228-237`<br>`src/features/dashboard/opslead/OpsLeadProgressReportsTab.jsx:1-647` | Student Academic Progress Oversight (Read-only progress evaluations, scores, teacher comments, division filters) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8, §41; Ratified Owner Decision 2026-10-17 (`OD-OPS-01` / `G-013`) | Ops Lead Dashboard -> Academic Progress Tab (`progress`) | Enforced in rules (`firestore.rules:1316-1321, 1328-1333`); verified via repository & unit tests | `CONFORMS` | Scoped strictly to Main Campus; Courses & Kindergarten divisions; read-only; Spark quota bounded (max 50/div) |
| **`FP-OPS-09`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:239-252`<br>`src/features/classes/AvailableBatches.jsx:1-463` | Class Capacity & Cohort Scheduling (`AvailableBatches` mounted with `canEdit={true}`, `role="opslead"`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8; Ratified Owner Decision 2026-10-13 Decision 2 (Option B) | Ops Lead Dashboard -> Capacity & Batches Tab (`batches`) | Enforced in rules: `classes` create/update allowed for `isOpsLead()` (`firestore.rules:912-925`); delete blocked | `CONFORMS` | Primary class cohort scheduling & room allocation authority at Main Campus; batch deletion restricted to executives |
| **`FP-OPS-10`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:254-263`<br>`src/features/dashboard/frontoffice/TodayScheduleBoard.jsx:1-123` | Live Class & Room Board (In-memory daily room schedule, class times, instructor and enrolled student counts) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8 (Room allocation, timetable conflict prevention, greeting coordination) | Ops Lead Dashboard -> Live Schedule Board Tab (`schedule`) | In-memory presentation; zero Firestore reads; zero mutations | `CONFORMS` | Read-only situational awareness for campus room navigation and timetable coordination |
| **`FP-OPS-11A`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:265-274`<br>`src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:189-200`<br>`src/features/dashboard/frontoffice/FrontDeskCashReconcile.jsx:182-190`<br>`src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx:1-300` | Cash Drawer Balancing & End-of-Shift Reconciliation Action Exposed to Ops Lead | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §18; Ratified Decision OD-O3 (Option A) | Ops Lead Dashboard -> Operational Reports Tab (`reports`) -> Sub-tab "cash" -> Button "End Shift & Count Drawer" | Static rule inspection: `canUpdateShift` (`firestore.rules:1378-1392`) includes Ops Lead in `isFO` and permits `cashReconciliation` in `diffKeys`, indicating potential backend divergence from OD-O3; runtime unconfirmed (emulator skipped). Maker self-approval blocked by `firestore.rules:1270`. | `MISPLACED / UNCLEAR` | Conformance Finding: UI exposes cashier shift count/closing and rules permit cashReconciliation update, conflicting with OD-O3 (Finding 4.1) |
| **`FP-OPS-11B`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:265-274`<br>`src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:156-185, 202-400` | Operational Reports Workspace Clutter & Division Truncation (Duplicated Inquiries & Personal Shift Log) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8; OD-O2 | Ops Lead Dashboard -> Operational Reports Tab (`reports`) -> Sub-tabs "inquiries" & "shifts" | Static query inspection: defaults `division="courses"`; runtime behavior not tested | `MISPLACED / UNCLEAR` | Duplicates Tab 5 (`frontoffice`) and Tab 3 (`reconciliation`); artificially filters out Kindergarten inquiries (Finding 4.1) |
| **`FP-OPS-12`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:276-280`<br>`src/features/attendance/CorporateEventsPanel.jsx:1-394` | Campus Corporate Events & Logistics Management (`CorporateEventsPanel` with `canCreate={true}`, `canCancel={true}`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8; Ratified Owner Decision 2026-10-13 Decision 3 | Ops Lead Dashboard -> Events & Logistics Tab (`events`) | Enforced in rules: `corporateEvents` branch-scoped create/cancel allowed for `isOpsLead()` (`firestore.rules:1020-1049`) | `CONFORMS` | Primary authority to schedule and cancel local branch events, workshops, training sessions, and school calendar meetings |
| **`FP-OPS-13`** | `opslead` (Main Campus) | `src/features/students/StudentRoster.jsx:77` | Campus Learners Bulk Student PII CSV Export Feature (`canExportRoster` check) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8, §6.10, §7.3; DOM05-PRIV-01 [Owner Decision Required] | Campus Learners Tab -> Roster Header -> Export CSV Button | Pure client-side generation from loaded `students` array | `[Owner Decision Required]` | Authority to export bulk student PII is unresolved in approved sources; operational monitoring does not infer export authority (Finding 4.2) |
| **`FP-OPS-14`** | `opslead` (global) | `src/features/dashboard/OpsLeadDashboard.jsx` (complete tab array: 11 tabs)<br>`firestore.rules:1138-1188` | Personal Cashier Tuition Payment Intake (`PaymentModal` / `PaymentCashierTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §18; Ratified Decision OD-O3 | Fully unmounted in Ops Lead shell; no payment intake buttons or cash register modal triggers | Enforced in rules: `canCreatePayment` denied to `opslead` (`firestore.rules:1138-1188`) | `CONFORMS` | Cleanly omitted from Ops Lead cockpit; preserves Maker-Checker separation between cashier and discrepancy approver |
| **`FP-OPS-15`** | `opslead` (global) | `src/features/dashboard/OpsLeadDashboard.jsx`<br>`firestore.rules:1337-1359` | Pedagogical Evaluation Grading, Mutation & Student Level Promotion Actions | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §6.11; Ratified Decisions OD-OPS-01, OD-IL-ENF1 | Fully omitted from `OpsLeadProgressReportsTab` and `StudentRoster`; no promotion buttons | Enforced in rules: `progressReports` update/delete denied to `isOpsLead()` (`firestore.rules:1345-1358`) | `CONFORMS` | Academic authority belongs exclusively to teaching staff, Central Academic Lead, and Division Managers |
| **`FP-OPS-16`** | `opslead` (satellite) | `src/features/dashboard/opslead/OpsLeadProgressReportsTab.jsx:45, 92-94, 166-184`<br>`firestore.rules:1318-1320, 1330-1332` | Satellite Branch Progress Reports Access (`bone_bolango`, `limboto`, `pohuwato`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §4, §5, §6.8; Ratified Decisions G-012, OD-OPS-01 | Gated fail-closed in UI (`if (!isMainCampus) return ...`); renders amber scope restriction banner | Enforced in rules: requires `userBranch() == 'kota_gorontalo' && resource.data.branchId == 'kota_gorontalo'` | `CONFORMS` | Satellite operational staff hold zero access to student academic evaluations; lean satellite model strictly preserved |

---

## 3. Deep Dive on Recently Added Academic Progress Tab (`OpsLeadProgressReportsTab.jsx`)

The newly added **Academic Progress** tab (`OpsLeadProgressReportsTab.jsx`, mounted at `OpsLeadDashboard.jsx:228-237`) was evaluated against the six BLRCA conformance dimensions and the explicit terms of Ratified Decision `OD-OPS-01` (`G-013`):

### 3.1 Main Campus Physical Scope Restriction & Enforcement
- **Component Implementation:** In `OpsLeadProgressReportsTab.jsx:44-46`, the component normalizes `myBranch` via `branchToId(myBranch)` and asserts `isMainCampus = targetBranchId === "kota_gorontalo"`.
- **Fail-Closed Gate:** In `OpsLeadProgressReportsTab.jsx:92-94`, if `!isMainCampus`, the query effect returns immediately without dispatching any Firestore calls.
- **Explicit Restriction Notice:** If viewed from a satellite branch context, the component renders an explicit amber alert banner (lines 166–184):
  > *"Main Campus Scope Restriction (OD-OPS-01): Academic progress report oversight is formally scoped to the Operational Leader at the Main Campus (Kota Gorontalo)... Satellite branches operate under lean Course Division management. Satellite operational staff do not have access to student evaluation records."*
- **Backend Rules Enforcement:** In `firestore.rules:1316-1321` (`allow get`) and `1328-1333` (`allow list`), access requires both `userBranch() == 'kota_gorontalo'` AND `resource.data.branchId == 'kota_gorontalo'`. An Ops Lead assigned to a satellite branch attempting to query reports fails closed with `permission-denied`. Verified via static rule inspection and security rules matrix tests.

### 3.2 Full Document Visibility (Scores and Teacher Remarks) & Architecture Limitation
- **Component Implementation:** In `OpsLeadProgressReportsTab.jsx:523-643`, clicking the "Details" (`Eye`) action button on any report row opens a read-only evaluation modal.
- **Displayed Payload:** The modal renders the overall band score (e.g. `88%`), individual sub-scores (Pronunciation `/100`, Fluency `/100`, Vocabulary `/100`, Comprehension `/100`), target recommended level, evaluator name, exam date, and full Instructor Evaluation Remarks (teacher comments).
- **Governance & Architectural Basis:**
  - Under Google Cloud Firestore Security Rules architecture, document reads evaluate at the entire document level without field-level masking. Granting `allow get` and `allow list` access to `/progressReports` necessarily exposes the complete document payload.
  - On 2026-10-17, Owner / Director (Kifry) explicitly evaluated this architectural constraint and confirmed approval (`OD-OPS-01` §4, Blueprint v3.4.1 §6.8, §41):
    > *"Owner / Director (Kifry) explicitly approved Main Campus Operational Leaders reading the complete `/progressReports` document, including student scores and teacher comments, for operational oversight."*
- **Outcome:** **`CONFORMS`** to explicit owner ratification.

### 3.3 Division Filtering & Campus-Wide Operational Scoping (Courses & Kindergarten)
- **Component Implementation:** In `OpsLeadProgressReportsTab.jsx:50, 279-311`, the UI provides division filter buttons for "All Divisions", "Courses", and "Kindergarten".
- **Backend Query Partitioning:** In `src/features/students/progressReportsRepository.js:224-250`, `fetchOpsLeadProgressReports` partitions division queries:
  - If `divisionFilter === "courses"`: executes 1 query for `where("division", "==", "courses")`.
  - If `divisionFilter === "kindergarten"`: executes 1 query for `where("division", "==", "kindergarten")`.
  - If `divisionFilter === "all"`: executes 2 parallel queries (`["courses", "kindergarten"]`) and aggregates them client-side.
- **Strict Division Isolation in Rules:** Under `firestore.rules:1320, 1332`, queries must explicitly match `('division' in resource.data) && (resource.data.division == 'courses' || resource.data.division == 'kindergarten')`. Unbounded queries omitting division fail closed.

### 3.4 Read-Only Actions, Mutual Exclusions & Academic Safeguards
- **Component Implementation:** Inspection of `OpsLeadProgressReportsTab.jsx:1-647` confirms that **zero mutation controls exist**:
  - No "Create Report" or "New Evaluation" button exists.
  - No "Edit Report" or score modification input exists.
  - No "Delete Report" button exists.
  - No "Promote Student" or level advancement trigger exists.
  - Prominent governance banners state: *"Read-Only Governance (OD-OPS-01)... Academic mutations, level advancements, and evaluation scoring remain strictly reserved for teaching staff and Front Office."* (lines 192–210, 624–630).
- **Backend Enforcement:** In `firestore.rules:1345-1358`, `allow delete` is restricted to Executives and Division Managers; `allow update` is restricted to Executives, Division Managers, and pure Front Office during an active student advancement batch. The Ops Lead role path is denied all write, update, and delete authority.

### 3.5 Fail-Closed Error and Clean Empty States
- **Component Implementation:** In `OpsLeadProgressReportsTab.jsx:49, 109-115, 351-363`:
  - If Firestore rejects a query or network failure occurs, the component sets `error` and renders an explicit red error banner with a "Retry Query" button (`handleRefresh`).
  - It does **not** catch errors silently or render affirmative zeroes ("denial-looks-like-zero"), satisfying `03-technical-audit-method.md` Dimension 6.
  - In lines 364–373, empty states distinguish between zero records matching filter criteria versus zero records recorded campus-wide.

### 3.6 Spark Quota Bounded Limits (Max 50/div) & Data Indexing Notices
- **Hard Limit Enforcement:** In `progressReportsRepository.js:208, 247` and `resolveOpsLeadQueryLimit`:
  - Queries are capped at `DEFAULT_OPS_LEAD_REPORTS_LIMIT = 50` (hard ceiling `MAX_OPS_LEAD_REPORTS_LIMIT = 50`).
  - Passing `0`, negative numbers, `Infinity`, `NaN`, or values `> 50` safely falls back to 50, preventing unconstrained scans from consuming free-tier Spark read quotas. Tested in `progressReportsRepository.test.js:349-390` (24 passing assertions).
- **UI Disclosure:** In `OpsLeadProgressReportsTab.jsx:199, 233, 328-337, 465`, badges and selector tooltips disclose: *"Spark Quota Guarded (Up to 50/div)"*.
- **Indexing Disclosure Notice:** Lines 514–520 display a persistent data indexing notice informing staff that records require `branchId` and `examDate` to appear in chronologically ordered queries.

### 3.7 Exclusion and Preservation of Known Legacy Report with Unverified Historical Branch Scope
- **Current Technical Reality:** Documents created prior to division schema stamping lack the `division` field. Under Cloud Firestore query index semantics, queries with `where("division", "==", div)` never match documents where `division` is missing. Furthermore, `firestore.rules:1320, 1332` strictly require `('division' in resource.data)`.
- **Preserved Status:** In accordance with audit instructions, any historical legacy progress report with unverified historical branch scope remains **strictly excluded and denied** from Ops Lead queries. No backfill script was executed, and no speculative branch or division attribution was inferred.

---

## 4. Detailed Static & Component Observations

### 4.1 Observation `FP-OPS-11A` & `FP-OPS-11B`: Front Office Reports Tab in Ops Lead Cockpit

#### 4.1.1 Conformance Finding `FP-OPS-11A`: Cash Drawer Balancing Action & Backend Shift Update Path Exposed to Operational Leader
- **Component Location:** `src/features/dashboard/OpsLeadDashboard.jsx:265-274`, `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:189-200`, `src/features/dashboard/frontoffice/FrontDeskCashReconcile.jsx:182-190`, and `src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx:1-300`.
- **Active-Shift Execution Path & Observed UI Exposure:**
  1. **Shift Initiation:** Operational Leaders perform on-duty station attendance clock-in at the attendance kiosk via `src/features/attendance/kioskScanProcessor.js:394-440` (`executeStaffClockIn`). This creates an open document in the `/shifts` collection with `userId == currentUser.uid`, `branchId`, and `clockOut == null`.
  2. **Active Shift Query in Reports Tab:** In `FrontOfficeReportsTab.jsx:49-57`, the tab independently executes `fetchOpenShiftFor(currentUser.uid, branchToId(myBranch))`. If the Ops Lead has an open duty shift, `internalActiveShift` is populated.
  3. **Drawer Balancing Button Exposure:** `FrontOfficeReportsTab.jsx:191-198` renders `<FrontDeskCashReconcile>` under sub-tab `"cash"`, passing `activeShift`. In `FrontDeskCashReconcile.jsx:182-190`, `activeShift != null` triggers the unconditional rendering of the cashier action button:
     ```jsx
     <button onClick={() => setShowReconcileModal(true)}>End Shift & Count Drawer</button>
     ```
  4. **Cashier Balancing Modal:** Clicking this button opens `ShiftReconciliationModal.jsx`. The Ops Lead can enter counted physical cash and QRIS, calculate drawer overage/shortage, enter notes, and submit `clockOutShiftWithCashReconciliation(activeShift.id, ...)`.
  5. **Discrepancy Ticket Generation:** If counted cash differs from system expected totals by more than the threshold, submitting the modal calls `createApprovalEnvelope("CASH_DISCREPANCY", ...)` and submits an approval ticket with `requestedByUid == currentUser.uid`.
- **Backend Security Rule Path (`canUpdateShift`) & Potential Governance/Security Divergence:**
  - In `firestore.rules:1361-1409`, the helper function `canUpdateShift` governs mutations to `/shifts/{shiftId}`:
    ```firestore
    let isFO = r in ['frontoffice', 'opslead', 'ops_lead', 'operational_leader', 'operationalleader', 'frontofficelead'];
    ...
    (isFO
      && sameBranch
      && res.clockOut == null
      && req.clockOut is string
      && req.userId == res.userId
      && (!('branch' in res) || req.branch == res.branch)
      && (!('branchId' in res) || req.branchId == res.branchId)
      && req.clockIn == res.clockIn
      && diffKeys.hasOnly(['clockOut', 'updatedAt', 'cashReconciliation', 'notes', 'status', 'verifiedBy', 'verifiedAt', 'autoClosed']))
    ```
  - **Potential Backend Divergence:** Under line 1378, `isFO` includes the Ops Lead aliases (`'opslead'`, `'ops_lead'`, `'operational_leader'`, `'operationalleader'`, `'frontofficelead'`). Lines 1384–1392 permit users matching `isFO` to close their own active shift (`res.clockOut == null && req.clockOut is string && req.userId == res.userId`) while modifying `diffKeys` that explicitly include `'cashReconciliation'`.
  - **Divergence Impact:** This rule path means an Ops Lead with an open shift document potentially has backend permission to close their own shift and persist physical cash drawer counts directly to Firestore, despite the ratified OD-O3 rule that the Ops Lead does not personally act as cashier.
  - **Runtime Verification Status (Offline Emulator):** This rule path was identified through static code inspection and rule analysis. As documented in §5.3, live runtime verification against active security rules remains unconfirmed because the Firestore emulator host was offline and emulator tests were skipped during this audit session.
- **Maker-Checker Separation & Blocked Self-Approval Trace:**
  - *Correction on Earlier Draft:* The initial draft heading *"Self-Approval Path"* overstated what was established. The report established that an Ops Lead can generate a discrepancy ticket as maker, but code and security rules tracing confirms that **maker self-approval is strictly blocked across both backend rules and client controls**:
    1. **Backend Rule Gate (`firestore.rules:1269-1271`):** In `match /approvals/{approvalId}`, approval updates require:
       ```firestore
       allow update: if isApproverForDoc(resource.data)
           && request.auth.uid != resource.data.requestedByUid
           && request.resource.data.requestedByUid == resource.data.requestedByUid
       ```
       The rule strictly requires `request.auth.uid != resource.data.requestedByUid`. Any direct Firestore write by the Ops Lead attempting to approve or decide an envelope they submitted as maker fails closed with `permission-denied`.
    2. **Client UI Gate (`src/features/shared/ApprovalInbox.jsx:339-342, 444-447`):** Both `handleApprove` and `handleReject` evaluate:
       ```javascript
       if (approval.requestedByUid && approval.requestedByUid === currentUid) {
         toast("Dual-control restriction: You cannot approve a request you submitted yourself.", "error");
         return;
       }
       ```
    3. **Actual Consequence — Operational Conflict & Potential Ticket Stranding:** While self-approval is blocked, permitting the Ops Lead to act as the drawer-counting cashier creates an operational conflict: under ratified Decisions OD-O3 and OD-O4, the Operational Leader is the designated branch checker for discrepancies < Rp 20.000. When the Ops Lead is the maker (`requestedByUid`), they are barred from checking their own ticket. If no other eligible checker is assigned or available at the branch, the discrepancy ticket cannot be approved locally at the branch and becomes stranded in the pending queue unless manually escalated to Executive Leadership (Director / Vice Director).
- **Governance Conflict against Ratified Decision OD-O3:**
  - On 2026-10-08, Owner Kifry formally ratified Decision **OD-O3 (Option A)**:
    > *"Operational Leader reviews daily drawer reconciliation and approves discrepancies < Rp 20.000. Ops Lead does not personally act as cashier... Separation of duties: The person who counted the drawer cannot approve discrepancies."*
  - Exposing cashier shift closing and physical drawer count controls to the Operational Leader in the frontend UI, coupled with backend permission in `canUpdateShift` allowing Ops Lead aliases to submit `cashReconciliation` fields, conflicts directly with OD-O3 and Maker-Checker separation of duties ([`Blueprint v3.4.1 §15, §18`](file:///E:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md#L432-L442)).
- **Outcome Status:** **`MISPLACED / UNCLEAR` (Conformance Finding — Governance Conflict against OD-O3 & Potential Backend Rule Divergence)**.
- **Audit Handoff & Governance Boundary:** Under `03-technical-audit-method.md` §3.2, an audit pass documents the observation, execution path, and rule analysis without modifying production code or security rules. All rule changes (such as tightening `canUpdateShift` in `firestore.rules`) and implementation changes (such as unmounting cashier shift controls from the Ops Lead cockpit) are formally deferred to a separately authorized implementation task.

#### 4.1.2 Observation `FP-OPS-11B`: Workspace Clutter & Division Truncation
- **Component Location:** `src/features/dashboard/OpsLeadDashboard.jsx:265-274` and `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:156-185, 202-400`.
- **Observed Deficiencies:**
  1. **Functional Duplication:**
     - Sub-tab 1 ("Cash Register Reconciliation") duplicates the dedicated Operational Leader reconciliation cockpit in Tab 3 (`OpsLeadReconciliationTab.jsx`).
     - Sub-tab 2 ("Today's Inquiry Count") duplicates the dual-division reception tracking in Tab 5 (`FrontOfficePerformanceTab.jsx`).
  2. **Division Truncation Mismatch:**
     - `FrontOfficeReportsTab` has default prop `division = "courses"`. Because `OpsLeadDashboard.jsx:269` does not pass `division="all"`, inquiry queries in `FrontOfficeReportsTab.jsx:67` filter strictly for `inq.division === "courses"`. This artificially truncates Kindergarten inquiries for an Operational Leader whose ratified scope covers whole-campus operations (OD-O2).
- **Outcome Status:** **`MISPLACED / UNCLEAR`**.

---

### 4.2 Observation `FP-OPS-13`: Campus Learners Roster Bulk Student PII CSV Export Authority
- **Component Location:** `src/features/students/StudentRoster.jsx:77`, embedded in Tab 6 (`students`) via `OpsLeadDashboard.jsx:215-226`.
- **Observed Implementation:**
  - In `StudentRoster.jsx:77`:
    ```javascript
    const canExportRoster = userRole !== "instructor" && userRole !== "admin" && !isAdmin;
    ```
  - For `userRole === "opslead"`, `canExportRoster` evaluates to `true`, rendering an "Export CSV" button in the roster header that allows downloading campus learner names, levels, parent contacts, and enrollment details to local device storage.
- **Governance Analysis & Open Authority Question:**
  - Under `DOM05-PRIV-01` / Blueprint §6.10, §7.3, teaching instructors and technical admin were barred from bulk CSV downloads to prevent data harvesting.
  - Authoritative Blueprint v3.4.1 §6.8 authorizes the Operational Leader to monitor student throughput and campus logistics on screen. However, no approved blueprint provision or accepted owner decision establishes whether operational leaders are authorized to export bulk student/parent PII records to local disk.
  - In accordance with `03-technical-audit-method.md` Principle 4 ("No Authority by Inference"), operational monitoring does not infer bulk PII export rights.
- **Outcome Status:** **`[Owner Decision Required]` (Governance Gap)**.

---

### 4.3 Documentation of Core Operational Capabilities (Conforming Baseline)

The remaining tabs in the Operational Leader workspace demonstrate exemplary alignment with ratified governance:

1. **Class Batch Scheduling (`AvailableBatches.jsx`, Tab 8):**
   - Implements Ratified Owner Decision 2026-10-13 Decision 2 (Option B).
   - In `AvailableBatches.jsx:52-60`, `canAdminister` is enabled for `role === "opslead"`, exposing the `+ Add Available Batch` button and `BatchModal` for timetable and room allocation.
   - Batch deletion (`canDelete`) is cleanly restricted to Executive Leadership (`director`, `vice_director`), preventing accidental cohort destruction.
   - Backend security rules (`firestore.rules:912-925`) permit class creation and updates for `isOpsLead()` scoped to `isSameBranch()`.
2. **Corporate Events & Logistics (`CorporateEventsPanel.jsx`, Tab 11):**
   - Implements Ratified Owner Decision 2026-10-13 Decision 3.
   - Exposes branch event creation and cancellation (`canCreate={true}`, `canCancel={true}`) for campus workshops, seminars, and calendar schedules.
   - Backend rules (`firestore.rules:1020-1049`) strictly restrict branch staff (including Ops Lead) to `audienceType == 'branch'` within `userBranch()`, while academy-wide events (`audienceType == 'all'`) remain reserved for Executive Leadership.
3. **Dual-Control Approvals Inbox (`ApprovalInbox.jsx`, Tab 2):**
   - Implements Ratified Decisions G-009 and OD-O4 (Option A).
   - Authorizes branch attendance corrections, class transfers, whole-class reschedules, and cash discrepancies under Rp 20.000.
   - Backend rules (`firestore.rules:1204-1258`) decoupled `isOpsLead()` from ordinary cashiers (`isFrontDeskStaff()`), preventing cashiers from approving tickets addressed to the Operational Leader.
4. **Shift Cash Reconciliation Oversight (`OpsLeadReconciliationTab.jsx`, Tab 3):**
   - Implements Ratified Decisions G-009 and OD-O3 (Option A).
   - Displays real-time breakdown of Cash, QRIS, and Bank Transfer intake collected by front-desk cashiers, with links to the discrepancy approval queue.
   - Personal payment collection is completely absent, preserving Maker-Checker segregation.
5. **Facilities & Maintenance Coordination (`OpsLeadFacilitiesTab.jsx`, Tab 4):**
   - Implements Blueprint v3.4.1 §6.8 and §6.10.
   - Dispatches and tracks maintenance and cleaning tasks assigned specifically to on-duty Office Boy / Facilities personnel (`officeboy`), bounded to `myBranch`.
6. **Front Desk Intake Performance (`FrontOfficePerformanceTab.jsx`, Tab 5):**
   - Implements Blueprint v3.4.1 §6.8.
   - Tracks reception throughput, visitor conversion pipeline, and uncontacted leads across Courses and Kindergarten divisions without cashiering or enrollment mutation triggers.
7. **Live Class & Room Board (`TodayScheduleBoard.jsx`, Tab 9):**
   - Implements Blueprint v3.4.1 §6.8.
   - In-memory schedule board displaying room assignments, class times, and instructor assignments for timetable conflict prevention and visitor greeting.

---

### 4.4 Documentation of Intentionally Absent Capabilities

In accordance with `03-technical-audit-method.md` §3.3 (`INTENTIONALLY ABSENT`), the following capabilities are confirmed omitted from the Operational Leader workspace:

| Capability | Intended Authority Holder | Observed Status in Ops Lead Cockpit | Backend Enforcement Status |
|---|---|---|---|
| **Personal Tuition Intake & Cashier Intake Modal** | Front Office (`frontoffice`) | Omitted. No cashier intake form or payment modal trigger. | `BLOCKED`: `canCreatePayment` denied to `opslead` (`firestore.rules:1138-1188`). |
| **Tuition Discounts & Fee Waivers Approval** | Director & Vice Director (OD-05, OD-2) | Omitted. `ApprovalInbox` rejects discount tickets for `opslead`. | `BLOCKED`: `firestore.rules:1204-1258` requires executive authority. |
| **Pedagogical Evaluation Grading & Remarks Entry** | Teaching Instructors (`instructor`) | Omitted. `OpsLeadProgressReportsTab` has zero grading inputs. | `BLOCKED`: `firestore.rules:1337-1344` requires instructor auth. |
| **Student Level Advancement (Promotion Execution)** | Front Office / Division Manager (OD-FO-02) | Omitted. No "Promote" buttons in `StudentRoster` or `OpsLeadProgressReportsTab`. | `BLOCKED`: `firestore.rules:1347-1358` denies updates to `opslead`. |
| **Academic Placement Test Overrides** | Central Academic Lead / Instructor Leader (Blueprint §6.11) | Omitted. Ops Lead cannot grant level overrides. | `BLOCKED`: `firestore.rules:1204-1258` requires `isInstructorLeader()`. |
| **Substitute Instructor Approvals** | Central Academic Lead / Instructor Leader (Blueprint §6.11) | Omitted. Ops Lead cannot approve substitute teachers. | `BLOCKED`: `firestore.rules:1204-1258` requires `isInstructorLeader()`. |
| **Staff Invitation & Account Provisioning** | System Admin (`admin`) & Executives | Omitted. `InvitesPanel` is completely unmounted. | `BLOCKED`: `firestore.rules:875-888` requires admin/director auth. |
| **Satellite Branch Progress Reports Access** | N/A (Lean satellite model; Course Mgr oversight) | Omitted. Fail-closed UI banner blocks non-Main Campus branches. | `BLOCKED`: `firestore.rules:1318-1320, 1330-1332` requires `kota_gorontalo`. |

---

## 5. Verification Evidence & Test Execution Record

In accordance with `AGENTS.md` verification precedence and honest reporting standards, the following read-only test suites were executed against the repository:

### 5.1 Ops Lead Unit & Repository Test Suite
- **Command Run:**
  ```powershell
  npx vitest run src/features/dashboard/opslead/ src/features/dashboard/OpsLeadDashboard.test.js src/features/students/progressReportsRepository.test.js
  ```
- **Results:** **`5 passed (5 test files, 51 passed tests, 0 failed)`**, Duration: 1.84s
  - `src/features/dashboard/opslead/opsLeadUtils.test.js`: 12 passed
  - `src/features/students/progressReportsRepository.test.js`: 24 passed (including 11 tests verifying `fetchOpsLeadProgressReports` and 13 tests verifying `resolveOpsLeadQueryLimit` bounds [1..50])
  - `src/features/dashboard/opslead/OpsLeadBottlenecksSection.test.js`: 3 passed
  - `src/features/dashboard/opslead/OpsLeadProgressReportsTab.test.js`: 4 passed (Main Campus rendering, satellite branch restriction notice for Bone Bolango & Limboto, and empty/loading states)
  - `src/features/dashboard/OpsLeadDashboard.test.js`: 8 passed (Dashboard shell rendering, tab switching, and component mounts)

### 5.2 Security Rules Matrix Test Suite
- **Command Run:**
  ```powershell
  npx vitest run src/features/shared/securityRulesMatrix/
  ```
- **Results:** **`5 passed (5 test files, 227 passed tests, 0 failed)`**, Duration: 251ms
  - `userAuthorization.test.js`: 14 passed
  - `branchIsolation.test.js`: 18 passed
  - `operationalResources.test.js`: 46 passed
  - `divisionIsolation.test.js`: 112 passed (including test 7: `DOM04-SEC-05: /payments creation is restricted to frontoffice and denied to opslead`)
  - `approvals.test.js`: 37 passed (including Ops Lead approvals decoupling and discrepancy threshold tests)

### 5.3 Live Firestore Rules Emulator Test Suite Status (Honest Reporting)
- **Command Run:**
  ```powershell
  npx vitest run src/features/shared/firestoreRulesEmulator/classesAndAcademic.emulator.test.js
  ```
- **Results:** **`1 skipped (1 test file, 53 skipped tests, 0 failed)`**
- **Reporting Reason:** The live Firebase emulator process was offline during this audit session (`FIRESTORE_EMULATOR_HOST` not connected). Tests gracefully skipped rather than executing against live rules. In strict adherence to `AGENTS.md` ("Never claim verification that did not happen"), backend enforcement outcomes in this report remain static rule inspections confirmed via repository rule logic and security matrix tests, but not runtime-confirmed against an active emulator instance.

---

## 6. Governance Findings, Open Questions & Implementation Handoff

### 6.1 Summary of Placement Outcomes
- **Total Checks Evaluated:** 17 targeted structural checks (`FP-OPS-01` through `FP-OPS-16`, including split rows `11A` and `11B`).
- **Conforms:** 14 checks cleanly conform to Authoritative Blueprint v3.4.1 and accepted Owner Decisions.
- **Misplaced / Unclear:** 2 checks (`FP-OPS-11A` and `FP-OPS-11B`).
- **Owner Decision Required:** 1 check (`FP-OPS-13`).

### 6.2 Conformance Findings (Ratified Governance Conflicts)
1. **`FP-OPS-11A` — Cash Drawer Balancing Action & Backend Shift Update Path Exposed to Operational Leader:**
   - *Conflict:* Exposing the "End Shift & Count Drawer" button via `FrontDeskCashReconcile.jsx` inside Tab 10 allows an Ops Lead holding an open duty shift to count drawers, balance cash registers, and initiate discrepancy tickets. Furthermore, static inspection of `canUpdateShift` (`firestore.rules:1378-1392`) shows Ops Lead aliases are included in `isFO` and allowed `cashReconciliation` in `diffKeys`, indicating a potential backend governance/security divergence against ratified Decision OD-O3 (*"Ops Lead does not personally act as cashier"*), though runtime verification remains unconfirmed due to the offline emulator. Tracing confirms maker self-approval is strictly blocked by `firestore.rules:1270` (`request.auth.uid != resource.data.requestedByUid`) and `ApprovalInbox.jsx:339`, but this creates a maker-checker operational conflict that strands the ticket if no other eligible branch checker is available.
2. **`FP-OPS-11B` — Operational Reports Workspace Clutter & Division Truncation:**
   - *Issue:* Mounting `FrontOfficeReportsTab` duplicates Tab 3 (cash reconciliation) and Tab 5 (inquiry tracking), while defaulting to `division="courses"`, which artificially truncates Kindergarten desk inquiries for a whole-campus leader.

### 6.3 Governance Gaps Requiring Owner Decision
1. **`FP-OPS-13` — Bulk Student PII CSV Export Authority for Operational Leaders:**
   - *Governance Question:* Does the Operational Leader's on-screen student throughput and capacity monitoring authority authorize downloading bulk student PII (names, parent contacts, levels) to local device storage via CSV, or should bulk roster export be restricted to Division Managers and Executive Leadership?

### 6.4 Implementation Handoff & Governance Boundaries
- In strict adherence to `AGENTS.md` Read-Only Audit Boundaries and `03-technical-audit-method.md` §3.2, no application code, security rules, or decision documents were modified during this pass.
- Remediation of findings `FP-OPS-11A` and `FP-OPS-11B` and resolution of policy gap `FP-OPS-13` are formally deferred to an owner-authorized implementation task following Owner Kifry's review.

---

## 7. Audit Verdict & Readiness Assessment

- **Audit Pass Verdict:** **`READY WITH MINOR FOLLOW-UP`**
- **Readiness Justification:**
  - The Operational Leader cockpit exhibits exemplary architectural discipline and strong alignment with Authoritative Blueprint v3.4.1, Ratified Decisions OD-O1 to OD-O4, and the recent progress-report exception `OD-OPS-01`.
  - The newly added Academic Progress tab (`OpsLeadProgressReportsTab.jsx`) strictly respects Main Campus physical scope, enforces dual-division isolation, bounds queries to Spark quota limits (max 50/div), fails closed on satellite branches and query errors, displays explicit read-only governance notices, and completely omits grading or promotion controls.
  - The operational follow-up consists of addressing the conformance finding on Tab 10 cash drawer balancing exposure and backend shift update divergence (`FP-OPS-11A`) and clarifying bulk CSV export authority (`FP-OPS-13`) through separate owner-authorized workflows.
