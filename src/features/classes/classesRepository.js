import { db } from "../../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  runTransaction,
} from "firebase/firestore";
import { getBatchAvailability } from "./batchAvailability";
import { todayWita } from "../../utils/dateWita.js";
import { batchSchema } from "../../schemas";
import { normalizeBatchType } from "../../constants/batchTypes.js";
import { branchToId, idToBranch } from "../../constants/branches.js";

/**
 * All direct Firestore writes for the `classes` collection — and the
 * student-level side effects that come with them — live here instead of
 * inside ClassManager.jsx. ClassManager handles state, forms and toasts;
 * this file handles "what actually happens in the database." Nothing here
 * knows about React — it only takes plain data in and returns promises.
 *
 * This is the first domain pulled out this way. The other components that
 * still call Firestore directly (PaymentModal, StudentApplications, etc.)
 * are unchanged for now — same pattern, applied one domain at a time.
 */

// NOTE (Phase 3 / F-11): `syncStudentsCurrentLevel(studentIds, level)` was REMOVED here.
// It wrote the target class's level onto every enrolled student's `users.currentLevel`,
// inverting the authority OD-FO-3 ratifies: a student's level is an academic fact owned
// by instructor assessment and recorded placement, never a side effect of class placement.
// Class-side level lives on the class and in its `enrollments` entries.

export async function createClass(classData) {
  const validated = batchSchema.parse(classData);
  return addDoc(collection(db, "classes"), validated);
}

export function updateClass(classId, updateData) {
  let branchPatch = {};
  if (updateData.branchId || updateData.branch) {
    const canonicalId = branchToId(updateData.branchId || updateData.branch);
    branchPatch = {
      branchId: canonicalId,
      branch: idToBranch(canonicalId),
    };
  }

  const normalized = {
    ...updateData,
    ...branchPatch,
    ...(Object.prototype.hasOwnProperty.call(updateData, "batchType")
      ? { batchType: normalizeBatchType(updateData.batchType) }
      : {}),
  };
  return updateDoc(doc(db, "classes", classId), normalized);
}

export function deleteClass(classId) {
  return deleteDoc(doc(db, "classes", classId));
}

export function addStudentToClass(classId, { studentId, dateJoined, level }) {
  return runTransaction(db, async (tx) => {
    const classRef = doc(db, "classes", classId);
    const classSnap = await tx.get(classRef);
    if (!classSnap.exists()) {
      throw new Error("Class not found.");
    }

    const classData = classSnap.data();
    const availability = getBatchAvailability(classData);
    if (!availability.canEnroll) {
      throw new Error("Class is full or unavailable for enrollment.");
    }

    const currentStudentIds = classData.studentIds || [];
    if (currentStudentIds.includes(studentId)) {
      // Already enrolled, no-op
      return;
    }

    tx.update(classRef, {
      studentIds: arrayUnion(studentId),
      enrollments: arrayUnion({ studentId, dateJoined, level }),
      updatedAt: new Date().toISOString(),
    });
  });
}

export function removeStudentFromClass(cls, studentId) {
  const classId = typeof cls === "string" ? cls : cls?.id;
  if (!classId) throw new Error("Class ID is required to remove student.");

  return runTransaction(db, async (tx) => {
    const classRef = doc(db, "classes", classId);
    const snap = await tx.get(classRef);
    const liveClass = snap.exists() ? snap.data() : (typeof cls === "object" ? cls : {});

    const updatedStudentIds = (liveClass.studentIds || []).filter((id) => id !== studentId);
    const updatedEnrollments = (liveClass.enrollments || []).filter(
      (e) => e.studentId !== studentId
    );

    tx.update(classRef, {
      studentIds: updatedStudentIds,
      enrollments: updatedEnrollments,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function setClassGroupLevel(classItems, level) {
  return Promise.all(
    classItems.map((cls) =>
      updateDoc(doc(db, "classes", cls.id), {
        classLevel: level,
        enrollments: (cls.enrollments || []).map((en) => ({ ...en, level })),
      })
    )
  );
}

/**
 * Atomically transfers a student from a source class to a target class.
 * Uses runTransaction to re-read both live class documents and guarantee concurrency safety,
 * updating studentIds, enrollments, and updatedAt atomically.
 */
export async function transferStudentBetweenClasses({
  sourceClass,
  targetClassId,
  targetClass,
  studentId,
  dateTransferred = todayWita(),
  newLevel = null,
  transferReason = "",
}) {
  const sourceClassId = typeof sourceClass === "string" ? sourceClass : sourceClass?.id;
  if (!sourceClassId) {
    throw new Error("Source class is required for transfer.");
  }
  if (sourceClassId === targetClassId) {
    throw new Error("Cannot transfer a student to the same class.");
  }

  await runTransaction(db, async (tx) => {
    const sourceRef = doc(db, "classes", sourceClassId);
    const targetRef = doc(db, "classes", targetClassId);

    const [sourceSnap, targetSnap] = await Promise.all([
      tx.get(sourceRef),
      tx.get(targetRef),
    ]);

    const liveSource = sourceSnap.exists()
      ? sourceSnap.data()
      : (typeof sourceClass === "object" ? sourceClass : {});
    const liveTarget = targetSnap.exists()
      ? targetSnap.data()
      : (typeof targetClass === "object" ? targetClass : {});

    const sourceStudentIds = liveSource.studentIds || [];
    if (!sourceStudentIds.includes(studentId)) {
      throw new Error("Student is not enrolled in the source class.");
    }

    if (!getBatchAvailability(liveTarget).canEnroll) {
      throw new Error("Target class is full or unavailable for enrollment.");
    }

    const now = new Date().toISOString();

    // 1. Remove student from source class
    const updatedSourceStudentIds = sourceStudentIds.filter((id) => id !== studentId);
    const updatedSourceEnrollments = (liveSource.enrollments || []).filter(
      (e) => e.studentId !== studentId
    );
    tx.update(sourceRef, {
      studentIds: updatedSourceStudentIds,
      enrollments: updatedSourceEnrollments,
      updatedAt: now,
    });

    // 2. Add student to target class
    const targetLevel = newLevel || liveTarget.classLevel || liveSource.classLevel || "warrior";
    const enrollmentRecord = {
      studentId,
      dateJoined: dateTransferred,
      level: targetLevel,
      transferredFrom: liveSource.className || sourceClass?.className || sourceClassId,
    };
    if (transferReason && transferReason.trim()) {
      enrollmentRecord.transferReason = transferReason.trim();
    }

    tx.update(targetRef, {
      studentIds: arrayUnion(studentId),
      enrollments: arrayUnion(enrollmentRecord),
      updatedAt: now,
    });
  });

  // NOTE (Phase 3 / F-11): this function deliberately does NOT write the student's
  // `currentLevel`. Class placement and assessed level are separate concepts; the
  // enrollment record above already carries the class-side `level`. The previous
  // syncStudentsCurrentLevel() call here overwrote the academic record with the class
  // level, which is the authority inversion OD-FO-3 forbids.
}
