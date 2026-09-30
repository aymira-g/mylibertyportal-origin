# Staff Access Model Audit
## ROLE + BRANCH + DIVISION — Current State vs. Intended Model

> Evidence-based inspection against the live codebase.
> No code was changed to produce this report.

---

## 1. How are ROLE, BRANCH, and DIVISION represented in the data model?

### Storage (Firestore — `/users/{uid}`)

Every staff user document carries:

| Field | Type | Example values |
|---|---|---|
| `role` | string | `"instructor"`, `"manager"`, `"frontoffice"`, `"opslead"`, `"instructorleader"`, `"marketing"`, `"officeboy"`, `"admin"` |
| `branch` | string (display) | `"Kota Gorontalo"`, `"Bone Bolango"`, `"Pohuwato"`, `"Limboto"` |
| `branchId` | string (canonical) | `"kota_gorontalo"`, `"bone_bolango"`, `"pohuwato"`, `"limboto"` |
| `division` | string | `"courses"`, `"kindergarten"`, `"all"` |
| `status` | string | `"active"`, `"resigned"`, `"terminated"` |

**Observations:**
- Branch is stored in two fields: `branch` (display label) and `branchId` (canonical). Firestore rules bridge both via `userBranch()` and `isSameBranch()`.
- Division is a single string field. No canonical enum is enforced at the Firestore rule level — only in frontend normalization.
- `"all"` as a division value is recent (added in the last session). There is **no legacy normalization path** that would produce `"all"` from old documents.
- There is no `branchId = "all"` concept in the current data model or rules.

---

## 2. Where are ROLE permissions enforced?

### Backend (Firestore Rules) — **Primary security boundary**

The rules define role-based access functions:

```
isAdmin()          → role == 'admin'
isManager()        → role == 'manager' OR 'branch_manager'
isFrontOffice()    → role in ['frontoffice', 'opslead', 'ops_lead', 'frontofficelead']
isStaff()          → any recognized staff role
```

Role checks are applied per-collection:
- `/users` — get/list/update/delete restricted by role tier
- `/invites` — create only by `isAdmin()`
- `/shifts` — create by `isAdmin() || isFrontOffice()`
- `/classes` — create/delete only by `isAdmin()`
- `/payments` — create by `isAdmin() || isFrontOffice()`
- `/applications` — update by `isAdmin() || isFrontOffice()`
- `/approvals` — approval decision by role (`isApproverForDoc`)

### Frontend — **UI routing / convenience only**

`App.jsx` routes to dashboard by `effectiveRole`:
- `admin` → `AdminDashboard`
- `manager` + `division === "kindergarten"` → `KidsManagerDashboard`, otherwise `ManagerDashboard`
- `instructor/instructorleader` + `division === "kindergarten"` → `KidsInstructorDashboard`
- `frontoffice/opslead` + `division === "kindergarten"` → `KidsFrontOfficeDashboard`
- `marketing` → `MarketingDashboard`
- `officeboy` → `OfficeBoyDashboard`

**This is not an authorization boundary.** The frontend reads `division` from Firestore and uses it to select which dashboard component to render.

---

## 3. Where are BRANCH restrictions enforced?

### Backend (Firestore Rules) — **Enforced**

`isSameBranch(data)` and `isSameBranchStrict(data)` are applied to:
- `/users` (get, list, create, update, delete)
- `/applications` (all operations)
- `/classes` (get, list, update)
- `/attendance` (get, list, create, update)
- `/payments` (get, list, create, update)
- `/shifts` (get, list, create, update)
- `/deskInquiries` (all operations)
- `/schoolOutreach` and `/visits` (all operations)
- `/progressReports` (all operations)
- `/todos` (with special handling for `branchId == 'all'`)

**`isAdmin()` bypasses branch checks on all collections.**

`isSameBranch()` resolves branch from `userProfile().branchId` → `userProfile().branch` (with display→canonical mapping) → defaults to `'kota_gorontalo'`.

### Frontend

`App.jsx` reads `branchId` from the user's Firestore doc and stores it in React state. Dashboards receive this as a prop and use it to scope their own queries. This is a **UI filtering convenience** on top of the Firestore-level enforcement.

---

## 4. Where are DIVISION restrictions enforced?

### Backend (Firestore Rules) — **Partially enforced, with a critical gap**

Division is enforced through two functions:

```
isDivisionAllowedForBranchStaff(data):
  → if user.division == 'kindergarten'
      → data.division must == 'kindergarten'
  → otherwise
      → data.division must NOT be 'kindergarten'
      (i.e., anything that isn't kindergarten passes)
```

This is applied to:
- `/users` (get, list, create, update, delete)
- `/applications` (get, list, update, delete)
- `/classes` (get, list, update)
- `/attendance` (get, list, create, update)
- `/payments` (get, list, create)
- `/shifts` (get, list, create)
- `/deskInquiries` (all)
- `/progressReports` (get, list, update, delete)

> [!CAUTION]
> **Critical gap identified:** `isDivisionAllowedForBranchStaff()` does NOT know about `"all"`. It reads the *requesting user's* `division` field from their profile. If a staff member has `division = "all"`, the function evaluates:
>
> ```
> userDivision() == 'kindergarten'  →  false  (because it's "all", not "kindergarten")
> therefore: data.division must NOT be 'kindergarten'
> ```
>
> This means a staff member with `division = "all"` would be **blocked from accessing kindergarten records** by the current rules, because the rule interprets their non-"kindergarten" division as "courses-only", not "cross-divisional".
>
> **`division = "all"` currently has NO authorization meaning in Firestore rules.**

### Frontend

`useDashboardData.js` passes `division` from `App.jsx` into dashboard hooks. Multiple places filter client-side:
- `division && division !== "all"` → apply filter
- `division === "all"` → skip filter (show all)

So in the **frontend**, `"all"` is already treated as "show everything." But at the **Firestore rules level**, `"all"` has no effect — division isolation is only binary (kindergarten vs. not-kindergarten).

---

## 5. Is division currently just filtering UI/data, or does it participate in authorization?

**Both — but inconsistently:**

| Layer | Division role |
|---|---|
| **Firestore rules** | Partial binary authorization (kindergarten isolation only). `"all"` is not recognized — treated as non-kindergarten. |
| **Dashboard routing** (App.jsx) | Determines which dashboard component loads. Direct consequence for the user experience. |
| **Data filtering** (useDashboardData) | Client-side convenience filter. `"all"` means "skip filter." |
| **Invite validation** (inviteSchema) | Guards `marketing` + `kindergarten` combination. No guard for `"all"`. |
| **Firestore write path** (invitesRepository, StaffSignup) | Stores division as-is from the invite. |

**The gap:** Division participates in authorization at the rules level, but the rules do not understand `"all"`. This is a real inconsistency.

---

## 6. What exactly does `division = "all"` do today?

Tracing every consequence:

1. **`App.jsx` line 174:** `setDivision(normalizeDivision(data.division))` — note this calls `normalizeDivision`, not `normalizeStaffDivision`. **`normalizeDivision("all")` returns `"courses"`** (the fallback). So if a staff member has `division = "all"` in Firestore, App.jsx reads it as `"courses"`.

> [!CAUTION]
> **Critical bug found:** A staff member stored with `division = "all"` in Firestore is silently treated as `division = "courses"` by `App.jsx` at login. This affects:
> - Dashboard routing (they get the `courses` dashboard, not a cross-divisional view)
> - The `division` prop passed to useDashboardData (filters applied as if they were `courses`)
> - The badge shown in the UI nav bar

2. **`firestore.rules`:** `isDivisionAllowedForBranchStaff` with `userDivision() == "all"` → treated as non-kindergarten → passes for courses records, **fails for kindergarten records**.

3. **`useDashboardData` line 615, 628, 641, 654:** `division && division !== "all"` → if App.jsx passes `"courses"` (because of point 1), the filter IS applied. But if somehow `"all"` reached useDashboardData, the filter would be skipped.

**In summary: `division = "all"` in Firestore currently does almost nothing meaningful.** It gets normalized away to `"courses"` at login, and the Firestore rules treat it the same as courses-scoped access.

---

## 7. What would `branch = "all"` mean today, if supported?

**It is not supported**, but the `todos` collection has a partial precedent:

```js
// firestore.rules — todos
|| (('branch' in resource.data) && (resource.data.branch == 'all' || resource.data.branch == 'All'))
|| (('branchId' in resource.data) && resource.data.branchId == 'all')
```

Todos can be marked `branch: "all"` / `branchId: "all"` to be readable by all branches. This is an **intentional exception** for academy-wide directives only — not a staff authorization scope concept.

For staff `branch = "all"`, the rules would fall through `isSameBranch()` and likely match `kota_gorontalo` by default, which is the wrong behavior. **There is no safe `branch = "all"` for staff at the rules level.**

---

## 8. Are there backend/API/database checks, or only frontend?

| Check | Backend (Firestore Rules) | Frontend |
|---|---|---|
| Role | ✅ Enforced | ✅ Used for routing |
| Branch | ✅ Enforced | ✅ Used for data filtering |
| Division (kindergarten/non-kindergarten) | ✅ Enforced | ✅ Used for routing + filtering |
| Division (`"all"`) | ❌ Not recognized | ⚠️ Partially (skips filter) — but moot because App.jsx normalizes it away |
| Status (resigned/terminated) | ✅ `isActiveUser()` in all role checks | ✅ Checked at login, live session guard |

**Key finding:** The Firestore rules are the real security boundary. Frontend checks are UX conveniences. Division is the weakest axis — only the kindergarten/non-kindergarten binary is enforced in rules.

---

## 9. Every place where staff are created, invited, or updated

| Location | Path | Notes |
|---|---|---|
| **Invite creation** | `invitesRepository.js` → `createInvite()` | Validates via `inviteSchema`, stores `division` on the invite doc |
| **Invite form** | `InvitesPanel.jsx` | UI form that calls `onCreateInvite` → `useDashboardData.handleCreateInvite` → `createInvite` |
| **Staff signup via invite link** | `StaffSignup.jsx` | Reads `division` from the invite document, writes to user profile via `completeStaffSignup` |
| **Admin direct creation** | `useDashboardData.js` `handleSaveUser` | Uses `UserForm` → `StaffProfileFields`; writes directly to Firestore via `usersRepository` |
| **Admin form UI** | `UserForm.jsx` + `StaffProfileFields.jsx` | Division and role fields; `handleRoleChange` was just added for auto-selection |
| **Edit existing staff** | Same `handleSaveUser` path | `editId` is set; same form, same write path |
| **Automated staff account creation** | Also `useDashboardData` `handleSaveUser` | When `editId` is null and role is staff |
| **`inviteSchema.js`** | Schema validation | `normalizeStaffDivision` applied; only one cross-role-division rule enforced (marketing + kindergarten) |

**None of these creation paths validate that `division = "all"` is appropriate for the assigned role.** The choice is purely left to the admin.

---

## 10. Roles whose intended scope is already cross-divisional or cross-branch

Based on the role definitions and current dashboard structure:

| Role | Intended scope | Current division behavior | Cross-divisional? |
|---|---|---|---|
| `admin` | All branches, all divisions | Bypasses all branch + division checks in rules | ✅ By design |
| `instructorleader` | Pedagogical leadership across instructors | Gets `InstructorDashboard` (courses) or `KidsInstructorDashboard` (kindergarten) — one or the other | ⚠️ Ambiguous |
| `manager` | Branch-level oversight across divisions | Gets `ManagerDashboard` (courses) or `KidsManagerDashboard` | ⚠️ Routes to one dashboard only |
| `opslead` | Operations leadership within a branch | Currently branch-scoped, division follows assignment | ⚠️ Could be cross-divisional |
| `officeboy` | Support, logistical | School-wide support; division shouldn't restrict them | ⚠️ Unclear |
| `instructor` | Teaching — strictly division-scoped | `division` controls which dashboard they see | ✅ Should be division-specific |
| `frontoffice` | Student-facing ops — division-scoped | Same as instructor — division controls dashboard | ✅ Should be division-specific |
| `marketing` | Enrollment outreach — courses only by current schema | Explicitly excluded from kindergarten in `inviteSchema` | ✅ Courses-only by design |

---

## Proposed Architecture

### Principle

```
ROLE     → what capabilities the user has (read/write rules)
BRANCH   → which organizational unit they belong to (data isolation)
DIVISION → which functional scope they operate within (data isolation + dashboard routing)
```

`division = "all"` should mean: **intentional cross-divisional authorization scope** — not a UI convenience.

### Division scope per role

| Role | Appropriate division scope | Rationale |
|---|---|---|
| `admin` | Rules bypass all division checks. Division field irrelevant. | Admin has full access by role already |
| `manager` | **Single division** (`courses` or `kindergarten`) | A manager leads one division's operations. A branch with both divisions would have two managers. |
| `instructorleader` | **Single division** or `"all"` — **intentional decision required** | If they oversee instructors across both divisions, `"all"` is correct. If they only lead courses instructors, `"courses"`. |
| `instructor` | **Single division** — always | Teachers are division-specific |
| `frontoffice` | **Single division** — always | Student-facing ops are division-specific (different student populations) |
| `opslead` | **Single division** or `"all"` — **intentional** | If they lead ops for both divisions at a branch, `"all"` |
| `marketing` | Always `"courses"` | Enforced by `inviteSchema`. Kindergarten enrollment is not market-driven. |
| `officeboy` | `"all"` by default | Support role; no meaningful division restriction |

### What needs to change for `"all"` to have real meaning

**Three gaps need closing before `"all"` is real authorization:**

#### Gap 1: `App.jsx` silently strips `"all"` (line 174)
```js
// Current — wrong for staff:
setDivision(normalizeDivision(data.division));  // "all" → "courses"

// Should be:
setDivision(normalizeStaffDivision(data.division));  // "all" → "all"
```
If division `"all"` is never preserved past login, the entire model collapses.

#### Gap 2: Firestore rules don't recognize `"all"` for staff (in `isDivisionAllowedForBranchStaff`)
Current rule logic:
```
userDivision() == 'kindergarten' → kindergarten-only
else → non-kindergarten only
```
Needed addition:
```
userDivision() == 'all' → allow both divisions
```
Without this, a staff member with `division = "all"` **cannot access kindergarten records** — they're silently treated as courses-only.

#### Gap 3: Dashboard routing for `division = "all"` is undefined
`App.jsx` currently routes `manager + kindergarten → KidsManagerDashboard`, otherwise `ManagerDashboard`.
If `division = "all"`, no Kids dashboard is shown — the staff member gets the courses dashboard.
The product decision needed: **what does a cross-divisional manager see?** A combined view? Tab switching?

---

## Assessment of `DEFAULT_STAFF_DIVISION = "all"`

**My recommendation: do NOT make `"all"` the default for all staff.**

Reasons:
1. **Gap 2 above is unresolved.** Until Firestore rules recognize `"all"` as cross-divisional authorization, defaulting to `"all"` doesn't grant cross-divisional access — it silently behaves as `"courses"`.
2. **Gap 1 above is unresolved.** App.jsx normalizes `"all"` → `"courses"` at login. The stored value in Firestore doesn't match what the app sees.
3. **The correct default depends on role.** `instructor` and `frontoffice` should default to a specific division because their work is division-specific. Defaulting them to `"all"` is semantically wrong.

**Role-appropriate defaults once gaps are fixed:**

| Role | Recommended default division |
|---|---|
| `instructorleader` | `"all"` — they span instructors |
| `manager` | `"courses"` — explicit, intentional choice per manager |
| `opslead` | `"courses"` — explicit, intentional choice |
| `instructor` | `"courses"` — must be explicitly set per teacher |
| `frontoffice` | `"courses"` — must be explicitly set |
| `marketing` | `"courses"` — enforced by schema |
| `officeboy` | `"all"` — support is non-division-specific |

---

## Summary of Gaps

| # | Gap | Severity | Blocks `"all"` being real? |
|---|---|---|---|
| G1 | `App.jsx` uses `normalizeDivision` (not `normalizeStaffDivision`) — strips `"all"` at login | 🔴 Critical | Yes |
| G2 | Firestore rules `isDivisionAllowedForBranchStaff` doesn't recognize `"all"` — blocks kindergarten access | 🔴 Critical | Yes |
| G3 | No dashboard exists for `division = "all"` on `manager`, `frontoffice`, `opslead` | 🟡 UX | Partial — routing falls back to courses |
| G4 | `inviteSchema` enforces no role-division consistency rules beyond marketing+kindergarten | 🟡 Medium | No (admin discretion) |
| G5 | `normalizeStaffDivision` fallback is `"courses"`, not `"all"` — new staff with no division defaults to courses | 🟢 Low | Acceptable for now |

---

## Recommendation: Sequence of work

1. **Fix G1** (App.jsx — use `normalizeStaffDivision`). This is a one-line fix. Without it, nothing else matters.
2. **Fix G2** (Firestore rules — add `"all"` case to `isDivisionAllowedForBranchStaff`). Requires careful rule update + verification.
3. **After G1+G2:** Decide the dashboard UX for `division = "all"` users (G3). Options: tab switcher, combined view, or "last selected" memory.
4. **Only then** consider `DEFAULT_STAFF_DIVISION` per-role defaults.

> [!IMPORTANT]
> Do not change `DEFAULT_STAFF_DIVISION` until G1 and G2 are resolved. Currently, making `"all"` the default for any role would result in those staff silently operating as `"courses"` scope — which is misleading and potentially worse than the current explicit default.
