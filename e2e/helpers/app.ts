import { expect, type Page } from "@playwright/test";

export const SEEDED_PATIENT_IDS = {
  accepted: "00000000-0000-0000-0000-000000000101",
  blocked: "00000000-0000-0000-0000-000000000102",
} as const;

export async function loginAsDemo(page: Page) {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Continue as Demo Coordinator/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Referral Acceptance Workspace")).toBeVisible();
}
