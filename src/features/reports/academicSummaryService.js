/**
 * @file academicSummaryService.js
 * @description Calculation and policy-helper building blocks for Province-Wide Academic Monitoring.
 *
 * SCOPE & STATUS:
 * - Delivers tested calculation, validation, privacy suppression, and policy-helper building blocks.
 * - This is NOT an operational summary-generation pipeline; background Worker execution, cross-branch
 *   report querying, and Firestore persistence remain undeployed and require separate Gate 4 authorization.
 *
 * Governed Baseline:
 * - OD-AM-01 (Option B Staged Path): Candidate D precomputed summary partitions.
 * - OD-AM-02: Small-cell suppression for N < 5 represented learners.
 * - OD-AM-03: Fixed calendar quarters (period) and approved monthly batch generation (cadence).
 * - OD-AM-04: Strict exclusion of staff submission tracking metrics.
 * - OD-AM-05: Vice Director as Accountable Operator (monitoring only; no trigger or deployment authority).
 * - OD-AM-06: Per-learner deduplicated average (Learner Academic Average); residual temporal differencing risk accepted.
 * - OD-AM-07: 35-day staleness threshold and bounded failure handling with no unbounded retries.
 * - OD-AM-08: Central Academic Lead exclusive view access; bulk CSV export prohibited.
 */

export const MONTHLY_STALENESS_THRESHOLD_DAYS = 35;
export const DEFAULT_SUPPRESSION_THRESHOLD = 5;

/**
 * Computes fixed calendar quarter boundaries (OD-AM-03 Period).
 * Quarters:
 * - Q1: Jan 1 – Mar 31
 * - Q2: Apr 1 – Jun 30
 * - Q3: Jul 1 – Sep 30
 * - Q4: Oct 1 – Dec 31
 *
 * @param {number} year - Four-digit calendar year (e.g. 2026)
 * @param {number} quarter - Quarter index (1, 2, 3, or 4)
 * @returns {{ period: string, periodStartDate: string, periodEndDate: string }}
 */
export function getQuarterBounds(year, quarter) {
  const q = Number(quarter);
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error(`Invalid year for quarter bounds: ${year}`);
  }
  if (!Number.isInteger(q) || q < 1 || q > 4) {
    throw new Error(`Invalid quarter index: ${quarter}. Must be 1, 2, 3, or 4.`);
  }

  const bounds = {
    1: { start: `${y}-01-01`, end: `${y}-03-31` },
    2: { start: `${y}-04-01`, end: `${y}-06-30` },
    3: { start: `${y}-07-01`, end: `${y}-09-30` },
    4: { start: `${y}-10-01`, end: `${y}-12-31` },
  };

  return {
    period: `${y}-Q${q}`,
    periodStartDate: bounds[q].start,
    periodEndDate: bounds[q].end,
  };
}

/**
 * Strict evaluation score parser.
 * Validates that an evaluation score is a finite numeric value within [0, 100].
 *
 * Prevents false zero-coercion from Number(val):
 * - null, undefined, "", "   ", false, true, [], {} -> null
 * - NaN, Infinity, -1, 101 -> null
 * - 0, 100, 85, 72.5, "85", "0" -> valid number
 *
 * @param {any} raw - Raw score from progress report document
 * @returns {number | null} Validated numeric score or null
 */
export function parseValidScore(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return num;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) return null;
    return raw;
  }
  return null;
}

/**
 * Categorizes a numeric evaluation score into standard performance bands.
 * Bands:
 * - below70: score < 70
 * - band70_84: 70 <= score < 85
 * - band85_100: 85 <= score <= 100
 *
 * @param {any} score
 * @returns {"below70" | "band70_84" | "band85_100" | null}
 */
export function categorizeScore(score) {
  const parsed = parseValidScore(score);
  if (parsed === null) return null;
  if (parsed < 70) return "below70";
  if (parsed < 85) return "band70_84";
  return "band85_100";
}

/**
 * Stage 2 Ratified Aggregation Algorithm (OD-AM-02, OD-AM-03, OD-AM-04, OD-AM-06):
 * 1. Groups report scores per distinct learner (studentId).
 * 2. Computes each learner's personal average within the quarter.
 * 3. Applies small-cell suppression when fewer than 5 distinct learners are represented (N < 5).
 * 4. Conceals counts and score details for suppressed cohorts.
 * 5. Strictly excludes staff metrics (no instructorId, submission compliance, or staff recency).
 *
 * @param {Array<Record<string, any>>} [reports] - Array of progress report documents
 * @param {Record<string, any>} [metadata] - Partition metadata
 * @returns {Record<string, any>} Aggregate partition summary document matching /academicSummaries schema
 */
export function aggregatePartitionReports(reports = [], metadata = {}) {
  const {
    branchId = null,
    division = null,
    period = null,
    periodStartDate = null,
    periodEndDate = null,
    suppressionThreshold = DEFAULT_SUPPRESSION_THRESHOLD,
    generatedAt = null,
  } = metadata;

  // Step 1: Group valid report scores by distinct learner (studentId)
  const learnerReportsMap = new Map();
  let validReportsCount = 0;

  for (const r of reports) {
    if (!r || !r.studentId) continue;
    const score = parseValidScore(r.overallScore);
    if (score === null) continue;

    validReportsCount++;
    if (!learnerReportsMap.has(r.studentId)) {
      learnerReportsMap.set(r.studentId, []);
    }
    learnerReportsMap.get(r.studentId).push(score);
  }

  const distinctLearnersCount = learnerReportsMap.size;
  const isSuppressed = distinctLearnersCount < suppressionThreshold;

  let averageScore = null;
  let scoreBuckets = null;

  // Step 2: Compute per-learner averages and score distribution if not suppressed
  if (!isSuppressed && distinctLearnersCount > 0) {
    let learnerScoreSum = 0;
    const buckets = { below70: 0, band70_84: 0, band85_100: 0 };

    for (const [, scores] of learnerReportsMap.entries()) {
      if (scores.length === 0) continue;
      // OD-AM-06: Average each learner's scores first
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

  // Schema matching target /academicSummaries contract (strictly 12 canonical fields):
  // If suppressed, conceal score details AND counts to avoid revealing small cells (OD-AM-02)
  return {
    branchId,
    division,
    period,
    periodStartDate,
    periodEndDate,
    distinctLearnersCount: isSuppressed ? null : distinctLearnersCount,
    totalReportsCount: isSuppressed ? null : validReportsCount,
    isSuppressed,
    averageScore: isSuppressed ? null : averageScore,
    scoreBuckets: isSuppressed ? null : scoreBuckets,
    generatedAt: generatedAt || new Date().toISOString(),
    aggregationMethod: "learner_average",
  };
}

/**
 * The exact 12 canonical field names permitted on /academicSummaries documents
 * by the target Firestore Security Rules contract.
 */
export const CANONICAL_SUMMARY_FIELDS = Object.freeze([
  "branchId",
  "division",
  "period",
  "periodStartDate",
  "periodEndDate",
  "generatedAt",
  "aggregationMethod",
  "isSuppressed",
  "totalReportsCount",
  "distinctLearnersCount",
  "averageScore",
  "scoreBuckets",
]);

export const ACTIVE_BRANCHES = Object.freeze([
  "kota_gorontalo",
  "bone_bolango",
  "limboto",
  "pohuwato",
]);

/**
 * Validates branch-division pairings under Blueprint v3.4 §4 Branch Typology:
 * - Type 1 Main Campus (kota_gorontalo): Dual-division (courses, kindergarten).
 * - Type 2 Satellite Branches (bone_bolango, limboto, pohuwato): Lean single-division (courses only).
 *
 * @param {string} branchId - Branch identifier
 * @param {string} division - Division identifier
 * @returns {boolean} True if the branch-division pairing is authorized
 */
export function isValidBranchDivision(branchId, division) {
  if (branchId === "kota_gorontalo") {
    return division === "courses" || division === "kindergarten";
  }
  if (branchId === "bone_bolango" || branchId === "limboto" || branchId === "pohuwato") {
    return division === "courses";
  }
  return false;
}

/**
 * Strictly validates an in-memory academic summary object and serializes it
 * to match the exact 12-field /academicSummaries Firestore contract.
 *
 * FAILS FAST AND REJECTS INVALID SUMMARIES:
 * - Rejects malformed or non-boolean `isSuppressed` (e.g. string "false", numbers, null).
 * - Rejects missing required fields instead of filling nulls or defaults.
 * - Rejects invalid branch-division topology (e.g. satellite kindergarten).
 * - Rejects quarter dates that do not match the calendar quarter defined by `period`.
 * - Rejects missing or malformed generatedAt ISO timestamp or aggregationMethod.
 * - Rejects unsuppressed summaries with invalid counts, out-of-bounds averageScore, or bucket sum mismatches.
 * - Defensively strips extraneous, internal, legacy, or identifying fields (e.g. suppressed, metadata, PII, staff metrics).
 * - Enforces explicit null on all 4 sensitive metrics when isSuppressed === true.
 *
 * @param {any} summary - Partition summary object to validate and serialize
 * @returns {Record<string, any>} Serialized payload matching the exact 12-field Firestore contract
 * @throws {Error} If the summary fails schema, branch topology, quarter date, or invariant validation
 */
export function serializeAcademicSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("Invalid academic summary: summary must be a non-null object");
  }

  // 1. Strict boolean validation for isSuppressed (reject string "false", numbers, null, undefined)
  let isSuppressed;
  if (typeof summary.isSuppressed === "boolean") {
    isSuppressed = summary.isSuppressed;
  } else if (typeof summary.suppressed === "boolean") {
    isSuppressed = summary.suppressed;
  } else {
    throw new Error(
      `Invalid academic summary: isSuppressed must be a boolean, got ${typeof (summary.isSuppressed ?? summary.suppressed)}`
    );
  }

  // 2. Identity and branch typology validation (Blueprint v3.4 §4)
  const { branchId, division } = summary;
  if (!branchId || typeof branchId !== "string" || !ACTIVE_BRANCHES.includes(branchId)) {
    throw new Error(
      `Invalid academic summary: branchId '${branchId}' is invalid. Must be one of: ${ACTIVE_BRANCHES.join(", ")}`
    );
  }
  if (
    !division ||
    typeof division !== "string" ||
    (division !== "courses" && division !== "kindergarten")
  ) {
    throw new Error(
      `Invalid academic summary: division '${division}' must be 'courses' or 'kindergarten'`
    );
  }
  if (!isValidBranchDivision(branchId, division)) {
    throw new Error(
      `Invalid academic summary: branch '${branchId}' does not support division '${division}' (satellites are courses-only)`
    );
  }

  // 3. Period & Quarter Dates validation (OD-AM-03)
  const { period, periodStartDate, periodEndDate } = summary;
  if (!period || typeof period !== "string" || !/^[0-9]{4}-Q[1-4]$/.test(period)) {
    throw new Error(`Invalid academic summary: period '${period}' must match format YYYY-Q[1-4]`);
  }
  const year = Number(period.slice(0, 4));
  const quarter = Number(period.slice(6, 7));
  const expectedBounds = getQuarterBounds(year, quarter);
  if (
    periodStartDate !== expectedBounds.periodStartDate ||
    periodEndDate !== expectedBounds.periodEndDate
  ) {
    throw new Error(
      `Invalid academic summary: quarter dates '${periodStartDate}' to '${periodEndDate}' do not match expected bounds '${expectedBounds.periodStartDate}' to '${expectedBounds.periodEndDate}' for period '${period}'`
    );
  }

  // 4. Aggregation method & generatedAt validation
  const { aggregationMethod, generatedAt } = summary;
  if (aggregationMethod !== "learner_average") {
    throw new Error(
      `Invalid academic summary: aggregationMethod '${aggregationMethod}' must be 'learner_average'`
    );
  }
  if (!generatedAt || typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error(
      `Invalid academic summary: generatedAt must be a valid ISO date string, got '${generatedAt}'`
    );
  }

  // 5. Metric validation & suppression enforcement
  let totalReportsCount = null;
  let distinctLearnersCount = null;
  let averageScore = null;
  let scoreBuckets = null;

  if (isSuppressed) {
    // OD-AM-02: Suppressed state forces all 4 sensitive metrics strictly to null
    totalReportsCount = null;
    distinctLearnersCount = null;
    averageScore = null;
    scoreBuckets = null;
  } else {
    // Unsuppressed state requires strict positive integer counts and mathematical consistency
    distinctLearnersCount = summary.distinctLearnersCount;
    if (
      !Number.isInteger(distinctLearnersCount) ||
      distinctLearnersCount < DEFAULT_SUPPRESSION_THRESHOLD
    ) {
      throw new Error(
        `Invalid academic summary: unsuppressed summary must have distinctLearnersCount >= ${DEFAULT_SUPPRESSION_THRESHOLD}, got ${distinctLearnersCount}`
      );
    }

    totalReportsCount = summary.totalReportsCount;
    if (!Number.isInteger(totalReportsCount) || totalReportsCount < distinctLearnersCount) {
      throw new Error(
        `Invalid academic summary: totalReportsCount (${totalReportsCount}) must be an integer >= distinctLearnersCount (${distinctLearnersCount})`
      );
    }

    const parsedAvg = parseValidScore(summary.averageScore);
    if (parsedAvg === null) {
      throw new Error(
        `Invalid academic summary: averageScore (${summary.averageScore}) must be a finite number in [0, 100]`
      );
    }
    averageScore = parsedAvg;

    const buckets = summary.scoreBuckets;
    if (!buckets || typeof buckets !== "object" || Array.isArray(buckets)) {
      throw new Error("Invalid academic summary: scoreBuckets must be a non-null object");
    }
    const { below70, band70_84, band85_100 } = buckets;
    if (
      !Number.isInteger(below70) ||
      below70 < 0 ||
      !Number.isInteger(band70_84) ||
      band70_84 < 0 ||
      !Number.isInteger(band85_100) ||
      band85_100 < 0
    ) {
      throw new Error(
        "Invalid academic summary: scoreBuckets values must be non-negative integers"
      );
    }
    if (below70 + band70_84 + band85_100 !== distinctLearnersCount) {
      throw new Error(
        `Invalid academic summary: scoreBuckets sum (${below70 + band70_84 + band85_100}) does not match distinctLearnersCount (${distinctLearnersCount})`
      );
    }
    scoreBuckets = { below70, band70_84, band85_100 };
  }

  // 6. Return strictly the 12 canonical fields
  return {
    branchId,
    division,
    period,
    periodStartDate,
    periodEndDate,
    generatedAt,
    aggregationMethod,
    isSuppressed,
    totalReportsCount,
    distinctLearnersCount,
    averageScore,
    scoreBuckets,
  };
}

/**
 * Classifies Firestore REST API error status codes into retry categories.
 *
 * NOTE: PROTOTYPE BEHAVIOR ONLY.
 * Under accepted readiness decision OD-AM-07, exact error retry classifications (e.g. distinguishing
 * daily Spark quota exhaustion from temporary rate limits for HTTP 429) and Cloudflare platform-level
 * scheduled event retry queuing remain UNRESOLVED pending empirical validation on live infrastructure.
 * This classifier provides the bounded retry-suppression prototype demonstrated in Gate 2A.
 *
 * @param {number} status - HTTP status code
 * @param {any} [errorBody] - Optional response body or error details
 * @returns {{
 *   category: "FATAL_CLIENT" | "DEFENSIVELY_SUPPRESSED" | "TRANSIENT_BACKEND" | "UNKNOWN",
 *   retryable: boolean,
 *   shouldSuppressRetry: boolean,
 *   status: number,
 *   reason: string
 * }}
 */
export function classifyFirestoreError(status, errorBody = null) {
  void errorBody;
  const code = Number(status);

  // 1. Client-Side Fatal Errors (Do NOT retry; retries will never succeed without code/IAM fix)
  if (code >= 400 && code <= 404) {
    const reasons = {
      400: "INVALID_ARGUMENT: Malformed query or payload schema mismatch",
      401: "UNAUTHENTICATED: Service account token expired or invalid",
      403: "PERMISSION_DENIED: Service account lacks IAM role or security rule check failed",
      404: "NOT_FOUND: Document, collection, or database path not found",
    };
    return {
      category: "FATAL_CLIENT",
      retryable: false,
      shouldSuppressRetry: true,
      status: code,
      reason: reasons[code] || "Fatal client-side HTTP 4xx error",
    };
  }

  // 2. Resource Exhaustion (HTTP 429) — Defensively Suppressed
  if (code === 429) {
    return {
      category: "DEFENSIVELY_SUPPRESSED",
      retryable: false,
      shouldSuppressRetry: true,
      status: 429,
      reason:
        "RESOURCE_EXHAUSTED: Ambiguous daily Spark quota limit vs transient rate limit. Defensively suppressed to protect daily quota.",
    };
  }

  // 3. Internal Server Error (HTTP 500) — Defensively Suppressed
  if (code === 500) {
    return {
      category: "DEFENSIVELY_SUPPRESSED",
      retryable: false,
      shouldSuppressRetry: true,
      status: 500,
      reason:
        "INTERNAL: Server-side failure. Firestore REST advises not retrying more than once. Defensively suppressed on Cloudflare Free.",
    };
  }

  // 4. Transient Backend Errors (HTTP 503, 504)
  if (code === 503 || code === 504) {
    return {
      category: "TRANSIENT_BACKEND",
      retryable: true,
      shouldSuppressRetry: false,
      status: code,
      reason:
        code === 503
          ? "UNAVAILABLE: Transient backend service unavailability"
          : "DEADLINE_EXCEEDED: Backend timeout",
    };
  }

  return {
    category: "UNKNOWN",
    retryable: false,
    shouldSuppressRetry: true,
    status: code,
    reason: `Unhandled HTTP status ${code}`,
  };
}

/**
 * Handles errors occurring during scheduled summary runs (Gate 2A / OD-AM-07 Prototype).
 * - Calls controller.noRetry() when the error should be suppressed to prevent unbounded retry loops.
 * - Always re-throws the error so that the Cloudflare edge runtime registers invocation failure.
 *
 * NOTE: PROTOTYPE BEHAVIOR ONLY. Exact platform-level retry queuing remains unresolved under OD-AM-07.
 *
 * @param {Error & { status?: number, statusCode?: number }} error
 * @param {{ noRetry?: () => void }} [controller]
 * @throws {Error} Re-throws the input error after enforcing prototype retry policy
 */
export function handleScheduledRunError(error, controller = null) {
  const status = error?.status || error?.statusCode || 500;
  const classification = classifyFirestoreError(status, error);

  if (classification.shouldSuppressRetry && typeof controller?.noRetry === "function") {
    controller.noRetry();
  }

  throw error;
}

/**
 * Parses generatedAt value from summary documents.
 *
 * @param {any} val
 * @returns {Date|null}
 */
export function parseGeneratedAtDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val?.toDate === "function") {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    const d = new Date(val.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Evaluates whether summary data has exceeded the operational staleness threshold (OD-AM-07).
 *
 * @param {any} generatedAt - Generated timestamp from summary document
 * @param {number} [thresholdDays=35] - Staleness threshold in calendar days
 * @param {number} [now=Date.now()] - Current epoch timestamp
 * @returns {{
 *   isStale: boolean,
 *   diffDays: number | null,
 *   thresholdDays: number,
 *   valid: boolean,
 *   genDate: Date | null
 * }}
 */
export function isSummaryStale(
  generatedAt,
  thresholdDays = MONTHLY_STALENESS_THRESHOLD_DAYS,
  now = Date.now()
) {
  const genDate = parseGeneratedAtDate(generatedAt);
  if (!genDate) {
    return {
      isStale: false,
      diffDays: null,
      thresholdDays,
      valid: false,
      genDate: null,
    };
  }

  const diffMs = now - genDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    isStale: diffDays > thresholdDays,
    diffDays,
    thresholdDays,
    valid: true,
    genDate,
  };
}

/**
 * Client-side authorization predicate / UI gating helper for /academicSummaries (OD-AM-08 / Target Contract §6.8).
 * Evaluates whether a client user profile matches the intended Central Academic Lead scope.
 *
 * NOTE: This is a client-side helper function only and does NOT constitute security enforcement.
 * The Firestore security rule for /academicSummaries remains explicitly inactive and undeployed.
 * True security enforcement is provided exclusively by deployed backend firestore.rules.
 *
 * @param {Record<string, any> | null} [user] - User claims or profile object
 * @returns {boolean} True only if client user matches Central Academic Lead profile at Kota Gorontalo
 */
export function canReadAcademicSummaries(user) {
  if (!user || typeof user !== "object") return false;
  const role = String(user.role || "")
    .trim()
    .toLowerCase();
  const branchId = String(user.branchId || user.branch || "")
    .trim()
    .toLowerCase();

  const isLead = role === "instructorleader" || role === "instructor_leader";
  const isKota = branchId === "kota_gorontalo";

  return isLead && isKota;
}

/**
 * Client-side export boundary helper for /academicSummaries (OD-AM-08 / Target Contract §6.8).
 * Indicates that bulk CSV export is strictly prohibited for province-wide academic summaries.
 *
 * NOTE: This is a client-side helper function and does not substitute for backend access control.
 *
 * @param {Record<string, any> | null} [user] - User claims or profile object
 * @returns {boolean} Always false (strictly prohibited)
 */
export function canExportAcademicSummaries(user = null) {
  void user;
  // Bulk CSV export is strictly prohibited under OD-AM-08
  return false;
}
