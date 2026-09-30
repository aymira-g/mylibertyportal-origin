import { useState } from "react";
import { auth } from "../../firebase";
import { getStars } from "../shared";
import { normalizeStaffDivision } from "../../constants/divisions";
import StudentPersonalFields from "./StudentPersonalFields";
import StudentAcademicFields from "./StudentAcademicFields";
import StudentTuitionFields from "./StudentTuitionFields";
import StudentFamilyFields from "./StudentFamilyFields";
import StaffProfileFields from "./StaffProfileFields";
import ParentProfileFields from "./ParentProfileFields";
import { CreditCard, ArrowLeft } from "lucide-react";

export default function UserForm({
  formData,
  setFormData,
  editId,
  onSubmit,
  onSaveAndCollectPayment = null,
  onCancel = null,
  onBack = null,
  students = [],
}) {
  const [submitting, setSubmitting] = useState(false);
  const handleBack = onCancel || onBack;
  const isSelf = Boolean(editId && auth.currentUser && editId === auth.currentUser.uid);
  const field = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const isStudent = formData.role === "student";
  const isParent = formData.role === "parent";

  const setAcademicLevel = (level) => {
    field("currentLevel", level);
    const stars = getStars(level);
    if (stars) {
      field("rating", String(stars));
    }
  };

  const handleDivisionChange = (newDiv) => {
    field("division", newDiv);
    if (
      newDiv === "kindergarten" &&
      (formData.role === "marketing" || formData.role === "officeboy")
    ) {
      field("role", "instructor");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCollectPaymentClick = async (e) => {
    if (onSaveAndCollectPayment) {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      try {
        await onSaveAndCollectPayment(e);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-sm text-sm border border-slate-200 w-full space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-start sm:items-center gap-2.5">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
              aria-label="Back to dashboard"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              {isStudent
                ? editId
                  ? "Edit Student Profile"
                  : "Student Registration"
                : isParent
                  ? editId
                    ? "Edit Parent Account"
                    : "Create Parent Account"
                  : editId
                    ? "Edit Staff Profile"
                    : "Automated Staff Account Creation"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStudent
                ? "Update student registration, academic details, and tuition plan."
                : isParent
                  ? "Manage parent contact details, branch affiliation, and linked students."
                  : "Create credentials and set permissions for staff."}
            </p>
          </div>
        </div>

        {/* Role & Division badges or edit indicators */}
        <div>
          {editId || isStudent || isParent ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`px-3 py-1 font-bold text-xs rounded-full uppercase ${
                  isParent
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-indigo-50 text-indigo-700"
                }`}
              >
                Role: {formData.role}
              </span>
              {!isStudent && !isParent && (
                <span className="px-3 py-1 bg-cyan-50 text-cyan-700 font-bold text-xs rounded-full uppercase">
                  Division:{" "}
                  {normalizeStaffDivision(formData.division) === "kindergarten"
                    ? "Kids School"
                    : normalizeStaffDivision(formData.division) === "all"
                    ? "All Divisions"
                    : "Courses"}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">New Account</span>
            </div>
          )}
        </div>
      </div>

      {isStudent ? (
        <div className="space-y-6">
          <StudentPersonalFields formData={formData} field={field} />
          <hr className="border-slate-100" />
          <StudentAcademicFields
            formData={formData}
            field={field}
            setAcademicLevel={setAcademicLevel}
            editId={editId}
          />
          <hr className="border-slate-100" />
          <StudentTuitionFields formData={formData} field={field} />
          <hr className="border-slate-100" />
          <StudentFamilyFields formData={formData} field={field} editId={editId} />
        </div>
      ) : isParent ? (
        <ParentProfileFields formData={formData} field={field} editId={editId} students={students} />
      ) : (
        <StaffProfileFields
          formData={formData}
          field={field}
          handleDivisionChange={handleDivisionChange}
          editId={editId}
          isSelf={isSelf}
        />
      )}

      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 sticky bottom-0 sm:static bg-white/95 backdrop-blur-md py-3 -mx-6 px-6 sm:p-0 border-t border-slate-100 sm:border-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none">
        {handleBack && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="w-full sm:w-auto min-h-12 px-5 py-3 rounded-xl font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-12 bg-[#1a3a8f] text-white p-3 rounded-xl font-bold hover:bg-[#122b6e] active:scale-[0.98] transition shadow-md cursor-pointer flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span>{editId ? "Saving Changes…" : "Registering…"}</span>
            </>
          ) : (
            <span>{editId ? "Update Profile" : "Create Account"}</span>
          )}
        </button>

        {isStudent && !editId && onSaveAndCollectPayment && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleCollectPaymentClick}
            className="w-full sm:w-auto min-h-12 px-5 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Save &amp; Open Cashier</span>
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
