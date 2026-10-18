/**
 * @file academicSummaryBenchmark.test.js
 * @description Unit test suite validating Gate 1 algorithm correctness,
 * edge-case resilience, deduplication, suppression thresholds (N < 3, N < 5),
 * and query-plan cost model invariants.
 *
 * Authority: Noncanonical Feasibility Study §10.1 (Owner Decision 2026-10-18)
 */

import { describe, it, expect } from "vitest";
import {
  categorizeScore,
  aggregateBranchDivisionReports,
  aggregateAllAcademicReports,
  generateSyntheticReports,
  calculateQueryPlanCostModel,
  runIndicativeBenchmark,
  ACTIVE_BRANCHES,
} from "./academicSummaryBenchmark.js";

describe("Gate 1 Feasibility: Academic Summary Algorithm & Edge-Case Validation (§10.1)", () => {
  describe("1. Score Categorization Logic", () => {
    it("correctly categorizes scores into the 4 standard performance bands", () => {
      expect(categorizeScore(95)).toBe("advanced");
      expect(categorizeScore(90)).toBe("advanced");
      expect(categorizeScore(89.9)).toBe("proficient");
      expect(categorizeScore(75)).toBe("proficient");
      expect(categorizeScore(74.9)).toBe("developing");
      expect(categorizeScore(60)).toBe("developing");
      expect(categorizeScore(59.9)).toBe("needsSupport");
      expect(categorizeScore(0)).toBe("needsSupport");
    });

    it("rejects non-numeric, finite out-of-range, and NaN values", () => {
      expect(categorizeScore(-5)).toBeNull();
      expect(categorizeScore(105)).toBeNull();
      expect(categorizeScore(NaN)).toBeNull();
      expect(categorizeScore(Infinity)).toBeNull();
      expect(categorizeScore("85")).toBeNull(); // Requires numeric type
      expect(categorizeScore(null)).toBeNull();
      expect(categorizeScore(undefined)).toBeNull();
    });
  });

  describe("2. Learner Deduplication & Aggregation", () => {
    it("deduplicates studentId using Set, correctly separating distinctLearnersCount from totalReportsCount", () => {
      const reports = [
        { studentId: "s1", overallScore: 85 },
        { studentId: "s1", overallScore: 90 }, // duplicate student s1
        { studentId: "s2", overallScore: 70 },
        { studentId: "s2", overallScore: 65 }, // duplicate student s2
        { studentId: "s3", overallScore: 95 },
        { studentId: "s4", overallScore: 80 },
        { studentId: "s5", overallScore: 60 },
      ];

      const summary = aggregateBranchDivisionReports(reports, {
        branchId: "kota_gorontalo",
        division: "courses",
        period: "2026-Q4",
        suppressionThreshold: 5,
      });

      expect(summary.totalReportsCount).toBe(7);
      expect(summary.distinctLearnersCount).toBe(5); // 5 unique students: s1, s2, s3, s4, s5
      expect(summary.suppressed).toBe(false);

      // Average should be computed over all 7 valid reports: (85+90+70+65+95+80+60)/7 = 545/7 = 77.857... -> 77.9
      expect(summary.averageScore).toBe(77.9);

      // Score buckets:
      // advanced (>=90): 90, 95 -> 2
      // proficient (75-89): 85, 80 -> 2
      // developing (60-74): 70, 65, 60 -> 3
      // needsSupport (<60): 0
      expect(summary.scoreBuckets).toEqual({
        needsSupport: 0,
        developing: 3,
        proficient: 2,
        advanced: 2,
      });
    });
  });

  describe("3. Small-Cell Suppression Thresholds (N < 3 vs N < 5)", () => {
    const smallCohortReports = [
      { studentId: "s1", overallScore: 88 },
      { studentId: "s2", overallScore: 92 },
      { studentId: "s2", overallScore: 94 }, // s2 has 2 reports; total distinct = 2
    ];

    it("suppresses score buckets and averages when distinct learners < 3 (N=2)", () => {
      const summaryN3 = aggregateBranchDivisionReports(smallCohortReports, {
        branchId: "pohuwato",
        division: "courses",
        period: "2026-Q4",
        suppressionThreshold: 3,
      });

      expect(summaryN3.distinctLearnersCount).toBe(2);
      expect(summaryN3.totalReportsCount).toBe(3);
      expect(summaryN3.suppressed).toBe(true);
      expect(summaryN3.scoreBuckets).toBeNull();
      expect(summaryN3.averageScore).toBeNull();
    });

    it("suppresses score buckets and averages when distinct learners < 5 (N=4)", () => {
      const fourLearnersReports = [
        { studentId: "s1", overallScore: 80 },
        { studentId: "s2", overallScore: 75 },
        { studentId: "s3", overallScore: 90 },
        { studentId: "s4", overallScore: 65 },
      ];

      // Under threshold 5: suppressed
      const summaryN5 = aggregateBranchDivisionReports(fourLearnersReports, {
        branchId: "pohuwato",
        division: "courses",
        period: "2026-Q4",
        suppressionThreshold: 5,
      });
      expect(summaryN5.distinctLearnersCount).toBe(4);
      expect(summaryN5.suppressed).toBe(true);
      expect(summaryN5.scoreBuckets).toBeNull();
      expect(summaryN5.averageScore).toBeNull();

      // Under threshold 3: NOT suppressed
      const summaryN3 = aggregateBranchDivisionReports(fourLearnersReports, {
        branchId: "pohuwato",
        division: "courses",
        period: "2026-Q4",
        suppressionThreshold: 3,
      });
      expect(summaryN3.distinctLearnersCount).toBe(4);
      expect(summaryN3.suppressed).toBe(false);
      expect(summaryN3.scoreBuckets).not.toBeNull();
      expect(summaryN3.averageScore).toBe(77.5);
    });
  });

  describe("4. Edge-Case Resilience", () => {
    it("handles completely empty cohort safely", () => {
      const summary = aggregateBranchDivisionReports([], {
        branchId: "pohuwato",
        division: "courses",
        period: "2026-Q4",
      });

      expect(summary.totalReportsCount).toBe(0);
      expect(summary.distinctLearnersCount).toBe(0);
      expect(summary.suppressed).toBe(true);
      expect(summary.scoreBuckets).toBeNull();
      expect(summary.averageScore).toBeNull();
    });

    it("normalizes unstamped legacy division safely to 'courses'", () => {
      const legacyReports = [
        { studentId: "s1", branchId: "kota_gorontalo", overallScore: 82 }, // missing division
        { studentId: "s2", branchId: "kota_gorontalo", overallScore: 78 }, // missing division
        { studentId: "s3", branchId: "kota_gorontalo", division: "courses", overallScore: 91 },
      ];

      const summaries = aggregateAllAcademicReports(legacyReports, {
        suppressionThreshold: 3,
      });

      const coursesSummary = summaries.find(
        (s) => s.branchId === "kota_gorontalo" && s.division === "courses"
      );

      expect(coursesSummary).toBeDefined();
      expect(coursesSummary.totalReportsCount).toBe(3);
      expect(coursesSummary.distinctLearnersCount).toBe(3);
      expect(coursesSummary.suppressed).toBe(false);
    });

    it("handles string scores and null/invalid scores without crashing or generating NaN", () => {
      const messyReports = [
        { studentId: "s1", overallScore: "85.5" }, // string numeric
        { studentId: "s2", overallScore: null }, // null score
        { studentId: "s3", overallScore: "invalid_str" }, // unparseable
        { studentId: "s4", overallScore: 75 },
        { studentId: "s5", overallScore: 90 },
      ];

      const summary = aggregateBranchDivisionReports(messyReports, {
        branchId: "limboto",
        division: "courses",
        suppressionThreshold: 3,
      });

      expect(summary.distinctLearnersCount).toBe(5);
      expect(summary.totalReportsCount).toBe(5);
      expect(summary.suppressed).toBe(false);

      // Valid scores: 85.5 (proficient), 75 (proficient), 90 (advanced) -> Sum: 250.5 / 3 = 83.5
      expect(summary.averageScore).toBe(83.5);
      expect(summary.scoreBuckets.proficient).toBe(2);
      expect(summary.scoreBuckets.advanced).toBe(1);
      expect(summary.scoreBuckets.developing).toBe(0);
      expect(summary.scoreBuckets.needsSupport).toBe(0);
    });
  });

  describe("5. Multi-Branch Province-Wide Partitioning", () => {
    it("generates summaries for all 4 physical branches and active divisions", () => {
      const syntheticData = generateSyntheticReports(200);
      const summaries = aggregateAllAcademicReports(syntheticData, {
        suppressionThreshold: 5,
      });

      const branchIds = new Set(summaries.map((s) => s.branchId));
      for (const branchId of ACTIVE_BRANCHES) {
        expect(branchIds.has(branchId)).toBe(true);
      }

      // Check kindergarten is only present for Kota Gorontalo
      const kgSummary = summaries.find(
        (s) => s.branchId === "kota_gorontalo" && s.division === "kindergarten"
      );
      expect(kgSummary).toBeDefined();

      const satelliteKg = summaries.find(
        (s) => s.branchId === "pohuwato" && s.division === "kindergarten"
      );
      expect(satelliteKg).toBeUndefined(); // Satellite branches do not have kindergarten
    });
  });

  describe("6. Query Plan Cost Model Calculations", () => {
    it("calculates exact query plan parameters for weekly batch execution", () => {
      const costModel = calculateQueryPlanCostModel(500, "weekly");

      // Check HTTP subrequests
      expect(costModel.httpSubrequestsPerBatchRun).toBe(4);
      expect(costModel.cloudflareSubrequestLimit).toBe(50);
      expect(costModel.subrequestFit).toBe(true);

      // Check document read calculations
      // 500 reports/week / 7 days ~ 71 reads/day
      expect(costModel.estimatedDailyReads).toBe(71);
      expect(costModel.sparkDailyReadQuota).toBe(50000);
      expect(costModel.readQuotaUtilizationPercent).toBeLessThan(0.2); // ~0.14%

      // Check writes
      expect(costModel.estimatedDailyWrites).toBe(1); // 5 writes/week / 7 ~ 1 write/day
      expect(costModel.clientReadsPerDashboardLoad).toBe(5);
    });

    it("evaluates scaling at N = 2000 reports", () => {
      const costModel = calculateQueryPlanCostModel(2000, "weekly");
      // 2000 / 7 ~ 286 reads/day
      expect(costModel.estimatedDailyReads).toBe(286);
      expect(costModel.readQuotaUtilizationPercent).toBeLessThan(0.6); // ~0.57%
      expect(costModel.httpSubrequestsPerBatchRun).toBe(4); // Constant subrequests regardless of N
    });
  });

  describe("7. Indicative Benchmark Runner Verification", () => {
    it("runs the full benchmark matrix across N = 100, 500, 1000, 2000 without errors", () => {
      const benchmarkOutput = runIndicativeBenchmark();

      expect(benchmarkOutput.results).toHaveLength(4);
      expect(benchmarkOutput.results.map((r) => r.datasetSize)).toEqual([
        100, 500, 1000, 2000,
      ]);

      // Every size produced valid timing numbers
      for (const res of benchmarkOutput.results) {
        expect(res.meanMs).toBeGreaterThan(0);
        expect(res.partitionsCount).toBe(5); // 4 branches (Kota has 2 divisions = 5 partitions)
      }

      // Check algorithmic complexity assertion
      expect(benchmarkOutput.algorithmComplexity).toContain("O(N)");
    });
  });

  describe("8. Prototype Policy & Query-Plan Limitations (§10.1)", () => {
    it("documents that averageScore and scoreBuckets are report-weighted, not learner-weighted", () => {
      // Learner 1 has 3 reports with score 50 (struggling student with multiple term evaluations)
      // Learner 2 has 1 report with score 90
      // Learner 3 has 1 report with score 90
      // Learner 4 has 1 report with score 90
      // Learner 5 has 1 report with score 90
      const reports = [
        { studentId: "learner_1", overallScore: 50 },
        { studentId: "learner_1", overallScore: 50 },
        { studentId: "learner_1", overallScore: 50 },
        { studentId: "learner_2", overallScore: 90 },
        { studentId: "learner_3", overallScore: 90 },
        { studentId: "learner_4", overallScore: 90 },
        { studentId: "learner_5", overallScore: 90 },
      ];

      const summary = aggregateBranchDivisionReports(reports, {
        branchId: "kota_gorontalo",
        division: "courses",
        suppressionThreshold: 5,
      });

      // distinctLearnersCount correctly deduplicates to 5 unique learners
      expect(summary.distinctLearnersCount).toBe(5);
      expect(summary.totalReportsCount).toBe(7);

      // Report-weighted average: (50*3 + 90*4) / 7 = (150 + 360) / 7 = 510 / 7 = 72.857... -> 72.9 (developing)
      // Note: A learner-weighted mean would be (50 + 90 + 90 + 90 + 90) / 5 = 410 / 5 = 82.0 (proficient)
      expect(summary.averageScore).toBe(72.9);
      expect(summary.scoreBuckets.needsSupport).toBe(3); // Learner 1 contributes 3 times
      expect(summary.scoreBuckets.advanced).toBe(4);
    });

    it("documents in-memory missing branch fallback behavior vs query plan mismatch", () => {
      // In-memory code assigns unstamped branch to kota_gorontalo
      const unstampedReport = [{ studentId: "s1", division: "courses", overallScore: 80 }];
      const summaries = aggregateAllAcademicReports(unstampedReport, { suppressionThreshold: 1 });
      const kotaSummary = summaries.find(s => s.branchId === "kota_gorontalo" && s.division === "courses");

      expect(kotaSummary.totalReportsCount).toBe(1);
      // NOTE: In production Firestore, a query with `where("branchId", "==", "kota_gorontalo")`
      // will NOT match this document because missing fields are excluded by equality filters.
    });
  });
});

