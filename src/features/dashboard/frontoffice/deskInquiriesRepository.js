import { db, auth } from "../../../firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { deskInquirySchema } from "../../../schemas/deskInquirySchema";
import { recommendLevelFromScore } from "../../../constants/levels";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../../constants/branches";
import {
  isPermissionError,
  updateLocalInquiry,
  deleteLocalInquiry,
  getLocalInquiries,
} from "./walkInUtils";

/**
 * Repository for Front Office walk-in visitor & prospect inquiries (/deskInquiries).
 */

export async function fetchRecentDeskInquiries(limitCount = 50, branchId = null, division = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const constraints = [];
  if (normalizedBranchId) {
    constraints.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }

  try {
    const q = query(
      collection(db, "deskInquiries"),
      ...constraints,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      throw err;
    }
    console.warn("fetchRecentDeskInquiries fallback without orderBy:", err?.message);
    const fallbackConstraints = [];
    if (normalizedBranchId) {
      fallbackConstraints.push(where("branchId", "==", normalizedBranchId));
    }
    if (division && division !== "all") {
      fallbackConstraints.push(where("division", "==", division));
    }
    fallbackConstraints.push(limit(limitCount));
    const q = query(collection(db, "deskInquiries"), ...fallbackConstraints);
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }
}

/**
 * @param {Record<string, any>} inquiryData
 * @returns {Promise<import('./walkInUtils').DeskInquiryItem>}
 */
export async function createDeskInquiry(inquiryData) {
  const currentUser = auth.currentUser;
  const rawBranch = inquiryData.branch || inquiryData.branchId || DEFAULT_BRANCH_ID;
  const branchId = branchToId(rawBranch);
  const branch = idToBranch(branchId);

  const parseResult = deskInquirySchema.safeParse({
    ...inquiryData,
    branch,
    branchId,
    createdAt: new Date().toISOString(),
    createdBy: currentUser?.uid || "frontoffice",
    createdByName: currentUser?.displayName || currentUser?.email || "Front Desk",
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues?.[0];
    const errorMsg = firstIssue?.message || "Invalid inquiry data provided.";
    throw new Error(errorMsg);
  }

  const validated = parseResult.data;
  const docRef = await addDoc(collection(db, "deskInquiries"), validated);
  return { id: docRef.id, ...validated };
}

export async function updateDeskInquiryStatus(inquiryId, newStatus) {
  if (!inquiryId) throw new Error("Inquiry ID is required");
  if (newStatus === "enrolled") {
    throw new Error(
      "Cannot set inquiry status to 'enrolled' directly without a registered student ID. Use markInquiryConverted."
    );
  }
  const currentUser = auth.currentUser;
  const updateData = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.uid || "frontoffice",
  };

  if (inquiryId.startsWith("local-")) {
    updateLocalInquiry(inquiryId, updateData);
    return { id: inquiryId, ...updateData };
  }

  await updateDoc(doc(db, "deskInquiries", inquiryId), updateData);
  return { id: inquiryId, ...updateData };
}

/**
 * Reads the stored inquiry. Local ("local-") shadow records are read from storage so
 * neither path pays for an extra read.
 */
async function readStoredInquiry(inquiryId) {
  if (inquiryId.startsWith("local-")) {
    const localInquiries = getLocalInquiries();
    return localInquiries.find((i) => i.id === inquiryId) || {};
  }
  const snap = await getDoc(doc(db, "deskInquiries", inquiryId));
  return snap.exists() ? snap.data() : {};
}

/**
 * Appends a placement test result into the inquiry's placementTests array and, for an
 * ordinary assessment, sets `currentLevel` to the assessed level.
 *
 * An assessed level the recorded score does not imply is a **placement level override**.
 * It may only take effect through an approved PLACEMENT_LEVEL_OVERRIDE envelope, so this
 * function does not write `currentLevel` for one: it parks the request on the inquiry as
 * `pendingPlacementOverride` (which also blocks enrollment until the Instructor Leader
 * decides), and `firestore.rules` independently refuses any other `currentLevel` change.
 * Kindergarten placement is tier/age based and is never an override.
 *
 * @param {string} inquiryId
 * @param {{
 *   score?: number|string|null,
 *   assessedLevel?: string,
 *   testedBy?: string,
 *   testedAt?: string,
 *   notes?: string,
 *   isOverride?: boolean,
 *   approvalId?: string,
 * }} testData
 * @returns {Promise<any>} The written inquiry fields
 */
export async function addPlacementTestToInquiry(inquiryId, testData) {
  if (!inquiryId) throw new Error("Inquiry ID is required");
  const currentUser = auth.currentUser;
  const testRecord = {
    id: `pt-${Date.now()}`,
    score: testData.score !== "" && testData.score != null ? Number(testData.score) : null,
    assessedLevel: testData.assessedLevel?.trim() || "",
    testedBy: testData.testedBy?.trim() || currentUser?.displayName || currentUser?.email || "Staff",
    testedAt: testData.testedAt || new Date().toISOString().split("T")[0],
    notes: testData.notes?.trim() || "",
  };

  const stored = await readStoredInquiry(inquiryId);
  const isKindergarten = stored?.division === "kindergarten";
  const impliedLevel = recommendLevelFromScore(testRecord.score, { isKindergarten });
  // Kindergarten has no score rubric, so nothing there can be an override. For a course,
  // a level the score does not imply *is* an override — including a level chosen with no
  // score at all, which would otherwise be an easy way around the gate.
  const isOverride =
    !isKindergarten &&
    Boolean(testRecord.assessedLevel) &&
    testRecord.assessedLevel !== impliedLevel;

  if (isOverride) {
    const approvalId = testData.approvalId || null;
    if (!approvalId) {
      throw new Error(
        "A placement level override needs an approved Instructor Leader ticket before it can be recorded."
      );
    }
    const pendingUpdate = {
      pendingPlacementOverride: {
        approvalId,
        assessedLevel: testRecord.assessedLevel,
        recommendedLevel: impliedLevel,
        score: testRecord.score,
        notes: testRecord.notes,
        testedBy: testRecord.testedBy,
        testedAt: testRecord.testedAt,
        requestedAt: new Date().toISOString(),
        requestedByUid: currentUser?.uid || null,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || "frontoffice",
    };
    if (inquiryId.startsWith("local-")) {
      updateLocalInquiry(inquiryId, pendingUpdate);
    } else {
      // No local-shadow fallback here on purpose: a governed action must never appear
      // to have succeeded when the rules refused it.
      await updateDoc(doc(db, "deskInquiries", inquiryId), pendingUpdate);
    }
    return { id: inquiryId, ...pendingUpdate };
  }

  const updateData = {
    placementTests: [testRecord], // fallback will merge
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.uid || "frontoffice",
  };

  if (testRecord.assessedLevel) {
    updateData.currentLevel = testRecord.assessedLevel;
    // The score `firestore.rules` derives the assessed level from, written together
    // with currentLevel so an ordinary assessment can never contradict its own score.
    updateData.latestPlacementScore = testRecord.score;
  }

  const existingTests = Array.isArray(stored?.placementTests) ? stored.placementTests : [];

  if (inquiryId.startsWith("local-")) {
    updateData.placementTests = [...existingTests, testRecord];
    updateLocalInquiry(inquiryId, updateData);
    return { id: inquiryId, ...updateData };
  }

  const finalUpdate = {
    ...updateData,
    placementTests: [...existingTests, testRecord],
  };
  await updateDoc(doc(db, "deskInquiries", inquiryId), finalUpdate);
  return { id: inquiryId, ...finalUpdate };
}

/**
 * Applies an Instructor-Leader-approved PLACEMENT_LEVEL_OVERRIDE: the only path that may
 * set a walk-in's effective level to one the recorded score does not imply. It writes
 * `appliedFromApproval`, which `firestore.rules` requires for any such `currentLevel`
 * change. Mirrors `applyApprovedShiftCorrection` in shiftsRepository.
 *
 * @param {{ approval: any, actorUid?: string|null }} params
 * @returns {Promise<any>} The written inquiry fields
 */
export async function applyApprovedPlacementOverride({ approval, actorUid = null }) {
  const inquiryId = approval?.payload?.inquiryId;
  const level = approval?.payload?.assessedLevel;
  if (!inquiryId || !level) {
    throw new Error("The approval does not identify an inquiry and level to apply.");
  }

  const inqRef = doc(db, "deskInquiries", inquiryId);
  const snap = await getDoc(inqRef);
  if (!snap.exists()) throw new Error("The inquiry no longer exists.");

  const payload = approval.payload;
  const existingTests = Array.isArray(snap.data().placementTests)
    ? snap.data().placementTests
    : [];
  const testRecord = {
    id: `pt-${Date.now()}`,
    score: typeof payload.score === "number" ? payload.score : null,
    assessedLevel: level,
    testedBy: payload.testedBy || "Front Desk Staff",
    testedAt: payload.testedAt || new Date().toISOString().split("T")[0],
    notes: payload.notes || "",
    approvedOverrideRef: approval.id || null,
  };

  const finalUpdate = {
    currentLevel: level,
    appliedFromApproval: approval.id || null,
    placementTests: [...existingTests, testRecord],
    pendingPlacementOverride: null,
    updatedAt: new Date().toISOString(),
    updatedBy: actorUid || "instructorleader",
  };

  await updateDoc(inqRef, finalUpdate);
  return { id: inquiryId, ...finalUpdate };
}

/**
 * Clears a parked placement override when its ticket is rejected, so the inquiry does
 * not stay blocked on a decision that will never arrive.
 */
export async function clearPendingPlacementOverride(inquiryId, actorUid = null) {
  if (!inquiryId) throw new Error("Inquiry ID is required");
  const update = {
    pendingPlacementOverride: null,
    updatedAt: new Date().toISOString(),
    updatedBy: actorUid || "instructorleader",
  };
  await updateDoc(doc(db, "deskInquiries", inquiryId), update);
  return { id: inquiryId, ...update };
}

/**
 * Marks an inquiry as converted to student, recording convertedStudentId and timestamp.
 */
export async function markInquiryConverted(inquiryId, studentId) {
  if (!inquiryId) throw new Error("Inquiry ID is required");
  if (!studentId || typeof studentId !== "string" || !studentId.trim()) {
    throw new Error("Cannot mark inquiry as converted without a valid student ID.");
  }
  const cleanStudentId = studentId.trim();
  const currentUser = auth.currentUser;
  const updateData = {
    status: "enrolled",
    convertedStudentId: cleanStudentId,
    convertedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.uid || "frontoffice",
  };

  if (inquiryId.startsWith("local-")) {
    updateLocalInquiry(inquiryId, updateData);
    return { id: inquiryId, ...updateData };
  }

  await updateDoc(doc(db, "deskInquiries", inquiryId), updateData);
  return { id: inquiryId, ...updateData };
}

export async function deleteDeskInquiry(inquiryId) {
  if (!inquiryId) throw new Error("Inquiry ID is required");

  if (inquiryId.startsWith("local-")) {
    deleteLocalInquiry(inquiryId);
    return inquiryId;
  }

  await deleteDoc(doc(db, "deskInquiries", inquiryId));
  deleteLocalInquiry(inquiryId);
  return inquiryId;
}

