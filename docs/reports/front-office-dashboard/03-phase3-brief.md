# Front Office Phase 3 Brief — F-11: Separate the Assessed Level from Class Placement

> **Document type:** Scoped implementation brief (**proposal, not authority**)
> **Date:** 2026-10-10
> **Status:** **RATIFIED & IMPLEMENTED** (owner confirmed Q1–Q5 on 2026-10-10; Q3 ratified removing both `isFrontDeskStaff` and `isManager` from level allow-list)
> **Governing baseline:** Authoritative Blueprint v3.3
> **Governed by:** [`owner-decisions.md`](./owner-decisions.md) **OD-FO-3** — promotes the boundary this brief implements
> **Evidence:** [`00-phase0-audit.md`](./00-phase0-audit.md) §11 **E3, E3.1, E5** (F-11, emulator-proven 2026-10-10)
> **Closes:** F-11
> **Depends on:** nothing. Independent of F-15/F-16/F-17 and of OD-FO-1 (F-03).
> **Owner decision already taken:** unassessed students carry the explicit sentinel **`"unassessed"`**

---

## 1. The problem in one paragraph

OD-FO-3 ratified that a student's level is authoritative only when it comes from an instructor's
progress-report evaluation or a recorded placement assessment. The rules do not enforce that: `level` and
`currentLevel` sit in the generic `isFrontDeskStaff()` student-update allow-list
(`firestore.rules:567`), and the emulator proves any Front Office token can write any value — including
`"q"`, which nothing validates against `src/constants/levels.js` (E3.1). Worse, the class-management flow
does not merely *allow* this, it **relies** on it: `syncStudentsCurrentLevel`
(`classesRepository.js:34-38`) overwrites a student's assessed level with the target class's level on
enrollment, transfer, and cohort group change. `ClassManager.jsx:106-112` detects the resulting
contradiction and resolves it *in favour of the class*.

**The fix is a model correction, not a permission change.** Two distinct concepts were conflated and must
be separated (§3).

---

## 2. Why the rules edit must come LAST, not first

This is the single most important sequencing constraint, and it is counter-intuitive.

Removing `level`/`currentLevel` from the Front Office allow-list is the *visible* half of F-11. But the
sentinel decision changes the data model, and roughly **30 read sites** currently coerce a missing level
into a real one:

```js
// representative sample — this pattern recurs across the codebase
getTier(s.currentLevel || "warrior")                        // StudentRoster.jsx:316
getNextLevel(s.currentLevel || "warrior")                   // StudentRosterTable.jsx:155
if (student?.currentLevel && student.currentLevel !== targetLevel)   // ClassManager.jsx:109
```

**An explicit `"unassessed"` is a truthy string, which defeats every one of those `||` fallbacks.** So the
moment it becomes a reachable value, those sites stop treating the student as "no level" and start
treating them as a student whose level is the literal string `"unassessed"`. Two consequences:

1. **Breaks (crash-class):** `getStarText("unassessed")` returns `""` safely
   (`levels.js:95-99`), but `getTier("unassessed")` returns **`null`** (`levels.js:87-89`). Any site that
   dereferences the tier result without a null guard — `StudentAcademicFields.jsx:250`, `:257` and
   `ExecutiveAnalyticsPanel.jsx:64` are the ones to check first — is a candidate runtime error.
2. **Breaks silently (worse):** `isCompatible("unassessed", batch)` returns **`true`**
   (`levels.js:156` — unknown level ⇒ no incompatibility detected). An unassessed student would therefore
   appear compatible with *every* class, and the enrollment mismatch warning that protects placement
   integrity would stop firing. **A silent wrong answer is a worse outcome than a crash.**

Therefore: **introduce the sentinel and fix the readers first; change the rules last.** Doing it in the
opposite order ships a period in which class compatibility is silently unenforced.

---

## 3. The separation being implemented

| Concept | Field | Owner | Written by |
|---|---|---|---|
| **Assessed level** | `users.currentLevel` | Academic | Instructor progress report, or a recorded placement assessment |
| **Class placement** | `classes.classLevel` | Class management | Whoever manages the class (incl. Front Office) |

**Target behaviour:**

- Setting a class's level **never** writes to a student's record. `syncStudentsCurrentLevel` stops
  existing as a level mutator (§5).
- A student's level changes **only** through the academic paths.
- A student/class level mismatch remains **visible** — it is real information and must not be deleted —
  but is **routed as a flag** rather than silently resolved by overwriting the student (§6).

---

## 4. Work items

Ordered by dependency. **No item below may be started before §7 is answered.**

### W1 — Introduce the sentinel safely (must be first)

- Add `UNASSESSED = "unassessed"` to `src/constants/levels.js`, explicitly **not** a member of `LEVELS`
  or `LEVEL_LIST`, so `getNextLevel` already returns `null` for it (`levels.js:101-106`) — verified safe.
- Add **one** shared predicate, e.g. `hasAssessedLevel(level)` ⇒ `level && level !== UNASSESSED`, and
  route level reads through it. **This is the load-bearing change**: it makes the remaining ~30 sites a
  mechanical, reviewable sweep rather than 30 independent judgement calls.
- Make absence and the sentinel equivalent at every read: `hasAssessedLevel(x) ? x : <fallback>`.
- **Guarding `getTier` is the priority**, given it returns `null` for unknown input and is dereferenced
  in at least two places.

### W2 — Stop registration and enrollment from inventing a level

| Site | Current | Change |
|---|---|---|
| `useDashboardData.js:552` | new student seeded `"warrior"` / `"nursery"` | seed `UNASSESSED` |
| `useDashboardData.js:395` | edit form writes `formData.currentLevel \|\| "warrior"` | preserve existing; never default to a fabricated level |
| `useDashboardData.js:586` | prefill `user.currentLevel \|\| "warrior"` | surface `UNASSESSED` honestly in the form |
| `studentRecord.js:67` | `clean(fields.currentLevel) \|\| "warrior"` | `\|\| UNASSESSED` |
| `applicationSchema.js:42` | default `"warrior"` | default `UNASSESSED` (note: `deskInquirySchema.js:25` already defaults to `""` — reconcile the two) |

### W3 — Remove level mutation from the class flow

| Site | Change |
|---|---|
| `classesRepository.js:34-38` (`syncStudentsCurrentLevel`) | Stop writing `currentLevel`. Either delete it, or reduce it to a **report** of mismatches. |
| `classesRepository.js:212-214` | Drop the enrollment level sync |
| `ClassManager.jsx:125` | Drop the sync call; keep the mismatch prompt as information |
| `EnrollModal.jsx:110` | Drop the sync call |
| `TransferModal.jsx:135` | Drop the sync call |
| `CohortRosterTable.jsx:146` | Group level change becomes a **class-level** change only |

**Note:** `classesRepository.test.js:68` currently asserts `users/s1` receives `currentLevel: "elite"` from
the enrollment path. That assertion encodes the behaviour being removed and must be inverted, with the
reason recorded — the same treatment given to the drifted delete assertions in Phase 1.

### W4 — Make the promotion path report-derived

`StudentRoster.jsx:212` derives the promoted level from its own ladder
(`getNextLevel(student.currentLevel)`), and passes the report only to clear an eligibility flag
(`:224`). Under OD-FO-3 the promotion level should come **from the report**, not from a ladder — otherwise
the instructor's assessment is decorative. Scope this as its own sub-task once §7.2 is answered.

### W5 — Change the rules (last)

- Remove `'level'` and `'currentLevel'` from the `isFrontDeskStaff()` allow-list at `firestore.rules:567`.
- Decide whether `isManager()` retains them (§7.3 governs this).
- **Do not add a marker field in this phase.** If §7.1's answer requires rule-level enforcement of the
  promotion path, that is the two-marker design from E5 and belongs in its own brief — it is a schema
  addition touching multiple writers, not a clause edit.
- **Expression-budget caution:** `firestore.rules` runs near the 1000-expression ceiling
  (`regression-log.md:286-290`). Any added predicate must be measured, not assumed.

---

## 5. Verification plan

Every item is provable before deployment. **The three diagnostic tests already added in E3.1 become the
acceptance criteria** — they are currently green, documenting the bypass, and must be flipped to
`assertFails` by W5.

| Level | Check |
|---|---|
| Emulator | Front Office `currentLevel` write on a student ⇒ **DENY** (flip E3.1's three probes) |
| Emulator | The `syncStudentsCurrentLevel` fan-out shape ⇒ **DENY** |
| Emulator | Manager write ⇒ per §7.3 decision |
| Emulator | Instructor/assessment write path still succeeds (ordinary assessment + approved override) — guard against over-blocking |
| Emulator | Branch and division isolation unchanged (E3.1's two DENY probes must stay DENY) |
| Unit | `hasAssessedLevel` truth table, incl. `""`, `null`, `undefined`, `"unassessed"` |
| Unit | `getTier`/`getStarText`/`getNextLevel`/`isCompatible` with `UNASSESSED` — **assert `isCompatible` no longer returns `true` by accident** |
| Unit | Registration produces `UNASSESSED`, not `"warrior"` |
| Adversarial | A class-level change does **not** mutate any student record |
| Level 1 | Full regression per [`Light Regression Check Playbook`](../../audits/Light%20Regression%20Check%20Playbook/00-README.md) |

**Explicitly out of scope:** F-15/F-16/F-17, F-02, F-07 (awaits the R5 backfill), and any change to
`classLevel`'s own rules — it currently has **zero** rule coverage, which is a separate finding, not this
brief's job.

---

## 6. The mismatch flag (design intent, not yet specified)

Once enrollment stops rewriting the student, a level/class mismatch needs somewhere to go. Blocking at the
desk is not acceptable — a parent is standing there. The intended shape, consistent with Phase 0 **F-05**:

- enrollment proceeds,
- the student's assessed level is untouched,
- a flag is raised naming the responsible role (Instructor Leader),
- the flag is visible without Front Office inheriting any approval authority.

**This is deliberately left unspecified** — it needs a product decision about who sees it and where
(§7.4). Recommending the F-05 pattern is not the same as designing it, and this brief does not.

---

## 7. Open questions — blocking

**7.1 — Is the in-app promotion workflow actually in operational use?** (from E5)
Do instructors file progress reports that Front Office then promotes from?
*If no:* W4 becomes "remove the promotion path" and W5 needs no marker at all.
*If yes:* W4 stands and a marker design follows separately.

**7.2 — Should the promotion level come from the report?**
OD-FO-3 implies yes. This changes the promotion UI (no ladder-derived suggestion) and needs confirming.

**7.3 — Does a Division Manager keep the ability to write student levels?**
The allow-list branch at `firestore.rules:554` is `isFrontDeskStaff() || isManager()`. Front Office is
being removed in W5. Manager is **not** automatically included in that decision and must be answered
explicitly. Removing only `isFrontDeskStaff` is the narrower, safer default.

**7.4 — Who is informed of a mismatch, and where?** (§6)

**7.5 — What happens to *existing* students holding a fabricated default?**
Every current student created through registration carries `"warrior"`/`"nursery"` regardless of whether
they were ever assessed. After W2 those records are indistinguishable from genuinely assessed ones.
**No backfill is proposed here** — identifying which historical `"warrior"` values were never assessed may
be impossible, and a bulk migration is not authorised. This needs a data decision, and it is the item most
likely to be overlooked.

---

## 8. Cost

No new collection, index, listener, scheduled job, or paid service. Reads are unchanged; one field's
default changes. The only material cost is **review effort across ~30 read sites**, which W1's shared
predicate is specifically designed to reduce.

---

## 9. What this brief is not

- Not an authorisation to implement. §7 blocks W1–W5.
- Not a claim that F-11 is a security breach. Branch and division boundaries held in every emulator probe
  (E3.1); this is an integrity and authority gap.
- Not a redesign of the level system. `LEVELS`, `LEVEL_LIST`, tiering, and the placement rubric are
  untouched except for the added `UNASSESSED` constant.
