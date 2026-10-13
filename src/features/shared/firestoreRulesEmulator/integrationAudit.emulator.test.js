/**
 * Real Firestore Rules Emulator Tests — Integration Audit Verification
 */
import { describe, beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  setupEmulatorHarness,
  HAS_EMULATOR,
} from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)("firestore.rules — Integration Audit Verification", () => {
  beforeAll(async () => {
    const harness = await setupEmulatorHarness("integration-audit");
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

  describe("integration audit verification & remediation (Phase 2)", () => {
    beforeEach(async () => {
      await seedUsers();
    });

    it("INT-004: Front Office can read same-branch staff user doc and shifts, but cross-branch is blocked", async () => {
      // 1. Same-branch staff profile getDoc succeeds
      await assertSucceeds(getDoc(doc(authed("foGto"), "users", "cleanerGto")));

      // 2. Cross-branch staff profile getDoc fails
      await assertFails(getDoc(doc(authed("foBoba"), "users", "cleanerGto")));

      // 3. Same-branch staff open shift query succeeds
      await seedDoc(["shifts", "shift_insGto"], {
        userId: "insGto",
        role: "instructor",
        branchId: "kota_gorontalo",
        clockIn: "2026-09-21T01:00:00.000Z",
        clockOut: null,
      });

      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "shifts"),
            where("userId", "==", "insGto"),
            where("clockOut", "==", null),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 4. Cross-branch staff shift query fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "shifts"),
            where("userId", "==", "insGto"),
            where("clockOut", "==", null),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
    });

    it("INT-002: scoped directives queries succeed and maintain branch isolation; unfiltered queries are blocked", async () => {
      await seedDoc(["todos", "todoKota"], {
        title: "Kota todo",
        branchId: "kota_gorontalo",
        completed: false,
      });
      await seedDoc(["todos", "todoBoba"], {
        title: "Boba todo",
        branchId: "bone_bolango",
        completed: false,
      });
      await seedDoc(["todos", "todoAll"], {
        title: "Academy All todo",
        branchId: "all",
        completed: false,
      });

      // 1. Unfiltered query is now blocked for all staff branches (no more leakage!)
      await assertFails(getDocs(collection(authed("foGto"), "todos")));
      await assertFails(getDocs(collection(authed("foBoba"), "todos")));

      // 2. Branch-scoped query succeeds for Kota Gorontalo and receives Kota + All
      const snapKota = await assertSucceeds(
        getDocs(query(collection(authed("foGto"), "todos"), where("branchId", "in", ["kota_gorontalo", "all"])))
      );
      const kotaIds = snapKota.docs.map((d) => d.id);
      if (!kotaIds.includes("todoKota") || !kotaIds.includes("todoAll") || kotaIds.includes("todoBoba")) {
        throw new Error("Kota query returned incorrect directives: " + JSON.stringify(kotaIds));
      }

      // 3. Branch-scoped query succeeds for Bone Bolango and receives Boba + All
      const snapBoba = await assertSucceeds(
        getDocs(query(collection(authed("foBoba"), "todos"), where("branchId", "in", ["bone_bolango", "all"])))
      );
      const bobaIds = snapBoba.docs.map((d) => d.id);
      if (!bobaIds.includes("todoBoba") || !bobaIds.includes("todoAll") || bobaIds.includes("todoKota")) {
        throw new Error("Boba query returned incorrect directives: " + JSON.stringify(bobaIds));
      }
    });

    it("INT-009: prevents Kota manager from modifying a Bone Bolango corporate event", async () => {
      await seedDoc(["corporateEvents", "bobaEvent"], {
        name: "Bone Bolango Gathering",
        branchId: "bone_bolango",
        audienceType: "branch",
        audienceValue: "Bone Bolango",
        eventDate: "2026-09-30",
      });

      // 1. Cross-branch modification is now BLOCKED by isSameBranch(resource.data)
      await assertFails(
        updateDoc(doc(authed("mgrGto"), "corporateEvents", "bobaEvent"), {
          audienceType: "branch",
          audienceValue: "Kota Gorontalo",
        })
      );

      // 2. Same-branch manager can update their event
      await assertSucceeds(
        updateDoc(doc(authed("mgrBoba"), "corporateEvents", "bobaEvent"), {
          name: "Updated Bone Bolango Gathering",
        })
      );
    });

    it("CE-BRANCH-SCOPE: enforces branch isolation for branch events and company-wide access for all events", async () => {
      await seedDoc(["corporateEvents", "bobaEvent"], {
        name: "Bone Bolango Gathering",
        branchId: "bone_bolango",
        audienceType: "branch",
        audienceValue: "Bone Bolango",
        eventDate: "2026-10-15",
        status: "active",
      });

      await seedDoc(["corporateEvents", "kotaEvent"], {
        name: "Kota Gorontalo Workshop",
        branchId: "kota_gorontalo",
        audienceType: "branch",
        audienceValue: "Kota Gorontalo",
        eventDate: "2026-10-15",
        status: "active",
      });

      await seedDoc(["corporateEvents", "allEvent"], {
        name: "Annual All-Staff Assembly",
        audienceType: "all",
        eventDate: "2026-10-15",
        status: "active",
      });

      // 1. Kota Gorontalo manager lists audienceType == "all" events -> succeeds
      await assertSucceeds(
        getDocs(query(collection(authed("mgrGto"), "corporateEvents"), where("audienceType", "==", "all")))
      );

      // 2. Kota Gorontalo manager lists branchId == "kota_gorontalo" -> succeeds
      await assertSucceeds(
        getDocs(query(collection(authed("mgrGto"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 3. Bone Bolango Front Office lists branchId == "kota_gorontalo" -> fails
      await assertFails(
        getDocs(query(collection(authed("foBoba"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 4. Any non-admin staff lists events with no filter -> fails
      await assertFails(
        getDocs(collection(authed("foGto"), "corporateEvents"))
      );
      await assertFails(
        getDocs(collection(authed("mgrGto"), "corporateEvents"))
      );

      // 5. Staff gets a single Bone Bolango branch event while belonging to Kota Gorontalo -> fails
      await assertFails(
        getDoc(doc(authed("foGto"), "corporateEvents", "bobaEvent"))
      );

      // 6. Staff gets a single company-wide event from any branch -> succeeds
      await assertSucceeds(
        getDoc(doc(authed("foGto"), "corporateEvents", "allEvent"))
      );
      await assertSucceeds(
        getDoc(doc(authed("foBoba"), "corporateEvents", "allEvent"))
      );

      // 7. Marketing user lists branchId == own branch -> succeeds. Other branch -> fails
      await assertSucceeds(
        getDocs(query(collection(authed("mktGto"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );
      await assertFails(
        getDocs(query(collection(authed("mktGto"), "corporateEvents"), where("branchId", "==", "bone_bolango")))
      );

      // 8. Staff with no branchId and no branch lists branchId == "kota_gorontalo" -> fails
      await assertFails(
        getDocs(query(collection(authed("foUnassigned"), "corporateEvents"), where("branchId", "==", "kota_gorontalo")))
      );

      // 9. Admin lists with no filter -> succeeds
      await assertSucceeds(
        getDocs(collection(authed("admin"), "corporateEvents"))
      );

      // 10. Student and parent cannot list or get any corporate event -> fails
      await assertFails(
        getDoc(doc(authed("student1"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDocs(query(collection(authed("student1"), "corporateEvents"), where("audienceType", "==", "all")))
      );
      await assertFails(
        getDoc(doc(authed("parent1"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDocs(query(collection(authed("parent1"), "corporateEvents"), where("audienceType", "==", "all")))
      );

      // 11. Resigned or terminated staff cannot list or read events -> fails
      await assertFails(
        getDoc(doc(authed("foResigned"), "corporateEvents", "allEvent"))
      );
      await assertFails(
        getDoc(doc(authed("foTerminated"), "corporateEvents", "allEvent"))
      );

      // 12. Kiosk date query shape:
      // Same branch succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      // Foreign branch fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("branchId", "==", "bone_bolango")
          )
        )
      );
      // Company-wide succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "corporateEvents"),
            where("eventDate", "==", "2026-10-15"),
            where("status", "==", "active"),
            where("audienceType", "==", "all")
          )
        )
      );
    });

    it("INT-013: progress reports are branch-isolated for staff and parent-ready", async () => {
      await seedDoc(["progressReports", "bobaReport"], {
        instructorId: "insBoba",
        studentId: "student2",
        classId: "classBoba",
        branchId: "bone_bolango",
      });
      await seedDoc(["progressReports", "kotaReport"], {
        instructorId: "insGto",
        studentId: "student1",
        classId: "class1",
        branchId: "kota_gorontalo",
      });

      // 1. Front office in Kota is BLOCKED from reading Bone Bolango progress report
      await assertFails(getDoc(doc(authed("foGto"), "progressReports", "bobaReport")));

      // 2. Front office in Kota can read Kota progress report
      await assertSucceeds(getDoc(doc(authed("foGto"), "progressReports", "kotaReport")));

      // 3. Parent ready: parent1 can read report for their linked child (student1)
      await assertSucceeds(getDoc(doc(authed("parent1"), "progressReports", "kotaReport")));

      // 4. Parent ready: parent1 CANNOT read report for another child (student2)
      await assertFails(getDoc(doc(authed("parent1"), "progressReports", "bobaReport")));

      // 5. Parent list: parent1 listing progress reports with branchId constraint for student1 -> ALLOWED
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parent1"), "progressReports"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentId", "==", "student1")
          )
        )
      );

      // 6. Parent list: parent1 listing without branchId constraint (unrestricted list) -> DENIED
      await assertFails(
        getDocs(
          query(
            collection(authed("parent1"), "progressReports"),
            where("studentId", "==", "student1")
          )
        )
      );

      // 7. Parent list: parent1 listing with mismatched/other branchId -> DENIED
      await assertFails(
        getDocs(
          query(
            collection(authed("parent1"), "progressReports"),
            where("branchId", "==", "bone_bolango"),
            where("studentId", "==", "student1")
          )
        )
      );

      // 8. Parent list: parent1 listing for non-linked child (student2) -> DENIED
      await assertFails(
        getDocs(
          query(
            collection(authed("parent1"), "progressReports"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentId", "==", "student2")
          )
        )
      );
    });

    it("INT-013-ATT: parent attendance read and list authority for linked student", async () => {
      await seedDoc(["classes", "class1"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
        status: "open",
      });
      await seedDoc(["classes", "classBoba"], {
        instructorId: "insBoba",
        studentIds: ["student2"],
        branchId: "bone_bolango",
        status: "open",
      });
      await seedDoc(["classAttendance", "attKota1"], {
        classId: "class1",
        studentId: "student1",
        attendanceDate: "2026-10-12",
        status: "PRESENT",
      });
      await seedDoc(["classAttendance", "attBoba2"], {
        classId: "classBoba",
        studentId: "student2",
        attendanceDate: "2026-10-12",
        status: "PRESENT",
      });

      // 1. Parent1 reads attendance record for own child (student1) -> ALLOWED
      await assertSucceeds(getDoc(doc(authed("parent1"), "classAttendance", "attKota1")));

      // 2. Parent1 reads attendance record for another student (student2) -> DENIED
      await assertFails(getDoc(doc(authed("parent1"), "classAttendance", "attBoba2")));

      // 3. Parent1 lists attendance for own child (student1) -> ALLOWED
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parent1"), "classAttendance"),
            where("studentId", "==", "student1")
          )
        )
      );

      // 4. Parent1 lists attendance for another student (student2) -> DENIED
      await assertFails(
        getDocs(
          query(
            collection(authed("parent1"), "classAttendance"),
            where("studentId", "==", "student2")
          )
        )
      );
    });

    it("INT-017: verifies parent class query shape under parent rules", async () => {
      await seedDoc(["classes", "class1"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
        status: "open",
      });

      // Parent1 has childStudentIds: ["student1"] and branchId: "kota_gorontalo". Query with canonical branchId:
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parent1"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );
    });

    it("DOM08-SEC-02: revokes access for inactive or suspended parent accounts", async () => {
      await seedDoc(["classes", "class1"], {
        instructorId: "insGto",
        studentIds: ["student1"],
        branchId: "kota_gorontalo",
        status: "open",
      });
      await seedDoc(["classAttendance", "attKota1"], {
        classId: "class1",
        studentId: "student1",
        attendanceDate: "2026-10-12",
        status: "PRESENT",
      });
      await seedDoc(["payments", "payKota1"], {
        studentId: "student1",
        branchId: "kota_gorontalo",
        amount: 350000,
      });

      // 1. Active parent with status: 'active' succeeds on classes, attendance, and payments
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parentActive"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );
      await assertSucceeds(getDoc(doc(authed("parentActive"), "classAttendance", "attKota1")));
      await assertSucceeds(getDoc(doc(authed("parentActive"), "payments", "payKota1")));

      // 2. Legacy parent without status field succeeds on classes, attendance, and payments
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("parent1"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );
      await assertSucceeds(getDoc(doc(authed("parent1"), "classAttendance", "attKota1")));
      await assertSucceeds(getDoc(doc(authed("parent1"), "payments", "payKota1")));

      // 3. Inactive parent cannot query classes for linked student
      await assertFails(
        getDocs(
          query(
            collection(authed("parentInactive"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );

      // 4. Suspended parent cannot query classes for linked student
      await assertFails(
        getDocs(
          query(
            collection(authed("parentSuspended"), "classes"),
            where("branchId", "==", "kota_gorontalo"),
            where("studentIds", "array-contains", "student1")
          )
        )
      );

      // 5. Inactive parent cannot read child attendance or payments
      await assertFails(getDoc(doc(authed("parentInactive"), "classAttendance", "attKota1")));
      await assertFails(getDoc(doc(authed("parentInactive"), "payments", "payKota1")));

      // 6. Suspended parent cannot read child attendance or payments
      await assertFails(getDoc(doc(authed("parentSuspended"), "classAttendance", "attKota1")));
      await assertFails(getDoc(doc(authed("parentSuspended"), "payments", "payKota1")));
    });

    it("INT-020: Front Office parent listing and querying with branch isolation", async () => {
      // 1. Kota front office can query students, instructors, and parents
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 2. Bone Bolango front office can query their own branch
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "bone_bolango")
          )
        )
      );

      // 3. Bone Bolango front office CANNOT query Kota Gorontalo branch
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );

      // 4. Dedicated parent query with branchId
      const snapGto = await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      expect(snapGto.docs.map((d) => d.id)).toContain("parent1");
      expect(snapGto.docs.map((d) => d.id)).not.toContain("parent2");

      // 5. Unfiltered query (no branch filter) for non-Kota staff (foBoba) is blocked
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 6. Test foGto without branchId filter: blocked under isSameBranchStrict
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 6b. Unscoped query without branchId is also blocked for instructor, marketing, and office boy
      await assertFails(
        getDocs(
          query(
            collection(authed("insGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("mktGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );
      await assertFails(
        getDocs(
          query(
            collection(authed("obGto"), "users"),
            where("role", "in", ["student", "instructor", "parent"])
          )
        )
      );

      // 7. array-contains query for foGto WITHOUT branchId is blocked
      await assertFails(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("childStudentIds", "array-contains", "student1")
          )
        )
      );

      // 7b. array-contains query for foGto WITH branchId succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foGto"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "kota_gorontalo"),
            where("childStudentIds", "array-contains", "student1")
          )
        )
      );

      // 8. array-contains query for foBoba WITHOUT branchId fails
      await assertFails(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "==", "parent"),
            where("childStudentIds", "array-contains", "student2")
          )
        )
      );

      // 9. array-contains query for foBoba WITH branchId succeeds
      await assertSucceeds(
        getDocs(
          query(
            collection(authed("foBoba"), "users"),
            where("role", "==", "parent"),
            where("branchId", "==", "bone_bolango"),
            where("childStudentIds", "array-contains", "student2")
          )
        )
      );

      // 10. Front Office user with NO branch assigned (neither branchId nor branch)
      // must NOT silently become kota_gorontalo and must be rejected from querying or reading
      await assertFails(
        getDocs(
          query(
            collection(authed("foUnassigned"), "users"),
            where("role", "in", ["student", "instructor", "parent"]),
            where("branchId", "==", "kota_gorontalo")
          )
        )
      );
      await assertFails(
        getDoc(doc(authed("foUnassigned"), "payments", "pay1"))
      );

      // 11. Item B defense-in-depth: Unassigned staff (FO, Manager, Instructor with no branchId and no branch)
      // attempting to query with branchId == null filter must be rejected across all branch-scoped collections
      for (const unassignedUid of ["foUnassigned", "mgrUnassigned", "insUnassigned"]) {
        const authedDb = authed(unassignedUid);

        // users listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "users"),
              where("role", "in", ["student", "instructor", "parent"]),
              where("branchId", "==", null)
            )
          )
        );

        // payments listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "payments"),
              where("branchId", "==", null)
            )
          )
        );

        // attendance listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "attendance"),
              where("branchId", "==", null)
            )
          )
        );

        // classes listing with branchId == null must fail
        await assertFails(
          getDocs(
            query(
              collection(authedDb, "classes"),
              where("branchId", "==", null)
            )
          )
        );
      }
    });
  });

});
