import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { brand } from "../src/shared/brand/brand";
import { chestTimelines } from "../src/shared/brand/landing-motion";
import { requireBackend, signInWithApiSession, uniqueAccounts } from "./fixtures/accounts";

const review = path.resolve(process.env.MIMIC_PHASE_2B_REVIEW_DIR ?? "../docs/design/assets/reviews/2026-11-10-phase-2b");
const capture = process.env.MIMIC_PHASE_2B_CAPTURE === "1";
const screenshotStyle = "nextjs-portal { visibility: hidden !important; }";
const sampleCampfireFrames = process.env.MIMIC_PHASE_2B_SAMPLE_FRAMES === "1";

async function captureScreenshot(page: Page, filename: string) {
  await page.screenshot({ path: filename, style: screenshotStyle });
  if (!sampleCampfireFrames) return;
  for (let frame = 0; frame < 4; frame++) {
    await page.screenshot({
      path: path.join(path.dirname(filename), "frames", `${path.basename(filename, ".png")}-${frame}.png`),
      style: `${screenshotStyle} [data-campfire-sheet] { --frame: ${frame} !important; }`,
    });
  }
}
const matrix = [
  [768, 1024], [1280, 720], [1366, 768], [1440, 900], [1536, 864],
  [1920, 1080], [2560, 1440], [360, 780], [390, 844], [430, 932],
] as const;

const name = {
  chest: "舊寶箱", carving: "岩壁上的刻痕", sign: "功能",
  bats: "蝙蝠", torch: "火把", torchHigh: "火把", torchLow: "火把",
};
const line = {
  chest: "那是普通的寶箱，不是我親戚喔！",
  close: "還是蓋好比較安心。",
  carving: "這是⋯⋯很久以前的我？原來早就有冒險者陪著我了。",
  bats: "噓——牠們白天在睡覺啦。",
  torch: "小心火！我可是木頭做的⋯⋯",
};

const viewport = (page: Page, phone: boolean) =>
  page.locator(`[data-landing-viewport="${phone ? "phone" : "desktop"}"]`);
const say = (page: Page) => page.locator('[data-landing-stage] [aria-live="polite"]');
const left = (page: Page) => page.getByRole("button", { name: "往左探索" });
const right = (page: Page) => page.getByRole("button", { name: "往右探索" });
const scroll = (page: Page) => viewport(page, true).evaluate((el) => el.scrollLeft);

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "The matrix sets its own viewports.");
});

for (const width of [1920, 390, 320]) {
  test(`2R circular torch glow and diagonal bat path at ${width}px`, async ({ page }) => {
    const phone = width < 760;
    await page.setViewportSize({ width, height: width === 320 ? 720 : phone ? 844 : 1080 });
    await page.goto("/");
    const room = viewport(page, phone);
    await expect(room.locator("[data-campfire-sheet][data-loaded]")).toHaveCount(1);
    const bats = room.locator('[data-layer="bats"]');
    await room.getByRole("button", { name: "蝙蝠" }).click();
    await expect(bats).toHaveAttribute("data-flight", "");
    const flight = await bats.evaluate((el) => {
      const animation = el.getAnimations()[0];
      const effect = animation.effect as KeyframeEffect;
      const frames = effect.getKeyframes().map(({ offset, transform }) => {
        const { e: x, f: y } = new DOMMatrixReadOnly(String(transform));
        return { offset, x, y };
      });
      const initial = el.parentElement!.getBoundingClientRect();
      const title = el.parentElement!.querySelector('[data-layer="wordmark"]')!.getBoundingClientRect();
      const actor = el.parentElement!.querySelector('[data-layer="mimiku"]')!.getBoundingClientRect();
      const scale = initial.width / (el.parentElement as HTMLElement).offsetWidth;
      animation.currentTime = 1000;
      const offscreen = el.getBoundingClientRect().bottom <= initial.top;
      animation.currentTime = 0;
      const start = el.getBoundingClientRect();
      // The resting phone art shares 3 px of bounding-box padding with the title.
      const avoidsArt = frames.filter(({ y }) => y < 0).every(({ x, y }) => [title, actor].every((box) =>
        start.left + x * scale >= box.right ||
        start.bottom + y * scale <= box.top ||
        start.top + y * scale >= box.bottom,
      ));
      return { duration: effect.getTiming().duration, frames, offscreen, avoidsArt };
    });
    expect(flight.duration).toBe(2500);
    expect(flight.offscreen).toBe(true);
    expect(flight.avoidsArt).toBe(true);
    const outgoing = flight.frames.filter(({ offset }) => offset! <= 0.200001);
    const returning = flight.frames.filter(({ offset }) => offset! >= 0.799999);
    expect(outgoing.at(-1)?.offset).toBeCloseTo(0.2, 6);
    expect(returning[0].offset).toBeCloseTo(0.8, 6);
    expect(outgoing.length).toBeGreaterThan(10);
    expect(returning.map(({ x, y }) => [x, y])).toEqual(outgoing.map(({ x, y }) => [x, y]).reverse());
    for (const [index, { x, y }] of outgoing.slice(1).entries()) {
      expect(Number.isInteger(y)).toBe(true);
      expect(y).toBeLessThan(outgoing[index].y);
      expect(x - Math.round(-y / 2)).toBe(index % 2 === 0 ? 1 : -1);
    }

    if (phone) {
      await left(page).click();
      await expect.poll(() => scroll(page)).toBe(0);
    }
    for (const id of phone ? ["torch"] : ["torchHigh", "torchLow"]) {
      await room.locator(`[data-landing-target="${id}"]`).click();
      const glow = room.locator(`[data-torch-glow="${id}"]`);
      const paint = await glow.evaluate((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const viewportBox = el.closest("[data-landing-viewport]")!.getBoundingClientRect();
        const radius = Number(style.backgroundImage.match(/^radial-gradient\((?:circle )?([\d.]+)px,/)?.[1])
          * box.width / parseFloat(style.width);
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        return {
          width: style.width, height: style.height, gradient: style.backgroundImage,
          blend: style.mixBlendMode, behind: el.nextElementSibling?.getAttribute("data-layer"),
          radius, fits: x - radius > viewportBox.left && x + radius < viewportBox.right &&
            y - radius > viewportBox.top && y + radius < viewportBox.bottom,
        };
      });
      expect(paint.width).toBe(paint.height);
      expect(paint.gradient).toMatch(/^radial-gradient\((?:circle )?[\d.]+px,/);
      expect(paint.gradient).toContain("255, 179, 71");
      expect(paint.blend).toBe("normal");
      expect(paint.behind).toBe(id);
      expect(paint.radius).toBeGreaterThan(0);
      expect(paint.fits).toBe(true);
    }
  });
}

for (const [width, height] of matrix) {
  test(`named Landing controls and layout at ${width}×${height}`, async ({ page }, info) => {
    const phone = width < 760;
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const room = viewport(page, phone);
    const cta = page.getByRole("link", { name: "開始冒險", exact: true });
    await expect(cta).toHaveAttribute("href", "/register");
    await expect(page.locator("[data-campfire-sheet][data-loaded]").filter({ visible: true })).toHaveCount(1);
    const ctaBox = await cta.boundingBox();
    const targets = room.locator("[data-landing-target]");
    const order = (phone
      ? ["chest", "torch", "sign", "bats", "carving"]
      : ["chest", "torchHigh", "bats", "sign", "torchLow", "carving"]) as (keyof typeof name)[];
    const boxes = await targets.evaluateAll((elements) => elements.map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { id: (el as HTMLElement).dataset.landingTarget, x, y, width, height };
    }));
    expect(boxes.map(({ id }) => id)).toEqual(order);
    for (const [i, box] of boxes.entries()) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      for (const other of boxes.slice(i + 1)) {
        expect(box.x >= other.x + other.width || other.x >= box.x + box.width ||
          box.y >= other.y + other.height || other.y >= box.y + box.height).toBe(true);
      }
    }
    const label = await room.locator("[data-sign-label] > span").evaluate((el) => ({
      size: Number.parseFloat(getComputedStyle(el).fontSize),
      shown: getComputedStyle(el).visibility === "visible",
    }));
    expect(label.shown).toBe(true);
    expect(label.size).toBeGreaterThanOrEqual(12);
    const snap = phone ? await room.locator("[data-snap]").evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).offsetLeft)) : [];
    if (phone) {
      expect(snap).toEqual([0, Math.max(390, 774 - width), 1170 - width]);
      await expect.poll(() => scroll(page)).toBe(snap[1]);
      const actor = (await room.locator('[data-layer="mimiku"]').boundingBox())!;
      const bounds = (await room.boundingBox())!;
      expect(actor.x).toBeGreaterThanOrEqual(bounds.x);
      expect(actor.x + actor.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    } else {
      expect(await room.evaluate((el) => el.scrollWidth)).toBe(await room.evaluate((el) => el.clientWidth));
      await expect(left(page)).toBeHidden();
      await expect(right(page)).toBeHidden();
    }
    await expect(say(page)).toBeEmpty();
    await expect(page.getByText(brand.tagline, { exact: true })).toBeVisible();
    const prefix = path.join(review, "screenshots-2r", `${width}x${height}`);
    if (capture) {
      await mkdir(path.dirname(prefix), { recursive: true });
      await captureScreenshot(page, `${prefix}-default.png`);
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("button", { name: "暫停動畫" })).toBeHidden();
    if (phone) {
      await left(page).click();
      await expect.poll(() => scroll(page)).toBe(0);
      await expect(left(page)).toHaveAttribute("aria-disabled", "true");
      await room.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => scroll(page)).toBe(snap[1]);
      await right(page).click();
      await expect.poll(() => scroll(page)).toBe(snap[2]);
      await expect(right(page)).toHaveAttribute("aria-disabled", "true");
    }

    await targets.first().focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    for (const [index, id] of order.entries()) {
      const target = targets.nth(index);
      await expect(target).toBeFocused();
      await expect(target).toHaveAccessibleName(name[id]);
      const focusWidth = await target.evaluate((el) => {
        const scene = el.closest("[data-landing-scene]")!;
        const matrix = new DOMMatrixReadOnly(getComputedStyle(scene).transform);
        return parseFloat(getComputedStyle(el).outlineWidth) * matrix.a;
      });
      expect(focusWidth).toBeGreaterThanOrEqual(2);
      if (id !== "sign") {
        await page.keyboard.press("Enter");
        await expect(say(page)).toHaveText(id.startsWith("torch") ? line.torch : line[id as "chest" | "bats" | "carving"]);
        expect(await cta.boundingBox()).toEqual(ctaBox);
      }
      if (index < order.length - 1) await page.keyboard.press("Tab");
    }
    await expect(room.locator('[data-layer="chest"]')).toHaveAttribute("data-chest-frame", "open");
    await expect(room.locator('[data-layer="carving"]')).toHaveAttribute("data-revealed", "true");
    await expect(room.locator('[data-layer="bats"]')).toHaveCSS("transform", "none");
    expect(await room.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    if (capture) {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(page.getByRole("button", { name: "暫停動畫" })).toBeVisible();
      await captureScreenshot(page, `${prefix}-interacted.png`);
      if (phone) {
        await left(page).click();
        await expect.poll(() => scroll(page)).toBe(snap[1]);
        await left(page).click();
        await expect.poll(() => scroll(page)).toBe(0);
        await captureScreenshot(page, `${prefix}-open-chest.png`);
        await right(page).click();
        await expect.poll(() => scroll(page)).toBe(snap[1]);
      }
    }
    const sign = room.getByRole("link", { name: "功能" });
    await expect(sign).toHaveAttribute("href", "#features");
    await sign.click();
    await expect(page.locator("#features")).toBeInViewport();
    await expect(say(page)).toHaveText(line.carving);
    await info.attach("geometry", {
      body: JSON.stringify({ width, height, scale: await page.locator("[data-landing-stage]").getAttribute("data-scale"), boxes, snap, label }),
      contentType: "application/json",
    });
  });
}

for (const width of [360, 375]) {
  test(`center snap and first paint at ${width}px`, async ({ page, browser, baseURL }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const expected = 774 - width;
    await expect.poll(() => scroll(page)).toBe(expected);
    const ssr = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 800 } });
    try {
      await ssr.goto(baseURL!);
      const bounds = (await viewport(ssr, true).boundingBox())!;
      const actor = (await viewport(ssr, true).locator('[data-layer="mimiku"]').boundingBox())!;
      expect(actor.x + actor.width).toBe(bounds.x + width);
    } finally {
      await ssr.close();
    }
  });
}

test("chest opens and closes frame by frame, ignoring reentry and queuing the carving", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const room = viewport(page, false);
  const chest = room.getByRole("button", { name: "舊寶箱" });
  const carving = room.getByRole("button", { name: "岩壁上的刻痕" });
  const art = room.locator("[data-chest-frame]");
  await expect(room.locator("[data-campfire-sheet][data-loaded]")).toHaveCount(1);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  for (const direction of ["open", "close"] as const) {
    const started = await chest.evaluate((el) => { (el as HTMLElement).click(); return performance.now(); });
    if (direction === "open") {
      await chest.evaluate((el) => (el as HTMLElement).click());
      await expect(say(page)).toHaveText(line.chest);
      await carving.evaluate((el) => (el as HTMLElement).click());
      await expect(say(page)).toHaveText(line.carving);
      await expect(room.locator("[data-revealed]")).toHaveAttribute("data-revealed", "false");
    } else {
      await expect(say(page)).toHaveText(line.close);
    }
    const frames: string[] = [];
    let ended = false;
    let elapsed = 0;
    const total = chestTimelines[direction].reduce<number>((sum, [, ms]) => sum + ms, 0);
    while (elapsed <= total + 16) {
      const snapshot = await art.evaluate((el) => ({
        frame: (el as HTMLElement).dataset.chestFrame!,
        playing: el.closest("[data-landing-scene]")!.querySelector("[data-chest-playing]") !== null,
        now: performance.now(),
      }));
      if (frames.at(-1) !== snapshot.frame) frames.push(snapshot.frame);
      elapsed = snapshot.now - started;
      if (!snapshot.playing) {
        ended = true;
        break;
      }
      await page.clock.runFor(2);
    }
    expect(frames).toEqual(chestTimelines[direction].map(([frame]) => frame));
    expect(ended).toBe(true);
    expect(Math.abs(elapsed - total)).toBeLessThanOrEqual(17);
        await expect(chest).toHaveAttribute("aria-pressed", String(direction === "open"));
    await expect(room.locator("[data-revealed]")).toHaveAttribute("data-revealed", "true");
    await page.clock.runFor(416);
  }
});

test("automatic animations stop for pause, visibility, intersection and a live reduced-motion change", async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto("/");
  const room = viewport(page, false);
  const sheet = room.locator("[data-campfire-sheet]");
  const title = room.locator('[data-layer="wordmark"]');
  const pause = page.getByRole("button", { name: "暫停動畫" });
  const play = page.getByRole("button", { name: "播放動畫" });
  await expect(sheet).toHaveAttribute("data-loaded", "");
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).backgroundPositionX)).not.toBe("0px");
  await expect.poll(() => title.evaluate(async (el) => {
    for (let i = 0; i < 15; i++) {
      await new Promise(requestAnimationFrame);
      if (getComputedStyle(el).backgroundPositionX !== "0px") return true;
    }
    return false;
  }), { timeout: 11000, intervals: [50] }).toBe(true);
  await page.getByRole("link", { name: "開始冒險", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(pause).toBeFocused();
  await pause.click();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await expect(sheet).toHaveCSS("background-position-x", "0px");
  await expect(title).toHaveCSS("background-position-x", "0px");
  await page.reload();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await play.click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(sheet).toHaveCSS("background-position-x", "0px");
  await expect(title).toHaveCSS("background-position-x", "0px");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    document.body.style.paddingBottom = "200vh";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  });
  await expect(room).not.toBeInViewport();
  await expect(sheet).toHaveCSS("background-position-x", "0px");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).backgroundPositionX)).not.toBe("0px");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pause).toBeHidden();
  await expect(sheet).toHaveCSS("background-position-x", "0px");
  await expect(title).toHaveCSS("background-position-x", "0px");
});

test("storage failure leaves pause and the CTA usable", async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem"]) {
      Object.defineProperty(Storage.prototype, method, { value: () => { throw new Error("blocked"); } });
    }
  });
  await page.goto("/");
  await viewport(page, false).locator("[data-campfire-sheet][data-loaded]").waitFor();
  await page.getByRole("button", { name: "暫停動畫" }).click();
  await expect(page.getByRole("button", { name: "播放動畫" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "開始冒險" })).toHaveAttribute("href", "/register");
});

test("sheet failure preserves the approved static campfire", async ({ page }) => {
  await page.route("**/motion/campfire-desktop.png", (route) => route.abort());
  await page.goto("/");
  const room = viewport(page, false);
  await expect(room.locator('[data-layer="fire"]')).toHaveCSS("background-image", /props\/shared\/campfire-desktop\.png/);
  await expect(room.locator("[data-campfire-sheet]")).not.toHaveAttribute("data-loaded", "");
});

test("session fixture selects the base CTA and logout reload selects registration", async ({ page, context }, info) => {
  await requireBackend();
  await signInWithApiSession(context, uniqueAccounts(info).owner);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "返回基地", exact: true })).toHaveAttribute("href", "/app");
  if (process.env.MIMIC_PHASE_2B_SW === "1") {
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.reload();
    await expect.poll(() => page.evaluate(async () => {
      const cache = await caches.open("mimic-public-pages");
      return Boolean(await cache.match(location.href));
    })).toBe(true);
  }
  const logoutStatus = await page.evaluate(async () => {
    const csrf = await fetch("/api/auth/csrf");
    if (!csrf.ok) return csrf.status;
    const { token } = await csrf.json() as { token: string };
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": token },
    });
    return response.status;
  });
  expect(logoutStatus).toBe(200);
  expect((await context.cookies()).some(({ name }) => name === "mimic_access")).toBe(false);
  if (process.env.MIMIC_PHASE_2B_SW === "1") {
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("link", { name: "返回基地", exact: true })).toHaveAttribute("href", "/app");
    } finally {
      await context.setOffline(false);
    }
  }
  await page.reload();
  await expect(page.getByRole("link", { name: "開始冒險", exact: true })).toHaveAttribute("href", "/register");
});

for (const [width, height] of [[1920, 1080], [390, 844]] as const) {
  test(`capture full-motion review at ${width}×${height}`, async ({ browser, baseURL }, info) => {
    test.skip(!capture, "Enable review capture with MIMIC_PHASE_2B_CAPTURE=1.");
    const directory = path.join(review, "videos-2r");
    await mkdir(directory, { recursive: true });
    const context = await browser.newContext({
      baseURL, viewport: { width, height }, serviceWorkers: "block",
      recordVideo: { dir: info.outputPath("recording"), size: { width, height } },
    });
    const page = await context.newPage();
    const video = page.video()!;
    let completed = false;
    try {
      await page.addInitScript(() => { Math.random = () => 0; });
      await page.goto("/");
      const phone = width === 390;
      const room = viewport(page, phone);
      await page.addStyleTag({ content: screenshotStyle });
      await expect(room.locator("[data-campfire-sheet][data-loaded]")).toHaveCount(1);
      await expect.poll(() => room.locator('[data-layer="wordmark"]').evaluate(async (el) => {
        for (let i = 0; i < 15; i++) {
          await new Promise(requestAnimationFrame);
          if (getComputedStyle(el).backgroundPositionX !== "0px") return true;
        }
        return false;
      }), { timeout: 11000, intervals: [50] }).toBe(true);
      await room.getByRole("button", { name: "蝙蝠" }).click();
      await expect(say(page)).toHaveText(line.bats);
      const bats = room.locator('[data-layer="bats"]');
      await expect(bats).toHaveAttribute("data-flight", "");
      await expect(bats).not.toHaveCSS("transform", "none");
      await expect(bats).not.toHaveAttribute("data-flight", "", { timeout: 3500 });
      await expect(bats).toHaveCSS("transform", "none");
      if (phone) {
        await left(page).click();
        await expect.poll(() => scroll(page)).toBe(0);
      }
      const chest = room.getByRole("button", { name: "舊寶箱" });
      await page.getByRole("button", { name: "暫停動畫" }).click();
      await page.waitForTimeout(650);
      await room.getByRole("button", { name: "火把", exact: true }).first().click();
      const glow = room.locator("[data-torch-glow]");
      const measurement = await glow.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const radius = Number(style.backgroundImage.match(/^radial-gradient\((?:circle )?([\d.]+)px,/)?.[1])
          * box.width / parseFloat(style.width);
        return { x: box.left + box.width / 2, y: box.top + box.height / 2, radius };
      });
      await info.attach("torch-glow", { body: JSON.stringify(measurement), contentType: "application/json" });
      await expect(glow).toHaveCount(0);
      await page.waitForTimeout(350);
      await page.getByRole("button", { name: "播放動畫" }).click();
      await chest.click();
      await expect(chest).toHaveAttribute("aria-pressed", "true");
      await chest.click();
      await expect(chest).toHaveAttribute("aria-pressed", "false");
      if (phone) {
        await right(page).click();
        await expect.poll(() => scroll(page)).toBe(390);
        await right(page).click();
        await expect.poll(() => scroll(page)).toBe(780);
      }
      await room.getByRole("button", { name: "岩壁上的刻痕" }).click();
      await expect(room.locator("[data-carving-revealed]")).toHaveCSS("opacity", "1");
      await page.waitForTimeout(650);
      completed = true;
    } finally {
      await context.close();
      if (completed) await video.saveAs(path.join(directory, `${width}x${height}-interactions.webm`));
    }
  });
}

