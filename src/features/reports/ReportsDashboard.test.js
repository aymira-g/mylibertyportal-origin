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

  it("renders top-level 'Export CSV Dataset' button for Executive, Manager, Front Office, and Academic Lead", () => {
    const execHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isExecutiveView: true }));
    expect(execHtml).toContain("Export CSV Dataset");

    const mgrHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isManager: true }));
    expect(mgrHtml).toContain("Export CSV Dataset");

    const foHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isFrontOffice: true }));
    expect(foHtml).toContain("Export CSV Dataset");

    const ilHtml = renderToStaticMarkup(React.createElement(ReportsDashboard, { isInstructorLeader: true }));
    expect(ilHtml).toContain("Export CSV Dataset");
  });
});
