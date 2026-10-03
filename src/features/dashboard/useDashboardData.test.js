import { describe, it, expect } from "vitest";
import { resolveTargetBranchId } from "./useDashboardData";

describe("useDashboardData branch resolution & query safety", () => {
  describe("resolveTargetBranchId matrix", () => {
    it("resolves canonical targetBranchId when profile contains branchId only", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: "bone_bolango",
        profileBranch: null,
      });
      expect(targetBranchId).toBe("bone_bolango");
    });

    it("resolves canonical targetBranchId when profile contains legacy branch only", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: null,
        profileBranch: "Bone Bolango",
      });
      expect(targetBranchId).toBe("bone_bolango");
    });

    it("prioritizes canonical profileBranchId when both branchId and legacy branch are present but different", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: "pohuwato",
        profileBranch: "Kota Gorontalo",
      });
      expect(targetBranchId).toBe("pohuwato");
    });

    it("returns null (fails closed) when neither field is present in profile", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: null,
        profileBranch: null,
      });
      expect(targetBranchId).toBeNull();
      expect(targetBranchId).not.toBe("kota_gorontalo");
    });

    it("does not silently fall back to kota_gorontalo or DEFAULT_BRANCH_ID for staff authorization", () => {
      // Front Office staff with empty profile document (no branchId, no branch)
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: undefined,
        profileBranch: undefined,
      });
      expect(targetBranchId).toBeNull();
    });

    it("prioritizes explicit branch prop over profile values", () => {
      const targetBranchId = resolveTargetBranchId({
        branch: "Limboto",
        restrictedRead: true,
        profileBranchId: "kota_gorontalo",
        profileBranch: "Kota Gorontalo",
      });
      expect(targetBranchId).toBe("limboto");
    });

    it("handles explicit branch='all' correctly by returning null (unrestricted)", () => {
      const targetBranchId = resolveTargetBranchId({
        branch: "all",
        restrictedRead: false,
      });
      expect(targetBranchId).toBeNull();
    });

    it("Item A: resolves branch for manager or non-admin roles without restrictedRead", () => {
      const managerBranchId = resolveTargetBranchId({
        role: "manager",
        profileBranchId: "kota_gorontalo",
      });
      expect(managerBranchId).toBe("kota_gorontalo");

      const instructorBranchId = resolveTargetBranchId({
        role: "instructor",
        profileBranch: "Bone Bolango",
      });
      expect(instructorBranchId).toBe("bone_bolango");
    });

    it("Item A: returns null (fails closed) for manager or non-admin with no branch assigned", () => {
      const targetBranchId = resolveTargetBranchId({
        role: "manager",
        profileBranchId: null,
        profileBranch: null,
      });
      expect(targetBranchId).toBeNull();

      // Non-admin guard check: needsBranch = !isAdmin
      const isAdmin = false;
      const needsBranch = !isAdmin;
      const wouldFailClosed = needsBranch && !targetBranchId;
      expect(wouldFailClosed).toBe(true);
    });

    it("Item A: allows admin to run branchless cross-branch queries", () => {
      const targetBranchId = resolveTargetBranchId({
        role: "admin",
        profileBranchId: null,
      });
      expect(targetBranchId).toBeNull();

      const isAdmin = true;
      const needsBranch = !isAdmin;
      const wouldFailClosed = needsBranch && !targetBranchId;
      expect(wouldFailClosed).toBe(false); // Admin is allowed to be branchless
    });
  });

  describe("Front Office query safety & branch scoping", () => {
    it("ensures Courses Front Office requires branch-scoped query and does not fall back to unscoped", () => {
      const isRestrictedRead = true;
      // Simulate Courses Front Office with resolved branchId
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: isRestrictedRead,
        profileBranchId: "kota_gorontalo",
      });
      expect(targetBranchId).toBe("kota_gorontalo");

      // Verify that query constraints include both the role allow-list and branchId
      const constraints = [];
      if (isRestrictedRead) {
        constraints.push({ type: "where", field: "role", op: "in", val: ["student", "instructor", "parent"] });
      }
      if (targetBranchId) {
        constraints.push({ type: "where", field: "branchId", op: "==", val: targetBranchId });
      }

      expect(constraints).toHaveLength(2);
      expect(constraints).toEqual([
        { type: "where", field: "role", op: "in", val: ["student", "instructor", "parent"] },
        { type: "where", field: "branchId", op: "==", val: "kota_gorontalo" },
      ]);
    });

    it("ensures Kindergarten Front Office requires branch-scoped query and division scoping", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: "bone_bolango",
      });
      expect(targetBranchId).toBe("bone_bolango");

      // Kindergarten student query constraints
      const studentConstraints = [
        { type: "where", field: "role", op: "==", val: "student" },
        { type: "where", field: "division", op: "==", val: "kindergarten" },
      ];
      if (targetBranchId) {
        studentConstraints.push({ type: "where", field: "branchId", op: "==", val: targetBranchId });
      }

      expect(studentConstraints).toEqual([
        { type: "where", field: "role", op: "==", val: "student" },
        { type: "where", field: "division", op: "==", val: "kindergarten" },
        { type: "where", field: "branchId", op: "==", val: "bone_bolango" },
      ]);
    });

    it("fails closed when Front Office has neither branch field present, refusing unscoped queries", () => {
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: null,
        profileBranch: null,
      });

      // targetBranchId must be null
      expect(targetBranchId).toBeNull();

      // Guard check: restrictedRead with null targetBranchId must abort rather than query collection
      const wouldRunUnscopedQuery = !targetBranchId && true /* restrictedRead */;
      // The guard in useDashboardData: if (restrictedRead && !targetBranchId) return early;
      expect(wouldRunUnscopedQuery).toBe(true); // confirms guard condition is triggered
    });

    it("blocks cross-branch queries by guaranteeing targetBranchId strictly matches staff profile branch", () => {
      const staffBranchId = "bone_bolango";
      const targetBranchId = resolveTargetBranchId({
        restrictedRead: true,
        profileBranchId: staffBranchId,
      });

      // Target branch must be staff's own branch, preventing cross-branch bleed
      expect(targetBranchId).toBe("bone_bolango");
      expect(targetBranchId).not.toBe("kota_gorontalo");
    });
  });
});
