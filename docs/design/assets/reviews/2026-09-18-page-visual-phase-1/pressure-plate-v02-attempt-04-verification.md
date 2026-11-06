# Pressure plate v02 attempt-04 — appearance review receipt

Date: 2026-11-02 (Asia/Taipei). Product-commission mode; C only. Awaiting-calibration, reviewOnly:true, runtimePromotion:false. Stop for appearance review before A.

## Deliverables and actual ImageGen lineage

- [Review page](pressure-plate-v02-attempt-04-review.html), [manifest](pressure-plate-v02-attempt-04.manifest.json), [lineage](samples/derivations/pressure-plate-v02/lineage-attempt-04.json).
- First built-in ImageGen call uses the design document's exact [attempt-04 prompt](samples/derivations/pressure-plate-v02/attempt-04-prompt.md). Image1 is the unchanged attempt-03 (9be635235f59d04107827569c372346508cea8423d65143575ee72039b0101ab); Image2 is the approved-chest actual cave scene, for floor colour only.
- That [raw output](samples/derivations/pressure-plate-v02/attempt-04.png) passed colour but its normalized front groove contained highlight interruptions. It is preserved as a rejected intermediate, without retouching.
- One further built-in edit uses that output and a [groove-only retry prompt](samples/derivations/pressure-plate-v02/attempt-04-retry-01-prompt.md). The selected [raw retry-01](samples/derivations/pressure-plate-v02/attempt-04-retry-01.png) SHA-256 is `6186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16`. All five historical/new raw PNGs and actual prompts are retained; the old lineage and attempt-01–03 files remain unchanged. No CLI/API fallback.
- Review includes native1x, nearest4x, real grayscale, attempt-03 and v01 comparisons, full desktop, native-size scrollable scene, matching context crops, and front-edge8x comparison.

## Derivation and contracts

One uniform nearest-neighbour transform (`80/1759`) samples the alpha≥200 source bounds (76,277,1759,337) into16px content, bottom-aligned at offset(0,2) in80×18. No painting, colour replacement, warping or separate axis scales. Derived sprite has binary alpha and zero hidden RGB. Raw ImageGen PNG alpha is preserved as generated.

Origin remains(850,339), scene opacity0.85. Ordered reconstruction of the frozen approved-chest desktop matches its pixels before replacement. Only1,252 pixels inside the80×18 plate envelope change; zero exterior changes. Titles, phone, approved v04 chest, other people/props/background remain pinned.

Colour measurement converts each scene pixel to HSV, then averages S and V. The fixed plate rectangle is(854,342,72,9); the floor is the2px ring with outer rectangle(848,337,84,22), excluding the full(850,339,80,18) envelope. The same masks apply to both versions, before comparing thresholds.

| Scene | Plate S | Plate V | Floor S | Floor V | V difference | S≥0.58 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| attempt-03 negative control | 0.461468 | 0.573209 | 0.714348 | 0.543358 | +0.029850 | Fail |
| attempt-04 retry-01 | 0.696208 | 0.600194 | 0.714348 | 0.543358 | +0.056835 | Pass |

Both saturation and the requested V difference0.02–0.08 pass for the candidate. The design records previous averages but does not provide its original sampling coordinates/mask. These explicit masks make this contract reproducible, but do not exactly reproduce the undocumented old measurement (S0.474/V0.578 and floor S0.695/V0.542). That methodological limitation is also visible on the review page; no claim of exact original-mask equivalence is made.

The normalized front shadow has one continuous warm near-black opaque run from x4 through76 on row13:73/80=91.25%, one pixel tall. Contract searches only front rows9–14, requires R≤65 and R≥G≥B, and requires at least64 consecutive pixels. Inspection also confirms the dark band sits between the slab faces and front raised rim. No warning marks, skulls, arrows, hearts, text, glow, spikes or extra props were observed.

## Executed verification

- Focused Vitest:8 passed across2 files, exit0 (37.61s). Includes source/prompt chain, binary alpha/hidden RGB, exact4x/grayscale, frozen exterior/phone, saturation negative control, front groove, deterministic rebuild and deliberate output-corruption refusal.
- Demonstrated the colour rejection first: attempt-03 failed S≥0.58 at0.461468; the same assertion passes for the candidate. The first generated revision was also rejected by the groove contract before any review output was written.
- Scoped TypeScript ESLint and composer ESM ESLint: exit0, max-warnings0. Typecheck and ESM syntax check: exit0.
- Four-viewport Playwright320/390/768/1440:12 passed, exit0 (29.8s). Checks all image loads, native dimensions, pixelated scaling, zero document overflow, local scrolling, keyboard details, comparisons and provenance links. Captures under `.codex-generated/pressure-plate-attempt-04-browser-results/`.
- Two direct Node rebuilds verify all19 PNGs plus HTML and manifest (21 files) byte-identically; hashes/dimensions/transparent RGB and all5 raw copies checked by `.codex-generated/verify-pressure-plate-attempt-04.cjs`.
- Turn-start baseline checks all1,293 captured existing files, staged binary diff, and append-only devlog prefix. Local machine-readable receipt: `.codex-generated/pressure-plate-attempt-04-verification.json`.

Full-repository suites and production builds were not run. No runtime/public/registry/PWA/service-worker/product/accounting changes, worktree/subagent, staging/commit, production exports or Phase2. Non-failing Playwright NO_COLOR/FORCE_COLOR warnings and existing Git line-ending notices remain.

## Self-Review Complete

**Changes reviewed:** All new composer functions and page sections, raw/prompt lineage, focused colour/raster/provenance/rebuild contracts, Playwright spec/config and verification scripts. More than200 lines; all changed functions and behaviours reviewed, excluding unrelated existing dirty work.

**Issues found and fixed:** The first generated front seam did not survive normalization continuously; preserved it and performed one targeted ImageGen edit. Corrected the review's provenance description and labels to distinguish the exact document-prompt output from the selected retry. Explicitly documented the missing original HSV sampling mask instead of claiming numeric equivalence.

**Remaining notes:** Exact original HSV-mask replication is unverified because the source document does not record that mask. Appearance remains subject to the user's verdict. Position is unchanged and is not being approved in this review.

**Verdict:** CLEAN for the delivered review implementation; artistic acceptance remains pending. A has not started.

## Reproduction

From `web/`:

```powershell
$env:TEMP='D:/Project/mimic/.codex-generated/pressure-plate-v02-temp'
$env:TMP=$env:TEMP
npm test -- src/shared/brand/pressure-plate-attempt-04.test.ts src/shared/brand/pressure-plate-attempt-04-review.test.ts --no-file-parallelism
npx eslint src/shared/brand/pressure-plate-attempt-04.test.ts src/shared/brand/pressure-plate-attempt-04-review.test.ts e2e/pressure-plate-attempt-04-review.spec.ts e2e/pressure-plate-attempt-04.playwright.config.ts --max-warnings=0
npm run typecheck
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
npx playwright test --config=e2e/pressure-plate-attempt-04.playwright.config.ts --output=../.codex-generated/pressure-plate-attempt-04-browser-results
```

From repository root:

```powershell
web/node_modules/.bin/eslint.cmd --config web/e2e/landing-warm-rest.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-04.mjs --max-warnings=0
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-04.mjs
node .codex-generated/verify-pressure-plate-attempt-04.cjs
git diff --check
git diff --cached --check
```
