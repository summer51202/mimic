import { expect, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    hiddenGlobally:
      getComputedStyle(document.body).overflowX === "hidden" ||
      getComputedStyle(document.documentElement).overflowX === "hidden",
  }));

  expect(overflow.body).toBeLessThanOrEqual(0);
  expect(overflow.document).toBeLessThanOrEqual(0);
  expect(overflow.hiddenGlobally).toBeFalsy();
}

test("pixel public shell remains responsive and raster sharp", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { level: 1, name: "mimic", exact: true });
  await expect(heading).toHaveAccessibleName("mimic");
  await expect(page.locator('[data-layer="wordmark"]:visible')).toHaveAttribute("aria-hidden", "true");
  await expectNoHorizontalOverflow(page);

  const architecture = page.locator('[data-layer="architecture"]:visible');
  await expect(architecture).toHaveCount(1);
  const rendering = await page.evaluate(() => {
    const headerHeight = document.querySelector("header")!.getBoundingClientRect().height;
    const desktop = window.matchMedia("(min-width: 760px)").matches;
    const shrinks = document.documentElement.clientWidth < 960
      || window.innerHeight - headerHeight < 540;
    return desktop && shrinks ? "auto" : "pixelated";
  });
  await expect(architecture).toHaveCSS("image-rendering", rendering);
  await expect(architecture).toHaveCSS(
    "background-image",
    /\/pixel-ui\/v1\/scenes\/landing\/(desktop|phone)-architecture\.png/,
  );

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
