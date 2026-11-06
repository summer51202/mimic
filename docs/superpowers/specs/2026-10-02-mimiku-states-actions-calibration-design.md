# Mimiku States / Actions Calibration Design

**Date:** 2026-10-02  
**Status:** Design and exact-hash asset direction approved on 2026-10-02  
**Phase:** Page Visual Optimization Phase 1 — Asset Style Gate

## Purpose

Calibrate the Mimiku states/actions family without runtime promotion. Preserve exact canonical lineage for Idle, Happy, Reminder, and Serious, while repairing Working, Concerned, record-ledger, and adventure-complete so the eight-pose review family shares one recognizable anatomy, pixel density, material language, and semantic system.

## Selected approach: partial lineage repair

Do not regenerate the entire family. Four canonical states remain controlling pixel sources; only the four derived poses receive new ImageGen creative sources.

| Pose | Source policy | Semantic direction |
|---|---|---|
| Idle | Preserve canonical | Neutral attentive resting state |
| Working | New ImageGen source | Quietly reviewing or organizing an open ledger; quill ready but not touching the page |
| Happy | Preserve canonical | Warm success/positive acknowledgement |
| Reminder | Preserve canonical | Alert but friendly reminder, not alarm |
| Serious | Preserve canonical | Firm locked-period or consequential state, not anger |
| Concerned | New ImageGen source | Restrained concern and need for attention; no blame, disaster, or permanent-error cue |
| Record ledger key pose | New ImageGen source | Quill visibly touching the ledger page and actively writing; clearly more active than Working |
| Adventure complete key pose | New ImageGen source | Modest lifted-foot/forward celebratory posture and restrained sparkles; no reward currency, score, badge, or achievement imagery |

## Visual invariants

- Match the canonical Mimiku chest anatomy: wooden chest body, lid/eye housing, readable tooth row, deep mouth, brass bands and hardware, four feet, and heart coin.
- Preserve deep brown-black stepped outlines, warm wood, controlled brass/gold, cream teeth, and limited muted accent colors.
- Use deliberate pixel clusters, two-to-three-step material ramps, broken highlights, and slight hand-made asymmetry.
- Keep body proportions, eye size and placement, tooth rhythm, heart-coin scale, outline weight, and pixel density coherent across all eight poses.
- No smooth vector treatment, mobile-game gloss, excessive noise, text, amount, currency symbol, error mark, reward badge, or scene background.

## Semantic separation

Working and record-ledger must be distinguishable without captions. Working is a quieter review/preparation posture with the quill not touching the page. Record-ledger is an active writing pose with the quill tip on the page and the gaze/body directed toward the mark.

Serious and Concerned must also be distinguishable without captions. Serious is firm and consequential. Concerned is softer and recoverable: slightly drawn-in lid/eyes and at most restrained sweat, without anger, blame, cracks, danger, or data-loss imagery.

Adventure-complete communicates completion, not a financial or game reward. Sparkles and a modest lifted foot are allowed; extra treasure, coins, points, medals, fireworks, or achievement emblems are not.

## Sources and lineage

Every revised ImageGen source must reference:

- `docs/design/assets/sources/mimiku/mimiku-model-sheet.png`
- `docs/design/assets/sources/mimiku/mimiku-states.png`
- `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-calibration.png`

The existing derived-pose sheet and concerned source remain preserved as lineage/audit inputs and are not overwritten. New sources live under `samples/derivations/mimiku-states/`.

The four canonical states remain read-only inputs. ImageGen must not redraw them.

## Review outputs

Create eight transparent deterministic 512 × 512 review masters:

- `state-idle.png`
- `state-working.png`
- `state-happy.png`
- `state-reminder.png`
- `state-serious.png`
- `state-concerned.png`
- `action-record-ledger-key.png`
- `action-adventure-complete-key.png`

Create a deterministic 1536 × 1024 eight-cell calibration sheet with this fixed order:

- top row: Idle, Working, Happy, Reminder;
- bottom row: Serious, Concerned, Record ledger, Adventure complete.

The responsive review page presents all masters, the combined sheet, 128 px previews, grayscale previews, canonical controls, Working/Record-ledger comparison, Serious/Concerned comparison, live semantic labels, provenance, exact hashes, and explicit review/runtime boundaries.

## Contracts and verification

An independent Vitest contract verifies IDs/order, dimensions, alpha, transparent RGB, hashes, lineage policy, source provenance, and review content. A Playwright contract verifies image decoding, evidence counts, comparison sections, live boundaries, and no horizontal overflow at 320, 390, 768, and 1440 pixels.

Run deterministic rebuild verification, focused Vitest, scoped ESLint, typecheck, focused Playwright, PNG integrity checks, protected-path checks, and `git diff --check`. Apply repository `self-review` until no Critical or Important issues remain.

## Phase boundary

All outputs remain review-only under `docs/design/assets/reviews/`. Do not modify `web/public`, product runtime code, asset registries, the PWA manifest, service worker, or product pages. Do not create the full action sprite family, decide animation timing, approve the Mimiku family, approve Gate A, promote assets, or begin Phase 2.

Stop after opening the review page, reporting the eight exact master hashes and verification results, and requesting visual approval or revision.
