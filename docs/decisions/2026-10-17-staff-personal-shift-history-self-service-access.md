# Formal Owner Decision: Staff Personal Shift History Access in Self-Service Profile

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)
> **Decision Identifier:** `OD-STF-01`
> **Status:** RATIFIED & ACTIVE
> **Ratified by:** Owner / Director (Kifry)
> **Date:** 2026-10-17
> **Ratification Basis:** Explicit owner approval in project conversation transcript on 2026-10-17
> **Implementation Target:** `src/features/auth/ProfilePanel.jsx`, `src/features/auth/PersonalAttendanceSection.jsx`

---

## 1. Context and Problem Statement

1. **Removal of Redundant Operational Reports Tab (`FP-OPS-11B` / Option A):**
   - Under ratified Option A for `FP-OPS-11B`, the redundant `FrontOfficeReportsTab` (Tab 10) was removed from the Operational Leader dashboard to eliminate role confusion, cashier drawer duplication, and unmaintained Courses-only inquiry metrics.
   - However, Sub-tab 3 of that removed reports tab previously provided staff members with a personal shift attendance log (`fetchUserShifts(currentUser.uid, 30)`).
   - Its removal temporarily left staff without a non-operational location to view their own recent shift attendance (clock-in, clock-out, and shift duration).

2. **Governance & Privacy Constraints:**
   - Operational dashboards (such as the Ops Lead or Front Office dashboards) should not mix personal staff attendance logs with supervisory business metrics.
   - Shift documents in Firestore (`/shifts/{shiftId}`) contain both general attendance fields (`clockIn`, `clockOut`, `stationId`, `punctualityStatus`) and sensitive cashier fields (`cashReconciliation`, `countedCash`, `expectedCash`, `drawerDiscrepancy`).
   - Personal attendance views must never expose cashier reconciliation details or allow one staff member to view another staff member's shifts.

---

## 2. Binding Decision & Owner Confirmation

> **Binding Owner Decision (2026-10-17):**
> *"I want staff to retain read-only access to their own shift history, outside the Ops Lead operational dashboard.*
> *- First inspect the existing shared staff profile or self-service UI and identify a suitable existing location.*
> *- If one exists, add an on-demand 'My Attendance' view there, scoped to the signed-in user only. Keep the query bounded, use the existing repository where appropriate, and display attendance details such as shift date and clock-in/out times. Do not expose another person’s shifts or show cashier reconciliation details in this view.*
> *- Do not restore the removed Operational Reports tab or place this feature in the Ops Lead operational dashboard.*
> *- If there is no suitable existing self-service location, do not invent a new route or restructure navigation. Finish the CSV-export workstream, then report the best placement option for my review before implementing the shift-history UI.*
> *Verify the applicable Firestore access path and tests. Change rules only if the current authorization prevents the approved self-only view; if rules need changing, trace callers and test both allowed self-access and denied access to other users’ shifts."*
> — Owner / Director (Kifry), 2026-10-17

---

## 3. Policy Specification

### 3.1 Self-Service Placement (`ProfilePanel.jsx`)
- The existing global shared staff profile modal (`src/features/auth/ProfilePanel.jsx`) serves as the approved self-service location for personal shift history.
- Accessible to all logged-in staff roles via the top-bar avatar button across desktop and mobile layouts.
- No new routes, navigation changes, or dashboard mounts are created.

### 3.2 On-Demand Data Fetching & Free Tier Protection
- Personal shift history is rendered as an on-demand, expandable section (`PersonalAttendanceSection.jsx`).
- The query does not execute upon opening the profile modal; it triggers only when the user explicitly expands the attendance accordion or clicks refresh.
- Queries are strictly bounded to 15 records (`fetchUserShifts(uid, 15)`) to minimize Firestore document reads on the Firebase Spark free tier.

### 3.3 Strict Self-Scoping & Firestore Security Rules
- The query is strictly scoped to the authenticated caller's own ID: `where("userId", "==", auth.currentUser.uid)`.
- Backend authorization is governed by existing Firestore rules (`firestore.rules:1419, 1422`):
  ```rules
  allow get: if ... || (signedIn() && resource.data.userId == request.auth.uid);
  allow list: if ... || (signedIn() && resource.data.userId == request.auth.uid);
  ```
  Verified by `attendanceAndShifts.emulator.test.js:438-448`: self-reads succeed, while cross-user shift reads are strictly denied. Zero rule modifications required.

### 3.4 Exclusion of Cashier Reconciliation & Financial Details
- **Network & Firestore Read Reality:**
  - Cloud Firestore Security Rules operate at the document level and do not support field-level read projection or masking.
  - Consequently, `fetchUserShifts(uid, 15)` returns full shift documents over the network to the browser client when authorized for self-read.
  - The personal attendance view simply does not display or render `cashReconciliation`, drawer count, cash balance, or discrepancy fields on screen, preventing on-screen leakage of cashier desk financial data.
- **Client-Side State Projection Boundary:**
  - Before storing retrieved shifts in component state, `PersonalAttendanceSection.jsx` projects each document through `projectAttendanceShift(shift)`, explicitly mapping only the attendance fields used by the view (`id`, `userId`, `clockIn`, `clockOut`, `stationId`, `punctualityStatus`) and discarding cashier reconciliation attributes from component state.
  - **Architectural Boundary Disclosure:** This projection is a client-side UI data-cleansing and presentation boundary, NOT backend field-level access protection. Staff members holding self-read access to their own shifts who inspect raw network responses or client memory could observe the cashier fields attached to their own shift documents.
- **Rendered Attendance Scope:**
  - The view renders:
    - Shift date (formatted in WITA / Asia/Makassar).
    - Clock-in time.
    - Clock-out time (or "Active Shift" badge if currently open).
    - Calculated duration (hours).
    - Station ID / punctuality status (if present).

---

## 4. Verification and Conformance

1. **Unit & Static Testing:** Verified via `src/features/auth/PersonalAttendanceSection.test.js` (7 tests passing):
   - Proves on-demand default collapsed state (no queries dispatched on initial render).
   - Proves `projectAttendanceShift` sanitizes raw shift documents by discarding cashier reconciliation fields (`cashReconciliation`, `drawerCount`, `reviewStatus`) before state storage.
   - Proves correct static rendering of attendance details in WITA (clock-in, clock-out, duration, station ID, active vs. completed status).
   - Proves negative assertion that cashier reconciliation data and numbers are strictly omitted from rendered output even if present in the source document.
   - Proves clean empty state rendering when zero records are returned.
   - Proves staff visibility: "My Attendance & Shifts" renders in `ProfilePanel.jsx` for all staff roles (`opslead`, `instructor`, `frontoffice`, `manager`).
   - Proves non-staff exclusion: "My Attendance & Shifts" is strictly omitted from `ProfilePanel.jsx` for student and parent roles.
2. **Browser Interaction Testing (Playwright Chromium):** Verified live in Chromium via `tests/staffAttendance.spec.ts` using a mock fetch function in the test harness:
   - Confirms the section starts collapsed by default (`aria-expanded="false"`, shift panel hidden, mock fetch call count = 0).
   - Confirms expanding the accordion triggers the mock fetch function on demand (mock fetch call count = 1), verifying the call passed `uid: "staff-ops-123"` and bounded limit `15`, while correctly rendering date, WITA in/out times, duration, and status badges.
   - Confirms cashier reconciliation fields are strictly omitted from the rendered DOM and display.
   - Confirms collapsing the accordion hides the panel without triggering any additional mock fetch (mock fetch call count remains 1).
   - Confirms reopening the accordion re-displays cached records immediately without dispatching any additional mock fetch (mock fetch call count remains 1).
   - Confirms switching to non-staff profiles (e.g. Student) strictly omits "My Attendance & Shifts".
3. **Typecheck & Regression:**
   - `npm run typecheck` passes with 0 errors.
   - 30 focused component and dashboard tests pass across `StudentRoster.export.test.js`, `OpsLeadDashboard.test.js`, `FrontOfficeReportsTab.test.js`, and `PersonalAttendanceSection.test.js`.
   - 8 Playwright browser tests pass across smoke, auth, PWA, and staff attendance suites.
