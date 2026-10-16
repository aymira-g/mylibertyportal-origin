import { db } from "../../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getStars } from "../shared/levels";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../constants/branches.js";

export const FIRESTORE_BATCH_LIMIT = 500;

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

