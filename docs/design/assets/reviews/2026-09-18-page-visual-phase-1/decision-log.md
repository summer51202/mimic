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
| wordmark | `e1dde795ca8873543d44cd7735477cc7766459790ecd10a8dac3eec1927a365e` | awaiting recalibration | Original sample rejected: heavy metal edging harmed distance and compact-size legibility. Revised to wood-led letter silhouettes with sparse secondary join hardware and both eyes in the first `M` left half; revised sample awaits review. | 2026-09-18 |
| icons |  |  |  |  |
| mimiku-states |  |  |  |  |
| avatar-classes |  |  |  |  |
| scenes |  |  |  |  |
| frames |  |  |  |  |
| props |  |  |  |  |
| motion |  |  |  |  |
