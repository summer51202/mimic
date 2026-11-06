import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";

const dir = import.meta.dirname;
const repo = path.resolve(dir, "../../../../..");
const {PNG} = createRequire(path.join(repo, "web/package.json"))("pngjs");
const previous = "landing-phone-exploration-3r2";
const version = "landing-phone-exploration-3r3";
const old = JSON.parse(readFileSync(path.join(dir, previous + ".manifest.json"), "utf8"));
const output = path.join(dir, "samples", version);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const relative = file => path.relative(repo, file).split(path.sep).join("/");
const read = asset => {
  const bytes = readFileSync(path.join(repo, asset.path));
  assert.equal(hash(bytes), asset.sha256, asset.path);
  const png = PNG.sync.read(bytes);
  assert.deepEqual([png.width, png.height], [asset.width, asset.height]);
  return png;
};
const save = (name, png) => {
  const file = path.join(output, name);
  const bytes = PNG.sync.write(png);
  writeFileSync(file, bytes);
  return {path: relative(file), sha256: hash(bytes), width: png.width, height: png.height};
};

const source = read(old.layout.scene);
const {width, height} = source;
assert.deepEqual([width, height], [1170, 600]);
const corrected = new PNG({width, height});
corrected.data.set(source.data);
const offset = (x, y) => (y * width + x) * 4;
const rgb = (png, x, y) => png.data.subarray(offset(x, y), offset(x, y) + 3);
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contract = {
  seams: [390, 780], halfWidth: 12, windowRadius: 24, minSaturationRatio: 0.85,
  referenceOffsets: [-14, 13], sampleHalfWidth: 4, acceptanceOffsets: [-16, 16],
  minRatio: 0.92, bands: {wall: [60, 220], floor: [250, 430], foreground: [430, 600]},
  coolHue: [90, 330], minimumSaturation: 0.12,
  colorProtection: "Interpolate warm reference chroma at constant BT.709 Y",
};
function isCool([r, g, b]) {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta || delta / max < contract.minimumSaturation) return false;
  const sector = max === r ? (g - b) / delta : max === g ? 2 + (b - r) / delta : 4 + (r - g) / delta;
  const hue = (60 * sector + 360) % 360;
  return hue >= contract.coolHue[0] && hue <= contract.coolHue[1];
}
function mean(png, x0, x1, y0, y1, measure) {
  let sum = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += measure(rgb(png, x, y));
  return sum / ((x1 - x0) * (y1 - y0));
}
const saturation = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};
function measure(png) {
  return contract.seams.flatMap(seam => Object.entries(contract.bands).map(([band, [y0, y1]]) => {
    const [left, right] = contract.acceptanceOffsets.map(dx => seam + dx);
    const half = contract.sampleHalfWidth;
    const ratio = metric => mean(png, seam - half, seam + half, y0, y1, metric) /
      ((mean(png, left, left + 1, y0, y1, metric) + mean(png, right, right + 1, y0, y1, metric)) / 2);
    return {
      seam, band, lumaRatio: ratio(luma), saturationRatio: ratio(saturation),
      cool: mean(png, seam - contract.halfWidth, seam + contract.halfWidth, y0, y1, isCool),
      referenceCool: mean(png, 0, width, y0, y1, isCool),
    };
  }));
}

const before = measure(source);
let changed = 0;
let centerChanged = 0;
let maxLumaError = 0;
for (const seam of contract.seams) {
  assert.ok(before.some(row => row.seam === seam && row.saturationRatio < contract.minSaturationRatio),
    "3R2 must fail the saturation gate at each seam");
  const [left, right] = contract.referenceOffsets.map(dx => seam + dx);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - contract.windowRadius);
    const y1 = Math.min(height, y + contract.windowRadius);
    // Signed BT.709 Cb/Cr without the digital storage offset.
    const cb = pixel => (pixel[2] - luma(pixel)) / 1.8556;
    const cr = pixel => (pixel[0] - luma(pixel)) / 1.5748;
    const column = (x, metric) => mean(source, x, x + 1, y0, y1, metric);
    const leftCb = column(left, cb), rightCb = column(right, cb);
    const leftCr = column(left, cr), rightCr = column(right, cr);
    for (let x = seam - contract.halfWidth; x < seam + contract.halfWidth; x++) {
      const pixel = rgb(source, x, y);
      const t = (x - left) / (right - left);
      const weight = 1 - Math.abs(x + 0.5 - seam) / contract.halfWidth;
      const deltaB = 1.8556 * weight * (leftCb + (rightCb - leftCb) * t - column(x, cb));
      const deltaR = 1.5748 * weight * (leftCr + (rightCr - leftCr) * t - column(x, cr));
      const deltaG = -(0.2126 * deltaR + 0.0722 * deltaB) / 0.7152;
      // Limit the correction vector to the RGB gamut along the same constant-Y plane.
      const delta = [deltaR, deltaG, deltaB];
      const scale = Math.min(1, ...delta.map((d, i) => d > 0 ? (255 - pixel[i]) / d : d < 0 ? -pixel[i] / d : 1));
      const result = delta.map((d, i) => Math.round(pixel[i] + d * scale));
      corrected.data.set(result, offset(x, y));
    }
  }
}
const after = measure(corrected);
for (const row of after) {
  assert.ok(row.lumaRatio >= contract.minRatio && row.saturationRatio >= contract.minSaturationRatio &&
    row.cool <= row.referenceCool, JSON.stringify(row));
}
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = offset(x, y);
  assert.equal(corrected.data[i + 3], source.data[i + 3]);
  const pixel = rgb(corrected, x, y);
  const original = rgb(source, x, y);
  if (pixel.equals(original)) continue;
  assert.ok(contract.seams.some(seam => x >= seam - contract.halfWidth && x < seam + contract.halfWidth));
  maxLumaError = Math.max(maxLumaError, Math.abs(luma(pixel) - luma(original)));
  changed++;
  if (x >= 390 && x < 780) centerChanged++;
}
assert.ok(centerChanged > 0 && maxLumaError <= 0.500001);


mkdirSync(output, {recursive: true});
const layout = {...old.layout, scene: save("phone-architecture.png", corrected)};
const receiptBytes = readFileSync(path.join(repo, layout.receipt.path));
assert.equal(hash(receiptBytes), layout.receipt.sha256);
const receipt = JSON.parse(receiptBytes);
assert.equal(receipt.scene.sha256, layout.receipt.sceneSha256);
read(receipt.scene);
assert.deepEqual(layout.layers.map(layer => layer.id), receipt.layerOrder);
const chest = layout.layers.find(layer => layer.id === "chest");
const sprites = new Map();
for (const layer of layout.layers) {
  for (const asset of [layer, ...Object.values(layer.variants ?? {})]) {
    const sprite = read(asset);
    assert.ok(layer.x >= 0 && layer.y >= 0 && layer.x + sprite.width <= width && layer.y + sprite.height <= height);
    sprites.set(asset.path, sprite);
  }
  assert.ok(layer.opacity === undefined || layer.opacity === 1);
}
assert.equal(new Set(Object.values(chest.variants).map(asset => asset.sha256)).size, 8);
const previews = {};
for (const [frame, variant] of Object.entries(chest.variants)) {
  const composite = new PNG({width, height});
  composite.data.set(corrected.data);
  for (const layer of layout.layers) {
    const sprite = sprites.get(layer === chest ? variant.path : layer.path);
    for (let y = 0; y < sprite.height; y++) for (let x = 0; x < sprite.width; x++) {
      const i = (y * sprite.width + x) * 4;
      const target = offset(layer.x + x, layer.y + y);
      const alpha = sprite.data[i + 3] / 255;
      for (let channel = 0; channel < 3; channel++) {
        composite.data[target + channel] = Math.round(
          sprite.data[i + channel] * alpha + composite.data[target + channel] * (1 - alpha),
        );
      }
    }
  }
  previews[frame] = save(`scene-${frame}.png`, composite);
}
const saveJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
saveJson(path.join(output, "layout.json"), layout);

const url = asset => path.posix.relative(relative(dir), asset.path);
const first = JSON.parse(readFileSync(path.join(dir, "landing-phone-exploration-3r.manifest.json"), "utf8"));
read(first.layout.scene);
const pairs = [["3R", first.layout.scene], ["3R2", old.layout.scene], ["3R3", layout.scene]];
const comparison = contract.seams.map(seam => `<h3>x = ${seam}</h3><div class="pair">${pairs.map(([label, asset]) =>
  `<figure><figcaption>${label}</figcaption><div class="zoom" tabindex="0"><img alt="${label} x=${seam}" src="${url(asset)}" style="left:-${(seam - 32) * 6}px"></div></figure>`
).join("")}</div>`).join("");
const full = pairs.map(([label, asset]) =>
  `<figure><figcaption>${label}</figcaption><a href="${url(asset)}"><img alt="${label} 全條背景" src="${url(asset)}" width="1170" height="600"></a></figure>`
).join("");
const template = readFileSync(path.join(dir, previous + "-review.html"), "utf8");
const review = template.replaceAll(previous, version).replaceAll("3R2 手機", "3R3 手機")
  .replace(/<h2>3R／3R2 全條背景[\s\S]*?<\/main>/u,
    `<h2>3R／3R2／3R3 全條背景</h2><div class="full-comparison">${full}</div>
<h2>接縫前後對照（6×）</h2><p>各圖可垂直捲動檢查全高。</p>${comparison}</main>`);
assert.ok(review.includes(comparison) && review.includes(full));
const reviewFile = path.join(dir, version + "-review.html");
writeFileSync(reviewFile, review);
const middle = new PNG({width: 390, height});
PNG.bitblt(corrected, middle, 390, 0, 390, height, 0, 0);
saveJson(path.join(dir, version + ".manifest.json"), {
  reviewOnly: true, runtimePromotion: false, decision: "awaiting-visual-review",
  lineage: {source: old.layout.scene, approvedStandalone: old.lineage.approvedStandalone},
  contract, metrics: {before, after, maxLumaError}, changedPixels: changed, centerChangedPixels: centerChanged,
  centerSha256: hash(PNG.sync.write(middle)), layout, previews,
  review: {path: relative(reviewFile), sha256: hash(review)},
});
