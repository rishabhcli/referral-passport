import { expect, test } from "@playwright/test";
import { SEEDED_PATIENT_IDS, loginAsDemo } from "./helpers/app";

test("repairs the accepted-path seeded patient into an accepted referral", async ({ page }) => {
  await loginAsDemo(page);

  await page.getByTestId(`patient-link-${SEEDED_PATIENT_IDS.accepted}`).click();
  await page.getByRole("button", { name: /Start Consult Passport/i }).click();
  await page.getByTestId("build-submit").click();

  await expect(page.getByText(/input required/i)).toBeVisible();
  await page.getByTestId("repair-run").click();

  await expect(page.getByText("Accepted by Nephrology Intake")).toBeVisible();
});

test("repairs the blocked-path seeded patient into a blocked referral", async ({ page }) => {
  await loginAsDemo(page);

  await page.getByTestId(`patient-link-${SEEDED_PATIENT_IDS.blocked}`).click();
  await page.getByRole("button", { name: /Start Consult Passport/i }).click();
  await page.getByTestId("build-submit").click();

  await expect(page.getByText(/input required/i)).toBeVisible();
  await page.getByTestId("repair-run").click();

  await expect(page.getByText(/Blocked .* Manual Follow-up Required/i)).toBeVisible();
});
