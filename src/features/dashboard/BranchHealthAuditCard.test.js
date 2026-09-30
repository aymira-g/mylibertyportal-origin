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
  migrateLegacyBranchBatch: vi.fn().mockResolvedValue({
    collectionId: "payments",
    scanned: 15,
    migrated: 3,
    skipped: 12,
  }),
  migrateAllLegacyCollections: vi.fn().mockResolvedValue({
    totalMigrated: 5,
    results: [],
  }),
}));

describe("BranchHealthAuditCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Branch Health Audit header, scan buttons, and readiness title", () => {
    const html = renderToStaticMarkup(
      React.createElement(BranchHealthAuditCard, { defaultExpanded: true })
    );
    expect(html).toContain("Branch Data Isolation &amp; Health Audit");
    expect(html).toContain("Active Audit");
    expect(html).toContain("Re-run health scan");
    expect(html).toContain("Inspecting...");
    expect(html).toContain("Backfill All");
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
});
