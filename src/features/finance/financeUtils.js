/**
 * Utility functions for payment analysis and cash drawer reconciliation.
 */

/**
 * Aggregates a list of payment records by payment method (Cash, Transfer, QRIS, Other).
 * Handles alternate naming conventions (e.g. 'tunai', 'bank', 'bank transfer').
 * @param {Array<{
 *   amount?: number | string,
 *   method?: string,
 *   status?: string,
 *   id?: string,
 *   paymentId?: string,
 *   referenceNumber?: string,
 *   receiptNumber?: string,
 *   isReversal?: boolean,
 *   type?: string,
 *   originalPaymentId?: string,
 *   reversalOfPaymentId?: string,
 *   originalReceiptNumber?: string,
 * } | any>} payments
 * @returns {{
 *   cashTotal: number,
 *   transferTotal: number,
 *   qrisTotal: number,
 *   otherTotal: number,
 *   grandTotal: number,
 *   count: number
 * }}
 */
export function summarizePaymentsByMethod(payments = []) {
  let cashTotal = 0;
  let transferTotal = 0;
  let qrisTotal = 0;
  let otherTotal = 0;
  let count = 0;

  if (!Array.isArray(payments)) {
    return {
      cashTotal: 0,
      transferTotal: 0,
      qrisTotal: 0,
      otherTotal: 0,
      grandTotal: 0,
      count: 0,
    };
  }

  // Pre-collect all voided payment IDs in the current dataset
  const voidedIds = new Set();
  for (const p of payments) {
    if (p?.status === "voided") {
      if (p.id) voidedIds.add(String(p.id));
      if (p.paymentId) voidedIds.add(String(p.paymentId));
      if (p.referenceNumber) voidedIds.add(String(p.referenceNumber));
      if (p.receiptNumber) voidedIds.add(String(p.receiptNumber));
    }
  }

  const applyAmount = (val, method) => {
    const m = (method || "").trim().toLowerCase();
    if (m === "cash" || m === "tunai") {
      cashTotal += val;
    } else if (m === "transfer" || m === "bank transfer" || m === "bank") {
      transferTotal += val;
    } else if (m === "qris") {
      qrisTotal += val;
    } else {
      otherTotal += val;
    }
  };

  for (const p of payments) {
    // 1. Skip voided payments entirely (contribute 0 to drawer and revenue)
    if (p?.status === "voided") {
      continue;
    }

    const rawAmt = Number(p?.amount) || 0;
    const amt = Math.abs(rawAmt);
    const isRev = Boolean(p?.isReversal === true || p?.status === "reversal" || p?.type === "reversal");

    if (isRev) {
      const origId = p?.originalPaymentId || p?.reversalOfPaymentId || p?.originalReceiptNumber;
      const matchingVoidedInWindow = origId && (
        voidedIds.has(String(origId)) ||
        payments.some((other) => other?.status === "voided" && (other?.id === origId || other?.paymentId === origId))
      );

      // If the original voided payment is in the same window, both are excluded (net 0)
      if (matchingVoidedInWindow) {
        continue;
      }

      // If the original payment was in a prior window, subtract reversal amount from revenue/drawer
      applyAmount(-amt, p?.method);
      continue;
    }

    // Normal active payment
    applyAmount(amt, p?.method);
    count++;
  }

  const grandTotal = cashTotal + transferTotal + qrisTotal + otherTotal;

  return {
    cashTotal,
    transferTotal,
    qrisTotal,
    otherTotal,
    grandTotal,
    count,
  };
}
