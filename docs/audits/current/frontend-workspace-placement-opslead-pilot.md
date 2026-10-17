# Frontend Workspace Placement Pass — Operational Leader (`opslead`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** Operational Leader / Ops Lead (`opslead`) Workspace Cockpit  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4.1 (§4, §5, §6.8, §6.10, §6.11, §15, §16, §18, §26 G-009, G-013, §41), Ratified Owner Decisions OD-O1 to OD-O4 (2026-10-08), Class Scheduling & Corporate Events Decision (2026-10-13), and Ratified Progress Reports Read Access Decision `OD-OPS-01` (2026-10-17)  
> **Status:** SCOPED PILOT REPORT — REMEDIATION & VERIFICATION COMPLETED (FP-OPS-11A & FP-OPS-11B)
> **Verification Method:** Static code inspection of React components, routing, repository contracts, and Firestore security rules, coupled with live Firestore Rules emulator execution (`attendanceAndShifts.emulator.test.js`, 30/30 passed across all 5 recognized Ops Lead aliases), Level 1 regression check suites (TypeScript `npm run typecheck` passed with 0 errors; focused Vitest component suite with 106 tests passed across 11 files), and security rules matrix suites (239 tests passed)

---

## 1. Pilot Scope & Executive Summary

This pilot report documents a scoped inspection and automated test audit of the **Operational Leader / Ops Lead (`opslead`)** workspace under the approved **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3), updated with the verified remediations of findings `FP-OPS-11A` (ratified OD-O3 / G-009) and `FP-OPS-11B` (Option A de-cluttering).

### 1.1 Scope Boundaries & Operational Role Identity
- **Single Role Cockpit:** This inspection is strictly focused on the Operational Leader (`opslead`) workspace mounted via `OpsLeadDashboard.jsx` in `src/App.jsx:604-610`. It evaluates the routing shell, 10 mounted tabs and nested components (following the verified removal of redundant Tab 10), shared controls, data queries, and underlying Firestore security rules.
- **Strict Separation from Front Office:** Under Authoritative Blueprint v3.4.1 §6.8, §6.9 and Ratified Decisions OD-O1 through OD-O4, the Operational Leader is a branch-site operational coordinator, not a front-desk receptionist or cashier. Although legacy code aliases (`frontofficelead`, `ops_lead`) normalize to `opslead` for backward-compatible routing (OD-O1 Option A), the Operational Leader cockpit is distinct from `FrontOfficeDashboard.jsx`, `KidsFrontOfficeDashboard.jsx`, and `CrossDivDashboard.jsx`. Overlapping role aliases do not make their workspaces, permissions, or separation-of-duties boundaries interchangeable.
- **Binding Governance Baseline for Academic Progress Reports (`OD-OPS-01` / `G-013`):** Under Owner Decision `OD-OPS-01` (ratified 2026-10-17) and Blueprint v3.4.1 (§6.8, G-013, §41), the Operational Leader is granted a narrow, read-only operational visibility exception over student progress reports strictly at the Main Campus (`kota_gorontalo`) across Course Academy and Kindergarten divisions. Operational Leaders hold zero academic, grading, student level promotion, or record mutation authority, and zero access to progress reports at satellite branches (`bone_bolango`, `limboto`, `pohuwato`).
- **Preservation of Unresolved Legacy Reports:** Cloud Firestore query indexing requires explicit equality filters on `division`. Progress reports lacking an explicit `division` attribute (historical legacy records) or lacking `branchId` or `examDate` are excluded from Ops Lead queries and fail closed under security rules. In accordance with audit instructions, this known legacy state is preserved as excluded and unresolved; no historical data was backfilled or inferred during this pass.
- **Remediation & Remaining Open Scope:** Conformance findings `FP-OPS-11A` (cash drawer counting and shift reconciliation write access) and `FP-OPS-11B` (Tab 10 redundancy and Courses-only inquiry truncation) have both been remediated and verified. Following approved Option A, redundant Tab 10 (`FrontOfficeReportsTab`) was cleanly unmounted from `OpsLeadDashboard.jsx`. This removal also removes the Ops Lead's personal shift history view, leaving relocation for a separate owner decision. Governance question `FP-OPS-13` (bulk student CSV export) remains explicitly OPEN as `[Owner Decision Required]`.

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
| **`FP-OPS-11A`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx` (former Tab 10 mount)<br>`src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:189-200` (former container)<br>`src/features/dashboard/frontoffice/FrontDeskCashReconcile.jsx:182-190`<br>`src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx:1-300` | Cash Drawer Balancing & End-of-Shift Reconciliation Action Exposed to Ops Lead | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §18; Ratified Decision OD-O3 (Option A) | Ops Lead Dashboard -> Operational Reports Tab (`reports`) [former location, now unmounted] -> Sub-tab "cash" -> Button "End Shift & Count Drawer" [suppressed in component] | **Remediated & Runtime-Verified:** `FrontDeskCashReconcile.jsx` hides button and displays "Duty Shift Active (Kiosk Attendance Only)"; `canUpdateShift` (`firestore.rules:1378-1436`) strictly restricts `cashReconciliation` to Front Office cashiers. Verified in live Firestore emulator (30/30 passed) across all 5 recognized Ops Lead aliases (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`). | `CONFORMS (REMEDIATED & VERIFIED)` | Conformance finding remediated per OD-O3 / G-009: Ops Lead drawer count controls omitted from UI, shiftsRepository throws, and backend rules strictly reject cashReconciliation writes while preserving legitimate kiosk attendance clock-out (Finding 4.1). |
| **`FP-OPS-11B`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx` (former Tab 10 mount, previously lines 265-274)<br>`src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:1-408` (former mount) | Redundant Operational Reports Tab Mount & Courses-Only Truncation | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8; OD-O2; Ratified Option A (2026-10-17) | Ops Lead Dashboard (former Tab 10 mount unmounted; formerly `/portal#reports`) | Cleanly unmounted from `OpsLeadDashboard.jsx` and imports pruned; verified via `OpsLeadDashboard.test.js` (8/8 passed) and component suite (11 files, 106 passed) | `CONFORMS (REMEDIATED — OPTION A)` | Option A implemented: redundant Tab 10 unmounted, eliminating duplicate cashier/intake sub-tabs and inquiry truncation. Personal shift history access removed and deferred to separate decision (Finding 4.1.2). |
| **`FP-OPS-12`** | `opslead` (Main Campus) | `src/features/dashboard/OpsLeadDashboard.jsx:264-268`<br>`src/features/attendance/CorporateEventsPanel.jsx:1-394` | Campus Corporate Events & Logistics Management (`CorporateEventsPanel` with `canCreate={true}`, `canCancel={true}`) | `PRIMARY` | Authoritative Blueprint v3.4.1 §6.8; Ratified Owner Decision 2026-10-13 Decision 3 | Ops Lead Dashboard -> Events & Logistics Tab (`events`) | Enforced in rules: `corporateEvents` branch-scoped create/cancel allowed for `isOpsLead()` (`firestore.rules:1020-1049`) | `CONFORMS` | Primary authority to schedule and cancel local branch events, workshops, training sessions, and school calendar meetings |
| **`FP-OPS-13`** | `opslead` (Main Campus) | `src/features/students/StudentRoster.jsx:77` | Campus Learners Bulk Student PII CSV Export Feature (`canExportRoster` check) | `INFORMATIONAL` | Authoritative Blueprint v3.4.1 §6.8, §6.10, §7.3; DOM05-PRIV-01 [Owner Decision Required] | Campus Learners Tab -> Roster Header -> Export CSV Button | Pure client-side generation from loaded `students` array | `[Owner Decision Required]` | Authority to export bulk student PII is unresolved in approved sources; operational monitoring does not infer export authority (Finding 4.2) |
| **`FP-OPS-14`** | `opslead` (global) | `src/features/dashboard/OpsLeadDashboard.jsx` (complete tab array: 10 tabs)<br>`firestore.rules:1138-1188` | Personal Cashier Tuition Payment Intake (`PaymentModal` / `PaymentCashierTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4.1 §6.8, §18; Ratified Decision OD-O3 | Fully unmounted in Ops Lead shell; no payment intake buttons or cash register modal triggers | Enforced in rules: `canCreatePayment` denied to `opslead` (`firestore.rules:1138-1188`) | `CONFORMS` | Cleanly omitted from Ops Lead cockpit; preserves Maker-Checker separation between cashier and discrepancy approver |
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
- **Component Location:** `src/features/dashboard/OpsLeadDashboard.jsx` (former Tab 10 mount, previously lines 265-274), `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:189-200` (former container), `src/features/dashboard/frontoffice/FrontDeskCashReconcile.jsx:182-190`, and `src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx:1-300`.
- **Active-Shift Execution Path & Pre-Remediation UI Exposure:**
  1. **Shift Initiation:** Operational Leaders perform on-duty station attendance clock-in at the attendance kiosk via `src/features/attendance/kioskScanProcessor.js:394-440` (`executeStaffClockIn`). This creates an open document in the `/shifts` collection with `userId == currentUser.uid`, `branchId`, and `clockOut == null`.
  2. **Active Shift Query in Reports Tab:** In `FrontOfficeReportsTab.jsx:49-57`, the tab independently executes `fetchOpenShiftFor(currentUser.uid, branchToId(myBranch))`. If the Ops Lead has an open duty shift, `internalActiveShift` is populated.
  3. **Button Exposure (Pre-Remediation Behavior):** In earlier un-remediated code, `FrontOfficeReportsTab.jsx:191-198` rendered `<FrontDeskCashReconcile>` under sub-tab `"cash"`, passing `activeShift`. In `FrontDeskCashReconcile.jsx:182-190`, `activeShift != null` previously triggered the unconditional rendering of the cashier action button (pre-remediation behavior; now suppressed for Ops Leads and replaced by the non-actionable duty shift badge):
     ```jsx
     <button onClick={() => setShowReconcileModal(true)}>End Shift & Count Drawer</button>
     ```
  4. **Drawer-Count Entry (Pre-Remediation Behavior):** Prior to remediation, clicking this button opened `ShiftReconciliationModal.jsx`, allowing an Ops Lead to enter counted physical cash and QRIS, calculate drawer overage/shortage, enter notes, and submit `clockOutShiftWithCashReconciliation(activeShift.id, ...)` (pre-remediation behavior; now blocked across UI, modal, repository, and rules layers).
  5. **Discrepancy-Ticket Flow (Pre-Remediation Flow):** Prior to remediation, if counted cash differed from system expected totals by more than the threshold, submitting the modal called `createApprovalEnvelope("CASH_DISCREPANCY", ...)` and submitted an approval ticket with `requestedByUid == currentUser.uid` (pre-remediation flow; now unreachable because drawer counting and cashier shift close are denied to Ops Leads).
- **Identified Rule Divergence & Governance Conflict (OD-O3):**
  - Prior to remediation, `canUpdateShift` in `firestore.rules:1378-1392` grouped Ops Lead aliases (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`) with Front Office in `isFO`. This permitted Ops Leads with active duty shifts to submit `cashReconciliation` fields during shift closing, creating backend permission to record cash drawer counts in direct violation of ratified Decision OD-O3 (*"Ops Lead does not personally act as cashier"*).
  - Simultaneously, `FrontDeskCashReconcile.jsx` unconditionally exposed the "End Shift & Count Drawer" button when `activeShift != null`, allowing Ops Leads to launch `ShiftReconciliationModal.jsx` and generate discrepancy tickets.
- **Implemented 4-Layer Defense-in-Depth Remediation:**
  1. **Backend Security Rules (`firestore.rules:1378-1436`):**
     - In `canUpdateShift(shiftId)`: Differentiated pure Front Office (`let isPureFO = r == 'frontoffice';`) and added `&& (!('cashReconciliation' in diffKeys) || isPureFO)` to Clause 1. Operational Leaders can still clock out active duty shifts for attendance kiosk check-out, but any write touching `cashReconciliation` fails closed with `PERMISSION_DENIED`.
     - In `/shifts` `allow create`: Added `&& !('cashReconciliation' in request.resource.data)` to prevent pre-seeding closed cashier counts on new shift creation.
  2. **Repository Gate (`src/features/attendance/shiftsRepository.js:442-455`):**
     - `clockOutShiftWithCashReconciliation` inspects `requester.role` and throws an error if called with an Ops Lead role alias, refusing to create discrepancy tickets or write shift documents.
  3. **Dialog Modal Defense (`src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx:84-93`):**
     - `handleSubmit` evaluates `effectiveRole` and aborts with an error toast if `currentUser.role` matches an Ops Lead alias.
  4. **Workspace UI Presentation (`FrontDeskCashReconcile.jsx`, `FrontOfficeReportsTab.jsx`, `OpsLeadDashboard.jsx`):**
     - `OpsLeadDashboard.jsx:272` passes `userRole={effectiveRole}` to `<FrontOfficeReportsTab>`.
     - `FrontOfficeReportsTab.jsx:197` forwards `userRole={userRole}` to `<FrontDeskCashReconcile>`.
     - `FrontDeskCashReconcile.jsx:55-58, 197-213` evaluates `isOpsLeadRole` and suppresses the "End Shift & Count Drawer" button, rendering a non-actionable badge: `Duty Shift Active (Kiosk Attendance Only)`.
- **Live Runtime Emulator Verification Evidence:**
  - Executed: `npx firebase emulators:exec --only firestore --project demo-myliberty-rules "npx vitest run src/features/shared/firestoreRulesEmulator/attendanceAndShifts.emulator.test.js"`.
  - **Result:** **30 passed (30 tests)** in 10.94s with zero failures against the live Firestore rules emulator.
  - Verified across all 5 recognized Ops Lead aliases (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`):
    - Closing shift with `cashReconciliation` is strictly **DENIED** (`assertFails`).
    - Closing shift without `cashReconciliation` is **ALLOWED** (`assertSucceeds`), preserving attendance clock-out.
    - Front Office cashier reconciliation write is preserved and succeeds.
- **Resolution Status:** **`CONFORMS (REMEDIATED & RUNTIME-VERIFIED)`**.
- *Note on Sibling Observation:* Sibling observation `FP-OPS-11B` (tab duplication & Kindergarten inquiry truncation) has been **RESOLVED & VERIFIED** under approved Option A.

#### 4.1.2 Conformance Remediation `FP-OPS-11B`: Removal of Redundant Operational Reports Tab 10 (Option A)
- **Component Locations:**
  - `src/features/dashboard/OpsLeadDashboard.jsx` (Tab 10: `FrontOfficeReportsTab` unmounted; former lines 260-275)
  - `src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:1-408` (former Tab 10 mount)
  - `src/features/dashboard/OpsLeadDashboard.test.js:64-67, 144` (Test assertion updated)
  - `src/features/dashboard/opslead/OpsLeadReconciliationTab.jsx:1-205` (Tab 3: Preserved dedicated reconciliation cockpit)
  - `src/features/dashboard/opslead/FrontOfficePerformanceTab.jsx:1-409` (Tab 5: Preserved dual-division intake cockpit)
- **Problem Context & Root Cause Analysis:**
  Mounting `<FrontOfficeReportsTab>` as Tab 10 in `OpsLeadDashboard.jsx` was an earlier workspace placement shortcut that introduced workspace incoherence:
  1. **Functional Duplication:**
     - Sub-tab 1 ("Cash Register Reconciliation") duplicated the purpose-built reconciliation cockpit in Tab 3 (`OpsLeadReconciliationTab.jsx`), which already summarizes Cash, QRIS, and Transfer totals, displays the daily payments ledger, and enforces the G-009 discrepancy policy.
     - Sub-tab 2 ("Today's Inquiry Count") duplicated Tab 5 (`FrontOfficePerformanceTab.jsx`), which is specifically designed for the Operational Leader to coordinate front-office responsiveness, intake velocity, follow-up stages, and lead conversion across both divisions.
  2. **Courses-Only Inquiry Scope Truncation:**
     - `OpsLeadDashboard.jsx` mounted `<FrontOfficeReportsTab>` without a `division` prop.
     - `FrontOfficeReportsTab.jsx:30` defaulted to `division = "courses"`, causing `fetchRecentDeskInquiries` to append `where("division", "==", "courses")` and filter `inq.division === "courses"`.
     - Consequently, Kindergarten inquiries at Main Campus were artificially truncated from Tab 10.
- **Implemented Remediation (Approved Option A — De-clutter & Prune):**
  1. **Clean Unmounting from Ops Lead Shell (`src/features/dashboard/OpsLeadDashboard.jsx`):**
     - Removed `import FrontOfficeReportsTab from "./frontoffice/FrontOfficeReportsTab";`.
     - Removed unused `FileText` icon import from `lucide-react`.
     - Removed the Tab 10 definition (`id: "reports"`, `label: "Operational Reports"`) from the `tabs` array.
     - Reduced Ops Lead dashboard tabs from 11 to 10 cleanly focused operational command tabs.
  2. **Preservation of Core Workspaces & Invariants:**
     - Tab 3 (`OpsLeadReconciliationTab.jsx`) remains the sole, dedicated shift cash reconciliation and discrepancy review cockpit.
     - Tab 5 (`FrontOfficePerformanceTab.jsx`) remains the dedicated dual-division front-office performance and intake tracking cockpit, preserving complete visibility across Course Academy and Kindergarten inquiries.
     - All other operational tabs (Overview, Approvals, Facilities, Campus Learners, Academic Progress, Capacity & Batches, Live Schedule Board, Events & Logistics) remain intact.
     - No modifications were made to Firestore security rules, governance decisions, or Front Office workspaces (`FrontOfficeDashboard.jsx`, `KidsFrontOfficeDashboard.jsx`).
  3. **Personal Shift History Impact (Disclosed Limitations):**
     - **Reported Impact:** Removing Tab 10 completely removes access to the Operational Leader's personal shift history (`fetchUserShifts(currentUser.uid, 30)`), which was housed under Sub-tab 3 of `FrontOfficeReportsTab`.
     - **Governance Discipline:** In strict accordance with audit instructions, personal shift history was NOT relocated to the Overview tab or added as a new self-service feature. Relocation of personal shift history is formally deferred for a separate owner decision.
  4. **Component Test Suite Update (`src/features/dashboard/OpsLeadDashboard.test.js`):**
     - Removed mock of `FrontOfficeReportsTab`.
     - Updated tab assertion: verifies all 10 operational tabs and asserts `expect(html).not.toContain("Operational Reports")`.
- **Verification Evidence:**
  - **Component & Unit Suite:** `npx vitest run src/features/dashboard/OpsLeadDashboard.test.js src/features/dashboard/opslead/ src/features/dashboard/frontoffice/ src/features/students/progressReportsRepository.test.js`
    - **Result:** **`11 passed (11 test files, 106 passed tests, 0 failed)`** in 3.13s.
  - **TypeScript Typecheck:** `npm run typecheck`
    - **Result:** **`Passed (0 errors)`** in 1.84s.
  - **Security Rules Matrix:** `npx vitest run src/features/shared/securityRulesMatrix/`
    - **Result:** **`5 passed (5 test files, 239 passed tests, 0 failed)`** in 264ms.
- **Resolution Status:** **`CONFORMS (REMEDIATED & VERIFIED — OPTION A IMPLEMENTED)`**.

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
2. **Corporate Events & Logistics (`CorporateEventsPanel.jsx`, Tab 10 [formerly Tab 11]):**
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
  npx vitest run src/features/dashboard/OpsLeadDashboard.test.js src/features/dashboard/opslead/ src/features/dashboard/frontoffice/ src/features/students/progressReportsRepository.test.js
  ```
- **Results:** **`11 passed (11 test files, 106 passed tests, 0 failed)`**, Duration: 3.13s
  - `src/features/dashboard/OpsLeadDashboard.test.js`: 8 passed (Dashboard shell rendering, 10 operational tab mounts, absence of "Operational Reports")
  - `src/features/dashboard/opslead/opsLeadUtils.test.js`: 12 passed
  - `src/features/students/progressReportsRepository.test.js`: 24 passed (including 11 tests verifying `fetchOpsLeadProgressReports` and 13 tests verifying `resolveOpsLeadQueryLimit` bounds [1..50])
  - `src/features/dashboard/opslead/OpsLeadBottlenecksSection.test.js`: 3 passed
  - `src/features/dashboard/opslead/OpsLeadProgressReportsTab.test.js`: 4 passed (Main Campus rendering, satellite branch restriction notice for Bone Bolango & Limboto, and empty/loading states)
  - `src/features/dashboard/frontoffice/FrontDeskCashReconcile.test.js`: 5 passed
  - `src/features/dashboard/frontoffice/FrontOfficeReportsTab.test.js`: 2 passed
  - `src/features/dashboard/frontoffice/FrontOfficeReportsIsolation.test.js`: 8 passed (division isolation)
  - `src/features/dashboard/frontoffice/deskInquiriesRepository.test.js`: 17 passed
  - `src/features/dashboard/frontoffice/WalkInInquiryTab.test.js`: 17 passed
  - `src/features/dashboard/frontoffice/TuitionDueWidget.test.js`: 6 passed

### 5.2 Security Rules Matrix Test Suite
- **Command Run:**
  ```powershell
  npx vitest run src/features/shared/securityRulesMatrix/
  ```
- **Results:** **`5 passed (5 test files, 239 passed tests, 0 failed)`**, Duration: 264ms
  - `userAuthorization.test.js`: 14 passed
  - `branchIsolation.test.js`: 18 passed
  - `operationalResources.test.js`: 58 passed (including tests verifying `canUpdateShift` denies `cashReconciliation` to all 5 Ops Lead role aliases and allows attendance clock-outs)
  - `divisionIsolation.test.js`: 112 passed (including test 7: `DOM04-SEC-05: /payments creation is restricted to frontoffice and denied to opslead`)
  - `approvals.test.js`: 37 passed (including Ops Lead approvals decoupling and discrepancy threshold tests)

### 5.3 Live Firestore Rules Emulator Test Suite Status (Attendance, Shifts & Cashier Separation)
- **Command Run:**
  ```powershell
  npx firebase emulators:exec --only firestore --project demo-myliberty-rules "npx vitest run src/features/shared/firestoreRulesEmulator/attendanceAndShifts.emulator.test.js"
  ```
- **Results:** **`1 passed (1 test file, 30 passed tests, 0 failed, 0 skipped)`**, Duration: 10.94s
- **Verification Evidence:**
  - Verified live against active Firestore Security Rules in the Firebase emulator.
  - Front Office staff (`foGto`) can close shift with `cashReconciliation` (preserves approved cashier workflow).
  - Front Office staff (`foGto`) can close shift without `cashReconciliation` (regular attendance clock-out).
  - All 5 recognized Ops Lead aliases (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`) are strictly **DENIED** (`assertFails`) closing shifts with `cashReconciliation` (enforces OD-O3 / G-009).
  - All 5 recognized Ops Lead aliases are **ALLOWED** (`assertSucceeds`) closing shifts without `cashReconciliation` (preserves legitimate duty shift attendance clock-out).
  - Creating new shifts pre-seeded with `cashReconciliation` is strictly **DENIED**.
  - All 20 existing attendance, kiosk guard, correction gate, and shift audit event tests continue to pass.

### 5.4 TypeScript Typecheck & Core Static Verification
- **Command Run:**
  ```powershell
  npm run typecheck
  ```
- **Results:** **`Passed (0 errors)`**, Duration: 1.84s

---

## 6. Governance Findings, Open Questions & Implementation Handoff

### 6.1 Summary of Placement Outcomes
- **Total Checks Evaluated:** 17 targeted structural checks (`FP-OPS-01` through `FP-OPS-16`, including split rows `11A` and `11B`).
- **Conforms:** 16 checks cleanly conform to Authoritative Blueprint v3.4.1 and accepted Owner Decisions (including remediated and runtime-verified `FP-OPS-11A` and `FP-OPS-11B`).
- **Misplaced / Unclear (Open):** 0 checks.
- **Owner Decision Required (Open):** 1 check (`FP-OPS-13` — Bulk student PII CSV export authority).

### 6.2 Remediation Status & Conformance Findings
1. **`FP-OPS-11A` — Cash Drawer Balancing Action & Backend Shift Update Path Exposed to Operational Leader:**
   - **Status:** **`RESOLVED & RUNTIME-VERIFIED (CONFORMS)`**
   - *Resolution:* Implemented 4-layer defense in depth:
     - **UI:** `FrontDeskCashReconcile.jsx` hides the drawer counting button for Ops Lead roles, displaying an informational badge `Duty Shift Active (Kiosk Attendance Only)`. `OpsLeadDashboard.jsx` forwards `userRole={effectiveRole}` via `FrontOfficeReportsTab.jsx`.
     - **Modal:** `ShiftReconciliationModal.jsx` rejects submissions from Ops Lead roles with an error toast.
     - **Repository:** `shiftsRepository.js` throws an explicit error on `clockOutShiftWithCashReconciliation` calls from Ops Lead roles.
     - **Rules:** `firestore.rules:canUpdateShift` restricts `cashReconciliation` field updates strictly to pure Front Office (`isPureFO`), while allowing legitimate attendance clock-outs for Ops Leads. The `/shifts` create rule blocks pre-seeding `cashReconciliation`.
     - **Verification:** Verified via 30/30 live emulator tests covering all 5 Ops Lead role aliases (`opslead`, `ops_lead`, `operational_leader`, `operationalleader`, `frontofficelead`) and 58/58 security rules matrix tests.
2. **`FP-OPS-11B` — Operational Reports Workspace Clutter & Division Truncation:**
   - **Status:** **`RESOLVED & VERIFIED (CONFORMS — OPTION A IMPLEMENTED)`**
   - *Resolution:* Following Owner Kifry's approval of Option A, redundant Tab 10 (`FrontOfficeReportsTab`) was cleanly unmounted from `OpsLeadDashboard.jsx`, and unused imports (`FrontOfficeReportsTab`, `FileText`) were pruned. This completely eliminates the functional duplication of Tab 3 (cash reconciliation) and Tab 5 (intake tracking), as well as the Courses-only inquiry truncation defect. Core operational tabs (Tab 3 and Tab 5) and all role permissions were strictly preserved.
   - *Shift History Impact (Disclosed Limitation):* Removing Tab 10 removes access to the Ops Lead's personal shift history view (`fetchUserShifts(currentUser.uid, 30)`), which was housed under Sub-tab 3 of `FrontOfficeReportsTab`. In accordance with audit instructions, personal shift history was NOT relocated to Overview or added as a new feature; relocation is formally deferred for a separate owner decision.
   - *Verification:* Verified via `OpsLeadDashboard.test.js` (8/8 passed asserting absence of "Operational Reports"), the full component test suite (11 test files, 106 passed tests), and `npm run typecheck` (0 errors).

### 6.3 Governance Gaps Requiring Owner Decision
1. **`FP-OPS-13` — Bulk Student PII CSV Export Authority for Operational Leaders:**
   - **Status:** **`OPEN [Owner Decision Required]`**
   - *Governance Question:* Does the Operational Leader's on-screen student throughput and capacity monitoring authority authorize downloading bulk student PII (names, parent contacts, levels) to local device storage via CSV, or should bulk roster export be restricted to Division Managers and Executive Leadership? Remains open awaiting owner decision.

### 6.4 Implementation Handoff & Remaining Scope
- Conformance findings `FP-OPS-11A` (cashier separation) and `FP-OPS-11B` (Option A de-cluttering) have both been fully implemented and automated-test verified.
- Policy gap `FP-OPS-13` (bulk student CSV export authority) and relocation of personal shift history remain explicitly open in the wider Ops Lead audit pending Owner Kifry's review and direction.

---

## 7. Audit Verdict & Readiness Assessment

- **Audit Pass Verdict:** **`READY WITH MINOR FOLLOW-UP`**
- **Readiness Justification:**
  - The Operational Leader cockpit exhibits exemplary architectural discipline and strong alignment with Authoritative Blueprint v3.4.1, Ratified Decisions OD-O1 to OD-O4, and the recent progress-report exception `OD-OPS-01`.
  - The newly added Academic Progress tab (`OpsLeadProgressReportsTab.jsx`) strictly respects Main Campus physical scope, enforces dual-division isolation, bounds queries to Spark quota limits (max 50/div), fails closed on satellite branches and query errors, displays explicit read-only governance notices, and completely omits grading or promotion controls.
  - Finding `FP-OPS-11A` (cash drawer counting exposure & backend shift update path) has been remediated across UI, modal, repository, and rules layers, and verified via 30/30 live Firestore emulator tests across all 5 recognized Ops Lead role aliases.
  - Finding `FP-OPS-11B` (workspace clutter & division truncation) has been remediated under approved Option A: redundant Tab 10 was unmounted, cleanly resolving duplication and inquiry truncation while preserving dedicated Tab 3 and Tab 5 cockpits.
  - Remaining follow-up consists of:
    1. Resolving open governance decision `FP-OPS-13` (bulk student PII CSV export authority).
    2. Determining personal shift history relocation in a separate owner decision.
