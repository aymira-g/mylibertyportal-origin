import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import KidsManagerDashboard from "./KidsManagerDashboard";
import { ToastProvider, ConfirmProvider } from "../../shared";

vi.mock("../../../firebase", () => ({
  auth: { currentUser: { uid: "km-user-1", displayName: "Kids Manager" } },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(() => {
    // Return empty unsubscribe callback
    return () => {};
  }),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../../shared/DashboardShell", () => {
  const Shell = ({ title, extraSidebarContent, tabs, activeTab }) =>
    React.createElement(
      "div",
      { "data-testid": "dashboard-shell" },
      React.createElement("h1", null, title),
      React.createElement("div", { "data-testid": "extra-sidebar" }, extraSidebarContent),
      React.createElement(
        "ul",
        { "data-testid": "tab-items" },
        tabs?.map((t) => React.createElement("li", { key: t.id, "data-tab-id": t.id }, t.label))
      ),
      React.createElement(
        "div",
        { "data-testid": "active-content" },
        tabs?.find((t) => t.id === activeTab)?.component || null
      )
    );
  return {
    default: Shell,
    DashboardShell: Shell,
  };
});

vi.mock("../../students", () => ({
  StudentRoster: () => React.createElement("div", { "data-testid": "student-roster-mock" }, "Student Roster"),
}));

vi.mock("../frontoffice", () => ({
  WalkInInquiryTab: () => React.createElement("div", { "data-testid": "walk-in-mock" }, "Walk In Tab"),
}));

vi.mock("../../shared/ApprovalInbox", () => {
  const Inbox = () => React.createElement("div", { "data-testid": "approval-inbox-mock" }, "Approval Inbox");
  return {
    default: Inbox,
    ApprovalInbox: Inbox,
  };
});

vi.mock("../../finance/paymentsRepository", () => ({
  getPaymentsForRecordedDay: vi.fn().mockResolvedValue([]),
}));

vi.mock("../manager/ManagerOverview", () => ({
  ManagerOverview: ({ division, myBranch, branchPayments, paymentsLoading }) =>
    React.createElement(
      "div",
      { "data-testid": "manager-overview" },
      React.createElement("span", null, division || "courses"),
      React.createElement("span", null, myBranch || "Default Branch"),
      React.createElement("span", { "data-testid": "payments-status" }, paymentsLoading ? "loading" : "loaded"),
      React.createElement("span", { "data-testid": "payments-count" }, String(branchPayments?.length || 0))
    ),
}));

describe("KidsManagerDashboard Component (Phase 1, Phase 2 & Phase 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Kindergarten Division Manager Portal title and badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(KidsManagerDashboard)
        )
      )
    );

    expect(html).toContain("Kindergarten Division Manager Portal");
    expect(html).toContain("Kindergarten Division");
    expect(html).not.toContain("Branch Manager");
    expect(html).not.toContain("Kids School — Manager Portal");
  });

  it("passes division='kindergarten' to the Command Center overview", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(KidsManagerDashboard)
        )
      )
    );

    expect(html).toContain("data-testid=\"manager-overview\"");
    expect(html).toContain("kindergarten");
  });

  it("mounts all Phase 2 core tabs: Learners & Parents, Inquiries, and Kindergarten Approvals", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(KidsManagerDashboard)
        )
      )
    );

    expect(html).toContain("Learners &amp; Parents");
    expect(html).toContain("Guestbook &amp; Inquiries");
    expect(html).toContain("Kindergarten Approvals");
    expect(html).toContain("Staff Directives");
    expect(html).toContain("Classes &amp; Coverage");
    expect(html).toContain("Reports &amp; Analytics");
  });

  it("wires daily Kindergarten payments intake to Command Center (Phase 3)", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          ConfirmProvider,
          null,
          React.createElement(KidsManagerDashboard)
        )
      )
    );

    expect(html).toContain("data-testid=\"payments-status\"");
    expect(html).toContain("data-testid=\"payments-count\"");
  });
});
