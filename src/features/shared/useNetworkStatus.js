import { useState, useEffect, useCallback } from "react";
import { checkNetworkReachability } from "../../utils/networkReachability";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true
  );
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
      // Validate that the network connection actually reaches the outside world
      const reachable = await checkNetworkReachability({ timeoutMs: 3000 });
      if (!isMounted) return;

      if (reachable) {
        setIsOnline(true);
        setShowReconnected(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (isMounted) setShowReconnected(false);
        }, 3500);
      } else {
        setIsOnline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check in background to detect captive portals / stalling Wi-Fi on initial load
    if (typeof navigator !== "undefined" && navigator.onLine) {
      checkNetworkReachability({ timeoutMs: 3000 }).then((reachable) => {
        if (isMounted && !reachable) {
          setIsOnline(false);
        }
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isOnline, showReconnected, verifyReachability };
}
