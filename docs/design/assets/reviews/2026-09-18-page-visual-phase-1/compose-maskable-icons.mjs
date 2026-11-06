import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { maskableCalibration } from "./maskable-icons.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web/node_modules/pngjs"));
const sourcePath = path.join(
  reviewDirectory,
  "samples/derivations/maskable/maskable-source.png",
);
const outputDirectory = path.join(reviewDirectory, "samples/maskable");

await mkdir(outputDirectory, { recursive: true });

const sourceBytes = await readFile(sourcePath);
const source = PNG.sync.read(sourceBytes);
const flattenedSource = flattenOpaque(source, maskableCalibration.backgroundRgb);
const master = resizeNearest(flattenedSource, 512, 512);
assertOpaque(master, "maskable-512");

const outputs = [];
for (const definition of maskableCalibration.outputs) {
  const png =
    definition.id === maskableCalibration.canonicalMasterId
      ? master
      : resizeNearest(master, definition.size, definition.size);
  assertOpaque(png, definition.id);
  const bytes = PNG.sync.write(png);
  const outputPath = path.join(outputDirectory, definition.filename);
  await writeFile(outputPath, bytes);
  outputs.push({
    id: definition.id,
    path: repoPath(outputPath),
    width: definition.size,
    height: definition.size,
    purpose: definition.purpose,
    consumer: definition.consumer,
    opaque: true,
    derivedFrom:
      definition.id === maskableCalibration.canonicalMasterId
        ? null
        : maskableCalibration.canonicalMasterId,
    resizeKernel: maskableCalibration.resizeKernel,
    sha256: sha256(bytes),
  });
}

const manifest = {
  decision: maskableCalibration.decision,
  strategy: maskableCalibration.strategy,
  canonicalMasterId: maskableCalibration.canonicalMasterId,
  resizeKernel: maskableCalibration.resizeKernel,
  safeZone: maskableCalibration.safeZone,
  reviewOnly: maskableCalibration.reviewOnly,
  runtimePromotion: false,
  source: {
    path: repoPath(sourcePath),
    width: source.width,
    height: source.height,
    sha256: sha256(sourceBytes),
    generator: "OpenAI ImageGen built-in tool",
  },
  outputs,
};

await writeFile(
  path.join(reviewDirectory, "maskable-icons.manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  path.join(reviewDirectory, "maskable-icons-review.html"),
  renderReviewPage(manifest),
);

console.log(
  `maskable icons composed: ${outputs.map(({ id, sha256: hash }) => `${id}=${hash}`).join(" ")}`,
);

function flattenOpaque(sourcePng, background) {
  const output = new PNG({
    width: sourcePng.width,
    height: sourcePng.height,
    colorType: 6,
  });
  for (let offset = 0; offset < sourcePng.data.length; offset += 4) {
    const alpha = sourcePng.data[offset + 3] / 255;
    output.data[offset] = Math.round(
      sourcePng.data[offset] * alpha + background[0] * (1 - alpha),
    );
    output.data[offset + 1] = Math.round(
      sourcePng.data[offset + 1] * alpha + background[1] * (1 - alpha),
    );
    output.data[offset + 2] = Math.round(
      sourcePng.data[offset + 2] * alpha + background[2] * (1 - alpha),
    );
    output.data[offset + 3] = 255;
  }
  return output;
}

function resizeNearest(sourcePng, width, height) {
  const output = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        sourcePng.width - 1,
        Math.floor((x * sourcePng.width) / width),
      );
      const sourceY = Math.min(
        sourcePng.height - 1,
        Math.floor((y * sourcePng.height) / height),
      );
      const from = (sourceY * sourcePng.width + sourceX) * 4;
      const to = (y * width + x) * 4;
      sourcePng.data.copy(output.data, to, from, from + 4);
      output.data[to + 3] = 255;
    }
  }
  return output;
}

function assertOpaque(png, label) {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] !== 255) {
      throw new Error(`${label} contains a non-opaque pixel`);
    }
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function repoPath(filename) {
  return path.relative(repositoryDirectory, filename).replaceAll("\\", "/");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderReviewPage(reviewManifest) {
  const cards = reviewManifest.outputs
    .map((output) => {
      const imagePath = `samples/maskable/${path.basename(output.path)}`;
      const inspectionSize = output.width === 512 ? 320 : 288;
      return `<article class="output-card" data-output="${output.id}">
        <div class="card-heading"><div><p class="kind">${escapeHtml(output.purpose)}</p><h2>${output.id}</h2></div><span>${output.width} × ${output.height}</span></div>
        <div class="evidence-grid">
          <figure><figcaption>True size · ${escapeHtml(output.consumer)}</figcaption><div class="true-stage"><img data-true-size="${output.width}" class="true-image" width="${output.width}" height="${output.height}" src="${imagePath}" alt="Mimiku ${output.width} pixel maskable output"></div></figure>
          <figure><figcaption>Nearest-neighbor inspection</figcaption><img class="inspection" style="width:${inspectionSize}px;height:${inspectionSize}px" src="${imagePath}" alt="Enlarged inspection of ${output.id}"></figure>
          <figure data-grayscale-preview><figcaption>Grayscale</figcaption><img class="inspection grayscale" style="width:${inspectionSize}px;height:${inspectionSize}px" src="${imagePath}" alt="Grayscale inspection of ${output.id}"></figure>
        </div>
        <code>SHA-256 ${output.sha256}</code>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mimic Maskable Icons Review</title>
<style>
:root{color-scheme:dark;--night:#080c1c;--panel:#151a32;--panel2:#0d1127;--line:#554c39;--paper:#f7edcf;--dim:#b9b39d;--gold:#f4c34e;--rose:#ff587f;--teal:#79b4b0}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0;background:radial-gradient(circle at 50% -10%,#29305c 0,var(--night) 56%);color:var(--paper);font:15px/1.55 "Segoe UI",system-ui,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:46px 0 72px}h1,h2,h3,p,figure{margin:0}header{display:grid;grid-template-columns:1.2fr .8fr;gap:26px;align-items:end;margin-bottom:28px}.eyebrow,.kind{color:var(--gold);font:800 11px/1.2 Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}h1{margin-top:8px;font:700 clamp(42px,7vw,76px)/.95 Georgia,serif}.status{padding:16px 18px;border-left:4px solid var(--gold);background:var(--panel);color:var(--dim)}.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.65fr);gap:18px;padding:20px;border:1px solid var(--line);background:var(--panel);margin-bottom:20px}.safe-wrap{position:relative;width:min(100%,512px);margin:auto}.safe-wrap img{display:block;width:100%;height:auto;image-rendering:pixelated}.safe-wrap::after{content:"";position:absolute;inset:10%;border:3px dashed var(--rose);border-radius:50%;pointer-events:none}.safe-note{align-self:center;padding:22px;background:var(--panel2);border-left:4px solid var(--teal)}.safe-note h2{font:700 24px/1.15 Georgia,serif}.safe-note p{margin-top:10px;color:var(--dim)}.masks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:20px}.mask-card{padding:14px;background:var(--panel);text-align:center}.mask-card h3{margin-bottom:10px;font:700 17px/1.2 Georgia,serif}.mask-stage{aspect-ratio:1;overflow:hidden;background:#0c1025}.mask-stage img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.circle{clip-path:circle(50%)}.rounded-square{border-radius:24%}.squircle{border-radius:38% 38% 33% 33%/38% 38% 33% 33%}.aggressive{clip-path:circle(42%)}.output-grid{display:grid;gap:18px}.output-card{min-width:0;padding:20px;border:1px solid var(--line);background:var(--panel)}.card-heading{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.card-heading h2{margin-top:4px;font:700 26px/1.1 Georgia,serif}.card-heading>span{color:var(--dim)}.evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.evidence-grid figure{min-width:0;padding:14px;background:var(--panel2)}figcaption{min-height:42px;color:var(--dim);font-size:12px}.true-stage{width:100%;max-height:540px;overflow:auto;padding:12px;background:#090d20}.true-image{display:block;max-width:none;image-rendering:pixelated}.inspection{display:block;max-width:100%;object-fit:contain;margin:auto;image-rendering:pixelated}.grayscale{filter:grayscale(1)}code{display:block;margin-top:14px;color:#9ca5be;font-size:11px;overflow-wrap:anywhere}.context{display:grid;grid-template-columns:minmax(180px,320px) 1fr;gap:20px;align-items:center;margin-top:20px;padding:20px;border:1px solid var(--line);background:var(--panel)}.context img{display:block;width:100%;height:auto;image-rendering:pixelated}.context h2{font:700 23px/1.2 Georgia,serif}.context p{margin-top:9px;color:var(--dim)}.boundaries{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}.boundary{padding:18px;border-top:3px solid var(--gold);background:var(--panel);color:var(--dim)}.boundary strong{display:block;color:var(--paper);margin-bottom:7px}
@media(max-width:760px){header,.hero,.context,.boundaries{grid-template-columns:1fr}.masks{grid-template-columns:repeat(2,1fr)}.evidence-grid{grid-template-columns:1fr}.true-stage{max-height:360px}}@media(max-width:390px){main{width:calc(100% - 20px);padding-top:28px}.masks{grid-template-columns:1fr 1fr;gap:8px}.mask-card{padding:9px}.output-card{padding:14px}.card-heading{align-items:start;flex-direction:column}}
</style></head><body><main><header><div><p class="eyebrow">Page Visual Optimization · Phase 1</p><h1>Maskable Icons</h1></div><p class="status">Maskable exact hashes approved. Dedicated complete-character artwork, separate from the approved Install / Favicon composition.</p></header>
<section class="hero"><div class="safe-wrap" data-safe-zone="80"><img src="samples/maskable/maskable-512.png" alt="Maskable master with centered 80 percent safe-zone guide"></div><div class="safe-note"><h2>80% safe zone</h2><p>雙眼、完整牙齒、主要箱體與整枚心形硬幣均需保留在中央圓形安全區。粉紅虛線只存在於 review page，不會寫入 PNG。</p></div></section>
<section class="masks" aria-label="Platform mask previews"><article class="mask-card" data-mask-preview="circle"><h3>Circle</h3><div class="mask-stage circle"><img src="samples/maskable/maskable-512.png" alt="Circle mask preview"></div></article><article class="mask-card" data-mask-preview="rounded-square"><h3>Rounded square</h3><div class="mask-stage rounded-square"><img src="samples/maskable/maskable-512.png" alt="Rounded-square mask preview"></div></article><article class="mask-card" data-mask-preview="squircle"><h3>Squircle</h3><div class="mask-stage squircle"><img src="samples/maskable/maskable-512.png" alt="Squircle mask preview"></div></article><article class="mask-card" data-mask-preview="aggressive"><h3>Aggressive crop</h3><div class="mask-stage aggressive"><img src="samples/maskable/maskable-512.png" alt="Aggressive circular mask preview"></div></article></section>
<section class="output-grid" aria-label="Two deterministic maskable outputs">${cards}</section>
<section class="context"><img src="samples/install-favicon/icon-512.png" alt="Approved Install and Favicon canonical master"><div><h2>Approved Install / Favicon context</h2><p>Install / Favicon 保留金色方框並使用單一 master 縮放。Maskable 是獨立、無外框、安全區優先的完整角色構圖；兩者不互相覆寫。</p><code>Source SHA-256 ${reviewManifest.source.sha256}</code></div></section>
<section class="boundaries"><p class="boundary"><strong>Square opaque PNG</strong>Platform shapes shown here are mask preview only; no mask is baked into either PNG.</p><p class="boundary"><strong>Review-only</strong>All files stay outside web/public; no runtime asset changes.</p><p class="boundary"><strong>Gate remains open</strong>Maskable and complete Icons calibration are approved; Gate A remains open for the other asset families.</p></section>
</main></body></html>\n`;
}
