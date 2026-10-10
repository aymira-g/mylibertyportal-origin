import { beforeEach, describe, expect, it, vi } from "vitest";
import { fake } from "../../test/firestoreFake.js";
import {
  addStudentToClass,
  createClass,
  removeStudentFromClass,
  setClassGroupLevel,
  transferStudentBetweenClasses,
  updateClass,
} from "./classesRepository.js";

vi.mock(
  "firebase/firestore",
  async () => (await import("../../test/firestoreFake.js")).firestoreModule
);
vi.mock("../../firebase", () => ({ db: {}, auth: {} }));

beforeEach(() => fake.reset());

const source = {
  id: "A",
  className: "Warrior Mon/Wed",
  classLevel: "warrior",
  studentIds: ["s1", "s2"],
  enrollments: [
    { studentId: "s1", level: "warrior" },
    { studentId: "s2", level: "warrior" },
  ],
};
const target = { id: "B", classLevel: "elite" };

describe("transferStudentBetweenClasses", () => {
  it("removes the student from the source and adds them to the target in one transaction", async () => {
    await transferStudentBetweenClasses({
      sourceClass: source,
      targetClassId: "B",
      targetClass: target,
      studentId: "s1",
      dateTransferred: "2026-09-21",
      transferReason: "  moved to evening  ",
    });

    const src = fake.find("classes/A");
    const tgt = fake.find("classes/B");
    expect(src.via).toBe("transaction");
    expect(tgt.via).toBe("transaction");
    expect(src.data.studentIds).toEqual(["s2"]);
    expect(src.data.enrollments).toEqual([{ studentId: "s2", level: "warrior" }]);
    expect(tgt.data.studentIds).toEqual({ __op: "arrayUnion", items: ["s1"] });
    expect(tgt.data.enrollments.items[0]).toEqual({
      studentId: "s1",
      dateJoined: "2026-09-21",
      level: "elite",
      transferredFrom: "Warrior Mon/Wed",
      transferReason: "moved to evening",
    });
  });

  it("does NOT rewrite the student's assessed level when transferring between classes", async () => {
    // Inverted 2026-10-10 (Phase 3 / F-11). This previously asserted
    // `users/s1.currentLevel === "elite"`, encoding the authority inversion OD-FO-3 forbids:
    // class placement overwriting the student's academic record. Class-side level now lives
    // only on the class and its `enrollments` entries.
    await transferStudentBetweenClasses({
      sourceClass: source,
      targetClassId: "B",
      targetClass: target,
      studentId: "s1",
    });
    // No student-record write should have occurred at all.
    const studentWrites = fake.opsOf("update").filter((o) => String(o.path).startsWith("users/"));
    expect(studentWrites).toEqual([]);
    // The class-side enrollment still records the target class level (that is correct and
    // unchanged) — what must not happen is a write to the student's own record.
    expect(fake.find("classes/B").data.enrollments.items[0].level).toBe("elite");
  });

  it("leaves transferReason out when it is blank", async () => {
    await transferStudentBetweenClasses({
      sourceClass: source,
      targetClassId: "B",
      targetClass: target,
      studentId: "s1",
      transferReason: "   ",
    });
    expect(fake.find("classes/B").data.enrollments.items[0]).not.toHaveProperty("transferReason");
  });

  it.each([
    ["an explicit newLevel", { newLevel: "master" }, target, "master"],
    ["the target class level", {}, target, "elite"],
    ["the source class level", {}, { id: "B" }, "warrior"],
  ])("picks the level from %s", async (_l, extra, targetClass, expected) => {
    await transferStudentBetweenClasses({
      sourceClass: source,
      targetClassId: "B",
      targetClass,
      studentId: "s1",
      ...extra,
    });
    expect(fake.find("classes/B").data.enrollments.items[0].level).toBe(expected);
  });

  it("falls back to 'warrior' when no level is known anywhere", async () => {
    await transferStudentBetweenClasses({
      sourceClass: { id: "A", studentIds: ["s1"], enrollments: [] },
      targetClassId: "B",
      targetClass: { id: "B" },
      studentId: "s1",
    });
    expect(fake.find("classes/B").data.enrollments.items[0].level).toBe("warrior");
  });

  it("writes nothing when the batch fails, and does not touch the student's level", async () => {
    fake.failCommit = new Error("permission-denied");
    await expect(
      transferStudentBetweenClasses({
        sourceClass: source,
        targetClassId: "B",
        targetClass: target,
        studentId: "s1",
      })
    ).rejects.toThrow("permission-denied");
    expect(fake.ops).toHaveLength(0);
  });

  it("does not fail the transfer when only the student-level sync fails", async () => {
    fake.failWhen = (op) => (op.path.startsWith("users/") ? new Error("nope") : null);
    await expect(
      transferStudentBetweenClasses({
        sourceClass: source,
        targetClassId: "B",
        targetClass: target,
        studentId: "s1",
      })
    ).resolves.toBeUndefined();
  });

  it("reads live source class so concurrent changes are preserved during transfer", async () => {
    fake.seed("classes", [
      {
        id: "SRC-LIVE",
        className: "Source Live",
        classLevel: "warrior",
        studentIds: ["s1", "s3"],
        enrollments: [
          { studentId: "s1", level: "warrior" },
          { studentId: "s3", level: "warrior" },
        ],
      },
      {
        id: "TGT-LIVE",
        className: "Target Live",
        classLevel: "elite",
        maxCapacity: 10,
        studentIds: ["s9"],
        enrollments: [{ studentId: "s9", level: "elite" }],
      },
    ]);

    const staleSource = {
      id: "SRC-LIVE",
      className: "Source Live",
      studentIds: ["s1", "s2", "s3"],
      enrollments: [
        { studentId: "s1", level: "warrior" },
        { studentId: "s2", level: "warrior" },
        { studentId: "s3", level: "warrior" },
      ],
    };

    await transferStudentBetweenClasses({
      sourceClass: staleSource,
      targetClassId: "TGT-LIVE",
      targetClass: { id: "TGT-LIVE" },
      studentId: "s1",
    });

    const src = fake.find("classes/SRC-LIVE");
    expect(src.data.studentIds).toEqual(["s3"]);
    expect(src.data.enrollments).toEqual([{ studentId: "s3", level: "warrior" }]);
  });

  // Proposed extra safety at the database layer (the UI in TransferModal already
  // checks some of these). Open to debate whether they belong here or only in the UI.
  describe("guards the repository could add", () => {
    it("rejects a student who is not in the source class", async () => {
      await expect(
        transferStudentBetweenClasses({
          sourceClass: source,
          targetClassId: "B",
          targetClass: target,
          studentId: "ghost",
        })
      ).rejects.toThrow();
    });

    it("rejects a transfer into the same class", async () => {
      await expect(
        transferStudentBetweenClasses({
          sourceClass: source,
          targetClassId: "A",
          targetClass: source,
          studentId: "s1",
        })
      ).rejects.toThrow();
    });

    it("rejects a transfer into a full class", async () => {
      const full = { id: "B", classLevel: "elite", maxCapacity: 2, studentIds: ["x", "y"] };
      await expect(
        transferStudentBetweenClasses({
          sourceClass: source,
          targetClassId: "B",
          targetClass: full,
          studentId: "s1",
        })
      ).rejects.toThrow();
    });
  });
});

describe("addStudentToClass / removeStudentFromClass", () => {
  it("adds a student and an enrollment record using arrayUnion within a transaction", async () => {
    fake.seed("classes", [
      {
        id: "A",
        maxCapacity: 10,
        studentIds: ["s1"],
        enrollments: [{ studentId: "s1", level: "elite" }],
      },
    ]);
    await addStudentToClass("A", { studentId: "s9", dateJoined: "2026-09-21", level: "elite" });
    const op = fake.find("classes/A");
    expect(op.via).toBe("transaction");
    expect(op.data.studentIds).toEqual({ __op: "arrayUnion", items: ["s9"] });
    expect(op.data.enrollments.items[0]).toEqual({
      studentId: "s9",
      dateJoined: "2026-09-21",
      level: "elite",
    });
    expect(typeof op.data.updatedAt).toBe("string");
  });

  it("rejects enrollment when class is full", async () => {
    fake.seed("classes", [
      {
        id: "FULL",
        maxCapacity: 1,
        studentIds: ["s1"],
        enrollments: [{ studentId: "s1", level: "elite" }],
      },
    ]);
    await expect(
      addStudentToClass("FULL", { studentId: "s9", dateJoined: "2026-09-21", level: "elite" })
    ).rejects.toThrow("Class is full or unavailable for enrollment.");
  });

  it("removes only the chosen student from both lists", async () => {
    await removeStudentFromClass(source, "s1");
    const op = fake.find("classes/A");
    expect(op.data.studentIds).toEqual(["s2"]);
    expect(op.data.enrollments).toEqual([{ studentId: "s2", level: "warrior" }]);
  });

  it("copes with a class that has no lists yet", async () => {
    await removeStudentFromClass({ id: "Z" }, "s1");
    expect(fake.find("classes/Z").data).toMatchObject({ studentIds: [], enrollments: [] });
  });

  it("reads live class document so concurrent student removals are preserved", async () => {
    fake.seed("classes", [
      {
        id: "LIVE-1",
        studentIds: ["s1", "s3"],
        enrollments: [
          { studentId: "s1", level: "warrior" },
          { studentId: "s3", level: "warrior" },
        ],
      },
    ]);

    const staleCallerSnapshot = {
      id: "LIVE-1",
      studentIds: ["s1", "s2", "s3"],
      enrollments: [
        { studentId: "s1", level: "warrior" },
        { studentId: "s2", level: "warrior" },
        { studentId: "s3", level: "warrior" },
      ],
    };

    await removeStudentFromClass(staleCallerSnapshot, "s1");

    const op = fake.find("classes/LIVE-1");
    expect(op.data.studentIds).toEqual(["s3"]);
    expect(op.data.enrollments).toEqual([{ studentId: "s3", level: "warrior" }]);
  });
});

describe("setClassGroupLevel", () => {
  it("sets the level on every class in the group and on each enrolment", async () => {
    await setClassGroupLevel(
      [source, { id: "C", enrollments: [{ studentId: "s5", level: "warrior" }] }],
      "master"
    );
    expect(fake.find("classes/A").data.classLevel).toBe("master");
    expect(fake.find("classes/A").data.enrollments.every((e) => e.level === "master")).toBe(true);
    expect(fake.find("classes/C").data.enrollments[0].level).toBe("master");
  });
});

// `syncStudentsCurrentLevel` was REMOVED in Phase 3 / F-11 — it wrote class levels onto
// student academic records. Its test is deleted with it; the replacement guarantee is
// asserted in "does NOT rewrite the student's assessed level when transferring between
// classes" above.

describe("createClass", () => {
  it("validates and saves a valid class batch to classes collection", async () => {
    await createClass({
      className: "Master Morning Cohort",
      classLevel: "master",
      instructorId: "inst1",
      maxCapacity: 12,
    });

    const ops = fake.opsOf("add");
    expect(ops.length).toBe(1);
    expect(ops[0].path).toMatch(/^classes\//);
    expect(ops[0].data).toMatchObject({
      className: "Master Morning Cohort",
      classLevel: "master",
      instructorId: "inst1",
      maxCapacity: 12,
      minQuorum: 4,
      status: "open",
    });
  });

  it("throws validation error for invalid batch payload", async () => {
    await expect(
      createClass({
        className: "",
        classLevel: "master",
      })
    ).rejects.toThrow();
  });
});

describe("updateClass", () => {
  it("normalizes batchType before writing update to Firestore", async () => {
    await updateClass("class-123", {
      batchType: "PRIVATE",
      className: "Updated Title",
    });
    const op = fake.find("classes/class-123");
    expect(op.data.batchType).toBe("private");
    expect(op.data.className).toBe("Updated Title");
  });

  it("leaves update data untouched if batchType is not specified", async () => {
    await updateClass("class-456", {
      className: "New Title Only",
    });
    const op = fake.find("classes/class-456");
    expect(op.data).not.toHaveProperty("batchType");
    expect(op.data.className).toBe("New Title Only");
  });

  it("synchronizes branchId and display branch when only branch is provided", async () => {
    await updateClass("class-branch-only", {
      branch: "Bone Bolango",
    });
    const op = fake.find("classes/class-branch-only");
    expect(op.data.branchId).toBe("bone_bolango");
    expect(op.data.branch).toBe("Bone Bolango");
  });

  it("synchronizes display branch when only branchId is provided", async () => {
    await updateClass("class-branchId-only", {
      branchId: "limboto",
    });
    const op = fake.find("classes/class-branchId-only");
    expect(op.data.branchId).toBe("limboto");
    expect(op.data.branch).toBe("Limboto");
  });

  it("preserves matching canonical branch and branchId pair", async () => {
    await updateClass("class-matching-pair", {
      branchId: "pohuwato",
      branch: "Pohuwato",
    });
    const op = fake.find("classes/class-matching-pair");
    expect(op.data.branchId).toBe("pohuwato");
    expect(op.data.branch).toBe("Pohuwato");
  });

  it("resolves conflicting branch and branchId using canonical branchId authority", async () => {
    // Conflict case: branchId says kota_gorontalo but branch says Bone Bolango
    await updateClass("class-conflict-case", {
      branchId: "kota_gorontalo",
      branch: "Bone Bolango",
    });
    const op = fake.find("classes/class-conflict-case");
    // branchId is authoritative; display branch is synchronized to match it
    expect(op.data.branchId).toBe("kota_gorontalo");
    expect(op.data.branch).toBe("Kota Gorontalo");
  });

  it("leaves branch fields untouched when neither branch nor branchId is in update payload", async () => {
    await updateClass("class-no-branch", {
      notes: "Updated syllabus notes only",
      status: "open",
    });
    const op = fake.find("classes/class-no-branch");
    expect(op.data).not.toHaveProperty("branch");
    expect(op.data).not.toHaveProperty("branchId");
    expect(op.data.notes).toBe("Updated syllabus notes only");
    expect(op.data.status).toBe("open");
  });
});
