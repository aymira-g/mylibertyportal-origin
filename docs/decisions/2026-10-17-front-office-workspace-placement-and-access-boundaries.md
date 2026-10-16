# Owner Decision Record: Front Office Workspace Placement & Access Boundaries (OD-FO-01, OD-FO-02, OD-FO-03)

**Repo Path:** `docs/decisions/2026-10-17-front-office-workspace-placement-and-access-boundaries.md`  
**Date:** 2026-10-17  
**Status:** **RATIFIED AUTHORITATIVE DECISION — OWNER APPROVED (KIFRY)**  
**Governing Baseline:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4, Ratified 2026-10-13: §5.0.1, §5.0.2, §5.3, §6.8, §6.9, §7.3, §15, §18)  
**Origin:** Conversation with Owner Kifry on 2026-10-17; Frontend Workspace Placement Pass (Role Workspace Coherence) Front Office Pilot (`FP-FO-07`, `FP-FO-13`, `FP-FO-14`).

---

## 1. Context & Problem Statement

During the Frontend Workspace Placement Pass inspection of the Front Office (`frontoffice`) workspace ([`docs/audits/current/frontend-workspace-placement-frontoffice-pilot.md`](../audits/current/frontend-workspace-placement-frontoffice-pilot.md)), three specific structural and boundary issues were identified:

1. **Corporate Events Panel in Front Office Cockpit (`FP-FO-07`):** The front-desk dashboard mounted the shared `CorporateEventsPanel` with full branch-scoped event creation and cancellation authority. Under Blueprint §6.8 and §6.9, scheduling official corporate events, workshops, and branch meetings is an operational leadership function, not a reception duty.
2. **Academic `progressReports` Write/Delete Rule Over-Grant (`FP-FO-13`):** In `firestore.rules:1280`, `isFrontOffice()` possessed broad `update` and `delete` authority over instructor progress reports. While Front Office legitimately records student promotions from instructor evaluations in `StudentRoster.jsx`, granting raw delete and general update authority over official evaluations represented an over-grant conflicting with Blueprint §6.9 and §7.3.
3. **Courses / Kindergarten Reporting & Export Inconsistency (`FP-FO-14`):** Courses Front Office used a dedicated, privacy-isolated daily desk reporting tab (`FrontOfficeReportsTab` without bulk CSV exports), whereas Kindergarten Front Office mounted the general `ReportsDashboard`, exposing academic learner progress and bulk CSV export controls. Furthermore, `FrontOfficeReportsTab` lacked division scoping, presenting a risk of data mixing at dual-division branches.

---

## 2. Ratified Owner Decisions

On 2026-10-17, Owner Kifry reviewed the pilot findings and ratified the following three binding decisions:

### 2.1 Decision OD-FO-01: Corporate Events Panel (Option B — Read-Only Informational)
> **The Front Office workspace retains the "Events" tab as a read-only calendar for receptionist awareness. Event creation (`canCreate={false}`) and event cancellation controls are removed from the Front Office cockpit, and underlying Firestore security rules must fail closed against Front Office create, update, and delete requests on `/corporateEvents`.**

- **UI Boundary:** `FrontOfficeDashboard.jsx` mounts `<CorporateEventsPanel canCreate={false} canCancel={false} />`.
- **Backend Rules Boundary:** `firestore.rules` under `match /corporateEvents/{eventId}` removes `isFrontOffice()` from `allow create`, `allow update`, and `allow delete`. Front Office retains read-only access under `isStaff()`.

### 2.2 Decision OD-FO-02: Academic `progressReports` Rule Gating (Option A — Promotion Gating & Delete Removal)
> **Front Office is confirmed as authorized to execute student level advancements based on instructor recommendations. However, security rules must be strictly hardened: Front Office is permanently stripped of delete authority on `/progressReports`, and update authority is strictly constrained to setting `eligibleForPromotion: false` and recording promotion timestamps during legitimate advancement workflows.**

- **Backend Rules Boundary:** `firestore.rules` under `match /progressReports/{reportId}`:
  - `allow delete`: Restricted to Executive (`isOrgExecutive()`) and Division Manager (`isManager() && isSameBranch(resource.data) && isDivisionAllowedForProgressReportsWrite(resource.data)`). Division Managers require an explicit matching division on the document (`division in ['courses', 'kindergarten']`); unstamped legacy reports lacking `division` cannot be deleted by managers pending an explicit owner decision (`[Owner Decision Required]`). Front Office holds zero delete authority.
  - `allow update`: 
    - **Front Office Promotion Updates:** Permits pure Front Office (`isFrontDeskStaff()`) only during an active student advancement batch (`isBatchStudentAdvancement(resource.data.studentId)`) on same-branch reports with an explicit matching division (`isDivisionAllowedForProgressReportsWrite(resource.data)`). Affected keys are strictly within `['eligibleForPromotion', 'promotedAt', 'updatedAt']` with a mandatory `eligibleForPromotion: true -> false` transition. Unstamped legacy reports lacking `division` cannot be updated by Front Office.
    - **Division Manager Updates:** Requires same-branch and an explicit matching division on both pre- and post-images (`isDivisionAllowedForProgressReportsWrite(resource.data) && isDivisionAllowedForProgressReportsWrite(request.resource.data)`), strictly denying manager updates on unstamped legacy reports pending an owner decision (`[Owner Decision Required]`).
    - **Executive Updates:** Executives (`isOrgExecutive()`) retain organizational update authority.
  - `allow list`: Governed by `firestore.rules:1306-1310`:
    - **Executive & Central Academic Lead Path:** Grants Organizational Executives (`isOrgExecutive()`) and the Central Instructor Leader (`isInstructorLeader()`) province-wide listing access across all branches without branch or division scoping (per Blueprint v3.4 §4, §5, §6.11, G-012, and ADR 2026-10-13).
    - **Branch Staff List Boundary (`isDivisionAllowedForProgressReportsList`):** Branch staff (`isManager() || isFrontDeskStaff()`) are strictly restricted by both physical branch (`isSameBranchStrict(resource.data)`) and explicit division (`isDivisionAllowedForProgressReportsList(resource.data)`). Branch staff can only list reports matching their explicit division (`where("division", "==", "courses")` for Courses, `where("division", "==", "kindergarten")` for Kindergarten). Unfiltered list queries from branch staff are rejected with `PERMISSION_DENIED`, closing cross-division read exposure at the rule level.
    - **Instructor & Parent Paths:** Assigned instructors are restricted to authored reports (`resource.data.instructorId == request.auth.uid`), and parents are restricted to linked children with branch scoping.
    - **Handling Accounts with `division: "all"`, Missing, or Invalid Divisions:** Accounts configured with `division: "all"`, missing division, or invalid division values do NOT receive progress report listing access. Both Courses and Kindergarten list queries and unfiltered queries from these accounts are strictly denied (`PERMISSION_DENIED`) pending an explicit owner decision establishing their scope.
    - **Operational Leader Academic Progress Report Denial — `[Owner Decision Required]`:** The question of whether the Operational Leader (`isOpsLead()` and aliases) should possess academic progress report access at dual-division campuses remains an unresolved governance question. Neither Blueprint v3.4 nor Owner Kifry has approved academic progress report access for the Ops Lead role (Central Instructor Leader holds province-wide academic scope per G-012). Pure Front Office (`isFrontDeskStaff()`) is separated from Ops Lead; while that governance decision remains open, Ops Leads have no access through the branch-staff role path (`get`, `list`, `update`, `delete`), regardless of division configuration (`courses`, `kindergarten`, `all`, missing, or invalid), while preserving any independent instructor (authored reports via `instructorId == request.auth.uid`) or parent (`isParentOf(studentId)`) access path.
  - `allow get` (Direct-Document Access vs. Write & List Restrictions): Evaluated separately from write and list rules under `isDivisionAllowedForProgressReportsGet`, restricted to Executive, assigned instructor, linked parent, Instructor Leader, and same-branch Manager or pure Front Office (`isFrontDeskStaff()`):
    - For explicit Courses Front Office and Course Division Manager, direct document fetch allows reading Courses reports and legacy reports created without a `division` field (`!('division' in data)`), preserving historical data accessibility per approved legacy-data policies. Cross-division `get` attempts on Kindergarten reports remain strictly blocked (`PERMISSION_DENIED`).
    - For explicit Kindergarten Front Office and Kindergarten Division Manager, direct `get` strictly requires `data.division == 'kindergarten'`. Reading legacy reports lacking division or Courses reports is strictly denied (`PERMISSION_DENIED`).
    - For staff accounts with `division: "all"`, missing division, or invalid division, direct `get` fails closed (`PERMISSION_DENIED`) on all progress reports (Courses, Kindergarten, and legacy unstamped records) until an explicit owner decision establishes their authority.
    - For Ops Lead accounts, direct `get` through the branch-staff role path is strictly denied across all division values while the decision is open (independent author/parent access paths remain unaffected).
- **Implementation Note & Known Data Limitation:** To enforce backend division isolation and prevent cross-division leakage (e.g., Courses desk queries matching same-branch Kindergarten records for the same student), security rules and `promoteStudentLevel` strictly scope pending reports with `where("division", "==", division)`. Under Cloud Firestore query indexing semantics, legacy reports created without a `division` field are not matched by equality queries on `division` and thus are not cleared by this promotion workflow. Stamping those legacy records is left as a separate proposed data-migration task (see [`docs/proposals/2026-10-17-legacy-progress-reports-division-backfill.md`](../proposals/2026-10-17-legacy-progress-reports-division-backfill.md), pending independent review and scoping for database read/write volume), rather than broadening desk query permissions. Direct `get` retains legacy readability by ID, but write mutations on unstamped records fail closed pending owner decision.

### 2.3 Decision OD-FO-03: Courses / Kindergarten Desk Reporting Parity (Option A — Division Scoping & Unified Desk Tab)
> **Front Office desk reporting must be unified across educational divisions. Kindergarten Front Office will use the dedicated desk operational tab (`FrontOfficeReportsTab`) instead of `ReportsDashboard`, eliminating bulk CSV export and learner progress tabs from the front desk. Crucially, division-level data scoping must be enforced end-to-end across desk inquiries and cash reconciliation so that Courses and Kindergarten summaries remain strictly isolated at dual-division campuses.**

- **Data Isolation Requirement:** `FrontOfficeReportsTab.jsx` and `FrontDeskCashReconcile.jsx` must accept and enforce a `division` prop, scoping inquiry fetches and payment range queries by division.
- **UI Boundary:** `KidsFrontOfficeDashboard.jsx` replaces `ReportsDashboard` with `<FrontOfficeReportsTab myBranch={myBranch} division="kindergarten" students={students} />`.
- **Export Shielding:** `ReportsDashboard.jsx` strips `isFrontOffice` from `canExportReports`.

---

## 3. Enforcement & Verification Directives

1. **Security Rule Matrix Synchronization:** All helper simulators in `src/features/shared/securityRulesMatrix/` and automated emulator test suites in `src/features/shared/firestoreRulesEmulator/` must be synchronized to mirror the hardened rules.
2. **Regression Testing:** Automated verification must confirm:
   - Front Office cannot create or cancel corporate events in Firestore rules.
   - Front Office cannot delete progress reports.
   - Front Office cannot edit academic scores on progress reports.
   - Front Office can successfully execute valid student promotions via `promoteStudentLevel`.
   - Courses and Kindergarten reports queries are strictly filtered by division.
