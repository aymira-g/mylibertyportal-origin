/* global process */
/**
 * @file academicSummaryBenchmark.js
 * @description Gate 1: Local Algorithm Benchmark & Cost-Model Exercise
 * Evaluates candidate precomputed summary aggregation logic (Candidate D)
 * on synthetic in-memory progress report datasets (N = 100, 500, 1000, 2000).
 *
 * GOVERNANCE & EXECUTION GUARDRAILS (Feasibility §10.1):
 * - Non-production only; zero access to live Firestore or production credentials.
 * - Zero modifications to production code, security rules, or wrangler.toml.
 * - Zero production deployment; no changes to Tab 4 dashboard.
 * - Indicative benchmark only: process.hrtime.bigint() measures elapsed wall-clock time
 *   in Node.js; it does NOT prove Cloudflare 10ms CPU limit compliance (Error 1102)
 *   or confirm actual Firestore network billing.
 */

export const ACTIVE_BRANCHES = [
  "kota_gorontalo",
  "bone_bolango",
  "limboto",
  "pohuwato",
];

export const BRANCH_DIVISIONS = {
  kota_gorontalo: ["courses", "kindergarten"],
  bone_bolango: ["courses"],
  limboto: ["courses"],
  pohuwato: ["courses"],
};

export const SCORE_BUCKETS = {
  needsSupport: { min: 0, max: 59.99 },
  developing: { min: 60, max: 74.99 },
  proficient: { min: 75, max: 89.99 },
  advanced: { min: 90, max: 100 },
};

/**
 * Categorize a numeric score into one of four standard performance buckets.
 * @param {number} score
 * @returns {string|null}
 */
export function categorizeScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  if (score >= 90) return "advanced";
  if (score >= 75) return "proficient";
  if (score >= 60) return "developing";
  return "needsSupport";
}

/**
 * Aggregates a slice of progress reports for a single (branchId, division) partition.
 *
 * @param {Array<Object>} reports - Raw or normalized progress report documents
 * @param {Object} options
 * @param {string} options.branchId - Branch identifier
 * @param {string} options.division - Division ('courses' | 'kindergarten')
 * @param {string} [options.period="2026-Q4"] - Reporting period
 * @param {number} [options.suppressionThreshold=5] - Minimum unique learners required to show scores
 * @returns {Object} Aggregated summary document matching Candidate D schema
 */
export function aggregateBranchDivisionReports(reports, options) {
  const {
    branchId,
    division,
    period = "2026-Q4",
    suppressionThreshold = 5,
  } = options;

  const summaryId = `${branchId}_${division}_${period}`;
  const totalReportsCount = reports.length;

  if (totalReportsCount === 0) {
    return {
      id: summaryId,
      branchId,
      division,
      period,
      distinctLearnersCount: 0,
      totalReportsCount: 0,
      scoreBuckets: null,
      averageScore: null,
      suppressed: true,
      updatedAt: new Date().toISOString(),
    };
  }

  const distinctLearners = new Set();
  const buckets = {
    needsSupport: 0,
    developing: 0,
    proficient: 0,
    advanced: 0,
  };

  let validScoreSum = 0;
  let validScoreCount = 0;

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    if (r.studentId) {
      distinctLearners.add(r.studentId);
    }

    // Coerce and validate overallScore
    let score = r.overallScore;
    if (typeof score === "string") {
      score = parseFloat(score);
    }

    const bucketKey = categorizeScore(score);
    if (bucketKey) {
      buckets[bucketKey]++;
      validScoreSum += score;
      validScoreCount++;
    }
  }

  const distinctLearnersCount = distinctLearners.size;
  const isSuppressed = distinctLearnersCount < suppressionThreshold;

  const averageScore =
    !isSuppressed && validScoreCount > 0
      ? Number((validScoreSum / validScoreCount).toFixed(1))
      : null;

  return {
    id: summaryId,
    branchId,
    division,
    period,
    distinctLearnersCount,
    totalReportsCount,
    scoreBuckets: isSuppressed ? null : buckets,
    averageScore,
    suppressed: isSuppressed,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Aggregates all reports across the entire province, partitioning by (branchId, division).
 * Normalizes legacy records (e.g. missing division defaults safely to 'courses').
 *
 * @param {Array<Object>} reports
 * @param {Object} [options]
 * @param {number} [options.suppressionThreshold=5]
 * @param {string} [options.period="2026-Q4"]
 * @returns {Array<Object>} List of summary documents (one per active branch/division)
 */
export function aggregateAllAcademicReports(reports, options = {}) {
  const { suppressionThreshold = 5, period = "2026-Q4" } = options;

  // Group reports by branchId:division
  const partitions = new Map();

  // Initialize all known active branch/division partitions so zero-activity cohorts appear
  for (const branchId of ACTIVE_BRANCHES) {
    const divisions = BRANCH_DIVISIONS[branchId] || ["courses"];
    for (const division of divisions) {
      partitions.set(`${branchId}:${division}`, []);
    }
  }

  // Partition incoming reports with legacy field normalization
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    // Note on Firestore query reality: In the proposed query plan (where("branchId", "==", b)),
    // documents missing branchId are omitted at the query layer before reaching this fallback.
    // This in-memory fallback represents a local prototype convention, not production query behavior.
    const branchId = r.branchId || "kota_gorontalo"; // fallback for unstamped legacy branch
    const division = r.division || "courses"; // fallback for unstamped legacy division

    const key = `${branchId}:${division}`;
    if (!partitions.has(key)) {
      partitions.set(key, []);
    }
    partitions.get(key).push(r);
  }

  const summaries = [];
  for (const [key, partitionReports] of partitions.entries()) {
    const [branchId, division] = key.split(":");
    summaries.push(
      aggregateBranchDivisionReports(partitionReports, {
        branchId,
        division,
        period,
        suppressionThreshold,
      })
    );
  }

  return summaries;
}

/**
 * Generates synthetic progress report datasets with controlled volume,
 * realistic branch distributions, learner duplication, and edge cases.
 *
 * @param {number} totalCount - Target report volume
 * @param {Object} [options]
 * @param {boolean} [options.injectEdgeCases=true]
 * @returns {Array<Object>} Array of synthetic progress report objects
 */
export function generateSyntheticReports(totalCount, options = {}) {
  const { injectEdgeCases = true } = options;
  const reports = [];

  // Distribution weights matching network scale:
  // kota_gorontalo (courses: 50%, kindergarten: 20%)
  // bone_bolango (courses: 15%)
  // limboto (courses: 12%)
  // pohuwato (courses: 3% - sparse cohort to test suppression!)
  const distribution = [
    { branchId: "kota_gorontalo", division: "courses", weight: 0.5 },
    { branchId: "kota_gorontalo", division: "kindergarten", weight: 0.2 },
    { branchId: "bone_bolango", division: "courses", weight: 0.15 },
    { branchId: "limboto", division: "courses", weight: 0.12 },
    { branchId: "pohuwato", division: "courses", weight: 0.03 },
  ];

  // We assign a pool of student IDs so some students have multiple reports (duplication)
  // Ratio: approximately 1 unique student per 1.35 reports
  const studentPoolSize = Math.max(1, Math.round(totalCount / 1.35));
  const studentPool = Array.from({ length: studentPoolSize }, (_, i) => `stu_${i + 1}`);

  let currentStudentIdx = 0;

  for (const dist of distribution) {
    const partitionCount = Math.max(1, Math.round(totalCount * dist.weight));
    const partitionStudents = [];

    // Assign a slice of the student pool to this branch/division
    const partitionStudentCount = Math.max(
      1,
      Math.round(partitionCount / 1.35)
    );
    for (let s = 0; s < partitionStudentCount; s++) {
      if (currentStudentIdx < studentPool.length) {
        partitionStudents.push(studentPool[currentStudentIdx++]);
      } else {
        partitionStudents.push(studentPool[s % studentPool.length]);
      }
    }

    // Special edge case: ensure Pohuwato has a sparse cohort (e.g. 2 learners) when totalCount <= 500
    if (dist.branchId === "pohuwato" && partitionCount <= 15) {
      partitionStudents.length = Math.min(partitionStudents.length, 2);
    }

    for (let i = 0; i < partitionCount; i++) {
      // Pick a student from this partition's pool (creates realistic duplicates)
      const studentId =
        partitionStudents[i % partitionStudents.length] || `stu_fallback_${i}`;

      // Score distribution: mostly proficient/developing, some advanced/needsSupport
      let overallScore;
      const rand = (i * 17 + 31) % 100;
      if (rand < 15) overallScore = 52 + (rand % 8); // needsSupport (52-59)
      else if (rand < 45) overallScore = 63 + (rand % 12); // developing (63-74)
      else if (rand < 85) overallScore = 76 + (rand % 14); // proficient (76-89)
      else overallScore = 91 + (rand % 9); // advanced (91-99)

      const report = {
        id: `rep_${dist.branchId}_${i + 1}`,
        studentId,
        studentName: `Student ${studentId}`,
        branchId: dist.branchId,
        division: dist.division,
        classId: `cls_${dist.branchId}_${(i % 5) + 1}`,
        className: `Class ${(i % 5) + 1}`,
        instructorId: `inst_${dist.branchId}_${(i % 3) + 1}`,
        examDate: "2026-11-15",
        overallScore,
      };

      // Inject controlled edge cases if requested
      if (injectEdgeCases) {
        // 3% unstamped legacy division
        if (i % 33 === 0) {
          delete report.division;
        }
        // 2% string score representation
        if (i % 50 === 0) {
          report.overallScore = String(overallScore);
        }
        // 1% invalid/missing score
        if (i % 100 === 0) {
          report.overallScore = null;
        }
      }

      reports.push(report);
      if (reports.length >= totalCount) break;
    }
    if (reports.length >= totalCount) break;
  }

  // Ensure exact totalCount
  while (reports.length < totalCount) {
    reports.push({
      id: `rep_pad_${reports.length + 1}`,
      studentId: `stu_pad_${reports.length % 20}`,
      branchId: "kota_gorontalo",
      division: "courses",
      examDate: "2026-11-15",
      overallScore: 82,
    });
  }

  return reports.slice(0, totalCount);
}

/**
 * Calculates the explicit Firestore REST API query-plan cost model
 * and evaluates resource consumption against the Firebase Spark quota.
 *
 * @param {number} reportVolume - Total progress reports scanned in a run
 * @param {string} [cadence="weekly"] - Execution schedule ('daily' | 'weekly' | 'monthly')
 * @returns {Object} Cost model calculations
 */
export function calculateQueryPlanCostModel(reportVolume, cadence = "weekly") {
  // Query Plan Architecture:
  // - 1 runQuery REST call per branch (kota_gorontalo, bone_bolango, limboto, pohuwato)
  // - Exactly 4 external HTTP subrequests per invocation (well below Cloudflare 50 limit)
  // - Structured query filter: where("examDate", ">=", horizonStart) AND where("examDate", "<=", horizonEnd)
  // - Field projection mask: ["studentId", "overallScore", "branchId", "division", "examDate"]
  const subrequestsPerRun = ACTIVE_BRANCHES.length; // 4 subrequests
  const documentsScannedPerRun = reportVolume; // 1 read per matching document in runQuery

  const runsPerDay =
    cadence === "daily" ? 1 : cadence === "weekly" ? 1 / 7 : 1 / 30;

  const estimatedDailyReads = Math.round(documentsScannedPerRun * runsPerDay);
  const sparkDailyReadQuota = 50000;
  const sparkQuotaPercentage = Number(
    ((estimatedDailyReads / sparkDailyReadQuota) * 100).toFixed(3)
  );

  // Writes: exactly 5 summary documents written per run
  const writesPerRun = 5;
  const estimatedDailyWrites = Math.round(writesPerRun * runsPerDay);
  const sparkDailyWriteQuota = 20000;
  const sparkWriteQuotaPercentage = Number(
    ((estimatedDailyWrites / sparkDailyWriteQuota) * 100).toFixed(4)
  );

  // Client reads: Instructor Leader dashboard load (1 query on academicSummaries, ~5 docs)
  const clientReadsPerDashboardLoad = 5;

  return {
    queryShape: "Firestore REST runQuery with Projection Mask",
    httpSubrequestsPerBatchRun: subrequestsPerRun,
    cloudflareSubrequestLimit: 50,
    subrequestFit: subrequestsPerRun <= 50,
    reportVolumeScannedPerRun: reportVolume,
    cadence,
    estimatedDailyReads,
    sparkDailyReadQuota,
    readQuotaUtilizationPercent: sparkQuotaPercentage,
    estimatedDailyWrites,
    sparkDailyWriteQuota,
    writeQuotaUtilizationPercent: sparkWriteQuotaPercentage,
    clientReadsPerDashboardLoad,
  };
}

/**
 * Runs the local indicative algorithm benchmark across N = 100, 500, 1000, 2000.
 * Measures wall-clock elapsed time using process.hrtime.bigint().
 *
 * @returns {Object} Benchmark results matrix
 */
export function runIndicativeBenchmark() {
  const datasetSizes = [100, 500, 1000, 2000];
  const iterationsPerSize = 25;
  const warmUpIterations = 5;

  const results = [];

  for (const n of datasetSizes) {
    const data = generateSyntheticReports(n, { injectEdgeCases: true });

    // Warm-up to trigger V8 JIT compilation
    for (let w = 0; w < warmUpIterations; w++) {
      aggregateAllAcademicReports(data, { suppressionThreshold: 5 });
    }

    // Measured iterations
    const elapsedTimesNs = [];
    let lastSummaryResult = null;

    for (let i = 0; i < iterationsPerSize; i++) {
      const start = process.hrtime.bigint();
      lastSummaryResult = aggregateAllAcademicReports(data, {
        suppressionThreshold: 5,
      });
      const end = process.hrtime.bigint();
      elapsedTimesNs.push(Number(end - start));
    }

    const totalNs = elapsedTimesNs.reduce((acc, v) => acc + v, 0);
    const meanNs = totalNs / iterationsPerSize;
    const minNs = Math.min(...elapsedTimesNs);
    const maxNs = Math.max(...elapsedTimesNs);

    const meanMs = Number((meanNs / 1e6).toFixed(4));
    const minMs = Number((minNs / 1e6).toFixed(4));
    const maxMs = Number((maxNs / 1e6).toFixed(4));

    // Verify deduplication and suppression on the last result
    const pohuwatoSummary = lastSummaryResult.find(
      (s) => s.branchId === "pohuwato"
    );
    const kotaSummary = lastSummaryResult.find(
      (s) => s.branchId === "kota_gorontalo" && s.division === "courses"
    );

    const costModel = calculateQueryPlanCostModel(n, "weekly");

    results.push({
      datasetSize: n,
      meanMs,
      minMs,
      maxMs,
      partitionsCount: lastSummaryResult.length,
      kotaTotalReports: kotaSummary ? kotaSummary.totalReportsCount : 0,
      kotaDistinctLearners: kotaSummary ? kotaSummary.distinctLearnersCount : 0,
      pohuwatoLearners: pohuwatoSummary ? pohuwatoSummary.distinctLearnersCount : 0,
      pohuwatoSuppressed: pohuwatoSummary ? pohuwatoSummary.suppressed : false,
      costModel,
    });
  }

  // Calculate scaling linearity ratio (time(2000) / time(100))
  const baseTime = results[0].meanMs;
  const maxTime = results[results.length - 1].meanMs;
  const scalingRatio = Number((maxTime / (baseTime || 0.001)).toFixed(2));
  const expectedLinearRatio = 2000 / 100; // 20x

  return {
    results,
    scalingRatio,
    expectedLinearRatio,
    algorithmComplexity: "O(N) single-pass iteration with Set deduplication",
  };
}

// Self-executing runner when invoked via `node tests/academicSummaryBenchmark.js`
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].endsWith("academicSummaryBenchmark.js")
) {
  console.log("================================================================================");
  console.log("MYLIBERTY: Academic Summary Benchmark & Cost Model (Gate 1 Execution)");
  console.log("Authority: Noncanonical Feasibility Study §10.1 (Owner Decision 2026-10-18)");
  console.log("================================================================================\n");

  console.log("--- 1. BENCHMARK TIMING RESULTS (INDICATIVE WALL-CLOCK TIME) ---");
  const benchmark = runIndicativeBenchmark();

  console.table(
    benchmark.results.map((r) => ({
      "Dataset (N)": r.datasetSize,
      "Mean Elapsed (ms)": r.meanMs,
      "Min Elapsed (ms)": r.minMs,
      "Max Elapsed (ms)": r.maxMs,
      "Partitions": r.partitionsCount,
      "Pohuwato Learners": r.pohuwatoLearners,
      "Pohuwato Suppressed": r.pohuwatoSuppressed ? "YES (<5)" : "NO",
      "Est. Daily Reads": r.costModel.estimatedDailyReads,
      "Spark Quota %": `${r.costModel.readQuotaUtilizationPercent}%`,
    }))
  );

  console.log(`\nAlgorithmic Scaling Ratio: ${benchmark.scalingRatio}x across a 20x dataset increase (Expected ~20x for O(N)).`);
  console.log(`Complexity: ${benchmark.algorithmComplexity}\n`);

  console.log("--- 2. FIRESTORE QUERY-PLAN & COST MODEL ---");
  const cost = benchmark.results[1].costModel; // N = 500 baseline
  console.log(`- Query Strategy: ${cost.queryShape}`);
  console.log(`- HTTP Subrequests: ${cost.httpSubrequestsPerBatchRun} per run (Cloudflare limit: ${cost.cloudflareSubrequestLimit}) -> FIT: ${cost.subrequestFit ? "PASS" : "FAIL"}`);
  console.log(`- Scanned Documents (N=500, weekly): ~500 reads/week (~71 reads/day)`);
  console.log(`- Daily Read Quota: ${cost.sparkDailyReadQuota.toLocaleString()} reads/day`);
  console.log(`- Quota Utilization: ~${cost.readQuotaUtilizationPercent}% of free-tier Spark allowance`);
  console.log(`- Output Writes: 5 documents/week (~0.003% of Spark write quota)`);
  console.log(`- Client Query: 1 single query reading ~5 precomputed docs per dashboard load\n`);

  console.log("--- 3. EXPLICIT LIMITATIONS & DISCLAIMERS (§10.1) ---");
  console.log("1. Timing is INDICATIVE ONLY: Node.js process.hrtime.bigint() measures elapsed wall-clock");
  console.log("   time (including OS scheduling, event loop latency, and GC pauses). It does NOT prove");
  console.log("   compliance with Cloudflare's 10ms Free CPU limit (Error 1102) or predict edge isolate accounting.");
  console.log("2. Cost numbers are ESTIMATES: Synthetic in-memory data validates algorithmic data structures");
  console.log("   and suppression logic, but CANNOT confirm actual Firestore network wire reads or billing.");
  console.log("3. Guardrails Confirmed: Non-production execution only. Zero production credentials used,");
  console.log("   zero modifications to production code or security rules, zero deployments, and Tab 4 unchanged.");
  console.log("4. Query-Plan vs Missing-Branch Mismatch: The in-memory code assigns reports lacking branchId");
  console.log("   to Kota Gorontalo. However, the proposed query plan uses branch-filtered queries (where('branchId', '==', b)).");
  console.log("   In Firestore, branch-filtered queries omit documents missing branchId before this fallback can run.");
  console.log("   The benchmark tested missing division, but not this query-level branch filter omission.");
  console.log("5. Average is Per-Report, NOT Per-Learner: The computed averageScore and scoreBuckets are");
  console.log("   report-level metrics. A learner with multiple reports contributes multiple times to the average");
  console.log("   and score distribution. While distinctLearnersCount deduplicates students via Set, whether academic");
  console.log("   monitoring should report evaluation averages vs student-level averages is an open policy decision.");
  console.log("================================================================================\n");
}
