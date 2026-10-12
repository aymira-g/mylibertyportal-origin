import {
  startOfTodayWitaIso as centralizedStartOfTodayWitaIso,
  todayWita,
} from "../../utils/dateWita.js";
import { matchesBranchFilter } from "../../constants/branches.js";
import { matchesDivisionFilter } from "../../constants/divisions.js";

/**
 * Pure date & utility helpers for Reports & Attendance.
 * Ensures consistent WITA (UTC+8 / Asia/Makassar) day boundary calculations.
 */

export function uniqueClasses(classes = []) {
  const seen = new Set();
  return classes.filter((cls) => {
    const signature = [cls.className, cls.instructorId, cls.schedule, cls.classRoom].join("|");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

export function getStartOfTodayWitaIso() {
  return centralizedStartOfTodayWitaIso();
}

export function getTodayWitaString() {
  return todayWita();
}

export function rangeToSince(days) {
  return days === 0 ? null : new Date(Date.now() - days * 86400000).toISOString();
}

/**
 * Pure filtering for Institutional Financial Reports.
 * Ensures strict date horizon compliance (DOM11-COR-01) and branchId isolation (DOM11-COR-02).
 *
 * @param {Array<any>} [payments]
 * @param {{
 *   rangeDays?: number;
 *   branchFilter?: string;
 *   division?: string;
 *   methodFilter?: string;
 *   search?: string;
 * }} [options]
 * @returns {Array<any>}
 */
export function filterPayments(payments = [], {
  rangeDays = 30,
  branchFilter = "all",
  division = "all",
  methodFilter = "all",
  search = "",
} = {}) {
  const since = rangeToSince(rangeDays);
  return payments.filter((p) => {
    // Date horizon match (DOM11-COR-01)
    if (since && (!p.recordedAt || p.recordedAt < since)) {
      return false;
    }
    // Branch match (DOM11-COR-02)
    if (branchFilter !== "all" && !matchesBranchFilter(p.branchId || p.branch, branchFilter)) {
      return false;
    }
    // Division match
    if (division !== "all" && !matchesDivisionFilter(p.division, division)) {
      return false;
    }
    // Payment method match
    if (methodFilter !== "all" && (p.method || "").toLowerCase() !== methodFilter.toLowerCase()) {
      return false;
    }
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const student = (p.studentName || p.studentId || "").toLowerCase();
      const plan = (p.planName || "").toLowerCase();
      const notes = (p.notes || "").toLowerCase();
      if (!student.includes(q) && !plan.includes(q) && !notes.includes(q)) {
        return false;
      }
    }
    return true;
  });
}
