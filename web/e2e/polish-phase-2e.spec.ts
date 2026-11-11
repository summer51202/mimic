import { createHash } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import approved from "../../docs/design/assets/approved/page-visual-v1/production-asset-manifest.json";
import { requireBackend, signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

const viewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
const iconRoot = "/pixel-ui/v1/icons/install-warm/";
const light = ["rgb(236, 227, 211)", "rgb(90, 78, 68)", "rgb(138, 124, 108)"] as const;
const dark = ["rgb(58, 44, 36)", "rgb(188, 155, 101)", "rgb(183, 149, 86)"] as const;
const api = process.env.MIMIC_API_BASE_URL;

test.use({ serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } });
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "Explicit phone and desktop viewport matrix.");
});

async function requireLocalBackend() {
  const db = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!api || !db || [api, db].some((url) => new URL(url).hostname !== "127.0.0.1")) {
    throw new Error("Phase 2E requires a dedicated 127.0.0.1 API and database.");
  }
  await requireBackend();
}

async function expectDisabledStyle(control: Locator, colors: typeof light | typeof dark) {
  await expect(control).toHaveCSS("background-color", colors[0]);
  await expect(control).toHaveCSS("color", colors[1]);
  await expect(control).toHaveCSS("border-top", `2px dashed ${colors[2]}`);
  await expect(control).toHaveCSS("box-shadow", "none");
  await expect(control).toHaveCSS("opacity", "1");
  await expect(control).toHaveCSS("cursor", "not-allowed");
}

async function holdMutation(page: Page, url: string, method: string) {
  let release!: () => void;
  let received!: () => void;
  let complete!: () => void;
  let handled = false;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { received = resolve; });
  const finished = new Promise<void>((resolve) => { complete = resolve; });
  await page.route(url, async (route) => {
    if (route.request().method() !== method) return route.fallback();
    handled = true;
    received();
    await hold;
    try {
      await route.abort();
    } finally {
      complete();
    }
  });
  return {
    started,
    async finish() {
      release();
      if (handled) await finished;
      await page.unroute(url);
    },
  };
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    test("uses the session-aware public header and completes the App → Landing → App path", async ({ page, context }, info) => {
      await requireLocalBackend();
      const nav = page.getByRole("navigation", { name: "主要導覽" });
      const routes = ["/", "/features", "/privacy", "/terms", "/invite/ABCD1234XYZ_"];
      const header = page.getByRole("banner");
      const height = viewport.width < 760 ? "66px" : "70px";
      for (const route of routes) {
        await page.goto(route);
        await expect(nav.getByRole("link", { name: "登入", exact: true })).toHaveAttribute("href", "/login");
        await expect(nav.getByRole("link", { name: "功能", exact: true })).toHaveAttribute("href", "/features");
        await expect(header).toHaveCSS("height", height);
      }
      await signInWithApiSession(context, uniqueAccounts(info).owner);
      for (const route of routes) {
        await page.goto(route);
        await expect(nav.getByRole("link", { name: "返回基地", exact: true })).toHaveAttribute("href", "/app");
        await expect(nav.getByRole("link", { name: "登入", exact: true })).toHaveCount(0);
        await expect(header).toHaveCSS("height", height);
      }
      await page.goto("/app/settings");
      const mark = header.getByRole("link", { name: "回到 mimic 入口頁", exact: true });
      await expect(mark).toHaveAttribute("href", "/");
      const bounds = (await mark.boundingBox())!;
      expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44);
      await expect(mark).toHaveCSS("text-decoration-line", "none");
      await page.keyboard.press("Tab");
      await expect(mark).toBeFocused();
      await expect(mark).toHaveCSS("outline", "rgb(47, 130, 214) solid 3px");
      await expect(mark).toHaveCSS("outline-offset", "-3px");
      await mark.hover();
      await expect(mark.locator(".mimic-wordmark__character")).toHaveCSS("color", "rgb(240, 223, 196)");
      await mark.click();
      await expect(page).toHaveURL(/\/$/);
      await nav.getByRole("link", { name: "返回基地", exact: true }).click();
      await expect(page).toHaveURL(/\/app$/);
    });

    test("styles pending group and profile actions without hover or active movement", async ({ page, context }, info) => {
      await requireLocalBackend();
      await signInWithApiSession(context, uniqueAccounts(info).owner);
      await page.goto("/app/groups/new");
      await page.getByRole("textbox", { name: "Group name" }).fill("Phase 2E test group");
      const create = await holdMutation(page, "**/api/app/groups", "POST");
      try {
        const button = page.getByRole("button", { name: "Create group", exact: true });
        await button.click();
        await create.started;
        await expect(button).toBeDisabled();
        await expectDisabledStyle(button, light);
        await button.hover();
        await page.mouse.down();
        try {
          await expectDisabledStyle(button, light);
          await expect(button).toHaveCSS("transform", "none");
        } finally {
          await page.mouse.up();
        }
      } finally {
        await create.finish();
      }
      await page.goto("/app/settings");
      await page.getByRole("textbox", { name: "Display name" }).fill("Phase 2E test name");
      const save = await holdMutation(page, "**/api/app/me", "PATCH");
      try {
        await page.getByRole("button", { name: "Save changes" }).click();
        await save.started;
        for (const name of ["Saving...", "Sign out"]) {
          const button = page.getByRole("button", { name, exact: true });
          await expect(button).toBeDisabled();
          await expectDisabledStyle(button, light);
        }
      } finally {
        await save.finish();
      }
    });

    test("uses dark disabled styles for both Home offline CTA variants", async ({ page, context }, info) => {
      await requireLocalBackend();
      const auth = await signInWithApiSession(context, uniqueAccounts(info).owner);
      for (const count of [1, 2]) {
        const response = await fetch(`${api}/me/spaces`, {
          method: "POST",
          headers: { authorization: `Bearer ${auth.access_token}`, "content-type": "application/json" },
          body: JSON.stringify({ name: `Phase 2E box ${count}`, mode: "PERSONAL_EXPENSES" }),
        });
        expect(response.ok, await response.text()).toBe(true);
        await page.goto("/app");
        const cta = page.locator("[data-home-dialogue]").getByText("記一筆支出", { exact: true });
        await expect(cta).toBeEnabled();
        await context.setOffline(true);
        try {
          if (count === 1) await expect(cta).toHaveAttribute("aria-disabled", "true");
          else await expect(cta).toBeDisabled();
          await expectDisabledStyle(cta, dark);
        } finally {
          await context.setOffline(false);
        }
      }
    });
  });
}

test("styles the disabled Landing arrow and retains its endpoint behavior", async ({ page }) => {
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  const left = page.getByRole("button", { name: "往左探索" });
  const right = page.getByRole("button", { name: "往右探索" });
  await expect(left).toBeEnabled();
  await left.click();
  await expect(left).toBeDisabled();
  await expectDisabledStyle(left, dark);
  await expect(right).toBeEnabled();
  await right.click();
  await expect(left).toBeEnabled();
});

test("serves all promoted install PNGs and the byte-identical embedded favicon payloads", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.icons).toHaveLength(4);
  const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  const assets = approved.assets.filter(({ disposition }) => disposition === "promoted-phase-2e");
  expect(assets).toHaveLength(6);
  await page.goto("/");
  const favicon = await request.get("/favicon.ico");
  expect(favicon.ok()).toBe(true);
  const ico = await favicon.body();
  expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 2]);
  for (const asset of assets) {
    const filename = asset.path.split("/").at(-1)!;
    const url = iconRoot + filename;
    const png = await request.get(url);
    expect(png.ok()).toBe(true);
    const bytes = await png.body();
    expect(digest(bytes)).toBe(asset.sha256);
    expect((await request.get(url.replace("install-warm/", "install/"))).status()).toBe(404);
    if (filename.startsWith("favicon-")) {
      const size = asset.width!;
      const entry = size === 16 ? 6 : 22;
      const offset = ico.readUInt32LE(entry + 12);
      expect([ico[entry], ico[entry + 1]]).toEqual([size, size]);
      expect(ico.subarray(offset, offset + ico.readUInt32LE(entry + 8))).toEqual(bytes);
      await expect(page.locator(`link[rel="icon"][href="${url}"][sizes="${size}x${size}"]`)).toHaveCount(1);
    } else {
      expect(manifest.icons).toContainEqual({
        src: url, sizes: `${asset.width}x${asset.height}`, type: "image/png",
        purpose: filename.includes("maskable") ? "maskable" : "any",
      });
    }
  }
});
