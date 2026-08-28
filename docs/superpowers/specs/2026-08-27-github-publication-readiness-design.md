# GitHub Publication Readiness Design

**Date:** 2026-08-27
**Status:** Approved for implementation planning
**Scope:** Repository-facing documentation, public cover artwork, tracked-tree cleanup, portable documentation paths, and baseline GitHub Actions CI

## Goal

Prepare the repository for an initial GitHub publication centered on the mimic Web PWA and NestJS backend. The published current tree must exclude the retiring Flutter client, present the project clearly in Traditional Chinese and English, and run stable automated checks for both maintained applications.

## Repository Positioning

- The public project name is **mimic**; PairFund remains the domain and backend package name where already established.
- The Web PWA is the primary user-facing client.
- The NestJS API is the maintained backend.
- The Flutter application is not part of the current published tree and must not be mentioned in the root README.
- Historical commits are preserved. Consequently, the removed `mobile/` directory remains discoverable in older commits.

## README Design

Create a root `README.md` with Traditional Chinese first and a complete English version after a clear language divider.

Both language sections cover:

1. Project identity and PWA-first positioning.
2. Core product capabilities for shared funds, contributions, expenses, balances, and settlements.
3. The accounting invariant that completed settlement periods are locked and corrections are represented by new transactions.
4. Maintained architecture: Next.js PWA, NestJS API, PostgreSQL, Prisma, and JWT authentication.
5. Repository layout limited to maintained and public-facing areas.
6. Local prerequisites, environment setup, and startup commands using repository-relative navigation.
7. Verification commands for backend and Web.
8. Links to the product requirements, accounting map, API specification, and feature map.
9. Honest project status, including that the product remains pre-release and that production legal policies are not final.

The README must not include:

- Flutter or `mobile/` references.
- Machine-specific paths.
- A CI badge before the GitHub owner and repository slug are known.
- A license claim before the owner selects a license.

## README Cover

Use the approved edit of `web/public/pixel-ui/treasury-desktop.png` as a dedicated README banner:

- Remove the complete left parchment information panel and its internal frame.
- Replace the removed area with a seamless continuation of the night sky, lake, grass, flowers, rocks, and foliage.
- Preserve the outer gold frame, Mimiku mascot, cottage, path, coins, bag, barrel, and right-side composition.
- Keep the crisp pixel-art treatment and wide aspect ratio.
- Add no text, logo, watermark, UI panel, or new character.

Save the non-destructive project copy as `docs/assets/readme/mimic-cover.png`. Keep the original source image unchanged.

## Current-Tree Cleanup

Remove the tracked `mobile/` directory from the current tree without rewriting history. Add `mobile/` to the root `.gitignore` so local copies cannot be accidentally re-added.

Also ignore local or private working assets that must not be published:

- `.codex-generated/`
- `.merge-backup/`
- `models/`
- `transcripts/`

Do not remove or hide `.agents/`, `AGENTS.md`, `CLAUDE.md`, planning documents, the development log, or existing commit author information.

## Portable Documentation Paths

Replace tracked Markdown instructions that depend on a drive-qualified local repository path or a named local worktree with repository-relative navigation.

Preferred command style:

```powershell
# From the repository root
Set-Location backend
```

For commands that need to return to the root, use `Set-Location ..` or start a new command block with an explicit “From the repository root” note. Historical planning documents may retain file-path examples that are already relative; only machine-specific absolute paths are rewritten.

## Continuous Integration

Create `.github/workflows/ci.yml` with two independent jobs triggered for pushes to `main` and pull requests targeting `main`.

Shared workflow behavior:

- Use Ubuntu runners.
- Use Node.js 22.
- Cache npm dependencies through `actions/setup-node` and the relevant lockfile.
- Cancel an older in-progress run when a newer commit is pushed to the same branch or pull request.
- Grant only read access to repository contents.

### Backend Job

Run from `backend/`:

1. `npm ci`
2. `npm run prisma:generate`
3. `npm run build`
4. `npm test -- --runInBand`

The job does not require a PostgreSQL service because it runs the existing mocked/unit suite rather than database-backed acceptance tests.

### Web Job

Run from `web/`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

Provide non-secret local build values for `MIMIC_API_BASE_URL` and `MIMIC_COOKIE_SECURE` if the production build requires them. Do not embed production credentials.

### Deferred CI Coverage

The initial workflow deliberately excludes PostgreSQL service containers, backend E2E, Playwright E2E, runtime acceptance, deployment, and Flutter checks. These can be added as separate workflows after the baseline CI is stable.

## Verification

Before delivery:

- Confirm the root README renders its relative banner and links correctly.
- Confirm no tracked Markdown file contains the former drive-qualified repository path.
- Confirm `mobile/` is absent from the current tracked tree and ignored.
- Confirm local models, transcripts, generated images, and merge backups are ignored.
- Parse or otherwise validate the workflow YAML.
- Run the backend install-equivalent checks, Prisma generation, build, and unit tests.
- Run Web lint, typecheck, unit tests, and production build.
- Inspect `git status` and `git diff` so unrelated user changes, especially `web/public/sw.js`, remain visible and are not silently discarded.

## Out of Scope

- Creating, rewriting, or pushing Git commits.
- Configuring a GitHub remote or repository settings.
- Rewriting history to remove Flutter or author email data.
- Selecting or adding a software license.
- Replacing draft privacy or terms pages with production legal documents.
- Adding deployment automation or E2E infrastructure.
