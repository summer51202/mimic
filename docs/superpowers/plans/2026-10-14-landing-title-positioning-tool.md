# Landing Title Positioning Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. The user selected Inline Execution: no worktree, no subagent, no repeated execution-mode question.

**Goal:** 在現有 Landing A review 頁加入桌機單行標題拖曳定位、微調、乾淨預覽及可重現座標複製，不改任何素材或產品。
**Architecture:** 既有 960×540 無字標底圖加獨立 288×84 字標作 DOM 分層。純座標模型、瀏覽器 controller、定位區 renderer 分檔；script 與 metadata 嵌入 HTML，file URL 不 fetch／import。新增 renderer-only CLI，只寫同一 review HTML，原 compositor 不執行。
**Tech Stack:** Local ESM / DOM Pointer Events / CSS container units / Vitest / Chromium Playwright / existing pngjs and ESLint.
**Approved spec:** docs/superpowers/specs/2026-10-14-landing-title-positioning-tool-design.md (0f0feed; user confirmed).
**Working directory:** D:\Project\mimic. Web commands below run from D:\Project\mimic\web.
**Checkpoint:** 工具可用且驗證後開同一頁，等待使用者拖曳回傳 JSON；不自行套用或核准座標。

---

## File map and implementation boundary

以下路徑相對 repo root；review prefix 是 docs/design/assets/reviews/2026-09-18-page-visual-phase-1/。

Create:

- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs — pure coordinates and payload; browser-serializable factory.
- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs — scoped DOM state, gestures, keyboard and serialized clipboard queue.
- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs — tool markup, scoped CSS, safely embedded configuration and script.
- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs — read-only asset checks; write only review HTML.
- web/src/shared/brand/landing-title-positioning.test.ts — pure math, source identity and HTML preservation.
- web/e2e/landing-title-positioning-review.spec.ts — four-viewport behavior plus native/failing/delayed clipboard and file URL.
- web/e2e/landing-title-positioning.playwright.config.ts — new suite plus old title suite at four viewports.
- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-positioning/previews/ — only new screenshots, never old previews.

Modify minimally:

- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs — one import and one tool insertion before candidates.
- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html — generated tool block; other bytes preserved.
- .agents/devlog.md — append after implementation, preserve original bytes.

Read only:

- AGENTS.md, .agents/features.md, approved spec, landing-a-title.config.mjs / manifest.json, landing-warm-rest-review.html.
- All PNG/source/master/frame/gray files and previous compositors.
- web/e2e/landing-a-title-review.spec.ts / existing config, web/src/shared/brand/landing-a-title-calibration.test.ts.
- Existing focused ESM ESLint config: web/e2e/landing-a-title.eslint.config.mjs.

Forbidden: runtime/public/registry/PWA/SW/Home/accounting/production exports/Phase 2, all protected attachments/reference directories. No asset generation or ImageGen is needed: this translates an existing raster, not new creative source art. All implementation stays unstaged/uncommitted; only this new plan may be committed by exact path. Track progress in session state, not by rewriting the committed plan.

## Task 1: Establish actual preservation baseline

- [ ] Read AGENTS.md, feature map and approved spec fully. Run read-only git status --short, confirm dirty state and protected paths unstaged. Load executing-plans and TDD before implementation; later self-review and verification-before-completion.
- [ ] Record baseline BEFORE creating tests or editing code; do not use the planning baseline or recapture after changes. Run this functions.exec JavaScript:

~~~javascript
const cmd = String.raw`node -e @'
const {execFileSync}=require("node:child_process"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const git=a=>execFileSync("git",a,{maxBuffer:134217728,stdio:["ignore","pipe","ignore"]});
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const prefixLength = null;
const mutable=[".agents/devlog.md",prefix+"render-landing-a-title.mjs",prefix+"landing-a-title-review.html"];
const additions=new Set(["landing-title-position.model.mjs","landing-title-position.controller.mjs","render-landing-title-position-tool.mjs","render-landing-a-title-page.mjs"].map(p=>prefix+p).concat(["web/src/shared/brand/landing-title-positioning.test.ts","web/e2e/landing-title-positioning-review.spec.ts","web/e2e/landing-title-positioning.playwright.config.ts"]));
const isNew=p=>additions.has(p)||p.startsWith(prefix+"samples/landing-title-positioning/");
const names=[...new Set(Buffer.concat([git(["ls-files","-z"]),git(["ls-files","--others","--exclude-standard","-z"])]).toString().split("\0").filter(Boolean))].sort();
if(prefixLength===null&&names.some(isNew))throw Error("New implementation paths already exist; use the original execution baseline, never capture a mid-execution baseline");
const files=names.filter(p=>!mutable.includes(p)&&!isNew(p)&&!p.startsWith(".codex-remote-attachments/")&&!p.startsWith("reference/")).map(p=>[p,fs.existsSync(p)&&fs.statSync(p).isFile()?hash(fs.readFileSync(p)):"missing"]);
function tree(dir,result=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p,result);else if(e.isFile())result.push([p.replaceAll("\\","/"),hash(fs.readFileSync(p))]);}return result.sort((a,b)=>a[0].localeCompare(b[0]));}
const devlog=fs.readFileSync(".agents/devlog.md");
if(git(["diff","--cached","--name-only","--",".codex-remote-attachments/","reference/"]).toString().trim())throw Error("Protected folders are staged; do not unstage user files");
console.log(JSON.stringify({filesHash:hash(JSON.stringify(files)),filesCount:files.length,publicHash:hash(JSON.stringify(tree("web/public"))),index:hash(git(["ls-files","-s"])),staged:hash(git(["diff","--cached","--binary"])),working:hash(git(["diff","--binary","--",".",...mutable.map(p=>":(exclude)"+p)])),devlog:{length:devlog.length,sha256:hash(devlog)},devlogPrefix:prefixLength===null?null:hash(devlog.subarray(0,prefixLength))}));
'@`;
store("landingTitlePositionFingerprintCommand",cmd);
const result=await tools.exec_command({cmd,workdir:"D:/Project/mimic",sandbox_permissions:"require_escalated",justification:"寫入前記錄既有素材、runtime、public、devlog 與 index 的保護基線。",max_output_tokens:2000});
if(result.exit_code!==0)throw Error(result.output);
store("landingTitlePositionExecutionBaseline",JSON.parse(result.output));
text("Execution baseline recorded; no files changed.");
~~~

Expected: exit 0 and baseline recorded. AppLocker prevents normal PowerShell here; use approved require_escalated for shell commands, never bypass failed authorization.

- [ ] Check current HTML hash is 77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded and manifest hash ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7. If different, inspect and reconcile pre-existing edits before updating preservation assertions; never regenerate old art to match the plan.

~~~powershell
Get-FileHash -Algorithm SHA256 docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html
Get-FileHash -Algorithm SHA256 docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title.manifest.json
~~~

## Task 2: Test and implement pure positioning model

**Files:** Create web/src/shared/brand/landing-title-positioning.test.ts and review/landing-title-position.model.mjs (review prefix above).

- [ ] Create the complete initial test file via apply_patch:

~~~typescript
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const moduleURL=pathToFileURL(path.join(review,"landing-title-position.model.mjs")).href;
type Position={x:number;y:number};
type Meta={scene:{path:string;sha256:string;width:number;height:number};title:{path:string;sha256:string;width:number;height:number;x:number;y:number}};
type Point={x:number;y:number};
type Rect={left:number;top:number;width:number;height:number};
type Anchor={position:Position;point:Point};
type Payload={schema:string;reviewOnly:boolean;frame:{id:string;width:number;height:number};scene:{path:string;sha256:string};title:Meta["title"];anchor:string;unit:string;centerPercent:Position};
type Model={initial:Position;position:(x:number,y:number)=>Position;point:(x:number,y:number,r:Rect)=>Point;begin:(p:Position,q:Point)=>Anchor;drag:(a:Anchor,q:Point)=>Position;nudge:(p:Position,dx:number,dy:number,fast?:boolean)=>Position;payload:(p:Position)=>Payload};
async function metadata():Promise<Meta>{
  const m=JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));
  const rel=(a:Meta["scene"])=>({...a,path:a.path.split("2026-09-18-page-visual-phase-1/")[1]});
  return {scene:rel(m.scenes.desktop.logical),title:{...m.frames["desktop-single"].title,path:rel(m.frames["desktop-single"].title).path}};
}
async function create(meta?:Meta):Promise<Model>{
  const mod=await import(moduleURL) as {createPositionModel:(m:Meta)=>Model};
  return mod.createPositionModel(meta??await metadata());
}
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");

it("uses the unchanged desktop scene and fixed title",async()=>{
  const meta=await metadata(),model=await create(meta);
  expect(model.initial).toEqual({x:385,y:84});
  expect([meta.scene.width,meta.scene.height,meta.title.width,meta.title.height]).toEqual([960,540,288,84]);
  expect(meta.scene.sha256).toBe("ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e");
  expect(meta.title.sha256).toBe("4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31");
  for(const a of [meta.scene,meta.title])expect(hash(await readFile(path.join(review,a.path)))).toBe(a.sha256);
});
it("rounds logical pixels and clamps all edges",async()=>{
  const m=await create();
  expect(m.position(10.6,20.4)).toEqual({x:11,y:20});
  expect(m.position(-9,-8)).toEqual({x:0,y:0});
  expect(m.position(900,600)).toEqual({x:672,y:456});
  expect(()=>m.position(NaN,0)).toThrow();
});
it("transforms from actual image content at different scales without rounding points",async()=>{
  const m=await create();
  for(const scale of [0.3,0.5,1,1.4]){
    const r={left:31,top:74,width:960*scale,height:540*scale};
    const p=m.point(31+401.25*scale,74+96.5*scale,r);
    expect(p.x).toBeCloseTo(401.25);expect(p.y).toBeCloseTo(96.5);
  }
  expect(()=>m.point(0,0,{left:0,top:0,width:0,height:0})).toThrow();
});
it("keeps grab offset and calculates from the starting anchor",async()=>{
  const m=await create(),a=m.begin(m.initial,{x:400,y:90});
  expect(m.drag(a,{x:425.1,y:108.2})).toEqual({x:410,y:102});
  expect(m.drag(a,{x:-50,y:-50})).toEqual({x:0,y:0});
  expect(m.drag(a,{x:1400,y:1000})).toEqual({x:672,y:456});
});
it("steps by 1 or 10 without changing dimensions",async()=>{
  const m=await create();
  expect(m.nudge(m.initial,1,0)).toEqual({x:386,y:84});
  expect(m.nudge(m.initial,0,-1,true)).toEqual({x:385,y:74});
  expect(m.nudge({x:0,y:0},-1,-1,true)).toEqual({x:0,y:0});
  expect(m.nudge({x:672,y:456},1,1,true)).toEqual({x:672,y:456});
});
it("exports reproducible identity and auxiliary center percentages",async()=>{
  const meta=await metadata(),m=await create(meta),p=m.payload(m.initial);
  expect(p).toEqual({schema:"mimic-landing-title-position/v1",reviewOnly:true,
    frame:{id:"desktop-single",width:960,height:540},
    scene:{path:meta.scene.path,sha256:meta.scene.sha256},
    title:{path:meta.title.path,sha256:meta.title.sha256,x:385,y:84,width:288,height:84},
    anchor:"top-left",unit:"logical-px",centerPercent:{x:55.1,y:23.33}});
  expect(m.payload({x:672,y:456}).title).toMatchObject({x:672,y:456,width:288,height:84});
});
it("rejects mismatched metadata and works as a serialized browser factory",async()=>{
  const mod=await import(moduleURL) as {createPositionModel:(m:Meta)=>Model};
  const meta=await metadata();
  expect(()=>mod.createPositionModel({...meta,title:{...meta.title,width:300}})).toThrow();
  expect(()=>mod.createPositionModel({...meta,scene:{...meta.scene,sha256:"bad"}})).toThrow();
  // This is a test of the exact self-contained factory, never eval user-provided text.
  const browserFactory=Function("return ("+mod.createPositionModel.toString()+")")() as (m:Meta)=>Model;
  expect(browserFactory(meta).payload({x:100,y:50}).title).toMatchObject({x:100,y:50});
});
~~~

- [ ] From web run npm test -- src/shared/brand/landing-title-positioning.test.ts. Expected RED: model module missing; not a missing dependency or invalid test syntax.
- [ ] Create review/landing-title-position.model.mjs with this complete code:

~~~javascript
export function createPositionModel(metadata) {
  const scene={...metadata.scene},title={...metadata.title};
  if(scene.width!==960||scene.height!==540||title.width!==288||title.height!==84||
     ![title.x,title.y].every(Number.isInteger)||
     ![scene,title].every(a=>typeof a.path==="string"&&/^[a-f0-9]{64}$/.test(a.sha256)))throw Error("Invalid positioning metadata");
  const finite=(...values)=>{if(!values.every(Number.isFinite))throw Error("Non-finite position");};
  const position=(x,y)=>{finite(x,y);return {x:Math.max(0,Math.min(672,Math.round(x))),y:Math.max(0,Math.min(456,Math.round(y)))};};
  const initial=Object.freeze(position(title.x,title.y));
  return Object.freeze({
    initial,position,
    point(x,y,rect){
      finite(x,y,rect.left,rect.top,rect.width,rect.height);
      if(rect.width<=0||rect.height<=0)throw Error("Image content has no size");
      return {x:(x-rect.left)*960/rect.width,y:(y-rect.top)*540/rect.height};
    },
    begin(p,q){finite(q.x,q.y);return {position:position(p.x,p.y),point:{...q}};},
    drag(a,q){return position(a.position.x+q.x-a.point.x,a.position.y+q.y-a.point.y);},
    nudge(p,dx,dy,fast=false){finite(dx,dy);return position(p.x+dx*(fast?10:1),p.y+dy*(fast?10:1));},
    payload(p){
      const value=position(p.x,p.y);
      return {schema:"mimic-landing-title-position/v1",reviewOnly:true,
        frame:{id:"desktop-single",width:960,height:540},
        scene:{path:scene.path,sha256:scene.sha256},
        title:{path:title.path,sha256:title.sha256,...value,width:288,height:84},
        anchor:"top-left",unit:"logical-px",
        centerPercent:{x:Number(((value.x+144)/960*100).toFixed(2)),y:Number(((value.y+42)/540*100).toFixed(2))}};
    },
  });
}
~~~

- [ ] Repeat focused command: expected 7 tests PASS. No implementation staging/commit. Do not claim PNG creation: bytes are unchanged.

## Task 3: Add browser contracts before the tool exists

**Files:** Create web/e2e/landing-title-positioning-review.spec.ts and web/e2e/landing-title-positioning.playwright.config.ts.

- [ ] Create the independent config. Do not modify global Playwright config or the existing title spec.

~~~typescript
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:".",testMatch:["landing-title-positioning-review.spec.ts","landing-a-title-review.spec.ts"],
  workers:1,timeout:60_000,
  projects:[
    {name:"phone-small",use:{viewport:{width:320,height:568}}},
    {name:"phone",use:{viewport:{width:390,height:844}}},
    {name:"tablet",use:{viewport:{width:768,height:1024}}},
    {name:"desktop",use:{viewport:{width:1440,height:900}}},
  ],
});
~~~

- [ ] Create the complete initial browser spec. Failure simulations are explicitly failures/races; the successful clipboard test uses the real browser API.

~~~typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const origin="https://a-title-review.local";
const fileURL=pathToFileURL(path.join(review,"landing-a-title-review.html")).href;
type PositionPayload={title:{x:number;y:number;width:number;height:number};frame:{id:string;width:number;height:number}};
type CopyWindow=Window & {pendingCopies:{text:string;resolve:()=>void}[]};
const root=(page:Page)=>page.locator("[data-title-position-tool]");
const title=(page:Page)=>root(page).locator("[data-position-title]");
const data=(page:Page)=>root(page).locator("[data-position-json]");
async function payload(page:Page):Promise<PositionPayload>{return JSON.parse(await data(page).inputValue());}
async function ready(page:Page){await expect(root(page)).toHaveAttribute("data-ready","true");}
async function serve(page:Page,fault?: "missing"|"wrong"|"background"){
  await page.route(origin+"/**",async route=>{
    const urlPath=decodeURIComponent(new URL(route.request().url()).pathname);
    const target="/samples/landing-a-title/wordmarks/desktop-single.png";
    if(fault==="background"&&urlPath==="/samples/landing-a-title/scene-desktop-logical.png"){
      await route.fulfill({status:404,body:"Missing background test image"});return;
    }
    if((fault==="missing"||fault==="wrong")&&urlPath===target){
      if(fault==="missing"){await route.fulfill({status:404,body:"Missing test image"});return;}
      await route.fulfill({contentType:"image/png",body:await readFile(path.join(review,"samples/landing-a-title/wordmarks/single.png"))});return;
    }
    const file=path.resolve(review,urlPath.replace(/^\/+/,""));
    if(!file.startsWith(review+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
    try{await route.fulfill({body:await readFile(file),contentType:file.endsWith(".html")?"text/html; charset=utf-8":file.endsWith(".png")?"image/png":file.endsWith(".json")?"application/json":"text/plain; charset=utf-8"});}
    catch{await route.fulfill({status:404,body:"Not found"});}
  });
  await page.goto(origin+"/landing-a-title-review.html");
}
async function delayedClipboard(page:Page){
  await page.addInitScript(()=>{
    const w=window as unknown as CopyWindow;w.pendingCopies=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
      writeText:(text:string)=>new Promise<void>(resolve=>w.pendingCopies.push({text,resolve})),
    }});
  });
}

test("initial tool keeps the real desktop frame, no duplicate title, no overflow",async({page},info)=>{
  await serve(page);await ready(page);
  const p=await payload(page);
  expect(p.title).toMatchObject({x:385,y:84,width:288,height:84});
  expect(p.frame).toEqual({id:"desktop-single",width:960,height:540});
  await expect(root(page).locator("[data-position-background]")).toHaveAttribute("src","samples/landing-a-title/scene-desktop-logical.png");
  await expect(root(page).locator("[data-position-sprite]")).toHaveAttribute("src","samples/landing-a-title/wordmarks/desktop-single.png");
  expect(await root(page).locator("img").count()).toBe(2);
  expect(await page.locator(".scene").count()).toBe(3);
  expect(await page.locator("[data-chapter]").count()).toBe(4);
  const box=(await root(page).locator("[data-position-background]").boundingBox())!;
  expect(box.width/box.height).toBeCloseTo(960/540,2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for(const button of await root(page).locator(".position-controls button").all()){
    const b=(await button.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await root(page).screenshot({path:info.outputPath("title-position-initial.png")});
});

test("drag, keyboard, clamp, reset and cancel obey logical coordinates",async({page})=>{
  await serve(page);await ready(page);
  const image=(await root(page).locator("[data-position-background]").boundingBox())!,box=(await title(page).boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+60*image.width/960,box.y+box.height/2+30*image.height/540);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:445,y:114});
  await title(page).focus();await page.keyboard.press("ArrowRight");await page.keyboard.press("Shift+ArrowUp");
  expect((await payload(page)).title).toMatchObject({x:446,y:104});
  await root(page).getByRole("button",{name:"向下微調"}).click();
  expect((await payload(page)).title.y).toBe(105);
  const saved=await payload(page);await data(page).focus();await page.keyboard.press("ArrowLeft");
  expect(await payload(page)).toEqual(saved);
  await root(page).getByRole("button",{name:"還原位置"}).click();
  const restored=(await title(page).boundingBox())!;
  await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2);await page.mouse.down();
  await page.mouse.move(image.x+image.width-1,image.y+image.height-1);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:672,y:456});
  await root(page).getByRole("button",{name:"還原位置"}).click();
  const again=(await title(page).boundingBox())!;
  await page.mouse.move(again.x+again.width/2,again.y+again.height/2);await page.mouse.down();
  await title(page).dispatchEvent("pointercancel",{pointerId:1});
  await page.mouse.move(again.x+again.width/2+10,again.y+again.height/2+10);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:385,y:84});
});

test("guides, clean preview, focus and reset retain separate preferences",async({page},info)=>{
  await serve(page);await ready(page);
  const mode=root(page).getByRole("checkbox",{name:"啟用定位"}),guides=root(page).getByRole("checkbox",{name:"顯示輔助線"});
  await guides.uncheck();await mode.uncheck();
  await expect(title(page)).toBeDisabled();await expect(root(page).locator("[data-position-guides]")).toBeHidden();
  await expect(root(page).getByRole("button",{name:"向右微調"})).toBeDisabled();
  await expect(root(page).getByRole("button",{name:"複製位置"})).toBeEnabled();
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await mode.check();await expect(guides).not.toBeChecked();
  await guides.check();await expect(root(page).locator("[data-position-guides]")).toBeVisible();
  await title(page).focus();
  expect(await title(page).evaluate(e=>getComputedStyle(e).outlineWidth)).toBe("3px");
  // Trigger the mode change without clicking away first, to exercise focus transfer.
  await mode.evaluate(e=>{(e as HTMLInputElement).checked=false;e.dispatchEvent(new Event("change",{bubbles:true}));});
  await expect(mode).toBeFocused();
  await root(page).screenshot({path:info.outputPath("title-position-clean.png")});
});

test("reset, mode change and lost capture end an active drag",async({page})=>{
  await serve(page);await ready(page);
  const mode=root(page).getByRole("checkbox",{name:"啟用定位"});
  for(const ending of ["reset","mode","lost"] as const){
    await mode.check();await root(page).getByRole("button",{name:"還原位置"}).click();
    const image=(await root(page).locator("[data-position-background]").boundingBox())!,b=(await title(page).boundingBox())!;
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2+20*image.width/960,b.y+b.height/2+10*image.height/540);
    if(ending==="reset")await root(page).getByRole("button",{name:"還原位置"}).evaluate(e=>(e as HTMLElement).click());
    if(ending==="mode")await mode.evaluate(e=>{(e as HTMLInputElement).checked=false;e.dispatchEvent(new Event("change",{bubbles:true}));});
    if(ending==="lost")await title(page).evaluate(e=>e.releasePointerCapture(1));
    await page.mouse.move(b.x+b.width/2+40*image.width/960,b.y+b.height/2+20*image.height/540);await page.mouse.up();
    expect((await payload(page)).title).toMatchObject(ending==="reset"?{x:385,y:84}:{x:405,y:94});
  }
});

test("real clipboard contains the current JSON and moving invalidates success",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin});
  await serve(page);await ready(page);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await root(page).getByRole("button",{name:"複製位置"}).click();
  await expect(root(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  const actual=await page.evaluate(()=>navigator.clipboard.readText());
  expect(actual).toBe(await data(page).inputValue());
  expect(JSON.parse(actual).title.x).toBe(386);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await expect(root(page).locator("[data-position-status]")).not.toContainText("已複製");
});

for(const failure of ["missing","rejected"] as const){
  test("clipboard "+failure+" retains selectable current JSON",async({page})=>{
    await page.addInitScript(kind=>{
      Object.defineProperty(navigator,"clipboard",{configurable:true,value:kind==="missing"?undefined:{writeText:async()=>{throw Error("denied by test");}}});
    },failure);
    await serve(page);await ready(page);
    await root(page).getByRole("button",{name:"複製位置"}).click();
    await expect(root(page).locator("[data-position-status]")).toContainText("請選取 JSON");
    await expect(data(page)).toBeFocused();
    expect(await data(page).evaluate(e=>{const t=e as HTMLTextAreaElement;return t.selectionEnd-t.selectionStart;})).toBe((await data(page).inputValue()).length);
    expect((await payload(page)).title.x).toBe(385);
  });
}

test("delayed copy is stale after movement; queued copies never claim the wrong position",async({page})=>{
  await delayedClipboard(page);await serve(page);await ready(page);
  const copy=root(page).getByRole("button",{name:"複製位置"});
  await copy.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(1);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[0].resolve());
  await expect(root(page).locator("[data-position-status]")).toContainText("剪貼簿為先前位置");
  await copy.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(2);
  await root(page).getByRole("button",{name:"向右微調"}).click();await copy.click();
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[1].resolve());
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(3);
  await expect(root(page).locator("[data-position-status]")).not.toContainText("已複製");
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[2].resolve());
  await expect(root(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  expect(JSON.parse(await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[2].text)).title.x).toBe(386);
});

for(const fault of ["missing","wrong","background"] as const){
  test("image "+fault+" stops tool, not the historical review",async({page})=>{
    await serve(page,fault);
    await expect(root(page)).toHaveAttribute("data-ready","error");
    await expect(root(page).locator("[data-position-status]")).toContainText("無法使用定位");
    await expect(title(page)).toBeDisabled();await expect(root(page).getByRole("button",{name:"複製位置"})).toBeDisabled();
    await expect(data(page)).toHaveValue("");
    await expect(page.locator("[data-candidate]")).toHaveCount(2);
    await expect(page.locator("[data-chapter]")).toHaveCount(4);
  });
}

test("the actual file URL runs without fetch, network or file-module imports",async({page})=>{
  await page.goto(fileURL);await ready(page);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  expect((await payload(page)).title.x).toBe(386);
  await page.reload();await ready(page);
  expect((await payload(page)).title.x).toBe(385);
});
~~~

- [ ] Run from web: npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts --grep "initial tool". Expected RED at all four widths: positioning root absent in old HTML.
- [ ] Run all new tests before implementing controller: npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts. Record actual failure reasons; all new cases must fail because the tool does not exist, not because the route or permissions cannot run. Old title tests should still pass.

## Task 4: Implement scoped controller and generated positioning block

**Files:** Create review/landing-title-position.controller.mjs, review/render-landing-title-position-tool.mjs and review/render-landing-a-title-page.mjs; modify review/render-landing-a-title.mjs and generated HTML only. Review prefix is defined in File map.

- [ ] Append this preservation test to web/src/shared/brand/landing-title-positioning.test.ts BEFORE writing the renderer:

~~~typescript
it("adds exactly one tool block while preserving the original HTML and manifest bytes",async()=>{
  const html=await readFile(path.join(review,"landing-a-title-review.html"),"utf8");
  const marker=/<!--landing-title-position-tool:start-->[\s\S]*?<!--landing-title-position-tool:end-->\n/g;
  const blocks=html.match(marker)??[];
  expect(blocks).toHaveLength(1);
  expect(hash(html.replace(marker,""))).toBe("77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded");
  expect(hash(await readFile(path.join(review,"landing-a-title.manifest.json")))).toBe("ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7");
  expect(blocks[0]).toContain("scene-desktop-logical.png");
  expect(blocks[0]).toContain("wordmarks/desktop-single.png");
  expect(blocks[0]).not.toMatch(/\bfetch\s*\(|<canvas|type=["']module["']|localStorage/);
});
~~~

- [ ] Run focused Vitest. Expected 7 PASS / 1 RED because the tool block is absent. Do not alter the preservation hash after adding UI to make the test pass.

- [ ] Create review/landing-title-position.controller.mjs using this complete self-contained function:

~~~javascript
export function mountPositionTool(factory,root) {
  if(!root)return;
  const q=selector=>root.querySelector(selector),win=root.ownerDocument.defaultView;
  const background=q("[data-position-background]"),sprite=q("[data-position-sprite]");
  const title=q("[data-position-title]"),mode=q("[data-position-mode]"),guideToggle=q("[data-position-guide-toggle]");
  const guides=q("[data-position-guides]"),box=q("[data-position-guide-box]"),vertical=q("[data-position-guide-v]"),horizontal=q("[data-position-guide-h]");
  const output=q("[data-position-json]"),coordinates=q("[data-position-coordinates]"),status=q("[data-position-status]");
  const reset=q("[data-position-reset]"),copy=q("[data-position-copy]"),nudges=[...root.querySelectorAll("[data-position-nudge]")];
  const message=text=>{status.textContent=text;};
  let model,meta,position,ready=false,drag=null,revision=0,request=0,copyQueue=Promise.resolve();
  function endDrag(){
    const old=drag;drag=null;
    if(old&&title.hasPointerCapture(old.id))title.releasePointerCapture(old.id);
    root.removeAttribute("data-dragging");
  }
  function fail(){
    ready=false;endDrag();root.dataset.ready="error";guides.hidden=true;output.value="";
    coordinates.textContent="無有效座標";
    for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
    title.tabIndex=-1;message("圖片或資料不符，無法使用定位；原比較頁仍可閱讀。");
  }
  try{meta=JSON.parse(q("[data-position-config]").textContent);model=factory(meta);position={...model.initial};}
  catch{fail();return;}
  function draw(){
    const payload=model.payload(position),cx=payload.centerPercent.x,cy=payload.centerPercent.y;
    const rect={left:position.x/960*100+"%",top:position.y/540*100+"%",width:"30%",height:84/540*100+"%"};
    Object.assign(title.style,rect);Object.assign(box.style,rect);
    vertical.style.left=(position.x+144)/960*100+"%";horizontal.style.top=(position.y+42)/540*100+"%";
    guides.hidden=!(ready&&mode.checked&&guideToggle.checked);
    title.disabled=!(ready&&mode.checked);title.tabIndex=ready&&mode.checked?0:-1;
    for(const button of nudges)button.disabled=!(ready&&mode.checked);
    mode.disabled=!ready;guideToggle.disabled=!ready;reset.disabled=!ready;copy.disabled=!ready;
    output.value=JSON.stringify(payload,null,2);
    coordinates.textContent="左上 X "+position.x+"／Y "+position.y+" logical px；中心 "+cx.toFixed(2)+"%／"+cy.toFixed(2)+"%；尺寸 288×84（鎖定）";
  }
  function update(next,force=false){
    if(!force&&next.x===position.x&&next.y===position.y)return;
    position=next;revision++;draw();message("位置已變更，請重新複製。");
  }
  title.addEventListener("pointerdown",event=>{
    if(!ready||!mode.checked||event.button!==0||drag)return;
    const point=model.point(event.clientX,event.clientY,background.getBoundingClientRect());
    title.focus({preventScroll:true});
    try{title.setPointerCapture(event.pointerId);}catch{return;}
    drag={id:event.pointerId,anchor:model.begin(position,point)};
    root.dataset.dragging="true";event.preventDefault();
  });
  title.addEventListener("pointermove",event=>{
    if(!drag||drag.id!==event.pointerId||!ready||!mode.checked)return;
    update(model.drag(drag.anchor,model.point(event.clientX,event.clientY,background.getBoundingClientRect())));
    event.preventDefault();
  });
  for(const name of ["pointerup","pointercancel","lostpointercapture"])title.addEventListener(name,event=>{
    if(drag&&drag.id===event.pointerId)endDrag();
  });
  const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  title.addEventListener("keydown",event=>{
    if(!ready||!mode.checked||root.ownerDocument.activeElement!==title||event.altKey||event.ctrlKey||event.metaKey||!steps[event.key])return;
    event.preventDefault();const [dx,dy]=steps[event.key];
    update(model.nudge(position,dx,dy,event.shiftKey));
  });
  for(const button of nudges)button.addEventListener("click",()=>{
    if(!ready||!mode.checked)return;endDrag();
    const [dx,dy]=button.dataset.positionNudge.split(",").map(Number);
    update(model.nudge(position,dx,dy));
  });
  mode.addEventListener("change",()=>{
    endDrag();if(!mode.checked&&root.ownerDocument.activeElement===title)mode.focus({preventScroll:true});
    draw();
  });
  guideToggle.addEventListener("change",draw);
  reset.addEventListener("click",()=>{if(!ready)return;endDrag();update({...model.initial},true);});
  copy.addEventListener("click",()=>{
    if(!ready)return;
    const token=++request,version=revision,text=output.value;
    message("正在複製位置…");
    // Serializing writes keeps an older delayed write from overwriting the newest clipboard content.
    copyQueue=copyQueue.catch(()=>{}).then(async()=>{
      if(token!==request||!ready)return;
      try{
        if(typeof win.navigator.clipboard?.writeText!=="function")throw Error("Clipboard unavailable");
        await win.navigator.clipboard.writeText(text);
        if(token!==request||!ready)return;
        message(version===revision?"已複製目前位置":"剪貼簿為先前位置，請重新複製。");
      }catch{
        if(token!==request||!ready)return;
        output.focus();output.select();message("無法自動複製，請選取 JSON 並按 Ctrl+C。");
      }
    });
  });
  for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
  title.tabIndex=-1;guides.hidden=true;
  Promise.all([background.decode(),sprite.decode()]).then(()=>{
    if(background.naturalWidth!==meta.scene.width||background.naturalHeight!==meta.scene.height||
       sprite.naturalWidth!==meta.title.width||sprite.naturalHeight!==meta.title.height)throw Error("Wrong image dimensions");
    ready=true;root.dataset.ready="true";draw();message("位置預覽，尚未套用；重整會回初始位置。");
  }).catch(fail);
}
~~~

- [ ] Create review/render-landing-title-position-tool.mjs with the following complete implementation. Keep the exact start/end markers and final newline: the preservation test removes only this block.

~~~javascript
import { createPositionModel } from "./landing-title-position.model.mjs";
import { mountPositionTool } from "./landing-title-position.controller.mjs";

export function renderPositionTool(manifest) {
  const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
  const scene=manifest.scenes.desktop.logical,title=manifest.frames["desktop-single"].title;
  const meta={scene:{...scene,path:rel(scene)},title:{...title,path:rel(title)}};
  createPositionModel(meta);
  const json=JSON.stringify(meta).replaceAll("<","\\u003c").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029");
  const esc=text=>String(text).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const sign=manifest.scenes.desktop.layers.find(l=>l.id==="sign");
  if(!sign)throw Error("Missing preserved sign");
  const signStyle="left:"+(sign.x+sign.width*.16)/960*100+"%;top:"+(sign.y+sign.height*.17)/540*100+"%;width:"+sign.width*.7/960*100+"%;height:"+sign.height*.48/540*100+"%";
  return `<!--landing-title-position-tool:start-->
<style>
.position-tool{margin:24px 0;padding:16px;background:#30271f;border:1px solid #806644}
.position-tool h2{margin:0 0 8px}.position-tool p{margin:8px 0}
.position-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.position-controls button,.position-controls label{min-width:44px;min-height:44px;padding:8px 12px;border:1px solid #aa8956;background:#241d18;color:#ecd9b7;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit}
.position-controls button:disabled{opacity:.55}.position-controls input{accent-color:#d7aa56}
.position-viewport{max-width:960px;margin:auto;outline:2px solid #6c5036}
.position-stage{position:relative;container-type:inline-size;margin:0;padding:0;border:0;overflow:hidden;background:#30231b}
.position-background{display:block;width:100%;height:auto;image-rendering:pixelated;user-select:none}
.position-title{position:absolute;z-index:2;padding:0;margin:0;border:0;background:transparent;line-height:0;cursor:grab;touch-action:none;opacity:1}
.position-title img{display:block;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}
.position-title:disabled{cursor:default;pointer-events:none;opacity:1}
.position-title:focus-visible{outline:3px solid #eabc62;outline-offset:-3px}
.position-controls button:focus-visible,.position-controls input:focus-visible,.position-json:focus-visible{outline:3px solid #eabc62;outline-offset:2px}
.position-tool[data-dragging] .position-title{cursor:grabbing}
.position-tool:not([data-ready="true"]) .position-title{visibility:hidden}
.position-guides{position:absolute;inset:0;z-index:6;pointer-events:none}
.position-guides[hidden]{display:none}.position-guide-box{position:absolute;border:1px dashed #ffe3a0}
.position-guide-v{position:absolute;top:0;bottom:0;border-left:1px dashed #ffe3a0}
.position-guide-h{position:absolute;left:0;right:0;border-top:1px dashed #ffe3a0}
.position-sign{position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-weight:800;font-size:1.12cqw;line-height:1.15;color:#ffe8ac;text-shadow:1px 1px #3e2316}
.position-login{position:absolute;z-index:4;right:3%;top:4%;padding:.4cqw 1.2cqw;background:#211a17d9;border:1px solid #a78953;text-decoration:none;font-size:1.6cqw}
.position-dialogue{position:absolute;z-index:4;left:2%;right:2%;bottom:3%;height:19%;padding:1.1cqw 1.7cqw;border:2px solid #b79556;background:#211a18f2;display:flex;align-items:center;justify-content:space-between;gap:1.2cqw;font-size:1.6cqw;line-height:1.35}
.position-dialogue .position-speaker{color:#efc56c;font-weight:700}.position-dialogue p{margin:.3cqw 0;font-size:1.6cqw}
.position-cta{white-space:nowrap;padding:.7cqw 1.3cqw;border:2px solid #f0ce80;background:#b68137;color:#211a18;font-weight:800;text-decoration:none}
.position-json{display:block;width:100%;height:220px;margin-top:8px;padding:10px;resize:vertical;background:#211a18;color:#ecd9b7;border:1px solid #aa8956;font:12px/1.5 ui-monospace,monospace;white-space:pre;overflow:auto}
.position-tool [data-position-status]{min-height:24px}
@media(max-width:600px){.position-tool{padding:10px}.position-controls{gap:6px}.position-controls button,.position-controls label{padding:8px}.position-json{font-size:11px}}
</style>
<section class="position-tool" data-title-position-tool data-ready="loading" aria-labelledby="position-heading">
<h2 id="position-heading">桌機單行：標題定位</h2>
<p>只有標題可移動，尺寸／亮度／其餘素材鎖定。此區始終是桌機構圖縮圖；手機請看下方既有手機版。</p>
<div class="position-controls">
<label><input type="checkbox" data-position-mode checked disabled>啟用定位</label>
<label><input type="checkbox" data-position-guide-toggle checked disabled>顯示輔助線</label>
<button type="button" data-position-nudge="-1,0" aria-label="向左微調" disabled>←</button>
<button type="button" data-position-nudge="0,-1" aria-label="向上微調" disabled>↑</button>
<button type="button" data-position-nudge="0,1" aria-label="向下微調" disabled>↓</button>
<button type="button" data-position-nudge="1,0" aria-label="向右微調" disabled>→</button>
<button type="button" data-position-reset disabled>還原位置</button>
<button type="button" data-position-copy disabled>複製位置</button>
</div>
<p>拖動標題；聚焦後方向鍵移動 1 logical px，Shift＋方向鍵移動 10。關閉定位看乾淨預覽。重整不保存，請先複製位置。</p>
<div class="position-viewport"><div class="position-stage">
<img class="position-background" data-position-background src="${esc(meta.scene.path)}" width="960" height="540" alt="無法師 A 桌機場景，標題另層定位" draggable="false">
<button type="button" class="position-title" data-position-title aria-label="可移動的 MIMIC 標題" tabindex="-1" disabled><img data-position-sprite src="${esc(meta.title.path)}" width="288" height="84" alt="" draggable="false"></button>
<a class="position-sign" href="#journal" style="${signStyle}">開始<br>冒險</a>
<a class="position-login" href="#review-notes">登入</a>
<div class="position-dialogue"><div><span class="position-speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="position-cta" href="#journal">開始冒險 ↓</a></div>
<div class="position-guides" data-position-guides aria-hidden="true" hidden><span class="position-guide-box" data-position-guide-box></span><span class="position-guide-v" data-position-guide-v></span><span class="position-guide-h" data-position-guide-h></span></div>
</div></div>
<p data-position-coordinates>圖片載入中。</p><p data-position-status role="status" aria-live="polite">圖片載入中。</p>
<label for="position-json">位置 JSON（可手動選取複製）</label><textarea id="position-json" class="position-json" data-position-json readonly spellcheck="false"></textarea>
<p>只限制在場景內以防裁切；是否跨洞口／岩縫或遮住伙伴仍需目視。貼回 JSON 後才另行套用，不會自動修改檔案或核准。</p>
<script type="application/json" data-position-config>${json}</script>
<noscript>定位工具需要 JavaScript；下方原比較頁仍可閱讀。</noscript>
</section>
<script>(${mountPositionTool.toString()})(${createPositionModel.toString()},document.querySelector("[data-title-position-tool]"));</script>
<!--landing-title-position-tool:end-->
`;
}
~~~

- [ ] Apply only these two edits to review/render-landing-a-title.mjs. Do not rewrite its existing template, notes, journal or candidate sections.

~~~diff
+import { renderPositionTool } from "./render-landing-title-position-tool.mjs";
+
 export function renderReview(m,previousPage) {
@@
-<div class="candidates">${["desktop-single","desktop-staggered"].map(key=>`<section class="candidate" data-candidate="${key}"><h2>${labels[key]}</h2><p>${dimensions(key)}</p>${scene(key)}</section>`).join("")}</div>
+${renderPositionTool(m)}<div class="candidates">${["desktop-single","desktop-staggered"].map(key=>`<section class="candidate" data-candidate="${key}"><h2>${labels[key]}</h2><p>${dimensions(key)}</p>${scene(key)}</section>`).join("")}</div>
~~~

- [ ] Create review/render-landing-a-title-page.mjs. This is the only production of review HTML this round; never run compose-landing-a-title.mjs.

~~~javascript
import { createHash } from "node:crypto";
import { readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderReview } from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const m=JSON.parse(await readFile(path.join(dir,"landing-a-title.manifest.json"),"utf8"));
const expected=[
  [m.scenes.desktop.logical,"ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e",960,540],
  [m.frames["desktop-single"].title,"4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31",288,84],
];
for(const [a,digest,width,height] of expected){
  const file=path.resolve(repo,a.path);
  if(!file.startsWith(dir+path.sep))throw Error("Asset outside review");
  const bytes=await readFile(file),png=PNG.sync.read(bytes);
  if(a.sha256!==digest||hash(bytes)!==digest||a.width!==width||a.height!==height||png.width!==width||png.height!==height)throw Error("Changed positioning asset: "+a.path);
}
const previous=await readFile(path.join(dir,"landing-warm-rest-review.html"),"utf8");
const html=renderReview(m,previous);
if((html.match(/data-title-position-tool data-ready/g)??[]).length!==1)throw Error("Expected one tool");
await writeFile(path.join(dir,"landing-a-title-review.html"),html);
console.log("Rendered review HTML only: "+hash(html));
~~~

- [ ] From root run syntax checks and renderer-only generation:

~~~powershell
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs
~~~

Expected all exit 0; last command reports only HTML hash. Do not bypass hash/dimension errors or regenerate images.

- [ ] Run from web: npm test -- src/shared/brand/landing-title-positioning.test.ts. Expected 8 tests PASS, including exact old HTML recovery and unchanged manifest.
- [ ] Run from web: npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts. Expected 52 tests PASS (12 new cases plus 1 old case × 4 projects). Read actual count: initial, drag, guides, active-drag termination, real clipboard, 2 clipboard failure, delayed copy, 3 image failure, file URL = 12 new tests. Native clipboard must really work; failure/race simulations must not substitute for it.
- [ ] If a test fails, use systematic-debugging: inspect exact coordinate, focus, pixel/UI or permission failure, add/retain regression and fix it. Do not loosen viewport/preservation assertions or replace real clipboard success with a mock. Leave code unstaged.

## Task 5: Verify behavior, preserve images, and save actual previews

- [ ] Run the baseline regression group from web:

~~~powershell
npm test -- src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
npx eslint src/shared/brand/landing-title-positioning.test.ts e2e/landing-title-positioning-review.spec.ts e2e/landing-title-positioning.playwright.config.ts
npm run typecheck
npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts
~~~

Expected 23 Vitest tests and 52 Playwright tests before any additional regression cases. Record actual results, exit codes and non-failing warnings; never imply a full build or full repository suite passed. When tests run longer than 60 seconds, poll a yielded command session and provide concise Traditional Chinese progress updates.

- [ ] Run focused ESM lint from web with the already existing exact config (not blanket C++ checks):

~~~powershell
npx eslint --no-ignore --config e2e/landing-a-title.eslint.config.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs
~~~

Expected exit 0, no lint errors or silently ignored files. Keep old lint config unchanged.

- [ ] From root verify renderer determinism and unchanged critical files. This executes ONLY the renderer-only entry:

~~~powershell
node -e @'
const fs=require("node:fs"),crypto=require("node:crypto"),{execFileSync}=require("node:child_process");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const immutable=["landing-a-title.manifest.json","landing-a-title.config.mjs","compose-landing-a-title.mjs"];
function walk(p,result=[]){for(const e of fs.readdirSync(p,{withFileTypes:true})){const file=p+"/"+e.name;if(e.isDirectory())walk(file,result);else if(e.isFile())result.push(file);}return result;}
const files=immutable.map(p=>dir+p).concat(walk(dir+"samples/landing-a-title"),walk(dir+"samples/derivations/landing-a-title"));
const before=files.map(p=>[p,hash(fs.readFileSync(p))]);
execFileSync(process.execPath,[dir+"render-landing-a-title-page.mjs"],{stdio:"inherit"});
const first=fs.readFileSync(dir+"landing-a-title-review.html");
execFileSync(process.execPath,[dir+"render-landing-a-title-page.mjs"],{stdio:"inherit"});
const second=fs.readFileSync(dir+"landing-a-title-review.html");
if(!first.equals(second))throw Error("Non-deterministic review HTML");
for(const [p,h] of before)if(hash(fs.readFileSync(p))!==h)throw Error("Changed image or source: "+p);
console.log("PASS: byte-identical HTML; "+files.length+" prior title assets and config files unchanged; HTML SHA-256 "+hash(second));
'@
~~~

- [ ] Use repository self-review. Read all new model/controller/renderer/CLI code and exact renderer edits; inspect all seven dimensions. Review race serialization, pointer cancel/lost capture, focus outside the title, metadata path/hash/size, safe script embedding and immutable artifacts. Fix critical/important issues with a failing regression, regenerate HTML-only, rerun focused commands. No agent delegation. Record scope and any minor remaining notes; do not mark CLEAN with pending important issues.
- [ ] After final passing Playwright run, copy only its eight new tool screenshots. Do not overwrite existing preview directories or copy unrelated runner files. From root:

~~~powershell
node -e @'
const fs=require("node:fs"),path=require("node:path");
const source=path.resolve("web/test-results");
const output=path.resolve("docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-positioning/previews");
function walk(dir,result=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,result);else if(e.isFile()&&/^title-position-(initial|clean)\.png$/.test(e.name))result.push(p);}return result;}
const files=walk(source);
if(files.length!==8)throw Error("Expected eight final tool previews, got "+files.length);
fs.mkdirSync(output,{recursive:true});
for(const file of files){
  const folder=path.basename(path.dirname(file));
  const project=["phone-small","phone","tablet","desktop"].find(name=>folder.endsWith("-"+name));
  if(!project)throw Error("Unknown screenshot project: "+folder);
  const destination=path.join(output,project+"-"+path.basename(file));
  if(fs.existsSync(destination))throw Error("Preview already exists; preserve it and choose a new explicit revision directory");
  fs.copyFileSync(file,destination,fs.constants.COPYFILE_EXCL);
}
console.log("PASS: saved eight actual initial/clean tool previews");
'@
~~~

If a new revision directory is needed after another review loop, record its explicit path in final handoff; do not recursively delete previews. Test-output directories are ephemeral browser output, not source assets.

- [ ] View local screenshots with view_image before making visual claims. Inspect all four widths for initial and clean preview: fixed desktop ratio, no duplicate title, locked other props, readable controls, guide visibility and actual title placement. At small widths the scene UI scales as a desktop thumbnail; original phone scene and readable page controls remain below/around it.
- [ ] From root run full git diff --check. Also check all seven new text files and modified renderer without staging them:

~~~powershell
git diff --check
$positionTextFiles = @(
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html',
 'web/src/shared/brand/landing-title-positioning.test.ts',
 'web/e2e/landing-title-positioning-review.spec.ts',
 'web/e2e/landing-title-positioning.playwright.config.ts'
)
foreach ($positionTextFile in $positionTextFiles) {
  git diff --no-index --check -- NUL $positionTextFile
  if ($LASTEXITCODE -gt 1) { throw ('Whitespace command failed: ' + $positionTextFile) }
}
~~~

No-index exit 1 can mean added content; any whitespace/conflict-marker diagnostics must be fixed. LF/CRLF conversion warnings alone are not whitespace errors. Do not alter unrelated dirty files to silence existing diagnostics.

## Task 6: Devlog, preservation verification and user handoff

- [ ] Append a factual entry to .agents/devlog.md using apply_patch and a unique verified tail anchor. Do not rewrite previous entries; use actual client date and actual counts/results. The following content is the intended implementation summary; only include verified facts:

~~~markdown
## 2026-10-14 — Landing desktop title positioning review tool

**Task:** Add the approved desktop single-line MIMIC positioning tool to the existing review page.
**Scope:** New positioning model/controller/tool renderer/HTML-only CLI; incremental existing renderer/HTML; independent Vitest/Playwright contracts; new preview screenshots; devlog append only.
**What changed:**
- Layered the existing title-free desktop scene and fixed-size single-line title without modifying source or export bytes.
- Added pointer drag, focused keyboard and button nudges, separate guide/clean modes, reset and immutable-identity JSON.
- Added native clipboard copying, selectable fallback and serialized requests with stale-position feedback; image failures disable the tool.
- Preserved the original review HTML outside the tool block, phone frame, candidates and journal.
**Decisions:** Coordinates are integer logical pixels in the 960×540 desktop frame. No scaling/rotation, automatic file saves, local persistence or position approval. Keep implementation unstaged in the dirty checkout.
**Known gaps / follow-ups:** Await user-position JSON before any separately authorized composition update. Runtime/public/registry/PWA/SW/Home/accounting/production exports and Phase 2 remain out of scope. Full repository suites and production build are not implied by focused review verification.
~~~

Add a concise verified-results bullet with actual Vitest/PW/lint/typecheck/determinism/whitespace results. If current date changed, update only the new heading. No devlog entry is needed merely for writing this plan.

- [ ] Run git diff --check -- .agents/devlog.md. Then validate actual execution baseline using functions.exec:

~~~javascript
const before=load("landingTitlePositionExecutionBaseline");
const originalCommand=load("landingTitlePositionFingerprintCommand");
if(!before||!originalCommand)throw Error("Missing original execution baseline; cannot recapture after editing");
const cmd=originalCommand.replace("const prefixLength = null;","const prefixLength = "+before.devlog.length+";");
const result=await tools.exec_command({cmd,workdir:"D:/Project/mimic",sandbox_permissions:"require_escalated",justification:"驗證舊素材、public/runtime、devlog 原文與既有 index 未變。",max_output_tokens:2000});
if(result.exit_code!==0)throw Error(result.output);
const after=JSON.parse(result.output);
for(const key of ["filesHash","filesCount","publicHash","index","staged","working"])if(after[key]!==before[key])throw Error("Preservation failed: "+key);
if(after.devlogPrefix!==before.devlog.sha256||after.devlog.length<=before.devlog.length)throw Error("Devlog must be append-only");
text("PASS: original files/public tree/index/staged changes/devlog prefix preserved; only scoped new code, tool HTML block and devlog append");
~~~

If preservation fails, inspect read-only diffs and determine the exact path; do not reset, clean, restore from HEAD or drop dirty changes. The original HTML-without-tool hash and manifest contracts independently protect the permitted generated-page edit. Original renderer must have only the import/insertion plus any necessary tested fixes, not unrelated rewrites.

- [ ] Verify git diff --cached --name-only -- .codex-remote-attachments/ reference/ is empty. Read git diff --name-only -- web/public web/src/app web/src/features web/src/shared; old dirty tests can still appear, so say "this round unchanged against baseline", not "entire workspace clean".
- [ ] Use verification-before-completion; report actual command evidence and CLEAN/unresolved self-review. Do not claim full build or full test suite. If necessary after fixes repeat the focused verification and baseline comparison.
- [ ] Open the same browser review page:

~~~javascript
text(await tools.mcp__codex_app__open_in_codex({target:{type:"browser",url:"file:///D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html"}}));
~~~

A queued result is not proof the user saw it. Provide the absolute file link and actual screenshot embeds if needed; no new server/port.

- [ ] Handoff should explain: drag title; arrows move 1 / Shift arrows 10; turn off positioning for clean preview; reset; copy JSON or manual Ctrl+C; refresh loses unsaved position. Tell the user to paste the JSON back with any visual notes. List existing scene/title SHA-256 and the actual updated HTML hash; material assets remain unchanged.
- [ ] Stop. Do not automatically install the chosen position, modify config/manifest, regenerate art, approve Scenes, advance props review or promote runtime. No implementation commit; keep dirty/staged content protected. No merge/PR/worktree cleanup choices for this review-only task.

## Plan self-review and execution handoff

This plan maps spec sections 1–2 to preservation and renderer-only layering; section 3 to model and real pointer/keyboard/mode contracts; section 4 to real clipboard, explicit failure fallback and stale/queued requests; section 5 to self-contained file URL, error readiness and scoped DOM; section 6 to focused validation and actual previews; section 7 to baseline, devlog, no staging and visual stop.

All functions and selectors used by tests are defined in this plan. New UI does not use the old .scene class, so original scene-count/phone contracts remain meaningful. Identity and original HTML/manifest hashes are real pre-implementation values, not generated guesses. Planning self-review checked JavaScript/TypeScript syntax and the three proposed TypeScript files in memory with existing Web dependencies; it corrected the Window test cast and isolated the background-failure route. These checks created no implementation files and are not implementation tests. The user already chose Inline; do not ask again or dispatch agents.

Write and commit only this new plan by exact path, excluding existing staged work. After the user approves the plan or says to start, execute it inline with executing-plans; keep progress in session state and stop at the tool-use checkpoint.
