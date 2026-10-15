# Landing Ordinary Chest Material Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user already selected Inline Execution: no subagents, no worktree, and no execution-mode question. Steps use checkbox syntax for tracking.

**Goal:** Produce one ImageGen chest material revision matching the warrior, preserving the round lid and fixed transform, with an isolated old/new visual review checkpoint.

**Architecture:** Reconstruct the frozen desktop from its original architecture and ordered layers, prove it equals the currently reviewed logical raster, then replace only the chest layer. Generate independent review artifacts; reuse the phone and title bytes. Small focused raster, compositor and renderer modules are new siblings and never execute historical generators.

**Tech Stack:** Node ESM, existing web pngjs, Vitest, Playwright, ESLint, TypeScript and built-in ImageGen.

**Approved spec:** `docs/superpowers/specs/2026-10-15-landing-ordinary-chest-material-design.md`, commit `c18da61`; user confirmed the written spec on 2026-10-15.

---

## Files and responsibilities

All review paths below use prefix `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/` (called R below).
Every path beginning R resolves to that exact prefix, not a new directory.

| File | Responsibility |
| --- | --- |
| R `samples/derivations/landing-chest-material-v01/prompt.md` | Actual submitted ImageGen prompt |
| R `samples/derivations/landing-chest-material-v01/lineage.json` | ImageGen parent/reference identities |
| R `samples/derivations/landing-chest-material-v01/ordinary-chest-source.png` | Untouched generated transparent source |
| R `landing-chest-raster.mjs` | Pure numerical crop/fit/nearest/alpha/gray operations, not creative drawing |
| R `compose-landing-chest-material.mjs` | Checked source loading, exact reconstruction, guarded new-only exports |
| R `render-landing-chest-material.mjs` | Old/new comparison using existing scene UI and four journal chapters |
| R `landing-chest-material.manifest.json` | Source/lineage/output fingerprints and frozen transforms |
| R `landing-chest-material-review.html` | User's material-only visual checkpoint |
| R `samples/landing-chest-material-v01/` | Eight deterministic PNGs; optional QA screenshots in `previews/` |
| `web/src/shared/brand/landing-chest-material.test.ts` | Seven unit/artifact/guard/determinism contracts |
| `web/e2e/landing-chest-material-review.spec.ts` | Browser review contract × four viewports |
| `web/e2e/landing-chest-material.playwright.config.ts` | New isolated config, including existing regression specs |
| `.agents/devlog.md` | Append implementation evidence only, preserving existing bytes |

Do not modify the old config, model, controller, renderer, composer, manifest,
approval receipt, page, sources, or exports. Track checkboxes in session state
rather than changing this plan during execution.

## Task 1: Baseline protection and real RED contracts

**Files:** Read AGENTS.md, `.agents/features.md`, the approved spec, and the prior
title-placement manifest/page. Create only the new two test files and new
Playwright config listed below.

- [ ] Run `git status --short` before writes. Read executing-plans and TDD skills.
  Stay on main Inline; no worktree or delegation. Read the source spec completely.
- [ ] Record a session baseline of SHA-256 for all tracked and non-ignored
  untracked files, except the exact new task paths above and the new derivation/
  export directories. Do not enumerate `.codex-remote-attachments/` or
  `reference/`. Separately record all `web/public` files, including ignored
  files; staged `git diff --cached --binary`; devlog full length and hash.
  Protect the original devlog prefix on subsequent comparisons.
- [ ] Refuse any pre-existing new output target unless its own prior manifest
  proves matching provenance and unchanged bytes. No cleanup or forced overwrite.
- [ ] Use apply_patch to add `web/src/shared/brand/landing-chest-material.test.ts`
  with this complete RED-stage code. Delayed imports let missing files fail as
  assertions, not as Vite's import-analysis error before test registration.

```ts
import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it} from "vitest";
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",dir=path.join(root,prefix);
type Asset={path:string;sha256:string;width:number;height:number};
type Frame={logical:Asset;color:Asset;gray:Asset;title:Asset&{x:number;y:number}};
type Manifest={decision:string;reviewOnly:boolean;runtimePromotion:boolean;inputs:Record<string,Asset>;outputs:Record<string,Asset>;
 before:{layer:Asset;frame:Frame};frames:Record<string,Frame>;placement:{x:number;y:number;width:number;height:number};review:Asset;changedPixels:number;
 fit:{bounds:{x:number;y:number;width:number;height:number};width:number;height:number;x:number;y:number;scale:number}};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function load(){
  expect(existsSync(path.join(dir,"landing-chest-material.manifest.json")),"Chest material manifest required").toBe(true);
  return JSON.parse(await readFile(path.join(dir,"landing-chest-material.manifest.json"),"utf8")) as Manifest;
}
async function image(a:Asset){
  const b=await readFile(path.join(root,a.path));expect(hash(b)).toBe(a.sha256);
  const p=PNG.sync.read(b);expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function composeModule(){
  expect(existsSync(path.join(dir,"compose-landing-chest-material.mjs")),"Chest compositor required").toBe(true);
  const source="../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs";
  return await import(/* @vite-ignore */source) as {composeChestMaterial:()=>Promise<Manifest>};
}
async function rasterModule(){
  expect(existsSync(path.join(dir,"landing-chest-raster.mjs")),"Chest raster module required").toBe(true);
  const source="../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs";
  return await import(/* @vite-ignore */source) as {
    fitChest:(p:PNG)=>{png:PNG;fit:Manifest["fit"]};over:(c:PNG,p:PNG,x:number,y:number)=>void;
  };
}
it("keeps both titles, phone and chest transform exact without approving the family",async()=>{
  const m=await load(),old=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,placement:{x:105,y:284,width:78,height:66}});
  expect(m.frames["desktop-before"]).toEqual(old.frames["desktop-single"]);
  expect(m.frames["desktop-after"].title).toEqual(old.frames["desktop-single"].title);
  expect(m.frames["phone-staggered"]).toEqual(old.frames["phone-staggered"]);
  expect(m.inputs.parent.sha256).toBe("df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5");
  expect(m.inputs.oldSource.sha256).toBe("8308b9bf28f164f3b6f37b190eb6330345d6787794f9e8e1b20af899c2f96011");
  expect(m.inputs.warriorMaster.sha256).toBe("cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447");
  for(const a of [...Object.values(m.inputs),m.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  for(const f of Object.values(m.frames))for(const a of [f.logical,f.color,f.gray,f.title])await image(a);
});
it("changes real pixels only inside 105/284/78/66",async()=>{
  const m=await load(),before=await image(m.before.frame.logical),after=await image(m.outputs.logical);
  let changed=0,outside=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;
    if(before.data.subarray(i,i+4).equals(after.data.subarray(i,i+4)))continue;
    changed++;if(x<105||x>=183||y<284||y>=350)outside++;
  }
  expect(changed).toBeGreaterThan(0);expect(outside).toBe(0);expect(m.changedPixels).toBe(changed);
});
it("matches an independent background and ordered layer rebuild, not paint-over",async()=>{
  const m=await load(),parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  const a=await image(parent.sources.architectureDesktop),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const bx=Math.floor((a.width-cw)/2),by=Math.floor((a.height-ch)/2),expected=new PNG({width:960,height:540});
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const si=((by+Math.floor(y*ch/540))*a.width+bx+Math.floor(x*cw/960))*4,di=(y*960+x)*4;
    expected.data.set(a.data.subarray(si,si+3),di);expected.data[di+3]=255;
  }
  const layers=[...parent.scenes.desktop.layers,parent.frames["desktop-single"].title] as (Asset&{id?:string;x:number;y:number})[];
  for(const l of layers){
    const p=await image(l.id==="chest"?m.outputs.layer:l);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const si=(y*p.width+x)*4,di=((l.y+y)*960+l.x+x)*4,alpha=p.data[si+3]/255;
      if(!alpha)continue;
      for(let c=0;c<3;c++)expected.data[di+c]=Math.round(p.data[si+c]*alpha+expected.data[di+c]*(1-alpha));
      expected.data[di+3]=255;
    }
  }
  expect((await image(m.outputs.logical)).data.equals(expected.data)).toBe(true);
});
it("checks actual transparent RGB, sizes, true gray and integer-nearest exports",async()=>{
  const m=await load(),layer=await image(m.outputs.layer);
  expect([layer.width,layer.height]).toEqual([78,66]);
  let transparent=0;
  for(let i=0;i<layer.data.length;i+=4){
    expect([0,255]).toContain(layer.data[i+3]);
    if(!layer.data[i+3]){transparent++;expect([...layer.data.subarray(i,i+3)]).toEqual([0,0,0]);}
  }
  expect(transparent).toBeGreaterThan(0);
  const raw=await image(m.inputs.source),b=m.fit.bounds;
  const scale=Math.min(78/b.width,66/b.height);
  expect([m.fit.width,m.fit.height,m.fit.x,m.fit.y]).toEqual([Math.round(b.width*scale),Math.round(b.height*scale),Math.floor((78-Math.round(b.width*scale))/2),66-Math.round(b.height*scale)]);
  let wrong=0;
  for(let y=0;y<66;y++)for(let x=0;x<78;x++){
    const di=(y*78+x)*4,inside=x>=m.fit.x&&x<m.fit.x+m.fit.width&&y>=m.fit.y&&y<m.fit.y+m.fit.height;
    if(!inside){if(layer.data[di+3])wrong++;continue;}
    const sx=b.x+Math.floor((x-m.fit.x)*b.width/m.fit.width),sy=b.y+Math.floor((y-m.fit.y)*b.height/m.fit.height),si=(sy*raw.width+sx)*4;
    const want=raw.data[si+3]>=200?[raw.data[si],raw.data[si+1],raw.data[si+2],255]:[0,0,0,0];
    if(!layer.data.subarray(di,di+4).equals(Buffer.from(want)))wrong++;
  }
  for(const [target,source,scale] of [
    [m.outputs.beforeZoom,m.before.layer,3],[m.outputs.afterZoom,m.outputs.layer,3],[m.outputs.color,m.outputs.logical,2],
  ] as [Asset,Asset,number][]){
    const p=await image(target),s=await image(source);expect([p.width,p.height]).toEqual([s.width*scale,s.height*scale]);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const i=(y*p.width+x)*4,j=(Math.floor(y/scale)*s.width+Math.floor(x/scale))*4;
      if(!p.data.subarray(i,i+4).equals(s.data.subarray(j,j+4)))wrong++;
    }
  }
  for(const [target,source] of [[m.outputs.layerGray,m.outputs.layer],[m.outputs.oldGray,m.before.layer],[m.outputs.gray,m.outputs.color]]){
    const g=await image(target),s=await image(source);expect([g.width,g.height]).toEqual([s.width,s.height]);
    for(let i=0;i<s.data.length;i+=4){
      const v=Math.round((2126*s.data[i]+7152*s.data[i+1]+722*s.data[i+2])/10000);
      if(!g.data.subarray(i,i+4).equals(Buffer.from([v,v,v,s.data[i+3]])))wrong++;
    }
  }
  expect(wrong).toBe(0);
});
it("rejects empty, opaque, clipped or incompatible test fixtures without drawing production art",async()=>{
  const {fitChest,over}=await rasterModule(),empty=new PNG({width:16,height:16}),opaque=new PNG({width:16,height:16});
  opaque.data.fill(255);
  expect(()=>fitChest(empty)).toThrow("Empty source");expect(()=>fitChest(opaque)).toThrow("Transparent source required");
  const slim=new PNG({width:16,height:16});
  for(let y=2;y<14;y++)slim.data[(y*16+8)*4+3]=255;
  expect(()=>fitChest(slim)).toThrow("Source proportions");
  const clipped=new PNG({width:16,height:16});
  for(let y=0;y<12;y++)for(let x=0;x<14;x++)clipped.data[(y*16+x)*4+3]=255;
  expect(()=>fitChest(clipped)).toThrow("Source touches edge");
  expect(()=>over(empty,new PNG({width:2,height:2}),15,15)).toThrow("Clipped layer");
});
it("rebuilds all own artifacts byte-identically",async()=>{
  const m=await load(),files=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path));
  files.push(path.join(dir,"landing-chest-material.manifest.json"));
  const before=await Promise.all(files.map(f=>readFile(f))),{composeChestMaterial}=await composeModule();
  await composeChestMaterial();await composeChestMaterial();
  for(let i=0;i<files.length;i++)expect((await readFile(files[i])).equals(before[i])).toBe(true);
});
it("refuses changed own output without overwriting it; restores only the test mutation",async()=>{
  const m=await load(),file=path.join(root,m.outputs.layer.path),original=await readFile(file),changed=Buffer.concat([original,Buffer.from([0])]);
  const {composeChestMaterial}=await composeModule();
  try{await writeFile(file,changed);await expect(composeChestMaterial()).rejects.toThrow("Changed input");expect((await readFile(file)).equals(changed)).toBe(true);}
  finally{await writeFile(file,original);}
  expect(hash(await readFile(file))).toBe(m.outputs.layer.sha256);
});
```

- [ ] From `web/`, run:
  `npm test -- src/shared/brand/landing-chest-material.test.ts`.
  Expected: seven registered failures, with missing manifest/module assertions.
  Zero registered tests is not acceptable RED evidence; fix only test loading,
  not assertions, if Windows import analysis prevents registration.
- [ ] Add `web/e2e/landing-chest-material-review.spec.ts`:

```ts
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
```

- [ ] Add `web/e2e/landing-chest-material.playwright.config.ts`:

```ts
import {defineConfig} from "@playwright/test";
export default defineConfig({
  testDir:".",
  testMatch:["landing-chest-material-review.spec.ts","landing-title-placement-review.spec.ts","landing-title-positioning-review.spec.ts","landing-mobile-title-positioning-review.spec.ts","landing-a-title-review.spec.ts"],
  workers:1,timeout:60_000,
  projects:[
    {name:"phone-small",use:{viewport:{width:320,height:568}}},
    {name:"phone",use:{viewport:{width:390,height:844}}},
    {name:"tablet",use:{viewport:{width:768,height:1024}}},
    {name:"desktop",use:{viewport:{width:1440,height:900}}},
  ],
});
```

- [ ] From `web/`, run
  `npx playwright test --config=e2e/landing-chest-material.playwright.config.ts landing-chest-material-review.spec.ts`.
  Expected: four failures, each "Chest review HTML required" with false
  existence before any compositor or review HTML exists.
- [ ] Save actual RED commands, exit codes and failure messages in session
  evidence. Leave tests unstaged; do not mix prior staged user content into commits.

## Task 2: One transparent ImageGen source

**Files:** Create only the three files in R
`samples/derivations/landing-chest-material-v01/`.

- [ ] Read imagegen skill and required shared prompt guidance. Use built-in
  image_gen, not API/CLI fallback, SVG, canvas or programmatic artwork.
- [ ] View all four local inputs with view_image before the edit:
  1. R `samples/derivations/landing-war-room/sources/ordinary-chest-v01-source.png`
     — edit target.
  2. R `samples/avatar-classes/masters/warrior.png` — approved style master.
  3. R `samples/landing-warm-rest/layers/A-desktop/warrior.png`
     — actual 132×149 grain reference.
  4. R `samples/landing-title-placement-v01/desktop-single-logical.png`
     — warm scene reference; never an edit target.
- [ ] Save this prompt with apply_patch to the new prompt.md, and submit the
  exact same text with those four referenced_image_paths in that order,
  `transparent_background: true`. Do not pass num_last_images_to_include.

```text
Use case: style-transfer
Asset type: transparent ordinary chest sprite for a warm 2D pixel-RPG landing scene.
Input images: Image 1 is the edit target: the existing closed round-lid ordinary chest. Image 2 is the approved warrior master, used ONLY for pixel cluster, outline and material shading style. Image 3 is the actual 132x149 scene warrior, showing the intended apparent grain at display scale. Image 4 is the unchanged desktop scene, used ONLY for warm light and visual integration.
Primary request: change ONLY the chest's material rendering and pixel treatment to match the warrior. Preserve the same closed round-arched lid, overall proportions, orientation, visible side, camera angle, wooden planks, iron bands, hinges, lock plate and feet. Do not redesign it.
Style: deliberate hand-drawn pixel clusters, stepped dark-brown-black outline, slight handmade asymmetry; readable broad material planes with two or three main tones per material. Replace dense hairline woodgrain, scattered rust specks and continuous silver edge highlights with a few clear woodgrain clusters and broken restrained highlights. No dithering blanket or smooth rendering.
Palette and light: warm brown wood; muted warm dark-gray iron, not bright silver or Mimiku's gold. Match the existing room warmth without any glow, background shadow, cast-shadow pedestal or new lighting effect.
Composition: one complete isolated chest, matching Image 1 silhouette proportions, with transparent margin on all sides; no clipped lid or feet. Must remain readable at a 78x66 logical-pixel footprint, comparable to Image 3's grain, without making the pixel blocks coarser than the warrior.
Constraints: genuinely transparent background. No characters, eyes, mouths, teeth, hearts, coins, gems, text, logos, UI, floor, base or extra props. No lid opening, camera change, heavy damage, excessive corrosion, glossy 3D rendering, vector curves, blur, gradients or random texture noise.
```

- [ ] Generation takes minutes: use the tool's 120-second initial yield and waits.
  During ongoing work send concise Traditional Chinese progress; no long silence.
- [ ] Inspect the actual returned image. Preserve round lid, orientation, full
  feet, slight existing perspective, restrained warm iron and readable pixel
  clusters. A generated result is not automatically acceptable.
- [ ] Copy the selected returned local file to the new source path without
  altering its bytes, using its actual tool-returned path. Never invent a tool
  output path, rely on an OS-temp default, or overwrite the old source. If the
  tool returns no local path, inspect its metadata and resolve persistence before
  referencing the asset; do not substitute a drawing.
- [ ] Record every actual prompt/iteration. If one targeted revision is needed,
  use imagegen again, restating all invariants and preserving prior source bytes
  in a sibling revision. The selected file must be named
  `ordinary-chest-source.png` only if that target has not already been populated.
  If a prior v01 result already exists, use a new sibling version and consistently
  update this task's new paths, never old artifacts.
- [ ] Create this exact lineage.json via apply_patch, recording the selected
  source as the original edit target's child even when intermediate revision
  sources are retained separately:

```json
{
  "schema": "mimic-chest-material-source/v1",
  "generator": "imagegen",
  "transparent": true,
  "path": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-chest-material-v01/ordinary-chest-source.png",
  "parentPath": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/ordinary-chest-v01-source.png",
  "promptPath": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-chest-material-v01/prompt.md",
  "references": [
    "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes/masters/warrior.png",
    "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-warm-rest/layers/A-desktop/warrior.png",
    "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-title-placement-v01/desktop-single-logical.png"
  ]
}
```

- [ ] Verify source really has transparency. Treat a baked checkerboard, floor,
  cast-shadow plate or altered silhouette as a generation issue, not a reason
  to erase pixels or apply blur. New source requires all-side transparent margin.
- [ ] Commit checkpoint: preserve originals and keep new source/lineage/prompt
  unstaged pending full visual artifacts. Independent new-only commits are
  optional, never required to force dirty files into a commit.

## Task 3: Minimal deterministic raster helpers

**Files:** Create R `landing-chest-raster.mjs` only.

- [ ] Implement the pure numerical helper module below after Task 1's real RED.
  fit uses alpha>=200, nearest sampling, binary normalized alpha and zero RGB for
  transparent pixels. It fits inside a fixed 78×66 layer without stretching,
  centered horizontally and bottom-aligned. The four-pixel fit slack is a
  technical rejection guard, not authority to visibly shrink or redesign.

```js
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export function bounds(p){
  let x=p.width,y=p.height,r=-1,b=-1;
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    if(p.data[(sy*p.width+sx)*4+3]<200)continue;
    x=Math.min(x,sx);y=Math.min(y,sy);r=Math.max(r,sx);b=Math.max(b,sy);
  }
  if(r<x)throw Error("Empty source");
  return {x,y,width:r-x+1,height:b-y+1};
}
export function nearest(p,w,h,b={x:0,y:0,width:p.width,height:p.height},clean=false){
  const out=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=b.x+Math.min(b.width-1,Math.floor(x*b.width/w));
    const sy=b.y+Math.min(b.height-1,Math.floor(y*b.height/h));
    const si=(sy*p.width+sx)*4,di=(y*w+x)*4;
    if(clean&&p.data[si+3]<200)continue;
    out.data.set(p.data.subarray(si,si+4),di);
    if(clean)out.data[di+3]=255;
  }
  return out;
}
export function fitChest(p){
  if(!p.data.some((v,i)=>i%4===3&&v===0))throw Error("Transparent source required");
  const b=bounds(p),scale=Math.min(78/b.width,66/b.height);
  const w=Math.round(b.width*scale),h=Math.round(b.height*scale);
  // Up to four logical pixels of fit slack; never stretch or enlarge the layer.
  if(w<74||h<62)throw Error("Source proportions do not fit fixed chest footprint");
  if(b.x===0||b.y===0||b.x+b.width===p.width||b.y+b.height===p.height)throw Error("Source touches edge; inspect for clipping");
  const sprite=nearest(p,w,h,b,true),out=new PNG({width:78,height:66});
  const x=Math.floor((78-w)/2),y=66-h;
  for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
    const si=(sy*w+sx)*4,di=((sy+y)*78+sx+x)*4;
    out.data.set(sprite.data.subarray(si,si+4),di);
  }
  return {png:out,fit:{bounds:b,width:w,height:h,x,y,scale}};
}
export function over(canvas,p,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+p.width>canvas.width||y+p.height>canvas.height)throw Error("Clipped layer");
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    const si=(sy*p.width+sx)*4,di=((sy+y)*canvas.width+sx+x)*4,a=p.data[si+3]/255;
    if(!a)continue;
    for(let c=0;c<3;c++)canvas.data[di+c]=Math.round(p.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
export function gray(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){
    const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
    out.data.set([v,v,v,p.data[i+3]],i);
  }
  return out;
}
```

- [ ] Re-view at actual size. If the generation does not fit with similar
  occupation/ground contact, revise the ImageGen source or report the conflict;
  do not change x/y, frame size, silhouette proportions or phone.
- [ ] Keep the new helper unstaged. Tests remain RED on missing final artifacts
  until the guarded compositor exists.

## Task 4: Exact reconstruction and guarded compositor

**Files:** Create R `render-landing-chest-material.mjs` and R
`compose-landing-chest-material.mjs`; generated artifacts are new paths only.

- [ ] Implement this renderer, reusing only the old confirmation HTML's scene
  containers/UI/CSS/journal. No old page is rewritten. The actual-size chest
  images are exactly 78×66; both 3× rasters use the same 234×198 dimensions.

```js
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const rel=a=>a.path.slice(prefix.length);
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderChestReview(m,parentHTML){
  const title="Landing — 普通寶箱材質比較";
  let html=parentHTML.replaceAll("Landing — 已套用標題位置",title);
  const start=html.indexOf("<body><main>"),cards=html.indexOf('<div class="candidates">',start);
  if(start<0||cards<0)throw Error("Missing review boundaries");
  const figure=(a,label,cls="")=>'<figure><img class="'+cls+'" src="'+rel(a)+'" width="'+a.width+'" height="'+a.height+'" alt="'+esc(label)+'"><figcaption>'+esc(label)+'</figcaption></figure>';
  const intro='<h1>'+title+'</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false</p><p>只比較普通寶箱材質與像素表現。圓拱蓋、朝向、105／284 落點與 78×66 圖層不變；兩版標題、手機、人物與其他道具保持原樣。</p><p>先看實際小圖，再看放大與整個場景。不是寶箱位置或完整 Scenes 核准。</p><p><a href="'+rel(m.inputs.prompt)+'">實際 ImageGen prompt</a> · <a href="'+rel(m.inputs.source)+'">透明新來源</a> · <a href="landing-chest-material.manifest.json">manifest</a></p><section class="material-comparison"><h2>78×66 實際輸出</h2><div class="chest-pair">'+figure(m.before.layer,"原稿 78×66","actual-chest")+figure(m.outputs.layer,"戰士基準新稿 78×66","actual-chest")+'</div><h2>同倍率放大</h2><div class="chest-pair">'+figure(m.outputs.beforeZoom,"原稿 3×")+figure(m.outputs.afterZoom,"新稿 3×")+'</div><h2>真實灰階小圖</h2><div class="chest-pair">'+figure(m.outputs.oldGray,"原稿灰階 78×66","actual-chest")+figure(m.outputs.layerGray,"新稿灰階 78×66","actual-chest")+'</div><h2>戰士顆粒參照</h2><div class="chest-pair">'+figure(m.inputs.warriorLayer,"場景戰士 132×149")+figure(m.inputs.warriorMaster,"戰士 master","warrior-master")+'</div></section>';
  html=html.slice(0,start)+"<body><main>"+intro+html.slice(cards);
  const original=html.match(/<section class="candidate" data-candidate="desktop-single">[\s\S]*?<\/section>/)?.[0];
  if(!original)throw Error("Missing desktop card");
  const before=original.replace('data-candidate="desktop-single"','data-candidate="desktop-before"').replaceAll('data-key="desktop-single"','data-key="desktop-before"').replace("桌機：單行 MIMIC","桌機原稿");
  const after=original.replace('data-candidate="desktop-single"','data-candidate="desktop-after"').replaceAll('data-key="desktop-single"','data-key="desktop-after"').replaceAll(rel(m.before.frame.color),rel(m.frames["desktop-after"].color)).replace("桌機：單行 MIMIC","桌機：戰士基準新稿");
  html=html.replace(original,before+after);
  html=html.replace("手機：共用交錯兩行版","手機：維持現狀");
  const grayFrames=Object.entries(m.frames).map(([id,f])=>figure(f.gray,id+" 場景灰階")).join("");
  html=html.replace(/<details><summary>兩張真實灰階輸出<\/summary>[\s\S]*?<\/details>/,'<details class="scene-grays"><summary>三張真實灰階場景輸出</summary><div class="raws">'+grayFrames+'</div></details>');
  html=html.replace(/<section class="notes" id="review-notes">[\s\S]*?<\/section>/,'<section class="notes" id="review-notes"><h2>等待寶箱素材視覺審核</h2><p>請確認小圖的木板／鐵帶分區、像素顆粒與暖光是否融入戰士與房間。標題位置已核准且固定；本輪新素材尚未核准。登入、木牌及 CTA 僅使用原 review 錨點，不連接認證、互動或帳務。</p></section>');
  const records=[...Object.values(m.inputs),m.before.layer,...Object.values(m.outputs),...Object.values(m.frames).flatMap(f=>[f.logical,f.color,f.gray,f.title])];
  const rows=records.map(a=>'<tr><td><code>'+esc(rel(a))+'</code>'+(a.width?'<br>'+a.width+'×'+a.height:"")+'</td><td><code>'+a.sha256+'</code></td></tr>').join("");
  html=html.replace(/<details><summary>exact SHA-256 與實際尺寸<\/summary>[\s\S]*?<\/details>/,'<details><summary>exact SHA-256 與實際尺寸</summary><table><tbody>'+rows+'</tbody></table></details>');
  html=html.replace("</head>",'<style>.chest-pair{display:flex;flex-wrap:wrap;gap:24px}.chest-pair figure{margin:0;max-width:100%;min-width:0}.chest-pair img{display:block;max-width:100%;height:auto;image-rendering:pixelated}.chest-pair .actual-chest{width:78px;height:66px}.chest-pair .warrior-master{width:256px}.material-comparison{padding:16px;background:#30271f}.material-comparison figcaption{overflow-wrap:anywhere}.candidates .candidate{margin-bottom:24px}</style></head>');
  if((html.match(/class="scene /g)??[]).length!==3||(html.match(/data-chapter/g)??[]).length!==4||html.includes("data-title-position-tool"))throw Error("Unexpected review structure");
  return html;
}
```

- [ ] Implement this compositor. It first proves the full old-scene logical
  pixels are exact before replacement, then proves all changed pixels lie
  inside [105,183) × [284,350). It reconstructs without mage, not by hiding an
  old chest with a new one. Phone frame/paths/bytes and title assets are reused.

```js
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {nearest,fitChest,over,gray} from "./landing-chest-raster.mjs";
import {renderChestReview} from "./render-landing-chest-material.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function bytes(a){
  const f=path.resolve(repo,a.path);
  if(!f.startsWith(dir+path.sep))throw Error("Input outside review");
  const b=await readFile(f);
  if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);
  return b;
}
async function png(a){
  const p=PNG.sync.read(await bytes(a));
  if(p.width!==a.width||p.height!==a.height)throw Error("Changed input dimensions");
  return p;
}
async function record(name){
  const file=path.join(dir,name),b=await readFile(file);
  return {path:relative(file),sha256:hash(b)};
}
async function rasterRecord(name){
  const a=await record(name),p=PNG.sync.read(await bytes(a));
  return {...a,width:p.width,height:p.height};
}
async function buildDesktop(parent,replacement){
  const a=await png(parent.sources.architectureDesktop),w=960,h=540,ratio=w/h;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width;
  const ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const canvas=nearest(a,w,h,{x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch});
  for(let i=3;i<canvas.data.length;i+=4)canvas.data[i]=255;
  for(const l of parent.scenes.desktop.layers)over(canvas,l.id==="chest"&&replacement?replacement:await png(l),l.x,l.y);
  const title=parent.frames["desktop-single"].title;
  over(canvas,await png(title),title.x,title.y);
  return canvas;
}
export async function composeChestMaterial(){
  const parentRecord={path:prefix+"landing-title-placement.manifest.json",sha256:"df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5"};
  const parent=JSON.parse((await bytes(parentRecord)).toString());
  const before=parent.frames["desktop-single"],phone=parent.frames["phone-staggered"];
  if(!isDeepStrictEqual([before.title.x,before.title.y,before.title.width,before.title.height],[376,100,288,84])||
     !isDeepStrictEqual([phone.title.x,phone.title.y,phone.title.width,phone.title.height],[130,59,148,98]))throw Error("Frozen title mismatch");
  const chest=parent.scenes.desktop.layers.find(l=>l.id==="chest");
  if(!chest||!isDeepStrictEqual([chest.x,chest.y,chest.width,chest.height],[105,284,78,66]))throw Error("Frozen chest transform mismatch");
  const oldSource=await rasterRecord("samples/derivations/landing-war-room/sources/ordinary-chest-v01-source.png");
  const warriorLayer=parent.scenes.desktop.layers.find(l=>l.id==="warrior"),warriorMaster=parent.references.warrior;
  const pins=[
    [oldSource,"8308b9bf28f164f3b6f37b190eb6330345d6787794f9e8e1b20af899c2f96011"],
    [warriorMaster,"cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447"],
    [warriorLayer,"fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1"],
    [chest,"c3026375ca3821478a822030dda1c8463e8750d09048f791e40449b7dda12753"],
    [before.logical,"08dca5cb9f13c0a4ede1322f4e8f93295cae7b39a36438509a1286f12f87643f"],
    [phone.logical,"dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf"],
  ];
  for(const [a,h] of pins){if(a.sha256!==h)throw Error("Reference identity changed");await png(a);}
  const inputs={
    parent:parentRecord,oldSource,warriorLayer,warriorMaster,
    source:await rasterRecord("samples/derivations/landing-chest-material-v01/ordinary-chest-source.png"),
    prompt:await record("samples/derivations/landing-chest-material-v01/prompt.md"),
    lineage:await record("samples/derivations/landing-chest-material-v01/lineage.json"),
    parentReview:await record("landing-title-placement-review.html"),
    generator:await record("compose-landing-chest-material.mjs"),
    rasterModule:await record("landing-chest-raster.mjs"),
    renderer:await record("render-landing-chest-material.mjs"),
  };
  if(inputs.parentReview.sha256!=="da5a81e41a8b3f5bda76732ac6c611731d87f386819883816250b5542c515c71")throw Error("Parent review changed");
  const lineage=JSON.parse((await bytes(inputs.lineage)).toString());
  if(!isDeepStrictEqual(lineage,{schema:"mimic-chest-material-source/v1",generator:"imagegen",transparent:true,
    path:inputs.source.path,parentPath:oldSource.path,promptPath:inputs.prompt.path,
    references:[warriorMaster.path,warriorLayer.path,before.logical.path]}))throw Error("Invalid ImageGen lineage");
  const reconstructed=await buildDesktop(parent),baseline=await png(before.logical);
  if(!reconstructed.data.equals(baseline.data))throw Error("Old scene reconstruction mismatch; stop before replacing chest");
  const fitted=fitChest(await png(inputs.source)),logical=await buildDesktop(parent,fitted.png);
  let changed=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;
    if(logical.data.subarray(i,i+4).equals(baseline.data.subarray(i,i+4)))continue;
    if(x<105||x>=183||y<284||y>=350)throw Error("Changed pixels outside frozen chest bounds");
    changed++;
  }
  if(changed===0)throw Error("No visible material change");
  const writes=new Map(),outputs={};
  const save=(name,p)=>{
    const file=path.join(dir,"samples/landing-chest-material-v01",name+".png"),b=PNG.sync.write(p);
    writes.set(file,b);return {path:relative(file),sha256:hash(b),width:p.width,height:p.height};
  };
  outputs.layer=save("ordinary-chest",fitted.png);
  outputs.layerGray=save("ordinary-chest-gray",gray(fitted.png));
  outputs.oldGray=save("old-chest-gray",gray(await png(chest)));
  outputs.beforeZoom=save("old-chest-3x",nearest(await png(chest),234,198));
  outputs.afterZoom=save("ordinary-chest-3x",nearest(fitted.png,234,198));
  outputs.logical=save("desktop-logical",logical);
  const color=nearest(logical,1920,1080);
  outputs.color=save("desktop-color",color);outputs.gray=save("desktop-gray",gray(color));
  const m={schema:"mimic-chest-material-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,
    spec:"docs/superpowers/specs/2026-10-15-landing-ordinary-chest-material-design.md",
    plan:"docs/superpowers/plans/2026-10-15-landing-ordinary-chest-material.md",
    inputs,before:{layer:chest,frame:before},fit:fitted.fit,changedPixels:changed,outputs,
    placement:{x:105,y:284,width:78,height:66},
    frames:{"desktop-before":before,"desktop-after":{...before,logical:outputs.logical,color:outputs.color,gray:outputs.gray},"phone-staggered":phone}};
  const html=renderChestReview(m,(await bytes(inputs.parentReview)).toString());
  const htmlFile=path.join(dir,"landing-chest-material-review.html"),manifestFile=path.join(dir,"landing-chest-material.manifest.json");
  m.review={path:relative(htmlFile),sha256:hash(html)};
  writes.set(htmlFile,Buffer.from(html));
  let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
  if(previous){
    const stableInputs=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["generator","rasterModule","renderer"].includes(key)));
    if(!isDeepStrictEqual(stableInputs(previous.inputs),stableInputs(inputs)))throw Error("Existing chest provenance differs");
    for(const a of [...Object.values(previous.outputs),previous.review]){
      if(!writes.has(path.resolve(repo,a.path)))throw Error("Unexpected existing target");
      await bytes(a);
    }
  }else{
    for(const file of writes.keys()){
      try{await readFile(file);throw Error("Unexpected existing chest target");}catch(e){if(e.code!=="ENOENT")throw e;}
    }
  }
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}
  await writeFile(manifestFile,JSON.stringify(m,null,2)+"\n");
  return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composeChestMaterial(),null,2));
```

- [ ] Once both new modules exist, replace only the two RED-stage delayed
  import functions in the unit test with literal relative imports, avoiding the
  known Windows Vite variable-import drive-prefix issue. Assertions are unchanged:

```ts
async function composeModule(){
  expect(existsSync(path.join(dir,"compose-landing-chest-material.mjs")),"Chest compositor required").toBe(true);
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs") as {composeChestMaterial:()=>Promise<Manifest>};
}
async function rasterModule(){
  expect(existsSync(path.join(dir,"landing-chest-raster.mjs")),"Chest raster module required").toBe(true);
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs") as {
    fitChest:(p:PNG)=>{png:PNG;fit:Manifest["fit"]};over:(c:PNG,p:PNG,x:number,y:number)=>void;
  };
}
```

- [ ] From repository root run:
  `node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs`.
  Expected: one new manifest, review page and eight new PNG records; changedPixels
  positive; no reconstruction/footprint/outside-bounds/provenance errors.
- [ ] A reconstruction mismatch is a blocker for generation writes, not a
  permission to patch old pixels, hide differences, remove assertions or rerun
  old generators. Diagnose exact crop/alpha/order using existing code and sources.
- [ ] Confirm raw source remains unmodified, output layer is 78×66, desktop
  logical 960×540, color/gray 1920×1080, phone remains old 390×600. View both
  real small layers, enlarged pixels, grayscale, and full new desktop.
- [ ] From web run the new unit suite again. Expected: seven passes.
- [ ] From web run the new browser spec at all four projects again. Expected:
  four passes, real image decoding and preserved live UI.
- [ ] Leave implementation and artifacts unstaged unless safely separable and
  explicitly desired; do not add or commit .agents/devlog.md's pre-existing edits.

## Task 5: Verification, self-review and visual checkpoint

**Files:** Read all new modules/contracts/artifacts. Append only
`.agents/devlog.md` after successful nontrivial implementation.

- [ ] Read repository self-review skill; review all seven dimensions and fix
  critical/important issues inline, repeating until CLEAN. No subagent dispatch.
  Check pixel-fit, partial-alpha cleanup, safe target guards, stale hash tables,
  actual-vs-CSS grayscale, same comparison scale, phone retention, UI and links.
  Record actual findings/fixes rather than only a "self-reviewed" label.
- [ ] Read verification-before-completion. Run fresh focused regression from web:

```powershell
npm test -- src/shared/brand/landing-chest-material.test.ts src/shared/brand/landing-title-placement.test.ts src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
npx eslint src/shared/brand/landing-chest-material.test.ts e2e/landing-chest-material-review.spec.ts e2e/landing-chest-material.playwright.config.ts
npm run typecheck
npx playwright test --config=e2e/landing-chest-material.playwright.config.ts
```

Expected with the current baseline: seven Vitest files / 40 tests and 120
Playwright cases, all passing. Verify actual counts, not this estimate.

- [ ] From repository root run scoped .mjs lint and syntax checks:

```powershell
node web/node_modules/eslint/bin/eslint.js --no-ignore --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-chest-material.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-chest-material.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs
git diff --check
```

Expected exit 0; no ignored-files lint warning accepted as lint evidence.

- [ ] The determinism unit test executes the composer twice and compares actual
  complete bytes for all eight PNGs plus page and manifest. Confirm that test
  passed freshly; no timestamp or unstable ordering is introduced.
- [ ] The unit suite checks all source/output hash records, original source
  pins, binary alpha/transparent RGB, dimensions, proportional nearest fit,
  2×/3× sampling, true integer-luma grayscale, exact reconstruction and phone/
  title preservation. Confirm each passed, not merely suite registration.
- [ ] Four viewport browser tests save three scene screenshots per project to
  Playwright's own output directory. View all 12 screenshots plus actual
  asset/gray outputs; if review evidence is persisted, copy only those files to
  R `samples/landing-chest-material-v01/previews/`.
  Do not open a dozen duplicate browser tabs.
- [ ] Append the implementation devlog through apply_patch in AGENTS format,
  using actual local date, task scope, factual changes, fixed transforms,
  verification results and known follow-up "waiting for material visual approval;
  positioning and Scenes family gate not advanced." Preserve all prior bytes.
- [ ] Compare final fingerprints to Task 1 baseline. Except exact authorized new
  paths and the appended devlog suffix, all tracked and non-ignored old files,
  all web/public bytes, staged binary diff, and the original devlog prefix must
  match. Confirm attachments/reference status remains untracked/unstaged.
- [ ] From repository root whitespace-check every new text file using the exact
  paths below. Capture output: no diagnostic is allowed, even if the command's
  exit status is 1 for a nonempty no-index diff. Do not reset dirty files.

```powershell
$chestNewTextPaths = @(
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-chest-material.mjs',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-material.manifest.json',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-material-review.html',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-chest-material-v01/prompt.md',
  'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-chest-material-v01/lineage.json',
  'web/src/shared/brand/landing-chest-material.test.ts',
  'web/e2e/landing-chest-material-review.spec.ts',
  'web/e2e/landing-chest-material.playwright.config.ts'
)
foreach ($chestNewTextPath in $chestNewTextPaths) {
  $chestWhitespaceOutput = git -c core.autocrlf=false diff --no-index --check -- NUL $chestNewTextPath 2>&1
  if ($LASTEXITCODE -gt 1 -or $chestWhitespaceOutput) { throw "Whitespace check failed: $chestNewTextPath $chestWhitespaceOutput" }
}
```
- [ ] Request opening the new review HTML with open_in_codex:
  `D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-material-review.html`.
  Report queued vs opened accurately; include a clickable file link and the
  actual source/normalized-layer/scene output hashes.
- [ ] Stop for the user's material-only visual approval or edits. Do not mark
  the new source/family approved, move the chest, start map-crate/trap placement,
  update runtime/public/registry/PWA/SW/product/accounting, make production
  exports, or advance Phase 2. Earlier title approval remains intact.

## Plan self-review / scope map

| Approved spec | Implementing tasks |
| --- | --- |
| §1 one material-only candidate; frozen phone/title/position | Tasks 1–4 pinned source and frame checks |
| §2 round lid, warrior grain, warm iron, clean pixel groups | Task 2 exact edit prompt, actual-size human review |
| §3 fixed 105/284/78/66; no stretch or covert shrink | Tasks 3–4 fit/reconstruction; Task 5 visual check |
| §4 ImageGen provenance, isolated artifacts, old/new/gray/UI | Tasks 2 and 4 lineage/render/export |
| §5 TDD, verification, self-review and visual gate | Tasks 1 and 5; seven unit + four new browser cases |
| §6 Inline, dirty preservation, no runtime or phase advance | Task 1 baseline and Task 5 final boundary audit |

No source PNG or production code is generated by writing this plan. After plan
review, use executing-plans in this same session; do not ask Inline vs Subagent
again. Retain important checkpoints and the final user visual gate.
