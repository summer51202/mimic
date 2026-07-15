---
name: explain-repo
description: Load this repo's architecture overview (`.agents/arch.md`) into the current session and surface the highest-leverage entry points (key files, extension pattern, in-repo skills) so downstream actions are informed. Use at the start of any task before modifying code, debugging, or invoking other skills. Trigger phrases: "explain repo", "load arch", "what is this repo", "解釋一下這個 repo".
---

# explain-repo

Load `.agents/arch.md` and prime the session with the most actionable parts so the next step naturally references them.

## When to use

- At the start of any task — before modifying code, debugging, or using other skills
- When asked "what is this repo / 這個 repo 在做什麼"
- Other skills may list this as a prerequisite

## Do NOT use when

- `.agents/arch.md` was already read this session (avoid re-reading)
- The user has already provided architecture context in this conversation

## Workflow

1. Read `.agents/arch.md` (full file)
   - If missing: tell the user "no arch.md found" and stop

2. Surface to the user in this exact shape:

   **Loaded**: `<repo-name>` (layer=`<layer>`) — `<role one-liner>`

   **Most likely next moves** (pulled from `Key files for development` in arch.md):
   - `<entry 1>`
   - `<entry 2>`
   - `<entry 3 if present>`
   - Other in-repo skills: `<list from Extension pattern · In-repo skills>`

   **Gotchas** (from Notes):
   - `<each bullet from Notes section>`

3. Stop and present the above. If the user already issued a task that triggered this skill, continue with that task — otherwise wait for the next request.
