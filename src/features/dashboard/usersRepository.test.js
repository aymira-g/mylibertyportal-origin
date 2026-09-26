import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake } from "../../test/firestoreFake.js";
import {
  checkStaffHasAttendanceHistory,
  checkStudentHasHistory,
  createStaffAccount,
  createParentAccount,
  linkChildToParent,
  unlinkChildFromParent,
  getParentLinkedStudents,
  findParentsForStudent,
  deleteUserProfile,
  updateStaffStatus,
} from "./usersRepository.js";

const authMock = vi.hoisted(() => ({ createUserWithEmailAndPassword: vi.fn() }));

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("firebase/auth", () => authMock);
vi.mock("../../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "admin1" } },
  getSecondaryAuth: () => ({ secondary: true }),
}));

beforeEach(() => {
  fake.reset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("updateStaffStatus", () => {
  it("saves the status with who changed it and when", async () => {
    await updateStaffStatus("u1", "resigned");
    const { data, opts } = fake.find("users/u1");
    expect(opts).toEqual({ merge: true });
    expect(data).toMatchObject({ status: "resigned", statusUpdatedBy: "admin1" });
    expect(new Date(data.statusUpdatedAt).toString()).not.toBe("Invalid Date");
  });
});

describe("checkStaffHasAttendanceHistory", () => {
  it("reports shift and leave history separately", async () => {
    fake.seed("shifts", [{ id: "s1", userId: "u1" }]);
    expect(await checkStaffHasAttendanceHistory("u1")).toEqual({
      hasShifts: true,
      hasLeave: false,
      error: null,
    });
    fake.seed("staffLeave", [{ id: "l1", userId: "u2" }]);
    expect(await checkStaffHasAttendanceHistory("u2")).toEqual({
      hasShifts: false,
      hasLeave: true,
      error: null,
    });
  });

  it("reports no history for a brand-new staff member", async () => {
    expect(await checkStaffHasAttendanceHistory("u3")).toEqual({
      hasShifts: false,
      hasLeave: false,
      error: null,
    });
  });

  it("handles a missing uid", async () => {
    expect(await checkStaffHasAttendanceHistory("")).toEqual({
      hasShifts: false,
      hasLeave: false,
      error: null,
    });
  });

  // The flags are false on failure; safety depends on callers checking `error`.
  // StaffDirectory does today — this test keeps that contract visible.
  it("returns the error message on a failed lookup", async () => {
    const firestore = /** @type {any} */ (await import("firebase/firestore"));
    firestore.getDocs.mockRejectedValueOnce(new Error("unavailable"));
    const result = await checkStaffHasAttendanceHistory("u1");
    expect(result.error).toBe("unavailable");
  });
});

describe("checkStudentHasHistory", () => {
  it("detects payments, attendance and progress reports", async () => {
    fake.seed("payments", [{ id: "p", studentId: "s1" }]);
    fake.seed("attendance", [{ id: "a", userId: "s1" }]);
    fake.seed("progressReports", []);
    expect(await checkStudentHasHistory("s1")).toEqual({
      hasPayments: true,
      hasAttendance: true,
      hasReports: false,
      error: null,
    });
  });

  it("returns the error message on a failed lookup", async () => {
    const firestore = /** @type {any} */ (await import("firebase/firestore"));
    firestore.getDocs.mockRejectedValueOnce(new Error("unavailable"));
    expect((await checkStudentHasHistory("s1")).error).toBe("unavailable");
  });
});

describe("createStaffAccount", () => {
  it("creates the sign-in account, then the profile, and returns the new uid", async () => {
    authMock.createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: "new-uid" } });
    const uid = await createStaffAccount("a@b.id", "pw123456", { role: "instructor" });
    expect(uid).toBe("new-uid");
    expect(authMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { secondary: true },
      "a@b.id",
      "pw123456"
    );
    expect(fake.find("users/new-uid")).toMatchObject({
      data: { role: "instructor" },
      opts: { merge: true },
    });
  });

  it("does not write a profile if the sign-in account cannot be created", async () => {
    authMock.createUserWithEmailAndPassword.mockRejectedValueOnce(
      new Error("email-already-in-use")
    );
    await expect(createStaffAccount("a@b.id", "pw", {})).rejects.toThrow("email-already-in-use");
    expect(fake.ops).toHaveLength(0);
  });

  it("explains the half-finished state when the profile save fails", async () => {
    authMock.createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: "new-uid" } });
    fake.failWhen = () => new Error("permission-denied");
    const err = await createStaffAccount("a@b.id", "pw", {}).catch((e) => e);
    expect(err.message).toContain("Account was created in Firebase Auth");
    expect(err.message).toContain("permission-denied");
    expect(err.cause.message).toBe("permission-denied");
  });
});

describe("deleteUserProfile", () => {
  it("deletes user profile and removes student from class rosters in an atomic batch", async () => {
    fake.seed("users", [{ id: "s1", role: "student" }]);
    fake.seed("classes", [
      {
        id: "c1",
        studentIds: ["s1", "s2"],
        enrollments: [
          { studentId: "s1", level: "warrior" },
          { studentId: "s2", level: "warrior" },
        ],
      },
      {
        id: "c2",
        studentIds: ["s2"],
        enrollments: [{ studentId: "s2", level: "warrior" }],
      },
    ]);

    await deleteUserProfile("s1");

    // User document should be deleted
    expect(fake.opsOf("delete").some((o) => o.path === "users/s1")).toBe(true);

    // Class c1 should be updated in a batch to remove s1
    const c1 = fake.find("classes/c1");
    expect(c1.via).toBe("batch");
    expect(c1.data.studentIds).toEqual(["s2"]);
    expect(c1.data.enrollments).toEqual([{ studentId: "s2", level: "warrior" }]);

    // Class c2 should NOT be touched
    expect(fake.find("classes/c2")).toBeUndefined();
  });
});

describe("createParentAccount", () => {
  it("creates auth user via secondary auth and saves profile with role: parent", async () => {
    authMock.createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: "parent_uid_123" },
    });

    const uid = await createParentAccount("parent@example.com", "pass123456", {
      displayName: "Ibu Linda",
      phone: "081299998888",
      initialChildStudentId: "student_abc",
      branch: "Kota Gorontalo",
    });

    expect(uid).toBe("parent_uid_123");
    const userDoc = fake.find("users/parent_uid_123");
    expect(userDoc.opts).toEqual({ merge: true });
    expect(userDoc.data.role).toBe("parent");
    expect(userDoc.data.displayName).toBe("Ibu Linda");
    expect(userDoc.data.email).toBe("parent@example.com");
    expect(userDoc.data.childStudentIds).toEqual(["student_abc"]);
    expect(userDoc.data.branchId).toBe("kota_gorontalo");
    expect(userDoc.data.branch).toBe("Kota Gorontalo");
    expect(userDoc.data.status).toBe("active");
  });

  it("canonicalizes branchId even when callers pass a branch display name as branchId", async () => {
    authMock.createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: "parent_boba_1" },
    });

    const uid = await createParentAccount("parentboba@example.com", "pass123456", {
      displayName: "Pak Rusli",
      branchId: "Bone Bolango",
      initialChildStudentId: "student_boba_1",
    });

    expect(uid).toBe("parent_boba_1");
    const userDoc = fake.find("users/parent_boba_1");
    expect(userDoc.data.branchId).toBe("bone_bolango");
    expect(userDoc.data.branch).toBe("Bone Bolango");
  });

  it("throws validation error and halts before calling auth when payload is invalid", async () => {
    await expect(
      createParentAccount("invalid-email", "short", {
        displayName: "",
      })
    ).rejects.toThrow();
    expect(authMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });
});

describe("linkChildToParent and unlinkChildFromParent", () => {
  it("links a child to a parent with arrayUnion", async () => {
    await linkChildToParent("parent1", "child1");
    const op = fake.find("users/parent1");
    expect(op.opts).toEqual({ merge: true });
    expect(op.data.childStudentIds).toEqual({ __op: "arrayUnion", items: ["child1"] });
    expect(op.data.updatedAt).toBeTruthy();
  });

  it("unlinks a child from a parent with arrayRemove", async () => {
    await unlinkChildFromParent("parent1", "child1");
    const op = fake.find("users/parent1");
    expect(op.opts).toEqual({ merge: true });
    expect(op.data.childStudentIds).toEqual({ __op: "arrayRemove", items: ["child1"] });
    expect(op.data.updatedAt).toBeTruthy();
  });

  it("throws if IDs are missing", () => {
    expect(() => linkChildToParent("", "child1")).toThrow();
    expect(() => linkChildToParent("p1", "")).toThrow();
    expect(() => unlinkChildFromParent("", "child1")).toThrow();
    expect(() => unlinkChildFromParent("p1", "")).toThrow();
  });
});

describe("getParentLinkedStudents and findParentsForStudent", () => {
  it("retrieves childStudentIds array for a parent doc", async () => {
    fake.seed("users", [
      { id: "parent1", role: "parent", childStudentIds: ["s1", "s2"] },
      { id: "parent2", role: "parent" },
    ]);

    expect(await getParentLinkedStudents("parent1")).toEqual(["s1", "s2"]);
    expect(await getParentLinkedStudents("parent2")).toEqual([]);
    expect(await getParentLinkedStudents("nonexistent")).toEqual([]);
  });

  it("finds parents linked to a student", async () => {
    fake.seed("users", [
      { id: "parent1", role: "parent", displayName: "Ayah", childStudentIds: ["s1"] },
      { id: "parent2", role: "parent", displayName: "Ibu", childStudentIds: ["s1", "s2"] },
      { id: "parent3", role: "parent", displayName: "Lain", childStudentIds: ["s3"] },
      { id: "student1", role: "student", childStudentIds: ["s1"] }, // not role parent
    ]);

    const parents = await findParentsForStudent("s1");
    expect(parents.map((p) => p.id)).toEqual(["parent1", "parent2"]);
  });
});
