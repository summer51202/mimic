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
| wordmark | `745eda3b5df02f9f7cf3e911a5f095c9fc16178892857a0b2d8d10379f42bd09` | approved | User approved the deterministic 1200 × 400 calibration derived from selected V11 source SHA-256 `d80f9ef5e4273d05ab8a61fe2da01cb4fc3ebfd68486eaef0157c86623c3b189` and accepted the staged canvases: 1536 × 512 display, 768 × 256 compact, and 4608 × 512 three-frame motion sheet. Approval applies only to the Wordmark family; complete-family production remains blocked until all eight Gate A families are approved. | 2026-09-23 |
| icons | `8ddfc1ffa00ee3c0a6466c73d14ec813da50256de271d9a1b63793882612720d` | approved | The five primary-navigation master directions are approved: campfire, travel journal, warrior/mage handshake, selected Tasks candidate A, and repaired gear. The four unchanged directions retain source SHA-256 `3e9284c6666723c1d58a437063cd823bfee62d5acfdf682eaf54d5123c618cea`; Tasks candidate A is selected at exact SHA-256 `3cb0cfd4d0b91e1e58f09ad69777dc72ce89944fc982a3c46c12817e68b72856`. The Mode sub-family directions are approved: Personal wallet, Shared overlapping receipts and coins, and Pooled open coin chest. The record-expense Action direction is approved at exact 192 × 192 master SHA-256 `5f261384aa4e5748a932ed692bc5dfa3bedd30e0c0892c02571a73dc31567680`. The Event / Status sub-family is approved at the exact hashes recorded in `event-status-icons.manifest.json`. Install / Favicon is approved as the explicit single-master Phase 1 exception at the exact hashes recorded in `install-favicon.manifest.json`. Maskable A is approved at ImageGen source SHA-256 `90b040d9c9073fc390f4e61a90562b9730fd974018cfff9d8a715dd7b2674952`, 512 master `7f9c937516e8bf30ef6ddbfbb0d513932bf317b82badfacafca557c22061c441`, and 192 derivative `834a3812fd56ef0803fcef33412cbbbfebcd6c3200203314d75299eff03859b8`. The final Navigation, Mode, and Action master/export pairs are approved at the exact hashes listed below and recorded in `icon-optical-evidence.manifest.json`. This completes Icons calibration only; Gate A remains open for the other families, and no staged complete family or runtime promotion is authorized. Earlier rejected hashes remain archived. | 2026-10-01 |
| mimiku-states | `eea15ebaff7ccb1f68f44cc7ea12b1484c73836fabf439bf7f639c37c55107f3` | approved | User approved the exact eight-pose partial lineage repair. Canonical Idle, Happy, Reminder, and Serious remain read-only controls; ImageGen repairs Working, Concerned, record-ledger, and adventure-complete. Record-ledger v03 preserves the original left-page writing contact and adds restrained prior-entry marks to the right page. Approval applies to the eight exact master hashes listed below; no runtime promotion is authorized. | 2026-10-02 |
| avatar-classes | `4f3cfacfbe20576390c26561025218b4c8dfe083ef921d27a11ecdd7fa2f2b59` | approved | User approved the eight exact 512 px master hashes listed below and their deterministic 128/64 px optical evidence. Approval is review-only and does not authorize runtime promotion, animation, or Phase 2. | 2026-10-04 |
| scenes | `81cffbf3430199b9bc33b4003670db850a2aa8b1fcf95a8965fa4675340dbbd0` | approved | User approved the layered Scenes calibration: Landing desktop (primary sample hash shown; closed/open scenes), Landing phone 1170 × 600 exploration strip 3R3, and Home secret base v02 desktop/phone, at the exact hashes in the sections "Approved Landing scene composition — 2026-11-04", "Approved Home secret base v02 — 2026-11-04" and "Approved Landing phone exploration strip and Scenes family — 2026-11-05". Staged file set: the layered set accepted on 2026-11-04 (spec `2026-11-04-scenes-staged-set-and-home-base-design.md` §1, phone strip per §3). Reusable/interactive objects belong to Props. No runtime promotion is authorized. | 2026-11-05 |
| frames | `51d1edf28c539c4a751b706dd0a435b6657345b69b828c81812d1387e2a07d6c` | approved | User approved Frames 2R: five ImageGen-drawn 9-slice masters (parchment, wood, warm stone, warm dark-brown dialogue, leather notebook), 52 × 52 logical px, 14 px slice, 2× display, CSS solid centres, at the exact hashes in "Approved Frames 2R — 2026-11-06" (sample hash shown is `samples/frames-2r/frames.json`). Staged set per spec `2026-11-06-frames-family-calibration-design.md` §1 and §2R. No runtime promotion is authorized. | 2026-11-06 |
| props | `bcee8473f6041f81bef4adf875980c8c98831665ebc937afacf7a3962b377bc6` | approved | User approved the Props calibration: Landing scene props already approved with Scenes (chest v04 frames desktop 156 × 180 and phone 110 × 126, torches, bats, map crate, sign, shared campfire), the four 256 × 256 feature chapter cues ("Approved feature chapter cues — 2026-11-05"), and the hidden wall carving v04 ("Approved wall carving v04 and Props family — 2026-11-06"; sample hash shown is the v04 manifest). Staged file set: the layered 1× desktop/phone set in spec `2026-11-05-props-family-calibration-design.md` §1; pressure plate, trap and passage cue removed. No runtime promotion is authorized. | 2026-11-06 |
| motion | `53c0ea3dd812b52b5e882d2b5031383e575e9c5c7a5ff47ba1b226658fb4f0a3` | approved | User approved Motion 2R (`motion-calibration-v02r-review.html`, manifest hash shown): wordmark glance/blink (3 frames, every 8–15 s, hover/tap once), Mimiku idle two-frame loop with a random blink every 3–6 s, record-ledger action (5 frames, once), completion celebration (6 frames of the approved happy pose with integer hops 0/2/3/1/0/0 px and existing sparkles, skippable, once per event, returns to Home idle), campfire 4-frame loop, chest v04 and carving v04 transitions, Frames 2R dialogue typewriter with single full-sentence announcement; one primary character animation at a time; reduced motion shows final states. See "Approved Motion 2R and Gate A complete — 2026-11-06". No runtime promotion is authorized. | 2026-11-06 |

### Approved Icons optical evidence — 2026-10-01

The user approved the review-only Navigation, Mode, and Action optical pairs presented in `icon-optical-evidence.manifest.json` at these exact hashes:

| Icon | 192 master SHA-256 | 48 px SHA-256 |
|---|---|---|
| `nav-home` | `505b173936d3e53db8296340d407fceaecf536d540dd8c50328f5ef5cfc7c484` | `eb52eed0cf5596a333b361d3cd140ee7b27084af2dad7d4f2a6bb931aabf2364` |
| `nav-adventure-log` | `3c54a3da83f5ca78a6b8fc98be65a1ffe473405411d2a49a966d490129c628a9` | `e5bbd136aa6fe35c731401fb103e1adcccf83114321bba144b6803c001da196c` |
| `nav-guild` | `71f47ff78db03efef93a60dfa89315a6eec3fc9e8607632d53f5bc89ce9d747c` | `98194202610f382fe1394077fa889b7b0aa5d573679c5ad30b8631c2dd2971dd` |
| `nav-tasks` | `500f3224eeedea2aedb958b4c352b21dc1e2f20b8164c518dfbe8f7ad1669862` | `928b10b5a834a23c60e9176aaaefbfc80d252a2dd2ee136fd1feaf09b87b465e` |
| `nav-settings` | `a0ce9c709543f6b9413a7b6c7fc31957892d1a3a0295485279f2311ada20aba6` | `df47c1d7c0c961cb659757e144c6137ac681e8eedbc7909e49133704df023cce` |
| `mode-personal` | `62a464651077244bde516ee393cf63a8a0abb1f141ca744b412afcdd28f883dc` | `59df5cbb970c5a1a4fcc3f8a3841e32821fea401c61ca90244a33ef53ce1548f` |
| `mode-shared` | `3d9c590bed13983072be5ed952b3e31fd4a31086af894ce25805e5356bbe0182` | `58e61510d5eb6bf453cf7244c0dfb23b0b89851f2d173bf6ce64d17395a1b7af` |
| `mode-pooled` | `9be450c6b06a2ac8dd27e284c13250ab2430b8ef21aa861b1d6ad1a4836b804c` | `f3a3b1704ddab90990eb3fddccc3d11a4f772009806e022a3634805ca0f83311` |
| `action-record-expense` | `5f261384aa4e5748a932ed692bc5dfa3bedd30e0c0892c02571a73dc31567680` | `8e559e179652c8b05b2e513e00cc9b5ef6cf3cec87011118ae7bdaf2b21ab0e3` |

This completes Icons calibration. Gate A remains open because the other asset families are not all approved; no staged complete family or runtime promotion is authorized.

### Approved Mimiku states and actions — 2026-10-02

The partial-lineage-repair candidate is presented in `mimiku-states-actions-review.html` at these exact review-only master hashes:

| Pose | 512 master SHA-256 |
|---|---|
| `state-idle` | `d94da31bbe9152ecb05c7464926a45b7b329dbbe55405ac9484ff25819a77e68` |
| `state-working` | `b6231d641e032ba3a7cfa856553ceeb9eca0f526a0375cb70df7cf0466988337` |
| `state-happy` | `1a350e5c6b9995c9ea5d8be5a1e73c2fcd8dc38646f08d08488b8446ef50d294` |
| `state-reminder` | `1a24a850d965fe97889a93e95250a4b463649686909c830f03040185990716dd` |
| `state-serious` | `08eb6a2ab5f54f17f252e8693dab2fd81415a370bba7c4a1665f325e3e141fdf` |
| `state-concerned` | `74abb07a02aab5eb23c5f69821eee7db5149c3fbfda2e7673682d6db9b1f746e` |
| `action-record-ledger-key` | `3e6f930e511404840007c0fc86a2230524b021102adbbb1b29bf8e23b4eed948` |
| `action-adventure-complete-key` | `27c528b461ca5c3cbbf72ac1568a248a11deed2c9c197832157e6d242e3ace54` |

Working and record-ledger are separated by visible quill-to-page contact; record-ledger v03 keeps the active left-page mark and adds three abstract right-page marks to communicate prior recorded content at 128 px. Serious and Concerned are separated by firmness versus restrained recoverable concern. These exact hashes are approved. Gate A remains open for the other families; complete-family production, runtime promotion, and Phase 2 remain blocked.

### Approved Avatar / Classes calibration — 2026-10-04

The approved review-only family is presented in `avatar-classes-review.html`. The approved character references remain identity and silhouette authority, while the eight transparent ImageGen sources provide complete full-body masters. The warrior anchors the apparent 2.25-head proportion, pixel-cluster density, and common baseline. Approval applies to these exact hashes.

| Character | 512 master SHA-256 |
|---|---|
| `warrior` | `cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447` |
| `mage` | `a1e8804d6b25d9eae0dedebb39805ac62c4ebf28c3bbf12eaa6c798fb603d08a` |
| `ranger` | `cd2e91826ef580f98272d3923f6e30375894e37f11989c62927605460a619c9a` |
| `rogue` | `a212dd57ddf7a18112e1421c5bb8e41a8a2aea8a6711fcee042c9b75a72377d3` |
| `physician` | `2c90a7ca884e9d99e4e519aa1ce938b78ce3f4a70f876da97afde9805011e598` |
| `bard` | `78cf180d9263145582fca6c0307f5192c17b7d9af1f5afd1af469f1b94e4c28b` |
| `alchemist` | `acacaeb4fb1f40a1fe0dedda21b9fc964a4459b377e6ebfd7d4d6d8f8c110dad` |
| `cartographer` | `2cd9e894cfdf4229ba4e7dc04b0e41ef330c08328015fdc9e5a5017a1aeb6ea5` |

Decision is `approved`. Gate A remains open for Scenes, Frames, Props, and Motion; complete-family production, runtime promotion, and Phase 2 remain blocked.

### Approved Landing treasure chest v04 — 2026-11-02

The user approved the ancient recovered treasure-chest family presented in `ancient-treasure-chest-v04-review.html` (manifest `ancient-treasure-chest-v04.manifest.json`, spec `docs/superpowers/specs/2026-11-02-landing-ancient-chest-v04-revision-design.md`). v03 is superseded and not approved. The v04 manifest is generated byte-identically by its composer and therefore still reads `awaiting-calibration`; this decision log is the approval authority.

Selected ImageGen source: `samples/derivations/treasure-chest-states-v04/family-source.png` (attempt-05), SHA-256 `494f26780f351601962c58630857fc21aea60dafa0a00c3bb3c31e7282eb45ca`. Approval applies to these exact 104 × 120 sprite hashes and the shared placement (origin 92/230, world ground 144/350):

| Frame | Sprite SHA-256 |
|---|---|
| `closed` | `1d3033feec912b2a8c3e8985949cccbbeadadcd02e6500999f3d7a1558d9a2bc` |
| `latch-release` | `3791787f5338599fc110b36c94e8b3b2534933d71c671d85ee7404b25d57cd86` |
| `unlatched` | `8babcc508cfdd3538fc6646631ce51658a48a3a8d0f66f7475f2e3927b4c8919` |
| `cracked` | `d81237e032d782965d5012ea69a37ec598dad888a534d6323ab4db442f430dc2` |
| `half-open` | `c353a103abea643bc643e148726b911b4af03d7b73a95b4f270752f5c264ee7c` |
| `opening-wide` | `f741d661b53ef9c00d593502c8507373a2e907ea6e6b704ef90745c7e2f24ae7` |
| `near-open` | `cb6e51044658405ce206bba76552ddabbfb7fdd9cf9c918b0ab87b5b0d4742ea` |
| `open` | `1da4b9c752012114db7256f928598628ccd222536e9a32112e8b938869712654` |

Independently re-measured 2× lid tops 116/116/116/114/106/98/86/78 (cracked→open steps 8/8/12/8, maximum 33%). The hasp no longer appears on the lid's inner face, and the single lower-left repair is identifiable in color, true grayscale and the desktop scene. Accepted known limitations: the two square nails are not legible at 1×, the hasp is barely visible in `half-open`/`opening-wide`, and edge highlights are slightly brighter than v03. Playback timing remains 750 ms opening / 660 ms closing.

This approves only the treasure-chest element. The Scenes row stays open until the remaining Landing elements (map crate, trap placement) and the whole scene are approved. Frames, Props and Motion remain open; no runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Approved Landing pressure plate attempt-06 — 2026-11-03

The user approved the floor-diamond pressure plate presented in `pressure-plate-attempt-06-review.html` (manifest `pressure-plate-attempt-06.manifest.json`, spec `docs/superpowers/specs/2026-11-02-landing-prop-placement-and-pressure-plate-design.md`, section "C 修訂 — attempt-06"). Attempts 01–05 are superseded and not approved. The manifest still reads `awaiting-calibration` because it is regenerated byte-identically; this decision log is the approval authority.

| Item | Value |
|---|---|
| Selected ImageGen source | `samples/derivations/pressure-plate-attempt-06/attempt-06-retry-04.png`, SHA-256 `f95a1a7b3db580c2baa1aeaf1bb7d2cd501674cb17ad7a5255e921aaf157abcc` |
| 85 × 35 sprite | SHA-256 `e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c` |
| Review placement | origin (856,331), centre (898,348), opacity 0.85 |
| Diamond slopes | −0.412 / +0.412 / +0.398 / −0.398 vs measured floor-tile 0.409 (ten tiles) |
| Colour | plate S 0.742, V delta +0.024 vs floor |
| Front gaps | lower-left 95.0 %, lower-right 97.4 % |

Accepted known limitation: low contrast against the floor (V delta near the 0.02 lower bound) makes the plate a subtle optional discovery; if it proves hard to find in the live page, address it with an interaction-state highlight in the Motion/interaction phase rather than redrawing. Position is not approved; it will be set with the prop-placement tool (A). Because the plate now follows the floor-tile grid, A does not restrict it to the right passage.

This approves only the pressure-plate element. The Scenes row stays open; Frames, Props and Motion remain open; no runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Landing pressure plate removed — 2026-11-03

After trying placements in the prop-placement tool (`landing-prop-position-review.html`), the user decided to drop the pressure plate as a Landing interactive prop. The plate layer is removed from the Landing scene on both desktop and phone; the placement application round must not include it.

- The 2026-11-03 attempt-06 approval above is withdrawn for use: the art and all attempts 01–06 remain archived as review history only and must not be promoted or reused without a new decision.
- This deviates from `docs/superpowers/specs/2026-09-14-page-visual-optimization-design.md`, which listed "pressure plate or trap" among the initial interactive objects. The remaining initial interactive set is torch, bats, treasure chest and hidden wall drawing; any replacement discovery needs a separate decision.
- Scenes, Frames, Props and Motion rows are unchanged by this entry.
- 2026-11-03 follow-up: the user chose to keep the four remaining discoveries (torch, bats, treasure chest, hidden wall drawing) without a replacement for now; revisit right-side emptiness after positions are applied to the whole scene.

### Approved Landing scene composition — 2026-11-04

The user visually approved the complete Landing scene presented in `landing-prop-placement-application-review.html` (manifest SHA-256 `8084940578e2409aae4c59ffea6adfc7ac17e416ca61367a205c1e85105e0e8c`, spec `docs/superpowers/specs/2026-11-03-landing-prop-placement-application-design.md`):

| Sample | SHA-256 |
|---|---|
| `samples/landing-prop-placement-application/desktop-closed.png` (960 × 540) | `81cffbf3430199b9bc33b4003670db850a2aa8b1fcf95a8965fa4675340dbbd0` |
| `samples/landing-prop-placement-application/desktop-open.png` (960 × 540) | `ce9b57b353f6231072bbf3cb7f27e99537d2d3dc11f4d7ae9434eca9f32b3bb2` |
| `samples/landing-prop-placement-application/phone.png` (390 × 600) | `e720726b610158555ad76b19772c2d49408c760785cf0707a2fa7227945505ec` |

Independently verified by review: chest 156 × 180 at ground (294,340), closed visible height 94; map crate 85 × 47 desktop (0.50 of chest) and 59 × 33 phone (same 0.746 scale); lid steps 6/6/8/7 (max 30 %); zero pixel differences against the v04 desktop scene outside the chest, crate and removed-plate regions; pressure plate absent; approved v04 104 × 120 sprite hashes unchanged. The warrior shield overlapping the chest's right edge is user-accepted. The 156 × 180 chest frames are new derivatives of the approved v04 source, recorded in the application manifest.

**Pending before this counts toward Gate A:** Codex's technical verification receipt (`landing-prop-placement-application-verification.md`) was not produced in the application round and must be added without changing outputs.

**Scenes row remains open** because Gate A requires (1) the Scenes calibration brief's Home secret-base interior alongside Landing, and (2) acceptance or revision of the Scenes staged file set. The planned set (single 2048 × 1152 background/foreground plus passage interfaces) no longer matches the approved layered Landing approach (architecture plus separate responsive actor/prop layers, desktop 960 × 540 and phone 390 × 600 logical frames), so it must be revised before approval. No runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Scenes staged set revised; phone exploration retained — 2026-11-04

- The user accepted the layered Scenes staged file set in `docs/superpowers/specs/2026-11-04-scenes-staged-set-and-home-base-design.md` §1, replacing the plan's single 2048 × 1152 background/foreground set: separate architecture, scene-specific actors and `layout.json` per page; independent desktop 960 × 540 and phone logical canvases; 1× logical masters scaled by integer runtime scaling; reusable/interactive objects (chest frames, map crate, sign, torches, bats, carving, campfire) move to the Props family staged set.
- The user chose to **retain phone horizontal exploration**. Landing phone architecture becomes a 1170 × 600 three-screen exploration strip whose centre third is byte-identical to the approved 390 × 600 phone scene (spec §3). Home stays a single 390 × 600 phone frame.
- Scenes row remains open until Home secret-base calibration (§2) and the Landing phone exploration strip (§3) are approved.

### Approved Home secret base v02 — 2026-11-04

The user approved the Home secret-base calibration presented in `home-base-v02-review.html` (manifest SHA-256 `35e1b6abfb065f9466f49c40805d5c0ab57254ac537ecbabe1d01878592da371`, spec `docs/superpowers/specs/2026-11-04-scenes-staged-set-and-home-base-design.md` §2 and §2R). Home v01 is superseded and not approved.

| Item | Desktop 960 × 540 | Phone 390 × 600 |
|---|---|---|
| Architecture | `2db9902425dfaff05cc38426c937acbef89113f8e30dd05635ca7ca8019c31cc` | `db69ee964a5fbc94a35518bf116f8aadc92b222306d39068d1baebf9b13a0567` |
| Mimiku idle layer | `804b4017687a1311d86b4ec18e512b2e5c6d3b6d0907c56f7dff44203575a6d0` (118 × 123, ground 672/384) | `c5b4aefba8f0d94f862b9d1e256197f54c9ea42ce3cb8b6225d87e5f3fe742dc` (96 × 100, ground 290/388) |
| Avatar slot (warrior shown) | `efa81386a83959915918a4893156e16bd49b07a54ff02fca60bb0bc91e9d6846` (107 × 149, ground 390/366) | `22d448346982dff9125a69beb28f48ab6e318059716f4431ed30c83c08d41f34` (85 × 119, ground 96/366) |

All eight class slots share one per-canvas master scale recorded in the manifest. Campfire and ground light reuse the approved Landing layers. Scale matches Landing (warrior head 44/35 px, Mimiku eye 16/13 px desktop/phone). Card zones pass the clutter metric against Landing.

Accepted decisions: the larger laid flagstones differ intentionally from Landing's cobbles (a cleared, maintained base floor); the optional blank-parchment wall element is **not** adopted (it was a hand-written SVG placeholder, not pixel art) — any future wall decoration goes through the Props family.

Scenes row remains open only for the Landing phone exploration strip (spec §3).

### Approved Landing phone exploration strip and Scenes family — 2026-11-05

The user approved the Landing phone exploration strip 3R3 (`landing-phone-exploration-3r3-review.html`, manifest SHA-256 `a933d9a6a2d667dbc92e489c01465cbe7e152771a019bf6f82486097a07d516e`) and, with it, the Scenes family for Gate A.

| Item | SHA-256 |
|---|---|
| `samples/landing-phone-exploration-3r3/phone-architecture.png` (1170 × 600) | `4cd2854e8673feb4b7ba61d5f6f8172f0bf200f475085ddda7a52f310ed0f7d4` |
| `samples/landing-phone-exploration-3r3/scene-closed.png` | `9823546bc9c4829e96879b0fd2dd345b47918f550790f4e26b674a582cb6b81f` |
| `samples/landing-phone-exploration-3r3/scene-open.png` | `a2dbc33ff05d2402435148fd6b05e0f95ae4fa1340503cbc96d9c94964bd469c` |
| `samples/landing-phone-exploration-3r3/layout.json` | `b105d090a90615a9d3f4b9f5e6e6a619c2d54014c0708ec626c86857ca142a71` |

- Placement from the user's receipt: phone chest 110 × 126 at ground (103,316) in the left third; torch (295,145); exploration bats (1028,58); centre layers at the approved phone coordinates +390; `initialViewportX` 390.
- Seam history: 3R inpainted the outer 24 px bands; 3R2 lifted luminance (including the approved centre's baked edge vignette, x 390–401 and 768–779, with user consent); 3R3 restored chroma in YCbCr with luminance fixed. Review measurements: seam floor saturation 0.69–0.83 vs references 0.73–0.84, luminance 65–71 vs 66–73; changes confined to x 378–401 and 768–791; centre interior unchanged.
- The standalone 390 × 600 phone scene (2026-11-04) stays as historical approval; the strip supersedes it for runtime.
- Gate A status: wordmark, icons, mimiku-states, avatar-classes and scenes approved; frames, props and motion open. `review-manifest.json` still lists the 2026-09-18 `scenes-calibration.png` sample and must be updated (with its contract tests) in a separate round; this decision log is the authority. No runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Approved feature chapter cues — 2026-11-05

The user approved the four 256 × 256 feature chapter cues from `props-calibration-v02-review.html` (manifest SHA-256 `af36437fbddd592e6c74160c3a6c7722b0b7e1f24770bd2bb49db955b65597a5`, spec `docs/superpowers/specs/2026-11-05-props-family-calibration-design.md` §3):

| Cue | SHA-256 |
|---|---|
| `samples/props-calibration-v02/feature/personal.png` (leather wallet) | `de254b9659f8512aa1da872135ed27518658f0fc33a39cee544eb673c14e5d93` |
| `samples/props-calibration-v02/feature/shared.png` (overlapping receipts, two coins) | `1f3a772a2e38c9a51622ed1b499c87f495c185c89992e51e01340a4dd841c808` |
| `samples/props-calibration-v02/feature/pooled.png` (iron strongbox with bedroll) | `e83cb6c67614bcac1527367ab6d5922ebfddc5386f325bb3a3768a0a6d26117a` |
| `samples/props-calibration-v02/feature/tasks.png` (adventure notice board) | `deb540084142ac4433c792ff6aed1017b04c71e64774628e6bc98aa52039eaa4` |

No readable text or figures; coins restrained; pooled strongbox is clearly distinct from the Landing chest and Mimiku. The wall carving from the same round is **not** approved (revision §2R). The Props row stays open until the wall carving is approved.

### Approved wall carving v04 and Props family — 2026-11-06

The user approved the hidden wall carving v04 (`props-calibration-v04-review.html`, manifest SHA-256 `bcee8473f6041f81bef4adf875980c8c98831665ebc937afacf7a3962b377bc6`, spec §2R2) and, with it, the Props family for Gate A.

| Asset | Placement | SHA-256 |
|---|---|---|
| `wall-carving-hidden-desktop.png` (72 × 48) | desktop (860,120), right-passage rock | `d174356f2f50d36fa7e96349beadde15b9f2c7c7d5ad2f031163e1bb7f689f7a` |
| `wall-carving-revealed-desktop.png` (72 × 48) | desktop (860,120) | `32e645f42cb747f61316ed5a02d741ab2af0b0540a94d3771300bc83c8e3e1e9` |
| `wall-carving-hidden-phone.png` (54 × 36) | phone strip (948,136), right third | `ce86f6aee400617cd87b095597a3b16da47aa3f59738e5ac4863317d8e0c4983` |
| `wall-carving-revealed-phone.png` (54 × 36) | phone strip (948,136) | `cd52162f95c2d851e9563f3ff9cbdbfd35e7a978107a44c725c8a78a470df4c9` |

Paths are under `samples/props-calibration-v04/`. Texture-relative ratios: hidden 1.97 / 1.94, revealed 6.52 / 6.51 (desktop / phone); revealed lit lip 8.6 / 14.1 and dark groove 14.0 / 16.4. Accepted limitation: the desktop visible carving is about 51 × 25 to stay on one rock face, so recognition after reveal relies on close viewing and the accompanying Mimiku line. The carving is a named interactive control in HTML; the hidden→revealed transition belongs to Motion.

Gate A status: wordmark, icons, mimiku-states, avatar-classes, scenes and props approved; frames and motion open. `review-manifest.json` still lists the 2026-09-18 samples for scenes and props and must be updated with its contract tests in a separate round. No runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Frames direction decisions — 2026-11-06

Before Frames calibration the user chose: (1) frame hardware in restrained brass and dark iron, matching chest v04 and the sign; bright gold only for emphasis on interactive elements such as the primary CTA; (2) the bottom dialogue box uses a warm dark brown field (about `#211a18`, brass edge about `#b79556`), not deep navy. This conflicts with runtime token `--mimic-color-hud-dark: #17213a`; Phase 1 does not change runtime, so the token update is deferred to the Phase 2 visual-foundation work. The frames staged set follows the 1× logical-pixel rule (spec `docs/superpowers/specs/2026-11-06-frames-family-calibration-design.md` §1).

### Approved Frames 2R — 2026-11-06

The user approved Frames 2R as presented in `frames-calibration-review.html` (SHA-256 `db70d13e4c7f8ff9040bc83aa8dfb7047cfed96560ef2f0510146aa2002b59d5`). The first, procedurally drawn 36 × 36 set is superseded and not approved.

| Master (`samples/frames-2r/`) | SHA-256 |
|---|---|
| `frame-parchment.png` | `27d44ad46645307efe957d18ea2fc5aaf4e13a0b49a8e573304faeea4761dfbe` |
| `frame-wood.png` | `edd8b03a8249471e32ebe9781f532fc31bc2515f990ae6eab267bdaf785e3f5e` |
| `frame-stone.png` | `b154133930b1ccc8bf9a9e0bb9560ba63b5c9fc5e4b0788480f679a0b5ca1811` |
| `frame-dialogue.png` | `a11877b039b95f9e51ba3a8a44c1511e24740164e062cc31e56e6f0db321139f` |
| `frame-notebook.png` | `cfbb8f907aab0312bac926f8ac945f2dc4345f92ba45a9e587195b05c8444370` |
| `frames.json` | `51d1edf28c539c4a751b706dd0a435b6657345b69b828c81812d1387e2a07d6c` |

Verified: text contrast (parchment body 12.44:1, warm stone 11.34:1, dialogue 13.66:1, notebook 11.98:1, CTA 7.55:1); 28 × 28 CSS px corners pixel-identical across 30 sizes; seamless edge repeats; CSS solid centres; padding 18 / 26 CSS px (phone / desktop); 44 px targets, focus, forced-colors, 200 % zoom and four viewports pass.

Accepted characteristics: the warm stone (mean S 0.72, V 0.55) and parchment edges are somewhat brighter and more saturated than the scene brickwork (S 0.60, V 0.41) and stand out on dark page backgrounds; edge repetition (~28 CSS px period) is visible on very wide frames. Wood matches the chest v04 timber (S 0.77/V 0.53 vs 0.76/0.52).

Gate A status: wordmark, icons, mimiku-states, avatar-classes, scenes, props and frames approved; **motion** remains. `review-manifest.json` still needs its scenes/props/frames samples synchronised with the Gate A contract tests in a separate round. No runtime promotion, `web/public` change, production export or Phase 2 is authorized.

### Approved Motion 2R and Gate A complete — 2026-11-06

The user approved Motion 2R (`motion-calibration-v02r-review.html`, SHA-256 `f85417e0d7807a9d56e2ecd592fdf12d1dd7476b1bbdff42dd615146ac682d39`; manifest `motion-calibration-v02r.manifest.json` SHA-256 `53c0ea3dd812b52b5e882d2b5031383e575e9c5c7a5ff47ba1b226658fb4f0a3`; spec `docs/superpowers/specs/2026-11-06-motion-family-calibration-design.md` incl. §2R). Motion v02 is superseded and not approved.

- Frame art was produced by ImageGen edits of approved masters, embedding only the action regions; all other pixels match the approved sources (title eyes, Mimiku idle lid/eyes, ledger quill/page, campfire flame). The approved title's Mimiku "C" has no separate eyes and stays unchanged.
- Revision history: v02 idle blinked every 0.6 s (blink frame inside the loop) → 2R two-frame loop with a random 3–6 s blink; v02 celebration had a static character → 2R hop; the first 2R mixed the adventure-complete key pose with the larger happy pose, causing a size jump → final 2R uses the happy pose for all six frames (visible size 120 × 123 constant, vertical offsets only) and returns to Home idle.
- Accepted characteristic: celebration sparkles are sparse because the larger happy pose covers part of the original sparkle regions.
- Verification: frame hashes/dimensions/transparent RGB, action-region-only changes, timeline tests with a controllable clock (title cadence, idle blink interval, once-only actions, de-duplication, button/Esc skip, typewriter completion, single DOM announcement, focus retention, pause, hidden-page pause, reduced motion), four viewports plus 1200 × 800, deterministic rebuild.

**Gate A is complete: all eight families (wordmark, icons, mimiku-states, avatar-classes, scenes, frames, props, motion) are approved**, and `review-manifest.json` has been synchronised by Codex for scenes, props, frames and motion review samples. Per the Phase 1 plan, the next stop is Gate B: produce the complete staged families under `docs/design/assets/approved/page-visual-v1/` using the accepted staged sets (as revised for Scenes, Props and Frames) and present the complete-family QA packet. Runtime promotion, `web/public` changes, page composition and Phase 2 remain blocked until Gate B is separately approved.

### Gate B plan decisions — 2026-11-09

The user chose to split Gate B into B1 (export already-approved assets with the production manifest and tests) and B2 (new art plus final QA), and to complete the four missing Mimiku actions (invitation, settlement, pooled-funds, guide) within Gate B after a calibration review. The fifth avatar class staged name follows the approved `physician`, replacing the plan's `cleric`. Spec: `docs/superpowers/specs/2026-11-09-gate-b-complete-families-design.md`.

### Wordmark staged canvas revision — 2026-11-09

B1 export showed excessive padding in the accepted wordmark canvases (compact 768 × 256 held a 240 × 70 wordmark, about 31 % of its width). The user accepted revising the wordmark staged canvases: display and compact are trimmed to the visible alpha bounds plus 8 px transparent padding on each side, with approved pixels unchanged; the B2 motion sheet uses the revised display canvas per frame. This replaces the 2026-09-23 canvas sizes (1536 × 512, 768 × 256, 4608 × 512).

### Gate B2-1 partial approval — 2026-11-09

The user reviewed the B2-1 candidates (`gate-b2-1/`). Approved for B2-2 export at these exact hashes (paths under `gate-b2-1/candidates/`):

| Candidate | SHA-256 |
|---|---|
| `mimic-wordmark-motion-sheet.png` | `b811c7473034d9691c978464d19943f043b91df6c85cf4e4ffd97c20f28cbedf` |
| `alchemist-full.png` | `2ff1210e1302b4215c0265b308272e774cb65580da8b27a206289a929185a265` |
| `bard-full.png` | `929b782c7991848e54661865db9a0b58bd28e956eb37694785333f04f4a15251` |
| `cartographer-full.png` | `5b4a182da4ef3e1e676b44216af8aca4c39c61b096bfe18727e13d01ba33b43e` |
| `mage-full.png` | `4ffa64b64a4bcf3f1264a41ec9d1b1e87ded7a34882bfababfd19b24cdadeecb` |
| `physician-full.png` | `01b3c812a23b03b4f464774d0a31ca2731b1689beae834a338a03ffd8c4ad339` |
| `ranger-full.png` | `e0d489c120d103ddcbc55e35bc95e88029edacb989ade618807740cd40fdf1c5` |
| `rogue-full.png` | `1e7097dac8acd53edcfba1d3d6e6859ee0bde75cb836d9ddb6b916fe68d4a4bf` |
| `warrior-full.png` | `4cccd41b0898d9cbede965e5dc8a99a84370ecd44272cb20456d8c6bb8ff29e6` |
| `alchemist-portrait.png` | `c1f7d49a6351cf9801ef2004dec5074946789c92e0d7cc07828dca0925fdd2cd` |
| `bard-portrait.png` | `ee04340ec755b4044843fa793df9cb58c13d2aa8dd96ac6bc9f5b08dfdfc8eb1` |
| `cartographer-portrait.png` | `a7a6f5ab7179d9ee81e1520e31c77b332bb523d4a1dcc767a5aa53448de0fe59` |
| `mage-portrait.png` | `91739634ce56fedd8b743f9f51916436980595c570177352e8db4c3ccd5c29c5` |
| `physician-portrait.png` | `942d625c7a4f08e40c304a4f00c236f7af05a56214033fd5b872205655319fca` |
| `ranger-portrait.png` | `3944c7b2130cc6120240595e335bc72f749e303b4f5c2177dc34a9e44b1e4750` |
| `rogue-portrait.png` | `e03044b55409fab1f8582bd7426d62bd4d438664b55561fe9c888bf473ee5559` |
| `warrior-portrait.png` | `61ec4f2b98511613f6918f0b1aec7cf5215d19352f35059088f2efbd8f83a45d` |
| `action-record-ledger.png` | `6d2da052a1417372cc4f924d5b215a1a5aa11940167bd1bf23e4e980d2905757` |
| `action-adventure-complete.png` | `2dbb28f9e5895183431e89569b0ca954cebdd18d833ec78ee2ea734061851ae4` |
| `action-settlement.png` | `6086bdc26a5fa1efebf995f9576f6de382a5b64c571b406c3481338b33d4740b` |

Not approved: `action-invitation`, `action-pooled-funds`, `action-guide`. All approved Mimiku masters have no hands; the candidates added white-glove cartoon hands (guide, pooled funds) or a floating card without a mechanism (invitation). The user decided Mimiku **keeps no hands**: actions use lid, mouth, eyes, body tilt/hop and floating objects only. Revision spec: `2026-11-09-gate-b-complete-families-design.md` §B2-1R.

### Gate B2-1R review — 2026-11-09

Approved for B2-2 export: `action-guide.png` (SHA-256 `982c7ad28cfbf4b8e14b2f279ac4c5f88ed6274ba15ae083c94f23dd656571af`; eyes look aside, body tilt and hop, no hands, mirrorable). Not yet approved: `action-invitation` (card reads as a thin plank at Home size) and `action-pooled-funds` (strongbox about 1/8 of Mimiku's height, coin drop does not read as carried by mouth, little lean). The handless constraint is satisfied in all three. The user requested one more revision of the two (spec §B2-1R2). The 20 earlier approvals are unchanged.

### Gate B2-1 complete — 2026-11-09

The user approved the B2-1R2 revisions:

| Candidate (`gate-b2-1/candidates/`) | SHA-256 |
|---|---|
| `action-invitation.png` (5 × 512) | `b3e25b96f8dcdf9d3b947986d8237118c7e222549da081ce7a4ae9ebf5644d92` |
| `action-pooled-funds.png` (5 × 512) | `78ec9f3f4c10a7560ec3fc572c6b9e587b7b4cf291b80f7aac66a46f3a886237` |

Invitation: parchment card with dark border and a plain red seal dot rises from the mouth and rests front-right (40 × 33 px at Home desktop size). Pooled funds: small heart coin held between the teeth, forward lean toward an iron strongbox matching `feature/pooled` (38–40 % of Mimiku's height), lid bounce, happy-eye return. Both are handless; Mimiku is uniformly scaled inside the 512 canvas to make room for props and is restored to approved size in Home. With guide and the 20 earlier approvals, all 23 B2-1 candidates are approved. Next: B2-2 export into `docs/design/assets/approved/page-visual-v1/` and final Gate B QA.
