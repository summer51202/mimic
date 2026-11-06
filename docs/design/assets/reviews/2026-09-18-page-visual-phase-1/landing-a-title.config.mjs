export const config = {
  decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false, baseVariant: "A",
  basePath: "landing-warm-rest.manifest.json",
  previousPage: "landing-warm-rest-review.html",
  lineagePath: "samples/derivations/landing-a-title/lineage.json",
  rawStaggered: "samples/derivations/landing-a-title/wordmark-staggered-v02-source.png",
  spec: "docs/superpowers/specs/2026-10-09-landing-a-party-staggered-wordmark-design.md",
  frames: {
    "desktop-single": { view: "desktop", wordmark: "single", wall: [385,84,288,85] },
    "desktop-staggered": { view: "desktop", wordmark: "staggered", wall: [420,80,175,104] },
    "phone-staggered": { view: "phone", wordmark: "staggered", wall: [116,90,148,104] },
  },
};
