# GitHub Publication Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the current repository tree for GitHub publication with a bilingual PWA-first README, approved pixel-art cover, portable documentation, and baseline Backend/Web CI while excluding the retiring Flutter client.

**Architecture:** Keep the maintained application boundaries unchanged: `backend/` remains the NestJS API and `web/` remains the Next.js PWA. Repository-facing work is isolated to root documentation, a dedicated README asset, ignore rules, existing Markdown portability edits, and a two-job GitHub Actions workflow. Historical Git commits remain untouched.

**Tech Stack:** Markdown, Git, GitHub Actions, Node.js 22, npm, NestJS, Prisma, Next.js, Vitest, Jest

---

### Task 1: Preserve the approved cover and create the bilingual root README

**Files:**
- Create: `docs/assets/readme/mimic-cover.png`
- Create: `README.md`
- Source asset preserved: `web/public/pixel-ui/treasury-desktop.png`

- [ ] **Step 1: Copy the approved non-destructive image edit into the repository**

Copy the selected generated image to `docs/assets/readme/mimic-cover.png`. Do not overwrite the source image under `web/public/pixel-ui/`.

- [ ] **Step 2: Verify the cover asset**

Run:

```powershell
Get-Item docs/assets/readme/mimic-cover.png | Select-Object Name, Length
```

Expected: one non-empty PNG named `mimic-cover.png`.

- [ ] **Step 3: Create the Traditional Chinese README section**

Start the file with the approved relative image and project identity:

```markdown
<p align="center">
  <img src="docs/assets/readme/mimic-cover.png" alt="mimic pixel-art treasury beside a moonlit lake" width="100%">
</p>

# mimic

**一起存，一起花，一起在異世界探險。**

mimic 是一個以 PWA 為主要使用介面的共享財務應用，協助伴侶與小型群組管理共同基金、分攤支出、追蹤成員部位並完成結算。
```

Continue with these exact section responsibilities:

- `功能特色` — shared groups/funds, contributions and expenses, flexible splits, balances, settlement suggestions, settlement locking, correction transactions.
- `核心會計規則` — money in minor units, position formula, completed-period lock, new correction transactions instead of retroactive edits.
- `技術架構` — Next.js PWA, NestJS API, PostgreSQL/Prisma, JWT.
- `快速開始` — prerequisites, `backend/.env.example`, `web/.env.example`, repository-relative commands.
- `驗證` — backend and Web commands.
- `專案結構` — only `backend/`, `web/`, `docs/`, `.agents/`, and `prisma/`.
- `主要文件` — link PRD, accounting map, OpenAPI, and feature map.
- `專案狀態` — pre-release, incomplete production legal policy, license not selected.

- [ ] **Step 4: Add the complete English README section**

Separate languages with:

```markdown
---

## English
```

Mirror every Chinese section in English. Use the tagline “Save together, spend together, and explore another world together.” Do not mention Flutter, Mobile, a CI badge, or a license name.

- [ ] **Step 5: Validate README links and forbidden references**

Run:

```powershell
rg -n "mobile|flutter|D:\\Project\\mimic" README.md
Test-Path docs/assets/readme/mimic-cover.png
```

Expected: `rg` returns no matches and `Test-Path` returns `True`.

### Task 2: Exclude the retiring Mobile application and private local artifacts

**Files:**
- Modify: `.gitignore`
- Delete from current tree: `mobile/`

- [ ] **Step 1: Extend root ignore rules**

Add this focused block to `.gitignore`:

```gitignore
# Retired client and local working assets
mobile/
.codex-generated/
.merge-backup/
models/
transcripts/
```

- [ ] **Step 2: Remove the tracked Mobile directory from the current tree**

Run from the verified repository root:

```powershell
git rm -r -- mobile
```

Expected: tracked files under `mobile/` are staged as deletions; prior commits remain unchanged.

- [ ] **Step 3: Confirm exclusion behavior**

Run:

```powershell
git ls-files "mobile/**"
git check-ignore mobile models/ggml-small.bin transcripts/1784947606943_81147.wav .codex-generated .merge-backup
```

Expected: the first command returns no tracked files; every path in the second command is reported as ignored.

### Task 3: Make tracked documentation portable

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `.agents/devlog.md`
- Modify: `backend/README.md`
- Modify: `web/README.md`
- Modify: `docs/design/pairfund-mvp-trial-readiness-review-2026-04-13.md`
- Modify: `docs/superpowers/plans/2026-07-15-pairfund-invite-flow.md`
- Modify: `docs/superpowers/plans/2026-08-04-mimic-pwa-stabilization-delivery-polish.md`

- [ ] **Step 1: Correct repository overview statements**

In `AGENTS.md` and `CLAUDE.md`, replace the machine-specific working-directory sentence and obsolete “no root README” claim with:

```markdown
Run repository commands from the cloned repository root unless a section names a subdirectory. The root `README.md` provides the public project overview; detailed design specs live in `docs/`.
```

- [ ] **Step 2: Convert maintained README commands to repository-relative navigation**

In `backend/README.md`, replace each backend absolute `cd` with:

```powershell
# From the repository root
Set-Location backend
```

Remove the Flutter build-and-serve section because the current published tree excludes that client.

In `web/README.md`, describe the active checkout generically and replace named-worktree commands with repository-root navigation followed by `Set-Location backend` or `Set-Location web`. Preserve the runtime revision safeguards and port guidance.

- [ ] **Step 3: Convert historical documentation paths without changing historical intent**

Replace remaining drive-qualified backend, retired-client, and named-worktree command paths with repository-relative locations as appropriate. Historical documents may still describe the old client work; only their machine-specific paths change.

- [ ] **Step 4: Verify all tracked Markdown is portable**

Run:

```powershell
git grep -ni -E '[A-Z]:\\\\Project\\\\' -- '*.md'
```

Expected: no matches.

### Task 4: Add baseline GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

Use this complete workflow:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    name: Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - name: Check out repository
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Generate Prisma client
        run: npm run prisma:generate
      - name: Build
        run: npm run build
      - name: Test
        run: npm test -- --runInBand

  web:
    name: Web PWA
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    env:
      MIMIC_API_BASE_URL: http://localhost:3000/api/v1
      MIMIC_COOKIE_SECURE: "false"
    steps:
      - name: Check out repository
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type-check
        run: npm run typecheck
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

- [ ] **Step 2: Validate YAML and action references**

Parse the workflow with an available YAML parser and inspect that both jobs contain checkout, Node setup, install, and verification steps.

Expected: valid YAML, exactly two jobs named `backend` and `web`, and no Mobile or deployment job.

### Task 5: Record the repository publication changes

**Files:**
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Append the required devlog entry**

Append:

```markdown
## 2026-08-27 — Prepare repository for GitHub publication

**Task:** Add public repository documentation and CI while excluding the retiring Flutter client from the current tree.
**Scope:** Root README and cover asset, GitHub Actions, ignore rules, portable Markdown paths, and current-tree Mobile removal.
**What changed:**
- Added a bilingual PWA-first project README with an approved pixel-art cover.
- Added parallel Backend and Web CI jobs.
- Removed `mobile/` from the current tracked tree and ignored local/private working artifacts.
- Replaced machine-specific repository paths in tracked Markdown.
**Decisions:** Preserved Git history, internal agent documentation, author email metadata, and the original treasury source image; deferred licensing and production legal policy decisions.
**Known gaps / follow-ups:** Mobile remains available in historical commits; E2E CI, deployment automation, license selection, and production privacy/terms content remain deferred.
```

### Task 6: Run end-to-end repository verification

**Files:**
- Verify all modified and created files
- Preserve unrelated user change: `web/public/sw.js`

- [ ] **Step 1: Run Backend verification**

Run from `backend/`:

```powershell
npm run prisma:generate
npm run build
npm test -- --runInBand
```

Expected: Prisma client generation succeeds, build exits 0, and all 139 unit tests pass.

- [ ] **Step 2: Run Web verification**

Run from `web/` with the CI environment values:

```powershell
$env:MIMIC_API_BASE_URL = 'http://localhost:3000/api/v1'
$env:MIMIC_COOKIE_SECURE = 'false'
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: lint and typecheck exit 0, all 292 unit tests pass, and the production build exits 0.

- [ ] **Step 3: Re-run publication safety checks**

Run:

```powershell
git grep -ni -E '[A-Z]:\\\\Project\\\\' -- '*.md'
git ls-files "mobile/**"
git status --short --branch
git diff --check
git diff --stat
```

Expected: no absolute-path matches, no tracked Mobile files, no whitespace errors, and only the approved publication-readiness changes plus the pre-existing `web/public/sw.js` modification.

- [ ] **Step 4: Do not commit or push**

Leave all changes available in the working tree for owner review. Report the exact verification results, LICENSE options, and production privacy/terms implications.
