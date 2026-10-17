import { db } from "../../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getStars } from "../shared/levels";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../constants/branches.js";
import { todayWita } from "../../utils/dateWita.js";

export const FIRESTORE_BATCH_LIMIT = 500;
export const DEFAULT_OPS_LEAD_REPORTS_LIMIT = 50;
export const MAX_OPS_LEAD_REPORTS_LIMIT = 50;

/**
 * Resolves a bounded document query limit for Ops Lead progress reports.
 * Hard limit enforced to protect Spark free-tier quotas and prevent memory or read-cost exhaustion.
 * Callers cannot disable the query limit with 0, negative numbers, fractional values < 1,
 * non-numbers, NaN, Infinity, or exceed MAX_OPS_LEAD_REPORTS_LIMIT (50).
 *
 * @param {any} [limitCount] - Caller provided limit
 * @returns {number} Clamped safe integer limit between 1 and MAX_OPS_LEAD_REPORTS_LIMIT (50)
 */
export function resolveOpsLeadQueryLimit(limitCount) {
  if (typeof limitCount !== "number" || !Number.isFinite(limitCount)) {
    return DEFAULT_OPS_LEAD_REPORTS_LIMIT;
  }
  const floored = Math.floor(limitCount);
  if (floored <= 0) {
    return DEFAULT_OPS_LEAD_REPORTS_LIMIT;
  }
  return Math.min(floored, MAX_OPS_LEAD_REPORTS_LIMIT);
}

/**
 * Firestore read and write operations for progress reports.
 */
export function createProgressReport(report) {
  const rawBranch = report?.branchId || report?.branch || DEFAULT_BRANCH_ID;
  const branchId = branchToId(rawBranch);
  const branch = idToBranch(branchId);
  return addDoc(collection(db, "progressReports"), {
    ...report,
    branchId,
    branch,
  });
}

export async function fetchInstructorProgressReports(instructorId) {
  if (!instructorId) return [];
  const q = query(collection(db, "progressReports"), where("instructorId", "==", instructorId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }))
    .sort(
      (a, b) =>
        new Date(b.examDate || b.submittedAt || 0).getTime() -
        new Date(a.examDate || a.submittedAt || 0).getTime()
    );
}

export async function fetchPendingPromotions(branchId = null, division = null) {
  const constraints = [where("eligibleForPromotion", "==", true)];
  if (branchId && branchId !== "all") {
    constraints.push(where("branchId", "==", branchToId(branchId)));
  }
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }
  const q = query(collection(db, "progressReports"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
}

export async function promoteStudentLevel(studentId, nextLevel, reportId = null, context = {}) {
  if (!studentId || !nextLevel) return;

  const pendingReportIds = new Set();
  if (reportId) {
    pendingReportIds.add(reportId);
  }

  // Resolve trusted branch and division scope from caller context
  const rawBranch = context?.branchId || context?.branch;
  const branchId = rawBranch ? branchToId(rawBranch) : null;
  const division = context?.division || null;

  // Build constraints according to caller's authorized scope.
  // Firestore rules require same-branch scoping for list operations by branch staff.
  const constraints = [
    where("studentId", "==", studentId),
    where("eligibleForPromotion", "==", true),
  ];

  if (branchId && branchId !== "all") {
    constraints.push(where("branchId", "==", branchId));
  }

  // Enforce division isolation strictly across both Courses and Kindergarten.
  // Constraining by division guarantees that same-branch Kindergarten reports for the same student
  // cannot be returned or touched by Courses staff, preserving cross-division isolation.
  //
  // Known Limitation: Filtering Courses by division == "courses" leaves legacy reports with
  // no division field out of the query. Those un-migrated records cannot be cleared by this
  // workflow. The proposed backfill is a separate data-migration task (see
  // docs/proposals/2026-10-17-legacy-progress-reports-division-backfill.md) left as a proposal
  // requiring its own scope and review to avoid scanning/writing many Firestore records.
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }

  // Option 1 Atomic Consolidation: Query all pending eligible reports for this student.
  // If querying fails, abort immediately before opening or committing any batch.
  const q = query(collection(db, "progressReports"), ...constraints);
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    pendingReportIds.add(d.id);
  }

  // Pre-commit guard: 1 student document + report updates must not exceed Firestore batch limit
  const totalWrites = 1 + pendingReportIds.size;
  if (totalWrites > FIRESTORE_BATCH_LIMIT) {
    throw new Error(
      `Promotion batch exceeds Firestore limit of ${FIRESTORE_BATCH_LIMIT} operations (${totalWrites} writes requested)`
    );
  }

  const batch = writeBatch(db);
  const studentRef = doc(db, "users", studentId);
  const stars = getStars(nextLevel);
  batch.update(studentRef, {
    currentLevel: nextLevel,
    rating: String(stars || 1),
    updatedAt: serverTimestamp(),
    promotedFromReport: reportId || "",
  });

  for (const rId of pendingReportIds) {
    const reportRef = doc(db, "progressReports", rId);
    batch.update(reportRef, {
      eligibleForPromotion: false,
      promotedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Fetches progress reports for the Operational Leader at Main Campus (OD-OPS-01 / G-013).
 *
 * Blueprint Authority & Governance:
 * - Authoritative Blueprint v3.4.1 (§6.8, §6.11, §26 G-013, §41)
 * - Ratified Owner Decision: OD-OPS-01 (2026-10-17)
 * - Scope: Main Campus (Kota Gorontalo) ONLY. Satellite branches return empty array.
 * - Access: Read-only ('get' and 'list') for 'courses' and 'kindergarten' divisions.
 *   Mutations (create, update, delete, level promotion) are strictly prohibited.
 *
 * Query Ordering & Legacy Data Limitation Notice:
 * - By default (orderByExamDate = true), queries use Firestore's composite index
 *   (branchId ASC, division ASC, examDate DESC).
 * - Firestore Indexing Limitation: In Firestore, queries with `orderBy("examDate")` or
 *   inequality filters `where("examDate", ">=", sinceDate)` automatically omit documents
 *   that do NOT have an `examDate` field (e.g. unindexed/unstamped legacy records).
 * - Safe Legacy Ingestion Strategy: To safely query legacy records without an `examDate` field,
 *   callers may pass `options.orderByExamDate = false` (with `since`/`windowDays` omitted).
 *   This emits a safe equality query (`where branchId == 'kota_gorontalo'`, `where division == div`,
 *   `limit(effectiveLimit)`), allowing documents missing `examDate` to be retrieved up to
 *   the hard limit and sorted client-side by fallback timestamps (submittedAt or createdAt).
 *
 * Spark Quota Protection:
 * - Hard limit enforced via resolveOpsLeadQueryLimit (default 50, max 50).
 * - Caller cannot disable the query limit with 0, negative values, or exceed MAX_OPS_LEAD_REPORTS_LIMIT.
 *
 * @param {string} branchId - The branch identifier (must normalize to "kota_gorontalo")
 * @param {"all" | "courses" | "kindergarten" | string} [divisionFilter="all"]
 * @param {object} [options={}]
 * @param {number} [options.limitCount=DEFAULT_OPS_LEAD_REPORTS_LIMIT] - Document read limit per query (max 50)
 * @param {number|null} [options.windowDays=null] - Date window in days
 * @param {number|null} [options.daysWindow=null] - Alias for windowDays
 * @param {string|null} [options.since=null] - Bounded start date (YYYY-MM-DD)
 * @param {boolean} [options.orderByExamDate=true] - Order by examDate desc if applicable
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function fetchOpsLeadProgressReports(branchId, divisionFilter = "all", options = {}) {
  const normBranchId = branchToId(branchId);
  if (normBranchId !== "kota_gorontalo") {
    // Non-main-campus branches have no authorized Ops Lead progress report access
    return [];
  }

  const {
    limitCount = DEFAULT_OPS_LEAD_REPORTS_LIMIT,
    windowDays = null,
    daysWindow = null,
    since = null,
    orderByExamDate = true,
  } = options || {};

  const effectiveLimit = resolveOpsLeadQueryLimit(limitCount);

  const effectiveWindowDays =
    typeof windowDays === "number" && windowDays > 0
      ? windowDays
      : typeof daysWindow === "number" && daysWindow > 0
      ? daysWindow
      : null;

  let sinceDate = null;
  if (since) {
    sinceDate = typeof since === "string" ? since.slice(0, 10) : since;
  } else if (effectiveWindowDays) {
    sinceDate = todayWita(new Date(Date.now() - effectiveWindowDays * 86400000));
  }

  const divisionsToFetch =
    divisionFilter === "courses"
      ? ["courses"]
      : divisionFilter === "kindergarten"
      ? ["kindergarten"]
      : ["courses", "kindergarten"];

  const queries = divisionsToFetch.map((div) => {
    /** @type {import('firebase/firestore').QueryConstraint[]} */
    const constraints = [
      where("branchId", "==", "kota_gorontalo"),
      where("division", "==", div),
    ];

    if (sinceDate) {
      constraints.push(where("examDate", ">=", sinceDate));
    }

    if (orderByExamDate) {
      constraints.push(orderBy("examDate", "desc"));
    }

    // Always enforce the hard maximum query limit to guard Spark read quotas
    constraints.push(limit(effectiveLimit));

    return query(collection(db, "progressReports"), ...constraints);
  });

  const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
  /** @type {Array<any>} */
  const allDocs = [];
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      allDocs.push({ id: d.id, ...d.data() });
    }
  }

  return allDocs.sort((a, b) => {
    const timeA = new Date(b.examDate || b.submittedAt || b.createdAt || 0).getTime();
    const timeB = new Date(a.examDate || a.submittedAt || a.createdAt || 0).getTime();
    return timeA - timeB;
  });
}

