/**
 * Tiny in-memory record of kiosk activity, used to decide when it is safe
 * to apply a waiting app update on an unattended kiosk (DOM10-SW-02).
 *
 * - `lastActivityAt`: last time anything happened at the kiosk (scanner opened
 *   or closed, badge scanned, status shown, class choice started/finished).
 * - `busy`: true while a person is mid-flow (e.g. choosing a class after
 *   scanning). The kiosk must never reload while busy.
 *
 * No Firestore reads/writes; purely local.
 */

let lastActivityAt = Date.now();
let busy = false;

/** @param {{ busy?: boolean }} [options] */
export function markKioskActivity({ busy: nextBusy } = {}) {
  lastActivityAt = Date.now();
  if (typeof nextBusy === "boolean") busy = nextBusy;
}

export function getKioskActivity() {
  return { lastActivityAt, busy };
}
