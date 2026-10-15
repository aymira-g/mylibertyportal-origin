# MyLiberty Portal — BLRCA 03: Technical Audit Method & Mismatch Investigation

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Actionable end-to-end technical tracing methodology, the six conformance dimensions, and verification evidence standards  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. End-to-End Technical Tracing Method

To prove whether a role capability conforms to approved governance, the auditor must trace the execution path **from the user interface down to the database and direct access layers**.

A mismatch cannot be established merely by glancing at a button, nor can compliance be asserted merely because a view fails to render. The auditor must trace five verification checkpoints:

```text
[Checkpoint 1: ROUTE & DASHBOARD]
Does the route guard or dashboard mount expose this capability to this role?
        ↓
[Checkpoint 2: COMPONENT PROPS & LOGIC]
Do props (isAdminView, isSupervisor, canEdit) elevate capabilities or disable guards?
        ↓
[Checkpoint 3: REPOSITORY & QUERY SHAPE]
Does the data-access function inject appropriate branchId/division filters and limits?
        ↓
[Checkpoint 4: RULES & BACKEND PERMISSIONS]
Do firestore.rules or Worker endpoints enforce the boundary if called directly?
        ↓
[Checkpoint 5: FAILURE & PRESENTATION STATE]
When authorization fails or queries error, does the UI fail closed, or show false zero figures?
```

### Distinguishing UI Exposure from Confirmed Backend Access

Auditors must explicitly distinguish two distinct findings:

1. **UI Exposure Only:** The component renders an unauthorized control or tab, but the underlying repository query or Firestore rule rejects the request with `permission-denied`. (Impact: User confusion, UI errors, console crashes; classified typically as Medium or Low).
2. **Confirmed End-to-End Exposure:** The component renders the unauthorized control **AND** the backend repository/rules permit data retrieval or mutation. (Impact: Serious governance conflict, security breach, unauthorized data disclosure; classified as High or Critical).

---

## 2. The Six Conformance Dimensions

Every discovered role-feature combination must be systematically evaluated against the dimensions that apply to it. If a dimension is not applicable to a specific feature, the auditor must explicitly record the technical reason rather than silently skipping it.

### Dimension 1: Role & Responsibility

- **Core Question:** Does this business function belong to this role under the ratified operating model?
- **Failure Indicators:** Technical System Admin viewing tuition revenue; teaching Instructor approving class cohort schedules; Front Office staff terminating employee accounts.

### Dimension 2: Information Visibility & Disclosure

- **Core Question:** Is the displayed information necessary and permitted for this role?
- **Exposure Paths:** Distinguish summaries, KPI cards, rosters, search results, CSV downloads, detail drawers, and printed receipts as distinct exposure paths.
- **Session & Cache Leakage on Shared Workstations:**
  - Check in-memory maps, browser `localStorage`, `sessionStorage`, and service worker caches for sensitive data surviving sign-out or a user switch.
  - Front-desk PCs and kiosk terminals are shared across staff shifts. Any cache keyed without the authenticated user's UID or role risks leaking confidential business data across shifts.
  - *Concrete Example:* `src/features/reports/tabs/FinancialReportsTab.jsx` line 19 defines `financialCache` as an in-memory module-level `Map` keyed solely by `branchId_division_rangeDays` with a 5-minute TTL—leaving loaded financial figures in memory across user sessions on shared hardware.

### Dimension 3: Action & Decision Authority

- **Core Question:** Can the role initiate, modify, delete, approve, reject, or execute only the operations assigned to it?
- **Failure Indicators:** Client-side role checks gating mutations while backend rules omit corresponding restrictions; UI allowing un-enveloped direct writes.

### Dimension 4: Organizational Scope

- **Core Question:** Are branch (`branchId`), division (`division`), executive province-wide, student, and employee record boundaries strictly respected?
- **Failure Indicators:** Queries omitting `branchId` filters; Division Managers accessing other divisions' records; satellite Course Division Managers seeing Kindergarten data.

### Dimension 5: Workflow & Separation of Duties

- **Core Question:** Are workflow states, maker-checker separation, self-approval prevention, required approval order, and post-approval immutability preserved?
- **Failure Indicators:** Same user acting as both requester (Maker) and approver (Checker); approvals executed without an immutable envelope; terminal states (signed-off shifts, applied tickets) being modified.

### Dimension 6: Interface-to-Enforcement Consistency

- **Core Question:** Does the UI communicate the right role behavior, and do repositories, Worker endpoints, and Firestore rules enforce identical boundaries?
- **Fail-Closed Presentation ("Denial-Looks-Like-Zero"):**
  - A permission-denied or failed query must **never** be presented to the user as a legitimate empty result or zero business figure (such as "Rp 0" revenue, 0 active students, or 100% attendance).
  - Silencing catch blocks with `console.error` causes the UI to render default empty state variables as though the branch has zero revenue.
  - *Concrete Example:* In `FinancialReportsTab.jsx:61`, query failures caught with `console.error` allow the UI to render empty/zero totals instead of displaying an explicit error state (`LeaderErrorNote` or `InlineErrorRetry`).

---

## 3. Preserved Worked Example: System Admin & Financial Reports

This worked example preserves the original evidence from the approved BLRCA source procedure.

### Part A: Historical Source Observations (Pinned to Baseline `99163ca`, 2026-10-15)

> **Qualification:** Observed by source inspection at HEAD `99163ca` (2026-10-15) — not emulator-verified at that commit.

- **Expected Contract (Ratified Policy per OD-2):**
  - *System Admin (`admin`):* Established by OD-2 (§OD-2: System Admin Read Payments ❌ Forbidden, pending Phase 2 cleanup — cleanup was never tracked): System Admin is strictly forbidden from any visibility into business financial, tuition, and revenue data or reports. System Admin is a technical infrastructure role; technical access must never confer business intelligence, revenue visibility, or financial oversight rights.
  - *Elaborated Multi-Role Financial Governance Contract (OD-2, OD-4, Blueprint §7, §18):*
    1. **Director & Vice Director:** Executive dual-control grants province-wide, cross-division read visibility for strategic and operational performance assessment. Neither executive may act as desk cashier (preserving maker-checker separation). Director approves cash discrepancies ≥ Rp 50.000 (Vice Director acts only as Acting Director during Director's approved leave — OD-4).
    2. **Division Managers (Course & Kindergarten):** Granted read-only financial visibility strictly bounded to their assigned branch and division (`manager + branchId + division`). A Course Manager sees only course revenue at their branch; Kindergarten Manager sees only main campus kindergarten revenue. No cross-branch or cross-division leakage. At lean satellites, Course Division Managers review cash discrepancies < Rp 20.000 (OD-4).
    3. **Operational Leader (`ops_lead`):** Oversees daily desk operations and shift sign-offs for Main Campus; may record payments as a Front Office-class maker (OD-2); approves Main Campus cash discrepancies < Rp 20.000 (OD-4); holds no province-wide financial reporting rights.
    4. **Front Office Roles (`frontoffice`, `opslead`/`ops_lead`, `frontofficelead` — rules `isFrontOffice()`):** Operational payment makers per OD-2 for payment collection, receipt issuance, and shift drawer balancing for own branch and division. Hold transactional read access to their branch's desk payments, but no province-wide financial reporting scope.
    5. **System Admin (`admin`):** Strictly zero visibility (reports, document queries, metrics) and zero write authority per OD-2.
- **Observed Static Paths at HEAD `99163ca`:**
  - *UI exposure:* `src/features/dashboard/AdminDashboard.jsx:274` mounts `<ReportsDashboard isAdminView={true} ... canEdit={false} />`.
  - *Tab & filter elevation:* `src/features/reports/ReportsDashboard.jsx:24-27` derives `isActualAdmin`, which grants access to the Financial & Tuition tab (line 266) and grants the province-wide "All Campuses" scope filter (`canAccessProvinceScope`).
  - *Data query path:* `src/features/reports/tabs/FinancialReportsTab.jsx:52` calls `fetchPaymentsForWindow` (`src/features/finance/paymentsRepository.js:114`), which lists up to 2,000 `payments` documents across all branches.
  - *Backend rules permission:* In `firestore.rules`, the rule for `match /payments/{paymentId}` specifies `allow list: if isExecutive() || ...`. The rule helper `isExecutive()` is defined as `isDirector() || isViceDirector() || isAdmin()`. Thus, the backend security rule as written appears to permit System Admin to list all payment documents province-wide—indicating that this is not merely an isolated UI exposure, but potentially an end-to-end data exposure.
  - *Scale note across rules:* `isExecutive()` (which includes `isAdmin()`) appears 46 times across `firestore.rules`, whereas `isOrgExecutive()` (Director and Vice Director only) appears only 7 times. Consequently, **Slice 1 (System Admin)** must review every single occurrence of `isExecutive()` to ensure technical Admin does not retain unauthorized business data visibility or operational authority.
  - *Related cache & error observations:*
    - In `FinancialReportsTab.jsx:18`, `financialCache` is a module-level `Map` keyed only by branch/division/range (5-minute TTL) and not keyed by user identity, risking shared-device cache leakage across sessions.
    - In `FinancialReportsTab.jsx:52`, query failures are caught with `console.error` only, risking that permission-denied queries render as "Rp 0" (denial-looks-like-zero).
- **Governance Status:** Confirmed Governance Conflict per OD-2. Logged as canonical findings `DOM11-GOV-02`, `DOM01-GOV-03`, `DOM01-REP-01`, and `DOM01-PERF-01`.

---

### Part B: Re-Verification Against Target Checkout (HEAD `131f1b2`, 2026-10-16)

`[NEW — PENDING OWNER REVIEW: Target Checkout Re-Verification Note]`

An independent code inspection performed against the active target checkout (commit `131f1b2`) verified the following shifts and current status:

1. **Security Rules Helper Counts:**
   - At `99163ca`: `isExecutive()` appeared 46 times; `isOrgExecutive()` appeared 7 times.
   - At current HEAD `131f1b2`: `isExecutive()` has decreased to **16 occurrences**; `isOrgExecutive()` has increased to **37 occurrences**.
2. **`/payments` Rules Boundary:**
   - In current `firestore.rules:1006`, `match /payments/{paymentId}` list rule has been updated:
     `allow list: if isOrgExecutive() || ((isManager() || isFrontOffice()) && ...)`
     Technical `admin` is no longer bundled into `/payments` list permission at the database rules layer.
3. **UI Dashboard Mounting (`AdminDashboard.jsx`):**
   - In `src/features/dashboard/AdminDashboard.jsx:274`, `<ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={false} />` remains mounted.
4. **Reports Tab Guards (`ReportsDashboard.jsx`):**
   - In `ReportsDashboard.jsx:129` and line 266, `isActualAdmin` has been removed from the Financial & Tuition tab button and render condition:
     `{subTab === "finance" && (isExecutiveView || isManager) && (`
     The Financial tab is no longer directly clickable by System Admin in the UI.
5. **Code Line Displacements:**
   - In `FinancialReportsTab.jsx`: `financialCache` declaration is at line 19 (was line ~18); `fetchPaymentsForWindow` call is at line 56 (was line 52); error logging catch block is at line 61 (was line 52).
   - In `src/features/finance/paymentsRepository.js`: `fetchPaymentsForWindow` definition is at line 118 (was line 114).
6. **Remaining Open Leads & Risks to Test:**
   - *Cache Keying:* In `FinancialReportsTab.jsx:19, 42-45`, `financialCache` remains keyed solely by `canonicalBranchId_division_rangeDays`, unkeyed by user UID.
   - *Fail-Closed Presentation:* In `FinancialReportsTab.jsx:61`, query catch block continues to log `console.error` without updating component state to an error display.
   - *Active Remediation Plan:* Formally tracked under `docs/plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md` (Status: IN PROGRESS). Post-fix emulator verification is scheduled as the next verification step.
