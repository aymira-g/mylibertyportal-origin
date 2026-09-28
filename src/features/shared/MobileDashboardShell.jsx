import { useState, useCallback } from "react";
import { getCleanLabel, getTabIcon } from "./tabUtils";
import { useOverlayHistory } from "./useOverlayHistory";

/**
 * Phone-only presentation for the shared DashboardShell.
 *
 * It deliberately receives the same tabs and callbacks as the desktop shell,
 * so this component changes navigation appearance only. Dashboard data,
 * permissions and individual tab components stay shared between phone and
 * desktop views.
 */
export default function MobileDashboardShell({
  tabs,
  activeTab,
  onTabChange,
  title,
  extraSidebarContent = null,
  primaryTabIds = null,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const handleCloseMore = useCallback(() => setMoreOpen(false), []);
  useOverlayHistory(moreOpen, handleCloseMore, "mobileMoreSheet");
  const visibleTabs = tabs.filter((tab) => !tab.hidden);

  let primaryTabs;
  let moreTabs;

  if (Array.isArray(primaryTabIds) && primaryTabIds.length > 0) {
    const primarySet = new Set(primaryTabIds);
    primaryTabs = visibleTabs.filter((t) => primarySet.has(t.id)).slice(0, 4);
    const selectedPrimaryIds = new Set(primaryTabs.map((t) => t.id));
    moreTabs = visibleTabs.filter((t) => !selectedPrimaryIds.has(t.id));
  } else {
    // Smart role-based defaults according to actual operational task frequency
    const availableIds = new Set(visibleTabs.map((t) => t.id));
    let matchedPriorities = null;

    if (availableIds.has("cashier") && (availableIds.has("inquiries") || availableIds.has("walkins"))) {
      // Front Office
      const inquiryId = availableIds.has("inquiries") ? "inquiries" : "walkins";
      matchedPriorities = ["overview", "cashier", inquiryId, "applications"];
    } else if (
      (availableIds.has("users") || availableIds.has("students") || availableIds.has("directory")) &&
      availableIds.has("applications")
    ) {
      // Admin
      const studentOrUser = availableIds.has("students")
        ? "students"
        : availableIds.has("users")
          ? "users"
          : "directory";
      matchedPriorities = ["overview", studentOrUser, "classes", "approvals"];
    } else if (availableIds.has("attendance") && (availableIds.has("progress") || availableIds.has("classes"))) {
      // Instructor
      matchedPriorities = ["overview", "attendance", "classes", "progress"];
    } else if (availableIds.has("approvals") && availableIds.has("reports") && availableIds.has("classes")) {
      // Manager
      matchedPriorities = ["overview", "approvals", "classes", "reports"];
    }

    if (matchedPriorities) {
      primaryTabs = matchedPriorities
        .map((id) => visibleTabs.find((t) => t.id === id))
        .filter(Boolean)
        .slice(0, 4);
      const selectedPrimaryIds = new Set(primaryTabs.map((t) => t.id));
      moreTabs = visibleTabs.filter((t) => !selectedPrimaryIds.has(t.id));
    } else {
      primaryTabs = visibleTabs.slice(0, 4);
      moreTabs = visibleTabs.slice(4);
    }
  }

  const active = tabs.find((tab) => tab.id === activeTab);
  const activeIsInMore = moreTabs.some((tab) => tab.id === activeTab);

  const selectTab = (tabId) => {
    onTabChange(tabId);
    setMoreOpen(false);
  };

  const ADMIN_OR_SYSTEM_IDS = new Set([
    "approvals",
    "directory",
    "invites",
    "terminals",
    "misc",
    "tasks",
    "directives",
    "ai",
    "aiAssistant",
    "settings",
  ]);

  const dailyMoreTabs = moreTabs.filter((tab) => !ADMIN_OR_SYSTEM_IDS.has(tab.id));
  const adminMoreTabs = moreTabs.filter((tab) => ADMIN_OR_SYSTEM_IDS.has(tab.id));
  const hasMultipleSections = dailyMoreTabs.length > 0 && adminMoreTabs.length > 0;

  const renderTabButton = (tab) => {
    const Icon = getTabIcon(tab);
    const label = getCleanLabel(tab.label);
    const isActive = activeTab === tab.id;

    return (
      <button
        key={tab.id}
        onClick={() => selectTab(tab.id)}
        className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-bold transition flex items-center justify-between gap-2.5 cursor-pointer ${
          isActive
            ? "border-[#1a3a8f] bg-[#1a3a8f] text-white"
            : "border-slate-200 bg-slate-50 text-slate-700 active:bg-slate-100"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isActive ? "bg-white/20 text-white" : "bg-white text-[#1a3a8f] shadow-2xs"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="truncate">{label}</span>
        </div>
        {tab.badge !== undefined && tab.badge !== null && (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-black rounded-full shrink-0 ${
              isActive ? "bg-white text-[#1a3a8f]" : "bg-amber-100 text-amber-800"
            }`}
          >
            {tab.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="md:hidden">
      {/* Dashboard Subheader & Action Launcher (Scrolls with content, no competing sticky) */}
      <div className="-mx-3 -mt-3 mb-4 border-b border-slate-200/90 bg-white px-3.5 py-3 sm:-mx-4 sm:-mt-4 sm:px-4 shadow-2xs">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1a3a8f]">
          {title || "MYLIBERTY"}
        </p>
        <h2 className="mt-0.5 text-lg font-black text-slate-800 leading-tight">
          {getCleanLabel(active?.label) || "Dashboard"}
        </h2>
        {extraSidebarContent && <div className="mt-2.5">{extraSidebarContent}</div>}
      </div>

      <main className="pb-24">{active?.component}</main>

      {/* "More Tools" Bottom Sheet */}
      {moreOpen && (
        <>
          <button
            aria-label="Close navigation menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
          />
          <section className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200 overscroll-contain max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-800">More Tools</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {hasMultipleSections ? (
              <div className="space-y-4">
                {dailyMoreTabs.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Academic &amp; Operations
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {dailyMoreTabs.map(renderTabButton)}
                    </div>
                  </div>
                )}
                {adminMoreTabs.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Administration &amp; Tools
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {adminMoreTabs.map(renderTabButton)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {moreTabs.map(renderTabButton)}
              </div>
            )}
          </section>
        </>
      )}

      {/* Floating Bottom Navigation Bar with Home Indicator Safe Area */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 bg-[#1a3a8f]/95 backdrop-blur-lg border-t border-white/10 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.2)]">
        {primaryTabs.map((tab) => {
          const Icon = getTabIcon(tab);
          const label = getCleanLabel(tab.label);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`relative min-h-14 min-w-0 flex-1 rounded-xl px-1 flex flex-col items-center justify-center text-[11px] font-bold tracking-tight leading-tight transition cursor-pointer select-none ${
                isActive ? "bg-white text-[#1a3a8f] shadow-xs" : "text-white/80 active:bg-white/10"
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-1 shrink-0 ${isActive ? "text-[#1a3a8f]" : "text-white"}`}
              />
              <span className="block truncate max-w-full">{label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span className="absolute top-1 right-1.5 px-1 py-0.2 text-[9px] font-extrabold rounded-full bg-amber-400 text-slate-900 shadow-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
        {moreTabs.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`min-h-14 min-w-0 flex-1 rounded-xl px-1 text-center text-[11px] font-bold tracking-tight transition cursor-pointer select-none ${
              activeIsInMore || moreOpen
                ? "bg-white text-[#1a3a8f] shadow-sm"
                : "text-white/80 active:bg-white/10"
            }`}
          >
            <span className="block text-base leading-none">•••</span>
            <span className="block mt-1">More</span>
          </button>
        )}
      </nav>
    </div>
  );
}
