import { expect, type Page, test } from "@playwright/test";

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

test("pixel public shell remains responsive and raster sharp", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "mimic" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const heroImage = page.locator("img.pixel-art").first();
  await expect(heroImage).toBeVisible();
  await expect(heroImage).toHaveCSS("image-rendering", /pixelated|crisp-edges/);

  await page.keyboard.press("Tab");
  const focusedOutline = await page.evaluate(() => {
    const element = document.activeElement;
    return element ? getComputedStyle(element).outlineStyle : "";
  });
  expect(focusedOutline).not.toBe("none");

  await page.screenshot({
    path: testInfo.outputPath(`pixel-public-${testInfo.project.name}.png`),
    fullPage: false,
  });
});

test("login return to invite survives keyboard-only navigation", async ({ page }) => {
  await page.goto("/invite/abcDEF123_-4");

  await page.getByRole("link", { name: "Log in to accept" }).focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(
    /\/login\?returnTo=%2Finvite%2FabcDEF123_-4$/,
  );
});
