import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";

const dir = import.meta.dirname;
const repo = path.resolve(dir, "../../../../..");
const {PNG} = createRequire(path.join(repo, "web/package.json"))("pngjs");
const previous = "landing-phone-exploration-3r";
const version = previous + "2";
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
  seams: [390, 780], halfWidth: 12, windowRadius: 24, maxGain: 3, featherPower: 2, liftStrength: 1.04, coolNeutralBlend: 0.75,
  referenceOffsets: [-14, 13], sampleHalfWidth: 4, acceptanceOffsets: [-16, 16],
  minRatio: 0.92, bands: {wall: [60, 220], floor: [250, 430], foreground: [430, 600]},
  coolHue: [90, 330], minimumSaturation: 0.12,
  colorProtection: "Preserve chroma during the lift and blend cool pixels toward neutral at the lifted luma",
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
function measure(png) {
  return contract.seams.flatMap(seam => Object.entries(contract.bands).map(([band, [y0, y1]]) => {
    const [left, right] = contract.acceptanceOffsets.map(dx => seam + dx);
    const reference = (mean(png, left, left + 1, y0, y1, luma) + mean(png, right, right + 1, y0, y1, luma)) / 2;
    const half = contract.sampleHalfWidth;
    const ratio = mean(png, seam - half, seam + half, y0, y1, luma) / reference;
    const edge = contract.halfWidth;
    const cool = mean(png, seam - edge, seam + edge, y0, y1, isCool);
    const segment = seam === 390 ? 0 : 780;
    const referenceCool = mean(source, segment, segment + 390, y0, y1, isCool);
    return {seam, band, ratio, cool, referenceCool};
  }));
}
const before = measure(source);
for (const seam of contract.seams) {
  assert.ok(before.some(row => row.seam === seam && row.ratio < contract.minRatio), "3R must fail at each seam");
  const [left, right] = contract.referenceOffsets.map(dx => seam + dx);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - contract.windowRadius);
    const y1 = Math.min(height, y + contract.windowRadius);
    const col = x => mean(source, x, x + 1, y0, y1, luma);
    const a = col(left), b = col(right);
    for (let x = seam - contract.halfWidth; x < seam + contract.halfWidth; x++) {
      const current = col(x);
      const target = a + (b - a) * (x - left) / (right - left);
      const gain = Math.max(1, Math.min(contract.maxGain, target / Math.max(1, current)));
      const weight = 1 - (Math.abs(x + 0.5 - seam) / contract.halfWidth) ** contract.featherPower;
      const pixel = rgb(source, x, y);
      const lift = Math.min(255 - Math.max(...pixel), Math.round(luma(pixel) * contract.liftStrength * (gain - 1) * weight));
      const lifted = pixel.map(channel => channel + lift);
      if (isCool(lifted)) {
        const neutral = Math.ceil(luma(lifted));
        const blend = Math.max(weight, contract.coolNeutralBlend);
        const protectedPixel = lifted.map(channel => Math.round(channel + (neutral - channel) * blend));
        if (luma(protectedPixel) > luma(pixel)) lifted.set(protectedPixel);
      }
      rgb(corrected, x, y).set(lifted);
    }
  }
}
const after = measure(corrected);
console.table(after.map((row, i) => ({...row, before: before[i].ratio})));
for (const row of after) {
  assert.ok(row.ratio >= contract.minRatio && row.cool <= row.referenceCool, JSON.stringify(row));
}
let changed = 0, centerChanged = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const previousPixel = rgb(source, x, y);
  const pixel = rgb(corrected, x, y);
  assert.equal(corrected.data[offset(x, y) + 3], source.data[offset(x, y) + 3]);
  if (pixel.equals(previousPixel)) continue;
  assert.ok(contract.seams.some(seam => x >= seam - contract.halfWidth && x < seam + contract.halfWidth));
  assert.ok(luma(pixel) > luma(previousPixel));
  assert.ok(!isCool(pixel) || isCool(previousPixel));
  changed++;
  if (x >= 390 && x < 780) centerChanged++;
}
assert.ok(centerChanged > 0);





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
const pairs = [["3R", old.layout.scene], ["3R2", layout.scene]];
const comparison = contract.seams.map(seam => `<h3>x = ${seam}</h3><div class="pair">${pairs.map(([label, asset]) =>
  `<figure><figcaption>${label}</figcaption><div class="zoom" tabindex="0"><img alt="${label} x=${seam}" src="${url(asset)}" style="left:-${(seam - 32) * 6}px"></div></figure>`
).join("")}</div>`).join("");
const full = pairs.map(([label, asset]) =>
  `<figure><figcaption>${label}</figcaption><a href="${url(asset)}"><img alt="${label} 全條背景" src="${url(asset)}" width="1170" height="600"></a></figure>`
).join("");
const template = readFileSync(path.join(dir, previous + "-review.html"), "utf8");
const review = template.replaceAll(previous, version).replaceAll("3R 手機", "3R2 手機")
  .replace(/<h2>接縫前後對照[\s\S]*?<\/main>/u,
    `<h2>3R／3R2 全條背景</h2><div class="full-comparison">${full}</div>
<h2>接縫前後對照（6×）</h2><p>各圖可垂直捲動檢查全高。</p>${comparison}</main>`)
  .replace("</style>", ".full-comparison img{width:100%;height:auto}</style>");
assert.ok(review.includes(comparison) && review.includes(full));
const reviewFile = path.join(dir, version + "-review.html");
writeFileSync(reviewFile, review);
const middle = new PNG({width: 390, height});
PNG.bitblt(corrected, middle, 390, 0, 390, height, 0, 0);
saveJson(path.join(dir, version + ".manifest.json"), {
  reviewOnly: true, runtimePromotion: false, decision: "awaiting-visual-review",
  lineage: {source: old.layout.scene, approvedStandalone: old.lineage.approved},
  contract, metrics: {before, after}, changedPixels: changed, centerChangedPixels: centerChanged,
  centerSha256: hash(PNG.sync.write(middle)), layout, previews,
  review: {path: relative(reviewFile), sha256: hash(review)},
});
