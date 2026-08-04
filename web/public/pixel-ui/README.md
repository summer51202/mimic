# mimic Pixel UI Assets

These PNGs are the authenticated app's project-bound pixel interface assets.
They sit beside, but do not replace, the public Mimiku brand assets in
`web/public/brand`.

## Source References

- Root master reference: repository root `icon.png`
- Source-preserving web copy: `web/public/brand/mimiku-master.png`
- Existing Mimiku states: `web/public/brand/mimiku-idle.png`,
  `mimiku-happy.png`, `mimiku-thinking.png`, `mimiku-reminder.png`,
  `mimiku-serious.png`, `mimiku-lost.png`, and `mimiku-states.png`
- Approved screenshot reference: the complete pixel-game interface reference
  approved for `docs/superpowers/specs/2026-07-29-mimic-pwa-groups-funds-pixel-world-design.md`
- Generation plan and invariant prompt:
  `docs/superpowers/plans/2026-07-29-mimic-pwa-groups-funds-pixel-world.md`
- Generated sheet exported by the parent task: `icons-ui.png`
- Deterministic runtime crops exported from `icons-ui.png` by
  `npm run assets:export`: `avatar-01.png` through `avatar-04.png` and
  `frames-ui.png`
- Scene exports maintained separately: `treasury-mobile.png` and
  `treasury-desktop.png`

The root `icon.png` was preserved byte-for-byte. Do not overwrite it with any
derived asset.

## Final Prompt

```text
Create a production pixel-art asset sheet for mimic, a cooperative shared-finance PWA. Match the approved complete pixel-game interface reference. Preserve Mimiku's treasure-chest body, offset expressive eyes, dark navy outline, warm wood, gold hardware, teeth, and gold heart coin. Use one fixed pixel grid, one palette, identical anatomy and outline weight across dashboard, empty group, empty fund, invitation, success, and serious states. Also include four friendly human avatar archetypes and interface icons for overview, group, members, fund, invite, settings, notification, currency, copy, share, edit, leave, success, warning, and error. Crisp nearest-neighbor pixels, transparent background, no text, no watermark, no gradients, no skull emphasis.
```

Scene continuation prompt:

```text
Create mobile and desktop pixel-art shared treasury scenes for the authenticated mimic app. Match the approved complete pixel-game interface reference and the Mimiku asset sheet palette. Show a warm shared-fund treasury with readable empty space for real HTML totals and controls. Keep all text out of the image. Use crisp nearest-neighbor pixels, fixed grid geometry, no blur, no watermark, no gradients, and no fake financial data baked into the artwork.
```

## Exported Files

| file | dimensions | intended display scale |
|---|---:|---|
| `mimiku-dashboard.png` | 512x512 | 96, 128, or 160 CSS px |
| `mimiku-empty-group.png` | 512x512 | 96, 128, or 160 CSS px |
| `mimiku-empty-fund.png` | 512x512 | 96, 128, or 160 CSS px |
| `mimiku-invite.png` | 512x512 | 96, 128, or 160 CSS px |
| `mimiku-success.png` | 512x512 | 96, 128, or 160 CSS px |
| `mimiku-serious.png` | 512x512 | 96, 128, or 160 CSS px |
| `avatar-01.png` through `avatar-04.png` | 96x96 | 48 CSS px (2x density) |
| `treasury-mobile.png` | 512x1024 | full-width mobile scene at integer scale |
| `treasury-desktop.png` | 1024x620 | wide treasury hero at 1x or 2x asset density |
| `icons-ui.png` | 1536x1024 | source sheet for pixel UI icons |
| `frames-ui.png` | 256x166 | 9-slice panel frame via CSS border-image |

## Grid And Palette

- The source sheet is the checked-in 1536x1024 `icons-ui.png`; the exporter
  performs no network access and does not read or write the repository-root
  `icon.png`.
- Avatar crops have only edge-connected near-neutral source background cleared.
  Character bounds are resized with nearest-neighbor sampling into at most
  88x88 pixels, preserving aspect ratio, then centered on a transparent 96x96
  canvas for a 48 CSS px slot at 2x density.
- Interface icons are treated as 96x96 source cells and should be rendered at
  24, 32, or 48 CSS px.
- Frame art has only edge-connected near-neutral source background cleared. The
  240x150 crop is centered without resampling on a transparent 256x166 canvas
  and consumed through `PixelFrame` with a whole-pixel 32px source slice, an
  8px rendered border width, and `round` border repetition.
- Use only integer display scales. Do not stretch character art with fractional
  transforms.

Core palette source is `web/src/styles/tokens.css`:

| token | value | use |
|---|---|---|
| `--mimic-color-hud-dark` | `#17213a` | outlines, HUD panels |
| `--mimic-color-coin-action` | `#f4b83f` | primary action buttons, coin gold |
| `--mimic-color-coin-deep` | `#b87918` | gold shadow and hardware depth |
| `--mimic-color-wood` | `#8a5a35` | Mimiku wood body |
| `--mimic-color-heart-critical` | `#d74f4f` | heart coin, destructive/error state |
| `--mimic-color-grass-success` | `#4f9d5d` | success accent and field greens |
| `--mimic-color-sky-info` | `#6fb7df` | clouds, water, info state |
| `--mimic-color-warm-surface` | `#fff7df` | parchment panels |

## Sheet Coordinates

Coordinates are measured from the top-left corner of the source PNG.

| asset | source | crop |
|---|---|---|
| `avatar-01.png` | `icons-ui.png` | x=85, y=360, w=170, h=180, contained in 88x88 then centered on 96x96 |
| `avatar-02.png` | `icons-ui.png` | x=255, y=360, w=170, h=180, contained in 88x88 then centered on 96x96 |
| `avatar-03.png` | `icons-ui.png` | x=430, y=360, w=170, h=180, contained in 88x88 then centered on 96x96 |
| `avatar-04.png` | `icons-ui.png` | x=610, y=360, w=170, h=180, contained in 88x88 then centered on 96x96 |
| `frames-ui.png` | `icons-ui.png` | x=1280, y=575, w=240, h=150, centered without resampling on 256x166 |
| `treasury-mobile.png` | scene sheet | x=0, y=0, w=512, h=1024 |
| `treasury-desktop.png` | scene sheet | x=512, y=190, w=1024, h=620 |

Icon cells in `icons-ui.png`:

| icon | crop |
|---|---|
| overview | x=810, y=350, w=96, h=96 |
| members | x=945, y=350, w=96, h=96 |
| profile | x=1075, y=350, w=96, h=96 |
| fund | x=1165, y=350, w=96, h=96 |
| invite | x=1270, y=350, w=96, h=96 |
| notification | x=1400, y=340, w=96, h=96 |
| currency | x=745, y=465, w=96, h=96 |
| copy | x=870, y=465, w=96, h=96 |
| share | x=1000, y=465, w=96, h=96 |
| edit | x=1130, y=465, w=96, h=96 |
| leave | x=1135, y=465, w=96, h=96 |
| success | x=1230, y=465, w=96, h=96 |
| warning | x=1325, y=465, w=96, h=96 |
| error | x=1420, y=465, w=96, h=96 |

## Runtime Notes

Regenerate the runtime assets from the checked-in source sheet with:

```bash
cd web
npm run assets:export
```

The exporter validates crop bounds and non-empty artwork before writing any
output. Each PNG is encoded to a same-directory temporary file, closed, and
atomically renamed into place, making repeated exports deterministic for the
same source sheet and PNGJS version recorded in `package-lock.json`.

- Render these files with `image-rendering: pixelated` or `crisp-edges`.
- Keep operational labels, amounts, dates, roles, and errors as live HTML text.
- Prefer integer display sizes to avoid softened pixels.
- Do not precache the large source sheets. First-screen app views should load
  only the specific Mimiku state, avatar crops, and one responsive treasury
  scene they display.
