import { test, expect } from "@playwright/test";

test.describe("Staff Attendance Self-Service & ProfilePanel Verification (OD-STF-01)", () => {
  test("starts collapsed, fetches records on expand, does not refetch on collapse/reopen, and hides from non-staff", async ({
    page,
  }) => {
    // 1. Open the harness page
    await page.goto("/tests/attendance-harness.html");

    // Verify staff profile input is loaded
    await expect(page.locator('input[type="text"]').first()).toHaveValue("Kifri Operational Leader");

    // 2. Practical Check: Confirm shift section starts collapsed by default
    const toggleBtn = page.locator('[data-testid="toggle-personal-attendance"]');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    const shiftPanel = page.locator('[data-testid="personal-attendance-panel"]');
    await expect(shiftPanel).not.toBeVisible();

    // Confirm no queries dispatched while collapsed
    let fetchCount = await page.evaluate(() => (window as any).__fetchCount);
    expect(fetchCount).toBe(0);

    // 3. Practical Check: Expand section and confirm records load on demand
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    await expect(shiftPanel).toBeVisible();

    // Confirm shift items render
    const shiftItems = page.locator('[data-testid="personal-shift-item"]');
    await expect(shiftItems).toHaveCount(2);

    // Verify attendance details rendered (WITA times, duration, status badges)
    await expect(page.getByText("Completed")).toBeVisible();
    await expect(page.getByText("Active Shift")).toBeVisible();
    await expect(page.getByText("Station: kiosk-01")).toBeVisible();

    // Negative assertion: Verify cashier reconciliation fields are strictly absent from display
    const pageText = await page.content();
    expect(pageText).not.toContain("cashReconciliation");
    expect(pageText).not.toContain("drawerCount");
    expect(pageText).not.toContain("750000");
    expect(pageText).not.toContain("750.000");

    // Confirm mock fetch was called exactly once with expected UID and bounded limit
    fetchCount = await page.evaluate(() => (window as any).__fetchCount);
    expect(fetchCount).toBe(1);

    const fetchedUid = await page.evaluate(() => (window as any).__lastFetchedUid);
    const fetchedLimit = await page.evaluate(() => (window as any).__lastFetchedLimit);
    expect(fetchedUid).toBe("staff-ops-123");
    expect(fetchedLimit).toBe(15);

    // 4. Practical Check: Collapse and confirm it closes
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    await expect(shiftPanel).not.toBeVisible();

    // Confirm fetch count remained 1 (no fetch on collapse)
    fetchCount = await page.evaluate(() => (window as any).__fetchCount);
    expect(fetchCount).toBe(1);

    // 5. Practical Check: Reopen and confirm it does NOT fetch again unnecessarily
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    await expect(shiftPanel).toBeVisible();
    await expect(shiftItems).toHaveCount(2);

    // Confirm cached results used and fetch count is STILL 1
    fetchCount = await page.evaluate(() => (window as any).__fetchCount);
    expect(fetchCount).toBe(1);

    // 6. Role Scope Gating: Switch to Student profile and confirm section is omitted
    const studentBtn = page.locator('[data-testid="switch-to-student"]');
    await studentBtn.click();

    await expect(page.locator('input[type="text"]').first()).toHaveValue("Student Learner");
    await expect(toggleBtn).not.toBeVisible();
    await expect(page.getByText("My Attendance & Shifts")).not.toBeVisible();
  });
});
