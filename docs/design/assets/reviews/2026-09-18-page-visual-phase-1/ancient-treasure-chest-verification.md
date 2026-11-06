# Ancient treasure chest v03 — verification receipt

Date: 2026-10-20. Review-only, awaiting-calibration, runtimePromotion:false. This is technical evidence, not artistic approval.

## Result

| Check | Actual result |
| --- | --- |
| TDD RED | 7 real unit failures: new manifest absent; 1 desktop browser failure: new HTML absent |
| New focused Vitest | 7 passed |
| Combined focused Vitest | 12 files, 80 passed, exit0; 239.73s |
| New Playwright | 24 passed at320/390/768/1440, exit0 |
| Scoped browser regression | 188 passed, exit0; 4.6m |
| Scoped TS/ESM ESLint | exit0 |
| Typecheck | exit0 |
| New ESM syntax | 2 files, exit0 |
| Direct Node deterministic rebuild | 2 rebuilds, all51 PNG/HTML/manifest bytes identical |
| Output PNGs | 49 real PNGs; dimensions PASS |
| Transparent RGB | 368610 transparent output pixels;0 nonzero hidden RGB |
| Scene freeze | independent ordered reconstruction;0 differences outside104x120 chest envelope |
| Original artifacts / runtime / public | all1025 turn-start scoped files unchanged |
| Index | unchanged SHA25696241f5fc7516568a9ba83d26d2ccd1a6ead98e3ff36cdea1e01979629b402d3 |
| Attachments / reference | no staged paths |
| Devlog | original201053-byte prefix preserved; append only |
| Whitespace | git diff --check and cached check exit0; new text files checked separately |

Initial environment failures (Vitest temp-cache EPERM and sandbox-specific Chromium lookup) had no valid test coverage and do not count as RED. Re-runs used workspace TEMP/TMP and the already installed host Chromium. Non-failing warnings: NO_COLOR/FORCE_COLOR conflict and existing Git LF/CRLF notices.

## Commands

Run Web commands in `D:/Project/mimic/web`.

```powershell
$env:TEMP='D:/Project/mimic/.codex-generated/ancient-chest-temp'
$env:TMP=$env:TEMP
npm test -- src/shared/brand/ancient-treasure-chest.test.ts --no-file-parallelism --testTimeout=60000
npm test -- src/shared/brand/ancient-treasure-chest.test.ts src/shared/brand/restored-chest-model.test.ts src/shared/brand/restored-treasure-chest.test.ts src/shared/brand/treasure-chest-state-model.test.ts src/shared/brand/treasure-chest-states.test.ts src/shared/brand/landing-chest-material.test.ts src/shared/brand/landing-title-placement.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-mobile-title-positioning.test.ts src/shared/brand/landing-a-title-calibration.test.ts src/shared/brand/landing-warm-rest-composition.test.ts src/shared/brand/landing-war-room-calibration.test.ts --no-file-parallelism --testTimeout=60000
npx eslint src/shared/brand/ancient-treasure-chest.test.ts e2e/ancient-treasure-chest-review.spec.ts e2e/ancient-treasure-chest.playwright.config.ts
npm run typecheck
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Edward1_Lee/AppData/Local/ms-playwright'
npx playwright test --config=e2e/ancient-treasure-chest.playwright.config.ts ancient-treasure-chest-review.spec.ts
npx playwright test --config=e2e/ancient-treasure-chest.playwright.config.ts
```

Run from repo root:

```powershell
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-ancient-treasure-chest.mjs
node --check docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-ancient-treasure-chest.mjs
node web/node_modules/eslint/bin/eslint.js --no-ignore --config web/e2e/landing-a-title.eslint.config.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-ancient-treasure-chest.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/render-ancient-treasure-chest.mjs
git diff --check
git diff --cached --check
```

Direct Node verification took all49 output records plus HTML and manifest, hashed their bytes, called `composeAncientChest()` twice, and compared every hash. Vitest also performs two independent rebuilds and own-output/inventory mutation guards. PNG verification decoded every output, checked width/height, then scanned all alpha0 pixels for nonzero RGB. Scene contracts independently rebuild ordered layers rather than relying on compositor-reported change counts.

The common source lattice is origin(62,0), cell410x410, stride410x410. All frames use one scale0.24148606811145512 and raw anchor(210.5,390); there is no per-frame crop-fit, translation or scale. Static lower-body pixels from the ImageGen closed state are reused below row90 outside the defined moving hasp area. This is deterministic review registration, not programmatic drawing of new artwork.

## Source / output hashes

Built-in ImageGen only; four actual source calls. Full prompts and exact input roles are in `samples/derivations/treasure-chest-states-v03/prompt.md`. All raw attempts remain unchanged; attempt04 and family-source have identical bytes. Generate calls have no invented edit target. No external survey artwork was used as an image input.

- Selected atlas: `93a3096fd29ae343d833cc5921bcc6a3740d824af4765f856fb8f762a217f170`
- Manifest: `60d9dcee5b165941e632a5377b9cc38d7632a5ff2a2688c54ef387d3bcc06a7c`
- Review HTML: `e29d521463bf32849c6b02dc53f9ad3ee75ba776bcceba916008d5f052e82327`

All masters are104x120, including transparent common headroom.

| Frame | Role | Exact SHA-256 |
| --- | --- | --- |
| closed | main | `90572a7ba2f0ada21491fe700895b4c275e2bb787b99de5d379281d4573149bd` |
| latch-release | transition | `518a588b2a8917c980a3af8ab8f4d8305794312914f0d0947a741656fe1bbdef` |
| unlatched | transition | `1426101636c7a07ceb8f97b5da662f1fddacab53d45c3d110e283d9376dc7e5a` |
| cracked | main | `e8b8ed063b25a01e98b0ed8a7f7d2b31987ff2bb7be695483340139245fb1b9e` |
| half-open | main | `42a3829d3b7497fa0eed5931f245a552a8625a8c03b33492242a1e85fbf55473` |
| opening-wide | transition | `6accf8f15e9f928b85a1a0970453b24fd8914ebbe2cddaf7773dea2e7dd97638` |
| near-open | transition | `081c7117856cbe2d3981c3549901771b58fdd8b3e8b9aba9151f98d11338670b` |
| open | main | `7933519965bb30b30ab0bfceb85f22110720f2ae4a74b754451ec24f6af525e3` |

All output hashes, source references, phone/title pins, frame/state mapping, timeline delays and registration metadata are in `ancient-treasure-chest.manifest.json`.

## Self-Review Complete

**Changes reviewed:** New compositor and renderer in full; new unit/browser contracts and config; new provenance/prompt/manifest/HTML; decision record and this devlog append. Review scope exceeds200 lines and is limited to this turn's new areas, not all pre-existing dirty work. Seven dimensions checked: correctness, edge cases, completeness, architecture, style, security and coverage.

**Issues found and fixed:**

- Important compatibility issue: legacy renderer assumes every generation has an edit target. New wrapper renders the actual mixed generate/edit lineage separately rather than substituting a fictional parent.
- Art/registration checks rejected the initial overly generic draft and later atlas alignment. ImageGen revisions corrected the hasp connection, proportions and shared margins; the selected raw sheet passes existing registration tolerances without per-frame fitting.

**Remaining notes:** Artistic acceptance is still the user's decision. Inspected all eight enlarged sprites, grayscale, logical closed/open composites, plus representative desktop/tablet/phone/320 scene and unchanged-phone screenshots. Automated contracts inspect every frame at all four viewports. No claim that every screenshot received separate manual inspection. Hinge point remains a manual guide; this is not final production animation.

**Verdict:** CLEAN — no critical or important implementation issues remain.

## Boundaries

No change to existing review sources/artifacts/contracts, titles, phone, surrounding objects, product runtime, web/public, asset registry, PWA manifest, service worker, Home or accounting. No production exports, Phase2, staging, commit, worktree or subagents. Full-repository suites and production build were not run. Stop at whole-family visual review; neither chest nor Scenes is approved.
