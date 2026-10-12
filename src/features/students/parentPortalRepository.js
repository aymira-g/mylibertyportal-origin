import { db } from "../../firebase";
import { collection, query, where, getDocs, limit, doc, getDoc, orderBy } from "firebase/firestore";
import { branchToId } from "../../constants/branches.js";
import { getPaymentHealthStatus } from "../../constants/paymentPlans.js";

/**
 * Normalizes phone string to clean digit format for matching.
 */
export function normalizePhoneDigits(phoneStr = "") {
  if (!phoneStr) return "";
  let digits = String(phoneStr).replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  return digits;
}

/**
 * Builds the tuition summary shown on the authenticated Parent Portal from the
 * denormalized payment fields on the student document (written by the
 * finance flow in paymentsRepository.recordPayment). Parent views read this
 * summary directly from the linked student document for 1-read efficiency.
 */
export function buildPaymentSummary(student) {
  if (!student || typeof student !== "object") return null;
  const hasRecords = Boolean(student.lastPaymentPeriod || student.lastPaymentDate || student.paidUntil);

  let status;
  let healthStatus = null;

  if (student.paidUntil) {
    const health = getPaymentHealthStatus(student.paidUntil);
    healthStatus = health.status;
  }

  if (student.paymentStatus === "paid") {
    if (healthStatus === "expired") {
      status = "expired";
    } else if (healthStatus === "due_soon") {
      status = "due_soon";
    } else {
      status = "paid";
    }
  } else if (student.paymentStatus === "pending" || student.paymentStatus === "unpaid") {
    status = student.paymentStatus;
  } else {
    // Fall back to historical inference only when paymentStatus is absent on legacy records
    if (hasRecords) {
      if (healthStatus === "expired") {
        status = "expired";
      } else if (healthStatus === "due_soon") {
        status = "due_soon";
      } else {
        status = "paid";
      }
    } else {
      status = "none";
    }
  }

  return {
    status,
    lastPaymentPeriod: student.lastPaymentPeriod || null,
    lastPaymentDate: student.lastPaymentDate || null,
    lastPaymentAmount: typeof student.lastPaymentAmount === "number" ? student.lastPaymentAmount : null,
    lastPaymentMethod: student.lastPaymentMethod || null,
    paidUntil: student.paidUntil || null,
  };
}

/**
 * Loads authenticated parent user doc and all linked student profile documents.
 * Query 1 & 2 from Parent+Student Roster Model v2 Section 27.
 *
 * @param {string} parentUid
 * @returns {Promise<{ parent: any, children: any[], linkedStudentCount?: number, inactiveChildCount?: number }>}
 */
export async function getAuthenticatedParentBundle(parentUid) {
  if (!parentUid) return { parent: null, children: [] };

  const parentDoc = await getDoc(doc(db, "users", parentUid));
  if (!parentDoc.exists()) {
    return { parent: null, children: [] };
  }
  /** @type {any} */
  const parent = { id: parentDoc.id, ...parentDoc.data() };
  const childStudentIds = Array.isArray(parent.childStudentIds) ? parent.childStudentIds : [];

  const children = [];
  let inactiveChildCount = 0;
  for (const childId of childStudentIds) {
    try {
      const childDoc = await getDoc(doc(db, "users", childId));
      if (childDoc.exists()) {
        const child = childDoc.data();
        if (child.role === "student" && (!child.status || child.status === "active")) {
          children.push({ id: childDoc.id, ...child });
        } else if (child.role === "student") {
          inactiveChildCount++;
        }
      }
    } catch (err) {
      console.warn(`Failed to read linked child ${childId}:`, err);
    }
  }

  return {
    parent,
    children,
    linkedStudentCount: childStudentIds.length,
    inactiveChildCount,
  };
}

/**
 * Loads enrolled classes and attendance history for a linked child.
 * Query 3 & 5 from Parent+Student Roster Model v2 Section 27.
 *
 * @param {string} childId
 * @param {string} branchId
 * @returns {Promise<{ classes: any[], attendance: any[], errorClasses: string | null, errorAttendance: string | null }>}
 */
export async function getChildAttendanceAndClasses(childId, branchId) {
  if (!childId || !branchId) {
    console.warn("getChildAttendanceAndClasses: childId and canonical branchId are both required.");
    return { classes: [], attendance: [], errorClasses: null, errorAttendance: null };
  }

  const canonicalBranchId = branchToId(branchId);
  let classes = [];
  let errorClasses = null;
  try {
    const qClasses = query(
      collection(db, "classes"),
      where("branchId", "==", canonicalBranchId),
      where("studentIds", "array-contains", childId),
      limit(20)
    );
    const snapClasses = await getDocs(qClasses);
    classes = snapClasses.docs
      .map((d) => /** @type {Record<string, any>} */ ({ id: d.id, ...d.data() }))
      .filter((cls) => {
        const s = (cls.status || "open").toLowerCase();
        return s !== "cancelled" && s !== "archived";
      });
  } catch (err) {
    console.warn("Failed fetching enrolled classes for child:", err);
    errorClasses = err?.message || "Failed to load classes";
  }


  let attendance = [];
  let errorAttendance = null;
  try {
    const qAtt = query(
      collection(db, "classAttendance"),
      where("studentId", "==", childId),
      orderBy("attendanceDate", "desc"),
      limit(30)
    );
    const snapAtt = await getDocs(qAtt);
    attendance = snapAtt.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Failed fetching attendance history for child:", err);
    errorAttendance = err?.message || "Failed to load attendance history";
  }

  return { classes, attendance, errorClasses, errorAttendance };
}
