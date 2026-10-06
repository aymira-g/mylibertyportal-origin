import { lazy } from "react";

/**
 * Enhanced lazy import with automatic retry and auto-reload on stale chunk / network drop.
 *
 * In modern Vite web applications, dynamic imports (lazy chunks) can fail with:
 * "Failed to fetch dynamically imported module: ... "
 * This happens when:
 * 1. The dev server or cloud instance restarts or is waking up from idle.
 * 2. A new version of the application was built/deployed while a user has an older tab open.
 * 3. Mobile network in Gorontalo experiences a momentary packet drop.
 *
 * This wrapper automatically retries the dynamic import up to `retriesLeft` times.
 * If all retries fail, it triggers a clean one-time window reload so the latest valid
 * assets are loaded without getting stuck in an ErrorBoundary.
 */
export function lazyWithRetry(componentImport, retriesLeft = 2, intervalMs = 800) {
  return lazy(() =>
    new Promise((resolve, reject) => {
      const attempt = (remaining) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            const errorMsg = String(error?.message || "");
            const isChunkOrFetchError =
              errorMsg.includes("dynamically imported module") ||
              errorMsg.includes("Failed to fetch") ||
              errorMsg.includes("Loading chunk") ||
              error?.name === "ChunkLoadError";

            if (remaining > 0 && isChunkOrFetchError) {
              setTimeout(() => {
                attempt(remaining - 1);
              }, intervalMs);
            } else if (isChunkOrFetchError) {
              // One-time session reload guard to prevent infinite reload loops
              const reloadKey = "chunk_reload_" + (window?.location?.pathname || "/");
              try {
                const alreadyReloaded = window?.sessionStorage?.getItem(reloadKey);
                if (!alreadyReloaded) {
                  window?.sessionStorage?.setItem(reloadKey, "true");
                  window.location.reload();
                  return;
                }
                window?.sessionStorage?.removeItem(reloadKey);
              } catch {
                // Ignore storage exceptions in restricted environments
              }
              reject(error);
            } else {
              reject(error);
            }
          });
      };

      attempt(retriesLeft);
    })
  );
}
