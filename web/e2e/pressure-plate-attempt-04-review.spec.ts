import {expect,test} from "@playwright/test";
import path from "node:path";
import {pathToFileURL} from "node:url";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test.beforeEach(async({page})=>{await page.goto(pathToFileURL(path.join(dir,"pressure-plate-v02-attempt-04-review.html")).href);});
test("all evidence loads at native scale without document overflow",async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 壓力板 v02 attempt-04");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await page.locator("img").evaluateAll(async imgs=>{await Promise.all(imgs.map(e=>(e as HTMLImageElement).decode()));});
  for(const [selector,w,h] of [['[data-v02="1"]',80,18],['[data-v02="4"]',320,72],['[data-gray="1"]',80,18],['[data-gray="4"]',320,72],['[data-v01="1"]',67,14],['[data-attempt03="1"]',80,18],['[data-attempt03="4"]',320,72],['[data-front-edge="04"]',640,64]] as const){
    const image=page.locator(selector+" img"),b=(await image.boundingBox())!;
    expect([b.width,b.height]).toEqual([w,h]);await expect(image).toHaveCSS("image-rendering","pixelated");
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  await expect(page.locator("[data-colour-contract]")).toContainText("負向對照未通過 S 門檻");expect(errors).toEqual([]);await expect(page.locator("[data-title-position-tool], [data-prop-placement-tool]")).toHaveCount(0);
  await page.locator('[data-scene="v02"]').screenshot({path:info.outputPath("scene-v02.png")});
  await page.locator('[data-v02="4"]').screenshot({path:info.outputPath("sprite-4x.png")});
  await page.locator('[data-context="v02"]').screenshot({path:info.outputPath("context-v02.png")});
  await page.locator('[data-front-edge="04"]').screenshot({path:info.outputPath("front-edge.png")});
});
test("keyboard exposes old scene, actual-size scene and true grayscale",async({page},info)=>{
  for(const label of ["attempt-03 桌機全景對照","v01 桌機全景對照","960×540 實際 1× 全景（可水平捲動）","真實灰階全景"]){
    const summary=page.getByText(label,{exact:true});await summary.focus();await page.keyboard.press("Enter");await expect(summary.locator("..")).toHaveAttribute("open","");
  }
  await expect(page.locator('[data-scene="v01"]')).toBeVisible();
  const actual=page.locator("[data-scene-actual] img");expect(await actual.evaluate(e=>[(e as HTMLImageElement).width,(e as HTMLImageElement).height])).toEqual([960,540]);
  const frame=page.locator("[data-scene-actual] .scroll");
  const canScroll=await frame.evaluate(e=>e.scrollWidth>e.clientWidth);
  await frame.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
  expect(await frame.evaluate(e=>e.scrollLeft>0)).toBe(canScroll);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  await page.locator('[data-scene="v01"]').screenshot({path:info.outputPath("scene-v01.png")});
  await frame.screenshot({path:info.outputPath("actual-scene-right-edge.png")});
});
test("lineage links keep all originals and state the appearance-only stop",async({page})=>{
  await page.getByText("來源、原始嘗試與 prompt",{exact:true}).click();
  await expect(page.locator("a",{hasText:"原始 PNG"})).toHaveCount(5);
  await expect(page.locator("a",{hasText:"實際 prompt"})).toHaveCount(5);
  await expect(page.locator("footer")).toContainText("未開始 A");
  await expect(page.locator("footer")).toContainText("等待使用者選定");
});
