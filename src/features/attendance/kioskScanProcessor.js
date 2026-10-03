import { isShiftStale, autoCloseShift, getTodaysClasses } from ".";
import {
  fetchUserById,
  fetchOpenShiftFor,
  fetchInstructorClasses,
  clockIn,
  kioskClockInWithProof,
  clockOutShift,
  kioskClockOutWithProof,
  recordStudentAttendance,
} from "./shiftsRepository";
import { isKindergartenDivision } from "../../constants/divisions.js";
import { getTodayWitaWeekday, todayWita } from "../../utils/dateWita.js";
import { fetchActiveCorporateEventsForDate } from "./corporateEventsRepository";
import { findMatchingCorporateEvents } from "./corporateEvents";
import { recordClassAttendanceScan } from "./classAttendanceRepository";
import { resolveStudentClass } from "./classResolution";
import { DEFAULT_BRANCH, branchToId } from "../../constants/branches.js";
import { isInstructorRole } from "../shared/roles.js";

/**
 * Executes staff clock-in preferentially using hardened kiosk proof when available (K-01).
 */
async function executeStaffClockIn({
  uid,
  userData,
  classId = "general",
  className = "General Duty",
  shiftType = null,
  eventId = null,
  punctuality = null,
}) {
  const punctualityPayload = punctuality || {
    status: "Present",
    scheduledStart: null,
    requiredArrival: null,
    minutesEarlyOrLate: 0,
  };

  const hasWorker =
    typeof import.meta !== "undefined" && Boolean(import.meta.env?.VITE_AI_WORKER_URL);
  const hasCrypto = typeof window !== "undefined" && Boolean(window.crypto?.subtle);

  if (typeof kioskClockInWithProof === "function" && hasWorker && hasCrypto) {
    return await kioskClockInWithProof({
      badgeToken: uid,
      role: userData.role,
      classId,
      className,
      shiftType,
      eventId,
      punctuality: punctualityPayload,
    });
  }

  return clockIn({
    uid,
    displayName: userData.displayName,
    role: userData.role,
    branch: userData.branch,
    branchId: userData.branchId,
    division: userData.division,
    classId,
    className,
    clockInAt: new Date(),
    shiftType,
    eventId,
    punctuality: punctualityPayload,
  });
}

/**
 * Core business resolution for QR badge scan at the kiosk station or class session.
 * Evaluates role, permissions, status, corporate events, shifts, and class attendance.
 *
 * @param {string} uid
 * @param {object} [options]
 * @param {boolean} [options.studentsOnly]
 * @param {boolean} [options.staffOnly]
 * @param {string} [options.attendanceMode]
 * @param {string|null} [options.classId]
 * @param {any[]} [options.todayClasses]
 * @param {string|null} [options.markedBy]
 * @param {string} [options.markedByName]
 * @param {(title?: string, type?: string, message?: string, name?: string) => void} [options.showStatus]
 * @param {((user: any) => void)|null} [options.setLastScanned]
 * @param {((data: any) => void)|null} [options.setPendingClockIn]
 * @param {((data: any) => void)|null} [options.setPendingTransition]
 * @param {((cls: any) => void)|null} [options.onClassResolved]
 * @param {string|null} [options.kioskBranchId]
 */
export async function handleKioskScan(
  uid,
  {
    studentsOnly = false,
    staffOnly = false,
    attendanceMode = "STATION",
    classId = null,
    todayClasses = [],
    markedBy = null,
    markedByName = "",
    // eslint-disable-next-line no-unused-vars
    showStatus = (_title = "", _type = "", _message = "", _name = "") => {},
    setLastScanned = null,
    setPendingClockIn = null,
    setPendingTransition = null,
    onClassResolved = null,
    kioskBranchId = null,
  } = {}
) {
  const rawId = typeof uid === "string" ? uid.trim() : "";
  if (!rawId || rawId.includes("/") || rawId.length < 5) {
    return showStatus(
      "Invalid Pass",
      "error",
      "The scanned QR code is not a recognized MY LIBERTY badge."
    );
  }
  const userData = await fetchUserById(rawId);
  if (!userData) {
    return showStatus(
      "Invalid Pass",
      "error",
      "No user profile found matching this QR badge."
    );
  }

  if (attendanceMode === "CLASS") {
    if (userData.role !== "student") {
      return showStatus(
        "Not a Student",
        "error",
        "This scanner is for student class attendance only.",
        userData.displayName
      );
    }

    const studentStatus = userData.status || "active";
    if (studentStatus === "inactive" || studentStatus === "graduated") {
      return showStatus(
        "Pass Inactive",
        "error",
        studentStatus === "graduated"
          ? "This student has graduated. Please contact the administration."
          : "This student pass is inactive. Please contact the front office.",
        userData.displayName
      );
    }

    const resolution = resolveStudentClass({
      studentId: rawId,
      todayClasses,
      selectedClassId: classId,
    });

    if (!resolution.resolved) {
      if (resolution.reason === "NOT_ENROLLED_IN_SELECTED_CLASS") {
        return showStatus(
          "Student Not Enrolled In This Class",
          "error",
          `${userData.displayName} is not enrolled in ${resolution.classItem?.className || "this class"}.`,
          userData.displayName
        );
      }
      if (resolution.reason === "AMBIGUOUS_CLASSES") {
        if (onClassResolved) {
          onClassResolved({
            ambiguous: true,
            candidateClasses: resolution.candidateClasses,
            student: userData,
          });
        }
        return showStatus(
          "Multiple Classes Scheduled",
          "info",
          "Please select a specific class to record attendance for this student.",
          userData.displayName
        );
      }
      if (resolution.reason === "NO_ENROLLED_CLASS_TODAY") {
        return showStatus(
          "No Class Scheduled Today",
          "error",
          "No active class scheduled today for this student.",
          userData.displayName
        );
      }
      return showStatus(
        "Class Not Found",
        "error",
        "The target class could not be resolved.",
        userData.displayName
      );
    }

    const targetClass = resolution.classItem;
    const todayDate = todayWita();

    const recordResult = await recordClassAttendanceScan({
      classId: targetClass.id,
      studentId: rawId,
      attendanceDate: todayDate,
      markedBy: markedBy || "station_kiosk",
      markedByName: markedByName || "",
      studentName: userData.displayName || "",
      className: targetClass.className || "",
      branchId: targetClass.branchId || userData.branchId || "",
    });

    if (recordResult.status === "created") {
      showStatus(
        "Attendance Recorded",
        "success",
        `Checked in to ${targetClass.className}. Welcome!`,
        userData.displayName
      );
    } else {
      if (recordResult.record.method === "MANUAL") {
        showStatus(
          "Attendance Already Decided",
          "info",
          `Attendance was previously decided manually (${recordResult.record.status}). The scan was not allowed to overwrite that record.`,
          userData.displayName
        );
      } else {
        showStatus(
          "Already Checked In",
          "info",
          `Student was already checked in to ${targetClass.className}.`,
          userData.displayName
        );
      }
    }

    if (setLastScanned) {
      setLastScanned({
        name: userData.displayName,
        role: "student",
        time: new Date(),
        type: `Class: ${targetClass.className} (${recordResult.status === "created" ? "Checked In" : "Already Present"})`,
      });
    }
    return;
  }

  if (studentsOnly && userData.role !== "student") {
    return showStatus(
      "Restricted Kiosk",
      "error",
      "This station only accepts student identification passes."
    );
  }
  if (staffOnly && userData.role === "student") {
    return showStatus(
      "Staff Only",
      "error",
      "This station is dedicated to staff clock-in and instructor shifts."
    );
  }

  if (userData.role === "student") {
    const studentStatus = userData.status || "active";
    if (
      studentStatus === "inactive" ||
      studentStatus === "graduated" ||
      studentStatus === "archived"
    ) {
      return showStatus(
        "Pass Inactive",
        "error",
        studentStatus === "graduated"
          ? "This student has graduated. Please contact the administration."
          : studentStatus === "archived"
          ? "This student record is archived. Please contact the front office."
          : "This student pass is inactive. Please contact the front office.",
        userData.displayName
      );
    }

    const todayDate = todayWita();
    const studentEventBranchId =
      kioskBranchId ||
      userData?.branchId ||
      (userData?.branch ? branchToId(userData.branch) : null);
    const activeEvents = await fetchActiveCorporateEventsForDate(todayDate, studentEventBranchId);
    const matchingResult = findMatchingCorporateEvents(
      activeEvents,
      userData,
      todayDate
    );
    const matchedEvent = matchingResult.match;
    const matchedEvents = matchingResult.matchedEvents || (matchedEvent ? [matchedEvent] : []);

    // If multiple corporate events match today and picker is supported, prompt student/operator
    if (matchedEvents.length > 1 && setPendingClockIn) {
      return setPendingClockIn({
        uid,
        userData,
        classes: [],
        matchedEvent: null,
        matchedEvents,
      });
    }

    // When exactly 1 event matches or picker unavailable, attribute attendance to targetEvent (K-07)
    const targetEvent = matchedEvent || (matchedEvents.length > 0 ? matchedEvents[0] : null);
    const matchingEventIds = matchedEvents.map((e) => e.id);

    const rawBranch = userData.branchId || userData.branch || DEFAULT_BRANCH;
    await recordStudentAttendance({
      uid,
      displayName: userData.displayName,
      dateKey: todayDate,
      eventId: targetEvent ? targetEvent.id : null,
      eventName: targetEvent ? targetEvent.name : null,
      matchingEventIds: matchingEventIds.length > 0 ? matchingEventIds : null,
      branchId: branchToId(rawBranch),
      branch: userData.branch || DEFAULT_BRANCH,
      division: userData.division,
    });

    const isLeave = studentStatus === "on_leave";
    let eventSuffix = "";
    if (targetEvent) {
      eventSuffix = ` · Attending: ${targetEvent.name}`;
    } else if (matchedEvents.length > 1) {
      eventSuffix = ` · Multiple Events Scheduled (${matchedEvents.length})`;
    }

    showStatus(
      isLeave ? "Attendance Recorded (On Leave)" : "Attendance Recorded",
      "success",
      isLeave
        ? `Welcome back! Note: Your profile is currently marked on leave.${eventSuffix}`
        : `Welcome to My Liberty! Have a great learning session.${eventSuffix}`,
      userData.displayName
    );
    setLastScanned({
      name: userData.displayName,
      role: "student",
      time: new Date(),
      type: targetEvent
        ? `Check-in (${targetEvent.name})`
        : matchedEvents.length > 1
        ? `Check-in (${matchedEvents.length} Events)`
        : "Check-in",
    });
  } else {
    const staffStatus = userData.status || "active";
    if (staffStatus === "resigned" || staffStatus === "terminated") {
      return showStatus(
        "Badge Deactivated",
        "error",
        "This staff badge is no longer active. Please contact academy administration.",
        userData.displayName
      );
    }

    const isKindergartenStaff = isKindergartenDivision(userData.division);
    const todayWitaDay = getTodayWitaWeekday();
    const todayDate = todayWita();
    const staffEventBranchId =
      kioskBranchId ||
      userData?.branchId ||
      (userData?.branch ? branchToId(userData.branch) : null);
    const activeEvents = await fetchActiveCorporateEventsForDate(todayDate, staffEventBranchId);
    const matchingResult = findMatchingCorporateEvents(
      activeEvents,
      userData,
      todayDate
    );
    const matchedEvent = matchingResult.match;
    const matchedEvents = matchingResult.matchedEvents || (matchedEvent ? [matchedEvent] : []);
    const hasMatchingEvents = matchedEvents.length > 0;

    if (isKindergartenStaff && (todayWitaDay === 0 || todayWitaDay === 6)) {
      // Kindergarten is closed on weekends unless a matching corporate event is active today
      if (!hasMatchingEvents) {
        return showStatus(
          "Weekend Off",
          "info",
          "Kids School (Kindergarten) is closed on weekends (Saturday & Sunday). Shifts operate Monday to Friday.",
          userData.displayName
        );
      }
    }

    const staffBranchId = branchToId(userData.branchId || userData.branch || DEFAULT_BRANCH);
    let openShift = await fetchOpenShiftFor(uid, staffBranchId);
    if (openShift && isShiftStale(openShift)) {
      await autoCloseShift(openShift);
      openShift = null;
    }

    if (!openShift) {
      if (isInstructorRole(userData.role)) {
        const instructorClasses = await fetchInstructorClasses(uid);
        const todayClasses = getTodaysClasses(instructorClasses);

        if (todayClasses.length > 0) {
          return setPendingClockIn({
            uid,
            userData,
            classes: todayClasses,
            matchedEvent,
            matchedEvents,
          });
        }

        // Instructor has no classes scheduled today.
        // Check if exactly one active corporate event matches.
        if (matchedEvent) {
          await executeStaffClockIn({
            uid,
            userData,
            classId: `corporate_event:${matchedEvent.id}`,
            className: matchedEvent.name,
            shiftType: "corporate_event",
            eventId: matchedEvent.id,
            punctuality: {
              status: "Present",
              scheduledStart: null,
              requiredArrival: null,
              minutesEarlyOrLate: 0,
            },
          });
          const isLeave = staffStatus === "on_leave";
          showStatus(
            isLeave ? "Event Duty Started (On Leave)" : "Event Duty Started",
            "success",
            isLeave
              ? `Clocked in for ${matchedEvent.name} (Note: Marked on Leave).`
              : `Clocked in for ${matchedEvent.name}.`,
            userData.displayName
          );
          return setLastScanned({
            name: userData.displayName,
            role: userData.role,
            time: new Date(),
            type: `Clock In (${matchedEvent.name})`,
          });
        }

        // If multiple corporate events match today, let the instructor pick which one to clock into
        if (matchedEvents.length > 1) {
          return setPendingClockIn({
            uid,
            userData,
            classes: [],
            matchedEvent: null,
            matchedEvents,
          });
        }

        return showStatus(
          "No Class Scheduled",
          "error",
          "You have no classes scheduled today. If you are substituting, please ask an administrator to assign you to the class first.",
          userData.displayName
        );
      }

      // Non-instructor staff (manager, frontoffice, marketing, officeboy, admin):
      if (matchedEvent) {
        await executeStaffClockIn({
          uid,
          userData,
          classId: `corporate_event:${matchedEvent.id}`,
          className: matchedEvent.name,
          shiftType: "corporate_event",
          eventId: matchedEvent.id,
          punctuality: {
            status: "Present",
            scheduledStart: null,
            requiredArrival: null,
            minutesEarlyOrLate: 0,
          },
        });
        const isLeave = staffStatus === "on_leave";
        showStatus(
          isLeave ? "Event Duty Started (On Leave)" : "Event Duty Started",
          "success",
          isLeave
            ? `Clocked in for ${matchedEvent.name} (Note: Marked on Leave).`
            : `Clocked in for ${matchedEvent.name}.`,
          userData.displayName
        );
        setLastScanned({
          name: userData.displayName,
          role: userData.role,
          time: new Date(),
          type: `Clock In (${matchedEvent.name})`,
        });
      } else if (matchedEvents.length > 1) {
        // Multiple corporate events match today -> prompt staff with picker (including General Duty)
        return setPendingClockIn({
          uid,
          userData,
          classes: [],
          matchedEvent: null,
          matchedEvents,
          allowGeneralDuty: true,
        });
      } else {
        // 0 matches -> Clock in to General Duty
        await executeStaffClockIn({
          uid,
          userData,
          classId: "general",
          className: "General Duty",
          punctuality: {
            status: "Present",
            scheduledStart: null,
            requiredArrival: null,
            minutesEarlyOrLate: 0,
          },
        });
        const isLeave = staffStatus === "on_leave";
        showStatus(
          isLeave ? "Duty Started (On Leave)" : "Duty Started",
          "success",
          isLeave
            ? "Clocked in on General Administrative Duty (Note: Marked on Leave)."
            : "Clocked in on General Administrative Duty.",
          userData.displayName
        );
        setLastScanned({
          name: userData.displayName,
          role: userData.role,
          time: new Date(),
          type: "Clock In",
        });
      }
    } else {
      if (isInstructorRole(userData.role)) {
        const instructorClasses = await fetchInstructorClasses(uid);
        const todayClasses = getTodaysClasses(instructorClasses);
        const remainingClasses = todayClasses.filter((cls) => cls.id !== openShift.classId);

        if (remainingClasses.length > 0) {
          return setPendingTransition({ uid, userData, openShift, remainingClasses });
        }
      }

      if (typeof kioskClockOutWithProof === "function") {
        await kioskClockOutWithProof({ shiftId: openShift.id, badgeToken: uid });
      } else {
        await clockOutShift(openShift.id);
      }

      if (openShift.shiftType === "corporate_event") {
        showStatus(
          "Shift Concluded",
          "success",
          `Thank you for attending ${openShift.className}!`,
          userData.displayName
        );
      } else if (hasMatchingEvents) {
        showStatus(
          "Shift Concluded — Scan Again for Event",
          "success",
          matchedEvents.length > 1
            ? "Daytime shift closed. Please scan your badge again to select your evening event."
            : `Daytime shift closed. Please scan your badge again to check in for ${matchedEvents[0].name}.`,
          userData.displayName
        );
      } else {
        showStatus(
          "Shift Concluded",
          "success",
          isInstructorRole(userData.role)
            ? "Thank you for teaching today!"
            : "Thank you for your hard work today!",
          userData.displayName
        );
      }
      setLastScanned({
        name: userData.displayName,
        role: userData.role,
        time: new Date(),
        type: "Clock Out",
      });
    }
  }
}
