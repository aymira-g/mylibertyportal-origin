# MyLiberty Portal — Level 2 Deep Conformance Audit Report
## Domain 12: UX / Navigation / Mobile

> **Audit ID:** `L2-DOM12-2026-10-12`  
> **Target:** [Domain 12 (`03-audit-domains.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/03-audit-domains.md#12-ux--navigation--mobile)  
> **Methodology:** [5-Pass Workflow Trace (`02-audit-method.md`)](../Comprehensive%20Hidden-Bug%20Audit%20Strategy/02-audit-method.md)  
> **Governance:** [`MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md`](../../governance/MYLIBERTY-AUTHORITATIVE-BLUEPRINT.md) · **Architecture:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md) · [`AGENTS.md`](../../../AGENTS.md)  
> **Date Executed:** 2026-10-12  
> **Audit Status:** **PASS — AUDIT COMPLETE & ALL 5 FINDINGS REMEDIATED (CLOSED)**  

---

## 1. Scope & Executive Summary

Flows and components inspected:
1. **Core Navigation & Shells:**
   - [`DashboardShell.jsx`](file:///e:/myliberty-portal/src/features/shared/DashboardShell.jsx): URL query param synchronization (`?tab=<id>`), initial mount tab restoration, browser/hardware back-button popstate handling, category grouping.
   - [`MobileDashboardShell.jsx`](file:///e:/myliberty-portal/src/features/shared/MobileDashboardShell.jsx): Safe-area bottom navigation (`env(safe-area-inset-bottom)`), primary tab prioritization by role, "More Tools" bottom sheet overlay, touch target sizing.
   - [`useOverlayHistory.js`](file:///e:/myliberty-portal/src/features/shared/useOverlayHistory.js): History stack pushState/popstate management for modal sheets and drawers.
2. **Confirmation Prompts & Destructive Action Gates:**
   - [`ConfirmProvider.jsx`](file:///e:/myliberty-portal/src/features/shared/ConfirmProvider.jsx) & [`useConfirm.js`](file:///e:/myliberty-portal/src/features/shared/useConfirm.js): Universal replacement for window.confirm across deletions, enrolments, removals, and overrides.
3. **Operational Modal Overlays & Drawers:**
   - [`PaymentModal.jsx`](file:///e:/myliberty-portal/src/features/finance/PaymentModal.jsx), [`BadgeModal.jsx`](file:///e:/myliberty-portal/src/features/students/BadgeModal.jsx), [`KioskModal.jsx`](file:///e:/myliberty-portal/src/features/attendance/KioskModal.jsx), [`BatchModal.jsx`](file:///e:/myliberty-portal/src/features/classes/BatchModal.jsx), [`EnrollModal.jsx`](file:///e:/myliberty-portal/src/features/classes/EnrollModal.jsx), [`TransferModal.jsx`](file:///e:/myliberty-portal/src/features/classes/TransferModal.jsx), [`CorporateEventModal.jsx`](file:///e:/myliberty-portal/src/features/attendance/CorporateEventModal.jsx), [`ShiftAdjustmentModal.jsx`](file:///e:/myliberty-portal/src/features/attendance/ShiftAdjustmentModal.jsx), [`StaffLeaveModal.jsx`](file:///e:/myliberty-portal/src/features/attendance/StaffLeaveModal.jsx), [`WalkInModal.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInModal.jsx), [`PlacementTestModal.jsx`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/PlacementTestModal.jsx), [`ApplicationPlacementModal.jsx`](file:///e:/myliberty-portal/src/features/students/ApplicationPlacementModal.jsx), [`ApplicationRejectModal.jsx`](file:///e:/myliberty-portal/src/features/students/ApplicationRejectModal.jsx), [`AddSchoolModal.jsx`](file:///e:/myliberty-portal/src/features/dashboard/marketing/AddSchoolModal.jsx), [`IosInstallModal.jsx`](file:///e:/myliberty-portal/src/features/pwa/IosInstallModal.jsx).
4. **Mobile Ergonomics, Touch Targets, Inputs & Feedback:**
   - [`src/index.css`](file:///e:/myliberty-portal/src/index.css): iOS font-size >= 16px auto-zoom prevention, `touch-action: manipulation`, tap-highlight suppression, safe-area utilities.
   - [`KioskStatusOverlay.jsx`](file:///e:/myliberty-portal/src/features/attendance/KioskStatusOverlay.jsx) & [`useKioskScanner.js`](file:///e:/myliberty-portal/src/features/attendance/useKioskScanner.js): Multi-sensory feedback (audio chime, high-contrast visual badges, person identification).
   - Empty/loading states in [`StudentRosterTable.jsx`](file:///e:/myliberty-portal/src/features/students/StudentRosterTable.jsx), [`StudentRosterMobileList.jsx`](file:///e:/myliberty-portal/src/features/students/StudentRosterMobileList.jsx), [`CohortRosterTable.jsx`](file:///e:/myliberty-portal/src/features/classes/CohortRosterTable.jsx), [`CohortRosterMobileList.jsx`](file:///e:/myliberty-portal/src/features/classes/CohortRosterMobileList.jsx), and [`AvailableBatches.jsx`](file:///e:/myliberty-portal/src/features/classes/AvailableBatches.jsx).
   - Dialog messaging and alert rules in [`StudentPhotoCapture.jsx`](file:///e:/myliberty-portal/src/features/students/StudentPhotoCapture.jsx).

---

### Verified Good Behavior (Observed)

1. **Robust iOS Auto-Zoom Mitigation (`src/index.css:80-86`):**
   A dedicated media query forces `font-size: 16px !important` on mobile form inputs, selects, and textareas, preventing iOS Safari from automatically zooming the page on focus while preserving user pinch-to-zoom accessibility.
2. **Safe-Area Insets & Ergonomic Bottom Navigation:**
   [`MobileDashboardShell.jsx`](file:///e:/myliberty-portal/src/features/shared/MobileDashboardShell.jsx) employs `env(safe-area-inset-bottom)` and `min-h-14` (56px touch target height, well exceeding the 44px WCAG 2.1 standard) for all primary buttons.
3. **URL Synchronization & Deep Linking:**
   [`DashboardShell.jsx`](file:///e:/myliberty-portal/src/features/shared/DashboardShell.jsx) bidirectionally binds tab selection to the URL search parameter `?tab=<id>` using `pushState` and `popstate`, ensuring bookmarks and hardware back-button presses navigate seamlessly through tabs.
4. **Multi-Sensory Kiosk Feedback (`KioskStatusOverlay.jsx`):**
   Attendance scanning delivers simultaneous visual (high-contrast colored banners, icons, user names) and audible feedback (Web Audio tone), adhering to accessibility guidelines requiring status meaning to not depend on color alone.

---

## 2. Findings

| ID | Severity | Type | File(s) / Component | Summary |
|---|---|---|---|---|
| **DOM12-A11Y-01** | Medium | Accessibility / WCAG | [`ConfirmProvider.jsx:69-105`](file:///e:/myliberty-portal/src/features/shared/ConfirmProvider.jsx#L69) | Universal `ConfirmProvider` modal lacks keyboard Escape dismissal, backdrop click dismissal, and ARIA dialog semantics (`role="dialog"`, `aria-modal="true"`). |
| **DOM12-A11Y-02** | Medium | Accessibility / Navigation | [`useOverlayHistory.js:15-58`](file:///e:/myliberty-portal/src/features/shared/useOverlayHistory.js#L15) | `useOverlayHistory` docstring promises Escape dismissal, but the hook only listens to `popstate` and omits keydown Escape handling. |
| **DOM12-A11Y-03** | Medium | Mobile UX / Accessibility | Operational Modals ([`BatchModal`](file:///e:/myliberty-portal/src/features/classes/BatchModal.jsx#L484), [`EnrollModal`](file:///e:/myliberty-portal/src/features/classes/EnrollModal.jsx#L126), [`TransferModal`](file:///e:/myliberty-portal/src/features/classes/TransferModal.jsx#L203), [`CorporateEventModal`](file:///e:/myliberty-portal/src/features/attendance/CorporateEventModal.jsx#L17), [`ShiftAdjustmentModal`](file:///e:/myliberty-portal/src/features/attendance/ShiftAdjustmentModal.jsx#L116), [`StaffLeaveModal`](file:///e:/myliberty-portal/src/features/attendance/StaffLeaveModal.jsx#L90), [`WalkInModal`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInModal.jsx#L17), [`PlacementTestModal`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/PlacementTestModal.jsx#L265), [`ApplicationPlacementModal`](file:///e:/myliberty-portal/src/features/students/ApplicationPlacementModal.jsx#L125), [`ApplicationRejectModal`](file:///e:/myliberty-portal/src/features/students/ApplicationRejectModal.jsx#L28), [`AddSchoolModal`](file:///e:/myliberty-portal/src/features/dashboard/marketing/AddSchoolModal.jsx#L95)) | Operational modals do not wire `useOverlayHistory` (hardware Back navigates away instead of closing modal), omit backdrop click dismissal, and close buttons lack `aria-label="Close"`. |
| **DOM12-UX-01** | Low | Design Consistency / UX | [`StudentPhotoCapture.jsx:70, 93`](file:///e:/myliberty-portal/src/features/students/StudentPhotoCapture.jsx#L70) | Photo capture error handling uses native blocking `alert()` instead of standard non-blocking `useToast()`, violating project design rules. |
| **DOM12-UX-02** | Low | UX / Feedback | [`StudentRosterTable.jsx:147`](file:///e:/myliberty-portal/src/features/students/StudentRosterTable.jsx#L147), [`StudentRosterMobileList.jsx:48`](file:///e:/myliberty-portal/src/features/students/StudentRosterMobileList.jsx#L48), [`CohortRosterMobileList.jsx:23`](file:///e:/myliberty-portal/src/features/classes/CohortRosterMobileList.jsx#L23) | Missing empty-state representations: when 0 records match search/filter criteria, `StudentRosterTable` renders an empty table body, and mobile lists render blank whitespace without feedback. |

---

## 3. Deep Dive Analysis

### DOM12-A11Y-01 — Universal Confirmation Modal Lacks Escape Dismissal, Backdrop Dismiss, and ARIA Dialog Roles
- **Location:** [`src/features/shared/ConfirmProvider.jsx:69-105`](file:///e:/myliberty-portal/src/features/shared/ConfirmProvider.jsx#L69)
- **Vulnerability / Flaw:**
  The `ConfirmProvider` component wraps the entire application and is invoked for all destructive user confirmations (deleting classes, dropping students, force-closing shifts, approving major budget items). The rendered dialog:
  1. Has no `useEffect` attaching a `keydown` listener for `Escape` to resolve `false`.
  2. Outer backdrop `<div>` has no `onClick` handler to dismiss the prompt.
  3. Dialog wrapper lacks `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- **Impact:** Keyboard-only users are trapped into tabbing to the Cancel button or cannot dismiss destructive confirm prompts with standard `Escape`. Violates WCAG 2.1 Dialog standards.
- **Remediation:**
  1. Add a `useEffect` on `request` that listens for `keydown` with `key === "Escape"` and triggers `handleChoice(false)`.
  2. Add `onClick={(e) => { if (e.target === e.currentTarget) handleChoice(false); }}` to the fixed outer backdrop.
  3. Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="confirm-title"` attributes to the dialog card.

---

### DOM12-A11Y-02 — `useOverlayHistory` Fails to Provide Keyboard `Escape` Interception
- **Location:** [`src/features/shared/useOverlayHistory.js:15-58`](file:///e:/myliberty-portal/src/features/shared/useOverlayHistory.js#L15)
- **Vulnerability / Flaw:**
  The hook docstring explicitly states:
  > *"Symmetrically unwinds the pushed history state if the overlay is closed programmatically (e.g. tapping '✕ Close', clicking backdrop, or pressing Escape)."*
  However, the hook's implementation only registers an event listener for `popstate`. It does not register a `keydown` listener for `Escape`. As a result, components using this hook (`PaymentModal`, `BadgeModal`, `PaymentCashierTab` student picker, `MobileDashboardShell` bottom sheet) do not close when `Escape` is pressed.
- **Impact:** Overlays require custom, repetitive Escape key handlers (as seen in `KioskModal.jsx:21-29`), or leave the modal open when a desktop user presses Escape.
- **Remediation:**
  Add a `keydown` listener for `Escape` inside `useOverlayHistory.js` that calls `onCloseRef.current?.()`. The existing cleanup callback will automatically execute `window.history.back()` and cleanly unwind the history stack.

---

### DOM12-A11Y-03 — Major Operational Modals Lack Back-Button Trapping, Backdrop Dismissal, and Escape Handling
- **Location:**
  - [`BatchModal.jsx:484-506`](file:///e:/myliberty-portal/src/features/classes/BatchModal.jsx#L484)
  - [`EnrollModal.jsx:126-158`](file:///e:/myliberty-portal/src/features/classes/EnrollModal.jsx#L126)
  - [`TransferModal.jsx:203-234`](file:///e:/myliberty-portal/src/features/classes/TransferModal.jsx#L203)
  - [`CorporateEventModal.jsx:17-33`](file:///e:/myliberty-portal/src/features/attendance/CorporateEventModal.jsx#L17)
  - [`ShiftAdjustmentModal.jsx:116-138`](file:///e:/myliberty-portal/src/features/attendance/ShiftAdjustmentModal.jsx#L116)
  - [`StaffLeaveModal.jsx:90-111`](file:///e:/myliberty-portal/src/features/attendance/StaffLeaveModal.jsx#L90)
  - [`WalkInModal.jsx:17-32`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/WalkInModal.jsx#L17)
  - [`PlacementTestModal.jsx:265-272`](file:///e:/myliberty-portal/src/features/dashboard/frontoffice/PlacementTestModal.jsx#L265)
  - [`ApplicationPlacementModal.jsx:125-150`](file:///e:/myliberty-portal/src/features/students/ApplicationPlacementModal.jsx#L125)
  - [`ApplicationRejectModal.jsx:28-52`](file:///e:/myliberty-portal/src/features/students/ApplicationRejectModal.jsx#L28)
  - [`AddSchoolModal.jsx:95-110`](file:///e:/myliberty-portal/src/features/dashboard/marketing/AddSchoolModal.jsx#L95)
- **Vulnerability / Flaw:**
  None of these operational modal dialogs call `useOverlayHistory`. Furthermore, their fixed backdrops (`fixed inset-0 ...`) do not intercept outside clicks (`onClick` where `e.target === e.currentTarget`), and their close buttons (`<button><X ... /></button>`) do not declare `aria-label="Close"`.
- **Impact:**
  - On mobile/tablet devices, tapping the hardware or system Back button unloads the entire page or changes the dashboard tab instead of closing the modal.
  - On desktop, clicking the backdrop outside the dialog does nothing.
  - Screen readers announce the header close button as unlabelled.
- **Remediation:**
  1. Call `useOverlayHistory(isOpen, onClose, "<modalKey>")` in each modal.
  2. Add `onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}` to each fixed outer backdrop.
  3. Add `aria-label="Close"` to close buttons.

---

### DOM12-UX-01 — Native `alert()` Used in `StudentPhotoCapture` Violates Design System Rules
- **Location:** [`src/features/students/StudentPhotoCapture.jsx:70, 93`](file:///e:/myliberty-portal/src/features/students/StudentPhotoCapture.jsx#L70)
- **Vulnerability / Flaw:**
  When camera capture or Cloudinary upload fails, the component invokes:
  ```js
  alert("Failed to upload photo: " + (err.message || "Unknown error"));
  ```
  This violates the core project rule documented in [`AGENTS.md`](../../../AGENTS.md):
  > *"Use `useToast` / `useConfirm` rather than `alert()` / `confirm()`."*
- **Impact:** A native browser alert blocks thread execution, halts camera release logic, looks unstyled, and degrades mobile UX.
- **Remediation:** Import `useToast` from `../shared`, initialize `toast = useToast()`, and replace `alert(...)` with `toast(..., "error")`.

---

### DOM12-UX-02 — Missing Empty States in Student Roster and Cohort Mobile Lists
- **Location:**
  - [`src/features/students/StudentRosterTable.jsx:147-150`](file:///e:/myliberty-portal/src/features/students/StudentRosterTable.jsx#L147)
  - [`src/features/students/StudentRosterMobileList.jsx:48-50`](file:///e:/myliberty-portal/src/features/students/StudentRosterMobileList.jsx#L48)
  - [`src/features/classes/CohortRosterMobileList.jsx:23-25`](file:///e:/myliberty-portal/src/features/classes/CohortRosterMobileList.jsx#L23)
- **Vulnerability / Flaw:**
  When filtering returns 0 results:
  - `StudentRosterTable` renders `<tbody className="divide-y divide-slate-100 bg-white">` with 0 rows (table headers hover above an empty white box).
  - `StudentRosterMobileList` and `CohortRosterMobileList` render `<div className="space-y-3.5 md:hidden"></div>` (completely blank space between the search bar and pagination footer).
- **Impact:** Staff members cannot determine if data is still fetching, experiencing a network error, or if no students matched the search query.
- **Remediation:**
  1. In `StudentRosterTable.jsx`, render a single full-width row (`<td colSpan={7}>`) with a clean empty state icon and message ("No students found matching your filters") when `pageItems.length === 0`.
  2. In `StudentRosterMobileList.jsx` and `CohortRosterMobileList.jsx`, render a friendly empty state card with guidance when items are empty.

---

## 4. Remediation Plan

1. **`ConfirmProvider.jsx`:**
   - Add `Escape` key listener via `useEffect`.
   - Add backdrop click dismiss handler.
   - Add `role="dialog"` and `aria-modal="true"`.
2. **`useOverlayHistory.js`:**
   - Add `Escape` key listener on `window` while open, forwarding to `onCloseRef.current?.()`.
3. **Operational Modals:**
   - Connect `useOverlayHistory` and backdrop click dismissal across the operational modal suite.
   - Add `aria-label="Close"` to all modal header close buttons.
4. **`StudentPhotoCapture.jsx`:**
   - Replace native `alert` calls with `useToast` error notifications.
5. **Empty States:**
   - Add accessible empty state messages in `StudentRosterTable`, `StudentRosterMobileList`, and `CohortRosterMobileList`.
6. **Automated Verification:**
   - Add unit tests for `ConfirmProvider` and `useOverlayHistory` verifying Escape key dismissals and backdrop dismissals.
   - Execute full test suite, lint, typecheck, and build.
