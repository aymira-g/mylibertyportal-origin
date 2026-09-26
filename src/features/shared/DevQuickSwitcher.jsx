import { useState } from "react";
import {
  Zap,
  X,
  Eye,
  LogOut,
  Shield,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  isDevSwitcherEnabled,
  DEV_TEST_PASSWORD,
  MODE_1_TEST_ACCOUNTS,
  PREVIEW_ROLES,
} from "../auth/devPresets";
import { db, getSecondaryAuth } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

/**
 * DevQuickSwitcher: Floating widget providing:
 * 1. Mode 1: Authentic Firebase Auth Switcher (validates Firestore security rules & real data).
 * 2. Mode 2: Instant in-memory UI preview (fast layout/CSS inspection without network latency).
 */
export default function DevQuickSwitcher({
  currentUser,
  realRole,
  realDivision,
  realBranch,
  previewRole,
  previewDivision,
  onSetPreview,
  onClearPreview,
  onLogin,
  onLogout,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("preview"); // 'preview' | 'auth'
  const [mode1Error, setMode1Error] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionStatus, setProvisionStatus] = useState(null);
  const [authPassword, setAuthPassword] = useState(DEV_TEST_PASSWORD || "");

  if (!isDevSwitcherEnabled && realRole !== "admin") {
    return null;
  }

  const isPreviewActive = Boolean(previewRole);

  const handleMode1Switch = async (account) => {
    setMode1Error("");
    const password = authPassword || DEV_TEST_PASSWORD;
    if (!password) {
      setMode1Error(
        "Please enter the test account password below to switch."
      );
      return;
    }

    try {
      // Clear any preview override so the real account state is clean
      onClearPreview();
      await onLogin(account.email, password);
      setIsOpen(false);
    } catch (err) {
      if (err?.code === "auth/invalid-credential" || err?.message?.includes("invalid-credential")) {
        setMode1Error(
          `Account ${account.email} has not been created in Firebase yet. Sign in with your real Admin account and click "Create / Update All Test Accounts" below to initialize them.`
        );
      } else {
        setMode1Error(err?.message || "Failed to switch account.");
      }
    }
  };

  const handleProvisionAccounts = async () => {
    setProvisioning(true);
    setProvisionStatus(null);
    setMode1Error("");
    const password = authPassword || DEV_TEST_PASSWORD;
    if (!password) {
      setProvisionStatus({
        type: "error",
        message: "Please enter a test password below to create/update accounts.",
      });
      setProvisioning(false);
      return;
    }

    try {
      const secAuth = getSecondaryAuth();
      let createdCount = 0;
      let existingCount = 0;

      for (const acc of MODE_1_TEST_ACCOUNTS) {
        let uid = null;
        try {
          const cred = await createUserWithEmailAndPassword(secAuth, acc.email, password);
          uid = cred.user.uid;
          createdCount++;
        } catch (authErr) {
          if (authErr.code === "auth/email-already-in-use") {
            existingCount++;
          } else {
            console.warn("Error creating test user in Auth:", acc.email, authErr);
          }
        }

        if (uid) {
          await setDoc(
            doc(db, "users", uid),
            {
              displayName: `Test ${acc.label}`,
              nickname: acc.shortLabel || acc.label,
              email: acc.email,
              role: acc.role,
              division: acc.division,
              branchId: acc.branch,
              branch: "Kota Gorontalo",
              status: "active",
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      setProvisionStatus({
        type: "success",
        message: `Done! ${createdCount} accounts created in Firebase (${existingCount} already existed). Password: "${password}".`,
      });
    } catch (err) {
      setProvisionStatus({
        type: "error",
        message: `Provisioning failed: ${err.message}`,
      });
    } finally {
      setProvisioning(false);
    }
  };

  const handlePreviewRoleSelect = (roleKey) => {
    const roleDef = PREVIEW_ROLES.find((r) => r.role === roleKey);
    const div = roleDef?.supportsDivision ? previewDivision || realDivision || "studio" : "studio";
    onSetPreview(roleKey, div);
  };

  const handleToggleDivision = (targetDiv) => {
    onSetPreview(previewRole || realRole || "admin", targetDiv);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans print:hidden select-none">
      {/* ── Collapsed Trigger Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold shadow-lg transition-all transform active:scale-95 cursor-pointer border ${
            isPreviewActive
              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300 animate-pulse"
              : "bg-slate-900/90 hover:bg-slate-900 text-white border-slate-700/80 backdrop-blur-md"
          }`}
          title="Open Dev Quick Switcher"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>
            {isPreviewActive ? (
              <>Preview: {previewRole.toUpperCase()}</>
            ) : (
              <>Dev Switcher</>
            )}
          </span>
          {currentUser && (
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-700">
              {realRole || "user"}
            </span>
          )}
        </button>
      )}

      {/* ── Expanded Drawer / Popover ── */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wide uppercase text-slate-100">
                  Dev Quick Switcher
                </h4>
                <p className="text-[10px] text-slate-400">Testing & Security Rules</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close switcher"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Session Info Banner */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] truncate">
                <Shield className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">{currentUser ? currentUser.email : "Not signed in"}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                <span>Role: <strong className="text-slate-700">{realRole || "none"}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Building2 className="w-2.5 h-2.5" />
                  <strong className="text-slate-700">{realBranch || "kota_gorontalo"}</strong>
                </span>
              </div>
            </div>
            {currentUser && onLogout && (
              <button
                onClick={onLogout}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 p-1 rounded hover:bg-rose-50 transition cursor-pointer shrink-0"
                title="Log out current session"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            )}
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mode 2: UI Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("auth")}
              className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "auth"
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Mode 1: Real Auth</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-3.5 overflow-y-auto space-y-3 max-h-[60vh]">
            {/* ── Mode 2: UI Preview Tab ── */}
            {activeTab === "preview" && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-500 leading-tight">
                  Instant layout preview. Underlying auth session and Firestore writes remain unchanged.
                </div>

                {isPreviewActive && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-[11px]">Active Preview</p>
                        <p className="text-[10px] text-amber-800 truncate">
                          {previewRole?.toUpperCase()} · {previewDivision === "kindergarten" ? "Kindergarten" : "Studio"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClearPreview}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Exit
                    </button>
                  </div>
                )}

                {/* Division Switcher */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Division Variant
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleToggleDivision("studio")}
                      className={`py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        (previewDivision || realDivision) !== "kindergarten"
                          ? "bg-white text-indigo-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      English Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDivision("kindergarten")}
                      className={`py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        (previewDivision || realDivision) === "kindergarten"
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Kindergarten (TK)
                    </button>
                  </div>
                </div>

                {/* Role Picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Role Dashboard
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PREVIEW_ROLES.map((item) => {
                      const isSelected = previewRole === item.role;
                      return (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => handlePreviewRoleSelect(item.role)}
                          className={`text-left p-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-400"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Mode 1: Real Auth Switch Tab ── */}
            {activeTab === "auth" && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-slate-500 leading-tight">
                  Authenticates with genuine Firebase Auth tokens. Validates Firestore Security Rules and branch queries.
                </div>

                {mode1Error && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                    {mode1Error}
                  </div>
                )}

                {/* ── Test Account Password Input ── */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-slate-700 uppercase tracking-wider">
                      Test Account Password:
                    </span>
                    {DEV_TEST_PASSWORD && (
                      <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Default loaded
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      setMode1Error("");
                    }}
                    placeholder="Enter test password (e.g. 123456)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Used for 1-click test account switching and initial provisioning.
                  </p>
                </div>

                {/* ── 1-Click Provisioning (For Admins) ── */}
                {realRole === "admin" && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                    <span className="font-bold text-[11px] text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Admin: Provision Test Accounts
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Registers all {MODE_1_TEST_ACCOUNTS.length} test accounts in Firebase Auth and Firestore with password <code>{authPassword || DEV_TEST_PASSWORD || "(enter password above)"}</code> so 1-click login works.
                    </p>
                    <button
                      type="button"
                      disabled={provisioning || !(authPassword || DEV_TEST_PASSWORD)}
                      onClick={handleProvisionAccounts}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {provisioning ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Provisioning in Firebase...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>Create / Update All {MODE_1_TEST_ACCOUNTS.length} Test Accounts</span>
                        </>
                      )}
                    </button>
                    {provisionStatus && (
                      <div
                        className={`p-2 rounded-lg text-[10px] font-medium ${
                          provisionStatus.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {provisionStatus.message}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Sign In As Test Account
                  </label>
                  <div className="space-y-1.5">
                    {MODE_1_TEST_ACCOUNTS.map((acc) => {
                      const isCurrent = currentUser?.email === acc.email;
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          disabled={loading || isCurrent}
                          onClick={() => handleMode1Switch(acc)}
                          className={`w-full text-left p-2 rounded-xl text-xs border transition flex items-center justify-between cursor-pointer ${
                            isCurrent
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold"
                          } disabled:opacity-60`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{acc.label}</span>
                              {acc.division === "kindergarten" && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                  TK
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {acc.email}
                            </p>
                          </div>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                              Switch
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            Branch: <strong className="text-slate-600">{realBranch || "kota_gorontalo"}</strong> (Locked to user record)
          </div>
        </div>
      )}
    </div>
  );
}
