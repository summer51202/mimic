import { expect, test } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("reviews both frames at matched scale and switches all eight classes", async ({ page }) => {
  const file = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/home-base-v02-review.html");
  await page.goto(pathToFileURL(file).href);
  const current = page.locator('[data-version="v02"]');
  await expect(current).toHaveCount(2);
  await expect(page.locator(".proof svg")).toHaveCount(8);
  for (const id of ["warrior","mage","ranger","rogue","physician","bard","alchemist","cartographer"]) {
    await page.locator("#avatar").selectOption(id);
    await expect(current.locator(".avatar:visible")).toHaveCount(2);
    await expect(current.locator('[data-avatar="' + id + '"]:visible')).toHaveCount(2);
  }
  await expect(page.locator(".wall")).toBeHidden();
  await page.locator("#wall").check();
  await expect(page.locator(".wall")).toBeVisible();
  await page.locator("#wall").uncheck();
  await expect(page.locator(".wall")).toBeHidden();
  await page.locator("#guides").check();
  await expect(current.locator(".zone:visible")).toHaveCount(6);
  await page.locator("#guides").uncheck();
  await expect(current.locator(".zone:visible")).toHaveCount(0);
  await page.locator("#gray").check();
  await expect(current.locator(".background").first()).toHaveCSS("filter", "grayscale(1)");
  const layout = await page.locator(".triptych").evaluateAll(rows =>
    rows.map(row => Array.from(row.querySelectorAll("img.background"), image => image.getBoundingClientRect().width)));
  expect(layout.every(widths => widths.length === 3 && Math.max(...widths) - Math.min(...widths) <= 0.03)).toBe(true);
  expect(await page.locator("img").evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => innerWidth));
});
