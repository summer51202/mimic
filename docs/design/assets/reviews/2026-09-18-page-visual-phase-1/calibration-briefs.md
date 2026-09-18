# Page Visual Phase 1 Calibration Briefs

**Baseline:** `a157a83`
**Palette authority:** `web/src/styles/tokens.css`
**Character authority:** `docs/design/assets/sources/mimiku/`
**Status:** Review-only samples awaiting Gate A

All raster samples contain no amount, date, name, status, error, form label, action label, or other operational copy. Current source/runtime assets are references only and are never edited in place. Calibration samples remain outside `web/public/`.

## Wordmark

Create one transparent 1200 × 400 calibration sheet showing a static uppercase `MIMIC` display arrangement and a compact-size optical inset. Letters are mismatched wood and metal pieces recovered from Mimiku: subtle differences in height, width, angle, board shape, wear, and hardware. Mimiku's asymmetric eyes sit inside the left half of the first `M`; wooden eyebrows frame them, the right eye is slightly higher, and pupils look gently outward without touching the sockets. The final `C` carries the mouth and heart-coin identity. No tagline or action text is present.

Reject symmetric or floating eyes, eye and mouth placement on the same letter, illegible `MIMI`, continuous pointer tracking, or a missing static fallback.

## Icons

Create one transparent 1024 × 1024 calibration sheet with the face/install direction optically previewed at 16, 32, 48, and 192 pixels plus a maskable safe-zone preview; one five-icon primary-navigation strip; and personal/shared/pooled mode samples whose silhouettes remain distinguishable in grayscale. Preserve the Mimiku face, teeth, chest outline, navy field, and gold border according to scale. No text is embedded.

Reject cropped eyes, teeth, or chest silhouette in maskable safe zones; text baked into icons; mode icons distinguishable only by hue; or navigation icons without matching visible labels in future consumers.

## Mimiku states and actions

Create one transparent 1536 × 1024 sheet with Idle, Working, Happy, Reminder, Serious, and Concerned silhouettes, one record-ledger key pose, and one separate adventure-completion key pose. Preserve chest anatomy, offset eyes, dark outline, wood panels, gold hardware, cream teeth, and heart coin. Serious and Concerned must differ through expression and posture without captions.

Reject loss of approved anatomy; using Serious for recoverable offline/error states; a Concerned pose that blames the user; or collapsing routine Happy and adventure completion into one treatment.

## Avatar classes

Create one transparent 2048 × 1024 sheet with portrait and full-body idle directions for warrior, mage, ranger, rogue, cleric, bard, alchemist, and cartographer. Use readable cosmetic silhouettes consistent with the pixel-RPG family. Duplicate class selection remains valid. Include no crown, owner badge, rank, amount, role, or permission cue.

Reject permission or governance symbolism, identity conveyed only by class, tiny unreadable silhouettes, or fewer than all eight approved classes.

## Scenes

Create one opaque 2048 × 1152 calibration image containing side-by-side scene crops: Landing's central cave with visible left/right passage interfaces, and Home's secret-base cave interior with a central campfire. Visually demonstrate separable foreground/background depth. Home is a lived-in interior, not an entrance or departure scene. No CTA, dialogue, recent-adventure data, label, amount, date, or fake balance appears in pixels.

Reject operational text, fake financial values, assumptions requiring document-level horizontal overflow, Home depicted as a cave entrance, or essential CTA/content embedded in the scene.

## Frames

Create one transparent 1536 × 1024 sheet showing parchment, wood, stone, dialogue, and notebook corners, edges, and center fills. Edges must visibly support repeatable 9-slice construction with generous empty interiors. Legal and financial reading surfaces remain quiet. Include no body copy.

Reject content padding below touch/readability needs, busy texture behind legal or financial body text, or a border that carries status without live text.

## Props

Create one transparent 1536 × 1024 sheet showing a torch, bats, pressure plate, harmless trap, ordinary treasure chest, hidden wall drawing, passage cue, and small personal/shared/pooled/task chapter cues. Landing prop production canvases will be selected at Gate A from 96 × 96, 128 × 128, 192 × 192, or 256 × 256 and recorded per asset. Props are environmental or semantic decoration, never rewards or financial state.

Reject reward coins or achievements, harmful trap framing, mode blending, or a prop that replaces a named button or live event label.

## Motion

Create one self-contained HTML calibration at a 1200 × 800 review viewport. Demonstrate an infrequent three-frame wordmark glance/blink, a 2–4-frame equivalent idle loop at 4–6 fps, a 4–6-frame equivalent action that plays once, a skippable one-time completion sequence, and a typewriter visual whose full sentence is separately available to assistive technology. Only one primary character animation may run at once.

Reject continuous pointer following, more than one primary character animation, delayed action/navigation, mandatory exploration, focus theft, repeated celebration, or reduced motion that removes the resulting state instead of showing it immediately.
