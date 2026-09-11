# P4 private shared-expense references execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.
Plan: `2026-09-12-financial-spaces-phase-4-private-references.md`.
Execution: sequentially in this task on `codex/financial-spaces`, continuing from the completed P3 shared Web checkpoint. No subagents, Fund compatibility layer, merge, push, or worktree cleanup were used.

## Delivered checkpoint

P4 stores a private link from one owned `PERSONAL_EXPENSES` space to an authoritative `SHARED_EXPENSES` record. The link owns only private note/tags, version/status, request receipts and personal-scope audit history. It does not create another `ExpenseRecord` or copy money, title, date, category, payer, allocation or settlement facts.

Create/update/remove recheck the destination owner and current source participation inside one transaction. Locks are acquired in source group/source, private taxonomy, destination order. Only the current user's positive allocation from an active same-currency shared source is accepted. Private, pooled, foreign-currency, absent/zero-allocation, governance-only, outsider and former-participant inputs fail without source details.

The personal month read model joins manual expenses with currently authorized references under RepeatableRead. Shared amount/title/date/category are projected from the source with bigint/string arithmetic, canonical category names and stable `(occurred_on,id)` pagination. A cross-space SHA-256 `view_version` detects source changes. Completed settlement ranges show `source_locked`; transfer confirmations never count as consumption, and immutable corrections remain separate next-period shared facts.

The Web exposes strict BFF/Zod boundaries, shared-expense opt-in, and discriminated personal-ledger rows. Manual records retain their existing editor. References expose only private metadata edit/remove actions with request-UUID retry, stale reload that preserves input, offline prevention, source-disappeared recovery, compact pixel tickets and narrow-width action wrapping.

## Runtime isolation

- PostgreSQL data directory: `D:\Project\mimic\.worktrees\financial-spaces\.session\postgres`
- Host/port: `127.0.0.1:55439`
- Database/user: `mimic_financial_spaces_test` / `mimic_test`
- Schema: `phase2`
- Verification URL: `postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`
- Task-owned acceptance API/Web: `http://127.0.0.1:3101/api/v1` and `http://127.0.0.1:3110`

Port 3000 was already occupied by an unrelated process and was neither stopped nor reused. The final cleanup stops only the task-owned 3101 API and task-owned 55439 PostgreSQL cluster; Playwright owns and stops its 3110 Web server.

## TDD, debugging and self-review evidence

- Migration contract failed before reference tables/enums/relations existed; migration and generated Prisma client made it GREEN.
- DTO/policy tests failed before strict metadata, allocation, exact delta, lock and ordering rules existed.
- HTTP lifecycle and independent-connection concurrency tests began with missing routes/services, then covered replay, payload conflict, authorization, soft remove/reactivate, version races and rollback.
- Personal month tests failed before the mixed read model, category projection and cross-space view version were implemented.
- Web contract/BFF/component tests observed missing schemas, routes, forms, badges and discriminated actions before each minimal implementation.
- Browser guard failed against the non-task port 3000; acceptance moved to the approved isolated 3101/3110 ports. The first real journey then exposed an ambiguous category selector, which was narrowed without changing UI behavior.
- Full Web verification exposed an unused acceptance binding and ES-target-incompatible bigint literals; both were corrected before rerunning the full sequence.
- Adversarial self-review found that omitted PATCH `note` (preserve) and explicit `null` (clear) hashed identically. A real-PostgreSQL test failed with unexpected 200 before the payload hash preserved field presence, then all 9 lifecycle cases passed.

The P4 production diff exceeds 200 lines, so self-review covered every changed production function/section and its tests rather than rereading the formatter-only portions of the Prisma schema. Correctness, edge cases, completeness, architecture, style, security/privacy and test symmetry were checked. No critical or important issue remains after the omitted/null fix.

## Verification evidence

| Verification | Result |
|---|---|
| Backend `npm run build` | exit 0 |
| Backend `npm test -- --runInBand` | 38 suites / 407 tests passed |
| Backend `npm run test:e2e -- --runInBand` | 5 suites / 54 tests passed |
| Backend `npm run test:spaces-db`, explicit loopback phase2 URL | 14 suites / 129 tests passed |
| Web `npm run lint` | exit 0 |
| Web `npm run typecheck` | exit 0 |
| Web `npm test` | 95 files / 554 tests passed |
| Web production build with `MIMIC_API_BASE_URL=http://localhost:3000/api/v1` | exit 0 |
| Real-backend Playwright private-reference journey | 4/4 passed: 320x568, 390x844, 768x1024, 1440x900 |

The browser acceptance registers isolated owner/participant users; creates a group, TWD/USD personal spaces, shared and pooled spaces; adds a shared participant and exact shared expense; rejects foreign/pool references without leaks; adds, renders, edits, removes and reactivates the private reference; follows an unlocked source edit; completes both transfer confirmations; verifies the locked reference without settlement-as-spending; exits the settled participant; removes the inaccessible source from personal consumption; denies former financial reads; archives the settled shared space; and checks focus restoration, dialog bounds and horizontal overflow. It contains no financial response mock, `page.route`, or `route.fulfill`.

The production build retains the pre-existing standalone copy warning for missing `(public)/page_client-reference-manifest.js`; the command exits 0.

## Commits

- `fe19841 feat: persist private shared expense references`
- `6e98509 feat: define private reference contracts`
- `516340a feat: manage private shared expense references`
- `e8100a5 feat: include shared references in personal spending`
- `c6d070e feat: expose private references through Web BFF`
- `6c0820f feat: add shared expense to personal ledger`
- `c2ded6a feat: surface shared references in personal ledger`
- `7b320dd test: cover private reference browser journey`
- `7f6969a fix: distinguish omitted reference metadata`
- `0282698 test: keep reference acceptance type-safe`

## Remaining phase scope

P4 private shared-expense reference Web/browser checkpoint is complete. The overall financial-spaces redesign is not complete: P5 pooled commitments/balances/advances/reimbursements/returns, P6 navigation/home/quick entry/tasks, and P7 durable drafts/legacy cleanup/full three-mode acceptance remain.
