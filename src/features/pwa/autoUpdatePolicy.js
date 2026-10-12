/** Kiosk applies a waiting update only after this much inactivity (owner-approved 2026-10-12). */
export const KIOSK_AUTO_UPDATE_IDLE_MS = 5 * 60 * 1000;

/** If the new service worker never takes control, reload anyway after this delay (DOM10-UX-03). */
export const UPDATE_FALLBACK_RELOAD_MS = 4000;

/**
 * Pure decision: may an unattended kiosk apply a waiting update right now?
 * Network reachability is checked separately (async) by the caller.
 *
 * @param {object} p
 * @param {number} p.now
 * @param {number} p.lastActivityAt
 * @param {boolean} p.busy           A person is mid-flow at the kiosk.
 * @param {boolean} p.hasOpenDialog  Any [role="dialog"] is open.
 * @param {number} [p.idleMs]
 * @returns {boolean}
 */
export function shouldAutoApplyUpdate({
  now,
  lastActivityAt,
  busy,
  hasOpenDialog,
  idleMs = KIOSK_AUTO_UPDATE_IDLE_MS,
}) {
  if (busy || hasOpenDialog) return false;
  if (!Number.isFinite(lastActivityAt)) return false;
  return now - lastActivityAt >= idleMs;
}
