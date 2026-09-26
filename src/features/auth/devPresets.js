/**
 * Configuration and presets for Development Quick Switcher (Mode 1 & Mode 2).
 * Strictly guarded: only active during development (import.meta.env.DEV).
 * Never enabled in production builds to prevent exposing test credentials.
 */

export const isDevSwitcherEnabled = Boolean(import.meta.env.DEV);

export const DEV_TEST_PASSWORD = import.meta.env.VITE_DEV_TEST_PASSWORD || "";


/**
 * Mode 1: Test accounts with actual Firestore /users/{uid} documents
 * for live security rules and data query verification.
 */
export const MODE_1_TEST_ACCOUNTS = [
  {
    label: "Admin",
    shortLabel: "Admin",
    email: "admin.test@myliberty.id",
    role: "admin",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    label: "Manager (Studio)",
    shortLabel: "Manager",
    email: "manager.test@myliberty.id",
    role: "manager",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    label: "Manager (TK)",
    shortLabel: "Manager · TK",
    email: "manager-tk.test@myliberty.id",
    role: "manager",
    division: "kindergarten",
    branch: "kota_gorontalo",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    label: "Instructor (Studio)",
    shortLabel: "Instructor",
    email: "instructor.test@myliberty.id",
    role: "instructor",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    label: "Instructor (TK)",
    shortLabel: "Instructor · TK",
    email: "instructor-tk.test@myliberty.id",
    role: "instructor",
    division: "kindergarten",
    branch: "kota_gorontalo",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    label: "Instructor Leader",
    shortLabel: "Inst. Leader",
    email: "instructorleader.test@myliberty.id",
    role: "instructorleader",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    label: "Front Office (Studio)",
    shortLabel: "Front Office",
    email: "frontoffice.test@myliberty.id",
    role: "frontoffice",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    label: "Front Office (TK)",
    shortLabel: "Front Office · TK",
    email: "frontoffice-tk.test@myliberty.id",
    role: "frontoffice",
    division: "kindergarten",
    branch: "kota_gorontalo",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    label: "Front Office Lead",
    shortLabel: "FO Lead",
    email: "frontofficelead.test@myliberty.id",
    role: "opslead",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Marketing",
    shortLabel: "Marketing",
    email: "marketing.test@myliberty.id",
    role: "marketing",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-200",
  },
  {
    label: "Office Boy",
    shortLabel: "Office Boy",
    email: "officeboy.test@myliberty.id",
    role: "officeboy",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    label: "Parent",
    shortLabel: "Parent",
    email: "parent.test@myliberty.id",
    role: "parent",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
];

/**
 * Mode 2: In-memory preview roles for rapid layout and UI testing.
 * All canonical roles supported by App.jsx dashboard router.
 * Fully aligned with MODE_1_TEST_ACCOUNTS (including Parent).
 */
export const PREVIEW_ROLES = [
  { label: "Admin", role: "admin", supportsDivision: false },
  { label: "Manager", role: "manager", supportsDivision: true },
  { label: "Instructor", role: "instructor", supportsDivision: true },
  { label: "Instructor Leader", role: "instructorleader", supportsDivision: true },
  { label: "Front Office", role: "frontoffice", supportsDivision: true },
  { label: "Ops Lead", role: "opslead", supportsDivision: true },
  { label: "Marketing", role: "marketing", supportsDivision: false },
  { label: "Office Boy", role: "officeboy", supportsDivision: false },
  { label: "Parent", role: "parent", supportsDivision: false },
];

export {
  LEGACY_ROLE_ALIASES,
  normalizeRoleAlias,
} from "../shared/roles";

/**
 * Mode 1 Legacy Alias Test Accounts:
 * Explicit accounts covering legacy role aliases for test suites, regression tests,
 * and emulator verification without cluttering the primary user-facing quick switcher UI.
 */
export const MODE_1_LEGACY_ALIAS_ACCOUNTS = [
  {
    label: "Front Office Lead (Legacy ops_lead)",
    shortLabel: "FO Lead · ops_lead",
    email: "opslead-legacy.test@myliberty.id",
    role: "ops_lead",
    canonicalRole: "opslead",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Front Office Lead (Legacy frontofficelead)",
    shortLabel: "FO Lead · frontofficelead",
    email: "frontofficelead-legacy.test@myliberty.id",
    role: "frontofficelead",
    canonicalRole: "opslead",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Instructor Leader (Legacy instructor_leader)",
    shortLabel: "Inst. Leader · instructor_leader",
    email: "instructorleader-legacy.test@myliberty.id",
    role: "instructor_leader",
    canonicalRole: "instructorleader",
    division: "studio",
    branch: "kota_gorontalo",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
];

