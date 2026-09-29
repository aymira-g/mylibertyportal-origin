# MyLiberty Portal — Kindergarten / TK Branch + Division Data Scope

**Status:** Proposed remediation / implementation specification  
**Repository:** `aymira-git/mylibertyportal-origin`  
**Prepared:** 2026-09-29  
**Scope:** Kids / Kindergarten **Manager**, **Front Office**, and **Instructor** workflows  
**Primary goal:** Ensure Kindergarten/TK users are constrained to the correct **branch + division** data boundary without breaking legitimate instructor cross-branch class assignments or intentionally shared data.

---

## 1. Executive Summary

The MyLiberty Portal already models two separate concepts:

- **Branch** = the physical campus / location.
- **Division** = the business or school unit, such as Courses or Kindergarten.

That is the correct foundation for Kids / TK.

A Kindergarten Manager or Kids Front Office user should therefore have a two-dimensional access scope:

```text
branchId = user's assigned branch
division = kindergarten
```

Conceptually:

```text
"Show me Kindergarten data inside my assigned branch."
```

A Kindergarten Instructor needs a slightly different policy because instructors can legitimately be assigned to a class directly, including a possible cross-branch assignment. The instructor model should therefore use:

```text
primary scope:
    division = kindergarten
    + normal branch scope

exception:
    explicitly assigned/substitute class may be visible even when its branch differs,
    provided the existing instructor-assignment rules allow that class.
```

The current implementation is only **partially aligned** with this design:

- **Kids Manager:** branch-scoped Firestore reads + client-side Kindergarten filtering.
- **Kids Front Office:** branch-scoped Firestore reads + client-side Kindergarten filtering.
- **Kids Instructor:** assigned-class / branch queries + client-side Kindergarten filtering.
- **Firestore rules:** generally enforce branch, but do **not** consistently enforce division as a data-access boundary.

The recommended architecture is therefore:

```text
Firestore security boundary
    ↓
branch + division scoped query where appropriate
    ↓
repository/domain layer
    ↓
defensive UI filtering
    ↓
display
```

rather than:

```text
Firestore
    ↓
whole branch / broad assignment dataset
    ↓
React filters to Kindergarten
    ↓
display
```

The latter is not sufficient as a security boundary.

---

## 2. Findings From the Current Kids Dashboards

### 2.1 Kids Manager — partial implementation

`src/features/dashboard/kids/KidsManagerDashboard.jsx` already does several things correctly:

1. It reads the manager's own profile to determine `managerBranchId`.
2. It queries `users`, `classes`, `applications`, and `shifts` using that branch.
3. It filters returned records to `kindergarten` before displaying them.
4. It passes `isAdminView={false}`, `isManager={true}`, `division="kindergarten"`, and the manager branch to `ReportsDashboard`.

The problem is that the Firestore reads are still **branch-wide**, not branch + division.

The current effective pattern is:

```text
Kota Gorontalo branch
├── Courses
├── Kindergarten
├── other branch-local records
        ↓
branch-scoped query
        ↓
browser receives branch-wide records
        ↓
React filters to Kindergarten
```

That means the UI can be correct while non-Kindergarten records have still crossed the backend → browser boundary.

---

### 2.2 Kids Front Office — same core issue

`src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx` calls:

```jsx
useDashboardData({
  restrictedRead: true,
  setActiveTab,
  division: "kindergarten",
});
```

This is good architecture at the component level, but `useDashboardData.js` does not currently add `where("division", "==", "kindergarten")` to its Firestore queries.

For example, the class/users/application listeners are effectively based on:

```js
where("branchId", "==", targetBranchId)
```

and then the hook performs later client-side filtering such as:

```js
matchesDivisionFilter(
  c.division || divisionOfProgram(c.programId || c.program),
  division
)
```

So Kids Front Office has the same pattern as Kids Manager:

```text
branch-scoped fetch
    ↓
client-side division filtering
```

The Front Office Reports tab also passes:

```jsx
<ReportsDashboard
  isAdminView={false}
  isFrontOffice={true}
  division="kindergarten"
  userBranch={myBranch}
/>
```

which is good intent, but the underlying reporting repository still primarily uses `branchId`, not `division`, as its query constraint.

The Walk-In / Guestbook workflow similarly stores the inquiry's division but the inquiry retrieval path is primarily branch-scoped.

---

### 2.3 Kids Instructor — different query model, same division gap

`src/features/dashboard/kids/KidsInstructorDashboard.jsx` gets its roster through:

```text
src/features/dashboard/useInstructorRoster.js
```

The roster hook currently queries classes primarily using:

```js
where("instructorId", "==", uid)
```

and:

```js
where("substituteInstructorId", "==", uid)
```

It does **not** require `division == kindergarten` in those Firestore queries.

The Kids Instructor dashboard then performs client-side filtering:

```js
matchesDivisionFilter(
  c.division || divisionOfProgram(c.programId || c.program),
  "kindergarten"
)
```

and the same pattern is used for students.

There is also a second branch-based active-class subscription in the Kids Instructor dashboard:

```js
where("branchId", "==", branchId),
where("status", "==", "active")
```

followed by client-side Kindergarten filtering.

So the instructor's current architecture is:

```text
assigned classes + branch classes
        ↓
broad Firestore result
        ↓
client-side Kindergarten filtering
```

This requires special treatment because an instructor may intentionally teach or substitute in a class at another branch.

**Do not break that legitimate assignment capability merely to simplify branch isolation.**

The right rule is:

> Instructor access is division-constrained, while class-specific access may cross the normal branch boundary when the instructor is explicitly assigned/substituting and the existing Firestore policy permits it.

---

## 3. Current Reports Integration

The current dashboards already pass the Kindergarten division into the reporting UI:

### Kids Manager

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

### Kids Front Office

```jsx
<ReportsDashboard
  isAdminView={false}
  isFrontOffice={true}
  division="kindergarten"
  userBranch={myBranch}
/>
```

### Kids Instructor

```jsx
<ReportsDashboard
  division="kindergarten"
  userBranch={instructorBranch || DEFAULT_BRANCH}
/>
```

This is good.

However, `src/features/reports/reportsRepository.js` still largely scopes reports by `branchId` and role state. Functions such as:

```text
fetchStaffShifts
fetchTodayScansData
fetchStudentProgressData
fetchAdmissionsReportData
fetchInstructorAnalyticsData
```

need a consistent policy for the new branch + division scope.

The important architectural lesson is:

> Passing `division="kindergarten"` into React is not enough if the repository then fetches the entire branch and relies on the tab to filter it.

---

## 4. Target Access Model

The desired model should be explicit.

| User Type | Normal Branch Scope | Division Scope | Cross-Branch Exception |
|---|---|---|---|
| Admin | All branches | All divisions | Not needed |
| Courses Manager | Assigned branch | Courses | None |
| Kindergarten Manager | Assigned branch | Kindergarten | None |
| Courses Front Office | Assigned branch | Courses | None unless explicitly defined |
| Kindergarten Front Office | Assigned branch | Kindergarten | None unless explicitly defined |
| Courses Instructor | Assigned branch | Courses | Explicitly assigned/substitute class |
| Kindergarten Instructor | Assigned branch | Kindergarten | Explicitly assigned/substitute class |

Therefore a Kindergarten Manager in Kota Gorontalo should be able to access:

```text
Kota Gorontalo + Kindergarten
```

and not:

```text
Kota Gorontalo + Courses
Bone Bolango + Kindergarten
Bone Bolango + Courses
```

A Kindergarten Instructor should normally operate inside:

```text
own branch + Kindergarten
```

but may additionally access:

```text
explicitly assigned Kindergarten class in another branch
```

when the existing class-assignment authorization permits that access.

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

Canonical meanings:

```text
branchId = canonical physical branch identifier
division = canonical organizational division
```

Do not use display labels as the primary authorization key.

Do not invent a special branch such as `kids_gorontalo`.

Kindergarten is a **division**, not a physical location.

---

## 6. Recommended Firestore Security Model

### 6.1 User division helper

Add a rules helper conceptually like:

```rules
function userDivision() {
  return signedIn()
    && ('division' in userProfile())
    ? userProfile().division
    : null;
}
```

### 6.2 Strict division matcher

For division-sensitive records:

```rules
function isSameDivisionStrict(data) {
  return data != null
    && 'division' in data
    && data.division == userDivision();
}
```

The key property is:

```text
missing division != kindergarten
```

A missing value should not silently become a Kids entitlement.

### 6.3 Manager / Front Office combined scope

For collections that are explicitly division-sensitive:

```rules
allow list: if isAdmin()
  || (
    (isManager() || isFrontOffice())
    && isSameBranchStrict(resource.data)
    && isSameDivisionStrict(resource.data)
  );
```

Write rules should likewise validate both branch and division on the requested document where the workflow allows the role to write.

The exact condition must still follow each collection's existing role and write semantics.

---

## 7. Instructor Security Model — Special Case

Do **not** simply copy the Manager rule to instructors.

The repository already has a legitimate concept of an instructor being authorized by assignment:

```text
resource.data.instructorId == request.auth.uid
```

or:

```text
resource.data.substituteInstructorId == request.auth.uid
```

That is operationally different from a manager's branch-wide authority.

### 7.1 Desired instructor access hierarchy

For a Kindergarten instructor, think of access as:

```text
DEFAULT:
    own branch
    + kindergarten division

OR:
    explicitly assigned/substitute kindergarten class
    even if the class's branch differs
```

### 7.2 Division must still be checked

An instructor who teaches a Kindergarten class should not gain Courses access merely because they are assigned to a document.

For division-sensitive instructor reads, the policy should therefore resemble:

```rules
isInstructorRoleAllowed()
&& isSameDivisionStrict(resource.data)
&& (
  isSameBranchStrict(resource.data)
  || resource.data.instructorId == request.auth.uid
  || resource.data.substituteInstructorId == request.auth.uid
)
```

The exact implementation must be reconciled with the collection's existing security model and assignment semantics.

### 7.3 Do not over-restrict instructors

Do not enforce:

```text
instructor.branchId == class.branchId
```

as the only instructor authorization rule if the business intentionally permits cross-branch teaching/substitution.

That would break a legitimate existing workflow.

---

## 8. Repository / Query Layer Changes

The repository layer should carry an explicit scope rather than relying on scattered booleans and UI state.

Prefer a structured argument such as:

```js
{
  branchId,
  division,
  role,
  isAdminView,
  isManager,
  isFrontOffice,
  uid,
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

This is clearer and avoids argument-order mistakes.

---

## 9. Kids Manager Remediation

### Current behavior

```text
query branch
    ↓
receive branch-wide records
    ↓
filter division in React
```

### Target behavior

For division-sensitive collections:

```js
query(
  collection(db, "classes"),
  where("branchId", "==", managerBranchId),
  where("division", "==", "kindergarten")
)
```

The same principle should be applied to the relevant `users`, `applications`, attendance/progress, and reporting queries where the records carry a division and the business policy requires division isolation.

---

## 10. Kids Front Office Remediation

`useDashboardData({ division: "kindergarten" })` should remain.

However, update `useDashboardData.js` so that division becomes part of the query scope for division-sensitive records.

Instead of:

```js
const classConstraints = [];
if (targetBranchId) {
  classConstraints.push(where("branchId", "==", targetBranchId));
}
```

use the equivalent structured policy:

```js
const classConstraints = [];
if (targetBranchId) {
  classConstraints.push(where("branchId", "==", targetBranchId));
}
if (division && division !== "all") {
  classConstraints.push(where("division", "==", division));
}
```

Do the same for users/applications where the underlying document schema supports division and the collection is designated division-sensitive.

The final query must not introduce a branch/division constraint that causes legitimate shared records to disappear.

---

## 11. Kids Instructor Remediation

The instructor flow needs a different approach.

### 11.1 Do not fetch arbitrary branch data and filter it later

The branch-based `allClasses` query should be division-scoped where the purpose is to build the instructor's local Kindergarten view.

For example:

```js
query(
  collection(db, "classes"),
  where("branchId", "==", branchId),
  where("division", "==", "kindergarten"),
  where("status", "==", "active")
)
```

### 11.2 Preserve explicitly assigned/substitute classes

The instructor roster currently queries:

```js
where("instructorId", "==", uid)
```

and:

```js
where("substituteInstructorId", "==", uid)
```

Those assignment queries should retain their existing purpose, but the resulting records should be verified as Kindergarten records before being included in the Kids dashboard.

If assignment queries are intended to support cross-branch classes, that behavior should remain.

### 11.3 Student loading should follow assigned Kindergarten classes

`useInstructorRoster.js` already derives student IDs from assigned class documents rather than downloading all users.

That is good and should be preserved.

But the selected class set must be correctly division-scoped before student IDs are derived, otherwise a non-Kindergarten assigned class could indirectly pull non-Kindergarten students into the instructor roster.

---

## 12. Reports Remediation Across All Kids Dashboards

The reports repository should be reviewed as a shared service used by Kids Manager, Kids Front Office, and Kids Instructor.

Functions currently involved include:

```text
fetchStaffShifts
fetchTodayScansData
fetchStudentProgressData
fetchAdmissionsReportData
fetchInstructorAnalyticsData
```

### 12.1 Manager / Front Office

For division-sensitive reports:

```text
branchId = current branch
AND
division = kindergarten
```

### 12.2 Instructor

Reports should use the instructor's own scope and assignment semantics rather than treating an instructor as a branch-wide supervisor.

The reports layer should not infer that:

```text
isActualAdmin = false
```

means the user automatically gets branch + division supervisor access.

Instead it should explicitly understand the difference between:

```text
Admin
Manager
Front Office
Instructor
```

and then apply the appropriate scope.

---

## 13. Which Data Should Be Division-Scoped?

Do not apply division restrictions blindly to every collection.

Recommended baseline:

| Data | Branch | Division | Notes |
|---|---:|---:|---|
| Students | Yes | Yes | Strongly recommended |
| Classes | Yes | Yes | Strongly recommended |
| Applications | Yes | Yes | Strongly recommended |
| Attendance | Yes | Yes | Where division is available |
| Progress reports | Yes | Yes | Strongly recommended |
| Instructor analytics | Yes | Yes | For division-specific managerial views |
| Staff operational records | Yes | Usually yes | Confirm business policy |
| Payments | Yes | Usually yes | Confirm finance policy before enforcing |
| Desk / Walk-In inquiries | Yes | Yes | Particularly important because inquiries contain PII |
| Corporate events | Yes | Optional | Some events should intentionally be shared |
| Global announcements | Optional | Optional | Depends on audience policy |
| Branch master data | Yes | No | Shared across divisions in the same branch |

The implementation should therefore maintain a **collection-by-collection access policy**.

---

## 14. Walk-In / Desk Inquiry Consideration

`WalkInInquiryTab.jsx` already receives:

```jsx
division="kindergarten"
branchLabel="Kota Gorontalo"
```

and `createDeskInquiry()` stores normalized branch data plus the supplied division.

However, `fetchRecentDeskInquiries()` primarily filters by `branchId`.

For Kids Front Office, the desired query should be:

```text
branchId = current branch
AND
division = kindergarten
```

because inquiries contain parent/student contact information.

Do not rely only on the table-level filtering.

The same branch + division boundary should be reflected in the Firestore rule where appropriate.

---

## 15. Keep UI Filtering as Defense in Depth

Existing client-side filtering should generally remain.

For example:

```js
matchesDivisionFilter(
  record.division || divisionOfProgram(record.programId || record.program),
  "kindergarten"
)
```

It is useful because:

- it protects the UI against malformed data,
- it handles legacy program-derived division values,
- it prevents accidental presentation of records that slipped through due to incomplete migration.

But it must be **defense in depth**, not authorization.

Desired layering:

```text
1. Firestore rules enforce authorization
2. Repository queries enforce expected scope
3. UI filtering defends against malformed / legacy records
```

---

## 16. Legacy Data Handling — Important

The repository already contains legacy branch normalization where missing `branchId` can be treated as Kota Gorontalo for backward compatibility.

Do **not** automatically copy that strategy to division.

Specifically, do not do this:

```text
missing division → kindergarten
```

That could expose historical Courses or ambiguous records to a Kids user.

Preferred behavior for division-sensitive queries:

```text
division == kindergarten
    → Kindergarten

division == courses
    → Courses

division missing
    → excluded from division-scoped list/query
```

Then perform a controlled migration/backfill.

---

## 17. Legacy Data Backfill Strategy

For collections that need division-based isolation:

1. Inventory records with missing `division`.
2. Derive division from authoritative fields where possible:
   - existing `division`
   - normalized `programId`
   - normalized `program`
   - class/program relationships
   - authoritative user/class assignments
3. Flag ambiguous records for manual review instead of guessing.
4. Backfill canonical division values.
5. Add required composite Firestore indexes.
6. Enforce strict division rules after the collection is ready.

Do not mass-fill missing division as `kindergarten` merely because Kindergarten currently exists only in Kota Gorontalo.

---

## 18. Recommended Implementation Sequence

### Phase 1 — Define scope policy

For each affected collection, explicitly document:

- branch-only,
- branch + division,
- assignment-based,
- shared/global,
- admin-only.

### Phase 2 — Audit document fields

Verify that affected records can reliably identify:

```text
branchId
branch
division
```

where required.

### Phase 3 — Fix repository/query scope

Update shared repositories and hooks first so all three Kids dashboards stop intentionally fetching broader datasets than necessary.

Priority areas:

```text
useDashboardData.js
useInstructorRoster.js
reportsRepository.js
deskInquiriesRepository.js
```

### Phase 4 — Harden Firestore rules

Add division-aware helpers and enforce combined branch + division checks for division-sensitive collections.

### Phase 5 — Handle legacy records

Backfill or quarantine missing division values.

### Phase 6 — Add required Firestore indexes

Likely query shapes include combinations such as:

```text
branchId + division
branchId + division + status
branchId + division + timestamp
```

Only create indexes that actual queries require.

### Phase 7 — Regression-test role boundaries

Test Manager, Front Office, Instructor, and Admin separately.

### Phase 8 — UI regression test

Confirm that Kids workflows still work while Courses remains isolated.

---

## 19. Security / Access Test Matrix

### Manager

| Test | Expected |
|---|---|
| Kids Manager + own branch + Kindergarten classes | ALLOW |
| Kids Manager + own branch + Courses classes | DENY |
| Kids Manager + other branch + Kindergarten classes | DENY |
| Kids Manager + own branch + Kindergarten admissions | ALLOW |
| Kids Manager + own branch + Courses admissions | DENY |
| Kids Manager + own branch + Kindergarten progress | ALLOW |
| Kids Manager + own branch + Courses progress | DENY |

### Front Office

| Test | Expected |
|---|---|
| Kids Front Office + own branch + Kindergarten learners | ALLOW |
| Kids Front Office + own branch + Courses learners | DENY |
| Kids Front Office + own branch + Kindergarten inquiries | ALLOW |
| Kids Front Office + own branch + Courses inquiries | DENY |
| Kids Front Office + other branch + Kindergarten inquiries | DENY |

### Instructor

| Test | Expected |
|---|---|
| Kids Instructor + own branch + assigned Kindergarten class | ALLOW |
| Kids Instructor + own branch + unrelated Kindergarten class | DENY / not visible according to existing assignment policy |
| Kids Instructor + own branch + Courses class | DENY |
| Kids Instructor + other branch + explicitly assigned Kindergarten class | ALLOW if existing instructor-assignment rule allows it |
| Kids Instructor + other branch + unassigned Kindergarten class | DENY |
| Kids Instructor + other branch + Courses class | DENY |

### Admin

| Test | Expected |
|---|---|
| Admin + all branches + all divisions | ALLOW |

### Legacy

| Test | Expected |
|---|---|
| Missing division record queried by Kids Manager | Excluded / DENY for division-scoped list |
| Missing branch record queried by strict branch list | Excluded / DENY |
| Shared corporate event intentionally targeting all divisions | ALLOW according to event audience policy |

---

## 20. Architectural Outcome

The final model should look like this:

```text
                         ┌──────────────────────┐
                         │        ADMIN         │
                         │ all branches         │
                         │ all divisions        │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼────────────────────┐
                │                   │                    │
                ▼                   ▼                    ▼
       ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
       │ Courses Mgr    │  │ Kindergarten   │  │ Other division │
       │ own branch     │  │ Manager        │  │ managers       │
       │ courses only   │  │ own branch     │  │ own branch     │
       └────────────────┘  │ kids only      │  │ own division   │
                           └────────────────┘  └────────────────┘

       ┌─────────────────────────────────────────────────────┐
       │ Kindergarten Instructor                             │
       │                                                     │
       │ default: own branch + kindergarten                 │
       │                                                     │
       │ exception: explicitly assigned/substitute           │
       │           kindergarten class may cross branch      │
       └─────────────────────────────────────────────────────┘
```

The underlying principle is:

> **Branch determines where the user is normally allowed to operate. Division determines which part of the academy they are normally allowed to operate within that branch. Instructor assignment is a separate, narrowly scoped authorization path for classes they are explicitly responsible for.**

---

## 21. What NOT To Do

### Do not create a special Kindergarten branch

Do not invent:

```text
branchId = kids_gorontalo
```

Kindergarten is a division.

### Do not solve this only by hiding tabs

A hidden Courses tab does not prevent Courses data from being downloaded.

### Do not trust client-controlled filters

Authorization should come from trusted profile state + Firestore rules, not a dropdown or local state value.

### Do not default missing division to Kindergarten

Missing division is ambiguous legacy data, not evidence of Kids ownership.

### Do not force all instructors to same-branch-only access

That could break intentional cross-branch teaching/substitution.

### Do not make instructors branch-wide supervisors

An instructor's assignment to one class should not imply access to every class or every student in that branch.

---

## 22. Files Most Relevant to This Change

### Core security / policy

```text
firestore.rules
src/constants/divisions.js
src/constants/branches.js
src/features/shared/roles.js
src/features/shared/securityRulesMatrix.test.js
```

### Kids Manager

```text
src/features/dashboard/kids/KidsManagerDashboard.jsx
```

### Kids Front Office

```text
src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx
src/features/dashboard/useDashboardData.js
src/features/dashboard/frontoffice/deskInquiriesRepository.js
src/features/dashboard/frontoffice/WalkInInquiryTab.jsx
```

### Kids Instructor

```text
src/features/dashboard/kids/KidsInstructorDashboard.jsx
src/features/dashboard/useInstructorRoster.js
```

### Shared reporting

```text
src/features/reports/ReportsDashboard.jsx
src/features/reports/reportsRepository.js
```

---

## 23. Final Recommendation

Implement **Branch + Division as a two-dimensional access scope** across the Kids workflows.

The important distinction is:

### Kids Manager

```text
own branch + kindergarten
```

### Kids Front Office

```text
own branch + kindergarten
```

### Kids Instructor

```text
own branch + kindergarten
OR
explicitly assigned/substitute kindergarten class
```

### Admin

```text
all branches + all divisions
```

Enforce the model in three layers:

```text
1. Firestore Security Rules
2. Repository / Firestore query constraints
3. Defensive UI filtering
```

The key principle is:

> A Kids user should not merely be prevented from *seeing* Courses data. The system should prevent Courses data from being retrieved for that user in the first place, except where a specific collection is intentionally shared or an instructor has a legitimate explicit assignment that grants access.

This approach scales cleanly when Kindergarten expands to additional branches. For example:

```text
Gorontalo Kids Manager
    → kota_gorontalo + kindergarten

Bone Bolango Kids Manager
    → bone_bolango + kindergarten
```

No special “Kids branch” is required, and no new role type is needed.
