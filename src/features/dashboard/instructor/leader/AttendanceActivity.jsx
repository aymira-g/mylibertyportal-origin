import { useState } from "react";
import { CalendarClock, CheckCircle2, Info, RefreshCw, ScanLine } from "lucide-react";
import { Badge, Card } from "../../../shared";
import { noopLoadAttendance } from "../leaderUtils";
import { DivisionBadge, HealthRow, LeaderEmptyState, LeaderErrorNote } from "./leaderUi";

/**
 * AttendanceActivity
 *
 * Branch-scope attendance monitoring for the Instructor Leader.
 *
 * Deliberately a one-shot, on-demand read rather than a realtime listener: a
 * branch-wide attendance listener would re-read the whole branch on every kiosk
 * scan, and each evaluated document costs a rules-level class lookup.
 *
 * Read-only. Retroactive student attendance correction is governed to the
 * Operational Leader / Front Office (RETROACTIVE_STUDENT_ATTENDANCE), so this
 * view never offers an edit shortcut.
 */
export default function AttendanceActivity({
  classes = [],
  todayDate = "",
  attendance = { date: "", loading: false, error: "", rows: [] },
  attendanceSummary = null,
  loadAttendance = noopLoadAttendance,
}) {
  const [selectedDate, setSelectedDate] = useState(todayDate || "");

  const hasLoaded = attendance.rows.length > 0 && !attendance.loading;
  const incomplete = attendanceSummary?.incomplete || [];

  return (
    <div className="space-y-5 w-full">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#1a3a8f]" />
              <h4 className="font-extrabold text-slate-800 text-sm">Attendance &amp; Teaching Activity</h4>
              <Badge tone="indigo">{classes.length} active classes</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Monitors recorded attendance for active branch classes on a chosen date. Loaded on demand to
              keep Firestore reads bounded.
            </p>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label
                htmlFor="leader-attendance-date"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"
              >
                Date
              </label>
              <input
                id="leader-attendance-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1a3a8f]"
              />
            </div>
            <button
              type="button"
              disabled={attendance.loading || !selectedDate}
              onClick={() => loadAttendance(selectedDate)}
              className="px-4 py-1.5 rounded-xl bg-[#1a3a8f] hover:bg-[#15306f] disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${attendance.loading ? "animate-spin" : ""}`} />
              <span>{attendance.loading ? "Loading…" : hasLoaded ? "Reload" : "Load attendance"}</span>
            </button>
          </div>
        </div>
      </Card>

      {attendance.error && (
        <LeaderErrorNote
          title="Could not load attendance"
          message={`${attendance.error} Attendance is readable only for classes in your branch.`}
        />
      )}

      {!hasLoaded && !attendance.loading && !attendance.error && (
        <Card>
          <LeaderEmptyState
            icon={CalendarClock}
            title="Attendance not loaded yet"
            message="Choose a date and load attendance to see per-class completion for this branch. Nothing is fetched until you ask for it."
          />
        </Card>
      )}

      {attendance.loading && (
        <Card>
          <p className="p-8 text-center text-slate-400 text-sm font-medium">
            Reading attendance for {attendance.date || selectedDate}…
          </p>
        </Card>
      )}

      {hasLoaded && attendanceSummary && (
        <>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#1a3a8f]" />
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                Completion for {attendance.date}
              </h4>
            </div>
            <HealthRow
              label="Attendance completion"
              hint={`${attendanceSummary.recorded} of ${attendanceSummary.expected} expected records`}
              value={`${Math.round(attendanceSummary.completionRate * 100)}%`}
              tone={incomplete.length > 0 ? "text-amber-700" : "text-emerald-700"}
            />
            <HealthRow label="Active classes checked" value={attendanceSummary.sessions} />
            <HealthRow
              label="Sessions still incomplete"
              value={incomplete.length}
              tone={incomplete.length > 0 ? "text-amber-700" : "text-slate-900"}
            />
            <HealthRow
              label="Classes with nothing recorded"
              value={attendance.rows.filter((row) => row.expected > 0 && row.recorded === 0).length}
              tone={
                attendance.rows.filter((row) => row.expected > 0 && row.recorded === 0).length > 0
                  ? "text-rose-700"
                  : "text-slate-900"
              }
            />
          </Card>

          {incomplete.length === 0 ? (
            <Card>
              <LeaderEmptyState
                icon={CheckCircle2}
                title="Attendance complete"
                message={`Every active class with an enrolled roster has attendance recorded for ${attendance.date}.`}
              />
            </Card>
          ) : (
            <Card padding="p-0" className="overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Sessions Needing Follow-up
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Ordered by the number of missing records.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {[...incomplete]
                  .sort((a, b) => b.missing - a.missing)
                  .map((row) => (
                    <div
                      key={row.classId}
                      className="p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {row.className}
                          </span>
                          <DivisionBadge division={row.division} />
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {row.recorded} of {row.expected} students recorded
                        </p>
                      </div>
                      <span className="text-xs font-black text-amber-700 tabular-nums shrink-0">
                        {row.missing} missing
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Card className="border-dashed">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-slate-600 font-medium space-y-1.5">
            <p>
              Monitoring only. Retroactive student-attendance correction is governed to the Operational
              Leader / Front Office (<span className="font-bold">RETROACTIVE_STUDENT_ATTENDANCE</span>),
              escalating to the Vice Director — the Instructor Leader does not edit attendance records.
            </p>
            <p className="flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-slate-400" />
              Use <span className="font-bold text-slate-700">Attendance &amp; Kiosk</span> in the sidebar to
              record attendance for classes you personally teach.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
