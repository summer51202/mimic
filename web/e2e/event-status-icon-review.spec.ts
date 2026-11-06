import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const reviewRoot = path.resolve(
  process.cwd(),
  "..",
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);

test("event and status review remains complete at every project viewport", async ({
  page,
}, testInfo) => {
  await installReviewRoutes(page);
  await page.goto("https://event-status-review.local/event-status-icons-review.html");

  const expectedWidths: Record<string, number> = {
    "phone-small": 320,
    phone: 390,
    tablet: 768,
    desktop: 1440,
  };
  expect(page.viewportSize()?.width).toBe(expectedWidths[testInfo.project.name]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Event / Status icons",
  );
  await expect(page.locator("[data-icon]")).toHaveCount(9);
  await expect(page.locator('[data-decision="approved"]')).toHaveCount(9);
  await expect(page.locator('[data-preview-size="48"]')).toHaveCount(9);
  await expect(page.locator("[data-grayscale-preview]")).toHaveCount(9);
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
  });
  await expectNoHorizontalOverflow(page);
});

async function installReviewRoutes(page: Page) {
  await page.route("https://event-status-review.local/**", async (route) => {
    const url = new URL(route.request().url());
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const filename = path.resolve(reviewRoot, relativePath);
    if (!filename.startsWith(`${reviewRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }
    try {
      await route.fulfill({
        status: 200,
        body: await readFile(filename),
        contentType: filename.endsWith(".html")
          ? "text/html; charset=utf-8"
          : filename.endsWith(".png") ? "image/png" : "application/octet-stream",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await route.fulfill({ status: 404, body: "Not found" });
        return;
      }
      throw error;
    }
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(0);
  expect(overflow.document).toBeLessThanOrEqual(0);
}
