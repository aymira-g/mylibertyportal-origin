import { useState, useEffect } from "react";
import {
  listenToPendingApprovals,
  approveApprovalRequest,
  rejectApprovalRequest,
  markApprovalApplied,
} from "./approvalsRepository";
import { applyApprovedShiftCorrection } from "../attendance/shiftsRepository";
import { updateStaffRecord } from "../dashboard/usersRepository";
import { useToast } from "./useToast";
import { useConfirm } from "./useConfirm";
import { idToBranch, BRANCH_MAP } from "../../constants/branches";
import { checkNetworkReachability } from "../../utils/networkReachability";
import { auth } from "../../firebase";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileCheck,
  User,
  Building,
} from "lucide-react";

export function ApprovalInbox({
  userRole = "admin",
  branchId = null,
  title = "Pending Authorization Requests",
  subtitle = "Maker-Checker dual-control operational review queue.",
}) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [processingId, setProcessingId] = useState(null);
  const [staffRoleAssignments, setStaffRoleAssignments] = useState({});
  const [staffBranchAssignments, setStaffBranchAssignments] = useState({});

  const toast = useToast();
  const confirm = useConfirm();

  const handleRoleChange = (id, newRole) => {
    setStaffRoleAssignments((prev) => ({ ...prev, [id]: newRole }));
  };

  const handleBranchChange = (id, newBranch) => {
    setStaffBranchAssignments((prev) => ({ ...prev, [id]: newBranch }));
  };

  useEffect(() => {
    const unsubscribe = listenToPendingApprovals(
      userRole,
      branchId,
      (items) => {
        setApprovals(items);
        setLoading(false);
      },
      (err) => {
        console.warn("ApprovalInbox listen error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRole, branchId]);

  const handleApprove = async (approval) => {
    if (processingId) return;
    const currentUid = auth.currentUser?.uid;
    if (approval.requestedByUid && approval.requestedByUid === currentUid) {
      toast("Dual-control restriction: You cannot approve a request you submitted yourself.", "error");
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
      await approveApprovalRequest(approval.id);

      if (approval.actionId === "STAFF_SHIFT_SELF_CORRECTION" && approval.payload?.afterData) {
        try {
          await applyApprovedShiftCorrection({ approval });
          toast(`Authorized & applied: ${approval.label}`, "success");
        } catch (applyErr) {
          toast(
            `Approved, but the correction could not be applied (${applyErr.message}). An admin can apply it from Staff Duty Reports.`,
            "warning"
          );
        }
      } else if (approval.actionId === "STAFF_ROLE_ELEVATION" && approval.payload?.targetUserId) {
        try {
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
          toast(
            `Staff role elevation applied! Role updated to ${approval.payload.targetRole}.`,
            "success"
          );
        } catch (elevationErr) {
          toast(
            `Approved ticket, but failed to update user profile: ${elevationErr.message}`,
            "error"
          );
        }
      } else if (approval.actionId === "NEW_STAFF_ACCOUNT" && approval.payload?.uid) {
        const assignedRole = staffRoleAssignments[approval.id] || "instructor";
        const assignedBranchId = staffBranchAssignments[approval.id] || "kota_gorontalo";
        const assignedBranchName = idToBranch(assignedBranchId);
        try {
          await updateStaffRecord(approval.payload.uid, {
            email: approval.payload.email || "",
            displayName: approval.payload.displayName || approval.payload.email || "Staff Member",
            nickname: approval.payload.displayName || "",
            role: assignedRole,
            branch: assignedBranchName,
            branchId: assignedBranchId,
            division: "courses",
            status: "active",
            phone: "",
            photoURL: approval.payload.photoURL || "",
            joinedDate: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
          });
          try {
            await markApprovalApplied(approval.id, currentUid);
          } catch (markErr) {
            console.warn("markApprovalApplied error for onboarding:", markErr);
          }
          toast(
            `Staff account provisioned! Assigned ${assignedRole} at ${assignedBranchName}.`,
            "success"
          );
        } catch (provisionErr) {
          toast(
            `Approved ticket, but failed to provision user profile: ${provisionErr.message}`,
            "error"
          );
        }
      } else {
        toast(`Authorized: ${approval.label}`, "success");
      }
    } catch (err) {
      toast("Failed to approve: " + err.message, "error");
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
      toast(`Rejected: ${approval.label}`, "info");
    } catch (err) {
      toast("Failed to reject: " + err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApprovals =
    selectedDomain === "all"
      ? approvals
      : approvals.filter((a) => a.domain === selectedDomain);

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
            There are currently no pending dual-control authorization requests in your queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                    {(() => {
                      if (!req.requestedAt) return "Recently";
                      try {
                        const d = new Date(req.requestedAt);
                        return isNaN(d.getTime()) ? "Recently" : d.toLocaleString("id-ID");
                      } catch {
                        return "Recently";
                      }
                    })()}
                  </span>
                </div>

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

                {req.actionId === "NEW_STAFF_ACCOUNT" && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-wrap gap-3 items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <label className="font-bold text-slate-700">Assign Role:</label>
                      <select
                        value={staffRoleAssignments[req.id] || "instructor"}
                        onChange={(e) => handleRoleChange(req.id, e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
                      >
                        <option value="instructor">Instructor</option>
                        <option value="frontoffice">Front Office</option>
                        <option value="manager">Branch Manager</option>
                        <option value="marketing">Marketing</option>
                        <option value="officeboy">Office Boy</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="font-bold text-slate-700">Assign Branch:</label>
                      <select
                        value={staffBranchAssignments[req.id] || "kota_gorontalo"}
                        onChange={(e) => handleBranchChange(req.id, e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
                      >
                        {Object.entries(BRANCH_MAP).map(([bId, bName]) => (
                          <option key={bId} value={bId}>
                            {bName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
