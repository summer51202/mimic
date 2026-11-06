import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { PNG } from "pngjs";

const review = pathToFileURL(path.resolve(
  "../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/frames-calibration-review.html",
)).href;
const cornerSize = 28;

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(0);
}

test("paints the frame family around live content and keeps the page within its viewport", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => errors.push(request.url()));
  await page.goto(review);
  await expect(page.locator(".proof-row .frame")).toHaveCount(30);
  await expect(page.locator(".task-list .status")).toHaveText(["待處理", "進行中", "已完成"]);
  await expect(page.locator("#ledger td").nth(1)).toHaveCSS("font-variant-numeric", "tabular-nums");
  await expect(page.locator("#ledger td").nth(1)).toHaveCSS("text-align", "right");
  await expectNoOverflow(page);
  const contrast = await page.evaluate(() => {
    const pairs = [
      ["#parchment .prose", "#parchment .prose", 7], [".profile dt", "#parchment .duo .frame", 4.5],
      ["#settings h3", "#stone .frame", 7], ["#settings .muted", "#stone .frame", 4.5],
      [".scene .frame", ".scene .frame", 7], [".scene .cta", ".scene .cta", 4.5],
      [".task-list .status", ".task-list li", 4.5], [".proof-row .frame--notebook", ".proof-row .frame--notebook", 7],
      ["#compare-sample", "#compare-sample", 4.5],
    ] as const;
    const luminance = (rgb: string) => {
      const channels = rgb.match(/\d+/g)!.slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    return pairs.map(([text, field, minimum]) => {
      const a = luminance(getComputedStyle(document.querySelector(text)!).color);
      const b = luminance(getComputedStyle(document.querySelector(field)!).backgroundColor);
      return { text, minimum, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  for (const pair of contrast) expect(pair.ratio, pair.text).toBeGreaterThanOrEqual(pair.minimum);

  const allFrames = await page.locator(".frame:visible:not(.frame--v1)").evaluateAll(frames => frames.map(frame => {
    const style = getComputedStyle(frame);
    const proof = frame.closest<HTMLElement>(".proof-row");
    return {
      source: style.borderImageSource,
      slice: style.borderImageSlice,
      repeat: style.borderImageRepeat,
      edge: style.borderImageWidth,
      border: style.borderTopWidth,
      padding: Number.parseFloat(style.paddingLeft),
      minimumPadding: frame.closest(".scene--phone") ||
        (frame.closest(".scene") ?? frame.closest("main"))!.clientWidth <= 580 ? 18 : 26,
      imageRendering: style.imageRendering,
      background: style.backgroundImage,
      width: frame.getBoundingClientRect().width,
      expectedWidth: proof && Math.min(proof.clientWidth, Number(proof.dataset.width)),
    };
  }));
  for (const frame of allFrames) {
    expect(frame.source).toMatch(/frames-2r\/frame-(parchment|wood|stone|dialogue|notebook)\.png/);
    expect([frame.slice, frame.repeat, frame.edge, frame.border]).toEqual(["14", "repeat", "28px", "28px"]);
    expect(frame.padding).toBeGreaterThanOrEqual(frame.minimumPadding);
    expect(frame.imageRendering).toBe("pixelated");
    expect(frame.background).toBe("none");
    if (frame.expectedWidth !== null) expect(frame.width).toBeCloseTo(frame.expectedWidth);
  }

  // Align the capture grid to CSS pixels so screenshot clipping adds no partial rows.
  await page.locator("#proof-grid").evaluate((grid: HTMLElement) => {
    const top = grid.getBoundingClientRect().top + scrollY;
    grid.style.position = "relative";
    grid.style.top = `${Math.round(top) - top}px`;
  });
  // Compare the four painted corner tiles in all 30 size specimens.
  for (const family of ["parchment", "wood", "stone", "dialogue", "notebook"]) {
    const corners = [];
    for (const frame of await page.locator(`.proof-row .frame--${family}`).all()) {
      const shot = PNG.sync.read(await frame.screenshot({ scale: "css" }));
      const pixels: Buffer[] = [];
      for (const y of [0, shot.height - cornerSize]) {
        for (const x of [0, shot.width - cornerSize]) {
          for (let row = y; row < y + cornerSize; row++) {
            const start = (row * shot.width + x) * 4;
            pixels.push(shot.data.subarray(start, start + cornerSize * 4));
          }
        }
      }
      corners.push(Buffer.concat(pixels).toString("base64"));
    }
    expect(new Set(corners).size, family).toBe(1);
  }
  for (const scene of await page.locator("[data-scene]").all()) {
    const layout = await scene.evaluate(element => {
      const frame = element.querySelector(".frame")!;
      const box = frame.getBoundingClientRect();
      const style = getComputedStyle(frame);
      const inset = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop);
      return {
        ratio: box.height / element.getBoundingClientRect().height,
        fits: Array.from(frame.children).every(child => {
          const inner = child.getBoundingClientRect();
          return inner.top >= box.top + inset - 1 && inner.bottom <= box.bottom - inset + 1;
        }),
      };
    });
    const phone = (await scene.getAttribute("data-scene"))?.endsWith("phone");
    expect(layout.ratio).toBeGreaterThanOrEqual(phone ? .25 : .18);
    expect(layout.ratio).toBeLessThanOrEqual(phone ? .30 : .2201);
    expect(layout.fits, await scene.getAttribute("data-scene") ?? "").toBe(true);
  }
  const strip = page.getByRole("region", { name: /洞窟探索/ });
  await strip.focus();
  const before = await strip.evaluate(element => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => strip.evaluate(element => element.scrollLeft)).toBeGreaterThan(before);
  await strip.evaluate(element => (element as HTMLElement).blur());
  await page.locator("img").evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  expect(errors).toEqual([]);

  await page.locator("#parchment").screenshot({ path: info.outputPath("parchment.png") });
  await page.locator('[data-scene="Landing-phone"]').screenshot({ path: info.outputPath("dialogue.png") });
  const { width, height } = page.viewportSize()!;
  // Emulate 200% layout zoom at the same effective CSS viewport.
  await page.setViewportSize({ width: width * 2, height: height * 2 });
  await page.addStyleTag({ content: "html { zoom: 2; }" });
  await expectNoOverflow(page);
  expect(await page.locator(".proof-row .frame").first().evaluate(frame => frame.getBoundingClientRect().width)).toBe(560);
  await page.getByRole("button", { name: "開啟快速記帳" }).click();
  const zoomedDialog = page.getByRole("dialog");
  expect((await zoomedDialog.boundingBox())?.width).toBe(width <= 600 ? 2 * width : 880);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ forcedColors: "active" });
  const fallback = page.locator(".proof-row .frame").first();
  await expect(fallback).toHaveCSS("border-image-source", "none");
  await expect(fallback).toHaveCSS("border-top-style", "solid");
  await expect(fallback).toHaveCSS("border-top-width", "28px");
});

test("the settings and notebook fixtures accept keyboard and form interaction", async ({ page }, info) => {
  await page.goto(review);
  const display = page.getByLabel("顯示名稱");
  await display.fill("營地隊長");
  await display.press("Tab");
  const readOnly = page.getByLabel("冒險者 ID（唯讀）");
  await expect(readOnly).toBeFocused();
  await expect(readOnly).toHaveCSS("outline-style", "solid");
  await expect(readOnly).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "儲存示範設定" }).click();
  await expect(page.locator("#settings output")).toHaveText("示範設定已更新。");

  const trigger = page.getByRole("button", { name: "開啟快速記帳" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "快速記帳" });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x + box.width).toBeCloseTo(viewport.width);
  expect(box.y + box.height).toBeCloseTo(viewport.height);
  expect(box.x).toBe(viewport.width <= 600 ? 0 : viewport.width - 440);
  const submit = dialog.getByRole("button", { name: "送出示範記錄" });
  await submit.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("金額")).toBeFocused();
  await dialog.screenshot({ path: info.outputPath("notebook.png") });
  await dialog.getByLabel("金額").fill("19.95");
  await dialog.getByLabel("分類").selectOption("交通");
  await submit.click();
  await expect(dialog.locator("output")).toHaveText("已送出示範記錄。");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  const heights = await page.locator("button:visible, input:visible, select:visible, a:visible").evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  const comparison = page.locator("#compare");
  const picker = comparison.getByLabel("比較樣本");
  const options = await picker.locator("option").evaluateAll(items => items.map(item => (item as HTMLOptionElement).value));
  expect(options).toHaveLength(8);
  for (const option of options) {
    await picker.selectOption(option);
    const [before, after] = await comparison.locator("figure").evaluateAll(figures => figures.map(figure => {
      const frame = figure.querySelector(".frame")!;
      const specimen = figure.lastElementChild!;
      const { width, height, x, y } = specimen.getBoundingClientRect();
      return {
        width, height, x, y,
        content: specimen.textContent,
        images: Array.from(specimen.querySelectorAll("img"), image => image.getAttribute("src")),
        source: getComputedStyle(frame).borderImageSource,
      };
    }));
    expect(before.source).toContain("/samples/frames/frame-");
    expect(after.source).toContain("/samples/frames-2r/frame-");
    expect(before.width).toBeCloseTo(after.width);
    expect(before.height).toBeCloseTo(after.height);
    expect(before.content).toBe(after.content);
    expect(before.images).toEqual(after.images);
    if (viewport.width > 652) {
      expect(before.y).toBe(after.y);
      expect(before.x).toBeLessThan(after.x);
    } else {
      expect(before.x).toBe(after.x);
      expect(before.y).toBeLessThan(after.y);
    }
    await expectNoOverflow(page);
    if (["wood", "Landing-phone"].includes(option)) {
      await comparison.screenshot({ path: info.outputPath(`compare-${option}.png`) });
    }
  }
});
