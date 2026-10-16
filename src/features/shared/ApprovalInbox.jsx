import { useState, useEffect } from "react";
import {
  listenToPendingApprovals,
  listenToUnappliedApprovals,
  approveApprovalRequest,
  rejectApprovalRequest,
  markApprovalApplied,
} from "./approvalsRepository";
import { canApproveGate } from "./approvalGates";
import { applyApprovedShiftCorrection } from "../attendance/shiftsRepository";
import {
  applyApprovedPlacementOverride,
  clearPendingPlacementOverride,
} from "../dashboard/frontoffice/deskInquiriesRepository";
import { updateStaffRecord, updateStudentStatus } from "../dashboard/usersRepository";
import {
  updatePaymentApprovalStatus,
  executePaymentVoid,
  markPaymentPending,
} from "../finance/paymentsRepository";
import { transferStudentBetweenClasses } from "../classes/classesRepository";
import { todayWita } from "../../utils/dateWita";
import { useToast } from "./useToast";
import { useConfirm } from "./useConfirm";
import { idToBranch, BRANCH_MAP, isLeanSatelliteBranch } from "../../constants/branches";
import { checkNetworkReachability } from "../../utils/networkReachability";
import { auth } from "../../firebase";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  User,
  Building,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export function ApprovalInbox({
  userRole = null,
  branchId = null,
  division = null,
  title = "Pending Authorization Requests",
  subtitle = "Maker-Checker dual-control operational review queue.",
  initialApprovals = null,
  initialUnappliedApprovals = null,
}) {
  const [approvals, setApprovals] = useState(() => initialApprovals || []);
  const [unappliedApprovals, setUnappliedApprovals] = useState(() => initialUnappliedApprovals || []);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(() => initialApprovals === null);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [processingId, setProcessingId] = useState(null);
  const [staffRoleAssignments, setStaffRoleAssignments] = useState({});
  const [staffBranchAssignments, setStaffBranchAssignments] = useState({});
  const [staffDivisionAssignments, setStaffDivisionAssignments] = useState({});

  const toast = useToast();
  const confirm = useConfirm();

  const handleRoleChange = (id, newRole) => {
    setStaffRoleAssignments((prev) => ({ ...prev, [id]: newRole }));
    if (newRole === "manager") {
      setStaffDivisionAssignments((prev) => {
        if (prev[id] === "all") {
          return { ...prev, [id]: "courses" };
        }
        return prev;
      });
    }
  };

  const handleBranchChange = (id, newBranch) => {
    setStaffBranchAssignments((prev) => ({ ...prev, [id]: newBranch }));
    if (isLeanSatelliteBranch(newBranch)) {
      setStaffDivisionAssignments((prev) => {
        if (prev[id] === "kindergarten" || prev[id] === "all") {
          return { ...prev, [id]: "courses" };
        }
        return prev;
      });
      setStaffRoleAssignments((prev) => {
        if (prev[id] === "opslead" || prev[id] === "instructorleader") {
          return { ...prev, [id]: "instructor" };
        }
        return prev;
      });
    }
  };

  const handleDivisionChange = (id, newDivision) => {
    setStaffDivisionAssignments((prev) => ({ ...prev, [id]: newDivision }));
  };

  useEffect(() => {
    const unsubPending = listenToPendingApprovals(
      userRole,
      branchId,
      (items) => {
        setApprovals(items);
        setLoading(false);
      },
      (err) => {
        console.warn("ApprovalInbox listen error:", err);
        setLoading(false);
      },
      { division }
    );

    const unsubUnapplied = listenToUnappliedApprovals
      ? listenToUnappliedApprovals(
          userRole,
          branchId,
          (items) => {
            setUnappliedApprovals(items);
          },
          (err) => {
            console.warn("ApprovalInbox unapplied listen error:", err);
          },
          { division }
        )
      : () => {};

    return () => {
      unsubPending();
      unsubUnapplied();
    };
  }, [userRole, branchId, division]);

  const executeDownstreamAction = async (approval, currentUid) => {
    if (approval.actionId === "STAFF_SHIFT_SELF_CORRECTION" && approval.payload?.afterData) {
      await applyApprovedShiftCorrection({ approval });
      return { success: true, message: `Authorized & applied: ${approval.label}` };
    }

    if (approval.actionId === "PLACEMENT_LEVEL_OVERRIDE" && approval.payload?.inquiryId) {
      await applyApprovedPlacementOverride({ approval, actorUid: currentUid });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for placement override:", markErr);
      }
      return {
        success: true,
        message: `Authorized & applied: placement level set to ${approval.payload.assessedLevel}.`,
      };
    }

    if (approval.actionId === "STAFF_ROLE_ELEVATION" && approval.payload?.targetUserId) {
      await updateStaffRecord(approval.payload.targetUserId, {
        role: approval.payload.targetRole,
        appliedFromApproval: approval.id,
        roleUpdatedAt: new Date().toISOString(),
        roleUpdatedBy: currentUid || null,
      });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for elevation:", markErr);
      }
      return {
        success: true,
        message: `Staff role elevation applied! Role updated to ${approval.payload.targetRole}.`,
      };
    }

    if (
      approval.actionId === "STAFF_DEACTIVATION" &&
      (approval.payload?.targetUserId || approval.payload?.uid)
    ) {
      const targetUid = approval.payload.targetUserId || approval.payload.uid;
      const targetStatus = approval.payload.targetStatus || "resigned";
      await updateStaffRecord(targetUid, {
        status: targetStatus,
        appliedFromApproval: approval.id,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: currentUid || null,
      });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for deactivation:", markErr);
      }
      return {
        success: true,
        message: `Staff deactivation applied! Account marked as ${targetStatus}.`,
      };
    }

    if (approval.actionId === "NEW_STAFF_ACCOUNT" && approval.payload?.uid) {
      let assignedRole = approval.approvedRole || staffRoleAssignments[approval.id] || "instructor";
      const assignedBranchId = approval.approvedBranchId || staffBranchAssignments[approval.id] || "kota_gorontalo";
      const assignedBranchName = idToBranch(assignedBranchId);
      let assignedDivision = approval.approvedDivision || staffDivisionAssignments[approval.id] || "courses";

      if (isLeanSatelliteBranch(assignedBranchId)) {
        if (assignedDivision === "kindergarten" || assignedDivision === "all") {
          assignedDivision = "courses";
        }
        if (assignedRole === "opslead" || assignedRole === "instructorleader") {
          assignedRole = "instructor";
        }
      } else if (assignedRole === "manager" && assignedDivision === "all") {
        assignedDivision = "courses";
      }

      await updateStaffRecord(approval.payload.uid, {
        email: approval.payload.email || "",
        displayName: approval.payload.displayName || approval.payload.email || "Staff Member",
        nickname: approval.payload.displayName || "",
        role: assignedRole,
        branch: assignedBranchName,
        branchId: assignedBranchId,
        division: assignedDivision,
        status: "active",
        phone: "",
        photoURL: approval.payload.photoURL || "",
        joinedDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        appliedFromApproval: approval.id,
      });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for onboarding:", markErr);
      }
      return {
        success: true,
        message: `Staff account provisioned! Assigned ${assignedRole} (${assignedDivision}) at ${assignedBranchName}.`,
      };
    }

    if (approval.actionId === "DISCOUNT_OR_REFUND" && approval.payload?.paymentId) {
      await updatePaymentApprovalStatus(approval.payload.paymentId, "approved");
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for discount:", markErr);
      }
      return {
        success: true,
        message: `Authorized: Fee discount approved for ${approval.payload.studentName || "student"}.`,
      };
    }

    if (approval.actionId === "PAYMENT_CORRECTION_OR_VOID" && approval.payload?.paymentId) {
      await executePaymentVoid({
        originalPaymentId: approval.payload.paymentId,
        studentId: approval.payload.studentId,
        amount: approval.payload.amount,
        reason: approval.payload.reason || "Approved payment void / correction",
        decidedByUid: currentUid,
        approvalId: approval.id,
      });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for void:", markErr);
      }
      return {
        success: true,
        message: `Authorized: Payment voided and reversal record recorded.`,
      };
    }

    if (
      approval.actionId === "STUDENT_CLASS_TRANSFER" &&
      approval.payload?.studentId &&
      (approval.payload?.toClassId || approval.payload?.targetClassId) &&
      (approval.payload?.fromClassId || approval.payload?.sourceClass)
    ) {
      const payload = approval.payload;
      const fromClassId = payload.fromClassId || payload.sourceClass;
      const toClassId = payload.toClassId || payload.targetClassId;
      await transferStudentBetweenClasses({
        sourceClass: fromClassId,
        targetClassId: toClassId,
        targetClass: null,
        studentId: payload.studentId,
        dateTransferred: payload.dateTransferred || todayWita(),
        newLevel: payload.newLevel || null,
        transferReason: payload.reason || "Approved batch transfer",
      });
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for student transfer:", markErr);
      }
      return {
        success: true,
        message: `Authorized & transferred: ${payload.studentName || "Student"} transferred successfully.`,
      };
    }

    if (
      approval.actionId === "STUDENT_WITHDRAWAL_OR_FREEZE" &&
      (approval.payload?.studentId || approval.payload?.targetUserId)
    ) {
      const studentId = approval.payload.studentId || approval.payload.targetUserId;
      const targetStatus = approval.payload.targetStatus || approval.payload.newStatus || "inactive";
      await updateStudentStatus(studentId, targetStatus, currentUid, approval.id);
      try {
        await markApprovalApplied(approval.id, currentUid);
      } catch (markErr) {
        console.warn("markApprovalApplied error for student withdrawal:", markErr);
      }
      return {
        success: true,
        message: `Authorized: Student status updated to ${targetStatus}.`,
      };
    }

    // Default logged/non-downstream actions (e.g. CASH_DISCREPANCY, CLASS_CANCELLATION_OR_RESCHEDULE)
    try {
      await markApprovalApplied(approval.id, currentUid);
    } catch (markErr) {
      console.warn("markApprovalApplied error for logged action:", markErr);
    }
    return {
      success: true,
      message: `Authorized: ${approval.label}`,
    };
  };

  const handleApprove = async (approval) => {
    if (processingId) return;
    const currentUid = auth.currentUser?.uid;
    if (approval.requestedByUid && approval.requestedByUid === currentUid) {
      toast("Dual-control restriction: You cannot approve a request you submitted yourself.", "error");
      return;
    }
    if (!canApproveGate(userRole, approval.actionId || approval)) {
      toast(`You do not have authorization to approve ${approval.label || "this action"} under governing rules.`, "error");
      return;
    }
    if (
      approval.actionId === "STAFF_ROLE_ELEVATION" &&
      approval.payload?.targetUserId &&
      approval.payload.targetUserId === currentUid
    ) {
      toast("Dual-control restriction: You cannot approve your own role elevation.", "error");
      return;
    }

    const isConfirmed = await confirm({
      title: "Authorize Operational Action",
      message: `Are you sure you want to approve "${approval.label}" requested by ${approval.requestedBy}?`,
      confirmLabel: "Approve & Execute",
      cancelLabel: "Cancel",
    });

    if (!isConfirmed) return;

    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast(
        "Cannot authorize action: connection is offline or unstable. Please check your internet connection.",
        "error"
      );
      return;
    }

    setProcessingId(approval.id);
    try {
      const decisionData = {};
      if (approval.actionId === "NEW_STAFF_ACCOUNT") {
        let role = staffRoleAssignments[approval.id] || "instructor";
        const bId = staffBranchAssignments[approval.id] || "kota_gorontalo";
        let div = staffDivisionAssignments[approval.id] || "courses";

        if (isLeanSatelliteBranch(bId)) {
          if (div === "kindergarten" || div === "all") div = "courses";
          if (role === "opslead" || role === "instructorleader") role = "instructor";
        } else if (role === "manager" && div === "all") {
          div = "courses";
        }

        decisionData.approvedRole = role;
        decisionData.approvedBranchId = bId;
        decisionData.approvedDivision = div;
      }

      await approveApprovalRequest(approval.id, decisionData);

      const approvalForExecution = {
        ...approval,
        ...decisionData,
      };

      try {
        const result = await executeDownstreamAction(approvalForExecution, currentUid);
        toast(result.message, "success");
      } catch (downstreamErr) {
        toast(
          `Approved ticket, but failed to execute downstream action (${downstreamErr.message}). The ticket is preserved in the Action Required queue for retry.`,
          "warning"
        );
      }
    } catch (err) {
      toast("Failed to approve: " + err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetryExecution = async (approval) => {
    if (processingId) return;
    const currentUid = auth.currentUser?.uid;

    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast(
        "Cannot execute action: connection is offline or unstable. Please check your internet connection.",
        "error"
      );
      return;
    }

    setProcessingId(approval.id);
    try {
      const result = await executeDownstreamAction(approval, currentUid);
      toast(result.message, "success");
    } catch (err) {
      toast(`Retry failed: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approval) => {
    if (processingId) return;
    const currentUid = auth.currentUser?.uid;
    if (approval.requestedByUid && approval.requestedByUid === currentUid) {
      toast("Dual-control restriction: You cannot decide on a request you submitted yourself.", "error");
      return;
    }

    const isConfirmed = await confirm({
      title: "Reject Request",
      message: `Are you sure you want to reject "${approval.label}" requested by ${approval.requestedBy}?`,
      confirmLabel: "Reject Request",
      cancelLabel: "Cancel",
      isDestructive: true,
    });

    if (!isConfirmed) return;

    const isReachable = await checkNetworkReachability();
    if (!isReachable) {
      toast(
        "Cannot reject request: connection is offline or unstable. Please check your internet connection.",
        "error"
      );
      return;
    }

    setProcessingId(approval.id);
    try {
      await rejectApprovalRequest(approval.id, { reason: "Declined by approver" });

      // A rejected placement override must release the inquiry, otherwise it stays
      // blocked on a decision that will never arrive.
      if (approval.actionId === "PLACEMENT_LEVEL_OVERRIDE" && approval.payload?.inquiryId) {
        try {
          await clearPendingPlacementOverride(approval.payload.inquiryId, currentUid);
        } catch (clearErr) {
          console.warn("Failed to clear the parked placement override:", clearErr);
        }
      } else if (approval.actionId === "DISCOUNT_OR_REFUND" && approval.payload?.paymentId) {
        try {
          await updatePaymentApprovalStatus(approval.payload.paymentId, "rejected");
        } catch (rejectErr) {
          console.warn("Failed to update payment approvalStatus to rejected:", rejectErr);
        }
        if (approval.payload?.studentId) {
          try {
            await markPaymentPending(approval.payload.studentId);
          } catch (pendingErr) {
            console.warn("Failed to reset student paymentStatus on discount rejection:", pendingErr);
          }
        }
      }

      toast(`Rejected: ${approval.label}`, "info");
    } catch (err) {
      toast("Failed to reject: " + err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "Recently";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return isNaN(d.getTime()) ? "Recently" : d.toLocaleString("id-ID");
    } catch {
      return "Recently";
    }
  };

  const currentList = activeTab === "pending" ? approvals : unappliedApprovals;
  const filteredApprovals =
    selectedDomain === "all"
      ? currentList
      : currentList.filter((a) => a.domain === selectedDomain);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1a3a8f]" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">{title}</h3>
            {approvals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                {approvals.length} pending
              </span>
            )}
            {unappliedApprovals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-extrabold text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {unappliedApprovals.length} unapplied
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        </div>

        {/* Domain Filters */}
        <div className="flex flex-wrap gap-1.5">
          {["all", "finance", "students", "staff", "classes"].map((dom) => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs capitalize transition cursor-pointer ${
                selectedDomain === dom
                  ? "bg-[#1a3a8f] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Switcher: Pending vs Action Required / Unapplied */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "bg-[#1a3a8f] text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>Pending Review</span>
          {approvals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px]">
              {approvals.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("unapplied")}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "unapplied"
              ? "bg-amber-600 text-white shadow-xs"
              : unappliedApprovals.length > 0
              ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Action Required / Unapplied</span>
          {unappliedApprovals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">
              {unappliedApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
          Loading approval requests...
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-extrabold text-sm text-slate-700">All clear!</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === "pending"
              ? "There are currently no pending dual-control authorization requests in your queue."
              : "There are no approved tickets requiring execution retry. All authorized actions have been applied."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((req) => (
            <div
              key={req.id}
              className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                activeTab === "unapplied"
                  ? "border-amber-300 bg-amber-50/40 hover:bg-amber-50/60"
                  : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">{req.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                      req.mode === "blocking"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {req.mode}
                  </span>
                  {activeTab === "unapplied" && (
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide bg-amber-200 text-amber-900">
                      Unapplied / Action Required
                    </span>
                  )}
                  {req.approverBranchId && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      <Building className="w-3 h-3 text-slate-400" />
                      {idToBranch(req.approverBranchId)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Requested by: <strong className="text-slate-700">{req.requestedBy}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTimestamp(req.requestedAt)}
                  </span>
                </div>

                {activeTab === "unapplied" && (
                  <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Approved, Action Pending Execution</p>
                      <p className="text-[11px] text-amber-800">
                        Approved on {formatTimestamp(req.decidedAt)} by {req.decidedBy || "Approver"}, but the downstream operation was not completed. Click Retry Execution to finalize.
                      </p>
                    </div>
                  </div>
                )}

                {req.reason && (
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 font-medium">
                    <strong className="text-slate-800">Reason:</strong> {req.reason}
                  </p>
                )}

                {req.actionId === "STAFF_ROLE_ELEVATION" && (
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800">
                      Staff Member: <span className="font-semibold text-indigo-700">{req.payload?.targetName || req.payload?.targetEmail || req.payload?.targetUserId || "Staff"}</span>
                    </div>
                    <div className="text-slate-600">
                      Role Elevation: <span className="font-semibold text-slate-700">{req.payload?.currentRole || "Current Role"}</span> ➔ <strong className="text-indigo-800 font-bold uppercase">{req.payload?.targetRole || "Elevated Role"}</strong>
                    </div>
                  </div>
                )}

                {req.actionId === "STAFF_DEACTIVATION" && (
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800">
                      Staff Member: <span className="font-semibold text-rose-700">{req.payload?.targetName || req.payload?.targetEmail || req.payload?.targetUserId || "Staff"}</span>
                    </div>
                    <div className="text-slate-600">
                      Deactivation Status: <strong className="text-rose-800 font-bold uppercase">{req.payload?.targetStatus || "resigned"}</strong>
                    </div>
                  </div>
                )}

                {req.actionId === "PAYMENT_CORRECTION_OR_VOID" && (
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800">
                      Payment Void & Reversal: Receipt <strong className="text-rose-700 font-mono">{req.payload?.receiptNumber || req.payload?.paymentId || "Receipt"}</strong>
                    </div>
                    <div className="text-slate-600">
                      Original Amount: <strong className="text-slate-800">Rp {Number(req.payload?.amount || 0).toLocaleString("id-ID")}</strong>
                    </div>
                    {req.payload?.reason && (
                      <div className="text-rose-800 font-medium italic">
                        Reason: {req.payload.reason}
                      </div>
                    )}
                  </div>
                )}

                {req.actionId === "STUDENT_WITHDRAWAL_OR_FREEZE" && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800">
                      Student: <span className="font-semibold text-amber-800">{req.payload?.studentName || req.payload?.studentId || "Student"}</span>
                    </div>
                    <div className="text-slate-600">
                      Requested Status: <strong className="text-amber-900 font-bold uppercase">{req.payload?.targetStatus || req.payload?.newStatus || "inactive"}</strong>
                    </div>
                    {req.payload?.reason && (
                      <div className="text-slate-600 font-medium italic">
                        Reason: {req.payload.reason}
                      </div>
                    )}
                  </div>
                )}

                {req.actionId === "NEW_STAFF_ACCOUNT" && (() => {
                  const curBranchId = req.approvedBranchId || staffBranchAssignments[req.id] || "kota_gorontalo";
                  const curRole = req.approvedRole || staffRoleAssignments[req.id] || "instructor";
                  const curDivision = req.approvedDivision || staffDivisionAssignments[req.id] || "courses";
                  const isSatellite = isLeanSatelliteBranch(curBranchId);
                  const isMgr = curRole === "manager";

                  return (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-800">
                        Applicant: <span className="font-semibold text-indigo-700">{req.payload?.displayName || "Staff Member"}</span>
                        {req.payload?.email && <span className="text-slate-500 font-normal ml-1">({req.payload.email})</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-1.5">
                        <label className="font-bold text-slate-700">Assign Role:</label>
                        <select
                          value={curRole}
                          disabled={activeTab === "unapplied"}
                          onChange={(e) => handleRoleChange(req.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1a3a8f] disabled:bg-slate-100"
                        >
                          <option value="instructor">Instructor</option>
                          {!isSatellite && (
                            <option value="instructorleader">Instructor Leader</option>
                          )}
                          {!isSatellite && (
                            <option value="opslead">Operational Leader</option>
                          )}
                          <option value="frontoffice">Front Office</option>
                          <option value="manager">Division Manager</option>
                          <option value="marketing">Marketing</option>
                          <option value="officeboy">Office Boy</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="font-bold text-slate-700">Assign Branch:</label>
                        <select
                          value={curBranchId}
                          disabled={activeTab === "unapplied"}
                          onChange={(e) => handleBranchChange(req.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1a3a8f] disabled:bg-slate-100"
                        >
                          {Object.entries(BRANCH_MAP).map(([bId, bName]) => (
                            <option key={bId} value={bId}>
                              {bName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="font-bold text-slate-700">Assign Division:</label>
                        <select
                          value={curDivision}
                          disabled={activeTab === "unapplied"}
                          onChange={(e) => handleDivisionChange(req.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1a3a8f] disabled:bg-slate-100"
                        >
                          <option value="courses">Courses</option>
                          {!isSatellite && (
                            <option value="kindergarten">Kindergarten</option>
                          )}
                          {!isSatellite && !isMgr && (
                            <option value="all">All Divisions</option>
                          )}
                        </select>
                      </div>
                    </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {activeTab === "unapplied" ? (
                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleRetryExecution(req)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${processingId === req.id ? "animate-spin" : ""}`} />
                    <span>Retry Execution</span>
                  </button>
                ) : (
                  (() => {
                    const isAuthorized = canApproveGate(userRole, req.actionId || req);
                    const isSelfRequest = req.requestedByUid && req.requestedByUid === auth.currentUser?.uid;

                    if (!isAuthorized) {
                      return (
                        <span
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 flex items-center gap-1.5"
                          title="This action requires a designated authority under governance rules"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>Higher Sign-Off Required</span>
                        </span>
                      );
                    }

                    if (isSelfRequest) {
                      return (
                        <span
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 flex items-center gap-1.5"
                          title="Dual-control restriction: You cannot approve your own request"
                        >
                          <span>Self-Request (Cannot Sign)</span>
                        </span>
                      );
                    }

                    return (
                      <>
                        <button
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req)}
                          className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Authorize</span>
                        </button>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
