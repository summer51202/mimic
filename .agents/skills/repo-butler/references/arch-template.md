# arch.md — canonical shape

**Audience: AGENTS, not humans.** arch.md is a token-efficient brief an agent reads at task start to act fast. No prose-for-reading — every line must be a parseable, actionable signal. `repo-butler onboard` generates to this shape; `review-arch-md` validates against it. This file is the single source of truth for the shape.

## Definition of done

From the arch.md ALONE (without re-reading source), a downstream agent must be able to:
1. **Locate where to start** — for each distinct extension axis (a way a developer adds/modifies behavior), the entry `file:function` to open first. Cover every axis, not every dispatch call.
2. **Pick the first files to open** — the 3–5 highest-leverage files for a dev task.
3. **Avoid the non-obvious gotchas** — runtime deps, config quirks, exact artifact names.

If any of these can't be answered from the doc, the doc is incomplete — regardless of how well-formatted it is.

## Hard rules

- Fill every `<placeholder>` from REAL files read during onboard. **Never invent.** Unknown → mark `TBD` or omit; never guess.
- Sections in the **exact order** below; headings **verbatim** (`review-arch-md` and `explain-repo` anchor on them).
- **≤100 lines total.** Terse. No fact repeated across sections.
- Notation over sentences: `Class : Base → path`, `file:function`, `arg — semantics`.
- Omit a section ONLY when genuinely N/A (e.g. no in-repo skills). Never pad to fill.
- Extension pattern covers each distinct extension axis with a starting-file pointer (e.g. a registry AND a separate `dlsym` plugin loader) — more than just the primary one, but not a census of every factory call.

## Skeleton

```
## <Repo Name> — Architecture Overview

**Role**: <one line: what this repo does>
**Layer**: <bottom | framework | algorithm | product>

**Dependencies** (from extract-deps.py):
<script output, verbatim>

**Module structure**:
- `<dir>/` — <1-line purpose>

**Public API**: <ClassA · ClassB · ...> — see `include/<repo>/`

**Key internal types**:
- `<Class> : <Base>` → `src/.../<file>.h` — <non-obvious inheritance/ownership only>

**Extension pattern**:
- Pimpl: `<PublicClass>` → `<ImplClass> : <BaseClass>`
- Extension axes (one per distinct mechanism — a repo often has several): `<file:function>` picks `<VariantA>`/`<VariantB>` by <criterion>
- Registry args: `(<arg1>, <arg2>, ...)` — `<variant>` ignores `<argN>`
- Optional hooks: `<Method()>` — <what subclasses override it for>
- In-repo skills: `.agents/skills/<name>/` — <one-line purpose>   (omit line if none)

**Key files for development**:
- <role>: `<path>`   (3–5 highest-leverage small files: config schema, registry, extension-point example)

**Notes**: (non-obvious only; verified against cmake/*Config*.in + source)
- <runtime dep NOT in CMake — deploy separately>
- <config format quirk vs sibling repos>
- <package artifacts: exact lib names, release + debug>
```

## Density reference — synthetic `libfoo` (fictional repo)

Shows target density and notation. **Carries no real repo's facts — do not copy these values.**

```
## libfoo — Architecture Overview

**Role**: Image-codec layer wrapping libjpeg/libpng behind one decode/encode API.
**Layer**: framework

**Dependencies** (from extract-deps.py):
libjpeg 9e · libpng 1.6 · zlib 1.3   (all via find_package)

**Module structure**:
- `include/libfoo/` — public API
- `src/codecs/` — per-format decode/encode impls
- `src/_foo.h` — Pimpl impl

**Public API**: Image · Decoder · Encoder — see `include/libfoo/`

**Key internal types**:
- `_Foo : codec::Registry` → `src/_foo.h` — owns codec lookup, not exposed
- `JpegCodec : ICodec` → `src/codecs/jpeg.h`

**Extension pattern**:
- Pimpl: `Image` → `_Foo : codec::Registry`
- Registry dispatch: `src/_foo.cpp:resolve()` picks codec by magic bytes
- Registry args: `(format_id, ICodec*)` — built-in formats ignore `format_id` (auto-detected)
- Optional hooks: `ICodec::OnLoad()` — codecs validate headers here
- In-repo skills: `.agents/skills/add-codec/` — scaffold a new ICodec

**Key files for development**:
- Codec registration: `src/_foo.cpp`
- Extension-point example: `src/codecs/jpeg.h`
- Config schema: `etc/libfoo.yaml`

**Notes**:
- libjpeg/libpng are system libs, NOT bundled — must exist on the target.
- Ships `libfoo.so` (release) / `libfood.so` (debug); `d` suffix = debug.
```
