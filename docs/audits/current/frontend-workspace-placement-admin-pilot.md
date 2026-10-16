# Frontend Workspace Placement Pass — System Admin (`admin`) Pilot Report

> **Audit Level:** BLRCA Campaign Extension — Frontend Workspace Placement Pass (Role Workspace Coherence)  
> **Target Scope:** System Administrator (`admin`) Workspace Pilot Only  
> **Methodology Reference:** [`docs/audits/Role & Business Logic Conformance Audit/03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3  
> **Governance Authority:** Authoritative Blueprint v3.4 (§7.1, §7.2, §7.3, §7.4, Principle 4), Ratified Decision OD-2 (§26), ADR 2026-10-13, and Ratified Owner Decision 2026-10-17 (`OD-ADM-01`)  
> **Status:** SCOPED PILOT REPORT — STRICT READ-ONLY AUDIT MODE  
> **Verification Method:** Static code inspection of React components, routing, and Firestore security rules (Runtime behavior not tested; not runtime-confirmed)  

---

## 1. Pilot Scope & Executive Summary

This pilot report documents a scoped, read-only static inspection of the **System Administrator (`admin`)** workspace under the approved **Frontend Workspace Placement Pass (Role Workspace Coherence)** methodology ([`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3).

### 1.1 Scope Boundaries & Limitations
- **Single Role Pilot:** This inspection is strictly limited to the System Administrator (`admin`) cockpit. It does **not** evaluate the remaining 10 role workspaces (`director`, `vice_director`, `manager`, `opslead`, `instructorleader`, `frontoffice`, `instructor`, `marketing`, `officeboy`, `student`/`parent`).
- **No Campaign Completion Claim:** This pilot does **not** constitute completion of the full Frontend Workspace Placement Pass across MYLIBERTY, nor does it complete the BLRCA campaign.
- **Evidence Standard (Static Observations Only):** Findings and ledger entries are based strictly on static code inspection of component trees, prop pass-downs, and Firestore security rules. Because no live Firestore emulator tests or browser sessions were run during this pilot pass, **all findings are preserved as static observations and are NOT runtime-confirmed**. All backend enforcement outcomes are designated as **"static rule inspection; runtime behavior not tested"**.
- **No Implementation Prescriptions:** In accordance with `AGENTS.md` Read-Only Audit Boundaries and `03-technical-audit-method.md` §3.2, this report records observed issues, potential impacts, and governance sources. All remediation choices and code implementations are deferred to a separate authorized implementation task.

---

## 2. Standardized Frontend Placement Ledger (Pilot Checks)

The following ledger documents all targeted structural checks evaluated for the System Administrator workspace, conforming strictly to the 10-column schema defined in [`03-technical-audit-method.md`](../Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.5:

| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
|---|---|---|---|---|---|---|---|---|---|
| **`FP-ADM-01`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:150-161`<br>`src/features/reports/tabs/LearnerProgressTab.jsx:158-160` | Learner Progress & Attendance Sub-Tab (`LearnerProgressTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §7.1, §7.2, §7.3; Owner Decision 2026-10-17 (`OD-ADM-01`) | Admin Dashboard -> Reports Tab replaced with Diagnostics; sub-tab gated out when `isAdminView === true` | Enforced fail-closed; verified via rules emulator (`firestore.rules:1260-1270`) | `CONFORMS` | Resolved under OD-ADM-01; sub-tab selector and view gated out for `isAdminView`; verified via unit and emulator tests |
| **`FP-ADM-02`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:110-120`<br>`src/features/reports/tabs/TodayTab.jsx:43-46` | Today's Check-ins Sub-Tab (Student Attendance Scans — `TodayTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §7.1, §7.2, §7.3; Owner Decision 2026-10-17 (`OD-ADM-01`) | Admin Dashboard -> Reports Tab replaced with Diagnostics; sub-tab gated out when `isAdminView === true` | Enforced fail-closed; verified via rules emulator (`firestore.rules:977, 979, 805, 821`) | `CONFORMS` | Resolved under OD-ADM-01; attendance rules updated with `!isAdmin()`; sub-tab selector and view gated out for `isAdminView`; verified via unit and emulator tests |
| **`FP-ADM-03`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:136-148` | Financial & Tuition Revenue Sub-Tab (`FinancialReportsTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §7.3; Ratified Decision OD-2 (§26); `firestore.rules:1006` | Admin Dashboard -> Reports Tab (`reports`); sub-tab button conditionally rendered for `isExecutiveView \|\| isManager` only | *static rule inspection; runtime behavior not tested* (`firestore.rules:1006`) | `CONFORMS` | Supporting history: Closed `DOM11-GOV-02` / Slice 1 (Cleanly omitted from Admin UI) |
| **`FP-ADM-04`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:164-176` | Admissions & Leads Sub-Tab (`AdmissionsTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §7.3; `firestore.rules:1104` | Admin Dashboard -> Reports Tab (`reports`); sub-tab button conditionally rendered for `isExecutiveView \|\| isFrontOffice \|\| isManager` only | *static rule inspection; runtime behavior not tested* (`firestore.rules:1104`) | `CONFORMS` | Supporting history: Closed `DOM11-GOV-04` / Slice 3 (Cleanly omitted from Admin UI) |
| **`FP-ADM-05`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:71-206` | System Administration Overview & Health Diagnostics (`WelcomeBanner`, `BranchHealthAuditCard`, `LogRetentionCard`) | `PRIMARY` | Authoritative Blueprint v3.4 §7.1, §7.2; Zero-budget retention policy | Admin Dashboard -> Overview Tab (`overview`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Core Technical Cockpit Baseline (Check 1 & 2: Route & top-level shell) |
| **`FP-ADM-06`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:214-230`<br>`src/features/staff/StaffDirectory.jsx:1-250` | Staff Directory Inspection & Account Maintenance (`StaffDirectory`) | `PRIMARY` | Authoritative Blueprint v3.4 §7.2 (Account and access administration) | Admin Dashboard -> Staff Directory Tab (`directory`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:805, 821`) | `CONFORMS` | Technical Account Administration Baseline (Check 2: Top-level navigation) |
| **`FP-ADM-07`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:265-269`<br>`src/features/attendance/KioskProvisioningPanel.jsx:1-120` | Kiosk Hardware Provisioning & Terminal Pairing Panel (`KioskProvisioningPanel`) | `PRIMARY` | Authoritative Blueprint v3.4 §7.2 (Approved system configuration and technical maintenance) | Admin Dashboard -> Kiosks Tab (`terminals`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Supporting history: Closed `DOM10-SW-02` (Hardware Terminal Pairing Baseline) |
| **`FP-ADM-08`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:208-295` (Complete component tab inventory: `overview`, `directory`, `invites`, `misc`, `terminals`, `reports`, `addUser`) | Operational Approval Inbox (`ApprovalInbox`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §7.1, §7.3, §7.4, Principle 4; §15, §17, §18; Ratified Decision OD-2 (§26); `firestore.rules:1310-1324` | Inspected complete `tabs` array in `AdminDashboard.jsx:208-295` and imports; `ApprovalInbox` is completely unimported and unmounted in the Admin shell | *static rule inspection; runtime behavior not tested* (`firestore.rules:1310-1324`) | `CONFORMS` | Supporting history: Closed `DOM01-GOV-03` / Slice 1 (Cleanly omitted from Admin cockpit) |
| **`FP-ADM-09`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:232-244`<br>`src/features/staff/InvitesPanel.jsx:1-260`<br>`src/features/staff/invitesRepository.js:16-33` | Staff Onboarding Invitation Generation & Management (`InvitesPanel`) | `PRIMARY` | Authoritative Blueprint v3.4 §7.2 (Account provisioning and access administration) | Admin Dashboard -> Invites Tab (`invites`) | *static rule inspection; runtime behavior not tested* (`firestore.rules:837-849`) | `CONFORMS` | Technical Account Provisioning Baseline (Check 2: Top-level navigation) |
| **`FP-ADM-10`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:178-193`<br>`src/features/reports/tabs/InstructorPunctualityTab.jsx:1-290` | Instructor Punctuality & Teaching Attendance Metrics (`InstructorPunctualityTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §6.11, §7.2, §7.3; Owner Decision 2026-10-17 (`OD-ADM-01`) | Admin Dashboard -> Reports Tab replaced with Diagnostics; sub-tab gated out when `isAdminView === true` | Enforced fail-closed; verified via rules emulator (`firestore.rules:1332-1338, 805, 821, 924`) | `CONFORMS` | Resolved under OD-ADM-01; sub-tab selector and view gated out for `isAdminView`; verified via unit and emulator tests |
| **`FP-ADM-11`** | `admin` (global) | `src/features/dashboard/AdminDashboard.jsx:246-261`<br>`src/features/staff/TasksPanel.jsx:1-493` | System Maintenance & Operational Tasks Queue (`TasksPanel`) | `PRIMARY` | Authoritative Blueprint v3.4 §7.2 (Technical maintenance task coordination) | Admin Dashboard -> Tasks Tab (`misc`) | *static rule inspection; runtime behavior not tested* | `CONFORMS` | Technical Task Queue Baseline (Check 2: Top-level navigation) |
| **`FP-ADM-12`** | `admin` (global) | `src/features/reports/ReportsDashboard.jsx:122-134`<br>`src/features/reports/tabs/StaffDutyTab.jsx:1-200` | Staff Duty Logs Sub-Tab (`StaffDutyTab`) | `INTENTIONALLY ABSENT` | Authoritative Blueprint v3.4 §6.10, §7.2, §7.3; Owner Decision 2026-10-17 (`OD-ADM-01`) | Admin Dashboard -> Reports Tab replaced with Diagnostics; sub-tab gated out when `isAdminView === true` | Enforced fail-closed; verified via rules emulator (`firestore.rules:1332-1338`) | `CONFORMS` | Resolved under OD-ADM-01; sub-tab selector and view gated out for `isAdminView`; verified via unit and emulator tests |

---

## 3. Preliminary Static Observations

> [!IMPORTANT]
> The following findings are preserved strictly as **preliminary static observations** derived from source code and security rule inspection. Because neither live browser UI sessions nor Firestore emulator query runs were performed during this pilot pass, **these observations are not runtime-confirmed**. Concrete rendered error states, network response timing, and visual layouts remain subject to dynamic verification during a separate authorized implementation task.

### 3.1 Preliminary Static Observation `FP-ADM-01`: Learner Progress Sub-Tab Presentation
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:150-161`, `src/features/reports/ReportsDashboard.jsx:282-293`, & `src/features/reports/tabs/LearnerProgressTab.jsx:158-160`.
- **Observed Static Implementation (UI Visibility & Actions):**
  - **UI Visibility:** In `ReportsDashboard.jsx:150-161`, the sub-tab button `<button onClick={() => handleSubTabClick("students")}>Learner Progress</button>` is rendered without checking `isAdminView`. In `ReportsDashboard.jsx:282-293`, selecting the sub-tab mounts `<LearnerProgressTab />`.
  - **Available Actions:** The tab provides read-only filter dropdowns (status, class) and a search input for progress data; no record creation, modification, or deletion actions are exposed in the component.
- **Backend Data Access (Static Rules Observation):**
  - When mounted, `LearnerProgressTab.jsx` invokes `fetchStudentProgressData()`, which queries the `/progressReports`, `/users`, `/classes`, and `/attendance` collections.
  - In `firestore.rules:1260-1270`, list access to `/progressReports` requires `isOrgExecutive()`, branch manager/front office, class instructor, student parent, or instructor leader. Technical `admin` is omitted from authorized roles.
  - In `LearnerProgressTab.jsx:158-160`, the catch block catches errors via `console.error(err)` without setting an error state, leaving the `students` array empty (`[]`).
  - The UI calculation in `LearnerProgressTab.jsx:170-187` computes 0 for enrolled, at-risk, and evaluated metrics, rendering affirmative zeroes ("0 Total Enrolled", "No students match the criteria.").
  - *Runtime Verification Status:* Static rule observation only; runtime query denial and zero-state rendering were not tested.
- **Governance Context & Boundary Distinction:**
  - Authoritative Blueprint v3.4 §7.3 explicitly establishes that System Admin does not inherit academic authority.
  - On 2026-10-17, Owner Kifry issued an explicit binding decision (Ratified Decision `OD-ADM-01`): *"System Admin must not have access to the four report views identified in the pilot: Learner Progress (FP-ADM-01), Today’s Check-ins (FP-ADM-02), Instructor Punctuality (FP-ADM-10), and Staff Duty Logs (FP-ADM-12)."*
  - Consequently, the intended placement for this sub-tab in the System Administrator workspace is formally established as **`INTENTIONALLY ABSENT`**.
  - **Implementation & Verification (2026-10-17):** Implemented under approved Option A. Sub-tab selector and content view are strictly gated out when `isAdminView === true`. Direct client queries fail closed against `admin` on `/progressReports` (`firestore.rules:1260-1270`). Verified via unit and emulator test suites.
- **Outcome Status:** **`CONFORMS` (Resolved under OD-ADM-01; implemented and verified 2026-10-17 under Option A)**.

### 3.2 Preliminary Static Observation `FP-ADM-02`: Today's Check-ins Sub-Tab Presentation
- **Component Location:** `src/features/reports/ReportsDashboard.jsx:110-120`, `src/features/reports/ReportsDashboard.jsx:246-256`, & `src/features/reports/tabs/TodayTab.jsx:43-46`.
- **Observed Static Implementation (UI Visibility & Actions):**
  - **UI Visibility:** In `ReportsDashboard.jsx:110-120`, the sub-tab button `<button onClick={() => handleSubTabClick("today")}>Today's Check-ins</button>` is rendered without checking `isAdminView`. In `ReportsDashboard.jsx:246-256`, selecting the sub-tab mounts `<TodayTab />`.
  - **Available Actions:** The tab provides read-only presentation of daily student attendance scans, date selection, and filter dropdowns; no record creation or edit actions are exposed.
- **Backend Data Access (Static Rules Observation):**
  - When mounted, `TodayTab.jsx` calls `fetchTodayScansData()`, which queries `/attendance`, `/classes`, and `/users`.
  - In `firestore.rules:805, 821`, `admin` is restricted from reading or listing student profiles (`!(resource.data.role in ['student', 'parent'])`).
  - In `TodayTab.jsx:43-46`, the catch block invokes `toast("Error loading today's scans: " + err.message, "error")` upon query rejection.
  - *Runtime Verification Status:* Static rule observation only; runtime query denial and toast error presentation were not tested.
- **Governance Context & Boundary Distinction:**
  - Authoritative Blueprint v3.4 §7.1, §7.2, and §7.3 establish that System Admin is a technical maintenance role without academic, front-desk, or operational authority.
  - On 2026-10-17, Owner Kifry issued an explicit binding decision (Ratified Decision `OD-ADM-01`): *"System Admin must not have access to the four report views identified in the pilot: Learner Progress (FP-ADM-01), Today’s Check-ins (FP-ADM-02), Instructor Punctuality (FP-ADM-10), and Staff Duty Logs (FP-ADM-12)."*
  - Consequently, the intended placement for this sub-tab in the System Administrator workspace is formally established as **`INTENTIONALLY ABSENT`**.
  - **Implementation & Verification (2026-10-17):** Implemented under approved Option A. Sub-tab selector and content view are strictly gated out when `isAdminView === true`. `firestore.rules:977, 979` was updated with `!isAdmin()` under `/attendance/{attendanceId}`, closing attendance read access, while student profile access in `/users` continues to fail closed. Verified via unit and emulator test suites.
- **Outcome Status:** **`CONFORMS` (Resolved under OD-ADM-01; implemented and verified 2026-10-17 under Option A)**.

---

## 4. Documentation of Operational Approval Inbox Absence (`FP-ADM-08`)

In accordance with audit requirements, the absence of the Operational Approval Inbox from the System Administrator workspace is verified through:

### 4.1 Complete Component Tab Inventory Evidence
Inspection of `src/features/dashboard/AdminDashboard.jsx` demonstrates that the System Administrator workspace is composed strictly of the following seven tabs (lines 208–295):
1. **`overview` (lines 210, 69–206):** Technical System Welcome Banner, system quick actions, account/maintenance snapshot, multi-branch isolation audit card (`BranchHealthAuditCard`), and free-tier retention card (`LogRetentionCard`).
2. **`directory` (lines 214–230):** Staff account directory (`StaffDirectory`) with `currentUserRole="admin"`.
3. **`invites` (lines 232–244):** Staff invitation management (`InvitesPanel`).
4. **`misc` (lines 246–261):** Technical task and maintenance queue (`TasksPanel`).
5. **`terminals` (lines 265–269):** Kiosk hardware provisioning panel (`KioskProvisioningPanel`).
6. **`reports` (lines 271–275):** Shared reporting cockpit (`ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={false} />`).
7. **`addUser` (lines 279–294):** Hidden direct user edit modal form (`UserForm`).

The `ApprovalInbox` component is **completely unimported and unmounted** in `AdminDashboard.jsx` (neither in imports lines 1–25 nor in the tab array lines 208–295). In contrast, `ApprovalInbox` is explicitly imported and mounted in domain leadership and executive cockpits:
- `DirectorDashboard.jsx:437` (Executive Decision Center)
- `ViceDirectorDashboard.jsx:344` (Operational Approvals)
- `ManagerDashboard.jsx:606` (Course Division Approvals)
- `KidsManagerDashboard.jsx:507` (Kindergarten Division Approvals)
- `OpsLeadDashboard.jsx:159` (Operational Attendance / Facilities / Cash Approvals)
- `InstructorLeaderDashboard.jsx:270` (Academic & Faculty Approvals)

### 4.2 Governance Authorities Excluding System Admin from Approvals
1. **Authoritative Blueprint v3.4 §7.1 & §7.3 (Explicit Exclusion from Approval Authority):**  
   *"System Admin is a technical system-access role... System Admin does not automatically become: Director; Vice Director; Course Division Manager; Kindergarten Division Manager; Operational Leader; Instructor Leader; Finance authority; academic authority; organizational approval authority. Technical access must never be interpreted as a shortcut to business authority."*
2. **Authoritative Blueprint v3.4 §7.4 (Prohibition on Self-Approval and Bypassing Approval Chains):**  
   *"System Admin must not use technical access to: approve its own business request where independent approval is required; bypass an organizational approval chain; alter protected business records merely because the system permits technical access; bypass separation-of-duties controls..."*
3. **Authoritative Blueprint v3.4 Principle 4 (Governance Non-Negotiables):**  
   *"System Admin separation: Technical administration must remain strictly distinct from organizational authority."*
4. **Ratified Decision OD-2 (§26):**  
   Formally ratifies the separation of financial and approval authority from technical administration.
5. **Authoritative Blueprint v3.4 §15, §17 & §18 (General Separation of Duties & Sensitive Actions Baseline):**  
   Establish the organizational Maker–Checker / Signer framework and designate sensitive operational and financial actions requiring independent business review; when read together with §7.3–§7.4, technical administration roles hold no functional standing in these business approval workflows.
6. **Firestore Security Rules Enforcement:**  
   Under `firestore.rules:1310-1324` (`match /approvals/{approvalId}`), list, get, and update permissions are strictly granted to `isOrgExecutive() || isManager() || isOpsLead() || isInstructorLeader()`, explicitly excluding `admin`.
7. **Historical Audit Finding Reference:**  
   Closed `DOM01-GOV-03` / Slice 1 (verified in `bug-ledger.md` row 149).

---

## 5. Uninspected Admin Paths, Unresolved Questions & Limitations

### 5.1 Uninspected Admin Paths
1. **Interactive Badge Generation (`BadgeModal`):** Triggered from `StaffDirectory` (`AdminDashboard.jsx:225, 308`). Canvas ID badge rendering, barcode generation, and print preview dialogs were inspected statically but not exercised interactively.
2. **Kiosk Provisioning Exchange (`KioskProvisioningPanel`):** Terminal pairing token generation and local storage synchronization (`AdminDashboard.jsx:268`) were verified for component presence, but live token issuance was not executed.
3. **User Form Modal (`UserForm`):** The hidden tab `addUser` (`AdminDashboard.jsx:278-294`) for direct user creation/editing was not dynamically tested with form submissions.
4. **Error Boundary Fallbacks:** Runtime recovery of `<ErrorBoundary label="Admin dashboard">` during unexpected child component failures was not dynamically simulated.

### 5.2 Resolved Governance Questions (Owner Decision 2026-10-17 — `OD-ADM-01`)

The four open placement and visibility questions identified during this pilot were formally and explicitly resolved by Owner Kifry on 2026-10-17 (traceable to conversation transcript; recorded in [`docs/decisions/2026-10-17-exclusion-of-academic-and-operational-reports-from-system-admin.md`](../../decisions/2026-10-17-exclusion-of-academic-and-operational-reports-from-system-admin.md)):

> **Owner Decision Text:** *"System Admin must not have access to the four report views identified in the pilot: Learner Progress (FP-ADM-01), Today’s Check-ins (FP-ADM-02), Instructor Punctuality (FP-ADM-10), and Staff Duty Logs (FP-ADM-12)."*

#### Clarification of "Must Not Have Access"
The decision establishes a dual-layer access restriction:
1. **Frontend Presentation Boundary:** The four sub-tabs must be completely removed/gated out of the System Admin workspace in `ReportsDashboard.jsx` so that the admin cockpit does not mount, display, or navigate to these operational surfaces.
2. **Backend Data Retrieval Boundary (Firestore Security Rules):** System Admin must not be able to retrieve, query, or list the underlying documents across the four data paths (`/progressReports`, `/attendance`, `/shifts`, `/classes`, and student profiles in `/users`) via direct client SDK or network requests.
3. **Preservation of Legitimate Role Access:** Any security rule inspection or hardening required to enforce this exclusion for System Admin must strictly preserve existing data access required by authorized domain roles and operational workflows (`director`, `vice_director`, `manager`, `opslead`, `instructorleader`, `frontoffice`, `instructor`, `parent`, `student`). Rule changes must never break legitimate operational reporting or instructional features.

#### Check-by-Check Outcome Status
1. **Learner Progress Read Visibility (`FP-ADM-01`):** **RESOLVED & IMPLEMENTED — EXCLUDED.** Intended placement is `INTENTIONALLY ABSENT`. Placement outcome is `CONFORMS`. Sub-tab selector and content gated out for `isAdminView`; direct query fails closed.
2. **Today's Check-ins Read Visibility (`FP-ADM-02`):** **RESOLVED & IMPLEMENTED — EXCLUDED.** Intended placement is `INTENTIONALLY ABSENT`. Placement outcome is `CONFORMS`. Sub-tab selector and content gated out for `isAdminView`; `firestore.rules` updated with `!isAdmin()` on `/attendance`.
3. **Instructor Punctuality Tab Ownership (`FP-ADM-10`):** **RESOLVED & IMPLEMENTED — EXCLUDED.** Intended placement is `INTENTIONALLY ABSENT`. Placement outcome is `CONFORMS`. Sub-tab selector and content gated out for `isAdminView`; direct query fails closed.
4. **Staff Duty Logs Inspection Scope (`FP-ADM-12`):** **RESOLVED & IMPLEMENTED — EXCLUDED.** Intended placement is `INTENTIONALLY ABSENT`. Placement outcome is `CONFORMS`. Sub-tab selector and content gated out for `isAdminView`; direct query fails closed.

**Open Governance Questions Remaining:** **ZERO (`0`)**. All four scope questions are resolved and implemented.

*Implementation & Verification Record:* Implemented and verified on 2026-10-17 under approved Option A: System Diagnostics. All UI and security rule changes were verified with 107 test files (1,470 tests), 7 emulator test suites (146 security rule tests), clean ESLint, and clean TypeScript typecheck.

### 5.3 Limitations
- **Verification Boundary:** This pilot was conducted strictly on the System Administrator workspace.
- **Scope Restriction:** No workspaces beyond System Admin were audited.

---

## 6. Implementation & Verification Record: Option A System Diagnostics

> [!NOTE]
> **Status: IMPLEMENTED AND VERIFIED.** On 2026-10-17, Owner Kifry approved **Option A: System Diagnostics** from [`docs/proposals/2026-10-17-admin-dashboard-reports-tab-replacement.md`](../../proposals/2026-10-17-admin-dashboard-reports-tab-replacement.md). The changes were implemented and verified in code and security rules.

### 6.1 Delivered Implementation Scope
1. **Report Views Gating (`src/features/reports/ReportsDashboard.jsx`):**
   - The sub-tab selection buttons and active view renders for `students` (`LearnerProgressTab`), `today` (`TodayTab`), `instructors` (`InstructorPunctualityTab`), and `staff` (`StaffDutyTab`) are strictly gated out when `isAdminView === true`.
   - If accessed with `isAdminView === true`, an informational notice is displayed indicating that operational reports are exclusive to educational and operational leadership.
2. **System Diagnostics Workspace (`src/features/dashboard/AdminDashboard.jsx`, `SystemDiagnosticsTab.jsx`):**
   - The former `reports` tab was replaced with a dedicated `diagnostics` tab mounting `<SystemDiagnosticsTab />`.
   - `BranchHealthAuditCard` and `LogRetentionCard` were moved out of the `overview` tab into `SystemDiagnosticsTab`.
   - In Overview, the large embedded audit cards were replaced by a clean summary card linking to Diagnostics.
   - Quick Actions launcher button was updated from Reports to Diagnostics (`Activity` icon).
   - In-session memory caching was introduced in `BranchHealthAuditCard` and `LogRetentionCard` to eliminate unnecessary queries when toggling between tabs.
3. **Backend Data Retrieval Boundary (`firestore.rules`):**
   - `match /attendance/{attendanceId}` was hardened at lines 977 & 979 by adding `!isAdmin()`, preventing System Admin from reading student attendance documents while preserving access for instructors, managers, ops leads, front office, and parents.
   - Other collections (`/progressReports`, `/shifts`, student profiles in `/users`) were verified fail-closed against `admin`. Legitimate access to `/classes` was preserved for staff directory instructor assignments.
4. **Test Verification:**
   - 107 test files passed (1,470 tests), including `ReportsDashboard.test.js` and `AdminDashboard.test.js`.
   - 7 emulator test suites passed (146 security rules tests), including `attendanceAndShifts.emulator.test.js`.
   - ESLint (`npm run lint`) and TypeScript typecheck (`npm run typecheck`) passed with 0 errors.
