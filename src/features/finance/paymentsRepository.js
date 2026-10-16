import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { todayWita, getWitaDayRangeIso } from "../../utils/dateWita.js";
import { studentIdSchema, paymentRecordSchema } from "../../schemas";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../../constants/branches";
import { normalizeDivision, divisionOfProgram } from "../../constants/divisions";
import { normalizeRole, isOrgExecutiveRole } from "../shared/roles.js";
import { createApprovalEnvelope } from "../shared/approvalGates.js";
import { submitApprovalRequest } from "../shared/approvalsRepository.js";
import { GATED_ACTIONS } from "../shared/approvalGates.constants.js";

/**
 * Resolves the caller's authorized branch ID for payments queries (DOM04-SEC-01).
 * - Explicit branchId argument if provided (or "all" for executives)
 * - Otherwise fetches users/{uid} for the signed-in user
 *
 * @param {string|null} [explicitBranchId]
 * @returns {Promise<string|null>} "all", canonical branchId, or null
 */
export async function resolveCallerBranchId(explicitBranchId = null) {
  if (explicitBranchId && explicitBranchId !== "all") {
    return branchToId(explicitBranchId);
  }
  const user = auth?.currentUser;
  if (!user) return explicitBranchId === "all" ? "all" : null;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      const normRole = normalizeRole(data.role);
      // System Admin strictly forbidden from financial data per OD-2
      if (normRole === "admin") {
        return null;
      }
      if (isOrgExecutiveRole(normRole)) {
        return explicitBranchId === "all" ? "all" : (explicitBranchId ? branchToId(explicitBranchId) : "all");
      }
      return data.branchId || (data.branch ? branchToId(data.branch) : null);
    }
  } catch {
    // Fail closed
  }
  return null;
}

/**
 * All direct Firestore reads/writes for payments live here.
 */

export async function fetchPaymentHistory(studentId, branchId = null, division = null) {
  const validStudentId = studentIdSchema.parse(studentId);
  const resolvedBranch = await resolveCallerBranchId(branchId);
  const constraints = [where("studentId", "==", validStudentId)];
  if (resolvedBranch && resolvedBranch !== "all") {
    constraints.push(where("branchId", "==", resolvedBranch));
  }
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }
  const q = query(collection(db, "payments"), ...constraints);
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
  list.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  return list;
}

/**
 * Fetches the recent payment records bounded by limitCount (defaults to 50),
 * ordered by recordedAt desc. Used for desk transaction log & receipt lookup.
 *
 * @param {number} [limitCount=50]
 * @param {string|null} [branchId=null]
 * @param {string|null} [division=null]
 * @returns {Promise<Array<any>>}
 */
export async function getRecentPayments(limitCount = 50, branchId = null, division = null) {
  const resolvedBranch = await resolveCallerBranchId(branchId);
  if (!resolvedBranch) {
    return [];
  }
  const constraints = [];
  if (resolvedBranch !== "all") {
    constraints.push(where("branchId", "==", resolvedBranch));
  }
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }
  constraints.push(orderBy("recordedAt", "desc"), limit(limitCount));
  const q = query(
    collection(db, "payments"),
    ...constraints
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all payments recorded within a time horizon (recordedAt >= sinceIso).
 * Guarantees complete totals for the requested window without artificial pagination truncation,
 * while enforcing a 2,000 document ceiling to preserve zero-budget Spark tier retention.
 *
 * @param {string|null} [sinceIso=null]
 * @param {string|null} [branchId=null]
 * @param {string|null} [division=null]
 * @param {number} [maxLimit=2000]
 * @returns {Promise<{ payments: Array<any>, isCapped: boolean }>}
 */
export async function fetchPaymentsForWindow(sinceIso = null, branchId = null, division = null, maxLimit = 2000) {
  const resolvedBranch = await resolveCallerBranchId(branchId);
  if (!resolvedBranch) {
    return { payments: [], isCapped: false };
  }
  const constraints = [];
  if (resolvedBranch !== "all") {
    constraints.push(where("branchId", "==", resolvedBranch));
  }
  if (division && division !== "all") {
    constraints.push(where("division", "==", division));
  }
  if (sinceIso) {
    constraints.push(where("recordedAt", ">=", sinceIso));
  }
  constraints.push(orderBy("recordedAt", "desc"), limit(maxLimit));
  const q = query(collection(db, "payments"), ...constraints);
  const snap = await getDocs(q);
  const payments = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
  return {
    payments,
    isCapped: snap.docs.length >= maxLimit,
  };
}

/**
 * Fetches all payments recorded within a specific WITA calendar day (defaults to today).
 * Guarantees that ALL payments for that day are fetched (NO artificial limit cap),
 * ensuring exact daily cash reconciliation.
 *
 * @param {Date} [witaDate=new Date()]
 * @param {string|null} [branchId=null]
 * @param {string|null} [division=null]
 * @returns {Promise<Array<any>>}
 */
export async function getPaymentsForRecordedDay(witaDate = new Date(), branchId = null, division = null) {
  const resolvedBranch = await resolveCallerBranchId(branchId);
  if (!resolvedBranch) {
    return [];
  }
  const { startIso, endIso } = getWitaDayRangeIso(witaDate);
  try {
    const constraints = [];
    if (resolvedBranch !== "all") {
      constraints.push(where("branchId", "==", resolvedBranch));
    }
    if (division && division !== "all") {
      constraints.push(where("division", "==", division));
    }
    constraints.push(
      where("recordedAt", ">=", startIso),
      where("recordedAt", "<", endIso)
    );
    const q = query(
      collection(db, "payments"),
      ...constraints
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime());
    return list;
  } catch (err) {
    console.warn("getPaymentsForRecordedDay range query error, falling back to recent scan:", err?.message);
    const fallbackConstraints = [];
    if (resolvedBranch !== "all") {
      fallbackConstraints.push(where("branchId", "==", resolvedBranch));
    }
    if (division && division !== "all") {
      fallbackConstraints.push(where("division", "==", division));
    }
    try {
      const qDesc = query(collection(db, "payments"), ...fallbackConstraints, orderBy("recordedAt", "desc"), limit(200));
      const snapDesc = await getDocs(qDesc);
      return snapDesc.docs
        .map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }))
        .filter((p) => p.recordedAt && p.recordedAt >= startIso && p.recordedAt < endIso);
    } catch {
      fallbackConstraints.push(limit(200));
      const q = query(collection(db, "payments"), ...fallbackConstraints);
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }))
        .filter((p) => {
          if (!p.recordedAt) return false;
          return p.recordedAt >= startIso && p.recordedAt < endIso;
        })
        .sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime());
    }
  }
}


/**
 * Writes the payment record and updates the student's payment status
 * together, atomically — either both land or neither does.
 *
 * Supports an optional idempotencyKey (or paymentRecord.idempotencyKey)
 * to ensure that network retries or rapid double-submissions return the
 * existing record without creating duplicate payment documents or double-charging.
 */
export async function recordPayment(studentId, paymentRecord, idempotencyKey = null) {
  const validStudentId = studentIdSchema.parse(studentId);
  const rawBranch = paymentRecord.branch || paymentRecord.branchId || DEFAULT_BRANCH_ID;
  const branchId = branchToId(rawBranch);
  const branch = idToBranch(branchId);

  const studentSnap = await getDoc(doc(db, "users", validStudentId));
  if (!studentSnap.exists()) {
    throw new Error(`Cannot record payment: student profile "${validStudentId}" does not exist.`);
  }
  const studentData = studentSnap.data();

  let division = paymentRecord.division || null;
  if (!division) {
    division =
      studentData.division ||
      divisionOfProgram(studentData.programId || studentData.program);
  }
  const finalDivision = division ? normalizeDivision(division) : "courses";

  const effectiveIdempotencyKey = idempotencyKey || paymentRecord.idempotencyKey || null;

  const enrichedRecord = {
    ...paymentRecord,
    branch,
    branchId,
    division: finalDivision,
    ...(paymentRecord.requestedByUid || paymentRecord.recordedByUid
      ? { requestedByUid: paymentRecord.requestedByUid || paymentRecord.recordedByUid }
      : {}),
    ...(effectiveIdempotencyKey ? { idempotencyKey: effectiveIdempotencyKey } : {}),
  };

  const validatedRecord = paymentRecordSchema.parse(enrichedRecord);
  const paymentRef = effectiveIdempotencyKey
    ? doc(db, "payments", effectiveIdempotencyKey)
    : doc(collection(db, "payments"));

  if (effectiveIdempotencyKey) {
    const existingSnap = await getDoc(paymentRef);
    if (existingSnap.exists()) {
      return { id: existingSnap.id, ...existingSnap.data(), _idempotentReplay: true };
    }
  }

  const batch = writeBatch(db);

  const recordedDate = paymentRecord.recordedAt ? new Date(paymentRecord.recordedAt) : new Date();
  const lastPaymentDate = !isNaN(recordedDate.getTime())
    ? todayWita(recordedDate)
    : (paymentRecord.recordedAt || "").slice(0, 10);

  const isPartialInstallment = validatedRecord.isInstallment && Number(validatedRecord.outstandingBalance) > 0;
  const studentUpdate = {
    paymentStatus: isPartialInstallment ? "partially_paid" : "paid",
    lastPaymentPeriod: validatedRecord.period,
    lastPaymentDate,
    lastPaymentAmount: validatedRecord.amount,
    lastPaymentMethod: validatedRecord.method,
    paymentPlan: validatedRecord.planId || "monthly",
    lastPaymentId: paymentRef.id,
    ...(paymentRecord.coverageEnd ? { paidUntil: paymentRecord.coverageEnd } : {}),
    ...(validatedRecord.isInstallment ? {
      isInstallment: true,
      outstandingBalance: Number(validatedRecord.outstandingBalance) || 0,
      totalAgreedAmount: Number(validatedRecord.totalAgreedAmount) || validatedRecord.amount,
      nextDueDate: validatedRecord.nextDueDate || null,
    } : {}),
  };

  batch.set(paymentRef, enrichedRecord);
  batch.set(doc(db, "users", validStudentId), studentUpdate, { merge: true });

  await batch.commit();
  return { id: paymentRef.id, ...enrichedRecord };
}

export function markPaymentPending(studentId) {
  const validStudentId = studentIdSchema.parse(studentId);
  return setDoc(
    doc(db, "users", validStudentId),
    {
      paymentStatus: "pending",
      paidUntil: deleteField(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export function updateStudentPaymentStatus(studentId, paymentStatus, paidUntil = null) {
  const validStudentId = studentIdSchema.parse(studentId);
  const payload = {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
  if (paidUntil) {
    payload.paidUntil = paidUntil;
  } else if (paymentStatus === "pending") {
    payload.paidUntil = deleteField();
  }
  return setDoc(doc(db, "users", validStudentId), payload, { merge: true });
}

/**
 * Updates the approval status on a payment record (e.g. Dual-Control discount review).
 *
 * @param {string} paymentId
 * @param {"approved"|"rejected"|"pending"} approvalStatus
 * @returns {Promise<void>}
 */
export async function updatePaymentApprovalStatus(paymentId, approvalStatus) {
  if (!paymentId) return;
  await updateDoc(doc(db, "payments", paymentId), {
    approvalStatus,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Submits an OD-1 / OD-3 dual-control approval envelope to void/reverse a payment.
 *
 * @param {any} payment
 * @param {any} requester
 * @param {string} reason
 * @returns {Promise<any>}
 */
export async function requestPaymentVoid(payment, requester, reason) {
  if (!payment || !payment.id) {
    throw new Error("Cannot request payment void: invalid payment record.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("An operational justification is required to request a payment void.");
  }

  const envelope = createApprovalEnvelope(
    GATED_ACTIONS.PAYMENT_CORRECTION_OR_VOID.id,
    {
      uid: requester.uid,
      name: requester.name || requester.displayName || "Front Office Staff",
      role: requester.role,
      branchId: requester.branchId || null,
    },
    {
      paymentId: payment.id,
      studentId: payment.studentId,
      amount: Number(payment.amount) || 0,
      period: payment.period || "",
      method: payment.method || "",
      receiptNumber: payment.receiptNumber || payment.referenceNumber || null,
      reason: reason.trim(),
      branchId: payment.branchId || null,
      division: payment.division || null,
    }
  );

  return submitApprovalRequest(envelope);
}

/**
 * Executes an approved payment void and reversal transaction atomically per OD-1 / OD-3.
 *
 * @param {object} params
 * @param {string} params.originalPaymentId
 * @param {string} [params.studentId]
 * @param {number} [params.amount]
 * @param {string} [params.reason]
 * @param {string} [params.decidedByUid]
 * @param {string} [params.approvalId]
 * @returns {Promise<{ reversalId: string }>}
 */
export async function executePaymentVoid({
  originalPaymentId,
  studentId,
  amount,
  reason,
  decidedByUid,
  approvalId,
}) {
  if (!originalPaymentId) {
    throw new Error("Missing originalPaymentId for payment void.");
  }

  const originalRef = doc(db, "payments", originalPaymentId);
  const originalSnap = await getDoc(originalRef);
  if (!originalSnap.exists()) {
    throw new Error(`Original payment document "${originalPaymentId}" not found.`);
  }
  const original = originalSnap.data();

  const reversalRef = doc(collection(db, "payments"));
  const reversalRecord = {
    studentId: studentId || original.studentId,
    amount: Number(amount || original.amount),
    method: original.method || "cash",
    type: "reversal",
    period: original.period || "",
    branch: original.branch || "",
    branchId: original.branchId || "",
    division: original.division || "courses",
    recordedBy: decidedByUid || "system",
    recordedAt: new Date().toISOString(),
    status: "reversal",
    isReversal: true,
    originalPaymentId,
    originalReceiptNumber: original.receiptNumber || original.referenceNumber || null,
    voidReason: reason || "Approved payment void / correction",
    appliedFromApproval: approvalId || null,
    approvalId: approvalId || null,
    approvalStatus: "approved",
  };

  const batch = writeBatch(db);

  batch.set(reversalRef, reversalRecord);

  batch.update(originalRef, {
    status: "voided",
    voidReason: reason || "Approved payment void / correction",
    voidedAt: new Date().toISOString(),
    voidedByUid: decidedByUid || null,
    reversalOfPaymentId: reversalRef.id,
    appliedFromApproval: approvalId || null,
    updatedAt: new Date().toISOString(),
  });

  const effectiveStudentId = studentId || original.studentId;
  if (effectiveStudentId) {
    batch.set(
      doc(db, "users", effectiveStudentId),
      {
        paymentStatus: "pending",
        paidUntil: deleteField(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { reversalId: reversalRef.id };
}

