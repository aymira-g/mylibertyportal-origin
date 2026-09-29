# MyLiberty Portal — Comprehensive Hidden-Bug Audit

**Audit date:** 2026-09-29  
**Repository snapshot:** `myliberty-portal` from uploaded archive `myliberty-portal(1).zip`  
**Audit method:** `docs/audits/Comprehensive Hidden-Bug Audit Strategy` (Level-2 Deep Audit)  
**Mode:** Audit-only; no production source files were modified.

---

## 1. Executive summary

I audited the repository against its own documented contracts first, then traced the implementation through the Level-2 hidden-bug strategy's high-risk domains: authentication/roles, branch/rules, kiosk/attendance, payments, students/parents, classes/rosters, corporate events/shifts/leave, reports, PWA/network boundaries, approvals/audit, and cross-feature handoffs.

### Overall result

The current snapshot is materially hardened in several areas compared with older audit baselines, but there are still **multiple high-impact trust-boundary and concurrency defects** that should be treated as pre-release issues.

### Finding totals

| Severity | Count | Notes |
|---|---:|---|
| **Critical** | 1 | Parent linkage can become a cross-branch data-access path through current Firestore rules. |
| **High** | 10 | Kiosk challenge replay race, worker validation gaps, shift lock deadlock, class-switch fallback/non-atomicity, attendance/rules integrity gaps, corporate-event audience leak, parent status bypass, archived-child lifecycle leak, plus related high-impact trust-boundary defects. |
| **Medium** | 7 | Concurrency/retry issues, legacy enrollment/rules mismatch, reporting branch defaults, unbounded event reads, substitute-report rule mismatch, branch-scoped archival gap, and related operational correctness gaps. |
| **Low / hygiene** | 3 | Mostly operational hardening and test-coverage gaps; not release blockers by themselves. |

**Important:** The severity labels above are based on the audit strategy's impact categories, not on whether a defect has already been exploited in production. Runtime proof is still required for the findings explicitly marked as needing emulator/device validation.

---

## 2. Canonical source-of-truth documents read first

Before inspecting implementation behavior, the following repository-defined authorities were read:

### Root and governance

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/decisions/README.md`
- `docs/decisions/multi-branch-data-boundary.md`
- `docs/specs/README.md`

### Canonical architecture and specifications

- `docs/ARCHITECTURE.md`
- Parent + Student Roster Model specification
- Parent-Link Fix specification
- Attendance / ClassAttendance Integration Specification (v4)
- Hybrid Quick-Switch / Real Auth vs Preview specification
- Current shared design-language specification

### Current audit baseline and hidden-bug procedure

- `docs/audits/current/README.md`
- current reconciled audit documents
- all files under `docs/audits/Comprehensive Hidden-Bug Audit Strategy/`

The audit strategy was applied as a procedure, not as a list of assumptions. Where older audit prose conflicts with the current source snapshot, the **current implementation and current rules are treated as ground truth**.

---

## 3. Verification performed

### Static verification

- Repository archive extracted and inspected.
- `README.md` and canonical specification chain read before implementation review.
- **188 JavaScript files** checked with `node --check`: **0 syntax errors**.
- Cloudflare Worker syntax checked separately: **PASS**.
- Cross-file tracing performed for the main trust boundaries and the strategy's edge-case matrix.

### Runtime verification limitation

The archive does not contain a complete usable dependency installation.

- `npm ci --no-audit --no-fund` could not complete within the available execution window.
- The repository's test command therefore could not start normally because `vitest` was unavailable in the local installation.
- Firestore emulator tests were **not executed**.
- No physical kiosk/device validation was possible from the archive.

Therefore this report deliberately distinguishes **verified from source** defects from **runtime-only checks still required**.

---

# 4. Findings

## CRITICAL

### HBA-C01 — Parent child-link rules allow cross-branch data access

**Domain:** Parent / Student / Branch security  
**Confidence:** High (static proof; emulator proof still recommended)

#### Observed implementation

`firestore.rules` allows Front Office users to update a parent document's `childStudentIds` while validating the parent's branch, but does **not** validate every newly linked child against:

- target role == `student`
- target student's branch == parent's branch
- target student's active/eligible state

The relevant rule currently permits `childStudentIds` as an affected field in the Front Office parent-update branch.

At the same time, `isParentOf(studentId)` only checks whether the student UID is present in the authenticated parent's `childStudentIds`. It does not re-check branch consistency.

The parent-facing read rules then use that relationship to allow access to:

- the linked student profile
- classes containing that student
- classAttendance for that student
- payments for that student
- progress reports for that student

#### Hidden-bug scenario

1. A Front Office operator in Branch A knows a student UID belonging to Branch B.
2. The operator links that UID to a Branch-A parent.
3. Firestore accepts the parent-link update because the **parent** is Branch A.
4. The parent can then read Branch-B student data through the relationship-based rules.

The same structural problem also affects parent creation when arbitrary initial child IDs are accepted by the client and rules do not validate the child document's branch/role.

#### Why this matters

This is a genuine branch-isolation failure because the authorization boundary is based on a relationship that the staff client is permitted to mutate without target-child validation.

#### Recommended fix

Make the rule validate each child UID against the referenced `users/{childId}` document before permitting a parent-link mutation. At minimum require:

- referenced user exists
- role == `student`
- student branch matches parent branch
- status is eligible for parent linkage

Also enforce the same invariant in the parent-creation path and add emulator tests for a foreign-branch child-link attempt.

#### Regression test

`frontoffice branch A + parent branch A + student branch B -> linkChildToParent(...) must fail`.

---

## HIGH

### HBA-H01 — Kiosk challenge consumption is not actually atomic

**Domain:** Kiosk / Cryptographic trust boundary  
**Confidence:** High (source proof)

The Worker describes challenge consumption as atomic, but the implementation performs:

1. read challenge
2. check `consumed`
3. set an in-memory `consumed` flag
4. write Firestore
5. delete Firestore document

This is not a Firestore transaction or compare-and-swap operation.

Relevant logic appears in the clock-in, clock-out, and class-switch handlers. Two Cloudflare Worker isolates can both read the same unconsumed nonce before either has persisted the consumed state.

#### Impact

A valid signed request can potentially be accepted more than once when requests race across Worker isolates. The practical impact is duplicate or conflicting shift state and a weakened single-use challenge guarantee.

#### Recommended fix

Use an actual atomic Firestore state transition:

- transaction with a consumed flag and nonce validation, or
- conditional update using the document's update-time/precondition semantics.

Do not rely on per-isolate memory for the security property.

#### Required proof

Add a worker concurrency test that submits the same signed challenge concurrently and asserts exactly one success.

---

### HBA-H02 — Worker does not fail closed when class/event documents are missing

**Domain:** Worker / Server-authoritative validation  
**Confidence:** High (source proof)

The kiosk Worker fetches the referenced class/event but only applies validation when the document is found.

For a normal class:

- if `classes/{classId}` is missing, the request continues using the client-supplied `className`.

For a corporate event:

- if `corporateEvents/{eventId}` is missing, the request continues instead of rejecting the reference.

#### Impact

A valid kiosk proof can be attached to a shift containing a non-existent class/event reference. This weakens the server-authoritative data model and can poison reporting/integration data.

#### Recommended fix

Require the referenced document to exist whenever a non-general class or corporate event is supplied. Reject missing references before creating the shift.

---

### HBA-H03 — Worker does not bind scanned user branch to kiosk device branch

**Domain:** Kiosk / Multi-branch boundary  
**Confidence:** High (source proof)

The Worker derives the employee from `badgeToken`, but stamps the resulting shift with the kiosk device's `branchId`. There is no explicit equality check that the employee's own branch matches the physical kiosk branch.

#### Hidden-bug scenario

A staff credential from Branch B is successfully scanned at a Branch-A kiosk with a valid device signature. The Worker can create the shift as a Branch-A record.

#### Impact

Cross-branch shift attribution can be created even though the device is branch-bound.

#### Recommended fix

Require the derived staff profile's canonical branch to equal the device branch before permitting clock-in/class-switch. Preserve a documented exception only if cross-branch temporary duty is a real business rule.

---

### HBA-H04 — Kiosk `activeShifts` lock can become permanently stuck after partial failure

**Domain:** Kiosk / Failure matrix / Concurrency  
**Confidence:** High (source proof)

The Worker correctly uses an atomic document-ID precondition to acquire the single-open-shift lock. However, it writes an `activeShifts/{uid}` record with `status: "opening"` **before** creating the actual shift.

If shift creation fails after the lock succeeds, the code does not reliably clean up the `opening` lock.

The later conflict branch expects an existing lock to point to a `shiftId`; an `opening` lock with no `shiftId` can therefore block subsequent clock-ins.

#### Impact

A transient Firestore failure can create a durable kiosk availability failure for one staff member until the lock is manually repaired.

#### Recommended fix

Use a transactional/state-machine design with explicit recovery:

- lock state with timestamp/lease
- rollback on shift-create failure
- stale `opening` detection with safe takeover
- or an atomic write that creates both state records together.

Add a failure-injection test for `lock acquired -> shift write fails`.

---

### HBA-H05 — Class switch is not actually atomic and still has a client-side fallback

**Domain:** Kiosk / Shift lifecycle  
**Confidence:** High (source proof)

The normal Worker class-switch endpoint performs:

1. close previous shift
2. create new shift
3. update active-shift pointer

Those are separate Firestore REST calls, not one transaction/batch.

If step 1 succeeds and step 2 fails, the employee can be left without the intended replacement open shift.

In addition, `useKioskScanner.js` still falls back to `switchClassAtomic(...)` when the Worker/crypto path is unavailable. That fallback writes directly from the client.

#### Impact

This creates both:

- a server-side partial-failure window, and
- a client-side bypass of the server-authoritative kiosk proof model.

#### Recommended fix

- Remove the direct kiosk class-switch fallback.
- Fail closed when the Worker/crypto path is unavailable.
- Implement the server-side class switch as a transaction/Cloud Firestore commit with a deterministic recovery model.

---

### HBA-H06 — Class-attendance manual update does not restrict all mutable fields

**Domain:** Attendance / Data integrity  
**Confidence:** High (source proof)

The `classAttendance` update rule correctly protects the immutable identity fields (`classId`, `studentId`, `attendanceDate`) and requires `method == MANUAL`, but it does **not** use an `affectedKeys().hasOnly(...)` restriction.

That means a manual update can potentially change other fields that are not part of the intended correction payload, including branch metadata and audit/display timestamps.

#### Impact

A legitimate manual correction path can become a data-integrity path for branch/report/audit fields.

#### Recommended fix

Lock manual updates to the explicit business-edit fields, e.g.:

- `status`
- `note`
- `markedBy`
- `markedByName`
- `markedAt`
- `updatedAt`

Keep branch/class/student identity and creation metadata immutable.

---

### HBA-H07 — Several Firestore writes trust client-supplied target identity without target-branch validation

**Domain:** Branch security / Client trust  
**Confidence:** High (source proof)

The current rules validate the **record's** branch in several collections but do not consistently validate the branch of the referenced target user.

Examples:

- `/attendance` creation checks the created document's branch and `roleOf(userId) == student`, but not the target student's branch.
- `/payments` creation checks the payment document's branch and studentId presence, but not the target student's branch/role.
- `/shifts` creation checks the shift's branch and target role, but not the target user's branch.
- `/classes` roster updates allow `studentIds` / `enrollments` changes without validating that each referenced user is a same-branch student.

#### Impact

Authorized branch staff can create cross-branch or cross-account records by supplying a foreign UID while keeping the written record's branch local.

#### Recommended fix

Move target-identity checks into rules wherever practical, especially for security-sensitive collections. At minimum validate:

- target exists
- target role is correct
- target branch matches the record/class branch
- target status is eligible

Then add explicit cross-branch negative tests to the emulator suite.

---

### HBA-H08 — Corporate-event rules ignore audience targeting for reads

**Domain:** Corporate Events / Branch & role confidentiality  
**Confidence:** High (source proof)

`corporateEvents` currently uses:

`allow read: if isStaff();`

This ignores the document's `audienceType` / `audienceValue` for read access.

The repository does support audience types such as `all`, `branch`, `role`, and `division`, but the current rule does not apply those constraints when staff read the collection.

The client also subscribes to the full event collection without a limiting query.

#### Impact

A branch/role/division-targeted event can be visible to staff outside its intended audience, and the entire event history can be downloaded by ordinary staff queries.

#### Recommended fix

Either:

1. enforce audience-specific authorization at the rule/query boundary, or
2. split broad internal calendar metadata from restricted operational events into separate collections with distinct access policies.

Also align list queries with the security model; do not rely on UI filtering.

---

### HBA-H09 — Parent account `inactive` status is not part of parent authorization

**Domain:** Parent portal / Account lifecycle  
**Confidence:** High (source proof)

The rules define `isActiveUser()` for staff roles, but `isParent()` is implemented as only:

- signed in
- `role == parent`

It does not call `isActiveUser()`.

The parent profile UI explicitly supports `active` and `inactive` / suspended states, yet the Firestore relationship-based read rules continue to authorize an inactive parent.

The parent portal UI also routes an authenticated `role == parent` user directly into `ParentDashboard` without a status gate.

#### Impact

Marking a parent account inactive does not actually revoke access to linked student data.

#### Recommended fix

Make parent authorization status-aware at the rule boundary, then mirror the same state in the UI for immediate feedback. Add emulator tests for inactive-parent access to:

- child profile
- classes
- class attendance
- payments
- progress reports.

---

### HBA-H10 — Archived students can remain parent-linked and visible in the parent portal

**Domain:** Student lifecycle / Parent portal  
**Confidence:** High (source proof)

`archiveStudentProfile()` removes the student from class rosters, but it does not remove the student UID from parent `childStudentIds`.

`getAuthenticatedParentBundle()` then loads linked children directly and does not filter out archived students.

The parent rules also authorize linked-child reads based on the relationship itself.

#### Impact

An archived/withdrawn student can continue to appear in a parent's portal and remain accessible through the parent authorization relationship.

#### Recommended fix

Define a lifecycle policy explicitly:

- either archived students remain intentionally visible as historical children, or
- parent portal hides/removes them and rules prohibit active-child data access.

If historical visibility is intended, separate historical data from operational student access rather than relying on `status` alone.

Also update archival logic to maintain parent-link integrity according to that policy.

---

## MEDIUM

### HBA-M01 — Class attendance scan is read-then-write instead of an atomic create

`recordClassAttendanceScan()` first reads the deterministic document, then uses `setDoc()` if it does not exist.

This is structurally non-atomic under concurrent scanners. Current rules help prevent a second SCAN from overwriting an existing record, but the client may still experience rejected writes and retry loops when two devices race.

**Fix:** use a Firestore create precondition or transaction, and explicitly test two simultaneous scans.

---

### HBA-M02 — Class close-out race handling assumes `batch.set()` behaves like a create

`closeOutClassAttendance()` comments that a racing scan will make the batch fail with `already-exists`, but `batch.set()` without an `exists:false` precondition is not create-only semantics.

Depending on rule evaluation and commit timing, the operation can instead become an update attempt or be rejected by the `classAttendance` update rule. This is not the safe, deterministic race behavior described by the repository comment.

**Fix:** use explicit create semantics for each close-out record, or use a transaction/retry strategy that only writes records proven to be absent at commit time.

---

### HBA-M03 — Legacy `enrollments` fallback exists in the app but not in Firestore rules

The attendance class-resolution logic intentionally falls back from `studentIds` to legacy `enrollments` when the former is absent/empty.

The Firestore rule helper `studentIsEnrolled()` only checks `studentIds`.

#### Result

A legacy class can be correctly resolved in the UI yet still have its attendance write rejected by Firestore.

**Fix:** either migrate all legacy classes or make the rule helper support the same canonical compatibility path.

---

### HBA-M04 — Instructor and Front Office reports can default to the wrong branch

`ReportsDashboard` defaults branch-scoped non-admin views to `Kota Gorontalo` unless `userBranch` is passed.

Several role dashboards instantiate `ReportsDashboard` without supplying the user's branch, including the generic instructor dashboard and the kindergarten instructor/front-office dashboards.

#### Impact

A non-Kota branch user can load reports with a Kota Gorontalo filter, producing empty/partial data or confusing branch-specific reports.

**Fix:** derive branch from the authenticated profile inside the report layer rather than trusting callers to remember the prop; lock branch scope server-side as already done in rules.

---

### HBA-M05 — Corporate-event reads are unbounded

`fetchCorporateEvents()` and `subscribeCorporateEvents()` read the entire collection ordered by date with no `limit()` and no date window.

As the operational calendar grows, every subscriber can re-read the full historical event collection.

**Impact:** Firestore read/quota growth and unnecessary kiosk/dashboard traffic.

**Fix:** split active/upcoming events from history or constrain queries to a bounded window.

---

### HBA-M06 — Progress report creation does not recognize substitute instructors

The class model supports `substituteInstructorId`, and class reads recognize both primary and substitute assignment. However, the `progressReports` create rule checks only:

`classes/{classId}.instructorId == request.auth.uid`

A legitimate substitute instructor can therefore be blocked from creating a progress report for a class they are assigned to cover.

**Fix:** include the documented substitute/leader authorization path in the rule and test it.

---

### HBA-M07 — Student archival can miss legacy branchless class documents

`archiveStudentProfile()` adds a `where("branchId", "==", branchId)` filter when a branch is passed. Legacy class records without `branchId` are consequently excluded from the cleanup query.

The code can therefore mark the student archived while leaving stale roster references behind in legacy branchless class documents.

**Fix:** perform a controlled legacy migration or explicit second cleanup path for branchless legacy documents.

---

## LOW / HARDENING

### HBA-L01 — Kiosk rate limiting is per Worker isolate

The challenge endpoint uses in-memory maps for rate limiting. This is useful as a local burst limiter but is not a globally enforceable rate limit on Cloudflare's multi-isolate execution model.

Do not treat it as the primary abuse-prevention control.

### HBA-L02 — Kiosk audit logging is best-effort

Several Worker paths swallow audit-log write failures with `.catch(() => {})` or equivalent behavior.

Operational actions can therefore succeed without a corresponding kiosk audit event. This does not necessarily break authorization, but it weakens forensic completeness.

### HBA-L03 — Report and history repositories contain intentionally unbounded admin paths

Several admin-mode reporting functions intentionally query full collections when no branch filter is supplied. This is consistent with admin cross-branch access but should be monitored for free-tier read growth and eventually paginated/windowed as data volume increases.

---

# 5. Cross-feature interaction findings

The strategy specifically requires cross-feature handoff review. The most important interactions found are:

### Parent linkage → branch isolation

The parent relationship is a security capability, not just UI metadata. Because the relationship can currently be mutated without validating the target child's branch, the parent portal becomes an unintended cross-branch access bridge.

### Kiosk proof → Firestore lifecycle

The Worker correctly moved identity derivation server-side, but its nonce state is not atomically consumed and its branch/class/event checks are incomplete. Cryptographic proof therefore establishes **device possession**, but not yet the full business authorization context.

### Kiosk shift lock → partial failure

The system has a correct conceptual single-open-shift invariant but not a complete recovery state machine. That distinction matters more under retries, network errors, and Worker restarts than under the happy path.

### Attendance app fallback → rules compatibility

The application deliberately supports legacy roster storage through `enrollments`, while the rules still recognize only `studentIds`. The two layers can therefore disagree even when both are locally correct.

### Student archival → parent portal

Removing a student from class rosters is not equivalent to removing the student from all operational relationships. Parent links are a separate graph edge and need their own lifecycle handling.

---

# 6. Findings that appear resolved in the current snapshot

This audit did **not** blindly carry forward several findings from older audit prose because the current source now shows meaningful remediation.

Examples confirmed in the current snapshot:

- Payment writes have an idempotency-key path using deterministic payment document IDs.
- Class add/remove/transfer operations use Firestore transactions rather than purely client-side stale snapshots.
- Approved shift self-corrections carry an `applied` marker and rules reject already-applied approvals.
- Desk inquiries now have branch-scoped get/list rules.
- Staff-role helpers correctly use explicit staff-role sets rather than accidentally treating parents/students as staff.
- Kiosk **clock-in** now explicitly fails closed when the Worker URL or browser crypto is unavailable; the old direct clock-in fallback is no longer present.
- Kiosk **clock-out** also fails closed through the hardened path.

These should remain in the regression suite so later changes do not reintroduce the older failures.

---

# 7. Recommended remediation sequence

## Immediate security/data-integrity fixes

1. **Fix parent linkage rules** so a parent can never be linked to a foreign-branch/non-student UID.
2. **Make kiosk challenge consumption truly atomic** across Worker isolates.
3. **Bind kiosk staff branch to device branch** and fail closed on missing class/event documents.
4. **Eliminate the direct kiosk class-switch fallback.**
5. **Make class switch transactional or recoverable as a state machine.**
6. **Fix `activeShifts` partial-failure recovery.**
7. **Lock down classAttendance manual-update fields.**
8. **Add target-user branch validation to attendance/payments/shifts and class roster mutations.**
9. **Make parent authorization status-aware.**
10. **Define and enforce the archive/parent-link lifecycle policy.**

## Follow-up correctness and scalability fixes

11. Repair class-attendance close-out concurrency semantics.
12. Align Firestore enrollment authorization with the application's legacy compatibility path.
13. Fix branch propagation into instructor/front-office report dashboards.
14. Bound corporate-event history reads.
15. Add substitute-instructor progress-report authorization.
16. Complete legacy branchless-class archival cleanup.

---

# 8. Regression-test matrix to add

The existing unit suite is substantial, but the hidden-bug strategy needs stronger negative/concurrency coverage at the system boundary.

### Firestore emulator

- Parent links same-branch student → allowed.
- Parent links foreign-branch student → denied.
- Inactive parent reads child → denied.
- Attendance for foreign student from local branch → denied.
- Payment for foreign student from local branch → denied.
- Shift for foreign user from local branch → denied.
- Class roster adds foreign student → denied.
- Manual classAttendance edit changing branch metadata → denied.
- Substitute instructor creates progress report → allowed when assigned.

### Worker

- Reuse same nonce concurrently → exactly one success.
- Reuse nonce from another Worker isolate → rejected.
- Badge branch != kiosk branch → rejected.
- Missing class document → rejected.
- Missing event document → rejected.
- Class-switch previous-close success + new-create failure → recoverable state.
- Shift lock acquired + shift-create failure → lock automatically recoverable.
- Inactive/revoked kiosk device → rejected.
- Revoked staff badge → rejected.

### Attendance concurrency

- Two simultaneous scans for same deterministic classAttendance ID.
- Scan racing with class close-out.
- Manual ABSENT racing with late scan.
- Retry after network response timeout.

### Parent/student lifecycle

- Archive student with linked parent.
- Remove child link.
- Parent with two children in different operational states.
- Inactive parent login + existing Firebase Auth session.

---

# 9. Release-gate assessment

This snapshot is **not ready to be considered fully hardened against the hidden-bug strategy** until the Critical/High findings are addressed and emulator/Worker concurrency tests are green.

The most important distinction is that several controls now exist in the architecture but are not yet implemented with the same atomicity or trust-boundary strength promised by the canonical specifications.

The strongest next step is not another broad documentation pass; it is targeted remediation followed by executable negative tests at the Firestore-rules and Worker boundaries.

---

# 10. Audit evidence index

Key files referenced by the findings include:

- `firestore.rules`
- `cloudflare-worker/worker.js`
- `src/features/attendance/useKioskScanner.js`
- `src/features/attendance/shiftsRepository.js`
- `src/features/attendance/classAttendanceRepository.js`
- `src/features/attendance/classResolution.js`
- `src/features/attendance/corporateEventsRepository.js`
- `src/features/dashboard/usersRepository.js`
- `src/features/students/parentPortalRepository.js`
- `src/features/students/ParentPortalPage.jsx`
- `src/features/students/ParentProfileFields.jsx`
- `src/features/students/progressReportsRepository.js`
- `src/features/reports/ReportsDashboard.jsx`
- `src/features/reports/reportsRepository.js`
- `src/features/classes/classesRepository.js`
- `src/features/staff/staffUtils.js`
- `src/features/staff/StaffDirectory.jsx`

Canonical specification documents remain the behavioral reference; implementation evidence above is the basis for the current findings.
