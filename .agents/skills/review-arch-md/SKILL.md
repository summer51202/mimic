---
name: review-arch-md
description: "Review and audit an arch.md / repo overview produced by /repo-butler onboard against the gold-standard structure (Role · Layer · Dependencies · Module structure · Public API · Key internal types · Extension pattern · Key files · Notes). Use when: validating a repo-butler output, preparing arch docs for delivery, comparing two arch.md files, checking arch.md quality before push. Outputs a scored quality report with actionable findings."
---

# Arch.md Review Processor

Audit a repo overview / arch.md against the [arch.md gold-standard checklist](./references/checklist.md). Produces a scored quality report and actionable fix list so the author can confidently ship the doc as a token-efficient brief for downstream agents.

The canonical shape is defined in the `repo-butler` skill's [`references/arch-template.md`](../repo-butler/references/arch-template.md) — section order, verbatim headings, notation, target density (with a synthetic `libfoo` example), and the definition of done. `repo-butler` generates to it; this skill validates against it. The per-criterion form and scoring live in [`references/checklist.md`](./references/checklist.md) and [`references/quality-rubric.md`](./references/quality-rubric.md). Judge a doc against that shape, not against any one repo's facts (every repo has different facts).

## When to Use

- After running `/repo-butler onboard` and before saving the result
- When importing an arch overview written by another agent or author
- Periodic sweeps across multiple arch.md files (e.g. each repo's `.agents/arch.md`)
- When upgrading older arch.md files to the current schema (now including Extension pattern)

## Workflow

### Phase 1: Locate Target

1. If the user provides a path, use it directly.
2. Otherwise search for candidates: `.agents/arch.md`, `*-arch.md`, `*/arch.md` near the working directory.
3. If multiple, ask which to review.

### Phase 2: Collect Artifacts

Read the target arch.md fully. Also identify the **subject repo** it describes (from the title or path) so that accuracy checks can be performed against real files.

If the subject repo is reachable on disk, note its path — Phase 3 uses it for verification. If not reachable, mark accuracy checks as "unverified" and continue with structural checks only.

### Phase 3: Quality Audit

Evaluate every criterion in [references/checklist.md](./references/checklist.md). Score with the rubric in [references/quality-rubric.md](./references/quality-rubric.md).

If anything about expected form is unclear (divider style, Extension pattern bullet shape, Notes density), consult [references/quality-rubric.md](./references/quality-rubric.md), which describes the required form for each section.

**Verification (run when subject repo is reachable):**
- Pick 3 file paths cited in the doc → confirm they exist
- Pick 1 inheritance claim (e.g. `X : Y`) → grep the impl header to confirm
- Pick 1 library name from Notes → confirm against `cmake/*Config*.in`
- Pick 1 in-repo skill cited → confirm `.agents/skills/<name>/SKILL.md` exists

Record verification results inline with the criterion's Notes column.

### Phase 4: Output Quality Report

**ALWAYS output the report BEFORE suggesting fixes.**

Use this format:

```
## Arch.md Quality Report

### Summary
- Doc: <path>
- Subject repo: <name> (<verified | unverified>)
- Overall Score: XX/100 (Grade: X)
- Blocking Issues: X
- Warnings: X

### Detailed Scores

| #  | Criterion                                       | Score | Max | Notes |
|----|-------------------------------------------------|-------|-----|-------|
| 1  | Section completeness & order                    | X     | 15  | ...   |
| 2  | Accuracy (paths, lib names, inheritance)        | X     | 15  | ...   |
| 3  | Extension pattern depth                         | X     | 15  | ...   |
| 4  | Conciseness (no derivable info, no redundancy)  | X     | 10  | ...   |
| 5  | Key internal types (terse, inheritance + path)  | X     | 10  | ...   |
| 6  | Notes (only non-obvious facts)                  | X     | 10  | ...   |
| 7  | Public API (names only, no signatures)          | X     | 5   | ...   |
| 8  | Key files (3–5 high-signal pointers)            | X     | 5   | ...   |
| 9  | Dependencies block (from extract-deps.py)       | X     | 5   | ...   |
| 10 | Length & density (≤100 lines target)            | X     | 5   | ...   |
| 11 | Markdown hygiene (tables, dividers, paths)      | X     | 5   | ...   |
|    | **Total**                                       | **XX**| 100 |       |

### Blocking Issues
Items that MUST be fixed before delivery.
- [ ] ...

### Warnings
Items that SHOULD be fixed for higher quality.
- [ ] ...

### Passes
Items that met or exceeded expectations.
- ✓ ...
```

**Grade scale:**
- **A (90-100)**: Ship-ready — matches gold standard
- **B (75-89)**: Minor polish needed
- **C (60-74)**: Significant gaps (likely missing Extension pattern or accuracy errors)
- **D (40-59)**: Major rework required
- **F (0-39)**: Does not meet minimum schema bar

### Phase 5: Actionable Fixes

For each blocking issue and warning, provide:

1. **What**: The specific problem
2. **Where**: Section / line in the arch.md
3. **Why**: Which checklist rule it violates
4. **Fix**: Concrete suggestion (replacement text or diff)

### Phase 6: Re-check (Optional)

If the author applies fixes and asks to re-review, re-run Phase 3–4 and report deltas only.

## Key Rules

- **Never auto-fix without asking.** Always present the report first.
- **Grade honestly.** A doc that scores A but lies about a file path is worse than a B that's accurate.
- **Cite the rule.** Every finding must reference a specific checklist item.
- **Verify, don't assume.** If the subject repo is reachable, run the four verification probes in Phase 3 — most arch.md defects are accuracy errors, not structural ones.
- **Skip inapplicable criteria.** If the repo has no registry/factory, Extension pattern's "Registry args" sub-item is N/A — note it and redistribute weight proportionally.
