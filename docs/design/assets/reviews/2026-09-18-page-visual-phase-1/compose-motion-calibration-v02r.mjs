import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { bounds, nearest } from "./landing-chest-raster.mjs";

const require = createRequire(new URL("../../../../../web/package.json", import.meta.url));
const { PNG } = require("pngjs");
const root = import.meta.dirname;
const folder = "samples/motion-calibration-v02r";
const check = process.argv.includes("--check");
const read = (path) => readFileSync(join(root, path));
const json = (path) => JSON.parse(read(path));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const decode = (path) => PNG.sync.read(read(path));
const baseline = "motion-calibration-v02.manifest.json";
const { decision, scenes, sequences, masks } = json(baseline);
const homePath = "home-base-v02.manifest.json";
const home = json(homePath).frames;
const happyPath = "samples/mimiku-states-actions/masters/state-happy.png";
const happyHash = "1a350e5c6b9995c9ea5d8be5a1e73c2fcd8dc38646f08d08488b8446ef50d294";
assert.equal(hash(read(happyPath)), happyHash);
const happy = decode(happyPath);
const crop = bounds(happy);
const comparison = { idle: structuredClone(sequences.idle), celebration: structuredClone(sequences.celebration) };
const idleBlink = { minMs: 3000, maxMs: 6000, frames: {} };
const registration = {};
const jump = [0, 2, 3, 1, 0, 0];
const glintFrames = [null, null, 2, 4, 5, null];
let outputs = 0;
if (!check) mkdirSync(join(root, folder), { recursive: true });

function output(path, bytes) {
  if (check) assert.deepEqual(read(path), Buffer.from(bytes), path);
  else writeFileSync(join(root, path), bytes);
  outputs++;
  return { path, sha256: hash(bytes) };
}

function paste(target, source, left, top) {
  assert.ok(left >= 0 && top >= 0 && left + source.width <= target.width && top + source.height <= target.height);
  for (let y = 0; y < source.height; y++) {
    const start = y * source.width * 4;
    source.data.copy(target.data, ((top + y) * target.width + left) * 4, start, start + source.width * 4);
  }
}

function placeGlints(target, frame, left, top) {
  const source = decode(frame.path);
  const { target: [l, t, r, b], regions } = masks["celebration-desktop"];
  // Invert the v02 logical registration to locate only its three star regions.
  const scale = Math.min(source.width / (r - l), source.height / (b - t));
  const w = Math.round((r - l) * scale), h = Math.round((b - t) * scale);
  const x0 = Math.floor((source.width - w) / 2), y0 = source.height - h;
  let pixels = 0;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sx = Math.floor(l + (x - x0 + .5) * (r - l) / w);
      const sy = Math.floor(t + (y - y0 + .5) * (b - t) / h);
      if (!regions.some(([x1, y1, x2, y2]) => sx >= x1 && sx < x2 && sy >= y1 && sy < y2)) continue;
      const at = (y * source.width + x) * 4;
      const dest = ((y + top) * target.width + x + left) * 4;
      if (!source.data[at + 3] || target.data[dest + 3]) continue;
      source.data.copy(target.data, dest, at, at + 4);
      pixels++;
    }
  }
  assert.ok(pixels > 0);
  return pixels;
}

for (const variant of ["desktop", "phone"]) {
  const previousIdle = comparison.idle[variant];
  sequences.idle[variant] = previousIdle.slice(0, 2).map((frame) => ({ ...frame, ms: 250 }));
  idleBlink.frames[variant] = { ...previousIdle[2], ms: 140 };
  const previous = comparison.celebration[variant];
  const base = decode(comparison.celebration[variant + "Master"].path);
  const { scale, ground } = home[variant].mimiku;
  const actor = nearest(happy, Math.round(crop.width * scale), Math.round(crop.height * scale), crop, true);
  const width = Math.max(base.width, actor.width);
  const height = Math.max(base.height, actor.height + Math.max(...jump));
  const left = (sprite) => Math.floor(width / 2) - Math.floor(sprite.width / 2);
  registration[variant] = { scale, ground, crop, actor: { width: actor.width, height: actor.height }, canvas: { width, height } };
  sequences.celebration[variant] = previous.map(({ ms }, index) => {
    const image = new PNG({ width, height });
    paste(image, actor, left(actor), height - actor.height - jump[index]);
    const glints = glintFrames[index] === null ? null : previous[glintFrames[index]];
    const sparklePixels = glints ? placeGlints(image, glints, left(base), height - base.height) : 0;
    return {
      ...output(folder + "/celebration-" + variant + "-" + (index + 1) + ".png", PNG.sync.write(image)),
      width, height, ms, groundAligned: true, lift: jump[index],
      pose: "happy",
      sparkleSource: glints?.path ?? null, sparklePixels,
    };
  });
}

const data = { decision, sequences, scenes, idleBlink, comparison };
const lineage = { v02: { path: baseline, sha256: hash(read(baseline)) },
  home: { path: homePath, sha256: hash(read(homePath)) }, happy: { path: happyPath, sha256: happyHash }, registration };
output("motion-calibration-v02r.manifest.json", JSON.stringify({ ...data, lineage }, null, 2) + "\n");
output("motion-calibration-v02r.data.js", "window.motionCalibration = " + JSON.stringify(data) + ";\n");
console.log(outputs + (check ? " byte-identical files" : " files generated"));
