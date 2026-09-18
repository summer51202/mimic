# Page Visual Phase 1 Asset Style Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and approve the complete visual-asset language required by the page redesign before any production page composition begins.

**Architecture:** Keep calibration samples and approved production-ready families outside `web/public/`. A machine-readable review manifest links every family to named consumers, live-HTML boundaries, dimensions, transparency, loading, fallback, and accessibility expectations. Two explicit user gates separate calibration from full-family production and full-family approval from later page composition.

**Tech Stack:** Markdown/JSON review records, PNG/WebP review assets, HTML/CSS motion calibration, TypeScript/Vitest, PNGJS, Playwright, existing Next.js test server

---

## Scope and prohibitions

This phase implements only the asset-review gate from Section 6.1 of the approved page-visual design. It does not redesign a route, change runtime tokens, modify `pixelUiFiles` or `pixelUiRoles`, preload a new asset, alter the service worker, overwrite a current production image, or connect an approved asset to a page.

The current hierarchy migration is retained as-is. Existing files under `web/public/` are baseline/reference inputs only; they are not silently treated as approved page-redesign assets.

Hard prohibitions for this phase:

- Do not change files under `web/src/app/`, `web/src/features/`, `web/src/shared/ui/`, `web/src/shared/navigation/`, `web/src/styles/`, or `web/public/`.
- Do not modify, move, recompress, or regenerate `icon.png`.
- Do not bake an amount, date, name, status, error, form label, or action label into any sample or approved image.
- Do not use one illustration to imply a combined personal/shared/pooled balance.
- Do not create game rewards, coins, achievements, permissions, or accounting behavior from avatar class or decoration.
- Do not generate a complete family until the user has approved that family’s calibration sample.
- Do not begin page composition until the user has approved the complete-family QA packet.
- Do not touch or stage `.codex-remote-attachments/` or `reference/`.

## Gate sequence

| Gate | Deliverable | Permitted next action |
|---|---|---|
| 1. Inventory | Consumer matrix and live-HTML/accessibility boundaries | Create review-only calibration samples |
| 2. Calibration | One sample for each of eight families | Present samples; do not create full families |
| 3. User decision A | Explicit per-family approval/correction/rejection record | Only approved families may enter full production |
| 4. Complete families | Production-ready, non-runtime files under `docs/design/assets/approved/page-visual-v1/` | Run asset QA; still no page composition |
| 5. QA | Dimensions, alpha, contrast composites, motion, reduced-motion, fallback and four-viewport review | Present final approval packet |
| 6. User decision B | Explicit approval to use the complete families | Write a separate Phase 2 or later plan; do not implement pages automatically |

## Current baseline to preserve

- `docs/design/assets/sources/mimiku/`: immutable source copy, model sheet, and state sheet.
- `docs/design/assets/sources/pixel-ui/icons-ui.png`: existing source UI sheet.
- `web/public/brand/mimiku-hero.png`: current public hero.
- `web/public/pixel-ui/characters/`: six 512 × 512 runtime character states.
- `web/public/pixel-ui/avatars/`: four 96 × 96 runtime avatars.
- `web/public/pixel-ui/scenes/`: deferred 512 × 1024 and 1024 × 620 treasury scenes.
- `web/public/pixel-ui/frames/frames-ui.png`: deferred 256 × 166 frame.
- `web/public/icons/`: current 192/512 `any` and `maskable` icons.
- Focused baseline at `a157a83`: 5 files / 65 tests pass for assets, public boundaries, PWA cache, and manifest.

## Review-only file structure

Create these files before Gate A:

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/asset-consumer-matrix.md` — family-to-consumer and semantic boundary record.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md` — exact art direction and rejection criteria for every family.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json` — machine-readable sample paths, dimensions, alpha expectation, and decision state.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html` — live captions, sample presentation, fallback boxes, and contrast backgrounds; no operational text inside raster files.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md` — user decisions with exact approved sample hashes.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/wordmark-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/scenes-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/frames-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/props-calibration.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/motion-calibration.html`
- `web/src/shared/brand/asset-style-gate.test.ts` — manifest, PNG, immutable-source, and forbidden-runtime-change assertions.
- `web/e2e/asset-style-gate.spec.ts` — four-viewport review-index geometry, broken-image fallback, motion, and reduced-motion assertions.

After Gate A, complete-family files are created only under:

- `docs/design/assets/approved/page-visual-v1/`
- `docs/design/assets/approved/page-visual-v1/production-asset-manifest.json`
- `docs/design/assets/approved/page-visual-v1/qa-report.md`

## Inventory: asset family to named consumers

The consumer matrix must contain these exact mappings.

| Family | Named future consumers | Meaning/fallback boundary |
|---|---|---|
| Wordmark | Landing, Home, public header, authenticated top rail, compact brand link | Accessible `MIMIC` text alternative and live-text fallback remain available; motion is decorative |
| Icons | PWA install icons, favicon, five primary navigation entries, record-expense action, three mode badges, expense/contribution/reimbursement/shortfall/return/settlement/correction/lock/offline event types | Critical controls and financial event rows retain visible text; icon never supplies the only name/status |
| Mimiku states/actions | Auth, invite, shared route states, loading/empty/error/offline/success, Home dialogue, record/invite/settle/pooled/guide/complete actions | Full live message is present; character absence never blocks action or recovery |
| Avatar classes | Registration follow-up, Settings, party roster, payer/participant formation, balance roster, activity actor | Person is identified by live name and role, never by class; duplicate classes allowed; class has no permission meaning |
| Scenes | Landing cave and Home secret base only | CTA, recent-adventure card, navigation, greeting, and all financial facts remain live and usable if scene fails |
| Frames | Shared panels, legal reading surface, dialogue, adventure notebook, guild board, settlement board | Semantic landmark and content order exist without border art |
| Props | Landing torch/bats/trap/treasure/wall/passages, feature chapter cues, financial-mode/event decoration | Interactive Landing props are named buttons; finance props remain decorative beside live labels |
| Motion | Wordmark glance/blink, 2–4-frame base states, 4–6-frame actions, cave props, dialogue typewriter, one-time celebration | One primary character animation at a time; no delayed navigation/action; reduced motion shows final state immediately |

## Proposed approved-family paths

These paths are a review proposal, not authorization to create or overwrite production images. Gate A approval must explicitly accept both the visual sample and these staged filenames. All files remain outside `web/public/` during Phase 1.

### Wordmark

| Staged file | Pixel size | Alpha | Intended later CSS size |
|---|---:|---|---|
| `docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-display.png` | 1536 × 512 | yes | 240–640px wide |
| `docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-compact.png` | 768 × 256 | yes | 96–220px wide |
| `docs/design/assets/approved/page-visual-v1/wordmark/mimic-wordmark-motion-sheet.png` | 4608 × 512 | yes | three 1536 × 512 frames; Landing/Home only |

### Install, favicon, navigation, mode, and event icons

| Staged file set | Pixel size | Alpha/safe-zone rule |
|---|---:|---|
| `docs/design/assets/approved/page-visual-v1/icons/install/icon-192.png` | 192 × 192 | opaque field, complete face |
| `docs/design/assets/approved/page-visual-v1/icons/install/icon-512.png` | 512 × 512 | opaque field, complete face |
| `docs/design/assets/approved/page-visual-v1/icons/install/icon-maskable-192.png` | 192 × 192 | maskable safe zone |
| `docs/design/assets/approved/page-visual-v1/icons/install/icon-maskable-512.png` | 512 × 512 | maskable safe zone |
| `docs/design/assets/approved/page-visual-v1/icons/install/favicon-16.png` | 16 × 16 | silhouette/face first |
| `docs/design/assets/approved/page-visual-v1/icons/install/favicon-32.png` | 32 × 32 | silhouette/face first |
| `docs/design/assets/approved/page-visual-v1/icons/ui/nav-{home,adventure-log,guild,tasks,settings}.png` | 48 × 48 each | transparent |
| `docs/design/assets/approved/page-visual-v1/icons/ui/action-record-expense.png` | 48 × 48 | transparent |
| `docs/design/assets/approved/page-visual-v1/icons/ui/mode-{personal,shared,pooled}.png` | 48 × 48 each | transparent and visibly distinct without color |
| `docs/design/assets/approved/page-visual-v1/icons/ui/event-{expense,contribution,reimbursement,shortfall,return,settlement,correction}.png` | 48 × 48 each | transparent and paired with live labels |
| `docs/design/assets/approved/page-visual-v1/icons/ui/status-{lock,offline}.png` | 48 × 48 each | transparent and paired with live labels |

Brace expressions above denote the exact listed files, not a shell glob to execute destructively.

`production-asset-manifest.json` must enumerate the icon files individually with these exact paths:

```text
docs/design/assets/approved/page-visual-v1/icons/ui/nav-home.png
docs/design/assets/approved/page-visual-v1/icons/ui/nav-adventure-log.png
docs/design/assets/approved/page-visual-v1/icons/ui/nav-guild.png
docs/design/assets/approved/page-visual-v1/icons/ui/nav-tasks.png
docs/design/assets/approved/page-visual-v1/icons/ui/nav-settings.png
docs/design/assets/approved/page-visual-v1/icons/ui/action-record-expense.png
docs/design/assets/approved/page-visual-v1/icons/ui/mode-personal.png
docs/design/assets/approved/page-visual-v1/icons/ui/mode-shared.png
docs/design/assets/approved/page-visual-v1/icons/ui/mode-pooled.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-expense.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-contribution.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-reimbursement.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-shortfall.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-return.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-settlement.png
docs/design/assets/approved/page-visual-v1/icons/ui/event-correction.png
docs/design/assets/approved/page-visual-v1/icons/ui/status-lock.png
docs/design/assets/approved/page-visual-v1/icons/ui/status-offline.png
```

### Mimiku states and actions

| Staged file set | Pixel size | Frames |
|---|---:|---:|
| `docs/design/assets/approved/page-visual-v1/mimiku/state-{idle,working,happy,reminder,serious,concerned}.png` | 512 × 512 each | static |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-record-ledger.png` | 2560 × 512 | 5 |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-invitation.png` | 2560 × 512 | 5 |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-settlement.png` | 3072 × 512 | 6 |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-pooled-funds.png` | 2560 × 512 | 5 |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-guide.png` | 2048 × 512 | 4 |
| `docs/design/assets/approved/page-visual-v1/mimiku/action-adventure-complete.png` | 3072 × 512 | 6; skippable later |

The six static-state paths are exactly:

```text
docs/design/assets/approved/page-visual-v1/mimiku/state-idle.png
docs/design/assets/approved/page-visual-v1/mimiku/state-working.png
docs/design/assets/approved/page-visual-v1/mimiku/state-happy.png
docs/design/assets/approved/page-visual-v1/mimiku/state-reminder.png
docs/design/assets/approved/page-visual-v1/mimiku/state-serious.png
docs/design/assets/approved/page-visual-v1/mimiku/state-concerned.png
```

### Avatar classes

Create one 96 × 96 transparent portrait and one 192 × 192 transparent full-body idle sprite at each exact path:

```text
docs/design/assets/approved/page-visual-v1/avatars/warrior-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/warrior-full.png
docs/design/assets/approved/page-visual-v1/avatars/mage-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/mage-full.png
docs/design/assets/approved/page-visual-v1/avatars/ranger-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/ranger-full.png
docs/design/assets/approved/page-visual-v1/avatars/rogue-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/rogue-full.png
docs/design/assets/approved/page-visual-v1/avatars/cleric-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/cleric-full.png
docs/design/assets/approved/page-visual-v1/avatars/bard-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/bard-full.png
docs/design/assets/approved/page-visual-v1/avatars/alchemist-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/alchemist-full.png
docs/design/assets/approved/page-visual-v1/avatars/cartographer-portrait.png
docs/design/assets/approved/page-visual-v1/avatars/cartographer-full.png
```

### Scenes

| Staged file | Pixel size | Alpha/tile rule |
|---|---:|---|
| `docs/design/assets/approved/page-visual-v1/scenes/landing-cave-background.png` | 2048 × 1152 | opaque; left/right edges tile into passage interfaces |
| `docs/design/assets/approved/page-visual-v1/scenes/landing-cave-foreground.png` | 2048 × 1152 | transparent |
| `docs/design/assets/approved/page-visual-v1/scenes/landing-passage-left.png` | 512 × 1152 | transparent interface |
| `docs/design/assets/approved/page-visual-v1/scenes/landing-passage-right.png` | 512 × 1152 | transparent interface |
| `docs/design/assets/approved/page-visual-v1/scenes/home-secret-base-background.png` | 2048 × 1152 | opaque; cave interior, no entrance-departure composition |
| `docs/design/assets/approved/page-visual-v1/scenes/home-secret-base-foreground.png` | 2048 × 1152 | transparent |
| `docs/design/assets/approved/page-visual-v1/scenes/home-campfire-sheet.png` | 1024 × 256 | transparent; four 256 × 256 frames |

### Frames and props

| Staged file set | Pixel size | Rule |
|---|---:|---|
| `docs/design/assets/approved/page-visual-v1/frames/frame-{parchment,wood,stone}-9slice.png` | 256 × 256 each | transparent corners and documented 32px slice |
| `docs/design/assets/approved/page-visual-v1/frames/frame-dialogue-9slice.png` | 512 × 256 | transparent corners and documented 32px slice |
| `docs/design/assets/approved/page-visual-v1/frames/frame-notebook-9slice.png` | 512 × 512 | transparent corners and documented 48px slice |
| `docs/design/assets/approved/page-visual-v1/props/landing-{torch,bats,pressure-plate,trap,treasure,wall-drawing,passage-cue}.png` | 96–256px integer canvas per manifest | transparent; no text/reward currency |
| `docs/design/assets/approved/page-visual-v1/props/feature-{personal,shared,pooled,tasks}.png` | 256 × 256 each | transparent; never carries a financial fact |

The exact frame and prop paths recorded in the manifest are:

```text
docs/design/assets/approved/page-visual-v1/frames/frame-parchment-9slice.png
docs/design/assets/approved/page-visual-v1/frames/frame-wood-9slice.png
docs/design/assets/approved/page-visual-v1/frames/frame-stone-9slice.png
docs/design/assets/approved/page-visual-v1/frames/frame-dialogue-9slice.png
docs/design/assets/approved/page-visual-v1/frames/frame-notebook-9slice.png
docs/design/assets/approved/page-visual-v1/props/landing-torch.png
docs/design/assets/approved/page-visual-v1/props/landing-bats.png
docs/design/assets/approved/page-visual-v1/props/landing-pressure-plate.png
docs/design/assets/approved/page-visual-v1/props/landing-trap.png
docs/design/assets/approved/page-visual-v1/props/landing-treasure.png
docs/design/assets/approved/page-visual-v1/props/landing-wall-drawing.png
docs/design/assets/approved/page-visual-v1/props/landing-passage-cue.png
docs/design/assets/approved/page-visual-v1/props/feature-personal.png
docs/design/assets/approved/page-visual-v1/props/feature-shared.png
docs/design/assets/approved/page-visual-v1/props/feature-pooled.png
docs/design/assets/approved/page-visual-v1/props/feature-tasks.png
```

The exact canvas size for each Landing prop must be one of 96 × 96, 128 × 128, 192 × 192, or 256 × 256 and is recorded in Gate A. This finite choice is part of calibration review; it is not left to the production step.

## Task 1: Lock the inventory and machine-readable review contract

**Files:**
- Create: `web/src/shared/brand/asset-style-gate.test.ts`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/asset-consumer-matrix.md`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`

- [ ] **Step 1: Write the failing manifest contract test**

Create `web/src/shared/brand/asset-style-gate.test.ts`. It must resolve the review manifest with `path.resolve(process.cwd(), "..", "docs", "design", "assets", "reviews", "2026-09-18-page-visual-phase-1", "review-manifest.json")`, assert `baseline_commit === "a157a83"`, assert the exact family IDs `wordmark`, `icons`, `mimiku-states`, `avatar-classes`, `scenes`, `frames`, `props`, and `motion`, and assert that every family has nonempty `consumers`, `live_html_boundaries`, `fallback`, `accessibility`, and `sample` fields. It must also assert that no sample path starts with `web/public/`.

Use Node `readFile`, `path.resolve`, `JSON.parse`, and Vitest `expect`; do not import the manifest into runtime code.

- [ ] **Step 2: Run the focused test and verify RED**

Run from `web/`:

```powershell
npm test -- src/shared/brand/asset-style-gate.test.ts
```

Expected: FAIL with `ENOENT` for `review-manifest.json`.

- [ ] **Step 3: Create the consumer matrix and calibration briefs**

Write the exact eight mappings from “Inventory: asset family to named consumers” into `asset-consumer-matrix.md`. Add per-family subsections to `calibration-briefs.md` with these non-negotiable rejection criteria:

- Wordmark rejects symmetric/floating eyes, eye-and-mouth placement on the same letter, illegible `MIMI`, continuous pointer tracking, or a missing static fallback.
- Icons reject cropped eyes/teeth/chest silhouette in maskable safe zones, text baked into icons, mode icons distinguishable only by hue, or navigation icons without matching visible labels.
- Mimiku rejects loss of chest anatomy, offset eyes, dark outline, wood panels, gold hardware, cream teeth, or heart coin; Serious is not used for recoverable offline/error states; Concerned does not blame the user.
- Avatars reject permission/role symbolism, identity conveyed only by class, tiny unreadable silhouettes, or fewer than the eight approved classes.
- Scenes reject operational text, fake balances, document-level horizontal overflow assumptions, Home depicted as a cave entrance, or essential CTA/content embedded in pixels.
- Frames reject content padding below touch/readability needs, busy texture behind legal/financial body text, or a border that carries status alone.
- Props reject reward coins/achievements, harmful trap framing, or a prop that replaces a named button.
- Motion rejects continuous pointer following, more than one primary character animation, delayed actions/navigation, mandatory exploration, or a reduced-motion mode that removes state changes.

- [ ] **Step 4: Create the initial review manifest and decision log**

`review-manifest.json` must contain the eight family IDs, the exact sample paths listed in “Review-only file structure,” the canvas dimensions below, and decision state `awaiting-calibration`:

| Family | Calibration canvas | Alpha |
|---|---:|---|
| wordmark | 1200 × 400 | yes |
| icons | 1024 × 1024 | yes |
| mimiku-states | 1536 × 1024 | yes |
| avatar-classes | 2048 × 1024 | yes |
| scenes | 2048 × 1152 | no |
| frames | 1536 × 1024 | yes |
| props | 1536 × 1024 | yes |
| motion | self-contained HTML at 1200 × 800 review viewport | n/a |

`decision-log.md` begins with the baseline commit, immutable icon hash, the two mandatory STOP gates, and an empty Markdown table with the fixed rows for all eight families and columns `Family`, `Sample SHA-256`, `Decision`, `Requested correction`, and `Decision date`. Empty decision cells are intentional review state rather than unresolved implementation instructions; the manifest test requires `awaiting-calibration` until the user decides.

- [ ] **Step 5: Run the manifest test and verify GREEN**

Run from `web/`:

```powershell
npm test -- src/shared/brand/asset-style-gate.test.ts
```

Expected: PASS for inventory structure while sample-file checks are not yet added.

- [ ] **Step 6: Commit the inventory boundary**

```powershell
git add docs/design/assets/reviews/2026-09-18-page-visual-phase-1 web/src/shared/brand/asset-style-gate.test.ts
git commit -m "docs(visual): inventory page asset consumers"
```

Expected commit boundary: Markdown/JSON/test only; no binary sample, runtime source, or public asset.

## Tasks 2–8: Produce one calibration sample per static family

Each task below is independently reviewable and revertible. Use the approved `imagegen` workflow only for the named review-only sample. Do not provide `web/public/` paths to image generation or editing tools. Use current immutable/source art only as references; do not edit those references in place.

For each task, follow this exact TDD loop:

1. Extend `asset-style-gate.test.ts` with the family’s expected sample path, PNG signature, exact canvas dimensions, and alpha expectation from Task 1.
2. Run `npm test -- src/shared/brand/asset-style-gate.test.ts`; expected FAIL is `ENOENT` for that one sample.
3. Create only the named calibration PNG from the matching brief.
4. Add the sample SHA-256 to `review-manifest.json`; leave its decision `awaiting-calibration`.
5. Run the focused test again; expected PASS includes signature, size, alpha, and “outside `web/public/`” assertions.
6. Run `git diff --check`; expected no output.
7. Commit only the test change, manifest hash, brief refinement if needed, and the one sample.

### Task 2: Wordmark calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/wordmark-calibration.png`

Sample content: one static `MIMIC` display arrangement plus compact-size optical inset, with mismatched wood/metal letters; eyes in the first `M` left half, right eye higher, eyebrows, gentle outward pupils; mouth/heart-coin identity on final `C`; transparent background; no tagline or action text.

Commit:

```powershell
git add docs/design/assets/reviews/2026-09-18-page-visual-phase-1 web/src/shared/brand/asset-style-gate.test.ts
git commit -m "art(review): calibrate Mimic wordmark"
```

### Task 3: Icon calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png`

Sample content: the face/install-icon direction shown at 16, 32, 48, 192, and maskable-safe-zone scale; one five-icon navigation strip; personal/shared/pooled mode samples that remain distinguishable in grayscale; no text in pixels.

Commit message: `art(review): calibrate icon family`.

### Task 4: Mimiku state calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-calibration.png`

Sample content: Idle, Working, Happy, Reminder, Serious, and Concerned silhouettes on one transparent sheet, plus one record-ledger action key pose and one separate adventure-completion key pose. Preserve the approved anatomy and make Serious/Concerned visibly distinct without captions in the image.

Commit message: `art(review): calibrate Mimiku states`.

### Task 5: Avatar-class calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/avatar-classes-calibration.png`

Sample content: portrait and full-body idle direction for warrior, mage, ranger, rogue, cleric, bard, alchemist, and cartographer. Use cosmetic silhouettes only; no crown, owner badge, rank, amount, or permission cue.

Commit message: `art(review): calibrate avatar classes`.

### Task 6: Scene calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/scenes-calibration.png`

Sample content: side-by-side crops of the Landing central cave with passage interfaces and the Home secret-base cave interior with central campfire. Show foreground/background separation visually, but include no CTA, dialogue, recent-adventure data, label, amount, or date in the pixels.

Commit message: `art(review): calibrate Landing and Home scenes`.

### Task 7: Frame calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/frames-calibration.png`

Sample content: parchment, wood, stone, dialogue, and notebook frame corners/edges/center fills on transparency. Demonstrate generous empty interiors and repeatable 9-slice edges; do not include body copy inside the raster.

Commit message: `art(review): calibrate frame family`.

### Task 8: Prop calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/props-calibration.png`

Sample content: torch, bats, pressure plate, harmless trap, ordinary treasure chest, hidden wall drawing, passage cue, and small personal/shared/pooled/task chapter cues. Props are environmental/semantic decoration, not rewards or financial state.

Commit message: `art(review): calibrate prop family`.

## Task 9: Build the motion and reduced-motion calibration

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/motion-calibration.html`
- Create: `web/e2e/asset-style-gate.spec.ts`

- [ ] **Step 1: Add a failing unit assertion for the motion contract**

Assert that the HTML contains named examples `wordmark-glance`, `base-idle`, `action-once`, `celebration-once`, and `typewriter-final`; contains `@media (prefers-reduced-motion: reduce)`; uses no pointer-position listener; and exposes the complete dialogue sentence in a non-animated accessibility node.

Run:

```powershell
npm test -- src/shared/brand/asset-style-gate.test.ts
```

Expected: FAIL with `ENOENT` for `motion-calibration.html`.

- [ ] **Step 2: Create the self-contained motion calibration**

The HTML uses review-only CSS shapes and the approved calibration stills. It demonstrates:

- one infrequent three-frame wordmark glance/blink;
- one 2–4-frame equivalent idle loop at 4–6 fps;
- one 4–6-frame equivalent action that plays once;
- one skippable completion sequence;
- a typewriter visual with the full sentence separately available to assistive technology;
- a reduced-motion media query that removes transforms, parallax, flying, trap, idle, typewriter, and celebration motion and exposes final states immediately.

No example may start a second primary character animation while another is active.

- [ ] **Step 3: Write Playwright behavior tests before accepting GREEN**

`web/e2e/asset-style-gate.spec.ts` registers `page.route("https://asset-review.local/**")`, maps each request to the corresponding file below `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/`, and fulfills it with an explicit HTML or PNG content type. It then navigates to `https://asset-review.local/review-index.html`. For each configured project, it sets a 1200 × 800 calibration viewport for motion timing checks, then separately checks the project’s native width for the review index. Assertions must verify:

- normal mode has at most one `[data-primary-animation="running"]`;
- the action and celebration reach a final state without navigation delay;
- click/keyboard skip exposes the final state;
- `page.emulateMedia({ reducedMotion: "reduce" })` yields `animation-name: none` for every named motion element;
- the full dialogue sentence is present once in the accessibility tree;
- no horizontal overflow occurs.

First run before completing the HTML:

```powershell
npm run test:e2e -- e2e/asset-style-gate.spec.ts
```

Expected: FAIL on missing named states and reduced-motion assertions.

After implementation, rerun the same command. Expected: PASS in phone-small, phone, tablet, and desktop projects.

- [ ] **Step 4: Commit the motion sample**

```powershell
git add docs/design/assets/reviews/2026-09-18-page-visual-phase-1 web/src/shared/brand/asset-style-gate.test.ts web/e2e/asset-style-gate.spec.ts
git commit -m "art(review): calibrate visual motion"
```

## Task 10: Assemble the calibration review index and validate all samples

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `web/e2e/asset-style-gate.spec.ts`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`

- [ ] **Step 1: Add failing review-index assertions**

Unit assertions require all eight sample paths, live captions outside images, both navy and parchment contrast backdrops, bounded fallback boxes, and the strings `320`, `390`, `768`, and `1440` in review metadata. Playwright assertions deliberately abort one image request and verify its family heading, description, and review-status text remain visible.

Add deterministic screenshot assertions with animations disabled:

```ts
await expect(page).toHaveScreenshot(`asset-style-gate-${testInfo.project.name}.png`, {
  animations: "disabled",
  fullPage: true,
});
```

The committed baselines live under `web/e2e/asset-style-gate.spec.ts-snapshots/`. A changed baseline requires human review; do not raise pixel tolerance to absorb unexplained drift.

Run focused unit and E2E tests. Expected: FAIL because `review-index.html` does not exist.

- [ ] **Step 2: Create the review index**

Use semantic `<main>`, one `<section>` per family, live `<h2>`/description/consumer/fallback text, ordinary `<img>` elements with meaningful alt text for informative samples, and empty alt text only for decorative contrast composites. Include no product operation control; approval remains a user review action outside the artifact.

At 320 and 390, use one column; at 768, allow two columns only for paired comparison; at 1440, never reduce sample captions below 16px. The document must not hide overflow globally.

- [ ] **Step 3: Run complete calibration validation**

From `web/`:

```powershell
npm test -- src/shared/brand/asset-style-gate.test.ts src/shared/brand/assets.test.ts src/shared/brand/assets-boundary.test.ts src/shared/brand/pixel-ui-assets.test.ts src/app/pwa-cache-policy.test.ts src/app/manifest.test.ts
npm run test:e2e -- e2e/asset-style-gate.spec.ts
```

Expected: all unit tests and all four Playwright projects PASS. The root icon hash remains unchanged; `git diff -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png` produces no output.

- [ ] **Step 4: Commit the review packet**

```powershell
git add docs/design/assets/reviews/2026-09-18-page-visual-phase-1 web/src/shared/brand/asset-style-gate.test.ts web/e2e/asset-style-gate.spec.ts
git commit -m "test(visual): assemble asset calibration review"
```

## Task 11: Mandatory STOP — obtain calibration approval

**Files:**
- Modify only after the user responds: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify only after the user responds: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`

- [ ] Present all eight samples, their SHA-256 hashes, consumer lists, and rejection criteria.
- [ ] Ask the user to approve, reject, or request corrections per family and to accept or revise the proposed staged filenames/canvas choices.
- [ ] Stop. Do not generate complete families while any family remains `awaiting-calibration`, `changes-requested`, or `rejected`.
- [ ] After explicit decisions, record only the user’s actual decisions and hashes. A changed sample invalidates its earlier approval and returns that family to `awaiting-calibration`.
- [ ] Run the manifest test. Expected: PASS only when every family is `approved` and every approved hash matches the reviewed sample.
- [ ] Commit the decision record separately:

```powershell
git add docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json
git commit -m "docs(visual): record asset calibration approval"
```

## Task 12: Produce complete approved families outside runtime

**Precondition:** Task 11 records explicit approval for all eight families and the staged filenames. If this precondition is false, this task is forbidden.

**Files:**
- Create: every exact file accepted from “Proposed approved-family paths” under `docs/design/assets/approved/page-visual-v1/`
- Create: `docs/design/assets/approved/page-visual-v1/production-asset-manifest.json`
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`

- [ ] **Step 1: Add failing production-manifest tests**

Extend the test to require one manifest record for every accepted staged file. Each record contains exact relative path, source/calibration hash, export method, width, height, frame count, alpha expectation, intended CSS size, named consumer, loading policy, accessibility role, fallback, reduced-motion treatment, `runtime_target: null`, and `disposition: "staged-only-until-consumer-plan"`. A later approved page-phase plan, not Phase 1, assigns an exact `web/public/` target when it adds the named consumer.

Run the focused test. Expected: FAIL with `ENOENT` for `production-asset-manifest.json`.

- [ ] **Step 2: Create the production manifest before binary generation**

Populate every accepted file from the tables above. Assert there are no duplicate target runtime paths and no destination equals an existing public path unless the manifest says `replace-after-page-phase-approval`. Existing production files may not be overwritten in this phase.

Run the focused test. Expected: FAIL only on missing approved binaries.

- [ ] **Step 3: Produce each complete family from its approved sample**

Use the approved sample as the controlling visual reference. Generate/export one family at a time into its exact staged directory. After each family:

```powershell
npm test -- src/shared/brand/asset-style-gate.test.ts
git diff --check
```

Expected: the focused test advances from missing files in later families to full PASS. Commit boundaries:

```text
art(visual): complete approved wordmark family
art(visual): complete approved icon family
art(visual): complete approved Mimiku family
art(visual): complete approved avatar family
art(visual): complete approved scene family
art(visual): complete approved frame family
art(visual): complete approved prop family
docs(visual): record approved motion timing
```

Each commit includes only one family, its production-manifest records/hashes, and the focused test updates required for that family. Do not combine family commits.

- [ ] **Step 4: Confirm runtime remains untouched**

Run from repository root:

```powershell
git diff a157a83 -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png
```

Expected: no diff. Changes under `web/src/shared/brand/asset-style-gate.test.ts` are intentionally outside this runtime-page/public-asset check.

## Task 13: Validate complete-family quality and write the QA report

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`
- Modify: `web/e2e/asset-style-gate.spec.ts`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html`
- Create: `docs/design/assets/approved/page-visual-v1/qa-report.md`
- Modify: `docs/design/visual-assets.md`

- [ ] **Step 1: Add automated file-quality assertions**

For every manifest PNG, assert signature, exact dimensions, declared alpha behavior, nonempty nontransparent bounds, and unique SHA-256. For transparent cutouts, reuse `inspectPng` to require transparent exterior corners and zero connected neutral matte. For sprite sheets, assert width equals frame width multiplied by frame count. For install icons, assert the four manifest sizes/purposes remain representable and record safe-zone visual review.

Expected RED before fixing/exporting any malformed file: the test names the exact path and failed property. Expected GREEN only when every file satisfies its manifest.

- [ ] **Step 2: Add contrast and failure composites to the review index**

Show every transparent family on canonical navy, cave charcoal, parchment, and warm surface backgrounds using live HTML backdrops. Essential text/UI boundaries use live token colors and must meet WCAG 2.2 AA: 4.5:1 normal text, 3:1 large text and essential boundaries. Record computed ratios in `qa-report.md`; artwork itself never becomes the only carrier of status.

Abort each image family once in Playwright and verify bounded layout plus live heading/description/fallback. Expected PASS at 320, 390, 768, and 1440.

- [ ] **Step 3: Validate normal and reduced motion**

Run the motion Playwright checks once with `reducedMotion: "no-preference"` and once with `reducedMotion: "reduce"`. Verify one primary animation maximum, action/celebration skip, immediate full dialogue under reduced motion, no focus theft, and no artificial navigation delay.

- [ ] **Step 4: Update the living catalogue without declaring runtime consumers active**

Add a `Page visual v1 complete-family review` section to `docs/design/visual-assets.md`. Record provenance, dimensions, intended future CSS size, consumer, loading, accessibility, fallback, and status `review-ready-staged`. Do not add staged paths to `pixelUiFiles` or service-worker caches.

- [ ] **Step 5: Run final Phase 1 verification**

From `web/`:

```powershell
npm run lint
npm run typecheck
npm test -- src/shared/brand/asset-style-gate.test.ts src/shared/brand/assets.test.ts src/shared/brand/assets-boundary.test.ts src/shared/brand/pixel-ui-assets.test.ts src/app/pwa-cache-policy.test.ts src/app/manifest.test.ts
npm run test:e2e -- e2e/asset-style-gate.spec.ts e2e/public-and-auth.spec.ts e2e/pixel-responsive.spec.ts
$env:MIMIC_API_BASE_URL = "http://127.0.0.1:3101/api/v1"
npm run build
```

Expected: every command exits 0. Public/auth behavior remains unchanged because no page or public asset changed.

- [ ] **Step 5b: Run existing real-backend financial regression**

Provision and verify the task-owned loopback database/API/Web environment before running these commands; never point them at Staging or Production and never stop a process that this task did not start.

```powershell
$env:MIMIC_RUNTIME_ACCEPTANCE = "1"
$env:MIMIC_RUNTIME_DATABASE_URL = "postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=page_visual_asset_gate"
$env:MIMIC_API_BASE_URL = "http://127.0.0.1:3101/api/v1"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3110"
npm run test:e2e -- e2e/navigation-home-tasks.real-backend.spec.ts e2e/personal-expenses.runtime.spec.ts e2e/real-backend-personal-references.spec.ts e2e/shared-expenses.runtime.spec.ts e2e/pooled-funds.real-backend.spec.ts
```

Expected: all five specifications pass in phone-small, phone, tablet, and desktop projects with no fulfilled or mocked financial endpoint. If port 55439 or schema `page_visual_asset_gate` is not demonstrably task-owned, record and use a new loopback port/schema rather than reusing or deleting external state.

From repository root:

```powershell
(Get-FileHash -Algorithm SHA256 icon.png).Hash.ToLowerInvariant()
git diff --check
git status --short
```

Expected icon hash: `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`. Status contains only Phase 1 files plus the preserved untracked `.codex-remote-attachments/` and `reference/` before the Phase 1 commit series is complete.

- [ ] **Step 6: Commit the QA packet**

```powershell
git add docs/design/assets/approved/page-visual-v1/qa-report.md docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html docs/design/visual-assets.md web/src/shared/brand/asset-style-gate.test.ts web/e2e/asset-style-gate.spec.ts
git commit -m "test(visual): validate staged asset families"
```

## Task 14: Mandatory STOP — obtain complete-family approval

**Files:**
- Modify only after the user responds: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify only after the user responds: `docs/design/assets/approved/page-visual-v1/production-asset-manifest.json`
- Modify only after the user responds: `docs/design/visual-assets.md`

- [ ] Present the complete families, production manifest, QA report, four-viewport review captures, broken-asset fallbacks, and reduced-motion evidence.
- [ ] Ask for explicit approval to begin a separate Phase 2 visual-foundation plan. Approval of Phase 1 does not authorize page composition, runtime promotion, image replacement, or Phase 2 implementation.
- [ ] Stop. Do not touch `web/public/`, runtime registries, service-worker rules, tokens, shared UI, or pages.
- [ ] If approved, record the exact complete-family hashes and the phrase `approved for later consumer-scoped promotion` in the decision log and production manifest, and change the catalogue status from `review-ready-staged` to `approved-staged`. Commit only those three records with `docs(visual): record complete asset approval`.

## Phase 1 acceptance checklist

- [ ] The consumer matrix covers wordmark, icons, Mimiku states/actions, avatars, scenes, frames, props, and motion.
- [ ] Every family has exactly one reviewed calibration sample before complete-family production.
- [ ] Gate A records explicit user approval and accepted filenames; sample changes invalidate approval.
- [ ] Complete families remain outside `web/public/` and have no runtime registry/preload/cache entry.
- [ ] Every staged file has exact provenance, hash, dimensions, CSS intent, consumer, loading, accessibility, fallback, and reduced-motion treatment.
- [ ] PNG alpha/matte, sprite dimensions, install safe zones, contrast composites, motion, reduced motion, and failure fallbacks pass.
- [ ] Review and QA cover 320, 390, 768, and 1440 without document-level overflow.
- [ ] No operational or financial text is baked into an image.
- [ ] Personal/shared/pooled iconography remains distinguishable and semantically isolated.
- [ ] Root `icon.png` is byte-for-byte unchanged.
- [ ] Existing asset/PWA/public tests pass.
- [ ] Gate B records explicit approval before any later page composition or consumer-scoped runtime promotion.
- [ ] `.codex-remote-attachments/` and `reference/` remain unmodified and uncommitted.

## Plan self-review record — 2026-09-18

- [x] **Unresolved-instruction scan:** searched both new plans for incomplete markers, deferred-detail phrases, vague error-handling language, copied-task shortcuts, and unspecified URL/port values; no matches remain.
- [x] **File and verification precision:** every Phase 1 task names its files, RED condition, GREEN condition, command, and commit boundary; every proposed binary has an exact staged path or an explicitly enumerated manifest expansion.
- [x] **Approved-design consistency:** the plan preserves the three visual layers, Landing/Home-only full scenes, eight avatar classes, six Mimiku states, separate adventure-completion treatment, direct action language, live HTML, mode isolation, settlement locks, and independent pooled states.
- [x] **Scope control:** Phase 1 changes review docs, review assets, tests, and approved staging only. Tokens, shared UI, routes, feature components, runtime assets, registries, preload/cache behavior, API contracts, and accounting remain outside the phase.
- [x] **Testing and accessibility:** the plan includes PNG integrity, transparency/matte checks, install safe zones, contrast composites, keyboard/skip behavior, full-sentence dialogue exposure, broken-asset fallback, deterministic screenshots, all four viewports, and reduced motion.
- [x] **Approval gates:** Task 11 stops before complete-family production; Task 14 stops before page composition or runtime promotion. Changed hashes invalidate prior approval.
- [x] **Authorization audit:** review-only samples are distinct from complete production-ready families; complete-family generation is conditional on explicit Gate A approval; no existing production image is overwritten; Phase 2+ requires a separate plan and approval.
- [x] **Regression audit:** focused asset/PWA/public checks and the five existing real-backend financial Playwright specifications are explicit acceptance requirements.
