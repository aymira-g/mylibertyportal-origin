# Design Proposal: Instructor Leader Tab 9 (`ReportsDashboard`) Role-Fit Cleanup & Export Governance

**Document Path:** `docs/proposals/2026-10-18-instructor-leader-tab9-role-fit-and-cleanup.md`  
**Date:** 2026-10-18 (Revised Direction: Tab 9 Kept Mounted)  
**Status:** **RATIFIED / IMPLEMENTED (OWNER-APPROVED SCOPE 2026-10-18)** (Tab 9 presentation scope implemented; unrelated institutional bulk export policy questions remain open)  
**Category:** Frontend Workspace Placement, Role Coherence & Export Governance  
**Governing Authority:** Authoritative Blueprint v3.4.1 (§4, §5, §6.11, §6.12, §15, §16, §18, §26 G-003, G-006, G-007, G-011, G-012, §41), Ratified Owner Decisions G-001–G-012 (2026-10-07, 2026-10-13), Ratified Decision `OD-STF-01` (2026-10-17, Staff Personal Shift History Access in Self-Service Profile), Ratified Decision `OD-OPS-02` (2026-10-17, Ops Lead Bulk Roster Export Restriction)  
**Target Workspace:** Instructor Leader / Central Academic Lead (`src/features/dashboard/InstructorLeaderDashboard.jsx`)  
**Audit Finding References:** `FP-IL-15` (Reports Tab Clutter & Supervisor Label Alignment), `FP-IL-16` (Bulk Institutional CSV Export Access Policy), `FP-IL-17` (Unscoped Province Query; Presentation Defect Verified `CLOSED` in Bug Ledger)  

---

## 1. Executive Summary & Context

Under the Frontend Workspace Placement Pass ([`frontend-workspace-placement-instructorlead-pilot.md`](../audits/current/frontend-workspace-placement-instructorlead-pilot.md)), Tab 9 (`ReportsDashboard`) in `InstructorLeaderDashboard.jsx` was reviewed for role coherence.

### 1.1 Owner Direction: Tab 9 Remains Mounted
Owner Kifry has confirmed the foundational architectural boundary for this task:
- **Tab 9 must remain mounted in `InstructorLeaderDashboard.jsx`.**
- Do **not** unmount Tab 9 or replace it with a different top-level tab.
- Propose a **proportionate, role-fit cleanup within Tab 9** that curates its presentation to align with the Instructor Leader's academic leadership and personal teaching compliance responsibilities.

### 1.2 Core Objectives of the Proposal
1. **Preserve Personal Self-Service Compliance:** Keep the Instructor Leader's access to **"My Punctuality"** (15-minute arrival readiness scorecard) and personal shift history (**"My Duty Log"**) fully operational within Tab 9.
2. **Explicit CSV Export Impact Analysis:** Inspect every proposed control or sub-tab change for its effect on bulk CSV downloads. Do not characterize hiding a screen as a neutral change. **Keep existing exports unchanged by default** unless a separate owner decision is required and explicitly granted.
3. **Strict Separation of UI Presentation from Backend Permissions:** Clearly delineate client-side UI presentation adjustments from backend Firestore security rules, repository query contracts, and export authority. Do not present UI recommendations as authorization to broaden or alter backend query permissions.
4. **Accurate Audit Findings Alignment:** Accurately reflect that the user-facing denial-looks-like-zero defect in `FP-IL-17` is **`CLOSED`** in [`bug-ledger.md`](../audits/current/bug-ledger.md) with an explicit error alert banner and retry dispatch, while separately analyzing the underlying unscoped Firestore query behavior.
5. **Clear Campus-Filter Decision Framing:** Clarify that defaulting to the home campus alone does not remove the "All Campuses" option from the dropdown, so users could still select it and trigger queries rejected by Firestore rules. Present explicit choices for owner review between locking this Reports view to the home campus (recommended, with province-wide academic oversight preserved via `ApprovalInbox`) or retaining the broader selector with handled queries.

> [!IMPORTANT]
> **Audit Boundary & Status Discipline:**
> - Tab 9 remains fully mounted and active in `InstructorLeaderDashboard.jsx` during this design review.
> - No production code, tests, Firestore security rules, schemas, or architecture documents are modified in this task.
> - The designs and policy options herein are **PROPOSED** and strictly await Owner Kifry's explicit decision.

---

## 2. Live Code Inventory: Tab 9 Controls, Data Scope & Export Behavior

In `src/features/dashboard/InstructorLeaderDashboard.jsx:264`, Tab 9 is mounted as:
```jsx
{ id: "reports", label: "Reports", component: <ReportsDashboard userBranch={effectiveBranch} isInstructorLeader={true} /> }
```

### 2.1 Evaluated Runtime Flags & Header Controls

In `src/features/reports/ReportsDashboard.jsx:13-39`, the passed props evaluate as follows:
- `userBranch`: Defaults to `"Kota Gorontalo"` (`effectiveBranch`).
- `isInstructorLeader`: `true`.
- `isAdminView = false`, `isFrontOffice = false`, `isManager = false`, `isExecutiveView = false`.
- **Derived Authority Flags:**
  - `isActualAdmin = false`
  - `isSupervisor = isActualAdmin || isManager || isExecutiveView` $\rightarrow$ **`false`** (The Instructor Leader is not flagged as a general supervisor in `ReportsDashboard`).
  - `canPerformAdminActions = false`
  - `canAccessProvinceScope = isExecutiveView || isInstructorLeader` $\rightarrow$ **`true`**
  - `canExportReports = isExecutiveView || isManager || isInstructorLeader` $\rightarrow$ **`true`**
- **Default Active Sub-Tab:** Resolves to `"today"` (line 47: `!isAdminView && !isManager`).

#### Header Controls Rendered:
1. **Title & Badge:** "Institutional Reports & Analytics", with badge "WITA (UTC+8)".
2. **Top-Level Export Button:** A prominent green button (`Export CSV Dataset`) is rendered because `canExportReports` is `true`. Clicking it triggers `activeTabRef.current.exportCSV()` on whichever sub-tab is mounted.
3. **Campus Branch Selector:** Because `canAccessProvinceScope` is `true`, an interactive dropdown is rendered:
   ```jsx
   <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
     <option value="all">All Campuses</option>
     {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
   </select>
   ```
   *Live Default:* `branchFilter` defaults to `"all"` (line 64).
4. **Historical Horizon Selector:** Rendered when `subTab !== "today" && subTab !== "instructors"`. Dropdown options: Last 7 Days, Last 30 Days (default), Last 90 Days, Last 12 Months, All Recorded History.

---

### 2.2 Sub-Tab Inventory: Visibility, Scope, and CSV Export

Out of the 6 sub-tabs defined in `ReportsDashboard.jsx`, **4 are rendered** for the Instructor Leader and **2 are hidden**:

| Sub-Tab Key | Rendered Label in Tab 9 | Visibility Condition in `ReportsDashboard` | Live Data Scope & Query Behavior | Current CSV Export File & Fields |
|---|---|---|---|---|
| **`today`** | **Today's Check-ins** | `!isAdminView` (Visible) | **Front-Desk Kiosk Scans:** Calls `fetchTodayScansData`. Queries `/attendance` and active classes for today.<br>*(Query Note: When "All Campuses" is selected, the query omits `branchId`, which is rejected by `firestore.rules:1018` for non-executives with `permission-denied`, triggering a toast error).* | **File:** `MYLIBERTY-Todays-Checkins-{date}.csv`<br>**Fields:** `Student Name`, `Status` (Checked In vs Missing), `Campus Branch`, `Time` (WITA), `Method` (kiosk/manual). |
| **`staff`** | **My Duty Log** | `!isAdminView` (Visible) | **Personal Staff Shifts:** Calls `fetchStaffShifts`. Because `isSupervisor` is `false`, line 22 forces `where("userId", "==", auth.currentUser.uid)`. Only personal shift and leave records for the authenticated leader are returned. | **File:** `MYLIBERTY-Staff-Attendance-{date}.csv`<br>**Fields:** `Staff Name`, `Role`, `Campus Branch`, `Class`, `Clock In`, `Clock Out`, `Derived Status`, `Auto-Closed`. |
| **`finance`** | *Financial & Tuition* | `isExecutiveView \|\| isManager` (Hidden) | **Zero Access:** Strictly hidden from Instructor Leader. Financial reporting is reserved for Executive Leadership and Division Managers under Blueprint §18 and OD-2. | *Not Accessible* |
| **`students`** | **Learner Progress** | `!isAdminView` (Visible) | **Branch Learner Progress:** Calls `fetchStudentProgressData`. Queries `/progressReports`, `/users`, `/classes`, and `/attendance`.<br>*(Query Note: Under "All Campuses", `/users` and `/attendance` list queries fail with 403 `permission-denied`. Handled via verified error banner and retry action).* | **File:** `MYLIBERTY-Learner-Progress-{date}.csv`<br>**Fields:** `Learner Name`, `Campus Branch`, `Status`, `Drop-out Alert` (AT RISK 14d+ Inactive), `Classes`, `Check-ins`, `Last Check-in`, `Evaluations`. |
| **`admissions`** | *Admissions & Leads* | `isExecutiveView \|\| isFrontOffice \|\| isManager` (Hidden) | **Zero Access:** Strictly hidden from Instructor Leader. Customer intake and admissions velocity are reserved for Front Office and Executive/Managerial oversight. | *Not Accessible* |
| **`instructors`** | **My Punctuality** | `!isAdminView && !isFrontOffice` (Visible) | **Personal Punctuality Scorecard:** Calls `fetchInstructorAnalyticsData`. Because `isSupervisor` is `false`, line 339 forces `where("instructorId", "==", uid)` and line 353 forces `where("userId", "==", uid)`. Calculates the leader's personal 15-minute pre-class arrival readiness. | **File:** `MYLIBERTY-Instructor-Punctuality-{month}-{year}.csv`<br>**Fields:** `Instructor`, `Campus Branch`, `Punctuality %`, `Scheduled`, `Attended`, `Late Arrivals`, `Absences`, `Avg Tardiness (min)`, `Data Quality`. |

---

## 3. Audit Status Alignment & Finding Verification

To ensure fidelity to the canonical audit record, findings referenced in this review are verified against [`docs/audits/current/bug-ledger.md`](../audits/current/bug-ledger.md) and live code:

### 3.1 Verification of `FP-IL-17` (Learner Progress Error Handling)
- **Bug Ledger Status:** **`CLOSED`** (Verified by independent reviewer on 2026-10-17).
- **Verified Code State:** In `src/features/reports/tabs/LearnerProgressTab.jsx:298-318`, when a query error occurs:
  - The false empty state (`"No enrolled learners match your filters"`) and zero KPI count are strictly suppressed.
  - A prominent error banner renders:
    ```jsx
    <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50/80 text-xs text-rose-900 space-y-3" role="alert">
      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
      <h4 className="font-bold text-sm text-rose-900">Failed to Load Learner Progress</h4>
      <p className="text-xs text-rose-700">{error}</p>
      <button type="button" onClick={() => fetchStudentProgress()} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry Query</span>
      </button>
    </div>
    ```
- **Underlying Unscoped Query Behavior (Separate from UI Defect):**
  - While the UI presentation failure is closed, the underlying query behavior remains active: when `branchFilter` is `"all"`, non-executive queries against `/users` (`firestore.rules:862`) and `/attendance` (`firestore.rules:1018`) lack a `branchId` filter and are rejected by Firestore security rules with `permission-denied`.
  - In `TodayTab.jsx:45`, this triggers a toast error (`"Error loading today's scans: ... Missing or insufficient permissions"`).
  - In `LearnerProgressTab.jsx:181`, it sets `error = USER_SAFE_PROGRESS_ERROR_MESSAGE` and renders the error banner.
  - **Query Behavior Calibration:** Defaulting Tab 9's `branchFilter` to the home campus (`kota_gorontalo`) ensures queries succeed upon initial mount. However, merely setting a default does not remove the "All Campuses" option from the dropdown, so users could still manually select it and trigger rejected queries. Locking this Reports view strictly to the home campus removes the "All Campuses" option entirely, whereas retaining the broader selector relies on the error presentation and toast handling for unsupported queries.

---

### 3.2 Verification of `FP-IL-15` (Supervisor Flag & Button Labeling)
- In `ReportsDashboard.jsx:26`, `isSupervisor` is defined as:
  ```javascript
  const isSupervisor = isActualAdmin || isManager || isExecutiveView;
  ```
- Because `isInstructorLeader` is not included, `isSupervisor` evaluates to `false`.
- This causes lines 137 and 198 to label Sub-tabs 2 and 4 as **"My Duty Log"** and **"My Punctuality"**.
- *Verification against Data Queries:* This individual-contributor labeling is technically consistent with the underlying queries: `fetchStaffShifts` (line 22) and `fetchInstructorAnalyticsData` (line 353) only fetch the authenticated user's own records when `isSupervisor` is false.
- *Role Coherence Observation:* While the labeling matches the self-scoped queries, embedding individual duty logs and personal punctuality inside an institutional "Institutional Reports & Analytics" dashboard labeled with "Operational audit logs & performance metrics" produces visual and cognitive clutter for a leadership role.

---

### 3.3 Verification of `FP-IL-16` (Bulk CSV Dataset Export Policy)
- In `ReportsDashboard.jsx:31`, `canExportReports` includes `isInstructorLeader`.
- *Governance Rule:* **Existing code or UI exposure does not constitute governance authorization.** The presence of an export button in `ReportsDashboard` is an operational implementation starting point, not an explicit owner decision that the Instructor Leader should hold broad bulk-export authority over operational datasets.
- Under Authoritative Blueprint §6.11, the Instructor Leader is responsible for academic delivery, pedagogy, and teacher evaluations. Broad export authority over daily receptionist kiosk check-ins or other staff shifts remains an open governance question (`[Owner Decision Required]`).

---

## 4. Proportionate Role-Fit Cleanup Recommendations Within Tab 9

Because Tab 9 remains mounted, the cleanup must be **proportionate, internal to Tab 9, and non-destructive to existing capabilities**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PROPORTIONATE ROLE-FIT CLEANUP WITHIN TAB 9                                            │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Area of Cleanup               │ Recommended Action within Tab 9                        │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Default Landing Sub-Tab    │ Recommend defaulting to "Learner Progress" (students); │
│                               │ alternative: "My Punctuality" (instructors)            │
│ 2. Campus Branch Selector     │ Recommend locking view to home campus (Kota Gorontalo);│
│                               │ alternative: retain selector with handled queries      │
│ 3. Sub-Tab Retention          │ Retain all 4 sub-tabs by default; evaluate hiding      │
│                               │ TodayTab only under an explicit owner decision         │
│ 4. CSV Export Capabilities    │ Preserve all 4 existing CSV export actions unchanged   │
│ 5. Self-Service Access        │ Retain My Punctuality and My Duty Log inside Tab 9     │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### 4.1 Recommendation 1: Default Landing Sub-Tab Alignment
- **Problem:** Currently, entering Tab 9 defaults to Sub-tab 1 (`today` / "Today's Check-ins"). The Instructor Leader is immediately presented with receptionist kiosk arrivals, which belong to Front Office operations.
- **Proportionate Cleanup:** In `ReportsDashboard.jsx:41-50`, set the default sub-tab for `isInstructorLeader` to:
  - **Option 1.1 (Academic First — Recommended):** Default to `"students"` (**"Learner Progress"**). The leader lands directly on student academic performance, evaluation archives, and dropout risk alerts.
  - **Option 1.2 (Compliance First):** Default to `"instructors"` (**"My Punctuality"**). The leader lands directly on their personal 15-minute teaching readiness scorecard.
- **Export Impact:** **Zero impact.** All sub-tabs and export buttons remain accessible.

---

### 4.2 Recommendation 2: Campus Branch Filter Calibration & Explicit Choices

- **Current Live Behavior & Limitation of Defaulting Alone:**
  - In `ReportsDashboard.jsx:29`, `canAccessProvinceScope = isExecutiveView || isInstructorLeader;` evaluates to `true`.
  - In line 64, `branchFilter` initializes to `"all"`, causing `/users` and `/attendance` queries in `TodayTab` and `LearnerProgressTab` to fail closed on initial mount with `permission-denied` (403).
  - Merely changing the initial state default to the home campus (`userBranch` / `"Kota Gorontalo"`) ensures the dashboard loads cleanly on first render, but **it does not remove the "All Campuses" option from the dropdown**. A user could still manually select "All Campuses" from the dropdown and trigger queries rejected by Firestore security rules.
- **Explicit Choices Presented for Owner Review:**
  - **Choice 2.1 (Lock to Home Campus — RECOMMENDED):**
    - Lock this Reports view strictly to the Instructor Leader's home campus (`userBranch` / `"Kota Gorontalo"`). In `ReportsDashboard.jsx:29`, decouple `canAccessProvinceScope` so that `isInstructorLeader` does not receive the interactive province dropdown (`canAccessProvinceScope = isExecutiveView;`), rendering the locked branch label instead:
      ```jsx
      <div className="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate">
        {branchFilter || userBranch || "Kota Gorontalo"}
      </div>
      ```
    - *Rationale & Multi-Branch Governance Alignment:* Completely removes the unsupported "All Campuses" option and prevents users from ever triggering rule-rejected queries. Province-wide academic oversight for satellite branches (`bone_bolango`, `limboto`, `pohuwato`) is already formally established and approved as **event-driven via the `ApprovalInbox`** (Tab 10: `PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR` under Blueprint v3.4 §4, §5, G-012), not via unindexed cross-campus table queries.
    - *Backend Authority Boundary:* This UI recommendation is strictly a presentation constraint; it does **not** authorize broadening or changing backend query permissions.
  - **Choice 2.2 (Retain Broader Selector with Handled Queries):**
    - Retain the interactive dropdown selector with "All Campuses", but initialize it to the home campus (`userBranch` / `"Kota Gorontalo"`).
    - If a user manually switches to "All Campuses", unsupported queries continue to be handled via the verified error presentation in `LearnerProgressTab.jsx` (error alert banner with Retry Query) and toast error in `TodayTab.jsx`.
    - *Caveat:* Retaining "All Campuses" continues to expose an option that is not supported by backend rules for non-executives. It does **not** grant or imply backend authority to query cross-branch users or attendance.

---

### 4.3 Recommendation 3: Sub-Tab Retention & Presentation Options

The owner must decide between two sub-tab configuration options within Tab 9:

#### Option A: Full Retention with Curated Defaults (Recommended — Zero Export Loss)
- **Retain all 4 sub-tabs:**
  1. `today` ("Today's Check-ins")
  2. `staff` ("My Duty Log")
  3. `students` ("Learner Progress")
  4. `instructors` ("My Punctuality")
- **Presentation Adjustments:**
  - Change default active sub-tab to **"Learner Progress"** (Recommended).
  - Calibrate campus branch filter per owner choice: **Lock to Home Campus** ("Kota Gorontalo", Recommended — Choice 2.1 / 3.1) to eliminate unsupported queries, or **Retain Broader Selector** with default initialized to "Kota Gorontalo" and handled queries (Choice 2.2 / 3.2).
- **Impact on Export:** **100% of existing export capabilities are preserved.** The leader retains the ability to export daily check-ins, personal duty shifts, learner evaluations, and monthly punctuality.

#### Option B: Role-Fit Sub-Tab Pruning (Requires Explicit Owner Approval for Export Narrowing)
- **Retain 3 sub-tabs:** `staff` ("My Duty Log"), `students` ("Learner Progress"), and `instructors` ("My Punctuality").
- **Hide `TodayTab` ("Today's Check-ins"):** Receptionist kiosk intake is suppressed from the Instructor Leader cockpit.
- **Impact on Export:** **Non-neutral.** The daily check-in export (`MYLIBERTY-Todays-Checkins-{date}.csv`) is permanently eliminated for the Instructor Leader. This option requires an explicit owner decision confirming that the Instructor Leader does not need to export receptionist gate check-in logs.

---

## 5. Preservation of "My Punctuality" & Personal Shift History

Under both options, self-service access to personal compliance is preserved:

### 5.1 Personal Shift History ("My Duty Log")
- **Inside Tab 9:** Retained as Sub-tab 2 (`StaffDutyTab`). Provides a comprehensive personal shift history view, including shift status (`on_duty`, `completed`, `stale`) and auto-closed indicators.
- **Export Preservation:** Preserves the ability to export personal shifts to CSV (`MYLIBERTY-Staff-Attendance-{date}.csv`).
- **Complementary Global Access:** Also accessible outside Tab 9 via the global user avatar in `ProfilePanel.jsx` (`PersonalAttendanceSection.jsx`) under Ratified Decision `OD-STF-01`.

---

### 5.2 Personal Readiness Scorecard ("My Punctuality")
- **Inside Tab 9:** Retained as Sub-tab 4 (`InstructorPunctualityTab`).
- **Data Query Lifecycle:** Calls `fetchInstructorAnalyticsData(effectiveSupervisor=false, uid, branchId)`. Reuses classes and shifts bounded to `uid`, calculating the leader's 15-minute arrival compliance.
- **Export Preservation:** Preserves the monthly punctuality CSV export (`MYLIBERTY-Instructor-Punctuality-{month}-{year}.csv`).

#### Technical Caveats Maintained from Code Inspection:
1. **Legacy-Class Start Date Inference:** In `src/features/attendance/punctuality.js:184-190`, when an active class lacks `classStartDate`, `computeMonthlyPunctuality` infers the start date using `earliestKnownShift` across all shifts passed to it. In Tab 9, `fetchInstructorAnalyticsData` currently fetches all shifts for the user, preserving this inference. (If queries are bounded in the future, a code-only fallback must be defined; schema backfill remains a production data migration requiring separate owner approval).
2. **Device Timezone Calibration:** `computeMonthlyPunctuality` uses local browser Date getters (`getDay()`, `getMonth()`, `getFullYear()`). Because `computeMonthlyPunctuality` is a shared utility consumed across multiple role dashboards (Director, Vice Director, Managers, Instructors), any future calibration to enforce WITA independence must be tested across all callers.
3. **Cashier Data Projection:** While `ReportsDashboard` queries shift documents, the punctuality scorecard displays strictly attendance metrics and does not render cashier reconciliation details.

---

## 6. CSV Export Impact Analysis: Detailed Matrix

Hiding or modifying screens in a role cockpit is **never a neutral UI change**. The table below evaluates the impact of the proposed cleanup options on all four CSV exports:

| Dataset Export Action | Exported CSV File Name | Exported Data Fields | Status under Option A (Full Retention) | Status under Option B (Pruned TodayTab) | Governance & Risk Assessment |
|---|---|---|---|---|---|
| **1. Daily Student Check-ins** | `MYLIBERTY-Todays-Checkins-{date}.csv` | `Student Name`, `Status`, `Campus Branch`, `Time` (WITA), `Method` | **PRESERVED** (Accessible under Today sub-tab) | **ELIMINATED** (Requires explicit owner approval) | Receptionist kiosk intake belongs to Front Office (`OD-FO-03`). Retaining it in Option A preserves existing convenience; retiring it in Option B reduces bulk student arrival export risk. |
| **2. Personal Staff Shifts** | `MYLIBERTY-Staff-Attendance-{date}.csv` | `Staff Name`, `Role`, `Campus Branch`, `Class`, `Clock In`, `Clock Out`, `Derived Status`, `Auto-Closed` | **PRESERVED** (Accessible under My Duty Log) | **PRESERVED** (Accessible under My Duty Log) | Preserves self-service export of personal shift records. (Note: Global `ProfilePanel` under `OD-STF-01` displays shifts on screen but does not provide CSV download). |
| **3. Learner Progress Evaluations** | `MYLIBERTY-Learner-Progress-{date}.csv` | `Learner Name`, `Campus Branch`, `Status`, `Drop-out Alert`, `Classes`, `Check-ins`, `Last Check-in`, `Evaluations` | **PRESERVED** (Accessible under Learner Progress) | **PRESERVED** (Accessible under Learner Progress) | Core academic evaluation dataset. Directly supports the Instructor Leader's pedagogical oversight under Blueprint §6.11. |
| **4. Instructor Punctuality Metrics** | `MYLIBERTY-Instructor-Punctuality-{month}-{year}.csv` | `Instructor`, `Campus Branch`, `Punctuality %`, `Scheduled`, `Attended`, `Late Arrivals`, `Absences`, `Avg Tardiness`, `Data Quality` | **PRESERVED** (Accessible under My Punctuality) | **PRESERVED** (Accessible under My Punctuality) | Personal teaching compliance metrics. Allows downloading monthly readiness records. |

---

## 7. Separation of UI Presentation from Backend Permissions & Authority

To maintain strict compliance with project governance rules:

1. **Presentation Cleanup $\neq$ Backend Rule Modifications:**
   - Locking this Reports view to the home campus or defaulting it to `"Kota Gorontalo"` aligns client UI presentation with existing Firestore security rules (`firestore.rules:862, 1018`), which correctly restrict non-executive queries to branch boundaries.
   - **Do not present this UI recommendation as authorization to broaden or change backend query permissions.** Locking the UI view is strictly a client presentation decision to prevent triggering unsupported queries. It does not alter or authorize changing backend Firestore rules or repository contracts.
   - Province-wide academic oversight for satellite branches (`bone_bolango`, `limboto`, `pohuwato`) continues strictly through the approved, event-driven `ApprovalInbox` workflow (Blueprint v3.4 §4, §5, G-012) rather than unindexed backend database queries.
   - The Instructor Leader's underlying backend permissions to `progressReports` (`firestore.rules:1325`), assigned `classes` (`line 963`), own `shifts` (`line 1419`), and same-branch `classAttendance` (`line 1115`) remain exactly as authorized by security rules.
2. **Export Actions $\neq$ Data Read Access:**
   - The green `Export CSV Dataset` button formats records already fetched into client memory. It does not dispatch separate privileged database queries.
   - Retaining or retiring an export button affects client-side data serialization convenience, not database authorization.
3. **Query Scoping Alignment:**
   - Locking or defaulting `branchFilter` brings client requests into immediate alignment with existing security rules that correctly restrict non-executive queries to branch boundaries.
4. **Zero Backend Changes Proposed:**
   - No modifications to Firestore security rules, repository query contracts, or data schemas are recommended or permitted in this task.

---

## 8. Summary of Decisions & Owner Ratification Record (Owner Kifry, 2026-10-18)

The following explicit owner decisions were ratified by Owner Kifry on 2026-10-18:

1. **Sub-Tab Retention Option:**
   - **Option A (Full Retention — RATIFIED & IMPLEMENTED 2026-10-18):** Keep all 4 sub-tabs mounted in Tab 9 (`today`, `staff`, `students`, `instructors`). Preserves 100% of all four existing CSV export actions without changing export behavior. Option B (hiding Today's Check-ins) is rejected for this phase.
2. **Default Landing Sub-Tab:**
   - **"My Punctuality" (`instructors` — RATIFIED & IMPLEMENTED 2026-10-18):** The Instructor Leader lands directly on their personal 15-minute arrival readiness compliance scorecard upon entering Tab 9.
3. **Campus Branch Filter Behavior in Tab 9:**
   - **Choice 3.1 (Lock this Reports View to Home Campus — RATIFIED & IMPLEMENTED 2026-10-18):** Lock this Reports view strictly to the Instructor Leader's home campus (`normalizeBranch(userBranch)` / `"Kota Gorontalo"`). Eliminates the unsupported "All Campuses" option from the UI, preventing Firestore rule-rejected queries. Province-wide academic oversight for satellite branches remains event-driven via `ApprovalInbox` (Blueprint v3.4 §4, §5, G-012). Home-campus filter values are normalized for repository queries.

> [!NOTE]
> **Open Policy Questions Maintained:**
> Unrelated policy questions—including broader bulk institutional export governance across other roles/domains (`FP-IL-16`) and potential future backend schema/indexing adjustments—remain open (`[Owner Decision Required]`) and are not decided or altered by this presentation implementation.

---

## 9. Narrow Implementation & Verification Roadmap (Post-Approval Only)

When Owner Kifry approves this proposal and confirms the choices in §8, implementation will proceed through the following narrow, strictly gated steps:

### Phase 1: Targeted Presentation Edits (Zero Backend Changes)
1. In `src/features/reports/ReportsDashboard.jsx`:
   - Adjust `subTab` initialization for `isInstructorLeader=true` to default to `"students"` (Recommended) or approved default.
   - If Choice 3.1 is approved: set `canAccessProvinceScope = isExecutiveView;` (locking `isInstructorLeader` to the home campus display), or lock `branchFilter` to `userBranch || "Kota Gorontalo"`.
   - If Choice 3.2 is approved: adjust `branchFilter` initialization for `isInstructorLeader=true` to default to `userBranch || "Kota Gorontalo"`, leaving the dropdown interactive.
   - If Option B is approved: gate `today` sub-tab rendering behind `!isInstructorLeader`.
2. **Zero modifications** to `firestore.rules`, repository files, schemas, or top-level tabs.

### Phase 2: Automated Testing & Typecheck
1. Run `npm run typecheck` to assert 0 TypeScript / JSDoc errors.
2. Run focused Vitest suite:
   - `ReportsDashboard.test.js`: Assert correct default sub-tab and campus filter initialization for Instructor Leader.
   - If Option B: Assert `TodayTab` is omitted for Instructor Leader while preserved for other roles.
   - Assert all remaining export handlers function correctly.

### Phase 3: Browser & Rules Regression
1. Verify in Playwright Chromium that navigating to Tab 9 in `InstructorLeaderDashboard` loads the approved default sub-tab without 403 console errors or toast alerts.
2. Confirm clicking `Export CSV Dataset` generates the expected CSV file.
3. Run `$env:XDG_CONFIG_HOME = $env:TEMP; npm run test:rules` to verify all 176 rules emulator tests pass.
