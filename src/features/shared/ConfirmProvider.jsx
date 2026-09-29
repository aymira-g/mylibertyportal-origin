// Replaces the native window.confirm() popup used everywhere (ClassManager,
// AdminDashboard, StudentRoster, etc.) with a modal styled to match the app.
//
// SETUP (do this once): wrap the app in main.jsx —
//   <ConfirmProvider><App /></ConfirmProvider>
//
// USAGE (per call site, later — not done yet):
//   import { useConfirm } from "../../features/shared";
//   const confirm = useConfirm();
//   ...
//   if (await confirm("Delete this class?")) { ... }
//
// This mirrors the native confirm(message) -> boolean pattern almost exactly,
// the only difference is adding "await" — so swapping call sites later is a
// small, mechanical change rather than a rewrite.
import { useCallback, useRef, useState } from "react";
import { ConfirmContext } from "./useConfirm";

export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (typeof options === "string") {
        setRequest({
          title: null,
          message: options,
          confirmLabel: "Confirm",
          cancelLabel: "Cancel",
          isDestructive: false,
        });
      } else if (options && typeof options === "object") {
        setRequest({
          title: options.title || null,
          message:
            typeof options.message === "string"
              ? options.message
              : typeof options.description === "string"
              ? options.description
              : "",
          confirmLabel: options.confirmLabel || "Confirm",
          cancelLabel: options.cancelLabel || "Cancel",
          isDestructive: Boolean(options.isDestructive),
        });
      } else {
        setRequest({
          title: null,
          message: String(options ?? ""),
          confirmLabel: "Confirm",
          cancelLabel: "Cancel",
          isDestructive: false,
        });
      }
    });
  }, []);

  const handleChoice = (result) => {
    if (resolveRef.current) resolveRef.current(result);
    resolveRef.current = null;
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {request && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            {request.title && (
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                {request.title}
              </h3>
            )}
            {request.message && (
              <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed">
                {request.message}
              </p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => handleChoice(false)}
                className="flex-1 bg-slate-100 text-slate-700 p-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                {request.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleChoice(true)}
                className={`flex-1 text-white p-2.5 rounded-xl font-bold text-sm transition ${
                  request.isDestructive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#1a3a8f] hover:bg-[#122b6e]"
                }`}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
