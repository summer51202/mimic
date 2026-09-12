# P7 Durable Offline Drafts, Legacy Fund Removal, and Three-Mode Acceptance Execution Record

**Executed:** 2026-09-12–13
**Branch:** `codex/financial-spaces`
**Starting point:** `209d261`
**Plan:** `2026-09-12-financial-spaces-phase-7-offline-legacy-acceptance.md`

## Outcome

P7 is complete. Personal, shared, and pooled expense entry now stores strict browser-local drafts bound to actor/group/space/mode/operation/resource versions. Reload never restores or submits content silently: the user must review, retry, or discard. Current authorization and authoritative space/participant/version/writable state are rechecked before a workspace mounts or a draft can be reviewed. Existing mutation request UUID contracts provide duplicate-submit protection without introducing a draft API or compatibility layer.

The disconnected universal Fund Web routes, BFF handlers, UI, backend modules, Prisma models/tables/enums, tests, and fixtures were removed. Old Web bookmarks resolve to framework 404 without fetching private data. Unmatched backend routes return a generic 404 that does not reflect query content. The neutral financial-space/expense records, taxonomy, shared/pooled facts, and pure bigint accounting calculator remain.

## TDD evidence

- Draft storage began with missing-module REDs, then schema/isolation/reload/corrupt-storage/stale/request-ID cases turned GREEN in `expense-draft.test.ts`.
- Each personal/shared/pooled form first failed reload/review/retry/discard/offline assertions, then received the minimum hook integration. Amounts remain canonical strings through Web boundaries and exact minor-unit strings/`bigint` in accounting.
- Legacy Web source/route scans and database table assertions failed before deletion. The removal migration was applied only after explicit authorization; current-mode table assertions remained GREEN.
- Legacy backend HTTP privacy first failed because Nest reflected `?title=private-ledger-title` in its default 404. `RouteNotFoundFilter` now sanitizes only unmatched-route 404s while preserving domain not-found codes.
- SSR regression first failed on direct `window.localStorage` access. Client hydration was deferred; a subsequent 13-test timing RED exposed a same-mount race, fixed by capturing the storage snapshot before the microtask. Six focused files then passed 29/29.
- Former-participant recovery, archived/closing draft visibility, pooled offline copy, personal navigation after save, stale shared review, and initial service-worker claim each received focused or real-browser RED/GREEN coverage.
- The first final browser run exposed shared stale drafts correctly blocking an unreviewed retry; acceptance was corrected to assert and perform explicit review. The next run exposed initial service-worker `clientsClaim` reload racing navigation. A new 2-test RED proved first claim must not reload; the final combined run passed 20/20.

## Self-review

Review scope was `209d261..HEAD`, covering correctness, authorization/privacy, exact money, storage context keys, SSR/hydration, legacy reachability, schema survival, accessibility, responsive behavior, and test symmetry. Important findings fixed before completion:

1. Former shared participants whose end date followed the draft date could be treated as current.
2. Personal save used a push/refresh navigation race.
3. Pooled offline copy overstated which actions were unavailable.
4. Archived/closing spaces did not expose a content-free count/discard path for device-local drafts.
5. Draft loading accessed local storage during server rendering and then had a same-mount hydration race.
6. Retired backend 404s reflected arbitrary query content.
7. The retained accounting calculator referenced removed Prisma enums and converted bigint through `number`; it is now Prisma-independent and bigint-only, while the unused Fund-specific lock adapter is gone.
8. Initial service-worker claim could reload a first visit and abort navigation.

No Critical or Important findings remain.

## Fresh verification

All results below were rerun after implementation; no prior phase result was reused.

| Surface | Command/evidence | Result |
|---|---|---|
| Prisma | `npm run prisma:generate`; `npx prisma validate` | pass |
| Backend build | `npm run build` | pass |
| Backend unit | `npm test -- --runInBand` | 36 suites, 322 tests passed |
| Backend ordinary e2e | `npm run test:e2e -- --runInBand` | 5 suites, 37 tests passed |
| Explicit PostgreSQL | `npm run test:spaces-db` | 20 suites, 151 tests passed |
| Web lint/typecheck | `npm run lint`; `npm run typecheck` | pass |
| Web unit/component | `npm test` | 100 files, 555 tests passed |
| Web production | `MIMIC_API_BASE_URL=http://127.0.0.1:3101/api/v1 npm run build` | exit 0; 33 static pages generated |
| Real-backend browser | five vertical specs, four Playwright projects | 20/20 passed in 2.8 minutes |

The browser set used real PostgreSQL/API/Web with no financial `page.route` or API mocks and covered `320x568`, `390x844`, `768x1024`, and `1440x900`. Together it exercises all three modes; manager, participant, former participant, governance-only non-participant, and outsider; personal isolation; shared locks/transfers/corrections; pooled occurrences/reimbursements/shortfall/returns; private references; home/tasks; offline reload/review/retry/discard/idempotency; old URLs/BFF privacy; keyboard focus, Escape restoration, dialog containment, action wrapping, state copy, and horizontal overflow.

## Runtime isolation

- PostgreSQL: `127.0.0.1:55439`, database `mimic_financial_spaces_test`, schema `phase2`, data directory `D:\Project\mimic.worktrees\financial-spaces.session\postgres`.
- Final listener PIDs before shutdown: API `33652` on 3101, Web `49728` on 3110, PostgreSQL `48208` on 55439.
- All three task-owned services were stopped. The final listener query showed only the pre-existing port 3000 PID `9292`; 3101, 3110, and 55439 had no listeners.
- No merge, push, or worktree removal occurred. Root `.codex-remote-attachments/` and `reference/` were not modified or deleted.

## Commits

P7 is split into plan, draft kernel/three mode integrations, legacy Web/backend/schema removal, acceptance, self-review fixes, and documentation commits. The implementation range starts at `9d60ab7`; notable final review commits are `4e9a58c`, `d1ed4b7`, `b2ff422`, `809c124`, and `510f8fd`.

## Known limitations

- Browser local storage is not encryption and cannot protect against same-origin XSS or a person using developer tools. Application code only enumerates and renders the exact authenticated context.
- `next build` exits successfully but still emits the pre-existing standalone trace-copy warning for `(public)/page_client-reference-manifest.js`. The normal route manifest and production server used by acceptance are complete; standalone packaging should be handled as a separate release-tooling task.
