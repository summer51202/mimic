# Landing prop placement tool — verification, 2026-11-03

Scope: A and the attempt-06 “對 A 的影響” section of the approved design. Product delegation mode. Deliver a standalone tool and stop for user coordinate JSON. No coordinates have been applied to existing scenes, runtime or product files.

Entry: `landing-prop-position-review.html` (standalone local file), also served locally at `http://127.0.0.1:8765/landing-prop-position-review.html`. Mobile entry accepts `?frame=phone`. Refresh resets preview state; copy each frame's JSON before refreshing.

## Sources and behavior

- Pressure plate: approved attempt-06, 85×35, SHA-256 `e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c`, opacity 0.85. Initial preview origin (856,331) follows the appearance review, not a placement approval. Free placement throughout the frame; no right-passage restriction.
- Chest: approved v04, eight exact 104×120 sprite hashes pinned against the decision log. Ground anchor (144,350), offset (52,120), initial origin (92,230). Switching previews preserves ground. Open-lid clearance checked even while closed is selected.
- Desktop: chest, mapCrate, pressurePlate. Phone: mapCrate only, using its own 390×600 composition and 79×44 source. Frozen title origins remain 376/100 and 130/59.
- Architecture-only images are reconstructed using the original crop/nearest algorithm; unchanged decoration/title/actors remain separate exact-source layers. Actors and movable props sort by ground y with stable ID ties; sign text follows the sign's depth.
- Pointer capture dragging, keyboard 1/10 px, explicit 1/10 px direction buttons, X/Y entry, individual/frame reset, guides and clean preview. Hidden frames and failed/wrong-dimension images disable controls and receipts. Clipboard writes serialize across frames; stale success and rejected writes are reported accurately.
- Each receipt records frame, logical coordinates, anchor, origin, ground, preview, exact source/variant SHA-256, opacity, guidance geometry, fixed sources, depth/layer order and warnings. It is review-only and performs no persistence, filesystem writes or automatic approval.

## Verification

- Final focused Vitest: **18 passed / 3 files** (new tool and both historical title-tool suites). Broader asset contract run: **36 passed / 5 files**, including approved v04 and attempt-06. Final new-tool native-Node rebuild tests compare the four generated outputs across two builds and verify recorded hashes. Native Node is intentional: Vite transforms function source embedded into HTML.
- Final Playwright: **24 passed**, zero failed/skipped/flaky, at **320 / 390 / 768 / 1440**. Cases cover actual scaled dragging, keyboard/buttons/coordinate input, all eight chest previews, unchanged logical dimensions, y order, warnings, both resets, independent frames, hidden controls, image decode failure, clipboard stale/reject/rapid cross-frame writes, pointer-capture cancellation, empty coordinate validation and page overflow.
- Scoped ESLint passed for all four new ESM files with recommended JavaScript/browser/Node rules, and for the new TypeScript tests/config with the Web ESLint config. Web `tsc --noEmit` passed. Full Web lint initially raced Playwright's temporary output directory; final scoped checks avoid that irrelevant directory. No production build or full product test suite was required for this standalone review-only change.
- Visually inspected desktop clean preview, phone guides and 320px variants. On-screen sprite dimensions are asserted within 0.03 CSS px of their logical size multiplied by frame scale.
- Pre-task snapshot: **878 existing review files** remain byte-identical; `.agents/devlog.md` is append-only with its original prefix retained. Existing sources, old title tool/output, review index/registry, approval logs and previous pressure/chest reviews remain unchanged. No worktree, subagent, stage or commit was used.

Re-run:

```powershell
# Repository root
node docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-prop-position.mjs

# web/
npm test -- src/shared/brand/landing-prop-positioning.test.ts src/shared/brand/landing-title-positioning.test.ts src/shared/brand/landing-mobile-title-positioning.test.ts
npx playwright test --config=landing-prop-position.playwright.config.ts
npx eslint src/shared/brand/landing-prop-positioning.test.ts e2e/landing-prop-position-review.spec.ts landing-prop-position.playwright.config.ts
npm run typecheck
```

## Self-review complete

Changes reviewed: all new model/controller/composer/renderer functions and test/config sections, source and output provenance, representative browser evidence, and scope preservation.

Issues found and fixed:

- Generic 44px button minimum height stretched small sprites and made the 320px pressure plate overlap the dialogue. Sprite buttons now explicitly use zero minimum dimensions; all logical dimensions and actual dragging are regression-tested at every viewport.
- Sign text previously sat above every prop independently of its sign. It now follows the sign's y depth, with a browser regression assertion.
- Desktop speaker/text layout drifted from the original dialogue. Restored its original two-line structure and retained the original dialogue dimensions.

Remaining notes: warnings deliberately use conservative rectangular source bounds, manually documented face rectangles and approximate floor bands; they are review guidance, not pixel collision detection. No warning blocks placement. Very low plate/floor contrast is the accepted attempt-06 artwork limitation. User placement and overall scene approval remain pending.

Verdict: **CLEAN — no critical or important implementation issues remain.** Stop here and wait for user JSON; placement application belongs to a separate round.
