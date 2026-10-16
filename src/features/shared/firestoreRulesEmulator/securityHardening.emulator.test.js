/**
 * Real Firestore Rules Emulator Tests — Security Hardening & Maker-Checker Workflows
 */
import { describe, beforeAll, beforeEach, afterAll, it } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { setupEmulatorHarness, HAS_EMULATOR, APPROVAL_KOTA } from "./setup.js";

let testEnv;
let authed;
let seedDoc;
let seedUsers;

describe.skipIf(!HAS_EMULATOR)(
  "firestore.rules — Security Hardening & Maker-Checker Workflows",
  () => {
    beforeAll(async () => {
      const harness = await setupEmulatorHarness("security-hardening");
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

    describe("Phase 1 Security Hardening (Blueprint v3.3 & OD-MKT-8/10)", () => {
      it("strictly prevents Admin from deleting business collection records", async () => {
        // payments
        await seedDoc(["payments", "paySecTest"], {
          studentId: "student1",
          branchId: "kota_gorontalo",
          amount: 500000,
        });
        await assertFails(deleteDoc(doc(authed("admin"), "payments", "paySecTest")));

        // shifts
        await seedDoc(["shifts", "shiftSecTest"], {
          userId: "insGto",
          branchId: "kota_gorontalo",
          clockIn: "2026-10-09T08:00:00Z",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "shifts", "shiftSecTest")));

        // classes
        await seedDoc(["classes", "classSecTest"], {
          branchId: "kota_gorontalo",
          division: "courses",
          instructorId: "insGto",
          status: "active",
          capacity: 10,
          studentIds: ["student1"],
        });
        await assertFails(deleteDoc(doc(authed("admin"), "classes", "classSecTest")));

        // attendance
        await seedDoc(["attendance", "attSecTest"], {
          branchId: "kota_gorontalo",
          division: "courses",
          userId: "insGto",
          role: "instructor",
          timestamp: "2026-10-09T08:00:00Z",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "attendance", "attSecTest")));

        // classAttendance
        await seedDoc(["classAttendance", "cattSecTest"], {
          branchId: "kota_gorontalo",
          division: "courses",
          classId: "cls1",
          studentId: "student1",
          attendanceDate: "2026-10-09",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "classAttendance", "cattSecTest")));

        // schoolOutreach
        await seedDoc(["schoolOutreach", "soSecTest"], {
          branchId: "kota_gorontalo",
          branch: "Cabang Utama",
          schoolName: "Test School",
          createdAt: "2026-10-09T00:00:00Z",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "schoolOutreach", "soSecTest")));

        // corporateEvents
        await seedDoc(["corporateEvents", "ceSecTest"], {
          branchId: "kota_gorontalo",
          audienceType: "branch",
          audienceValue: "kota_gorontalo",
          eventName: "Event",
          eventDate: "2026-10-09T00:00:00Z",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "corporateEvents", "ceSecTest")));

        // staffLeave (DOM07-UI-02 / Blueprint §7.3)
        await seedDoc(["staffLeave", "slSecTest"], {
          userId: "insGto",
          branchId: "kota_gorontalo",
          division: "courses",
          type: "cuti",
          startDate: "2026-10-25",
          endDate: "2026-10-27",
          status: "approved",
          createdBy: "dirGto",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "staffLeave", "slSecTest")));

        // shiftAuditEvents (DOM07-SEC-04 / Blueprint §7.3)
        await seedDoc(["shiftAuditEvents", "saeSecTest"], {
          shiftId: "shift1",
          actorId: "foGto",
          action: "manual_adjustment",
          appliedFromApproval: "corr1",
        });
        await assertFails(deleteDoc(doc(authed("admin"), "shiftAuditEvents", "saeSecTest")));

        // users: Admin may delete a non-executive staff profile.
        // Corrected 2026-10-09 (Front Office Phase 1): this previously asserted the delete FAILED.
        // That assertion matched commit 7cf64a1's shortened clause, but it contradicted the Admin
        // Staff Directory delete button (AdminDashboard.jsx:228 -> StaffDirectory.jsx:201 ->
        // deleteUserProfile), which was left permanently failing with PERMISSION_DENIED. Executive and
        // Admin targets remain undeletable — asserted in the dedicated test below.
        await assertSucceeds(deleteDoc(doc(authed("admin"), "users", "insGto")));
      });

      it("removes user-record deletion from Front Office and confines it to Admin (Front Office Phase 1)", async () => {
        await seedDoc(["users", "delStdTest"], {
          role: "student",
          branchId: "kota_gorontalo",
          division: "courses",
          displayName: "Deletable Student",
        });
        await seedDoc(["users", "delParTest"], {
          role: "parent",
          branchId: "kota_gorontalo",
          displayName: "Deletable Parent",
        });

        // Front Office holds no delete in any division: withdraw/freeze is the gated
        // STUDENT_WITHDRAWAL_OR_FREEZE workflow and must not be bypassable by deleting the record.
        // Before this change isFrontDeskStaff was the ONLY role able to delete these records.
        await assertFails(deleteDoc(doc(authed("foGto"), "users", "delStdTest")));
        await assertFails(deleteDoc(doc(authed("foGto"), "users", "delParTest")));

        // The Kindergarten desk path is closed too — the role is the control, not the division.
        await assertFails(deleteDoc(doc(authed("foKgGto"), "users", "delStdTest")));

        // Ops Lead has read-only oversight of desk records and never held delete.
        await assertFails(deleteDoc(doc(authed("opsGto"), "users", "delStdTest")));

        // Cross-branch and resigned desk staff are refused as well.
        await assertFails(deleteDoc(doc(authed("foBoba"), "users", "delStdTest")));
        await assertFails(deleteDoc(doc(authed("foResigned"), "users", "delStdTest")));

        // Manager is not an administrator and holds no record-deletion path either.
        await assertFails(deleteDoc(doc(authed("mgrGto"), "users", "delStdTest")));

        // Executive and Admin accounts remain undeletable by Admin.
        await assertFails(deleteDoc(doc(authed("admin"), "users", "dirGto")));
        await assertFails(deleteDoc(doc(authed("admin"), "users", "vdGto")));
        await assertFails(deleteDoc(doc(authed("admin"), "users", "admin")));

        // Admin retains the maintenance path for parent records, but cannot delete student records (ADR 2026-10-13 Q4)
        await assertFails(deleteDoc(doc(authed("admin"), "users", "delStdTest")));
        await assertSucceeds(deleteDoc(doc(authed("admin"), "users", "delParTest")));
      });

      it("enforces that branch_manager role cannot act as manager or decide gates", async () => {
        // Cannot decide approval gate
        await seedDoc(["approvals", "apBmTest"], {
          ...APPROVAL_KOTA,
          actionId: "TUITION_PLAN_CHANGE",
          status: "pending",
          approverRole: "manager",
          approverBranchId: "kota_gorontalo",
        });
        await assertFails(
          updateDoc(doc(authed("bmGto"), "approvals", "apBmTest"), {
            status: "approved",
            decidedBy: "Branch Manager",
            decidedByUid: "bmGto",
            decidedAt: "2026-10-09T02:00:00.000Z",
            updatedAt: "2026-10-09T02:00:00.000Z",
          })
        );
      });

      it("restricts invite creation so only Director can invite admin, director, or vice_director", async () => {
        // Director invites admin -> succeeds
        await assertSucceeds(
          setDoc(doc(authed("dirGto"), "invites", "invAdmin"), {
            email: "newadmin@myliberty.id",
            role: "admin",
            createdAt: "2026-10-09T00:00:00Z",
          })
        );

        // Director invites vice_director -> succeeds
        await assertSucceeds(
          setDoc(doc(authed("dirGto"), "invites", "invVd"), {
            email: "newvd@myliberty.id",
            role: "vice_director",
            createdAt: "2026-10-09T00:00:00Z",
          })
        );

        // Vice Director invites admin -> fails
        await assertFails(
          setDoc(doc(authed("vdGto"), "invites", "invAdminByVd"), {
            email: "admin2@myliberty.id",
            role: "admin",
            createdAt: "2026-10-09T00:00:00Z",
          })
        );

        // Admin invites director -> fails
        await assertFails(
          setDoc(doc(authed("admin"), "invites", "invDirByAdmin"), {
            email: "director2@myliberty.id",
            role: "director",
            createdAt: "2026-10-09T00:00:00Z",
          })
        );

        // Vice Director invites non-executive staff (instructor) -> succeeds
        await assertSucceeds(
          setDoc(doc(authed("vdGto"), "invites", "invInsByVd"), {
            email: "newins@myliberty.id",
            role: "instructor",
            createdAt: "2026-10-09T00:00:00Z",
          })
        );
      });

      it("strictly restricts applications and deskInquiries deletion to Vice Director and Director (OD-MKT-8)", async () => {
        await seedDoc(["applications", "appDelTest"], {
          branchId: "kota_gorontalo",
          division: "courses",
          studentName: "Test Applicant",
          status: "pending",
          submittedAt: "2026-10-09T00:00:00Z",
        });

        await seedDoc(["deskInquiries", "inqDelTest"], {
          branchId: "kota_gorontalo",
          division: "courses",
          studentName: "Test Inquirer",
          status: "inquired",
          createdAt: "2026-10-09T00:00:00Z",
        });

        // Front Office cannot delete applications or deskInquiries
        await assertFails(deleteDoc(doc(authed("foGto"), "applications", "appDelTest")));
        await assertFails(deleteDoc(doc(authed("foGto"), "deskInquiries", "inqDelTest")));

        // Manager cannot delete deskInquiries
        await assertFails(deleteDoc(doc(authed("mgrGto"), "deskInquiries", "inqDelTest")));

        // Admin cannot delete applications or deskInquiries
        await assertFails(deleteDoc(doc(authed("admin"), "applications", "appDelTest")));
        await assertFails(deleteDoc(doc(authed("admin"), "deskInquiries", "inqDelTest")));

        // Vice Director can delete deskInquiries
        await assertSucceeds(deleteDoc(doc(authed("vdGto"), "deskInquiries", "inqDelTest")));

        // Director can delete applications
        await assertSucceeds(deleteDoc(doc(authed("dirGto"), "applications", "appDelTest")));
      });

      describe("todos directives authorization and completion integrity (OB-SEC-01)", () => {
        beforeEach(async () => {
          await seedUsers();
        });

        it("permits assignees to complete assigned directives and enforces self-attribution", async () => {
          // Broadcast task (assignee: 'all')
          await seedDoc(["todos", "todoBroadcast"], {
            text: "Campus morning sweep",
            assignee: "all",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Role-targeted task (assignee: 'officeboy')
          await seedDoc(["todos", "todoRoleOb"], {
            text: "Restock restroom supplies",
            assignee: "officeboy",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Individual-targeted task (assignee: 'obGto')
          await seedDoc(["todos", "todoIndividualOb"], {
            text: "Repair whiteboard easel",
            assignee: "obGto",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Office boy completes broadcast task with valid self-attribution -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcast"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Office boy completes role-targeted task with valid self-attribution -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("obGto"), "todos", "todoRoleOb"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Office boy completes individual-targeted task -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("obGto"), "todos", "todoIndividualOb"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );
        });

        it("denies completion attempts by non-assignees, unassigned directives, and forged attribution (OB-SEC-02)", async () => {
          // Task assigned to instructor
          await seedDoc(["todos", "todoForInstructor"], {
            text: "Submit lesson plan",
            assignee: "instructor",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Task assigned individually to insGto
          await seedDoc(["todos", "todoIndividualIns"], {
            text: "Review gradebook",
            assignee: "insGto",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Broadcast task for testing forged attribution
          await seedDoc(["todos", "todoBroadcastForged"], {
            text: "Tidy front desk",
            assignee: "all",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Task missing assignee field entirely (OB-SEC-02)
          await seedDoc(["todos", "todoMissingAssignee"], {
            text: "Unassigned facility task",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Task assigned to officeboy to test front office non-assignee completion
          await seedDoc(["todos", "todoForObDeskCheck"], {
            text: "Mop front lobby",
            assignee: "officeboy",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Task with explicit null assignee (OB-SEC-02)
          await seedDoc(["todos", "todoExplicitNullAssignee"], {
            text: "Null assignee task",
            assignee: null,
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Office boy attempts to complete task assigned to instructor role -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoForInstructor"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Instructor attempts to complete task assigned to office boy role -> fails
          await assertFails(
            updateDoc(doc(authed("insGto"), "todos", "todoForObDeskCheck"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "insGto",
              completedByName: "insGto",
            })
          );

          // Office boy attempts to complete task assigned individually to insGto -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoIndividualIns"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // OB-SEC-02: Office boy attempts to complete unassigned task (missing assignee field) -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoMissingAssignee"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // OB-SEC-02: Office boy attempts to complete task with explicit null assignee -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoExplicitNullAssignee"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // OB-SEC-02: Front Office desk staff attempts to complete unassigned task -> fails
          await assertFails(
            updateDoc(doc(authed("foGto"), "todos", "todoMissingAssignee"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "foGto",
              completedByName: "foGto",
            })
          );

          // Front Office desk staff attempts to complete task assigned to officeboy -> fails
          await assertFails(
            updateDoc(doc(authed("foGto"), "todos", "todoForObDeskCheck"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "foGto",
              completedByName: "foGto",
            })
          );

          // Office boy attempts to forge completion attribution by setting completedBy to insGto -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "insGto",
              completedByName: "insGto",
            })
          );

          // Office boy attempts to complete without completedBy -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: null,
              completedByName: "obGto",
            })
          );

          // Office boy attempts to complete without completedByName -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
            })
          );

          // Direct write with spoofed display name (does not match profile displayName) -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "Managing Director",
            })
          );

          // Direct write with empty display name string -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "",
            })
          );

          // Direct write with forged past ISO completion time string -> fails (Item 1 timestamp integrity)
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: "2026-10-10T08:00:00Z",
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Direct write with forged future ISO completion time string -> fails (Item 1 timestamp integrity)
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: "2099-01-01T00:00:00Z",
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Direct write with forged client Date object -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: new Date(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Office boy attempts to complete without completedAt -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Office boy attempts to complete with empty string completedAt -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBroadcastForged"), {
              completed: true,
              completedAt: "",
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );
        });

        it("restricts reopening completed directives to task creator and authorized supervisors (OB-SEC-03)", async () => {
          // Completed task created by Manager
          await seedDoc(["todos", "todoCompletedByMgr"], {
            text: "Quarterly inventory check",
            assignee: "officeboy",
            completed: true,
            completedAt: "2026-10-10T07:00:00Z",
            completedBy: "obGto",
            completedByName: "Support Staff",
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          // Office boy (assignee, but not creator or supervisor) cannot reopen -> fails
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Instructor cannot reopen manager's completed task -> fails
          await assertFails(
            updateDoc(doc(authed("insGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // OB-SEC-03: Front Office desk staff (not creator and not supervisor) cannot reopen manager's task -> fails
          await assertFails(
            updateDoc(doc(authed("foGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Operational Leader (supervisor) attempting to reopen while retaining completedBy -> fails (attribution integrity)
          await assertFails(
            updateDoc(doc(authed("opsGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: "obGto",
              completedByName: null,
            })
          );

          // Action 1: System Admin (technical role only, no business supervisor authority) cannot reopen directives -> fails
          await assertFails(
            updateDoc(doc(authed("admin"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // System Admin cannot edit directive content -> fails
          await assertFails(
            updateDoc(doc(authed("admin"), "todos", "todoCompletedByMgr"), {
              text: "Admin altered directive text",
            })
          );

          // System Admin cannot delete directives -> fails
          await assertFails(deleteDoc(doc(authed("admin"), "todos", "todoCompletedByMgr")));

          // Operational Leader (supervisor) can reopen with full attribution reset -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("opsGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Division Manager (supervisor) can reopen -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("mgrGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Vice Director (executive operational control) can reopen -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("vdGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Director (strategic executive control) can reopen -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("dirGto"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Completed task created by Front Office
          await seedDoc(["todos", "todoCompletedByFo"], {
            text: "Replenish admission forms",
            assignee: "officeboy",
            completed: true,
            completedAt: "2026-10-10T07:00:00Z",
            completedBy: "obGto",
            completedByName: "Support Staff",
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "foGto",
          });

          // Assignee (obGto) cannot reopen Front Office's task -> fails (unauthorized reopening)
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoCompletedByFo"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Cross-branch supervisor: Bone Bolango manager cannot reopen Kota Gorontalo task -> fails (cross-branch access)
          await assertFails(
            updateDoc(doc(authed("mgrBoba"), "todos", "todoCompletedByMgr"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Front Office (task creator) can reopen -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("foGto"), "todos", "todoCompletedByFo"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Completed task created by Instructor
          await seedDoc(["todos", "todoCompletedByIns"], {
            text: "Prep classroom A audio cable",
            assignee: "officeboy",
            completed: true,
            completedAt: "2026-10-10T07:00:00Z",
            completedBy: "obGto",
            completedByName: "obGto",
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "insGto",
          });

          // Non-creator peer staff (foGto) cannot reopen instructor's task -> fails
          await assertFails(
            updateDoc(doc(authed("foGto"), "todos", "todoCompletedByIns"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );

          // Instructor (task creator) can reopen their own task -> succeeds (creator reopening)
          await assertSucceeds(
            updateDoc(doc(authed("insGto"), "todos", "todoCompletedByIns"), {
              completed: false,
              completedAt: null,
              completedBy: null,
              completedByName: null,
            })
          );
        });

        it("enforces branch boundary and blocks unauthorized editing or deleting of directives", async () => {
          // Task in Bone Bolango
          await seedDoc(["todos", "todoBobaBranch"], {
            text: "Clean Boba reception",
            assignee: "all",
            completed: false,
            branchId: "bone_bolango",
            branch: "Bone Bolango",
            createdBy: "mgrBoba",
          });

          // Kota Gorontalo office boy cannot touch Bone Bolango task -> fails (cross-branch access)
          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoBobaBranch"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "obGto",
              completedByName: "obGto",
            })
          );

          // Bone Bolango manager cannot touch or complete Kota Gorontalo task -> fails (cross-branch access)
          await assertFails(
            updateDoc(doc(authed("mgrBoba"), "todos", "todoTamperTest"), {
              completed: true,
              completedAt: serverTimestamp(),
              completedBy: "mgrBoba",
              completedByName: "mgrBoba",
            })
          );

          // Kota Gorontalo Front Office cannot delete Bone Bolango task -> fails (cross-branch access)
          await assertFails(deleteDoc(doc(authed("foGto"), "todos", "todoBobaBranch")));

          // Office boy cannot alter directive text or delete
          await seedDoc(["todos", "todoTamperTest"], {
            text: "Original directive",
            assignee: "officeboy",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "mgrGto",
          });

          await assertFails(
            updateDoc(doc(authed("obGto"), "todos", "todoTamperTest"), {
              text: "Tampered directive text",
            })
          );

          await assertFails(deleteDoc(doc(authed("obGto"), "todos", "todoTamperTest")));

          // Front Office desk staff cannot alter text of manager's directive -> fails
          await assertFails(
            updateDoc(doc(authed("foGto"), "todos", "todoTamperTest"), {
              text: "Front office altered text",
            })
          );

          // Front Office desk staff cannot delete manager's directive -> fails
          await assertFails(deleteDoc(doc(authed("foGto"), "todos", "todoTamperTest")));

          // Front Office CAN delete a directive they created
          await seedDoc(["todos", "todoFoCreatedToDelete"], {
            text: "Desk note",
            assignee: "all",
            completed: false,
            branchId: "kota_gorontalo",
            branch: "Kota Gorontalo",
            createdBy: "foGto",
          });

          await assertSucceeds(deleteDoc(doc(authed("foGto"), "todos", "todoFoCreatedToDelete")));
        });
      });

      describe("Staff Leave (/staffLeave/{leaveId}) — DOM07-SEC-01 & DOM07-SEC-02", () => {
        it("allows executives and division managers to log leave, and allows leave for manager role", async () => {
          // Executive can log leave for instructor
          await assertSucceeds(
            setDoc(doc(authed("dirGto"), "staffLeave", "leave1"), {
              userId: "insGto",
              branchId: "kota_gorontalo",
              type: "sakit",
              startDate: "2026-10-20",
              endDate: "2026-10-21",
              status: "approved",
              createdBy: "dirGto",
            })
          );

          // Executive can log leave for division manager (DOM07-SEC-02: manager is in isTrackedLeaveRole)
          await assertSucceeds(
            setDoc(doc(authed("dirGto"), "staffLeave", "leave2"), {
              userId: "mgrGto",
              branchId: "kota_gorontalo",
              division: "courses",
              type: "cuti",
              startDate: "2026-10-25",
              endDate: "2026-10-27",
              status: "approved",
              createdBy: "dirGto",
            })
          );

          // Division Manager can log leave for same-branch division staff (DOM07-SEC-01)
          await assertSucceeds(
            setDoc(doc(authed("mgrGto"), "staffLeave", "leave3"), {
              userId: "insGto",
              branchId: "kota_gorontalo",
              division: "courses",
              type: "izin",
              startDate: "2026-10-22",
              endDate: "2026-10-22",
              status: "approved",
              createdBy: "mgrGto",
            })
          );

          // Division Manager CANNOT log leave for other branch staff -> fails
          await assertFails(
            setDoc(doc(authed("mgrGto"), "staffLeave", "leaveCrossBranch"), {
              userId: "insBoba",
              branchId: "bone_bolango",
              type: "sakit",
              startDate: "2026-10-22",
              endDate: "2026-10-22",
              status: "approved",
              createdBy: "mgrGto",
            })
          );

          // Instructor cannot create leave records directly -> fails
          await assertFails(
            setDoc(doc(authed("insGto"), "staffLeave", "leaveSelf"), {
              userId: "insGto",
              branchId: "kota_gorontalo",
              type: "sakit",
              startDate: "2026-10-22",
              endDate: "2026-10-22",
              status: "approved",
              createdBy: "insGto",
            })
          );

          // Technical Admin CANNOT create, update, or delete staff leave records (DOM07-UI-02 / Blueprint §7.3)
          await assertFails(
            setDoc(doc(authed("admin"), "staffLeave", "leaveAdminCreated"), {
              userId: "insGto",
              branchId: "kota_gorontalo",
              type: "sakit",
              startDate: "2026-10-22",
              endDate: "2026-10-22",
              status: "approved",
              createdBy: "admin",
            })
          );
          await assertFails(
            updateDoc(doc(authed("admin"), "staffLeave", "leave1"), {
              status: "rejected",
            })
          );
          await assertFails(deleteDoc(doc(authed("admin"), "staffLeave", "leave1")));
        });
      });

      describe("ADR 2026-10-13: Class Scheduling (Option B) & Corporate Events Authority", () => {
        it("enforces class batch creation permissions: Ops Lead and Division Manager succeed for same branch; Admin, Front Office, and cross-branch fail", async () => {
          // Ops Lead can create class for own branch
          await assertSucceeds(
            setDoc(doc(authed("opsGto"), "classes", "clsOpsGto"), {
              name: "Warrior A",
              className: "Warrior A",
              branchId: "kota_gorontalo",
              branch: "Kota Gorontalo",
              division: "courses",
              instructorId: "insGto",
              studentIds: [],
            })
          );

          // Division Manager can create class for own branch
          await assertSucceeds(
            setDoc(doc(authed("mgrGto"), "classes", "clsMgrGto"), {
              name: "Master B",
              className: "Master B",
              branchId: "kota_gorontalo",
              branch: "Kota Gorontalo",
              division: "courses",
              instructorId: "insGto",
              studentIds: [],
            })
          );

          // Cross-branch class creation fails
          await assertFails(
            setDoc(doc(authed("opsGto"), "classes", "clsCrossBranch"), {
              name: "Epic C",
              className: "Epic C",
              branchId: "bone_bolango",
              branch: "Bone Bolango",
              division: "courses",
              instructorId: "insGto",
              studentIds: [],
            })
          );

          // Front Office cannot create class
          await assertFails(
            setDoc(doc(authed("foGto"), "classes", "clsFoCreate"), {
              name: "Warrior D",
              className: "Warrior D",
              branchId: "kota_gorontalo",
              branch: "Kota Gorontalo",
              division: "courses",
              studentIds: [],
            })
          );

          // Admin cannot create class (business scope stripped per G-002)
          await assertFails(
            setDoc(doc(authed("admin"), "classes", "clsAdminCreate"), {
              name: "Warrior E",
              className: "Warrior E",
              branchId: "kota_gorontalo",
              branch: "Kota Gorontalo",
              division: "courses",
              studentIds: [],
            })
          );
        });

        it("enforces corporate events scope: only executives can create, update, or delete audienceType 'all'; branch staff restricted to own branch", async () => {
          // Executive can create company-wide event
          await assertSucceeds(
            setDoc(doc(authed("dirGto"), "corporateEvents", "allCompanyEvent"), {
              name: "Annual Liberty Summit",
              eventDate: "2026-11-01",
              audienceType: "all",
              audienceValue: "all",
            })
          );

          // Division Manager CANNOT create company-wide event
          await assertFails(
            setDoc(doc(authed("mgrGto"), "corporateEvents", "allCompanyEventMgr"), {
              name: "Manager Proposed Holiday",
              eventDate: "2026-11-02",
              audienceType: "all",
              audienceValue: "all",
            })
          );

          // Division Manager CAN create branch event for own branch
          await assertSucceeds(
            setDoc(doc(authed("mgrGto"), "corporateEvents", "gtoBranchEvent"), {
              name: "Kota Gorontalo Open Day",
              eventDate: "2026-11-05",
              audienceType: "branch",
              audienceValue: "kota_gorontalo",
              branchId: "kota_gorontalo",
            })
          );

          // Division Manager CANNOT update company-wide event
          await assertFails(
            updateDoc(doc(authed("mgrGto"), "corporateEvents", "allCompanyEvent"), {
              name: "Tampered Holiday",
            })
          );

          // Executive CAN update company-wide event
          await assertSucceeds(
            updateDoc(doc(authed("dirGto"), "corporateEvents", "allCompanyEvent"), {
              name: "Annual Liberty Summit (Updated)",
            })
          );

          // Division Manager CANNOT delete company-wide event
          await assertFails(deleteDoc(doc(authed("mgrGto"), "corporateEvents", "allCompanyEvent")));

          // Executive CAN delete company-wide event
          await assertSucceeds(
            deleteDoc(doc(authed("dirGto"), "corporateEvents", "allCompanyEvent"))
          );

          // Division Manager CAN delete own branch event
          await assertSucceeds(
            deleteDoc(doc(authed("mgrGto"), "corporateEvents", "gtoBranchEvent"))
          );

          // Front Office CANNOT create corporate events (OD-FO-01)
          await assertFails(
            setDoc(doc(authed("foGto"), "corporateEvents", "foCreatedEvent"), {
              name: "Front Office Unauthorized Event",
              eventDate: "2026-11-05",
              audienceType: "branch",
              audienceValue: "kota_gorontalo",
              branchId: "kota_gorontalo",
            })
          );

          // Front Office CANNOT update corporate events
          await assertFails(
            updateDoc(doc(authed("foGto"), "corporateEvents", "allCompanyEvent"), {
              name: "Front Office Tampered Event",
            })
          );

          // Front Office CANNOT delete corporate events
          await assertFails(
            deleteDoc(doc(authed("foGto"), "corporateEvents", "allCompanyEvent"))
          );
        });
      });

      describe("Domain 9: Approvals / Maker-Checker Workflows & Audit Logs (DOM09)", () => {
        it("prohibits minting admin, director, or vice_director via staff onboarding envelope (DOM09-SEC-01 / F-2)", async () => {
          // Seed approved NEW_STAFF_ACCOUNT trying to mint admin
          await seedDoc(["approvals", "apMintAdmin"], {
            actionId: "NEW_STAFF_ACCOUNT",
            status: "approved",
            mode: "blocking",
            approverRole: "director",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            decidedBy: "Director",
            decidedByUid: "dirGto",
            payload: {
              uid: "maliciousAdmin",
              role: "admin",
              branchId: "kota_gorontalo",
              division: "courses",
            },
            approvedRole: "admin",
            approvedBranchId: "kota_gorontalo",
            approvedDivision: "courses",
          });

          // Director attempts to set user with role: 'admin' using this envelope -> must fail
          await assertFails(
            setDoc(doc(authed("dirGto"), "users", "maliciousAdmin"), {
              displayName: "Malicious Admin",
              role: "admin",
              branchId: "kota_gorontalo",
              division: "courses",
              status: "active",
              appliedFromApproval: "apMintAdmin",
            })
          );

          // Seed approved NEW_STAFF_ACCOUNT with instructor role
          await seedDoc(["approvals", "apValidInstructor"], {
            actionId: "NEW_STAFF_ACCOUNT",
            status: "approved",
            mode: "blocking",
            approverRole: "director",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            decidedBy: "Director",
            decidedByUid: "dirGto",
            payload: {
              uid: "validInstructor",
              role: "instructor",
              branchId: "kota_gorontalo",
              division: "courses",
            },
            approvedRole: "instructor",
            approvedBranchId: "kota_gorontalo",
            approvedDivision: "courses",
          });

          // Director creates valid instructor -> succeeds
          await assertSucceeds(
            setDoc(doc(authed("dirGto"), "users", "validInstructor"), {
              displayName: "Valid Instructor",
              role: "instructor",
              branchId: "kota_gorontalo",
              division: "courses",
              status: "active",
              appliedFromApproval: "apValidInstructor",
            })
          );

          // Attempt to create user with role mismatched from approvedRole ('manager' instead of 'instructor') -> must fail
          await assertFails(
            setDoc(doc(authed("dirGto"), "users", "validInstructorMismatch"), {
              displayName: "Role Mismatch",
              role: "manager",
              branchId: "kota_gorontalo",
              division: "courses",
              status: "active",
              appliedFromApproval: "apValidInstructor",
            })
          );
        });

        it("enforces strict Director-only gate for STAFF_ROLE_ELEVATION and STAFF_DEACTIVATION (DOM09-GOV-01 / F-3)", async () => {
          // Pending STAFF_ROLE_ELEVATION
          await seedDoc(["approvals", "apElevate"], {
            actionId: "STAFF_ROLE_ELEVATION",
            status: "pending",
            mode: "blocking",
            approverRole: "director",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            requestedAt: "2026-10-14T00:00:00.000Z",
            payload: { uid: "insGto", targetRole: "manager" },
          });

          // Vice Director attempts to approve STAFF_ROLE_ELEVATION -> must fail
          await assertFails(
            updateDoc(doc(authed("vdGto"), "approvals", "apElevate"), {
              status: "approved",
              decidedBy: "Vice Director",
              decidedByUid: "vdGto",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );

          // Director approves STAFF_ROLE_ELEVATION -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("dirGto"), "approvals", "apElevate"), {
              status: "approved",
              decidedBy: "Director",
              decidedByUid: "dirGto",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );

          // Pending STAFF_DEACTIVATION
          await seedDoc(["approvals", "apDeact"], {
            actionId: "STAFF_DEACTIVATION",
            status: "pending",
            mode: "blocking",
            approverRole: "director",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            requestedAt: "2026-10-14T00:00:00.000Z",
            payload: { targetUserId: "insGto", targetStatus: "resigned" },
          });

          // Vice Director attempts to approve STAFF_DEACTIVATION -> must fail
          await assertFails(
            updateDoc(doc(authed("vdGto"), "approvals", "apDeact"), {
              status: "approved",
              decidedBy: "Vice Director",
              decidedByUid: "vdGto",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );

          // Director approves STAFF_DEACTIVATION -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("dirGto"), "approvals", "apDeact"), {
              status: "approved",
              decidedBy: "Director",
              decidedByUid: "dirGto",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );
        });

        it("prohibits non-Director from deactivating staff without approved STAFF_DEACTIVATION envelope (DOM09-GOV-02 / F-4)", async () => {
          // Vice Director attempts direct deactivation of staff -> must fail
          await assertFails(
            updateDoc(doc(authed("vdGto"), "users", "insGto"), {
              status: "resigned",
              updatedAt: "2026-10-14T00:00:00.000Z",
            })
          );

          // Admin attempts direct deactivation of staff -> must fail
          await assertFails(
            updateDoc(doc(authed("admin"), "users", "insGto"), {
              status: "resigned",
              updatedAt: "2026-10-14T00:00:00.000Z",
            })
          );

          // Director directly deactivates staff -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("dirGto"), "users", "insGto"), {
              status: "resigned",
              updatedAt: "2026-10-14T00:00:00.000Z",
            })
          );

          // Seed approved STAFF_DEACTIVATION envelope for cleanerGto
          await seedDoc(["approvals", "apDeactCleaner"], {
            actionId: "STAFF_DEACTIVATION",
            status: "approved",
            mode: "blocking",
            approverRole: "director",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            decidedBy: "Director",
            decidedByUid: "dirGto",
            payload: { targetUserId: "cleanerGto", targetStatus: "terminated" },
          });

          // Vice Director applies deactivation with valid approved envelope -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("vdGto"), "users", "cleanerGto"), {
              status: "terminated",
              appliedFromApproval: "apDeactCleaner",
              updatedAt: "2026-10-14T00:00:00.000Z",
            })
          );
        });

        it("enforces updatedAt server timestamp integrity and single-use applied sealing (DOM09-SEC-02 / DOM09-SEC-03)", async () => {
          await seedDoc(["approvals", "apTimeCheck"], {
            actionId: "TUITION_PLAN_CHANGE",
            status: "pending",
            mode: "blocking",
            approverRole: "manager",
            approverBranchId: "kota_gorontalo",
            requestedBy: "FO Budi",
            requestedByUid: "foGto",
            requestedAt: "2026-10-14T00:00:00.000Z",
            payload: null,
          });

          // Manager attempts to approve with spoofed updatedAt ISO string instead of serverTimestamp() -> must fail
          await assertFails(
            updateDoc(doc(authed("mgrGto"), "approvals", "apTimeCheck"), {
              status: "approved",
              decidedBy: "Manager",
              decidedByUid: "mgrGto",
              decidedAt: serverTimestamp(),
              updatedAt: "2026-10-10T00:00:00.000Z",
            })
          );

          // Manager approves using serverTimestamp() -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("mgrGto"), "approvals", "apTimeCheck"), {
              status: "approved",
              decidedBy: "Manager",
              decidedByUid: "mgrGto",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          );

          // Marking envelope applied with spoofed updatedAt string -> must fail
          await assertFails(
            updateDoc(doc(authed("mgrGto"), "approvals", "apTimeCheck"), {
              applied: true,
              appliedAt: serverTimestamp(),
              appliedByUid: "mgrGto",
              updatedAt: "2026-10-10T00:00:00.000Z",
            })
          );

          // Marking envelope applied with serverTimestamp() and valid appliedByUid -> succeeds
          await assertSucceeds(
            updateDoc(doc(authed("mgrGto"), "approvals", "apTimeCheck"), {
              applied: true,
              appliedAt: serverTimestamp(),
              appliedByUid: "mgrGto",
              updatedAt: serverTimestamp(),
            })
          );

          // Re-applying an already applied envelope -> must fail (DOM09-SEC-02 single-use seal)
          await assertFails(
            updateDoc(doc(authed("mgrGto"), "approvals", "apTimeCheck"), {
              applied: true,
              appliedAt: serverTimestamp(),
              appliedByUid: "mgrGto",
              updatedAt: serverTimestamp(),
            })
          );
        });
      });
    });
  }
);
