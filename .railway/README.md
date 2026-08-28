# Mimic Railway infrastructure

This project defines its Railway infrastructure in code.

```txt
.railway/railway.ts
```

This directory declares the guarded Web/API/PostgreSQL foundation for the
existing Mimic project. It contains no secret values and intentionally contains
no backup cron. Read
[`docs/operations/railway-deployment.md`](../docs/operations/railway-deployment.md)
before running any cloud command.

## Review commands

Preview what Railway would change in the currently linked environment:

```bash
railway config plan
```

Apply the pinned, reviewed changes to the currently linked environment only:

```bash
railway config plan --out .railway/staging-plan.json
railway config apply --plan .railway/staging-plan.json
```

## Notes

- `railway config plan` is safe and does not change Railway.
- Do not run `railway config init` over this directory or `config pull` without
  first preserving and reviewing the repository source of truth.
- `railway config apply` is an operator-approved action. Mimic does not apply
  destructive changes or Production changes automatically.
- Services already managed by `railway.json` must be migrated before `.railway/railway.ts` can manage them.
- Keep one `.railway` file for the whole project. A named `export const partial` (or `PARTIAL` / `const Partial`) is a last resort for separate repos that cannot share that file. Do not add it unless omit=delete across repos is a blocker.
- Use `replicas` for scaling; advanced placement can still specify region names.
- Use `group("Name", [resources])` to keep large projects organized on the Railway canvas.
- Secrets use `preserve()` so existing values are retained without writing
  secret values to source. Missing values remain an explicit operator gate.
- Mimic uses separate `staging` and `production` links/plans/applies. Never infer
  that one apply configured both environments.
- Staging temporarily sources `codex/mimic-baseline-railway-safety` for the
  bootstrap validation; that branch must be pushed and its deployed SHA
  verified. Before merge, switch the IaC and contract back to `main`, re-run
  verification and review a new Staging plan. Production always sources `main`.
- Generate only the Web public domain. The API stays on Railway's private
  network and Web readiness/BFF acceptance verifies it.
- Generated plan files and local link metadata are ignored and must not be
  committed.
