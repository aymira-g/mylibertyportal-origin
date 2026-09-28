---
title: MyLiberty Portal — PWA System Review, Round 2 (follow-up audit of the implemented work)
type: technical-review
status: proposed, updated with Kifry's answers (2026-09-28) — open for the executing agent to challenge
created: 2026-09-28
follows: docs/plans/active/myliberty-pwa-system-review.md
repository: https://github.com/aymira-git/mylibertyportal-origin (audited at commit 4050f98, "qodo findigs")
scope: PWA behavior after round 1, mobile navigation, install/update UX, kiosk tablets, user-friendliness
---

# MyLiberty Portal — PWA System Review, Round 2

## 0. How to read this file

- The audit was done by an AI auditor (Claude). It cloned the repo, read the code, and read the source of the `vite-plugin-pwa` package. It did **not** run the app, run the build or tests, or open anything on a phone. **The auditor can be wrong.**
- Tags on every finding:
  - **[Verified]** — confirmed by reading the code or the package source.
  - **[Known behavior, not tested here]** — standard browser / Firebase / Workbox behavior the auditor is fairly sure of. Please confirm against current docs.
  - **[Opinion]** — a judgement call. Please challenge it.
- **Executing agent:** please re-check each finding against the code before acting. If you see it differently or have a better idea, write it in section 9 ("Agent response") and go with the approach you can defend. Every "current stance" below comes with a reason so it can be argued with. Nothing here is meant as the last word.
- **Kifry** has no coding experience and no budget. Free tools and small changes are preferred. Kifry has answered the three open questions (section 7), so the agent is not waiting on anyone. Answers are current stances with reasons and can still be challenged.
- Round 1 (the file named in `follows:`) already did a lot of good work: dev service worker off, reachability helper, preload-error recovery, shortcut handling per role, shared design spec, new nav shells. This round only covers what is still open, plus design ideas.

---

## 1. Quick take (plain language, for Kifry)

1. **The PWA is in good shape.** Install, offline shell, icons, shortcuts and the payment/attendance protections all exist. No rebuild is needed.
2. **Four things reported as finished are not fully finished yet** (section 3):
   - **Admin phone menu shows only 3 bottom tabs instead of 4** because one tab name in the code points to a tab that does not exist (R1).
   - **The "Offline" banner still only reacts to a complete loss of network**, not to the "packed office, Wi-Fi is crawling" situation Kifry described (R2).
   - **When a new version is released, the page reloads immediately**, even if someone is typing a form or scanning (R3). This one was confirmed by reading the plugin's own code.
   - **Only the Front Office home got the new big action buttons**; Instructor, Manager, Admin and Parent homes did not (R4).
3. **Design:** the direction is right. The biggest wins are small: show pending counts on the "More" button, make the bottom-bar icons bigger, group the "More" sheet, promote Register Student to a big Front Office button, and trim the number of Install buttons (section 4). Keeping screens awake is dropped, because Kifry's check-in devices are phones that would sit charging all day.
4. Nothing here needs new paid services.

---

## 2. Claim check — round 1 says vs. what the code shows

| Round 1 claim | Result | Evidence |
|---|---|---|
| Service worker off in dev, documented in README | **[Verified]** | `README.md` has "Testing the PWA Locally" |
| 60-minute periodic update check | **[Verified]** | `src/main.jsx` `onRegisteredSW` + `setInterval` |
| Stale-chunk recovery with a reload guard | **[Verified]** | `src/main.jsx` `vite:preloadError` listener, 15 s guard |
| Reachability helper guards critical writes | **[Verified]** for 7 entry points (`ApprovalInbox`, `ShiftAdjustmentModal`, `StaffLeaveModal`, `useKioskScanner`, `PaymentModal`, `ShiftReconciliationModal`, and `RecordPaymentTab` via `navigator.onLine`) | grep of `checkNetworkReachability` |
| "Connectivity banner and write guards agree on what online means (useNetworkStatus verifies reachability)" | **Not yet** — see R2 | `useNetworkStatus.js`: `verifyReachability` is defined but nothing calls it; `ConnectivityBanner` only reads browser online/offline events |
| "Update behavior configured… form-safe" (round 1, 10.2: "use a global activity flag or soft update banner") | **Not yet** — see R3 | no `onNeedReload`, no busy flag, no banner anywhere in `src` |
| Shortcut handling for every role, `?action=` pruned | Not re-checked this round (the auditor read only Manager/Instructor code paths in round 1) | — |
| Mobile primary tabs chosen per role via `primaryTabIds` | **Partly** — Front Office, Manager, Instructor look right; Admin has a wrong id (R1); Kids dashboards and Marketing pass none | `AdminDashboard.jsx:342`, grep for `primaryTabIds` |
| Priority action buttons wired on Front Office home (Attendance Check-In, Register Student, Record Payment, Walk-in Inquiry) | **Different from the description** — the four buttons are Desk Cashier, Check-in Kiosk, Guest Inquiries, Applications; "Register Student" is not among them | `FrontOfficeDashboard.jsx:243-271` |
| Definition-of-done boxes for Track B checked | **Partly** — see R4; `PrimaryActionButton` is used only in Front Office | grep of `PrimaryActionButton` |

---

## 3. Findings

### R1 — Admin bottom navigation asks for a tab that does not exist  **[Verified]**

**What was found**
- `AdminDashboard.jsx:342` passes `primaryTabIds={["overview", "users", "classes", "approvals"]}`.
- Admin's real tab ids are: `overview, applications, students, classes, directory, invites, events, approvals, terminals, reports, misc`. There is no `users`.
- `MobileDashboardShell.jsx` filters `visibleTabs` by that list, so Admin phones get **3** primary tabs plus "More", with an empty slot's worth of space.
- `MobileDashboardShell.jsx` (lines ~41-56) also has a fallback heuristic that looks for ids `walkins` and `users`, neither of which exists in this repo (Front Office uses `inquiries`). That branch appears to be dead code, and the Kids dashboards and Marketing (which pass no `primaryTabIds`) fall through to the "first four tabs" rule.

**Options** (agent may combine or replace)
- Replace `users` with a real id. **Kifry confirmed (section 7, Q1):** the Admin phone set is `overview, applications, students, approvals`. The other tabs (`classes, directory, invites, events, terminals, reports, misc`) stay in "More". The agent may still argue for a different set if the code shows a reason (for example a badge that would be hidden).
- Add a small unit test (Vitest) that, for each dashboard, checks every id in `primaryTabIds` exists in that dashboard's tab list. A `console.warn` in development inside `MobileDashboardShell` would also catch it. Either prevents this class of mistake from returning.
- Remove the dead heuristic and pass explicit `primaryTabIds` from every dashboard that uses the shell (Kids Front Office, Kids Instructor, Kids Manager, Marketing). Please read each tab array first and propose four per role.

**Done when:** at 360 px width, every role that has more than four tabs shows exactly four primary tabs plus "More"; the test from above passes. Kids dashboards and Marketing still need a per-role proposal from the agent (Kifry has only answered for Admin).

---

### R2 — The banner and the write guards still disagree, and the probe checks a neighbouring route  **[Verified]**

**What was found**
- `ConnectivityBanner.jsx` shows "Offline Mode" only when `isOnline` is false. `useNetworkStatus.js` sets that from the browser's `online` / `offline` events only. `verifyReachability` is returned by the hook but no component calls it. So in a packed office where Wi-Fi stays attached but stalls, the banner stays quiet (the case Kifry described in round 1, question 1).
- `checkNetworkReachability` fetches `/ping.txt` from Firebase Hosting (content `ok\n`). That proves the phone can reach **Hosting**. Round 1's own test #2 blocks `firestore.googleapis.com` while the device reports online; in that situation the Hosting probe still succeeds and the Firestore write can still queue locally. **[Known behavior, not tested here]** Please run the test to confirm.
- The probe timeout is 2.5 s with one fallback probe. On a crowded network a healthy connection can take longer than that, which may block a legitimate payment with a "connection unstable" message. **[Opinion]** worth testing under Slow 3G.
- After the probe passes, the write itself has no time limit (Firestore promises can stay pending while offline). **[Known behavior, not tested here]**

**Options** (agent may combine or replace)
- **A. Probe Firestore itself.** A tiny `getDocFromServer` on a dedicated document (for example `system/ping`) that any signed-in user may read. Costs one read per guarded action (please check the current free-tier read quota before choosing). Requires a `firestore.rules` change, so both the agent and Kifry should look at that rule.
- **B. Confirm after writing.** After each critical write, wait for the server to acknowledge it (`waitForPendingWrites(db)` raced against a timeout, for example 8 s). Show "Saved ✓" once confirmed, and "Still sending — please wait, do not tap again" while pending, keeping the button disabled. This answers the real question ("did it go through?") instead of predicting. **[Known behavior — please confirm against the Firebase docs for the SDK version in `package.json`]**
- **C. A + B together.** The auditor's slight preference **[Opinion]**, because B covers the moment after the probe and A covers the moment before it.
- **Banner:** run the probe periodically while the tab is visible (for example every 30 s, and on `visibilitychange`), with hysteresis (two failures in a row to show the warning, one success to clear it) so one slow request does not flip the banner. Two wordings are helpful: "Offline" (no network) versus "Connection unstable" (attached but slow). The current text says payments are paused, so the wording should match what the guard actually does.
- **Probe timeout:** consider one automatic retry with a longer timeout (for example 6 s) before showing the message, and show "Checking connection…" while it runs.
- Optional: compare the response body of `/ping.txt` to `ok` so an unexpected page cannot pass as success.

**How to verify (free, Chromium DevTools):** for each entry in the round 1 table 10.5, run (1) Network → Offline, (2) request blocking for `firestore.googleapis.com` while online, (3) Slow 3G, (4) switch from Wi-Fi to mobile data in the middle of an action if a phone is available. Record what the user sees, and whether anything is sent after reconnecting.

**Done when:** the PR has a short results table, the banner reacts in case (2) and (3), and no critical action can leave the user unsure whether it went through.

---

### R3 — A new release reloads the page immediately, even mid-form  **[Verified in package source; behavior in the app not yet observed]**

**What was found**
- In `vite-plugin-pwa@1.3.0`, `dist/client/build/register.js`, `autoUpdate` mode listens for the service worker's `activated` event and, when it is an update, calls `onNeedReload()` if one was passed, otherwise `window.location.reload()`.
- `src/main.jsx` passes no `onNeedReload`. So the reload happens as soon as the new version activates: in the middle of a registration form, a payment, or a kiosk scan. Round 1, section 10.2 proposed a guard, but none exists in `src` (grep for `onNeedReload`, "busy", "update available" finds nothing).
- Combined with the new hourly check, a tablet could reload at a random moment during the day.
- **[Known behavior, not tested here]** In `autoUpdate` mode the generated worker normally calls `skipWaiting` and `clientsClaim`, so the new worker takes over at once. Delaying only the reload would then leave the old page running against a worker that only holds the new files, which is the stale-chunk situation from round 1 F4. Please check the generated `dist/sw.js` after a build to confirm.
- The round 1 `vite:preloadError` handler also reloads immediately, so it can hit a half-typed form in the rare case a chunk fails to load.

**Options** (agent may combine or replace)
- **A. `registerType: "prompt"` plus "apply when idle".** The new worker waits; the old worker keeps serving the old cached files. The app calls `updateServiceWorker(true)` only when it is idle (no dirty form, no open modal or scan, no write pending), and shows a small toast such as "Update ready — refreshing when you finish" with a "Refresh now" button. A tiny shared "busy" registry (for example `markBusy()` / `markIdle()` used by forms, `PaymentModal`, the kiosk scanner) is enough. **[Opinion]** this is the safest way to make Kifry's stance ("automatic, but not while someone is in the middle of something") actually true.
- **B. Keep `autoUpdate` and pass `onNeedReload`** that waits for idle. Simpler, with the stale-chunk window described above.
- **C. Different rules per surface.** Kiosk routes (`/kiosk`, `/kiosk/staff`, `/kiosk/students`) apply updates after N minutes without a scan; staff dashboards use the toast. *Note after section 7, Q2:* Kifry's check-in devices are phones, not always-on tablets, so the "tablet stuck on old code for days" worry is smaller than round 1 assumed. This option is now lower priority. A or B still matter, because phones can be mid-form or mid-scan when a release lands.
- For the preload-error handler: consider using the same busy registry, or show a toast with "Refresh" when busy.

**How to verify:** round 1 task A3 (Version A → Version B), with a form half filled and a payment modal open; then a second run while idle. Also confirm the kiosk tablet picks up the update within a predictable window.

**Done when:** a half-typed form survives a release, an idle screen updates by itself, and the result of the test is written in the PR.

---

### R4 — Track B status is smaller than the checklist suggests  **[Verified]**

- `PrimaryActionButton` is used only in `FrontOfficeDashboard.jsx`. Round 1's own B3 order was Front Office → Instructor → Manager → Admin → Parent; the last four are still open.
- Front Office buttons are Desk Cashier, Check-in Kiosk, Guest Inquiries, Applications. Round 1 text lists Register Student and Record Payment.
- **Kifry's answer (section 7, Q3):** Register Student should be one of the big buttons. Current stance: Register Student and Desk Cashier (payments) are the two most prominent, with Register Student needing the quickest access. The agent decides the exact order and which of the remaining buttons makes room.
- Evidence for the agent: registering a student already exists as a small text link, `+ Add Walk-in` (`FrontOfficeDashboard.jsx` around line 236, calling `handleAddStudent`, which opens `UserForm`). It only needs promoting. On phones the bottom bar already carries Cashier, Inquiries and Applications (`primaryTabIds`), so the big buttons partly repeat the bottom bar there. That is a reason to put the buttons that are *not* tabs (Register Student, Check-in Kiosk) where they cannot be missed. The Applications count badge (`pendingApplications`) should stay visible somewhere, either on the button or on the tab.
- Kifry noted that the order difference is tiny in practice. It is a design nicety, not a blocker.
- Repo-wide small-text counts are essentially unchanged (`text-[10px]` 491, `text-[11px]` 319, `text-[9px]` 59), which is expected because only the shells were touched. Recording this as the baseline is enough.
- Whether cards are "used for meaningful groups rather than every piece of content" was not checked by the auditor; the box may have been ticked early.

**Suggested:** untick the boxes that are only partly done and use the remaining B3 roles as the next design PRs (section 5).

---

## 4. Design ideas for a friendlier app

All are **[Opinion]** unless tagged. They are small, use existing components, and touch appearance only. Any can be swapped for something better.

| # | Idea | Why | Where |
|---|---|---|---|
| D1 | **Show a combined badge on "More".** Sum the `tab.badge` values of tabs that live inside More. | **[Verified]** badges render only on primary tabs and inside the sheet, so a pending approval on a tab in More is invisible until someone opens the sheet. | `MobileDashboardShell.jsx` More button |
| D2 | **Bigger bottom-bar icons** (16 px → about 22 px), badge text 9 px → 10–11 px. Keep 11 px labels. | Icons at `w-4 h-4` are small for thumb use; labels were already improved in round 1. | `MobileDashboardShell.jsx` nav |
| D3 | **Make the More sheet friendlier:** group tools by `getTabCategory` (function already exists), a 44 px close button (currently 12 px text "✕ Close"), `role="dialog"` + `aria-modal`, close on Escape, focus moves into the sheet. | Ten or more equal tiles are hard to scan; the small close target and missing dialog semantics hurt phones and keyboards alike. | `MobileDashboardShell.jsx` |
| D4 | **One shared "Needs attention" strip on each role home**, fed by counts the tabs already expose (`tab.badge`) plus data each dashboard already loads. | Answers "what should I do first?" within seconds. Only show items backed by real data; list gaps for Kifry instead of inventing numbers. | new small shared component; used in the remaining B3 roles |
| D5 | **Fewer Install buttons.** Currently `<InstallButton>` renders in `LoginPage.jsx`, twice in `App.jsx` and in `ProfilePanel.jsx`. Suggested: login screen, profile, and one dismissible hint after first sign-in on a phone that has not installed (remember the dismissal). Keep the iOS "Add to Home Screen" guide. | Repeated prompts feel noisy; one clear moment converts better. Please check how many are visible on a phone at once before deciding. | `src/features/pwa/`, `App.jsx` |
| D6 | **Screen wake lock: not planned.** *Kifry (section 7, Q2):* the check-in devices are phones, and keeping the screen on would leave them on charge all day. | Battery and comfort matter more than screen sleep. If the agent sees a narrow version worth proposing (for example only while the scanner camera view is open, released after a short idle time), it can raise it as a separate small proposal. | none for now |
| D7 | **Manifest polish:** add `id`, `scope`, `lang`, `categories`, and one narrow + one wide `screenshots` entry; add `apple-mobile-web-app-title` in `index.html`. | Screenshots enable the richer install dialog on Android and desktop Chrome. **[Known behavior, not tested here]** `id: "/"` matches the current `start_url`, so existing installs should be unaffected; please confirm, since browsers treat a changed `id` as a different app. | `vite.config.js`, `index.html` |
| D8 | **Long cache for hashed files** (`/assets/**` with `max-age=31536000, immutable`) in `firebase.json`. | Low priority: the service worker already precaches, but first visits and non-installed users benefit. `sw.js` keeps its no-cache header. | `firebase.json` |

---

## 5. Suggested order (agent may reorder or split differently)

1. **PR 1 — small fixes:** R1 (Admin tab ids + test + dead code), D7 (manifest), D8 (headers). Low risk, quick.
2. **PR 2 — connectivity:** R2 (banner, Firestore-aware check and/or confirm-after-write, table of results).
3. **PR 3 — update lifecycle:** R3 (choose A/B/C, busy registry, test).
4. **PR 4 — shell polish:** D1, D2, D3 (appearance only).
5. **PR 5+ — role homes, one role per PR:** Instructor → Manager → Admin → Parent, each with a data audit first, using `PrimaryActionButton` and D4.
6. **PR — install prompts:** D5 (D6 dropped, see section 4). Register Student promotion (R4) fits naturally in the Front Office role-home PR.

After each PR, please re-run the existing Vitest and Playwright suites and add a test where the item is testable (R1 id test; R2 blocked-Firestore case; R3 update case if it can be automated reliably).

---

## 6. Ideas the auditor leans against (open to counter)

| Idea | Current stance and reason |
|---|---|
| Letting payments or attendance queue offline and send later | Risk of duplicates, stale prices and changed student status; Kifry has not asked for offline working. Revisit only with a design and Kifry's approval. |
| Runtime-caching Firestore or API responses in the service worker | An old response could look current; Firestore's own local cache already covers reads. |
| Trimming the precache | About 0.75 MB compressed; the saving is small next to the benefit of every screen being available on weak Wi-Fi. |
| A custom service-worker framework | Simpler configuration is easier for any future agent to maintain. |
| Mixing design changes with data, rules or role-model changes in one PR | Harder to review and undo. The one rules change in R2 option A is best reviewed on its own. |

---

## 7. Kifry's answers (2026-09-28, with what each means)

1. **Admin phone tabs.** *Kifry:* the suggested set is solid. *Meaning:* `overview, applications, students, approvals` (R1).
2. **Kiosk devices.** *Kifry:* would not keep screens on all day, because the phone would sit docked on charging. *Meaning:* check-in devices are phones, not always-on tablets. Wake lock (D6) is dropped; R3 option C is lower priority; the 60-minute update check from round 1 can stay (browsers slow timers in background tabs anyway, so battery impact should be small, though the agent may verify).
3. **Front Office big buttons.** *Kifry:* yes to adding Register Student; wants payments to stay prominent, with Register Student getting the quickest access; noted the difference is tiny. *Meaning:* see R4 for the current stance and the evidence. The auditor's reading of this answer could be off, so the agent is welcome to confirm the intended order with Kifry.

---

## 8. What the auditor did and did not check

**Checked:** `src/main.jsx`, `vite.config.js`, `firebase.json`, `index.html`, `public/` contents, `src/utils/networkReachability.js`, `useNetworkStatus.js`, `ConnectivityBanner.jsx`, `usePwaInstall.js`, `MobileDashboardShell.jsx`, `tabUtils.js`, `PrimaryActionButton.jsx`, tab ids and `primaryTabIds` in the Admin, Manager, Instructor and Front Office dashboards, usage counts (`checkNetworkReachability`, `PrimaryActionButton`, text sizes), and the `vite-plugin-pwa@1.3.0` client source.

**Not checked:** running the app or tests, the production build, any phone or tablet, iOS, `firestore.rules`, the Kids dashboards' and Marketing's tab arrays, `DashboardShell.jsx` desktop details, the `?action=` behavior after round 1, and current Firebase / Workbox documentation (items tagged **[Known behavior, not tested here]** rest on that).

---

## 9. Agent response (to be filled in by the executing agent)

_For each of R1–R4 and D1–D8: agree, disagree, or counter-propose, with the evidence you found. Add anything the auditor missed._
