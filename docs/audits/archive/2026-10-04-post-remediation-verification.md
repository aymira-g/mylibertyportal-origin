# MYLIBERTY Portal — Post-Remediation Verification Audit

> **Audit Type:** Independent Post-Remediation Security & Architecture Verification  
> **Date:** 2026-10-04 (WITA) / 2026-10-03 (Local)  
> **Repository:** `aymira-git/mylibertyportal-origin`  
> **Status:** Verification Complete — Do Not Remediate Yet  
> **Governing Standards:** [`AGENTS.md`](../../../AGENTS.md), [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md), [`Light Regression Check Playbook`](../../audits/Light%20Regression%20Check%20Playbook/00-README.md)

---

## 1. Current Repository State

- **Branch / Working Tree:** Clean, production-ready.
- **Node & Test Tooling:** Node 20+, Vitest 5.0.2, Firebase Rules Unit Testing 5.0.2 with Firestore Emulator v1.22.0, OpenJDK 21 headless, ESLint 10.9.0, TypeScript 7.0.2 (`tsc --noEmit`), Vite 8.2.2.
- **Dependencies:** All dependencies resolved and synchronized.

---

## 2. Verification Scope

Comprehensive inspection and regression verification covering:
1. Centralized role normalization (`roles.js`)
2. Staff division normalization (`divisions.js`)
3. Branch normalization and data isolation (`branches.js`)
4. Firestore branch authorization (`firestore.rules`)
5. Firestore division authorization (`firestore.rules`)
6. Front Office self-profile and student/parent authorization
7. Kindergarten staff/user query behavior (`useDashboardData.js`, `KidsManagerDashboard.jsx`)
8. Server-authoritative kiosk clock-in (`shiftsRepository.js`, `cloudflare-worker/worker.js`)
9. Server-authoritative kiosk clock-out
10. Server-authoritative class switching
11. Branch-preserving kiosk operations
12. Corporate-event validation and multi-event selection
13. Deterministic student attendance identity
14. Single-open-shift protection and lock recovery
15. Challenge/nonce consumption and replay protection
16. Kiosk status timer race protection

---

## 3. Previously Remediated Findings Reconciled

| Finding ID | Domain | Summary | Current Status | Evidence / Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **INT-001** | Attendance | Domain boundary between Class Attendance and Kiosk/Shift Attendance | `FIXED / VERIFIED` | Clarified architecture, distinct Firestore collections (`classAttendance` vs `shifts` vs `attendance`). |
| **INT-002** | Directives | Directives queried unfiltered `todos` collection | `FIXED / VERIFIED` | `useDashboardData.js` scopes query with `where("branchId", "in", [targetBranchId, "all"])`. Emulator test INT-002 passes. |
| **INT-003** | Directives | Academy-wide todos supported by rules but not by UI/model | `FIXED / VERIFIED` | `todosRepository.js` and `todos` rules support `branchId == 'all'`. |
| **INT-004** | Auth / Kiosk | Front Office scanning staff badges was blocked by rules from reading staff user profiles | `FIXED / VERIFIED` | `firestore.rules` L259 allows Front Office to `get` same-branch staff profiles. Emulator test INT-004 passes. |
| **INT-005** | Roles | `instructorleader` handled inconsistently in UI | `FIXED / VERIFIED` | Centralized `normalizeRole`, `isInstructorRole` in `roles.js` used everywhere. |
| **INT-006** | Operations | Staff leave records did not sync to user status | `FIXED / VERIFIED` | `logStaffLeave` sets `status: "on_leave"` in `users/{uid}`, kiosk alerts and UI badges reflect leave. |
| **INT-007** | Students | Hard delete of students leaves orphan records | `STILL OPEN` | Documented limitation: deletion is admin-only; orphan history docs remain unless manually cleaned up. |
| **INT-008** | Attendance | Shift close-out marked inactive/graduated students absent | `FIXED / VERIFIED` | `shiftAutoClose.js` filters inactive and graduated students. |
| **INT-009** | Corporate Events | Corporate event update did not preserve branch boundary | `FIXED / VERIFIED` | `firestore.rules` L451 enforces `isSameBranch(resource.data)` on update/delete. Emulator test INT-009 passes. |
| **INT-010** | Finance | Payment idempotency key generated per submission | `FIXED / VERIFIED` | Key derived deterministically from student, payment period, and amount. |
| **INT-011** | Inquiries | Walk-in inquiry reached enrolled without student record linkage | `FIXED / VERIFIED` | `markInquiryConverted` links `inquiryId` with `studentId`. |
| **INT-013** | Reports | Progress reports had mismatched reader permissions | `FIXED / VERIFIED` | Rules enforce `isSameBranchStrict` and `isDivisionAllowedForManager`. Emulator test INT-013 passes. |
| **INT-014** | Timezone | UTC truncation used instead of WITA | `FIXED / VERIFIED` | `todayWita()` and `dateWita.js` used consistently across all modules. |
| **INT-015** | Kiosk | General Duty fallback asymmetric when multiple events active | `STILL OPEN` | Non-instructor staff scanning when multiple events exist defaults to General Duty unless event picker is provided. |
| **INT-017** | Parents | Parent dashboard query shape could trigger rule rejection | `FIXED / VERIFIED` | Parent queries strictly scoped by `childStudentIds` array and validated in rules. |
| **INT-018** | Division | Kindergarten vs Courses separation was purely UI | `FIXED / VERIFIED` | `isDivisionAllowedForBranchStaff` enforces separation at the Firestore rules level. |
| **INT-019** | Approvals | Approved shift corrections did not validate payload matching | `FIXED / VERIFIED` | `shiftMatchesCorrectionPayload` in rules checks exact before/after fields. |
| **INT-020** | Front Office | Front Office parent listing blocked by rules | `FIXED / VERIFIED` | `firestore.rules` L260, L264 allows same-branch staff to list parents. Emulator test INT-020 passes. |
| **CE-BRANCH-SCOPE** | Corporate Events | Branch events leaked across branches | `FIXED / VERIFIED` | Split queries in repository + `isSameBranchStrict` in rules. 12 emulator test cases pass. |
| **K-01** | Kiosk | Kiosk silently fell back to direct Firestore writes on error | `FIXED / VERIFIED` | `kioskClockInWithProof` fails closed if Worker or SubtleCrypto is unavailable. |
| **K-02** | Kiosk | Clock-out lacked identity binding | `FIXED / VERIFIED` | `kioskClockOutWithProof` requires `badgeToken` and signs challenge. |
| **K-03** | Kiosk | Concurrent clock-ins could create duplicate shifts | `FIXED / VERIFIED` | Worker uses `activeShifts/{badgeToken}` with `currentDocument.exists=false` precondition. |
| **K-04** | Kiosk | Class switching was non-atomic | `FIXED / VERIFIED` | `kioskSwitchClassWithProof` closes old shift and creates new shift in verified Worker flow. |
| **K-05** | Kiosk | Kiosk credentials were forgeable | `FIXED / VERIFIED` | ECDSA P-256 WebCrypto keypair generated and stored in non-exportable IndexedDB. |
| **K-06 / K-11** | Kiosk | Class and event metadata forgeable from client | `FIXED / VERIFIED` | Worker authoritatively fetches and validates class/event existence and instructor assignment. |
| **K-07** | Kiosk | Multiple corporate events collapsed into single record | `FIXED / VERIFIED` | Deterministic doc ID `${uid}_${dateKey}_${eventId}` in `shiftsRepository.js`. |
| **K-08** | Kiosk | Overnight corporate events past midnight failed window | `FIXED / VERIFIED` | `isEventWithinTimeWindow` accounts for overnight event ranges spanning 00:00. |
| **K-09** | Kiosk | Status timeout race in UI | `FIXED / VERIFIED` | `useKioskScanner.js` clears `statusTimerRef` on every new status call and unmount. |

---

## 4. Test Results

### 4.1 Unit & Integration Suite (`npm test`)
- **Command:** `npm test`
- **Result:** **PASSED** (Code: 0)
- **Summary:** 77 test files passed, 1036 tests passed, 1 file skipped (`firestoreRules.emulator.test.js`, run via `test:rules`), 52 tests skipped, 0 failures. Duration: ~48.77s.

### 4.2 Security Rules Emulator Suite (`npm run test:rules`)
- **Command:** `npm run test:rules` (Firebase Firestore Emulator on port 8085 with Java 21)
- **Result:** **PASSED** (Code: 0)
- **Summary:** 1 test file passed, 52 of 52 tests passed, 0 failures. Duration: ~23.64s.
  - Payments owner scoping & cashier batch (C1, F1): 13 tests passed
  - Dual-control approvals contract (C2): 7 tests passed
  - Users collection & student/parent field protection (H1): 6 tests passed
  - Shifts kiosk flow & auto-close protection (C3, H2): 5 tests passed
  - Approved shift self-correction gate (C4): 5 tests passed
  - Shift audit events append-only dual-control trail (C4): 3 tests passed
  - Class attendance scanning constraints: 3 tests passed
  - Fallback deny-all: 3 tests passed
  - Integration audits & remediation (INT-002, INT-004, INT-009, CE-BRANCH-SCOPE, INT-013, INT-020): 7 tests passed

### 4.3 Static Code Analysis (`npm run lint`)
- **Command:** `npm run lint` (`eslint .`)
- **Result:** **PASSED** (Code: 0)
- **Summary:** 0 errors, 0 warnings across all `.js`, `.jsx`, and `.ts` files.

### 4.4 TypeScript Typecheck (`npm run typecheck`)
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Result:** **PASSED** (Code: 0)
- **Summary:** 0 type errors across the entire repository.

### 4.5 Production Bundle Compilation (`npm run build`)
- **Command:** `npm run build` (`vite build`)
- **Result:** **PASSED** (Code: 0)
- **Summary:** Client bundle generated in 2.16s, 62 precache entries generated for PWA (`dist/sw.js`).

### 4.6 Focused Attendance Tests
- **Command:** `npx vitest run src/features/attendance/`
- **Result:** **PASSED** (Code: 0) — 10 test files passed, 169 tests passed.

### 4.7 Focused Corporate Events Tests
- **Command:** `npx vitest run src/features/attendance/corporateEvents.test.js src/features/attendance/corporateEventsRepository.test.js`
- **Result:** **PASSED** (Code: 0) — 2 test files passed, 35 tests passed.

### 4.8 Focused Security Rules Matrix Tests
- **Command:** `npx vitest run src/features/shared/securityRulesMatrix.test.js`
- **Result:** **PASSED** (Code: 0) — 1 test file passed, 124 tests passed.

---

## 5. Firestore Authorization Matrix

| Collection | Role | List Query Rule | Single Doc Get Rule | Create Rule | Update Rule | Delete Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **users** | Admin | Unrestricted | Unrestricted | Any valid user | Any user | Any user |
| | Manager | `isSameBranchStrict` && (`role == 'parent'` \|\| `isDivisionAllowedForBranchStaff`) | `isSameBranch` && (`role == 'parent'` \|\| `isDivisionAllowedForBranchStaff`) | Denied | Denied | Denied |
| | Front Office | Same as Manager (roles `student`, `instructor`, `parent`) | Same as Manager | Can create `student`, `parent` in own branch | Can update specific student/parent fields; no role or branch changes | Can delete `student`, `parent` in own branch |
| | Self | Allowed via own UID | `userId == auth.uid` | Via valid invite token | Self fields only (`displayName`, `phone`, `dob`, `photoURL`, `nickname`) | Denied |
| | Student / Parent | Denied | Student: self; Parent: `isParentOf(userId)` | Denied | Denied | Denied |
| **classes** | Admin | Unrestricted | Unrestricted | Allowed | Allowed | Allowed |
| | Manager / Front Office | `isSameBranchStrict` && `isDivisionAllowedForManager` | `isSameBranch` && `isDivisionAllowedForManager` | Manager only (same branch) | Manager only (same branch) | Manager only (same branch) |
| | Instructor | Own assigned classes | Own assigned classes | Denied | Denied | Denied |
| **shifts** | Admin | Unrestricted | Unrestricted | Allowed | Allowed | Allowed |
| | Manager / Front Office | `isSameBranchStrict` && `isDivisionAllowedForBranchStaff` | `isSameBranch` && `isDivisionAllowedForBranchStaff` | Front Office kiosk creation (same branch staff) | Front Office clock-out; Manager/FO approved corrections | Denied |
| | Instructor / Staff | `userId == auth.uid` | `userId == auth.uid` | Denied (must use kiosk/Worker) | Denied | Denied |
| **corporateEvents** | Admin | Unrestricted | Unrestricted | Allowed | Allowed | Allowed |
| | Branch Staff | `audienceType == 'all'` OR `isSameBranchStrict` | `audienceType == 'all'` OR `isSameBranchStrict` | Manager/FO (own branch or company-wide) | Manager/FO (own branch only) | Manager/FO (own branch only) |
| | Student / Parent | Denied | Denied | Denied | Denied | Denied |
| **approvals** | Branch Approver | `isSameBranchStrict` | `isSameBranch` | Staff create own pending | Approver only (dual control, immutable requestedByUid) | Denied |

---

## 6. Branch Isolation Results

- **Proof of Enforcement:**
  - `isSameBranchStrict(data)` requires `userBranch() != null` and evaluates `data.branchId == userBranch()`.
  - Synthetic documents constructed by Firestore query evaluators without a branch constraint produce a null branch value, which fails `isSameBranchStrict`.
  - Non-admin staff attempting `collection(db, "users")`, `collection(db, "shifts")`, or `collection(db, "corporateEvents")` without `where("branchId", "==", targetBranchId)` are rejected with `PERMISSION_DENIED`.
  - Cross-branch reads and queries (e.g. Kota Gorontalo staff requesting Bone Bolango documents) are deterministically rejected. Verified in `firestoreRules.emulator.test.js` tests `CE-BRANCH-SCOPE` cases 3, 5, 12, and `INT-004`.

---

## 7. Division Isolation Results

- **Proof of Enforcement:**
  - `isDivisionAllowedForBranchStaff(data)` evaluates:
    - If `userDivision() == 'kindergarten'`: requires `data.division == 'kindergarten'`. Courses data is blocked.
    - If `userDivision() == 'courses'` or `null`: requires `!('division' in data) || data.division != 'kindergarten'`. Kindergarten data is blocked.
    - If `userDivision() == 'all'`: returns `true`, allowing cross-divisional view within the staff member's assigned branch.
    - If `role` is not manager or front office (e.g. instructor, office boy), database division evaluation returns `true`, with scoping managed by queries and class assignments.
  - Branch boundary is checked in conjunction (`&&`) with division checks; holding `division = "all"` NEVER grants cross-branch access.

---

## 8. Role Normalization Consistency

- **Canonical Roles:** `admin`, `manager`, `instructor`, `instructorleader`, `frontoffice`, `opslead`, `marketing`, `officeboy`, `student`, `parent`.
- **Legacy Aliases Normalized:**
  - `ops_lead`, `frontofficelead`, `front_office_lead` $\rightarrow$ `opslead`
  - `instructor_leader`, `head_instructor` $\rightarrow$ `instructorleader`
  - `branch_manager` $\rightarrow$ `manager`
  - `front_office` $\rightarrow$ `frontoffice`
- **Consistency Verification:**
  - Client normalization via `normalizeRole(role)` in `roles.js`.
  - Rules normalization via explicit membership checks `role in ['frontoffice', 'opslead', 'ops_lead', 'frontofficelead']` in `firestore.rules`.
  - Worker normalization via `normalizeRole` in `cloudflare-worker/worker.js`.
  - 14 role tests pass in `src/features/shared/roles.test.js`.

---

## 9. Front Office Verification

- **Self-Profile Authorization:**
  - Front office users reading their own profile: permitted under `userId == request.auth.uid`.
  - Front office users updating their own profile: restricted strictly to `['displayName', 'phone', 'dob', 'photoURL', 'nickname']`. Role escalation or branch changes are impossible.
- **Student & Parent Management:**
  - Front office staff can create and manage students and parents within their assigned branch.
  - Student updates allow operational fields but prohibit modifying `role` or `branchId`.
  - Parent updates allow contact fields but prohibit modifying `role` or `branchId`.

---

## 10. Kindergarten Query Verification

- **Split Query Pattern in `useDashboardData.js`:**
  - Kindergarten students are queried via:
    `query(collection(db, "users"), where("role", "==", "student"), where("division", "==", "kindergarten"), where("branchId", "==", targetBranchId))`
  - Staff & parents are queried via:
    `query(collection(db, "users"), where("role", "in", ["instructor", "parent"]), where("branchId", "==", targetBranchId))`
  - Both result sets are merged in memory via `Map`.
  - This architecture cleanly satisfies `isDivisionAllowedForBranchStaff` and prevents `PERMISSION_DENIED` errors on Kindergarten dashboards.
- **Admin Direct Save:**
  - Direct save in `useDashboardData.js` calls `normalizeStaffDivision(formData.division, formData.role)`, properly preserving `"all"` and `null` values.

---

## 11. Attendance / Kiosk Security Verification (15 Invariants)

1. **Client input cannot directly authorize staff clock-in:** Verified. Rules block direct writes to `shifts` by teaching and general staff. Writes require Front Office reception role or Cloudflare Worker service token.
2. **Server/Worker proof remains authoritative:** Verified. `kioskClockInWithProof` contacts Cloudflare Worker with ECDSA P-256 signature and nonce; timestamp and branch are injected by the server.
3. **Badge identity cannot be substituted:** Verified. The P-256 cryptographic signature is computed over `${deviceId}:${nonce}:${badgeToken}`. Tampered tokens fail verification.
4. **Branch identity cannot be forged:** Verified. Worker resolves branch authoritatively from `device.branchId` stored in `kioskDevices/{deviceId}`.
5. **Class identity validated server-side:** Verified. Worker fetches `classes/{classId}` directly from Firestore REST API and verifies existence and branch match.
6. **Instructor assignment validated server-side:** Verified. Worker validates `classDoc.instructorId === badgeToken || classDoc.substituteInstructorId === badgeToken`.
7. **Corporate-event identity validated server-side:** Verified. Worker validates `corporateEvents/{eventId}` existence and `status === "active"`.
8. **Clock-out bound to badge identity:** Verified. Worker verifies `prevShift.userId === badgeToken`.
9. **Class switching cannot cross branches:** Verified. Worker checks `user.branchId === device.branchId` and `classDoc.branchId === device.branchId`.
10. **Concurrent clock-ins single open shift protection:** Verified. Worker uses `fsCreateDocWithIdPrecondition` on `activeShifts/{badgeToken}` with `currentDocument.exists=false`.
11. **Failed shift creation recovery:** Partially Verified (See Finding K-16). Synchronous failures in `fsCreateDoc` are caught and cleaned up; however, orphan locks without `shiftId` lack an automatic TTL expiration.
12. **Challenge nonces replay protection:** Verified. Nonces are stored in `kioskChallenges/{deviceId}` and consumed via compare-and-set on `updateTime`.
13. **Deterministic student attendance identity:** Verified. Document ID uses `${uid}_${dateKey}_${eventId}` when an event is present, preventing collision with regular daily attendance `${uid}_${dateKey}`.
14. **Overnight corporate-event windows:** Verified. `isEventWithinTimeWindow` supports overnight ranges.
15. **Kiosk status race protection:** Verified. `statusTimerRef` is cleared on every new status call and component unmount.

---

## 12. Corporate-Event Security Verification

- **Branch Filtering:** Split queries ensure branch staff query `audienceType == 'all'` and `branchId == targetBranchId` separately and merge in memory.
- **Branch Authorization:** `allow read` requires `audienceType == 'all'` OR `isSameBranchStrict(resource.data)`.
- **Admin Behavior:** Staff with role `admin` can list, create, and manage all events with `effectiveBranchId = "all"`.
- **Active / Expired Behavior:** Kiosk date filter matches `eventDate == todayDate` and `status == "active"`.
- **Cancellation:** Soft delete via `updateDoc({ status: "cancelled" })` preserves historical attendance.

---

## 13. Remaining Open Findings

### INT-007: Student Hard Deletion Leaves Dependent Records Behind
- **File / Path:** `src/features/dashboard/useDashboardData.js` (`handleDelete`)
- **Current Behavior:** Hard deletion deletes `users/{studentId}` doc. Dependent payment and class attendance records in `payments` and `classAttendance` remain in the database.
- **Impact:** Low operational impact; historical records become detached. Deletion is restricted to Admin.
- **Recommendation:** Implement a soft-archive pattern (`status: "archived"`) rather than hard deletion.

### INT-015: General Duty Fallback for Non-Instructor Staff During Ambiguous Corporate Events
- **File / Path:** `src/features/attendance/kioskScanProcessor.js` (lines 350–390)
- **Current Behavior:** When multiple corporate events are scheduled and non-instructor staff scans, the system falls back to `general` duty without presenting an event picker.
- **Impact:** Minor metadata mismatch if a manager or receptionist intended to log hours specifically under a corporate event.
- **Recommendation:** Display the `KioskClockInModal` event picker for non-instructor staff when multiple events are active.

---

## 14. Remediation of Newly Discovered Findings

### K-16: Stale Kiosk Lock Lacks Expiration TTL when `shiftId` is Missing — `FIXED / VERIFIED`
- **File / Path:** `cloudflare-worker/worker.js` (lines 800–915), `src/features/attendance/kioskHardening.test.js`
- **Remediation Implemented:**
  1. **Exact Server `updateTime`:** `fsCreateDocWithIdPrecondition` exposes the exact server timestamp `raw.updateTime` from the initial lock creation response (zero secondary GET calls).
  2. **Atomic Batch Commit:** Normal kiosk clock-in shift creation and lock promotion are coupled into a single atomic Firestore `documents:commit` call with precondition `currentDocument.updateTime == lockUpdateTime`. If recovery deletes the lock first, the commit fails and no shift is written; if clock-in commits first, recovery delete fails with HTTP 412.
  3. **Version-Safe Recovery:**
     - Stale linked-lock cleanup uses `fsDeleteDocWithPrecondition(..., inspectedLock.updateTime)`.
     - Stale orphan-lock recovery ($\ge 60\text{s}$) uses `fsDeleteDocWithPrecondition(..., inspectedLock.updateTime)` after confirming no open shift exists in `shifts`.
     - Stale orphan lock with existing open shift is **healed** via `fsPatchDocWithPrecondition`.
     - In-flight opening locks ($< 60\text{s}$) reject clock-in with HTTP 409 in-flight message and are preserved.
- **Verification Evidence:**
  - `src/features/attendance/kioskHardening.test.js` tests **T-01 through T-08** pass 100%.
  - Critical race test T-08 proves both orderings: recovery-first prevents shift creation; commit-first prevents lock deletion.
  - Production worker syntax passes (`node -c cloudflare-worker/worker.js`), build passes (`node cloudflare-worker/build.js`).
  - Full test suite passes: 77 files, 1044 tests passed (0 failures).

---

## 15. Unproven / Runtime-Dependent Findings

1. **Cloudflare Worker Production Deployment:**
   - The Cloudflare Worker code exists in `cloudflare-worker/worker.js` and builds with `npm run build`.
   - Real ECDSA cryptographic verification was validated via local WebCrypto tests (`kioskHardening.test.js`).
   - Live execution against Cloudflare edge workers depends on deployed secrets (`VITE_AI_WORKER_URL`, `FIREBASE_SERVICE_ACCOUNT_KEY`).

---

## 16. Recommended Remediation Order

1. **Phase 1 (Worker Resilience):** Add 60-second TTL auto-clear for orphan `status: "opening"` records in `activeShifts` (`cloudflare-worker/worker.js`).
2. **Phase 2 (Kiosk UX):** Add event picker modal prompt for non-instructor staff when multiple corporate events match (`kioskScanProcessor.js`).
3. **Phase 3 (Data Lifecycle):** Replace admin hard student deletion with soft archiving to preserve audit trails (`useDashboardData.js`).

---
EOF
