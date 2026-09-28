import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

/**
 * Non-blocking PWA update notification banner.
 *
 * Appears when a new service worker version is detected. Rather than forcing
 * an immediate page reload during active work (such as payment entry,
 * student registration, or attendance scanning), this banner informs the user
 * and gives them full control over when to apply the update.
 */
export default function PwaUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateFn, setUpdateFn] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.update) {
        setUpdateFn(() => e.detail.update);
        setUpdateAvailable(true);
      }
    };

    window.addEventListener("myliberty:sw-update-available", handleUpdate);
    return () => window.removeEventListener("myliberty:sw-update-available", handleUpdate);
  }, []);

  if (!updateAvailable || dismissed) return null;

  const handleApplyUpdate = () => {
    setUpdating(true);
    if (typeof updateFn === "function") {
      updateFn();
    } else {
      window.location.reload();
    }
  };

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
            A system update is ready. You can continue working and update when finished.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          disabled={updating}
          onClick={handleApplyUpdate}
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
