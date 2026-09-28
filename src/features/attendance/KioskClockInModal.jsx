import { Calendar, X, ArrowRight } from "lucide-react";

export default function KioskClockInModal({
  pendingClockIn,
  selectedClassId,
  onSelectClassId,
  onConfirm,
  onCancel,
}) {
  if (!pendingClockIn) return null;

  const events =
    pendingClockIn.matchedEvents && pendingClockIn.matchedEvents.length > 0
      ? pendingClockIn.matchedEvents
      : pendingClockIn.matchedEvent
      ? [pendingClockIn.matchedEvent]
      : [];
  const classes = pendingClockIn.classes || [];
  const hasClasses = classes.length > 0;
  const hasEvents = events.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 text-left">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1a3a8f]" />
            <h4 className="font-bold text-slate-900 text-sm">
              {pendingClockIn.allowGeneralDuty
                ? "Confirm Staff Shift"
                : !hasClasses && hasEvents
                ? "Confirm Event Attendance"
                : "Confirm Teaching Shift"}
            </h4>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Welcome,{" "}
            <span className="font-bold text-slate-900">
              {pendingClockIn.userData.displayName}
            </span>
            !{" "}
            {pendingClockIn.allowGeneralDuty
              ? "Select your scheduled corporate event, or choose General Administrative Duty:"
              : !hasClasses && hasEvents
              ? "Select the corporate event you are attending:"
              : hasClasses && hasEvents
              ? "Select your scheduled class or corporate event:"
              : "Select the class cohort you are teaching right now:"}
          </p>
        </div>

        <select
          value={selectedClassId}
          onChange={(e) => onSelectClassId(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 outline-none focus:border-[#1a3a8f] focus:ring-1 focus:ring-[#1a3a8f]"
        >
          <option value="">
            {pendingClockIn.allowGeneralDuty
              ? "Select event or General Duty..."
              : !hasClasses && hasEvents
              ? "Select today's corporate event..."
              : "Select today's scheduled class or event..."}
          </option>
          {events.map((evt) => (
            <option key={evt.id} value={`corporate_event:${evt.id}`}>
              📌 Event: {evt.name}
            </option>
          ))}
          {pendingClockIn.allowGeneralDuty && (
            <option value="general">
              📋 General Administrative Duty
            </option>
          )}
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.className} ({cls.startTime || "Schedule not set"})
            </option>
          ))}
        </select>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedClassId}
            className="flex-[2] py-3 px-4 rounded-xl bg-[#1a3a8f] hover:bg-[#122b6e] text-white font-bold text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Confirm Clock In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
