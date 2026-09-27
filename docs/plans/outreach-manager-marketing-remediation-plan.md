# Remediation Plan: School Outreach Module (Manager & Marketing Dashboards)

**Document Status:** Proposal / Remediation Plan  
**Target File:** `docs/plans/outreach-manager-marketing-remediation-plan.md`  
**Author:** AI Pair Programmer  
**Audience:** Kifry (MyLiberty Portal Administrator & Lead)  
**Date:** 2026-09-27  
**Revision:** v2 — Repo-verified remediation plan

---

## 1. Executive Summary & Problem Diagnosis

The **School Outreach & Visits** module allows Marketing officers to log school visits, track contacts, and view target schools in Kota Gorontalo on an interactive Leaflet map. Meanwhile, Branch Managers track weekly outreach KPIs (visits, flyers distributed, leads generated) and follow-up schedules in `ManagerDashboard`.

A repository review confirms that the outreach workflow currently has several architectural and operational issues affecting collection-group reads, branch isolation, seed consistency, and map rendering reliability.

The main problems are:

1. `ManagerDashboard` and the outreach repository use `collectionGroup("visits")`, but the current Firestore rules only define the nested `/schoolOutreach/{schoolId}/visits/{visitId}` matcher. A collection-group query needs an explicit collection-group rule.
2. `createSchoolVisit()` currently writes visit records without `branchId`/`branch`, making branch-scoped collection-group queries impossible without resolving branch data from the parent school.
3. Seed schools do not currently carry explicit branch metadata, even though normal `addSchool()` writes branch metadata.
4. `listenToOutreachVisits()` currently has no `branchId` query constraint.
5. `listenToSchools()` currently has no branch filter, while school documents are protected by branch-aware rules.
6. Existing visit records may lack the new branch fields and therefore require a controlled backfill before strict branch-based querying becomes authoritative.
7. Leaflet may calculate incorrect dimensions when initialized while its tab/container is hidden or not fully laid out. This is a UI reliability issue that should be verified manually rather than treated as a proven data-layer defect.
8. The current cost statement is too absolute. The proposed limits are intended to keep read volume controlled, but actual Firestore usage depends on total application traffic and project-wide quotas.

### Current Architecture

```mermaid
graph TD
    A[Manager / Marketing Dashboard]
    A --> B[schoolOutreachRepository]
    B --> C[listenToOutreachVisits]
    C --> D[collectionGroup 'visits']
    D --> E[Firestore Security Rules]

    F[schoolOutreach/{schoolId}]
    F --> G[Parent School branchId]

    H[createSchoolVisit]
    H --> I[Visit Document]
    I -. currently missing .-> J[branchId]

    K[listenToSchools]
    K -. currently no branch filter .-> F

    L[Marketing Dashboard tab]
    L --> M[GorontaloOutreachMap]
    M --> N[Leaflet container visibility / layout]
```

---

## 2. Root Causes

### Root Cause 1: Missing Collection-Group Rule in `firestore.rules`

In `ManagerDashboard.jsx`, the dashboard calls:

```javascript
listenToOutreachVisits({
  startDate,
  orderDirection: "desc",
  limitCount: 200,
})
```

`listenToOutreachVisits()` executes:

```javascript
const visitsGroup = collectionGroup(db, "visits");
```

The current rules define visits only inside:

```rules
match /schoolOutreach/{schoolId} {
  match /visits/{visitId} {
    ...
  }
}
```

That nested matcher protects direct access beneath a known `schoolOutreach/{schoolId}` path, but it does not by itself authorize a collection-group query across all `visits` subcollections.

A dedicated recursive wildcard matcher is therefore required:

```rules
match /{path=**}/visits/{visitId} {
  ...
}
```

Without that collection-group matcher, the Manager collection-group listener can fail with `permission-denied`.

### Root Cause 2: Visit Documents Lack `branchId` / `branch`

The current `createSchoolVisit()` implementation validates the visit payload and then writes:

```javascript
const visitData = {
  schoolId,
  source: COLLECTION_NAME,
  visitDate: validated.visitDate,
  contactName: validated.contactName,
  ...
};
```

It does not currently copy the parent school's branch metadata onto the visit document.

That creates three problems:

1. `listenToOutreachVisits()` cannot reliably apply:
   ```javascript
   where("branchId", "==", managerBranchId)
   ```
2. Collection-group security rules cannot validate branch membership directly from the visit document.
3. Branch isolation would otherwise require resolving the parent school document inside the security rule, which adds rule complexity and is less suitable for the intended collection-group query pattern.

### Root Cause 3: Seed Schools Lack Explicit Branch Metadata

`KOTA_GORONTALO_SEEDS` contains `municipality: "Kota Gorontalo"` but does not currently include:

```javascript
branchId: "kota_gorontalo",
branch: "Kota Gorontalo",
```

`seedInitialSchoolsIfEmpty()` writes the seed objects directly.

This is different from the normal `addSchool()` path, which already enriches new school records with:

```javascript
branch
branchId
```

Therefore, the remediation should treat this as a **seed-path consistency problem**, not as evidence that the whole school model lacks branch support.

### Root Cause 4: `listenToOutreachVisits()` Has No Branch Query Constraint

The current repository builds constraints beginning with:

```javascript
where("source", "==", COLLECTION_NAME)
```

and may additionally filter by officer/date/order/limit.

There is currently no `branchId` constraint.

For a branch-isolated manager query, the repository should support:

```javascript
where("branchId", "==", options.branchId)
```

and the dashboard should always provide the authenticated manager's branch.

This is a security requirement, not merely a performance optimization: Firestore security rules do not act as post-query filters. The query must be constructed so that its possible result set satisfies the applicable rule.

### Root Cause 5: `listenToSchools()` Has No Branch Query Constraint

`listenToSchools()` currently queries active schools with:

```javascript
const constraints = [
  where("active", "==", true),
  orderBy("name")
];
```

It does not currently accept or apply `branchId`.

This is important because the school master document itself is protected by branch-aware Firestore rules:

```rules
allow read: if isAdmin()
  || ((isManager() || hasRole('marketing')) && isSameBranch(resource.data));
```

The remediation therefore needs to address **both** sides of the outreach data model:

- parent school records;
- visit subcollection records.

Branch isolation should not be implemented only for visits while leaving school queries globally scoped.

### Root Cause 6: Existing Data Requires Backfill

New visit records can be made branch-aware, but existing visit documents may not contain `branchId`.

If the application moves to:

```javascript
where("branchId", "==", managerBranchId)
```

those legacy documents will not be returned.

A controlled one-time backfill should therefore derive branch metadata from:

```text
schoolOutreach/{schoolId}
```

and write the corresponding `branchId` and `branch` values onto:

```text
schoolOutreach/{schoolId}/visits/{visitId}
```

The backfill should be treated as a deployment/data-migration task, not silently assumed to happen in the client.

### Root Cause 7: Leaflet Map Visibility / Resize Reliability

`GorontaloOutreachMap.jsx` already provides an explicit container height:

```jsx
<div className="relative w-full h-[400px] sm:h-[480px] ...">
```

Therefore, a literal "0px height" should **not** be treated as a confirmed root cause from source inspection alone.

However, Leaflet can calculate map dimensions incorrectly when initialized while a tab/container is hidden or before layout has stabilized.

The correct remediation is therefore:

- verify the issue manually in the tabbed dashboard;
- add `map.invalidateSize()` after the map becomes visible;
- optionally use `ResizeObserver` if the container can change size dynamically.

---

## 3. Proposed Architecture & Remediation Actions

### Action 1: Add a Collection-Group Security Rule

Add a dedicated collection-group rule in `firestore.rules`:

```rules
match /{path=**}/visits/{visitId} {
  // Admin can read all outreach visits.
  allow read: if isAdmin()
    || (
      (isManager() || hasRole('marketing'))
      && isSameBranchStrict(resource.data)
    );

  // Non-admin writes must include branch metadata that belongs to the caller's branch.
  allow create: if (isAdmin()
      || (
        (isManager() || hasRole('marketing'))
        && isSameBranchStrict(request.resource.data)
      ))
    && request.resource.data.visitDate is string
    && request.resource.data.contactName is string
    && request.resource.data.contactRole is string
    && request.resource.data.branchId is string
    && request.resource.data.branch is string
    && request.resource.data.source == 'schoolOutreach';

  // Preserve the existing least-privilege policy unless the product explicitly
  // requires managers/marketing staff to edit visit history.
  allow update, delete: if isAdmin();
}
```

### Important rule note

The repository already contains a stricter branch helper intended for list/query-safe logic:

```rules
function isSameBranchStrict(data) {
  return (data != null && 'branchId' in data && data.branchId == userBranch())
    || (data != null && !('branchId' in data) && 'branch' in data && (
      ...
    ));
}
```

The new collection-group rule should use the strict branch helper rather than relying on the legacy branchless fallback.

The existing nested rule under:

```rules
match /schoolOutreach/{schoolId} {
  match /visits/{visitId} {
    ...
  }
}
```

should not simply be deleted without checking all direct per-school visit workflows. The coding agent should reconcile both rule paths so direct visit access and collection-group access remain intentional and consistent.

---

### Action 2: Inherit `branchId` & `branch` on Visits

Update `createSchoolVisit()` so the visit inherits the parent school's branch metadata.

Preferred approach:

1. Read the parent school document:
   ```text
   schoolOutreach/{schoolId}
   ```
2. Validate that the parent exists.
3. Read:
   ```javascript
   parentSchool.branchId
   parentSchool.branch
   ```
4. Require valid branch metadata rather than silently inventing a branch for an already-existing school.
5. Write those values onto the visit:

```javascript
const visitData = {
  schoolId,
  source: COLLECTION_NAME,
  branchId: parentSchool.branchId,
  branch: parentSchool.branch,
  visitDate: validated.visitDate,
  contactName: validated.contactName,
  contactRole: validated.contactRole,
  phone: validated.phone || "",
  flyersHandedOut: validated.flyersHandedOut,
  leadsCollected: validated.leadsCollected,
  outcome: validated.outcome || "",
  notes: validated.notes || "",
  nextActionDate: validated.nextActionDate || "",
  statusAfterVisit: validated.statusAfterVisit,
  createdBy: creatorUid || "anonymous",
  createdAt: serverTimestamp(),
};
```

Do not use:

```javascript
branchId: parentSchool.branchId || "kota_gorontalo"
```

as the permanent fix for existing records, because that could silently assign the wrong branch to malformed or legacy data.

Use explicit data migration for legacy records instead.

---

### Action 3: Keep the School Schema Contract Explicit

`schoolMasterSchema` already supports:

```javascript
branch: z.string().trim().optional().default("Kota Gorontalo"),
branchId: z.string().trim().optional().default("kota_gorontalo"),
```

The remediation should preserve this behavior.

For `schoolVisitSchema`, branch metadata should be treated as repository-owned metadata rather than user-entered form data.

Therefore:

- do **not** require Marketing staff to enter `branchId` manually in the visit modal;
- derive it from the parent school;
- validate it before writing;
- optionally include it in a visit-output schema if the project later formalizes persisted visit records separately from form input.

---

### Action 4: Add Branch Metadata to Seed Records

Update `KOTA_GORONTALO_SEEDS` so every seed object contains:

```javascript
branchId: "kota_gorontalo",
branch: "Kota Gorontalo",
```

Example:

```javascript
{
  name: "SMAN 1 Gorontalo",
  municipality: "Kota Gorontalo",
  branchId: "kota_gorontalo",
  branch: "Kota Gorontalo",
  district: "Kota Tengah",
  ...
}
```

Also add explicit test assertions that seeded records contain both fields.

---

### Action 5: Add `branchId` to `listenToOutreachVisits()`

Extend the options contract:

```javascript
/**
 * @typedef {object} OutreachVisitOptions
 * @property {string}  [branchId]       - Branch ID; required for branch-scoped non-admin dashboard queries.
 * @property {string}  [startDate]
 * @property {string}  [endDate]
 * @property {string}  [officerId]
 * @property {"asc"|"desc"} [orderDirection]
 * @property {number}  [limitCount]
 * @property {number}  [limit]
 */
```

Add:

```javascript
if (opts.branchId && opts.branchId !== "all") {
  constraints.push(where("branchId", "==", opts.branchId));
}
```

For Manager Dashboard calls:

```javascript
listenToOutreachVisits(
  {
    branchId: managerBranchId,
    startDate,
    orderDirection: "desc",
    limitCount: 200,
  },
  ...
);
```

And:

```javascript
listenToOutreachVisits(
  {
    branchId: managerBranchId,
    startDate: weekStart,
    endDate: weekEnd,
    orderDirection: "desc",
    limitCount: 500,
  },
  ...
);
```

Do not silently allow a branch-scoped manager query to omit `branchId`.

---

### Action 6: Add Branch Scoping to `listenToSchools()`

Extend `listenToSchools()` to support:

```javascript
listenToSchools({
  branchId: managerBranchId,
}, onData, onError);
```

The query should become conceptually:

```javascript
const constraints = [
  where("active", "==", true),
];

if (options.branchId && options.branchId !== "all") {
  constraints.push(where("branchId", "==", options.branchId));
}

constraints.push(orderBy("name"));
```

The exact ordering/filter implementation should preserve Firestore query compatibility and add only the composite indexes actually required by the final query shape.

---

### Action 7: Pass Branch Context into Both Dashboards

#### Manager Dashboard

The current `ManagerDashboard` already derives:

```javascript
const managerBranchId = useMemo(() => {
  return managerProfile?.branchId
    || branchToId(managerProfile?.branch || DEFAULT_BRANCH);
}, [managerProfile]);
```

Use that branch ID for:

- `listenToOutreachVisits()`;
- `listenToSchools()`.

#### Marketing Dashboard

The current `MarketingDashboard` loads schools using:

```javascript
listenToSchools((data) => {
  setSchools(data);
});
```

This should be changed to provide the authenticated marketing user's branch.

For example, use the already available:

```javascript
auth.currentUser?.uid
```

to obtain the user's profile/branch and then pass the branch into the repository query.

The implementation should follow existing project conventions for user-profile access rather than adding a second incompatible branch-resolution mechanism.

---

### Action 8: Backfill Existing Visit Documents

Create a controlled migration/admin script to update existing records:

```text
schoolOutreach/{schoolId}/visits/{visitId}
```

For each visit:

1. Read its parent:
   ```text
   schoolOutreach/{schoolId}
   ```
2. Read:
   ```javascript
   branchId
   branch
   ```
3. Write those values to the visit.
4. Do not overwrite a valid existing `branchId` unless the migration explicitly identifies it as inconsistent.
5. Log skipped/error cases for manual review.

The coding agent should not implement this migration as an automatic client-side startup task.

A suggested migration target is:

```javascript
{
  branchId: parentSchool.branchId,
  branch: parentSchool.branch,
}
```

All records should be verified before the stricter collection-group rule becomes the only production access path.

---

### Action 9: Add Required Firestore Indexes

The repository currently uses collection-group `visits` queries ordered by `visitDate` and filtered by `source`, with additional filters introduced by this remediation.

At minimum, verify/add the index for the primary Manager Dashboard shape:

```json
{
  "collectionGroup": "visits",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "source", "order": "ASCENDING" },
    { "fieldPath": "branchId", "order": "ASCENDING" },
    { "fieldPath": "visitDate", "order": "DESCENDING" }
  ]
}
```

If ascending ordering remains supported:

```json
{
  "collectionGroup": "visits",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "source", "order": "ASCENDING" },
    { "fieldPath": "branchId", "order": "ASCENDING" },
    { "fieldPath": "visitDate", "order": "ASCENDING" }
  ]
}
```

If `officerId` is used together with branch/date filtering in production, verify the required composite index for that final query shape rather than adding speculative indexes.

For `schoolOutreach` school-list queries, verify the composite index required by:

```text
active == true
branchId == <branch>
orderBy name
```

The final index file should reflect the actual query shapes implemented, not hypothetical future queries.

---

### Action 10: Leaflet Visibility / Resize Remediation

Do not claim a confirmed `0px` container-height bug.

Instead:

1. Reproduce the issue by opening the Marketing Dashboard directly on the outreach tab.
2. Reproduce it by loading Overview first and then switching to School Visits & Map.
3. If the map renders incorrectly, call:

```javascript
requestAnimationFrame(() => {
  map.invalidateSize();
});
```

or use a `ResizeObserver` on the map container.

A possible implementation pattern is:

```javascript
useEffect(() => {
  const map = mapInstanceRef.current;
  const container = mapContainerRef.current;

  if (!map || !container) return;

  const refresh = () => {
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  };

  refresh();

  const observer = new ResizeObserver(refresh);
  observer.observe(container);

  return () => observer.disconnect();
}, []);
```

The agent should avoid creating multiple Leaflet map instances or duplicate observers.

---

## 4. Files to Modify

| File | Change Scope |
| :--- | :--- |
| `firestore.rules` | Add a collection-group `visits` matcher; enforce strict branch checks; preserve/reconcile direct per-school visit access. |
| `firestore.indexes.json` | Add only the composite indexes required by the final branch-scoped query shapes. |
| `src/schemas/schoolOutreachSchema.js` | Preserve explicit school branch contract; do not require branch entry in the visit form payload. |
| `src/features/dashboard/marketing/seedSchoolsData.js` | Add `branchId` and `branch` to all seed records. |
| `src/features/dashboard/marketing/schoolOutreachRepository.js` | Add branch-aware `listenToSchools()`, add branch-aware `listenToOutreachVisits()`, and inherit parent school branch metadata in `createSchoolVisit()`. |
| `src/features/dashboard/ManagerDashboard.jsx` | Pass `managerBranchId` into school and visit listeners. |
| `src/features/dashboard/MarketingDashboard.jsx` | Resolve the authenticated user's branch using existing project conventions and pass it into `listenToSchools()`. |
| `src/features/dashboard/marketing/GorontaloOutreachMap.jsx` | Add `invalidateSize()` / `ResizeObserver` only after verifying hidden-tab rendering behavior. |
| `src/features/dashboard/marketing/schoolOutreachRepository.test.js` | Add tests for branch propagation, branch filtering, and seed branch metadata. |
| `src/features/dashboard/marketing/...` security/emulator tests | Add explicit cross-branch allow/deny coverage. |
| Migration/admin script location selected by repository conventions | Backfill `branchId` and `branch` on existing visit documents. |

---

## 5. Security Design Requirements

The final implementation should satisfy all of the following:

### Admin

- Can read all outreach schools and visits.
- Existing admin capabilities must not regress.

### Manager

- Can read only schools belonging to the manager's branch.
- Can read only visits belonging to the manager's branch.
- Manager queries must explicitly constrain by `branchId`.
- Manager is not granted write/delete access to visit history unless separately approved by product requirements.

### Marketing

- Can read only schools belonging to the marketing user's branch.
- Can read/create visits only within the marketing user's branch.
- A marketing user must not be able to choose an arbitrary `branchId` in the client and use it to cross branch boundaries.

### Legacy / malformed records

- Legacy visit records without branch metadata must not silently become cross-branch readable.
- Migration must repair expected records before strict collection-group behavior is relied upon.
- Records that cannot be safely assigned a branch must be surfaced for manual review.

---

## 6. Cost & Performance Assessment

### Expected impact

**Expected Firestore cost impact: low, provided usage remains within the project's existing quotas and traffic profile.**

The current architecture already limits Manager visit streams:

- rolling historical window;
- weekly window;
- explicit result limits.

Adding `branchId` equality filters should further narrow the result set for branch-scoped dashboards.

However, no implementation plan should state that the change is guaranteed to cost `$0`. Actual Firestore usage depends on:

- document reads;
- document writes;
- deletes;
- storage;
- bandwidth;
- listener activity;
- total application traffic;
- project-wide free-tier/paid-plan limits.

The plan should therefore use **"expected low impact"** rather than **"guaranteed $0 cost."**

---

## 7. Verification Plan

### 7.1 Unit & Repository Tests

Run:

```bash
npm test
```

Verify at minimum:

#### Visit creation

- visit document includes `branchId`;
- visit document includes `branch`;
- branch values come from the parent school, not user-entered visit form fields.

#### Seed creation

- seeded schools include:
  ```text
  branchId = kota_gorontalo
  branch = Kota Gorontalo
  ```

#### Visit query filtering

- `listenToOutreachVisits({ branchId: "kota_gorontalo" })` adds the expected Firestore constraint.

#### School query filtering

- `listenToSchools({ branchId: "kota_gorontalo" })` adds the expected branch constraint.

---

### 7.2 Typecheck & Linter

Run the repository's standard checks, including where supported:

```bash
npm run typecheck
```

and the project's configured lint/test commands.

Verify:

- no broken imports;
- no invalid Firestore query construction;
- no unused branch-related code;
- no Leaflet effect lifecycle regressions.

---

### 7.3 Firestore Emulator / Security Rules Tests

Explicitly test these cases:

| Actor | Branch | Document Branch | Expected |
| :--- | :--- | :--- | :--- |
| Admin | any | any | Allow read |
| Manager | `kota_gorontalo` | `kota_gorontalo` | Allow read |
| Manager | `kota_gorontalo` | `bone_bolango` | Deny |
| Marketing | `kota_gorontalo` | `kota_gorontalo` | Allow read/create |
| Marketing | `kota_gorontalo` | `bone_bolango` | Deny |
| Manager | `kota_gorontalo` | missing `branchId` | Deny under strict collection-group rule |
| Marketing | `kota_gorontalo` | forged `branchId = bone_bolango` | Deny |

Also test collection-group queries, not only direct document reads.

---

### 7.4 Migration Verification

Before and after the backfill:

- count visits with missing `branchId`;
- count visits with missing `branch`;
- count visits whose branch does not match their parent school;
- verify expected Kota Gorontalo records become queryable after migration;
- retain a list of skipped/ambiguous records.

Do not mark the migration complete solely because the script exits successfully.

---

### 7.5 Manager Dashboard Manual Verification

As a manager from `kota_gorontalo`:

- Outreach tab loads without `permission-denied`;
- weekly visit counts calculate correctly;
- 90-day visit history loads;
- only Kota Gorontalo visits appear;
- no Bone Bolango/Limboto/Pohuwato visits appear;
- school list contains only the manager's branch.

---

### 7.6 Marketing Dashboard Manual Verification

As a Marketing user:

- school list contains only the user's branch;
- School Visits & Map opens successfully;
- Leaflet tiles render correctly;
- switching Overview → Visits → Overview → Visits does not produce a blank/shifted map;
- opening a school and logging a visit succeeds;
- newly created visit contains the correct branch metadata;
- attempting to manipulate branch metadata from the client cannot cross branch boundaries.

---

### 7.7 Regression Verification

Verify that:

- direct per-school visit history still works;
- existing school CRUD workflows remain functional;
- seed operation still works;
- Manager Dashboard does not lose unrelated data;
- Marketing Dashboard inquiry/class functionality is unaffected;
- no broadening of permissions occurs in unrelated Firestore collections.

---

## 8. Recommended Implementation Order

The coding agent should implement in this order:

1. **Audit current data and rules assumptions.**
2. **Add/verify branch metadata on school seeds.**
3. **Add branch inheritance to new visit writes.**
4. **Add branch-aware school and visit repository queries.**
5. **Pass authenticated branch context from Manager and Marketing dashboards.**
6. **Add/reconcile collection-group security rules.**
7. **Add the exact composite indexes required by final query shapes.**
8. **Run repository/unit tests.**
9. **Run Firestore emulator security tests.**
10. **Run the visit-data backfill for existing records.**
11. **Re-run security/query tests after migration.**
12. **Verify Leaflet tab rendering and add `invalidateSize()`/`ResizeObserver` only where reproduction justifies it.**
13. **Perform final Manager + Marketing manual regression testing.**

---

## 9. Handoff Notes for the Coding Agent

Do not treat this document as permission to rewrite unrelated outreach architecture.

The intended remediation is incremental.

### Preserve existing behavior where not directly related

Keep:

- the existing school outreach document structure;
- the existing visit subcollection structure;
- the existing `source: "schoolOutreach"` discriminator;
- existing Manager 90-day and weekly query limits;
- existing WITA date logic;
- existing dashboard/tab structure;
- existing `addSchool()` branch enrichment;
- existing role model.

### Do not solve branch isolation by weakening rules

Do **not**:

- remove branch checks;
- fall back to unrestricted collection-group reads;
- make managers/admin-like users simply because collection-group reads are failing;
- trust a client-provided `branchId` without security-rule validation;
- use a broad `"all"` branch filter for non-admin users.

### Do not silently repair legacy data in normal client startup

The backfill belongs in a controlled administrative/migration workflow.

### Validate against the repository, not only this document

Before modifying code, confirm:

- current branch helper behavior;
- current user profile fields;
- current Firestore rule deployment model;
- current test harness;
- current query indexes;
- all existing callers of `listenToSchools()` and `listenToOutreachVisits()`.

Where repository reality differs from this plan, update the implementation carefully and document the discrepancy rather than blindly following an outdated assumption.

---

## 10. Definition of Done

The remediation is complete when all of the following are true:

- [ ] Collection-group `visits` queries are authorized by an explicit Firestore rule.
- [ ] Visit documents contain authoritative `branchId` and `branch`.
- [ ] Existing visit documents have been safely backfilled or explicitly flagged for review.
- [ ] Manager visit queries include the manager's branch.
- [ ] Marketing school queries include the marketing user's branch.
- [ ] Manager school queries include the manager's branch.
- [ ] Cross-branch collection-group reads fail in emulator security tests.
- [ ] Client attempts to forge another branch fail.
- [ ] Required Firestore indexes are deployed.
- [ ] Repository tests pass.
- [ ] Security-rule tests pass.
- [ ] Manager Dashboard outreach widgets load successfully.
- [ ] Marketing Dashboard school/map workflow works successfully.
- [ ] Leaflet rendering is stable when switching tabs.
- [ ] No unrelated role permissions are broadened.
- [ ] No unrelated dashboard functionality regresses.

---

## 11. Summary

The core problem is not simply "the visits query needs a rule."

The outreach data model needs **consistent branch-aware querying and security across both school master records and visit records**.

The durable solution is:

```text
Authenticated User
      │
      ├── branchId
      │
      ▼
Manager / Marketing Dashboard
      │
      ▼
Repository Query
      │
      ├── schoolOutreach: branchId filter
      │
      └── collectionGroup(visits): branchId filter
                  │
                  ▼
          Firestore Security Rule
                  │
                  ▼
          Same-branch enforcement
```

For new visits:

```text
Parent School
    │
    ├── branchId
    └── branch
         │
         ▼
Visit Document
    ├── branchId
    └── branch
```

For historical visits:

```text
Existing Visit
      │
      ▼
Controlled Backfill
      │
      ▼
branchId + branch added
```

This approach keeps the current outreach architecture intact while making branch isolation explicit, query-compatible, testable, and maintainable.
