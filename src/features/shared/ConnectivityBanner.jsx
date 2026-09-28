import { WifiOff, Wifi, Loader2 } from "lucide-react";
import { useNetworkStatus } from "./useNetworkStatus";

export default function ConnectivityBanner() {
  const { isOnline, isReconnecting, showReconnected } = useNetworkStatus();

  if (isOnline && !isReconnecting && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 z-50 shadow-xs ${
        isReconnecting
          ? "bg-indigo-700 text-white"
          : !isOnline
            ? "bg-amber-600 text-white"
            : "bg-emerald-600 text-white animate-fade-in"
      }`}
    >
      {isReconnecting ? (
        <>
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-200" />
          <span className="text-center">
            <strong>Reconnecting…</strong> — Checking connection to MY LIBERTY services.
          </span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          <span className="text-center">
            <strong>Offline Mode</strong> — Internet connection unavailable. Live data and payment processing are paused.
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>
            <strong>Back online</strong> — Connection restored.
          </span>
        </>
      )}
    </div>
  );
}
