---
name: self-review
description: Guides the agent to iteratively self-review its own implementation changes, find issues, fix them, and repeat until no critical or important issues remain. Use after completing implementation, before claiming the task is done, when the user asks the agent to review itself, self-check, or self-audit its changes.
---

# Self-Review

## Overview

After implementing changes, the agent must critically review its own work before claiming completion. This is not a rubber-stamp — it is an adversarial pass to find real problems.

**Core principle:** Assume the implementation has bugs. Find them before the user does.

---

## Step 1 — Identify Scope

Determine what changed:

```
1. Run: `git status` then `git log --oneline -5`
   - Uncommitted changes present? → `git diff HEAD`
   - All changes already committed? → `git diff HEAD~1` (or replace with the actual base branch)
   - No git context? → use the list of files edited in this session
   - Nothing changed at all? → report "nothing to review" and stop
2. Count changed lines.
   - ≤ 200 lines: read every changed file in full
   - > 200 lines: read changed functions/sections only; note the scope limitation in the final report
```

---

## Step 1.5 — Automated Checks First

Before manual review, run any available automated checks:

- **Linter**: run linter on changed files; fix all errors before proceeding
- **Tests**: run the narrowest test suite covering the changed area; if tests fail, fix first
- **Type checker**: if applicable, run type check on changed files

Automated failures are always 🔴 Critical. Fix them before the manual review pass.

---

## Step 2 — Review Pass

For each changed area, check all seven dimensions:

| Dimension | What to look for |
|-----------|-----------------|
| **Correctness** | Logic errors, off-by-one, wrong conditions, incorrect return values |
| **Edge cases** | Null/empty/zero/negative inputs, concurrent access, resource exhaustion |
| **Completeness** | Does the change fully satisfy the original requirement? Any missing cases? |
| **Architecture** | Does it respect existing abstractions? Is responsibility correctly placed? Hidden coupling? |
| **Style** | Consistent with surrounding code? No dead code, no commented-out blocks, no placeholder comments? |
| **Security** | Injection risks, untrusted input, exposed secrets, missing auth checks |
| **Test coverage** | New code paths covered by tests? Existing tests still pass? Any asymmetry between `src/` and `test/`? |

---

## Step 3 — Classify Issues

After the review pass, produce an issue list:

```
🔴 Critical — Incorrect behavior, data loss, security vulnerability. MUST fix.
🟡 Important — Code smell, wrong abstraction, missing edge case. Should fix.
🔵 Minor — Style nit, naming preference. Fix if trivial, otherwise note.
```

If zero Critical and zero Important issues → skip to Step 5.

---

## Step 4 — Fix and Re-Review

Fix all Critical issues first, then Important issues.

After fixing, return to **Step 2** with a focused review on:
- The fixed code itself (did the fix introduce new issues?)
- Any code that interacts with the fixed areas

Repeat until no Critical or Important issues remain.

> **Loop guard**: If the same issue re-appears after 2 fix attempts, stop, describe the problem clearly, and ask the user for direction rather than continuing to loop.

---

## Step 5 — Final Report

When the review loop exits, output this report directly (not inside a code block):

---
**Self-Review Complete**

**Changes reviewed:** [List of files / areas reviewed]

**Issues found and fixed:**
- 🔴 [Issue] → [Fix]
- 🟡 [Issue] → [Fix]

**Remaining notes:**
- 🔵 [Minor issue and reasoning]

**Verdict:** CLEAN — no critical or important issues remain
_(or: UNRESOLVED — what still needs attention and why)_

---

## Anti-Patterns

- **Do not self-approve without actually reading the code.** Re-reading is mandatory.
- **Do not fix Minor issues if Critical ones remain.** Prioritize by severity.
- **Do not loop infinitely.** Use the loop guard at Step 4.
- **Do not report "looks good" without going through all seven dimensions.**
