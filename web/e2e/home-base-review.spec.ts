// @vitest-environment node
import { expect, test } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("reviews both frames with shared avatar, guide and grayscale controls", async ({ page }) => {
  const dir = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
  await page.goto(pathToFileURL(path.join(dir, "home-base-review.html")).href);
  await expect(page.locator(".pair")).toHaveCount(2);
  const scenes = page.locator(".scene");
  await expect(scenes.locator(".warrior:visible")).toHaveCount(2);
  for (const id of ["mage", "ranger", "warrior"]) {
    await page.locator("#" + id).check();
    await expect(scenes.locator(".avatar:visible")).toHaveCount(2);
    await expect(scenes.locator("." + id + ":visible")).toHaveCount(2);
  }
  await expect(scenes.locator(".zone:visible")).toHaveCount(6);
  await page.locator("#guides").uncheck();
  await expect(scenes.locator(".zone:visible")).toHaveCount(0);
  await page.locator("#gray").check();
  await expect(page.locator(".background").first()).toHaveCSS("filter", "grayscale(1)");
  const sizes = await page.locator("img").evaluateAll(images => images.map(image => (image as HTMLImageElement).naturalWidth));
  expect(sizes.every(width => width > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => innerWidth));
});
