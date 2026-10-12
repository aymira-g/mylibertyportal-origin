# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 3: Attendance + Kiosk

> **Audit ID:** `L2-DOM03-2026-10-12`  
> **Section:** Attendance / Kiosk / Shift Management / Cryptographic Verification  
> **Target:** [Domain 3 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#3-attendance--kiosk)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE & ALL 4 FINDINGS REMEDIATED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically evaluated the end-to-end attendance and kiosk lifecycle:
`Scanner → QR validation → Identity, role, branch, class/event resolution → Shift state → Clock-in/out → Class switching → Student attendance → Duplicate handling → Manual correction → Worker → Firestore → Rules → Reports`.

Special scrutiny was applied to hardware constraints (camera stream unmount, autofocus, wake lock, offline reachability), cryptographic challenge-response replay resistance, multi-scan concurrency, overnight corporate event boundaries, manual attendance precedence, and reporting query isolation.

### Core Question
> *"Can a user, device, or camera stream forge, overwrite, duplicate, or bypass attendance or shift state across branches, roles, or offline transitions without an authoritative audit trail?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - **Cryptographic Device Proof:** Kiosk clock-in operations use non-exportable ECDSA P-256 Web Crypto keypairs stored in browser IndexedDB. Every clock-in challenge requires an ephemeral single-use nonce consumed atomically in Firestore via Cloudflare Worker (`/api/v1/kiosk/challenge`), preventing replay attacks.
  - **Server-Authoritative Identity:** The Worker derives employee identity directly from the scanned badge credential (`users/{badgeToken}`) and enforces branch matching (`user.branchId === device.branchId`). Client-supplied user IDs or roles are never trusted.
  - **Single Open Shift Invariant:** Worker enforces atomic lock acquisition in `activeShifts/{badgeToken}` with version preconditions (`fsCreateDocWithIdPrecondition`) and commits shift creation + lock promotion in an atomic batch (`fsCommitWrites`), preventing double clock-in races.
  - **Class Attendance Deterministic IDs & Transaction Safety:** Class attendance uses deterministic IDs `{classId}_{studentId}_{attendanceDate}`. New scans check existence inside a Firestore `runTransaction`. Existing records are never overwritten by scans.
  - **Manual Correction Precedence:** Firestore security rules (`firestore.rules:852-862`) strictly permit updates only when `request.resource.data.method == 'MANUAL'`. A barcode scan cannot overwrite an existing manual mark (e.g. EXCUSED or ABSENT).
  - **Hardware Wake Lock:** Standalone kiosk tablets maintain an active Screen Wake Lock (`navigator.wakeLock.request('screen')`) re-acquired on `visibilitychange`.
  - **Network Fail-Closed:** Before initiating attendance mutations, scanners verify reachability via `checkNetworkReachability()` and fail closed if offline.

- **Remediated Findings:**
  - **DOM03-SEC-01 (High — CLOSED):** In `cloudflare-worker/worker.js:1048-1055`, added strict branch boundary check `if (shift.branchId && shift.branchId !== device.branchId) return json({ error: "This shift belongs to a different branch." }, 403, request, env);`. Unit test added in `kioskHardening.test.js` (Section 13).
  - **DOM03-SEC-02 (High — CLOSED):** In `src/features/reports/reportsRepository.js:94-160`, non-executive queries on `/attendance` in `fetchTodayScansData` and `fetchStudentProgressData` strictly enforce caller's authorized branch ID, returning empty dataset safely if no branch can be resolved rather than emitting illegal unscoped queries. Unit tests added in `reportsRepository.test.js`.
  - **DOM03-COR-01 (Medium — CLOSED):** In `src/features/attendance/corporateEventsRepository.js:56-126`, `fetchActiveCorporateEventsForDate` queries both today and yesterday during early morning WITA hours (< 06:00 WITA), allowing overnight events spanning past midnight to be properly resolved by `isEventEligible`. Verified in `corporateEventsRepository.test.js`.
  - **DOM03-PERF-01 (Medium — CLOSED):** In `src/features/attendance/InstructorAttendanceView.jsx:214-275`, added `isProcessingRef` and `lastScannedRef` guards to `scanner.render`, dropping concurrent frames during in-flight transactions and debouncing identical badge scans for 2.5s. Verified in `kioskHardening.test.js` (Section 14).

---

## 2. Five-Pass Workflow Trace

```text
Camera / Hardware (Html5QrcodeScanner / IndexedDB P-256)
  ↓
Kiosk Scan Processor (`handleKioskScan` / Role / Branch / Status Check)
  ↓
Challenge & Signature Verification (`/api/v1/kiosk/challenge` → ECDSA sign)
  ↓
Worker Authoritative Processing (`/api/v1/shift/clock-in`, `clock-out`, `class-switch`)
  ↓
Firestore Write & Rules Evaluation (`/shifts`, `/classAttendance`, `/attendance`)
  ↓
Dashboards, Attendance Boards & Reports (`TodayTab`, `InstructorAttendanceView`)
```

### Pass 1: Internal Logic & Resource Safety
1. **Camera Stream Lifecycle:** `KioskCameraView.jsx` and `useKioskScanner.js` properly invoke `scanner.clear()` on unmount and on successful scan. `InstructorAttendanceView.jsx` properly clears the scanner ref on modal close.
2. **Screen Wake Lock:** `StandaloneKioskPage.jsx` acquires a screen wake lock and re-acquires it on document visibility transitions.
3. **Unbounded Attendance Scans:** `fetchTodayScansData` bounds `/attendance` by `sinceWitaIso` (start of today). `fetchClassAttendance` bounds records by `classId` and `attendanceDate`.
4. **Subscription Cleanup:** Real-time listeners in `InstructorAttendanceView.jsx` and `CorporateEventsPanel.jsx` return proper unsubscribe closures that execute on unmount.

### Pass 2: Trust Boundary Analysis
1. **Cryptographic Proof Custody:** Device private keys are generated with `extractable: false` via Web Crypto and stored in IndexedDB. Private keys cannot be extracted via script or DevTools.
2. **Server-Authoritative Clock:** The Worker applies server timestamps (`new Date().toISOString()`) for shift creation and closing, preventing client device clock manipulation.
3. **Identity Derivation:** The Worker derives the employee identity and branch directly from Firestore using the scanned token. The client cannot spoof employee identity or role.
4. **Branch Boundary Leakage:** Resolved via **DOM03-SEC-01** fix in `worker.js`.

### Pass 3: Failure, Edge & Attack Matrix

| Attack / Vector | Scenario | Defense Mechanism | Verdict |
|---|---|---|---|
| **Challenge Replay** | Attacker replays captured clock-in payload with valid signature | Worker atomically consumes nonce via `fsConsumeKioskChallenge`; replay fails with 401 | **PASS** |
| **Expired Challenge** | Attacker intercepts challenge and holds payload > 60 seconds | Worker rejects challenge timestamp > 60,000ms with 401 | **PASS** |
| **Cross-Branch Clock-In** | Staff member scans badge at another branch's tablet | Worker rejects: `user.branchId !== device.branchId` (HTTP 403) | **PASS** |
| **Cross-Branch Clock-Out**| Staff member scans badge at another branch to clock out | Worker rejects: `shift.branchId !== device.branchId` (HTTP 403) | **PASS (REMEDIATED)** |
| **Rapid Double Tap (Staff)**| Staff member taps scan twice within 500ms | Atomic lock in `activeShifts` rejects second scan with 409 | **PASS** |
| **Rapid Continuous Scan (Class)**| Student holds badge in camera view for 2 seconds | Scanner in-flight lock drops concurrent frames; 2.5s debounce | **PASS (REMEDIATED)** |
| **Manual Scan Overwrite** | Student scans badge after instructor manually marked them ABSENT | `recordClassAttendanceScan` detects existing record; rules block non-MANUAL update | **PASS** |
| **Retroactive Student Backfill** | Client attempts to mark attendance for past calendar date | Firestore rule `OD-IL-ENF3` rejects backfill without approved approval envelope | **PASS** |
| **Deactivated Staff Badge** | Terminated or resigned employee scans badge at kiosk | Worker checks `user.status !== "active"` and rejects with 403 | **PASS** |
| **Overnight Event Post-Midnight**| Staff clocks in at 00:30 for event starting at 22:00 yesterday | Multi-day query in repo returns yesterday's event during midnight window | **PASS (REMEDIATED)** |
| **Today Report List (Manager)** | Manager opens Today's Attendance Tab with `branchFilter = "all"` | Non-executives resolve caller branch; unassigned branch returns empty array | **PASS (REMEDIATED)** |
| **Network Disconnect Mid-Scan**| Tablet loses Wi-Fi before scan payload sent | `checkNetworkReachability()` fails closed; mutation does not queue | **PASS** |

### Pass 4: Cross-Feature Handoffs
1. **Kiosk Shifts → Cashier Reconciliation:** When Front Office staff clocks out via their dashboard cockpit, `clockOutShiftWithCashReconciliation` attaches cash reconciliation data and maker-checker gates.
2. **Kiosk Shifts → Staff Duty Reports:** `StaffDutyTab` and `fetchStaffShifts` ingest closed and active shifts with bounded date windows.
3. **Class Attendance → Parent Portal:** `parentPortalRepository` queries `/classAttendance` scoped by `studentId` and date range, permitted by Firestore rules (`isParentOf`).

### Pass 5: Runtime Proof & Evidence
- **Vitest Attendance Test Suite:** 10 test files passed (185 tests) in `src/features/attendance/`.
- **Kiosk Hardening Tests:** 24 tests passed in `kioskHardening.test.js` validating nonce expiration, replay rejection, active shifts lock promotion, cross-branch clock-out rejection, and continuous scanner debounce.
- **Corporate Events Tests:** 11 tests passed in `corporateEventsRepository.test.js` verifying post-midnight overnight boundary resolution.
- **Reports Repository Tests:** 20 tests passed in `reportsRepository.test.js` validating strict branch resolution on attendance queries.
- **Full Test Suite:** 1,304 passed, 122 skipped, 0 failed across 102 test suites.

---

## 3. Master Bug Ledger (Domain 3 Findings)

### Finding 1: DOM03-SEC-01
- **Section / Workflow:** Cloudflare Worker Kiosk Terminal (`cloudflare-worker/worker.js:1040-1065`, `handleShiftClockOut`).
- **Trigger:** A staff member scans their badge at a kiosk terminal provisioned for a different branch to clock out (e.g. employee clocked in at Kota Gorontalo, scans badge at a Bone Bolango tablet).
- **Actual:** `handleShiftClockOut` checked `shift.userId === badgeToken` and verified signature, but omitted verifying `shift.branchId === device.branchId`.
- **Expected:** `handleShiftClockOut` must verify that `shift.branchId === device.branchId`, rejecting cross-branch clock-outs with HTTP 403.
- **Status:** **CLOSED (REMEDIATED)** in `cloudflare-worker/worker.js` and `kioskHardening.test.js`.

### Finding 2: DOM03-SEC-02
- **Section / Workflow:** Reports / Today's Scans (`src/features/reports/reportsRepository.js:94-135`, `TodayTab.jsx`).
- **Trigger:** A Division Manager, Supervisor, or Front Office staff member views `TodayTab` (Today's Attendance / Scans report) when `branchFilter = "all"` or when `branchId` is omitted.
- **Actual:** `fetchTodayScansData` constructed an unscoped Firestore list query on `/attendance` without a `where("branchId", "==", ...)` constraint.
- **Expected:** For non-executive callers, `fetchTodayScansData` in `reportsRepository.js` must resolve the caller's authorized branch ID and enforce it on all `/attendance` queries.
- **Status:** **CLOSED (REMEDIATED)** in `src/features/reports/reportsRepository.js` and `reportsRepository.test.js`.

### Finding 3: DOM03-COR-01
- **Section / Workflow:** Corporate Events / Kiosk Matching (`src/features/attendance/corporateEventsRepository.js:56-96`, `corporateEvents.js:110-117`).
- **Trigger:** A corporate event spans overnight past midnight (e.g., eventDate = yesterday `2026-10-11`, scheduled from `22:00` to `02:00`). A staff member or student scans their badge at the kiosk at `00:30` on today (`2026-10-12`).
- **Actual:** `fetchActiveCorporateEventsForDate` queried only today's date, starving the overnight logic in `corporateEvents.js:110-117`.
- **Expected:** Query both today and yesterday during post-midnight early morning WITA hours.
- **Status:** **CLOSED (REMEDIATED)** in `src/features/attendance/corporateEventsRepository.js` and `corporateEventsRepository.test.js`.

### Finding 4: DOM03-PERF-01
- **Section / Workflow:** Classroom Attendance Scanner (`src/features/attendance/InstructorAttendanceView.jsx:233-270`).
- **Trigger:** An instructor opens the camera scanner in a classroom, and a student holds their QR badge in the camera's view for 1–2 seconds.
- **Actual:** `html5-qrcode` executed its `render` callback at 10 frames per second without debouncing or in-flight lock, firing 15–20 concurrent calls.
- **Expected:** In-flight processing lock (`isProcessingRef`) and 2.5-second debounce for identical badge tokens.
- **Status:** **CLOSED (REMEDIATED)** in `src/features/attendance/InstructorAttendanceView.jsx` and `kioskHardening.test.js`.

---

## 4. Remediation Verification Evidence

All 4 fixes are verified through automated test suites, type checking, linting, and production builds:

1. **DOM03-SEC-01 (Worker Clock-out Branch Validation):**
   - Verified via `node --check cloudflare-worker/worker.js` (clean).
   - Unit test in `src/features/attendance/kioskHardening.test.js` (Section 13) confirms cross-branch clock-out is rejected with 403: `This shift belongs to a different branch.`.
2. **DOM03-SEC-02 (Reports Scoped Attendance Queries):**
   - Verified via `src/features/reports/reportsRepository.test.js` (20/20 passed), confirming non-executive queries return empty arrays safely when no branch can be resolved, avoiding `permission-denied` runtime crashes.
3. **DOM03-COR-01 (Multi-Day Corporate Events Retrieval):**
   - Verified via `src/features/attendance/corporateEventsRepository.test.js` (11/11 passed), confirming post-midnight queries fetch yesterday's active events while daytime queries isolate today's events.
4. **DOM03-PERF-01 (Classroom Scanner Guard & Debounce):**
   - Verified via `src/features/attendance/kioskHardening.test.js` (Section 14), confirming concurrent camera frame collisions are dropped during transaction in-flight, and redundant badge frames within 2.5 seconds are debounced.
5. **System Health Verification:**
   - Vitest: **1,304 passed**, 122 skipped, 0 failed across 102 test files.
   - Lint: `npm run lint` clean (0 errors, 0 warnings).
   - Types: `npm run typecheck` clean (0 errors).
   - Build: `npm run build` completed in 656ms without errors.
