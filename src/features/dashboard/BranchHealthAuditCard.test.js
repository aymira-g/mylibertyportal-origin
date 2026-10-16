import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BranchHealthAuditCard from "./BranchHealthAuditCard";

vi.mock("./branchAuditRepository", () => ({
  runBranchHealthAudit: vi.fn().mockResolvedValue({
    overallReadiness: 85,
    totalScanned: 100,
    totalCanonical: 85,
    totalLegacy: 10,
    totalMissing: 5,
    collections: [
      {
        collectionId: "users",
        label: "Users (Students & Staff)",
        total: 20,
        canonical: 18,
        legacy: 2,
        missing: 0,
        readinessPercent: 90,
      },
      {
        collectionId: "payments",
        label: "Payments & Tuition",
        total: 15,
        canonical: 12,
        legacy: 3,
        missing: 0,
        readinessPercent: 80,
      },
    ],
    timestamp: "2026-09-30T10:00:00.000Z",
  }),
}));

describe("BranchHealthAuditCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Branch Health Audit header, scan button, and readiness title", () => {
    const html = renderToStaticMarkup(
      React.createElement(BranchHealthAuditCard, { defaultExpanded: true })
    );
    expect(html).toContain("Branch Data Isolation &amp; Health Audit");
    expect(html).toContain("Active Audit");
    expect(html).toContain("Re-run health scan");
    expect(html).toContain("Inspecting...");
    expect(html).not.toContain("Backfill All");
    expect(html).toContain("Scanning collections for branch partition health...");
  });

  it("renders collapsed mode when defaultExpanded is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(BranchHealthAuditCard, { defaultExpanded: false })
    );
    expect(html).toContain("Branch Data Isolation &amp; Health Audit");
    // When collapsed, the body is not in HTML
    expect(html).not.toContain("Readiness Score");
  });

  it("renders explicit 'Not Scanned' state for collections that failed with error instead of 'Aligned'", () => {
    const mockDataWithError = {
      overallReadiness: 90,
      totalScanned: 20,
      totalCanonical: 18,
      totalLegacy: 2,
      totalMissing: 0,
      failedScansCount: 1,
      collections: [
        {
          collectionId: "shifts",
          label: "Staff Shifts",
          total: 0,
          canonical: 0,
          legacy: 0,
          missing: 0,
          readinessPercent: null,
          error: "Missing or insufficient permissions.",
        },
        {
          collectionId: "users",
          label: "Users (Students & Staff)",
          total: 20,
          canonical: 20,
          legacy: 0,
          missing: 0,
          readinessPercent: 100,
        },
      ],
      timestamp: "2026-09-30T10:00:00.000Z",
    };

    const html = renderToStaticMarkup(
      React.createElement(BranchHealthAuditCard, {
        defaultExpanded: true,
        initialData: mockDataWithError,
      })
    );

    // Shows Not Scanned for the failed collection
    expect(html).toContain("Not Scanned");
    expect(html).toContain("1 collection not scanned");
    // Does not turn failed collection into Aligned
    expect(html).toContain("Users (Students &amp; Staff)");
    expect(html).toContain("Staff Shifts");
  });

  it("renders 'Not Scanned' for the overall readiness score when all collection scans fail", () => {
    const allFailedAudit = {
      overallReadiness: null,
      totalScanned: 0,
      totalCanonical: 0,
      totalLegacy: 0,
      totalMissing: 0,
      failedScansCount: 2,
      collections: [
        {
          collectionId: "users",
          label: "Users (Students & Staff)",
          total: 0,
          canonical: 0,
          legacy: 0,
          missing: 0,
          readinessPercent: null,
          error: "Permission denied",
        },
        {
          collectionId: "payments",
          label: "Payments & Tuition",
          total: 0,
          canonical: 0,
          legacy: 0,
          missing: 0,
          readinessPercent: null,
          error: "Permission denied",
        },
      ],
      timestamp: "2026-09-30T10:00:00.000Z",
    };

    const html = renderToStaticMarkup(
      React.createElement(BranchHealthAuditCard, {
        defaultExpanded: true,
        initialData: allFailedAudit,
      })
    );

    expect(html).toContain("Readiness Score");
    expect(html).toContain("Not Scanned");
    expect(html).not.toContain("0%</span>");
    expect(html).not.toContain("partitioned</span>");
    expect(html).toContain("All collection scans failed");
  });
});
