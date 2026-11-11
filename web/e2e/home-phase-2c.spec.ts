import path from "node:path";
import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import layout from "../../docs/design/assets/approved/page-visual-v1/scenes/home/layout.json";
import { requireBackend, signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

const review = path.resolve("../docs/design/assets/reviews/2026-11-10-phase-2c");
const capture = process.env.MIMIC_PHASE_2C_CAPTURE === "1";
const dimensions = [[768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080],
  [2560, 1440], [360, 780], [390, 844], [430, 932]] as const;
const screenshotStyle = "nextjs-portal { visibility: hidden !important; }";

test.describe.configure({ timeout: 360_000 });
test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "desktop", "Explicit viewport matrix.");
  const api = process.env.MIMIC_API_BASE_URL;
  const db = process.env.MIMIC_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!api || !db || [api, db].some((url) => new URL(url).hostname !== "127.0.0.1")) {
    throw new Error("Phase 2C requires a dedicated 127.0.0.1 API and database.");
  }
  await requireBackend();
});

async function session(context: BrowserContext, info: TestInfo, state = "fixture") {
  const account = uniqueAccounts(info).owner;
  const auth = await signInWithApiSession(context, { ...account, email: `${state}-${account.email}` });
  return async function post<T = unknown>(url: string, body: object): Promise<T> {
    const response = await fetch(`${process.env.MIMIC_API_BASE_URL}${url}`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth.access_token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    expect(response.ok, `${url}: ${response.status} ${text}`).toBe(true);
    return JSON.parse(text).data as T;
  };
}

async function fixture(context: BrowserContext, info: TestInfo) {
  const post = await session(context, info);
  const personal = await post<{ id: string }>("/me/spaces", { name: "日常寶箱", mode: "PERSONAL_EXPENSES" });
  const group = await post<{ id: string }>("/groups", { name: "旅伴基地", group_type: "group", default_currency: "TWD" });
  const shared = await post<{ id: string }>(`/groups/${group.id}/spaces`, { name: "旅行分帳", mode: "SHARED_EXPENSES" });
  const pooled = await post<{ id: string; opened_on: string }>(`/groups/${group.id}/spaces`, {
    name: "旅行基金", mode: "POOLED_FUND",
  });
  async function record() {
    await post(`/spaces/${pooled.id}/pooled-funds/expenses`, {
      request_id: crypto.randomUUID(), amount_minor: "1", occurred_on: pooled.opened_on, title: "基金支付", payment_source: "FUND_PAID",
    });
  }
  return { post, personal, group, shared, pooled, record };
}

function controls(page: Page) {
  return {
    stage: page.locator("[data-home-stage]"),
    card: page.locator("[data-home-card]"),
    dialogue: page.locator("[data-home-dialogue]"),
    pause: page.locator("[data-home-stage] [data-scene-pause]"),
    room: page.locator("[data-home-scene]:visible"),
  };
}

test("renders eleven viewports and three data states against real financial data", async ({ page, context, browser, baseURL }, info) => {
  await session(context, info);
  const populated = await browser.newContext({ baseURL });
  const ready = await browser.newContext({ baseURL });
  try {
    const readyPost = await session(ready, info, "ready");
    const personal = await readyPost<{ id: string }>("/me/spaces", { name: "日常寶箱", mode: "PERSONAL_EXPENSES" });
    const readyPage = await ready.newPage();
    const f = await fixture(populated, info);
    const filledPage = await populated.newPage();
    await f.post(`/spaces/${f.pooled.id}/pooled-funds/commitments`, {
      request_id: crypto.randomUUID(), version: 1, name: "本期投入", cadence: "MONTHLY", interval: 1,
      starts_on: f.pooled.opened_on, ends_on: f.pooled.opened_on, generate_through: f.pooled.opened_on, default_amount_minor: "1000", overrides: [],
    });
    await f.record();
    const states = [
      { name: "empty", page, url: "/app", title: "我的寶箱", line: "這裡還空空的，先建立一個寶箱吧！" },
      { name: "ready", page: readyPage, url: "/app", title: "我的寶箱", line: "今天要記點什麼嗎？" },
      { name: "tasks", page: filledPage, url: `/app?group=${f.group.id}`, title: "旅伴基地", line: /有 \d+ 件事等你確認喔。/ },
    ];
    for (const view of [page, readyPage, filledPage]) {
      await view.addInitScript(() => localStorage.setItem("mimic.landing.animation-paused", "true"));
    }
    for (const [width, height] of dimensions) {
      for (const state of states) {
        const view = state.page;
        await view.setViewportSize({ width, height });
        await view.goto(state.url);
        const { stage, card, dialogue, room, pause } = controls(view);
        await expect(pause).toHaveAttribute("aria-pressed", "true");
        await expect(card.getByRole("heading", { level: 1 })).toHaveText(state.title);
        await expect(dialogue).toContainText(state.line);
        const geometry = await stage.evaluate((element) => {
          const top = document.querySelector("header")!.getBoundingClientRect().height;
          const viewport = element.querySelector<HTMLElement>("[data-home-viewport]:not([hidden])")!;
          return {
            stageWidth: element.clientWidth,
            stageX: element.getBoundingClientRect().x,
            contentWidth: element.parentElement!.getBoundingClientRect().width,
            top,
            scale: Number(element.dataset.scale),
            scrollWidth: document.documentElement.scrollWidth,
            shell: getComputedStyle(document.querySelector("header")!).getPropertyValue("--mimic-color-hud-dark").trim(),
            home: getComputedStyle(viewport).getPropertyValue("--mimic-color-hud-dark").trim(),
          };
        });
        const variant = geometry.contentWidth >= 640 ? "desktop" : "phone";
        if (width === 768) expect(variant).toBe("phone");
        const scene = layout[variant];
        const scale = variant === "desktop" ? Math.min(geometry.contentWidth / 960, (height - geometry.top) * 0.75 / 540) : 1;
        await expect(room).toHaveAttribute("data-home-scene", variant);
        expect(geometry.scale).toBeCloseTo(scale, 5);
        expect(geometry.scrollWidth).toBe(width);
        expect(geometry.shell).toBe("#211a18");
        expect(geometry.home).toBe("#211a18");
        const bounds = (await room.boundingBox())!;
        expect(bounds.width).toBeCloseTo(scene.width * scale, 1);
        expect(bounds.height).toBeCloseTo(scene.height * scale, 1);
        if (variant === "phone") {
          if (geometry.contentWidth < 390) {
            expect(geometry.stageWidth).toBe(width);
            expect(geometry.stageX).toBeCloseTo(0, 1);
          } else {
            expect(geometry.stageWidth).toBeCloseTo(geometry.contentWidth, 0);
          }
          expect(bounds.x).toBeCloseTo(geometry.stageX + (geometry.stageWidth - 390) / 2, 0);
          for (const box of [card, dialogue]) {
            const rect = (await box.boundingBox())!;
            expect(rect.x).toBeGreaterThanOrEqual(geometry.stageX + 12);
            expect(rect.x + rect.width).toBeLessThanOrEqual(geometry.stageX + geometry.stageWidth - 12 + 0.1);
          }
          const button = (await pause.boundingBox())!;
          expect(button.x).toBeCloseTo(Math.max(geometry.stageX, bounds.x) + 12, 1);
          expect(button.y + button.height).toBeCloseTo(bounds.y + scene.safeZones.dialogue[1] - 8, 1);
          for (const target of [card, dialogue, room.locator('[data-layer="mimiku"]'), room.locator('[data-layer="fire"]')]) {
            const box = (await target.boundingBox())!;
            expect(button.x + button.width <= box.x || box.x + box.width <= button.x ||
              button.y + button.height <= box.y || box.y + box.height <= button.y).toBe(true);
          }
        } else if (width === 1920) {
          const frame = (await dialogue.boundingBox())!;
          expect(frame.y).toBeCloseTo(bounds.y + scene.safeZones.dialogue[1] * scale, 1);
          expect(frame.width).toBeCloseTo(scene.safeZones.dialogue[2] * scale, 1);
          expect(frame.height).toBeCloseTo(scene.safeZones.dialogue[3] * scale, 1);
          const inset = await dialogue.locator("section").evaluate((element) => {
            const css = getComputedStyle(element);
            return [parseFloat(css.paddingLeft) + parseFloat(css.borderLeftWidth),
              parseFloat(css.paddingTop) + parseFloat(css.borderTopWidth), css.alignContent];
          });
          expect(inset[0]).toBeCloseTo(54 * scale, 1);
          expect(inset[1]).toBeCloseTo(34 * scale, 1);
          expect(inset[2]).toBe("center");
        }
        for (const layer of scene.layers) {
          const box = await room.locator(`[data-layer="${layer.id}"]`).evaluate((element) => {
            const { left, top, width, height, zIndex } = getComputedStyle(element);
            return [left, top, width, height, zIndex].map(parseFloat);
          });
          expect(box).toEqual([layer.x, layer.y, layer.width, layer.height, layer.depth]);
        }
        if (state.name === "tasks") {
          await expect(card.getByRole("link", { name: /基金支付 · 旅行基金/ })).toHaveAttribute("href", `/app/spaces/${f.pooled.id}`);
          await expect(card.getByRole("link", { name: /個待辦/ })).toHaveAttribute("href", "/app/tasks");
          await expect(view.getByRole("button", { name: "記一筆支出" })).toHaveCount(1);
        } else {
          await expect(card).toContainText("還沒有冒險紀錄");
          await expect(card.getByRole("link", { name: /待辦/ })).toHaveCount(0);
          if (state.name === "ready") {
            await expect(view.getByRole("link", { name: "記一筆支出", exact: true })).toHaveCount(1);
            await expect(dialogue.getByRole("link", { name: "記一筆支出" })).toHaveAttribute("href", `/app/personal?space=${personal.id}&quick=1`);
          } else {
            await expect(dialogue.getByRole("link", { name: "先建立可記帳的寶箱" })).toHaveAttribute("href", "/app/personal");
          }
        }
        if (capture) {
          console.log(JSON.stringify({ width, height, state: state.name, variant, contentWidth: geometry.contentWidth, scale: geometry.scale,
            scene: bounds, card: await card.boundingBox(), dialogue: await dialogue.boundingBox() }));
          await view.screenshot({ path: path.join(review, "screenshots-2r", `${width}x${height}-${state.name}.png`), style: screenshotStyle });
        }
      }
    }
    const { stage, card, dialogue, room } = controls(filledPage);
    const quick = dialogue.getByRole("button", { name: "記一筆支出" });
    await quick.click();
    const chooser = filledPage.getByRole("dialog", { name: "要記在哪個寶箱？" });
    await expect(chooser.getByRole("link", { name: /旅行分帳/ })).toHaveAttribute("href", `/app/spaces/${f.shared.id}?quick=1`);
    if (capture) await filledPage.screenshot({ path: path.join(review, "screenshots-2r", "quick-expense-dialog.png"), style: screenshotStyle });
    await filledPage.keyboard.press("Escape");
    await expect(quick).toBeFocused();
    await populated.setOffline(true);
    await expect(quick).toBeDisabled();
    await expect(dialogue).toContainText("現在離線，我先幫你看著最後的狀態。");
    await expect(filledPage.getByRole("status")).toContainText("目前離線");
    await populated.setOffline(false);
    await filledPage.addStyleTag({ content: "html { font-size: 200%; }" });
    await expect(stage).toHaveAttribute("data-card-flow", "");
    await expect(stage).toHaveAttribute("data-dialogue-flow", "");
    expect((await card.boundingBox())!.y).toBeGreaterThanOrEqual((await room.boundingBox())!.y + 600);
    await filledPage.goto("/app/tasks");
    await expect(filledPage.getByRole("link", { name: "記一筆支出", exact: true })).toBeVisible();
  } finally {
    await Promise.all([populated.close(), ready.close()]);
  }
});

function frames(page: Page, name: string) {
  return controls(page).room.locator(`[data-home-sheet="${name}"]`);
}

test("selects the scene at 639/640 content pixels and renders the same geometry before hydration", async ({ page, context, browser, baseURL }, info) => {
  await session(context, info);
  const ssr = await browser.newContext({ baseURL, storageState: await context.storageState(), serviceWorkers: "block" });
  try {
    // Allow the inline streamed HTML reveal, while blocking the client runtime that hydrates it.
    await ssr.route(/\/_next\/static\/.*\.js(?:\?|$)/, (route) => route.abort());
    const initial = await ssr.newPage();
    for (const [width, height, variant] of [[768, 1024, "phone"], [1024, 768, "desktop"], [1440, 900, "desktop"]] as const) {
      await Promise.all([initial, page].map(async (view) => {
        await view.setViewportSize({ width, height });
        await view.goto("/app");
        await expect(controls(view).room).toHaveAttribute("data-home-scene", variant);
      }));
      await expect(controls(page).pause).toHaveAttribute("data-ready", "");
      await expect(controls(initial).pause).not.toHaveAttribute("data-ready");
      expect(await controls(initial).room.boundingBox()).toEqual(await controls(page).room.boundingBox());
      expect(await controls(initial).dialogue.boundingBox()).toEqual(await controls(page).dialogue.boundingBox());
    }
  } finally {
    await ssr.close();
  }
  const content = page.locator("[data-home-content]");
  for (const [width, variant] of [[639, "phone"], [640, "desktop"], [639, "phone"]] as const) {
    await content.evaluate((element, value) => { element.style.width = `${value}px`; }, width);
    expect((await content.boundingBox())!.width).toBe(width);
    await expect(controls(page).room).toHaveAttribute("data-home-scene", variant);
    await expect(frames(page, "idle")).toHaveAttribute("data-loaded", "");
    if (variant === "phone") expect((await controls(page).room.boundingBox())!.width).toBe(390);
  }
});

test("reduced motion shows the new ledger result once and respects the shared pause setting", async ({ page, context }, info) => {
  const f = await fixture(context, info);
  const url = `/app?group=${f.group.id}`;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  const { room, pause } = controls(page);
  await expect(pause).toBeHidden();
  await expect(frames(page, "idle")).toHaveAttribute("data-loaded", "");
  await expect(room).not.toHaveAttribute("data-ledger");
  await f.record();
  await page.reload();
  await expect(room).toHaveAttribute("data-ledger", "");
  await expect(frames(page, "ledger")).toHaveCSS("background-position-x", "-472px");
  await expect(room).not.toHaveAttribute("data-ledger");
  await page.reload();
  await expect(frames(page, "idle")).toHaveAttribute("data-loaded", "");
  await expect(room).not.toHaveAttribute("data-ledger");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator("[data-landing-pause]").click();
  await page.goto(url);
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect(frames(page, "idle")).toHaveCSS("background-position-x", "0px");
  await pause.click();
  await page.goto("/");
  await expect(page.locator("[data-landing-pause]")).toHaveAttribute("aria-pressed", "false");
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Storage is blocked", "SecurityError"); },
    });
  });
  await page.goto(url);
  await expect(pause).toHaveAttribute("data-ready", "");
  await expect(room).not.toHaveAttribute("data-ledger");
  await controls(page).dialogue.getByRole("button", { name: "記一筆支出" }).click();
  await expect(page.getByRole("dialog", { name: "要記在哪個寶箱？" })).toBeVisible();
});

for (const [width, height] of [[1920, 1080], [390, 844]]) {
  test(`observes idle, blink and one ledger playback at ${width}×${height}`, async ({ browser, baseURL }, info) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height },
      recordVideo: capture ? { dir: info.outputPath("recording"), size: { width, height } } : undefined });
    const page = await context.newPage();
    const video = page.video();
    try {
      const f = await fixture(context, info);
      const url = `/app?group=${f.group.id}`;
      await page.goto(url);
      const { room, pause } = controls(page);
      const idle = frames(page, "idle");
      await expect(idle).toHaveAttribute("data-loaded", "");
      await expect(room).not.toHaveAttribute("data-ledger");
      // Restart from a known frame and sample the DOM writes with a monotonic clock.
      await pause.click();
      await expect(pause).toHaveAttribute("aria-pressed", "true");
      await idle.evaluate((sheet) => {
        const samples: [number, number][] = [];
        const observer = new MutationObserver(() => {
          const frame = Number(sheet.style.getPropertyValue("--frame"));
          if (samples.at(-1)?.[0] !== frame) samples.push([frame, performance.now()]);
        });
        observer.observe(sheet, { attributes: true, attributeFilter: ["style"] });
        sheet.closest("[data-home-stage]")!.querySelector("[data-scene-pause]")!.addEventListener(
          "click", () => samples.push([0, performance.now()]), { capture: true, once: true });
        Object.assign(sheet, { samples });
      });
      await pause.click();
      await expect.poll(() => idle.evaluate((sheet) =>
        (sheet as HTMLElement & { samples: [number, number][] }).samples.some(([frame]) => frame === 2)),
      { timeout: 6500, intervals: [40] }).toBe(true);
      const samples = await idle.evaluate((sheet) => (sheet as HTMLElement & { samples: [number, number][] }).samples);
      expect(samples.slice(0, 3).map(([frame]) => frame)).toEqual([0, 1, 0]);
      expect(samples[1][1] - samples[0][1]).toBeGreaterThanOrEqual(220);
      expect(samples[1][1] - samples[0][1]).toBeLessThanOrEqual(330);
      const blinkDelay = samples.find(([frame]) => frame === 2)![1] - samples[0][1];
      expect(blinkDelay).toBeGreaterThanOrEqual(2950);
      expect(blinkDelay).toBeLessThanOrEqual(6150);
      await expect.poll(() => idle.evaluate((sheet) => sheet.style.getPropertyValue("--frame"))).toBe("0");
      if (!capture) {
        await page.evaluate(() => {
          const spacer = document.createElement("div");
          spacer.style.height = "200vh";
          document.body.append(spacer);
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
        await expect(room).not.toBeInViewport();
        await expect(frames(page, "fire")).toHaveCSS("background-position-x", "0px");
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(room).toBeInViewport();
      }
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(frames(page, "fire")).toHaveCSS("background-position-x", "0px");
      await f.record();
      await page.reload();
      await expect(room).toHaveAttribute("data-ledger", "");
      await expect(room).not.toHaveAttribute("data-ledger");
      await page.reload();
      await expect(idle).toHaveAttribute("data-loaded", "");
      await expect(room).not.toHaveAttribute("data-ledger");
    } finally {
      await context.close();
      if (capture && video) await video.saveAs(path.join(review, "videos-2r", `${width}x${height}-idle-ledger.webm`));
    }
  });
}
