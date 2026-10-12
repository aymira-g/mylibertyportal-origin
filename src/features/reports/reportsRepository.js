import { auth, db } from "../../firebase";
import { collection, getDocs, getDoc, doc, query, where, limit } from "firebase/firestore";
import { normalizeBranch, branchToId } from "../../constants/branches.js";
import { isStaffRole } from "../shared/roles.js";

/**
 * All direct Firestore reads for the Reports domain live here.
 */

export async function fetchStaffShifts(isSupervisorOrAdmin, since = null, branchId = null, isManager = false, division = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const isSupervisor = Boolean(isSupervisorOrAdmin || isManager);

  // Branch isolation (DOM02-SEC-01): Manager and non-executive supervisors have strictly branch-scoped
  // authority. Never emit an unscoped collection query that would violate isSameBranchStrict.
  if (isManager && !normalizedBranchId) {
    console.warn("fetchStaffShifts: branchId is required for manager view; returning empty shifts to prevent unauthorized unscoped query.");
    return { shifts: [], staffMembers: [], leaves: [] };
  }
  const shiftsRef = collection(db, "shifts");
  const filters = [];
  if (!isSupervisor) filters.push(where("userId", "==", auth.currentUser?.uid));
  if (normalizedBranchId) filters.push(where("branchId", "==", normalizedBranchId));
  if (division && division !== "all") filters.push(where("division", "==", division));
  if (since) filters.push(where("clockIn", ">=", since));

  const openFilters = [where("clockOut", "==", null)];
  if (!isSupervisor) openFilters.push(where("userId", "==", auth.currentUser?.uid));
  if (normalizedBranchId) openFilters.push(where("branchId", "==", normalizedBranchId));
  if (division && division !== "all") openFilters.push(where("division", "==", division));

  const [shiftsSnap, openSnap] = await Promise.all([
    getDocs(filters.length ? query(shiftsRef, ...filters) : shiftsRef),
    getDocs(query(shiftsRef, ...openFilters)),
  ]);

  const byId = new Map();
  [...shiftsSnap.docs, ...openSnap.docs].forEach((d) => byId.set(d.id, d));
  const shiftDocs = [...byId.values()];

  const existingUsersMap = new Map();

  if (isSupervisor) {
    const userConstraints = [];
    if (normalizedBranchId) userConstraints.push(where("branchId", "==", normalizedBranchId));
    if (division && division !== "all") userConstraints.push(where("division", "==", division));
    const usersQuery = userConstraints.length
      ? query(collection(db, "users"), ...userConstraints)
      : collection(db, "users");
    const usersSnap = await getDocs(usersQuery);
    usersSnap.docs.forEach((u) => existingUsersMap.set(u.id, { id: u.id, ...u.data() }));
  } else if (auth.currentUser?.uid) {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists()) existingUsersMap.set(userDoc.id, { id: userDoc.id, ...userDoc.data() });
  }

  // Fetch leaves if admin, manager, or individual user
  let leaves = [];
  try {
    const leaveQuery = isSupervisor
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
    (u) =>
      isStaffRole(u.role) &&
      (!division || division === "all" || !u.division || u.division === division)
  );

  return { shifts: raw, staffMembers, leaves };
}

/**
 * @returns {Promise<{ scans: any[], classes: any[], students: any[] }>}
 */
export async function fetchTodayScansData(sinceWitaIso, isAdminView, isFrontOffice, branchId = null, isManager = false, division = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const isSupervisor = isAdminView || isFrontOffice || isManager;

  // Branch isolation (DOM03-SEC-02): Non-executive callers (Manager, Front Office)
  // must have their query strictly scoped to their branch.
  // Never emit an unscoped /attendance list query that would violate isSameBranchStrict.
  if (!isAdminView && (isManager || isFrontOffice) && !normalizedBranchId) {
    console.warn("fetchTodayScansData: branchId is required for non-executive view; returning empty results to prevent unauthorized unscoped query.");
    return { scans: [], classes: [], students: [] };
  }

  const attendanceFilters = [where("timestamp", ">=", sinceWitaIso)];
  if (normalizedBranchId) attendanceFilters.push(where("branchId", "==", normalizedBranchId));
  if (division && division !== "all") attendanceFilters.push(where("division", "==", division));
  const attendanceQuery = query(collection(db, "attendance"), ...attendanceFilters);

  const classesFilters = [];
  if (!isSupervisor) {
    classesFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    classesFilters.push(where("division", "==", division));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const usersFilters = [];
  if (!isAdminView && !isManager) {
    usersFilters.push(where("role", "in", isFrontOffice ? ["student", "instructor"] : ["student"]));
  }
  if (normalizedBranchId) {
    usersFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    usersFilters.push(where("division", "==", division));
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
export async function fetchStudentProgressData(isAdminView, isFrontOffice, since = null, branchId = null, isManager = false, division = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const isSupervisor = isAdminView || isFrontOffice || isManager;

  // Branch isolation (DOM03-SEC-02): Non-executive callers (Manager, Front Office)
  // must have their query strictly scoped to their branch.
  // Never emit an unscoped list query that would violate isSameBranchStrict.
  if (!isAdminView && (isManager || isFrontOffice) && !normalizedBranchId) {
    console.warn("fetchStudentProgressData: branchId is required for non-executive view; returning empty results to prevent unauthorized unscoped query.");
    return { users: [], classes: [], attendance: [], progress: [] };
  }

  const classesFilters = [];
  if (!isSupervisor) {
    classesFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    classesFilters.push(where("division", "==", division));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const progressFilters = [];
  if (!isSupervisor) {
    progressFilters.push(where("instructorId", "==", auth.currentUser?.uid));
  }
  if (normalizedBranchId) {
    progressFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    progressFilters.push(where("division", "==", division));
  }
  progressFilters.push(limit(200));
  const progressQuery = query(collection(db, "progressReports"), ...progressFilters);

  const usersFilters = [];
  if (!isAdminView && !isManager) {
    usersFilters.push(where("role", "in", isFrontOffice ? ["student", "instructor"] : ["student"]));
  }
  if (normalizedBranchId) {
    usersFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    usersFilters.push(where("division", "==", division));
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
  if (division && division !== "all") {
    attendanceFilters.push(where("division", "==", division));
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

export async function fetchAdmissionsReportData(
  since = null,
  branchId = null,
  division = null,
  callerContext = {}
) {
  let normalizedBranchId = branchId ? branchToId(branchId) : null;

  // Branch isolation (DOM06-SEC-03): Non-executive callers (Front Office, Manager)
  // cannot query unscoped collections (/applications, /classes) under isSameBranchStrict.
  // If branchId is not provided or "all", attempt to resolve caller's branch or fail closed.
  const isExecutive = Boolean(
    callerContext.isAdminView ||
    callerContext.isExecutiveView ||
    callerContext.callerRole === "director" ||
    callerContext.callerRole === "vice_director" ||
    callerContext.callerRole === "admin"
  );

  const isNonExecutiveScoped = Boolean(
    callerContext.isFrontOffice ||
    callerContext.isManager ||
    (callerContext.callerRole && !isExecutive)
  );

  if (!normalizedBranchId && isNonExecutiveScoped) {
    if (callerContext.userBranch) {
      normalizedBranchId = branchToId(callerContext.userBranch);
    } else {
      console.warn(
        "fetchAdmissionsReportData: branchId is required for non-executive view; returning empty results to prevent unauthorized unscoped query."
      );
      return { applications: [], classes: [] };
    }
  }

  const appFilters = [];
  if (since) {
    appFilters.push(where("submittedAt", ">=", since));
  }
  if (normalizedBranchId) {
    appFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    appFilters.push(where("division", "==", division));
  }
  const appQuery = appFilters.length
    ? query(collection(db, "applications"), ...appFilters)
    : collection(db, "applications");

  const classFilters = [];
  if (normalizedBranchId) {
    classFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    classFilters.push(where("division", "==", division));
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

export async function fetchInstructorAnalyticsData(isAdminView, uid, branchId = null, isManager = false, division = null) {
  const normalizedBranchId = branchId ? branchToId(branchId) : null;
  const isSupervisor = isAdminView || isManager;

  // Branch isolation (DOM02-SEC-01): Manager view is strictly branch-isolated.
  // Never emit an unscoped collection query that would violate isSameBranchStrict.
  if (!isAdminView && isManager && !normalizedBranchId) {
    console.warn("fetchInstructorAnalyticsData: branchId is required for manager view; returning empty analytics to prevent unauthorized unscoped query.");
    return { classes: [], shifts: [], instructors: [] };
  }

  const classesFilters = [];
  if (!isSupervisor) {
    classesFilters.push(where("instructorId", "==", uid));
  }
  if (normalizedBranchId) {
    classesFilters.push(where("branchId", "==", normalizedBranchId));
  }
  if (division && division !== "all") {
    classesFilters.push(where("division", "==", division));
  }
  const classesQuery = classesFilters.length
    ? query(collection(db, "classes"), ...classesFilters)
    : collection(db, "classes");

  const shiftsFilters = [];
  if (!isSupervisor) {
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
  if (isSupervisor) {
    const userFilters = [where("role", "==", "instructor")];
    if (normalizedBranchId) {
      userFilters.push(where("branchId", "==", normalizedBranchId));
    }
    const usersSnap = await getDocs(
      query(collection(db, "users"), ...userFilters)
    );
    let instDocs = usersSnap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
    if (division && division !== "all") {
      instDocs = instDocs.filter((d) => !d.division || d.division === division);
    }
    instructors = instDocs;
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
