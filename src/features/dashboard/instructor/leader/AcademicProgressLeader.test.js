import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AcademicProgressLeader, {
  SummaryStalenessBanner,
  parseGeneratedAt,
  formatWitaDateTime,
  MONTHLY_STALENESS_THRESHOLD_DAYS,
} from "./AcademicProgressLeader.jsx";

describe("AcademicProgressLeader — Dormant Staleness Indicator & Date Parsing (OD-AM-07 Prep)", () => {
  describe("1. Staleness Threshold Invariant", () => {
    it("has explicit 35-day staleness threshold approved for monthly generation", () => {
      expect(MONTHLY_STALENESS_THRESHOLD_DAYS).toBe(35);
    });
  });

  describe("2. parseGeneratedAt date parsing", () => {
    it("parses valid ISO string", () => {
      const d = parseGeneratedAt("2026-10-01T04:00:00.000Z");
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    });

    it("parses JS Date object", () => {
      const input = new Date("2026-09-01T12:00:00.000Z");
      const d = parseGeneratedAt(input);
      expect(d).toBeInstanceOf(Date);
      expect(d?.getTime()).toBe(input.getTime());
    });

    it("parses Firestore Timestamp with toDate() method", () => {
      const mockTimestamp = {
        toDate: () => new Date("2026-10-05T00:00:00.000Z"),
      };
      const d = parseGeneratedAt(mockTimestamp);
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    });

    it("parses Firestore Timestamp with { seconds, nanoseconds }", () => {
      const mockTimestamp = {
        seconds: 1790827200, // 2026-10-01T04:00:00.000Z
        nanoseconds: 0,
      };
      const d = parseGeneratedAt(mockTimestamp);
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    });

    it("returns null for missing, null, undefined, or invalid timestamps", () => {
      expect(parseGeneratedAt(null)).toBeNull();
      expect(parseGeneratedAt(undefined)).toBeNull();
      expect(parseGeneratedAt("")).toBeNull();
      expect(parseGeneratedAt("invalid-date-string")).toBeNull();
      expect(parseGeneratedAt({ toDate: () => new Date("invalid") })).toBeNull();
      expect(parseGeneratedAt({})).toBeNull();
    });
  });

  describe("3. formatWitaDateTime WITA timezone formatting", () => {
    it("formats dates using WITA (Asia/Makassar / UTC+8)", () => {
      const d = new Date("2026-10-01T04:00:00.000Z"); // 12:00 WITA
      const formatted = formatWitaDateTime(d);
      expect(formatted).toContain("12.00");
      expect(formatted).toContain("WITA");
      expect(formatted).toMatch(/1 Okt 2026|1 Oct 2026/);
    });

    it("returns empty string for null or invalid date", () => {
      expect(formatWitaDateTime(null)).toBe("");
      expect(formatWitaDateTime(new Date("invalid"))).toBe("");
    });
  });

  describe("4. SummaryStalenessBanner dormancy & rendering", () => {
    it("strictly returns null (dormant) when summary is null or undefined", () => {
      expect(SummaryStalenessBanner({ summary: null })).toBeNull();
      expect(SummaryStalenessBanner({ summary: undefined })).toBeNull();
    });

    it("strictly returns null (dormant) when summary exists but generatedAt is missing, null, or invalid", () => {
      expect(SummaryStalenessBanner({ summary: {} })).toBeNull();
      expect(SummaryStalenessBanner({ summary: { generatedAt: null } })).toBeNull();
      expect(SummaryStalenessBanner({ summary: { generatedAt: "not-a-date" } })).toBeNull();
    });

    it("returns null when summary was generated within the 35-day threshold (fresh data)", () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(
        SummaryStalenessBanner({ summary: { generatedAt: recentDate.toISOString() } })
      ).toBeNull();
    });

    it("returns warning banner element when summary is older than the 35-day threshold (stale data)", () => {
      const staleDate = new Date(Date.now() - 36 * 24 * 60 * 60 * 1000); // 36 days ago
      const html = renderToStaticMarkup(
        React.createElement(SummaryStalenessBanner, {
          summary: { generatedAt: staleDate.toISOString() },
        })
      );

      expect(html).toContain('data-testid="summary-staleness-banner"');
      expect(html).toContain('role="status"');
      expect(html).toContain("Academic summary data may be stale (36 days old)");
      expect(html).toContain("35 days (monthly generation on the 1st plus a 4-day grace period)");
      expect(html).toContain("WITA");
    });
  });

  describe("5. AcademicProgressLeader integration dormancy", () => {
    it("renders AcademicProgressLeader with dormant SummaryStalenessBanner by default", () => {
      const html = renderToStaticMarkup(
        React.createElement(AcademicProgressLeader, {
          reports: [],
          progressCoverage: null,
          loading: false,
          error: "",
          branchInstructors: [],
        })
      );

      // Must not render staleness banner
      expect(html).not.toContain("summary-staleness-banner");
      expect(html).not.toContain("may be stale");
      // Must render branch academic progress card
      expect(html).toContain("Branch Academic Progress");
    });

    it("renders staleness banner when summaryPartition with stale generatedAt is provided", () => {
      const staleDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const html = renderToStaticMarkup(
        React.createElement(AcademicProgressLeader, {
          reports: [],
          progressCoverage: null,
          loading: false,
          error: "",
          branchInstructors: [],
          summaryPartition: { generatedAt: staleDate.toISOString() },
        })
      );

      expect(html).toContain("summary-staleness-banner");
      expect(html).toContain("Academic summary data may be stale (40 days old)");
      expect(html).toContain("Branch Academic Progress");
    });
  });
});
