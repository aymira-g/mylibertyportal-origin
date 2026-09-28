# Corporate Events & Kiosk Clock-In Investigation Report

- **Date:** 2026-09-28
- **Context:** Instructor Leader unable to clock in for an evening corporate event (07:00 / 19:00 WITA)
- **Status:** Investigation and Analysis Report

---

## 1. Initial Bug Investigation & Fix Summary

### Problem
An Instructor Leader scanned their QR badge at the Reception Kiosk Station to attend an evening corporate event scheduled for 07:00 (19:00 WITA). The Kiosk rejected the scan with the error `"No Class Scheduled"` and blocked clock-in completely.

### Root Causes Identified & Resolved
1. **Un-normalized Role Comparison:**
   - In `corporateEvents.js`, `isEventEligible` performed an exact string equality check: `user.role === (audienceValue || "").toLowerCase()`.
   - When an event targeted `"instructor"` (the default in `CorporateEventsPanel.jsx`), an Instructor Leader (`user.role: "instructorleader"` or legacy `"instructor_leader"`) failed equality (`"instructorleader" === "instructor"` was `false`).
   - Even if targeted specifically to `"instructorleader"`, legacy aliases like `"instructor_leader"` failed due to lack of role normalization.
   - **Resolution:** Imported `normalizeRole`, `isInstructorRole`, and `isFrontOfficeRole`. When an event targets `"instructor"`, all teaching staff (`isInstructorRole(userRole)`) are now eligible. When targeting `"frontoffice"`, all front-office staff (`isFrontOfficeRole(userRole)`) are eligible.

2. **Branch Matching Slug Resolution:**
   - `isEventEligible` only evaluated `user.branch`, returning `false` if the user document only stored `branchId` (e.g., `"kota_gorontalo"`).
   - In `branches.js`, `normalizeBranch` lacked the `BRANCH_MAP` slug lookup, failing to resolve `"kota_gorontalo"` to canonical `"Kota Gorontalo"`.
   - **Resolution:** Added `user.branch || user.branchId` to `isEventEligible` and integrated `BRANCH_MAP` into `normalizeBranch`.

3. **Ambiguity Handling for Instructors:**
   - When multiple events were active on the same date, `findMatchingCorporateEvents` flagged `ambiguous: true` and returned `match: null`.
   - For instructors with zero regular classes, `kioskScanProcessor.js` saw `!matchedEvent` and immediately showed `"No Class Scheduled"`.
   - **Resolution:** If multiple events match today, the Kiosk now opens `KioskClockInModal` listing all matching events so the instructor can choose which event they are attending.

---

## 2. Item (1): Two-Events Handling for Non-Instructor Staff & Student Path

### A. Non-Instructor Staff (Manager, Front Office, Marketing, Office Boy, Admin)
- **Current Behavior:**
  - In `kioskScanProcessor.js` (lines 350–417), non-instructor staff logic checks `if (matchedEvent)`.
  - When more than one event matches on the date (`findMatchingCorporateEvents` returns `ambiguous: true`, `match: null`), the processor falls through to the `else` block.
  - **Result:** Staff are silently clocked into `"General Duty"` (`classId: "general"`). They are given no indication that corporate events are happening today, nor are they given a choice to select their event.
- **Proposed Solution:**
  1. In `kioskScanProcessor.js`, check `if (matchedEvents.length > 1)` before the default clock-in.
  2. Prompt the staff member using `setPendingClockIn`:
     ```javascript
     return setPendingClockIn({
       uid,
       userData,
       classes: [],
       matchedEvents,
       allowGeneralDuty: true,
     });
     ```
  3. In `KioskClockInModal.jsx`, display each matching corporate event option **plus** a clear `"General Administrative Duty"` option.
  4. If only 1 event matches, auto-clock into that event. If 0 events match, auto-clock into General Duty as before.

### B. Student Path
- **Current Behavior:**
  - In `kioskScanProcessor.js` (lines 219–248), student scanning checks `activeEvents`.
  - When multiple events match on the date, `matchedEvent` is `null`.
  - Attendance is recorded via `recordStudentAttendance` with `eventId: null` and `eventName: null`.
  - **Result:** The student is recorded as attending standard academy day rather than an event, and the success toast omits the event name.
- **Proposed Solution:**
  - **Option 1 (Interactive Selection Modal):**
    - If `matchedEvents.length > 1`, set a pending student event state or trigger an event picker modal before writing attendance to Firestore.
    - *Best for:* Supervised front-desk scanning where staff can assist students.
  - **Option 2 (Deterministic First Event + Multi-Event Audit Array):**
    - Automatically associate attendance with the nearest upcoming event by start time, and record an array field `matchingEventIds: [evt1.id, evt2.id]` on the attendance record.
    - *Best for:* Rapid tap-and-go kiosk lines where popping up a modal for every student would cause queue bottlenecks.

---

## 3. Item (2): Audit of `head_instructor` & `branch_manager` Roles & Strategy

### Codebase Audit
1. **Usage in Repository:**
   - In `src/features/shared/roles.js`, both roles exist solely in `LEGACY_ROLE_ALIASES`:
     - `head_instructor` &rarr; `instructorleader`
     - `branch_manager` &rarr; `manager`
   - In `src/features/dashboard/InstructorDashboard.jsx` (line 55), `effectiveRole === "head_instructor"` is checked as an alias.
   - In `devPresets.js`, neither role is present in `MODE_1_TEST_ACCOUNTS` (canonical `instructorleader` and `manager` are used).
2. **Critical Security Rules Finding (`firestore.rules`):**
   - In `firestore.rules`, `'head_instructor'` and `'branch_manager'` are **completely absent**.
   - `isStaff()` only permits:
     `['admin', 'manager', 'instructor', 'instructorleader', 'instructor_leader', 'marketing', 'frontoffice', 'opslead', 'ops_lead', 'frontofficelead', 'officeboy']`
   - `isManager()` only permits:
     `hasRole('manager')`
   - `isTrackedShiftRole()` only permits:
     `['instructor', 'instructorleader', 'instructor_leader', ...]`
   - **Impact:** If any live user document in Firestore has `role: "head_instructor"` or `role: "branch_manager"`, Firestore Security Rules will reject their shift creation, document access, and approval actions as unauthorized.

### Strategy Comparison: Role Migration vs. Security Rules Update

| Dimension | Option A: One-Time Role Migration (Recommended) | Option B: Security Rules Update |
| :--- | :--- | :--- |
| **Description** | Run a script / console update to patch existing Firestore user docs from `head_instructor` &rarr; `instructorleader` and `branch_manager` &rarr; `manager`. | Add `'head_instructor'` and `'branch_manager'` into `firestore.rules` (`isStaff`, `isManager`, `isApproverForDoc`, `isTrackedShiftRole`). |
| **Pros** | • Permanently eliminates legacy role drift at the database source.<br>• Keeps `firestore.rules` lean, strict, and minimal.<br>• Zero ongoing edge-case handling across queries, filters, and reports.<br>• Zero risk of client-side role check mismatch. | • Does not require modifying existing Firestore user documents.<br>• Provides immediate rule coverage if legacy documents exist in production. |
| **Cons** | • Requires running a one-time migration or manually verifying user records in Firebase Console. | • Permanently enshrines deprecated role strings into security rules.<br>• Increases security rules bytecode and complexity.<br>• Leaves stale data in the database that can break future queries or reports. |

---

## 4. Item (3): Halting `createShift` when Chosen Event is Not Found

### Current Behavior
In `useKioskScanner.js`:
```javascript
const isEvent = selectedClassId.startsWith("corporate_event:");
const eventId = isEvent ? selectedClassId.replace("corporate_event:", "") : null;
const event = isEvent
  ? eventsList.find((e) => e.id === eventId) || pendingClockIn.matchedEvent
  : null;
const selectedClass = isEvent
  ? null
  : pendingClockIn.classes?.find((cls) => cls.id === selectedClassId);

if (!isEvent && !selectedClass) return;
if (isEvent && !event) return;
```
If an event was selected from the dropdown, but it cannot be found in the active events list, fallback logic (`|| pendingClockIn.matchedEvent`) could accidentally clock the user into the wrong event, or silently fail.

### Proposed Fix
When `selectedClassId.startsWith("corporate_event:")`:
1. Search `eventsList` strictly for `eventId` (no fallback to default `matchedEvent`).
2. If `!event`, halt execution immediately and surface an error:
   ```javascript
   if (isEvent) {
     if (!event) {
       showStatus(
         "Event Unavailable",
         "error",
         "The selected corporate event is no longer available or has expired.",
         pendingClockIn.userData.displayName
       );
       return;
     }
     // Proceed with event clock-in
   }
   ```

---

## 5. Item (4): Pros and Cons of Enforcing Event Start Time

Below are the operational and technical arguments for and against enforcing event `startTime` (without deciding):

### Pros of Enforcing Start Time
1. **Accurate Timesheets & Shift Boundaries:** Prevents staff from clocking into an evening event (e.g. 19:00 WITA) at 09:00 AM, avoiding inflated 10+ hour shift durations on event records.
2. **Prevents Daytime Shift Collision:** Ensures an instructor teaching daytime classes does not accidentally clock into an evening event instead of their afternoon class.
3. **Punctuality Metric Integration:** Enables calculating `punctualityStatus` (Early, On Time, Late) against the event's `startTime` rather than defaulting to `Present` with 0 minutes.

### Cons of Enforcing Start Time
1. **Preparation & Event Setup Lockout:** Organizers, tech setup crews, and instructor leaders routinely arrive 30 to 90 minutes early to arrange the room, setup audio, and prep materials. Strict start-time enforcement would lock them out.
2. **Device Clock Skew & Network Jitter:** If client tablets or phones have a 2–3 minute clock difference from the server, staff arriving right at the cutoff could be falsely rejected.
3. **Reception Line Bottlenecks:** A rigid window (e.g., "only 15 minutes before start") means dozens of staff and students arriving together at minute 16 will trigger error screens, causing confusion and requiring front-desk overrides.

---

## 6. Item (5): Full Test Output

```text
> myliberty-portal@0.0.0 test
> vitest run


 RUN  v5.0.1 E:/myliberty-portal

 ✓ src/features/finance/receiptMessages.test.js (25 tests) 35ms
 ✓ src/features/shared/tabUtils.test.js (22 tests) 13ms
 ✓ src/features/attendance/classAttendanceRepository.test.js (11 tests) 18ms
 ✓ src/features/shared/MobileDashboardShell.test.js (3 tests) 23ms
 ✓ src/features/dashboard/marketing/schoolOutreachRepository.test.js (21 tests) 52ms
 ✓ src/schemas/schemas.test.js (36 tests) 42ms
 ✓ src/features/attendance/punctuality.test.js (39 tests) 34ms
stderr | src/features/attendance/shiftsRepository.test.js > Cash Reconciliation on Shift Clock-Out > refuses to close the shift when the escalation cannot be submitted
Failed to submit cash discrepancy approval request: Error: permission-denied
    at Object.__vi_import_0__.fake.failWhen (E:/myliberty-portal/src/features/attendance/shiftsRepository.test.js:429:42)
    at record (E:/myliberty-portal/src/test/firestoreFake.js:56:30)
    at E:/myliberty-portal/src/test/firestoreFake.js:150:12
    at Mock (file:///E:/myliberty-portal/node_modules/vitest/dist/chunks/spy.DQ0ZsPbi.js:320:40)
    at submitApprovalRequest (E:/myliberty-portal/src/features/shared/approvalsRepository.js:36:24)
    at Module.clockOutShiftWithCashReconciliation (E:/myliberty-portal/src/features/attendance/shiftsRepository.js:315:15)
    at E:/myliberty-portal/src/features/attendance/shiftsRepository.test.js:432:7
    at file:///E:/myliberty-portal/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:1628:35
    at file:///E:/myliberty-portal/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:2783:26
    at file:///E:/myliberty-portal/node_modules/vitest/dist/chunks/run.C5UmxDPh.js:3319:20

 ✓ src/features/attendance/shiftsRepository.test.js (27 tests) 39ms
 ✓ src/features/students/admissionsUtils.test.js (35 tests) 31ms
 ✓ src/features/auth/LoginPage.test.js (3 tests) 38ms
 ✓ src/features/students/applicationsRepository.test.js (17 tests) 32ms
 ✓ src/features/dashboard/frontoffice/deskInquiriesRepository.test.js (7 tests) 36ms
 ✓ src/features/dashboard/manager/managerUtils.test.js (6 tests) 37ms
 ✓ src/features/reports/reportsRepository.test.js (8 tests) 29ms
 ✓ src/features/dashboard/usersRepository.test.js (23 tests) 30ms
 ✓ src/features/staff/staffUtils.test.js (16 tests) 25ms
 ✓ src/utils/reportError.test.js (7 tests) 25ms
 ✓ src/features/classes/classesRepository.test.js (24 tests) 27ms
 ✓ src/features/students/StudentParentLinkage.test.js (4 tests) 26ms
 ✓ src/features/staff/invitesRepository.test.js (6 tests) 23ms
 ✓ src/features/students/parentPortalRepository.test.js (8 tests) 22ms
 ✓ src/features/shared/DashboardShell.test.js (2 tests) 49ms
 ✓ src/features/auth/devPresets.test.js (17 tests) 17ms
 ✓ src/features/attendance/kioskHardening.test.js (7 tests) 24ms
 ✓ src/features/finance/paymentsRepository.test.js (11 tests) 26ms
 ✓ src/features/classes/scheduleConflict.test.js (39 tests) 19ms
 ✓ src/constants/paymentPlans.test.js (34 tests) 22ms
 ✓ src/features/dashboard/frontoffice/TuitionDueWidget.test.js (6 tests) 21ms
 ✓ src/features/shared/securityRulesMatrix.test.js (59 tests) 21ms
 ✓ src/features/classes/batchAvailability.test.js (23 tests) 13ms
 ✓ src/schemas/classAttendanceSchema.test.js (6 tests) 15ms
 ✓ src/features/attendance/shiftStatus.test.js (12 tests) 13ms
 ✓ src/features/classes/classesUtils.test.js (14 tests) 17ms
 ✓ src/features/shared/DevQuickSwitcher.test.js (3 tests) 19ms
 ✓ src/features/shared/PrimaryActionButton.test.js (2 tests) 18ms
 ✓ src/utils/dateWita.test.js (37 tests) 11ms
 ✓ src/constants/programs.test.js (20 tests) 13ms
 ✓ src/schemas/deskInquirySchema.test.js (8 tests) 24ms
 ✓ src/features/students/studentRecord.test.js (14 tests) 15ms
 ✓ src/features/shared/useUserProfile.test.js (1 test) 12ms
 ✓ src/features/attendance/corporateEventsRepository.test.js (5 tests) 13ms
 ✓ src/features/shared/roles.test.js (14 tests) 12ms
 ✓ src/features/shared/csvExport.test.js (7 tests) 12ms
 ✓ src/features/attendance/corporateEvents.test.js (22 tests) 15ms
 ✓ src/features/dashboard/OfficeBoyDashboard.test.js (1 test) 43ms
 ✓ src/features/staff/todosRepository.test.js (8 tests) 10ms
 ✓ src/utils/networkReachability.test.js (5 tests) 9ms
 ✓ src/features/dashboard/manager/outreachTrackerUtils.test.js (12 tests) 9ms
 ✓ src/constants/levels.test.js (13 tests) 10ms
 ✓ src/features/students/StudentRosterTable.test.js (4 tests) 33ms
 ✓ src/constants/divisions.test.js (12 tests) 9ms
 ✓ src/constants/scheduleDays.test.js (12 tests) 8ms
 ✓ src/features/students/UserForm.test.js (6 tests) 86ms
 ✓ src/constants/batchTypes.test.js (12 tests) 9ms
 ✓ src/features/attendance/classResolution.test.js (11 tests) 9ms
 ✓ src/features/dashboard/frontoffice/WalkInInquiryTab.test.js (7 tests) 8ms
 ✓ src/features/attendance/shiftAutoClose.test.js (4 tests) 9ms
 ✓ src/features/shared/approvalGates.test.js (6 tests) 8ms
 ✓ src/features/dashboard/branchAuditRepository.test.js (5 tests) 8ms
 ✓ src/features/reports/atRisk.test.js (15 tests) 7ms
 ✓ src/features/pwa/PwaUpdateBanner.test.js (1 test) 10ms
 ✓ src/utils/urlAction.test.js (4 tests) 9ms
 ✓ src/features/shared/approvalsRepository.test.js (4 tests) 8ms
 ✓ src/constants/branches.test.js (10 tests) 8ms
 ✓ src/features/dashboard/logRetentionRepository.test.js (4 tests) 7ms
 ✓ src/features/finance/financeUtils.test.js (4 tests) 5ms
 ✓ src/features/shared/useOverlayHistory.test.js (2 tests) 5ms
 ✓ src/features/dashboard/useInstructorRoster.test.js (5 tests) 6ms
 ✓ src/constants/contact.test.js (5 tests) 5ms
 ↓ src/features/shared/firestoreRules.emulator.test.js (46 tests | 46 skipped)
 ✓ src/features/students/ParentPortalPage.test.js (1 test) 15ms
 ✓ src/features/students/ParentsList.test.js (5 tests) 19ms
 ✓ src/features/dashboard/ParentDashboard.test.js (1 test) 12ms
 ✓ src/features/attendance/kioskScanProcessor.test.js (9 tests) 8ms

 Test Files  73 passed | 1 skipped (74)
      Tests  899 passed | 46 skipped (945)
   Start at  19:00:51
   Duration  5.18s (import 78%, transform 16%, tests 5%, worker 2%)

    Isolate  74 workers spawned · ~199ms startup each (spawn + environment, per file)
             at least ~1.14s faster with isolate: false — reuses workers across files instead of one per file
```
