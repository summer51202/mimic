# Record-expense Action Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one review-only mimiku-style `記一筆支出` Action icon candidate, with a loose ledger page, deterministic 192 px master, 48 × 48 px and grayscale evidence, and no runtime asset changes.

**Architecture:** Generate one transparent high-resolution source from the approved Icons calibration and V11 style controls, then normalize it deterministically into a 192 × 192 review master with a small PNGJS composer. A dedicated static HTML page presents the master, optical evidence, family controls, exact hash, accessibility boundary, and an explicit awaiting-review state. Existing Gate A tests lock the review contract before the asset and page are added.

**Tech Stack:** ImageGen with local references, Node.js ESM, PNGJS, static HTML/CSS, Vitest, ESLint, PowerShell verification.

---

## File structure

- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/record-expense-action-v01-source.png` — untouched generative source retained for lineage.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-record-expense-action.mjs` — deterministic crop, nearest-neighbour resize, centring, and transparent-RGB cleanup.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png` — 192 × 192 transparent review master.
- Create `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/record-expense-action-review.html` — candidate, 48 px, grayscale, family controls, and review boundary.
- Modify `web/src/shared/brand/asset-style-gate.test.ts` — lock the candidate page and review evidence.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/icons-calibration-review.html` — link the Action checkpoint without approving the complete Icons family.
- Modify `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html` — expose the specialized review page.
- Modify `.agents/devlog.md` — record the review-only implementation and remaining Gate A gaps.

### Task 1: Lock the Action review contract

**Files:**
- Modify: `web/src/shared/brand/asset-style-gate.test.ts`

- [x] **Step 1: Add the review-page path**

Add beside the existing specialized review paths:

```ts
const recordExpenseActionReviewPath = path.resolve(
  path.dirname(reviewManifestPath),
  "record-expense-action-review.html",
);
```

- [x] **Step 2: Add a failing focused test**

Add inside `describe("page visual asset style gate", ...)`:

```ts
it("presents the record-expense Action candidate without promoting it to runtime", async () => {
  const html = await readFile(recordExpenseActionReviewPath, "utf8");

  expect(html).toContain('data-action="record-expense"');
  expect(html).toContain('data-decision="awaiting-review"');
  expect(html).toContain("record-expense-action-v01.png");
  expect(html).toContain('data-preview-size="48"');
  expect(html).toContain("data-grayscale-preview");
  expect(html).toContain("data-family-control");
  expect(html).toContain("記一筆支出");
  expect(html).toContain("live HTML");
  expect(html).toContain("no runtime asset changes");
});
```

- [x] **Step 3: Run the test and verify the intended failure**

Run:

```powershell
Set-Location D:\Project\mimic\web
npm test -- src/shared/brand/asset-style-gate.test.ts
```

Expected: FAIL because `record-expense-action-review.html` does not exist.

- [ ] **Step 4: Commit only the failing contract**

Deferred: the test file already contains adjacent uncommitted Phase 1 review work, so an isolated failing-test commit would mix scopes. The red test evidence was retained instead.

```powershell
git add -- web/src/shared/brand/asset-style-gate.test.ts
git commit -m "test(visual): lock record expense icon review"
```

### Task 2: Generate and normalize the approved A direction

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/record-expense-action-v01-source.png`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-record-expense-action.mjs`
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png`

- [x] **Step 1: Generate exactly one review source with the approved controls**

Use ImageGen with these local references:

```text
docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/icons-calibration.png
docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/wordmark-synthesis/wordmark-synthesis-v11.png
```

Use this prompt without introducing alternative concepts:

```text
Create one isolated square UI icon on a fully transparent background for the action “record one expense”. Preserve the supplied Mimic/Mimiku hand-drawn pixel-art family: stepped irregular contours, deliberate pixel clusters, limited warm material ramps, broken highlights, small crafted asymmetry, and no smooth vector finish. The main object is one loose warm-paper ledger page, not a thick book or travel journal. A muted teal feather quill crosses the page diagonally; its dark nib visibly touches one newly written short mark. Place one restrained gold coin at the lower-right, about 20 percent of the visible composition, clearly secondary to the act of writing. Keep a compact readable silhouette with generous transparent breathing room. Do not add a plus sign, arrow, hand, character, chest, wallet, overlapping receipts, board, scenery, text, numbers, currency symbols, glow, airbrush, 3D rendering, or glossy mobile-game lighting. Output one icon only, centered, with no frame and no background.
```

Save the untouched result as `samples/derivations/record-expense-action-v01-source.png`. Do not generate a second stylistic direction in this task.

- [x] **Step 2: Implement the deterministic composer**

Create `compose-record-expense-action.mjs` using the same repository and PNGJS resolution pattern as `compose-icons-calibration.mjs`. The implementation must:

```js
const outputSize = 192;
const contentSize = 168;
const alphaThreshold = 16;
```

1. Read the generated source.
2. Find the smallest bounds containing pixels with alpha at least `16`.
3. Resize those bounds with nearest-neighbour sampling to fit within `168 × 168` without changing aspect ratio.
4. Centre the result on a transparent `192 × 192` RGBA PNG.
5. Set RGB to zero wherever alpha is zero.
6. Write `samples/record-expense-action/record-expense-action-v01.png`.
7. Throw if the source has no visible pixels, the output is not 192 × 192, or the visible result touches the 8 px outer inspection margin.

- [x] **Step 3: Run the composer**

```powershell
Set-Location D:\Project\mimic
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-record-expense-action.mjs
```

Expected: exit code 0 and a 192 × 192 transparent PNG at the planned output path.

- [x] **Step 4: Inspect the master before building the review page**

Open the output at original resolution and verify:

- the nib touches a new written mark;
- the page is loose, not a travel journal;
- the coin remains near 20% and secondary;
- there is no accidental text, plus, arrow, scenery, or baked background;
- the family resemblance comes from pixel clusters and materials, not copied icon silhouettes.

If any check fails, revise the same approved A source direction; do not branch into B or C.

### Task 3: Build the review checkpoint and turn the test green

**Files:**
- Create: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/record-expense-action-review.html`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/icons-calibration-review.html`
- Modify: `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html`
- Modify: `.agents/devlog.md`

- [x] **Step 1: Compute the exact candidate hash**

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png
```

Expected: one 64-character lowercase value after normalizing case. Insert this exact value into the review-page provenance line; do not copy the existing Icons calibration hash.

- [x] **Step 2: Create the dedicated review page**

The page must contain one `<main>` with this review-state skeleton:

```html
<article data-action="record-expense" data-decision="awaiting-review">
  <h1>記一筆支出 · Action icon</h1>
  <p>A 方向精稿：羽毛筆正在單張帳頁寫入，小硬幣只作支出提示。</p>
  <img src="samples/record-expense-action/record-expense-action-v01.png"
       alt="羽毛筆在單張帳頁記錄支出，右下有一枚小硬幣" />
</article>
<figure data-preview-size="48">...</figure>
<figure data-grayscale-preview>...</figure>
<section data-family-control>...</section>
```

The full page must:

- render the master at 192 px with `image-rendering: pixelated`;
- render one true 48 px CSS preview and a second 48 px grayscale preview;
- show `samples/icons-calibration.png` as the approved navigation/Mode family control;
- include the exact SHA-256, source path, and `awaiting review` language;
- state that `記一筆支出` remains live HTML and the image contains no operational text;
- state `no runtime asset changes` and keep the complete Icons family awaiting calibration;
- remain responsive at 320, 390, 768, and 1440 widths.

- [x] **Step 3: Link the checkpoint without changing family approval**

In `icons-calibration-review.html`, add a live link to `record-expense-action-review.html` and describe it as `Action candidate awaiting review`. In `review-index.html`, add the same link near the Icons family status. Do not change `review-manifest.json` Icons decision from `awaiting-calibration` and do not add anything under `web/public`.

- [x] **Step 4: Append the implementation devlog entry**

Append this factual structure to `.agents/devlog.md`:

```markdown
## 2026-09-25 — Present record-expense Action icon A

**Task:** Produce the approved quill, loose-ledger-page, and subordinate-coin direction for user review.
**Scope:** Action source/master, deterministic composer, specialized review page, review links, and Gate A test.
**What changed:**
- Added one review-only 192 × 192 Action candidate with 48 px and grayscale evidence.
- Retained its generative source and recorded the deterministic master hash.
- Kept the complete Icons family awaiting calibration and changed no runtime path.
**Decisions:** The loose page distinguishes the action from the approved Adventure Log navigation icon; the coin remains secondary.
**Known gaps / follow-ups:** User visual approval, event/status icons, install/favicon, maskable evidence, and final complete-family optical exports remain pending.
```

- [x] **Step 5: Run the focused test and ESLint**

```powershell
Set-Location D:\Project\mimic\web
npm test -- src/shared/brand/asset-style-gate.test.ts
npx eslint src/shared/brand/asset-style-gate.test.ts
```

Expected: all focused tests pass and ESLint exits 0.

- [ ] **Step 6: Commit the review checkpoint only after it passes**

Deferred: the touched review/test files include earlier approved but uncommitted Phase 1 work. No mixed-scope commit is created before the user reviews this candidate.

```powershell
git add -- web/src/shared/brand/asset-style-gate.test.ts docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-record-expense-action.mjs docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/record-expense-action-v01-source.png docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/record-expense-action/record-expense-action-v01.png docs/design/assets/reviews/2026-09-18-page-visual-phase-1/record-expense-action-review.html docs/design/assets/reviews/2026-09-18-page-visual-phase-1/icons-calibration-review.html docs/design/assets/reviews/2026-09-18-page-visual-phase-1/review-index.html .agents/devlog.md
git commit -m "art(review): present record expense action icon"
```

Do not stage `.codex-remote-attachments/`, `reference/`, `.superpowers/`, or unrelated dirty files.

### Task 4: Verify scope and stop at the visual checkpoint

**Files:**
- Verify only; no new implementation file.

- [x] **Step 1: Verify formatting and runtime isolation**

```powershell
Set-Location D:\Project\mimic
git diff --check HEAD^..HEAD
git diff --name-only HEAD^..HEAD -- web/public web/src/app web/src/features web/src/shared/ui web/src/shared/navigation web/src/styles icon.png
```

Expected: `git diff --check` exits 0 and the runtime-path command prints nothing.

- [x] **Step 2: Verify the exact PNG contract**

Run a small Node/PNGJS read of the master and assert:

```text
width = 192
height = 192
at least one alpha value = 0
no fully transparent pixel has non-zero RGB
SHA-256 = the value printed on the review page
```

- [x] **Step 3: Inspect the review page visually**

Open `record-expense-action-review.html` and check the master, 48 px, grayscale, and family-control blocks at desktop and phone widths. Confirm no crop overflow, smoothing, broken image, or false approved state.

- [x] **Step 4: Stop for explicit user review**

Present the page and the exact hash. Ask the user to approve, revise, or reject the candidate. Do not mark the Action sub-family approved, update the Icons manifest decision, generate event/status icons, or begin runtime promotion until the user responds.
