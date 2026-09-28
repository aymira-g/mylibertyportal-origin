import { db } from "../../firebase";
import { collection, query, where, getDocs, limit, doc, getDoc, orderBy } from "firebase/firestore";

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
 * finance flow in paymentsRepository.recordPayment). The payments
 * collection itself is staff-only in Firestore rules, so parent views
 * read this summary directly from the linked student document.
 */
export function buildPaymentSummary(student) {
  if (!student || typeof student !== "object") return null;
  const hasRecords = Boolean(student.lastPaymentPeriod || student.lastPaymentDate || student.paidUntil);
  return {
    status: student.paymentStatus === "pending" ? "pending" : hasRecords ? "paid" : "none",
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
 * @returns {Promise<{ parent: any, children: any[] }>}
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
  for (const childId of childStudentIds) {
    try {
      const childDoc = await getDoc(doc(db, "users", childId));
      if (childDoc.exists()) {
        children.push({ id: childDoc.id, ...childDoc.data() });
      }
    } catch (err) {
      console.warn(`Failed to read linked child ${childId}:`, err);
    }
  }

  return { parent, children };
}

/**
 * Loads enrolled classes and attendance history for a linked child.
 * Query 3 & 5 from Parent+Student Roster Model v2 Section 27.
 *
 * @param {string} childId
 * @returns {Promise<{ classes: any[], attendance: any[] }>}
 */
export async function getChildAttendanceAndClasses(childId) {
  if (!childId) return { classes: [], attendance: [] };

  let classes = [];
  try {
    const qClasses = query(
      collection(db, "classes"),
      where("studentIds", "array-contains", childId),
      where("status", "==", "open"),
      limit(20)
    );
    const snapClasses = await getDocs(qClasses);
    classes = snapClasses.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Failed fetching enrolled classes for child:", err);
  }

  let attendance = [];
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
  }

  return { classes, attendance };
}
