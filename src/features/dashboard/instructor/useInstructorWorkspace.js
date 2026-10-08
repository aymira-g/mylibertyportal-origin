import { useState, useMemo, useEffect } from "react";
import { useInstructorRoster } from "../useInstructorRoster";
import { useStaffDirectives } from "../../staff";
import { db } from "../../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { branchToId } from "../../../constants/branches.js";
import { uniqueClasses } from "./instructorUtils";

/**
 * useInstructorWorkspace
 *
 * Shared data wiring hook for instructor dashboards (InstructorDashboard and InstructorLeaderDashboard).
 * Encapsulates:
 * - Instructor roster query (classes, students, instructor metadata)
 * - Resolution of effectiveRole and effectiveBranch
 * - Deduplicated assigned classes and branch-wide active classes listener
 * - Unified allClasses / combinedAllClasses merge
 * - Staff directives for instructors
 */
export function useInstructorWorkspace({ role = "", branch = "" } = {}) {
  const {
    uid,
    classes: rawClasses,
    students,
    instructorName,
    instructorRole,
    instructorBranch,
    loading,
    error,
  } = useInstructorRoster();

  const effectiveRole = (role || instructorRole || "").toLowerCase().trim();
  const effectiveBranch = branch || instructorBranch || "kota_gorontalo";

  const classes = useMemo(() => uniqueClasses(rawClasses), [rawClasses]);
  const [allClasses, setAllClasses] = useState([]);

  // Merge branch classes with any assigned primary/substitute classes (guarantees cross-branch classes are visible)
  const combinedAllClasses = useMemo(() => {
    const map = new Map();
    allClasses.forEach((c) => map.set(c.id, c));
    classes.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [allClasses, classes]);

  const {
    activeDirectives,
    completedDirectives,
    pendingCount: pendingDirectivesCount,
    loading: directivesLoading,
    handleToggle: handleToggleDirective,
  } = useStaffDirectives("instructor");

  useEffect(() => {
    const branchId = branchToId(effectiveBranch);
    const unsub = onSnapshot(
      query(
        collection(db, "classes"),
        where("branchId", "==", branchId),
        where("status", "==", "active")
      ),
      (snap) => {
        setAllClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [effectiveBranch]);

  return {
    uid,
    classes,
    rawClasses,
    students,
    instructorName,
    instructorRole,
    instructorBranch,
    effectiveRole,
    effectiveBranch,
    loading,
    error,
    allClasses,
    combinedAllClasses,
    activeDirectives,
    completedDirectives,
    pendingDirectivesCount,
    directivesLoading,
    handleToggleDirective,
  };
}
