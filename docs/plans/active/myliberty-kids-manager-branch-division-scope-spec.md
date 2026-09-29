# MyLiberty Portal — Kindergarten Manager Branch + Division Data Scope

**Status:** Implemented and Verified  
**Repository:** `aymira-git/mylibertyportal-origin`  
**Implemented:** 2026-09-29  
**Primary goal:** Ensure a Kindergarten / TK Manager sees only **Kindergarten data in the Manager's assigned branch**, while preserving intentional branch-wide/shared data.

---

## 1. Executive Summary

The MyLiberty Portal already models two separate concepts:

- **Branch** = the physical campus / location.
- **Division** = the business or school unit, such as Courses or Kindergarten.

A Kindergarten Manager should therefore have a two-dimensional access scope:

```text
branchId = manager's assigned branch
division = kindergarten
```

Conceptually:

```text
"Show me Kindergarten data inside my assigned branch."
```

The current implementation is partially correct at the dashboard/UI layer, but division is not consistently enforced as a backend data-access boundary. Several Kids Manager flows first retrieve **branch-wide** data and then filter it to Kindergarten in React.

That means the UI may look correct while the browser has already received data belonging to other divisions.

The recommended architecture is:

```text
Firestore security boundary
    ↓
branch + division scoped query
    ↓
repository/domain layer
    ↓
defensive UI filtering (optional)
    ↓
display
```

rather than:

```text
Firestore
    ↓
whole branch dataset
    ↓
React filters to Kindergarten
    ↓
display
```

The latter is not sufficient as a security boundary.

---

## 2. Current Problem

### 2.1 What the current Kids Manager dashboard already does well

`src/features/dashboard/kids/KidsManagerDashboard.jsx` already performs several good controls:

1. It reads the current manager's own profile to determine `branchId`.
2. It queries `users`, `classes`, `applications`, and `shifts` by that `branchId`.
3. It filters the resulting users/classes/applications to `kindergarten` before displaying them.
4. It passes `division="kindergarten"` and the manager's branch into `ReportsDashboard`.

For example, the dashboard currently has a pattern equivalent to:

```jsx
const classes = rawClasses.filter((c) =>
  matchesDivisionFilter(
    c.division || divisionOfProgram(c.programId || c.program),
    "kindergarten"
  )
);
```

This is useful for presentation safety, but it occurs **after the Firestore read**.

### 2.2 The underlying problem

The current repository/reporting layer is primarily branch-scoped, not consistently branch+division-scoped.

The result can therefore look like this:

```text
Kota Gorontalo branch
├── Courses
├── Kindergarten
├── TOEFL / other programs
└── other branch-local records
        ↓
branch-scoped Firestore query
        ↓
browser receives more than the Kids Manager needs
        ↓
React filters some datasets to Kindergarten
```

This has three problems:

1. **Data overexposure:** non-Kindergarten records can still cross the Firestore → browser boundary.
2. **Inconsistent protection:** every screen/tab must remember to filter correctly.
3. **Future fragility:** adding a new Kids Manager feature can accidentally expose Courses data if the developer forgets the client-side filter.

---

## 3. Important Existing Improvement

The current Kids Manager `ReportsDashboard` integration is already better than the older implementation.

Current intent is effectively:

```jsx
<ReportsDashboard
  isAdminView={false}
  isFrontOffice={false}
  isManager={true}
  canEdit={false}
  division="kindergarten"
  userBranch={managerProfile?.branch || DEFAULT_BRANCH}
/>
```

This matters because the older implementation had a more serious semantic mistake: the Kids Manager was treated as if `isAdminView={true}` were appropriate, which caused report logic to interpret the user as an actual admin.

That admin-mode mistake should remain fixed.

The remaining issue is that the reporting repository still mostly uses `branchId` as its query constraint and does not consistently use `division` as an additional backend scope.

---

## 4. Target Access Model

The desired model is:

| Role / Scope | Branch Access | Division Access |
|---|---|---|
| Admin | All branches | All divisions |
| Courses Manager | Assigned branch | Courses |
| Kindergarten Manager | Assigned branch | Kindergarten |
| Courses Instructor | Assigned branch | Courses + assigned classes |
| Kindergarten Instructor | Assigned branch | Kindergarten + assigned classes |

A Kindergarten Manager in Kota Gorontalo should therefore be able to access:

```text
Kota Gorontalo + Kindergarten
```

and not:

```text
Kota Gorontalo + Courses
Bone Bolango + Kindergarten
Bone Bolango + Courses
```

---

## 5. Data Model Requirement

For division-sensitive operational records, the canonical fields should be:

```js
{
  branchId: "kota_gorontalo",
  branch: "Kota Gorontalo",
  division: "kindergarten"
}
```

The canonical identifiers should be:

```text
branchId: canonical branch slug
  example: kota_gorontalo

division: canonical division value
  example: kindergarten
```

Do not rely on display labels for authorization decisions.

---

## 6. Recommended Firestore Security Model

### 6.1 Add a user division helper

The Firestore rules should have a helper conceptually similar to:

```rules
function userDivision() {
  return signedIn()
    && ('division' in userProfile())
    ? userProfile().division
    : null;
}
```

### 6.2 Add a strict division matcher

For division-scoped records:

```rules
function isSameDivisionStrict(data) {
  return data != null
    && 'division' in data
    && data.division == userDivision();
}
```

The important property is that missing division data does **not** automatically become `kindergarten`.

### 6.3 Combine branch + division checks

For example:

```rules
allow list: if isAdmin()
  || (
    isManager()
    && isSameBranchStrict(resource.data)
    && isSameDivisionStrict(resource.data)
  );
```

And for writes where the manager is allowed to create division-scoped records:

```rules
allow create: if isAdmin()
  || (
    isManager()
    && isSameBranchStrict(request.resource.data)
    && isSameDivisionStrict(request.resource.data)
  );
```

The exact rule must still be adapted to each collection's existing role, workflow, and write restrictions. The objective is the important part:

> **Manager access must satisfy both branch and division scope.**

---

## 7. Repository / Query Layer Changes

The security-rule change is necessary but should not be the only change.

The frontend should also stop intentionally requesting broader datasets than the user needs.

### 7.1 Pass both scopes explicitly

Instead of APIs that mostly accept `branchId`, prefer a structured scope argument, for example:

```js
{
  branchId,
  division,
  isManager,
  isAdminView,
  ...otherFilters
}
```

For example:

```js
fetchStudentProgressData({
  branchId,
  division: "kindergarten",
  isManager: true,
  isAdminView: false,
  isFrontOffice: false,
  since,
});
```

This is clearer and reduces argument-order mistakes.

### 7.2 Scope report queries at the source

Where a collection is division-sensitive, build Firestore constraints from both dimensions.

Example:

```js
const filters = [
  where("branchId", "==", branchId),
  where("division", "==", division),
];

const q = query(collection(db, "classes"), ...filters);
```

Do the same for the relevant collections rather than retrieving the entire branch and filtering in React.

### 7.3 Prefer repository-owned scoping

The repository function should own the data-access policy for its domain.

For example, `reportsRepository.js` should know that a Kindergarten Manager report means:

```text
branch = manager branch
AND
division = kindergarten
```

The individual tabs should not each have to rediscover that rule.

---

## 8. Report-Specific Remediation

`src/features/reports/reportsRepository.js` contains functions such as:

```text
fetchStaffShifts
fetchTodayScansData
fetchStudentProgressData
fetchAdmissionsReportData
fetchInstructorAnalyticsData
```

These should be reviewed so that a Kindergarten Manager's data request consistently carries:

```text
branchId
+
division = kindergarten
```

### 8.1 Staff shifts

Staff shifts may need division scope if the operational report is intended to show only Kindergarten staff.

If the business requirement is that managers see all branch staff regardless of division, keep it branch-only and explicitly document that as an exception.

Do not assume every collection must be division-scoped.

### 8.2 Today's check-ins

For Kindergarten Manager views, attendance should be scoped to:

```text
branchId = manager branch
division = kindergarten
```

provided the attendance record itself carries division information.

If historical attendance records do not contain `division`, see the legacy-data section below.

### 8.3 Learner progress

This is a strong candidate for mandatory branch + division scope.

A Kindergarten Manager should not receive Courses learner progress merely because the records share a branch.

### 8.4 Admissions

Admissions reporting is another strong candidate for branch + division scope because admissions may contain names, contact information, and prospective-student details.

### 8.5 Instructor analytics

For a Kindergarten Manager, instructor analytics should normally cover Kindergarten instructors in the Manager's branch, not every instructor in that branch.

---

## 9. Which Data Should Be Division-Scoped?

Not every collection should automatically inherit division restrictions.

Recommended baseline:

| Data | Branch Scoped | Division Scoped | Notes |
|---|---:|---:|---|
| Students | Yes | Yes | Strongly recommended |
| Classes | Yes | Yes | Strongly recommended |
| Applications | Yes | Yes | Strongly recommended |
| Attendance | Yes | Yes | Where division is available |
| Progress reports | Yes | Yes | Strongly recommended |
| Instructor analytics | Yes | Yes | For division-specific managers |
| Staff operational records | Yes | Usually yes | Depends on business requirement |
| Payments | Yes | Usually yes | Verify finance policy before enforcing |
| Corporate events | Yes | Optional | Some events should be shared |
| Global announcements | Optional | Optional | Can intentionally cross divisions |
| Branch master data | Yes | No | Branch metadata is cross-division |

The implementation should therefore use a **collection-by-collection policy**, not a blanket rule that every document must carry `division`.

---

## 10. Keep UI Filtering as a Defense-in-Depth Layer

Existing client-side filtering should not simply be deleted.

For example:

```js
rawClasses.filter((c) =>
  matchesDivisionFilter(
    c.division || divisionOfProgram(c.programId || c.program),
    "kindergarten"
  )
)
```

It can remain as defensive UI logic.

But it should become the **second layer**, not the security mechanism.

Desired flow:

```text
1. Firestore rules enforce access
2. Repository queries request only the needed scope
3. UI performs defensive filtering / presentation logic
```

---

## 11. Legacy Data Handling — Important

The existing repository contains legacy branch-normalization behavior where records without `branchId` may be treated as Kota Gorontalo for compatibility.

Do **not** copy that strategy blindly to division.

Specifically, do not do this:

```text
missing division → kindergarten
```

That would risk exposing historical Courses or ambiguous records to a Kindergarten Manager.

### Preferred policy

```text
division == kindergarten
    → Kindergarten

division == courses
    → Courses

division missing
    → not eligible for division-scoped list/query
```

Then perform a controlled migration/backfill for legacy records.

---

## 12. Recommended Backfill Strategy

For collections that need division-based isolation:

1. Inventory records with missing `division`.
2. Derive division from authoritative fields where possible:
   - existing `division`
   - normalized program/programId
   - class/program relationships
   - authoritative user/class assignments
3. Flag ambiguous records for manual review instead of guessing.
4. Backfill canonical `division` values.
5. Add Firestore indexes required by combined branch + division queries.
6. Only then enforce strict division rules for that collection.

Do not mass-fill missing division with `kindergarten` merely because Kindergarten currently exists only in Kota Gorontalo.

---

## 13. Recommended Example: Future Multi-Branch Kindergarten

This design should work automatically when Kindergarten expands beyond Kota Gorontalo.

Example:

```text
Gorontalo Kids Manager
    branchId = kota_gorontalo
    division = kindergarten

Bone Bolango Kids Manager
    branchId = bone_bolango
    division = kindergarten
```

Their scopes become:

```text
Gorontalo Kids Manager
    → kota_gorontalo + kindergarten

Bone Bolango Kids Manager
    → bone_bolango + kindergarten
```

No new role type is required.

No special-case "Kids branch" logic is required.

No UI hack is required.

---

## 14. What NOT To Do

### Do not create a special Kindergarten branch

Do not invent something like:

```text
branchId = kids_gorontalo
```

Kindergarten is a **division**, not a physical branch.

### Do not solve this only with hidden tabs

Hiding Courses tabs is cosmetic.

A user should not receive unauthorized Courses records from Firestore merely because the UI does not show them.

### Do not trust the user's selected UI filter

Authorization should come from trusted profile data and Firestore rules, not from a client-controlled dropdown or local state variable.

### Do not use division as a replacement for branch

The user must remain constrained to their assigned physical branch as well.

### Do not default missing division to Kindergarten

This creates a dangerous legacy-data ambiguity.

---

## 15. Recommended Implementation Sequence

### Phase 1 — Scope Definition

Document and confirm, collection by collection, whether the data is:

- branch-only,
- branch + division,
- globally shared,
- or admin-only.

### Phase 2 — Data Model Audit

Verify all relevant records contain canonical:

```text
branchId
branch
division
```

where required.

### Phase 3 — Repository Refactor

Update repositories to accept a structured scope object and apply branch + division query constraints where appropriate.

### Phase 4 — Firestore Rules

Add division-aware helper functions and enforce combined branch + division access on division-sensitive collections.

### Phase 5 — Legacy Backfill

Backfill missing `division` safely; quarantine ambiguous records rather than guessing.

### Phase 6 — Indexes

Create required Firestore composite indexes for queries such as:

```text
branchId + division
branchId + division + timestamp
branchId + division + status
```

only where actual queries require them.

### Phase 7 — Regression Tests

Test at minimum:

```text
Courses Manager → cannot read Kindergarten data
Kindergarten Manager → cannot read Courses data
Kindergarten Manager → cannot read another branch's Kindergarten data
Admin → can read across branches/divisions
Kindergarten Instructor → only assigned/allowed Kindergarten data
```

### Phase 8 — UI Regression

Confirm that:

- Kids Manager still sees Kindergarten dashboard content.
- Course Manager still sees Courses content.
- shared events/announcements still appear where intended.
- no accidental permission-denied errors appear for shared collections.

---

## 16. Security Test Matrix

| Test | Expected Result |
|---|---|
| Kids Manager, Kota Gorontalo → Kota Gorontalo Kindergarten classes | ALLOW |
| Kids Manager, Kota Gorontalo → Kota Gorontalo Courses classes | DENY |
| Kids Manager, Kota Gorontalo → Bone Bolango Kindergarten classes | DENY |
| Kids Manager → Kindergarten admissions in own branch | ALLOW |
| Kids Manager → Courses admissions in own branch | DENY |
| Kids Manager → Kindergarten progress in own branch | ALLOW |
| Kids Manager → Courses progress in own branch | DENY |
| Admin → all branches/divisions | ALLOW |
| Missing division record → Kids Manager list query | DENY / excluded |
| Shared corporate event intended for all divisions | ALLOW according to event policy |

---

## 17. Architectural Outcome

The intended final model is:

```text
                         ┌──────────────────────┐
                         │        ADMIN         │
                         │ all branches         │
                         │ all divisions        │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
        │ Courses Mgr    │  │ Kindergarten   │  │ Other division │
        │                │  │ Manager        │  │ managers       │
        │ own branch     │  │ own branch     │  │ own branch     │
        │ courses only   │  │ kids only      │  │ division only  │
        └────────────────┘  └────────────────┘  └────────────────┘
```

In other words:

> **Branch determines where the user is allowed to operate. Division determines which part of the academy they are allowed to operate within that branch.**

This is the cleanest long-term fit for the existing MyLiberty Portal architecture.

---

## 18. Repository Files Most Relevant to This Change

Current implementation / policy areas to review together:

```text
firestore.rules

src/features/dashboard/kids/KidsManagerDashboard.jsx
src/features/dashboard/ManagerDashboard.jsx
src/features/reports/ReportsDashboard.jsx
src/features/reports/reportsRepository.js

src/constants/divisions.js
src/constants/branches.js

src/features/shared/roles.js
src/features/shared/securityRulesMatrix.test.js
```

Also review collection-specific repositories and schemas for every collection selected for division isolation.

---

## 19. Final Recommendation

Implement **Branch + Division as a two-dimensional access scope**.

Keep the existing `branchId` model.

Make `division` a first-class, canonical authorization attribute for division-sensitive data.

Enforce the scope in **three layers**:

```text
1. Firestore Security Rules
2. Repository / Firestore query constraints
3. Defensive UI filtering
```

The key principle is:

> A Kindergarten Manager should not merely be prevented from *seeing* Courses data. The system should prevent that data from being retrieved for the Manager in the first place, except where a specific collection is intentionally shared.

That gives MyLiberty a scalable model for future Kindergarten expansion into additional branches without introducing special-case role or branch logic.
