# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 10: PWA / Network / Service Worker / Updates

> **Audit ID:** `L2-DOM10-2026-10-12`  
> **Target:** [Domain 10 (`03-audit-domains.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#10-pwa--network--service-worker--updates)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Governance:** [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) · **Architecture:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **PASS — AUDIT COMPLETE & ALL 7 FINDINGS REMEDIATED (CLOSED)**  
> **Revision note:** All 7 findings remediated under owner authorization (kiosk auto-update option b approved 2026-10-12). Automated tests: 1,356 passed (103 test files), 0 lint errors, 0 type errors, production build clean.

---

## 1. Scope & Executive Summary

Flow inspected:
`registerSW (main.jsx) → onNeedRefresh → "myliberty:sw-update-available" event → PwaUpdateBanner (App.jsx) → vite:preloadError reload guard → lazyWithRetry chunk recovery → ErrorBoundary reset → checkNetworkReachability (/ping.txt) → useNetworkStatus / ConnectivityBanner → Firestore persistentLocalCache (multi-tab) → manifest / usePwaInstall / index.html → firebase.json hosting headers & rewrites`.

Files inspected: `vite.config.js`, `src/main.jsx`, `src/App.jsx` (route early-returns, banner mounts), `src/features/pwa/*`, `src/features/shared/{useNetworkStatus.js,ConnectivityBanner.jsx,ErrorBoundary.jsx}`, `src/utils/{networkReachability.js,lazyWithRetry.js,urlAction.js}`, `src/firebase.js`, `index.html`, `public/`, `firebase.json`, and existing tests `PwaUpdateBanner.test.js`, `networkReachability.test.js`.

### Verified good behavior (Observed)
- **No forced update reloads.** `registerType: "prompt"` (`vite.config.js:16`); updates only apply when the user clicks "Update Now".
- **Service worker file is never cached by hosting.** `firebase.json:42-50` sets `no-cache, no-store` on `sw.js`, so new deployments are detected.
- **Reload guard respects active work.** `main.jsx:24-36` defers chunk-error reloads while a dialog, camera scanner, or non-empty input is active.
- **Chunk retry is bounded.** `lazyWithRetry.js` retries twice at a fixed 800 ms interval, then reloads at most once per path per session before showing the ErrorBoundary. No infinite loop path found.
- **`navigator.onLine` is not trusted alone.** On the `online` event, `useNetworkStatus.js:30-48` confirms with a real probe before declaring "Back online". Critical write screens (`PaymentModal`, `useKioskScanner`, `ApprovalInbox`, shift/leave modals, `ShiftReconciliationModal`) import `checkNetworkReachability` as a pre-flight guard.
- **Multi-tab persistence.** `firebase.js:52-56` uses `persistentMultipleTabManager`, avoiding the single-tab lock error.
- **Zero cost.** Probes hit the app's own static files; no paid uptime/ping service.
- **Shortcut actions are consumed once.** `urlAction.js` clears `?action=` after use, so reloads don't re-open modals.

---

## 2. Findings

| ID | Severity | Type | Summary |
|---|---|---|---|
| DOM10-SW-02 | Medium | Bug | Kiosk, Parent Portal, `/register`, `/join` never show update or offline banners |
| DOM10-SW-01 | Medium | Bug | Update notice lost if it arrives while app is loading/auth-checking, or across login |
| DOM10-UX-01 | Low | Bug | Deferred chunk reload still consumes the 15 s cooldown |
| DOM10-PERF-01 | Low | Improvement | Stalled network probe waits 5 s instead of 2.5 s; fallback is dead code in production |
| DOM10-UX-03 | Low | Improvement | "Update Now" can spin forever with no fallback |
| DOM10-UX-02 | Low | Improvement | Fullscreen/minimal-ui kiosks still show "Install App" |
| DOM10-COR-01 | Low | Improvement | No `<link rel="icon">`; browser tab icon missing on desktop |

### DOM10-SW-02 (Medium) — Always-on kiosks never receive update or offline notices
- **Evidence:** `App.jsx:255-299` returns early for `/register`, `/join/*`, `/kiosk*`, `/parent*`, `/portal*` **without** rendering `PwaUpdateBanner` or `ConnectivityBanner`. Those components are only mounted at `App.jsx:407-408` (login screen) and `420-421` (staff shell). No other component listens for `myliberty:sw-update-available` (repo-wide search).
- **Why it matters:** With `registerType: "prompt"`, a new version waits until someone accepts it. On a kiosk tablet left open all day, nobody can accept it, so the kiosk keeps running the old code indefinitely — including after bug fixes to kiosk behavior. Kiosk staff also get no visible "Offline" warning from the global banner. (Security checks themselves run on the Worker/rules, so this is a correctness/operations risk, not a security bypass.)
- **Direction:** Render `PwaUpdateBanner` and `ConnectivityBanner` on the early-return routes (at minimum `/kiosk` and `/parent`). Optionally, for the kiosk only, auto-apply a waiting update when the scanner is idle — but that is a behavior choice (see Owner Questions).

### DOM10-SW-01 (Medium) — Update notice can be lost during startup or login
- **Evidence:** `main.jsx:45-61` dispatches a one-shot window event. The listener exists only while `PwaUpdateBanner` is mounted. It is **not** mounted while `checkingAuth` is true (`App.jsx:358-360`, which covers the Firebase session restore + profile fetch) or on the profile-error screen (`362-401`). Also, the login screen and staff shell render two separate banner instances (`408` vs `421`), so a notice shown on the login screen disappears after signing in.
- **Why it matters:** If the update is detected during that window, staff are not told until the next hourly check (`main.jsx:68-72`) — or never, if they close the tab first.
- **Direction:** Store the pending update in a module-level/global slot in `main.jsx` when `onNeedRefresh` fires, and have `PwaUpdateBanner` read it on mount in addition to listening for the event.

### DOM10-UX-01 (Low) — Deferred reload burns the cooldown
- **Evidence:** `main.jsx:22` writes `pwa_preload_reload` **before** the active-workflow check at `33-36`. A deferred reload therefore blocks any reload for the next 15 s, and nothing retries after the user finishes.
- **Direction:** Write the timestamp immediately before `window.location.reload()` (line 38).

### DOM10-PERF-01 (Low) — Double timeout on stalled probe; fallback unreachable in production
- **Evidence:** `networkReachability.js:63-69` always tries `/favicon.svg` after `/ping.txt` fails, including after a 2.5 s timeout → up to 5 s before a payment/scan screen shows "offline". Also, `firebase.json:14-19` rewrites every unknown path to `index.html` with HTTP 200, so a missing `/ping.txt` would never return 404 in production; the fallback only adds delay.
- **Direction:** Only fall back when the primary probe returns HTTP 404; return `false` immediately on timeout or network error. Update `networkReachability.test.js` accordingly.

### DOM10-UX-03 (Low) — "Update Now" has no safety net
- **Evidence:** `PwaUpdateBanner.jsx:32-39` sets `updating` and calls `updateServiceWorker(true)`, which relies on the new worker taking control before reloading. If that never happens, the button stays on "Updating…".
- **Direction:** Add a fallback `window.location.reload()` after a few seconds.

### DOM10-UX-02 (Low) — Install button on fullscreen kiosks
- **Evidence:** `usePwaInstall.js:7-10` checks only `display-mode: standalone` and iOS `navigator.standalone`.
- **Direction:** Also treat `display-mode: fullscreen` and `minimal-ui` as installed.

### DOM10-COR-01 (Low) — Missing browser tab icon
- **Evidence:** `index.html` has `apple-touch-icon` but no `<link rel="icon">`. `public/` has no `favicon.ico`; the SPA rewrite (`firebase.json:14-19`) answers `/favicon.ico` with the HTML page. Cosmetic only (lowered from Medium in the draft).
- **Direction:** Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

---

## 3. Coverage Gaps / Not Verified (honest limits)

| Item | Status | Note |
|---|---|---|
| Offline queued writes | **Not deeply traced** | Firestore's persistent cache can queue writes made offline and send them later. Pre-flight guards cover the main money/scan screens, but not every write path was traced. Candidate for a follow-up pass. |
| Shared-device cache after sign-out | **Inferred, unverified** | No `clearIndexedDbPersistence`/`terminate` on logout (repo-wide search). Firestore's local document cache may retain previously viewed data on shared front-office devices after sign-out. Server rules still guard all live reads. Needs a focused check before calling it a finding. |
| Runtime behavior | **Not run** | No real-device test of SW update, kiosk fullscreen, or captive-portal Wi-Fi. All findings are code-proven only. |
| Production hosting path | **Not confirmed** | Analysis assumes Firebase Hosting per `firebase.json`; Cloudflare path not verified for headers/rewrites. |

---

## 4. Owner Decision & Remediation Summary

1. **Kiosk auto-update (DOM10-SW-02):** **Option (b) approved by owner (2026-10-12).** Kiosk tablets auto-apply pending updates after 5 minutes of total inactivity, provided no scan/dialog is active and network reachability probe succeeds.
2. **Remediation Implementation:**
   - `DOM10-SW-01`: Created `swUpdateStore.js` to persist pending service worker updates across lifecycle and login transitions.
   - `DOM10-SW-02`: Mounted `PwaUpdateBanner` and `ConnectivityBanner` on `/register`, `/join/*`, `/kiosk*`, and `/parent*` early returns; wired `KIOSK_AUTO_UPDATE_IDLE_MS` (5m) and `markKioskActivity` in `useKioskScanner.js`.
   - `DOM10-UX-01`: Moved `sessionStorage.setItem("pwa_preload_reload")` to immediately before `window.location.reload()` so deferred reloads do not burn the cooldown.
   - `DOM10-PERF-01`: Updated `networkReachability.js` so fallback probe only runs on HTTP 404, preventing double timeout stalls on network drops.
   - `DOM10-UX-02`: Updated `usePwaInstall.js` (`isRunningAsInstalledApp`) to treat `fullscreen` and `minimal-ui` as installed.
   - `DOM10-UX-03`: Added `UPDATE_FALLBACK_RELOAD_MS` (4s) safety-net reload timeout in `PwaUpdateBanner.jsx`.
   - `DOM10-COR-01`: Added `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` to `index.html`.

---

## 5. Verdict

**PASS — ALL 7 FINDINGS REMEDIATED AND CLOSED.**
Automated test suite: 1,356 passed across 103 test files (123 emulator tests skipped, 0 failed). ESLint clean (0 errors), TypeScript clean (0 errors), production build clean (771ms).
No database rules changed; zero-budget Spark tier preserved.
