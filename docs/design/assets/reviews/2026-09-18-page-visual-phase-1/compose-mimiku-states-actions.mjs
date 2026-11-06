import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { mimikuStatesActions as config } from "./mimiku-states-actions.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web", "node_modules", "pngjs"));
const sampleDirectory = path.join(reviewDirectory, "samples", "mimiku-states-actions");
const masterDirectory = path.join(sampleDirectory, "masters");
const sheetPath = path.join(sampleDirectory, "mimiku-states-actions-calibration.png");
const manifestPath = path.join(reviewDirectory, "mimiku-states-actions.manifest.json");
const reviewPath = path.join(reviewDirectory, "mimiku-states-actions-review.html");

await mkdir(masterDirectory, { recursive: true });

const poseRecords = [];
const masters = [];
for (const pose of config.poses) {
  const sourcePath = path.join(repositoryDirectory, pose.source);
  const sourceBytes = await readFile(sourcePath);
  const source = PNG.sync.read(sourceBytes);
  clearFaintAlpha(source, 1);
  if (pose.lineage === "canonical") clearSmallEdgeComponents(source);
  zeroTransparentRgb(source);

  const master = containOnCanvas(source, config.masterSize, config.masterFit);
  const masterRelativePath = `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-actions/masters/${pose.id}.png`;
  const masterBytes = PNG.sync.write(master);
  await writeFile(path.join(repositoryDirectory, masterRelativePath), masterBytes);
  masters.push(master);
  poseRecords.push({
    ...pose,
    source: {
      path: pose.source,
      width: source.width,
      height: source.height,
      sha256: sha256(sourceBytes),
      transparentBackground: hasTransparentPixel(source),
    },
    master: {
      path: masterRelativePath,
      width: config.masterSize,
      height: config.masterSize,
      sha256: sha256(masterBytes),
      normalization: config.normalization,
      transparentBackground: true,
    },
  });
}

const sheet = composeSheet(masters);
const sheetBytes = PNG.sync.write(sheet);
await writeFile(sheetPath, sheetBytes);

const manifest = {
  family: "mimiku-states-actions",
  generatedOn: "2026-10-02",
  approvedOn: config.decision === "approved" ? "2026-10-02" : undefined,
  decision: config.decision,
  reviewOnly: config.reviewOnly,
  runtimePromotion: config.runtimePromotion,
  poseOrder: config.poses.map(({ id }) => id),
  poses: poseRecords,
  sheet: {
    path: "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-actions/mimiku-states-actions-calibration.png",
    width: config.sheet.width,
    height: config.sheet.height,
    sha256: sha256(sheetBytes),
  },
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(reviewPath, renderReview(manifest), "utf8");

function containOnCanvas(source, canvasSize, fit) {
  const contained = containNearest(source, fit, fit);
  const canvas = transparentPng(canvasSize, canvasSize);
  const x = Math.floor((canvasSize - contained.width) / 2);
  const y = Math.floor((canvasSize - contained.height) / 2);
  PNG.bitblt(contained, canvas, 0, 0, contained.width, contained.height, x, y);
  zeroTransparentRgb(canvas);
  return canvas;
}

function composeSheet(sources) {
  const output = transparentPng(config.sheet.width, config.sheet.height);
  const cellWidth = config.sheet.width / config.sheet.columns;
  const cellHeight = config.sheet.height / config.sheet.rows;
  for (const [index, source] of sources.entries()) {
    const contained = containNearest(source, 336, 432);
    const column = index % config.sheet.columns;
    const row = Math.floor(index / config.sheet.columns);
    const x = column * cellWidth + Math.floor((cellWidth - contained.width) / 2);
    const y = row * cellHeight + Math.floor((cellHeight - contained.height) / 2);
    PNG.bitblt(contained, output, 0, 0, contained.width, contained.height, x, y);
  }
  zeroTransparentRgb(output);
  return output;
}

function transparentPng(width, height) {
  const result = new PNG({ width, height, colorType: 6, inputColorType: 6 });
  result.data.fill(0);
  return result;
}

function containNearest(source, maxWidth, maxHeight) {
  const bounds = nonTransparentBounds(source);
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const result = transparentPng(width, height);
  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY = bounds.y + Math.min(
      bounds.height - 1,
      Math.floor((destinationY * bounds.height) / height),
    );
    for (let destinationX = 0; destinationX < width; destinationX += 1) {
      const sourceX = bounds.x + Math.min(
        bounds.width - 1,
        Math.floor((destinationX * bounds.width) / width),
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const destinationOffset = (destinationY * width + destinationX) * 4;
      source.data.copy(result.data, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return result;
}

function nonTransparentBounds(png) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Mimiku source contains no visible pixels");
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function clearFaintAlpha(png, maximumAlpha) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] <= maximumAlpha) png.data.fill(0, offset, offset + 4);
  }
}

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] !== 0) continue;
    png.data.fill(0, offset, offset + 4);
  }
}

function hasTransparentPixel(png) {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}

function clearSmallEdgeComponents(png) {
  const visited = new Uint8Array(png.width * png.height);
  const edgeMargin = 8;
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || png.data[start * 4 + 3] === 0) continue;
    const stack = [start];
    const pixels = [];
    let nearEdge = false;
    visited[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop();
      pixels.push(index);
      const x = index % png.width;
      const y = Math.floor(index / png.width);
      nearEdge ||= x < edgeMargin || y < edgeMargin || x >= png.width - edgeMargin || y >= png.height - edgeMargin;
      for (const neighbor of [
        x > 0 ? index - 1 : -1,
        x + 1 < png.width ? index + 1 : -1,
        y > 0 ? index - png.width : -1,
        y + 1 < png.height ? index + png.width : -1,
      ]) {
        if (neighbor < 0 || visited[neighbor] || png.data[neighbor * 4 + 3] === 0) continue;
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
    if (!nearEdge || pixels.length >= 1000) continue;
    for (const index of pixels) png.data.fill(0, index * 4, index * 4 + 4);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function localPath(repositoryRelativePath) {
  const prefix = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
  if (!repositoryRelativePath.startsWith(prefix)) {
    throw new Error(`Review output escaped review directory: ${repositoryRelativePath}`);
  }
  return repositoryRelativePath.slice(prefix.length);
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function poseCard(pose) {
  const src = localPath(pose.master.path);
  const lineage = pose.lineage === "canonical" ? "Canonical control" : "ImageGen repair";
  return `<article class="pose-card" data-pose="${pose.id}">
    <div class="master-stage checker"><img src="${src}" alt="${escapeHtml(pose.label)} master"></div>
    <div class="pose-copy"><div class="eyebrow">${lineage} · ${pose.role}</div><h3>${escapeHtml(pose.label)}</h3><p>${escapeHtml(pose.meaning)}</p></div>
    <div class="evidence-row">
      <figure><div class="preview checker"><img src="${src}" width="128" height="128" alt="${escapeHtml(pose.label)} 128 pixel preview" data-preview-size="128"></div><figcaption>Real 128 px</figcaption></figure>
      <figure><div class="preview checker grayscale"><img src="${src}" width="128" height="128" alt="${escapeHtml(pose.label)} grayscale preview" data-grayscale-preview></div><figcaption>Grayscale</figcaption></figure>
    </div>
    <div class="hash"><span>Exact master SHA-256</span><code>${pose.master.sha256}</code></div>
  </article>`;
}

function comparisonCard(manifest, ids, title, description, dataValue) {
  const poses = ids.map((id) => manifest.poses.find((pose) => pose.id === id));
  return `<section class="comparison" data-comparison="${dataValue}"><div><div class="eyebrow">Semantic separation</div><h2>${title}</h2><p>${description}</p></div><div class="comparison-images">${poses.map((pose) => `<figure><div class="compare-stage checker"><img src="${localPath(pose.master.path)}" alt="${escapeHtml(pose.label)} comparison"></div><figcaption><strong>${escapeHtml(pose.label)}</strong><span>${escapeHtml(pose.meaning)}</span></figcaption></figure>`).join("")}</div></section>`;
}

function renderReview(manifest) {
  const canonical = manifest.poses.filter(({ lineage }) => lineage === "canonical");
  const repaired = manifest.poses.filter(({ lineage }) => lineage === "imagegen-repair");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mimiku states & actions calibration</title>
<style>
:root{color-scheme:dark;--ink:#17100d;--paper:#f5e6bf;--paper2:#dcbf82;--wood:#5d301e;--gold:#e9ad38;--teal:#79a89b;--line:#3a2118}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#4f2c1f 0,transparent 35%),linear-gradient(150deg,#17100d,#24150f 55%,#0f0d0b);color:var(--paper);font-family:Georgia,'Times New Roman',serif;line-height:1.5}main{width:min(1380px,calc(100% - 32px));margin:auto;padding:48px 0 88px}.eyebrow{font:700 11px/1.3 system-ui,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:#e7bd68}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:28px;align-items:end;border:1px solid #8f673c;background:linear-gradient(140deg,#3b2117dd,#20140fed);padding:clamp(24px,5vw,64px);box-shadow:0 20px 70px #0008}.hero h1{font-size:clamp(42px,7vw,92px);line-height:.92;margin:.16em 0 .28em;letter-spacing:-.04em}.hero p{max-width:65ch;color:#dbc9a5}.status{border-left:4px solid var(--gold);padding:16px 18px;background:#120d0a99}.status strong{display:block;color:#f6ce74}.sheet{margin:28px 0 64px;border:1px solid #6f5034;background:#0d0b0a;padding:16px}.sheet img{display:block;width:100%;height:auto;image-rendering:pixelated}.section-heading{display:flex;justify-content:space-between;gap:24px;align-items:end;margin:64px 0 22px}.section-heading h2,.comparison h2{font-size:clamp(28px,4vw,48px);line-height:1;margin:.2em 0}.section-heading p{max-width:55ch;color:#cbb996}.pose-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.pose-card{min-width:0;border:1px solid #745136;background:linear-gradient(#2c1b14,#1b120e);box-shadow:0 10px 30px #0005}.master-stage{aspect-ratio:1;display:grid;place-items:center;border-bottom:1px solid #745136}.master-stage img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.pose-copy{padding:18px;min-height:172px}.pose-copy h3{font-size:24px;margin:.25em 0}.pose-copy p{font-size:14px;color:#cfbd99;margin:0}.checker{background-color:#b6a783;background-image:linear-gradient(45deg,#8f8162 25%,transparent 25%),linear-gradient(-45deg,#8f8162 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#8f8162 75%),linear-gradient(-45deg,transparent 75%,#8f8162 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0}.evidence-row{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#745136;border-top:1px solid #745136;border-bottom:1px solid #745136}.evidence-row figure{margin:0;background:#1b120e;padding:14px}.preview{margin:auto;width:128px;max-width:100%;aspect-ratio:1}.preview img{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.grayscale img{filter:grayscale(1)}figcaption{font:600 11px/1.3 system-ui,sans-serif;color:#bfae8d;margin-top:9px}.hash{padding:14px 18px;overflow:hidden}.hash span{display:block;font:700 10px system-ui,sans-serif;color:#cfad6b;text-transform:uppercase;letter-spacing:.1em}.hash code{display:block;overflow-wrap:anywhere;color:#a8c8bd;font-size:10px;margin-top:6px}.comparison{margin:24px 0;display:grid;grid-template-columns:minmax(220px,.65fr) minmax(0,1.35fr);gap:28px;align-items:center;border:1px solid #745136;background:#21150f;padding:clamp(20px,4vw,40px)}.comparison>div>p{color:#cbb996}.comparison-images{display:grid;grid-template-columns:1fr 1fr;gap:14px}.comparison figure{margin:0;min-width:0}.compare-stage{aspect-ratio:1}.compare-stage img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.comparison figcaption strong,.comparison figcaption span{display:block}.comparison figcaption span{color:#b9aa8c;font-weight:400;margin-top:5px}.control-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.control{border:1px solid #745136;background:#1a110d;padding:10px}.control img{display:block;width:100%;height:auto;image-rendering:pixelated}.control span{display:block;padding:8px 2px 2px;font:600 12px system-ui,sans-serif}.boundary{margin-top:64px;border:1px solid var(--teal);padding:28px;background:#12201d}.boundary h2{margin:0 0 8px}.boundary p{margin:0;color:#bad0c9}.footnote{font:12px system-ui,sans-serif;color:#9d8b70;margin-top:22px;overflow-wrap:anywhere}@media(max-width:1040px){.pose-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr}.comparison{grid-template-columns:1fr}}@media(max-width:600px){main{width:min(calc(100% - 20px),1380px);padding-top:10px}.hero{padding:24px 18px}.pose-grid{grid-template-columns:1fr}.section-heading{display:block}.comparison{padding:18px}.comparison-images{gap:8px}.control-grid{grid-template-columns:repeat(2,1fr)}.hash code{font-size:9px}.evidence-row figure{padding:10px}}
</style></head><body><main>
<header class="hero"><div><div class="eyebrow">Page Visual Optimization · Phase 1</div><h1>Mimiku states & actions</h1><p>Eight-pose lineage calibration: four canonical controls stay intact while four semantically important poses are repaired to the same handcrafted RPG language.</p></div><aside class="status"><strong>Mimiku states and actions approved at exact hashes</strong><span>Mimiku calibration approved · 2026-10-02</span></aside></header>
<div class="sheet checker"><img src="samples/mimiku-states-actions/mimiku-states-actions-calibration.png" alt="Combined eight-pose Mimiku calibration sheet"></div>
<section><div class="section-heading"><div><div class="eyebrow">Live semantic labels</div><h2>Eight fixed roles</h2></div><p>Judge silhouette, emotional register, prop clarity, and family consistency. Masters are displayed proportionally; optical evidence is the real 128 px raster.</p></div><div class="pose-grid">${manifest.poses.map(poseCard).join("")}</div></section>
${comparisonCard(manifest,["state-working","action-record-ledger-key"],"Reviewing versus recording","Working keeps a visible air gap beneath the quill. Record ledger requires nib-to-page contact and a short ink stroke.","working-record-ledger")}
${comparisonCard(manifest,["state-serious","state-concerned"],"Firm boundary versus recoverable concern","Serious is direct and firm. Concerned stays softer, slightly tucked, and never implies blame, destruction, or permanent failure.","serious-concerned")}
<section><div class="section-heading"><div><div class="eyebrow">Canonical controls</div><h2>Unredrawn anchors</h2></div><p>Idle, Happy, Reminder, and Serious are existing runtime sources used read-only. They anchor anatomy, warmth, and pixel density; this page does not promote or modify them.</p></div><div class="control-grid">${canonical.map((pose)=>`<div class="control"><img src="${localPath(pose.master.path)}" alt="${escapeHtml(pose.label)} canonical control"><span>${escapeHtml(pose.label)}</span></div>`).join("")}</div></section>
<section class="boundary"><h2>Approval boundary</h2><p>The exact eight master hashes shown here are approved. This evidence remains review-only: no runtime asset changes, no sprite timing, no animation sheet, and no production promotion. Approved ImageGen repairs: ${repaired.map(({label})=>label).join(", ")}. Gate A stays open for the remaining families.</p></section>
<p class="footnote">Generated deterministically from manifest lineage · sheet ${manifest.sheet.sha256}</p>
</main></body></html>`;
}
