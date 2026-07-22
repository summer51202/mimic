import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

const pngSignature = "89504e470d0a1a0a";

const assets = [
  ["mimiku-master.png", 1024, 1024],
  ["mimiku-hero.png", 1672, 941],
  ["mimiku-idle.png", 512, 512],
  ["mimiku-happy.png", 512, 512],
  ["mimiku-thinking.png", 512, 512],
  ["mimiku-reminder.png", 512, 512],
  ["mimiku-serious.png", 512, 512],
  ["mimiku-lost.png", 512, 512],
  ["mimiku-states.png", 3072, 512],
  ["mimiku-model-sheet.png", 1536, 1024],
] as const;

it.each(assets)("ships %s as a valid %ix%i PNG", async (file, width, height) => {
  const image = await readFile(path.join(process.cwd(), "public/brand", file));

  expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
  expect(image.readUInt32BE(16)).toBe(width);
  expect(image.readUInt32BE(20)).toBe(height);
});
