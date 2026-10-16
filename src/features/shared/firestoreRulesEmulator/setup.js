/**
 * Shared Test Harness & Fixtures for Real Firestore Rules Emulator Suites
 */
/* global process */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

export const RULES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../firestore.rules"
);
export const HAS_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export const USERS = {
  admin: { role: "admin", branchId: "kota_gorontalo" },
  mgrGto: { role: "manager", branchId: "kota_gorontalo", division: "courses" },
  mgrCoursesGto: { role: "manager", branchId: "kota_gorontalo", division: "courses" },
  mgrKgGto: { role: "manager", branchId: "kota_gorontalo", division: "kindergarten" },
  mgrBoba: { role: "manager", branchId: "bone_bolango", division: "courses" },
  foGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "courses" },
  foCoursesGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "courses" },
  foKgGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "kindergarten" },
  allFOGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "all" },
  foMissingGto: { role: "frontoffice", branchId: "kota_gorontalo" },
  foInvalidGto: { role: "frontoffice", branchId: "kota_gorontalo", division: "operations" },
  foBoba: { role: "frontoffice", branchId: "bone_bolango", division: "courses" },
  foResigned: { role: "frontoffice", branchId: "kota_gorontalo", status: "resigned" },
  foTerminated: { role: "frontoffice", branchId: "kota_gorontalo", status: "terminated" },
  foKg: { role: "frontoffice", branchId: "kota_gorontalo", division: "kindergarten" },
  foUnassigned: { role: "frontoffice" },
  mgrUnassigned: { role: "manager" },
  insUnassigned: { role: "instructor" },
  insGto: { role: "instructor", branchId: "kota_gorontalo" },
  opsGto: { role: "opslead", branchId: "kota_gorontalo", division: "all" },
  opsCoursesGto: { role: "opslead", branchId: "kota_gorontalo", division: "courses" },
  opsKgGto: { role: "opslead", branchId: "kota_gorontalo", division: "kindergarten" },
  opsMissingGto: { role: "opslead", branchId: "kota_gorontalo" },
  opsInvalidGto: { role: "opslead", branchId: "kota_gorontalo", division: "operations" },
  dirGto: { role: "director", branchId: "kota_gorontalo" },
  vdGto: { role: "vice_director", branchId: "kota_gorontalo" },
  bmGto: { role: "branch_manager", branchId: "kota_gorontalo" },
  ilGto: { role: "instructorleader", branchId: "kota_gorontalo", division: "kindergarten" },
  ilLegacyGto: { role: "instructor_leader", branchId: "kota_gorontalo" },
  ilBoba: { role: "instructorleader", branchId: "bone_bolango" },
  ilResigned: { role: "instructorleader", branchId: "kota_gorontalo", status: "resigned" },
  mktGto: { role: "marketing", branchId: "kota_gorontalo" },
  obGto: { role: "officeboy", branchId: "kota_gorontalo" },
  cleanerGto: { role: "cleaner", branchId: "kota_gorontalo" },
  parent1: { role: "parent", branchId: "kota_gorontalo", childStudentIds: ["student1"] },
  parent2: { role: "parent", branchId: "bone_bolango", childStudentIds: ["student2"] },
  parentActive: {
    role: "parent",
    branchId: "kota_gorontalo",
    childStudentIds: ["student1"],
    status: "active",
  },
  parentInactive: {
    role: "parent",
    branchId: "kota_gorontalo",
    childStudentIds: ["student1"],
    status: "inactive",
  },
  parentSuspended: {
    role: "parent",
    branchId: "kota_gorontalo",
    childStudentIds: ["student1"],
    status: "suspended",
  },
  student1: { role: "student", branchId: "kota_gorontalo" },
  student2: { role: "student", branchId: "bone_bolango" },
};

export const FRONT_OFFICE_PROFILE_UID = "frontOfficeOwnProfile";
export const FRONT_OFFICE_PROFILE = {
  role: "frontoffice",
  division: "kindergarten",
  branch: "Kota Gorontalo",
  branchId: "kota_gorontalo",
  status: "active",
};

export const PAYMENT_KOTA = { studentId: "student1", branchId: "kota_gorontalo", amount: 449000 };

export const APPROVAL_KOTA = {
  actionId: "TUITION_PLAN_CHANGE",
  status: "pending",
  mode: "blocking",
  approverRole: "manager",
  approverBranchId: "kota_gorontalo",
  requestedBy: "FO Budi",
  requestedByUid: "foGto",
  requestedAt: "2026-09-20T01:00:00.000Z",
  payload: null,
};

export const APPROVAL_BOBA = {
  ...APPROVAL_KOTA,
  approverBranchId: "bone_bolango",
  requestedByUid: "foBoba",
};

export const SHIFT_KOTA = {
  userId: "insGto",
  role: "instructor",
  branchId: "kota_gorontalo",
  clockIn: "2026-09-21T01:00:00.000Z",
  clockOut: null,
};

export const APPROVED_CORRECTION = {
  actionId: "STAFF_SHIFT_SELF_CORRECTION",
  status: "approved",
  mode: "blocking",
  approverRole: "manager",
  approverBranchId: "kota_gorontalo",
  requestedBy: "Ms. Rina",
  requestedByUid: "insGto",
  decidedBy: "Manager",
  decidedByUid: "mgrGto",
  payload: {
    shiftId: "shift1",
    beforeShift: { clockIn: "2026-09-21T01:00:00.000Z" },
    afterData: { clockIn: "2026-09-21T00:30:00.000Z" },
  },
};

export async function setupEmulatorHarness(projectId) {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(RULES_PATH, "utf8") },
  });

  const authed = (uid) => testEnv.authenticatedContext(uid).firestore();

  const seedDoc = async (pathSegments, data) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const [col, ...rest] = pathSegments;
      await setDoc(doc(ctx.firestore(), col, ...rest), data);
    });
  };

  const seedUsers = async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const [uid, data] of Object.entries(USERS)) {
        await setDoc(doc(db, "users", uid), { displayName: uid, ...data });
      }
    });
  };

  return { testEnv, authed, seedDoc, seedUsers };
}
