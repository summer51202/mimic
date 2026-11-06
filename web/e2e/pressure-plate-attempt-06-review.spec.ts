import {expect,test} from "@playwright/test";
import path from "node:path";
import {pathToFileURL} from "node:url";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test.beforeEach(async({page})=>{await page.goto(pathToFileURL(path.join(dir,"pressure-plate-attempt-06-review.html")).href);});
test("loads native-scale evidence and keeps the real tile beside the candidate",async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 壓力板 attempt-06");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await page.locator("img").evaluateAll(async imgs=>{await Promise.all(imgs.map(e=>(e as HTMLImageElement).decode()));});
  for(const [selector,w,h] of [['[data-candidate="1"]',85,35],['[data-candidate="4"]',340,140],['[data-gray="1"]',85,35],['[data-gray="4"]',340,140],['[data-previous="1"]',96,18],['[data-previous="4"]',384,72],['[data-guide]',680,280],['[data-guide-overlay]',680,280],['[data-context="1"]',128,80],['[data-context="4"]',512,320]] as const){const image=page.locator(selector+" img"),b=(await image.boundingBox())!;expect([b.width,b.height]).toEqual([w,h]);await expect(image).toHaveCSS("image-rendering","pixelated");}
  const images=page.locator("[data-tile-comparison] img"),a=(await images.nth(0).boundingBox())!,b=(await images.nth(1).boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(a.x+a.width+20);expect([a.width,a.height,b.width,b.height]).toEqual([340,140,236,120]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);expect(errors).toEqual([]);
  await expect(page.locator("[data-diamond-contract]")).toContainText("負向對照失敗");await expect(page.locator("[data-colour-contract]")).toContainText("0.023946");
  await expect(page.locator("[data-title-position-tool], [data-prop-placement-tool], [draggable]")).toHaveCount(0);
  for(const [selector,name] of [['[data-scene="candidate"]',"scene"],['[data-candidate="4"]',"sprite4x"],['[data-context="4"]',"context4x"],['[data-tile-comparison]',"real-tile-comparison"],['[data-guide-overlay]',"guide-overlay"]])await page.locator(selector).screenshot({path:info.outputPath(name+".png")});
});
test("keyboard opens scene comparisons and local scrollers contain wide evidence",async({page},info)=>{
  for(const label of ["960×540 實際 1× 全景（可水平捲動）","attempt-05 桌機全景對照","真實灰階全景"]){const summary=page.getByText(label,{exact:true});await summary.focus();await page.keyboard.press("Enter");await expect(summary.locator("..")).toHaveAttribute("open","");}
  expect(await page.locator("[data-scene-actual] img").evaluate(e=>[(e as HTMLImageElement).width,(e as HTMLImageElement).height])).toEqual([960,540]);
  for(const selector of ["[data-scene-actual] .scroll","[data-tile-comparison] .scroll","[data-candidate-table]"]){const frame=page.locator(selector),scroll=await frame.evaluate(e=>e.scrollWidth>e.clientWidth);await frame.evaluate(e=>{e.scrollLeft=e.scrollWidth;});expect(await frame.evaluate(e=>e.scrollLeft>0)).toBe(scroll);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  await page.locator("[data-scene-actual] .scroll").screenshot({path:info.outputPath("native-scene-right-edge.png")});
});
test("retains five originals and their values without exposing A controls",async({page})=>{
  await expect(page.locator("[data-candidate-table] tbody tr")).toHaveCount(5);await expect(page.locator("[data-candidate-table]")).toContainText("0.098469");
  await page.getByText("來源、原始嘗試與 prompt",{exact:true}).click();await expect(page.locator("a",{hasText:"原始 PNG"})).toHaveCount(5);await expect(page.locator("a",{hasText:"實際 prompt"})).toHaveCount(5);
  await expect(page.getByRole("link",{name:"原 attempt-01～05 lineage（唯讀保留）"})).toHaveCount(1);await expect(page.locator("footer")).toContainText("等待使用者選定");await expect(page.locator("footer")).toContainText("未開始 A");
});
