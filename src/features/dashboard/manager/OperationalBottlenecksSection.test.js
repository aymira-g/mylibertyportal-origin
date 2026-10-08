import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OperationalBottlenecksSection } from "./OperationalBottlenecksSection";

describe("OperationalBottlenecksSection (Course Division)", () => {
  it("renders empty state with success messages when there are zero bottlenecks", () => {
    const html = renderToStaticMarkup(
      React.createElement(OperationalBottlenecksSection, {
        pendingApplications: [],
        unenrolledStudents: [],
        classesWithIssues: [],
        totalBottlenecks: 0,
        onNavigate: vi.fn(),
      })
    );

    expect(html).toContain("Course Operational Bottlenecks &amp; Action Required");
    expect(html).toContain("All course applicant leads have been contacted and processed.");
    expect(html).toContain("100% Student Placement. Every active course student is assigned to a class batch.");
    expect(html).toContain("All active course classes have confirmed instructors and room assignments.");
  });

  it("renders pending leads, unplaced students, and coverage alerts when bottlenecks exist", () => {
    const html = renderToStaticMarkup(
      React.createElement(OperationalBottlenecksSection, {
        pendingApplications: [
          { id: "app-1", fullName: "Budi Santoso", program: "English for Kids", phone: "08123456789" },
        ],
        unenrolledStudents: [
          { id: "stu-1", displayName: "Siti Rahma", program: "English Teen", currentLevel: "Level 2" },
        ],
        classesWithIssues: [
          { id: "cls-1", className: "Kids Batch A", needsInstructor: true, needsRoom: false },
        ],
        totalBottlenecks: 3,
        onNavigate: vi.fn(),
      })
    );

    expect(html).toContain("3");
    expect(html).toContain("Pending Course Leads");
    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Unplaced Course Students");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("Course Coverage Alerts");
    expect(html).toContain("Kids Batch A");
    expect(html).toContain("Missing Instructor");
  });
});

describe("OperationalBottlenecksSection (Kindergarten Division)", () => {
  it("renders kindergarten division empty state with early-childhood terminology", () => {
    const html = renderToStaticMarkup(
      React.createElement(OperationalBottlenecksSection, {
        pendingApplications: [],
        unenrolledStudents: [],
        classesWithIssues: [],
        totalBottlenecks: 0,
        onNavigate: vi.fn(),
        division: "kindergarten",
      })
    );

    expect(html).toContain("Kindergarten Operational Bottlenecks &amp; Action Required");
    expect(html).toContain("All kindergarten applicant leads have been contacted and processed.");
    expect(html).toContain("100% Learner Placement. Every active kindergarten learner is assigned to a class cohort.");
    expect(html).toContain("All active kindergarten classes have confirmed teachers and room assignments.");
  });

  it("renders kindergarten bottlenecks with toddler/kindy context and actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(OperationalBottlenecksSection, {
        pendingApplications: [
          { id: "app-k1", fullName: "Aisyah Putri", program: "Playgroup", phone: "081299998888" },
        ],
        unenrolledStudents: [
          { id: "stu-k1", displayName: "Fatih Rayyan", program: "Kindy A", currentLevel: "Age 4" },
        ],
        classesWithIssues: [
          { id: "cls-k1", className: "Toddler Morning Cohort", needsInstructor: true, needsRoom: false },
        ],
        totalBottlenecks: 3,
        onNavigate: vi.fn(),
        division: "kindergarten",
      })
    );

    expect(html).toContain("3");
    expect(html).toContain("Pending Kindergarten Leads");
    expect(html).toContain("Aisyah Putri");
    expect(html).toContain("Unplaced Kindergarten Learners");
    expect(html).toContain("Fatih Rayyan");
    expect(html).toContain("Kindergarten Coverage Alerts");
    expect(html).toContain("Toddler Morning Cohort");
    expect(html).toContain("Missing Teacher");
    expect(html).toContain("Follow Up in Inquiries →");
    expect(html).toContain("Assign to Open Cohorts →");
  });
});

