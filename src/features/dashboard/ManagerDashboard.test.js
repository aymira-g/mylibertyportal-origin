import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider, ConfirmProvider } from "../shared";
import { ManagerOverview } from "./manager/ManagerOverview";
import { ManagerCashSummary } from "./manager/ManagerCashSummary";

vi.mock("../shared/WelcomeBanner", () => {
  const Banner = ({ portalLabel, roleLabel, subtitle, extraPills }) =>
    React.createElement(
      "div",
      { "data-testid": "welcome-banner" },
      React.createElement("h1", null, portalLabel),
      React.createElement("h2", null, roleLabel),
      React.createElement("p", null, subtitle),
      React.createElement("div", null, extraPills)
    );
  return {
    default: Banner,
    WelcomeBanner: Banner,
  };
});

vi.mock("./frontoffice/TuitionDueWidget", () => {
  const Widget = () =>
    React.createElement("div", { "data-testid": "tuition-due-mock" }, "Tuition Due");
  return {
    default: Widget,
    TuitionDueWidget: Widget,
  };
});

vi.mock("../../classes", () => {
  const Batches = () =>
    React.createElement("div", { "data-testid": "available-batches-mock" }, "Available Batches");
  return {
    default: Batches,
    AvailableBatches: Batches,
  };
});

vi.mock("./manager/OperationalBottlenecksSection", () => ({
  OperationalBottlenecksSection: () =>
    React.createElement("div", { "data-testid": "bottlenecks-mock" }, "Bottlenecks"),
}));

describe("ManagerOverview Component (Course Division Manager)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    stats: { students: 45, classes: 8, staff: 6 },
    loading: false,
    pendingApplications: [],
    unenrolledStudents: [],
    classesWithIssues: [],
    activeShifts: [
      { id: "sh-1", displayName: "Staff Alice", role: "instructor", clockIn: "2026-10-05T08:00:00Z" },
    ],
    pendingApprovalsCount: 2,
    onNavigate: vi.fn(),
    classes: [],
    users: [],
    schools: [],
    visits: [],
    students: [],
    myBranch: "Kota Gorontalo",
    branchPayments: [
      { id: "p-1", amount: 500000, method: "cash" },
      { id: "p-2", amount: 750000, method: "transfer" },
    ],
    paymentsLoading: false,
    onRefreshPayments: vi.fn(),
  };

  it("renders authentic course division manager identity and campus location", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ManagerOverview, baseProps)
        )
      )
    );

    expect(html).toContain("Course Division Command");
    expect(html).toContain("Course Division Manager");
    expect(html).toContain("Kota Gorontalo Campus");
    expect(html).toContain("1 On Duty");
  });

  it("renders dual-control action alert when pending approvals exist", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ManagerOverview, { ...baseProps, pendingApprovalsCount: 3 })
        )
      )
    );

    expect(html).toContain("Course Division Authorization Required");
    expect(html).toContain("3");
    expect(html).toContain("awaiting your course division review");
    expect(html).toContain("Review Course Approvals");
  });

  it("renders daily reception cash intake strictly scoped to the branch", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ManagerCashSummary, {
            branch: "Kota Gorontalo",
            payments: baseProps.branchPayments,
            loading: false,
          })
        )
      )
    );

    expect(html).toContain("Course Division Intake &amp; Collections");
    expect(html).toContain("Kota Gorontalo Campus");
    expect(html).toContain("Cash Receipts");
    expect(html).not.toContain("View All Branches");
  });

  it("renders course tuition targets and overdue accounts quick links when onNavigate is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(ManagerCashSummary, {
            branch: "Kota Gorontalo",
            payments: baseProps.branchPayments,
            loading: false,
            onNavigate: vi.fn(),
          })
        )
      )
    );

    expect(html).toContain("Tuition Targets &amp; Reports");
    expect(html).toContain("Overdue Student Accounts");
    expect(html).toContain("Tuition Target Reports");
  });
});
