# Landing Title Placement Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Checkbox steps track execution. The user chose Inline: no subagents, worktrees or execution-mode questions.

**Goal:** Apply the user's confirmed desktop 376/100 and phone 130/59 coordinates to review-only color/grayscale PNGs, preserving every prior artifact and runtime file.

**Architecture:** Read the original title-free scenes and fixed transparent title rasters. Validate the complete two-frame user receipts against source identities and logical bounds, then make new versioned composites and a derivative manifest/review page. Reuse the existing review renderer and live overlays; no source drawing, retone, crop or asset promotion.

**Tech Stack:** Existing ESM/Node, pngjs, static review renderer, pure position model, Vitest, Playwright Chromium, ESLint and TypeScript.

**Approval:** User pasted both receipts, then answered「OK」to applying both placements and re-exporting review color/grayscale with all other elements/runtime unchanged. This is deterministic application of existing approved design/placement feedback, not a new creative direction. Original positioning specs defer application until this separate authority; that authority is now present.

---

## Boundaries and protection

- Current main, dirty user index and prior untracked work remain untouched.
- New confirmation page is `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-placement-review.html`; original review/tool/config/manifest/rasters remain byte-identical. This preserves old evidence and avoids mixing earlier modifications.
- No ImageGen source edit: reuse exact existing ImageGen-derived rasters, without redrawing or altering alpha/material style.
- New rasters only in `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-placement-v01/`.
- Only existing mutable file is `.agents/devlog.md`, appended after implementation. No registry/public/PWA/SW/runtime/product/Home/accounting/production exports/Phase 2 writes; no Scenes approval.
- Fresh execution snapshot `titlePlacementBaseline`: 1295 immutable files, aggregate `8da98e30385eaa2a96b9c5939d7f5b26d2840129a4ec2e40c279e149e0e7de31`, web/public `418a4ad0c6f396c19a89d62746b760a7bb0224e7b8bb567e2e7e14a412e30beb`, original devlog prefix 188240 bytes. Compare original staged binary diff and original devlog prefix. Exclude only the new paths in this plan during recomputation.
- Only this independent new plan can be committed by exact path; all implementation artifacts remain unstaged at the checkpoint.

## File map

Create:
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-placement.receipts.json`: verbatim semantic user receipts, no asset approval flag.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs`: full receipt/source validation, bounded composition, scale/grayscale, provenance and idempotent own-artifact guard.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-placement.manifest.json`: generated derivative of original metadata, only selected frames' position/output records differ.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-placement-review.html`: generated, two selected frames, live overlays/journal, real gray, no draggable tool or unchosen candidate.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-placement-v01/`: six actual PNGs (logical/color/gray for each frame); eight new viewport screenshots.
- `web/src/shared/brand/landing-title-placement.test.ts`: receipt, pixel/export/source and overwrite-protection contracts.
- `web/e2e/landing-title-placement-review.spec.ts`: four-viewport independent frame/UI/image/source/gray contract.
- `web/e2e/landing-title-placement.playwright.config.ts`: new combined config includes all prior 112 cases without modifying their files.
- `docs/superpowers/plans/2026-10-14-landing-title-placement-application.md`: this plan.

Modify only `.agents/devlog.md` after implementation; do not touch `.codex-remote-attachments/` or `reference/`.

## Task 1: Capture user receipts and failing contracts

- [ ] Create the receipt file with exactly:
```json
{
  "schema": "mimic-landing-title-placement/v1",
  "reviewOnly": true,
  "runtimePromotion": false,
  "positions": {
    "desktop-single": {
      "schema": "mimic-landing-title-position/v1",
      "reviewOnly": true,
      "frame": {
        "id": "desktop-single",
        "width": 960,
        "height": 540
      },
      "scene": {
        "path": "samples/landing-a-title/scene-desktop-logical.png",
        "sha256": "ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e"
      },
      "title": {
        "path": "samples/landing-a-title/wordmarks/desktop-single.png",
        "sha256": "4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31",
        "x": 376,
        "y": 100,
        "width": 288,
        "height": 84
      },
      "anchor": "top-left",
      "unit": "logical-px",
      "centerPercent": {
        "x": 54.17,
        "y": 26.3
      }
    },
    "phone-staggered": {
      "schema": "mimic-landing-title-position/v1",
      "reviewOnly": true,
      "frame": {
        "id": "phone-staggered",
        "width": 390,
        "height": 600
      },
      "scene": {
        "path": "samples/landing-a-title/scene-phone-logical.png",
        "sha256": "7573dceb82c484c223164d26e4fc6514f65ee2149d65001bba0e9a2a824f693d"
      },
      "title": {
        "path": "samples/landing-a-title/wordmarks/phone-staggered.png",
        "sha256": "8fd7d677df46cc77478518de2a9f68ff77b8ae4d28deb25e6b11ad5ba6ee8f1c",
        "x": 130,
        "y": 59,
        "width": 148,
        "height": 98
      },
      "anchor": "top-left",
      "unit": "logical-px",
      "centerPercent": {
        "x": 52.31,
        "y": 18
      }
    }
  }
}
```
- [ ] Create `web/src/shared/brand/landing-title-placement.test.ts`:
```ts
import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it} from "vitest";
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",review=path.join(root,prefix);
type Asset={path:string;sha256:string;width:number;height:number};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
async function load(){
  const file=path.join(review,"landing-title-placement.manifest.json");
  expect(existsSync(file),"Applied placement manifest required").toBe(true);
  return JSON.parse(await readFile(file,"utf8"));
}
async function parent(){return JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));}
async function png(a:Asset){
  const bytes=await readFile(path.join(root,a.path));expect(hash(bytes)).toBe(a.sha256);
  const p=PNG.sync.read(bytes);expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function module(){
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs") as {
    validateReceipt:(r:unknown,id:string,parent:Record<string,unknown>)=>{x:number;y:number};
    composePlacement:()=>Promise<unknown>;
  };
}
const positions={"desktop-single":{x:376,y:100},"phone-staggered":{x:130,y:59}};
it("applies exactly the two user receipts without promoting assets or changing the parent",async()=>{
  const m=await load(),old=await parent();
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false});
  expect(m.scenes).toEqual(old.scenes);expect(m.sources).toEqual(old.sources);expect(m.references).toEqual(old.references);
  expect(m.wordmarkTone).toEqual(old.wordmarkTone);expect(m.wordmarks).toEqual(old.wordmarks);expect(m.lineage).toEqual(old.lineage);
  expect(m.frames["desktop-staggered"]).toEqual(old.frames["desktop-staggered"]);
  expect(m.placement.authorization).toBe("position-application-only");
  for(const [id,position] of Object.entries(positions)){
    expect(m.frames[id].title).toEqual({...old.frames[id].title,...position});
    expect(m.frames[id].wall).toEqual([position.x,position.y,old.frames[id].title.width,old.frames[id].title.height]);
  }
  for(const a of [m.placement.parent,m.placement.receipts,m.placement.generator,m.placement.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  expect(hash(await readFile(path.join(review,"landing-a-title.manifest.json")))).toBe("ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7");
  expect(hash(await readFile(path.join(review,"landing-a-title-review.html")))).toBe("9f984049ef16e8c08c6e2bedc890c70e13c62c9d5793926a3ed79aec1ae1ca33");
});
it("logical pixels equal untouched base plus the same transparent title at the chosen position",async()=>{
  const m=await load();
  for(const [id,{x,y}] of Object.entries(positions)){
    const f=m.frames[id],base=await png(m.scenes[f.view].logical),sprite=await png(f.title),actual=await png(f.logical);
    const rebuilt=Buffer.from(base.data);let dirty=0,partial=0,transparent=0;
    for(let i=0;i<sprite.data.length;i+=4){
      if(!sprite.data[i+3]){transparent++;if(sprite.data[i]||sprite.data[i+1]||sprite.data[i+2])dirty++;}
      if(sprite.data[i+3]!==0&&sprite.data[i+3]!==255)partial++;
    }
    expect(transparent).toBeGreaterThan(0);expect(dirty).toBe(0);expect(partial).toBe(0);
    for(let sy=0;sy<sprite.height;sy++)for(let sx=0;sx<sprite.width;sx++){
      const si=(sy*sprite.width+sx)*4,di=((y+sy)*base.width+x+sx)*4,a=sprite.data[si+3]/255;
      if(!a)continue;
      for(let c=0;c<3;c++)rebuilt[di+c]=Math.round(sprite.data[si+c]*a+rebuilt[di+c]*(1-a));
      rebuilt[di+3]=255;
    }
    expect(actual.data.equals(rebuilt)).toBe(true);
  }
});
it("six actual exports have exact sizes, nearest-neighbor scale, genuine gray and hashes",async()=>{
  const m=await load();
  for(const id of Object.keys(positions)){
    const f=m.frames[id],logical=await png(f.logical),color=await png(f.color),gray=await png(f.gray),scale=f.view==="desktop"?2:1;
    expect([color.width,color.height]).toEqual(f.view==="desktop"?[1920,1080]:[390,600]);
    expect([gray.width,gray.height]).toEqual([color.width,color.height]);
    let wrong=0;
    for(let y=0;y<color.height;y++)for(let x=0;x<color.width;x++){
      const i=(y*color.width+x)*4,j=(Math.floor(y/scale)*logical.width+Math.floor(x/scale))*4;
      if(!color.data.subarray(i,i+4).equals(logical.data.subarray(j,j+4)))wrong++;
      const v=Math.round((2126*color.data[i]+7152*color.data[i+1]+722*color.data[i+2])/10000);
      if(gray.data[i]!==v||gray.data[i+1]!==v||gray.data[i+2]!==v||gray.data[i+3]!==color.data[i+3])wrong++;
    }
    expect(wrong).toBe(0);
    expect(f.logical.path).toContain("/samples/landing-title-placement-v01/");
  }
});
it("validates full receipt identity, units, dimensions, bounds and center before writing",async()=>{
  const m=await parent(),receipts=JSON.parse(await readFile(path.join(review,"landing-title-placement.receipts.json"),"utf8"));
  const {validateReceipt}=await module();
  for(const [id,position] of Object.entries(positions))expect(validateReceipt(receipts.positions[id],id,m)).toEqual(position);
  const r=receipts.positions["phone-staggered"];
  for(const bad of [
    {...r,frame:{...r.frame,id:"desktop-single"}},{...r,frame:{...r.frame,width:960}},
    {...r,title:{...r.title,x:243}},{...r,title:{...r.title,y:-1}},{...r,title:{...r.title,x:NaN}},
    {...r,title:{...r.title,width:149}},{...r,centerPercent:{x:52.31,y:19}},
    {...r,scene:{...r.scene,sha256:"0".repeat(64)}},{...r,title:{...r.title,path:"reference/unknown.png"}},
    {...r,unit:"viewport-px"},{...r,runtimePromotion:true},
  ])expect(()=>validateReceipt(bad,"phone-staggered",m)).toThrow();
  expect(()=>validateReceipt(r,"desktop-staggered",m)).toThrow();
});
it("refuses to overwrite a modified task artifact and leaves it intact until test restoration",async()=>{
  const m=await load(),target=path.join(root,m.frames["phone-staggered"].color.path);
  const original=await readFile(target),tampered=Buffer.concat([original,Buffer.from([0])]);
  const {composePlacement}=await module();
  try{
    await writeFile(target,tampered);
    await expect(composePlacement()).rejects.toThrow("Existing placement artifact modified");
    expect((await readFile(target)).equals(tampered)).toBe(true);
  }finally{await writeFile(target,original);}
  expect(hash(await readFile(target))).toBe(m.frames["phone-staggered"].color.sha256);
});
```
- [ ] Create `web/e2e/landing-title-placement-review.spec.ts`:
```ts
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
```
- [ ] Create `web/e2e/landing-title-placement.playwright.config.ts`:
```ts
import {defineConfig} from "@playwright/test";
export default defineConfig({
  testDir:".",testMatch:["landing-title-placement-review.spec.ts","landing-title-positioning-review.spec.ts","landing-mobile-title-positioning-review.spec.ts","landing-a-title-review.spec.ts"],
  workers:1,timeout:60_000,
  projects:[
    {name:"phone-small",use:{viewport:{width:320,height:568}}},
    {name:"phone",use:{viewport:{width:390,height:844}}},
    {name:"tablet",use:{viewport:{width:768,height:1024}}},
    {name:"desktop",use:{viewport:{width:1440,height:900}}},
  ],
});
```
- [ ] From `web/`, run `npm test -- src/shared/brand/landing-title-placement.test.ts`. Expected RED: absent applied manifest and missing new validator/composer module (five failures), not syntax/setup errors.
- [ ] From `web/`, run `npx playwright test --config=e2e/landing-title-placement.playwright.config.ts landing-title-placement-review.spec.ts`. Expected four failures with “Applied review HTML required”. Capture these before implementing.
- [ ] This test suite temporarily tampers ONLY a new task-owned PNG and restores its exact bytes in finally to prove overwrite refusal. Never use it on user source rasters. Do not run browser source checks concurrently with this mutation test.

## Task 2: Minimal deterministic application

- [ ] Only after RED, create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs`:
```js
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {createPositionModel} from "./landing-title-position.model.mjs";
import {renderReview} from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
const relative=file=>path.relative(repo,file).replaceAll("\\","/");
const targets={"desktop-single":[376,100],"phone-staggered":[130,59]};
const parentHash="ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7";
const manifestFile=path.join(dir,"landing-title-placement.manifest.json");
const htmlFile=path.join(dir,"landing-title-placement-review.html");
const receiptFile=path.join(dir,"landing-title-placement.receipts.json");

export function validateReceipt(receipt,id,parent){
  if(!Object.hasOwn(targets,id))throw Error("Unsupported placement frame");
  const frame=parent.frames[id],scene=parent.scenes[frame.view].logical;
  const model=createPositionModel({frame:{id,width:scene.width,height:scene.height},
    scene:{...scene,path:rel(scene)},title:{...frame.title,path:rel(frame.title)}});
  if(!receipt||!Number.isInteger(receipt.title?.x)||!Number.isInteger(receipt.title?.y)||
     !isDeepStrictEqual(receipt,model.payload({x:receipt.title.x,y:receipt.title.y})))throw Error("Receipt does not match source, frame or logical coordinates");
  return {x:receipt.title.x,y:receipt.title.y};
}
async function checked(a){
  const file=path.resolve(repo,a.path);
  if(!file.startsWith(dir+path.sep))throw Error("Source outside review");
  const b=await readFile(file),p=PNG.sync.read(b);
  if(hash(b)!==a.sha256||p.width!==a.width||p.height!==a.height)throw Error("Changed positioning source: "+a.path);
  return p;
}
function overlay(base,sprite,x,y){
  const out=new PNG({width:base.width,height:base.height});out.data.set(base.data);
  if(x<0||y<0||x+sprite.width>base.width||y+sprite.height>base.height)throw Error("Clipped title");
  for(let sy=0;sy<sprite.height;sy++)for(let sx=0;sx<sprite.width;sx++){
    const si=(sy*sprite.width+sx)*4,di=((y+sy)*out.width+x+sx)*4,a=sprite.data[si+3]/255;
    if(!a)continue;
    for(let c=0;c<3;c++)out.data[di+c]=Math.round(sprite.data[si+c]*a+out.data[di+c]*(1-a));
    out.data[di+3]=255;
  }
  return out;
}
function scale2(p){
  const out=new PNG({width:p.width*2,height:p.height*2});
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
    const i=(y*out.width+x)*4,j=(Math.floor(y/2)*p.width+Math.floor(x/2))*4;
    out.data.set(p.data.subarray(j,j+4),i);
  }
  return out;
}
function grayscale(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){
    const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
    out.data.set([v,v,v,p.data[i+3]],i);
  }
  return out;
}
function renderPlaced(m,previous){
  let html=renderReview(m,previous);
  const heading="Landing — 已套用標題位置";
  html=html.replaceAll("Landing A — 無法師與標題排列",heading);
  const start=html.indexOf("<body><main>"),cards=html.indexOf('<div class="candidates">',start);
  if(start<0||cards<0)throw Error("Missing review insertion boundary");
  const intro='<h1>'+heading+'</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false</p><p>桌機單行：左上 376／100，尺寸 288×84；手機 MI／MIC：左上 130／59，尺寸 148×98。兩個版本各用自己的場景座標。</p><p>本頁彩色與灰階 PNG 已套入指定位置。只改標題落點，大小、亮度、像素、背景、人物與道具不變；本輪仍待視覺確認，不代表 Scenes 核准。</p><p><a href="landing-a-title-review.html?position=phone">原定位工具與舊稿（保留原始座標）</a> · <a href="landing-title-placement.manifest.json">本版 manifest / exact hashes</a> · <a href="landing-title-placement.receipts.json">你貼回的兩份定位 JSON</a></p>';
  html=html.slice(0,start)+"<body><main>"+intro+html.slice(cards);
  html=html.replace(/<section class="candidate" data-candidate="desktop-staggered">[\s\S]*?<\/section>/,"");
  html=html.replace(/<figure><img[^>]+alt="桌機：上左 MI／下右 MIC 灰階"[^>]*>[\s\S]*?<\/figure>/,"");
  html=html.replace("三張真實灰階輸出","兩張真實灰階輸出");
  html=html.replaceAll('<source media="(max-width:600px)" srcset="'+rel(m.frames["phone-staggered"].color)+'">',"");
  html=html.replace('class="scene responsive"','class="scene placement-desktop"');
  html=html.replace("</head>",'<style>.candidates{display:block}.candidate{max-width:960px;margin:0 auto}.raws{grid-template-columns:repeat(2,minmax(0,1fr))}.placement-desktop .desktop-overlay{display:block}.placement-desktop .mobile-overlay{display:none}.placement-desktop .login{font-size:1.6cqw;padding:.4cqw 1.2cqw}.placement-desktop .dialogue{padding:1.1cqw 1.7cqw;gap:1.2cqw;font-size:1.6cqw}.placement-desktop .speaker,.placement-desktop .dialogue p{font-size:1.6cqw}.placement-desktop .cta{font-size:1.6cqw;padding:.7cqw 1.3cqw}</style></head>');
  html=html.replace(/<section class="notes" id="review-notes">[\s\S]*?<\/section>/,'<section class="notes" id="review-notes"><h2>等待本輪視覺確認</h2><p>請確認桌機單行與手機兩行標題落點。這是 review-only 套用版本；原稿及所有來源都保留。沒有帳務、Home、產品頁面或 runtime 變更，沒有自動核准或 production export。</p></section>');
  if((html.match(/class="scene /g)??[]).length!==2||html.includes("data-title-position-tool")||(html.match(/data-chapter/g)??[]).length!==4)throw Error("Unexpected placement review structure");
  return html;
}
export async function composePlacement(){
  const parentFile=path.join(dir,"landing-a-title.manifest.json"),parentBytes=await readFile(parentFile);
  if(hash(parentBytes)!==parentHash)throw Error("Placement parent manifest changed");
  const parent=JSON.parse(parentBytes.toString()),receiptBytes=await readFile(receiptFile),receipts=JSON.parse(receiptBytes.toString());
  if(receipts.schema!=="mimic-landing-title-placement/v1"||receipts.reviewOnly!==true||receipts.runtimePromotion!==false||
     !isDeepStrictEqual(Object.keys(receipts.positions).sort(),Object.keys(targets).sort()))throw Error("Invalid application receipts");
  const m=structuredClone(parent),writes=new Map(),outputs=[];
  const save=(id,kind,p)=>{
    const file=path.join(dir,"samples/landing-title-placement-v01",id+"-"+kind+".png"),b=PNG.sync.write(p);
    writes.set(file,b);
    const a={path:relative(file),sha256:hash(b),width:p.width,height:p.height};outputs.push(a);return a;
  };
  for(const [id,[x,y]] of Object.entries(targets)){
    const receipt=receipts.positions[id],position=validateReceipt(receipt,id,parent);
    if(position.x!==x||position.y!==y)throw Error("Position differs from user's confirmed v01 receipt");
    const frame=m.frames[id],base=await checked(m.scenes[frame.view].logical),sprite=await checked(frame.title);
    const logical=overlay(base,sprite,x,y),color=frame.view==="desktop"?scale2(logical):logical;
    frame.title={...frame.title,x,y};frame.wall=[x,y,sprite.width,sprite.height];
    frame.logical=save(id,"logical",logical);frame.color=save(id,"color",color);frame.gray=save(id,"gray",grayscale(color));
  }
  m.placement={schema:"mimic-landing-title-placement/v1",authorization:"position-application-only",
    parent:{path:relative(parentFile),sha256:parentHash},receipts:{path:relative(receiptFile),sha256:hash(receiptBytes)},
    generator:{path:relative(fileURLToPath(import.meta.url)),sha256:hash(await readFile(fileURLToPath(import.meta.url)))},
    plan:"docs/superpowers/plans/2026-10-14-landing-title-placement-application.md"};
  const html=renderPlaced(m,await readFile(path.join(dir,"landing-warm-rest-review.html"),"utf8"));
  m.placement.review={path:relative(htmlFile),sha256:hash(html)};
  // An idempotent rerun may replace this task's outputs only when recorded bytes remain intact.
  let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
  if(previous){
    if(!isDeepStrictEqual(previous.placement.parent,m.placement.parent)||!isDeepStrictEqual(previous.placement.receipts,m.placement.receipts))throw Error("Existing placement provenance differs");
    const records=Object.keys(targets).flatMap(id=>["logical","color","gray"].map(kind=>previous.frames[id][kind])).concat(previous.placement.review);
    for(const a of records){
      const file=path.resolve(repo,a.path);
      if(!(writes.has(file)||file===htmlFile)||hash(await readFile(file))!==a.sha256)throw Error("Existing placement artifact modified; refusing overwrite");
    }
  }else{
    for(const file of [...writes.keys(),htmlFile]){
      try{await readFile(file);throw Error("Unexpected existing placement target");}catch(error){if(error.code!=="ENOENT")throw error;}
    }
  }
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}
  await writeFile(htmlFile,html);await writeFile(manifestFile,JSON.stringify(m,null,2)+"\n");
  return {frames:Object.fromEntries(Object.keys(targets).map(id=>[id,{title:m.frames[id].title,color:m.frames[id].color,gray:m.frames[id].gray}])),review:m.placement.review,outputs:outputs.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composePlacement(),null,2));
```
- [ ] Run from repo root:
```powershell
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs
```
Expected: six new PNGs, new manifest and confirmation HTML; original files unchanged. CLI rejects changed parent/source/receipt identity, unexpected existing targets and modified recorded v01 outputs before writes. Bounds/percentages/schema/path/hash validation uses the real pure model and deep equality; no arbitrary user path read/write.
- [ ] From `web/`, run focused contracts:
```powershell
npm test -- src/shared/brand/landing-title-placement.test.ts src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
```
Expected 6 files / 33 passing tests. Wait for full completion (including PNG restoration) before browser execution.
- [ ] From `web/`, run `npx playwright test --config=e2e/landing-title-placement.playwright.config.ts`. Expected 116 passing cases = four new + 112 existing. Both frame rasters retain their actual aspect/identity at 320/390/768/1440, not desktop replaced by phone. Gray details reveal exactly two real output images, original four-chapter journal/live labels persist, no horizontal overflow.

## Task 3: Verification and self-review

- [ ] From repo root:
```powershell
node web/node_modules/eslint/bin/eslint.js --no-ignore --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs
```
- [ ] From `web/`:
```powershell
npx eslint src/shared/brand/landing-title-placement.test.ts e2e/landing-title-placement-review.spec.ts e2e/landing-title-placement.playwright.config.ts
npm run typecheck
```
- [ ] Run the compositor twice more and compare all eight generated files' complete bytes: six PNGs + manifest + HTML. Source hashes/dimensions, exact 2× nearest-neighbor desktop output, binary title alpha / zero transparent RGB, grayscale coefficients / alpha equality are covered by real pixel contracts.
- [ ] Recompute full execution baseline excluding only new plan/composer/receipts/manifest/HTML/test/config paths and the new v01 directory; prior original title artifacts, positional tools/tests and all public/runtime source must stay identical. Compare original staged binary diff.
- [ ] Use repository self-review after automated checks. Re-read actual compositor/receipt/contracts/config and review markup. Check correctness, edge cases, completeness, architecture, style, security and test coverage; repair important issues with TDD before proceeding. In particular check page-copy pruning, forced independent desktop frame at phone viewports, no duplicate/baked title, no arbitrary target paths, corrupt output refused without writes, tamper finally restores bytes.
- [ ] Save eight actual scene screenshots from the completed combined Playwright run to a new previews child directory (never overwrite prior previews):
```powershell
$placementPreviewRoot = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-placement-v01/previews'
if (Test-Path -LiteralPath $placementPreviewRoot) { throw 'Placement previews already exist; inspect before writing' }
New-Item -ItemType Directory -Path $placementPreviewRoot | Out-Null
foreach ($placementProject in @('phone-small','phone','tablet','desktop')) {
  foreach ($placementFrame in @('desktop-single','phone-staggered')) {
    $placementName = $placementFrame + '-placed.png'
    $placementScreenshot = @(Get-ChildItem -LiteralPath web/test-results -Recurse -File -Filter $placementName | Where-Object { $_.Directory.Name.EndsWith('-' + $placementProject) })
    if ($placementScreenshot.Count -ne 1) { throw ('Expected one placement screenshot for '+$placementProject+' '+$placementFrame) }
    Copy-Item -LiteralPath $placementScreenshot[0].FullName -Destination (Join-Path $placementPreviewRoot ($placementProject+'-'+$placementName))
  }
}
```
- [ ] View all eight screenshots, plus both actual color and gray exports, with view_image. Confirm scene/characters/props/tone/grain unchanged, title moved exactly, and both sizes remain legible. Visual harmony remains the user's checkpoint; contracts do not approve Scenes.
- [ ] Run `git diff --check`. For new task text use `git -c core.autocrlf=false diff --no-index --check -- NUL <exact-new-file>`; permit exit1 only with zero diagnostics. Do not no-index-check entire historical devlog (CRLF/hard-break history); check tracked diff and only appended suffix.
- [ ] Append factual AGENTS-format devlog entry with actual results, scope, position application and saved previous evidence. Verify original 188240-byte prefix remains exact.

## Task 4: Visual checkpoint

- [ ] Use verification-before-completion: report fresh command results, six exact output SHA-256 and actual positions.
- [ ] Use finishing-a-development-branch under keep-as-is authority: no merge/PR/discard, implementation remains unstaged, no worktree cleanup.
- [ ] Open `file:///D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-placement-review.html` in Codex. If queued, report queued, not “opened”; provide a clickable local path / actual preview.
- [ ] Stop for user's visual feedback/approval of the applied review version. Do not promote runtime, change full Scenes status or begin another phase.

## Plan self-review

- [x] Full two-receipt identity/provenance and exact positions covered.
- [x] Complete code/commands present; original review/config/assets and index untouched.
- [x] Source raster reuse is deterministic export, not replacement creative drawing.
- [x] All downstream method names/imports/metadata dimensions align; four viewports plus prior contracts included.
