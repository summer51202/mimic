import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const reviewRoot = path.resolve(
  process.cwd(),
  "..",
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);

test("Avatar / Classes evidence remains usable at every viewport", async ({
  page,
}, testInfo) => {
  await installReviewRoutes(page);
  await page.goto(
    "https://avatar-classes-review.local/avatar-classes-review.html",
  );

  const expectedWidths: Record<string, number> = {
    "phone-small": 320,
    "phone-390": 390,
    tablet: 768,
    desktop: 1440,
  };
  expect(page.viewportSize()?.width).toBe(expectedWidths[testInfo.project.name]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Avatar / Classes character family",
  );
  await expect(page.locator("[data-character]")).toHaveCount(8);
  await expect(page.locator("[data-reference]")).toHaveCount(8);
  await expect(page.locator("[data-master]")).toHaveCount(8);
  await expect(page.locator("[data-lineage-master]")).toHaveCount(8);
  await expect(page.locator("[data-reference-filename]")).toHaveCount(8);
  await expect(page.locator('[data-optical-size="128"]')).toHaveCount(8);
  await expect(page.locator('[data-optical-size="64"]')).toHaveCount(8);
  await expect(page.locator("[data-grayscale-preview]")).toHaveCount(8);
  await expect(page.locator("[data-silhouette-preview]")).toHaveCount(8);
  await expect(
    page.getByText("approved visual calibration", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("no runtime asset changes", { exact: false }).first(),
  ).toBeVisible();
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
  });
  await expectNoHorizontalOverflow(page);
});

async function installReviewRoutes(page: Page) {
  await page.route("https://avatar-classes-review.local/**", async (route) => {
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
          : filename.endsWith(".png")
            ? "image/png"
            : "application/octet-stream",
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
    offenders: [...document.querySelectorAll("*")]
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).replaceAll(" ", ".")}` : ""}`,
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }))
      .filter(
        ({ left, right }) =>
          left < 0 || right > document.documentElement.clientWidth,
      )
      .slice(0, 12),
    internalOverflow: [...document.querySelectorAll("*")]
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).replaceAll(" ", ".")}` : ""}`,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }))
      .filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth)
      .slice(0, 12),
  }));
  const diagnostics = JSON.stringify({
    offenders: overflow.offenders,
    internalOverflow: overflow.internalOverflow,
  });
  expect(overflow.body, diagnostics).toBeLessThanOrEqual(0);
  expect(overflow.document, diagnostics).toBeLessThanOrEqual(0);
}
