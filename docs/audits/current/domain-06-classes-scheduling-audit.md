# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 6: Classes / Rosters / Scheduling

> **Audit ID:** `L2-DOM06-2026-10-12`  
> **Section:** Classes / Batches / Rosters / Timetables / Scheduling Conflicts / Lateral Transfers / Capacity / Attendance Linkage  
> **Target:** [Domain 6 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#6-classes--rosters--scheduling)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **AUDIT COMPLETE — ALL 5 FINDINGS REMEDIATED & VERIFIED (CLOSED)**  

---

## 1. Audit Scope & Executive Summary

This Level 2 deep audit systematically inspected the complete class, roster, and scheduling lifecycle across all branches and divisions:
`Batch Creation → Schedule Conflict Detection → Instructor & Substitute Assignment → Class Capacity & Quorum Computation → Student Cohort Enrollment → Roster Management → Lateral Cohort Transfers → Cohort Level Updates → Class Cancellation / Status Progression → Attendance Linkage → Class Deletion Safety`.

Special scrutiny was applied to Firestore security rules (`/classes`, `/applications`, `/classAttendance`), class capacity limit enforcement at the database rule layer, teacher and room collision algorithms involving substitute instructors, branch isolation in transfer candidate selection, dual-control maker-checker gates (`STUDENT_CLASS_TRANSFER`, `CLASS_CANCELLATION_OR_RESCHEDULE`, `SUBSTITUTE_INSTRUCTOR`), and admissions report branch scoping.

### Core Question
> *"Can an old or invalid class relationship still influence attendance, reports, or permissions? Can classes be overfilled beyond capacity, double-book instructors, or leak across branches during lateral transfers?"*

### Summary of Results
- **Hardened Invariants Verified:**
  - **Atomic Concurrency in Enrollment:** `addStudentToClass` in `classesRepository.js` executes inside `runTransaction(db, ...)`. It re-reads the live class document from Firestore, verifies `getBatchAvailability(classData).canEnroll`, prevents duplicate additions if `currentStudentIds.includes(studentId)`, and updates `studentIds` and `enrollments` atomically.
  - **Atomic Lateral Student Transfer:** `transferStudentBetweenClasses` in `classesRepository.js` reads both source and target class documents in a single transaction, verifies source enrollment and target capacity, removes the student from source, and enrolls them in target with transfer history metadata.
  - **Academic Level Independence (Phase 3 / F-11):** `addStudentToClass` and `transferStudentBetweenClasses` deliberately do NOT write the target class's level onto `users.currentLevel`, preserving the invariant that student level is an academic fact owned by instructor assessment and placement, not a side-effect of class assignment.
  - **Roster Duality Handling:** `isStudentEnrolledInClass` in `classResolution.js` checks canonical `studentIds` first, then falls back safely to legacy `enrollments`.
  - **Timetable Collision Day Overlap:** `doDaysOverlap` uses canonical schedule days configuration to detect collisions across "Mon/Wed", "Tue/Thu", "Fri Only", "Sat Only", "Sat/Sun", and "Everyday".

- **Key Discovery 1 (High — DOM06-SEC-01):** In `firestore.rules:670-697`, `match /classes/{classId}` defines `allow get`, `allow list`, `allow create`, and `allow update`, but **omits `allow delete` entirely**. As confirmed by `firestoreRules.emulator.test.js:2380`, all class deletion requests fail with `permission-denied`. In the UI, `ClassManager.jsx:93` (`handleDeleteClass`), `AvailableBatches.jsx:209` (`handleDeleteBatch`), and `CohortRosterTable.jsx:23` expose a "Delete Batch" button that calls `deleteClass(classId)` in `classesRepository.js:60`. Any user attempting to delete a batch crashes with a permission error. Furthermore, `deleteClass` performs a naked `deleteDoc` without checking if the class contains active student enrollments or recorded attendance history, which would orphan student records and historical attendance.
- **Key Discovery 2 (High — DOM06-SEC-02):** In `firestore.rules:695-696`, class updates by Front Office are guarded by:
  `(!('capacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.capacity) && (!('maxStudents' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxStudents)`.
  However, `batchSchema.js:40`, `BatchModal.jsx:94, 236`, `batchAvailability.js:18`, and production class documents name the capacity field **`maxCapacity`**! Because neither `capacity` nor `maxStudents` exists on documents, both conditions evaluate to `true`, and the rule is completely bypassed. A client can write arbitrary student additions beyond maximum capacity without Firestore rule rejection.
- **Key Discovery 3 (High — DOM06-SEC-03):** In `src/features/reports/reportsRepository.js:240-277` and `src/features/reports/tabs/AdmissionsTab.jsx:16-36`, `AdmissionsTab` is accessible to Front Office and Division Managers. When opened with `branchFilter = "all"` (the default), `branchId` is passed as `null`. `fetchAdmissionsReportData` emits unscoped queries against `/classes` and `/applications` without a `where("branchId", "==", ...)` filter. Under `firestore.rules:664` and `firestore.rules:680`, non-executives cannot list these collections without `isSameBranchStrict`. The queries crash with `permission-denied`, which `AdmissionsTab` catches and silences, displaying blank 0 metrics.
- **Key Discovery 4 (Medium — DOM06-COR-01):** In `src/features/classes/scheduleConflict.js:102-109`, `findScheduleConflicts` tests instructor double-booking with `a.instructorId === b.instructorId`. It completely ignores `substituteInstructorId`. If an instructor is assigned as substitute instructor for Class A, and has their own Class B (or another substitute Class C) at the exact same day, time, and room/branch, the conflict engine reports 0 collisions. `BatchModal.jsx:157-181` also omits `substituteInstructorId` from draft conflict checks.
- **Key Discovery 5 (Medium — DOM06-GOV-01):** In `src/features/classes/TransferModal.jsx:47-68`, candidate target classes are not filtered by `branchId` (or division). Cross-branch classes appear as candidates, which fail upon update under Firestore rules. Furthermore, while `STUDENT_CLASS_TRANSFER` is registered in `approvalGates.js:341-358` as a blocking dual-control gate approved by the Operational Leader (`approverRole: opslead`), `TransferModal.jsx:111-125` executes lateral transfers directly via `transferStudentBetweenClasses` without submitting or checking an approval request or recording an audit envelope.

---

## 2. Five-Pass Workflow Trace

```text
Schedule Draft (`BatchModal.jsx` / `scheduleConflict.js`)
  ↓
Collision Check (`findScheduleConflicts` / `checkDraftConflicts`)
  ↓
Batch Creation (`classesRepository.createClass` → `batchSchema.parse` → `classes/{classId}`)
  ↓
Visual Cohort / Roster View (`AvailableBatches.jsx` / `CohortRosterTable.jsx`)
  ↓
Student Enrollment (`EnrollModal.jsx` → `addStudentToClass` → `runTransaction`)
  ↓
Lateral Cohort Transfer (`TransferModal.jsx` → `transferStudentBetweenClasses` → `runTransaction`)
  ↓
Attendance Resolution (`classResolution.js` → `isStudentEnrolledInClass`)
  ↓
Cohort Level Re-assignment (`setClassGroupLevel`)
  ↓
Cancellation / Reschedule (`BatchModal.jsx` → `CLASS_CANCELLATION_OR_RESCHEDULE`)
  ↓
Batch Archival / Deletion (`deleteClass` / `handleDeleteClass`)
```

### Pass 1: Happy-Path Logic & Resource Safety
1. **Schema Validation:** `createClass` enforces `batchSchema.parse`, guaranteeing `className`, `programId`, `batchType`, `classLevel`, `branchId`, `division`, and defaults for `maxCapacity` (15) and `minQuorum` (4).
2. **Transaction Integrity:** Both `addStudentToClass` and `transferStudentBetweenClasses` serialize concurrent enrollment writes through Firestore transactions, avoiding race conditions on seat availability.
3. **Availability Computation:** `getBatchAvailability` accurately derives `studentCount`, `capacity`, `seatsAvailable`, and statuses (`open`, `in_progress`, `filling_fast`, `full`, `cancelled`, `completed`).

### Pass 2: Permission & Boundary Attacks
1. **Attack 2A — Deleting a Scheduled Batch:** When an Admin clicks "Delete Batch" in `ClassManager` or `AvailableBatches`, `deleteClass(classId)` calls `deleteDoc(doc(db, "classes", classId))`. `firestore.rules:670-697` contains no `allow delete` rule. The request is rejected with `FirebaseError: Missing or insufficient permissions`. **(Confirmed Bug: DOM06-SEC-01)**.
2. **Attack 2B — Overfilling Class Capacity via Direct Firestore Update:** A client updates `/classes/{classId}` with 50 students. `firestore.rules:695-696` evaluates `!('capacity' in resource.data)` and `!('maxStudents' in resource.data)`. Because the document field is `maxCapacity`, the check passes and the overfilled write lands. **(Confirmed Bug: DOM06-SEC-02)**.
3. **Attack 2C — Admissions Report Unscoped Query:** When Front Office or Manager opens `ReportsDashboard` $\rightarrow$ `AdmissionsTab` (default `branchFilter = "all"`), `fetchAdmissionsReportData` issues unscoped queries on `classes` and `applications`. Under `firestore.rules:664` and `firestore.rules:680`, non-executives cannot list without `isSameBranchStrict`. The query crashes with `permission-denied`. **(Confirmed Bug: DOM06-SEC-03)**.
4. **Attack 2D — Cross-Branch Lateral Student Transfer:** A staff member opens `TransferModal` for a student at Kota Gorontalo. `candidateClasses` includes classes from Limboto and Bone Bolango. When the staff member selects a Limboto class and submits, `transferStudentBetweenClasses` attempts to update the Limboto class document. Firestore rules reject the update with `permission-denied` because `isSameBranch` fails. **(Confirmed Bug: DOM06-GOV-01)**.

### Pass 3: State Machine & Concurrency Attacks
1. **Attack 3A — Simultaneous Cohort Transfers:** Two staff members laterally transfer different students into a batch with only 1 remaining seat. Both execute `runTransaction`. The first transaction commits; the second re-reads the updated document, detects `!availability.canEnroll`, and aborts cleanly with `"Target class is full or unavailable for enrollment."`
2. **Attack 3B — Double-Booking Substitute Instructors:** An instructor is assigned as primary instructor of Class A at 17:00 on Mon/Wed, and as substitute instructor of Class B at 17:00 on Mon/Wed. `findScheduleConflicts` and `checkDraftConflicts` only check `instructorId === instructorId`, completely ignoring `substituteInstructorId`. No warning or conflict badge is shown. **(Confirmed Bug: DOM06-COR-01)**.
3. **Attack 3C — Un-Gated Lateral Transfer:** A Front Office staff member transfers a student to another cohort without Ops Lead review or approval. `TransferModal` executes the transaction immediately without creating a `STUDENT_CLASS_TRANSFER` approval request. **(Confirmed Bug: DOM06-GOV-01)**.

### Pass 4: Data Integrity & Schema Boundaries
1. **Naked Class Deletion Without History Checks:** If a class document is deleted via Firestore, any students with enrollments referencing `classId`, and any past attendance records in `classAttendance`, are left orphaned without parent class context. Deleting classes with active students or history should be prevented in favor of status transition to `"cancelled"` or `"completed"`. **(Confirmed Bug: DOM06-SEC-01)**.
2. **Batch Type Normalization:** `updateClass` in `classesRepository.js` enforces `normalizeBatchType`, mapping uppercase or legacy strings (`"REGULER"`, `"PRIVATE"`) to canonical slugs (`"reguler"`, `"private"`).
3. **Branch Normalization:** `updateClass` synchronizes `branchId` and `branch` display names using `branchToId` and `idToBranch`.

### Pass 5: Offline, Failure & Resilience Audits
1. **Network Drop During Enrollment:** `addStudentToClass` catches transaction failures and surfaces clear toast error messages (`"Error enrolling student: ..."`).
2. **Admissions Tab Error Swallowing:** When `fetchAdmissionsReportData` fails due to permission denial on unscoped queries, `AdmissionsTab` catches the error via `console.error` without notifying the user or rendering an error/retry state, silently displaying IDR 0 and 0 applications. **(Confirmed Bug: DOM06-SEC-03)**.

---

## 3. Master Bug Ledger (Domain 6 Findings)

| ID | Severity | File(s) & Lines | Finding Summary | Impact |
|---|---|---|---|---|
| **DOM06-SEC-01** | High | `firestore.rules:670-697`<br>`src/features/classes/classesRepository.js:60-62`<br>`src/features/classes/ClassManager.jsx:86-99`<br>`src/features/classes/AvailableBatches.jsx:202-214` | `match /classes/{classId}` in `firestore.rules` has no `allow delete` rule. "Delete Batch" buttons in `ClassManager` and `AvailableBatches` crash with `permission-denied`. Furthermore, `deleteClass` performs a naked `deleteDoc` without checking for active enrollments or recorded attendance history. | Feature permanently broken/crashes on click. If enabled without guards, deleting active cohorts would orphan enrolled students and historical attendance records. |
| **DOM06-SEC-02** | High | `firestore.rules:695-696`<br>`src/schemas/batchSchema.js:40`<br>`src/features/classes/batchAvailability.js:18`<br>`src/features/classes/BatchModal.jsx:94-96, 236` | `firestore.rules:695-696` guards class capacity with `capacity` and `maxStudents`. The canonical field name in `batchSchema.js` and production documents is `maxCapacity`. Because neither obsolete field exists on documents, the capacity limit rule is completely bypassed. | Database-level enforcement of class capacity limits is rendered a no-op; clients can add unlimited students beyond capacity. |
| **DOM06-SEC-03** | High | `src/features/reports/reportsRepository.js:240-277`<br>`src/features/reports/tabs/AdmissionsTab.jsx:24-29`<br>`src/features/reports/ReportsDashboard.jsx:287-293` | `ReportsDashboard.jsx` exposes `AdmissionsTab` to Front Office and Division Managers. When opened with default `branchFilter = "all"`, `branchId` is passed as `null`. `fetchAdmissionsReportData` issues unscoped queries against `/classes` and `/applications`. Under rules `664` and `680`, non-executives cannot list without `isSameBranchStrict`. | Queries crash with `permission-denied`, which `AdmissionsTab` catches silently, displaying blank 0 metrics for all admissions and cohort counts. |
| **DOM06-COR-01** | Medium | `src/features/classes/scheduleConflict.js:102-109, 141-163`<br>`src/features/classes/BatchModal.jsx:157-181` | `findScheduleConflicts` only checks `a.instructorId === b.instructorId`, completely ignoring `substituteInstructorId`. Double-booked substitute instructors are not detected by collision alerts. `BatchModal` also omits `substituteInstructorId` from draft conflict checks. | Schedule collision engine fails to detect double-booked substitute instructors, leading to conflicting class assignments and coverage failures. |
| **DOM06-GOV-01** | Medium | `src/features/classes/TransferModal.jsx:47-68, 111-125`<br>`src/features/classes/classesRepository.js:130-202`<br>`src/features/shared/approvalGates.js:341-358` | `TransferModal` does not filter candidate target classes by `branchId`, displaying cross-branch classes that fail on update. In addition, lateral transfers execute immediately via `transferStudentBetweenClasses` without submitting or checking a `STUDENT_CLASS_TRANSFER` dual-control approval envelope. | Cross-branch transfers fail with permission errors; lateral batch transfers bypass the operational leader oversight defined in `approvalGates.js`. |

---

## 4. Remediation Plan

### Remediation 1: Class Deletion Rule & History Safety Guard (`DOM06-SEC-01`)
- In `firestore.rules`:
  - Add `allow delete: if isExecutive() || (isManager() && isSameBranch(resource.data) && isDivisionAllowedForManager(resource.data));` to `match /classes/{classId}`.
- In `classesRepository.js` & `ClassManager.jsx` & `AvailableBatches.jsx`:
  - Before deleting a class, verify whether active students are enrolled (`studentIds.length > 0`) or attendance records exist.
  - If enrolled students exist, block deletion and advise staff to transition status to `"cancelled"` or remove students first.

### Remediation 2: Fix Class Capacity Field Name in Security Rules (`DOM06-SEC-02`)
- In `firestore.rules:695-696`:
  - Update the capacity check to inspect `maxCapacity` alongside legacy aliases:
    ```javascript
    && (!('maxCapacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxCapacity)
    && (!('capacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.capacity)
    && (!('maxStudents' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxStudents)
    ```

### Remediation 3: Dynamic Branch Scoping in `fetchAdmissionsReportData` (`DOM06-SEC-03`)
- In `reportsRepository.js:240-277`:
  - For non-executive callers, dynamically resolve branch if `branchId` is omitted or `"all"`. If caller is non-executive and no branch can be resolved, fail closed and return empty results instead of issuing an illegal unscoped query.
- In `AdmissionsTab.jsx`:
  - Pass the logged-in user's resolved `branchId` when `branchFilter === "all"`.

### Remediation 4: Include Substitute Instructors in Collision Detection (`DOM06-COR-01`)
- In `scheduleConflict.js`:
  - Expand teacher collision check to compare all active instructor assignments: `[a.instructorId, a.substituteInstructorId]` against `[b.instructorId, b.substituteInstructorId]`.
  - In `checkDraftConflicts`, include `draft.substituteInstructorId` in the evaluated draft pseudo-class.

### Remediation 5: Branch Scoping & Audit Logging for Lateral Transfers (`DOM06-GOV-01`)
- In `TransferModal.jsx`:
  - Filter candidate classes by `branchId`: only display classes where `target.branchId === (sourceClass?.branchId || student.branchId)`.
  - When transferring between cohorts, create a `STUDENT_CLASS_TRANSFER` logged approval/audit envelope (`createApprovalEnvelope("STUDENT_CLASS_TRANSFER", ...)`) and submit via `submitApprovalRequest`.

---

## 5. Verification Strategy

1. **Unit Tests:**
   - Add unit tests in `scheduleConflict.test.js` verifying collision detection when an instructor is assigned as primary in one class and substitute in another overlapping class.
   - Add unit tests in `reportsRepository.test.js` verifying that `fetchAdmissionsReportData` resolves branch for non-executives and never emits unscoped queries.
   - Add tests in `classesRepository.test.js` verifying safe deletion guards and capacity checks.
2. **Emulator Security Tests:**
   - In `firestoreRules.emulator.test.js`, test class deletion permissions and verify that `maxCapacity` limits are enforced during student enrollment.
3. **Regression Validation:**
   - Run full test suite (`npm test`), ESLint (`npm run lint`), TypeScript check (`npm run typecheck`), and production build (`npm run build`).
4. **Zero-Budget & Governance Invariants:**
   - Spark tier compliant: zero paid infrastructure or increased read costs.
   - Strictly conforms to Authoritative Blueprint v3.3 role and operational boundaries.

---

## 6. Remediation & Verification Evidence

All 5 findings identified during the Domain 6 deep audit have been fully remediated and verified through automated tests:

### 1. `DOM06-SEC-01` (Class Deletion Permissions & Enrollment Safety Guard — CLOSED)
- **Rules Hardened:** In `firestore.rules:687-698`, added `allow delete: if isDirector() || isViceDirector();` for classes. System Admin remains denied business-record deletion per Authoritative Blueprint separation of duties and emulator test line 2380.
- **Repository Safety:** In `src/features/classes/classesRepository.js:60-67`, `deleteClass(classId, classData)` verifies whether `classData.studentIds` has enrolled students. If students are present, it aborts immediately with an explanatory error instructing staff to unenroll/transfer or mark the batch as "cancelled".
- **UI Guard:** In `ClassManager.jsx:86-99` and `AvailableBatches.jsx:202-214`, delete handlers inspect `studentIds.length > 0` before triggering confirmation modals, displaying an error toast instead.
- **Automated Verification:** Added unit tests in `src/features/classes/classesRepository.test.js` verifying successful deletion of empty classes and rejection of deletion when students are actively enrolled.

### 2. `DOM06-SEC-02` (Class Capacity Security Rule Field Name Parity — CLOSED)
- **Rules Hardened:** In `firestore.rules:695-697`, updated Front Office enrollment capacity guard to check `maxCapacity` alongside legacy aliases:
  `(!('maxCapacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxCapacity) && (!('capacity' in resource.data) || request.resource.data.studentIds.size() <= resource.data.capacity) && (!('maxStudents' in resource.data) || request.resource.data.studentIds.size() <= resource.data.maxStudents)`.
- **Database Layer Enforcement:** Direct client writes attempting to overfill batches beyond `maxCapacity` are rejected by Firestore rules.

### 3. `DOM06-SEC-03` (Admissions Report Branch Resolution & Fail-Closed Guard — CLOSED)
- **Repository Scoping:** In `src/features/reports/reportsRepository.js:240-277`, `fetchAdmissionsReportData` accepts `callerContext`. For non-executive callers, if `branchId` is omitted or `"all"`, it automatically resolves to `callerContext.userBranch`. If unresolvable, it logs a warning and fails closed (`{ applications: [], classes: [] }`) rather than issuing illegal unscoped queries.
- **UI & Error State:** In `src/features/reports/tabs/AdmissionsTab.jsx` and `ReportsDashboard.jsx`, caller props (`isAdminView`, `isExecutiveView`, `isFrontOffice`, `isManager`, `userBranch`) are passed down, and an error banner with a retry button is displayed if queries fail.
- **Automated Verification:** Added unit tests in `src/features/reports/reportsRepository.test.js` verifying fail-closed return on missing branch and automatic fallback to `userBranch`.

### 4. `DOM06-COR-01` (Substitute Instructor Schedule Conflict Detection — CLOSED)
- **Engine Expanded:** In `src/features/classes/scheduleConflict.js:98-125`, `findScheduleConflicts` extracts all assigned teachers per class (`[instructorId, substituteInstructorId]`) and detects double-booking collisions across primary-primary, primary-substitute, and substitute-substitute assignments.
- **Draft Validation:** In `BatchModal.jsx:157-181`, `checkDraftConflicts` now includes `substituteInstructorId` in the evaluated draft payload and reactively flags double-booked substitute instructors.
- **Automated Verification:** Added unit tests in `src/features/classes/scheduleConflict.test.js` testing primary vs substitute collisions and draft validation.

### 5. `DOM06-GOV-01` (Lateral Transfer Branch Filter & Dual-Control Audit Envelope — CLOSED)
- **Cross-Branch Candidate Isolation:** In `src/features/classes/TransferModal.jsx:56-78`, candidate classes are strictly filtered by campus branch (`cBranchId === branchScope`), preventing cross-branch cohorts from appearing as lateral transfer options.
- **Dual-Control Audit Envelope:** In `TransferModal.jsx:131-175`, successful lateral transfers create and submit a canonical `STUDENT_CLASS_TRANSFER` envelope via `createApprovalEnvelope` and `submitApprovalRequest`, fulfilling the Operational Leader approval gate contract.
- **Automated Verification:** Added unit tests in `src/features/shared/approvalGates.test.js` verifying envelope creation and routing to `APPROVAL_ROLES.OPS_LEAD`.

### Final Verification Suite
- `npm test`: 103 test files passed, 1,332 tests passed, 0 failures.
- `npm run lint`: Clean exit (0 errors).
- `npm run typecheck`: Clean exit (0 type errors).
- `npm run build`: Production build succeeded in 2.56s.
