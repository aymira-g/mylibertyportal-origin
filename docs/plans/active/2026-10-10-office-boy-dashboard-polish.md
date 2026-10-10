# MyLiberty Portal — Office Boy Dashboard — Polish Phase (Failure State, Stat Cards, Browser Smoke)
## Executor Implementation Brief

You are the implementation agent. Work from the **current repository state**, not from assumptions or historical plans.

This is a small **frontend polish phase** closing three recorded non-blocking notes from the Office Boy dashboard production-readiness check (2026-10-10). The dashboard refinement and its security hardening are already complete; this brief adds a real failure state, de-duplicates the stat cards, and performs a browser smoke walkthrough. It involves **no security-rule work**.

---

# 1. Governing Baseline — READ FIRST

Read, in this order:

1. `AGENTS.md`
2. `docs/audits/current/regression-log.md` — the two 2026-10-10 Office Boy entries (what was already done and verified)
3. `src/features/staff/useStaffDirectives.js`
4. `src/features/dashboard/OfficeBoyDashboard.jsx`
5. `src/features/dashboard/OfficeBoyDashboard.test.js`
6. `src/features/auth/devPresets.js` (for Item 3)

### Baseline facts

- `main` at `c180b3c`, clean tree, everything pushed.
- Known-good quality gates at that commit: `npm test` → 1,288 passed / 0 failed; `npm run test:rules` → 121 passed; `npm run lint` → 0/0; `npm run typecheck` → 0 errors; `npm run build` → clean (PWA precache 66 entries).
- Production Firestore rules are live at `19fd280`; deploying `c180b3c` rules is a separate operator action and is **not part of this task**.

---

# 2. Scope

## Item 1 — Surface directive-list failures (main item)

`src/features/staff/useStaffDirectives.js` swallows listener errors: the `onSnapshot` error callback only does `console.error` + `setLoading(false)`, so a permission-denied or offline failure renders as the misleading "All caught up! No tasks right now." empty state.

- In `useStaffDirectives.js`: add an `error` state, set it in the snapshot error callback, clear it whenever a (re)subscription starts, and expose `error` in the returned object. The change must be **additive** — existing return fields keep their shape.
- Before editing, grep all consumers of `useStaffDirectives` and confirm none break. Other dashboards do **not** get the error UI in this phase.
- In `src/features/dashboard/OfficeBoyDashboard.jsx`: destructure `error` and render an explicit failure card when it is set. Render order must be: loading → **error** → empty → list, so a failure can never show as the "All caught up!" state. Match the repo's card/banner idiom (`AlertTriangle` is already imported). Do **not** import instructor-leader-specific components (e.g. `LeaderErrorNote`) across feature boundaries.
- Default decision (do not expand): static error message, no retry button.

## Item 2 — De-duplicate the two stat cards

Both `WelcomeBanner` stats currently show the same number ("Pending Directives" and "Active Tasks" both render `tasks.length`).

- Replace the second card with **"Urgent / Overdue"**: the count of active tasks where `priority === "urgent"` or the due date is already past (reuse the `Overdue` result of the existing `formatDueDate` helper in the same file). Show `"..."` while loading.
- No other `WelcomeBanner` changes.

## Item 3 — Browser smoke walkthrough (verification only, honest limits)

- Check `src/features/auth/devPresets.js` for an officeboy preset. Run `npm run dev`; if a preset exists, sign in and walk the dashboard: loading state, task list, completed-tasks section, and the new stat card.
- If the dev server connects to the **production** Firestore project, the walkthrough is **LOOK-ONLY**: do not create, complete, or delete anything — no test data in production. If the repo supports pointing the dev server at the Firestore emulator (check `src/firebase.js` for emulator env hooks), prefer that and you may also exercise the complete flow there.
- The live error card does not need to be triggered in the browser (unit test covers it).
- Record exactly what was and wasn't exercised. If no officeboy login exists, record "browser walkthrough not possible without credentials" — do not invent logins or write fixture data to production.

---

# 3. Constraints

- Do **not** modify `firestore.rules`, `firestore.indexes.json`, or any security surface.
- No new dependencies, collections, listeners, or indexes — the hook keeps its single existing listener.
- Reuse existing UI primitives and patterns; smallest change that solves each item; no unrelated refactors.
- Legacy tolerance: `completedAt` may be a Firestore `Timestamp` or an ISO string — the existing sorting already handles both; keep it that way.

---

# 4. Tests

Update `src/features/dashboard/OfficeBoyDashboard.test.js` (follow its existing mock pattern for `useStaffDirectives`):

- Hook returning `error` → error card renders and the "All caught up!" empty state does **not**.
- Stat card shows the urgent/overdue count (e.g. one urgent + one overdue task → `2`).

---

# 5. Verification — all must pass before reporting done

- `npm test` → 0 failed (emulator suite skipped as usual).
- `npm run lint` → 0 errors / 0 warnings. `npm run typecheck` → 0 errors. `npm run build` → clean.
- `npm run test:rules` not required (no rules change) — say so explicitly in the report.

---

# 6. Reporting / governance

- Append a dated Level 1 entry to `docs/audits/current/regression-log.md` and `docs/audits/audit-log.md`, following the existing 2026-10-10 Office Boy entries' format (Change / Normal Test / Failure Test / Not-run list / Status). Keep the "not run / not verified" section honest (browser walkthrough coverage, e2e not run, no deployment).
- Commit on `main` when done, message style: `polish(ob): surface directives failure state and dedupe stat cards`. Do **not** push and do **not** deploy anything (`firebase deploy` stays with the operator).
- Finish with the AGENTS.md summary format: Changed / Verified / Needs from Kifry / Notes.
