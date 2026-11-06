import { expect, test } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("applied prop scenes and review overlays", async ({ page }) => {
  const file = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-prop-placement-application-review.html");
  await page.goto(pathToFileURL(file).href);
  const scenes = page.locator(".scene");
  await expect(scenes).toHaveCount(3);
  expect(await page.locator("img").evaluateAll(images => images.every(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const guides = page.locator(".guides");
  await expect(guides.first()).toBeHidden();
  await page.getByRole("checkbox", { name: "顯示對話框與警示" }).check();
  for (const guide of await guides.all()) await expect(guide).toBeVisible();
  await page.getByRole("checkbox", { name: "顯示對話框與警示" }).uncheck();
  await expect(guides.last()).toBeHidden();
});
