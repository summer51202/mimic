# Mimic Baseline and Railway Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Mimic-only active repository and a deployable, privacy-safe Railway staging/production foundation without implementing the later identity or accounting feature slices.

**Architecture:** Preserve the existing Next.js BFF → NestJS API → PostgreSQL boundary. This plan retires leftover Flutter artifacts, completes active technical naming, adds independently testable liveness/readiness endpoints, production containers, privacy-filtered Sentry initialization, portable encrypted backup tooling, and CI/Railway operating gates. Railway application state is applied through the current Railway CLI and its generated `.railway/railway.ts`; deprecated `railway.toml`/`railway.json` files are not introduced.

**Tech Stack:** Node.js 22, NestJS 10, Prisma 5, PostgreSQL 16, Next.js 16, React 19, Serwist, Jest, Vitest, Docker, Railway CLI/IaC, Sentry, POSIX shell, `pg_dump`, `age`, S3-compatible object storage.

---

## Scope Boundary

This is plan 1 of 5 from `docs/superpowers/specs/2026-08-28-mimic-pwa-closed-beta-design.md`.

Included here:

- active Mimic naming and retired-client cleanup;
- health/readiness contracts;
- production container definitions;
- Railway environment/service scaffolding;
- minimal Sentry integration with privacy tests;
- backup/restore tooling and runbooks;
- CI gates and staging smoke verification.

Deferred to later plans:

- beta allowlist, Resend, verification, password reset, rotating refresh sessions, and auth rate limits;
- contribution/expense CRUD, categories, idempotency, centralized mutation auditing, and correction migration;
- PWA accounting routes, settlement completion UI, activity, and owner audit UI;
- personal-data export/de-identification and beta launch operations.

## File Responsibility Map

### Repository boundary and naming

- `scripts/verify-mimic-naming.mjs` — scans active product surfaces and fails on retired PairFund branding without scanning immutable history.
- `scripts/verify-mimic-naming.test.mjs` — proves scanner detection and exclusion behavior.
- `.gitignore`, `web/.gitignore` — retire local Flutter artifacts and treat generated service-worker output as build output.
- `AGENTS.md`, `CLAUDE.md`, `README.md` — current Mimic-only repository guidance.
- `docs/design/mimic-prd-v0.2-final.md` — current product source of truth.
- `docs/design/mimic-backend-accounting-module-map-v0.2.md` — current backend domain boundaries.
- `docs/design/mimic-web-ui-v0.2.md` — current PWA interaction specification.
- `docs/api/mimic-openapi-v0.2.yaml` — current API contract.
- `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/prisma/seed.ts` — runtime technical rename.

### Health and runtime configuration

- `backend/src/health/health.module.ts` — health feature registration.
- `backend/src/health/health.controller.ts` — `/health`, `/health/live`, and `/health/ready` HTTP mapping.
- `backend/src/health/health.service.ts` — database and migration readiness checks.
- `backend/src/health/health.service.spec.ts` — readiness unit coverage.
- `backend/src/app.module.ts`, `backend/test/app.e2e-spec.ts` — health module wiring and public contract tests.
- `web/src/app/api/health/live/route.ts` — Web process liveness.
- `web/src/app/api/health/ready/route.ts` — Web-to-API readiness.
- `web/src/app/api/health/health-routes.test.ts` — Web health contract coverage.

### Deployment

- `backend/Dockerfile`, `backend/.dockerignore` — production API image.
- `web/Dockerfile`, `web/.dockerignore`, `web/next.config.ts` — Next standalone production image.
- `.railway/railway.ts` — generated/pulled Railway infrastructure state; edit only after linking the actual project.
- `docs/operations/railway-deployment.md` — exact environment, service, variable, domain, migration, and promotion procedure.

### Observability

- `backend/src/observability/sentry-privacy.ts` and `.spec.ts` — backend event allowlist/scrubbing.
- `backend/src/instrument.ts`, `backend/src/main.ts`, `backend/src/app.module.ts` — NestJS Sentry initialization and global exception capture.
- `web/src/shared/observability/sentry-privacy.ts` and `.test.ts` — Web event allowlist/scrubbing.
- `web/instrumentation-client.ts`, `web/instrumentation.ts`, `web/sentry.server.config.ts`, `web/sentry.edge.config.ts`, `web/next.config.ts` — Next.js Sentry initialization.

### Backup and recovery

- `ops/backup/Dockerfile` — portable Railway cron image with PostgreSQL, AWS CLI, and `age`.
- `ops/backup/backup.sh` — encrypted weekly logical backup upload.
- `ops/backup/restore-drill.sh` — checksum, decrypt, restore, and validation orchestration.
- `ops/backup/verify-restore.sql` — migration and row-count evidence.
- `ops/backup/backup-contract.test.mjs` — static safety contract for backup scripts.
- `docs/operations/postgres-recovery.md` — snapshots, PITR, logical restore, RPO/RTO, and drill evidence.

### Verification and continuity

- `.github/workflows/ci.yml` — active-name, Backend, Web, container, and backup-tool gates.
- `.agents/features.md` — remove retired Flutter as a current product and record baseline status.
- `.agents/devlog.md` — append the completed implementation record.

## Task 1: Enforce the Active Mimic Product Boundary

**Files:**
- Create: `scripts/verify-mimic-naming.mjs`
- Create: `scripts/verify-mimic-naming.test.mjs`
- Modify: `.gitignore`
- Modify: `web/.gitignore`
- Delete from Git: `web/public/sw.js`
- Remove local generated directory after validation: `mobile/`

- [ ] **Step 1: Write the failing scanner tests**

Create `scripts/verify-mimic-naming.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findRetiredBrandReferences } from "./verify-mimic-naming.mjs";

const retiredBrand = "pair" + "fund";

test("reports retired branding in active files", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimic-name-check-"));
  try {
    await mkdir(join(root, "backend", "src"), { recursive: true });
    await writeFile(
      join(root, "backend", "src", "name.ts"),
      `export const name = "${retiredBrand}";\n`,
    );

    const matches = await findRetiredBrandReferences(root, ["backend/src"]);

    assert.equal(matches.length, 1);
    assert.match(matches[0], /backend[\\/]src[\\/]name\.ts:1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores immutable history and generated dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "mimic-name-check-"));
  try {
    await mkdir(join(root, "backend", "prisma", "migrations", "old"), {
      recursive: true,
    });
    await mkdir(join(root, "web", "node_modules", "pkg"), { recursive: true });
    await writeFile(
      join(root, "backend", "prisma", "migrations", "old", "migration.sql"),
      retiredBrand,
    );
    await writeFile(
      join(root, "web", "node_modules", "pkg", "index.js"),
      retiredBrand,
    );

    const matches = await findRetiredBrandReferences(root, [
      "backend/prisma/migrations",
      "web/node_modules",
    ]);

    assert.deepEqual(matches, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run:

```powershell
node --test scripts/verify-mimic-naming.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `verify-mimic-naming.mjs`.

- [ ] **Step 3: Implement the scanner**

Create `scripts/verify-mimic-naming.mjs`:

```js
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const retiredBrandPattern = new RegExp("pair" + "fund", "i");
const textExtensions = new Set([
  ".css",
  ".dart",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const ignoredSegments = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export const activeTargets = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".agents/features.md",
  "backend/.env.example",
  "backend/package.json",
  "backend/package-lock.json",
  "backend/prisma/seed.ts",
  "backend/src",
  "backend/test",
  "backend/README.md",
  "web/package.json",
  "web/package-lock.json",
  "web/src",
  "web/e2e",
  "web/scripts",
  "web/README.md",
  "docs/api/mimic-openapi-v0.2.yaml",
  "docs/design/mimic-prd-v0.2-final.md",
  "docs/design/mimic-backend-accounting-module-map-v0.2.md",
  "docs/design/mimic-web-ui-v0.2.md",
];

export async function findRetiredBrandReferences(root, targets = activeTargets) {
  const matches = [];
  for (const target of targets) {
    await scan(join(root, target), root, matches);
  }
  return matches.sort();
}

async function scan(path, root, matches) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOTDIR") {
      await scanFile(path, root, matches);
      return;
    }
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;
    await scan(join(path, entry.name), root, matches);
  }
}

async function scanFile(path, root, matches) {
  if (!textExtensions.has(extname(path)) && !path.endsWith(".env.example")) {
    return;
  }
  const lines = (await readFile(path, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (retiredBrandPattern.test(line)) {
      matches.push(`${relative(root, path)}:${index + 1}`);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const matches = await findRetiredBrandReferences(root);
  if (matches.length > 0) {
    console.error("Retired brand references remain in active Mimic surfaces:");
    matches.forEach((match) => console.error(`- ${match}`));
    process.exitCode = 1;
  } else {
    console.log("Active Mimic naming check passed.");
  }
}
```

- [ ] **Step 4: Run scanner unit tests**

Run:

```powershell
node --test scripts/verify-mimic-naming.test.mjs
```

Expected: 2 tests PASS.

- [ ] **Step 5: Confirm the local Flutter directory is generated residue and recoverable**

Run:

```powershell
$repoRoot = (Resolve-Path '.').Path
$mobilePath = (Resolve-Path 'mobile').Path
if ($mobilePath -ne (Join-Path $repoRoot 'mobile')) { throw 'Unexpected mobile path' }
if ((git ls-files mobile | Measure-Object).Count -ne 0) { throw 'Tracked mobile files still exist' }
if ((git log --all --oneline -- mobile | Measure-Object).Count -eq 0) { throw 'No Git history for retired mobile client' }
rg --files -uuu mobile | Select-Object -First 20
```

Expected: no tracked files, at least one historical commit, and only `.dart_tool`, `build`, `.session`, IDE, or Flutter-generated artifacts.

- [ ] **Step 6: Remove the verified generated Flutter residue**

Run:

```powershell
$repoRoot = (Resolve-Path '.').Path
$mobilePath = (Resolve-Path 'mobile').Path
if ($mobilePath -ne (Join-Path $repoRoot 'mobile')) { throw 'Refusing unexpected path' }
Remove-Item -LiteralPath $mobilePath -Recurse -Force
Test-Path -LiteralPath $mobilePath
```

Expected: `False`. This removes only ignored local build residue; source remains recoverable from Git commit history.

- [ ] **Step 7: Stop tracking generated service-worker output**

Add this line under the production section of `web/.gitignore`:

```gitignore
/public/sw.js
```

Remove the tracked generated file while retaining source `web/src/app/sw.ts`:

```powershell
git rm --cached web/public/sw.js
Remove-Item -LiteralPath (Join-Path (Resolve-Path 'web').Path 'public\sw.js') -Force -ErrorAction SilentlyContinue
```

Expected: Git stages deletion of `web/public/sw.js`; a later Web build recreates it as an ignored file.

- [ ] **Step 8: Keep retired local artifacts ignored without naming them as an active client**

Replace this `.gitignore` block:

```gitignore
# Retired client and local working assets
mobile/
.codex-generated/
```

with:

```gitignore
# Retired local build residue and working assets
/mobile/
.codex-generated/
```

- [ ] **Step 9: Commit the boundary guard**

```powershell
git add scripts/verify-mimic-naming.mjs scripts/verify-mimic-naming.test.mjs .gitignore web/.gitignore web/public/sw.js
git diff --cached --check
git commit -m "chore: enforce Mimic product boundary"
```

## Task 2: Complete the Active Technical Rename

**Files:**
- Rename: `docs/design/pairfund-prd-v0.2-final.md` → `docs/design/mimic-prd-v0.2-final.md`
- Rename: `docs/design/pairfund-backend-accounting-module-map-v0.2.md` → `docs/design/mimic-backend-accounting-module-map-v0.2.md`
- Rename: `docs/design/pairfund-web-ui-v0.2.md` → `docs/design/mimic-web-ui-v0.2.md`
- Rename: `docs/api/pairfund-openapi-v0.2.yaml` → `docs/api/mimic-openapi-v0.2.yaml`
- Delete: `prisma/schema.prisma`
- Modify: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.agents/features.md`
- Modify: `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`
- Modify: `backend/prisma/seed.ts`, `backend/src/modules/auth/auth.service.ts`, `backend/src/modules/auth/jwt-auth.guard.ts`
- Modify: `backend/test/*.e2e-spec.ts`, `backend/README.md`, `web/README.md`

- [ ] **Step 1: Run the active naming check and capture the expected failure**

Run:

```powershell
node scripts/verify-mimic-naming.mjs
```

Expected: FAIL and list the active Backend/package/docs references that still contain the retired brand.

- [ ] **Step 2: Rename the four current source-of-truth documents**

```powershell
git mv docs/design/pairfund-prd-v0.2-final.md docs/design/mimic-prd-v0.2-final.md
git mv docs/design/pairfund-backend-accounting-module-map-v0.2.md docs/design/mimic-backend-accounting-module-map-v0.2.md
git mv docs/design/pairfund-web-ui-v0.2.md docs/design/mimic-web-ui-v0.2.md
git mv docs/api/pairfund-openapi-v0.2.yaml docs/api/mimic-openapi-v0.2.yaml
```

- [ ] **Step 3: Mechanically rename content only in active surfaces**

Run this one-time Node rewrite from the repository root:

```powershell
node -e "const fs=require('fs'); const files=['AGENTS.md','CLAUDE.md','README.md','.agents/features.md','backend/package.json','backend/.env.example','backend/prisma/seed.ts','backend/src/modules/auth/auth.service.ts','backend/src/modules/auth/jwt-auth.guard.ts','backend/README.md','web/README.md','docs/design/mimic-prd-v0.2-final.md','docs/design/mimic-backend-accounting-module-map-v0.2.md','docs/design/mimic-web-ui-v0.2.md','docs/api/mimic-openapi-v0.2.yaml',...require('child_process').execFileSync('git',['ls-files','backend/test/*.e2e-spec.ts'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean)]; for(const f of files){const s=fs.readFileSync(f,'utf8'); fs.writeFileSync(f,s.replaceAll('PAIRFUND','MIMIC').replaceAll('PairFund','Mimic').replaceAll('pairfund','mimic'));}"
```

Then make these semantic corrections instead of retaining blind replacement artifacts:

- `AGENTS.md` and `CLAUDE.md`: project title is `**Mimic**`, and key-doc links use the three renamed `mimic-*` files.
- `README.md`: remove `prisma/` from the repository layout and state that `backend/prisma/schema.prisma` is the only schema source of truth.
- `.agents/features.md`: title is `# Mimic Feature Map`; remove Flutter/mobile entries as current frontends and keep PWA status authoritative.
- `backend/README.md` and `web/README.md`: local database/container examples use `mimic`, `mimic-postgres`, `mimic-backend`, and `demo@mimic.local`.
- Backend tests: descriptions say `PWA development preflight`, not `Flutter Web`.

- [ ] **Step 4: Remove the duplicate root Prisma schema**

Run:

```powershell
git rm prisma/schema.prisma
rg -n 'prisma/schema\.prisma' README.md AGENTS.md CLAUDE.md backend web docs --glob '!docs/superpowers/**'
```

Expected: references point only to `backend/prisma/schema.prisma`; no runtime command uses the removed duplicate.

- [ ] **Step 5: Regenerate lockfile metadata from the renamed package**

Run:

```powershell
Set-Location backend
npm install --package-lock-only
Set-Location ..
```

Expected: `backend/package.json` and the root package entry in `backend/package-lock.json` use `mimic-backend`.

- [ ] **Step 6: Verify active naming and baseline behavior**

Run:

```powershell
node scripts/verify-mimic-naming.mjs
Set-Location backend
npm run prisma:generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
Set-Location ..\web
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'
$env:MIMIC_COOKIE_SECURE='false'
npm run build
Set-Location ..
```

Expected: naming check passes; Backend build/unit/e2e and Web lint/typecheck/test/build all pass. `web/public/sw.js` is regenerated but remains ignored.

- [ ] **Step 7: Commit the technical rename**

```powershell
git add AGENTS.md CLAUDE.md README.md .agents/features.md backend web docs/design docs/api prisma/schema.prisma
git diff --cached --check
git commit -m "refactor: complete Mimic technical rename"
```

## Task 3: Split Liveness and Database Readiness

**Files:**
- Create: `backend/src/health/health.module.ts`
- Create: `backend/src/health/health.controller.ts`
- Create: `backend/src/health/health.service.ts`
- Create: `backend/src/health/health.service.spec.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/test/app.e2e-spec.ts`
- Create: `web/src/app/api/health/live/route.ts`
- Create: `web/src/app/api/health/ready/route.ts`
- Create: `web/src/app/api/health/health-routes.test.ts`
- Modify: `web/scripts/verify-local-runtime.mjs`
- Modify: `web/scripts/verify-local-runtime.node-test.mjs`

- [ ] **Step 1: Write failing Backend readiness unit tests**

Create `backend/src/health/health.service.spec.ts` with cases that assert:

```ts
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const prisma = { $queryRawUnsafe: jest.fn() };
  const originalExpectedMigration = process.env.MIMIC_EXPECTED_MIGRATION;

  afterEach(() => {
    jest.resetAllMocks();
    if (originalExpectedMigration === undefined) {
      delete process.env.MIMIC_EXPECTED_MIGRATION;
    } else {
      process.env.MIMIC_EXPECTED_MIGRATION = originalExpectedMigration;
    }
  });

  it('reports ready after database and migration checks succeed', async () => {
    process.env.MIMIC_EXPECTED_MIGRATION = '20260715125137_init';
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([{ migration_name: '20260715125137_init' }]);

    const result = await new HealthService(prisma as never).readiness();

    expect(result).toEqual({ ok: true });
  });

  it('fails readiness when the database is unavailable', async () => {
    prisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('offline'));

    await expect(
      new HealthService(prisma as never).readiness(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails readiness when the expected migration is not applied', async () => {
    process.env.MIMIC_EXPECTED_MIGRATION = '20260715125137_init';
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([]);

    await expect(
      new HealthService(prisma as never).readiness(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

```powershell
Set-Location backend
npm test -- --runInBand --runTestsByPath src/health/health.service.spec.ts
```

Expected: FAIL because `health.service.ts` does not exist.

- [ ] **Step 3: Implement the Backend health feature**

Create `backend/src/health/health.service.ts`:

```ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  liveness() {
    const revision = process.env.MIMIC_BACKEND_REVISION;
    return {
      ok: true,
      ...(/^[0-9a-f]{7,64}$/i.test(revision ?? '') ? { revision } : {}),
    };
  }

  async readiness(): Promise<{ ok: true }> {
    try {
      await this.prisma.$queryRawUnsafe<Array<{ ok: number }>>('SELECT 1 AS ok');
      const expected = process.env.MIMIC_EXPECTED_MIGRATION;
      if (expected) {
        const applied = await this.prisma.$queryRawUnsafe<
          Array<{ migration_name: string }>
        >(
          'SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL LIMIT 1',
          expected,
        );
        if (applied.length !== 1) throw new Error('migration mismatch');
      }
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException('SERVICE_NOT_READY');
    }
  }
}
```

Create `backend/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  legacyHealth() {
    return { data: this.health.liveness() };
  }

  @Get('live')
  live() {
    return { data: this.health.liveness() };
  }

  @Get('ready')
  async ready() {
    return { data: await this.health.readiness() };
  }
}
```

Create `backend/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({ controllers: [HealthController], providers: [HealthService] })
export class HealthModule {}
```

Remove the inline controller from `backend/src/app.module.ts`, import `HealthModule`, and include it in `imports`.

- [ ] **Step 4: Update Backend HTTP contract tests**

In `backend/test/app.e2e-spec.ts`, make the Prisma stub include:

```ts
$queryRawUnsafe: jest.fn().mockResolvedValue([{ ok: 1 }]),
```

Keep the legacy `/health` tests, duplicate the valid liveness assertion for `/health/live`, and add:

```ts
it('reports readiness when the database check succeeds', async () => {
  await request(app.getHttpServer()).get('/health/ready').expect(200).expect({
    data: { ok: true },
  });
});
```

- [ ] **Step 5: Write failing Web health route tests**

Create `web/src/app/api/health/health-routes.test.ts` that mocks `requestToApi`, expects live to return `{ data: { ok: true } }`, ready to call `GET /health/ready`, and ready to return 503 when the API is unavailable.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestToApi } from "@/shared/api/server-api";
import { GET as live } from "./live/route";
import { GET as ready } from "./ready/route";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/server-api", () => ({ requestToApi: vi.fn() }));

const requestToApiMock = vi.mocked(requestToApi);

describe("health routes", () => {
  beforeEach(() => requestToApiMock.mockReset());

  it("reports web process liveness", async () => {
    const response = await live();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it("requires backend readiness", async () => {
    requestToApiMock.mockResolvedValueOnce({ ok: true });
    const response = await ready();
    expect(requestToApiMock).toHaveBeenCalledWith("/health/ready", {
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("returns 503 when backend readiness fails", async () => {
    requestToApiMock.mockRejectedValueOnce(new Error("offline"));
    const response = await ready();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SERVICE_NOT_READY" },
    });
  });
});
```

- [ ] **Step 6: Implement Web health routes**

`web/src/app/api/health/live/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ data: { ok: true } });
}
```

`web/src/app/api/health/ready/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requestToApi } from "@/shared/api/server-api";

export async function GET(): Promise<NextResponse> {
  try {
    await requestToApi<{ ok: true }>("/health/ready", { method: "GET" });
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_NOT_READY" } },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 7: Point runtime verification at readiness**

Change the Backend health URL in both runtime verifier files from `/health` to `/health/ready`. Keep revision identity checking on `/health/live`; the verifier must call both endpoints and require both to succeed.

- [ ] **Step 8: Run focused and full verification**

```powershell
Set-Location backend
npm test -- --runInBand --runTestsByPath src/health/health.service.spec.ts test/app.e2e-spec.ts
npm run build
Set-Location ..\web
npm test -- --run src/app/api/health/health-routes.test.ts
npm run test:runtime-verifier
npm run typecheck
Set-Location ..
```

Expected: all commands PASS.

- [ ] **Step 9: Commit health contracts**

```powershell
git add backend/src/health backend/src/app.module.ts backend/test/app.e2e-spec.ts web/src/app/api/health web/scripts/verify-local-runtime.mjs web/scripts/verify-local-runtime.node-test.mjs
git diff --cached --check
git commit -m "feat: add deployment readiness checks"
```

## Task 4: Add Reproducible Production Images

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Modify: `backend/package.json`, `backend/package-lock.json`
- Create: `web/Dockerfile`
- Modify: `web/.dockerignore`
- Modify: `web/next.config.ts`

- [ ] **Step 1: Prove production images are absent**

```powershell
docker build -f backend/Dockerfile backend -t mimic-api:plan-check
docker build -f web/Dockerfile web -t mimic-web:plan-check
```

Expected: both commands FAIL because the production Dockerfiles do not exist.

- [ ] **Step 2: Make Prisma migration tooling available in the API runtime**

Move `prisma` from `devDependencies` to `dependencies` in `backend/package.json`, then run:

```powershell
Set-Location backend
npm install --package-lock-only
Set-Location ..
```

Add this script:

```json
"prisma:migrate:deploy": "prisma migrate deploy"
```

- [ ] **Step 3: Create the API production image**

Create `backend/Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json nest-cli.json jest.config.js ./
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/src/main.js"]
```

Create `backend/.dockerignore`:

```dockerignore
.env
coverage
dist
node_modules
test
*.log
```

- [ ] **Step 4: Enable Next standalone output**

Add this property to the `nextConfig` object in `web/next.config.ts`:

```ts
output: "standalone",
```

- [ ] **Step 5: Create the Web production image**

Create `web/Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG MIMIC_API_BASE_URL
ARG NEXT_PUBLIC_MIMIC_SENTRY_DSN
ENV MIMIC_API_BASE_URL=$MIMIC_API_BASE_URL
ENV NEXT_PUBLIC_MIMIC_SENTRY_DSN=$NEXT_PUBLIC_MIMIC_SENTRY_DSN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
CMD ["node", "server.js"]
```

Ensure `web/.dockerignore` contains:

```dockerignore
.env*
.next
coverage
node_modules
playwright-report
test-results
*.log
```

- [ ] **Step 6: Build and smoke-test both images**

```powershell
docker build -f backend/Dockerfile backend -t mimic-api:local
docker build --build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1 -f web/Dockerfile web -t mimic-web:local
docker image inspect mimic-api:local --format '{{.Config.User}} {{json .Config.Cmd}}'
docker image inspect mimic-web:local --format '{{.Config.User}} {{json .Config.Cmd}}'
```

Expected: both builds succeed, both runtime users are `node`, and commands are `node dist/src/main.js` and `node server.js` respectively.

- [ ] **Step 7: Commit production images**

```powershell
git add backend/Dockerfile backend/.dockerignore backend/package.json backend/package-lock.json web/Dockerfile web/.dockerignore web/next.config.ts
git diff --cached --check
git commit -m "build: add Mimic production images"
```

## Task 5: Add Privacy-Filtered Sentry Monitoring

**Files:**
- Modify: `backend/package.json`, `backend/package-lock.json`, `backend/src/main.ts`, `backend/src/app.module.ts`
- Create: `backend/src/instrument.ts`
- Create: `backend/src/observability/sentry-privacy.ts`
- Create: `backend/src/observability/sentry-privacy.spec.ts`
- Modify: `web/package.json`, `web/package-lock.json`, `web/next.config.ts`
- Create: `web/instrumentation-client.ts`
- Create: `web/instrumentation.ts`
- Create: `web/sentry.server.config.ts`
- Create: `web/sentry.edge.config.ts`
- Create: `web/src/shared/observability/sentry-privacy.ts`
- Create: `web/src/shared/observability/sentry-privacy.test.ts`

- [ ] **Step 1: Install official Sentry SDKs**

```powershell
Set-Location backend
npm install @sentry/nestjs
Set-Location ..\web
npm install @sentry/nextjs
Set-Location ..
```

- [ ] **Step 2: Write failing backend privacy tests**

Create `backend/src/observability/sentry-privacy.spec.ts`:

```ts
import type { Event } from '@sentry/nestjs';
import { scrubSentryEvent } from './sentry-privacy';

describe('scrubSentryEvent', () => {
  it('retains diagnostics while removing personal and financial data', () => {
    const prohibited = [
      'member@mimic.test',
      '203.0.113.10',
      'Bearer secret-token',
      'session=secret-cookie',
      '259900',
      'Private dinner',
      'Anniversary note',
      'raw request body',
      'token=reset-secret',
    ];
    const input: Event = {
      environment: 'staging',
      exception: { values: [{ type: 'Error', value: 'Synthetic failure' }] },
      extra: {
        amount: prohibited[4],
        errorCode: 'SERVICE_NOT_READY',
        note: prohibited[6],
        requestId: 'req_1',
        title: prohibited[5],
      },
      release: 'abc1234',
      request: {
        cookies: { session: prohibited[3] },
        data: prohibited[7],
        headers: { authorization: prohibited[2] },
        method: 'POST',
        query_string: prohibited[8],
        url: `https://mimic.example/api/app/funds?${prohibited[8]}`,
      },
      tags: { errorCode: 'SERVICE_NOT_READY', route: '/funds/:id' },
      user: { email: prohibited[0], id: 'user_hash', ip_address: prohibited[1] },
    };

    const result = scrubSentryEvent(input);

    expect(result).toMatchObject({
      environment: 'staging',
      exception: input.exception,
      extra: { errorCode: 'SERVICE_NOT_READY', requestId: 'req_1' },
      release: 'abc1234',
      request: { method: 'POST', url: 'https://mimic.example/api/app/funds' },
      tags: { errorCode: 'SERVICE_NOT_READY', route: '/funds/:id' },
      user: { id: 'user_hash' },
    });
    const serialized = JSON.stringify(result);
    for (const value of prohibited) expect(serialized).not.toContain(value);
  });
});
```

- [ ] **Step 3: Implement a strict backend allowlist scrubber**

Create `backend/src/observability/sentry-privacy.ts`:

```ts
import type { Event } from '@sentry/nestjs';

export function scrubSentryEvent(event: Event): Event {
  return {
    environment: event.environment,
    event_id: event.event_id,
    exception: event.exception,
    extra: pickExtra(event.extra),
    level: event.level,
    logger: event.logger,
    release: event.release,
    request: event.request
      ? { method: event.request.method, url: safeUrl(event.request.url) }
      : undefined,
    tags: pickTags(event.tags),
    timestamp: event.timestamp,
    transaction: event.transaction,
    user: typeof event.user?.id === 'string' ? { id: event.user.id } : undefined,
  };
}

function pickExtra(extra: Event['extra']): Event['extra'] {
  if (!extra) return undefined;
  return {
    ...(typeof extra.errorCode === 'string' ? { errorCode: extra.errorCode } : {}),
    ...(typeof extra.requestId === 'string' ? { requestId: extra.requestId } : {}),
  };
}

function pickTags(tags: Event['tags']): Event['tags'] {
  if (!tags) return undefined;
  return {
    ...(typeof tags.errorCode === 'string' ? { errorCode: tags.errorCode } : {}),
    ...(typeof tags.route === 'string' ? { route: tags.route } : {}),
  };
}

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Write and implement the Web scrubber**

Create `web/src/shared/observability/sentry-privacy.test.ts`:

```ts
import type { Event } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "./sentry-privacy";

describe("scrubSentryEvent", () => {
  it("retains diagnostics while removing personal and financial data", () => {
    const prohibited = [
      "member@mimic.test",
      "203.0.113.10",
      "Bearer secret-token",
      "session=secret-cookie",
      "259900",
      "Private dinner",
      "Anniversary note",
      "raw request body",
      "token=reset-secret",
    ];
    const input: Event = {
      environment: "staging",
      exception: { values: [{ type: "Error", value: "Synthetic failure" }] },
      extra: {
        amount: prohibited[4],
        errorCode: "SERVICE_NOT_READY",
        note: prohibited[6],
        requestId: "req_1",
        title: prohibited[5],
      },
      release: "abc1234",
      request: {
        cookies: { session: prohibited[3] },
        data: prohibited[7],
        headers: { authorization: prohibited[2] },
        method: "POST",
        query_string: prohibited[8],
        url: `https://mimic.example/api/app/funds?${prohibited[8]}`,
      },
      tags: { errorCode: "SERVICE_NOT_READY", route: "/funds/:id" },
      user: { email: prohibited[0], id: "user_hash", ip_address: prohibited[1] },
    };

    const result = scrubSentryEvent(input);

    expect(result).toMatchObject({
      environment: "staging",
      exception: input.exception,
      extra: { errorCode: "SERVICE_NOT_READY", requestId: "req_1" },
      release: "abc1234",
      request: { method: "POST", url: "https://mimic.example/api/app/funds" },
      tags: { errorCode: "SERVICE_NOT_READY", route: "/funds/:id" },
      user: { id: "user_hash" },
    });
    const serialized = JSON.stringify(result);
    for (const value of prohibited) expect(serialized).not.toContain(value);
  });
});
```

Create `web/src/shared/observability/sentry-privacy.ts`:

```ts
import type { Event } from "@sentry/nextjs";

export function scrubSentryEvent(event: Event): Event {
  return {
    environment: event.environment,
    event_id: event.event_id,
    exception: event.exception,
    extra: pickExtra(event.extra),
    level: event.level,
    logger: event.logger,
    release: event.release,
    request: event.request
      ? { method: event.request.method, url: safeUrl(event.request.url) }
      : undefined,
    tags: pickTags(event.tags),
    timestamp: event.timestamp,
    transaction: event.transaction,
    user: typeof event.user?.id === "string" ? { id: event.user.id } : undefined,
  };
}

function pickExtra(extra: Event["extra"]): Event["extra"] {
  if (!extra) return undefined;
  return {
    ...(typeof extra.errorCode === "string" ? { errorCode: extra.errorCode } : {}),
    ...(typeof extra.requestId === "string" ? { requestId: extra.requestId } : {}),
  };
}

function pickTags(tags: Event["tags"]): Event["tags"] {
  if (!tags) return undefined;
  return {
    ...(typeof tags.errorCode === "string" ? { errorCode: tags.errorCode } : {}),
    ...(typeof tags.route === "string" ? { route: tags.route } : {}),
  };
}

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 5: Initialize Sentry in NestJS**

Create `backend/src/instrument.ts`:

```ts
import * as Sentry from '@sentry/nestjs';
import { scrubSentryEvent } from './observability/sentry-privacy';

const dsn = process.env.MIMIC_SENTRY_DSN;

Sentry.init({
  beforeSend: scrubSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.MIMIC_ENVIRONMENT,
  release: process.env.MIMIC_BACKEND_REVISION,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.MIMIC_SENTRY_TRACE_RATE ?? '0.05'),
});
```

Add `import './instrument';` as the first import in `backend/src/main.ts`. Import `APP_FILTER` and `SentryGlobalFilter`, then add this provider to `AppModule`:

```ts
providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
```

- [ ] **Step 6: Initialize Sentry in Next.js**

Create `web/instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/shared/observability/sentry-privacy";

Sentry.init({
  beforeSend: scrubSentryEvent,
  dsn: process.env.NEXT_PUBLIC_MIMIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_MIMIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_MIMIC_ENVIRONMENT,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
});
```

Create both `web/sentry.server.config.ts` and `web/sentry.edge.config.ts` with this exact content:

```ts
import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/shared/observability/sentry-privacy";

const dsn = process.env.MIMIC_SENTRY_DSN;

Sentry.init({
  beforeSend: scrubSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.MIMIC_ENVIRONMENT,
  release: process.env.MIMIC_WEB_REVISION,
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.MIMIC_SENTRY_TRACE_RATE ?? "0.05"),
});
```

Create `web/instrumentation.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

Wrap the existing Serwist result in `web/next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(withSerwist(nextConfig), {
  silent: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
```

- [ ] **Step 7: Verify privacy and builds**

```powershell
Set-Location backend
npm test -- --runInBand --runTestsByPath src/observability/sentry-privacy.spec.ts
npm run build
Set-Location ..\web
npm test -- --run src/shared/observability/sentry-privacy.test.ts
npm run lint
npm run typecheck
$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'
npm run build
Set-Location ..
```

Expected: focused privacy tests and all static/build checks PASS. Search build logs and Sentry test events to confirm no prohibited values are present.

- [ ] **Step 8: Commit monitoring foundation**

```powershell
git add backend/package.json backend/package-lock.json backend/src web/package.json web/package-lock.json web/instrumentation-client.ts web/instrumentation.ts web/sentry.server.config.ts web/sentry.edge.config.ts web/src/shared/observability web/next.config.ts
git diff --cached --check
git commit -m "feat: add privacy-filtered Sentry monitoring"
```

## Task 6: Add Encrypted Backup and Restore Tooling

**Files:**
- Create: `ops/backup/Dockerfile`
- Create: `ops/backup/backup.sh`
- Create: `ops/backup/restore-drill.sh`
- Create: `ops/backup/verify-restore.sql`
- Create: `ops/backup/backup-contract.test.mjs`
- Create: `docs/operations/postgres-recovery.md`

- [ ] **Step 1: Write the failing backup contract test**

Create `ops/backup/backup-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backup encrypts before upload and never enables shell tracing", async () => {
  const script = await readFile(new URL("./backup.sh", import.meta.url), "utf8");
  assert.match(script, /^set -eu$/m);
  assert.doesNotMatch(script, /set -x/);
  assert.match(script, /pg_dump/);
  assert.match(script, /age --recipient/);
  assert.match(script, /aws --endpoint-url/);
  assert.ok(script.indexOf("age --recipient") < script.indexOf("aws --endpoint-url"));
});

test("restore verifies checksum before decrypting", async () => {
  const script = await readFile(
    new URL("./restore-drill.sh", import.meta.url),
    "utf8",
  );
  assert.ok(script.indexOf("sha256sum --check") < script.indexOf("age --decrypt"));
  assert.match(script, /pg_restore --exit-on-error/);
  assert.match(script, /verify-restore\.sql/);
});
```

- [ ] **Step 2: Run the contract and verify scripts are missing**

```powershell
node --test ops/backup/backup-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `backup.sh`.

- [ ] **Step 3: Implement encrypted backup upload**

Create `ops/backup/backup.sh`:

```sh
#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${MIMIC_BACKUP_AGE_RECIPIENT:?MIMIC_BACKUP_AGE_RECIPIENT is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="mimic-${stamp}.dump"
plain="/tmp/${base}"
encrypted="${plain}.age"
checksum="${encrypted}.sha256"
trap 'rm -f "$plain" "$encrypted" "$checksum"' EXIT

pg_dump "$DATABASE_URL" --format=custom --no-acl --no-owner --file="$plain"
age --recipient "$MIMIC_BACKUP_AGE_RECIPIENT" --output "$encrypted" "$plain"
(cd /tmp && sha256sum "${base}.age" > "${base}.age.sha256")

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "$encrypted" "s3://${MIMIC_BACKUP_S3_BUCKET}/weekly/${base}.age" \
  --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "$checksum" "s3://${MIMIC_BACKUP_S3_BUCKET}/weekly/${base}.age.sha256" \
  --only-show-errors

printf '%s\n' "backup_uploaded=${base}.age"
```

- [ ] **Step 4: Implement restore drill**

Create `ops/backup/restore-drill.sh`:

```sh
#!/bin/sh
set -eu

: "${MIMIC_BACKUP_OBJECT:?MIMIC_BACKUP_OBJECT is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${MIMIC_BACKUP_AGE_IDENTITY_FILE:?MIMIC_BACKUP_AGE_IDENTITY_FILE is required}"
: "${MIMIC_RESTORE_DATABASE_URL:?MIMIC_RESTORE_DATABASE_URL is required}"

name="$(basename "$MIMIC_BACKUP_OBJECT")"
encrypted="/tmp/${name}"
checksum="${encrypted}.sha256"
plain="${encrypted%.age}"
trap 'rm -f "$encrypted" "$checksum" "$plain"' EXIT

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}" "$encrypted" \
  --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp \
  "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}.sha256" "$checksum" \
  --only-show-errors
(cd /tmp && sha256sum --check "$(basename "$checksum")")
age --decrypt --identity "$MIMIC_BACKUP_AGE_IDENTITY_FILE" \
  --output "$plain" "$encrypted"
pg_restore --exit-on-error --no-acl --no-owner \
  --clean --if-exists --dbname="$MIMIC_RESTORE_DATABASE_URL" "$plain"
psql "$MIMIC_RESTORE_DATABASE_URL" --set=ON_ERROR_STOP=1 \
  --file="/opt/mimic/verify-restore.sql"
```

Create `ops/backup/verify-restore.sql`:

```sql
SELECT COUNT(*) AS applied_migrations
FROM "_prisma_migrations"
WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;

SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY schemaname, relname;
```

- [ ] **Step 5: Create the backup image**

Create `ops/backup/Dockerfile`:

```dockerfile
FROM alpine:3.22
RUN apk add --no-cache age aws-cli postgresql16-client
WORKDIR /opt/mimic
COPY backup.sh restore-drill.sh verify-restore.sql ./
RUN chmod 0555 backup.sh restore-drill.sh
CMD ["/opt/mimic/backup.sh"]
```

- [ ] **Step 6: Verify scripts and image**

```powershell
node --test ops/backup/backup-contract.test.mjs
docker build -f ops/backup/Dockerfile ops/backup -t mimic-backup:local
docker run --rm --entrypoint /bin/sh mimic-backup:local -n /opt/mimic/backup.sh
docker run --rm --entrypoint /bin/sh mimic-backup:local -n /opt/mimic/restore-drill.sh
```

Expected: contract tests PASS, image builds, and both shell syntax checks exit 0 without connecting to external services.

- [ ] **Step 7: Write the recovery runbook**

Create `docs/operations/postgres-recovery.md` with exact operator sequences for:

- enabling daily snapshots and PITR before beta data is accepted;
- configuring a 90-day lifecycle on the offsite bucket;
- generating an `age` identity offline and storing only the public recipient in Railway;
- running the weekly cron service;
- restoring PITR into a sibling database;
- selecting a weekly object and running `restore-drill.sh` against Staging scratch PostgreSQL;
- recording backup timestamp, restore start/end, effective RPO/RTO, row counts, and migration count;
- never restoring directly over Production;
- escalating when measured RPO exceeds 15 minutes or RTO exceeds four hours.

Use real command names and variable names from the scripts; never include actual credentials or token-shaped examples.

- [ ] **Step 8: Commit backup tooling**

```powershell
git add ops/backup docs/operations/postgres-recovery.md
git diff --cached --check
git commit -m "feat: add encrypted database recovery tooling"
```

## Task 7: Strengthen CI Gates

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the active naming job**

Add a job that checks out the repository, uses Node 22, and runs:

```yaml
  naming:
    name: Active Mimic naming
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node --test scripts/verify-mimic-naming.test.mjs
      - run: node scripts/verify-mimic-naming.mjs
```

- [ ] **Step 2: Make Backend CI match the release baseline**

After the current unit test step, add:

```yaml
      - name: HTTP E2E
        run: npm run test:e2e -- --runInBand
```

- [ ] **Step 3: Add production image builds**

Add:

```yaml
  containers:
    name: Production containers
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build API image
        run: docker build -f backend/Dockerfile backend -t mimic-api:ci
      - name: Build Web image
        run: >-
          docker build
          --build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1
          -f web/Dockerfile web -t mimic-web:ci
      - name: Build backup image
        run: docker build -f ops/backup/Dockerfile ops/backup -t mimic-backup:ci
      - name: Verify backup contracts
        run: node --test ops/backup/backup-contract.test.mjs
```

- [ ] **Step 4: Verify the complete workflow locally**

Run every command represented in CI:

```powershell
node --test scripts/verify-mimic-naming.test.mjs
node scripts/verify-mimic-naming.mjs
Set-Location backend
npm ci
npm run prisma:generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
Set-Location ..\web
npm ci
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://127.0.0.1:3000/api/v1'
npm run build
Set-Location ..
docker build -f backend/Dockerfile backend -t mimic-api:ci
docker build --build-arg MIMIC_API_BASE_URL=http://127.0.0.1:3000/api/v1 -f web/Dockerfile web -t mimic-web:ci
docker build -f ops/backup/Dockerfile ops/backup -t mimic-backup:ci
node --test ops/backup/backup-contract.test.mjs
```

Expected: every command exits 0.

- [ ] **Step 5: Commit CI gates**

```powershell
git add .github/workflows/ci.yml
git diff --cached --check
git commit -m "ci: gate Mimic production foundations"
```

## Task 8: Apply Railway Infrastructure and Verify Staging

**Files:**
- Generate and commit after linking: `.railway/railway.ts`
- Create: `docs/operations/railway-deployment.md`
- Modify: `README.md`, `backend/README.md`, `web/README.md`
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Install and authenticate the current Railway CLI**

Run:

```powershell
npm install --global @railway/cli
railway --version
railway login
railway whoami
```

Expected: a current CLI with `railway config` support and the intended account identity. Never commit `.railway` link-state secrets or Railway tokens.

- [ ] **Step 2: Link the existing Mimic Railway project and pull IaC**

```powershell
railway link
railway status
railway config init
railway config pull
railway config plan
```

Select the existing Mimic project the user has previously deployed. Expected service/environment target state:

- environments: `Staging`, `Production`;
- services per environment: `mimic-web`, `mimic-api`, `mimic-postgres`;
- Production additionally: `mimic-backup-job`;
- Web and API region: `asia-southeast1-eqsg3a` when available to the workspace;
- Backend root directory `/backend`, Web root directory `/web`, backup root directory `/ops/backup`;
- API pre-deploy command `npm run prisma:migrate:deploy`;
- API healthcheck `/api/v1/health/ready`;
- Web healthcheck `/api/health/ready`;
- restart policy `ON_FAILURE` for Web/API and `NEVER` for the cron job;
- backup cron schedule weekly at a documented UTC time.

Edit only the generated `.railway/railway.ts` types and constructs produced by the installed CLI; do not introduce deprecated `railway.toml` or `railway.json`. Run `railway config plan` until it shows only the intended additions/changes, then run `railway config apply` after reviewing the plan.

- [ ] **Step 3: Configure environment variables by reference**

Document and apply these names, with separate values per environment:

API:

```text
DATABASE_URL=${{mimic-postgres.DATABASE_URL}}
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
MIMIC_BACKEND_REVISION=${{RAILWAY_GIT_COMMIT_SHA}}
MIMIC_ENVIRONMENT
MIMIC_EXPECTED_MIGRATION=20260715125137_init
MIMIC_SENTRY_DSN
MIMIC_SENTRY_TRACE_RATE=0.05
CORS_ORIGIN
```

Web:

```text
MIMIC_API_BASE_URL
MIMIC_COOKIE_SECURE=true
MIMIC_ENVIRONMENT=staging|production
MIMIC_WEB_REVISION=${{RAILWAY_GIT_COMMIT_SHA}}
MIMIC_SENTRY_DSN
NEXT_PUBLIC_MIMIC_ENVIRONMENT
NEXT_PUBLIC_MIMIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
```

Backup job:

```text
DATABASE_URL=${{mimic-postgres.DATABASE_URL}}
MIMIC_BACKUP_AGE_RECIPIENT
MIMIC_BACKUP_S3_ENDPOINT
MIMIC_BACKUP_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
```

Set `MIMIC_ENVIRONMENT` and `NEXT_PUBLIC_MIMIC_ENVIRONMENT` to `staging` or `production` in their matching environment. Set `CORS_ORIGIN` to that environment's generated Web public origin. Set `MIMIC_API_BASE_URL` to that environment's generated API public origin plus `/api/v1`. Record the resolved public origins in Railway and the private operator runbook, not in Git. `railway variable list` output must never be pasted into issues, logs, or commits.

- [ ] **Step 4: Enable database protection before accepting data**

In both environments, enable daily volume snapshots. In Production, also enable PITR and confirm `railway postgres pitr status` reports healthy archiving. Configure the offsite bucket lifecycle to delete weekly objects after 90 days.

Do not schedule the Production backup job until a manual invocation succeeds and the uploaded object plus checksum are visible in the offsite bucket.

- [ ] **Step 5: Deploy and verify Staging**

After CI passes, deploy Staging and run:

```powershell
$stagingApiOrigin = $env:MIMIC_STAGING_API_ORIGIN
$stagingWebOrigin = $env:MIMIC_STAGING_WEB_ORIGIN
if (-not $stagingApiOrigin -or -not $stagingWebOrigin) {
  throw 'Set MIMIC_STAGING_API_ORIGIN and MIMIC_STAGING_WEB_ORIGIN before smoke testing.'
}
Invoke-RestMethod "$stagingApiOrigin/api/v1/health/live"
Invoke-RestMethod "$stagingApiOrigin/api/v1/health/ready"
Invoke-RestMethod "$stagingWebOrigin/api/health/live"
Invoke-RestMethod "$stagingWebOrigin/api/health/ready"
```

Expected: all four return HTTP 200 and `{ data: { ok: true } }`; API liveness may additionally expose only a valid Git SHA revision.

Run one synthetic exception in each Sentry project from a Railway one-off shell with only `requestId`, `errorCode`, route template, environment, and release. Inspect the stored event and confirm prohibited fields are absent before resolving the synthetic issue.

- [ ] **Step 6: Run the first backup/restore drill**

Trigger `mimic-backup-job` manually against Staging, restore the encrypted object into a new scratch PostgreSQL service, run `restore-drill.sh`, and record:

- source backup timestamp;
- restore start and finish;
- migration count;
- table row counts;
- effective RPO and RTO;
- confirmation that no Production connection string was used.

Expected: restore exits 0, RPO is no more than 15 minutes for PITR evidence, and RTO is under four hours.

- [ ] **Step 7: Write the Railway deployment runbook**

Create `docs/operations/railway-deployment.md` containing the exact project topology, root directories, Dockerfiles, healthcheck paths, variable names, pre-deploy migration command, CI-gated autodeploy setting, staging verification commands, production promotion approval, rollback steps, and links to `postgres-recovery.md`.

Explicitly state:

- Production remains unlaunched/closed until all five implementation plans pass.
- Staging and Production databases and secrets never cross.
- Railway Config as Code files are deprecated; `.railway/railway.ts` is generated and validated by the current CLI.
- no secret values or Railway link metadata are committed.

- [ ] **Step 8: Update continuity artifacts**

Update `.agents/features.md` so Mimic/PWA is the only active client, mark naming/health/container/Sentry/backup foundation accurately, and leave later identity/accounting features as `todo`.

Append `.agents/devlog.md`:

```markdown
## 2026-08-28 — Establish Mimic Railway safety baseline

**Task:** Complete the Mimic-only repository and Railway staging/production safety foundation for the closed Beta program.
**Scope:** active naming, retired Flutter residue, health routes, production images, Sentry privacy, Railway infrastructure, backup/restore tooling, CI, and operations documentation
**What changed:**
- Unified active runtime and current documentation under Mimic naming and removed retired local Flutter build residue.
- Added database-aware readiness, reproducible production images, privacy-filtered Sentry, and stronger CI gates.
- Added Railway environment configuration plus encrypted offsite backup and restore-drill tooling.
**Decisions:** Kept immutable migration, devlog, and Git history unchanged; used current Railway Infrastructure as Code instead of deprecated config files; kept Production closed until all five Beta plans pass.
**Known gaps / follow-ups:** Closed-beta identity, accounting mutation completion, PWA accounting closure, data lifecycle, and final Beta launch remain in plans 2–5.
```

- [ ] **Step 9: Run final verification**

Run the complete Task 7 local CI sequence plus:

```powershell
git diff --check
git status --short
railway config plan
```

Expected:

- all local gates pass;
- `railway config plan` has no unreviewed drift after apply;
- only intended implementation files and the pre-existing unrelated user change, if still present, appear in Git status;
- no secret, `.env`, Railway token, backup private identity, dump, or restored database artifact is tracked.

- [ ] **Step 10: Commit operations and continuity records**

```powershell
git add .railway/railway.ts docs/operations/railway-deployment.md README.md backend/README.md web/README.md .agents/features.md .agents/devlog.md
git diff --cached --check
git commit -m "docs: record Mimic Railway safety baseline"
```

## Completion Gate

Plan 1 is complete only when:

- active naming verification passes with no retired brand in active surfaces;
- no tracked or local active Flutter client remains;
- Backend `/api/v1/health/live` and `/api/v1/health/ready` work in Staging;
- Web `/api/health/live` and `/api/health/ready` work in Staging;
- API, Web, and backup production images build reproducibly;
- CI passes Backend build/unit/e2e, Web lint/typecheck/test/build, naming, and all container builds;
- Sentry test events contain none of the prohibited personal or financial fields;
- Railway Staging and Production environments are isolated, with Production still closed;
- daily snapshots and Production PITR are enabled;
- an encrypted offsite backup and scratch restore drill succeed;
- measured recovery evidence meets RPO 15 minutes and RTO four hours;
- `.agents/features.md` and `.agents/devlog.md` describe the delivered state accurately.
