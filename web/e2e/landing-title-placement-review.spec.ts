import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test} from "@playwright/test";
const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const fileURL=pathToFileURL(path.join(review,"landing-title-placement-review.html")).href;
test("applied placement page shows independent desktop and phone rasters with live UI",async({page},info)=>{
  expect(existsSync(path.join(review,"landing-title-placement-review.html")),"Applied review HTML required").toBe(true);
  await page.goto(fileURL);
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 已套用標題位置");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await expect(page.locator(".status")).toContainText("runtimePromotion: false");
  await expect(page.locator("[data-title-position-tool]")).toHaveCount(0);
  await expect(page.locator(".scene")).toHaveCount(2);
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  const m=JSON.parse(await readFile(path.join(review,"landing-title-placement.manifest.json"),"utf8"));
  for(const id of ["desktop-single","phone-staggered"]){
    const f=m.frames[id],scene=page.locator('.scene[data-key="'+id+'"]'),img=scene.locator(":scope > picture > img, :scope > img");
    await img.evaluate(e=>(e as HTMLImageElement).decode());
    expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(f.color.path.split("2026-09-18-page-visual-phase-1/")[1]);
    const b=(await img.boundingBox())!;expect(b.width/b.height).toBeCloseTo(f.color.width/f.color.height,2);
    const region=(await scene.locator(".overlay:visible .title-region").boundingBox())!;
    expect(region.x).toBeCloseTo(b.x+f.title.x/f.logical.width*b.width,0);
    expect(region.y).toBeCloseTo(b.y+f.title.y/f.logical.height*b.height,0);
    await expect(scene.locator(".login")).toBeVisible();await expect(scene.locator(".cta")).toBeVisible();
    expect(await scene.locator(".dialogue").evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
    await scene.screenshot({path:info.outputPath(id+"-placed.png")});
  }
  await page.getByText("兩張真實灰階輸出",{exact:true}).click();
  const grays=page.locator(".raws img");await expect(grays).toHaveCount(2);
  await grays.evaluateAll(async images=>{await Promise.all(images.map(i=>(i as HTMLImageElement).decode()));});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.locator('.scene[data-key="phone-staggered"] .cta').click();
  await expect(page.locator("#journal")).toBeInViewport();
});
