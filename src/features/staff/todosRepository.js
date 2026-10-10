import { auth, db } from "../../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_BRANCH, normalizeBranch, branchToId } from "../../constants/branches.js";

/**
 * All direct Firestore writes for todos/directives live here.
 */

export function createTodo({
  text,
  type = "directive",
  priority = "normal",
  isPinned = false,
  assignee = "all",
  assigneeType = "role",
  assigneeName = "Everyone",
  dueDate = null,
  createdBy = null,
  createdByName = null,
  branch = DEFAULT_BRANCH,
  branchId = null,
  division = "all",
}) {
  const normalizedBranch = normalizeBranch(branch);
  return addDoc(collection(db, "todos"), {
    text: (text || "").trim(),
    type,
    priority,
    isPinned: Boolean(isPinned),
    assignee,
    assigneeType,
    assigneeName,
    dueDate: dueDate || null,
    completed: false,
    completedAt: null,
    completedBy: null,
    completedByName: null,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || null,
    createdByName: createdByName || null,
    branch: normalizedBranch,
    branchId: branchId || branchToId(normalizedBranch),
    division: division || "all",
  });
}

export function toggleTodoComplete(todoId, completed, currentUser = null) {
  const user = currentUser || auth?.currentUser;
  const updates = completed
    ? {
        completed: true,
        completedAt: serverTimestamp(),
        completedBy: user?.uid || null,
        completedByName: user?.displayName || user?.email || "Staff Member",
      }
    : {
        completed: false,
        completedAt: null,
        completedBy: null,
        completedByName: null,
      };

  return updateDoc(doc(db, "todos", todoId), updates);
}

export function updateTodo(todoId, updates) {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if ("branch" in updates) {
    payload.branch = normalizeBranch(updates.branch);
  }
  return updateDoc(doc(db, "todos", todoId), payload);
}

export function deleteTodo(todoId) {
  return deleteDoc(doc(db, "todos", todoId));
}
