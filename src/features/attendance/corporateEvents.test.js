import { describe, expect, it } from "vitest";
import {
  isEventEligible,
  findMatchingCorporateEvents,
  isEventWithinTimeWindow,
} from "./corporateEvents.js";

describe("corporateEvents - isEventEligible", () => {
  const dateToday = "2026-09-22";

  const makeEvent = (overrides = {}) => ({
    id: "evt-1",
    name: "General Assembly",
    eventDate: dateToday,
    audienceType: "all",
    audienceValue: null,
    status: "active",
    ...overrides,
  });

  describe("status and date checks", () => {
    it("rejects cancelled events", () => {
      const evt = makeEvent({ status: "cancelled" });
      const user = { role: "instructor", branch: "Kota Gorontalo" };
      expect(isEventEligible(evt, user, dateToday)).toBe(false);
    });

    it("rejects events on a different date", () => {
      const evt = makeEvent({ eventDate: "2026-09-23" });
      const user = { role: "instructor", branch: "Kota Gorontalo" };
      expect(isEventEligible(evt, user, dateToday)).toBe(false);
    });

    it("returns false if user is missing", () => {
      const evt = makeEvent();
      expect(isEventEligible(evt, null, dateToday)).toBe(false);
    });
  });

  describe("audienceType: 'all'", () => {
    it("matches students", () => {
      const evt = makeEvent({ audienceType: "all" });
      const user = { role: "student", branch: "Bone Bolango" };
      expect(isEventEligible(evt, user, dateToday)).toBe(true);
    });

    it("matches instructors and general staff", () => {
      const evt = makeEvent({ audienceType: "all" });
      expect(isEventEligible(evt, { role: "instructor" }, dateToday)).toBe(true);
      expect(isEventEligible(evt, { role: "frontoffice" }, dateToday)).toBe(true);
      expect(isEventEligible(evt, { role: "marketing" }, dateToday)).toBe(true);
      expect(isEventEligible(evt, { role: "officeboy" }, dateToday)).toBe(true);
      expect(isEventEligible(evt, { role: "admin" }, dateToday)).toBe(true);
    });

    it("matches managers", () => {
      const evt = makeEvent({ audienceType: "all" });
      expect(isEventEligible(evt, { role: "manager" }, dateToday)).toBe(true);
    });
  });

  describe("audienceType: 'branch'", () => {
    const branchEvt = makeEvent({
      audienceType: "branch",
      audienceValue: "Kota Gorontalo",
    });

    it("matches exact branch", () => {
      expect(
        isEventEligible(branchEvt, { role: "instructor", branch: "Kota Gorontalo" }, dateToday)
      ).toBe(true);
      expect(
        isEventEligible(branchEvt, { role: "student", branch: "Kota Gorontalo" }, dateToday)
      ).toBe(true);
      expect(
        isEventEligible(branchEvt, { role: "manager", branch: "Kota Gorontalo" }, dateToday)
      ).toBe(true);
    });

    it("matches legacy branch aliases through normalization", () => {
      expect(
        isEventEligible(branchEvt, { role: "instructor", branch: "cabang utama" }, dateToday)
      ).toBe(true);
      expect(
        isEventEligible(branchEvt, { role: "student", branch: "Gorontalo" }, dateToday)
      ).toBe(true);
    });

    it("rejects users from different branch", () => {
      expect(
        isEventEligible(branchEvt, { role: "instructor", branch: "Bone Bolango" }, dateToday)
      ).toBe(false);
      expect(
        isEventEligible(branchEvt, { role: "student", branch: "Pohuwato" }, dateToday)
      ).toBe(false);
    });
  });

  describe("audienceType: 'division'", () => {
    const kgEvt = makeEvent({
      audienceType: "division",
      audienceValue: "kindergarten",
    });

    it("matches kindergarten staff", () => {
      expect(
        isEventEligible(kgEvt, { role: "instructor", division: "kindergarten" }, dateToday)
      ).toBe(true);
      expect(
        isEventEligible(kgEvt, { role: "manager", division: "kindergarten" }, dateToday)
      ).toBe(true);
    });

    it("matches kindergarten students derived from program", () => {
      expect(
        isEventEligible(kgEvt, { role: "student", programId: "kids_school" }, dateToday)
      ).toBe(true);
      expect(
        isEventEligible(kgEvt, { role: "student", program: "Kids School" }, dateToday)
      ).toBe(true);
    });

    it("rejects courses staff and students", () => {
      expect(
        isEventEligible(kgEvt, { role: "instructor", division: "courses" }, dateToday)
      ).toBe(false);
      expect(
        isEventEligible(kgEvt, { role: "student", programId: "english_course" }, dateToday)
      ).toBe(false);
    });
  });

  describe("audienceType: 'role'", () => {
    const managerEvt = makeEvent({
      audienceType: "role",
      audienceValue: "manager",
    });

    it("matches manager role", () => {
      expect(isEventEligible(managerEvt, { role: "manager" }, dateToday)).toBe(true);
    });

    it("rejects other staff roles", () => {
      expect(isEventEligible(managerEvt, { role: "instructor" }, dateToday)).toBe(false);
      expect(isEventEligible(managerEvt, { role: "frontoffice" }, dateToday)).toBe(false);
      expect(isEventEligible(managerEvt, { role: "admin" }, dateToday)).toBe(false);
    });

    it("matches instructor leader for instructor audience", () => {
      const instructorEvt = makeEvent({
        audienceType: "role",
        audienceValue: "instructor",
      });
      expect(isEventEligible(instructorEvt, { role: "instructor" }, dateToday)).toBe(true);
      expect(isEventEligible(instructorEvt, { role: "instructorleader" }, dateToday)).toBe(true);
      expect(isEventEligible(instructorEvt, { role: "instructor_leader" }, dateToday)).toBe(true);
      expect(isEventEligible(instructorEvt, { role: "head_instructor" }, dateToday)).toBe(true);
      expect(isEventEligible(instructorEvt, { role: "frontoffice" }, dateToday)).toBe(false);
    });

    it("matches instructor leader for leader-specific audience", () => {
      const leaderEvt = makeEvent({
        audienceType: "role",
        audienceValue: "instructorleader",
      });
      expect(isEventEligible(leaderEvt, { role: "instructorleader" }, dateToday)).toBe(true);
      expect(isEventEligible(leaderEvt, { role: "instructor_leader" }, dateToday)).toBe(true);
      expect(isEventEligible(leaderEvt, { role: "instructor" }, dateToday)).toBe(false);
    });

    it("matches front office leader for frontoffice audience", () => {
      const foEvt = makeEvent({
        audienceType: "role",
        audienceValue: "frontoffice",
      });
      expect(isEventEligible(foEvt, { role: "frontoffice" }, dateToday)).toBe(true);
      expect(isEventEligible(foEvt, { role: "opslead" }, dateToday)).toBe(true);
      expect(isEventEligible(foEvt, { role: "ops_lead" }, dateToday)).toBe(true);
      expect(isEventEligible(foEvt, { role: "frontofficelead" }, dateToday)).toBe(true);
    });

    it("matches branch audience when user only has branchId", () => {
      const branchEvt = makeEvent({
        audienceType: "branch",
        audienceValue: "Kota Gorontalo",
      });
      expect(isEventEligible(branchEvt, { role: "instructorleader", branchId: "kota_gorontalo" }, dateToday)).toBe(true);
      expect(isEventEligible(branchEvt, { role: "instructorleader", branchId: "bone_bolango" }, dateToday)).toBe(false);
    });

    it("never matches students on role dimension", () => {
      const studentEvt = makeEvent({
        audienceType: "role",
        audienceValue: "student",
      });
      expect(isEventEligible(studentEvt, { role: "student" }, dateToday)).toBe(false);
    });
  });
});

describe("corporateEvents - findMatchingCorporateEvents", () => {
  const dateToday = "2026-09-22";

  it("returns match: null and count: 0 when no events match", () => {
    const events = [
      {
        id: "evt-1",
        name: "Limboto Meeting",
        eventDate: dateToday,
        audienceType: "branch",
        audienceValue: "Limboto",
        status: "active",
      },
    ];
    const user = { role: "instructor", branch: "Kota Gorontalo" };
    const result = findMatchingCorporateEvents(events, user, dateToday);
    expect(result).toEqual({ match: null, count: 0, ambiguous: false });
  });

  it("returns match: event and count: 1 when exactly one event matches", () => {
    const events = [
      {
        id: "evt-1",
        name: "Campus Training",
        eventDate: dateToday,
        audienceType: "branch",
        audienceValue: "Kota Gorontalo",
        status: "active",
      },
      {
        id: "evt-2",
        name: "Limboto Training",
        eventDate: dateToday,
        audienceType: "branch",
        audienceValue: "Limboto",
        status: "active",
      },
    ];
    const user = { role: "instructor", branch: "Kota Gorontalo" };
    const result = findMatchingCorporateEvents(events, user, dateToday);
    expect(result.count).toBe(1);
    expect(result.ambiguous).toBe(false);
    expect(result.match.id).toBe("evt-1");
  });

  it("returns ambiguous: true and match: null when two or more events match", () => {
    const events = [
      {
        id: "evt-1",
        name: "All-Hands Morning",
        eventDate: dateToday,
        audienceType: "all",
        audienceValue: null,
        status: "active",
      },
      {
        id: "evt-2",
        name: "Instructor Afternoon Workshop",
        eventDate: dateToday,
        audienceType: "role",
        audienceValue: "instructor",
        status: "active",
      },
    ];
    const user = { role: "instructor", branch: "Kota Gorontalo" };
    const result = findMatchingCorporateEvents(events, user, dateToday);
    expect(result.count).toBe(2);
    expect(result.ambiguous).toBe(true);
    expect(result.match).toBeNull();
    expect(result.matchedEvents).toHaveLength(2);
  });
});

describe("corporateEvents - isEventWithinTimeWindow", () => {
  it("allows all-day access when no startTime is set", () => {
    const event = { id: "evt-1", startTime: null, endTime: null };
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T02:00:00Z"))).toBe(true);
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T14:00:00Z"))).toBe(true);
  });

  it("enforces 2 hours before startTime until endTime", () => {
    // 19:00 WITA = 11:00 UTC (WITA is UTC+8)
    // 2 hours before 19:00 is 17:00 WITA = 09:00 UTC
    // End time 21:00 WITA = 13:00 UTC
    const event = { id: "evt-1", startTime: "19:00", endTime: "21:00" };

    // 16:59 WITA (08:59 UTC) -> 1 min before window opens
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T08:59:00Z"))).toBe(false);

    // 17:00 WITA (09:00 UTC) -> window opens (2 hours before startTime)
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T09:00:00Z"))).toBe(true);

    // 19:00 WITA (11:00 UTC) -> event start
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T11:00:00Z"))).toBe(true);

    // 21:00 WITA (13:00 UTC) -> event end
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T13:00:00Z"))).toBe(true);

    // 21:01 WITA (13:01 UTC) -> after event end
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T13:01:00Z"))).toBe(false);
  });

  it("keeps event open until midnight WITA when no endTime is specified", () => {
    const event = { id: "evt-1", startTime: "19:00", endTime: null };

    // 17:00 WITA (09:00 UTC) -> eligible
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T09:00:00Z"))).toBe(true);

    // 23:59 WITA (15:59 UTC) -> eligible before midnight
    expect(isEventWithinTimeWindow(event, new Date("2026-09-28T15:59:00Z"))).toBe(true);
  });
});
