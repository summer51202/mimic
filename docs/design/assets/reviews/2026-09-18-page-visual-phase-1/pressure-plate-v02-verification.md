# Pressure plate v02 — appearance review receipt

Date: 2026-11-02 (Asia/Taipei). Product-commission mode. Stage C only; awaiting-calibration, reviewOnly:true, runtimePromotion:false. Artwork and placement have not been approved. A has not started.

## Deliverables and source

- [Appearance review](pressure-plate-v02-review.html): native 1×, nearest-neighbor 4×, true grayscale, v01 comparison, original-position desktop scene, native 960×540 scrollable scene and matching local crops.
- [Manifest](pressure-plate-v02.manifest.json), [source lineage](samples/derivations/pressure-plate-v02/lineage.json), [first prompt](samples/derivations/pressure-plate-v02/attempt-01-prompt.md).
- Built-in ImageGen: three actual calls. Attempt01 generates one new prop using the design document's exact prompt and scene / warrior / approved v04 chest as references. Attempts02 and03 edit the immediately preceding output. All three raw PNGs and exact prompts remain unchanged; attempt03 is copied unchanged to plate-source as the review candidate.
- Candidate source SHA-256: `9be635235f59d04107827569c372346508cea8423d65143575ee72039b0101ab`.
- No API/CLI fallback, worktree, subagent, staging, commit, production export or Phase2 work.

## Derivation and frozen geometry

The source alpha≥200 bounds are (73,283,1764,333). One uniform scale `80/1764` with nearest-neighbor sampling yields a 16px sampled height, bottom-aligned in an80×18 transparent canvas at offset(0,2). No independent axis stretch, hand painting, ground patch, colour replacement or per-part transform. The final sprite has binary alpha and zero RGB on fully transparent pixels. Raw ImageGen bytes are preserved separately and are not asserted to have binary alpha.

The desktop origin remains(850,339), with scene opacity0.85. Before replacement, the compositor independently rebuilds the entire approved-v04-chest desktop from the pinned architecture and ordered original layers, replacing only the already-approved chest at(92,230) and adding the frozen title at(376,100). That rebuild equals the v04 desktop pixels exactly. Candidate differences are limited to(850,339,80,18):1,254 changed pixels; zero differences outside. Phone source and all other source artifacts remain pinned and unchanged.

## Executed checks

| Check | Result |
| --- | --- |
| Focused Vitest | 5 passed, exit0,15.55s, including output-corruption guard |
| Scoped TypeScript ESLint | Exit0, max-warnings0 |
| Composer ESM ESLint from repository root | Exit0, max-warnings0 |
| Typecheck | Exit0 |
| Playwright, 320 /390 /768 /1440 | 12 passed, exit0,30.2s |
| Two direct Node rebuilds | All12 PNGs + HTML + manifest =14 files byte-identical |
| PNG output dimensions and hashes | All12 correct |
| Transparent pixels over all review PNGs | 11,662; zero nonzero hidden RGB |
| Raw generated image copies | All3 match their original generated files |
| Frozen baseline | All1,266 captured pre-existing files unchanged |
| Git index | Staged binary-diff hash unchanged |
| Devlog | Original bytes preserved as exact prefix; append only |
| Git working/cached whitespace checks | Exit0; existing LF/CRLF notices only |

The initial `--root web` invocation resolved to web/web and found no tests. A subsequent dynamic-import path failed on Windows; replaced with the repository's normal static ESM import. These are test-environment issues, not evidence of missing-artwork RED. The final guard test deliberately corrupts only a new v02 output, verifies rejection before writes and restores the exact original bytes in finally. An initial ESM lint invocation from web/ ignored the outside-base-path file; the actual ESM check was rerun from the repository root with max-warnings0. No ignored-file run is counted as successful ESM coverage.

## Visual inspection and remaining verdict

Inspected normalized 4× colour / true grayscale, full960×540 scene, local crop, and representative browser captures at320 /768 /1440, including a320px native-scale scene scrolled to the right edge. The four-viewport automated checks cover every image, actual sprite dimensions, image-rendering, keyboard details expansion, scene scrolling, provenance links and zero document overflow.

The candidate reads as muted warm stone with three inset slabs, a fixed rim and dark separation slots. At1× it is a small restrained feature near the right passage; its rim and slab divisions are visible, while the exact impression of an old mechanism remains for the user's appearance verdict. It has no visible warning marks, skulls, arrows, hearts, glow, text, spikes or extra props. Review on small screens uses local horizontal scrolling for4× evidence rather than shrinking it. No whole-scene or placement approval is inferred.

## Self-Review Complete

**Changes reviewed:** All new composer functions, review markup, source lineage/prompts, unit/browser contracts and config, plus verification scripts. More than200 lines; reviewed all changed functions and behaviors, excluding unrelated pre-existing dirty work.

**Issues found and fixed:** Windows dynamic import resolution replaced by a static import; native-scene scrolling assertion now accounts for viewports wide enough to show the whole scene; added deliberate output-corruption coverage for the compositor's all-target preflight guard. Correctness, edge cases, completeness, architecture, style, security and test coverage reviewed.

**Remaining notes:** Artistic acceptance remains pending. The requested about76×18 footprint became an80×18 canvas with16px sampled content, within the design's suggested size range. The fixed origin and0.85 scene opacity remain for comparison only.

**Verdict:** CLEAN — no critical or important implementation issues remain. Artistic acceptance stays pending. Stop at appearance review before A.

## Reproduction

From `web/`:

```powershell
$env:TEMP='D:/Project/mimic/.codex-generated/pressure-plate-v02-temp'
$env:TMP=$env:TEMP
npm test -- src/shared/brand/pressure-plate-v02.test.ts --no-file-parallelism
npx eslint src/shared/brand/pressure-plate-v02.test.ts e2e/pressure-plate-v02-review.spec.ts e2e/pressure-plate-v02.playwright.config.ts --max-warnings=0
npm run typecheck
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
npx playwright test --config=e2e/pressure-plate-v02.playwright.config.ts --output=../.codex-generated/pressure-plate-browser-results
```

From repository root:

```powershell
web/node_modules/.bin/eslint.cmd --config web/e2e/landing-warm-rest.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-v02.mjs --max-warnings=0
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-v02.mjs
node .codex-generated/verify-pressure-plate.cjs
git diff --check
git diff --cached --check
```

Local verification evidence: `.codex-generated/pressure-plate-verification.json`, browser screenshots under `.codex-generated/pressure-plate-browser-results/`, and the captured baseline `.codex-generated/pressure-plate-baseline.json`. Full-repository suites and production builds were not run. No runtime/public/registry/PWA/service-worker/product/accounting modifications.
