import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
  clearConnectedNeutralBackground,
  writePngAtomic,
} from "./export-pixel-runtime-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(scriptDirectory, "..", "public");

const characterFiles = [
  "brand/mimiku-idle.png",
  "brand/mimiku-happy.png",
  "brand/mimiku-thinking.png",
  "brand/mimiku-reminder.png",
  "brand/mimiku-serious.png",
  "brand/mimiku-lost.png",
  "pixel-ui/mimiku-dashboard.png",
  "pixel-ui/mimiku-empty-group.png",
  "pixel-ui/mimiku-empty-fund.png",
  "pixel-ui/mimiku-invite.png",
  "pixel-ui/mimiku-success.png",
  "pixel-ui/mimiku-serious.png",
];

for (const relativePath of characterFiles) {
  const filename = path.join(publicDirectory, relativePath);
  const png = PNG.sync.read(await readFile(filename));
  clearConnectedNeutralBackground(png);
  await writePngAtomic(filename, png);
}
