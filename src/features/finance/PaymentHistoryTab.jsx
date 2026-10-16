import { formatIDR } from "./receiptMessages";

export default function PaymentHistoryTab({
  history = [],
  loadingHistory = false,
  onViewReceipt,
  onSendWhatsApp,
  onVoidRequest,
}) {
  if (loadingHistory) {
    return (
      <p className="text-center text-slate-400 py-8 text-xs animate-pulse">
        Loading payment records...
      </p>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-2xl mb-1">🧾</p>
        <p className="text-xs font-bold text-slate-600">No payment history recorded yet.</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Record a payment on the Record tab to start tracking payments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((h) => (
        <div
          key={h.id}
          className={`p-3.5 bg-white border rounded-xl hover:shadow-sm transition flex items-center justify-between gap-3 text-xs ${
            h.status === "voided"
              ? "border-rose-200 bg-rose-50/30 opacity-75"
              : h.isReversal || h.status === "reversal"
                ? "border-amber-200 bg-amber-50/20"
                : "border-slate-200"
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-black ${h.status === "voided" ? "line-through text-slate-400" : "text-[#1a3a8f]"}`}>
                {formatIDR(h.amount)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                {h.method}
              </span>
              {h.planName && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-[#1a3a8f]">
                  {h.planName}
                </span>
              )}
              {h.status === "voided" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  🚫 Voided
                </span>
              )}
              {(h.isReversal || h.status === "reversal" || h.type === "reversal") && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ↩️ REVERSAL Record
                </span>
              )}
              {h.isInstallment && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  📊 Installment #{h.installmentIndex || 1} {h.outstandingBalance > 0 ? `(Bal: ${formatIDR(h.outstandingBalance)})` : "(Settled)"}
                </span>
              )}
              {h.approvalStatus === "pending" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  ⏳ Discount Pending Executive Review
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-700">Period: {h.period}</p>
            <p className="text-[11px] text-slate-400">
              {new Date(h.recordedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              • Rec by: {h.recordedBy}
            </p>
            {h.notes && <p className="text-[11px] text-slate-500 italic">Note: {h.notes}</p>}
            {h.voidReason && (
              <p className="text-[11px] text-rose-600 font-medium">Void Reason: {h.voidReason}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {onViewReceipt && (
              <button
                onClick={() => onViewReceipt(h)}
                className="bg-indigo-50 text-[#1a3a8f] font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-indigo-100 transition border border-indigo-100 cursor-pointer"
              >
                View Receipt
              </button>
            )}
            {onSendWhatsApp && (
              <button
                onClick={() => onSendWhatsApp(h)}
                className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-emerald-100 transition border border-emerald-200 cursor-pointer"
              >
                WhatsApp
              </button>
            )}
            {onVoidRequest && h.status !== "voided" && !h.isReversal && h.status !== "reversal" && (
              <button
                onClick={() => onVoidRequest(h)}
                className="bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-rose-100 transition border border-rose-200 cursor-pointer"
              >
                Request Void
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
