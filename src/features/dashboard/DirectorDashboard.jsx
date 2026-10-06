import { useState, useMemo } from "react";
import { useDashboardData } from "./useDashboardData";
import {
  DashboardShell,
  WelcomeBanner,
  ApprovalInbox,
  isStaffRole,
  ErrorBoundary,
  usePendingApprovalsCount,
} from "../shared";
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
  Target,
  ShieldAlert,
  Building2,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { ReportsDashboard } from "../reports";
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
  ExecutiveAnalyticsPanel,
  BranchPerformancePanel,
} from "./executive";

/**
 * DirectorDashboard: Strategic Executive Cockpit for the Executive Director.
 * Authoritative Blueprint §6.1 & Section 1-15:
 * - Strategic direction, institutional health synthesis, and province-wide performance
 * - Dedicated signature modules: Strategic Plan, Executive Analytics, Branch Performance, Decision Center, Strategic Risks, Reports
 * - Dual-control Maker-Checker executive authorizations & separation of duties
 * - Clean executive navigation free of routine front-desk CRUD operations
 */
export default function DirectorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [reportsSubTab, setReportsSubTab] = useState("overview");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleNavigateToReports = (targetSubTab = "overview") => {
    setReportsSubTab(targetSubTab);
    setActiveTab("reports");
  };

  const {
    users,
    classes,
    applications,
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

  const activeFacultyCount = useMemo(() => {
    return instructors.filter((i) => (i.status || "active") === "active").length;
  }, [instructors]);

  const overallRatio = useMemo(() => {
    return activeFacultyCount > 0
      ? (activeStudentsCount / activeFacultyCount).toFixed(1)
      : "0";
  }, [activeStudentsCount, activeFacultyCount]);

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

  // ── 1. Strategic Executive Cockpit Landing View ──
  const overviewTab = (
    <div className="space-y-6 w-full">
      {/* Strategic Leadership Welcome Banner */}
      <WelcomeBanner
        portalLabel="Strategic Executive Cockpit"
        roleLabel="Executive Director"
        fallbackName="Director"
        subtitle="Province-wide strategic leadership, institutional health synthesis, major risk exceptions, and dual-control executive governance."
        stats={[
          {
            label: "Strategic Health",
            value: "Optimal",
            icon: Target,
            onClick: () => handleTabChange("strategic"),
          },
          {
            label: "Pending Decisions",
            value: pendingApprovalsCount,
            icon: ShieldCheck,
            onClick: () => handleTabChange("decisions"),
          },
          {
            label: selectedBranch === "all" ? "Province Learners" : "Branch Learners",
            value: activeStudentsCount,
            icon: GraduationCap,
            onClick: () => handleTabChange("analytics"),
          },
          {
            label: "Faculty Ratio",
            value: `${overallRatio} : 1`,
            icon: Users,
            onClick: () => handleTabChange("analytics"),
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
        subtitle="Click any campus card below to inspect branch performance metrics."
      />

      {/* High-Priority Attention Alert Bar */}
      <ExecutiveAlertBanner
        pendingApprovalsCount={pendingApprovalsCount}
        pendingApplications={pendingApplications}
        unenrolledStudentsCount={unenrolledStudents.length}
        riskAlertCount={0}
        onNavigateToApprovals={() => handleTabChange("decisions")}
        onNavigateToApplications={() => handleTabChange("analytics")}
        onNavigateToStudents={() => handleTabChange("analytics")}
        onNavigateToRisk={() => handleTabChange("risks")}
        title="Executive Strategic Action Required"
      />

      {/* Strategic Command Launchers & Governance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-sm">Strategic Command &amp; Oversight</h4>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => handleTabChange("strategic")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#1a3a8f]" />
                <span>Strategic Plan</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("analytics")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Analytics</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("branches")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Branches</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleTabChange("decisions")}
              className="p-3 min-h-12 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Decisions ({pendingApprovalsCount})</span>
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
                className="text-xs text-[#1a3a8f] font-bold hover:underline cursor-pointer"
              >
                Executive Reports →
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 font-medium">
              {students.filter((s) => (s.status || "active") === "active").length} total active learners registered across Gorontalo Province
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {classes.length} active cohorts · {activeFacultyCount} faculty instructors · {activeStaffCount} total personnel
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Admissions: <strong>{pendingApplications}</strong> application{pendingApplications !== 1 ? "s" : ""} in intake pipeline
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Governance: <strong>Dual-Control Enforced</strong></span>
            <button
              type="button"
              onClick={() => handleTabChange("risks")}
              className="text-rose-600 font-bold hover:underline cursor-pointer"
            >
              Strategic Risks &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Academic Division Balance Breakdown (Course Academy vs Kids School) */}
      <DivisionBalanceCard
        students={students}
        selectedBranch={selectedBranch}
      />

      {/* High-Level Tuition Collection & Financial Health Indicator */}
      <ExecutiveTuitionHealthCard
        students={filteredStudents}
        onNavigateToStudents={() => handleTabChange("analytics")}
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
        onNavigateToStudents={() => handleTabChange("analytics")}
        onNavigateToClasses={() => handleTabChange("branches")}
      />
    </div>
  );

  // ── Target Navigation Structure (Section 3 of Blueprint Directive) ──
  const tabs = [
    // 1. Dashboard (Strategic Overview Cockpit)
    {
      id: "overview",
      label: "Dashboard",
      category: "Main",
      icon: LayoutDashboard,
      component: overviewTab,
    },

    // 2. Strategic Plan (Signature Director Module)
    {
      id: "strategic",
      label: "Strategic Plan",
      category: "Strategy",
      icon: Target,
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

    // 3. Executive Analytics (Synthesis Layer)
    {
      id: "analytics",
      label: "Executive Analytics",
      category: "Strategy",
      icon: TrendingUp,
      component: (
        <ErrorBoundary label="Executive analytics panel">
          <ExecutiveAnalyticsPanel
            students={students}
            classes={classes}
            instructors={instructors}
            users={users}
            selectedBranch={selectedBranch}
            onNavigateToReports={handleNavigateToReports}
            onNavigateToStrategic={() => handleTabChange("strategic")}
            onNavigateToBranches={() => handleTabChange("branches")}
          />
        </ErrorBoundary>
      ),
    },

    // 4. Branch Performance (Multi-Campus Oversight)
    {
      id: "branches",
      label: "Branch Performance",
      category: "Performance",
      icon: Building2,
      component: (
        <ErrorBoundary label="Branch performance panel">
          <BranchPerformancePanel
            students={students}
            classes={classes}
            users={users}
            instructors={instructors}
            applications={applications}
            selectedBranch={selectedBranch}
            onSelectBranch={setSelectedBranch}
            onNavigateToDecisions={() => handleTabChange("decisions")}
            onNavigateToRisks={() => handleTabChange("risks")}
          />
        </ErrorBoundary>
      ),
    },

    // 5. Decision Center (Dual-Control Executive Decisions)
    {
      id: "decisions",
      label: "Decision Center",
      category: "Governance",
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1a3a8f]" />
                  <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                    Executive Decision Center &amp; Dual-Control Registry
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Authorized Maker-Checker executive authorizations: Staff Role Elevations, Executive Discounts &amp; Refunds, and Strategic Policy Exceptions.
                </p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-[#1a3a8f] font-bold text-xs rounded-xl border border-indigo-100 self-start sm:self-auto">
                Executive Governance Tier
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Under Authoritative Blueprint v3.1 §17 &amp; §18, high-impact business decisions require independent executive sign-off. Requesters cannot approve their own submissions.
            </p>
          </div>
          <ErrorBoundary label="Director Decision Center">
            <ApprovalInbox
              userRole="director"
              title="Director Executive Decision Registry"
              subtitle="Dual-control executive sign-off queue for staff role elevations, strategic governance exceptions, large discounts, and financial variances."
            />
          </ErrorBoundary>
        </div>
      ),
    },

    // 6. Strategic Risks (High-Impact Risk & Exception Center)
    {
      id: "risks",
      label: "Strategic Risks",
      category: "Governance",
      icon: ShieldAlert,
      component: (
        <ErrorBoundary label="Risk and exceptions panel">
          <RiskExceptionPanel
            pendingApprovalsCount={pendingApprovalsCount}
            unenrolledStudentsCount={unenrolledStudents.length}
            onNavigateToApprovals={() => handleTabChange("decisions")}
            onNavigateToStudents={() => handleTabChange("analytics")}
          />
        </ErrorBoundary>
      ),
    },

    // 7. Reports (Executive Reporting Synthesis)
    {
      id: "reports",
      label: "Reports",
      category: "Governance",
      icon: BarChart3,
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
  ];

  return (
    <div className="w-full">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        title="Executive Director Strategic Cockpit"
        primaryTabIds={["overview", "strategic", "analytics", "branches", "decisions", "risks", "reports"]}
      />
    </div>
  );
}
