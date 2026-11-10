import { expect, it } from "vitest";
import approved from "../../../../docs/design/assets/approved/page-visual-v1/scenes/landing/layout.json";
import manifest from "../../../../docs/design/assets/approved/page-visual-v1/production-asset-manifest.json";
import { landingScene } from "./landing-scene";

it("preserves the approved layout and matches the promoted frame geometry", () => {
  expect(landingScene).toEqual(approved);
  for (const scene of Object.values(landingScene)) {
    const layers = [
      { ...scene.architecture, width: scene.width, height: scene.height },
      ...scene.layers,
    ];
    for (const layer of layers) {
      expect(manifest.assets.find((asset) => asset.path === layer.asset_id)).toMatchObject({
        disposition: "promoted-phase-2a",
        sha256: layer.sha256,
        frame_width: layer.width,
        frame_height: layer.height,
      });
    }
  }
});
