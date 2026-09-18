# Page Visual Phase 1 Asset Lineage Audit

**Audit scope:** Mimiku visual companion only  
**Design baseline:** `a157a83`  
**Audit date:** 2026-09-18  
**Gate state:** lineage baseline confirmed; source-constrained replacement is `awaiting-calibration`.

This audit restores the repository's existing Mimiku artwork as the visual
authority for Phase 1. A text prompt may describe semantics, but it may not
replace the established anatomy, proportions, palette, pixel density, facial
language, or hardware treatment.

## Canonical lineage

| Tier | Asset | Dimensions / format | SHA-256 | Lineage decision |
|---|---|---|---|---|
| immutable root master | `icon.png` | 1024 × 1024 RGBA | `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac` | `reuse`; never modify |
| immutable source copy | `docs/design/assets/sources/mimiku/mimiku-master.png` | 1024 × 1024 RGBA | `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac` | `reuse`; byte-identical to `icon.png` |
| character authority | `docs/design/assets/sources/mimiku/mimiku-model-sheet.png` | 1536 × 1024 RGB | `ce5a64f0109db010c87d3a4e3c0c5b90d4d818589394094541d145d38a383120` | `reuse` as anatomy, expression, palette, and proportion authority |
| state source | `docs/design/assets/sources/mimiku/mimiku-states.png` | 3072 × 512 RGBA | `3daaf12b2ec91f5e7bebdd515c3da0b0e462d2c6c956233f5c22910d8add54a2` | `reuse`; six ordered 512 × 512 state frames |
| marketing derivative | `web/public/brand/mimiku-hero.png` | 1672 × 941 RGB | `0f33212074c830100c6f11581938db0929a23abc58893889cde159448d8a43c1` | `reuse`; current public hero, not a state-generation master |

The root master and source copy have the same byte hash. The state sheet's six
frames correspond in order to idle, happy, thinking, reminder, serious, and
lost. Runtime files retain those silhouettes and expressions after the
repository's edge-connected neutral-background cleanup.

## Canonical runtime states

| Semantic state | Runtime asset | Dimensions | SHA-256 | Phase 1 treatment |
|---|---|---:|---|---|
| Idle | `web/public/pixel-ui/characters/mimiku-idle.png` | 512 × 512 | `1cc0e72cd73f12f8dbe75a00c2253aec08fd8a27e9ab92430be41ec958eeaea2` | `reuse` |
| Happy | `web/public/pixel-ui/characters/mimiku-happy.png` | 512 × 512 | `397431082776b3ec037c90b8bfd5a7c144a0dbc730f6b753c782b3836b6727f3` | `reuse` |
| Thinking | `web/public/pixel-ui/characters/mimiku-thinking.png` | 512 × 512 | `d9d60a813500188f95e0391192c34e3943d1dfda2983eb8228baaebb37907b3b` | `reuse` as reference for Working/guide extensions |
| Reminder | `web/public/pixel-ui/characters/mimiku-reminder.png` | 512 × 512 | `2fa3d8b6d27a08b4f98ddfd6f30786c9f0a4fd9757a5ad244c2c56f35484aaec` | `reuse` |
| Serious | `web/public/pixel-ui/characters/mimiku-serious.png` | 512 × 512 | `2c89947f952dd76aa55c5ddf1f79dc4a501c530458b10355a5214ff6c8d1a442` | `reuse` |
| Lost | `web/public/pixel-ui/characters/mimiku-lost.png` | 512 × 512 | `4d107876216acac17aa14c80e545e29700373ed5f6c9ac8ae52023991f4e5284` | `reuse` as reference for Concerned; do not imply blame |

Physical files keep state names. Consumer roles remain semantic aliases in
`web/src/shared/brand/pixel-ui-assets.ts`; page-specific copies must not be
reintroduced.

## Phase 1 extension rules

| Required Phase 1 item | Classification | Required source lineage |
|---|---|---|
| Idle | `reuse` | canonical runtime Idle without redrawing anatomy |
| Happy | `reuse` | canonical runtime Happy without redrawing anatomy |
| Reminder | `reuse` | canonical runtime Reminder without redrawing anatomy |
| Serious | `reuse` | canonical runtime Serious without redrawing anatomy |
| Working | `derive` | Thinking/model sheet; change only pose and task prop |
| Concerned | `derive` | Lost/model sheet; preserve gentle recovery semantics and avoid blame |
| Record-ledger action | `derive` | model sheet plus canonical Idle/Thinking proportions |
| Invitation/guide actions | `derive` | Reminder/Thinking plus the same chest silhouette |
| Settlement/pooled actions | `derive` | canonical anatomy; financial facts and labels remain live HTML |
| Adventure-complete action | `derive` | Happy plus a separate skippable action sequence |
| Any genuinely absent prop pose | `new` visual content, but source-constrained | image generation must include the master, model sheet, and relevant canonical state as references; no new anatomy |

`new` never means a new Mimiku design language. It means a missing pose or prop
whose character body remains source-derived.

## Rejected calibration evidence

| Asset | Hash | Decision | Evidence |
|---|---|---|---|
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/rejected/mimiku-states-calibration-1278f447.png` | `1278f447346866922f2ae7512dfdea52d52106ef5d01d704bc611ae4b118bbe2` | `rejected/superseded` | Independently generated from textual traits instead of being built from the canonical state frames; introduced a dark baked background despite the transparent review contract; mixed established states with unapproved action reinterpretations. |

The archived rejected file remains only as auditable review evidence. It is not an
approved visual reference, must not seed later image generation, and must not
be promoted to runtime or complete-family staging.

## Replacement calibration candidate

| Artifact | Dimensions | SHA-256 | Role |
|---|---:|---|---|
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/mimiku-derived-poses.png` | 2172 × 724 RGBA | `58ae3b608fa60527014abc4db858b57b5a07efe364fd30916702ec156f9bb8da` | Source-constrained Working, record-ledger, and adventure-complete derivations |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/derivations/mimiku-concerned-pose.png` | 1254 × 1254 RGBA | `8e633a8ce64dc36162eff875c702ec0d2ce6fb18e654c662ad3efb4fbf76ab6c` | Concerned derivative from canonical Lost/Idle references |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-mimiku-calibration.mjs` | deterministic script | n/a | Reuses canonical runtime pixels, removes export-edge artifacts, clears transparent RGB, and composes the review sheet |
| `docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/mimiku-states-calibration.png` | 1536 × 1024 RGBA | `c09d051730df12848e8b142b425382da7cd6473bb4b456c10d4e91dff9f223c7` | Current replacement candidate; `awaiting-calibration` |

Contact-sheet order is fixed. Row one is Idle (`reuse`), Working (`derive`),
Happy (`reuse`), Reminder (`reuse`). Row two is Serious (`reuse`), Concerned
(`derive`), record-ledger (`derive`), and adventure-complete (`derive`). No text
or operational/financial fact is baked into the image.

## Required comparison for the replacement sample

Before a replacement is eligible for review, its contact sheet must show:

1. the canonical model sheet and six runtime states as the fixed reference row;
2. reused states identified as unchanged;
3. Working and Concerned shown beside their Thinking/Lost source states;
4. action key poses shown beside the canonical state that supplies their body;
5. transparent navy and parchment composites generated by live review HTML;
6. exact source paths, output dimensions, alpha result, and SHA-256;
7. no baked labels, amounts, dates, names, statuses, or action text.

The lineage baseline was confirmed on 2026-09-18. Complete-family generation
remains blocked until the replacement calibration sample receives explicit
visual approval.
