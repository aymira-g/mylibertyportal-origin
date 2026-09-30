# MYLIBERTY — Legacy Terminology Sweep Audit

## Audit target

Repository:
`aymira-git/mylibertyportal-origin`

Audit purpose:
Identify terminology that is genuinely legacy/stale and should be cleaned up, while avoiding accidental removal of valid business terminology or compatibility aliases.

This audit is focused on terminology, not on changing the ROLE × BRANCH × DIVISION architecture.

---

# 1. Executive conclusion

The repository is **not yet terminology-clean**.

The clearest legacy terminology is the old **"Studio" / "English Studio"** naming for the Courses division.

Examples currently found include:

- `English Studio`
- `Studio` as a division concept
- `Test Manager (Studio)`
- `studio` as an invalid division value in development/audit tooling
- scripts specifically named around fixing `studio` staff divisions
- documentation describing `Studio` as the former business terminology for Courses

These should be cleaned up or explicitly retained only where they refer to historical migration data.

However, **not every occurrence of `TK` should be removed**.

`TK`, `TK-A`, and `TK-B` are legitimate terminology for the Kindergarten program and appear in program/level definitions. They should remain where they describe the actual educational program or level.

Likewise, role aliases such as:

- `ops_lead`
- `frontofficelead`
- `front_office_lead`
- `instructor_leader`

should not be blindly deleted. They are currently treated as legacy compatibility aliases and may be required to safely read older user records.

---

# 2. Findings

## P0 — Clean up "studio" as an active division concept

### Why

The canonical division is now:

- `courses`
- `kindergarten`

The repository's division constants already define `STAFF_DIVISIONS` as:

`courses`, `kindergarten`, `all`

Therefore `studio` should not remain an active division value.

### Evidence found

#### `src/features/auth/devPresets.js`

Some development presets previously used or referenced `studio`.

The current architecture should represent the account as:

`role + division`

For example:

`manager + courses`

not:

`manager + studio`

#### `src/App.jsx`

The UI Preview Mode still contains:

`English Studio`

This is presentation terminology tied to the old Courses naming.

Recommended replacement:

`Courses`

or the canonical human-readable label already used by the current division system.

#### `scripts/fix-studio-staff-division.js`

This script is explicitly named around the old `studio` terminology.

This is a particularly strong legacy indicator.

The script may still be useful as a historical migration tool, but it should not necessarily remain presented as if `studio` were a current domain concept.

Preferred approach:

- If the migration is finished and the script is no longer needed: archive/remove it according to the project's migration policy.
- If it must remain for historical recovery: rename/document it as a legacy migration script and clearly state that `studio` is an obsolete source value being converted to `courses`.

Do NOT make `studio` a valid canonical division just to accommodate the script.

#### `scripts/audit-and-backfill-division.js`

This script still explicitly audits invalid `studio` values and contains a `--fix-studio-staff` pathway.

This is acceptable as migration/cleanup logic if it is intentionally handling old data.

The important distinction is:

`studio` may exist as a **legacy input being migrated**

but must not exist as:

`studio` = a valid current division.

#### `docs/plans/active/kindergarten-division-scope-revision-plan.md`

The document records `studio` as an invalid division value.

That is historically useful, but if this plan is now completed, it should be moved to the appropriate completed/archive location rather than remaining in an active plan.

---

# 3. P1 — Clean up "English Studio" display terminology

Current occurrence found in:

`src/App.jsx`

The UI Preview Mode says:

`English Studio`

This should probably become:

`Courses`

Reason:

The architecture now treats Courses as the canonical division. Keeping `English Studio` in the UI makes it look like there is a division named Studio, even though the data model says otherwise.

Recommended:

`Kindergarten` vs `Courses`

instead of:

`Kindergarten` vs `English Studio`

This is a terminology consistency issue, not a permission issue.

---

# 4. P1 — Clean up "Test Manager (Studio)"

A current repository search found a test/migration fixture with:

`Test Manager (Studio)`

The actual stored division in that fixture is already:

`courses`

This means the problem is primarily the label/name.

Recommended:

`Test Manager (Courses)`

or simply:

`Test Manager`

if the division is already obvious from the preset.

Do not create or preserve a `studio` division just because the test account has that historical name.

---

# 5. P1 — Review old "studio" migration scripts

Found:

`scripts/fix-studio-staff-division.js`

and references to `studio` inside:

`scripts/audit-and-backfill-division.js`

These require a lifecycle decision.

## Option A — Migration is finished

If all real records have already been migrated:

- archive/remove the one-shot fix script;
- retain the audit history in documentation;
- remove unnecessary active CLI flags that exist only for the old migration;
- keep a historical audit note if useful.

## Option B — Migration may still be needed

Keep the scripts, but clearly mark them as:

`LEGACY MIGRATION TOOL — studio → courses`

They should not be treated as part of the normal application domain.

This is preferable to silently deleting a migration tool that might still be needed to repair old data.

---

# 6. P2 — Do NOT remove legitimate TK terminology

Search results show `TK` in several places.

Examples:

- Kindergarten/TK program descriptions
- `TK-A`
- `TK-B`
- `tk_a`
- `tk_b`
- `TK-A / TK-B`
- `Kindergarten A (TK-A)`
- `Kindergarten B (TK-B)`

These are not evidence of division-specific roles.

They describe educational levels/program terminology.

For example:

`Kindergarten A (TK-A)`

is a valid level name.

Likewise:

`tk_a`

can remain as a program/level identifier if it is part of the actual data model.

Do not rename these merely because we removed division-specific roles.

---

# 7. P2 — Review dev-account email aliases containing "-tk"

Examples found include test addresses such as:

`manager-tk.test@myliberty.id`

and:

`instructor-tk.test@myliberty.id`

This is not a role architecture problem because the actual role remains:

`manager`

or:

`instructor`

and the division remains:

`kindergarten`.

However, the naming can be made clearer.

Possible future naming:

`manager-kindergarten.test@...`

`instructor-kindergarten.test@...`

This is optional cleanup.

Do NOT change this as part of the role architecture migration unless the project wants to standardize all development account identifiers.

---

# 8. Do NOT remove role aliases blindly

The repository contains legacy role spellings such as:

- `ops_lead`
- `frontofficelead`
- `front_office_lead`
- `instructor_leader`

The codebase currently normalizes these toward canonical role values.

For example:

`frontofficelead` → `opslead`

and:

`instructor_leader` → `instructorleader`

This is different from stale UI terminology.

These aliases may represent real historical user documents.

Therefore:

## Do not do this:

Delete every occurrence of `frontofficelead` because it "looks legacy."

## Do this instead:

Maintain one canonical role representation while keeping controlled compatibility normalization for historical records until the data migration is proven complete.

The preferred long-term model is:

`stored/current role = canonical`

`legacy aliases = normalization/migration boundary`

not:

`legacy aliases = equal first-class roles everywhere`

A separate role-normalization cleanup may be appropriate later.

---

# 9. Important distinction: terminology vs data compatibility

The executor must not treat all old strings equally.

Use this classification:

| Term | Classification | Action |
|---|---|---|
| `studio` as division | Legacy/invalid | Remove from active domain model |
| `English Studio` | Legacy UI terminology | Replace with `Courses` |
| `Test Manager (Studio)` | Legacy test label | Rename to Courses |
| `fix-studio-staff-division.js` | Legacy migration tooling | Archive/remove OR clearly mark as migration-only |
| `TK` | Valid business terminology | Keep |
| `TK-A` | Valid program level | Keep |
| `TK-B` | Valid program level | Keep |
| `tk_a` | Valid program/level ID | Keep |
| `tk_b` | Valid program/level ID | Keep |
| `manager-tk.test@...` | Dev naming | Optional cleanup |
| `ops_lead` | Legacy compatibility alias | Keep until controlled migration |
| `frontofficelead` | Legacy compatibility alias | Keep until controlled migration |
| `instructor_leader` | Legacy compatibility alias | Keep until controlled migration |

---

# 10. Architectural rule to preserve

The terminology cleanup must not accidentally reintroduce division-specific roles.

The correct model remains:

`ROLE × BRANCH × DIVISION`

Examples:

- `manager × branch A × courses`
- `manager × branch A × kindergarten`
- `manager × branch A × all`
- `instructor × branch A × courses`
- `instructor × branch A × kindergarten`

Not:

- `manager_tk`
- `instructor_tk`
- `frontoffice_tk`

A dashboard may still specialize by division.

For example:

`manager + kindergarten → KidsManagerDashboard`

is valid.

The dashboard specialization does not create a new role.

---

# 11. Recommended executor sequence

Do this in this order.

### Step 1 — Inventory

Search the entire repository for:

- `studio`
- `Studio`
- `English Studio`
- `manager-tk`
- `instructor-tk`
- `frontoffice-tk`
- `Manager (TK)`
- `Instructor (TK)`
- `Front Office (TK)`

Record every occurrence and classify it.

### Step 2 — Separate valid from invalid occurrences

Do NOT bulk replace `TK`.

Keep educational terms such as:

`TK-A`, `TK-B`, `Kindergarten/TK`, `tk_a`, `tk_b`.

### Step 3 — Replace active Courses terminology

Replace active UI/business terminology such as:

`English Studio`

with:

`Courses`

where the text is referring to the division.

### Step 4 — Handle migration scripts separately

Do not blindly rename or delete migration scripts.

Determine whether the `studio → courses` migration is complete.

### Step 5 — Normalize dev labels

Change test labels such as:

`Test Manager (Studio)`

to:

`Test Manager (Courses)`

if they are intended to represent current Courses accounts.

### Step 6 — Leave role compatibility aliases alone for now

Do not mix role normalization cleanup into this terminology pass.

That should be a separate audit.

### Step 7 — Re-run a repository-wide search

After changes, verify that:

- no active division value is `studio`;
- no current UI calls Courses `English Studio`;
- no `*_tk` role identifiers exist;
- TK program/level terminology remains intact;
- legacy migration code is clearly isolated/documented.

---

# 12. Final audit status

## Must fix

1. `English Studio` as current Courses UI terminology.
2. `Test Manager (Studio)` style current test labels.
3. Any active `studio` division assignment.
4. Any current business logic treating `studio` as a valid division.

## Needs decision

5. `fix-studio-staff-division.js` lifecycle.
6. `--fix-studio-staff` migration flag lifecycle.
7. Whether dev email names using `-tk` should be standardized.

## Keep

8. `TK`, `TK-A`, `TK-B` when referring to actual Kindergarten educational levels.
9. `tk_a`, `tk_b` when they are actual program/level identifiers.
10. Role aliases while compatibility migration is still required.

---

# Auditor conclusion

The repository has made the important architectural move from division-as-role toward:

**ROLE × BRANCH × DIVISION**

The remaining terminology problem is mostly historical naming, especially the old **Studio → Courses** transition.

The safest cleanup is therefore **not a global string replacement**.

The executor should remove obsolete **division terminology**, preserve legitimate **Kindergarten level terminology**, and leave **legacy role aliases** alone until their data-migration lifecycle is separately verified.

This keeps the cleanup precise and avoids breaking valid educational identifiers or older user records.

---

# 13. Execution & Verification Sign-Off

**Date:** 2026-10-01  
**Auditor / Executor:** Antigravity AI Pair Programmer & Kifry  

### Verification Results

| Audit Item | Scope | Action Taken | Verified Status |
|---|---|---|---|
| **1. `English Studio` in UI** | `App.jsx`, `DevQuickSwitcher.jsx` | Replaced with `Courses` / `All Divisions` | ✅ Resolved (0 occurrences in `src/`) |
| **2. `Test Manager (Studio)` test labels** | `devPresets.js`, `fix-studio-staff-division.js` | Converted to explicit `Role · Division` format (`Manager · Courses`, etc.) | ✅ Resolved |
| **3. Active `studio` division assignments** | Repo-wide | Replaced all 12 preset assignments with canonical `courses` | ✅ Resolved (0 occurrences in `src/`) |
| **4. Business logic treating `studio` as valid** | Application domain | Verified none exists; `normalizeDivision` defaults to `courses` | ✅ Verified clean |
| **5. `fix-studio-staff-division.js` lifecycle** | `scripts/` | Retained as one-shot repair tool; marked with prominent `LEGACY MIGRATION TOOL — studio → courses` banner | ✅ Documented & isolated |
| **6. `--fix-studio-staff` flag lifecycle** | `scripts/` | Retained in `audit-and-backfill-division.js` strictly to repair legacy Firestore records | ✅ Documented & isolated |
| **7. Dev emails using `-tk`** | `devPresets.js` | Preserved as optional future cleanup per Section 7 | ✅ Preserved (no role coupling) |
| **8. `TK`, `TK-A`, `TK-B` program levels** | `programs.js`, `walkInUtils.js` | Preserved as valid educational program/level terminology | ✅ Protected |
| **9. `tk_a`, `tk_b` identifiers** | `programs.js`, schemas | Preserved as canonical grade IDs | ✅ Protected |
| **10. Role compatibility aliases** | `devPresets.js`, `approvalGates.js` | Preserved in normalization tables (`ops_lead`, `frontofficelead`, `instructor_leader`) | ✅ Protected |

### Repository Verification Checks
- `npm test`: **76 test files passed, 1007 tests passed (0 failures)**
- `npm run lint`: **0 errors, 0 warnings**
- `npm run typecheck`: **0 errors (`tsc --noEmit`)**
- `npm run build`: **Production bundle compiled successfully with service worker precache**

