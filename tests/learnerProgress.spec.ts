import { test, expect } from "@playwright/test";

test.describe("LearnerProgressTab Firestore Permission-Denied Failure Flow (FP-IL-17)", () => {
  test("deterministically simulates Firestore permission-denied error via test-environment mock, confirms alert replaces empty state, and clicking Retry invokes failed request again while leaving UI in error state", async ({
    page,
  }) => {
    // 1. Intercept the repository request at the network/module boundary in Playwright (test environment only).
    // This provides a deterministic simulation of Firestore's permission-denied rejection without adding test hooks to production code.
    await page.route("**/src/features/reports/reportsRepository.js*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          export async function fetchStudentProgressData(...args) {
            window.__getDocsCallCount = (window.__getDocsCallCount || 0) + 1;
            const err = new Error("FirebaseError: [code=permission-denied]: Missing or insufficient permissions.");
            err.code = "permission-denied";
            err.name = "FirebaseError";
            window.__lastErrorSimulated = err.message;
            throw err;
          }
        `,
      });
    });

    // 2. Navigate to the harness which renders the pure production LearnerProgressTab
    await page.goto("/tests/learner-progress-harness.html");

    // 3. Verify repository request was executed and rejected with deterministic Firestore permission-denied error
    await expect
      .poll(async () => page.evaluate(() => (window as any).__getDocsCallCount))
      .toBeGreaterThan(0);

    const simulatedError = await page.evaluate(() => (window as any).__lastErrorSimulated);
    expect(simulatedError).toBe(
      "FirebaseError: [code=permission-denied]: Missing or insufficient permissions."
    );

    // 4. Requirement 1: The learner progress error alert appears
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText("Failed to Load Learner Progress");
    await expect(alert).toContainText(
      "Unable to load learner progress records. Access may be restricted or a network error occurred."
    );

    // Negative assertion: Raw internal Firebase exception strings must NOT leak into the UI
    await expect(alert).not.toContainText("FirebaseError");
    await expect(alert).not.toContainText("permission-denied");
    await expect(alert).not.toContainText("Missing or insufficient permissions");

    // 5. Requirement 2: The misleading empty state and zero count do not appear (Denial-Looks-Like-Zero prevention)
    await expect(page.getByText("No enrolled learners match your filters.")).not.toBeVisible();
    await expect(page.getByText("0 Students in registry")).not.toBeVisible();
    await expect(page.getByText("Unable to load registry")).toBeVisible();

    // 6. Requirement 3: Clicking Retry invokes the failed request again and leaves the UI in the error state
    const retryBtn = page.getByRole("button", { name: /Retry Query/i });
    await expect(retryBtn).toBeVisible();

    const countBeforeRetry = await page.evaluate(() => (window as any).__getDocsCallCount);

    // Click the on-screen Retry Query button
    await retryBtn.click();

    // Verify repository query was dispatched again upon retry
    await expect
      .poll(async () => page.evaluate(() => (window as any).__getDocsCallCount))
      .toBeGreaterThan(countBeforeRetry);

    // Confirm that because the query rejected again with permission-denied, the UI remains safely in error state
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Failed to Load Learner Progress");
    await expect(alert).toContainText(
      "Unable to load learner progress records. Access may be restricted or a network error occurred."
    );

    // Empty state and false zero count must still not appear
    await expect(page.getByText("No enrolled learners match your filters.")).not.toBeVisible();
    await expect(page.getByText("0 Students in registry")).not.toBeVisible();
    await expect(page.getByText("Unable to load registry")).toBeVisible();
  });
});
