// @vitest-environment node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";

it("rebuilds both Home frames and fits eight classes on each shared anchor", () => {
  const dir = path.resolve("../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
  const output = execFileSync(process.execPath, [path.join(dir, "compose-home-base.mjs"), "--check"], { encoding: "utf8" });
  expect(JSON.parse(output)).toMatchObject({ frames: 2, classes: 8, byteIdentical: true });
}, 30_000);
