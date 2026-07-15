---
name: dit-mr
description: Generate GitLab Merge Request content from branch diff using the project template. Use when the user asks to draft, write, or generate MR content, MR title, or merge request description from branch changes.
---

# PURPOSE

Generate GitLab Merge Request content that describes the **final state** of changes between source and target branch. Output MUST strictly follow `.gitlab/merge_request_templates/Default.md` — the template is the single source of truth. Keep content **terse and skim-readable** — reviewers should grasp the change in <30 seconds.

---

# USE WHEN

- The user asks to draft, write, or generate Merge Request content for current branch changes
- The user asks for GitLab MR text based on source vs target branch changes
- The task is to turn branch diff into reviewer-facing MR content using the project template

---

# DO NOT USE WHEN

- The user only wants to execute MR creation with already-prepared content
- The task is to inspect existing MR history, comments, or review discussion
- The user explicitly asks for a non-template freeform summary

---

# INPUTS

**Required:**
- Branch diff (source vs target)
- MR template: `.gitlab/merge_request_templates/Default.md`

**Optional** (clarify intent; do NOT override template or diff):
- Issue or ticket description
- Design or spec documents
- Release notes or user-facing requirements
- Repo-specific reference documents provided by the user

---

# INPUT VALIDATION

If branch diff is missing:
- STOP immediately — DO NOT guess, DO NOT generate MR content

If MR template is missing:
- STOP immediately — ask for the template file or its correct path
- DO NOT generate fallback structure or MR content

If optional supporting documents are missing:
- Continue with template + diff if sufficient
- DO NOT invent product intent, business rationale, or requirements
- If the user explicitly requires reference-driven content and the reference is unavailable, STOP and ask

---

# DETERMINE TARGET BRANCH

Determine the target branch **before** reading the diff:

1. **User-stated**: use it directly.
2. **Not stated**: STOP and ask — "Which branch is this MR targeting?"

Once resolved, obtain the diff:

```
git diff <target-branch>...HEAD
```

DO NOT default to `main`, `master`, `dev`, or any branch name not explicitly stated by the user.

---

# PROCESS

1. Determine target branch (see above)
2. Read MR template
3. Preserve EXACTLY: section names and order, checklists (leave all items unchecked), instructional text
4. **Strip all HTML comments** (`<!-- ... -->`) from the template
5. Analyze diff
6. Extract meaningful changes, remove noise (see INTERNAL WORKFLOW)
7. Map changes into template sections (see CHANGE CLASSIFICATION)
8. Delete any section heading with no content (see EMPTY SECTION RULE)
9. Generate MR title (see TITLE)
10. Generate MR content — verify against [references/quality-checklist.md](./references/quality-checklist.md) before output

---

# INTERNAL WORKFLOW

1. Extract raw changes from diff
2. Remove noise: formatting/lint, rename-only, debug/temp code, intermediate refactor, commit process artifacts
3. Merge related changes into reviewer-level changes
4. Rewrite each merged change as one of the types in CHANGE CLASSIFICATION
5. Map each change to the correct template section

---

# CHANGE CLASSIFICATION

**Include:**

| Type | Notes |
|------|-------|
| Feature / capability | New functionality |
| Behavior change | Modified logic or flow |
| Bug / correctness fix | — |
| API change | Public interface modified |
| Architecture change | Structural redesign |
| Lifecycle / resource handling | Ownership, cleanup |
| Significant performance change | Measurable impact only |

**Ignore:** formatting/lint, trivial renaming, debug/temp code, intermediate refactor, commit history.

**Refactor:** include ONLY if it changes public API, data flow, lifecycle, architecture, or observable system behavior. Otherwise ignore.

**Section mapping:** Added → new feature/capability · Changed → behavior/architecture/API/lifecycle · Fixed → bug/correctness fix. If template uses different names, follow template meaning.

---

# TITLE

```
<type>: <short description>
```

Type prefixes: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`.

- Keep under 70 characters
- Lead with the change, not the actor — `feat: add X to Y` ✅ not `feat: I added X` ❌
- Details go in the description, not the title

---

# GRANULARITY RULE

Each bullet MUST represent ONE meaningful change at feature/behavior level.

DO NOT split by file, function, or commit.

---

# BULLET RULES

Each bullet MUST:
- Start with a verb: `add` / `fix` / `update` / `remove` / `refactor`
- Lead with the change, not the actor
- Be concise: Sentence 1 = what changed. Sentence 2 (optional) = why/impact. Sentence 3 (rare) = caveat or follow-up. **Cap at 3 sentences.**

DO NOT include file names, function names, commit references, or multi-paragraph explanations.

---

# STYLE

- **English only.** Title, summary, bullets, Additional context — all English. Hard rule even when the conversation is in Mandarin.
- Engineer-to-engineer: concise, direct, high information density
- No fluff, no marketing language
- No code blocks unless essential — diffs and snippets belong in the diff view

Avoid vague verbs: `improve`, `enhance`, `optimize` (unless measurably specific).

---

# EMPTY SECTION RULE

If a section has no content: **delete the entire heading and its content block.**

Never leave a bare `*` or empty heading. Exception: Summary section is never subject to this rule — see SUMMARY RULE.

---

# ADDITIONAL CONTEXT RULE

If template contains "Additional Context" with an HTML comment placeholder: strip the comment, leave the section body empty. Do NOT add any content.

---

# SUMMARY RULE

If the template includes a Summary section, it MUST be filled:
- 1–2 sentences only
- State the primary change and its intent
- No bullets, no filler text

---

# OUTPUT

The output MUST:
- Be valid markdown matching template structure EXACTLY (empty sections deleted, HTML comments stripped)
- Be wrapped in a single ` ```markdown ` … ` ``` ` code fence
- Contain no text outside the code fence except the narrow escape hatch below

**Narrow escape hatch:** If `AGENTS.md` requires an uncertainty/ambiguity/unverified-risk disclosure that cannot be omitted, prepend exactly one plain-text line before the code fence:
- `AGENTS disclosure: uncertainty: <specific point>`
- `AGENTS disclosure: ambiguity: <specific point>`
- `AGENTS disclosure: unverified risk: <specific point>`

Use only when strictly required by `AGENTS.md`. Do NOT add any other explanation outside the code fence.

---

# WORKFLOW

After generating MR content, create the MR with `glab`:

```bash
git push -u origin <branch>
glab mr create --target-branch <target> --title "<type>: <short title>" --description "$DESCRIPTION"
```

`$DESCRIPTION` = generated output with the surrounding code fence stripped. Wrap in double quotes; escape shell special characters if needed.

---

# HARD RULES

- DO NOT invent changes or guess missing information
- DO NOT describe development process or list commits
- DO NOT write non-English text in the MR content
- DO NOT leave HTML comments or bare `*` in output
- DO NOT let optional reference documents override template structure or diff content
- DO NOT use the `AGENTS disclosure` escape hatch unless `AGENTS.md` forces it
