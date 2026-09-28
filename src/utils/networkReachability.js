/**
 * Utility to verify actual internet reachability beyond the simple
 * `navigator.onLine` flag (which can report true on captive portals,
 * local router connections without WAN uplink, or stalled branch Wi-Fi).
 */

/**
 * Checks whether the device has an active, working route to the server / internet.
 *
 * 1. Fast local check: if `navigator.onLine === false`, returns false immediately.
 * 2. If online, issues a lightweight HEAD probe with cache-busting and a short timeout.
 * 3. Gracefully handles non-browser environments (Vitest, SSR).
 *
 * @param {object} [options]
 * @param {number} [options.timeoutMs=2500] Timeout before treating connection as stalled / unreachable.
 * @param {string} [options.probeUrl="/manifest.webmanifest"] Static asset path to probe.
 * @returns {Promise<boolean>}
 */
export async function checkNetworkReachability({
  timeoutMs = 2500,
  probeUrl = "/manifest.webmanifest",
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

  let timer = null;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (controller) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }

    const separator = probeUrl.includes("?") ? "&" : "?";
    const cacheBustedUrl = `${probeUrl}${separator}_reachability=${Date.now()}`;

    const res = await fetch(cacheBustedUrl, {
      method: "HEAD",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: controller?.signal,
    });

    if (timer) clearTimeout(timer);
    return res.ok || res.status === 304;
  } catch {
    if (timer) clearTimeout(timer);
    return false;
  }
}
