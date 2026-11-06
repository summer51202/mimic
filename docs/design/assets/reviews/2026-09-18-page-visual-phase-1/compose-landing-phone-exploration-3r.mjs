import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../../../../..");
const {PNG} = createRequire(path.join(repo, "web/package.json"))("pngjs");
const dir = import.meta.dirname;
const output = path.join(dir, "samples/landing-phone-exploration-3r");
const lineage = path.join(dir, "samples/derivations/landing-phone-exploration-3r");
const receiptFile = path.join(dir, "samples/derivations/landing-prop-placement-receipts/phone-exploration-receipt.json");
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const relative = file => path.relative(repo, file).split(path.sep).join("/");
const receipt = readJson(receiptFile);
const oldManifest = readJson(path.join(dir, "landing-prop-position-exploration.manifest.json"));
function verified(asset) {
  const bytes = readFileSync(path.join(repo, asset.path));
  assert.equal(hash(bytes), asset.sha256, asset.path);
  const png = PNG.sync.read(bytes);
  assert.deepEqual([png.width, png.height], [asset.width, asset.height]);
  return png;
}
function save(file, png) {
  const bytes = PNG.sync.write(png);
  writeFileSync(file, bytes);
  return {path: relative(file), sha256: hash(bytes), width: png.width, height: png.height};
}
const before = verified(receipt.scene);
const approved = verified(oldManifest.lineage.references[0]);
const attemptFile = path.join(lineage, "attempt-01.png");
const attemptBytes = readFileSync(attemptFile);
const attempt = PNG.sync.read(attemptBytes);
const {width, height} = before;
const bands = [[366, 390], [780, 804]];
const after = new PNG({width, height});
after.data.set(before.data);
const mask = new PNG({width, height});
const index = (x, y) => (y * width + x) * 4;
function generated(x, y, c) {
  const sx = Math.floor((x + 0.5) * attempt.width / width);
  const sy = Math.floor((y + 0.5) * attempt.height / height);
  return attempt.data[(sy * attempt.width + sx) * 4 + c];
}
for (const [start, end] of bands) {
  for (let y = 0; y < height; y++) {
    for (let x = start; x < end; x++) {
      const offset = index(x, y);
      mask.data.fill(255, offset, offset + 4);
      for (let c = 0; c < 3; c++) {
        // Match each original boundary with a correction that tapers into the generated stone.
        const left = before.data[index(start - 1, y) + c] - generated(start - 1, y, c);
        const right = before.data[index(end, y) + c] - generated(end, y, c);
        let value = generated(x, y, c) + left * Math.max(0, 1 - (x - start + 1) / 10)
          + right * Math.max(0, 1 - (end - x) / 10);
        const edge = end === 390 ? end : start - 1;
        const distance = Math.abs(x - edge);
        const blend = Math.max(0, 1 - distance / 8);
        value = value * (1 - blend) + before.data[index(edge, y) + c] * blend;
        after.data[offset + c] = Math.round(Math.max(0, Math.min(255, value)));
      }
      const [r, g, b] = after.data.subarray(offset, offset + 3);
      if (Math.max(g, b) > r) {
        after.data[offset] = Math.max(r, g, b);
        after.data[offset + 2] = Math.min(b, g);
      }
    }
  }
}
const contract = {window: 8, maxRatio: 1.20, coolHue: [90, 270], minimumSaturation: 0.12,
  bands, reference: [[318, 366], [804, 852]], seams: [390, 780]};
function difference(png, start, end) {
  let total = 0;
  for (let y = 0; y < height; y++) for (let x = start; x < end; x++) {
    for (let c = 0; c < 3; c++) {
      total += Math.abs(png.data[index(x, y) + c] - png.data[index(x - 1, y) + c]);
    }
  }
  return total / ((end - start) * height * 3);
}
function coolFraction(png, [start, end]) {
  let cool = 0;
  for (let y = 0; y < height; y++) for (let x = start; x < end; x++) {
    const i = index(x, y);
    const [r, g, b] = png.data.subarray(i, i + 3);
    const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
    if (!delta || delta / max < contract.minimumSaturation) continue;
    const sector = max === r ? (g - b) / delta : max === g ? 2 + (b - r) / delta : 4 + (r - g) / delta;
    const hue = (60 * sector + 360) % 360;
    if (hue >= contract.coolHue[0] && hue <= contract.coolHue[1]) cool++;
  }
  return cool / ((end - start) * height);
}
function measure(png) {
  return bands.map((band, i) => {
    const seam = contract.seams[i], [start, end] = contract.reference[i];
    const baseline = difference(png, start + 1, end);
    const mean = difference(png, seam - contract.window + 1, seam + contract.window);
    const ratio = mean / baseline;
    const cool = coolFraction(png, band), baselineCool = coolFraction(png, [start, end]);
    return {seam, mean, baseline, ratio, cool, baselineCool,
      pass: ratio <= contract.maxRatio && cool <= baselineCool};
  });
}
const metrics = {before: measure(before), after: measure(after)};
console.log(JSON.stringify(metrics, null, 2));
assert.ok(metrics.before.every(seam => !seam.pass), "Each original seam must fail");
assert.ok(metrics.after.every(seam => seam.pass), "Both repaired seams must pass");
let centerChangedPixels = 0, outsideChangedPixels = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = index(x, y);
  const pixel = after.data.subarray(i, i + 4);
  if (x >= 390 && x < 780) {
    const j = (y * approved.width + x - 390) * 4;
    if (!pixel.equals(approved.data.subarray(j, j + 4))) centerChangedPixels++;
  }
  if (!bands.some(([start, end]) => x >= start && x < end) &&
      !pixel.equals(before.data.subarray(i, i + 4))) outsideChangedPixels++;
}
assert.equal(centerChangedPixels, 0);
assert.equal(outsideChangedPixels, 0);
mkdirSync(output, {recursive: true});
const scene = save(path.join(output, "phone-architecture.png"), after);
const maskAsset = save(path.join(lineage, "mask.png"), mask);

const oldLayout = readJson(path.join(dir, "samples/landing-phone-exploration/layout.json"));
assert.deepEqual(receipt.frame, oldManifest.frames.phone.frame);
assert.deepEqual(receipt.fixed, oldLayout.fixed);
const propsIds = {chest: "ancient-treasure-chest-v04", torch: "torchHigh", explorationBats: "bats", mapCrate: "mapCrate"};
const layers = [
  ...receipt.fixed.map(asset => ({...asset, propsId: propsIds[asset.id] ?? asset.id})),
  ...receipt.objects.map(({id, origin, ground, depth, source, variants, opacity}) => {
    assert.equal(depth, ground.y);
    return {id, propsId: propsIds[id], path: source.path, sha256: source.sha256,
      x: origin.x, y: origin.y, ground, depth, width: source.width, height: source.height, variants, opacity};
  }),
].sort((a, b) => a.depth - b.depth);
assert.deepEqual(layers.map(layer => layer.id), receipt.layerOrder);
const chest = layers.find(layer => layer.id === "chest");
const frames = Object.keys(chest.variants);
assert.equal(frames.length, 8);
assert.equal(new Set(Object.values(chest.variants).map(frame => frame.sha256)).size, 8);
assert.equal(chest.variants.closed.bounds.height, 2 * layers.find(layer => layer.id === "mapCrate").height);
const sprites = new Map();
for (const layer of layers) {
  for (const asset of [layer, ...Object.values(layer.variants ?? {})]) {
    sprites.set(asset.path, verified(asset));
  }
  assert.ok(layer.x >= 0 && layer.y >= 0 && layer.x + layer.width <= width && layer.y + layer.height <= height);
  assert.ok(layer.opacity === undefined || layer.opacity === 1);
}
const layout = {...receipt.frame, scene, layers, signLabel: oldLayout.signLabel,
  receipt: {path: relative(receiptFile), sha256: hash(readFileSync(receiptFile)), sceneSha256: receipt.scene.sha256}};
function saveJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
saveJson(path.join(output, "layout.json"), layout);

const previews = Object.fromEntries(frames.map(frame => {
  const png = new PNG({width, height});
  png.data.set(after.data);
  for (const layer of layers) {
    const sprite = sprites.get(layer.id === "chest" ? chest.variants[frame].path : layer.path);
    for (let y = 0; y < sprite.height; y++) for (let x = 0; x < sprite.width; x++) {
      const source = (y * sprite.width + x) * 4;
      const target = index(layer.x + x, layer.y + y);
      const alpha = sprite.data[source + 3] / 255;
      for (let c = 0; c < 3; c++) {
        png.data[target + c] = Math.round(alpha * sprite.data[source + c] + (1 - alpha) * png.data[target + c]);
      }
    }
  }
  return [frame, save(path.join(output, `scene-${frame}.png`), png)];
}));

const url = asset => path.posix.relative(relative(dir), asset.path);
const comparisons = contract.seams.map(seam => {
  const images = [["修補前", receipt.scene], ["修補後", scene]].map(([label, asset]) =>
    `<figure><figcaption>${label}</figcaption><div class="zoom" tabindex="0"><img alt="${label} x=${seam}" src="${url(asset)}" style="left:-${(seam - 32) * 6}px"></div></figure>`);
  return `<h3>x = ${seam}</h3><div class="pair">${images.join("")}</div>`;
});
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3R 手機探索條 · 視覺審核</title>
<style>
*{box-sizing:border-box}body{margin:auto;max-width:1200px;padding:16px;background:#211710;color:#f8e4c9;font:16px system-ui}
button,select{font:inherit;margin:4px;padding:6px}img{display:block;image-rendering:pixelated}
#viewport{overflow-x:auto;max-width:390px;margin:12px 0}#scene{width:1170px;height:600px}
.pair{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;max-width:100%}.zoom{width:384px;max-width:100%;height:420px;overflow-y:auto;overflow-x:hidden;position:relative}
.zoom img{width:7020px;height:3600px;position:absolute;top:0}a{color:#ffcc8d}
</style><main><h1>3R 手機探索條</h1><p>待視覺審核。初始顯示中段，可水平捲動或使用分段按鈕。</p>
<label>開箱格 <select id="frame">${frames.map(frame => `<option>${frame}</option>`).join("")}</select></label>
${["左段", "中段", "右段"].map((label, i) => `<button data-x="${390 * i}">${label}</button>`).join("")}
<div id="viewport" tabindex="0"><img id="scene" alt="手機探索條合成" src="${url(previews.closed)}"></div>
<p><a id="full" href="${url(previews.closed)}">開啟全寬合成圖</a> · <a href="samples/landing-phone-exploration-3r/layout.json">layout.json</a></p>
<h2>接縫前後對照（6×）</h2><p>各圖可垂直捲動檢查全高。</p>${comparisons.join("")}</main>
<script>
const viewport = document.getElementById("viewport");
const scene = document.getElementById("scene");
const frames = ${JSON.stringify(Object.fromEntries(Object.entries(previews).map(([frame, asset]) => [frame, url(asset)])))};
viewport.scrollLeft = 390;
document.querySelectorAll("button[data-x]").forEach(button => button.onclick = () => viewport.scrollLeft = Number(button.dataset.x));
document.getElementById("frame").onchange = event => {
  scene.src = frames[event.target.value];
  document.getElementById("full").href = scene.src;
};
</script></html>`;
const reviewFile = path.join(dir, "landing-phone-exploration-3r-review.html");
writeFileSync(reviewFile, html);
const promptFile = path.join(lineage, "prompt.md");
saveJson(path.join(dir, "landing-phone-exploration-3r.manifest.json"), {
  reviewOnly: true, runtimePromotion: false, decision: "awaiting-visual-review", positionsApplied: true,
  lineage: {generator: "ImageGen", before: receipt.scene, approved: oldManifest.lineage.references[0],
    attempt: {path: relative(attemptFile), sha256: hash(attemptBytes), width: attempt.width, height: attempt.height},
    prompt: {path: relative(promptFile), sha256: hash(readFileSync(promptFile))}, mask: maskAsset,
    method: "Nearest coordinate registration, boundary color correction, inner-edge feather, warm gamut correction within mask"},
  contract, metrics, centerChangedPixels, outsideChangedPixels, layout, previews,
  review: {path: relative(reviewFile), sha256: hash(html)},
});
