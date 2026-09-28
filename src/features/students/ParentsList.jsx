import { useState, useEffect, useMemo, useCallback } from "react";
import { Pagination, usePagination, useToast } from "../shared";
import { fetchAllParents } from "../dashboard/usersRepository";
import { branchToId, idToBranch } from "../../constants/branches";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  Shield,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

/**
 * ParentsList.jsx
 * Read-only parent directory sub-view for administrators, branch managers,
 * and front-office desk staff.
 *
 * Scopes reads by branchId for non-admin roles to satisfy firestore.rules
 * isSameBranch constraints. Uses usePagination (20 records per page).
 */
export default function ParentsList({
  branchId = null,
  isAdmin = false,
  canView = true,
}) {
  const toast = useToast();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const normalizedBranchId = branchId ? branchToId(branchId) : null;

  useEffect(() => {
    let active = true;
    if (!canView) return;
    if (!isAdmin && !normalizedBranchId) {
      return;
    }

    fetchAllParents(normalizedBranchId)
      .then((data) => {
        if (active) {
          setParents(data || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load parents list:", err);
          const msg = err.message || "Failed to load parent accounts.";
          setError(msg);
          toast(msg, "error");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [canView, isAdmin, normalizedBranchId, refreshKey, toast]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  // Client-side search matching name, phone, email, and branch
  const filteredParents = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const name = (p.displayName || p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const branchName = (p.branch || idToBranch(p.branchId) || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        branchName.includes(q)
      );
    });
  }, [parents, search]);

  // Client-side pagination (20 records per page)
  const { page, setPage, totalPages, pageItems, from, to, total } = usePagination(
    filteredParents,
    20
  );

  if (!canView) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search parents by name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a8f]/20 focus:border-[#1a3a8f] transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh parents list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-extrabold tracking-wide shrink-0">
            {total} Parent{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg font-bold text-rose-900 cursor-pointer transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading parent accounts...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && pageItems.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No parent accounts found</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {search
              ? "No parent matches your search criteria. Try a different query."
              : "No authenticated parent accounts have been created for this branch yet."}
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      {!loading && !error && pageItems.length > 0 && (
        <>
          <div className="hidden md:block overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Parent Name &amp; Account</th>
                  <th className="py-3 px-4">Phone Contact</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4 text-center">Linked Children</th>
                  <th className="py-3 px-4 text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((p) => {
                  const childrenCount = Array.isArray(p.childStudentIds)
                    ? p.childStudentIds.length
                    : 0;
                  const branchName =
                    p.branch || idToBranch(p.branchId) || "Kota Gorontalo";
                  const status = p.status || "active";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(p.displayName || p.name || p.email || "P")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {p.displayName || p.name || "Unnamed Parent"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {p.email || p.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.phone ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{p.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No phone</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <MapPin className="w-2.5 h-2.5 text-slate-500" />
                          <span>{branchName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {childrenCount > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                            title={`Linked child IDs: ${(p.childStudentIds || []).join(", ")}`}
                          >
                            <Shield className="w-2.5 h-2.5 text-emerald-600" />
                            <span>
                              {childrenCount} student{childrenCount > 1 ? "s" : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            0 linked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-2.5">
            {pageItems.map((p) => {
              const childrenCount = Array.isArray(p.childStudentIds)
                ? p.childStudentIds.length
                : 0;
              const branchName =
                p.branch || idToBranch(p.branchId) || "Kota Gorontalo";
              const status = p.status || "active";

              return (
                <div
                  key={p.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {(p.displayName || p.name || p.email || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {p.displayName || p.name || "Unnamed Parent"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.email || p.id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                        status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{p.phone || "No phone"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        <span>{branchName}</span>
                      </span>

                      {childrenCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Shield className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{childrenCount} child{childrenCount > 1 ? "ren" : ""}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] text-amber-700 bg-amber-50">
                          0 children
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            from={from}
            to={to}
            total={total}
            label="parents"
          />
        </>
      )}
    </div>
  );
}
