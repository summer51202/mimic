# P5 pooled-fund vertical execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.
Plan: `2026-09-12-financial-spaces-phase-5-pooled-funds.md`.
Execution: sequentially in this task on `codex/financial-spaces`. No subagents, Fund compatibility layer, merge, push, or worktree cleanup were used.

## Delivered checkpoint

P5 adds an independent pooled-fund aggregate with exact bigint accounting and canonical decimal-string API money. Managers define bounded weekly/monthly commitments; persisted participant occurrences remain EXPECTED until the assigned participant confirms or skips, or a manager cancels. Only confirmation creates one formal contribution and changes money.

Pooled expenses are either fund-paid or participant-advanced. Fund-paid facts reduce book balance immediately. Advances create one reserved reimbursement and use manager-sent then advancer-received confirmation. The workspace independently reports book balance, pending reimbursement, sent-awaiting-receipt, available balance and shortfall without importing shared settlement formulas. Open expenses may be edited or soft-deleted; sent facts remain immutable and signed source-linked corrections preserve history.

Closing requires all expected occurrences and reimbursements resolved and no shortfall. Managers explicitly allocate the full positive balance into returns; the system never invents equal or proportional recipients. Returns use manager-sent and recipient-received confirmation, after which zero book/pending balance permits participant exit and archive. Current participation is checked before every financial projection or receipt replay, so governors outside the box, outsiders and former participants receive non-enumerating denials.

The Web adds strict Zod/BFF boundaries, pooled-space creation/list/opening, schedules and overrides, contribution actions, expense source/category/tag/detail, exact balance cards, reimbursements, participants, closing, explicit returns and archive. Failure states preserve confirmed data and safe form input, reuse request UUIDs after uncertain results, block writes offline, restore focus, wrap actions and avoid horizontal overflow.

## Runtime and migration isolation

- PostgreSQL data directory: `D:\Project\mimic\.worktrees\financial-spaces\.session\postgres`
- Database/user/schema: `mimic_financial_spaces_test` / `mimic_test` / `phase2`
- Loopback verification URL: `postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2`
- Task-owned acceptance API/Web: `http://127.0.0.1:3101/api/v1` and `http://127.0.0.1:3110`

All 11 migrations installed on a fresh `phase5_fresh` schema and the seed completed twice. No external database was accessed. Port 3000 remained unrelated and untouched.

## TDD, debugging and self-review evidence

- Pure value and migration contracts began RED for exact money, real recurrence dates, bounded generation, tables, checks, relations and indexes.
- HTTP and independent-connection tests began RED for commitment/occurrence state, pooled expenses, reimbursements, corrections, lifecycle, privacy, idempotency, rollback and races before their services/routes existed.
- Web contracts, BFF routes, component behavior and responsive requirements were introduced as failing tests before implementation. The browser journey contains no financial response mocks or `page.route` interception.
- Real acceptance exposed a 320 px select overflow and the need to report sent-awaiting-receipt separately. A participant-exit regression proved that rereading private pooled data after departure retained stale facts; exit now performs one mutation and returns to the group.
- Adversarial self-review added REDs for deleted expenses appearing in the workspace, unknown commitment updates becoming 500, whitespace-only correction reasons, deleted expense correction sources, RETURN corrections being unreachable during CLOSING, and missing expense detail. All were fixed and affected suites reran GREEN.
- Final real-DB verification updated one obsolete P4 test that treated `firstFormalRecordAt` alone as a permanent pooled-exit blocker. P5 evaluates actual unresolved obligations and still requires the pooled closing route before archive.

The review covered every P5 production function and state/authorization path across correctness, edge cases, completeness, architecture, style, privacy/security and test symmetry. No Critical or Important issue remains after the fixes.

## Verification evidence

| Verification | Result |
|---|---|
| Backend `npm run build` | exit 0 |
| Backend `npm test -- --runInBand` | 39 suites / 439 tests passed |
| Backend `npm run test:e2e -- --runInBand` | 10 suites / 72 tests passed |
| Backend `npm run test:spaces-db`, explicit loopback phase2 URL | 19 suites / 147 tests passed |
| Web `npm run lint` | exit 0 |
| Web `npm run typecheck` | exit 0 |
| Web `npm test` | 101 files / 576 tests passed |
| Web production build with task API URL | exit 0 |
| Real-backend pooled Playwright journey | 4/4 passed: 320x568, 390x844, 768x1024, 1440x900 |

The production build retains the pre-existing standalone copy warning for missing `(public)/page_client-reference-manifest.js`; the command exits 0.

## Commits

- `689482c feat: persist pooled fund accounting`
- `85d397f feat: schedule pooled contributions`
- `118c27f feat: record pooled expenses and balances`
- `9fc6fbd feat: confirm pooled reimbursements`
- `aa0196b feat: close pooled funds safely`
- `658dc6b feat(web): add pooled finance boundary`
- `3e68b68 feat(web): manage pooled fund journeys`
- `44af12b fix(web): leave pooled fund privately`
- `444f38e test: cover pooled fund browser lifecycle`
- `abdb53b fix: harden pooled fund review findings`
- `963081b test: align pooled exit lifecycle contract`

## Remaining phase scope

P5 pooled backend/Web/browser checkpoint is complete. P6 still owns treasure-box navigation, homepage, quick entry and task center. P7 still owns durable offline drafts, legacy Fund removal and the final combined three-mode real-backend acceptance. This task did not merge, push, or remove the worktree.
