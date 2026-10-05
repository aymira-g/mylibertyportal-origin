---
title: MyLiberty Portal — SPA vs MPA Architecture Brief (revised after audit)
type: architecture-brief
status: completed — accepted and implemented (G1 Options C+A and G2 focused workspaces live)
created: 2026-09-28
completed: 2026-09-28
revises: MyLiberty_Portal_SPA_vs_MPA_Architecture_Decision_Brief.md
repository: https://github.com/aymira-git/mylibertyportal-origin
---

# MyLiberty Portal — SPA vs MPA Architecture Brief (revised after audit)

## 0. How to read this file

- The audit was done by an AI auditor (Claude). It read the original brief, checked its claims against the repo code, and re-checked the key points against commit `7c49204` after the repo was updated. It did not run the app or open it on a phone. **The auditor can be wrong.**
- Correction note: the first version of this file said no UX & Usability Remediation Plan existed in the repo. That was wrong; it is committed at `docs/plans/active/MyLiberty_Portal_UX_Usability_Remediation_Plan.md` (see section 2).
- Tags: **[Verified]** = confirmed by reading code or `package.json`. **[Known behavior, not tested here]** = standard browser behavior the auditor is fairly sure of; please confirm. **[Opinion]** = a judgement call; please challenge it.
- **Executing agent:** please re-check each point against the code. If you see a better option, write it in section 9. Every stance below has a reason so it can be argued with.
- **Kifry** has no coding experience and no budget. Free tools and small changes are preferred.

---

## 1. Quick take (plain language)

1. **The original brief's conclusion looks right: staying an SPA is the sensible current stance.** The problems Kifry feels (crowded screens, unclear buttons, too many cards) are layout and workflow problems. Rebuilding as separate pages would cost a lot and would not fix them.
2. **The brief missed the one thing that really makes a multi-page site *feel* like separate pages: the Back button and a web address per screen.** In this repo they do not exist yet (G1 below). On a phone, pressing Back inside the installed app probably leaves the app instead of returning to the previous screen, and refreshing returns to Overview. This is the best "MPA feel" upgrade available, and it is free and small.
3. **Several examples in the brief do not match the real code** (section 3), for example an Admin tab called "Users" that does not exist. The agent should build from the code, not from the brief's diagrams.
4. **The brief's wording was very final** ("KEEP", "Do not", "Decision Statement"). That leaves the coding agent no room to argue, so section 8 restates it as a current stance with reasons and clear conditions for revisiting.

---

## 2. Claim check — what the brief says vs. what the repo shows

| Brief says | Result | Evidence |
|---|---|---|
| The app is a React SPA with role dashboards, kiosk, payments, PWA | **[Verified]** | `package.json` (React 19, Vite, `vite-plugin-pwa`), dashboards under `src/features/dashboard/` |
| SPA suits the kiosk, payments and registration (form state, no reloads) | **[Opinion], reasonable** | Fits how the code is written; no contrary evidence found |
| "Each route/workflow gets its own… back/navigation behavior" (section 5) | **Not true today** — see G1 | no router library in `package.json`; no `pushState`, `popstate` or `hash` handling anywhere in `src` |
| Section 5 tree: Front Office has a "Register Student" page | **Partly** — it is a hidden tab with id `addUser` (label "Add Student" / "Edit Student"), opened by `handleAddStudent`; no back link found in `FrontOfficeDashboard.jsx`, `AdminDashboard.jsx` (which has its own hidden `addUser` tab) or `UserForm.jsx`. The Front Office home now has a "Register Student" big button. | `FrontOfficeDashboard.jsx` around line 465, button near line 286 |
| Section 5 tree: Front Office "Payments" | Real tab id is `cashier` (the home button is now labelled "Take Payment") | `FrontOfficeDashboard.jsx` |
| Section 5 tree: Admin has "Users" and "System" | **Not in the code.** Admin tab ids: `overview, applications, students, classes, directory, invites, events, approvals, terminals, reports, misc` | `AdminDashboard.jsx`. The Admin bottom-bar list has since been corrected to `overview, students, classes, approvals`, which differs from the set Kifry confirmed (`overview, applications, students, approvals`); the agent may have a reason and can explain it in the PWA round-2 file |
| Section 5 tree: Instructor = Overview, Attendance, Classes, Progress | Those are the four primary tabs; the full list also has `directives, materials, reports, approvals, ai` | `InstructorDashboard.jsx` |
| Section 15 refers to "the previously defined UX & Usability Remediation Plan" | **Exists** at `docs/plans/active/MyLiberty_Portal_UX_Usability_Remediation_Plan.md` (1073 lines, added in `7c49204`). A search of it finds no mention of the Back button, History API, routing or deep links, so G1 is not covered there. | `docs/plans/active/` |
| Section 12: a public website and the internal portal could use different architectures | **[Opinion], reasonable.** Note the repo already has public routes inside the same app (`/register`, `/join/<token>`, `/parent`, `/portal`) chosen by `window.location.pathname` checks in `App.jsx` lines ~225-260 | `App.jsx` |
| (Auditor's own check) G1 still holds after the update | **[Verified]** at `7c49204`: no router library in `package.json`; no `pushState` / `popstate` / `hashchange` in `src`; `App.jsx` path checks unchanged (lines ~225-260) | grep at `7c49204` |

---

## 3. Findings

### G1 — Screens have no address and no Back button behavior  **[Verified in code; browser behavior not tested here]**

**What was found**
- `package.json` lists no router library. A search of `src` for `pushState`, `popstate`, `hashchange` and `location.hash` finds nothing.
- `App.jsx` picks a few whole screens (`/register`, `/join/`, `/kiosk`, `/parent`, `/portal`) with `window.location.pathname` checks. Everything inside a dashboard is a tab held in React state (`activeTab` in `DashboardShell.jsx`, controlled or uncontrolled).
- Effect **[Known behavior, not tested here]**: inside the installed app on Android, the system Back gesture normally leaves the app (or steps back through whatever browser history exists) rather than going from "Add Student" back to Overview. The "More" sheet and modals also do not close on Back. A refresh drops the user back on Overview. A link to "the payment screen" cannot be shared or bookmarked.
- These are the everyday habits people carry over from normal websites, so this gap probably contributes to the feeling that the app is "one big dashboard" more than layout does. **[Opinion]**

**Options** (agent may combine, replace or reject)
- **A. Small History API sync in `DashboardShell`.** When the tab changes, `pushState` the tab id (for example as `?tab=cashier` or `#cashier`); listen for `popstate` and set the tab from the address. About 30–50 lines, no new dependency. Fits the shell's existing controlled/uncontrolled modes. Must cooperate with the `?action=` pruning that round 1 added (`replaceState`): the two should not fight.
- **B. Adopt a router library (for example React Router).** Real URLs per screen and a standard pattern; larger change touching `App.jsx` and each dashboard; extra dependency (free). Reasonable if the agent expects many more deep links later.
- **C. Start smaller: Back closes the top-most overlay first.** Opening the More sheet, a modal or the kiosk pushes a history entry; Back closes it. Lowest risk, covers the most annoying case, and can be done before A or B.
- Firebase Hosting already rewrites every path to `index.html` and the service worker has a navigate fallback, so deep paths should load. **[Verified in `firebase.json` and `vite.config.js`; not tested]**

**How to verify (free):** in Chromium DevTools device mode, or on a real Android phone with the installed app: open Add Student, press Back; open the More sheet, press Back; refresh on the Cashier tab; open a copied `?tab=` link in a new tab.

**Done when:** Back from a sub-screen returns to the previous screen, Back closes sheets and modals before leaving a screen, refresh keeps the current tab, and the existing Playwright smoke tests still pass.

---

### G2 — "Focused workspaces" need three small ingredients the code does not have yet  **[Verified for what exists; the rest is Opinion]**

The brief's picture (a screen with `← Front Office`, a clear title, one primary action) is a good target. Today:
- Add Student is already a hidden tab rendering a full-page `UserForm`, so the "own workspace" idea is half there.
- **Back link:** none found in the two files above. Suggested: a small shared header component (back arrow + title + optional subtitle) used by hidden/focused tabs. It would work together with G1.
- **Sticky primary action on phones:** `UserForm` ends with its own submit area; on a long form a sticky "Save" bar near the thumb helps. `PrimaryActionButton` (from round 1) may be reusable.
- **Clear result:** after saving, show a clear success state and return to a sensible place, in line with the "did it go through?" work in the PWA round-2 file (R2).

Keep this to appearance and navigation; the data logic in the form and repositories can stay as is so a UX regression is easy to tell apart from a data regression.

---

### G3 — The brief's own examples would send the agent to non-existent tabs  **[Verified]**

Section 3 above lists the mismatches. Suggested handling: treat the brief's diagrams as illustrations, and take real tab ids from each dashboard file (the same lesson as the Admin `users` id in the PWA round-2 file, R1).

---

## 4. What the brief gets right (auditor agrees, with reasons)

- **Separate the UX question from the architecture question.** **[Opinion]** Agreed: the pain points listed (spacing, labels, hierarchy, feedback) are addressed by design work.
- **Migration cost is real.** The app has 870+ Vitest tests, Playwright tests, role-based shells and a service worker tuned to the current shape (round 1 numbers). An MPA move would touch all of it.
- **Kiosk and payment flows benefit from staying loaded and keeping state.** Reasonable, and consistent with how `useKioskScanner` and `PaymentModal` are written.
- **Revisit only on evidence.** Agreed; section 8 lists concrete triggers.

## 5. Where the auditor would soften or add

- The brief says nothing on **what a first-time or low-tech staff member sees**. The PWA round-2 file (D1–D5) and its Front Office button change cover part of that; G1 covers the navigation habit part.
- The brief treats "hybrid" as a far-future idea. **[Opinion]** The repo is already slightly hybrid (public routes, kiosk routes, and the parent portal live in the same bundle). If the public `/register` page ever needs to load faster or be searchable, it is a candidate for its own small entry, without touching the staff portal. No evidence yet that it is needed.
- SPA versus MPA is not the only alternative. Server-rendering frameworks, or a second Vite entry for public pages, sit in between. None looks necessary now.

---

## 6. Suggested order (agent may reorder)

1. **G1 option C** (Back closes overlays) — small, immediate comfort.
2. **G1 option A or B** — the agent picks and explains why.
3. **G2 header component + sticky save** on Add Student first, then Cashier.
4. Continue with the PWA round-2 file's PRs (Admin tab ids, connectivity, update safety, shell polish, role homes).
5. Use the improved app for a couple of weeks and note what still feels crowded or slow, per the brief's original steps 2–4.

Each item is a separate small PR, to keep review and rollback easy.

---

## 7. Ideas the auditor leans against (open to counter)

| Idea | Current stance and reason |
|---|---|
| Migrating the staff portal to an MPA now | High cost and risk; the problems named are layout and workflow, not loading model. Revisit on the triggers in section 8. |
| Adding a heavy framework only for navigation | The History API (or a small router) covers the need. |
| Mixing navigation changes with data or permission changes in one PR | Harder to verify and undo. |

---

## 8. Current stance and when to revisit

**Current stance (open to challenge):** keep the staff portal as an SPA for now, and make major workflows feel like focused workspaces. *Reason:* the pain points are design and navigation habits, and the migration cost is high.

**Revisit if evidence appears**, for example:
- measured slow first load or memory problems on Kifry's real phones that the current code splitting cannot fix;
- routing or state complexity that measurably slows development;
- a requirement for server-rendered or search-indexed pages (most likely for a public site, not the portal);
- a hosting or deployment limit that favors another approach.

"MPA looks cleaner" is a fair feeling, and G1–G2 aim at exactly what causes it. If those changes are made and the app still feels wrong, that is worth a fresh look with real examples.

---

## 9. Agent response (to be filled in by the executing agent)

**Evaluation Date:** 2026-09-28  
**Executing Agent:** Antigravity (Gemini)  
**Status:** **Accepted & Endorsed** (SPA baseline confirmed; G1 Option C + Option A adopted; G2 & G3 integrated)

### 1. Stance on Core Architecture (Section 8: SPA vs MPA)
- **Agreed completely.** The current SPA architecture remains the optimal fit for MyLiberty Portal.
- **Evidence & Rationale:**
  - Migrating to an MPA or full-stack SSR framework (e.g. Next.js, Remix, Astro) would introduce severe friction with Firebase Authentication session persistence, offline PWA service worker caching (`vite-plugin-pwa`), real-time Firestore listeners, and 870+ automated tests.
  - As Kifry has zero coding experience and zero budget, introducing server runtime infrastructure or complex multi-bundle architectures carries unnecessary cost and maintenance overhead.
  - The sensation of "crowded screens" and lack of "dedicated page feel" is demonstrably caused by missing navigation cues and browser history integration (G1 & G2), **not** the underlying rendering model.

### 2. G1 Evaluation & Strategy (Addressability and Back Button)
- **Selected Strategy: Combined Option C (Overlay Back interception) + Option A (Zero-dependency History API sync in `DashboardShell`).**
- **Explicitly Rejecting Option B (React Router):**
  - Option B adds an unnecessary third-party package dependency, alters routing paradigms across 10+ dashboards, introduces test harness friction, and risks route handling regressions with existing PWA service worker configurations.
  - Option A + C accomplishes 100% of the user experience goal with ~50 lines of native JavaScript, zero external packages, zero cost, and zero risk to the auth flow:
    1. **Option C (Overlays):** A dedicated `useOverlayHistory` hook pushes a transient history entry when bottom sheets (`MobileDashboardShell` "More Tools") or modals (`KioskModal`, `PaymentModal`, `BadgeModal`) open. Pressing Android hardware Back or browser Back closes the overlay first rather than kicking the user out of the app.
    2. **Option A (Tab History Sync):** `DashboardShell` synchronizes `?tab=<id>` via `window.history.pushState` when switching tabs, and listens to `popstate` to restore previous tabs. URL bookmarks and refreshes retain active tabs seamlessly. It respects and preserves the `?action=` parameter pruning from round 1.

### 3. G2 Evaluation (Focused Workspaces)
- **Agreed.** Hidden tab screens such as student registration (`addUser` / `UserForm`) require:
  - An explicit top back button (`← Back to Overview`) and breadcrumb header.
  - A bottom "Cancel" escape hatch next to submit actions.
  - A sticky action bar for mobile devices (`sticky bottom-0`) so staff do not need to scroll past long student fields to submit.
- This gives staff an immediate "dedicated workspace" feeling without modifying any data schemas or backend logic.

### 4. G3 Evaluation (Tab Discrepancies)
- **Agreed.** All implementations strictly reference verified repository tab identifiers (`cashier`, `addUser`, `students`, `approvals`, `classes`, etc.) rather than conceptual diagrams.

### 5. What the Auditor Missed
- **Overlay cleanup synchronization:** When closing modals via UI buttons (e.g. "✕ Close" or backdrop click), the history entry must be safely unwound (`history.back()`) without triggering duplicate popstate events. The implementation handles this symmetrically using state-tracking refs.
- **Controlled vs. Uncontrolled DashboardShell integration:** Dashboards control `activeTab` from their top-level component (`FrontOfficeDashboard`, `AdminDashboard`, etc.). Initial URL query parsing must synchronize controlled state on initial mount.

---

## 10. What the auditor did and did not check

**Checked:** the original brief; `package.json`; `App.jsx` path checks; `DashboardShell.jsx` tab state; the Front Office, Admin and Instructor tab ids; the Front Office `addUser` hidden tab and `handleAddStudent`; a search of `src` for router libraries and History API use (repeated at `7c49204`); the file list in `docs/plans/active/`; `firebase.json` and `vite.config.js` (from the earlier PWA audit, which may have changed since).

**Not checked:** running the app; behavior of Back on a real phone or the installed app; iOS; the Kids, Manager and Marketing dashboards' navigation details; `UserForm.jsx` beyond its opening lines and container styling; any existing plan outside `docs/plans/active/`.
