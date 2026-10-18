import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsDashboard from "./ReportsDashboard";

vi.mock("./tabs", () => ({
  TodayTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-today" }, "TodayTab");
  }),
  StaffDutyTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-staff" }, "StaffDutyTab");
  }),
  LearnerProgressTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-students" }, "LearnerProgressTab");
  }),
  AdmissionsTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-admissions" }, "AdmissionsTab");
  }),
  InstructorPunctualityTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-instructors" }, "InstructorPunctualityTab");
  }),
  FinancialReportsTab: React.forwardRef(() => {
    return React.createElement("div", { "data-testid": "tab-finance" }, "FinancialReportsTab");
  }),
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

describe("Instructor Leader Presentation & Scope Alignment (Owner Approval 2026-10-18)", () => {
  it("1. opens on My Punctuality by default when mounted for Instructor Leader", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Active component mounted must be InstructorPunctualityTab
    expect(html).toContain("InstructorPunctualityTab");
    expect(html).not.toContain("TodayTab");
    expect(html).not.toContain("StaffDutyTab");
    expect(html).not.toContain("LearnerProgressTab");

    // Button label is "My Punctuality" (self-service compliance)
    expect(html).toContain("My Punctuality");
    expect(html).not.toContain("Instructor Punctuality");

    // "My Punctuality" button has active primary styling, other tabs have neutral styling
    expect(html).toMatch(/bg-\[#1a3a8f\][^>]*>.*?My Punctuality/s);
  });

  it("2. locks campus view to home campus and does not show interactive 'All Campuses' selector", () => {
    const html = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // Must NOT contain interactive selector or "All Campuses" option
    expect(html).not.toContain("<option value=\"all\">All Campuses</option>");
    expect(html).not.toContain("<select");

    // Must display locked label with home campus
    expect(html).toContain("Kota Gorontalo");
    expect(html).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
  });

  it("2b. normalizes home campus filter slug to canonical display name for repository queries", () => {
    // Slug branch ID input e.g. from useInstructorWorkspace ("kota_gorontalo")
    const slugHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "kota_gorontalo",
      })
    );
    expect(slugHtml).not.toContain("All Campuses");
    expect(slugHtml).toContain("Kota Gorontalo");

    // Lean satellite campus input ("bone_bolango")
    const satelliteHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "bone_bolango",
      })
    );
    expect(satelliteHtml).not.toContain("All Campuses");
    expect(satelliteHtml).toContain("Bone Bolango");

    // Fallback on missing branch
    const defaultHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: null,
      })
    );
    expect(defaultHtml).not.toContain("All Campuses");
    expect(defaultHtml).toContain("Kota Gorontalo");
  });

  it("3. other roles retain their existing selector and default behavior", () => {
    // Executive: interactive selector with All Campuses, defaults to finance
    const execHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isExecutiveView: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(execHtml).toContain("All Campuses");
    expect(execHtml).toContain('value="all"');
    expect(execHtml).toContain("FinancialReportsTab");

    // Manager: locked to branch, defaults to staff (Staff Duty Logs)
    const mgrHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isManager: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(mgrHtml).not.toContain("All Campuses");
    expect(mgrHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(mgrHtml).toContain("StaffDutyTab");
    expect(mgrHtml).toContain("Staff Duty Logs");

    // Front Office: locked to branch, defaults to today (Today's Check-ins), no export
    const foHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isFrontOffice: true,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(foHtml).not.toContain("All Campuses");
    expect(foHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(foHtml).toContain("TodayTab");
    expect(foHtml).not.toContain("Export CSV Dataset");

    // Teaching Instructor: locked to branch, defaults to today, no export
    const instructorHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isAdminView: false,
        isFrontOffice: false,
        isManager: false,
        isExecutiveView: false,
        isInstructorLeader: false,
        userBranch: "Kota Gorontalo",
      })
    );
    expect(instructorHtml).not.toContain("All Campuses");
    expect(instructorHtml).toContain('class="p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 truncate"');
    expect(instructorHtml).toContain("TodayTab");
    expect(instructorHtml).not.toContain("Export CSV Dataset");
    expect(instructorHtml).toContain("My Duty Log");
    expect(instructorHtml).toContain("My Punctuality");
  });

  it("4. all four Instructor Leader sub-tabs and their CSV export actions remain available", () => {
    const defaultIlHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
      })
    );

    // All four sub-tabs rendered for Instructor Leader
    expect(defaultIlHtml).toContain("Today&#x27;s Check-ins");
    expect(defaultIlHtml).toContain("My Duty Log");
    expect(defaultIlHtml).toContain("Learner Progress");
    expect(defaultIlHtml).toContain("My Punctuality");

    // Hidden sub-tabs are strictly NOT accessible to Instructor Leader
    expect(defaultIlHtml).not.toContain("Financial &amp; Tuition");
    expect(defaultIlHtml).not.toContain("Admissions &amp; Leads");

    // Top-level export button is present
    expect(defaultIlHtml).toContain("Export CSV Dataset");

    // Verify each sub-tab mounts correctly when requested and maintains export button:
    const todayHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "today",
      })
    );
    expect(todayHtml).toContain("TodayTab");
    expect(todayHtml).toContain("Export CSV Dataset");

    const staffHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "staff",
      })
    );
    expect(staffHtml).toContain("StaffDutyTab");
    expect(staffHtml).toContain("Export CSV Dataset");

    const studentsHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "students",
      })
    );
    expect(studentsHtml).toContain("LearnerProgressTab");
    expect(studentsHtml).toContain("Export CSV Dataset");

    const punctualityHtml = renderToStaticMarkup(
      React.createElement(ReportsDashboard, {
        isInstructorLeader: true,
        userBranch: "Kota Gorontalo",
        initialSubTab: "instructors",
      })
    );
    expect(punctualityHtml).toContain("InstructorPunctualityTab");
    expect(punctualityHtml).toContain("Export CSV Dataset");
  });
});

