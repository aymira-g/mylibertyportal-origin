import { useState, useEffect } from "react";
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
import { UserPlus, GraduationCap, BookOpen, AlertCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { ReportsDashboard } from "../reports";
import { StudentApplications, UserForm, StudentRoster, BadgeModal } from "../students";
import { KioskModal, KioskSidebarButton, CorporateEventsPanel, KioskProvisioningPanel } from "../attendance";
import { ClassManager, AvailableBatches } from "../classes";
import { StaffDirectory, InvitesPanel, TasksPanel } from "../staff";
import LogRetentionCard from "./LogRetentionCard";
import { TuitionDueWidget } from "./frontoffice";
import { getUrlAction, clearUrlAction } from "../../utils/urlAction.js";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [kioskOpen, setKioskOpen] = useState(() => {
    return getUrlAction() === "attendance";
  });

  useEffect(() => {
    clearUrlAction();
  }, []);

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

  const pendingApprovalsCount = usePendingApprovalsCount("admin");

  const overviewTab = (
    <div className="space-y-6 w-full">
      <WelcomeBanner
        portalLabel="Administrative Portal"
        roleLabel="System Administrator"
        fallbackName="Administrator"
        subtitle="Full administrative control of academy enrollments, staff assignments, academic cohorts, and school curriculum."
        stats={[
          {
            label: "Pending Applications",
            value: pendingApplications,
            icon: UserPlus,
            onClick: () => handleTabChange("applications"),
          },
          {
            label: "Active Students",
            value: students.filter((s) => (s.status || "active") === "active").length,
            icon: GraduationCap,
            onClick: () => handleTabChange("students"),
          },
          {
            label: "Active Classes",
            value: classes.length,
            icon: BookOpen,
            onClick: () => handleTabChange("classes"),
          },
          {
            label: "Unassigned Students",
            value: unenrolledStudents.length,
            icon: AlertCircle,
            onClick: () => handleTabChange("students"),
          },
        ]}
      />

      {/* Tuition Due / Expiry Alerts */}
      <TuitionDueWidget
        students={students}
        onNavigateToStudents={() => handleTabChange("students")}
      />

      {/* Needs Attention Alert Bar */}
      {(pendingApplications > 0 || unenrolledStudents.length > 0 || pendingApprovalsCount > 0) && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Administrative Attention Required
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-medium text-amber-800">
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
                {pendingApprovalsCount > 0 && (
                  <span>
                    • <strong>{pendingApprovalsCount}</strong> pending authorization{pendingApprovalsCount > 1 ? "s" : ""} awaiting approval
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingApplications > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("applications")}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Review Applications
              </button>
            )}
            {pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("approvals")}
                className="px-3 py-1.5 bg-[#1a3a8f] hover:bg-[#132c6d] text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Review Approvals
              </button>
            )}
            {unenrolledStudents.length > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange("students")}
                className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Assign Students
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800">Quick actions</h4>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => handleTabChange("applications")}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <span>Review applications</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleAddStaff()}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <span>Add staff</span>
              <UserPlus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("classes")}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <span>Manage classes</span>
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("reports")}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <span>Open reports</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800">Staff snapshot</h4>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {
              users.filter(
                (user) => isStaffRole(user.role) && (user.status || "active") === "active"
              ).length
            }{" "}
            active staff · {instructors.filter((i) => (i.status || "active") === "active").length}{" "}
            active instructors
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {invites.filter((inv) => !inv.used).length} pending invitations ·{" "}
            {todos.filter((todo) => todo.isPinned || todo.type === "deadline").length} pinned tasks
          </p>
        </div>
      </div>

      {/* Available Batches & Capacity Overview */}
      <AvailableBatches
        classes={classes}
        instructors={instructors}
        users={users}
        canEdit={true}
        role="admin"
        isOverviewWidget={true}
        onNavigateToClasses={() => handleTabChange("classes")}
      />

      {/* Multi-Branch Isolation & Developer Tools Quick Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">Branch Data Isolation & Health Audit</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                Unified In Dev Tools
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Inspect partition health, backfill legacy branch records, and switch test accounts in one place.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("myliberty:open-dev-switcher", { detail: { tab: "audit" } })
            );
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Open Dev Tools & Audit</span>
        </button>
      </div>

      {/* Housekeeping & Free Tier Protection */}
      <LogRetentionCard />
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", component: overviewTab },
    {
      id: "applications",
      label: "Applications",
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
          userRole="admin"
          canViewParents={true}
        />
      ),
    },
    {
      id: "classes",
      label: "Classes",
      component: (
        <ClassManager
          classes={classes}
          users={users}
          instructors={instructors}
          unenrolledStudents={unenrolledStudents}
          role="admin"
          isAdmin={true}
        />
      ),
    },
    {
      id: "directory",
      label: "Staff",
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
      id: "events",
      label: "Events",
      component: <CorporateEventsPanel />,
    },
    {
      id: "approvals",
      label: "Approvals",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ErrorBoundary label="Approvals queue">
          <ApprovalInbox
            userRole="admin"
            title="Academy Maker-Checker Authorization Registry"
            subtitle="Dual-control operational authorization queue for sensitive transactions, discounts, cash discrepancy, and data overrides."
          />
        </ErrorBoundary>
      ),
    },
    {
      id: "terminals",
      label: "Kiosks",
      component: <KioskProvisioningPanel onClose={() => handleTabChange("overview")} />,
    },
    {
      id: "reports",
      label: "Reports",
      component: <ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={true} />,
    },
    {
      id: "misc",
      label: "Tasks",
      badge: todos.filter((t) => !t.completed).length || null,
      component: (
        <TasksPanel
          todos={todos}
          users={users}
          currentUser={auth.currentUser}
          userRole="admin"
          onAddTodo={handleAddTodo}
          onDeleteTodo={handleDeleteTodo}
          onToggleTodo={handleToggleTodo}
        />
      ),
    },
    { id: "aiAssistant", label: "AI Assistant", component: <AIAssistant /> },
    // 👈 Not a nav destination — only reached via "Edit"/"Add staff" above,
    // which is why it's marked hidden instead of getting a sidebar button.
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
    <div className="p-5 bg-[#f0f2f5] rounded-2xl min-h-[500px]">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        title="Admin Panel"
        primaryTabIds={["overview", "students", "classes", "approvals"]}
        extraSidebarContent={
          <KioskSidebarButton onClick={() => setKioskOpen(true)} label="Attendance Kiosk" />
        }
      />

      {/* Standalone Full-Screen Kiosk Station */}
      <KioskModal
        isOpen={kioskOpen}
        onClose={() => setKioskOpen(false)}
        title="Campus Attendance Scanner"
        studentsOnly={false}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
