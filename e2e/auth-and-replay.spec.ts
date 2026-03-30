import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/app";

test("redirects unauthenticated /app visits to auth", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("supports replay mode without authentication", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /View Demo Replay/i }).click();

  await expect(page).toHaveURL(/\/replay\/accepted$/);
  await expect(page.getByText("Replay Mode")).toBeVisible();
  await expect(page.getByText("Accepted by Nephrology Intake")).toBeVisible();
});

test("demo login opens the workspace", async ({ page }) => {
  await loginAsDemo(page);
  await expect(page.getByText("Recent Referral Runs")).toBeVisible();
});
