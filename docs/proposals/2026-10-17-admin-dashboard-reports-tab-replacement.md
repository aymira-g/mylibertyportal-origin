# Dashboard Implementation Proposal: Admin Dashboard Tab Composition & Reports Tab Disposition

**Repo Path:** `docs/proposals/2026-10-17-admin-dashboard-reports-tab-replacement.md`  
**Date:** 2026-10-17  
**Status:** **IMPLEMENTED AND VERIFIED — OWNER APPROVED (KIFRY)**  
**Category:** Dashboard Layout & Tab Composition (Implementation Proposal — Not Architecture Drift)  
**Governing Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4 §7.1–§7.4), Ratified Decision OD-2 (§26), Owner Decision 2026-10-17 (`OD-ADM-01`)  
**Context:** Following explicit Owner Decision 2026-10-17 (`OD-ADM-01`), all four operational report sub-tabs in `ReportsDashboard.jsx` (Learner Progress, Today's Check-ins, Instructor Punctuality, Staff Duty Logs) are excluded from the System Administrator workspace. As a result, the shared `ReportsDashboard` renders zero sub-tabs for System Admin. This document records the comparative analysis and approved implementation for replacing the top-level `reports` tab in `AdminDashboard.jsx` with a dedicated System Diagnostics tab (Option A, Selected & Approved), documenting Option B (Clean Removal) as the unselected alternative.

---

## 1. Problem Statement & Baseline Inventory

### 1.1 The Empty Reports Tab & Dual-Layer Access Boundary
Under Owner Decision 2026-10-17 (`OD-ADM-01`) and prior governance decisions (OD-2, DOM11-GOV-04):
- Financial & Tuition Revenue (`FP-ADM-03`): Excluded from Admin (OD-2).
- Admissions & Leads (`FP-ADM-04`): Excluded from Admin (DOM11-GOV-04).
- Learner Progress (`FP-ADM-01`): Excluded from Admin (OD-ADM-01).
- Today's Check-ins (`FP-ADM-02`): Excluded from Admin (OD-ADM-01).
- Instructor Punctuality (`FP-ADM-10`): Excluded from Admin (OD-ADM-01).
- Staff Duty Logs (`FP-ADM-12`): Excluded from Admin (OD-ADM-01).

The decision establishes that "must not have access" requires both a **frontend presentation boundary** (removing sub-tabs from the UI) and a **backend data access boundary** (verifying Firestore security rules so `admin` cannot query `/progressReports`, `/attendance`, `/shifts`, `/classes`, or student profiles, while strictly preserving legitimate access for other roles).

Because all six sub-tabs in `src/features/reports/ReportsDashboard.jsx` are excluded from the System Administrator, mounting `<ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={false} />` on line 274 of `src/features/dashboard/AdminDashboard.jsx` yields an empty, non-functional view shell. Retaining a dead "Reports" tab violates Principle 1 of Role Workspace Coherence ([`03-technical-audit-method.md`](../audits/Role%20&%20Business%20Logic%20Conformance%20Audit/03-technical-audit-method.md) §3.1).

### 1.2 Current Admin Workspace Topology
Static inspection of `src/features/dashboard/AdminDashboard.jsx:208-295` reveals the current 7-tab configuration:
1. **`overview` (lines 210, 69–206):** `WelcomeBanner` (KPI chips), `System Quick Actions` (4 navigation buttons), `Account & Maintenance Snapshot`, `BranchHealthAuditCard` (multi-branch data isolation audit), and `LogRetentionCard` (error log retention & purge).
2. **`directory` (lines 214–230):** `StaffDirectory` (staff accounts, badge printing, account editing/deactivation).
3. **`invites` (lines 232–244):** `InvitesPanel` (staff onboarding token creation/revocation).
4. **`misc` (lines 246–261):** `TasksPanel` (maintenance task queue and operational todo tracking).
5. **`terminals` (lines 265–269):** `KioskProvisioningPanel` (kiosk hardware pairing, Web Crypto P-256 keys, challenge test).
6. **`reports` (lines 271–275):** `ReportsDashboard` (target for disposition).
7. **`addUser` (lines 279–294):** `UserForm` (hidden direct user creation modal).

---

## 2. Assessment of Selected Option: "System Diagnostics" Tab (Approved & Implemented)

The approved design repurposes the top-level tab slot from `reports` into a dedicated **"System Diagnostics"** (`diagnostics`) tab.

### 2.1 Existing Technical-Only Components & Data Sources
To comply strictly with the zero-budget Spark mandate and Blueprint §7.2, no new telemetry, logging infrastructure, or third-party services may be introduced. The tab is supported strictly by existing codebase assets:

1. **Multi-Branch Data Isolation Audit (`BranchHealthAuditCard.jsx`):**
   - *Current Location:* Embedded in the Overview tab (`AdminDashboard.jsx:200`).
   - *Data Source:* `src/features/dashboard/branchAuditRepository.js` (`runBranchHealthAudit(100)`).
   - *Function:* Scans sample batches (`limit(100)`) across 8 Firestore collections (`users`, `payments`, `applications`, `deskInquiries`, `shifts`, `classes`, `approvals`, `schoolOutreach`) to verify `branchId` schema conformance and partition health.
   - *Fit:* Pure technical diagnostic tool directly aligned with Blueprint §7.2 ("diagnostics; audit/system-event inspection").
2. **Storage Quota & Error Log Retention (`LogRetentionCard.jsx`):**
   - *Current Location:* Embedded in the Overview tab (`AdminDashboard.jsx:203`).
   - *Data Source:* `src/features/dashboard/logRetentionRepository.js` (`fetchStaleErrorLogsCount`, `purgeStaleErrorLogs`).
   - *Function:* Queries stale error documents older than 30 days (`DEFAULT_RETENTION_DAYS`) and provides an atomic batch purge mechanism to protect the free-tier Spark database quota.
   - *Fit:* Pure technical maintenance and housekeeping capability directly aligned with Blueprint §7.2 ("technical maintenance; application support").

*(Note: Edge Worker connectivity indicators were excluded; while `KioskProvisioningPanel.jsx` contains a terminal-specific crypto challenge, no general dashboard-level worker health check currently exists in the codebase. Introducing one would invent an unbuilt feature.)*

### 2.2 Overlap Analysis & Implemented Component Reorganization
With the introduction of the dedicated "System Diagnostics" tab, components were reorganized to eliminate redundancy across the cockpit:

| Component / Information | Current Location | Recommended Disposition | Technical Evidence & Rationale |
|---|---|---|---|
| **`BranchHealthAuditCard`** | `AdminDashboard.jsx:200` (`overview`) | **MOVE to `diagnostics` tab** | Currently consumes ~400px of vertical space in Overview. Moving it isolates intensive partition scanning into the diagnostic tool where it belongs. |
| **`LogRetentionCard`** | `AdminDashboard.jsx:203` (`overview`) | **MOVE to `diagnostics` tab** | Storage purge dialogs and retention controls are maintenance workflows, not daily dashboard overview summaries. |
| **Overview Health Summary Chip** | `AdminDashboard.jsx:77-102` (`overview`) | **STAY in `overview` (Summarized)** | The `WelcomeBanner` in Overview should display a compact summary chip (e.g. `System Health: Normal`, `Log Window: 30d`) that navigates to the Diagnostics tab (`onClick={() => handleTabChange("diagnostics")}`). |
| **`KioskProvisioningPanel`** | `AdminDashboard.jsx:265-269` (`terminals`) | **STAY in `terminals` (Kiosks tab)** | Hardware pairing, Web Crypto token generation, and physical tablet enrollment are specialized device operations. Conflating hardware pairing into Diagnostics would clutter both workflows. |
| **Kiosk Cryptographic Ping (`handleRunDiagnostic`)** | `KioskProvisioningPanel.jsx:176-212` | **STAY in `terminals`** | Tests local browser Web Crypto keys against Cloudflare Worker `/api/v1/kiosk/challenge`. It is terminal-specific and belongs within device provisioning. |
| **`TasksPanel`** | `AdminDashboard.jsx:246-261` (`misc`) | **STAY in `misc` (Tasks tab)** | Task queue for staff coordination and maintenance directives (`todos` collection). Distinct from automated system health inspection. |
| **`StaffDirectory` & `InvitesPanel`** | `AdminDashboard.jsx:214-244` | **STAY in respective tabs** | Dedicated to account and access provisioning; no overlap with technical diagnostics. |

### 2.3 Strict Exclusion of Business & Pedagogical Data
The "System Diagnostics" tab **strictly excludes**:
- Student enrollment counts, learner progress, attendance percentages, and grade metrics.
- Instructor class schedules, teaching hours, and punctuality logs.
- Staff shift hours, cash reconciliation records, and duty assignments.
- Financial revenue, tuition payments, discounts, refunds, and bank reconciliation data.
- Admissions inquiries, lead pipelines, and student registration forms.

Any attempt to introduce operational summaries or business metrics into this tab would violate Authoritative Blueprint v3.4 §7.1 and OD-ADM-01.

### 2.4 Spark Quota & Query Execution Lifecycle Assessment
While reusing existing components requires **no new infrastructure** (no paid tiers, no external monitoring servers, no background daemons), Firestore read queries still consume the free-tier Spark database quota (50,000 reads/day).
- **Baseline Behavior in Overview:** In the legacy layout, `BranchHealthAuditCard` and `LogRetentionCard` executed their queries automatically whenever an administrator mounted the Overview tab on initial login. `runBranchHealthAudit(100)` performed sample reads across 8 collections (~800 document reads), and `LogRetentionCard` performed an error log count query on every load.
- **Behavior in Diagnostics Tab:** Relocating these cards to the separate `diagnostics` tab alters the query execution lifecycle: queries execute only when the administrator actively selects the "Diagnostics" tab. This defers reads and prevents quota consumption during routine administrative visits (such as creating a staff invite or editing user accounts).
- **Implemented Query Trigger & Caching:** In-session memory caching was implemented in both audit cards (`BranchHealthAuditCard.jsx` and `LogRetentionCard.jsx`), ensuring queries do not re-execute when switching back and forth between tabs in a single session. Manual "Re-scan" and "Refresh" controls allow fresh queries on demand. Failed scans are explicitly displayed as "Not Scanned" and excluded from the readiness score calculation.

---

## 3. Assessment of Alternative Option: Clean Removal Without Replacement (Unselected Alternative)

### 3.1 Description
Rather than creating a new tab, the alternative was to **cleanly eliminate the Reports tab entirely**:
1. Remove `{ id: "reports", label: "Reports", ... }` from `AdminDashboard.jsx:271-275`.
2. Remove the "Reports" launcher button from `System Quick Actions` in `AdminDashboard.jsx:141-149`.
3. Retain `BranchHealthAuditCard` and `LogRetentionCard` in their current positions on the `overview` tab (`AdminDashboard.jsx:185-205`).

### 3.2 Pros and Cons
- **Advantages:**
  - Zero component relocation; lowest possible code change.
  - Reduces the top-level tab count from 6 to 5 (`Overview`, `Staff Directory`, `Invites`, `Tasks`, `Kiosks`), yielding a lean, focused navigation bar.
  - Zero risk of creating an underpopulated or redundant secondary tab.
- **Disadvantages:**
  - The Overview tab remains vertically crowded on desktop and mobile viewports because detailed multi-branch audit tables and log purge tools sit directly below the welcome banner.
  - Heavy audit queries (~800 reads) would continue to run on initial Overview dashboard mount.

---

## 4. Comparative Evaluation & Decision Outcome

| Criteria | Option A: System Diagnostics Tab (Selected & Approved) | Option B: Clean Removal (Unselected Alternative) |
|---|---|---|
| **Governance Alignment (Blueprint §7.2)** | **High:** Explicitly groups diagnostics and system maintenance into a dedicated cockpit tool. | **High:** Fully respects role boundaries by eliminating the unauthorized report surface. |
| **Infrastructure & Quota Impact** | **No new infrastructure.** Defers ~800 audit reads until tab is opened; in-session memory caching prevents re-execution on tab switches. | **No new infrastructure.** Audit reads continue to run automatically on every Overview page load. |
| **UI Ergonomics & Workspace Coherence** | **Superior:** Streamlines Overview into a true executive summary; places deep inspection tools in Diagnostics. | **Acceptable:** Leaves Overview vertically long with heavy audit tables and purge buttons. |
| **Implementation Complexity** | **Low:** Relocate two existing JSX components from `AdminDashboard.jsx` into a new sub-component or tab container. | **Minimal:** Delete 15 lines of code from `AdminDashboard.jsx`. |

### Decision Outcome & Recommendation Record
Owner Kifry formally selected and approved **Option A: System Diagnostics** on 2026-10-17. **Option B (Clean Removal)** is recorded as the unselected alternative; while it offered minimal code modification, it would have left the Overview tab vertically cluttered and continued to trigger ~800 document reads on initial dashboard load.

Key outcomes of the selected Option A:
1. `BranchHealthAuditCard` and `LogRetentionCard` were moved out of `overview` and into a dedicated `diagnostics` tab (`SystemDiagnosticsTab.jsx`).
2. Audit queries run on-demand only when the Diagnostics tab is selected, with in-session caching preventing repeat reads during tab switching.
3. No new infrastructure, collection-wide logging pipelines, or third-party monitoring services were introduced.

---

## 5. Lifecycle Status & Implementation Record
- **Status:** **IMPLEMENTED AND VERIFIED — OWNER APPROVED (KIFRY)**.
- **Approved Decision:** On 2026-10-17, Owner Kifry selected and approved **Option A: System Diagnostics**.
- **Implementation Scope Delivered:**
  1. `BranchHealthAuditCard` and `LogRetentionCard` moved from `AdminDashboard.jsx` Overview to dedicated `src/features/dashboard/SystemDiagnosticsTab.jsx` under tab ID `diagnostics`.
  2. Tab composition updated: `reports` removed and replaced with `diagnostics` in `AdminDashboard.jsx`. Quick actions updated to point to Diagnostics.
  3. On-demand query loading and in-session caching implemented in `BranchHealthAuditCard` and `LogRetentionCard` to eliminate unnecessary queries when toggling between tabs.
  4. Sub-tab controls and views for Learner Progress (`FP-ADM-01`), Today's Check-ins (`FP-ADM-02`), Instructor Punctuality (`FP-ADM-10`), and Staff Duty Logs (`FP-ADM-12`) strictly gated from `isAdminView` in `ReportsDashboard.jsx`.
  5. Backend security rule hardened in `firestore.rules` under `match /attendance/{attendanceId}` with `!isAdmin()` check; other report collections verified fail-closed against `admin`.
  6. Verified via automated unit tests (`AdminDashboard.test.js`, `ReportsDashboard.test.js`), Firestore security rules emulator (`attendanceAndShifts.emulator.test.js`), ESLint, and TypeScript typecheck.
