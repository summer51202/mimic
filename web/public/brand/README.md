# Mimiku Brand Assets

These assets define the initial raster identity system for Mimiku, the mimic
shared-finance PWA companion.

## Source

- Master reference: repository root `icon.png`
- Master copy: `mimiku-master.png`
- The root `icon.png` must remain unchanged. Derivatives are never written back
  over the source file.

## Character Invariants

- Product mascot name: Mimiku
- Chinese character name: 咪咪庫
- Body: mischievous treasure-chest companion
- Required features: dark navy outline, warm wood panels, gold bands, offset
  expressive eyes, cream teeth, and a gold coin with a red heart
- Avoid: text baked into assets, watermarks, skull symbols, extra mascot
  characters, new costumes, or inconsistent hardware

## Palette

- Deep ink navy: `#10152f`
- Coin gold: `#f4bd32`
- Wood brown: `#8a4f2b`
- Heart red: `#cf4138`
- Grass green: `#4f8a58`
- Sky blue: `#6fa9d8`
- Warm surface: `#fffaf0`

## Files

- `mimiku-master.png`: source-preserving copy, 1024x1024; reference only,
  not used directly in compact UI
- `mimiku-model-sheet.png`: six-state model sheet, 1536x1024; reference only
- `mimiku-idle.png`: idle state, 512x512
- `mimiku-happy.png`: happy state, 512x512
- `mimiku-thinking.png`: thinking state, 512x512
- `mimiku-reminder.png`: reminder state, 512x512
- `mimiku-serious.png`: serious state, 512x512
- `mimiku-lost.png`: lost state, 512x512
- `mimiku-states.png`: horizontal sprite sheet, six 512x512 frames in the
  order idle, happy, thinking, reminder, serious, lost
- `mimiku-hero.png`: wide public hero artwork, 1672x941, with negative space
  for page copy

## Intended Display Sizes

- Public hero: full-bleed or section-width background, usually 720-1200 CSS px
  wide depending on viewport; keep `object-fit: cover` and preserve left-side
  text space.
- Public/onboarding character: 160-280 CSS px wide on phones and 260-420 CSS px
  wide on desktop.
- In-app companion states: 72-128 CSS px wide for empty/error/reminder states.
- Small UI avatars or badges: derive a purpose-built icon from the model sheet;
  do not shrink the full master below 48 CSS px.
- Sprite frames: render each 512x512 frame at integer scale where possible.

## Runtime Guidance

- `mimiku-master.png` and `mimiku-model-sheet.png` are reference assets. Do not
  preload them, render them in product flows, or precache them in the service
  worker.
- `mimiku-states.png` is a source sprite sheet for coordinated animation work.
  Prefer the individual state PNGs for static UI feedback.
- `mimiku-hero.png` is the only large public-page runtime asset in this set.
  Load it on the public home page only, with responsive image sizing.
- Keep future state/icon runtime derivatives below 256 KB where possible.
- Service-worker precaching must include only install icons, selected public
  shell assets, and `/offline`; do not precache reference sheets or private app
  routes.

## Generation Prompts

Model sheet prompt:

```text
Create a production pixel-art model sheet for Mimiku, the mascot of the
lowercase mimic shared-finance PWA. Preserve the reference treasure-chest body,
offset expressive eyes, dark navy outline, warm wooden panels, gold bands,
teeth, and gold heart coin. Show six full-body states on one flat neutral
background in a clean grid: front three-quarter idle, happy, thinking,
reminder, serious, and lost. Keep each state at the same scale with generous
padding, aligned to one fixed pixel grid. Use crisp retro pixel art,
nearest-neighbor pixels, consistent outline width, consistent palette, no text,
no labels, no watermark, no new costume, no skull symbols, no extra characters,
no background scene, and no gradients.
```

Hero prompt:

```text
Create a wide pixel-art fantasy shared-finance adventure scene featuring Mimiku
as the dominant mascot signal. Use a bright isekai village market path with tiny
coin trails, a shared fund chest table, grass, sky, and warm travel details.
Place Mimiku large and inspectable on the right half or lower right, with clear
negative space on the left for the page wordmark and tagline. Do not put text in
the image. Preserve the treasure-chest body, warm wooden panels, gold bands,
dark navy outline, expressive offset eyes, teeth, and gold coin with a red
heart. Avoid text, watermark, skull symbols, extra mascot characters, dark
blurred backgrounds, realistic rendering, and gradients as the main visual.
```
