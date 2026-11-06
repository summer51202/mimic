# Restored treasure chest — verification receipt

Date: 2026-10-20. Phase1 / Scenes / Landing; review-only, awaiting-calibration, runtimePromotion:false.
Technical verification is complete; the new artwork and Scenes family are not approved.

## Deliverables

- [Review page](restored-treasure-chest-review.html): four semantic-state controls, eight frame controls, manual weighted opening/closing, actual104×120 /2× /true grayscale, v01 comparison, warrior references, frozen phone, live UI and four journal chapters.
- [Manifest](restored-treasure-chest.manifest.json): exact source/output hashes, ordered source lineage, grid/transform/anchors and reproducible timelines.
- [Actual prompts](samples/derivations/treasure-chest-states-v02/prompt.md), [lineage](samples/derivations/treasure-chest-states-v02/lineage.json).
- 49 actual PNGs: one chest-free background plus eight frames × sprite/sprite-gray/2×/logical/color/gray. Six new ESM modules; two Vitest contracts; one Playwright spec/config.
- Source selected from three built-in ImageGen calls. All raw attempts retained; selected bytes equal attempt03. No procedural creation of lids, fittings or treasure.

Selected atlas1774×887 SHA-256: `e36ea69de62696e6ee85411c30a45451f2a31b3c53cf4cd45f7b8ee3af8e4896`.
Manifest SHA-256: `9ba33a5cef1439aa2fcb7b840f5b37b8424600a62a36bc9701d3e12a6969abbc`.
Review HTML SHA-256: `6bcdbeb94c263f321292ca1cba55a32b1ea87957de3f068e3e54233c4b901060`.

## Exact104×120 sprite hashes

| Frame | Role | SHA-256 |
| --- | --- | --- |
| closed | 主狀態 | `e853deee9605b93ea1aece8592f80409be22ba6ed2dbebb6501b016cd267500c` |
| latch-release | 過渡幀 | `b9b567580997eb38c09d3a74d9f3f339bb392f8b4f544c3ae70247cbf21e95cf` |
| unlatched | 過渡幀 | `782f0de353537af1c2de281f37ed75fd7d5ffecd71ec0ccccdfc4c9b70678726` |
| cracked | 主狀態 | `23bac2efd5f048a79f04eba2bbf41f756241ab5239568803ce18d50392a06651` |
| half-open | 主狀態 | `09a614bd0ebee995352fa0b472a5ecba5eaff8291c09c483201a8e8eea4d98a9` |
| opening-wide | 過渡幀 | `522e04aebf0a430cc436dbcc6a346eeb59f4cdc2be401c9695f96e08a13bab30` |
| near-open | 過渡幀 | `d49b30f70b5b766ec84485f6b3f551d0f02623237e710f3fb143783af7a4851e` |
| open | 主狀態 | `124a1f050f46122e7aba2aafa41010aca57f634e930ac7ca42b86d9f47f37ca3` |

## RED → GREEN evidence

| Run | Observed result |
| --- | --- |
| Initial sandbox Vitest | cache rename EPERM; zero tests; NOT counted as RED |
| Initial sandbox Playwright | sandbox browser executable absent; NOT counted as RED |
| Normal-host initial focused Vitest |17 real assertion failures: missing model/manifest/raster |
| Normal-host initial desktop browser spec |6 real ERR_FILE_NOT_FOUND failures for the not-yet-created review page |
| Model GREEN |9 passed |
| New regular-lattice contract RED |1 failed: full-canvas partition exceeded the common envelope |
| Same lattice contract GREEN |1 passed; one grid for all frames, no per-frame fitting |
| New focused suites |18 passed across2 files |
| New browser spec, all viewports |24 passed (1.3m) |
| Final focused regression |73 passed across11 files;232.44s; exit0 |
| Final browser regression |164 passed;4.3m; exit0 |

The plan predicted72 focused tests; actual73 =55 existing +18 new, because the explicit source-lattice regression adds one. Browser count remains140 existing +24 new.

## Commands and actual outcomes

From `D:/Project/mimic/web`:

```powershell
npm test -- src/shared/brand/restored-chest-model.test.ts src/shared/brand/restored-treasure-chest.test.ts --no-file-parallelism --testTimeout=60000
npm test -- src/shared/brand/restored-treasure-chest.test.ts -t 'explicit regular atlas'
npm test -- src/shared/brand/restored-chest-model.test.ts src/shared/brand/restored-treasure-chest.test.ts src/shared/brand/treasure-chest-state-model.test.ts src/shared/brand/treasure-chest-states.test.ts src/shared/brand/landing-chest-material.test.ts src/shared/brand/landing-title-placement.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts --no-file-parallelism --testTimeout=60000
npx eslint src/shared/brand/restored-chest-model.test.ts src/shared/brand/restored-treasure-chest.test.ts e2e/restored-treasure-chest-review.spec.ts e2e/restored-treasure-chest.playwright.config.ts
npm run typecheck
npx playwright test --config=e2e/restored-treasure-chest.playwright.config.ts restored-treasure-chest-review.spec.ts --project=desktop
npx playwright test --config=e2e/restored-treasure-chest.playwright.config.ts restored-treasure-chest-review.spec.ts
npx playwright test --config=e2e/restored-treasure-chest.playwright.config.ts
```

Lint and typecheck exited0 without diagnostic output. ESM lint from repo root also exited0:

```powershell
node web/node_modules/eslint/bin/eslint.js --no-ignore --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.model.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.controller.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.raster.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-restored-treasure-chest.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-restored-treasure-chest.mjs
git diff --check
git diff --cached --check
```

Ran `node --check` for each of the same six ESM files:6/6 PASS.
Diff checks exited0; new untracked text also separately checked for trailing whitespace/conflict markers.

## PNG, geometry and reproducibility evidence

- All49 PNG hashes and dimensions checked from actual files. Sprites104×120, integer2×208×240, scenes960×540 and1920×1080.
- Eight distinct sprites. Transparent sprite RGB=0; alpha only0/255; grayscale uses integer luma2126/7152/722 and preserves alpha.
- One scale0.20245398773006135 and raw anchor(220,419); output origin(92,230), ground(52,120), world ground(144,350).
- Static lower30 rows reuse the closed ImageGen pixels except latch region(44,68),36×40. A numerical fixture proves moving latch pixels are not overwritten.
- Ordered architecture/layer reconstruction independently matches each scene. Changes outside92≤x<196,230≤y<350:0. Titles, figures, map crate, trap, fire and environment are unchanged.
- Phone logical/color exact SHA remains `dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf`; phone title130/59/148×98, desktop title376/100/288×84.
- Source unused padding must be transparent; reject opaque gutters, clipped cells, incompatible proportions and body misregistration. No registration tolerance was relaxed.
- Two Vitest regenerations and two additional direct-Node regenerations match all51 PNG/HTML/manifest files byte-for-byte. Direct-Node comparison was run after Vitest finished to avoid overlap with intentional manifest/output corruption tests.
- Mutated own-output and incomplete-output-inventory tests reject writes and restore only their own mutations in finally blocks.

## Documented plan adjustment

ImageGen's1774×887 canvas contains transparent outer padding; the art uses a regular lattice, not a full-canvas quarter/half partition.
The first full-partition probe failed body registration. Measured source bounds supported one common origin(20,0), cell432×430 and stride432×430.
The new regression first failed, then passed with that shared grid. The transform, scene position, envelope, mask and body-registration tolerance remain unchanged.
All source bytes stay untouched; this is extraction geometry, not independent state translation/fit or creative drawing. Config, manifest and prompt record the same values.
Approved specs and plan files were not edited.

## Visual review performed

Inspected raw sources, all eight2× sprites, grayscale and36 actual browser screenshots: eight frames plus unchanged phone at320/390/768/1440.
Screenshots are under `web/test-results/restored-treasure-chest-re-78b1b-one-render-without-overflow-{phone-small,phone,tablet,desktop}/`.
No clipping, title displacement or surrounding-object collision was found in this review. The chest remains secondary to the warm fire/companions.
At narrow viewports the desktop comparison is intentionally scaled; actual104×120 sprite cards remain available below it.
Hinge(52,84) is a review guide, not a measured physical-hinge certification. User judgement is still required for weight, pixel character and treasure appeal.

## Self-Review Complete

**Changes reviewed:** Six new ESM modules, model/artifact/browser contracts, source prompt/lineage, generated manifest/HTML and the new source/output family. Read changed implementation/functions in full; unrelated dirty work was excluded.

**Issues found and fixed:**

- Important — Source full-canvas grid assumption caused body drift → diagnosed from alpha bounds, added a genuine failing contract, then used one regular source lattice. No per-frame correction or weakened guard.
- Environmental — Sandbox cache/browser failures → verified the causes and reran on the normal host; these were not counted as feature RED evidence.

Reviewed correctness, edge cases, completeness, architecture, style, security and test coverage. Manual-only motion, native controls, failure feedback, media-query reduced motion and reserved scene geometry were cross-checked with UI/UX guidance; no art-direction changes were introduced by that review.

**Remaining notes:** Original renderer is intentionally a pinned read-only dependency. Source-lattice values are specific to selected attempt03. Any future source change needs a new version/provenance revision rather than bypassing overwrite guards.

**Verdict:** CLEAN — no critical or important implementation issues remain. This is not visual approval.

## Preservation and limits

Fresh baseline captured957 original scoped files across review assets, web/src, web/public and web/e2e. All957 remained byte-identical after tests and regeneration.
Original status SHA-256 `92348374170bd1faf08fdcdae44dcdef2dfa209ad611833474d9bcb95d1a27c8`.
Existing staged binary-diff SHA-256 remains `96241f5fc7516568a9ba83d26d2ccd1a6ead98e3ff36cdea1e01979629b402d3`.
Only existing-file edit is a devlog append, whose original197477 bytes are verified as an exact prefix.
No staging/commit/push/PR, worktree or subagents. Attachments/reference remain untouched and unstaged.
No changes to runtime, web/public, registry, PWA manifest, service worker, product pages, Home or accounting. No production exports or Phase2.
Full-repository test suites and production build were not run.

Non-failing notices: Playwright NO_COLOR/FORCE_COLOR, Git LF→CRLF. A sandbox process-inventory probe was denied; an authorized read-only host probe confirmed active test processes and the test run completed.
All new artifacts remain awaiting-calibration. Stop at whole-family visual checkpoint; suggested manual commit: `feat(visual): refine restored treasure chest review`.
