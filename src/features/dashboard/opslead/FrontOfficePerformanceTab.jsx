import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchRecentDeskInquiries } from "../frontoffice/deskInquiriesRepository";
import { normalizeWhatsAppNumber } from "../../finance/receiptMessages";
import { todayWita } from "../../../utils/dateWita";
import {
  UserCheck,
  Search,
  RefreshCw,
  Phone,
  AlertCircle,
  Clock,
} from "lucide-react";

const STATUS_OPTIONS = [
  { id: "inquired", label: "New / Inquired", aliases: ["new", "inquired"] },
  { id: "follow_up_sent", label: "Follow-Up Sent", aliases: ["contacted", "follow_up_sent"] },
  { id: "trial_scheduled", label: "Trial Scheduled", aliases: ["trial_scheduled", "trial"] },
  { id: "enrolled", label: "Enrolled", aliases: ["enrolled"] },
  { id: "closed", label: "Closed / Archived", aliases: ["closed"] },
];

/**
 * FrontOfficePerformanceTab
 *
 * Implements Blueprint §6.8 & Phase 2 Conformance:
 * Front-office performance and intake coordination across Course & Kindergarten divisions.
 * 1. Intake Velocity & Pipeline: Track walk-in parent throughput and conversion stages.
 * 2. Follow-Up Responsiveness: Highlights stale or uncontacted leads needing desk follow-up.
 * 3. Read-Only Coordination: Ops Lead inspects queue health without performing cashier intake.
 */
export default function FrontOfficePerformanceTab({
  myBranch = "Kota Gorontalo",
  targetBranchId = "kota_gorontalo",
}) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");

  const todayStr = useMemo(() => todayWita(), []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecentDeskInquiries(100, targetBranchId, "all");
      setInquiries(data);
    } catch (err) {
      console.warn("Failed to load desk inquiries for Ops Lead:", err);
    } finally {
      setLoading(false);
    }
  }, [targetBranchId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchRecentDeskInquiries(100, targetBranchId, "all");
        if (active) {
          setInquiries(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load desk inquiries for Ops Lead:", err);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [targetBranchId]);

  // Intake Velocity KPI Metrics
  const stats = useMemo(() => {
    let todayCount = 0;
    let newCount = 0;
    let contactedCount = 0;
    let trialCount = 0;
    let enrolledCount = 0;
    let coursesCount = 0;
    let kindergartenCount = 0;

    for (const inq of inquiries) {
      const dStr = (inq.createdAt || inq.timestamp || "").substring(0, 10);
      if (dStr === todayStr) todayCount++;

      const st = (inq.status || "inquired").toLowerCase();
      if (st === "new" || st === "inquired") newCount++;
      else if (st === "contacted" || st === "follow_up_sent") contactedCount++;
      else if (st === "trial_scheduled" || st === "trial") trialCount++;
      else if (st === "enrolled") enrolledCount++;

      if (inq.division === "kindergarten") kindergartenCount++;
      else coursesCount++;
    }

    return {
      total: inquiries.length,
      todayCount,
      newCount,
      contactedCount,
      trialCount,
      enrolledCount,
      coursesCount,
      kindergartenCount,
    };
  }, [inquiries, todayStr]);

  // Filtered inquiries list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // Search match
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const parentMatch = (inq.parentName || "").toLowerCase().includes(q);
        const studentMatch = (inq.studentName || "").toLowerCase().includes(q);
        const phoneMatch = (inq.phone || "").includes(q);
        if (!parentMatch && !studentMatch && !phoneMatch) return false;
      }

      // Status match
      if (statusFilter !== "all") {
        const inqStatus = (inq.status || "inquired").toLowerCase();
        const selectedOption = STATUS_OPTIONS.find((o) => o.id === statusFilter);
        if (selectedOption) {
          if (!selectedOption.aliases.includes(inqStatus)) return false;
        } else if (inqStatus !== statusFilter) {
          return false;
        }
      }

      // Division match
      if (divisionFilter !== "all") {
        const inqDiv = inq.division || "courses";
        if (inqDiv !== divisionFilter) return false;
      }

      return true;
    });
  }, [inquiries, search, statusFilter, divisionFilter]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1a3a8f]" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Front Office Intake &amp; Desk Performance
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational Leader coordination of front-desk inquiry response, visitor throughput, and lead conversion ({myBranch}).
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Intake Velocity Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
            Today&apos;s Intake
          </span>
          <span className="text-xl font-black text-slate-900 block mt-0.5">
            {stats.todayCount}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {stats.total} total logged
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">
            Needs Follow-Up
          </span>
          <span className="text-xl font-black text-amber-950 block mt-0.5">
            {stats.newCount}
          </span>
          <span className="text-[10px] font-semibold text-amber-600">
            New / Uncontacted
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
            Contacted Leads
          </span>
          <span className="text-xl font-black text-indigo-950 block mt-0.5">
            {stats.contactedCount}
          </span>
          <span className="text-[10px] font-semibold text-indigo-600">
            Discussion underway
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 block">
            Trials Booked
          </span>
          <span className="text-xl font-black text-purple-950 block mt-0.5">
            {stats.trialCount}
          </span>
          <span className="text-[10px] font-semibold text-purple-600">
            Placement / Trial
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
            Enrolled
          </span>
          <span className="text-xl font-black text-emerald-950 block mt-0.5">
            {stats.enrolledCount}
          </span>
          <span className="text-[10px] font-semibold text-emerald-600">
            Converted to student
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
            Division Split
          </span>
          <div className="text-xs font-bold text-blue-900 mt-1 space-y-0.5">
            <div>Courses: {stats.coursesCount}</div>
            <div>Kindy: {stats.kindergartenCount}</div>
          </div>
        </div>
      </div>

      {/* Uncontacted Leads Attention Banner */}
      {stats.newCount > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-orange-800">
            <span className="font-extrabold text-orange-950">
              {stats.newCount} Walk-In Inquiries Awaiting Front Desk Response
            </span>
            <p className="text-[11px] text-orange-700 leading-relaxed">
              These visitors have not yet been marked as contacted by Front Office staff. Operational Leaders coordinate front-desk responsiveness to ensure no parent inquiry slips through.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor parent name, student name, or phone number..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-[#1a3a8f] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:border-[#1a3a8f] outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Division Filter */}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:border-[#1a3a8f] outline-none cursor-pointer"
          >
            <option value="all">All Programs (Campus)</option>
            <option value="courses">Course Division</option>
            <option value="kindergarten">Kindergarten Division</option>
          </select>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Inquiry Queue ({filteredInquiries.length})</span>
          <span>Read-Only Operational Coordination</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
            Loading desk inquiry queue...
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            No walk-in inquiries matching the selected filters.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {filteredInquiries.map((inq) => {
                const cleanPhone = normalizeWhatsAppNumber(inq.phone);
                const isKg = inq.division === "kindergarten";
                const isNew = (inq.status || "new") === "new";

                return (
                  <div
                    key={inq.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition text-xs ${
                      isNew ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {inq.studentName || inq.parentName || "Visitor"}
                        </span>
                        {inq.studentName && inq.parentName && (
                          <span className="text-slate-400 text-[11px]">
                            (Parent: {inq.parentName})
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isKg
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isKg ? "Kindy" : "Course"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {inq.program && <span>{inq.program}</span>}
                        <span>·</span>
                        <span className="capitalize">{inq.fluencyTier || "beginner"}</span>
                        <span>·</span>
                        <span className="capitalize font-semibold text-slate-700">
                          Status: {inq.status || "new"}
                        </span>
                        {inq.loggedByName && (
                          <>
                            <span>·</span>
                            <span>Desk: {inq.loggedByName}</span>
                          </>
                        )}
                      </div>

                      {inq.notes && (
                        <p className="text-[11px] text-slate-500 italic max-w-xl line-clamp-1">
                          &ldquo;{inq.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        <span>
                          {inq.createdAt
                            ? new Date(inq.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Recent"}
                        </span>
                      </div>

                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition flex items-center gap-1.5 border border-emerald-200"
                          title="Verify parent contact via WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
