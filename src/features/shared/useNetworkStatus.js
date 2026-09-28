import { useState, useEffect, useCallback } from "react";
import { checkNetworkReachability } from "../../utils/networkReachability";

/**
 * Hook providing global network connectivity status for UI feedback (e.g. ConnectivityBanner).
 *
 * Keeps `navigator.onLine` as the baseline signal to avoid transient probe false-positives
 * flipping the whole app offline. Specific critical writes (payments, kiosk scans) use
 * `checkNetworkReachability` directly as a pre-flight guard.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true
  );
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  const verifyReachability = useCallback(async () => {
    const reachable = await checkNetworkReachability();
    setIsOnline(reachable);
    return reachable;
  }, []);

  useEffect(() => {
    let timer = null;
    let isMounted = true;

    const handleOnline = async () => {
      if (!isMounted) return;
      setIsReconnecting(true);
      const reachable = await checkNetworkReachability();
      if (!isMounted) return;
      setIsReconnecting(false);

      if (reachable) {
        setIsOnline(true);
        setShowReconnected(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (isMounted) setShowReconnected(false);
        }, 3500);
      } else {
        setIsOnline(false);
        setShowReconnected(false);
      }
    };

    const handleOffline = () => {
      if (!isMounted) return;
      setIsOnline(false);
      setIsReconnecting(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isOnline, isReconnecting, showReconnected, verifyReachability };
}
