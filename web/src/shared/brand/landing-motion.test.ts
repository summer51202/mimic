import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import timing from "../../../../docs/design/assets/approved/page-visual-v1/motion/motion-timing.json";
import { chestTimelines, landingMotion } from "./landing-motion";

it("matches each approved chest frame name and duration in both directions", async () => {
  const source = await readFile(
    "../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.config.mjs",
    "utf8",
  );
  for (const direction of ["open", "close"] as const) {
    const approved = source.match(new RegExp(`^  ${direction}:(\\[.*\\]),$`, "m"))?.[1];
    expect(approved).toBeDefined();
    expect(chestTimelines[direction]).toEqual(JSON.parse(approved!));
  }
});

it("matches the approved title and campfire playback values for both variants", () => {
  for (const variant of ["desktop", "phone"] as const) {
    for (const layer of ["title", "fire"] as const) {
      expect(landingMotion[variant][layer]).toEqual(timing.variants[variant][layer]);
    }
  }
  expect(landingMotion.titleInterval).toEqual(timing.playback.title.interval_ms);
});
