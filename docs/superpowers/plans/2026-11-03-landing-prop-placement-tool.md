# Landing prop placement tool implementation plan

**Goal:** Deliver A from the approved 2026-11-02 design as a standalone review tool; stop for user coordinate JSON before any placement application.

**Architecture:** Follow the title tool's self-contained model/controller/render pattern in new `landing-prop-position.*`, `render-landing-prop-position-tool.mjs` and `compose-landing-prop-position.mjs` files. Reconstruct architecture-only backgrounds from verified sources; render unchanged actors and movable props as separate layers so all ground depths can be sorted. Inline browser functions support file URLs. No worktree, delegation, stage, commit, runtime promotion or changes to historical review artifacts.

**Tech:** Plain HTML/CSS/JavaScript, pngjs, Vitest, Playwright.

- [x] Add focused failing tests for source identity, anchor conversion, free placement, warnings, depth order, separate frames and deterministic output.
- [x] Implement exact integer logical coordinates with no placement clamp; record top-left origin and ground anchor, all eight v04 hashes and selected preview, source hashes, warning geometry and layer order in receipts. Reject non-finite coordinates.
- [x] Build backgrounds by the existing nearest-neighbour crop algorithm. Preserve decoration and title placement (376/100, 130/59); keep actors independently sorted. Use pressure sprite `e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c` at 85×35 / opacity .85. Initial positions reflect the latest review only, not new approvals.
- [x] Add frame/object selection, pointer capture drag, keyboard and button 1/10 px movement, explicit X/Y inputs, individual/all reset, eight-state chest preview, guides and clean preview. Disable hidden/error frames. Serialize clipboard writes across frames; report stale/rejected writes correctly.
- [x] Run focused Vitest, ESLint and typecheck, four-viewport Playwright with pointer, keyboard, hidden-frame, image-failure, clipboard and warning cases. Rebuild twice and compare bytes. Check all historical artifacts against the pre-task hash snapshot.
- [x] Self-review implementation, inspect rendered desktop/phone screenshots, append devlog and write verification report. Deliver tool entry; wait for user JSON without applying positions.

General warning geometry is review guidance: conservative axis-aligned face/prop rectangles and explicit floor bands are documented in the tool manifest, not new collision or runtime contracts. Warnings never constrain dragging, including pressure plate placement anywhere on the floor. Open-lid clearance is evaluated even when the closed sprite is selected.
