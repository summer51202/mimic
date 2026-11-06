# Mimiku States / Actions Calibration Implementation Plan

**Goal:** Produce a review-only eight-pose Mimiku calibration using four exact canonical states and four repaired ImageGen-derived poses, with deterministic masters, combined sheet, hashes, responsive evidence, and no runtime promotion.

**Architecture:** A declarative config records pose order, semantic role, canonical versus ImageGen lineage, and source paths. A PNGJS compositor normalizes all sources into transparent 512 × 512 masters, assembles the 1536 × 1024 sheet, hashes every artifact, and renders the review page. Independent Vitest and Playwright contracts enforce raster, lineage, semantic, and responsive boundaries.

**Execution:** Inline in the current checkout. Do not create a worktree, delegate, stage, or commit. Preserve the dirty worktree and protected directories.

## Files

- Create `web/src/shared/brand/mimiku-states-actions-calibration.test.ts`
- Create `web/e2e/mimiku-states-actions-review.spec.ts`
- Create temporarily `web/playwright.mimiku-states.config.ts`
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/mimiku-states-actions.config.mjs`
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-mimiku-states-actions.mjs`
- Create four ImageGen sources under `samples/derivations/mimiku-states/`
- Create eight masters under `samples/mimiku-states-actions/masters/`
- Create `samples/mimiku-states-actions/mimiku-states-actions-calibration.png`
- Create `mimiku-states-actions.manifest.json`
- Create `mimiku-states-actions-review.html`
- Modify minimally `calibration-briefs.md`, `decision-log.md`, and `.agents/devlog.md`

## Task 1: Write the raster and review contract first

Create a Vitest contract requiring fixed pose order, `awaiting-calibration`, four canonical and four ImageGen-derived lineage records, eight transparent 512 × 512 masters, a 1536 × 1024 sheet, exact hashes, zero RGB in fully transparent pixels, and review-page evidence. Require eight master cards, eight 128 px previews, eight grayscale previews, both semantic comparisons, canonical controls, live labels, and no-runtime/Gate boundaries.

Run:

```powershell
cd web
npx.cmd vitest run src/shared/brand/mimiku-states-actions-calibration.test.ts --reporter=verbose
```

Expected RED: missing manifest and review page only.

## Task 2: Generate four repaired creative sources

Use built-in ImageGen separately for Working, Concerned, record-ledger, and adventure-complete. Reference the canonical model sheet, canonical state sheet, and current calibration. Enforce the approved semantic separation and visual invariants. Save without overwriting prior sources:

- `samples/derivations/mimiku-states/state-working-source.png`
- `samples/derivations/mimiku-states/state-concerned-source.png`
- `samples/derivations/mimiku-states/action-record-ledger-key-source.png`
- `samples/derivations/mimiku-states/action-adventure-complete-key-source.png`

Inspect every result visually before composition. Regenerate or revise any source that violates anatomy, semantics, transparency, or style.

## Task 3: Build deterministic masters, sheet, manifest, and review

Create the config and compositor. Read Idle, Happy, Reminder, and Serious from the existing canonical character PNGs as read-only inputs. Normalize canonical and ImageGen sources with nearest-neighbor containment, clear faint exterior alpha, and zero transparent RGB. Produce eight 512 × 512 masters and the fixed-order 1536 × 1024 sheet.

The manifest records decision, pose order, role, lineage type, source path/hash, master path/hash, dimensions, alpha expectation, normalization method, and runtime promotion `false`.

The review page shows all required visual evidence and exact hashes. Run the compositor twice and require byte-identical outputs. Rerun the Vitest contract; expected GREEN.

## Task 4: Add the four-viewport browser contract

Create the Playwright spec and temporary focused config for 320 × 720, 390 × 844, 768 × 1024, and 1440 × 900. Route the review directory through a constrained local virtual origin. Assert the heading, eight cards, preview/grayscale counts, both comparison sections, canonical controls, decoded images, visible phase boundary, and zero horizontal overflow.

First set an impossible heading and run to obtain four intentional failures. Replace it with the real heading and rerun for four passes.

## Task 5: Update review records and devlog

Append the selected partial-lineage-repair direction, four canonical/four repaired policy, semantic distinctions, presented hashes, and `awaiting-calibration` state to `calibration-briefs.md` and `decision-log.md`. Append a factual AGENTS-format devlog entry. Do not change the family decision in `review-manifest.json` before user approval.

## Task 6: Self-review, verify, and stop

Apply repository `self-review`; fix all Critical and Important findings. Run:

```powershell
cd web
npx.cmd vitest run src/shared/brand/mimiku-states-actions-calibration.test.ts --reporter=verbose
npx.cmd eslint src/shared/brand/mimiku-states-actions-calibration.test.ts e2e/mimiku-states-actions-review.spec.ts
npm.cmd run typecheck
npx.cmd playwright test e2e/mimiku-states-actions-review.spec.ts --config=playwright.mimiku-states.config.ts
```

Independently verify deterministic regeneration, PNG dimensions/alpha/transparent RGB, exact hashes, `git diff --check`, no `web/public` or runtime changes, and protected directories remaining untracked/unstaged. Delete only the temporary Playwright config with `apply_patch`, then rerun the diff check.

Open:

`docs/design/assets/reviews/2026-09-18-page-visual-phase-1/mimiku-states-actions-review.html`

Report all eight exact master hashes and verification results. Stop at `awaiting-calibration`; do not approve the Mimiku family, Gate A, staged production family, runtime promotion, or Phase 2.
