import { useState, useMemo, useEffect } from "react";
import { useInstructorRoster } from "./useInstructorRoster";
import { AIAssistant, DashboardShell, ApprovalInbox } from "../shared";
import { KioskModal, KioskSidebarButton, InstructorAttendanceView } from "../attendance";
import { ClassPhotoShare, TeachingMaterial } from "../classes";
import { ReportsDashboard } from "../reports";
import { useStaffDirectives, StaffDirectivesWidget } from "../staff";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  InstructorOverview,
  InstructorClasses,
  InstructorProgress,
  uniqueClasses,
} from "./instructor";
import { branchToId } from "../../constants/branches.js";
import { getUrlAction, clearUrlAction } from "../../utils/urlAction.js";

export default function InstructorDashboard({ role = "", branch = "" }) {
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
    return action === "kiosk" || action === "class-photo" || action === "attendance";
  });

  useEffect(() => {
    clearUrlAction();
  }, []);

  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  const {
    uid,
    classes: rawClasses,
    students,
    instructorName,
    instructorRole,
    instructorBranch,
    loading,
    error,
  } = useInstructorRoster();

  const effectiveRole = (role || instructorRole || "").toLowerCase().trim();
  const effectiveBranch = branch || instructorBranch || "kota_gorontalo";
  const isLeader =
    effectiveRole === "instructorleader" ||
    effectiveRole === "instructor_leader" ||
    effectiveRole === "head_instructor";
  const classes = useMemo(() => uniqueClasses(rawClasses), [rawClasses]);
  const [allClasses, setAllClasses] = useState([]);

  // Merge branch classes with any assigned primary/substitute classes (guarantees cross-branch classes are visible)
  const combinedAllClasses = useMemo(() => {
    const map = new Map();
    allClasses.forEach((c) => map.set(c.id, c));
    classes.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [allClasses, classes]);

  const {
    activeDirectives,
    completedDirectives,
    pendingCount: pendingDirectivesCount,
    loading: directivesLoading,
    handleToggle: handleToggleDirective,
  } = useStaffDirectives("instructor");

  useEffect(() => {
    const branchId = branchToId(effectiveBranch);
    const unsub = onSnapshot(
      query(
        collection(db, "classes"),
        where("branchId", "==", branchId),
        where("status", "==", "active")
      ),
      (snap) => {
        setAllClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [effectiveBranch]);

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
    { id: "reports", label: "Reports", component: <ReportsDashboard /> },
    ...(isLeader
      ? [
          {
            id: "approvals",
            label: "Academic Approvals",
            component: (
              <ApprovalInbox
                userRole="instructor_leader"
                branchId={effectiveBranch}
                title="Academic & Faculty Approval Registry"
                subtitle="Dual-control authorization queue for placement level overrides and substitute instructor assignments."
              />
            ),
          },
        ]
      : []),
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
