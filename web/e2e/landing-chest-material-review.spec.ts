import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test} from "@playwright/test";
const dir=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test("compares actual chest sprites and fixed scenes without mobile overflow",async({page},info)=>{
  expect(existsSync(path.join(dir,"landing-chest-material-review.html")),"Chest review HTML required").toBe(true);
  await page.goto(pathToFileURL(path.join(dir,"landing-chest-material-review.html")).href);
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 普通寶箱材質比較");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await expect(page.locator(".status")).toContainText("runtimePromotion: false");
  await expect(page.locator("[data-title-position-tool]")).toHaveCount(0);
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  const m=JSON.parse(await readFile(path.join(dir,"landing-chest-material.manifest.json"),"utf8"));
  for(const img of await page.locator(".material-comparison img").all()){
    await img.evaluate(e=>(e as HTMLImageElement).decode());
    const size=await img.evaluate(e=>({w:(e as HTMLImageElement).naturalWidth,h:(e as HTMLImageElement).naturalHeight}));
    expect(size.w).toBeGreaterThan(0);expect(size.h).toBeGreaterThan(0);
  }
  for(const img of await page.locator(".actual-chest").all()){
    const b=(await img.boundingBox())!;expect([b.width,b.height]).toEqual([78,66]);
  }
  for(const id of ["desktop-before","desktop-after","phone-staggered"]){
    const scene=page.locator('.scene[data-key="'+id+'"]'),img=scene.locator(":scope > picture > img, :scope > img");
    await img.evaluate(e=>(e as HTMLImageElement).decode());
    expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(m.frames[id].color.path.split("2026-09-18-page-visual-phase-1/")[1]);
    const b=(await img.boundingBox())!,f=m.frames[id],region=(await scene.locator(".overlay:visible .title-region").boundingBox())!;
    expect(b.width/b.height).toBeCloseTo(f.color.width/f.color.height,2);
    expect(region.x).toBeCloseTo(b.x+f.title.x/f.logical.width*b.width,0);
    expect(region.y).toBeCloseTo(b.y+f.title.y/f.logical.height*b.height,0);
    await expect(scene.locator(".login")).toBeVisible();await expect(scene.locator(".cta")).toBeVisible();
    expect(await scene.locator(".dialogue").evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
    await scene.screenshot({path:info.outputPath(id+".png")});
  }
  await page.getByText("三張真實灰階場景輸出",{exact:true}).click();
  const grays=page.locator(".scene-grays img");await expect(grays).toHaveCount(3);
  await grays.evaluateAll(async images=>{await Promise.all(images.map(i=>(i as HTMLImageElement).decode()));});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.locator('.scene[data-key="phone-staggered"] .cta').click();
  await expect(page.locator("#journal")).toBeInViewport();
});
