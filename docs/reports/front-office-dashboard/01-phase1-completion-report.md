# Front Office Dashboard: Phase 1 Completion Report — F-01 Student/Parent Record Deletion Boundary

> **Document type:** Level 1 verification & implementation completion report
> **Date:** 2026-10-09
> **Governing baseline:** Authoritative Blueprint v3.3 (ratified 2026-10-07)
> **Phase 0 evidence:** [`00-phase0-audit.md`](./00-phase0-audit.md) — finding **F-01**
> **Scope:** F-01 only. F-03 (gate authority), F-11 (level writes) and the remaining findings are **not** addressed here.
> **Status:** COMPLETED & EMULATOR-VERIFIED (local only — **not deployed**)

---

## 1. Executive summary

Phase 0 finding **F-01** recorded that Front Office held a permanent, irreversible delete over student and parent records, permitted at the rules layer, with no approval and no audit trail — a route by which the gated `STUDENT_WITHDRAWAL_OR_FREEZE` workflow could be bypassed simply by deleting the record instead.

This Phase 1 closes that boundary:

1. Front Office no longer receives a delete handler on either dashboard, so the destructive affordance is not rendered.
2. `firestore.rules` no longer permits `isFrontDeskStaff()` to delete `users` records at all.
3. The delete path is confined to **Admin**, and only for non-executive targets.

**One unplanned but necessary item was included,** and it is called out plainly in §4: restoring the Admin clause exposed that commit `7cf64a1` had left `isFrontDeskStaff` as the *only* role able to delete user records, which had silently broken the Admin Staff Directory delete button. The change restores implemented, previously-working behaviour rather than adding a new capability.

**No deployment occurred.** Rules are verified against the local Firestore emulator only.

---

## 2. What was approved, and the one deviation

The owner approved the **middle option** of the three presented at the end of Phase 0:

> *"remove Front Office delete, restore an Admin-only path — that's a small rules change plus one test, and keeps the enrollment/parent cascade intact."*

That is what was implemented. One deliberate deviation from the **literal** wording, recorded here rather than made silently:

| Approved wording | Implemented | Why |
|---|---|---|
| "Admin-only path" for student/parent delete | The restored clause is a **role-exclusion list** — `isAdmin() && !(role in ['director','vice_director','admin'])` | The narrower variant (`isAdmin() && role in ['student','parent']`) was drafted first and then **tested** — the emulator proved it left the Admin Staff Directory delete button permanently failing (`PERMISSION_DENIED`). The role-exclusion form is exactly the clause that existed before `7cf64a1`, so this is a **restoration**, not a new grant. See §4. |

No other deviation. No schema change, no new collection, no index, no new listener, no paid service.

---

## 3. Implementation detail

### 3.1 Rules — `firestore.rules` (`match /users/{userId}`)

**Before:**
```
allow delete: if isFrontDeskStaff() && resource.data.role in ['student', 'parent'] && isSameBranch(resource.data) && (resource.data.role != 'student' || isDivisionAllowedForBranchStaff(resource.data));
```

**After:**
```
allow delete: if isAdmin() && !(resource.data.role in ['director', 'vice_director', 'admin']);
```

Front Office is removed from the rule entirely. The guard is now a role-exclusion list, so `director`, `vice_director` and `admin` accounts remain undeletable by anyone.

### 3.2 Client — delete handler withdrawn from both dashboards

| File | Change |
|---|---|
| `src/features/dashboard/FrontOfficeDashboard.jsx` | Removed `handleDelete` from the `useDashboardData` destructuring (`:75`) and the `handleDelete={handleDelete}` prop on `StudentRoster` (`:419`) |
| `src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx` | Same two changes (`:65`, `:331`) |

`StudentRoster` renders its delete control only when a `handleDelete` prop is supplied and `readOnly` is false (`StudentRoster.jsx:515`, `:539`). With the prop absent, the control is not rendered at either desk. **This is presentation only** — the load-bearing control is the rules change in §3.1.

**Not changed, deliberately:** `useDashboardData.handleDelete` and `usersRepository.deleteUserProfile` remain intact, because `AdminDashboard.jsx:228` still supplies `handleDelete` to `StaffDirectory` (`onDeleteStaff`). The cascade that strips class `studentIds`/`enrollments` and unlinks parents (`usersRepository.js:227-251`) therefore still executes for the Admin path, so record deletion does **not** orphan enrollment references.

### 3.3 JS rules mirror kept in step

`canDeleteUser` in `securityRulesMatrix.helpers.js` was rewritten to mirror the rules exactly. It previously encoded the Front Office branch and had drifted from the rules — that drift is what allowed an inaccurate assertion to pass for months (§5.1).

---

## 4. The unplanned item: a broken Admin button, discovered by testing

This is the most important thing in this report, and it was **not** predicted by the Phase 0 audit.

Commit `7cf64a1` ("phase 1 marketing dashboard") removed the Admin delete clause from `users` while leaving the Front Office clause in place. The net effect at HEAD was:

- **Admin could not delete any user record** — the Staff Directory's delete button (`StaffDirectory.jsx:201` → `onDeleteStaff` → `deleteUserProfile`) failed with `PERMISSION_DENIED`, surfaced only as a toast at `StaffDirectory.jsx:204`.
- **Front Office was the only role that could** — for student and parent records.

So the security posture at HEAD was simultaneously **too permissive at the desk** and **broken at the console**. Phase 0 found the first half; the emulator found the second.

The emulator test that asserted the broken state (`firestoreRules.emulator.test.js`, "users (staff profile delete forbidden to Admin)") **passed**, because it asserted the same thing the broken rule did. A passing test was actively protecting a defect. That assertion has been corrected to match intended behaviour, with the reasoning recorded inline.

**If this restoration is not wanted,** the revert is a single line: restore `allow delete: if isAdmin() && resource.data.role in ['student', 'parent'];` and re-invert the two affected emulator assertions. The Front Office closure in §3.2 is independent of this choice and should be kept either way.

---

## 5. Tests

### 5.1 Pre-existing test corrected (not caused by this change)

`userAuthorization.test.js` asserted:

```js
expect(canDeleteUser(regularStaffDoc, adminActor)).toBe(false);   // instructor, deleted by admin
```

under the title *"prevents Admin from deleting user accounts (Principle 13: Admin deletion revoked)"*. That assertion **never matched `firestore.rules`** — the pre-`7cf64a1` clause was a role-exclusion list, so Admin *could* delete an instructor. It passed only because the JS mirror had drifted from the rules.

The claim was also semantically confused: Principle 13 concerns *branch authority*, not record deletion, and Admin deletion of business records was revoked by **OD-MKT-4** (Marketing Phase 1), not by Principle 13. The test has been split into two accurate assertions and the misleading title removed.

### 5.2 New emulator coverage (real Firestore emulator)

Added to `firestoreRules.emulator.test.js`:

| Assertion | Expected |
|---|---|
| Front Office (`foGto`) deletes same-branch student | **DENY** |
| Front Office deletes same-branch parent | **DENY** |
| Kindergarten Front Office (`foKgGto`) deletes student | **DENY** |
| Ops Lead (`opsGto`) deletes student | **DENY** |
| Cross-branch Front Office (`foBoba`) deletes student | **DENY** |
| Resigned Front Office (`foResigned`) deletes student | **DENY** |
| Manager (`mgrGto`) deletes student | **DENY** |
| Admin deletes student | **ALLOW** |
| Admin deletes parent | **ALLOW** |
| Admin deletes instructor profile | **ALLOW** (restored maintenance path) |
| Admin deletes director / vice_director / admin | **DENY** |

---

## 6. Verification

| Command | Result |
|---|---|
| `npm run test:rules` | **111 passed, 0 failed** (110 at HEAD; +1 new test, 1 assertion corrected) |
| `npm test` | **1,259 passed, 111 skipped, 0 failed** (the 111 skipped are the emulator suite, which requires the emulator) |
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run build` | **clean** — PWA precache 66 entries |
| `npm run typecheck` | **3 pre-existing failures, unchanged by this work** — see §7 |

### 6.1 Expression-budget check

The `users` delete clause is not a `get()`-bearing predicate and the change does not add or remove `userProfile()` evaluations relative to HEAD (the clause was a single `isFrontDeskStaff()` call, replaced by a single `isAdmin()` call — both one profile read). The emulator suite, which is the empirical expression-budget probe for this repository, passed 111/111 with no exhaustion messages attributable to the new clause.

---

## 7. Not verified / known limitations

1. **No deployment.** `firebase deploy --only firestore:rules` was **not** run. Production rule state is unverified from the repository and will not match until deployed.
2. **`npm run typecheck` fails with 3 pre-existing errors** that this work did not introduce and did not fix:
   ```
   src/features/shared/securityRulesMatrix/operationalResources.test.js(568,31): error TS2554
   src/features/shared/securityRulesMatrix/operationalResources.test.js(569,31): error TS2554
   src/features/shared/securityRulesMatrix/operationalResources.test.js(570,31): error TS2554
   ```
   A local stub `function canDeletePayment()` (`:514`) takes no parameters but is called with one. **Confirmed pre-existing** by stashing every change in this report and re-running `npm run typecheck` at HEAD — identical three errors. It is a test-stub signature mismatch in a file untouched by this work; fixing it is a trivial but unrelated change and was left out of scope.
3. **No browser walkthrough.** The absence of the delete control on both rosters is proven by props, not by a running app.
4. **The Admin Staff Directory delete path was not exercised end-to-end** — the emulator proves the *rule* now permits it and the pre-`7cf64a1` clause behaves identically, but the full UI path (confirm modal → batch cascade → parent unlink) was not run against a live or emulated database.
5. **Firestore data migration:** none required. The change is permission-only.
6. **Rollback:** revert the three code/test areas in §3; no data state to unwind.

---

## 8. Changed files

| File | Nature |
|---|---|
| `firestore.rules` | One `allow delete` clause on `match /users/{userId}` |
| `src/features/dashboard/FrontOfficeDashboard.jsx` | Removed `handleDelete` destructuring + prop |
| `src/features/dashboard/kids/KidsFrontOfficeDashboard.jsx` | Removed `handleDelete` destructuring + prop |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | `canDeleteUser` mirror rewritten |
| `src/features/shared/securityRulesMatrix/userAuthorization.test.js` | Corrected drifted + mislabelled assertions |
| `src/features/shared/securityRulesMatrix/divisionIsolation.test.js` | Front Office delete expectation inverted |
| `src/features/shared/firestoreRules.emulator.test.js` | Corrected staff-delete assertion; added Front Office denial coverage |

**Architecture documentation:** not updated, and not required — no architectural boundary, data model, routing, or contract changed. `docs/ARCHITECTURE.md` makes no claim about the `users` delete clause.

**Governance documentation:** not updated. The rules were reconciled to existing governance; no policy changed. F-03 and F-11 remain open and still require owner decisions before their phases can begin.

---

## 9. What remains from Phase 0

Nothing else from F-01 is outstanding. Still open, in the order Phase 0 recommended:

- **F-03** (blocking) — the three G-007 gates: `opslead`-only, or both roles. Requires an owner decision.
- **F-11** — which `currentLevel` changes are authoritative. Requires an owner decision.
- **F-02** — wire `activeShift` so the drawer-count control is reachable; add `limit(1)`; decide whether `/kiosk/staff` may close a cashier shift without a drawer count.
- **F-12** — confirm whether `pendingPlacementOverride` can be truthy on a kindergarten inquiry, then port the guard or record the exemption.
- **F-04 / F-08** — retire the dead `approvals` tab and stale leader branches in `FrontOfficeDashboard`.
- **F-13 / F-14** — suppress the rules-denied application-delete affordance; drop the unused `invites` listener.
- **F-05 / F-06 / F-07 / F-09 / F-10** — reporting alignment, mis-scoped tabs, the deferred R5 division backfill, legacy alias, retroactive-attendance UI.
