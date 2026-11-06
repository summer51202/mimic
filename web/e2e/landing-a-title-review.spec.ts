import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
const root=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test("A title candidates preserve live UI and share the phone scene", async ({ page },info)=>{
  await page.route("https://a-title-review.local/**",async route=>{
    const file=path.resolve(root,decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/,""));
    if(!file.startsWith(root+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
    try{
      const contentType=file.endsWith(".html")?"text/html; charset=utf-8":file.endsWith(".json")?"application/json":file.endsWith(".png")?"image/png":"text/plain; charset=utf-8";
      await route.fulfill({body:await readFile(file),contentType});
    }catch{await route.fulfill({status:404,body:"Not found"});}
  });
  await page.goto("https://a-title-review.local/landing-a-title-review.html");
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing A — 無法師與標題排列");
  await expect(page.locator("[data-candidate]")).toHaveCount(2);
  await expect(page.locator(".scene")).toHaveCount(3);
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await expect(page.locator(".status")).toContainText("runtimePromotion: false");
  await page.locator("img").evaluateAll(async images=>{
    await Promise.all(images.map(i=>(i as HTMLImageElement).decode()));
    if(images.some(i=>!(i as HTMLImageElement).naturalWidth))throw Error("Missing image");
  });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.locator("img").evaluateAll(images=>images.some(i=>/mage/i.test((i as HTMLImageElement).src)))).toBe(false);
  const m=JSON.parse(await readFile(path.join(root,"landing-a-title.manifest.json"),"utf8"));
  for(const scene of await page.locator(".scene").all()){
    const phone=await scene.evaluate(e=>e.classList.contains("phone")||matchMedia("(max-width:600px)").matches);
    const key=(await scene.getAttribute("data-key"))!;
    const active=phone?"phone-staggered":key;
    const frame=m.frames[active],base=m.scenes[frame.view];
    const imageElement=scene.locator(":scope > picture > img, :scope > img");
    expect(await imageElement.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(frame.color.path.split("2026-09-18-page-visual-phase-1/")[1]);
    expect(await imageElement.evaluate(e=>getComputedStyle(e).filter)).toBe("none");
    const image=(await imageElement.boundingBox())!,dialogue=(await scene.locator(".dialogue").boundingBox())!;
    const title=(await scene.locator(".overlay:visible .title-region").boundingBox())!;
    const [wx,wy,ww,wh]=frame.wall;
    expect(title.x).toBeGreaterThanOrEqual(image.x+wx/frame.logical.width*image.width-.5);
    expect(title.y).toBeGreaterThanOrEqual(image.y+wy/frame.logical.height*image.height-.5);
    expect(title.x+title.width).toBeLessThanOrEqual(image.x+(wx+ww)/frame.logical.width*image.width+.5);
    expect(title.y+title.height).toBeLessThanOrEqual(image.y+(wy+wh)/frame.logical.height*image.height+.5);
    for(const layer of base.layers.filter((l:{id:string})=>["warrior","ranger","mimiku","fire","mapCrate","sign"].includes(l.id))){
      expect(image.y+(layer.y+layer.height)/frame.logical.height*image.height).toBeLessThan(dialogue.y);
    }
    const visitor=(await scene.locator(".visitor-region:visible").boundingBox())!;
    expect(visitor.y+visitor.height).toBeLessThan(dialogue.y);
    const sign=(await scene.locator(".sign-label:visible").boundingBox())!;
    expect(sign.y+sign.height).toBeLessThan(dialogue.y);
    expect(await scene.locator(".dialogue p").evaluate(e=>{
      const range=document.createRange();range.selectNodeContents(e);
      const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);
      const value=selection.toString();selection.removeAllRanges();return value;
    })).toBe("先在火邊歇一會兒。下一段冒險，我陪你。");
    const panel=await scene.locator(".dialogue").evaluate(e=>({h:e.clientHeight,scroll:e.scrollHeight}));
    expect(panel.scroll).toBeLessThanOrEqual(panel.h);
    await expect(scene.locator(".cta")).toBeVisible();
    await expect(scene.locator(".login")).toBeVisible();
    await scene.screenshot({path:info.outputPath(key+"-"+active+".png")});
  }
  await page.keyboard.press("Tab");
  const focused=page.locator(":focus");
  await expect(focused).toBeVisible();
  expect(await focused.evaluate(e=>getComputedStyle(e).outlineWidth)).toBe("3px");
  await page.locator(".scene .cta").first().click();
  await expect(page.locator("#journal")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("#journal");
});
