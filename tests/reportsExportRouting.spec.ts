import { test, expect } from "@playwright/test";

test.describe("Instructor Leader Reports Export Routing (Real Browser Interaction)", () => {
  test("exercises active sub-tab export routing via real browser button clicks across all four sub-tabs", async ({
    page,
  }) => {
    // Intercept tabs index module to supply clean sub-tab mocks exposing exportCSV through refs
    await page.route(
      (url) => url.pathname.includes("/features/reports/tabs/index.js"),
      async (route) => {
        await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          const React = window.React;

          export const InstructorPunctualityTab = React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({
              exportCSV: () => { window.__exportCalls.instructors += 1; },
            }));
            return React.createElement("div", { "data-testid": "tab-instructors" }, "InstructorPunctualityTab Mock");
          });

          export const TodayTab = React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({
              exportCSV: () => { window.__exportCalls.today += 1; },
            }));
            return React.createElement("div", { "data-testid": "tab-today" }, "TodayTab Mock");
          });

          export const StaffDutyTab = React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({
              exportCSV: () => { window.__exportCalls.staff += 1; },
            }));
            return React.createElement("div", { "data-testid": "tab-staff" }, "StaffDutyTab Mock");
          });

          export const LearnerProgressTab = React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({
              exportCSV: () => { window.__exportCalls.students += 1; },
            }));
            return React.createElement("div", { "data-testid": "tab-students" }, "LearnerProgressTab Mock");
          });

          export const AdmissionsTab = React.forwardRef((props, ref) => {
            return React.createElement("div", { "data-testid": "tab-admissions" }, "AdmissionsTab Mock");
          });

          export const FinancialReportsTab = React.forwardRef((props, ref) => {
            return React.createElement("div", { "data-testid": "tab-finance" }, "FinancialReportsTab Mock");
          });
        `,
      });
    });

    // 1. Opens Reports as an Instructor Leader, where My Punctuality is the default.
    await page.goto("/tests/reports-export-routing-harness.html");

    // Wait for the cockpit header to render
    await expect(page.getByText("Institutional Reports & Analytics")).toBeVisible();
    await expect(page.getByTestId("tab-instructors")).toBeVisible();

    const exportBtn = page.getByRole("button", { name: /Export CSV Dataset/i });
    await expect(exportBtn).toBeVisible();

    // Verify initial clean state: 0 calls
    let exportCalls = await page.evaluate(() => (window as any).__exportCalls);
    expect(exportCalls).toEqual({
      instructors: 0,
      today: 0,
      staff: 0,
      students: 0,
    });

    // 2. Clicks Export CSV Dataset and confirms only the punctuality handler is called.
    await exportBtn.click();

    exportCalls = await page.evaluate(() => (window as any).__exportCalls);
    expect(exportCalls).toEqual({
      instructors: 1,
      today: 0,
      staff: 0,
      students: 0,
    });

    // 3a. Selects Today's Check-ins and clicks export.
    const todayTabBtn = page.getByRole("button", { name: /Today's Check-ins/i });
    await todayTabBtn.click();
    await expect(page.getByTestId("tab-today")).toBeVisible();

    await exportBtn.click();

    exportCalls = await page.evaluate(() => (window as any).__exportCalls);
    expect(exportCalls).toEqual({
      instructors: 1,
      today: 1,
      staff: 0,
      students: 0,
    });

    // 3b. Selects My Duty Log and clicks export.
    const staffTabBtn = page.getByRole("button", { name: /My Duty Log/i });
    await staffTabBtn.click();
    await expect(page.getByTestId("tab-staff")).toBeVisible();

    await exportBtn.click();

    exportCalls = await page.evaluate(() => (window as any).__exportCalls);
    expect(exportCalls).toEqual({
      instructors: 1,
      today: 1,
      staff: 1,
      students: 0,
    });

    // 3c. Selects Learner Progress and clicks export.
    const studentsTabBtn = page.getByRole("button", { name: /Learner Progress/i });
    await studentsTabBtn.click();
    await expect(page.getByTestId("tab-students")).toBeVisible();

    await exportBtn.click();

    // 4. Confirms each click calls only the active sub-tab's handler, exactly once.
    exportCalls = await page.evaluate(() => (window as any).__exportCalls);
    expect(exportCalls).toEqual({
      instructors: 1,
      today: 1,
      staff: 1,
      students: 1,
    });
  });
});
