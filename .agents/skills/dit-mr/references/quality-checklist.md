# Quality Checklist

## Self-Check

Run before final output. Revise if any check fails.

- [ ] Template structure preserved (section names, order, checklists)
- [ ] All HTML comments stripped
- [ ] No empty section headings — deleted entirely if no content
- [ ] No bare `*` remaining
- [ ] No invented or guessed changes
- [ ] No commit history description
- [ ] No file/function-level detail
- [ ] No duplicated bullets
- [ ] Correct section classification
- [ ] Each bullet starts with a verb and is ≤ 3 sentences
- [ ] Each bullet leads with the change, not the actor
- [ ] No noise included
- [ ] Summary section filled (if template includes it)
- [ ] Entire description in English — no Mandarin, no mixed language
- [ ] Output wrapped in a single ` ```markdown ` … ` ``` ` code fence

## Red Flags — Stop and Trim

Cut before returning if any apply:

- Description longer than the diff warrants
- A single bullet spans more than 3 sentences
- Bullets describe HOW (line-by-line) instead of WHAT/WHY
- Reviewer would need to read the description twice to understand the change
- Any non-English text in the description
- Any HTML comment (`<!-- ... -->`) remaining in output
- Any bare `*` or empty section heading remaining

## Examples

### ❌ Verbose, low signal

```
## Added
* Added a new function called `calculate_storage_usage` in `apt_app/services/storage.py`
  that takes a workspace_id and returns the total storage used. This function is called
  from the daily storage check task. It iterates over all projects in the workspace
  and sums up the storage of each project. The function uses async session and queries
  the database with a join.
```

### ✅ Terse, high signal

```
## Added
* Daily storage check now reports per-workspace usage (closes #1234). New
  `calculate_storage_usage(workspace_id)` aggregates project storage in one query.
```
