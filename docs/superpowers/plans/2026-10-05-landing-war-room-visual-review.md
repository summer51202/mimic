# Landing War Room Visual Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user chose inline execution and prohibited subagents and worktrees for this visual-calibration session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a review-only Landing war-room visual that can be judged against the approved character masters and the written scene design before any product integration.

**Architecture:** Generate separate raster sources for room architecture, four resting characters, and semantic props. Compose a deterministic desktop review image and a phone framing from those sources, then display them with live UI examples and a short journal continuation on one review page. Keep every asset under the existing Phase 1 review directory; no Web runtime or production asset path changes.

**Tech Stack:** Built-in ImageGen, Node.js, `pngjs`, static HTML review, Vitest and Playwright for review-artifact contracts.

---

## File structure and boundaries

- Source images: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/landing-war-room/sources/`. Keep each ImageGen result as an immutable source with a descriptive versioned filename.
- Layout and lineage: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-war-room.config.mjs`. Record reference paths, source paths, intended layer order and pixel-space positions.
- Deterministic composer: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-war-room.mjs`. Read configured sources, normalize dimensions/alpha, composite with nearest-neighbor placement, and write desktop/phone review PNGs, a manifest with hashes, and a review HTML page.
- Review output: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-war-room-review.html`, `landing-war-room.manifest.json`, and `samples/landing-war-room/`. These are review-only.
- Tests: `web/src/shared/brand/landing-war-room-calibration.test.ts` for file/manifest/dimension/alpha contracts and `web/e2e/landing-war-room-review.spec.ts` for rendered desktop/phone review.
- Use the approved warrior, mage, ranger, and Mimiku masters as identity and apparent-grain references. Do not change them.

## Task 1: Establish the visual reference and review checklist

- [ ] Inspect the approved warrior, mage, ranger, and Mimiku masters at original size with `view_image`.
- [ ] Inspect the existing B side-scroller concept only for its horizontal room geometry; reject its blue-heavy palette, generic decorations, and copied character rendering.
- [ ] Read the accepted spec `docs/superpowers/specs/2026-10-05-landing-war-room-visual-design.md` and turn its concrete requirements into a short visual checklist in the review page: party poses, warm room, left/right distinction, one ordinary chest, one pressure plate, two torches, three resting bats, one carving, low-crate map, live wood-sign lettering, bottom dialogue, four journal chapters.
- [ ] Record the intended optical layout in `landing-war-room.config.mjs`: 960 × 540 desktop logical canvas, 1920 × 1080 nearest-neighbor presentation, and a 390 × 600 phone review framing. Treat these as review sizes; manually compare actual apparent grain against the masters.

## Task 2: Generate independent creative raster sources

- [ ] Use built-in ImageGen for one **architecture-only** source: low enclosed natural cave, partial masonry, asymmetric left warm stone entrance and right natural passage, central clear ground, warm brown shadows. No characters, signs, text, generic decorations, UI, or solid dialogue-shaped rectangle.
- [ ] Use built-in ImageGen separately for resting warrior, mage, ranger, and Mimiku sources with transparent backgrounds. Each prompt references its approved master, preserves face/costume/material/skin/scale identity, and changes only the pose to the agreed seated/resting stance. Inspect and revise any source that shifts identity or uses coarser pixels.
- [ ] Use built-in ImageGen for independent transparent semantic-prop sources: small stone-ring fire, low crate with route map, ordinary closed chest, plain wood sign, two wall-torch variants, three resting bats, subtle wall carving, and plain pressure plate. Each source has one role and can be placed or revised without affecting another.
- [ ] Copy every selected project-bound source into the review directory. Record source hashes and parent references. Do not overwrite existing Phase 1 samples.
- [ ] At this checkpoint, compare the separate sources with the character masters before attempting a full scene. Reject AI-added heart marks, repeated glyphs, flags, extra containers, mirror symmetry, and meaningless wear.

## Task 3: Build the review composite with a failing contract first

- [ ] Add a focused Vitest contract that reads the planned manifest and asserts: `decision === "awaiting-calibration"`, `reviewOnly === true`, `runtimePromotion === false`, desktop review size 1920 × 1080, phone review size 390 × 600, all listed paths exist, all recorded SHA-256 hashes match bytes, and all fully transparent pixels have zero RGB.
- [ ] Run `npm test -- src/shared/brand/landing-war-room-calibration.test.ts` from `web/` and confirm it fails because the review manifest does not yet exist.
- [ ] Implement `landing-war-room.config.mjs` with source references, layer order, optical placement, and alpha policy. Implement `compose-landing-war-room.mjs` with deterministic nearest-neighbor scaling and alpha compositing through `pngjs`; derive hashes from written bytes and avoid timestamps that change on rerun. Keep generated HTML text live, with source images referenced by relative paths.
- [ ] Compose a desktop frame whose foreground reaches the bottom and leaves faces, fire, Mimiku, sign, and pressure plate clear of the dialogue overlay. Compose a phone frame by repositioning the same source layers so warrior, mage, ranger, Mimiku, fire, map, and sign fit initially; leave side discoveries for lateral views.
- [ ] Render review HTML showing desktop and phone frames, a live wordmark/sign/dialogue/CTA overlay, a continuous four-chapter journal sample, exact source/output hashes, and a clear visual checklist. Label all art as concept-only and unapproved.
- [ ] Rerun the focused Vitest contract; expected result: pass.

## Task 4: Browser review, self-review, and handoff

- [ ] Add a Playwright contract for 320, 390, 768, and 1440 CSS-pixel viewports: all review images load, live text is selectable, no horizontal overflow occurs, and the review-only state is visible.
- [ ] Run the focused Playwright contract and ESLint on the new test and composer files. Rerun the composer twice and compare output hashes for determinism. Run PNG dimension/alpha validation and `git diff --check` on touched files.
- [ ] Inspect actual desktop and phone images at intended display sizes. Correct important defects: mismatched pixel grain, character identity drift, crowded faces, dialogue overlap, illegible props, repeated filler marks, and a cave mood that reads frightening or blue.
- [ ] Run the repository `self-review` skill, fix critical/important findings, then run `superpowers:verification-before-completion` with fresh command output.
- [ ] Open `landing-war-room-review.html` in Codex and stop for the user's visual judgment. Report hashes and verification evidence. Do not mark Scenes approved, copy assets to `web/public`, implement interactions, or begin Home.

## Execution notes

The repository has a dirty main worktree with pre-existing staged and unstaged visual-calibration work. Preserve it. Never touch `.codex-remote-attachments/` or `reference/`; use explicit paths for any staging and do not use `git add .`. The accepted scene spec is commit `fcb6543`. This plan uses the existing checkout as the user requested.
