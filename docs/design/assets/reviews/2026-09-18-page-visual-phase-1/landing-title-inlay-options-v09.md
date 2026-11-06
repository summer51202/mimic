# Landing title inlay options — v09

Date: 2026-10-07
Mode: built-in ImageGen; precise-object-edit; three independent calls.
Status: preview-only exploration, awaiting user choice. No Scenes approval or runtime promotion.

## What this choice affects

Only the physical junction of the wooden MIMIC title and the warm natural rock wall. The design target retains v08 title size, upper-center placement, subdued colors and party/prop layout. These generated full-scene pictures are visual concepts, not byte-preserving replacements or production composites. ImageGen can re-render unrelated pixels and UI lettering; choosing a junction treatment does not approve those incidental differences. Final integration must preserve the existing live accessible wordmark and text, character sources and prop layers.

- A — Short thin fissures and individual shallow grooves. Quietest wall; inset effect is subtle.
- B — Local irregular rock lips partially interlock with letter edges. Stronger physical seating, but more stone detail.
- C — A shared irregular shallow recess. Strongest apparent depth; actual output reads more like a stone surround than intended and is the most visually prominent.

After reviewing the outputs, prefer A or A with a small amount of B's local interlocking. Do not accept C's near-continuous surround as a mandatory design feature.

## Images

### A — restrained fissures

![A](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/inlay-options-v09/A.png)

### B — local rock interlocking

![B](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/inlay-options-v09/B.png)

### C — shared shallow recess

![C](D:/Project/mimic/docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/inlay-options-v09/C.png)

## Verification and self-review

All three PNGs decode successfully. Selected review asset hashes still match the existing manifest; Scenes remains awaiting-calibration.

| Option | Size | SHA-256 |
| --- | --- | --- |
| A | 1670 × 942 | 6869ed09c745a7bf78ab0b38e33225cbc063d85229f2c326b5191edb1ca235e2 |
| B | 1668 × 943 | 3fc65f03e37f86f559367deb209e5cceff9a39987922c66cac1204a97e722936 |
| C | 1668 × 943 | 3c14c938ef1b9676818ff3890151902bba1a863fc978a16f315eb431ecb3da11 |

Self-Review Complete — reviewed all prompts, comparison notes and generated images. Important distinction fixed in documentation: these full-scene concepts are not byte-preserving layered exports and must not replace the live UI or existing scene layers. Remaining note: C's surround is more conspicuous than intended; this is explicitly presented as a trade-off, not approved art. No code, runtime asset, registry, PWA or production-page changes in this exploration.

## Exact submitted prompts

Edit target for each call: docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-war-room/previews/tone-title-v08-desktop.png.

### A

```text
Use case: precise-object-edit.
Asset type: preview-only Landing title/rock-wall integration variant, not a production asset.
Input image 1: edit target, the actual latest desktop review screenshot with the already subdued wooden MIMIC title.
Primary request: locally revise ONLY the natural rock surface immediately behind and around the title so the wooden letters feel physically inset into this rock wall, not floating in front of it.
Locked geometry: full input framing and aspect ratio, current title bounding box approximately x=40%..70%, y=16%..32%, same letter size, spacing, position, design, muted wood/brass colors, eyes and red heart details. Keep EXACT text "MIMIC" M-I-M-I-C. Do not redesign or convert the wooden letters into stone letters.
Style: match the existing fine handmade 2D side-scrolling pixel RPG art. Stepped pixel-cluster edges, short broken highlights, warm brown stone, restrained shadow. Avoid smooth curves, airbrushed gradients, photorealism, noisy speckle.
Invariants: everything outside the narrow title-wall area must remain visually identical. Keep the entire warrior, mage, ranger, Mimiku, map crate, campfire, wooden Start Adventure sign, torches, bats, left chest, floor, ceiling, passages, login control and lower dialogue panel unchanged. No new props, particles, glow, moss, symbols, hardware, stone plaque or hanging ropes. Do not brighten the logo. No changes to its proportions or location. All existing Chinese UI words remain unchanged, no new labels inside the picture.
Lighting: warm safe rest-room mood, campfire remains primary focal point. Stone recess is shallow and structurally sound, not a hole or damaged ruin.
Output: one full composition of the same scene, no collage, no letter labels, no crop.
Integration A — MINIMAL individual seating grooves. Each wooden letter sits just slightly inset in its own irregular shallow stone groove. Add only about four tiny hairline fissures, short stepped brown lines starting at contact points of letter corners and fading into the nearby rock. Add a tight local contact shadow with a restrained rock-colored lower edge. Almost all broad quiet rock face remains untouched. Cracks are subtle but visible at scene scale; no continuous outer border around the word.
```

### B

```text
Use case: precise-object-edit.
Asset type: preview-only Landing title/rock-wall integration variant, not a production asset.
Input image 1: edit target, the actual latest desktop review screenshot with the already subdued wooden MIMIC title.
Primary request: locally revise ONLY the natural rock surface immediately behind and around the title so the wooden letters feel physically inset into this rock wall, not floating in front of it.
Locked geometry: full input framing and aspect ratio, current title bounding box approximately x=40%..70%, y=16%..32%, same letter size, spacing, position, design, muted wood/brass colors, eyes and red heart details. Keep EXACT text "MIMIC" M-I-M-I-C. Do not redesign or convert the wooden letters into stone letters.
Style: match the existing fine handmade 2D side-scrolling pixel RPG art. Stepped pixel-cluster edges, short broken highlights, warm brown stone, restrained shadow. Avoid smooth curves, airbrushed gradients, photorealism, noisy speckle.
Invariants: everything outside the narrow title-wall area must remain visually identical. Keep the entire warrior, mage, ranger, Mimiku, map crate, campfire, wooden Start Adventure sign, torches, bats, left chest, floor, ceiling, passages, login control and lower dialogue panel unchanged. No new props, particles, glow, moss, symbols, hardware, stone plaque or hanging ropes. Do not brighten the logo. No changes to its proportions or location. All existing Chinese UI words remain unchanged, no new labels inside the picture.
Lighting: warm safe rest-room mood, campfire remains primary focal point. Stone recess is shallow and structurally sound, not a hole or damaged ruin.
Output: one full composition of the same scene, no collage, no letter labels, no crop.
Integration B — LOCAL ROCK INTERLOCK (preferred balance). Add shallow fitted recesses following portions of individual wooden letter silhouettes. A handful of irregular little stone lips at the lower-left/upper-right edges gently overlap ONLY the outermost wood outline, never covering the eyes, heart or readable letter bodies. Add five to seven short branching installation fissures, clustered at contact points rather than a spiderweb. Tight dark brown occlusion in narrow junctions, low-value rock rim below selected edges. Make the physical rock/wood interlocking distinctly visible while preserving calm open wall; no complete stone border or plaque.
```

### C

```text
Use case: precise-object-edit.
Asset type: preview-only Landing title/rock-wall integration variant, not a production asset.
Input image 1: edit target, the actual latest desktop review screenshot with the already subdued wooden MIMIC title.
Primary request: locally revise ONLY the natural rock surface immediately behind and around the title so the wooden letters feel physically inset into this rock wall, not floating in front of it.
Locked geometry: full input framing and aspect ratio, current title bounding box approximately x=40%..70%, y=16%..32%, same letter size, spacing, position, design, muted wood/brass colors, eyes and red heart details. Keep EXACT text "MIMIC" M-I-M-I-C. Do not redesign or convert the wooden letters into stone letters.
Style: match the existing fine handmade 2D side-scrolling pixel RPG art. Stepped pixel-cluster edges, short broken highlights, warm brown stone, restrained shadow. Avoid smooth curves, airbrushed gradients, photorealism, noisy speckle.
Invariants: everything outside the narrow title-wall area must remain visually identical. Keep the entire warrior, mage, ranger, Mimiku, map crate, campfire, wooden Start Adventure sign, torches, bats, left chest, floor, ceiling, passages, login control and lower dialogue panel unchanged. No new props, particles, glow, moss, symbols, hardware, stone plaque or hanging ropes. Do not brighten the logo. No changes to its proportions or location. All existing Chinese UI words remain unchanged, no new labels inside the picture.
Lighting: warm safe rest-room mood, campfire remains primary focal point. Stone recess is shallow and structurally sound, not a hole or damaged ruin.
Output: one full composition of the same scene, no collage, no letter labels, no crop.
Integration C — SHALLOW UNEVEN ROCK BED. Behind the whole wooden word form a slightly recessed, organically irregular area of the SAME continuous warm rock face, following the general rhythm of the word rather than a rectangular plaque. An interrupted rock lip below some letters and a low-contrast upper recess edge establish depth. A few short cracks fade into the neighboring rock from recess corners. More obvious inset depth than A or B, but still only shallow and low contrast. Avoid a continuous framed border, arch, separate stone block, black opening, heavy crumbling or radiating fractures.
```
