import { todayWita } from "../../utils/dateWita.js";

/**
 * Format due date for Office Boy directives.
 * Uses WITA calendar dates to prevent timezone skew near midnight.
 */
export function formatDueDate(dueDate, todayStr = todayWita()) {
  if (!dueDate) return null;
  const dueStr = String(dueDate).slice(0, 10);

  if (dueStr < todayStr) {
    return { label: "Overdue", badgeColor: "bg-rose-100 text-rose-800 border-rose-200" };
  }
  if (dueStr === todayStr) {
    return { label: "Due Today", badgeColor: "bg-amber-100 text-amber-900 border-amber-300" };
  }

  const parts = dueStr.split("-").map(Number);
  const formatted =
    parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])
      ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toLocaleDateString("en-US", {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
        })
      : dueStr;

  return {
    label: `Due ${formatted}`,
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  };
}
