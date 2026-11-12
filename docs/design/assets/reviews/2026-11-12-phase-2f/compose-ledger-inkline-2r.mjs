import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { PNG } = createRequire(new URL("../../../../../web/package.json", import.meta.url))("pngjs");
const approved = resolve(import.meta.dirname, "../../approved/page-visual-v1/mimiku");
const read = (path) => PNG.sync.read(readFileSync(path));
const original = read(resolve(approved, "action-record-ledger.png"));
const ink = read(resolve(import.meta.dirname, "ledger-inkline-2r-strokes.png"));
const composite = new PNG({ width: original.width, height: original.height });
original.data.copy(composite.data);
const mask = new PNG({ width: original.width, height: original.height });

// Polygons cover the old lettering and its antialiasing while staying inside the left paper.
const patches = [
  [[194,344],[218,344],[223,351],[202,354]],
  [[195,347],[222,345],[226,366],[205,369],[198,359]],
  [[217,346],[239,342],[240,350],[216,353]],
  [[196,346],[232,344],[236,363],[226,368],[205,370],[197,358]],
  [[193,350],[221,343],[240,339],[259,339],[264,355],[258,363],[213,370],[204,369]],
];
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const offset = (frame, x, y) => (y * original.width + frame * 512 + x) * 4;
function inside(vertices, x, y) {
  let enclosed = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i];
    const [xj, yj] = vertices[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) enclosed = !enclosed;
  }
  return enclosed;
}

function stats(values) {
  assert.ok(values.length);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  return { count: values.length, mean, sd };
}

const evidence = new PNG({ width: 96 * 3 * 3, height: 48 * 3 * 5 });
const first = process.argv[3] ? read(process.argv[3]) : original;
for (const [frame, polygon] of patches.entries()) {
  const patch = [];
  const strokes = [];
  for (let y = 322; y < 378; y++) {
    for (let x = 175; x < 269; x++) {
      const pos = offset(frame, x, y);
      if (ink.data[pos + 3]) strokes.push({ x, y, pos });
      if (inside(polygon, x + 0.5, y + 0.5)) patch.push({ x, y, pos });
    }
  }
  const points = [...patch, ...strokes];
  for (const { pos } of points) {
    assert.ok(original.data[pos + 3] >= 245, "Paper mask reached the transparent silhouette");
    mask.data.fill(255, pos, pos + 4);
  }
  const left = Math.min(...points.map(({ x }) => x));
  const right = Math.max(...points.map(({ x }) => x));
  const top = Math.min(...points.map(({ y }) => y));
  const bottom = Math.max(...points.map(({ y }) => y));
  const ring = [];
  for (let y = top - 4; y <= bottom + 4; y++) {
    for (let x = left - 4; x <= right + 4; x++) {
      if (x >= left && x <= right && y >= top && y <= bottom) continue;
      const pos = offset(frame, x, y);
      const rgb = original.data.subarray(pos, pos + 3);
      const [r, g, b] = rgb;
      // Exclude dark ink, cool quill edges, binding, and other non-paper colors.
      if (original.data[pos + 3] >= 245 && luma(rgb) >= 150 &&
          r >= 218 && g >= 200 && b >= 170 && r - b >= 16 && r - b <= 51) {
        ring.push({ x, y, rgb });
      }
    }
  }
  const unmodified = stats(ring.map(({ rgb }) => luma(rgb)));
  const paperPoints = patch.filter(({ pos }) => !ink.data[pos + 3]);
  for (const { x, y, pos } of paperPoints) {
    // Blend nearby unmodified paper on both sides with inverse distance weights.
    // A nearby donor provides the original paper's fine variation.
    const neighbors = ring.map((sample) => ({
      sample, distance: (x - sample.x) ** 2 + (y - sample.y) ** 2,
    })).sort((a, b) => a.distance - b.distance).slice(0, 12);
    const weight = neighbors.reduce((sum, { distance }) => sum + 1 / distance, 0);
    const donor = neighbors[(x * 11 + y * 7) % 5].sample.rgb;
    for (let c = 0; c < 3; c++) {
      const smooth = neighbors.reduce((sum, { sample, distance }) => sum + sample.rgb[c] / distance, 0) / weight;
      composite.data[pos + c] = Math.round(smooth * 0.72 + donor[c] * 0.28);
    }
  }
  const luminances = () => paperPoints.map(({ pos }) => luma(composite.data.subarray(pos, pos + 3)));
  const bias = unmodified.mean - stats(luminances()).mean;
  for (const { pos } of paperPoints) {
    for (let c = 0; c < 3; c++) {
      composite.data[pos + c] = Math.max(0, Math.min(255, Math.round(composite.data[pos + c] + bias)));
    }
  }
  for (const { pos } of strokes) ink.data.copy(composite.data, pos, pos, pos + 3);

  const repaired = stats(luminances());
  assert.ok(Math.abs(repaired.mean - unmodified.mean) <= 2);
  console.log(JSON.stringify({ frame: frame + 1, repaired, unmodified, difference: Math.abs(repaired.mean - unmodified.mean), inkPixels: strokes.length }));

  for (const [column, image] of [original, first, composite].entries()) {
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 96; x++) {
        const pos = offset(frame, x + 176, y + 327);
        const rgb = image.data.subarray(pos, pos + 3);
        const onPaper = mask.data[pos + 3] || (
          original.data[pos + 3] >= 245 && rgb[0] >= 218 && rgb[1] >= 200 &&
          rgb[2] >= 170 && rgb[0] - rgb[2] >= 16 && rgb[0] - rgb[2] <= 51
        );
        if (!onPaper) continue;
        const value = Math.round(Math.max(0, Math.min(1, (luma(rgb) - 200) / 45)) * 255);
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
          const dest = ((frame * 144 + y * 3 + dy) * evidence.width + column * 288 + x * 3 + dx) * 4;
          evidence.data.set([value, value, value, 255], dest);
        }
      }
    }
  }
}
const out = process.argv[2];
assert.ok(out, "Supply an output directory");
for (const [name, image] of Object.entries({ master: composite, mask, residual: evidence })) {
  writeFileSync(resolve(out, `${name}.png`), PNG.sync.write(image));
}
