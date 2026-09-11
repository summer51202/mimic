# Financial Spaces Phase 2 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to execute task-by-task in this task. The user selected sequential execution; no subagents or repeated execution-method question. Checkboxes track execution, not planning completion.

**Goal:** Deliver private daily expense bookkeeping from browser entry to persisted monthly consumption, with shared category/tag infrastructure for the later shared and pooled services.

**Architecture:** FinancialSpace remains the authorization and mutation-lock boundary. ExpenseRecord stores common facts; PersonalExpensesService is the only financial writer enabled in P2. Taxonomy stores stable terms and merge relationships without rewriting historical financial records. Existing Fund APIs/pages remain disconnected.

**Tech Stack:** NestJS 10, Prisma 5/PostgreSQL, TypeScript bigint, Jest/Supertest, Next.js 16/React 19, Zod 4, Vitest/Testing Library, real-backend Playwright.

## Authority, starting point and acceptance

- Source of truth: approved design `docs/superpowers/specs/2026-09-11-financial-spaces-product-model-design.md` at `66f29e3`; dependency order is in `2026-09-11-financial-spaces-roadmap.md`. No brainstorming or universal Fund semantics.
- Worktree `D:/Project/mimic/.worktrees/financial-spaces`, branch `codex/financial-spaces`, P1 tip `69817b3`, clean before planning. Original root remains on main; preserve `.codex-remote-attachments/` and `reference/`.
- P1 baseline: backend 266 unit / 54 legacy e2e / 27 DB tests; Web 446 tests; all baseline commands passed. Web standalone manifest-copy warning predates this redesign.
- Task-owned PostgreSQL `.session/postgres` is stopped, loopback port 55439, database `mimic_financial_spaces_test`. Restart with a new schema `phase2`: final P1 whitespace normalization changed its new migration checksum after earlier scratch schemas were tested. Do not edit migration history or reset external databases.
- P1 closing task requires P2's detailed plan and execution checkpoint. Commit this document before product changes; retain the already selected inline execution method after that checkpoint.

P2 acceptance is a reachable **我的寶箱 → 個人記帳** page: a user without a group creates a private box, creates/edits/soft-deletes daily expenses, selects/defaults category/tags, manages private custom taxonomy and sees the selected box's monthly spending/category breakdown. Group taxonomy APIs are usable in P2; shared/pooled financial posting belongs to P3/P5.

No personal income/accounts/balance/transfer, payer/allocation, contribution/reimbursement, settlement or shared-source reference is exposed here. P4 owns references. P6 owns full home/navigation replacement; the minimal personal entry is delivered now. P7 owns durable offline drafts. P2 disables offline submission, preserves in-memory input and shows not-submitted status, without claiming a failed write was saved or posted.

## Exact file map

Paths are relative to the implementation worktree. Names in a comma-separated cell mean separate files under the named directory.

| Task | Create | Modify |
|---|---|---|
| 1 values | `backend/src/modules/expense-records/expense-values.ts`, `expense-values.spec.ts`; `web/src/shared/finance/major-to-minor.ts`, `major-to-minor.test.ts` | none |
| 2 schema | `backend/prisma/migrations/20260911000200_expense_records_taxonomy/migration.sql`; `backend/test/personal-expenses.e2e-spec.ts`; `backend/test/helpers/financial-spaces-db.ts`, `financial-spaces-db.spec.ts` | `backend/prisma/schema.prisma`, `backend/test/jest-financial-spaces-db.json`, `backend/test/jest-e2e.json`; both P1 real-DB suites use extracted guard |
| 3 catalog | `backend/src/modules/taxonomy/system-taxonomy.ts`, `system-taxonomy.spec.ts`; `backend/prisma/seed-taxonomy.ts` | `backend/prisma/seed.ts` |
| 4 taxonomy | `backend/src/modules/taxonomy/taxonomy.types.ts`, `taxonomy-policy.ts`, `taxonomy-policy.spec.ts`, `taxonomy.service.ts`, `taxonomy.service.spec.ts`, `taxonomy.controller.ts`, `taxonomy.module.ts`, `dto/taxonomy.dto.ts`; `backend/test/taxonomy.e2e-spec.ts` | `backend/src/app.module.ts`, DB Jest selection |
| 5 writes | `backend/src/modules/expense-records/expense-records.types.ts`, `expense-records.service.ts`, `expense-mutation.service.ts`, `expense-records.module.ts`; `backend/src/modules/personal-expenses/personal-expenses.service.ts`, `personal-expenses.controller.ts`, `personal-expenses.module.ts`, `dto/personal-expense.dto.ts`, `dto/personal-expense.dto.spec.ts`; `backend/test/personal-expenses-concurrency.e2e-spec.ts` | AppModule, DB Jest selection |
| 6 reads | `backend/src/modules/personal-expenses/personal-consumption.ts`, `personal-consumption.spec.ts`, `personal-expense-queries.service.ts` | personal controller/module and DB suite |
| 7 Web API | `web/src/shared/api/personal-expense-contracts.ts`, `personal-expense-contracts.test.ts`, `taxonomy-contracts.ts`, `taxonomy-contracts.test.ts`; BFF routes below; `web/src/app/api/app/personal-routes.test.ts` | no legacy Fund contracts |
| 8 personal UI | `web/src/app/app/personal/page.tsx`, `page.test.tsx`, `error.tsx`, `loading.tsx`; `web/src/features/personal-expenses/personal-queries.ts`, `personal-queries.test.ts`, `personal-page.tsx`, `personal-page.test.tsx`, `personal-box-form.tsx`, `personal-box-form.test.tsx`, `personal-expense-form.tsx`, `personal-expense-form.test.tsx`, `personal-expenses.module.css` | `web/src/shared/navigation/app-section.ts`, `app-section.test.ts`, `app-navigation.tsx`, `app-navigation.module.css`, existing navigation tests |
| 9 taxonomy UI | `web/src/features/taxonomy/taxonomy-picker.tsx`, `taxonomy-picker.test.tsx`, `taxonomy-manager.tsx`, `taxonomy-manager.test.tsx`, `taxonomy.module.css` | personal page/form |
| 10 acceptance | `web/e2e/personal-expenses.runtime.spec.ts`; `docs/superpowers/plans/2026-09-11-financial-spaces-phase-2-acceptance.md` | `.agents/features.md`, `.agents/devlog.md`, this plan |

New BFF files under `web/src/app/api/app/`:

```text
me/spaces/route.ts                                       GET,POST
spaces/[spaceId]/route.ts                                GET
spaces/[spaceId]/personal-expenses/route.ts               GET,POST
spaces/[spaceId]/personal-expenses/[expenseId]/route.ts   PATCH
spaces/[spaceId]/personal-expenses/[expenseId]/delete/route.ts POST
spaces/[spaceId]/taxonomy/route.ts                       GET
me/taxonomy/route.ts                                     GET,POST
me/taxonomy/[termId]/route.ts                            PATCH
me/taxonomy/[termId]/merge/route.ts                      POST
me/taxonomy/[termId]/archive/route.ts                    POST
```

Forward to the same backend path without `/app`, preserving request body keys. Use UUID validation rather than permissive legacy IDs. Reuse `forwardAppRoute` for CSRF/auth/refresh/no-store: its success envelope has HTTP 200 even for upstream 201, which Web tests must reflect. SSR queries use `authenticatedServerApi<unknown>` and parse strict schemas. Keep amount strings unchanged through the BFF.

## Data model and migration

Append new models; leave legacy Category/Expense/Fund intact. Expand enums into standard multiline Prisma syntax. UUID annotations and relation names below are exact.

```prisma
enum TaxonomyKind { CATEGORY TAG }
enum TaxonomyScope { SYSTEM PERSONAL GROUP }
enum TaxonomyStatus { ACTIVE ARCHIVED MERGED }
enum TaxonomyAction { CREATE RENAME MERGE ARCHIVE }
enum ExpenseMutationAction { CREATE UPDATE DELETE }

model TaxonomyTerm {
  id             String @id @default(uuid()) @db.Uuid
  kind           TaxonomyKind
  scope          TaxonomyScope
  scopeKey       String @map("scope_key") @db.VarChar(64)
  ownerUserId    String? @map("owner_user_id") @db.Uuid
  groupId        String? @map("group_id") @db.Uuid
  systemKey      String? @unique @map("system_key") @db.VarChar(64)
  name           String @db.VarChar(60)
  normalizedName String @map("normalized_name") @db.VarChar(120)
  translations   Json @default("{}")
  categoryKeys   String[] @default([]) @map("category_keys")
  status         TaxonomyStatus @default(ACTIVE)
  mergedIntoId   String? @map("merged_into_id") @db.Uuid
  createdById    String? @map("created_by_id") @db.Uuid
  version        Int @default(1)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  owner          User? @relation("TaxonomyOwner", fields: [ownerUserId], references: [id])
  group          Group? @relation(fields: [groupId], references: [id])
  creator        User? @relation("TaxonomyCreator", fields: [createdById], references: [id])
  mergedInto     TaxonomyTerm? @relation("TaxonomyMerge", fields: [mergedIntoId], references: [id])
  mergedSources  TaxonomyTerm[] @relation("TaxonomyMerge")
  expenseRecords ExpenseRecord[] @relation("ExpenseCategory")
  expenseTags    ExpenseRecordTag[]
  auditEvents    TaxonomyAuditEvent[]
  @@index([scopeKey, kind, status])
  @@map("taxonomy_terms")
}
model TaxonomyAuditEvent {
  id          String @id @default(uuid()) @db.Uuid
  termId      String @map("term_id") @db.Uuid
  actorUserId String @map("actor_user_id") @db.Uuid
  action      TaxonomyAction
  before      Json?
  after       Json
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  term        TaxonomyTerm @relation(fields: [termId], references: [id])
  actor       User @relation("TaxonomyAuditActor", fields: [actorUserId], references: [id])
  @@index([termId, createdAt])
  @@map("taxonomy_audit_events")
}
model ExpenseRecord {
  id          String @id @default(uuid()) @db.Uuid
  spaceId     String @map("space_id") @db.Uuid
  amountMinor BigInt @map("amount_minor")
  occurredOn  DateTime @map("occurred_on") @db.Date
  title       String @db.VarChar(200)
  note        String? @db.VarChar(2000)
  categoryId  String @map("category_id") @db.Uuid
  status      RecordStatus @default(ACTIVE)
  version     Int @default(1)
  createdById String @map("created_by_id") @db.Uuid
  updatedById String @map("updated_by_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  space       FinancialSpace @relation(fields: [spaceId], references: [id])
  category    TaxonomyTerm @relation("ExpenseCategory", fields: [categoryId], references: [id])
  creator     User @relation("ExpenseRecordCreator", fields: [createdById], references: [id])
  updater     User @relation("ExpenseRecordUpdater", fields: [updatedById], references: [id])
  tags        ExpenseRecordTag[]
  @@index([spaceId, status, occurredOn, id])
  @@map("expense_records")
}
model ExpenseRecordTag {
  expenseId String @map("expense_id") @db.Uuid
  tagId     String @map("tag_id") @db.Uuid
  expense   ExpenseRecord @relation(fields: [expenseId], references: [id])
  tag       TaxonomyTerm @relation(fields: [tagId], references: [id])
  @@id([expenseId, tagId])
  @@map("expense_record_tags")
}
model ExpenseMutationReceipt {
  id          String @id @default(uuid()) @db.Uuid
  spaceId     String @map("space_id") @db.Uuid
  actorUserId String @map("actor_user_id") @db.Uuid
  requestId   String @map("request_id") @db.Uuid
  action      ExpenseMutationAction
  payloadHash String @map("payload_hash") @db.VarChar(64)
  response    Json
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  space       FinancialSpace @relation(fields: [spaceId], references: [id])
  actor       User @relation("ExpenseReceiptActor", fields: [actorUserId], references: [id])
  @@unique([spaceId, actorUserId, requestId])
  @@map("expense_mutation_receipts")
}
```

Add SpaceAuditAction values `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`. Add FinancialSpace reverse relations `expenseRecords ExpenseRecord[]`, `expenseReceipts ExpenseMutationReceipt[]`; Group `taxonomyTerms TaxonomyTerm[]`; User reverse relations `ownedTaxonomyTerms`, `createdTaxonomyTerms`, `taxonomyAuditEvents`, `createdExpenseRecords`, `updatedExpenseRecords`, `expenseMutationReceipts`, each with its named relation above.

Append the following checks to generated additive SQL:

```sql
ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_scope_check CHECK (
 (scope='SYSTEM' AND owner_user_id IS NULL AND group_id IS NULL AND system_key IS NOT NULL AND created_by_id IS NULL AND scope_key='SYSTEM') OR
 (scope='PERSONAL' AND owner_user_id IS NOT NULL AND group_id IS NULL AND system_key IS NULL AND created_by_id IS NOT NULL AND scope_key='PERSONAL:' || owner_user_id::text) OR
 (scope='GROUP' AND group_id IS NOT NULL AND owner_user_id IS NULL AND system_key IS NULL AND created_by_id IS NOT NULL AND scope_key='GROUP:' || group_id::text)
);
ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_merge_check CHECK (
 (status='MERGED' AND merged_into_id IS NOT NULL AND merged_into_id<>id) OR
 (status<>'MERGED' AND merged_into_id IS NULL)
);
CREATE UNIQUE INDEX taxonomy_active_name ON taxonomy_terms(scope_key,kind,normalized_name) WHERE status='ACTIVE';
ALTER TABLE taxonomy_terms ADD CONSTRAINT taxonomy_version_check CHECK(version>0);
ALTER TABLE expense_records ADD CONSTRAINT expense_amount_positive CHECK(amount_minor>0);
ALTER TABLE expense_records ADD CONSTRAINT expense_version_positive CHECK(version>0);
```

Currency is inherited through FinancialSpace, whose first-record trigger protects currency/timezone/mode. No second currency column. Validate taxonomy kind/scope under the transaction lock. Wrong-kind, private cross-owner, cross-group and archived new selections reject before persistence. Test CHECK, unique and FK failures. No legacy transformation or destructive migration SQL.

## Values and wire contracts

`expense-values.ts` exports `parseExpenseMinor(raw:string):bigint`, `parseExpenseDate(raw:string):Date`, `monthBounds(month:string):{start:Date;endExclusive:Date}`. Record amounts are 1..9223372036854775807; aggregate sums may exceed that row limit. Reject numeric JSON, exponent/decimal/signed/leading-zero values. Money never passes through Number/parseFloat.

```ts
export function parseExpenseMinor(raw: string): bigint {
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error('EXPENSE_AMOUNT_INVALID');
  const amount = BigInt(raw);
  if (amount > 9223372036854775807n) throw new Error('EXPENSE_AMOUNT_INVALID');
  return amount;
}
export function parseExpenseDate(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('EXPENSE_DATE_INVALID');
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0,10) !== raw || raw < '0001-01-01') {
    throw new Error('EXPENSE_DATE_INVALID');
  }
  return date;
}
```

Personal past-date entry may precede box creation: it does not assign shared retrospective responsibility. Reject future dates relative to `FinancialSpacesService.today(space.timezone)`. P3 retains its separate participation-date rules. Month uses first day inclusive/next first day exclusive with December rollover; reject month 00/13. Preserve DATE text in the browser, without local-time conversion.

Web `majorToMinorString(value:string,currency:string):string` gets fraction digits from Intl, splits decimal text, rejects excessive precision, multiplies integer BigInts by `10n ** BigInt(digits)` and adds the padded fraction; enforce the row range. Reuse existing bigint-safe `formatMinorUnit` for display. Do not reuse Activity's number-returning parser.

```ts
export type PersonalExpenseInput = {
  request_id: string; amount_minor: string; occurred_on: string;
  title: string; category_id?: string; tag_ids?: string[]; note?: string | null;
};
export type PersonalExpenseUpdate = PersonalExpenseInput & { version: number };
export type PersonalExpenseDelete = { request_id: string; version: number };
export type ExpenseProjection = {
  id: string; space_id: string; amount_minor: string; currency: string;
  occurred_on: string; title: string; note: string | null;
  category_id: string; tag_ids: string[]; status: 'ACTIVE' | 'DELETED';
  version: number; created_by: string; updated_by: string;
  created_at: string; updated_at: string;
};
export type ExpenseMutationResult = { record: ExpenseProjection; change_minor: string };
export type PersonalMonth = {
  space_id: string; mode: 'PERSONAL_EXPENSES'; currency: string;
  month: string; space_version: number; spending_minor: string;
  categories: Array<{category_id:string;spending_minor:string}>;
  items: ExpenseProjection[]; next_cursor: string | null;
};
export type TaxonomyTermProjection = {
  id: string; kind: 'CATEGORY' | 'TAG'; scope: 'SYSTEM' | 'PERSONAL' | 'GROUP';
  name: string; status: 'ACTIVE' | 'ARCHIVED' | 'MERGED';
  canonical_id: string; version: number;
};
export type TaxonomyPickerResult = {
  terms: TaxonomyTermProjection[];
  recent_ids: string[]; frequent_ids: string[]; context_ids: string[];
};
```

Backend types live in the named `*.types.ts`; Web derives matching types from strict Zod schemas. Amount/delta/zero output is always canonical text. Expense category/tag IDs remain stored original IDs; labels/canonical grouping come from taxonomy. No raw Prisma spread, owner email, foreign private names, amounts from another box or account balance fields.

### API table

All routes are JWT-protected under `/api/v1` and return `{data}`.

| Route | Input | Result/policy |
|---|---|---|
| GET `/spaces/:spaceId/taxonomy` | kind CATEGORY/TAG, optional category_id/q≤60/locale zh-TW or en | Picker result; current participant; actor-private or box-group terms plus system |
| GET `/me/taxonomy` | kind, locale, include_inactive true/false | Owner custom + system term array for management, no shared usage |
| GET `/groups/:groupId/taxonomy` | same | Active group member; names only, no usage counts/expense IDs/amounts |
| POST `/me/taxonomy`, `/groups/:groupId/taxonomy` | `{kind,name}` | 201 custom term; server determines owner/group/creator |
| PATCH respective `/:termId` | `{name,version}` | Rename keeps identity |
| POST respective `/:termId/merge` | `{target_id,version,target_version}` | ACTIVE custom source→MERGED; original financial references untouched |
| POST respective `/:termId/archive` | `{version}` | ACTIVE→ARCHIVED; retain history |
| POST `/spaces/:spaceId/personal-expenses` | PersonalExpenseInput | 201 result; active personal owner; default uncategorized, [], null |
| GET `/spaces/:spaceId/personal-expenses` | month YYYY-MM, cursor UUID optional, limit 1..100 default25 | PersonalMonth; archived personal box readable |
| PATCH `/spaces/:spaceId/personal-expenses/:expenseId` | PersonalExpenseUpdate | 200 result; full replacement of editable fields, expected record version |
| POST `/spaces/:spaceId/personal-expenses/:expenseId/delete` | PersonalExpenseDelete | 200 result; ACTIVE→DELETED; same-key replay returns receipt |

DTO classes: `CreateTaxonomyDto`, `RenameTaxonomyDto`, `MergeTaxonomyDto`, `ArchiveTaxonomyDto`, `TaxonomyQueryDto`; `CreatePersonalExpenseDto`, `UpdatePersonalExpenseDto`, `DeletePersonalExpenseDto`, `PersonalMonthQueryDto`. All extend P1 SpaceRequestDto (through a base DTO where relevant). Optional means undefined-only except nullable note. Trim names/title and enforce length 1..60/1..200, note≤2000, unique UUID tags≤20. Update is full replacement: omission resets category/tags/note to defaults, so editing UI sends current values. Query numbers transform explicitly; JSON amounts remain strings. Reject client currency/owner/payers/allocations/split_mode/payment_source/contributions/status.

Errors: unauthenticated401; inaccessible box/record/term404 with `SPACE_NOT_FOUND`/`EXPENSE_NOT_FOUND`/`TAXONOMY_NOT_FOUND`; check authorization before disclosing mode. Authorized shared/pooled personal-write attempt409 `SPACE_MODE_MISMATCH`; archived write409 `SPACE_ARCHIVED`. Invalid selection400 `TAXONOMY_SELECTION_INVALID`; duplicate active normalized name409 `TAXONOMY_NAME_EXISTS`; stale term/record409 `TAXONOMY_VERSION_CONFLICT`/`EXPENSE_VERSION_CONFLICT`; system mutation403 `SYSTEM_TAXONOMY_IMMUTABLE`; new-key mutation of deleted record409 `EXPENSE_DELETED`; same key/different normalized body/action/target409 `IDEMPOTENCY_KEY_REUSED`.

Group taxonomy creation: active member. Rename/merge/archive: term creator or active group owner, rechecked under group lock. These are vocabulary permissions, never financial access. Personal custom mutation: owner only. Archive retry by authorized actor returns existing archived term without a new event; same-name rename creates no version/audit. Merge retry with the same canonical target returns current source; a different target for an already-merged source conflicts.

## Stable taxonomy catalog and lifecycle

Category UUIDs: `20000000-0000-4000-8000-0000000000NN`, NN01..16. Tag UUIDs: `20000000-0000-4000-8000-0000000010NN`, NN01..15. Keys use `category.*` and `tag.*`; seed never generates replacement IDs.

| NN | Category key | zh-TW / en |
|---|---|---|
|01|food|飲食 / Food|
|02|household|日用品 / Household supplies|
|03|housing|住房 / Housing|
|04|utilities|水電與通訊 / Utilities and communications|
|05|transportation|交通 / Transportation|
|06|shopping|購物 / Shopping|
|07|entertainment|娛樂 / Entertainment|
|08|travel|旅行 / Travel|
|09|health|健康 / Health|
|10|education|教育 / Education|
|11|pets|寵物 / Pets|
|12|family|家庭與育兒 / Family and childcare|
|13|subscriptions|訂閱 / Subscriptions|
|14|gifts|禮物 / Gifts|
|15|insurance_taxes|保險與稅務 / Insurance and taxes|
|16|uncategorized|未分類 / Uncategorized|

Tag order, key, translated name and relevant category keys:

```ts
const tags = [
 ['breakfast','早餐',['food']], ['lunch','午餐',['food']], ['dinner','晚餐',['food']],
 ['coffee','咖啡',['food']], ['delivery','外送',['food']],
 ['supermarket','超市',['food','household']], ['public_transit','大眾運輸',['transportation']],
 ['taxi','計程車',['transportation']], ['parking','停車',['transportation']],
 ['fuel','加油',['transportation']], ['date','約會',['food','entertainment']],
 ['family','家人',['family']], ['friends','朋友',['entertainment']],
 ['travel','旅行',['travel']], ['work_reimbursement','工作報銷',[]],
] as const;
```

English tag labels replace underscores with spaces and capitalize first letter. Store full `category.*` context keys. `system-taxonomy.ts` exports CATEGORY_CATALOG, TAG_CATALOG and UNCATEGORIZED_ID. `seedTaxonomy(prisma)` upserts by systemKey, updating translations without replacing identity; custom terms untouched. Run it explicitly from guarded local seed. Missing uncategorized is a configuration error, never null category or automatic request-time seed.

Normalize custom names with `trim().normalize('NFKC').toLocaleLowerCase('en-US')`; reject an empty or >120-character normalized result before persistence. Merge graph traversal uses visited IDs; cycle throws `TAXONOMY_MERGE_CYCLE`. Custom source may target same scope or SYSTEM of same kind; system source, cross-owner/group and cross-kind reject. Source must be ACTIVE; target must resolve ACTIVE. Store current canonical target, verify source and target versions under scope lock. No expense or receipt is rewritten. Rename/archive/merge gets TaxonomyAuditEvent with actor/time.

Existing archived term may stay unchanged during record edit; selecting a new archived term rejects. New merged selection resolves to target; unchanged historical merged ID remains original. Deduplicate newly resolved tag IDs before inserting the join rows; two old tags merging to one target must not cause a duplicate-key error. Archived/merged terms remain readable for historical labels. Statistics group through canonical IDs without changing financial facts or settled-period content in future phases.

Picker order: actor's recent5 distinct canonical IDs by latest successful expense create/update audit; frequent5 by distinct ACTIVE records created by actor; category-context suggestions; remaining localized searchable defaults/custom choices. Scope usage to selected authorized box, never another participant's usage. Deduplicate in that order, deterministic ID tiebreak. q filters each group by localized/system name. Response has IDs, never numeric usage counts. Show custom creation after search finds no exact normalized match; management has explicit creation. Typing never writes a term.

## Transaction and consumption algorithms

Personal taxonomy lock key `taxonomy:PERSONAL:<actorId>` precedes space lock. Group taxonomy uses existing group mutation lock; future shared writes use group→space. No scope lock is acquired after a space lock. Taxonomy-only mutations do not need space lock.

`TaxonomyService.lockScope(tx,actorId,groupId)` acquires scope lock. `resolveSelection(tx,space,actorId,categoryId,tagIds,previous?)` validates scope/kind/status/merge and returns `{categoryId,tagIds}`; previous permits unchanged historical assignments. `listForSpace`, `listForOwner`, `listForGroup`, `create`, `rename`, `merge`, `archive` implement the API table. Authorization is always resolved from JWT and persisted membership.

`ExpenseMutationService.run(spaceId,actorId,requestId,action,payload,operation)` is one transaction:

1. Lock personal taxonomy then space; recheck P1 participant/owner and PERSONAL_EXPENSES. Reject inaccessible before wrong-mode disclosure. A shared target performs no writes under the personal lock.
2. SHA-256 an explicitly ordered JSON object containing action, expense ID/null, version/null, trimmed title, requested category/null, sorted requested tags, note, amount/date. Exclude request ID; never rely on arbitrary input key order.
3. Receipt lookup `[spaceId,actorUserId,requestId]`: same hash/action returns stored JSON after authorization, including if later archived. Different hash/action rejects. Never disclose receipt before authorization.
4. Require ACTIVE box. Update/delete re-read record by both space and record IDs, require ACTIVE and version. Resolve taxonomy under the same lock.
5. Create record/tags, replace editable fields/tags, or soft-delete. Increment record version for update/delete and space version once per actual financial mutation. First create sets firstFormalRecordAt only if null; later writes never change it.
6. Write SpaceAuditEvent before/after using string money, then receipt JSON. Any failure rolls back records/tags, latch, versions, audit and receipt.

Receipt operation callback receives the existing Prisma TransactionClient, never opens a nested transaction. `ExpenseRecordsService` implements common `create`, `replace`, `softDelete`, `project` persistence only, no controller or mode dispatch. PersonalExpensesService owns all enabled posting rules. Future modes cannot call its accounting service.

Create consumption delta=+amount; update=new−old; delete=−old. Moving occurrence month can affect two month views: copy says saved amount, then authoritative refresh, never labels the delta as necessarily this month's change. A repeated same-key delete returns receipt; new-key deleted mutation conflicts. No money or audit is doubled.

Month read uses RepeatableRead, authorizes owner/mode, filters ACTIVE records by space and `[start,endExclusive)`, orders occurredOn DESC/id DESC and reads limit+1. Cursor must belong to this box/month/status; reject instead of exposing foreign metadata. Query full-month category sums separately from the page:

```sql
SELECT category_id, COALESCE(SUM(amount_minor),0)::text AS amount
FROM expense_records
WHERE space_id=$1::uuid AND status='ACTIVE'
  AND occurred_on >= $2::date AND occurred_on < $3::date
GROUP BY category_id;
```

Use Prisma tagged parameters. `groupConsumption(rows:Array<{category_id:string;amount:string}>,canonical:ReadonlyMap<string,string>)` sums BigInts into canonical category buckets, returns `{spending_minor,categories}` with string totals and ID-sorted categories. Missing canonical resolution fails the read rather than omitting a category. An authoritative empty month is `"0"`; failed reads throw. No cross-box/currency aggregation. `space_version` lets pagination discard pages from different financial snapshots; taxonomy labels are refreshed with the page rather than frozen into monetary records.

## TDD tasks and commits

### Task 1 — Exact amounts and calendar dates

- [ ] Write backend value tests accepting `9007199254740993`/bigint maximum and rejecting zero, negative, plus, leading zero, decimal, exponent and overflow. Test leap date, Feb30, timestamp rejection and December rollover.
- [ ] Write Web tests for TWD1.25→125, JPY125→125, KWD1.234→1234 and exact large values:

```ts
expect(majorToMinorString('90071992547409.93','TWD')).toBe('9007199254740993');
expect(() => majorToMinorString('1.001','TWD')).toThrow();
```

- [ ] Run backend `npm test -- --runInBand --testPathPattern=expense-values` and Web `npm test -- src/shared/finance/major-to-minor.test.ts` RED. Implement specified parsers; translate domain input errors to400 at DTO/service boundary. Re-run GREEN. Commit `feat: preserve exact personal expense values`.

### Task 2 — Additive persistence

- [ ] Extract guarded DB helper, test missing/invalid protocol/host/database and accepted loopback. Add P2 suite names explicitly to dedicated DB testMatch and ordinary-e2e exclusions. Keep P1 suites mandatory.
- [ ] Restart only task-owned cluster; deploy P1 history into phase2, snapshot a legacy Fund and P1 box. Write absent-table test before migration:

```ts
const [row] = await prisma.$queryRaw<Array<{table_name:string|null}>>`
 SELECT to_regclass('expense_records')::text AS table_name`;
expect(row.table_name).toBe('expense_records');
```

- [ ] Run `npm run test:spaces-db -- --testPathPattern=personal-expenses.e2e-spec` RED. Add schema/reverse relations and generate reviewed additive migration with checks; no DROP or legacy UPDATE. Run validate/generate/deploy and DB tests GREEN.
- [ ] Test invalid scope, merge-self, duplicate active name, zero amount, duplicate receipt and FK failures. Compare legacy/P1 snapshots unchanged. Deploy full history to phase2_fresh as well. Commit `feat: persist expense facts and taxonomy identities`.

### Task 3 — Stable defaults

- [ ] Write catalog tests for exactly16 categories/15 tags, stable uncategorized ID, both translations and valid context references. Write repeated-seed DB test: IDs/counts stable and custom term untouched.
- [ ] Run `npm test -- --runInBand --testPathPattern=system-taxonomy` and dedicated catalog DB test RED. Implement exact catalog/seed above, call seedTaxonomy before personal-box seed, re-run GREEN and seed twice locally. Commit `feat: provide stable localized expense taxonomy`.

### Task 4 — Scoped taxonomy lifecycle

- [ ] Write policy tests: different owners' same-name terms independent; A→B→C resolvesC; cycles/cross-kind/cross-scope rejected; retain archived original versus reject new archived selection; recent/frequent/context/default order and dedup.
- [ ] Write real HTTP tests: private IDs hidden across owners, group terms hidden outside group, member creates but unrelated member cannot rename, creator/owner can manage. Group owner outside box can see group vocabulary but box picker404 and no transaction/usage data.
- [ ] Run `npm run test:spaces-db -- --testPathPattern=taxonomy` RED. Implement typed DTO/controller/service routes, scope locks and atomic audit.
- [ ] Add two-client tests for stale rename, duplicate creation, competing merge/cycle and archive. Force taxonomy audit failure and assert rollback. Re-run policy/DB GREEN. Commit `feat: manage scoped categories and tags`.

### Task 5 — Personal writes and receipts

- [ ] Write strict DTO/real HTTP tests before routes exist. Reuse the P1 authenticated Supertest helper pattern; core oracle:

```ts
const created = await call('post',`/spaces/${space.id}/personal-expenses`).send({
 request_id:randomUUID(),amount_minor:'125',occurred_on:today,title:'Lunch',
}).expect(201);
expect(created.body.data.record.category_id).toBe('20000000-0000-4000-8000-000000000016');
expect(created.body.data.change_minor).toBe('125');
expect(created.body.data.record).not.toHaveProperty('balance_minor');
```

- [ ] Assert personal owner only, nonparticipant404 before mode disclosure, wrong mode409, archived409, unknown financial fields400, future date400, prior personal date accepted, wrong term scope/kind rejected and default category/tags/note correct.
- [ ] Run `npm run test:spaces-db -- --testPathPattern=personal-expenses` RED. Implement transaction runner→common persistence→personal service/controller/module. Every successful write has server actor/time audit and string-valued response.
- [ ] Assert first-record latch is atomic and never clears after editing/deleting all expenses. Direct currency/latch changes remain rejected; P1 nonempty archive remains blocked.
- [ ] Test same-key duplicate create/update/delete produces one record effect/audit/receipt; changed payload/action rejects. Two-client races: duplicate key, same-version edit/delete, archive/first-create, term merge/archive versus create. Inject fixture-specific audit and receipt failures; assert full rollback including latch. Re-run GREEN. Commit `feat: record private expenses with atomic audit and retries`.

### Task 6 — Monthly consumption

- [ ] Write pure consumption test for125→200→0, large sums beyond row maximum, canonical merged categories and empty zero. Write DB month/box/currency isolation, deleted exclusion, total beyond first page, archived labels, merge grouping without changed stored IDs and scoped cursor cases.
- [ ] Run `npm test -- --runInBand --testPathPattern=personal-consumption` and personal DB suite RED. Implement parameterized RepeatableRead aggregate/page queries and projections. Inject read failure and assert no success/zero envelope. Re-run GREEN. Commit `feat: report personal monthly consumption accurately`.

### Task 7 — Web contracts and BFF

- [ ] Write strict Zod cases for string amounts, real dates/UUIDs, signed delta/nonnegative totals, private note nullability, wrong mode and foreign financial fields. Write BFF cases for CSRF/auth refresh, UUID/query validation, JSON failure and request_id preservation.
- [ ] Run `npm test -- src/shared/api/personal-expense-contracts.test.ts src/shared/api/taxonomy-contracts.test.ts src/app/api/app/personal-routes.test.ts` RED. Implement enumerated routes/schemas/queries with strict objects and BigInt string refinements, never numeric coercion. Re-run GREEN. Commit `feat: connect personal expense contracts through the web BFF`.

### Task 8 — Reachable personal bookkeeping UI

- [ ] Read frontend-design guidance for implementation without reopening approved product brainstorming. Write Testing Library RED cases for no-group onboarding, private box creation/selection, monthly list/breakdown, create/edit/delete and reload.
- [ ] Add 我的寶箱→`/app/personal` to AppSection/navigation. Adjust mobile grid for6 entries; test320px containment. This is the minimum P2 entry, not P6 cutover.
- [ ] Route validates space UUID/month. No selection chooses first active personal box deterministically or creation view. No group onboarding redirect. Create calls P1 API with PERSONAL_EXPENSES; archived selection is visibly read-only.
- [ ] Implement form with exact input conversion, date/title/category/tags/note. Generate request_id once per intent; preserve key/input on ambiguous network error, changed payload gets new intent/key. Disable pending/offline submission; show 尚未送出 on failure; reset only on authoritative success.
- [ ] On409 refresh server state, retain entered values and require explicit retry with current record version/new key. Success copy says 已記錄支出/已更新支出/已刪除支出 with saved amount, then refresh month. Never claim bank verification or account balance.
- [ ] Failed reads use AppReadFailure/AppReadRetry, not empty fallback. Load-more accepts matching space_version only; otherwise refresh first page and explain updates. Delete uses explicit confirmation dialog. Different boxes/currencies never combine.
- [ ] Run `npm test -- src/features/personal-expenses src/app/app/personal src/shared/navigation` GREEN. Commit `feat: deliver personal expense bookkeeping in the PWA`.

### Task 9 — Picker and private term management

- [ ] Write UI RED tests for ranking/search/dedup/defaults, keyboard use, explicit creation, failure states, archived original label and merge identity.
- [ ] Implement category and multi-tag picker using response ranking, not client usage calculations. Management loads inactive terms for historical labels. Query includes kind/category/q/locale only.
- [ ] Add 管理類別與標籤 panel with real create/rename/merge/archive calls; system terms read-only. Merge selects same-kind target and explains history retention. Conflict refresh preserves safe input.
- [ ] Run `npm test -- src/features/taxonomy src/features/personal-expenses` GREEN. Commit `feat: add private category and tag management`.

### Task 10 — Real browser and final gate

- [ ] Add runtime spec that fails fast without loopback API and MIMIC_RUNTIME_ACCEPTANCE=1. Reuse account/session helpers with unique accounts per viewport. No route.fulfill or financial provider overrides.
- [ ] Journey: register/login without group→我的寶箱→create personal box→1.25TWD uncategorized expense→monthly1.25→private category/tag→edit2.00→reload2.00→merge category total unchanged→delete authoritative0.00. Second account cannot fetch box/note/private terms. A second different-currency box never combines. Offline attempt creates no row; reconnect requires explicit submission.
- [ ] Execute320/390/768/1440 viewport projects; inspect filled page/dialog screenshots and keyboard focus. P2 personal runtime acceptance is required now; P7 retains combined three-mode release gate.
- [ ] Run all baseline commands below; collect actual exits/counts and observed RED/GREEN cycles. Review complete diff for arithmetic, privacy, locks, rollback, dates, DTO/Zod consistency and UI. Search for Number(amount/parseFloat, Fund calculator imports and success in catch blocks; inspect matches.
- [ ] Update devlog after each completed nontrivial batch and feature map on delivery. Final acceptance document contains commands/results, limitations and self-review findings/fixes. Run git diff --check, stage named files, conventional commits, preserve worktree/root files. Stop before P3's separate detailed plan/checkpoint.

## Verification commands

Every gate must exit0. Runtime spec must execute4 project cases rather than skip. Baseline commands run from named worktree subdirectories. Start API in a separate terminal with the same local DATABASE_URL.

```powershell
# worktree root; only the task-owned cluster
& 'D:/App/PostGreSQL/bin/pg_ctl.exe' -D 'D:/Project/mimic/.worktrees/financial-spaces/.session/postgres' -l 'D:/Project/mimic/.worktrees/financial-spaces/.session/postgres.log' -o '-h 127.0.0.1 -p 55439' -w start
# backend/
$env:DATABASE_URL='postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2'
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:spaces-db
# backend/ in a separate terminal
$env:DATABASE_URL='postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=phase2'
$env:JWT_ACCESS_SECRET='phase2-local-access-only'
$env:JWT_REFRESH_SECRET='phase2-local-refresh-only'
$env:PORT='3101'
npm run start
# web/
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://127.0.0.1:3101/api/v1'
npm run build
$env:MIMIC_RUNTIME_ACCEPTANCE='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3110'
npm run test:e2e -- personal-expenses.runtime.spec.ts
```

Check existing CORS configuration, but BFF calls are server-side and do not justify permissive CORS. If Chromium is absent, install the existing Playwright package's browser prerequisite and record it. Stop only task-owned server processes after acceptance. No Staging/Production migration, seed, deployment, push or merge.

## Planning self-review

1. Coverage: personal expenses, common facts, category/tag lifecycle, privacy, audit and usable personal PWA all have tasks. Shared references=P4, shared settlement/locks/corrections=P3, pooled=P5, global home/tasks=P6, durable drafts/full three-mode browser=P7. No empty future-mode provider.
2. Accounting: row bound differs from aggregate range; all monetary wire values are strings; full-month aggregate is independent of displayed page; dates/currency/box filters are explicit.
3. Identity: merge mutates taxonomy graph only, not stored financial IDs/content. Canonical IDs drive analysis, original IDs preserve history; localization never changes identity.
4. Privacy: group vocabulary carries no box usage; picker requires participation and actor-scoped usage; personal page ignores group selection; receipts authorize before replay.
5. Concurrency: scope→space lock order, actual record/term versions, atomic receipt/audit/latch; no independent nested transactions.
6. Type consistency: full-replacement PATCH is intentional; request_id is body UUID; record version differs from space_version; enums and reverse relations align; stored/canonical category IDs are distinguished.
7. Usability: no-group user completes a daily bookkeeping journey; shared taxonomy APIs work independently; minimal navigation is brought forward from P6. There is no base-table-only deliverable.
8. Verification honesty: this planning checkpoint modifies documentation only. P2 code/migrations/tests/browser journeys are not yet executed; P1 counts are prior observed baseline only.

Planning verification: extracted the model block plus specified reverse relations into ignored `.session/phase2-plan.prisma`, expanded enum syntax, and ran `npx prisma validate --schema ../.session/phase2-plan.prisma` successfully. This validates model/relationship syntax only; it applies no migration and proves no runtime behavior. Checked existing navigation filenames and BFF response behavior against source. No unresolved placeholder markers remain. The user has already authorized inline sequential execution; committing this reviewed plan supplies the checkpoint without asking for the execution method again.
