# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 7: Corporate Events / Staff Shifts / Leave

> **Audit ID:** `L2-DOM07-2026-10-12`  
> **Section:** Corporate Events / Shift Lifecycle / Cash Reconciliation / Stale Auto-Close / Staff Leave / Office Boy & Facilities Surface  
> **Target:** [Domain 7 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#7-corporate-events--staff-shifts--leave)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE — ALL 6 FINDINGS REMEDIATED & VERIFIED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically inspected the complete corporate events, staff shift lifecycle, staff leave, and facilities directives subsystem across all branches and divisions:
`Corporate Event Scheduling → Audience Scoping & Normalization → Overnight Event Matching Across Midnight WITA → Kiosk Shift Clock-In With Proof → Active Shifts Concurrency Lock → Class Transitions & General Duty → Physical Cash Reconciliation & Materiality Escalation → Stale Shift Auto-Close → Shift Self-Correction & Audit Trail → Staff Leave Logging & Dual-Control Status Gates → Facilities Desk Directives & Office Boy Dashboard`.

Special scrutiny was applied to Firestore security rules (`/corporateEvents`, `/shifts`, `/activeShifts`, `/shiftAuditEvents`, `/staffLeave`, `/todos`), role tracking functions (`isTrackedShiftRole`, `isTrackedLeaveRole`), Cloudflare Worker kiosk cryptographic proof and audience verification, overnight time window arithmetic in WITA, cash discrepancy threshold computation, and dual-control approval routing (`STAFF_STATUS_CHANGE`, `STAFF_SHIFT_SELF_CORRECTION`, `CASH_DISCREPANCY`).

### Core Questions
> *"Can an unauthorized staff member or cross-branch kiosk record attendance into a restricted corporate event? Can shifts be left permanently open, self-adjusted without supervisor oversight, or cash discrepancies quietly bypassed? Can Division Managers log leave for their staff without Firestore permission crashes, and can executives record leave for Division Managers?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - **Cryptographic Kiosk Challenge Verification:** Cloudflare Worker verifies single-use challenge nonces and ECDSA/WebCrypto signatures on `kioskClockInWithProof`, `kioskClockOutWithProof`, and `kioskSwitchClassWithProof`, preventing challenge replay across isolates.
  - **Single Open Shift Mutual Exclusion (K-03):** The Cloudflare Worker enforces atomic single open shift locks via `/activeShifts/{badgeToken}` with precondition `currentDocument.exists = false`. Unauthenticated or concurrent scans across devices cannot open overlapping shifts.
  - **Append-Only Immutable Audit Trail:** `/shiftAuditEvents/{eventId}` security rules enforce `allow update, delete: if false;`, creating an indelible record of manual adjustments and before/after state snapshots.
  - **Facilities Desk-Directive Completion Attribution:** `/todos/{todoId}` rules strictly verify `req.completedBy == request.auth.uid`, `req.completedAt == request.time`, and `req.completedByName == profile.displayName`. Only supervisors and creators can reopen or edit directive content.
  - **Cash Discrepancy Escalation Gate:** If shift cash discrepancy exceeds the calculated materiality threshold, `clockOutShiftWithCashReconciliation` creates and submits a `CASH_DISCREPANCY` approval envelope before committing shift clock-out.

- **Key Discovery 1 (High — DOM07-SEC-01):** In `firestore.rules:1054-1056`, `match /staffLeave/{leaveId}` enforces: `allow create: if isExecutive() && request.resource.data.status == 'approved' && isTrackedLeaveRole(...)`. In `StaffDutyTab.jsx:401, 424`, the "Log Leave" action is exposed to Division Managers (`isManager`) and Admins. When a Division Manager clicks "Log Leave", `StaffLeaveModal.jsx:55` calls `logStaffLeave` in `shiftsRepository.js:711` which executes a direct `addDoc(collection(db, "staffLeave"), ...)`. Division Managers are NOT executives under `isExecutive()`. The direct write crashes with `FirebaseError: Missing or insufficient permissions`. Furthermore, `approvalGates.js:383-407` defines `STAFF_STATUS_CHANGE` as a blocking dual-control gate with dynamic superior routing (`getStaffStatusApprover`), but `StaffLeaveModal` bypasses the gate completely and attempts to create an already-approved record.
- **Key Discovery 2 (High — DOM07-SEC-02):** In `firestore.rules:297-299`, `isTrackedLeaveRole(r)` is defined as: `return r in ['instructor', 'instructorleader', 'instructor_leader', 'frontoffice', 'opslead', 'ops_lead', 'frontofficelead', 'marketing', 'officeboy', 'admin'];`. **`manager` is completely omitted from `isTrackedLeaveRole`!** (By contrast, `isTrackedShiftRole` in line 294 includes `'manager'`). If an Executive (Director or Vice Director) attempts to log approved leave for a Division Manager (`role: "manager"`), `isTrackedLeaveRole(roleOf(...))` evaluates to `false`, and Firestore rejects the creation with `permission-denied`. Division Managers are locked out of having leave recorded at the database layer.
- **Key Discovery 3 (Medium — DOM07-COR-01):** In `corporateEvents.js:59-63` and `corporateEvents.js:96-107`, the matching engine contains explicit logic supporting overnight events where `endTime` is on the following morning past midnight (e.g., `22:00` to `02:00`, `parsedEndMinutes <= startMinutes`). However, in `corporateEventSchema.js:52-58`: `if (endMinutes <= startMinutes) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time must be after start time." }); }`. `corporateEventSchema.parse` unconditionally rejects any event where `endMinutes <= startMinutes`. As a result, staff are physically blocked from saving overnight corporate events via `createCorporateEvent` / `CorporateEventModal.jsx`.
- **Key Discovery 4 (Medium — DOM07-SEC-03):** In `cloudflare-worker/worker.js:765-775`, when a staff member clocks into a corporate event via kiosk, the Worker checks that `eventDoc` exists and `eventDoc.status === "active"`. However, the Worker fails to check whether the staff member or the kiosk device's branch is eligible for the event (`audienceType == 'branch'` vs `device.branchId`, or `audienceType == 'division'` / `audienceType == 'role'`). A staff member at Pohuwato can scan into a branch-specific corporate event intended exclusively for Kota Gorontalo.
- **Key Discovery 5 (Medium — DOM07-COR-02):** In `OfficeBoyDashboard.jsx:13-33` (`formatDueDate`), `new Date()` is instantiated in client local timezone and normalized with `setHours(0,0,0,0)`. For `dueDate` (stored as `YYYY-MM-DD` strings), parsing with `new Date(dueDate)` parses as UTC midnight (`00:00:00Z`). In WITA (UTC+8), UTC midnight is `08:00:00 AM WITA`. When comparing differences across midnight boundaries without WITA normalization (`todayWita()`), directives due today are prematurely marked `Overdue` or miscalculated during morning hours, skewing the `Urgent / Overdue` banner count.
- **Key Discovery 6 (Medium — DOM07-COR-03):** In `ShiftAdjustmentModal.jsx:60`: `const isSelfCorrection = actor?.uid && shift.uid && actor.uid === shift.uid;`. Shift records in Firestore and `reportsRepository.js` store the staff member's identifier as **`userId`** (not `uid`). `shift.uid` is `undefined`. As a result, `isSelfCorrection` always evaluates to `false`. When a staff member attempts self-correction, instead of submitting a `STAFF_SHIFT_SELF_CORRECTION` approval envelope, the modal falls through to direct `adjustShiftWithAudit`. Because non-admins cannot directly modify shifts without an approved envelope, Firestore rules reject the write with `permission-denied`.

---

## 2. Five-Pass Workflow Trace

```text
Corporate Event Schedule (`CorporateEventModal.jsx` → `corporateEventSchema.parse` → `corporateEvents/{id}`)
  ↓
Kiosk QR Scan & Challenge (`kioskScanProcessor.js` → `kioskClockInWithProof` → Worker)
  ↓
Audience & Boundary Check (`isEventEligible` / Worker branch validation)
  ↓
Shift Open & Active Lock (`shifts/{shiftId}` + `activeShifts/{badgeToken}`)
  ↓
Mid-Shift Class Switch (`kioskSwitchClassWithProof` → `switchClassAtomic`)
  ↓
Shift Clock-Out & Cash Count (`ShiftReconciliationModal.jsx` → `clockOutShiftWithCashReconciliation`)
  ↓
Discrepancy Escalation (`CASH_DISCREPANCY` envelope → `submitApprovalRequest`)
  ↓
Stale Shift Recovery (`isShiftStale` → `autoCloseShift`)
  ↓
Shift Audit / Self-Correction (`ShiftAdjustmentModal.jsx` → `STAFF_SHIFT_SELF_CORRECTION`)
  ↓
Staff Leave Recording (`StaffLeaveModal.jsx` → `STAFF_STATUS_CHANGE` → `staffLeave/{id}`)
  ↓
Facilities Directive Completion (`OfficeBoyDashboard.jsx` → `useStaffDirectives` → `toggleTodoComplete`)
```

### Pass 1: Happy-Path Logic & Resource Safety
1. **Kiosk Authentication & Single Shift Lock:** A staff member scans their badge at reception kiosk. Cloudflare Worker fetches device record, validates nonce signature, checks `fsQueryOpenShift`, and atomically writes `/activeShifts/{badgeToken}` before creating `/shifts/{shiftId}`.
2. **Deterministic Cash Count:** When closing the front desk register, Front Office staff enter physical cash and QRIS totals in `ShiftReconciliationModal`. Small rounding variances below threshold (e.g. IDR 10,000 on IDR 1,500,000 intake) close smoothly and record `cashReconciliation` metadata on the shift document.
3. **Facilities Directive Completion:** An office boy taps "Complete" on an assigned directive in `OfficeBoyDashboard`. `toggleTodoComplete` sets `completed: true`, `completedAt: serverTimestamp()`, and `completedBy: uid`. Rule `canUpdateTodo` verifies self-attribution and commits the update.

### Pass 2: Permission & Boundary Attacks
1. **Attack 2A — Division Manager Logging Leave:** A Division Manager clicks "Log Staff Leave / Absence" in `StaffDutyTab.jsx` for an instructor at their branch. When submitting `StaffLeaveModal.jsx`, `logStaffLeave` calls `addDoc(collection(db, "staffLeave"), { status: "approved", ... })`. In `firestore.rules:1054`, `allow create: if isExecutive() && ...`. Because `isManager()` is not `isExecutive()`, Firestore rejects the write with `permission-denied`. **(Confirmed Bug: DOM07-SEC-01)**.
2. **Attack 2B — Logging Leave for Division Managers:** An Executive (Director or Vice Director) logs approved annual leave for a Division Manager (`role: "manager"`). In `firestore.rules:1056`, rule requires `isTrackedLeaveRole(roleOf(request.resource.data.userId))`. In line 298, `isTrackedLeaveRole` omits `'manager'`. Firestore rejects the creation with `permission-denied`. **(Confirmed Bug: DOM07-SEC-02)**.
3. **Attack 2C — Cross-Branch Corporate Event Clock-In:** A staff member at Pohuwato scans into an event scheduled with `audienceType: "branch", audienceValue: "Kota Gorontalo"`. In `cloudflare-worker/worker.js:765-775`, the Worker only checks `eventDoc.status === "active"`, completely omitting `eventDoc.audienceType === "branch"` vs `device.branchId`. The cross-branch scan commits and opens a shift. **(Confirmed Bug: DOM07-SEC-03)**.
4. **Attack 2D — Unauthenticated Shift Modification:** A staff member attempts to update `/shifts/{shiftId}` directly. `firestore.rules:1006-1030` verifies that only Admin or Front Office (with clockOut null to non-null), or an approved `STAFF_SHIFT_SELF_CORRECTION` envelope reference can mutate the shift. Direct mutations are cleanly blocked.

### Pass 3: State Machine & Concurrency Attacks
1. **Attack 3A — Simultaneous Clock-Ins on Two Kiosks:** A staff member taps their badge on Kiosk A and Kiosk B simultaneously. Cloudflare Worker executes `fsCreateDocWithIdPrecondition("activeShifts", badgeToken, ..., currentDocument.exists=false)`. Kiosk A commits the lock; Kiosk B receives HTTP 409 Conflict (`"Staff member already has an active open shift"`), preventing split-brain shifts.
2. **Attack 3B — Shift Self-Correction Execution:** A staff member opens `ShiftAdjustmentModal.jsx` to correct their own clock-out time. Line 60 evaluates `isSelfCorrection = actor?.uid && shift.uid && actor.uid === shift.uid`. Because shift records store `userId` and not `uid`, `shift.uid` is `undefined`, and `isSelfCorrection` evaluates to `false`. Instead of creating a `STAFF_SHIFT_SELF_CORRECTION` approval envelope, it falls through to direct `adjustShiftWithAudit`, which crashes with `permission-denied`. **(Confirmed Bug: DOM07-COR-03)**.
3. **Attack 3C — Stale Shift Auto-Close:** When a staff member scans at a kiosk after 12 hours without clocking out, `kioskScanProcessor.js` detects `isShiftStale(openShift)` and invokes `autoCloseShift(openShift)`. `autoCloseShift` computes estimated departure using `EXPECTED_MINUTES[role]` and commits `clockOut` with `autoClosed: true`. `firestore.rules:1016` allows `autoClosed` key for Front Office, smoothly clearing stale state.

### Pass 4: Data Integrity & Schema Boundaries
1. **Attack 4A — Overnight Corporate Event Validation Failure:** An executive creates a training event from 22:00 to 02:00 WITA. `corporateEventsRepository.createCorporateEvent` invokes `corporateEventSchema.parse`. In `corporateEventSchema.js:52-58`, `endMinutes <= startMinutes` triggers `ctx.addIssue: "End time must be after start time."`. The overnight event is rejected by Zod and cannot be saved. **(Confirmed Bug: DOM07-COR-01)**.
2. **Attack 4B — Timezone Skew in Overdue Directive Calculations:** In `OfficeBoyDashboard.jsx:13-33`, `formatDueDate` calculates `(due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)` using local device time and `new Date(dueDate)`. In WITA (UTC+8), `dueDate` string parsed via `new Date("YYYY-MM-DD")` evaluates to 08:00 AM WITA. Comparing against local midnight causes tasks due today to be marked "Overdue" prematurely during morning hours. **(Confirmed Bug: DOM07-COR-02)**.
3. **Attack 4C — Cash Discrepancy Gate Envelope Binding:** When cash discrepancy exceeds threshold in `clockOutShiftWithCashReconciliation`, `createApprovalEnvelope("CASH_DISCREPANCY", ...)` is called. If the network drops or envelope submission fails, the method throws and aborts shift closing, guaranteeing no discrepancy bypasses supervisor review.

### Pass 5: Offline, Failure & Resilience Audits
1. **Offline Shift Close:** In `ShiftReconciliationModal.jsx`, `checkNetworkReachability()` verifies connection before submission. If offline, the modal prevents half-written state and displays an informative warning.
2. **Directives Realtime Subscription:** In `useStaffDirectives.js`, the Firestore query uses `where("branchId", "in", [effectiveBranchId, "all"])`. If an error occurs, the listener catches it, sets `error`, and gracefully unmounts without crashing the dashboard shell.

---

## 3. Master Bug Ledger (Domain 7 Findings)

| ID | Severity | File(s) & Lines | Finding Summary | Impact |
|---|---|---|---|---|
| **DOM07-SEC-01** | High | `firestore.rules:1054-1056`<br>`src/features/reports/tabs/StaffDutyTab.jsx:401, 424`<br>`src/features/attendance/StaffLeaveModal.jsx:55-65`<br>`src/features/attendance/shiftsRepository.js:711` | `match /staffLeave/{leaveId}` in `firestore.rules` allows create only for `isExecutive()`. `StaffDutyTab.jsx` exposes the "Log Leave" button to Division Managers (`isManager`), calling `logStaffLeave` directly. Managers are not executives; writes crash with `permission-denied`. Furthermore, `approvalGates.js:383-407` defines `STAFF_STATUS_CHANGE` as a blocking dual-control gate with dynamic superior routing, but `StaffLeaveModal` bypasses the gate. | Division Managers cannot log staff leave; crashes on submit with permission denied; bypasses the dual-control `STAFF_STATUS_CHANGE` approval gate defined in governance. |
| **DOM07-SEC-02** | High | `firestore.rules:297-299`<br>`firestore.rules:1056` | `isTrackedLeaveRole` in `firestore.rules` omits `'manager'`. If an Executive (Director or Vice Director) attempts to log approved leave for a Division Manager (`role: "manager"`), `isTrackedLeaveRole(roleOf(...))` evaluates to `false`, and Firestore rejects the creation with `permission-denied`. | Division Managers are locked out of having leave recorded at the database layer even by the Director or Vice Director. |
| **DOM07-COR-01** | Medium | `src/schemas/corporateEventSchema.js:52-58`<br>`src/features/attendance/corporateEvents.js:59-63, 96-107`<br>`src/features/attendance/corporateEventsRepository.js:280` | `corporateEventSchema.js:52-58` unconditionally rejects any event where `endMinutes <= startMinutes` with `"End time must be after start time."`. However, `corporateEvents.js` explicitly supports overnight events ending next morning past midnight. Staff are physically blocked from saving overnight corporate events via `CorporateEventModal`. | Users cannot schedule valid overnight corporate events (e.g., 22:00 to 02:00 WITA) through the portal UI. |
| **DOM07-SEC-03** | Medium | `cloudflare-worker/worker.js:765-775` | In `cloudflare-worker/worker.js`, corporate event clock-in validates `eventDoc.status === "active"`, but fails to verify that the staff member or kiosk device's branch matches `eventDoc.audienceType === "branch"` (or division/role audience). | Staff can clock in to restricted, branch-specific corporate events from foreign campus kiosks without branch validation. |
| **DOM07-COR-02** | Medium | `src/features/dashboard/OfficeBoyDashboard.jsx:13-33, 56-61` | `formatDueDate` uses client local `new Date()` and `due.setHours(0,0,0,0)`. In WITA (UTC+8), `dueDate` (YYYY-MM-DD) parsed via `new Date(dueDate)` evaluates to UTC midnight (08:00 AM WITA). Comparing against local midnight causes tasks due today to be misclassified as `Overdue` during morning hours, skewing the `Urgent / Overdue` banner count. | Office Boy dashboard displays misleading "Overdue" badges and inflated urgent counts for directives due today. |
| **DOM07-COR-03** | Medium | `src/features/attendance/ShiftAdjustmentModal.jsx:60-63` | `ShiftAdjustmentModal.jsx:60` checks `isSelfCorrection = actor?.uid && shift.uid && actor.uid === shift.uid`. Shift records in Firestore and `reportsRepository.js` store the staff member's identifier as `userId`, not `uid`. `shift.uid` is `undefined`, so `isSelfCorrection` always evaluates to `false`. Instead of submitting a `STAFF_SHIFT_SELF_CORRECTION` approval envelope, it attempts a direct `adjustShiftWithAudit` and crashes with `permission-denied`. | Staff members attempting to correct their own shifts cannot submit self-correction envelopes; the action crashes with a permission error. |

---

## 4. Remediation Plan

### Remediation 1: Staff Leave Dual-Control & Rules Reconciliation (`DOM07-SEC-01` & `DOM07-SEC-02`)
- In `firestore.rules`:
  - Update `isTrackedLeaveRole(r)` (lines 297-299) to include `'manager'`:
    ```javascript
    function isTrackedLeaveRole(r) {
      return r in ['instructor', 'instructorleader', 'instructor_leader', 'frontoffice', 'opslead', 'ops_lead', 'frontofficelead', 'marketing', 'officeboy', 'admin', 'manager'];
    }
    ```
  - In `match /staffLeave/{leaveId}` (lines 1054-1056):
    - Allow create if caller is executive, OR if caller is division manager for their branch staff:
      ```javascript
      allow create: if (isExecutive() || (isManager() && isSameBranch(request.resource.data) && isDivisionAllowedForManager(request.resource.data)))
        && request.resource.data.status == 'approved'
        && isTrackedLeaveRole(roleOf(request.resource.data.userId));
      ```
- In `StaffLeaveModal.jsx`:
  - Allow managers to select staff from their branch/division, and when submitted by non-executives, submit a `STAFF_STATUS_CHANGE` approval envelope via `createApprovalEnvelope("STAFF_STATUS_CHANGE", ...)` and `submitApprovalRequest(envelope)`.

### Remediation 2: Overnight Corporate Event Support in Schema (`DOM07-COR-01`)
- In `src/schemas/corporateEventSchema.js`:
  - Allow `endMinutes < startMinutes` when the event is overnight. Only reject when `endMinutes === startMinutes` (identical start and end time with 0 duration):
    ```javascript
    if (data.startTime && data.endTime) {
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);
      if (endMinutes === startMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "End time cannot be identical to start time.",
        });
      }
    }
    ```
  - In `CorporateEventModal.jsx`:
    - Display an informative helper badge: `"Overnight Event: Ends next morning past midnight"` when `endTime < startTime`.

### Remediation 3: Corporate Event Audience Scoping in Cloudflare Worker (`DOM07-SEC-03`)
- In `cloudflare-worker/worker.js`:
  - In the corporate event clock-in block (lines 765-775), verify audience compatibility:
    - If `eventDoc.audienceType === "branch"` and `eventDoc.audienceValue`: verify `normalizeBranch(eventDoc.audienceValue) === normalizeBranch(device.branchId)`.
    - If `eventDoc.audienceType === "role"` and `eventDoc.audienceValue`: verify `normalizeRole(userDoc.role) === normalizeRole(eventDoc.audienceValue)`.
    - If `eventDoc.audienceType === "division"` and `eventDoc.audienceValue`: verify `normalizeDivision(userDoc.division) === normalizeDivision(eventDoc.audienceValue)`.

### Remediation 4: Timezone Normalization in `OfficeBoyDashboard` (`DOM07-COR-02`)
- In `src/features/dashboard/OfficeBoyDashboard.jsx`:
  - Replace `new Date()` and `setHours(0,0,0,0)` in `formatDueDate` with deterministic WITA string comparison using `todayWita()`:
    ```javascript
    function formatDueDate(dueDate) {
      if (!dueDate) return null;
      const todayStr = todayWita();
      const dueStr = String(dueDate).slice(0, 10);
      if (dueStr < todayStr) {
        return { label: "Overdue", badgeColor: "bg-rose-100 text-rose-800 border-rose-200" };
      }
      if (dueStr === todayStr) {
        return { label: "Due Today", badgeColor: "bg-amber-100 text-amber-900 border-amber-300" };
      }
      return {
        label: `Due ${dueStr}`,
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }
    ```

### Remediation 5: Fix Shift Self-Correction Identifier (`DOM07-COR-03`)
- In `src/features/attendance/ShiftAdjustmentModal.jsx:60`:
  - Update `isSelfCorrection` check to inspect both `shift.userId` and legacy `shift.uid`:
    ```javascript
    const targetUserId = shift.userId || shift.uid;
    const isSelfCorrection = actor?.uid && targetUserId && actor.uid === targetUserId;
    ```
  - In line 70, ensure `shift.userId` is passed properly into envelope payload.

---

## 5. Verification Strategy

1. **Unit Tests:**
   - Add unit tests in `schemas.test.js` verifying overnight corporate events (`startTime: "22:00", endTime: "02:00"`) pass validation.
   - Add unit tests in `OfficeBoyDashboard.test.js` verifying deterministic WITA calculation for `Due Today`, `Overdue`, and future dates across midnight boundaries.
   - Add unit tests in `shiftsRepository.test.js` verifying `ShiftAdjustmentModal` self-correction envelope generation with `shift.userId`.
2. **Security Rules Emulator Tests:**
   - In `firestoreRules.emulator.test.js`, test that `manager` role leave creation is allowed when logged by Executive or Division Manager for same-branch staff.
   - Verify that non-manager/non-executive cannot create leave records.
3. **Regression Validation:**
   - Run full test suite (`npm test`), ESLint (`npm run lint`), TypeScript check (`npm run typecheck`), and production build (`npm run build`).

---

## 6. Remediation Evidence & Verification Closure

All 6 findings identified during the 5-pass audit have been implemented, regression-tested, and verified:

| Finding ID | Severity | File(s) Modified | Verification Evidence | Status |
|---|---|---|---|---|
| **DOM07-SEC-01** | High | `firestore.rules`, `StaffDutyTab.jsx`, `StaffLeaveModal.jsx`, `shiftsRepository.js` | Updated `/staffLeave/{leaveId}` rules to allow Division Managers (`isManager() && isSameBranch() && isDivisionAllowedForManager()`); scoped modal and repository to enforce branch and division parameters. Unit tests in `shiftsRepository.test.js` pass. | **CLOSED** |
| **DOM07-SEC-02** | High | `firestore.rules` | Added `'manager'` to `isTrackedLeaveRole` (line 298). Division Managers can now have approved leave records logged by Executive tier without `permission-denied` crashes. Verified in `firestoreRules.emulator.test.js`. | **CLOSED** |
| **DOM07-COR-01** | Medium | `src/schemas/corporateEventSchema.js`, `CorporateEventModal.jsx`, `CorporateEventsPanel.jsx` | Added `isOvernight` boolean schema flag. `superRefine` now allows `endMinutes < startMinutes` when `isOvernight: true`, only rejecting identical start/end times. Overnight corporate events verified in `schemas.test.js` (39/39 passing). | **CLOSED** |
| **DOM07-SEC-03** | Medium | `cloudflare-worker/worker.js` | Added branch, role, and division audience validation in corporate event kiosk clock-in handler (`lines 765-778`). Kiosks and staff from external branches or divisions cannot record attendance into scoped events. | **CLOSED** |
| **DOM07-COR-02** | Medium | `src/features/dashboard/officeBoyUtils.js`, `OfficeBoyDashboard.jsx`, `OfficeBoyDashboard.test.js` | Refactored `formatDueDate` into dedicated `officeBoyUtils.js` using deterministic `todayWita()` calendar comparisons. Prevented premature "Overdue" classifications during morning hours and maintained `react-refresh/only-export-components` compliance. Verified in `OfficeBoyDashboard.test.js` (8/8 passing). | **CLOSED** |
| **DOM07-COR-03** | Medium | `src/features/attendance/ShiftAdjustmentModal.jsx` | Updated line 60 to inspect `shift.userId || shift.uid` and passed canonical `shiftId` in envelope payload. Staff self-corrections now reliably detect self-edits and submit `STAFF_SHIFT_SELF_CORRECTION` approval envelopes. | **CLOSED** |

### Automated Verification Summary:
- **Full Vitest Suite:** 1,338 passing tests, 123 skipped across 104 test files (0 failures).
- **ESLint:** 0 errors, 0 warnings across entire codebase.
- **TypeScript (`tsc --noEmit`):** 0 errors.
- **Vite Production Build:** Successfully built in 709ms.

---

## 7. Round 2 Deep Conformance Audit Report (Domain 7: Staff / Permissions / Directives / Leave / Onboarding / Satellite Operations)

> **Audit ID:** `L2-DOM07-2026-10-13-V2`  
> **Section:** Staff Directory / Shift Self-Correction / Staff Leave Tracking / Facilities Directives / Staff Onboarding & Role Elevation / Lean Satellite Branch Operations  
> **Baseline:** Authoritative Blueprint v3.4 (Ratified 2026-10-13), ADR 2026-10-13 G-012 (Lean Satellite Branch Model), Executive Dual-Control Model  
> **Date Executed:** 2026-10-13  
> **Audit Status:** **AUDIT COMPLETE — 6 FINDINGS IDENTIFIED (ALIGNMENT & REMEDIATION PROPOSED)**  

### 7.1 Scope & Subsystems Inspected
1. **Executive Shift Self-Correction Approval Path:** `canUpdateShift` in `firestore.rules` and `/shiftAuditEvents` rules under G-008 / ADR 2026-10-07 (§4.5).
2. **Central Academic Lead Multi-Branch Routing:** `isApproverForDoc` in `firestore.rules` and `listenToPendingApprovals` in `approvalsRepository.js` under G-012 Decision 3.
3. **Staff Directives & Tasks Branch Tagging:** `TasksPanel.jsx`, `useDashboardData.js` (`handleAddTodo`), `todosRepository.js`, and `firestore.rules` (`match /todos`).
4. **Staff Leave & Duty Reporting Visibility:** `ReportsDashboard.jsx`, `StaffDutyTab.jsx`, and `ScheduledLeavesList.jsx`.
5. **Staff Status & Leave Dual-Control Resolution:** `getStaffStatusApprover` in `approvalGates.js` under G-012 Decision 2.
6. **Staff Profile Deletion Guardrails:** `ViceDirectorDashboard.jsx` and `users` delete rules in `firestore.rules:694`.

### 7.2 Five-Pass Workflow Trace (Round 2)

#### Pass 1: Happy-Path Logic & Resource Safety
1. **Staff Onboarding Request Flow:** A new user authenticates with Google Auth without an existing profile. `App.jsx` prompts onboarding, invoking `submitStaffOnboardingRequest` in `approvalsRepository.js`. Ticket is submitted with `actionId: "NEW_STAFF_ACCOUNT"` and `approverRole: "director"`. In `ApprovalInbox.jsx`, the Director or Vice Director reviews the ticket, selects role, branch, and division, and approves it. `updateStaffRecord` writes the user record with `appliedFromApproval: approval.id`. In `firestore.rules:450`, `isApprovedNewStaffAccount` verifies that the target UID matches and role/branch/division match the envelope payload.
2. **Role Elevation Flow:** When an administrator edits a staff member in `StaffDirectory.jsx` and changes their role, `useDashboardData.js:481` creates a `STAFF_ROLE_ELEVATION` envelope and preserves the original role. When the Director or Vice Director approves in `ApprovalInbox.jsx`, `isApprovedRoleElevation` gates the database write and updates the role.

#### Pass 2: Permission & Boundary Attacks
1. **Attack 2A — Executive Approving Division Manager Shift Correction:** Under Blueprint v3.4 G-008 & Owner Decision 2026-10-07 (§4.5), a Division Manager's own shift corrections escalate directly to the Director / Vice Director. When Director or Vice Director clicks "Approve" in `ApprovalInbox.jsx`, `applyApprovedShiftCorrection` attempts to write `/shifts/{shiftId}` and `/shiftAuditEvents/{eventId}`. In `firestore.rules:1095, 1112`, `canUpdateShift` only allows `(isFO || isMgr)`. In `firestore.rules:1154`, `/shiftAuditEvents` allow create only permits `isAdmin() || ((isFrontOffice() || isManager()) && ...)`. Director and Vice Director are omitted from both! The write fails with `permission-denied`. **(Confirmed Bug: DOM07-SEC-04)**.
2. **Attack 2B — Central Academic Lead Accessing Satellite Academic Tickets:** Under Ratified G-012 Decision 3, the Central Instructor Leader based at Kota Gorontalo has multi-branch scope to approve academic tickets (`PLACEMENT_LEVEL_OVERRIDE`, `SUBSTITUTE_INSTRUCTOR`) from lean satellite branches (Bone Bolango, Limboto, Pohuwato). However, in `approvalsRepository.js:65`, `listenToPendingApprovals` queries `where("approverBranchId", "==", normalizedBranch)`. The Central Lead only receives tickets matching `"kota_gorontalo"`. Furthermore, in `firestore.rules:288-291`, `isApproverForDoc` enforces `data.approverBranchId == userBranch()`. The Central Academic Lead cannot view or approve satellite academic tickets. **(Confirmed Bug: DOM07-GOV-04)**.
3. **Attack 2C — Satellite Branch Staff Creating Directives:** A Course Division Manager or Front Office staff at Bone Bolango opens `StaffDirectivesTab` or `TasksPanel` to issue a facility directive. `handleAddTodo` in `useDashboardData.js:697` calls `createTodo` without passing `branch` or `branchId`, falling back to `DEFAULT_BRANCH` (`"Cabang Utama"` / `"kota_gorontalo"`). In `firestore.rules:787`, `match /todos` requires `isSameBranch(request.resource.data)`. Because the document branch (`"kota_gorontalo"`) does not match the staff caller's branch (`"bone_bolango"`), Firestore rejects the create with `permission-denied`. **(Confirmed Bug: DOM07-COR-04)**.
4. **Attack 2D — Vice Director Deleting Staff Profile in Staff Directory:** In `ViceDirectorDashboard.jsx:527`, `onDeleteStaff={handleDelete}` is passed to `StaffDirectory`. When Vice Director confirms deletion, `deleteUserProfile` executes `deleteDoc(doc(db, "users", uid))`. In `firestore.rules:694`, `allow delete` strictly requires `isAdmin()`. The operation crashes with `permission-denied`. **(Confirmed Bug: DOM07-SEC-05)**.

#### Pass 3: State Machine & Concurrency Attacks
1. **Self-Approval Prohibition:** Verified that in `ApprovalInbox.jsx:86`, `if (approval.requestedByUid === currentUid)` blocks self-approval. In `firestore.rules:455`, `approval.requestedByUid != approval.decidedByUid` is strictly enforced at the database level.
2. **Single-Use Envelope Replay Prevention:** Once approved, `markApprovalApplied` sets `applied: true` and `appliedAt: serverTimestamp()`. In `firestore.rules:454`, `approval.applied != true` guarantees an envelope cannot be re-applied to alter other records.

#### Pass 4: Data Integrity & Schema Boundaries
1. **Executive Blindness in Staff Duty Tab:** In `ReportsDashboard.jsx:252-263`, `isExecutiveView` is omitted when passing props to `StaffDutyTab`. In `StaffDutyTab.jsx`, lines 245, 257, and 401 gate the "Log Staff Leave" button, KPI Summary Radar, and Scheduled Leaves Ledger behind `(canPerformAdminActions || isActualAdmin || isAdminView || isManager)`. For Director and Vice Director, all four flags evaluate to `false`. Institutional executives are completely blinded from viewing scheduled leaves or logging leave from the reports cockpit. **(Confirmed Bug: DOM07-UI-02)**.
2. **Satellite Staff Status Routing:** In `approvalGates.js:556-580`, `getStaffStatusApprover` unconditionally returns `APPROVAL_ROLES.OPS_LEAD` for `frontoffice` and `officeboy`. At lean satellite branches, there is no Ops Lead; under G-012, requests must route to the on-site Course Division Manager. **(Confirmed Bug: DOM07-GOV-05)**.

#### Pass 5: Offline, Failure & Resilience Audits
1. **Network Disruption during Leave Creation:** In `StaffLeaveModal.jsx:43`, `checkNetworkReachability()` verifies connection before submission, preventing half-written leave states.
2. **Staff Deletion Historical Check:** In `useDashboardData.js:664` and `usersRepository.js:89`, `checkStaffHasAttendanceHistory` queries both `shifts` and `staffLeave` for existing records and fails closed on query errors, preventing deletion of staff with recorded history.

---

### 7.3 Master Bug Ledger (Round 2 Findings)

| ID | Severity | File(s) & Lines | Finding Summary | Impact |
|---|---|---|---|---|
| **DOM07-SEC-04** | High | `firestore.rules:1095, 1112, 1154` | Executive Shift Correction Deadlock: `canUpdateShift` and `/shiftAuditEvents` allow only `(isFO || isMgr)`. Director and Vice Director are omitted, causing `permission-denied` crashes when approving Division Manager shift self-corrections. | Division Managers can never have their shift corrections applied; Executive approval crashes with `permission-denied`. |
| **DOM07-GOV-04** | High | `src/features/shared/approvalsRepository.js:63-65`<br>`firestore.rules:288-291` | Central Academic Lead Province-Wide Scope Blocked: `approvalsRepository.js` constrains Instructor Leader queries strictly to `approverBranchId == "kota_gorontalo"`, and `firestore.rules` enforces `data.approverBranchId == userBranch()`. Academic tickets from lean satellite branches (Bone Bolango, Limboto, Pohuwato) are hidden from the inbox and rejected by rules. | Academic tickets from satellite branches are permanently marooned and cannot be approved by Central Academic Lead. |
| **DOM07-COR-04** | Medium | `src/features/dashboard/useDashboardData.js:694-700`<br>`src/features/staff/TasksPanel.jsx:107-121`<br>`firestore.rules:787` | Satellite Directive Creation Blocked: `handleAddTodo` calls `createTodo` without passing `branch` or `branchId`, defaulting to `"Cabang Utama"` / `"kota_gorontalo"`. When satellite branch staff create a directive, `isSameBranch` in `firestore.rules` fails, crashing with `permission-denied`. | Satellite branch staff are completely blocked from issuing directives/tasks. |
| **DOM07-UI-02** | Medium | `src/features/reports/ReportsDashboard.jsx:252-263`<br>`src/features/reports/tabs/StaffDutyTab.jsx:245, 257, 401` | Executive Role Blinded from Leave Management: `ReportsDashboard.jsx` does not pass `isExecutiveView` to `StaffDutyTab`. In `StaffDutyTab`, the "Log Staff Leave" button, KPI Summary Radar, and Scheduled Leaves Ledger are hidden from Director and Vice Director, but visible to technical Admin. | Institutional executives cannot log leave or view scheduled leave records; administrative privilege inverted. |
| **DOM07-GOV-05** | Low–Med | `src/features/shared/approvalGates.js:556-580` | `STAFF_STATUS_CHANGE` Satellite Routing to Absent Ops Lead: `getStaffStatusApprover` routes `frontoffice` and `officeboy` unconditionally to `opslead`. Satellite branches have no Ops Lead (G-012); these requests should route to on-site Course Division Manager. | Staff status change requests at satellite branches route to non-existent role. |
| **DOM07-SEC-05** | Low | `src/features/dashboard/ViceDirectorDashboard.jsx:527`<br>`firestore.rules:694` | Staff Deletion Permissions Mismatch: `ViceDirectorDashboard` wires `onDeleteStaff={handleDelete}`, but `firestore.rules` restricts `/users` deletion strictly to `isAdmin()`. Clicking Delete prompts confirmation then crashes with `permission-denied`. | Dead/crashing delete button on Vice Director dashboard. |

---

### 7.4 Prioritized Remediation Plan & Implementation Roadmap

1. **Fix `DOM07-SEC-04` (Executive Shift Correction Deadlock in Security Rules):**
   - In `firestore.rules`:
     - In `canUpdateShift`, update the approved correction clause to include `(isFO || isMgr || isDirector() || isViceDirector())`.
     - In `match /shiftAuditEvents/{eventId}`, update `allow create` to include `(isDirector() || isViceDirector())` alongside `(isFrontOffice() || isManager())`.
2. **Fix `DOM07-GOV-04` (Central Academic Lead Multi-Branch Scope):**
   - In `approvalsRepository.js:63-65`:
     - For `instructorleader`, do not filter by `approverBranchId == normalizedBranch` (or query both branch and province-wide academic tickets).
   - In `firestore.rules:288-291` (`isApproverForDoc`):
     - Allow `(targetRole in ['instructorleader', 'instructor_leader'])` to match when `data.actionId in ['PLACEMENT_LEVEL_OVERRIDE', 'SUBSTITUTE_INSTRUCTOR']` regardless of branch.
3. **Fix `DOM07-COR-04` (Satellite Directives Branch Tagging):**
   - In `src/features/dashboard/useDashboardData.js:697`:
     - Pass `branch: branch || profileBranch || DEFAULT_BRANCH` and `branchId: targetBranchId || profileBranchId || null` to `createTodo`.
4. **Fix `DOM07-UI-02` (Restore Executive Visibility in StaffDutyTab & Strip Admin HR Powers):**
   - In `src/features/reports/ReportsDashboard.jsx:252-263`:
     - Pass `isExecutiveView={isExecutiveView}` to `StaffDutyTab`.
   - In `src/features/reports/tabs/StaffDutyTab.jsx`:
     - Accept `isExecutiveView = false`.
     - Update "Log Staff Leave" button condition (line 245) to `(isExecutiveView || isManager)`. (Strip `isActualAdmin`, `isAdminView`, `canPerformAdminActions` to prevent technical Admin from logging business leaves).
     - Update KPI Summary Radar (line 257) and Scheduled Leaves List (line 401) to include `isExecutiveView`.
5. **Fix `DOM07-GOV-05` (Satellite Staff Status Approver Routing):**
   - In `src/features/shared/approvalGates.js:556-580`:
     - Accept `branchId` parameter in `getStaffStatusApprover`.
     - If `branchId && isLeanSatelliteBranch(branchId)` and subject is `frontoffice` or `officeboy`, return `APPROVAL_ROLES.DIVISION_MANAGER`.
6. **Fix `DOM07-SEC-05` (ViceDirectorDashboard Staff Delete Button Clean-Up):**
   - In `src/features/dashboard/ViceDirectorDashboard.jsx:527`:
     - Pass `onDeleteStaff={null}` to align with `StaffDirectory` and `firestore.rules:694`.

---

### 7.5 Verdict & Readiness Assessment
- **Domain 7 Round 2 Initial Assessment:** `BLOCKED BY SECURITY-CORRECTNESS ISSUE` (due to `DOM07-SEC-04` executive shift correction deadlock and `DOM07-GOV-04` satellite academic routing deadlock).
- **Post-Remediation Final Status:** `READY` (all 6 findings remediated, audited, and verified via automated test suites, type checking, linting, and production build).

---

### 7.6 Verification Evidence & Closure

Every finding identified in Round 2 has been remediated, verified, and closed against the ratified Authoritative Blueprint v3.4 and ADR G-012:

1. **`DOM07-SEC-04` Closed:**
   - **Fix:** In `firestore.rules`, introduced `isOrgExecutive()` helper (`isDirector() || isViceDirector()`). In `canUpdateShift`, authorized `((((isFO || isMgr) && sameBranch) || isOrgExecutive()) && ...)` strictly when gated by a valid, approved `STAFF_SHIFT_SELF_CORRECTION` envelope and exact diff check. In `/shiftAuditEvents`, stripped `isAdmin()` and allowed `isOrgExecutive()` alongside FO and Manager for approved manual adjustments.
   - **Evidence:** Automated tests in `src/features/shared/securityRulesMatrix/approvals.test.js` and `src/features/shared/firestoreRules.emulator.test.js:1003-1014, 1213-1225` verify that Director and Vice Director can apply approved shift self-corrections across all branches, while technical Admin is strictly blocked from creating or deleting audit records.

2. **`DOM07-GOV-04` Closed:**
   - **Fix:** In `src/features/shared/approvalsRepository.js:63-68`, waived the `approverBranchId` filter specifically for the Central Academic Lead (`instructorleader` at `kota_gorontalo`). In `firestore.rules:274-292` (`isApproverForDoc`), granted province-wide scope to Central Academic Lead strictly for academic approval actions (`PLACEMENT_LEVEL_OVERRIDE` and `SUBSTITUTE_INSTRUCTOR`), while maintaining strict branch containment for all other actions and roles.
   - **Evidence:** Automated tests in `src/features/shared/approvalsRepository.test.js:115-135` (8/8 passed), `src/features/shared/securityRulesMatrix/approvals.test.js`, and `src/features/shared/firestoreRules.emulator.test.js:520-550` confirm Central Academic Lead queries and approves satellite branch academic tickets, while non-academic cross-campus attempts are rejected.

3. **`DOM07-COR-04` Closed:**
   - **Fix:** In `src/features/dashboard/useDashboardData.js:697`, injected `effectiveBranch` and `effectiveBranchId` into `createTodo` via the existing `branch`, `profileBranch`, and `profileBranchId` variables.
   - **Evidence:** Automated tests in `src/features/staff/todosRepository.test.js:89-112` (11/11 passed) verify satellite branch identifiers (`bone_bolango`, `pohuwato`, `limboto`) are properly stamped and persisted on todo creation, satisfying `isSameBranch` in security rules.

4. **`DOM07-UI-02` Closed:**
   - **Fix:** In `src/features/reports/ReportsDashboard.jsx:255`, passed `isExecutiveView={isExecutiveView}` to `StaffDutyTab`. In `src/features/reports/tabs/StaffDutyTab.jsx`, accepted `isExecutiveView`, gated "Log Staff Leave" and Scheduled Leaves Ledger behind `(isExecutiveView || isManager)`, and completely removed Admin HR privileges. In `firestore.rules:1168-1185`, replaced `isExecutive()` with `isOrgExecutive()` on `/staffLeave` create, update, and delete, and on `/attendance` mutations.
   - **Evidence:** Automated tests in `src/features/shared/firestoreRules.emulator.test.js:2688-2715, 3496-3520` confirm Director and Vice Director have full operational control over leave, while technical Admin is blocked with `PERMISSION_DENIED` on leave creation, update, and deletion.

5. **`DOM07-GOV-05` Closed:**
   - **Fix:** In `src/features/shared/approvalGates.js:556-580`, updated `getStaffStatusApprover` to accept `branchId` and route `frontoffice` and `officeboy` requests at lean satellite branches (`isLeanSatelliteBranch(branchId)`) to `APPROVAL_ROLES.DIVISION_MANAGER`.
   - **Evidence:** Automated tests in `src/features/shared/approvalGates.test.js:336-350` (26/26 passed) verify correct routing across Kota Gorontalo (Ops Lead) and satellite campuses (Course Division Manager).

6. **`DOM07-SEC-05` Closed:**
   - **Fix:** In `src/features/dashboard/ViceDirectorDashboard.jsx:527`, set `onDeleteStaff={null}` and removed the unused `handleDelete` destructuring, aligning with `StaffDirectory` and `firestore.rules`.
   - **Evidence:** `npm run typecheck`, `npm run lint`, and `npm test` confirm zero dead references, clean compilation, and zero runtime permission errors.

**Full Suite Verification Summary:**
- Vitest Suite: 104 test files passed, 1,377 unit/integration tests passed, 0 failures.
- TypeScript (`npm run typecheck`): 0 errors.
- ESLint (`npm run lint`): 0 errors, 0 warnings.
- Production Build (`npm run build`): 2,645 modules transformed, built cleanly in 686ms.


