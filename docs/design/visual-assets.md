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

## Page visual v1 complete-family review

Status `review-ready-staged`. The staged set contains 121 PNGs and four JSON
sidecars. B1/B1R exports retain their approved calibration lineage. B2-2 adds
23 byte-for-byte copies pinned by the B2-1 approval hashes.

| Family | Staged files | Intended use and fallback |
|---|---:|---|
| Wordmark | 3 | Display and blink at 240–640 CSS px wide, compact at 96–220. Keep one live MIMIC name. |
| Icons | 24 | Install and favicon sizes plus 48 px UI masters. Keep visible labels or accessible control names. |
| Mimiku | 12 | Six 512 px states and six 512 px-per-frame action sheets. Keep live dialogue and confirmation text in the reserved layout. |
| Avatars | 16 | Eight 96 px portraits and eight 192 px full poses. Keep live member names and classes. |
| Scenes | 18 | Separate Landing and Home layers with desktop/phone layouts. Keep live navigation and actions on a bounded static surface. |
| Frames | 6 | Five 52 px masters and nine-slice metadata. Preserve padding, landmarks, controls, and content order. |
| Props | 35 | Scene-sized props and four 256 px chapter cues. Keep named interactions and mode labels. |
| Motion | 11 | Desktop/phone scene-sized sheets and timing metadata. Keep a static final pose and full live dialogue under reduced motion. |

Per-file provenance, dimensions, intended CSS size, consumer, loading,
accessibility, fallback, and reduced-motion behavior are in the
[production manifest](assets/approved/page-visual-v1/production-asset-manifest.json).
The manifest leaves every runtime target unset and ties loading to a future
consumer plan. See the [contrast and fallback review](assets/reviews/2026-09-18-page-visual-phase-1/gate-b-composites.html)
and [QA report](assets/approved/page-visual-v1/qa-report.md).
