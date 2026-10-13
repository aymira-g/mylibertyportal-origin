/**
 * Real Firestore Rules Emulator Tests — Users and Profiles
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
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  setupEmulatorHarness,
  HAS_EMULATOR,
  FRONT_OFFICE_PROFILE_UID,
  FRONT_OFFICE_PROFILE,
} from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Users and Profiles", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("users-profiles");
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

  describe("Kindergarten Front Office user list queries", () => {
    beforeEach(async () => {
      await seedDoc(["users", "instructorKg"], {
        role: "instructor",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorLeaderKg"], {
        role: "instructorleader",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorLegacyLeaderKg"], {
        role: "instructor_leader",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
      await seedDoc(["users", "instructorCourses"], {
        role: "instructor",
        branchId: "kota_gorontalo",
        division: "courses",
      });
      await seedDoc(["users", "instructorKgBoba"], {
        role: "instructor",
        branchId: "bone_bolango",
        division: "kindergarten",
      });
      await seedDoc(["users", "studentKg"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "kindergarten",
      });
    });

    it("lists only same-branch kindergarten instructors, including supported instructor aliases", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toEqual(
        expect.arrayContaining(["instructorKg", "instructorLeaderKg", "instructorLegacyLeaderKg"])
      );
      expect(ids).not.toContain("instructorCourses");
      expect(ids).not.toContain("instructorKgBoba");
    });

    it("rejects an instructor query without the required division constraint", async () => {
      await assertFails(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("lists same-branch parents independently of instructor division", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toContain("parent1");
      expect(ids).not.toContain("parent2");
    });

    it("blocks a kindergarten instructor query for another branch", async () => {
      await assertFails(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "in", ["instructor", "instructorleader", "instructor_leader"]),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "bone_bolango")
          )
        )
      );
    });

    it("keeps the separate kindergarten student query intact", async () => {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foKgGto"), "users"),
            where("role", "==", "student"),
            where("division", "==", "kindergarten"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      const ids = snapshot.docs.map((userDoc) => userDoc.id);
      expect(ids).toContain("studentKg");
      expect(ids).not.toContain("student1");
    });
  });

  describe("users own profile get", () => {
    beforeEach(async () => {
      await seedDoc(["users", FRONT_OFFICE_PROFILE_UID], FRONT_OFFICE_PROFILE);
    });

    it("lets an authenticated front office user read their own profile", async () => {
      await assertSucceeds(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", FRONT_OFFICE_PROFILE_UID))
      );
    });

    it("does not let an unrelated role read the front office profile", async () => {
      await assertFails(
        getDoc(doc(authed("cleanerGto"), "users", FRONT_OFFICE_PROFILE_UID))
      );
    });

    it("does not let front office read another same-branch front office profile", async () => {
      await seedDoc(["users", "otherFrontOffice"], {
        role: "frontoffice",
        division: "kindergarten",
        branchId: "kota_gorontalo",
        status: "active",
      });
      await assertFails(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "otherFrontOffice"))
      );
    });

    it("keeps front office profile reads scoped to the same branch", async () => {
      await assertFails(
        getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "student2"))
      );
    });

    it("lets front office read operational staff but denies peers, leadership and executives", async () => {
      await seedDoc(["users", "opsLeadProbe"], {
        role: "opslead",
        branchId: "kota_gorontalo",
        division: "all",
        status: "active",
      });
      await seedDoc(["users", "obBoba"], {
        role: "officeboy",
        branchId: "bone_bolango",
        status: "active",
      });

      // Branch-level operational staff are readable by Front Office...
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "cleanerGto")));
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "obGto")));
      // ...including by a Kindergarten Front Office, since these roles are branch-level
      // rather than division-level (division filter is intentionally bypassed).
      await assertSucceeds(getDoc(doc(authed(FRONT_OFFICE_PROFILE_UID), "users", "obGto")));

      // Peers, leadership and executives in the same branch are NOT readable.
      await assertFails(getDoc(doc(authed("foGto"), "users", "foKgGto")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "mgrGto")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "admin")));
      await assertFails(getDoc(doc(authed("foGto"), "users", "opsLeadProbe")));

      // Branch isolation still holds for operational staff.
      await assertFails(getDoc(doc(authed("foGto"), "users", "obBoba")));

      // Operational leadership keeps its broader same-branch staff oversight.
      await assertSucceeds(getDoc(doc(authed("opsLeadProbe"), "users", "foKgGto")));
    });
  });


  describe("users frontoffice student fields (H1)", () => {
    it("allows status updates with audit fields on a same-branch student", async () => {
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foGto",
        })
      );
    });

    it("blocks branch moves, role escalation, and foreign fields", async () => {
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { branchId: "bone_bolango" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { role: "instructor" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { tuitionFee: 0 }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student1"), { secretBackdoor: true }));
    });

    it("blocks frontoffice from editing other branches' students or staff", async () => {
      await assertFails(updateDoc(doc(authed("foGto"), "users", "student2"), { status: "inactive" }));
      await assertFails(updateDoc(doc(authed("foGto"), "users", "insGto"), { status: "inactive" }));
    });

    it("rejects student status update by resigned or terminated front office staff", async () => {
      await assertFails(
        updateDoc(doc(authed("foResigned"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foResigned",
        })
      );
      await assertFails(
        updateDoc(doc(authed("foTerminated"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foTerminated",
        })
      );
    });

    it("rejects student status update across division boundary (Kindergarten FO -> Courses student)", async () => {
      await assertFails(
        updateDoc(doc(authed("foKg"), "users", "student1"), {
          status: "inactive",
          statusUpdatedAt: "2026-09-21T02:00:00.000Z",
          statusUpdatedBy: "foKg",
        })
      );
    });

    it("lets a user edit only their own profile basics", async () => {
      await assertSucceeds(updateDoc(doc(authed("insGto"), "users", "insGto"), { displayName: "Rina S." }));
      await assertFails(updateDoc(doc(authed("insGto"), "users", "insGto"), { level: "Advanced" }));
    });

    // ---------------------------------------------------------------------
    // F-11 CLOSED — Front Office and Manager level-write capability revoked
    //
    // Following owner ratification of OD-FO-3 (Q3), `level` and `currentLevel`
    // have been removed from the `(isFrontDeskStaff() || isManager())` student
    // update allow-list. Neither front desk staff nor division managers may
    // directly mutate academic levels.
    // ---------------------------------------------------------------------
    it("PREVENTS F-11 BYPASS: Front Office and Manager cannot write student levels", async () => {
      // Front office cannot write canonical levels directly
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "student1"), {
          currentLevel: "elite",
          rating: "5",
        })
      );

      // Arbitrary, non-canonical values are denied
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "student1"), { currentLevel: "q" })
      );

      // The legacy `level` field is equally denied
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "student1"), { level: "Advanced" })
      );

      // Managers are equally denied per confirmed Q3 decision
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "users", "student1"), { currentLevel: "master" })
      );
    });

    it("PREVENTS F-11 BYPASS: the class-level sync fan-out write is denied to Front Office", async () => {
      // classesRepository.syncStudentsCurrentLevel() fan-out shape is denied at rules layer.
      await seedDoc(["users", "syncStudentA"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        displayName: "Sync A",
      });
      await seedDoc(["users", "syncStudentB"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        displayName: "Sync B",
      });

      // Front Office writing student levels during cohort sync is rejected
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "syncStudentA"), { currentLevel: "warrior" })
      );
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "syncStudentB"), { currentLevel: "warrior" })
      );
    });

    it("confirms the level gap is about authority over the value, not scope", async () => {
      // The enrolled path IS gated (PLACEMENT_LEVEL_OVERRIDE, OD-IL-ENF2): deskInquiries
      // updates require a score-implied level or an approved envelope. The users path
      // asserted above has no equivalent. This pair is the finding in one comparison.
      //
      // Branch and division boundaries still hold on the users path, so the gap is
      // narrower than "Front Office can do anything" — it is specifically that the
      // level VALUE carries no authority in the rules.
      await assertFails(
        updateDoc(doc(authed("foBoba"), "users", "student1"), { currentLevel: "elite" })
      );
      await assertFails(
        updateDoc(doc(authed("foKg"), "users", "student1"), { currentLevel: "elite" })
      );
    });

    it("DOM05-SEC-02: Front Office can promote student level when bound to an eligible progress report", async () => {
      // 1. Seed student with currentLevel: "warrior"
      await seedDoc(["users", "promoStudent"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        currentLevel: "warrior",
        rating: "1",
      });

      // 2. Seed an eligible progress report for promoStudent recommending "elite"
      await seedDoc(["progressReports", "repValid"], {
        studentId: "promoStudent",
        branchId: "kota_gorontalo",
        division: "courses",
        eligibleForPromotion: true,
        recommendedLevel: "elite",
        instructorId: "insGto",
      });

      // 3. Front Office updates promoStudent with currentLevel: "elite" and promotedFromReport: "repValid" -> ALLOWED
      await assertSucceeds(
        updateDoc(doc(authed("foGto"), "users", "promoStudent"), {
          currentLevel: "elite",
          rating: "2",
          promotedFromReport: "repValid",
        })
      );
    });

    it("DOM05-SEC-02: Promotion is denied if jumping levels, report ineligible, or wrong student", async () => {
      await seedDoc(["users", "promoStudent2"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        currentLevel: "warrior",
        rating: "1",
      });

      // Report recommending multi-level jump (e.g. warrior -> master)
      await seedDoc(["progressReports", "repJump"], {
        studentId: "promoStudent2",
        branchId: "kota_gorontalo",
        division: "courses",
        eligibleForPromotion: true,
        recommendedLevel: "master",
        instructorId: "insGto",
      });

      // Report marked not eligible
      await seedDoc(["progressReports", "repIneligible"], {
        studentId: "promoStudent2",
        branchId: "kota_gorontalo",
        division: "courses",
        eligibleForPromotion: false,
        recommendedLevel: "elite",
        instructorId: "insGto",
      });

      // Report for a different student
      await seedDoc(["progressReports", "repOtherStudent"], {
        studentId: "student2",
        branchId: "kota_gorontalo",
        division: "courses",
        eligibleForPromotion: true,
        recommendedLevel: "elite",
        instructorId: "insGto",
      });

      // Multi-level jump fails closed (must use PLACEMENT_LEVEL_OVERRIDE approval ticket)
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "promoStudent2"), {
          currentLevel: "master",
          rating: "3",
          promotedFromReport: "repJump",
        })
      );

      // Ineligible report fails
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "promoStudent2"), {
          currentLevel: "elite",
          rating: "2",
          promotedFromReport: "repIneligible",
        })
      );

      // Other student's report fails
      await assertFails(
        updateDoc(doc(authed("foGto"), "users", "promoStudent2"), {
          currentLevel: "elite",
          rating: "2",
          promotedFromReport: "repOtherStudent",
        })
      );
    });

    it("F-6 / ADR Decision 3: Front Office cannot create students directly with elevated levels", async () => {
      // Direct creation with currentLevel: "epic" is rejected
      await assertFails(
        setDoc(doc(authed("foGto"), "users", "newStudentElevated"), {
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          displayName: "Elevated Kid",
          currentLevel: "epic",
        })
      );

      // Creation with currentLevel: "unassessed" succeeds
      await assertSucceeds(
        setDoc(doc(authed("foGto"), "users", "newStudentUnassessed"), {
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          displayName: "Fresh Kid",
          currentLevel: "unassessed",
        })
      );

      // Creation without currentLevel succeeds
      await assertSucceeds(
        setDoc(doc(authed("foGto"), "users", "newStudentNoLevel"), {
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          displayName: "No Level Kid",
        })
      );
    });

    it("F-7 / ADR Decision 4: Admin cannot delete student records", async () => {
      await seedDoc(["users", "studentToDelete"], {
        role: "student",
        branchId: "kota_gorontalo",
        division: "courses",
        displayName: "Historic Student",
      });

      // Admin hard-delete of student record is rejected by security rules
      await assertFails(
        deleteDoc(doc(authed("admin"), "users", "studentToDelete"))
      );
    });
  });


  // OD-IL-ENF4 (owner decision 2026-10-09): a staff account may not be created without an
  // approved NEW_STAFF_ACCOUNT envelope. Student/parent intake and the invite-based
  // self-registration path are deliberately unaffected.
  describe("new staff account gate (OD-IL-ENF4)", () => {
    const staffAccount = (over = {}) => ({
      displayName: "New Instructor",
      role: "instructor",
      branch: "Kota Gorontalo",
      branchId: "kota_gorontalo",
      division: "courses",
      status: "active",
      ...over,
    });

    const approvedOnboarding = (over = {}) => ({
      actionId: "NEW_STAFF_ACCOUNT",
      status: "approved",
      mode: "blocking",
      approverRole: "director",
      approverBranchId: "kota_gorontalo",
      requestedBy: "FO Budi",
      requestedByUid: "foGto",
      decidedBy: "Director",
      decidedByUid: "dirGto",
      payload: { uid: "newStaff1", email: "new@example.com", displayName: "New Instructor" },
      ...over,
    });

    it("refuses to create a staff account with no ticket on record", async () => {
      await assertFails(
        setDoc(doc(authed("dirGto"), "users", "newStaff1"), staffAccount())
      );
    });

    it("lets the Director provision the account against an approved envelope", async () => {
      await seedDoc(["approvals", "apNsa"], approvedOnboarding());
      await assertSucceeds(
        setDoc(
          doc(authed("dirGto"), "users", "newStaff1"),
          staffAccount({ appliedFromApproval: "apNsa" })
        )
      );
    });

    it("refuses an envelope addressed to a role the gate never assigned", async () => {
      await seedDoc(["approvals", "apNsa"], approvedOnboarding({ approverRole: "manager" }));
      await assertFails(
        setDoc(
          doc(authed("dirGto"), "users", "newStaff1"),
          staffAccount({ appliedFromApproval: "apNsa" })
        )
      );
    });

    it("refuses an envelope that names a different account", async () => {
      await seedDoc(
        ["approvals", "apNsa"],
        approvedOnboarding({ payload: { uid: "someoneElse" } })
      );
      await assertFails(
        setDoc(
          doc(authed("dirGto"), "users", "newStaff1"),
          staffAccount({ appliedFromApproval: "apNsa" })
        )
      );
    });

    it("refuses a pending or replayed envelope", async () => {
      await seedDoc(["approvals", "apPending"], approvedOnboarding({ status: "pending" }));
      await assertFails(
        setDoc(
          doc(authed("dirGto"), "users", "newStaff1"),
          staffAccount({ appliedFromApproval: "apPending" })
        )
      );

      await seedDoc(["approvals", "apApplied"], approvedOnboarding({ applied: true }));
      await assertFails(
        setDoc(
          doc(authed("dirGto"), "users", "newStaff1"),
          staffAccount({ appliedFromApproval: "apApplied" })
        )
      );
    });

    it("still lets an executive create a student account with no ticket", async () => {
      await assertSucceeds(
        setDoc(
          doc(authed("dirGto"), "users", "newStudent1"),
          { displayName: "New Student", role: "student", branchId: "kota_gorontalo", division: "courses" }
        )
      );
    });

    it("still lets Front Office enrol a student directly, with no ticket", async () => {
      await assertSucceeds(
        setDoc(
          doc(authed("foGto"), "users", "newStudent2"),
          { displayName: "Walk-in Student", role: "student", branchId: "kota_gorontalo", division: "courses" }
        )
      );
    });

    it("still refuses Front Office creating a staff account", async () => {
      await assertFails(
        setDoc(doc(authed("foGto"), "users", "newStaff2"), staffAccount())
      );
    });
  });

});
