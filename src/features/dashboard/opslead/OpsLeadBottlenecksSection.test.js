import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OpsLeadBottlenecksSection from "./OpsLeadBottlenecksSection";

describe("OpsLeadBottlenecksSection Component Suite", () => {
  it("renders clear state when all bottlenecks are zero", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadBottlenecksSection, {
        pendingApprovalsCount: 0,
        pendingTasksCount: 0,
        uncontactedInquiriesCount: 0,
        drawerVarianceCount: 0,
        myBranch: "Kota Gorontalo",
      })
    );

    expect(html).toContain("All Campus Operations Clear &amp; Smooth");
    expect(html).toContain("0 Bottlenecks");
    expect(html).toContain("No pending approvals, overdue facility tasks, or neglected inquiries at Kota Gorontalo");
  });

  it("renders active bottlenecks section with cards when items are pending", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadBottlenecksSection, {
        pendingApprovalsCount: 3,
        pendingTasksCount: 4,
        uncontactedInquiriesCount: 2,
        drawerVarianceCount: 1,
        myBranch: "Kota Gorontalo",
      })
    );

    expect(html).toContain("⚡ Branch-Site Operational Bottlenecks &amp; Action Required");
    expect(html).toContain("10 Actions Needed");
    expect(html).toContain("3");
    expect(html).toContain("pending tickets");
    expect(html).toContain("4");
    expect(html).toContain("active tasks");
    expect(html).toContain("2");
    expect(html).toContain("uncontacted leads");
    expect(html).toContain("Open Approvals");
    expect(html).toContain("Manage Facilities");
    expect(html).toContain("Review Intake");
  });

  it("handles single-item singular text correctly", () => {
    const html = renderToStaticMarkup(
      React.createElement(OpsLeadBottlenecksSection, {
        pendingApprovalsCount: 1,
        pendingTasksCount: 1,
        uncontactedInquiriesCount: 1,
        drawerVarianceCount: 0,
        myBranch: "Kota Gorontalo",
      })
    );

    expect(html).toContain("3 Actions Needed");
    expect(html).toContain("pending ticket");
    expect(html).toContain("active task");
    expect(html).toContain("uncontacted lead");
  });
});
