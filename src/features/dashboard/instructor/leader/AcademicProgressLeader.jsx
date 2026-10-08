import { useMemo } from "react";
import { Award, ClipboardCheck, GraduationCap, Info, Search, UserX } from "lucide-react";
import { Badge, Card, LevelBadge } from "../../../shared";
import { buildInstructorNameMap, noopNavigate } from "../leaderUtils";
import { DivisionBadge, HealthRow, LeaderEmptyState, LeaderErrorNote } from "./leaderUi";

const REPORT_DISPLAY_LIMIT = 40;

/**
 * AcademicProgressLeader
 *
 * Branch-scope academic progress monitoring across both divisions, plus the
 * leader's own teaching evaluations.
 *
 * Authorized read scope (owner-approved 2026-10-08 widening): an Instructor
 * Leader may read same-branch progress reports written by any instructor.
 * Authoring remains restricted to the instructor of record, so this surface
 * monitors rather than edits.
 */
export default function AcademicProgressLeader({
  reports = [],
  progressCoverage = null,
  loading = false,
  error = "",
  branchInstructors = [],
  ownTeachingSlot = null,
  onNavigate = noopNavigate,
}) {
  const nameMap = useMemo(() => buildInstructorNameMap(branchInstructors), [branchInstructors]);

  const sortedReports = useMemo(
    () =>
      [...(reports || [])].sort(
        (a, b) =>
          new Date(b.examDate || b.submittedAt || 0).getTime() -
          new Date(a.examDate || a.submittedAt || 0).getTime()
      ),
    [reports]
  );

  const visibleReports = sortedReports.slice(0, REPORT_DISPLAY_LIMIT);
  const staleInstructors = (progressCoverage?.instructors || []).filter((row) => row.stale);

  return (
    <div className="space-y-5 w-full">
      {/* ── Branch monitoring summary ── */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="w-4 h-4 text-[#1a3a8f]" />
          <h4 className="font-extrabold text-slate-800 text-sm">Branch Academic Progress</h4>
          <Badge tone="indigo">{branchInstructors.length} instructors</Badge>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mb-2">
          Same-branch evaluations from Course Academy and Kids School instructors, newest first.
        </p>

        {error ? (
          <LeaderErrorNote title="Could not load branch progress reports" message={error} />
        ) : loading ? (
          <p className="p-6 text-center text-slate-400 text-xs font-semibold">
            Loading branch progress reports…
          </p>
        ) : progressCoverage ? (
          <div>
            <HealthRow
              label="Reports in the monitoring window"
              hint={`Most recent ${sortedReports.length} of this branch's evaluations`}
              value={progressCoverage.totalReports}
            />
            <HealthRow
              label="Instructors without a recent report"
              hint={`No report in the last ${progressCoverage.staleAfterDays} days`}
              value={progressCoverage.staleCount}
              tone={progressCoverage.staleCount > 0 ? "text-amber-700" : "text-emerald-700"}
            />
          </div>
        ) : null}
      </Card>

      {/* ── Instructors needing follow-up ── */}
      {!error && staleInstructors.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <UserX className="w-4 h-4 text-amber-600" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Instructors Needing Follow-up
            </h4>
          </div>
          <ul className="space-y-2">
            {staleInstructors.map((row) => (
              <li
                key={row.uid}
                className="flex items-center justify-between gap-3 p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl"
              >
                <span className="text-xs font-bold text-slate-800 truncate">{row.name}</span>
                <span className="text-[11px] font-semibold text-amber-800 shrink-0">
                  {row.reportCount === 0
                    ? "No report recorded"
                    : row.daysSince !== null
                      ? `Last report ${row.daysSince}d ago`
                      : "No dated report"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onNavigate("team")}
            className="mt-3 text-[11px] font-bold text-[#1a3a8f] hover:underline cursor-pointer"
          >
            Open the instructor team view to review teaching load
          </button>
        </Card>
      )}

      {/* ── Recent evaluations ── */}
      {!error && !loading && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#1a3a8f]" />
                <h4 className="font-extrabold text-slate-800 text-sm">Recent Evaluations</h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {sortedReports.length > REPORT_DISPLAY_LIMIT
                  ? `Showing the ${REPORT_DISPLAY_LIMIT} most recent of ${sortedReports.length} reports.`
                  : "All reports in the current monitoring window."}
              </p>
            </div>
            <Search className="w-4 h-4 text-slate-300 shrink-0" />
          </div>

          {visibleReports.length === 0 ? (
            <LeaderEmptyState
              icon={GraduationCap}
              title="No evaluations recorded yet"
              message="No instructor in this branch has submitted a progress report in the current monitoring window."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {report.studentName || "Student"}
                      </span>
                      {report.level && <LevelBadge level={report.level} />}
                      {report.className && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {report.className}
                        </span>
                      )}
                      {report.division && <DivisionBadge division={report.division} />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {nameMap[report.instructorId] || report.instructorName || "Instructor"} ·{" "}
                      {report.examDate
                        ? new Date(report.examDate).toLocaleDateString()
                        : report.submittedAt
                          ? new Date(report.submittedAt).toLocaleDateString()
                          : "Date not recorded"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 px-3.5 py-1.5 rounded-2xl self-start sm:self-auto shrink-0">
                    <Award className="w-4 h-4 text-[#1a3a8f]" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                        Score
                      </span>
                      <span className="text-sm font-black text-[#1a3a8f]">
                        {report.overallScore || "—"} / 100
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Own teaching evaluations (unchanged instructor capability) ── */}
      {ownTeachingSlot && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#1a3a8f]" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              My Own Teaching Evaluations
            </h4>
          </div>
          {ownTeachingSlot}
        </div>
      )}

      {/* ── Documented capability gap (brief §7) ── */}
      <Card className="border-dashed">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-slate-600 font-medium space-y-1.5">
            <p className="font-bold text-slate-700">Teacher evaluations: workflow not yet implemented</p>
            <p>
              Blueprint v3.3 §6.11 establishes <span className="font-bold">teacher evaluations</span> as an
              Instructor Leader responsibility, but the repository has no dedicated evaluation subsystem
              (no rubric, no observation record, no evaluation collection). Nothing is fabricated here to
              fill the gap.
            </p>
            <p>
              Student progress reports are the only academic record available today, so instructor recency
              above is derived from them and is a proxy for academic activity, not a teacher evaluation.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
