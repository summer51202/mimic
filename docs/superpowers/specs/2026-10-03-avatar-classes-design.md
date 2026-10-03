# Avatar / Classes Character Family Design

**Status:** Approved visual direction; production assets not yet approved  
**Date:** 2026-10-03  
**Scope:** Eight class characters for the Mimic avatar family

## Purpose

Define one coherent eight-character RPG family for Mimic while preserving clear class identity, individual personality, and the hand-built pixel character of the approved warrior. This specification fixes the visual direction that concept exploration established. It does not promote any concept PNG into the product runtime.

## Approved Direction

The family uses compact adult characters at approximately 2.25 heads tall. The warrior is the primary proportion and pixel-granularity anchor. Every character shares stepped dark brown-black outlines, deliberate pixel clusters, two to three principal material shades, restrained broken highlights, and mild hand-made asymmetry.

The family must read as experienced adventurers rather than pristine costume models. Experience is expressed through posture, restrained wear, creases, material variation, and role-specific tools. It must not become generalized dirt, random corrosion, excessive patching, or texture noise.

Characters may differ in silhouette weight. Heavy armor remains broader and chunkier than cloth or light equipment. Consistency means a shared visual resolution and construction logic, not identical outline thickness everywhere.

## Character Roster

### 1. Warrior

- Role: seasoned front-line adventurer and the family anchor.
- Identity: compact adult build, red-plumed helmet, round shield, short blade, heavy metal silhouette.
- Character: dependable and battle-tested, with controlled equipment wear.
- Approved concept source: `warrior-b-history-2-25-head.png`.

### 2. Mage

- Role: experienced court-trained mage.
- Identity: purple long robe, broad B-shaped pointed hat, book and staff.
- Character: slightly noble and composed; field experience appears through controlled hat folds and use marks.
- Boundary: no patchwork motif or decorative hat-lining pattern.
- Approved full-body source: `mage-warrior-pixel-grid-v2-medium.png`.

### 3. Ranger

- Role: seasoned pathfinder who guides the party.
- Identity: dark skin, tied white hair, long braid, green shoulder covering, bow held low.
- Character: alert and mobile; the final gaze points image-right.
- Pose: active guiding stance without becoming strongly hunched or elongated.
- Approved full-body source: `ranger-medium-pixel-grid-v4.png`.

### 4. Rogue

- Role: former guild infiltrator.
- Identity: asymmetric short dark hair, beauty mark, wine-red scarf, dark shoulder covering, one drawn dagger.
- Character: controlled, watchful, and agile.
- Pose: lower and lighter than the warrior while retaining the shared 2.25-head construction.
- Approved full-body source: `rogue-medium-pixel-grid-v3.png`.

### 5. Physician

- Role: young travelling physician with cleric-like support cues.
- Identity: warm golden-brown skin, halo-like braided hair, white and muted teal clothing, wooden staff, open diagnostic hand gesture.
- Character: capable and approachable rather than elderly or ceremonial.
- Granularity: white robe, sleeves, lower panels, hair curls, and boots use the refined medium pixel-cluster scale rather than the earlier coarse garment blocks.
- Presentation: the concept-sheet background uses the shared deep navy field so family comparisons are not biased by a warmer vignette.
- Approved full-body source: `cleric-medium-pixel-grid-v4-navy.png`.

### 6. Bard

- Role: former court musician and travelling chronicler.
- Identity: freckles, light stubble, red feathered hat, lute in an active playing pose.
- Character: sociable, travelled, and expressive without becoming comic relief.
- Granularity: the refined version is one controlled detail level finer while still belonging to the warrior-led family.
- Approved full-body source: `bard-medium-pixel-grid-v3-refined.png`.

### 7. Alchemist

- Role: field formula specialist.
- Identity: asymmetric goggles and eyewear, green scarf, cream work coat, carefully inspected flask.
- Character: precise, curious, and practically experienced.
- Proportion: explicitly calibrated to match the warrior's apparent 2.25-head ratio; it must not revert to the earlier 1.8–1.9-head appearance.
- Granularity: face, hands, goggles, flask, and coat hem receive controlled fine detail; the main garment masses retain the family scale.
- Approved full-body source: `alchemist-medium-pixel-grid-v6-refined-hem.png`.

### 8. Cartographer

- Role: coastal-born frontier surveyor.
- Identity: the approved A character with B outfit, short-brimmed hat, blue neck scarf, folded map, and compass.
- Character: observant field professional with restrained travel wear.
- Approved full-body source: `cartographer-medium-pixel-grid-v2.png`.

## Family Construction Rules

### Proportion and Pose

- Use the warrior's apparent 2.25-head construction as the common adult baseline.
- Keep feet, torso, and head relationships visibly consistent when characters are shown at the same height.
- Preserve role-specific poses: heavy and planted for the warrior, upright and composed for the mage, active guidance for the ranger, low readiness for the rogue, open care for the physician, performance for the bard, close inspection for the alchemist, and field observation for the cartographer.
- Pose variation is desirable when it communicates occupation; accidental forward lean, stretched limbs, or mismatched head scale is not.

### Pixel Granularity

- Hair, hats, capes, coats, trousers, and boots use one shared medium pixel-cluster scale.
- Face, hands, and functional tools may use one finer level where recognition requires it.
- Fine exceptions include bowstrings, lute strings, flask rims, compass marks, and staff heads.
- Avoid smooth painted curves, inconsistent pseudo-resolution, isolated noisy pixels, and large coarse blocks that erase garment form.

### Palette and Materials

- Use stepped dark brown-black outlines instead of pure vector-like contours.
- Give each material two to three principal shade bands.
- Use highlights as broken pixel clusters rather than continuous glossy bands.
- Preserve the approved role spectrum: red-gold warrior, purple-gold mage, moss-green ranger, black and wine-red rogue, white-teal-gold physician, red-brown bard, olive-cream alchemist, and sand-blue cartographer.
- Repeated colors must remain separable through silhouette and material: the warrior's red belongs to metal and plume; the bard's red belongs to cloth and hat.

### Experience and Wear

- Show history through controlled folds, worn edges, small scuffs, and purposeful material variation.
- Mage wear is limited to folds and use marks; no repaired or patched motif.
- Do not distribute identical scratches or distress marks across the roster.
- Avoid excessive grime, corrosion, torn clothing, and random texture that reads as AI-generated detail.

## Portrait and Full-Body Relationship

The previously approved portraits remain the identity source of truth for facial features, age, skin tone, hairstyle, and expression. The selected full-body concepts are the source of truth for proportion, pose, silhouette, clothing mass, and equipment placement.

Production development must reconcile both sources without silently redesigning either one. A character passes identity review when portrait and full-body versions retain the same face cues, skin tone, hair or hat shape, principal colors, and signature tool.

## Production Asset Boundary

The current concept PNGs are calibration evidence only. They are not approved runtime assets and must not be copied into the asset registry or product pages.

A later implementation plan must define:

- transparent-alpha production masters;
- deterministic canvas and character occupancy;
- final output dimensions and naming;
- small-size optical corrections and grayscale checks;
- manifests and exact hashes;
- responsive review artifacts and visual contracts;
- the runtime promotion checkpoint.

Until those steps are separately reviewed, do not modify the product asset registry, PWA manifest, service worker, or application pages for this character family.

## Acceptance Criteria

The production family is acceptable only when:

1. All eight characters are distinguishable by silhouette and signature equipment without labels.
2. Equal-height comparison shows a coherent apparent 2.25-head family, with no character reverting to a shorter or stretched construction.
3. Garment and hair pixel clusters share the approved medium granularity; only faces, hands, and functional tools use finer exceptions.
4. Warrior remains the primary technical anchor without forcing light characters into heavy-armor chunkiness.
5. Portrait and full-body versions preserve the same identity cues.
6. Experience reads through purposeful design evidence rather than noise or generalized damage.
7. No concept image is promoted to runtime before deterministic output and optical review are approved.

## Out of Scope

- Runtime integration or replacement of existing avatar assets.
- Animation, directional sprite sheets, combat states, or pets.
- Class mechanics, permissions, accounting behavior, or user progression.
- Additional classes, alternate costumes, equipment variants, or character customization.
- Phase 2 page redesign work.
