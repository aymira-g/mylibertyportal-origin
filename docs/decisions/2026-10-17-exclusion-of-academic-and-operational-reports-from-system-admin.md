# Owner Decision Record: Exclusion of Academic and Operational Report Views from System Administrator (OD-ADM-01)

**Repo Path:** `docs/decisions/2026-10-17-exclusion-of-academic-and-operational-reports-from-system-admin.md`  
**Date:** 2026-10-17  
**Status:** **RATIFIED AUTHORITATIVE DECISION — OWNER APPROVED (KIFRY)**  
**Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4, Ratified 2026-10-13: §7.1, §7.2, §7.3, §7.4, Principle 4), Ratified Decision OD-2 (§26)  
**Origin:** Conversation with Owner Kifry on 2026-10-17; Frontend Workspace Placement Pass (Role Workspace Coherence) System Admin Pilot (`FP-ADM-01`, `FP-ADM-02`, `FP-ADM-10`, `FP-ADM-12`).

---

## 1. Context & Problem Statement

During the Frontend Workspace Placement Pass (Role Workspace Coherence) inspection of the System Administrator (`admin`) workspace ([`docs/audits/current/frontend-workspace-placement-admin-pilot.md`](../audits/current/frontend-workspace-placement-admin-pilot.md)), static inspection of `src/features/reports/ReportsDashboard.jsx` revealed that the shared reporting shell exposed four sub-tabs to the System Admin role:
1. **Learner Progress (`FP-ADM-01`):** Student progress, attendance evaluations, and academic risk metrics (`LearnerProgressTab.jsx`).
2. **Today's Check-ins (`FP-ADM-02`):** Real-time student attendance scans and intake feed (`TodayTab.jsx`).
3. **Instructor Punctuality (`FP-ADM-10`):** Instructor teaching punctuality and pedagogical attendance metrics (`InstructorPunctualityTab.jsx`).
4. **Staff Duty Logs (`FP-ADM-12`):** Operational staff shift attendance and duty log records (`StaffDutyTab.jsx`).

Under Authoritative Blueprint v3.4 §7.1–§7.4 and Ratified Decision OD-2 (§26), System Admin is a technical system-access role dedicated to application maintenance, account provisioning, terminal pairing, and technical diagnostics. It does not inherit academic, instructional, front-desk, or operational supervisory authority. 

However, prior governance documents had not explicitly settled whether the System Admin role was permitted aggregate read-only visibility into these four report surfaces (e.g. for institutional system monitoring or technical support), leaving their placement as `[Owner Decision Required]`.

---

## 2. Ratified Owner Decision: OD-ADM-01

On 2026-10-17, Owner Kifry formally reviewed the findings and issued the following binding decision:

> **System Admin must not have access to the four report views identified in the pilot: Learner Progress (FP-ADM-01), Today’s Check-ins (FP-ADM-02), Instructor Punctuality (FP-ADM-10), and Staff Duty Logs (FP-ADM-12).**

### 2.1 Scope & Boundary Discipline
- **Strict Role Boundary:** This decision applies **strictly and exclusively to the System Administrator (`admin`) role** and to these **four specific report views**.
- **No Extrapolation to Other Roles:** This decision does **not** alter, restrict, or expand report access for other roles (`director`, `vice_director`, `manager`, `opslead`, `instructorleader`, `frontoffice`, `instructor`, `parent`, `student`).
- **No Extrapolation to Other Surfaces:** This decision does not restrict System Admin from authorized technical administration surfaces (Staff Directory, Staff Invites, Maintenance Task Queue, Kiosk Hardware Provisioning, Multi-Branch Isolation Diagnostics, or Storage Retention).

### 2.2 Clarification of "Must Not Have Access"
"Must not have access" establishes a dual-layer access restriction, recognizing that UI omission alone does not constitute a security boundary:
1. **Frontend Presentation Boundary:** The four sub-tabs must be completely removed/gated out of the System Admin workspace in `ReportsDashboard.jsx` so that the admin cockpit does not mount, display, or navigate to these operational surfaces.
2. **Backend Data Retrieval Boundary (Firestore Security Rules):** System Admin must not be able to query, retrieve, or list the underlying documents across the four data paths (`/progressReports`, `/attendance`, `/shifts`, `/classes`, and student profiles in `/users`) via direct client SDK or API requests.
3. **Preservation of Legitimate Role Access:** Implementation of backend rule restrictions for System Admin must be carefully scoped (e.g. via explicit role conditions) to avoid regressing or breaking data retrieval workflows required by authorized domain leadership, instructional staff, or front-office personnel.

---

## 3. Enforcement & Implementation Directives

1. **Frontend Presentation Layer (`src/features/reports/ReportsDashboard.jsx`):**
   - The sub-tab selection buttons and active view renders for `students` (`LearnerProgressTab`), `today` (`TodayTab`), `instructors` (`InstructorPunctualityTab`), and `staff` (`StaffDutyTab`) must be gated so that they do not render when `isAdminView` is true.
   - When all four operational/academic views are removed, the shared `ReportsDashboard` renders zero sub-tabs for System Admin. The disposition of the top-level `reports` tab in `AdminDashboard.jsx` is subject to a separate dashboard implementation proposal (e.g. replacement with "System Diagnostics" or clean tab removal; see [`docs/proposals/2026-10-17-admin-dashboard-reports-tab-replacement.md`](../proposals/2026-10-17-admin-dashboard-reports-tab-replacement.md)).
2. **Backend Security Rules Verification Layer (`firestore.rules`):**
   - Prior to code deployment, inspect and verify that Firestore security rules enforce fail-closed denials for `admin` on each data path:
     - `/progressReports` (`firestore.rules:1260-1270`): Ensure `admin` cannot `get` or `list`.
     - `/attendance` (`firestore.rules:974-979`): Verify whether `isNonFacilityStaff()` or branch fallback inadvertently permits `admin` read access, and ensure explicit restriction if necessary.
     - `/shifts` (`firestore.rules:1332-1338`): Verify that `admin` cannot list staff shifts beyond their own document.
     - `/classes` (`firestore.rules:924-940`): Verify read restrictions on class rosters and attendance links.
     - `/users` (`firestore.rules:805, 821`): Maintain strict block on student/parent profile access for `admin`.
   - **Non-Regression Requirement:** All rule checks and adjustments must be validated against automated emulator rule tests (`npm run test:rules`) to guarantee zero regression for valid queries executed by `director`, `vice_director`, `manager`, `opslead`, `instructorleader`, `frontoffice`, and `instructor`.
3. **Implementation & Verification Record (Completed 2026-10-17):**
   - **Frontend Presentation Layer (`src/features/reports/ReportsDashboard.jsx`):** Sub-tab selector buttons and view renders for `students` (`LearnerProgressTab`), `today` (`TodayTab`), `instructors` (`InstructorPunctualityTab`), and `staff` (`StaffDutyTab`) are strictly gated out when `isAdminView` is true. If accessed directly with `isAdminView === true`, an informational notice is displayed.
   - **Admin Workspace Tab Composition (`src/features/dashboard/AdminDashboard.jsx`, `SystemDiagnosticsTab.jsx`):** Option A ("System Diagnostics") implemented. The former Reports tab was replaced by a dedicated `diagnostics` tab mounting `BranchHealthAuditCard` and `LogRetentionCard` on demand. In-session memory caching was introduced in both audit cards to prevent redundant Firestore queries during tab switches. The System Quick Action button was updated from Reports to Diagnostics (`Activity` icon).
   - **Backend Data Retrieval Boundary (`firestore.rules`):** Line 977 & 979 updated with `!isAdmin()` under `match /attendance/{attendanceId}`, closing read access to student attendance logs for System Admin while preserving read access for teachers, front office, and executives. Access to `/progressReports`, `/shifts`, and student `/users` was verified to fail closed against `admin`. Legitimate access to `/classes` (course scheduling metadata required for staff account administration) was preserved.
   - **Automated Verification:** All changes were verified with 107 test files passed (1,470 tests), 7 emulator test suites passed (146 security rule tests including `attendanceAndShifts.emulator.test.js` asserting admin denial on attendance), clean ESLint (`npm run lint`), and clean TypeScript check (`npm run typecheck`).
