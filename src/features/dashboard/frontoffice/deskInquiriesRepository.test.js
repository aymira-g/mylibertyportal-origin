import { beforeEach, describe, it, expect, vi } from "vitest";
import { fake } from "../../../test/firestoreFake.js";
import { INQUIRY_STATUSES } from "../../../schemas/deskInquirySchema";
import {
  createDeskInquiry,
  fetchRecentDeskInquiries,
  markInquiryConverted,
  updateDeskInquiryStatus,
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
      })
    ).rejects.toThrow("Parent / visitor name is required.");

    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "",
        phone: "0812345678",
      })
    ).rejects.toThrow("Prospective student name is required.");

    await expect(
      createDeskInquiry({
        parentName: "Parent",
        studentName: "Child",
        phone: "123",
      })
    ).rejects.toThrow("Valid phone number is required");
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
});

