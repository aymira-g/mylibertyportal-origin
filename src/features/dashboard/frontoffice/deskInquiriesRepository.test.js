import { beforeEach, describe, it, expect, vi } from "vitest";
import { fake } from "../../../test/firestoreFake.js";
import { INQUIRY_STATUSES } from "../../../schemas/deskInquirySchema";
import {
  createDeskInquiry,
  fetchRecentDeskInquiries,
  markInquiryConverted,
  updateDeskInquiryStatus,
  deleteDeskInquiry,
  addPlacementTestToInquiry,
} from "./deskInquiriesRepository";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../../firebase", () => ({ db: {}, auth: { currentUser: { uid: "test-user" } } }));

beforeEach(() => fake.reset());

describe("deskInquiriesRepository statuses", () => {
  it("defines standard desk inquiry lifecycle statuses", () => {
    expect(INQUIRY_STATUSES).toContain("inquired");
    expect(INQUIRY_STATUSES).toContain("follow_up_sent");
    expect(INQUIRY_STATUSES).toContain("enrolled");
    expect(INQUIRY_STATUSES).toContain("closed");
  });

  it("throws clear human-readable error on missing required fields", async () => {
    await expect(
      createDeskInquiry({
        parentName: "",
        studentName: "Child",
        phone: "0812345678",
        branch: "Kota Gorontalo",
      })
    ).rejects.toThrow("Parent / visitor name is required.");

    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "",
        phone: "0812345678",
        branch: "Kota Gorontalo",
      })
    ).rejects.toThrow("Prospective student name is required.");

    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "Child",
        phone: "123",
        branch: "Kota Gorontalo",
      })
    ).rejects.toThrow("Valid phone number is required");
  });

  it("rejects inquiry creation when branch is missing or invalid (FO-02)", async () => {
    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "Child",
        phone: "08123456789",
      })
    ).rejects.toThrow("Branch is required to log a desk inquiry.");

    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "Child",
        phone: "08123456789",
        branch: "Nonexistent Province",
      })
    ).rejects.toThrow('Invalid branch specified: "Nonexistent Province".');
  });

  it("creates inquiry with normalized branch and branchId", async () => {
    const result = await createDeskInquiry({
      parentName: "Parent One",
      studentName: "Child One",
      phone: "08123456789",
      branch: "Bone Bolango",
    });

    expect(result.branch).toBe("Bone Bolango");
    expect(result.branchId).toBe("bone_bolango");

    const op = fake.opsOf("add")[0];
    expect(op.path.startsWith("deskInquiries/")).toBe(true);
    expect(op.data.branchId).toBe("bone_bolango");
  });

  it("sanitizes or resets currentLevel to empty string for course inquiries on creation (FO-03)", async () => {
    const result = await createDeskInquiry({
      parentName: "Parent One",
      studentName: "Child One",
      phone: "08123456789",
      branch: "Kota Gorontalo",
      division: "courses",
      currentLevel: "master",
    });

    expect(result.currentLevel).toBe("");
    const op = fake.opsOf("add").slice(-1)[0];
    expect(op.data.currentLevel).toBe("");
  });

  it("preserves level or tier for kindergarten inquiries on creation", async () => {
    const result = await createDeskInquiry({
      parentName: "Parent One",
      studentName: "Child One",
      phone: "08123456789",
      branch: "Kota Gorontalo",
      division: "kindergarten",
      currentLevel: "tk_a",
    });

    expect(result.currentLevel).toBe("tk_a");
    const op = fake.opsOf("add").slice(-1)[0];
    expect(op.data.currentLevel).toBe("tk_a");
  });

  it("fetches recent desk inquiries scoped to branchId when provided", async () => {
    fake.seed("deskInquiries", [
      {
        id: "inq-1",
        studentName: "Kota Student",
        branchId: "kota_gorontalo",
        createdAt: "2026-09-27T10:00:00.000Z",
      },
      {
        id: "inq-2",
        studentName: "Bone Student",
        branchId: "bone_bolango",
        createdAt: "2026-09-27T11:00:00.000Z",
      },
    ]);

    const boneResults = await fetchRecentDeskInquiries(50, "bone_bolango");
    expect(boneResults.length).toBe(1);
    expect(boneResults[0].studentName).toBe("Bone Student");

    const kotaResults = await fetchRecentDeskInquiries(50, "Kota Gorontalo");
    expect(kotaResults.length).toBe(1);
    expect(kotaResults[0].studentName).toBe("Kota Student");

    const allResults = await fetchRecentDeskInquiries(50);
    expect(allResults.length).toBe(2);
  });

  it("fetches recent desk inquiries scoped to branchId and division when provided", async () => {
    fake.seed("deskInquiries", [
      {
        id: "inq-kg",
        studentName: "Kindergarten Student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
        createdAt: "2026-09-27T10:00:00.000Z",
      },
      {
        id: "inq-courses",
        studentName: "Courses Student",
        branchId: "kota_gorontalo",
        division: "courses",
        createdAt: "2026-09-27T11:00:00.000Z",
      },
    ]);

    const kgResults = await fetchRecentDeskInquiries(50, "kota_gorontalo", "kindergarten");
    expect(kgResults.length).toBe(1);
    expect(kgResults[0].studentName).toBe("Kindergarten Student");

    const coursesResults = await fetchRecentDeskInquiries(50, "kota_gorontalo", "courses");
    expect(coursesResults.length).toBe(1);
    expect(coursesResults[0].studentName).toBe("Courses Student");
  });

  it("rejects updateDeskInquiryStatus to enrolled directly", async () => {
    await expect(updateDeskInquiryStatus("inq-1", "enrolled")).rejects.toThrow(
      "Cannot set inquiry status to 'enrolled' directly"
    );
  });

  it("requires a valid studentId when marking inquiry as converted", async () => {
    await expect(markInquiryConverted("inq-1", "")).rejects.toThrow(
      "Cannot mark inquiry as converted without a valid student ID"
    );
    await expect(markInquiryConverted("inq-1", null)).rejects.toThrow(
      "Cannot mark inquiry as converted without a valid student ID"
    );
  });

  it("successfully marks inquiry converted with valid studentId", async () => {
    fake.seed("deskInquiries", [{ id: "inq-1", status: "inquired" }]);
    const res = await markInquiryConverted("inq-1", "student-123");
    expect(res.status).toBe("enrolled");
    expect(res.convertedStudentId).toBe("student-123");
  });

  describe("fail-closed permission error handling (FO-A / F-15)", () => {
    it("throws when Firestore denies permission during createDeskInquiry", async () => {
      fake.failWhen = () => new Error("permission-denied");
      await expect(
        createDeskInquiry({
          parentName: "Parent One",
          studentName: "Child One",
          phone: "08123456789",
          branch: "Kota Gorontalo",
        })
      ).rejects.toThrow("permission-denied");
    });

    it("throws when Firestore denies permission during updateDeskInquiryStatus", async () => {
      fake.seed("deskInquiries", [{ id: "inq-1", status: "inquired" }]);
      fake.failWhen = () => new Error("permission-denied");
      await expect(updateDeskInquiryStatus("inq-1", "follow_up_sent")).rejects.toThrow(
        "permission-denied"
      );
    });

    it("throws when Firestore denies permission during markInquiryConverted", async () => {
      fake.seed("deskInquiries", [{ id: "inq-1", status: "inquired" }]);
      fake.failWhen = () => new Error("permission-denied");
      await expect(markInquiryConverted("inq-1", "student-123")).rejects.toThrow(
        "permission-denied"
      );
    });

    it("throws when Firestore denies permission during deleteDeskInquiry", async () => {
      fake.seed("deskInquiries", [{ id: "inq-1", status: "inquired" }]);
      fake.failWhen = () => new Error("permission-denied");
      await expect(deleteDeskInquiry("inq-1")).rejects.toThrow("permission-denied");
    });

    it("throws when Firestore denies permission during addPlacementTestToInquiry (FO-01)", async () => {
      fake.seed("deskInquiries", [
        {
          id: "inq-pt-1",
          branch: "Kota Gorontalo",
          branchId: "kota_gorontalo",
          division: "courses",
          placementTests: [],
        },
      ]);
      fake.failWhen = (op) => {
        if (op.kind === "update" && op.path === "deskInquiries/inq-pt-1") {
          return new Error("permission-denied");
        }
        return null;
      };

      await expect(
        addPlacementTestToInquiry("inq-pt-1", {
          score: 80,
          assessedLevel: "master",
        })
      ).rejects.toThrow("permission-denied");
    });

    it("rejects recording placement test on unpersisted local inquiry (FO-01)", async () => {
      await expect(
        addPlacementTestToInquiry("local-12345", {
          score: 80,
          assessedLevel: "master",
        })
      ).rejects.toThrow("Cannot record placement test: this inquiry is not saved on the server.");
    });
  });
});

