/**
 * Real Firestore Rules Emulator Tests — Classes and Academic Progress
 */
import { describe, beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { todayWita, witaDayStart } from "../../../utils/dateWita.js";
import {
  setupEmulatorHarness,
  HAS_EMULATOR,
  SHIFT_KOTA,
} from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Classes and Academic Progress", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("classes-academic");
    testEnv = harness.testEnv;
    authed = harness.authed;
    seedDoc = harness.seedDoc;
    seedUsers = harness.seedUsers;
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsers();
  });

  describe("classAttendance collection", () => {
    const CLASS_DOC = {
      instructorId: "insGto",
      substituteInstructorId: "insSub",
      studentIds: ["student1"],
      branchId: "kota_gorontalo",
    };

    beforeEach(async () => {
      await seedDoc(["classes", "class1"], CLASS_DOC);
      await seedDoc(["users", "insSub"], { displayName: "insSub", role: "instructor", branchId: "kota_gorontalo" });
    });

    it("allows assigned instructor to create attendance for enrolled student", async () => {
      // A same-day mark: OD-IL-ENF3 requires attendanceDateTs and treats a day that has
      // already ended in WITA as a governed retroactive backfill.
      const today = todayWita();
      await assertSucceeds(
        setDoc(doc(authed("insGto"), "classAttendance", `class1_student1_${today}`), {
          classId: "class1",
          studentId: "student1",
          attendanceDate: today,
          status: "PRESENT",
          method: "SCAN",
          markedBy: "insGto",
          attendanceDateTs: witaDayStart(today),
        })
      );
    });

    it("denies unassigned instructor or unenrolled student", async () => {
      await assertFails(
        setDoc(doc(authed("insSub"), "classAttendance", "class1_student2_2026-09-27"), {
          classId: "class1",
          studentId: "student2",
          attendanceDate: "2026-09-27",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "insSub",
        })
      );
    });

    it("blocks updates via scan method and enforces method == MANUAL", async () => {
      const seeded = {
        classId: "class1",
        studentId: "student1",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insGto",
        // Unchanged by the update: the update allow-list must not have to name it.
        attendanceDateTs: witaDayStart("2026-09-27"),
      };
      await seedDoc(["classAttendance", "class1_student1_2026-09-27"], seeded);

      // Attempt update with SCAN method -> fails
      await assertFails(
        setDoc(doc(authed("insGto"), "classAttendance", "class1_student1_2026-09-27"), {
          ...seeded,
        })
      );

      // Attempt update with MANUAL method -> succeeds
      await assertSucceeds(
        setDoc(doc(authed("insGto"), "classAttendance", "class1_student1_2026-09-27"), {
          ...seeded,
          status: "ABSENT",
          method: "MANUAL",
        })
      );
    });
  });

  // OD-IL-ENF3 (owner-ratified 2026-10-08, Option A): a mark for an attendance day that
  // has already ended in WITA is a retroactive backfill and is refused unless an approved
  // RETROACTIVE_STUDENT_ATTENDANCE envelope names exactly that class, student and date.
  describe("retroactive class attendance gate (OD-IL-ENF3)", () => {
    const PAST_DATE = "2026-09-27";

    const retroRecord = (over = {}) => ({
      classId: "class1",
      studentId: "student1",
      attendanceDate: PAST_DATE,
      status: "PRESENT",
      method: "MANUAL",
      markedBy: "insGto",
      attendanceDateTs: witaDayStart(PAST_DATE),
      ...over,
    });

    const approvedBackfill = (over = {}) => ({
      actionId: "RETROACTIVE_STUDENT_ATTENDANCE",
      status: "approved",
      mode: "blocking",
      approverRole: "opslead",
      approverBranchId: "kota_gorontalo",
      requestedBy: "Instructor",
      requestedByUid: "insGto",
      decidedBy: "Ops Lead",
      decidedByUid: "opsGto",
      payload: { classId: "class1", studentId: "student1", attendanceDate: PAST_DATE },
      ...over,
    });

    beforeEach(async () => {
      await seedDoc(["classes", "class1"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
      });
    });

    it("refuses a retroactive mark with no approval", async () => {
      await assertFails(
        setDoc(
          doc(authed("insGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord()
        )
      );
    });

    it("refuses a create that omits attendanceDateTs, which rules cannot date-check", async () => {
      const withoutTs = retroRecord();
      delete withoutTs.attendanceDateTs;
      await assertFails(
        setDoc(
          doc(authed("insGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          withoutTs
        )
      );
    });

    it("applies the backfill with a matching approved envelope (the Ops Lead path)", async () => {
      await seedDoc(["approvals", "apBackfill"], approvedBackfill());
      await assertSucceeds(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apBackfill" })
        )
      );
    });

    it("refuses an envelope that names a different date", async () => {
      await seedDoc(
        ["approvals", "apBackfill"],
        approvedBackfill({
          payload: { classId: "class1", studentId: "student1", attendanceDate: "2026-09-26" },
        })
      );
      await assertFails(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apBackfill" })
        )
      );
    });

    it("refuses an envelope belonging to a different gate", async () => {
      await seedDoc(
        ["approvals", "apBackfill"],
        approvedBackfill({ actionId: "PLACEMENT_LEVEL_OVERRIDE" })
      );
      await assertFails(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apBackfill" })
        )
      );
    });

    it("refuses an envelope addressed to a role the gate never assigned", async () => {
      await seedDoc(
        ["approvals", "apBackfill"],
        approvedBackfill({ approverRole: "manager" })
      );
      await assertFails(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apBackfill" })
        )
      );
    });

    it("refuses a pending envelope and a replayed envelope", async () => {
      await seedDoc(["approvals", "apPending"], approvedBackfill({ status: "pending" }));
      await assertFails(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apPending" })
        )
      );

      await seedDoc(["approvals", "apApplied"], approvedBackfill({ applied: true }));
      await assertFails(
        setDoc(
          doc(authed("opsGto"), "classAttendance", `class1_student1_${PAST_DATE}`),
          retroRecord({ markedBy: "opsGto", appliedFromApproval: "apApplied" })
        )
      );
    });
  });

  describe("Instructor Leader branch-scope academic monitoring (owner-approved 2026-10-08)", () => {
    const CLASS_KOTA = {
      instructorId: "insGto",
      studentIds: ["student1"],
      branchId: "kota_gorontalo",
      division: "courses",
    };
    const CLASS_KOTA_KIDS = {
      instructorId: "insKids",
      studentIds: ["student3"],
      branchId: "kota_gorontalo",
      division: "kindergarten",
    };
    const CLASS_BOBA = {
      instructorId: "insBoba",
      studentIds: ["student2"],
      branchId: "bone_bolango",
    };

    beforeEach(async () => {
      await seedDoc(["classes", "classKota"], CLASS_KOTA);
      await seedDoc(["classes", "classKotaKids"], CLASS_KOTA_KIDS);
      await seedDoc(["classes", "classBoba"], CLASS_BOBA);

      await seedDoc(["progressReports", "prKotaCourses"], {
        instructorId: "insOther",
        studentId: "student1",
        classId: "classKota",
        branchId: "kota_gorontalo",
        division: "courses",
        examDate: "2026-09-20",
      });
      await seedDoc(["progressReports", "prKotaKids"], {
        instructorId: "insKids",
        studentId: "student3",
        classId: "classKotaKids",
        branchId: "kota_gorontalo",
        division: "kindergarten",
        examDate: "2026-09-21",
      });
      await seedDoc(["progressReports", "prBoba"], {
        instructorId: "insBoba",
        studentId: "student2",
        classId: "classBoba",
        branchId: "bone_bolango",
        examDate: "2026-09-22",
      });

      await seedDoc(["classAttendance", "classKota_student1_2026-09-27"], {
        classId: "classKota",
        studentId: "student1",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insGto",
        branchId: "kota_gorontalo",
      });
      await seedDoc(["classAttendance", "classBoba_student2_2026-09-27"], {
        classId: "classBoba",
        studentId: "student2",
        attendanceDate: "2026-09-27",
        status: "PRESENT",
        method: "SCAN",
        markedBy: "insBoba",
        branchId: "bone_bolango",
      });
    });

    it("reads same-branch progress reports from both divisions, including other instructors'", async () => {
      await assertSucceeds(getDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses")));
      await assertSucceeds(getDoc(doc(authed("ilGto"), "progressReports", "prKotaKids")));
    });

    it("resolves the legacy instructor_leader alias identically", async () => {
      await assertSucceeds(getDoc(doc(authed("ilLegacyGto"), "progressReports", "prKotaCourses")));
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilLegacyGto"), "progressReports"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("denies cross-branch progress reports and branchless listing", async () => {
      await assertFails(getDoc(doc(authed("ilGto"), "progressReports", "prBoba")));
      await assertFails(getDoc(doc(authed("ilBoba"), "progressReports", "prKotaCourses")));
      // list requires the branch constraint: isSameBranchStrict has no fieldless fallback
      await assertFails(getDocs(collection(authed("ilGto"), "progressReports")));
    });

    it("lists only same-branch progress reports when branch-constrained", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilGto"), "progressReports"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((d) => d.id);
      expect(ids).toEqual(expect.arrayContaining(["prKotaCourses", "prKotaKids"]));
      expect(ids).not.toContain("prBoba");
    });

    it("reads branch attendance for classes the leader does not teach, and blocks cross-branch", async () => {
      await assertSucceeds(
        getDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-27"))
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("ilGto"), "classAttendance"),
            where("classId", "==", "classKota")
          )
        )
      );
      await assertFails(
        getDoc(doc(authed("ilGto"), "classAttendance", "classBoba_student2_2026-09-27"))
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("ilGto"), "classAttendance"),
            where("classId", "==", "classBoba")
          )
        )
      );
    });

    it("does not grant any new write authority over progress reports", async () => {
      await assertFails(
        updateDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses"), { overallScore: 99 })
      );
      await assertFails(deleteDoc(doc(authed("ilGto"), "progressReports", "prKotaCourses")));
      await assertFails(
        setDoc(doc(authed("ilGto"), "progressReports", "ilForged"), {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
        })
      );
    });

    it("does not grant attendance write authority for classes the leader does not teach", async () => {
      // Realigned by governance to Operational Leader / Front Office, never the Instructor Leader.
      await assertFails(
        setDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-28"), {
          classId: "classKota",
          studentId: "student1",
          attendanceDate: "2026-09-28",
          status: "PRESENT",
          method: "SCAN",
          markedBy: "ilGto",
        })
      );
      await assertFails(
        updateDoc(doc(authed("ilGto"), "classAttendance", "classKota_student1_2026-09-27"), {
          status: "ABSENT",
          method: "MANUAL",
        })
      );
    });

    it("leaves shift records closed (financial isolation)", async () => {
      await seedDoc(["shifts", "shiftKota"], SHIFT_KOTA);
      // Own shift stays readable...
      await seedDoc(["shifts", "shiftOwn"], {
        userId: "ilGto",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T01:00:00.000Z",
        clockOut: null,
      });
      await assertSucceeds(getDoc(doc(authed("ilGto"), "shifts", "shiftOwn")));
      // ...but branch shifts carrying cashReconciliation stay out of reach.
      await assertFails(getDoc(doc(authed("ilGto"), "shifts", "shiftKota")));
      await assertFails(
        getDocs(
          query(collection(authed("ilGto"), "shifts"), where("branchId", "==", "kota_gorontalo"))
        )
      );
    });

    it("denies a resigned Instructor Leader", async () => {
      await assertFails(getDoc(doc(authed("ilResigned"), "progressReports", "prKotaCourses")));
      await assertFails(
        getDoc(doc(authed("ilResigned"), "classAttendance", "classKota_student1_2026-09-27"))
      );
    });

    it("still denies a plain Instructor peer progress reports and unassigned attendance", async () => {
      await assertFails(getDoc(doc(authed("insGto"), "progressReports", "prKotaKids")));
      await assertFails(
        getDoc(doc(authed("insGto"), "classAttendance", "classBoba_student2_2026-09-27"))
      );
    });
  });


  // OD-IL-ENF2 (design A′, owner-ratified 2026-10-08): a placement level the recorded
  // score does not imply is only writable with an approved PLACEMENT_LEVEL_OVERRIDE
  // envelope, so the Instructor Leader's decision is what actually places the student.
  describe("placement level override gate (OD-IL-ENF2)", () => {
    const COURSE_INQUIRY = {
      studentName: "Andi",
      branchId: "kota_gorontalo",
      division: "courses",
      currentLevel: "",
      placementTests: [],
    };

    const approvedOverride = (over = {}) => ({
      actionId: "PLACEMENT_LEVEL_OVERRIDE",
      status: "approved",
      mode: "blocking",
      approverRole: "instructorleader",
      approverBranchId: "kota_gorontalo",
      requestedBy: "FO Budi",
      requestedByUid: "foGto",
      decidedBy: "Leader",
      decidedByUid: "ilGto",
      payload: { inquiryId: "inq1", assessedLevel: "epic", score: 50 },
      ...over,
    });

    it("refuses creating a course inquiry with an arbitrary pre-set currentLevel (FO-03)", async () => {
      await assertFails(
        addDoc(collection(authed("foGto"), "deskInquiries"), {
          ...COURSE_INQUIRY,
          currentLevel: "master",
        })
      );
    });

    it("allows creating a course inquiry with empty or unassessed currentLevel", async () => {
      await assertSucceeds(
        addDoc(collection(authed("foGto"), "deskInquiries"), {
          ...COURSE_INQUIRY,
          currentLevel: "",
        })
      );
      await assertSucceeds(
        addDoc(collection(authed("foGto"), "deskInquiries"), {
          ...COURSE_INQUIRY,
          currentLevel: "unassessed",
        })
      );
    });

    it("allows creating a kindergarten inquiry with tier-based currentLevel", async () => {
      await assertSucceeds(
        addDoc(collection(authed("foKgGto"), "deskInquiries"), {
          studentName: "Little Kevin",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          currentLevel: "tk_a",
        })
      );
    });

    it("lets an ordinary assessment set the level its own score implies", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          latestPlacementScore: 90,
        })
      );
    });

    it("lets an ordinary assessment set a score-implied level on a legacy doc with no currentLevel", async () => {
      const legacy = { ...COURSE_INQUIRY };
      delete legacy.currentLevel;
      await seedDoc(["deskInquiries", "inq1"], legacy);
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "master",
          latestPlacementScore: 70,
        })
      );
    });

    it("refuses an override with no approval at all", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await assertFails(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          latestPlacementScore: 50,
        })
      );
    });

    it("refuses a level chosen with no score, which would otherwise launder the override", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await assertFails(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          latestPlacementScore: null,
        })
      );
    });

    it("applies the override with a matching approved envelope (the Instructor Leader's path)", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "ap1"], approvedOverride());
      await assertSucceeds(
        updateDoc(doc(authed("ilGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses an approval addressed to a role the gate never assigned", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "apMgr"], approvedOverride({ approverRole: "manager" }));
      await assertFails(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "apMgr",
        })
      );
    });

    it("refuses an envelope approved by another branch's leader", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "ap1"], approvedOverride());
      await assertFails(
        updateDoc(doc(authed("ilBoba"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses an envelope that names a different inquiry", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(
        ["approvals", "ap1"],
        approvedOverride({ payload: { inquiryId: "inq_other", assessedLevel: "epic", score: 50 } })
      );
      await assertFails(
        updateDoc(doc(authed("ilGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses an envelope whose approved level differs from the level written", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(
        ["approvals", "ap1"],
        approvedOverride({ payload: { inquiryId: "inq1", assessedLevel: "master", score: 50 } })
      );
      await assertFails(
        updateDoc(doc(authed("ilGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses replaying an envelope that was already applied", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "ap1"], approvedOverride({ applied: true }));
      await assertFails(
        updateDoc(doc(authed("ilGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses a self-approved envelope", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "ap1"], approvedOverride({ decidedByUid: "foGto" }));
      await assertFails(
        updateDoc(doc(authed("ilGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("refuses a pending (not yet approved) envelope", async () => {
      await seedDoc(["deskInquiries", "inq1"], COURSE_INQUIRY);
      await seedDoc(["approvals", "ap1"], approvedOverride({ status: "pending" }));
      await assertFails(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          currentLevel: "epic",
          appliedFromApproval: "ap1",
        })
      );
    });

    it("leaves kindergarten placement ungated, where no score rubric exists", async () => {
      await seedDoc(["deskInquiries", "inqK"], { ...COURSE_INQUIRY, division: "kindergarten" });
      await assertSucceeds(
        updateDoc(doc(authed("foKgGto"), "deskInquiries", "inqK"), {
          currentLevel: "tk_a",
        })
      );
    });

    it("does not block unrelated inquiry updates, including parking a pending override", async () => {
      await seedDoc(["deskInquiries", "inq1"], { ...COURSE_INQUIRY, currentLevel: "warrior" });
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "deskInquiries", "inq1"), {
          status: "contacted",
          pendingPlacementOverride: { approvalId: "ap1", assessedLevel: "epic" },
        })
      );
    });
  });

});
