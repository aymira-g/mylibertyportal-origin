# MyLiberty Portal — Reconciled Full Audit
## Current GitHub HEAD + Claude Sonnet 5 Extra Audit Review
### Date: 2026-09-27

> **Purpose:** This document reconciles the latest repository state with the latest Claude audit continuation. It separates findings into **Confirmed**, **Needs Runtime Verification**, **Resolved/Stale**, and **Tooling/Environment Gaps** so a coding agent does not blindly implement obsolete or unverified findings.
>
> **Repository:** `https://github.com/aymira-git/mylibertyportal-origin`
>
> **Branch:** `main`
>
> **Current HEAD verified during this review:** `3593165ff6b7360a7309c91128547f0f8734e211`
>
> **Latest commit message:** `fix(ci): restore public client fallbacks and inject test env vars for GitHub Actions`

---

# 1. Executive Summary

The repository has improved substantially compared with the earlier September audits.

Several previously reported issues are now clearly resolved, including:

- the anonymous operational parent lookup;
- the generic parent-account save path;
- broad public parent-portal behavior;
- payments collection-wide read exposure;
- several approval-flow and shift-correction issues;
- deterministic class-attendance document IDs;
- branch-scoped application reads in several dashboard workflows;
- branch-aware todo and corporate-event access rules;
- several staff-role filtering problems;
- outreach visit collection-group branch isolation.

The latest Claude continuation adds useful findings around:

1. **payment idempotency / duplicate-payment protection**;
2. **class-roster concurrency**;
3. **shift approval replay / consumption**;
4. **branch-scoped list-rule behavior**;
5. **live app query paths that still do not prove branch isolation at the query layer**;
6. **architecture-document drift**;
7. **PWA / build configuration observations**.

However, the Claude report should **not** be treated as a final implementation checklist without reconciliation.

The most important distinction is:

> Some findings are demonstrated directly by current source code, while others are plausible rule-level weaknesses that still require a real Firestore emulator query test to prove.

The highest-value next step is therefore **verification + remediation**, not another broad rewrite.

---

# 2. Finding Status Legend

| Status | Meaning |
|---|---|
| **CONFIRMED** | Current source code demonstrates the issue directly. |
| **CONFIRMED — LOW/MEDIUM** | Real issue, but not currently a high-severity security defect. |
| **VERIFY WITH EMULATOR** | Rule/query behavior looks unsafe or inconsistent and should be proven with an actual Firestore query test before labeling it a confirmed data leak. |
| **RESOLVED** | Earlier issue is fixed in the current repository. |
| **STALE** | Earlier finding no longer describes the current implementation. |
| **TOOLING GAP** | The repository lacks sufficient test/deployment tooling to verify the behavior reliably. |
| **DOCUMENTATION DRIFT** | The code changed, but architecture documentation still describes the previous behavior. |

---

# 3. Current Repository Baseline

## 3.1 Verified current HEAD

Current `main`:

```text
3593165ff6b7360a7309c91128547f0f8734e211
```

Latest commit:

```text
fix(ci): restore public client fallbacks and inject test env vars for GitHub Actions
```

The commit restores standard public Firebase client configuration fallbacks and injects the same values into Vitest's test environment so CI can initialize the Firebase client without requiring committed `.env` files.

The Firebase client configuration is public client SDK configuration; it is not equivalent to a Firebase Admin credential or secret.

---

# 4. Confirmed Findings

# F-01 — Payment Recording Has No Server-Side Duplicate / Idempotency Guard

**Status:** CONFIRMED — MEDIUM

**Primary files:**

- `src/features/finance/paymentsRepository.js`
- payment UI / modal components
- Firestore `/payments`

## Evidence

`recordPayment()` still creates a new payment document using:

```js
const paymentRef = doc(collection(db, "payments"));
```

and then commits the payment record and student summary together in a batch.

There is no Firestore-side or repository-side uniqueness check based on:

- receipt number;
- transaction reference;
- explicit idempotency key;
- or another business-unique identifier.

The UI may prevent a same-tab double click, but that does not protect against:

- network retries;
- a second browser tab;
- duplicated submission after reopening the modal;
- an operator retry after an uncertain network response.

## Risk

One real payment could potentially become two payment documents, causing:

- duplicated revenue in reports;
- incorrect cash reconciliation;
- incorrect payment history;
- incorrect financial summaries.

This is a **data-integrity problem**, not primarily a security problem.

## Recommended remediation

Do not invent a business key without confirming the real front-office workflow.

Preferred approach:

1. define a payment-level idempotency key;
2. make the key deterministic for the transaction intent;
3. ensure retries write to the same payment document;
4. preserve the atomic student-summary update;
5. add duplicate-submission emulator/unit tests.

A short-lived client-generated token can work if the operation is truly "one submission attempt", but a business receipt/reference number is stronger if the academy already has one.

---

# F-02 — Class Roster Removal / Transfer Can Lose Concurrent Changes

**Status:** CONFIRMED — LOW/MEDIUM

**Primary file:**

- `src/features/classes/classesRepository.js`

## Evidence

Adding a student is handled using a transaction and `arrayUnion()`.

However, removing a student still follows the pattern:

```js
studentIds: (cls.studentIds || []).filter((id) => id !== studentId)
```

and writes the entire array back.

Transfers similarly build a full source roster snapshot and then issue a batch update.

This creates a classic stale-read / last-write-wins window:

```text
Staff A reads roster
Staff B reads roster
Staff A removes Student X
Staff B removes Student Y using the old roster
Staff B writes old roster minus Y
Student X can reappear
```

## Recommended remediation

### Removal

Prefer atomic `arrayRemove(studentId)` for the student ID.

For `enrollments`, use a transaction or another concurrency-safe structure if the embedded enrollment object must also be removed.

### Transfer

Keep transfer atomic, but re-read both source and target class documents inside a transaction before calculating the new state.

The transaction should:

1. re-read source class;
2. re-read target class;
3. verify the student is still enrolled in source;
4. verify target capacity;
5. apply source removal;
6. apply target addition;
7. commit atomically.

Do not rely only on the caller's stale `sourceClass` / `targetClass` objects.

---

# F-03 — Approved Shift Correction Is Not Marked Consumed

**Status:** CONFIRMED — LOW

**Primary files:**

- `src/features/shared/approvalsRepository.js`
- `src/features/attendance/shiftsRepository.js`
- `firestore.rules`

## Evidence

`isApprovedShiftCorrection()` validates:

```text
actionId == STAFF_SHIFT_SELF_CORRECTION
status == approved
payload exists
payload.shiftId matches the target shift
```

But the approval record is never transitioned to an explicit `applied` / `consumed` state after successful application.

The current UI does not expose a direct repeated-apply workflow, so this is **not an obvious current exploit**.

It is nevertheless a latent replay/integrity risk if a future retry screen or operational workflow allows approved corrections to be re-applied.

## Recommended remediation

Add explicit application metadata such as:

```text
appliedAt
appliedByUid
appliedFromApproval
```

and make the application rule require the approval to be approved **and not already applied**.

The state transition should be designed together with the audit trail so a correction cannot be accidentally applied twice.

---

# F-04 — Walk-In Inquiry Query Is Not Branch-Scoped at the Repository Layer

**Status:** CONFIRMED

**Primary files:**

- `src/features/dashboard/frontoffice/deskInquiriesRepository.js`
- `src/features/dashboard/frontoffice/WalkInInquiryTab.jsx`
- `firestore.rules`

## Evidence

`fetchRecentDeskInquiries()` currently queries:

```js
query(
  collection(db, "deskInquiries"),
  orderBy("createdAt", "desc"),
  limit(limitCount)
)
```

No `branchId` filter is provided.

The data is therefore not branch-scoped at the application query layer.

The Firestore rules remain responsible for rejecting unauthorized results, but this query does not itself express the branch boundary.

## Why this matters

Firestore query authorization is affected by rule evaluation against potential query results.

A branch-scoped query is safer and easier to reason about:

```js
where("branchId", "==", currentBranchId)
```

rather than asking a branch user to run a broad query and hoping the rules prove that the query cannot return anything foreign.

## Recommended remediation

Change the repository API to require or accept:

```text
branchId
```

and make all operational callers pass the logged-in user's canonical branch.

Example:

```js
fetchRecentDeskInquiries(50, branchId)
```

or an equivalent object parameter.

Do not silently default a missing branch to Kota Gorontalo.

---

# F-05 — Reporting Queries Are Still Broader Than Their Branch UI

**Status:** CONFIRMED

**Primary files:**

- `src/features/reports/reportsRepository.js`
- `src/features/reports/tabs/AdmissionsTab.jsx`
- `src/features/reports/tabs/LearnerProgressTab.jsx`

## Evidence

Several reporting repositories fetch broad datasets first and then perform branch filtering in React.

For example, admissions reporting currently fetches:

```text
applications
classes
```

and `AdmissionsTab` later filters those records using `branchFilter`.

That means the UI's branch filter is not automatically equivalent to the Firestore access boundary.

The same general pattern exists in learner-progress reporting.

## Recommended remediation

Branch-scoped roles should query branch-scoped datasets directly.

For example:

```js
where("branchId", "==", branchId)
```

should be part of the Firestore query for branch-locked users.

Admin users can retain an explicit all-branch path.

Do not use client-side filtering as the only security mechanism.

---

# F-06 — Kids Manager Reporting Path Uses Admin-Style Report Mode

**Status:** CONFIRMED — HIGHER PRIORITY

**Primary file:**

- `src/features/dashboard/kids/KidsManagerDashboard.jsx`

## Evidence

The current Kids Manager dashboard renders:

```jsx
<ReportsDashboard
  isAdminView={true}
  isFrontOffice={false}
  canEdit={false}
  division="kindergarten"
/>
```

This differs from the normal Manager Dashboard, which passes:

```jsx
isAdminView={false}
userBranch={myBranch}
```

This means the reporting component is being told that a Kids Manager is operating in admin view.

## Risk

Even if later UI filtering narrows the displayed dataset, the repository path can still make broader queries than the manager should need.

This defeats the purpose of branch-scoped reporting.

## Recommended remediation

Pass manager semantics into `ReportsDashboard`:

```jsx
<ReportsDashboard
  isAdminView={false}
  isFrontOffice={false}
  canEdit={false}
  division="kindergarten"
  userBranch={managerBranchId}
/>
```

Then ensure the underlying report repositories use that branch value in their Firestore queries.

Do not rely only on client-side `matchesBranchFilter()`.

---

# 5. Verify With Firestore Emulator

# V-01 — `isSameBranch()` vs `isSameBranchStrict()` List Boundary

**Status:** VERIFY WITH EMULATOR

**Primary file:**

- `firestore.rules`

## Current design

The repository now contains:

```text
isSameBranch()
```

and:

```text
isSameBranchStrict()
```

The strict function intentionally removes the fieldless fallback used by the legacy-compatible `get` path.

The intended architecture is:

```text
get:
    legacy-compatible branch fallback allowed

list:
    legacy-compatible fieldless fallback rejected
```

This is a sensible design.

## Collections requiring verification

Claude's fresh review identified these current rule paths as candidates for the split:

- `/users`
- `/applications`
- `/classes`
- `/todos`
- `/attendance`
- `/deskInquiries`
- `/schoolOutreach`
- `/kioskDevices`
- `/staffLeave`
- `/shifts`
- `/classAttendance`
- `/approvals` (narrower / lower priority)

## Critical distinction

These are **not all proven runtime data leaks yet**.

The current emulator test suite contains many document-level assertions, but it does not yet provide enough collection-query tests to prove every list behavior.

Therefore do not write:

> "Cross-branch collection-wide data leak is confirmed"

until an actual emulator query test demonstrates it.

Instead:

> "Rule structure suggests a branch-list boundary weakness; add real `getDocs(query(...))` tests to establish the runtime behavior."

---

# V-02 — Query-Level Firestore Security Coverage Is Too Thin

**Status:** CONFIRMED — TEST COVERAGE GAP

**Primary file:**

- `src/features/shared/firestoreRules.emulator.test.js`

## Current state

The real rules emulator suite exists and runs against the actual `firestore.rules`.

That is good.

However, query/list-level coverage is currently much thinner than single-document coverage.

This matters because Firestore evaluates collection queries differently from a simple `getDoc()`.

## Required tests

For each branch-sensitive collection, add at least:

### Kota Gorontalo user

Run:

```js
getDocs(query(collection(db, "collectionName")))
```

or the exact production query shape.

Expected result:

- success with only allowed records; or
- a permission denial when the query cannot be proven safe.

### Cross-branch seeded documents

Seed:

```text
Kota Gorontalo
Bone Bolango
Pohuwato
Limboto
legacy/branchless document
```

Then test:

- same-branch list;
- cross-branch list;
- admin all-branch list;
- legacy document behavior;
- explicitly academy-wide documents where applicable.

This is especially important for:

- `/users`
- `/applications`
- `/classes`
- `/attendance`
- `/deskInquiries`
- `/todos`
- `/corporateEvents`
- `/schoolOutreach`
- `/shifts`
- `/staffLeave`

---

# 6. Class Attendance — Current State Is Stronger Than Earlier Audits

**Status:** RESOLVED / VERIFIED SOURCE SHAPE

The current `firestore.rules` now explicitly requires deterministic class-attendance IDs:

```text
attendanceId ==
  classId + "_" + studentId + "_" + attendanceDate
```

The current rule also validates:

```text
markedBy == request.auth.uid
```

and only permits updates through the `MANUAL` method.

The repository already uses deterministic IDs.

This is a substantial improvement over the earlier attendance implementation.

## Important manual-absence policy

The current security rules enforce:

```text
existing record updates require method == MANUAL
```

This means a later scan cannot simply overwrite an existing manually-entered absence through the normal create/scan path.

That behavior should remain explicit in the application workflow:

> **Manual attendance correction wins over scan.**

A late scan must not silently revert a teacher's manual `ABSENT` correction to `PRESENT`.

This policy should have an explicit UI/unit test as well as the current Firestore rule protection.

---

# 7. Parent Portal — Previous Anonymous Lookup Finding Is RESOLVED

**Status:** RESOLVED

**Primary files:**

- `src/features/students/ParentPortalPage.jsx`
- `src/features/students/parentPortalRepository.js`
- `src/features/dashboard/ParentDashboard.jsx`

## Current behavior

`ParentPortalPage.jsx` is now an authenticated entry route for:

```text
/parent
/portal
/parent-portal
```

Anonymous users receive a dedicated parent login.

Authenticated non-parent users receive access denied.

Authenticated parents are routed to:

```text
ParentDashboard
```

The previous anonymous lookup function is now deliberately decommissioned:

```js
export async function lookupStudentForParent(searchTerm = "") {
  void searchTerm;
  return [];
}
```

## Conclusion

Do **not** re-implement the anonymous NIS/phone/name lookup unless the architecture is deliberately changed and separately approved.

The current authenticated-parent model is the canonical direction.

---

# 8. Parent Account Save Path — RESOLVED

**Status:** RESOLVED

`useDashboardData.js` now contains an explicit:

```js
if (formData.role === "parent")
```

branch.

It uses:

- `updateParentRecord()`
- `createParentAccount()`

The previous bug where parents could fall through the generic staff save/create path is no longer present.

---

# 9. Parent Linkage — Current State

**Status:** IMPROVED / VERIFY QUERY SHAPE

`StudentParentLinkage.jsx` now derives the canonical student branch and passes it to:

```text
findParentsForStudent(studentId, branchId)
fetchAllParents(branchId)
```

This is better than the earlier unscoped parent-list implementation.

The repository still performs one role + child linkage query and then branch-filters the result in memory for `findParentsForStudent()`.

That is acceptable for the current small volume if Firestore rules prove the query boundary safely, but a stricter production implementation could add branch filtering directly to the query.

---

# 10. Corporate Events — Current Rule Model Is Explicitly Scoped

**Status:** IMPROVED / VERIFY QUERY COVERAGE

The current rules now support:

```text
audienceType == all
audienceType == branch
audienceType == role
audienceType == division
```

This is substantially better than:

```text
allow read: if isStaff();
```

The intended model is:

- Admin: cross-branch;
- `all`: academy-wide;
- `branch`: matching branch;
- `role`: explicitly role-targeted;
- `division`: explicitly division-targeted.

The important remaining task is query-level testing.

Do not replace this with a broad global staff read.

---

# 11. Todos / Directives — Current Model Is Explicitly Scoped

**Status:** IMPROVED / VERIFY QUERY COVERAGE

Current rules support:

```text
branch-scoped directives
academy-wide directives
```

Academy-wide directives may use:

```text
branch == "all"
```

or:

```text
branchId == "all"
```

The application repository now writes both:

```text
branch
branchId
```

for new todos.

Managers and Front Office can manage branch-scoped directives, while ordinary staff may toggle completion within authorized scope.

The remaining issue is making sure every production query is shaped consistently with the rules.

---

# 12. Staff-Role Filtering — Mostly Improved, Continue Repository-Wide Search

**Status:** IMPROVED

The codebase now has a canonical `isStaffRole()` helper and several components have been migrated to it.

Examples include:

- `StaffDirectory`;
- `TasksPanel`;
- Kids Manager staff metrics.

However, role filtering should continue to be checked wherever the old pattern appears:

```js
user.role !== "student"
```

because authenticated parent users are not staff.

A repository-wide search should continue looking for:

```text
role !== "student"
role && role !== "student"
role != "student"
```

and similar role assumptions.

---

# 13. Shift Self-Correction Approval Flow

**Status:** IMPROVED / VERIFY RETRY STATE

The current project correctly has:

- approval creation;
- approval decision;
- approved shift correction application;
- `appliedFromApproval`;
- immutable `shiftAuditEvents`.

This resolves the earlier architectural problem where approval existed but the approved shift was not actually applied.

Remaining hardening item:

- explicitly record whether the correction has already been applied.

---

# 14. PWA / Bundle Configuration

**Status:** MOSTLY HEALTHY

Current `vite.config.js` already has deliberate manual chunking for:

- Firebase Firestore;
- Firebase Auth;
- Firebase core;
- QR scanner;
- QR generator;
- React.

The service worker uses:

```text
registerType: "autoUpdate"
```

and does not cache Firestore/API calls.

## Remaining low-priority item

```text
devOptions.enabled = true
```

means the service worker is also active during local development.

Potential effect:

- stale local build;
- confusing development debugging.

This is not currently a production security issue.

---

# 15. Tooling / Verification Gaps

# T-01 — Firestore Emulator Is Not a First-Class CI Dependency

**Status:** TOOLING GAP

The project contains:

```json
"test:rules": "firebase emulators:exec --only firestore \"vitest run src/features/shared/firestoreRules.emulator.test.js\""
```

but `firebase-tools` is not listed as a normal project dependency.

This means rule-test execution depends on the agent/machine having the Firebase CLI available.

## Recommendation

Make rules-test execution reproducible.

Preferred options:

### Option A — add `firebase-tools` as a dev dependency

Then:

```bash
npm ci
npm run test:rules
```

works from a clean environment.

### Option B — use a dedicated CI action/container

If avoiding a larger local dependency is desirable, make the GitHub Actions workflow install the CLI explicitly.

The key requirement is:

> A clean checkout should be able to run the real Firestore rules tests deterministically.

---

# T-02 — CI Does Not Currently Run the Firestore Rules Emulator Suite

The current Playwright workflow runs:

```text
npm install
npx playwright install --with-deps
npx playwright test
```

but does not run:

```text
npm run test:rules
```

Therefore a rules regression can pass normal CI while the real Firestore authorization tests never execute.

## Recommendation

Add a dedicated rules-test job or a rules step.

Example:

```yaml
- name: Install dependencies
  run: npm ci

- name: Run Firestore rules tests
  run: npm run test:rules
```

If Firebase CLI is not included in the project dependencies, install it in the same workflow before that step.

---

# T-03 — E2E Firebase Environment Isolation Needs Explicit Verification

`playwright.config.ts` starts:

```text
npm run dev
```

against:

```text
http://localhost:3000
```

The current Firebase client also has public configuration fallbacks.

This is useful for CI startup, but it means local/E2E execution can potentially initialize the real Firebase project unless the test environment explicitly overrides Firebase endpoints or uses a dedicated test project.

## Recommendation

Do not assume E2E is isolated.

Verify and document one of these:

1. Firestore/Auth emulator endpoints;
2. a dedicated test Firebase project;
3. an explicitly isolated E2E environment.

Security-sensitive E2E tests should never accidentally mutate production data.

---

# 16. Architecture Documentation Drift

# D-01 — Parent Portal Documentation Is Stale

**Status:** DOCUMENTATION DRIFT

`docs/ARCHITECTURE.md` still describes `/portal` as a transitional unauthenticated phone/NIS lookup path.

That statement no longer matches the implementation.

Current implementation:

```text
/parent
/portal
/parent-portal
        ↓
authenticated ParentPortalPage
        ↓
Firebase Auth
        ↓
role == parent
        ↓
ParentDashboard
```

The anonymous lookup implementation has already been decommissioned.

## Recommendation

Once explicitly approved, update `docs/ARCHITECTURE.md` to describe the authenticated parent portal.

Do not silently edit the protected architecture guide just to remove the contradiction.

Per `AGENTS.md`, architecture changes/documentation should follow the explicit approval workflow.

---

# D-02 — Architecture Changelog / Branch-Isolation Wording Needs a Reconciliation Pass

Claude correctly observed that the architecture documentation can read as though branch isolation is more complete than the current list-query behavior proves.

This is especially relevant for:

- applications;
- shifts;
- outreach;
- inquiries;
- users;
- classes.

Once query-level emulator testing is complete, update the documentation to describe the actual confirmed behavior.

Do not rewrite the architecture document ahead of verification merely to make it look cleaner.

---

# 17. Recommended Remediation Order

## Phase 1 — Prove the real Firestore boundary

1. Add query-level emulator tests.
2. Test the actual production query shapes.
3. Verify `/users`, `/applications`, `/classes`, `/attendance`, `/deskInquiries`, `/todos`, `/corporateEvents`, `/schoolOutreach`, `/shifts`, and `/staffLeave`.
4. Only then classify any list exposure as a confirmed leak.

## Phase 2 — Fix confirmed branch-query issues

1. `WalkInInquiryTab` / `deskInquiriesRepository`.
2. reporting repositories;
3. Kids Manager report mode;
4. any other broad branch-role queries discovered by the emulator tests.

## Phase 3 — Data-integrity hardening

1. payment idempotency;
2. class roster concurrency;
3. shift approval consumption.

## Phase 4 — Test infrastructure

1. make `firebase-tools` reproducible;
2. run real Firestore rules tests in CI;
3. explicitly isolate E2E Firebase usage.

## Phase 5 — Documentation reconciliation

After code + tests are verified:

1. update `docs/ARCHITECTURE.md`;
2. update its change log;
3. record the final branch-isolation model;
4. record the authenticated parent portal model.

---

# 18. Proposed Branch Access Model

The current design should continue toward:

| Area | Admin | Manager / Branch Staff | Instructor | Parent |
|---|---|---|---|---|
| `users` | Cross-branch | Same branch | Operationally scoped | Own + linked children |
| `classes` | Cross-branch | Same branch | Explicitly assigned / authorized | Classes containing linked children |
| `attendance` | Cross-branch | Same branch | Operationally assigned | Own child records where explicitly allowed |
| `classAttendance` | Cross-branch | Same branch | Assigned class | Linked child |
| `applications` | Cross-branch | Same branch | No general need | No |
| `deskInquiries` | Cross-branch | Same branch | No general need | No |
| `todos` | Cross-branch | Same branch + explicit academy-wide | Authorized scope | No |
| `corporateEvents` | Cross-branch | Matching audience scope | Matching audience scope | No |
| `payments` | Cross-branch | Same branch | No general finance access | Child summary only via parent flow |
| `shifts` | Cross-branch | Same branch / own shift | Own / operational flow | No |
| `schoolOutreach` | Cross-branch | Same branch for manager/marketing | No | No |

Core rule:

> **Cross-branch access should be explicit and justified, not the default.**

For instructors, assignment-based exceptions are legitimate and should remain explicit rather than being replaced by a naive same-branch-only rule.

---

# 19. Parent Portal Security Contract

The current desired contract is:

```text
Anonymous visitor
    ↓
/parent or /portal
    ↓
Parent login
    ↓
Firebase Auth
    ↓
Firestore users/{uid}
    ↓
role == "parent"
    ↓
ParentDashboard
```

Authenticated non-parent:

```text
/parent
    ↓
Access Restricted
```

Parent access:

```text
Parent user
   ├── own parent profile
   ├── linked child student documents
   ├── classes containing linked children
   └── linked child class-attendance records
```

Parent must not be able to:

```text
list /users
read arbitrary students
read arbitrary parents
modify childStudentIds directly
read unrelated branches' student records
```

---

# 20. Definition of Done

This audit should not be considered fully closed until the following are true:

## Security

- [ ] All branch-sensitive collection queries have query-level emulator tests.
- [ ] Cross-branch list behavior is proven, not inferred.
- [ ] Branch-scoped application queries are used where operationally required.
- [ ] Parent portal is authenticated only.
- [ ] Parent child linkage cannot be self-modified by the parent.
- [ ] Instructor cross-branch class access is only possible through explicit assignment rules.

## Data Integrity

- [ ] Payment recording has a documented duplicate/idempotency strategy.
- [ ] Class roster removal is concurrency-safe.
- [ ] Class transfer is concurrency-safe.
- [ ] Shift approvals cannot be unintentionally replayed.

## Query / Performance

- [ ] No operational dashboard uses broad collection listeners where branch-specific queries are available.
- [ ] Reporting queries do not fetch unnecessary cross-branch datasets for branch-locked users.
- [ ] Historical datasets remain bounded.

## Testing

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test:rules`
- [ ] relevant Playwright tests
- [ ] CI runs the real Firestore rules suite.

## Architecture

- [ ] `docs/ARCHITECTURE.md` matches the actual parent portal behavior.
- [ ] Branch-isolation documentation matches verified rule behavior.
- [ ] Architecture changes were explicitly approved before updating protected documentation.

---

# 21. Final Reconciled Assessment

The current MyLiberty Portal is **materially stronger than the older September audit baseline**.

The latest Claude audit adds several worthwhile hardening findings, especially:

- payment idempotency;
- roster concurrency;
- approval consumption;
- query-level security verification.

The biggest mistake to avoid is treating every historical finding as still active.

At the current HEAD:

### Already resolved

- anonymous parent lookup;
- generic parent save path;
- broad corporate-event read;
- broad todo read;
- several approval/shift inconsistencies;
- deterministic class-attendance identity enforcement.

### Confirmed current work

- payment duplicate protection;
- roster concurrency;
- shift approval consumption;
- desk-inquiry query scoping;
- broad reporting query patterns;
- Kids Manager report-mode mismatch.

### Needs runtime proof

- `isSameBranch()` versus `isSameBranchStrict()` list behavior across the affected collections.

### Tooling must be strengthened

- reproducible Firestore emulator execution;
- CI execution of real Firestore rules tests;
- explicit Firebase isolation for E2E.

The immediate goal should therefore be:

> **Prove the authorization boundary with real query tests, fix confirmed query/app issues, then harden the integrity workflows.**

Do not perform a broad architectural rewrite.

---

# Appendix A — Claude Audit Findings Reconciled

| Claude finding | Reconciled status |
|---|---|
| Payment duplicate guard missing | **CONFIRMED** |
| Class roster overwrite race | **CONFIRMED** |
| Shift approval not consumed | **CONFIRMED — LOW** |
| `isSameBranch` list split | **VERIFY WITH EMULATOR** |
| `/deskInquiries` list exposure | **CONFIRMED query weakness; runtime rules still verify** |
| `/applications` list exposure | **VERIFY WITH EMULATOR** |
| `/users` list exposure | **VERIFY WITH EMULATOR** |
| `/classes` list exposure | **VERIFY WITH EMULATOR** |
| `/attendance` list exposure | **VERIFY WITH EMULATOR** |
| `/todos` list exposure | **VERIFY WITH EMULATOR** |
| `/schoolOutreach` list exposure | **VERIFY WITH EMULATOR** |
| `/kioskDevices` list exposure | **VERIFY WITH EMULATOR** |
| `/staffLeave` / `/shifts` list exposure | **VERIFY WITH EMULATOR** |
| `/classAttendance` list boundary | **Narrow VERIFY WITH EMULATOR** |
| `/approvals` legacy branch fallback | **LOWER-PRIORITY VERIFY** |
| Architecture drift | **CONFIRMED documentation drift** |
| PWA dev service worker | **LOW PRIORITY** |
| Full Qodo finding re-verification | **NOT YET COMPLETE** |
| Lighthouse / bundle measurement | **NOT YET COMPLETE** |

---

# Appendix B — Important Current Files

## Security

```text
firestore.rules
firestore.indexes.json
src/features/shared/firestoreRules.emulator.test.js
src/features/shared/securityRulesMatrix.test.js
```

## Parent portal

```text
src/features/students/ParentPortalPage.jsx
src/features/students/parentPortalRepository.js
src/features/dashboard/ParentDashboard.jsx
src/features/students/StudentParentLinkage.jsx
src/features/dashboard/usersRepository.js
```

## Reports / branch scope

```text
src/features/reports/reportsRepository.js
src/features/reports/ReportsDashboard.jsx
src/features/reports/tabs/AdmissionsTab.jsx
src/features/reports/tabs/LearnerProgressTab.jsx
src/features/dashboard/ManagerDashboard.jsx
src/features/dashboard/kids/KidsManagerDashboard.jsx
```

## Operational integrity

```text
src/features/finance/paymentsRepository.js
src/features/classes/classesRepository.js
src/features/attendance/shiftsRepository.js
src/features/shared/approvalsRepository.js
```

## Tooling / CI

```text
package.json
vite.config.js
playwright.config.ts
vitest.config.js
.github/workflows/playwright.yml
AGENTS.md
docs/ARCHITECTURE.md
```
