# Backup Script Executable Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every production backup shell entry point directly executable in a fresh Linux checkout so the PostgreSQL 18 container CI gate can run.

**Architecture:** Preserve all shell-script contents and operational configuration. Change only the Git index modes of the three production entry points from `100644` to `100755`, retain the existing Linux direct-invocation tests as the behavioral regression gate, and record the repair in the repository devlog.

**Tech Stack:** Git file modes, POSIX shell, Node.js test runner, GitHub Actions

---

## File Map

- Mode-only modify: `ops/backup/backup.sh` — scheduled backup container command.
- Mode-only modify: `ops/backup/restore-drill.sh` — directly invoked restore workflow.
- Mode-only modify: `ops/backup/restore-entrypoint.sh` — documented recovery container entry point.
- Modify: `.agents/devlog.md` — factual record of the CI permission repair and remaining GitHub Actions gate.

### Task 1: Record the executable contract in Git

**Files:**
- Mode-only modify: `ops/backup/backup.sh`
- Mode-only modify: `ops/backup/restore-drill.sh`
- Mode-only modify: `ops/backup/restore-entrypoint.sh`

- [x] **Step 1: Verify the existing regression failure condition**

Run:

```powershell
git ls-files -s ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
```

Expected RED: all three entries start with `100644`. This matches GitHub Actions run `33382160682`, where the existing Linux contract tests fail with `Permission denied` when directly invoking `restore-drill.sh`; `backup.sh` has the same invalid mode and is invoked later by the same test.

- [x] **Step 2: Apply the minimal mode-only implementation**

Run:

```powershell
git update-index --chmod=+x ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
```

Do not edit any script contents.

- [x] **Step 3: Verify the Git index is GREEN**

Run:

```powershell
git ls-files -s ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
git diff --summary -- ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
git diff --numstat -- ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
```

Expected: every index entry starts with `100755`; the summary reports only three mode changes; numstat reports `0 0` for every script.

- [x] **Step 4: Verify the staged tree behaves like a fresh Linux checkout**

Create a temporary tree object from the index, archive it, extract it inside the WSL Linux filesystem, and run both POSIX fixtures:

```powershell
$tree = git write-tree
New-Item -ItemType Directory -Force .session | Out-Null
New-Item -ItemType File -Force (Join-Path (Get-Location) '.session/backup-script-modes.tar') | Out-Null
$archive = ((Resolve-Path -LiteralPath (Join-Path (Get-Location) '.session/backup-script-modes.tar')).Path).Replace('\', '/')
try {
    git archive --format=tar -o $archive $tree ops/backup
    $linuxArchive = (wsl.exe wslpath -a $archive).Trim()
    $wslScript = @'
set -eu
archive=$1
workdir="$(mktemp -d)"
cleanup() { rm -rf "$workdir"; test ! -e "$workdir"; }
trap cleanup EXIT
tar -xf "$archive" -C "$workdir"
test -x "$workdir/ops/backup/backup.sh"
test -x "$workdir/ops/backup/restore-drill.sh"
test -x "$workdir/ops/backup/restore-entrypoint.sh"
cd "$workdir"
sh ops/backup/backup-guards.test.sh
sh ops/backup/restore-semantics.test.sh
'@
    $wslScript = $wslScript.Replace("`r`n", "`n")
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = 'wsl.exe'
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.ArgumentList.Add('sh')
    $startInfo.ArgumentList.Add('-s')
    $startInfo.ArgumentList.Add('--')
    $startInfo.ArgumentList.Add($linuxArchive)
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $startInfo.StandardInputEncoding = [System.Text.UTF8Encoding]::new($false)
    $process.Start() | Out-Null
    $process.StandardInput.NewLine = "`n"
    $process.StandardInput.Write($wslScript)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if($process.ExitCode -ne 0){ throw "WSL fixture verification failed with exit code $($process.ExitCode)" }
}
finally {
    Remove-Item -LiteralPath $archive -ErrorAction SilentlyContinue
}
```

Expected: both fixture success messages appear and the command exits `0`.

- [x] **Step 5: Commit the mode-only repair**

Run:

```powershell
git add ops/backup/backup.sh ops/backup/restore-drill.sh ops/backup/restore-entrypoint.sh
git commit -m "fix(backup): preserve executable script modes"
```

Expected: the commit reports three mode changes and no content changes.

### Task 2: Document and verify the repair

**Files:**
- Modify: `.agents/devlog.md`

- [x] **Step 1: Append the implementation devlog entry**

Append exactly one new entry using the repository format:

```markdown
## 2026-08-31 — Preserve backup script executable modes

**Task:** Repair the Linux CI failure that prevented PostgreSQL 18 backup image verification.
**Scope:** `ops/backup/backup.sh`, `ops/backup/restore-drill.sh`, `ops/backup/restore-entrypoint.sh`
**What changed:**
- Recorded Git mode `100755` for all three production backup and restore entry points.
- Preserved script contents and retained the existing direct-invocation Linux contract tests.
**Decisions:** Fixed the repository executable contract instead of wrapping invocations with `sh` or adding a CI-only `chmod`.
**Known gaps / follow-ups:** GitHub Actions must pass the `Production containers` job after this commit is pushed before the PostgreSQL 18 runtime gate is considered closed.
```

- [x] **Step 2: Run the complete local contract verification**

Run outside the Windows sandbox if Node reports `spawn EPERM`:

```powershell
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs scripts/verify-ci-workflow.test.mjs
node scripts/verify-mimic-naming.mjs
git diff --check
```

Expected: 50 total tests, 48 pass, 2 Windows POSIX-only skips, 0 fail; Mimic naming verification passes; `git diff --check` exits `0`.

- [x] **Step 3: Review the complete branch diff**

Run:

```powershell
git status --short
git diff main...HEAD --stat
git diff main...HEAD --summary
git diff main...HEAD -- . ':!docs/superpowers/specs/2026-08-31-backup-script-executable-modes-design.md' ':!docs/superpowers/plans/2026-08-31-backup-script-executable-modes.md'
```

Expected: no shell content diff, exactly the intended mode changes plus the plan and devlog documentation. The approved design is already part of the branch base. Review correctness, completeness, architecture, style, security, and test coverage; fix any Critical or Important finding and repeat the verification.

- [x] **Step 4: Commit documentation and plan completion state**

Run:

```powershell
git add .agents/devlog.md docs/superpowers/plans/2026-08-31-backup-script-executable-modes.md
git commit -m "docs: record backup script mode repair"
```

- [x] **Step 5: Perform fresh pre-integration verification**

Run:

```powershell
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs scripts/verify-ci-workflow.test.mjs
node scripts/verify-mimic-naming.mjs
git diff --check
git status --short
```

Expected: the same passing counts as Step 2 and a clean worktree.

### Task 3: Integrate and close the external CI gate

**Files:**
- No file changes expected.

- [ ] **Step 1: Fast-forward `main` after explicit integration approval**

From the repository root, verify `main` has not diverged and fast-forward it:

```powershell
git merge --ff-only codex/backup-script-modes
```

Expected: fast-forward only; no merge commit or conflict.

- [ ] **Step 2: Push only after explicit user authorization**

```powershell
git push origin main
```

Expected: `origin/main` advances to the verified local `main` commit.

- [ ] **Step 3: Verify GitHub Actions**

Open the workflow run for the pushed SHA and require all jobs to pass. In particular, `Production containers` must complete these steps successfully:

- `Verify backup behavior contracts on Linux`
- `Build backup image`
- `Check backup image POSIX shell syntax`
- `Verify PostgreSQL 18 backup runtime`

Expected: the complete workflow concludes `success`. Only then mark the pending PostgreSQL 18 real Docker/Linux gate closed.
