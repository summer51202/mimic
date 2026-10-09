# Landing A — Party Removal and Staggered Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax. User has already chosen **Inline Execution**: no worktree, no subagent, no renewed execution-mode question.

**Goal:** 產生無法師的同一 A 場景，桌機比較單行 MIMIC／上左 MI 下右 MIC，手機共用交錯兩行稿，完成 review-only 視覺 checkpoint。

**Architecture:** 讀取現有 A manifest，從原始背景及既有處理後圖層重合成，只略過 mage；其餘檔案 bytes、尺寸、姿態、位置、暖光與 visitor ground 保持。ImageGen 只修訂既有木製字標排列；新 deterministic PNG 合成、manifest、renderer 與 contracts 使用獨立路徑，舊 A/B 與 v04 管線不執行、不改寫。字標共同色調烘焙入實際彩色／灰階 PNG；live UI 及四章日誌保持可讀、可選字與 review 錨點。

**Tech Stack:** Node.js ESM、既有 `web/node_modules/pngjs`、靜態 HTML/CSS、ImageGen、Vitest、ESLint、TypeScript、Playwright。

---

## 核准來源、範圍與執行規則

- 使用者於本輪以「同意」核准 `docs/superpowers/specs/2026-10-09-landing-a-party-staggered-wordmark-design.md`；規格獨立 commit `9a556e4`。原文件中的「待使用者核對」是撰寫時狀態，不重寫規格來製造新 approval。
- 合併閱讀 `docs/superpowers/specs/2026-10-08-landing-warm-rest-composition-design.md`、`docs/superpowers/specs/2026-10-05-landing-war-room-visual-design.md`；10-09 明列條款優先。
- 開始前依序完整讀取 `AGENTS.md`、`.agents/features.md`、本輪規格、本計畫。使用 `executing-plans`、`test-driven-development`、`imagegen`；實作後使用 `self-review` 與 `verification-before-completion`。其他適用技能按其觸發規則使用，不重啟已完成的 brainstorming。
- 在 `D:/Project/mimic` 的目前 main / dirty workspace 執行。不得 reset、checkout 還原、clean、建立 worktree、派遣 subagent 或暫存使用者既有修改。不使用 `git add .`。
- 本輪圖稿、程式與 devlog **保持未提交**；原有 staged index 保持 byte-equivalent。只可獨立提交這份新計畫文件，不能混入既有 index。
- 不讀寫／暫存 `.codex-remote-attachments/` 或 `reference/` 的素材。不更動 `web/public`、product runtime、asset registry、PWA manifest、service worker、Home、帳務、互動、最終 production exports 或 Phase 2。
- 新稿仍為 `awaiting-calibration`、`reviewOnly: true`、`runtimePromotion: false`。選 A 是基準選擇，不是 Scenes family approval。
- 保留 B 石壁融合／第三 C 亮度精修方向為後續事項。本輪不聲稱完成那項精修。
- 工具執行時用繁體中文簡短更新，約每 60 秒內至少一次；ImageGen 等待使用工具 progress/yield，不長時間靜默。
- 以下所有本地文字檔用 `apply_patch` 建立／修改；PNG 來源以非覆寫 copy 保存，derived PNG 與 HTML/JSON 僅由新 composer 正常產生。不得用程式繪圖取代創意字標來源。

## 精確檔案地圖

以下 review 路徑以 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/` 為前綴；不得改寫既有同名暖火或戰情室文件。

| Create | Responsibility |
| --- | --- |
| `landing-a-title.config.mjs` | review-only flags、來源路徑、三個初始字標安全框 |
| `compose-landing-a-title.mjs` | 原始背景＋保留圖層重合成、字標整理／烘焙、hash/manifest/HTML |
| `render-landing-a-title.mjs` | 純函式 review UI，雙桌機與共同手機、日誌、灰階、尺寸與 hashes |
| `landing-a-title.manifest.json` | composer 輸出，來源 lineage、舊圖層原 metadata、三幀 exact hashes |
| `landing-a-title-review.html` | composer 輸出，不覆寫舊 review |
| `samples/derivations/landing-a-title/wordmark-staggered-v01-source.png` | 原封不動 ImageGen 透明 source |
| `samples/derivations/landing-a-title/wordmark-staggered-v01-prompt.md` | 實際傳入的完整 prompt |
| `samples/derivations/landing-a-title/lineage.json` | 原字標參照、新 source 與實際 prompt 關係 |
| `samples/landing-a-title/scene-desktop-logical.png`、`scene-phone-logical.png` | 960×540／390×600 無法師、無字標場景 |
| `samples/landing-a-title/wordmarks/single.png`、`staggered.png` | 寬 256、等比高、clean alpha、共同色調 review masters |
| `samples/landing-a-title/wordmarks/desktop-single.png`、`desktop-staggered.png`、`phone-staggered.png` | 三幀實際字標 raster，真實尺寸寫入 manifest |
| `samples/landing-a-title/desktop-single-logical.png`、`desktop-single.png`、`desktop-single-gray.png` | 960×540 logical、1920×1080 exact 2×、真正灰階 |
| `samples/landing-a-title/desktop-staggered-logical.png`、`desktop-staggered.png`、`desktop-staggered-gray.png` | 同上，只有字標排列及其必要等比落點不同 |
| `samples/landing-a-title/phone-staggered-logical.png`、`phone-staggered.png`、`phone-staggered-gray.png` | 獨立 390×600 手機；不是桌機裁切 |
| `samples/landing-a-title/previews/` | 四 viewport × 三張實際 live UI 截圖，共 12 張 |

Create outside review:
- `web/src/shared/brand/landing-a-title-calibration.test.ts` — 四個 asset / preservation contracts。
- `web/e2e/landing-a-title-review.spec.ts` — live UI、shared phone bitmap、無溢位／遮擋 contract。
- `web/e2e/landing-a-title.playwright.config.ts` — 獨立四 viewport project。
- `web/e2e/landing-a-title.eslint.config.mjs` — 沿用既有 review ESM 的 focused lint 規則。

Modify only after implementation:
- `.agents/devlog.md` — append-only 本輪 entry，保留原 bytes 前綴與既有未提交內容。

若需 ImageGen 修正，另存 `wordmark-staggered-v02-source.png` 與 `wordmark-staggered-v02-prompt.md`（後續編號遞增），僅增量更新新 config 的 rawStaggered 及新 lineage 的 source/prompt 路徑；不得覆寫 v01 或舊字標。

## Task 1 — 唯讀啟動與保護基線

**Read only:** `AGENTS.md`、`.agents/features.md`、核准規格、`landing-warm-rest.manifest.json`、原 A source/layers、`landing-warm-rest-review.html`。

- [ ] 在 repo root 先執行 `git status --short`。確認 dirty 仍存在；不把既有修改當垃圾。
- [ ] 確認上述新實作路徑尚不存在；若已存在，先檢視是否為本計畫中斷成果，不能盲目覆寫或重新建立「乾淨」保護基線。
- [ ] 用下列 `functions.exec` 捕捉 **實作前** 基線，將完整結果留在 session store。它只輸出聚合 hash，不傾印原圖或大 diff。包含所有既有 tracked/untracked 檔（排除明令禁止的兩目錄）、完整 public tree 含 ignored 檔、index/staged/working diff 與 devlog 前綴。若 session 被中斷，沿用既有 store，不能事後重抓來掩蓋變更。

```javascript
const result=await tools.exec_command({cmd:"node -e @'\nconst {execFileSync}=require(\"node:child_process\"),fs=require(\"node:fs\"),path=require(\"node:path\"),crypto=require(\"node:crypto\");\nconst hash=b=>crypto.createHash(\"sha256\").update(b).digest(\"hex\");\nconst git=args=>execFileSync(\"git\",args,{maxBuffer:134217728,stdio:[\"ignore\",\"pipe\",\"ignore\"]});\nconst prefix=\"docs/design/assets/reviews/2026-09-18-page-visual-phase-1/\";\nconst allowed=new Set([\"landing-a-title.config.mjs\",\"compose-landing-a-title.mjs\",\"render-landing-a-title.mjs\",\"landing-a-title.manifest.json\",\"landing-a-title-review.html\"].map(p=>prefix+p).concat([\"web/src/shared/brand/landing-a-title-calibration.test.ts\",\"web/e2e/landing-a-title-review.spec.ts\",\"web/e2e/landing-a-title.playwright.config.ts\",\"web/e2e/landing-a-title.eslint.config.mjs\"]));\nconst newPath=p=>allowed.has(p)||p.startsWith(prefix+\"samples/landing-a-title/\")||p.startsWith(prefix+\"samples/derivations/landing-a-title/\");\nconst names=[...new Set(Buffer.concat([git([\"ls-files\",\"-z\"]),git([\"ls-files\",\"--others\",\"--exclude-standard\",\"-z\"])]).toString().split(\"\\0\").filter(Boolean))].sort().filter(p=>!p.startsWith(\".codex-remote-attachments/\")&&!p.startsWith(\"reference/\"));\nif(typeof prefixLength!==\"number\"&&names.some(newPath))throw Error(\"New paths already exist; inspect before editing, do not overwrite or recapture a mid-execution baseline\");\nconst files=names.filter(p=>p!==\".agents/devlog.md\"&&!newPath(p)).map(p=>[p,fs.existsSync(p)&&fs.statSync(p).isFile()?hash(fs.readFileSync(p)):\"missing\"]);\nfunction publicFiles(dir,result=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())publicFiles(p,result);else if(e.isFile())result.push([p.replaceAll(\"\\\\\",\"/\"),hash(fs.readFileSync(p))]);}return result.sort((a,b)=>a[0].localeCompare(b[0]));}\nconst publicTree=publicFiles(\"web/public\"),devlog=fs.readFileSync(\".agents/devlog.md\");\nif(git([\"diff\",\"--cached\",\"--name-only\",\"--\",\".codex-remote-attachments\",\"reference\"]).toString().trim())throw Error(\"Protected paths are staged; do not unstage user files\");\nconsole.log(JSON.stringify({filesHash:hash(JSON.stringify(files)),filesCount:files.length,publicHash:hash(JSON.stringify(publicTree)),publicCount:publicTree.length,index:hash(git([\"ls-files\",\"-s\"])),staged:hash(git([\"diff\",\"--cached\",\"--binary\"])),working:hash(git([\"diff\",\"--binary\",\"--\",\".\",\":(exclude).agents/devlog.md\"])),devlog:{length:devlog.length,sha256:hash(devlog)},devlogPrefix:typeof prefixLength===\"number\"?hash(devlog.subarray(0,prefixLength)):null}));\n'@",workdir:"D:/Project/mimic",sandbox_permissions:"require_escalated",justification:"建立本輪唯讀保護基線，保留原有 dirty 與暫存修改。",max_output_tokens:2000});
if(result.exit_code!==0)throw Error(result.output);
const baseline=JSON.parse(result.output);store("landingATitleExecutionBaseline",baseline);text(baseline);
```

- [ ] 用 `view_image` 先看原字標、本輪 A 桌機／手機圖；這一步同時檢查岩壁實際材質，不能只靠矩形座標推斷「牆內」。

```javascript
for(const path of [
 "D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/wordmark.png",
 "D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-warm-rest/A-desktop.png",
 "D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-warm-rest/A-phone.png"
]){const r=await tools.view_image({path});image(r.image_url);}
```

舊字標應為 256×75，exact SHA-256 `5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c`。本輪保留共同 tone brightness 0.82、saturation 0.72。

## Task 2 — Asset contract 先 RED

**Create:** `web/src/shared/brand/landing-a-title-calibration.test.ts`。

- [ ] 使用 apply_patch 寫入完整 contract：

```typescript
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const prefix = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const review = path.join(root, prefix);
type FileAsset = { path: string; sha256: string };
type Asset = FileAsset & { width: number; height: number };
type Layer = Asset & { id: string; x: number; y: number };
type Scene = { logical: Asset; layers: Layer[]; visitor: number[] };
type Frame = { view: "desktop" | "phone"; logical: Asset; color: Asset; gray: Asset; title: Layer; wall: number[] };
type Manifest = {
  decision: string; reviewOnly: boolean; runtimePromotion: boolean; baseVariant: string;
  base: FileAsset; sources: Record<string, Asset>; scenes: Record<string, Scene>;
  frames: Record<string, Frame>; wordmarkTone: { brightness: number; saturation: number };
  wordmarks: Record<string, { source: Asset; master: Asset; lines: string[] }>;
  lineage: { record: FileAsset; parent: Asset; prompt: FileAsset; generator: string; transparent: boolean };
};
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");
async function bytes(a: FileAsset) {
  const b = await readFile(path.join(root, a.path)); expect(digest(b)).toBe(a.sha256); return b;
}
async function png(a: Asset) {
  const p = PNG.sync.read(await bytes(a)); expect([p.width,p.height]).toEqual([a.width,a.height]); return p;
}
async function load() {
  const file = path.join(review,"landing-a-title.manifest.json");
  expect(existsSync(file),"new title manifest is required").toBe(true);
  return JSON.parse(await readFile(file,"utf8")) as Manifest;
}
function overlay(canvas: PNG, sprite: PNG, x: number, y: number) {
  for (let sy=0;sy<sprite.height;sy++) for (let sx=0;sx<sprite.width;sx++) {
    const si=(sy*sprite.width+sx)*4, di=((y+sy)*canvas.width+x+sx)*4, a=sprite.data[si+3]/255;
    if (!a) continue;
    for (let c=0;c<3;c++) canvas.data[di+c]=Math.round(sprite.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
function countOverlap(a: Layer, ap: PNG, b: Layer, bp: PNG) {
  let n=0;
  for (let y=0;y<ap.height;y++) for (let x=0;x<ap.width;x++) {
    const bx=a.x+x-b.x,by=a.y+y-b.y;
    if (bx>=0&&by>=0&&bx<bp.width&&by<bp.height&&ap.data[(y*ap.width+x)*4+3]&&bp.data[(by*bp.width+bx)*4+3]) n++;
  }
  return n;
}

it("keeps A unchanged except mage removal, with genuine ImageGen title lineage", async () => {
  const m=await load();
  expect(m).toMatchObject({ decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,baseVariant:"A" });
  expect(Object.keys(m.frames)).toEqual(["desktop-single","desktop-staggered","phone-staggered"]);
  const old=JSON.parse((await bytes(m.base)).toString());
  for (const [id,a] of Object.entries(m.sources)) { expect(id).not.toBe("mage"); expect(a).toEqual(old.sources[id]); await png(a); }
  expect(Object.keys(m.sources).sort()).toEqual(Object.keys(old.sources).filter(id=>id!=="mage").sort());
  for (const view of ["desktop","phone"]) {
    expect(m.scenes[view].layers).toEqual(old.frames["A-"+view].layers.filter((l:Layer)=>l.id!=="mage"));
    expect(m.scenes[view].visitor).toEqual(old.frames["A-"+view].visitor);
    for (const layer of m.scenes[view].layers) await png(layer);
  }
  expect(m.wordmarks.single.source.sha256).toBe("5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c");
  expect(m.wordmarkTone).toEqual(old.wordmarkTone);
  expect(m.wordmarks.single.lines).toEqual(["MIMIC"]); expect(m.wordmarks.staggered.lines).toEqual(["MI","MIC"]);
  expect(m.lineage).toMatchObject({generator:"imagegen",transparent:true});
  const entry=JSON.parse((await bytes(m.lineage.record)).toString());
  expect(entry.path).toBe(m.wordmarks.staggered.source.path); expect(entry.parentPath).toBe(m.lineage.parent.path);
  expect(entry.promptPath).toBe(m.lineage.prompt.path); expect(m.lineage.parent).toEqual(m.wordmarks.single.source);
  await bytes(m.lineage.prompt); await png(m.lineage.parent);
  const raw=await png(m.wordmarks.staggered.source);
  let zero=0,opaque=0;
  for(let i=3;i<raw.data.length;i+=4){if(!raw.data[i])zero++;if(raw.data[i]===255)opaque++;}
  expect(zero).toBeGreaterThan(0);expect(opaque).toBeGreaterThan(0);
});

it("reconstructs the original architecture and every retained layer without mage", async () => {
  const m=await load();
  for (const view of ["desktop","phone"]) {
    const scene=m.scenes[view], actual=await png(scene.logical);
    expect([actual.width,actual.height]).toEqual(view==="desktop"?[960,540]:[390,600]);
    const a=await png(m.sources[view==="desktop"?"architectureDesktop":"architecturePhone"]);
    const ratio=actual.width/actual.height;
    const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width;
    const ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
    const ox=Math.floor((a.width-cw)/2),oy=Math.floor((a.height-ch)/2);
    const rebuilt=new PNG({width:actual.width,height:actual.height});
    for(let y=0;y<actual.height;y++)for(let x=0;x<actual.width;x++){
      const sx=ox+Math.min(cw-1,Math.floor(x*cw/actual.width)),sy=oy+Math.min(ch-1,Math.floor(y*ch/actual.height));
      const i=(y*actual.width+x)*4,j=(sy*a.width+sx)*4;
      rebuilt.data.set(a.data.subarray(j,j+3),i);rebuilt.data[i+3]=255;
    }
    for(const layer of scene.layers)overlay(rebuilt,await png(layer),layer.x,layer.y);
    expect(actual.data.equals(rebuilt.data)).toBe(true);
    expect(scene.layers.find(l=>l.id==="mapCrate")!.width).toBe(view==="desktop"?113:79);
  }
});

it("adds only a clean title inside the wall, never touching physical objects or visitor ground", async () => {
  const m=await load();
  for(const frame of Object.values(m.frames)){
    const scene=m.scenes[frame.view],base=await png(scene.logical),title=await png(frame.title),actual=await png(frame.logical);
    const [wx,wy,ww,wh]=frame.wall;
    expect(frame.title.x).toBeGreaterThanOrEqual(wx);expect(frame.title.y).toBeGreaterThanOrEqual(wy);
    expect(frame.title.x+title.width).toBeLessThanOrEqual(wx+ww);expect(frame.title.y+title.height).toBeLessThanOrEqual(wy+wh);
    for(const l of scene.layers.filter(l=>l.id!=="groundLight"))expect(countOverlap(frame.title,title,l,await png(l))).toBe(0);
    const [vx,vy,vw,vh]=scene.visitor;
    expect(frame.title.x+title.width<=vx||frame.title.x>=vx+vw||frame.title.y+title.height<=vy||frame.title.y>=vy+vh).toBe(true);
    const rebuilt=new PNG({width:base.width,height:base.height});rebuilt.data.set(base.data);overlay(rebuilt,title,frame.title.x,frame.title.y);
    expect(rebuilt.data.equals(actual.data)).toBe(true);
  }
  for(const a of [...Object.values(m.wordmarks).map(w=>w.master),...Object.values(m.frames).map(f=>f.title)]){
    const p=await png(a);let dirty=0,transparent=0;
    for(let i=0;i<p.data.length;i+=4)if(!p.data[i+3]){transparent++;if(p.data[i]||p.data[i+1]||p.data[i+2])dirty++;}
    expect(transparent).toBeGreaterThan(0);expect(dirty).toBe(0);
  }
});

it("exports real logical, exact 2x color and genuine grayscale with all hashes checked", async () => {
  const m=await load();
  for(const frame of Object.values(m.frames)){
    const logical=await png(frame.logical),color=await png(frame.color),gray=await png(frame.gray),scale=frame.view==="desktop"?2:1;
    expect([color.width,color.height]).toEqual(frame.view==="desktop"?[1920,1080]:[390,600]);
    expect([gray.width,gray.height]).toEqual([color.width,color.height]);
    let wrong=0,notGray=0,alpha=0,wrongLuma=0;
    for(let y=0;y<color.height;y++)for(let x=0;x<color.width;x++){
      const i=(y*color.width+x)*4,j=(Math.floor(y/scale)*logical.width+Math.floor(x/scale))*4;
      if(!color.data.subarray(i,i+4).equals(logical.data.subarray(j,j+4)))wrong++;
      if(gray.data[i]!==gray.data[i+1]||gray.data[i]!==gray.data[i+2])notGray++;
      const luma=Math.round((2126*color.data[i]+7152*color.data[i+1]+722*color.data[i+2])/10000);
      if(gray.data[i]!==luma)wrongLuma++;
      if(gray.data[i+3]!==color.data[i+3])alpha++;
    }
    expect(wrong).toBe(0);expect(notGray).toBe(0);expect(alpha).toBe(0);expect(wrongLuma).toBe(0);
  }
});
```

- [ ] 從 `web/` 執行：

```powershell
npm test -- src/shared/brand/landing-a-title-calibration.test.ts
```

預期 RED：四個 tests 因 `new title manifest is required` 失敗；新 manifest 尚不存在。若是缺套件、型別或 runner 錯誤，先修測試設置，不把它記成有效 RED。不執行舊 composer，不建立假 manifest 讓測試提早通過。

## Task 3 — ImageGen 交錯字標來源

**Create:** 上述三個 derivation 文件。**No changes:** 原 wordmark、角色、背景或 props。

- [ ] 完整讀取 imagegen skill，依 Task 1 的 view_image 確認既有木字形、眼睛、愛心及像素細節。
- [ ] 用 apply_patch 先保存實際 prompt 至 `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/wordmark-staggered-v01-prompt.md`，內容如下。工具傳入必須與此文相同，不用摘要 prompt 取代。

```text
Use case: precise-object-edit
Asset type: one transparent hand-drawn pixel RPG wordmark for a Landing layout review
Input image 1: existing MIMIC wooden-letter identity/style reference and edit target. Preserve its letter identity and eye/heart details; do not insert a scene.
Primary request: rearrange only this five-letter wordmark into two staggered rows. Upper row is exactly "MI", lower row exactly "MIC"; together M-I-M-I-C. Upper MI starts at the left. Lower MIC starts farther right, not centered underneath MI and not flush left. Both rows have the same per-letter scale.
Composition: compact upper-left to lower-right stepped grouping, mildly tightened vertical spacing so a few outer wooden tips overlap. Keep every defining letter stroke readable. The lower row is still unmistakably below the upper row, not one continuous line. No broad overlap that hides letters, eyes or the heart.
Style: preserve the supplied hand-drawn fine pixel clusters, stepped brown outlines, wood grain, restrained brass fittings, eyes in the letter M and heart detail in the C. Keep material shading and highlight intensity consistent with the reference; no brighter rim, gloss, extra ornament or redesign.
Constraints: genuinely transparent background, whole silhouette unclipped, no stone wall, room, backing board, rope, character, fire, UI, caption, extra text, currency symbol or watermark. Do not stretch MI to match MIC width. Do not change letter anatomy or invent additional letters. This is layout only, not a new logo concept.
```

- [ ] 使用內建 ImageGen 編輯，不用 SVG、canvas、通用 font 或程式拼貼新創意來源。首次呼叫及後續 wait 的 yield budget 依 imagegen 工具要求 120000ms；程式每 45 秒 explicit yield，持續以繁中更新。

```javascript
// @exec: {"yield_time_ms":120000,"max_output_tokens":1000}
const pending=tools.image_gen__imagegen({
  prompt:"Use case: precise-object-edit\nAsset type: one transparent hand-drawn pixel RPG wordmark for a Landing layout review\nInput image 1: existing MIMIC wooden-letter identity/style reference and edit target. Preserve its letter identity and eye/heart details; do not insert a scene.\nPrimary request: rearrange only this five-letter wordmark into two staggered rows. Upper row is exactly \"MI\", lower row exactly \"MIC\"; together M-I-M-I-C. Upper MI starts at the left. Lower MIC starts farther right, not centered underneath MI and not flush left. Both rows have the same per-letter scale.\nComposition: compact upper-left to lower-right stepped grouping, mildly tightened vertical spacing so a few outer wooden tips overlap. Keep every defining letter stroke readable. The lower row is still unmistakably below the upper row, not one continuous line. No broad overlap that hides letters, eyes or the heart.\nStyle: preserve the supplied hand-drawn fine pixel clusters, stepped brown outlines, wood grain, restrained brass fittings, eyes in the letter M and heart detail in the C. Keep material shading and highlight intensity consistent with the reference; no brighter rim, gloss, extra ornament or redesign.\nConstraints: genuinely transparent background, whole silhouette unclipped, no stone wall, room, backing board, rope, character, fire, UI, caption, extra text, currency symbol or watermark. Do not stretch MI to match MIC width. Do not change letter anatomy or invent additional letters. This is layout only, not a new logo concept.",
  referenced_image_paths:["D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/wordmark.png"],
  transparent_background:true
});
for(;;){
  const update=await Promise.race([pending.then(result=>({result})),new Promise(resolve=>setTimeout(()=>resolve({waiting:true}),45000))]);
  if(update.waiting){notify("交錯字標仍在產生；只調整排列，保留既有木材、眼睛與愛心細節。");await yield_control();continue;}
  store("landingATitleImageGenResult",update.result);generatedImage(update.result);break;
}
```

- [ ] 從 **實際返回的 output_hint** 取得產物本機路徑，非覆寫 copy 到 v01 source；比對來源／副本 SHA-256。下列程式只適用於工具確實返回該形式的 saved-path hint；若格式不同，讀實際 metadata 找到路徑，不能猜測檔名或用 image_url 另造圖。

```javascript
const result=load("landingATitleImageGenResult");
const match=String(result?.output_hint??"").match(/as (C:\\[^\r\n]+?\.png) by default/);
if(!match)throw Error("Inspect the actual imagegen result metadata for its saved file path; never guess a path");
const source=match[1],target="D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/wordmark-staggered-v01-source.png";
const quote=s=>"'"+s.replaceAll("'","''")+"'";
text(await tools.exec_command({cmd:"if (Test-Path -LiteralPath "+quote(target)+") { throw 'Source already exists; preserve it' }; New-Item -ItemType Directory -Path "+quote(target.slice(0,target.lastIndexOf("/")))+" -Force | Out-Null; Copy-Item -LiteralPath "+quote(source)+" -Destination "+quote(target)+"; if ((Get-FileHash -LiteralPath "+quote(source)+" -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath "+quote(target)+" -Algorithm SHA256).Hash) { throw 'Source copy hash mismatch' }",workdir:"D:/Project/mimic",sandbox_permissions:"require_escalated",justification:"保留 ImageGen 原稿並另存本輪透明來源，不覆寫既有版本。",max_output_tokens:1000}));
```

- [ ] 使用 view_image 檢視新本地 source。逐字讀 M-I-M-I-C，確認上 MI 左、下 MIC 右、五個字同尺度、下排仍在下方、僅外輪廓少量交疊、眼睛／愛心與識別筆畫不遮擋。沒有背板、繩索、額外裝飾或亮度／畫風漂移。
- [ ] 若不符合，修正同一排列要求而不是切換設計方向；每次 source/prompt 另存新編號並檢視後再 imagegen。不得透過程序補畫字形。無法同時滿足等大／可讀／輪廓重疊時，回報具體衝突，不能更動人物或牆體。
- [ ] 通過自身來源檢視後，apply_patch 建立 `lineage.json`：

```json
{
  "path": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/wordmark-staggered-v01-source.png",
  "parentPath": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/wordmark.png",
  "promptPath": "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/wordmark-staggered-v01-prompt.md",
  "generator": "imagegen",
  "transparent": true
}
```

透明 source 保留原始 alpha/bytes；transparent RGB 清理只作用於新 deterministic masters/實際 scaled title，不回寫原 source。

## Task 4 — 新 config 與 deterministic compositor

**Create:** `landing-a-title.config.mjs`、`compose-landing-a-title.mjs`。

- [ ] 用 apply_patch 建立 config：

```javascript
export const config = {
  decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false, baseVariant: "A",
  basePath: "landing-warm-rest.manifest.json",
  previousPage: "landing-warm-rest-review.html",
  lineagePath: "samples/derivations/landing-a-title/lineage.json",
  rawStaggered: "samples/derivations/landing-a-title/wordmark-staggered-v01-source.png",
  spec: "docs/superpowers/specs/2026-10-09-landing-a-party-staggered-wordmark-design.md",
  frames: {
    "desktop-single": { view: "desktop", wordmark: "single", wall: [385,84,288,85] },
    "desktop-staggered": { view: "desktop", wordmark: "staggered", wall: [420,80,175,104] },
    "phone-staggered": { view: "phone", wordmark: "staggered", wall: [116,90,148,104] },
  },
};
```

字標框為**初始容納框**，不是證明牆體邊界的假 mask。桌機交錯框右界 595、下界 184，避開 ranger 起點 598,187；手機下界 194，避開 ranger 起點 245,198。仍需檢視真實岩壁、縫隙與 title source 形狀。只能調整新字標的框與等比尺寸，不能移動其他 layers；若必要調整，保留實際尺寸於 manifest 與頁面，不重新選 logo/亮度。單行目前框與舊字標落點一致。

- [ ] 用 apply_patch 建立 compositor：

```javascript
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { config } from "./landing-a-title.config.mjs";
import { renderReview } from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=file=>path.relative(repo,file).replaceAll("\\","/");
async function fileRecord(file){const b=await readFile(file);return {path:relative(file),sha256:hash(b)};}
async function record(file){const a=await fileRecord(file),p=PNG.sync.read(await readFile(file));return {...a,width:p.width,height:p.height};}
async function checked(a){
  const b=await readFile(path.join(repo,a.path));
  if(hash(b)!==a.sha256)throw Error("Changed reference: "+a.path);
  const p=PNG.sync.read(b);
  if(p.width!==a.width||p.height!==a.height)throw Error("Wrong reference dimensions: "+a.path);
  return p;
}
async function save(name,p){
  const file=path.join(dir,"samples/landing-a-title",name);
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,PNG.sync.write(p));return record(file);
}
function crop(p){
  let x=p.width,y=p.height,r=-1,b=-1;
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++)if(p.data[(sy*p.width+sx)*4+3]>=200){
    x=Math.min(x,sx);y=Math.min(y,sy);r=Math.max(r,sx);b=Math.max(b,sy);
  }
  if(r<x)throw Error("Empty opaque title");
  return {x,y,width:r-x+1,height:b-y+1};
}
function nearest(p,w,h,b={x:0,y:0,width:p.width,height:p.height},clean=false){
  const out=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=b.x+Math.min(b.width-1,Math.floor(x*b.width/w)),sy=b.y+Math.min(b.height-1,Math.floor(y*b.height/h));
    const si=(sy*p.width+sx)*4,di=(y*w+x)*4;
    if(clean&&p.data[si+3]<200)continue;
    out.data.set(p.data.subarray(si,si+4),di);if(clean)out.data[di+3]=255;
  }
  return out;
}
function over(canvas,p,x,y){
  if(x<0||y<0||x+p.width>canvas.width||y+p.height>canvas.height)throw Error("Clipped layer");
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    const si=(sy*p.width+sx)*4,di=((y+sy)*canvas.width+x+sx)*4,a=p.data[si+3]/255;if(!a)continue;
    for(let c=0;c<3;c++)canvas.data[di+c]=Math.round(p.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
function tone(p,t){
  for(let i=0;i<p.data.length;i+=4)if(p.data[i+3]){
    const r=p.data[i]*t.brightness,g=p.data[i+1]*t.brightness,b=p.data[i+2]*t.brightness,l=.213*r+.715*g+.072*b;
    p.data[i]=Math.round(l+(r-l)*t.saturation);p.data[i+1]=Math.round(l+(g-l)*t.saturation);p.data[i+2]=Math.round(l+(b-l)*t.saturation);
  }
  return p;
}
function gray(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);out.data.set([v,v,v,p.data[i+3]],i);}
  return out;
}
const baseFile=path.join(dir,config.basePath),base=JSON.parse(await readFile(baseFile,"utf8"));
const sources=Object.fromEntries(Object.entries(base.sources).filter(([id])=>id!=="mage"));
for(const a of Object.values(sources))await checked(a);
const lineageFile=path.join(dir,config.lineagePath),entry=JSON.parse(await readFile(lineageFile,"utf8"));
const original=base.references.wordmark,rawStaggered=await record(path.join(dir,config.rawStaggered));
if(entry.generator!=="imagegen"||entry.transparent!==true||entry.path!==rawStaggered.path||entry.parentPath!==original.path)throw Error("Invalid title lineage");
const lineage={record:await fileRecord(lineageFile),parent:original,prompt:await fileRecord(path.join(repo,entry.promptPath)),generator:entry.generator,transparent:entry.transparent};
const wordmarks={},titleRasters={};
for(const [id,a] of Object.entries({single:original,staggered:rawStaggered})){
  const raw=await checked(a),b=id==="single"?{x:0,y:0,width:raw.width,height:raw.height}:crop(raw);
  const p=tone(nearest(raw,256,Math.round(256*b.height/b.width),b,true),base.wordmarkTone);
  titleRasters[id]=p;
  wordmarks[id]={source:a,master:await save("wordmarks/"+id+".png",p),lines:id==="single"?["MIMIC"]:["MI","MIC"]};
}
const scenes={},sceneRasters={};
for(const view of ["desktop","phone"]){
  const previous=base.frames["A-"+view],size=view==="desktop"?[960,540]:[390,600];
  const a=await checked(sources[view==="desktop"?"architectureDesktop":"architecturePhone"]),ratio=size[0]/size[1];
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const b={x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch};
  const canvas=nearest(a,...size,b);for(let i=3;i<canvas.data.length;i+=4)canvas.data[i]=255;
  const layers=previous.layers.filter(l=>l.id!=="mage");
  for(const l of layers)over(canvas,await checked(l),l.x,l.y);
  sceneRasters[view]=canvas;
  scenes[view]={logical:await save("scene-"+view+"-logical.png",canvas),layers,visitor:previous.visitor};
}
const frames={};
for(const [key,f] of Object.entries(config.frames)){
  const source=sceneRasters[f.view],canvas=new PNG({width:source.width,height:source.height});canvas.data.set(source.data);
  const p=titleRasters[f.wordmark],[wx,wy,ww,wh]=f.wall,scale=Math.min(ww/p.width,wh/p.height);
  const w=Math.max(1,Math.round(p.width*scale)),h=Math.max(1,Math.round(p.height*scale));
  if(w>ww||h>wh)throw Error("Title does not fit wall");
  const sprite=nearest(p,w,h,undefined,true),x=wx+Math.floor((ww-w)/2),y=wy+Math.floor((wh-h)/2);
  over(canvas,sprite,x,y);
  const color=f.view==="desktop"?nearest(canvas,1920,1080):canvas;
  frames[key]={...f,title:{id:"wordmark",x,y,...await save("wordmarks/"+key+".png",sprite)},
    logical:await save(key+"-logical.png",canvas),color:await save(key+".png",color),gray:await save(key+"-gray.png",gray(color))};
}
const references=Object.fromEntries(["warrior","ranger","mimiku"].map(id=>[id,base.references[id]]));
const manifest={decision:config.decision,reviewOnly:config.reviewOnly,runtimePromotion:config.runtimePromotion,baseVariant:config.baseVariant,
  spec:config.spec,base:await fileRecord(baseFile),wordmarkTone:base.wordmarkTone,sources,references,lineage,wordmarks,scenes,frames};
await writeFile(path.join(dir,"landing-a-title.manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(dir,"landing-a-title-review.html"),renderReview(manifest,await readFile(path.join(dir,config.previousPage),"utf8")));
console.log(JSON.stringify(Object.fromEntries(Object.entries(frames).map(([key,f])=>[key,{color:f.color,gray:f.gray}])),null,2));
```

- [ ] 從 repo root 做語法檢查（此時 renderer 尚未建立，不執行 compositor）：

```powershell
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title.config.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-a-title.mjs
```

預期 exit 0、無 syntax diagnostics。compositor 不 import 舊 top-level 寫檔腳本，不用已烘焙含法師的 A color PNG 來擦除／蓋背景；所有保留 layers 直接沿用舊檔與 exact metadata。程序只做背景等比 cover、原位置 source-over、nearest 等比整理、共同 tint、alpha cleanup、灰階与 hashes。

## Task 5 — Live review contract RED → renderer GREEN

**Create:** PW spec/config、ESLint config、renderer。
**Generated by composer:** 新 manifest、HTML、所有 derived PNG。

- [ ] 先建立 `web/e2e/landing-a-title.playwright.config.ts`：

```typescript
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "landing-a-title-review.spec.ts", workers: 1, timeout: 60_000,
  projects: [
    { name: "phone-small", use: { viewport: { width: 320, height: 568 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
```

- [ ] 再建立 `web/e2e/landing-a-title-review.spec.ts`：

```typescript
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
```

- [ ] 從 `web/` 執行 `npx playwright test --config=e2e/landing-a-title.playwright.config.ts`。預期四 project RED：新頁面 404，heading 缺失；不能將瀏覽器缺失或 route 設置錯誤當 RED。先修設置，再重跑 RED。
- [ ] 建立 `web/e2e/landing-a-title.eslint.config.mjs`：

```javascript
export default [{ files:["**/*.mjs"], languageOptions:{ ecmaVersion:2022, sourceType:"module" }, rules:{ "no-unreachable":"error", "no-constant-condition":"error", "no-dupe-keys":"error", "constructor-super":"error", "valid-typeof":"error" } }];
```

- [ ] 建立 `render-landing-a-title.mjs`：

```javascript
export function renderReview(m,previousPage) {
  const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
  const pct=(n,d)=>n/d*100+"%";
  const rect=(r,s)=>`left:${pct(r[0],s.width)};top:${pct(r[1],s.height)};width:${pct(r[2],s.width)};height:${pct(r[3],s.height)}`;
  const labels={"desktop-single":"桌機：單行 MIMIC","desktop-staggered":"桌機：上左 MI／下右 MIC","phone-staggered":"手機：共用交錯兩行版"};
  function overlay(key,cls) {
    const f=m.frames[key],s=m.scenes[f.view],sign=s.layers.find(l=>l.id==="sign");
    return `<div class="overlay ${cls}"><a class="sign-label" href="#journal" style="${rect([sign.x+sign.width*.16,sign.y+sign.height*.17,sign.width*.7,sign.height*.48],f.logical)}">開始<br>冒險</a><span class="visitor-region" aria-hidden="true" style="${rect(s.visitor,f.logical)}"></span><span class="title-region" aria-hidden="true" style="${rect([f.title.x,f.title.y,f.title.width,f.title.height],f.logical)}"></span></div>`;
  }
  function scene(key,phone=false) {
    const f=m.frames[key],p=m.frames["phone-staggered"];
    return `<div class="scene ${phone?"phone":"responsive"}" data-key="${key}" data-desktop-frame="${key}">${phone?`<img src="${rel(p.color)}" width="390" height="600" alt="無法師 A：手機交錯字標">`:`<picture><source media="(max-width:600px)" srcset="${rel(p.color)}"><img src="${rel(f.color)}" width="1920" height="1080" alt="${labels[key]}，無法師 A 構圖"></picture>`}${phone?overlay("phone-staggered","phone-overlay"):overlay(key,"desktop-overlay")+overlay("phone-staggered","mobile-overlay")}<a class="login" href="#review-notes">登入</a><div class="dialogue"><div><span class="speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="cta" href="#journal">開始冒險 ↓</a></div></div>`;
  }
  const journalStart=previousPage.indexOf('<div class="journal" id="journal">');
  const journalEnd=previousPage.indexOf('<section class="notes"',journalStart);
  if(journalStart<0||journalEnd<0)throw Error("Missing preserved warm-rest journal");
  const journal=previousPage.slice(journalStart,journalEnd);
  if((journal.match(/data-chapter/g)??[]).length!==4)throw Error("Journal must retain four chapters");
  const outputs=Object.entries(m.frames).flatMap(([id,f])=>[[id+" logical",f.logical],[id+" color",f.color],[id+" gray",f.gray],[id+" title",f.title]]);
  const hashRows=[["base",m.base],["lineage",m.lineage.record],["prompt",m.lineage.prompt],...Object.entries(m.wordmarks).flatMap(([id,w])=>[[id+" source",w.source],[id+" master",w.master]]),...outputs].map(([id,a])=>`<tr><td>${id}${a.width?`<br>${a.width} × ${a.height}`:""}</td><td><code>${a.sha256}</code></td></tr>`).join("");
  const dimensions=key=>{const f=m.frames[key];return `字標 ${f.title.width} × ${f.title.height} logical px；左上 ${f.title.x}, ${f.title.y}；輸出 ${f.color.width} × ${f.color.height}。`;};
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing A — 無法師與標題排列</title><style>
*{box-sizing:border-box}body{margin:0;background:#211b18;color:#ecd9b7;font:15px/1.6 system-ui,"Microsoft JhengHei",sans-serif}main{max-width:1440px;margin:auto;padding:24px}a{color:inherit}a:focus-visible{outline:3px solid #eabc62;outline-offset:3px}h1{font-size:clamp(22px,3vw,34px)}h2{margin-top:32px}.status,.notes{padding:12px;background:#30271f}.candidates{display:grid;grid-template-columns:1fr;gap:20px}.candidate{min-width:0}.scene{position:relative;container-type:inline-size;overflow:hidden;background:#30231b;border:2px solid #6c5036}.scene>img,.scene picture>img{display:block;width:100%;height:auto;image-rendering:pixelated}.phone{max-width:390px;width:100%;margin:auto}.overlay{position:absolute;inset:0;pointer-events:none}.overlay>*{position:absolute}.mobile-overlay{display:none}.sign-label{pointer-events:auto;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-weight:800;font-size:1.12cqw;line-height:1.15;color:#ffe8ac;text-shadow:1px 1px #3e2316}.phone-overlay .sign-label{font-size:3.3cqw}.login{position:absolute;right:3%;top:4%;padding:3px 10px;background:#211a17d9;border:1px solid #a78953;text-decoration:none}.dialogue{position:absolute;left:2%;right:2%;bottom:3%;height:19%;padding:10px 16px;border:2px solid #b79556;background:#211a18f2;display:flex;align-items:center;justify-content:space-between;gap:12px}.speaker{color:#efc56c;font-weight:700}.dialogue p{margin:3px 0;font-size:clamp(12px,1.6cqw,18px);line-height:1.35}.cta{display:inline-block;white-space:nowrap;padding:7px 12px;border:2px solid #f0ce80;background:#b68137;color:#211a18;font-weight:800;text-decoration:none}.phone .dialogue{bottom:2%;height:26%;padding:8px;display:block}.phone .speaker{font-size:11px;line-height:1.3}.phone .dialogue p{font-size:12px}.phone .cta{margin-top:4px;font-size:12px;padding:4px 10px}.raws,.refs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.raws img{width:100%;height:auto;image-rendering:pixelated}.refs figure{margin:0;text-align:center}.refs img{max-width:100%;width:128px;image-rendering:pixelated}.wordmark-reference{max-width:100%;image-rendering:pixelated}code{overflow-wrap:anywhere;font-size:12px}table{table-layout:fixed;width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #685440;vertical-align:top}td:first-child{width:25%}.journal{margin-top:32px;padding:clamp(16px,4vw,56px);background:#e5cc9e;color:#3a2a20}.journal-intro,.closing{display:flex;gap:16px;align-items:center}.journal-intro img,.closing img{width:76px;image-rendering:pixelated}.chapter{display:grid;grid-template-columns:100px minmax(0,1fr);gap:24px;padding:24px 0;border-bottom:1px solid #a68a64}.chapter img{width:100%;height:110px;object-fit:contain;image-rendering:pixelated}.journal footer,.closing{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px}
@media(min-width:1400px){.candidates{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{padding:12px}.desktop-overlay{display:none}.mobile-overlay{display:block}.responsive .sign-label{font-size:3.3cqw}.responsive .dialogue{bottom:2%;height:26%;padding:8px;display:block}.responsive .speaker{font-size:11px;line-height:1.3}.responsive .dialogue p{font-size:12px}.responsive .cta{margin-top:4px;font-size:12px;padding:4px 10px}.raws,.refs{grid-template-columns:repeat(2,minmax(0,1fr))}.chapter{grid-template-columns:65px minmax(0,1fr);gap:16px}.chapter img{height:80px}.login{font-size:12px}}
</style></head><body><main><h1>Landing A — 無法師與標題排列</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false</p><p>A 為唯一基準：只移除法師，其餘人物、道具、火光與地面不動。桌機只比較字標排列與容納排列所需的等比尺寸／牆面落點；五個字在兩行內同尺度，不要求兩個候選的字高相同。</p><p>手機統一使用交錯版：窄螢幕下兩個桌機候選會顯示相同手機圖，不是兩種手機方案。B 石壁結合／第三 C 亮度精修仍留待後續，這輪不是新 logo 或亮度選擇。</p><p><a href="landing-warm-rest-review.html">原 A／B 頁面（保留）</a> · <a href="landing-a-title.manifest.json">manifest 與來源紀錄</a></p>
<div class="candidates">${["desktop-single","desktop-staggered"].map(key=>`<section class="candidate" data-candidate="${key}"><h2>${labels[key]}</h2><p>${dimensions(key)}</p>${scene(key)}</section>`).join("")}</div>
<section><h2>手機：共用交錯兩行版</h2><p>${dimensions("phone-staggered")}</p>${scene("phone-staggered",true)}</section>
<details><summary>三張真實灰階輸出</summary><div class="raws">${Object.entries(m.frames).map(([key,f])=>`<figure><img src="${rel(f.gray)}" alt="${labels[key]} 灰階"><figcaption>${labels[key]}</figcaption></figure>`).join("")}</div></details>
<h2>既有字標參照與新來源</h2><p>下圖為未套用共同色調的來源；場景使用同一 brightness 0.82／saturation 0.72 整理，沒有 CSS 個別亮度差異。</p><img class="wordmark-reference" src="${rel(m.lineage.parent)}" width="256" height="75" alt="既有單行 MIMIC 字標參照"><p><a href="${rel(m.wordmarks.staggered.source)}">新交錯透明 ImageGen source</a> · <a href="${rel(m.lineage.prompt)}">實際 prompt</a></p>
<h2>已核准身份與顆粒參照</h2><div class="refs">${["warrior","ranger","mimiku"].map(id=>`<figure><img src="${rel(m.references[id])}" alt="${id} master"><figcaption>${id}</figcaption></figure>`).join("")}</div>
${journal}<section class="notes" id="review-notes"><h2>本輪判斷</h2><ol><li>移除法師後更鬆，仍是抵達有人陪伴的暖火休息處。</li><li>上左 MI／下右 MIC：字形等大、略微輪廓重疊，眼睛、愛心及筆畫沒有被遮住。</li><li>字標完整落在連續岩壁中，不跨洞口、岩縫、天花板、蝙蝠或人物。</li><li>火與伙伴仍是焦點，地圖、探索物件和可加入的地面仍清楚。</li><li>寶箱、地圖箱與陷阱位置這輪不調整，下一輪再逐項審核。</li></ol><p>登入／CTA 只保留 live review 錨點示範，不連接認證或互動。三種帳務語意、鎖定期間規則均未變動；Scenes 未核准，不提升 runtime。字形與岩壁融合必須目視確認，manifest 標籤與測試不能代替你的視覺判斷。</p></section><details><summary>exact SHA-256 與實際尺寸</summary><table><tbody>${hashRows}</tbody></table></details></main></body></html>\n`;
}
```

Renderer 不執行任何 fs write，保持純函式。它截取現有暖火頁面 journal 開頭至 notes section 之前，**不**用 first `</section>`（那會混入舊 notes）；保留四章 markup 與原路徑。場景字標已烘焙在 PNG 內，因此沒有 logo CSS filter 或額外疊第二個字標；灰階也包含真正字標。title-region 只是無視覺測試定位 span，不是 UI 外框。

- [ ] 從 repo root 執行新 compositor：

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-a-title.mjs
```

預期生成三幀：兩張 1920×1080 desktop color、同尺寸灰階、三張 logical、390×600 phone color/gray，兩張 256 寬字標 review masters及三張實際 scaled title PNG；stdout 列出三幀 color/gray exact hashes。若 alpha 或文字錯誤，回 Task 3 另存 ImageGen 版本，不手繪修字。

- [ ] 從 `web/` 重跑：

```powershell
npm test -- src/shared/brand/landing-a-title-calibration.test.ts
npx playwright test --config=e2e/landing-a-title.playwright.config.ts
```

預期新 Vitest 4/4 與 PW 4/4 GREEN，所有 img decode 成功、320/390/768/1440 無水平溢位、對話和可加入地面不遮擋、兩個窄屏 candidate 取同一 phone bitmap、日誌四章與 focus/CTA 正常。實際失敗時先用 systematic-debugging 查原因，依 TDD 在新 scope 修復，不改舊頁、移 props 或放寬重要斷言。

## Task 6 — 自我審查、證據與視覺 checkpoint

- [ ] 用 view_image 檢查新兩張 color、phone color、字標 masters；以既有 A / 原字標並排目視，讀取 manifest 實際尺寸。確認：
  1. 桌機／手機法師都已移除，未刪除歷史 source。
  2. 其餘角色、火、木箱、寶箱、陷阱、地面／暖光不變，留白是真實移除結果。
  3. MI/MIC 上左下右、每字等大、外輪廓小幅重疊；眼睛／心形／筆畫可讀；不亮過火與 Mimiku。
  4. 標題完整落在連續岩壁，不跨洞口、天花板、岩縫或蝙蝠；矩形安全測試不代替這項目視判斷。
  5. 同一手機預覽有 live UI，不是桌機裁切。單行／交錯實際字標尺寸明確，不假裝總寬或字高相同。
  6. 原 B融合／第三 C亮度方向標為 deferred，沒有錯誤 approval 或 runtime promotion。
  7. 日誌內容／帳務邊界不變，新 comparator 的灰階是真實 PNG。
- [ ] 完整使用 repository self-review 技能，對本輪新 code/assets 反覆檢查，修完 critical/important 再進行下一輪。不能把測試通過當畫面核准，也不能以 metadata `lines` 取代讀取真實字形。
- [ ] 使用 verification-before-completion，從 `web/` 跑完整 focused sequence，記錄實際 exit code／測試數量：

```powershell
npm test -- src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
npx eslint src/shared/brand/landing-a-title-calibration.test.ts e2e/landing-a-title-review.spec.ts e2e/landing-a-title.playwright.config.ts
npm run typecheck
npx playwright test --config=e2e/landing-a-title.playwright.config.ts
```

預期 Vitest 新 4＋既有暖火 4＋戰情室 7＝15 tests PASS，ESLint 0 errors、typecheck exit 0、PW 四 project PASS。每個命令分別執行，出錯不跳到下一步當全綠。這是 review-only focused 檢查，未跑 production build；不得聲稱完整 production baseline 或全 repo tests 已通過。

- [ ] 從 repo root 跑三個新 ESM 檔的 focused lint：

```powershell
web/node_modules/.bin/eslint.cmd --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-a-title.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs
```

預期 exit 0。若出現 ignored-file warning，確認實際被 lint，而不是把忽略當成功。

- [ ] 從 repo root 做兩次 regeneration，包含 JSON/HTML、scene、wordmark masters、scaled title、三幀 logical/color/gray 的 byte-for-byte determinism：

```powershell
node --input-type=module -e @'
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import path from "node:path";
const dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1";
const script=path.join(dir,"compose-landing-a-title.mjs");
async function snapshot(){
  const m=JSON.parse(await readFile(path.join(dir,"landing-a-title.manifest.json"),"utf8"));
  const paths=[path.join(dir,"landing-a-title.manifest.json"),path.join(dir,"landing-a-title-review.html"),
    ...Object.values(m.scenes).map(s=>s.logical.path),...Object.values(m.wordmarks).map(w=>w.master.path),
    ...Object.values(m.frames).flatMap(f=>[f.logical.path,f.color.path,f.gray.path,f.title.path])];
  return new Map(await Promise.all(paths.map(async p=>[p,await readFile(p)])));
}
execFileSync("node",[script],{stdio:"ignore"});const first=await snapshot();
execFileSync("node",[script],{stdio:"ignore"});const second=await snapshot();
if(first.size!==second.size)throw Error("Output count changed");
for(const [p,b]of first)if(!second.get(p)?.equals(b))throw Error("Nondeterministic output: "+p);
console.log("PASS: "+first.size+" output files byte-identical across two runs");
'@
```

預期 `PASS: 18 output files byte-identical across two runs`。raw source 不重新生成、不覆寫。尺寸、所有引用 PNG hashes、透明區 RGB=0、alpha 遮擋及 true grayscale 由 Vitest 實際像素檢查。不要只比較 color hash。

- [ ] 將本次 PW 四 project 各三張 live scene 截圖非覆寫保存到新 previews，總數 12。以下從 repo root 執行，只讀已存在 test-results 及新增目標，不刪舊結果：

```powershell
$previewTarget = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-a-title/previews'
New-Item -ItemType Directory -Path $previewTarget -Force | Out-Null
$previewCount = 0
$previewProjects = @{}
Get-ChildItem -LiteralPath 'web/test-results' -Directory | Where-Object { $_.Name -like 'landing-a-title-review-*' } | ForEach-Object {
  if ($_.Name -notmatch '-(phone-small|phone|tablet|desktop)$') { throw 'Unknown viewport result directory' }
  $previewProject = $Matches[1]
  if ($previewProjects.ContainsKey($previewProject)) { throw 'Ambiguous viewport result directories; inspect exact Playwright output paths' }
  $previewProjects[$previewProject] = $true
  $previewFiles = @(Get-ChildItem -LiteralPath $_.FullName -File -Filter '*.png')
  if ($previewFiles.Count -ne 3) { throw 'Expected three successful live scene screenshots per viewport' }
  foreach ($previewFile in $previewFiles) {
    $previewDestination = Join-Path $previewTarget ($previewProject + '-' + $previewFile.Name)
    if (Test-Path -LiteralPath $previewDestination) { throw 'Preview exists; preserve it and choose a revision-specific sibling filename' }
    Copy-Item -LiteralPath $previewFile.FullName -Destination $previewDestination
    $previewCount++
  }
}
if ($previewCount -ne 12 -or $previewProjects.Count -ne 4) { throw 'Missing four-viewport evidence' }
Write-Output ('PASS: ' + $previewCount + ' live UI previews saved')
```

若 Playwright 的實際 directory 名稱不同，以此次 runner 回傳的 exact outputPath 確认來源再 literal copy，不能猜路徑；不混入前次暖火／v04 screenshots。若已有本輪 previews，先保留且比對，新的證據另存 revision sibling，不覆寫使用者檔。

- [ ] 使用 apply_patch 對 `.agents/devlog.md` 做最小 append。日期用實際執行日期；以下文字在完成上述實作後成立，驗證數量以真實 command output 補列，不把預期結果當實際成功：

```markdown
## 2026-10-09 — Landing A 減員與交錯字標 review

**Task:** 依核准規格移除 Landing A 法師，比較單行與等大交錯兩行字標。
**Scope:** docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title*、compose-landing-a-title.mjs、render-landing-a-title.mjs、samples/landing-a-title/、samples/derivations/landing-a-title/；web 的獨立 Vitest／Playwright contracts。
**What changed:**
- 重新合成同一 A 背景及保留圖層，只略過法師；歷史素材保留。
- 保存透明 ImageGen 字標來源／prompt／lineage，產生兩桌機與共同手機的彩色、灰階、尺寸、exact hashes 與 live UI 截圖。
- 建立 isolated review 頁與 preservation／pixel／viewport contracts。
**Decisions:** 本輪只比較排列；維持其餘物件落點及共同色調。B 石壁融合／第三 C 亮度精修另輪處理；本輪檔案不提交，不改 runtime/public/registry/PWA/SW。
**Known gaps / follow-ups:** awaiting-calibration，等待新畫面視覺審核；寶箱、地圖箱與陷阱位置下一輪再討論，Scenes 不升級核准。
```

若實際執行日期不是 10-09，先改 entry 日期；若仍有重要未修問題，不寫「完成」也不偽稱上述產物成立。確保原 devlog 前綴 bytes 不動。

- [ ] 從 repo root 執行 whitespace 檢查：

```powershell
git diff --check -- .agents/devlog.md
$reviewTextFiles = @(
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title.config.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-a-title.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-a-title.mjs',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title.manifest.json',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/wordmark-staggered-v01-prompt.md',
 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-a-title/lineage.json',
 'web/src/shared/brand/landing-a-title-calibration.test.ts',
 'web/e2e/landing-a-title-review.spec.ts',
 'web/e2e/landing-a-title.playwright.config.ts',
 'web/e2e/landing-a-title.eslint.config.mjs'
)
foreach ($reviewTextFile in $reviewTextFiles) {
  git diff --no-index --check -- NUL $reviewTextFile
  if ($LASTEXITCODE -gt 1) { throw ('Whitespace check command failed: ' + $reviewTextFile) }
}
```

no-index 比較新檔案 exit 1 可能僅表示內容新增，但任何 trailing-whitespace/conflict-marker diagnostics 必須修。若有 v02 prompt，把其 exact 路徑加入清單。整個 repo 的 `git diff --check` 也跑一次，若有既有 unrelated 診斷，指出原路徑與本輪 scope 分開，不修改既有內容來消除它。

- [ ] 使用實作前基線做保護驗證：

```javascript
const before=load("landingATitleExecutionBaseline");
if(!before)throw Error("Missing execution baseline; do not invent one after editing");
const result=await tools.exec_command({cmd:"node -e @'\n"+"const prefixLength="+before.devlog.length+";"+"\nconst {execFileSync}=require(\"node:child_process\"),fs=require(\"node:fs\"),path=require(\"node:path\"),crypto=require(\"node:crypto\");\nconst hash=b=>crypto.createHash(\"sha256\").update(b).digest(\"hex\");\nconst git=args=>execFileSync(\"git\",args,{maxBuffer:134217728,stdio:[\"ignore\",\"pipe\",\"ignore\"]});\nconst prefix=\"docs/design/assets/reviews/2026-09-18-page-visual-phase-1/\";\nconst allowed=new Set([\"landing-a-title.config.mjs\",\"compose-landing-a-title.mjs\",\"render-landing-a-title.mjs\",\"landing-a-title.manifest.json\",\"landing-a-title-review.html\"].map(p=>prefix+p).concat([\"web/src/shared/brand/landing-a-title-calibration.test.ts\",\"web/e2e/landing-a-title-review.spec.ts\",\"web/e2e/landing-a-title.playwright.config.ts\",\"web/e2e/landing-a-title.eslint.config.mjs\"]));\nconst newPath=p=>allowed.has(p)||p.startsWith(prefix+\"samples/landing-a-title/\")||p.startsWith(prefix+\"samples/derivations/landing-a-title/\");\nconst names=[...new Set(Buffer.concat([git([\"ls-files\",\"-z\"]),git([\"ls-files\",\"--others\",\"--exclude-standard\",\"-z\"])]).toString().split(\"\\0\").filter(Boolean))].sort().filter(p=>!p.startsWith(\".codex-remote-attachments/\")&&!p.startsWith(\"reference/\"));\nif(typeof prefixLength!==\"number\"&&names.some(newPath))throw Error(\"New paths already exist; inspect before editing, do not overwrite or recapture a mid-execution baseline\");\nconst files=names.filter(p=>p!==\".agents/devlog.md\"&&!newPath(p)).map(p=>[p,fs.existsSync(p)&&fs.statSync(p).isFile()?hash(fs.readFileSync(p)):\"missing\"]);\nfunction publicFiles(dir,result=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())publicFiles(p,result);else if(e.isFile())result.push([p.replaceAll(\"\\\\\",\"/\"),hash(fs.readFileSync(p))]);}return result.sort((a,b)=>a[0].localeCompare(b[0]));}\nconst publicTree=publicFiles(\"web/public\"),devlog=fs.readFileSync(\".agents/devlog.md\");\nif(git([\"diff\",\"--cached\",\"--name-only\",\"--\",\".codex-remote-attachments\",\"reference\"]).toString().trim())throw Error(\"Protected paths are staged; do not unstage user files\");\nconsole.log(JSON.stringify({filesHash:hash(JSON.stringify(files)),filesCount:files.length,publicHash:hash(JSON.stringify(publicTree)),publicCount:publicTree.length,index:hash(git([\"ls-files\",\"-s\"])),staged:hash(git([\"diff\",\"--cached\",\"--binary\"])),working:hash(git([\"diff\",\"--binary\",\"--\",\".\",\":(exclude).agents/devlog.md\"])),devlog:{length:devlog.length,sha256:hash(devlog)},devlogPrefix:typeof prefixLength===\"number\"?hash(devlog.subarray(0,prefixLength)):null}));\n'@",workdir:"D:/Project/mimic",sandbox_permissions:"require_escalated",justification:"驗證舊素材、runtime、public 與既有暫存內容未變，只增補本輪 devlog。",max_output_tokens:2000});
if(result.exit_code!==0)throw Error(result.output);
const after=JSON.parse(result.output);
for(const key of ["filesHash","filesCount","publicHash","publicCount","index","staged","working"])if(after[key]!==before[key])throw Error(key+" changed");
if(after.devlogPrefix!==before.devlog.sha256)throw Error("Existing devlog prefix changed");
if(after.devlog.length<=before.devlog.length)throw Error("Missing devlog append");
text("PASS: prior files, devlog prefix, public tree, index and staged diff preserved; only scoped new paths");
```

預期 PASS，聚合 fingerprint 保證原 tracked/untracked、歷史 review、runtime/source、舊 asset registry bytes 沒被改寫或刪除；public tree 包含 ignored SW。新 scope 不在 fingerprint 中，但 Vitest/PW/lineage/determinism 對其檢查。devlog 只允許 append，index 和 staged diff 不變，protected folders 仍未暫存。若缺 baseline，不能事後抓新的基線宣稱已保護：回報限制，讀既有證據與 git diff 核對，必要時停止。

- [ ] 額外讀取 `git diff --name-only -- web/public web/src/app web/src/features web/src/shared` 與 `git diff --cached --name-only -- .codex-remote-attachments reference`。前者可能有原有 dirty：只能與 baseline 相比說「本輪未變」，不能說整个 workspace 沒有修改。後者應空。不得暫存或混合提交來清空。
- [ ] 用實際新 color/gray/title master/source/manifest 的 hash 作 handoff，至少列三張彩色與三張灰階 PNG exact SHA-256、字標 masters/source 的 hash 和尺寸。列實際驗證結果，不使用計畫中的預期值。
- [ ] 在 Codex 開啟新頁；不是舊頁，不依賴未知 localhost port：

```javascript
text(await tools.mcp__codex_app__open_in_codex({target:{type:"browser",url:"file:///D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-a-title-review.html"}}));
```

若工具回 queued 或瀏覽器未成功顯示，準確說明狀態；在回覆 inline 顯示三張本地實際圖片（absolute PNG paths），並提供新 review 文件連結。不能說 queued 就等於使用者已看到。

- [ ] **停止等視覺意見。** 請使用者比較桌機單行／交錯及共同手機，先判斷新排列與減員效果。沒有自行核准、runtime promotion、寶箱／木箱／陷阱重排、Home 變更、Phase 2 或 production exports。

## 計畫自審核與 handoff

撰寫者以規格逐項對照：Task 1/6 保護及邊界；Task 2/4 實際無法師重建、保留圖層原 metadata；Task 3 字標創意來源及字形規則；Task 5 同一手機、live UI／日誌／真灰階／尺寸；Task 6 四 viewport、lint／typecheck、determinism、alpha／RGB、目視、self-review、devlog 與停點。機器驗證不能證明字形等大或連續岩壁融合，這兩項明列人工檢查。

計畫只以 exact path 獨立提交，避免污染既有 index；實作提交不包含於本輪。使用者已選 Inline，不再詢問模式。計畫完成後回報文件／commit，等待開始指示，再依 executing-plans 逐項執行到上述視覺 checkpoint。
