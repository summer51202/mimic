import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import timing from "../../../public/pixel-ui/v1/motion/motion-timing.json";

it("matches approved timing bytes and hashes each runtime motion sheet", () => {
  const root = "public/pixel-ui/v1/";
  const path = "motion/motion-timing.json";
  expect(readFileSync(root + path).equals(readFileSync(
    `../docs/design/assets/approved/page-visual-v1/${path}`,
  ))).toBe(true);
  for (const variant of Object.values(timing.variants)) {
    for (const [action, { asset_id, sha256 }] of Object.entries(variant)) {
      const sheet = root + asset_id;
      if (action === "celebration") {
        expect(existsSync(sheet), asset_id).toBe(false);
      } else {
        expect(createHash("sha256").update(readFileSync(sheet)).digest("hex"), asset_id).toBe(sha256);
      }
    }
  }
});
