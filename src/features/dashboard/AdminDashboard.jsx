import { useState, useMemo } from "react";
import { auth } from "../../firebase";
import { useDashboardData } from "./useDashboardData";
import {
  DashboardShell,
  WelcomeBanner,
  isStaffRole,
} from "../shared";
import {
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Users,
  ScanLine,
  BarChart3,
  Mail,
  CheckSquare,
  Database,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
import { UserForm, BadgeModal } from "../students";
import { KioskProvisioningPanel } from "../attendance";
import { StaffDirectory, InvitesPanel, TasksPanel } from "../staff";
import LogRetentionCard from "./LogRetentionCard";
import BranchHealthAuditCard from "./BranchHealthAuditCard";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const {
    users,
    classes,
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
    handleDelete,
    handleAddTodo,
    handleDeleteTodo,
    handleToggleTodo,
    handleCreateInvite,
    handleDeleteInvite,
    instructors,
  } = useDashboardData({ setActiveTab: handleTabChange });

  const activeStaffCount = useMemo(() => {
    return users.filter(
      (user) => isStaffRole(user.role) && (user.status || "active") === "active"
    ).length;
  }, [users]);

  const pendingInvitesCount = useMemo(() => {
    return invites.filter((inv) => !inv.used).length;
  }, [invites]);

  const pinnedTodosCount = useMemo(() => {
    return todos.filter((todo) => todo.isPinned || todo.type === "deadline").length;
  }, [todos]);

  const overviewTab = (
    <div className="space-y-6 w-full">
      {/* Technical System Administrator Welcome Banner */}
      <WelcomeBanner
        portalLabel="Technical Administration Portal"
        roleLabel="System Administrator"
        fallbackName="System Administrator"
        subtitle="Technical operating environment, account provisioning, terminal pairing, multi-branch data isolation diagnostics, and database health."
        stats={[
          {
            label: "Active Staff",
            value: activeStaffCount,
            icon: Users,
            onClick: () => handleTabChange("directory"),
          },
          {
            label: "Pending Invites",
            value: pendingInvitesCount,
            icon: Mail,
            onClick: () => handleTabChange("invites"),
          },
          {
            label: "Maintenance Tasks",
            value: todos.filter((t) => !t.completed).length,
            icon: CheckSquare,
            onClick: () => handleTabChange("misc"),
          },
          {
            label: "Database Tier",
            value: "Spark (Free)",
            icon: Database,
            onClick: () => {},
          },
        ]}
      />

      {/* Quick Launchers & Technical Operations Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-sm">System Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => handleAddStaff()}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Add Staff</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("invites")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#1a3a8f]" />
                <span>Invite Staff</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("terminals")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-indigo-600" />
                <span>Kiosk Setup</span>
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
              <h4 className="font-bold text-slate-800 text-sm">Account &amp; Maintenance Snapshot</h4>
              <button
                type="button"
                onClick={() => handleTabChange("directory")}
                className="text-xs text-[#1a3a8f] font-bold hover:underline"
              >
                View Directory →
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {activeStaffCount} active staff accounts · {instructors.filter((i) => (i.status || "active") === "active").length} active instructors
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {pendingInvitesCount} pending onboarding invitations · {pinnedTodosCount} pinned maintenance tasks
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Terminal Security: <strong>Active</strong></span>
            <button
              type="button"
              onClick={() => handleTabChange("invites")}
              className="text-[#1a3a8f] font-bold hover:underline"
            >
              Invite Staff +
            </button>
          </div>
        </div>
      </div>

      {/* System Health & Free-Tier Protection Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1a3a8f]" />
              System Health &amp; Free-Tier Governance
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Continuous verification of multi-branch data isolation and automated log retention to keep Firestore within zero-budget Spark limits.
            </p>
          </div>
        </div>

        {/* Multi-Branch Isolation Health Audit Card */}
        <BranchHealthAuditCard />

        {/* Housekeeping & Free Tier Protection */}
        <LogRetentionCard />
      </div>
    </div>
  );

  const tabs = [
    // Main
    { id: "overview", label: "Overview", category: "Main", component: overviewTab },

    // Operations & Access Control (Technical Provisioning)
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
      badge: pendingInvitesCount > 0 ? pendingInvitesCount : null,
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
      label: "Tasks",
      category: "Operations",
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

    // System Administration & Hardware
    {
      id: "terminals",
      label: "Kiosks",
      category: "System",
      component: <KioskProvisioningPanel onClose={() => handleTabChange("overview")} />,
    },
    {
      id: "reports",
      label: "Reports",
      category: "System",
      component: <ReportsDashboard isAdminView={true} isFrontOffice={false} canEdit={false} />,
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
        title="Admin Panel"
        primaryTabIds={["overview", "directory", "invites", "terminals"]}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
