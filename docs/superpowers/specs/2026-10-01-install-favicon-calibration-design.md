# Install / Favicon Calibration Design

**Date:** 2026-10-01  
**Status:** Approved  
**Parent gate:** Page Visual Optimization Phase 1 — Asset Style Gate

## Objective

Calibrate one Mimiku install-icon composition and derive every install and favicon review size from that same master. The result remains review-only outside `web/public/` until the user approves the exact hashes and the later runtime-promotion step is explicitly authorized.

## Approved Direction

The selected approach is **C: one master, resized**.

The master shows the complete Mimiku treasure-chest character with asymmetric eyes, visible teeth, readable chest silhouette, and the heart coin. It uses the established dark navy field, warm wood, clean restrained brass, cream teeth, deep brown-black stepped outlines, broken highlights, deliberate pixel clusters, and slight hand-made asymmetry.

Every review output retains the same composition. The 16 px and 32 px favicons do not receive a separate face-only redraw and do not omit the heart coin.

## Explicit Phase 1 Exception

Earlier Phase 1 guidance described the primary PWA icon as a close-up face and required 16 px and 32 px favicons to prioritize the face and silhouette, allowing the heart coin to be omitted when illegible. The user knowingly selected the visually consistent complete-character, single-master treatment shown in the comparison instead.

For this sub-family, the selected rule is:

- composition consistency takes priority over size-specific simplification;
- the full treasure-chest body replaces the earlier close-up-face crop at every size;
- the complete character and heart coin remain present at 16, 32, 48, 192, and 512 px;
- small-size detail loss caused by deterministic resizing is accepted when the outer silhouette, eye pair, mouth opening, and brass/wood separation remain identifiable;
- no per-size repainting, element removal, crop change, or optical redraw is permitted after the master is fixed.

This exception applies only to Install / Favicon calibration. It does not approve Maskable artwork, promote the complete Icons family, or alter accounting/UI icon requirements.

## Asset Architecture

### Creative source

Use ImageGen to create or revise one square Mimiku source using these references:

- `icon.png` for character identity and anatomy;
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png` for the approved pixel-RPG family and scale precedent;
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png` for current Phase 1 material treatment and pixel density.

The source must contain no text, number, currency symbol, UI chrome, scenery, platform mask guide, shadow cast outside the icon field, or unrelated prop.

### Canonical review master

Create one deterministic 512 × 512 opaque PNG master:

- square dark navy field;
- restrained gold/brass perimeter treatment;
- complete Mimiku and heart coin centered with consistent breathing room;
- no platform-specific mask crop;
- exact SHA-256 recorded in the manifest and review page.

### Deterministic derivatives

Generate these files from the exact 512 × 512 master without repainting:

| Review output | Purpose |
|---|---|
| `icon-512.png` | canonical install review master |
| `icon-192.png` | required PWA install-size evidence |
| `icon-48.png` | intermediate optical evidence only |
| `favicon-32.png` | high-density browser favicon evidence |
| `favicon-16.png` | smallest browser favicon evidence |

The compositor must use one declared deterministic resize kernel for all derivatives. Re-running it from unchanged inputs must reproduce every SHA-256 exactly.

## Review Artifact

Create `install-favicon-review.html` in the existing Phase 1 review directory. It must show:

- the ImageGen source and 512 × 512 canonical master;
- true-size 16, 32, 48, 192, and 512 px color outputs;
- the same five outputs in grayscale;
- enlarged nearest-neighbor inspection views that do not replace the true-size evidence;
- browser-tab context for 16 and 32 px;
- installed-app context for 192 and 512 px;
- exact SHA-256 values for the master and every derivative;
- the explicit single-master exception and its accepted trade-off;
- live text identifying every size and consumer;
- a clear statement that Maskable remains pending and no runtime asset is promoted.

The page must have no horizontal overflow at 320, 390, 768, and 1440 px.

## Manifest and Contracts

Create an `install-favicon.manifest.json` containing source provenance, dimensions, alpha behavior, purpose, master relationship, resize kernel, decision state, and SHA-256 for every output.

Add an independent Vitest contract that verifies:

- exact filenames and dimensions;
- opaque output for all five files;
- a single canonical master relationship;
- every derivative declares the same deterministic resize kernel;
- nonempty pixels and unique hashes;
- the review page contains true-size, grayscale, context, hash, and exception evidence;
- the decision remains `awaiting-calibration` before visual approval.

Add a four-viewport Playwright contract that verifies the page loads all images, exposes live labels, and has no horizontal overflow at 320, 390, 768, and 1440 px.

## Boundaries

This calibration must not modify:

- `web/public/`;
- product runtime source;
- the asset registry;
- PWA manifest or metadata;
- service worker configuration;
- product pages;
- Maskable icons.

The work stops at a visual-review checkpoint. It must not mark Install / Favicon, Maskable, the complete Icons family, or Gate A approved without explicit user approval of the presented hashes.

## Acceptance Criteria

The checkpoint is ready for user review when:

1. one ImageGen source and one deterministic 512 px master exist outside runtime;
2. 192, 48, 32, and 16 px outputs are derived from that master without optical redraws;
3. every file has recorded dimensions, opacity, provenance, consumer, and SHA-256;
4. the review page presents true-size, enlarged, grayscale, and usage-context evidence without overflow;
5. focused Vitest, ESLint, typecheck, four-viewport Playwright, determinism, PNG integrity, opacity, dimension, and `git diff --check` verification pass;
6. self-review finds no unresolved critical or important issue;
7. runtime and protected dirty-worktree boundaries remain unchanged.
