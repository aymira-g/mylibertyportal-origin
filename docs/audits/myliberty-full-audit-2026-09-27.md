# MyLiberty Portal — Current Full Audit

**Audit date:** 2026-09-27  
**Repository:** `aymira-git/mylibertyportal-origin`  
**Branch reviewed:** `main`  
**Latest commit reviewed:** `0796d3d42353f7aa89308f0a355b7a20d6136e9f`  
**Audit mode:** Current-source audit against the GitHub repository, with focused review of architecture, Firestore rules, roles, parent/student model, attendance, dashboards, indexes, and tests.

> This audit is based on the current repository source. It is not a replacement for running the full test/build suite in the repository's own environment.

## 1. Executive Summary

The current repository is substantially healthier than the older 2026-09-25 architecture audit suggests.

Several important findings from that older audit appear to have been remediated in the current source, including:

- payment document owner scoping in Firestore rules;
- approval decision field alignment;
- cash-discrepancy approval no longer being embedded in the shift document;
- approved shift self-correction now having an apply path;
- front-office student status update fields being allowed;
- shift review writes being allowed;
- composite indexes for approvals and open shifts;
- parent-vs-staff UI separation in Staff Directory and UserForm.

However, the current source still contains several meaningful issues. The most important are **not** the leftover UI cleanup items from Claude's report. They are integration and authorization-contract issues involving the parent portal, branch-scoped queries, the parent save path, Kids Manager, and class-attendance invariants.

### Priority summary

| Priority | Finding | Current assessment |
|---|---|---|
| **P0 / Fix first** | Legacy public parent portal is incompatible with current `/users` rules | **Likely broken user flow; do not loosen rules to restore anonymous search** |
| **P0 / Fix first** | Parent UserForm is rendered correctly but save logic still routes `parent` through staff repository functions | **Real integration bug** |
| **P0 / Fix first** | Parent-linkage queries are not branch-scoped even though `/users` list rules are branch-scoped | **High-confidence permission/query mismatch** |
| **P0 / Fix first** | Kids Manager dashboard performs unscoped queries against branch-scoped collections | **Likely broken dashboard for manager role** |
| **P1** | `classAttendance` deterministic ID is not enforced by Firestore Rules | **Integrity gap; client-side determinism alone is insufficient** |
| **P1** | Parent-child linkage does not enforce child branch alignment | **Potential cross-branch data-boundary problem** |
| **P1** | Multiple non-staff UI/report filters still use `role !== "student"` | **Parents can leak into staff workflows** |
| **P1** | Several collections remain academy-wide readable to all staff despite branch-isolation architecture | **Review and tighten according to intended business policy** |
| **P2** | Class-attendance close-out/scan races are not fully transactionally designed | **Correctness hardening** |
| **P2** | Parent list loads are unbounded and not search/branch scoped | **Operational/scalability issue** |
| **P2** | Generic Firebase production fallbacks make startup validation ineffective | **Configuration hygiene, not a secret leak** |
| **P2** | PWA precache downloads all JS chunks | **Performance/install-size concern** |
| **P2** | E2E configuration has no emulator isolation and no CI evidence on the latest commit | **Testing/process risk** |
| **P3** | Auth-first / Firestore-second account creation can leave orphan Auth users | **Recovery/documentation issue** |

## 2. What I Could and Could Not Verify

### Reviewed directly

- `firestore.rules`
- `firestore.indexes.json`
- `package.json`
- `src/firebase.js`
- role classification and Staff Directory
- parent account creation/linkage and Parent Dashboard
- public Parent Portal
- class attendance repository, kiosk scan path, instructor attendance UI
- approval repository, approval inbox, approval gates, shift correction flow
- Manager and Kids Manager dashboards
- reports/tasks staff filtering
- Firestore emulator test source
- Playwright configuration
- PWA configuration

### Not executed in this audit environment

I did **not** run `npm test`, `npm run lint`, `npm run build`, or `npm run test:e2e` against the live GitHub checkout. The available GitHub workflow lookup for the latest commit returned no workflow runs, and this environment could not clone the repository for local execution. Therefore, this audit should not claim a fresh green runtime test result.

The repository itself does contain these scripts:

```text
npm test
npm run test:rules
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

The Firestore emulator test file is present and covers meaningful rule behavior, but it is skipped when the emulator is unavailable.

## 3. Findings That Are Already Fixed in the Current Repo

### 3.1 Parent no longer appears in the main Staff Directory list

`src/features/shared/roles.js` now defines explicit `STAFF_ROLES` and `isStaffRole()`.

`src/features/staff/staffUtils.js` uses:

```js
users.filter((u) => isStaffRole(u.role))
```

This is the correct direction. A parent is not implicitly considered staff just because the account lives in the same `users` collection.

### 3.2 Parent UserForm presentation was fixed

`src/features/students/UserForm.jsx` now distinguishes three UI categories:

```text
student
parent
staff
```

Parents receive `ParentProfileFields` instead of `StaffProfileFields`, and the parent form has its own title and role protection messaging.

### 3.3 Payment owner scoping was corrected

The older architecture audit reported a world-readable payment `get` rule. The current `firestore.rules` now scopes student self-access to the authenticated user's UID.

This older finding should therefore be marked **resolved**, not carried forward unchanged.

### 3.4 Approval decision payload mismatch was corrected

`approvalsRepository.js` writes:

```text
status
decidedBy
decidedByUid
decidedAt
decisionNotes
updatedAt
```

and the current rules' affected-key allow-list includes those fields.

The older report's C2 finding is therefore stale against the current code.

### 3.5 Shift cash-discrepancy path was improved

The current `clockOutShiftWithCashReconciliation()` submits the approval separately, then writes only `clockOut` and `cashReconciliation` to the shift.

It also now surfaces failure to submit the approval instead of silently proceeding.

The older C3 finding should therefore be considered **resolved in source**, subject to runtime verification.

### 3.6 Approved shift self-correction now has an execution path

The current source contains:

```text
ApprovalInbox.jsx
  -> approveApprovalRequest()
  -> applyApprovedShiftCorrection()
  -> adjustShiftWithAudit()
```

and Firestore Rules require a matching approved approval document before non-admin correction writes are accepted.

The older C4 “apply step missing” finding is stale.

### 3.7 Indexes from the older audit are now present

`firestore.indexes.json` currently contains composite indexes for:

- `approvals`: status + approverRole + approverBranchId;
- `shifts`: userId + clockOut;
- class attendance queries;
- other existing branch/report combinations.

This should not be re-filed as an unresolved missing-index issue without a new runtime failure.

## 4. P0 — Legacy Public Parent Portal Conflicts With the Current Security Model

### Evidence

`src/App.jsx` routes these paths before authentication:

```text
/parent
/portal
/parent-portal
```

straight to `ParentPortalPage`.

`ParentPortalPage` uses `lookupStudentForParent()`.

That repository function performs anonymous-style student lookup by:

- document ID / NIS;
- email;
- phone / parent phone;
- name.

However, the current `firestore.rules` for `/users` does **not** provide public anonymous list/get access. It is restricted to authenticated roles and linked parents.

### Assessment

The old public lookup route is therefore incompatible with the current hardened rules unless another deployment configuration is doing something outside the repository.

The correct remediation is **not** to re-open anonymous access to `/users` just to preserve the old lookup feature.

### Recommended fix

Choose one explicit target:

1. make `/parent` a public landing/login page and send authenticated parents into `ParentDashboard`; or
2. remove/deprecate the legacy anonymous lookup route entirely.

Keep sensitive student/payment/attendance data behind authenticated parent authorization.

## 5. P0 — Parent Form UI Is Fixed, but Parent Save Logic Is Not

### Evidence

`UserForm.jsx` correctly recognizes:

```js
const isParent = formData.role === "parent";
```

and renders `ParentProfileFields`.

But `useDashboardData.js -> handleSave()` still has only this top-level split:

```js
if (formData.role === "student") {
  // student save
} else {
  // staffData
  updateStaffRecord(...)
  // or
  createStaffAccount(...)
}
```

There is no dedicated parent branch in `handleSave()`.

### Consequence

A parent opened through this generic form can be displayed correctly but saved through the **staff repository path**.

For a new parent this means the flow can call `createStaffAccount()` rather than `createParentAccount()`.

For an existing parent it can call `updateStaffRecord()` even though the Firestore rules only allow a narrow parent field set.

### Recommended fix

Make the save path explicit:

```js
if (formData.role === "student") {
  // student
} else if (formData.role === "parent") {
  // dedicated parent create/update
} else {
  // staff
}
```

Do not route parent accounts through staff creation/update functions.

Also consider disabling branch transfer in a normal parent edit form. The current UI exposes branch selection while the parent Firestore update rule does not allow arbitrary branch changes.

## 6. P0 — Parent Linkage Queries Do Not Match Branch-Scoped `/users` List Rules

### Evidence

`StudentParentLinkage.jsx` calls:

```js
findParentsForStudent(studentId)
fetchAllParents()
```

The repository implementations query parents by role and child linkage, but the default `fetchAllParents()` has no branch filter.

The Firestore `/users` list rule for staff is branch-scoped through `isSameBranch(resource.data)`.

### Why this matters

Firestore Rules are not post-query filters. A query must be shaped so Firestore can prove that every possible returned document satisfies the rule.

A query like:

```js
where("role", "==", "parent")
```

without a branch constraint is a likely `permission-denied` query for a branch-scoped staff list rule.

### Recommended fix

Pass branch information into both repository functions and use a branch-constrained query for staff-facing parent management.

For example:

```js
where("role", "==", "parent"),
where("branchId", "==", branchId)
```

and make the student-to-parent lookup include the student's branch when the model requires same-branch linkage.

Add emulator tests for Front Office and Manager parent-list queries.

## 7. P0 — Kids Manager Dashboard Uses Unscoped Queries Against Scoped Rules

### Evidence

`src/features/dashboard/kids/KidsManagerDashboard.jsx` currently subscribes directly to:

```js
collection(db, "users")
collection(db, "classes")
collection(db, "applications")
query(collection(db, "shifts"), where("clockOut", "==", null))
```

and then filters data client-side for Kindergarten.

The current Firestore rules, however, branch-scope at least the `users`, `applications`, and `shifts` manager reads.

### Assessment

This is the wrong security/query shape.

Client-side filtering after a broad Firestore query does not solve an authorization problem. The query itself must be authorized.

The dashboard should first discover the manager's branch, then query branch-scoped datasets, then apply kindergarten division filtering.

### Recommended fix

Bring the Kids Manager query model in line with the normal Manager dashboard:

```text
users      -> branchId == managerBranchId
applications -> branchId == managerBranchId
shifts     -> branchId == managerBranchId AND clockOut == null
```

For classes, add branch scoping where the class model supports it; do not rely on client-side division filtering as a security boundary.

## 8. P1 — Deterministic `classAttendance` IDs Are Not Enforced by Rules

### Evidence

Application code correctly generates:

```text
{classId}_{studentId}_{attendanceDate}
```

via `getClassAttendanceDocId()`.

But the Firestore `classAttendance` create rule does not validate the document ID against those fields.

The emulator tests currently create documents with arbitrary IDs such as `att1`.

### Why this matters

Client-side deterministic IDs prevent accidental duplicate records in the intended code path, but they are not a complete integrity control if arbitrary clients can write another document ID containing the same class/student/date.

### Recommended fix

Enforce the deterministic ID invariant in Firestore Rules and add a positive/negative emulator test:

- canonical deterministic ID -> allowed;
- arbitrary ID for the same attendance tuple -> denied.

## 9. P1 — Parent-Child Linkage Needs Branch/Identity Integrity Checks

The parent authorization function is effectively:

```text
parent.childStudentIds contains studentId
```

The current parent update rule checks that the parent itself stays in the same branch, but it does not fully prove that every newly linked child is a real student in the same branch.

### Risk

If a staff account can add an arbitrary known UID to `childStudentIds`, the parent could potentially acquire read access to a student in another branch.

### Recommended direction

At minimum, validate child identity and branch during linkage.

Because Firestore Rules do not provide a convenient general-purpose loop over arbitrary array deltas, do not solve this by adding a superficial UI check only. Consider whether child linkage should eventually be represented by an authorization-friendly relationship document/subcollection, or otherwise constrained through a server-authoritative linkage operation.

## 10. P1 — Parent Leakage Remains in Several Staff-Oriented Workflows

The Staff Directory itself is much better, but several other places still define “staff” as “not a student.”

Confirmed examples:

### Reports

`src/features/reports/reportsRepository.js`:

```js
(u) => u.role && u.role !== "student"
```

This includes parents.

### Staff task assignment

`src/features/staff/TasksPanel.jsx` uses the same pattern.

A parent can therefore become eligible as a staff task assignee in this workflow.

### Staff Directory role count

`src/features/staff/StaffDirectory.jsx` still calculates the “All Roles” count using:

```js
users.filter((u) => u.role !== "student").length
```

The actual staff list is filtered correctly, but the count is still conceptually wrong.

### Manager dashboards

`ManagerDashboard.jsx` still derives staff with:

```js
u.role !== "student" && u.role !== "admin"
```

which includes `parent`.

`KidsManagerDashboard.jsx` follows a similar pattern.

### Recommended fix

Use the centralized role classifier everywhere:

```js
isStaffRole(user.role)
```

The key architectural principle should remain:

> One `users` collection does not mean every non-student account is staff.

## 11. P1 — Branch Isolation Is Not Uniform Across Operational Collections

The repository's architecture and change history describe multi-branch isolation as an important security property.

Yet the current rules still allow broad staff reads for several collections:

```text
/classes
/attendance
/todos
/corporateEvents
```

through `isStaff()`-style rules without branch checks in the read path.

### Assessment

This may be intentional for academy-wide schedules/events/directives, so it is not automatically a defect in every case.

But it is inconsistent with the stronger branch isolation used elsewhere.

### Review questions

For each collection explicitly decide whether data is:

- branch-private;
- academy-wide operational information; or
- role-restricted regardless of branch.

Then make the Firestore rule and query shape match that decision.

The sensitive candidates are especially `/attendance` and any operational data containing student/staff records.

## 12. P2 — Class Attendance Race Handling Needs Hardening

The class attendance repository does a read-then-write sequence for scans and a read-then-batch-write sequence for close-out.

The deterministic document ID plus restrictive update rule reduce corruption risk, but the application logic is not fully atomic.

A concurrent scan/manual mark during close-out can cause the close-out batch to hit rule rejection rather than cleanly converging on the already-created record.

### Recommended direction

Prefer a transaction or another create-only/concurrency-aware design for the per-student close-out operation, especially if the kiosk and instructor scanner may operate simultaneously.

Do not let a late scan overwrite a manual record.

The current state-machine intent is correct:

```text
manual record > later scan
existing record > close-out ABSENT
```

The implementation should make that invariant race-safe.

## 13. P2 — Parent Lookup Is Unbounded for the Management UI

`fetchAllParents()` currently returns all parent documents matching role (and optionally branch).

At the current school size this is probably fine, but it will become wasteful as parent accounts grow.

### Recommended direction

Replace the “load every parent and filter in React” behavior with branch-scoped, bounded/search-driven lookup.

The current modal already has a search box, so the backend/query shape should eventually support that rather than downloading every parent.

## 14. P2 — Firebase Config Fallback Makes Its Own Validation Ineffective

`src/firebase.js` contains real client configuration fallbacks such as:

```js
import.meta.env.VITE_FIREBASE_API_KEY || "..."
```

The Firebase browser API key is not a traditional secret, so this is **not** a credential-exposure finding by itself.

The actual issue is narrower: `validateFirebaseConfig()` cannot detect a missing environment value when a real fallback is always supplied.

Also, staging remains possible when `.env` provides values; the fallback does not prevent env override.

### Recommended direction

Either:

- remove production fallbacks and require deployment-time environment variables; or
- explicitly document the intentional fallback and remove the misleading “required env validation” expectation.

## 15. P2 — PWA Precache Pulls Every Role Chunk

`vite.config.js` uses a broad Workbox glob:

```js
globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,woff2}"]
```

The app still benefits from code splitting at parse/execute time, but the PWA install can download the full static JS set, including role-specific chunks that a given user may never need.

This is mainly a bandwidth/install-size issue, not a correctness bug.

Monitor total build output before spending time redesigning the service-worker strategy.

## 16. P2 — E2E Tests Are Not Isolated From Firebase

`playwright.config.ts` starts the Vite dev server and points tests at:

```text
http://localhost:3000
```

while `src/firebase.js` can resolve to the real production Firebase configuration.

No Firebase emulator bootstrap is wired into the Playwright configuration shown here.

### Risk

An E2E suite that performs authenticated writes can accidentally modify real application data.

### Recommended direction

Create a dedicated E2E Firebase project/emulator configuration before expanding write-heavy E2E coverage.

At minimum, ensure test credentials/config cannot resolve to the production project.

## 17. P2 — Account Provisioning Can Leave Orphan Auth Accounts

Both staff and parent creation follow the pattern:

```text
create Firebase Auth user
        ↓
write Firestore profile
```

If the Firestore profile write fails, the Auth account can remain behind.

The current code gives a useful recovery message, but retrying can create confusing duplicate-account states.

### Recommended direction

For a future hardening pass, prefer a compensating delete on the secondary Auth instance or a trusted server-side provisioning flow.

## 18. Testing Assessment

### Positive

The repository now has meaningful rule-emulator coverage for:

- payments;
- shift creation/update;
- approved shift corrections;
- shift audit events;
- class attendance;
- deny-all fallback behavior.

This is a major improvement over the older hand-mirrored-only security matrix.

### Gaps

The current real-rule emulator suite should be expanded for the new parent architecture:

1. parent can read its own user doc;
2. parent can read only linked child;
3. parent cannot read unlinked child;
4. parent cannot access another parent's child;
5. staff parent-list queries must be branch-safe;
6. cross-branch parent/child linkage must be denied;
7. deterministic class-attendance ID must be enforced;
8. arbitrary class-attendance IDs must be rejected;
9. parent public route must not depend on anonymous `/users` access.

Also add a real test around the parent `handleSave()` path, because the UI test currently proves rendering, not persistence routing.

## 19. Recommended Implementation Order

### Phase 1 — Fix immediately

1. Remove/deprecate the anonymous legacy parent lookup route.
2. Add a dedicated `parent` branch to `useDashboardData.handleSave()`.
3. Branch-scope `findParentsForStudent()` / `fetchAllParents()` and test them against real rules.
4. Fix Kids Manager query shapes to match branch-scoped rules.
5. Enforce deterministic `classAttendance` document IDs in Firestore Rules.
6. Replace remaining `role !== "student"` staff classification with `isStaffRole()`.

### Phase 2 — Security hardening

7. Decide and enforce branch scope for `/attendance`, `/classes`, `/todos`, and `/corporateEvents`.
8. Strengthen parent-child linkage branch/identity validation.
9. Add the parent/class-attendance cases to the emulator rules matrix.
10. Verify E2E cannot hit production Firebase.

### Phase 3 — Operational hardening

11. Make close-out/scan races converge safely.
12. Bound parent-management queries.
13. Improve Auth/Firestore provisioning compensation.
14. Review Firebase configuration strategy.

### Phase 4 — Performance cleanup

15. Monitor PWA precache payload.
16. Bound large dashboard listeners as the school grows.
17. Add retention policy for operational logs.

## 20. Definition of Done for This Audit

Before this audit can honestly be marked “closed,” the executor should be able to demonstrate:

- parent account creation/edit uses parent-specific repository logic;
- parent-management queries succeed under real Firestore Rules;
- parent cannot cross branches through child linkage;
- legacy anonymous parent data lookup is retired or intentionally redesigned;
- Kids Manager loads its branch-scoped data successfully;
- no major staff-facing workflow treats `parent` as staff;
- class-attendance IDs are deterministic by rule, not just by client convention;
- emulator tests cover the parent and attendance authorization boundaries;
- E2E tests cannot accidentally write to production Firebase.

## 21. Final Assessment

**Current status: good foundation, but not ready for “all clear.”**

The current repo is materially better than the older audit implies. The most important earlier critical defects appear to have been addressed, and the parent/staff UI work is genuinely present.

The remaining risk is increasingly about **integration correctness between UI, repository queries, and Firestore Rules** rather than large architectural flaws.

The next executor should therefore prioritize:

```text
Parent flow correctness
        ↓
Branch-scoped query correctness
        ↓
Kids Manager correctness
        ↓
Firestore attendance invariants
        ↓
Role classification cleanup
        ↓
Broader hardening/performance
```

Do not reopen already-resolved findings from older audit documents unless a fresh runtime test reproduces them.
