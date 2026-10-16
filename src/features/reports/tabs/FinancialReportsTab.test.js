import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FinancialReportsTab from "./FinancialReportsTab";
import { filterPayments, computeFinancialExportRows } from "../reportsUtils";

vi.mock("../../finance/paymentsRepository", () => ({
  getRecentPayments: vi.fn().mockResolvedValue([]),
  fetchPaymentsForWindow: vi.fn().mockResolvedValue({ payments: [], isCapped: false }),
}));

describe("FinancialReportsTab & filterPayments (DOM11 Conformance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const now = Date.now();
  const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

  const mockPayments = [
    {
      id: "pay-today",
      recordedAt: daysAgo(1),
      amount: 500000,
      method: "cash",
      studentName: "Recent Student",
      branchId: "kota_gorontalo",
      division: "courses",
      planName: "Monthly",
    },
    {
      id: "pay-10d",
      recordedAt: daysAgo(10),
      amount: 750000,
      method: "transfer",
      studentName: "Mid Student",
      branchId: "kota_gorontalo",
      division: "courses",
      planName: "Monthly",
    },
    {
      id: "pay-45d",
      recordedAt: daysAgo(45),
      amount: 1000000,
      method: "qris",
      studentName: "Older Student",
      branchId: "kota_gorontalo",
      division: "courses",
      planName: "Monthly",
    },
    {
      id: "pay-legacy-branch",
      recordedAt: daysAgo(2),
      amount: 300000,
      method: "cash",
      studentName: "Legacy Branch Student",
      branch: "Kota Gorontalo", // lacks branchId
      division: "courses",
      planName: "Monthly",
    },
  ];

  it("filters payments strictly by rangeDays horizon (DOM11-COR-01)", () => {
    // 7 days window: excludes pay-10d and pay-45d
    const filtered7d = filterPayments(mockPayments, { rangeDays: 7 });
    expect(filtered7d.map((p) => p.id)).toEqual(["pay-today", "pay-legacy-branch"]);

    // 30 days window: includes pay-10d, excludes pay-45d
    const filtered30d = filterPayments(mockPayments, { rangeDays: 30 });
    expect(filtered30d.map((p) => p.id)).toEqual(["pay-today", "pay-10d", "pay-legacy-branch"]);

    // All time (rangeDays = 0): includes everything
    const filteredAll = filterPayments(mockPayments, { rangeDays: 0 });
    expect(filteredAll).toHaveLength(4);
  });

  it("filters by branch with branchId and branch string fallbacks (DOM11-COR-02)", () => {
    const kotaPayments = filterPayments(mockPayments, {
      rangeDays: 30,
      branchFilter: "Kota Gorontalo",
    });
    // Matches both modern branchId="kota_gorontalo" and legacy branch="Kota Gorontalo"
    expect(kotaPayments.map((p) => p.id)).toEqual(["pay-today", "pay-10d", "pay-legacy-branch"]);

    const bonePayments = filterPayments(mockPayments, {
      rangeDays: 30,
      branchFilter: "Bone Bolango",
    });
    expect(bonePayments).toHaveLength(0);
  });

  it("renders FinancialReportsTab markup cleanly", () => {
    const html = renderToStaticMarkup(
      React.createElement(FinancialReportsTab, {
        rangeDays: 30,
        branchFilter: "all",
        division: "all",
      })
    );
    expect(html).toContain("Total Revenue");
    expect(html).toContain("Cash (Drawer)");
    expect(html).toContain("Bank Transfer");
    expect(html).toContain("QRIS &amp; Digital");
  });

  describe("computeFinancialExportRows (DOM04-CSV-01 / DOM11-CSV-01 Netting Integrity)", () => {
    it("nets matching in-window voided and reversal pairs to 0", () => {
      const payments = [
        {
          id: "pay-1",
          amount: 500000,
          status: "completed",
          method: "Cash",
          studentName: "Active Student",
        },
        {
          id: "pay-voided-1",
          amount: 300000,
          status: "voided",
          method: "Cash",
          studentName: "Voided Student",
        },
        {
          id: "pay-reversal-1",
          amount: 300000,
          isReversal: true,
          status: "reversal",
          originalPaymentId: "pay-voided-1",
          method: "Cash",
          studentName: "Voided Student",
        },
      ];

      const rows = computeFinancialExportRows(payments);
      expect(rows).toHaveLength(3);

      // Row 0: Active payment -> netAmount = 500000, rawAmount = 500000
      expect(rows[0][8]).toBe(500000);
      expect(rows[0][9]).toBe(500000);
      expect(rows[0][10]).toBe("Completed");

      // Row 1: Voided payment in window -> netAmount = 0, rawAmount = 300000
      expect(rows[1][8]).toBe(0);
      expect(rows[1][9]).toBe(300000);
      expect(rows[1][10]).toBe("VOIDED");

      // Row 2: In-window Reversal -> netAmount = 0 (since original was zeroed), rawAmount = 300000
      expect(rows[2][8]).toBe(0);
      expect(rows[2][9]).toBe(300000);
      expect(rows[2][10]).toBe("REVERSAL");

      // Mathematical verification: =SUM(Amount (IDR)) in Excel strictly matches onscreen total
      const excelSum = rows.reduce((sum, r) => sum + r[8], 0);
      expect(excelSum).toBe(500000);
    });

    it("subtracts out-of-window reversals from total revenue", () => {
      const payments = [
        {
          id: "pay-1",
          amount: 1000000,
          status: "completed",
          method: "Transfer",
          studentName: "Current Month Student",
        },
        {
          id: "rev-prior-month",
          amount: 250000,
          isReversal: true,
          status: "reversal",
          originalPaymentId: "pay-from-last-month-not-in-window",
          method: "Cash",
          studentName: "Prior Month Student",
        },
      ];

      const rows = computeFinancialExportRows(payments);
      expect(rows[0][8]).toBe(1000000);
      expect(rows[1][8]).toBe(-250000); // Subtracted from revenue
      expect(rows[1][10]).toBe("REVERSAL");

      const excelSum = rows.reduce((sum, r) => sum + r[8], 0);
      expect(excelSum).toBe(750000);
    });
  });
});
