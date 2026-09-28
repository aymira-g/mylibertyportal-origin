import { useEffect, useRef } from "react";

/**
 * Pushes a transient history entry when an overlay (sheet, modal, drawer) opens,
 * and intercepts the browser/Android system Back button (popstate) to close the
 * overlay before navigating away or leaving the app.
 *
 * Symmetrically unwinds the pushed history state if the overlay is closed
 * programmatically (e.g. tapping "✕ Close", clicking backdrop, or pressing Escape).
 *
 * @param {boolean} isOpen Whether the overlay is currently visible
 * @param {() => void} onClose Callback invoked to dismiss the overlay
 * @param {string} [overlayKey="overlay"] Identifier for the history state
 */
export function useOverlayHistory(isOpen, onClose, overlayKey = "overlay") {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;

    // Push an overlay entry onto the history stack
    try {
      window.history.pushState({ [overlayKey]: true, openedAt: Date.now() }, "");
      isPushedRef.current = true;
    } catch {
      // In restricted iframes or security-sandboxed environments, pushState may fail safely
      isPushedRef.current = false;
    }

    const handlePopState = () => {
      if (isPushedRef.current) {
        // Back button pressed while overlay was open
        isPushedRef.current = false;
        onCloseRef.current?.();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If overlay was closed programmatically (not by Back button), unwind the pushed state
      if (isPushedRef.current) {
        isPushedRef.current = false;
        try {
          window.history.back();
        } catch {
          // Ignore
        }
      }
    };
  }, [isOpen, overlayKey]);
}
