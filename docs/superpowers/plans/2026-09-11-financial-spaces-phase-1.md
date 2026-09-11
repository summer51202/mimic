# Financial Spaces Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user must choose execution before implementation starts; no agent delegation is authorized by this document alone.

**Goal:** Deliver a usable, persisted financial-space management API with private personal scope, explicit shared participation, manager governance, effective dates, and safe empty-space archival.

**Architecture:** Add a neutral FinancialSpace aggregate alongside disconnected legacy Fund test tables. Core owns identity, scope, lifecycle, participation and audit; it owns no accounting formula. Subsequent mode services post their own records under the same transaction lock and irreversibly latch the first formal record; they never call legacy Fund calculators.

**Tech Stack:** NestJS 10, Prisma 5/PostgreSQL, TypeScript, Jest/Supertest; Next.js/React with Zod contract tests.

---

## Authority, scope and acceptance boundary

Read root `AGENTS.md`, `.agents/features.md`, approved design `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md` at `66f29e3`, and `2026-09-11-financial-spaces-roadmap.md`. Approved design supersedes old accounting formulas in AGENTS/PRD. No brainstorming. Preserve unrelated changes and untracked files. Worktree: `D:/Project/mimic/.worktrees/financial-spaces`; branch `codex/financial-spaces`.

P1 is accepted through authenticated real HTTP + PostgreSQL, with complete create → read → rename → participant join → manager delegation → participant exit → empty archive paths. It introduces no expense, contribution, fake zero summary, settlement, or confirmation endpoint. Nonempty financial workflow acceptance belongs to the mode phases in the roadmap; do not expose a stub service that returns zero obligations. P1 deliberately permits participant exit/archive only on a box that has never had a formal financial record. P3/P5 replace this conservative restriction with their actual obligation/closure checks as part of enabling financial activity.

No UI redesign in P1: Web change is an executable strict contract parser consumed by contract tests; the usable delivery is the backend management API. P2 is the first new daily expense UI. Existing Fund pages remain confined to legacy data, with no way to feed their writes into FinancialSpace.

## Exact file map

Create:

- `backend/prisma/migrations/20260911000100_financial_spaces_core/migration.sql`: additive core tables, checks, partial indexes and immutability trigger.
- `backend/src/modules/financial-spaces/financial-spaces.types.ts`: core domain commands/projections, no financial summary type.
- `backend/src/modules/financial-spaces/financial-space-policy.ts` and `.spec.ts`: pure scope, participation dates and lifecycle decisions.
- `backend/src/modules/financial-spaces/financial-space-lock.ts` and `.spec.ts`: advisory locks in deterministic group → space order.
- `backend/src/modules/financial-spaces/financial-spaces.service.ts` and `.spec.ts`: persisted core CRUD, projections and audit.
- `backend/src/modules/financial-spaces/space-participants.service.ts` and `.spec.ts`: participant intervals, role updates, exits and last-manager guarantee.
- `backend/src/modules/financial-spaces/financial-spaces.controller.ts`: routes, JWT identity, DTO validation and `{ data }` envelope.
- `backend/src/modules/financial-spaces/financial-spaces.module.ts`: Prisma/Auth wiring; export services for group integration.
- `backend/src/modules/financial-spaces/dto/create-space.dto.ts`, `update-space.dto.ts`, `add-participant.dto.ts`, `update-participant-role.dto.ts`, `space-version.dto.ts`, `space-dto.spec.ts`: strict API validation.
- `backend/src/modules/financial-spaces/dto/space-request.dto.ts`: base marker for strict request DTOs.
- `backend/src/common/pipes/request-validation.pipe.ts` and `.spec.ts`: choose strict validation before global whitelist strips unknown keys.
- `backend/test/financial-spaces.e2e-spec.ts`: real HTTP/auth/Prisma integration, no overrides.
- `backend/test/financial-spaces-concurrency.e2e-spec.ts`: concurrent mutation tests with distinct Prisma connections.
- `backend/test/helpers/financial-spaces-db.ts`: explicitly local test DB guard, unique test users/groups, cleanup only fixture-owned records.
- `backend/test/jest-financial-spaces-db.json`: separate required database test selection.
- `web/src/shared/api/financial-space-contracts.ts` and `.test.ts`: strict snake_case projections, no amount field in governance projection.

Modify:

- `backend/prisma/schema.prisma`: new enums/models and reverse User/Group relations; leave legacy models unchanged.
- `backend/prisma/seed.ts`: add repeatable new-space metadata fixtures while keeping old fixture until cutover; no copied financial amounts.
- `backend/src/app.module.ts`: register FinancialSpacesModule.
- `backend/src/main.ts`: replace existing global ValidationPipe instance with RequestValidationPipe, preserving legacy DTO behavior.
- `backend/src/modules/groups/groups.module.ts`: import FinancialSpacesModule for departure guard.
- `backend/src/modules/groups/groups.service.ts` and `.spec.ts`: reject group exit/removal while active box participant; reject group archive while active box exists. Keep old Fund history guard until P7.
- `backend/test/jest-e2e.json`: ignore the two opt-in real-DB suites in ordinary mocked e2e baseline; dedicated script below runs them mandatorily.
- `backend/package.json`: add `test:spaces-db` script `jest --config ./test/jest-financial-spaces-db.json --runInBand`.
- `.agents/features.md`: new core status and explicit old-model supersession note.
- `.agents/devlog.md`: append factual P1 outcomes and test evidence.

Global pipes run before controller pipes. A controller-only strict pipe cannot detect keys already removed by the current global whitelist. Replace the global pipe with the conditional pipe in Task 3: marked new DTOs reject unknown fields, all existing DTOs retain their previous behavior.

## Data model and migration contract

Names are exact. UUID identifiers reference existing User/Group tables via Prisma; migration SQL must use actual mapped names (`User`, `groups`), not guessed `users`. Core model tables use snake_case; existing `AuditLog` remains for legacy mutations. New `SpaceAuditEvent` belongs to a space and avoids overloading Fund audit fields.

```prisma
enum FinancialSpaceMode {
  PERSONAL_EXPENSES
  SHARED_EXPENSES
  POOLED_FUND
}
enum FinancialSpaceStatus {
  ACTIVE
  ARCHIVED
}
enum SpaceParticipantRole {
  MANAGER
  PARTICIPANT
}
enum SpaceAuditAction {
  CREATE
  UPDATE
  PARTICIPANT_ADDED
  PARTICIPANT_ENDED
  ROLE_CHANGED
  ARCHIVE
}
model FinancialSpace {
  id                  String @id @default(uuid()) @db.Uuid
  name                String @db.VarChar(100)
  mode                FinancialSpaceMode
  currency            String @db.VarChar(3)
  timezone            String @default("Asia/Taipei") @db.VarChar(100)
  openedOn            DateTime @map("opened_on") @db.Date
  groupId             String? @map("group_id") @db.Uuid
  ownerUserId         String? @map("owner_user_id") @db.Uuid
  createdById         String @map("created_by_id") @db.Uuid
  status              FinancialSpaceStatus @default(ACTIVE)
  firstFormalRecordAt DateTime? @map("first_formal_record_at") @db.Timestamptz(6)
  archivedAt          DateTime? @map("archived_at") @db.Timestamptz(6)
  version             Int @default(1)
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  group               Group? @relation(fields: [groupId], references: [id])
  owner               User? @relation("PersonalSpaceOwner", fields: [ownerUserId], references: [id])
  creator             User @relation("SpaceCreator", fields: [createdById], references: [id])
  participants        SpaceParticipant[]
  auditEvents         SpaceAuditEvent[]
  @@index([groupId, status])
  @@index([ownerUserId, status])
  @@map("financial_spaces")
}
model SpaceParticipant {
  id            String @id @default(uuid()) @db.Uuid
  spaceId       String @map("space_id") @db.Uuid
  userId        String @map("user_id") @db.Uuid
  role          SpaceParticipantRole @default(PARTICIPANT)
  effectiveFrom DateTime @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  space         FinancialSpace @relation(fields: [spaceId], references: [id])
  user          User @relation(fields: [userId], references: [id])
  @@index([spaceId, userId, effectiveFrom])
  @@index([userId, effectiveTo])
  @@map("space_participants")
}
model SpaceAuditEvent {
  id          String @id @default(uuid()) @db.Uuid
  spaceId     String @map("space_id") @db.Uuid
  actorUserId String @map("actor_user_id") @db.Uuid
  action      SpaceAuditAction
  before      Json?
  after       Json
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  space       FinancialSpace @relation(fields: [spaceId], references: [id])
  actor       User @relation("SpaceAuditActor", fields: [actorUserId], references: [id])
  @@index([spaceId, createdAt])
  @@map("space_audit_events")
}
```

Add reverse relations to User: `personalSpaces FinancialSpace[] @relation("PersonalSpaceOwner")`, `createdSpaces FinancialSpace[] @relation("SpaceCreator")`, `spaceParticipations SpaceParticipant[]`, `spaceAuditEvents SpaceAuditEvent[] @relation("SpaceAuditActor")`; Group: `financialSpaces FinancialSpace[]`.

SQL constraints after generated CREATE statements:

```sql
ALTER TABLE financial_spaces ADD CONSTRAINT space_scope_check CHECK (
 (mode = 'PERSONAL_EXPENSES' AND owner_user_id IS NOT NULL AND group_id IS NULL)
 OR (mode IN ('SHARED_EXPENSES','POOLED_FUND') AND owner_user_id IS NULL AND group_id IS NOT NULL)
);
ALTER TABLE financial_spaces ADD CONSTRAINT space_currency_check
 CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE financial_spaces ADD CONSTRAINT space_archive_check CHECK (
 (status = 'ACTIVE' AND archived_at IS NULL) OR
 (status = 'ARCHIVED' AND archived_at IS NOT NULL)
);
ALTER TABLE financial_spaces ADD CONSTRAINT space_version_check CHECK (version > 0);
ALTER TABLE space_participants ADD CONSTRAINT participation_interval_check
 CHECK (effective_to IS NULL OR effective_to >= effective_from);
CREATE UNIQUE INDEX space_one_current_participation
 ON space_participants(space_id,user_id) WHERE effective_to IS NULL;
CREATE OR REPLACE FUNCTION protect_financial_space_identity() RETURNS trigger AS $$
BEGIN
 IF NEW.group_id IS DISTINCT FROM OLD.group_id OR
    NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
   RAISE EXCEPTION 'SPACE_SCOPE_IMMUTABLE';
 END IF;
 IF OLD.first_formal_record_at IS NOT NULL AND (
    NEW.mode IS DISTINCT FROM OLD.mode OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.timezone IS DISTINCT FROM OLD.timezone OR
    NEW.opened_on IS DISTINCT FROM OLD.opened_on OR
    NEW.first_formal_record_at IS DISTINCT FROM OLD.first_formal_record_at) THEN
   RAISE EXCEPTION 'SPACE_FINANCIAL_IDENTITY_LOCKED';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER financial_space_identity_guard BEFORE UPDATE ON financial_spaces
 FOR EACH ROW EXECUTE FUNCTION protect_financial_space_identity();
```

Participation uses half-open intervals `[effectiveFrom,effectiveTo)`. Ending on the join date is a valid empty interval, important for immediate mistaken-add removal. API only adds membership effective **today in the box timezone**, avoiding retroactive assignment/future manager gaps. Store DATE and reject timestamp strings; future scheduled membership is outside P1. OpenedOn defaults to today and cannot be edited through P1 API. Historical mode services require `effectiveFrom <= occurredOn < effectiveTo`, and never add new members to past allocations automatically. Ended intervals never reopen: rejoin creates a new row, under the same lock, preventing overlaps; personal owner cannot leave or appoint another person.

At least one current manager is enforced inside serialized transactions; no core endpoint hard-deletes spaces or participants. All manager additions must be existing active group members. All current participation must end before group departure; group owner role itself grants no box role. Archive retains manager participation for historical access; group archive checks active spaces only. Group departure still requires ending participation, so an archived box needs a manager-approved exit; P1 allows that for empty archived boxes without changing archive state.

P1 adds no `CLOSING` status or universal obligations relation. P5 extends the enum when its real close workflow is implemented. FirstFormalRecordAt is set in the same transaction as the first mode record in P2/P3/P5, never by a public latch endpoint; a DB fixture may set it to test identity protection. Soft deleting all financial records does not clear it.

Migration is additive and applies to an empty local database or one containing old dev data. Existing financial rows are neither renamed nor classified. Test both schema histories locally. Do not rewrite old migration checksums; P7 uses a new reviewed drop migration, not a forced reset of external data.

## Types, API and policy contract

Use generated Prisma enums internally; JSON mode/role/status remain uppercase, matching the new domain types. Old Fund lower-case enums do not cross into these contracts. Request IDs are UUID strings; version is positive safe integer; dates are real calendar dates. Name is trimmed 1–100 characters, currency an uppercase supported ISO currency, timezone a valid IANA name. Missing currency uses group default (shared) or `TWD` (personal); timezone defaults to creator's valid profile timezone. Creator gets MANAGER participation effective today and ownerUserId only for personal mode.

```ts
import { FinancialSpaceMode, FinancialSpaceStatus, SpaceParticipantRole } from '@prisma/client';
export type CreateSpaceCommand = {
  name: string;
  mode: FinancialSpaceMode;
  currency?: string;
  timezone?: string;
};
export type UpdateSpaceCommand = {
  version: number;
  name?: string;
  mode?: FinancialSpaceMode;
};
export type GovernanceSpace = {
  access: 'GOVERNANCE'; id: string; name: string;
  mode: Exclude<FinancialSpaceMode, 'PERSONAL_EXPENSES'>; status: FinancialSpaceStatus;
};
export type ParticipantSpace = {
  access: 'PARTICIPANT'; id: string; name: string;
  mode: FinancialSpaceMode; status: FinancialSpaceStatus;
  currency: string; timezone: string; opened_on: string;
  group_id: string | null; owner_user_id: string | null;
  role: SpaceParticipantRole; version: number;
  first_formal_record_at: string | null;
};
export type SpaceListItem = GovernanceSpace | ParticipantSpace;
```

No monetary field exists in P1. Use explicit select and field-by-field mapping; never serialize Prisma relations by spread. Governance projection contains exactly five fields above, with no currency, participants, note, audit, transactions or amount. A normal group member who is not a participant sees no box entry; a group owner non-participant sees only GovernanceSpace in group listing. Direct detail/participants reads by any non-participant return 404 to avoid enumeration, including group owners. Personal listing always uses JWT subject; no client owner override. Archived participant reads work; writes other than empty-box participant exit fail with 409.

All routes below have `/api/v1` prefix and JwtAuthGuard. The global conditional pipe selects `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` for SpaceRequestDto subclasses. DTOs accept only fields shown. Auth comes exclusively from CurrentUser, never request body.

| Route | Body/query | Result / authorization |
|---|---|---|
| POST `/me/spaces` | CreateSpaceCommand, mode PERSONAL_EXPENSES | 201 `{data: ParticipantSpace}`; owner=current actor |
| GET `/me/spaces` | none | 200 personal owned spaces, active and archived; stable name/id order |
| POST `/groups/:groupId/spaces` | CreateSpaceCommand, shared or pooled mode | 201; any active group member creates own box, becomes manager; others not auto-enrolled |
| GET `/groups/:groupId/spaces` | none | 200 SpaceListItem[]; active group membership required; own participations plus owner governance-only projections |
| GET `/spaces/:spaceId` | none | 200 ParticipantSpace; current box participation required |
| PATCH `/spaces/:spaceId` | UpdateSpaceCommand | 200 ParticipantSpace; manager; mode switch only between shared/pooled while firstFormalRecordAt=null; personal scope never changes |
| GET `/spaces/:spaceId/participants` | none | 200 intervals with user_id, display_name, role, effective_from/to; current participant only |
| POST `/spaces/:spaceId/participants` | `{user_id, version}` | 201 participant interval; manager, active group member; duplicate current join → 409 |
| PATCH `/spaces/:spaceId/participants/:participantId/role` | `{role, version}` | 200 interval; manager; target current interval; cannot demote final manager |
| POST `/spaces/:spaceId/participants/:participantId/end` | `{version}` | 200 interval; manager or target self; empty-only, cannot remove final manager; allow empty archived shared box exit |
| POST `/spaces/:spaceId/archive` | `{version}` | 200 ParticipantSpace; manager, firstFormalRecordAt=null; repeat authorized archive returns stored result without new audit |

Space-wide version increments once per actual metadata/participant/lifecycle mutation. Stale writes return 409 `SPACE_VERSION_CONFLICT`; same archive already archived is checked after actor authorization and before version rejection, making retries harmless. Generic financial idempotency receipts are introduced with financial confirmations in P3/P5, not unused tables in P1. All audit actors/timestamps are server assigned. Failed operations leave no audit row or version bump.

Errors: malformed/foreign mode fields 400 `SPACE_INPUT_INVALID`; unauthenticated 401; nonexistent/inaccessible detail 404 `SPACE_NOT_FOUND`; active participant lacking management 403 `SPACE_MANAGER_REQUIRED`; active group check failure 403 `GROUP_ACCESS_DENIED`; scope switch 409 `SPACE_SCOPE_IMMUTABLE`; mode after record 409 `SPACE_MODE_LOCKED`; final manager 409 `SPACE_MANAGER_REQUIRED`; duplicate current interval 409 `SPACE_PARTICIPANT_EXISTS`; nonempty exit/archive 409 `SPACE_HAS_FINANCIAL_HISTORY`; archived write 409 `SPACE_ARCHIVED`; group departure with current participation 409 `GROUP_HAS_SPACE_PARTICIPATION`; group archive with active space 409 `GROUP_HAS_ACTIVE_SPACES`.

## Task 1: Pin scope and date invariants with pure RED/GREEN tests

Files: `financial-spaces.types.ts`, `financial-space-policy.ts`, `financial-space-policy.spec.ts` in the exact directory above.

- [ ] Write these tests before the policy module; run `npm test -- --runInBand --runTestsByPath src/modules/financial-spaces/financial-space-policy.spec.ts` from backend. Expected RED: missing exports/module. After introducing exports, assert business failures rather than accepting a compiler-only failure as coverage.

```ts
import { containsDate, canChangeMode } from './financial-space-policy';
describe('financial space identity', () => {
  it('uses half-open participation boundaries', () => {
    expect(containsDate('2026-09-11','2026-09-13','2026-09-10')).toBe(false);
    expect(containsDate('2026-09-11','2026-09-13','2026-09-11')).toBe(true);
    expect(containsDate('2026-09-11','2026-09-13','2026-09-13')).toBe(false);
    expect(containsDate('2026-09-11',null,'2026-09-13')).toBe(true);
  });
  it('never changes populated mode or personal ownership scope', () => {
    expect(canChangeMode('SHARED_EXPENSES','POOLED_FUND',false)).toBe(true);
    expect(canChangeMode('SHARED_EXPENSES','POOLED_FUND',true)).toBe(false);
    expect(canChangeMode('PERSONAL_EXPENSES','SHARED_EXPENSES',false)).toBe(false);
    expect(canChangeMode('POOLED_FUND','PERSONAL_EXPENSES',false)).toBe(false);
    expect(canChangeMode('PERSONAL_EXPENSES','PERSONAL_EXPENSES',true)).toBe(true);
  });
});
```

- [ ] Implement the pure rules (date strings here have already passed calendar validation):

```ts
type Mode = 'PERSONAL_EXPENSES' | 'SHARED_EXPENSES' | 'POOLED_FUND';
export function containsDate(from: string, to: string | null, on: string): boolean {
  return from <= on && (to === null || on < to);
}
export function canChangeMode(from: Mode, to: Mode, hasRecord: boolean): boolean {
  if (from === to) return true;
  return !hasRecord && from !== 'PERSONAL_EXPENSES' && to !== 'PERSONAL_EXPENSES';
}
```

- [ ] Re-run exact command; expected GREEN. Add timezone-midnight/leap-day cases for server-derived dates in Task 3; client-provided dates are rejected as unknown fields in P1. Commit only these files: `test(spaces): define scope and participation invariants`.

## Task 2: Add persisted schema with database guard tests first

Files: schema/migration, DB helper/config/test scripts, `financial-spaces.e2e-spec.ts`.

- [ ] Write a DB test using raw SQL catalog queries (so RED does not rely on generated missing Prisma types): assert `to_regclass('financial_spaces')` is non-null; then assert personal+group scope insert rejected, invalid role enum rejected, duplicate current participation rejected, invalid interval rejected. Include mode mutation after first record rejection using a seeded space with firstFormalRecordAt set, and verify timestamp cannot clear even after soft-deleted future financial history. The seed timestamp is a test fixture, not a public API.
- [ ] Provision an isolated loopback PostgreSQL database `mimic_financial_spaces_test`. DB helper accepts DATABASE_URL only when hostname is `127.0.0.1`/`localhost`/`::1` and database name is exactly `mimic_financial_spaces_test`; refuse missing or other URLs before connecting. Do not copy root `.env` or print URL. Set secrets to test-only strings in this process. Each test uses generated UUID users/groups and cleans only its fixture IDs, child-first. Never blanket-truncate shared tables.

```ts
export function assertSpacesTestDatabase(raw: string | undefined): void {
  if (!raw) throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
  const url = new URL(raw);
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) ||
      url.pathname !== '/mimic_financial_spaces_test' ||
      !['postgres:','postgresql:'].includes(url.protocol)) {
    throw new Error('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
  }
}
```

- [ ] Configure dedicated Jest JSON with rootDir `..`, node environment, extensions js/json/ts, transform `^.+\\.(t|j)s$` → ts-jest, testMatch selecting only the two named DB suites. Existing jest-e2e excludes these names; `test:spaces-db` is a separate mandatory P1 gate, not silently skipped e2e.
- [ ] Run `npm run test:spaces-db` before new migration; expected RED: table absent. Implement schema block, reverse relations and SQL guards above; run `npx prisma format`, `npx prisma validate`, `npx prisma generate`.
- [ ] Generate/apply migration only with verified local DATABASE_URL. Use `npx prisma migrate dev --name financial_spaces_core --create-only`, normalize new migration directory to the exact name above before application, append checks/trigger, review SQL, then `npx prisma migrate deploy`. Avoid database reset. Run database tests GREEN.
- [ ] Exercise migration from fresh local DB and legacy-schema local DB containing one Fund fixture; verify old row unchanged and no automatically created FinancialSpace counterpart. Regenerate client and `npm run build`; expected successful legacy + new types. Commit schema/migration/helper/config/tests: `feat(spaces): persist neutral financial space core`.

## Task 3: Strict DTOs, privacy-aware create/read/update API

Files: DTOs, policy, lock, service/controller/module, `backend/src/app.module.ts`, service/DTO tests and DB HTTP suite.

- [ ] Add failing class-validator tests for personal/shared route-mode mismatch, client owner/actor fields, expense-specific fields (`payers`, `allocations`, `contribution_type`, `balance_minor`), malformed UUID/date/version/name/currency/timezone, and invalid enum casing. Assert foreign fields are 400, not silently stripped. `npm test -- --runInBand --testPathPattern=financial-spaces` → RED for missing behavior.
- [ ] Write HTTP scenarios: user A creates private box, B cannot list/detail it; group member A creates shared box, group owner O is not auto-participant; O list contains exactly governance fields; B regular non-participant list omits box; A detail is participant projection; guest 401; unknown id 404; stale rename 409; member metadata write 403; same personal mode update succeeds; populated shared-to-pooled switch 409.
- [ ] Write a regression test using the actual global pipe: legacy DTO still strips extras, SpaceRequestDto subclass rejects `payers` before stripping. Add the marker and pipe below, instantiate this pipe in main.ts and the HTTP test application. All five concrete space request DTOs extend SpaceRequestDto; do not forget the version-only DTO.

```ts
// backend/src/modules/financial-spaces/dto/space-request.dto.ts
export class SpaceRequestDto {
  static readonly strictSpaceRequest = true;
}
// backend/src/common/pipes/request-validation.pipe.ts
import { ArgumentMetadata, BadRequestException, PipeTransform, ValidationPipe } from '@nestjs/common';
export class RequestValidationPipe implements PipeTransform {
  private readonly legacy = new ValidationPipe({whitelist: true, transform: true});
  private readonly strict = new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    exceptionFactory: () => new BadRequestException('SPACE_INPUT_INVALID'),
  });
  transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const type = metadata.metatype;
    const strict = type !== undefined && 'strictSpaceRequest' in type &&
      type.strictSpaceRequest === true;
    return (strict ? this.strict : this.legacy).transform(value, metadata);
  }
}
```

- [ ] Implement DTOs using `@IsEnum`, `@IsUUID`, `@IsInt/@Min(1)/@Max(Number.MAX_SAFE_INTEGER)`, trimmed `@IsString/@Length(1,100)`; optional means absent, not null: use `@ValidateIf((_object, value) => value !== undefined)` so explicit null still fails the field validator. Currency must belong to `Intl.supportedValuesOf('currency')` plus uppercase 3-letter constraint; `Intl.NumberFormat` alone accepts unknown codes and is insufficient. Timezone uses `Intl.DateTimeFormat` construction. Date is server-created here. Configure this controller's ValidationPipe exceptionFactory to return BadRequestException('SPACE_INPUT_INVALID'); route-mode mismatch returns the same error. Use no unsafe `as any` DTO casts.
- [ ] Implement locks exactly as separate namespace from Fund locks; shared operations first take existing group lock so group departure cannot race space creation:

```ts
import { Prisma } from '@prisma/client';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
export async function lockFinancialSpace(
  tx: Prisma.TransactionClient, spaceId: string, groupId: string | null,
): Promise<void> {
  if (groupId !== null) await lockGroupMutation(tx, groupId);
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`space:${spaceId}`}, 0))`);
}
```

- [ ] Service create: generate space UUID; transaction locks group then new space; recheck active group/member; insert FinancialSpace and creator MANAGER interval in nested create; insert SpaceAuditEvent CREATE with explicit metadata projection; return ParticipantSpace. Personal actor/owner is JWT subject and never copied from body. Group create rejects archived group. Derive today's DATE using timezone, not UTC truncation at Taiwan midnight.
- [ ] Service reads: filter current participation (`effectiveTo=null`, effectiveFrom<=today) or personal owner before fetching detailed fields. Group listing first verifies active group member; combine participant projection and minimal governance select for owner only; deterministic name/id ordering; current participant with MANAGER role still represented as access PARTICIPANT. Include archived boxes without exposing new writes.
- [ ] Service update: pre-read id/groupId only; transaction takes locks, re-read/authenticate manager; check ACTIVE, version, mode rules; update allowed name/mode and version+1; audit before/after atomically. Never mutate group/owner/currency/timezone/openedOn through update DTO. Unknown references return 404 without financial detail; no catch-and-return-empty-object.
- [ ] Wire controller methods to the exact API table, use explicit DTO-to-command mapping and `{data: result}`; no Prisma spread. Register module exports and AppModule import. Run unit and DB HTTP tests GREEN. Commit `feat(spaces): add private and shared management APIs`.

## Task 4: Participants, role handoff, archive and group integration

Files: participant service/tests, controller routes, groups module/service/tests, DB concurrency suite.

- [ ] Write RED tests: adding B creates only today's interval; B not responsible for yesterday; adding active duplicate 409; inactive/foreign-group target rejected; outsider cannot add self; participant cannot self-promote; two managers demoted concurrently leaves exactly one; personal owner cannot add others/leave; empty-box archive succeeds, audited once; archive retry same actor unchanged; firstFormalRecordAt non-null prevents archive and exit. Group leave/removal rejects current box participation; group archive rejects active box even with no legacy Fund history.
- [ ] Add pure guards in policy with error strings from the API section; use firstFormalRecordAt rather than guessing balances. All participant mutations lock group→space, re-read space/version and actor membership, then write interval/role, increment space version, and write audit within one transaction. Select target by both participantId and spaceId; prevent foreign-ID mutation.
- [ ] Add participant: only shared ACTIVE space, caller manager, target active GroupMember, no current interval. `effectiveFrom=todayInSpaceTimezone`; no client date override. Role initially PARTICIPANT. Promote via separate authorized role route. If a historical interval ends today, new same-day interval is allowed; old financial history remains attributed to original interval/date, not rewritten.
- [ ] Role change/end: count current managers under lock. Demoting or ending the only manager returns 409. End dates are today and roles remain historical; a self-end may occur after a manager handoff. Empty archived boxes allow end but no promotions; therefore manager handoff must occur before archival. Archived last manager remains, preserving the invariant; group owner must retain group membership if still a box participant. Repeated end of the same interval returns existing interval only to an authorized manager/current target identity, with no extra audit; stranger remains denied.
- [ ] Archive: authenticate manager, return existing archived projection on repeat; reject financial-history latch; set status ARCHIVED/archivedAt/server time/version+1 and audit. Metadata records/role changes are not formal financial records, so do not block empty archive.
- [ ] Groups integration: inside existing group mutation lock and before LEFT/REMOVED, query current SpaceParticipant joined to group; reject if any. Before group archive query ACTIVE FinancialSpace; reject rather than auto-archive someone's box. Preserve existing Fund guards unchanged. This is a real conservative check, not an obligation service returning false.
- [ ] Run `npm test -- --runInBand --testPathPattern='financial-spaces|groups.service'` and `npm run test:spaces-db`; expected GREEN. Commit `feat(spaces): enforce participant governance and safe lifecycle`.

## Task 5: Web strict contracts and repeatable dev fixtures

Files: Web contract/parser tests, Prisma seed, DB integration fixtures.

- [ ] Add RED Zod tests parsing a governance item with injected `balance_minor`, `participants`, `currency` or `note` must fail; participant projection requires mode/role/version and scope consistency; old Fund object rejected. Run from web `npm test -- src/shared/api/financial-space-contracts.test.ts`.
- [ ] Implement an independent schema, importing only existing `currencySchema`; new IDs use UUID validation. Use `.strict()` for both union arms and `.superRefine()` for mode/scope invariants. Exact shape:

```ts
import { z } from 'zod';
import { currencySchema } from './domain-contracts';
const uuid = z.string().uuid();
const mode = z.enum(['PERSONAL_EXPENSES','SHARED_EXPENSES','POOLED_FUND']);
const status = z.enum(['ACTIVE','ARCHIVED']);
const base = {id: uuid, name: z.string().min(1).max(100), mode, status};
const governance = z.object({
  ...base, mode: z.enum(['SHARED_EXPENSES','POOLED_FUND']),
  access: z.literal('GOVERNANCE'),
}).strict();
const participant = z.object({
  ...base, access: z.literal('PARTICIPANT'), currency: currencySchema,
  timezone: z.string().min(1), opened_on: z.iso.date(),
  group_id: uuid.nullable(), owner_user_id: uuid.nullable(),
  role: z.enum(['MANAGER','PARTICIPANT']), version: z.number().int().positive().safe(),
  first_formal_record_at: z.iso.datetime({offset: true}).nullable(),
}).strict().superRefine((value, ctx) => {
  const personal = value.mode === 'PERSONAL_EXPENSES';
  if (personal ? value.group_id !== null || value.owner_user_id === null
               : value.group_id === null || value.owner_user_id !== null) {
    ctx.addIssue({code: 'custom', message: 'SPACE_SCOPE_INVALID'});
  }
});
export const financialSpaceSchema = z.union([governance, participant]);
export type FinancialSpace = z.infer<typeof financialSpaceSchema>;
```

- [ ] Include matching exact DTO fixture in backend HTTP tests and Web contract tests: same uppercase enum, snake_case field names, nullable scope fields, version=1. Test governance PERSONAL_EXPENSES rejection. Narrow backend GovernanceSpace.mode to `Exclude<FinancialSpaceMode, 'PERSONAL_EXPENSES'>` so the compile-time contract also rejects private governance entries.
- [ ] Seed local demo: existing Edward plus Blair (group member) and Casey (group owner outside Edward's box), shared/pooled boxes with Edward manager and Blair participant, Edward personal box. Deterministic UUIDs for boxes/groups; user upsert retains Mimic ID. Repeat seed must not duplicate intervals or change firstFormalRecordAt/mode of populated boxes. Put guard at seed entry to require explicit local dev/test URL before adding demo accounts; never run it externally.
- [ ] Run Web contract test GREEN, seed twice locally, assert space/participant counts unchanged and no financial rows created. Commit `feat(spaces): add strict client contracts and local fixtures`.

## Task 6: Concurrency, full acceptance and documentation gate

- [ ] Expand real PostgreSQL RED tests before any necessary fixes: stale rename vs archive, demote vs demote, add vs group leave, role change vs group removal, duplicate add, foreign participant ID, and rollback when audit insert fails. Use two independent Prisma clients and Promise.allSettled; assert final DB state, one surviving manager, correct audit count and version. Do not assert a scheduling-dependent winning actor.
- [ ] Execute DB acceptance without service overrides: authenticate three real users, create boxes, verify private/governance/participant reads, add/promote/end, archive/retry; verify HTTP payload has no financial summary. Test direct DB mode latch guard and scope check separately from HTTP policy.
- [ ] Make minimal fixes for observed failures, rerun each RED case GREEN; no broad opportunistic Fund fixes. Verify backend has no import from `financial-spaces` to `accounting/accounting-calculator`, `funds`, `contributions`, `expenses`, or `settlements`. The core may import existing group mutation lock and Prisma/Auth only; Groups imports core services, core does not import GroupsModule (avoid DI cycle).
- [ ] Run the following commands from the indicated subdirectories, with test DB guard satisfied. Each must exit 0; collect actual counts, not estimates:

```powershell
# backend/
npx prisma validate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:spaces-db
# web/
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://127.0.0.1:3101/api/v1'
npm run build
```

- [ ] Update `.agents/features.md` with P1 management complete, P2–P7 remaining, supersession reference; append `.agents/devlog.md` with Task/Scope/What changed/Decisions/Known gaps and actual verification evidence. No claim of new accounting or beta readiness.
- [ ] Use self-review on complete P1 diff: correctness, boundaries, privacy, concurrency, data migration, API type consistency, actual executable acceptance. Apply verification-before-completion, run `git diff --check`, inspect `git status --short`, stage only named P1 files and commit `test(spaces): verify core privacy and concurrency`. Include docs in this final phase commit, or a separate `docs: record financial spaces core acceptance`.
- [ ] Report accepted API slice, commands/results, local migration scope and limitations. P2 needs its own detailed implementation plan and an execution checkpoint; do not silently begin financial posting because core tests pass.

## Plan self-review findings and resolutions

1. **Spec coverage:** P1 covers neutral naming, personal/shared scope, roles, privacy, effective dates, first-record identity guard and metadata audit. Full design traceability and nonempty obligation/locking/confirmation cases are mapped to P2–P7 in roadmap, not claimed complete here.
2. **Avoided unusable shell:** complete core management is accepted with real authenticated API; first expense delivery is moved into P2. No empty financial provider, zero summary or confirmation endpoint is shipped in P1.
3. **Type consistency:** FinancialSpaceMode uppercase across Prisma/DTO/Web; DB bigint and future wire string reserved for financial phases; current core has no amount field. Participation current state derives from effectiveTo, no conflicting ACTIVE/LEFT flag. Role=MANAGER implies participation; governance access is a projection, not a role.
4. **Migration consistency:** all reverse Prisma relations named; User actual table casing retained; legacy data is not converted. Metadata operations do not latch firstFormalRecordAt; latched timestamp cannot clear. Scope is immutable regardless of mode.
5. **Concurrency/privacy:** one lock order includes legacy group mutations; every dependent authorization is rechecked after lock. Governance select excludes amounts before serialization, not just UI hiding. Group departure cannot strand a current manager through a separate route.
6. **Explicit conservative scope:** P1 nonempty archive/exit refusal is an acceptance boundary, not a permanent accounting rule. P3/P5 replace it with tested obligation rules when posting is enabled. Real batch locks and idempotent financial confirmation tests belong to those owning phases.
7. **Validation order:** fixed a controller-only validation bug in the draft plan: current global whitelist would strip foreign mode fields first. Conditional global validation now rejects them before stripping while retaining legacy DTO behavior; actual app-pipe integration is tested.
8. **Unresolved deployment assumptions:** local PostgreSQL availability is an execution prerequisite, not a passed test. No external database command is authorized by this plan. Complete three-mode browser acceptance remains a P7 release gate.

## Planning-turn verification record

Only this plan and the roadmap were changed. Both documents were reread for scope, names, nullable ownership, mode projections and migration dependencies; staged `git diff --cached --check` passed. No product files or database were changed. The new worktree is based exactly on `66f29e3`.

Baseline setup was attempted independently in backend and web with `npm ci --no-audit --no-fund`. Both failed with ENOTCACHED (missing registry responses in offline cache), with cleanup EPERM warnings inside the newly created worktree's node_modules. Network-enabled retries produced no completion and were interrupted. Consequently dependency installation, build, unit tests, e2e and browser acceptance are **not verified in this planning turn**. Before execution, complete installation and the baseline commands in Task 6; investigate baseline failures before changing product code. This environment limitation does not prevent review or commit of the documentation-only plan.
