# MyLiberty Portal — BLRCA 02: Feature Discovery & Coverage

**Document Type:** Level 2 Audit Campaign Procedure  
**Status:** Restructured from the owner-ratified BLRCA procedure dated 2026-10-15; moved content is intended to preserve the approved meaning. Passages marked `[NEW — PENDING OWNER REVIEW]` are additions and are not represented as owner-ratified.  
**Scope:** Discovering, inventorying, and mapping the complete application feature surface and execution paths  
**Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
**Parent Framework:** [`docs/audits/Role & Business Logic Conformance Audit/00-README.md`](./00-README.md)

---

## 1. Objective & Scope of Discovery

A complete conformance audit cannot rely on top-level dashboard inspection alone. A top-level component may appear clean while deeply nested dialogs, reusable cards, background listeners, or Worker endpoints harbor serious authorization collapses.

The objective of Feature Discovery is to **inventory the complete reachable feature surface**—including human-interactive and automated execution paths—to ensure zero uninspected dark paths.

---

## 2. The Complete Feature Surface

The auditor must systematically map all entry points across five structural layers:

```text
LAYER 1: USER INTERFACE (Presentation & Navigation)
Routes · Route Guards · Shells · Navigation Bars · Tabs · Sub-tabs · Modals · Floating Actions

LAYER 2: DATA PRESENTATION (Visibility & Disclosure)
Counters · KPI Cards · Charts · Rosters · Tables · Detail Drawers · Search Inputs · Filter Dropdowns

LAYER 3: USER MUTATION & EXPORT (Actions & Decisions)
Forms · Buttons · Inline Edits · Approvals · Rejections · CSV Downloads · Print Handlers · Clipboard

LAYER 4: CLIENT LOGIC & DATA ACCESS (Orchestration)
Hooks · Repositories · Queries · Subscriptions · State Stores · Normalization Helpers · Role Checks

LAYER 5: BACKEND ENFORCEMENT & INTEGRATION (Security Boundaries)
Firestore Security Rules · Cloudflare Worker · Service Accounts · FormSync.gs · Maintenance Scripts
```

### Checklist of Surface Elements to Inspect

1. **Top-Level Dashboards & Route Guards:**
   - `src/App.jsx` routing table and role-based redirect logic (`/`, `/kiosk`, `/parent`, `/register`, `/join`).
   - Role dashboard mounts: `AdminDashboard.jsx`, `ExecutiveDashboard.jsx`, `DirectorDashboard.jsx`, `ViceDirectorDashboard.jsx`, `ManagerDashboard.jsx`, `FrontOfficeDashboard.jsx`, `InstructorLeaderDashboard.jsx`, `InstructorDashboard.jsx`, `OfficeBoyDashboard.jsx`, `ParentDashboard.jsx`.
2. **Navigation, Tabs & Nested Panels:**
   - Tab switchers, sub-tab bars (e.g., `ReportsDashboard.jsx` sub-tabs: today, admissions, frontoffice, classes, learners, attendance, staff, finance, operations).
   - Sidebars, quick-action menus, mobile bottom bars (`MobileDashboardShell.jsx`).
3. **Data Displays, Metrics & Reports:**
   - Stat cards, total revenue summaries, attendance rate badges, student count counters.
   - Data tables (`StudentRosterTable`, `CohortRosterTable`, `WalkInTable`, `RecentVisitsTable`).
   - Historical date-window filters (7d, 30d, 90d, custom dates) and campus scope selectors ("All Campuses" vs. single branch).
4. **Data Exports, Downloads & Print Actions:**
   - CSV export buttons, report generators, receipt printing (`DigitalReceiptTab.jsx`, `printTable.js`).
   - Browser clipboard copying (e.g., payment links, token strings, parent link PINs).
5. **Interactive Actions & Mutations:**
   - Creation modals (enroll student, create class cohort, record payment, log expense, submit inquiry, log staff leave).
   - Modification workflows (edit student level, adjust class schedule, update staff status, self-correct shift).
   - Workflow decisions (approve/reject discount, approve cash discrepancy, approve class transfer, sign off daily shift).
   - Administrative actions (reset PIN, invite staff, provision kiosk device, clear cache).
6. **Non-Human & Background Execution Paths:**
   - Real-time `onSnapshot` listeners (e.g., `useDashboardData.js`).
   - Cloudflare Worker endpoints in `cloudflare-worker/worker.js` (`POST /api/kiosk-clock-in`, `POST /api/kiosk-clock-out`, `POST /api/parent-link`, `POST /api/ai-assistant`).
   - Google Apps Script external sync (`FormSync.gs`).
   - Administrative maintenance scripts (`scripts/`).

---

## 3. Following Generic Props & Helpers to Semantic Effects

A frequent cause of authorization leakage is the casual propagation of generic props or helpers that accidentally elevate permissions. The auditor must trace props and helper functions to their **actual operational effect**, never assuming the name describes the real boundary:

### High-Risk Props to Follow

- `isAdminView={...}`: Does passing this prop accidentally unlock financial revenue tabs, student PII, or province-wide filters to non-executives? (e.g., `AdminDashboard.jsx:274` mounting `ReportsDashboard isAdminView={true}`).
- `canEdit={...}` / `canManage={...}`: Does this boolean toggle bypass workflow approval envelopes or database diff-checks?
- `isSupervisor={...}`: Who does this helper include? Does it collapse Division Managers, Operational Leaders, and System Admin into generic supervisors?
- `branchFilter="all"`: Can a non-executive component emit a query with branch set to "all", triggering either a data leak or an unhandled Firestore `permission-denied` crash?

### Role and Permission Helper Checks

In `src/features/shared/roles.js` and local components, verify:
- `isExecutiveRole(role)`: Does it bundle `admin`? (Yes: `admin || director || vice_director`). Is it being used where organizational executive authority (`isOrgExecutiveRole`) is required?
- `isOrgExecutiveRole(role)`: Correctly restricted to `director` and `vice_director`.
- `isFrontOffice(role)`: Does it include `frontofficelead` and `opslead`? What operational capabilities does this confer?

---

## 4. The Feature Inventory Schema

During Phase 2 of each slice, discovered features must be cataloged in a structured inventory table:

| Field | Description | Example |
|---|---|---|
| `Feature ID` | Stable identifier within the slice | `FEAT-FIN-01` |
| `Path / Component` | File path and line number of route or component | `src/features/reports/tabs/FinancialReportsTab.jsx:25` |
| `Reachable Roles` | Roles that can navigate to or mount this feature | `director`, `vice_director`, `manager` (courses/gto), `admin` [leak] |
| `Data Displayed` | Specific business or personal data exposed | Total gross tuition revenue, cash receipts, discount breakdown |
| `Mutations / Actions` | Create, update, delete, approve, export actions | Fetch payment window, export revenue CSV, filter by date |
| `Intended Scope` | Authorized branch and division boundaries | `branchId: own`, `division: own` (Exec: province-wide) |
| `Enforcement Path` | UI guard → Repository method → Rules / Worker | `ReportsDashboard` tab guard → `fetchPaymentsForWindow` → `firestore.rules:payments allow list` |
| `Applicable Dimensions` | Relevant BLRCA dimensions (1 through 6) | Dim 1 (Role), Dim 2 (Visibility), Dim 4 (Scope), Dim 6 (Consistency) |
| `Coverage Status` | `INSPECTED`, `UNINSPECTED`, `BLOCKED`, `EXCLUDED` | `INSPECTED` |

---

## 5. Tracking Uninspected Paths & Coverage Gaps

`[NEW — PENDING OWNER REVIEW: Formal Coverage Gap Accounting]`

A dashboard list alone is **not complete feature coverage**. To guarantee audit integrity:

1. **Explicit Exclusion Log:** If a component, route, or sub-tab within an audited domain is not inspected during a slice, it must be explicitly recorded in the slice report under **"Out of Scope / Uninspected Paths"** with a concrete technical justification (e.g., *"Third-party Leaflet map integration excluded from Slice 1 financial boundary audit"*).
2. **Dead Ends & Orphaned Code:** Code paths, dead tabs, or deprecated components that cannot be tied to any active role or workflow must be flagged as **Technical Debt** or **Governance Divergence** rather than ignored.
3. **Indirect Route Verification:** Verify whether protected views can be reached via direct URL navigation, query string manipulation (e.g., `?tab=finance`), or browser history manipulation, bypassing the intended UI guard.
