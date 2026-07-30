import { expect, type Page, test } from "@playwright/test";

const tagline = "一起存，一起花，一起在異世界探險吧!";
const viewports = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

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

test.describe("public identity and auth entry", () => {
  for (const viewport of viewports) {
    test(`renders mimic without overflow at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      await expect(
        page.getByRole("heading", { level: 1, name: "mimic" }),
      ).toBeVisible();
      await expect(page.getByText(tagline, { exact: true })).toBeVisible();

      const registerCta = page.locator('a[href="/register"]').first();
      await expect(registerCta).toBeVisible();
      await expect(registerCta).toBeEnabled();

      await expectNoHorizontalOverflow(page);

      const nextSection = page.locator("#features");
      const bounds = await nextSection.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThan(0);
      expect(bounds!.y).toBeLessThan(viewport.height);
      expect(bounds!.y + bounds!.height).toBeGreaterThan(viewport.height);

      await page.screenshot({
        path: testInfo.outputPath(`home-${viewport.name}.png`),
        fullPage: false,
      });
    });
  }

  test("redirects protected app routes without a session", async ({ page }) => {
    const response = await page.goto("/app");

    expect(response?.url()).toContain("/login?returnTo=%2Fapp");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp$/);
  });

  test("does not leave private route or API responses in Cache Storage", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(async () => {
      for (const name of await caches.keys()) {
        await caches.delete(name);
      }
    });

    await page.goto("/app");
    await page.evaluate(async () => {
      await fetch("/api/auth/csrf", { credentials: "include" });
    });

    const cachedRequests = await page.evaluate(async () => {
      const entries: string[] = [];

      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        entries.push(...requests.map((request) => request.url));
      }

      return entries;
    });

    expect(cachedRequests).not.toContainEqual(
      expect.stringMatching(/\/(?:api|app|invite)(?:\/|$)/),
    );
  });
});
