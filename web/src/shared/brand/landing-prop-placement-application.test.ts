// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const dir = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");

it("rebuilds the applied scene byte for byte from the verified sources", () => {
  const output = execFileSync(process.execPath, [
    path.join(dir, "compose-landing-prop-placement-application.mjs"),
    "--check",
  ], { encoding: "utf8" });
  expect(JSON.parse(output)).toMatchObject({ closedHeight: 94, byteIdentical: true });
}, 30_000);

it("keeps the accepted ground anchors and scene depth order", () => {
  const manifest = JSON.parse(readFileSync(path.join(dir, "landing-prop-placement-application.manifest.json"), "utf8"));
  const { desktop, phone } = manifest.scenes;
  expect(manifest.chestOrigin).toEqual({ x: 216, y: 160 });
  expect(desktop.crate.ground).toEqual({ x: 209.5, y: 371 });
  expect(phone.crate.ground).toEqual({ x: 196.5, y: 412 });
  expect(desktop.crate.sprite.bounds.height * 2).toBe(manifest.closedHeight);
  expect(desktop.order.indexOf("chest")).toBeLessThan(desktop.order.indexOf("warrior"));
  expect(desktop.order.indexOf("warrior")).toBeLessThan(desktop.order.indexOf("mapCrate"));
  expect(desktop.order).not.toContain("pressurePlate");
  expect(phone.order).not.toContain("pressurePlate");
  expect(phone.order).not.toContain("chest");
});
