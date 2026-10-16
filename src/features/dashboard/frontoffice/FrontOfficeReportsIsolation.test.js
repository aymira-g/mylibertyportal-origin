import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FrontOfficeDashboard from "../FrontOfficeDashboard";
import KidsFrontOfficeDashboard from "../kids/KidsFrontOfficeDashboard";
import FrontOfficeReportsTab from "./FrontOfficeReportsTab";
import { fetchRecentDeskInquiries } from "./deskInquiriesRepository";
import { getPaymentsForRecordedDay } from "../../finance/paymentsRepository";
import { fake } from "../../../test/firestoreFake.js";

// Capture tabs passed to DashboardShell
let capturedShellProps = null;
vi.mock("../../shared/useToast", () => ({
  useToast: () => vi.fn(),
}));

vi.mock("../../shared/DashboardShell", () => {
  const Shell = (props) => {
    capturedShellProps = props;
    return React.createElement("div", { "data-testid": "dashboard-shell" });
  };
  return {
    default: Shell,
    DashboardShell: Shell,
  };
});

vi.mock("../../../firebase", () => ({
  auth: { currentUser: { uid: "test-fo-user", displayName: "Front Office Staff" } },
  db: {},
}));

vi.mock("firebase/firestore", async () => (await import("../../../test/firestoreFake.js")).firestoreModule);

vi.mock("../useDashboardData", () => ({
  useDashboardData: vi.fn(({ division, branch }) => ({
    users: [],
    classes: [],
    applications: [],
    todos: [],
    students: [],
    unenrolledStudents: [],
    pendingApplications: [],
    instructors: [],
    myBranch: branch || "Kota Gorontalo",
    division: division || "courses",
    formData: {},
    setFormData: vi.fn(),
    handleSave: vi.fn(),
    handleEdit: vi.fn(),
    handleAddStudent: vi.fn(),
    handleAddTodo: vi.fn(),
    handleDeleteTodo: vi.fn(),
    handleToggleTodo: vi.fn(),
    getStudentClasses: vi.fn(() => []),
  })),
}));

vi.mock("./deskInquiriesRepository", async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  return {
    ...actual,
    fetchRecentDeskInquiries: vi.fn(actual.fetchRecentDeskInquiries),
  };
});

vi.mock("./FrontDeskCashReconcile", () => ({
  default: (props) => React.createElement("div", { "data-testid": "cash-reconcile", "data-division": props.division }),
}));

beforeEach(() => {
  fake.reset();
  capturedShellProps = null;
  vi.clearAllMocks();
});

describe("FP-FO-14 / OD-FO-03: End-to-End Division Isolation in Front Office Workspaces", () => {
  describe("Dashboard Component Prop Parity", () => {
    it("FrontOfficeDashboard passes division='courses' to FrontOfficeReportsTab", () => {
      renderToStaticMarkup(React.createElement(FrontOfficeDashboard, { branch: "Kota Gorontalo" }));
      expect(capturedShellProps).not.toBeNull();

      const reportsTabDef = capturedShellProps.tabs.find((t) => t.id === "reports");
      expect(reportsTabDef).toBeDefined();
      expect(reportsTabDef.label).toBe("Reports");

      // Verify the element is FrontOfficeReportsTab and division prop is strictly 'courses'
      const element = reportsTabDef.component;
      expect(element.type).toBe(FrontOfficeReportsTab);
      expect(element.props.division).toBe("courses");
      expect(element.props.myBranch).toBe("Kota Gorontalo");
    });

    it("KidsFrontOfficeDashboard passes division='kindergarten' to FrontOfficeReportsTab", () => {
      renderToStaticMarkup(React.createElement(KidsFrontOfficeDashboard, { branch: "Kota Gorontalo" }));
      expect(capturedShellProps).not.toBeNull();

      const reportsTabDef = capturedShellProps.tabs.find((t) => t.id === "reports");
      expect(reportsTabDef).toBeDefined();
      expect(reportsTabDef.label).toBe("Reports");

      // Verify the element is FrontOfficeReportsTab and division prop is strictly 'kindergarten'
      const element = reportsTabDef.component;
      expect(element.type).toBe(FrontOfficeReportsTab);
      expect(element.props.division).toBe("kindergarten");
      expect(element.props.myBranch).toBe("Kota Gorontalo");
    });
  });

  describe("Desk Inquiries Division Scoping & Isolation", () => {
    beforeEach(() => {
      fake.seed("deskInquiries", [
        {
          id: "inq-courses-1",
          studentName: "Courses Prospect",
          branchId: "kota_gorontalo",
          division: "courses",
          createdAt: "2026-10-17T02:00:00.000Z",
        },
        {
          id: "inq-kids-1",
          studentName: "Kindergarten Prospect",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          createdAt: "2026-10-17T02:30:00.000Z",
        },
        {
          id: "inq-courses-boba",
          studentName: "Foreign Branch Prospect",
          branchId: "bone_bolango",
          division: "courses",
          createdAt: "2026-10-17T03:00:00.000Z",
        },
      ]);
    });

    it("fetchRecentDeskInquiries for courses returns only courses inquiries and excludes kindergarten", async () => {
      const results = await fetchRecentDeskInquiries(50, "kota_gorontalo", "courses");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("inq-courses-1");
      expect(results[0].division).toBe("courses");
    });

    it("fetchRecentDeskInquiries for kindergarten returns only kindergarten inquiries and excludes courses", async () => {
      const results = await fetchRecentDeskInquiries(50, "kota_gorontalo", "kindergarten");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("inq-kids-1");
      expect(results[0].division).toBe("kindergarten");
    });

    it("fetchRecentDeskInquiries fallback path (when orderBy throws) preserves division scoping", async () => {
      // Force orderBy to fail so fallback path is exercised
      fake.failWhen = (op) => {
        if (op.kind === "query" && op.orderBy?.length > 0) {
          return new Error("requires-index");
        }
        return null;
      };

      const results = await fetchRecentDeskInquiries(50, "kota_gorontalo", "kindergarten");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("inq-kids-1");
      expect(results[0].division).toBe("kindergarten");
    });
  });

  describe("Daily Cash Reconciliation Division Scoping & Isolation", () => {
    beforeEach(() => {
      fake.seed("users", [
        {
          id: "test-fo-user",
          role: "frontoffice",
          branchId: "kota_gorontalo",
          division: "courses",
        },
      ]);
      fake.seed("payments", [
        {
          id: "pay-courses-1",
          studentId: "s-course",
          branchId: "kota_gorontalo",
          division: "courses",
          amount: 450000,
          recordedAt: "2026-10-17T03:00:00.000Z",
        },
        {
          id: "pay-kids-1",
          studentId: "s-kid",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          amount: 750000,
          recordedAt: "2026-10-17T03:30:00.000Z",
        },
      ]);
    });

    it("getPaymentsForRecordedDay scopes payments strictly to courses division", async () => {
      const testDate = new Date("2026-10-17T05:00:00.000Z");
      const list = await getPaymentsForRecordedDay(testDate, "kota_gorontalo", "courses");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("pay-courses-1");
      expect(list[0].division).toBe("courses");
    });

    it("getPaymentsForRecordedDay scopes payments strictly to kindergarten division", async () => {
      const testDate = new Date("2026-10-17T05:00:00.000Z");
      const list = await getPaymentsForRecordedDay(testDate, "kota_gorontalo", "kindergarten");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("pay-kids-1");
      expect(list[0].division).toBe("kindergarten");
    });

    it("getPaymentsForRecordedDay fallback query path preserves division isolation", async () => {
      // Force range query to fail so fallback path is exercised
      fake.failWhen = (op) => {
        if (op.kind === "query" && op.constraints?.some((c) => c.field === "recordedAt" && c.op === ">=")) {
          return new Error("requires-index");
        }
        return null;
      };

      const testDate = new Date("2026-10-17T05:00:00.000Z");
      const list = await getPaymentsForRecordedDay(testDate, "kota_gorontalo", "kindergarten");
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("pay-kids-1");
      expect(list[0].division).toBe("kindergarten");
    });
  });
});
