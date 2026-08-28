# PairFund Invite Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner create a seven-day, one-use invite code and let a second authenticated user join the persisted group from Flutter Web.

**Architecture:** Keep invite lifecycle and membership transactions in the existing NestJS `GroupsModule`. Add a feature-first Flutter `invites` slice with repository, Riverpod controllers, screens, and GoRouter entries; expose the current group ID through `HomeSummary` for navigation. Use conditional invite updates inside a Prisma transaction so concurrent acceptance cannot consume one code twice.

**Tech Stack:** NestJS, Prisma 5, PostgreSQL 16, Jest/Supertest, Flutter 3.41, Riverpod 2, Dio, GoRouter.

---

## File Structure

Backend:

- Create `backend/src/modules/groups/dto/create-group-invite.dto.ts`: optional normalized email request validation.
- Create `backend/src/modules/groups/dto/accept-group-invite.dto.ts`: invite-code request validation.
- Create `backend/src/modules/groups/group-invites.controller.ts`: collection-level accept endpoint.
- Create `backend/src/modules/groups/groups.service.spec.ts`: invite permission, expiry, email, membership, and atomic-consumption tests.
- Create `backend/test/group-invites.e2e-spec.ts`: authenticated HTTP contract and validation tests with a mocked service.
- Modify `backend/src/modules/groups/groups.service.ts`: create and accept domain logic.
- Modify `backend/src/modules/groups/groups.controller.ts`: owner create-invite endpoint and response mapping.
- Modify `backend/src/modules/groups/groups.module.ts`: register the accept controller.

Mobile:

- Modify `mobile/lib/shared/api/api_exception_mapper.dart` and its test: support NestJS top-level `message` codes.
- Create `mobile/lib/features/invites/data/invite_repository.dart`: invite models plus demo/remote repositories.
- Create `mobile/lib/features/invites/providers/create_invite_controller.dart`: optional-email form state.
- Create `mobile/lib/features/invites/providers/accept_invite_controller.dart`: code form state and group refresh.
- Create `mobile/lib/features/invites/presentation/create_invite_screen.dart`: owner form and copyable result.
- Create `mobile/lib/features/invites/presentation/accept_invite_screen.dart`: join form and mapped failures.
- Create repository, controller, and widget tests under `mobile/test/features/invites/`.
- Modify `mobile/lib/features/home/data/home_repository.dart`: include `groupId` in `HomeSummary`.
- Modify `mobile/lib/features/home/data/remote/home_remote_mapper.dart`: map the current group ID.
- Modify `mobile/lib/features/home/presentation/home_dashboard_screen.dart`: add create/join invite entry points.
- Modify `mobile/lib/app/router/app_routes.dart` and `app_router.dart`: register invite routes.

---

### Task 1: Backend create-invite rules

**Files:**

- Create: `backend/src/modules/groups/dto/create-group-invite.dto.ts`
- Create: `backend/src/modules/groups/groups.service.spec.ts`
- Modify: `backend/src/modules/groups/groups.service.ts`

- [ ] **Step 1: Write failing service tests for owner permission and invite creation**

Create `groups.service.spec.ts` with focused Prisma mocks:

```ts
import { ForbiddenException } from '@nestjs/common';
import { InviteStatus, MemberRole, MemberStatus } from '@prisma/client';
import { GroupsService } from './groups.service';

describe('GroupsService invitations', () => {
  it('creates a seven-day invite for an active owner', async () => {
    const now = new Date('2026-07-15T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      groupMember: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      groupInvite: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'invite-1',
          ...data,
          status: InviteStatus.PENDING,
        })),
      },
    };
    const service = new GroupsService(prisma as never);

    const invite = await service.createInvite('group-1', 'owner-1', {
      invited_email: ' Partner@Example.com ',
    });

    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'owner-1',
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
        group: { status: 'ACTIVE' },
      },
    });
    expect(prisma.groupInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        groupId: 'group-1',
        invitedById: 'owner-1',
        invitedEmail: 'partner@example.com',
        expiresAt: new Date('2026-07-22T00:00:00.000Z'),
        inviteCode: expect.stringMatching(/^[A-Za-z0-9_-]{12}$/),
      }),
    });
    expect(invite.status).toBe(InviteStatus.PENDING);
    jest.useRealTimers();
  });

  it('rejects invite creation by a non-owner', async () => {
    const prisma = {
      groupMember: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite('group-1', 'member-1', {}),
    ).rejects.toEqual(new ForbiddenException('GROUP_OWNER_REQUIRED'));
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
Set-Location backend
npm run test -- --runInBand groups.service.spec.ts
```

Expected: FAIL because `GroupsService.createInvite` does not exist.

- [ ] **Step 3: Add the create DTO**

```ts
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class CreateGroupInviteDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  invited_email?: string;
}
```

- [ ] **Step 4: Implement secure invite creation**

Add imports for `ForbiddenException`, `randomBytes`, `GroupStatus`, `InviteStatus`, and `CreateGroupInviteDto`, then add:

```ts
async createInvite(
  groupId: string,
  userId: string,
  dto: CreateGroupInviteDto,
) {
  const ownerMembership = await this.prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      role: MemberRole.OWNER,
      status: MemberStatus.ACTIVE,
      group: { status: GroupStatus.ACTIVE },
    },
  });

  if (!ownerMembership) {
    throw new ForbiddenException('GROUP_OWNER_REQUIRED');
  }

  return this.prisma.groupInvite.create({
    data: {
      groupId,
      invitedById: userId,
      invitedEmail: dto.invited_email?.trim().toLowerCase(),
      inviteCode: randomBytes(9).toString('base64url'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: InviteStatus.PENDING,
    },
  });
}
```

- [ ] **Step 5: Run the focused test and backend build**

```powershell
npm run test -- --runInBand groups.service.spec.ts
npm run build
```

Expected: all invitation service tests PASS; build exits 0.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/modules/groups/dto/create-group-invite.dto.ts backend/src/modules/groups/groups.service.ts backend/src/modules/groups/groups.service.spec.ts
git commit -m "feat(groups): create secure member invites"
```

If Git still reports that the workspace is not a repository, record the intended commit boundary in `.agents/devlog.md` and continue without claiming a commit.

---

### Task 2: Backend atomic invite acceptance

**Files:**

- Create: `backend/src/modules/groups/dto/accept-group-invite.dto.ts`
- Modify: `backend/src/modules/groups/groups.service.spec.ts`
- Modify: `backend/src/modules/groups/groups.service.ts`

- [ ] **Step 1: Add failing acceptance tests**

Add tests that construct a transaction mock and assert the exact outcomes:

```ts
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

const pendingInvite = {
  id: 'invite-1',
  groupId: 'group-1',
  invitedEmail: 'partner@example.com',
  expiresAt: new Date('2026-07-22T00:00:00.000Z'),
  status: InviteStatus.PENDING,
  group: { id: 'group-1', name: 'Our Home', status: 'ACTIVE' },
};

function acceptancePrisma(overrides: Record<string, unknown> = {}) {
  const tx = {
    groupInvite: {
      findUnique: jest.fn().mockResolvedValue(pendingInvite),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-2',
        email: 'partner@example.com',
      }),
    },
    groupMember: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        groupId: 'group-1',
        userId: 'user-2',
        role: MemberRole.MEMBER,
        joinedAt: new Date('2026-07-15T00:00:00.000Z'),
      }),
    },
    ...overrides,
  };
  return {
    tx,
    prisma: { $transaction: jest.fn((callback) => callback(tx)) },
  };
}

it('atomically accepts a pending invite for the matching email', async () => {
  jest.useFakeTimers().setSystemTime('2026-07-15T00:00:00.000Z');
  const { prisma, tx } = acceptancePrisma();
  const service = new GroupsService(prisma as never);

  const result = await service.acceptInvite('user-2', 'ABC123');

  expect(tx.groupInvite.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'invite-1',
      status: InviteStatus.PENDING,
      expiresAt: { gt: new Date('2026-07-15T00:00:00.000Z') },
    },
    data: {
      status: InviteStatus.ACCEPTED,
      acceptedById: 'user-2',
      acceptedAt: new Date('2026-07-15T00:00:00.000Z'),
    },
  });
  expect(tx.groupMember.create).toHaveBeenCalledWith({
    data: {
      groupId: 'group-1',
      userId: 'user-2',
      role: MemberRole.MEMBER,
      status: MemberStatus.ACTIVE,
    },
  });
  expect(result.group.name).toBe('Our Home');
  jest.useRealTimers();
});
```

Add one test for each stable exception by overriding the mock response:

```ts
await expect(service.acceptInvite('user-2', 'missing')).rejects.toEqual(
  new NotFoundException('INVITE_NOT_FOUND'),
);
await expect(service.acceptInvite('user-2', 'used')).rejects.toEqual(
  new ConflictException('INVITE_ALREADY_USED'),
);
await expect(service.acceptInvite('user-2', 'expired')).rejects.toEqual(
  new GoneException('INVITE_EXPIRED'),
);
await expect(service.acceptInvite('user-2', 'wrong-email')).rejects.toEqual(
  new ForbiddenException('INVITE_EMAIL_MISMATCH'),
);
await expect(service.acceptInvite('user-2', 'existing-member')).rejects.toEqual(
  new ConflictException('ALREADY_GROUP_MEMBER'),
);
```

Include a conditional-update race test where `updateMany` returns `{ count: 0 }` and assert `INVITE_ALREADY_USED` and no `groupMember.create` call.

- [ ] **Step 2: Run the tests and verify RED**

```powershell
npm run test -- --runInBand groups.service.spec.ts
```

Expected: FAIL because `acceptInvite` does not exist.

- [ ] **Step 3: Add the accept DTO**

```ts
import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class AcceptGroupInviteDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  invite_code!: string;
}
```

- [ ] **Step 4: Implement transactional acceptance**

Add the NestJS exception imports and this method:

```ts
async acceptInvite(userId: string, inviteCode: string) {
  return this.prisma.$transaction(async (tx) => {
    const [invite, user] = await Promise.all([
      tx.groupInvite.findUnique({
        where: { inviteCode },
        include: { group: true },
      }),
      tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      }),
    ]);

    if (!invite || !user) {
      throw new NotFoundException('INVITE_NOT_FOUND');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new ConflictException('INVITE_ALREADY_USED');
    }

    const acceptedAt = new Date();
    if (invite.expiresAt <= acceptedAt) {
      throw new GoneException('INVITE_EXPIRED');
    }
    if (
      invite.invitedEmail &&
      invite.invitedEmail.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new ForbiddenException('INVITE_EMAIL_MISMATCH');
    }

    const existingMember = await tx.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: invite.groupId, userId },
      },
    });
    if (existingMember) {
      throw new ConflictException('ALREADY_GROUP_MEMBER');
    }

    const consumed = await tx.groupInvite.updateMany({
      where: {
        id: invite.id,
        status: InviteStatus.PENDING,
        expiresAt: { gt: acceptedAt },
      },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedById: userId,
        acceptedAt,
      },
    });
    if (consumed.count !== 1) {
      throw new ConflictException('INVITE_ALREADY_USED');
    }

    const membership = await tx.groupMember.create({
      data: {
        groupId: invite.groupId,
        userId,
        role: MemberRole.MEMBER,
        status: MemberStatus.ACTIVE,
      },
    });
    return { invite, group: invite.group, membership };
  });
}
```

- [ ] **Step 5: Run focused tests**

```powershell
npm run test -- --runInBand groups.service.spec.ts
```

Expected: all create and accept cases PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/modules/groups/dto/accept-group-invite.dto.ts backend/src/modules/groups/groups.service.ts backend/src/modules/groups/groups.service.spec.ts
git commit -m "feat(groups): accept invites atomically"
```

---

### Task 3: Backend HTTP endpoints and contract tests

**Files:**

- Create: `backend/src/modules/groups/group-invites.controller.ts`
- Create: `backend/test/group-invites.e2e-spec.ts`
- Modify: `backend/src/modules/groups/groups.controller.ts`
- Modify: `backend/src/modules/groups/groups.module.ts`

- [ ] **Step 1: Write failing HTTP contract tests**

Build a Nest test app with the real controllers, `JwtAuthGuard`, global `ValidationPipe`, and a mocked `GroupsService`. Sign a JWT with `JwtService` and verify:

```ts
await request(app.getHttpServer())
  .post('/groups/group-1/invites')
  .set('Authorization', `Bearer ${ownerToken}`)
  .send({ invited_email: 'partner@example.com' })
  .expect(201)
  .expect(({ body }) => {
    expect(body.data).toEqual({
      invite_id: 'invite-1',
      invite_code: 'ABC123456789',
      invited_email: 'partner@example.com',
      expires_at: '2026-07-22T00:00:00.000Z',
      status: 'pending',
    });
  });

await request(app.getHttpServer())
  .post('/group-invites/accept')
  .set('Authorization', `Bearer ${memberToken}`)
  .send({ invite_code: 'ABC123456789' })
  .expect(201)
  .expect(({ body }) => {
    expect(body.data).toEqual({
      group_id: 'group-1',
      group_name: 'Our Home',
      role: 'member',
      joined_at: '2026-07-15T00:00:00.000Z',
    });
  });
```

Also assert 401 without a token and 400 for invalid email or blank code.

- [ ] **Step 2: Run the e2e test and verify RED**

```powershell
npm run test:e2e -- --runInBand group-invites.e2e-spec.ts
```

Expected: FAIL because both routes are missing.

- [ ] **Step 3: Add the create endpoint**

In `GroupsController`:

```ts
@Post(':groupId/invites')
async createInvite(
  @Param('groupId') groupId: string,
  @CurrentUser() user: RequestUser,
  @Body() dto: CreateGroupInviteDto,
) {
  const invite = await this.groupsService.createInvite(groupId, user.userId, dto);
  return {
    data: {
      invite_id: invite.id,
      invite_code: invite.inviteCode,
      invited_email: invite.invitedEmail,
      expires_at: invite.expiresAt.toISOString(),
      status: invite.status.toLowerCase(),
    },
  };
}
```

- [ ] **Step 4: Add the accept controller**

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, RequestUser } from '../auth/jwt-auth.guard';
import { AcceptGroupInviteDto } from './dto/accept-group-invite.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('group-invites')
export class GroupInvitesController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('accept')
  async acceptInvite(
    @CurrentUser() user: RequestUser,
    @Body() dto: AcceptGroupInviteDto,
  ) {
    const result = await this.groupsService.acceptInvite(
      user.userId,
      dto.invite_code,
    );
    return {
      data: {
        group_id: result.group.id,
        group_name: result.group.name,
        role: result.membership.role.toLowerCase(),
        joined_at: result.membership.joinedAt.toISOString(),
      },
    };
  }
}
```

Register both controllers in `GroupsModule`:

```ts
controllers: [GroupsController, GroupInvitesController],
```

- [ ] **Step 5: Run backend verification**

```powershell
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Expected: all Jest suites PASS and build exits 0.

- [ ] **Step 6: Commit**

```powershell
git add backend/src/modules/groups backend/test/group-invites.e2e-spec.ts
git commit -m "feat(api): expose group invite endpoints"
```

---

### Task 4: Mobile API error-code compatibility

**Files:**

- Modify: `mobile/lib/shared/api/api_exception_mapper.dart`
- Modify: `mobile/test/shared/api/api_exception_mapper_test.dart`

- [ ] **Step 1: Add a failing mapper test for NestJS exceptions**

```dart
test('maps a NestJS message code from the top-level response', () {
  final exception = mapDioExceptionToApiException(
    DioException(
      requestOptions: RequestOptions(path: '/group-invites/accept'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/group-invites/accept'),
        statusCode: 403,
        data: <String, dynamic>{
          'statusCode': 403,
          'message': 'INVITE_EMAIL_MISMATCH',
          'error': 'Forbidden',
        },
      ),
    ),
  );

  expect(exception.code, 'INVITE_EMAIL_MISMATCH');
  expect(exception.statusCode, 403);
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
flutter test test/shared/api/api_exception_mapper_test.dart
```

Expected: FAIL with code `API_ERROR` or `NETWORK_ERROR`.

- [ ] **Step 3: Parse nested and top-level formats**

After the existing nested `error` handling, add:

```dart
final topLevelMessage = responseData['message'];
if (topLevelMessage is String && topLevelMessage.isNotEmpty) {
  return ApiException(
    code: topLevelMessage,
    message: topLevelMessage,
    statusCode: error.response?.statusCode,
  );
}
```

- [ ] **Step 4: Run the mapper test**

```powershell
flutter test test/shared/api/api_exception_mapper_test.dart
```

Expected: all mapper tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add mobile/lib/shared/api/api_exception_mapper.dart mobile/test/shared/api/api_exception_mapper_test.dart
git commit -m "fix(mobile): preserve NestJS API error codes"
```

---

### Task 5: Mobile invite repository

**Files:**

- Create: `mobile/lib/features/invites/data/invite_repository.dart`
- Create: `mobile/test/features/invites/invite_repository_test.dart`

- [ ] **Step 1: Write failing remote repository tests**

Use a recording `PairFundApiClient` and assert exact requests and parsed results:

```dart
final created = await repository.createInvite(
  groupId: 'group-1',
  invitedEmail: 'partner@example.com',
);
expect(client.lastPath, '/groups/group-1/invites');
expect(client.lastData, <String, dynamic>{
  'invited_email': 'partner@example.com',
});
expect(created.code, 'ABC123456789');

final joined = await repository.acceptInvite('ABC123456789');
expect(client.lastPath, '/group-invites/accept');
expect(client.lastData, <String, dynamic>{'invite_code': 'ABC123456789'});
expect(joined.groupId, 'group-1');
expect(joined.role, 'member');
```

- [ ] **Step 2: Run the repository test and verify RED**

```powershell
flutter test test/features/invites/invite_repository_test.dart
```

Expected: compilation FAIL because the repository file and types do not exist.

- [ ] **Step 3: Implement models and repositories**

Define:

```dart
class CreatedInvite {
  const CreatedInvite({
    required this.id,
    required this.code,
    required this.expiresAt,
    this.invitedEmail,
  });
  final String id;
  final String code;
  final DateTime expiresAt;
  final String? invitedEmail;
}

class AcceptedInvite {
  const AcceptedInvite({
    required this.groupId,
    required this.groupName,
    required this.role,
    required this.joinedAt,
  });
  final String groupId;
  final String groupName;
  final String role;
  final DateTime joinedAt;
}

abstract class InviteRepository {
  Future<CreatedInvite> createInvite({
    required String groupId,
    String? invitedEmail,
  });
  Future<AcceptedInvite> acceptInvite(String inviteCode);
}
```

`RemoteInviteRepository` posts to the two contract paths, omits `invited_email` when blank, reads `data`, and uses `DateTime.parse`. `DemoInviteRepository` returns `DEMO-INVITE1` expiring in seven days and a deterministic demo group. Add `inviteRepositoryProvider` using `apiModeProvider` and `pairFundApiClientProvider`.

- [ ] **Step 4: Run repository tests**

```powershell
flutter test test/features/invites/invite_repository_test.dart
```

Expected: all repository tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add mobile/lib/features/invites/data/invite_repository.dart mobile/test/features/invites/invite_repository_test.dart
git commit -m "feat(mobile): add invite data repository"
```

---

### Task 6: Mobile invite controllers

**Files:**

- Create: `mobile/lib/features/invites/providers/create_invite_controller.dart`
- Create: `mobile/lib/features/invites/providers/accept_invite_controller.dart`
- Create: `mobile/test/features/invites/invite_controller_test.dart`

- [ ] **Step 1: Write failing controller tests**

Use a fake repository and `ProviderContainer` to prove:

- create trims/lowercases email and stores `CreatedInvite`;
- blank email is submitted as null;
- accept trims the code, stores `AcceptedInvite`, and invalidates `homeSummaryProvider`;
- `INVITE_EXPIRED`, `INVITE_EMAIL_MISMATCH`, `INVITE_ALREADY_USED`, and `ALREADY_GROUP_MEMBER` map to distinct messages.

Example assertion:

```dart
expect(await controller.submit(), isTrue);
expect(fakeRepository.createdEmail, 'partner@example.com');
expect(container.read(createInviteControllerProvider('group-1')).invite?.code,
    'ABC123456789');
```

- [ ] **Step 2: Run controller tests and verify RED**

```powershell
flutter test test/features/invites/invite_controller_test.dart
```

Expected: compilation FAIL because controller providers do not exist.

- [ ] **Step 3: Implement create state/controller**

Create immutable state with `emailDraft`, `isSubmitting`, `invite`, and `errorMessage`. `submit()` validates a nonblank email using a simple email regex before calling the repository, then catches `ApiException` and maps `GROUP_OWNER_REQUIRED` to `Only a group owner can invite members.`.

Expose:

```dart
final createInviteControllerProvider = StateNotifierProvider.autoDispose
    .family<CreateInviteController, CreateInviteState, String>(
  (ref, groupId) => CreateInviteController(ref, groupId),
);
```

- [ ] **Step 4: Implement accept state/controller**

Create immutable state with `codeDraft`, `isSubmitting`, `acceptedInvite`, and `errorMessage`. On success call:

```dart
ref.invalidate(homeSummaryProvider);
```

Map stable codes to these messages:

```dart
const messages = <String, String>{
  'INVITE_NOT_FOUND': 'This invite code was not found.',
  'INVITE_ALREADY_USED': 'This invite code has already been used.',
  'INVITE_EXPIRED': 'This invite code has expired.',
  'INVITE_EMAIL_MISMATCH': 'This invite was created for another email address.',
  'ALREADY_GROUP_MEMBER': 'You are already a member of this group.',
};
```

- [ ] **Step 5: Run controller tests**

```powershell
flutter test test/features/invites/invite_controller_test.dart
```

Expected: all controller tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add mobile/lib/features/invites/providers mobile/test/features/invites/invite_controller_test.dart
git commit -m "feat(mobile): manage invite form state"
```

---

### Task 7: Flutter routes, screens, and home entry points

**Files:**

- Create: `mobile/lib/features/invites/presentation/create_invite_screen.dart`
- Create: `mobile/lib/features/invites/presentation/accept_invite_screen.dart`
- Create: `mobile/test/features/invites/create_invite_screen_test.dart`
- Create: `mobile/test/features/invites/accept_invite_screen_test.dart`
- Modify: `mobile/lib/features/home/data/home_repository.dart`
- Modify: `mobile/lib/features/home/data/remote/home_remote_mapper.dart`
- Modify: `mobile/lib/features/home/presentation/home_dashboard_screen.dart`
- Modify: `mobile/lib/app/router/app_routes.dart`
- Modify: `mobile/lib/app/router/app_router.dart`
- Modify: `mobile/test/features/home/home_repository_test.dart`
- Modify: `mobile/test/features/home/home_dashboard_screen_test.dart`

- [ ] **Step 1: Add failing HomeSummary tests for group ID**

Extend `HomeSummary` expectations so demo returns `group-demo` and remote mapping returns the first group ID. Expected RED: constructor and mapper do not accept `groupId`.

- [ ] **Step 2: Add `groupId` to home data flow**

Add `final String? groupId` to `HomeSummary`, pass `group-demo` in demo mode, pass `null` for no groups, and pass `groups.first.id` for remote mode. Update `mapRemoteHomeSummary` to require the nullable group ID.

- [ ] **Step 3: Write failing screen tests**

Create-invite test must override controller/repository state, enter `partner@example.com`, tap `Create invite`, and expect the code plus `Copy code`. Accept-invite test must enter `ABC123456789`, tap `Join group`, and expect success text or a mapped error. Use `ProviderScope`, `MaterialApp`, and repository overrides rather than HTTP mocks.

- [ ] **Step 4: Run screen tests and verify RED**

```powershell
flutter test test/features/invites
```

Expected: compilation FAIL because screens and routes do not exist.

- [ ] **Step 5: Implement routes**

Add:

```dart
static const String createInvite = '/groups/:groupId/invites/new';
static const String acceptInvite = '/invites/accept';
static String createInvitePath(String groupId) =>
    '/groups/$groupId/invites/new';
```

Register both screens in `app_router.dart`; extract `groupId` from path parameters for `CreateInviteScreen`.

- [ ] **Step 6: Implement create screen**

Use PairFund design tokens. Render an optional email `TextField`, `Create invite` button, progress state, inline error, and after success a selectable code, formatted expiry, and `Copy code` button using `Clipboard.setData(ClipboardData(text: invite.code))`.

- [ ] **Step 7: Implement accept screen**

Render invite-code `TextField`, `Join group` button, progress state, and inline error. On successful `submit()`, show a `SnackBar` containing `Joined ${accepted.groupName}` and call `context.go(AppRoutes.home)`.

- [ ] **Step 8: Add home actions**

Add a compact `Row` below the header:

- `Join with code` always navigates to `AppRoutes.acceptInvite`.
- `Invite member` is enabled only when `summary.groupId != null` and navigates to `AppRoutes.createInvitePath(summary.groupId!)`.

Owner-only server enforcement remains authoritative; a non-owner who reaches the screen receives `GROUP_OWNER_REQUIRED`.

- [ ] **Step 9: Run mobile verification**

```powershell
flutter test
flutter build web --no-wasm-dry-run `
  --dart-define=PAIRFUND_API_MODE=remote `
  --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: all Flutter tests PASS and `build/web` is produced.

- [ ] **Step 10: Commit**

```powershell
git add mobile/lib mobile/test mobile/web
git commit -m "feat(mobile): add create and accept invite flow"
```

---

### Task 8: Runtime deployment and two-account acceptance

**Files:**

- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Rebuild and restart the backend container**

```powershell
Set-Location backend
npm run build
wsl -d Ubuntu-22.04-InDiskD -- docker restart pairfund-backend
```

Expected: container returns to `Up`; `GET http://localhost:3001/api/v1/health` returns `{"data":{"ok":true}}`.

- [ ] **Step 2: Run an API smoke flow with two accounts**

Using PowerShell `Invoke-RestMethod` and in-memory tokens:

1. Login as `demo@pairfund.local`.
2. Read `/groups`; create a group if none exists.
3. Register a unique `phase1-member-<timestamp>@pairfund.local` user.
4. Owner creates an email-restricted invite.
5. New user accepts the code.
6. `GET /groups/:groupId/members` returns both owner and member.

Expected: invite response is pending; accept response role is `member`; persisted member count is 2.

- [ ] **Step 3: Launch Flutter Web remote mode**

```powershell
Set-Location mobile
flutter run -d chrome --web-port 8080 `
  --dart-define=PAIRFUND_API_MODE=remote `
  --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: Chrome opens PairFund without console or runner errors.

- [ ] **Step 4: User performs visual acceptance**

User actions:

1. Login as demo owner and copy an invite code from `Invite member`.
2. Logout and login/register the matching second email.
3. Paste the code in `Join with code`.
4. Confirm the shared group loads and both names appear in its member list/home state.

Acceptance: no manual database edits, page refresh retains membership, and reusing the same code shows the already-used message.

- [ ] **Step 5: Update project records**

Mark `invite-member` and `accept-invite` done in `.agents/features.md`. Append a devlog entry listing backend/mobile files, the one-use conditional update decision, tests run, API smoke evidence, and remaining email-delivery/revocation gaps. Add WSL Docker restart and remote-mode commands to `backend/README.md`.

- [ ] **Step 6: Final verification**

```powershell
Set-Location backend
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run build

Set-Location mobile
flutter test
flutter build web --no-wasm-dry-run `
  --dart-define=PAIRFUND_API_MODE=remote `
  --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3001/api/v1
```

Expected: all commands exit 0, API health is true, Web returns HTTP 200, and Flutter runner error log remains empty.

- [ ] **Step 7: Commit project records**

```powershell
git add .agents/features.md .agents/devlog.md backend/README.md
git commit -m "docs: record invite flow delivery"
```
