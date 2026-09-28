/**
 * corporateEvents.js
 * Pure matching and validation helpers for Corporate Event Attendance.
 */

import { matchesBranchFilter } from "../../constants/branches.js";
import { matchesDivisionFilter, divisionOfProgram } from "../../constants/divisions.js";
import {
  normalizeRole,
  isInstructorRole,
  isFrontOfficeRole,
} from "../shared/roles.js";
import { WITA_OFFSET_MS } from "../../utils/dateWita.js";

/**
 * Checks whether the current time falls within the event's eligibility window in WITA:
 * - Begins 2 hours before startTime.
 * - Ends at endTime (or midnight WITA 24:00 if no endTime is specified).
 * - If no startTime is specified, event is eligible all day.
 *
 * @param {any} event
 * @param {Date|string} [currentTime=new Date()]
 * @returns {boolean}
 */
export function isEventWithinTimeWindow(event, currentTime = new Date()) {
  if (!event) return false;
  const { startTime, endTime } = event;

  // No start time means eligible all day
  if (!startTime) {
    return true;
  }

  const d = typeof currentTime === "string" ? new Date(currentTime) : currentTime;
  if (!d || isNaN(d.getTime())) return false;

  const w = new Date(d.getTime() + WITA_OFFSET_MS);
  const currentMinutes = w.getUTCHours() * 60 + w.getUTCMinutes();

  const [startH, startM] = startTime.split(":").map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const windowStartMinutes = Math.max(0, startMinutes - 120); // 2 hours before start

  let windowEndMinutes = 24 * 60; // Midnight default
  if (endTime) {
    const [endH, endM] = endTime.split(":").map(Number);
    windowEndMinutes = (endH || 0) * 60 + (endM || 0);
  }

  return currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes;
}

/**
 * Determines whether a user (student, manager, or staff) is eligible for a specific corporate event.
 *
 * Eligibility rules:
 * - Event must be active (not cancelled).
 * - Event date must match target dateStr (YYYY-MM-DD WITA calendar date).
 * - Event must be within the time eligibility window (2 hours before startTime until endTime/midnight).
 * - "all": matches everyone (students, every staff role, and managers).
 * - "branch": matches anyone in that canonical branch.
 * - "division": matches anyone in that canonical division (derives division from program for students).
 * - "role": matches staff/manager by canonical role, including category matches (e.g. instructorleader is eligible for instructor events).
 *
 * @param {any} event
 * @param {any} user
 * @param {string} [dateStr] - YYYY-MM-DD
 * @param {Date|string} [currentTime=new Date()]
 * @returns {boolean}
 */
export function isEventEligible(event, user, dateStr, currentTime = new Date()) {
  if (!event || event.status !== "active") {
    return false;
  }

  if (dateStr && event.eventDate !== dateStr) {
    return false;
  }

  if (!isEventWithinTimeWindow(event, currentTime)) {
    return false;
  }

  if (!user) {
    return false;
  }

  const { audienceType, audienceValue } = event;

  switch (audienceType) {
    case "all":
      return true;

    case "branch":
      return matchesBranchFilter(user.branch || user.branchId, audienceValue);

    case "division": {
      const userDivision =
        user.division ||
        (user.role === "student"
          ? divisionOfProgram(user.programId || user.program)
          : "courses");
      return matchesDivisionFilter(userDivision, audienceValue);
    }

    case "role": {
      if (user.role === "student") {
        return false;
      }
      const userRole = normalizeRole(user.role);
      const targetRole = normalizeRole(audienceValue);

      if (userRole === targetRole) {
        return true;
      }
      if (targetRole === "instructor" && isInstructorRole(userRole)) {
        return true;
      }
      if (targetRole === "frontoffice" && isFrontOfficeRole(userRole)) {
        return true;
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Finds matching corporate events for a user on a given date and time.
 *
 * Resolution logic:
 * - Exactly 1 match -> { match: event, count: 1, ambiguous: false, matchedEvents }
 * - More than 1 match -> { match: null, count: N, ambiguous: true, matchedEvents }
 * - 0 matches -> { match: null, count: 0, ambiguous: false }
 *
 * @param {Array<any>} events
 * @param {any} user
 * @param {string} [dateStr]
 * @param {Date|string} [currentTime=new Date()]
 * @returns {{ match: any|null, count: number, ambiguous: boolean, matchedEvents?: Array<any> }}
 */
export function findMatchingCorporateEvents(events, user, dateStr, currentTime = new Date()) {
  if (!Array.isArray(events) || events.length === 0 || !user) {
    return { match: null, count: 0, ambiguous: false };
  }

  const matches = events.filter((evt) => isEventEligible(evt, user, dateStr, currentTime));

  if (matches.length === 1) {
    return { match: matches[0], count: 1, ambiguous: false, matchedEvents: matches };
  }

  if (matches.length > 1) {
    return { match: null, count: matches.length, ambiguous: true, matchedEvents: matches };
  }

  return { match: null, count: 0, ambiguous: false };
}
