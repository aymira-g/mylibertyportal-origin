import { normalizeBranch, DEFAULT_BRANCH } from "../../../constants/branches";
import { getProgram } from "../../../constants/programs";
import { UNASSESSED, hasAssessedLevel } from "../../../constants/levels";

/**
 * Calculates current age from a Date of Birth (YYYY-MM-DD) string.
 * @param {string} dobString
 * @returns {number|null}
 */
export function calculateAge(dobString) {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Checks whether an error is a Firebase permission-denied error.
 * @param {any} err
 * @returns {boolean}
 */
export function isPermissionError(err) {
  if (!err) return false;
  const code = String(err.code || "").toLowerCase();
  const msg = String(err.message || "");
  return (
    code === "permission-denied" ||
    code === "permission_denied" ||
    msg.includes("Missing or insufficient permissions") ||
    msg.includes("insufficient permissions") ||
    msg.includes("permission-denied") ||
    msg.includes("PERMISSION_DENIED")
  );
}

export const LOCAL_INQUIRIES_STORAGE_KEY = "myliberty_desk_inquiries_local_v1";

/**
 * Purges any local inquiries stored in the browser.
 * Used during logout or when clearing stale unpersisted records.
 */
export function clearLocalInquiries() {
  try {
    const storage = getStorage();
    storage.removeItem(LOCAL_INQUIRIES_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed clearing local desk inquiries cache:", e);
  }
}

/**
 * @typedef {Object} DeskInquiryItem
 * @property {string} [id]
 * @property {string} [parentName]
 * @property {string} [studentName]
 * @property {string} [phone]
 * @property {string} [dob]
 * @property {string} [ageOrGrade]
 * @property {string} [fluencyTier]
 * @property {string} [currentLevel]
 * @property {string} [programId]
 * @property {string} [program]
 * @property {string} [notes]
 * @property {string} [division]
 * @property {string} [branch]
 * @property {string} [branchId]
 * @property {string} [status]
 * @property {string} [leadSource]
 * @property {Array<Object>} [placementTests]
 * @property {string} [convertedStudentId]
 * @property {string} [convertedAt]
 * @property {string} [createdAt]
 * @property {string} [createdBy]
 * @property {string} [createdByName]
 * @property {string} [updatedAt]
 * @property {string} [updatedBy]
 * @property {boolean} [isLocal]
 * @property {boolean} [_permissionDenied]
 */

/** @type {Record<string, string>} */
let memoryStorage = {};

export function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (/** @type {string} */ key) => memoryStorage[key] || null,
    setItem: (/** @type {string} */ key, /** @type {any} */ val) => {
      memoryStorage[key] = String(val);
    },
    removeItem: (/** @type {string} */ key) => {
      delete memoryStorage[key];
    },
    clear: () => {
      memoryStorage = {};
    },
  };
}

/**
 * Retrieves cached or locally recorded inquiries from storage.
 * @returns {Array<DeskInquiryItem>}
 */
export function getLocalInquiries() {
  try {
    const storage = getStorage();
    const raw = storage.getItem(LOCAL_INQUIRIES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (e) {
    console.warn("Failed reading local desk inquiries cache:", e);
    return [];
  }
}

/**
 * Saves or updates a local inquiry in storage.
 * @param {Record<string, any>} inquiry
 * @returns {DeskInquiryItem}
 */
export function saveLocalInquiry(inquiry) {
  const current = getLocalInquiries();
  const id = inquiry.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  /** @type {DeskInquiryItem} */
  const record = {
    ...inquiry,
    id,
    isLocal: true,
    createdAt: inquiry.createdAt || new Date().toISOString(),
  };
  const filtered = current.filter((item) => item.id !== id);
  const updated = [record, ...filtered];
  try {
    const storage = getStorage();
    storage.setItem(LOCAL_INQUIRIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed saving local desk inquiry to cache:", e);
  }
  return record;
}

/**
 * Updates a local inquiry's fields in storage.
 * @param {string} id
 * @param {Record<string, any>} updates
 * @returns {DeskInquiryItem|null}
 */
export function updateLocalInquiry(id, updates) {
  const current = getLocalInquiries();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  try {
    const storage = getStorage();
    storage.setItem(LOCAL_INQUIRIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed updating local desk inquiry cache:", e);
  }
  return updated.find((item) => item.id === id) || null;
}

/**
 * Deletes a local inquiry from storage.
 * @param {string} id
 * @returns {string}
 */
export function deleteLocalInquiry(id) {
  const current = getLocalInquiries();
  const filtered = current.filter((item) => item.id !== id);
  try {
    const storage = getStorage();
    storage.setItem(LOCAL_INQUIRIES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed deleting local desk inquiry from cache:", e);
  }
  return id;
}

export const COURSE_TIER_OPTIONS = [
  {
    id: "beginner",
    label: "Beginner",
    starText: "⭐",
    levelsText: "Warrior / Elite",
    defaultLevel: "warrior",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    starText: "⭐⭐",
    levelsText: "Master / Grandmaster",
    defaultLevel: "master",
  },
  {
    id: "fluent",
    label: "Fluent",
    starText: "⭐⭐⭐",
    levelsText: "Epic",
    defaultLevel: "epic",
  },
];

export const KINDERGARTEN_TIER_OPTIONS = [
  {
    id: "beginner",
    label: "Playgroup / Nursery (Age 2-3)",
    starText: "⭐",
    levelsText: "Nursery",
    defaultLevel: "nursery",
  },
  {
    id: "intermediate",
    label: "Kindergarten A / TK-A (Age 4)",
    starText: "⭐⭐",
    levelsText: "TK-A",
    defaultLevel: "tk_a",
  },
  {
    id: "fluent",
    label: "Kindergarten B / TK-B (Age 5)",
    starText: "⭐⭐⭐",
    levelsText: "TK-B",
    defaultLevel: "tk_b",
  },
];

/**
 * Maps a walk-in inquiry record into prefill fields for student registration.
 *
 * Enforces:
 * 1. Honest academic level (Phase 3 / F-11 & OD-FO-3): unassessed unless verified assessment exists.
 * 2. Indonesian parent title disambiguation (mother vs father vs primary guardian).
 * 3. Dynamic branch assignment (never hardcoded Kota Gorontalo).
 *
 * @param {Record<string, any>} [inquiry]
 * @param {object} [options]
 * @param {string} [options.branch] - Active dashboard branch
 * @param {string} [options.division] - Active dashboard division ("courses" | "kindergarten")
 * @returns {Record<string, any>} Prefill object for handleAddStudent
 */
export function mapInquiryToEnrollment(inquiry = {}, { branch = DEFAULT_BRANCH, division = "courses" } = {}) {
  const isKindergarten = (inquiry.division || division) === "kindergarten";
  const defaultProgId = isKindergarten ? "kids_school" : "english_course";
  const chosenProgId = inquiry.programId || defaultProgId;
  const prog = getProgram(chosenProgId);

  let level = UNASSESSED;
  if (hasAssessedLevel(inquiry.currentLevel)) {
    level = inquiry.currentLevel;
  } else if (Array.isArray(inquiry.placementTests) && inquiry.placementTests.length > 0) {
    const latestTest = inquiry.placementTests[inquiry.placementTests.length - 1];
    if (hasAssessedLevel(latestTest?.assessedLevel)) {
      level = latestTest.assessedLevel;
    }
  }

  const rawParent = (inquiry.parentName || "").trim();
  const contactPhone = (inquiry.phone || "").trim();
  let fatherName = "";
  let fatherPhone = "";
  let motherName = "";
  let motherPhone = "";
  let parentName = rawParent;
  let parentPhone = contactPhone;

  if (/^(ibu|mama|ny\b|mrs|umi|bunda)/i.test(rawParent)) {
    motherName = rawParent;
    motherPhone = contactPhone;
  } else if (/^(bapak|pak|bpk|mr\b|papa|ayah|abi)/i.test(rawParent)) {
    fatherName = rawParent;
    fatherPhone = contactPhone;
  }

  return {
    displayName: inquiry.studentName || "",
    firstName: inquiry.studentName?.split(" ")[0] || "",
    lastName: inquiry.studentName?.split(" ").slice(1).join(" ") || "",
    dob: inquiry.dob || "",
    phone: contactPhone,
    parentName,
    parentPhone,
    fatherName,
    fatherPhone,
    motherName,
    motherPhone,
    branch: normalizeBranch(inquiry.branch || branch || DEFAULT_BRANCH),
    division: isKindergarten ? "kindergarten" : "courses",
    programId: chosenProgId,
    program:
      prog?.label ||
      inquiry.program ||
      (isKindergarten ? "Kids School (Kindergarten)" : "English Course"),
    currentLevel: level,
    placementTests: Array.isArray(inquiry.placementTests) ? inquiry.placementTests : [],
    inquiryId: inquiry.id || "",
    referralSource: "Walk-in Front Desk",
    notes: `Walk-in prospect enrolled directly.${inquiry.notes ? ` Inquired: ${inquiry.notes}` : ""}`,
  };
}
