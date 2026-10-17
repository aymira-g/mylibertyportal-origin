import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OpsLeadProgressReportsTab from "./OpsLeadProgressReportsTab";
import * as progressReportsRepo from "../../students/progressReportsRepository";

vi.mock("../../students/progressReportsRepository", () => ({
  fetchOpsLeadProgressReports: vi.fn(),
}));

describe("OpsLeadProgressReportsTab Component Suite (OD-OPS-01 / Blueprint v3.4.1 / G-013)", () => {
  it("renders Main Campus view with read-only governance banner and metric cards", () => {
    vi.spyOn(progressReportsRepo, "fetchOpsLeadProgressReports").mockResolvedValue([]);

    const html = renderToStaticMarkup(
      React.createElement(OpsLeadProgressReportsTab, {
        myBranch: "Kota Gorontalo",
      })
    );

    expect(html).toContain("Read-Only Governance (OD-OPS-01)");
    expect(html).toContain("Authoritative Blueprint v3.4.1 (§6.8, G-013)");
    expect(html).toContain("Spark Quota Guarded (Up to 50/div)");
    expect(html).toContain("Student Progress Reports — Campus Academic Oversight");
    expect(html).toContain("Total Reports");
    expect(html).toContain("Courses Division");
    expect(html).toContain("Kindergarten");
    expect(html).toContain("Promotion Ready");
    expect(html).toContain("All Divisions");
    expect(html).toContain("Courses");
    expect(html).toContain("Kindergarten");
    expect(html).toContain("All time (up to 50 per division)");
    expect(html).toContain("Scope and Data Indexing Notice");
    expect(html).toContain("required scope fields (such as");
    expect(html).toContain("branchId");
  });

  it("renders satellite branch restriction notice when branch is not Main Campus", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadProgressReportsTab, {
        myBranch: "Bone Bolango",
      })
    );

    expect(html).toContain("Main Campus Scope Restriction (OD-OPS-01)");
    expect(html).toContain("Academic progress report oversight is formally scoped to the Operational Leader at the");
    expect(html).toContain("Bone Bolango");
    expect(html).toContain("Satellite branches operate under lean Course Division management");
    expect(html).not.toContain("Total Reports");
  });

  it("renders satellite branch restriction notice for Limboto", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadProgressReportsTab, {
        myBranch: "Limboto",
      })
    );

    expect(html).toContain("Main Campus Scope Restriction (OD-OPS-01)");
    expect(html).toContain("Limboto");
  });

  it("renders initial layout with loading or empty state gracefully", () => {
    vi.spyOn(progressReportsRepo, "fetchOpsLeadProgressReports").mockResolvedValue([]);

    const html = renderToStaticMarkup(
      React.createElement(OpsLeadProgressReportsTab, {
        myBranch: "Kota Gorontalo",
      })
    );

    expect(html).toBeDefined();
  });
});
