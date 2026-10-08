# Branch Staff `/users` Read Boundary Hardening — Execution Report

**Date:** 2026-10-09
**Status:** COMPLETE (rules boundary reconciled, CI gate added)
**Companion audit entry:** [`docs/audits/audit-log.md`](../../audits/audit-log.md) → "2026-10-09 — Firestore Rules Verification Gap Closed & `/users` Read Boundary Reconciled"
**Owner decision:** 2026-10-09 — "operational staff allowed, deny peers and executives"

---

## 1. Summary of Work

The session started as a requested emulator run (`npm run test:rules`). It surfaced one failing committed security assertion, which exposed two further defects: no CI workflow executes the rules emulator suite, and two committed tests asserted contradictory behaviour for the same permission.

### 1.1 Defect chain discovered

1. **Failing assertion** — `users own profile get > does not let front office read another same-branch front office profile` failed: Front Office *could* read a peer Front Office profile.
2. **Root cause** — `/users/{userId}` `allow get` had a broad same-branch clause with **no target-role allow-list**, unlike the adjacent `isStaff()` clause. Because `isFrontOffice()` includes `frontoffice`, a Front Office user could read every same-branch staff role in their division, including `admin`, `director`, `vice_director` (and, with `division: "all"` or a missing `division` field, the whole branch).
3. **Verification gap** — `npm test` skips the emulator suite by design (`describe.skipIf(!HAS_EMULATOR)`), and **no CI workflow ran `test:rules`**. The 2026-10-08 audit entries recorded "full suite … 0 failures" for commits that modified `firestore.rules`, while structurally excluding the only tests that verify those rules.
4. **Contradiction** — after an initial hardening attempt, a *different* committed test (`INT-004`) failed. It asserts Front Office **can** read a same-branch `cleaner` profile. No single rule can satisfy both. Resolved by owner decision.

### 1.2 Changes delivered

| File | Change |
|---|---|
| `firestore.rules` | `/users/{userId}` `allow get`: broad clause narrowed from `(isManager() \|\| isFrontOffice())` → `(isManager() \|\| isOpsLead())`; new `isFrontDeskStaff()`-scoped clause permits `officeboy` / `cleaner` with the division filter bypassed (branch-level roles, like parents). Explanatory comments added. |
| `src/features/shared/securityRulesMatrix/securityRulesMatrix.helpers.js` | `canGetUser` mirror synced to the new rule. |
| `src/features/shared/securityRulesMatrix/userAuthorization.test.js` | Duplicated local `canGetUser` (which had drifted from both the rules and the shared mirror) removed in favour of the shared import; new policy test added. |
| `src/features/shared/firestoreRules.emulator.test.js` | New emulator test pinning the reconciled boundary. |
| `.github/workflows/firestore-rules.yml` | **NEW** — runs the rules emulator suite on push/PR. |
| `docs/audits/audit-log.md` | Dated entry for this work. |

**Unchanged:** `docs/ARCHITECTURE.md` (permission-boundary correction, not an architectural change); dashboard UI; `firestore.indexes.json` (no new query shapes); `useDashboardData.js`.

### 1.3 Resulting boundary for Front Office reading `/users/{userId}`

**Allowed:** own profile · `student` · `parent` · `instructor` · `instructorleader` / `instructor_leader` · `officeboy` · `cleaner` (branch-level, division-exempt)
**Denied:** peer `frontoffice` · `marketing` · `opslead` / `ops_lead` / `frontofficelead` · `manager` / `branch_manager` · `admin` · `director` · `vice_director` · anything cross-branch

Manager and Ops Lead retain their existing broader same-branch staff read.

---

## 2. Verification Evidence

| Command | Result |
|---|---|
| `npm run test:rules` | **62 passed, 0 failed** (before: 60 passed, 1 failed) |
| `npm test` | **1,174 passed**, 62 skipped, 0 failed |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | 0 errors |
| `npm run build` | clean |
| CI command form (`npx --yes firebase-tools@15.32.0 emulators:exec --only firestore "npx vitest run …"`) | executed locally end-to-end; reproduces the suite result |

Both previously contradictory tests now pass in the same run, together with the new boundary test.

**Level 1 Light Regression Check coverage:** branch isolation for Front Office user reads; Front Office → peer/leadership/executive denial; Front Office → operational-staff allowance; payments owner scoping; approval decision contract; user authorization; shifts/kiosk flows; `divisionIsolation` matrix. All green.

### Known caveat

The emulator logs `Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached` inside some rule branches. All 62 tests pass, so no currently-tested allow path is blocked — but one clause was added to `/users` `allow get`, and the expression budget is evidently being approached. **Measure this budget before adding further clauses to that rule.**

---

## 3. Architecture & Data Impact

- **Firestore schema:** none.
- **Indexes:** none (`firestore.indexes.json` untouched).
- **Cost/Spark free tier:** no impact. Restricting `get` cannot add reads; no new queries, listeners, collections or paid services.
- **Dependency/infrastructure:** one new CI workflow. `firebase-tools` is invoked via pinned `npx` (15.32.0) rather than added to `devDependencies`, because both Hosting deploy workflows run `npm ci` on every push and a local copy would slow every deploy for one job. Adding it as a devDependency remains an available option.
- **Deployment:** `firestore.rules` requires `firebase deploy --only firestore:rules`. **Not deployed by the agent.** Production rule state is unverified from the repository.
- **CI gating:** the new workflow is deliberately **independent** of the Hosting deploy workflows so a rules failure is visible without silently blocking production deploys. Making it release-gating is a one-line follow-up.

---

## 4. Follow-ups & Needs from Kifry

### Needs from Kifry

1. **Deploy the rules** when satisfied: `firebase deploy --only firestore:rules`. Until then production keeps the old, broader read behaviour.
2. Decide whether the rules CI job should become **release-gating** (add `npm run test:rules` to the Hosting workflows).

### Open follow-ups (not done, deliberately)

1. **Ops Lead `users` list gap (functional).** `OpsLeadDashboard` issues a `users` **list** query with only a `branchId` filter (`useDashboardData.js:257-270`; `restrictedRead` defaults to `false`), which `allow list` (line 309) rejects with `permission-denied`. `OpsLeadFacilitiesTab` and `OpsLeadOverviewTab` therefore cannot populate branch staff. Whether a branch leadership role may *enumerate* branch staff is a separate authority question and was **not** widened. Not browser-confirmed.
2. **`get`/`list` asymmetry.** The `allow list` role allow-list was intentionally left unchanged, so Front Office can `get` operational staff but not `list` them. No current Front Office UI lists those roles (it uses `restrictedRead: true`), so this is latent rather than active.
3. **Bisect** the commit that first made Front Office → Front Office reads succeed, to record the regression point precisely.
4. **Remove the remaining local `canListUsers` duplicate** in `userAuthorization.test.js` (looser than the real rule; no test currently depends on the difference).
5. **Review `docs/audits/blueprint-conformance-matrix.md`** if follow-up 1 changes role authority.
