# Page Visual Phase 1 Decision Log

**Design baseline:** `a157a83`
**Implementation plan:** `20a6696`
**Immutable `icon.png` SHA-256:** `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`

## Mandatory stop gates

- **Gate A — calibration:** Stop after presenting one review-only sample for each family. No complete family may be produced until the user explicitly approves that family's exact sample hash and accepts or revises its proposed staged filenames and canvas choices.
- **Gate B — complete-family QA:** Stop after presenting the complete staged families and QA packet. No page composition, runtime promotion, production-image replacement, Phase 2 planning implementation, or consumer integration may begin without separate explicit approval.

Changing a sample changes its hash, invalidates any prior approval, and returns the family to `awaiting-calibration`.

| Family | Sample SHA-256 | Decision | Requested correction | Decision date |
|---|---|---|---|---|
| wordmark | `4a9c037db30e1cfe69db702ab473efccc08f9278d93e6d167252c34f41b38f14` | awaiting recalibration | Earlier revisions rejected: even after reducing metal, the smooth high-resolution cartoon rendering did not match canonical Mimiku. Current replacement derives its stepped outlines, pixel clusters, limited ramps, wood, brass, teeth, and heart coin from the approved Mimiku master/model sources. | 2026-09-18 |
| icons |  |  |  |  |
| mimiku-states | `c09d051730df12848e8b142b425382da7cd6473bb4b456c10d4e91dff9f223c7` | awaiting recalibration | Lineage baseline accepted. Replacement reuses canonical Idle, Happy, Reminder, and Serious; derives Working, Concerned, record-ledger, and adventure-complete from the approved sources. Visual approval remains pending. | 2026-09-18 |
| avatar-classes |  |  |  |  |
| scenes |  |  |  |  |
| frames |  |  |  |  |
| props |  |  |  |  |
| motion |  |  |  |  |
