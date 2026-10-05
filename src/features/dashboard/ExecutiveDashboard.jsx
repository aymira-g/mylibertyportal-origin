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
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
import { StudentApplications, UserForm, StudentRoster, BadgeModal } from "../students";
import { CorporateEventsPanel } from "../attendance";
import { ClassManager, AvailableBatches } from "../classes";
import { StaffDirectory, InvitesPanel, TasksPanel } from "../staff";
import { TuitionDueWidget } from "./frontoffice";

/**
 * ExecutiveDashboard: Dedicated high-level leadership dashboard for Director and Vice Director roles.
 * Governs school-wide dual-control authorizations, cross-branch capacity, admissions, and financial oversight.
 */
export default function ExecutiveDashboard({ role = "director" }) {
  const [activeTab, setActiveTab] = useState("overview");

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

  const pendingApprovalsCount = usePendingApprovalsCount(role);

  const activeStaffCount = useMemo(() => {
    return users.filter(
      (user) => isStaffRole(user.role) && (user.status || "active") === "active"
    ).length;
  }, [users]);

  const activeStudentsCount = useMemo(() => {
    return students.filter((s) => (s.status || "active") === "active").length;
  }, [students]);

  const roleTitle = role === "vice_director" ? "Vice Director" : "Executive Director";

  const overviewTab = (
    <div className="space-y-6 w-full">
      {/* Executive Leadership Welcome Banner */}
      <WelcomeBanner
        portalLabel="Executive Leadership Portal"
        roleLabel={roleTitle}
        fallbackName="Director"
        subtitle="School-wide dual-control authorizations, cross-branch enrollment health, academic capacity, and executive reports."
        stats={[
          {
            label: "Pending Approvals",
            value: pendingApprovalsCount,
            icon: ShieldCheck,
            onClick: () => handleTabChange("approvals"),
          },
          {
            label: "Active Students",
            value: activeStudentsCount,
            icon: GraduationCap,
            onClick: () => handleTabChange("students"),
          },
          {
            label: "Active Cohorts",
            value: classes.length,
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

      {/* Needs Attention Alert Bar */}
      {(pendingApplications > 0 || unenrolledStudents.length > 0 || pendingApprovalsCount > 0) && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Executive Action Required
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-medium text-amber-800">
                {pendingApprovalsCount > 0 && (
                  <span>
                    • <strong>{pendingApprovalsCount}</strong> pending authorization{pendingApprovalsCount > 1 ? "s" : ""} awaiting executive review
                  </span>
                )}
                {pendingApplications > 0 && (
                  <span>
                    • <strong>{pendingApplications}</strong> pending application{pendingApplications > 1 ? "s" : ""} awaiting review
                  </span>
                )}
                {unenrolledStudents.length > 0 && (
                  <span>
                    • <strong>{unenrolledStudents.length}</strong> active student{unenrolledStudents.length > 1 ? "s" : ""} unassigned to a class
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("approvals")}
                className="min-h-11 px-3.5 py-2 bg-[#1a3a8f] hover:bg-[#132c6d] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Review Approvals
              </button>
            )}
            {pendingApplications > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("applications")}
                className="min-h-11 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Review Applications
              </button>
            )}
            {unenrolledStudents.length > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("students")}
                className="min-h-11 px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Assign Students
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Launchers & Leadership Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-sm">Executive Actions</h4>
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
              onClick={() => handleTabChange("applications")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Admissions</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("classes")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Classes</span>
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
              <h4 className="font-bold text-slate-800 text-sm">Academy Operations Snapshot</h4>
              <button
                type="button"
                onClick={() => handleTabChange("reports")}
                className="text-xs text-[#1a3a8f] font-bold hover:underline"
              >
                Executive Reports →
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {activeStudentsCount} enrolled learners across 4 physical branches
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {classes.length} active classes · {instructors.filter((i) => (i.status || "active") === "active").length} active instructors
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Governance: <strong>Dual-Control Active</strong></span>
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

      {/* Academy Operations & Capacity Section */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1a3a8f]" />
            Academy Operations &amp; Capacity
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Overdue tuition alerts, batch availability, and cohort capacity oversight.
          </p>
        </div>

        {/* Tuition Due / Expiry Alerts */}
        <TuitionDueWidget
          students={students}
          onNavigateToStudents={() => handleTabChange("students")}
        />

        {/* Available Batches & Capacity Overview */}
        <AvailableBatches
          classes={classes}
          instructors={instructors}
          users={users}
          canEdit={true}
          role={role}
          isOverviewWidget={true}
          onNavigateToClasses={() => handleTabChange("classes")}
        />
      </div>
    </div>
  );

  const tabs = [
    // Main
    { id: "overview", label: "Overview", category: "Main", component: overviewTab },

    // Dual-Control Governance (Operations Category)
    {
      id: "approvals",
      label: "Approvals",
      category: "Operations",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ErrorBoundary label="Approvals queue">
          <ApprovalInbox
            userRole={role}
            title="Academy Maker-Checker Authorization Registry"
            subtitle="Dual-control operational authorization queue for sensitive transactions, discounts, cash discrepancy, and data overrides."
          />
        </ErrorBoundary>
      ),
    },

    // Academic & School Oversight
    {
      id: "applications",
      label: "Applications",
      category: "Academic",
      badge: pendingApplications > 0 ? pendingApplications : null,
      component: (
        <StudentApplications
          applications={applications}
          classes={classes}
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
          students={students}
          classes={classes}
          users={users}
          getStudentClasses={getStudentClasses}
          setSelectedStudent={setSelectedStudent}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          handleAddStudent={handleAddStudent}
          isAdmin={true}
          userRole={role}
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
          classes={classes}
          users={users}
          instructors={instructors}
          unenrolledStudents={unenrolledStudents}
          role={role}
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
          userRole={role}
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
          onSaveAndCollectPayment={() => {}}
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
        title={`${roleTitle} Panel`}
        primaryTabIds={["overview", "approvals", "students", "classes", "reports"]}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
