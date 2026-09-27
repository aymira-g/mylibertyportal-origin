import { auth, db } from "../../firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { normalizeBranch, branchToId } from "../../constants/branches.js";
import { isStaffRole } from "../shared/roles.js";

/**
 * All direct Firestore reads for the Reports domain live here.
 */

export async function fetchStaffShifts(isAdminView, since = null, branchId = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const shiftsRef = collection(db, "shifts");
  const filters = [];
  if (!isAdminView) filters.push(where("userId", "==", auth.currentUser?.uid));
  if (normalizedBranchId) filters.push(where("branchId", "==", normalizedBranchId));
  if (since) filters.push(where("clockIn", ">=", since));

  const openFilters = [where("clockOut", "==", null)];
  if (!isAdminView) openFilters.push(where("userId", "==", auth.currentUser?.uid));
  if (normalizedBranchId) openFilters.push(where("branchId", "==", normalizedBranchId));

  const [shiftsSnap, openSnap] = await Promise.all([
    getDocs(filters.length ? query(shiftsRef, ...filters) : shiftsRef),
    getDocs(query(shiftsRef, ...openFilters)),
  ]);

  const byId = new Map();
  [...shiftsSnap.docs, ...openSnap.docs].forEach((d) => byId.set(d.id, d));
  const shiftDocs = [...byId.values()];

  const existingUsersMap = new Map();

  if (isAdminView) {
    const usersQuery = normalizedBranchId
      ? query(collection(db, "users"), where("branchId", "==", normalizedBranchId))
      : collection(db, "users");
    const usersSnap = await getDocs(usersQuery);
    usersSnap.docs.forEach((u) => existingUsersMap.set(u.id, { id: u.id, ...u.data() }));
  } else if (auth.currentUser?.uid) {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists()) existingUsersMap.set(userDoc.id, { id: userDoc.id, ...userDoc.data() });
  }

  // Fetch leaves if admin or user
  let leaves = [];
  try {
    const leaveQuery = isAdminView
      ? (normalizedBranchId ? query(collection(db, "staffLeave"), where("branchId", "==", normalizedBranchId)) : collection(db, "staffLeave"))
      : query(collection(db, "staffLeave"), where("userId", "==", auth.currentUser?.uid));
    const leaveSnap = await getDocs(leaveQuery);
    leaves = leaveSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("staffLeave query error (ignored):", err);
  }

  const raw = shiftDocs
    .map((d) => {
      const data = d.data();
      const user = existingUsersMap.get(data.userId);
      return {
        id: d.id,
        ...data,
        branch: normalizeBranch(user?.branch || data.branch),
      };
    })
    .filter((shift) => existingUsersMap.has(shift.userId))
    .sort((a, b) => (b.clockIn || "").localeCompare(a.clockIn || ""));

  const staffMembers = Array.from(existingUsersMap.values()).filter(
    (u) => isStaffRole(u.role)
  );

  return { shifts: raw, staffMembers, leaves };
}

/**
 * @returns {Promise<{ scans: any[], classes: any[], students: any[] }>}
 */
export async function fetchTodayScansData(sinceWitaIso, isAdminView, isFrontOffice, branchId = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;

  const attendanceFilters = [where("timestamp", ">=", sinceWitaIso)];
  if (normalizedBranchId) attendanceFilters.push(where("branchId", "==", normalizedBranchId));
  const attendanceQuery = query(collection(db, "attendance"), ...attendanceFilters);

  const classesFilters = [];
  if (!isAdminView && !isFrontOffice) {
    classesFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const usersFilters = [];
  if (!isAdminView) {
    usersFilters.push(where("role", "in", isFrontOffice ? ["student", "instructor"] : ["student"]));
  }
  if (normalizedBranchId) {
    usersFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const usersQuery = usersFilters.length
    ? query(collection(db, "users"), ...usersFilters)
    : collection(db, "users");

  const [attendanceSnap, classesSnap, usersSnap] = await Promise.all([
    getDocs(attendanceQuery),
    getDocs(classesQuery),
    getDocs(usersQuery),
  ]);

  return {
    scans: attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    students: usersSnap.docs
      .map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }))
      .filter((u) => u.role === "student"),
  };
}

/**
 * @returns {Promise<{ users: any[], classes: any[], attendance: any[], progress: any[] }>}
 */
export async function fetchStudentProgressData(isAdminView, isFrontOffice, since = null, branchId = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;

  const classesFilters = [];
  if (!isAdminView && !isFrontOffice) {
    classesFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const progressFilters = [];
  if (!isAdminView && !isFrontOffice) {
    progressFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  const progressQuery = progressFilters.length
    ? query(collection(db, "progressReports"), ...progressFilters)
    : collection(db, "progressReports");

  const usersFilters = [];
  if (!isAdminView) {
    usersFilters.push(where("role", "in", isFrontOffice ? ["student", "instructor"] : ["student"]));
  }
  if (normalizedBranchId) {
    usersFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const usersQuery = usersFilters.length
    ? query(collection(db, "users"), ...usersFilters)
    : collection(db, "users");

  const attendanceFilters = [];
  if (since) {
    attendanceFilters.push(where("timestamp", ">=", since));
  }
  if (normalizedBranchId) {
    attendanceFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const attendanceQuery = attendanceFilters.length
    ? query(collection(db, "attendance"), ...attendanceFilters)
    : collection(db, "attendance");

  const [usersSnap, classesSnap, attendanceSnap, progressSnap] = await Promise.all([
    getDocs(usersQuery),
    getDocs(classesQuery),
    getDocs(attendanceQuery),
    getDocs(progressQuery),
  ]);

  return {
    users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    attendance: attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    progress: progressSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function fetchAdmissionsReportData(since = null, branchId = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;

  const appFilters = [];
  if (since) {
    appFilters.push(where("submittedAt", ">=", since));
  }
  if (normalizedBranchId) {
    appFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const appQuery = appFilters.length
    ? query(collection(db, "applications"), ...appFilters)
    : collection(db, "applications");

  const classFilters = [];
  if (normalizedBranchId) {
    classFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const classesQuery = classFilters.length
    ? query(collection(db, "classes"), ...classFilters)
    : collection(db, "classes");

  const [appsSnap, classesSnap] = await Promise.all([
    getDocs(appQuery),
    getDocs(classesQuery),
  ]);

  return {
    applications: appsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function fetchInstructorAnalyticsData(isAdminView, uid, branchId = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;

  const classesFilters = [];
  if (!isAdminView) {
    classesFilters.push(where("instructorId", "==", uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const shiftsFilters = [];
  if (!isAdminView) {
    shiftsFilters.push(where("userId", "==", uid));
  }
  if (normalizedBranchId) {
    shiftsFilters.push(where("branchId", "==", normalizedBranchId));
  }
  const shiftsQuery = shiftsFilters.length
    ? query(collection(db, "shifts"), ...shiftsFilters)
    : collection(db, "shifts");

  const [classesSnap, shiftsSnap] = await Promise.all([
    getDocs(classesQuery),
    getDocs(shiftsQuery),
  ]);

  let instructors;
  if (isAdminView) {
    const userFilters = [where("role", "==", "instructor")];
    if (normalizedBranchId) {
      userFilters.push(where("branchId", "==", normalizedBranchId));
    }
    const usersSnap = await getDocs(
      query(collection(db, "users"), ...userFilters)
    );
    instructors = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else {
    const selfDoc = await getDoc(doc(db, "users", uid));
    instructors = selfDoc.exists() ? [{ id: selfDoc.id, ...selfDoc.data() }] : [];
  }

  return {
    classes: classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    shifts: shiftsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    instructors,
  };
}
