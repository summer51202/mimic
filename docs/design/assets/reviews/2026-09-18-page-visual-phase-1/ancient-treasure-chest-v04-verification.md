# Ancient treasure chest v04 — verification receipt

Date: 2026-11-02 (Asia/Taipei). Review-only; awaiting-calibration; runtimePromotion:false. Technical verification does not approve the artwork or Scenes.

## Executed results

| Check | Actual result |
| --- | --- |
| Initial RED | 9 failures: new manifest / HTML absent; v03 pixel negative control passed |
| Additional RED | Original-scene comparison absent; exposed staple drift; 2,719 static-lid pixel differences during hasp-only poses |
| Combined focused Vitest before final static-lid correction | 13 files, 92 passed, exit 0, 404.71s |
| Final v04 focused Vitest | 13 passed, exit 0, 84.13s |
| Scoped browser regression before final static-lid correction | 212 passed at 320/390/768/1440, exit 0, 6.0m |
| Final v04 browser cases, including evidence/crop checks | 28 passed at 320/390/768/1440, exit 0, 1.3m |
| Scoped TypeScript / ESM ESLint | exit 0 |
| Typecheck | exit 0 |
| Three new ESM syntax checks | exit 0 |
| Direct Node rebuilds | 2; all 49 PNG + HTML + manifest = 51 files byte-identical |
| Raster checks | 49 PNG dimensions / recorded hashes correct; 382,374 transparent pixels, 0 nonzero hidden RGB |
| Common registration | One regular lattice, one nearest-neighbor transform; no per-frame offset / fit / scaling |
| Frozen scene | Independent ordered reconstruction; 0 differences outside (92,230,104,120) |
| Baseline | All 876 captured pre-existing scoped files unchanged |
| Index | Staged binary diff SHA-256 unchanged: `96241f5fc7516568a9ba83d26d2ccd1a6ead98e3ff36cdea1e01979629b402d3` |
| Devlog | Original 205,135 bytes preserved as an exact prefix; append only |
| Whitespace | Working / cached diff checks exit 0; new text checked separately |

The combined suites were followed by a focused rerun after the final closed-lid reuse change; those are separate executed results, not a claim that a final combined 93-case or 216-case run occurred. The earlier environment-only EPERM/import-resolution failures do not count as RED. A diagnostic read run during the legacy suite's temporary manifest mutation saw a transient hash mismatch; the legacy test restored its own bytes, and final baseline verification passed. Do not run independent hash checks concurrently with mutation-guard tests.

## Opening progress, measured from actual 2× alpha pixels

| Frame | Target angle, not measured angle | v03 top | v04 top | v04 rise |
| --- | --- | --- | --- | --- |
| closed | 0° | 114 | 116 | — |
| latch-release | 0° | 112 | 116 | — |
| unlatched | 0° | 112 | 116 | — |
| cracked | about 12° | 110 | 114 | — |
| half-open | about 35° | 92 | 106 | 8 |
| opening-wide | about 58° | 90 | 98 | 8 |
| near-open | about 80° | 86 | 86 | 12 |
| open | about 100° | 82 | 78 | 8 |

v04 cracked→open rises 36px. Steps 8/8/12/8 are monotonic; maximum is 33.33% ≤40%. Middle-pose separations are 8/20/12px, all ≥3. Unlatched→cracked rises 2px, below 9px (25%). The slit is visibly open. v03 rises 28px with steps 18/2/4/4: maximum 64.29%, and half-open→opening-wide only 2px. The negative control therefore fails the intended two rules.

The common source grid is origin(52,0), cell426×420, stride426×420. Scale is `0.21787709497206703`, raw anchor(213,379). All eight sprites remain 104×120 with ground(52,120), scene origin(92,230), world ground(144,350). Original opening750ms / closing660ms and all segment delays remain unchanged.

Static lower-body pixels reuse closed below row90 outside the existing moving-hasp area. Exposed staple pixels reuse unlatched rectangle(59,90,10,13) after release; the closed hasp naturally occludes the staple. First three poses reuse closed above row90 outside the moving-hasp area, so releasing the hasp does not move the lid. These are explicit pixel reuse rules recorded in registration, not per-frame geometric transforms or newly painted art.

## Source and outputs

Built-in ImageGen; five actual edit calls. Attempt01 uses the exact design-document prompt, editing v03 family-source with warrior master and scene-warrior references. Attempts02–05 edit the immediately preceding output; attempt03 additionally references v03 for material style. Every original output is retained unchanged. Attempt05 is copied byte-for-byte to family-source. Prompt files and lineage record the actual input roles; there are no invented generate calls or edit targets.

- [Selected family-source](samples/derivations/treasure-chest-states-v04/family-source.png): `494f26780f351601962c58630857fc21aea60dafa0a00c3bb3c31e7282eb45ca`
- [First prompt](samples/derivations/treasure-chest-states-v04/prompt.md), [lineage](samples/derivations/treasure-chest-states-v04/lineage.json).
- [Manifest](ancient-treasure-chest-v04.manifest.json): `10125e1224a4f2ff24f92ca764e6a627ecf716c0370546422fd9d914a117061a`
- [Review HTML](ancient-treasure-chest-v04-review.html): `bf1be158601ab32b0adefae8686f7b0050856c1a1f7ce2f9ef366167d20d1a37`

| Frame | Role | 104×120 exact SHA-256 |
| --- | --- | --- |
| closed | main | `1d3033feec912b2a8c3e8985949cccbbeadadcd02e6500999f3d7a1558d9a2bc` |
| latch-release | transition | `3791787f5338599fc110b36c94e8b3b2534933d71c671d85ee7404b25d57cd86` |
| unlatched | transition | `8babcc508cfdd3538fc6646631ce51658a48a3a8d0f66f7475f2e3927b4c8919` |
| cracked | main | `d81237e032d782965d5012ea69a37ec598dad888a534d6323ab4db442f430dc2` |
| half-open | main | `c353a103abea643bc643e148726b911b4af03d7b73a95b4f270752f5c264ee7c` |
| opening-wide | transition | `f741d661b53ef9c00d593502c8507373a2e907ea6e6b704ef90745c7e2f24ae7` |
| near-open | transition | `cb6e51044658405ce206bba76552ddabbfb7fdd9cf9c918b0ab87b5b0d4742ea` |
| open | main | `1da4b9c752012114db7256f928598628ccd222536e9a32112e8b938869712654` |

## Manual visual inspection and pending visual verdict

Inspected all eight 2× sprites, eight actual-size true-grayscale sprites, the logical scenes, 32 browser scene captures across four viewports, and four unchanged-phone captures. Re-inspected both changed hasp-only poses at all four viewports after the static-lid fix. Also inspected all four repair-detail captures and the small-phone / desktop measurement-table captures.

- Frames5–8 have no hasp hanging on the inner lid face; frame7 has a small free-edge tip. Closed / release / unlatched show the hasp sequence; the visible staple stays fixed.
- Cracked has a narrow dark slit with contents visible. Open has a taller exposed inner face and a backward lean relative to near-open. The exact 100° target is not asserted as a measured geometric angle; the user's whole-family visual verdict remains required.
- The single lighter walnut repair can be pointed out on the lower-left side in the 960×540 scene, and remains distinct in true grayscale. Review crops cover(15,96,31,23) at1× and4×. The intended wood patch area is about8×6 logical pixels.
- **Remaining visual gap:** both square nail heads are not equally legible at1×; the front-facing fastener reads more clearly than the side-facing one. This is explicitly pending visual review, not certified as fully satisfying the two-square-nail detail. No automatic art approval is implied by passing numerical contracts.
- Contents stay within the box. No glow or external props were added. Titles, phone, surrounding characters, map crate and other scene layers remain frozen.

## Self-Review Complete

**Changes reviewed:** New composer / renderer / verifier, unit / browser contracts and config, source prompts and lineage, manifest, HTML, baseline audit and this receipt. More than200 lines: review covers all new functions and changed behavior, not unrelated pre-existing dirty work. Correctness, edge cases, completeness, architecture, style, security and coverage checked.

**Issues found and fixed:**

- New output guard caught a residual v03 destination before any writes; fixed to the independent v04 directory.
- Added RED for missing original-scene comparison and exposed-staple drift; added comparison and explicit staple reuse.
- Added RED for hasp-only static-lid drift; reuse closed lid pixels outside the moving-hasp area.
- Replaced the initial RED-only variable import with the normal static module import once the new compositor existed.

**Verdict:** Implementation checks CLEAN; artistic acceptance remains awaiting-calibration, including the nail-detail gap above.

## Reproduction commands

From `web/`, with workspace TEMP/TMP set as in the previous receipt:

```powershell
$env:TEMP='D:/Project/mimic/.codex-generated/ancient-chest-v04-temp'
$env:TMP=$env:TEMP
npm test -- src/shared/brand/ancient-treasure-chest-v04.test.ts --no-file-parallelism --testTimeout=60000
npx eslint src/shared/brand/ancient-treasure-chest-v04.test.ts e2e/ancient-treasure-chest-v04-review.spec.ts e2e/ancient-treasure-chest-v04.playwright.config.ts
npm run typecheck
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
npx playwright test --config=e2e/ancient-treasure-chest-v04.playwright.config.ts ancient-treasure-chest-v04-review.spec.ts --output=../.codex-generated/v04-final-browser-results
```

From repository root:

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/verify-ancient-treasure-chest-v04.mjs --rebuild
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/treasure-chest-states-v04/audit-baseline.cjs
git diff --check
git diff --cached --check
```

Exact combined commands and results remain in local logs: [combined Vitest](../../../../../.codex-generated/v04-vitest.log), [final Vitest](../../../../../.codex-generated/v04-vitest-final.log), [browser regression](../../../../../.codex-generated/v04-playwright.log), [final browser](../../../../../.codex-generated/v04-playwright-final.log), [direct Node receipt](../../../../../.codex-generated/v04-node-verification-final.json). Logs / browser screenshots are workspace verification artifacts, not runtime assets.

The 876-file baseline covers the existing review tree, docs/superpowers, brand contracts, web/public and browser contracts, excluding v04-named paths. Existing unrelated v04 artwork was not touched. Other product source was not edited. Non-failing environment warnings: NO_COLOR/FORCE_COLOR and existing Git LF/CRLF notices. Full-repository suites and production build were not run.

No changes to runtime, web/public, asset registry, PWA manifest, service worker, product pages or accounting. No worktree, subagent, stage, commit, production exports or Phase2. Attachments/reference were not touched. Stop at whole-family visual review.
