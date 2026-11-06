import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installFaviconCalibration } from "./install-favicon.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web/node_modules/pngjs"));
const sourcePath = path.join(
  reviewDirectory,
  "samples/derivations/install-favicon/install-favicon-source.png",
);
const outputDirectory = path.join(reviewDirectory, "samples/install-favicon");

await mkdir(outputDirectory, { recursive: true });

const sourceBytes = await readFile(sourcePath);
const source = PNG.sync.read(sourceBytes);
const flattenedSource = flattenOnNavy(source);
const master = resizeNearest(flattenedSource, 512, 512);
assertOpaque(master, "icon-512");

const outputs = [];
for (const definition of installFaviconCalibration.outputs) {
  const png =
    definition.id === installFaviconCalibration.canonicalMasterId
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
      definition.id === installFaviconCalibration.canonicalMasterId
        ? null
        : installFaviconCalibration.canonicalMasterId,
    resizeKernel: installFaviconCalibration.resizeKernel,
    sha256: sha256(bytes),
  });
}

const manifest = {
  decision: installFaviconCalibration.decision,
  strategy: installFaviconCalibration.strategy,
  canonicalMasterId: installFaviconCalibration.canonicalMasterId,
  resizeKernel: installFaviconCalibration.resizeKernel,
  phaseException: installFaviconCalibration.phaseException,
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
  path.join(reviewDirectory, "install-favicon.manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(
  path.join(reviewDirectory, "install-favicon-review.html"),
  renderReviewPage(manifest),
);

console.log(
  `install/favicon composed: ${outputs.map(({ id, sha256: hash }) => `${id}=${hash}`).join(" ")}`,
);

function flattenOnNavy(sourcePng) {
  const output = new PNG({
    width: sourcePng.width,
    height: sourcePng.height,
    colorType: 6,
  });
  const background = [12, 16, 37];
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
      const imagePath = `samples/install-favicon/${path.basename(output.path)}`;
      const inspectionSize = Math.max(160, Math.min(320, output.width * 5));
      return `<article class="output-card" data-output="${output.id}">
        <div class="card-heading"><div><p class="kind">${escapeHtml(output.purpose)}</p><h2>${output.id}</h2></div><span>${output.width} × ${output.height}</span></div>
        <div class="evidence-grid">
          <figure><figcaption>True size · ${escapeHtml(output.consumer)}</figcaption><div class="true-stage"><img data-true-size="${output.width}" class="true-image" width="${output.width}" height="${output.height}" src="${imagePath}" alt="Mimiku ${output.width} pixel output"></div></figure>
          <figure><figcaption>Nearest-neighbor inspection</figcaption><img class="inspection" style="width:${inspectionSize}px;height:${inspectionSize}px" src="${imagePath}" alt="Enlarged inspection of ${output.id}"></figure>
          <figure data-grayscale-preview><figcaption>Grayscale</figcaption><img class="inspection grayscale" style="width:${inspectionSize}px;height:${inspectionSize}px" src="${imagePath}" alt="Grayscale inspection of ${output.id}"></figure>
        </div>
        <code>SHA-256 ${output.sha256}</code>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mimic Install / Favicon Review</title>
<style>
:root{color-scheme:dark;--night:#080c1c;--panel:#151a32;--panel2:#0d1127;--line:#554c39;--paper:#f7edcf;--dim:#b9b39d;--gold:#f4c34e;--teal:#79b4b0}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0;background:radial-gradient(circle at 50% -10%,#29305c 0,var(--night) 56%);color:var(--paper);font:15px/1.55 "Segoe UI",system-ui,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:46px 0 72px}h1,h2,p,figure{margin:0}header{display:grid;grid-template-columns:1.2fr .8fr;gap:26px;align-items:end;margin-bottom:28px}.eyebrow,.kind{color:var(--gold);font:800 11px/1.2 Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}h1{margin-top:8px;font:700 clamp(42px,7vw,76px)/.95 Georgia,serif}.status{padding:16px 18px;border-left:4px solid var(--gold);background:#151a32;color:var(--dim)}.master-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.65fr);gap:18px;padding:20px;border:1px solid var(--line);background:var(--panel);margin-bottom:20px}.master-hero img{display:block;width:min(100%,512px);height:auto;margin:auto;image-rendering:pixelated}.exception{align-self:center;padding:22px;background:var(--panel2);border-left:4px solid var(--teal)}.exception h2{font:700 24px/1.15 Georgia,serif}.exception p{margin-top:10px;color:var(--dim)}.output-grid{display:grid;gap:18px}.output-card{min-width:0;padding:20px;border:1px solid var(--line);background:var(--panel)}.card-heading{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:16px}.card-heading h2{margin-top:4px;font:700 26px/1.1 Georgia,serif}.card-heading>span{color:var(--dim)}.evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.evidence-grid figure{min-width:0;padding:14px;background:var(--panel2)}figcaption{min-height:42px;color:var(--dim);font-size:12px}.true-stage{width:100%;max-height:540px;overflow:auto;padding:12px;background:#090d20}.true-image{display:block;max-width:none;image-rendering:pixelated}.inspection{display:block;max-width:100%;object-fit:contain;margin:auto;image-rendering:pixelated}.grayscale{filter:grayscale(1)}code{display:block;margin-top:14px;color:#9ca5be;font-size:11px;overflow-wrap:anywhere}.contexts{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}.context{padding:20px;border:1px solid var(--line);background:var(--panel)}.context h2{font:700 22px/1.2 Georgia,serif}.tabs{display:grid;gap:10px;margin-top:14px;padding:14px;border-radius:12px;background:#eae8df;color:#242424}.tab{display:flex;align-items:center;gap:8px;padding:9px 11px;background:#fff;border-radius:8px}.tab img{flex:none;image-rendering:pixelated}.install-row{display:flex;align-items:center;gap:16px;margin-top:14px;padding:16px;border-radius:18px;background:var(--panel2)}.install-row img{width:96px;height:96px;border-radius:20px;image-rendering:pixelated}.install-row span{color:var(--dim)}.boundaries{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}.boundary{padding:18px;border-top:3px solid var(--gold);background:var(--panel);color:var(--dim)}.boundary strong{display:block;color:var(--paper);margin-bottom:7px}
@media(max-width:760px){header,.master-hero,.contexts,.boundaries{grid-template-columns:1fr}.evidence-grid{grid-template-columns:1fr}.true-stage{max-height:360px}}@media(max-width:390px){main{width:calc(100% - 20px);padding-top:28px}.output-card{padding:14px}.card-heading{align-items:start;flex-direction:column}.install-row img{width:72px;height:72px}}
</style></head><body><main><header><div><p class="eyebrow">Page Visual Optimization · Phase 1</p><h1>Install / Favicon</h1></div><p class="status">Install / Favicon approved at the exact hashes below. One composition is resized unchanged across all five review sizes.</p></header>
<section class="master-hero"><img src="samples/install-favicon/icon-512.png" alt="Canonical complete-character Mimiku install master"><div class="exception"><h2>Single-master Phase 1 exception</h2><p>完整 Mimiku 與心形硬幣保留在 16、32、48、192、512px。小尺寸不移除物件、不改裁切，也不另行重畫。</p></div></section>
<section class="output-grid" aria-label="Five deterministic outputs">${cards}</section>
<section class="contexts"><article class="context"><h2>Browser favicon context</h2><div class="tabs"><div class="tab"><img width="16" height="16" src="samples/install-favicon/favicon-16.png" alt="16 pixel favicon"><span>Mimic · personal ledger</span></div><div class="tab"><img width="32" height="32" src="samples/install-favicon/favicon-32.png" alt="32 pixel favicon"><span>Mimic · shared space</span></div></div></article><article class="context"><h2>Installed app context</h2><div class="install-row"><img src="samples/install-favicon/icon-192.png" alt="192 pixel installed app icon"><div><strong>Mimic</strong><br><span>192 and 512 px install evidence</span></div></div></article></section>
<section class="boundaries"><p class="boundary"><strong>Maskable approved</strong>The dedicated safe-zone composition is approved separately at its exact hashes.</p><p class="boundary"><strong>Review-only</strong>All files stay outside web/public; no runtime asset changes.</p><p class="boundary"><strong>Gate remains open</strong>Icons family calibration is approved; Gate A remains open for the other asset families.</p></section>
</main></body></html>\n`;
}
