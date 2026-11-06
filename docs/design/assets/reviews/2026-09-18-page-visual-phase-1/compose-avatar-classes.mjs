import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { avatarClasses as config } from "./avatar-classes.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web", "node_modules", "pngjs"));

const sampleDirectory = path.join(reviewDirectory, "samples", "avatar-classes");
const masterDirectory = path.join(sampleDirectory, "masters");
const optical128Directory = path.join(sampleDirectory, "optical-128");
const optical64Directory = path.join(sampleDirectory, "optical-64");
const sheetPath = path.join(sampleDirectory, "avatar-classes-calibration.png");
const manifestPath = path.join(reviewDirectory, "avatar-classes.manifest.json");
const reviewPath = path.join(reviewDirectory, "avatar-classes-review.html");

await Promise.all([
  mkdir(masterDirectory, { recursive: true }),
  mkdir(optical128Directory, { recursive: true }),
  mkdir(optical64Directory, { recursive: true }),
]);

const characterRecords = [];
const masters = [];
for (const character of config.characters) {
  const referenceRecord = await rasterRecord(character.reference, false);
  const sourceBytes = await readFile(path.join(repositoryDirectory, character.source));
  const source = PNG.sync.read(sourceBytes);
  clearFaintAlpha(source, 1);
  zeroTransparentRgb(source);

  const master = containOnCanvas(
    source,
    config.masterSize,
    config.masterFit,
    config.masterBaseline,
  );
  const optical128 = resizeNearest(master, 128, 128);
  const optical64 = resizeNearest(master, 64, 64);

  const masterRelativePath = outputPath(`samples/avatar-classes/masters/${character.id}.png`);
  const optical128RelativePath = outputPath(`samples/avatar-classes/optical-128/${character.id}.png`);
  const optical64RelativePath = outputPath(`samples/avatar-classes/optical-64/${character.id}.png`);
  const masterBytes = PNG.sync.write(master);
  const optical128Bytes = PNG.sync.write(optical128);
  const optical64Bytes = PNG.sync.write(optical64);

  await Promise.all([
    writeFile(path.join(repositoryDirectory, masterRelativePath), masterBytes),
    writeFile(path.join(repositoryDirectory, optical128RelativePath), optical128Bytes),
    writeFile(path.join(repositoryDirectory, optical64RelativePath), optical64Bytes),
  ]);

  masters.push(master);
  characterRecords.push({
    ...character,
    reference: referenceRecord,
    source: {
      path: character.source,
      width: source.width,
      height: source.height,
      sha256: sha256(sourceBytes),
      transparentBackground: hasTransparentPixel(source),
      lineage: "imagegen-transparent-edit",
    },
    master: {
      path: masterRelativePath,
      width: config.masterSize,
      height: config.masterSize,
      sha256: sha256(masterBytes),
      transparentBackground: true,
      normalization: config.normalization,
    },
    optical128: {
      path: optical128RelativePath,
      width: 128,
      height: 128,
      sha256: sha256(optical128Bytes),
      transparentBackground: true,
      normalization: config.opticalNormalization,
    },
    optical64: {
      path: optical64RelativePath,
      width: 64,
      height: 64,
      sha256: sha256(optical64Bytes),
      transparentBackground: true,
      normalization: config.opticalNormalization,
    },
  });
}

const sheet = composeSheet(masters);
const sheetBytes = PNG.sync.write(sheet);
await writeFile(sheetPath, sheetBytes);

const manifest = {
  family: "avatar-classes",
  generatedOn: "2026-10-03",
  approvedOn: config.decision === "approved" ? "2026-10-04" : undefined,
  decision: config.decision,
  reviewOnly: config.reviewOnly,
  runtimePromotion: config.runtimePromotion,
  normalization: config.normalization,
  opticalNormalization: config.opticalNormalization,
  masterSize: config.masterSize,
  masterFit: config.masterFit,
  masterBaseline: config.masterBaseline,
  opticalSizes: config.opticalSizes,
  characterOrder: config.characters.map(({ id }) => id),
  characters: characterRecords,
  sheet: {
    path: outputPath("samples/avatar-classes/avatar-classes-calibration.png"),
    width: config.sheet.width,
    height: config.sheet.height,
    sha256: sha256(sheetBytes),
    transparentBackground: true,
  },
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(reviewPath, renderReview(manifest), "utf8");

async function rasterRecord(repositoryRelativePath, transparentBackground) {
  const bytes = await readFile(path.join(repositoryDirectory, repositoryRelativePath));
  const png = PNG.sync.read(bytes);
  return {
    path: repositoryRelativePath,
    width: png.width,
    height: png.height,
    sha256: sha256(bytes),
    transparentBackground,
  };
}

function containOnCanvas(source, canvasSize, fit, baseline) {
  const contained = containNearest(source, fit, fit);
  const canvas = transparentPng(canvasSize, canvasSize);
  const x = Math.floor((canvasSize - contained.width) / 2);
  const y = baseline - contained.height;
  if (x < 24 || y < 24 || x + contained.width > canvasSize - 24) {
    throw new Error(`Character violates master breathing room: ${JSON.stringify({ x, y, width: contained.width, height: contained.height })}`);
  }
  PNG.bitblt(contained, canvas, 0, 0, contained.width, contained.height, x, y);
  zeroTransparentRgb(canvas);
  return canvas;
}

function composeSheet(sources) {
  const output = transparentPng(config.sheet.width, config.sheet.height);
  for (const [index, source] of sources.entries()) {
    const column = index % config.sheet.columns;
    const row = Math.floor(index / config.sheet.columns);
    PNG.bitblt(
      source,
      output,
      0,
      0,
      config.masterSize,
      config.masterSize,
      column * config.masterSize,
      row * config.masterSize,
    );
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
  const bounds = visibleBounds(source, 8);
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const result = transparentPng(width, height);
  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY = bounds.top + Math.min(
      bounds.height - 1,
      Math.floor((destinationY * bounds.height) / height),
    );
    for (let destinationX = 0; destinationX < width; destinationX += 1) {
      const sourceX = bounds.left + Math.min(
        bounds.width - 1,
        Math.floor((destinationX * bounds.width) / width),
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const destinationOffset = (destinationY * width + destinationX) * 4;
      source.data.copy(result.data, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
  zeroTransparentRgb(result);
  return result;
}

function resizeNearest(source, width, height) {
  const result = transparentPng(width, height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y * source.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x * source.width) / width));
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const destinationOffset = (y * width + x) * 4;
      source.data.copy(result.data, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
  zeroTransparentRgb(result);
  return result;
}

function visibleBounds(png, alphaFloor = 8) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(y * png.width + x) * 4 + 3];
      if (alpha < alphaFloor) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Avatar source contains no visible pixels");
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function clearFaintAlpha(png, maximumAlpha) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] <= maximumAlpha) png.data.fill(0, offset, offset + 4);
  }
}

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] === 0) png.data.fill(0, offset, offset + 4);
  }
}

function hasTransparentPixel(png) {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function outputPath(relativePath) {
  return `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/${relativePath}`;
}

function localPath(repositoryRelativePath) {
  const prefix = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
  if (!repositoryRelativePath.startsWith(prefix)) {
    throw new Error(`Review asset escaped review directory: ${repositoryRelativePath}`);
  }
  return repositoryRelativePath.slice(prefix.length);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function characterCard(character, index) {
  const master = localPath(character.master.path);
  const optical128 = localPath(character.optical128.path);
  const optical64 = localPath(character.optical64.path);
  const referenceFilename = path.posix.basename(character.reference.path);
  const anchor = index === 0 ? '<span class="anchor">Warrior family anchor</span>' : "";
  return `<article class="character-card" data-character="${character.id}">
    <div class="master-stage"><img src="${master}" alt="${escapeHtml(character.label)} transparent master" data-master="${character.id}"></div>
    <div class="character-copy"><div class="eyebrow">${escapeHtml(character.role)}</div><h3>${escapeHtml(character.label)}</h3>${anchor}<p>${escapeHtml(character.identity)}</p><dl><div><dt>Pose</dt><dd>${escapeHtml(character.pose)}</dd></div><div><dt>Palette</dt><dd>${escapeHtml(character.palette)}</dd></div></dl><code class="reference-filename" data-reference-filename="${character.id}">${escapeHtml(referenceFilename)}</code></div>
    <div class="optical-row">
      <figure><div class="optical-stage"><img src="${optical128}" width="128" height="128" alt="${escapeHtml(character.label)} real 128 pixel output" data-optical-size="128"></div><figcaption>Real 128 px</figcaption></figure>
      <figure><div class="optical-stage compact"><img src="${optical64}" width="64" height="64" alt="${escapeHtml(character.label)} real 64 pixel output" data-optical-size="64"></div><figcaption>Real 64 px</figcaption></figure>
      <figure><div class="optical-stage compact grayscale"><img src="${optical64}" width="64" height="64" alt="${escapeHtml(character.label)} grayscale output" data-grayscale-preview></div><figcaption>64 px grayscale</figcaption></figure>
      <figure><div class="optical-stage compact silhouette"><img src="${optical64}" width="64" height="64" alt="${escapeHtml(character.label)} silhouette" data-silhouette-preview></div><figcaption>Silhouette</figcaption></figure>
    </div>
    <div class="hash"><span>Exact master SHA-256</span><code>${character.master.sha256}</code></div>
  </article>`;
}

function identityCard(character) {
  return `<article class="identity-card"><div class="lineage-pair"><figure><div class="reference-stage"><img src="${localPath(character.reference.path)}" alt="${escapeHtml(character.label)} approved portrait and full-body reference" data-reference="${character.id}"></div><figcaption>Approved concept sheet</figcaption></figure><figure><div class="derived-stage"><img src="${localPath(character.master.path)}" alt="${escapeHtml(character.label)} derived transparent master" data-lineage-master="${character.id}"></div><figcaption>Derived 512 master</figcaption></figure></div><div class="identity-copy"><h3>${escapeHtml(character.label)}</h3><p><strong>Portrait controls identity</strong> · face, age, skin tone, hair, and expression.</p><p><strong>Full body controls pose and silhouette</strong> · proportion, stance, clothing mass, equipment, and occupation.</p><code>${path.posix.basename(character.reference.path)}</code></div></article>`;
}

function renderReview(manifest) {
  const approved = manifest.decision === "approved";
  const statusLabel = approved ? "approved visual calibration" : "awaiting visual calibration";
  const statusDetail = approved
    ? "Exact review hashes approved · no runtime asset changes"
    : "Review-only evidence · no runtime asset changes";
  const boundaryStatus = approved
    ? "are approved as exact review evidence"
    : "remain awaiting visual calibration";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avatar / Classes character family</title>
<style>
:root{color-scheme:dark;--navy:#111827;--ink:#17100d;--paper:#f5e6bf;--muted:#cbb996;--line:#735238;--gold:#e7af42;--teal:#76a99c}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0,#403027 0,transparent 32%),linear-gradient(150deg,#16110e,#24160f 55%,#0d0d0d);color:var(--paper);font-family:Georgia,'Times New Roman',serif;line-height:1.5}main{width:min(1440px,calc(100% - 32px));margin:auto;padding:48px 0 88px}.eyebrow{font:700 11px/1.3 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#dfb55f}.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:28px;align-items:end;border:1px solid #8b6846;background:linear-gradient(135deg,#35231bdd,#1d1511ee);padding:clamp(24px,5vw,64px);box-shadow:0 20px 70px #0008}.hero h1{font-size:clamp(42px,7vw,88px);line-height:.94;letter-spacing:-.04em;margin:.15em 0 .28em}.hero p{max-width:68ch;color:#dac7a4}.status{border-left:4px solid var(--gold);padding:16px 18px;background:#100c0aaa}.status strong,.status span{display:block}.status strong{color:#f5cc72}.status span{margin-top:6px;color:#c8b591}.sheet{margin:28px 0 64px;border:1px solid #6f5034;background:var(--navy);padding:16px}.sheet img{display:block;width:100%;height:auto;image-rendering:pixelated}.section-heading{display:flex;justify-content:space-between;gap:28px;align-items:end;margin:64px 0 22px}.section-heading h2{font-size:clamp(30px,4vw,50px);line-height:1;margin:.2em 0}.section-heading p{max-width:60ch;color:var(--muted)}.character-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.character-card{min-width:0;border:1px solid var(--line);background:linear-gradient(#2b1d16,#19120e);box-shadow:0 12px 30px #0005}.master-stage{aspect-ratio:1;display:grid;place-items:center;background:var(--navy);border-bottom:1px solid var(--line);overflow:hidden}.master-stage img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.character-copy{padding:18px;min-height:278px}.character-copy h3{font-size:26px;margin:.25em 0}.character-copy p{font-size:14px;color:#d1bea0}.anchor{display:inline-block;background:#d8a642;color:#24180d;padding:4px 7px;font:800 10px system-ui,sans-serif;border:2px solid #24180d}.character-copy dl{margin:16px 0 0}.character-copy dl div{display:grid;grid-template-columns:58px 1fr;gap:8px;margin-top:7px}.character-copy dt{font:700 10px system-ui,sans-serif;text-transform:uppercase;color:#dcb664}.character-copy dd{margin:0;font-size:13px;color:#cbb996}.reference-filename{display:block;margin-top:14px;overflow-wrap:anywhere;color:#91bdb0;font-size:10px}.optical-row{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.optical-row figure{margin:0;background:#16110e;padding:12px;min-width:0}.optical-stage{height:140px;display:grid;place-items:center;background:var(--navy)}.optical-stage.compact{height:76px}.optical-stage img{display:block;max-width:100%;image-rendering:pixelated}.grayscale img{filter:grayscale(1)}.silhouette img{filter:brightness(0)}figcaption{font:600 10px/1.3 system-ui,sans-serif;color:#b8a787;margin-top:7px}.hash{padding:14px 18px;overflow:hidden}.hash span{display:block;font:700 10px system-ui,sans-serif;color:#cfad6b;text-transform:uppercase;letter-spacing:.1em}.hash code{display:block;margin-top:6px;overflow-wrap:anywhere;color:#a8c8bd;font-size:10px}.identity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.identity-card{min-width:0;border:1px solid var(--line);background:#1e1510}.lineage-pair{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(120px,.8fr);gap:1px;background:var(--line)}.lineage-pair figure{min-width:0;margin:0;background:#16110e;padding:8px}.reference-stage,.derived-stage{height:280px;display:grid;place-items:center;background:var(--navy)}.reference-stage img{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.derived-stage img{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.identity-copy{padding:18px}.identity-copy h3{font-size:25px;margin:0}.identity-copy p{color:#cbb996;font-size:13px}.identity-copy strong{color:#efd084}.identity-copy code{display:block;overflow-wrap:anywhere;color:#91bdb0;font-size:10px}.rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.rule{border:1px solid var(--line);background:#21160f;padding:24px}.rule h3{margin-top:0}.rule p{color:#cbb996}.boundary{margin-top:64px;border:1px solid var(--teal);background:#12201d;padding:28px}.boundary h2{margin:0 0 8px}.boundary p{margin:0;color:#bad0c9}.footnote{font:12px system-ui,sans-serif;color:#99886f;margin-top:22px;overflow-wrap:anywhere}@media(max-width:1080px){.character-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{grid-template-columns:1fr}}@media(max-width:720px){main{width:min(calc(100% - 20px),1440px);padding-top:10px}.hero{padding:24px 18px}.character-grid,.identity-grid,.rules{grid-template-columns:1fr}.section-heading{display:block}.character-copy{min-height:0}.hash code{font-size:9px}.optical-row figure{padding:9px}.optical-stage{height:132px}.lineage-pair{grid-template-columns:1fr}.reference-stage,.derived-stage{height:auto;min-height:220px}.derived-stage{height:280px}}
</style></head><body><main>
<header class="hero"><div><div class="eyebrow">Page Visual Optimization · Phase 1</div><h1>Avatar / Classes character family</h1><p>Eight approved identities translated into transparent, deterministic review masters. The shared system preserves class silhouette, individual personality, handcrafted pixel clusters, and role-specific experience without promoting any asset to the product.</p></div><aside class="status"><strong>${statusLabel}</strong><span>${statusDetail}</span></aside></header>
<div class="sheet"><img src="${localPath(manifest.sheet.path)}" alt="Eight-character transparent calibration sheet"></div>
<section><div class="section-heading"><div><div class="eyebrow">Live role labels</div><h2>One family, eight readable jobs</h2></div><p>Every master shares a 512 px transparent canvas and a common foot baseline. Compare silhouette, apparent head ratio, garment pixel clusters, prop clarity, and material weight.</p></div><div class="character-grid">${manifest.characters.map(characterCard).join("")}</div></section>
<section><div class="section-heading"><div><div class="eyebrow">Identity lineage</div><h2>Portrait and full-body authority</h2></div><p>The approved concept sheets remain visible beside the derived masters so facial identity and full-body construction can be judged independently.</p></div><div class="identity-grid">${manifest.characters.map(identityCard).join("")}</div></section>
<section><div class="section-heading"><div><div class="eyebrow">Family construction</div><h2>Rules held across the roster</h2></div><p>Consistency is shared resolution and construction logic, not identical armor weight or identical poses.</p></div><div class="rules"><article class="rule"><h3>2.25-head baseline</h3><p>The warrior remains the apparent proportion anchor. Role-specific stance may compress or open the silhouette, but no character should read as a different age scale or source resolution.</p></article><article class="rule"><h3>Medium garment clusters</h3><p>Hair, hats, capes, coats, trousers, and boots use the shared medium cluster scale. Faces, hands, strings, flask rims, compass marks, and staff heads may be one level finer.</p></article><article class="rule"><h3>Controlled experience</h3><p>Folds, edge wear, scuffs, and practical equipment communicate history. Random dirt, corrosion, identical distress, and AI-like texture noise are excluded.</p></article><article class="rule"><h3>Repeated colors stay distinct</h3><p>Warrior red reads as metal and plume; bard red reads as cloth and performance wear. Silhouette and material separate repeated hues.</p></article></div></section>
<section class="boundary"><h2>Review boundary</h2><p>These exact references, transparent ImageGen sources, masters, and optical outputs ${boundaryStatus}. There are <strong>no runtime asset changes</strong>, no asset-registry edits, no product-page integration, no animation, and no Phase 2 work.</p></section>
<p class="footnote">Deterministic review sheet SHA-256 · ${manifest.sheet.sha256}</p>
</main></body></html>`;
}
