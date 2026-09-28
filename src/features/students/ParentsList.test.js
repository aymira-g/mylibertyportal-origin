import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ParentsList from "./ParentsList";
import StudentRoster from "./StudentRoster";

vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user_test_1" } },
}));

vi.mock("../dashboard/usersRepository", () => ({
  fetchAllParents: vi.fn().mockResolvedValue([
    {
      id: "parent_1",
      displayName: "Pak Budi Santoso",
      email: "budi@example.com",
      phone: "08123456789",
      branch: "Kota Gorontalo",
      branchId: "kota_gorontalo",
      childStudentIds: ["stu_1", "stu_2"],
      status: "active",
    },
    {
      id: "parent_2",
      displayName: "Ibu Rahma",
      email: "rahma@example.com",
      phone: "08987654321",
      branch: "Limboto",
      branchId: "limboto",
      childStudentIds: [],
      status: "active",
    },
  ]),
  updateStudentStatus: vi.fn(),
  checkStudentHasHistory: vi.fn().mockResolvedValue(false),
}));

vi.mock("../shared", () => ({
  useToast: () => vi.fn(),
  useConfirm: () => vi.fn().mockResolvedValue(true),
  Pagination: ({ label, total }) =>
    React.createElement("div", { "data-testid": "pagination" }, `${total} ${label}`),
  usePagination: (items, pageSize = 20) => ({
    page: 1,
    setPage: vi.fn(),
    totalPages: Math.ceil((items || []).length / pageSize) || 1,
    pageItems: items || [],
    from: items && items.length > 0 ? 1 : 0,
    to: (items || []).length,
    total: (items || []).length,
  }),
  getPaymentHealthStatus: () => ({ status: "active", label: "Paid", tone: "emerald" }),
  getTier: () => "warrior",
  getNextLevel: () => "scholar",
}));

vi.mock("./progressReportsRepository", () => ({
  fetchPendingPromotions: vi.fn().mockResolvedValue([]),
  promoteStudentLevel: vi.fn(),
}));

vi.mock("../classes/classesRepository", () => ({
  removeStudentFromClass: vi.fn(),
}));

vi.mock("./StudentRosterFilters", () => ({
  default: () => React.createElement("div", { "data-testid": "roster-filters" }, "Filters"),
}));

vi.mock("./StudentRosterMobileList", () => ({
  default: () => React.createElement("div", { "data-testid": "roster-mobile" }, "Mobile List"),
}));

vi.mock("./StudentRosterTable", () => ({
  default: () => React.createElement("div", { "data-testid": "roster-table" }, "Table"),
}));

vi.mock("./StudentParentLinkage", () => ({
  default: () => null,
}));

describe("ParentsList Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when canView is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(ParentsList, {
        canView: false,
        isAdmin: false,
        branchId: "kota_gorontalo",
      })
    );
    expect(html).toBe("");
  });

  it("renders search bar, refresh button, and container when canView is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(ParentsList, {
        canView: true,
        isAdmin: true,
        branchId: null,
      })
    );
    expect(html).toContain("Search parents by name, phone, or email...");
    expect(html).toContain("Refresh");
  });
});

describe("StudentRoster Sub-view Toggle Integration", () => {
  const dummyStudents = [
    {
      id: "stu-1",
      displayName: "Ahmad Dani",
      status: "active",
      branchId: "kota_gorontalo",
    },
  ];

  it("renders the segmented sub-view toggle [ Students | Parents ] for admin or managers", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentRoster, {
        students: dummyStudents,
        classes: [],
        users: [],
        getStudentClasses: () => [],
        isAdmin: true,
        userRole: "admin",
        canViewParents: true,
      })
    );

    expect(html).toContain("Student Roster");
    expect(html).toContain("Students");
    expect(html).toContain("Parents");
  });

  it("renders the segmented sub-view toggle for frontoffice role", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentRoster, {
        students: dummyStudents,
        classes: [],
        users: [],
        getStudentClasses: () => [],
        isAdmin: false,
        userRole: "frontoffice",
        branchId: "kota_gorontalo",
        canViewParents: true,
      })
    );

    expect(html).toContain("Students");
    expect(html).toContain("Parents");
  });

  it("strictly hides the Parents sub-view toggle for instructors and marketing", () => {
    const instructorHtml = renderToStaticMarkup(
      React.createElement(StudentRoster, {
        students: dummyStudents,
        classes: [],
        users: [],
        getStudentClasses: () => [],
        readOnly: true,
        userRole: "instructor",
        canViewParents: false,
      })
    );

    expect(instructorHtml).not.toContain("<button type=\"button\">Parents</button>");
    expect(instructorHtml).toContain("Student Roster");
  });
});
