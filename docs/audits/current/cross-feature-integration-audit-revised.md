---
title: Cross-Feature Integration Audit — Revised Handoff Report
type: audit-report
status: active
created: 2026-09-28
revised: 2026-09-28
audited_repo: https://github.com/aymira-git/mylibertyportal-origin
verified_commit: 17901afe2cb6a33e1204544364e7ceb1897dce5a
source_audit: cross-feature-integration-audit-report(1).md
---

# MyLiberty Portal — Cross-Feature Integration Audit
## Revised Verification & Coding-Agent Handoff

> **Purpose of this revision:** preserve the useful findings from the original Pass 1 audit while correcting findings whose wording, severity, or remediation no longer matches the current repository.
>
> **Verification basis:** the uploaded Pass 1 audit plus a targeted review of the current GitHub `main` branch at commit `17901afe2cb6a33e1204544364e7ceb1897dce5a`.
>
> **Important limitation:** this revision still does **not** claim that runtime/emulator/E2E behavior has been executed in this review. Where Firestore query behavior depends on the real rules engine, the finding remains a runtime/emulator item.

---

## 0. Executive Summary

The original audit's central conclusion remains useful: MyLiberty Portal is broadly coherent at the module level, but several cross-feature seams exist around security-rule/query alignment, role semantics, data lifecycle, and date handling.

The most important correction in this revision is **INT-001 (attendance)**. The current code clearly contains two attendance domains:

```text
Reception / station kiosk attendance
    ↓
/attendance
    ↓
Operational "Today" check-in reporting

Instructor classroom attendance
    ↓
/classAttendance
    ↓
Instructor / parent attendance views
```

Therefore, the current evidence does **not** prove that `classAttendance` is incorrectly missing from the manager/front-office "Today" report. It proves that the two domains are separate. Whether that is a broken integration or an intentional business boundary must be decided before changing the data model.

The second major correction is **role normalization**. The repository already has centralized role helpers (`normalizeRole`, `isInstructorRole`, `isFrontOfficeRole`) in `src/features/shared/roles.js`. The problem is not the absence of a helper; the problem is that multiple client paths still bypass it with raw string comparisons.

The third major correction is **payment idempotency wording**. The payment form already disables submission while saving. The underlying idempotency mechanism is still imperfect because the idempotency key is derived from a per-submission receipt number, but an ordinary same-click double-submit is already partly mitigated at the UI layer.

---

# 1. Scope and Verification Status

## 1.1 Original audit coverage

The original Pass 1 audit reported deep review of:

- `firestore.rules`
- attendance and kiosk flows
- staff invites/signup
- shifts and staff clock-in
- staff leave
- todos/directives
- role handling
- parent dashboard queries
- student delete/archive
- payment write paths

It reported partial review of Front Office admissions, corporate events, progress reports, and outreach, and stated that runtime/emulator/E2E execution had not been performed.

## 1.2 Current-repo verification performed for this revision

The revision checked the live GitHub repository, including these areas:

- `firestore.rules`
- `src/features/attendance/kioskScanProcessor.js`
- `src/features/attendance/useKioskScanner.js`
- `src/features/attendance/classAttendanceRepository.js`
- `src/features/attendance/InstructorAttendanceView.jsx`
- `src/features/attendance/shiftsRepository.js`
- `src/features/reports/reportsRepository.js`
- `src/features/reports/tabs/TodayTab.jsx`
- `src/features/finance/PaymentModal.jsx`
- `src/features/finance/RecordPaymentTab.jsx`
- `src/features/finance/paymentsRepository.js`
- `src/features/staff/useStaffDirectives.js`
- `src/features/dashboard/usersRepository.js`
- `src/features/shared/roles.js`
- selected Manager / Staff / Parent dashboard paths
- the real Firestore emulator test file

## 1.3 Repository freshness

The current `main` branch is at:

```text
17901afe2cb6a33e1204544364e7ceb1897dce5a
```

The commit after the earlier code state is a documentation-reorganization commit. The reviewed application-source files and `firestore.rules` are still present at the current `main` tip.

---

# 2. Bottom Line

## Q1 — Is this one coherent system?

**Mostly yes, with important seams.**

The most credible cross-feature seams currently visible are:

1. **Security rules vs actual query shape** — especially Front Office kiosk lookups, todos, parent queries, and branch-scoped lists.
2. **Role semantics vs raw client comparisons** — especially Instructor Leader handling.
3. **Data lifecycle** — hard deletion of students and related records.
4. **Date/time conventions** — WITA-aware code exists, but several screens still use UTC date extraction.
5. **Attendance domain separation** — two attendance stores exist, but it is not yet proven that this separation is itself a defect.

## Q2 — Highest operational risks

The highest-priority items are:

- **INT-004:** Front Office reception-kiosk staff scanning may be blocked by missing Firestore read permissions.
- **INT-002:** staff directives subscribe to an unfiltered `todos` collection; actual runtime behavior must be proven.
- **INT-017:** parent class/attendance queries may not be provable under the current parent rules.
- **INT-009:** corporate-event update logic does not preserve the original branch boundary.
- **INT-005:** Instructor Leader semantics are inconsistent because many client screens still use raw `role === "instructor"` checks.

## Q3 — What should be fixed before new feature work?

1. Run the real Firestore emulator tests for the query/rule seams.
2. Fix confirmed Front Office kiosk permission mismatch.
3. Fix rule/query mismatches together.
4. Make the existing shared role helpers authoritative throughout the UI.
5. Decide the intended attendance reporting boundary before redesigning attendance storage.
6. Address student lifecycle/hard-delete behavior.
7. Fix UTC-vs-WITA date defaults.

---

# 3. Root Causes

| ID | Root cause | Main workflows | Findings |
|---|---|---|---|
| RC-1 | Two attendance stores represent different operational contexts; intended reporting boundary is not explicit enough | Attendance, Reports, Parent | INT-001 |
| RC-2 | Query shapes are broader than the branch restrictions the rules are intended to enforce | Todos, Staff/HR, Parent, Class, Reports | INT-002, INT-004, INT-017, supporting observations in INT-013 |
| RC-3 | Centralized role helpers exist, but many client paths still compare raw role strings | Staff/HR, Class, Attendance, Kids | INT-005, INT-015, INT-018 |
| RC-4 | Some operational facts are duplicated or modeled separately without one canonical source | Staff/HR, Todos | INT-003, INT-006 |
| RC-5 | Hard-delete behavior does not fully follow dependent data relationships | Student, Parent, Finance, Attendance | INT-007 |
| RC-6 | "Today" is implemented partly in WITA and partly by UTC ISO-date truncation | Leave, Class, Enrollment, Progress | INT-014 |

---

# 4. Findings

## 4.1 Confirmed — High / Medium Priority

### INT-004 — Front Office reception-kiosk staff scanning needs read permissions the rules do not currently grant

**Severity:** High  
**Status:** Confirmed by code/rules; runtime confirmation still recommended  
**Workflow:** Staff/HR / Kiosk  
**Root cause:** RC-2

### What the app does

The current kiosk staff scan path starts in `kioskScanProcessor.js` and calls:

```text
fetchUserById(uid)
    ↓
getDoc(users/{uid})

fetchOpenShiftFor(uid)
    ↓
query(shifts where userId == uid and clockOut == null)
```

The current Firestore rules allow Front Office users to create/update appropriate shifts, but `/users/{userId}` read access for Front Office is restricted to selected roles, and `/shifts` read access does not include Front Office for another employee's shift.

### Practical consequence

A reception account may be allowed to write the shift after the scan while being unable to perform the lookups the scan flow performs first.

### Why this matters

The owner-specified operational setup uses Front Office on the reception machine for staff badge scanning. This is not merely a theoretical permissions issue; it touches a daily workflow.

### Recommended remediation

Do **not** immediately expose every staff document to every Front Office user without considering privacy.

Choose one of these implementation directions deliberately:

**Option A — Minimal rules extension**

Allow Front Office to read the minimum same-branch user and open-shift data needed by the reception kiosk.

**Option B — Server-side kiosk identity resolution**

Use the existing worker/server architecture to return only the minimum scan result required by the kiosk.

**Option C — Dedicated kiosk identity**

Use a narrow kiosk account/device identity with purpose-specific permissions instead of a normal employee identity.

For an immediate operational fix, A is the smallest code change. B/C are stronger isolation designs.

---

### INT-009 — Corporate-event update does not preserve the original branch boundary

**Severity:** Medium  
**Status:** Confirmed  
**Workflow:** Corporate Events  
**Root cause:** RC-2

### Evidence

The current `corporateEvents` update rule validates the **resulting** `audienceType/audienceValue`, but it does not require the existing event (`resource.data`) to belong to the same branch as the actor.

That creates a cross-branch modification risk: a Front Office or Manager in one branch may be able to modify an existing event from another branch if the resulting audience fields satisfy the update condition.

### Recommended remediation

Mirror the branch check used at creation by adding an existing-resource branch boundary to update semantics.

Also explicitly decide whether role-targeted and division-targeted events are:

- academy-wide, or
- branch-owned records with an audience filter inside the branch.

Do not solve those two questions implicitly in code.

---

### INT-005 — Instructor Leader semantics are inconsistent because client code bypasses the shared role helpers

**Severity:** Medium  
**Status:** Confirmed  
**Workflow:** Staff/HR, Class, Attendance, Kids  
**Root cause:** RC-3

### Important correction to the original audit

The repository **already has centralized role helpers** in:

```text
src/features/shared/roles.js
```

including:

```js
normalizeRole(role)
isInstructorRole(role)
isFrontOfficeRole(role)
```

and aliases such as:

```text
instructor_leader → instructorleader
ops_lead → opslead
frontofficelead → opslead
```

Therefore the remediation is **not** to create a new role helper system.

### The actual problem

Multiple client paths still use direct comparisons such as:

```js
u.role === "instructor"
```

instead of using `isInstructorRole()` or normalized roles.

Observed affected areas include:

- kiosk staff clock-in logic
- `ManagerDashboard`
- `ClassesAndCoverageTab`
- `StaffDirectory`
- `useDashboardData`
- other dashboard-level instructor lists and workload calculations

### User impact

An Instructor Leader can be treated differently from an Instructor in:

- shift classification / class-day handling
- active instructor lists
- class coverage warnings
- workload displays
- staff deactivation warnings

### Recommended remediation

Use the existing helpers consistently:

```text
normalizeRole()
isInstructorRole()
isFrontOfficeRole()
isStaffRole()
```

Then add tests for each major role-sensitive path.

A good follow-up is a repository-wide search for raw comparisons against role strings, followed by targeted refactoring rather than blindly replacing every string occurrence.

---

### INT-007 — Student hard deletion leaves dependent records behind

**Severity:** Medium  
**Status:** Confirmed  
**Workflow:** Student / Parent / Finance / Attendance  
**Root cause:** RC-5

### Current behavior

`deleteUserProfile(uid)` currently:

1. deletes `users/{uid}`
2. removes the student from matching class `studentIds`
3. removes matching class `enrollments`

It does not remove the student from:

- parent `childStudentIds`
- `classAttendance`
- `attendance`
- `payments`
- `progressReports`

### Important business-policy distinction

Historical payments and attendance may intentionally need to survive a student profile being closed.

Therefore the correct question is **not** "delete all dependent records".

The correct question is:

> What data is historical business evidence that should survive, and what data is relational linkage that must be scrubbed?

### Recommended direction

Prefer one of these explicit models:

**Preferred operational model:** archive/inactivate students instead of hard-deleting them.

**If hard-delete remains:** define an explicit orphan policy:

- remove parent linkage
- remove active roster membership
- preserve or separately archive financial history
- preserve or separately archive attendance history
- preserve or archive progress records according to reporting requirements

Also replace the stale-snapshot roster scrub with a transaction or another concurrency-safe approach.

---

### INT-013 — Progress reports have a different branch/reader model from the rest of the portal

**Severity:** Medium  
**Status:** Confirmed rules model; business intent still needs confirmation  
**Workflow:** Student → Progress Reports  
**Root cause:** RC-2

The current rules allow managers and Front Office to read `progressReports` without an explicit branch boundary.

Instructor creation is tied to a class/instructor relationship, while manager/front-office reading is broader.

### Possible consequences

- cross-branch progress-report visibility
- instructor handoff/history ambiguity
- inconsistent reporting scope

### Recommended remediation

Before changing rules, answer:

1. Are manager reports branch-only?
2. Is Front Office supposed to see progress reports at all?
3. Should a newly assigned instructor be able to see historical reports for the class?
4. Should parents eventually see progress reports?

If branch isolation is required, store/derive a reliable branch field and use a strict branch-aware read rule.

---

### INT-014 — Several screens still calculate "today" using UTC date truncation

**Severity:** Low / Medium operational correctness  
**Status:** Confirmed  
**Workflow:** Leave, Class, Enrollment, Transfer, Progress  
**Root cause:** RC-6

The repo already contains WITA-aware date helpers, but several screens still use:

```js
new Date().toISOString().slice(0, 10)
```

Observed in the current repo include:

- `StaffLeaveModal.jsx`
- `BatchCard.jsx`
- `EnrollModal.jsx`
- `TransferModal.jsx`
- `ClassManager.jsx`
- `BatchModal.jsx`
- `StudentProgressForm.jsx`

Between local midnight and UTC date rollover, that can produce the previous calendar date for a WITA operation.

### Recommended remediation

Use the existing WITA helper consistently for business dates.

A useful guardrail is a lint/grep rule preventing UTC ISO truncation for business-date defaults, while allowing it when a UTC date is genuinely intended.

---

## 4.2 Confirmed — Medium / Low Priority

### INT-003 — Academy-wide todos are supported by rules but not cleanly by the creation UI/model

**Severity:** Medium  
**Status:** Confirmed  
**Root cause:** RC-4

The rules support academy-wide todo semantics using values such as `branchId == "all"`, but the creation logic normally writes concrete branch information.

At the same time, the client uses the string `"all"` for multiple concepts, including:

- all branches
- everyone as assignee

### Recommended remediation

Choose one clear representation:

```text
branchId: "all"
```

for academy-wide scope, and a different explicit value/field for audience/assignee semantics.

Then make the UI reflect the same model.

---

### INT-006 — Staff leave is a record but does not itself drive availability

**Severity:** Medium  
**Status:** Confirmed implementation fact; business intent required  
**Root cause:** RC-4

Current leave records are stored in `staffLeave`, while kiosk behavior depends on separate user status such as `users.status == "on_leave"`.

The leave record itself does not automatically update:

- staff availability
- kiosk status
- class coverage

### Recommended remediation

Pick one model deliberately:

1. **Leave log only** — document that it is historical reporting, not availability control.
2. **Derived availability** — availability is computed from approved leave records.
3. **Approval workflow** — create/approve leave through the existing approval system.

Do not maintain two independent sources of truth without documenting their relationship.

---

### INT-010 — Payment idempotency exists, but the key is generated per submission

**Severity:** Medium  
**Status:** Confirmed  
**Workflow:** Finance  
**Root cause:** Payment idempotency design

### Important correction to original wording

The payment UI already disables its submit button while `saving` is true:

```jsx
disabled={saving || !navigator.onLine}
```

Therefore ordinary rapid double-click protection exists at the UI level.

The remaining problem is the idempotency mechanism itself.

Current flow:

```js
receiptNo = ML-{last 6 digits of current milliseconds}
idempotencyKey = idem_{student.id}_{receiptNo}
```

This means each new submission normally receives a new idempotency key.

### Why this matters

A retry or repeat submission after the first attempt can create a different deterministic payment document because the identity is regenerated.

### Recommended remediation

Generate a payment-operation ID once when the payment form enters its committed/submitting state, then use that same identifier for the entire operation.

Keep the UI `saving` guard as a second line of defense.

For receipt numbers, do not rely on six milliseconds digits as a globally meaningful identifier.

---

### INT-015 — General Duty fallback is intentionally asymmetric today

**Severity:** Medium / owner decision  
**Status:** Confirmed  
**Workflow:** Staff / Corporate Event / Kiosk

The current code stores General Duty as:

```text
classId: "general"
className: "General Duty"
```

The current instructor logic remains different from non-instructor staff:

- an Instructor with no class and no matching event is blocked
- non-instructor staff can fall back to General Duty

### Recommended decision

Decide explicitly:

> Should an instructor with no scheduled class be permitted to clock in as General Duty?

Until this is decided, do not silently change instructor behavior.

Use `classId === "general"` as the machine-level identifier rather than matching display strings.

---

### INT-018 — Kids School / Courses separation is still primarily a UI boundary

**Severity:** Medium  
**Status:** Confirmed implementation fact; policy decision required  
**Workflow:** Kids School

The application uses `division === "kindergarten"` to choose different dashboards, but Firestore rules generally do not use `division` as a data-access wall.

### Consequence

Two staff members in the same branch can potentially have the same database-level access even if the UI gives them different dashboards.

### Recommended decision

Decide whether:

- separate dashboards are sufficient, or
- Kids/Courses separation must also be enforced at the database layer.

Do not add division fields to every collection until the actual policy requires it.

---

### INT-019 — Approved shift corrections bind to the shift, not necessarily every corrected value

**Severity:** Low  
**Status:** Confirmed  
**Workflow:** Staff/HR

The current approval rule proves that the approval references the intended `shiftId`, but it does not fully compare the target clock values against the approved `afterData` payload.

### Recommended remediation

Either:

- bind `clockIn/clockOut` to the approval payload at rule level, or
- explicitly document that the client is trusted for the final values after maker-checker approval.

The first option is stronger.

---

# 5. Likely / Runtime Verification Findings

## INT-002 — Staff directives use an unfiltered `todos` listener

**Severity:** High  
**Status:** Likely; runtime/emulator test required

Current code uses:

```js
onSnapshot(collection(db, "todos"), ...)
```

and filters only after data arrives by:

- assignee
- role
- user ID

It does not put branch scope in the Firestore query.

The rules attempt to enforce branch boundaries, but the repository must prove how Firestore evaluates this query against those rules.

### Test required

Seed todos in at least two branches and run the exact unfiltered listener/query as:

- Kota Gorontalo instructor
- Bone Bolango instructor

Then record whether the query:

- succeeds with only permitted docs
- is denied
- returns broader data than intended

### Preferred remediation

Use a branch-constrained query for ordinary staff, plus a separate explicitly modeled path for academy-wide directives if that feature is retained.

---

## INT-017 — Parent dashboard query shape may not be provable under the rules

**Severity:** Medium  
**Status:** Needs emulator verification

Current queries include:

```js
where("studentIds", "array-contains", childId)
where("status", "==", "open")
```

and:

```js
where("studentId", "==", childId)
orderBy("attendanceDate", "desc")
```

while the rules prove access using the parent's `childStudentIds` relationship.

The code catches query failures and returns empty arrays, which can turn a permissions/query issue into a misleading empty parent dashboard.

### Test required

Run the exact query shapes against the real emulator with:

- a parent with one child
- a parent with multiple children
- a non-parent control user

### Preferred remediation

Change query shape only after the emulator proves the existing query is rejected or too broad.

Also surface meaningful errors in the parent UI instead of silently presenting the same UI state as "no attendance".

---

## INT-008 — Close-out may create ABSENT records for inactive/graduated roster members

**Severity:** Medium  
**Status:** Likely; runtime/business verification required

The close-out function takes the provided roster IDs and creates `ABSENT / CLOSE_OUT` records for IDs that currently have no attendance record.

The kiosk separately blocks inactive/graduated students.

The unresolved business question is whether an inactive/graduated student can remain in the roster long enough for close-out to treat them as expected attendees.

### Recommended remediation

Either:

- filter close-out candidates by active student status, or
- require roster cleanup when a student becomes inactive/graduated.

The first option is more tolerant of legacy data; the second creates stronger data hygiene.

---

## INT-011 — Walk-in inquiries can reach `enrolled` without a student identifier

**Severity:** Medium  
**Status:** Likely / current code supports the concern

There is a conversion path that can attach `convertedStudentId`, but another UI path can mark an inquiry `enrolled` without attaching the resulting student ID.

### Recommended remediation

Use one conversion function that requires a concrete student ID before assigning an enrolled/converted status.

Failures in the conversion update should be surfaced to the operator rather than only logged.

---

# 6. Reframed Attendance Finding

## INT-001 — Attendance has two domains; reporting boundary must be clarified before redesign

**Severity:** Medium until business intent is confirmed  
**Status:** Confirmed data-model observation; "broken" status is not yet proven  
**Workflow:** Attendance → Reports → Parent

### Current code evidence

### A. Station/campus attendance

The default kiosk path uses `attendanceMode = "STATION"` and writes student scans through `recordStudentAttendance()` into:

```text
attendance
```

The operational `TodayTab` report reads from:

```text
attendance
```

### B. Classroom attendance

`InstructorAttendanceView` explicitly calls:

```js
attendanceMode: "CLASS"
```

That path resolves a class and writes through `recordClassAttendanceScan()` into:

```text
classAttendance
```

The `classAttendance` domain is consumed by instructor/parent-oriented attendance views.

### Therefore

The current evidence establishes two distinct facts:

1. The application has two attendance stores.
2. They are currently used by different workflows.

It does **not** establish that every class attendance record must also appear in the operational `TodayTab` report.

### Business decision required

Choose one of these models:

**Model A — Deliberate dual-domain model**

```text
attendance = campus/station presence
classAttendance = class-session attendance
```

Then document this clearly and ensure reports are named accordingly.

**Model B — Unified reporting model**

Keep the two operational records but build a reporting layer that aggregates both.

**Model C — Unified source of truth**

Retire one store and migrate its consumers. This is the most invasive option and should not be chosen without tracing all current consumers.

### Recommended direction

Start with **Model A or B**, not an immediate data merge.

The current architecture already contains meaningful separation between campus presence and class attendance.

A better first fix is likely to make the distinction explicit in report names and reporting logic, then add an aggregate report if managers need both views.

---

# 7. Current Role-System Observation

A key architectural fact that the original audit should explicitly preserve is:

```text
The repository already has a role-normalization layer.
```

Current canonical helpers include:

```text
normalizeRole()
isInstructorRole()
isFrontOfficeRole()
isManagerRole()
isStaffRole()
isStudentRole()
isParentRole()
```

The remaining issue is inconsistent adoption.

## Recommended role-hardening task

1. Inventory raw role comparisons.
2. Replace only role-category logic with shared helpers.
3. Preserve exact-role checks where exact canonical role identity is actually required.
4. Add tests for legacy aliases.
5. Avoid modifying Firestore role values globally until migration requirements are known.

This is safer than attempting a mass storage migration immediately.

---

# 8. Rules vs Query Safety

The repository now contains a real emulator test file:

```text
src/features/shared/firestoreRules.emulator.test.js
```

The project also defines:

```text
npm run test:rules
```

The real emulator tests should be treated as the authority for query behavior.

The separate `securityRulesMatrix.test.js` remains useful as a fast logic regression suite, but it is not a substitute for running `firestore.rules` itself.

## Missing runtime test category

The current real-rule test suite should add collection/query-level assertions for:

- `/todos`
- `/users`
- `/classes`
- `/attendance`
- `/shifts`
- `/parent` class queries
- other branch-scoped list operations that use `getDocs()` or listeners

The important pattern is:

```text
seed branch A + branch B
        ↓
run the exact production query
        ↓
verify result or permission outcome
```

Do not test only the desired filtered query. Test the exact existing production query first.

---

# 9. Working / Positive Findings

The original audit identified several flows that are still worth preserving as known-good patterns.

## Staff invitation flow

The invitation process remains structured around:

```text
Invite → Signup → Profile
```

with branch/division information carried through the invitation.

## Payment atomicity

`recordPayment()` writes the payment and the student's payment summary using one batch.

That is a good integrity boundary and should be preserved.

## Class roster removal

The project has a transaction-based roster-removal path, which is the right concurrency pattern.

## Class attendance identity

The class attendance model uses deterministic IDs:

```text
{classId}_{studentId}_{attendanceDate}
```

and scan writes are non-destructive when a manual attendance decision already exists.

## Parent authorization model

The parent portal uses authenticated parent relationships rather than the old anonymous lookup model.

These are good architectural patterns and should not be regressed while fixing other findings.

---

# 10. Testing Plan

## Test Group A — Must run before changing rules

### A1 — Front Office staff scan

For Front Office in the same branch:

1. `getDoc(users/<staff>)`
2. open-shift query on `shifts`
3. scan a real kiosk path

Test Marketing, Office Boy, Instructor, Manager, and Front Office targets as appropriate.

### A2 — Unfiltered todos

Run the exact production listener/query from `useStaffDirectives` in two branches.

### A3 — Parent queries

Run the exact production class and attendance queries for a valid parent.

### A4 — Corporate-event update

Attempt cross-branch event update.

### A5 — Branch list queries

Test unfiltered vs branch-filtered reads for branch-scoped collections.

---

## Test Group B — Attendance semantics

Run an E2E sequence for:

```text
1. Student uses reception/station kiosk
2. Student uses instructor class scanner
3. View Today report
4. View Instructor attendance
5. View Parent attendance
```

The goal is not only to prove "works" but to document which attendance source each screen intentionally uses.

---

## Test Group C — Data lifecycle

Test:

- student inactive
- student graduated
- student archived/deleted
- parent linkage
- class roster linkage
- payment history
- classAttendance history
- progress history

The desired result should be a deliberate retention policy, not simply "nothing left behind".

---

# 11. Recommended Remediation Order

## Phase 0 — Owner/business decisions

Answer these before invasive changes:

1. Are Instructor Leaders full teaching staff for attendance/workload purposes?
2. Should Front Office accounts be able to scan any tracked staff member?
3. Should the reception kiosk use a dedicated identity?
4. What exactly does "Today attendance" mean: campus presence, classroom attendance, or both?
5. Should students normally be archived rather than hard-deleted?
6. Is leave a record or an availability control system?
7. Do Kids School and Courses require database-level isolation?
8. Are academy-wide directives required?
9. Should parents eventually see progress reports?

---

## Phase 1 — Prove the rules/query boundary

Run the real emulator tests before changing rule logic.

This avoids making speculative security changes that accidentally break legitimate queries.

---

## Phase 2 — Fix confirmed security/operational seams

Priority sequence:

1. **INT-004** — Front Office kiosk lookup/read path
2. **INT-002** — scoped todo queries
3. **INT-017** — parent query provability
4. **INT-009** — corporate-event update branch boundary
5. **INT-013** — progress-report access model

Ship query changes and rules changes together.

---

## Phase 3 — Normalize role semantics

1. Use existing role helpers.
2. Replace raw category comparisons.
3. Add regression tests for Instructor Leader and Front Office aliases.
4. Re-check kiosk, staffing, workload and class-assignment screens.

---

## Phase 4 — Decide attendance architecture

Do **not** merge `attendance` and `classAttendance` automatically.

First document the intended business model, then:

- rename/report the two concepts clearly, or
- build an aggregate reporting layer, or
- perform a deliberate migration.

---

## Phase 5 — Data lifecycle and finance hardening

Address:

- INT-007 student deletion/archive policy
- INT-010 payment-operation idempotency
- INT-011 inquiry conversion integrity
- INT-006 leave/availability model

---

## Phase 6 — Correctness and cleanup

Address:

- INT-014 WITA date usage
- INT-015 General Duty decision
- INT-018 Kids division policy
- INT-019 approval value binding
- INT-003 todo vocabulary/UX cleanup
- dead code and documentation drift

---

# 12. Recommended Coding-Agent Rules

A coding agent receiving this report should follow these constraints:

## Rule 1 — Do not fix an audit finding by changing architecture blindly

Every rule/query change must be tested against the actual Firestore rules engine.

## Rule 2 — Preserve existing good boundaries

Do not remove:

- payment atomicity
- transaction-based roster removal
- deterministic class attendance IDs
- authenticated parent access

while addressing unrelated findings.

## Rule 3 — Reuse existing shared helpers

Do not introduce a second role-normalization layer when `src/features/shared/roles.js` already exists.

## Rule 4 — Do not merge attendance stores without a business decision

Treat `attendance` and `classAttendance` as separate operational facts until the owner explicitly defines them as one fact.

## Rule 5 — Prefer archive over destructive deletion when historical evidence matters

Financial, attendance, and progress history may have retention requirements.

## Rule 6 — Make errors visible

Avoid converting permission failures into misleading empty-state success.

Examples include parent dashboard queries and inquiry conversion.

## Rule 7 — Change code and security rules together

Whenever a production query is intentionally changed to satisfy a rule boundary, update the related rule tests at the same time.

---

# 13. Final Finding Matrix

| ID | Area | Severity | Status | Action |
|---|---|---:|---|---|
| INT-004 | Front Office kiosk read/write seam | High | Confirmed; runtime recommended | Fix/test |
| INT-002 | Todos unfiltered query | High | Likely | Emulator first |
| INT-017 | Parent query/rule shape | Medium | Runtime needed | Emulator first |
| INT-009 | Corporate event cross-branch update | Medium | Confirmed | Fix rules |
| INT-005 | Instructor Leader role drift | Medium | Confirmed | Reuse shared helpers |
| INT-013 | Progress-report branch/read model | Medium | Confirmed | Owner decision + fix |
| INT-007 | Student deletion dependents | Medium | Confirmed | Define retention/archival |
| INT-003 | Academy-wide todo semantics | Medium | Confirmed | Define model |
| INT-006 | Leave disconnected from availability | Medium | Confirmed | Define source of truth |
| INT-010 | Payment idempotency key lifecycle | Medium | Confirmed | Harden operation ID |
| INT-015 | General Duty asymmetry | Medium | Confirmed | Owner decision |
| INT-018 | Kids division database boundary | Medium | Confirmed | Owner decision |
| INT-008 | Close-out + inactive students | Medium | Likely | Test + decide |
| INT-011 | Inquiry can become enrolled without student ID | Medium | Likely/current-code-supported | Fix workflow |
| INT-014 | UTC vs WITA business dates | Low/Medium | Confirmed | Fix defaults |
| INT-019 | Approval binds shift but not values | Low | Confirmed | Harden rule |
| INT-016 | Dead parent portal/batches code | Low | Confirmed by original review | Cleanup after higher priorities |
| INT-012 | Outreach does not feed admissions | Low | Confirmed / may be by design | Owner decision |
| INT-001 | Attendance stores not unified | Medium pending business decision | Confirmed model observation | Clarify reporting contract |

---

# 14. Final Recommendation

This audit should now be treated as a **verification-and-remediation guide**, not as an instruction to implement every proposed fix literally.

The most important implementation principle is:

```text
FIRST prove the runtime security/query behavior.
THEN fix confirmed rule/query seams.
THEN normalize role semantics using the existing helpers.
THEN decide attendance/data-lifecycle business rules.
THEN perform cleanup and hardening.
```

The original audit was strongest when it traced actual handoffs between modules. This revision preserves that strength while avoiding three risky assumptions:

1. that `classAttendance` is automatically supposed to feed the existing campus check-in report;
2. that the project lacks centralized role helpers;
3. that a payment can necessarily be duplicated by a simple same-click double-submit when the UI already has a `saving` guard.

---

# 15. Reference Files

Current repository:

- `firestore.rules`
- `src/features/attendance/kioskScanProcessor.js`
- `src/features/attendance/useKioskScanner.js`
- `src/features/attendance/classAttendanceRepository.js`
- `src/features/attendance/InstructorAttendanceView.jsx`
- `src/features/attendance/shiftsRepository.js`
- `src/features/reports/reportsRepository.js`
- `src/features/reports/tabs/TodayTab.jsx`
- `src/features/finance/PaymentModal.jsx`
- `src/features/finance/RecordPaymentTab.jsx`
- `src/features/finance/paymentsRepository.js`
- `src/features/staff/useStaffDirectives.js`
- `src/features/dashboard/usersRepository.js`
- `src/features/shared/roles.js`
- `src/features/shared/firestoreRules.emulator.test.js`

Original uploaded audit:

```text
cross-feature-integration-audit-report(1).md
```

---

# 16. Handoff Note for the Executing Agent

Before editing code:

1. verify the working tree is based on commit `17901afe2cb6a33e1204544364e7ceb1897dce5a` or a known descendant;
2. run the real Firestore emulator suite;
3. add missing query/list tests before changing query/rule behavior;
4. record the owner decisions from Phase 0;
5. implement only the findings that remain valid after those tests and decisions.

Do not treat this report as permission to make speculative schema migrations.

The implementation agent should be able to explain, for every change:

```text
Finding
→ Evidence
→ Business requirement
→ Code/rule change
→ Test
→ Regression result
```

That sequence is the expected standard for the next revision of MyLiberty Portal.
