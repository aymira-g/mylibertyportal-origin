# Myliberty Portal — `securityRulesMatrix.test.js` Split Audit & Recommendation

## Audit status

**Recommendation: SPLIT the test suite.**

This audit is based on the current GitHub repository state:

- Repository: `aymira-git/mylibertyportal-origin`
- Current HEAD checked: `83570d988eb615279c8d353a44174df754147023`
- Latest commit message: `just docs`
- Audit date: 2026-10-04
- Target file: `src/features/shared/securityRulesMatrix.test.js`
- Current suite size: approximately **2,400+ lines** (the repository's current audit documentation references the active matrix through approximately lines 2340–2438)
- Current focused result documented in the repo: **124 tests passing**

## Executive verdict

The file should be split.

However, the executor must **not** perform a simple mechanical split such as “first 500 lines / next 500 lines.” That would make the code harder to understand and could accidentally duplicate or orphan security assumptions.

The correct goal is:

> **Split the test suite by security responsibility while preserving the exact authorization semantics, test count, and security coverage.**

No production behavior should change.

No Firestore rule should change.

No permission should change.

No test assertion should be weakened merely to make the files smaller.

---

# 1. What the current file actually contains

The file has grown into several distinct layers.

## A. Test-only security predicate simulator

At the top of the file are local helper functions that imitate the authorization logic in `firestore.rules`, including:

- `isActiveUser`
- `userBranch`
- `isAdmin`
- `isManager`
- `isFrontOffice`
- `isStaff`
- `isParent`
- `isParentOf`
- `isSameBranch`
- `isSameBranchStrict`
- `userDivision`
- `isSameDivisionStrict`
- `isDivisionAllowedForBranchStaff`
- `isDivisionAllowedForManager`
- `canCreateUser`
- `canUpdateUser`
- `canDeleteUser`
- `canGetClass`
- `canListClasses`
- `canGetApplication`
- `canListApplications`
- `canGetProgressReport`
- `canListProgressReports`
- `canGetUser`
- `canListUsers`
- approval predicates
- payment predicates
- attendance predicates
- shift predicates
- class-attendance predicates
- approval update predicates
- shift-correction predicates

This is important: these helpers are **not application production code**. They are a test-side mathematical simulation of the rules.

The split must therefore keep them clearly identified as test infrastructure.

---

# 2. The suite has multiple independent security domains

The current test suite covers materially different responsibilities.

From inspection, the major groups include:

1. Branch identification and legacy branch compatibility.
2. Cross-branch write/update/delete protection.
3. Shift branch isolation.
4. Maker-checker / approval isolation and approval inbox routing.
5. User access and user mutation authorization.
6. Classes and class attendance.
7. Applications.
8. Progress reports.
9. Payments.
10. Attendance.
11. Staff shifts.
12. Kindergarten division isolation.
13. Kindergarten Front Office isolation.
14. Kindergarten Instructor access.
15. Cross-divisional `division = "all"` behavior.
16. Other later-added security regressions.

This is the real reason the file became huge.

The suite is effectively acting like a **security test package**, but physically stored as one test file.

---

# 3. Why splitting is safe and desirable

Splitting a Vitest suite into multiple test files does not inherently weaken the tests.

Vitest can execute multiple test files independently while still reporting the total suite.

The main benefits are:

- easier navigation;
- faster targeted debugging;
- clearer ownership of security domains;
- smaller diffs when a future rule changes;
- less risk that a developer “fixes” one unrelated section while working on another;
- easier audit review;
- easier executor-agent handoff;
- better test naming;
- easier identification of missing coverage.

The current 2,400+ line file is now large enough that **reviewability itself has become a security concern**.

A security test that nobody can comfortably inspect is less useful than the same coverage organized into understandable boundaries.

---

# 4. The critical caution: do NOT split only by line count

Bad approach:

```text
securityRulesMatrix.part1.test.js
securityRulesMatrix.part2.test.js
securityRulesMatrix.part3.test.js
securityRulesMatrix.part4.test.js
```

This would reduce file size but preserve the architectural problem.

It would also make it difficult to answer:

> “Which file owns payment authorization?”

or:

> “Where are all Kindergarten division isolation tests?”

or:

> “Where is maker-checker authorization tested?”

The split must instead follow **security responsibility**.

---

# 5. Recommended structure

I recommend the following structure.

```text
src/features/shared/securityRulesMatrix/
├── securityRulesMatrix.helpers.js
├── securityRulesMatrix.fixtures.js
├── branchIsolation.test.js
├── userAuthorization.test.js
├── operationalResources.test.js
├── approvals.test.js
└── divisionIsolation.test.js
```

If the project prefers fewer files, the same design can be reduced to four test files. But I would not keep everything in only two giant files.

## 5.1 `securityRulesMatrix.helpers.js`

Purpose:

Hold the test-only authorization simulator.

This file should contain the reusable pure functions currently embedded at the top of the test file.

Examples:

```js
isActiveUser
userBranch
isAdmin
isManager
isFrontOffice
isStaff
isParent
isParentOf
isSameBranch
isSameBranchStrict
userDivision
isSameDivisionStrict
isDivisionAllowedForBranchStaff
isDivisionAllowedForManager
```

Then the resource predicates:

```js
canCreateUser
canUpdateUser
canDeleteUser
canGetUser
canListUsers

canGetClass
canListClasses

canGetApplication
canListApplications

canGetProgressReport
canListProgressReports

canGetPayment
canListPayments

canGetAttendance
canListAttendance

canGetShift
canListShifts

canGetClassAttendance

canDecideApproval
canUpdateApproval
isApprovedShiftCorrection
```

Also move:

```js
APPROVAL_DECISION_KEYS
```

into this helper module.

### Important

This file must remain explicitly named/documented as a **test-only rules simulation**.

Do NOT import this helper into production application code.

Do NOT replace the real Firestore rules with this JavaScript implementation.

---

# 6. `securityRulesMatrix.fixtures.js`

This should contain reusable actors and common records that appear across several suites.

Examples:

```js
adminUser
managerGorontalo
managerBoneBolango
foGorontalo
foBoneBolango
instructorLeaderGorontalo
instructorGorontalo
```

Common branch/division fixtures can also live here.

However, do not force every test fixture into one giant fixture file.

A fixture should be shared only when sharing actually improves clarity.

A local fixture is often better when it is specific to one security scenario.

---

# 7. `branchIsolation.test.js`

This file should own tests whose primary purpose is branch boundaries.

Examples:

- branch ID matching;
- legacy branch-name mapping;
- missing/empty branch behavior;
- Admin global branch access;
- cross-branch payment protection;
- cross-branch shift protection;
- cross-branch deletion;
- branch mutation protection;
- branch-scoped list behavior;
- foreign branch denial.

The conceptual question for this file is:

> “Can a user operating in branch A access or mutate branch B data?”

---

# 8. `userAuthorization.test.js`

This file should own authorization around user/profile records.

Examples:

- `canCreateUser`
- `canUpdateUser`
- `canDeleteUser`
- `canGetUser`
- `canListUsers`
- role restrictions;
- parent/student relationships;
- staff visibility;
- Front Office visibility;
- Manager visibility;
- instructor visibility;
- Admin global access.

The conceptual question:

> “Who is allowed to see or mutate user records?”

This keeps identity/role authorization separate from resource-specific authorization.

---

# 9. `operationalResources.test.js`

This should cover normal application resources.

Recommended groups:

### Classes

- class get;
- class list;
- instructor assignment;
- substitute instructor access;
- student membership;
- parent child relationship.

### Applications

- branch access;
- division access;
- role access.

### Progress reports

- manager/front-office access;
- instructor ownership;
- parent child access;
- branch/division isolation.

### Payments

- student ownership;
- manager/front-office branch access;
- list query restrictions;
- payment update restrictions;
- payment deletion restrictions.

### Attendance

- branch/division access;
- staff visibility;
- list query restrictions.

### Shifts

- employee self-access;
- manager/front-office access;
- branch/division restrictions;
- list restrictions.

### Class attendance

- manager/front-office access;
- assigned instructor access;
- student self-access;
- parent child access.

The conceptual question:

> “For each operational resource, what access does each role have?”

---

# 10. `approvals.test.js`

Maker-checker should have its own file.

This is a distinct security subsystem and deserves an explicit boundary.

Put here:

- approval role routing;
- branch-scoped approver matching;
- requester cannot approve own request;
- decision status restrictions;
- `decidedByUid` restrictions;
- approval update allow-list;
- approval immutability;
- self-correction approval;
- approval application restrictions;
- four inbox routing.

This is especially important because approval security is not merely ordinary CRUD authorization.

The conceptual question:

> “Can the correct independent approver approve the request, and can nobody bypass maker-checker?”

---

# 11. `divisionIsolation.test.js`

This file should own the Kindergarten/Courses/division matrix.

This is currently one of the biggest reasons the original test file grew.

Put here:

- Section 16 — Kids Manager;
- Section 17 — Kids Front Office;
- Section 18 — Kids Instructor;
- Section 19 — Wave 2 staff/shifts/attendance/payments division security;
- Section 21 — `division = "all"` cross-divisional behavior;
- legacy records without `division`;
- Kindergarten vs Courses isolation;
- same-branch but wrong-division denial;
- cross-branch + cross-division denial;
- `division = "all"` allowed behavior.

The conceptual question:

> “Does division scope remain isolated inside the same branch, while `division = "all"` intentionally bypasses division restrictions without bypassing branch restrictions?”

This is a major security invariant and deserves its own file.

---

# 12. Recommended final file ownership

| File | Primary responsibility |
|---|---|
| `securityRulesMatrix.helpers.js` | Test-only authorization simulator |
| `securityRulesMatrix.fixtures.js` | Shared actors/common fixtures |
| `branchIsolation.test.js` | Branch boundary security |
| `userAuthorization.test.js` | User/profile authorization |
| `operationalResources.test.js` | Classes, applications, progress, payments, attendance, shifts |
| `approvals.test.js` | Maker-checker / approval engine |
| `divisionIsolation.test.js` | Kindergarten/Courses/division isolation |

This is the preferred architecture.

---

# 13. Do not accidentally create a false sense of security

There is a more important issue than file length.

The repository itself already documents that:

> `securityRulesMatrix.test.js` is a hand-mirrored JavaScript simulation of the Firestore rule logic.

The repository also contains:

```text
src/features/shared/firestoreRules.emulator.test.js
```

That emulator suite runs the **actual `firestore.rules`**.

Therefore:

## The two suites have different jobs

### Matrix tests

Fast:

```text
Pure JavaScript
        ↓
Security predicate behavior
        ↓
Role/branch/division regression coverage
```

### Emulator tests

Authoritative runtime verification:

```text
Actual Firestore rules
        ↓
Firestore emulator
        ↓
Actual allow/deny behavior
```

The matrix suite must never be described as proof that the deployed Firestore rules are correct.

It is a fast regression model.

The emulator suite is the runtime authority.

This distinction must survive the refactor.

---

# 14. Strong recommendation: improve the naming

The current name:

```text
securityRulesMatrix.test.js
```

is acceptable historically, but after splitting it becomes ambiguous.

I recommend:

```text
securityRulesMatrix/
```

as a directory, with descriptive files beneath it.

This makes the concept explicit:

```text
securityRulesMatrix/
    helpers
    fixtures
    branchIsolation.test.js
    userAuthorization.test.js
    operationalResources.test.js
    approvals.test.js
    divisionIsolation.test.js
```

The old monolithic file should disappear after migration.

Do not keep both the old 2,400-line file and the new tests, because that creates duplicate coverage and confusion about the canonical suite.

---

# 15. Migration rules for the executor

The executor must follow these rules.

## Rule 1 — No production code changes

Do not modify:

```text
firestore.rules
src/features/**
src/App.jsx
repositories
schemas
components
```

unless required solely to fix an import caused by the test refactor.

The task is test organization.

---

## Rule 2 — Preserve every assertion

The executor must move tests, not rewrite their security meaning.

Before refactor:

```text
124 tests
```

After refactor:

```text
124 tests
```

or more, if the executor discovers a missing regression while moving code.

A lower count is an immediate audit failure unless a specific duplicate test has been formally identified and documented.

---

## Rule 3 — Do not weaken assertions

Do not turn:

```js
expect(...).toBe(false)
```

into:

```js
expect(...).toBeDefined()
```

Do not remove negative tests.

Security suites need negative assertions.

---

## Rule 4 — Preserve test names where practical

Moving:

```js
it("Kids Manager -> Courses admissions in own branch: DENY", ...)
```

should not become:

```js
it("division test", ...)
```

The original test names contain useful security intent.

---

## Rule 5 — Keep the simulator pure

The helper module should remain pure JavaScript.

No Firestore calls.

No Firebase initialization.

No application hooks.

No browser APIs.

No production imports unless an existing production utility is intentionally being tested rather than simulated.

---

# 16. Validation checklist

The executor must run the focused matrix suite after the refactor.

Expected:

```text
All split security matrix files pass.
```

Then run:

```text
npx vitest run
```

Then run the real rules emulator suite using the repository's existing command for it.

The executor must report:

1. number of test files before;
2. number of test files after;
3. number of tests before;
4. number of tests after;
5. focused matrix result;
6. full unit-test result;
7. Firestore emulator result;
8. changed files;
9. confirmation that `firestore.rules` was not changed.

---

# 17. Additional audit concern discovered during review

The current test suite contains duplicated fixture concepts and repeated division matrices.

That is not automatically bad.

In security testing, some duplication is useful because a test should be understandable in isolation.

Therefore:

> **Do not over-DRY the security tests.**

Do not build a huge generic test generator that produces dozens of assertions indirectly just to reduce lines.

For security tests, explicit assertions are often preferable.

Good:

```js
expect(canGetPayment(kindergartenPayment, kindergartenManager)).toBe(true);
expect(canGetPayment(coursePayment, kindergartenManager)).toBe(false);
```

Less desirable:

```js
expectAccessMatrix(matrix).toMatchPolicy(policy);
```

The latter hides the actual security assertions from a reviewer.

---

# 18. Recommended split priority

If the executor wants the safest incremental approach:

### Phase 1

Extract only the test helpers.

```text
securityRulesMatrix.helpers.js
```

Run tests.

### Phase 2

Extract approval tests.

```text
approvals.test.js
```

Run tests.

### Phase 3

Extract division tests.

```text
divisionIsolation.test.js
```

Run tests.

### Phase 4

Extract user authorization.

```text
userAuthorization.test.js
```

Run tests.

### Phase 5

Extract operational resources.

```text
operationalResources.test.js
```

Run tests.

### Phase 6

Extract branch isolation.

```text
branchIsolation.test.js
```

Run tests.

### Phase 7

Delete the empty/original monolithic test file.

Run the full test suite and emulator tests.

This staged approach is safer than rewriting everything in one operation.

---

# 19. Auditor acceptance criteria

I would accept the refactor only if all of these are true:

- [x] No production application behavior changed.
- [x] `firestore.rules` unchanged.
- [x] The real emulator test suite still passes.
- [x] All original matrix assertions are preserved.
- [x] Matrix test count does not decrease (124 tests before -> 124 tests after across 5 modular files).
- [x] Test-only helpers are centralized and reusable (`securityRulesMatrix.helpers.js`).
- [x] Approval tests are isolated (`approvals.test.js` - 13 tests).
- [x] Division tests are isolated (`divisionIsolation.test.js` - 59 tests).
- [x] Branch isolation tests are easy to locate (`branchIsolation.test.js` - 18 tests).
- [x] User authorization tests are easy to locate (`userAuthorization.test.js` - 6 tests).
- [x] Operational resource tests are easy to locate (`operationalResources.test.js` - 28 tests).
- [x] No duplicate obsolete monolithic suite remains (`securityRulesMatrix.test.js` removed).
- [x] No test was weakened just to make the refactor pass.
- [x] The new files can be run individually with Vitest.
- [x] The repository still distinguishes the matrix simulation from the real Firestore emulator tests.

---

# 20. Final recommendation

**Yes — split it.**

But the objective is not:

> “Make a 2,400-line file into five smaller files.”

The objective is:

> **Turn one giant security-test monolith into a small, auditable security-test package with clear responsibility boundaries.**

The strongest structure is:

```text
src/features/shared/securityRulesMatrix/
├── securityRulesMatrix.helpers.js
├── securityRulesMatrix.fixtures.js
├── branchIsolation.test.js
├── userAuthorization.test.js
├── operationalResources.test.js
├── approvals.test.js
└── divisionIsolation.test.js
```

This is a **test architecture refactor only**.

It should not alter authorization behavior.

And because the matrix is only a simulation, the executor must preserve the existing relationship:

```text
securityRulesMatrix/*
    = fast logical regression model

firestoreRules.emulator.test.js
    = real Firestore rules verification
```

That distinction is more important than the file split itself.
