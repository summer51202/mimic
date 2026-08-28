# Railway deployment runbook

This runbook prepares the empty Railway project **Mimic** (`5d023e04-e7cc-4bc1-b4a8-16d85c89a65b`). It is intentionally Staging-first. Production remains closed and unlaunched until all five Closed Beta implementation plans and release gates pass.

The source of truth is `.railway/railway.ts`, using `railway` SDK `3.11.0`. Do not add deprecated `railway.toml` or `railway.json` files. Never commit Railway link metadata, tokens, `.env` files, secret values, backup identities, dumps, or plan files containing operational state.

## Declared topology

Both persistent environments use the lower-case Railway names `staging` and `production`; a new Railway project already has `production`, so creating a second `Production` environment would be an error.

| Resource | Source/root | Dockerfile | Health check | Region |
|---|---|---|---|---|
| `mimic-web` | `summer51202/mimic`, `/web` | `Dockerfile.railway` | `/api/health/ready` | `asia-southeast1-eqsg3a` |
| `mimic-api` | `summer51202/mimic`, `/backend` | `Dockerfile` | `/api/v1/health/ready` | `asia-southeast1-eqsg3a` |
| `mimic-postgres` | Railway PostgreSQL | managed image/volume | n/a | `asia-southeast1-eqsg3a` |

Staging Web/API deploy only from `codex/mimic-baseline-railway-safety` and
Production Web/API deploy only from `main`. The Staging branch must exist on
GitHub before planning or applying; a local-only worktree branch is not a
deployable source.

Web and API use `ON_FAILURE` restart policy. API uses `npm run prisma:migrate:deploy` as a pre-deploy command. The command runs in a separate container, can reach the private network and environment variables, and does not have volume mounts; it must remain non-interactive and exit non-zero on migration failure.

`mimic-backup-job` is deliberately absent from both environments. Do not add its service or weekly cron until every backup gate below is complete.

Staging and Production databases, JWT secrets, Sentry configuration, storage credentials, and domains never cross environments. Production must not be created by duplicating a populated Staging database.

## IaC model and current limitations

Railway IaC is environment-scoped: `railway config plan` and `railway config apply` operate against the currently linked environment. The `environments` list documents the allowed project environments, but one apply must not be treated as configuring both. Link, plan, review, and apply `staging` and `production` separately.

The pinned SDK models `deploy.preDeployCommand` as an array. `.railway/railway.ts` uses the higher-level `preDeploy` input, which compiles `npm run prisma:migrate:deploy` into a one-element array. Before each apply, verify that the plan retains that command exactly. If the installed Railway CLI/API omits or rewrites it, stop: do not deploy or replace it with `migrate dev`; upgrade/reconcile the CLI and SDK first.

The current SDK can declare literal domains, but it cannot request an unknown
generated Railway domain. Generate only the Web domain with the CLI after the
Staging service apply, then preserve that hostname outside Git. The API remains
private by default.

The SDK also cannot type-safely concatenate two service references with URL
syntax. `MIMIC_API_BASE_URL` therefore remains the Railway template literal
`http://${{mimic-api.RAILWAY_PRIVATE_DOMAIN}}:${{mimic-api.PORT}}/api/v1`.
Every plan must preserve that expression as a Railway reference, and after apply
the rendered variable must be an internal `railway.internal` HTTP URL. Stop if
the plan escapes it as plain text or resolves it to a public/hard-coded origin.

The current IaC build model also has no field that maps a Railway variable to the Docker BuildKit secret mount expected by `web/Dockerfile`. Therefore `SENTRY_AUTH_TOKEN` is not declared as a service variable. Source-map upload remains disabled on Railway until a reviewed platform-supported secret-mount mechanism is available. Never work around this by adding the token as a Docker `ARG`, `ENV`, `NEXT_PUBLIC_*` variable, or IaC literal.

Railway builds Web with `web/Dockerfile.railway`. Railway's Dockerfile builder
supports cache mounts but rejects BuildKit secret mounts, so this dedicated file
runs the same standalone production build without source-map credentials. Keep
`web/Dockerfile` for builders that can securely mount `SENTRY_AUTH_TOKEN`; never
copy that token into the Railway-compatible file.

`preserve()` means "retain an existing Railway value"; it does not create or
supply a value on a new service. Missing JWT secrets or `CORS_ORIGIN` do not
reliably make process health/readiness fail; a service may appear healthy while
authenticated requests fail or browser cross-origin protection is incomplete.
Never use readiness as proof that every required secret or browser security
value was configured; verify the variable checklist explicitly.

## Local repository gate

Use Node.js 22 or newer. From the repository root:

```powershell
Set-Location .railway
npm ci
npm run typecheck
npm test
Set-Location ..
node scripts/verify-mimic-naming.mjs
git diff --check
```

The contract test evaluates both environments without a token or network call. It proves the topology, region, Docker roots, health paths, migration command, variable references, secret preservation, and absence of the backup cron.

Install Railway CLI 5.42.1 or newer and confirm `railway --version` before any
cloud plan. Do not assume that authentication alone proves the executable and
IaC engine versions are compatible.

## Staging bootstrap

These commands are operational and mutate Railway only where explicitly noted. Run them manually after reviewing this file; do not run them from an untrusted checkout.

1. Link the project and create the missing empty Staging environment:

   ```powershell
   railway link --project 5d023e04-e7cc-4bc1-b4a8-16d85c89a65b
   railway environment list
   railway environment new staging
   railway environment staging
   railway status
   ```

   `railway environment new staging` is a cloud mutation. Skip it if `staging` already exists. Do not duplicate `production`.

2. Produce and review a Staging-only plan:

   ```powershell
   git ls-remote --exit-code origin refs/heads/codex/mimic-baseline-railway-safety
   railway environment staging
   railway config plan --out .railway/staging-plan.json
   ```

   The branch probe must return a SHA; push the reviewed branch first if it does
   not. The plan must contain only `mimic-web`, `mimic-api`, and
   `mimic-postgres`; no backup service/cron, no secret literal, and no deletion.
   Confirm both sources use `codex/mimic-baseline-railway-safety`, the API
   pre-deploy command is retained as a one-element array, Docker roots and watch
   paths are correct, health checks use readiness, Singapore placement remains,
   PostgreSQL is major 16, and the private API URL remains a resolvable Railway
   reference. The generated plan is an operator artifact and must not be
   committed.

3. Apply only the reviewed plan:

   ```powershell
   railway config apply --plan .railway/staging-plan.json
   ```

   Do not use `--yes` or `--confirm-destructive` for the first apply. Do not
   create a public domain yet. `preserve()` leaves new secret values absent;
   health/readiness may still pass while authenticated requests fail.
   Immediately continue with the explicit variable checklist before treating
   either service as usable.

4. With both services still private, use Railway's masked-variable UI to set all
   required values that do not depend on a public origin, especially independent
   `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Redeploy, confirm both processes
   are stable and Railway's configured Web readiness healthcheck reaches the API
   over the private network, and do not treat this as a complete
   auth/browser-security verification.

5. Generate only the Staging Web domain so its exact HTTPS origin is available
   for `CORS_ORIGIN`. Do not generate an API domain and do not share, announce,
   or use the Web URL yet:

   ```powershell
   railway domain --service mimic-web --environment staging --project 5d023e04-e7cc-4bc1-b4a8-16d85c89a65b
   railway domain list --service mimic-web --environment staging --project 5d023e04-e7cc-4bc1-b4a8-16d85c89a65b
   ```

6. In Railway's masked-variable UI, set the exact generated Web HTTPS origin as
   `CORS_ORIGIN`, with no trailing slash. Redeploy before any browser use. Do not
   paste `railway variable list` output into logs, issues, or commits.

### API variables

| Name | Source |
|---|---|
| `DATABASE_URL` | IaC reference to `mimic-postgres.DATABASE_URL` |
| `JWT_ACCESS_SECRET` | independent sealed random secret |
| `JWT_REFRESH_SECRET` | independent sealed random secret |
| `MIMIC_BACKEND_REVISION` | `${{RAILWAY_GIT_COMMIT_SHA}}` from IaC |
| `MIMIC_ENVIRONMENT` | `staging` from IaC |
| `MIMIC_EXPECTED_MIGRATION` | `20260715125137_init` from IaC |
| `MIMIC_SENTRY_DSN` | optional sealed DSN; error-only telemetry |
| `CORS_ORIGIN` | exact generated Staging Web HTTPS origin, no trailing slash |

### Web variables

| Name | Source |
|---|---|
| `MIMIC_API_BASE_URL` | IaC private reference to `mimic-api`, ending `/api/v1` |
| `MIMIC_COOKIE_SECURE` | `true` from IaC |
| `MIMIC_ENVIRONMENT` | `staging` from IaC |
| `MIMIC_WEB_REVISION` | `${{RAILWAY_GIT_COMMIT_SHA}}` from IaC |
| `MIMIC_SENTRY_DSN` | optional sealed server/edge DSN |
| `NEXT_PUBLIC_MIMIC_ENVIRONMENT` | `staging` from IaC |
| `NEXT_PUBLIC_MIMIC_SENTRY_DSN` | optional browser DSN |
| `SENTRY_ORG`, `SENTRY_PROJECT` | optional non-secret identifiers; preserved by IaC |

There are no trace-rate variables: Mimic Sentry telemetry is error-only. Do not add `MIMIC_SENTRY_TRACE_RATE` or `NEXT_PUBLIC_MIMIC_SENTRY_TRACE_RATE`.

7. After the final redeploy, confirm the deployment source
   SHA equals the reviewed remote Staging branch SHA before using the Web URL.
   Require green CI before enabling GitHub autodeploy. Keep Production
   autodeploy disabled and require explicit approval.

## Staging verification gate

Set the Web origin only in the operator shell, then run:

```powershell
if (-not $env:MIMIC_STAGING_WEB_ORIGIN) {
  throw 'Set MIMIC_STAGING_WEB_ORIGIN.'
}
Invoke-RestMethod "$env:MIMIC_STAGING_WEB_ORIGIN/api/health/live"
Invoke-RestMethod "$env:MIMIC_STAGING_WEB_ORIGIN/api/health/ready"
```

Only `MIMIC_STAGING_WEB_ORIGIN` is required in the normal private-API topology;
no API-origin variable is used. Both Web
endpoints must return HTTP 200 with `data.ok=true`. Web readiness must prove the
BFF can reach API readiness over the private URL, including the expected
migration. Authenticated BFF/Playwright acceptance then verifies API behavior
without publishing the API. If deeper direct diagnostics are required, use an
approved Railway shell/SSH inside the environment and the private service URL;
do not generate a public API domain merely for smoke testing.

Verify that the deployed Git SHA equals the reviewed remote Staging branch SHA,
then inspect one synthetic API and Web Sentry error. Stored events may contain
only the privacy allowlist documented in the component READMEs. Only after all
checks pass may the generated Web URL be shared or used for Staging acceptance.

## Bootstrap branch retirement gate

`codex/mimic-baseline-railway-safety` is a temporary bootstrap source for this
first Staging validation only. The branch mapping in `.railway/railway.ts` and
its contract must not be merged to `main` in that form.

After Staging acceptance passes and before merging:

1. Change the Staging source branch in `.railway/railway.ts` from
   `codex/mimic-baseline-railway-safety` to `main` and update the Staging
   contract expectation to `main`. Production remains `main` throughout.
2. Re-run clean install, typecheck, contract tests, naming verification, and
   `git diff --check`.
3. Link `staging`, generate a fresh plan, and review that the source transition
   to `main` is intentional and that no unrelated resource, variable, region,
   database, domain, or backup change appears. Do not apply this pre-merge plan:
   `main` does not contain the release yet.
4. Include the IaC and contract source switch in the same reviewed merge to
   `main`; do not leave it as a follow-up commit.
5. After merge, re-plan because the pre-merge plan is stale, review again, then
   apply the Staging source switch. Verify the deployed SHA equals the merged
   `main` SHA. Future `main` merges must then be the only persistent Staging
   deployment source.

## Backup service gate

Before either environment accepts durable data, enable and verify daily Railway
volume backups for its PostgreSQL volume. Production additionally requires the
documented PITR retention and a healthy archiving status. These controls are
operator gates because the current IaC definition does not declare the volume
backup schedule.

The future Production backup service uses `/ops/backup/Dockerfile`. It remains
absent from the current IaC. A later reviewed change may first add
`mimic-backup-job` as an unscheduled, non-public service solely for a one-time
manual validation; it must use `restartPolicyType: "NEVER"` and have no
`cronSchedule` or domain.

Before adding that unscheduled service, require:

- external S3-compatible bucket exists, versioning and a 90-day lifecycle are
  verified, and Object Lock/WORM or an equivalent policy prevents the backup
  credential from overwriting or deleting retained objects;
- the age recipient is recorded and its private identity remains outside Railway;
- the minisign public key is recorded for restore operators and the secret signing key is held only by the backup service;
- dedicated non-owning `mimic_backup` LOGIN exists with only CONNECT/USAGE/SELECT and independently generated password;
- discrete `MIMIC_BACKUP_DATABASE_HOST`, `PORT`, `USER=mimic_backup`, `PASSWORD`, `NAME`, and `SSL_MODE` are configured; no owner `DATABASE_URL` or `PGPASSWORD` reference is used;
- separate write-only `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` credentials are configured, with `AWS_SESSION_TOKEN` only when temporary credentials require it;
- `MIMIC_BACKUP_AGE_RECIPIENT`, `MIMIC_BACKUP_MINISIGN_SECRET_KEY`, `MIMIC_BACKUP_S3_ENDPOINT`, `MIMIC_BACKUP_S3_BUCKET`, `AWS_DEFAULT_REGION`, `MIMIC_POSTGRES_CLIENT_MAJOR`, `MIMIC_EXPECTED_MIGRATION`, and `MIMIC_BACKUP_RELEASE` are complete;

After those prerequisites are ready, add the unscheduled service in a focused
review and run these manual validation gates:

- one manual Production backup publishes the encrypted dump, checksum, signed
  manifest, and signature-last object successfully;
- a scratch restore drill verifies signatures, migration state, row counts,
  RPO/RTO, and proves no Production connection target was used.

After the unscheduled service uploads one complete encrypted/signed backup and a
scratch restore drill passes, a second reviewed IaC change may add the approved
UTC weekly `cronSchedule`. The service remains non-public and retains
`restartPolicyType: "NEVER"`. See [PostgreSQL recovery](postgres-recovery.md)
for credential creation, backup, restore, PITR, and drill procedures.

## Production promotion and rollback

Production apply is a separate approved operation:

```powershell
railway environment production
railway config plan --out .railway/production-plan.json
railway config apply --plan .railway/production-plan.json
```

Before applying, re-check that the plan has no deletion or backup cron, every Production secret is unique, CI and Staging acceptance are green, migration/backup recovery evidence exists, and a human explicitly approved promotion. Apply the pinned reviewed plan, not a freshly recomputed unreviewed diff.

Both Production GitHub sources must be exactly `main`; never promote the
Staging feature branch by changing Production's source. Record and verify the
deployed `main` SHA after apply.

If an application deploy fails, keep the last healthy deployment serving, inspect Railway/Sentry without copying secrets, and roll back/redeploy the last known-good deployment from Railway. If a migration has started, do not reverse it blindly: stop promotion and use the expand/migrate/contract policy plus [PostgreSQL recovery](postgres-recovery.md). Re-run all readiness and smoke checks after rollback.

## Railway references

- [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)
- [Persistent environments](https://docs.railway.com/environments)
- [Monorepo roots and watch paths](https://docs.railway.com/deployments/monorepo)
- [Pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command)
- [Variables and reference syntax](https://docs.railway.com/variables)
- [Generated domains](https://docs.railway.com/cli/domain)
