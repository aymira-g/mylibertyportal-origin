import React from "react";
import { createRoot } from "react-dom/client";

// Expose the authoritative React instance before ReportsDashboard imports tabs
window.React = React;
window.__exportCalls = {
  instructors: 0,
  today: 0,
  staff: 0,
  students: 0,
};

export function ReportsExportRoutingHarness() {
  return null;
}

async function mountHarness() {
  const { default: ReportsDashboard } = await import("../src/features/reports/ReportsDashboard");
  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <ReportsDashboard isInstructorLeader={true} userBranch="Kota Gorontalo" />
      </div>
    );
  }
}

mountHarness();
