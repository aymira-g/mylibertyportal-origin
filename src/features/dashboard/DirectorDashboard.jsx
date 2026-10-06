import { useState, useMemo } from "react";
import { auth } from "../../firebase";
import { useDashboardData } from "./useDashboardData";
import {
  AIAssistant,
  DashboardShell,
  WelcomeBanner,
  ApprovalInbox,
  isStaffRole,
  ErrorBoundary,
  usePendingApprovalsCount,
} from "../shared";
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
  Target,
  ShieldAlert,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
import { StudentRoster, BadgeModal } from "../students";
import { CorporateEventsPanel } from "../attendance";
import { ClassManager } from "../classes";
import { StaffDirectory, TasksPanel } from "../staff";
import { BRANCHES, branchToId, matchesBranchFilter } from "../../constants/branches";
import {
  ExecutiveBranchScopeBar,
  MultiBranchPerformanceGrid,
  ExecutiveAlertBanner,
  ExecutiveCapacitySection,
  StrategicPlanningPanel,
  RiskExceptionPanel,
  DivisionBalanceCard,
  ExecutiveTuitionHealthCard,
} from "./executive";

/**
 * DirectorDashboard: Dedicated high-level strategic leadership dashboard for Executive Director.
 * Authoritative Blueprint §6.1:
 * - Strategic leadership & province-wide multi-branch performance analytics
 * - Strategic planning, division balance, and long-term academic expansion
 * - High-level tuition & financial health indicators
 * - High-risk operational & financial exception oversight
 * - Dual-control Maker-Checker executive authorizations & separation of duties
 * - Executive inspection & audit of learners, cohorts, and faculty (operational intake delegated to Front Office)
 */
export default function DirectorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [reportsSubTab, setReportsSubTab] = useState("staff");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleNavigateToReports = (targetSubTab = "staff") => {
    setReportsSubTab(targetSubTab);
    setActiveTab("reports");
  };

  const {
    users,
    classes,
    applications,
    todos,
    selectedStudent,
    setSelectedStudent,
    handleEdit,
    handleDelete,
    handleAddTodo,
    handleDeleteTodo,
    handleToggleTodo,
    getStudentClasses,
    instructors,
    students,
    unenrolledStudents,
    pendingApplications,
  } = useDashboardData({ setActiveTab: handleTabChange });

  const pendingApprovalsCount = usePendingApprovalsCount("director");

  // Scoped datasets based on selected branch
  const filteredStudents = useMemo(() => {
    if (selectedBranch === "all") return students;
    return students.filter((s) =>
      matchesBranchFilter(s.branchId || s.branch, selectedBranch)
    );
  }, [students, selectedBranch]);

  const filteredClasses = useMemo(() => {
    if (selectedBranch === "all") return classes;
    return classes.filter((c) =>
      matchesBranchFilter(c.branchId || c.branch, selectedBranch)
    );
  }, [classes, selectedBranch]);

  const activeStaffCount = useMemo(() => {
    return users.filter(
      (user) => isStaffRole(user.role) && (user.status || "active") === "active"
    ).length;
  }, [users]);

  const activeStudentsCount = useMemo(() => {
    return filteredStudents.filter((s) => (s.status || "active") === "active").length;
  }, [filteredStudents]);

  // Strategic performance metrics across all 4 physical branches
  const branchStats = useMemo(() => {
    return BRANCHES.map((branchName) => {
      const branchId = branchToId(branchName);

      const bStudents = students.filter((s) =>
        matchesBranchFilter(s.branchId || s.branch, branchName)
      );
      const bActiveStudents = bStudents.filter(
        (s) => (s.status || "active") === "active"
      ).length;

      const bClasses = classes.filter((c) =>
        matchesBranchFilter(c.branchId || c.branch, branchName)
      );

      let totalCapacity = 0;
      let enrolledSeats = 0;
      bClasses.forEach((cls) => {
        const cap = Number(cls.capacity) || 12;
        totalCapacity += cap;
        const enrolled = Array.isArray(cls.studentIds) ? cls.studentIds.length : 0;
        enrolledSeats += enrolled;
      });
      const capacityPct = totalCapacity > 0 ? Math.round((enrolledSeats / totalCapacity) * 100) : 0;

      const bStaff = users.filter((u) =>
        isStaffRole(u.role) &&
        (u.status || "active") === "active" &&
        matchesBranchFilter(u.branchId || u.branch, branchName)
      ).length;

      const bApps = applications.filter((app) =>
        (app.status || "pending") === "pending" &&
        matchesBranchFilter(app.branchId || app.branch, branchName)
      ).length;

      return {
        branchName,
        branchId,
        activeStudents: bActiveStudents,
        activeClasses: bClasses.length,
        totalCapacity,
        enrolledSeats,
        capacityPct,
        branchStaff: bStaff,
        branchApps: bApps,
      };
    });
  }, [students, classes, users, applications]);

  const overviewTab = (
    <div className="space-y-6 w-full">
      {/* Executive Leadership Welcome Banner */}
      <WelcomeBanner
        portalLabel="Executive Leadership Portal"
        roleLabel="Executive Director"
        fallbackName="Director"
        subtitle="Province-wide strategic leadership, multi-branch performance analytics, strategic planning, and dual-control authorizations."
        stats={[
          {
            label: "Pending Approvals",
            value: pendingApprovalsCount,
            icon: ShieldCheck,
            onClick: () => handleTabChange("approvals"),
          },
          {
            label: selectedBranch === "all" ? "Province Learners" : "Branch Learners",
            value: activeStudentsCount,
            icon: GraduationCap,
            onClick: () => handleTabChange("students"),
          },
          {
            label: selectedBranch === "all" ? "Province Cohorts" : "Branch Cohorts",
            value: filteredClasses.length,
            icon: BookOpen,
            onClick: () => handleTabChange("classes"),
          },
          {
            label: "Academy Staff",
            value: activeStaffCount,
            icon: Users,
            onClick: () => handleTabChange("directory"),
          },
        ]}
      />

      {/* Executive Branch Scope Filter Bar */}
      <ExecutiveBranchScopeBar
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
      />

      {/* Multi-Branch Strategic Snapshot Card */}
      <MultiBranchPerformanceGrid
        branchStats={branchStats}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        title="Multi-Branch Strategic Performance (4 Campuses)"
        subtitle="Click any campus card below to filter the dashboard to that specific branch."
      />

      {/* High-Priority Attention Alert Bar */}
      <ExecutiveAlertBanner
        pendingApprovalsCount={pendingApprovalsCount}
        pendingApplications={pendingApplications}
        unenrolledStudentsCount={unenrolledStudents.length}
        riskAlertCount={0}
        onNavigateToApprovals={() => handleTabChange("approvals")}
        onNavigateToStudents={() => handleTabChange("students")}
        onNavigateToRisk={() => handleTabChange("risk")}
        title="Executive Strategic Action Required"
      />

      {/* Strategic Command Launchers & Governance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-sm">Strategic Command &amp; Oversight</h4>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => handleTabChange("approvals")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1a3a8f]" />
                <span>Approvals</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("strategic")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Planning</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("risk")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Risk &amp; Exceptions</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleNavigateToReports("staff")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>Reports</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">Strategic Governance Summary</h4>
              <button
                type="button"
                onClick={() => handleNavigateToReports("staff")}
                className="text-xs text-[#1a3a8f] font-bold hover:underline"
              >
                Executive Reports →
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {students.filter((s) => (s.status || "active") === "active").length} total learners registered across Gorontalo Province
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {classes.length} active classes · {instructors.filter((i) => (i.status || "active") === "active").length} faculty instructors
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Admissions: <strong>{pendingApplications}</strong> application{pendingApplications !== 1 ? "s" : ""} in front-office intake queue
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Governance: <strong>Dual-Control Enforced</strong></span>
            <button
              type="button"
              onClick={() => handleTabChange("events")}
              className="text-[#1a3a8f] font-bold hover:underline"
            >
              Corporate Events +
            </button>
          </div>
        </div>
      </div>

      {/* Academic Division Breakdown (Course Academy vs Kids School) */}
      <DivisionBalanceCard
        students={students}
        selectedBranch={selectedBranch}
      />

      {/* High-Level Tuition Collection & Financial Health Indicator */}
      <ExecutiveTuitionHealthCard
        students={filteredStudents}
        onNavigateToStudents={() => handleTabChange("students")}
        onNavigateToReports={() => handleNavigateToReports("finance")}
      />

      {/* Academy Capacity Overview */}
      <ExecutiveCapacitySection
        filteredStudents={filteredStudents}
        filteredClasses={filteredClasses}
        instructors={instructors}
        users={users}
        selectedBranch={selectedBranch}
        role="director"
        showTuitionDueList={false}
        onNavigateToStudents={() => handleTabChange("students")}
        onNavigateToClasses={() => handleTabChange("classes")}
      />
    </div>
  );

  const tabs = [
    // Main Strategic Overview
    { id: "overview", label: "Overview", category: "Main", component: overviewTab },

    // Dual-Control Governance (Operations Category)
    {
      id: "approvals",
      label: "Approvals",
      category: "Operations",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ErrorBoundary label="Director Approvals queue">
          <ApprovalInbox
            userRole="director"
            title="Director Dual-Control Authorization Registry"
            subtitle="Dual-control executive sign-off queue for staff role elevations, strategic governance exceptions, large discounts, and financial variances."
          />
        </ErrorBoundary>
      ),
    },

    // Strategic Planning & Risk Oversight
    {
      id: "strategic",
      label: "Strategic Planning",
      category: "Governance",
      component: (
        <ErrorBoundary label="Strategic planning panel">
          <StrategicPlanningPanel
            students={students}
            classes={classes}
            instructors={instructors}
          />
        </ErrorBoundary>
      ),
    },
    {
      id: "risk",
      label: "Risk & Exceptions",
      category: "Governance",
      component: (
        <ErrorBoundary label="Risk and exceptions panel">
          <RiskExceptionPanel
            pendingApprovalsCount={pendingApprovalsCount}
            unenrolledStudentsCount={unenrolledStudents.length}
            onNavigateToApprovals={() => handleTabChange("approvals")}
            onNavigateToStudents={() => handleTabChange("students")}
          />
        </ErrorBoundary>
      ),
    },

    // Academic & School Oversight (Executive Inspection & Policy Review Only)
    {
      id: "students",
      label: "Students",
      category: "Academic",
      component: (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Academic Learner Roster &amp; Profile Directory
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Executive inspection and audit view. Front desk staff execute day-to-day enrollment and intake, while Executive Directorate oversees academic policy and authorizations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigateToReports("students")}
              className="text-xs font-bold text-[#1a3a8f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition self-start sm:self-auto cursor-pointer shrink-0"
            >
              Academic Reports →
            </button>
          </div>
          <StudentRoster
            students={filteredStudents}
            classes={filteredClasses}
            users={users}
            getStudentClasses={getStudentClasses}
            setSelectedStudent={setSelectedStudent}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleAddStudent={null}
            isAdmin={true}
            userRole="director"
            branchId={selectedBranch === "all" ? null : branchToId(selectedBranch)}
            canViewParents={true}
          />
        </div>
      ),
    },
    {
      id: "classes",
      label: "Classes",
      category: "Academic",
      component: (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Academic Classes &amp; Cohort Capacity Management
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Executive cohort inspection. Division Managers manage day-to-day batch schedules, while Executive Directorate monitors province-wide seat utilization and expansion.
              </p>
            </div>
          </div>
          <ClassManager
            classes={filteredClasses}
            users={users}
            instructors={instructors}
            unenrolledStudents={unenrolledStudents}
            role="director"
            isAdmin={false}
          />
        </div>
      ),
    },
    {
      id: "events",
      label: "Events",
      category: "Academic",
      component: (
        <CorporateEventsPanel
          canCreate={false}
          title="Executive Calendar & Corporate Events"
          subtitle="Province-wide institutional calendar, holidays, and corporate event oversight. Front Office and Operational Leaders coordinate local branch event logistics, while the Executive Directorate maintains calendar review."
        />
      ),
    },

    // Operations & Staff (Inspection Only)
    {
      id: "directory",
      label: "Staff Directory",
      category: "Operations",
      component: (
        <StaffDirectory
          users={users}
          classes={classes}
          invites={[]}
          currentUserId={auth.currentUser?.uid}
          onAddStaff={null}
          onEditStaff={handleEdit}
          onPrintBadge={setSelectedStudent}
          onDeleteStaff={handleDelete}
          onNavigateToInvites={null}
        />
      ),
    },
    {
      id: "misc",
      label: "Directives",
      category: "Operations",
      badge: todos.filter((t) => !t.completed).length || null,
      component: (
        <TasksPanel
          todos={todos}
          users={users}
          currentUser={auth.currentUser}
          userRole="director"
          onAddTodo={handleAddTodo}
          onDeleteTodo={handleDeleteTodo}
          onToggleTodo={handleToggleTodo}
        />
      ),
    },

    // System Reports & AI
    {
      id: "reports",
      label: "Reports",
      category: "System",
      component: (
        <ReportsDashboard
          isAdminView={true}
          isFrontOffice={false}
          canEdit={true}
          initialSubTab={reportsSubTab}
          onSubTabChange={setReportsSubTab}
        />
      ),
    },
    {
      id: "aiAssistant",
      label: "AI Assistant",
      category: "System",
      component: <AIAssistant />,
    },
  ];

  return (
    <div className="w-full">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        title="Executive Director Strategic Command"
        primaryTabIds={["overview", "approvals", "strategic", "risk", "students", "classes", "reports"]}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
