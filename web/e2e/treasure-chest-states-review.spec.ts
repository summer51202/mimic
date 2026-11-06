import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test} from "@playwright/test";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const url=pathToFileURL(path.join(dir,"treasure-chest-states-review.html")).href;
const ids=["closed","cracked","half-open","open"];
test.beforeEach(async({page})=>{await page.goto(url);await expect(page.locator("[data-chest-preview]")).toHaveAttribute("data-loaded","true");});
test("real sizes, fixed titles, all four scenes and unchanged phone do not overflow",async({page},info)=>{
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 藏寶箱四態比較");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.locator("[data-title-position-tool]")).toHaveCount(0);
  const m=JSON.parse(await readFile(path.join(dir,"treasure-chest-states.manifest.json"),"utf8"));
  for(const img of await page.locator(".state-gallery img,.references img").all())await img.evaluate(e=>(e as HTMLImageElement).decode());
  for(const img of await page.locator(".actual-sprite").all()){
    const b=(await img.boundingBox())!;expect([b.width,b.height]).toEqual([104,120]);
    expect(await img.evaluate(e=>[(e as HTMLImageElement).naturalWidth,(e as HTMLImageElement).naturalHeight])).toEqual([104,120]);
  }
  const scene=page.locator('.scene[data-key="chest-states"]');
  for(const id of ids){
    await page.locator('[data-pick="'+id+'"]').click();await expect(page.locator("[data-current]")).toHaveText(id);
    const img=scene.locator("picture img");await img.evaluate(e=>(e as HTMLImageElement).decode());
    expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(m.frames[id].color.path.split("2026-09-18-page-visual-phase-1/")[1]);
    const b=(await img.boundingBox())!,r=(await scene.locator(".overlay:visible .title-region").boundingBox())!;
    expect(r.x).toBeCloseTo(b.x+376/960*b.width,0);expect(r.y).toBeCloseTo(b.y+100/540*b.height,0);
    const hit=(await scene.locator(".chest-hit").boundingBox())!;
    expect(hit.x).toBeCloseTo(b.x+105/960*b.width,0);expect(hit.y).toBeCloseTo(b.y+284/540*b.height,0);
    await scene.screenshot({path:info.outputPath(id+".png")});
  }
  const phone=page.locator('.scene[data-key="phone-staggered"]'),pi=phone.locator(":scope > picture > img, :scope > img");
  await pi.evaluate(e=>(e as HTMLImageElement).decode());
  expect(await pi.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(m.phone.color.path.split("2026-09-18-page-visual-phase-1/")[1]);
  const pb=(await pi.boundingBox())!,pr=(await phone.locator(".overlay:visible .title-region").boundingBox())!;
  expect(pr.x).toBeCloseTo(pb.x+130/390*pb.width,0);expect(pr.y).toBeCloseTo(pb.y+59/600*pb.height,0);
  await phone.screenshot({path:info.outputPath("phone-unchanged.png")});
  for(const s of [scene,phone]){await expect(s.locator(".login")).toBeVisible();await expect(s.locator(".cta")).toBeVisible();expect(await s.locator(".dialogue").evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);}
  await page.getByText("四張真實灰階場景",{exact:true}).click();
  await page.locator(".scene-grays img").evaluateAll(async images=>{await Promise.all(images.map(i=>(i as HTMLImageElement).decode()));});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await phone.locator(".cta").click();await expect(page.locator("#journal")).toBeInViewport();
});
test("scene hit target, rapid input, keyboard and manual cancellation",async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});
  const host=page.locator("[data-chest-preview]"),hit=host.locator(".chest-hit");
  await hit.click();await expect(host).toHaveAttribute("data-busy","true");
  await hit.evaluate(e=>{(e as HTMLButtonElement).click();(e as HTMLButtonElement).click();});
  await expect(host).toHaveAttribute("data-state","open");await expect(host).toHaveAttribute("data-busy","false");
  await page.waitForTimeout(500);await expect(host).toHaveAttribute("data-state","open");
  await hit.focus();await page.keyboard.press("Enter");await expect(host).toHaveAttribute("data-busy","true");
  await page.locator('[data-pick="cracked"]').click();await page.waitForTimeout(500);
  await expect(host).toHaveAttribute("data-state","cracked");await expect(host).toHaveAttribute("data-busy","false");
  await hit.focus();await page.keyboard.press("Space");await expect(host).toHaveAttribute("data-state","open");
});
test("reduced motion goes directly to terminal states and allows every manual state",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  const host=page.locator("[data-chest-preview]"),hit=host.locator(".chest-hit");
  const immediate=await hit.evaluate(e=>{(e as HTMLButtonElement).click();const h=e.closest("[data-chest-preview]") as HTMLElement;return [h.dataset.state,h.dataset.busy];});
  expect(immediate).toEqual(["open","false"]);
  for(const id of ids){await page.locator('[data-pick="'+id+'"]').click();await expect(host).toHaveAttribute("data-state",id);}
  await hit.click();await expect(host).toHaveAttribute("data-state","closed");await expect(host).toHaveAttribute("data-busy","false");
});
for(const failure of [
  {name:"missing image",src:"samples/treasure-chest-states-v01/does-not-exist.png"},
  {name:"non-image file decode",src:"samples/derivations/treasure-chest-states-v01/prompt.md"},
])test("real "+failure.name+" stops playback and disables only failed frame plus playback",async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});
  const host=page.locator("[data-chest-preview]");await host.locator(".chest-hit").click();
  await host.locator('[data-state-asset="open"]').evaluate((e,src)=>{(e as HTMLImageElement).src=src;},failure.src);
  await expect(host.locator("[data-error]")).toContainText("無法載入：open");
  await expect(host).toHaveAttribute("data-busy","false");await expect(host.locator('[data-pick="open"]')).toBeDisabled();
  for(const b of await host.locator("[data-toggle]").all())await expect(b).toBeDisabled();
  await host.locator('[data-pick="half-open"]').click();await expect(host).toHaveAttribute("data-state","half-open");
  const img=host.locator(".scene picture img");await img.evaluate(e=>(e as HTMLImageElement).decode());
  expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain("half-open-color.png");
});
