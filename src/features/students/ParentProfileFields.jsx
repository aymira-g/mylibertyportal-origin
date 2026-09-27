import { STANDARD_BRANCHES } from "../staff/staffUtils";
import { normalizeBranch } from "../../constants/branches";
import { Shield, Users, AlertCircle } from "lucide-react";

/**
 * ParentProfileFields.jsx
 * Profile form fields specific to authenticated parent accounts.
 * Provides parent personal info, contact info, branch, account status,
 * and a summary of linked children.
 * Statically preserves role: "parent" without exposing staff roles or divisions.
 */
export default function ParentProfileFields({ formData, field, editId }) {
  const linkedCount = Array.isArray(formData.childStudentIds)
    ? formData.childStudentIds.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Role Protection Banner */}
      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-emerald-900">Authenticated Parent Account</span>
            <p className="text-[11px] text-emerald-700">
              Role is permanently assigned as Parent. Permissions and child linkages are strictly controlled.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase shrink-0">
          Role: Parent
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Full Name */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Parent Full Name (Nama Lengkap) *
          </label>
          <input
            type="text"
            placeholder="e.g. Ibu Linda Wijaya"
            value={formData.displayName || ""}
            onChange={(e) => field("displayName", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Email (Login Account) *
          </label>
          <input
            type="email"
            placeholder="parent@example.com"
            value={formData.email || ""}
            onChange={(e) => field("email", e.target.value)}
            disabled={Boolean(editId)}
            className={`w-full p-2.5 border rounded-xl ${
              editId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
            }`}
            required
          />
          {editId && (
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Login email cannot be changed directly.
            </span>
          )}
        </div>

        {/* WhatsApp Phone */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            WhatsApp Phone Number
          </label>
          <input
            type="tel"
            placeholder="08..."
            value={formData.phone || ""}
            onChange={(e) => field("phone", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>

        {/* Branch */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Branch *
          </label>
          <select
            value={normalizeBranch(formData.branch || "Kota Gorontalo")}
            onChange={(e) => {
              field("branch", e.target.value);
              field("branchId", e.target.value.toLowerCase().replace(/\s+/g, "_"));
            }}
            disabled={Boolean(editId)}
            className={`w-full p-2.5 border rounded-xl font-bold ${
              editId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
            }`}
            required
          >
            {STANDARD_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          {editId && (
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Branch cannot be changed for an existing parent account.
            </span>
          )}
        </div>

        {/* Account Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Account Status
          </label>
          <select
            value={formData.status || "active"}
            onChange={(e) => field("status", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-white font-bold"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Linked Children Summary */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Linked Children ({linkedCount})
          </span>
          <span className="text-[10px] text-slate-500">
            Managed via Student Roster
          </span>
        </div>
        {linkedCount > 0 ? (
          <div className="text-[11px] text-slate-600 space-y-1">
            <p>
              This parent account is linked to {linkedCount} student profile{linkedCount > 1 ? "s" : ""}.
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.childStudentIds.map((cid) => (
                <span
                  key={cid}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]"
                >
                  {cid}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>No children linked yet. Link children from the Student Profile screen.</span>
          </div>
        )}
      </div>
    </div>
  );
}
