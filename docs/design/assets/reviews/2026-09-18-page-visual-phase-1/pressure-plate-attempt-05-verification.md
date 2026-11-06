# Pressure plate attempt-05 — appearance review receipt

Date: 2026-11-02 (Asia/Taipei). Product-commission mode. C only; awaiting-calibration, reviewOnly:true, runtimePromotion:false. Stop for the user's appearance review before A.

## Deliverables and ImageGen provenance

- [Review page](pressure-plate-attempt-05-review.html), [manifest](pressure-plate-attempt-05.manifest.json), [measurement and guide](samples/derivations/pressure-plate-attempt-05/measurement.json), [new lineage](samples/derivations/pressure-plate-attempt-05/lineage.json).
- [Selected raw PNG](samples/derivations/pressure-plate-attempt-05/attempt-05-retry-02.png), SHA-256 `d2902a1277831ddd88b779852949ee34c79b6c83650cf44fb3d3ceaeca36c9b4`.
- Built-in ImageGen used the [exact document attempt-05 prompt](samples/derivations/pressure-plate-attempt-05/attempt-05-prompt.md). Inputs, in order: selected raw attempt-04 (`6186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16`), the measured outline8x, the actual cave scene. The first output's right alpha slope was only0.300; retained it unchanged.
- A [geometry-only retry](samples/derivations/pressure-plate-attempt-05/attempt-05-retry-01-prompt.md) improved right slope to0.500; still failed, retained unchanged. The [second geometry-only retry](samples/derivations/pressure-plate-attempt-05/attempt-05-retry-02-prompt.md) explicitly expands transparent room for the back-right corner and passes. All three raw outputs and actual prompts are saved byte-identically; no CLI fallback, painting, pixel warping or colour replacement. Prior attempt-01–04 files, lineage and review remain unchanged.
- Review includes candidate/attempt-04 1×/4×/true grayscale, front edge8x, guide overlay8x, annotated architecture measurements, actual960×540 scene, native126×90 and4x stair context, full grayscale, and visible fixed colour mask.

## Measurement and geometry

The architectureDesktop source is1672×941, SHA-256 `a71491b85b4293c845bd09d0b97173ed90b35ef96a8fb54d277e673b27f2ae70`. Existing centered-crop nearest sampling produces the960×540 architecture-only scene; prop layers are absent during measurement.

Manually selected left upper corners of the lowest three visible treads: `(857,326)`, `(871,312)`, `(883,299)`. Adjacent dx / upward-dy:1.000 and0.923077. Least-squares x against upward y gives **0.963436929 px per upward row**. This is a manual raster measurement with approximately±1 logical pixel uncertainty, not an automatically detected exact physical plane. The saved annotated crop makes the selections reviewable.

Before the first ImageGen call, created a texture-free96×18 outline with corners `(16,0)`, `(95,0)`, `(79,17)`, `(0,17)` and two parallel internal divisions. Both short sides have slope16/17=0.941176, within the measured tolerance. Guide hash and role are pinned in measurement and every generation call's lineage.

Selected raw alpha≥200 bounds: `(143,206,1973,374)`. One uniform scale18/374=0.048128342246, nearest sampled into95×18 content at offset(0,0) on96×18. Alpha is binary; transparent RGB is0. No independent axis stretch or geometry correction after ImageGen.

Origin remains(850,339), opacity0.85. The front long edge remains approximately80px at the same front-left position; extra canvas width accommodates the rear-right shift. The frozen approved-chest scene is reconstructed exactly before replacement. Only1,541 pixels inside `(850,339,96,18)` differ; zero exterior differences. Phone, titles, all people, v04 chest, other props and background retain their pinned bytes.

## Contracts

Short-edge measurement: alpha≥200 left/right row extrema, least-squares x against upward y over the central20–70% of opaque height. The fixed fractional span avoids rounded rear corners and the front vertical fascia. Apply the same rule to the candidate, old negative control and rejected outputs. Relative difference is `abs(left-right)/max(abs(left),abs(right))`.

| Sprite | Left slope | Right slope | Relative difference | Result |
| --- | ---: | ---: | ---: | --- |
| attempt-04 negative control | +0.773810 | −0.773810 | 200% | Fail: opposite signs |
| attempt-05 first output | +1.000000 | +0.300000 | 70% | Fail |
| attempt-05 retry-01 | +0.916667 | +0.500000 | 45.45% | Fail |
| attempt-05 retry-02 | +1.000000 | +0.916667 | 8.33% | Pass |

Both selected slopes are within measured0.963437±25% (`0.722578…1.204296`), positive on ascent, with difference≤20%.

Colour retains prior HSV arithmetic-mean thresholds but uses an explicit guide-adjusted fixed mask. At local y4…10, sample72 pixels starting at `4+round((17-y)*0.963436929)`. Floor mask: outer rectangle `(848,337,100,22)` minus envelope `(850,339,96,18)`. These masks are fixed and applied identically to current and previous scenes. The changed mask is recorded; direct numerical equivalence with the old rectangular mask is not claimed.

| Scene, same new mask | Plate S | Plate V | Floor S | Floor V | V difference |
| --- | ---: | ---: | ---: | ---: | ---: |
| attempt-04 | 0.692696 | 0.577140 | 0.689398 | 0.506929 | +0.070211 |
| selected attempt-05 | 0.707723 | 0.577809 | 0.689398 | 0.506929 | +0.070880 |

Candidate passes S≥0.58 and V difference0.02–0.08. The original attempt-04 colour regression suite also passes unchanged, including attempt-03's saturation negative control.

Front gap: row13, x4…80 inclusive,77 consecutive opaque warm near-black pixels (`R≤65`, `R≥G≥B`), **96.25% of the80px front long edge**. Searches only front rows9…15; not divided by the wider sheared canvas. Visual inspection confirms the band is a front mechanism shadow. No skulls, arrows, hearts, warning marks, glow, symbols, text or extra props observed.

## Executed verification

- Focused Vitest: **12 passed in3 files**, exit0 (36.39s). New physical and integrity tests plus unchanged prior colour contract. Covers negative controls, raw source/prompt/guide lineage, binary alpha/hidden RGB, exact4x/grayscale, frozen exterior/phone, deterministic rebuild and deliberate output-corruption refusal.
- Scoped TypeScript ESLint and review ESM ESLint: exit0, max-warnings0. Typecheck and4 ESM syntax checks: exit0.
- Four-viewport Playwright320/390/768/1440: **12 passed**, exit0 (25.8s). All image decode, native dimensions, pixelated scaling, zero document overflow, keyboard details, actual-size local scrolling, comparisons, source links and absence of A controls. Screenshots: `.codex-generated/pressure-plate-attempt-05/browser-results-final/`.
- Two direct Node rebuilds: **20 targets byte-identical** (13 review PNGs,4 prepared PNGs, HTML, review manifest and measurement JSON). All17 PNG dimensions/hashes checked;128,976 transparent pixels have RGB0; all3 saved raw copies match original built-in bytes.
- Turn-start baseline: **1,220 pre-existing files unchanged**, staged binary diff unchanged, devlog append-only prefix checked by `.codex-generated/pressure-plate-attempt-05/verify.mjs`. Machine-readable result: `.codex-generated/pressure-plate-attempt-05/verification.json`.
- Git unstaged/staged whitespace checks: exit0. Existing line-ending notices and non-failing Playwright NO_COLOR/FORCE_COLOR warnings remain.

Initial environment/test orchestration issues were corrected: Vitest's sandbox TEMP rename failed until TEMP/TMP were set under the project. The first browser run overlapped rebuilding and deliberate corrupt-output unit tests, causing one image decode failure; final browser tests run sequentially after unit tests and pass all12. No unverified artistic correction is hidden by a retry of assertions.

Full-repository suites and production builds were not run. No runtime/public/registry/PWA/service-worker/product/accounting edits, A implementation, worktree/subagent, stage/commit, production exports or Phase2.

## Self-Review Complete

**Changes reviewed:** All new preparation, contract and composition functions, page renderer, source/guide/prompt chain, focused tests and Playwright spec/config, and local verification scripts. More than200 lines: reviewed all changed functions/sections, excluding unrelated existing dirty work. Inspected normalized sprite, guide overlay, stair crop and desktop browser screenshot.

**Issues found and fixed:** Two generated outputs still had unequal short-edge slopes; preserved both and made targeted built-in geometry edits. Test execution initially raced mutation tests against the browser; corrected execution ordering and reran all browser cases. Disclosed manual measurement uncertainty and changed colour-mask shape. Source integrity and zero exterior changes independently verified.

**Remaining notes:** Appearance requires the user's verdict. Guide overlay intentionally shows the generated silhouette and slab division offsets rather than altering pixels to fit it exactly. Position is retained for context and is not approved here.

**Verdict:** CLEAN for review implementation; artistic acceptance pending. A has not started.

## Reproduction

From `web/`, run the unit tests before the browser suite (they share review output files):

```powershell
$env:TEMP='D:/Project/mimic/.codex-generated/pressure-plate-attempt-05/temp'
$env:TMP=$env:TEMP
npm test -- src/shared/brand/pressure-plate-attempt-05.test.ts src/shared/brand/pressure-plate-attempt-05-review.test.ts src/shared/brand/pressure-plate-attempt-04.test.ts --no-file-parallelism
npx eslint src/shared/brand/pressure-plate-attempt-05.test.ts src/shared/brand/pressure-plate-attempt-05-review.test.ts e2e/pressure-plate-attempt-05-review.spec.ts e2e/pressure-plate-attempt-05.playwright.config.ts --max-warnings=0
npm run typecheck
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
npx playwright test --config=e2e/pressure-plate-attempt-05.playwright.config.ts --output=../.codex-generated/pressure-plate-attempt-05/browser-results-final
```

From repository root:

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/prepare-pressure-plate-attempt-05.mjs
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-05.mjs
web/node_modules/.bin/eslint.cmd --config web/e2e/landing-warm-rest.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-05.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/prepare-pressure-plate-attempt-05.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-pressure-plate-attempt-05.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/pressure-plate-attempt-05-contracts.mjs --max-warnings=0
node .codex-generated/pressure-plate-attempt-05/verify.mjs
git diff --check
git diff --cached --check
```
