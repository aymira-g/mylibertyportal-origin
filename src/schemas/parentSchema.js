import { z } from "zod";
import { branchToId, idToBranch, DEFAULT_BRANCH_ID } from "../constants/branches.js";

/**
 * Validates a parent user document in the /users collection.
 * Conforms to the Parent + Student Roster Data Model v2 specification.
 */
export const parentUserSchema = z
  .object({
    displayName: z.string().trim().min(1, "Parent display name is required."),
    email: z.string().trim().toLowerCase().email("A valid email address is required."),
    phone: z.string().trim().optional().default(""),
    role: z.literal("parent").default("parent"),
    childStudentIds: z
      .preprocess((val) => (Array.isArray(val) ? val : []), z.array(z.string().trim()))
      .default([]),
    branch: z.string().trim().optional(),
    branchId: z.string().trim().optional(),
    status: z.string().trim().optional().default("active"),
    createdAt: z.string().trim().optional(),
    updatedAt: z.string().trim().optional(),
  })
  .transform((data) => {
    const rawBranch = data.branchId || data.branch || DEFAULT_BRANCH_ID;
    const branchId = branchToId(rawBranch);
    const branch = idToBranch(branchId);
    return {
      ...data,
      branchId,
      branch,
    };
  });

/**
 * Validates input for creating a new parent account via admin/front-office workflow.
 */
export const createParentPayloadSchema = z.object({
  displayName: z.string().trim().min(1, "Parent name is required."),
  email: z.string().trim().toLowerCase().email("A valid email address is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  phone: z.string().trim().optional().default(""),
  branchId: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  initialChildStudentId: z.string().trim().optional(),
  childStudentIds: z.array(z.string().trim()).optional(),
  status: z.string().trim().optional(),
});

/**
 * Validates parent-child relationship link/unlink operations.
 */
export const parentChildLinkSchema = z.object({
  parentUid: z.string().trim().min(1, "Parent UID is required."),
  studentId: z.string().trim().min(1, "Student ID is required."),
});
