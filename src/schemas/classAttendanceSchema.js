import { z } from "zod";
import { idToBranch, branchToId } from "../constants/branches.js";

export const CLASS_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
export const CLASS_ATTENDANCE_METHODS = ["SCAN", "MANUAL", "CLOSE_OUT"];

/**
 * Zod schema for individual student class attendance records.
 * Collection: /classAttendance/{classId}_{studentId}_{attendanceDate}
 */
export const classAttendanceSchema = z
  .object({
    classId: z.string().trim().min(1, "Class ID is required."),
    studentId: z.string().trim().min(1, "Student ID is required."),
    attendanceDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Attendance date must be in YYYY-MM-DD format."),
    status: z.enum(CLASS_ATTENDANCE_STATUSES, {
      message: `Status must be one of: ${CLASS_ATTENDANCE_STATUSES.join(", ")}`,
    }),
    method: z.enum(CLASS_ATTENDANCE_METHODS, {
      message: `Method must be one of: ${CLASS_ATTENDANCE_METHODS.join(", ")}`,
    }),
    markedBy: z.string().trim().min(1, "markedBy UID is required."),
    markedByName: z.string().trim().optional().default(""),
    markedAt: z.string().trim().min(1, "markedAt timestamp is required."),
    studentName: z.string().trim().optional().default(""),
    className: z.string().trim().optional().default(""),
    branchId: z.string().trim().optional().default(""),
    branch: z.string().trim().optional().default(""),
    division: z.string().trim().optional().default(""),
    note: z.string().trim().optional().default(""),
    createdAt: z.string().trim().optional(),
    updatedAt: z.string().trim().optional(),
    // Start of the attendance day in WITA, written by the create paths via
    // dateWita.witaDayStart(). `z.any()` on purpose: a Date on write, but a Firestore
    // Timestamp when a record is read back, and both must validate.
    //
    // firestore.rules requires this field on create and refuses a retroactive backfill
    // (a day that has already ended in WITA) unless an approved
    // RETROACTIVE_STUDENT_ATTENDANCE envelope authorises the exact record.
    attendanceDateTs: z.any().optional(),
    // Set only when an approved backfill envelope is being applied.
    appliedFromApproval: z.string().trim().optional(),
  })
  .transform((data) => {
    const nowIso = new Date().toISOString();
    const normalizedBranchId = data.branchId ? branchToId(data.branchId) : "";
    const normalizedBranch = data.branch || (normalizedBranchId ? idToBranch(normalizedBranchId) : "");
    return {
      ...data,
      markedByName: data.markedByName || "",
      studentName: data.studentName || "",
      className: data.className || "",
      branchId: normalizedBranchId,
      branch: normalizedBranch,
      note: data.note || "",
      createdAt: data.createdAt || nowIso,
      updatedAt: data.updatedAt || nowIso,
    };
  });
