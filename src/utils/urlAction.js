/**
 * Utility for reading and safely pruning PWA shortcut action query parameters (?action=...)
 * from the URL after consumption so that subsequent reloads don't keep re-triggering modal or tab states.
 */

/**
 * Synchronously retrieves the specified URL query param (defaults to "action").
 *
 * @param {string} [paramName="action"]
 * @returns {string|null}
 */
export function getUrlAction(paramName = "action") {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(paramName);
  } catch {
    return null;
  }
}

/**
 * Clears the specified query parameter from window.history without reloading the page.
 *
 * @param {string} [paramName="action"]
 */
export function clearUrlAction(paramName = "action") {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(paramName)) {
      url.searchParams.delete(paramName);
      const cleanUrl = url.pathname + (url.search ? url.search : "") + url.hash;
      const title = typeof document !== "undefined" ? document.title : "";
      window.history.replaceState({}, title, cleanUrl);
    }
  } catch {
    // Non-fatal if replaceState fails in certain webviews
  }
}
