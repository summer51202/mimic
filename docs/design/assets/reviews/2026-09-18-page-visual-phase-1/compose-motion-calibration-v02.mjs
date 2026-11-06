import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = import.meta.dirname;
const require = createRequire(new URL("../../../../../web/package.json", import.meta.url));
const { PNG } = require("pngjs");
const output = "samples/motion-calibration-v02";
const sources = "samples/derivations/motion-calibration-v02";
mkdirSync(join(root, output), { recursive: true });
const read = (name) => readFileSync(join(root, name));
const json = (name) => JSON.parse(read(name));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const raster = (name) => PNG.sync.read(read(name));
const relative = (path) => path.replace(/^docs\/design\/assets\/reviews\/[^/]+\//, "");
const info = (path, image) => ({ path, sha256: hash(read(path)), width: image.width, height: image.height });

function bounds(image, region = [0, 0, image.width, image.height]) {
  const [left, top, right, bottom] = region;
  let x1 = right, y1 = bottom, x2 = left, y2 = top;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 224) continue;
      x1 = Math.min(x1, x); y1 = Math.min(y1, y);
      x2 = Math.max(x2, x + 1); y2 = Math.max(y2, y + 1);
    }
  }
  if (x2 <= x1 || y2 <= y1) throw Error("Empty source cell");
  return [x1, y1, x2, y2];
}

function copyPixel(from, to, x, y, sx, sy) {
  const dest = (y * to.width + x) * 4;
  if (sx < 0 || sy < 0 || sx >= from.width || sy >= from.height) return;
  const source = (sy * from.width + sx) * 4;
  if (from.data[source + 3] === 0) return;
  from.data.copy(to.data, dest, source, source + 4);
}

function register(source, sourceBox, width, height, targetBox) {
  const out = new PNG({ width, height });
  const [sx, sy, sr, sb] = sourceBox;
  const [tx, ty, tr, tb] = targetBox;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      copyPixel(source, out, x, y, Math.floor(sx + (x - tx + .5) * (sr - sx) / (tr - tx)),
        Math.floor(sy + (y - ty + .5) * (sb - sy) / (tb - ty)));
    }
  }
  return out;
}

function save(name, image, extra = {}) {
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] === 0) image.data.fill(0, i, i + 3);
  }
  const path = output + "/" + name + ".png";
  writeFileSync(join(root, path), PNG.sync.write(image));
  return { ...info(path, image), ...extra };
}

function plate(master, generated, mask) {
  const image = new PNG({ width: master.width, height: master.height });
  master.data.copy(image.data);
  const changed = [master.width, master.height, 0, 0];
  let pixels = 0;
  for (let y = 0; y < master.height; y++) {
    for (let x = 0; x < master.width; x++) {
      if (!mask(x, y)) continue;
      const offset = (y * master.width + x) * 4;
      if (generated.data.readUInt32LE(offset) === master.data.readUInt32LE(offset)) continue;
      generated.data.copy(image.data, offset, offset, offset + 4);
      changed[0] = Math.min(changed[0], x);
      changed[1] = Math.min(changed[1], y);
      changed[2] = Math.max(changed[2], x + 1);
      changed[3] = Math.max(changed[3], y + 1);
      pixels++;
    }
  }
  if (!pixels) throw Error("An edited frame has no changes");
  return { image, changed, pixels };
}

const titlePaths = ["desktop-single", "phone-staggered"].map((id) => "samples/landing-a-title/wordmarks/" + id + ".png");
const mimiku = (name) => "samples/mimiku-states-actions/masters/" + name + ".png";
const warm = (variant, id) => "samples/landing-warm-rest/layers/A-" + variant + "/" + id + ".png";
const home = json("home-base-v02.manifest.json").frames;
const sourceRecords = {};
function cells(id, cols, rows, count) {
  const path = sources + "/" + id + "-attempt-01.png";
  const source = raster(path);
  const boxes = Array.from({ length: count }, (_, index) => {
    const x = index % cols, y = Math.floor(index / cols);
    return bounds(source, [Math.floor(x * source.width / cols), Math.floor(y * source.height / rows),
      Math.floor((x + 1) * source.width / cols), Math.floor((y + 1) * source.height / rows)]);
  });
  sourceRecords[id] = { ...info(path, source), boxes };
  return { source, boxes };
}

const inRect = (x, y, [l, t, r, b]) => x >= l && x < r && y >= t && y < b;
const rects = (boxes) => (x, y) => boxes.some((box) => inRect(x, y, box));
const seqs = {};
const masks = {};
const glintCenters = [
  [[108, 97, 12], [441, 142, 11], [434, 180, 9]],
  [[618, 96, 24], [953, 142, 19], [945, 180, 13]],
  [[1129, 94, 39], [1464, 142, 25], [1456, 181, 17]],
  [[106, 606, 27], [439, 654, 17], [432, 692, 9]],
  [[619, 608, 13], [952, 654, 12], [945, 692, 9]],
];
const glintAnchors = [[59, 97], [453, 146], [443, 193]];
function isolateGlints(source, index, master) {
  const image = new PNG({ width: master.width, height: master.height });
  for (const [glint, [sx, sy, radius]] of glintCenters[index].entries()) {
    const [tx, ty] = glintAnchors[glint];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const offset = ((sy + dy) * source.width + sx + dx) * 4;
        const [r, g, b, a] = source.data.subarray(offset, offset + 4);
        if (a < 96 || r < 140 || g < 70 || (r - b < 35 && g < 220)) continue;
        copyPixel(source, image, tx + dx, ty + dy, sx + dx, sy + dy);
      }
    }
  }
  return image;
}

function edit({ id, variant, original, sourceId, grid, timings, originalIndex, regions, action }) {
  const master = raster(original);
  const { source, boxes } = cells(sourceId, ...grid);
  const target = bounds(master);
  const mask = rects(regions);
  const entries = (seqs[id] ??= {});
  const extra = action ? { groundAligned: true } : {};
  entries[variant + "Master"] = save(id + "-" + variant + "-master", master, extra);
  masks[id + "-" + variant] = { original: info(original, master), target, regions, sourceId };
  let editedIndex = 0;
  entries[variant] = timings.map((ms, index) => {
    const name = id + "-" + variant + "-" + String(index + 1).padStart(2, "0");
    if (index === originalIndex) return { ...entries[variant + "Master"], ms };
    const cell = editedIndex++;
    const generated = id === "celebration"
      ? isolateGlints(source, cell, master)
      : register(source, boxes[cell], master.width, master.height, target);
    const { image, changed, pixels } = plate(master, generated, mask);
    return { ...save(name, image, extra), ms, changed, pixels };
  });
}

for (const [i, variant] of ["desktop", "phone"].entries()) {
  edit({ id: "title", variant, original: titlePaths[i], sourceId: i ? "titlePhone" : "titleDesktop",
    grid: [2, 1, 2], timings: [90, 90, 90], originalIndex: 0,
    regions: i ? [[7, 11, 26, 31], [31, 9, 49, 28]] : [[12, 18, 36, 41], [44, 17, 68, 39]] });
  edit({ id: "idle", variant, original: home[variant].mimiku.path, sourceId: "idle",
    grid: [2, 1, 2], timings: [200, 200, 200], originalIndex: 0,
    regions: i ? [[31, 14, 50, 32], [60, 9, 78, 26], [5, 0, 83, 9]]
      : [[39, 17, 62, 39], [73, 11, 96, 34], [7, 0, 104, 11]] });
  edit({ id: "fire", variant, original: warm(variant, "fire"), sourceId: "fire",
    grid: [3, 1, 3], timings: Array(4).fill(1000 / 6), originalIndex: 0,
    regions: i ? [[22, 0, 62, 45]] : [[26, 0, 79, 60]] });
}

// Compose at the approved 512 master registration. Scale every pose from the same crop.
for (const id of ["ledger", "celebration"]) {
  edit({ id, variant: "desktop", original: mimiku(id === "ledger" ? "action-record-ledger-key" : "action-adventure-complete-key"),
    sourceId: id, grid: id === "ledger" ? [2, 2, 4] : [3, 2, 5],
    timings: id === "ledger" ? Array(5).fill(100) : [130, 140, 170, 160, 180, 220],
    originalIndex: id === "ledger" ? 2 : 3, action: true,
    regions: id === "ledger" ? [[122, 202, 221, 288], [153, 255, 239, 311], [172, 302, 257, 355], [204, 344, 267, 373]]
      : [[19, 55, 93, 120], [424, 118, 486, 170], [425, 174, 466, 215]] });
  const family = seqs[id];
  const crop = masks[id + "-desktop"].target;
  for (const [variant, width, height] of [["phone", 96, 100], ["desktop", 118, 123]]) {
    const scale = (frame, index) => {
      const ratio = Math.min(width / (crop[2] - crop[0]), height / (crop[3] - crop[1]));
      const w = Math.round((crop[2] - crop[0]) * ratio);
      const h = Math.round((crop[3] - crop[1]) * ratio);
      const x = Math.floor((width - w) / 2);
      const image = register(raster(frame.path), crop, width, height, [x, height - h, x + w, height]);
      return { ...frame, ...save(id + "-" + variant + "-1x-" + index, image, { groundAligned: true }) };
    };
    family[variant + "Master"] = scale(family.desktopMaster, "master");
    family[variant] = family.desktop.map(scale);
  }
}

const landing = json("landing-prop-placement-application.manifest.json");
const phone = json("samples/landing-phone-exploration-3r3/layout.json");
const chest = json("ancient-treasure-chest-v04.manifest.json");
const layer = (id, source, x = source.x ?? 0, y = source.y ?? 0) => ({
  ...source, id, x, y, path: relative(source.path),
});
const desktop = landing.scenes.desktop;
const chestPhonePath = (name) => "samples/landing-phone-exploration/chest-" + name + ".png";
const chestFrame = (variant, name) => {
  const path = variant === "phone" ? chestPhonePath(name) : relative(landing.chestFrames[name].sprite.path);
  return info(path, raster(path));
};
const scenes = { landing: {}, home: {} };
for (const variant of ["desktop", "phone"]) {
  const isPhone = variant === "phone";
  const hidden = "samples/props-calibration-v04/wall-carving-hidden-" + variant + ".png";
  const revealed = "samples/props-calibration-v04/wall-carving-revealed-" + variant + ".png";
  const carving = layer("carving", info(hidden, raster(hidden)), isPhone ? 948 : 860, isPhone ? 136 : 120);
  const base = isPhone
    ? [layer("architecture", phone.scene), ...phone.layers.map((item) => layer(item.id, item))]
    : [layer("architecture", desktop.architecture), ...desktop.order.map((id) => {
      if (id === "chest") return layer(id, chestFrame(variant, "closed"), landing.chestOrigin.x, landing.chestOrigin.y);
      if (id === "mapCrate") return layer(id, desktop.crate.sprite, desktop.crate.x, desktop.crate.y);
      return layer(id === "carving" ? "historicCarving" : id, desktop.fixed.find((item) => item.id === id));
    })];
  scenes.landing[variant] = {
    width: isPhone ? phone.width : desktop.frame.width, height: isPhone ? phone.height : desktop.frame.height,
    initialX: isPhone ? phone.initialViewportX : 0,
    layers: [...base.map((item) => item.id === "wordmark" ? { ...item, id: "title" } : item), carving],
  };
  const h = home[variant];
  scenes.home[variant] = { width: h.width, height: h.height, layers: [
    layer("architecture", h.architecture), layer("groundLight", h.groundLight),
    layer("fire", h.fire), layer("warrior", h.slots.warrior), layer("idle", h.mimiku),
  ] };
  (seqs.chest ??= {})[variant] = Object.fromEntries(Object.entries(chest.config.timelines).map(
    ([direction, entries]) => [direction, entries.map(([name, ms]) => ({ ...chestFrame(variant, name), ms }))],
  ));
  const before = info(hidden, raster(hidden)), after = info(revealed, raster(revealed));
  const from = raster(hidden), to = raster(revealed);
  for (let i = 0; i < from.data.length; i++) from.data[i] = Math.round((from.data[i] + to.data[i]) / 2);
  const middle = save("carving-" + variant + "-mid", from);
  (seqs.carving ??= {})[variant] = {
    open: [before, middle, after].map((frame) => ({ ...frame, ms: 100 })),
    close: [after, middle, before].map((frame) => ({ ...frame, ms: 100 })),
  };
  seqs.carving[variant + "Master"] = before;
  seqs.chest[variant + "Master"] = chestFrame(variant, "closed");
}

const labels = { title: "標題眨眼", idle: "Mimiku 待機", fire: "篝火閃爍", ledger: "記帳", celebration: "冒險完成", chest: "寶箱", carving: "壁畫" };
for (const [id, family] of Object.entries(seqs)) family.label = labels[id];
const data = { decision: "awaiting-visual-review", sequences: seqs, scenes };
const lineage = { ...data, sourceRecords, masks, prompt: { path: sources + "/prompts.md", sha256: hash(read(sources + "/prompts.md")) } };
writeFileSync(join(root, "motion-calibration-v02.manifest.json"), JSON.stringify(lineage, null, 2) + "\n");
writeFileSync(join(root, "motion-calibration-v02.data.js"), "window.motionCalibration = " + JSON.stringify(data) + ";\n");
