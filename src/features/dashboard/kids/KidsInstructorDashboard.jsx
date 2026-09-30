import { useState, useMemo, useEffect } from "react";
import { useInstructorRoster } from "../useInstructorRoster";
import { AIAssistant, DashboardShell } from "../../shared";
import { KioskModal, KioskSidebarButton } from "../../attendance";
import { TeachingMaterial, ClassPhotoShare } from "../../classes";
import { ReportsDashboard } from "../../reports";
import { useStaffDirectives, StaffDirectivesWidget } from "../../staff";
import {
  InstructorOverview,
  InstructorClasses,
  InstructorProgress,
} from "../instructor";
import { matchesDivisionFilter, divisionOfProgram } from "../../../constants/divisions";
import { DEFAULT_BRANCH } from "../../../constants/branches";
import { getUrlAction, clearUrlAction } from "../../../utils/urlAction.js";

export default function KidsInstructorDashboard() {
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
    classes: rawClasses,
    students: rawStudents,
    instructorName,
    instructorBranch,
    loading,
    error,
  } = useInstructorRoster();

  // Kindergarten instructors only see kindergarten learners and classes
  const classes = useMemo(
    () =>
      rawClasses.filter((c) =>
        matchesDivisionFilter(c.division || divisionOfProgram(c.programId || c.program), "kindergarten")
      ),
    [rawClasses]
  );

  const students = useMemo(
    () =>
      rawStudents.filter((s) =>
        matchesDivisionFilter(s.division || divisionOfProgram(s.programId || s.program), "kindergarten")
      ),
    [rawStudents]
  );

  const {
    activeDirectives,
    completedDirectives,
    pendingCount: pendingDirectivesCount,
    loading: directivesLoading,
    handleToggle: handleToggleDirective,
  } = useStaffDirectives("instructor");

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
          allClasses={classes}
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
          roleLabel="Kindergarten Teachers"
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
          allClasses={classes}
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
    {
      id: "reports",
      label: "Reports",
      component: <ReportsDashboard division="kindergarten" userBranch={instructorBranch || DEFAULT_BRANCH} />,
    },
    { id: "ai", label: "AI Assistant", component: <AIAssistant /> },
  ];

  return (
    <div className="p-5 bg-[#f0f2f5] rounded-2xl min-h-[500px]">
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="Kids School — Teacher Portal"
        extraSidebarContent={
          <div className="space-y-2">
            <div className="px-2 pt-1">
              <span className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-cyan-200">
                Kindergarten Division
              </span>
            </div>
            <KioskSidebarButton onClick={() => setKioskOpen(true)} label="Attendance & Kiosk" />
          </div>
        }
      />

      <KioskModal
        isOpen={kioskOpen}
        onClose={() => setKioskOpen(false)}
        title="Kids School Attendance Scanner"
        studentsOnly={true}
        extraContent={<ClassPhotoShare />}
        initialScrollToExtra={isClassPhotoAction}
      />
    </div>
  );
}
