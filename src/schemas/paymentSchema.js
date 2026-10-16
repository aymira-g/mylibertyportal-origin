import { z } from "zod";

export const paymentRecordSchema = z.object({
  studentId: z.string().optional(),
  amount: z.coerce.number().positive("Payment amount must be greater than 0."),
  period: z.string().trim().min(1, "Payment period is required."),
  method: z.string().trim().min(1, "Payment method is required."),
  planId: z.string().trim().optional().default("monthly"),
  planName: z.string().optional(),
  branch: z.string().optional(),
  branchId: z.string().optional(),
  division: z.string().optional(),
  recordedAt: z.string().optional(),
  recordedBy: z.string().optional(),
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
  // OD-3 Installment & Partial Payment fields
  isInstallment: z.boolean().optional(),
  installmentIndex: z.number().int().optional(),
  totalAgreedAmount: z.coerce.number().optional(),
  outstandingBalance: z.coerce.number().optional(),
  nextDueDate: z.string().optional(),
});

export const studentIdSchema = z.string().trim().min(1, "Valid student ID is required.");
