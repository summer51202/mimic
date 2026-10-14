# Landing Mobile Title Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. User explicitly selected Inline; do not use subagents or worktrees.

**Goal:** Extend the static review tool with independently adjustable phone MI/MIC placement, keeping all art and accounting/runtime boundaries unchanged.

**Architecture:** Preserve the historical review HTML outside its one marked tool block. Generalize the pure positioning model to two explicit frames; mount two isolated controllers and coordinate visible-frame selection and serial clipboard writes. Reuse existing source rasters and manifest without changing their bytes or coordinates.

**Tech Stack:** ESM, self-contained classic browser JavaScript, static HTML/CSS, Vitest, Playwright Chromium, pngjs, existing ESLint and TypeScript.

**Approved spec:** `docs/superpowers/specs/2026-10-14-landing-mobile-title-positioning-design.md` (6756d23). User approved with「是」after source-hash validation and desktop JSON receipt.

**Execution authority:** Existing main, Inline, no subagent/worktree. Continue after this plan self-review, without repeating execution-mode questions. Keep implementation unstaged/uncommitted because these files already contain prior work. Only this new independent plan may be committed by exact path.

---

## Protected baseline and desktop receipt

Before implementation use the fresh `landingMobileBaseline` session snapshot: 1,276 immutable files; hash `808706f0f4fbae1cb1ebadb7365fbf93eabab6e867760262d93ccd455acdbf97`; web/public hash `418a4ad0c6f396c19a89d62746b760a7bb0224e7b8bb567e2e7e14a412e30beb`; devlog prefix 185,489 bytes. Exclude only the exact mutable/new scope below when recomputing. Preserve existing staged binary diff.

Desktop user receipt is evidence, not an instruction to apply or reset config. Keep desktop manifest initial 385/84 and do not regenerate raster exports. User exact requested position is:
```json
{
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
}
```

## File map

Existing mutable files:
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs`: logical positioning and payload identity.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs`: one frame's browser interaction and source readiness.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs`: tool-only markup/styles and inline scripts.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs`: HTML-only CLI validating all four sources.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html`: generated one-block increment, historical bytes retained.
- `web/e2e/landing-title-positioning-review.spec.ts`: only scope existing helper to desktop panel.
- `web/e2e/landing-title-positioning.playwright.config.ts`: include added phone spec.
- `.agents/devlog.md`: append only after implementation.

New files:
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.family.mjs`: frame selection, inactive-frame lifecycle, shared write queue.
- `web/src/shared/brand/landing-mobile-title-positioning.test.ts`: pure phone and preservation contracts.
- `web/e2e/landing-mobile-title-positioning-review.spec.ts`: real browser phone/switch contracts.
- `docs/superpowers/plans/2026-10-14-landing-mobile-title-positioning.md`: this independent plan.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-positioning/mobile-previews/`: eight new screenshots only.

No edits to `render-landing-a-title.mjs`, PNGs, manifest/config, runtime, registry, PWA, SW or product pages. Do not touch protected attachment/reference directories.

## Sequencing

### Task 1: Add failing mobile contracts

**File:** `web/src/shared/brand/landing-mobile-title-positioning.test.ts`

- [ ] Create only the following test file, preserving existing desktop unit contracts.

```ts
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {expect,it} from "vitest";
const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
type Position={x:number;y:number};
type Asset={path:string;sha256:string;width:number;height:number};
type Metadata={frame:{id:string;width:number;height:number};scene:Asset;title:Asset&Position};
type Model={initial:Position;position:(x:number,y:number)=>Position;point:(x:number,y:number,r:{left:number;top:number;width:number;height:number})=>Position;begin:(p:Position,q:Position)=>{position:Position;point:Position};drag:(a:{position:Position;point:Position},q:Position)=>Position;nudge:(p:Position,dx:number,dy:number,fast?:boolean)=>Position;payload:(p:Position)=>{frame:Metadata["frame"];title:Metadata["title"];centerPercent:Position}};
async function meta(id="phone-staggered"):Promise<Metadata>{
  const m=JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));
  const frame=m.frames[id],scene=m.scenes[frame.view].logical;
  const rel=(a:Asset)=>({...a,path:a.path.split("2026-09-18-page-visual-phase-1/")[1]});
  return {frame:{id,width:scene.width,height:scene.height},scene:rel(scene),title:{...rel(frame.title),x:frame.title.x,y:frame.title.y}};
}
async function factory(){
  return (await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs") as {createPositionModel:(m:Metadata)=>Model}).createPositionModel;
}
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
it("phone uses its own immutable sources and initial coordinates",async()=>{
  const metadata=await meta(),m=(await factory())(metadata);
  expect(m.initial).toEqual({x:116,y:93});
  expect(m.payload(m.initial)).toMatchObject({frame:{id:"phone-staggered",width:390,height:600},title:{x:116,y:93,width:148,height:98},centerPercent:{x:48.72,y:23.67}});
  for(const a of [metadata.scene,metadata.title])expect(hash(await readFile(path.join(review,a.path)))).toBe(a.sha256);
});
it("phone rounding, clamp, grab offset and scale never use desktop denominators",async()=>{
  const m=(await factory())(await meta());
  expect(m.position(-1,-1)).toEqual({x:0,y:0});
  expect(m.position(999,999)).toEqual({x:242,y:502});
  expect(m.position(120.6,99.4)).toEqual({x:121,y:99});
  for(const scale of [.3,.5,1,1.4]){
    const p=m.point(10+140.25*scale,30+120.5*scale,{left:10,top:30,width:390*scale,height:600*scale});
    expect(p.x).toBeCloseTo(140.25);expect(p.y).toBeCloseTo(120.5);
  }
  expect(m.drag(m.begin(m.initial,{x:140,y:120}),{x:160,y:130})).toEqual({x:136,y:103});
  expect(m.nudge(m.initial,1,-1,true)).toEqual({x:126,y:83});
  expect(m.nudge({x:242,y:502},1,1)).toEqual({x:242,y:502});
});
it("rejects unsupported frames, mixed dimensions and missing phone identity",async()=>{
  const create=await factory(),metadata=await meta();
  for(const bad of [
    {...metadata,frame:{...metadata.frame,id:"unknown"}},
    {...metadata,frame:{...metadata.frame,id:"desktop-single"}},
    {...metadata,frame:{...metadata.frame,width:960}},
    {...metadata,title:{...metadata.title,width:288}},
    {...metadata,title:{...metadata.title,x:NaN}},
  ])expect(()=>create(bad)).toThrow();
  const missing={...metadata};Reflect.deleteProperty(missing,"frame");expect(()=>create(missing)).toThrow();
});
it("desktop remains compatible and received user position is not automatically applied",async()=>{
  const create=await factory(),desktop=create(await meta("desktop-single")),phone=create(await meta());
  expect(desktop.initial).toEqual({x:385,y:84});
  expect(desktop.payload({x:376,y:100})).toMatchObject({frame:{id:"desktop-single"},centerPercent:{x:54.17,y:26.3}});
  expect(phone.initial).toEqual({x:116,y:93});
  const serialized=Function("return ("+create.toString()+")")() as typeof create;
  expect(serialized(await meta()).payload({x:242,y:502}).title).toMatchObject({x:242,y:502});
});
it("one marked tool block contains both independent frames and preserves historical HTML",async()=>{
  const html=await readFile(path.join(review,"landing-a-title-review.html"),"utf8");
  const marker=/<!--landing-title-position-tool:start-->[\s\S]*?<!--landing-title-position-tool:end-->\n/g;
  expect(html.match(marker)).toHaveLength(1);
  expect(hash(html.replace(marker,""))).toBe("77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded");
  expect(html).toContain('data-frame="phone-staggered"');
  expect(html).toContain("samples/landing-a-title/scene-phone-logical.png");
  expect(html.match(/data-title-position-tool data-frame=/g)).toHaveLength(2);
});
```
- [ ] From `web/`, run `npm test -- src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-title-positioning.test.ts`. Observe phone metadata rejected and phone block absent; 4 new failures expected, existing tests stay green. Fix test setup errors before implementing.

### Task 2: Generalize frame-specific pure model

**File:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs`

- [ ] After the model RED evidence, replace only this model with the following implementation.

```js
export function createPositionModel(metadata) {
  const scene={...metadata.scene},title={...metadata.title};
  const id=metadata.frame?.id??"desktop-single";
  const sizes={"desktop-single":[960,540,288,84],"phone-staggered":[390,600,148,98]};
  const dimensions=sizes[id];
  if(!dimensions||[scene.width,scene.height,title.width,title.height].some((n,i)=>n!==dimensions[i])||
     (metadata.frame&&(metadata.frame.width!==scene.width||metadata.frame.height!==scene.height))||
     ![title.x,title.y].every(Number.isInteger)||
     ![scene,title].every(a=>typeof a.path==="string"&&/^[a-f0-9]{64}$/.test(a.sha256)))throw Error("Invalid positioning metadata");
  const width=scene.width,height=scene.height,tw=title.width,th=title.height;
  const finite=(...values)=>{if(!values.every(Number.isFinite))throw Error("Non-finite position");};
  const position=(x,y)=>{finite(x,y);return {x:Math.max(0,Math.min(width-tw,Math.round(x))),y:Math.max(0,Math.min(height-th,Math.round(y)))};};
  const initial=Object.freeze(position(title.x,title.y));
  return Object.freeze({
    initial,position,
    point(x,y,rect){
      finite(x,y,rect.left,rect.top,rect.width,rect.height);
      if(rect.width<=0||rect.height<=0)throw Error("Image content has no size");
      return {x:(x-rect.left)*width/rect.width,y:(y-rect.top)*height/rect.height};
    },
    begin(p,q){finite(q.x,q.y);return {position:position(p.x,p.y),point:{...q}};},
    drag(a,q){return position(a.position.x+q.x-a.point.x,a.position.y+q.y-a.point.y);},
    nudge(p,dx,dy,fast=false){finite(dx,dy);return position(p.x+dx*(fast?10:1),p.y+dy*(fast?10:1));},
    payload(p){
      const value=position(p.x,p.y);
      return {schema:"mimic-landing-title-position/v1",reviewOnly:true,
        frame:{id,width,height},
        scene:{path:scene.path,sha256:scene.sha256},
        title:{path:title.path,sha256:title.sha256,...value,width:tw,height:th},
        anchor:"top-left",unit:"logical-px",
        centerPercent:{x:Number(((value.x+tw/2)/width*100).toFixed(2)),y:Number(((value.y+th/2)/height*100).toFixed(2))}};
    },
  });
}
```
- [ ] Re-run the same unit command. Expected: pure-model phone tests and all desktop tests pass; only new HTML phone-block contract remains RED until Task 4. Do not weaken that assertion.

### Task 3: Add mobile browser contracts

**File:** `web/e2e/landing-mobile-title-positioning-review.spec.ts`

- [ ] Add the following browser spec before adding phone UI. Routes read actual files; injections occur only at unavailable/failed/delayed external clipboard or image boundary. Native clipboard and native touch also tested.

```ts
import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test,type Page} from "@playwright/test";
const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const origin="https://a-title-review.local";
const fileURL=pathToFileURL(path.join(review,"landing-a-title-review.html")).href;
const panel=(p:Page,id="phone-staggered")=>p.locator('[data-title-position-tool][data-frame="'+id+'"]');
const sprite=(p:Page)=>panel(p).locator("[data-position-title]");
const background=(p:Page)=>panel(p).locator("[data-position-background]");
const select=(p:Page,id:string)=>p.locator('[data-position-frame="'+id+'"]').click();
const ready=(p:Page,id="phone-staggered")=>expect(panel(p,id)).toHaveAttribute("data-ready","true");
type Payload={frame:{id:string;width:number;height:number};scene:{path:string;sha256:string};title:{x:number;y:number;width:number;height:number;path:string;sha256:string}};
async function payload(p:Page,id="phone-staggered"):Promise<Payload>{return JSON.parse(await panel(p,id).locator("[data-position-json]").inputValue());}
async function serve(p:Page,query="phone",fault?: "missing"|"wrong"|"background"){
  await p.route(origin+"/**",async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    if(fault&&pathname===(fault==="background"?"/samples/landing-a-title/scene-phone-logical.png":"/samples/landing-a-title/wordmarks/phone-staggered.png")){
      if(fault==="wrong"){await route.fulfill({contentType:"image/png",body:await readFile(path.join(review,"samples/landing-a-title/wordmarks/single.png"))});return;}
      await route.fulfill({status:404,body:"Missing test source"});return;
    }
    const target=path.resolve(review,pathname.replace(/^\/+/,""));
    if(!target.startsWith(review+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
    try{await route.fulfill({body:await readFile(target),contentType:target.endsWith(".html")?"text/html; charset=utf-8":target.endsWith(".png")?"image/png":"text/plain; charset=utf-8"});}
    catch{await route.fulfill({status:404,body:"Not found"});}
  });
  await p.goto(origin+"/landing-a-title-review.html?position="+query);
  await expect(p.locator("[data-position-family]")).toHaveCount(1,{timeout:1000});
}
type PendingWindow=Window&{pendingCopies:{text:string;resolve:()=>void}[]};
test("phone entry uses real portrait layers, readable overlays and no overflow",async({page},info)=>{
  await serve(page);await ready(page);
  await expect(panel(page)).toBeVisible();await expect(panel(page,"desktop-single")).toBeHidden();
  expect(await payload(page)).toMatchObject({frame:{id:"phone-staggered",width:390,height:600},title:{x:116,y:93,width:148,height:98}});
  await expect(background(page)).toHaveAttribute("src","samples/landing-a-title/scene-phone-logical.png");
  await expect(panel(page).locator("[data-position-sprite]")).toHaveAttribute("src","samples/landing-a-title/wordmarks/phone-staggered.png");
  expect(await panel(page).locator("img").count()).toBe(2);
  const b=(await background(page).boundingBox())!;
  expect(b.width/b.height).toBeCloseTo(390/600,2);expect(b.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for(const button of await page.locator(".position-controls button:visible").all()){
    const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const dialogue=panel(page).locator(".position-dialogue");
  expect(await dialogue.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
  await expect(panel(page).locator(".position-cta")).toBeVisible();
  await expect(panel(page).locator(".position-login")).toBeVisible();
  await panel(page).screenshot({path:info.outputPath("phone-position-initial.png")});
  await panel(page).getByRole("checkbox",{name:"啟用定位"}).uncheck();
  await panel(page).screenshot({path:info.outputPath("phone-position-clean.png")});
});
test("phone mouse drag maps displayed scale without losing grab offset",async({page})=>{
  await serve(page);await ready(page);await background(page).scrollIntoViewIfNeeded();
  const b=(await background(page).boundingBox())!,t=(await sprite(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/3,t.y+t.height/3);await page.mouse.down();
  await page.mouse.move(t.x+t.width/3+20*b.width/390,t.y+t.height/3+10*b.height/600);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:136,y:103});
  await page.mouse.move(t.x,t.y);expect((await payload(page)).title).toMatchObject({x:136,y:103});
});
test("phone keys, clamp, cancel and reset use phone bounds",async({page})=>{
  await serve(page);await ready(page);await sprite(page).focus();
  await page.keyboard.press("ArrowRight");await page.keyboard.press("Shift+ArrowUp");
  expect((await payload(page)).title).toMatchObject({x:117,y:83});
  for(let i=0;i<60;i++)await page.keyboard.press("Shift+ArrowRight");
  for(let i=0;i<60;i++)await page.keyboard.press("Shift+ArrowDown");
  expect((await payload(page)).title).toMatchObject({x:242,y:502});
  await panel(page).getByRole("button",{name:"還原位置"}).click();
  await background(page).scrollIntoViewIfNeeded();
  const t=(await sprite(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();
  await sprite(page).dispatchEvent("pointercancel",{pointerId:1});
  await page.mouse.move(t.x+t.width/2+20,t.y+t.height/2+20);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:116,y:93});
  const json=panel(page).locator("[data-position-json]");await json.focus();await page.keyboard.press("ArrowLeft");
  expect((await payload(page)).title.x).toBe(116);
});
test("switch preserves independent positions, preferences and reset targets",async({page})=>{
  await serve(page);await ready(page);
  await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("checkbox",{name:"顯示輔助線"}).uncheck();
  await select(page,"desktop-single");await ready(page,"desktop-single");
  const desktop=panel(page,"desktop-single");
  await desktop.getByRole("button",{name:"向下微調"}).click();
  await expect(desktop.getByRole("checkbox",{name:"顯示輔助線"})).toBeChecked();
  await select(page,"phone-staggered");
  expect((await payload(page)).title).toMatchObject({x:117,y:93});
  await expect(panel(page).getByRole("checkbox",{name:"顯示輔助線"})).not.toBeChecked();
  await expect(desktop).toBeHidden();await expect(desktop.locator("[data-position-title]")).toBeDisabled();
  await panel(page).getByRole("button",{name:"還原位置"}).click();
  await select(page,"desktop-single");
  expect((await payload(page,"desktop-single")).title).toMatchObject({x:385,y:85});
  await select(page,"phone-staggered");expect((await payload(page)).title).toMatchObject({x:116,y:93});
});
test("switch cancels an active phone drag and hidden frame stays still",async({page})=>{
  await serve(page);await ready(page);await background(page).scrollIntoViewIfNeeded();
  const t=(await sprite(page).boundingBox())!,b=(await background(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();
  await page.mouse.move(t.x+t.width/2+20*b.width/390,t.y+t.height/2+10*b.height/600);
  await page.locator('[data-position-frame="desktop-single"]').evaluate(e=>(e as HTMLElement).click());
  await page.mouse.move(t.x+t.width/2+40,t.y+t.height/2+30);await page.mouse.up();
  await select(page,"phone-staggered");expect((await payload(page)).title).toMatchObject({x:136,y:103});
  await expect(panel(page)).not.toHaveAttribute("data-dragging");
});
test("real touch drag works and the rest of the page remains scrollable",async({browser,page})=>{
  const context=await browser.newContext({viewport:page.viewportSize()!,hasTouch:true});
  try{
    const touch=await context.newPage();await serve(touch);await ready(touch);await background(touch).scrollIntoViewIfNeeded();
    const t=(await sprite(touch).boundingBox())!,b=(await background(touch).boundingBox())!;
    const session=await context.newCDPSession(touch);
    const x=t.x+t.width/2,y=t.y+t.height/2;
    await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x+20*b.width/390,y:y+10*b.height/600}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    expect((await payload(touch)).title).toMatchObject({x:136,y:103});
    expect(await sprite(touch).evaluate(e=>getComputedStyle(e).touchAction)).toBe("none");
    expect(await background(touch).evaluate(e=>getComputedStyle(e).touchAction)).toBe("auto");
    const scrollBefore=await touch.evaluate(()=>window.scrollY);
    await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:b.x+b.width-10,y:b.y+b.height/2}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:b.x+b.width-10,y:b.y+b.height/2-60}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await expect.poll(()=>touch.evaluate(()=>window.scrollY)).toBeGreaterThan(scrollBefore);
    expect((await payload(touch)).title).toMatchObject({x:136,y:103});
  }finally{await context.close();}
});
test("real clipboard contains exact phone JSON, not desktop metadata",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin});
  await serve(page);await ready(page);
  await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("button",{name:"複製位置"}).click();
  await expect(panel(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  const actual=await page.evaluate(()=>navigator.clipboard.readText());
  expect(actual.replaceAll("\r\n","\n")).toBe(await panel(page).locator("[data-position-json]").inputValue());
  expect(JSON.parse(actual)).toEqual(await payload(page));
  expect(JSON.parse(actual)).toMatchObject({frame:{id:"phone-staggered"},title:{x:117,y:93,width:148,height:98}});
});
test("cross-frame pending writes are serialized and never announce success on wrong frame",async({page})=>{
  await page.addInitScript(()=>{
    const w=window as unknown as PendingWindow;w.pendingCopies=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:(text:string)=>new Promise<void>(resolve=>w.pendingCopies.push({text,resolve}))}});
  });
  await serve(page);await ready(page);await select(page,"desktop-single");await ready(page,"desktop-single");
  await panel(page,"desktop-single").getByRole("button",{name:"複製位置"}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(1);
  await select(page,"phone-staggered");await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("button",{name:"複製位置"}).click();
  expect(await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(1);
  await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[0].resolve());
  await expect.poll(()=>page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(2);
  await expect(panel(page).locator("[data-position-status]")).not.toContainText("已複製");
  await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[1].resolve());
  await expect(panel(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  expect(JSON.parse(await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[1].text))).toMatchObject({frame:{id:"phone-staggered"},title:{x:117}});
});
for(const fault of ["missing","wrong","background"] as const){
  test("phone image "+fault+" disables only phone",async({page})=>{
    await serve(page,"phone",fault);
    await expect(panel(page)).toHaveAttribute("data-ready","error");
    await expect(panel(page).getByRole("button",{name:"複製位置"})).toBeDisabled();
    await expect(panel(page).locator("[data-position-json]")).toHaveValue("");
    await select(page,"desktop-single");await ready(page,"desktop-single");
    await panel(page,"desktop-single").getByRole("button",{name:"向右微調"}).click();
    expect((await payload(page,"desktop-single")).title.x).toBe(386);
    await expect(page.locator(".scene")).toHaveCount(3);
  });
}
for(const failure of ["missing","rejected"] as const){
  test("phone clipboard "+failure+" offers current selectable JSON",async({page})=>{
    await page.addInitScript(kind=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:kind==="missing"?undefined:{writeText:async()=>{throw Error("Denied test permission");}}}),failure);
    await serve(page);await ready(page);await panel(page).getByRole("button",{name:"複製位置"}).click();
    const json=panel(page).locator("[data-position-json]");
    await expect(json).toBeFocused();
    await expect(panel(page).locator("[data-position-status]")).toContainText("請選取 JSON");
    expect(await json.evaluate(e=>{const t=e as HTMLTextAreaElement;return t.selectionEnd-t.selectionStart;})).toBe((await json.inputValue()).length);
    expect((await payload(page)).frame.id).toBe("phone-staggered");
  });
}
test("unknown query falls back to desktop and resize never changes selected frame",async({page})=>{
  await serve(page,"unexpected");await ready(page,"desktop-single");await expect(panel(page,"desktop-single")).toBeVisible();
  await select(page,"phone-staggered");await ready(page);await panel(page).getByRole("button",{name:"向右微調"}).click();
  await page.setViewportSize({width:320,height:568});await expect(panel(page)).toBeVisible();
  expect((await payload(page)).title.x).toBe(117);
  await page.setViewportSize({width:1440,height:900});await expect(panel(page)).toBeVisible();
  expect((await payload(page)).title.x).toBe(117);
});
test("actual file phone URL is usable and reload resets only unsaved preview",async({page})=>{
  await page.goto(fileURL+"?position=phone");await ready(page);await expect(panel(page)).toBeVisible();
  await panel(page).getByRole("button",{name:"向右微調"}).click();expect((await payload(page)).title.x).toBe(117);
  await page.reload();await ready(page);expect((await payload(page)).title.x).toBe(116);
});
```
- [ ] Add the new spec to existing config and scope old desktop helper without deleting any old tests:

```diff
--- web/e2e/landing-title-positioning.playwright.config.ts
+++ web/e2e/landing-title-positioning.playwright.config.ts
@@
-  testDir:".",testMatch:["landing-title-positioning-review.spec.ts","landing-a-title-review.spec.ts"],
+  testDir:".",testMatch:["landing-title-positioning-review.spec.ts","landing-a-title-review.spec.ts","landing-mobile-title-positioning-review.spec.ts"],
--- web/e2e/landing-title-positioning-review.spec.ts
+++ web/e2e/landing-title-positioning-review.spec.ts
@@
-const root=(page:Page)=>page.locator("[data-title-position-tool]");
+const root=(page:Page)=>page.locator('[data-title-position-tool][data-frame="desktop-single"]');
```
- [ ] From `web/`, run `npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts landing-mobile-title-positioning-review.spec.ts`. Observe phone/family absence across all four viewport projects before UI implementation. Use brief progress updates during yielded commands.

### Task 4a: Shared write ordering and frame selection

**File:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.family.mjs`

- [ ] Apply this exact new/replacement content only after browser RED; these mutually dependent Task 4 files are one implementation batch. No unrelated formatting.

```js
export function mountPositionFamily(factory,mount,container) {
  if(!container)return;
  const panels=[...container.querySelectorAll("[data-title-position-tool]")];
  const buttons=[...container.querySelectorAll("[data-position-frame]")];
  let queue=Promise.resolve();
  const writes={enqueue(task){const result=queue.catch(()=>{}).then(task);queue=result;return result;}};
  const controllers=new Map(panels.map(panel=>[panel.dataset.frame,mount(factory,panel,writes)]));
  function select(id){
    if(!panels.some(panel=>panel.dataset.frame===id))return;
    const active=container.ownerDocument.activeElement;
    if(panels.some(panel=>panel.dataset.frame!==id&&panel.contains(active)))buttons.find(button=>button.dataset.positionFrame===id)?.focus({preventScroll:true});
    for(const panel of panels)controllers.get(panel.dataset.frame)?.deactivate();
    for(const panel of panels){
      const selected=panel.dataset.frame===id;
      panel.hidden=!selected;panel.inert=!selected;
      if(selected)controllers.get(id)?.activate();
    }
    for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.positionFrame===id));
    container.dataset.selectedFrame=id;
  }
  for(const button of buttons)button.addEventListener("click",()=>select(button.dataset.positionFrame));
  const query=new URLSearchParams(container.ownerDocument.defaultView.location.search);
  select(query.get("position")==="phone"?"phone-staggered":"desktop-single");
}
```
### Task 4b: Independent controller

**File:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs`

- [ ] Apply this exact new/replacement content only after browser RED; these mutually dependent Task 4 files are one implementation batch. No unrelated formatting.

```js
export function mountPositionTool(factory,root,sharedWrites) {
  if(!root)return;
  const q=selector=>root.querySelector(selector),win=root.ownerDocument.defaultView;
  const background=q("[data-position-background]"),sprite=q("[data-position-sprite]");
  const title=q("[data-position-title]"),mode=q("[data-position-mode]"),guideToggle=q("[data-position-guide-toggle]");
  const guides=q("[data-position-guides]"),box=q("[data-position-guide-box]"),vertical=q("[data-position-guide-v]"),horizontal=q("[data-position-guide-h]");
  const output=q("[data-position-json]"),coordinates=q("[data-position-coordinates]"),status=q("[data-position-status]");
  const reset=q("[data-position-reset]"),copy=q("[data-position-copy]"),nudges=[...root.querySelectorAll("[data-position-nudge]")];
  const message=text=>{status.textContent=text;};
  let model,meta,position,ready=false,drag=null,revision=0,request=0;
  let queue=Promise.resolve();
  const writes=sharedWrites??{enqueue(task){const result=queue.catch(()=>{}).then(task);queue=result;return result;}};
  const available=()=>ready&&!root.hidden;
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
    const sw=meta.scene.width,sh=meta.scene.height,tw=meta.title.width,th=meta.title.height;
    const rect={left:position.x/sw*100+"%",top:position.y/sh*100+"%",width:tw/sw*100+"%",height:th/sh*100+"%"};
    Object.assign(title.style,rect);Object.assign(box.style,rect);
    vertical.style.left=(position.x+tw/2)/sw*100+"%";horizontal.style.top=(position.y+th/2)/sh*100+"%";
    guides.hidden=!(available()&&mode.checked&&guideToggle.checked);
    title.disabled=!(available()&&mode.checked);title.tabIndex=available()&&mode.checked?0:-1;
    for(const button of nudges)button.disabled=!(available()&&mode.checked);
    mode.disabled=!available();guideToggle.disabled=!available();reset.disabled=!available();copy.disabled=!available();
    output.value=JSON.stringify(payload,null,2);
    coordinates.textContent="左上 X "+position.x+"／Y "+position.y+" logical px；中心 "+cx.toFixed(2)+"%／"+cy.toFixed(2)+"%；尺寸 "+tw+"×"+th+"（鎖定）";
  }
  function update(next,force=false){
    if(!force&&next.x===position.x&&next.y===position.y)return;
    position=next;revision++;draw();message("位置已變更，請重新複製。");
  }
  title.addEventListener("pointerdown",event=>{
    if(!available()||!mode.checked||event.button!==0||drag)return;
    const point=model.point(event.clientX,event.clientY,background.getBoundingClientRect());
    title.focus({preventScroll:true});
    try{title.setPointerCapture(event.pointerId);}catch{return;}
    drag={id:event.pointerId,anchor:model.begin(position,point)};
    root.dataset.dragging="true";event.preventDefault();
  });
  title.addEventListener("pointermove",event=>{
    if(!drag||drag.id!==event.pointerId||!available()||!mode.checked)return;
    update(model.drag(drag.anchor,model.point(event.clientX,event.clientY,background.getBoundingClientRect())));
    event.preventDefault();
  });
  for(const name of ["pointerup","pointercancel","lostpointercapture"])title.addEventListener(name,event=>{
    if(drag&&drag.id===event.pointerId)endDrag();
  });
  const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  title.addEventListener("keydown",event=>{
    if(!available()||!mode.checked||root.ownerDocument.activeElement!==title||event.altKey||event.ctrlKey||event.metaKey||!steps[event.key])return;
    event.preventDefault();const [dx,dy]=steps[event.key];
    update(model.nudge(position,dx,dy,event.shiftKey));
  });
  for(const button of nudges)button.addEventListener("click",()=>{
    if(!available()||!mode.checked)return;endDrag();
    const [dx,dy]=button.dataset.positionNudge.split(",").map(Number);
    update(model.nudge(position,dx,dy));
  });
  mode.addEventListener("change",()=>{
    endDrag();if(!mode.checked&&root.ownerDocument.activeElement===title)mode.focus({preventScroll:true});
    draw();
  });
  guideToggle.addEventListener("change",draw);
  reset.addEventListener("click",()=>{if(!available())return;endDrag();update({...model.initial},true);});
  copy.addEventListener("click",()=>{
    if(!available())return;
    const token=++request,version=revision,text=output.value;
    message("正在複製位置…");
    // Serializing writes keeps an older delayed write from overwriting the newest clipboard content.
    writes.enqueue(async()=>{
      if(token!==request||!ready)return;
      try{
        if(typeof win.navigator.clipboard?.writeText!=="function")throw Error("Clipboard unavailable");
        await win.navigator.clipboard.writeText(text);
        if(token!==request||!ready)return;
        message(version===revision?"已複製目前位置":"剪貼簿為先前位置，請重新複製。");
      }catch{
        if(token!==request||!ready)return;
        if(!root.hidden){output.focus();output.select();}
        message("無法自動複製，請選取 JSON 並按 Ctrl+C。");
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
  return {deactivate(){
    endDrag();guides.hidden=true;title.tabIndex=-1;
    for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
  },activate(){if(ready)draw();}};
}
```
### Task 4c: Dual-frame renderer

**File:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs`

- [ ] Apply this exact new/replacement content only after browser RED; these mutually dependent Task 4 files are one implementation batch. No unrelated formatting.

```js
import { createPositionModel } from "./landing-title-position.model.mjs";
import { mountPositionTool } from "./landing-title-position.controller.mjs";
import { mountPositionFamily } from "./landing-title-position.family.mjs";

function renderPositionPanel(manifest,key) {
  const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
  const frame=manifest.frames[key],scene=manifest.scenes[frame.view].logical,title=frame.title;
  const meta={frame:{id:key,width:scene.width,height:scene.height},scene:{...scene,path:rel(scene)},title:{...title,path:rel(title)}};
  createPositionModel(meta);
  const json=JSON.stringify(meta).replaceAll("<","\\u003c").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029");
  const esc=text=>String(text).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const sign=manifest.scenes[frame.view].layers.find(l=>l.id==="sign");
  if(!sign)throw Error("Missing preserved sign");
  const signStyle="left:"+(sign.x+sign.width*.16)/scene.width*100+"%;top:"+(sign.y+sign.height*.17)/scene.height*100+"%;width:"+sign.width*.7/scene.width*100+"%;height:"+sign.height*.48/scene.height*100+"%";
  return `<section class="position-tool${frame.view==="phone"?" position-phone":""}" data-title-position-tool data-frame="${key}" data-ready="loading" aria-labelledby="position-heading-${key}"${frame.view==="phone"?" hidden inert":""}>
<h2 id="position-heading-${key}">${frame.view==="phone"?"手機兩行 MI／MIC":"桌機單行 MIMIC"}：標題定位</h2>
<p>只有標題可移動，尺寸／亮度／其餘素材鎖定。目前使用${frame.view==="phone"?"手機直向構圖，不是桌機裁切":"桌機橫向構圖"}；切換版本會保留本次載入的各自位置。</p>
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
<img class="position-background" data-position-background src="${esc(meta.scene.path)}" width="${scene.width}" height="${scene.height}" alt="無法師 A ${frame.view==="phone"?"手機":"桌機"}場景，標題另層定位" draggable="false">
<button type="button" class="position-title" data-position-title aria-label="可移動的 MIMIC 標題" tabindex="-1" disabled><img data-position-sprite src="${esc(meta.title.path)}" width="${title.width}" height="${title.height}" alt="" draggable="false"></button>
<a class="position-sign" href="#journal" style="${signStyle}">開始<br>冒險</a>
<a class="position-login" href="#review-notes">登入</a>
<div class="position-dialogue"><div><span class="position-speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="position-cta" href="#journal">開始冒險 ↓</a></div>
<div class="position-guides" data-position-guides aria-hidden="true" hidden><span class="position-guide-box" data-position-guide-box></span><span class="position-guide-v" data-position-guide-v></span><span class="position-guide-h" data-position-guide-h></span></div>
</div></div>
<p data-position-coordinates>圖片載入中。</p><p data-position-status role="status" aria-live="polite">圖片載入中。</p>
<label for="position-json-${key}">位置 JSON（可手動選取複製）</label><textarea id="position-json-${key}" class="position-json" data-position-json readonly spellcheck="false"></textarea>
<p>只限制在場景內以防裁切；是否跨洞口／岩縫或遮住伙伴仍需目視。貼回 JSON 後才另行套用，不會自動修改檔案或核准。</p>
<script type="application/json" data-position-config>${json}</script>
<noscript>定位工具需要 JavaScript；下方原比較頁仍可閱讀。</noscript>
</section>
`;
}

export function renderPositionTool(manifest) {
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

.position-family-controls button[aria-pressed="true"]{background:#80603a;border-color:#efc56c}
.position-family-controls button:focus-visible{outline:3px solid #eabc62;outline-offset:2px}
.position-phone .position-viewport{max-width:390px}
.position-phone .position-sign{font-size:3.3cqw}
.position-phone .position-login{font-size:12px;padding:3px 10px}
.position-phone .position-dialogue{bottom:2%;height:26%;padding:8px;display:block}
.position-phone .position-speaker{font-size:11px;line-height:1.3}
.position-phone .position-dialogue p{font-size:12px;margin:3px 0}
.position-phone .position-cta{display:inline-block;margin-top:4px;font-size:12px;padding:4px 10px}
</style>
<div data-position-family>
<div class="position-controls position-family-controls" role="group" aria-label="選擇定位版本">
<button type="button" data-position-frame="desktop-single" aria-controls="position-heading-desktop-single" aria-pressed="true">桌機單行</button>
<button type="button" data-position-frame="phone-staggered" aria-controls="position-heading-phone-staggered" aria-pressed="false">手機兩行</button>
</div>
${["desktop-single","phone-staggered"].map(key=>renderPositionPanel(manifest,key)).join("")}
</div>
<script>(${mountPositionFamily.toString()})(${createPositionModel.toString()},${mountPositionTool.toString()},document.querySelector("[data-position-family]"));</script>
<!--landing-title-position-tool:end-->
`;
}
```
### Task 4d: HTML-only source verification

**File:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs`

- [ ] Apply this exact new/replacement content only after browser RED; these mutually dependent Task 4 files are one implementation batch. No unrelated formatting.

```js
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
  [m.scenes.phone.logical,"7573dceb82c484c223164d26e4fc6514f65ee2149d65001bba0e9a2a824f693d",390,600],
  [m.frames["phone-staggered"].title,"8fd7d677df46cc77478518de2a9f68ff77b8ae4d28deb25e6b11ad5ba6ee8f1c",148,98],
];
for(const [a,digest,width,height] of expected){
  const file=path.resolve(repo,a.path);
  if(!file.startsWith(dir+path.sep))throw Error("Asset outside review");
  const bytes=await readFile(file),png=PNG.sync.read(bytes);
  if(a.sha256!==digest||hash(bytes)!==digest||a.width!==width||a.height!==height||png.width!==width||png.height!==height)throw Error("Changed positioning asset: "+a.path);
}
const previous=await readFile(path.join(dir,"landing-warm-rest-review.html"),"utf8");
const html=renderReview(m,previous);
if((html.match(/data-title-position-tool data-frame=/g)??[]).length!==2)throw Error("Expected two independent panels");
await writeFile(path.join(dir,"landing-a-title-review.html"),html);
console.log("Rendered review HTML only: "+hash(html));
```

### Task 4e: Generate only HTML and verify GREEN

- [ ] From repo root, run `node --check` on the model, family, controller, tool renderer and HTML CLI, then run:
```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs
```
- [ ] From `web/`, run:
```powershell
npm test -- src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
npx playwright test --config=e2e/landing-title-positioning.playwright.config.ts
```
Expected: 5 Vitest files / 28 tests, 112 Playwright cases (60 new phone + 52 existing desktop/history). If failures expose viewport scroll, CDP/clipboard platform differences or a real implementation bug, diagnose first using systematic-debugging; preserve intended contracts and TDD repair evidence.

### Task 5: Focused quality checks and self-review

- [ ] From `web/`:
```powershell
npx eslint src/shared/brand/landing-mobile-title-positioning.test.ts e2e/landing-mobile-title-positioning-review.spec.ts e2e/landing-title-positioning-review.spec.ts e2e/landing-title-positioning.playwright.config.ts
npm run typecheck
```
- [ ] From repo root, ESM lint MUST run from this cwd (web cwd previously caused ignored-file warnings):
```powershell
node web/node_modules/eslint/bin/eslint.js --no-ignore --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.family.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.controller.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-title-position-tool.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title-page.mjs
```
- [ ] Repeat HTML-only generation twice and compare complete bytes. Recompute immutable baseline excluding only exact file map additions/mutable paths and mobile-previews, and compare public/index fingerprints. Verify original HTML hash after removing sole marked tool block remains `77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded`. Existing desktop user receipt remains un-applied.
- [ ] Use repository self-review: read all changed implementation functions and tests; cover correctness, edge cases, completeness, architecture, style, security and test asymmetry. Fix important/critical issues with failing regression first, then re-review. Check switch deactivates hidden controls/focus/drag, decode failure isolated, shared clipboard serialization, hidden failure never steals focus, all source dimensions/hash checks actually executed.
- [ ] Copy new Playwright actual screenshots to eight unique destinations, never overwrite old desktop previews:
```powershell
$mobilePreviewRoot = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-positioning/mobile-previews'
if (Test-Path -LiteralPath $mobilePreviewRoot) { throw 'Preview destination already exists; inspect before writing' }
New-Item -ItemType Directory -Path $mobilePreviewRoot | Out-Null
foreach ($mobileProject in @('phone-small','phone','tablet','desktop')) {
  foreach ($mobileKind in @('initial','clean')) {
    $mobilePreviewName = 'phone-position-' + $mobileKind + '.png'
    $mobileScreenshot = @(Get-ChildItem -LiteralPath web/test-results -Recurse -File -Filter $mobilePreviewName | Where-Object { $_.Directory.Name.EndsWith('-' + $mobileProject) })
    if ($mobileScreenshot.Count -ne 1) { throw ('Expected one screenshot for ' + $mobileProject + ' ' + $mobileKind) }
    Copy-Item -LiteralPath $mobileScreenshot[0].FullName -Destination (Join-Path $mobilePreviewRoot ($mobileProject + '-' + $mobilePreviewName))
  }
}
```
- [ ] View all eight screenshots using view_image. Confirm genuine portrait scene and unchanged art, phone-title size/placement, controls, dialogue, focus and no unwanted visual style redesign.
- [ ] Run `git diff --check`. For new/untracked text use `git -c core.autocrlf=false diff --no-index --check -- NUL <exact-file>`; exit 1 with zero diagnostics is normal no-index differences, not whitespace failure. Reject diagnostics or code >1.
- [ ] Do not stage implementation: preserve user's dirty/staged groups.

### Task 6: Evidence-backed handoff

- [ ] Append, never replace, a factual AGENTS-format devlog entry with scope, actual verification counts, no asset/runtime mutation, receipt 376/100 not applied, and remaining visual-position approval.
- [ ] Verify devlog first 185,489 bytes match original prefix hash. Re-run focused checks after any fixes; use verification-before-completion before assertions.
- [ ] Use finishing-a-development-branch with the already selected keep-as-is boundary: no merge/PR/cleanup, implementation stays uncommitted. Do not offer irrelevant integration actions.
- [ ] Open the same local review with `?position=phone` using open_in_codex (do not reload existing desktop tab yourself; opening may return queued). Report actual status. Provide the local page link and real phone preview if useful.
- [ ] Explain switching, dragging/arrow controls, reset isolation and copy JSON. Stop for user's phone position or visual feedback; do not apply either frame, approve Scenes or promote runtime.

## Inline plan self-review checklist

- [x] All six spec sections mapped: sources/frame math (Tasks 1–2), phone UI/switch/clipboard/failure (Tasks 3–4), desktop receipt (baseline + Task 6), verification (Task 5), protected dirty boundary (all tasks).
- [x] No undefined functions or incomplete code steps; model/controller/family serialization has no external closure dependency.
- [x] No execution-mode prompt, subagent/worktree, asset regeneration, source/hash mutation, automatic persistence, or manifest/config write introduced.
