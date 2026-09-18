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

const sourcePath = path.join(
  reviewDirectory,
  "samples",
  "derivations",
  "wordmark-pixel-source.png",
);
const outputPath = path.join(
  reviewDirectory,
  "samples",
  "wordmark-calibration.png",
);

const source = PNG.sync.read(await readFile(sourcePath));
if (source.width !== 2172 || source.height !== 724) {
  throw new Error("Unexpected wordmark source dimensions");
}

clearFaintAlpha(source, 1);
zeroTransparentRgb(source);

const output = new PNG({
  width: 1200,
  height: 400,
  colorType: 6,
  inputColorType: 6,
});
output.data.fill(0);

const display = containNearest(source, 900, 300);
const compact = containNearest(source, 240, 88);
PNG.bitblt(
  display,
  output,
  0,
  0,
  display.width,
  display.height,
  28,
  Math.floor((400 - display.height) / 2),
);
PNG.bitblt(
  compact,
  output,
  0,
  0,
  compact.width,
  compact.height,
  1200 - compact.width - 24,
  400 - compact.height - 28,
);

zeroTransparentRgb(output);
await writeFile(outputPath, PNG.sync.write(output));

function containNearest(sourcePng, maxWidth, maxHeight) {
  const bounds = nonTransparentBounds(sourcePng);
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const result = new PNG({ width, height, colorType: 6, inputColorType: 6 });
  result.data.fill(0);

  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY =
      bounds.y +
      Math.min(
        bounds.height - 1,
        Math.floor((destinationY * bounds.height) / height),
      );
    for (let destinationX = 0; destinationX < width; destinationX += 1) {
      const sourceX =
        bounds.x +
        Math.min(
          bounds.width - 1,
          Math.floor((destinationX * bounds.width) / width),
        );
      const sourceOffset = (sourceY * sourcePng.width + sourceX) * 4;
      const destinationOffset = (destinationY * width + destinationX) * 4;
      sourcePng.data.copy(
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
    throw new Error("Wordmark source contains no visible pixels");
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

function clearFaintAlpha(png, maximumAlpha) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] <= maximumAlpha) {
      png.data.fill(0, offset, offset + 4);
    }
  }
}
