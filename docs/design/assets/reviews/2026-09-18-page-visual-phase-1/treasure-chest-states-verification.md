# Treasure chest four-state review — verification receipt

Date: 2026-10-17. Scope: Phase 1 / Landing / review-only.

Status: implementation and technical verification complete; entire family awaiting user visual calibration. No artwork/Scenes approval, runtime promotion, stage or commit.

## Delivered artifacts

- `treasure-chest-states-review.html`: actual four states, equal 2x PNGs, true grayscale PNGs, original closed candidate, warrior references, live controls, desktop scene and unchanged phone.
- `treasure-chest-states.manifest.json`: exact source/output hashes, 104x120 canvas, ordered scene reconstruction, anchors, source history and output inventory.
- `samples/treasure-chest-states-v01/`: 25 deterministic PNGs, including four 104x120 sprite masters and a chest-free reconstruction.
- `samples/derivations/treasure-chest-states-v01/`: three unmodified built-in ImageGen outputs, actual prompts for all calls and lineage. Attempts 01/02 retained for traceability, not selected masters.

All four states share source scale 66/389, scene origin (92,230), local ground (52,120), world ground (144,350) and the closed-derived lower body. Hinge (52,84) is explicitly a visual review guide, not an automatically measured physical hinge.

| Master | Exact SHA-256 |
| --- | --- |
| closed-sprite.png | `46675fe65150e2a80df60f0bde3f014a5e175e9eb382128656d54ac087a95116` |
| cracked-sprite.png | `ba5d88e15a886552ffc84e31821d40828591b89c977b5a5f3428fe3016a2fc20` |
| half-open-sprite.png | `e603fcd4978e3b8240367589d8061418b295ac36e177f68614d8c92886cc74be` |
| open-sprite.png | `a79d5c8604180644a8d8a666f3c769aeebdb6dce711aff292fbe66f102e35a17` |

Selected atlas SHA-256: `a666381ea471a8670f3bcff8b0acf534a0bc2a3e969a264b03219af0233100ce`.

Manifest SHA-256: `61f1bf4e2ec7efca3e3c80a08af1852f674868094d8912962d2c40082c636cb1`.

## Actual verification results

| Check | Result |
| --- | --- |
| Initial unit RED | 13 real assertions failed for missing model/manifest/raster; sandbox startup errors were not counted as RED |
| Initial browser RED | actual file URL failed with ERR_FILE_NOT_FOUND before page implementation |
| Focused Vitest regression | 9 files, 55 tests passed: 14 new plus 41 existing |
| Four-viewport Playwright | 140 passed: 20 new plus 120 existing at 320/390/768/1440 |
| Scoped TS tests/config ESLint | exit 0 |
| Scoped five ESM modules ESLint | exit 0 |
| Web typecheck | `npm run typecheck`, exit 0 |
| ESM syntax | five `node --check` calls passed |
| Determinism | 25 PNGs, HTML and manifest byte-identical on two Vitest rebuilds and two subsequent direct Node rebuilds |
| Raster contracts | actual dimensions/hash/nearest sampling, binary sprite alpha, zero transparent RGB, true grayscale, common transform and exact lower-body bytes passed |
| Scene boundaries | independent ordered reconstruction passed; differences limited to x92..195/y230..349 |
| State behavior | 140ms transitions, reverse close, no queued repeated input, manual cancellation, keyboard, reduced-motion, real missing file and real non-image decode error passed |
| Whitespace | tracked/staged diff checks and explicit new-text scan passed; Git EOL notices only |
| Preservation | 915 pre-existing scoped files hash-identical; original 194273-byte devlog is an exact prefix; staged binary diff unchanged |

Final focused unit command is the nine-file command in the implementation plan with `--no-file-parallelism --testTimeout=30000`. Artifact tests deliberately mutate and restore their own files; concurrent suites could temporarily observe another suite's invalid manifest. Sequential execution avoids that interference without weakening old contracts or modifying old tests.

Browser command from `web/`: `npx playwright test --config=e2e/treasure-chest-states.playwright.config.ts`.

Sixteen actual state-scene screenshots plus four unchanged-phone screenshots under `web/test-results/treasure-chest-states-revi-ff0c4-anged-phone-do-not-overflow-*` were individually inspected. They are Playwright output, not production assets. No overlap with characters, map crate, title or live UI was observed; chest remains a secondary prop.

Windows sandbox could not initially rename Vitest cache files or locate the host Chromium. Relevant checks ran in the normal-host execution environment. Playwright NO_COLOR/FORCE_COLOR notices and Git LF/CRLF notices were non-failing warnings.

Full repository test suites and production build were not run; this receipt makes no claim about them.

## Self-Review Complete

**Changes reviewed:** all five new implementation modules, two new unit contracts, browser spec/config, source provenance, output manifest/HTML and sixteen state scene plus four phone screenshots. Seven dimensions checked: correctness, edge cases, completeness, architecture, style, security and coverage. Existing unrelated dirty diffs were excluded from ownership.

**Issues found and fixed:**

- Critical: function-toString serialized Vite-transformed code differently from direct Node (extra semicolons). The real byte-determinism test caught this. Composer now embeds hash-checked raw model/controller source; renderer never serializes transformed functions.
- Important: source lineage initially omitted exact records for rejected generation attempts. Added three-step sourceHistory with hashes, edit targets, references and a real RED/GREEN contract.
- Important: phone metadata includes non-image fields. Tests now enumerate the four actual image records rather than interpreting all metadata values as paths.
- Important: complete PNG rebuild exceeded default test time and parallel mutation-based suites interfered. Added an explicit bounded test budget and sequential regression command; repaired only the known self-created incomplete-manifest test mutation and confirmed all original hashes.
- Important: missing-image coverage alone did not demonstrate invalid-image decoding. Added a real existing non-image-file failure case at every viewport.

**Remaining notes:** final artistic quality and hinge motion await user judgment. Review timing is provisional, not product animation timing. UI/UX reduced-motion guidance confirmed the existing query/direct-terminal implementation without changing art direction.

**Verdict:** CLEAN — no critical or important implementation issues remain; visual approval is still pending.

## Boundaries and handoff

Desktop title remains 376/100, 288x84; phone title remains 130/59, 148x98. Original phone pixels/bytes, all other scene objects and live UI are preserved. No runtime, web/public, registry, PWA manifest, service worker, product, Home, accounting, production export or Phase 2 changes.

Implementation-plan interface/sample-code updates reflect the raw-script renderer and complete source history. Devlog is append-only. Existing attachments/reference remain unstaged. No worktree, subagent, staging, commit, push or PR.

Suggested manual commit message: `feat(visual): add coordinated treasure chest state review`.

Stop at the four-state review page for user visual feedback. A manual commit does not imply artwork approval.
