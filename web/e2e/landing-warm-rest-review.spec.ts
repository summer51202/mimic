import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
const root = path.resolve(process.cwd(), "..", "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test("two warm-rest drafts load with live UI and safe ground", async ({ page }, info) => {
  await page.route("https://warm-rest-review.local/**", async route => {
    const file = path.resolve(root,decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/,""));
    if (!file.startsWith(root+path.sep)) { await route.fulfill({ status:403,body:"Forbidden" }); return; }
    try { await route.fulfill({ body:await readFile(file),contentType:file.endsWith(".html") ? "text/html; charset=utf-8" : "image/png" }); }
    catch { await route.fulfill({ status:404,body:"Not found" }); }
  });
  await page.goto("https://warm-rest-review.local/landing-warm-rest-review.html");
  await expect(page.getByRole("heading",{ level:1 })).toHaveText("Landing 暖火休息處 — 構圖比較");
  await expect(page.locator("[data-variant]")).toHaveCount(2);
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.getByText("awaiting-calibration",{ exact:false }).first()).toBeVisible();
  await page.locator("img").evaluateAll(async images => {
    await Promise.all(images.map(i => (i as HTMLImageElement).decode()));
    if (images.some(i => !(i as HTMLImageElement).naturalWidth)) throw Error("Missing image");
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const m = JSON.parse(await readFile(path.join(root,"landing-warm-rest.manifest.json"),"utf8"));
  for (const scene of await page.locator(".scene").all()) {
    const phone = await scene.evaluate(e => e.classList.contains("phone") || matchMedia("(max-width:600px)").matches);
    const variant = await scene.getAttribute("data-id");
    const frame = m.frames[`${variant}-${phone ? "phone" : "desktop"}`];
    const image = (await scene.locator(":scope > picture > img, :scope > img").boundingBox())!;
    const dialogue = (await scene.locator(".dialogue").boundingBox())!;
    const logo = scene.locator(".overlay:visible .logo");
    await expect(logo).toBeVisible();
    const tone = await logo.evaluate(e => getComputedStyle(e).filter);
    expect(tone).toContain("brightness(0.82)"); expect(tone).toContain("saturate(0.72)");
    for (const layer of frame.layers.filter((l: { id:string }) => ["mage","warrior","ranger","mimiku","fire","mapCrate","sign"].includes(l.id))) {
      expect(image.y+(layer.y+layer.height)/frame.logical.height*image.height).toBeLessThan(dialogue.y);
    }
    const join = (await scene.locator(".visitor-region:visible").boundingBox())!;
    expect(join.y+join.height).toBeLessThan(dialogue.y);
    for (const sign of await scene.locator(".sign-label:visible").all()) expect((await sign.boundingBox())!.y+(await sign.boundingBox())!.height).toBeLessThan(dialogue.y);
    const text = scene.locator(".dialogue p");
    expect(await text.evaluate(e => {
      const range = document.createRange(); range.selectNodeContents(e);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      const value = selection.toString(); selection.removeAllRanges(); return value;
    })).toBe("先在火邊歇一會兒。下一段冒險，我陪你。");
    const panel = await scene.locator(".dialogue").evaluate(e => ({ h:e.clientHeight, scroll:e.scrollHeight }));
    expect(panel.scroll).toBeLessThanOrEqual(panel.h);
    await expect(scene.locator(".cta")).toBeVisible();
    await scene.screenshot({ path:info.outputPath(`${variant}-${phone ? "phone" : "desktop"}-${await scene.getAttribute("data-view")}.png`) });
  }
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  expect(await focused.evaluate(e => getComputedStyle(e).outlineWidth)).toBe("3px");
  await page.locator(".scene .cta").first().click();
  await expect(page.locator("#journal")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("#journal");
});
