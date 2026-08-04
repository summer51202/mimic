import { open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const assetDirectory = path.join(webDirectory, "public", "pixel-ui");
const sourcePath = path.join(assetDirectory, "icons-ui.png");

const avatarExports = [
  ["avatar-01.png", 85, 360, 170, 180],
  ["avatar-02.png", 255, 360, 170, 180],
  ["avatar-03.png", 430, 360, 170, 180],
  ["avatar-04.png", 610, 360, 170, 180],
];
const frameExport = ["frames-ui.png", 1280, 575, 240, 166];

if (isMainModule()) {
  await exportRuntimeAssets(outputDirectoryFromArguments(process.argv.slice(2)));
}

export async function exportRuntimeAssets(outputDirectory = assetDirectory) {
  const source = PNG.sync.read(await readFile(sourcePath));
  const pendingWrites = [];

  for (const [filename, x, y, width, height] of avatarExports) {
    const avatarCrop = crop(source, x, y, width, height);
    clearConnectedNeutralBackground(avatarCrop);
    const bounds = nonTransparentBounds(avatarCrop);
    const contained = resizeContainNearest(avatarCrop, bounds, 88, 88);
    pendingWrites.push([
      path.join(outputDirectory, filename),
      centerWithoutResampling(contained, 96, 96),
    ]);
  }

  const [frameFilename, frameX, frameY, frameWidth, frameHeight] = frameExport;
  const frameCrop = crop(source, frameX, frameY, frameWidth, frameHeight);
  clearConnectedNeutralBackground(frameCrop);
  nonTransparentBounds(frameCrop);
  pendingWrites.push([
    path.join(outputDirectory, frameFilename),
    centerWithoutResampling(frameCrop, 256, 166),
  ]);

  for (const [filename, png] of pendingWrites) {
    await writePngAtomic(filename, png);
  }
}

export function crop(sourcePng, x, y, width, height) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > sourcePng.width ||
    y + height > sourcePng.height
  ) {
    throw new RangeError(`Crop ${x},${y},${width},${height} is outside the source PNG`);
  }

  const output = transparentPng(width, height);
  PNG.bitblt(sourcePng, output, x, y, width, height, 0, 0);
  return output;
}

export function clearConnectedNeutralBackground(png) {
  const visited = new Uint8Array(png.width * png.height);
  const queue = [];

  for (let x = 0; x < png.width; x += 1) {
    queue.push(x, (png.height - 1) * png.width + x);
  }
  for (let y = 1; y < png.height - 1; y += 1) {
    queue.push(y * png.width, y * png.width + png.width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    if (visited[index]) continue;
    visited[index] = 1;

    const offset = index * 4;
    if (!isNearNeutral(png.data[offset], png.data[offset + 1], png.data[offset + 2])) {
      continue;
    }

    png.data[offset + 3] = 0;
    const x = index % png.width;
    const y = Math.floor(index / png.width);
    if (x > 0) queue.push(index - 1);
    if (x + 1 < png.width) queue.push(index + 1);
    if (y > 0) queue.push(index - png.width);
    if (y + 1 < png.height) queue.push(index + png.width);
  }

  return png;
}

export function nonTransparentBounds(png) {
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
    throw new Error("PNG contains no nontransparent pixels");
  }

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function resizeContainNearest(sourcePng, bounds, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const width = Math.max(1, Math.floor(bounds.width * scale));
  const height = Math.max(1, Math.floor(bounds.height * scale));
  const output = transparentPng(width, height);

  for (let y = 0; y < height; y += 1) {
    const sourceY = bounds.y + nearestSourceCoordinate(y, height, bounds.height);
    for (let x = 0; x < width; x += 1) {
      const sourceX = bounds.x + nearestSourceCoordinate(x, width, bounds.width);
      const sourceOffset = (sourceY * sourcePng.width + sourceX) * 4;
      const outputOffset = (y * width + x) * 4;
      sourcePng.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }

  return output;
}

export function centerWithoutResampling(sourcePng, width, height) {
  if (sourcePng.width > width || sourcePng.height > height) {
    throw new RangeError("Source PNG does not fit within the target canvas");
  }

  const output = transparentPng(width, height);
  const x = Math.floor((width - sourcePng.width) / 2);
  const y = Math.floor((height - sourcePng.height) / 2);
  PNG.bitblt(sourcePng, output, 0, 0, sourcePng.width, sourcePng.height, x, y);
  return output;
}

export async function writePngAtomic(filename, png) {
  const temporary = `${filename}.tmp`;
  let handle;
  await rm(temporary, { force: true });
  try {
    handle = await open(temporary, "wx");
    await handle.writeFile(PNG.sync.write(png));
    await handle.close();
    handle = undefined;
    await rename(temporary, filename);
  } catch (error) {
    try {
      await handle?.close();
    } catch {
      // Preserve the original write or rename failure.
    }
    try {
      await rm(temporary, { force: true });
    } catch {
      // Preserve the original write or rename failure.
    }
    throw error;
  }
}

function transparentPng(width, height) {
  return new PNG({ width, height, colorType: 6, inputColorType: 6 });
}

function isNearNeutral(red, green, blue) {
  return Math.max(red, green, blue) - Math.min(red, green, blue) <= 12 &&
    Math.min(red, green, blue) >= 230;
}

function nearestSourceCoordinate(coordinate, destinationSize, sourceSize) {
  if (destinationSize === 1) return Math.floor(sourceSize / 2);
  return Math.round((coordinate * (sourceSize - 1)) / (destinationSize - 1));
}

function outputDirectoryFromArguments(arguments_) {
  if (arguments_.length === 0) return assetDirectory;
  if (arguments_.length === 2 && arguments_[0] === "--output-dir") {
    return path.resolve(arguments_[1]);
  }
  throw new Error("Usage: npm run assets:export -- [--output-dir <directory>]");
}

function isMainModule() {
  return process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
