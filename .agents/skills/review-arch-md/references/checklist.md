# Arch.md Review Checklist

Quick-reference checklist. Each item maps to a criterion in [quality-rubric.md](quality-rubric.md). Anchor for "gold standard" is the canonical shape in the `repo-butler` skill's `references/arch-template.md`.

## Blocking (must pass)

- [ ] Has a level-2 heading: `## <repo_name> — Architecture Overview`
- [ ] Has these sections, in this order, separated by `---` dividers:
      1. Role + Layer
      2. Dependencies
      3. Module structure
      4. Public API
      5. Key internal types
      6. Extension pattern
      7. Key files for development
      8. Notes
- [ ] **Role** is exactly one sentence
- [ ] **Layer** is one of: `bottom` / `framework` / `algorithm` / `product`
- [ ] **Dependencies** block is verbatim output of `extract-deps.py` (preserves the `=== DEPS: ... ===` header and category labels)
- [ ] **Extension pattern** section is present whenever the repo has a registry, factory, Pimpl impl, or plugin host (omit only if genuinely none — must be justified)

## Accuracy (verify against subject repo when reachable)

- [ ] Every file path cited in the doc actually exists in the subject repo
- [ ] Every `X : Y` inheritance claim matches the actual class declaration
- [ ] Library file names in Notes match `cmake/*Config*.in` (release vs debug variants correct)
- [ ] Package-contents claim (headers / source / weights / configs) matches CPack install rules
- [ ] In-repo skills cited under Extension pattern actually exist at `.agents/skills/<name>/SKILL.md`
- [ ] Runtime-deps-not-in-CMake claim is real (grep the repo for the framework name to confirm)

## Conciseness

- [ ] **No method signatures** anywhere in the doc — Public API lists names only
- [ ] **No file-listing prose** that a `ls` would reveal
- [ ] **No cross-section redundancy** — a fact appears in exactly one section
- [ ] **Module structure** table excludes `build/`, `.git/`, and excludes `toolchains/` unless cross-compile is core
- [ ] Total length ≤ 100 lines for a typical algorithm/framework-layer repo (longer needs a reason)

## Section-Specific Rules

### Public API
- [ ] Lists class names separated by `·` with a trailing pointer `— see include/<repo>/`
- [ ] No descriptions of what each class does (that's the role's job)
- [ ] No signatures

### Key internal types
- [ ] One bullet per type
- [ ] Each bullet: `<Type> : <Base>` (or `(= <alias>)`) + `→ <path>`
- [ ] Optional one-line clarifier in parens, ONLY when non-obvious
- [ ] No method signatures

### Extension pattern (highest-leverage section)
- [ ] **Pimpl line**: `<PublicClass>` (public) → `<ImplClass> : <Base>` (impl) — uses "→" and inheritance, not "holds"
- [ ] **Orchestration line**: names the dispatch site as `file:function` or `file::function`
- [ ] **Registry args line**: lists arg names in order with which variants ignore which arg
- [ ] **Optional hooks line**: names overridable methods + one-line purpose
- [ ] **In-repo skills line**: present if `.agents/skills/` is non-empty in the subject repo

### Key files for development
- [ ] 3–5 bullets total (fewer = under-pointing, more = bloat)
- [ ] Each names a specific file an agent would open for a common task
- [ ] Includes (where applicable): config schema, extension point, registry/factory, one implementation example

### Notes
- [ ] Only **non-obvious** facts — derivable info is forbidden
- [ ] Runtime deps not in CMake are explicitly flagged
- [ ] Config-format quirks vs sibling repos noted (if applicable)
- [ ] Package artifact line uses exact filename(s) from `cmake/*Config*.in`

## Markdown Hygiene

- [ ] Forward slashes in all paths
- [ ] Inline code spans for all paths and identifiers
- [ ] Tables have consistent column counts
- [ ] `---` dividers between top-level sections only (not within them)
- [ ] No HTML, no emoji
