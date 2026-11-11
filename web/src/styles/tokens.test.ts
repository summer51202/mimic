import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses the dialogue field color for the global HUD", () => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const hud = tokens.match(/--mimic-color-hud-dark:\s*(#[\da-f]{6});/i)?.[1];
  const field = tokens.match(/--mimic-color-dialogue-field:\s*(#[\da-f]{6});/i)?.[1];

  expect(hud).toBe("#211a18");
  expect(hud).toBe(field);
});
