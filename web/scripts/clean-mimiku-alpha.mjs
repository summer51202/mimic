import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
  clearConnectedNeutralBackground,
  writePngAtomic,
} from "./export-pixel-runtime-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const characterDirectory = path.resolve(
  scriptDirectory,
  "..",
  "public",
  "pixel-ui",
  "characters",
);

const characterFiles = [
  "mimiku-idle.png",
  "mimiku-happy.png",
  "mimiku-thinking.png",
  "mimiku-reminder.png",
  "mimiku-serious.png",
  "mimiku-lost.png",
];

for (const relativePath of characterFiles) {
  const filename = path.join(characterDirectory, relativePath);
  const png = PNG.sync.read(await readFile(filename));
  clearConnectedNeutralBackground(png);
  await writePngAtomic(filename, png);
}
