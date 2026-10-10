import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ApplicantCard } from "./ApplicantCard";

describe("ApplicantCard readOnly and executive inspection behavior", () => {
  const dummyApplicant = {
    id: "app-1",
    displayName: "Anisa Rahma",
    branch: "Kota Gorontalo",
    program: "General English",
    phone: "08123456789",
    fatherPhone: "08198765432",
    status: "approved",
    studentId: "stu-1",
    approvedAt: "2026-10-06T10:00:00.000Z",
    approvedBy: "admissions@myliberty.id",
  };

  const dummyUsers = [
    { id: "stu-1", displayName: "Anisa Rahma", role: "student" },
  ];

  it("suppresses WA Chat and WA Parent buttons when readOnly is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(ApplicantCard, {
        app: dummyApplicant,
        activeView: "approved",
        users: dummyUsers,
        classes: [],
        applications: [],
        isProcessing: false,
        readOnly: true,
      })
    );

    expect(html).not.toContain("WA Chat");
    expect(html).not.toContain("WA Parent");
    expect(html).toContain("Anisa Rahma");
    expect(html).toContain("Open Student Profile →");
  });

  it("renders WA Chat and WA Parent buttons when readOnly is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(ApplicantCard, {
        app: dummyApplicant,
        activeView: "approved",
        users: dummyUsers,
        classes: [],
        applications: [],
        isProcessing: false,
        readOnly: false,
      })
    );

    expect(html).toContain("WA Chat");
    expect(html).toContain("WA Parent");
  });

  it("suppresses Approve and Reject buttons for pending view when readOnly is true", () => {
    const pendingApp = { ...dummyApplicant, status: "pending" };
    const html = renderToStaticMarkup(
      React.createElement(ApplicantCard, {
        app: pendingApp,
        activeView: "pending",
        users: dummyUsers,
        classes: [],
        applications: [],
        isProcessing: false,
        readOnly: true,
      })
    );

    expect(html).not.toContain("<span>Approve</span>");
    expect(html).not.toContain("<span>Reject</span>");
  });

  it("suppresses Delete button for rejected view when onDelete is omitted or null", () => {
    const rejectedApp = { ...dummyApplicant, status: "rejected" };
    const html = renderToStaticMarkup(
      React.createElement(ApplicantCard, {
        app: rejectedApp,
        activeView: "rejected",
        users: dummyUsers,
        classes: [],
        applications: [],
        isProcessing: false,
        readOnly: false,
        onDelete: null,
      })
    );

    expect(html).not.toContain("<span>Delete</span>");
  });

  it("renders Delete button for rejected view when onDelete is provided", () => {
    const rejectedApp = { ...dummyApplicant, status: "rejected" };
    const html = renderToStaticMarkup(
      React.createElement(ApplicantCard, {
        app: rejectedApp,
        activeView: "rejected",
        users: dummyUsers,
        classes: [],
        applications: [],
        isProcessing: false,
        readOnly: false,
        onDelete: () => {},
      })
    );

    expect(html).toContain("<span>Delete</span>");
  });
});

