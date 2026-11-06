# Install / Favicon Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one review-only complete-character Mimiku install master and deterministic 192, 48, 32, and 16 px derivatives, with hashes, manifest, responsive review evidence, and no runtime promotion.

**Architecture:** ImageGen produces one square creative source. A focused ESM config declares the approved single-master exception, while a deterministic Node/pngjs compositor makes one opaque 512 × 512 canonical master and resizes that exact master without optical redraws. Independent Vitest and Playwright contracts verify dimensions, opacity, hashes, common lineage, review evidence, responsive behavior, and the runtime boundary.

**Tech Stack:** ImageGen, Node.js ESM, `pngjs`, Vitest, Playwright, static HTML/CSS.

---

## Execution constraints

- Execute inline in the current checkout; do not create a worktree or dispatch a subagent.
- Preserve the dirty worktree. Never reset, clean, or revert unrelated changes.
- Never touch or stage `.codex-remote-attachments/` or `reference/`.
- Do not use `git add .`.
- Do not commit on `main` without separate explicit authorization.
- Keep every artifact outside `web/public/`; do not modify product runtime, asset registry, PWA manifest, service worker, or product pages.
- Stop after the visual-review checkpoint. Do not approve Install / Favicon, Maskable, the complete Icons family, or Gate A.

## File map

- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon.config.mjs` — canonical sizes, copy, source references, and single-master exception.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-install-favicon.mjs` — deterministic opaque master composition, resizing, hashing, manifest, and review-page rendering.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/install-favicon/install-favicon-source.png` — ImageGen source.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/icon-512.png` — canonical review master.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/icon-192.png` — install derivative.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/icon-48.png` — optical evidence only.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/favicon-32.png` — favicon derivative.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/favicon-16.png` — favicon derivative.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon.manifest.json` — provenance, dimensions, opacity, lineage, kernel, and exact hashes.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon-review.html` — human review checkpoint.
- Create `web/src/shared/brand/install-favicon-calibration.test.ts` — focused raster and document contract.
- Create `web/e2e/install-favicon-review.spec.ts` — four-viewport browser contract.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md` — append the selected exception without rewriting prior approvals.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md` — record presented artwork as awaiting exact-hash approval.
- Modify `.agents/devlog.md` — append a factual implementation entry.

### Task 1: Lock the raster and lineage contract in RED

**Files:**
- Create: `web/src/shared/brand/install-favicon-calibration.test.ts`

- [ ] **Step 1: Write the failing contract**

Define the five exact outputs and assert the manifest has `decision: "awaiting-calibration"`, `strategy: "single-master-resize"`, one 512 master, one shared resize kernel, and these dimensions:

```ts
const expectedOutputs = [
  ["icon-512", 512, "install-master"],
  ["icon-192", 192, "install"],
  ["icon-48", 48, "optical-evidence"],
  ["favicon-32", 32, "favicon"],
  ["favicon-16", 16, "favicon"],
] as const;

expect(manifest).toMatchObject({
  decision: "awaiting-calibration",
  strategy: "single-master-resize",
  canonicalMasterId: "icon-512",
  resizeKernel: "nearest",
});
expect(manifest.outputs.map(({ id }) => id)).toEqual(
  expectedOutputs.map(([id]) => id),
);
```

For each PNG, read it with `PNG.sync.read`, verify exact dimensions, require every alpha byte to equal 255, recompute SHA-256, require a nonempty RGB range, and require `derivedFrom: "icon-512"` for every output except the master. Assert every path stays below `docs/design/assets/reviews/` and never begins with `web/public/`.

Read `install-favicon-review.html` and require:

```ts
for (const [id, size] of expectedOutputs) {
  expect(html).toContain(`data-output="${id}"`);
  expect(html).toContain(`data-true-size="${size}"`);
}
expect(html.match(/data-grayscale-preview/g)).toHaveLength(5);
expect(html).toContain("Single-master Phase 1 exception");
expect(html).toContain("Maskable remains pending");
expect(html).toContain("no runtime asset changes");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `web/`:

```powershell
npx vitest run src/shared/brand/install-favicon-calibration.test.ts
```

Expected: FAIL because `install-favicon.manifest.json` and the review page do not exist.

### Task 2: Generate and inspect the creative source

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/install-favicon/install-favicon-source.png`

- [ ] **Step 1: Inspect all three local references with `view_image`**

Inspect `icon.png`, `samples/icons-calibration.png`, and `samples/record-expense-action/record-expense-action-v01.png` before calling ImageGen.

- [ ] **Step 2: Generate one source with ImageGen**

Use `logo-brand` prompt structure. Require a square complete-character Mimiku with full treasure-chest body and heart coin, front three-quarter pose matching the existing identity, dark navy square field, restrained brass perimeter treatment, warm wood, cream teeth, deep stepped outlines, controlled pixel clusters, and no text, scenery, platform mask, floating prop, ground clutter, glossy mobile-game lighting, or smooth vector curves.

Use the three inspected local files as references and request an opaque background. Save the selected output at the exact source path above.

- [ ] **Step 3: Inspect the saved source**

Use `view_image` and reject any source that loses the complete body, heart coin, asymmetric eyes, mouth opening, or chest silhouette, or introduces illegible extra objects.

### Task 3: Implement the deterministic composer and turn Vitest GREEN

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon.config.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-install-favicon.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/install-favicon/*.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon.manifest.json`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon-review.html`

- [ ] **Step 1: Add canonical metadata**

Export this shape from `install-favicon.config.mjs`:

```js
export const installFaviconCalibration = {
  decision: "awaiting-calibration",
  strategy: "single-master-resize",
  canonicalMasterId: "icon-512",
  resizeKernel: "nearest",
  phaseException: "Complete Mimiku and heart coin remain at every size without optical redraws.",
  outputs: [
    { id: "icon-512", filename: "icon-512.png", size: 512, purpose: "install-master" },
    { id: "icon-192", filename: "icon-192.png", size: 192, purpose: "install" },
    { id: "icon-48", filename: "icon-48.png", size: 48, purpose: "optical-evidence" },
    { id: "favicon-32", filename: "favicon-32.png", size: 32, purpose: "favicon" },
    { id: "favicon-16", filename: "favicon-16.png", size: 16, purpose: "favicon" },
  ],
};
```

- [ ] **Step 2: Implement deterministic raster creation**

The composer must:

1. read the ImageGen source with `pngjs`;
2. flatten it onto an opaque `#0c1025` canvas;
3. resize/crop once into a centered 512 × 512 master with no transparent pixels;
4. derive 192, 48, 32, and 16 directly from the written 512 master using a single `resizeNearest(source, size, size)` function;
5. hash the exact encoded bytes;
6. write every PNG, the manifest, and the review page.

The core resize function is:

```js
function resizeNearest(source, width, height) {
  const output = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x * source.width) / width));
      const sourceY = Math.min(source.height - 1, Math.floor((y * source.height) / height));
      const from = (sourceY * source.width + sourceX) * 4;
      const to = (y * width + x) * 4;
      source.data.copy(output.data, to, from, from + 4);
      output.data[to + 3] = 255;
    }
  }
  return output;
}
```

The manifest entry must use this exact shape:

```js
{
  id,
  path: repoPath(outputPath),
  width: size,
  height: size,
  purpose,
  opaque: true,
  derivedFrom: id === "icon-512" ? null : "icon-512",
  resizeKernel: "nearest",
  sha256: sha256(bytes),
}
```

- [ ] **Step 3: Render the complete review page**

Render a responsive page with a `data-output` card for each size. Each card must include the true-size image (`data-true-size`), a larger nearest-neighbor inspection, a grayscale copy, usage label, and exact hash. Include separate browser-tab and installed-app contexts, the single-master exception, and runtime/Maskable boundary statements.

- [ ] **Step 4: Run the composer and focused test**

Run:

```powershell
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-install-favicon.mjs
Set-Location web
npx vitest run src/shared/brand/install-favicon-calibration.test.ts
```

Expected: compositor exits 0 and focused Vitest passes.

- [ ] **Step 5: Prove determinism**

Hash the manifest, run the composer again, hash the manifest again, and require identical values. Also compare every first-run output hash against the second-run manifest.

### Task 4: Add the responsive browser contract in RED then GREEN

**Files:**
- Create: `web/e2e/install-favicon-review.spec.ts`

- [ ] **Step 1: Write the four-viewport contract**

Route `https://install-favicon-review.local/**` to the review directory using the same traversal guard as other review specs. Assert:

```ts
await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  "Install / Favicon",
);
await expect(page.locator("[data-output]")).toHaveCount(5);
await expect(page.locator("[data-true-size]")).toHaveCount(5);
await expect(page.locator("[data-grayscale-preview]")).toHaveCount(5);
await expect(page.getByText("Single-master Phase 1 exception")).toBeVisible();
await page.locator("img").evaluateAll(async (images) => {
  await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
});
```

Verify project widths 320, 390, 768, and 1440 and require both body and document overflow deltas to be `<= 0`.

- [ ] **Step 2: Verify RED**

Temporarily change the expected heading to an impossible value, run the focused Playwright spec, and confirm the assertion fails for the expected reason. Restore the correct heading before continuing.

- [ ] **Step 3: Run GREEN at all four viewports**

Use the repository Playwright configuration or a task-local temporary configuration that starts no unrelated runtime server. Run only `e2e/install-favicon-review.spec.ts` for the four named projects.

Expected: 4 tests pass.

### Task 5: Record the checkpoint without promoting it

**Files:**
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the calibration brief minimally**

Append that Install / Favicon uses one complete-character master resized to all evidence sizes, retaining the heart coin as an explicit user-approved exception. Keep the sub-family awaiting exact-hash approval and keep Maskable separate.

- [ ] **Step 2: Update the decision log minimally**

Add the presented 512 master hash and all derivative hashes, decision `awaiting calibration`, and the accepted single-master trade-off. Do not change the complete Icons-family decision.

- [ ] **Step 3: Append the required devlog entry**

Use the AGENTS.md format and list the exact new files, deterministic strategy, tests, verification, and deferred Maskable/runtime promotion.

### Task 6: Self-review, verify, and stop at visual approval

- [ ] **Step 1: Run repository self-review**

Use the `self-review` skill. Review the session files across correctness, edge cases, completeness, architecture, style, security, and test coverage. Fix every critical or important issue and re-run affected checks until clean.

- [ ] **Step 2: Run fresh completion verification**

Run:

```powershell
Set-Location web
npx vitest run src/shared/brand/install-favicon-calibration.test.ts
npx eslint src/shared/brand/install-favicon-calibration.test.ts e2e/install-favicon-review.spec.ts
npm run typecheck
Set-Location ..
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-install-favicon.mjs
git diff --check
git diff --cached --check
git status --short web/public
git status --short web/src ':!web/src/shared/brand/install-favicon-calibration.test.ts'
git status --short .codex-remote-attachments reference
```

Run the four-viewport focused Playwright command again. Independently inspect PNG signature, dimensions, alpha=255 for every pixel, exact hashes, and second-run determinism.

- [ ] **Step 3: Open the review checkpoint**

Open:

`docs/design/assets/reviews/2026-09-18-page-visual-phase-1/install-favicon-review.html`

- [ ] **Step 4: Report and stop**

List the exact SHA-256 for `icon-512`, `icon-192`, `icon-48`, `favicon-32`, and `favicon-16`; report every verification result and protected-boundary check; then wait for visual approval or revision. Do not start Maskable or runtime promotion.
