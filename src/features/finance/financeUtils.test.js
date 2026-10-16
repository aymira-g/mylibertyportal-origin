import { describe, it, expect } from "vitest";
import { summarizePaymentsByMethod } from "./financeUtils";

describe("summarizePaymentsByMethod", () => {
  it("summarizes empty list correctly", () => {
    const res = summarizePaymentsByMethod([]);
    expect(res).toEqual({
      cashTotal: 0,
      transferTotal: 0,
      qrisTotal: 0,
      otherTotal: 0,
      grandTotal: 0,
      count: 0,
    });
  });

  it("handles null or non-array inputs safely", () => {
    const res = summarizePaymentsByMethod(null);
    expect(res.grandTotal).toBe(0);
    expect(res.count).toBe(0);
  });

  it("accurately categorizes cash (including 'tunai')", () => {
    const payments = [
      { amount: 150000, method: "cash" },
      { amount: 50000, method: "tunai" },
      { amount: "100000", method: " Cash " },
    ];
    const res = summarizePaymentsByMethod(payments);
    expect(res.cashTotal).toBe(300000);
    expect(res.grandTotal).toBe(300000);
    expect(res.count).toBe(3);
  });

  it("accurately categorizes transfer and QRIS", () => {
    const payments = [
      { amount: 200000, method: "transfer" },
      { amount: 300000, method: "bank transfer" },
      { amount: 100000, method: "QRIS" },
      { amount: 50000, method: "edc" }, // other
    ];
    const res = summarizePaymentsByMethod(payments);
    expect(res.transferTotal).toBe(500000);
    expect(res.qrisTotal).toBe(100000);
    expect(res.otherTotal).toBe(50000);
    expect(res.grandTotal).toBe(650000);
    expect(res.count).toBe(4);
  });

  it("nets a voided payment and its same-window reversal to grandTotal: 0 and cashTotal: 0", () => {
    const payments = [
      {
        id: "pay-100",
        amount: 350000,
        method: "cash",
        status: "voided",
        voidReason: "Miskey reversal",
      },
      {
        id: "rev-200",
        amount: 350000,
        method: "cash",
        status: "reversal",
        isReversal: true,
        originalPaymentId: "pay-100",
      },
    ];

    const res = summarizePaymentsByMethod(payments);
    expect(res.cashTotal).toBe(0);
    expect(res.grandTotal).toBe(0);
    expect(res.count).toBe(0);
  });

  it("accurately handles active payments alongside voided/reversal pairs", () => {
    const payments = [
      {
        id: "pay-active-1",
        amount: 500000,
        method: "transfer",
        status: "active",
      },
      {
        id: "pay-voided-2",
        amount: 250000,
        method: "cash",
        status: "voided",
      },
      {
        id: "rev-2",
        amount: 250000,
        method: "cash",
        status: "reversal",
        isReversal: true,
        originalPaymentId: "pay-voided-2",
      },
      {
        id: "pay-active-3",
        amount: 150000,
        method: "qris",
        status: "active",
      },
    ];

    const res = summarizePaymentsByMethod(payments);
    expect(res.transferTotal).toBe(500000);
    expect(res.qrisTotal).toBe(150000);
    expect(res.cashTotal).toBe(0);
    expect(res.grandTotal).toBe(650000);
    expect(res.count).toBe(2);
  });

  it("subtracts cross-window reversals from drawer and revenue when original is not in window", () => {
    const payments = [
      {
        id: "pay-today",
        amount: 300000,
        method: "cash",
        status: "active",
      },
      {
        id: "rev-from-last-month",
        amount: 100000,
        method: "cash",
        status: "reversal",
        isReversal: true,
        originalPaymentId: "pay-from-prior-month-999",
      },
    ];

    const res = summarizePaymentsByMethod(payments);
    expect(res.cashTotal).toBe(200000);
    expect(res.grandTotal).toBe(200000);
    expect(res.count).toBe(1);
  });
});

