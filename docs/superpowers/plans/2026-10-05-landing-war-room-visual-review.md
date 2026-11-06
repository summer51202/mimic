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

- [x] Inspect the approved warrior, mage, ranger, and Mimiku masters at original size with `view_image`.
- [ ] Inspect the existing B side-scroller concept only for its horizontal room geometry; reject its blue-heavy palette, generic decorations, and copied character rendering.
- [x] Read the accepted spec `docs/superpowers/specs/2026-10-05-landing-war-room-visual-design.md` and turn its concrete requirements into a short visual checklist in the review page: party poses, warm room, left/right distinction, one ordinary chest, one pressure plate, two torches, three resting bats, one carving, low-crate map, live wood-sign lettering, bottom dialogue, four journal chapters.
- [x] Record the intended optical layout in `landing-war-room.config.mjs`: 960 × 540 desktop logical canvas, 1920 × 1080 nearest-neighbor presentation, and a 390 × 600 phone review framing. Treat these as review sizes; manually compare actual apparent grain against the masters.

## Task 2: Generate independent creative raster sources

- [x] Use built-in ImageGen for one **architecture-only** source: low enclosed cave room, asymmetric left warm stone entrance and right natural passage, central clear ground, warm brown shadows. The user-selected B refinement replaces the central distant rock formations with a close large-block masonry rear wall and leaves natural rock at the ceiling and right passage. No characters, signs, text, generic decorations, UI, or solid dialogue-shaped rectangle.
- [x] Use built-in ImageGen separately for resting warrior, mage, ranger, and Mimiku sources with transparent backgrounds. Each prompt references its approved master, preserves face/costume/material/skin/scale identity, and changes only the pose to the agreed seated/resting stance. Inspect and revise any source that shifts identity or uses coarser pixels.
- [x] Use built-in ImageGen for independent transparent semantic-prop sources: small stone-ring fire, low crate with route map, ordinary closed chest, plain wood sign, two wall-torch variants, three resting bats, subtle wall carving, and plain pressure plate. Each source has one role and can be placed or revised without affecting another.
- [x] Copy every selected project-bound source into the review directory. Record source hashes and parent references. Do not overwrite existing Phase 1 samples.
- [x] At this checkpoint, compare the separate sources with the character masters before attempting a full scene. Reject AI-added heart marks, repeated glyphs, flags, extra containers, mirror symmetry, and meaningless wear.

## Task 3: Build the review composite with a failing contract first

- [x] Add a focused Vitest contract that reads the planned manifest and asserts: `decision === "awaiting-calibration"`, `reviewOnly === true`, `runtimePromotion === false`, desktop review size 1920 × 1080, phone review size 390 × 600, all listed paths exist, all recorded SHA-256 hashes match bytes, and all fully transparent pixels have zero RGB.
- [x] Run `npm test -- src/shared/brand/landing-war-room-calibration.test.ts` from `web/` and confirm it fails because the review manifest does not yet exist.
- [x] Implement `landing-war-room.config.mjs` with source references, layer order, optical placement, and alpha policy. Implement `compose-landing-war-room.mjs` with deterministic nearest-neighbor scaling and alpha compositing through `pngjs`; derive hashes from written bytes and avoid timestamps that change on rerun. Keep generated HTML text live, with source images referenced by relative paths.
- [x] Compose a desktop frame whose foreground reaches the bottom and leaves faces, fire, Mimiku, sign, and pressure plate clear of the dialogue overlay. Compose a phone frame by repositioning the same source layers so warrior, mage, ranger, Mimiku, fire, map, and sign fit initially; leave side discoveries for lateral views.
- [x] Render review HTML showing desktop and phone frames, a live wordmark/sign/dialogue/CTA overlay, a continuous four-chapter journal sample, exact source/output hashes, and a clear visual checklist. Label all art as concept-only and unapproved.
- [x] Rerun the focused Vitest contract; expected result: pass.

## Task 4: Browser review, self-review, and handoff

- [x] Add a Playwright contract for 320, 390, 768, and 1440 CSS-pixel viewports: all review images load, live text is selectable, no horizontal overflow occurs, and the review-only state is visible.
- [x] Run the focused Playwright contract and ESLint on the new test and composer files. Rerun the composer twice and compare output hashes for determinism. Run PNG dimension/alpha validation and `git diff --check` on touched files.
- [x] Inspect actual desktop and phone images at intended display sizes. Correct important defects: mismatched pixel grain, character identity drift, crowded faces, dialogue overlap, illegible props, repeated filler marks, and a cave mood that reads frightening or blue.
- [x] Run the repository `self-review` skill, fix critical/important findings, then run `superpowers:verification-before-completion` with fresh command output.
- [x] Open `landing-war-room-review.html` in Codex and stop for the user's visual judgment. Report hashes and verification evidence. Do not mark Scenes approved, copy assets to `web/public`, implement interactions, or begin Home.

## Execution notes

The repository has a dirty main worktree with pre-existing staged and unstaged visual-calibration work. Preserve it. Never touch `.codex-remote-attachments/` or `reference/`; use explicit paths for any staging and do not use `git add .`. The accepted scene spec is commit `fcb6543`. This plan uses the existing checkout as the user requested.

## Execution checkpoint — 2026-10-05

The desktop/phone review, fourteen immutable ImageGen sources, twenty-one transparent derived layers, approved wordmark reuse, manifest, and contracts are implemented. The existing B concept is not a project-bound input; only its agreed horizontal-room geometry is carried through the accepted spec. Source RGB is preserved for lineage; zero-transparent-RGB validation applies to the actual derived layers and wordmark export. Browser contracts use an ignored `.session` config to exercise the repository's four viewports without starting the product server. User visual approval remains pending; no Scenes approval or runtime promotion is recorded.

The user subsequently selected the **B old-vault masonry background** refinement. `architecture-b-v03-source.png` replaces the selected architecture input while the previous source and v01 desktop/phone PNGs remain preserved. All existing party/prop sources and placements are retained. The submitted prompt and parent-source hash are recorded; the revised scene remains at the visual-review checkpoint.

On 2026-10-06 the user approved refining B to a close **natural rock rear wall** and hanging the approved wooden MIMIC wordmark above the party. `architecture-rock-v04-source.png` and a separate transparent `wordmark-mount-v01-source.png` implement this direction; the v03 source and desktop/phone composites remain preserved. The wordmark's approved pixels remain unchanged and live in the review UI. New contract-first tests cover mount/wordmark connection, upper-wall positioning and party clearance at all four viewports. No existing party/prop source or placement changes; this remains a pending visual-review checkpoint, not Scenes approval.

The user then requested a larger title occupying two thirds of the wall. The desktop central-wall span is 540 logical pixels with a 360-pixel title; the phone initially visible span is 390 pixels with a 260-pixel title. The same wordmark and mounting source are reused, with new placements and proportional mounting exports. Contracts verify the intended wall ratio, actual browser content-box ratio, and continued party clearance. Previous rock-v04 browser previews remain preserved alongside title-large-v05 previews.

The latest refinement reduces that title by 20% to 288/208 logical pixels and flush-mounts it on one continuous natural rock face. `architecture-solid-wall-v06-source.png` locally removes intersecting seams in the title region. Exposed mounting hardware is omitted from the selected composition; prior mounting sources/exports and v05 previews remain preserved, not deleted. Contract-first checks now cover exact 80% scale, title containment within the broad face, absence of the hanging layer, preserved wordmark hash, party clearance and all four browser viewports. Visual acceptance of v06 remains pending.

On 2026-10-07 the user requested shifting the title right to the wall's upper center. Desktop placement becomes [385, 84, 288], centered at logical x=529 within the broad intact face; phone placement becomes [96, 130, 208], centered at x=200 within its visible face. Contract-first checks cover horizontal centering, a vertical center at approximately 35% of the safe face height, and eight logical pixels of clearance from the ceiling bats. All raster sources, title size and underlying composites remain unchanged; center-title-v07 browser previews preserve the actual live positioning.

The subsequent title-tone request is implemented with review-local CSS brightness 0.82 and saturation 0.72, full opacity, and the existing contact shadow. A red-green browser contract checks the actual computed presentation in all four viewports while retaining the previous placement checks. All raster bytes and geometry remain unchanged; tone-title-v08 previews capture the actual desktop and phone rendering. Visual acceptance remains pending.

## Map-crate refinement checkpoint — 2026-10-08

- Keep the user's B-junction/third-v11-brightness selection for later layered integration; do not promote the generated full-scene concept. Keep the fire unchanged for now.
- Generate `map-crate-angle-v02-source.png` with ImageGen from the previous crate and composed-scene references; preserve the v01 source and record the exact prompt and parent hash.
- Use widths 113 desktop / 79 phone (rounded 120% of the old widths), retaining source aspect. Place the crate at [340, 320] desktop / [88, 380] phone, clear of fire and warrior pixels. Move only the desktop warrior from x=274 to x=214 so the map remains on the floor rather than in the foreground cliff; retain the dialogue and all other positions.
- Add contract-first actual-alpha occlusion checks and browser clearance from the dialogue at 320, 390, 768 and 1440. Rebuild deterministic artifacts, verify dimensions, hashes and transparent RGB, inspect actual screenshots, and stop for visual review. The source is not approved and no runtime promotion is authorized.

The next user refinement moves the crate slightly upper-left of the campfire, nearer the warrior/mage. Reuse the same angled source and widths, with desktop [340, 290, 113] and phone [124, 332, 79]. Preserve every v02 character/prop position and source; the crate sits in front of the mage's lower robe, not her face or upper body. Add a red-green upper-left/left-party relation contract, retain fire/warrior pixel-clearance checks, and capture separate `map-crate-upper-left-v03` browser previews. This is a placement-only review checkpoint.

## Approved role-pose execution amendment — 2026-10-08

1. Add contract-first lineage and spatial checks: new warrior warming and mage map-study sources; warrior right of mage and closer to the fire; map still upper-left, full sized and fire-clear. Replace the superseded left-party relation, retaining unrelated contracts.
2. Use built-in ImageGen independently for both transparent character sources, referencing the existing seated source and approved master. Preserve old sources, save exact prompts/parent hashes, and inspect identity, gesture, fine grain and anatomy before composition.
3. Swap the left-party roles through responsive optical positions. Align mage gaze/hand with the existing crate; keep its source and enlarged widths. Keep every other source and position, lighting and live UI unchanged. Save separate role-pose browser previews.
4. Run focused Vitest, four-viewport Playwright, ESLint, typecheck, dimensions/hash/transparent-RGB and determinism checks; self-review and correct important issues; append devlog, open the review and stop for user judgment. No runtime promotion, staging, commit, worktree or subagents.

### Role-pose checkpoint

The separate `warrior-warming-v02-source.png` and `mage-map-study-v02-source.png` inputs implement the approved gestures; their original bytes and exact submitted prompts are retained. Final desktop placements are mage [229, 192, 105], warrior [344, 180, 132], map crate [232, 290, 113]; phone placements are mage [15, 232, 88], warrior [91, 254, 104], map crate [22, 304, 79]. Width adjustments accommodate the revised seated silhouette, rather than changing the approved anatomical direction. The initial warrior/fire collision was caught by a failing actual-alpha contract and corrected. Preserve every other source, placement, lighting setting and UI asset; retain prior previews and save `party-roles-v04` browser previews separately. This remains a review-only visual checkpoint, not approval of the sources or Scenes family.
