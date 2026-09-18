import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(reviewDirectory, "../../../../..");
const { PNG } = require(
  path.join(repositoryDirectory, "web", "node_modules", "pngjs"),
);

const runtimeDirectory = path.join(
  repositoryDirectory,
  "web",
  "public",
  "pixel-ui",
  "characters",
);
const derivedPath = path.join(
  reviewDirectory,
  "samples",
  "derivations",
  "mimiku-derived-poses.png",
);
const concernedPath = path.join(
  reviewDirectory,
  "samples",
  "derivations",
  "mimiku-concerned-pose.png",
);
const outputPath = path.join(
  reviewDirectory,
  "samples",
  "mimiku-states-calibration.png",
);

const derived = PNG.sync.read(await readFile(derivedPath));
if (derived.width !== 2172 || derived.height !== 724) {
  throw new Error("Unexpected Mimiku derived-pose sheet dimensions");
}
const concerned = PNG.sync.read(await readFile(concernedPath));
clearFaintAlpha(concerned, 1);
zeroTransparentRgb(concerned);

const sources = [
  await readCanonicalState(path.join(runtimeDirectory, "mimiku-idle.png")),
  crop(derived, 0, 0, 724, 724),
  await readCanonicalState(path.join(runtimeDirectory, "mimiku-happy.png")),
  await readCanonicalState(path.join(runtimeDirectory, "mimiku-reminder.png")),
  await readCanonicalState(path.join(runtimeDirectory, "mimiku-serious.png")),
  concerned,
  crop(derived, 724, 0, 724, 724),
  crop(derived, 1448, 0, 724, 724),
];

const output = new PNG({
  width: 1536,
  height: 1024,
  colorType: 6,
  inputColorType: 6,
});
output.data.fill(0);

for (const [index, source] of sources.entries()) {
  const contained = containNearest(source, 336, 432);
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = column * 384 + Math.floor((384 - contained.width) / 2);
  const y = row * 512 + Math.floor((512 - contained.height) / 2);
  PNG.bitblt(contained, output, 0, 0, contained.width, contained.height, x, y);
}

zeroTransparentRgb(output);
await writeFile(outputPath, PNG.sync.write(output));

async function readPng(filename) {
  return PNG.sync.read(await readFile(filename));
}

async function readCanonicalState(filename) {
  const png = await readPng(filename);
  clearSmallEdgeComponents(png);
  return png;
}

function crop(source, x, y, width, height) {
  const result = new PNG({ width, height, colorType: 6, inputColorType: 6 });
  result.data.fill(0);
  PNG.bitblt(source, result, x, y, width, height, 0, 0);
  return result;
}

function containNearest(source, maxWidth, maxHeight) {
  const bounds = nonTransparentBounds(source);
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const result = new PNG({ width, height, colorType: 6, inputColorType: 6 });

  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY = bounds.y + Math.min(
      bounds.height - 1,
      Math.floor((destinationY * bounds.height) / height),
    );
    for (let destinationX = 0; destinationX < width; destinationX += 1) {
      const sourceX = bounds.x + Math.min(
        bounds.width - 1,
        Math.floor((destinationX * bounds.width) / width),
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const destinationOffset = (destinationY * width + destinationX) * 4;
      source.data.copy(
        result.data,
        destinationOffset,
        sourceOffset,
        sourceOffset + 4,
      );
    }
  }

  return result;
}

function nonTransparentBounds(png) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error("Mimiku source contains no visible pixels");
  }

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] !== 0) continue;
    png.data[offset] = 0;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
  }
}

function clearSmallEdgeComponents(png) {
  const visited = new Uint8Array(png.width * png.height);
  const edgeMargin = 8;

  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || png.data[start * 4 + 3] === 0) continue;

    const stack = [start];
    const pixels = [];
    let nearEdge = false;
    visited[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop();
      pixels.push(index);
      const x = index % png.width;
      const y = Math.floor(index / png.width);
      nearEdge ||=
        x < edgeMargin ||
        y < edgeMargin ||
        x >= png.width - edgeMargin ||
        y >= png.height - edgeMargin;

      for (const neighbor of [
        x > 0 ? index - 1 : -1,
        x + 1 < png.width ? index + 1 : -1,
        y > 0 ? index - png.width : -1,
        y + 1 < png.height ? index + png.width : -1,
      ]) {
        if (
          neighbor < 0 ||
          visited[neighbor] ||
          png.data[neighbor * 4 + 3] === 0
        ) {
          continue;
        }
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    if (!nearEdge || pixels.length >= 1000) continue;
    for (const index of pixels) {
      png.data.fill(0, index * 4, index * 4 + 4);
    }
  }
}

function clearFaintAlpha(png, maximumAlpha) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] <= maximumAlpha) {
      png.data.fill(0, offset, offset + 4);
    }
  }
}
