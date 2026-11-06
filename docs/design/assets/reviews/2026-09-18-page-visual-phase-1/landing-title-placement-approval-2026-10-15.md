# Landing title placement approval — 2026-10-15

## Decision and scope

The user replied “OK” while reviewing `landing-title-placement-review.html`.
This approves only the two applied title placements below, in logical pixels with
a top-left anchor:

| Frame | Composition | Frame size | Title x / y | Fixed title size |
| --- | --- | --- | --- | --- |
| desktop-single | Single-line MIMIC | 960 × 540 | 376 / 100 | 288 × 84 |
| phone-staggered | Equal-size MI / MIC, staggered | 390 × 600 | 130 / 59 | 148 × 98 |

No additional approval is inferred for title size, tone, artwork, other scene
objects, interactions, or the complete Landing / Scenes family.

## Exact reviewed evidence

All paths below are relative to this review directory.

| Evidence | SHA-256 |
| --- | --- |
| `landing-title-placement-review.html` | `da5a81e41a8b3f5bda76732ac6c611731d87f386819883816250b5542c515c71` |
| `landing-title-placement.manifest.json` | `df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5` |
| `landing-title-placement.receipts.json` | `a2a124d5aa3e4f25cbea904b79eaffabbe26f3f5e5bd029e8ec82a2c457516e9` |

All PNG paths below are relative to `samples/landing-title-placement-v01/`.

| Output | Dimensions | SHA-256 |
| --- | --- | --- |
| `desktop-single-logical.png` | 960 × 540 | `08dca5cb9f13c0a4ede1322f4e8f93295cae7b39a36438509a1286f12f87643f` |
| `desktop-single-color.png` | 1920 × 1080 | `3208e934a247796a438f029458a4e82fe1a229dd8c8c5208d8a8a903c60923c4` |
| `desktop-single-gray.png` | 1920 × 1080 | `60461e78796adb24ca9fe64d1981447cfd280d8537dbddab2200bfd07e344093` |
| `phone-staggered-logical.png` | 390 × 600 | `dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf` |
| `phone-staggered-color.png` | 390 × 600 | `dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf` |
| `phone-staggered-gray.png` | 390 × 600 | `317ad09e18904b7bca29496418a59a0aa5f9c72f611c4d23c83661fbe536c2ac` |

## Boundaries and preservation

- This is a narrow visual approval receipt, not a family-level gate transition.
- The existing generated manifest remains `awaiting-calibration`,
  `reviewOnly: true`, and `runtimePromotion: false`.
- Original source images, title assets, positioning tools, configuration,
  manifests, and generated review outputs are not changed by this record.
- No runtime, `web/public`, registry, PWA manifest, service worker,
  production exports, accounting behavior, or Phase 2 work is authorized.
- Chest, map-crate, and trap placement reviews remain separate follow-ups.
- This record is left unstaged and uncommitted; prior dirty work is preserved.
