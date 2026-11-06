import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  "record-expense-action-v01-source.png",
);
const outputDirectory = path.join(
  reviewDirectory,
  "samples",
  "record-expense-action",
);
const outputPath = path.join(
  outputDirectory,
  "record-expense-action-v01.png",
);

const outputSize = 192;
const contentSize = 168;
const alphaThreshold = 16;

const source = PNG.sync.read(await readFile(sourcePath));
const sourceBounds = findAlphaBounds(source, alphaThreshold);
const output = new PNG({
  width: outputSize,
  height: outputSize,
  colorType: 6,
  inputColorType: 6,
});
output.data.fill(0);

blitContainNearest(source, sourceBounds, output, contentSize);
zeroTransparentRgb(output);
assertOutputContract(output);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, PNG.sync.write(output));

function findAlphaBounds(png, threshold) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Record-expense source has no visible pixels");
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function blitContainNearest(sourcePng, bounds, destination, maximumSize) {
  const scale = Math.min(maximumSize / bounds.width, maximumSize / bounds.height);
  const renderWidth = Math.max(1, Math.floor(bounds.width * scale));
  const renderHeight = Math.max(1, Math.floor(bounds.height * scale));
  const renderLeft = Math.floor((destination.width - renderWidth) / 2);
  const renderTop = Math.floor((destination.height - renderHeight) / 2);

  for (let destinationY = 0; destinationY < renderHeight; destinationY += 1) {
    const sourceY = bounds.top + Math.min(
      bounds.height - 1,
      Math.floor((destinationY * bounds.height) / renderHeight),
    );
    for (let destinationX = 0; destinationX < renderWidth; destinationX += 1) {
      const sourceX = bounds.left + Math.min(
        bounds.width - 1,
        Math.floor((destinationX * bounds.width) / renderWidth),
      );
      const sourceOffset = (sourceY * sourcePng.width + sourceX) * 4;
      const destinationOffset = (
        (renderTop + destinationY) * destination.width
        + renderLeft
        + destinationX
      ) * 4;
      sourcePng.data.copy(
        destination.data,
        destinationOffset,
        sourceOffset,
        sourceOffset + 4,
      );
    }
  }
}

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] !== 0) continue;
    png.data[offset] = 0;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
  }
}

function assertOutputContract(png) {
  if (png.width !== outputSize || png.height !== outputSize) {
    throw new Error("Record-expense output must be 192 by 192 pixels");
  }

  const bounds = findAlphaBounds(png, alphaThreshold);
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  if (
    bounds.left < 8
    || bounds.top < 8
    || right > png.width - 8
    || bottom > png.height - 8
  ) {
    throw new Error("Record-expense output touches the 8px inspection margin");
  }
}
