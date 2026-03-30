import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers/app";

test("creates and edits a patient record", async ({ page }) => {
  await loginAsDemo(page);

  await page.getByTestId("create-patient-trigger").click();
  await page.getByLabel("Full Name *").fill("Integration Patient");
  await page.getByLabel("Date of Birth").fill("1980-01-01");
  await page.getByLabel("MRN").fill("MRN-INTEGRATION-1");
  await page.getByPlaceholder("e.g. Type 2 diabetes").fill("Type 2 Diabetes");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByTestId("create-patient-submit").click();

  await expect(page.getByText("Patient created")).toBeVisible();
  await expect(page.getByText("Integration Patient")).toBeVisible();

  await page.getByText("Integration Patient").click();
  await expect(page.getByRole("heading", { name: "Integration Patient" })).toBeVisible();

  await page.getByRole("button", { name: /Edit/i }).click();
  await page.getByLabel("Full Name *").fill("Integration Patient Updated");
  await page.getByTestId("edit-patient-submit").click();

  await expect(page.getByText("Patient updated")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Integration Patient Updated" })).toBeVisible();
});
