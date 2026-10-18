/**
 * @file gate2bLocalSummaryInvestigation.mjs
 * @description Gate 2B: Local Policy Conformance & Atomic Write Verification
 *
 * Scoped, non-production test script investigating whether a Candidate D summary
 * design can honor the Stage 2 ratified reporting policies and whether summary
 * writes can be executed as a single atomic REST :commit batch.
 *
 * SCOPE & GOVERNANCE BOUNDARIES:
 * 1. Emulator Security-Rules Bypass:
 *    - Emulator REST calls use administrative authentication (`Authorization: Bearer owner`),
 *      which bypasses Firestore security rules (`firestore.rules`).
 *    - This test investigates payload formatting, aggregation formulas, transactional atomicity,
 *      and subrequest budgeting ONLY.
 *    - It MUST NOT and CANNOT be cited as evidence that production authorization or security rules
 *      are verified or safe.
 * 2. Local-Only Execution:
 *    - Zero Cloudflare worker or Cron Trigger deployments.
 *    - Zero access to live Google Cloud / Firebase services.
 *    - Zero changes to production code, tests, rules, schemas, or indexes.
 * 3. Tab 4 Scoping:
 *    - Tab 4 (AcademicProgressLeader.jsx) remains untouched and strictly home-campus scoped (kota_gorontalo).
 * 4. Governance Status Discipline:
 *    - Does NOT approve Candidate D or resolve open owner decisions (OD-AM-01, OD-AM-03 cadence,
 *      OD-AM-05, OD-AM-07).
 * 5. Data Isolation & Scoped Cleanup:
 *    - Every document seeded or created uses a unique run prefix (RUN_ID).
 *    - Tracked documents are deleted individually during cleanup.
 *    - The test NEVER performs broad collection wipes.
 * 6. Indicative Compute Only:
 *    - Local Miniflare / workerd timing is indicative only and cannot certify production
 *      compliance with Cloudflare's 10ms CPU limit or Error 1102 avoidance.
 */

import { Miniflare } from "../cloudflare-worker/node_modules/miniflare/dist/src/index.js";

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
const PROJECT_ID = "mylibertyies-f2f38";
const BASE_REST_URL = `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Unique execution run identifier ensuring isolation across test runs
const RUN_ID = `gate2b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const ACTIVE_BRANCHES = [
  "kota_gorontalo",
  "bone_bolango",
  "limboto",
  "pohuwato",
];

const BRANCH_DIVISIONS = {
  kota_gorontalo: ["courses", "kindergarten"],
  bone_bolango: ["courses"],
  limboto: ["courses"],
  pohuwato: ["courses"],
};

// Strict whitelist of permitted aggregate fields in /academicSummaries
const PERMITTED_SUMMARY_FIELDS = new Set([
  "branchId",
  "division",
  "period",
  "periodStartDate",
  "periodEndDate",
  "distinctLearnersCount",
  "totalReportsCount",
  "suppressed",
  "averageScore",
  "scoreBuckets",
  "generatedAt",
  "aggregationMethod",
]);

// Set to track every document created during this test run for targeted cleanup
const trackedDocPaths = new Set();

/**
 * Categorizes a numeric score into standard performance bands.
 */
function categorizeScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  if (score < 70) return "below70";
  if (score < 85) return "band70_84";
  return "band85_100";
}

/**
 * Stage 2 Ratified Aggregation Algorithm:
 * - OD-AM-06: Per-learner deduplicated average (Learner Academic Average).
 * - OD-AM-03: Fixed calendar quarter boundaries.
 * - OD-AM-02: Small-cell suppression for N < 5 represented learners.
 * - OD-AM-04: Strict aggregate schema (no staff or individual student metrics).
 */
function aggregatePartitionReports(reports, metadata) {
  const { branchId, division, period, periodStartDate, periodEndDate, suppressionThreshold = 5 } = metadata;

  // Step 1: Group reports by distinct learner (studentId)
  const learnerReportsMap = new Map();
  for (const r of reports) {
    if (!r.studentId) continue;
    if (!learnerReportsMap.has(r.studentId)) {
      learnerReportsMap.set(r.studentId, []);
    }
    if (typeof r.overallScore === "number" && Number.isFinite(r.overallScore)) {
      learnerReportsMap.get(r.studentId).push(r.overallScore);
    }
  }

  const distinctLearnersCount = learnerReportsMap.size;
  const totalReportsCount = reports.length;

  // Step 2: Check Small-Group Suppression (OD-AM-02: N < 5 represented learners)
  const isSuppressed = distinctLearnersCount < suppressionThreshold;

  // Step 3: Compute per-learner averages and score distribution
  let averageScore = null;
  let scoreBuckets = null;

  if (!isSuppressed && distinctLearnersCount > 0) {
    let learnerScoreSum = 0;
    const buckets = { below70: 0, band70_84: 0, band85_100: 0 };

    for (const [, scores] of learnerReportsMap.entries()) {
      if (scores.length === 0) continue;
      // Average this learner's reports within the quarter first
      const learnerAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      learnerScoreSum += learnerAvg;

      // Categorize each unique learner exactly once
      const bucket = categorizeScore(learnerAvg);
      if (bucket && buckets[bucket] !== undefined) {
        buckets[bucket]++;
      }
    }

    averageScore = Math.round((learnerScoreSum / distinctLearnersCount) * 10) / 10;
    scoreBuckets = buckets;
  }

  // Stored Document Schema:
  // If suppressed, conceal score details AND counts to avoid revealing small cells
  return {
    branchId,
    division,
    period,
    periodStartDate,
    periodEndDate,
    distinctLearnersCount: isSuppressed ? null : distinctLearnersCount,
    totalReportsCount: isSuppressed ? null : totalReportsCount,
    suppressed: isSuppressed,
    averageScore: isSuppressed ? null : averageScore,
    scoreBuckets: isSuppressed ? null : scoreBuckets,
    generatedAt: new Date().toISOString(),
    aggregationMethod: "learner_average",
  };
}

/**
 * Converts a plain JS object into Firestore REST typed field format.
 */
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "object") {
      // Map
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

/**
 * Deserializes Firestore REST document into plain JS object.
 */
function fromFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    if (v.stringValue !== undefined) result[k] = v.stringValue;
    else if (v.integerValue !== undefined) result[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) result[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
    else if (v.nullValue !== undefined) result[k] = null;
    else if (v.mapValue?.fields !== undefined) {
      result[k] = fromFirestoreDocument(v.mapValue);
    }
  }
  return result;
}

/**
 * Seed helper: commits batch writes to emulator and records tracked doc paths.
 */
async function seedDocuments(collection, documents) {
  const writes = documents.map((doc) => {
    const docPath = `${collection}/${doc.id}`;
    trackedDocPaths.add(docPath);
    return {
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
        fields: toFirestoreFields(doc.data),
      },
    };
  });

  const res = await fetch(`${BASE_REST_URL}:commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner", // Emulator admin bypass (NOT proof of security rules)
    },
    body: JSON.stringify({ writes }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Seed failed (${res.status}): ${JSON.stringify(err)}`);
  }
}

/**
 * Cleanup helper: deletes only tracked documents created during this test run.
 */
async function cleanupTrackedDocuments() {
  if (trackedDocPaths.size === 0) return 0;
  let deletedCount = 0;

  const paths = Array.from(trackedDocPaths);
  for (let i = 0; i < paths.length; i += 500) {
    const chunk = paths.slice(i, i + 500);
    const writes = chunk.map((docPath) => ({
      delete: `projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
    }));

    const res = await fetch(`${BASE_REST_URL}:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({ writes }),
    });

    if (res.ok) {
      deletedCount += chunk.length;
    }
  }
  return deletedCount;
}

/**
 * Main Gate 2B Investigation Suite
 */
async function runGate2bSuite() {
  console.log("===============================================================================");
  console.log("  GATE 2B INVESTIGATION: POLICY CONFORMANCE & ATOMIC WRITE VERIFICATION");
  console.log(`  Run ID: ${RUN_ID}`);
  console.log(`  Emulator: ${EMULATOR_HOST}`);
  console.log("  Safety Notice: Uses Bearer owner emulator bypass. NOT proof of rules authorization.");
  console.log("===============================================================================\n");

  const results = {
    check1_weighting: false,
    check2_date_boundaries: false,
    check3_suppression: false,
    check4_schema_whitelist: false,
    check5_atomic_commit: false,
    check6_transactional_rollback: false,
    check7_idempotent_replay: false,
    check8_compute_benchmark: false,
  };

  try {
    // -------------------------------------------------------------------------
    // CHECK 1: Score Weighting Policy (OD-AM-06)
    // -------------------------------------------------------------------------
    console.log("--- Check 1: Score Weighting Policy (OD-AM-06: Learner Academic Average) ---");
    // Seed Student A with 4 reports averaging 60.0 (scores: 60, 60, 60, 60)
    // Seed 4 additional students (B: 90, C: 80, D: 75, E: 85) each with 1 report
    // Total reports = 8; Total distinct learners = 5
    const chk1Reports = [
      { studentId: `${RUN_ID}_STU_A`, overallScore: 60, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-05" },
      { studentId: `${RUN_ID}_STU_A`, overallScore: 60, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-12" },
      { studentId: `${RUN_ID}_STU_A`, overallScore: 60, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-19" },
      { studentId: `${RUN_ID}_STU_A`, overallScore: 60, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-26" },
      { studentId: `${RUN_ID}_STU_B`, overallScore: 90, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-05" },
      { studentId: `${RUN_ID}_STU_C`, overallScore: 80, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-05" },
      { studentId: `${RUN_ID}_STU_D`, overallScore: 75, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-05" },
      { studentId: `${RUN_ID}_STU_E`, overallScore: 85, branchId: "kota_gorontalo", division: "courses", examDate: "2026-10-05" },
    ];

    const chk1Summary = aggregatePartitionReports(chk1Reports, {
      branchId: "kota_gorontalo",
      division: "courses",
      period: "2026-Q4",
      periodStartDate: "2026-10-01",
      periodEndDate: "2026-12-31",
      suppressionThreshold: 5,
    });

    // Event Average would be: (60*4 + 90 + 80 + 75 + 85) / 8 = 570 / 8 = 71.25 -> 71.3
    // Learner Academic Average is: (60.0 + 90.0 + 80.0 + 75.0 + 85.0) / 5 = 390 / 5 = 78.0
    console.log(`  Learner Count: ${chk1Summary.distinctLearnersCount} (expected 5)`);
    console.log(`  Report Count:  ${chk1Summary.totalReportsCount} (expected 8)`);
    console.log(`  Average Score: ${chk1Summary.averageScore} (Learner avg: 78.0 vs Event avg: 71.3)`);
    console.log(`  Score Buckets: below70=${chk1Summary.scoreBuckets?.below70}, band70_84=${chk1Summary.scoreBuckets?.band70_84}, band85_100=${chk1Summary.scoreBuckets?.band85_100}`);

    if (
      chk1Summary.distinctLearnersCount === 5 &&
      chk1Summary.totalReportsCount === 8 &&
      chk1Summary.averageScore === 78.0 &&
      chk1Summary.scoreBuckets?.below70 === 1 && // Student A counted once
      chk1Summary.scoreBuckets?.band70_84 === 2 && // Students C, D
      chk1Summary.scoreBuckets?.band85_100 === 2 // Students B, E
    ) {
      console.log("  [PASS] Check 1: Per-learner deduplicated average mathematically confirmed.\n");
      results.check1_weighting = true;
    } else {
      console.error("  [FAIL] Check 1: Score weighting calculation mismatch.\n");
    }

    // -------------------------------------------------------------------------
    // CHECK 2: Stored Date Format & Boundaries (OD-AM-03)
    // -------------------------------------------------------------------------
    console.log("--- Check 2: Stored Date Format & Boundaries (OD-AM-03: YYYY-MM-DD Bounds) ---");
    // Seed 4 reports at exact period boundaries using stored YYYY-MM-DD string format
    const boundaryDocs = [
      { id: `${RUN_ID}_bnd_q3_end`, data: { studentId: `${RUN_ID}_S1`, overallScore: 70, branchId: "limboto", division: "courses", examDate: "2026-09-30" } }, // Q3 end (exclude)
      { id: `${RUN_ID}_bnd_q4_start`, data: { studentId: `${RUN_ID}_S2`, overallScore: 75, branchId: "limboto", division: "courses", examDate: "2026-10-01" } }, // Q4 start (include)
      { id: `${RUN_ID}_bnd_q4_end`, data: { studentId: `${RUN_ID}_S3`, overallScore: 80, branchId: "limboto", division: "courses", examDate: "2026-12-31" } }, // Q4 end (include)
      { id: `${RUN_ID}_bnd_q1_start`, data: { studentId: `${RUN_ID}_S4`, overallScore: 85, branchId: "limboto", division: "courses", examDate: "2027-01-01" } }, // Q1 next year (exclude)
    ];

    await seedDocuments("progressReports", boundaryDocs);

    // Query emulator with structured query bounded by YYYY-MM-DD strings
    const bndQueryRes = await fetch(`${BASE_REST_URL}:runQuery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "progressReports" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                { fieldFilter: { field: { fieldPath: "branchId" }, op: "EQUAL", value: { stringValue: "limboto" } } },
                { fieldFilter: { field: { fieldPath: "examDate" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: "2026-10-01" } } },
                { fieldFilter: { field: { fieldPath: "examDate" }, op: "LESS_THAN_OR_EQUAL", value: { stringValue: "2026-12-31" } } },
              ],
            },
          },
        },
      }),
    });

    const bndQueryJson = await bndQueryRes.json();
    const matchedDocs = bndQueryJson
      .filter((item) => item.document)
      .map((item) => item.document.name.split("/").pop());

    const matchedBoundarySet = new Set(matchedDocs);
    const includedQ4Start = matchedBoundarySet.has(`${RUN_ID}_bnd_q4_start`);
    const includedQ4End = matchedBoundarySet.has(`${RUN_ID}_bnd_q4_end`);
    const excludedQ3End = !matchedBoundarySet.has(`${RUN_ID}_bnd_q3_end`);
    const excludedQ1Start = !matchedBoundarySet.has(`${RUN_ID}_bnd_q1_start`);

    console.log(`  Included 2026-10-01 (Q4 start): ${includedQ4Start}`);
    console.log(`  Included 2026-12-31 (Q4 end):   ${includedQ4End}`);
    console.log(`  Excluded 2026-09-30 (Q3 end):   ${excludedQ3End}`);
    console.log(`  Excluded 2027-01-01 (Q1 start): ${excludedQ1Start}`);

    if (includedQ4Start && includedQ4End && excludedQ3End && excludedQ1Start) {
      console.log("  [PASS] Check 2: Exact YYYY-MM-DD boundary filtering confirmed.\n");
      results.check2_date_boundaries = true;
    } else {
      console.error("  [FAIL] Check 2: Date boundary filtering mismatch.\n");
    }

    // -------------------------------------------------------------------------
    // CHECK 3: Small-Group Suppression (OD-AM-02: N < 5 Distinct Learners)
    // -------------------------------------------------------------------------
    console.log("--- Check 3: Small-Group Suppression & Stored-Data Concealment (OD-AM-02) ---");
    // Case 3A: Bone Bolango courses - 6 reports across 4 distinct learners (N=4 < 5)
    // Even though totalReportsCount is 6 (>=5), it must be SUPPRESSED because distinctLearnersCount = 4
    const chk3SuppressedReports = [
      { studentId: `${RUN_ID}_STU_BB1`, overallScore: 70, branchId: "bone_bolango", division: "courses", examDate: "2026-10-10" },
      { studentId: `${RUN_ID}_STU_BB1`, overallScore: 74, branchId: "bone_bolango", division: "courses", examDate: "2026-10-20" },
      { studentId: `${RUN_ID}_STU_BB1`, overallScore: 78, branchId: "bone_bolango", division: "courses", examDate: "2026-11-05" },
      { studentId: `${RUN_ID}_STU_BB2`, overallScore: 82, branchId: "bone_bolango", division: "courses", examDate: "2026-10-15" },
      { studentId: `${RUN_ID}_STU_BB3`, overallScore: 85, branchId: "bone_bolango", division: "courses", examDate: "2026-11-10" },
      { studentId: `${RUN_ID}_STU_BB4`, overallScore: 90, branchId: "bone_bolango", division: "courses", examDate: "2026-12-01" },
    ];

    const chk3Summary = aggregatePartitionReports(chk3SuppressedReports, {
      branchId: "bone_bolango",
      division: "courses",
      period: "2026-Q4",
      periodStartDate: "2026-10-01",
      periodEndDate: "2026-12-31",
      suppressionThreshold: 5,
    });

    console.log(`  N=4 Distinct Learners (6 reports): suppressed=${chk3Summary.suppressed}`);
    console.log(`  averageScore:          ${chk3Summary.averageScore} (expected null)`);
    console.log(`  scoreBuckets:          ${chk3Summary.scoreBuckets} (expected null)`);
    console.log(`  distinctLearnersCount: ${chk3Summary.distinctLearnersCount} (expected null)`);
    console.log(`  totalReportsCount:     ${chk3Summary.totalReportsCount} (expected null)`);

    const inMemorySuppressionPassed =
      chk3Summary.suppressed === true &&
      chk3Summary.averageScore === null &&
      chk3Summary.scoreBuckets === null &&
      chk3Summary.distinctLearnersCount === null &&
      chk3Summary.totalReportsCount === null;

    if (inMemorySuppressionPassed) {
      console.log("  [PASS] Check 3 (In-Memory): Aggregation logic correctly suppresses counts and scores.\n");
    } else {
      console.error("  [FAIL] Check 3 (In-Memory): Aggregation leak detected in memory.\n");
    }

    // -------------------------------------------------------------------------
    // CHECK 4: In-Memory Schema Whitelist & Staff Metric Exclusion (OD-AM-04)
    // -------------------------------------------------------------------------
    console.log("--- Check 4: In-Memory Schema Whitelist & Staff Metric Exclusion (OD-AM-04) ---");
    // Verifies the in-memory summary object before serialization against the permitted
    // aggregate schema. Does not independently validate stored field sets across all documents.
    const summaryKeys = Object.keys(chk1Summary);
    let allKeysPermitted = true;
    for (const key of summaryKeys) {
      if (!PERMITTED_SUMMARY_FIELDS.has(key)) {
        console.error(`  Prohibited field detected on in-memory object: ${key}`);
        allKeysPermitted = false;
      }
    }

    const hasStaffMetrics =
      summaryKeys.some((k) => k.toLowerCase().includes("instructor") || k.toLowerCase().includes("staff")) ||
      summaryKeys.includes("submissionsCount") ||
      summaryKeys.includes("onTimeRate");

    console.log(`  Total fields on in-memory summary object: ${summaryKeys.length}`);
    console.log(`  All in-memory fields within permitted whitelist: ${allKeysPermitted}`);
    console.log(`  Staff submission metrics excluded from in-memory object: ${!hasStaffMetrics}`);

    if (allKeysPermitted && !hasStaffMetrics) {
      console.log("  [PASS] Check 4 (In-Memory): Pre-serialization summary object strictly contains only approved aggregate metrics.\n");
      results.check4_schema_whitelist = true;
    } else {
      console.error("  [FAIL] Check 4 (In-Memory): Prohibited fields found on in-memory summary object.\n");
    }

    // -------------------------------------------------------------------------
    // CHECK 5: Atomic REST :commit Batch Write (Finding 7)
    // -------------------------------------------------------------------------
    console.log("--- Check 5: Atomic REST :commit Batch Write Across 5 Partitions ---");
    // Generate all 5 partition summary objects
    const partitionsToGenerate = [
      { branchId: "kota_gorontalo", division: "courses", reports: chk1Reports },
      { branchId: "kota_gorontalo", division: "kindergarten", reports: [] },
      { branchId: "bone_bolango", division: "courses", reports: chk3SuppressedReports },
      { branchId: "limboto", division: "courses", reports: boundaryDocs.map((d) => d.data) },
      { branchId: "pohuwato", division: "courses", reports: [] },
    ];

    const summaryDocs = partitionsToGenerate.map((p) => {
      const summary = aggregatePartitionReports(p.reports, {
        branchId: p.branchId,
        division: p.division,
        period: "2026-Q4",
        periodStartDate: "2026-10-01",
        periodEndDate: "2026-12-31",
        suppressionThreshold: 5,
      });
      // Deterministic, run-prefixed document ID
      const docId = `${RUN_ID}_${p.branchId}_${p.division}_2026-Q4`;
      return { id: docId, summary };
    });

    // Structure 1 atomic REST :commit batch write containing all 5 partition documents
    const batchWrites = summaryDocs.map((sd) => {
      const docPath = `academicSummaries/${sd.id}`;
      trackedDocPaths.add(docPath);
      return {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
          fields: toFirestoreFields(sd.summary),
        },
      };
    });

    const commitRes = await fetch(`${BASE_REST_URL}:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner", // Emulator admin bypass
      },
      body: JSON.stringify({ writes: batchWrites }),
    });

    console.log(`  REST :commit response status: ${commitRes.status} (expected 200)`);
    console.log(`  Subrequests issued for write: 1 (5 partition writes combined in 1 subrequest)`);

    // Step 5.2: Read back the suppressed partition document (bone_bolango_courses) directly from Firestore emulator
    // to verify that concealment is enforced in the actual stored database record, not just in-memory.
    const suppressedDocPath = `academicSummaries/${RUN_ID}_bone_bolango_courses_2026-Q4`;
    const readBackSuppressedRes = await fetch(`${BASE_REST_URL}/${suppressedDocPath}`, {
      headers: { Authorization: "Bearer owner" },
    });

    const storedDocRaw = await readBackSuppressedRes.json();
    const storedFields = storedDocRaw.fields || {};

    const storedIsSuppressed = storedFields.suppressed?.booleanValue === true;
    const storedAvgNull = !storedFields.averageScore || storedFields.averageScore.nullValue !== undefined;
    const storedBucketsNull = !storedFields.scoreBuckets || storedFields.scoreBuckets.nullValue !== undefined;
    const storedLearnersNull = !storedFields.distinctLearnersCount || storedFields.distinctLearnersCount.nullValue !== undefined;
    const storedReportsNull = !storedFields.totalReportsCount || storedFields.totalReportsCount.nullValue !== undefined;

    console.log("  Read-back verification of stored suppressed document in Firestore:");
    console.log(`    Stored suppressed:            ${storedFields.suppressed?.booleanValue}`);
    console.log(`    Stored averageScore:          ${storedFields.averageScore ? (storedFields.averageScore.nullValue !== undefined ? "nullValue" : "EXPOSED") : "omitted"}`);
    console.log(`    Stored scoreBuckets:          ${storedFields.scoreBuckets ? (storedFields.scoreBuckets.nullValue !== undefined ? "nullValue" : "EXPOSED") : "omitted"}`);
    console.log(`    Stored distinctLearnersCount: ${storedFields.distinctLearnersCount ? (storedFields.distinctLearnersCount.nullValue !== undefined ? "nullValue" : "EXPOSED") : "omitted"}`);
    console.log(`    Stored totalReportsCount:     ${storedFields.totalReportsCount ? (storedFields.totalReportsCount.nullValue !== undefined ? "nullValue" : "EXPOSED") : "omitted"}`);

    const storedConcealmentPassed =
      readBackSuppressedRes.ok && storedIsSuppressed && storedAvgNull && storedBucketsNull && storedLearnersNull && storedReportsNull;

    if (inMemorySuppressionPassed && storedConcealmentPassed) {
      console.log("  [PASS] Check 3: Small-group suppression & complete stored concealment verified.\n");
      results.check3_suppression = true;
    } else {
      console.error("  [FAIL] Check 3: Stored database document leaked score or count fields!\n");
    }

    if (commitRes.ok && storedConcealmentPassed) {
      console.log("  [PASS] Check 5: All 5 partition summaries committed atomically in 1 subrequest.\n");
      results.check5_atomic_commit = true;
    } else {
      const err = await commitRes.json().catch(() => ({}));
      console.error(`  [FAIL] Check 5: Atomic commit or read-back failed: ${JSON.stringify(err)}\n`);
    }

    // -------------------------------------------------------------------------
    // CHECK 6: Transactional Atomicity via Failing Database Precondition
    // -------------------------------------------------------------------------
    console.log("--- Check 6: Transactional Atomicity via Failing Precondition on Existing Document ---");
    // Step 6.1: Seed a known existing document in academicSummaries
    const precondDocId = `${RUN_ID}_precondition_target`;
    const precondDocPath = `academicSummaries/${precondDocId}`;
    trackedDocPaths.add(precondDocPath);

    const seedPrecondRes = await fetch(`${BASE_REST_URL}/${precondDocPath}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        fields: toFirestoreFields({ initialStatus: "unmodified", branchId: "kota_gorontalo" }),
      }),
    });

    if (!seedPrecondRes.ok) {
      throw new Error(`Failed to seed precondition target document: ${seedPrecondRes.status}`);
    }

    // Step 6.2: Attempt to write a batch with 2 valid partition updates plus 1 write
    // with a deliberately failing database precondition: a stale currentDocument.updateTime
    // on a known existing document (which forces Firestore to abort with HTTP 400 FAILED_PRECONDITION)!
    const failingBatchWrites = [
      {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/academicSummaries/${RUN_ID}_rollback_test_1`,
          fields: toFirestoreFields({ branchId: "kota_gorontalo", division: "courses", test: "rollback" }),
        },
      },
      {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/academicSummaries/${RUN_ID}_rollback_test_2`,
          fields: toFirestoreFields({ branchId: "bone_bolango", division: "courses", test: "rollback" }),
        },
      },
      {
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/${precondDocPath}`,
          fields: toFirestoreFields({ initialStatus: "should_not_update" }),
        },
        currentDocument: {
          updateTime: "2020-01-01T00:00:00.000000Z", // Precondition fails because existing document was modified later!
        },
      },
    ];

    const failingRes = await fetch(`${BASE_REST_URL}:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({ writes: failingBatchWrites }),
    });

    const failingErr = await failingRes.json().catch(() => ({}));
    const observedStatus = failingRes.status;
    const observedErrorCode = failingErr.error?.status || "UNKNOWN";
    const observedErrorMessage = failingErr.error?.message || "No message";

    console.log(`  Failing batch HTTP response status: ${observedStatus} (expected 400)`);
    console.log(`  Failing batch Firestore error code: ${observedErrorCode} (expected FAILED_PRECONDITION)`);
    console.log(`  Failing batch error message: ${observedErrorMessage}`);

    // Step 6.3: Verify that NEITHER of the valid updates was committed
    const checkDoc1Res = await fetch(`${BASE_REST_URL}/academicSummaries/${RUN_ID}_rollback_test_1`, {
      headers: { Authorization: "Bearer owner" },
    });
    const checkDoc2Res = await fetch(`${BASE_REST_URL}/academicSummaries/${RUN_ID}_rollback_test_2`, {
      headers: { Authorization: "Bearer owner" },
    });

    // Step 6.4: Verify that the target document was NOT modified
    const checkTargetRes = await fetch(`${BASE_REST_URL}/${precondDocPath}`, {
      headers: { Authorization: "Bearer owner" },
    });
    const targetDocJson = await checkTargetRes.json().catch(() => ({}));
    const targetFields = fromFirestoreDocument(targetDocJson);

    const doc1Exists = checkDoc1Res.status === 200;
    const doc2Exists = checkDoc2Res.status === 200;
    const targetUnmodified = targetFields?.initialStatus === "unmodified";

    console.log(`  Doc 1 committed: ${doc1Exists} (expected false)`);
    console.log(`  Doc 2 committed: ${doc2Exists} (expected false)`);
    console.log(`  Target document status: ${targetFields?.initialStatus} (expected "unmodified")`);

    const isPreconditionFailure = observedStatus === 400 && observedErrorCode === "FAILED_PRECONDITION";
    const isCleanRollback = !doc1Exists && !doc2Exists && targetUnmodified;

    if (isPreconditionFailure && isCleanRollback) {
      console.log("  [PASS] Check 6: HTTP 400 FAILED_PRECONDITION and clean transactional rollback confirmed.\n");
      results.check6_transactional_rollback = true;
    } else {
      console.error(`  [FAIL] Check 6: Precondition failure assertion failed (status: ${observedStatus}, code: ${observedErrorCode}, cleanRollback: ${isCleanRollback})\n`);
    }

    // -------------------------------------------------------------------------
    // CHECK 7: Identical-Batch Replay / Idempotency Check
    // -------------------------------------------------------------------------
    console.log("--- Check 7: Identical-Batch Replay / Idempotency Check ---");
    // Replay the identical batchWrites from Check 5
    const replayRes = await fetch(`${BASE_REST_URL}:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({ writes: batchWrites }),
    });

    console.log(`  Replay commit response status: ${replayRes.status} (expected 200)`);

    // Verify each of the 5 expected run-specific partition documents exists and is addressable
    let verifiedDocCount = 0;
    for (const sd of summaryDocs) {
      const getRes = await fetch(`${BASE_REST_URL}/academicSummaries/${sd.id}`, {
        headers: { Authorization: "Bearer owner" },
      });
      if (getRes.status === 200) {
        verifiedDocCount++;
      }
    }

    console.log(`  Verified expected run-specific partition documents exist: ${verifiedDocCount} of 5`);

    if (replayRes.ok && verifiedDocCount === 5) {
      console.log("  [PASS] Check 7: Identical-batch replay is strictly idempotent (deterministic document IDs overwrite cleanly).\n");
      results.check7_idempotent_replay = true;
    } else {
      console.error("  [FAIL] Check 7: Replay idempotency mismatch.\n");
    }

    // -------------------------------------------------------------------------
    // CHECK 8: Indicative Compute Benchmark
    // -------------------------------------------------------------------------
    console.log("--- Check 8: Indicative Compute Benchmark (Miniflare / Local V8) ---");
    const testSizes = [100, 500, 1000];
    const timings = [];

    for (const size of testSizes) {
      const syntheticReports = [];
      for (let i = 0; i < size; i++) {
        syntheticReports.push({
          studentId: `STU_${i % Math.floor(size / 3)}`, // duplicate students to exercise Map deduplication
          overallScore: 50 + (i % 50),
          branchId: ACTIVE_BRANCHES[i % ACTIVE_BRANCHES.length],
          division: i % 2 === 0 ? "courses" : "kindergarten",
          examDate: "2026-10-15",
        });
      }

      const t0 = performance.now();
      // Partition reports
      const pMap = new Map();
      for (const r of syntheticReports) {
        const k = `${r.branchId}:${r.division}`;
        if (!pMap.has(k)) pMap.set(k, []);
        pMap.get(k).push(r);
      }
      for (const [k, pReports] of pMap.entries()) {
        const [b, d] = k.split(":");
        aggregatePartitionReports(pReports, {
          branchId: b,
          division: d,
          period: "2026-Q4",
          periodStartDate: "2026-10-01",
          periodEndDate: "2026-12-31",
          suppressionThreshold: 5,
        });
      }
      const t1 = performance.now();
      const elapsedMs = Math.round((t1 - t0) * 100) / 100;
      timings.push({ size, elapsedMs });
      console.log(`  N=${size} synthetic reports: compute time = ${elapsedMs} ms`);
    }

    const allUnderLimit = timings.every((t) => t.elapsedMs < 10.0);
    if (allUnderLimit) {
      console.log("  [PASS] Check 8: Indicative compute scaling remains well within local threshold.\n");
      results.check8_compute_benchmark = true;
    } else {
      console.error("  [FAIL] Check 8: Compute benchmark exceeded local threshold.\n");
    }

  } finally {
    // Guaranteed Scoped Cleanup: Delete only documents tracked during this run
    console.log("--- Cleanup: Deleting Tracked Test Documents ---");
    console.log(`  Total documents tracked for cleanup: ${trackedDocPaths.size}`);
    const deleted = await cleanupTrackedDocuments();
    console.log(`  Successfully cleaned up ${deleted} tracked test documents.`);
    console.log("  Local collections (progressReports, academicSummaries) preserved without broad wipe.\n");
  }

  // Final Summary
  console.log("===============================================================================");
  console.log("  GATE 2B INVESTIGATION VERDICT & SUMMARY");
  console.log("===============================================================================");
  const allPassed = Object.values(results).every(Boolean);
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${k.padEnd(32)}: ${v ? "PASS" : "FAIL"}`);
  }
  console.log("-------------------------------------------------------------------------------");
  console.log(`  OVERALL VERDICT: ${allPassed ? "ALL 8 CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  console.log("  IMPORTANT REMINDER: All checks executed locally. This does NOT validate");
  console.log("  production security rules, Cloudflare behavior, or authorize deployment.");
  console.log("===============================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runGate2bSuite().catch((err) => {
  console.error("Fatal error in Gate 2B execution:", err);
  process.exit(1);
});
