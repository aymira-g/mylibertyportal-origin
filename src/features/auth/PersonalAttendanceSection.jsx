import React, { useState } from "react";
import { Calendar, Clock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { fetchUserShifts } from "../attendance/shiftsRepository";

/**
 * Projects a raw shift document to attendance-only fields before storing in state.
 *
 * ARCHITECTURAL BOUNDARY:
 * Cloud Firestore Security Rules do not support field-level read projection, so the full
 * shift document reaches the client over the network. This projection sanitizes the records
 * in component state, ensuring cashier reconciliation fields (countedCash, expectedCash,
 * drawerCount, discrepancy) are discarded immediately upon fetch.
 *
 * NOTE: This is a client-side UI projection boundary, NOT backend field-level protection.
 *
 * @param {any} shift
 * @returns {any}
 */
export function projectAttendanceShift(shift) {
  if (!shift) return null;
  return {
    id: shift.id,
    userId: shift.userId,
    clockIn: shift.clockIn || null,
    clockOut: shift.clockOut || null,
    stationId: shift.stationId || null,
    punctualityStatus: shift.punctualityStatus || null,
  };
}

/**
 * On-demand self-only attendance and shift history view for staff profiles.
 * Scoped strictly to the signed-in user (`uid`), queries up to 15 recent shift records,
 * displays date, clock-in, clock-out, and shift duration.
 *
 * GOVERNANCE / SECURITY BOUNDARY (Ratified OD-STF-01 / Owner Decision 2026-10-17):
 * - Scoped strictly to `uid` (signed-in user only); cross-user shift reads are forbidden.
 * - Cashier reconciliation, drawer counts, and financial discrepancy fields are strictly
 *   omitted from this view to prevent leaking cashier financial details.
 * - Bounded query (15 items) preserves Firebase free tier limits.
 */
export default function PersonalAttendanceSection({
  uid,
  initialOpen = false,
  initialShifts = null,
  fetchFn = fetchUserShifts,
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [shifts, setShifts] = useState(() =>
    initialShifts ? initialShifts.map(projectAttendanceShift) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadShifts = async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFn(uid, 15);
      const items = (data || []).map(projectAttendanceShift);
      setShifts(items);
    } catch (err) {
      console.error("Failed to load personal attendance history:", err);
      setError("Unable to load shift records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && shifts === null && !loading && uid) {
      loadShifts();
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        data-testid="toggle-personal-attendance"
        className="min-h-12 w-full bg-slate-50 text-slate-700 p-2.5 rounded-xl font-bold border border-slate-200 hover:bg-slate-100 transition flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#1a3a8f]" />
          <span>My Attendance &amp; Shifts</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400 text-xs">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div
          data-testid="personal-attendance-panel"
          className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[11px] text-slate-700 tracking-wide uppercase">
              Recent Shift History (Self)
            </span>
            <button
              type="button"
              onClick={loadShifts}
              disabled={loading}
              title="Refresh shifts"
              className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-500 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-semibold animate-pulse">
              Loading your shift records...
            </div>
          ) : error ? (
            <div className="p-3 text-center text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          ) : shifts && shifts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200/80">
              No recent shift records found for your account.
            </div>
          ) : shifts && shifts.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
              {shifts.map((shift) => {
                const inTime = shift.clockIn ? new Date(shift.clockIn) : null;
                const outTime = shift.clockOut ? new Date(shift.clockOut) : null;
                const durationMs = inTime && outTime ? outTime.getTime() - inTime.getTime() : null;
                const durationHours = durationMs ? (durationMs / (1000 * 60 * 60)).toFixed(1) : null;

                const dateFormatted = inTime
                  ? inTime.toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Makassar",
                    })
                  : "Unknown Date";

                const inFormatted = inTime
                  ? inTime.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Makassar",
                    })
                  : "-";

                const outFormatted = outTime
                  ? outTime.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Makassar",
                    })
                  : "Active";

                return (
                  <div
                    key={shift.id || `${shift.userId}-${shift.clockIn}`}
                    data-testid="personal-shift-item"
                    className="pt-2 first:pt-0 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-800 text-xs">
                        {dateFormatted}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          outTime
                            ? "bg-slate-200/70 text-slate-700"
                            : "bg-emerald-100 text-emerald-800 animate-pulse"
                        }`}
                      >
                        {outTime ? "Completed" : "Active Shift"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        In: {inFormatted} WITA
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Out: {outFormatted} {outTime ? "WITA" : ""}
                      </span>
                      {durationHours && (
                        <span className="font-bold text-slate-700">
                          ({durationHours} hrs)
                        </span>
                      )}
                      {shift.stationId && (
                        <span className="text-slate-400 text-[10px]">
                          Station: {shift.stationId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
