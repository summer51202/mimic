# Mimic visual assets

## Authority

- Runtime palette: `web/src/styles/tokens.css`
- Immutable master: repository-root `icon.png`
- Runtime registry: `web/src/shared/brand/pixel-ui-assets.ts`
- Source assets: `docs/design/assets/sources/`
- Browser-delivered assets: `web/public/brand/`, `web/public/pixel-ui/`, and `web/public/icons/`

The root `icon.png` is never moved, overwritten, recompressed, or regenerated.
Operational labels, amounts, dates, errors, and statuses remain live HTML.

## Rendering tiers

### Marketing illustration

Marketing art may use richer lighting and texture. It must preserve Mimiku's
treasure-chest anatomy, offset eyes, dark outline, wood panels, gold hardware,
cream teeth, and heart coin. Add an asset only when a named public-page consumer
exists.

### Runtime pixel UI

Runtime art uses transparent backgrounds where appropriate, integer CSS display
sizes, `image-rendering: pixelated`, stable silhouettes, and compact delivery
formats. Screen meanings are semantic registry roles rather than copied files.

## State usage matrix

| Role | File state | Consumer | CSS/display intent | Loading | Accessibility | Status |
|---|---|---|---|---|---|---|
| Public hero | hero | `Hero` | responsive section art | priority | descriptive alt | active |
| Authentication idle | idle | `AuthForm` | 160-240px | eager with form | descriptive alt | active |
| Authentication error | serious | `AuthForm` | 160-240px | state swap | descriptive alt | active |
| Offline | idle | offline page | 128px | priority/offline cache | descriptive alt | active |
| Feature explanation | thinking | features page | 144-192px | normal | descriptive alt | active |
| Invitation | reminder | invite panels | up to 192px | panel-local | descriptive alt | active |
| Blocking route state | serious | `AppRouteState` | 112-160px | state-local | descriptive alt | active |
| Member avatar | avatar-01..04 | `MemberRoster` | 48px | list-local | member-specific alt | active |
| Dashboard companion | idle | none | 96-160px | never preload | descriptive alt when added | available |
| Empty group | thinking | none | 96-160px | never preload | descriptive alt when added | available |
| Empty fund | lost | none | 96-160px | never preload | descriptive alt when added | available |
| Success | happy | none | 96-160px | never preload | descriptive alt when added | available |
| Treasury scenes | mobile/desktop | none | pending decomposition | never preload | pending screen review | deferred |
| Pixel frame | frames-ui | none | pending 9-slice review | never preload | decorative | deferred |
| UI icons | source sheet only | none | 24/32/48px after export | component-local | visible label or aria-label | deferred |

## Provenance and naming

Every added visual records its source, generation or export method, dimensions,
intended CSS size, consumer, loading policy, and accessibility role. Physical
character files use emotion/state names; page-specific names belong in the
TypeScript role registry.

## Deferred optimization

Per-screen review decides palette quantization, responsive derivatives, scene
decomposition, individual icon exports, new state art, animation, and visual
effects. Structural organization never silently changes image bytes.
