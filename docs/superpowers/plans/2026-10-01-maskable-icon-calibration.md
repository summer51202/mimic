# Maskable Icon Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. The user selected Inline Execution; do not dispatch subagents or create a worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a dedicated, review-only Mimiku maskable icon master and deterministic 192 px derivative with safe-zone crop evidence, exact hashes, focused contracts, and no runtime promotion.

**Architecture:** ImageGen creates one square creative source from the approved Mimiku references. A focused ESM config declares the safe-zone and two-output contract; a deterministic Node/pngjs compositor flattens the source onto deep navy, creates one opaque 512 × 512 canonical master, derives the 192 × 192 output from it with nearest-neighbor sampling, then renders the manifest and responsive review page. Independent Vitest and Playwright contracts verify lineage, dimensions, opacity, hashes, mask evidence, responsive behavior, and repository boundaries.

**Tech Stack:** OpenAI ImageGen, Node.js ESM, `pngjs`, SHA-256, Vitest, ESLint, TypeScript, Playwright, static HTML/CSS.

---

## Guardrails

- Run from `D:\Project\mimic` unless a step names `web/` or the review directory.
- Preserve all existing dirty tracked and untracked work.
- Never reset, checkout, clean, broadly stage, or use `git add .`.
- Do not touch or stage `.codex-remote-attachments/` or `reference/`.
- Do not change `web/public`, product runtime source, the asset registry, PWA manifest, service worker, or product pages.
- Use ImageGen for the creative source; do not replace it with SVG, canvas, or procedural drawing.
- Stop at `awaiting-calibration`; do not approve Maskable, the complete Icons family, Gate A, runtime promotion, or Phase 2.
- Do not commit on `main` without separate explicit authorization.

## File map

**Create:**

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/maskable/maskable-source.png` — ImageGen creative source.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/maskable-icons.config.mjs` — decision, safe-zone, output inventory, and consumer labels.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-maskable-icons.mjs` — deterministic PNG composition, resizing, hashing, manifest, and review HTML.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/maskable/maskable-512.png` — canonical opaque review master.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/maskable/maskable-192.png` — direct nearest-neighbor derivative.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/maskable-icons.manifest.json` — provenance, safe-zone, dimensions, alpha, lineage, and hashes.
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/maskable-icons-review.html` — responsive visual checkpoint.
- `web/src/shared/brand/maskable-icon-calibration.test.ts` — independent asset contract.
- `web/e2e/maskable-icon-review.spec.ts` — four-viewport browser contract.

**Modify minimally:**

- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- `.agents/devlog.md`

**Temporary during focused Playwright only:**

- `web/playwright.maskable.config.ts` — delete after the final focused run.

---

### Task 1: Establish the failing Vitest asset contract

**Files:**

- Create: `web/src/shared/brand/maskable-icon-calibration.test.ts`

- [ ] **Step 1: Write the manifest and review-page contract before implementation**

Define these expected outputs exactly:

```ts
const expectedOutputs = [
  ["maskable-512", 512, "maskable-master"],
  ["maskable-192", 192, "maskable"],
] as const;
```

Parse `maskable-icons.manifest.json` and assert:

```ts
expect(manifest).toMatchObject({
  decision: "awaiting-calibration",
  strategy: "dedicated-maskable-master",
  canonicalMasterId: "maskable-512",
  resizeKernel: "nearest",
  safeZone: { shape: "circle", diameterPercent: 80 },
});
```

For each output, read the declared path and verify exact dimensions, purpose, `opaque: true`, encoded-byte SHA-256, RGB range greater than 48, and lineage:

```ts
expect(output.derivedFrom).toBe(
  id === "maskable-512" ? null : "maskable-512",
);
expect(output.path.replaceAll("\\", "/")).toMatch(
  /^docs\/design\/assets\/reviews\//,
);
expect(output.path.replaceAll("\\", "/")).not.toMatch(/^web\/public\//);
```

Read `maskable-icons-review.html` and require:

```ts
expect(html).toContain("Maskable Icons");
expect(html).toContain("80% safe zone");
expect(html).toContain('data-mask-preview="circle"');
expect(html).toContain('data-mask-preview="rounded-square"');
expect(html).toContain('data-mask-preview="squircle"');
expect(html).toContain('data-mask-preview="aggressive"');
expect(html).toContain("Approved Install / Favicon context");
expect(html).toContain("no runtime asset changes");
```

- [ ] **Step 2: Run the focused contract and prove RED**

Run from `web/`:

```powershell
npx.cmd vitest run src/shared/brand/maskable-icon-calibration.test.ts --reporter=verbose
```

Expected: FAIL because `maskable-icons.manifest.json` and `maskable-icons-review.html` do not exist. If Windows sandbox returns `spawn EPERM`, rerun the identical command with subprocess permission; do not weaken the test.

---

### Task 2: Generate the dedicated creative source

**Files:**

- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/maskable/maskable-source.png`

- [ ] **Step 1: Inspect all local visual references**

Use `view_image` on:

```text
D:\Project\mimic\icon.png
D:\Project\mimic\docs\design\assets\reviews\2026-09-18-page-visual-phase-1\samples\install-favicon\icon-512.png
D:\Project\mimic\docs\design\assets\reviews\2026-09-18-page-visual-phase-1\samples\icons-calibration.png
D:\Project\mimic\web\public\icons\icon-maskable-512.png
```

The runtime maskable file is negative context only: do not reproduce its sky, grass, moon, horizon, or ground line.

- [ ] **Step 2: Read and apply the ImageGen skill**

Generate one opaque square bitmap using all three approved/canonical references. Prompt requirements must explicitly state:

```text
Purpose-built PWA maskable icon; complete Mimiku body and all four feet; complete heart coin;
both eyes, full tooth row, main chest silhouette, and coin inside a centered 80% circular safe zone;
deep navy background fills the square; no brass outer frame; no sky, grass, moon, horizon, floor,
text, symbols, UI chrome, or scenery; stepped dark outlines, warm wood, restrained clean brass,
broken highlights, limited pixel clusters, deliberate hand-made asymmetry; no smooth vector curves,
mobile-game gloss, excessive noise, or cropped anatomy.
```

Set `transparent_background: false`. Save the returned image bytes at the exact source path above without programmatic redrawing.

- [ ] **Step 3: Inspect the generated source**

Use `view_image` at original detail. Reject and regenerate if any defining anatomy crosses the intended 80% safe zone, the brass square frame remains, scenery appears, or the result loses the approved Mimiku face/teeth/chest/coin identity.

---

### Task 3: Implement the deterministic compositor and turn Vitest GREEN

**Files:**

- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/maskable-icons.config.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-maskable-icons.mjs`
- Generate: two PNG outputs, manifest, and review HTML listed in the file map.

- [ ] **Step 1: Add the focused config**

```js
export const maskableCalibration = {
  decision: "awaiting-calibration",
  strategy: "dedicated-maskable-master",
  canonicalMasterId: "maskable-512",
  resizeKernel: "nearest",
  backgroundRgb: [12, 16, 37],
  safeZone: { shape: "circle", diameterPercent: 80 },
  outputs: [
    {
      id: "maskable-512",
      filename: "maskable-512.png",
      size: 512,
      purpose: "maskable-master",
      consumer: "Canonical maskable review master",
    },
    {
      id: "maskable-192",
      filename: "maskable-192.png",
      size: 192,
      purpose: "maskable",
      consumer: "Installed-PWA maskable evidence",
    },
  ],
};
```

- [ ] **Step 2: Compose deterministic PNGs**

In `compose-maskable-icons.mjs`:

1. Resolve the repository and review directories from `import.meta.url`.
2. Load `pngjs` from `web/node_modules/pngjs` with `createRequire`.
3. Decode the ImageGen source.
4. Flatten every source pixel over `backgroundRgb` and force alpha to 255.
5. Resize the flattened source to 512 × 512 with an integer nearest-neighbor loop.
6. Derive 192 × 192 from the 512 pixel buffer, never from the creative source.
7. Encode with `PNG.sync.write`, write both files, and hash the exact encoded bytes.
8. Assert alpha 255 for every pixel before writing.
9. Write the manifest with source provenance, safe-zone rule, review-only boundary, outputs, lineage, and hashes.
10. Render the review HTML from the same manifest so displayed hashes cannot drift.

Use this pixel mapping for both resizes:

```js
const sourceX = Math.min(
  source.width - 1,
  Math.floor((x * source.width) / width),
);
const sourceY = Math.min(
  source.height - 1,
  Math.floor((y * source.height) / height),
);
```

- [ ] **Step 3: Render complete review evidence**

The HTML must render:

- one `data-output` card per output;
- true-size, enlarged, and grayscale views;
- one `data-safe-zone="80"` overlay around the 512 master;
- four separately labeled `data-mask-preview` elements;
- adjacent approved Install / Favicon 512 context;
- exact source/output hashes;
- explicit square/opaque, preview-only mask, no-runtime-change, complete-family, and Gate A notes.

Use CSS `clip-path` or `border-radius` only to preview platform masks; never mutate output pixels for those previews. Put the 512 true-size image inside an internal overflow container so the document itself stays responsive.

- [ ] **Step 4: Run the compositor**

Run from the review directory:

```powershell
node compose-maskable-icons.mjs
```

Expected: exit 0 and one line listing both output IDs and SHA-256 hashes.

- [ ] **Step 5: Run focused Vitest and prove GREEN**

Run from `web/`:

```powershell
npx.cmd vitest run src/shared/brand/maskable-icon-calibration.test.ts --reporter=verbose
```

Expected: all tests in the focused file pass.

- [ ] **Step 6: Prove deterministic regeneration**

Hash the manifest and both PNGs, run the compositor again, hash the same files again, and require byte-identical values. Independently decode both PNGs and require exact dimensions plus alpha 255 for every pixel.

---

### Task 4: Add the responsive Playwright contract with RED→GREEN evidence

**Files:**

- Create: `web/e2e/maskable-icon-review.spec.ts`
- Create temporarily: `web/playwright.maskable.config.ts`

- [ ] **Step 1: Add an isolated four-project config**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  workers: 1,
  projects: [
    { name: "phone-small", use: { viewport: { height: 568, width: 320 } } },
    { name: "phone", use: { viewport: { height: 844, width: 390 } } },
    { name: "tablet", use: { viewport: { height: 1024, width: 768 } } },
    { name: "desktop", use: { viewport: { height: 900, width: 1440 } } },
  ],
});
```

- [ ] **Step 2: Write the browser contract with one deliberate failing assertion**

Route `https://maskable-review.local/**` to the review directory using `page.route` and `readFile`. Reject resolved paths outside the review root. Assert project width, two output cards, true-size and grayscale counts, four mask previews, image decoding, visible boundary labels, and zero body/document horizontal overflow.

Initially require this impossible heading:

```ts
await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  "Impossible Maskable heading",
);
```

- [ ] **Step 3: Run Playwright and prove RED**

```powershell
npx.cmd playwright test e2e/maskable-icon-review.spec.ts --config=playwright.maskable.config.ts
```

Expected: four failures, each reporting actual heading `Maskable Icons` versus the impossible expected heading. Environment/browser-launch failures do not count as RED; repair the environment and rerun.

- [ ] **Step 4: Change only the heading expectation**

```ts
await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  "Maskable Icons",
);
```

- [ ] **Step 5: Run Playwright and prove GREEN**

Run the identical command. Expected: 4 passed.

---

### Task 5: Record the review checkpoint minimally

**Files:**

- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/calibration-briefs.md`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/decision-log.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Extend the Icons calibration brief**

Append one paragraph stating that Maskable uses a dedicated, borderless complete-character composition on deep navy, with all defining anatomy and the complete heart coin inside the centered 80% safe zone. State that it remains awaiting exact-hash approval and is separate from approved Install / Favicon.

- [ ] **Step 2: Update the decision log without approving the Icons family**

Add both presented output hashes, ImageGen source hash, the selected A direction, and decision `awaiting calibration`. Keep Maskable, complete Icons family, and Gate A open.

- [ ] **Step 3: Append the required devlog entry**

Use the AGENTS.md format:

```markdown
## 2026-10-01 — Maskable icon calibration checkpoint

**Task:** Produce the approved-direction Maskable review artifacts without runtime promotion.  
**Scope:** ImageGen source, deterministic compositor/config, two PNGs, manifest, responsive review, focused contracts, calibration records, and devlog.  
**What changed:** Generated the dedicated source; composed and hashed the opaque 512/192 outputs; added safe-zone, platform-mask, grayscale, responsive, and deterministic evidence; recorded the review checkpoint.  
**Decisions:** Use the borderless complete-character A direction on deep navy, keep defining anatomy within the centered 80% safe zone, and leave decision state `awaiting-calibration`.  
**Known gaps / follow-ups:** Await exact-hash visual approval; runtime promotion and complete-family approval remain deferred.
```

Preserve all earlier dirty content and make only an appended entry.

---

### Task 6: Self-review, final verification, and visual checkpoint

**Files:** All files in this plan.

- [ ] **Step 1: Run repository `self-review`**

Identify the exact scoped changes with `git status`, `git log --oneline -5`, and scoped diffs. Run automated checks first, then review correctness, edge cases, completeness, architecture, style, security, and test coverage. Fix every Critical or Important issue and repeat until none remain.

- [ ] **Step 2: Run fresh verification-before-completion commands**

From `web/`:

```powershell
npx.cmd vitest run src/shared/brand/maskable-icon-calibration.test.ts --reporter=verbose
npx.cmd eslint src/shared/brand/maskable-icon-calibration.test.ts e2e/maskable-icon-review.spec.ts
npm.cmd run typecheck
npx.cmd playwright test e2e/maskable-icon-review.spec.ts --config=playwright.maskable.config.ts
```

From the review directory:

```powershell
node compose-maskable-icons.mjs
```

Independently verify second-run determinism, source/output hashes, PNG signatures, exact dimensions, alpha 255 for every pixel, and unique output hashes.

From the repository root:

```powershell
git diff --check
git diff --cached --check
git status --short -- web/public
git status --short -- .codex-remote-attachments reference
```

Also inspect `git status --short -- web/src web/e2e` and require that this task adds tests only, not runtime source. Confirm no asset registry, PWA manifest, service worker, or product-page changes.

- [ ] **Step 3: Remove the temporary Playwright config**

Delete only `web/playwright.maskable.config.ts` with `apply_patch`, then rerun `git diff --check`.

- [ ] **Step 4: Open the review page and stop**

Open this file in Codex:

```text
D:\Project\mimic\docs\design\assets\reviews\2026-09-18-page-visual-phase-1\maskable-icons-review.html
```

Report the exact SHA-256 for the ImageGen source, `maskable-512`, and `maskable-192`; report every verification result and protected-boundary check. Stop and wait for visual approval or revision.

Do not mark Maskable, the complete Icons family, or Gate A approved. Do not promote review assets to runtime or begin Phase 2.
