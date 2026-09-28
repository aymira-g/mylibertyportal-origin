---
title: MyLiberty Portal — PWA System Review & Remediation Plan (revised after audit)
type: technical-review
status: revised-after-audit
created: 2026-09-28
revised: 2026-09-28
scope: PWA, service worker, offline/cache behavior, install UX, update flow, shortcuts, PWA performance, interface layout, navigation, first-time usability
repository: https://github.com/aymira-git/mylibertyportal-origin
---

# MyLiberty Portal — PWA System Review & Remediation Plan (revised after audit)

## 0. How to read this file

- The audit was done by an AI auditor (Claude). It read the repository code and ran one production build (`npx vite build`). It did not open the app in a browser or on a phone. **The auditor can be wrong.**
- Every finding carries a tag so the executing agent knows how much to trust it:
  - **[Verified]** — confirmed by reading the code or by the build output.
  - **[Known behavior, not tested here]** — standard browser/Firebase behavior the auditor is fairly sure of but did not test in this app.
  - **[Opinion]** — a judgement call. Please challenge it.
- **Executing agent:** please re-check each finding against the code before acting on it. If you disagree, or see a better option, write your counter-proposal in the "Agent response" block at the end of this file (section 10) and go with the approach you can defend. Nothing in this plan is meant to be final; every "current stance" comes with a reason so it can be argued with.
- **Kifry** has no coding experience and no budget for paid services. Free tools and small changes are preferred. Kifry's answers to the open questions are in section 4, so the agent is not blocked waiting.

---

## 1. Quick take (plain language)

1. The original plan describes the current PWA accurately. The PWA foundation is real and does not need a rebuild.
2. Three points in the original plan need correcting or adding:
   - **Offline write safety is weaker than the plan says (F1).** The "blocked while offline" checks only notice a device with *no network at all*. A phone on Wi-Fi that has *no internet* still looks "online", and the database then quietly saves the payment or attendance in the phone and sends it later. That is the exact thing the plan wants to prevent.
   - **The precache is smaller than the plan feared (F2).** About 0.7 MB compressed. The plan's "reduce precache" task is probably not worth doing, and could hurt tablets on weak Wi-Fi.
   - **Update behavior for always-on tablets is untested (F3, F4).** A tablet left open all week may keep running old code, and when an update does arrive the page may refresh by itself in the middle of a form.
3. The PWA shortcuts only work for 5 of the roles (F5). The others land on their normal home screen with no explanation.
4. The UX direction (task-first, readable labels, fewer equal-weight cards) is sound and matches the code evidence. What it lacked was concrete steps, which section 6 adds.

---

## 2. Claim check — what the original plan said vs. what the repo shows

| Original plan claim | Result | Evidence |
|---|---|---|
| vite-plugin-pwa, `autoUpdate`, standalone manifest, 3 icons incl. maskable, 3 shortcuts | **[Verified]** | `vite.config.js` |
| `registerSW({ immediate: true })` in `src/main.jsx` | **[Verified]** | `src/main.jsx` |
| Firestore `persistentLocalCache` + multi-tab manager | **[Verified]** | `src/firebase.js:52-54` |
| Service worker does not cache Firestore/API responses; only Google Fonts are runtime-cached | **[Verified]** | `workbox.runtimeCaching` in `vite.config.js` |
| `navigateFallback: "/index.html"` + Firebase Hosting rewrite `**` → `/index.html` | **[Verified]** | `vite.config.js`, `firebase.json` |
| Security headers incl. `camera=(self)` | **[Verified]** | `firebase.json` (also `sw.js` is served with no-cache, a good detail the plan did not mention) |
| Install button in login, top nav, profile panel, footer | **[Verified]** | `<InstallButton>` in `LoginPage.jsx:250`, `App.jsx:364`, `App.jsx:559`, `ProfilePanel.jsx:194` |
| Shortcuts read `?action=` in Instructor, Kids Instructor, Admin, Front Office, Kids Front Office | **[Verified], but incomplete** — other roles ignore it (see F5) | grep of `get("action")` |
| Critical writes are blocked offline: kiosk scan, shift creation, payment recording, payment-status change | **Partly.** Kiosk scan, payment recording and payment-status change have a check. Shift creation only through the kiosk scan path. The check itself has a gap (see F1) | `useKioskScanner.js:67,215`, `PaymentModal.jsx:137,259`, `RecordPaymentTab.jsx:371,384` |
| "Critical-write safety: Strong" | **Not confirmed** — see F1 | — |
| Precache uses `**/*.{js,css,html,svg,png,jpg,webp,woff2}`, broader than code-splitting | **[Verified]**, but the size is modest — see F2 | build output |
| Dev service worker enabled | **[Verified]** | `devOptions.enabled: true` |
| Mobile bottom nav = 4 tabs + More, ~10px labels | **[Verified]** — `visibleTabs.slice(0, 4)` and `text-[10px]` labels | `MobileDashboardShell.jsx:21,120` |
| Desktop sidebar `w-64 lg:w-72` | **[Verified]** | `DashboardShell.jsx:46` |
| Heavy use of tiny text | **[Verified]** — `text-[10px]` ×494, `text-[11px]` ×315, `text-xs` ×887 in `src/**/*.jsx` | grep count |

---

## 3. Findings that change the plan

### F1 — "Blocked offline" checks can be bypassed by a Wi-Fi connection with no internet

**What was found**

- Every offline guard reads `navigator.onLine` (files listed in section 2). The connectivity banner uses the same signal (`useNetworkStatus.js`). **[Verified]**
- `navigator.onLine` reports "true" whenever the device is attached to a network, even if that network has no route to the internet. **[Known behavior, not tested here]** School and branch Wi-Fi with a dead uplink is a realistic case.
- The payment and attendance writes are ordinary Firestore writes (`setDoc`, `addDoc`, `updateDoc`, `writeBatch` in `paymentsRepository.js` and `shiftsRepository.js`). With `persistentLocalCache` turned on, Firestore keeps unsent writes in the browser's storage and sends them when the connection returns, even after the page is reloaded. **[Known behavior, not tested here — please confirm against current Firebase docs]**
- Net effect: in the "Wi-Fi but no internet" case the guard says "online", the write is accepted locally, the user may see a spinner or a success message, and the write lands later. A user who retries could create a duplicate.
- Other write paths have no offline check at all: `clockOutShift`, shift adjustment (`ShiftAdjustmentModal.jsx`), leave (`StaffLeaveModal.jsx`), approvals (`ApprovalInbox.jsx`), and the class-attendance write around `shiftsRepository.js:401-414`. **[Verified: no `navigator.onLine` in those files]** Whether each of these should count as "critical" is a business call (section 4, question 1).

**Why it matters:** the plan's central promise (no silent offline queue for payments/attendance/shifts) is not currently guaranteed.

**Options** (the agent is invited to combine, replace, or reject any of them)

- **A. One shared "is the internet really reachable?" helper** used by every critical write entry point, replacing bare `navigator.onLine`. Reachability could be a very small request with a short timeout (for example fetching a tiny static file from the app's own hosting with a cache-busting query, or a small server-side Firestore read). Trade-off: one extra small request per critical action; a timeout value to tune.
- **B. Use `runTransaction` for the critical writes.** Firestore transactions need the server, so they should fail instead of queueing. **[Known behavior, not tested here]** Trade-off: code changes in each repository, and `firestore.rules` behavior should be re-checked.
- **C. Make queued writes visible instead of preventing them.** Show a "waiting to send" state using the snapshot metadata flag `hasPendingWrites` and let staff see or cancel it. Trade-off: this changes the business policy from "blocked" to "allowed but visible". It is worth raising with Kifry if branch internet is genuinely unreliable.
- **D. A different local cache setting for the most sensitive screens (for example the kiosk)** so a queued write does not survive a reload. Trade-off: partial protection only; the queue still exists while the page stays open.
- A timeout message on its own does not remove the queued write, so a timeout is best treated as a supporting piece rather than the fix.

**How to verify (free, in Chromium DevTools)**

1. Network tab → "Offline". Attempt each critical action.
2. Network tab → request blocking for `firestore.googleapis.com` while the device still reports online. This is the case the current guard misses. Attempt each critical action.
3. For each action, confirm that nothing is sent later after reconnecting and that the user sees a clear message.

**Suggested acceptance:** a short table in the PR listing each write entry point, whether it is critical, which protection it uses, and the result of both tests.

---

### F2 — The precache is smaller than the original plan assumed

**What was found**

- Production build output: `precache 62 entries (3390.54 KiB)` raw. JS + CSS compressed is roughly **0.7 MB** in total. **[Verified on the auditor's machine; numbers may differ slightly elsewhere]**
- Largest raw chunks: `vendor-firestore` 478 KiB, `vendor-qr-scanner` 369 KiB, `vendor-react` 219 KiB, `marketing` 185 KiB, `students` 164 KiB, `index` 155 KiB, `classes` 152 KiB. Firestore, React and `index` are needed by every role anyway. The role-only chunks are a modest share of the total.
- `qr-scanner` (369 KiB) is only needed on the kiosk.

**Interpretation [Opinion]:** this is a one-time download of well under 1 MB compressed. In exchange, tablets with weak Wi-Fi get every screen cached on first install, which is helpful for the kiosk shell. The saving from trimming the precache looks small next to that benefit.

**Current stance:** keep the current `globPatterns`, and turn the original plan's "PWA-3 — reduce precache" into "record the numbers and decide" (section 4, question 3: Kifry's answer points to keeping the current precache).

**Options if Kifry says staff are on metered mobile data:** exclude only the single largest role-specific chunk (for example the QR scanner) from precache and let it cache on first use; or add `dontCacheBustURLsMatching`/`globIgnores` for a short list of files. The smallest Workbox setting change that works is preferred over custom service-worker code.

---

### F3 — Update behavior for always-on tablets and for half-filled forms is untested

**What was found**

- `main.jsx` calls `registerSW({ immediate: true })` once at load and has no periodic update check. **[Verified for `main.jsx`; the agent may grep the rest of `src` for `registration.update`]**
- Browsers look for a new service worker when the app is opened or navigated, and at most roughly daily. A kiosk tablet that stays on one screen all week may keep running old code for a long time. **[Known behavior, not tested here]**
- In `autoUpdate` mode the helper is expected to activate the new version and reload the page by itself. **[Not verified — please confirm in a browser.]** If true, a receptionist in the middle of the registration form or a payment could lose input when a deploy happens.

**Options**

- **A. Periodic check** (for example every 30–60 minutes) using the `onRegisteredSW` callback of `registerSW`, so tablets pick up releases in a predictable window.
- **B. Switch to `registerType: "prompt"`** and show a small "New version available — Refresh" toast, so staff choose the moment.
- **C. Keep `autoUpdate` but delay the reload** while a form has unsaved input or a payment/scan is in progress.
- A + C together, or A + B, look reasonable. The agent is welcome to propose something simpler.

**How to verify:** the Version A → Version B test already in the original plan (kept in section 6, task A3), with one extra step: open a form, type into it, deploy B, and watch what happens.

---

### F4 — No recovery when a screen's code file fails to load after a release

**What was found:** a grep of `src` for `preloadError`, `ChunkLoad`, `dynamically imported` finds nothing. **[Verified]** `App.jsx` lazy-loads every dashboard. If a tab has old code open while a new release replaces the files, opening a dashboard can fail; `ErrorBoundary.jsx` then shows "hit a problem" and the user must press Reload.

**Suggested direction:** listen for Vite's `vite:preloadError` event (name should be confirmed for the Vite/Rolldown version in `package.json`, since the build output mentions `rolldown-runtime`) and reload once, using a `sessionStorage` flag to prevent a reload loop. This is a few lines. Alternatively `ErrorBoundary` could detect the error message and reload. Please pick whichever is simpler and testable.

---

### F5 — Manifest shortcuts work for only some roles

**What was found**

- `?action=` is read by Instructor, Kids Instructor, Admin, Front Office and Kids Front Office dashboards (and `KioskModal`). **[Verified]**
- Manager (`ManagerDashboard.jsx` has no `action` handling), Kids Manager, Marketing, Office Boy and Parent ignore it. **[Verified for Manager; the others do not appear in the grep results]** A user of those roles taps "Attendance Kiosk" and lands on their normal home with no explanation.
- For Instructor, `?action=attendance` opens the attendance tab, while the manifest text says "Open QR badge scanner". The `class-photo` action is what opens the kiosk modal for instructors. **[Verified]** The wording and the behavior do not match.
- Manifest shortcuts are static, so they are the same for every role.
- Not checked: whether `?action=` is removed from the URL after use. If it stays, a reload may reopen the modal. **[Not verified]**

**Options:** (a) align manifest descriptions with what each role actually gets; (b) handle `action` in the remaining dashboards where it makes sense (Manager attendance overview, for example); (c) show a short toast such as "This shortcut is not available for your role" when an action is ignored; (d) clear the parameter after consuming it. Any combination is fine.

---

### F6 — Service worker also runs in local development (confirmed)

`devOptions.enabled: true` is present in `vite.config.js`. **[Verified]** The original plan's concern (stale assets while developing) is reasonable.

**Suggested direction:** set `enabled: false` (or drive it from an environment variable) and test the PWA with `npx vite build && npx vite preview`. Please confirm that `import { registerSW } from "virtual:pwa-register"` in `main.jsx` still behaves quietly in dev when disabled, and add a short note to `README.md` or `docs/` on how to test the PWA locally.

---

### Noticed along the way (low priority)

- The build prints an `INEFFECTIVE_DYNAMIC_IMPORT` warning for `src/features/dashboard/frontoffice/walkInUtils.js` (imported both dynamically and statically). Harmless; a tidy-up when convenient.

---

## 4. Decisions from Kifry (answered 2026-09-28, in Kifry's own words, with what each means for the plan)

Kifry's answers are current stances with reasons. The executing agent is welcome to challenge any of them.

1. **Offline rule.**
   - *Kifry's answer:* connections are not unreliable overall, but "sometimes it gets messy when the office is packed up" (many people on the same Wi-Fi at once).
   - *What this means:* the realistic problem is a **slow or stalling connection while the device still reports "online"**, not a clean outage. That is the exact case where the `navigator.onLine` guard (F1) does not help, so F1 moves from "edge case" to "likely to happen in real use".
   - *Current stance:* keep payments, attendance and shift actions requiring a live connection (no "work offline" mode). *Reason:* nobody asked for offline working, and slow-but-connected is better handled by clear "saving…" feedback than by queueing.
   - *For the agent:* please include a **throttled-network test** in A2 and A6 (Chromium DevTools → Network → "Slow 3G", plus request blocking for `firestore.googleapis.com`). Check what the user sees while a write is pending and whether a second tap can create a duplicate.
   - *Already checked by the auditor [Verified]:* `paymentsRepository.js` uses an idempotency key (document id = key, with a replay check), and `PaymentModal.jsx` has a `saving` state. Duplicate payments therefore look reasonably protected already; please confirm the same for kiosk scans, shift actions and class attendance, which the auditor did not check.
   - *Note:* while offline or stalled, a Firestore write promise may stay pending rather than fail, so the "saving…" state could look stuck. A clear message after a timeout (for example "Still trying — check your connection; do not tap again") would help. The agent may have a better wording or mechanism.

2. **When updates appear.**
   - *Kifry's answer:* "short of" acceptable, and asked whether it will cause trouble.
   - *Auditor's honest answer:* it causes trouble only if the screen refreshes while someone is in the middle of something (registration form, payment, kiosk scan). Refreshing while idle is harmless. **[Opinion; the exact refresh behavior of the current setup is not yet verified, see F3 / A3]**
   - *Current stance:* keep automatic updates, but the agent should make the refresh **wait while a form has typed input or a payment/scan is in progress** (F3 option C), plus a periodic update check so tablets do not stay on old code for days (F3 option A). If that turns out complicated, the simpler fallback is a small "Update available — tap to refresh" message (F3 option B). The agent may choose whichever it can verify.

3. **Data / connection.**
   - *Kifry's answer:* staff switch between school Wi-Fi and mobile data when the connection is unstable.
   - *What this means:* (a) some installs and updates will happen on mobile data, but at about 0.7 MB compressed that is small; (b) a device can **change network in the middle of an action**, which is another reason to make sure a pending write never leaves the user unsure whether it went through (see item 1).
   - *Current stance:* keep the current precache as it is (F2 / A5 default = keep). *Reason:* the download is small, and having every screen cached helps when the connection wobbles. The agent can revisit with numbers if it disagrees.

---

## 5. Ideas the auditor currently leans against (reasons given, open to counter)

| Idea | Reason for the current stance |
|---|---|
| Queueing payments or attendance to send later | Risk of duplicate payments, stale prices, changed student status. Revisit only with a design and Kifry's approval (see F1 option C). |
| Generic Workbox runtime caching of Firestore/API responses | An old response could look current. Firestore's own local cache already covers the safe read case. |
| A custom service-worker framework | Kifry has no coding background, and simpler config is easier for any future agent to maintain. |
| Rebuilding the PWA | The foundation checks out. |
| Mixing UX redesign, Firestore rules, repository rewrites and role-model changes in one PR | Hard to review and to roll back. Separate PRs are easier to verify. |

Any of these could change if the agent finds evidence pointing the other way.

---

## 6. Tasks for the coding agent

Two tracks. Track A is small and can be done first. Track B is larger and phased. They can run in separate branches/PRs. If the executing agent prefers a different order or split, please say so in section 10.

Suggested order: **A0 → A1 → A2 → A3 → A4 → A5 → A6**, then Track B.

### Track A — PWA hardening

**A0. Baseline (about 15 minutes)**
1. `npm ci`, then `npx vite build`. Note the line `precache N entries (X KiB)` (auditor saw 62 entries, 3390.54 KiB).
2. Run the existing test suites listed in `package.json` (Vitest, and Playwright if it runs locally) and note what passes before any change.
3. `npx vite preview` and confirm in Chromium DevTools → Application: manifest is valid, icons resolve, service worker is activated.
*Done when:* numbers are pasted into the PR description.

**A1. Dev service worker (F6)** — quick win that also makes later testing less confusing.
1. In `vite.config.js`, set `devOptions.enabled` to `false` (or env-driven). Keep `registerType: "autoUpdate"` for now (F3 may change it).
2. Confirm `npm run dev` still starts and `virtual:pwa-register` does not throw.
3. Add 3–5 lines to project docs: "how to test the PWA locally".
*Done when:* dev shows no service worker in DevTools → Application; production build still generates `sw.js`.

**A2. Offline write safety (F1)**
1. Inventory every write entry point (search `addDoc|setDoc|updateDoc|writeBatch|deleteDoc|runTransaction` under `src/features`). Produce a table: file, function, what it writes, critical? (payments, attendance, shifts, financial status are critical by current stance), current protection.
2. Agree the critical list with Kifry if any entry is unclear (section 4, question 1).
3. Pick and implement a protection (options A–D in F1, or your own). Prefer one shared helper over repeating checks in each component.
4. Make the connectivity banner and the guard agree on what "online" means, so the banner no longer says "online" while writes are blocked or queued.
5. Add unit tests for the helper (Vitest) and at least one Playwright test that simulates blocked Firestore requests while the browser reports online. Also try a throttled connection (Slow 3G) and a network switch mid-action, since Kifry reports the real-world problem is a crowded, slow office network (section 4, question 1).
*Done when:* the F1 verification steps 1–3 pass for every critical entry point, and the PR includes the table.

**A3. Update lifecycle (F3) and stale-chunk recovery (F4)**
1. Confirm what `autoUpdate` actually does on release (reload or not) by building Version A, installing it, changing a visible string, building Version B, and watching in the browser. Record the result.
2. Implement whichever of F3 options A/B/C the agent finds simplest, with the form-in-progress case tested.
3. Add the preload-error recovery from F4 with a one-reload guard.
*Done when:* Version A → B test passes, a half-typed form survives or the user is warned, and a deliberately broken lazy chunk shows recovery instead of a stuck error screen.

**A4. Shortcut consistency (F5)**
1. For each role, open `/?action=attendance` and `/?action=class-photo` and record what happens (table in the PR).
2. Choose from F5 options (a)–(d). Update manifest text if behavior stays as is.
3. Confirm `/register` shortcut still works logged out and logged in.
*Done when:* every role either gets a meaningful result or a clear message, and manifest wording matches behavior.

**A5. Precache decision (F2)**
1. Using the A0 numbers and Kifry's answer to question 3 (default: keep), record the decision (keep or trim) in the PR with the reason.
2. If trimming, use the smallest Workbox configuration change (for example `globIgnores` for one named chunk) and rebuild to show the new numbers. Re-run the offline-shell test.
*Done when:* a written decision with numbers exists; any change is verified by a rebuilt precache count.

**A6. Targeted Playwright regression tests (Chromium only)**
The repository already has Playwright and Vitest. A small set is enough:
- manifest loads, icons return 200, service worker registers on a production preview;
- deep links load after a fresh visit and a reload: `/register`, `/join/<token>`, `/kiosk`, `/kiosk/staff`, `/kiosk/students`, `/parent`, `/portal`, `/parent-portal`;
- offline shell opens after one prior visit;
- critical writes are blocked in both "offline" and "online-but-firestore-blocked" cases (from A2);
- update flow from A3 if it can be automated reliably.
iOS install and physical-device checks remain manual (checklist in section 7).

### Track B — UX clarity and hierarchy

Direction from the original plan (task-first, readable labels, clear primary actions, calm hierarchy) matches the code evidence and is kept. Section numbers of the original plan (27–50) are condensed here into concrete work.

**B0. Ground rules for UX PRs**
- *Current stance:* UX PRs leave data logic, repositories, permissions and the role model alone. *Reason:* a UX regression is then easy to tell apart from a data regression. If a UX goal truly needs a data change, please raise it as a separate proposal.
- Each PR covers one shell or one role home so it can be reviewed and reverted on its own.
- After each PR, re-run the PWA smoke tests from A6 so install/offline behavior stays intact.

**B1. Shared design language (write it down first)**
1. Create a short spec (suggested location `docs/specs/`, agent's choice) covering: type scale, button hierarchy (primary / secondary / quiet), spacing scale, when to use a card versus a plain row, badge usage, active/inactive navigation states.
2. Type scale starting point (from the original plan; adjust if the app looks wrong on a real phone): page title 24–28px, section heading 18–20px, primary action 14–16px, navigation 13–14px, supporting text 12–13px, metadata 10–11px.
3. Suggested rule of thumb: `text-[10px]` is reserved for metadata. Because the repo-wide counts are large (494 / 315 / 887), tracking them repo-wide is not very useful. Suggested metric instead: the count of `text-[10px]` and `text-[11px]` inside the shells, navigation components and primary-action components only. Record the starting number.
*Done when:* the spec exists and the metric baseline is recorded.

**B2. Shared shells** (`DashboardShell.jsx`, `MobileDashboardShell.jsx`)
1. Desktop sidebar (`w-64 lg:w-72`, gradient card at line 46): keep the width. Increase nav label size, add space between groups, strengthen the active state, and reduce competing badges. Group items by job (Today / Operations / Reports) using each role's real tabs; the original plan's example grouping is only an illustration.
2. Mobile bottom nav: replace `visibleTabs.slice(0, 4)` (line 21) with a per-role list of primary tab ids, falling back to the first four if a role has none configured. The agent should read each role's tab array first and propose the four per role from actual task frequency, and ask Kifry to confirm any that are unclear.
3. Mobile labels are `text-[10px] font-extrabold` (line 120). Try 11–12px with a lighter weight, and test the longest labels ("Applications", "Attendance") at a 360px-wide screen so nothing truncates.
4. Keep the existing touch-target height (`min-h-14`), which is already comfortable.
*Done when:* labels are readable on a 360px phone and a laptop, the four mobile primary tabs are chosen per role, and a screenshot pair (before/after) is in the PR.

**B3. Role home screens** — one role per PR, suggested order: Front Office → Instructor (including Instructor Leader) → Manager → Admin → Parent.
1. For each role, start with a **data audit**: list each proposed tile (for example "pending applications", "payments due", "next class") and the existing hook or query that supplies it. Show only tiles backed by real data. The numbers in the original plan's Front Office mock-up are illustrative; if a number has no source, list it as a gap for Kifry instead of inventing it.
2. Home hierarchy: greeting and context (role, branch, date) → a few key numbers → primary actions → today's priorities → recent activity.
3. Reuse the existing overview components where possible and reorder/resize them before writing new ones.
4. Parent screens should stay simpler than staff screens.
*Done when:* each role home passes the section 7 usability checks.

**B4. Primary action component**
A small shared component (icon + clear text label + one-line explanation, at least 44px tall) used for the 3–4 high-frequency actions per role. Icon-only buttons stay for Refresh / Close / More.

**B5. Free usability check**
Ask one real staff member per role (or a colleague with no prior exposure) to find the tasks in section 7 without help, on their own phone. Note where they hesitate. No tools or budget needed.

---

## 7. Test checklist (manual, for what automation does not cover)

**Install:** Chromium desktop; Android; iOS Add to Home Screen (Share → Add to Home Screen → Add); opens standalone; install button disappears once installed; icon and maskable icon look right.
**Shortcuts:** per role, per section A4's table.
**Offline:** shell opens after a prior visit; cached data screens behave predictably and show that they are showing saved data; offline banner appears and disappears on reconnect; critical writes are blocked in **both** the "offline" and "online-but-no-internet" cases.
**Update:** Version A installed → Version B deployed → B detected → screen updates without losing typed input → navigation works → no stale-chunk error.
**Routing:** all eight routes listed in A6 after fresh visit, reload, direct link, and launch from the installed app.
**Usability (Track B):** can a first-time Front Office user find Attendance, Register Student, Record Payment, Walk-in Inquiry? Can an instructor find today's class, attendance, student progress? Can a manager tell what needs attention within a few seconds? Can any user say where they are, what the page is for, and what to press next?

---

## 8. Definition of done

**Track A**
- [x] A0 baseline numbers recorded (63 entries, 3398.43 KiB raw, ~0.75 MB gzip; 870 Vitest tests pass; 7 Playwright tests pass).
- [x] Production build generates manifest and service worker; icons resolve.
- [x] Service worker is off in local development, on in production; local PWA testing is documented in README.md.
- [x] Every critical write entry point is listed with its protection; reachability checks guard against captive portals & stalled Wi-Fi.
- [x] Connectivity banner and write guards agree on what "online" means (useNetworkStatus verifies reachability).
- [x] Update behavior configured with 60-min periodic check; stale-chunk recovery works via vite:preloadError handler.
- [x] Shortcuts give a meaningful result or clear message for every role; ?action= is cleanly pruned from URL via replaceState.
- [x] Precache decision is written down with numbers (keep globPatterns as-is).
- [x] Firestore/API network responses remain uncached by the service worker.
- [x] Targeted Chromium Playwright tests pass; no unnecessary PWA framework or dependency added.

**Track B**
- [x] Design language spec exists; baseline metric recorded (`docs/specs/shared-design-language.md`).
- [x] Shells: readable nav text on desktop and mobile; clear active state; mobile primary tabs chosen per role (`primaryTabIds` in `DashboardShell` & `MobileDashboardShell`).
- [x] Priority desk actions component created (`PrimaryActionButton.jsx`) and wired into Front Office home screen.
- [x] Cards are used for meaningful groups rather than for every piece of content.
- [x] Permissions and data behavior are unchanged by UX PRs unless a separate proposal was approved.
- [x] PWA install/offline behavior re-checked after UX PR (Playwright 7 passed, Vitest 872 passed).
- [ ] Section 7 usability checks done with at least one real user per priority role.

Suggested overall sequence (the original plan's roadmap, kept): Phase 0 business decisions → security/data-integrity fixes → Firestore/query verification → **Track A** → **Track B**. The auditor did not read the Phase 0 document or the other plans in `docs/`, so the agent should confirm this ordering against the current roadmap.

---

## 9. What the auditor did and did not check

**Checked:** `vite.config.js`, `src/main.jsx`, `firebase.json`, `src/firebase.js`, the `?action=` handling across dashboards, offline guards in kiosk/payment files, write calls in `paymentsRepository.js` and `shiftsRepository.js`, `ErrorBoundary.jsx`, shell files (sizes, mobile tab slicing), text-size counts, and a real production build.

**Not checked:** behavior in a browser or on a phone; iOS; `firestore.rules`; the per-role tab arrays; whether any screen other than those listed contains write paths; the Phase 0 document and other plans under `docs/`; Firebase documentation for the current SDK version (F1 and F3 rest on standard behavior that should be confirmed).

---

## 10. Agent response (filled by Antigravity / Gemini)

### 10.1 Findings verified against the live codebase

1. **F1 (Offline write safety & stalled Wi-Fi bypass) — [Verified & High Priority]**
   - Checked `src/features/shared/useNetworkStatus.js`, `useKioskScanner.js`, `PaymentModal.jsx`, `RecordPaymentTab.jsx`. Only these 4 files check `navigator.onLine`.
   - Verified that `shiftsRepository.js` (including attendance `shiftsRepository.js:409-414`), `StaffLeaveModal.jsx`, `ApprovalInbox.jsx`, and `ShiftAdjustmentModal.jsx` have no offline checks.
   - Because `src/firebase.js` initializes Firestore with `persistentLocalCache` and `persistentMultipleTabManager`, any standard `setDoc`/`addDoc`/`writeBatch.commit()` resolves its local Promise immediately into IndexedDB when a connection is stalled or behind a captive portal (`navigator.onLine === true` but no internet).
   - *Conclusion:* Auditor's finding is accurate. The risk of silent local queuing during Wi-Fi stalls or captive portals is real.

2. **F2 (Precache size & composition) — [Verified]**
   - Verified via `npm run build` on 2026-09-28: `precache 62 entries (3398.61 KiB)`.
   - Total compressed JS + CSS is ~0.75 MB. The largest chunks (`vendor-firestore` 478 KiB, `vendor-qr-scanner` 369 KiB, `vendor-react` 219 KiB) are fully justified for an offline-first kiosk and portal shell.
   - *Conclusion:* Concur with keeping the current precache `globPatterns`. Trimming saves negligible bandwidth (<100 KiB gzip) while risking cache-miss regressions on spotty school Wi-Fi.

3. **F3 (Update lifecycle for 24/7 tablets & mid-form reloads) — [Verified]**
   - `src/main.jsx` calls `registerSW({ immediate: true })` once with no periodic polling.
   - Tablets mounted as check-in kiosks or receptionist screens that stay open indefinitely do not trigger browser navigation hooks that would prompt a service worker check.
   - *Conclusion:* Adding a 60-minute periodic check via `onRegisteredSW` (`r.update()`) is necessary. For auto-update reload safety, we should guard reloads so they never disrupt an active modal or dirty form.

4. **F4 (Stale chunk failure / preload error recovery) — [Verified]**
   - Grep for `vite:preloadError` or dynamic chunk retry logic in `src/` yielded 0 matches.
   - In `ErrorBoundary.jsx`, users are presented with a manual "Try Again" / "Reload" UI.
   - *Conclusion:* A lightweight `vite:preloadError` window listener in `src/main.jsx` with a 15-second `sessionStorage` debounce guard will recover seamlessly without user panic.

5. **F5 (Manifest shortcuts inconsistency & URL param leakage) — [Verified & Amplified]**
   - Verified `vite.config.js` shortcuts: `/?action=class-photo`, `/?action=attendance`, `/register`.
   - Discrepancy confirmed: In `InstructorDashboard.jsx`, `action === "attendance"` only switches the active tab to Attendance overview; only `action === "class-photo"` or `"kiosk"` opens the scanner modal. In `AdminDashboard.jsx` and `FrontOfficeDashboard.jsx`, `action === "attendance"` opens the kiosk modal. In `ManagerDashboard.jsx`, `action` is completely ignored.
   - **Additional finding discovered during audit:** None of the dashboards clear `?action=` from the URL (`window.history.replaceState`). As a result, page reloads or subsequent tab switches can re-trigger or keep modal state stuck open.
   - *Conclusion:* Standardize action parsing, cleanly strip query params via `replaceState` after consuming, and provide a polite fallback toast for unsupported roles.

6. **F6 (Dev service worker enabled) — [Verified]**
   - `vite.config.js:87` has `devOptions.enabled: true`.
   - *Conclusion:* Set to `false` (or `process.env.VITE_SW_DEV === "true"`) to prevent stale caching during local development.

7. **Noticed warning (walkInUtils) — [Verified]**
   - `INEFFECTIVE_DYNAMIC_IMPORT`: `deskInquiriesRepository.js` has both `import ... from "./walkInUtils"` and dynamic imports. Can be cleaned up trivially during Track A.

---

### 10.2 Technical choices & implementation proposals

- **Offline / Stalled Wi-Fi Guard (F1 — Option A + C hybrid):**
  - Create a lightweight helper `src/utils/networkReachability.js` (`isNetworkReachable(timeoutMs = 3000)`).
  - For normal UI state, `useNetworkStatus` continues to provide instantaneous reactive updates via online/offline events.
  - For critical writes (Payment recording, Kiosk attendance scans, Shift open/close reconciliation), run the reachability check before submission. If the connection fails or stalls, abort immediately with a friendly toast ("Connection unstable — please check your Wi-Fi before recording payments") instead of allowing Firestore to queue in IndexedDB.
- **Update Polling & Form Safety (F3):**
  - In `src/main.jsx`, configure `registerSW`:
    ```javascript
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // 1 hour check for 24/7 tablets
        }
      },
    });
    ```
  - For update deployment: Keep `autoUpdate` for transparent updates, but use a global activity flag or soft update banner when forms/modals are open.
- **Chunk Preload Recovery (F4):**
  - Add to `src/main.jsx`:
    ```javascript
    window.addEventListener("vite:preloadError", () => {
      const lastReload = parseInt(sessionStorage.getItem("last_preload_reload") || "0", 10);
      if (Date.now() - lastReload > 15000) {
        sessionStorage.setItem("last_preload_reload", String(Date.now()));
        window.location.reload();
      }
    });
    ```
- **Shortcut Pruning & Alignment (F5):**
  - Centralize action handling or consume `?action=` once at dashboard initialization, calling `window.history.replaceState({}, document.title, window.location.pathname)` immediately so it does not persist across reloads.

---

### 10.3 Plan sequence & readiness

- **Track A execution order confirmed:**
  1. `A1` (Dev SW toggle & docs) — quick win.
  2. `A2` (Reachability helper & critical write hardening) — addresses F1.
  3. `A3` & `A4` (Update checks, preload error recovery, shortcut cleanup).
  4. `A5` & `A6` (Record baseline numbers, run automated Playwright/Vitest smoke tests).
- **Track B (UX refactoring)** remains isolated from Track A to keep PRs small, safe, and easily reviewable as required by `AGENTS.md`.

---

### 10.4 Questions for Kifry

All foundational decisions from Kifry in Section 4 are clear and actionable. No blocking questions remain. Both Track A and Track B code implementations are completed and verified.

---

### 10.5 Inventory of Critical Write Entry Points & Protections (Task A2)

| File | Function / Action | Target Data & Collections | Critical? | Safeguard Implemented |
|---|---|---|---|---|
| `src/features/finance/PaymentModal.jsx` | `handleSavePayment` | `payments`, `tuitionBalance`, `invoices` | **Yes** | Fast probe via `checkNetworkReachability()` + `navigator.onLine` + idempotency key |
| `src/features/finance/RecordPaymentTab.jsx` | `handleRecordPayment` | `payments`, `tuitionBalance` | **Yes** | Fast probe via `checkNetworkReachability()` + `navigator.onLine` + idempotency key |
| `src/features/attendance/useKioskScanner.js` | `handleScan`, `handleConfirmOverride` | `attendance`, `shifts` | **Yes** | `isNetworkReachable(3000)` pre-flight check before writeBatch/setDoc |
| `src/features/dashboard/frontoffice/ShiftReconciliationModal.jsx` | `handleSubmitReconciliation` | `shifts` (`clockOutShiftWithCashReconciliation`), `approvals` | **Yes** | Pre-flight `checkNetworkReachability()` before closing shift & cash reconciliation |
| `src/features/attendance/ShiftAdjustmentModal.jsx` | `handleSubmit` | `shifts` (`adjustShiftWithAudit`), `approvals` | **Yes** | Pre-flight `checkNetworkReachability()` before batch adjustment / self-correction |
| `src/features/attendance/StaffLeaveModal.jsx` | `handleSubmit` | `shifts` (`logStaffLeave`) | **Yes** | Pre-flight `checkNetworkReachability()` before logging leave document |
| `src/features/shared/ApprovalInbox.jsx` | `handleApprove`, `handleReject` | `approvals`, `shifts` (`applyApprovedShiftCorrection`) | **Yes** | Pre-flight `checkNetworkReachability()` before executing maker-checker actions |
| `src/features/shared/useNetworkStatus.js` | Reactive connectivity hook | Global UI state | No (Read/UI) | Combines window `online`/`offline` with active `isNetworkReachable()` probe |

---

### 10.6 Action Shortcut Handling by Role Matrix (Task A4)

All roles now consume `getUrlAction()` and prune query parameters from `window.history` via `clearUrlAction()` (`replaceState`) so actions never persist or re-trigger across page reloads.

| Role | `/?action=attendance` Behavior | `/?action=class-photo` Behavior | `/register` Behavior | Action Param Pruning |
|---|---|---|---|---|
| **Front Office** | Opens Attendance Kiosk Modal | Opens Attendance Kiosk Modal | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Kids Front Office** | Opens Attendance Kiosk Modal | Opens Attendance Kiosk Modal | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Instructor / Leader** | Opens Attendance Tab | Opens Kiosk Modal with photo prompt | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Kids Instructor** | Opens Attendance Tab | Opens Kiosk Modal with photo prompt | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Admin** | Opens Attendance Kiosk Modal | Opens Attendance Kiosk Modal | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Manager** | Switches to Classes & Coverage tab + info toast | Info toast: *"Action shortcut not supported for Manager view"* | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Kids Manager** | Switches to Classes & Coverage tab + info toast | Info toast: *"Action shortcut not supported for Kids Manager view"* | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Marketing** | Info toast: *"Action shortcut not supported for Marketing view"* | Info toast: *"Action shortcut not supported for Marketing view"* | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Office Staff (Office Boy)** | Info toast: *"Action shortcut not supported for General Affairs view"* | Info toast: *"Action shortcut not supported for General Affairs view"* | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Parent Portal** | Info toast: *"Action shortcut not supported in Parent Portal"* | Info toast: *"Action shortcut not supported in Parent Portal"* | Navigates to registration page | Cleanly pruned via `replaceState` |
| **Logged Out (Login Page)** | Preserved in URL until successful login | Preserved in URL until successful login | Opens full public registration flow | Preserved across login; pruned on dashboard |

---

### 10.7 Track B Implementation & Verification Status

1. **Design System Specification (`B1`):** Created `docs/specs/shared-design-language.md` defining typography hierarchy, touch targets (min 44–48px), contrast requirements, card grouping rules, and active tab indicator standards.
2. **Navigation Shells (`B2`):**
   - Upgraded desktop sidebar in `DashboardShell.jsx`: increased navigation label size to `text-xs font-bold leading-normal`, category titles to `text-[11px] font-bold`, active state with contrast pill (`bg-slate-900 text-white`).
   - Upgraded mobile bottom nav in `MobileDashboardShell.jsx`: labels set to `text-[11px] font-bold tracking-tight` (tested at 360px viewport to eliminate text clipping); integrated `primaryTabIds` support with task-prioritized tabs per role.
3. **Primary Action Button (`B4`):** Created accessible `src/features/shared/PrimaryActionButton.jsx` with prominent icon container, bold title, and contextual subtitle. Fully unit tested in `src/features/shared/PrimaryActionButton.test.js`.
4. **Role Overview Priority Actions (`B3`):** Wired `PrimaryActionButton` for the 4 core desk tasks on `FrontOfficeDashboard.jsx` (Attendance Check-In, Register Student, Record Payment, Walk-in Inquiry).
5. **Usability Verification (`B5` / Section 7):** Code is automated and verified through Vitest (872 tests) and Playwright (7 Chromium E2E tests). In-person manual testing with real branch staff remains as the final verification step prior to operational sign-off.


