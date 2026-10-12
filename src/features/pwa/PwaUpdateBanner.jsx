import { useState, useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { getPendingSwUpdate, subscribeSwUpdate } from "./swUpdateStore";
import { shouldAutoApplyUpdate, UPDATE_FALLBACK_RELOAD_MS } from "./autoUpdatePolicy";
import { getKioskActivity } from "../../utils/kioskActivity";
import { checkNetworkReachability } from "../../utils/networkReachability";

const AUTO_APPLY_CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Non-blocking PWA update notification banner.
 *
 * Appears when a new service worker version is detected. Rather than forcing
 * an immediate page reload during active work (such as payment entry,
 * student registration, or attendance scanning), this banner informs the user
 * and gives them full control over when to apply the update.
 *
 * Kiosk mode (`autoApplyWhenIdleMs`): unattended kiosks also apply the update
 * on their own once nobody has used the kiosk for that long, no one is
 * mid-flow, no dialog is open, and the network is actually reachable.
 *
 * @param {{ autoApplyWhenIdleMs?: number }} props
 */
export default function PwaUpdateBanner({ autoApplyWhenIdleMs } = {}) {
  // Reads the shared store so an update detected before this banner mounted
  // (or on a previous banner instance) is still shown — DOM10-SW-01.
  const updateFn = useSyncExternalStore(subscribeSwUpdate, getPendingSwUpdate, getPendingSwUpdate);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const fallbackTimerRef = useRef(null);
  const applyingRef = useRef(false);

  const applyUpdate = useCallback(() => {
    if (applyingRef.current) return;
    applyingRef.current = true;
    setUpdating(true);
    // Safety net — DOM10-UX-03: if the new worker never takes control, reload anyway.
    fallbackTimerRef.current = setTimeout(() => {
      window.location.reload();
    }, UPDATE_FALLBACK_RELOAD_MS);
    if (typeof updateFn === "function") {
      updateFn();
    } else {
      window.location.reload();
    }
  }, [updateFn]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  // Kiosk auto-apply when idle — DOM10-SW-02 (owner-approved option b).
  useEffect(() => {
    if (!updateFn || !autoApplyWhenIdleMs) return;
    let cancelled = false;

    const tryAutoApply = async () => {
      if (cancelled || applyingRef.current) return;
      const canApply = () => {
        const { lastActivityAt, busy } = getKioskActivity();
        return shouldAutoApplyUpdate({
          now: Date.now(),
          lastActivityAt,
          busy,
          hasOpenDialog: document.querySelector('[role="dialog"]') !== null,
          idleMs: autoApplyWhenIdleMs,
        });
      };
      if (!canApply()) return;
      const reachable = await checkNetworkReachability();
      // Re-check after the async probe in case someone started scanning meanwhile.
      if (cancelled || !reachable || !canApply()) return;
      console.info("[PWA] Kiosk idle — applying waiting update.");
      applyUpdate();
    };

    const interval = setInterval(tryAutoApply, AUTO_APPLY_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [updateFn, autoApplyWhenIdleMs, applyUpdate]);

  if (!updateFn || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-slate-900 text-white py-2 px-3 sm:px-4 border-b border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-2 z-50 text-xs shadow-md animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 text-left">
          <span className="font-extrabold text-white">New version available</span>
          <span className="text-slate-300 ml-1.5 hidden sm:inline">
            {autoApplyWhenIdleMs
              ? "This kiosk will update automatically when idle, or tap Update Now."
              : "A system update is ready. You can continue working and update when finished."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          disabled={updating}
          onClick={applyUpdate}
          className="px-3 py-1.5 bg-[#1a3a8f] hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updating ? "animate-spin" : ""}`} />
          <span>{updating ? "Updating…" : "Update Now"}</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          title="Update later"
          aria-label="Update later"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
