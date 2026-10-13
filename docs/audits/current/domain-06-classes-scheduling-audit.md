# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 6: Classes / Rosters / Scheduling

> **Audit ID:** `L2-DOM06-2026-10-12`  
> **Section:** Classes / Batches / Rosters / Timetables / Scheduling Conflicts / Lateral Transfers / Capacity / Attendance Linkage  
> **Target:** [Domain 6 (`03-audit-domains.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#6-classes--rosters--scheduling)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12 (Round 1) / 2026-10-13 (Round 2 Cycle A)  
> **Audit Status:** **ROUND 2 (CYCLE A) AUDIT IN PROGRESS — 5 NEW FINDINGS DISCOVERED & VERIFIED**  

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

### Final Verification Suite (Round 1)
- `npm test`: 103 test files passed, 1,332 tests passed, 0 failures.
- `npm run lint`: Clean exit (0 errors).
- `npm run typecheck`: Clean exit (0 type errors).
- `npm run build`: Production build succeeded in 2.56s.

---

## 7. Round 2 (Cycle A) Deep Conformance Audit Findings & Verification (2026-10-13)

### 7.1 Round 2 Scope, Baseline & Operational Reality
Following the ratification of Authoritative Blueprint v3.4 (2026-10-13), Owner Decision on Class Scheduling Authority (ADR 2026-10-13 Option B), and the Lean Satellite Campus Governance Model (ADR 2026-10-13 G-012), this Round 2 (Cycle A) audit evaluated the implementation of classes, scheduling, and cohort rosters against the ratified governance framework:
1. **Option B Authority Realization:** Operational Leader (`opslead`) is primary scheduling authority at full branches; Course Division Manager (`manager`) acts as fallback authority at lean branches or when vacant; Executives (`director`, `vice_director`) hold supervisory scheduling authority across all branches.
2. **System Admin Operational Exclusion (G-002 & ADR Decision 1):** Technical System Admin holds zero business execution rights over classes, timetables, and enrollments in UI and rules.
3. **Lean Satellite Branch Reality (G-012):** Satellite branches (`bone_bolango`, `limboto`, `pohuwato`) operate without an Operational Leader. Workflows must not deadlock waiting for non-existent branch leaders.
4. **Dual-Control Gated Actions:** `STUDENT_CLASS_TRANSFER`, `CLASS_CANCELLATION_OR_RESCHEDULE`, and `SUBSTITUTE_INSTRUCTOR`.

---

### 7.2 Five-Pass Workflow & Boundary Trace (Round 2)

#### Pass 1: Happy-Path Logic & Resource Safety
1. **Option B in ManagerDashboard:** `ClassesAndCoverageTab.jsx:130` correctly passes `canEdit={!hasBranchOpsLead}` and `role="manager"` to `AvailableBatches`. At lean satellite branches lacking an Ops Lead, the manager is permitted to administer batches.
2. **Schedule Conflict Precision:** `findScheduleConflicts` in `scheduleConflict.js` reliably cross-checks day codes (including "Mon - Fri" vs "Mon/Wed") and time windows, flagging room and instructor collisions with zero false negatives on standard schedule types.

#### Pass 2: Permission & Boundary Attacks
1. **Attack 2A — Vice Director Batch Creation in UI:** In `ViceDirectorDashboard.jsx:479-486`, `ClassManager` is mounted with `role="vice_director"` and `isAdmin={false}`. When the Vice Director clicks "Schedule New Batch", `isNewBatchModalOpen` is set to `true`. However, line 363 of `ClassManager.jsx` gates the modal behind `{isAdmin && (`! Because `isAdmin` is `false`, the modal never renders. The button is completely inert. **(Confirmed Bug: DOM06-UI-01)**.
2. **Attack 2B — Non-Executive Class Deletion in AvailableBatches:** When an Ops Lead, Division Manager, or System Admin views `AvailableBatches`, `canAdminister` evaluates to `true`. This causes `AvailableBatchCard.jsx:76` to render the "Delete Batch" button. When clicked, `deleteClass` calls Firestore `deleteDoc`. Under `firestore.rules:767`, only `isDirector() || isViceDirector()` is permitted. The deletion fails with `FirebaseError: Missing or insufficient permissions`. **(Confirmed Bug: DOM06-SEC-04)**.
3. **Attack 2C — Cross-Branch Transfer in EnrollModal:** When a multi-branch user or executive opens `EnrollModal.jsx` in "Transfer" mode, `transferCandidates` iterates `allClasses` without checking branch scoping (`cls.branchId` vs `batch.branchId`). If a student from Limboto is selected for transfer into a Kota Gorontalo batch, `transferStudentBetweenClasses` fails in Firestore rules with `permission-denied`. **(Confirmed Bug: DOM06-GOV-03)**.

#### Pass 3: State Machine & Concurrency Attacks
1. **Attack 3A — Transferring Already-Enrolled Student to Target Batch:** If `transferStudentBetweenClasses` is called with a student already enrolled in `liveTarget`, the function removes the student from `sourceClass` and adds `arrayUnion(studentId)` and `arrayUnion(enrollmentRecord)` to `liveTarget`. While `studentIds` deduplicates the string, `arrayUnion` sees the newly generated `enrollmentRecord` map as unique, injecting a duplicate enrollment object into `liveTarget.enrollments`. **(Confirmed Bug: DOM06-COR-02)**.
2. **Attack 3B — Deadlocked Class Transfer at Satellite Branches:** When a student transfer occurs, `TransferModal.jsx:152` creates a `STUDENT_CLASS_TRANSFER` envelope. In `approvalGates.js:349`, this gate is registered as `APPROVAL_MODES.BLOCKING` with `eligibleApproverRoles: [APPROVAL_ROLES.OPS_LEAD]`. At lean branches (G-012), no Ops Lead exists. Because Course Division Manager and Vice Director are omitted from `eligibleApproverRoles`, the ticket is permanently unapprovable in `ApprovalInbox`. Furthermore, because the database transfer already committed, rejecting the ticket does not roll back the transfer. **(Confirmed Bug: DOM06-GOV-02)**.

#### Pass 4: Data Integrity & Schema Boundaries
1. **Intake Level Decoupling (Phase 3 / F-11):** Verified that neither `addStudentToClass` nor `transferStudentBetweenClasses` modifies `users.currentLevel`. Academic level remains cleanly owned by instructor assessment.
2. **Batch Type & Division Parity:** Verified that `batchSchema.parse` reliably derives `division = divisionOfProgram(programId)` and normalizes `batchType` to canonical lowercase slugs.

#### Pass 5: Offline, Failure & Resilience Audits
1. **Transaction Abort Recovery:** When `transferStudentBetweenClasses` aborts due to full capacity or missing enrollment, `TransferModal.jsx` cleanly catches the error and surfaces explanatory toast feedback without corrupting source or target records.

---

### 7.3 Master Bug Ledger (Round 2 / Cycle A Findings)

| ID | Severity | File(s) & Lines | Finding Summary | Impact | Status |
|---|---|---|---|---|---|
| **DOM06-UI-01** | High | `src/features/classes/ClassManager.jsx:363-371, 374-382` | `ClassManager.jsx` gates `<BatchModal>` rendering on lines 363 and 374 behind `{isAdmin && (` instead of `{canSchedule && (`. Legitimate authorized actors (`vice_director`, `opslead`, `manager`) have `isAdmin={false}`, rendering the "Schedule New Batch" and "Edit Batch" buttons completely dead. Technical Admin has `isAdmin={true}`, but their writes are rejected by Firestore rules. | Batch creation and editing completely broken in `ClassManager` for all legitimate operational roles. Deadlocks class scheduling in `ViceDirectorDashboard`. | **VERIFIED** |
| **DOM06-COR-02** | Medium | `src/features/classes/classesRepository.js:181-220` | `transferStudentBetweenClasses` verifies source enrollment and target capacity, but fails to check whether the student is already in `liveTarget.studentIds`. `arrayUnion(enrollmentRecord)` writes a duplicate map object into `target.enrollments`, creating duplicated enrollment cards and corrupting roster history. | Duplicate enrollment records created in target class; student removed from source before realizing they were already in target. | **VERIFIED** |
| **DOM06-GOV-02** | Medium | `src/features/shared/approvalGates.js:341-358`<br>`src/features/classes/TransferModal.jsx:144-174` | `STUDENT_CLASS_TRANSFER` is registered as `APPROVAL_MODES.BLOCKING`, but `TransferModal` executes transfers immediately and logs an envelope. If rejected in `ApprovalInbox`, the transfer is not rolled back. In addition, `eligibleApproverRoles` only permits `APPROVAL_ROLES.OPS_LEAD`, deadlocking tickets at lean satellite branches (G-012) where no Ops Lead exists. | Disconnect between gate mode and execution behavior creates orphan pending tickets; deadlocks approval queue at satellite campuses. | **VERIFIED** |
| **DOM06-SEC-04** | Medium | `src/features/classes/AvailableBatches.jsx:50-57, 209-228`<br>`src/features/classes/AvailableBatchCard.jsx:64, 76-83` | `AvailableBatches` defines `canAdminister` to include `opslead`, `manager`, and `admin`. `AvailableBatchCard` renders "Delete Batch" whenever `canAdminister` is true. Under `firestore.rules:767`, only executives (`isDirector() || isViceDirector()`) can delete classes. Non-executive attempts crash with `permission-denied`. | Non-executives shown a functional Delete button that invariably fails with runtime permission-denied errors. | **VERIFIED** |
| **DOM06-GOV-03** | Medium | `src/features/classes/EnrollModal.jsx:36-53, 90-103` | `EnrollModal` "Transfer" mode filters candidate classes across `allClasses` without checking campus branch isolation (`cls.branchId === batch.branchId`). Cross-branch classes appear in transfer candidates, which fail upon update under rules. Furthermore, transfers executed in `EnrollModal` omit creating/submitting the `STUDENT_CLASS_TRANSFER` audit envelope. | Cross-branch transfer attempts fail with permission errors; lateral transfers in `EnrollModal` bypass the dual-control audit envelope required by governance. | **VERIFIED** |

---

### 7.4 Adversarial Attack & Verification Matrix (R2)

| Test ID | Scenario / Vector | Target Boundary | Expected Outcome | Actual Observed |
|---|---|---|---|---|
| **ATT-06-01** | Vice Director schedules new batch in `ClassManager` | `ClassManager.jsx:230, 363` | Modal opens, batch created in `/classes` | **FAIL:** Modal does not render; `{isAdmin && (` check blocks execution (`DOM06-UI-01`). |
| **ATT-06-02** | Transfer student to batch where already enrolled | `classesRepository.js:181` | Transaction aborts with error | **FAIL:** Student removed from source, duplicate enrollment object added to target (`DOM06-COR-02`). |
| **ATT-06-03** | Transfer student at satellite branch (Bone Bolango) | `approvalGates.js:346` | Ticket routes to Course Manager or logs cleanly | **FAIL:** Ticket routes to `opslead`, deadlocked permanently at satellite branch (`DOM06-GOV-02`). |
| **ATT-06-04** | Ops Lead or Manager clicks "Delete Batch" in `AvailableBatches` | `AvailableBatchCard.jsx:76` | Delete button hidden for non-executives | **FAIL:** Delete button rendered, confirmation prompted, crashes with `permission-denied` (`DOM06-SEC-04`). |
| **ATT-06-05** | Executive opens `EnrollModal` and selects cross-branch transfer | `EnrollModal.jsx:36` | Cross-branch cohorts excluded from candidate list | **FAIL:** Candidate list includes all branches; update fails with `permission-denied` (`DOM06-GOV-03`). |
| **ATT-06-06** | Front Office attempts direct class creation via client write | `firestore.rules:764` | `allow create` rejects non-authorized role | **PASS:** Rejected with `permission-denied` (132/132 emulator pass). |
| **ATT-06-07** | Admin attempts direct class update or deletion | `firestore.rules:766, 767` | Rules reject technical Admin write | **PASS:** Rejected with `permission-denied` (emulator line 3438). |
| **ATT-06-08** | Front Office enrolls student beyond `maxCapacity` via direct write | `firestore.rules:741` | `canUpdateClass` checks `studentIds.size() <= maxCapacity` | **PASS:** Rejected with `permission-denied` (DOM06-SEC-02 fix verified). |

---

### 7.5 Prioritized Remediation Plan & Implementation Roadmap

1. **Fix `DOM06-UI-01` (ClassManager Modal Gating):**
   - In `src/features/classes/ClassManager.jsx:363` and `374`:
     Replace `{isAdmin && (` with `{canSchedule && (`.
2. **Fix `DOM06-COR-02` (Duplicate Enrollment Guard):**
   - In `src/features/classes/classesRepository.js:181-189`:
     Add guard:
     ```javascript
     const targetStudentIds = liveTarget.studentIds || [];
     if (targetStudentIds.includes(studentId)) {
       throw new Error("Student is already enrolled in the target class.");
     }
     ```
3. **Fix `DOM06-GOV-02` (Gate Mode Alignment & Lean Branch Routing):**
   - In `src/features/shared/approvalGates.js:341-358`:
     Set `mode: APPROVAL_MODES.LOGGED`.
     Update `eligibleApproverRoles` to include `[APPROVAL_ROLES.OPS_LEAD, APPROVAL_ROLES.DIVISION_MANAGER, APPROVAL_ROLES.VICE_DIRECTOR, APPROVAL_ROLES.DIRECTOR]`.
     In `createApprovalEnvelope`, add dynamic approver resolution for `STUDENT_CLASS_TRANSFER`: if requester branch is a lean satellite branch (`isLeanSatelliteBranch(approverBranchId)`), route `approverRole` to `APPROVAL_ROLES.DIVISION_MANAGER`.
4. **Fix `DOM06-SEC-04` (Restrict Delete Batch Button to Executives):**
   - In `src/features/classes/AvailableBatches.jsx:50-58`:
     Separate `canAdminister` (batch create/edit: Ops Lead, Division Manager, Executives) from `canDelete` (executives only: `role === "director" || role === "vice_director"`).
   - In `AvailableBatchCard.jsx`:
     Pass `canDelete` prop and gate the `onDeleteBatch` button on `canDelete`.
5. **Fix `DOM06-GOV-03` (Branch Isolation & Audit Envelope in EnrollModal):**
   - In `src/features/classes/EnrollModal.jsx:36-53`:
     Filter `transferCandidates` to ensure `cls.branchId === batch.branchId`.
   - In `src/features/classes/EnrollModal.jsx:90-103`:
     Submit `STUDENT_CLASS_TRANSFER` audit envelope on transfer.

---

### 7.6 Verdict & Readiness Assessment (Pre-Remediation)
- **Domain 6 Round 2 Initial Assessment:** `BLOCKED BY SECURITY-CORRECTNESS ISSUE` (Remediated below in §8).

---

## 8. Remediation & Closure Verification (Cycle B — 2026-10-13)

### 8.1 Implemented Remediations

1. **`DOM06-UI-01` (ClassManager Modal Gating & Admin Stripping):**
   - In `src/features/classes/ClassManager.jsx`:
     - Replaced `{isAdmin && (` on lines 363 & 374 with `{canSchedule && (` for `<BatchModal>`.
     - Stripped `(isAdmin && role === "admin")` from `canSchedule` and `canEnroll` per ADR Decision 1.
     - Removed unused `isAdmin` prop destructuring.

2. **`DOM06-COR-02` (Duplicate Target Enrollment Guard):**
   - In `src/features/classes/classesRepository.js:181-189`:
     - Added strict guard inside `runTransaction`:
       ```javascript
       const targetStudentIds = liveTarget.studentIds || [];
       if (targetStudentIds.includes(studentId)) {
         throw new Error("Student is already enrolled in the target class.");
       }
       ```
     - Added regression unit test verifying transaction aborts with exact error when student is already in target class.

3. **`DOM06-GOV-02` (Two-Step Dual-Control Class Transfer Workflow):**
   - In `firestore.rules:269`:
     - Delegated to `firestore-rules-author` subagent to expand `gateAllowsApprover('STUDENT_CLASS_TRANSFER', ...)` to include `manager`, `director`, `vice_director` alongside `opslead`.
   - In `src/features/shared/approvalGates.js`:
     - Set `approverRole: "dynamic_branch"`, `primaryController: "dynamic_branch"`.
     - Added `getStudentTransferApprover` helper implementing ratified ADR 2026-10-13:
       - Main Campus (`kota_gorontalo`): `opslead`
       - Satellite Campuses (`bone_bolango`, `limboto`, `pohuwato`): Course Division Manager (`manager`) per G-012 amendment.
       - Maker conflict / absence: escalates to `vice_director`.
   - In `src/features/classes/TransferModal.jsx`:
     - Converted lateral transfer into blocking approval request submission via `createApprovalEnvelope` and `submitApprovalRequest`. Student remains in source cohort until approved.
   - In `src/features/classes/EnrollModal.jsx`:
     - Converted lateral transfer mode into blocking approval request submission.
   - In `src/features/shared/ApprovalInbox.jsx`:
     - Wired execution of `STUDENT_CLASS_TRANSFER` tickets: upon checker approval, calls `transferStudentBetweenClasses` using payload data and seals envelope with `markApprovalApplied`.

4. **`DOM06-SEC-04` (Delete Batch UI Guard):**
   - In `src/features/classes/AvailableBatches.jsx`:
     - Stripped `role === "admin"` from `canAdminister` and `canEnroll`.
     - Defined `canDelete = role === "director" || role === "vice_director"`.
     - Passed `canDelete` prop and conditionally passed `onDeleteBatch={canDelete ? handleDeleteBatch : undefined}` to `AvailableBatchCard`.
   - In `src/features/classes/AvailableBatchCard.jsx`:
     - Received `canDelete` and gated Delete button behind `{canDelete && onDeleteBatch && (`.
   - In `src/features/classes/ClassManager.jsx`:
     - Restricted `onDeleteClass` prop passed to `CohortRosterTable` to `{isExecutive ? handleDeleteClass : undefined}`.

5. **`DOM06-GOV-03` (EnrollModal Branch Isolation):**
   - In `src/features/classes/EnrollModal.jsx`:
     - Filtered `transferCandidates` to ensure candidate cohort matches `batch.branchId`, preventing cross-branch candidate selection.

---

### 8.2 Verification Evidence & Test Execution Results

| Verification Mechanism | Scope | Result | Details |
|---|---|---|---|
| **Firestore Emulator Suite** (`test:rules`) | Security Rules & Dual-Control | **PASS (132/132)** | 132/132 emulator tests passing in 25.46s; zero expression-ceiling errors. |
| **Unit Test Suite** (`npm test`) | Repository & Logic Tests | **PASS (1,374/1,374)** | 104 test files passed; all 1,374 unit tests green; new transfer & duplicate tests verified. |
| **Typecheck** (`npm run typecheck`) | TypeScript Types | **PASS (0 errors)** | Clean compile via `tsc --noEmit`. |
| **Linter** (`npm run lint`) | ESLint Rules | **PASS (0 errors)** | Zero lint errors or warnings. |
| **Production Build** (`npm run build`) | Vite Production Bundle | **PASS (653ms)** | Built in 653ms, 0 errors. |

---

### 8.3 Final Verdict
- **Domain 6 Post-Remediation Readiness:** **`READY`**
- All 5 findings (`DOM06-UI-01`, `DOM06-COR-02`, `DOM06-GOV-02`, `DOM06-SEC-04`, `DOM06-GOV-03`) are completely resolved, tested, verified, and closed in the bug ledger. Dual-control class transfer workflow operates with full branch-aware separation of duties under zero-cost client-side transactions.
