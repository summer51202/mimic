# Visual Asset Hierarchy Design

**Date:** 2026-09-14  
**Status:** Approved for implementation planning  
**Scope:** Structural organization only; no visible redesign or image regeneration

## Goal

Establish one understandable, testable hierarchy for Mimic's visual assets before
optimizing individual screens. The hierarchy must separate editable sources from
browser-delivered files, remove byte-identical duplication, make each runtime
asset's purpose explicit, and preserve the current rendered appearance.

## Context

The current repository contains four overlapping asset systems:

- public Mimiku brand art under `web/public/brand/`;
- authenticated pixel UI art under `web/public/pixel-ui/`;
- PWA install icons under `web/public/icons/`;
- wireframes, mockups, and README artwork under `docs/`.

Six Mimiku files under `web/public/brand/` and `web/public/pixel-ui/` are
byte-identical but have different contextual names. Reference sheets are stored
inside `web/public/`, even though they are not intended for runtime use. The
older PairFund mockups also use a soft, rounded visual language that predates the
current Mimic pixel-fantasy direction.

This work is the structural portion of the earlier P0-P3 visual roadmap. It does
not include palette quantization, responsive art direction, scene decomposition,
new animation, or new state illustration.

## Design principles

1. **One binary, many semantic roles.** A visual may serve several states, but
   identical bytes must not be checked in under multiple runtime paths.
2. **Public means deliverable.** Only files that a browser, manifest, or service
   worker may request belong under `web/public/`.
3. **Sources remain lossless and immutable.** Source sheets and master references
   stay available for later exports without being exposed as runtime assets.
4. **State is expressed in code, not filenames alone.** Components consume a
   semantic asset registry instead of constructing paths or choosing files ad hoc.
5. **Structure changes before appearance.** Every moved or deduplicated asset must
   retain its current bytes and intended rendered dimensions.
6. **Financial information remains live HTML.** Amounts, dates, labels, errors,
   and statuses are never baked into images.

## Target hierarchy

### Layer 0: canonical masters and source sheets

Location: `docs/design/assets/sources/`

| Subdirectory | Responsibility | Initial contents |
|---|---|---|
| `mimiku/` | Immutable character references and generation inputs | master copy, model sheet, state sprite sheet |
| `pixel-ui/` | Editable/exportable pixel UI sheets | icon sheet and future scene source sheets |

The repository-root `icon.png` remains the immutable original master and must not
be moved, overwritten, recompressed, or regenerated. A source-preserving copy may
remain under `docs/design/assets/sources/mimiku/` for discoverability.

### Layer 1: browser-delivered marketing art

Location: `web/public/brand/`

This layer contains public-page imagery whose primary purpose is brand expression,
such as the landing-page hero. It must not contain model sheets, master copies, or
sprites used only as export sources.

Initial runtime content:

- `mimiku-hero.png`

Future marketing variants may be added only when a named public-page consumer
exists.

### Layer 2: browser-delivered product UI art

Location: `web/public/pixel-ui/`

| Subdirectory | Responsibility |
|---|---|
| `characters/` | Transparent Mimiku runtime states |
| `avatars/` | User-facing avatar choices or deterministic roster avatars |
| `icons/` | Individually exported UI icons; source sheets are forbidden |
| `scenes/` | Runtime scene compositions that currently have a real consumer |
| `frames/` | Runtime frame or 9-slice assets with a real CSS/component consumer |

The initial character files use state names rather than screen names:

- `mimiku-idle.png`
- `mimiku-happy.png`
- `mimiku-thinking.png`
- `mimiku-reminder.png`
- `mimiku-serious.png`
- `mimiku-lost.png`

Names such as `dashboard`, `emptyGroup`, `emptyFund`, `invite`, and `success` are
semantic roles in TypeScript, not duplicate filenames.

### Layer 3: install and platform assets

Location: `web/public/icons/`

The existing four PWA icons remain unchanged. Their manifest purposes (`any` and
`maskable`) already provide the required platform hierarchy.

### Layer 4: documentation and historical design artifacts

Locations:

- `docs/assets/readme/` for repository presentation images;
- `docs/design/assets/legacy/v0.2-prototype/` for superseded PairFund mockups and
  wireframes;
- existing spec and plan files for historical decisions.

Moving the old mockups to `legacy/` is an archival classification, not a redesign.
All Markdown links that refer to the files must be updated atomically. A README in
the legacy directory explains that the files are historical and must not guide new
Mimic UI work.

## Runtime registry

`web/src/shared/brand/pixel-ui-assets.ts` remains the single runtime entry point.
It will distinguish physical files from semantic usage roles:

```ts
export const pixelUiFiles = {
  characters: {
    idle: "/pixel-ui/characters/mimiku-idle.png",
    happy: "/pixel-ui/characters/mimiku-happy.png",
    thinking: "/pixel-ui/characters/mimiku-thinking.png",
    reminder: "/pixel-ui/characters/mimiku-reminder.png",
    serious: "/pixel-ui/characters/mimiku-serious.png",
    lost: "/pixel-ui/characters/mimiku-lost.png",
  },
  avatars: [
    "/pixel-ui/avatars/avatar-01.png",
    "/pixel-ui/avatars/avatar-02.png",
    "/pixel-ui/avatars/avatar-03.png",
    "/pixel-ui/avatars/avatar-04.png",
  ],
} as const;

export const pixelUiRoles = {
  dashboard: pixelUiFiles.characters.idle,
  emptyGroup: pixelUiFiles.characters.thinking,
  emptyFund: pixelUiFiles.characters.lost,
  invitation: pixelUiFiles.characters.reminder,
  success: pixelUiFiles.characters.happy,
  blockingError: pixelUiFiles.characters.serious,
} as const;
```

Components use `pixelUiRoles` when communicating a product state and
`pixelUiFiles` only when the physical state itself is relevant. Direct literal
paths outside the registry are allowed only for the public marketing hero and PWA
manifest icons.

Scenes, frames, and icons remain in the registry only when a non-test runtime
consumer exists. Source-only declarations must not appear in a runtime-first-screen
policy.

## Initial state usage matrix

The living catalogue will record the following initial mapping. It describes the
current intent without requiring every role to appear immediately.

| Semantic role | Physical state | Existing consumer | Treatment in this phase |
|---|---|---|---|
| Public hero | `mimiku-hero` | Landing page | Keep |
| Authentication idle | `idle` | Login/register | Keep and route through registry |
| Authentication error | `serious` | Login/register | Keep and route through registry |
| Offline | `idle` | Offline page | Keep and route through registry |
| Feature explanation | `thinking` | Public features page | Keep and route through registry |
| Invitation | `reminder` | Invite create/accept | Keep semantic alias |
| Blocking route state | `serious` | App route state | Keep semantic alias |
| Member avatar | `avatar-01` to `avatar-04` | Member roster | Keep |
| Dashboard | `idle` | No direct image consumer | Record as available, do not preload |
| Empty group | `thinking` | No direct image consumer | Record as available, do not preload |
| Empty fund | `lost` | No direct image consumer | Record as available, do not preload |
| Success | `happy` | No direct image consumer | Record as available, do not preload |
| Treasury scenes | Mobile/desktop scene | No direct image consumer | Retain outside first-screen policy pending screen review |
| Pixel frame image | Frame export | No direct image consumer | Retain pending frame review; CSS frame remains authoritative |
| Individual UI icons | Not yet exported | None | Defer to per-screen review |

The matrix lives in `docs/design/visual-assets.md` after implementation. Every new
asset must name a consumer, intended CSS size, loading policy, accessibility role,
and source provenance.

## Brand and rendering authority

`web/src/styles/tokens.css` is the canonical runtime palette. Asset documentation
may describe how artwork relates to the palette, but it must not define a competing
set of canonical hex values.

The visual system has two explicit rendering tiers:

1. **Marketing illustration** may use richer lighting and texture, but keeps
   Mimiku's anatomy, hardware, heart coin, and core palette recognizable.
2. **Runtime pixel UI** uses transparent backgrounds where appropriate, integer
   display sizes, nearest-neighbor presentation, stable silhouettes, and compact
   delivery formats.

This phase documents the tiers but does not recolor, quantize, resize, or regenerate
existing PNGs.

## Migration behavior

The implementation proceeds in dependency-safe order:

1. Add tests and the living asset catalogue for the target hierarchy.
2. Move source-only files out of `web/public/` without altering bytes.
3. Create the canonical runtime character set and update the registry.
4. Update all components, tests, cache matchers, and documentation references.
5. Remove byte-identical duplicate runtime files only after no consumer references
   their old paths.
6. Remove unused Next.js starter SVGs.
7. Archive PairFund mockups and update their documentation links.
8. Verify the Web application and assert that the immutable root master checksum
   is unchanged.

No compatibility aliases or duplicate files remain after the migration. Because
these assets are repository-local static URLs rather than a public external API,
all internal consumers move atomically in the same change.

## Validation and failure handling

Automated checks must cover:

- every registry path resolves to an existing file;
- no source sheet or master file remains under `web/public/`;
- no byte-identical Mimiku runtime duplicates remain;
- every runtime asset has a non-test consumer or an explicit deferred status in
  the catalogue;
- expected PNG dimensions, transparency, and immutable-source checksum remain
  unchanged;
- the service worker references only paths that exist after migration;
- the manifest still contains valid `any` and `maskable` icons;
- no production source contains a removed direct asset path;
- lint, typecheck, unit tests, and production build pass.

If a move would alter bytes, dimensions, alpha behavior, or the rendered role, the
migration stops and the original asset remains in place. Visual transformations
belong to later per-screen optimization work and require separate approval.

## Explicitly deferred work

- indexed-colour or lossless WebP exports;
- 128px/256px responsive character derivatives;
- treasury background, foreground, frame, and HTML-overlay decomposition;
- individual UI icon crops;
- new empty, loading, success, settlement, or correction illustrations;
- animation, parallax, particle, lighting, or transition effects;
- replacement mockups for current product screens;
- typography changes and broader component redesign.

These decisions will be made one screen at a time after the hierarchy migration is
complete.

## Acceptance criteria

The hierarchy phase is complete when:

1. a developer can determine whether an asset is source, marketing, runtime,
   platform, documentation, or legacy from its path;
2. the six duplicate Mimiku role files resolve to one canonical six-state runtime
   set;
3. source sheets and master copies are no longer browser-delivered;
4. runtime consumers use the semantic registry rather than scattered literal paths;
5. the living catalogue includes provenance and state usage for every retained
   visual asset;
6. legacy PairFund mockups cannot be mistaken for the current visual direction;
7. current screens render the same visual content as before the migration;
8. the root `icon.png` is byte-for-byte unchanged;
9. baseline Web verification passes.
