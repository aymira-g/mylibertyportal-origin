import { db } from "../../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getStars } from "../shared/levels";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../constants/branches.js";

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

export async function fetchPendingPromotions(branchId = null) {
  const constraints = [where("eligibleForPromotion", "==", true)];
  if (branchId && branchId !== "all") {
    constraints.push(where("branchId", "==", branchToId(branchId)));
  }
  const q = query(collection(db, "progressReports"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
}

async function clearPromotionEligibility(reportId) {
  if (!reportId) return;
  const reportRef = doc(db, "progressReports", reportId);
  await updateDoc(reportRef, {
    eligibleForPromotion: false,
    promotedAt: serverTimestamp(),
  });
}

export async function promoteStudentLevel(studentId, nextLevel, reportId = null) {
  if (!studentId || !nextLevel) return;
  const studentRef = doc(db, "users", studentId);
  const stars = getStars(nextLevel);
  await updateDoc(studentRef, {
    currentLevel: nextLevel,
    rating: String(stars || 1),
    updatedAt: serverTimestamp(),
  });

  if (reportId) {
    await clearPromotionEligibility(reportId);
  }
}
