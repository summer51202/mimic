---
name: create-skill
description: Draft a new SKILL.md for this repository. Use when the user asks to create a new skill, add a skill, draft a SKILL.md, or write a new agent skill. Infers structure and rules from trustworthy sources; surfaces explicit decision points for repo-owner confirmation.
---

# Purpose

Produce a directly-committable `SKILL.md` draft for a new skill in this repository.

This is a structured drafting workflow. It infers as much as possible from existing repo artifacts and domain documentation before asking any questions. It asks only when inference is insufficient. It surfaces every unresolvable judgment call as an explicit `[DECISION]` marker.

---

# Use When

- You need to create a new skill for this repository
- The intended purpose of the skill is stated, even if details are incomplete

---

# Do Not Use When

- The skill domain is too vague to describe what it produces or when it applies
- You only need to edit an existing SKILL.md (edit it directly)

---

# Inputs

**Required:**
- Description of what the new skill should do

**Optional (inferred from sources if not provided):**
- Trigger condition
- Output format
- Known constraints or tool-specific limits
- Reference documentation

If only the description is provided, proceed with inference before asking for anything else.

---

# Trustworthy Sources

Before drafting, consult in this order:

1. **`AGENTS.md`** — authoritative for policy, instruction precedence, the Rule/Skill boundary, and skill-routing concepts
2. **`README.md`** — reference for documented repository conventions, labels, and maintenance guidance only; it is NOT a policy authority
   - If `README.md` conflicts with `AGENTS.md`, `AGENTS.md` wins
3. **Existing SKILL.md files in this repo** — reference for structure, section order, tone, and reusable patterns only; never as authority for policy, routing rules, Rule / Skill boundary decisions, or source precedence
   - `.agents/skills/dit-mr/SKILL.md` — reference for task-skill structure, hard output constraints, and self-check pattern
   - `.agents/skills/smart-commit/SKILL.md` — reference for task-skill structure, classification logic, and imperative Hard Rules
4. **Official documentation** for the domain (if the skill codifies an external tool, format, or convention)
5. **The user's description and any examples they provide**

Do NOT invent domain behavior without a source. If a rule cannot be sourced, mark it `[DECISION]`.

---

# Steps

## Step 1: Check for an existing near-match

Before drafting a new skill, inspect existing skills in this repository and determine whether one already covers the use case closely enough.

If an existing skill already covers the task with only minor wording differences, do not create a duplicate skill. Instead, surface this as a repo-owner decision:

[DECISION] Reuse and update existing skill `<name>`, or create a separate new skill for this use case?

Only continue drafting a new skill when the use case is meaningfully distinct in trigger, workflow, output contract, or constraints.

## Step 2: Infer before asking

From the user's description and trustworthy sources, infer:

- **What the skill produces** — the concrete output artifact
- **What triggers it** — the task condition that makes this skill applicable
- **Output format** — by analogy with similar existing skills or domain conventions
- **Skill class** — task / language / project (derive from `AGENTS.md`; use `README.md` only for repository labels and naming conventions)

Only ask a clarifying question when a specific piece of information cannot be reasonably inferred. Ask one question at a time. Do not front-load a list of questions before attempting inference.

## Step 3: Determine skill class

Determine the class from `AGENTS.md` skill-layering concepts and the repo's documented conventions:

- **task skill** — triggered by task type; primary skill in routing
- **language skill** — triggered by programming language or tech stack; supporting skill
- **project skill** — triggered by repo-specific workflow or constraint; additional skill

If classification is genuinely ambiguous after reviewing the definitions, mark as `[DECISION]`.

## Step 4: Determine class-specific content requirements

**If task skill:**
- Identify the primary input (what the user provides)
- Identify the output format (what the skill returns)
- Identify Hard Rules that prevent incorrect output

**If language skill:**
The draft must include guidance in these categories (sourced from documentation or conventions; mark each gap as `[DECISION]`):
- Design principles specific to this language
- Memory / resource management patterns
- Performance optimization principles
- Common pitfalls unique to this language
- Validation and testing patterns
- Implementation constraints (minimum version, standard library expectations)

**If project skill:**
The draft must establish:
- Workflow boundaries (explicit trigger and termination condition)
- What makes this workflow repo-specific rather than general
- What artifacts or context must be present for this skill to apply

## Step 5: Draft the SKILL.md

Produce the draft with these sections in order. Omit sections that are genuinely not applicable; do not include empty sections.

1. YAML frontmatter: `name`, `description`
2. `# Purpose` — one paragraph; what the skill produces and why it is a skill rather than a rule
3. `# Use When` — specific conditions, not descriptions
4. `# Do Not Use When` — explicit exclusions
5. `# Inputs` — required and optional; state behavior when required input is missing
6. `# Trustworthy Sources` — what this skill must consult before acting
7. `# Steps` — numbered, directly executable workflow
8. `# Validation` — pre-output checklist; checks must be verifiable, not vague
9. `# Expected Output` — format, completeness, and quality criteria
10. `# Hard Rules` — imperative must/must-not constraints

## Step 6: Insert decision points

For every rule or constraint that cannot be sourced or objectively determined, insert:

```
[DECISION] <One specific, answerable question for the repo owner>
```

Requirements for `[DECISION]` markers:
- The question must be concrete and answerable with a yes/no or a specific value
- Do not use vague flags like `[DECISION] verify this`
- Do not mark stylistic choices as decisions — only true judgment calls qualify

## Step 7: Return output

Return in two clearly separated parts:

**Part 1** — the complete SKILL.md, starting directly with the YAML frontmatter. No preamble.

**Part 2** — separated by `---`, a decision summary:
- Total number of `[DECISION]` markers
- Each marker listed with its question and what answer unblocks it

---

# Validation

Before returning output, verify:

- [ ] Frontmatter has valid `name` and `description`
- [ ] `Use When` is specific enough to trigger without guessing
- [ ] `Do Not Use When` covers at least one foreseeable misuse
- [ ] Every step is directly executable
- [ ] No rule is stated without a source or a `[DECISION]` marker
- [ ] Skill class is stated and consistent with `AGENTS.md`
- [ ] All policy statements are consistent with `AGENTS.md`
- [ ] `README.md` was used only for repository conventions, labels, and maintenance guidance
- [ ] Existing skills were used for structure and examples only, not as policy authority
- [ ] Language skill includes all six content categories (or marks gaps as `[DECISION]`)
- [ ] Project skill includes workflow boundaries and repo-specificity rationale
- [ ] Output format is described concretely, not abstractly
- [ ] The output is in English because `SKILL.md` is agent-facing in this repository

---

# Expected Output

**Part 1:** A complete `SKILL.md` matching the structure and tone of existing skills in this repo. Committable after `[DECISION]` markers are resolved.

**Part 2:** A decision summary clearly separated from Part 1 by `---`.

---

# Hard Rules

- DO NOT invent domain rules without a traceable source
- DO NOT let `README.md` or an existing `SKILL.md` override `AGENTS.md` on policy
- DO NOT treat `README.md` as the authority for skill classification or Rule / Skill boundary decisions
- DO NOT produce a blank template with placeholder text
- DO NOT ask questions that can be answered by reading existing repo artifacts
- DO NOT silently omit a `[DECISION]` marker when uncertain
- DO NOT write agent-facing output in a language other than English for this repository
- DO NOT return anything before the SKILL.md frontmatter in Part 1
- DO NOT mark stylistic preferences as `[DECISION]`
