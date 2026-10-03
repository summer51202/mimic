# Avatar / Classes Production Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This repository session is explicitly Inline Execution: do not dispatch subagents or create a worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a review-only, deterministic eight-character Avatar / Classes calibration from the approved character directions, with transparent ImageGen sources, normalized masters, real optical outputs, exact lineage hashes, responsive visual evidence, and no runtime promotion.

**Architecture:** Preserve the eight approved concept sheets as immutable reference inputs, then use one built-in ImageGen edit per character to create a transparent full-body source without redesigning identity, pose, equipment, proportion, palette, or pixel granularity. A declarative config and PNGJS compositor normalize those sources into transparent 512 × 512 masters plus real 128 × 128 and 64 × 64 nearest-neighbor optical PNGs, write a hash-complete manifest, and render a responsive review page. Independent Vitest and Playwright contracts enforce lineage, raster hygiene, identity evidence, family consistency, viewport behavior, and the review-only boundary.

**Tech Stack:** Built-in ImageGen, Node.js ESM, `pngjs`, Vitest, ESLint, Playwright, HTML/CSS review artifacts, SHA-256.

---

## Execution Constraints

- Run inline in `D:\Project\mimic`; do not create a worktree or dispatch subagents.
- Preserve the existing dirty worktree. Never reset, clean, revert, or overwrite unrelated changes.
- Do not touch, stage, or commit `.codex-remote-attachments/` or `reference/`.
- Do not use `git add .`.
- Treat `.superpowers/brainstorm/avatar-classes-20261002/` as read-only calibration input during execution.
- Use built-in ImageGen separately for all eight creative transparent sources. Do not substitute SVG, canvas, procedural drawing, or programmatic repainting.
- Do not change `web/public`, product runtime source, asset registries, PWA manifest, service worker, or product pages.
- Keep the family and every generated asset at `awaiting-calibration` until the user approves the final review page.

## File Structure

- Create `web/src/shared/brand/avatar-classes-calibration.test.ts` — independent raster, lineage, hash, semantic, and boundary contract.
- Create `web/e2e/avatar-classes-review.spec.ts` — four-viewport review-page contract.
- Create temporarily `web/playwright.avatar-classes.config.ts` — focused 320/390/768/1440 projects; remove before handoff.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes.config.mjs` — fixed roster, selected reference mapping, semantics, sizes, and normalization policy.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-avatar-classes.mjs` — deterministic PNG normalization, optical export, manifest, and review renderer.
- Create eight immutable reference copies under `samples/derivations/avatar-classes/references/`.
- Create eight transparent ImageGen sources under `samples/derivations/avatar-classes/sources/`.
- Create eight normalized masters under `samples/avatar-classes/masters/`.
- Create eight 128 × 128 files under `samples/avatar-classes/optical-128/`.
- Create eight 64 × 64 files under `samples/avatar-classes/optical-64/`.
- Create `samples/avatar-classes/avatar-classes-calibration.png` — transparent 2048 × 1024 two-row roster sheet.
- Create `avatar-classes.manifest.json` — exact source/master/optical/sheet lineage and hashes.
- Create `avatar-classes-review.html` — same-page family and optical review evidence.
- Modify minimally `calibration-briefs.md`, `decision-log.md`, and `.agents/devlog.md` after implementation.

## Fixed Roster and Reference Inputs

Use this exact order and these approved files from `.superpowers/brainstorm/avatar-classes-20261002/content/`:

```text
warrior       warrior-b-history-2-25-head.png
mage          mage-warrior-pixel-grid-v2-medium.png
ranger        ranger-medium-pixel-grid-v4.png
rogue         rogue-medium-pixel-grid-v3.png
physician     cleric-medium-pixel-grid-v4-navy.png
bard          bard-medium-pixel-grid-v3-refined.png
alchemist     alchemist-medium-pixel-grid-v6-refined-hem.png
cartographer  cartographer-medium-pixel-grid-v2.png
```

The copied references retain the full portrait/full-body concept sheet. ImageGen must extract and refine only the right-side full-body character into a transparent square source. Portrait identity remains visible in the reference evidence but is not copied into the production candidate master.

### Task 1: Write the failing Vitest calibration contract

**Files:**

- Create: `web/src/shared/brand/avatar-classes-calibration.test.ts`

- [ ] **Step 1: Define the fixed roster and manifest types**

Create the test with these exact IDs and record shapes:

```ts
const expectedIds = [
  "warrior",
  "mage",
  "ranger",
  "rogue",
  "physician",
  "bard",
  "alchemist",
  "cartographer",
] as const;

interface RasterRecord {
  path: string;
  width: number;
  height: number;
  sha256: string;
  transparentBackground: boolean;
}

interface CharacterRecord {
  id: (typeof expectedIds)[number];
  label: string;
  role: string;
  reference: RasterRecord;
  source: RasterRecord & { lineage: "imagegen-transparent-edit" };
  master: RasterRecord & { normalization: "nearest-contain-alpha-clean-v1" };
  optical128: RasterRecord & { normalization: "nearest-neighbor-optical-v1" };
  optical64: RasterRecord & { normalization: "nearest-neighbor-optical-v1" };
}
```

- [ ] **Step 2: Assert review-only status and exact roster order**

Read `avatar-classes.manifest.json` and require:

```ts
expect(manifest).toMatchObject({
  decision: "awaiting-calibration",
  reviewOnly: true,
  runtimePromotion: false,
  masterSize: 512,
  opticalSizes: [128, 64],
});
expect(manifest.characters.map(({ id }) => id)).toEqual(expectedIds);
expect(manifest.characters).toHaveLength(8);
```

- [ ] **Step 3: Assert lineage, dimensions, hashes, transparency, and clean hidden RGB**

For every raster record, resolve it from the repository root, decode it with `PNG.sync.read`, recalculate SHA-256, and compare dimensions. Require each reference to live under `samples/derivations/avatar-classes/references/`; each source under `samples/derivations/avatar-classes/sources/`; and each master/optical path under `samples/avatar-classes/`.

Use these helpers exactly:

```ts
function hasTransparentPixel(png: PNG): boolean {
  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] < 255) return true;
  }
  return false;
}

function hasNonzeroTransparentPixel(png: PNG): boolean {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (
      png.data[offset + 3] === 0 &&
      (png.data[offset] !== 0 ||
        png.data[offset + 1] !== 0 ||
        png.data[offset + 2] !== 0)
    ) return true;
  }
  return false;
}
```

Require sources to be square and at least 1024 × 1024, masters to be 512 × 512, and optical exports to be exactly 128 × 128 and 64 × 64. Require transparent pixels and zero RGB wherever alpha equals zero in every source, master, and optical output.

- [ ] **Step 4: Assert review evidence and boundary text**

Require `avatar-classes-review.html` to contain eight `data-character` cards, eight reference images, eight masters, eight `data-optical-size="128"`, eight `data-optical-size="64"`, eight grayscale 64 px previews, eight silhouette previews, exact master SHA-256 labels, the live role labels, the 2.25-head rule, portrait/full-body identity boundary, warrior anchor explanation, and the phrases `awaiting visual calibration` and `no runtime asset changes`.

- [ ] **Step 5: Run the focused test and confirm RED**

Run:

```powershell
cd web
npx.cmd vitest run src/shared/brand/avatar-classes-calibration.test.ts --reporter=verbose
```

Expected: FAIL because `avatar-classes.manifest.json` and `avatar-classes-review.html` do not exist. The failure must not be a TypeScript syntax error.

- [ ] **Step 6: Commit only the independent failing contract when it is safe**

```powershell
git add -- web/src/shared/brand/avatar-classes-calibration.test.ts
git commit -m "test(visual): define avatar class calibration contract"
```

If unrelated staged state makes an isolated commit unsafe, leave the file uncommitted and record that fact at handoff.

### Task 2: Preserve approved references and generate eight transparent sources

**Files:**

- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/avatar-classes/references/*.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/avatar-classes/sources/*-source.png`

- [ ] **Step 1: Copy the eight exact approved concept sheets into the reference directory**

Use explicit `Copy-Item -LiteralPath` commands, one file at a time. Name the copies `<id>-approved-reference.png`. Calculate and record SHA-256 immediately; never overwrite them during later regeneration.

- [ ] **Step 2: Inspect every reference before generation**

Use `view_image` on all eight copied references. Confirm the right-side full-body candidate matches the roster table and that physician uses the navy-background v4 source. Stop if a selected file is missing or visually mismatched.

- [ ] **Step 3: Generate one transparent ImageGen source per character**

Issue eight separate built-in ImageGen edit calls. For each call, use the copied concept sheet as the edit target and the warrior reference as the family-style reference, except that the warrior call uses only its own reference. Set `transparent_background: true`.

Use this exact common prompt, then append exactly one matching character invariant paragraph from the following list:

```text
Use case: background-extraction
Asset type: Mimic Avatar / Classes full-body production-calibration source
Input image 1: approved identity, pose, clothing, palette, and equipment reference; use only its right-side full-body character.
Input image 2: warrior family anchor for proportion and handcrafted pixel construction; do not copy warrior clothing or anatomy.
Primary request: isolate the right-side full-body character as one square transparent-background pixel character. Preserve the approved identity, pose, signature equipment, palette, and apparent 2.25-head adult proportion exactly.
Style: stepped dark brown-black outlines, deliberate medium pixel clusters, two to three material shades, restrained broken highlights, and mild handmade asymmetry. Face, hands, and functional tools may be one detail level finer.
Composition: one centered complete character, feet fully visible, consistent breathing room, no portrait, no second character, no ground shadow, no base.
Constraints: preserve the approved silhouette and role-specific experience marks; genuine transparent alpha; no text or watermark.
Avoid: redesign, different pose, different gaze, changed skin tone, smooth vector curves, painterly antialiasing, noisy isolated pixels, excess damage, extra props, scenery, glow, vignette, or colored background.
```

Append one complete character-specific paragraph:

```text
Warrior invariant: This is the seasoned warrior. Preserve the compact planted stance, red-plumed helmet, round shield, short blade, red-gold palette, and restrained wear on heavy armor.
Mage invariant: This is the experienced court-trained mage. Preserve the upright noble bearing, purple-gold robe, broad B-shaped pointed hat, book, and staff. Keep controlled folds and use marks; add no patches or patterned hat lining.
Ranger invariant: This is the seasoned pathfinder. Preserve dark skin, tied white hair, long braid, image-right gaze, moss-green shoulder covering, bow held low, and the active guiding stance without elongating the body.
Rogue invariant: This is the former guild infiltrator. Preserve asymmetric short dark hair, beauty mark, wine-red scarf, dark shoulder covering, one drawn dagger, and the low ready stance.
Physician invariant: This is the young travelling physician. Preserve warm golden-brown skin, halo-like braid, white/teal/gold robe, wooden staff, open diagnostic hand, upright care posture, and refined medium garment clusters.
Bard invariant: This is the former court musician and travelling chronicler. Preserve freckles, light stubble, red feathered hat, red-brown palette, lute, and active playing pose. Keep the refined pixel detail without smooth curves.
Alchemist invariant: This is the field formula specialist. Preserve asymmetric goggles and eyewear, green scarf, cream work coat, carefully inspected flask, and the warrior-matched apparent 2.25-head ratio.
Cartographer invariant: This is the coastal-born frontier surveyor. Preserve the short-brimmed hat, blue neck scarf, sand-blue palette, folded map, compass, and observant field-surveyor stance.
```

- [ ] **Step 4: Save sources non-destructively and inspect each result**

Copy each accepted built-in output from `$CODEX_HOME/generated_images/...` into the exact source path. Use versioned candidates such as `<id>-source-v02.png` during iteration; only the selected file becomes `<id>-source.png`. Inspect every selected source with `view_image` against its reference before proceeding.

- [ ] **Step 5: Validate source alpha and dimensions before composition**

Decode all eight selected sources. Require square dimensions at least 1024 × 1024, real transparent pixels, no opaque background rectangle, complete feet/equipment, and no clipped character bounds. Reject and regenerate any source that fails.

### Task 3: Define the deterministic config and compositor

**Files:**

- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes.config.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-avatar-classes.mjs`

- [ ] **Step 1: Create the declarative roster config**

Export this top-level contract:

```js
export const avatarClasses = {
  decision: "awaiting-calibration",
  reviewOnly: true,
  runtimePromotion: false,
  normalization: "nearest-contain-alpha-clean-v1",
  opticalNormalization: "nearest-neighbor-optical-v1",
  masterSize: 512,
  masterFit: 448,
  opticalSizes: [128, 64],
  sheet: { width: 2048, height: 1024, columns: 4, rows: 2 },
  characters: [/* exact fixed roster order */],
};
```

Each character object must contain `id`, `label`, `role`, `identity`, `pose`, `palette`, `reference`, and `source`. Use the exact roster facts and file paths defined in Tasks 1–2; do not introduce additional classes or variants.

- [ ] **Step 2: Implement raster loading, alpha cleanup, and visible-bound detection**

In `compose-avatar-classes.mjs`, implement focused helpers:

```js
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function clearTransparentRgb(png) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (png.data[offset + 3] === 0) {
      png.data[offset] = 0;
      png.data[offset + 1] = 0;
      png.data[offset + 2] = 0;
    }
  }
  return png;
}

function visibleBounds(png, alphaFloor = 8) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(y * png.width + x) * 4 + 3];
      if (alpha >= alphaFloor) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) throw new Error("source has no visible pixels");
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}
```

- [ ] **Step 3: Normalize each source to a 512 × 512 master**

Crop only to the visible alpha bounds, scale with integer nearest-neighbor containment into a 448 × 448 fit box, center horizontally, align all feet to the same baseline, preserve at least 24 px transparent breathing room, then clear RGB in fully transparent pixels. Do not recolor, sharpen, blur, interpolate, or redraw.

- [ ] **Step 4: Produce real 128 × 128 and 64 × 64 optical files**

Scale each 512 master with nearest-neighbor sampling into transparent square outputs. These are review optical exports, not final runtime promotion. Record their hashes independently; do not emulate them only with CSS.

- [ ] **Step 5: Assemble the transparent 2048 × 1024 family sheet**

Place the eight masters in fixed 4 × 2 order with 512 px cells. The sheet must contain no labels or background so silhouette and occupancy remain measurable.

- [ ] **Step 6: Write the manifest**

Record `generatedOn`, decision, review/runtime flags, normalization names, sizes, fixed character order, semantic fields, and for every reference/source/master/optical raster: repository-relative path, width, height, SHA-256, and transparent-background expectation. Record the sheet using the same raster fields.

- [ ] **Step 7: Run the compositor twice and prove determinism**

Run:

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-avatar-classes.mjs
Get-FileHash -Algorithm SHA256 docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes.manifest.json
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-avatar-classes.mjs
Get-FileHash -Algorithm SHA256 docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes.manifest.json
```

Expected: both manifest hashes match, and every generated raster hash is unchanged between runs.

### Task 4: Render the review page and make the Vitest contract green

**Files:**

- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-avatar-classes.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes-review.html`
- Test: `web/src/shared/brand/avatar-classes-calibration.test.ts`

- [ ] **Step 1: Render the family overview section**

The review page must show one equal-height eight-card grid with the real transparent 512 masters on one shared deep navy backdrop. Mark the warrior as the family anchor. Display live character label, role, pose intent, palette, selected reference filename, and exact master SHA-256 below each card.

- [ ] **Step 2: Render portrait/full-body identity evidence**

For each character, show the immutable approved concept sheet beside its transparent master. State explicitly that the portrait controls face/age/skin/hair identity while the full body controls proportion/pose/silhouette/equipment. Do not crop away evidence needed to detect drift.

- [ ] **Step 3: Render actual optical and grayscale evidence**

For every character, embed the real 128 and 64 PNG files at native CSS dimensions with `image-rendering: pixelated`. Add a 64 px grayscale rendering using CSS `filter: grayscale(1)` over the same real optical file, and a solid silhouette preview computed by CSS masking or an equivalent non-destructive display treatment. Label every size.

- [ ] **Step 4: Render family rules and review boundary**

Include the 2.25-head baseline, medium garment-cluster rule, finer face/hand/tool exception, role-specific posture rationale, controlled experience/wear rule, repeated-color separation, and the explicit `awaiting visual calibration · no runtime asset changes` banner.

- [ ] **Step 5: Run Vitest and fix implementation only**

Run:

```powershell
cd web
npx.cmd vitest run src/shared/brand/avatar-classes-calibration.test.ts --reporter=verbose
```

Expected: all Avatar / Classes calibration tests PASS. Do not weaken the contract to accept an incorrect artifact.

- [ ] **Step 6: Commit the isolated review pipeline when safe**

Stage only the explicit Avatar / Classes config, compositor, manifest, review HTML, reference/source/master/optical/sheet paths, and focused test. If any path overlaps pre-existing user changes or cannot be safely isolated, leave it uncommitted and report it.

### Task 5: Add the four-viewport Playwright contract

**Files:**

- Create: `web/e2e/avatar-classes-review.spec.ts`
- Create temporarily: `web/playwright.avatar-classes.config.ts`

- [ ] **Step 1: Write the review route and responsive assertions**

Mirror the constrained virtual-origin pattern in `mimiku-states-actions-review.spec.ts`. Route only files beneath the Phase 1 review root. Assert:

```ts
await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  "Avatar / Classes character family",
);
await expect(page.locator("[data-character]")).toHaveCount(8);
await expect(page.locator('[data-optical-size="128"]')).toHaveCount(8);
await expect(page.locator('[data-optical-size="64"]')).toHaveCount(8);
await expect(page.locator("[data-grayscale-preview]")).toHaveCount(8);
await expect(page.locator("[data-silhouette-preview]")).toHaveCount(8);
await expect(page.getByText("awaiting visual calibration", { exact: false })).toBeVisible();
await expect(page.getByText("no runtime asset changes", { exact: false })).toBeVisible();
```

Decode every image and reuse the existing overflow diagnostic to require zero body/document/internal horizontal overflow.

- [ ] **Step 2: Define the temporary four-project config**

Use exact projects:

```ts
projects: [
  { name: "phone-small", use: { viewport: { width: 320, height: 720 } } },
  { name: "phone-390", use: { viewport: { width: 390, height: 844 } } },
  { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
  { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
]
```

- [ ] **Step 3: Prove the browser contract can fail**

Temporarily expect the impossible heading `Avatar / Classes impossible heading`, run the focused Playwright command, and require one heading failure in each of the four projects.

- [ ] **Step 4: Restore the real heading and run GREEN**

```powershell
cd web
npx.cmd playwright test e2e/avatar-classes-review.spec.ts --config=playwright.avatar-classes.config.ts
```

Expected: 4 passed, decoded images at all widths, and no horizontal overflow.

### Task 6: Update review records and devlog

**Files:**

- Modify minimally: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- Modify minimally: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify minimally: `.agents/devlog.md`

- [ ] **Step 1: Append the Avatar / Classes calibration brief**

Record the fixed eight-character order, approved reference filenames, warrior anchor, 2.25-head rule, pixel-granularity policy, portrait/full-body authority split, output sizes, and review-only status. Do not alter earlier entries.

- [ ] **Step 2: Append the decision-log entry**

Record that eight transparent sources and deterministic derivatives were presented for review, list all exact master hashes, and leave the decision as `awaiting-calibration`. State that concept sheets and review masters are not runtime assets.

- [ ] **Step 3: Append the required AGENTS-format devlog entry**

Use:

```markdown
## 2026-10-03 — Avatar / Classes production calibration evidence

**Task:** Build review-only production calibration evidence for the approved eight-character family.  
**Scope:** Avatar / Classes references, ImageGen sources, deterministic compositor, manifest, review page, Vitest, and Playwright contracts.  
**What changed:**
- Preserved the eight approved character references and generated transparent full-body candidates.
- Added deterministic 512 px masters, real 128/64 px optical outputs, exact hashes, and responsive review evidence.
- Added focused raster and four-viewport contracts without modifying runtime assets.
**Decisions:** Warrior remains the proportion/pixel anchor; the family remains awaiting visual calibration.  
**Known gaps / follow-ups:** Runtime promotion, final optical exports, animation, and Phase 2 remain deferred pending user approval.
```

### Task 7: Self-review, verification, and visual checkpoint

**Files:**

- Review all Avatar / Classes files created or modified by Tasks 1–6.
- Delete only: `web/playwright.avatar-classes.config.ts` after browser verification.

- [ ] **Step 1: Run repository `self-review`**

Inspect the complete diff for Critical and Important issues: source/reference mismatches, identity drift, wrong roster order, clipped bounds, inconsistent occupancy, missing alpha cleanup, stale hashes, path escape, review text contradicting the manifest, hidden runtime changes, or responsive overflow. Fix every Critical and Important finding and repeat until none remain.

- [ ] **Step 2: Run focused automated verification**

```powershell
cd web
npx.cmd vitest run src/shared/brand/avatar-classes-calibration.test.ts --reporter=verbose
npx.cmd eslint src/shared/brand/avatar-classes-calibration.test.ts e2e/avatar-classes-review.spec.ts
npm.cmd run typecheck
npx.cmd playwright test e2e/avatar-classes-review.spec.ts --config=playwright.avatar-classes.config.ts
```

Expected: focused Vitest PASS, ESLint exit 0, typecheck exit 0, and Playwright 4 passed.

- [ ] **Step 3: Verify determinism, dimensions, alpha, and transparent RGB independently**

Run the compositor twice and compare manifest and raster hashes. Independently decode all eight sources, masters, and sixteen optical outputs; confirm dimensions, at least one transparent pixel, no nonzero RGB behind alpha 0, common foot baseline, and no clipped visible bounds.

- [ ] **Step 4: Verify repository boundaries**

```powershell
git diff --check
git status --short -- web/public web/src docs/design/assets/reviews/2026-09-18-page-visual-phase-1 .agents/devlog.md
git diff --name-only -- web/public
git diff --name-only -- web/src/app web/src/features web/src/shared -- ':!web/src/shared/brand/avatar-classes-calibration.test.ts'
```

Expected: no `web/public` changes; no product runtime changes; only the focused brand test under `web/src`; no asset registry, PWA manifest, service-worker, or product-page modifications; `.codex-remote-attachments/` and `reference/` remain untracked/unstaged.

- [ ] **Step 5: Remove only the temporary Playwright config and rerun checks**

Delete `web/playwright.avatar-classes.config.ts` with `apply_patch`, then rerun `git diff --check`, the focused Vitest contract, and the repository-boundary commands.

- [ ] **Step 6: Open the review page and stop**

Open:

`docs/design/assets/reviews/2026-09-18-page-visual-phase-1/avatar-classes-review.html`

Report all eight exact master SHA-256 values, all automated verification results, the absence of runtime/public changes, and any files intentionally left uncommitted because of dirty-worktree overlap. Stop at the visual checkpoint and wait for user approval or revision requests.

Do not mark the Avatar / Classes family approved, promote assets to runtime, begin animations, add classes or costumes, modify product pages, or advance Phase 2.
