/* @vitest-environment node */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";
it("rebuilds v02 and checks both card zones and all sixteen avatar placements", () => {
  const script = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-home-base-v02.mjs");
  const result = execFileSync(process.execPath, [script, "--check"], { encoding: "utf8" });
  expect(JSON.parse(result)).toMatchObject({ frames: 2, classes: 8, byteIdentical: true });
}, 30_000);
