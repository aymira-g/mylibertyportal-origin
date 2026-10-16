import { z } from "zod";

export const paymentRecordSchema = z
  .object({
    studentId: z.string().optional(),
    amount: z.coerce.number().positive("Payment amount must be greater than 0."),
    period: z.string().trim().min(1, "Payment period is required."),
    method: z.string().trim().min(1, "Payment method is required."),
    planId: z.string().trim().optional().default("monthly"),
    planName: z.string().optional(),
    planMonths: z.number().int().optional(),
    branch: z.string().optional(),
    branchId: z.string().optional(),
    division: z.string().optional(),
    recordedAt: z.string().optional(),
    recordedBy: z.string().optional(),
    recordedByUid: z.string().nullable().optional(),
    requestedByUid: z.string().nullable().optional(),
    coverageStart: z.string().optional(),
    coverageEnd: z.string().optional(),
    notes: z.string().optional(),
    referenceNumber: z.string().optional(),
    approvalStatus: z.string().optional(),
    idempotencyKey: z.string().optional(),
    // OD-1 / OD-3 Payment Correction & Void fields
    status: z.string().optional(),
    originalPaymentId: z.string().optional(),
    originalReceiptNumber: z.string().optional(),
    reversalOfPaymentId: z.string().optional(),
    voidReason: z.string().optional(),
    isReversal: z.boolean().optional(),
    appliedFromApproval: z.string().nullable().optional(),
    // OD-3 Installment & Partial Payment fields
    isInstallment: z.boolean().optional(),
    installmentIndex: z.number().int().optional(),
    totalAgreedAmount: z.coerce.number().optional(),
    outstandingBalance: z.coerce.number().optional(),
    nextDueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.isInstallment) return true;
      if (data.totalAgreedAmount != null && data.amount >= data.totalAgreedAmount) {
        return false;
      }
      return true;
    },
    {
      message: "Installment payment amount must be less than the total agreed amount per OD-3.",
      path: ["amount"],
    }
  )
  .refine(
    (data) => {
      if (!data.isInstallment) return true;
      if (!data.nextDueDate || typeof data.nextDueDate !== "string" || !data.nextDueDate.trim()) {
        return false;
      }
      if (data.coverageEnd && data.nextDueDate > data.coverageEnd) {
        return false;
      }
      return true;
    },
    {
      message: "Installment schedule requires nextDueDate within the active coverage period per OD-3.",
      path: ["nextDueDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.isInstallment) return true;
      const idx = data.installmentIndex || 1;
      const isMonthly = data.planMonths === 1 || data.planId === "monthly";
      if (isMonthly && idx > 2) return false;
      if (idx > 3) return false;
      return true;
    },
    {
      message: "Installment index exceeds maximum allowed installments per OD-3 (max 2 for monthly, max 3 for multi-month).",
      path: ["installmentIndex"],
    }
  );

export const studentIdSchema = z.string().trim().min(1, "Valid student ID is required.");
