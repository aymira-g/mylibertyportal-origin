import { useState, useEffect } from "react";

const INSTALLED_DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui"];

/**
 * True when the app runs as an installed/pinned app rather than a normal
 * browser tab. Includes fullscreen and minimal-ui so kiosk tablets don't show
 * a redundant "Install App" button (DOM10-UX-02).
 *
 * @param {any} [win]
 */
export function isRunningAsInstalledApp(win = typeof window !== "undefined" ? window : undefined) {
  if (!win || typeof win.matchMedia !== "function") return false;
  return (
    INSTALLED_DISPLAY_MODES.some((mode) => win.matchMedia(`(display-mode: ${mode})`).matches) ||
    Boolean(win.navigator?.["standalone"])
  );
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isRunningAsInstalledApp());
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent) && !("MSStream" in window);
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event (Chromium, Android, Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return outcome;
    } else if (isIOS && !isInstalled) {
      setShowIOSGuide(true);
      return "ios-guide";
    }
    return "unsupported";
  };

  const canInstall = !isInstalled && (!!deferredPrompt || (isIOS && !isInstalled));

  return {
    canInstall,
    isInstalled,
    isIOS,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall,
  };
}
