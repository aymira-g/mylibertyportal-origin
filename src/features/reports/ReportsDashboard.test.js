import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsDashboard from "./ReportsDashboard";

vi.mock("./tabs", () => ({
  TodayTab: () => React.createElement("div", null, "TodayTab"),
  StaffDutyTab: () => React.createElement("div", null, "StaffDutyTab"),
  LearnerProgressTab: () => React.createElement("div", null, "LearnerProgressTab"),
  AdmissionsTab: () => React.createElement("div", null, "AdmissionsTab"),
  InstructorPunctualityTab: () => React.createElement("div", null, "InstructorPunctualityTab"),
  FinancialReportsTab: () => React.createElement("div", null, "FinancialReportsTab"),
}));

describe("ReportsDashboard Scope & Export Gating (DOM11-PRIV-01 & DOM11-GOV-05)", () => {
  it("strips province-wide 'All Campuses' option from System Admin (DOM11-GOV-05)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    // System Admin is locked to their campus and cannot select "All Campuses"
    expect(html).not.toContain("<option value=\"all\">All Campuses</option>");
    expect(html).toContain("Kota Gorontalo");
  });

  it("permits province-wide 'All Campuses' option for Executives", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isExecutiveView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(html).toContain("All Campuses");
    expect(html).toContain('value="all"');
  });

  it("permits province-wide 'All Campuses' option for Central Academic Lead (G-012)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(html).toContain("All Campuses");
    expect(html).toContain('value="all"');
  });

  it("suppresses top-level 'Export CSV Dataset' button for teaching instructors (DOM11-PRIV-01)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isFrontOffice: false,
        isManager: false,
        isExecutiveView: false,
        isInstructorLeader: false,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(html).not.toContain("Export CSV Dataset");
  });

  it("renders top-level 'Export CSV Dataset' button for Executive, Manager, and Academic Lead, but excludes Front Office (OD-FO-03)", () => {
    const execHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isExecutiveView: true }));
    expect(execHtml).toContain("Export CSV Dataset");

    const mgrHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isManager: true }));
    expect(mgrHtml).toContain("Export CSV Dataset");

    const foHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isFrontOffice: true }));
    expect(foHtml).not.toContain("Export CSV Dataset");

    const ilHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isInstructorLeader: true }));
    expect(ilHtml).toContain("Export CSV Dataset");
  });

  it("excludes all four operational sub-tabs when isAdminView is true (OD-ADM-01)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Gated sub-tab buttons must NOT appear for System Admin
    expect(html).not.toContain("Today&#x27;s Check-ins");
    expect(html).not.toContain("Staff Duty Logs");
    expect(html).not.toContain("Learner Progress");
    expect(html).not.toContain("Instructor Punctuality");
    expect(html).not.toContain("Financial &amp; Tuition");
    expect(html).not.toContain("Admissions &amp; Leads");

    // Informational exclusion notice is displayed
    expect(html).toContain("Institutional report views are excluded from System Administrator");
  });

  it("renders operational sub-tabs for non-admin domain leadership", () => {
    const mgrHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isManager: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(mgrHtml).toContain("Today&#x27;s Check-ins");
    expect(mgrHtml).toContain("Staff Duty Logs");
    expect(mgrHtml).toContain("Learner Progress");
    expect(mgrHtml).toContain("Financial &amp; Tuition");
    expect(mgrHtml).toContain("Instructor Punctuality");
  });
});
