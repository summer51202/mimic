# Record-expense action icon design

**Status:** visual direction approved; master artwork pending review  
**Scope:** Page Visual Optimization Phase 1 — Icons family calibration only

## Purpose

Create the single cross-mode action icon for the live HTML action `記一筆支出`. It supports the authenticated app-shell quick action, the Home quick-expense entry, and context-specific expense-entry controls when later integration is approved. It does not identify a financial mode, transaction type, settlement, transfer, income, reimbursement, or status.

## Approved direction

Use direction A: a quill actively writing on one loose ledger page, with one small coin as a secondary expense cue.

- The loose page must not resemble the thick travel journal used by the approved Adventure Log navigation icon.
- The quill crosses the page diagonally and its nib visibly touches one newly written short mark.
- The coin sits at the lower right, occupies roughly 20% of the composition, and remains subordinate to the writing action.
- Reading order is `record` first and `expense` second. It must not read as payment, transfer, deposit, import, receipt approval, or reimbursement.

## Visual treatment

- Preserve the approved mimiku hand-drawn pixel language: stepped contours, irregular clusters, limited value ramps, slight crafted asymmetry, and no smoothed vector finish.
- Use the existing family materials and palette: warm paper and brown outlines, restrained gold for the coin, and a muted teal quill accent.
- Avoid glossy mobile-game lighting, airbrushed gradients, excessive micro-detail, or a generic plus badge.
- Keep the outer silhouette distinct from the approved wallet, overlapping receipts, open chest, travel journal, and Tasks board icons.

## Canvas and review evidence

- Author one transparent 192 px-class calibration master.
- Present a 48 × 48 nearest-neighbour optical preview and grayscale evidence beside the master.
- Show it beside the approved primary-navigation and Mode directions for family comparison.
- Keep fully transparent pixels RGB-clean in any deterministic export.
- The exact master and export hashes require explicit user approval before the Icons family status can change.

## Accessibility and product boundaries

- `記一筆支出` remains live HTML or an independent accessible name; the icon never supplies the only action label.
- The icon contains no amount, date, name, status, error, form label, or operational text.
- Offline and disabled behavior remain expressed by the control, not by changing the icon's accounting meaning.
- Personal, shared, and pooled routing rules remain unchanged.

## Phase boundary

This work creates review-only calibration material outside `web/public`. It does not modify runtime assets, the PWA manifest, service worker, product pages, or navigation components. Full-family production, runtime promotion, and Phase 2 page composition remain out of scope.

## Acceptance criteria

1. At master size, the quill nib clearly touches a newly written mark on a loose ledger page.
2. At 48 px and in grayscale, the page, quill, and subordinate coin remain separable.
3. The silhouette cannot be confused with the Adventure Log navigation icon or any approved Mode icon.
4. The result visibly belongs to the approved mimiku pixel-handdrawn icon family.
5. Review artifacts retain visible fallback and accessibility notes, and runtime-path diff remains empty.
