import { describe, it, expect } from "vitest";


/**
 * Pure routing resolver mirroring the exact dispatch contract in src/App.jsx:
 *
 * {effectiveRole === "instructor" && (
 *   <ErrorBoundary label="Instructor dashboard">
 *     {effectiveDivision === "kindergarten" ? (
 *       <KidsInstructorDashboard />
 *     ) : (
 *       <InstructorDashboard role={effectiveRole} />
 *     )}
 *   </ErrorBoundary>
 * )}
 * {(effectiveRole === "instructorleader" ||
 *   effectiveRole === "instructor_leader") && (
 *   <ErrorBoundary label="Instructor Leader dashboard">
 *     <InstructorLeaderDashboard role={effectiveRole} />
 *   </ErrorBoundary>
 * )}
 */
export function resolveInstructorDashboard(effectiveRole, effectiveDivision) {
  if (effectiveRole === "instructor") {
    return effectiveDivision === "kindergarten"
      ? "KidsInstructorDashboard"
      : "InstructorDashboard";
  }
  if (
    effectiveRole === "instructorleader" ||
    effectiveRole === "instructor_leader"
  ) {
    return "InstructorLeaderDashboard";
  }
  return null;
}

describe("Instructor & Instructor Leader Routing Invariants (Phase 0 File Split)", () => {
  describe("Ordinary Instructor Routing", () => {
    it("routes ordinary instructor with division courses to InstructorDashboard", () => {
      expect(resolveInstructorDashboard("instructor", "courses")).toBe("InstructorDashboard");
    });

    it("routes ordinary instructor with division 'all' to InstructorDashboard", () => {
      expect(resolveInstructorDashboard("instructor", "all")).toBe("InstructorDashboard");
    });

    it("routes ordinary instructor with unset division to InstructorDashboard", () => {
      expect(resolveInstructorDashboard("instructor", undefined)).toBe("InstructorDashboard");
      expect(resolveInstructorDashboard("instructor", null)).toBe("InstructorDashboard");
    });

    it("routes ordinary instructor with division kindergarten to KidsInstructorDashboard", () => {
      expect(resolveInstructorDashboard("instructor", "kindergarten")).toBe("KidsInstructorDashboard");
    });
  });

  describe("Instructor Leader Routing (Division-Independent Contract)", () => {
    it("routes canonical instructorleader with courses division to InstructorLeaderDashboard", () => {
      expect(resolveInstructorDashboard("instructorleader", "courses")).toBe("InstructorLeaderDashboard");
    });

    it("routes canonical instructorleader with kindergarten division to InstructorLeaderDashboard (owner-authorized fix)", () => {
      // Under G-003 and Blueprint §6.11, leader covers both divisions and is NOT gated by division
      expect(resolveInstructorDashboard("instructorleader", "kindergarten")).toBe("InstructorLeaderDashboard");
    });

    it("routes canonical instructorleader with 'all' division to InstructorLeaderDashboard", () => {
      expect(resolveInstructorDashboard("instructorleader", "all")).toBe("InstructorLeaderDashboard");
    });

    it("routes canonical instructorleader with unset division to InstructorLeaderDashboard", () => {
      expect(resolveInstructorDashboard("instructorleader", undefined)).toBe("InstructorLeaderDashboard");
    });

    it("routes legacy instructor_leader alias with all divisions to InstructorLeaderDashboard", () => {
      expect(resolveInstructorDashboard("instructor_leader", "courses")).toBe("InstructorLeaderDashboard");
      expect(resolveInstructorDashboard("instructor_leader", "kindergarten")).toBe("InstructorLeaderDashboard");
      expect(resolveInstructorDashboard("instructor_leader", "all")).toBe("InstructorLeaderDashboard");
      expect(resolveInstructorDashboard("instructor_leader", undefined)).toBe("InstructorLeaderDashboard");
    });
  });

  describe("Non-Instructor Roles", () => {
    it("does not match non-instructor roles", () => {
      expect(resolveInstructorDashboard("opslead", "courses")).toBeNull();
      expect(resolveInstructorDashboard("manager", "courses")).toBeNull();
      expect(resolveInstructorDashboard("admin", "courses")).toBeNull();
      expect(resolveInstructorDashboard("head_instructor", "courses")).toBeNull();
    });
  });
});
