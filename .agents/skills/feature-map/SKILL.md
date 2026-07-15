---
name: feature-map
description: Scan the DataViewer project and produce (or update) `.agents/features.md` — a feature map that breaks the product into atomic units with implementation status, key entry files, and a TODO backlog. Use when starting a new session, resuming interrupted work, or auditing project progress. Trigger phrases: "feature map", "map features", "project features", "建立 feature map", "更新 feature map".
---

# Purpose

Produce a directly-consumable `.agents/features.md` that gives any agent or new session:

1. The **MVP core path** — the minimal ordered sequence of features required for end-to-end usability.
2. **Feature atoms** — the smallest independently understandable units of functionality, each with status and entry-file pointers.
3. A **TODO backlog** — remaining work not yet implemented.

This file is the session-continuity artifact. It is not a design document — it reflects current reality as verified from the codebase and planning docs.

---

# Use When

- Starting a new session on this project before writing any code
- Resuming interrupted work after a session break
- Auditing which features are done vs. in-progress vs. not started
- Breaking a large feature into implementable sub-units for the next session

---

# Do Not Use When

- The user only needs a high-level architecture overview — use `explain-repo` instead
- The user is asking about a single specific feature in isolation — answer directly
- `.agents/features.md` was already loaded this session and the user has not asked to refresh it

---

# Inputs

**Required (inferred from repo — no user input needed):**
- `docs/implementation-plan.md` — milestone status and detailed progress notes
- `spec.md` — product spec, functional requirements, non-goals
- `src/lib/api.ts` — the frontend/backend contract; lists every implemented Tauri command
- `src-tauri/src/commands/` — Rust command handlers (verifies what is actually wired up)

**Optional (read if available):**
- `src/features/*/pages/*.tsx` — spot-check UI pages to confirm feature presence
- `src-tauri/src/workspace_service.rs` top-level (first 80 lines) — confirms service-layer completeness

If `docs/implementation-plan.md` is missing, read `spec.md` only and mark all status fields as `[DECISION]`.

---

# Trustworthy Sources (precedence order)

1. **`docs/implementation-plan.md`** — authoritative for milestone status and what is known to be done or in-progress
2. **`src/lib/api.ts`** — authoritative for which Tauri commands have a frontend wrapper (proxy for "implemented")
3. **`src-tauri/src/commands/*.rs`** — authoritative for which commands are wired into the Tauri invoke handler
4. **`spec.md`** — authoritative for what the product is supposed to do (scope, non-goals)
5. **Existing SKILL.md files** — reference for structure and tone only

Do NOT mark a feature `done` based solely on `implementation-plan.md` if `api.ts` has no corresponding call. When sources conflict, the lower-level source (Rust command handler) wins.

---

# Steps

## Step 1 — Check for existing features.md

```
Read .agents/features.md
```

If it exists: this is an **update run**. Note the existing status values; compare against current source to detect regressions or new completions. Write the result as a full replacement (not a patch).

If it does not exist: this is a **first run**. Proceed to Step 2.

## Step 2 — Read planning and spec documents

Read in parallel:
- `docs/implementation-plan.md` (full file)
- `spec.md` (full file)

Extract:
- Milestone status table (section 3 of implementation-plan.md)
- Detailed "已完成" and "尚未完成" bullets per milestone
- Non-goals listed in spec.md section 3 (these become explicit exclusions in the backlog)

## Step 3 — Verify against code

Read:
- `src/lib/api.ts` — extract every exported function name and its `invoke()` command string
- `src-tauri/src/commands/mod.rs` (or equivalent) — extract every registered command name

For each command in `api.ts`: confirm a matching handler exists in `src-tauri/src/commands/`. If a frontend wrapper exists but no Rust handler: mark as `[in-progress]`, not `[done]`.

## Step 4 — Spot-check UI pages (optional, do if Step 3 is ambiguous)

For any feature where planning doc and api.ts disagree, read the relevant page component (first 60 lines) to determine if the UI is present.

## Step 5 — Build the feature atom list

Decompose the product into feature atoms. A **feature atom** is:
- The smallest unit of functionality that a user or agent can reason about independently
- No smaller than one Tauri command + its UI surface
- No larger than one milestone sub-section

For each atom, determine:
- **slug** — kebab-case identifier (e.g., `create-workspace`, `coco-import`)
- **status** — one of: `done` / `in-progress` / `todo` / `blocked`
- **one-line description** — what the user can do when this atom is complete
- **frontend entry** — page or component file + approximate line/function
- **backend entry** — Rust command or service function

Group atoms by domain: Workspace, Source Import, Category Alignment, Browser, CVAT, Versions, Export.

## Step 6 — Determine MVP core path

The MVP core path is the shortest ordered sequence of atoms that produces an end-to-end usable workflow (create workspace → import source → align categories → browse → send to CVAT → sync back → export). Derive from `spec.md` section 9 (Main User Flow).

## Step 7 — Build the TODO backlog

From `implementation-plan.md` "尚未完成" bullets + `spec.md` non-goals + any `[in-progress]` atoms that have known open sub-tasks: collect every item not yet `done`. Group by domain. Mark items that are explicitly out of MVP scope as `[out-of-scope]`.

## Step 8 — Write .agents/features.md

Write the file using the **exact template** defined in the Expected Output section. Do NOT echo the file contents back into the conversation — print only the saved path and a one-line summary of the delta (e.g., "3 atoms promoted to done, 2 new todo items added").

---

# Expected Output Format

Write `.agents/features.md` with this exact structure:

```markdown
# DataViewer Feature Map
_Last updated: YYYY-MM-DD. Refresh with `/feature-map`._

## MVP Core Path
Minimal ordered sequence for end-to-end usability. Each step must be `done` for the product to ship.

1. [STATUS] **slug** — one-line description · `frontend-file` · `backend-file`
2. ...

## Feature Atoms

### Workspace
| status | slug | description | frontend entry | backend entry |
|--------|------|-------------|----------------|---------------|
| done | create-workspace | ... | `HomePage.tsx` | `commands/workspace.rs` |

### Source Import
...

### Category Alignment
...

### Browser
...

### CVAT Integration
...

### Annotation Versions
...

### Export
...

## TODO Backlog

Items not yet `done`, grouped by domain. `[out-of-scope]` = explicitly excluded from MVP.

### Workspace
- [ ] ...

### Source Import
- [ ] ...

### CVAT Integration
- [ ] [out-of-scope] ...

### Export
- [ ] ...

### Stabilization
- [ ] ...
```

Status values:
- `done` — implemented, wired up frontend + backend, manually verified or test-covered
- `in-progress` — partially implemented; at least one side (frontend or backend) is present
- `todo` — not started
- `blocked` — dependency on an external system or another feature not yet done

---

# Validation

Before writing the file, verify:

- [ ] Every atom has a status sourced from at least two trustworthy sources (plan doc + api.ts or command handler)
- [ ] No atom is marked `done` if `api.ts` has no corresponding function or Rust handler is missing
- [ ] MVP core path matches `spec.md` section 9 ordering
- [ ] TODO backlog includes all "尚未完成" items from `implementation-plan.md`
- [ ] Non-goals from `spec.md` section 3 appear as `[out-of-scope]` in the backlog if they appear anywhere as feature requests
- [ ] No duplicate entries between Feature Atoms and TODO Backlog for the same slug
- [ ] The file is written to disk; no full file content echoed into the conversation

---

# Hard Rules

- DO NOT mark any feature `done` without verifying it in `api.ts` or a Rust command handler
- DO NOT invent feature atoms not derivable from `spec.md` or `implementation-plan.md`
- DO NOT echo the full `features.md` content into the conversation — write the file, then summarize the delta only
- DO NOT omit the `[out-of-scope]` tag for items explicitly excluded in `spec.md` section 3
- DO NOT use subjective language ("nearly done", "almost complete") — use the four defined status values only
- DO NOT create a separate file per feature — all atoms go into one `.agents/features.md`
- DO NOT regenerate if `.agents/features.md` was read this session and the user has not asked for a refresh
