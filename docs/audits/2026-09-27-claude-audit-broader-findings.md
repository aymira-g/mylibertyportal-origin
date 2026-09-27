# MyLiberty Portal — Broader Audit Findings (Claude, addendum)

**Date:** 2026-09-27 (follow-up to `2026-09-27-claude-audit-verification-pass.md`)
**Scope of this pass:** Widened past the prior audits' checklists — read `firestore.rules` in full (not just the collections earlier audits already discussed), traced every call site of the affected collections through the app, and read the Cloudflare Worker (`worker.js`) end to end. This is the "something slipped off their eyes" pass. Still not exhaustive — see "Not covered" at the end.

## Headline: a real, currently-active cross-branch data leak

This app's whole security model is built around **branch isolation** — Bone Bolango staff shouldn't see Pohuwato's data, etc. There's a genuine bug in that model, and the team already half-found it: `firestore.rules` contains this comment, written by whoever built the rules:

> *"For `list` only: isSameBranch's no-branch-fields → kota_gorontalo fallback is unsound there. List rules are evaluated against a synthetic document built from the query's where clauses, so a query with no branch filter produces a fieldless synthetic doc that the fallback treats as Kota Gorontalo — letting Kota Gorontalo staff list every branch's documents."*

In plain terms: when a **Kota Gorontalo–based** manager or staff member runs a Firestore query that doesn't filter by branch, the rule for many collections *waves it through* (because the rule can't tell the difference between "no branch specified" and "genuinely Kota Gorontalo data") and Firestore returns documents from **every branch**. For staff at the other three branches, the exact same missing filter gets **rejected outright** (permission-denied), because their branch doesn't get the fallback.

The team clearly understood this, because they already fixed it correctly for exactly two things — `/payments` and the `/visits` subcollection — by writing a second, stricter helper (`isSameBranchStrict`, no fallback) and using it specifically for `list`. They just didn't apply the same fix everywhere else the pattern occurs, and — this is the important part — **there are real, everyday screens in the app that hit this today**, not just a theoretical gap.

### Where it's live right now

| # | Where | What happens | Severity |
|---|---|---|---|
| 1 | `WalkInInquiryTab.jsx` (Front Office "Walk-In Inquiry" screen) | Fetches **all** `deskInquiries` with no branch filter (`fetchRecentDeskInquiries`), and the on-screen list only filters by search text/status — **not branch**. A Kota Gorontalo front-office staffer sees every branch's walk-in prospects (names, phone numbers) rendered directly in the UI. | 🔴 Critical — real PII, actually displayed, on a screen used daily |
| 2 | `FrontOfficeReportsTab.jsx` | Same unscoped fetch, but this one *does* filter by branch before display. Cross-branch data still leaves the server and hits the browser (visible in dev tools / network tab) even though it's not rendered. | 🟠 Medium — over-exposure, not on-screen |
| 3 | `AdmissionsTab.jsx` → `fetchAdmissionsReportData()` | This function takes no `isAdminView` or `branchId` argument at all — it **always** queries `applications` and `classes` unscoped. Whether the result gets filtered before display depends on the `branchFilter` prop it's handed (see #4). | 🔴 High — prospective-student PII |
| 4 | `KidsManagerDashboard.jsx` → `<ReportsDashboard isAdminView={true} isFrontOffice={false} .../>` | This is passed for the **Kids/kindergarten division Manager** — not an actual admin. Inside `ReportsDashboard`, `isActualAdmin = isAdminView && !isFrontOffice` evaluates to `true`, which (a) makes every report fetch (`fetchStaffShifts`, `fetchTodayScansData`, `fetchStudentProgressData`, `fetchInstructorAnalyticsData`) skip branch scoping, **and** (b) defaults the branch-filter dropdown to `"all"` instead of locking it to the manager's own branch — so a Kids Manager sees cross-branch data rendered directly, not just over-fetched. Looks like a copy-paste from the real `AdminDashboard.jsx` usage. | 🔴 High — looks like a plain configuration mistake, not intentional |
| 5 | `usersRepository.js: findParentsForStudent` (flagged in the first pass) | Refined understanding: for Kota Gorontalo staff this doesn't just fail — it **succeeds** and pulls cross-branch parent records (names, phones) before the app filters them out client-side. For other branches it's still a hard permission-denied. | 🟠 Medium — filtered before display, but still an unscoped read of PII |

**Evidence standard, per your own audit template:**
- **Impact:** parent/prospect/staff PII (names, phone numbers, in some cases payment/shift data) from every branch becomes visible to — at minimum — Kota Gorontalo-based staff, in a system whose entire selling point to itself is per-branch data isolation.
- **Likelihood:** High. These aren't hypothetical devtools attacks — #1, #3, and #4 fire during completely normal, daily use of existing screens.
- **Confidence:** High for #1, #3, #4, #5 (traced the actual query and, where relevant, the actual render-filter code). Medium for #2 (traced the fetch; didn't render the component to watch the network tab directly).

### Why this wasn't caught before
The 10:01 audit and the Qodo pass both looked at individual collections/functions in isolation and found *some* of the symptoms (e.g. the parent-linkage issue). Neither one seems to have pulled the thread on *why* — the shared root cause sitting in the rules file's own helper functions, with a comment that basically names the bug and then only half-fixes it. That's the kind of thing that's easy to miss when auditing feature-by-feature instead of rule-by-rule.

---

## The Firestore-rules side of the fix (read carefully — don't blanket find/replace)

`isSameBranch` is **correct and intentional** for `get`/`update`/`delete` — the code comment explains it's needed so legacy documents with no `branchId` field stay reachable by Kota Gorontalo staff. The bug is specifically about using it for **`list`** (including any `allow read` that isn't split into `get`/`list` separately, since `read` covers both).

The `/payments` collection already shows the correct pattern:
```
allow get:  if isAdmin() || ((isManager() || isFrontOffice()) && isSameBranch(resource.data));       // lenient — single doc, legacy-safe
allow list: if isAdmin() || ((isManager() || isFrontOffice()) && isSameBranchStrict(resource.data));  // strict — no fallback leak
```

**Collections that currently use one combined `allow read` (or an `allow list` sharing `isSameBranch`) and need the same get/list split**, based on this pass:
- `/users` — already split into `get`/`list`; just swap `isSameBranch` → `isSameBranchStrict` inside the `allow list` block.
- `/attendance`, `/applications`, `/classes`, `/todos`, `/shifts`, `/staffLeave`, `/deskInquiries`, `/schoolOutreach` (the top-level collection — its `/visits` subcollection is already fixed), `/kioskDevices` — all currently use a single `allow read` combining get+list; each needs splitting into `allow get` (keep `isSameBranch`) and `allow list` (switch to `isSameBranchStrict`).
- `/classAttendance` — same pattern likely applies; re-check its exact current `allow read` wording before editing, since I didn't re-quote it verbatim in this pass.
- `/approvals` (via `isApproverForDoc`) — lower priority: the `isSameBranch` fallback only triggers for legacy docs missing `approverBranchId`, so the exposure is narrower.

**For the executor, in order:**
1. Re-read the current `firestore.rules` file fresh (don't rely solely on this document — rules may have changed) and confirm the exact wording for each collection above.
2. For each one, split `allow read` into `allow get` (unchanged, `isSameBranch`) and `allow list` (`isSameBranchStrict`). Do this one collection at a time, not as a single mechanical find/replace — the OR-clauses differ per collection (e.g. `/classes` has instructor/student self-access clauses that must be preserved in both `get` and `list`).
3. After each collection, run the existing rules-emulator test suite (`npm run test:rules`). Add a new test per fixed collection asserting: a Kota-Gorontalo-branch manager/staff running an **unscoped** query now gets permission-denied (or correctly-scoped results), not cross-branch data.
4. This is a defense-in-depth fix, not a substitute for fixing the app code below — even a perfectly strict rule just turns today's silent leak into a permission-denied error unless the queries themselves are also fixed to filter by branch.

## The app-code side of the fix (this is the part actually causing the leak today)

Don't pick silently — these are independent, but here's a concrete starting point for each:

- **`WalkInInquiryTab.jsx`** — add a branch filter to `filteredInquiries` (mirror what `FrontOfficeReportsTab.jsx` already does with `matchesBranchFilter`), and pass a `where("branchId", "==", ...)` into `fetchRecentDeskInquiries` itself so the leak doesn't even leave the server.
- **`fetchAdmissionsReportData`** — give it a `branchId` parameter and apply it to both the `applications` and `classes` queries, the same way `fetchStaffShifts` already does it correctly elsewhere in the same file.
- **`KidsManagerDashboard.jsx`** — this one looks like it just needs `isAdminView={false}` (matching how `ManagerDashboard.jsx` calls the same component) unless there's a real reason a Kids Manager needs cross-branch visibility, in which case that should be a deliberate, named permission — not an accidental side effect of an `isAdminView` flag meant for real admins.
- **`findParentsForStudent`** — options already given in the first-pass document; still applies.

---

## Cloudflare Worker (`cloudflare-worker/worker.js`) — not covered by any prior audit

**Good news first:** the kiosk clock-in/out flow (`handleShiftClockIn`, `handleShiftClockOut`) is solid. It verifies the device is registered, consumes a single-use expiring challenge nonce atomically, verifies an ECDSA signature against the device's registered public key, derives the user's identity **server-side** from the badge token rather than trusting anything the client claims, and enforces the single-open-shift rule. I looked for a bypass here and didn't find one.

**One real bug found:**
```js
branch: device.branchId === "bone_bolango" ? "Bone Bolango" : "Kota Gorontalo",
```
This is the *only* place in the worker that turns a `branchId` into a display name, and it only handles 2 of the app's 4 branches (`branches.js` lists Kota Gorontalo, Bone Bolango, Pohuwato, Limboto, and already has a correct `idToBranch()` helper that isn't used here). **Every kiosk clock-in at the Pohuwato or Limboto branch writes `branch: "Kota Gorontalo"` into the shift record** — wrong label, even though `branchId` itself is correct. Anything that displays `.branch` instead of resolving `.branchId` (shift lists, exports, reports) will mislabel these. Fix: use the existing `idToBranch(device.branchId)` instead of the hand-written ternary.
- **Impact:** data-integrity/display bug, not a security issue (branchId is correct, so rules checks still work).
- **Confidence:** High — grepped the whole file, this is the only branch-name mapping in it.

**One config item worth a look:** `getCorsOrigin` falls back to `Access-Control-Allow-Origin: *` if the `ALLOWED_ORIGIN` environment variable isn't set in the Cloudflare deployment. Because every privileged endpoint requires a Bearer token the caller must already possess (not a cookie), a wildcard origin alone doesn't let a malicious site forge a valid request — so this is low severity — but it's a one-line Cloudflare dashboard fix and worth setting explicitly rather than relying on the fallback.

---

## Not covered in this pass
To keep this a genuine "go broader" pass rather than a never-ending one: I did not do a concurrency/race-condition audit (double clock-ins, double payments, simultaneous edits), did not check `docs/ARCHITECTURE.md` for drift against the current code, did not look at bundle size/performance/PWA caching, and did not verify the remaining ~25 Qodo findings. Happy to take any of those next — say which.
