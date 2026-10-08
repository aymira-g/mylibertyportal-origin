import { Badge } from "../../../shared";
import { DIVISION_BADGES } from "../../../../constants/divisions.js";
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";

/**
 * Small shared presentational pieces for the Instructor Leader workspace.
 * Presentation only — no data access, no derived business rules.
 */

/**
 * Division indicator so cross-division coverage is visible at a glance.
 * Meaning does not depend on colour alone: the short label is always rendered.
 *
 * @param {{ division?: string }} props
 */
export function DivisionBadge({ division = "courses" }) {
  const meta = DIVISION_BADGES[division] || DIVISION_BADGES.courses;
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${meta.tone}`}
    >
      {meta.shortLabel}
    </span>
  );
}

const SEVERITY_STYLES = {
  critical: { tone: "rose", Icon: ShieldAlert, label: "Critical" },
  attention: { tone: "amber", Icon: AlertTriangle, label: "Attention" },
  info: { tone: "indigo", Icon: Info, label: "For information" },
};

/**
 * @param {{ severity?: "critical" | "attention" | "info" }} props
 */
export function SeverityTag({ severity = "info" }) {
  const meta = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/**
 * @param {{ icon?: any, title?: string, message?: string, action?: any }} props
 */
export function LeaderEmptyState({ icon: Icon = CheckCircle2, title = "Nothing to report", message = "", action = null }) {
  return (
    <div className="p-8 text-center space-y-2">
      <Icon className="w-8 h-8 text-slate-300 mx-auto" />
      <p className="font-extrabold text-slate-700 text-sm">{title}</p>
      {message && <p className="text-xs text-slate-400 max-w-md mx-auto">{message}</p>}
      {action}
    </div>
  );
}

/**
 * Permission / load failure notice. Never renders a silent empty list.
 *
 * @param {{ title?: string, message?: string }} props
 */
export function LeaderErrorNote({ title = "Could not load this view", message = "" }) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl text-xs font-semibold space-y-1">
      <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
        <ShieldAlert className="w-4 h-4" />
        <span>{title}</span>
      </div>
      {message && <p className="font-medium text-rose-700 break-words">{message}</p>}
    </div>
  );
}

/**
 * @param {{ label: string, value: any, hint?: string, tone?: string }} props
 */
export function HealthRow({ label, value, hint = "", tone = "text-slate-900" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700">{label}</p>
        {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
      </div>
      <span className={`text-sm font-black ${tone} shrink-0`}>{value}</span>
    </div>
  );
}
