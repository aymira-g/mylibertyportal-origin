# Division-Specific Role Concept Audit

**Date:** 2026-10-01  
**Scope:** Repository-wide — code, schemas, tests, docs, dev tooling  
**Purpose:** Identify every location where a division value is embedded into a role name, role ID, routing decision, or permission rule before establishing the formal architectural rule that prevents this pattern.

---

## Architectural Rule Being Locked

> A staff member's access identity is **ROLE × BRANCH × DIVISION**.  
> Division must never be embedded into the role dimension.  
> `Manager TK` is not a role. It is `role = manager` + `division = kindergarten`.

---

## Summary Finding

**No division-specific roles exist as actual role identifiers in the codebase.**  
The canonical role set is clean. All division-specific concepts are expressed in one of four other ways:

1. **UI labels** on dev test accounts (informal "TK" suffixes in `label` fields)
2. **Dashboard routing** (App.jsx selects a different component based on `effectiveDivision`)
3. **Workflow/UX branching** (individual components fork on `division === "kindergarten"`)
4. **A legacy invalid division value** (`"studio"`) in dev presets and tests

None of these represent an actual `manager_tk`, `instructor_tk`, or `frontoffice_tk` role identifier stored in Firestore or defined in the role registry.

---

## Section 1 — Role Registry

**File:** `src/features/shared/roles.js`

```
CANONICAL_ROLES = {
  admin, manager, instructor, instructorleader,
  frontoffice, opslead, marketing, officeboy,
  student, parent
}
```

**Classification: ✅ Clean.**  
No role contains a division suffix. The registry is pure role, no division coupling.

`LEGACY_ROLE_ALIASES` also resolve to canonical roles with **no division component**.

**Classification: ✅ Clean.**

---

## Section 2 — Dev Test Accounts (Mode 1)

**File:** `src/features/auth/devPresets.js`

The MODE 1 test accounts use informal UI labels that include division context:

| Account label | role | division |
|---|---|---|
| `"Manager (Studio)"` | `manager` | `"studio"` ← invalid |
| **`"Manager (TK)"`** | `manager` | `"kindergarten"` |
| `"Instructor (Studio)"` | `instructor` | `"studio"` ← invalid |
| **`"Instructor (TK)"`** | `instructor` | `"kindergarten"` |
| `"Front Office (Studio)"` | `frontoffice` | `"studio"` ← invalid |
| **`"Front Office (TK)"`** | `frontoffice` | `"kindergarten"` |

**Classification of the TK labels:** UI label only.  
The `label` field is purely for the dev switcher UI. The `role` field is canonical and correct.  
`"Manager (TK)"` is display text — it does **not** define a role named `manager_tk`.

**Classification of `"studio"` division values:** ⚠️ Legacy invalid division value.  
`"studio"` is not a valid division. Valid values are `"courses"`, `"kindergarten"`, `"all"`, or `null` (for facility-independent roles). The `normalizeDivision` alias table does not include `"studio"`, so these values silently fall back to `DEFAULT_DIVISION = "courses"` at runtime. This is pre-existing tech debt documented in `docs/plans/active/kindergarten-division-scope-revision-plan.md` (Finding F).

---

## Section 3 — Dev Test Account Tests

**File:** `src/features/auth/devPresets.test.js`

Test assertions that reference TK concepts:

- Line 39: Test description uses "Manager TK, Front Office TK, Instructor TK" as informal shorthand for "division = kindergarten test accounts." The assertions themselves correctly check `a.role === "manager" && a.division === "kindergarten"` — role and division are separate.
- Line 87: `expect(["studio", "kindergarten"]).toContain(account.division)` — accepts `"studio"` as a valid division, which is incorrect.

**Classification of test descriptions:** Documentation terminology only. No role coupling.

**Classification of the `"studio"` allowance:** ⚠️ Test validation gap. The assertion validates against a wrong invariant. Accepted values should be `["courses", "kindergarten", "all"]` (and `null` for officeboy), not `"studio"`.

---

## Section 4 — App.jsx Dashboard Router

**File:** `src/App.jsx` (lines 548–598)

The dashboard router uses `effectiveRole` and `effectiveDivision` as **two separate signals** to select a dashboard component:

```js
// manager
{effectiveDivision === "all" ? <CrossDivDashboard role="manager" />
 : effectiveDivision === "kindergarten" ? <KidsManagerDashboard />
 : <ManagerDashboard />}

// instructor / instructorleader
{effectiveDivision === "kindergarten" ? <KidsInstructorDashboard />
 : <InstructorDashboard role={effectiveRole} />}

// frontoffice / opslead
{effectiveDivision === "all" ? <CrossDivDashboard role={effectiveRole} />
 : effectiveDivision === "kindergarten" ? <KidsFrontOfficeDashboard />
 : <FrontOfficeDashboard role={effectiveRole} />}
```

**Classification: ✅ Routing/workflow behavior — not a role.**  
The router correctly keeps ROLE and DIVISION as separate inputs. The output is a different dashboard *component*, not a different *role*. Same role, different UX per division. This is the correct pattern.

**Note on `Kids*` component names:** `KidsManagerDashboard`, `KidsFrontOfficeDashboard`, `KidsInstructorDashboard` are component names using "Kids" as a division qualifier. Acceptable internal implementation naming. Does not define a role.

---

## Section 5 — UI Header Labels

**File:** `src/App.jsx` (lines 459, 488)

```jsx
// Desktop header (line 459)
{role} {division === "kindergarten" ? "· Kindergarten" : ""}

// Mobile badge (line 488)
{role} {division === "kindergarten" ? "· TK" : ""}
```

**Classification: UI label.**  
Display-only annotations derived from two independent fields. No compound role created.

Minor issue: Desktop appends `"· Kindergarten"`, mobile appends `"· TK"` — inconsistent for the same concept.

---

## Section 6 — DevQuickSwitcher

**File:** `src/features/shared/DevQuickSwitcher.jsx`

Uses `PREVIEW_ROLES` + a separate division toggle — correctly two separate dimensions. Division is not embedded in the role selector.

Two issues:
1. Uses `"studio"` as a fallback division value (line 280) — invalid against the canonical model. At runtime this silently becomes `"courses"` via `normalizeDivision`.
2. The toggle button (line 501/508) and the preview mode banner (line 479) use `"Studio"` as the informal name for the Courses division.

**Classification: Dev-tooling legacy — not a role.**

---

## Section 7 — `PREVIEW_ROLES.supportsDivision`

**File:** `src/features/auth/devPresets.js` (lines 133–142)

```js
{ label: "Marketing", role: "marketing", supportsDivision: false },
{ label: "Office Boy", role: "officeboy", supportsDivision: false },
```

`marketing` has `supportsDivision: false`, which hides the division toggle in Mode 2 preview. Now that marketing supports universal divisions, this is a dev tooling gap.

`officeboy` has `supportsDivision: false` — correct, as officeboy is `DIVISION_INDEPENDENT_ROLE` with `null` division.

**Classification: Dev-tooling metadata — not permission rules.**

---

## Section 8 — Firestore Rules

**File:** `firestore.rules`

No TK-specific or kindergarten-specific role names appear in the rules. All rules use canonical roles and check `division` as a separate data field.

**Classification: ✅ Clean.** No division-embedded role names.

---

## Section 9 — Schema Validation

**Files:** `src/schemas/inviteSchema.js`, `src/schemas/schemas.test.js`

The invite schema validates `role` and `division` as separate fields. No schema defines a compound `role_division` field or any role named `manager_tk`.

**Classification: ✅ Clean.**

---

## Section 10 — Documentation / Business Terminology

**File:** `docs/specs/dev-tools/hybrid-quick-switch-user-spec.md`

Uses `"Studio"` and `"English Studio"` as informal business terminology for the Courses division throughout (labels, table rows, toggle descriptions). Predates the canonical `"courses"` division value.

**Classification: Documentation/business terminology.**

---

## Section 11 — Workflow/UX Branching (Not Role Branching)

Multiple components use `division === "kindergarten"` to adjust their internal behavior:

| File | Behavior | Classification |
|---|---|---|
| `useDashboardData.js` | Different default program, student query scope, schedule rules | ✅ Workflow/UX |
| `FrontOfficeDashboard.jsx` | Different default programId for walk-in inquiries | ✅ Workflow/UX |
| `PlacementTestModal.jsx` | Hides score input for kindergarten; different level defaults | ✅ Workflow/UX |
| `WalkInInquiryTab.jsx` | Different tier options; different `serverDivision` value | ✅ Workflow/UX |
| `PaymentCashierTab.jsx` | Different `serverDivision` filter | ✅ Workflow/UX |
| `ManagerDashboard.jsx` | Todo list filtered differently for kindergarten | ✅ Workflow/UX |
| `KidsManagerDashboard.jsx` | Todo list filtered for kindergarten | ✅ Workflow/UX |
| `TodayTab.jsx` | Conditional kindergarten-specific section | ✅ Workflow/UX |
| `kioskScanProcessor.js` | Different weekend schedule for kindergarten staff | ✅ Workflow/UX |
| `divisions.js` | `isWorkDayForDivision()` — Mon-Fri for kindergarten | ✅ Workflow/UX |

**All workflow differences. No role differences.**  
These are correct implementations of genuine operational differences between divisions. A different schedule or a different form does not imply a different role.

---

## Complete Classification Matrix

| Finding | Location | Classification | Risk |
|---|---|---|---|
| `"Manager (TK)"` label | `devPresets.js` | UI label (dev tooling) | Zero |
| `"Instructor (TK)"` label | `devPresets.js` | UI label (dev tooling) | Zero |
| `"Front Office (TK)"` label | `devPresets.js` | UI label (dev tooling) | Zero |
| `division: "studio"` in devPresets | `devPresets.js` (×12) | Legacy invalid division value | Zero to fix |
| `"studio"` fallback in DevQuickSwitcher | `DevQuickSwitcher.jsx` | Legacy invalid division value (dev only) | Zero to fix |
| `["studio","kindergarten"]` assertion | `devPresets.test.js` line 87 | Test validation gap | Zero to fix |
| `"English Studio"` toggle labels | `DevQuickSwitcher.jsx` | UI label (dev tooling) | Zero |
| `supportsDivision: false` for marketing | `devPresets.js` | Dev tooling gap | Zero (UI only) |
| `· TK` mobile header badge | `App.jsx` line 488 | UI label inconsistency | Zero |
| `Kids*` component names | `App.jsx` + `kids/` | Component naming (internal only) | N/A — keep |
| Division-based dashboard routing | `App.jsx` 548–598 | ✅ Correct routing pattern | N/A — keep |
| Division-based UX branching | Various components | ✅ Correct workflow pattern | N/A — keep |
| Canonical role registry | `roles.js` | ✅ Clean | None |
| Firestore rules | `firestore.rules` | ✅ Clean | None |
| Schemas | `inviteSchema.js` | ✅ Clean | None |

---

## Migration Concerns

### 1. `"studio"` division value

`"studio"` appears in devPresets.js (12 occurrences) and DevQuickSwitcher.jsx. At runtime, `normalizeDivision("studio")` silently returns `"courses"`, so the system works. The test at line 87 incorrectly validates `"studio"` as canonical.

**Fixing it:** Replace `"studio"` → `"courses"` in devPresets and DevQuickSwitcher. Update labels accordingly. Zero production impact (dev tooling only).

### 2. `supportsDivision` for marketing

Toggling to `true` for marketing in PREVIEW_ROLES exposes the division toggle in Mode 2 preview for marketing accounts. Zero permission change — this is a UI control for development only.

### 3. Permission change risk: None

No division-specific role IDs exist anywhere in the codebase. There is nothing to "remove" that could change permissions. Every cleanup item listed is a label, a stale string, or a dev tool configuration.

---

## Recommended Cleanup Sequence

| Step | What | Files | Risk |
|---|---|---|---|
| 1 | Replace `"studio"` with `"courses"` in devPresets | `devPresets.js` | Zero |
| 2 | Replace `"studio"` with `"courses"` in DevQuickSwitcher; rename toggle label | `DevQuickSwitcher.jsx` | Zero |
| 3 | Fix test assertion: accept `["courses","kindergarten"]` not `["studio","kindergarten"]` | `devPresets.test.js` | Zero |
| 4 | Set `supportsDivision: true` for marketing in PREVIEW_ROLES | `devPresets.js` | Zero |
| 5 | Align mobile badge: `"· TK"` → `"· Kindergarten"` | `App.jsx` | Zero |
| 6 | Update dev spec doc terminology: `Studio` → `Courses` | `docs/specs/dev-tools/hybrid-quick-switch-user-spec.md` | Zero |

All steps are cosmetic, dev-tooling, or test accuracy fixes. None touch Firestore, schemas, permissions, or production data.

---

## What Does NOT Need Changing

- **`Kids*` dashboard component names** — internal naming for the kindergarten UX variant of a role's dashboard. Does not encode a role.
- **Division-based routing in App.jsx** — architecturally correct under ROLE × BRANCH × DIVISION.
- **Division-based workflow branching** in components — correct operational differentiation.
- **`DIVISION_INDEPENDENT_ROLES`** with `officeboy` — correct model.
- **Firestore rules**, **schemas**, **role registry** — all clean.

---

## Authorization Risk Assessment

| Question | Answer |
|---|---|
| Do any division-specific role IDs exist in Firestore security rules? | **No** |
| Do any division-specific role IDs exist in the role registry? | **No** |
| Would renaming TK labels change any permission? | **No** |
| Would fixing `"studio"` → `"courses"` in devPresets change production behavior? | **No — dev tooling only** |
| Is there any place where division is embedded into a role identifier? | **No** |

---

## Approval Status

| Decision | Status |
|---|---|
| Architectural rule: Division must not be embedded into role identifiers | 🔒 Locked (conceptually approved by Kifry) |
| Steps 1–6 (label/test/tooling cleanup) | ⏳ Pending Kifry review |
