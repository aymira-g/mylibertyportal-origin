/**
 * Utility to verify actual internet reachability beyond the simple
 * `navigator.onLine` flag (which can report true on captive portals,
 * local router connections without WAN uplink, or stalled branch Wi-Fi).
 */

/**
 * Checks whether the device has an active, working route to the server / internet.
 *
 * 1. Fast local check: if `navigator.onLine === false`, returns false immediately.
 * 2. If online, issues a lightweight GET probe with cache-busting and a short timeout.
 * 3. Uses a dedicated 3-byte static asset (/ping.txt). Falls back to /favicon.svg only when
 *    /ping.txt returns HTTP 404 (asset missing); timeouts and network errors return false
 *    immediately so a stalled link is reported in one timeout, not two (DOM10-PERF-01).
 * 4. Gracefully handles non-browser environments (Vitest, SSR).
 *
 * @param {object} [options]
 * @param {number} [options.timeoutMs=2500] Timeout before treating connection as stalled / unreachable.
 * @param {string} [options.probeUrl="/ping.txt"] Static asset path to probe.
 * @returns {Promise<boolean>}
 */
export async function checkNetworkReachability({
  timeoutMs = 2500,
  probeUrl = "/ping.txt",
} = {}) {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" &&
    !navigator.onLine
  ) {
    return false;
  }

  if (typeof fetch === "undefined") {
    return true;
  }

  const attemptFetch = async (url) => {
    let timer = null;
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      if (controller) {
        timer = setTimeout(() => controller.abort(), timeoutMs);
      }

      const separator = url.includes("?") ? "&" : "?";
      const cacheBustedUrl = `${url}${separator}_reachability=${Date.now()}`;

      // Use GET with cache: "no-store" for maximum CDN/hosting compatibility
      const res = await fetch(cacheBustedUrl, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: controller?.signal,
      });

      if (timer) clearTimeout(timer);
      return { ok: res.status >= 200 && res.status < 400, status: res.status };
    } catch {
      if (timer) clearTimeout(timer);
      return { ok: false, status: 0 };
    }
  };

  const primary = await attemptFetch(probeUrl);
  if (primary.ok) return true;

  // Fall back only if the probe file itself is missing (404). A timeout or
  // network error means the link is down; probing again just doubles the wait.
  if (primary.status === 404 && probeUrl !== "/favicon.svg") {
    return (await attemptFetch("/favicon.svg")).ok;
  }

  return false;
}
