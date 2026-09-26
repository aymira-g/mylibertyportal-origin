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
 * Looks up student record for the parent portal by query term (NIS, phone, email, or name).
 * Bounded with limit(5) to prevent unbounded reads.
 */
export async function lookupStudentForParent(searchTerm = "") {
  const term = (searchTerm || "").trim();
  if (!term || term.length < 2) return [];

  const cleanDigits = normalizePhoneDigits(term);
  const lowerTerm = term.toLowerCase();

  // 1. Direct document ID / NIS lookup
  try {
    const directDoc = await getDoc(doc(db, "users", term));
    if (directDoc.exists()) {
      const data = directDoc.data();
      if (data.role === "student") {
        return [{ id: directDoc.id, ...data }];
      }
    }
  } catch {
    // Non-fatal, continue with query fallbacks
  }

  // 2. Query students collection
  const usersRef = collection(db, "users");

  // Try studentId / NIS exact match
  const qNis = query(usersRef, where("studentId", "==", term), limit(5));
  const snapNis = await getDocs(qNis);
  if (!snapNis.empty) {
    return snapNis.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Try email exact match
  const qEmail = query(usersRef, where("email", "==", lowerTerm), limit(5));
  const snapEmail = await getDocs(qEmail);
  if (!snapEmail.empty) {
    return snapEmail.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Try phone match if digits provided
  if (cleanDigits.length >= 7) {
    const qPhone = query(usersRef, where("parentPhone", "==", term), limit(5));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      return snapPhone.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  // Bounded recent student search by displayName (bounded to 20 candidates)
  const qRole = query(usersRef, where("role", "==", "student"), limit(25));
  const snapRole = await getDocs(qRole);
  /** @type {any[]} */
  const candidates = snapRole.docs.map((d) => ({ id: d.id, ...d.data() }));

  return candidates.filter((s) => {
    const nameMatch = (s.displayName || s.name || "").toLowerCase().includes(lowerTerm);
    const phoneMatch = s.phone && normalizePhoneDigits(s.phone).includes(cleanDigits);
    const parentPhoneMatch = s.parentPhone && normalizePhoneDigits(s.parentPhone).includes(cleanDigits);
    const nisMatch = s.studentId && s.studentId.toLowerCase().includes(lowerTerm);
    return nameMatch || phoneMatch || parentPhoneMatch || nisMatch;
  });
}

/**
 * Builds the tuition summary shown on the public Parent Portal from the
 * denormalized payment fields on the student document (written by the
 * finance flow in paymentsRepository.recordPayment). The payments
 * collection itself is staff-only in Firestore rules, so the portal —
 * which is anonymous — reads this summary instead of the raw history.
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
 * Loads complete parent dashboard data bundle for a specific student.
 */
export async function getStudentParentPortalBundle(studentId) {
  if (!studentId) return null;

  // 1. Fetch student document
  const studentDoc = await getDoc(doc(db, "users", studentId));
  if (!studentDoc.exists()) {
    throw new Error("Student not found.");
  }
  /** @type {any} */
  const student = { id: studentDoc.id, ...studentDoc.data() };

  // 2. Fetch enrolled batch/class info if present
  let batchInfo = null;
  if (student.batchId) {
    try {
      const bDoc = await getDoc(doc(db, "batches", student.batchId));
      if (bDoc.exists()) {
        batchInfo = { id: bDoc.id, ...bDoc.data() };
      }
    } catch (err) {
      console.warn("Could not fetch batch for student:", err);
    }
  }

  return {
    student,
    paymentSummary: buildPaymentSummary(student),
    batchInfo,
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
