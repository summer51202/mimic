import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import approved from "../../docs/design/assets/approved/page-visual-v1/production-asset-manifest.json";
import { requireBackend, signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

const viewports = [[360, 780], [390, 844], [430, 932], [768, 1024], [1024, 768],
  [1280, 720], [1440, 900], [1920, 1080]] as const;
const items = [
  ["首頁", "nav-home", "/app"],
  ["我的寶箱", "nav-adventure-log", "/app/personal"],
  ["共同群組", "nav-guild", "/app/groups"],
  ["任務", "nav-tasks", "/app/tasks"],
  ["設定", "nav-settings", "/app/settings"],
] as const;
const dark = "rgb(33, 26, 24)";
const raised = "rgb(58, 44, 36)";
const edge = "rgb(183, 149, 86)";
const text = "rgb(240, 223, 196)";
const speaker = "rgb(188, 155, 101)";
const iconRoot = "/pixel-ui/v1/icons/";
const navigationName = "Primary app sections";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "Explicit viewport and DPR matrix.");
});

function requireLocalRuntime() {
  for (const url of [process.env.MIMIC_API_BASE_URL, process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL]) {
    if (!url || new URL(url).hostname !== "127.0.0.1") {
      throw new Error("Phase 2D requires a dedicated 127.0.0.1 API and database.");
    }
  }
  return requireBackend();
}

async function verifyIcon(link: Locator, name: string, size: number, rendering: string, failed = false) {
  const icon = link.locator("img");
  await expect.poll(() => icon.evaluate((image: HTMLImageElement) => {
    const url = new URL(image.src);
    return url.origin === location.origin ? url.pathname : url.href;
  })).toBe(`${iconRoot}ui/${name}.png`);
  await expect(icon).toHaveAttribute("alt", "");
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  await expect(icon).toHaveAttribute("width", String(size));
  await expect(icon).toHaveAttribute("height", String(size));
  await expect(icon).toHaveCSS("width", `${size}px`);
  await expect(icon).toHaveCSS("height", `${size}px`);
  await expect(icon).toHaveCSS("image-rendering", rendering);
  if (failed) {
    await expect(icon).toHaveCSS("visibility", "hidden");
  } else {
    await expect.poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(48);
  }
}

async function checkFocus(page: Page, nav: Locator) {
  const first = nav.getByRole("link", { name: items[0][0], exact: true });
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press("Tab");
    if (await first.evaluate((element) => element === document.activeElement)) break;
  }
  for (const [index, [label]] of items.entries()) {
    if (index) await page.keyboard.press("Tab");
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-color", "rgb(47, 130, 214)");
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("outline-width", "3px");
    await expect(link).toHaveCSS("outline-offset", "-3px");
    await expect(link).toBeInViewport({ ratio: 1 });
  }
}

for (const [width, height] of viewports) {
  test(`${width}x${height} navigation at DPR 1, 2 and 3`, async ({ browser, context, baseURL }, info) => {
    await requireLocalRuntime();
    await signInWithApiSession(context, uniqueAccounts(info).owner);
    const storageState = await context.storageState();
    const desktop = width >= 768;
    for (const dpr of [1, 2, 3]) {
      const client = await browser.newContext({ baseURL, storageState, viewport: { width, height }, deviceScaleFactor: dpr });
      try {
        const page = await client.newPage();
        await page.goto("/app/settings");
        await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
        const header = page.locator("header").first();
        const nav = page.getByRole("navigation", { name: navigationName });
        await expect(header).toHaveCSS("height", "64px");
        await expect(header).toHaveCSS("background-color", dark);
        await expect(header).toHaveCSS("border-bottom", `2px solid ${edge}`);
        await expect(header.locator(".mimic-wordmark")).toHaveCount(1);
        await expect(header.locator(".mimic-wordmark__product")).toHaveCSS("color", text);
        await expect(header.locator(".mimic-wordmark__character")).toHaveCSS("color", speaker);
        await expect(nav.locator(".mimic-wordmark")).toHaveCount(0);
        await expect(nav).toHaveAttribute("data-variant", desktop ? "desktop" : "mobile");
        await expect(nav).toHaveCSS("background-color", dark);
        await expect(nav).toHaveCSS(desktop ? "border-right" : "border-top", `2px solid ${edge}`);
        await expect(nav.getByRole("link")).toHaveCount(5);
        await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

        for (const [label, icon, href] of items) {
          const link = nav.getByRole("link", { name: label, exact: true });
          const current = href === "/app/settings";
          await expect(link).toHaveAttribute("href", href);
          await expect(link).toHaveCSS("color", current ? text : speaker);
          await expect(link).toHaveCSS("background-color", current ? raised : "rgba(0, 0, 0, 0)");
          await expect(link).toHaveCSS("border-top", `2px solid ${current ? edge : "rgba(0, 0, 0, 0)"}`);
          if (current) await expect(link).toHaveAttribute("aria-current", "page");
          await verifyIcon(link, icon, desktop ? 48 : 32, desktop || dpr >= 2 ? "pixelated" : "auto");
          const box = (await link.boundingBox())!;
          expect(box.height).toBeGreaterThanOrEqual(desktop ? 56 : 44);
          expect(box.width).toBeGreaterThanOrEqual(44);
          if (width === 360) {
            const labelFits = await link.locator("span").evaluate((element) => element.scrollWidth <= element.clientWidth);
            expect(labelFits, label).toBe(true);
          }
        }

        const quick = page.getByRole("link", { name: "記一筆支出", exact: true });
        await verifyIcon(quick, "action-record-expense", 32, dpr >= 2 ? "pixelated" : "auto");
        await expect(quick).toHaveCSS("background-color", "rgb(244, 184, 63)");
        if (desktop) {
          await expect(nav).toHaveCSS("width", "240px");
          await page.locator("main").evaluate((main) => { main.style.minHeight = "200vh"; });
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await expect.poll(() => nav.evaluate((element) => element.getBoundingClientRect().top)).toBe(64);
          await page.evaluate(() => window.scrollTo(0, 0));
        } else {
          const columns = await nav.locator("ul").evaluate((list) => getComputedStyle(list).gridTemplateColumns);
          expect(columns.split(" ")).toHaveLength(5);
        }
        await checkFocus(page, nav);
        const unselected = nav.getByRole("link", { name: "首頁", exact: true });
        await unselected.hover();
        await expect(unselected).toHaveCSS("color", text);
        await expect(unselected).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");

        if (dpr === 1) {
          await page.goto("/");
          const publicNav = page.getByRole("navigation", { name: "主要導覽" });
          await expect(publicNav.locator("..")).toHaveCSS("height", width <= 760 ? "66px" : "70px");
          await expect(publicNav.locator("..")).toHaveCSS("background-color", dark);
          await expect(publicNav.locator("..")).toHaveCSS("border-bottom", `2px solid ${edge}`);
          for (const name of ["功能", "返回基地"]) await expect(publicNav.getByRole("link", { name })).toHaveCSS("color", text);
          await page.goto("/app");
          await expect(page.getByRole("navigation", { name: navigationName }).getByRole("link", { name: "首頁" })).toHaveAttribute("aria-current", "page");
          await expect(page.getByRole("link", { name: "記一筆支出", exact: true })).toHaveCount(0);
        }
      } finally {
        await client.close();
      }
    }
  });
}

for (const [width, height] of [[390, 844], [1440, 900]]) {
  test(`${width}x${height} keeps labels and icon dimensions on failed image requests`, async ({ page, context }, info) => {
    await requireLocalRuntime();
    await signInWithApiSession(context, uniqueAccounts(info).owner);
    await page.setViewportSize({ width, height });
    await page.route("**/pixel-ui/v1/icons/ui/*.png", (route) => route.abort());
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: navigationName });
    for (const [label, icon] of items) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await verifyIcon(link, icon, width >= 768 ? 48 : 32, width >= 768 ? "pixelated" : "auto", true);
    }
    await verifyIcon(page.getByRole("link", { name: "記一筆支出", exact: true }), "action-record-expense", 32, "auto", true);
    const directory = process.env.MIMIC_PHASE_2D_SCREENSHOTS;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `icons-failed-${width}x${height}.png`) });
    }
  });
}

test("serves the approved install icons, manifest and PNG-backed favicon", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.theme_color).toBe("#211a18");
  expect(manifest.background_color).toBe("#fffaf0");
  expect(manifest.icons).toEqual(["any", "maskable"].flatMap((purpose) => [192, 512].map((size) => ({
    src: `${iconRoot}install-warm/icon${purpose === "maskable" ? "-maskable" : ""}-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose,
  }))));
  const favicon = await request.get("/favicon.ico");
  expect(favicon.ok()).toBe(true);
  const ico = await favicon.body();
  expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 2]);
  await page.goto("/");
  for (const [index, size] of [16, 32].entries()) {
    const entry = 6 + index * 16;
    expect([ico[entry], ico[entry + 1]]).toEqual([size, size]);
    const offset = ico.readUInt32LE(entry + 12);
    const end = offset + ico.readUInt32LE(entry + 8);
    const asset = `icons/install-warm/favicon-${size}.png`;
    const hash = approved.assets.find(({ path }) => path === asset)?.sha256;
    expect(createHash("sha256").update(ico.subarray(offset, end)).digest("hex")).toBe(hash);
    await expect(page.locator(`link[rel="icon"][href="/pixel-ui/v1/${asset}"][sizes="${size}x${size}"]`)).toHaveCount(1);
  }
});
