import { db } from "../../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { branchToId } from "../../../constants/branches.js";

/**
 * instructorLeaderRepository.js
 *
 * Data-access module for the Instructor Leader (branch-scope academic leadership)
 * dashboard. Pure Firestore access — no React, per docs/ARCHITECTURE.md §4
 * ("Repositories/data-access modules are the preferred home for direct Firestore
 * reads and writes", "Repositories should not import React").
 *
 * Authority boundary (verified against firestore.rules):
 * - `users`     list -> allowed for staff when role is in the instructor family and
 *                       the document is in the caller's branch (rules:320).
 * - `classes`   list -> allowed for staff at branch scope, both divisions (rules:423).
 * - `progressReports` list -> instructor-leader clause is SAME-BRANCH ONLY and requires
 *                       the query to carry `branchId` (isSameBranchStrict, rules:701).
 * - `classAttendance` read -> instructor-leader clause matches the REAL class document
 *                       (rules:577), so queries must be class-scoped, never branch-only.
 * - `shifts`    -> deliberately NOT read here. Shift documents carry cashReconciliation
 *                       fields and Firestore rules cannot hide individual fields.
 */

/** Roles that make up the branch academic teaching team. */
export const BRANCH_INSTRUCTOR_ROLES = ["instructor", "instructorleader", "instructor_leader"];

/** Bounded window for branch progress-report monitoring. */
export const PROGRESS_REPORT_LIMIT = 100;

/** Firestore `in` queries accept at most 30 values. */
const CLASS_ID_CHUNK_SIZE = 30;

/**
 * Live branch teaching team (both divisions).
 *
 * @param {string} branch
 * @param {(instructors: Array<any>) => void} onData
 * @param {((err: any) => void)} [onError]
 * @returns {() => void} Unsubscribe
 */
export function listenToBranchInstructors(branch, onData, onError) {
  const branchId = branchToId(branch);
  const q = query(
    collection(db, "users"),
    where("role", "in", BRANCH_INSTRUCTOR_ROLES),
    where("branchId", "==", branchId)
  );

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.warn("listenToBranchInstructors error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Live, bounded branch progress-report window (both divisions).
 *
 * Requires the composite index progressReports(branchId ASC, examDate DESC) in
 * firestore.indexes.json. If the index is not deployed the listener surfaces a
 * failed-precondition error, which the caller must present honestly rather than
 * showing an empty list.
 *
 * @param {string} branch
 * @param {(reports: Array<any>) => void} onData
 * @param {((err: any) => void)} [onError]
 * @param {{ limit?: number }} [options]
 * @returns {() => void} Unsubscribe
 */
export function listenToBranchProgressReports(branch, onData, onError, options = {}) {
  const branchId = branchToId(branch);
  const max = Number(options.limit) || PROGRESS_REPORT_LIMIT;

  const q = query(
    collection(db, "progressReports"),
    where("branchId", "==", branchId),
    orderBy("examDate", "desc"),
    limit(max)
  );

  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.warn("listenToBranchProgressReports error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * One-shot attendance read for an explicit, bounded set of classes on a single date.
 *
 * Deliberately a one-shot fetch rather than a listener: a branch-wide realtime
 * attendance listener would re-read the whole branch on every scan, and each
 * evaluated document costs a rules-level class lookup.
 *
 * @param {Array<string>} classIds
 * @param {string} attendanceDate - YYYY-MM-DD
 * @returns {Promise<Array<any>>}
 */
export async function fetchClassAttendanceForDate(classIds, attendanceDate) {
  const ids = (classIds || []).filter(Boolean);
  if (ids.length === 0 || !attendanceDate) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += CLASS_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CLASS_ID_CHUNK_SIZE));
  }

  const batches = await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await getDocs(
        query(
          collection(db, "classAttendance"),
          where("classId", "in", chunk),
          where("attendanceDate", "==", attendanceDate)
        )
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    })
  );

  return batches.flat();
}
