import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import { brand } from "../src/shared/brand/brand";
import { landingAssetRoot, landingScene } from "../src/shared/brand/landing-scene";

const screenshots = path.resolve(
  "../docs/design/assets/reviews/2026-11-09-phase-2a/screenshots-2r2",
);
const reviewCapture = {
  scale: "css",
  style: "nextjs-portal { visibility: hidden !important; }",
} as const;

test.use({ serviceWorkers: "block" });

for (const [width, height] of [
  [768, 1024], [1280, 720], [1366, 768], [1440, 900], [1536, 864],
  [1920, 1080], [2560, 1440], [360, 780], [390, 844], [430, 932],
] as const) {
  test(`Phase 2A static scene at ${width}×${height}`, async ({ page, browser }, info) => {
    test.skip(info.project.name !== "desktop", "This matrix sets its own viewports.");
    await page.setViewportSize({ width, height });
    const phone = width < 760;
    const variant = phone ? "phone" : "desktop";
    const alternate = phone ? "desktop" : "phone";
    const scene = landingScene[variant];
    const layers = [
      { ...scene.architecture, id: "architecture", x: 0, y: 0, width: scene.width, height: scene.height, depth: -101 },
      ...scene.layers,
    ];
    const requested = new Set<string>();
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith(`${landingAssetRoot}/`)) requested.add(pathname);
    });
    await page.goto("/");

    const stage = page.locator("[data-landing-stage]");
    const viewport = stage.locator(`[data-landing-viewport="${variant}"]`);
    const art = viewport.locator("[data-landing-scene]");
    const heading = page.getByRole("heading", { level: 1, name: brand.productName, exact: true });
    const dialogue = page.getByRole("region", { name: "咪咪庫 / Mimiku" });
    const cta = dialogue.getByRole("link", { name: "開始冒險" });
    const available = await stage.evaluate((node) => ({
      width: node.clientWidth,
      height: window.innerHeight - document.querySelector("header")!.getBoundingClientRect().height,
    }));
    const scale = phone
      ? Math.max(1, Math.floor(available.width / scene.viewportWidth))
      : Math.min(available.width / scene.width, available.height / scene.height);
    const rendering = !phone && scale < 1 ? "auto" : "pixelated";
    const widthLimited = !phone && available.width / scene.width < available.height / scene.height;
    await expect(stage).toHaveAttribute("data-scale", String(scale));
    await expect(stage.locator(`[data-landing-viewport="${alternate}"]`)).toBeHidden();
    await expect(viewport).toBeVisible();
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveAccessibleName(brand.productName);
    await expect(page.getByRole("banner").getByText(brand.productName, { exact: true })).toBeVisible();
    await expect(page.getByRole("contentinfo").getByText(brand.productName, { exact: true })).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/register");
    await expect(art.locator("[data-layer]")).toHaveCount(layers.length);
    for (const layer of layers) {
      const element = art.locator(`[data-layer="${layer.id}"]`);
      const geometry = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.left, style.top, style.width, style.height, style.zIndex, style.imageRendering, style.transform];
      });
      expect(geometry).toEqual([
        ...[layer.x, layer.y, layer.width, layer.height].map((value) => `${value * (phone ? scale : 1)}px`),
        String(layer.depth), rendering, "none",
      ]);
      await expect(element).toHaveAttribute("aria-hidden", "true");
    }
    await expect.poll(() => [...requested].sort()).toEqual([
      ...new Set(layers.map(({ asset_id }) => `${landingAssetRoot}/${asset_id}`)),
      `${landingAssetRoot}/frames/frame-dialogue.png`,
    ].sort());
    const initialScroll = (scene.initialViewportX + Math.floor(Math.max(0, scene.viewportWidth - available.width) / 2)) * scale;
    if (phone) {
      await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBe(initialScroll);
      const artOffset = (await viewport.boundingBox())!.x - (await art.boundingBox())!.x;
      expect(artOffset).toBe(initialScroll);
    }

    const dialogueBox = (await dialogue.boundingBox())!;
    const viewportBox = (await viewport.boundingBox())!;
    const ctaBox = (await cta.boundingBox())!;
    const tagline = dialogue.getByText(brand.tagline, { exact: true });
    const speaker = dialogue.getByText("咪咪庫 / Mimiku", { exact: true });
    const fontSizes = await Promise.all(
      [tagline, speaker, cta].map((node) => node.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))),
    );
    const fontSize = phone || scale < 1 ? 16 : Math.min(24, Math.max(16, 16 * scale / 1.2));
    for (const actual of fontSizes) expect(actual).toBeCloseTo(fontSize, 3);
    const padding = await cta.evaluate((node) => {
      const style = getComputedStyle(node);
      return [parseFloat(style.paddingBlockStart), parseFloat(style.paddingInlineStart)];
    });
    expect(padding[0]).toBeCloseTo(fontSize * 0.25, 3);
    expect(padding[1]).toBeCloseTo(fontSize * 0.65, 3);
    const safeHeight = Math.floor(scene.safeZones.dialogue.height * scale);
    if (phone || dialogueBox.height <= safeHeight) {
      await expect(stage).toHaveAttribute("data-dialogue", "overlay");
      expect(dialogueBox.y).toBeGreaterThanOrEqual(viewportBox.y + viewportBox.height - safeHeight);
      expect(dialogueBox.y + dialogueBox.height).toBeCloseTo(viewportBox.y + viewportBox.height, 4);
    } else {
      await expect(stage).toHaveAttribute("data-dialogue", "flow");
      expect(dialogueBox.y).toBeGreaterThanOrEqual(viewportBox.y + viewportBox.height);
    }
    if (!phone) {
      const copyBox = (await tagline.locator("..").boundingBox())!;
      const midline = dialogueBox.y + dialogueBox.height / 2;
      expect(copyBox.y + copyBox.height / 2).toBeCloseTo(midline, 1);
      expect(ctaBox.y + ctaBox.height / 2).toBeCloseTo(midline, 1);
      if (widthLimited) {
        const heroBox = (await page.locator("[data-landing-hero]").boundingBox())!;
        const featuresBox = (await page.locator("#features").boundingBox())!;
        const flowHeight = dialogueBox.height > safeHeight ? dialogueBox.height : 0;
        expect(viewportBox.y).toBeCloseTo(heroBox.y, 3);
        expect(heroBox.height).toBeCloseTo(viewportBox.height + flowHeight, 3);
        expect(featuresBox.y).toBeCloseTo(heroBox.y + heroBox.height, 3);
      }
      expect(viewportBox.width).toBe(Math.round(scene.width * scale));
      expect(viewportBox.height).toBe(Math.round(scene.height * scale));
      expect(Math.min(
        Math.abs(viewportBox.width - available.width),
        Math.abs(viewportBox.height - available.height),
      )).toBeLessThanOrEqual(1);
      const matrix = await art.evaluate((node) => {
        const transform = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        return [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f];
      });
      expect(matrix[0]).toBeCloseTo(scale, 5);
      expect(matrix[3]).toBeCloseTo(scale, 5);
      expect([matrix[1], matrix[2], matrix[4], matrix[5]]).toEqual([0, 0, 0, 0]);
      await expect(art).toHaveCSS("transform-origin", "0px 0px");
      for (const html of [heading, dialogue, cta]) {
        expect(await html.evaluate((node) => {
          for (let element: Element | null = node; element; element = element.parentElement) {
            if (getComputedStyle(element).transform !== "none") return false;
          }
          return true;
        })).toBe(true);
      }
      const insets = await dialogue.evaluate((node) => {
        const style = getComputedStyle(node);
        return [
          parseFloat(style.paddingInlineStart) + parseFloat(style.borderInlineStartWidth),
          parseFloat(style.paddingBlockStart) + parseFloat(style.borderBlockStartWidth),
        ];
      });
      expect(insets).toEqual([Math.round(54 * scale), Math.round(34 * scale)]);
    }
    expect(ctaBox.width).toBeGreaterThanOrEqual(44);
    expect(ctaBox.height).toBeGreaterThanOrEqual(44);
    expect(await dialogue.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);

    let mimikuCrop;
    if (width === 360) {
      const actor = scene.layers.find((layer) => layer.id === "mimiku")!;
      const actorBox = (await art.locator('[data-layer="mimiku"]').boundingBox())!;
      const left = Math.max(0, viewportBox.x - actorBox.x);
      const right = Math.max(0, actorBox.x + actorBox.width - viewportBox.x - viewportBox.width);
      const visible = actorBox.width - left - right;
      expect(initialScroll).toBe(405);
      expect({ left, right, visible }).toEqual({ left: 0, right: 9, visible: 86 });
      const png = PNG.sync.read(await readFile(path.join("public", landingAssetRoot, actor.asset_id)));
      const clippedColumnsWithAlpha = Array.from({ length: right }, (_, i) => png.width - right + i)
        .filter((x) => Array.from({ length: png.height }, (_, y) => y)
          .some((y) => png.data[(y * png.width + x) * 4 + 3] > 0)).length;
      mimikuCrop = { left, right, visible, clippedColumnsWithAlpha };

      const firstPaint = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height } });
      try {
        await firstPaint.goto(page.url());
        const outer = (await firstPaint.locator('[data-landing-viewport="phone"]').boundingBox())!;
        const inner = (await firstPaint.locator('[data-landing-scene="phone"]').boundingBox())!;
        expect(outer.x - inner.x).toBe(initialScroll);
      } finally {
        await firstPaint.close();
      }
    }

    const prefix = path.join(screenshots, `${width}x${height}`);
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ ...reviewCapture, path: `${prefix}-full.png`, fullPage: true });
    await viewport.screenshot({ ...reviewCapture, path: `${prefix}-stage.png` });
    await info.attach("fit", {
      body: JSON.stringify({ width, height, available, scale, rendering, viewportBox, widthLimited, fontSizes, mimikuCrop }),
      contentType: "application/json",
    });

    if (phone) {
      await viewport.focus();
      await expect(viewport).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => viewport.evaluate((node) => node.scrollLeft))
        .toBeGreaterThan(initialScroll);
      await page.keyboard.press("ArrowLeft");
      await expect.poll(() => viewport.evaluate((node) => node.scrollLeft))
        .toBe(initialScroll);
      expect(await dialogue.boundingBox()).toEqual(dialogueBox);
    }
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press("Tab");
      if (await cta.evaluate((node) => node === document.activeElement)) break;
    }
    await expect(cta).toBeFocused();
    await expect(cta).toHaveCSS("outline-style", "solid");

    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await expect(stage).toHaveAttribute("data-dialogue", "flow");
    const zoomedStage = (await viewport.boundingBox())!;
    expect((await dialogue.boundingBox())!.y).toBeGreaterThanOrEqual(zoomedStage.y + zoomedStage.height);
    await expect(cta).toBeVisible();

    const blocked = new Set<string>();
    await page.route(`**${landingAssetRoot}/**`, (route) => {
      blocked.add(new URL(route.request().url()).pathname);
      return route.abort();
    });
    await page.reload();
    expect(blocked.has(`${landingAssetRoot}/${scene.architecture.asset_id}`)).toBe(true);
    expect(blocked.has(`${landingAssetRoot}/frames/frame-dialogue.png`)).toBe(true);
    await expect(heading).toBeAttached();
    await expect(dialogue.getByText(brand.tagline)).toBeVisible();
    await expect(dialogue).toHaveCSS("border-top-color", "rgb(183, 149, 86)");
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/register$/, { timeout: 30_000 });
  });
}
