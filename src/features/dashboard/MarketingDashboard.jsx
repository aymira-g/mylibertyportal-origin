import { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { WelcomeBanner, DashboardShell, useToast, useUserProfile } from "../shared";
import { UserPlus, BookOpen, Users, Copy, Check, ExternalLink, FileText, AlertCircle } from "lucide-react";
import { copyText } from "../../utils/copyText";
import { AvailableBatches } from "../classes";
import { useStaffDirectives, StaffDirectivesWidget } from "../staff";
import { getRegistrationUrl } from "../../constants/externalLinks";
import { branchToId, idToBranch } from "../../constants/branches";
import {
  SchoolOutreachTab,
  OutreachProgressWidget,
  listenToSchools,
} from "./marketing";
import { WalkInInquiryTab } from "./frontoffice";
import { StudentApplications } from "../students";
import { getUrlAction, clearUrlAction } from "../../utils/urlAction";

function MarketingOverview({
  inquiryCount,
  onlineAppCount,
  loading,
  classes,
  openSeats,
  schools,
  onNavigate,
}) {
  const toast = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  const registrationLink = getRegistrationUrl();

  const handleCopyLink = async () => {
    const res = await copyText(registrationLink);
    if (res.ok) {
      setCopiedLink(true);
      toast("Student Registration link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast("Could not copy registration link to clipboard", "error");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <WelcomeBanner
        portalLabel="Admissions & Outreach"
        roleLabel="Marketing Representative"
        fallbackName="Marketing Officer"
        subtitle="Drive academy admissions, review prospective student inquiries, and promote available class batches."
        stats={[
          {
            label: "Walk-In Inquiries",
            value: loading ? "..." : inquiryCount,
            icon: UserPlus,
            onClick: () => onNavigate("inquiries"),
          },
          {
            label: "Online Applications",
            value: loading ? "..." : onlineAppCount,
            icon: FileText,
            onClick: () => onNavigate("applications"),
          },
          {
            label: "Total Open Seats",
            value: openSeats,
            icon: Users,
            onClick: () => onNavigate("classes"),
          },
          {
            label: "Available Batches",
            value: classes.length,
            icon: BookOpen,
            onClick: () => onNavigate("classes"),
          },
        ]}
      />

      {/* ── Marketing Fast Tools & Share Bar ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
          Admissions &amp; Lead Generation Link
        </h4>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 bg-slate-50 border border-slate-200/90 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 truncate flex items-center gap-2">
            <span className="text-slate-400 select-none">Link:</span>
            <span className="font-mono text-slate-800 truncate">{registrationLink}</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-[#1a3a8f] hover:bg-[#122b6e] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <a
            href="/register"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shrink-0"
          >
            <span>Preview Form</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
          <button
            onClick={() => onNavigate("inquiries")}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#1a3a8f] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#1a3a8f]" />
            <span>Walk-In Guestbook</span>
          </button>
          <button
            onClick={() => onNavigate("applications")}
            className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-sky-700" />
            <span>Online Applications</span>
          </button>
        </div>

        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-800 font-medium">
          💡 <strong>Tip for Outreach:</strong> You can copy pre-formatted WhatsApp promotional
          blurbs directly for any open batch in the <strong>Available Batches</strong> tab or below!
        </div>
      </div>

      {/* ── Gorontalo School Outreach Progress Widget ── */}
      <OutreachProgressWidget
        schools={schools || []}
        isCompact={true}
        onNavigateToMap={() => onNavigate("visits")}
      />

      {/* ── Attendance & Reception Note ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1.5">
        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
          Staff Attendance Verification
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Your daily shifts are tracked through the front desk reception scanner. Clock in upon
          arrival and clock out before leaving.
        </p>
      </div>

      {/* ── Available Batches Overview Widget ── */}
      <AvailableBatches
        classes={classes}
        canEdit={false}
        role="marketing"
        isOverviewWidget={true}
        onNavigateToClasses={() => onNavigate("classes")}
      />
    </div>
  );
}

export default function MarketingDashboard({ branch = null, division = null }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const action = getUrlAction();
    if (action) {
      toast(`Action shortcut "${action}" is not supported for Marketing view.`, "info");
      clearUrlAction();
    }
  }, [toast]);

  const { profile: userProfile, loading: profileLoading, branchId: profileBranchId } = useUserProfile();

  const marketingBranchId = useMemo(() => {
    const raw = branch || profileBranchId || userProfile?.branchId || userProfile?.branch;
    return raw ? branchToId(raw) : null;
  }, [branch, profileBranchId, userProfile]);

  const marketingBranchLabel = useMemo(() => {
    return marketingBranchId ? idToBranch(marketingBranchId) : null;
  }, [marketingBranchId]);

  const profileDivision = useMemo(() => {
    return division || userProfile?.division || "courses";
  }, [division, userProfile]);

  const [divisionOverride, setDivisionOverride] = useState(null);
  const activeDivision = useMemo(() => {
    if (profileDivision === "all") {
      return divisionOverride || "courses";
    }
    return profileDivision;
  }, [profileDivision, divisionOverride]);

  const [inquiryCount, setInquiryCount] = useState(0);
  const [onlineAppCount, setOnlineAppCount] = useState(0);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  const {
    activeDirectives,
    completedDirectives,
    pendingCount: pendingDirectivesCount,
    loading: directivesLoading,
    handleToggle: handleToggleDirective,
  } = useStaffDirectives("marketing");

  useEffect(() => {
    if (!marketingBranchId) return;

    const unsubApplications = onSnapshot(
      query(
        collection(db, "applications"),
        where("branchId", "==", marketingBranchId)
      ),
      (snap) => {
        const apps = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
        setApplications(apps);
        const pending = apps.filter(
          (d) => (d.status || "pending") === "pending"
        ).length;
        setOnlineAppCount(pending);
        setLoading(false);
      },
      (err) => {
        console.error("applications listener:", err);
        setLoading(false);
      }
    );

    const unsubDeskInquiries = onSnapshot(
      query(
        collection(db, "deskInquiries"),
        where("branchId", "==", marketingBranchId)
      ),
      (snap) => {
        const inqs = snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() }));
        const pending = inqs.filter(
          (d) => (d.status || "inquired") === "inquired"
        ).length;
        setInquiryCount(pending);
      },
      (err) => {
        console.error("deskInquiries listener:", err);
      }
    );

    const unsubClasses = onSnapshot(
      query(
        collection(db, "classes"),
        where("branchId", "==", marketingBranchId)
      ),
      (snap) => {
        setClasses(snap.docs.map((d) => /** @type {any} */ ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("marketing classes listener:", err);
      }
    );

    return () => {
      unsubApplications();
      unsubDeskInquiries();
      unsubClasses();
    };
  }, [marketingBranchId]);

  useEffect(() => {
    if (!marketingBranchId) return;

    const unsubSchools = listenToSchools(
      { branchId: marketingBranchId },
      (data) => {
        setSchools(data);
        setSchoolsLoading(false);
      },
      (err) => {
        console.error("marketing schools listener:", err);
        setSchoolsLoading(false);
      }
    );
    return () => unsubSchools();
  }, [marketingBranchId]);

  const openSeats = useMemo(() => {
    return classes.reduce((sum, cls) => {
      const status = (cls.status || "").toLowerCase();
      if (status === "cancelled" || status === "completed") {
        return sum;
      }
      const studentCount = (cls.studentIds || []).length;
      const capacity = Number(cls.maxCapacity) || 15;
      return sum + Math.max(0, capacity - studentCount);
    }, 0);
  }, [classes]);

  const scheduledSchoolsCount = useMemo(() => {
    return schools.filter((s) => s.status === "scheduled").length;
  }, [schools]);

  if (profileLoading) {
    return (
      <div className="p-8 bg-[#f0f2f5] rounded-2xl min-h-[500px] flex items-center justify-center">
        <p className="text-sm text-slate-500 font-semibold">Loading marketing admissions portal...</p>
      </div>
    );
  }

  if (!marketingBranchId) {
    return (
      <div className="p-8 bg-[#f0f2f5] rounded-2xl min-h-[500px] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">Branch Assignment Required</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Your marketing user account does not have an active campus branch assigned.
            Please contact your Division Manager or Director to configure your branch assignment.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "overview",
      label: "Campaign & Outreach",
      component: (
        <MarketingOverview
          inquiryCount={inquiryCount}
          onlineAppCount={onlineAppCount}
          loading={loading}
          classes={classes}
          openSeats={openSeats}
          schools={schools}
          onNavigate={setActiveTab}
        />
      ),
    },
    {
      id: "visits",
      label: "School Visits & Map",
      badge: scheduledSchoolsCount > 0 ? `${scheduledSchoolsCount} scheduled` : null,
      component: (
        <div className="w-full">
          <SchoolOutreachTab
            currentUser={auth.currentUser}
            branchId={marketingBranchId}
            schools={schools}
            loading={schoolsLoading}
          />
        </div>
      ),
    },
    {
      id: "inquiries",
      label: "Walk-In Inquiries",
      badge: inquiryCount > 0 ? `${inquiryCount} open` : null,
      component: (
        <div className="w-full">
          <WalkInInquiryTab
            division={activeDivision}
            branchLabel={marketingBranchLabel || "Kota Gorontalo"}
          />
        </div>
      ),
    },
    {
      id: "applications",
      label: "Online Applications",
      badge: onlineAppCount > 0 ? `${onlineAppCount} pending` : null,
      component: (
        <div className="w-full">
          <StudentApplications
            applications={applications}
            classes={classes}
            readOnly={true}
          />
        </div>
      ),
    },
    {
      id: "directives",
      label: "Directives",
      badge: pendingDirectivesCount || null,
      component: (
        <div className="w-full">
          <StaffDirectivesWidget
            activeDirectives={activeDirectives}
            completedDirectives={completedDirectives}
            loading={directivesLoading}
            onToggle={handleToggleDirective}
            roleLabel="Marketing & Outreach"
          />
        </div>
      ),
    },
    {
      id: "classes",
      label: "Available Batches",
      badge: openSeats > 0 ? `${openSeats} open` : null,
      component: (
        <div className="w-full">
          <AvailableBatches classes={classes} canEdit={false} role="marketing" />
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 bg-[#f0f2f5] rounded-2xl min-h-[500px]">
      {profileDivision === "all" && (
        <div className="flex items-center gap-2 mb-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 w-fit text-xs font-bold text-slate-700">
          <span className="text-slate-400">Division:</span>
          <button
            type="button"
            onClick={() => setDivisionOverride("courses")}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeDivision === "courses" ? "bg-[#1a3a8f] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Courses
          </button>
          <button
            type="button"
            onClick={() => setDivisionOverride("kindergarten")}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeDivision === "kindergarten" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Kindergarten
          </button>
        </div>
      )}
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="Marketing Portal"
      />
    </div>
  );
}
