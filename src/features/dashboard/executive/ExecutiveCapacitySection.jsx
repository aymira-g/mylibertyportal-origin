import { BookOpen } from "lucide-react";
import { TuitionDueWidget } from "../frontoffice";
import { AvailableBatches } from "../../classes";

/**
 * ExecutiveCapacitySection: Displays cohort capacity utilization and tuition due / expiry alerts.
 */
export function ExecutiveCapacitySection({
  filteredStudents = [],
  filteredClasses = [],
  instructors = [],
  users = [],
  selectedBranch = "all",
  role = "director",
  showTuitionDueList = true,
  onNavigateToStudents,
  onNavigateToClasses,
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1a3a8f]" />
            Academy Operations &amp; Capacity
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {selectedBranch === "all"
              ? "Province-wide tuition renewal alerts, batch availability, and cohort capacity."
              : `Focused view for ${selectedBranch}: tuition renewal alerts and cohort capacity.`}
          </p>
        </div>
        {selectedBranch !== "all" && (
          <span className="text-xs font-bold bg-blue-50 text-[#1a3a8f] px-2.5 py-1 rounded-lg border border-blue-200">
            Scoping: {selectedBranch}
          </span>
        )}
      </div>

      {/* Tuition Due / Expiry Alerts (Only shown for operational roles that manage renewals) */}
      {showTuitionDueList && (
        <TuitionDueWidget
          students={filteredStudents}
          onNavigateToStudents={onNavigateToStudents}
        />
      )}

      {/* Available Batches & Capacity Overview */}
      <AvailableBatches
        classes={filteredClasses}
        instructors={instructors}
        users={users}
        canEdit={false}
        role={role}
        isOverviewWidget={true}
        onNavigateToClasses={onNavigateToClasses}
      />
    </div>
  );
}
