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
  "icons-calibration-v03-source.png",
);
const navigationSourcePath = path.join(
  reviewDirectory,
  "samples",
  "derivations",
  "icons-navigation-v04-source.png",
);
const selectedTaskBoardPath = path.join(
  reviewDirectory,
  "samples",
  "task-board-variants",
  "task-board-a-adventurer-contract.png",
);
const outputPath = path.join(
  reviewDirectory,
  "samples",
  "icons-calibration.png",
);

const source = PNG.sync.read(await readFile(sourcePath));
if (source.width !== 1254 || source.height !== 1254) {
  throw new Error("Unexpected Icons replacement source dimensions");
}

const navigationSource = PNG.sync.read(await readFile(navigationSourcePath));
if (navigationSource.width !== 2172 || navigationSource.height !== 724) {
  throw new Error("Unexpected approved navigation source dimensions");
}

const selectedTaskBoard = PNG.sync.read(await readFile(selectedTaskBoardPath));
if (selectedTaskBoard.width !== 1254 || selectedTaskBoard.height !== 1254) {
  throw new Error("Unexpected selected task board dimensions");
}

const output = resizeNearest(source, 1024, 1024);
composeNavigationRow(output, navigationSource, selectedTaskBoard);
zeroTransparentRgb(output);
await writeFile(outputPath, PNG.sync.write(output));

function composeNavigationRow(destination, navigation, selectedTaskBoard) {
  const rowTop = 486;
  const rowBottom = 728;
  const marginX = 18;
  const gap = 8;
  const cellWidth = Math.floor(
    (destination.width - marginX * 2 - gap * 4) / 5,
  );
  const navigationLabels = labelNavigationIcons(navigation);

  clearRect(destination, 0, rowTop, destination.width, rowBottom - rowTop);

  for (let index = 0; index < 5; index += 1) {
    const sourcePng = index === 3 ? selectedTaskBoard : navigation;
    const sourceLabels = index === 3 ? null : navigationLabels;
    const bounds = index === 3
      ? findAlphaBounds(selectedTaskBoard, 16)
      : findLabeledAlphaBounds(navigation, navigationLabels, index);
    const cellLeft = marginX + index * (cellWidth + gap);
    blitContainNearest(
      sourcePng,
      bounds,
      sourceLabels,
      index,
      destination,
      cellLeft,
      rowTop + 8,
      cellWidth,
      rowBottom - rowTop - 16,
    );
  }
}

function findAlphaBounds(png, alphaThreshold) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] < alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Selected task board has no visible pixels");
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function labelNavigationIcons(png) {
  const components = findOpaqueComponents(png, 64);
  const primaryComponents = components
    .filter(({ pixels }) => pixels.length >= 10_000)
    .sort((left, right) => left.minX - right.minX);

  if (primaryComponents.length !== 5) {
    throw new Error("Expected five approved navigation icon components");
  }

  const retainedComponents = components.filter(
    ({ pixels }) => pixels.length >= 1_000,
  );
  const labels = new Int8Array(png.width * png.height);
  labels.fill(-1);
  const distances = new Uint8Array(png.width * png.height);
  distances.fill(255);
  const queue = [];

  for (const component of retainedComponents) {
    const label = nearestComponentLabel(component, primaryComponents);
    for (const pixel of component.pixels) {
      labels[pixel] = label;
      distances[pixel] = 0;
      queue.push(pixel);
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixel = queue[head];
    const distance = distances[pixel];
    if (distance >= 3) continue;
    const y = Math.floor(pixel / png.width);
    const x = pixel - y * png.width;

    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        if (deltaX === 0 && deltaY === 0) continue;
        const nextX = x + deltaX;
        const nextY = y + deltaY;
        if (
          nextX < 0 ||
          nextY < 0 ||
          nextX >= png.width ||
          nextY >= png.height
        ) {
          continue;
        }
        const nextPixel = nextY * png.width + nextX;
        if (distances[nextPixel] <= distance + 1) continue;
        distances[nextPixel] = distance + 1;
        labels[nextPixel] = labels[pixel];
        queue.push(nextPixel);
      }
    }
  }

  return labels;
}

function findOpaqueComponents(png, alphaThreshold) {
  const visited = new Uint8Array(png.width * png.height);
  const components = [];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const start = y * png.width + x;
      if (visited[start] || png.data[start * 4 + 3] < alphaThreshold) {
        continue;
      }

      const pixels = [start];
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      visited[start] = 1;

      for (let head = 0; head < pixels.length; head += 1) {
        const pixel = pixels[head];
        const pixelY = Math.floor(pixel / png.width);
        const pixelX = pixel - pixelY * png.width;
        minX = Math.min(minX, pixelX);
        minY = Math.min(minY, pixelY);
        maxX = Math.max(maxX, pixelX);
        maxY = Math.max(maxY, pixelY);

        for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
          for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
            if (deltaX === 0 && deltaY === 0) continue;
            const nextX = pixelX + deltaX;
            const nextY = pixelY + deltaY;
            if (
              nextX < 0 ||
              nextY < 0 ||
              nextX >= png.width ||
              nextY >= png.height
            ) {
              continue;
            }
            const nextPixel = nextY * png.width + nextX;
            if (
              visited[nextPixel] ||
              png.data[nextPixel * 4 + 3] < alphaThreshold
            ) {
              continue;
            }
            visited[nextPixel] = 1;
            pixels.push(nextPixel);
          }
        }
      }

      components.push({ pixels, minX, minY, maxX, maxY });
    }
  }

  return components;
}

function nearestComponentLabel(component, primaryComponents) {
  const centerX = (component.minX + component.maxX) / 2;
  const centerY = (component.minY + component.maxY) / 2;
  let bestLabel = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < primaryComponents.length; index += 1) {
    const primary = primaryComponents[index];
    const primaryCenterX = (primary.minX + primary.maxX) / 2;
    const primaryCenterY = (primary.minY + primary.maxY) / 2;
    const distance = Math.hypot(
      centerX - primaryCenterX,
      centerY - primaryCenterY,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = index;
    }
  }

  return bestLabel;
}

function findLabeledAlphaBounds(png, labels, label) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const pixel = y * png.width + x;
      if (labels[pixel] !== label || png.data[pixel * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Approved navigation cell has no visible pixels");
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function blitContainNearest(
  sourcePng,
  sourceBounds,
  sourceLabels,
  sourceLabel,
  destination,
  left,
  top,
  width,
  height,
) {
  const scale = Math.min(
    width / sourceBounds.width,
    height / sourceBounds.height,
  );
  const renderWidth = Math.max(1, Math.floor(sourceBounds.width * scale));
  const renderHeight = Math.max(1, Math.floor(sourceBounds.height * scale));
  const renderLeft = left + Math.floor((width - renderWidth) / 2);
  const renderTop = top + Math.floor((height - renderHeight) / 2);

  for (let destinationY = 0; destinationY < renderHeight; destinationY += 1) {
    const sourceY = sourceBounds.top + Math.min(
      sourceBounds.height - 1,
      Math.floor((destinationY * sourceBounds.height) / renderHeight),
    );
    for (let destinationX = 0; destinationX < renderWidth; destinationX += 1) {
      const sourceX = sourceBounds.left + Math.min(
        sourceBounds.width - 1,
        Math.floor((destinationX * sourceBounds.width) / renderWidth),
      );
      if (
        sourceLabels !== null &&
        sourceLabels[sourceY * sourcePng.width + sourceX] !== sourceLabel
      ) {
        continue;
      }
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

function clearRect(png, left, top, width, height) {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const offset = (y * png.width + x) * 4;
      png.data.fill(0, offset, offset + 4);
    }
  }
}

function resizeNearest(sourcePng, width, height) {
  const result = new PNG({ width, height, colorType: 6, inputColorType: 6 });
  result.data.fill(0);

  for (let destinationY = 0; destinationY < height; destinationY += 1) {
    const sourceY = Math.min(
      sourcePng.height - 1,
      Math.floor((destinationY * sourcePng.height) / height),
    );
    for (let destinationX = 0; destinationX < width; destinationX += 1) {
      const sourceX = Math.min(
        sourcePng.width - 1,
        Math.floor((destinationX * sourcePng.width) / width),
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

function zeroTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] !== 0) continue;
    png.data[offset] = 0;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
  }
}
