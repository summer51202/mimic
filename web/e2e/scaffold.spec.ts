import { expect, test } from "@playwright/test";

test("renders the scaffold home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "mimic" })).toBeVisible();
  await expect(
    page.getByText("一起存，一起花，一起在異世界探險吧!", { exact: true }),
  ).toBeVisible();
});
