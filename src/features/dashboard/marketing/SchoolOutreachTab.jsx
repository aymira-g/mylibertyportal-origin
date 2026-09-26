import { useState, useEffect, useMemo } from "react";
import GorontaloOutreachMap from "./GorontaloOutreachMap";
import OutreachProgressWidget from "./OutreachProgressWidget";
import SchoolOutreachList from "./SchoolOutreachList";
import SchoolVisitModal from "./SchoolVisitModal";
import AddSchoolModal from "./AddSchoolModal";
import {
  listenToSchools,
  seedInitialSchoolsIfEmpty,
} from "./schoolOutreachRepository";
import { useToast } from "../../shared";

export default function SchoolOutreachTab({
  currentUser,
  branchId,
  schools: propSchools,
  loading: propLoading,
}) {
  const toast = useToast();

  const [internalSchools, setInternalSchools] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [modalSchool, setModalSchool] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // If parent component (MarketingDashboard) already provides schools, consume them directly
  // to avoid redundant duplicate Firestore listeners on the same collection.
  const isControlled = Array.isArray(propSchools);
  const schools = isControlled ? propSchools : internalSchools;
  const loading = isControlled ? Boolean(propLoading) : internalLoading;

  // Real-time listener for school outreach documents only when not provided by parent
  useEffect(() => {
    if (isControlled) return;
    const unsub = listenToSchools(
      { branchId },
      (data) => {
        setInternalSchools(data);
        setInternalLoading(false);
      },
      (err) => {
        console.error("Failed to load schools:", err);
        setInternalLoading(false);
        toast("Failed to load schools data", "error");
      }
    );
    return () => unsub();
  }, [isControlled, branchId, toast]);

  // Filtered schools passed to the map and list
  const filteredSchools = useMemo(() => {
    if (activeFilter === "all") return schools;
    return schools.filter((s) => (s.status || "pending") === activeFilter);
  }, [schools, activeFilter]);

  const handleSeedSchools = async () => {
    try {
      setSeeding(true);
      const res = await seedInitialSchoolsIfEmpty(currentUser?.uid || "admin-seed");
      if (res.seeded) {
        toast(`Loaded ${res.count} Kota Gorontalo schools successfully!`, "success");
      } else {
        toast(`Schools already present (${res.count} schools in database)`, "info");
      }
    } catch (err) {
      console.error("Seeding error:", err);
      toast("Error loading starter schools", "error");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-[#1a3a8f] rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading Gorontalo outreach targets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* 1. Outreach Progression Bar & Filter Chips */}
      <OutreachProgressWidget
        schools={schools}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* 2. Interactive Gorontalo Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-600">
            Interactive Gorontalo Map ({filteredSchools.length} pins shown)
          </span>
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="text-[11px] font-bold text-[#1a3a8f] hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        <GorontaloOutreachMap
          schools={filteredSchools}
          selectedSchool={selectedSchool}
          onSelectSchool={setSelectedSchool}
          onOpenVisitModal={setModalSchool}
        />
      </div>

      {/* 3. Searchable Directory List */}
      <SchoolOutreachList
        schools={filteredSchools}
        onSelectSchool={setSelectedSchool}
        onOpenVisitModal={setModalSchool}
        onOpenAddModal={() => setShowAddModal(true)}
        onSeedSchools={schools.length === 0 ? handleSeedSchools : null}
        seeding={seeding}
      />

      {/* 4. Visit Modal */}
      {modalSchool && (
        <SchoolVisitModal
          school={modalSchool}
          currentUser={currentUser}
          onClose={() => setModalSchool(null)}
          onVisitLogged={() => {
            // Updated in real-time via Firestore snapshot
          }}
        />
      )}

      {/* 5. Add School Modal */}
      {showAddModal && (
        <AddSchoolModal
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
          onSchoolAdded={() => {
            // Updated in real-time via Firestore snapshot
          }}
        />
      )}
    </div>
  );
}
