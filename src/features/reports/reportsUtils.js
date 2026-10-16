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

/**
 * Computes netted rows for CSV export (DOM04-CSV-01 / DOM11-CSV-01).
 * Matches summarizePaymentsByMethod:
 * - Voided payments output netAmount = 0
 * - In-window reversal of voided payment outputs netAmount = 0
 * - Out-of-window reversal outputs netAmount = -Math.abs(amount)
 * - Normal payments output netAmount = Math.abs(amount)
 * - Preserves raw amount in Original / Gross Amount column for audit trail
 */
export function computeFinancialExportRows(payments = []) {
  if (!Array.isArray(payments)) return [];

  const voidedIds = new Set();
  for (const p of payments) {
    if (p?.status === "voided") {
      if (p.id) voidedIds.add(String(p.id));
      if (p.paymentId) voidedIds.add(String(p.paymentId));
      if (p.referenceNumber) voidedIds.add(String(p.referenceNumber));
      if (p.receiptNumber) voidedIds.add(String(p.receiptNumber));
    }
  }

  return payments.map((p) => {
    let statusText = "Completed";
    if (p.status === "voided") {
      statusText = "VOIDED";
    } else if (p.isReversal || p.status === "reversal" || p.type === "reversal") {
      statusText = "REVERSAL";
    } else if (p.approvalStatus === "pending") {
      statusText = "Pending Approval";
    } else if (p.approvalStatus === "rejected") {
      statusText = "Rejected";
    }

    const rawAmt = Number(p?.amount) || 0;
    const amt = Math.abs(rawAmt);
    const isRev = Boolean(p?.isReversal === true || p?.status === "reversal" || p?.type === "reversal");

    let netAmount;
    if (p?.status === "voided") {
      netAmount = 0;
    } else if (isRev) {
      const origId = p?.originalPaymentId || p?.reversalOfPaymentId || p?.originalReceiptNumber;
      const matchingVoidedInWindow =
        origId &&
        (voidedIds.has(String(origId)) ||
          payments.some(
            (other) =>
              other?.status === "voided" &&
              (other?.id === origId || other?.paymentId === origId)
          ));
      if (matchingVoidedInWindow) {
        netAmount = 0;
      } else {
        netAmount = -amt;
      }
    } else {
      netAmount = amt;
    }

    return [
      p.recordedAt || "",
      p.id || "",
      p.studentName || p.studentId || "Student",
      p.branch || p.branchId || "",
      p.division || "courses",
      p.planName || "Standard",
      p.period || "",
      p.method || "Cash",
      netAmount,
      rawAmt,
      statusText,
    ];
  });
}
