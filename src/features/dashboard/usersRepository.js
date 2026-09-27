import { auth, db, getSecondaryAuth } from "../../firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  writeBatch,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../constants/branches";
import {
  createParentPayloadSchema,
  parentUserSchema,
  parentChildLinkSchema,
} from "../../schemas/parentSchema";

/**
 * Normalizes user payload to include both branch and branchId.
 */
function normalizeUserBranchFields(data) {
  if (!data || typeof data !== "object") return data;
  const rawBranch = data.branch || data.branchId || DEFAULT_BRANCH_ID;
  const branchId = branchToId(rawBranch);
  const branch = idToBranch(branchId);
  return {
    ...data,
    branchId,
    branch,
  };
}

/**
 * All direct Firestore writes (and the one Firebase Auth call) for
 * managing user records — both students and staff — live here instead of
 * inside useDashboardData.js. Same pattern as every other domain
 * repository in this app.
 */

export function saveStudentRecord(editId, studentData) {
  const payload = normalizeUserBranchFields(studentData);
  return editId
    ? setDoc(doc(db, "users", editId), payload, { merge: true })
    : addDoc(collection(db, "users"), payload);
}

export function updateStaffRecord(uid, staffData) {
  const payload = normalizeUserBranchFields(staffData);
  return setDoc(doc(db, "users", uid), payload, { merge: true });
}

export function updateStaffStatus(uid, status, updatedBy = auth.currentUser?.uid || null) {
  return setDoc(
    doc(db, "users", uid),
    {
      status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: updatedBy,
    },
    { merge: true }
  );
}

export function updateStudentStatus(uid, status, updatedBy = auth.currentUser?.uid || null) {
  return setDoc(
    doc(db, "users", uid),
    {
      status,
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedBy: updatedBy,
    },
    { merge: true }
  );
}

/**
 * Checks whether a staff member has recorded attendance shift or leave documents.
 * Used as an async guardrail before hard-deleting a profile to prevent orphaned history.
 * Fails closed on query errors to prevent accidental data loss.
 */
export async function checkStaffHasAttendanceHistory(uid) {
  if (!uid) return { hasShifts: false, hasLeave: false, error: null };
  try {
    const shiftsQuery = query(collection(db, "shifts"), where("userId", "==", uid), limit(1));
    const leaveQuery = query(collection(db, "staffLeave"), where("userId", "==", uid), limit(1));
    const [shiftsSnap, leaveSnap] = await Promise.all([getDocs(shiftsQuery), getDocs(leaveQuery)]);
    return {
      hasShifts: !shiftsSnap.empty,
      hasLeave: !leaveSnap.empty,
      error: null,
    };
  } catch (err) {
    console.warn("Failed checking staff attendance history:", err);
    return { hasShifts: false, hasLeave: false, error: err.message };
  }
}

/**
 * Checks whether a student has historical payment, attendance, or academic report records.
 * Used as an async guardrail before hard-deleting a student profile.
 * Fails closed on query errors to prevent accidental data loss.
 */
export async function checkStudentHasHistory(uid, branchId = null) {
  if (!uid) return { hasPayments: false, hasAttendance: false, hasReports: false, error: null };
  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      ...(branchId ? [where("branchId", "==", branchId)] : []),
      where("studentId", "==", uid),
      limit(1)
    );
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("userId", "==", uid),
      limit(1)
    );
    const reportsQuery = query(
      collection(db, "progressReports"),
      where("studentId", "==", uid),
      limit(1)
    );
    const [paymentsSnap, attendanceSnap, reportsSnap] = await Promise.all([
      getDocs(paymentsQuery),
      getDocs(attendanceQuery),
      getDocs(reportsQuery),
    ]);
    return {
      hasPayments: !paymentsSnap.empty,
      hasAttendance: !attendanceSnap.empty,
      hasReports: !reportsSnap.empty,
      error: null,
    };
  } catch (err) {
    console.warn("Failed checking student history:", err);
    return { hasPayments: false, hasAttendance: false, hasReports: false, error: err.message };
  }
}

/**
 * Creating a new staff account means creating the Firebase Auth account
 * FIRST (via the secondary auth instance, so the admin doing this stays
 * signed in), then separately writing the Firestore profile.
 */
export async function createStaffAccount(email, password, staffData) {
  const secAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secAuth, email, password);
  const payload = normalizeUserBranchFields(staffData);

  try {
    await setDoc(doc(db, "users", cred.user.uid), payload, { merge: true });
  } catch (err) {
    throw new Error(
      `Account was created in Firebase Auth, but saving the profile failed: ${err.message}. ` +
        `An admin must finish this manually in the Firebase Console, or delete the Auth account and try again.`,
      { cause: err }
    );
  }

  return cred.user.uid;
}

/**
 * Deletes a user profile and scrubs any active enrollment references from
 * the /classes collection in an atomic batch to avoid leaving orphaned
 * student IDs in class rosters.
 */
export async function deleteUserProfile(uid) {
  if (!uid) return;

  // Find all classes where this student is currently enrolled
  const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", uid));
  const classesSnap = await getDocs(classesQuery);

  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uid));

  const now = new Date().toISOString();
  for (const classDoc of classesSnap.docs) {
    const classData = classDoc.data();
    const updatedStudentIds = (classData.studentIds || []).filter((id) => id !== uid);
    const updatedEnrollments = (classData.enrollments || []).filter((e) => e.studentId !== uid);
    batch.update(classDoc.ref, {
      studentIds: updatedStudentIds,
      enrollments: updatedEnrollments,
      updatedAt: now,
    });
  }

  return batch.commit();
}

/**
 * Creates an authenticated parent account via secondary Firebase Auth instance
 * and saves their profile with role: "parent" and initial child linkage.
 * Prevents session logout for the current staff user.
 *
 * @param {string} email
 * @param {string} password
 * @param {Record<string, any>} parentData
 * @returns {Promise<string>} Created parent UID
 */
export async function createParentAccount(email, password, parentData) {
  // Validate parent creation payload prior to creating Auth user
  const input = createParentPayloadSchema.parse({
    email,
    password,
    ...parentData,
  });

  const secAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secAuth, input.email, input.password);

  const initialChildren = [];
  if (parentData.initialChildStudentId) {
    initialChildren.push(parentData.initialChildStudentId);
  } else if (Array.isArray(parentData.childStudentIds)) {
    initialChildren.push(...parentData.childStudentIds);
  }

  // Canonicalize branch fields (convert branch name or branchId to slug and canonical display name)
  const rawBranch = parentData.branchId || parentData.branch || DEFAULT_BRANCH_ID;
  const canonicalBranchId = branchToId(rawBranch);
  const canonicalBranch = idToBranch(canonicalBranchId);

  const now = new Date().toISOString();
  const rawPayload = {
    displayName: (input.displayName || "").trim(),
    email: input.email.trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    role: "parent",
    childStudentIds: initialChildren,
    status: input.status || "active",
    branchId: canonicalBranchId,
    branch: canonicalBranch,
    createdAt: now,
    updatedAt: now,
  };

  const payload = parentUserSchema.parse(rawPayload);

  try {
    await setDoc(doc(db, "users", cred.user.uid), payload, { merge: true });
  } catch (err) {
    throw new Error(
      `Parent account created in Firebase Auth, but saving user doc failed: ${err.message}.`,
      { cause: err }
    );
  }

  return cred.user.uid;
}

/**
 * Updates an existing parent profile with a restricted field set.
 * Uses merge to preserve any fields not included in the update payload.
 *
 * @param {string} uid
 * @param {Record<string, any>} parentData
 */
export function updateParentRecord(uid, parentData) {
  const rawBranch = parentData.branchId || parentData.branch || DEFAULT_BRANCH_ID;
  const canonicalBranchId = branchToId(rawBranch);
  const canonicalBranch = idToBranch(canonicalBranchId);

  const payload = {
    displayName: (parentData.displayName || "").trim(),
    phone: (parentData.phone || "").trim(),
    status: parentData.status || "active",
    branchId: canonicalBranchId,
    branch: canonicalBranch,
    updatedAt: new Date().toISOString(),
  };

  return setDoc(doc(db, "users", uid), payload, { merge: true });
}

/**
 * Links a student to a parent's childStudentIds list.
 *
 * @param {string} parentUid
 * @param {string} studentId
 */
export function linkChildToParent(parentUid, studentId) {
  const parsed = parentChildLinkSchema.parse({ parentUid, studentId });
  return setDoc(
    doc(db, "users", parsed.parentUid),
    {
      childStudentIds: arrayUnion(parsed.studentId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Unlinks a student from a parent's childStudentIds list.
 *
 * @param {string} parentUid
 * @param {string} studentId
 */
export function unlinkChildFromParent(parentUid, studentId) {
  const parsed = parentChildLinkSchema.parse({ parentUid, studentId });
  return setDoc(
    doc(db, "users", parsed.parentUid),
    {
      childStudentIds: arrayRemove(parsed.studentId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Retrieves the list of student IDs linked to a parent.
 *
 * @param {string} parentUid
 * @returns {Promise<string[]>}
 */
export async function getParentLinkedStudents(parentUid) {
  if (!parentUid) return [];
  const snap = await getDoc(doc(db, "users", parentUid));
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data?.childStudentIds) ? data.childStudentIds : [];
}

/**
 * Queries parent user documents linked to a specific student ID, optionally constrained by branch.
 *
 * @param {string} studentId
 * @param {string} [branchId]
 * @returns {Promise<Array<{ id: string, [key: string]: any }>>}
 */
export async function findParentsForStudent(studentId, branchId = null) {
  if (!studentId) return [];
  const constraints = [
    where("role", "==", "parent"),
    where("childStudentIds", "array-contains", studentId),
  ];
  if (branchId) {
    constraints.push(where("branchId", "==", branchId));
  }
  const q = query(collection(db, "users"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Queries parent user documents, optionally filtered by branch.
 *
 * @param {string} [branchId]
 * @returns {Promise<Array<{ id: string, [key: string]: any }>>}
 */
export async function fetchAllParents(branchId = null) {
  const constraints = [where("role", "==", "parent")];
  if (branchId) {
    constraints.push(where("branchId", "==", branchId));
  }
  const q = query(collection(db, "users"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

