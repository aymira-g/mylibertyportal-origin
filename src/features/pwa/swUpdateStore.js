/**
 * Holds a pending service-worker update so it is never lost.
 *
 * DOM10-SW-01: a one-shot window event was dropped whenever the update arrived
 * while no PwaUpdateBanner was mounted (auth check, profile error screen, or
 * the login → dashboard remount). Storing the pending update here lets any
 * banner that mounts later pick it up.
 */

/** @type {null | (() => void)} */
let pendingUpdate = null;
/** @type {Set<(fn: () => void) => void>} */
const listeners = new Set();

/** @param {() => void} updateFn */
export function setPendingSwUpdate(updateFn) {
  pendingUpdate = updateFn;
  listeners.forEach((listener) => listener(updateFn));
}

export function getPendingSwUpdate() {
  return pendingUpdate;
}

/**
 * @param {(fn: () => void) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeSwUpdate(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — resets module state between tests. */
export function clearPendingSwUpdate() {
  pendingUpdate = null;
  listeners.clear();
}
