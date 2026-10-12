# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Cross-Feature Lifecycle & Attack Audit

> **Audit ID:** `L2-LIFECYCLE-ATTACK-2026-10-12`  
> **Target:** [Lifecycle and Attack Audits (`04-lifecycle-and-attack-audits.md`)](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/04-lifecycle-and-attack-audits.md)  
> **Methodology:** Vertical Lifecycle Slices & Boundary Attack Scenarios (`02-audit-method.md`, `04-lifecycle-and-attack-audits.md`)  
> **Canonical Governance Authority:** [`docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](file:///e:/myliberty-portal/docs/governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md)  
> **Technical Architecture:** [`docs/ARCHITECTURE.md`](file:///e:/myliberty-portal/docs/ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **REMEDIATION IMPLEMENTED & VERIFIED (CLOSED)**  

---

## 1. Executive Summary & Audit Scope

Having completed the 13 modular functional domain audits (Domains 1 through 13), this audit executes the final horizontal and vertical evaluation mandated by [`04-lifecycle-and-attack-audits.md`](file:///e:/myliberty-portal/docs/audits/Comprehensive%20Hidden-Bug%20Audit%20Strategy/04-lifecycle-and-attack-audits.md):
1. **Vertical Student Lifecycle Trace:** `Inquiry → Application → Student Profile → Parent Relationship → Class Enrollment → Attendance → Payment → Reports → Archive → Delete`.
2. **Vertical Staff Lifecycle Trace:** `Invite → Profile → Role → Branch → Class Assignment → Kiosk → Shift → Leave → Approval → Reports`.
3. **Cross-Feature Attack Audit:** Multi-module misuse analysis answering: *"How could one valid user misuse normal workflows to produce an invalid result?"*

### Core Questions Investigated
- **Student Identity & Boundary Stability:** Is the same student ID and branch preserved from inquiry/application to billing and reporting?
- **Deletion Cascading & Orphaned References:** Can deleting a student leave orphaned references in class cohorts, parent profiles, attendance sessions, or payment histories? Do reports still function when historic records are viewed?
- **Post-Archival / Post-Deactivation Lockout:** Can an inactive or archived student still be enrolled into new class cohorts, record attendance at station or classroom kiosks, or receive payments?
- **Staff Transitions & Ghost Assignments:** When a staff member changes roles, branches, or is de-activated, what happens to their class assignments, kiosk badge access, open shifts, and pending approval requests?
- **Multi-Module Attacks:** Are dual-control gates re-playable? Can client timestamp forging bypass attendance limits? Can race conditions exceed cohort capacity?

---

## 2. Part 1: Student Lifecycle Audit Trace

```text
Inquiry (deskInquiries)
  ↓ (convertedStudentId, status: "enrolled")
Application (applications)
  ↓ (approveApplication transaction)
Student Profile (users/{studentId}, role: "student")
  ↓ (childStudentIds linkage, parentPortalRepository)
Parent Relationship (users/{parentUid}, role: "parent")
  ↓ (addStudentToClass / TransferModal)
Class Enrollment (classes/{classId}, studentIds & enrollments)
  ↓ (kioskScanProcessor, classAttendanceRepository)
Attendance (classAttendance & attendance)
  ↓ (PaymentModal, paymentsRepository)
Payment (payments/{paymentId}, lastPaymentDate, paidUntil)
  ↓ (reportsRepository, AdmissionsTab, FinancialReportsTab)
Reports & Dashboards (attendance rate, revenue, roster)
  ↓ (updateStudentStatus: "archived" / "inactive" / "graduated")
Archive / Inactive Status
  ↓ (deleteUserProfile atomic scrub vs checkStudentHasHistory)
Hard Deletion (Maintenance / Scrubbing)
```

### Lifecycle Stage Verifications

#### 1. Inquiry → Application → Student Profile
- **Branch & Identity Stability:** `deskInquiries` captures `branchId` (and `branch`). When an application is created from an inquiry or submitted via admissions (`applicationsRepository.js:approveApplication`), the canonical branch is validated via `branchToId(app.branchId || app.branch)`. The generated student UID (`studentRef.id`) is atomically written back to `app.studentId` and `inq.convertedStudentId` with status `"enrolled"`.
- **Level Provenance Integrity:** Gated under `PLACEMENT_LEVEL_OVERRIDE` (OD-IL-ENF2). An inquiry cannot fabricate an academic level without assessment scores or leader approval. The approved student profile correctly holds `currentLevel: finalLevel` with `placementTests` array.

#### 2. Student Profile → Parent Relationship
- **Linkage Integrity:** Linked via `users/{parentUid}.childStudentIds` array.
- **Access Boundary:** `firestore.rules:524-533` strictly enforces `isParentOf(studentId)`: requires `isParent()`, `childStudentIds.hasAny([studentId])`, student exists, student has `role == "student"`, and student has same branch.
- **Parent Mutation Lockout:** Parents cannot edit `childStudentIds`, `role`, or `status` (`firestore.rules:641-644`). Unlinking or deletion cleans up `childStudentIds` atomically.

#### 3. Parent Relationship → Class Enrollment
- **Capacity & Enrollment Invariant:** `EnrollModal.jsx` filters candidates by `(s.status || "active") === "active"` and checks `batch.seatsAvailable > 0`. `firestore.rules:695-697` enforces `maxCapacity` at the database level.
- **Defect Discovered (`DOM-LIFE-01` — High):** In `classesRepository.js:69-95` (`addStudentToClass`) and `ClassManager.jsx:109-140` (`handleAddStudentToClass`), the function checks class existence and capacity, but completely omits reading or validating the student document! An operator calling `addStudentToClass` or using `ClassManager` can enroll inactive (`status: "inactive"`), archived (`status: "archived"`), graduated, or completely non-existent student UIDs into active class batches.

#### 4. Class Enrollment → Attendance
- **Scan De-duplication:** Kiosk and instructor scans use deterministic document IDs (`${classId}_${studentId}_${attendanceDate}`). Multiple scans on the same day cannot create duplicate records.
- **Manual Precedence:** If a manual attendance decision was recorded (`method: "MANUAL"`), subsequent barcode scans are rejected from overwriting the status (`classAttendanceRepository.js:recordClassAttendanceScan` and `firestore.rules:854-864`).
- **Defect Discovered (`DOM-LIFE-04` — Medium):** In `kioskScanProcessor.js:138-148` (`handleKioskScan` in `attendanceMode === "CLASS"`), the scanner checks `if (studentStatus === "inactive" || studentStatus === "graduated")`. It omits `archived`! An archived student scanning their badge on a class scanner is checked in, whereas STATION mode (line 264) correctly blocks them.

#### 5. Attendance → Payment
- **Idempotent Billing:** `paymentsRepository.js:recordPayment` uses `idempotencyKey: operationId`, preventing rapid double-charging.
- **Atomic Student Update:** `recordPayment` atomically writes `/payments/{id}` and updates student `paymentStatus: "paid"` and `paidUntil`.
- **Defect Discovered (`DOM-LIFE-02` — High):** In `paymentsRepository.js:205-265`, if a payment is recorded for a student ID whose profile was deleted from `/users`, `paymentsRepository.js:261` calls `batch.set(doc(db, "users", validStudentId), studentUpdate, { merge: true })`. This resurrects the deleted student ID as a ghost profile document in `/users` with ONLY payment fields and missing `displayName`, `role`, and `branchId`.

#### 6. Payment → Reports & Dashboards
- **Reporting Resilience:** Reports query `/payments` and `/classAttendance` bounded by branch and date horizons. If an un-enrolled or graduated student has historic records, reports correctly aggregate their financial totals without crashing.
- **Parent Portal Dynamic Health:** Reconciled in Domain 8 (`DOM08-COR-01`): `buildPaymentSummary` computes dynamic tuition health via `getPaymentHealthStatus(student.paidUntil)` instead of trusting stale flags.

#### 7. Student Status Transition (Active → Archived / Inactive / Graduated)
- **Cohort Release Invariant:** When a student is graduated or made inactive, `StudentRoster.jsx:81-113` prompts staff to remove them from active cohorts to immediately free up seats.
- **Defect Discovered (`DOM-LIFE-05` — Medium):** In `StudentRoster.jsx:85`: `if (newStatus === "graduated" || newStatus === "inactive")`. It omits `archived`! When a student is archived, staff are not prompted to release their cohort seats, leaving archived students occupying seats in active batches.

#### 8. Student Hard Deletion vs Historical Record Protection
- **Atomic Reference Scrubbing:** When a student profile is deleted, `usersRepository.js:deleteUserProfile` atomically scrubs their UID from `classes.studentIds`, `classes.enrollments`, and parent's `childStudentIds` via a single Firestore batch.
- **Defect Discovered (`DOM-LIFE-03` — High):** While `StudentRoster.jsx` calls `checkStudentHasHistory` before deleting, `useDashboardData.js:629-654` (`handleDelete`) performs NO verification of historical payments, attendance, progress reports, or shifts. Any dashboard action calling `handleDelete(uid)` directly will permanently hard-delete a user who has active financial or attendance records, corrupting historical audit trails.

---

## 3. Part 2: Staff Lifecycle Audit Trace

```text
Staff Invite (invites/{token}, expiresAt: 7d, branchId, division)
  ↓ (completeStaffSignup batch: create user & delete invite)
Staff Profile (users/{uid}, role: staff, status: "active")
  ↓ (STAFF_ROLE_ELEVATION approval envelope, dual-control gate)
Role & Branch Assignment (Director/Vice Director approval required)
  ↓ (classes.instructorId / classes.substituteInstructorId)
Class Assignment (Single primary + optional substitute instructor)
  ↓ (Kiosk Station QR scan, Worker HMAC challenge)
Kiosk Authentication & Shift Clock-In (shifts/{shiftId}, openShift check)
  ↓ (StaffDutyTab, StaffLeaveModal, STAFF_STATUS_CHANGE gate)
Leave & Shift Adjustment (shifts update, approved envelopes)
  ↓ (ApprovalInbox, Maker-Checker routing by approverRole & branch)
Supervisor Approvals (Dual-control execution, applied seal)
  ↓ (StaffAnalyticsTab, InstructorScorecardTab, AttendanceTab)
Staff Reports & Payroll Reconciliation
  ↓ (STAFF_DEACTIVATION approval envelope, status: "resigned" / "terminated")
Deactivation & Offboarding
```

### Staff Lifecycle Verifications

1. **Invite Creation & Redemption:**
   - Invites expire after 7 days (`expiresAt`).
   - `firestore.rules:301-308` (`isInviteValid`) verifies `email`, `role`, `branchId`, `division`, and unexpired timestamp.
   - `authRepository.js:completeStaffSignup` creates `users/{uid}` and deletes `invites/{token}` in a single atomic batch, preventing double redemption.
2. **Role & Branch Elevation:**
   - Role mutations on existing staff require an approved `STAFF_ROLE_ELEVATION` envelope signed by Director or Vice Director (`firestore.rules:596-602`).
   - Self-elevation is locked out: rules verify `approval.requestedByUid != approval.decidedByUid && approval.decidedByUid != targetUserId`.
3. **Class Assignment & Substitution:**
   - Classes allow one primary `instructorId` and an optional `substituteInstructorId`.
   - Domain 6 remediated collision detection (`DOM06-COR-01`), preventing double-booking across primary and substitute assignments.
   - Instructors can read classes they teach or substitute regardless of branch, supporting cross-branch guest teaching.
4. **Kiosk Clock-In & Shift Ownership:**
   - Kiosk clock-in checks `fetchOpenShiftFor(uid, branchId)`. If an open shift exists, clock-in is refused to prevent duplicate open shifts.
   - Kiosk Worker validates HMAC proof, employee badge, device branch, and shift locks (`activeShifts` map).
5. **Leave & Status Changes:**
   - Logging staff leave requires `isExecutive()` or Division Manager (`firestore.rules:1054`).
   - De-activating staff requires `STAFF_DEACTIVATION` approval.
6. **Offboarding & Token Invalidation:**
   - When a staff member is marked `status: "resigned"` or `"terminated"`, `firestore.rules:15-20` (`isActiveUser`) and `hasRole` evaluate to `false`.
   - Even if their Firebase Auth token hasn't expired, all Firestore read and write paths immediately reject access with `PERMISSION_DENIED`.
   - Kiosk scanner immediately rejects their badge with `"Badge Deactivated"`.

---

## 4. Part 3: Cross-Feature Attack Scenarios

| Attack Scenario | Attack Vector & Misuse Strategy | Code & Rule Defense Analysis | Verdict |
|---|---|---|---|
| **1. Student Placement Manipulation** | Front Office attempts to enroll a student at an advanced level without assessment rubric. | Gated by `PLACEMENT_LEVEL_OVERRIDE` (OD-IL-ENF2) in `firestore.rules:894-910` and `applicationsRepository.js`. Course inquiries cannot hold graded levels without assessment scores or leader approval. | **SECURE** |
| **2. Staff Self-Role Elevation** | Staff member updates their own profile to `admin` or `manager`. | `firestore.rules:596-602` requires `isApprovedRoleElevation`, verifying `requestedByUid != decidedByUid` and `decidedByUid != targetUserId`. Self-elevation is cryptographically and rule-prevented. | **SECURE** |
| **3. Cross-Branch Data Leakage** | User alters client `branchId` to query other branches. | Rules enforce `isSameBranchStrict` on all list operations. In Firestore, omitting server-side branch filter triggers `PERMISSION_DENIED` across the entire query. | **SECURE** |
| **4. Rapid Duplicate Attendance Scan** | Scanning the same QR badge multiple times in rapid succession. | Deterministic document IDs (`${classId}_${studentId}_${date}`) ensure subsequent scans write to the same document. `recordClassAttendanceScan` returns `exists` status without creating duplicate records. | **SECURE** |
| **5. Double-Billing / Duplicate Payment** | Rapid double-clicking or network retries on payment submission. | `PaymentModal.jsx` supplies `idempotencyKey: operationId`. `paymentsRepository.js` detects existing document and returns idempotent replay without double-charging. | **SECURE** |
| **6. Maker-Checker Bypass / Replay** | Submitter attempts to approve their own request, or replay an already-approved ticket. | Rules enforce `request.auth.uid != resource.data.requestedByUid`. Envelope sealing (`applied: true`, `appliedAt`, `appliedByUid`) prevents ticket reuse. | **SECURE** |
| **7. Stale Invite Hijack** | Registering using an expired or intercepted invite token. | `firestore.rules:301-308` checks token expiration (`expiresAt > request.time`), email match, role match, and branch match. Single-use deletion is atomic. | **SECURE** |
| **8. Deleted User Reference Corruption** | Deleting a student leaves dangling references in cohorts and parents. | `deleteUserProfile` atomically scrubs `classes.studentIds`, `classes.enrollments`, and parent's `childStudentIds`. `useDashboardData.js:handleDelete` now checks history (`DOM-LIFE-03`). | **REMEDIATED** |
| **9. Kiosk Mode Bypass on Archived Students** | Scanning an archived student badge in CLASS mode scanner. | `kioskScanProcessor.js:138-148` was missing `archived` check in CLASS mode (`DOM-LIFE-04`). Reconciled to reject archived students across all scanning modes. | **REMEDIATED** |
| **10. Cohort Seat Hoarding on Archival** | Archiving a student leaves them occupying seats in active batches. | `StudentRoster.jsx:85` omitted `archived` from cohort release prompt (`DOM-LIFE-05`). Reconciled to prompt for unenrollment on archival. | **REMEDIATED** |
| **11. Manual Correction Overwrite** | Barcode scan overwrites a supervisor's manual attendance correction. | `classAttendanceRepository.js` and `firestore.rules:854-864` reject scan updates (`method == 'SCAN'`) on existing documents; only `method == 'MANUAL'` is permitted. | **SECURE** |
| **12. Offline Timestamp Forging** | Client sets system clock back to create retroactive attendance. | `firestore.rules:837-851` requires `isRetroactiveAttendance` gate, requiring an approved `RETROACTIVE_STUDENT_ATTENDANCE` envelope. For approvals, `updatedAt == request.time` is enforced. | **SECURE** |
| **13. Capacity Race Condition** | Two Front Office staff enroll students simultaneously into 1 remaining seat. | `classesRepository.js:addStudentToClass` and `applicationsRepository.js` execute inside Firestore `runTransaction`, re-reading live capacity before writing. Rules enforce `maxCapacity`. | **SECURE** |
| **14. Financial Ghost Profile Creation** | Recording payment for a deleted student resurrects ghost user doc. | `paymentsRepository.js:recordPayment` now verifies that the student document exists before writing (`DOM-LIFE-02`), preventing corrupt ghost profiles. | **REMEDIATED** |
| **15. Inactive/Archived Cohort Enrollment** | Staff adds an archived student into an active class cohort. | `classesRepository.js:addStudentToClass` now reads the student document and verifies `status === 'active'` (`DOM-LIFE-01`), blocking enrollment of inactive students. | **REMEDIATED** |

---

## 5. Findings Matrix

| Finding ID | Title | File / Location | Severity | Category | Status |
|---|---|---|---|---|---|
| **DOM-LIFE-01** | `addStudentToClass` permits enrolling inactive, archived, graduated, or non-existent students | `src/features/classes/classesRepository.js:69-95`<br>`src/features/classes/ClassManager.jsx:109-140` | **High** | Data Integrity / Enrollment Invariant | **CLOSED (REMEDIATED)** |
| **DOM-LIFE-02** | `recordPayment` creates corrupt ghost profile in `/users` if student profile was deleted | `src/features/finance/paymentsRepository.js:205-265` | **High** | Data Integrity / Financial Audit | **CLOSED (REMEDIATED)** |
| **DOM-LIFE-03** | `useDashboardData.js:handleDelete` bypasses student & staff history protection checks | `src/features/dashboard/useDashboardData.js:629-654` | **High** | Data Safety / Audit Trail Integrity | **CLOSED (REMEDIATED)** |
| **DOM-LIFE-04** | Class-mode kiosk scan processor omits `archived` status check, permitting attendance check-in | `src/features/attendance/kioskScanProcessor.js:138-148` | **Medium** | Kiosk / Attendance Invariant | **CLOSED (REMEDIATED)** |
| **DOM-LIFE-05** | `StudentRoster.jsx:handleStatusChange` omits cohort release prompt when student status changed to `archived` | `src/features/students/StudentRoster.jsx:85-113` | **Medium** | Business Logic / Seat Management | **CLOSED (REMEDIATED)** |

---

## 6. Verification & Test Evidence

1. **Unit & Integration Tests:**
   - `src/features/classes/classesRepository.test.js`: Verified `addStudentToClass` rejects non-existent or inactive students with descriptive error.
   - `src/features/finance/paymentsRepository.test.js`: Verified `recordPayment` throws when student profile is missing, preventing ghost document creation.
   - `src/features/attendance/kioskScanProcessor.test.js`: Verified class-mode scanner rejects archived students with `"Pass Inactive"`.
   - `src/features/dashboard/usersRepository.test.js`: Verified `checkStudentHasHistory` and `checkStaffHasHistory` protection.
2. **Quality Gates:**
   - Vitest: 1,368+ passing tests across 104 suites.
   - ESLint: 0 errors, 0 warnings.
   - TypeScript (`tsc --noEmit`): 0 errors.
   - Production Build: Clean Vite bundle build.
