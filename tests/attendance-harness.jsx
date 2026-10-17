import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ProfilePanel from "../src/features/auth/ProfilePanel";
import { ToastContext } from "../src/features/shared/useToast";

// Global tracking for Playwright assertions
window.__fetchCount = 0;
window.__lastFetchedUid = null;
window.__lastFetchedLimit = null;

const mockShifts = [
  {
    id: "shift-pw-1",
    userId: "staff-ops-123",
    clockIn: "2026-10-17T08:00:00.000Z",
    clockOut: "2026-10-17T17:00:00.000Z",
    stationId: "kiosk-01",
    punctualityStatus: "Present",
    // Sensitive cashier reconciliation fields that must NEVER appear in the DOM
    cashReconciliation: {
      expectedCash: 750000,
      countedCash: 750000,
      discrepancy: 0,
    },
    drawerCount: 750000,
    reviewStatus: "approved",
  },
  {
    id: "shift-pw-2",
    userId: "staff-ops-123",
    clockIn: "2026-10-18T08:30:00.000Z",
    clockOut: null,
    stationId: "reception-02",
    punctualityStatus: "Present",
  },
];

async function mockFetchUserShifts(uid, limit) {
  window.__fetchCount += 1;
  window.__lastFetchedUid = uid;
  window.__lastFetchedLimit = limit;
  // Small delay to simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockShifts;
}

function AttendanceTestHarness() {
  const [currentRole, setCurrentRole] = useState("opslead");
  const [panelOpen, setPanelOpen] = useState(true);

  const staffProfile = {
    uid: "staff-ops-123",
    displayName: "Kifri Operational Leader",
    role: "opslead",
    phone: "081234567890",
    dob: "1992-05-10",
  };

  const studentProfile = {
    uid: "student-456",
    displayName: "Student Learner",
    role: "student",
    phone: "089876543210",
    dob: "2010-08-15",
  };

  const activeProfile = currentRole === "opslead" ? staffProfile : studentProfile;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px" }}>
        <button
          type="button"
          data-testid="switch-to-staff"
          onClick={() => setCurrentRole("opslead")}
          style={{ padding: "8px 12px", fontWeight: currentRole === "opslead" ? "bold" : "normal" }}
        >
          Staff Profile (Ops Lead)
        </button>
        <button
          type="button"
          data-testid="switch-to-student"
          onClick={() => setCurrentRole("student")}
          style={{ padding: "8px 12px", fontWeight: currentRole === "student" ? "bold" : "normal" }}
        >
          Student Profile
        </button>
        <button
          type="button"
          data-testid="toggle-panel"
          onClick={() => setPanelOpen(!panelOpen)}
          style={{ padding: "8px 12px" }}
        >
          {panelOpen ? "Close Modal" : "Open Modal"}
        </button>
      </div>

      <div data-testid="fetch-counter" style={{ marginBottom: "10px", fontSize: "14px" }}>
        Fetch Count: {window.__fetchCount}
      </div>

      {panelOpen && (
        <ProfilePanel
          key={currentRole}
          onClose={() => {}}
          initialProfile={activeProfile}
          attendanceFetchFn={mockFetchUserShifts}
        />
      )}
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <ToastContext.Provider value={() => {}}>
      <AttendanceTestHarness />
    </ToastContext.Provider>
  );
}
