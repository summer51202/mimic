# Landing Warm Rest Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. The user has already selected **Inline Execution** and prohibited worktrees and subagents. Do not ask for that choice again. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 產出兩個可直接比較的小隊暖火休息處粗略構圖，各有桌機、手機、灰階與 live UI，停止等待使用者選擇構圖。

**Architecture:** 在既有 Phase 1 review 目錄新增獨立比較管線，不改目前 v04 管線或其輸出。A、B 共用 ImageGen 分層素材、角色尺度、字標及 UI，僅比較小隊緊密程度、深度與前側留白；以 `pngjs` 做 deterministic 等比例整理與合成。這是可審核的構圖草案，不是最終精修、字標整合或 production assets。

**Tech Stack:** Built-in ImageGen、Node.js ESM、`pngjs`、static HTML、Vitest、Playwright。

---

## 核准來源、停點與不變項

使用者於 2026-10-08 明確「確認」[暖火休息處構圖修訂](../specs/2026-10-08-landing-warm-rest-composition-design.md)（文件 commit `6979b40`）。與 [原作戰會議室規格](../specs/2026-10-05-landing-war-room-visual-design.md) 合併閱讀，修訂明列條款優先。

- 本計畫只到**兩個粗略構圖 checkpoint**。使用者選定後才制定精修及 B／C 字標分層整合工作，不在此輪自行完成或核准。
- A「緊密火邊」：較近的小隊與較窄的前側加入空間。B「錯落迎接」：增加前後錯落與前側地面。兩者都是開口群組，沒有全員面向鏡頭、均勻半圓或單側排隊。
- 固定角色身份、服裝、膚色、底層約 2.25 頭身與細緻像素風格；保留斜角地圖箱 source，寬度 113／79；沿用火堆 source，不另畫更大的火。
- 地面與角色由共同略俯 2D 橫向鏡頭呈現；火是唯一強光。修訂必要朝向／光線，不能只把獨立照明角色移動座標就宣稱完成。
- 共用目前 v08 的 live 字標素材、位置與 tone，明示使用者已選 B 結合方式／第三 C 亮度方向仍待後續整合。不得把新整張標題概念圖當成 scene master。
- 舊 `landing-war-room*`、舊 `compose-landing-war-room.mjs`、原測試及全部歷史來源／預覽均維持原樣。新比較頁回鏈舊頁。
- `decision: awaiting-calibration`、`reviewOnly: true`、`runtimePromotion: false`。不改 Scenes approval、`web/public`、runtime source、registry、PWA/SW、Home、互動、帳務、Phase 2。

## 檔案責任

以下路徑皆相對 `D:/Project/mimic`；命令另註明 cwd。所有編輯使用 `apply_patch`。

| 檔案／目錄 | 責任 |
| --- | --- |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest.config.mjs` | 兩個構圖的座標、共享 source、保留前側地面區域 |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-warm-rest.mjs` | 無 runtime 副作用的 PNG 整理、分層合成、manifest |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-warm-rest.mjs` | 比較頁 live UI、參照、既有日誌樣本、exact hashes |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest.manifest.json` | 實際 bytes 的 source、parent、prompt、layer、output hashes |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest-review.html` | 新的 A/B 審核頁，不取代 v04 |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/warm-rest/` | 新版本 raw ImageGen sources、每次實際 prompt、lineage JSON |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-warm-rest/` | A/B desktop logical、exact 2× desktop、phone、灰階、透明 layers、browser previews |
| `web/src/shared/brand/landing-warm-rest-composition.test.ts` | 獨立 artifact contract，不改產品程式 |
| `web/e2e/landing-warm-rest-review.spec.ts` | 獨立四 viewport browser contract |
| `web/e2e/landing-warm-rest.playwright.config.ts` | 無 Web server 的 review-only 四 viewport 設定 |
| `web/e2e/landing-warm-rest.eslint.config.mjs` | 可明確 lint root review `.mjs` 的獨立設定，不改產品 ESLint |
| `.agents/devlog.md` | 實作後最小增量 append，不暫存原有 dirty 文件 |

## Task 1 — 建立保護基準與目視參照

- [ ] 在 root 執行 `git status --short` 與 `git log --oneline -5`，記錄本輪開始時的 staged／dirty／untracked。保存 `git ls-files -s`、`git diff --binary`、`git diff --cached --binary` 的 SHA-256，Node `execFileSync` 設 `maxBuffer: 134217728`，避免大 diff 截斷。實作新增檔案不能混進既有 index；本輪 artifact 不 stage／commit。 用以下唯讀 Node 命令取得可保存到 session store 的 JSON；不要列印逐檔內容，只保存回傳資料並報告檔案數。已存在的 tracked／untracked 檔案都納入，排除受保護目錄：

```powershell
node -e 'const cp=require("node:child_process"),fs=require("node:fs"),c=require("node:crypto");const run=a=>cp.execFileSync("git",a,{stdio:["ignore","pipe","ignore"],maxBuffer:134217728}),hash=b=>c.createHash("sha256").update(b).digest("hex");const paths=[...new Set(run(["ls-files","-z","--cached","--others","--exclude-standard","--",".",":(exclude).codex-remote-attachments/**",":(exclude)reference/**"]).toString().split("\0").filter(Boolean))];const files=Object.fromEntries(paths.map(p=>{if(!fs.existsSync(p))return [p,null];const b=fs.readFileSync(p);return [p,{sha256:hash(b),bytes:b.length}];}));console.log(JSON.stringify({index:hash(run(["ls-files","-s"])),staged:hash(run(["diff","--cached","--binary"])),trackedExceptDevlog:hash(run(["diff","--binary","--",".",":(exclude).agents/devlog.md"])),files}));'
```

基線只讀一般 repository 檔案、不讀 protected 目錄。Task 6 對每個原有檔案重新計算 hash；devlog 以原 bytes 長度的前綴 hash 判斷只 append。不存在的原路徑仍須不存在。新檔案只允許本計畫表列範圍，實際 manifest/SW/registry 另外用 `rg --files web/src web/public | rg 'manifest|registry|service.worker|(^|/)sw\\.'` 查清單；忽略的生成檔若已存在，另納入明確清單保存基線，不靠空的 git status 下結論。
- [ ] 用 `view_image` 實際看下列本地檔案，先看 scene，再逐個 source／master；不能只讀 filename：
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/desktop.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/phone.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes/masters/warrior.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes/masters/mage.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes/masters/ranger.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-actions/masters/state-idle.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/architecture-solid-wall-v06-source.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/warrior-warming-v02-source.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/mage-map-study-v02-source.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/ranger-rest-v01-source.png`
  - `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/mimiku-rest-v01-source.png`
- [ ] 完整讀取 ImageGen、TDD 技能，公告本輪會修改哪些 source。讀取既有 config／manifest／composer 僅為參照；不 import 會自動寫舊 artifacts 的 composer。

## Task 2 — 先寫獨立 failing artifact contract

**Create:** `web/src/shared/brand/landing-warm-rest-composition.test.ts`。

- [ ] 先寫下列測試，尚不寫新 composer 或新 manifest。檔案不存在以 assertion failure 表達，而不是誤把讀檔 exception 當作紅燈。

```ts
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const review = path.join(root, "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
interface Asset { path: string; sha256: string; width: number; height: number }
interface Placed extends Asset { id: string; x: number; y: number }
interface Frame {
  logical: Asset; color: Asset; gray: Asset; layers: Placed[];
  visitor: [number, number, number, number];
}
interface Manifest {
  decision: string; reviewOnly: boolean; runtimePromotion: boolean; stage: string;
  frames: Record<string, Frame>; sources: Record<string, Asset>;
  parents: Record<string, Asset>; references: Record<string, Asset>;
  prompts: { path: string; sha256: string }[];
  wordmarkPlacement: Record<"desktop" | "phone", [number, number, number]>;
}
async function load() {
  const file = path.join(review, "landing-warm-rest.manifest.json");
  expect(existsSync(file), "new composition manifest is required").toBe(true);
  return JSON.parse(await readFile(file, "utf8")) as Manifest;
}
async function png(asset: Asset) {
  const bytes = await readFile(path.join(root, asset.path));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  const image = PNG.sync.read(bytes);
  expect([image.width, image.height]).toEqual([asset.width, asset.height]);
  return image;
}
function overlaps(a: Placed, ap: PNG, b: Placed, bp: PNG, topFraction = 1) {
  let count = 0;
  for (let y = 0; y < Math.ceil(ap.height * topFraction); y++) {
    for (let x = 0; x < ap.width; x++) {
      const bx = a.x + x - b.x, by = a.y + y - b.y;
      if (bx < 0 || by < 0 || bx >= bp.width || by >= bp.height) continue;
      if (ap.data[(y * ap.width + x) * 4 + 3] && bp.data[(by * bp.width + bx) * 4 + 3]) count++;
    }
  }
  return count;
}

it("keeps two unapproved composition drafts and immutable asset lineage", async () => {
  const m = await load();
  expect(m).toMatchObject({ decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false, stage: "rough-composition" });
  expect(Object.keys(m.frames)).toEqual(["A-desktop", "A-phone", "B-desktop", "B-phone"]);
  for (const asset of [...Object.values(m.sources), ...Object.values(m.parents), ...Object.values(m.references)]) {
    expect(asset.path).toMatch(/^docs\/design\/assets\/reviews\/2026-09-18-page-visual-phase-1\//);
    await png(asset);
  }
  expect(m.prompts).toHaveLength(7);
  for (const prompt of m.prompts) expect(createHash("sha256").update(await readFile(path.join(root, prompt.path))).digest("hex")).toBe(prompt.sha256);
  const old = JSON.parse(await readFile(path.join(review, "landing-war-room.manifest.json"), "utf8"));
  for (const id of ["fire", "mapCrate", "sign"]) expect(m.sources[id].sha256).toBe(old.sources[id].sha256);
  expect(m.references.wordmark.sha256).toBe("5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c");
});

it("writes real dimensions, exact 2x pixels, grayscale and clean transparent layers", async () => {
  const m = await load();
  for (const [key, frame] of Object.entries(m.frames)) {
    const phone = key.endsWith("phone");
    expect([frame.logical.width, frame.logical.height]).toEqual(phone ? [390, 600] : [960, 540]);
    expect([frame.color.width, frame.color.height]).toEqual(phone ? [390, 600] : [1920, 1080]);
    const logical = await png(frame.logical), color = await png(frame.color), gray = await png(frame.gray);
    expect([gray.width, gray.height]).toEqual([color.width, color.height]);
    let wrongScale = 0, dirty = 0, notGray = 0;
    for (let y = 0; y < color.height; y++) for (let x = 0; x < color.width; x++) {
      const i = (y * color.width + x) * 4;
      const li = (Math.floor(y / (phone ? 1 : 2)) * logical.width + Math.floor(x / (phone ? 1 : 2))) * 4;
      if (!color.data.subarray(i, i + 4).equals(logical.data.subarray(li, li + 4))) wrongScale++;
      if (gray.data[i] !== gray.data[i + 1] || gray.data[i] !== gray.data[i + 2]) notGray++;
    }
    for (const layer of frame.layers) {
      const image = await png(layer);
      expect(layer.x).toBeGreaterThanOrEqual(0); expect(layer.y).toBeGreaterThanOrEqual(0);
      expect(layer.x + image.width).toBeLessThanOrEqual(logical.width);
      expect(layer.y + image.height).toBeLessThanOrEqual(logical.height);
      let transparent = 0, opaque = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (!image.data[i + 3]) { transparent++; if (image.data[i] || image.data[i + 1] || image.data[i + 2]) dirty++; }
        else opaque++;
      }
      expect(transparent).toBeGreaterThan(0); expect(opaque).toBeGreaterThan(0);
    }
    expect(wrongScale).toBe(0); expect(dirty).toBe(0); expect(notGray).toBe(0);
  }
});

it("protects fire, faces, map and an actually empty visitor ground region", async () => {
  const m = await load();
  for (const [key, frame] of Object.entries(m.frames)) {
    const phone = key.endsWith("phone");
    const fire = frame.layers.find(l => l.id === "fire")!, map = frame.layers.find(l => l.id === "mapCrate")!;
    expect(map.width).toBe(phone ? 79 : 113);
    const images = new Map(await Promise.all(frame.layers.map(async l => [l.id, await png(l)] as const)));
    for (const layer of frame.layers.filter(l => !["fire", "groundLight"].includes(l.id))) expect(overlaps(fire, images.get("fire")!, layer, images.get(layer.id)!)).toBe(0);
    const front = frame.layers.filter(l => frame.layers.indexOf(l) > frame.layers.indexOf(map));
    for (const layer of front) expect(overlaps(map, images.get("mapCrate")!, layer, images.get(layer.id)!)).toBe(0);
    for (const figure of frame.layers.filter(l => ["mage", "warrior", "ranger", "mimiku"].includes(l.id))) {
      for (const later of frame.layers.slice(frame.layers.indexOf(figure) + 1)) expect(overlaps(figure, images.get(figure.id)!, later, images.get(later.id)!, 0.7)).toBe(0);
    }
    const [vx, vy, vw, vh] = frame.visitor;
    expect(vw).toBeGreaterThanOrEqual(phone ? 140 : 180); expect(vh).toBeGreaterThanOrEqual(30);
    expect(vy + vh).toBeLessThan(phone ? 432 : 421);
    let blocked = 0;
    for (const layer of frame.layers.filter(l => l.id !== "groundLight")) {
      const image = images.get(layer.id)!;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        if (layer.x + x >= vx && layer.x + x < vx + vw && layer.y + y >= vy && layer.y + y < vy + vh && image.data[(y * image.width + x) * 4 + 3]) blocked++;
      }
    }
    expect(blocked).toBe(0);
  }
});

it("keeps title clear and compares spacing without changing shared scales", async () => {
  const m = await load();
  for (const view of ["desktop", "phone"] as const) {
    const a = m.frames[`A-${view}`], b = m.frames[`B-${view}`];
    expect(b.visitor[2] * b.visitor[3]).toBeGreaterThan(a.visitor[2] * a.visitor[3]);
    for (const layer of a.layers) expect(b.layers.find(l => l.id === layer.id)!.width).toBe(layer.width);
    for (const frame of [a, b]) {
      const [lx, ly, lw] = m.wordmarkPlacement[view];
      const lh = lw * m.references.wordmark.height / m.references.wordmark.width;
      for (const figure of frame.layers.filter(l => ["mage", "warrior", "ranger", "mimiku", "fire", "bats"].includes(l.id))) {
        expect(lx + lw <= figure.x || lx >= figure.x + figure.width || ly + lh <= figure.y || ly >= figure.y + figure.height).toBe(true);
      }
    }
  }
});
```

- [ ] cwd `web/`：`npm test -- src/shared/brand/landing-warm-rest-composition.test.ts`。預期四個 assertion failure：`new composition manifest is required`。若意外已存在舊的同名輸出，先查來源，不覆蓋；改用新版本名字並同步新檔案，不刪使用者資料。

## Task 3 — ImageGen 共用分層來源，不生成四張任意整場景

**Create:** 上表的 `warm-rest/` 目錄中七個 source、七個 `*-prompt.md`、`lineage.json`。

- [ ] 用 built-in ImageGen，逐張產生／修訂。每次先 `view_image` 本地 edit target 和參照；raw 結果以工具返回的實際來源路徑執行 `Copy-Item`（`-LiteralPath`），目的地使用本 task 明列的 source 新路徑；若目的地已存在便停止。保存 raw bytes、不清理或覆寫 raw alpha。生成需時時用短進度說明，不派遣 subagent。
- [ ] 兩張共用 architecture source：`architecture-desktop-v01-source.png`、`architecture-phone-v01-source.png`。輸入為 v06 architecture、戰士 master、Mimiku master（後兩者只作顆粒參照，不插入人物）。各自提交下列完整提示，手機版明列重新安排直幅鏡頭，**不裁切桌機成手機**：

```text
Use case: precise-object-edit
Asset type: separated architecture-only pixel RPG Landing review layer
Input images: Image 1 edit target, the existing broad natural-rock room; Image 2 and 3 pixel-cluster references only, no characters to insert.
Primary request: preserve the close enclosed warm cave treasure room converted into a temporary party war room, its broad quiet upper-center intact natural rock face, low ceiling and asymmetric side entrances. Change only the central foreground into one continuous shallow ground plane extending toward the visitor. Remove the central cliff/platform edge, distant pointed vista and dark central void. Preserve side rock depth.
Style/medium: deliberate hand-drawn fine pixel clusters matching the warrior and Mimiku, 2D side-scroller with slight downward view, two to three warm brown material bands, broken highlights and meaningful rock bedding. No smooth painting or noisy texture.
Composition/framing: desktop 16:9 room reference for a 960x540 logical review; clear ground through the lower edge, broad title-safe rock face above the party, left old stone entrance and right natural passage still distinct. No blank UI-shaped area. The central ground is calm and free for a group added as separate layers.
Lighting/mood: safe, dim but warmly welcoming. No baked campfire glow, light fixture or person. Lower background contrast than the separate resting party.
Constraints: architecture only; no characters, fire, crates, chest, map, sign, bats, torches, glyphs, lettering, UI, chair, visitor avatar, flags, coin piles, bridge or extra story props. Do not redesign the upper wall or introduce threatening darkness. No text or watermark.
```

手機提示只替換 `Composition/framing` 那一行為：

```text
Composition/framing: independently arranged 390:600 upright central room view for a 390x600 phone logical review, not a crop of the desktop. Same slight-downward side-scroller camera and material grain, same broad intact upper wall, continuous foreground ground and clear center for the whole party. Side passages remain implied beyond this initial central framing. No characters or props and no blank UI-shaped rectangle.
```

- [ ] 四張透明共用角色：`warrior-warm-v01-source.png`、`mage-warm-v01-source.png`、`ranger-inward-v01-source.png`、`mimiku-warm-v01-source.png`。每張以其現有 resting source 為 edit target、自身 master 為 identity reference、戰士 master 為 grain reference。以下共同提示，加上表內的**單一完整角色條款**；一張只畫一個角色。請求 `transparent_background: true`。

```text
Use case: identity-preserve
Asset type: single transparent separated resting-party sprite for a rough composition review
Input images: Image 1 existing resting pose edit target; Image 2 the same identity's approved master; Image 3 approved warrior as fine pixel-cluster reference.
Primary request: adapt only the resting pose's slight-downward side-scroller viewpoint, inward orientation where stated and restrained directional campfire lighting. Preserve identity, face, skin, costume, equipment, material colors and underlying human 2.25-head proportions; sitting does not mean shortening the torso. Keep the whole silhouette unclipped.
Style/medium: fine intentional hand-drawn pixel clusters, stepped dark-brown contour, two to three material value bands, broken highlights, slight handmade asymmetry, no coarse blocks, smooth outlines or AI-synthetic texture.
Lighting/mood: safe warm fire from the indicated lower inward side, subtle warm highlights on fire-facing surfaces and restrained cool-neutral shadow on the far side; no independent spotlight, gold rim, airbrushed glow or orange filter. Existing equipment rests naturally, not on alert.
Constraints: genuinely transparent background; no fire, room, detached base, map, text, UI, symbol or new accessory; no new character design, age or skin change. Do not include surrounding scenery. Contact shadow may be compact at the actual ground contact only.
```

| source | 加入提示的角色條款 |
| --- | --- |
| warrior | Same warrior seated naturally; relaxed hands warm toward a fire to lower-right outside this image, shield rested on the outer left, sword sheathed. Preserve her warming gesture; shared fire lighting from lower-right. No reaching into flames. |
| mage | Same purple noble-leaning mage; relaxed seated posture, slight forward lean only, gaze down-right to the separate map crate, one hand gently at the imaginary crate edge; staff rested at outer left. Do not include crate or map. Fire light comes from lower-right and is weaker than on the warrior. No commanding or briefing gesture. |
| ranger | Same ranger resting seated with one knee bent, bow/quiver/travel bag preserved; turn torso or gaze a little down-left toward the group, not watching a remote right passage. Preserve face and outfit, no combat pose. Fire light comes from lower-left, weaker than on the foreground companion. |
| mimiku | Same Mimiku companion resting naturally with chest identity intact, slightly toward the visitor and the group, not a frontal mascot showcase. Preserve body construction, lid/eyes/teeth details and proportions from references. Warm light comes from lower-left; no coins or detached platform. |

- [ ] 另產生透明 `ground-light-v01-source.png`：讓火光照到共同地面，不再只有人物各自亮起。輸入為 v06 architecture（parent）、既有 campfire（位置／色溫參照）、戰士 master（顆粒參照）；使用以下完整提示，`transparent_background: true`：

```text
Use case: lighting-weather
Asset type: transparent separated stepped ground-illumination overlay for a pixel RPG composition draft
Input images: Image 1 shared ground camera/material reference; Image 2 existing small campfire color reference, do not redraw or include the fire; Image 3 fine pixel-cluster reference.
Primary request: only a restrained warm reflection of the small central fire on the shared shallow-view ground, wider than it is deep, for characters to sit around. Match the same slight-downward side-scroller ground plane. Use two to three quiet value bands and broken pixel clusters; fade by sparse deliberate cluster edges, not smooth alpha fog. Approximate width-to-depth ratio 4.5:1.
Lighting/mood: dim warm safety, subordinate to the actual flame and companions, no independent light sources.
Constraints: genuinely transparent outside illuminated ground clusters. No fire, object, floor base, circular platform, character, stone ring, text, UI, new ground geometry or airborne halo. No overexposed gold circle, smooth gradients or orange filter. This is illumination only, not a physical obstacle.
```

- [ ] 每張生成後檢查外觀／顆粒／姿態／接地／光線。必要時單項修訂另存 v02，並更新新 config 與 lineage，不覆蓋 v01。新 architecture 若改變了 upper title-safe face 或角色身份明顯漂移，修正後再使用；不能靠測試綠燈忽略它。
- [ ] 保存每次**實際完整提示**。`lineage.json` 為固定、無 timestamp 的物件：每個 source id 記錄相對 repo 的 `path`、原 edit target `parentPath`、實際 `promptPath`、`generator: "imagegen"` 及 `transparent`。七個條目 id 必須為 `architectureDesktop`、`architecturePhone`、`warrior`、`mage`、`ranger`、`mimiku`、`groundLight`；parent bytes 的 hash 在 composer 從文件算出。手機 architecture 和 groundLight 的 parent 是 v06。lineage 順序與 prompts 順序固定。 以下資料可產生完整 JSON，再用 `apply_patch` 保存，不使用 shell 寫檔：

```js
const prefix = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/";
const inputs = [
  ["architectureDesktop", "architecture-desktop-v01-source.png", "architecture-solid-wall-v06-source.png", false],
  ["architecturePhone", "architecture-phone-v01-source.png", "architecture-solid-wall-v06-source.png", false],
  ["warrior", "warrior-warm-v01-source.png", "warrior-warming-v02-source.png", true],
  ["mage", "mage-warm-v01-source.png", "mage-map-study-v02-source.png", true],
  ["ranger", "ranger-inward-v01-source.png", "ranger-rest-v01-source.png", true],
  ["mimiku", "mimiku-warm-v01-source.png", "mimiku-rest-v01-source.png", true],
  ["groundLight", "ground-light-v01-source.png", "architecture-solid-wall-v06-source.png", true],
];
const lineage = Object.fromEntries(inputs.map(([id,file,parent,transparent]) => [id,{
  path:prefix+"warm-rest/"+file, parentPath:prefix+"sources/"+parent,
  promptPath:prefix+"warm-rest/"+id+"-v01-prompt.md", generator:"imagegen", transparent,
}]));
console.log(JSON.stringify(lineage,null,2));
```

## Task 4 — 配置兩個初始構圖並寫 deterministic composer

以下初始座標是可微調的 optical 起點，不是新的位置凍結。看真實 source 比例再微調；保持 A 比 B 更緊密、B 前側留白更明顯。寬度固定共享，不能靠縮放改變 A/B。若必須改木箱角度／尺寸，先停下來說明理由並詢問，不能擅改。

**Create:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest.config.mjs`。

- [ ] 用下列完整配置，導入**無副作用**的舊 config，不改它。保留 source lineage 與舊版分離。

```js
import { config as base } from "./landing-war-room.config.mjs";
const source = "samples/derivations/landing-war-room/warm-rest/";
export const config = {
  decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false,
  stage: "rough-composition", wordmarkPlacement: base.wordmarkPlacement,
  wordmarkTone: base.wordmarkTone, references: { ...base.references, wordmark: "samples/landing-war-room/wordmark.png" },
  sources: { ...base.sources,
    architectureDesktop: source + "architecture-desktop-v01-source.png",
    architecturePhone: source + "architecture-phone-v01-source.png",
    warrior: source + "warrior-warm-v01-source.png", mage: source + "mage-warm-v01-source.png",
    ranger: source + "ranger-inward-v01-source.png", mimiku: source + "mimiku-warm-v01-source.png",
    groundLight: source + "ground-light-v01-source.png" },
  lineagePath: source + "lineage.json",
  variants: {
    A: { label: "A — 緊密火邊", description: "小隊較緊密，前側仍留一個可以加入的開口。",
      desktop: { mage: [229,179,105], ranger: [598,175,153], mapCrate: [235,281,113], warrior: [350,196,132], fire: [486,272,103], mimiku: [610,270,123], sign: [742,327,70] },
      phone: { mage: [12,203,88], ranger: [245,222,122], mapCrate: [20,286,79], warrior: [101,235,104], fire: [212,306,75], mimiku: [289,316,95], sign: [308,361,62] },
      visitor: { desktop: [409,380,190,34], phone: [120,386,155,36] } },
    B: { label: "B — 錯落迎接", description: "增加前後錯落，前側地面更寬，伙伴仍屬同一群組。",
      desktop: { mage: [207,178,105], ranger: [641,180,153], mapCrate: [215,278,113], warrior: [344,190,132], fire: [493,272,103], mimiku: [621,276,123], sign: [764,320,70] },
      phone: { mage: [5,201,88], ranger: [254,205,122], mapCrate: [14,284,79], warrior: [98,235,104], fire: [205,289,75], mimiku: [282,296,95], sign: [312,354,62] },
      visitor: { desktop: [396,380,222,35], phone: [107,368,163,54] } },
  },
  secondary: base.layers.filter(l => !["mage","ranger","mapCrate","warrior","fire","mimiku","sign"].includes(l.id)),
  layerOrder: ["mage","ranger","mapCrate","warrior","fire","mimiku","sign"],
};
```

**Create:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-warm-rest.mjs`。

- [ ] 使用下列完整 composer。raw source 不變；alpha threshold 只用於 derived layer。不會繪製新創意圖案、材質或角色，不用 SVG/canvas/Python 取代 ImageGen。不要導入舊 composer。

```js
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { config } from "./landing-warm-rest.config.mjs";
import { renderReview } from "./render-landing-warm-rest.mjs";
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, "../../../../..");
const require = createRequire(path.join(repository, "web/package.json"));
const { PNG } = require("pngjs");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const relative = file => path.relative(repository, file).replaceAll("\\", "/");
async function record(file) {
  const bytes = await readFile(file), png = PNG.sync.read(bytes);
  return { path: relative(file), sha256: hash(bytes), width: png.width, height: png.height };
}
async function save(name, png) {
  const file = path.join(directory, "samples/landing-warm-rest", name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, PNG.sync.write(png));
  return record(file);
}
function crop(png) {
  let x = png.width, y = png.height, right = -1, bottom = -1;
  for (let sy = 0; sy < png.height; sy++) for (let sx = 0; sx < png.width; sx++) {
    if (png.data[(sy * png.width + sx) * 4 + 3] < 200) continue;
    x = Math.min(x,sx); y = Math.min(y,sy); right = Math.max(right,sx); bottom = Math.max(bottom,sy);
  }
  if (right < x) throw Error("Empty opaque source");
  return { x, y, width: right-x+1, height: bottom-y+1 };
}
function resize(png, width, height, bounds = { x:0, y:0, width:png.width, height:png.height }, layer) {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = bounds.x + Math.min(bounds.width-1, Math.floor(x*bounds.width/width));
    const sy = bounds.y + Math.min(bounds.height-1, Math.floor(y*bounds.height/height));
    const si = (sy*png.width+sx)*4, di = (y*width+x)*4;
    if (layer && png.data[si+3] < 200) continue;
    out.data.set(layer?.monochrome ?? png.data.subarray(si,si+3),di);
    out.data[di+3] = layer ? Math.round(255*(layer.opacity ?? 1)) : png.data[si+3];
  }
  return out;
}
function over(canvas,sprite,x,y) {
  if (x < 0 || y < 0 || x+sprite.width > canvas.width || y+sprite.height > canvas.height) throw Error("Clipped sprite");
  for (let sy = 0; sy < sprite.height; sy++) for (let sx = 0; sx < sprite.width; sx++) {
    const si = (sy*sprite.width+sx)*4, di = ((y+sy)*canvas.width+x+sx)*4, a = sprite.data[si+3]/255;
    if (!a) continue;
    for (let c = 0; c < 3; c++) canvas.data[di+c] = Math.round(sprite.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3] = 255;
  }
}
function grayscale(png) {
  const out = new PNG({ width:png.width, height:png.height });
  for (let i = 0; i < png.data.length; i+=4) {
    const value = Math.round((2126*png.data[i]+7152*png.data[i+1]+722*png.data[i+2])/10000);
    out.data.set([value,value,value,png.data[i+3]],i);
  }
  return out;
}
const sources = {}, references = {}, rasters = {}, parents = {}, prompts = [];
for (const [id, file] of Object.entries(config.sources)) {
  sources[id] = await record(path.join(directory,file));
  rasters[id] = PNG.sync.read(await readFile(path.join(directory,file)));
}
for (const [id,file] of Object.entries(config.references)) references[id] = await record(path.join(directory,file));
const lineageBytes = await readFile(path.join(directory,config.lineagePath));
const lineage = JSON.parse(lineageBytes);
for (const [id,item] of Object.entries(lineage)) {
  if (item.path !== sources[id].path || item.generator !== "imagegen") throw Error("Invalid source lineage: "+id);
  parents[id] = await record(path.join(repository,item.parentPath));
  const bytes = await readFile(path.join(repository,item.promptPath));
  prompts.push({ path:item.promptPath, sha256:hash(bytes) });
}
const frames = {};
for (const [variant,layout] of Object.entries(config.variants)) for (const view of ["desktop","phone"]) {
  const size = view === "desktop" ? [960,540] : [390,600];
  const key = `${variant}-${view}`;
  const architecture = rasters[view === "desktop" ? "architectureDesktop" : "architecturePhone"];
  const ratio = size[0]/size[1];
  const aw = architecture.width/architecture.height > ratio ? Math.round(architecture.height*ratio) : architecture.width;
  const ah = architecture.width/architecture.height > ratio ? architecture.height : Math.round(architecture.width/ratio);
  const bounds = { x:Math.floor((architecture.width-aw)/2), y:Math.floor((architecture.height-ah)/2), width:aw, height:ah };
  const canvas = resize(architecture,...size,bounds);
  for (let i = 3; i < canvas.data.length; i+=4) canvas.data[i] = 255;
  const layers = [];
  const [fx,fy] = layout[view].fire;
  const groundLight = { id:"groundLight", [view]:view === "desktop" ? [fx-112,fy+54,326] : [fx-80,fy+40,215] };
  const list = [...config.secondary, groundLight, ...config.layerOrder.map(id => ({ id, [view]:layout[view][id] }))];
  for (const layer of list) {
    if (!layer[view]) continue;
    const [x,y,width] = layer[view], bounds = crop(rasters[layer.id]);
    const height = Math.round(width*bounds.height/bounds.width);
    const sprite = resize(rasters[layer.id],width,height,bounds,layer);
    over(canvas,sprite,x,y);
    layers.push({ id:layer.id, x, y, ...await save(`layers/${key}/${layer.id}.png`,sprite) });
  }
  const colorPng = view === "desktop" ? resize(canvas,1920,1080) : canvas;
  frames[key] = {
    logical:await save(`${key}-logical.png`,canvas), color:await save(`${key}.png`,colorPng),
    gray:await save(`${key}-gray.png`,grayscale(colorPng)), layers, visitor:layout.visitor[view],
  };
}
const manifest = {
  ...config, sources, references, parents, prompts, frames,
  lineage:{ path:relative(path.join(directory,config.lineagePath)), sha256:hash(lineageBytes), entries:lineage },
  spec:"docs/superpowers/specs/2026-10-08-landing-warm-rest-composition-design.md",
};
await writeFile(path.join(directory,"landing-warm-rest.manifest.json"),JSON.stringify(manifest,null,2)+"\n");
const previousPage = await readFile(path.join(directory,"landing-war-room-review.html"),"utf8");
await writeFile(path.join(directory,"landing-warm-rest-review.html"),renderReview(manifest,previousPage));
console.log(JSON.stringify(Object.fromEntries(Object.entries(frames).map(([key,f]) => [key,f.color])),null,2));
```

## Task 5 — live UI 比較頁：先寫 browser contract 再實作 renderer

**Create:** `web/e2e/landing-warm-rest.playwright.config.ts`。

- [ ] 只宣告 review projects，不啟動或修改產品 server：

```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "landing-warm-rest-review.spec.ts", workers: 1,
  timeout: 60_000,
  projects: [
    { name: "phone-small", use: { viewport: { width: 320, height: 568 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
```

**Create:** `web/e2e/landing-warm-rest-review.spec.ts`。

- [ ] 加入下列完整測試。瀏覽器路徑嚴格限定在 review root，路徑不合法 403、不存在 404；不能讀取 `.codex-remote-attachments/` 或 `reference/`。

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
const root = path.resolve(process.cwd(), "..", "docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
test("two warm-rest drafts load with live UI and safe ground", async ({ page }, info) => {
  await page.route("https://warm-rest-review.local/**", async route => {
    const file = path.resolve(root,decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/,""));
    if (!file.startsWith(root+path.sep)) { await route.fulfill({ status:403,body:"Forbidden" }); return; }
    try { await route.fulfill({ body:await readFile(file),contentType:file.endsWith(".html") ? "text/html; charset=utf-8" : "image/png" }); }
    catch { await route.fulfill({ status:404,body:"Not found" }); }
  });
  await page.goto("https://warm-rest-review.local/landing-warm-rest-review.html");
  await expect(page.getByRole("heading",{ level:1 })).toHaveText("Landing 暖火休息處 — 構圖比較");
  await expect(page.locator("[data-variant]")).toHaveCount(2);
  await expect(page.locator("[data-chapter]")).toHaveCount(4);
  await expect(page.getByText("awaiting-calibration",{ exact:false }).first()).toBeVisible();
  await page.locator("img").evaluateAll(async images => {
    await Promise.all(images.map(i => (i as HTMLImageElement).decode()));
    if (images.some(i => !(i as HTMLImageElement).naturalWidth)) throw Error("Missing image");
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const m = JSON.parse(await readFile(path.join(root,"landing-warm-rest.manifest.json"),"utf8"));
  for (const scene of await page.locator(".scene").all()) {
    const phone = await scene.evaluate(e => e.classList.contains("phone") || matchMedia("(max-width:600px)").matches);
    const variant = await scene.getAttribute("data-id");
    const frame = m.frames[`${variant}-${phone ? "phone" : "desktop"}`];
    const image = (await scene.locator(":scope > picture > img, :scope > img").boundingBox())!;
    const dialogue = (await scene.locator(".dialogue").boundingBox())!;
    const logo = scene.locator(".overlay:visible .logo");
    await expect(logo).toBeVisible();
    const tone = await logo.evaluate(e => getComputedStyle(e).filter);
    expect(tone).toContain("brightness(0.82)"); expect(tone).toContain("saturate(0.72)");
    for (const layer of frame.layers.filter((l: { id:string }) => ["mage","warrior","ranger","mimiku","fire","mapCrate","sign"].includes(l.id))) {
      expect(image.y+(layer.y+layer.height)/frame.logical.height*image.height).toBeLessThan(dialogue.y);
    }
    const join = (await scene.locator(".visitor-region:visible").boundingBox())!;
    expect(join.y+join.height).toBeLessThan(dialogue.y);
    for (const sign of await scene.locator(".sign-label:visible").all()) expect((await sign.boundingBox())!.y+(await sign.boundingBox())!.height).toBeLessThan(dialogue.y);
    const text = scene.locator(".dialogue p");
    expect(await text.evaluate(e => {
      const range = document.createRange(); range.selectNodeContents(e);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      const value = selection.toString(); selection.removeAllRanges(); return value;
    })).toBe("先在火邊歇一會兒。下一段冒險，我陪你。");
    const panel = await scene.locator(".dialogue").evaluate(e => ({ h:e.clientHeight, scroll:e.scrollHeight }));
    expect(panel.scroll).toBeLessThanOrEqual(panel.h);
    await expect(scene.locator(".cta")).toBeVisible();
    await scene.screenshot({ path:info.outputPath(`${variant}-${phone ? "phone" : "desktop"}-${await scene.getAttribute("data-view")}.png`) });
  }
});
```

- [ ] cwd `web/`：`npx playwright test --config=e2e/landing-warm-rest.playwright.config.ts`。在新頁不存在時，四個 projects 預期因找不到新 heading 而失敗；不能拿舊 review 頁代替新頁讓測試通過。

**Create:** `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-warm-rest.mjs`。

- [ ] 建立以下完整 renderer。舊日誌 markup 共用一次；A/B 字標 tone、UI、secondary source 一致。desktop 在窄屏用 phone picture，而無 UI 的 desktop／灰階預覽仍可另外看，避免 320px 強塞桌機對話框。

```js
export function renderReview(m,previousPage) {
  const rel = asset => asset.path.split("2026-09-18-page-visual-phase-1/")[1];
  const percent = (x,denominator) => x/denominator*100+"%";
  const style = (rect,size) => `left:${percent(rect[0],size.width)};top:${percent(rect[1],size.height)};width:${percent(rect[2],size.width)};height:${percent(rect[3],size.height)}`;
  function overlay(id,view,cls) {
    const f = m.frames[`${id}-${view}`], size = f.logical;
    const [x,y,w] = m.wordmarkPlacement[view];
    const sign = f.layers.find(l => l.id === "sign");
    return `<div class="overlay ${cls}"><img class="logo" src="${rel(m.references.wordmark)}" alt="MIMIC" style="left:${percent(x,size.width)};top:${percent(y,size.height)};width:${percent(w,size.width)}"><a class="sign-label" href="#journal" style="${style([sign.x+sign.width*.16,sign.y+sign.height*.17,sign.width*.7,sign.height*.48],size)}">開始<br>冒險</a><span class="visitor-region" aria-hidden="true" style="${style(f.visitor,size)}"></span></div>`;
  }
  function scene(id,phone=false) {
    return `<div class="scene ${phone ? "phone" : "responsive"}" data-id="${id}" data-view="${phone ? "phone" : "responsive"}">${phone ? `<img src="${rel(m.frames[id+"-phone"].color)}" width="390" height="600" alt="${id} 手機構圖">` : `<picture><source media="(max-width:600px)" srcset="${rel(m.frames[id+"-phone"].color)}"><img src="${rel(m.frames[id+"-desktop"].color)}" width="1920" height="1080" alt="${id} 暖火休息處構圖"></picture>`}${phone ? overlay(id,"phone","phone-overlay") : overlay(id,"desktop","desktop-overlay")+overlay(id,"phone","mobile-overlay")}<a class="login" href="#review-notes">登入</a><div class="dialogue"><div><span class="speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="cta" href="#journal">開始冒險 ↓</a></div></div>`;
  }
  const journalStart = previousPage.indexOf('<div class="journal" id="journal">');
  const journalEnd = previousPage.indexOf('</section>',journalStart);
  if (journalStart < 0 || journalEnd < 0) throw Error("Missing existing journal markup");
  const journal = previousPage.slice(journalStart,journalEnd);
  if ((journal.match(/data-chapter/g) ?? []).length !== 4) throw Error("Journal must preserve four chapters");
  const outputs = Object.entries(m.frames).flatMap(([id,f]) => [[id+" logical",f.logical],[id+" color",f.color],[id+" gray",f.gray]]);
  const hashRows = [...Object.entries(m.sources),...outputs].map(([id,a]) => `<tr><td>${id}<br>${a.width} × ${a.height}</td><td><code>${a.sha256}</code></td></tr>`).join("");
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing 暖火休息處 — 構圖比較</title><style>
*{box-sizing:border-box}body{margin:0;background:#211b18;color:#ecd9b7;font:15px/1.6 system-ui,"Microsoft JhengHei",sans-serif}main{max-width:1440px;margin:auto;padding:24px}a{color:inherit}a:focus-visible{outline:3px solid #eabc62;outline-offset:3px}h1{font-size:clamp(22px,3vw,34px)}h2{margin-top:32px}.status,.notes{padding:12px;background:#30271f}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,390px);gap:20px;align-items:start}.scene{position:relative;container-type:inline-size;overflow:hidden;background:#30231b;border:2px solid #6c5036}.scene>img,.scene picture>img{display:block;width:100%;height:auto;image-rendering:pixelated}.phone{max-width:390px;width:100%;margin:auto}.overlay{position:absolute;inset:0;pointer-events:none}.overlay>*{position:absolute}.logo{height:auto;image-rendering:pixelated;filter:brightness(${m.wordmarkTone.brightness}) saturate(${m.wordmarkTone.saturation}) drop-shadow(1px 1px 0 #241a18)}.mobile-overlay{display:none}.sign-label{pointer-events:auto;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-weight:800;font-size:1.12cqw;line-height:1.15;color:#ffe8ac;text-shadow:1px 1px #3e2316}.phone-overlay .sign-label{font-size:3.3cqw}.visitor-region{pointer-events:none}.login{position:absolute;right:3%;top:4%;padding:3px 10px;background:#211a17d9;border:1px solid #a78953;text-decoration:none}.dialogue{position:absolute;left:2%;right:2%;bottom:3%;height:19%;padding:10px 16px;border:2px solid #b79556;background:#211a18f2;display:flex;align-items:center;justify-content:space-between;gap:12px}.speaker{color:#efc56c;font-weight:700}.dialogue p{margin:3px 0;font-size:clamp(12px,1.6cqw,18px);line-height:1.35}.cta{display:inline-block;white-space:nowrap;padding:7px 12px;border:2px solid #f0ce80;background:#b68137;color:#211a18;font-weight:800;text-decoration:none}.phone .dialogue{bottom:2%;height:26%;padding:8px;display:block}.phone .speaker{font-size:11px;line-height:1.3}.phone .dialogue p{font-size:12px}.phone .cta{margin-top:4px;font-size:12px;padding:4px 10px}.raws,.refs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.raws img{width:100%;height:auto;image-rendering:pixelated}.refs{grid-template-columns:repeat(4,minmax(0,1fr))}.refs figure{margin:0;text-align:center}.refs img{max-width:100%;width:128px;image-rendering:pixelated}code{overflow-wrap:anywhere;font-size:12px}table{table-layout:fixed;width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #685440;vertical-align:top}td:first-child{width:25%}.journal{margin-top:32px;padding:clamp(16px,4vw,56px);background:#e5cc9e;color:#3a2a20}.journal-intro,.closing{display:flex;gap:16px;align-items:center}.journal-intro img,.closing img{width:76px;image-rendering:pixelated}.chapter{display:grid;grid-template-columns:100px minmax(0,1fr);gap:24px;padding:24px 0;border-bottom:1px solid #a68a64}.chapter img{width:100%;height:110px;object-fit:contain;image-rendering:pixelated}.journal footer,.closing{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px}
@media(max-width:900px){.pair{grid-template-columns:1fr}}@media(max-width:600px){main{padding:12px}.desktop-overlay{display:none}.mobile-overlay{display:block}.responsive .sign-label{font-size:3.3cqw}.responsive .dialogue{bottom:2%;height:26%;padding:8px;display:block}.responsive .speaker{font-size:11px;line-height:1.3}.responsive .dialogue p{font-size:12px}.responsive .cta{margin-top:4px;font-size:12px;padding:4px 10px}.raws,.refs{grid-template-columns:repeat(2,minmax(0,1fr))}.chapter{grid-template-columns:65px minmax(0,1fr);gap:16px}.chapter img{height:80px}.login{font-size:12px}}
</style></head><body><main><h1>Landing 暖火休息處 — 構圖比較</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false · 粗略構圖，尚未精修或核准</p><p>這次只比較小隊緊密程度、前後錯落與可加入的前側地面。角色身份、木箱尺寸、字標與 UI 相同。B 結合／第三 C 亮度字標方向已保留，尚待另輪整合；這不是字標選擇。</p><p><a href="landing-war-room-review.html">保留的 v04 審核頁</a></p>
${Object.entries(m.variants).map(([id,v]) => `<section data-variant="${id}"><h2>${v.label}</h2><p>${v.description}</p><div class="pair"><div><p>首屏（窄屏使用獨立手機構圖）</p>${scene(id)}</div><div><p>固定手機比對</p>${scene(id,true)}</div></div><details><summary>桌機原圖、桌機灰階、手機灰階</summary><div class="raws"><img src="${rel(m.frames[id+"-desktop"].color)}" alt="${id} 桌機原圖"><img src="${rel(m.frames[id+"-desktop"].gray)}" alt="${id} 桌機灰階"><img src="${rel(m.frames[id+"-phone"].gray)}" alt="${id} 手機灰階"></div></details></section>`).join("")}
<h2>已核准身份與顆粒參照</h2><div class="refs">${["warrior","mage","ranger","mimiku"].map(id => `<figure><img src="${rel(m.references[id])}" alt="${id} master"><figcaption>${id}</figcaption></figure>`).join("")}</div>
${journal}<section class="notes" id="review-notes"><h2>本輪判斷</h2><ol><li>第一眼是有人陪伴的暖火，不是洞口、字標或單張角色。</li><li>地面連續，小隊共享鏡頭與火光；戰士暖手、法師看圖、遊俠朝內。</li><li>前側有實際可加入的地面，且不被對話框遮住。</li><li>人物、地圖、木牌與火圈清楚；沒有漂浮、相切或過粗像素。</li><li>手機與桌機都成立。灰階、hash 與測試不能替代你的視覺判斷。</li></ol><p>本頁登入／CTA 只示範 live 入口及日誌閱讀，不連接認證或互動。既有三種帳務語意不變；沒有 Scenes approval 或 runtime promotion。</p></section><details><summary>exact SHA-256</summary><table><tbody>${hashRows}</tbody></table></details></main></body></html>\n`;
}
```

- [ ] root：`node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-warm-rest.mjs`。預期寫出四個 color、四個 logical、四個 gray、四組透明 layers、manifest 與新頁；console 列四張 color 的 exact hashes。
- [ ] architecture 以等比例 cover 整理，只裁自己的畫布邊緣，不拉伸。手機 source 是獨立直幅來源，絕不由 desktop 裁切產生。若自動整理裁掉入口、完整後牆或必要安全留白，用 ImageGen 修正 framing，不接受幾何變形。
- [ ] cwd `web/`：重跑 Task 2 Vitest 與本 task Playwright，預期 4 tests／4 projects 通過。source 坐姿比例改變導致 clipping／實際 alpha overlap 時，先調整新配置或以 ImageGen 修正；不可放寬測試掩蓋重要遮擋。

## Task 6 — 目視修正、重跑證據、devlog、停止

- [ ] 用實際新頁 screenshot／`view_image` 檢查每個 A/B 的桌機、手機、灰階，與 approved masters 同屏比較。測試頂端 70% 只保護粗略上半身，不等同語意證明；另目視檢查暖手、讀圖、腳／坐姿接地、法杖落點。若關鍵手勢在下方，增補針對此區域的 failing actual-alpha assertion 後再修正，不能刪原測試。合理下半身重疊不要求全場零重疊。
- [ ] 新配置可調整位置、secondary 對比；不改地圖尺寸／角度、火源造型／身份／UI。必要共享光線或人物鏡頭修正必須再用 ImageGen，保存新版本與實際 prompt。架構地面也必須由 ImageGen，而不是程序畫假地面。
- [ ] cwd `web/`，執行以下完整 focused verification。歷史管線不應回歸；若歷史檢查本來失敗，單獨記錄基線，不把無關測試刪掉或歸罪於此輪。

```powershell
npm test -- src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts
npx eslint src/shared/brand/landing-warm-rest-composition.test.ts e2e/landing-warm-rest-review.spec.ts e2e/landing-warm-rest.playwright.config.ts
npx eslint --config e2e/landing-warm-rest.eslint.config.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest.config.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-warm-rest.mjs ../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-landing-warm-rest.mjs
npm run typecheck
npx playwright test --config=e2e/landing-warm-rest.playwright.config.ts
```

預期所有執行項 exit 0；外部 review `.mjs` 不能以 ignored warning 冒充 lint。新增 `web/e2e/landing-warm-rest.eslint.config.mjs` 如下，不改產品設定：

```js
export default [{ files:["**/*.mjs"], languageOptions:{ ecmaVersion:2022, sourceType:"module" }, rules:{ "no-unreachable":"error", "no-constant-condition":"error", "no-dupe-keys":"error", "constructor-super":"error", "valid-typeof":"error" } }];
```

- [ ] 在 root 執行兩次 composer，並用下面同進程 read-compare 驗證 deterministic bytes：

```powershell
node -e 'const cp=require("node:child_process"),fs=require("node:fs"),p="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",script=p+"compose-landing-warm-rest.mjs";const run=()=>cp.execFileSync(process.execPath,[script],{stdio:"inherit"});const snapshot=()=>{const m=JSON.parse(fs.readFileSync(p+"landing-warm-rest.manifest.json"));return [p+"landing-warm-rest.manifest.json",p+"landing-warm-rest-review.html",...Object.values(m.frames).flatMap(f=>[f.logical.path,f.color.path,f.gray.path,...f.layers.map(l=>l.path)])].map(file=>[file,fs.readFileSync(file)]);};run();const before=snapshot();run();const after=snapshot();if(before.length!==after.length||before.some(([f,b],i)=>f!==after[i][0]||!b.equals(after[i][1])))throw Error("Non-deterministic artifacts");console.log("PASS: all review artifacts are byte-identical");'
```

- [ ] 依 AGENTS 在 `.agents/devlog.md` append 一筆：Task、Scope、What changed、Decisions、Known gaps；明列兩個粗略構圖待選、字標／精修未完成、沒有 runtime 改動。不暫存 devlog 或任何既有 dirty 文件。
- [ ] 使用 `self-review`：審查本輪新配置、合成、renderer、tests、prompt／lineage、目視圖稿及 devlog 增量。檢查七面向，修正 critical／important 後反覆檢查；重跑所有受影響驗證。
- [ ] 使用 `superpowers:verification-before-completion`。root 對 devlog 執行 `git diff --check -- .agents/devlog.md`。以下 root PowerShell 逐一檢查新文字檔，預期無空白錯誤輸出。`--no-index` 在新檔有差異時可能 exit 1，必須同時檢查實際輸出；只容許 Git 的 LF→CRLF 提醒，其他內容或 exit > 1 均調查：

```powershell
$reviewPath = 'docs/design/assets/reviews/2026-09-18-page-visual-phase-1'
$checkPaths = @(
  "$reviewPath/landing-warm-rest.config.mjs", "$reviewPath/compose-landing-warm-rest.mjs",
  "$reviewPath/render-landing-warm-rest.mjs", "$reviewPath/landing-warm-rest.manifest.json",
  "$reviewPath/landing-warm-rest-review.html", 'web/src/shared/brand/landing-warm-rest-composition.test.ts',
  'web/e2e/landing-warm-rest-review.spec.ts', 'web/e2e/landing-warm-rest.playwright.config.ts',
  'web/e2e/landing-warm-rest.eslint.config.mjs'
)
$checkPaths += Get-ChildItem -LiteralPath "$reviewPath/samples/derivations/landing-war-room/warm-rest" -File | Where-Object { $_.Extension -in '.md', '.json' } | ForEach-Object { $_.FullName }
foreach ($checkPath in $checkPaths) {
  $checkOutput = & git diff --no-index --check -- NUL $checkPath 2>&1
  $checkExit = $LASTEXITCODE
  $checkErrors = @($checkOutput | Where-Object { $_.ToString() -notmatch "^warning: in the working copy of .*LF will be replaced by CRLF" })
  if ($checkExit -gt 1 -or $checkErrors.Count) { $checkErrors; throw "Whitespace verification failed: $checkPath" }
}
```

- [ ] 複核現有 staged diff／index 與 Task 1 完全相同，原 tracked diff 除 devlog append 外完全相同；舊 untracked review 文件及 PNG 用 Task 1 保存的逐文件 hashes 比較，不能只以 tracked diff 證明其未改。
- [ ] 用 `git status --short -- web/public web/src/app web/src/features web/src/shared/brand/asset-registry.ts web/public/manifest.webmanifest` 與基線比較，並完整列出本輪變動；registry 實際路徑應從既有清單確認，不以某個不存在文件的空輸出證明邊界。對 `web/src` 做逐文件基線比較，只允許新測試；`web/public` 及所有實際 manifest/SW 路徑保持基線。`.codex-remote-attachments/` 與 `reference/` 不讀內容、不修改，`git diff --cached --name-only -- .codex-remote-attachments reference` 必須為空。
- [ ] 保存 Playwright 實際 screenshots 到新 `samples/landing-warm-rest/previews/`，不覆寫舊 previews。在 Codex 打開 `D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-warm-rest-review.html`，若返回 queued，明確說明而不聲稱使用者已經看到。必要時直接內嵌 A/B 桌機和手機截圖，避免只給無法打開的 localhost URL。
- [ ] 最終交付四張 color、四張 gray 的 exact SHA-256、focused verification 輸出摘要、自我審查結果、剩餘視觉限制，並問使用者選擇 A／B 或指出布局調整。停止；不继續精修、字標整合、runtime promotion、Home 或 Phase 2，不把測試通過當成視觉核准。

## 規格覆蓋與 review 判斷

| 修訂章節 | 此計畫的落點 |
| --- | --- |
| 1 邊界／歷史保留 | 新命名管線、Task 1 與 Task 6 基線比較 |
| 2 共同焦點／開口群組 | 共用角色素材、A/B 配置、Task 6 實際縮圖判斷 |
| 3 共同鏡頭／連續地面 | Task 3 architecture 與角色 ImageGen、desktop/phone 獨立 architecture |
| 4 角色／木箱／遮擋 | Task 3 姿態、Task 4 固定尺寸、Task 2 actual-alpha contracts＋目視手勢 |
| 5 暖光／細節主次 | Task 3 directional sprites、低對比 architecture、Task 6 灰階檢查 |
| 6 字標／live UI／手機 | 相同 v08 overlay、明示未整合 B/C、Task 5 browser contract、保留日誌 |
| 7 粗略構圖 checkpoint | A/B 桌機／手機／灰階，Task 6 停止待使用者選擇 |
| 8 保護範圍 | 不 stage artifacts、devlog 最小 append、runtime/public 與 protected index 比較 |
| 9 研究依據 | 延續已核對規格的判斷方法，不額外抄入遊戲圖像或風格 |

**執行 handoff：** Inline 已選，不再提供 Subagent-Driven 選項。計畫交付後等待開始指示；執行時一律使用 `superpowers:executing-plans`，到第一個粗略構圖視覺 checkpoint 即停。
