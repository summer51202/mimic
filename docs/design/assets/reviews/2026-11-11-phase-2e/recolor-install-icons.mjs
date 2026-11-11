import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../../../../../", import.meta.url);
const require = createRequire(new URL("web/package.json", root));
const { PNG } = require("pngjs");
const approvedPath = "docs/design/assets/approved/page-visual-v1/";
const approved = new URL(approvedPath, root);
const manifestFile = new URL("production-asset-manifest.json", approved);
const scriptPath = fileURLToPath(import.meta.url).slice(fileURLToPath(root).length).replaceAll("\\", "/");
const names = [
  "favicon-16.png", "favicon-32.png", "icon-192.png", "icon-512.png",
  "icon-maskable-192.png", "icon-maskable-512.png",
];
const target = [33, 26, 24];
const luminance = (r, g, b) => (2126 * r + 7152 * g + 722 * b) / 10000;
const isNavy = (r, g, b, a) => a > 0 && b > r && b > g && b <= 192;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function recolor(bytes, name) {
  const original = PNG.sync.read(bytes);
  const { width, height, data } = original;
  const output = new PNG({ width, height });
  const mask = new PNG({ width, height });
  data.copy(output.data);
  let count = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (!isNavy(r, g, b, a)) continue;
    count++;
    total += luminance(r, g, b);
  }
  assert(count > 0, name);
  const mean = total / count;
  const shift = luminance(...target) - mean;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    const selected = isNavy(r, g, b, a);
    if (selected) {
      const offset = Math.round(luminance(r, g, b) - mean);
      const rgb = target.map((channel) => channel + offset);
      assert(rgb.every((channel) => channel >= 0 && channel <= 255), `${name}: clipping at byte ${i}`);
      output.data.set(rgb, i);
    }
    const shade = selected ? 255 : 0;
    mask.data.set([shade, shade, shade, 255], i);
  }
  const png = PNG.sync.write(output);
  const maskPng = PNG.sync.write(mask);
  const after = PNG.sync.read(png).data;
  const maskPixels = PNG.sync.read(maskPng).data;
  let maxShiftError = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    const [rr, gg, bb, aa] = after.subarray(i, i + 4);
    const changed = data.readUInt32BE(i) !== after.readUInt32BE(i);
    assert.equal(aa, a, `${name}: alpha at byte ${i}`);
    assert.equal(changed, isNavy(r, g, b, a), `${name}: selection at byte ${i}`);
    assert.equal(maskPixels.readUInt32BE(i), changed ? 0xffffffff : 0x000000ff, `${name}: mask at byte ${i}`);
    assert(!(aa > 0 && bb <= 192 && bb - rr > 12), `${name}: residual dark blue at byte ${i}`);
    if (changed) {
      const error = Math.abs(luminance(rr, gg, bb) - luminance(r, g, b) - shift);
      maxShiftError = Math.max(maxShiftError, error);
    }
  }
  assert(maxShiftError <= 1, `${name}: shift error ${maxShiftError}`);
  return { png, maskPng, count, unchanged: width * height - count, mean, shift, maxShiftError };
}

function packIco(images) {
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  for (const [index, png] of images.entries()) {
    const entry = 6 + index * 16;
    directory[entry] = png.readUInt32BE(16);
    directory[entry + 1] = png.readUInt32BE(20);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  }
  return Buffer.concat([directory, ...images]);
}

const manifestText = await readFile(manifestFile, "utf8");
const manifest = JSON.parse(manifestText);
const results = [];
for (const name of names) {
  const path = `icons/install/${name}`;
  const old = manifest.assets.find((asset) => asset.path === path);
  assert(old, `Missing ${path}`);
  const source = await readFile(new URL(path, approved));
  assert.equal(hash(source), old.sha256, path);
  const { png, maskPng, ...proof } = recolor(source, name);
  const warmPath = `icons/install-warm/${name}`;
  const existing = manifest.assets.find((asset) => asset.path === warmPath);
  const sha256 = hash(png);
  const alreadyPromoted = existing?.disposition === "promoted-phase-2e" && existing.sha256 === sha256;
  const asset = {
    ...old,
    path: warmPath,
    sources: [{ path: approvedPath + path, sha256: old.sha256 }],
    export_method: `recolor-background (${scriptPath})`,
    sha256,
    runtime_target: alreadyPromoted ? existing.runtime_target : null,
    disposition: alreadyPromoted ? existing.disposition : "staged-only-until-consumer-plan",
  };
  if (existing) Object.assign(existing, asset);
  else manifest.assets.push(asset);
  old.runtime_target = null;
  old.disposition = "superseded-phase-2e";
  results.push({ name, png, maskPng, proof, asset });
}

// Validate all six decoded images before writing any artifact.
const warm = new URL("icons/install-warm/", approved);
const masks = new URL("screenshots/masks/", import.meta.url);
await Promise.all([mkdir(warm, { recursive: true }), mkdir(masks, { recursive: true })]);
for (const { name, png, maskPng, proof, asset } of results) {
  await writeFile(new URL(name, warm), png);
  await writeFile(new URL(name, masks), maskPng);
  console.log(JSON.stringify({ name, sha256: asset.sha256, ...proof }));
}
const ico = packIco(results.filter(({ name }) => name.startsWith("favicon-")).map(({ png }) => png));
await writeFile(new URL("web/src/app/favicon.ico", root), ico);
let updated = JSON.stringify(manifest, null, 2) + "\n";
if (manifestText.includes("\r\n")) updated = updated.replaceAll("\n", "\r\n");
await writeFile(manifestFile, updated);
