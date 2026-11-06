import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  eventStatusApproval,
  eventStatusIcons,
} from "./event-status-icons.config.mjs";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(path.join(repositoryDirectory, "web/node_modules/pngjs"));
const sourceDirectory = path.join(
  reviewDirectory,
  "samples/derivations/event-status",
);
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
  const masterSha256 = sha256(masterBytes);
  const approvedMasterSha256 = eventStatusApproval.masterSha256ById[icon.id];
  if (masterSha256 !== approvedMasterSha256) {
    throw new Error(
      `${icon.id} master SHA-256 ${masterSha256} does not match approved ${approvedMasterSha256}`,
    );
  }
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
      sha256: masterSha256,
    },
    optical48: {
      path: repoPath(path.join(opticalDirectory, masterFilename)),
      width: 48,
      height: 48,
      sha256: sha256(opticalBytes),
    },
  });
}

const manifest = {
  approvedOn: eventStatusApproval.approvedOn,
  decision: "approved",
  icons: manifestIcons,
};
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
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) {
    throw new Error("Source has no visible pixels");
  }
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderReviewPage(entries) {
  const cards = entries
    .map((entry) => {
      const icon = eventStatusIcons.find(({ id }) => id === entry.id);
      if (!icon) throw new Error(`Missing metadata for ${entry.id}`);
      return `
      <article class="icon-card" data-icon="${icon.id}" data-decision="approved">
        <div class="master"><img src="samples/event-status/${icon.id}.png" alt="${escapeHtml(icon.alt)}"></div>
        <div class="copy"><p class="kind">${icon.id.startsWith("status-") ? "STATUS" : "EVENT"}</p><h2>${escapeHtml(icon.label)}</h2><p>${escapeHtml(icon.objects)}</p><p class="boundary">${escapeHtml(icon.boundary)}</p></div>
        <div class="proof" data-preview-size="48"><span>48 px</span><img src="samples/event-status/optical-48/${icon.id}.png" alt="${escapeHtml(icon.alt)}的 48 像素預覽"></div>
        <div class="proof grayscale-proof" data-grayscale-preview><span>48 px grayscale</span><img src="samples/event-status/optical-48/${icon.id}.png" alt="${escapeHtml(icon.alt)}的灰階預覽"></div>
        <code>MASTER SHA-256 ${entry.master.sha256}</code>
      </article>`;
    })
    .join("");
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mimic Event / Status Icon Review</title>
<style>
:root{color-scheme:dark;--night:#080c1c;--panel:#121a32;--line:#465071;--paper:#f1dfb7;--dim:#b9aa87;--gold:#f2b638;--teal:#79b4b0}*{box-sizing:border-box}body{margin:0;background:var(--night);color:var(--paper);font-family:"Segoe UI",system-ui,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:40px 0 72px}h1,h2,p{margin:0}header{display:grid;grid-template-columns:1fr minmax(280px,420px);gap:28px;align-items:end;margin-bottom:28px}h1{font:700 clamp(40px,7vw,72px)/.95 Georgia,serif}header>p{border-left:4px solid var(--gold);padding:14px 16px;color:var(--dim);line-height:1.6}.icon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.icon-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;min-width:0;padding:18px;border:1px solid var(--line);background:var(--panel)}.master{grid-column:1/-1;display:grid;place-items:center;min-height:220px;background:#0b1124}.master img{width:192px;height:192px;max-width:100%;object-fit:contain;image-rendering:pixelated}.copy{grid-column:1/-1;min-width:0}.kind{color:var(--gold);font:11px Consolas,monospace;letter-spacing:.1em}.copy h2{margin-top:6px}.copy>p:not(.kind){margin-top:8px;color:var(--dim);line-height:1.5}.boundary{border-left:3px solid var(--teal);padding-left:10px}.proof{display:grid;place-items:center;gap:8px;min-width:0;min-height:100px;background:#0b1124;color:var(--dim);font-size:12px;text-align:center}.proof img{width:48px;height:48px;image-rendering:pixelated}.grayscale-proof img{filter:grayscale(1)}code{grid-column:1/-1;min-width:0;color:#8d96af;font-size:10px;overflow-wrap:anywhere}.controls,.rules{margin-top:24px;padding:22px;border:1px solid var(--line);background:var(--panel)}.control-images{display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-top:16px;align-items:center}.control-images img{display:block;max-width:100%;margin:auto;image-rendering:pixelated}.rules{display:grid;grid-template-columns:1fr 1fr;gap:18px;line-height:1.6;color:var(--dim)}.rules strong{display:block;color:var(--paper)}
@media(max-width:900px){.icon-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){header,.icon-grid,.rules{grid-template-columns:1fr}.control-images{grid-template-columns:1fr}}@media(max-width:390px){main{width:calc(100% - 20px);padding-top:26px}.icon-card{padding:14px}.master{min-height:200px}}
</style></head><body><main><header><h1>Event / Status icons</h1><p>Event / Status artwork approved at exact hashes. Icons family calibration approved; Gate A remains open.</p></header><section class="icon-grid" aria-label="Nine event and status icon directions">${cards}</section><section class="controls"><h2>Approved family controls</h2><div class="control-images"><img src="samples/icons-calibration.png" alt="已核准的導航與模式 icon 對照"><img src="samples/record-expense-action/record-expense-action-v01.png" alt="已核准的記一筆支出 Action icon"></div></section><section class="rules"><p><strong>Live-HTML boundary</strong>Every future consumer retains a visible label or independent accessible name.</p><p><strong>Accounting boundary</strong>Personal, shared, and pooled meanings stay separate; corrections remain new records and never reopen locked periods.</p><p><strong>Phase boundary</strong>Review-only files outside web/public; no runtime asset changes.</p></section></main></body></html>\n`;
}
