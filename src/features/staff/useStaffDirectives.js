import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { toggleTodoComplete } from "./todosRepository";
import { useUserProfile } from "../shared/useUserProfile";
import { branchToId } from "../../constants/branches.js";

/**
 * Real-time hook for any staff dashboard to subscribe to their operational directives.
 *
 * Automatically matches directives assigned to:
 * 1. "all" (All Academy Staff)
 * 2. The specific role (e.g. "instructor", "marketing", "frontoffice", "officeboy")
 * 3. The signed-in user's UID (individual 1-on-1 assignments)
 *
 * Scopes queries to the user's branch + academy-wide directives to maintain branch isolation.
 */
export function useStaffDirectives(role, explicitBranch = null) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;
  const {
    branchId: profileBranchId,
    branch: profileBranch,
    profile,
    loading: profileLoading,
  } = useUserProfile();
  const profileDivision = profile?.division;

  const effectiveBranchId = explicitBranch
    ? branchToId(explicitBranch)
    : profileBranchId || (profileBranch ? branchToId(profileBranch) : null);

  useEffect(() => {
    if (!currentUser) {
      return () => {};
    }

    if (!effectiveBranchId && profileLoading) {
      return () => {};
    }

    const branchConstraint = effectiveBranchId
      ? where("branchId", "in", [effectiveBranchId, "all"])
      : where("branchId", "==", "all");

    const q = query(collection(db, "todos"), branchConstraint);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTodos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Staff directives listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, effectiveBranchId, profileLoading]);

  const directives = useMemo(() => {
    const uid = currentUser?.uid;
    const userDiv = profileDivision || null;
    return todos.filter((t) => {
      // Division gating:
      // Staff with "all" or null (facility-wide) receive directives across all divisions.
      // Staff bound to a specific division only receive directives matching their division, "all", or untagged directives.
      if (
        userDiv &&
        userDiv !== "all" &&
        t.division &&
        t.division !== "all" &&
        t.division !== userDiv
      ) {
        return false;
      }
      if (t.assignee === "all") return true;
      if (role && t.assignee === role) return true;
      if (uid && t.assignee === uid) return true;
      return false;
    });
  }, [todos, role, currentUser?.uid, profileDivision]);

  const activeDirectives = useMemo(() => {
    return directives
      .filter((d) => !d.completed)
      .sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Urgent priority next
        const prioRank = { urgent: 3, high: 2, normal: 1 };
        const pA = prioRank[a.priority] || 1;
        const pB = prioRank[b.priority] || 1;
        if (pA !== pB) return pB - pA;

        // Due dates next (nearest first)
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (diff !== 0) return diff;
        }

        // Newest createdAt
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [directives]);

  const completedDirectives = useMemo(() => {
    return directives
      .filter((d) => d.completed)
      .sort(
        (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );
  }, [directives]);

  const handleToggle = async (todoId, completed) => {
    return toggleTodoComplete(todoId, completed, currentUser);
  };

  return {
    directives,
    activeDirectives,
    completedDirectives,
    pendingCount: activeDirectives.length,
    loading,
    handleToggle,
  };
}
