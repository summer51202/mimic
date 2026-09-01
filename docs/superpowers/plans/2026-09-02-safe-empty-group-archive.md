# Safe Empty-Group Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a sole active owner remove an unused Group from the active PWA by atomically archiving the Group and its empty Funds, revoking pending invites, preserving history, and preventing concurrent descendant writes.

**Architecture:** `GroupsService.archiveEmptyGroup()` owns the transactional eligibility check and archive mutation under the existing group advisory lock. Every conflicting writer joins that lock and revalidates active Group/Fund state after acquisition. The Web adds one authenticated BFF endpoint and an owner-only, exact-name confirmation dialog that clears stale Group preference state after success.

**Tech Stack:** NestJS, Prisma/PostgreSQL advisory locks, Jest/Supertest, Next.js App Router, React, Zod, Vitest/Testing Library, CSS Modules

---

## File Structure

### Backend

- Modify `backend/src/modules/groups/groups.service.ts`: implement the archive transaction and serialize invite creation/acceptance.
- Modify `backend/src/modules/groups/groups.service.spec.ts`: cover eligibility, mutations, audit metadata, and invite concurrency.
- Modify `backend/src/modules/groups/groups.controller.ts`: expose the authenticated archive endpoint and response envelope.
- Modify `backend/test/groups.e2e-spec.ts`: verify route wiring, JWT protection, and the response contract.
- Modify `backend/src/modules/funds/funds.service.ts`: serialize Fund creation and recheck active Group membership inside the lock.
- Modify `backend/src/modules/funds/funds.service.spec.ts`: prove Fund creation cannot cross an archive boundary.
- Modify `backend/src/modules/contributions/contributions.service.ts`: revalidate active Group/Fund state after the lock.
- Modify `backend/src/modules/contributions/contributions.service.spec.ts`: cover the archived-after-read race.
- Modify `backend/src/modules/expenses/expenses.service.ts`: revalidate active Group/Fund state after the lock.
- Modify `backend/src/modules/expenses/expenses.service.spec.ts`: cover the archived-after-read race.
- Modify `backend/src/modules/settlements/settlements.service.ts`: revalidate active Group/Fund state after the lock.
- Modify `backend/src/modules/settlements/settlements.service.spec.ts`: cover the archived-after-read race.

### Web

- Create `web/src/shared/auth/group-preference-cookie.ts`: own the reusable selected-Group cookie clearing header.
- Modify `web/src/app/api/app/groups/[groupId]/leave/route.ts`: reuse the shared preference-cookie helper.
- Create `web/src/app/api/app/groups/[groupId]/archive/route.ts`: forward the archive mutation and clear stale preference state.
- Create `web/src/app/api/app/groups/[groupId]/archive/route.test.ts`: cover forwarding, invalid IDs, success cookie clearing, and failure preservation.
- Modify `web/src/shared/ui/pixel-dialog.tsx`: add a real pending-state close lock.
- Modify `web/src/shared/ui/pixel-ui.test.tsx`: verify close button and Escape behavior when close is disabled.
- Create `web/src/features/groups/archive-empty-group-dialog.tsx`: own exact-name confirmation, submission, navigation, and domain errors.
- Modify `web/src/features/groups/group-client-api.ts`: map archive-specific error codes.
- Modify `web/src/features/groups/group-actions.test.tsx`: cover owner visibility and archive dialog behavior.
- Modify `web/src/features/groups/group-detail.tsx`: add the owner-only Danger zone and dialog state.
- Modify `web/src/features/groups/group-management.module.css`: style the isolated danger section and narrow-layout containment.

### Project records

- Modify `.agents/features.md`: mark safe empty-Group archival complete and identify its entry points.
- Modify `.agents/devlog.md`: record behavior, concurrency decisions, verification, and deferred restore support.

---

### Task 1: Implement the transactional empty-Group archive domain operation

**Files:**
- Modify: `backend/src/modules/groups/groups.service.spec.ts`
- Modify: `backend/src/modules/groups/groups.service.ts`

- [ ] **Step 1: Write failing authorization and eligibility tests**

Add a `GroupsService.archiveEmptyGroup` suite with concrete transaction mocks:

```ts
describe('GroupsService.archiveEmptyGroup', () => {
  const group = { id: 'group-1', status: GroupStatus.ACTIVE };
  const owner = {
    id: 'membership-1',
    userId: 'owner-1',
    role: MemberRole.OWNER,
    status: MemberStatus.ACTIVE,
  };

  function setup() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      group: {
        findFirst: jest.fn().mockResolvedValue(group),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue(owner),
        count: jest.fn().mockResolvedValue(1),
      },
      fund: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'fund-1', status: FundStatus.ACTIVE },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contribution: { findFirst: jest.fn().mockResolvedValue(null) },
      expense: { findFirst: jest.fn().mockResolvedValue(null) },
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
      recurringContributionRule: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      groupInvite: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    return { service: new GroupsService(prisma as never), tx };
  }

  it('requires an active group', async () => {
    const { service, tx } = setup();
    tx.group.findFirst.mockResolvedValue(null);

    await expect(service.archiveEmptyGroup('group-1', 'owner-1'))
      .rejects.toThrow(new NotFoundException('GROUP_NOT_FOUND'));
  });

  it('requires an active owner membership', async () => {
    const { service, tx } = setup();
    tx.groupMember.findFirst.mockResolvedValue({
      ...owner,
      role: MemberRole.MEMBER,
    });

    await expect(service.archiveEmptyGroup('group-1', 'owner-1'))
      .rejects.toThrow(new ForbiddenException('OWNER_REQUIRED'));
  });

  it('rejects another active member', async () => {
    const { service, tx } = setup();
    tx.groupMember.count.mockResolvedValue(2);

    await expect(service.archiveEmptyGroup('group-1', 'owner-1'))
      .rejects.toThrow(
        new ConflictException('GROUP_HAS_OTHER_ACTIVE_MEMBERS'),
      );
  });
});
```

Also add a distinct non-member assertion expecting `GROUP_ACCESS_DENIED` before the owner-role check.

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```powershell
npm test -- --runInBand --runTestsByPath src/modules/groups/groups.service.spec.ts
```

Expected: FAIL because `archiveEmptyGroup()` does not exist.

- [ ] **Step 3: Add financial-history tests for every record family and status**

Use `it.each` so any matching descendant record rejects independently:

```ts
it.each([
  ['contribution', 'contribution-1'],
  ['expense', 'expense-1'],
  ['settlement', 'settlement-1'],
  ['recurringContributionRule', 'rule-1'],
] as const)('rejects history found through %s', async (model, id) => {
  const { service, tx } = setup();
  tx[model].findFirst.mockResolvedValue({ id });

  await expect(service.archiveEmptyGroup('group-1', 'owner-1'))
    .rejects.toThrow(new ConflictException('GROUP_HAS_FINANCIAL_HISTORY'));

  expect(tx.group.updateMany).not.toHaveBeenCalled();
  expect(tx.fund.updateMany).not.toHaveBeenCalled();
});
```

Assert every query filters only through `fund: { groupId: 'group-1' }` and does not add a record-status filter. This proves deleted, canceled, and ended rows continue to block archival.

- [ ] **Step 4: Add the successful transaction test**

Assert one timestamp, Fund IDs, invite count, and audit metadata:

```ts
it('archives active empty funds, revokes pending invites, and audits once', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-02T04:00:00.000Z'));
  const { service, tx } = setup();

  await expect(
    service.archiveEmptyGroup('group-1', 'owner-1'),
  ).resolves.toEqual({ id: 'group-1', status: GroupStatus.ARCHIVED });

  expect(tx.fund.updateMany).toHaveBeenCalledWith({
    where: { id: { in: ['fund-1'] }, status: FundStatus.ACTIVE },
    data: {
      status: FundStatus.ARCHIVED,
      archivedAt: new Date('2026-09-02T04:00:00.000Z'),
    },
  });
  expect(tx.groupInvite.updateMany).toHaveBeenCalledWith({
    where: { groupId: 'group-1', status: InviteStatus.PENDING },
    data: { status: InviteStatus.REVOKED },
  });
  expect(tx.group.updateMany).toHaveBeenCalledWith({
    where: { id: 'group-1', status: GroupStatus.ACTIVE },
    data: { status: GroupStatus.ARCHIVED },
  });
  expect(tx.auditLog.create).toHaveBeenCalledWith({
    data: {
      groupId: 'group-1',
      actorUserId: 'owner-1',
      entityType: AuditEntityType.GROUP,
      entityId: 'group-1',
      action: AuditAction.ARCHIVE,
      beforeSnapshot: { status: 'active' },
      afterSnapshot: { status: 'archived' },
      metadata: {
        operation: 'archive_empty_group',
        archived_fund_count: 1,
        archived_fund_ids: ['fund-1'],
        revoked_invite_count: 2,
      },
    },
  });

  jest.useRealTimers();
});
```

Add a zero-Fund case that skips `fund.updateMany`, and a mixed Fund-status case that includes only active Fund IDs.

- [ ] **Step 5: Implement the minimal archive method**

Add `FundStatus` to the Prisma imports and implement:

```ts
async archiveEmptyGroup(groupId: string, actorUserId: string) {
  return this.prisma.$transaction(async (tx) => {
    await lockGroupMutation(tx, groupId);

    const group = await tx.group.findFirst({
      where: { id: groupId, status: GroupStatus.ACTIVE },
    });
    if (!group) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    const actor = await this.findActiveMembership(
      tx,
      groupId,
      actorUserId,
    );
    if (!actor) {
      throw new ForbiddenException('GROUP_ACCESS_DENIED');
    }
    if (actor.role !== MemberRole.OWNER) {
      throw new ForbiddenException('OWNER_REQUIRED');
    }

    const activeMemberCount = await tx.groupMember.count({
      where: { groupId, status: MemberStatus.ACTIVE },
    });
    if (activeMemberCount !== 1) {
      throw new ConflictException('GROUP_HAS_OTHER_ACTIVE_MEMBERS');
    }

    const historyWhere = { fund: { groupId } };
    const history = await Promise.all([
      tx.contribution.findFirst({ where: historyWhere, select: { id: true } }),
      tx.expense.findFirst({ where: historyWhere, select: { id: true } }),
      tx.settlement.findFirst({ where: historyWhere, select: { id: true } }),
      tx.recurringContributionRule.findFirst({
        where: historyWhere,
        select: { id: true },
      }),
    ]);
    if (history.some(Boolean)) {
      throw new ConflictException('GROUP_HAS_FINANCIAL_HISTORY');
    }

    const activeFunds = await tx.fund.findMany({
      where: { groupId, status: FundStatus.ACTIVE },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const archivedAt = new Date();
    const archivedFundIds = activeFunds.map((fund) => fund.id);

    if (archivedFundIds.length > 0) {
      await tx.fund.updateMany({
        where: {
          id: { in: archivedFundIds },
          status: FundStatus.ACTIVE,
        },
        data: { status: FundStatus.ARCHIVED, archivedAt },
      });
    }

    const revokedInvites = await tx.groupInvite.updateMany({
      where: { groupId, status: InviteStatus.PENDING },
      data: { status: InviteStatus.REVOKED },
    });
    const archived = await tx.group.updateMany({
      where: { id: groupId, status: GroupStatus.ACTIVE },
      data: { status: GroupStatus.ARCHIVED },
    });
    if (archived.count !== 1) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }

    await tx.auditLog.create({
      data: {
        groupId,
        actorUserId,
        entityType: AuditEntityType.GROUP,
        entityId: groupId,
        action: AuditAction.ARCHIVE,
        beforeSnapshot: { status: 'active' },
        afterSnapshot: { status: 'archived' },
        metadata: {
          operation: 'archive_empty_group',
          archived_fund_count: archivedFundIds.length,
          archived_fund_ids: archivedFundIds,
          revoked_invite_count: revokedInvites.count,
        },
      },
    });

    return { id: groupId, status: GroupStatus.ARCHIVED };
  });
}
```

- [ ] **Step 6: Run the focused suite and verify GREEN**

Run the command from Step 2.

Expected: PASS, including existing role, departure, invitation, and Group access tests.

- [ ] **Step 7: Commit the domain operation**

```powershell
git add backend/src/modules/groups/groups.service.ts backend/src/modules/groups/groups.service.spec.ts
git commit -m "feat(backend): archive unused groups safely"
```

---

### Task 2: Expose and contract-test the Backend archive endpoint

**Files:**
- Modify: `backend/src/modules/groups/groups.controller.ts`
- Modify: `backend/test/groups.e2e-spec.ts`

- [ ] **Step 1: Add a failing authenticated endpoint test**

Add `archiveEmptyGroup: jest.fn()` to the GroupsService test double and add:

```ts
it('archives an empty group for the authenticated actor', async () => {
  const groupId = '00000000-0000-4000-8000-000000000001';
  groupsService.archiveEmptyGroup.mockResolvedValue({
    id: groupId,
    status: 'ARCHIVED',
  });

  await request(app.getHttpServer())
    .post(`/api/v1/groups/${groupId}/archive`)
    .set('Authorization', `Bearer ${token}`)
    .expect(201)
    .expect({ data: { group_id: groupId, status: 'archived' } });

  expect(groupsService.archiveEmptyGroup).toHaveBeenCalledWith(
    groupId,
    'user-1',
  );
});
```

Add a request without Authorization and expect `401`; assert the service is not called. Add an authenticated request to `/api/v1/groups/not-a-uuid/archive`, expect `400`, and assert the service is not called.

- [ ] **Step 2: Run the focused e2e suite and verify RED**

Run:

```powershell
npm run test:e2e -- --runInBand --runTestsByPath test/groups.e2e-spec.ts
```

Expected: FAIL with `404` because the route does not exist.

- [ ] **Step 3: Implement the controller endpoint**

Import `ParseUUIDPipe` from `@nestjs/common`. Add before `@Patch(':groupId')` so the literal route is unambiguous:

```ts
@Post(':groupId/archive')
async archiveGroup(
  @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  @CurrentUser() user: RequestUser,
) {
  const group = await this.groupsService.archiveEmptyGroup(
    groupId,
    user.userId,
  );

  return {
    data: {
      group_id: group.id,
      status: group.status.toLowerCase(),
    },
  };
}
```

- [ ] **Step 4: Rerun Backend Group tests**

Run:

```powershell
npm test -- --runInBand --runTestsByPath src/modules/groups/groups.service.spec.ts
npm run test:e2e -- --runInBand --runTestsByPath test/groups.e2e-spec.ts
```

Expected: both commands PASS.

- [ ] **Step 5: Commit the API contract**

```powershell
git add backend/src/modules/groups/groups.controller.ts backend/test/groups.e2e-spec.ts
git commit -m "feat(backend): expose empty-group archive endpoint"
```

---

### Task 3: Serialize Fund and invitation lifecycle writes

**Files:**
- Modify: `backend/src/modules/funds/funds.service.spec.ts`
- Modify: `backend/src/modules/funds/funds.service.ts`
- Modify: `backend/src/modules/groups/groups.service.spec.ts`
- Modify: `backend/src/modules/groups/groups.service.ts`

- [ ] **Step 1: Write failing Fund creation lock tests**

Change the FundsService fixture so `$transaction` invokes a `tx` containing `$executeRaw`, `group`, `groupMember`, and `fund`. Assert the order-sensitive state is read from `tx`:

```ts
it('locks the group and rechecks active access before creating a fund', async () => {
  const { service, prisma, tx } = setup();

  await service.createFund('group-1', 'user-1', {
    name: 'Travel',
    currency: 'TWD',
  });

  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  expect(tx.group.findFirst).toHaveBeenCalledWith({
    where: { id: 'group-1', status: GroupStatus.ACTIVE },
    select: { id: true },
  });
  expect(tx.fund.create).toHaveBeenCalledTimes(1);
});

it('creates no fund when the group was archived before lock acquisition', async () => {
  const { service, tx } = setup({ group: null });

  await expect(
    service.createFund('group-1', 'user-1', {
      name: 'Travel',
      currency: 'TWD',
    }),
  ).rejects.toThrow(new NotFoundException('GROUP_NOT_FOUND'));

  expect(tx.fund.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run FundsService tests and verify RED**

```powershell
npm test -- --runInBand --runTestsByPath src/modules/funds/funds.service.spec.ts
```

Expected: FAIL because `createFund()` does not use the group lock transaction.

- [ ] **Step 3: Move Fund creation under the group lock**

Change `assertActiveGroupMember` to accept `Prisma.TransactionClient | PrismaService`, then implement:

```ts
async createFund(groupId: string, userId: string, dto: CreateFundDto) {
  return this.prisma.$transaction(async (tx) => {
    await lockGroupMutation(tx, groupId);
    await this.assertActiveGroupMember(tx, groupId, userId);

    return tx.fund.create({
      data: {
        groupId,
        name: dto.name,
        currency: dto.currency,
        createdById: userId,
      },
    });
  });
}
```

Import `Prisma` and `lockGroupMutation`.

- [ ] **Step 4: Write failing invite creation and acceptance lock tests**

In `groups.service.spec.ts`, assert both operations call `$executeRaw` and re-read state after the lock. For acceptance, model this sequence explicitly:

```ts
it('locks the owning group before consuming an invitation', async () => {
  const { service, tx } = setupAcceptInvite();

  await service.acceptInvite('invitee-1', 'invite-code');

  expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  expect(tx.groupInvite.findUnique).toHaveBeenCalledTimes(2);
  expect(tx.groupInvite.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: InviteStatus.PENDING,
        group: { status: GroupStatus.ACTIVE },
      }),
    }),
  );
});
```

Add an archived-after-initial-read case: the second invite read returns a Group with `ARCHIVED`; expect `INVITE_NOT_FOUND` and no membership write.

- [ ] **Step 5: Run the Group suite and verify RED**

```powershell
npm test -- --runInBand --runTestsByPath src/modules/groups/groups.service.spec.ts
```

Expected: FAIL because invite creation and acceptance do not both lock and re-read.

- [ ] **Step 6: Serialize invitation writes**

Wrap `createInvite()` in `$transaction`, call `lockGroupMutation(tx, groupId)`, then query the active Group and owner membership through `tx` before `tx.groupInvite.create()`.

In `acceptInvite()`:

1. Read the invitation and user inside the transaction to obtain `groupId`.
2. Reject a missing invitation or user.
3. Call `lockGroupMutation(tx, invite.groupId)`.
4. Re-read the invitation with its Group after the lock.
5. Run expiry, email, existing-membership, conditional consume, and membership creation/reactivation from the locked snapshot.

Use this exact active-state guard after the second read:

```ts
if (!currentInvite || currentInvite.group.status !== GroupStatus.ACTIVE) {
  throw new NotFoundException('INVITE_NOT_FOUND');
}
```

- [ ] **Step 7: Rerun focused Funds and Groups suites**

Run the commands from Steps 2 and 5.

Expected: both suites PASS.

- [ ] **Step 8: Commit lifecycle serialization**

```powershell
git add backend/src/modules/funds/funds.service.ts backend/src/modules/funds/funds.service.spec.ts backend/src/modules/groups/groups.service.ts backend/src/modules/groups/groups.service.spec.ts
git commit -m "fix(backend): serialize group lifecycle writes"
```

---

### Task 4: Revalidate financial writes after the group lock

**Files:**
- Modify: `backend/src/modules/contributions/contributions.service.spec.ts`
- Modify: `backend/src/modules/contributions/contributions.service.ts`
- Modify: `backend/src/modules/expenses/expenses.service.spec.ts`
- Modify: `backend/src/modules/expenses/expenses.service.ts`
- Modify: `backend/src/modules/settlements/settlements.service.spec.ts`
- Modify: `backend/src/modules/settlements/settlements.service.ts`

- [ ] **Step 1: Add one archived-after-read regression test per service**

For each create service, keep the initial Prisma Fund read active and make the transaction Fund re-read return `null`:

```ts
it('rejects when the fund is archived after the initial read but before the lock', async () => {
  prisma.fund.findFirst.mockResolvedValue({
    id: 'fund-1',
    groupId: 'group-1',
  });
  tx.fund.findFirst.mockResolvedValue(null);

  await expect(runCreate(service)).rejects.toThrow(
    new NotFoundException('FUND_NOT_FOUND'),
  );

  expect(tx.contribution.create).not.toHaveBeenCalled();
});
```

Use the service-specific valid DTO and final write assertion:

- Contributions: `tx.contribution.create`
- Expenses: `tx.expense.create`
- Settlements: `tx.settlement.create`

The transaction re-read expectation is:

```ts
expect(tx.fund.findFirst).toHaveBeenCalledWith({
  where: {
    id: 'fund-1',
    groupId: 'group-1',
    status: FundStatus.ACTIVE,
    group: { status: GroupStatus.ACTIVE },
  },
  select: { id: true },
});
```

- [ ] **Step 2: Run the three focused suites and verify RED**

```powershell
npm test -- --runInBand --runTestsByPath src/modules/contributions/contributions.service.spec.ts src/modules/expenses/expenses.service.spec.ts src/modules/settlements/settlements.service.spec.ts
```

Expected: FAIL because none of the create methods re-read active state after locking.

- [ ] **Step 3: Add one shared-shaped local guard to each service**

Import `GroupStatus` and add this private method in ContributionsService, ExpensesService, and SettlementsService:

```ts
private async requireWritableFund(
  tx: Prisma.TransactionClient,
  fundId: string,
  groupId: string,
) {
  const fund = await tx.fund.findFirst({
    where: {
      id: fundId,
      groupId,
      status: FundStatus.ACTIVE,
      group: { status: GroupStatus.ACTIVE },
    },
    select: { id: true },
  });

  if (!fund) {
    throw new NotFoundException('FUND_NOT_FOUND');
  }
}
```

Immediately after `lockGroupMutation(tx, fund.groupId)`, call:

```ts
await this.requireWritableFund(tx, fundId, fund.groupId);
```

This call must precede member checks, period locks, and writes so the archived resource error is stable.

- [ ] **Step 4: Rerun the three focused suites**

Run the command from Step 2.

Expected: all three suites PASS.

- [ ] **Step 5: Run all Backend unit tests**

```powershell
npm test -- --runInBand
```

Expected: 19 suites PASS with the test count increased from the 191-test baseline.

- [ ] **Step 6: Commit financial write hardening**

```powershell
git add backend/src/modules/contributions/contributions.service.ts backend/src/modules/contributions/contributions.service.spec.ts backend/src/modules/expenses/expenses.service.ts backend/src/modules/expenses/expenses.service.spec.ts backend/src/modules/settlements/settlements.service.ts backend/src/modules/settlements/settlements.service.spec.ts
git commit -m "fix(backend): close archived-group write races"
```

---

### Task 5: Add the Web archive BFF and shared preference cleanup

**Files:**
- Create: `web/src/shared/auth/group-preference-cookie.ts`
- Modify: `web/src/app/api/app/groups/[groupId]/leave/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/archive/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/archive/route.test.ts`

- [ ] **Step 1: Write failing archive-route tests**

Mock `forwardAppRoute` and `readRouteIdParam` using the leave-route test pattern:

```ts
describe('POST /api/app/groups/[groupId]/archive', () => {
  it('forwards the archive and clears the remembered group on success', async () => {
    forward.mockResolvedValueOnce(
      NextResponse.json(
        { data: { group_id: 'g1', status: 'archived' } },
        { status: 201 },
      ),
    );

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ groupId: 'g1' }),
    });

    expect(forward).toHaveBeenCalledWith(
      expect.any(Request),
      '/groups/g1/archive',
      { body: 'none' },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('mimic_group=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('preserves the preference when Backend archival fails', async () => {
    forward.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: 'GROUP_HAS_FINANCIAL_HISTORY' } },
        { status: 409 },
      ),
    );

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ groupId: 'g1' }),
    });

    expect(response.status).toBe(409);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
```

Add invalid-ID coverage by returning `{ ok: false, response }` from `readRouteIdParam` and asserting no forwarding.

- [ ] **Step 2: Run the route tests and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/app/api/app/groups/[groupId]/archive/route.test.ts
```

Expected: FAIL because the route module is missing.

- [ ] **Step 3: Extract the preference-cookie helper**

Create:

```ts
import { isCookieSecure } from './cookies';

export function clearGroupPreferenceCookie(): string {
  return [
    'mimic_group=',
    'Max-Age=0',
    'Path=/',
    'SameSite=Lax',
    ...(isCookieSecure() ? ['Secure'] : []),
  ].join('; ');
}
```

Replace the private helper in the leave route with this import. Rerun the leave route test before adding the new route.

- [ ] **Step 4: Implement the archive BFF route**

Create:

```ts
import { forwardAppRoute, readRouteIdParam } from '@/shared/api/app-route';
import { clearGroupPreferenceCookie } from '@/shared/auth/group-preference-cookie';

interface GroupArchiveRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(
  request: Request,
  context: GroupArchiveRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(
    context.params,
    'groupId',
    request.headers.get('x-request-id') ?? undefined,
  );

  if (!groupId.ok) {
    return groupId.response;
  }

  const response = await forwardAppRoute(
    request,
    `/groups/${groupId.value}/archive`,
    { body: 'none' },
  );

  if (response.ok) {
    response.headers.append('Set-Cookie', clearGroupPreferenceCookie());
  }

  return response;
}
```

- [ ] **Step 5: Run archive, leave, and shared route tests**

```powershell
node node_modules/vitest/vitest.mjs run src/app/api/app/groups/[groupId]/archive/route.test.ts src/app/api/app/groups/[groupId]/leave/route.test.ts src/shared/api/app-route.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the BFF boundary**

```powershell
git add web/src/shared/auth/group-preference-cookie.ts web/src/app/api/app/groups/[groupId]/leave/route.ts web/src/app/api/app/groups/[groupId]/archive/route.ts web/src/app/api/app/groups/[groupId]/archive/route.test.ts
git commit -m "feat(web): proxy empty-group archive"
```

---

### Task 6: Add a pending-safe PixelDialog close contract

**Files:**
- Modify: `web/src/shared/ui/pixel-dialog.tsx`
- Modify: `web/src/shared/ui/pixel-ui.test.tsx`

- [ ] **Step 1: Write failing close-disabled tests**

Render a PixelDialog with `closeDisabled` and assert both close paths are blocked:

```tsx
it('keeps a pending dialog open when close is disabled', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();

  render(
    <PixelDialog
      closeDisabled
      onClose={onClose}
      open
      title="Archive group"
    >
      Pending
    </PixelDialog>,
  );

  const close = screen.getByRole('button', { name: 'Close dialog' });
  expect(close).toBeDisabled();
  await user.keyboard('{Escape}');
  fireEvent.cancel(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
});
```

Keep the existing close and focus-restoration tests passing when the new prop is omitted.

- [ ] **Step 2: Run the Pixel UI test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/ui/pixel-ui.test.tsx
```

Expected: FAIL because `closeDisabled` is not a PixelDialog prop.

- [ ] **Step 3: Implement the close lock**

Add `closeDisabled?: boolean` with a default of `false`. Apply it to the close PixelButton, Escape branch, and native dialog `cancel` event:

```tsx
if (
  !event.defaultPrevented &&
  event.key === 'Escape' &&
  !closeDisabled
) {
  event.preventDefault();
  onClose();
}
```

```tsx
function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
  event.preventDefault();

  if (!closeDisabled) {
    onClose();
  }
}
```

Import `SyntheticEvent` from React and attach `onCancel={handleCancel}` to `<dialog>`.

```tsx
<PixelButton
  disabled={closeDisabled}
  emphasis="ghost"
  iconOnlyLabel={closeLabel}
  onClick={onClose}
  type="button"
>
  <span aria-hidden="true">X</span>
</PixelButton>
```

- [ ] **Step 4: Rerun Pixel UI tests**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the dialog contract**

```powershell
git add web/src/shared/ui/pixel-dialog.tsx web/src/shared/ui/pixel-ui.test.tsx
git commit -m "feat(web): lock pending confirmation dialogs"
```

---

### Task 7: Build the owner-only Delete empty group flow

**Files:**
- Create: `web/src/features/groups/archive-empty-group-dialog.tsx`
- Modify: `web/src/features/groups/group-client-api.ts`
- Modify: `web/src/features/groups/group-actions.test.tsx`
- Modify: `web/src/features/groups/group-detail.tsx`
- Modify: `web/src/features/groups/group-management.module.css`

- [ ] **Step 1: Write failing visibility and exact-name confirmation tests**

Add tests to `group-actions.test.tsx`:

```tsx
it('shows the empty-group danger action only to an owner', () => {
  const { rerender } = render(
    <GroupDetailView group={group} members={[members[0]]} />,
  );

  expect(
    screen.getByRole('button', { name: 'Delete empty group' }),
  ).toBeVisible();

  rerender(
    <GroupDetailView
      group={{ ...group, role: 'member' }}
      members={[members[0]]}
    />,
  );

  expect(
    screen.queryByRole('button', { name: 'Delete empty group' }),
  ).not.toBeInTheDocument();
});

it('requires the exact current group name before archival', async () => {
  const user = userEvent.setup();
  render(<GroupDetailView group={group} members={[members[0]]} />);

  await user.click(
    screen.getByRole('button', { name: 'Delete empty group' }),
  );

  const confirm = screen.getByRole('button', {
    name: 'Delete empty group permanently from view',
  });
  expect(confirm).toBeDisabled();

  await user.type(screen.getByLabelText('Type the group name to confirm'), 'wrong');
  expect(confirm).toBeDisabled();

  await user.clear(screen.getByLabelText('Type the group name to confirm'));
  await user.type(
    screen.getByLabelText('Type the group name to confirm'),
    group.name,
  );
  expect(confirm).toBeEnabled();
});
```

- [ ] **Step 2: Write failing success and error tests**

Mock `appFetch`, submit once, and assert navigation only after success:

```tsx
it('archives once and navigates to Groups after success', async () => {
  const user = userEvent.setup();
  const onSuccess = vi.fn();
  appFetchMock.mockResolvedValueOnce({
    data: { group_id: 'g1', status: 'archived' },
  });

  render(
    <ArchiveEmptyGroupDialog
      groupId="g1"
      groupName={group.name}
      onSuccess={onSuccess}
      open
    />,
  );
  await user.type(
    screen.getByLabelText('Type the group name to confirm'),
    group.name,
  );
  await user.click(
    screen.getByRole('button', {
      name: 'Delete empty group permanently from view',
    }),
  );

  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('/app/groups'));
  expect(appFetchMock).toHaveBeenCalledWith('/api/app/groups/g1/archive', {
    method: 'POST',
  });
});
```

Add `it.each` coverage for:

```ts
[
  ['GROUP_HAS_OTHER_ACTIVE_MEMBERS', 'Other active members must leave first.'],
  ['GROUP_HAS_FINANCIAL_HISTORY', 'Groups with financial history cannot be deleted.'],
  ['OWNER_REQUIRED', 'Only an owner can delete an empty group.'],
]
```

For each failure, assert the dialog remains open, input is preserved, and navigation is not called. Add a pending promise case that verifies submit and close controls are disabled.

- [ ] **Step 3: Run the Group action test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/features/groups/group-actions.test.tsx
```

Expected: FAIL because the archive dialog and action do not exist.

- [ ] **Step 4: Add archive-specific error mapping**

Add a dedicated function rather than changing leave/rename copy:

```ts
export function archiveGroupErrorMessage(error: unknown): string {
  if (!(error instanceof AppClientError)) {
    return 'The service is temporarily unavailable. Mimiku kept this group.';
  }

  const messages: Record<string, string> = {
    GROUP_HAS_OTHER_ACTIVE_MEMBERS:
      'Other active members must leave first.',
    GROUP_HAS_FINANCIAL_HISTORY:
      'Groups with financial history cannot be deleted.',
    OWNER_REQUIRED: 'Only an owner can delete an empty group.',
  };

  if (messages[error.code]) {
    return messages[error.code];
  }
  if (error.status === 401) {
    return 'Your session expired. Sign in again, then retry.';
  }

  return 'The service is temporarily unavailable. Mimiku kept this group.';
}
```

- [ ] **Step 5: Implement ArchiveEmptyGroupDialog**

Create a client component with `confirmation`, `error`, and `pending` state. Use this submission rule:

```ts
const confirmed = confirmation === groupName;

async function archiveGroup() {
  if (!confirmed || pending) {
    return;
  }

  setPending(true);
  setError(null);

  try {
    await appFetch(`/api/app/groups/${groupId}/archive`, {
      method: 'POST',
    });
    navigate(onSuccess, '/app/groups');
  } catch (caught) {
    setError(archiveGroupErrorMessage(caught));
    setPending(false);
  }
}
```

Render `PixelDialog` with `closeDisabled={pending}`, the approved retention/no-restore explanation, a visibly labeled text input, and a danger PixelButton disabled when `!confirmed || pending`.

- [ ] **Step 6: Integrate the owner-only Danger zone**

In `GroupDetailView`, add `archiving` state. Render this section only for `group.role.toLowerCase() === 'owner'`:

```tsx
<section className={styles.dangerZone} aria-labelledby="group-danger-title">
  <div>
    <h2 id="group-danger-title">Danger zone</h2>
    <p>Remove a group only when bookkeeping has not started.</p>
  </div>
  <PixelButton
    emphasis="danger"
    onClick={() => setArchiving(true)}
    type="button"
  >
    Delete empty group
  </PixelButton>
</section>
```

Render `ArchiveEmptyGroupDialog` beside `LeaveGroupDialog`, closing through state and navigating through an injectable callback or `window.location.assign` using the existing component test pattern.

- [ ] **Step 7: Add scoped responsive styling**

Add token-based styles:

```css
.dangerZone {
  display: grid;
  gap: var(--mimic-space-3);
  min-width: 0;
  border: 2px solid var(--mimic-color-danger);
  padding: var(--mimic-space-4);
}

.dangerZone > *,
.dangerZone p {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (min-width: 48rem) {
  .dangerZone {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}
```

Use the existing danger semantic token; do not introduce a raw color.

- [ ] **Step 8: Run focused Web tests**

```powershell
node node_modules/vitest/vitest.mjs run src/features/groups/group-actions.test.tsx src/shared/ui/pixel-ui.test.tsx src/app/api/app/groups/[groupId]/archive/route.test.ts src/app/api/app/groups/[groupId]/leave/route.test.ts
```

Expected: all tests PASS.

- [ ] **Step 9: Commit the PWA flow**

```powershell
git add web/src/features/groups/archive-empty-group-dialog.tsx web/src/features/groups/group-client-api.ts web/src/features/groups/group-actions.test.tsx web/src/features/groups/group-detail.tsx web/src/features/groups/group-management.module.css
git commit -m "feat(web): delete unused groups from view"
```

---

### Task 8: Record delivery state and run full verification

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the feature map**

Add Backend and PWA `done` rows for safe empty-Group archive. The descriptions must say that empty Funds are archived together and any financial history blocks the operation. Add a completed Groups & Membership backlog item.

- [ ] **Step 2: Append the devlog entry**

Append:

```markdown
## 2026-09-02 — Archive unused groups safely

**Task:** Let a sole active owner remove an unused Group while preserving relational and audit history.
**Scope:** Group archive transaction and endpoint, group-scoped write serialization, Fund and invite lifecycle, Web BFF, owner Danger zone and confirmation dialog, tests, feature map
**What changed:**
- Added a soft-archive operation that rejects every form of financial history, archives active empty Funds, revokes pending invites, and records one audit entry.
- Serialized Fund, invitation, membership acceptance, and financial creation writes against the Group mutation lock with post-lock active-state checks.
- Added an owner-only Delete empty group flow with exact-name confirmation and selected-Group preference cleanup.
**Decisions:** Treat Fund creation as non-financial history; preserve former memberships and historical invitations; provide no self-service restore UI in this increment.
**Known gaps / follow-ups:** Archived Group browsing/restoration, independent Fund lifecycle UI, and lifecycle rules for Groups with financial history remain deferred.
```

- [ ] **Step 3: Run Backend generation, build, unit, and e2e verification**

From `backend/`:

```powershell
npx prisma generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Expected: every command exits 0; unit count exceeds the 191-test baseline and e2e count exceeds the 51-test baseline.

- [ ] **Step 4: Run Web lint, typecheck, full tests, and production build**

From `web/`, use direct package entry points if `.bin` is unavailable:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'
node node_modules/next/dist/bin/next build --webpack
```

Expected: lint/typecheck/tests exit 0, all 59-or-more test files pass, and Next exits 0 with `/app/groups/[groupId]` plus the archive BFF route present in the route table.

- [ ] **Step 5: Smoke-test the standalone output**

Start `.next/standalone/server.js` on an unused local port with a hidden process, then verify:

```text
GET / => 200
GET /app/groups => 307 to /login?returnTo=%2Fapp%2Fgroups
```

Stop the exact process ID and remove only its worktree-local log files. This confirms that any known Windows trace-copy warning did not break the Docker-consumed standalone output.

- [ ] **Step 6: Run self-review**

Use the repository `self-review` skill against the diff from `f04c3b1`. Inspect:

- archive error precedence and rollback behavior;
- history queries with no status filters;
- Group/Fund/invite/audit updates sharing one transaction and timestamp;
- every conflicting writer acquiring the same lock and rechecking after it;
- no hard deletes;
- BFF cookie clearing only after success;
- exact-name confirmation, pending state, focus, Escape, and narrow-width behavior.

Fix every Critical or Important issue with a failing regression test, then repeat focused verification.

- [ ] **Step 7: Commit project records and review fixes**

```powershell
git add .agents/features.md .agents/devlog.md
git add backend web
git commit -m "docs: record safe empty-group archive"
```

If self-review fixes product code, stage them in a separate conventional commit before the documentation commit.

- [ ] **Step 8: Verify final repository state**

```powershell
git status --short
git diff --check f04c3b1..HEAD
git log --oneline --reverse f04c3b1..HEAD
```

Expected: no tracked or untracked implementation artifacts in the worktree, no whitespace errors, and only intentional feature commits.

- [ ] **Step 9: Finish the branch without pushing automatically**

Use `superpowers:finishing-a-development-branch`. Present exactly the four merge/PR/keep/discard options. Do not push, merge, deploy, migrate, or remove the worktree until the user chooses.
