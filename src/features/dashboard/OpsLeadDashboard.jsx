import { useState, useEffect, useCallback, useMemo } from "react";
import { useDashboardData } from "./useDashboardData";
import { DashboardShell, useToast, ErrorBoundary } from "../shared";
import { normalizeRole } from "../shared/roles";
import { ApprovalInbox } from "../shared/ApprovalInbox";
import { usePendingApprovalsCount } from "../shared/usePendingApprovalsCount";
import { normalizeBranch, branchToId } from "../../constants/branches";
import { getPaymentsForRecordedDay } from "../finance/paymentsRepository";
import { fetchRecentDeskInquiries } from "./frontoffice/deskInquiriesRepository";

// Ops Lead Sub-Tabs
import OpsLeadOverviewTab from "./opslead/OpsLeadOverviewTab";
import OpsLeadReconciliationTab from "./opslead/OpsLeadReconciliationTab";
import OpsLeadFacilitiesTab from "./opslead/OpsLeadFacilitiesTab";
import OpsLeadProgressReportsTab from "./opslead/OpsLeadProgressReportsTab";
import FrontOfficePerformanceTab from "./opslead/FrontOfficePerformanceTab";
import TodayScheduleBoard from "./frontoffice/TodayScheduleBoard";
import { StudentRoster } from "../students";
import { AvailableBatches } from "../classes";
import { CorporateEventsPanel } from "../attendance";

import {
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  Wrench,
  UserCheck,
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  Calendar,
} from "lucide-react";

/**
 * OpsLeadDashboard
 *
 * Dedicated branch-site operational command center for the Operational Leader.
 * Conforms to Authoritative Blueprint v3.3 (§6.8, §6.10), G-009, and Ratified Owner Decisions OD-O1 to OD-O4:
 * 1. Coordinates branch-site logistics, facility maintenance, and cleanliness (Office Boy / Facilities).
 * 2. Provides Dual-Control Maker-Checker Approval Inbox for operational domain actions:
 *    - Whole-Class Cancellation / Reschedule
 *    - Retroactive Student Attendance Edits
 *    - Student Class / Batch Transfers
 *    - Cash Discrepancy tickets under Rp 20.000
 * 3. Daily shift cash reconciliation oversight (read-only till breakdown; NO personal cashier intake).
 * 4. Whole-branch operational scope across Course and Kindergarten facilities.
 */
export default function OpsLeadDashboard({ branch = null, role = "opslead" }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [dailyPayments, setDailyPayments] = useState([]);
  const [dailyPaymentsLoading, setDailyPaymentsLoading] = useState(true);
  const [uncontactedInquiriesCount, setUncontactedInquiriesCount] = useState(0);

  const toast = useToast();

  const {
    users,
    classes,
    instructors,
    students,
    todos,
    getStudentClasses,
    handleAddTodo,
    handleToggleTodo,
    handleDeleteTodo,
  } = useDashboardData();

  const myBranch = useMemo(() => {
    return normalizeBranch(branch || "Kota Gorontalo");
  }, [branch]);

  const targetBranchId = useMemo(() => branchToId(myBranch), [myBranch]);

  const effectiveRole = useMemo(() => normalizeRole(role) || "opslead", [role]);

  // Dual-control approvals count badge
  const pendingApprovalsCount = usePendingApprovalsCount(effectiveRole, myBranch);

  // Fetch today's branch intake and inquiries for operational oversight
  const fetchTodayPayments = useCallback(async () => {
    setDailyPaymentsLoading(true);
    try {
      const [list, inquiries] = await Promise.all([
        getPaymentsForRecordedDay(new Date(), targetBranchId),
        fetchRecentDeskInquiries(50, targetBranchId, "all").catch(() => []),
      ]);
      setDailyPayments(list);
      const uncontacted = (inquiries || []).filter((inq) => {
        const st = (inq.status || "inquired").toLowerCase();
        return st === "new" || st === "inquired";
      }).length;
      setUncontactedInquiriesCount(uncontacted);
    } catch (err) {
      console.warn("Failed to load daily payments for Ops Lead reconciliation:", err);
      toast("Could not refresh today's payments.", "error");
    } finally {
      setDailyPaymentsLoading(false);
    }
  }, [targetBranchId, toast]);

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setDailyPaymentsLoading(true);
        const [list, inquiries] = await Promise.all([
          getPaymentsForRecordedDay(new Date(), targetBranchId),
          fetchRecentDeskInquiries(50, targetBranchId, "all").catch(() => []),
        ]);
        if (active) {
          setDailyPayments(list);
          const uncontacted = (inquiries || []).filter((inq) => {
            const st = (inq.status || "inquired").toLowerCase();
            return st === "new" || st === "inquired";
          }).length;
          setUncontactedInquiriesCount(uncontacted);
          setDailyPaymentsLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load daily payments for Ops Lead reconciliation:", err);
        if (active) {
          toast("Could not refresh today's payments.", "error");
          setDailyPaymentsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [targetBranchId, toast]);

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      component: (
        <OpsLeadOverviewTab
          myBranch={myBranch}
          users={users}
          classes={classes}
          pendingApprovalsCount={pendingApprovalsCount}
          dailyPayments={dailyPayments}
          todos={todos}
          uncontactedInquiriesCount={uncontactedInquiriesCount}
          onNavigate={(tabId) => setActiveTab(tabId)}
        />
      ),
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ApprovalInbox
          userRole={effectiveRole}
          branchId={myBranch}
          title="Operational Dual-Control Approvals"
          subtitle="Authorize branch attendance corrections, class transfers, reschedules, and cash discrepancies under Rp 20.000."
        />
      ),
    },
    {
      id: "reconciliation",
      label: "Cash Reconciliation",
      icon: Wallet,
      component: (
        <OpsLeadReconciliationTab
          dailyPayments={dailyPayments}
          myBranch={myBranch}
          loading={dailyPaymentsLoading}
          onRefresh={fetchTodayPayments}
          onNavigateToApprovals={() => setActiveTab("approvals")}
        />
      ),
    },
    {
      id: "facilities",
      label: "Facilities & Support",
      icon: Wrench,
      badge: todos.filter((t) => !t.completed).length || null,
      component: (
        <OpsLeadFacilitiesTab
          todos={todos}
          users={users}
          myBranch={myBranch}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
        />
      ),
    },
    {
      id: "frontoffice",
      label: "Front Desk Intake",
      icon: UserCheck,
      component: (
        <FrontOfficePerformanceTab
          myBranch={myBranch}
          targetBranchId={targetBranchId}
        />
      ),
    },
    {
      id: "students",
      label: "Campus Learners",
      icon: Users,
      component: (
        <StudentRoster
          students={students}
          classes={classes}
          users={users}
          getStudentClasses={getStudentClasses}
          readOnly={true}
          canEditStatus={false}
          userRole={effectiveRole}
          branchId={myBranch}
          canViewParents={true}
        />
      ),
    },
    {
      id: "progress",
      label: "Academic Progress",
      icon: GraduationCap,
      component: (
        <OpsLeadProgressReportsTab
          myBranch={myBranch}
        />
      ),
    },
    {
      id: "batches",
      label: "Capacity & Batches",
      icon: BookOpen,
      component: (
        <AvailableBatches
          classes={classes}
          instructors={instructors}
          users={users}
          canEdit={true}
          role="opslead"
          isOverviewWidget={false}
        />
      ),
    },
    {
      id: "schedule",
      label: "Live Schedule Board",
      icon: DoorOpen,
      component: (
        <TodayScheduleBoard
          classes={classes}
          instructors={instructors}
        />
      ),
    },
    {
      id: "events",
      label: "Events & Logistics",
      icon: Calendar,
      component: <CorporateEventsPanel />,
    },
  ];

  return (
    <ErrorBoundary label="Operational Leader Dashboard">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        primaryTabIds={[
          "overview",
          "approvals",
          "reconciliation",
          "facilities",
          "frontoffice",
          "students",
          "progress",
        ]}
        title="Operational Leader Portal"
        extraSidebarContent={
          <div className="px-2 pb-1">
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-orange-200">
              Branch-Site Operations
            </span>
          </div>
        }
      />
    </ErrorBoundary>
  );
}
