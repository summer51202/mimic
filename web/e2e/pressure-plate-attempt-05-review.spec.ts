import {expect,test} from "@playwright/test";
import path from "node:path";
import {pathToFileURL} from "node:url";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test.beforeEach(async({page})=>{await page.goto(pathToFileURL(path.join(dir,"pressure-plate-attempt-05-review.html")).href);});
test("loads all visual evidence at native scale with local scrolling",async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 壓力板 attempt-05");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await page.locator("img").evaluateAll(async imgs=>{await Promise.all(imgs.map(e=>(e as HTMLImageElement).decode()));});
  for(const [selector,w,h] of [['[data-candidate="1"]',96,18],['[data-candidate="4"]',384,72],['[data-gray="1"]',96,18],['[data-gray="4"]',384,72],['[data-previous="1"]',80,18],['[data-previous="4"]',320,72],['[data-guide]',768,144],['[data-guide-overlay]',768,144],['[data-context="1"]',126,90],['[data-context="4"]',504,360]] as const){
    const image=page.locator(selector+" img"),b=(await image.boundingBox())!;expect([b.width,b.height]).toEqual([w,h]);await expect(image).toHaveCSS("image-rendering","pixelated");
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  await expect(page.locator("[data-slope-contract]")).toContainText("左右異號，負向對照未通過");
  await expect(page.locator("[data-colour-contract]")).toContainText("96.25%");expect(errors).toEqual([]);
  await expect(page.locator("[data-title-position-tool], [data-prop-placement-tool], [draggable]")).toHaveCount(0);
  for(const [selector,name] of [['[data-scene="candidate"]',"scene"],['[data-candidate="4"]',"sprite-4x"],['[data-context="4"]',"stairs-4x"],['[data-guide-overlay]',"guide-overlay"],['[data-stair-measurement]',"measurement"]])await page.locator(selector).screenshot({path:info.outputPath(name+".png")});
});
test("opens comparisons and scrolls actual scene with keyboard",async({page},info)=>{
  for(const label of ["960×540 實際 1× 全景（可水平捲動）","attempt-04 桌機全景對照","真實灰階全景"]){const summary=page.getByText(label,{exact:true});await summary.focus();await page.keyboard.press("Enter");await expect(summary.locator("..")).toHaveAttribute("open","");}
  await expect(page.locator('[data-scene="previous"]')).toBeVisible();
  expect(await page.locator("[data-scene-actual] img").evaluate(e=>[(e as HTMLImageElement).width,(e as HTMLImageElement).height])).toEqual([960,540]);
  const frame=page.locator("[data-scene-actual] .scroll"),canScroll=await frame.evaluate(e=>e.scrollWidth>e.clientWidth);
  await frame.evaluate(e=>{e.scrollLeft=e.scrollWidth;});expect(await frame.evaluate(e=>e.scrollLeft>0)).toBe(canScroll);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  await frame.screenshot({path:info.outputPath("actual-scene-right-edge.png")});
});
test("retains raw attempts, prompts and the appearance review stop",async({page})=>{
  await page.getByText("來源、原始嘗試與 prompt",{exact:true}).click();
  await expect(page.locator("a",{hasText:"原始 PNG"})).toHaveCount(3);await expect(page.locator("a",{hasText:"實際 prompt"})).toHaveCount(3);
  await expect(page.getByRole("link",{name:"原 attempt-01～04 lineage（唯讀保留）"})).toHaveCount(1);
  await expect(page.locator("footer")).toContainText("等待使用者選定");await expect(page.locator("footer")).toContainText("未開始 A");
});
