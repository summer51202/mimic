---
name: repo-butler
description: Token-efficient architecture analysis for C++/CMake repositories. Scans a repo and produces a compact architecture overview (arch.md) covering role, dependencies, public API, and extension pattern; can also analyze a branch diff. Use when the user asks to onboard a repo, generate or update arch.md, summarize repo architecture, or analyze branch changes. Invocation: `/repo-butler onboard [path]` or `/repo-butler diff <base> <branch> [path]`.
---

# repo-butler

Token-efficient repository analysis for C++/CMake projects.
Scripts pre-compress raw data before LLM analysis to minimize token usage.

## Invocation

```
/repo-butler onboard [path]               # Architecture overview
/repo-butler diff <base> <branch> [path]  # Branch diff analysis
```

`path` defaults to current directory.

---

## onboard — Workflow

**Goal**: Understand a repo's role, dependencies, public API, **and the extension pattern a developer must follow to add or modify behavior**.

### Step 1 — Compressed dependency map (run first, highest signal)
```bash
python3 ~/.claude/skills/repo-butler/scripts/extract-deps.py <path>
```

### Step 2 — Directory structure (depth 2 only)
```bash
find <path> -maxdepth 2 -type d | grep -v -E '(build|\.git|__pycache__)' | sort
```

### Step 3 — Public headers (API surface, read top 60 lines each)
```bash
find <path>/include -name "*.h" -o -name "*.hpp" 2>/dev/null | head -15
```
Read only the first 60 lines of each file found.
Extract class names and their purpose only — do **not** reproduce method signatures in the report.

### Step 4 — Extension pattern derivation (read impl side, highest leverage for dev tasks)

Goal: capture the chain a developer must touch to add/modify behavior — Pimpl, extension axes (dispatch sites), registry args, optional hooks. Without this, a dev task forces re-reading source.

Read these files (skip if absent). **Headers alone are not enough** — dispatch logic usually lives in `.cpp` bodies, so a header gives you the type but not the branching. Read the impl headers (top 60 lines) AND the dispatch function bodies the grep below finds.

```bash
# Pimpl impl header — usually src/<repo>/_<name>.h or <name>_impl.h
find <path>/src -maxdepth 3 -name "_*.h" -o -name "*_impl.h" 2>/dev/null | head -3

# Registry / factory header
find <path>/src -maxdepth 3 -name "*registry*.h" -o -name "*factory*.h" 2>/dev/null | head -3

# One concrete extension example (model, backend, plugin, etc.)
find <path>/src -maxdepth 4 -path "*/models/*.h" -o -path "*/backends/*.h" -o -path "*/plugins/*.h" 2>/dev/null | head -1

# Find each distinct EXTENSION AXIS — a place a developer plugs in new behavior.
# Many live in .cpp bodies the header globs above never open (e.g. src/<x>/config_manager.cpp).
# Purpose: locate the STARTING file per axis — not to catalogue every factory call.
grep -rnE 'dlsym|GetProcAddress|LoadLibrary|Create[A-Z][A-Za-z]*\(|Register[A-Z][A-Za-z]*\(|switch *\(.*([Ff]ramework|[Tt]ype|[Bb]ackend)' <path>/src 2>/dev/null \
  | grep -vE '/test|_test' | head -40
```

For each distinct axis the grep reveals, open its entry `.cpp` **function body** (≈60 lines around the match), not just the header — enough to learn what it dispatches on and point a developer at the right starting file.

Identify and record:
- **Pimpl indirection**: public class → impl class name + base (e.g. `AASAno` → `_AASAno : aastask::Coordinator`)
- **Extension axes — one pointer per distinct mechanism**: a repo often has more than one (e.g. a task coordinator AND a `dlsym`-based config loader). For each axis, give the entry `file:function` and what it selects by — a *starting-file pointer per axis*, not a census of every factory call.
- **Registry constructor args + semantics**: read the registry's doc comment; note which args each variant ignores
- **Optional hooks**: methods like `InitializeFromHeader`, `Configure`, `OnLoad` that subclasses may override

### Step 5 — In-repo skills check (one command)

```bash
ls <path>/.agents/skills/ 2>/dev/null
```

For each skill found, grab its one-line `description:` from the frontmatter — these are first-class entry points for common dev tasks and should be linked in the report.

### Step 6 — Package artifact accuracy (Notes truthfulness)

```bash
find <path>/cmake -name "*Config*.in" -o -name "*.cmake.in" 2>/dev/null | head -4
```
Read each to extract: exact library file names (release vs debug, e.g. `libfoo.so` vs `libfood.so`), what ships in the package (headers only? source? configs? weights?). The Notes section MUST reflect these exactly — guessing here is a common error.

### Step 7 — Repo context (if exists)
Read `<path>/AGENTS.md` or `<path>/README.md` — first 80 lines only.

### Step 8 — Write arch.md

Produce the report in the **exact shape defined in [`references/arch-template.md`](references/arch-template.md)** — all sections, in order, headings verbatim. Fill every placeholder from the real files read in Steps 1–7; never invent (unknown → `TBD`). Match the density of the template's synthetic `libfoo` example. Target ≤100 lines.

**Write the result to `<path>/.agents/arch.md`** (create `<path>/.agents/` if absent) — this is the deliverable, not a conversation dump. The file is the artifact the sibling skills consume: `explain-repo` loads it at task start, `review-arch-md` audits it. Onboarding is not done until the file is on disk.
- Self-check completeness before writing: every distinct extension axis the Step 4 grep surfaced must appear in the Extension pattern. Backfill any that is missing, or mark it `TBD` — never silently drop one. This generation-side check is the only completeness gate (`review-arch-md` verifies correctness, not omissions).
- If `<path>/.agents/arch.md` already exists, this is a regenerate: overwrite it and tell the user the prior version was replaced (they can `git diff` to inspect).
- After writing, print the saved path plus a one-line summary; do **not** echo the full file back into the conversation.

`arch-template.md` is the single source of truth for the shape and encodes the **definition of done**: from the output alone a downstream agent must be able to locate the extension point, the first files to open, and the gotchas. The output is for agents, not humans — terse and parseable over readable.

---

## diff — Workflow

**Goal**: Understand what changed between two branches — structural patterns, API impact, intent.

### Step 1 — Changed files (blast radius overview)
```bash
git -C <path> diff --stat <base>..<branch> | tail -5
```

### Step 2 — Commit intent
```bash
git -C <path> log <base>..<branch> --oneline
```

### Step 3 — Dependency changes (run extract-deps on each branch)
```bash
git -C <path> show <base>:cmake/dependencies.cmake > /tmp/deps-base.cmake 2>/dev/null \
  && python3 ~/.claude/skills/repo-butler/scripts/extract-deps.py /tmp 2>/dev/null || echo "no deps file on base"

git -C <path> show <branch>:cmake/dependencies.cmake > /tmp/deps-branch.cmake 2>/dev/null \
  && python3 ~/.claude/skills/repo-butler/scripts/extract-deps.py /tmp 2>/dev/null || echo "no deps file on branch"
```

### Step 4 — API changes (headers only, highest priority)
```bash
git -C <path> diff <base>..<branch> -- "*.h" "*.hpp" include/
```

### Step 5 — Structural changes (CMakeLists, new/removed files)
```bash
git -C <path> diff <base>..<branch> -- CMakeLists.txt cmake/
git -C <path> diff --name-status <base>..<branch> | grep -E '^(A|D|R)'
```

### Step 6 — Output report

```
## [base] → [branch] Changes

**Commit intent**: [summary from git log]
**Scale**: N files, +X -Y lines

**Dependency changes**:
[diff between base/branch extract-deps output]

**API changes** (public headers):
[modified signatures, new/removed functions]

**Structural changes**:
[new/removed/renamed files and modules]

**Refactoring patterns**:
[identified patterns: extracted interface, split module, renamed class, etc.]

**Risk areas**:
[changes that affect downstream consumers]
```

---

## Priority rules

1. cmake deps > public headers > impl headers (Pimpl/registry) > source files
2. Skip: `build/`, `.git/`, test files (unless asked), `toolchains/` (omit from Module structure unless cross-compile is core to consumers)
3. For large diffs: focus on `include/` and `cmake/` first, source files on request
4. If a file exceeds 100 lines of diff, summarize by section instead of reading all
5. **Notes section**: only non-obvious facts; lib names + package contents MUST come from `cmake/*Config*.in`, never guessed
6. **Extension pattern section**: never omit if the repo has a registry, factory, or Pimpl impl — that's the highest-value section for downstream dev tasks
