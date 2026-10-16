import { useState, useEffect, useMemo } from "react";
import { addDays, format, parseISO, isValid } from "date-fns";
import { auth } from "../../firebase";
import {
  PAYMENT_PLANS,
  calculatePlanPricing,
  calculateExpiryDate,
  calculateCoveragePeriod,
  getPaymentHealthStatus,
  DEFAULT_BASE_MONTHLY_RATE,
  useToast,
  useConfirm,
  createApprovalEnvelope,
  submitApprovalRequest,
  useOverlayHistory,
} from "../shared";
import { normalizeWhatsAppNumber, buildWhatsAppReceiptMessage } from "./receiptMessages";
import {
  fetchPaymentHistory,
  recordPayment,
  markPaymentPending,
  updateStudentPaymentStatus,
  requestPaymentVoid,
} from "./paymentsRepository";
import { branchToId } from "../../constants/branches";
import { normalizeDivision, divisionOfProgram } from "../../constants/divisions";
import RecordPaymentTab from "./RecordPaymentTab";
import PaymentHistoryTab from "./PaymentHistoryTab";
import DigitalReceiptTab from "./DigitalReceiptTab";
import { checkNetworkReachability } from "../../utils/networkReachability";

function getDefaultPeriod() {
  const date = new Date();
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PaymentModal({ student, onClose, onPaymentUpdated = null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  const handleAttemptClose = () => {
    if (saving) return;
    onClose();
  };

  useOverlayHistory(Boolean(student), handleAttemptClose, "paymentModal");
  const [activeTab, setActiveTab] = useState("record"); // "record" | "history" | "receipt"

  const rawPaidUntil =
    typeof student?.paidUntil === "string"
      ? student.paidUntil
      : student?.paidUntil?.toDate
        ? student.paidUntil.toDate().toISOString().slice(0, 10)
        : student?.paidUntil instanceof Date
          ? student.paidUntil.toISOString().slice(0, 10)
          : null;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const studentBranchId = student?.branchId || branchToId(student?.branch || "");
  const isPendingStatus = student?.paymentStatus === "pending";
  const existingHealth = isPendingStatus
    ? { status: "pending", label: "Pending", tone: "amber", remainingDays: null }
    : getPaymentHealthStatus(rawPaidUntil);
  const hasFutureCoverage =
    !isPendingStatus &&
    (existingHealth.status === "active" || existingHealth.status === "due_soon");
  const parsedPaidUntil = rawPaidUntil ? parseISO(rawPaidUntil) : null;
  const isValidPaidUntil = parsedPaidUntil && isValid(parsedPaidUntil);
  const nextDayAfterExpiry = isValidPaidUntil
    ? format(addDays(parsedPaidUntil, 1), "yyyy-MM-dd")
    : todayStr;

  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (
      student.paymentPlan &&
      (PAYMENT_PLANS[student.paymentPlan] || student.paymentPlan === "custom")
    ) {
      return student.paymentPlan;
    }
    return "monthly";
  });

  const [startDateMode, setStartDateMode] = useState("extend"); // "extend" | "today"
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState("");

  const effectiveStartDate =
    selectedPlan === "custom"
      ? customStartDate
      : hasFutureCoverage && startDateMode === "extend"
        ? nextDayAfterExpiry
        : todayStr;

  const pricing = useMemo(() => {
    return calculatePlanPricing(selectedPlan, DEFAULT_BASE_MONTHLY_RATE);
  }, [selectedPlan]);

  const [amount, setAmount] = useState(() => student.tuitionRate || student.lastPaymentAmount || "");
  const [period, setPeriod] = useState(() => {
    if (selectedPlan === "custom") return getDefaultPeriod();
    return calculateCoveragePeriod(effectiveStartDate, pricing.months);
  });
  const [method, setMethod] = useState("Bank Transfer"); // "Bank Transfer" | "QRIS" | "Cash"
  const [notes, setNotes] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentIndex, setInstallmentIndex] = useState(1);
  const [totalAgreedAmount, setTotalAgreedAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState([]);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [operationId] = useState(
    () => `idem_${student?.id || "anon"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [receiptNo] = useState(
    () => `ML-${Date.now().toString().slice(-6)}`
  );

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
    if (planKey === "custom") {
      setPeriod(getDefaultPeriod());
    } else {
      const p = calculatePlanPricing(planKey, DEFAULT_BASE_MONTHLY_RATE);
      setPeriod(calculateCoveragePeriod(effectiveStartDate, p.months));
    }
  };

  const handleStartDateModeChange = (mode) => {
    setStartDateMode(mode);
    if (selectedPlan !== "custom") {
      const start = mode === "extend" && hasFutureCoverage ? nextDayAfterExpiry : todayStr;
      setPeriod(calculateCoveragePeriod(start, pricing.months));
    }
  };

  const refreshHistory = async () => {
    if (!student?.id) return;
    try {
      setHistory(await fetchPaymentHistory(student.id, studentBranchId));
    } catch (err) {
      console.error("Failed to load payment history:", err);
    }
  };

  useEffect(() => {
    let ignore = false;
    const studentId = student?.id;
    if (!studentId) return;

    fetchPaymentHistory(studentId, studentBranchId)
      .then((list) => {
        if (!ignore) setHistory(list);
      })
      .catch((err) => {
        console.error("Failed to load payment history:", err);
      })
      .finally(() => {
        if (!ignore) setLoadingHistory(false);
      });

    return () => {
      ignore = true;
    };
  }, [student?.id, studentBranchId]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const isReachable = await checkNetworkReachability();
      if (!isReachable) {
        toast(
          "Cannot record payment: connection is offline or unstable. Please check your internet connection.",
          "error"
        );
        return;
      }
      if (!amount || amount <= 0) {
        toast("Please enter a valid payment amount.", "error");
        return;
      }
      if (!period.trim()) {
        toast("Please enter a billing period (e.g. September 2026).", "error");
        return;
      }

      const nowISO = new Date().toISOString();

      let planMonths = null;
      let baseRate = null;
      let discountAmount = null;
      let planName = "Custom";
      const finalCoverageStart = effectiveStartDate;
      let finalCoverageEnd = null;
      let finalPeriod = period.trim();

      if (selectedPlan !== "custom") {
        const planConfig = PAYMENT_PLANS[selectedPlan];
        planMonths = planConfig.months;
        baseRate = pricing.baseMonthlyRate;
        discountAmount = pricing.discountAmount;
        planName = planConfig.termName;
        finalCoverageEnd = calculateExpiryDate(finalCoverageStart, planMonths);
        finalPeriod = calculateCoveragePeriod(finalCoverageStart, planMonths);
      } else {
        finalCoverageEnd = customEndDate ? customEndDate : null;
      }

      const studentDivision = normalizeDivision(
        student.division || divisionOfProgram(student.programId || student.program)
      );

      const paymentRecord = {
        studentId: student.id,
        studentName: student.displayName || "Student",
        parentName: student.parentName || "",
        parentPhone: student.parentPhone || student.phone || "",
        branchId: studentBranchId,
        division: studentDivision,
        amount: Number(amount),
        period: finalPeriod,
        planId: selectedPlan,
        planName,
        planMonths,
        baseRate,
        discountAmount,
        coverageStart: finalCoverageStart,
        coverageEnd: finalCoverageEnd,
        method,
        notes: notes.trim(),
        receiptNumber: receiptNo,
        idempotencyKey: operationId,
        recordedAt: nowISO,
        recordedBy: auth.currentUser?.email || "Staff",
      };

      // DOM04-FIN-01: Calculate effective discount by comparing entered amount with expected standard plan price
      const enteredAmountNum = Number(amount);
      const expectedPlanPrice = selectedPlan !== "custom" ? pricing.finalPrice : null;
      let effectiveDiscount = discountAmount || 0;
      // OD-3: If designated as an installment schedule, it is an agreed partial payment with an outstanding balance, NOT a discount!
      if (!isInstallment && expectedPlanPrice && enteredAmountNum < expectedPlanPrice) {
        effectiveDiscount = Math.max(effectiveDiscount, expectedPlanPrice - enteredAmountNum);
      }

      const effectiveTotalAgreed = isInstallment
        ? (Number(totalAgreedAmount) || expectedPlanPrice || enteredAmountNum)
        : enteredAmountNum;
      const effectiveOutstanding = isInstallment
        ? Math.max(0, effectiveTotalAgreed - enteredAmountNum)
        : 0;

      if (isInstallment) {
        paymentRecord.isInstallment = true;
        paymentRecord.installmentIndex = Number(installmentIndex) || 1;
        paymentRecord.totalAgreedAmount = effectiveTotalAgreed;
        paymentRecord.outstandingBalance = effectiveOutstanding;
        if (nextDueDate) {
          paymentRecord.nextDueDate = nextDueDate;
        }
      }

      let discountEnvelope = null;
      if (effectiveDiscount > 0) {
        const currentUser = auth.currentUser;
        discountEnvelope = createApprovalEnvelope(
          "DISCOUNT_OR_REFUND",
          {
            name: currentUser?.displayName || currentUser?.email || "Staff",
            uid: currentUser?.uid,
            role: "frontoffice",
            branchId: studentBranchId,
            division: studentDivision,
          },
          {
            studentId: student.id,
            studentName: student.displayName,
            division: studentDivision,
            amount: enteredAmountNum,
            discountAmount: effectiveDiscount,
            planName,
            receiptNumber: receiptNo,
            reason: notes.trim() || `Fee discount of IDR ${effectiveDiscount.toLocaleString("id-ID")}`,
          }
        );
        if (discountEnvelope) {
          // Flag the payment itself as carrying an unreviewed discount so
          // payment history, reports, and the receipt can show that the
          // discount still needs executive dual-control sign-off.
          paymentRecord.approvalStatus = "pending";
          paymentRecord.discountAmount = effectiveDiscount;
        }
      }

      const savedPayment = await recordPayment(student.id, paymentRecord);

      if (discountEnvelope) {
        if (savedPayment?.id) {
          discountEnvelope.payload.paymentId = savedPayment.id;
        }
        try {
          await submitApprovalRequest(discountEnvelope);
        } catch (approvalErr) {
          console.error("Failed to submit discount approval request:", approvalErr);
          toast(
            "Payment saved, but the executive approval request for this discount could not be sent. Please notify an executive directly so it gets reviewed.",
            "warning"
          );
        }
      }

      await refreshHistory();
      if (onPaymentUpdated) onPaymentUpdated();

      // Switch to receipt view
      setActiveReceipt(savedPayment);
      setActiveTab("receipt");
      toast("Saved ✓ — Payment recorded successfully!", "success");
    } catch (err) {
      toast("Not saved — please try again. " + (err.message || ""), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPending = async () => {
    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast("Cannot update payment status: connection is offline or unstable. Please check your internet connection.", "error");
      return;
    }
    if (
      !(await confirm(
        `Mark ${student.displayName}'s payment status as Pending for the next period?`
      ))
    )
      return;
    try {
      await markPaymentPending(student.id);
      if (onPaymentUpdated) onPaymentUpdated();
      toast("Status updated to Pending.");
      onClose();
    } catch (err) {
      toast("Error updating status: " + err.message, "error");
    }
  };

  const handleClearPending = async () => {
    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast("Cannot update payment status: connection is offline or unstable. Please check your internet connection.", "error");
      return;
    }
    if (
      !(await confirm(
        `Clear Pending payment status for ${student.displayName}?`
      ))
    )
      return;
    try {
      await updateStudentPaymentStatus(student.id, "unpaid");
      if (onPaymentUpdated) onPaymentUpdated();
      toast("Cleared Pending status.");
      onClose();
    } catch (err) {
      toast("Error clearing status: " + err.message, "error");
    }
  };

  const handleSendWhatsApp = (rcp) => {
    const rawPhone = student.parentPhone || student.phone;
    const formatted = normalizeWhatsAppNumber(rawPhone);
    const message = buildWhatsAppReceiptMessage(rcp);

    if (!formatted) {
      toast(
        "No valid phone number found for parent or student. Please update contact information first.",
        "error"
      );
      return;
    }

    const waUrl = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVoidRequest = async (paymentToVoid) => {
    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast("Cannot submit request: connection is offline or unstable.", "error");
      return;
    }
    const reason = window.prompt(
      `Enter operational reason to request void / correction for receipt ${paymentToVoid.receiptNumber || paymentToVoid.referenceNumber || paymentToVoid.id}:`
    );
    if (!reason || !reason.trim()) {
      toast("A valid operational reason is required to request a void.", "warning");
      return;
    }

    try {
      const currentUser = auth.currentUser;
      await requestPaymentVoid(
        paymentToVoid,
        {
          uid: currentUser?.uid,
          name: currentUser?.displayName || currentUser?.email || "Staff",
          role: "frontoffice",
          branchId: studentBranchId,
        },
        reason.trim()
      );
      toast(
        `Void authorization ticket submitted for receipt ${paymentToVoid.receiptNumber || paymentToVoid.id}. It is now queued for executive review.`,
        "success"
      );
      await refreshHistory();
    } catch (err) {
      toast("Failed to request void: " + err.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pt-safe pb-safe overflow-y-auto overscroll-contain">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-[#1a3a8f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
              💳
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-base font-bold leading-tight">Student Payment Center</h2>
              <p className="text-xs text-white/80">
                {student.displayName} (ID: {student.id})
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            disabled={saving}
            aria-label="Close"
            className="text-white/70 hover:text-white text-xl font-bold p-1 leading-none rounded-lg hover:bg-white/10 cursor-pointer disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 select-none">
          <button
            onClick={() => setActiveTab("record")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "record"
                ? "border-[#1a3a8f] text-[#1a3a8f]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            ➕ Record Payment
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "history"
                ? "border-[#1a3a8f] text-[#1a3a8f]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📜 Payment History ({history.length})
          </button>
          {activeReceipt && (
            <button
              onClick={() => setActiveTab("receipt")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === "receipt"
                  ? "border-[#1a3a8f] text-[#1a3a8f]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              🧾 Digital Receipt
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === "record" && (
            <RecordPaymentTab
              student={student}
              existingHealth={existingHealth}
              selectedPlan={selectedPlan}
              onSelectPlan={handleSelectPlan}
              startDateMode={startDateMode}
              onStartDateModeChange={handleStartDateModeChange}
              hasFutureCoverage={hasFutureCoverage}
              nextDayAfterExpiry={nextDayAfterExpiry}
              todayStr={todayStr}
              effectiveStartDate={effectiveStartDate}
              pricing={pricing}
              period={period}
              onPeriodChange={setPeriod}
              customStartDate={customStartDate}
              onCustomStartDateChange={setCustomStartDate}
              customEndDate={customEndDate}
              onCustomEndDateChange={setCustomEndDate}
              amount={amount}
              onAmountChange={setAmount}
              method={method}
              onMethodChange={setMethod}
              notes={notes}
              onNotesChange={setNotes}
              saving={saving}
              onSubmit={handleRecordPayment}
              onMarkPending={handleMarkPending}
              onClearPending={handleClearPending}
              isInstallment={isInstallment}
              onInstallmentChange={setIsInstallment}
              installmentIndex={installmentIndex}
              onInstallmentIndexChange={setInstallmentIndex}
              totalAgreedAmount={totalAgreedAmount}
              onTotalAgreedAmountChange={setTotalAgreedAmount}
              nextDueDate={nextDueDate}
              onNextDueDateChange={setNextDueDate}
            />
          )}

          {activeTab === "history" && (
            <PaymentHistoryTab
              history={history}
              loadingHistory={loadingHistory}
              onViewReceipt={(h) => {
                setActiveReceipt(h);
                setActiveTab("receipt");
              }}
              onSendWhatsApp={handleSendWhatsApp}
              onVoidRequest={handleVoidRequest}
            />
          )}

          {activeTab === "receipt" && activeReceipt && (
            <DigitalReceiptTab
              activeReceipt={activeReceipt}
              onSendWhatsApp={handleSendWhatsApp}
              onPrint={handlePrint}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
