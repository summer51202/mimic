# Wordmark Pixel-Lineage Audit

**Audit scope:** Wordmark calibration only  
**Design baseline:** `a157a83`  
**Audit date:** 2026-09-18  
**Gate state:** replacement is `awaiting-calibration`.

The approved wordmark structure remains uppercase `MIMIC`, with the asymmetric
eyes inside the first `M`, sparse joining hardware, and the mouth/heart-coin
identity in the final `C`. The rejected samples failed because their smooth,
high-resolution cartoon rendering did not share Mimiku's hand-drawn pixel
language.

## Pixel-art style authority

| Source | Role |
|---|---|
| `docs/design/assets/sources/mimiku/mimiku-master.png` | Immutable pixel-art style authority for stepped navy outlines, wood, brass, teeth, heart coin, limited palette, and clustered highlights |
| `docs/design/assets/sources/mimiku/mimiku-model-sheet.png` | Authority for asymmetry, facial construction, expression, proportions, and hand-drawn pixel irregularity |

The source-constrained replacement must use visible square pixel clusters,
limited color ramps, restrained dithering, and deliberately stepped silhouettes.
It must not resemble smooth vector art, polished 3D, airbrushed cartoon art, or
high-resolution painted wood.

## Rejected calibration evidence

| Asset | SHA-256 | Decision | Evidence |
|---|---|---|---|
| `samples/rejected/wordmark-calibration-e1dde795.png` | `e1dde795ca8873543d44cd7735477cc7766459790ecd10a8dac3eec1927a365e` | `rejected/superseded` | Wood-led revision still used smooth anti-aliased painting, rounded high-resolution shading, and non-pixel contours unlike canonical Mimiku. |

The rejected file is retained only for audit. It must not be used as a style
reference, promoted to runtime, or expanded into a complete family.

## Replacement construction

- `samples/derivations/wordmark-pixel-source.png` is a 2172 × 724 RGBA image
  generated from the two canonical Mimiku sources above; exact spelling is
  `MIMIC`; SHA-256 is
  `74c2c21e1dcf78732528f205987f572fce96fb5305b7ebd1a4da586157368fa2`.
- `compose-wordmark-calibration.mjs` deterministically places one display-scale
  arrangement and one compact optical inset on the required transparent
  1200 × 400 canvas using nearest-neighbor resampling.
- `samples/wordmark-calibration.png` is the current replacement candidate;
  SHA-256 is
  `4a9c037db30e1cfe69db702ab473efccc08f9278d93e6d167252c34f41b38f14`.
- No tagline, action, financial fact, name, date, status, or fallback text is
  baked into the image.
- The current candidate remains review-only and unapproved.
