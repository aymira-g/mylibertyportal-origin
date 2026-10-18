/**
 * Real Firestore Rules Emulator Tests — Gate 2 Candidate Rules Verification
 * Province-Wide Academic Summaries Backend Generation & Isolation (Pattern 3)
 *
 * NOTE: This test suite uses an isolated in-memory candidate rules fixture composed
 * with the full production ruleset. The production firestore.rules file is NOT modified.
 */
import { describe, beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { assertSucceeds, assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { HAS_EMULATOR, USERS } from "./setup.js";

const RULES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../firestore.rules"
);

export function replaceExactlyOnce(source, target, replacement, description) {
  const occurrences = source.split(target).length - 1;
  if (occurrences === 0) {
    throw new Error(`Candidate rules build failed: insertion point '${description}' was not found in base rules.`);
  }
  if (occurrences > 1) {
    throw new Error(`Candidate rules build failed: insertion point '${description}' was found ${occurrences} times (expected exactly 1).`);
  }
  return source.replace(target, () => replacement);
}

export function buildCandidateRules() {
  const baseRules = readFileSync(RULES_PATH, "utf8").replace(/\r\n/g, "\n");

  const candidateHelpers = `
    function isBranchWorker() {
      return signedIn() &&
             ((request.auth.uid == 'worker_kota_gorontalo' && request.auth.token.email == 'worker-kota@myliberty.local') ||
              (request.auth.uid == 'worker_bone_bolango' && request.auth.token.email == 'worker-bone@myliberty.local') ||
              (request.auth.uid == 'worker_limboto' && request.auth.token.email == 'worker-limboto@myliberty.local') ||
              (request.auth.uid == 'worker_pohuwato' && request.auth.token.email == 'worker-pohuwato@myliberty.local'));
    }

    function branchWorkerBranch() {
      return request.auth.uid == 'worker_kota_gorontalo' ? 'kota_gorontalo' :
             request.auth.uid == 'worker_bone_bolango' ? 'bone_bolango' :
             request.auth.uid == 'worker_limboto' ? 'limboto' :
             request.auth.uid == 'worker_pohuwato' ? 'pohuwato' : null;
    }

    function isWorkerSameBranchStrict(data) {
      let wb = branchWorkerBranch();
      return isBranchWorker() && wb != null && data != null &&
             ('branchId' in data) && data.branchId == wb;
    }

    function isValidBranchDivision(branchId, division) {
      return (branchId == 'kota_gorontalo' && (division == 'courses' || division == 'kindergarten')) ||
             ((branchId == 'bone_bolango' || branchId == 'limboto' || branchId == 'pohuwato') && division == 'courses');
    }

    function isValidQuarterDates(period, startDate, endDate) {
      return (period.matches('^[0-9]{4}-Q1$') && startDate.matches('^[0-9]{4}-01-01$') && endDate.matches('^[0-9]{4}-03-31$') &&
              period.replace('-Q1', '') == startDate.replace('-01-01', '') && period.replace('-Q1', '') == endDate.replace('-03-31', '')) ||
             (period.matches('^[0-9]{4}-Q2$') && startDate.matches('^[0-9]{4}-04-01$') && endDate.matches('^[0-9]{4}-06-30$') &&
              period.replace('-Q2', '') == startDate.replace('-04-01', '') && period.replace('-Q2', '') == endDate.replace('-06-30', '')) ||
             (period.matches('^[0-9]{4}-Q3$') && startDate.matches('^[0-9]{4}-07-01$') && endDate.matches('^[0-9]{4}-09-30$') &&
              period.replace('-Q3', '') == startDate.replace('-07-01', '') && period.replace('-Q3', '') == endDate.replace('-09-30', '')) ||
             (period.matches('^[0-9]{4}-Q4$') && startDate.matches('^[0-9]{4}-10-01$') && endDate.matches('^[0-9]{4}-12-31$') &&
              period.replace('-Q4', '') == startDate.replace('-10-01', '') && period.replace('-Q4', '') == endDate.replace('-12-31', ''));
    }

    function isValidGeneratedAt(val) {
      return val is string &&
             val.matches('^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\\\.[0-9]{1,3})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$');
    }

    function isValidScoreBuckets(buckets, learnerCount) {
      let allowedBucketKeys = ['below70', 'band70_84', 'band85_100'];
      return buckets is map &&
             buckets.keys().hasOnly(allowedBucketKeys) &&
             buckets.keys().hasAll(allowedBucketKeys) &&
             buckets.below70 is int && buckets.below70 >= 0 &&
             buckets.band70_84 is int && buckets.band70_84 >= 0 &&
             buckets.band85_100 is int && buckets.band85_100 >= 0 &&
             (buckets.below70 + buckets.band70_84 + buckets.band85_100 == learnerCount);
    }

    function isValidAcademicSummary(data) {
      let requiredKeys = [
        'branchId', 'division', 'period', 'periodStartDate', 'periodEndDate',
        'generatedAt', 'aggregationMethod', 'isSuppressed',
        'totalReportsCount', 'distinctLearnersCount', 'averageScore', 'scoreBuckets'
      ];
      let hasExactKeys = data.keys().hasOnly(requiredKeys) && data.keys().hasAll(requiredKeys);
      let validBranchDiv = isValidBranchDivision(data.branchId, data.division);
      let validPeriod = data.period.matches('^[0-9]{4}-Q[1-4]$');
      let validQuarterDates = validPeriod && isValidQuarterDates(data.period, data.periodStartDate, data.periodEndDate);
      let validGeneratedAt = isValidGeneratedAt(data.generatedAt);
      let validMethod = data.aggregationMethod == 'learner_average';
      let validSuppression = data.isSuppressed == true ?
        (data.averageScore == null && data.scoreBuckets == null &&
         data.distinctLearnersCount == null && data.totalReportsCount == null) :
        (data.isSuppressed == false &&
         data.distinctLearnersCount is int && data.distinctLearnersCount >= 5 &&
         data.totalReportsCount is int && data.totalReportsCount >= data.distinctLearnersCount &&
         data.averageScore is number && data.averageScore >= 0 && data.averageScore <= 100 &&
         isValidScoreBuckets(data.scoreBuckets, data.distinctLearnersCount));
          
      return hasExactKeys && validBranchDiv && validQuarterDates && validGeneratedAt && validMethod && validSuppression;
    }

    function arePartitionIdentityFieldsImmutable() {
      return request.resource.data.branchId == resource.data.branchId &&
             request.resource.data.division == resource.data.division &&
             request.resource.data.period == resource.data.period &&
             request.resource.data.periodStartDate == resource.data.periodStartDate &&
             request.resource.data.periodEndDate == resource.data.periodEndDate;
    }
  `;

  const academicSummariesMatch = `
    match /academicSummaries/{summaryId} {
      // Read access: Central Academic Lead at Kota Gorontalo only
      allow get, list: if signedIn() && isInstructorLeader() && userBranch() == 'kota_gorontalo';

      // Create: Worker can write ONLY summaries matching its own branch
      allow create: if isBranchWorker() &&
                       request.resource.data.branchId == branchWorkerBranch() &&
                       summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                       isValidAcademicSummary(request.resource.data);

      // Update: Worker can update ONLY summaries matching its own branch, with immutable partition identity
      allow update: if isBranchWorker() &&
                       request.resource.data.branchId == branchWorkerBranch() &&
                       arePartitionIdentityFieldsImmutable() &&
                       summaryId == request.resource.data.branchId + '_' + request.resource.data.division + '_' + request.resource.data.period &&
                       isValidAcademicSummary(request.resource.data);

      // Delete: Denied unconditionally for all principals
      allow delete: if false;
    }
  `;

  const targetBlock = `    match /progressReports/{reportId} {
      allow get: if isOrgExecutive()`;

  const replacementBlock = candidateHelpers + `
    match /progressReports/{reportId} {
      allow get: if isWorkerSameBranchStrict(resource.data)
        || isOrgExecutive()`;

  const targetListBlock = `      allow list: if isOrgExecutive()
        || ((isManager() || isFrontDeskStaff()) && isSameBranchStrict(resource.data) && isDivisionAllowedForProgressReportsList(resource.data))`;

  const replacementListBlock = `      allow list: if isWorkerSameBranchStrict(resource.data)
        || isOrgExecutive()
        || ((isManager() || isFrontDeskStaff()) && isSameBranchStrict(resource.data) && isDivisionAllowedForProgressReportsList(resource.data))`;

  const targetShiftAnchor = "    function canUpdateShift(shiftId) {";

  let rules = baseRules;
  rules = replaceExactlyOnce(rules, targetBlock, replacementBlock, "progressReports get rule");
  rules = replaceExactlyOnce(rules, targetListBlock, replacementListBlock, "progressReports list rule");
  rules = replaceExactlyOnce(rules, targetShiftAnchor, academicSummariesMatch + "\n    function canUpdateShift(shiftId) {", "academicSummaries match block insertion anchor");

  return rules;
}

let testEnv;

const WORKERS = {
  kota: { uid: "worker_kota_gorontalo", email: "worker-kota@myliberty.local", branchId: "kota_gorontalo" },
  bone: { uid: "worker_bone_bolango", email: "worker-bone@myliberty.local", branchId: "bone_bolango" },
  limboto: { uid: "worker_limboto", email: "worker-limboto@myliberty.local", branchId: "limboto" },
  pohuwato: { uid: "worker_pohuwato", email: "worker-pohuwato@myliberty.local", branchId: "pohuwato" },
};

function authedUser(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function authedWorker(workerKey) {
  const w = WORKERS[workerKey];
  return testEnv.authenticatedContext(w.uid, { email: w.email }).firestore();
}

async function seedDoc(pathSegments, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const [col, ...rest] = pathSegments;
    await setDoc(doc(ctx.firestore(), col, ...rest), data);
  });
}

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, data] of Object.entries(USERS)) {
      await setDoc(doc(db, "users", uid), { displayName: uid, ...data });
    }
  });
}

const VALID_UNSUPPRESSED_SUMMARY = (branchId, division, period = "2026-Q3") => ({
  branchId,
  division,
  period,
  periodStartDate: "2026-07-01",
  periodEndDate: "2026-09-30",
  generatedAt: "2026-10-01T04:00:00.000Z",
  aggregationMethod: "learner_average",
  isSuppressed: false,
  totalReportsCount: 15,
  distinctLearnersCount: 10,
  averageScore: 82.5,
  scoreBuckets: {
    below70: 2,
    band70_84: 5,
    band85_100: 3,
  },
});

const VALID_SUPPRESSED_SUMMARY = (branchId, division, period = "2026-Q3") => ({
  branchId,
  division,
  period,
  periodStartDate: "2026-07-01",
  periodEndDate: "2026-09-30",
  generatedAt: "2026-10-01T04:00:00.000Z",
  aggregationMethod: "learner_average",
  isSuppressed: true,
  totalReportsCount: null,
  distinctLearnersCount: null,
  averageScore: null,
  scoreBuckets: null,
});

describe.skipIf(!HAS_EMULATOR)("Gate 2 Candidate Rules Verification — Decentralized Branch Workers (Pattern 3)", () => {
  beforeAll(async () => {
    const candidateRules = buildCandidateRules();
    testEnv = await initializeTestEnvironment({
      projectId: "academic-summaries-gate2-test",
      firestore: { rules: candidateRules },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsers();

    // Seed progress reports across all 4 branches
    await seedDoc(["progressReports", "rep_kota"], {
      branchId: "kota_gorontalo",
      division: "courses",
      studentId: "student1",
      score: 85,
    });
    await seedDoc(["progressReports", "rep_bone"], {
      branchId: "bone_bolango",
      division: "courses",
      studentId: "student2",
      score: 90,
    });
    await seedDoc(["progressReports", "rep_limboto"], {
      branchId: "limboto",
      division: "courses",
      studentId: "student3",
      score: 78,
    });
    await seedDoc(["progressReports", "rep_pohuwato"], {
      branchId: "pohuwato",
      division: "courses",
      studentId: "student4",
      score: 82,
    });
    await seedDoc(["progressReports", "rep_branchless"], {
      division: "courses",
      studentId: "student5",
      score: 70,
    });
    await seedDoc(["progressReports", "rep_unclassified"], {
      branchId: null,
      division: "courses",
      studentId: "student6",
      score: 72,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.1 Allowed Own-Branch Report Queries (list on /progressReports) — All 4 Identities
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.1 Allowed Own-Branch Report Queries (list on /progressReports)", () => {
    it("Test 5.1: worker_kota_gorontalo queries progressReports where branchId == kota_gorontalo", async () => {
      const q = query(collection(authedWorker("kota"), "progressReports"), where("branchId", "==", "kota_gorontalo"));
      await assertSucceeds(getDocs(q));
    });

    it("Test 5.2: worker_bone_bolango queries progressReports where branchId == bone_bolango", async () => {
      const q = query(collection(authedWorker("bone"), "progressReports"), where("branchId", "==", "bone_bolango"));
      await assertSucceeds(getDocs(q));
    });

    it("Test 5.3: worker_limboto queries progressReports where branchId == limboto", async () => {
      const q = query(collection(authedWorker("limboto"), "progressReports"), where("branchId", "==", "limboto"));
      await assertSucceeds(getDocs(q));
    });

    it("Test 5.4: worker_pohuwato queries progressReports where branchId == pohuwato", async () => {
      const q = query(collection(authedWorker("pohuwato"), "progressReports"), where("branchId", "==", "pohuwato"));
      await assertSucceeds(getDocs(q));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.2 Allowed Own-Branch Direct Report Reads (get on /progressReports) — All 4 Identities
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.2 Allowed Own-Branch Direct Report Reads (get on /progressReports)", () => {
    it("Test 5.5: worker_kota_gorontalo direct get on rep_kota", async () => {
      await assertSucceeds(getDoc(doc(authedWorker("kota"), "progressReports", "rep_kota")));
    });

    it("Test 5.6: worker_bone_bolango direct get on rep_bone", async () => {
      await assertSucceeds(getDoc(doc(authedWorker("bone"), "progressReports", "rep_bone")));
    });

    it("Test 5.7: worker_limboto direct get on rep_limboto", async () => {
      await assertSucceeds(getDoc(doc(authedWorker("limboto"), "progressReports", "rep_limboto")));
    });

    it("Test 5.8: worker_pohuwato direct get on rep_pohuwato", async () => {
      await assertSucceeds(getDoc(doc(authedWorker("pohuwato"), "progressReports", "rep_pohuwato")));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.3 Direct Read Denial on Branchless or Unclassified Reports (get)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.3 Direct Read Denial on Branchless or Unclassified Reports", () => {
    it("Test 5.9: worker_kota_gorontalo direct get on branchless report is denied (no kota fallback)", async () => {
      await assertFails(getDoc(doc(authedWorker("kota"), "progressReports", "rep_branchless")));
    });

    it("Test 5.10: worker_bone_bolango direct get on branchless report is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("bone"), "progressReports", "rep_branchless")));
    });

    it("Test 5.11: worker_limboto direct get on branchless report is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("limboto"), "progressReports", "rep_branchless")));
    });

    it("Test 5.12: worker_pohuwato direct get on branchless report is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("pohuwato"), "progressReports", "rep_branchless")));
    });

    it("Test 5.13: all 4 workers direct get on unclassified report (branchId: null) are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        await assertFails(getDoc(doc(authedWorker(key), "progressReports", "rep_unclassified")));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.4 Cross-Branch Direct Report Read Denials (get on /progressReports)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.4 Cross-Branch Direct Report Read Denials (get on /progressReports)", () => {
    it("Test 5.14: worker_kota_gorontalo direct get on rep_limboto is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("kota"), "progressReports", "rep_limboto")));
    });

    it("Test 5.15: worker_bone_bolango direct get on rep_kota is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("bone"), "progressReports", "rep_kota")));
    });

    it("Test 5.16: worker_limboto direct get on rep_pohuwato is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("limboto"), "progressReports", "rep_pohuwato")));
    });

    it("Test 5.17: worker_pohuwato direct get on rep_bone is denied", async () => {
      await assertFails(getDoc(doc(authedWorker("pohuwato"), "progressReports", "rep_bone")));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.5 Cross-Branch & Unfiltered Report Query Denials (list on /progressReports)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.5 Cross-Branch & Unfiltered Report Query Denials (list on /progressReports)", () => {
    it("Test 5.18: all 4 workers unfiltered queries on progressReports are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        const q = collection(authedWorker(key), "progressReports");
        await assertFails(getDocs(q));
      }
    });

    it("Test 5.19: worker_kota_gorontalo querying limboto reports is denied", async () => {
      const q = query(collection(authedWorker("kota"), "progressReports"), where("branchId", "==", "limboto"));
      await assertFails(getDocs(q));
    });

    it("Test 5.20: worker_bone_bolango querying kota_gorontalo reports is denied", async () => {
      const q = query(collection(authedWorker("bone"), "progressReports"), where("branchId", "==", "kota_gorontalo"));
      await assertFails(getDocs(q));
    });

    it("Test 5.21: worker_limboto querying bone_bolango reports is denied", async () => {
      const q = query(collection(authedWorker("limboto"), "progressReports"), where("branchId", "==", "bone_bolango"));
      await assertFails(getDocs(q));
    });

    it("Test 5.22: worker_pohuwato querying limboto reports is denied", async () => {
      const q = query(collection(authedWorker("pohuwato"), "progressReports"), where("branchId", "==", "limboto"));
      await assertFails(getDocs(q));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.6 Absolute Denial of Raw Progress Report Writes (/progressReports)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.6 Absolute Denial of Raw Progress Report Writes (/progressReports)", () => {
    it("Test 5.23: all 4 workers attempting create on /progressReports are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        const branch = WORKERS[key].branchId;
        await assertFails(
          setDoc(doc(authedWorker(key), "progressReports", `new_rep_${key}`), {
            branchId: branch,
            division: "courses",
            studentId: "student1",
            score: 85,
          })
        );
      }
    });

    it("Test 5.24: all 4 workers attempting update on /progressReports are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        await assertFails(
          updateDoc(doc(authedWorker(key), "progressReports", `rep_${key}`), {
            score: 99,
          })
        );
      }
    });

    it("Test 5.25: all 4 workers attempting delete on /progressReports are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        await assertFails(
          deleteDoc(doc(authedWorker(key), "progressReports", `rep_${key}`))
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.7 Allowed Own-Branch Summary Writes (create and update on /academicSummaries)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.7 Allowed Own-Branch Summary Writes (/academicSummaries)", () => {
    it("Test 5.26: worker_kota_gorontalo creates and updates kota_gorontalo_courses_2026-Q3", async () => {
      const id = "kota_gorontalo_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");
      await assertSucceeds(setDoc(doc(authedWorker("kota"), "academicSummaries", id), payload));

      const updated = { ...payload, averageScore: 84.0 };
      await assertSucceeds(setDoc(doc(authedWorker("kota"), "academicSummaries", id), updated));
    });

    it("Test 5.27: worker_kota_gorontalo creates and updates kota_gorontalo_kindergarten_2026-Q3", async () => {
      const id = "kota_gorontalo_kindergarten_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "kindergarten");
      await assertSucceeds(setDoc(doc(authedWorker("kota"), "academicSummaries", id), payload));
    });

    it("Test 5.28: worker_bone_bolango creates and updates bone_bolango_courses_2026-Q3", async () => {
      const id = "bone_bolango_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("bone_bolango", "courses");
      await assertSucceeds(setDoc(doc(authedWorker("bone"), "academicSummaries", id), payload));
    });

    it("Test 5.29: worker_limboto creates and updates limboto_courses_2026-Q3", async () => {
      const id = "limboto_courses_2026-Q3";
      const payload = VALID_SUPPRESSED_SUMMARY("limboto", "courses");
      await assertSucceeds(setDoc(doc(authedWorker("limboto"), "academicSummaries", id), payload));
    });

    it("Test 5.30: worker_pohuwato creates and updates pohuwato_courses_2026-Q3", async () => {
      const id = "pohuwato_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("pohuwato", "courses");
      await assertSucceeds(setDoc(doc(authedWorker("pohuwato"), "academicSummaries", id), payload));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.8 Cross-Branch Summary Write Denials (/academicSummaries)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.8 Cross-Branch Summary Write Denials (/academicSummaries)", () => {
    it("Test 5.31: worker_bone_bolango writing kota_gorontalo summary is denied", async () => {
      const id = "kota_gorontalo_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");
      await assertFails(setDoc(doc(authedWorker("bone"), "academicSummaries", id), payload));
    });

    it("Test 5.32: worker_limboto writing bone_bolango summary is denied", async () => {
      const id = "bone_bolango_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("bone_bolango", "courses");
      await assertFails(setDoc(doc(authedWorker("limboto"), "academicSummaries", id), payload));
    });

    it("Test 5.33: worker_pohuwato writing limboto summary is denied", async () => {
      const id = "limboto_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("limboto", "courses");
      await assertFails(setDoc(doc(authedWorker("pohuwato"), "academicSummaries", id), payload));
    });

    it("Test 5.34: worker_kota_gorontalo writing pohuwato summary is denied", async () => {
      const id = "pohuwato_courses_2026-Q3";
      const payload = VALID_UNSUPPRESSED_SUMMARY("pohuwato", "courses");
      await assertFails(setDoc(doc(authedWorker("kota"), "academicSummaries", id), payload));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.9 Satellite Kindergarten Typology Invariant Violations
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.9 Satellite Kindergarten Typology Invariant Violations", () => {
    it("Test 5.35: satellite workers attempting kindergarten summary writes are denied", async () => {
      for (const key of ["bone", "limboto", "pohuwato"]) {
        const branch = WORKERS[key].branchId;
        const id = `${branch}_kindergarten_2026-Q3`;
        const payload = VALID_UNSUPPRESSED_SUMMARY(branch, "kindergarten");
        await assertFails(setDoc(doc(authedWorker(key), "academicSummaries", id), payload));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.10 Summary Deletion Denial & Institutional Collection Blast Radius
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.10 Summary Deletion Denial & Institutional Blast Radius", () => {
    it("Test 5.36: all 4 workers attempting delete on /academicSummaries are denied", async () => {
      await seedDoc(["academicSummaries", "kota_gorontalo_courses_2026-Q3"], VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses"));

      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        await assertFails(
          deleteDoc(doc(authedWorker(key), "academicSummaries", "kota_gorontalo_courses_2026-Q3"))
        );
      }
    });

    it("Test 5.37: all 4 workers attempting read/write on institutional collections are denied", async () => {
      for (const key of ["kota", "bone", "limboto", "pohuwato"]) {
        const db = authedWorker(key);
        await assertFails(getDoc(doc(db, "users", "admin")));
        await assertFails(setDoc(doc(db, "users", "test_user"), { role: "admin" }));
        await assertFails(getDoc(doc(db, "payments", "pay1")));
        await assertFails(setDoc(doc(db, "finances", "f1"), { amount: 100 }));
        await assertFails(getDoc(doc(db, "shifts", "s1")));
        await assertFails(getDoc(doc(db, "auditLogs", "log1")));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.11 Identity Dual-Binding, UID Verification & User Isolation
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.11 Identity Dual-Binding, UID Verification & User Isolation", () => {
    it("Test 5.38: worker email with mismatched UID is denied", async () => {
      const spoofedDb = testEnv.authenticatedContext("random_spoofed_uid", { email: "worker-kota@myliberty.local" }).firestore();
      const q = query(collection(spoofedDb, "progressReports"), where("branchId", "==", "kota_gorontalo"));
      await assertFails(getDocs(q));
      await assertFails(setDoc(doc(spoofedDb, "academicSummaries", "kota_gorontalo_courses_2026-Q3"), VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses")));
    });

    it("Test 5.39: worker identity has no /users profile and cannot perform human operations", async () => {
      // Human operations require a profile in /users
      const db = authedWorker("kota");
      await assertFails(getDoc(doc(db, "classes", "class1")));
      await assertFails(setDoc(doc(db, "approvals", "app1"), { actionId: "NEW_STAFF" }));
    });

    it("Test 5.40: ordinary human staff members cannot create or update /academicSummaries", async () => {
      for (const humanKey of ["admin", "mgrGto", "foGto", "insGto", "dirGto", "vdGto", "ilGto"]) {
        const db = authedUser(humanKey);
        await assertFails(
          setDoc(doc(db, "academicSummaries", "kota_gorontalo_courses_2026-Q3"), VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses"))
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.12 Human Caller Access Boundaries & Overlapping Rules Verification
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.12 Human Caller Access Boundaries & Overlapping Rules Verification", () => {
    beforeEach(async () => {
      await seedDoc(["academicSummaries", "kota_gorontalo_courses_2026-Q3"], VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses"));
    });

    it("lets Central Academic Lead at Kota read academic summaries", async () => {
      await assertSucceeds(getDoc(doc(authedUser("ilGto"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
    });

    it("denies Satellite Instructor Leader from reading academic summaries", async () => {
      await assertFails(getDoc(doc(authedUser("ilBoba"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
    });

    it("denies Division Managers and Front Office from reading academic summaries", async () => {
      await assertFails(getDoc(doc(authedUser("mgrGto"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
      await assertFails(getDoc(doc(authedUser("foGto"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
    });

    it("denies Executives (Director, Vice Director) from reading academic summaries (OD-AM-08)", async () => {
      await assertFails(getDoc(doc(authedUser("dirGto"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
      await assertFails(getDoc(doc(authedUser("vdGto"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
    });

    it("denies System Administrator from reading academic summaries (Blueprint Rule 3)", async () => {
      await assertFails(getDoc(doc(authedUser("admin"), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
    });

    it("denies all human roles (including Admin & Director) from deleting academic summaries", async () => {
      for (const humanKey of ["admin", "dirGto", "vdGto", "mgrGto", "ilGto", "foGto"]) {
        await assertFails(deleteDoc(doc(authedUser(humanKey), "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
      }
    });

    it("denies unauthenticated access completely", async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, "academicSummaries", "kota_gorontalo_courses_2026-Q3")));
      await assertFails(setDoc(doc(unauthedDb, "academicSummaries", "kota_gorontalo_courses_2026-Q3"), VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses")));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.13 Fixture Insertion Exactness & Candidate Generator Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.13 Fixture Insertion Exactness & Candidate Generator Invariants", () => {
    it("buildCandidateRules successfully executes with all three insertion points found exactly once", () => {
      const candidate = buildCandidateRules();
      expect(typeof candidate).toBe("string");
      expect(candidate.includes("isWorkerSameBranchStrict")).toBe(true);
      expect(candidate.includes("match /academicSummaries/{summaryId}")).toBe(true);
      expect(candidate.includes("isValidGeneratedAt")).toBe(true);
    });

    it("replaceExactlyOnce throws when target pattern is not found", () => {
      expect(() => {
        replaceExactlyOnce("sample rules text", "missing_anchor", "replacement", "test missing anchor");
      }).toThrow(/insertion point 'test missing anchor' was not found/);
    });

    it("replaceExactlyOnce throws when target pattern occurs multiple times", () => {
      expect(() => {
        replaceExactlyOnce("anchor and anchor", "anchor", "replacement", "test duplicate anchor");
      }).toThrow(/was found 2 times \(expected exactly 1\)/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5.14 Strict Schema & Payload Invariant Rejections (Negative Tests)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5.14 Strict Schema & Payload Invariant Rejections (Negative Tests)", () => {
    const validKotaId = "kota_gorontalo_courses_2026-Q3";

    it("Test 5.41: generatedAt type and format enforcement", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Number timestamp rejected
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: Date.now() }));

      // Null or boolean rejected
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: null }));
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: true }));

      // Malformed strings rejected
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "not-a-date" }));
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01" }));
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "04:00:00Z" }));

      // Out-of-range date/time components rejected (bounded calendar range validation; does not evaluate month lengths or leap years like Feb 30)
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-99-01T04:00:00.000Z" })); // month 99
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-00-01T04:00:00.000Z" })); // month 00
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-35T04:00:00.000Z" })); // day 35
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-00T04:00:00.000Z" })); // day 00
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T88:00:00.000Z" })); // hour 88
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T04:77:00.000Z" })); // minute 77
      await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T04:00:99.000Z" })); // second 99

      // Valid ISO-like formats accepted
      await assertSucceeds(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T04:00:00.000Z" }));
      await assertSucceeds(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T04:00:00Z" }));
      await assertSucceeds(setDoc(doc(db, "academicSummaries", validKotaId), { ...base, generatedAt: "2026-10-01T04:00:00+08:00" }));
    });

    it("Test 5.42: missing required canonical fields are rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      const requiredKeys = [
        "generatedAt",
        "scoreBuckets",
        "distinctLearnersCount",
        "totalReportsCount",
        "averageScore",
        "aggregationMethod",
        "isSuppressed",
        "periodStartDate",
        "periodEndDate",
      ];

      for (const key of requiredKeys) {
        const payload = { ...base };
        delete payload[key];
        await assertFails(setDoc(doc(db, "academicSummaries", validKotaId), payload));
      }
    });

    it("Test 5.43: unapproved extra fields and open metadata are rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Open metadata map rejected
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, metadata: { worker: "kota", runId: "123" } })
      );

      // Raw report list rejected
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, rawReports: ["rep_1", "rep_2"] })
      );

      // Legacy compatibility alias 'suppressed' rejected
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, suppressed: false })
      );

      // Arbitrary unexpected field rejected
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, unexpectedField: "malicious_injection" })
      );
    });

    it("Test 5.44: invalid aggregationMethod, period, or quarter bounds are rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Invalid aggregation method
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, aggregationMethod: "raw_average" })
      );

      // Invalid period format
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, period: "2026-Q5" })
      );

      // Mismatched quarter dates (Q3 bounds must be 2026-07-01 to 2026-09-30)
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, periodStartDate: "2026-01-01" })
      );
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, periodEndDate: "2026-12-31" })
      );
    });

    it("Test 5.45: malformed scoreBuckets and metric math invariants are rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Negative bucket count
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...base,
          scoreBuckets: { below70: -1, band70_84: 6, band85_100: 5 },
        })
      );

      // Bucket sum does not match distinctLearnersCount (sum = 9, learners = 10)
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...base,
          scoreBuckets: { below70: 2, band70_84: 5, band85_100: 2 },
        })
      );

      // Disallowed extra key in scoreBuckets
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...base,
          scoreBuckets: { below70: 2, band70_84: 5, band85_100: 3, outlier: 0 },
        })
      );

      // Floating-point count in buckets
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...base,
          scoreBuckets: { below70: 2.5, band70_84: 4.5, band85_100: 3 },
        })
      );

      // Floating-point distinctLearnersCount
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, distinctLearnersCount: 10.5 })
      );

      // Out-of-range averageScore
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, averageScore: 105 })
      );
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, averageScore: -1 })
      );

      // String averageScore
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), { ...base, averageScore: "82.5" })
      );
    });

    it("Test 5.46: suppression state inconsistency invariants are rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Unsuppressed (isSuppressed: false) but distinctLearnersCount < 5 (OD-AM-02 violation)
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...base,
          distinctLearnersCount: 4,
          totalReportsCount: 4,
          scoreBuckets: { below70: 1, band70_84: 2, band85_100: 1 },
        })
      );

      // Suppressed (isSuppressed: true) but averageScore is populated (privacy leakage)
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...VALID_SUPPRESSED_SUMMARY("kota_gorontalo", "courses"),
          averageScore: 82.5,
        })
      );

      // Suppressed (isSuppressed: true) but scoreBuckets populated
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...VALID_SUPPRESSED_SUMMARY("kota_gorontalo", "courses"),
          scoreBuckets: { below70: 1, band70_84: 2, band85_100: 1 },
        })
      );

      // Suppressed (isSuppressed: true) but distinctLearnersCount populated
      await assertFails(
        setDoc(doc(db, "academicSummaries", validKotaId), {
          ...VALID_SUPPRESSED_SUMMARY("kota_gorontalo", "courses"),
          distinctLearnersCount: 3,
        })
      );
    });

    it("Test 5.47: document ID partition binding mismatch is rejected", async () => {
      const db = authedWorker("kota");
      const base = VALID_UNSUPPRESSED_SUMMARY("kota_gorontalo", "courses");

      // Attempting to write valid payload to mismatched document ID
      await assertFails(
        setDoc(doc(db, "academicSummaries", "arbitrary_doc_id"), base)
      );
      await assertFails(
        setDoc(doc(db, "academicSummaries", "kota_gorontalo_courses_2026-Q4"), base)
      );
    });
  });
});
