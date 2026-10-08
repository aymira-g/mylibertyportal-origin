import { describe, it, expect } from "vitest";
import {
  computeOpsLeadBottlenecks,
  categorizeFacilityTasks,
  filterBranchStaffByRole,
  summarizeShiftPayments,
} from "./opsLeadUtils";

describe("opsLeadUtils Unit Test Suite", () => {
  describe("computeOpsLeadBottlenecks", () => {
    it("returns clear status when all bottleneck counts are zero", () => {
      const res = computeOpsLeadBottlenecks({
        pendingApprovalsCount: 0,
        pendingTasksCount: 0,
        uncontactedInquiriesCount: 0,
        drawerVarianceCount: 0,
      });

      expect(res.total).toBe(0);
      expect(res.severity).toBe("clear");
      expect(res.breakdown).toEqual({
        approvals: 0,
        facilityTasks: 0,
        uncontactedInquiries: 0,
        drawerVariances: 0,
      });
    });

    it("handles undefined parameters gracefully", () => {
      const res = computeOpsLeadBottlenecks();
      expect(res.total).toBe(0);
      expect(res.severity).toBe("clear");
    });

    it("marks urgent if approvals are pending", () => {
      const res = computeOpsLeadBottlenecks({
        pendingApprovalsCount: 1,
        pendingTasksCount: 0,
        uncontactedInquiriesCount: 0,
        drawerVarianceCount: 0,
      });

      expect(res.total).toBe(1);
      expect(res.severity).toBe("urgent");
    });

    it("marks urgent if uncontacted leads exceed 3", () => {
      const res = computeOpsLeadBottlenecks({
        pendingApprovalsCount: 0,
        pendingTasksCount: 0,
        uncontactedInquiriesCount: 4,
        drawerVarianceCount: 0,
      });

      expect(res.total).toBe(4);
      expect(res.severity).toBe("urgent");
    });

    it("marks attention for low non-approval bottlenecks", () => {
      const res = computeOpsLeadBottlenecks({
        pendingApprovalsCount: 0,
        pendingTasksCount: 2,
        uncontactedInquiriesCount: 1,
        drawerVarianceCount: 0,
      });

      expect(res.total).toBe(3);
      expect(res.severity).toBe("attention");
    });

    it("sanitizes negative or invalid numeric inputs", () => {
      const res = computeOpsLeadBottlenecks({
        pendingApprovalsCount: -5,
        // @ts-expect-error Testing invalid runtime input
        pendingTasksCount: "invalid",
        uncontactedInquiriesCount: 2,
      });

      expect(res.total).toBe(2);
      expect(res.breakdown.approvals).toBe(0);
      expect(res.breakdown.facilityTasks).toBe(0);
      expect(res.breakdown.uncontactedInquiries).toBe(2);
    });
  });

  describe("categorizeFacilityTasks", () => {
    it("handles empty or invalid arrays", () => {
      expect(categorizeFacilityTasks(null).pendingCount).toBe(0);
      expect(categorizeFacilityTasks([]).pendingCount).toBe(0);
    });

    it("correctly partitions tasks into pending, completed, assigned, and unassigned", () => {
      const todos = [
        { id: "1", title: "Clean Room 1", completed: false, assignedTo: "u1" },
        { id: "2", title: "Fix AC Remote", completed: false },
        { id: "3", title: "Restock Water", completed: true, assignedTo: "u1" },
      ];

      const res = categorizeFacilityTasks(todos);
      expect(res.pendingCount).toBe(2);
      expect(res.completedCount).toBe(1);
      expect(res.unassignedCount).toBe(1);
      expect(res.assigned.length).toBe(1);
    });
  });

  describe("filterBranchStaffByRole", () => {
    it("handles empty or invalid users list", () => {
      const res = filterBranchStaffByRole(null, "Kota Gorontalo");
      expect(res.allStaff).toEqual([]);
      expect(res.frontOffice).toEqual([]);
    });

    it("excludes resigned staff and partitions active staff into correct categories", () => {
      const users = [
        { id: "1", role: "frontoffice", status: "active", branch: "Kota Gorontalo" },
        { id: "2", role: "officeboy", status: "active", branch: "Kota Gorontalo" },
        { id: "3", role: "instructor", status: "active", branch: "Kota Gorontalo" },
        { id: "4", role: "opslead", status: "active", branch: "Kota Gorontalo" },
        { id: "5", role: "frontoffice", status: "resigned", branch: "Kota Gorontalo" },
        { id: "6", role: "instructor", status: "active", branch: "Limboto" },
      ];

      const res = filterBranchStaffByRole(users, "Kota Gorontalo");
      expect(res.allStaff.length).toBe(4);
      expect(res.frontOffice.length).toBe(1);
      expect(res.officeSupport.length).toBe(1);
      expect(res.instructors.length).toBe(1);
      expect(res.leaders.length).toBe(1);
    });
  });

  describe("summarizeShiftPayments", () => {
    it("handles empty payments list", () => {
      const res = summarizeShiftPayments([]);
      expect(res.total).toBe(0);
      expect(res.count).toBe(0);
      expect(res.discrepancyCount).toBe(0);
    });

    it("summarizes payment methods and detects flagged discrepancies", () => {
      const payments = [
        { amount: 100000, method: "cash" },
        { amount: 50000, method: "transfer" },
        { amount: 25000, method: "qris" },
        { amount: 10000, method: "cash", isDiscrepancy: true },
      ];

      const res = summarizeShiftPayments(payments);
      expect(res.total).toBe(185000);
      expect(res.cash).toBe(110000);
      expect(res.transfer).toBe(50000);
      expect(res.qris).toBe(25000);
      expect(res.count).toBe(4);
      expect(res.discrepancyCount).toBe(1);
    });
  });
});
