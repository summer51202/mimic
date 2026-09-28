# Event and Status Icon Family Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce nine review-only Event / Status icon directions with deterministic 192 × 192 masters, true 48 × 48 optical exports, grayscale evidence, exact hashes, and a responsive visual checkpoint.

**Architecture:** ImageGen creates one transparent source image per approved semantic direction, using the approved Icons calibration and record-expense Action as style references. A small metadata module defines the family, while a deterministic Node/pngjs composer trims, centers, normalizes, downsamples, hashes, and renders the static review page. Independent Vitest and Playwright contracts verify the raster, accessibility, responsive, and no-runtime-promotion boundaries.

**Tech Stack:** ImageGen, Node.js ESM, `pngjs`, Vitest, Playwright, static HTML/CSS.

---

## File map

- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.config.mjs` — canonical metadata and semantic copy for all nine directions.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-event-status-icons.mjs` — deterministic raster normalization, optical export, hashing, and review-page renderer.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/*.png` — ImageGen source images, one per direction.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/event-status/*.png` — normalized 192 × 192 review masters.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/event-status/optical-48/*.png` — actual 48 × 48 nearest-neighbor optical exports.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.manifest.json` — exact dimensions and SHA-256 values generated from the outputs.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons-review.html` — responsive human-review checkpoint.
- Create `web/src/shared/brand/event-status-icon-calibration.test.ts` — deterministic raster and review-contract tests isolated from the already-dirty gate test.
- Create `web/e2e/event-status-icon-review.spec.ts` — four-viewport layout, image decode, labeling, and overflow checks.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md` — append the approved Event / Status semantics under Icons.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md` — record that artwork is presented and awaiting exact-hash approval; do not approve the whole Icons family.
- Modify `.agents/devlog.md` — record implementation and the remaining approval gate.

Runtime paths under `web/public`, product pages, the asset registry, the PWA manifest, and the service worker remain untouched.

### Task 1: Lock the review contract with a failing test

**Files:**
- Create: `web/src/shared/brand/event-status-icon-calibration.test.ts`

- [ ] **Step 1: Write the failing raster and review contract**

```ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const reviewDirectory = path.resolve(
  process.cwd(),
  "..",
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);
const manifestPath = path.join(
  reviewDirectory,
  "event-status-icons.manifest.json",
);
const reviewPath = path.join(
  reviewDirectory,
  "event-status-icons-review.html",
);

const expectedIds = [
  "event-expense",
  "event-contribution",
  "event-reimbursement",
  "event-shortfall",
  "event-return",
  "event-settlement",
  "event-correction",
  "status-lock",
  "status-offline",
] as const;

interface ManifestEntry {
  id: string;
  source: string;
  master: { path: string; width: number; height: number; sha256: string };
  optical48: { path: string; width: number; height: number; sha256: string };
}

describe("event and status icon calibration", () => {
  it("publishes exactly nine deterministic review-only raster directions", async () => {
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as { decision: string; icons: ManifestEntry[] };

    expect(manifest.decision).toBe("awaiting-calibration");
    expect(manifest.icons.map(({ id }) => id)).toEqual(expectedIds);

    for (const entry of manifest.icons) {
      expect(entry.source.replaceAll("\\", "/")).toMatch(
        /^docs\/design\/assets\/reviews\//,
      );
      expect(entry.master.path.replaceAll("\\", "/")).not.toMatch(
        /^web\/public\//,
      );

      const masterBytes = await readFile(
        path.resolve(process.cwd(), "..", entry.master.path),
      );
      const master = PNG.sync.read(masterBytes);
      expect([master.width, master.height]).toEqual([192, 192]);
      expect(entry.master).toMatchObject({ width: 192, height: 192 });
      expect(createHash("sha256").update(masterBytes).digest("hex")).toBe(
        entry.master.sha256,
      );
      expect(hasTransparentPixel(master)).toBe(true);
      expect(hasNonzeroTransparentPixel(master)).toBe(false);

      const bounds = findOpaqueBounds(master, 16);
      expect(Math.max(bounds.width, bounds.height)).toBeGreaterThanOrEqual(134);
      expect(Math.max(bounds.width, bounds.height)).toBeLessThanOrEqual(154);

      const opticalBytes = await readFile(
        path.resolve(process.cwd(), "..", entry.optical48.path),
      );
      const optical = PNG.sync.read(opticalBytes);
      expect([optical.width, optical.height]).toEqual([48, 48]);
      expect(entry.optical48).toMatchObject({ width: 48, height: 48 });
      expect(createHash("sha256").update(opticalBytes).digest("hex")).toBe(
        entry.optical48.sha256,
      );
      expect(hasNonzeroTransparentPixel(optical)).toBe(false);
    }
  });

  it("keeps live labels, grayscale evidence, controls, and the open gate visible", async () => {
    const html = await readFile(reviewPath, "utf8");

    for (const id of expectedIds) {
      expect(html).toContain(`data-icon="${id}"`);
    }
    expect(html.match(/data-preview-size="48"/g)).toHaveLength(9);
    expect(html.match(/data-grayscale-preview/g)).toHaveLength(9);
    expect(html).toContain("samples/icons-calibration.png");
    expect(html).toContain(
      "samples/record-expense-action/record-expense-action-v01.png",
    );
    expect(html).toContain("Icons family remains awaiting calibration");
    expect(html).toContain("Live-HTML boundary");
    expect(html).toContain("no runtime asset changes");
  });
});

function hasTransparentPixel(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}

function hasNonzeroTransparentPixel(png: PNG): boolean {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (
      png.data[offset + 3] === 0 &&
      (png.data[offset] !== 0 ||
        png.data[offset + 1] !== 0 ||
        png.data[offset + 2] !== 0)
    ) return true;
  }
  return false;
}

function findOpaqueBounds(png: PNG, alphaThreshold: number) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Icon has no visible pixels");
  return { width: right - left + 1, height: bottom - top + 1 };
}
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run from `web/`:

```powershell
npm test -- --run src/shared/brand/event-status-icon-calibration.test.ts
```

Expected: FAIL with `ENOENT` for `event-status-icons.manifest.json`; no unrelated test failure.

### Task 2: Define the nine-icon metadata contract

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.config.mjs`

- [ ] **Step 1: Add the complete configuration**

```js
export const eventStatusIcons = [
  {
    id: "event-expense",
    label: "支出",
    objects: "已付款支出單＋外側硬幣",
    alt: "一張已付款支出單，硬幣位於紙張下緣外側",
    boundary: "已完成的支出事實；不是正在記帳的操作",
  },
  {
    id: "event-contribution",
    label: "投入共同基金",
    objects: "硬幣進入共同錢袋",
    alt: "一枚硬幣部分進入共同錢袋的袋口",
    boundary: "以重疊表達投入；不使用箭頭",
  },
  {
    id: "event-reimbursement",
    label: "代墊報銷",
    objects: "報銷單＋返還硬幣",
    alt: "一張報銷單旁有一枚返還的硬幣",
    boundary: "必須保留單據；不可看成共同基金餘額返還",
  },
  {
    id: "event-shortfall",
    label: "共同基金不足",
    objects: "空且有裂痕的錢袋＋最後一枚硬幣",
    alt: "空的裂痕錢袋旁只剩一枚硬幣",
    boundary: "表示可用資金不足；不是資料錯誤或刪除",
  },
  {
    id: "event-return",
    label: "共同基金返還",
    objects: "向外傾斜的共同錢袋＋袋外硬幣",
    alt: "共同錢袋向外傾斜，一枚硬幣已在袋口外",
    boundary: "不含單據；不可看成代墊報銷",
  },
  {
    id: "event-settlement",
    label: "共享結算",
    objects: "平衡秤＋兩疊硬幣",
    alt: "平衡秤兩側各有一疊不同的硬幣",
    boundary: "表示共享部位經轉帳結清；不是全域餘額",
  },
  {
    id: "event-correction",
    label: "後期更正",
    objects: "完整舊帳頁＋旁釘的新附頁",
    alt: "完整舊帳頁旁固定一張新的更正附頁",
    boundary: "舊紀錄仍完整可見；不是塗改或重開已結算期間",
  },
  {
    id: "status-lock",
    label: "期間鎖定",
    objects: "黃銅掛鎖扣住期間帳頁",
    alt: "厚重黃銅掛鎖扣住一張期間帳頁",
    boundary: "表示不可變更；不是刪除、封存或權限不足",
  },
  {
    id: "status-offline",
    label: "離線",
    objects: "熄滅的訊號燈＋中斷訊號",
    alt: "熄滅的訊號燈旁有中斷的訊號刻痕",
    boundary: "表示無法權威送出；不表示草稿遺失或永久失敗",
  },
];
```

- [ ] **Step 2: Run a metadata count check**

Run from the repository root:

```powershell
node -e "import('./docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.config.mjs').then(({eventStatusIcons}) => { if (eventStatusIcons.length !== 9 || new Set(eventStatusIcons.map(x => x.id)).size !== 9) process.exit(1); console.log(eventStatusIcons.map(x => x.id).join('\n')); })"
```

Expected: the nine unique IDs print in the approved order.

### Task 3: Generate nine transparent source directions with ImageGen

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-expense-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-contribution-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-reimbursement-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-shortfall-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-return-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-settlement-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/event-correction-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/status-lock-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status/status-offline-source.png`

Use these two references in every ImageGen call:

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png`

Every prompt begins with this shared art direction:

```text
Create one isolated transparent-background icon source for the Mimiku financial-space PWA. Match the references' hand-drawn pixel-RPG language: deep brown-black stepped outline, warm parchment, restrained clean brass/gold, tiny muted-teal accents only where useful, two-to-three-step material ramps, broken highlights, deliberate pixel clusters, slight crafted asymmetry, and no smooth vector curves or glossy mobile-game rendering. Center one bold silhouette with generous transparent breathing room. Use at most three objects. No letters, numbers, currency marks, plus/minus signs, arrows, UI frame, scenic base, drop shadow, or baked label.
```

- [ ] **Step 1: Generate `event-expense-source.png`**

Append:

```text
Depict a completed paid expense fact: one loose paid expense slip and one spent coin clearly outside the lower edge. No quill, pen, journal, receipt stack, hand, or active-writing pose. The paper is the primary silhouette and the coin is subordinate.
```

- [ ] **Step 2: Generate `event-contribution-source.png`**

Append:

```text
Depict contribution into a pooled fund: one upright common money pouch with one coin above it, partially crossing into the open mouth. Direction must read only through posture and overlap. Do not use a wallet, hand, receipt, motion trail, or arrow.
```

- [ ] **Step 3: Generate `event-reimbursement-source.png`**

Append:

```text
Depict repayment of a participant advance: one clear reimbursement slip beside one returned coin. The slip must remain an independent readable object at small size. Do not use a pouch, wallet, balance scale, arrow, or active-writing tool.
```

- [ ] **Step 4: Generate `event-shortfall-source.png`**

Append:

```text
Depict insufficient pooled funds: one visibly empty common money pouch with a restrained structural crack and exactly one remaining coin. Keep the silhouette readable and concerned but not catastrophic. No warning triangle, error cross, red alarm, skull, or deletion symbol.
```

- [ ] **Step 5: Generate `event-return-source.png`**

Append:

```text
Depict an explicit pooled-fund return: one common money pouch tilted outward with one coin visibly beyond its open mouth. Direction must read through the tilted pouch and separated coin. Do not include a slip, hand, arrow, wallet, or equal-distribution scene.
```

- [ ] **Step 6: Generate `event-settlement-source.png`**

Append:

```text
Depict shared settlement: one sturdy balanced scale with two visibly distinct small coin stacks on its pans. The scale is level and calm. Do not use a pouch, chest, universal balance total, handshake, lock, arrow, or text.
```

- [ ] **Step 7: Generate `event-correction-source.png`**

Append:

```text
Depict an immutable-ledger correction: one complete older ledger page remains clearly visible, with a separate smaller addendum page pinned beside it. Nothing is erased, crossed out, painted over, torn, or reopened. No pencil, eraser, undo arrow, or replacement page covering the old fact.
```

- [ ] **Step 8: Generate `status-lock-source.png`**

Append:

```text
Depict an immutable period: one heavy but clean brass padlock visibly fastening a period ledger page. Use a thicker, simpler silhouette than event icons. Brass has a controlled three-step ramp with sparse wear, not noisy corrosion. No archive box, trash can, key, denied-person symbol, or text.
```

- [ ] **Step 9: Generate `status-offline-source.png`**

Append:

```text
Depict offline draft-only state: one extinguished signal lantern with two or three clearly disconnected signal marks. Use a thicker, simpler silhouette than event icons. The lantern is intact and merely unlit. No broken document, cloud upload, warning triangle, red error mark, or destructive damage.
```

- [ ] **Step 10: Inspect all generated sources before deterministic processing**

Open each source at original resolution. Reject and regenerate any image that has an opaque background, text-like marks, extra coins, directional arrows, more than three semantic objects, clipped pixels, smooth vector treatment, or a meaning that crosses the approved accounting boundaries.

### Task 4: Build deterministic masters, true optical exports, hashes, and review HTML

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-event-status-icons.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons-review.html`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/event-status/*.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/event-status/optical-48/*.png`

- [ ] **Step 1: Implement the composer**

The module must:

```js
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eventStatusIcons } from "./event-status-icons.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web/node_modules/pngjs"));
const sourceDirectory = path.join(reviewDirectory, "samples/derivations/event-status");
const masterDirectory = path.join(reviewDirectory, "samples/event-status");
const opticalDirectory = path.join(masterDirectory, "optical-48");
const alphaThreshold = 16;

await mkdir(masterDirectory, { recursive: true });
await mkdir(opticalDirectory, { recursive: true });

const manifestIcons = [];
for (const icon of eventStatusIcons) {
  const sourceFilename = `${icon.id}-source.png`;
  const masterFilename = `${icon.id}.png`;
  const sourcePath = path.join(sourceDirectory, sourceFilename);
  const source = PNG.sync.read(await readFile(sourcePath));
  const master = containNearest(source, findAlphaBounds(source), 192, 152);
  zeroTransparentRgb(master);
  assertRaster(master, 192, icon.id);
  const masterBytes = PNG.sync.write(master);
  await writeFile(path.join(masterDirectory, masterFilename), masterBytes);

  const optical = resizeNearest(master, 48, 48);
  zeroTransparentRgb(optical);
  assertRaster(optical, 48, `${icon.id} optical`);
  const opticalBytes = PNG.sync.write(optical);
  await writeFile(path.join(opticalDirectory, masterFilename), opticalBytes);

  manifestIcons.push({
    id: icon.id,
    source: repoPath(path.join(sourceDirectory, sourceFilename)),
    master: {
      path: repoPath(path.join(masterDirectory, masterFilename)),
      width: 192,
      height: 192,
      sha256: sha256(masterBytes),
    },
    optical48: {
      path: repoPath(path.join(opticalDirectory, masterFilename)),
      width: 48,
      height: 48,
      sha256: sha256(opticalBytes),
    },
  });
}

const manifest = { decision: "awaiting-calibration", icons: manifestIcons };
await writeFile(
  path.join(reviewDirectory, "event-status-icons.manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  path.join(reviewDirectory, "event-status-icons-review.html"),
  renderReviewPage(manifestIcons),
);

function containNearest(source, bounds, canvasSize, contentSize) {
  const output = new PNG({ width: canvasSize, height: canvasSize, colorType: 6 });
  output.data.fill(0);
  const scale = Math.min(contentSize / bounds.width, contentSize / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const left = Math.floor((canvasSize - width) / 2);
  const top = Math.floor((canvasSize - height) / 2);
  for (let y = 0; y < height; y += 1) {
    const sourceY = bounds.top + Math.min(bounds.height - 1, Math.floor(y * bounds.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = bounds.left + Math.min(bounds.width - 1, Math.floor(x * bounds.width / width));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const outputOffset = ((top + y) * canvasSize + left + x) * 4;
      source.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return output;
}

function resizeNearest(source, width, height) {
  const output = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
      const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const outputOffset = (y * width + x) * 4;
      source.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return output;
}

function findAlphaBounds(png) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Source has no visible pixels");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] !== 0) continue;
    png.data[offset] = 0;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
  }
}

function assertRaster(png, size, label) {
  if (png.width !== size || png.height !== size) {
    throw new Error(`${label} must be ${size} by ${size}`);
  }
  findAlphaBounds(png);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function repoPath(filename) {
  return path.relative(repositoryDirectory, filename).replaceAll("\\", "/");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderReviewPage(entries) {
  const cards = entries.map((entry) => {
    const icon = eventStatusIcons.find(({ id }) => id === entry.id);
    return `
      <article class="icon-card" data-icon="${icon.id}" data-decision="awaiting-calibration">
        <div class="master"><img src="samples/event-status/${icon.id}.png" alt="${escapeHtml(icon.alt)}"></div>
        <div class="copy"><p class="kind">${icon.id.startsWith("status-") ? "STATUS" : "EVENT"}</p><h2>${escapeHtml(icon.label)}</h2><p>${escapeHtml(icon.objects)}</p><p class="boundary">${escapeHtml(icon.boundary)}</p></div>
        <div class="proof" data-preview-size="48"><span>48 px</span><img src="samples/event-status/optical-48/${icon.id}.png" alt="${escapeHtml(icon.alt)}的 48 像素預覽"></div>
        <div class="proof" data-grayscale-preview><span>48 px grayscale</span><img src="samples/event-status/optical-48/${icon.id}.png" alt="${escapeHtml(icon.alt)}的灰階預覽"></div>
        <code>MASTER SHA-256 ${entry.master.sha256}</code>
      </article>`;
  }).join("");
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mimic Event / Status Icon Review</title>
<style>
:root{color-scheme:dark;--night:#080c1c;--panel:#121a32;--line:#465071;--paper:#f1dfb7;--dim:#b9aa87;--gold:#f2b638;--teal:#79b4b0}*{box-sizing:border-box}body{margin:0;background:var(--night);color:var(--paper);font-family:"Segoe UI",system-ui,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:40px 0 72px}h1,h2,p{margin:0}header{display:grid;grid-template-columns:1fr minmax(280px,420px);gap:28px;align-items:end;margin-bottom:28px}h1{font:700 clamp(40px,7vw,72px)/.95 Georgia,serif}header>p{border-left:4px solid var(--gold);padding:14px 16px;color:var(--dim);line-height:1.6}.icon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.icon-card{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;border:1px solid var(--line);background:var(--panel)}.master{grid-column:1/-1;display:grid;place-items:center;min-height:220px;background:#0b1124}.master img{width:192px;height:192px;image-rendering:pixelated}.copy{grid-column:1/-1}.kind{color:var(--gold);font:11px Consolas,monospace;letter-spacing:.1em}.copy h2{margin-top:6px}.copy>p:not(.kind){margin-top:8px;color:var(--dim);line-height:1.5}.boundary{border-left:3px solid var(--teal);padding-left:10px}.proof{display:grid;place-items:center;gap:8px;min-height:100px;background:#0b1124;color:var(--dim);font-size:12px}.proof img{width:48px;height:48px;image-rendering:pixelated}[data-grayscale-preview] img{filter:grayscale(1)}code{grid-column:1/-1;color:#8d96af;font-size:10px;overflow-wrap:anywhere}.controls,.rules{margin-top:24px;padding:22px;border:1px solid var(--line);background:var(--panel)}.control-images{display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-top:16px;align-items:center}.control-images img{display:block;max-width:100%;margin:auto;image-rendering:pixelated}.rules{display:grid;grid-template-columns:1fr 1fr;gap:18px;line-height:1.6;color:var(--dim)}.rules strong{display:block;color:var(--paper)}
@media(max-width:900px){.icon-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){header,.icon-grid,.rules{grid-template-columns:1fr}.control-images{grid-template-columns:1fr}}@media(max-width:390px){main{width:calc(100% - 20px);padding-top:26px}.icon-card{padding:14px}.master{min-height:200px}}
</style></head><body><main><header><h1>Event / Status icons</h1><p>Direct accounting objects in the approved mimiku pixel-handdrawn language. Icons family remains awaiting calibration.</p></header><section class="icon-grid" aria-label="Nine event and status icon directions">${cards}</section><section class="controls"><h2>Approved family controls</h2><div class="control-images"><img src="samples/icons-calibration.png" alt="已核准的導航與模式 icon 對照"><img src="samples/record-expense-action/record-expense-action-v01.png" alt="已核准的記一筆支出 Action icon"></div></section><section class="rules"><p><strong>Live-HTML boundary</strong>Every future consumer retains a visible label or independent accessible name.</p><p><strong>Phase boundary</strong>Review-only files outside web/public; no runtime asset changes.</p></section></main></body></html>\n`;
}
```

- [ ] **Step 2: Run the composer twice and prove byte stability**

Run from the repository root:

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-event-status-icons.mjs
$first = (Get-FileHash docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.manifest.json -Algorithm SHA256).Hash
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-event-status-icons.mjs
$second = (Get-FileHash docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.manifest.json -Algorithm SHA256).Hash
if ($first -ne $second) { throw "Composer output is not deterministic" }
Write-Output $second
```

Expected: one SHA-256 value and no exception.

- [ ] **Step 3: Run the focused test and confirm the green state**

Run from `web/`:

```powershell
npm test -- --run src/shared/brand/event-status-icon-calibration.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit only the isolated new calibration implementation files**

Do not stage `.codex-remote-attachments/`, `reference/`, or any pre-existing dirty tracked file.

```powershell
git add -- docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-event-status-icons.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons.manifest.json docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons-review.html docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/event-status docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/event-status web/src/shared/brand/event-status-icon-calibration.test.ts
git commit -m "feat(visual): add event status icon calibration"
```

Expected: only the explicitly listed new files enter the commit.

### Task 5: Add four-viewport browser verification

**Files:**
- Create: `web/e2e/event-status-icon-review.spec.ts`

- [ ] **Step 1: Write the responsive review test**

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const reviewRoot = path.resolve(
  process.cwd(),
  "..",
  "docs/design/assets/reviews/2026-09-18-page-visual-phase-1",
);

test("event and status review remains complete at every project viewport", async ({
  page,
}, testInfo) => {
  await installReviewRoutes(page);
  await page.goto("https://event-status-review.local/event-status-icons-review.html");

  const expectedWidths: Record<string, number> = {
    "phone-small": 320,
    phone: 390,
    tablet: 768,
    desktop: 1440,
  };
  expect(page.viewportSize()?.width).toBe(expectedWidths[testInfo.project.name]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Event / Status icons",
  );
  await expect(page.locator("[data-icon]")).toHaveCount(9);
  await expect(page.locator('[data-preview-size="48"]')).toHaveCount(9);
  await expect(page.locator("[data-grayscale-preview]")).toHaveCount(9);
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
  });
  await expectNoHorizontalOverflow(page);
});

async function installReviewRoutes(page: Page) {
  await page.route("https://event-status-review.local/**", async (route) => {
    const url = new URL(route.request().url());
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const filename = path.resolve(reviewRoot, relativePath);
    if (!filename.startsWith(`${reviewRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: "Forbidden" });
      return;
    }
    try {
      await route.fulfill({
        status: 200,
        body: await readFile(filename),
        contentType: filename.endsWith(".html")
          ? "text/html; charset=utf-8"
          : filename.endsWith(".png") ? "image/png" : "application/octet-stream",
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await route.fulfill({ status: 404, body: "Not found" });
        return;
      }
      throw error;
    }
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(0);
  expect(overflow.document).toBeLessThanOrEqual(0);
}
```

- [ ] **Step 2: Run all four configured viewport projects**

Run from `web/`:

```powershell
npx playwright test e2e/event-status-icon-review.spec.ts
```

Expected: 4 tests pass, one each at 320, 390, 768, and 1440 pixels.

- [ ] **Step 3: Commit the isolated browser contract**

```powershell
git add -- web/e2e/event-status-icon-review.spec.ts
git commit -m "test(visual): verify event status icon review"
```

### Task 6: Record the pending visual checkpoint without approving it

**Files:**
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Extend the Icons calibration brief**

Append this paragraph to the Icons section:

```markdown
The Event / Status checkpoint uses direct accounting objects: paid slip and spent coin for Expense; coin entering the common pouch for Contribution; reimbursement slip and returned coin for Reimbursement; empty cracked pouch and last coin for Shortfall; tilted common pouch and external coin for Return; balanced scale and two coin stacks for Settlement; preserved old ledger plus a separately pinned addendum for Correction; ledger-fastening brass padlock for Lock; and an extinguished signal lantern with disconnected signal marks for Offline. Each direction has a deterministic 192 × 192 review master and a true 48 × 48 optical export. Artwork remains pending exact-hash approval and does not promote the Icons family or any runtime asset.
```

- [ ] **Step 2: Update the Icons decision-log row**

Add to the existing requested-correction cell without changing its decision from `awaiting recalibration`:

```markdown
The nine Event / Status directions are now presented in `event-status-icons-review.html` with exact master hashes, true 48 px exports, grayscale evidence, live labels, and approved-family controls. Their artwork is awaiting user review; no hash is approved yet.
```

- [ ] **Step 3: Append the implementation devlog entry**

```markdown
## 2026-09-28 — Event and status icon calibration checkpoint

**Task:** Produce nine review-only Event / Status icon directions from the approved direct-accounting-object design.

**Scope:** Event / Status ImageGen sources, deterministic composer, 192 px masters, 48 px optical exports, manifest, review page, focused tests, calibration brief, and decision log.

**What changed:**
- Added nine transparent source directions and deterministic normalized review outputs.
- Added exact SHA-256 metadata, grayscale evidence, approved-family controls, and four-viewport checks.
- Kept all product runtime paths unchanged and retained the Icons family as awaiting calibration.

**Decisions:** Used posture and overlap instead of arrows; preserved the old ledger in Correction; kept Lock and Offline visually simpler than event icons.

**Known gaps / follow-ups:** Await user approval or revision of the exact presented hashes; install/favicon, maskable, and final optical-export evidence remain pending.
```

Do not commit these three already-dirty tracked files separately; preserve their existing adjacent changes for the eventual approved calibration commit.

### Task 7: Run final verification and stop at the visual gate

**Files:**
- Verify all files above; no new runtime files.

- [ ] **Step 1: Run focused deterministic tests**

Run from `web/`:

```powershell
npm test -- --run src/shared/brand/event-status-icon-calibration.test.ts
npx eslint src/shared/brand/event-status-icon-calibration.test.ts e2e/event-status-icon-review.spec.ts
npx playwright test e2e/event-status-icon-review.spec.ts
```

Expected: 2 Vitest tests pass, ESLint exits 0, and 4 Playwright tests pass.

- [ ] **Step 2: Verify repository and phase boundaries**

Run from the repository root:

```powershell
git diff --check
git diff --name-only -- web/public
git diff --name-only -- web/src | Where-Object { $_ -notmatch '\.test\.ts$' }
git status --short -- .codex-remote-attachments reference
```

Expected: no whitespace errors; no `web/public` changes; no non-test `web/src` changes; protected directories remain untracked and unstaged.

- [ ] **Step 3: Perform the human visual self-review**

Open `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/event-status-icons-review.html` and inspect:

1. all nine master silhouettes at equal scale;
2. every true 48 px export in color and grayscale;
3. Contribution versus Return posture and overlap;
4. Reimbursement versus Return presence or absence of a slip;
5. Expense versus the approved active-writing Action;
6. Correction preserving the old page;
7. Lock versus Offline silhouette weight;
8. consistency with navigation and Mode controls;
9. layout at 320, 390, 768, and 1440 pixels.

If any direction fails, revise only that source through ImageGen, rerun the composer and full focused verification, and present the new hash. Never silently retain approval for a replaced hash.

- [ ] **Step 4: Present the checkpoint and stop**

Show the user the review page, list the nine master SHA-256 values from `event-status-icons.manifest.json`, summarize verification, and explicitly state that:

- Event / Status artwork is awaiting review;
- the complete Icons family remains `awaiting-calibration`;
- install/favicon, maskable, and final individual optical-export evidence remain pending;
- no runtime asset or page integration occurred.

Do not mark these directions approved, update the family decision, start another icon sub-family, or enter Phase 2 until the user explicitly approves or requests revisions.
