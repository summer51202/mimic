# mimic Brand and Visual System Design

## Objective

Rename the user-facing PairFund product to **mimic** and establish a production-ready pixel-art brand system based on the existing repository root asset `icon.png`.

The product uses a complete but controlled pixel world. Public and expressive moments may be richly game-like, while financial workflows preserve clarity, trust, accessibility, and accurate real-world language.

This specification complements `2026-07-22-pwa-core-product-design.md`. Where that document uses PairFund as the product name, the current user-facing name is mimic.

## Naming

- Product name: **mimic**
- Product styling: always lowercase in brand presentation
- Character name in Chinese: **咪咪庫**
- Character name in English and brand documentation: **Mimiku**
- Character name origin: an association with the Japanese pronunciation of `ミミック` (`mimikku`)
- Primary tagline: **一起存，一起花，一起在異世界探險吧!**

The product and character names are distinct. mimic is the service; Mimiku is its mascot and in-product companion.

## Brand Position

mimic turns shared finance into a cooperative adventure without disguising real financial consequences. The visual world is playful, but balances, expenses, permissions, settlements, and locked periods remain explicit and factual.

Mimiku is a mischievous adventure companion and shared-treasury guardian. The character celebrates progress, helps orient users, and gives personality to otherwise empty or transitional moments. Mimiku does not trivialize errors, debt, destructive actions, or settlement finality.

## Source Artwork

The repository root `icon.png` is the brand master reference. Its recognizable features must be preserved:

- pixel-art treasure chest creature
- dark navy pixel outlines
- warm wood and gold hardware
- expressive offset eyes and teeth
- gold coin with a red heart
- playful rather than threatening character

The source file must not be overwritten. Derived assets use separate, clearly named files and preserve the original for future reference.

Skulls and similar scene details from the source image are not required brand symbols. They may appear in optional fantasy artwork but must not dominate the product or routine financial screens.

## Visual Direction

The selected direction is a **controlled complete pixel world**.

Pixel intensity varies by context:

| Context | Pixel intensity | Treatment |
|---|---:|---|
| Public landing page and onboarding | 100% | Large Mimiku artwork, environments, pixel wordmark, expressive transitions |
| Invitations, empty states, and success | 80% | Medium character art and short sprite animation |
| Dashboard and fund summaries | 60% | Pixel framing, icons, small character moments, restrained scenery |
| Expenses, allocations, and settlements | 40% | Pixel styling around a modern, highly legible tool layout |
| Legal content and high-risk confirmation | 20% | Minimal character presence and direct, sober language |

All screens belong to the same visual world. Reduced intensity means less decoration, not a separate design system.

## Asset Strategy

Use a hybrid asset system:

- Raster pixel art and sprite sheets for Mimiku, environments, expressive states, and special illustrations
- CSS for responsive layout, borders, stepped shadows, controls, focus states, and reusable geometry
- SVG for charts, scalable data marks, and simple interface icons when a raster pixel asset would reduce clarity

This strategy retains authentic pixel character work while keeping the PWA responsive, accessible, and maintainable.

Pixel raster assets must be authored on a fixed grid, exported losslessly, rendered with nearest-neighbor behavior, and displayed at integer scale factors wherever practical. The interface must avoid blurred or interpolated character artwork.

## Identity System

### Marks

- Primary wordmark: lowercase `mimic` in a custom or selected readable pixel display style
- Primary lockup: Mimiku head or compact chest silhouette paired with the wordmark
- Compact mark: simplified Mimiku head suitable for small favicons and navigation
- PWA mark: simplified silhouette with safe padding for maskable crops

The full source illustration is not reduced directly into tiny icons because its teeth, eyes, coin, and hardware will lose clarity. Small assets require purpose-built simplification.

### Color Roles

- Deep ink navy: structure, navigation, outlines, and high-contrast text
- Coin gold: primary actions, progress, and important highlights
- Wood brown: character identity and limited decorative surfaces
- Heart red: the relationship symbol and destructive or critical emphasis where semantically appropriate
- Grass green: success, positive chart series, and environmental accents
- Sky blue: information, secondary chart series, and environmental accents
- Warm white: primary dense-data surface

The interface must not become a one-note brown or gold theme. Large data surfaces remain neutral, while the broader palette creates depth and category distinction.

### Typography

Use two coordinated typography roles:

- Pixel display type for the wordmark, short headings, compact labels, and selected high-impact numbers
- Modern sans-serif type with strong Traditional Chinese coverage for forms, transaction lists, instructions, errors, policies, and long text

Financial values use tabular figures. Pixel type is not used for long sentences, detailed errors, legal content, or dense tables.

## Public Hero

The first viewport presents:

- the lowercase `mimic` wordmark as a primary brand signal
- a large, recognizable Mimiku holding the heart coin
- the exact tagline `一起存，一起花，一起在異世界探險吧!`
- one high-emphasis primary action
- an immersive pixel environment that suggests a shared everyday adventure
- a visible hint of the next section on mobile and desktop viewports

The hero is full-bleed or unframed. It is not placed inside a decorative card and does not use a split text-card and image-card composition. The Mimiku artwork carries the scene.

## Product Interface

The interface combines a pixel brand layer with a modern operational layer.

The pixel brand layer includes:

- an 8-pixel-derived spacing rhythm
- crisp small-radius or stepped-corner frames
- restrained stepped shadows
- 16x16 and 24x24 icon grids
- Mimiku sprite animation and character feedback

The operational layer includes:

- responsive layouts
- stable dimensions for navigation, amount fields, tables, and controls
- clear information hierarchy
- readable Traditional Chinese typography
- aligned financial values
- conventional form, focus, error, loading, and disabled states

Pixel styling must never make a familiar control ambiguous. Buttons, links, checkboxes, menus, inputs, and destructive actions retain standard interaction semantics.

## Mimiku Character System

Create a consistent initial state set:

| State | Usage | Behavior |
|---|---|---|
| Idle | Dashboard and neutral assistance | Blink and subtle body movement |
| Happy | Successful creation and goal progress | Open chest and toss or present the heart coin |
| Thinking | Loading and split calculation | Eye movement and coin inspection |
| Reminder | Pending confirmation and invitations | Hold or bite a small notice sign |
| Serious | Settlement, deletion, and permission changes | Stop playful movement and adopt a focused expression |
| Lost | Empty states and not-found pages | Look around with a small number of scattered coins |

States are produced from a shared model sheet, grid, palette, outline weight, and proportions. They must not look like unrelated generated characters.

Motion uses short finite-frame sprite sequences. Essential information is never communicated only by animation. All motion supports `prefers-reduced-motion`, with a meaningful static frame as fallback.

## Voice and Copy

Mimiku's voice is curious, mischievous, encouraging, and concise.

- Routine success may use characterful copy, such as Mimiku storing a completed entry.
- Celebrations must be brief and must not block the next task.
- Errors state the problem and recovery action first; character voice is secondary.
- Amounts, settlement finality, deletion, permissions, legal terms, and privacy use direct language.
- Real expenses are never called damage, lost health, punishment, or other game abstractions.
- The fantasy-adventure framing appears primarily in marketing, onboarding, empty states, and light feedback.

## Rebrand Scope

Rename all user-facing brand surfaces:

- public pages, authentication, page titles, and visible product copy
- PWA `name`, `short_name`, manifest, favicon, install icons, and social preview metadata
- email, invitation, notification, and error-page branding
- new Next.js package metadata, environment examples, and operating documentation
- design tokens, character assets, and brand guidance
- the visible application name in the Flutter app during the migration observation period

Preserve stable internal and historical identifiers unless they enter a public surface:

- `/api/v1` routes and API contracts
- PostgreSQL schema, migrations, and table names
- NestJS domain module names
- existing internal Flutter types such as `DioPairFundApiClient`
- historical migrations, devlog entries, commits, and superseded design documents
- the repository directory name

New documentation uses mimic. Current core specifications may receive a short rename note. Historical documents are not rewritten wholesale, and Git history is not altered.

## Initial Asset Inventory

The first production asset set includes:

- lowercase mimic wordmark
- Mimiku model sheet and brand master derivatives
- six character-state sprite sequences and static fallbacks
- 192px and 512px PWA icons
- 192px and 512px maskable PWA icons
- favicon set
- public hero artwork
- social sharing artwork
- fund, contribution, expense, member, invitation, and settlement pixel icons
- reusable pixel borders, button treatments, notices, and loading feedback
- documented color, typography, spacing, and motion tokens

## Delivery Order

1. Finalize the naming, palette, typography, wordmark, and Mimiku model sheet.
2. Produce the public hero and validate the tagline and brand silhouette.
3. Build core responsive controls and navigation using the hybrid asset system.
4. Apply the system to the dashboard and one demanding financial workflow.
5. Produce Mimiku's supporting states and empty/success/reminder treatments.
6. Export and validate PWA icons, manifest art, favicon, and social sharing art.
7. Apply user-facing rename changes to the Flutter observation build and relevant current documentation.

## Validation

The implementation is accepted when:

- mimic, 咪咪庫/Mimiku, and the tagline are consistent across public entry points.
- The product remains usable from 320px phones through wide desktop layouts without overlap or clipping.
- Pixel artwork renders crisply at supported sizes and does not rely on fractional scaling.
- Dashboard, expense, allocation, and settlement tasks remain understandable without character animation.
- Keyboard navigation, visible focus, contrast, semantic controls, and reduced-motion behavior pass accessibility review.
- Lighthouse checks cover PWA behavior, performance, SEO, and accessibility.
- Current Chrome, Safari, and Edge phone and desktop viewports pass visual regression review.
- Generated or derived character assets match the approved model sheet and palette.
- The rename does not change NestJS accounting rules, API contracts, database behavior, audit logs, or settlement locking.

## Non-Goals

- renaming database entities or API routes solely for branding
- rewriting Git history or historical migration records
- replacing real financial terminology with game mechanics
- placing Mimiku on every card or screen
- using pixel fonts for dense operational content
- overwriting the original `icon.png`
- implementing the PWA or generating final production assets as part of this design document
