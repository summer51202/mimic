---
name: cpp-quality-check
description: Run the three-stage C++ quality check pipeline (pre-commit, cpplint, cppcheck) in the correct order. Use when the user asks to run quality check, quality checks, lint, static analysis, pre-commit checks, or wants to verify code before committing. Also use when the user mentions pre-commit, cpplint, or cppcheck by name. Trigger phrases include: "run quality check", "跑 quality check", "quality check", "品質檢查", "靜態分析", "跑 lint", "跑 cpplint", "跑 cppcheck", "跑檢查", "code check".
---

# C++ Quality Check

Three stages run in order from the **project root**. Stop at the first unrecoverable failure.

If the user asks to run only a specific stage, run only that stage.

---

## Prerequisites

```bash
python -m pip install pre-commit
pip install cpplint
# CppCheck (Windows): http://cppcheck.net/
```

---

## Stage 1 — pre-commit

```bash
pre-commit run --all-files
```

pre-commit exit code 1 has two distinct cases — determine which by reading the output:

| Output contains | Meaning | Action |
|-----------------|---------|--------|
| `Fixed` | Hook auto-fixed files | Re-stage modified files (`git add`), then **re-run Stage 1** |
| `Failed` | Hook failed, no auto-fix | Stop. Report which hook failed and why |

Do not proceed to Stage 2 until Stage 1 exits with code 0.

---

## Stage 2 — cpplint

```bash
cpplint --exclude build --recursive .
```

- Picks up `CPPLINT.cfg` from the project root automatically if present.
- Exit code non-zero: stop and report violations. Do not proceed to Stage 3.

---

## Stage 3 — cppcheck

Before running, check whether `.cppcheck-suppressions-list.txt` exists in the project root:

- **Exists** → run with suppressions:
  ```bash
  cppcheck --error-exitcode=1 --enable=all -i test -i build --std=c++17 --check-level=exhaustive --inline-suppr --suppressions-list=.cppcheck-suppressions-list.txt .
  ```
- **Does not exist** → run without:
  ```bash
  cppcheck --error-exitcode=1 --enable=all -i test -i build --std=c++17 --check-level=exhaustive --inline-suppr .
  ```

---

## Edge Cases

### pre-commit: first run is slow

Hooks download binaries on first use (clang-format, typos, gersemi). This is normal — wait for completion.

### pre-commit: auto-fix loop cap

After auto-fix → re-stage → re-run, if Stage 1 exits non-zero again:
- If files were modified again: do **not** loop a third time. Report as unstable auto-fix and stop.
- If files were not modified: report the failing hook.

Maximum retries for Stage 1: **1**.

### pre-commit: typos hook does not auto-fix

`typos` reports errors but does not modify files. On failure:
- Fix the typo in the source, or
- Add the word to `.typos.toml` under `[default.extend-words]` if it is intentional (e.g. identifiers, domain terms).

### pre-commit: CRLF → LF conversion on Windows

`mixed-line-ending` converts CRLF to LF and modifies files. This is expected behavior — treat as normal auto-fix.

### pre-commit: stale cache

If hooks fail with unexpected environment errors, run:
```bash
pre-commit clean
pre-commit run --all-files
```

### cppcheck: not found on Windows

Windows installer does not add cppcheck to PATH automatically.
Ask the user to add the install directory (e.g. `C:\Program Files\Cppcheck`) to their system PATH, then retry.

---

## Reporting

### On success

After each stage passes, output a one-line confirmation immediately:

```
[Stage 1] pre-commit  ✓
[Stage 2] cpplint     ✓
[Stage 3] cppcheck    ✓

All checks passed.
```

### On failure

When a stage exits with non-zero (and is not the auto-fix case):

1. Output the stage name and exit code.
2. Quote the relevant error output (trimmed, not the full log).
3. Analyze the root cause — explain WHY the check failed, not just WHAT the output says.
   - pre-commit: "trailing-whitespace hook failed — 3 files contain trailing spaces"
   - cpplint: "`build/include_order` not suppressed in CPPLINT.cfg — add `-build/include_order` to filters"
   - cppcheck: "uninitialized variable `x` at line 42 — declared but not assigned before use"
4. Suggest the minimal fix when the cause is clear.
5. Do not claim checks passed unless all executed stages exit with code 0.
