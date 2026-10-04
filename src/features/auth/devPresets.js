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
    label: "Director",
    shortLabel: "Director",
    email: "director.test@myliberty.id",
    role: "director",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  {
    label: "Vice Director",
    shortLabel: "Vice Dir",
    email: "vicedirector.test@myliberty.id",
    role: "vice_director",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-violet-100 text-violet-900 border-violet-200",
  },
  {
    label: "Admin",
    shortLabel: "Admin",
    email: "admin.test@myliberty.id",
    role: "admin",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    // Role: Manager | Division: Courses
    label: "Manager · Courses",
    shortLabel: "Manager",
    email: "manager.test@myliberty.id",
    role: "manager",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    // Role: Manager | Division: Kindergarten
    label: "Manager · Kindergarten",
    shortLabel: "Manager · Kindergarten",
    email: "manager-tk.test@myliberty.id",
    role: "manager",
    division: "kindergarten",
    branch: "kota_gorontalo",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    // Role: Instructor | Division: Courses
    label: "Instructor · Courses",
    shortLabel: "Instructor",
    email: "instructor.test@myliberty.id",
    role: "instructor",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    // Role: Instructor | Division: Kindergarten
    label: "Instructor · Kindergarten",
    shortLabel: "Instructor · Kindergarten",
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
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    // Role: Front Office | Division: Courses
    label: "Front Office · Courses",
    shortLabel: "Front Office",
    email: "frontoffice.test@myliberty.id",
    role: "frontoffice",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    // Role: Front Office | Division: Kindergarten
    label: "Front Office · Kindergarten",
    shortLabel: "Front Office · Kindergarten",
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
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Marketing",
    shortLabel: "Marketing",
    email: "marketing.test@myliberty.id",
    role: "marketing",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-200",
  },
  {
    label: "Office Boy",
    shortLabel: "Office Boy",
    email: "officeboy.test@myliberty.id",
    role: "officeboy",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
  },
  {
    label: "Parent",
    shortLabel: "Parent",
    email: "parent.test@myliberty.id",
    role: "parent",
    division: "courses",
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
  { label: "Director", role: "director", supportsDivision: false },
  { label: "Vice Director", role: "vice_director", supportsDivision: false },
  { label: "Admin", role: "admin", supportsDivision: false },
  { label: "Manager", role: "manager", supportsDivision: true },
  { label: "Instructor", role: "instructor", supportsDivision: true },
  { label: "Instructor Leader", role: "instructorleader", supportsDivision: true },
  { label: "Front Office", role: "frontoffice", supportsDivision: true },
  { label: "Ops Lead", role: "opslead", supportsDivision: true },
  // marketing now supports courses | kindergarten | all
  { label: "Marketing", role: "marketing", supportsDivision: true },
  // officeboy is division-independent (null); no division toggle needed
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
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Front Office Lead (Legacy frontofficelead)",
    shortLabel: "FO Lead · frontofficelead",
    email: "frontofficelead-legacy.test@myliberty.id",
    role: "frontofficelead",
    canonicalRole: "opslead",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  {
    label: "Instructor Leader (Legacy instructor_leader)",
    shortLabel: "Inst. Leader · instructor_leader",
    email: "instructorleader-legacy.test@myliberty.id",
    role: "instructor_leader",
    canonicalRole: "instructorleader",
    division: "courses",
    branch: "kota_gorontalo",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
];

