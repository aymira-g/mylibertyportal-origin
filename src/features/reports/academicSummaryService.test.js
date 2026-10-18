import { describe, it, expect, vi } from "vitest";
import {
  MONTHLY_STALENESS_THRESHOLD_DAYS,
  DEFAULT_SUPPRESSION_THRESHOLD,
  CANONICAL_SUMMARY_FIELDS,
  ACTIVE_BRANCHES,
  isValidBranchDivision,
  getQuarterBounds,
  parseValidScore,
  categorizeScore,
  aggregatePartitionReports,
  serializeAcademicSummary,
  classifyFirestoreError,
  handleScheduledRunError,
  parseGeneratedAtDate,
  isSummaryStale,
  canReadAcademicSummaries,
  canExportAcademicSummaries,
} from "./academicSummaryService.js";

describe("academicSummaryService — Province-Wide Academic Monitoring (OD-AM-01 to OD-AM-08)", () => {
  // ── 1. Quarter Bounds & Period Definition (OD-AM-03 Period) ──
  describe("1. Quarter bounds calculation (OD-AM-03)", () => {
    it("returns fixed calendar quarter bounds for 2026-Q1 through Q4", () => {
      expect(getQuarterBounds(2026, 1)).toEqual({
        period: "2026-Q1",
        periodStartDate: "2026-01-01",
        periodEndDate: "2026-03-31",
      });
      expect(getQuarterBounds(2026, 2)).toEqual({
        period: "2026-Q2",
        periodStartDate: "2026-04-01",
        periodEndDate: "2026-06-30",
      });
      expect(getQuarterBounds(2026, 3)).toEqual({
        period: "2026-Q3",
        periodStartDate: "2026-07-01",
        periodEndDate: "2026-09-30",
      });
      expect(getQuarterBounds(2026, 4)).toEqual({
        period: "2026-Q4",
        periodStartDate: "2026-10-01",
        periodEndDate: "2026-12-31",
      });
    });

    it("throws for invalid quarter or year", () => {
      expect(() => getQuarterBounds(2026, 0)).toThrow("Invalid quarter index");
      expect(() => getQuarterBounds(2026, 5)).toThrow("Invalid quarter index");
      expect(() => getQuarterBounds(1800, 1)).toThrow("Invalid year");
    });
  });

  // ── 2. Strict Score Validation & Performance Band Categorization ──
  describe("2. Score validation & performance band categorization", () => {
    it("parseValidScore accepts valid numeric scores and numeric strings within [0, 100]", () => {
      expect(parseValidScore(0)).toBe(0);
      expect(parseValidScore(100)).toBe(100);
      expect(parseValidScore(85)).toBe(85);
      expect(parseValidScore(72.5)).toBe(72.5);
      expect(parseValidScore("85")).toBe(85);
      expect(parseValidScore("0")).toBe(0);
      expect(parseValidScore("  92.5  ")).toBe(92.5);
    });

    it("parseValidScore strictly rejects non-numeric or malformed values without false zero-coercion", () => {
      // Must return null, NEVER 0
      expect(parseValidScore(null)).toBeNull();
      expect(parseValidScore(undefined)).toBeNull();
      expect(parseValidScore("")).toBeNull();
      expect(parseValidScore("   ")).toBeNull();
      expect(parseValidScore(false)).toBeNull();
      expect(parseValidScore(true)).toBeNull();
      expect(parseValidScore([])).toBeNull();
      expect(parseValidScore([80])).toBeNull();
      expect(parseValidScore({})).toBeNull();
      expect(parseValidScore(NaN)).toBeNull();
      expect(parseValidScore(Infinity)).toBeNull();
      expect(parseValidScore(-1)).toBeNull();
      expect(parseValidScore(101)).toBeNull();
      expect(parseValidScore("not-a-number")).toBeNull();
    });

    it("categorizes valid scores correctly across standard performance thresholds", () => {
      expect(categorizeScore(69.9)).toBe("below70");
      expect(categorizeScore(0)).toBe("below70");
      expect(categorizeScore(70)).toBe("band70_84");
      expect(categorizeScore(84.9)).toBe("band70_84");
      expect(categorizeScore(85)).toBe("band85_100");
      expect(categorizeScore(100)).toBe("band85_100");
      expect(categorizeScore("85")).toBe("band85_100");
    });

    it("categorizeScore returns null for invalid or out-of-range scores", () => {
      expect(categorizeScore(-1)).toBeNull();
      expect(categorizeScore(101)).toBeNull();
      expect(categorizeScore(NaN)).toBeNull();
      expect(categorizeScore(null)).toBeNull();
      expect(categorizeScore("")).toBeNull();
      expect(categorizeScore(false)).toBeNull();
    });
  });

  // ── 3. Stage 2 Aggregation & Privacy Suppression (OD-AM-02, OD-AM-04, OD-AM-06) ──
  describe("3. Aggregation, learner deduplication & privacy suppression", () => {
    const metadata = {
      branchId: "limboto",
      division: "courses",
      period: "2026-Q3",
      periodStartDate: "2026-07-01",
      periodEndDate: "2026-09-30",
      generatedAt: "2026-10-01T04:00:00.000Z",
    };

    it("has 5 as the default small-cell suppression threshold (OD-AM-02)", () => {
      expect(DEFAULT_SUPPRESSION_THRESHOLD).toBe(5);
    });

    it("enforces small-cell suppression when distinct learners N < 5 (OD-AM-02)", () => {
      // 4 distinct learners (student_1 to student_4)
      const reports = [
        { studentId: "s1", overallScore: 80, instructorId: "inst_1" },
        { studentId: "s1", overallScore: 90, instructorId: "inst_1" }, // Duplicate evaluation
        { studentId: "s2", overallScore: 75, instructorId: "inst_2" },
        { studentId: "s3", overallScore: 60, instructorId: "inst_3" },
        { studentId: "s4", overallScore: 95, instructorId: "inst_4" },
      ];

      const summary = /** @type {Record<string, any>} */ (
        aggregatePartitionReports(reports, metadata)
      );

      expect(summary.isSuppressed).toBe(true);
      expect(summary.suppressed).toBeUndefined();
      // Under OD-AM-02, score details AND counts are concealed for small cells
      expect(summary.averageScore).toBeNull();
      expect(summary.scoreBuckets).toBeNull();
      expect(summary.distinctLearnersCount).toBeNull();
      expect(summary.totalReportsCount).toBeNull();
      expect(summary.branchId).toBe("limboto");
      expect(summary.division).toBe("courses");
      expect(summary.period).toBe("2026-Q3");

      // Verify the generated object has EXACTLY the 12 canonical fields required by Firestore rules
      expect(Object.keys(summary).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
    });

    it("computes per-learner deduplicated average when N >= 5 (OD-AM-06)", () => {
      // 5 distinct learners:
      // s1: scores [80, 100] -> learnerAvg = 90 (band85_100)
      // s2: scores [70] -> learnerAvg = 70 (band70_84)
      // s3: scores [80] -> learnerAvg = 80 (band70_84)
      // s4: scores [60] -> learnerAvg = 60 (below70)
      // s5: scores [100] -> learnerAvg = 100 (band85_100)
      // Cohort Sum = 90 + 70 + 80 + 60 + 100 = 400
      // Cohort Average = 400 / 5 = 80.0
      const reports = [
        { studentId: "s1", overallScore: 80 },
        { studentId: "s1", overallScore: 100 },
        { studentId: "s2", overallScore: 70 },
        { studentId: "s3", overallScore: 80 },
        { studentId: "s4", overallScore: 60 },
        { studentId: "s5", overallScore: 100 },
      ];

      const summary = /** @type {Record<string, any>} */ (
        aggregatePartitionReports(reports, metadata)
      );

      expect(summary.isSuppressed).toBe(false);
      expect(summary.suppressed).toBeUndefined();
      expect(summary.distinctLearnersCount).toBe(5);
      expect(summary.totalReportsCount).toBe(6);
      expect(summary.averageScore).toBe(80.0);
      expect(summary.scoreBuckets).toEqual({
        below70: 1, // s4
        band70_84: 2, // s2, s3
        band85_100: 2, // s1, s5
      });
      expect(summary.aggregationMethod).toBe("learner_average");
      expect(Object.keys(summary).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
    });

    it("strictly excludes staff metrics from output schema (OD-AM-04)", () => {
      const reports = [
        { studentId: "s1", overallScore: 80, instructorId: "inst_1", instructorName: "Teacher A" },
        { studentId: "s2", overallScore: 80, instructorId: "inst_1", instructorName: "Teacher A" },
        { studentId: "s3", overallScore: 80, instructorId: "inst_2", instructorName: "Teacher B" },
        { studentId: "s4", overallScore: 80, instructorId: "inst_2", instructorName: "Teacher B" },
        { studentId: "s5", overallScore: 80, instructorId: "inst_3", instructorName: "Teacher C" },
      ];

      const summary = aggregatePartitionReports(reports, metadata);

      // Verify no staff metrics leaked
      expect(summary).not.toHaveProperty("instructorId");
      expect(summary).not.toHaveProperty("instructorName");
      expect(summary).not.toHaveProperty("instructorMetrics");
      expect(summary).not.toHaveProperty("staffRecency");
      expect(summary).not.toHaveProperty("reportsPerInstructor");
    });

    it("skips reports with null, empty string, boolean, or malformed scores without coercing to zero", () => {
      const reports = [
        { studentId: "s1", overallScore: 80 },
        { studentId: "s1", overallScore: null }, // must be skipped, NOT coerced to 0
        { studentId: "s2", overallScore: "" }, // must be skipped, NOT coerced to 0
        { studentId: "s2", overallScore: false }, // must be skipped, NOT coerced to 0
        { studentId: "s3", overallScore: "   " }, // whitespace string must be skipped
        { studentId: "s3", overallScore: 70 },
        { studentId: "s4", overallScore: undefined }, // must be skipped
        { studentId: "s4", overallScore: 90 },
        { studentId: "s5", overallScore: 85 },
        { studentId: "s6", overallScore: 95 },
      ];

      // Valid distinct learners: s1 (80), s3 (70), s4 (90), s5 (85), s6 (95) -> exactly 5 learners
      // s2 had only invalid scores (empty string, false), so s2 is completely omitted
      // totalReportsCount must be exactly 5 valid reports
      // Cohort average: (80 + 70 + 90 + 85 + 95) / 5 = 420 / 5 = 84.0
      const summary = /** @type {Record<string, any>} */ (
        aggregatePartitionReports(reports, metadata)
      );

      expect(summary.isSuppressed).toBe(false);
      expect(summary.suppressed).toBeUndefined();
      expect(summary.distinctLearnersCount).toBe(5);
      expect(summary.totalReportsCount).toBe(5);
      expect(summary.averageScore).toBe(84.0);
      expect(summary.scoreBuckets).toEqual({
        below70: 0, // CRITICAL: no false zeros leaked into below70!
        band70_84: 2, // s1 (80), s3 (70)
        band85_100: 3, // s4 (90), s5 (85), s6 (95)
      });
      expect(Object.keys(summary).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
    });
  });

  // ── 3.1 Strict 12-Field Schema Serialization (serializeAcademicSummary) ──
  describe("3.1 Strict 12-Field schema serialization (serializeAcademicSummary)", () => {
    it("serializes an unsuppressed summary matching exactly the 12 canonical contract fields", () => {
      const inMemorySummary = {
        branchId: "kota_gorontalo",
        division: "courses",
        period: "2026-Q1",
        periodStartDate: "2026-01-01",
        periodEndDate: "2026-03-31",
        generatedAt: "2026-04-01T00:00:00.000Z",
        aggregationMethod: "learner_average",
        isSuppressed: false,
        totalReportsCount: 12,
        distinctLearnersCount: 8,
        averageScore: 82.5,
        scoreBuckets: { below70: 1, band70_84: 4, band85_100: 3 },
      };

      const serialized = serializeAcademicSummary(inMemorySummary);

      expect(Object.keys(serialized).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
      expect(serialized.isSuppressed).toBe(false);
      expect(serialized.averageScore).toBe(82.5);
      expect(serialized.distinctLearnersCount).toBe(8);
      expect(serialized.totalReportsCount).toBe(12);
      expect(serialized.scoreBuckets).toEqual({
        below70: 1,
        band70_84: 4,
        band85_100: 3,
      });
    });

    it("strictly strips extraneous and unapproved fields (suppressed alias, metadata, PII, staff metrics)", () => {
      const dirtySummary = {
        branchId: "limboto",
        division: "courses",
        period: "2026-Q2",
        periodStartDate: "2026-04-01",
        periodEndDate: "2026-06-30",
        generatedAt: "2026-07-01T00:00:00.000Z",
        aggregationMethod: "learner_average",
        isSuppressed: false,
        totalReportsCount: 6,
        distinctLearnersCount: 5,
        averageScore: 78.0,
        scoreBuckets: { below70: 1, band70_84: 3, band85_100: 1 },
        // Extraneous / forbidden fields that must be stripped:
        suppressed: false,
        metadata: { calculationDurationMs: 12 },
        instructorId: "inst_secret",
        submissionTimeliness: 99.5,
        studentId: "s101",
        studentName: "John Doe",
        notes: "Confidential teacher feedback",
        extraRandomField: "dangerous_payload",
      };

      const serialized = serializeAcademicSummary(dirtySummary);

      // Verifies the serialized keys strictly match the 12 canonical fields
      expect(Object.keys(serialized).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
      // Confirms all forbidden fields are completely absent
      expect(serialized).not.toHaveProperty("suppressed");
      expect(serialized).not.toHaveProperty("metadata");
      expect(serialized).not.toHaveProperty("instructorId");
      expect(serialized).not.toHaveProperty("submissionTimeliness");
      expect(serialized).not.toHaveProperty("studentId");
      expect(serialized).not.toHaveProperty("studentName");
      expect(serialized).not.toHaveProperty("notes");
      expect(serialized).not.toHaveProperty("extraRandomField");
    });

    it("enforces explicit null for all 4 sensitive metrics when suppressed", () => {
      const suppressedInput = {
        branchId: "pohuwato",
        division: "courses",
        period: "2026-Q3",
        periodStartDate: "2026-07-01",
        periodEndDate: "2026-09-30",
        generatedAt: "2026-10-01T04:00:00.000Z",
        aggregationMethod: "learner_average",
        suppressed: true, // legacy alias input
        // Dirty fields that should be forced to null under suppression:
        totalReportsCount: 3,
        distinctLearnersCount: 2,
        averageScore: 92.0,
        scoreBuckets: { below70: 0, band70_84: 0, band85_100: 2 },
      };

      const serialized = serializeAcademicSummary(suppressedInput);

      expect(Object.keys(serialized).sort()).toEqual(CANONICAL_SUMMARY_FIELDS.slice().sort());
      expect(serialized.isSuppressed).toBe(true);
      expect(serialized.averageScore).toBeNull();
      expect(serialized.scoreBuckets).toBeNull();
      expect(serialized.distinctLearnersCount).toBeNull();
      expect(serialized.totalReportsCount).toBeNull();
    });

    it("ensures the serialized document's keys exactly match the 12-field contract when passed the result of aggregatePartitionReports", () => {
      const reports = [
        { studentId: "s1", overallScore: 85 },
        { studentId: "s2", overallScore: 75 },
        { studentId: "s3", overallScore: 90 },
        { studentId: "s4", overallScore: 65 },
        { studentId: "s5", overallScore: 95 },
      ];
      const metadata = {
        branchId: "kota_gorontalo",
        division: "courses",
        period: "2026-Q1",
        periodStartDate: "2026-01-01",
        periodEndDate: "2026-03-31",
      };

      // 1. Unsuppressed partition flow
      const unsuppressedSummary = aggregatePartitionReports(reports, metadata);
      const serializedUnsuppressed = serializeAcademicSummary(unsuppressedSummary);

      expect(Object.keys(serializedUnsuppressed).length).toBe(12);
      expect(Object.keys(serializedUnsuppressed).sort()).toEqual(
        CANONICAL_SUMMARY_FIELDS.slice().sort()
      );
      expect(serializedUnsuppressed).not.toHaveProperty("suppressed");
      expect(serializedUnsuppressed.isSuppressed).toBe(false);

      // 2. Suppressed partition flow (N < 5)
      const suppressedSummary = aggregatePartitionReports(reports.slice(0, 3), metadata);
      const serializedSuppressed = serializeAcademicSummary(suppressedSummary);

      expect(Object.keys(serializedSuppressed).length).toBe(12);
      expect(Object.keys(serializedSuppressed).sort()).toEqual(
        CANONICAL_SUMMARY_FIELDS.slice().sort()
      );
      expect(serializedSuppressed).not.toHaveProperty("suppressed");
      expect(serializedSuppressed.isSuppressed).toBe(true);
      expect(serializedSuppressed.averageScore).toBeNull();
      expect(serializedSuppressed.scoreBuckets).toBeNull();
      expect(serializedSuppressed.distinctLearnersCount).toBeNull();
      expect(serializedSuppressed.totalReportsCount).toBeNull();
    });
  });

  // ── 3.2 Strict Validation & Error Rejection (serializeAcademicSummary) ──
  describe("3.2 Strict validation & rejection of invalid summaries (serializeAcademicSummary)", () => {
    const validBase = {
      branchId: "kota_gorontalo",
      division: "courses",
      period: "2026-Q1",
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-03-31",
      generatedAt: "2026-04-01T00:00:00.000Z",
      aggregationMethod: "learner_average",
      isSuppressed: false,
      totalReportsCount: 10,
      distinctLearnersCount: 6,
      averageScore: 85.0,
      scoreBuckets: { below70: 1, band70_84: 2, band85_100: 3 },
    };

    it("rejects non-object or null input", () => {
      expect(() => serializeAcademicSummary(null)).toThrow("must be a non-null object");
      expect(() => serializeAcademicSummary(undefined)).toThrow("must be a non-null object");
      expect(() => serializeAcademicSummary("string")).toThrow("must be a non-null object");
      expect(() => serializeAcademicSummary([])).toThrow("must be a non-null object");
    });

    it("strictly rejects malformed or non-boolean isSuppressed (e.g. string 'false', numbers, null)", () => {
      // CRITICAL: string "false" must NOT be coerced to boolean true
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: "false" })).toThrow(
        "isSuppressed must be a boolean"
      );
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: "true" })).toThrow(
        "isSuppressed must be a boolean"
      );
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: 0 })).toThrow(
        "isSuppressed must be a boolean"
      );
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: 1 })).toThrow(
        "isSuppressed must be a boolean"
      );
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: null })).toThrow(
        "isSuppressed must be a boolean"
      );
      expect(() => serializeAcademicSummary({ ...validBase, isSuppressed: undefined })).toThrow(
        "isSuppressed must be a boolean"
      );
    });

    it("rejects missing or invalid branchId and division", () => {
      expect(() => serializeAcademicSummary({ ...validBase, branchId: undefined })).toThrow(
        "branchId"
      );
      expect(() => serializeAcademicSummary({ ...validBase, branchId: "jakarta" })).toThrow(
        "branchId 'jakarta' is invalid"
      );
      expect(() => serializeAcademicSummary({ ...validBase, division: "highschool" })).toThrow(
        "division 'highschool' must be 'courses' or 'kindergarten'"
      );
    });

    it("enforces Blueprint v3.4 §4 branch typology (satellites are courses-only)", () => {
      // Main Campus supports both courses and kindergarten
      expect(() =>
        serializeAcademicSummary({
          ...validBase,
          branchId: "kota_gorontalo",
          division: "kindergarten",
        })
      ).not.toThrow();

      // Satellite branches must reject kindergarten
      ["bone_bolango", "limboto", "pohuwato"].forEach((satBranch) => {
        expect(() =>
          serializeAcademicSummary({ ...validBase, branchId: satBranch, division: "kindergarten" })
        ).toThrow("satellites are courses-only");
      });
    });

    it("rejects malformed period and mismatched quarter dates (OD-AM-03)", () => {
      expect(() => serializeAcademicSummary({ ...validBase, period: "2026-Q5" })).toThrow(
        "must match format YYYY-Q[1-4]"
      );
      expect(() => serializeAcademicSummary({ ...validBase, period: "2026-01" })).toThrow(
        "must match format YYYY-Q[1-4]"
      );

      // Period is 2026-Q1, but startDate is 2026-01-15 (must be 2026-01-01)
      expect(() =>
        serializeAcademicSummary({ ...validBase, periodStartDate: "2026-01-15" })
      ).toThrow("quarter dates '2026-01-15' to '2026-03-31' do not match expected bounds");

      // Period is 2026-Q1, but endDate is 2026-04-01 (must be 2026-03-31)
      expect(() => serializeAcademicSummary({ ...validBase, periodEndDate: "2026-04-01" })).toThrow(
        "quarter dates '2026-01-01' to '2026-04-01' do not match expected bounds"
      );
    });

    it("rejects missing or invalid generatedAt and aggregationMethod", () => {
      expect(() => serializeAcademicSummary({ ...validBase, generatedAt: undefined })).toThrow(
        "generatedAt must be a valid ISO date string"
      );
      expect(() => serializeAcademicSummary({ ...validBase, generatedAt: "not-a-date" })).toThrow(
        "generatedAt must be a valid ISO date string"
      );
      expect(() =>
        serializeAcademicSummary({ ...validBase, aggregationMethod: "raw_average" })
      ).toThrow("aggregationMethod 'raw_average' must be 'learner_average'");
    });

    it("rejects unsuppressed summaries with invariant violations (N < 5, bad counts, score bounds, bucket sums)", () => {
      // 1. distinctLearnersCount < 5 when unsuppressed
      expect(() =>
        serializeAcademicSummary({
          ...validBase,
          distinctLearnersCount: 4,
          scoreBuckets: { below70: 1, band70_84: 2, band85_100: 1 },
        })
      ).toThrow("unsuppressed summary must have distinctLearnersCount >= 5");

      // 2. totalReportsCount < distinctLearnersCount
      expect(() =>
        serializeAcademicSummary({
          ...validBase,
          distinctLearnersCount: 6,
          totalReportsCount: 5,
        })
      ).toThrow("totalReportsCount (5) must be an integer >= distinctLearnersCount (6)");

      // 3. averageScore out of bounds or non-numeric
      expect(() => serializeAcademicSummary({ ...validBase, averageScore: 101 })).toThrow(
        "averageScore (101) must be a finite number in [0, 100]"
      );
      expect(() => serializeAcademicSummary({ ...validBase, averageScore: -1 })).toThrow(
        "averageScore (-1) must be a finite number in [0, 100]"
      );
      expect(() => serializeAcademicSummary({ ...validBase, averageScore: NaN })).toThrow(
        "averageScore (NaN) must be a finite number in [0, 100]"
      );

      // 4. scoreBuckets sum mismatch (distinctLearnersCount is 6, but buckets sum to 5)
      expect(() =>
        serializeAcademicSummary({
          ...validBase,
          distinctLearnersCount: 6,
          scoreBuckets: { below70: 1, band70_84: 2, band85_100: 2 },
        })
      ).toThrow("scoreBuckets sum (5) does not match distinctLearnersCount (6)");

      // 5. scoreBuckets negative or non-integer
      expect(() =>
        serializeAcademicSummary({
          ...validBase,
          scoreBuckets: { below70: -1, band70_84: 4, band85_100: 3 },
        })
      ).toThrow("scoreBuckets values must be non-negative integers");
    });

    it("isValidBranchDivision correctly maps Blueprint v3.4 §4 branch typology", () => {
      expect(isValidBranchDivision("kota_gorontalo", "courses")).toBe(true);
      expect(isValidBranchDivision("kota_gorontalo", "kindergarten")).toBe(true);
      expect(isValidBranchDivision("bone_bolango", "courses")).toBe(true);
      expect(isValidBranchDivision("bone_bolango", "kindergarten")).toBe(false);
      expect(isValidBranchDivision("limboto", "courses")).toBe(true);
      expect(isValidBranchDivision("limboto", "kindergarten")).toBe(false);
      expect(isValidBranchDivision("pohuwato", "courses")).toBe(true);
      expect(isValidBranchDivision("pohuwato", "kindergarten")).toBe(false);
      expect(isValidBranchDivision("unknown_branch", "courses")).toBe(false);
    });
  });

  // ── 4. Error Classification & Bounded Retries (Gate 2A / OD-AM-07) ──
  describe("4. Error classification & bounded retry handling (OD-AM-07)", () => {
    it("classifies HTTP 400, 401, 403, 404 as fatal client errors (suppress retry)", () => {
      [400, 401, 403, 404].forEach((status) => {
        const res = classifyFirestoreError(status);
        expect(res.category).toBe("FATAL_CLIENT");
        expect(res.retryable).toBe(false);
        expect(res.shouldSuppressRetry).toBe(true);
      });
    });

    it("classifies HTTP 429 and 500 as defensively suppressed (suppress retry)", () => {
      const res429 = classifyFirestoreError(429);
      expect(res429.category).toBe("DEFENSIVELY_SUPPRESSED");
      expect(res429.retryable).toBe(false);
      expect(res429.shouldSuppressRetry).toBe(true);

      const res500 = classifyFirestoreError(500);
      expect(res500.category).toBe("DEFENSIVELY_SUPPRESSED");
      expect(res500.retryable).toBe(false);
      expect(res500.shouldSuppressRetry).toBe(true);
    });

    it("classifies HTTP 503 and 504 as transient backend errors (unsuppressed retry)", () => {
      [503, 504].forEach((status) => {
        const res = classifyFirestoreError(status);
        expect(res.category).toBe("TRANSIENT_BACKEND");
        expect(res.retryable).toBe(true);
        expect(res.shouldSuppressRetry).toBe(false);
      });
    });

    it("handleScheduledRunError calls controller.noRetry() for fatal errors and re-throws", () => {
      const mockController = { noRetry: vi.fn() };
      const err = Object.assign(new Error("Permission denied"), { status: 403 });

      expect(() => handleScheduledRunError(err, mockController)).toThrow("Permission denied");
      expect(mockController.noRetry).toHaveBeenCalledTimes(1);
    });

    it("handleScheduledRunError leaves retry active for transient 503 errors and re-throws", () => {
      const mockController = { noRetry: vi.fn() };
      const err = Object.assign(new Error("Service Unavailable"), { status: 503 });

      expect(() => handleScheduledRunError(err, mockController)).toThrow("Service Unavailable");
      expect(mockController.noRetry).not.toHaveBeenCalled();
    });
  });

  // ── 5. Freshness & Staleness Evaluation (OD-AM-07) ──
  describe("5. Summary freshness and 35-day staleness threshold (OD-AM-07)", () => {
    it("has 35-day approved staleness threshold", () => {
      expect(MONTHLY_STALENESS_THRESHOLD_DAYS).toBe(35);
    });

    it("parses valid date formats accurately", () => {
      const iso = "2026-10-01T04:00:00.000Z";
      expect(parseGeneratedAtDate(iso)?.toISOString()).toBe(iso);

      const d = new Date(iso);
      expect(parseGeneratedAtDate(d)?.getTime()).toBe(d.getTime());

      const fsTs = { toDate: () => new Date(iso) };
      expect(parseGeneratedAtDate(fsTs)?.toISOString()).toBe(iso);

      const rawTs = { seconds: 1790827200, nanoseconds: 0 };
      expect(parseGeneratedAtDate(rawTs)?.toISOString()).toBe(iso);
    });

    it("evaluates fresh summary (diff <= 35 days) as not stale", () => {
      const now = new Date("2026-10-20T12:00:00.000Z").getTime();
      const generatedAt = "2026-10-01T04:00:00.000Z"; // 19 days old

      const res = isSummaryStale(generatedAt, 35, now);
      expect(res.valid).toBe(true);
      expect(res.isStale).toBe(false);
      expect(res.diffDays).toBe(19);
    });

    it("evaluates old summary (diff > 35 days) as stale", () => {
      const now = new Date("2026-11-10T12:00:00.000Z").getTime();
      const generatedAt = "2026-10-01T04:00:00.000Z"; // 40 days old

      const res = isSummaryStale(generatedAt, 35, now);
      expect(res.valid).toBe(true);
      expect(res.isStale).toBe(true);
      expect(res.diffDays).toBe(40);
    });

    it("returns valid: false when generatedAt is missing or invalid", () => {
      expect(isSummaryStale(null).valid).toBe(false);
      expect(isSummaryStale(undefined).valid).toBe(false);
      expect(isSummaryStale("invalid-date").valid).toBe(false);
    });
  });

  // ── 6. Access Boundaries & Export Prohibition (OD-AM-08 / Target Contract §6.8) ──
  describe("6. Access boundaries and bulk CSV export prohibition (OD-AM-08)", () => {
    it("permits read visibility strictly to Central Academic Lead at Kota Gorontalo", () => {
      const centralLead = { role: "instructorleader", branchId: "kota_gorontalo" };
      expect(canReadAcademicSummaries(centralLead)).toBe(true);

      const centralLeadAlias = { role: "instructor_leader", branchId: "kota_gorontalo" };
      expect(canReadAcademicSummaries(centralLeadAlias)).toBe(true);
    });

    it("denies read visibility to all other roles and satellite branches", () => {
      // Satellite branch instructor leaders denied
      expect(canReadAcademicSummaries({ role: "instructorleader", branchId: "limboto" })).toBe(
        false
      );
      expect(canReadAcademicSummaries({ role: "instructorleader", branchId: "bone_bolango" })).toBe(
        false
      );

      // Executives denied under OD-AM-08 view access boundary
      expect(canReadAcademicSummaries({ role: "director", branchId: "kota_gorontalo" })).toBe(
        false
      );
      expect(canReadAcademicSummaries({ role: "vice_director", branchId: "kota_gorontalo" })).toBe(
        false
      );

      // Technical admin denied
      expect(canReadAcademicSummaries({ role: "admin", branchId: "kota_gorontalo" })).toBe(false);

      // Branch staff denied
      expect(canReadAcademicSummaries({ role: "manager", branchId: "kota_gorontalo" })).toBe(false);
      expect(canReadAcademicSummaries({ role: "frontoffice", branchId: "kota_gorontalo" })).toBe(
        false
      );
      expect(canReadAcademicSummaries({ role: "instructor", branchId: "kota_gorontalo" })).toBe(
        false
      );
      expect(canReadAcademicSummaries({ role: "opslead", branchId: "kota_gorontalo" })).toBe(false);
    });

    it("strictly prohibits bulk CSV export for all users (OD-AM-08)", () => {
      const centralLead = { role: "instructorleader", branchId: "kota_gorontalo" };
      const director = { role: "director", branchId: "kota_gorontalo" };
      const admin = { role: "admin", branchId: "kota_gorontalo" };

      expect(canExportAcademicSummaries(centralLead)).toBe(false);
      expect(canExportAcademicSummaries(director)).toBe(false);
      expect(canExportAcademicSummaries(admin)).toBe(false);
      expect(canExportAcademicSummaries(null)).toBe(false);
    });
  });
});
