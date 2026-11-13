import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("uses the dialogue field color for the global HUD", () => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const hud = tokens.match(/--mimic-color-hud-dark:\s*(#[\da-f]{6});/i)?.[1];
  const field = tokens.match(/--mimic-color-dialogue-field:\s*(#[\da-f]{6});/i)?.[1];

  expect(hud).toBe("#211a18");
  expect(hud).toBe(field);
});

it("uses the approved notebook center color", () => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const frames = JSON.parse(readFileSync("public/pixel-ui/v1/frames/frames.json", "utf8"));
  expect(tokens.match(/--mimic-color-notebook-field:\s*(#[\da-f]{6});/i)?.[1])
    .toBe(frames.frames.notebook.centerColor);
});

it("defines every referenced Mimic font token and uses a monospace stack for Mimic IDs", () => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  expect(tokens).toContain('--mimic-font-pixel: ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace;');
  const defined = new Set(Array.from(tokens.matchAll(/(--mimic-font-[\w-]+)\s*:/g), match => match[1]));
  for (const file of readdirSync("src", { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".css")) continue;
    const path = join(file.parentPath, file.name);
    const css = readFileSync(path, "utf8");
    for (const [, token] of css.matchAll(/var\(\s*(--mimic-font-[\w-]+)/g)) {
      expect(defined.has(token), `${token} in ${path}`).toBe(true);
    }
  }
});
