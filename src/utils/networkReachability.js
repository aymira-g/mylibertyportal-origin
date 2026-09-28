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
 * 3. Uses a dedicated 3-byte static asset (/ping.txt) with fallback to /favicon.svg.
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
      return res.status >= 200 && res.status < 400;
    } catch {
      if (timer) clearTimeout(timer);
      return false;
    }
  };

  const primaryResult = await attemptFetch(probeUrl);
  if (primaryResult) return true;

  // Fallback to favicon.svg if primary probe failed or was misconfigured
  if (probeUrl !== "/favicon.svg") {
    return await attemptFetch("/favicon.svg");
  }

  return false;
}
