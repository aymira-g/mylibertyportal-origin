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
  Building2,
  X,
  Compass,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
import { StudentApplications, UserForm, StudentRoster, BadgeModal } from "../students";
import { CorporateEventsPanel } from "../attendance";
import { ClassManager, AvailableBatches } from "../classes";
import { StaffDirectory, InvitesPanel, TasksPanel } from "../staff";
import { TuitionDueWidget } from "./frontoffice";
import { BRANCHES, branchToId, matchesBranchFilter } from "../../constants/branches";

/**
 * ExecutiveDashboard: Dedicated high-level leadership dashboard for Director and Vice Director roles.
 * Satisfies Authoritative Blueprint §5, §6.1, §6.2, §10, §14, §15, §16:
 * - Multi-branch province-wide strategic oversight (the 4 physical campuses)
 * - Executive branch drill-down scope selector
 * - Dual-control Maker-Checker authorizations & separation of duties
 * - Academic capacity, admissions, and executive reporting
 */
export default function ExecutiveDashboard({ role = "director" }) {
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

  const pendingApprovalsCount = usePendingApprovalsCount(role);

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

  const roleTitle = role === "vice_director" ? "Vice Director" : "Executive Director";

  const overviewTab = (
    <div className="space-y-6 w-full">
      {/* Executive Leadership Welcome Banner */}
      <WelcomeBanner
        portalLabel="Executive Leadership Portal"
        roleLabel={roleTitle}
        fallbackName="Director"
        subtitle="Province-wide strategic analytics, multi-branch performance oversight, and dual-control authorizations."
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
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a3a8f] flex items-center justify-center font-bold shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Executive Branch Scope: {selectedBranch === "all" ? "Province-Wide (All Branches)" : selectedBranch}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Select a branch to focus rosters, cohorts, and tuition alerts, or view province-wide.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedBranch("all")}
            className={`min-h-11 px-3 py-1.5 rounded-xl transition cursor-pointer text-xs font-bold ${
              selectedBranch === "all"
                ? "bg-[#1a3a8f] text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            All Branches
          </button>
          {BRANCHES.map((bName) => (
            <button
              key={bName}
              type="button"
              onClick={() => setSelectedBranch(bName)}
              className={`min-h-11 px-3 py-1.5 rounded-xl transition cursor-pointer text-xs font-bold ${
                selectedBranch === bName
                  ? "bg-[#1a3a8f] text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              {bName}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Branch Strategic Snapshot Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1a3a8f]" />
              Multi-Branch Strategic Performance (4 Campuses)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Click any campus card below to filter the dashboard to that specific branch.
            </p>
          </div>
          {selectedBranch !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedBranch("all")}
              className="text-xs font-bold text-[#1a3a8f] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <span>Reset to All Branches</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {branchStats.map((branch) => {
            const isSelected = selectedBranch === branch.branchName;
            return (
              <button
                key={branch.branchId}
                type="button"
                onClick={() => setSelectedBranch(isSelected ? "all" : branch.branchName)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-blue-50/70 border-[#1a3a8f] ring-2 ring-[#1a3a8f]/20 shadow-xs"
                    : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 tracking-tight">
                      {branch.branchName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? "bg-[#1a3a8f] text-white" : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {isSelected ? "Active Filter" : "Drill Down"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Learners
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {branch.activeStudents}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Cohorts
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {branch.activeClasses}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Capacity Utilization</span>
                    <span className="font-bold text-slate-700">{branch.capacityPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        branch.capacityPct > 90
                          ? "bg-amber-500"
                          : branch.capacityPct > 70
                          ? "bg-emerald-500"
                          : "bg-[#1a3a8f]"
                      }`}
                      style={{ width: `${Math.min(100, branch.capacityPct)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{branch.branchStaff} Staff</span>
                    {branch.branchApps > 0 && (
                      <span className="text-amber-700 font-bold">{branch.branchApps} New Apps</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
                    • <strong>{pendingApprovalsCount}</strong> pending authorization
                    {pendingApprovalsCount > 1 ? "s" : ""} awaiting executive review
                  </span>
                )}
                {pendingApplications > 0 && (
                  <span>
                    • <strong>{pendingApplications}</strong> pending application
                    {pendingApplications > 1 ? "s" : ""} awaiting review
                  </span>
                )}
                {unenrolledStudents.length > 0 && (
                  <span>
                    • <strong>{unenrolledStudents.length}</strong> active student
                    {unenrolledStudents.length > 1 ? "s" : ""} unassigned to a class
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
          <h4 className="font-bold text-slate-800 text-sm">Executive Command</h4>
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
              <h4 className="font-bold text-slate-800 text-sm">Strategic Governance Summary</h4>
              <button
                type="button"
                onClick={() => handleTabChange("reports")}
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

      {/* Academy Operations & Capacity Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#1a3a8f]" />
              Academy Operations &amp; Capacity
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {selectedBranch === "all"
                ? "Province-wide tuition renewal alerts, batch availability, and cohort capacity."
                : `Focused view for ${selectedBranch}: tuition renewal alerts and cohort capacity.`}
            </p>
          </div>
          {selectedBranch !== "all" && (
            <span className="text-xs font-bold bg-blue-50 text-[#1a3a8f] px-2.5 py-1 rounded-lg border border-blue-200">
              Scoping: {selectedBranch}
            </span>
          )}
        </div>

        {/* Tuition Due / Expiry Alerts */}
        <TuitionDueWidget
          students={filteredStudents}
          onNavigateToStudents={() => handleTabChange("students")}
        />

        {/* Available Batches & Capacity Overview */}
        <AvailableBatches
          classes={filteredClasses}
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
            title="Executive Dual-Control Authorization Registry"
            subtitle="Dual-control executive sign-off queue for staff role elevations, branch manager exceptions, large discounts, and financial discrepancies."
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
          userRole={role}
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
        title={`${roleTitle} Strategic Command`}
        primaryTabIds={["overview", "approvals", "students", "classes", "reports"]}
      />

      {/* ID Badge Modal */}
      <BadgeModal person={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}
