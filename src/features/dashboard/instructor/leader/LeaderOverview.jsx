import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, LevelBadge, WelcomeBanner } from "../../../shared";
import {
  buildInstructorNameMap,
  formatClassSchedule,
  noopNavigate,
  resolveClassDivision,
  resolveInstructorLabel,
} from "../leaderUtils";
import { DivisionBadge, HealthRow, LeaderEmptyState, SeverityTag } from "./leaderUi";
import { getBatchAvailability } from "../../../classes/batchAvailability";

/**
 * LeaderOverview
 *
 * Exception-first landing view for the Instructor Leader: what is happening
 * today, what needs attention, and how healthy branch academic delivery is.
 *
 * Read-only. Every number is derived from data the leader is authorized to read
 * (branch classes, branch instructor profiles, branch progress reports, branch
 * attendance). See the Phase 1 report for the documented read-authority gaps.
 */
export default function LeaderOverview({
  instructorName = "",
  branchLabel = "",
  todayDate = "",
  divisionBreakdown = { total: 0, courses: 0, kindergarten: 0 },
  coverage = null,
  studentsServed = 0,
  branchInstructors = [],
  todayClasses = [],
  unscheduledToday = 0,
  attentionItems = [],
  progressCoverage = null,
  progressError = "",
  attendanceSummary = null,
  attendanceLoaded = false,
  pendingApprovalsCount = 0,
  onNavigate = noopNavigate,
}) {
  const nameMap = useMemo(() => buildInstructorNameMap(branchInstructors), [branchInstructors]);

  const coverageState = (cls) => {
    if (!cls.instructorId) {
      return { label: "Needs coverage", className: "text-rose-700 bg-rose-50 border-rose-200" };
    }
    if (cls.substituteInstructorId) {
      return { label: "Substitute", className: "text-amber-800 bg-amber-50 border-amber-200" };
    }
    return { label: "Covered", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  return (
    <div className="space-y-6 w-full">
      <WelcomeBanner
        portalLabel="Academic Leadership"
        roleLabel="Instructor Leader"
        userName={instructorName}
        fallbackName="Instructor Leader"
        subtitle={
          branchLabel
            ? `Branch-scope academic delivery oversight across Course Academy and Kids School — ${branchLabel}.`
            : "Branch-scope academic delivery oversight across Course Academy and Kids School."
        }
        stats={[
          {
            label: "Classes Today",
            value: coverage ? coverage.scheduledToday : divisionBreakdown.total,
            icon: BookOpen,
            onClick: () => onNavigate("coverage"),
          },
          {
            label: "Teaching Team",
            value: branchInstructors.length,
            icon: Users,
            onClick: () => onNavigate("team"),
          },
          {
            label: "Students Served",
            value: studentsServed,
            icon: GraduationCap,
            onClick: () => onNavigate("coverage"),
          },
          {
            label: "Pending Approvals",
            value: pendingApprovalsCount,
            icon: ShieldCheck,
            onClick: () => onNavigate("approvals"),
          },
        ]}
      />

      {/* ── Needs Attention ── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Needs Attention
            </h4>
          </div>
          {attentionItems.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {attentionItems.length} item{attentionItems.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <LeaderEmptyState
            icon={CheckCircle2}
            title="All clear"
            message="No coverage, capacity, progress-report or approval exceptions are currently outstanding for this branch."
          />
        ) : (
          <ul className="space-y-2">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.targetTab)}
                  className="w-full flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm font-black text-slate-900 tabular-nums shrink-0">
                      {item.count}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <SeverityTag severity={item.severity} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── Today's Classes ── */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1a3a8f]" />
              <h4 className="font-extrabold text-slate-800 text-sm">Today&apos;s Classes</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {todayDate || "Today"} · both divisions
              {unscheduledToday > 0 && ` · ${unscheduledToday} class(es) have no parseable schedule`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <DivisionBadge division="courses" />
            <DivisionBadge division="kindergarten" />
          </div>
        </div>

        {todayClasses.length === 0 ? (
          <LeaderEmptyState
            icon={Calendar}
            title="No classes scheduled today"
            message="No active branch class is scheduled to run on today's weekday. Check Classes & Coverage if a batch looks misplaced."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {todayClasses.map((cls) => {
              const state = coverageState(cls);
              const availability = getBatchAvailability(cls);
              return (
                <div
                  key={cls.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-[#1a3a8f] tabular-nums">
                        {cls.startTime || "--:--"}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {cls.className || "Unnamed class"}
                      </span>
                      <DivisionBadge division={resolveClassDivision(cls)} />
                      {cls.classLevel && <LevelBadge level={cls.classLevel} />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        {resolveInstructorLabel(cls, nameMap)}
                      </span>
                      {cls.substituteInstructorId && (
                        <span className="text-amber-700 font-bold">
                          Substitute:{" "}
                          {nameMap[cls.substituteInstructorId] ||
                            cls.substituteInstructorName ||
                            "Assigned"}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {cls.classRoom || "Main Campus"}
                      </span>
                      <span>{formatClassSchedule(cls)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <span className="text-xs font-bold text-slate-600 tabular-nums">
                      {availability.studentCount}/{availability.capacity}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${state.className}`}
                    >
                      {state.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Academic Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-[#1a3a8f]" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Academic Health
            </h4>
          </div>

          {coverage ? (
            <div>
              <HealthRow
                label="Classes scheduled today"
                hint={`${divisionBreakdown.courses} Courses · ${divisionBreakdown.kindergarten} Kindergarten`}
                value={coverage.scheduledToday}
              />
              <HealthRow
                label="Instructor coverage"
                hint={`${coverage.withInstructor} of ${coverage.liveClasses} active classes staffed`}
                value={`${Math.round(coverage.coverageRate * 100)}%`}
                tone={coverage.missingInstructor > 0 ? "text-rose-700" : "text-emerald-700"}
              />
              <HealthRow
                label="Classes needing coverage"
                value={coverage.missingInstructor}
                tone={coverage.missingInstructor > 0 ? "text-rose-700" : "text-slate-900"}
              />
              <HealthRow
                label="Substitute assignments"
                value={coverage.substituting}
                tone={coverage.substituting > 0 ? "text-amber-700" : "text-slate-900"}
              />
              <HealthRow
                label="Instructor double-bookings"
                value={coverage.teacherConflicts}
                tone={coverage.teacherConflicts > 0 ? "text-rose-700" : "text-slate-900"}
              />
              <HealthRow
                label="Room double-bookings"
                value={coverage.roomConflicts}
                tone={coverage.roomConflicts > 0 ? "text-amber-700" : "text-slate-900"}
              />
              <HealthRow
                label="Classes over capacity"
                value={coverage.overCapacity}
                tone={coverage.overCapacity > 0 ? "text-amber-700" : "text-slate-900"}
              />
            </div>
          ) : (
            <LeaderEmptyState title="Coverage data unavailable" message="Branch class data has not loaded yet." />
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-[#1a3a8f]" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Academic Progress &amp; Attendance
            </h4>
          </div>

          {progressError ? (
            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Branch progress reports could not be loaded. {progressError}
            </p>
          ) : progressCoverage ? (
            <div>
              <HealthRow
                label="Reports in the last 30 days"
                hint={`${progressCoverage.instructors.length} instructors monitored`}
                value={progressCoverage.totalReports}
              />
              <HealthRow
                label="Instructors without a recent report"
                value={progressCoverage.staleCount}
                tone={progressCoverage.staleCount > 0 ? "text-amber-700" : "text-emerald-700"}
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 font-medium p-2">Loading branch progress data…</p>
          )}

          <div className="mt-2 pt-2 border-t border-slate-100">
            {attendanceLoaded && attendanceSummary ? (
              <HealthRow
                label="Attendance completion today"
                hint={`${attendanceSummary.recorded} of ${attendanceSummary.expected} expected records`}
                value={`${Math.round(attendanceSummary.completionRate * 100)}%`}
                tone={attendanceSummary.incomplete.length > 0 ? "text-amber-700" : "text-emerald-700"}
              />
            ) : (
              <p className="text-[11px] text-slate-400 font-medium px-1 py-2">
                Attendance completion is calculated on demand in the Attendance tab.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Quick Access ── */}
      <Card>
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-3">
          Quick Access
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("team")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#1a3a8f] mb-1.5" />
            <p className="font-extrabold text-xs text-slate-800">Instructor Team</p>
            <p className="text-[10px] text-slate-500">Load, division, activity</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("coverage")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-600 mb-1.5" />
            <p className="font-extrabold text-xs text-slate-800">Classes &amp; Coverage</p>
            <p className="text-[10px] text-slate-500">Both divisions</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("progress")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-emerald-600 mb-1.5" />
            <p className="font-extrabold text-xs text-slate-800">Academic Progress</p>
            <p className="text-[10px] text-slate-500">Reports &amp; evaluations</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("approvals")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600 mb-1.5" />
            <p className="font-extrabold text-xs text-slate-800">Academic Approvals</p>
            <p className="text-[10px] text-slate-500">
              {pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending` : "Queue clear"}
            </p>
          </button>
        </div>
      </Card>
    </div>
  );
}
