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
  - *Concrete Example (Historical Baseline):* In `src/features/reports/tabs/FinancialReportsTab.jsx`, `financialCache` was historically defined as an in-memory module-level `Map` keyed solely by `branchId_division_rangeDays` with a 5-minute TTL—leaving loaded financial figures in memory across user sessions on shared hardware. (Remediated in `220c10a`: cache key now prefixes `currentUserUid`).

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
  - *Concrete Example (Historical Baseline):* In `FinancialReportsTab.jsx:61`, query failures were historically caught with `console.error` only, allowing the UI to render empty/zero totals instead of displaying an explicit error state. (Remediated in `220c10a`: sets error state and renders an explicit error alert banner with Retry button).

---

## 3. Frontend Workspace Placement Pass (Role Workspace Coherence)

> **Status:** RATIFIED AUTHORITATIVE METHODOLOGY — APPROVED BY OWNER KIFRY (2026-10-17).
> **Verification Purpose:** Evaluates whether each role's workspace contains the **right features** — verifying workspace coherence, clutter elimination, and cognitive focus, separate from backend access security.

### 3.1 The Principle of Role Workspace Coherence

Securing backend queries and Firestore rules is a mandatory baseline, but backend security alone does not guarantee a well-governed, usable user interface. This pass evaluates whether each role's workspace (dashboard, navigation shell, tabs, cards, and modals) provides tools aligned with its ratified operational responsibilities, records instances where exposed controls create operational clutter or usability friction, and identifies controls that cannot be used or lack governance backing.

Auditors must enforce seven core placement principles during this pass:

1. **Backend Denial Does Not Justify Frontend Exposure:** The fact that a backend Firestore security rule or Cloudflare Worker endpoint correctly returns `permission-denied` (HTTP 403) does **not** justify leaving an unauthorized, unusable, or confusing feature visible in the frontend. Exposing dead buttons, unauthorized tabs, or unopenable dialogs degrades user trust, clutters operational screens, and invites user confusion. Auditors record observed visibility or usability friction as an audit observation regardless of backend denial.
2. **Existing Code or UI Is Not Proof of Authority:** The presence of a component in an existing dashboard or the historical availability of a button is never evidence that a role is authorized to have it. The current codebase is an audit target to be reconciled against governance, not an authoritative design specification.
3. **Ratified Source Prohibition Compels Conformance Finding:** If the Authoritative Blueprint, an ADR, or an accepted Owner Decision establishes that a business capability does not belong to a role, its exposure in the user interface is recorded as an audit observation and logged as a conformance finding (`MISPLACED / UNCLEAR`), citing the ratified exclusion, regardless of whether backend security rules correctly block the underlying mutation or query.
4. **No Authority by Inference:** If ownership or intended placement of a feature is not explicitly established in the Authoritative Blueprint or an accepted Owner Decision, the auditor must classify the item as `[Owner Decision Required]`. The auditor must **never** infer, assume, or assign authority to a role based on convenience, operational similarity, or perceived role seniority.
5. **Separation of Defect Classifications:** Auditors must rigorously categorize and separate findings:
   - **Frontend Placement Defect (UI / UX):** Feature visible/reachable in the wrong role's cockpit, dead buttons, missing expected tools, or misleading zero/error presentations.
   - **Governance Conflict (Policy Divergence):** Software permits an action or data access directly conflicting with a ratified rule in the Authoritative Blueprint or an accepted Owner Decision.
   - **Governance Gap (Policy Ambiguity):** Unclear operational ownership or unratified workflow requiring explicit owner decision (`[Owner Decision Required]`).
   - **Technical Security Vulnerability:** Backend rules or Worker APIs permit unauthorized data mutations or reads when queried directly.
6. **Preservation of Legitimate Neighboring-Role Coordination:** Restricting operational mutations does not require blinding staff to necessary operational context. Dashboards may provide read-only situational awareness (e.g. an Operational Leader viewing daily instructor class schedules) where necessary for on-site coordination, provided execution controls are cleanly omitted.
7. **Fail-Closed Presentation & Clean Zero-States:** When queries fail or are denied, the UI must never render misleading affirmative business data (such as "0 Active Students", "100% Attendance", or "Rp 0 Revenue"). Failure states must be explicitly surfaced with clear retry or status indicators.

### 3.2 Finding vs. Decision vs. Remedy Boundary Enforcement

To protect organizational governance and system integrity, auditors executing a placement pass must strictly enforce the boundary between an **Audit Finding**, an **Owner Decision**, and an **Implementation Remedy**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FINDING (Auditor's Evidence-Backed Observation)                                     │
│    - What is observed in the UI vs. what is explicitly ratified in the Blueprint/ODs.  │
│    - Documents component location, route, user experience, and backend status.         │
│    - Strictly read-only; never alters code; never manufactures policy.                 │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│ IF RATIFIED RULE CLEARLY VIOLATED:      │ │ IF RATIFIED GOVERNANCE SILENT / UNCLEAR:  │
│ → Log as Conformance Finding            │ │ → Log as [Owner Decision Required]        │
│   (MISPLACED / UNCLEAR or Confirmed)    │ │   (Governance Gap)                        │
└────────────────────┬────────────────────┘ └─────────────────────┬─────────────────────┘
                     │                                            │
                     │                                            ▼
                     │                      ┌───────────────────────────────────────────┐
                     │                      │ 2. DECISION (Owner Kifry's Exclusive Pre- │
                     │                      │    rogative)                              │
                     │                      │    - Auditor documents options and risks. │
                     │                      │    - Auditor NEVER infers authority.      │
                     │                      │    - Requires formal Owner Ratification.  │
                     │                      └─────────────────────┬─────────────────────┘
                     │                                            │
                     ▼                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ 3. REMEDY (Separate Authorized Implementation Task)                                   │
│    - Zero remediation during the audit pass (strict read-only boundary).              │
│    - Requires Owner task authorization + approved strategy plan.                      │
│    - Remedies determined through separate implementation planning; rules not widened.  │
│    - Requires independent post-fix verification (prohibiting self-closure).           │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Boundary Rules:

1. **The Finding Boundary (Evidence, Not Policy):**
   - An *Audit Finding* is an evidentiary observation of divergence between actual UI behavior and ratified governance.
   - If an approved source explicitly excludes a capability (e.g. System Admin viewing revenue under OD-2; Marketing accessing Kindergarten under Blueprint §5.0.1; Facilities reading student PII under Blueprint §6.10), the finding is classified as a Conformance Finding (`MISPLACED / UNCLEAR` or `Governance Conflict`), citing the ratified exclusion, regardless of whether backend rules return `permission-denied`.
   - The finding records: *file path, line numbers, rendered UI elements, navigation entry paths, backend rule behavior, and governing citations*.
   - A finding never decides what the policy *should* be, and never alters application code.

2. **The Decision Boundary (Governance Determination, Not Auditor Choice):**
   - When the Authoritative Blueprint and accepted Owner Decisions do not explicitly define who owns a capability or whether a screen belongs in a role's cockpit, the situation is a **Governance Gap**, not an implementation bug.
   - The auditor's authority halts at recording `[Owner Decision Required]`.
   - The auditor must **never** resolve the gap by inferring authority from existing code, user convenience, operational similarity, or perceived role seniority.
   - All governance determinations belong exclusively to Owner Kifry. An unratified recommendation is never a binding decision.

3. **The Remedy Boundary (Authorized Implementation, Not Casual Edit):**
   - **Auditors do not modify code during an audit pass.** The Frontend Workspace Placement Pass operates strictly under `AGENTS.md` Read-Only Audit Boundaries.
   - An auditor who discovers a misplaced button, dead link, or missing view must **not** edit UI files or adjust props as an opportunistic continuation of the audit pass.
   - Every remedy requires a separate, owner-authorized implementation task with an approved remediation plan.
   - **Remedies are determined during separate remediation planning:**
     - An audit observation documents the visibility, usability, and authority issue; it does not unilaterally prescribe product changes. When an authorized remediation task is scheduled, remedies must respect governance (e.g. scoping or omitting unauthorized UI components rather than relaxing security rules to accommodate stray controls).
     - A *Governance Gap* cannot be remedied with code until Owner Kifry has formally ratified an Owner Decision defining the intended model.
     - All Tier 1 and sensitive remedies require independent post-fix verification by an agent who did not implement the fix.

---

### 3.3 Placement Categories

For every evaluated screen, tab, card, action, link, or shared component, the auditor must classify the feature's intended placement under one of five canonical categories:

| Category | Definition | Example in MYLIBERTY |
|---|---|---|
| **`PRIMARY`** | Core daily capability directly tied to the role's primary ratified operational responsibilities. | Cashier payment entry for `frontoffice`; class attendance marking for `instructor`. |
| **`SHARED`** | Legitimate cross-functional tool used cooperatively with other roles without expanding authority. | Reception kiosk station shared between Front Office and daily desk staff; shared visitor inquiry queue. |
| **`CONDITIONAL`** | Feature mounted only when specific prerequisites, role modifiers, or branch typologies are active. | Lean Satellite Course Manager cohort scheduling under ADR 2026-10-13 Option B (mounted only when `hasBranchOpsLead` is false). |
| **`INFORMATIONAL`** | Read-only operational context, exception summary, or status indicator needed for coordination; mutation actions omitted. | Ops Lead viewing daily instructor teaching assignments; Executive read-only high-level branch KPI summary. |
| **`INTENTIONALLY ABSENT`** | Explicitly forbidden, shielded, or out-of-scope under approved governance; observed presence in UI constitutes a conformance finding. | Financial / revenue reports tab for `admin`; Kindergarten PAUD views for `marketing`; Student / parent PII for `officeboy`. |

---

### 3.4 Targeted Inspection Checks

The auditor must execute eight specific structural checks during the placement pass:

1. **Route & Direct URL Entry:** Inspect `src/App.jsx` and URL hash/path routing. Does directly navigating to `/portal`, `/kiosk`, or `/reports` expose views or broken states to unauthorized roles?
2. **Top-Level Navigation & Shell Menus:** Inspect navigation bars, sidebars, and `MobileDashboardShell.jsx`. Are navigation options exposed for capabilities the role cannot execute?
3. **Tabs & Sub-Tabs:** Inspect multi-tab dashboards (e.g. `ReportsDashboard.jsx`, `ManagerDashboard.jsx`). Do tab bars display options that violate division or role boundaries?
4. **Nested & Shared Components:** Inspect shared presentation components (e.g. `AvailableBatches.jsx`, `StudentRoster.jsx`, `StudentRosterTable.jsx`, `ApprovalInbox.jsx`). Do props such as `canAdminister`, `isAdminView`, `readOnly`, or `isSupervisor` leak unauthorized controls when embedded in a sub-view?
5. **Permanently Disabled Controls & Dead Buttons:** Identify buttons rendered in a permanently disabled state or controls that trigger an alert ("Access Denied") upon click. Record the visibility and usability issue as an audit observation. If a ratified exclusion exists (e.g., in the Authoritative Blueprint or an accepted Owner Decision), cite it and record a conformance finding; otherwise mark the placement as unclear (`[Owner Decision Required]`), leaving the operational remedy (such as omitting the control, hiding the action, or clarifying permissions) for a separate implementation decision.
6. **Misleading Error & Zero States:** Check catch blocks and query fallbacks. When access is denied or data is absent, does the UI show "0 students" or "Rp 0", misleading the user into thinking no students or revenue exist?
7. **Direct-Action Floating Controls & Modals:** Check global action triggers (e.g. Floating Action Buttons, quick switcher triggers, keyboard shortcuts). Can an unprivileged role trigger privileged creation or editing modals?
8. **Intended Neighboring-Role Visibility:** Confirm that when read-only operational context is displayed for coordination, it does not inadvertently include mutation buttons, status toggles, or direct edit drawers.

---

### 3.5 Frontend Placement Ledger Schema

When executing a Frontend Workspace Placement Pass, findings and observations must be recorded in the following standardized tabular schema:

```markdown
| Check ID | Role + Scope | Screen / Component Path | Feature Description | Placement Category | Ratified Source / Authority | Observed Navigation & Entry Path | Backend Enforcement Status | Placement Outcome | Finding / Ledger Ref |
```

#### Allowed Column Values & Standards:
- **`Check ID`**: Unique identifier (e.g. `FP-ADM-01`, `FP-FO-03`, `FP-MKT-02`).
- **`Role + Scope`**: Canonical role ID, branch scope, and division (e.g. `admin`, `manager (kota_gorontalo, courses)`, `officeboy`).
- **`Screen / Component Path`**: Exact file path and line reference where the feature is mounted (e.g. `src/features/reports/ReportsDashboard.jsx:266`).
- **`Feature Description`**: Clear description of what the feature displays or enables (e.g. "Financial & Tuition revenue tab").
- **`Placement Category`**: `PRIMARY`, `SHARED`, `CONDITIONAL`, `INFORMATIONAL`, or `INTENTIONALLY ABSENT`.
- **`Ratified Source / Authority`**: Canonical governance citation justifying why this feature belongs or is excluded (e.g. `Blueprint §7, OD-2`, `ADR 2026-10-13 Option B`).
- **`Observed Navigation & Entry Path`**: How the user reaches the feature (e.g. `Dashboard Tab -> Sub-tab "finance"`, `Direct route /portal`, `Embedded table action column`).
- **`Backend Enforcement Status`**: Recorded **separately** from frontend outcome:
  - `BLOCKED (403 / permission-denied)`: Backend rules/repositories reject unauthorized requests.
  - `ALLOWED (End-to-End Exposed)`: Backend rules permit the unauthorized request (Critical Governance & Security breach).
  - `NOT ENFORCED`: No backend rule exists (purely client-side gating).
  - `STATIC PRESENTATION`: Feature is purely display text with no underlying data fetch or mutation.
- **`Placement Outcome`**:
  - `CONFORMS`: Feature cleanly belongs in this workspace under an approved source.
  - `MISPLACED / UNCLEAR`: Feature is visible or reachable but does not clearly belong to this role, or clutters/confuses the workspace.
  - `MISSING_EXPECTED`: Feature belongs to this role under approved governance but is missing, unreachable, or inadvertently hidden.
  - `[Owner Decision Required]`: Placement or ownership is not established by the Blueprint or an accepted decision; requires owner clarification.
  - `NOT TESTED`: Screen/component not yet exercised in this pass.
  - `NOT APPLICABLE`: Feature not relevant to this workspace.
- **`Finding / Ledger Ref`**: Pointer to canonical entry in `bug-ledger.md` (for defects) or `role-function-conformance-ledger.md`.

---

## 4. Preserved Worked Example: System Admin & Financial Reports

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
5. **Code Line Displacements & In-Component Remediation (Shipped in `220c10a`):**
   - In `FinancialReportsTab.jsx`: `financialCache` declaration is at line 19; `fetchPaymentsForWindow` call is at line 56; error logging catch block is at lines 60–63.
   - In `src/features/finance/paymentsRepository.js`: `fetchPaymentsForWindow` definition is at line 118 (was line 114).
   - *User-Scoped Cache Keying:* Commit `220c10a` updated line 45 to key `financialCache` by `currentUserUid` (`const cacheKey = `${currentUserUid}_${canonicalBranchId}_${division}_${rangeDays}`;`), preventing cache leakage across sessions on shared workstations.
   - *Fail-Closed Error Handling:* Commit `220c10a` added `setError(...)` in the catch block at lines 60–63 and an explicit error alert banner with a Retry button at lines 125–139, eliminating the denial-looks-like-zero failure mode.
6. **Remediation & Verification Status (Shipped in `220c10a` & `131f1b2`):**
   - Both cache keying and fail-closed error handling were fully remediated in commit `220c10a` and verified in commit `131f1b2` / BLRCA Slice 1 Phase 6.
   - In `131f1b2`, `corporateEvents` calendar read was synchronized with `isExecutive()` to resolve emulator query issues, and security rules matrix assertions were aligned with Admin branch/division isolation.
   - *Active Remediation Plan:* Tracked under `docs/plans/active/2026-10-15-blrca-slice1-system-admin-remediation.md` (marked COMPLETED). All Slice 1 findings closed in `bug-ledger.md`.
