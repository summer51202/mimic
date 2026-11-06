import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const reviewRoot = path.resolve(process.cwd(), "..", "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");

test("Landing concept loads with live text and safe framing at every viewport", async ({ page }, testInfo) => {
  await page.route("https://landing-war-room-review.local/**", async (route) => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, "");
    const filename = path.resolve(reviewRoot, relative);
    if (!filename.startsWith(`${reviewRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }
    await route.fulfill({
      status: 200,
      body: await readFile(filename),
      contentType: filename.endsWith(".html") ? "text/html; charset=utf-8" : "image/png",
    });
  });
  await page.goto("https://landing-war-room-review.local/landing-war-room-review.html");
  const widths: Record<string, number> = { "phone-small": 320, phone: 390, tablet: 768, desktop: 1440 };
  expect(page.viewportSize()?.width).toBe(widths[testInfo.project.name]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Landing 作戰會議室");
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.getByText("awaiting-calibration", { exact: false }).first()).toBeVisible();
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    if (images.some((image) => !(image as HTMLImageElement).naturalWidth)) throw new Error("Missing image");
  });
  const result = await page.evaluate(() => {
    const text = document.querySelector(".dialogue p")!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const selected = selection.toString();
    selection.removeAllRanges();
    return {
      selected,
      selectable: getComputedStyle(text).userSelect !== "none",
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.selected).toBe("先在火邊歇一會兒。下一段冒險，我陪你。");
  expect(result.selectable).toBe(true);
  expect(result.overflow).toBeLessThanOrEqual(0);
  const manifest = JSON.parse(await readFile(path.join(reviewRoot, "landing-war-room.manifest.json"), "utf8")) as {
    placements: Record<"desktop" | "phone", { id: string; y: number; height: number }[]>;
  };
  for (const scene of await page.locator(".scene").all()) {
    const dialogue = await scene.locator(".dialogue").boundingBox();
    const logo = scene.getByRole("img", { name: "MIMIC", exact: true });
    await expect(logo).toBeVisible();
    const tone = await logo.evaluate((element) => {
      const style = getComputedStyle(element.parentElement!);
      return { filter: style.filter, opacity: style.opacity };
    });
    // Tone down the approved wood pixels without making them translucent.
    expect(tone.filter).toContain("brightness(0.82)");
    expect(tone.filter).toContain("saturate(0.72)");
    expect(tone.opacity).toBe("1");
    const bounds = await logo.boundingBox();
    const frame = await scene.boundingBox();
    const art = await scene.locator(":scope > img, :scope > picture > img").boundingBox();
    const phone = await scene.evaluate((element) => element.classList.contains("phone") || (element.classList.contains("responsive") && matchMedia("(max-width:600px)").matches));
    const crate = manifest.placements[phone ? "phone" : "desktop"].find(({ id }) => id === "mapCrate")!;
    expect(art!.y + (crate.y + crate.height) / (phone ? 600 : 540) * art!.height).toBeLessThan(dialogue!.y);
    // Upper central wall, above the mage's hat, rather than at the left entrance.
    expect(bounds!.width / art!.width).toBeCloseTo(phone ? 208 / 390 : 288 / 960, 2);
    expect((bounds!.x + bounds!.width / 2 - art!.x) / art!.width).toBeCloseTo(phone ? 200 / 390 : 529 / 960, 2);
    expect((bounds!.x - frame!.x) / frame!.width).toBeGreaterThan(0.14);
    expect((bounds!.x + bounds!.width - frame!.x) / frame!.width).toBeLessThan(0.87);
    expect((bounds!.y - frame!.y) / frame!.height).toBeGreaterThan(0.1);
    expect(bounds!.y + bounds!.height).toBeLessThan(frame!.y + frame!.height * (phone ? 232 / 600 : 185 / 540));
    for (const sign of await scene.locator(".sign-label:visible").all()) {
      const bounds = await sign.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThan(dialogue!.y);
    }
  }
  await page.locator(".scene.responsive").screenshot({ path: testInfo.outputPath("first-viewport.png") });
  await page.locator(".scene.phone").screenshot({ path: testInfo.outputPath("phone-framing.png") });
});
