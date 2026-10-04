import { auth, db } from "../../firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { corporateEventSchema } from "../../schemas/corporateEventSchema.js";
import { branchToId, idToBranch } from "../../constants/branches.js";
import { normalizeRole, isExecutiveRole } from "../shared/roles.js";

/**
 * Resolves the staff user's target branchId for corporate events queries.
 * - Explicit branchId argument if provided (or "all" for admin/executive)
 * - Otherwise fetches users/{uid} for the signed-in user
 *
 * @param {string|null} [explicitBranchId]
 * @returns {Promise<string|null>} "all", canonical branchId, or null
 */
export async function resolveCurrentStaffBranchId(explicitBranchId = null) {
  if (explicitBranchId) {
    return explicitBranchId === "all" ? "all" : branchToId(explicitBranchId);
  }
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      const normRole = normalizeRole(data.role);
      if (normRole === "admin" || isExecutiveRole(normRole)) return "all";
      return data.branchId || (data.branch ? branchToId(data.branch) : null);
    }
  } catch {
    // Fail closed
  }
  return null;
}

/**
 * Fetches active corporate events for a specific date (YYYY-MM-DD WITA).
 * Splits into company-wide (audienceType == "all") and branch-scoped queries
 * to satisfy strict Firestore security rules and prevent cross-branch leakage.
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string|null} [branchId] - Optional explicit branchId (or "all" for admin)
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function fetchActiveCorporateEventsForDate(dateStr, branchId = null) {
  if (!dateStr) return [];
  const targetBranchId = await resolveCurrentStaffBranchId(branchId);

  if (targetBranchId === "all") {
    const q = query(
      collection(db, "corporateEvents"),
      where("eventDate", "==", dateStr),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Query A: Company-wide active events for date
  const qAll = query(
    collection(db, "corporateEvents"),
    where("eventDate", "==", dateStr),
    where("status", "==", "active"),
    where("audienceType", "==", "all")
  );
  const promises = [getDocs(qAll)];

  // Query B: Branch-specific active events for date
  if (targetBranchId) {
    const qBranch = query(
      collection(db, "corporateEvents"),
      where("eventDate", "==", dateStr),
      where("status", "==", "active"),
      where("branchId", "==", targetBranchId)
    );
    promises.push(getDocs(qBranch));
  }

  const results = await Promise.all(promises);
  const map = new Map();
  results.forEach((snap) => {
    snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  });
  return Array.from(map.values());
}

/**
 * Fetches corporate events ordered by date descending.
 * Splits into company-wide and branch-scoped queries, merging by ID in memory.
 *
 * @param {string|null} [branchId]
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function fetchCorporateEvents(branchId = null) {
  const targetBranchId = await resolveCurrentStaffBranchId(branchId);

  if (targetBranchId === "all") {
    const q = query(collection(db, "corporateEvents"), orderBy("eventDate", "desc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const qAll = query(
    collection(db, "corporateEvents"),
    where("audienceType", "==", "all"),
    orderBy("eventDate", "desc"),
    limit(100)
  );
  const promises = [getDocs(qAll)];

  if (targetBranchId) {
    const qBranch = query(
      collection(db, "corporateEvents"),
      where("branchId", "==", targetBranchId),
      orderBy("eventDate", "desc"),
      limit(100)
    );
    promises.push(getDocs(qBranch));
  }

  const results = await Promise.all(promises);
  const map = new Map();
  results.forEach((snap) => {
    snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  });

  return Array.from(map.values())
    .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""))
    .slice(0, 100);
}

/**
 * Subscribes to corporate events collection with real-time updates.
 * For non-admin staff, opens two listeners (company-wide + branch events)
 * and returns a single unsubscribe closure.
 *
 * @param {(events: any[]) => void} onData
 * @param {(err: Error) => void} [onError]
 * @param {string|null} [branchId]
 * @returns {() => void} Unsubscribe function
 */
export function subscribeCorporateEvents(onData, onError, branchId = null) {
  if (branchId === "all") {
    const q = query(collection(db, "corporateEvents"), orderBy("eventDate", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onData(items);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  }

  const targetBranchId = branchId && branchId !== "all" ? branchToId(branchId) : null;
  let allDocs = [];
  let branchDocs = [];
  const unsubs = [];

  const emit = () => {
    const map = new Map();
    allDocs.forEach((docItem) => map.set(docItem.id, docItem));
    branchDocs.forEach((docItem) => map.set(docItem.id, docItem));
    const merged = Array.from(map.values())
      .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""))
      .slice(0, 100);
    onData(merged);
  };

  // Listener A: Company-wide events
  const qAll = query(
    collection(db, "corporateEvents"),
    where("audienceType", "==", "all"),
    orderBy("eventDate", "desc"),
    limit(100)
  );
  unsubs.push(
    onSnapshot(
      qAll,
      (snap) => {
        allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      (err) => {
        if (onError) onError(err);
      }
    )
  );

  // Listener B: Branch-scoped events (if targetBranchId present)
  if (targetBranchId) {
    const qBranch = query(
      collection(db, "corporateEvents"),
      where("branchId", "==", targetBranchId),
      orderBy("eventDate", "desc"),
      limit(100)
    );
    unsubs.push(
      onSnapshot(
        qBranch,
        (snap) => {
          branchDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          emit();
        },
        (err) => {
          if (onError) onError(err);
        }
      )
    );
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // ignore
      }
    });
  };
}

/**
 * Creates a new corporate event in Firestore.
 * Validates payload with corporateEventSchema before writing.
 *
 * @param {Record<string, any>} rawPayload
 * @param {string} creatorUid
 * @returns {Promise<import("firebase/firestore").DocumentReference>}
 */
export function createCorporateEvent(rawPayload, creatorUid) {
  const validated = corporateEventSchema.parse(rawPayload);

  const payloadRecord = /** @type {Record<string, any>} */ (rawPayload || {});
  const rawBranch =
    payloadRecord.branchId ||
    payloadRecord.branch ||
    (validated.audienceType === "branch" ? validated.audienceValue : null);
  const branchId = rawBranch ? branchToId(rawBranch) : null;
  const branch = branchId ? idToBranch(branchId) : null;

  const docData = {
    name: validated.name,
    eventDate: validated.eventDate,
    startTime: validated.startTime || null,
    endTime: validated.endTime || null,
    audienceType: validated.audienceType,
    audienceValue: validated.audienceValue || null,
    ...(branchId ? { branchId, branch } : {}),
    status: "active",
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return addDoc(collection(db, "corporateEvents"), docData);
}

/**
 * Updates an existing corporate event.
 *
 * @param {string} eventId
 * @param {object} updates
 * @returns {Promise<void>}
 */
export function updateCorporateEvent(eventId, updates) {
  const cleanUpdates = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  return updateDoc(doc(db, "corporateEvents", eventId), cleanUpdates);
}

/**
 * Soft-cancels a corporate event (preserves history, never hard deletes).
 *
 * @param {string} eventId
 * @param {string} cancelledByUid
 * @returns {Promise<void>}
 */
export function cancelCorporateEvent(eventId, cancelledByUid) {
  return updateDoc(doc(db, "corporateEvents", eventId), {
    status: "cancelled",
    cancelledBy: cancelledByUid || null,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
