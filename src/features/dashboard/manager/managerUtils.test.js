import { describe, expect, it } from "vitest";
import {
  formatPunctuality,
  formatTime,
  filterCourseDivision,
  computeBottleneckTotals,
} from "./managerUtils.js";

describe("formatTime", () => {
  it("returns N/A for an empty value", () => {
    expect(formatTime(null)).toBe("N/A");
    expect(formatTime("")).toBe("N/A");
  });

  it("returns a short clock time for a valid ISO string", () => {
    expect(formatTime("2026-09-21T02:05:00.000Z")).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});

describe("formatPunctuality", () => {
  it("defaults to On Time (green) when nothing is recorded", () => {
    expect(formatPunctuality({})).toMatchObject({
      label: "On Time",
      classes: expect.stringContaining("emerald"),
    });
  });

  it("shows the minutes for LATE (rose) and EARLY (blue)", () => {
    expect(formatPunctuality({ punctualityStatus: "LATE", minutesEarlyOrLate: 12 })).toMatchObject({
      label: "12m late",
      classes: expect.stringContaining("rose"),
    });
    expect(formatPunctuality({ punctualityStatus: "EARLY", minutesEarlyOrLate: -7 })).toMatchObject(
      {
        label: "7m early",
        classes: expect.stringContaining("blue"),
      }
    );
  });

  it("falls back to a plain label when minutes are missing", () => {
    expect(formatPunctuality({ punctualityStatus: "LATE" }).label).toBe("Late");
    expect(formatPunctuality({ punctualityStatus: "EARLY" }).label).toBe("Early");
  });

  // The kiosk saves punctualityStatus as "On time" / "Late" / "Unscheduled" /
  // "Present" (features/attendance/punctuality.js + shiftsRepository.js). This
  // function looks for "LATE" / "EARLY" / "ON_TIME", so a late shift is shown as
  // a green "On Time" in the Manager overview. StaffDutyTab already accepts both
  // spellings. Expectation below is a proposal — open to challenge.
  it("shows a shift the kiosk saved as 'Late' as late (rose)", () => {
    const r = formatPunctuality({ punctualityStatus: "Late", minutesEarlyOrLate: -20 });
    expect(r.classes).toContain("rose");
    expect(r.label).toBe("20m late");
  });
});

describe("filterCourseDivision", () => {
  it("filters out items explicitly flagged as kindergarten", () => {
    const items = [
      { id: "1", name: "English 101", division: "courses" },
      { id: "2", name: "Kindy Phonics", division: "kindergarten" },
      { id: "3", name: "General Batch" },
    ];
    const filtered = filterCourseDivision(items);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("handles empty or non-array inputs safely", () => {
    expect(filterCourseDivision([])).toEqual([]);
    expect(filterCourseDivision(null)).toEqual([]);
    expect(filterCourseDivision(undefined)).toEqual([]);
  });
});

describe("computeBottleneckTotals", () => {
  it("computes accurate sums across pending leads, unplaced students, and class alerts", () => {
    const res = computeBottleneckTotals({
      pendingApplications: [{ id: "a1" }, { id: "a2" }],
      unenrolledStudents: [{ id: "s1" }],
      classesWithIssues: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
    });
    expect(res).toEqual({
      pendingCount: 2,
      unenrolledCount: 1,
      issuesCount: 3,
      total: 6,
    });
  });

  it("handles missing or undefined params safely", () => {
    const res = computeBottleneckTotals();
    expect(res).toEqual({
      pendingCount: 0,
      unenrolledCount: 0,
      issuesCount: 0,
      total: 0,
    });
  });
});

