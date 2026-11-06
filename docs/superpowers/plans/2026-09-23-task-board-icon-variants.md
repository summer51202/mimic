# Task Board Icon Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and present three higher-fidelity Mimiku-style Tasks navigation icon candidates without changing the approved navigation source, main calibration, manifest decision, or runtime assets.

**Architecture:** Use the approved five-icon navigation strip as the subject and style reference, then make three independent built-in ImageGen calls so each candidate follows its own approved silhouette and detail hierarchy. Copy the resulting transparent PNGs into a versioned review-only directory and expose them through one static comparison page; selection and calibration recomposition remain a later user-approved step.

**Tech Stack:** Built-in ImageGen, PNG/RGBA assets, static HTML/CSS review surface, Node.js with `pngjs` for read-only validation.

---

### Task 1: Confirm source invariants

**Files:**
- Read: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/icons-navigation-v04-source.png`
- Read: `docs/superpowers/specs/2026-09-23-task-board-icon-variants-design.md`

- [x] **Step 1: Inspect the approved navigation strip at original resolution**

Use the local image viewer and confirm the five-icon order is campfire, journal, handshake, task board, gear. Treat the entire strip as a style reference and the fourth icon as the replacement subject reference.

- [x] **Step 2: Record the immutable source hash**

Run:

```powershell
(Get-FileHash docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/icons-navigation-v04-source.png -Algorithm SHA256).Hash.ToLower()
```

Expected: `3e9284c6666723c1d58a437063cd823bfee62d5acfdf682eaf54d5123c618cea`.

### Task 2: Generate three independent transparent candidates

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/task-board-variants/task-board-a-adventurer-contract.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/task-board-variants/task-board-b-guild-quest-wall.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/task-board-variants/task-board-c-expedition-planning.png`

- [x] **Step 1: Generate candidate A with built-in ImageGen**

Use the approved strip as a reference image and this prompt:

```text
Use case: stylized-concept
Asset type: fantasy PWA primary-navigation icon candidate
Primary request: Create one refined Adventurer Contract Board icon to replace only the fourth Tasks icon in the reference strip.
Input image: style and subject reference; preserve the Mimiku hand-drawn high-density pixel language and match the other four icons' visual weight.
Subject: thick rectangular timber quest board, layered wood planks, substantial brass corner protectors, three overlapping parchment contracts with varied pins, one small red wax seal.
Style/medium: detailed hand-drawn pixel art, stepped dark-navy outlines, clustered pixels, limited warm ramps, restrained highlights, slight handmade asymmetry.
Composition: isolated centered near-square object, readable at navigation scale.
Constraints: genuinely transparent background; no scenic base; no letters, numbers, pseudo-text, watermark, external shadow, characters, hands, campfire, book, handshake, or gear; preserve clean complete edges.
```

- [x] **Step 2: Generate candidate B with built-in ImageGen**

Use the same reference and this prompt:

```text
Use case: stylized-concept
Asset type: fantasy PWA primary-navigation icon candidate
Primary request: Create one refined Guild Quest Wall icon to replace only the fourth Tasks icon in the reference strip.
Input image: style and subject reference; preserve the Mimiku hand-drawn high-density pixel language and match the other four icons' visual weight.
Subject: slightly arched timber notice board, carved upper rail, restrained rope or leather hanging detail, several layered parchment notices, refined brass fasteners.
Style/medium: detailed hand-drawn pixel art, stepped dark-navy outlines, clustered pixels, limited warm ramps, restrained highlights, slight handmade asymmetry.
Composition: isolated centered near-square object, ceremonial but immediately readable as a task board.
Constraints: genuinely transparent background; no scenic base; no letters, numbers, pseudo-text, watermark, external shadow, characters, hands, campfire, book, handshake, shield, or gear; preserve clean complete edges.
```

- [x] **Step 3: Generate candidate C with built-in ImageGen**

Use the same reference and this prompt:

```text
Use case: stylized-concept
Asset type: fantasy PWA primary-navigation icon candidate
Primary request: Create one refined Expedition Planning Board icon to replace only the fourth Tasks icon in the reference strip.
Input image: style and subject reference; preserve the Mimiku hand-drawn high-density pixel language and match the other four icons' visual weight.
Subject: shield-like timber frame, one parchment contract, one map fragment, a small route marker, and one restrained brass expedition badge.
Style/medium: detailed hand-drawn pixel art, stepped dark-navy outlines, clustered pixels, limited warm ramps, restrained highlights, slight handmade asymmetry.
Composition: isolated centered near-square object, adventurous but still readable as Tasks rather than Settings or Maps.
Constraints: genuinely transparent background; no scenic base; no letters, numbers, pseudo-text, watermark, external shadow, characters, hands, campfire, book, handshake, cog teeth, or standalone map icon; preserve clean complete edges.
```

- [x] **Step 4: Copy each final built-in output into its exact workspace path**

Use non-destructive versioned filenames. Do not overwrite `icons-navigation-v04-source.png` or `icons-calibration.png`.

### Task 3: Validate candidate files

**Files:**
- Read: the three PNGs created in Task 2

- [x] **Step 1: Validate PNG dimensions, alpha, and visible bounds**

Run a Node.js `pngjs` inspection that prints each file's width, height, SHA-256, whether it contains at least one fully transparent pixel, and its nontransparent bounding box.

Expected for every candidate: valid PNG; square or near-square canvas; alpha present; nonempty visible bounds; no visible pixels clipped to any canvas edge.

- [x] **Step 2: Inspect all three candidates visually at original resolution**

Reject and regenerate only the affected candidate if it contains malformed paper, pseudo-text, stray fragments, broken transparency, a scenic base, or a silhouette too close to another navigation icon.

- [x] **Step 3: Inspect the candidates at 48 px CSS scale**

Confirm each still reads as a task/quest board and preserves one clear focal hierarchy. This is a preview check only, not a final 48 × 48 optical export.

### Task 4: Build the review comparison

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/task-board-variants-review.html`

- [x] **Step 1: Create one static comparison page**

The page must display A, B, and C at equal large scale and 48 px preview scale, with labels and descriptions in live HTML outside the images. Use the existing review page's navy/parchment presentation language and keep all images uncropped with nearest-neighbor rendering.

- [x] **Step 2: State the decision boundary in live HTML**

Include: `Selection preview only — no navigation source, calibration, runtime asset, or Icons family decision has changed.`

- [x] **Step 3: Open the comparison page in Codex**

Open:

```text
file:///D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/task-board-variants-review.html
```

Expected: all three candidates load, fit their cards, and remain visually distinct.

### Task 5: Record and verify the review-only work

**Files:**
- Modify: `.agents/devlog.md`
- Verify unchanged: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-manifest.json`
- Verify unchanged: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png`

- [x] **Step 1: Append a concise devlog entry**

Record the three candidate paths, their roles, the built-in ImageGen workflow, and that no candidate is selected or promoted.

- [x] **Step 2: Run repository-scope checks**

Run:

```powershell
git diff --check
git diff --name-only -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png
```

Expected: `git diff --check` exits successfully; the runtime-path command prints nothing.

- [x] **Step 3: Verify immutable review state**

Confirm the approved navigation source still hashes to `3e9284c6666723c1d58a437063cd823bfee62d5acfdf682eaf54d5123c618cea`, the main calibration hash still matches the manifest, and Icons remains `awaiting-calibration`.

No commit is included because the shared worktree already contains unrelated user-owned changes and this task did not authorize staging them.
