import { db, auth } from "../../firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { APPROVAL_STATUS, APPROVAL_ROLES } from "./approvalGates";
import { branchToId, DEFAULT_BRANCH_ID } from "../../constants/branches";
import { normalizeRole, isExecutiveRole } from "./roles";

const COLLECTION_NAME = "approvals";

/**
 * Submits an approval envelope to the Firestore /approvals collection.
 *
 * @param {any} envelope
 * @returns {Promise<{ id: string, [key: string]: any }>}
 */
export async function submitApprovalRequest(envelope) {
  if (!envelope || !envelope.actionId) {
    throw new Error("Invalid approval envelope submitted.");
  }

  const payload = {
    ...envelope,
    status: APPROVAL_STATUS.PENDING,
    approverBranchId: envelope.approverBranchId ? branchToId(envelope.approverBranchId) : null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
  return { id: docRef?.id || "approval-id", ...payload };
}

/**
 * Subscribes to pending approval requests matching the approver's role and branch.
 * Executives (Director, Vice Director, Admin) receive all pending approvals province-wide;
 * Branch Managers receive approvals scoped to their branch.
 *
 * @param {string} userRole
 * @param {string} branchId
 * @param {((approvals: any[]) => void)} onData
 * @param {((err: any) => void)} [onError]
 * @returns {(() => void)} Unsubscribe callback
 */
export function listenToPendingApprovals(userRole, branchId, onData, onError) {
  const normalizedRole = normalizeRole(userRole);
  const normalizedBranch = branchId ? branchToId(branchId) : DEFAULT_BRANCH_ID;

  const constraints = [where("status", "==", APPROVAL_STATUS.PENDING)];

  if (!isExecutiveRole(normalizedRole)) {
    if (normalizedRole === "manager") {
      constraints.push(where("approverRole", "in", [APPROVAL_ROLES.BRANCH_MANAGER, APPROVAL_ROLES.OPS_LEAD, "ops_lead"]));
      constraints.push(where("approverBranchId", "==", normalizedBranch));
    } else if (normalizedRole === "instructorleader") {
      constraints.push(where("approverRole", "in", [APPROVAL_ROLES.INSTRUCTOR_LEADER, "instructor_leader"]));
      constraints.push(where("approverBranchId", "==", normalizedBranch));
    } else if (normalizedRole === "frontoffice" || normalizedRole === "opslead") {
      constraints.push(where("approverRole", "in", [APPROVAL_ROLES.OPS_LEAD, "ops_lead"]));
      constraints.push(where("approverBranchId", "==", normalizedBranch));
    }
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);

  return onSnapshot(
    q,
    (snap) => {
      /** @type {any[]} */
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      onData(items);
    },
    (err) => {
      console.warn("listenToPendingApprovals error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Approves a pending approval request.
 *
 * @param {string} approvalId
 * @param {{ approverUid?: string, approverName?: string, notes?: string }} [decisionData]
 */
export async function approveApprovalRequest(approvalId, decisionData = {}) {
  if (!approvalId) throw new Error("Approval ID is required");
  const currentUser = auth.currentUser;

  const updatePayload = {
    status: APPROVAL_STATUS.APPROVED,
    decidedBy: decisionData.approverName || currentUser?.displayName || currentUser?.email || "Approver",
    decidedByUid: decisionData.approverUid || currentUser?.uid || "approver",
    decidedAt: new Date().toISOString(),
    decisionNotes: decisionData.notes || "",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, COLLECTION_NAME, approvalId), updatePayload);
  return { id: approvalId, ...updatePayload };
}

/**
 * Rejects a pending approval request.
 *
 * @param {string} approvalId
 * @param {{ approverUid?: string, approverName?: string, reason?: string }} [decisionData]
 */
export async function rejectApprovalRequest(approvalId, decisionData = {}) {
  if (!approvalId) throw new Error("Approval ID is required");
  const currentUser = auth.currentUser;

  const updatePayload = {
    status: APPROVAL_STATUS.REJECTED,
    decidedBy: decisionData.approverName || currentUser?.displayName || currentUser?.email || "Approver",
    decidedByUid: decisionData.approverUid || currentUser?.uid || "approver",
    decidedAt: new Date().toISOString(),
    rejectionReason: decisionData.reason || "",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, COLLECTION_NAME, approvalId), updatePayload);
  return { id: approvalId, ...updatePayload };
}

/**
 * Checks if the current authenticated user has an active pending staff onboarding request.
 *
 * @param {string} uid
 * @returns {Promise<any|null>}
 */
export async function checkUserPendingStaffRequest(uid) {
  if (!uid) return null;
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("requestedByUid", "==", uid),
      where("actionId", "==", "NEW_STAFF_ACCOUNT"),
      where("status", "==", APPROVAL_STATUS.PENDING)
    );
    const { getDocs } = await import("firebase/firestore");
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (err) {
    console.warn("checkUserPendingStaffRequest error:", err);
    return null;
  }
}

/**
 * Submits a new staff onboarding approval request for an authenticated user with no assigned role.
 *
 * @param {{ uid: string, email: string, displayName?: string, photoURL?: string }} params
 */
export async function submitStaffOnboardingRequest({ uid, email, displayName = "", photoURL = "" }) {
  if (!uid || !email) {
    throw new Error("UID and Email are required to request staff account authorization.");
  }

  const envelope = {
    actionId: "NEW_STAFF_ACCOUNT",
    label: "New Staff Account Request",
    domain: "staff",
    mode: "blocking",
    approverRole: "admin",
    approverBranchId: null, // Admin queue
    requestedBy: displayName || email,
    requestedByUid: uid,
    requestedAt: new Date().toISOString(),
    reason: `Google Sign-In account (${email}) requesting staff onboarding access.`,
    payload: {
      uid,
      email,
      displayName: displayName || email.split("@")[0],
      photoURL: photoURL || "",
    },
  };

  return submitApprovalRequest(envelope);
}

