import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test} from "@playwright/test";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1"),url=pathToFileURL(path.join(dir,"ancient-treasure-chest-v04-review.html")).href;
const ids=["closed","latch-release","unlatched","cracked","half-open","opening-wide","near-open","open"];
test.beforeEach(async({page})=>{await page.goto(url);await expect(page.locator("[data-chest-preview]")).toHaveAttribute("data-loaded","true");});
test("eight frames, old family, frozen titles and phone render without overflow",async({page},info)=>{
  const m=JSON.parse(await readFile(path.join(dir,"ancient-treasure-chest-v04.manifest.json"),"utf8")),host=page.locator("[data-chest-preview]"),scene=host.locator(".scene"),img=scene.locator("picture img");
  await expect(page.getByRole("heading",{level:1})).toHaveText("Landing — 古老珍藏 v04");
  await expect(page.locator(".status")).toContainText("awaiting-calibration");await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.locator("[data-frame-pick]")).toHaveCount(8);await expect(page.locator("[data-state-asset]")).toHaveCount(8);await expect(page.locator("[data-old-state]")).toHaveCount(4);
  await expect(page.locator("[data-title-position-tool]")).toHaveCount(0);
  await expect(page.locator("[data-v03-comparison]")).toHaveCount(8);
  await expect(page.locator("[data-opening-progress] tbody tr")).toHaveCount(8);
  await expect(page.locator("[data-repair-crop]")).toHaveCount(2);
  await expect(page.locator("[data-repair-gray]")).toHaveCount(2);
  for(const image of await page.locator(".state-gallery img,.references img").all())await image.evaluate(e=>(e as HTMLImageElement).decode());
  for(const image of await page.locator(".actual-sprite").all()){
    const b=(await image.boundingBox())!;expect([b.width,b.height]).toEqual([104,120]);expect(await image.evaluate(e=>[(e as HTMLImageElement).naturalWidth,(e as HTMLImageElement).naturalHeight])).toEqual([104,120]);
  }
  for(const [i,id] of ids.entries()){
    await host.locator('[data-frame-pick="'+id+'"]').click();await expect(host).toHaveAttribute("data-frame",id);
    const state=i===7?"open":i>=4?"half-open":i===3?"cracked":"closed";await expect(host).toHaveAttribute("data-state",state);
    await expect(host.locator('[data-pick="'+state+'"]')).toHaveAttribute("aria-pressed","true");
    await img.evaluate(e=>(e as HTMLImageElement).decode());expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(m.frames[id].color.path.split("2026-09-18-page-visual-phase-1/")[1]);
    const b=(await img.boundingBox())!,title=(await scene.locator(".overlay:visible .title-region").boundingBox())!,hit=(await scene.locator(".chest-hit").boundingBox())!;
    expect(title.x).toBeCloseTo(b.x+376/960*b.width,0);expect(title.y).toBeCloseTo(b.y+100/540*b.height,0);
    expect(hit.x).toBeCloseTo(b.x+105/960*b.width,0);expect(hit.y).toBeCloseTo(b.y+284/540*b.height,0);
    await scene.screenshot({path:info.outputPath(id+".png")});
  }
  const phone=page.locator('.scene[data-key="phone-staggered"]'),pi=phone.locator(":scope > picture > img, :scope > img");await pi.evaluate(e=>(e as HTMLImageElement).decode());
  expect(await pi.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain(m.phone.color.path.split("2026-09-18-page-visual-phase-1/")[1]);
  const pb=(await pi.boundingBox())!,pr=(await phone.locator(".overlay:visible .title-region").boundingBox())!;
  expect(pr.x).toBeCloseTo(pb.x+130/390*pb.width,0);expect(pr.y).toBeCloseTo(pb.y+59/600*pb.height,0);await phone.screenshot({path:info.outputPath("phone-unchanged.png")});
  for(const s of [scene,phone]){await expect(s.locator(".login")).toBeVisible();await expect(s.locator(".cta")).toBeVisible();expect(await s.locator(".dialogue").evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);}
  await page.getByText("四張真實灰階場景",{exact:true}).click();await page.getByText("exact SHA-256 與實際尺寸",{exact:true}).click();
  await page.locator(".scene-grays img").evaluateAll(async images=>{await Promise.all(images.map(i=>(i as HTMLImageElement).decode()));});
  expect(await page.locator(".timing").textContent()).toContain("latch-release");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await phone.locator(".cta").click();await expect(page.locator("#journal")).toBeInViewport();
});
test("opening frame order, repeated input, keyboard close and manual cancellation",async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});const host=page.locator("[data-chest-preview]"),hit=host.locator(".chest-hit");
  await host.evaluate(e=>{const h=e as HTMLElement;h.dataset.trace=h.dataset.frame;new MutationObserver(()=>{h.dataset.trace+=(","+h.dataset.frame);}).observe(h,{attributes:true,attributeFilter:["data-frame"]});});
  await hit.click();await expect(host).toHaveAttribute("data-busy","true");await hit.evaluate(e=>{(e as HTMLButtonElement).click();(e as HTMLButtonElement).click();});
  await expect(host).toHaveAttribute("data-frame","open");await expect(host).toHaveAttribute("data-busy","false");
  const trace=await host.evaluate(e=>((e as HTMLElement).dataset.trace??"").split(",").filter((v,i,a)=>v!==a[i-1]));expect(trace).toEqual(ids);
  await page.waitForTimeout(800);await expect(host).toHaveAttribute("data-frame","open");
  await hit.focus();await page.keyboard.press("Enter");await expect(host).toHaveAttribute("data-frame","closed");
  await hit.click();await host.locator('[data-frame-pick="cracked"]').click();await page.waitForTimeout(850);
  await expect(host).toHaveAttribute("data-frame","cracked");await expect(host).toHaveAttribute("data-busy","false");
  await hit.focus();await page.keyboard.press("Space");await expect(host).toHaveAttribute("data-frame","open");
});
test("reduced motion switches directly and every frame remains manually inspectable",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});const host=page.locator("[data-chest-preview]"),hit=host.locator(".chest-hit");
  const result=await hit.evaluate(e=>{(e as HTMLButtonElement).click();const h=e.closest("[data-chest-preview]") as HTMLElement;return [h.dataset.state,h.dataset.frame,h.dataset.busy];});
  expect(result).toEqual(["open","open","false"]);
  for(const id of ids){await host.locator('[data-frame-pick="'+id+'"]').click();await expect(host).toHaveAttribute("data-frame",id);}
  await hit.click();await expect(host).toHaveAttribute("data-frame","closed");await expect(host).toHaveAttribute("data-busy","false");
});
for(const failure of [
  {name:"missing intermediate",src:"samples/treasure-chest-states-v04/does-not-exist.png"},
  {name:"non-image intermediate",src:"samples/derivations/treasure-chest-states-v04/prompt.md"},
])test(failure.name+" stops playback without disabling other manual frames",async({page})=>{
  await page.emulateMedia({reducedMotion:"no-preference"});const host=page.locator("[data-chest-preview]");await host.locator(".chest-hit").click();
  await host.locator('[data-state-asset="near-open"]').evaluate((e,src)=>{(e as HTMLImageElement).src=src;},failure.src);
  await expect(host.locator("[data-error]")).toContainText("無法載入：near-open");await expect(host).toHaveAttribute("data-busy","false");
  await expect(host.locator('[data-frame-pick="near-open"]')).toBeDisabled();for(const b of await host.locator("[data-toggle]").all())await expect(b).toBeDisabled();
  await host.locator('[data-frame-pick="half-open"]').click();await expect(host).toHaveAttribute("data-frame","half-open");
  const img=host.locator(".scene picture img");await expect(img).toBeVisible();await img.evaluate(e=>(e as HTMLImageElement).decode());expect(await img.evaluate(e=>(e as HTMLImageElement).currentSrc)).toContain("half-open-color.png");
});
test("failure of the displayed frame hides stale pixels without changing scene geometry",async({page})=>{
  const host=page.locator("[data-chest-preview]"),img=host.locator(".scene picture img");await host.locator('[data-frame-pick="open"]').click();const before=(await img.boundingBox())!;
  await host.locator('[data-state-asset="open"]').evaluate(e=>{(e as HTMLImageElement).src="samples/derivations/treasure-chest-states-v04/prompt.md";});
  await expect(host.locator("[data-error]")).toContainText("無法載入：open");await expect(img).toHaveCSS("visibility","hidden");
  const after=(await img.boundingBox())!;expect([after.width,after.height]).toEqual([before.width,before.height]);
  await expect(host.locator('[data-pick="open"]')).toBeDisabled();await host.locator('[data-pick="closed"]').click();await expect(img).toBeVisible();await expect(host).toHaveAttribute("data-frame","closed");
});
test("review evidence uses actual pixel crops and readable measured comparison",async({page},info)=>{
  const progress=page.locator("[data-opening-progress]");await expect(progress.locator("tbody tr")).toHaveCount(8);
  await progress.screenshot({path:info.outputPath("opening-progress.png")});
  for(const attr of ["data-repair-crop","data-repair-gray"])for(const scale of [1,4]){
    const crop=page.locator('['+attr+'="'+scale+'"]'),img=crop.locator("img");
    await img.evaluate(e=>(e as HTMLImageElement).decode());
    const b=(await crop.boundingBox())!;expect([b.width,b.height]).toEqual([31*scale,23*scale]);
    await expect(img).toHaveCSS("image-rendering","pixelated");
    await expect(img).toHaveCSS("left",-15*scale+"px");await expect(img).toHaveCSS("top",-96*scale+"px");
  }
  await page.locator(".repair-review").screenshot({path:info.outputPath("repair-detail.png")});
  await page.getByText("原場景與 v03 桌機場景對照",{exact:true}).click();
  await expect(page.locator("[data-original-scene]")).toBeVisible();await expect(page.locator("[data-v03-scene]")).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
});
