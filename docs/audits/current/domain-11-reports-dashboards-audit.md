# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 11: Reports / Dashboards / Derived Data

> **Audit ID:** `L2-DOM11-2026-10-12`  
> **Target:** [Domain 11 (`03-audit-domains.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#11-reports--dashboards--derived-data)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Governance:** [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) (v3.4 Dual-Control Model, §5.4/§5.5, Principle 10, Principle 15, Principle 16) · **Architecture:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12 (Remediated: 2026-10-14)  
> **Audit Status:** **PASS — AUDIT COMPLETE & ALL FINDINGS REMEDIATED (CLOSED)**  
> **Revision Note:** All Domain 11 findings and second-opinion recommendations remediated under owner authorization on 2026-10-14. Centralized class capacity helper, universal branch filter fallback, date-windowed payment queries (2,000 cap + 5-min cache), honest progress report ordering and truncation banner, CSV formula injection hardening, read-only branch health audit card, and Blueprint v3.4 alignment. All automated test suites pass, 0 lint errors, 0 TypeScript errors.

---

## 1. Scope & Executive Summary

Flows inspected:
1. **Executive Dashboards:** [`DirectorDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/DirectorDashboard.jsx) (Strategic Control, multi-branch KPI rollup), [`ViceDirectorDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/ViceDirectorDashboard.jsx) (Operational Control, exception drill-downs, cross-branch tracking), [`ExecutiveDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/ExecutiveDashboard.jsx).
2. **Operational Role Dashboards:** [`ManagerDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/ManagerDashboard.jsx), [`OpsLeadDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/OpsLeadDashboard.jsx), [`OfficeBoyDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/OfficeBoyDashboard.jsx), [`MarketingDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/MarketingDashboard.jsx), [`InstructorLeaderDashboard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/InstructorLeaderDashboard.jsx), [`useDashboardData.js`](file:///e:/myliberty-portal/src/features/dashboard/useDashboardData.js).
3. **Dedicated Reporting Engine:** [`ReportsDashboard.jsx`](file:///e:/myliberty-portal/src/features/reports/ReportsDashboard.jsx), [`reportsRepository.js`](file:///e:/myliberty-portal/src/features/reports/reportsRepository.js), and sub-tabs:
   - [`FinancialReportsTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/FinancialReportsTab.jsx)
   - [`TodayTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/TodayTab.jsx)
   - [`StaffDutyTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/StaffDutyTab.jsx)
   - [`LearnerProgressTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/LearnerProgressTab.jsx)
   - [`AdmissionsTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AdmissionsTab.jsx)
   - [`FrontOfficeReportsTab.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx)
4. **Derived Summary & Health Panels:** [`BranchHealthAuditCard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/BranchHealthAuditCard.jsx), [`branchAuditRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/branchAuditRepository.js), [`LogRetentionCard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/LogRetentionCard.jsx), [`logRetentionRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/logRetentionRepository.js).

### Verified Good Behavior (Observed)

- **Strict Adherence to Blueprint Principle 16 (Executive Non-Execution):**
  Neither `DirectorDashboard.jsx` nor `ViceDirectorDashboard.jsx` exposes direct mutation controls over operational business data (no student create/edit buttons, no fee overrides, no direct payment insertions). Both provide strictly read-only strategic and operational intelligence.
- **Blueprint v3.3 Executive Dual-Control Separation:**
  - `DirectorDashboard.jsx` concentrates on high-level provincial KPIs (total revenue, enrollment breakdown, capacity utilization, multi-branch summary).
  - `ViceDirectorDashboard.jsx` concentrates on operational execution oversight, branch-by-branch attendance health, lead conversion efficiency, and operational bottlenecks.
- **Zero Paid Analytics Services (Spark Tier Retained):**
  No external paid tracking libraries (Mixpanel, Google Analytics 4, Datadog, Sentry) are used. All reporting runs on bounded Firestore queries and pure in-memory aggregations.
- **Realtime Listener Lifecycle Cleanup:**
  All listeners in `useDashboardData.js`, `MarketingDashboard.jsx`, and `InstructorLeaderDashboard.jsx` properly register unsubscribe handlers and invoke them on unmount. No subscription memory leaks detected.
- **Log Retention Spark Tier Preservation:**
  `logRetentionRepository.js` targets client telemetry (`errorLogs`) with a rolling 38-day window and uses Firestore's low-cost `getCountFromServer`. It strictly isolates audit logs, leaving immutable organizational governance records untouched.

---

## 2. Findings

| ID | Severity | Type | File(s) / Component | Summary |
|---|---|---|---|---|
| **DOM11-COR-01** | High | Bug / Correctness | [`FinancialReportsTab.jsx:51-77`](file:///e:/myliberty-portal/src/features/reports/tabs/FinancialReportsTab.jsx#L51) | Financial reporting date horizon (7d, 30d, 90d) is completely ignored in client-side filtering; sums all fetched historical payments into the revenue total. |
| **DOM11-COR-02** | Medium | Bug / Data Scope | [`TodayTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/TodayTab.jsx#L65), [`AdmissionsTab.jsx`](file:///e:/myliberty-portal/src/features/reports/tabs/AdmissionsTab.jsx#L76), [`FrontOfficeReportsTab.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx#L65) | Branch filtering checks raw `item.branch` without falling back to canonical `item.branchId`; silently drops modern branch-slugged records from reports. |
| **DOM11-COR-03** | Medium | Bug / Calculation | [`DirectorDashboard.jsx:126`](file:///e:/myliberty-portal/src/features/dashboard/DirectorDashboard.jsx#L126), [`ViceDirectorDashboard.jsx:118`](file:///e:/myliberty-portal/src/features/dashboard/ViceDirectorDashboard.jsx#L118) | Batch capacity calculation hardcodes `cls.capacity || 12`, ignoring canonical `maxCapacity` field; skews executive branch utilization gauges. |
| **DOM11-PERF-01** | Medium | Scalability / Spark Tier | [`reportsRepository.js:183-196`](file:///e:/myliberty-portal/src/features/reports/reportsRepository.js#L183) | `fetchStudentProgressData` queries `progressReports` without date window or limit; risks unbounded historical read scans on Spark tier. |
| **DOM11-GOV-01** | Medium | Governance Gap / Access | [`ManagerDashboard.jsx:113, 129, 140`](file:///e:/myliberty-portal/src/features/dashboard/ManagerDashboard.jsx#L113) | Manager Dashboard hardcodes `.filter(x => !x.division || x.division !== "kindergarten")`; blinds Kindergarten Division Managers to their own branch division records. |
| **DOM11-TECH-01** | Low | Technical Debt | [`branchAuditRepository.js:140-167`](file:///e:/myliberty-portal/src/features/dashboard/branchAuditRepository.js#L140) | `migrateLegacyBranchBatch` uses un-paged top-50 query without filtering on legacy fields; migration loop stalls indefinitely if top 50 documents are already canonical. |

---

## 3. Deep Dive Analysis

### DOM11-COR-01 — Financial Reporting Date Horizon Bypassed in Revenue Summary & Tables
- **Location:** [`src/features/reports/tabs/FinancialReportsTab.jsx:51-77`](file:///e:/myliberty-portal/src/features/reports/tabs/FinancialReportsTab.jsx#L51)
- **Observed Behavior:**
  When a user selects "7 days", "30 days", or "90 days", the UI state `rangeDays` is updated and passed to `getRecentPayments(limitCount)`. However, `getRecentPayments` only orders by `recordedAt desc` and applies a `limit(limitCount)` document count cap (100 or 200). In `FinancialReportsTab.jsx`, the client-side `useMemo` filter checks:
  ```javascript
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (branchFilter !== "all" && !matchesBranchFilter(p.branchId || p.branch, branchFilter)) return false;
      if (divisionFilter !== "all" && normalizeDivision(p.division) !== normalizeDivision(divisionFilter)) return false;
      if (methodFilter !== "all" && (p.method || "").toLowerCase() !== methodFilter.toLowerCase()) return false;
      // ... search query text filter ...
      return true;
    });
  }, [payments, branchFilter, divisionFilter, methodFilter, searchQuery]);
  ```
  It **never checks if `p.recordedAt >= rangeToSince(rangeDays)`**!
- **Consequence:** If a branch has only 30 transactions over the past 6 months, selecting "7 days" shows all 30 transactions and sums 6 months of revenue into the "7 Days Total Revenue" metric. This presents a false financial picture to Directors and Division Managers.
- **Remediation:** Calculate the horizon timestamp (`since = rangeToSince(rangeDays)`) and filter out payments where `p.recordedAt < since` before computing summaries and rendering the table.

---

### DOM11-COR-02 — Branch Isolation Filter Regressions on Raw `item.branch` Property
- **Location:**
  - [`src/features/reports/tabs/TodayTab.jsx:65, 78, 109, 137`](file:///e:/myliberty-portal/src/features/reports/tabs/TodayTab.jsx#L65)
  - [`src/features/reports/tabs/AdmissionsTab.jsx:76-77, 140`](file:///e:/myliberty-portal/src/features/reports/tabs/AdmissionsTab.jsx#L76)
  - [`src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx:65`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/FrontOfficeReportsTab.jsx#L65)
- **Observed Behavior:**
  Multiple report components filter branch data using only `cls.branch`, `s.branch`, `a.branch`, or `inq.branch`:
  ```javascript
  // TodayTab.jsx:65
  if (!matchesBranchFilter(cls.branch, branchFilter)) return false;
  // AdmissionsTab.jsx:76
  if (!matchesBranchFilter(a.branch, branchFilter)) return false;
  ```
- **Consequence:** Under modern schema standards (`DOM02-SEC-01`, `DOM05-COR-01`), records store the canonical `branchId` slug (e.g. `"kota_gorontalo"` or `"suwawa"`), while the display `branch` field may be omitted or empty in newly inserted documents. Passing `undefined` to `matchesBranchFilter` evaluates to `false` (or defaults to Gorontalo), silently excluding modern records from today's attendance schedules, inquiries, and admissions funnel reports.
- **Remediation:** Normalize all branch filter checks to inspect `item.branchId || item.branch`.

---

### DOM11-COR-03 — Executive Capacity Metrics Ignore Canonical `maxCapacity`
- **Location:** [`DirectorDashboard.jsx:126`](file:///e:/myliberty-portal/src/features/dashboard/DirectorDashboard.jsx#L126), [`ViceDirectorDashboard.jsx:118, 143`](file:///e:/myliberty-portal/src/features/dashboard/ViceDirectorDashboard.jsx#L118)
- **Observed Behavior:**
  Capacity is computed as:
  ```javascript
  const cap = Number(cls.capacity) || 12;
  ```
- **Consequence:** Per `BatchModal.jsx` and `classSchema.js`, the primary capacity field is `maxCapacity` (with fallbacks `capacity` or `maxStudents`). Batches configured with custom capacities (e.g. VIP/Private batches with capacity 4, or intensive workshops with capacity 20) that do not carry the legacy `capacity` key will fall back to 12. This distorts the province-wide and branch-level seat occupancy percentages on executive cockpits.
- **Remediation:** Update capacity computation across executive dashboards to `Number(cls.maxCapacity || cls.capacity || cls.maxStudents) || 12`.

---

### DOM11-PERF-01 — Unbounded Historical `progressReports` Query in Learner Progress
- **Location:** [`src/features/reports/reportsRepository.js:183-196`](file:///e:/myliberty-portal/src/features/reports/reportsRepository.js#L183) (`fetchStudentProgressData`)
- **Observed Behavior:**
  While attendance and shift reports enforce date windowing (`where("timestamp", ">=", since)`), the student progress report executes:
  ```javascript
  const progressQuery = query(collection(db, "progressReports"), ...progressFilters);
  ```
  with no date window and no query limit.
- **Consequence:** As progress reports and exam grades accumulate over years of operation across multiple branches and cohorts, this query scans every historical report in Firestore on every click of the Learner Progress tab, incurring unnecessary read operations and browser memory consumption on the zero-budget Spark tier.
- **Remediation:** Introduce a bounded limit (e.g. `limit(200)`) and/or support date windowing aligned with the user-selected reporting period.

---

### DOM11-GOV-01 — Manager Dashboard Hardcodes Course Division Filter, Blind to Kindergarten Division Managers
- **Location:** [`src/features/dashboard/ManagerDashboard.jsx:113, 129, 140, 156, 167`](file:///e:/myliberty-portal/src/features/dashboard/ManagerDashboard.jsx#L113)
- **Observed Behavior:**
  The Firestore subscriptions inside `ManagerDashboard` hardcode:
  ```javascript
  .filter((u) => !u.division || u.division !== "kindergarten")
  .filter((c) => !c.division || c.division !== "kindergarten")
  .filter((a) => !a.division || a.division !== "kindergarten")
  ```
- **Consequence:**
  Under Authoritative Blueprint v3.4 §5.4/§5.5 and Principle 10:
  - `manager + division="courses"` $\rightarrow$ Course Division Manager.
  - `manager + division="kindergarten"` $\rightarrow$ Kindergarten Division Manager.
  When a Kindergarten Division Manager logs into the portal, the hardcoded client filter excludes every single kindergarten record, rendering the manager's dashboard completely empty.
- **Remediation:** Make the division filter dynamic based on `managerProfile.division || "courses"`. When the logged-in manager is a Kindergarten Division Manager, scope their records to kindergarten; when Course Division Manager, scope to courses. Furthermore, if a manager profile lacks a division, `ManagerDashboard.jsx` displays an explicit alert prompting configuration rather than silently guessing.

---

### DOM11-TECH-01 — `BranchHealthAuditCard` Migration Loop & Client-Side Mutations
- **Location:** [`src/features/dashboard/branchAuditRepository.js`](file:///e:/myliberty-portal/src/features/dashboard/branchAuditRepository.js), [`BranchHealthAuditCard.jsx`](file:///e:/myliberty-portal/src/features/dashboard/BranchHealthAuditCard.jsx)
- **Observed Behavior:**
  `migrateLegacyBranchBatch` and `migrateAllLegacyCollections` performed client-side batch writes on multi-branch documents without partition indexes or cursor pagination, risking stalls and violating the principle that client dashboards should not execute bulk schema migrations.
- **Remediation (OD 2026-10-14):**
  Per Owner Decision 2B, `BranchHealthAuditCard.jsx` is made strictly read-only diagnostics. All client-side backfill/migration buttons (`Backfill All`, per-row `Backfill`) and functions (`migrateLegacyBranchBatch`, `migrateAllLegacyCollections`) have been completely deleted. Table rows display read-only partition badges (`Aligned` vs `Legacy Compatible`). Any historical record migration is deferred to isolated server-side administrative maintenance scripts.

---

## 4. Conformance Checklist

| Requirement | Status | Evidence |
|---|---|---|
| **Bounded Historical Queries (Spark Tier)** | PASS | Payments capped at 2,000 ceiling with 5-minute memory cache; progress reports bounded to date window (`since`), ordered `desc`, and capped at 200 with truncation indicator banner. |
| **Listener Lifecycle Cleanup** | PASS | All 5 realtime subscriptions properly clean up on component unmount. |
| **WITA Timezone Preservation** | PASS | All reports consistently use WITA day start/end dates via `scheduleDays.js` and `reportsRepository.js`. |
| **Executive Dual-Control Model (Principle 15 & 16)** | PASS | Director (Strategic) and Vice Director (Operational) dashboards are strictly read-only intelligence cockpits. |
| **Division Manager Scoping (Principle 10)** | PASS | Manager dashboard dynamically filters by manager's division, with explicit missing-division warning banner. |
| **Financial Horizon Accuracy** | PASS | Payments queried by `where("recordedAt", ">=", sinceIso)` with 2,000 doc ceiling and 5-minute in-memory cache; silent unordered fallback eliminated. |
| **Universal Capacity Normalization** | PASS | `getClassCapacity(cls)` centralized in `classesUtils.js` and unified across executive panels. |
| **Branch Slug Normalization** | PASS | All reporting and dashboard filters fall back to `item.branchId \|\| item.branch`. |
| **Export Security (Formula Injection)** | PASS | CSV export escapes `/^[=+\-@\t\r]/` on non-numeric strings while preserving valid negative currency values. |
| **Admin Read Scope Transition (Phase 2 Note)** | PASS (Scheduled) | Technical Admin access to financial documents is slated for formal removal in Phase 2 custom claims migration. |

---

## 5. Completed Remediation Record (2026-10-14)

1. **Centralized Class Capacity (`1A`):** Created `getClassCapacity(cls)` in `src/features/classes/classesUtils.js` and deployed across `BranchOperationalHealthPanel.jsx`, `BranchPerformancePanel.jsx`, `ExecutiveAnalyticsPanel.jsx`, and `ViceDirectorDashboard.jsx`.
2. **Universal Branch Matching & Division Alert (`1B`):** Updated all filters to `matchesBranchFilter(x.branchId || x.branch, ...)` across `ManagerDashboard.jsx`, `StaffDutyTab.jsx`, `LearnerProgressTab.jsx`, `InstructorPunctualityTab.jsx`, `AvailableBatches.jsx`, and `useDashboardData.js`. Added explicit configuration alert banner for unset manager divisions.
3. **Bounded & Ordered Learner Progress (`1C`):** Implemented `since` date window, `orderBy("examDate", "desc")`, `limit(200)`, and truncation warning banner in `reportsRepository.js` and `LearnerProgressTab.jsx`. Added composite indexes in `firestore.indexes.json`.
4. **Formula Injection Hardening (`1D`):** Hardened `csvEscape` in `src/features/shared/csvExport.js` against spreadsheet formula injection while preserving negative numeric financial values.
5. **Windowed Payment Queries & Spark Protection (`2A`):** Created `fetchPaymentsForWindow` with 2,000 document ceiling, 5-minute memory cache, and removed silent unordered fallback.
6. **Strictly Read-Only Branch Health Audit (`2B`):** Converted `BranchHealthAuditCard.jsx` to purely read-only diagnostics and purged all client-side batch migration routines.
7. **Blueprint v3.4 Conformance (`1E` / `2C`):** Aligned all governance references with Authoritative Blueprint v3.4 §5.4/§5.5 and documented Phase 2 Admin payment read stripping.
