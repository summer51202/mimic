# B title size / spacing / brightness — v11

Date: 2026-10-07
Mode: built-in ImageGen. Selected parent: inlay-options-v10/B.png.
Status: visual concepts awaiting brightness choice; no selected-review replacement, Scenes approval or runtime promotion.

## Comparison

The geometry prompt targets approximately 15% smaller individual wooden letters, wider visible gaps, and 5–8% smaller overall word width at the existing upper-center anchor. These are generation targets, not verified deterministic percentages. B's local rock interlocking remains the intended junction treatment. The shared geometry image is also option 2; options 1 and 3 are lightness-only edit attempts from that same geometry anchor.

- 1 — Dark: intended roughly 70% of option 2's title illumination; quieter and more integrated with wall shadow.
- 2 — Medium: the common geometry anchor; readable wood and restrained brass.
- 3 — Lighter: intended roughly 120% of option 2's title illumination; clearer title, still no glow.

Brightness ratios are prompt targets, not measured export settings. Choose the visual result rather than treating the ratios as production values.

### 1-dark

![1-dark](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/b-title-size-spacing-v11/1-dark.png)

### 2-medium

![2-medium](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/b-title-size-spacing-v11/2-medium.png)

### 3-light

![3-light](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/b-title-size-spacing-v11/3-light.png)

## Self-review and limitations

The three full-scene images have been visually reviewed for title size, breathing room, correct MIMIC spelling, wood/brass identity and distinct brightness. Geometry remains visually comparable, not pixel-identical. Generated foreground texture, companion illumination and UI glyphs show incidental drift. These full-scene concepts must not replace approved character layers or live accessible text. After user choice, preserve original layers and integrate only the chosen title geometry/tone/junction treatment. No code/runtime was changed in this exploration.

## Exact submitted prompts

### 2-medium / common geometry

```text
Use case: precise-object-edit.
Asset type: preview concept, warm 2D pixel-art Landing title inlay.
Input image 1: edit target, selected B version with local rock interlocking.
Primary request: make the wooden letter glyphs of "MIMIC" slightly smaller, and increase the spacing between the FIVE individual letters. Retain B's rock/wood interlocking approach.
Typography geometry: shrink each letter's HEIGHT and WIDTH about 15 percent, preserving each letter's shape and aspect ratio. Re-space all five glyphs with clear modest breathing gaps (roughly 8–12 pixels at this full-image scale, visibly separated wood outlines). The entire word should be about 5–8 percent narrower than the input, NOT larger overall despite wider spacing. Keep the whole word horizontally centered on its current upper rock-face anchor. Keep its center vertically at the same position.
Identity lock: same playful handmade wooden M-I-M-I-C design; eyes on the first M, existing small heart detail in C; same brass straps and wood grain, no new typography. Exact text "MIMIC"; exactly FIVE letters, no extra letters.
Wall integration: locally refit only the shallow grooves and little rock lips immediately around the new smaller letters. Small short fissures clustered at letter contact points; preserve B's calm wall and local interlock, no enclosing stone frame, no deep hole, no large new cracks.
Tone: preserve the muted medium-dark wood/brass of input B. Ambient brightness comparable to surrounding rock. No bright gold shine, no glow, no translucent lettering.
STRICT region: only alter upper-center wall title and its immediate stone junction. Do NOT alter the foreground chest creature Mimiku (this is NOT the wordmark). All characters, campfire, map, props, scene lighting, ceiling bats, passages, Chinese text, login and dialogue/CTA remain as in input. Do not reduce Mimiku brightness. Preserve full input framing and pixel-cluster fineness. No smooth gradients, no painterly texture, no extra objects.
Output: one complete full scene, not a grid or collage. This is the common geometry anchor for a later controlled three-brightness comparison; do not make alternative designs.
```

### 1-dark

```text
Use case: lighting-weather.
Input image 1: edit target, the common B-refined smaller, wider-spaced wooden MIMIC title concept.
Primary request: alter ONLY the brightness of the five WOODEN TITLE LETTERS on the upper rear wall.
Strict geometry lock: exactly preserve this input's smaller letter shapes, widened gaps, current word center, exact glyph positions, and all existing local rock interlocking/lips/fissures/contact shadows. Exact word "MIMIC" (five letters M-I-M-I-C). Do not resize, re-space, move, redesign, or bend any glyph. Same wood grain and brass parts, first M eyes and last C heart, all pixel silhouettes.
Title material: keep warm walnut and muted brass material colors, original color relationships and stepped pixel-art texture. No glow, no translucency, no new highlight shapes.
Region boundary: edit only existing LETTER PIXELS in the upper-center wall. Absolutely do NOT change the foreground living treasure-chest companion Mimiku, its eyes/heart/brass or brightness. Do NOT modify wall, floor, cave light, all three adventurers, fire, map, props, bats, login, dialogue/Chinese text/CTA. Keep exact full framing and pixel-cluster appearance.
Output: one full composition, no collage, no labels or annotations.
Brightness level 1 / DARK: lower ALL title illumination to approximately 70% of this input, including brass, white eyes/teeth and red heart. The title nestles into rock-wall shadow, darker and quieter than level 2, but readable through silhouette; no crushed-black wood grain. Only change lightness of letters.
```

### 3-light

```text
Use case: lighting-weather.
Input image 1: edit target, the common B-refined smaller, wider-spaced wooden MIMIC title concept.
Primary request: alter ONLY the brightness of the five WOODEN TITLE LETTERS on the upper rear wall.
Strict geometry lock: exactly preserve this input's smaller letter shapes, widened gaps, current word center, exact glyph positions, and all existing local rock interlocking/lips/fissures/contact shadows. Exact word "MIMIC" (five letters M-I-M-I-C). Do not resize, re-space, move, redesign, or bend any glyph. Same wood grain and brass parts, first M eyes and last C heart, all pixel silhouettes.
Title material: keep warm walnut and muted brass material colors, original color relationships and stepped pixel-art texture. No glow, no translucency, no new highlight shapes.
Region boundary: edit only existing LETTER PIXELS in the upper-center wall. Absolutely do NOT change the foreground living treasure-chest companion Mimiku, its eyes/heart/brass or brightness. Do NOT modify wall, floor, cave light, all three adventurers, fire, map, props, bats, login, dialogue/Chinese text/CTA. Keep exact full framing and pixel-cluster appearance.
Output: one full composition, no collage, no labels or annotations.
Brightness level 3 / SLIGHTLY BRIGHTER: raise ALL title illumination to approximately 120% of this input (NOT emissive). More easily readable than level 2 but clearly below the campfire and foreground companion highlights. Warm bronze, not bright yellow gold; keep eyes/teeth warm off-white, not stark white. Only change lightness of letters.
```
