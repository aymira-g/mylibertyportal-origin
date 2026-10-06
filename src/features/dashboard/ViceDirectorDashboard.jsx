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
  UserPlus,
  GraduationCap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
  Activity,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
import { StudentApplications, UserForm, StudentRoster, BadgeModal } from "../students";
import { CorporateEventsPanel } from "../attendance";
import { ClassManager } from "../classes";
import { StaffDirectory, InvitesPanel, TasksPanel } from "../staff";
import { BRANCHES, branchToId, matchesBranchFilter } from "../../constants/branches";
import {
  ExecutiveBranchScopeBar,
  MultiBranchPerformanceGrid,
  ExecutiveAlertBanner,
  ExecutiveCapacitySection,
  BranchOperationalHealthPanel,
} from "./executive";

/**
 * ViceDirectorDashboard: Dedicated operational leadership dashboard for Vice Director.
 * Authoritative Blueprint §6.2:
 * - Operational execution & multi-branch operational health follow-up
 * - Routine executive approvals (delegated discounts, refunds, operational sign-offs)
 * - Admissions, cohort scheduling, and staff allocation oversight
 * - Dual-control Maker-Checker executive authorizations
 */
export default function ViceDirectorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const {
    users,
    classes,
    applications,
    invites,
    todos,
    editId,
    setEditId,
    selectedStudent,
    setSelectedStudent,
    formData,
    setFormData,
    handleSave,
    handleEdit,
    handleAddStaff,
    handleAddStudent,
    handleDelete,
    handleAddTodo,
    handleDeleteTodo,
    handleToggleTodo,
    handleCreateInvite,
    handleDeleteInvite,
    getStudentClasses,
    instructors,
    students,
    unenrolledStudents,
    pendingApplications,
  } = useDashboardData({ setActiveTab: handleTabChange });

  const pendingApprovalsCount = usePendingApprovalsCount("vice_director");

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

  const filteredApplications = useMemo(() => {
    if (selectedBranch === "all") return applications;
    return applications.filter((app) =>
      matchesBranchFilter(app.branchId || app.branch, selectedBranch)
    );
  }, [applications, selectedBranch]);

  const activeStaffCount = useMemo(() => {
    return users.filter(
      (user) => isStaffRole(user.role) && (user.status || "active") === "active"
    ).length;
  }, [users]);

  const activeStudentsCount = useMemo(() => {
    return filteredStudents.filter((s) => (s.status || "active") === "active").length;
  }, [filteredStudents]);

  // Operational performance metrics across all 4 physical branches
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
      {/* Operational Leadership Welcome Banner */}
      <WelcomeBanner
        portalLabel="Operational Leadership Portal"
        roleLabel="Vice Director"
        fallbackName="Vice Director"
        subtitle="Multi-branch operational health follow-up, daily/weekly performance execution, and routine executive authorizations."
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

      {/* Multi-Branch Operational Grid */}
      <MultiBranchPerformanceGrid
        branchStats={branchStats}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        title="Multi-Branch Operational Performance (4 Campuses)"
        subtitle="Click any campus card below to filter the dashboard to that specific branch."
      />

      {/* High-Priority Attention Alert Bar */}
      <ExecutiveAlertBanner
        pendingApprovalsCount={pendingApprovalsCount}
        pendingApplications={pendingApplications}
        unenrolledStudentsCount={unenrolledStudents.length}
        riskAlertCount={0}
        onNavigateToApprovals={() => handleTabChange("approvals")}
        onNavigateToApplications={() => handleTabChange("applications")}
        onNavigateToStudents={() => handleTabChange("students")}
        title="Operational Action Required"
      />

      {/* Operational Command Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-sm">Operational Command &amp; Follow-up</h4>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => handleTabChange("approvals")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1a3a8f]" />
                <span>Routine Approvals</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("operations")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Branch Operations</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("applications")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Admissions</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("reports")}
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
              <h4 className="font-bold text-slate-800 text-sm">Operational Execution Summary</h4>
              <button
                type="button"
                onClick={() => handleTabChange("operations")}
                className="text-xs text-[#1a3a8f] font-bold hover:underline"
              >
                Branch Health Details →
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {students.filter((s) => (s.status || "active") === "active").length} total active learners across 4 campuses
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {classes.length} active cohorts · {instructors.filter((i) => (i.status || "active") === "active").length} active instructors
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Delegated Authority: <strong>Operational Approvals</strong></span>
            <button
              type="button"
              onClick={() => handleTabChange("invites")}
              className="text-[#1a3a8f] font-bold hover:underline"
            >
              Staff Invites +
            </button>
          </div>
        </div>
      </div>

      {/* Academy Capacity & Tuition Overview */}
      <ExecutiveCapacitySection
        filteredStudents={filteredStudents}
        filteredClasses={filteredClasses}
        instructors={instructors}
        users={users}
        selectedBranch={selectedBranch}
        role="vice_director"
        onNavigateToStudents={() => handleTabChange("students")}
        onNavigateToClasses={() => handleTabChange("classes")}
      />
    </div>
  );

  const tabs = [
    // Main Operational Overview
    { id: "overview", label: "Overview", category: "Main", component: overviewTab },

    // Routine Dual-Control Governance (Operations Category)
    {
      id: "approvals",
      label: "Approvals",
      category: "Operations",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ErrorBoundary label="Vice Director Approvals queue">
          <ApprovalInbox
            userRole="vice_director"
            title="Vice Director Operational Authorization Registry"
            subtitle="Dual-control executive sign-off queue for delegated operational approvals, discounts, fee refunds, and cashier closing reviews."
          />
        </ErrorBoundary>
      ),
    },

    // Operational Health & Follow-up
    {
      id: "operations",
      label: "Branch Health",
      category: "Operations",
      component: (
        <ErrorBoundary label="Branch operational health panel">
          <BranchOperationalHealthPanel
            students={students}
            classes={classes}
            users={users}
            applications={applications}
            selectedBranch={selectedBranch}
            onNavigateToApplications={() => handleTabChange("applications")}
            onNavigateToClasses={() => handleTabChange("classes")}
            onNavigateToStudents={() => handleTabChange("students")}
          />
        </ErrorBoundary>
      ),
    },

    // Academic & School Oversight
    {
      id: "applications",
      label: "Applications",
      category: "Academic",
      badge: filteredApplications.filter((a) => (a.status || "pending") === "pending").length || null,
      component: (
        <StudentApplications
          applications={filteredApplications}
          classes={filteredClasses}
          users={users}
          onApproveAndEdit={handleEdit}
          onViewStudent={handleEdit}
        />
      ),
    },
    {
      id: "students",
      label: "Students",
      category: "Academic",
      component: (
        <StudentRoster
          students={filteredStudents}
          classes={filteredClasses}
          users={users}
          getStudentClasses={getStudentClasses}
          setSelectedStudent={setSelectedStudent}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleAddStudent={handleAddStudent}
          isAdmin={true}
          userRole="vice_director"
          branchId={selectedBranch === "all" ? null : branchToId(selectedBranch)}
          canViewParents={true}
        />
      ),
    },
    {
      id: "classes",
      label: "Classes",
      category: "Academic",
      component: (
        <ClassManager
          classes={filteredClasses}
          users={users}
          instructors={instructors}
          unenrolledStudents={unenrolledStudents}
          role="vice_director"
          isAdmin={true}
        />
      ),
    },
    {
      id: "events",
      label: "Events",
      category: "Academic",
      component: <CorporateEventsPanel />,
    },

    // Operations & Staff
    {
      id: "directory",
      label: "Staff Directory",
      category: "Operations",
      component: (
        <StaffDirectory
          users={users}
          classes={classes}
          invites={invites}
          currentUserId={auth.currentUser?.uid}
          onAddStaff={handleAddStaff}
          onEditStaff={handleEdit}
          onPrintBadge={setSelectedStudent}
          onDeleteStaff={handleDelete}
          onNavigateToInvites={() => handleTabChange("invites")}
        />
      ),
    },
    {
      id: "invites",
      label: "Invites",
      category: "Operations",
      component: (
        <InvitesPanel
          invites={invites}
          users={users}
          onCreateInvite={handleCreateInvite}
          onDeleteInvite={handleDeleteInvite}
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
          userRole="vice_director"
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
      component: <ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={true} />,
    },
    {
      id: "aiAssistant",
      label: "AI Assistant",
      category: "System",
      component: <AIAssistant />,
    },

    // Hidden form tab for adding / editing user
    {
      id: "addUser",
      label: "Add / Edit User",
      hidden: true,
      component: (
        <UserForm
          formData={formData}
          setFormData={setFormData}
          editId={editId}
          onSubmit={handleSave}
          onCancel={() => {
            setEditId(null);
            setActiveTab("overview");
          }}
          students={students}
        />
      ),
    },
  ];

  return (
    <div className="w-full">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        title="Vice Director Operational Command"
        primaryTabIds={["overview", "approvals", "operations", "students", "classes", "reports"]}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
