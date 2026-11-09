import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const reviewRoot = path.resolve(
  process.cwd(),
  "..",
  "docs",
  "design",
  "assets",
  "reviews",
  "2026-09-18-page-visual-phase-1",
);
const dialogueSentence = "咪咪庫已整理好今天的冒險紀錄。";

test("motion calibration plays one primary sequence and supports skip", async ({
  page,
}) => {
  await installReviewRoutes(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("https://asset-review.local/samples/motion-calibration.html");

  await expect(
    page.getByRole("heading", { name: "Motion calibration" }),
  ).toBeVisible();
  expect(await runningPrimaryCount(page)).toBeLessThanOrEqual(1);

  const action = page.locator('[data-motion-example="action-once"]');
  const playAction = action.getByRole("button", { name: "Play action" });
  await playAction.click();
  await expect(action).toHaveAttribute("data-state", "running");
  await expect(playAction).toBeFocused();
  expect(await runningPrimaryCount(page)).toBe(1);
  const actionUrl = page.url();
  await expect(action).toHaveAttribute("data-state", "final", {
    timeout: 3_000,
  });
  expect(page.url()).toBe(actionUrl);

  const celebration = page.locator(
    '[data-motion-example="celebration-once"]',
  );
  const playCelebration = celebration.getByRole("button", {
    name: "Play celebration",
  });
  const skip = celebration.getByRole("button", { name: "Skip celebration" });
  await playCelebration.click();
  await expect(celebration).toHaveAttribute("data-state", "running");
  expect(await runningPrimaryCount(page)).toBe(1);
  await skip.click();
  await expect(celebration).toHaveAttribute("data-state", "final");

  await playCelebration.click();
  await expect(celebration).toHaveAttribute("data-state", "running");
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(celebration).toHaveAttribute("data-state", "final");
  expect(await runningPrimaryCount(page)).toBe(0);

  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText(dialogueSentence);
  await expectNoHorizontalOverflow(page);
});

test("reduced motion exposes every final state without animation", async ({
  page,
}) => {
  await installReviewRoutes(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("https://asset-review.local/samples/motion-calibration.html");

  const examples = page.locator("[data-motion-example]");
  await expect(examples).toHaveCount(5);
  const animationNames = await examples.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).animationName),
  );
  expect(animationNames).toEqual(Array(5).fill("none"));
  await expect(
    page.locator('[data-motion-example="typewriter-final"] [aria-hidden="true"]'),
  ).toHaveText(dialogueSentence);
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText(dialogueSentence);
  expect(await runningPrimaryCount(page)).toBe(0);
  await expectNoHorizontalOverflow(page);
});

test("review index is deterministic at the native project viewport", async ({
  page,
}, testInfo) => {
  await installReviewRoutes(page);
  await page.goto("https://asset-review.local/review-index.html");

  const expectedWidths: Record<string, number> = {
    "phone-small": 320,
    phone: 390,
    tablet: 768,
    desktop: 1440,
  };
  expect(page.viewportSize()?.width).toBe(expectedWidths[testInfo.project.name]);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Page Visual Phase 1 calibration",
    }),
  ).toBeVisible();
  await expect(page.locator("main > [data-family]")).toHaveCount(8);
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
  });
  await expectNoHorizontalOverflow(page);

  await expect(page.getByRole("link", { name: "Gate B · Complete-family contrast and fallback review" }))
    .toHaveAttribute("href", "gate-b-composites.html");
  await expect(page).toHaveScreenshot(
    `asset-style-gate-${testInfo.project.name}.png`,
    {
      animations: "disabled",
      fullPage: true,
    },
  );
});

test("Gate B composites keep the same layout and live fallback for each failed family", async ({ page }, testInfo) => {
  const repository = path.resolve(process.cwd(), "..");
  const origin = "https://gate-b.local";
  const reviewPage = path.relative(repository, path.join(reviewRoot, "gate-b-composites.html")).split(path.sep).join("/");
  let failedAsset: string | undefined;
  let aborts = 0;
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === failedAsset) {
      aborts++;
      await route.abort("failed");
      return;
    }
    const filename = path.resolve(repository, "." + url.pathname);
    if (!filename.startsWith(repository + path.sep)) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.fulfill({ path: filename });
  });
  const open = () => page.goto(`${origin}/${reviewPage}`);
  await open();
  const samples = page.locator("main img");
  await expect(samples).toHaveCount(32);
  await samples.evaluateAll((images) => Promise.all(images.map((img) => (img as HTMLImageElement).decode())));
  await expectNoHorizontalOverflow(page);
  const contrast = await page.locator("[data-surface]").evaluateAll((surfaces) => {
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map((part) => {
      const channel = Number(part) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const ratio = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((left, right) => right - left);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    return surfaces.map((surface) => {
      const background = getComputedStyle(surface).backgroundColor;
      const card = getComputedStyle(surface.querySelector("article")!);
      return {
        surface: (surface as HTMLElement).dataset.surface,
        background, label: card.color, boundary: card.borderTopColor,
        text: ratio(card.color, background),
        border: ratio(card.borderTopColor, background),
      };
    });
  });
  expect(contrast).toHaveLength(4);
  for (const { text, border, surface } of contrast) {
    expect(text, surface).toBeGreaterThanOrEqual(4.5);
    expect(border, surface).toBeGreaterThanOrEqual(3);
  }
  await testInfo.attach("contrast-ratios", { body: JSON.stringify(contrast, null, 2), contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("gate-b-composites.png"), fullPage: true });
  const cards = page.locator("[data-surface=navy] article");
  const baseline = await cards.evaluateAll((nodes) => nodes.map((node) => ({
    family: (node as HTMLElement).dataset.family,
    asset: new URL((node.querySelector("img") as HTMLImageElement).src).pathname,
    text: node.querySelector("p")!.textContent,
    height: node.getBoundingClientRect().height,
  })));
  for (const { family, asset, text, height } of baseline) {
    failedAsset = asset;
    aborts = 0;
    await open();
    const familyCards = page.locator(`[data-family="${family}"]`);
    await expect(familyCards).toHaveCount(4);
    for (const card of await familyCards.all()) {
      await expect(card.getByRole("heading")).toBeVisible();
      await expect(card.locator("p")).toHaveText(text!);
      await expect(card.getByText("Image unavailable")).toBeVisible();
      await expect(card.locator("img")).toHaveAttribute("alt", "");
      await expect(card.locator("img")).toBeHidden();
    }
    expect(aborts).toBeGreaterThan(0);
    expect((await familyCards.first().boundingBox())?.height).toBe(height);
    await expectNoHorizontalOverflow(page);
    await familyCards.first().screenshot({ path: testInfo.outputPath(`fallback-${family}.png`) });
  }
});

test("a broken sample keeps its live review boundary visible", async ({ page }) => {
  await installReviewRoutes(page, "samples/icons-calibration.png");
  await page.goto("https://asset-review.local/review-index.html");

  const family = page.locator('[data-family="icons"]');
  await expect(family.getByRole("heading", { name: "Icons" })).toBeVisible();
  await expect(family.locator("[data-family-description]")).toBeVisible();
  await expect(family.locator("[data-review-status]")).toHaveText(
    "Sample unavailable — review live boundaries and fallback.",
  );
  await expect(family.locator("[data-fallback]")).toBeVisible();

  const [familyBox, fallbackBox] = await Promise.all([
    family.boundingBox(),
    family.locator("[data-fallback]").boundingBox(),
  ]);
  expect(familyBox).not.toBeNull();
  expect(fallbackBox).not.toBeNull();
  expect(fallbackBox!.width).toBeLessThanOrEqual(familyBox!.width);
  expect(fallbackBox!.height).toBeGreaterThan(0);
  await expectNoHorizontalOverflow(page);
});

async function installReviewRoutes(page: Page, abortedPath?: string) {
  await page.route("https://asset-review.local/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const filename = path.resolve(reviewRoot, relativePath);

    if (relativePath === abortedPath) {
      await route.abort("failed");
      return;
    }

    if (!filename.startsWith(`${reviewRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }

    try {
      const body = await readFile(filename);
      await route.fulfill({
        status: 200,
        body,
        contentType: contentTypeFor(filename),
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

function contentTypeFor(filename: string): string {
  if (filename.endsWith(".html")) return "text/html; charset=utf-8";
  if (filename.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function runningPrimaryCount(page: Page): Promise<number> {
  return page.locator('[data-primary-animation="running"]').count();
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
