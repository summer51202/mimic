import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { iconOpticalEvidence } from "./icon-optical-evidence.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web/node_modules/pngjs"));
const masterDirectory = path.join(
  reviewDirectory,
  "samples/icon-optical-evidence/masters",
);
const opticalDirectory = path.join(
  reviewDirectory,
  "samples/icon-optical-evidence/optical-48",
);
const eventManifest = JSON.parse(
  await readFile(path.join(reviewDirectory, "event-status-icons.manifest.json"), "utf8"),
);

await mkdir(masterDirectory, { recursive: true });
await mkdir(opticalDirectory, { recursive: true });

const sourceCache = new Map();
const manifestIcons = [];
for (const icon of iconOpticalEvidence.icons) {
  const sourcePath = path.join(reviewDirectory, icon.source);
  const sourceBytes = await readFile(sourcePath);
  const source = sourceCache.get(icon.source) ?? PNG.sync.read(sourceBytes);
  sourceCache.set(icon.source, source);

  let master;
  if (icon.preserve192) {
    master = clonePng(source);
  } else if (icon.sourceCanvas) {
    const crop = cropPng(source, icon.crop);
    const canvas = new PNG({
      width: icon.sourceCanvas,
      height: icon.sourceCanvas,
      colorType: 6,
    });
    canvas.data.fill(0);
    blit(
      crop,
      canvas,
      Math.floor((icon.sourceCanvas - crop.width) / 2),
      Math.floor((icon.sourceCanvas - crop.height) / 2),
    );
    master = resizeNearest(
      canvas,
      iconOpticalEvidence.masterSize,
      iconOpticalEvidence.masterSize,
    );
  } else {
    const crop = icon.crop ? cropPng(source, icon.crop) : source;
    master = containNearest(
      crop,
      findAlphaBounds(crop),
      iconOpticalEvidence.masterSize,
      icon.fit,
    );
  }

  zeroTransparentRgb(master);
  assertRaster(master, iconOpticalEvidence.masterSize, icon.id);
  const masterBytes = PNG.sync.write(master);
  const masterPath = path.join(masterDirectory, icon.id + ".png");
  await writeFile(masterPath, masterBytes);

  const optical = resizeNearest(
    master,
    iconOpticalEvidence.opticalSize,
    iconOpticalEvidence.opticalSize,
  );
  zeroTransparentRgb(optical);
  assertRaster(optical, iconOpticalEvidence.opticalSize, icon.id + " optical");
  const opticalBytes = PNG.sync.write(optical);
  const opticalPath = path.join(opticalDirectory, icon.id + ".png");
  await writeFile(opticalPath, opticalBytes);

  manifestIcons.push({
    id: icon.id,
    label: icon.label,
    meaning: icon.meaning,
    source: {
      path: repoPath(sourcePath),
      sha256: sha256(sourceBytes),
    },
    master: {
      path: repoPath(masterPath),
      width: iconOpticalEvidence.masterSize,
      height: iconOpticalEvidence.masterSize,
      sha256: sha256(masterBytes),
    },
    optical48: {
      path: repoPath(opticalPath),
      width: iconOpticalEvidence.opticalSize,
      height: iconOpticalEvidence.opticalSize,
      sha256: sha256(opticalBytes),
      derivedFrom: repoPath(masterPath),
      resizeKernel: iconOpticalEvidence.resizeKernel,
    },
  });
}

const manifest = {
  decision: iconOpticalEvidence.decision,
  reviewOnly: iconOpticalEvidence.reviewOnly,
  runtimePromotion: false,
  strategy: "approved-source-to-192-master-to-48-optical",
  icons: manifestIcons,
};
await writeFile(
  path.join(reviewDirectory, "icon-optical-evidence.manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  path.join(reviewDirectory, "icon-optical-evidence-review.html"),
  renderReviewPage(manifestIcons, eventManifest.icons),
);

console.log(
  "icon optical evidence composed: " +
    manifestIcons.map((entry) => entry.id + "=" + entry.optical48.sha256).join(" "),
);

function cropPng(source, rectangle) {
  const output = new PNG({
    width: rectangle.width,
    height: rectangle.height,
    colorType: 6,
  });
  output.data.fill(0);
  for (let y = 0; y < rectangle.height; y += 1) {
    for (let x = 0; x < rectangle.width; x += 1) {
      const sourceX = rectangle.x + x;
      const sourceY = rectangle.y + y;
      if (
        sourceX < 0 ||
        sourceY < 0 ||
        sourceX >= source.width ||
        sourceY >= source.height
      ) continue;
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const outputOffset = (y * output.width + x) * 4;
      source.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return output;
}

function clonePng(source) {
  const output = new PNG({
    width: source.width,
    height: source.height,
    colorType: 6,
  });
  source.data.copy(output.data);
  return output;
}

function blit(source, output, left, top) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const outputX = left + x;
      const outputY = top + y;
      if (
        outputX < 0 ||
        outputY < 0 ||
        outputX >= output.width ||
        outputY >= output.height
      ) continue;
      const sourceOffset = (y * source.width + x) * 4;
      const outputOffset = (outputY * output.width + outputX) * 4;
      source.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

function containNearest(source, bounds, canvasSize, contentSize) {
  const output = new PNG({ width: canvasSize, height: canvasSize, colorType: 6 });
  output.data.fill(0);
  const scale = Math.min(contentSize / bounds.width, contentSize / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const left = Math.floor((canvasSize - width) / 2);
  const top = Math.floor((canvasSize - height) / 2);
  for (let y = 0; y < height; y += 1) {
    const sourceY =
      bounds.top +
      Math.min(bounds.height - 1, Math.floor((y * bounds.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX =
        bounds.left +
        Math.min(bounds.width - 1, Math.floor((x * bounds.width) / width));
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
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((x * source.width) / width),
      );
      const sourceY = Math.min(
        source.height - 1,
        Math.floor((y * source.height) / height),
      );
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
      if (png.data[(y * png.width + x) * 4 + 3] < 16) continue;
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
    throw new Error(label + " must be " + size + " by " + size);
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderReviewPage(entries, eventEntries) {
  const cards = entries.map((entry) => {
    const relativeMaster = path
      .relative(reviewDirectory, path.resolve(repositoryDirectory, entry.master.path))
      .replaceAll("\\", "/");
    const relativeOptical = path
      .relative(reviewDirectory, path.resolve(repositoryDirectory, entry.optical48.path))
      .replaceAll("\\", "/");
    return [
      '<article class="icon-card" data-icon="' + entry.id + '">',
      '<div class="master"><img src="' + relativeMaster + '" alt="' + escapeHtml(entry.meaning) + '"></div>',
      '<div class="copy"><p class="kind">' + escapeHtml(entry.id.split("-")[0]) + '</p><h2>' + escapeHtml(entry.label) + '</h2><p>' + escapeHtml(entry.meaning) + '</p></div>',
      '<figure class="proof" data-preview-size="48"><figcaption>True 48px</figcaption><img src="' + relativeOptical + '" alt="' + escapeHtml(entry.label) + ' 48 pixel icon"></figure>',
      '<figure class="proof grayscale" data-grayscale-preview><figcaption>48px grayscale</figcaption><img src="' + relativeOptical + '" alt="' + escapeHtml(entry.label) + ' grayscale icon"></figure>',
      '<code>MASTER ' + entry.master.sha256 + '<br>48PX ' + entry.optical48.sha256 + '</code>',
      '</article>',
    ].join("");
  }).join("");

  const eventCards = eventEntries.map((entry) => {
    const relativeOptical = path
      .relative(reviewDirectory, path.resolve(repositoryDirectory, entry.optical48.path))
      .replaceAll("\\", "/");
    return [
      '<article class="context-card" data-context-icon="' + entry.id + '">',
      '<h3>' + escapeHtml(entry.id) + '</h3>',
      '<div class="pair">',
      '<figure class="proof" data-preview-size="48"><figcaption>True 48px</figcaption><img src="' + relativeOptical + '" alt="' + escapeHtml(entry.id) + ' icon"></figure>',
      '<figure class="proof grayscale" data-grayscale-preview><figcaption>Grayscale</figcaption><img src="' + relativeOptical + '" alt="' + escapeHtml(entry.id) + ' grayscale icon"></figure>',
      '</div></article>',
    ].join("");
  }).join("");

  return [
    '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Mimic Complete 48px UI Icon Evidence</title><style>',
    ':root{color-scheme:dark;--night:#080c1c;--panel:#131a31;--panel2:#0c1125;--line:#4b536c;--paper:#f3e4bd;--dim:#b8ad91;--gold:#f0b93d;--teal:#78b5ae}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0;background:radial-gradient(circle at 50% -10%,#29315b 0,var(--night) 54%);color:var(--paper);font:15px/1.5 "Segoe UI",system-ui,sans-serif}main{width:min(1220px,calc(100% - 32px));margin:auto;padding:42px 0 70px}h1,h2,h3,p,figure{margin:0}header{display:grid;grid-template-columns:1fr minmax(280px,430px);gap:26px;align-items:end;margin-bottom:26px}.eyebrow,.kind{color:var(--gold);font:800 11px/1.2 Consolas,monospace;letter-spacing:.11em;text-transform:uppercase}h1{margin-top:7px;font:700 clamp(40px,7vw,72px)/.96 Georgia,serif}.status{padding:16px 18px;border-left:4px solid var(--gold);background:var(--panel);color:var(--dim)}.section-title{margin:30px 0 14px}.section-title h2{font:700 28px/1.1 Georgia,serif}.section-title p{margin-top:7px;color:var(--dim)}.icon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.icon-card{display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:0;padding:16px;border:1px solid var(--line);background:var(--panel)}.master{grid-column:1/-1;display:grid;place-items:center;min-height:210px;background:var(--panel2)}.master img{display:block;width:192px;height:192px;max-width:100%;object-fit:contain;image-rendering:pixelated}.copy{grid-column:1/-1}.copy h2{margin-top:4px;font:700 22px/1.1 Georgia,serif}.copy p:last-child{margin-top:7px;color:var(--dim)}.proof{display:grid;place-items:center;gap:8px;min-height:92px;padding:9px;background:var(--panel2);color:var(--dim);font-size:11px;text-align:center}.proof img{display:block;width:48px;height:48px;image-rendering:pixelated}.grayscale img{filter:grayscale(1)}code{grid-column:1/-1;color:#919ab2;font-size:9px;overflow-wrap:anywhere}.context-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.context-card{min-width:0;padding:13px;background:var(--panel);border:1px solid var(--line)}.context-card h3{font:700 14px/1.2 Consolas,monospace;overflow-wrap:anywhere}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.boundaries{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.boundary{padding:17px;border-top:3px solid var(--teal);background:var(--panel);color:var(--dim)}.boundary strong{display:block;margin-bottom:6px;color:var(--paper)}',
    '@media(max-width:900px){.icon-grid,.context-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){header,.boundaries{grid-template-columns:1fr}.icon-grid,.context-grid{grid-template-columns:1fr}}@media(max-width:390px){main{width:calc(100% - 20px);padding-top:26px}.icon-card{padding:12px}}',
    '</style></head><body><main><header><div><p class="eyebrow">Page Visual Optimization · Phase 1</p><h1>Complete 48px UI icon evidence</h1></div><p class="status">Exact-hash optical evidence approved. All Icons calibration directions are approved; Gate A remains open for other families.</p></header>',
    '<section><div class="section-title"><h2>Final missing optical exports</h2><p>Nine approved directions normalized into deterministic 192px review masters and direct nearest-neighbor 48px exports.</p></div><div class="icon-grid">' + cards + '</div></section>',
    '<section><div class="section-title"><h2>Event / Status exact-hash context</h2><p>The nine already-approved 48px exports are shown unchanged to compare scale, density, and grayscale silhouette.</p></div><div class="context-grid">' + eventCards + '</div></section>',
    '<section class="boundaries"><p class="boundary"><strong>Live semantic labels remain required</strong>Every navigation, mode, action, event, and status consumer keeps visible text or an independent accessible name.</p><p class="boundary"><strong>Review-only</strong>All outputs remain under docs/design; no runtime asset changes and no web/public promotion.</p><p class="boundary"><strong>Gate remains open</strong>Icons family calibration approved. Gate A remains open until the other asset families receive explicit approval.</p></section>',
    '</main></body></html>\n',
  ].join("");
}
