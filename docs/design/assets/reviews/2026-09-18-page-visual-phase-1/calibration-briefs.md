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

The approved Mode sub-family uses a wallet for Personal, overlapping receipts and coins for Shared, and an open coin chest for Pooled. These directions use V11-level high pixel density and are designed from detailed 192px-class hand-drawn pixel masters, then receive a later 48px optical export; they must not be coarse 16 × 16 or 32 × 32 glyphs enlarged. Preserve fine stepped contours, small clustered pixels, nuanced limited color ramps, broken highlights, restrained dithering, thin functional hardware, and hand-made irregularity while keeping the 48px silhouette legible.

The approved primary-navigation direction uses a simplified campfire for Base, a wooden travel journal and feather for Adventure Log, a visually balanced warrior-and-mage handshake for Adventurer Guild, selected candidate A's thick timber contract board with brass corners, layered notices, and a red wax seal for Tasks, and a repaired brass gear with wood center and iron hex nut for Settings. Brass uses clean three-step color ramps with sparse edge wear rather than noisy corrosion. Class contrast in the Guild icon comes from silhouette, material, and cuff construction; the mage robe has no repair patch.

The approved record-expense Action direction uses one loose ledger page with a muted teal quill visibly writing a new mark and one subordinate gold coin. Its 192 × 192 transparent review master, 48 px optical preview, and grayscale evidence are locked at SHA-256 `5f261384aa4e5748a932ed692bc5dfa3bedd30e0c0892c02571a73dc31567680`. It remains distinct from the Adventure Log journal and does not use a plus sign, arrow, amount, currency symbol, or operational text.

The approved Event / Status sub-family uses direct accounting objects: paid slip and spent coin for Expense; coin entering the common pouch for Contribution; reimbursement slip and returned coin for Reimbursement; empty cracked pouch and last coin for Shortfall; tilted common pouch and external coin for Return; balanced scale and two coin stacks for Settlement; preserved old ledger plus a separately pinned addendum for Correction; ledger-fastening brass padlock for Lock; and an extinguished signal lantern with disconnected signal marks for Offline. Approval applies to the exact nine 192 × 192 master hashes recorded in `event-status-icons.manifest.json`, including their presented true 48 × 48 optical exports and grayscale evidence. This sub-family approval does not promote the complete Icons family or any runtime asset.

The approved Install / Favicon direction deliberately uses one complete-character Mimiku master, including the heart coin, resized unchanged to 512, 192, 48, 32, and 16 pixels with nearest-neighbor sampling. This is an explicit user-approved Phase 1 exception: no small-size optical redraw, alternate crop, or object removal is introduced. Approval applies to the exact five hashes recorded in `install-favicon.manifest.json`; Maskable, runtime promotion, the complete Icons family, and Gate A remain pending.

The approved Maskable A direction uses a dedicated borderless complete-character composition on a deep navy field. Both eyes, the readable tooth row, the main chest silhouette, all four feet, and the complete heart coin remain visible, while the defining eyes, teeth, chest, and coin sit inside the centered 80% circular safe zone. Approval applies to ImageGen source SHA-256 `90b040d9c9073fc390f4e61a90562b9730fd974018cfff9d8a715dd7b2674952`, 512 master `7f9c937516e8bf30ef6ddbfbb0d513932bf317b82badfacafca557c22061c441`, and direct 192 nearest-neighbor derivative `834a3812fd56ef0803fcef33412cbbbfebcd6c3200203314d75299eff03859b8`; it does not alter the approved Install / Favicon artwork or promote any runtime asset.

The approved final Icons optical evidence normalizes the five Navigation directions, three Mode directions, and record-expense Action into transparent 192 × 192 review masters, then derives true 48 × 48 PNGs directly with nearest-neighbor sampling. The same page shows the nine previously approved Event / Status 48 px exports unchanged, so scale, density, and grayscale silhouette are reviewed across the complete eighteen-icon UI family. Approval applies to the exact nine master/export pairs recorded in `icon-optical-evidence.manifest.json`; the complete Icons calibration is approved, but no file is promoted to `web/public` and Gate A remains open for other families.

Reject cropped eyes, teeth, or chest silhouette in maskable safe zones; text baked into icons; mode icons distinguishable only by hue; navigation icons without matching visible labels in future consumers; coarse enlarged low-resolution pixels; or smooth vector/mobile-game rendering.

## Mimiku states and actions

Create one transparent 1536 × 1024 sheet with Idle, Working, Happy, Reminder, Serious, and Concerned silhouettes, one record-ledger key pose, and one separate adventure-completion key pose. Preserve chest anatomy, offset eyes, dark outline, wood panels, gold hardware, cream teeth, and heart coin. Serious and Concerned must differ through expression and posture without captions.

The approved partial-lineage-repair direction keeps canonical Idle, Happy, Reminder, and Serious as read-only controls and repairs Working, Concerned, record-ledger, and adventure-complete through ImageGen. Working is quiet review with the quill visibly suspended above the page; record-ledger keeps the nib and active ink stroke on the left page while a few restrained prior-entry marks remain visible on the right page. Concerned is restrained and recoverable, while adventure-complete uses a modest lifted step and limited sparkles rather than reward objects. Approval applies to the eight exact 512 × 512 master hashes and combined-sheet hash recorded in `mimiku-states-actions.manifest.json`, including the presented real 128 px previews, grayscale evidence, and semantic comparisons. No runtime promotion is authorized, and Gate A remains open for the remaining families.

Reject loss of approved anatomy; using Serious for recoverable offline/error states; a Concerned pose that blames the user; or collapsing routine Happy and adventure completion into one treatment.

## Avatar classes

Create one transparent 2048 × 1024 sheet with portrait and full-body idle directions for warrior, mage, ranger, rogue, cleric, bard, alchemist, and cartographer. Use readable cosmetic silhouettes consistent with the pixel-RPG family. Duplicate class selection remains valid. Include no crown, owner badge, rank, amount, role, or permission cue.

Reject permission or governance symbolism, identity conveyed only by class, tiny unreadable silhouettes, or fewer than all eight approved classes.

The approved review-only calibration fixes the order as warrior, mage, ranger, rogue, physician, bard, alchemist, and cartographer. It uses the approved per-character reference files under `samples/derivations/avatar-classes/references/`, with the warrior as the family anchor for apparent 2.25-head proportions, full-body scale, medium garment clusters, and shared baseline. Faces, hands, and identity tools may use finer pixel clusters than garment hems. The approved references control identity and silhouette; the transparent ImageGen sources control the complete full-body candidate. Deterministic evidence consists of 512 × 512 masters plus real 128 × 128 and 64 × 64 nearest-neighbor optical exports, with exact hashes recorded in `avatar-classes.manifest.json`. Approval applies only to those exact review hashes; these files do not authorize runtime promotion.

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
