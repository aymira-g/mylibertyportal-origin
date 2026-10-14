/**
 * Shared Reference-Counted Body Scroll Lock Manager
 *
 * Prevents background document scrolling when modal dialogs, sheets, or overlays
 * are open, while correctly supporting nested / stacked overlays (e.g. ConfirmProvider
 * opening on top of PaymentModal).
 *
 * Rules:
 * - When count transitions 0 -> 1: Caches previous document.body.style.overflow and sets 'hidden'.
 * - When count transitions 1 -> 0: Restores the cached overflow style.
 * - Safely handles SSR / environments where document is undefined.
 */

let lockCount = 0;
let originalOverflow = "";

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount > 0) {
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      originalOverflow = "";
    }
  }
}

export function getScrollLockCount() {
  return lockCount;
}

/**
 * Resets lock state and restores body overflow (for testing/cleanup).
 */
export function _resetScrollLockForTesting() {
  if (typeof document !== "undefined" && lockCount > 0) {
    document.body.style.overflow = originalOverflow;
  }
  lockCount = 0;
  originalOverflow = "";
}
