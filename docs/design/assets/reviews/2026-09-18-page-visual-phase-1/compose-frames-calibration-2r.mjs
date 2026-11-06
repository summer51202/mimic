import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../../../../web/package.json", import.meta.url));
const { PNG } = require("pngjs");
const sourceFile = "../derivations/frames-2r/attempt-01.png";
const destination = new URL("./samples/frames-2r/", import.meta.url);
const output = process.argv[2] ?? fileURLToPath(destination);
const sourceBytes = readFileSync(new URL(sourceFile, destination));
const source = PNG.sync.read(sourceBytes);
const v1 = JSON.parse(readFileSync(new URL("./samples/frames/frames.json", import.meta.url), "utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

const size = 52;
const slice = 14;
const scale = 2;
const minPadding = { phone: 18, desktop: 26 };
const transparent = [0, 0, 0, 0];
const isArtwork = (r, g, b, a) => a > 127 && !(r - g > 24 && b - g > 24 && b > r * .7);
const sample = (image, x, y) => image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
const set = (image, x, y, pixel) => image.data.set(pixel, (y * image.width + x) * 4);

function artworkBounds(column, row) {
  const cellWidth = source.width / 3;
  const cellHeight = source.height / 2;
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  for (let y = row * cellHeight; y < (row + 1) * cellHeight; y++) {
    for (let x = column * cellWidth; x < (column + 1) * cellWidth; x++) {
      if (!isArtwork(...sample(source, x, y))) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error(`Empty atlas cell ${column}, ${row}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function grade(id, corner, [r, g, b, a]) {
  const gold = r > 125 && g > r * .52 && g < r * .89 && b < g * .75;
  if (gold && ((id === "parchment" && corner) || id === "dialogue" || id === "notebook")) {
    const light = (r * .213 + g * .715 + b * .072) * .78;
    return [Math.round(light * 1.21), Math.round(light * 1.03), Math.round(light * .76), a];
  }
  if (id === "dialogue") return [Math.round(r * .7), Math.round(g * .78), Math.round(b * .84), a];
  return [r, g, b, a];
}

function joinEdge(png, horizontal, inset) {
  const at = (along, cross) => horizontal ? [along, cross] : [cross, along];
  const end = size - slice - 1;
  for (let cross = inset; cross < inset + slice; cross++) {
    const first = [...sample(png, ...at(slice, cross))];
    const last = [...sample(png, ...at(end, cross))];
    const join = first[3] === last[3]
      ? first.map((channel, i) => Math.round((channel + last[i]) / 2))
      : transparent;
    for (const [along, direction] of [[slice, 1], [end, -1]]) {
      set(png, ...at(along, cross), join);
      const neighbor = at(along + direction, cross);
      const pixel = sample(png, ...neighbor);
      if (pixel[3] && join[3]) set(png, ...neighbor, pixel.map((channel, i) => Math.round((channel * 2 + join[i]) / 3)));
    }
  }
}

function derive(id, bounds, centerColor) {
  const png = new PNG({ width: size, height: size });
  const field = [...centerColor.slice(1).match(/../g).map(hex => Number.parseInt(hex, 16)), 255];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const depthX = Math.min(x, size - x - 1);
      const depthY = Math.min(y, size - y - 1);
      if (depthX >= slice && depthY >= slice) continue;
      const fromX = bounds.left + Math.floor((x + .5) * bounds.width / size);
      const fromY = bounds.top + Math.floor((y + .5) * bounds.height / size);
      const pixel = sample(source, fromX, fromY);
      const corner = depthX < 10 && depthY < 10;
      if (isArtwork(...pixel)) set(png, x, y, grade(id, corner, pixel));
      else if (Math.min(depthX, depthY) === slice - 1) set(png, x, y, field);
    }
  }
  for (const horizontal of [true, false]) {
    for (const inset of [0, size - slice]) joinEdge(png, horizontal, inset);
  }
  return PNG.sync.write(png);
}

mkdirSync(output, { recursive: true });
const frames = {};
for (const [index, [id, previous]] of Object.entries(v1.frames).entries()) {
  const bounds = artworkBounds(index % 3, Math.floor(index / 3));
  const { file, centerToken, centerColor } = previous;
  const bytes = derive(id, bounds, centerColor);
  writeFileSync(resolve(output, file), bytes);
  frames[id] = {
    file, sha256: digest(bytes), width: size, height: size, slice, scale,
    repeat: "repeat", centerToken, centerColor, minPadding, sourceBounds: bounds,
  };
}
const manifest = {
  decision: "awaiting-visual-review",
  source: { file: sourceFile, sha256: digest(sourceBytes), tool: "ImageGen", grid: [3, 2] },
  frames,
};
writeFileSync(resolve(output, "frames.json"), JSON.stringify(manifest, null, 2) + "\n");
