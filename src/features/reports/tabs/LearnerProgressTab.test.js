import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LearnerProgressTab, { USER_SAFE_PROGRESS_ERROR_MESSAGE } from "./LearnerProgressTab";

vi.mock("../reportsRepository", () => ({
  fetchStudentProgressData: vi.fn(),
}));

/**
 * LearnerProgressTab Test Suite
 *
 * NOTE ON TEST ENVIRONMENT & STATIC RENDERING LIMITATIONS:
 * The Vitest test suite runs in a Node environment ('environment: node' in vitest.config.js)
 * without a browser DOM (neither jsdom nor happy-dom is installed).
 *
 * In this environment, 'renderToStaticMarkup' only executes the synchronous initial render pass:
 * 1. React lifecycles ('useEffect') do NOT run during server-side string rendering.
 * 2. State transitions ('useState' setters) and asynchronous repository resolutions/rejections
 *    cannot trigger re-renders or DOM mutations in static markup.
 * 3. Synthetic DOM events (such as clicking the 'Retry Query' button) cannot be dispatched.
 *
 * Rather than expanding the component's public interface with artificial test-only props
 * (e.g. initialLoading, initialError, onFetchError) or mutating ref.current during render,
 * this suite verifies the static contract, clean props interface, and safe error constants.
 * End-to-end interactive state transitions require an interactive browser environment (e.g. Playwright).
 */
describe("LearnerProgressTab Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a generic, user-safe error message constant", () => {
    expect(USER_SAFE_PROGRESS_ERROR_MESSAGE).toBe(
      "Unable to load learner progress records. Access may be restricted or a network error occurred."
    );
    // Must NOT contain technical jargon or raw error strings
    expect(USER_SAFE_PROGRESS_ERROR_MESSAGE).not.toContain("FirebaseError");
    expect(USER_SAFE_PROGRESS_ERROR_MESSAGE).not.toContain("403");
    expect(USER_SAFE_PROGRESS_ERROR_MESSAGE).not.toContain("permission-denied");
  });

  it("renders initial loading state cleanly on static markup mount", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearnerProgressTab, {
        branchFilter: "all",
        rangeDays: 30,
        isAdminView: false,
        isSupervisor: false,
        isFrontOffice: false,
        isManager: false,
        division: "all",
      })
    );

    // Initial server render shows the loading state
    expect(html).toContain("Querying student registry &amp; progress records...");
    expect(html).toContain("Learner Attendance, Health &amp; Evaluation Archives");
    expect(html).toContain("Search by student name...");

    // Neither error alert nor empty state is rendered during loading
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("Failed to Load Learner Progress");
    expect(html).not.toContain("No enrolled learners match your filters.");
  });

  it("renders with custom branch and horizon props without throwing", () => {
    const html = renderToStaticMarkup(
      React.createElement(LearnerProgressTab, {
        branchFilter: "Kota Gorontalo",
        rangeDays: 90,
        division: "courses",
        isSupervisor: true,
      })
    );

    expect(html).toContain("Learner Attendance, Health &amp; Evaluation Archives");
    expect(html).toContain("Querying student registry &amp; progress records...");
  });
});

