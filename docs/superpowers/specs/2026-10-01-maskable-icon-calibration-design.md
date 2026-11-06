# Maskable Icon Calibration Design

**Date:** 2026-10-01  
**Status:** Approved  
**Scope:** Page Visual Optimization Phase 1 — Icons / Maskable calibration

## Objective

Calibrate a dedicated Mimiku maskable icon composition for installed-PWA surfaces. The artwork must remain identifiable when an operating system applies circular, rounded-square, squircle, or more aggressive icon masks. The result stays review-only until the user approves the exact output hashes and separately authorizes runtime promotion.

## Approved direction

Use a purpose-built maskable composition rather than resizing the approved Install / Favicon master unchanged.

- Preserve the complete Mimiku body, all four feet, and the heart coin.
- Remove the square brass border used by the approved Install / Favicon composition.
- Extend the deep navy background across the complete square canvas so platform cropping never exposes transparency or an unintended matte.
- Keep both eyes, the teeth, the defining chest body, and the complete heart coin inside the central maskable safe zone.
- Allow only non-semantic background pixels outside the safe zone.
- Scale the character slightly smaller than the Install / Favicon master when necessary to create crop tolerance, while retaining sufficient visual weight at launcher size.

The artwork must retain the approved Mimiku pixel-hand-painted RPG style: stepped dark outlines, warm wood, restrained clean brass, broken highlights, two-to-three-step material ramps, deliberate pixel clusters, and mild hand-made asymmetry. It must not reuse the current runtime maskable scene containing sky, grass, moon, horizon, or ground-line elements.

## Safe-zone contract

The review contract uses the centered circular safe zone with an 80% canvas diameter. All defining semantic anatomy must remain within that guide:

- both eyes;
- the complete readable tooth row;
- the main chest silhouette;
- the complete heart coin.

The four feet should remain inside the guide where practical and must remain visible under the reviewed platform masks. Decorative background pixels may be cropped. The review page must demonstrate at least these masks:

- centered circle;
- rounded square;
- squircle;
- one deliberately aggressive crop used only as stress evidence.

No mask preview may imply that the mask shape is baked into the PNG.

## Creative source and deterministic outputs

ImageGen creates one dedicated square creative source using these local references:

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/icon-512.png` for the approved complete-character anatomy and palette;
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png` for the broader pixel-RPG icon family;
- `icon.png` for canonical Mimiku lineage.

The deterministic compositor produces:

| Output | Size | Purpose | Lineage |
|---|---:|---|---|
| `maskable-512.png` | 512 × 512 | Canonical maskable review master | Composed from the ImageGen source |
| `maskable-192.png` | 192 × 192 | Installed-PWA maskable evidence | Nearest-neighbor derivative of `maskable-512.png` |

Both PNGs must be fully opaque. The 192 output must be derived from the encoded composition represented by the 512 master, not independently redrawn or generated.

## Manifest

Create `maskable-icons.manifest.json` with:

- decision state `awaiting-calibration` before exact-hash visual approval;
- source path, dimensions, generator, and SHA-256;
- canonical master identity;
- output path, size, purpose, alpha behavior, parent lineage, resize kernel, and SHA-256;
- the 80% safe-zone rule;
- the explicit review-only and no-runtime-promotion boundary.

## Review page

Create `maskable-icons-review.html` in the existing Page Visual Phase 1 review directory. It must show on one responsive page:

- the 512 and 192 outputs at true size;
- enlarged nearest-neighbor inspection;
- grayscale evidence;
- the centered 80% safe-zone guide;
- circle, rounded-square, squircle, and aggressive-mask previews;
- the approved Install / Favicon master as adjacent context, clearly labeled as a separate approved sub-family;
- exact source and output SHA-256 values;
- live semantic labels explaining what each preview proves;
- statements that the mask is preview-only, the PNG remains square and opaque, and no runtime asset changed;
- the remaining complete-Icons-family and Gate A boundaries.

The page must have no document-level horizontal overflow at viewport widths 320, 390, 768, and 1440 pixels. Large true-size evidence may use a clearly contained internal inspection scroller.

## Test contracts

Add an independent Vitest contract that verifies:

- manifest decision and single-master lineage;
- exact two-output inventory and dimensions;
- fully opaque pixels;
- hashes match the encoded PNG bytes;
- both outputs contain meaningful RGB range and have unique hashes;
- all output paths remain under the review directory and outside `web/public`;
- the review page contains true-size, grayscale, safe-zone, four-mask, approved-install-context, exact-hash, and boundary evidence.

Add a focused Playwright contract that verifies at 320, 390, 768, and 1440 pixels:

- the page heading and expected output/mask counts;
- all referenced images decode;
- safe-zone and boundary labels are visible;
- document-level horizontal overflow is absent.

Verification must also independently confirm deterministic rebuilding, PNG signatures, dimensions, alpha value 255 for every pixel, exact hashes, focused ESLint, focused Vitest, focused Playwright, TypeScript typecheck, and `git diff --check`.

## Repository boundaries

This calibration may create or minimally update only review artifacts, focused tests, the calibration brief, decision log, implementation plan, and `.agents/devlog.md`.

It must not modify:

- `web/public`;
- product runtime source;
- the asset registry;
- the PWA manifest;
- the service worker;
- product pages;
- `.codex-remote-attachments/`;
- `reference/`.

Existing dirty worktree content must be preserved. No reset, checkout, clean, broad staging, or unrelated formatting is allowed.

## Approval boundary

Implementation stops at a visual-review checkpoint with decision `awaiting-calibration`. It must not mark Maskable, the complete Icons family, or Gate A approved without explicit user approval of the presented exact hashes. It must not promote review assets to runtime, begin Phase 2, or reinterpret the already approved Install / Favicon direction.

After Maskable approval, remaining final optical-export evidence must still be reviewed before any complete Icons-family decision.
