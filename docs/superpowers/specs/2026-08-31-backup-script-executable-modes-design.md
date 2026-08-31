# Backup Script Executable Modes Design

## Context

The PostgreSQL 18 CI run reaches the Linux-only backup contract tests, but the
tests cannot execute repository scripts that Git checks out as mode `100644`.
The failure occurs before any PostgreSQL 18 image build or runtime check:
`backup-guards.test.sh` and `restore-semantics.test.sh` receive `Permission
denied` when invoking `restore-drill.sh` directly. `backup.sh` is invoked the
same way later in the guard test and has the same incorrect repository mode.

Windows development did not expose the defect because the repository uses
`core.filemode=false`, and the WSL view of the Windows worktree does not
reproduce Linux checkout permissions.

## Decision

Record executable mode `100755` in Git for the three production shell entry
points:

- `ops/backup/backup.sh`
- `ops/backup/restore-drill.sh`
- `ops/backup/restore-entrypoint.sh`

Do not change script contents, test invocation semantics, the backup image,
PostgreSQL configuration, Railway resources, credentials, schedules, or
storage. The existing direct-invocation Linux tests remain the behavioral
regression gate. `restore-entrypoint.sh` is included because the recovery
runbook invokes it as a container entry point, even though the Dockerfile also
normalizes its in-image permission.

## Alternatives Rejected

- Calling every script through `sh` would make CI pass while concealing an
  invalid executable contract in a normal Linux checkout.
- Adding `chmod` to CI would repair only the CI workspace and would not protect
  other checkouts.

## Verification

1. Confirm the three Git index entries are mode `100755`.
2. Run the backup contract suite, including both POSIX-only behavior tests in a
   Linux environment where available.
3. Run the production-image and parsed CI workflow contract tests.
4. Run the active Mimic naming guard and `git diff --check`.
5. After push, require the GitHub Actions `Production containers` job to pass,
   including the PostgreSQL 18 image build and runtime check.

## Success Criteria

- A fresh Linux checkout can invoke all three production scripts directly.
- No shell-script contents or operational configuration change.
- The complete GitHub Actions workflow passes for the corrected commit.
