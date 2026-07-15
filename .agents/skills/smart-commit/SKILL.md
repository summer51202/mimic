---
name: smart-commit
description: Analyze unstaged git changes, split them into smart multi-commit groups, order them properly, and generate optimized git add and git commit commands using conventional commit format. Use when the user asks to commit changes, split commits, write commit messages, or stage unstaged changes.
---

# Purpose

Analyze unstaged Git changes from `git diff` and generate a senior-engineer-style commit plan.

The tool must:

- inspect current unstaged changes
- split changes into logical and reviewable commits
- determine the correct commit order
- generate optimized `git add` commands
- generate meaningful conventional commit messages

The output format MUST be:

<type>: <message>

Scope is NOT allowed.

---

# Use When

- the user asks to commit the current working tree
- the user asks how to split current changes into reviewable commits
- the user asks for commit messages or executable `git add` / `git commit` commands for current unstaged changes
- the working tree changes are primarily unstaged and still need grouping decisions

---

# Do Not Use When

- the user has already intentionally staged the exact changes for the commit and only wants execution
- the user explicitly provides the exact single commit message and exact staging scope to execute as-is
- the task is about inspecting history or reviewing previous commits rather than planning commits for the current working tree

---

# Primary Workflow

This skill is designed for the following workflow:

1. inspect unstaged changes
2. determine logical commit boundaries
3. stage only the files relevant to each commit
4. order commits in a clean and reviewable sequence
5. output executable Git commands

This skill is for **unstaged changes**, not staged changes.

---

# Input

Primary input source:

- `git diff`

Optional supporting input:

- file change summaries
- partial patch content
- file list
- user-provided natural language description of the change

---

# Staging Assumption

- All changes are assumed to be unstaged
- The tool is responsible for deciding how files should be grouped and staged
- Do NOT assume any file is already staged
- If staged changes exist, first determine whether they represent intentional user-selected commit grouping
- Do NOT use `git diff --staged` as the primary source when unstaged changes are the target of this skill
- The purpose of this skill is to generate `git add` commands for proper commit grouping

---

# Core Behavior

This skill MUST:

- analyze unstaged changes
- infer the purpose of each changed file
- split changes into multiple commits when appropriate
- avoid mixing unrelated intentions
- avoid mixing commit types when practical
- output commands only
- generate clean, concise, reviewable commit groups

This skill MUST optimize for:

- reviewability
- logical separation
- minimal staging noise
- stable commit history
- practical developer workflow

---

# Output Format

Return commands ONLY.

Narrow escape hatch:

- If `AGENTS.md` requires an uncertainty, unresolved ambiguity, or unverified-risk disclosure that cannot be omitted without misleading the user, you MAY add exactly one leading shell-comment line before the commands:
- `# AGENTS disclosure: uncertainty: <specific point>`
- `# AGENTS disclosure: ambiguity: <specific point>`
- `# AGENTS disclosure: unverified risk: <specific point>`
- Use this escape hatch only when the disclosure is strictly required by `AGENTS.md`.
- Do NOT add any other prose, headings, bullets, or explanation text.

Do NOT include:

- explanations
- markdown bullets
- headings
- reasoning
- notes
- commentary

## Single commit

git add <files>
git commit -m "<type>: <message>"

## Multiple commits

git add <files_for_commit_1>
git commit -m "<type>: <message>"

git add <files_for_commit_2>
git commit -m "<type>: <message>"

git add <files_for_commit_3>
git commit -m "<type>: <message>"

---

# Allowed Commit Types

- feat: A new feature for the user
- fix: A bug fix for the user
- docs: Documentation only changes
- style: Code style changes (formatting, white-space, etc.) that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- build: Changes that affect the build system or external dependencies
- ci: Changes to CI configuration files and scripts
- chore: Other changes that don't modify source or test files
- revert: Reverts a previous commit

---

# Commit Message Rules

1. The format MUST be: <type>: <message>
2. Use lowercase for `<type>`
3. NEVER include scope
4. NEVER use: `<type>(scope): <message>`
5. Use present tense
6. Do NOT include trailing punctuation
7. Keep the message concise and meaningful
8. Prefer starting with a verb
9. Focus on purpose or outcome
10. Avoid vague messages such as:
   - update code
   - fix issue
   - cleanup
   - misc changes
11. Avoid unnecessary file names, class names, or internal abbreviations unless they improve clarity
12. Prefer reviewer-relevant wording over implementation trivia

---

# Scope Rule

- DO NOT include scope in commit message
- The format MUST be: <type>: <message>
- Never use: <type>(scope): <message>
- Do NOT infer scope from folder name, module name, package name, or file path
- If scope is generated internally, REMOVE it before returning the final result

Examples:

Bad:
feat(core): add cache support
fix(api): handle null response

Good:
feat: add cache support
fix: handle null response

---

# Type Selection Priority

When uncertain, choose based on the strongest real impact:

1. revert
2. fix
3. feat
4. perf
5. refactor
6. docs
7. test
8. build
9. ci
10. style
11. chore

Use the highest-priority type that accurately matches the actual change.

---

# Type Selection Guidance

See [Type Selection Guidance](references/type-guidance.md) for per-type examples and disambiguation.

---

# Smart Commit Splitting Strategy

## Primary Principle

Each commit should represent one clear intention.

A commit should be easy to review, easy to revert, and easy to understand.

---

## Split by Type First

Different commit types SHOULD be separated whenever practical.

Do not combine:

- feat + fix
- fix + refactor
- docs + build
- perf + test
- ci + chore

If two changes have different purposes, split them.

---

## Split by Logical Intention

Even within the same type, split commits when they represent different intentions.

Examples:

- two unrelated bug fixes → split
- feature implementation and separate test cleanup → split
- build migration and Docker dependency update with unrelated purpose → split

---

## Keep Tightly Coupled Changes Together

Do NOT over-split.

Keep changes together when they are strongly coupled and only make sense as one review unit.

Examples:

- implementation + directly related interface update
- fix + required test update for that fix
- refactor + required rename in dependent file
- feature + required schema change that only exists for that feature

---

## Prefer Reviewable Units

A commit should represent one reviewable unit, not one file.

Do not split merely because files are different.

Do split when reviewer intent is different.

Bad grouping:
- split by folder only
- split by extension only
- split by file count only

Good grouping:
- split by purpose
- split by behavior change
- split by review intent

---

# Commit Ordering Strategy

Commit order MUST be optimized for readable history.

## General Ordering Rules

1. foundational setup first
2. structural changes second
3. behavior changes third
4. correctness fixes next
5. performance tuning after correctness unless foundational
6. tests after related code unless tests are independent
7. docs after related code unless docs are standalone
8. CI/build changes before code only when code depends on them

---

## Preferred Ordering Heuristics

When multiple commits exist, prefer this order if it matches the actual changes:

1. revert
2. build
3. ci
4. refactor
5. feat
6. fix
7. perf
8. test
9. docs
10. style
11. chore

This is not absolute. Practical dependency order takes priority.

---

## Dependency-First Rule

If commit B depends on commit A, then A must appear first.

Examples:

- build config required before source layout change → build first
- refactor required before feature extension → refactor first
- feature introduced before docs or tests referencing it → feature first
- bug fix introduced before perf tuning built on top of it → fix first

---

# Git Add Optimization Rules

## Explicit Staging

- Prefer explicit file paths
- Do NOT use `git add .` unless the user explicitly asks to stage everything
- Do NOT use `git add -A` unless explicitly requested
- Only stage files relevant to that commit

## Minimal Staging Surface

Each `git add` command should include only the minimum necessary file set for that commit.

Good:
git add src/cache.cpp src/cache.h

Bad:
git add src tests docs CMakeLists.txt

## Group Related Files

Stage files together only when they belong to the same logical commit.

Examples of acceptable grouping:

- implementation + header
- source + related config
- source + directly related test
- README + docs example for the same feature

## Avoid Staging Noise

Do not pull unrelated files into a commit just because they were changed at the same time.

---

# Diff Analysis Heuristics

See [Diff Analysis Heuristics](references/diff-heuristics.md) for file-type-to-commit-type mapping.

---

# Senior Engineer Workflow Preferences

Optimize output for the following workflow principles:

- commits should be easy to review in code review
- commits should be logically revertable
- history should tell a clean story
- noisy mixed commits should be avoided
- foundational cleanup before behavioral change is preferred
- test and docs placement should feel intentional
- commit messages should be specific enough to be useful months later

---

# Practical Decision Rules

## Rule 1: Do not mix bug fix and refactor unless inseparable

If behavior correction and structural cleanup can stand alone, split them.

## Rule 2: Keep mandatory test updates with the related code when tightly coupled

If tests only exist to validate one specific fix or feature, keeping them together is acceptable.

## Rule 3: Separate broad formatting changes from behavior changes

Formatting-only changes should not hide real logic changes.

## Rule 4: Prefer one meaningful commit over many tiny commits

Do not split into trivial fragments.

## Rule 5: Prefer multiple commits over one mixed commit

If the reviewer would describe the changes as different intentions, split them.

## Rule 6: Build and CI changes should not absorb product code changes

Keep infrastructure changes isolated unless inseparable.

## Rule 7: Docs should follow the code they document

Unless the docs are standalone housekeeping, place docs after the relevant code change.

---

# Handling Partial Information

If only partial information is available:

- infer conservatively
- choose the most defensible commit type
- keep commit messages general but meaningful
- use `<files>` if exact file paths are unknown
- do NOT invent missing file names
- do NOT invent code changes
- do NOT fabricate additional commit groups

---

# Handling Ambiguity

When a change could be either `refactor` or `perf`:

- use `perf` if performance improvement is clearly the main purpose
- otherwise use `refactor`

When a change could be either `fix` or `refactor`:

- use `fix` if behavior is corrected
- otherwise use `refactor`

When a change could be either `build` or `ci`:

- use `ci` only for pipeline/workflow execution
- use `build` for build system or dependency/toolchain changes

When a change could be either `style` or `refactor`:

- use `style` only when semantics do not change at all
- otherwise use `refactor`

When a change could be either `chore` or any other type:

- prefer the more specific type
- use `chore` only as fallback

---

# Do Not

- Do NOT output explanations
- Do NOT output reasoning
- Do NOT add prose before commands
- Do NOT add prose after commands
- Do NOT use the `AGENTS disclosure` escape hatch unless `AGENTS.md` forces a specific disclosure
- Do NOT include markdown bullets in the final output
- Do NOT include scope
- Do NOT combine unrelated changes
- Do NOT use `git add .` by default
- Do NOT use fake file paths
- Do NOT hallucinate missing changes
- Do NOT over-split tiny dependent edits
- Do NOT choose `chore` when a more precise type exists
- Do NOT hide logic changes inside `style`
- Do NOT hide correctness changes inside `refactor`
- Do NOT treat "the user asked me to commit" as permission to bypass this skill when unstaged changes are the target
- Do NOT re-group intentionally staged changes unless the user explicitly asks for regrouping

---

# Examples

See [Examples](references/examples.md) for multi-commit output samples.

---

# Feedback Loop

After issuing all commit commands, run:

```
git status
```

Verify no unexpected files remain unstaged or staged. If residual changes exist, surface them to the user before continuing.

---

# Final Instruction

Given unstaged changes, return the best practical multi-commit command sequence for a clean professional workflow.

The result must:

- stage files intentionally
- separate unrelated purposes
- preserve dependency order
- use conventional commit format without scope
- output commands only
