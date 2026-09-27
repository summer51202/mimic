# Event and Status Icon Family Design

**Status:** visual system approved; icon artwork pending review
**Scope:** Page Visual Optimization Phase 1 — Icons family calibration only

## Purpose

Create seven financial-event icons and two state icons that remain immediately understandable in transaction rows and task lists. The family prioritizes direct accounting objects, then applies the approved mimiku hand-drawn pixel materials and irregularity. Icons supplement live HTML labels and never define financial meaning by themselves.

## Approved visual system

Use the approved `direct accounting objects` system rather than narrative fantasy scenes.

- Each event depicts what happens to money and its accounting container.
- Mimiku identity comes from warm materials, stepped contours, limited ramps, broken highlights, and crafted asymmetry.
- Do not use abstract arrows, plus/minus signs, currency symbols, baked words, character scenes, or color as the only distinction.
- Each 48 px composition contains no more than two or three readable objects.

## Approved semantic mapping

| Asset | Meaning | Approved objects and composition | Must not imply |
|---|---|---|---|
| `event-expense` | A recorded expense fact | One paid expense slip with one spent coin placed outside its lower edge | The quick record action, a shared receipt stack, reimbursement, or income |
| `event-contribution` | Money added to a pooled fund | One coin above a common money pouch, partially crossing into its opening | Personal wallet ownership, expense payment, or automatic transfer |
| `event-reimbursement` | Repayment for a participant advance | One reimbursement slip beside one returned coin | A fund return, ordinary expense, or settlement transfer |
| `event-shortfall` | Available pooled money is insufficient | One visibly empty, cracked pouch with a single remaining coin | A blocked expense, account deletion, or data error |
| `event-return` | Remaining pooled money returned explicitly | One tilted common money pouch with one coin visibly outside its opening | Reimbursement, income, equal distribution, or automatic payout |
| `event-settlement` | Shared positions resolved through transfers | One balanced scale with two distinct coin stacks | Pooled contribution, universal balance, or locked state by itself |
| `event-correction` | A new signed correction in a later open period | One complete addendum page pinned beside an older ledger page; the old page stays visible | Erasing, overwriting, or reopening a settled record |
| `status-lock` | A period or record is temporarily or permanently immutable | One heavy brass padlock visibly fastening a period ledger page | Deletion, archive, or missing permission |
| `status-offline` | The client is offline and authoritative submission is unavailable | One extinguished signal lantern with visibly disconnected signal marks | Permanent failure, deleted data, or loss of a saved draft |

## Critical distinctions

### Contribution versus return

Do not use directional arrows. Contribution places the coin above the pouch opening with part of the coin entering it. Return tilts the pouch outward and places the coin beyond the opening. The pouch is the stable pooled-fund container in both icons; direction comes from posture and overlap.

### Reimbursement versus return

Reimbursement always includes a slip because it repays a documented participant advance. Return never includes a slip and always originates from the common pouch. This distinction remains visible in grayscale.

### Expense versus record-expense Action

`event-expense` is a completed fact and therefore uses a paid slip plus a spent coin. The approved Action icon shows a quill actively writing on a loose ledger page. The event icon must not reuse the quill or active-writing pose.

### Correction versus editing

The old ledger page remains complete and readable as a visual object. A separate addendum is pinned beside it, not overpainted, erased, crossed out, or reopened. This preserves the product invariant that settled periods are immutable and corrections are new signed records in a later period.

### Lock versus offline

Lock is a solid ledger-and-padlock silhouette. Offline is a lighter lantern-and-disconnected-signal silhouette. Neither state relies on red, gray, or disabled opacity to communicate its meaning.

## Visual treatment

- Author each direction from a transparent 192 px-class master.
- Keep the defining silhouette within roughly 70–80% of the square canvas and preserve transparent breathing room.
- Use deep brown-black outlines, warm parchment, restrained gold/brass, and small muted-teal accents where they improve separation.
- Use stepped edges, deliberate pixel clusters, two- or three-step material ramps, sparse broken highlights, and slight hand-made asymmetry.
- Avoid smooth vector curves, airbrushed gradients, glossy mobile-game lighting, scenic bases, micro-text, and dense decorative hardware.
- Event icons may retain moderate internal detail. `status-lock` and `status-offline` use thicker, simpler silhouettes for immediate status recognition.

## Review evidence

The review surface presents all nine directions at equal master scale and includes:

1. true 48 × 48 optical previews;
2. 48 × 48 grayscale previews;
3. the approved navigation, Mode, and record-expense Action controls on the same page;
4. live semantic labels and explicit accounting-boundary notes;
5. exact SHA-256 values for every deterministic review master;
6. responsive inspection at 320, 390, 768, and 1440 pixels.

## Accessibility and product boundaries

- Every future consumer retains a live event or status label, or an independent accessible name.
- Icons contain no amount, date, participant name, account name, status word, error message, or operation label.
- Personal, shared, and pooled accounting meanings remain separate.
- Settlement does not imply a universal balance. Contribution and return never participate in shared-position arithmetic.
- Lock never suggests that a settled record can be edited. Correction never changes the earlier locked fact.
- Offline remains draft-only and does not imply that authoritative submission occurred.

## Phase boundary

This work creates review-only calibration materials outside `web/public`. It does not modify the runtime asset registry, PWA manifest, service worker, product pages, transaction components, or task components. Full-family production, runtime promotion, and Phase 2 page composition remain out of scope.

## Acceptance criteria

1. Each icon is recognizable from silhouette and object relationship at 48 px without reading color.
2. Expense, contribution, reimbursement, return, settlement, and correction remain mutually distinguishable.
3. Shortfall, lock, and offline do not imply destructive data loss or permission failure.
4. Correction clearly depicts a new addendum rather than modification of the older ledger page.
5. The nine directions visibly belong to the approved mimiku pixel-handdrawn icon family without becoming miniature narrative scenes.
6. Review artifacts preserve exact hashes, live labels, fallback notes, and zero runtime-path changes.
