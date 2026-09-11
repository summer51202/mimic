# P3 settled shared lifecycle execution

Approved design: `../specs/2026-09-11-financial-spaces-product-model-design.md`.
Plan: `2026-09-11-financial-spaces-phase-3-lifecycle.md`.
Execution: sequentially in this task, isolated `codex/financial-spaces` worktree, continuing from `5fb832f`. No subagents, repeated brainstorming, merge or push.

## Delivered checkpoint

Shared boxes now delegate archive and participant departure eligibility to the shared accounting mode. Archive rejects any pending batch, any nonzero authoritative position and any active expense/correction after the latest completed period. Departure checks only pending transfers, positions and unfinalized facts involving the target, so unrelated participant obligations do not trap someone already settled. Pooled boxes retain their conservative nonempty lifecycle guard.

Completed and canceled periods remain distinct. Deleted-only history does not create an obligation, while net-zero active expense/correction facts still require completed coverage. Successful exit immediately revokes financial reads; authorized self-retry returns only the same ended interval. Archive/end version and audit changes occur once, and audit failure rolls the entire transition back.

Manager survival counts only other current managers whose user and group membership are ACTIVE. Historical expense corrections still require current participation, but an immutable source payer/allocation fact can prove exit-day historical eligibility after rejoin. It cannot authorize a newcomer absent from the source or a participant who has not rejoined.

## TDD and verification evidence

- Initial lifecycle HTTP RED returned `SPACE_HAS_FINANCIAL_HISTORY`; the shared lifecycle guard made the settled exit/archive suite green.
- The resumed checkpoint reproduced three expected RED cases: exit-day correction returned400, and disabled-manager end/demote returned200. Source-fact evidence and active manager filters made all13 cases green.
- Self-review added a regression showing that ending a disabled target manager was incorrectly blocked even while another active manager survived. The test failed409 before the query changed to count valid managers excluding the target, then passed.
- Independent Prisma connections cover expense/archive, expense-or-correction/exit, duplicate archive/end and concurrent manager exits. These seven cases passed on first introduction because the existing mutation lock already serialized them; no production concurrency workaround was added.
- `NOT VALID` audit constraints reject new ARCHIVE/PARTICIPANT_ENDED rows without invalidating fixture history. Both failures preserve status, archivedAt, effectiveTo, version and financial facts, and constraints are removed in `finally`.

| Verification | Result |
|---|---|
| Final lifecycle + concurrency narrow suites |2 suites /21 tests passed |
| `npm run build`, backend | exit0 |
| `npm test -- --runInBand`, backend |36 suites /390 tests passed |
| `npm run test:e2e -- --runInBand` |5 suites /54 tests passed |
| `npm run test:spaces-db`, explicit loopback phase2 URL |12 suites /115 tests passed |
| Web `npm run lint`, `npm run typecheck` | both exit0 |
| Web `npm test` |79 files /498 tests passed |
| Web `npm run build`, local MIMIC_API_BASE_URL | exit0; existing standalone public manifest-copy ENOENT warning remains |

Vitest and the first Web build attempt hit Windows sandbox `spawn EPERM`; identical commands ran successfully with process-spawn permission. The production build retained the previously documented missing `(public)/page_client-reference-manifest.js` standalone-copy warning. Web source was unchanged, and this backend checkpoint does not claim the shared browser journey.

## Self-review complete

Every changed source function and all new lifecycle tests were reviewed for correctness, edge cases, completeness, architecture, style, security and coverage. Review tightened true concurrent test startup and found the disabled-target manager asymmetry described above. No critical or important issue remains in the reviewed scope. `git diff --check` passes apart from Git's informational LF-to-CRLF worktree notices.

Only the task-owned loopback PostgreSQL database at127.0.0.1:55439 schema `phase2` was used. Original-root untracked `.codex-remote-attachments/` and `reference/` remain untouched. Implementation commit: `6c95d4a`.

## Remaining phase scope

P3 remains in progress: shared Web contracts/forms, batch confirmations/corrections UI and a real-backend browser journey are still required. P4 shared references, P5 pooled lifecycle, P6 navigation/tasks and P7 durable drafts/three-mode acceptance/legacy cleanup remain on the approved roadmap.
