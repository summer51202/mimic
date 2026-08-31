# PostgreSQL 18 Backup Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a pinned, non-root Mimic backup/restore image whose PostgreSQL client major matches Railway PostgreSQL 18.

**Architecture:** Keep the existing Alpine-based backup image and fail-closed shell scripts. Move the immutable base to Alpine 3.23.5, change only version fixtures and contracts from PostgreSQL 16 to 18, and make CI prove both dump and restore binaries are major 18 before the image can pass.

**Tech Stack:** Docker, Alpine Linux 3.23.5, PostgreSQL 18 client tools, POSIX shell, Node.js 22 test runner, GitHub Actions.

---

## File Structure

- `ops/backup/Dockerfile`: pinned production backup/restore image and PostgreSQL client default.
- `ops/backup/backup-contract.test.mjs`: offline contracts for the image, scripts, runbook, and recovery controls.
- `ops/backup/backup-guards.test.sh`: hostile-input fixtures; only its declared client major changes.
- `ops/backup/restore-semantics.test.sh`: successful restore fixture with internally consistent PostgreSQL 18 server, manifest, and client versions.
- `scripts/verify-production-images.test.mjs`: immutable base-image allowlist.
- `.github/workflows/ci.yml`: real Linux image build and runtime version checks.
- `scripts/verify-ci-workflow.mjs`: parsed workflow contract requiring PG18 dump and restore checks.
- `scripts/verify-ci-workflow.test.mjs`: regression test proving stale PG16 workflow checks are rejected.
- `docs/operations/postgres-recovery.md`: active PG18 build and evidence instructions.
- `.agents/features.md`: feature completion state.
- `.agents/devlog.md`: factual implementation record.

### Task 1: Drive every PostgreSQL 18 expectation red

**Files:**
- Modify: `ops/backup/backup-contract.test.mjs`
- Modify: `ops/backup/backup-guards.test.sh`
- Modify: `ops/backup/restore-semantics.test.sh`
- Modify: `scripts/verify-production-images.test.mjs`
- Modify: `scripts/verify-ci-workflow.test.mjs`

- [ ] **Step 1: Change the backup image contract to the approved PG18 identity**

Replace the two version assertions in `backup image fixes its Alpine release and PostgreSQL major and runs unprivileged` with exact values:

```js
assert.match(
  dockerfile,
  /^FROM alpine:3\.23\.5@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40$/m,
);
assert.match(dockerfile, /^ARG POSTGRES_MAJOR=18$/m);
```

In `runbook follows Railway sibling PITR and immutable signed-backup procedures`, add:

```js
assert.match(
  runbook,
  /docker build --build-arg POSTGRES_MAJOR=18 -f ops\/backup\/Dockerfile ops\/backup -t mimic-backup:pg18/,
);
assert.doesNotMatch(
  runbook,
  /POSTGRES_MAJOR=16|mimic-backup:pg16|client-16/,
);
```

- [ ] **Step 2: Change the production-image allowlist to the approved base**

Replace the backup image arguments to `assertPinnedBaseImages` with:

```js
assertPinnedBaseImages(
  dockerfile,
  "alpine:3.23.5",
  "fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40",
);
```

- [ ] **Step 3: Make every shell fixture internally PG18-consistent**

In `ops/backup/backup-guards.test.sh`, replace both occurrences of:

```sh
export MIMIC_POSTGRES_CLIENT_MAJOR='16'
```

with:

```sh
export MIMIC_POSTGRES_CLIENT_MAJOR='18'
```

In `ops/backup/restore-semantics.test.sh`, make these exact replacements:

```sh
*server_version_num*) printf '%s\n' '180006' ;;
printf '%s\n' 'pg_restore (PostgreSQL) 18.6'
source_postgres_version_num=180006
postgres_major=18
export MIMIC_POSTGRES_CLIENT_MAJOR='18'
```

Do not alter guard ordering, database identity checks, storage mocks, or restore arguments.

- [ ] **Step 4: Add the failing parsed-workflow regression test**

Append this test to `scripts/verify-ci-workflow.test.mjs`:

```js
test("container CI rejects PostgreSQL 16 backup runtime checks", () => {
  const staleWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = staleWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  smokeStep.run = smokeStep.run.replaceAll("18", "16");

  assert.throws(
    () => validateCiWorkflow(staleWorkflow),
    /containers must run .*18/,
  );
});
```

- [ ] **Step 5: Run all new expectations and verify RED**

Run:

```powershell
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs scripts/verify-ci-workflow.test.mjs
```

Expected: FAIL because `ops/backup/Dockerfile` still declares Alpine 3.22.2 and `POSTGRES_MAJOR=16`, the runbook still contains the PG16 gate, and the CI validator does not yet reject the stale PG16 workflow. On Windows, run outside the sandbox if Node reports `spawn EPERM`; the two POSIX-only subtests remain skipped locally.

### Task 2: Upgrade the image and recovery guidance

**Files:**
- Modify: `ops/backup/Dockerfile`
- Modify: `docs/operations/postgres-recovery.md`

- [ ] **Step 1: Implement the minimal Dockerfile change**

Replace the first four lines with:

```dockerfile
FROM alpine:3.23.5@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40

ARG POSTGRES_MAJOR=18
RUN apk add --no-cache age aws-cli minisign postgresql${POSTGRES_MAJOR}-client
```

Leave the non-root user, `MIMIC_POSTGRES_CLIENT_MAJOR`, copied files, permissions, and command unchanged.

- [ ] **Step 2: Replace the active PG16 runbook gate with PG18 instructions**

Replace the version-policy introduction and build command with:

````markdown
Logical backup and restore fail closed unless source server, backup client,
signed-manifest major, target server, and restore client all share one
PostgreSQL major. The backup image matches Mimic's Railway PostgreSQL 18 server
and fixes Alpine release 3.23.5:

```sh
docker build --build-arg POSTGRES_MAJOR=18 -f ops/backup/Dockerfile ops/backup -t mimic-backup:pg18
```

Before deploying the unscheduled backup service, retain the image digest/SBOM
and verify `SHOW server_version_num`, `pg_dump --version`, and
`pg_restore --version` all report major 18. A successful scratch restore drill
is still required before any schedule is enabled.
````

Retain the existing rule that a Railway database-major change requires a matching image first. Remove only the obsolete statement that the repository image is intentionally incompatible with Railway.

- [ ] **Step 3: Run the focused image contracts and verify GREEN**

Run:

```powershell
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs
node scripts/verify-mimic-naming.mjs
git diff --check
```

Expected: all Node tests pass except the two documented POSIX-only Windows skips; naming and diff checks exit 0.

- [ ] **Step 4: Commit the image and recovery-contract change**

```powershell
git add ops/backup/Dockerfile ops/backup/backup-contract.test.mjs ops/backup/backup-guards.test.sh ops/backup/restore-semantics.test.sh scripts/verify-production-images.test.mjs docs/operations/postgres-recovery.md
git commit -m "build(backup): upgrade PostgreSQL client to 18"
```

### Task 3: Make CI reject stale client-major checks

**Files:**
- Modify: `scripts/verify-ci-workflow.test.mjs`
- Modify: `scripts/verify-ci-workflow.mjs`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Strengthen the parsed workflow validator**

In the `containerCommands` expected-command array in `scripts/verify-ci-workflow.mjs`, retain the existing commands and add or replace entries so it includes:

```js
'MIMIC_POSTGRES_CLIENT_MAJOR" = "18',
"pg_dump --version",
"pg_restore --version",
"PostgreSQL\\) 18\\.",
```

The validator must therefore reject a workflow whose runtime block checks major 16 or omits `pg_restore`.

- [ ] **Step 2: Update the real CI runtime checks**

In `.github/workflows/ci.yml`, replace the backup part of the smoke command with:

```yaml
docker run --rm --entrypoint /bin/sh mimic-backup:ci -c '
  test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"
  pg_dump --version | grep -Eq "^pg_dump \(PostgreSQL\) 18\."
  pg_restore --version | grep -Eq "^pg_restore \(PostgreSQL\) 18\."
  age --version
  command -v minisign
  aws --version
'
```

- [ ] **Step 3: Run the CI and image contracts and verify GREEN**

Run:

```powershell
node --test scripts/verify-ci-workflow.test.mjs
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs
git diff --check
```

Expected: all parsed workflow and image contracts pass, with only the two documented POSIX-only Windows skips.

- [ ] **Step 4: Commit the CI enforcement**

```powershell
git add .github/workflows/ci.yml scripts/verify-ci-workflow.mjs scripts/verify-ci-workflow.test.mjs
git commit -m "ci: verify PostgreSQL 18 backup clients"
```

### Task 4: Record completion and run final verification

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the feature map**

Change the backup tooling status to:

```markdown
- [x] Error-only Sentry integration and encrypted/signed PostgreSQL backup/restore tooling are repository-ready for the PG18 contract
```

Mark the client upgrade item complete:

```markdown
- [x] Upgrade and pin the backup/restore image to PostgreSQL client 18 before creating the Railway backup service
```

Do not mark external storage, the `mimic_backup` role, restore drills, Railway volume backups, PITR, backup service, or cron complete.

- [ ] **Step 2: Append the required devlog entry**

Append:

```markdown
## 2026-08-31 — Upgrade backup clients to PostgreSQL 18

**Task:** Align the encrypted backup and restore image with Railway PostgreSQL 18.
**Scope:** backup Docker image, image and shell contracts, container CI, recovery runbook, feature map
**What changed:**
- Pinned the backup image to Alpine 3.23.5 and made PostgreSQL client 18 the production default.
- Updated dump/restore fixtures and CI to verify both client binaries report major 18.
- Replaced the obsolete PG16 incompatibility gate with PG18 build and evidence instructions.
**Decisions:** Preserve the existing Alpine image, non-root runtime, artifact format, encryption/signing sequence, and fail-closed version checks; keep all Railway backup services and schedules absent.
**Known gaps / follow-ups:** Provision immutable external storage and the dedicated `mimic_backup` role, then run a real unscheduled backup and scratch restore drill before adding any cron or opening Production.
```

- [ ] **Step 3: Run the complete local verification set**

Run:

```powershell
node --test ops/backup/backup-contract.test.mjs scripts/verify-production-images.test.mjs scripts/verify-ci-workflow.test.mjs
node scripts/verify-mimic-naming.mjs
git diff --check
git status --short
```

Expected: Node tests pass with exactly the two POSIX-only tests skipped on Windows, naming and diff checks exit 0, and only the two progress files remain uncommitted.

- [ ] **Step 4: Commit the progress record**

```powershell
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record PostgreSQL 18 backup readiness"
```

- [ ] **Step 5: Verify the Linux-only and real-image gates in GitHub CI**

Push the reviewed branch and require the `Production containers` job to pass. That job must:

```sh
node --test ops/backup/backup-contract.test.mjs
docker build -f ops/backup/Dockerfile ops/backup -t mimic-backup:ci
docker run --rm --entrypoint /bin/sh mimic-backup:ci -c '
  test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"
  pg_dump --version | grep -Eq "^pg_dump \(PostgreSQL\) 18\."
  pg_restore --version | grep -Eq "^pg_restore \(PostgreSQL\) 18\."
'
```

Expected: the Linux shell guard/restore-semantics tests, image build, and all three runtime checks pass. If GitHub CI is unavailable, do not claim the real image gate complete; report local contract results separately.

- [ ] **Step 6: Self-review the branch before integration**

Review the complete diff against `docs/superpowers/specs/2026-08-31-postgresql-18-backup-client-design.md`. Confirm there are no PG16 active instructions, no secret values, no Railway IaC/resource changes, and no modifications to `backup.sh` or `restore-drill.sh`. Fix every Critical or Important finding and repeat the focused tests.
