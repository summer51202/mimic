import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

const samples = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples");

it.each([
  { folder: "frames", size: 36, slice: 10, phone: 16, desktop: 24 },
  { folder: "frames-2r", size: 52, slice: 14, phone: 18, desktop: 26 },
])("$folder keeps five transparent-center masters with seamless repeated edges", (contract) => {
  const directory = path.join(samples, contract.folder);
  const { frames, source } = JSON.parse(readFileSync(path.join(directory, "frames.json"), "utf8"));
  if (contract.folder === "frames-2r") {
    const bytes = readFileSync(path.join(directory, source.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  }
  expect(Object.keys(frames)).toEqual(["parchment", "wood", "stone", "dialogue", "notebook"]);
  for (const [id, frame] of Object.entries<{
    file: string; sha256: string; width: number; height: number; slice: number;
    scale: number; repeat: string; centerToken: string; minPadding: { phone: number; desktop: number };
  }>(frames)) {
    const bytes = readFileSync(path.join(directory, frame.file));
    const png = PNG.sync.read(bytes);
    const { slice, scale } = frame;
    const size = png.width;
    expect([png.width, png.height]).toEqual([frame.width, frame.height]);
    expect(png.height).toBe(size);
    expect(size).toBeGreaterThan(2 * slice);
    expect([size, slice, scale]).toEqual([contract.size, contract.slice, 2]);
    expect(frame.repeat).toBe("repeat");
    expect(frame.centerToken).toMatch(/^--/);
    expect(frame.minPadding).toEqual({ phone: contract.phone, desktop: contract.desktop });
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(frame.sha256);
    for (let y = slice; y < size - slice; y++) {
      for (let x = slice; x < size - slice; x++) {
        expect(png.data[(y * size + x) * 4 + 3], id).toBe(0);
      }
    }
    for (const horizontal of [true, false]) {
      for (const inset of [0, size - slice]) {
        const difference = (a: number, b: number) => {
          let sum = 0;
          for (let cross = inset; cross < inset + slice; cross++) {
            const index = (along: number) => (horizontal ? cross * size + along : along * size + cross) * 4;
            for (let channel = 0; channel < 4; channel++) {
              sum += Math.abs(png.data[index(a) + channel] - png.data[index(b) + channel]);
            }
          }
          return sum;
        };
        const end = size - slice - 1;
        let total = 0;
        for (let i = slice; i < end; i++) total += difference(i, i + 1);
        expect(difference(slice, end), `${id} edge ${horizontal}/${inset}`).toBeLessThanOrEqual(total / (end - slice));
      }
    }
  }
});
