import { useState, useEffect, useMemo } from "react";
import { branchToId } from "../../../constants/branches";
import { fetchOpsLeadProgressReports } from "../../students/progressReportsRepository";
import {
  GraduationCap,
  Search,
  RefreshCw,
  Eye,
  X,
  AlertTriangle,
  Award,
  BookOpen,
  School,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

/**
 * OpsLeadProgressReportsTab
 *
 * Dedicated read-only academic progress oversight view for the Operational Leader at the Main Campus.
 * Ratified by Owner Kifry under OD-OPS-01 / Authoritative Blueprint v3.4.1 / G-013.
 *
 * Authority Boundaries:
 * - Read-only visibility ('get' and 'list') over student progress reports for the Main Campus (Kota Gorontalo).
 * - Encompasses both Courses and Kindergarten divisions to maintain campus operational visibility.
 * - Strictly NO create, update, delete, student level advancement, or pedagogical grading authority.
 *
 * Query Indexing & Scope Boundaries:
 * - Queries are bounded by Spark read quotas (hard cap max 50 per division query) and order by `examDate desc`.
 * - Records must be explicitly scoped (`branchId == 'kota_gorontalo'`) and dated (`examDate`).
 * - Per Firestore indexing and security rules, legacy records lacking required scope fields (such as `branchId`)
 *   or an explicit `examDate` are excluded and will not appear in this view unless resolved under a formal plan.
 *
 * @param {object} props
 * @param {string} [props.myBranch="Kota Gorontalo"]
 */
export default function OpsLeadProgressReportsTab({
  myBranch = "Kota Gorontalo",
}) {
  const targetBranchId = useMemo(() => branchToId(myBranch), [myBranch]);
  const isMainCampus = targetBranchId === "kota_gorontalo";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(() => isMainCampus);
  const [error, setError] = useState(null);
  const [divisionFilter, setDivisionFilter] = useState("all"); // 'all' | 'courses' | 'kindergarten'
  const [promotionFilter, setPromotionFilter] = useState("all"); // 'all' | 'eligible' | 'standard'
  const [windowOption, setWindowOption] = useState("90"); // '30' | '90' | '180' | '365' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  };

  const handleDivisionChange = (newDiv) => {
    setLoading(true);
    setError(null);
    setDivisionFilter(newDiv);
    setCurrentPage(1);
  };

  const handleWindowChange = (newWindow) => {
    setLoading(true);
    setError(null);
    setWindowOption(newWindow);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePromotionFilterChange = (val) => {
    setPromotionFilter(val);
    setCurrentPage(1);
  };

  useEffect(() => {
    let active = true;

    if (!isMainCampus) {
      return;
    }

    const options = {
      windowDays: windowOption === "all" ? null : Number(windowOption),
      limitCount: 50,
    };

    fetchOpsLeadProgressReports(myBranch, divisionFilter, options)
      .then((data) => {
        if (active) {
          setReports(data || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load progress reports for Ops Lead:", err);
          setError(err?.message || "Failed to load progress reports from Firestore.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [myBranch, divisionFilter, windowOption, isMainCampus, refreshKey]);

  // Client-side filtering for search query and promotion status
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      // Promotion filter
      if (promotionFilter === "eligible" && !rep.eligibleForPromotion) return false;
      if (promotionFilter === "standard" && rep.eligibleForPromotion) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (rep.studentName || "").toLowerCase();
        const className = (rep.className || "").toLowerCase();
        const instructorName = (rep.instructorName || "").toLowerCase();
        const notes = (rep.notes || "").toLowerCase();
        if (
          !studentName.includes(q) &&
          !className.includes(q) &&
          !instructorName.includes(q) &&
          !notes.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [reports, promotionFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const coursesCount = reports.filter((r) => r.division === "courses").length;
    const kgCount = reports.filter((r) => r.division === "kindergarten").length;
    const eligibleCount = reports.filter((r) => Boolean(r.eligibleForPromotion)).length;
    return { total, coursesCount, kgCount, eligibleCount };
  }, [reports]);

  // Satellite branch boundary notice
  if (!isMainCampus) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <h3 className="font-bold text-base">Main Campus Scope Restriction (OD-OPS-01)</h3>
        </div>
        <p className="text-sm leading-relaxed text-amber-800">
          Academic progress report oversight is formally scoped to the Operational Leader at the{" "}
          <strong className="font-semibold">Main Campus (Kota Gorontalo)</strong> under Owner Decision OD-OPS-01.
          Current branch is <span className="font-semibold underline">{myBranch}</span>.
        </p>
        <p className="text-xs text-amber-700">
          Satellite branches operate under lean Course Division management. Satellite operational staff do not have
          access to student evaluation records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope and Governance Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-[#1a3a8f] rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px] uppercase tracking-wider border border-emerald-500/30">
              Read-Only Governance (OD-OPS-01)
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Authoritative Blueprint v3.4.1 (§6.8, G-013)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-semibold text-[10px] uppercase tracking-wider border border-indigo-400/30">
              Spark Quota Guarded (Up to 50/div)
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            Student Progress Reports — Campus Academic Oversight
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Campus-wide read-only visibility covering Course Academy and Kindergarten divisions at Kota Gorontalo.
            Enables operational monitoring of student learning velocity and promotion readiness.
            Academic mutations, level advancements, and evaluation scoring remain strictly reserved for teaching staff and Front Office.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Reports</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {windowOption === "all"
              ? "All time (up to 50 per division)"
              : `Last ${windowOption} days (up to 50/div)`}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Courses Division</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700">{stats.coursesCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Adult & teen academies</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Kindergarten</span>
            <School className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700">{stats.kgCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Early childhood learners</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Promotion Ready</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.eligibleCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Eligible for level advancement</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by student, class, or instructor name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Division Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleDivisionChange("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                divisionFilter === "all"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Divisions
            </button>
            <button
              onClick={() => handleDivisionChange("courses")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                divisionFilter === "courses"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => handleDivisionChange("kindergarten")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                divisionFilter === "kindergarten"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kindergarten
            </button>
          </div>

          {/* Promotion Status Filter */}
          <select
            value={promotionFilter}
            onChange={(e) => handlePromotionFilterChange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Promotion States</option>
            <option value="eligible">Promotion Ready Only</option>
            <option value="standard">Standard Evaluation Only</option>
          </select>

          {/* Bounded Reporting Window Filter */}
          <select
            value={windowOption}
            onChange={(e) => handleWindowChange(e.target.value)}
            aria-label="Reporting Window"
            title="Bounded query window to control read costs and protect Spark quota (up to 50 per division)"
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="30">Last 30 Days (up to 50/div)</option>
            <option value="90">Last 90 Days (up to 50/div)</option>
            <option value="180">Last 180 Days (up to 50/div)</option>
            <option value="365">Last 365 Days (up to 50/div)</option>
            <option value="all">All time (up to 50 per division)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading campus progress reports...</p>
          <p className="text-xs text-slate-400">
            Querying authorized division collections under OD-OPS-01 security rules.
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h3 className="font-bold text-sm">Failed to Load Progress Reports</h3>
          </div>
          <p className="text-xs text-red-700">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Query
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Progress Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || promotionFilter !== "all" || divisionFilter !== "all"
              ? "No student evaluation records match your current filter criteria."
              : "No student evaluations have been recorded for Kota Gorontalo yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Division</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Evaluator</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4 text-center">Score Band</th>
                  <th className="py-3 px-4">Promotion Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {report.studentName || report.studentId || "Student"}
                    </td>
                    <td className="py-3.5 px-4">
                      {report.division === "kindergarten" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          Kindergarten
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          Courses
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {report.className || report.classId || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {report.instructorName || report.instructorId || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {report.examDate || report.submittedAt?.substring(0, 10) || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-xs bg-slate-100 text-slate-800">
                        {report.overallScore !== undefined && report.overallScore !== null
                          ? `${report.overallScore}%`
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {report.eligibleForPromotion ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Ready: {report.recommendedLevel ? report.recommendedLevel.toUpperCase() : "Next Level"}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 flex-wrap gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-700">
                {filteredReports.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(currentPage * pageSize, filteredReports.length)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{filteredReports.length}</span> reports
              <span className="text-slate-400 ml-1">
                {windowOption === "all"
                  ? "(all time, up to 50 per division)"
                  : `(window: last ${windowOption} days, up to 50 per division)`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-medium mr-1">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Page Size"
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous Page"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next Page"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Query Limitation & Data Scope Notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="font-semibold text-slate-700">Scope and Data Indexing Notice:</strong> Progress evaluations are scoped strictly to Main Campus (<code className="text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">branchId</code>) and ordered chronologically by examination date (<code className="text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">examDate</code>). Legacy records lacking an explicit <code className="text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">examDate</code> or required scope fields (such as <code className="text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">branchId</code>) are excluded by security rules and indexing requirements.
        </p>
      </div>

      {/* Read-Only Evaluation Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Read-Only Progress Evaluation
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedReport.studentName || selectedReport.studentId}
                </h3>
                <p className="text-xs text-slate-500">
                  Class: {selectedReport.className || "—"} ({selectedReport.division?.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Breakdown Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Overall Band Score
                  </span>
                  <p className="text-3xl font-black text-indigo-700 mt-0.5">
                    {selectedReport.overallScore !== undefined && selectedReport.overallScore !== null
                      ? `${selectedReport.overallScore}%`
                      : "—"}
                  </p>
                </div>
                {selectedReport.eligibleForPromotion && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Promotion Flagged
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Target: {selectedReport.recommendedLevel ? selectedReport.recommendedLevel.toUpperCase() : "Next Level"}
                    </p>
                  </div>
                )}
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Pronunciation</span>
                  <span className="text-base font-black text-slate-800">
                    {selectedReport.pronunciationScore ?? "—"}/100
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Fluency</span>
                  <span className="text-base font-black text-slate-800">
                    {selectedReport.fluencyScore ?? "—"}/100
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Vocabulary</span>
                  <span className="text-base font-black text-slate-800">
                    {selectedReport.vocabularyScore ?? "—"}/100
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Comprehension</span>
                  <span className="text-base font-black text-slate-800">
                    {selectedReport.comprehensionScore ?? "—"}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Pedagogical Remarks */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700">Instructor Evaluation Remarks:</span>
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100 italic leading-relaxed">
                {selectedReport.notes || "No remarks provided by instructor."}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
              <div>
                <span className="font-semibold block text-slate-400">Evaluator:</span>
                <span className="text-slate-700 font-medium">{selectedReport.instructorName || "—"}</span>
              </div>
              <div>
                <span className="font-semibold block text-slate-400">Exam Date:</span>
                <span className="text-slate-700 font-medium">
                  {selectedReport.examDate || selectedReport.submittedAt?.substring(0, 10) || "—"}
                </span>
              </div>
            </div>

            {/* Read-Only Governance Notice */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Read-Only View:</strong> Academic level advancement and evaluation updates are executed by Front Office or Division Managers upon verification.
              </span>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
