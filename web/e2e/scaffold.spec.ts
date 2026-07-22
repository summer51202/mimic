import { expect, test } from "@playwright/test";

test("renders the scaffold home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "mimic" })).toBeVisible();
  await expect(
    page.getByText("Next.js web foundation is ready."),
  ).toBeVisible();
});
