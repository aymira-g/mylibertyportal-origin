# Formal Owner Decision: Unattended Kiosk Auto-Update Policy

> **Authority Level:** Binding Operational Policy (`docs/decisions/`)  
> **Status:** RATIFIED & ACTIVE  
> **Ratified by:** Owner / Director (Kifry)  
> **Date:** 2026-10-12  
> **Blueprint Alignment:** Authoritative Blueprint v3.4 §1, §6.8, §11 · Architecture: `docs/ARCHITECTURE.md` (PWA Lifecycle & Free Tier Invariants)

---

## 1. Context and Problem Statement

MyLiberty Portal operates across desktop workstations, mobile phones, and dedicated physical reception/kiosk tablets (`/kiosk`, `/kiosk/staff`, `/kiosk/students`).

Under the progressive web application (PWA) service worker configuration (`registerType: "prompt"` in `vite.config.js`), updates are non-blocking: when a new build is deployed, a notification banner prompts users to click "Update Now" rather than interrupting their active workflow.

On dedicated attendance kiosks left open unattended at front desks:
1. Tablets run continuously for 12+ hours without page reloads or user interaction between shifts.
2. If nobody clicks "Update Now", the tablet remains on stale cached code indefinitely, missing critical bug fixes or security patches.
3. Conversely, forcing an immediate, uncoordinated page reload risks interrupting a student badge scan, freezing a camera scanner stream, or causing reload loops on unstable branch Wi-Fi.

---

## 2. Binding Decisions Ratified by the Owner

The Owner formally adopted **Option (b)** for Unattended Kiosk Update Policy:

### Decision: Inactivity-Gated Automatic Updates for Dedicated Kiosks
1. **Inactivity Threshold:**
   - Standalone kiosk routes (`/kiosk*`) automatically apply waiting service worker updates after **5 minutes of total inactivity** (`KIOSK_AUTO_UPDATE_IDLE_MS = 5 * 60 * 1000`).
2. **Workflow Pre-Flight Safety Checks:**
   An update may **never** automatically apply if:
   - A badge or QR scan is actively mid-flow (`isScannerActive` or camera stream running).
   - Any modal or dialog is open (`document.querySelector('[role="dialog"]') !== null`).
   - A staff member or student has interacted with the screen within the last 5 minutes.
3. **Network Reachability Gate:**
   - Before triggering an auto-reload, the tablet must verify live network reachability via a lightweight static probe (`/ping.txt`). Auto-reload is aborted if the network is down or experiencing a captive portal.
4. **Hard Reload Safety Net (`UPDATE_FALLBACK_RELOAD_MS`):**
   - If the new service worker is invoked but fails to claim clients within 4 seconds, a fallback `window.location.reload()` executes to prevent an infinite "Updating…" spinner.
5. **Staff Shell & Portal Exemption:**
   - Normal staff dashboard routes and Parent Portal routes remain strictly manual/prompted (`registerType: "prompt"`). They never auto-reload unattended while logged-in staff may be typing sensitive notes or entering financial transactions.

---

## 3. Implementation Contracts

### 3.1 Policy Module (`src/features/pwa/autoUpdatePolicy.js`)
- Exports `KIOSK_AUTO_UPDATE_IDLE_MS = 5 * 60 * 1000`.
- Exports `UPDATE_FALLBACK_RELOAD_MS = 4000`.
- Exports pure evaluation function `shouldAutoApplyUpdate({ now, lastActivityAt, busy, hasOpenDialog, idleMs })`.

### 3.2 State Store & Component Mounts
- `src/features/pwa/swUpdateStore.js`: Captures pending service worker update callbacks across route changes and auth transitions.
- `src/features/pwa/PwaUpdateBanner.jsx`: Mounts with `autoApplyWhenIdleMs={KIOSK_AUTO_UPDATE_IDLE_MS}` on `/kiosk*` routes in `src/App.jsx`.
- `src/main.jsx`: Periodic hourly update check `registration.update()` checks for waiting service workers on always-on kiosks.
