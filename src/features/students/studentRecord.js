import { normalizeBranch, branchToId } from "../../constants/branches.js";
import { normalizeProgram, getProgram } from "../../constants/programs.js";
import { divisionOfProgram } from "../../constants/divisions.js";
import { normalizeBatchType } from "../../constants/batchTypes.js";
import { UNASSESSED, hasAssessedLevel } from "../../constants/levels.js";

function clean(value) {
  return (value || "").toString().trim();
}

/**
 * Builds the canonical shape of a student's document in the `users`
 * collection. Previously this same field list was hand-typed in two
 * separate places (the admin Add/Edit Student form, and the application
 * approval flow) with no shared definition — a field added in one place
 * had no way of reaching the other. Now there's one definition; both
 * call sites just supply the raw values they have on hand.
 *
 * `joinedDate` is intentionally left to the caller rather than computed
 * here — the admin form lets staff pick an arbitrary join date, while
 * approving an application always uses "today". That's a per-flow
 * decision, not part of what a student record fundamentally looks like.
 */
export function buildStudentRecord(fields = {}) {
  const fatherName = clean(fields.fatherName);
  const motherName = clean(fields.motherName);
  const fatherPhone = clean(fields.fatherPhone);
  const motherPhone = clean(fields.motherPhone);
  const programId = normalizeProgram(fields.programId || fields.program);
  const progObj = getProgram(programId);
  const rawProgram = clean(fields.program);
  const program =
    rawProgram && rawProgram !== programId
      ? rawProgram
      : progObj?.label || rawProgram || programId;
  const division = divisionOfProgram(fields.division || programId);
  const batchType = normalizeBatchType(fields.batchType || fields.classType);

  return {
    displayName: clean(fields.displayName),
    nickname: clean(fields.nickname),
    gender: fields.gender || "",
    phone: clean(fields.phone),
    dob: fields.dob || "",
    placeOfBirth: clean(fields.placeOfBirth),
    religion: clean(fields.religion),
    address: clean(fields.address),
    branch: normalizeBranch(fields.branch),
    branchId: branchToId(fields.branchId || fields.branch),
    program,
    programId,
    division,
    batchType,
    classType: clean(fields.classType),
    schoolOrJob: clean(fields.schoolOrJob),
    classOrSemester: clean(fields.classOrSemester),
    joinedDate: fields.joinedDate || "",
    fatherName,
    fatherJob: clean(fields.fatherJob),
    fatherPhone,
    motherName,
    motherJob: clean(fields.motherJob),
    motherPhone,
    parentName: fatherName || motherName || clean(fields.parentName),
    parentPhone: fatherPhone || motherPhone || clean(fields.parentPhone),
    photoURL: clean(fields.photoURL),
    referralSource: clean(fields.referralSource),
    // Never default a fabricated level (Phase 3 / F-11). An unassessed student is
    // explicitly UNASSESSED, which is distinguishable from a genuine beginner placement.
    currentLevel: hasAssessedLevel(clean(fields.currentLevel)) ? clean(fields.currentLevel) : UNASSESSED,
    placementTests: Array.isArray(fields.placementTests) ? fields.placementTests : [],
    inquiryId: clean(fields.inquiryId),
    rating: fields.rating || "1",
    paymentPlan: clean(fields.paymentPlan) || "monthly",
    ...(fields.tuitionRate !== undefined && fields.tuitionRate !== "" ? { tuitionRate: Number(fields.tuitionRate) || 0 } : {}),
    ...(fields.registrationFee !== undefined && fields.registrationFee !== "" ? { registrationFee: Number(fields.registrationFee) || 0 } : {}),
    ...(fields.handbookFee !== undefined && fields.handbookFee !== "" ? { handbookFee: Number(fields.handbookFee) || 0 } : {}),
    ...(fields.paidUntil ? { paidUntil: clean(fields.paidUntil) } : {}),
    status: clean(fields.status) || "active",
    notes: clean(fields.notes),
    role: "student",
  };
}

export const STUDENT_STATUS_MAP = {
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  on_leave: { label: "On Leave", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  graduated: { label: "Graduated", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  inactive: { label: "Inactive", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  archived: { label: "Archived", tone: "bg-slate-100 text-slate-500 border-slate-300" },
};

export const STUDENT_STATUS_OPTIONS = Object.entries(STUDENT_STATUS_MAP).map(([value, conf]) => ({
  value,
  label: conf.label,
}));

export function isActiveStudent(student) {
  if (!student) return false;
  return (student.status || "active") === "active";
}

/**
 * Evaluates whether a student's academic level has documented assessment provenance.
 *
 * Provenance is derived at read time (OD-FO-3 / Phase 3 Q5):
 * - If holding UNASSESSED or missing, returns false (not assessed).
 * - If holding an advanced/non-default level (elite, master, grandmaster, epic), returns true.
 * - If holding the legacy intake default ("warrior" / "nursery"):
 *   - Returns true IF supported by recorded placement tests (placementTests.length > 0)
 *     or progress reports.
 *   - Returns false (unverified) IF neither assessment record exists.
 *
 * @param {any} student
 * @returns {boolean}
 */
export function hasLevelProvenance(student) {
  if (!student) return false;
  const level = (student.currentLevel || "").toLowerCase();
  if (!hasAssessedLevel(level)) return false;

  const isDefaultLevel = level === "warrior" || level === "nursery";
  if (!isDefaultLevel) return true;

  const hasPlacement = Array.isArray(student.placementTests) && student.placementTests.length > 0;
  const hasReport = Boolean(student.lastAssessmentDate || student.progressReportId || student.assessedAt);

  return hasPlacement || hasReport;
}

/**
 * Returns a display-safe descriptor of the student's level.
 *
 * @param {any} student
 * @returns {string}
 */
export function getStudentLevelDisplay(student) {
  if (!student) return "";
  const level = student.currentLevel;
  if (!hasAssessedLevel(level)) return "unassessed";
  if (!hasLevelProvenance(student)) {
    return `${level} (unverified)`;
  }
  return level;
}

