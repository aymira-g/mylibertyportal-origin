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
  writeBatch,
} from "firebase/firestore";
import { todayWita, witaDayStart } from "../../../utils/dateWita.js";
import { setupEmulatorHarness, HAS_EMULATOR, SHIFT_KOTA } from "./setup.js";

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
      await seedDoc(["users", "insSub"], {
        displayName: "insSub",
        role: "instructor",
        branchId: "kota_gorontalo",
      });
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
        setDoc(doc(authed("insGto"), "classAttendance", `class1_student1_${PAST_DATE}`), withoutTs)
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
      await seedDoc(["approvals", "apBackfill"], approvedBackfill({ approverRole: "manager" }));
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

    it("allows Central Academic Lead province-wide progress reports read under G-012 but denies non-academic staff", async () => {
      // Under Blueprint v3.4 §4, §5, G-012, Central Academic Lead (Instructor Leader at Kota Gorontalo)
      // holds province-wide pedagogical scope over evaluations, so ilGto can read satellite reports:
      await assertSucceeds(getDoc(doc(authed("ilGto"), "progressReports", "prBoba")));
      // Plain instructors cannot read cross-branch reports or other instructors' reports:
      await assertFails(getDoc(doc(authed("insGto"), "progressReports", "prBoba")));
      // Non-academic branch staff cannot read cross-branch reports:
      await assertFails(getDoc(doc(authed("foBoba"), "progressReports", "prKotaCourses")));
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
          query(collection(authed("ilGto"), "classAttendance"), where("classId", "==", "classKota"))
        )
      );
      await assertFails(
        getDoc(doc(authed("ilGto"), "classAttendance", "classBoba_student2_2026-09-27"))
      );
      await assertFails(
        getDocs(
          query(collection(authed("ilGto"), "classAttendance"), where("classId", "==", "classBoba"))
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

    describe("Front Office promotion workflows & progressReports rules (OD-FO-02 / FP-FO-13)", () => {
      beforeEach(async () => {
        // Seed student1 as active unassessed student
        await seedDoc(["users", "student1"], {
          displayName: "Student One",
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          currentLevel: "unassessed",
        });

        // Seed primary progress report for promotion
        await seedDoc(["progressReports", "prPromoMain"], {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "courses",
          examDate: "2026-09-20",
          eligibleForPromotion: true,
          recommendedLevel: "warrior",
        });

        // Seed secondary pending progress report for cleanup
        await seedDoc(["progressReports", "prPromoOther"], {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "courses",
          examDate: "2026-09-18",
          eligibleForPromotion: true,
        });

        // Seed an already-promoted report with eligibleForPromotion: false
        await seedDoc(["progressReports", "prAlreadyPromoted"], {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "courses",
          eligibleForPromotion: false,
        });

        // Seed a progress report for a different student (student2)
        await seedDoc(["progressReports", "prPromoStudent2"], {
          instructorId: "insOther",
          studentId: "student2",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "courses",
          examDate: "2026-09-20",
          eligibleForPromotion: true,
          recommendedLevel: "warrior",
        });
        // Seed a legacy report with missing division field (must not be silently omitted)
        await seedDoc(["progressReports", "prPromoLegacy"], {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
          eligibleForPromotion: true,
        });

        // Seed a same-branch kindergarten report for the SAME student (student1)
        await seedDoc(["progressReports", "prPromoKgSameStudent"], {
          instructorId: "insOther",
          studentId: "student1",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          eligibleForPromotion: true,
        });

        // Seed a kindergarten student and kindergarten progress report
        await seedDoc(["users", "studentKg"], {
          displayName: "Student KG",
          role: "student",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          currentLevel: "unassessed",
        });
        await seedDoc(["progressReports", "prPromoKg"], {
          instructorId: "insOther",
          studentId: "studentKg",
          classId: "classKota",
          branchId: "kota_gorontalo",
          division: "kindergarten",
          eligibleForPromotion: true,
          recommendedLevel: "star_1",
        });
      });

      it("strictly denies unconstrained progressReports list queries lacking branchId for Front Office", async () => {
        // Querying without branchId filter violates isSameBranchStrict and must fail
        const unconstrainedQ = query(
          collection(authed("foGto"), "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true)
        );
        await assertFails(getDocs(unconstrainedQ));
      });

      it("executes the exact pending-report query as Front Office with division: courses, strictly excluding same-branch kindergarten reports for the same student", async () => {
        const foDb = authed("foGto");
        // Scoped query matching promoteStudentLevel's runtime behavior for Courses desk
        const scopedQ = query(
          collection(foDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "courses")
        );
        const snap = await assertSucceeds(getDocs(scopedQ));
        const returnedIds = snap.docs.map((d) => d.id);

        // Confirms courses reports are matched, while the same student's kindergarten report is strictly excluded
        expect(returnedIds).toContain("prPromoMain");
        expect(returnedIds).toContain("prPromoOther");
        expect(returnedIds).not.toContain("prPromoKgSameStudent");
        expect(returnedIds).toHaveLength(2);

        // Execute consolidated batch with exact query results
        const batch = writeBatch(foDb);
        batch.update(doc(foDb, "users", "student1"), {
          currentLevel: "warrior",
          rating: "1",
          updatedAt: "2026-10-17T00:00:00Z",
          promotedFromReport: "prPromoMain",
        });
        for (const docSnap of snap.docs) {
          batch.update(doc(foDb, "progressReports", docSnap.id), {
            eligibleForPromotion: false,
            promotedAt: "2026-10-17T00:00:00Z",
          });
        }
        await assertSucceeds(batch.commit());

        // Verify courses reports are now ineligible while kindergarten report is untouched
        const r1 = await getDoc(doc(foDb, "progressReports", "prPromoMain"));
        const r2 = await getDoc(doc(foDb, "progressReports", "prPromoOther"));
        const rKg = await getDoc(doc(authed("foKgGto"), "progressReports", "prPromoKgSameStudent"));
        expect(r1.data().eligibleForPromotion).toBe(false);
        expect(r2.data().eligibleForPromotion).toBe(false);
        expect(rKg.data().eligibleForPromotion).toBe(true);
      });

      it("executes the exact pending-report query and promotion batch as Division Manager (mgrGto) with division: courses", async () => {
        const mgrDb = authed("mgrGto");
        const scopedQ = query(
          collection(mgrDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "courses")
        );
        const snap = await assertSucceeds(getDocs(scopedQ));
        const returnedIds = snap.docs.map((d) => d.id);

        expect(returnedIds).toContain("prPromoMain");
        expect(returnedIds).toContain("prPromoOther");
        expect(returnedIds).not.toContain("prPromoKgSameStudent");
        expect(returnedIds).toHaveLength(2);

        const batch = writeBatch(mgrDb);
        batch.update(doc(mgrDb, "users", "student1"), {
          currentLevel: "warrior",
          rating: "1",
          updatedAt: "2026-10-17T00:00:00Z",
          promotedFromReport: "prPromoMain",
        });
        for (const docSnap of snap.docs) {
          batch.update(doc(mgrDb, "progressReports", docSnap.id), {
            eligibleForPromotion: false,
            promotedAt: "2026-10-17T00:00:00Z",
          });
        }
        await assertSucceeds(batch.commit());
      });

      it("strictly denies unfiltered progressReports queries that omit the division filter (preventing cross-division read exposure)", async () => {
        const foDb = authed("foGto");
        const mgrDb = authed("mgrGto");

        // Unfiltered query omitting division filter for Courses Front Office -> DENIED
        const unconstrainedFoQ = query(
          collection(foDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo")
        );
        await assertFails(getDocs(unconstrainedFoQ));

        // Unfiltered query omitting division filter for Courses Division Manager -> DENIED
        const unconstrainedMgrQ = query(
          collection(mgrDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo")
        );
        await assertFails(getDocs(unconstrainedMgrQ));

        // Mismatched division query (Courses Front Office querying kindergarten reports) -> DENIED
        const mismatchedDivQ = query(
          collection(foDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "kindergarten")
        );
        await assertFails(getDocs(mismatchedDivQ));

        // Correctly division-scoped Courses query -> SUCCEEDS and excludes Kindergarten report
        const scopedCoursesQ = query(
          collection(foDb, "progressReports"),
          where("studentId", "==", "student1"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "courses")
        );
        const snap = await assertSucceeds(getDocs(scopedCoursesQ));
        const returnedIds = snap.docs.map((d) => d.id);
        expect(returnedIds).toContain("prPromoMain");
        expect(returnedIds).toContain("prPromoOther");
        expect(returnedIds).not.toContain("prPromoKgSameStudent");
      });

      it("requires division constraint for Kindergarten Front Office (foKgGto) pending-report query and succeeds with it", async () => {
        const kgDb = authed("foKgGto");
        // Without division constraint, Kindergarten staff list query is denied by rules
        const unconstrainedQ = query(
          collection(kgDb, "progressReports"),
          where("studentId", "==", "studentKg"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo")
        );
        await assertFails(getDocs(unconstrainedQ));

        // With division: kindergarten constraint, query succeeds
        const scopedKgQ = query(
          collection(kgDb, "progressReports"),
          where("studentId", "==", "studentKg"),
          where("eligibleForPromotion", "==", true),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "kindergarten")
        );
        const snap = await assertSucceeds(getDocs(scopedKgQ));
        expect(snap.docs).toHaveLength(1);
        expect(snap.docs[0].id).toBe("prPromoKg");
      });

      it("verifies direct document get: Courses FO can get legacy reports without division but is denied Kindergarten; Kids FO can get Kindergarten; all/missing/invalid fail closed", async () => {
        const foDb = authed("foCoursesGto");
        const kgDb = authed("foKgGto");
        const allFoDb = authed("allFOGto");
        const missingFoDb = authed("foMissingGto");
        const invalidFoDb = authed("foInvalidGto");

        // 1. Courses Front Office (foCoursesGto):
        // Direct get on Courses report -> SUCCEEDS
        await assertSucceeds(getDoc(doc(foDb, "progressReports", "prPromoMain")));
        // Direct get on Legacy report without division -> SUCCEEDS (specifically approved Courses legacy-record behavior for Courses staff)
        await assertSucceeds(getDoc(doc(foDb, "progressReports", "prPromoLegacy")));
        // Direct get on Kindergarten report -> DENIED (cross-division read blocked)
        await assertFails(getDoc(doc(foDb, "progressReports", "prPromoKgSameStudent")));

        // 2. Kindergarten Front Office (foKgGto):
        // Direct get on Kindergarten report -> SUCCEEDS
        await assertSucceeds(getDoc(doc(kgDb, "progressReports", "prPromoKgSameStudent")));
        // Direct get on Courses report -> DENIED
        await assertFails(getDoc(doc(kgDb, "progressReports", "prPromoMain")));
        // Direct get on Legacy report without division -> DENIED (kindergarten cannot read legacy records lacking division)
        await assertFails(getDoc(doc(kgDb, "progressReports", "prPromoLegacy")));

        // 3. Front Office with division: "all" (allFOGto) -> fails closed on all direct gets until owner decision
        await assertFails(getDoc(doc(allFoDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(allFoDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(allFoDb, "progressReports", "prPromoLegacy")));

        // 4. Front Office with missing division (foMissingGto) -> fails closed on all direct gets
        await assertFails(getDoc(doc(missingFoDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(missingFoDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(missingFoDb, "progressReports", "prPromoLegacy")));

        // 5. Front Office with invalid division (foInvalidGto) -> fails closed on all direct gets
        await assertFails(getDoc(doc(invalidFoDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(invalidFoDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(invalidFoDb, "progressReports", "prPromoLegacy")));
      });

      it("verifies direct document get for Ops Lead is strictly denied across all 5 division values while decision is open ([Owner Decision Required])", async () => {
        const opsAllDb = authed("opsGto");
        const opsMissingDb = authed("opsMissingGto");
        const opsInvalidDb = authed("opsInvalidGto");
        const opsKgDb = authed("opsKgGto");
        const opsCoursesDb = authed("opsCoursesGto");

        // 1. Ops Lead with division: "all" (opsGto) -> strictly DENIED on all direct gets (fail-closed)
        await assertFails(getDoc(doc(opsAllDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(opsAllDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(opsAllDb, "progressReports", "prPromoLegacy")));

        // 2. Ops Lead with missing division (opsMissingGto) -> strictly DENIED on all direct gets
        await assertFails(getDoc(doc(opsMissingDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(opsMissingDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(opsMissingDb, "progressReports", "prPromoLegacy")));

        // 3. Ops Lead with invalid division (opsInvalidGto) -> strictly DENIED on all direct gets
        await assertFails(getDoc(doc(opsInvalidDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(opsInvalidDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(opsInvalidDb, "progressReports", "prPromoLegacy")));

        // 4. Ops Lead with explicit division: "kindergarten" (opsKgGto) -> strictly DENIED while decision is open
        await assertFails(getDoc(doc(opsKgDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(opsKgDb, "progressReports", "prPromoKgSameStudent")));
        await assertFails(getDoc(doc(opsKgDb, "progressReports", "prPromoLegacy")));

        // 5. Ops Lead with explicit division: "courses" (opsCoursesGto) -> strictly DENIED while decision is open
        await assertFails(getDoc(doc(opsCoursesDb, "progressReports", "prPromoMain")));
        await assertFails(getDoc(doc(opsCoursesDb, "progressReports", "prPromoLegacy")));
        await assertFails(getDoc(doc(opsCoursesDb, "progressReports", "prPromoKgSameStudent")));
      });

      it("enforces strict division isolation on progress reports list queries for Front Office across all 5 division values", async () => {
        // 1. Explicit Courses FO (foCoursesGto)
        const foDb = authed("foCoursesGto");
        const foCoursesQ = query(
          collection(foDb, "progressReports"),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "courses")
        );
        const coursesSnap = await assertSucceeds(getDocs(foCoursesQ));
        expect(coursesSnap.docs.map((d) => d.id)).toContain("prPromoMain");
        expect(coursesSnap.docs.map((d) => d.id)).not.toContain("prPromoKgSameStudent");

        const foKgQ = query(
          collection(foDb, "progressReports"),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "kindergarten")
        );
        await assertFails(getDocs(foKgQ));

        const foUnfilteredQ = query(
          collection(foDb, "progressReports"),
          where("branchId", "==", "kota_gorontalo")
        );
        await assertFails(getDocs(foUnfilteredQ));

        // 2. Explicit Kindergarten FO (foKgGto)
        const kgDb = authed("foKgGto");
        const kgScopedQ = query(
          collection(kgDb, "progressReports"),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "kindergarten")
        );
        const kgSnap = await assertSucceeds(getDocs(kgScopedQ));
        expect(kgSnap.docs.map((d) => d.id)).toContain("prPromoKgSameStudent");
        expect(kgSnap.docs.map((d) => d.id)).not.toContain("prPromoMain");

        const kgCoursesQ = query(
          collection(kgDb, "progressReports"),
          where("branchId", "==", "kota_gorontalo"),
          where("division", "==", "courses")
        );
        await assertFails(getDocs(kgCoursesQ));

        // 3. FO with division: "all" (allFOGto) -> fails closed on all list queries until owner decision
        const allFoDb = authed("allFOGto");
        await assertFails(getDocs(query(collection(allFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(allFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(allFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // 4. FO with missing division (foMissingGto) -> fails closed
        const missingFoDb = authed("foMissingGto");
        await assertFails(getDocs(query(collection(missingFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(missingFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(missingFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // 5. FO with invalid division (foInvalidGto) -> fails closed
        const invalidFoDb = authed("foInvalidGto");
        await assertFails(getDocs(query(collection(invalidFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(invalidFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(invalidFoDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));
      });

      it("enforces progress reports list behavior for Ops Lead is strictly denied across all 5 division values while decision is open ([Owner Decision Required])", async () => {
        // 1. Ops Lead with division: "all" (opsGto) -> DENIED on all list queries (fail-closed)
        const opsAllDb = authed("opsGto");
        await assertFails(getDocs(query(collection(opsAllDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(opsAllDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(opsAllDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // Test all supported aliases for Ops Lead across all division configurations
        const aliases = [
          { uid: "opsAlias1", role: "ops_lead" },
          { uid: "opsAlias2", role: "operational_leader" },
          { uid: "opsAlias3", role: "operationalleader" },
          { uid: "opsAlias4", role: "frontofficelead" },
        ];
        for (const { uid, role } of aliases) {
          await seedDoc(["users", uid], {
            displayName: uid,
            role,
            branchId: "kota_gorontalo",
            division: "courses",
          });
          const aliasDb = authed(uid);
          await assertFails(getDocs(query(collection(aliasDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
          await assertFails(getDocs(query(collection(aliasDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
          await assertFails(getDocs(query(collection(aliasDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));
        }

        // 2. Ops Lead with missing division (opsMissingGto) -> DENIED on all list queries
        const opsMissingDb = authed("opsMissingGto");
        await assertFails(getDocs(query(collection(opsMissingDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(opsMissingDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(opsMissingDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // 3. Ops Lead with invalid division (opsInvalidGto) -> DENIED on all list queries
        const opsInvalidDb = authed("opsInvalidGto");
        await assertFails(getDocs(query(collection(opsInvalidDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(opsInvalidDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(opsInvalidDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // 4. Ops Lead with explicit division: "kindergarten" (opsKgGto) -> DENIED on all list queries
        const opsKgDb = authed("opsKgGto");
        await assertFails(getDocs(query(collection(opsKgDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(opsKgDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(opsKgDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));

        // 5. Ops Lead with explicit division: "courses" (opsCoursesGto) -> DENIED on all list queries
        const opsCoursesDb = authed("opsCoursesGto");
        await assertFails(getDocs(query(collection(opsCoursesDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "courses"))));
        await assertFails(getDocs(query(collection(opsCoursesDb, "progressReports"), where("branchId", "==", "kota_gorontalo"), where("division", "==", "kindergarten"))));
        await assertFails(getDocs(query(collection(opsCoursesDb, "progressReports"), where("branchId", "==", "kota_gorontalo"))));
      });

      it("strictly denies standalone suppression attempts when no student advancement occurs in the write", async () => {
        // Attempting to clear eligibleForPromotion standalone without student level change fails
        await assertFails(
          updateDoc(doc(authed("foGto"), "progressReports", "prPromoMain"), {
            eligibleForPromotion: false,
            promotedAt: "2026-10-17T00:00:00Z",
          })
        );
      });

      it("strictly denies standalone updates even when student doc has a stale promotedFromReport", async () => {
        // Seed student1 with existing currentLevel and stale promotedFromReport
        await seedDoc(["users", "student1"], {
          displayName: "Student One",
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          currentLevel: "warrior",
          promotedFromReport: "historicalReportId",
        });

        // Standalone update on prPromoMain must still fail because student level is not actively advancing
        await assertFails(
          updateDoc(doc(authed("foGto"), "progressReports", "prPromoMain"), {
            eligibleForPromotion: false,
            promotedAt: "2026-10-17T00:00:00Z",
          })
        );
      });

      it("strictly denies timestamp-only updates on already ineligible reports", async () => {
        // Report already has eligibleForPromotion: false; FO updates only promotedAt -> fails
        await assertFails(
          updateDoc(doc(authed("foGto"), "progressReports", "prAlreadyPromoted"), {
            promotedAt: "2026-10-17T01:00:00Z",
          })
        );
      });

      it("strictly denies sneaking in an unrelated student's report into a valid promotion batch", async () => {
        const db = authed("foGto");
        const batch = writeBatch(db);
        // Valid advancement for student1
        batch.update(doc(db, "users", "student1"), {
          currentLevel: "warrior",
          rating: "1",
          updatedAt: "2026-10-17T00:00:00Z",
          promotedFromReport: "prPromoMain",
        });
        batch.update(doc(db, "progressReports", "prPromoMain"), {
          eligibleForPromotion: false,
          promotedAt: "2026-10-17T00:00:00Z",
        });
        // Unauthorized addition: trying to clear student2's report in student1's batch
        batch.update(doc(db, "progressReports", "prPromoStudent2"), {
          eligibleForPromotion: false,
          promotedAt: "2026-10-17T00:00:00Z",
        });

        // The entire batch must fail
        await assertFails(batch.commit());
      });

      it("strictly denies Front Office from modifying academic scores, remarks, or deleting progress reports", async () => {
        await assertFails(
          updateDoc(doc(authed("foGto"), "progressReports", "prPromoMain"), {
            overallScore: 99,
          })
        );
        await assertFails(
          updateDoc(doc(authed("foGto"), "progressReports", "prPromoMain"), {
            eligibleForPromotion: true,
          })
        );
        await assertFails(deleteDoc(doc(authed("foGto"), "progressReports", "prPromoMain")));
        await assertSucceeds(deleteDoc(doc(authed("mgrGto"), "progressReports", "prPromoMain")));
      });

      it("preserves approved direct-get on unstamped legacy reports while strictly denying Front Office and Manager mutations", async () => {
        const foDb = authed("foCoursesGto");
        const mgrDb = authed("mgrGto");
        const dirDb = authed("dirGto");

        // 1. Direct get on unstamped legacy report remains allowed for Courses staff (approved legacy exception)
        await assertSucceeds(getDoc(doc(foDb, "progressReports", "prPromoLegacy")));
        await assertSucceeds(getDoc(doc(mgrDb, "progressReports", "prPromoLegacy")));

        // 2. Front Office promotion update on unstamped report -> DENIED (requires explicit matching division)
        const batch = writeBatch(foDb);
        batch.update(doc(foDb, "users", "student1"), {
          currentLevel: "warrior",
          rating: "1",
          updatedAt: "2026-10-17T00:00:00Z",
          promotedFromReport: "prPromoLegacy",
        });
        batch.update(doc(foDb, "progressReports", "prPromoLegacy"), {
          eligibleForPromotion: false,
          promotedAt: "2026-10-17T00:00:00Z",
        });
        await assertFails(batch.commit());

        // 3. Manager update on unstamped legacy report -> DENIED pending owner decision
        await assertFails(
          updateDoc(doc(mgrDb, "progressReports", "prPromoLegacy"), {
            remarks: "Manager note on legacy report",
          })
        );

        // 4. Manager delete on unstamped legacy report -> DENIED pending owner decision
        await assertFails(deleteDoc(doc(mgrDb, "progressReports", "prPromoLegacy")));

        // 5. Manager update and delete on stamped courses report -> ALLOWED
        await assertSucceeds(
          updateDoc(doc(mgrDb, "progressReports", "prPromoOther"), {
            remarks: "Manager updated remarks on valid courses report",
          })
        );

        // 6. Executive update and delete on unstamped legacy report -> ALLOWED
        await assertSucceeds(
          updateDoc(doc(dirDb, "progressReports", "prPromoLegacy"), {
            remarks: "Executive update on legacy report",
          })
        );
        await assertSucceeds(deleteDoc(doc(dirDb, "progressReports", "prPromoLegacy")));
      });
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

  describe("facilities isolation on class documents (DOM05-PRIV-04)", () => {
    beforeEach(async () => {
      await seedDoc(["classes", "classFacilitiesTest"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
        division: "courses",
      });
    });

    it("denies officeboy and cleaner from reading class documents", async () => {
      await assertFails(getDoc(doc(authed("obGto"), "classes", "classFacilitiesTest")));
      await assertFails(getDoc(doc(authed("cleanerGto"), "classes", "classFacilitiesTest")));
    });
  });
});

