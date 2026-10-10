import { useState, useMemo, useEffect } from "react";
import { AIAssistant, DashboardShell, ApprovalInbox } from "../shared";
import { KioskModal, KioskSidebarButton, InstructorAttendanceView } from "../attendance";
import { ClassPhotoShare, TeachingMaterial } from "../classes";
import { ReportsDashboard } from "../reports";
import { StaffDirectivesWidget } from "../staff";
// Ordinary instructor surfaces reused as-is; `instructor/index.js` is left untouched
// so this dashboard's leader-only modules never enter the ordinary instructor bundle.
import { InstructorClasses, InstructorProgress } from "./instructor";
import { useInstructorLeaderWorkspace } from "./instructor/useInstructorLeaderWorkspace";
import { splitClassesByDay } from "./instructor/leaderUtils";
import {
  AcademicProgressLeader,
  AttendanceActivity,
  ClassesCoverage,
  InstructorTeam,
  LeaderOverview,
} from "./instructor/leader";
import { getUrlAction, clearUrlAction } from "../../utils/urlAction.js";

/**
 * InstructorLeaderDashboard
 *
 * Branch-scope academic leadership workspace for the Instructor Leader.
 *
 * Governance (Blueprint v3.3 §6.11, ratified G-003 / G-011):
 * - The Instructor Leader leads academic delivery within the assigned branch scope
 *   (curriculum standardization, academic quality control, teacher schedule
 *   assignments, teacher evaluations) across BOTH divisions.
 * - All branch Instructors report directly to the Instructor Leader; the operational
 *   line runs to the Vice Director, the strategic/pedagogical line to the Director.
 * - The four branch leadership roles are peers. This dashboard is NOT a Branch
 *   Manager surface: it holds no financial, HR, or general operational authority.
 *
 * Approvals canonicalization: this dashboard previously passed the legacy alias
 * "instructor_leader" to ApprovalInbox / usePendingApprovalsCount. Phase 1
 * canonicalizes it to "instructorleader" after verifying that
 * approvalsRepository.listenToPendingApprovals normalizes through roles.js and
 * queries both spellings identically (approverRole in
 * [instructorleader, instructor_leader, instructorleader]).
 */
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
  const [attendanceScope, setAttendanceScope] = useState("branch");

  const {
    uid,
    classes,
    students,
    instructorName,
    effectiveBranch,
    loading,
    error,
    allClasses,
    combinedAllClasses,
    activeDirectives,
    completedDirectives,
    pendingDirectivesCount,
    directivesLoading,
    handleToggleDirective,
    todayDate,
    todayDayCode,
    branchInstructors,
    branchProgressReports,
    teamLoading,
    teamError,
    reportsLoading,
    reportsError,
    coverage,
    divisionBreakdown,
    studentsServed,
    instructorWorkload,
    progressCoverage,
    attentionItems,
    levelMismatches,
    pendingApprovalsCount,
    attendance,
    attendanceSummary,
    loadAttendance,
  } = useInstructorLeaderWorkspace({ role, branch });

  const { scheduled: todayClasses, unscheduled: unscheduledClasses } = useMemo(
    () => splitClassesByDay(allClasses, todayDayCode),
    [allClasses, todayDayCode]
  );

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      component: (
        <LeaderOverview
          instructorName={instructorName}
          branchLabel={effectiveBranch}
          todayDate={todayDate}
          divisionBreakdown={divisionBreakdown}
          coverage={coverage}
          studentsServed={studentsServed}
          branchInstructors={branchInstructors}
          todayClasses={todayClasses}
          unscheduledToday={unscheduledClasses.length}
          attentionItems={attentionItems}
          progressCoverage={progressCoverage}
          progressError={reportsError}
          attendanceSummary={attendanceSummary}
          attendanceLoaded={attendance.rows.length > 0}
          pendingApprovalsCount={pendingApprovalsCount}
          onNavigate={setActiveTab}
        />
      ),
    },
    {
      id: "team",
      label: "Instructor Team",
      badge: branchInstructors.length || null,
      component: (
        <InstructorTeam
          workload={instructorWorkload}
          progressCoverage={progressCoverage}
          progressError={reportsError}
          teamLoading={teamLoading}
          teamError={teamError}
          currentUid={uid}
          onNavigate={setActiveTab}
        />
      ),
    },
    {
      id: "coverage",
      label: "Classes & Coverage",
      badge: coverage.missingInstructor > 0 ? coverage.missingInstructor : null,
      component: (
        <ClassesCoverage
          classes={allClasses}
          branchInstructors={branchInstructors}
          levelMismatches={levelMismatches}
          loading={loading}
          error={error}
          onNavigate={setActiveTab}
        />
      ),
    },
    {
      id: "progress",
      label: "Academic Progress",
      component: (
        <AcademicProgressLeader
          reports={branchProgressReports}
          progressCoverage={progressCoverage}
          loading={reportsLoading}
          error={reportsError}
          branchInstructors={branchInstructors}
          onNavigate={setActiveTab}
          ownTeachingSlot={
            <InstructorProgress
              uid={uid}
              classes={classes}
              students={students}
              loading={loading}
              error={error}
            />
          }
        />
      ),
    },
    {
      id: "attendance",
      label: "Attendance",
      component: (
        <div className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => setAttendanceScope("branch")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                attendanceScope === "branch"
                  ? "bg-white text-[#1a3a8f] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Branch Monitoring
            </button>
            <button
              type="button"
              onClick={() => setAttendanceScope("mine")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                attendanceScope === "mine"
                  ? "bg-white text-[#1a3a8f] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Classes
            </button>
          </div>

          {attendanceScope === "branch" ? (
            <AttendanceActivity
              classes={allClasses}
              todayDate={todayDate}
              attendance={attendance}
              attendanceSummary={attendanceSummary}
              loadAttendance={loadAttendance}
            />
          ) : (
            <InstructorAttendanceView
              classes={classes}
              students={students}
              uid={uid}
              instructorName={instructorName}
              instructorBranch={effectiveBranch}
            />
          )}
        </div>
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
    { id: "materials", label: "Lesson Materials", component: <TeachingMaterial /> },
    { id: "reports", label: "Reports", component: <ReportsDashboard userBranch={effectiveBranch} /> },
    {
      id: "approvals",
      label: "Academic Approvals",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      component: (
        <ApprovalInbox
          userRole="instructorleader"
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
        title="Instructor Leader Portal"
        primaryTabIds={["overview", "team", "coverage", "progress", "attendance", "approvals"]}
        extraSidebarContent={
          <div className="px-2 pb-1 space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-indigo-200">
              Branch Academic Leadership
            </span>
            <KioskSidebarButton onClick={() => setKioskOpen(true)} label="Attendance & Kiosk" />
          </div>
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
