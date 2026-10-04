import { z } from "zod";
import { normalizeBranch } from "../constants/branches.js";
import { normalizeStaffDivision, isDivisionIndependentRole } from "../constants/divisions.js";

export const ALLOWED_STAFF_ROLES = [
  "director",
  "vice_director",
  "admin",
  "manager",
  "instructor",
  "instructorleader",
  "marketing",
  "frontoffice",
  "opslead",
  "officeboy",
];

export const KINDERGARTEN_STAFF_ROLES = [
  "manager",
  "instructor",
  "instructorleader",
  "frontoffice",
  "opslead",
];

export const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("A valid email address is required."),
    role: z.enum(ALLOWED_STAFF_ROLES, {
      message: `Role must be one of: ${ALLOWED_STAFF_ROLES.join(", ")}`,
    }),
    branch: z
      .string()
      .trim()
      .optional()
      .transform((b) => normalizeBranch(b)),
    division: z
      .string()
      .trim()
      .nullable()
      .optional(),
  })
  .transform((data) => {
    return {
      ...data,
      division: isDivisionIndependentRole(data.role)
        ? null
        : normalizeStaffDivision(data.division, data.role),
    };
  })
  .refine(
    (data) => {
      // Academic staff cannot have division = null (executives and facility staff exempt)
      if (
        !isDivisionIndependentRole(data.role) &&
        data.role !== "admin" &&
        data.role !== "director" &&
        data.role !== "vice_director" &&
        !data.division
      ) {
        return false;
      }
      return true;
    },
    {
      message: "An academic division (courses, kindergarten, or all) is required for this role.",
      path: ["division"],
    }
  );

