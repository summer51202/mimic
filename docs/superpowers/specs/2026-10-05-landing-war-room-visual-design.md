# Landing war room visual design

**Date:** 2026-10-05
**Status:** Visual direction agreed in conversation; written-spec review pending
**Scope:** Page Visual Optimization Phase 1, Scenes family, Landing composition and its adventure-record continuation. This document defines the visual brief for review assets. It does not approve the Scenes family or authorize runtime promotion.

## Relationship to the existing design

This refines the Landing section of [the page visual optimization design](2026-09-14-page-visual-optimization-design.md). Its public-page purpose, optional exploration, always-available CTA, accessible live text, horizontal continuation, and four below-the-fold product chapters remain in force.

Two composition decisions supersede the earlier wording:

1. The pre-login Landing shows Mimiku with an initial resting party of warrior, mage, and ranger. It does not show a separate visitor avatar. The user's chosen avatar belongs in the authenticated Home secret base.
2. Landing is the party's temporary war room adapted from an old cave treasure room. Home is the user's personal secret base with Mimiku. The two rooms must have distinct ownership and lived-in cues even though both may contain a campfire.

The previously generated full-scene cave options are exploration references, not approved masters. Their bridge, waterfall, flags, hearts, repeated glyphs, and miscellaneous props carry no requirement into this design.

## Purpose and reading order

The first viewport should feel like arriving during the party's quiet rest before an adventure. Mimiku's presence is reassuring; no character poses as though waiting for a command. A visitor can understand the entrance and scroll to product information without exploring the room.

The visual reading order is: campfire and party; small Start Adventure sign; map on a low crate; the adapted room; then optional discoveries at the sides and ceiling. The central party has priority over cave depth, treasure, and effects.

## Room architecture

The room is a modest, enclosed space inside a cave. Natural rock forms most of its shell. Partial old masonry, a stone entrance, worn floor sections, and one ordinary treasure chest explain its earlier use. The party has cleared the center and brought in a few portable supplies. The space looks safe and maintained, not ruined or lavish.

- A low, visible ceiling rises slightly above the central campfire and slopes down toward the sides. Only a few short cave formations break its silhouette.
- The left edge is a frequently used old stone entrance with subdued warm light, partial steps or a turn, and signs of foot traffic. An ordinary closed chest sits nearby without blocking passage.
- The right edge is a more natural, less explored passage. Its old pressure plate sits near the entrance and reads as a harmless remnant, not an active threat.
- Both passages continue beyond the initial viewport. The central room can be the only released region, but its edge geometry and lighting must support later horizontal extensions.
- The left and right sides have different forms and prop rhythms. Mirrored arches, posts, torches, and rock clusters are not acceptable.

The room retains low treasure density: one clearly visible ordinary chest, a few empty architectural traces, and no floor of coins, gem piles, reward glow, or rows of chests. The ordinary chest has wood planks, iron bands, hinge and lock plate; it has no eyes, mouth, teeth, face, or Mimiku-like motion.

## Central party and objects

A small stone-ring campfire is the primary light and the visual center, slightly toward the foreground. The four characters form a loose diagonal group with visible gaps between silhouettes:

| Character | Position and resting pose | Nearby belonging |
| --- | --- | --- |
| Warrior | Left foreground, seated on a low crate or flat stone, relaxed toward the fire | Shield leaned outward; sheathed sword |
| Mage | Left background, seated near but not covering the map | Resting staff and one closed notebook |
| Mimiku | Right foreground, naturally settled at a safe distance from the fire, angled toward the party | No added coin pile |
| Ranger | Right background, seated near the natural passage, one leg bent | Bow, quiver, one small travel bag |

The characters do not form an even semicircle or look at the visitor together. Their original approved forms, proportions, identity colors, and pixel-cluster character should remain recognizable. The initial state is rest, not a formal briefing or combat alert.

The party map lies on a low repurposed crate behind and left of the fire, with clear floor separation from the flames. Its few route and terrain marks are illustrative, not legible words, numbers, currency marks, or UI icons. It is a sign that planning happens here; no one must actively point at it in the opening frame.

A small hand-built wooden Start Adventure sign stands at the right-front edge of the campfire group, facing the visitor without obscuring Mimiku. Its letters are live HTML over a separately rendered sign, never baked into raster pixels. The sign must still be legible when the dialogue overlay is present.

Only belongings needed to explain the party's rest belong in the central area. Do not fill gaps with arbitrary barrels, bottles, crates, flags, loose ropes, or scattered loot.

## Discoveries and secondary objects

- Two wall torches provide weaker, asymmetric pools of light. One helps reveal the old wall markings; the other outlines a passage. Brackets and local soot explain their attachment and use.
- Three bats hang at rest in one darker ceiling area, with uneven spacing and closed wings. They do not hover above the party or read as attackers.
- One old wall-carving area contains incomplete unknown markings and a subtle, incomplete shape reminiscent of Mimiku. It is distinct from the party's physical route map and does not use a second treasure-map motif.
- One old rectangular pressure plate is fitted into the floor near the right passage. Its seam, worn edge, and a small visible mechanical clearance provide legibility. It has no heart, arrow, skull, warning sign, or glowing symbol.

These are visual identities and placements. The previously approved optional-discovery principle remains. Specific responses for the party, fire, torches, bats, chest, carving, and plate will be resolved in a separate interaction pass. The user's proposed fire-to-journal scroll, torch extinguishing, and bat departure belong to that pass. No discovery awards currency, achievements, or financial effects.

## Light, color, and material

The campfire is the only strong light. Its pale yellow core and warm gold/orange edges illuminate nearby faces, hands, and surfaces in stepped pixel color bands. Two wall torches only reveal local construction and passages. There are no large soft-focus halos or independent character spotlights.

The dominant palette is warm dark brown, charcoal, and muted purple-brown, with wood, leather, old stone, and restrained brass. Distant passages may contain small amounts of desaturated grey-blue or teal. Large saturated-blue cavern expanses are outside this direction. The room should feel dim, warm, and safe.

Detail follows a three-level hierarchy:

1. Highest: Mimiku, party, fire, low-crate map, and Start Adventure sign.
2. Medium: ordinary chest, torches, carving, pressure plate, bats, and essential equipment.
3. Low: ceiling, rear wall, distant passages, and broad floor.

Construction explains texture: rock bedding and cut faces, wood direction and joints, hinge and lock geometry, fabric folds, map corners, contact wear, and soot where heat reaches the wall. Avoid uniform speckle, repeated symbols, highlights on every stone, mirrored prop placements, smooth vector edges, or painterly gradients.

## Pixel-art production boundary

Use a 960 × 540 logical-pixel desktop review composition with a nearest-neighbor 2× review presentation. Compare its apparent pixel-cluster size and silhouette precision directly with the approved warrior and Mimiku masters; the numeric canvas alone does not establish a match. Separate review layers for architecture, fixed props, characters, ambient objects, and stepped lighting so each can be corrected without regenerating the whole composition. Creative raster sources may use ImageGen, followed by deterministic optical preparation and visual review. Do not replace approved character identities with newly improvised full-scene versions.

No text or controls are baked into scene images. The wordmark, sign lettering, dialogue, CTA, login/menu, chapter headings, body copy, and links remain live and accessible.

## First-viewport UI and responsive composition

The environment fills the viewport to the bottom; no plain dark rectangle is reserved within the image. A bottom RPG dialogue panel overlays the foreground. On desktop its approximate height is 18–22% of the viewport; phone composition may use about 25–30%, with a compact or collapsible state as needed. The panel cannot cover faces, the central fire, Mimiku, or the principal sign. Its initial Mimiku line is a short, relaxed invitation; product capabilities are explained in the following journal.

The `MIMIC` wordmark is visually integrated near the left old-stone lintel but remains a separate accessible element. A quiet, recognizable login/menu entry remains available. The primary live CTA stays visible in the dialogue area independent of horizontal scene position. Its existing destinations remain: authentication choice for an unauthenticated visitor, Home for an authenticated user.

Desktop initially shows the complete central party and partial side discoveries. Phone initially centers the entire fire-and-party group, map, and sign; the left and right discoveries come into view through horizontal exploration. Use the same separated visual assets with responsive positions rather than cropping a single desktop illustration. Phone/tablet movement, desktop drag/controls, keyboard access, normal vertical wheel scrolling, focusable named discoveries, and reduced-motion handling retain the existing product-design requirements.

## Adventure-record continuation

After the cave, the page becomes one continuous downward-reading adventure journal. It is live HTML with a restrained parchment treatment, readable text, and no simulated page-turn requirement. Four clearly separated chapters appear in this order:

1. Personal expense recording: a private ledger page and writing instrument.
2. Shared expenses and settlement: a shared bill and balanced settlement cue, without implying a pooled balance.
3. Pooled funds: a common pouch or fund chest and contribution record, without implying shared positions.
4. Tasks and companion workflow: a commission board or task cue with Mimiku-related guidance.

Each chapter contains a heading, concise product explanation, a small already-calibrated prop or icon where suitable, and a clear next step. Mimiku appears at the journal opening and closing CTA, not as a repeated illustration in every chapter. Desktop may alternate the location of chapter art; phone stays in a single reading column. Feature, Privacy, Terms, and footer links remain conventional and discoverable. The three accounting modes keep separate language and examples.

## Review acceptance and deferred work

Visual review should include the complete first viewport, the transition into the journal, a representative four-chapter view, and desktop/phone crops. Assess party completeness, natural poses, warm hierarchy, pixel-grain consistency, object construction, negative space, passage continuation, dialogue overlap, and whether Landing remains distinct from Home. Compare against approved warrior and Mimiku references at intended on-screen size.

This spec authorizes a review concept, not a production scene, runtime installation, Scenes-family approval, or a Phase 2 transition. Exact interaction responses, animation timing, full horizontal navigation behavior, journal copy, and final asset exports remain follow-up design and implementation decisions.
