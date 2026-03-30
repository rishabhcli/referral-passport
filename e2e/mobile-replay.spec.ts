import { expect, test } from "@playwright/test";

test("renders the replay page on the mobile smoke project", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "mobile smoke only");

  await page.goto("/replay/blocked");

  await expect(page.getByText("Replay Mode")).toBeVisible();
  await expect(page.getByText(/Blocked .* Manual Follow-up Required/i)).toBeVisible();
});
