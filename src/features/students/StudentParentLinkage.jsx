import { useState, useEffect, useCallback } from "react";
import {
  findParentsForStudent,
  fetchAllParents,
  createParentAccount,
  linkChildToParent,
  unlinkChildFromParent,
} from "../dashboard/usersRepository";
import { useToast, useConfirm } from "../shared";
import { branchToId } from "../../constants/branches";
import {
  Users,
  UserPlus,
  Link2,
  Unlink,
  Key,
  Loader2,
  CheckCircle2,
  Shield,
  Search,
} from "lucide-react";

export default function StudentParentLinkage({
  studentId,
  studentName = "Student",
  studentBranch = "kota_gorontalo",
  readOnly = false,
  initialModalOpen = false,
  onCloseModal = null,
}) {
  const toast = useToast();
  const confirm = useConfirm();

  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [showModal, setShowModal] = useState(initialModalOpen);
  const [modalTab, setModalTab] = useState("link_existing"); // "link_existing" | "create_new"
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Existing parents search state
  const [allParents, setAllParents] = useState([]);
  const [loadingAllParents, setLoadingAllParents] = useState(Boolean(initialModalOpen));
  const [searchParentQuery, setSearchParentQuery] = useState("");

  // New parent form state
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const reloadParents = useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
    setLoadingAllParents(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setActionError("");
    if (onCloseModal) onCloseModal();
  }, [onCloseModal]);

  useEffect(() => {
    let active = true;
    if (!studentId) return;

    findParentsForStudent(studentId)
      .then((data) => {
        if (active) {
          setParents(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load linked parents:", err);
          setActionError("Failed to fetch linked parents.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [studentId, refreshIndex]);

  // Load all parents when modal is opened to support linking existing accounts
  useEffect(() => {
    let active = true;
    if (!showModal) return;

    fetchAllParents()
      .then((data) => {
        if (active) {
          setAllParents(data || []);
          setLoadingAllParents(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load parents:", err);
          setLoadingAllParents(false);
        }
      });

    return () => {
      active = false;
    };
  }, [showModal]);

  const handleLinkExisting = async (parent) => {
    setSubmitting(true);
    setActionError("");
    try {
      await linkChildToParent(parent.id, studentId);
      toast(
        `Linked parent ${parent.displayName || parent.email} to ${studentName}!`,
        "success"
      );
      handleCloseModal();
      reloadParents();
    } catch (err) {
      console.error("Error linking existing parent:", err);
      const msg = err.message || "Failed to link parent account.";
      setActionError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateParent = async (e) => {
    e.preventDefault();
    if (!parentEmail || !parentPassword || !parentName) {
      toast("Please provide parent name, email, and password.", "error");
      return;
    }
    if (parentPassword.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }

    setSubmitting(true);
    setActionError("");
    try {
      const canonicalBranchId = branchToId(studentBranch);
      await createParentAccount(parentEmail, parentPassword, {
        displayName: parentName,
        phone: parentPhone,
        branchId: canonicalBranchId,
        initialChildStudentId: studentId,
      });

      toast(`Parent account created and linked for ${parentName}!`, "success");
      handleCloseModal();
      setParentName("");
      setParentEmail("");
      setParentPassword("");
      setParentPhone("");
      reloadParents();
    } catch (err) {
      console.error("Error creating parent account:", err);
      const msg = err.message || "Failed to create parent account.";
      setActionError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async (parent) => {
    if (readOnly) return;
    const ok = await confirm(
      `Unlink ${parent.displayName || parent.email} from ${studentName}? The parent account will remain active but will no longer have access to this student's records.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      await unlinkChildFromParent(parent.id, studentId);
      toast(`Unlinked parent ${parent.displayName || parent.email}.`, "info");
      reloadParents();
    } catch (err) {
      console.error("Error unlinking parent:", err);
      toast(err.message || "Failed to unlink parent.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!studentId) {
    return (
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase text-[11px]">
          <Users className="w-3.5 h-3.5 text-[#1a3a8f]" />
          <span>Authenticated Parent Accounts</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Parent accounts can be linked once the student profile has been created and saved.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#1a3a8f]" />
          <span>Authenticated Parent Accounts ({parents.length})</span>
        </h5>
        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#1a3a8f] hover:bg-[#152e72] rounded-lg transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3 h-3" />
            <span>Add Parent Account</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-4 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading parent linkages...
        </div>
      ) : parents.length === 0 ? (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
          No authenticated parent account linked to this student yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {parents.map((parent) => (
            <div
              key={parent.id}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs truncate">
                    {parent.displayName || "Parent"}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Shield className="w-2.5 h-2.5" /> Linked
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <span>{parent.email}</span>
                  {parent.phone && <span>• {parent.phone}</span>}
                </div>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleUnlink(parent)}
                  title="Unlink this parent"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0 ml-2"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Existing or Create New Parent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1a3a8f]" />
                  Parent Account for {studentName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Link an existing registered parent or create new authenticated credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setModalTab("link_existing")}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  modalTab === "link_existing"
                    ? "border-[#1a3a8f] text-[#1a3a8f]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link Existing Account</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("create_new")}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  modalTab === "create_new"
                    ? "border-[#1a3a8f] text-[#1a3a8f]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New Account</span>
              </button>
            </div>

            {/* TAB 1: LINK EXISTING PARENT ACCOUNT */}
            {modalTab === "link_existing" && (
              <div className="space-y-3 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search existing parent by name, email, or phone..."
                    value={searchParentQuery}
                    onChange={(e) => setSearchParentQuery(e.target.value)}
                    className="w-full p-2.5 pl-8 border rounded-xl bg-white text-xs border-slate-200 focus:border-[#1a3a8f] outline-hidden"
                  />
                </div>

                {loadingAllParents ? (
                  <div className="flex items-center justify-center p-6 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading parent accounts...
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {allParents
                      .filter((p) => {
                        const isAlreadyLinked = parents.some((lp) => lp.id === p.id);
                        if (isAlreadyLinked) return false;
                        const q = searchParentQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (p.displayName || "").toLowerCase().includes(q) ||
                          (p.email || "").toLowerCase().includes(q) ||
                          (p.phone || "").includes(q)
                        );
                      })
                      .map((parent) => (
                        <div
                          key={parent.id}
                          className="p-3 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white flex items-center justify-between gap-3 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 text-xs truncate">
                              {parent.displayName || "Parent"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{parent.email}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {parent.phone && <span>{parent.phone}</span>}
                              <span>
                                • {(parent.childStudentIds || []).length} student(s) linked
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleLinkExisting(parent)}
                            className="px-3 py-1.5 bg-[#1a3a8f] hover:bg-[#152e72] text-white rounded-lg text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {submitting ? "Linking..." : "Link to Student"}
                          </button>
                        </div>
                      ))}

                    {allParents.filter((p) => !parents.some((lp) => lp.id === p.id)).length ===
                      0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No unlinked parent accounts found.
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setModalTab("create_new")}
                            className="text-[#1a3a8f] font-bold hover:underline cursor-pointer"
                          >
                            Create a new parent account →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CREATE NEW PARENT ACCOUNT */}
            {modalTab === "create_new" && (
              <form onSubmit={handleCreateParent} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Parent Full Name (Nama Lengkap) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibu Linda Wijaya"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white text-xs border-slate-200 focus:border-[#1a3a8f] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Email (Login Username) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white text-xs border-slate-200 focus:border-[#1a3a8f] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Initial Password (Minimal 6 karakter) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      minLength={6}
                      placeholder="e.g. Liberty2026!"
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      className="w-full p-2.5 pl-8 border rounded-xl bg-white text-xs border-slate-200 focus:border-[#1a3a8f] outline-hidden font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    WhatsApp Phone (Nomor WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="08..."
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white text-xs border-slate-200 focus:border-[#1a3a8f] outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#1a3a8f] hover:bg-[#152e72] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Create &amp; Link
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
