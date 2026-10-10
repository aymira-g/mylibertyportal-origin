import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WalkInTable } from "./WalkInTable";
import {
  calculateAge,
  COURSE_TIER_OPTIONS,
  KINDERGARTEN_TIER_OPTIONS,
  isPermissionError,
  getLocalInquiries,
  saveLocalInquiry,
  updateLocalInquiry,
  deleteLocalInquiry,
  clearLocalInquiries,
  mapInquiryToEnrollment,
  LOCAL_INQUIRIES_STORAGE_KEY,
} from "./walkInUtils";

describe("calculateAge helper", () => {
  it("calculates age accurately based on date of birth", () => {
    const today = new Date();
    const tenYearsAgo = `${today.getFullYear() - 10}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(calculateAge(tenYearsAgo)).toBe(10);
  });

  it("handles birthday not reached yet this year", () => {
    const today = new Date();
    // If not December, test next month
    if (today.getMonth() < 11) {
      const nextMonth = today.getMonth() + 2;
      const dob = `${today.getFullYear() - 10}-${String(nextMonth).padStart(2, "0")}-15`;
      expect(calculateAge(dob)).toBe(9);
    }
  });

  it("handles empty or invalid dates gracefully", () => {
    expect(calculateAge("")).toBeNull();
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge("invalid-date")).toBeNull();
  });
});

describe("Tier Options", () => {
  it("has beginner, intermediate, and fluent tiers configured for courses", () => {
    const courseTierIds = COURSE_TIER_OPTIONS.map((t) => t.id);
    expect(courseTierIds).toEqual(["beginner", "intermediate", "fluent"]);

    const beginner = COURSE_TIER_OPTIONS.find((t) => t.id === "beginner");
    expect(beginner.defaultLevel).toBe("warrior");
  });

  it("has beginner, intermediate, and fluent tiers configured for kindergarten", () => {
    const kgTierIds = KINDERGARTEN_TIER_OPTIONS.map((t) => t.id);
    expect(kgTierIds).toEqual(["beginner", "intermediate", "fluent"]);

    const beginner = KINDERGARTEN_TIER_OPTIONS.find((t) => t.id === "beginner");
    expect(beginner.defaultLevel).toBe("nursery");
  });
});

describe("isPermissionError", () => {
  it("correctly identifies Firestore permission denied errors", () => {
    expect(isPermissionError({ code: "permission-denied" })).toBe(true);
    expect(isPermissionError({ code: "PERMISSION_DENIED" })).toBe(true);
    expect(
      isPermissionError(new Error("Failed to load desk inquiries: Missing or insufficient permissions."))
    ).toBe(true);
    expect(isPermissionError(new Error("insufficient permissions"))).toBe(true);
    expect(isPermissionError({ code: "not-found", message: "Not found" })).toBe(false);
    expect(isPermissionError(null)).toBe(false);
  });
});

describe("Local Storage inquiries fallback", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(LOCAL_INQUIRIES_STORAGE_KEY);
    }
  });

  it("saves, retrieves, updates, and deletes inquiries locally", () => {
    const saved = saveLocalInquiry({
      parentName: "Parent A",
      studentName: "Student A",
      phone: "08123456789",
      status: "inquired",
    });

    expect(saved.isLocal).toBe(true);
    expect(saved.id).toContain("local-");

    const list = getLocalInquiries();
    expect(list.length).toBe(1);
    expect(list[0].parentName).toBe("Parent A");

    updateLocalInquiry(saved.id, { status: "enrolled" });
    const afterUpdate = getLocalInquiries();
    expect(afterUpdate[0].status).toBe("enrolled");

    deleteLocalInquiry(saved.id);
    const afterDelete = getLocalInquiries();
    expect(afterDelete.length).toBe(0);
  });

  it("clears all residual inquiries from storage (FO-04 / F-16)", () => {
    saveLocalInquiry({
      parentName: "Parent B",
      studentName: "Student B",
      phone: "08199999999",
      status: "inquired",
    });
    expect(getLocalInquiries().length).toBe(1);

    clearLocalInquiries();
    expect(getLocalInquiries().length).toBe(0);
  });
});

describe("mapInquiryToEnrollment", () => {
  it("maps mother honorific to motherName without duplicating into fatherName", () => {
    const res = mapInquiryToEnrollment(
      {
        studentName: "Kevin Tan",
        parentName: "Ibu Maria",
        phone: "08123456789",
      },
      { branch: "Limboto", division: "courses" }
    );

    expect(res.motherName).toBe("Ibu Maria");
    expect(res.motherPhone).toBe("08123456789");
    expect(res.fatherName).toBe("");
    expect(res.fatherPhone).toBe("");
    expect(res.parentName).toBe("Ibu Maria");
    expect(res.parentPhone).toBe("08123456789");
    expect(res.branch).toBe("Limboto");
    expect(res.currentLevel).toBe("unassessed");
  });

  it("maps father honorific to fatherName without duplicating into motherName", () => {
    const res = mapInquiryToEnrollment(
      {
        studentName: "Kevin Tan",
        parentName: "Pak Budi",
        phone: "08123456789",
      },
      { branch: "Kota Gorontalo", division: "courses" }
    );

    expect(res.fatherName).toBe("Pak Budi");
    expect(res.fatherPhone).toBe("08123456789");
    expect(res.motherName).toBe("");
    expect(res.motherPhone).toBe("");
    expect(res.parentName).toBe("Pak Budi");
  });

  it("maps indeterminate parentName to parentName without fabricating father or mother", () => {
    const res = mapInquiryToEnrollment({
      studentName: "Siti Rahma",
      parentName: "Hendra Rahma",
      phone: "08520000000",
    });

    expect(res.parentName).toBe("Hendra Rahma");
    expect(res.parentPhone).toBe("08520000000");
    expect(res.fatherName).toBe("");
    expect(res.motherName).toBe("");
  });

  it("defaults honestly to UNASSESSED even if fluencyTier is fluent or intermediate", () => {
    const res = mapInquiryToEnrollment({
      studentName: "Applicant",
      parentName: "Parent",
      phone: "081111111",
      fluencyTier: "fluent",
    });

    expect(res.currentLevel).toBe("unassessed");
  });

  it("preserves assessed level when inquiry has a recorded assessment or placement test", () => {
    const assessedDirect = mapInquiryToEnrollment({
      studentName: "Assessed Student",
      parentName: "Parent",
      phone: "081111111",
      currentLevel: "elite",
    });
    expect(assessedDirect.currentLevel).toBe("elite");

    const assessedTest = mapInquiryToEnrollment({
      studentName: "Tested Student",
      parentName: "Parent",
      phone: "081111111",
      placementTests: [{ score: 85, assessedLevel: "master" }],
    });
    expect(assessedTest.currentLevel).toBe("master");
  });

  it("honors active dashboard branch when inquiry does not specify one", () => {
    const res = mapInquiryToEnrollment(
      {
        studentName: "Limboto Student",
        parentName: "Parent",
        phone: "081111111",
      },
      { branch: "Limboto" }
    );

    expect(res.branch).toBe("Limboto");
  });
});

describe("WalkInTable Component UX states", () => {
  it("renders Enrolled badge when inquiry is already converted to student", () => {
    const html = renderToStaticMarkup(
      React.createElement(WalkInTable, {
        loading: false,
        filteredInquiries: [
          {
            id: "inq-1",
            parentName: "Parent A",
            phone: "08123456789",
            studentName: "Student A",
            status: "enrolled",
            convertedStudentId: "student-123",
          },
        ],
        tierOptions: COURSE_TIER_OPTIONS,
        onEnroll: () => {},
      })
    );

    expect(html).toContain("Enrolled");
    expect(html).not.toContain(">Enroll</span>");
  });

  it("renders disabled On Hold button when placement override is pending", () => {
    const html = renderToStaticMarkup(
      React.createElement(WalkInTable, {
        loading: false,
        filteredInquiries: [
          {
            id: "inq-2",
            parentName: "Parent B",
            phone: "08123456788",
            studentName: "Student B",
            status: "inquired",
            pendingPlacementOverride: { assessedLevel: "master" },
          },
        ],
        tierOptions: COURSE_TIER_OPTIONS,
        onEnroll: () => {},
      })
    );

    expect(html).toContain("On Hold");
    expect(html).toContain("disabled");
    expect(html).not.toContain(">Enroll</span>");
  });

  it("renders active Enroll button for standard eligible prospect", () => {
    const html = renderToStaticMarkup(
      React.createElement(WalkInTable, {
        loading: false,
        filteredInquiries: [
          {
            id: "inq-3",
            parentName: "Parent C",
            phone: "08123456787",
            studentName: "Student C",
            status: "inquired",
          },
        ],
        tierOptions: COURSE_TIER_OPTIONS,
        onEnroll: () => {},
      })
    );

    expect(html).toContain("Enroll");
    expect(html).not.toContain("Enrolled");
    expect(html).not.toContain("On Hold");
  });
});


