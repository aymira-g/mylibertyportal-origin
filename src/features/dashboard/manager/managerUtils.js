export function formatTime(isoString) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

export function formatPunctuality(shift) {
  const rawStatus = (shift.punctualityStatus || "ON_TIME").toUpperCase().replace(/\s+/g, "_");
  const mins = shift.minutesEarlyOrLate;
  const absMins = mins != null && Number.isFinite(Number(mins)) ? Math.abs(Math.round(mins)) : null;

  if (rawStatus === "LATE") {
    return {
      label: absMins ? `${absMins}m late` : "Late",
      classes: "bg-rose-100 text-rose-800 border-rose-200",
    };
  }
  if (rawStatus === "EARLY") {
    return {
      label: absMins ? `${absMins}m early` : "Early",
      classes: "bg-blue-100 text-blue-800 border-blue-200",
    };
  }
  return {
    label: "On Time",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
}

/**
 * Filter an array of records to exclude kindergarten-specific documents,
 * preserving course division and shared records.
 *
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function filterCourseDivision(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const div = /** @type {any} */ (item).division;
    return !div || div !== "kindergarten";
  });
}

/**
 * Calculate total operational bottlenecks across leads, unplaced students, and class alerts.
 *
 * @param {object} params
 * @param {any[]} [params.pendingApplications]
 * @param {any[]} [params.unenrolledStudents]
 * @param {any[]} [params.classesWithIssues]
 * @returns {{ pendingCount: number, unenrolledCount: number, issuesCount: number, total: number }}
 */
export function computeBottleneckTotals({
  pendingApplications = [],
  unenrolledStudents = [],
  classesWithIssues = [],
} = {}) {
  const pendingCount = Array.isArray(pendingApplications) ? pendingApplications.length : 0;
  const unenrolledCount = Array.isArray(unenrolledStudents) ? unenrolledStudents.length : 0;
  const issuesCount = Array.isArray(classesWithIssues) ? classesWithIssues.length : 0;
  return {
    pendingCount,
    unenrolledCount,
    issuesCount,
    total: pendingCount + unenrolledCount + issuesCount,
  };
}

