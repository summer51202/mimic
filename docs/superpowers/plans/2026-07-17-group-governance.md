# Group Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Owners safely change roles and remove settled members, and let settled members leave, while preserving accounting history and always retaining an active Owner.

**Architecture:** Extend the existing NestJS Groups module and Flutter Group detail flow. Membership and accounting writes coordinate through one PostgreSQL transaction advisory lock per group; Mobile uses explicit repository methods, a single mutation controller, contextual bottom sheets, and existing group-selection reconciliation.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, Jest/Supertest, Flutter 3/Dart, Riverpod 2, Dio, GoRouter.

---

## File Structure

- Create `backend/src/modules/prisma/group-mutation-lock.ts`: one shared group-scoped transaction-lock primitive.
- Create `backend/src/modules/prisma/group-mutation-lock.spec.ts`: verifies the exact parameterized advisory-lock query.
- Create `backend/src/modules/groups/dto/update-group-member.dto.ts`: validates `owner|member` role input.
- Modify `backend/src/modules/groups/groups.service.ts`: role mutation, removal, exit, eligibility, audit, and invite reactivation lock.
- Modify `backend/src/modules/groups/groups.controller.ts`: three routes plus `current_user_id` mapping.
- Modify `backend/src/modules/groups/groups.service.spec.ts`: unit coverage for invariants, state transitions, position checks, pending settlements, and audit.
- Modify `backend/test/groups.e2e-spec.ts`: authenticated route and DTO contract tests.
- Modify `backend/src/modules/contributions/contributions.service.ts`: group-lock and active-membership checks before contribution creation.
- Modify `backend/src/modules/expenses/expenses.service.ts`: group-lock and active participant checks before expense creation.
- Modify `backend/src/modules/settlements/settlements.service.ts`: group-lock and active participant checks before pending settlement creation.
- Modify their existing `*.service.spec.ts` files: lock ordering and inactive-member rejection.
- Modify `mobile/lib/shared/api/pairfund_api_client.dart`: add typed DELETE capability.
- Modify `mobile/lib/features/groups/data/group_repository.dart`: current-user mapping and three mutation methods.
- Modify `mobile/lib/features/groups/providers/group_detail_controller.dart`: one mutation state machine and safe domain-error copy.
- Modify `mobile/lib/features/groups/presentation/group_detail_screen.dart`: member menu, confirmation dialogs, snackbar, and Danger zone.
- Modify the corresponding three Flutter group test files and app smoke test.
- Modify `.agents/features.md` and append `.agents/devlog.md` after acceptance.

---

### Task 1: Shared group mutation lock

**Files:**
- Create: `backend/src/modules/prisma/group-mutation-lock.ts`
- Create: `backend/src/modules/prisma/group-mutation-lock.spec.ts`

- [ ] **Step 1: Write the failing helper test**

```ts
import { Prisma } from '@prisma/client';
import { lockGroupMutation } from './group-mutation-lock';

it('takes a transaction-scoped advisory lock for the group id', async () => {
  const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
  await lockGroupMutation(tx as never, '00000000-0000-4000-8000-000000000001');
  expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  const query = tx.$executeRaw.mock.calls[0][0] as Prisma.Sql;
  expect(query.values).toEqual(['00000000-0000-4000-8000-000000000001']);
  expect(query.strings.join('?')).toContain('pg_advisory_xact_lock');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test -- --runInBand src/modules/prisma/group-mutation-lock.spec.ts`  
Expected: FAIL because `group-mutation-lock.ts` does not exist.

- [ ] **Step 3: Implement the parameterized lock helper**

```ts
import { Prisma } from '@prisma/client';

export async function lockGroupMutation(
  tx: Prisma.TransactionClient,
  groupId: string,
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${groupId}, 0))`,
  );
}
```

- [ ] **Step 4: Run focused test and Backend build**

Run: `npm run test -- --runInBand src/modules/prisma/group-mutation-lock.spec.ts && npm run build`  
Expected: 1 test passes and Nest build exits 0.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/prisma/group-mutation-lock.ts backend/src/modules/prisma/group-mutation-lock.spec.ts
git commit -m "feat(backend): add group mutation lock"
```

### Task 2: Role mutation service and audit

**Files:**
- Create: `backend/src/modules/groups/dto/update-group-member.dto.ts`
- Modify: `backend/src/modules/groups/groups.service.ts`
- Modify: `backend/src/modules/groups/groups.service.spec.ts`

- [ ] **Step 1: Add failing DTO and service tests**

Add tests that assert lowercase transformation and enum rejection:

```ts
const dto = plainToInstance(UpdateGroupMemberDto, { role: ' OWNER ' });
expect(await validate(dto)).toEqual([]);
expect(dto.role).toBe('owner');
```

Add service tests for promote, demote, `OWNER_REQUIRED`, `MEMBER_NOT_FOUND`, `ROLE_UNCHANGED`, and `LAST_OWNER_REQUIRED`. The successful promote test must assert this transaction order: lock, actor/target reads, update, audit create.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test -- --runInBand src/modules/groups/groups.service.spec.ts`  
Expected: FAIL because `UpdateGroupMemberDto` and `updateMemberRole()` do not exist.

- [ ] **Step 3: Implement DTO**

```ts
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class UpdateGroupMemberDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsIn(['owner', 'member'])
  role!: 'owner' | 'member';
}
```

- [ ] **Step 4: Implement `updateMemberRole()` transaction**

Implement this public shape in `GroupsService`:

```ts
async updateMemberRole(groupId: string, actorUserId: string, targetUserId: string,
  dto: UpdateGroupMemberDto) {
  return this.prisma.$transaction(async (tx) => {
    await lockGroupMutation(tx, groupId);
    const { actor, target } = await this.requireActiveActorAndTarget(tx, groupId, actorUserId, targetUserId);
    if (actor.role !== MemberRole.OWNER) throw new ForbiddenException('OWNER_REQUIRED');
    const nextRole = dto.role === 'owner' ? MemberRole.OWNER : MemberRole.MEMBER;
    if (target.role === nextRole) throw new ConflictException('ROLE_UNCHANGED');
    if (target.role === MemberRole.OWNER && nextRole === MemberRole.MEMBER) {
      await this.requireAnotherOwner(tx, groupId, target.id);
    }
    const updated = await tx.groupMember.update({
      where: { id: target.id }, data: { role: nextRole }, include: { user: true },
    });
    await tx.auditLog.create({ data: this.roleAudit(groupId, actorUserId, target, updated) });
    return updated;
  });
}
```

Use `AuditEntityType.GROUP` + `AuditAction.ROLE_CHANGE`; snapshots contain only `role` and `status`, metadata contains `operation` and `target_user_id`.

- [ ] **Step 5: Run focused tests and build**

Run: `npm run test -- --runInBand src/modules/groups/groups.service.spec.ts && npm run build`  
Expected: all Groups service tests pass and build exits 0.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/modules/groups
git commit -m "feat(backend): manage group member roles"
```

### Task 3: Removal, leave, and accounting eligibility

**Files:**
- Modify: `backend/src/modules/groups/groups.service.ts`
- Modify: `backend/src/modules/groups/groups.service.spec.ts`

- [ ] **Step 1: Add failing eligibility tests**

Cover these exact cases:

```ts
it.each([
  { contribution: 100n, split: 0n },
  { contribution: 0n, split: 100n },
  { contribution: 100n, split: 50n },
])('blocks a non-zero per-fund position', async ({ contribution, split }) => {
  prisma.fund.findMany.mockResolvedValue([fundPositionFixture({
    contributionAmountMinor: contribution,
    splitAmountMinor: split,
  })]);
  await expect(service.removeMember('group-1', 'owner-1', 'member-1'))
    .rejects.toEqual(new ConflictException('MEMBER_HAS_OPEN_BALANCE'));
});
```

Define the fixture in the test file with `bigint` throughout:

```ts
function fundPositionFixture(input: {
  contributionAmountMinor: bigint;
  splitAmountMinor: bigint;
}) {
  return {
    id: 'fund-1',
    contributions: [{ amountMinor: input.contributionAmountMinor }],
    expenses: [{
      expenseType: ExpenseType.FUND_EXPENSE,
      payers: [],
      splits: [{ allocatedAmountMinor: input.splitAmountMinor }],
    }],
    settlements: [],
  };
}
```

Also prove `+100` in fund A and `-100` in fund B still blocks, pending settlements block, final Owner blocks, self-remove returns `CANNOT_REMOVE_SELF`, removal writes `REMOVED`, leave writes `LEFT`, and both audit with `AuditAction.DELETE`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test -- --runInBand src/modules/groups/groups.service.spec.ts`  
Expected: FAIL because `removeMember()` and `leaveGroup()` do not exist.

- [ ] **Step 3: Implement per-fund eligibility**

Add one private method that reads every group fund with filtered active records:

```ts
const funds = await tx.fund.findMany({
  where: { groupId },
  select: {
    id: true,
    contributions: { where: { contributorUserId: userId, status: RecordStatus.ACTIVE }, select: { amountMinor: true } },
    expenses: {
      where: { status: RecordStatus.ACTIVE },
      select: {
        expenseType: true,
        payers: { where: { payerUserId: userId }, select: { amountMinor: true } },
        splits: { where: { userId }, select: { allocatedAmountMinor: true } },
      },
    },
    settlements: {
      where: {
        status: SettlementStatus.COMPLETED,
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      select: { fromUserId: true, toUserId: true, amountMinor: true },
    },
  },
});
```

Calculate each position with the same contribution + payer − split semantics and REFUND sign used by `SettlementsService`. Include completed settlements as transfers; reject if any fund result is not `0n`. Query pending settlements separately and reject when target is `fromUserId` or `toUserId`.

- [ ] **Step 4: Implement remove and leave**

Both operations acquire `lockGroupMutation()` first, re-read active membership, call the same eligibility helper, protect the last Owner, update only `GroupMember.status`, and create an audit row. `removeMember()` rejects `actorUserId === targetUserId`; `leaveGroup()` uses actor as target.

- [ ] **Step 5: Verify focused and full Backend unit suites**

Run: `npm run test -- --runInBand src/modules/groups/groups.service.spec.ts`  
Expected: Groups tests pass.  
Run: `npm run test -- --runInBand`  
Expected: all Backend unit suites pass.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/modules/groups/groups.service.ts backend/src/modules/groups/groups.service.spec.ts
git commit -m "feat(backend): remove and leave settled groups"
```

### Task 4: Coordinate accounting writes with membership exit

**Files:**
- Modify: `backend/src/modules/contributions/contributions.service.ts`
- Modify: `backend/src/modules/contributions/contributions.service.spec.ts`
- Modify: `backend/src/modules/expenses/expenses.service.ts`
- Modify: `backend/src/modules/expenses/expenses.service.spec.ts`
- Modify: `backend/src/modules/settlements/settlements.service.ts`
- Modify: `backend/src/modules/settlements/settlements.service.spec.ts`

- [ ] **Step 1: Add failing lock-order and membership tests**

For each create path, assert it resolves the fund's `groupId`, enters a transaction, acquires `lockGroupMutation(tx, groupId)`, then validates active group membership before writing. An inactive actor returns `GROUP_ACCESS_DENIED`; an inactive contributor, payer, split user, settlement sender, or settlement recipient returns `MEMBER_NOT_FOUND`.

- [ ] **Step 2: Run the three focused suites and verify RED**

Run:

```powershell
npm run test -- --runInBand src/modules/contributions/contributions.service.spec.ts src/modules/expenses/expenses.service.spec.ts src/modules/settlements/settlements.service.spec.ts
```

Expected: FAIL because create paths do not use the shared lock or membership checks.

- [ ] **Step 3: Wrap contribution creation**

Change `createContribution()` to resolve the active fund, then execute the lock/check/create sequence in one transaction. Require both actor and `dto.contributor_user_id` to be active members of that fund's group.

- [ ] **Step 4: Extend the existing expense transaction**

At the top of `createExpense()` transaction, resolve the fund group, acquire the lock, and fetch active memberships for the actor plus every unique payer/split user ID. Reject before creating the expense if the returned active-user set is incomplete.

- [ ] **Step 5: Wrap pending settlement creation**

Change `createSettlement()` to use a transaction, acquire the same lock, and require actor, `from_user_id`, and `to_user_id` to be active members before creating the PENDING settlement.

- [ ] **Step 6: Run tests and build**

Run: `npm run test -- --runInBand && npm run build`  
Expected: all Backend unit tests pass and build exits 0.

- [ ] **Step 7: Commit**

```powershell
git add backend/src/modules/contributions backend/src/modules/expenses backend/src/modules/settlements
git commit -m "fix(backend): serialize membership and accounting writes"
```

### Task 5: HTTP contracts and integration coverage

**Files:**
- Modify: `backend/src/modules/groups/groups.controller.ts`
- Modify: `backend/test/groups.e2e-spec.ts`

- [ ] **Step 1: Write failing E2E contract tests**

Add authenticated tests for:

```text
PATCH  /api/v1/groups/group-1/members/user-2  body {"role":"owner"}
DELETE /api/v1/groups/group-1/members/user-2
POST   /api/v1/groups/group-1/leave
GET    /api/v1/groups/group-1 includes current_user_id
```

Assert 401 without JWT, 400 for an invalid role, exact service arguments, and snake_case success envelopes.

- [ ] **Step 2: Run E2E and verify RED**

Run: `npm run test:e2e -- --runInBand --testPathPattern=groups.e2e-spec.ts`  
Expected: FAIL because routes and `current_user_id` are absent.

- [ ] **Step 3: Add controller routes**

Import `Delete` and `UpdateGroupMemberDto`, then map results:

```ts
@Patch(':groupId/members/:userId')
async updateMemberRole(
  @Param('groupId') groupId: string,
  @Param('userId') targetUserId: string,
  @CurrentUser() user: RequestUser,
  @Body() dto: UpdateGroupMemberDto,
) {
  const member = await this.groupsService.updateMemberRole(
    groupId, user.userId, targetUserId, dto,
  );
  return { data: {
    user_id: member.userId,
    display_name: member.user.displayName,
    role: member.role.toLowerCase(),
    status: member.status.toLowerCase(),
  } };
}

@Delete(':groupId/members/:userId')
async removeMember(
  @Param('groupId') groupId: string,
  @Param('userId') targetUserId: string,
  @CurrentUser() user: RequestUser,
) {
  const member = await this.groupsService.removeMember(
    groupId, user.userId, targetUserId,
  );
  return { data: {
    user_id: member.userId,
    status: member.status.toLowerCase(),
  } };
}

@Post(':groupId/leave')
async leaveGroup(
  @Param('groupId') groupId: string,
  @CurrentUser() user: RequestUser,
) {
  const member = await this.groupsService.leaveGroup(groupId, user.userId);
  return { data: {
    group_id: member.groupId,
    status: member.status.toLowerCase(),
  } };
}
```

Add `current_user_id: user.userId` to `getGroupDetail()`.

- [ ] **Step 4: Run E2E, unit tests, and build**

Run: `npm run test:e2e -- --runInBand && npm run test -- --runInBand && npm run build`  
Expected: E2E and unit suites pass; build exits 0.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/groups backend/test/groups.e2e-spec.ts
git commit -m "feat(backend): expose group governance routes"
```

### Task 6: Mobile API and repository data flow

**Files:**
- Modify: `mobile/lib/shared/api/pairfund_api_client.dart`
- Modify: `mobile/lib/features/groups/data/group_repository.dart`
- Modify: `mobile/test/features/groups/group_repository_test.dart`

- [ ] **Step 1: Add failing repository tests**

Extend the recording client to capture DELETE and assert exact requests:

```dart
expect(api.patchPath, '/groups/group-1/members/user-2');
expect(api.patchData, {'role': 'owner'});
expect(api.deletePath, '/groups/group-1/members/user-2');
expect(api.postPath, '/groups/group-1/leave');
expect(detail.currentUserId, 'user-1');
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `flutter test test/features/groups/group_repository_test.dart`  
Expected: FAIL because DELETE, governance methods, and `currentUserId` are absent.

- [ ] **Step 3: Add DELETE capability without breaking old test clients**

```dart
abstract class PairFundDeleteApiClient {
  Future<Map<String, dynamic>> delete(String path, {Map<String, dynamic>? data});
}
```

Implement it in `DioPairFundApiClient` with the same `DioException` mapper used by GET/POST/PATCH.

- [ ] **Step 4: Extend `GroupDetail` and repository interface**

Add `currentUserId` and these methods:

```dart
Future<void> updateMemberRole(String groupId, String userId, String role);
Future<void> removeMember(String groupId, String userId);
Future<void> leaveGroup(String groupId);
```

Remote paths match Task 5. Demo mode mutates an in-memory member list, preserves historical demo data, and reassigns no implicit Owner.

- [ ] **Step 5: Run focused and full Flutter tests**

Run: `flutter test test/features/groups/group_repository_test.dart`  
Expected: focused tests pass.  
Run: `flutter test`  
Expected: all Flutter tests pass.

- [ ] **Step 6: Commit**

```powershell
git add mobile/lib/shared/api/pairfund_api_client.dart mobile/lib/features/groups/data/group_repository.dart mobile/test/features/groups/group_repository_test.dart
git commit -m "feat(mobile): add group governance data flow"
```

### Task 7: Mobile mutation controller and group reconciliation

**Files:**
- Modify: `mobile/lib/features/groups/providers/group_detail_controller.dart`
- Modify: `mobile/test/features/groups/group_detail_controller_test.dart`

- [ ] **Step 1: Add failing controller tests**

Test promote, demote, remove, and leave; duplicate-submit prevention; detail/Home invalidation; selection reconciliation; and every approved domain-code message.

```dart
expect(state.errorMessage,
  'Complete this member\'s balances in every fund first.');
expect(state.errorCode, 'MEMBER_HAS_OPEN_BALANCE');
```

Add a separate `MEMBER_HAS_PENDING_SETTLEMENT` assertion with copy
`Complete or cancel the pending settlement first.` and a
`LAST_OWNER_REQUIRED` assertion with copy
`Make another member an Owner first.`.

- [ ] **Step 2: Run focused test and verify RED**

Run: `flutter test test/features/groups/group_detail_controller_test.dart`  
Expected: FAIL because membership mutation controller is absent.

- [ ] **Step 3: Implement one operation-aware controller**

```dart
enum GroupMemberOperation { promote, demote, remove, leave }

class GroupMemberMutationState {
  const GroupMemberMutationState({
    this.isSubmitting = false,
    this.operation,
    this.errorCode,
    this.errorMessage,
  });
  final bool isSubmitting;
  final GroupMemberOperation? operation;
  final String? errorCode;
  final String? errorMessage;
}
```

Implement `changeRole`, `remove`, and `leave`; use request-scoped keep-alive, return `bool`, invalidate `groupDetailProvider(groupId)` and `homeGroupsProvider`, and await refreshed groups after leave so `SelectedGroupNotifier.reconcile()` runs before navigation.

- [ ] **Step 4: Run controller and Home selection tests**

Run:

```powershell
flutter test test/features/groups/group_detail_controller_test.dart test/features/groups/selected_group_provider_test.dart test/features/home/home_repository_test.dart
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

```powershell
git add mobile/lib/features/groups/providers/group_detail_controller.dart mobile/test/features/groups/group_detail_controller_test.dart
git commit -m "feat(mobile): manage group membership state"
```

### Task 8: Group detail bottom sheet and Danger zone

**Files:**
- Modify: `mobile/lib/features/groups/presentation/group_detail_screen.dart`
- Modify: `mobile/test/features/groups/group_detail_screen_test.dart`
- Modify: `mobile/test/app/app_smoke_test.dart`

- [ ] **Step 1: Write failing widget tests**

Cover Owner/member visibility, no menu on `currentUserId`, correct target actions, confirmation copy, destructive style, successful snackbar, leave navigation, and a 320×700 no-overflow render.

- [ ] **Step 2: Run widget tests and verify RED**

Run: `flutter test test/features/groups/group_detail_screen_test.dart test/app/app_smoke_test.dart`  
Expected: FAIL because menus and Danger zone do not exist.

- [ ] **Step 3: Extract focused private widgets in the same presentation file**

Add `_MemberTile`, `_MemberActionsSheet`, and `_GroupDangerZone`. `_MemberTile` receives explicit `isCurrentUser` and `canManage`; it never infers identity from role or name.

- [ ] **Step 4: Implement confirmations and controller wiring**

Use `showModalBottomSheet`, then `AlertDialog` for each selected action. Disable actions while submitting. On success, close overlays, show a snackbar, and refresh. After leave, use `context.go(AppRoutes.home)` only after controller reconciliation succeeds.

- [ ] **Step 5: Run focused tests, analyzer, full suite, and Web build**

Run:

```powershell
flutter test test/features/groups/group_detail_screen_test.dart test/app/app_smoke_test.dart
flutter analyze lib/features/groups test/features/groups
flutter test
flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: focused and full tests pass, analyzer reports no issues, and Web build succeeds.

- [ ] **Step 6: Commit**

```powershell
git add mobile/lib/features/groups/presentation/group_detail_screen.dart mobile/test/features/groups/group_detail_screen_test.dart mobile/test/app/app_smoke_test.dart
git commit -m "feat(mobile): add group member management UI"
```

### Task 9: Final integration, runtime acceptance, and records

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Modify: `backend/README.md` only if the route list needs synchronization

- [ ] **Step 1: Run final Backend verification**

Run: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build` from `backend/`.  
Expected: all tests pass and build exits 0.

- [ ] **Step 2: Run final Flutter verification**

Run: `flutter analyze && flutter test && flutter build web --no-wasm-dry-run --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1` from `mobile/`.  
Expected: no analyzer issues, all tests pass, Web build succeeds.

- [ ] **Step 3: Deploy the worktree build to the local acceptance stack**

Rebuild Backend, point the development container bind mount at this worktree, restart it, wait for `/api/v1/health`, and serve this worktree's `mobile/build/web` on 8080. Do not delete or repoint the main checkout until user acceptance passes.

- [ ] **Step 4: Perform two-account runtime smoke**

Verify Owner promotes/demotes another member, blocked removal copy, successful settled-member removal, Member visibility, leave behavior, group switching, and rejoin-as-Member through a new invite. Confirm audit rows contain operation and target IDs without email/token data.

- [ ] **Step 5: Update records after acceptance**

Mark `update-member-role`, `remove-member`, and `leave-group` done in `.agents/features.md`. Append a factual devlog entry with files, decisions, verification counts, and remaining gaps.

- [ ] **Step 6: Commit records**

```powershell
git add .agents/features.md .agents/devlog.md backend/README.md
git commit -m "docs: record group governance delivery"
```

- [ ] **Step 7: Finish the branch**

Use `superpowers:verification-before-completion`, `self-review`, and `superpowers:finishing-a-development-branch`. Present merge, PR, keep, and discard options only after fresh verification evidence.
