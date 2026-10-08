import { useState, useMemo, useEffect } from "react";
import { AIAssistant, DashboardShell, ApprovalInbox, usePendingApprovalsCount } from "../shared";
import { KioskModal, KioskSidebarButton, InstructorAttendanceView } from "../attendance";
import { ClassPhotoShare, TeachingMaterial } from "../classes";
import { ReportsDashboard } from "../reports";
import { StaffDirectivesWidget } from "../staff";
import {
  InstructorOverview,
  InstructorClasses,
  InstructorProgress,
  useInstructorWorkspace,
} from "./instructor";
import { getUrlAction, clearUrlAction } from "../../utils/urlAction.js";

export default function InstructorLeaderDashboard({ role = "", branch = "" }) {
  const [activeTab, setActiveTab] = useState(() => {
    const action = getUrlAction();
    if (action === "attendance") return "attendance";
    return "overview";
  });
  const isClassPhotoAction = useMemo(() => {
    return getUrlAction() === "class-photo";
  }, []);
  const [kioskOpen, setKioskOpen] = useState(() => {
    const action = getUrlAction();
    return action === "kiosk" || action === "class-photo";
  });

  useEffect(() => {
    clearUrlAction();
  }, []);

  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  const {
    uid,
    classes,
    students,
    instructorName,
    effectiveBranch,
    loading,
    error,
    combinedAllClasses,
    activeDirectives,
    completedDirectives,
    pendingDirectivesCount,
    directivesLoading,
    handleToggleDirective,
  } = useInstructorWorkspace({ role, branch });

  const pendingApprovalsCount = usePendingApprovalsCount(
    "instructor_leader",
    effectiveBranch
  );

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      component: (
        <InstructorOverview
          classes={classes}
          students={students}
          instructorName={instructorName}
          onNavigate={setActiveTab}
          onOpenKiosk={() => setKioskOpen(true)}
          onSelectClass={(classId) => setSelectedClassFilter(classId)}
          allClasses={combinedAllClasses}
        />
      ),
    },
    {
      id: "attendance",
      label: "Attendance",
      component: (
        <InstructorAttendanceView
          classes={classes}
          students={students}
          uid={uid}
          instructorName={instructorName}
          instructorBranch={effectiveBranch}
        />
      ),
    },
    {
      id: "directives",
      label: "Directives",
      badge: pendingDirectivesCount || null,
      component: (
        <StaffDirectivesWidget
          activeDirectives={activeDirectives}
          completedDirectives={completedDirectives}
          loading={directivesLoading}
          onToggle={handleToggleDirective}
          roleLabel="Faculty & Instructors"
        />
      ),
    },
    {
      id: "classes",
      label: "My Classes",
      component: (
        <InstructorClasses
          classes={classes}
          students={students}
          instructorName={instructorName}
          loading={loading}
          error={error}
          selectedClassFilter={selectedClassFilter}
          setSelectedClassFilter={setSelectedClassFilter}
          allClasses={combinedAllClasses}
        />
      ),
    },
    {
      id: "progress",
      label: "Student Progress",
      component: (
        <InstructorProgress
          uid={uid}
          classes={classes}
          students={students}
          loading={loading}
          error={error}
        />
      ),
    },
    { id: "materials", label: "Lesson Materials", component: <TeachingMaterial /> },
    { id: "reports", label: "Reports", component: <ReportsDashboard userBranch={effectiveBranch} /> },
    {
      id: "approvals",
      label: "Academic Approvals",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ApprovalInbox
          userRole="instructor_leader"
          branchId={effectiveBranch}
          title="Academic & Faculty Approval Registry"
          subtitle="Dual-control authorization queue for placement level overrides and substitute instructor assignments."
        />
      ),
    },
    { id: "ai", label: "AI Assistant", component: <AIAssistant /> },
  ];

  return (
    <div className="p-5 bg-[#f0f2f5] rounded-2xl min-h-[500px]">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="Instructor Portal"
        primaryTabIds={["overview", "attendance", "classes", "progress"]}
        extraSidebarContent={
          <KioskSidebarButton onClick={() => setKioskOpen(true)} label="Attendance & Kiosk" />
        }
      />

      {/* Standalone Full-Screen Kiosk Station with ClassPhotoShare */}
      <KioskModal
        isOpen={kioskOpen}
        onClose={() => setKioskOpen(false)}
        title="Student Attendance Scanner"
        studentsOnly={true}
        extraContent={<ClassPhotoShare />}
        initialScrollToExtra={isClassPhotoAction}
      />
    </div>
  );
}
