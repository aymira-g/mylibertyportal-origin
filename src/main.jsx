import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ConfirmProvider, ToastProvider, ErrorBoundary } from "./features/shared";
import { registerSW } from "virtual:pwa-register";
import { initGlobalErrorListeners } from "./utils/reportError";

// Catch and log uncaught runtime errors and unhandled promise rejections
initGlobalErrorListeners();

// Safely handle stale dynamic chunk errors without interrupting active forms or scanning stations
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn(
      "[PWA] Stale dynamic chunk detected. Checking active workflow state...",
      event
    );
    const lastReload = parseInt(sessionStorage.getItem("pwa_preload_reload") || "0", 10);
    // Guard against infinite reload loops if network is broken (max 1 reload per 15s)
    if (Date.now() - lastReload > 15000) {
      sessionStorage.setItem("pwa_preload_reload", String(Date.now()));

      // Check whether user is currently in a modal, editing an input, or scanning attendance
      const hasActiveModal = document.querySelector('[role="dialog"]') !== null;
      const isScannerActive = document.querySelector("#reader, video") !== null;
      const activeEl = document.activeElement;
      const isUserTyping =
        activeEl &&
        (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) &&
        Boolean(activeEl.value?.trim());

      if (hasActiveModal || isScannerActive || isUserTyping) {
        console.info("[PWA] Deferring automatic page reload due to active user workflow.");
        return;
      }

      window.location.reload();
    }
  });
}

// Background PWA service worker registration with non-blocking update notifications
let updateServiceWorker = null;
updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent("myliberty:sw-update-available", {
        detail: {
          update: () => {
            if (typeof updateServiceWorker === "function") {
              updateServiceWorker(true);
            } else {
              window.location.reload();
            }
          },
        },
      })
    );
  },
  onOfflineReady() {
    console.info("[PWA] Application ready for offline operations.");
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Periodic check for SW updates every 60 minutes for always-on tablets & kiosks
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn("[PWA] Periodic update check error:", err?.message);
        });
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.warn("[PWA] Service Worker registration failed:", error);
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary label="MYLIBERTY Portal">
      <ConfirmProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ConfirmProvider>
    </ErrorBoundary>
  </StrictMode>
);
