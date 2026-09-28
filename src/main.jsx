import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ConfirmProvider, ToastProvider, ErrorBoundary } from "./features/shared";
import { registerSW } from "virtual:pwa-register";
import { initGlobalErrorListeners } from "./utils/reportError";

// Catch and log uncaught runtime errors and unhandled promise rejections
initGlobalErrorListeners();

// Automatically reload to recover from stale-chunk load failures when a new deployment occurs
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn(
      "[PWA] Stale dynamic chunk detected. Refreshing page to load latest version...",
      event
    );
    const lastReload = parseInt(sessionStorage.getItem("pwa_preload_reload") || "0", 10);
    // Guard against infinite reload loops if network is broken (max 1 reload per 15s)
    if (Date.now() - lastReload > 15000) {
      sessionStorage.setItem("pwa_preload_reload", String(Date.now()));
      window.location.reload();
    }
  });
}

// Automatically check and update service worker in background
registerSW({
  immediate: true,
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
