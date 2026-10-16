import { z } from "zod";
import { normalizeBranch, isLeanSatelliteBranch } from "../constants/branches.js";
import { normalizeStaffDivision, isDivisionIndependentRole } from "../constants/divisions.js";
import { normalizeRole } from "../features/shared/roles.js";

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
  )
  .refine(
    (data) => {
      // Manager cannot have division = "all" (must be explicitly courses or kindergarten)
      if (data.role === "manager" && data.division === "all") {
        return false;
      }
      return true;
    },
    {
      message: "Managers cannot be assigned cross-divisional ('all') scope; managers must be assigned to courses or kindergarten.",
      path: ["division"],
    }
  )
  .refine(
    (data) => {
      // Lean satellite campuses are Course-only (no kindergarten or all division)
      if (data.branch && isLeanSatelliteBranch(data.branch)) {
        if (data.division === "kindergarten" || data.division === "all") {
          return false;
        }
      }
      return true;
    },
    {
      message: "Lean Satellite campuses operate single-division (Courses only) per Authoritative Blueprint v3.4 §4, §5, G-012.",
      path: ["division"],
    }
  )
  .refine(
    (data) => {
      // Leadership roles (opslead and instructorleader) exist only at Main Campus (Kota Gorontalo)
      if (data.branch && isLeanSatelliteBranch(data.branch)) {
        const canonicalRole = normalizeRole(data.role);
        if (canonicalRole === "opslead" || canonicalRole === "instructorleader") {
          return false;
        }
      }
      return true;
    },
    {
      message: "Operational Leader and Instructor Leader roles exist only at Main Campus (Kota Gorontalo) per Authoritative Blueprint v3.4 §4, §5, G-012.",
      path: ["role"],
    }
  )
  .refine(
    (data) => {
      // Marketing belongs strictly to the Course Division (Blueprint v3.4 §5.0.1)
      if (data.role === "marketing" && data.division !== "courses") {
        return false;
      }
      return true;
    },
    {
      message: "Marketing staff must be assigned to courses division per Authoritative Blueprint v3.4 §5.0.1.",
      path: ["division"],
    }
  );

