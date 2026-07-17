import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
  GroupStatus,
  InviteStatus,
  MemberRole,
  MemberStatus,
  Prisma,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AcceptGroupInviteDto } from './dto/accept-group-invite.dto';
import { CreateGroupInviteDto } from './dto/create-group-invite.dto';
import { GroupsService } from './groups.service';
import { UpdateGroupMemberDto } from './dto/update-group-member.dto';

describe('UpdateGroupMemberDto', () => {
  it('trims and lowercases OWNER', async () => {
    const dto = plainToInstance(UpdateGroupMemberDto, { role: ' OWNER ' });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.role).toBe('owner');
  });

  it('rejects a role other than owner or member', async () => {
    const dto = plainToInstance(UpdateGroupMemberDto, { role: 'admin' });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});

describe('GroupsService.updateMemberRole', () => {
  const group = { id: 'group-1', status: GroupStatus.ACTIVE };
  const actor = {
    id: 'actor-membership',
    userId: 'owner-1',
    role: MemberRole.OWNER,
    status: MemberStatus.ACTIVE,
  };
  const target = {
    id: 'target-membership',
    userId: 'member-1',
    role: MemberRole.MEMBER,
    status: MemberStatus.ACTIVE,
  };
  const updatedTarget = {
    ...target,
    role: MemberRole.OWNER,
    user: { id: 'member-1', displayName: 'Partner' },
  };

  function setup() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      group: { findFirst: jest.fn().mockResolvedValue(group) },
      groupMember: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(actor)
          .mockResolvedValueOnce(target),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockResolvedValue(updatedTarget),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return { service: new GroupsService(prisma as never), prisma, tx };
  }

  it('promotes an active member and records the role change audit in one transaction', async () => {
    const { service, prisma, tx } = setup();

    await expect(
      service.updateMemberRole('group-1', 'owner-1', 'member-1', {
        role: 'owner',
      }),
    ).resolves.toBe(updatedTarget);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.groupMember.update).toHaveBeenCalledWith({
      where: { id: target.id },
      data: { role: MemberRole.OWNER },
      include: { user: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        actorUserId: 'owner-1',
        entityType: AuditEntityType.GROUP,
        entityId: 'group-1',
        action: AuditAction.ROLE_CHANGE,
        beforeSnapshot: { role: 'member', status: 'active' },
        afterSnapshot: { role: 'owner', status: 'active' },
        metadata: {
          operation: 'promote_member',
          target_user_id: 'member-1',
        },
      },
    });
  });

  it('demotes another owner when another active owner remains', async () => {
    const { service, tx } = setup();
    tx.groupMember.findFirst
      .mockReset()
      .mockResolvedValueOnce(actor)
      .mockResolvedValueOnce({ ...target, role: MemberRole.OWNER });
    tx.groupMember.update.mockResolvedValue({
      ...updatedTarget,
      role: MemberRole.MEMBER,
    });

    await service.updateMemberRole('group-1', 'owner-1', 'owner-2', {
      role: 'member',
    });

    expect(tx.groupMember.count).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        beforeSnapshot: { role: 'owner', status: 'active' },
        afterSnapshot: { role: 'member', status: 'active' },
        metadata: {
          operation: 'demote_owner',
          target_user_id: 'owner-2',
        },
      }),
    });
  });

  it('allows an owner to demote themselves when another active owner remains', async () => {
    const { service, tx } = setup();
    const selfOwner = { ...actor };
    tx.groupMember.findFirst
      .mockReset()
      .mockResolvedValueOnce(selfOwner)
      .mockResolvedValueOnce(selfOwner);
    tx.groupMember.count.mockResolvedValue(2);
    tx.groupMember.update.mockResolvedValue({
      ...selfOwner,
      role: MemberRole.MEMBER,
      user: { id: 'owner-1', displayName: 'Owner' },
    });

    await service.updateMemberRole('group-1', 'owner-1', 'owner-1', {
      role: 'member',
    });

    expect(tx.groupMember.count).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(tx.groupMember.update).toHaveBeenCalledWith({
      where: { id: 'actor-membership' },
      data: { role: MemberRole.MEMBER },
      include: { user: true },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'owner-1',
        metadata: {
          operation: 'demote_owner',
          target_user_id: 'owner-1',
        },
      }),
    });
  });

  it.each([
    ['GROUP_NOT_FOUND', null, actor, target, NotFoundException],
    ['GROUP_ACCESS_DENIED', group, null, target, ForbiddenException],
    [
      'OWNER_REQUIRED',
      group,
      { ...actor, role: MemberRole.MEMBER },
      target,
      ForbiddenException,
    ],
    ['MEMBER_NOT_FOUND', group, actor, null, NotFoundException],
  ])('returns %s for invalid group or membership state', async (
    message,
    foundGroup,
    foundActor,
    foundTarget,
    ExceptionType,
  ) => {
    const { service, tx } = setup();
    tx.group.findFirst.mockResolvedValue(foundGroup);
    tx.groupMember.findFirst
      .mockReset()
      .mockResolvedValueOnce(foundActor)
      .mockResolvedValueOnce(foundTarget);

    await expect(
      service.updateMemberRole('group-1', 'owner-1', 'member-1', {
        role: 'owner',
      }),
    ).rejects.toEqual(new ExceptionType(message));
    expect(tx.groupMember.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('returns ROLE_UNCHANGED when the target already has the requested role', async () => {
    const { service, tx } = setup();
    tx.groupMember.findFirst
      .mockReset()
      .mockResolvedValueOnce(actor)
      .mockResolvedValueOnce({ ...target, role: MemberRole.OWNER });

    await expect(
      service.updateMemberRole('group-1', 'owner-1', 'member-1', {
        role: 'owner',
      }),
    ).rejects.toEqual(new ConflictException('ROLE_UNCHANGED'));
  });

  it('returns LAST_OWNER_REQUIRED when demoting the final active owner', async () => {
    const { service, tx } = setup();
    tx.groupMember.findFirst
      .mockReset()
      .mockResolvedValueOnce(actor)
      .mockResolvedValueOnce({ ...target, role: MemberRole.OWNER });
    tx.groupMember.count.mockResolvedValue(1);

    await expect(
      service.updateMemberRole('group-1', 'owner-1', 'owner-1', {
        role: 'member',
      }),
    ).rejects.toEqual(new ConflictException('LAST_OWNER_REQUIRED'));
    expect(tx.groupMember.count).toHaveBeenCalledTimes(1);
    expect(tx.groupMember.update).not.toHaveBeenCalled();
  });

  it('locks before ordered authorization reads, update, and audit creation', async () => {
    const { service, tx } = setup();

    await service.updateMemberRole('group-1', 'owner-1', 'member-1', {
      role: 'owner',
    });

    const lockOrder = tx.$executeRaw.mock.invocationCallOrder[0];
    const groupReadOrder = tx.group.findFirst.mock.invocationCallOrder[0];
    const [actorReadOrder, targetReadOrder] =
      tx.groupMember.findFirst.mock.invocationCallOrder;
    const updateOrder = tx.groupMember.update.mock.invocationCallOrder[0];
    const auditOrder = tx.auditLog.create.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(groupReadOrder);
    expect(groupReadOrder).toBeLessThan(actorReadOrder);
    expect(actorReadOrder).toBeLessThan(targetReadOrder);
    expect(targetReadOrder).toBeLessThan(updateOrder);
    expect(updateOrder).toBeLessThan(auditOrder);
  });
});

describe('GroupsService.createInvite', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows an active owner of an active group to create a seven-day invite', async () => {
    const now = new Date('2026-07-16T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const invite = { id: 'invite-1' };
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue({ id: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }),
      },
      groupInvite: {
        create: jest.fn().mockResolvedValue(invite),
      },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite(
        'group-1',
        'owner-1',
        plainToInstance(CreateGroupInviteDto, {
          invited_email: ' Partner@Example.com ',
        }),
      ),
    ).resolves.toBe(invite);
    expect(prisma.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-1', status: GroupStatus.ACTIVE },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: {
        groupId: 'group-1',
        userId: 'owner-1',
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(prisma.groupInvite.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        invitedById: 'owner-1',
        invitedEmail: 'partner@example.com',
        inviteCode: expect.stringMatching(/^[A-Za-z0-9_-]{12}$/),
        expiresAt: new Date('2026-07-23T00:00:00.000Z'),
      },
    });
  });

  it('rejects an actor who is not an active owner', async () => {
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue({ id: 'group-1' }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      groupInvite: {
        create: jest.fn(),
      },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite('group-1', 'member-1', {}),
    ).rejects.toEqual(new ForbiddenException('GROUP_OWNER_REQUIRED'));
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
  });

  it('rejects invite creation when the group is inactive', async () => {
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      groupMember: {
        findFirst: jest.fn(),
      },
      groupInvite: {
        create: jest.fn(),
      },
    };
    const service = new GroupsService(prisma as never);

    await expect(
      service.createInvite('group-1', 'owner-1', {}),
    ).rejects.toEqual(new ForbiddenException('GROUP_OWNER_REQUIRED'));
    expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.groupInvite.create).not.toHaveBeenCalled();
  });
});

describe('CreateGroupInviteDto', () => {
  it('trims and lowercases an optional email', async () => {
    const dto = plainToInstance(CreateGroupInviteDto, {
      invited_email: '  Partner@Example.COM  ',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.invited_email).toBe('partner@example.com');
  });

  it('rejects an invalid invited email', async () => {
    const dto = plainToInstance(CreateGroupInviteDto, {
      invited_email: 'not-an-email',
    });

    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});

describe('GroupsService group access and management', () => {
  const activeGroup = {
    id: 'group-1',
    name: 'Our Home',
    status: GroupStatus.ACTIVE,
  };

  function setup(role: MemberRole | null = MemberRole.MEMBER) {
    const prisma = {
      group: {
        findFirst: jest.fn().mockResolvedValue(activeGroup),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...activeGroup,
          name: 'Renamed Home',
        }),
      },
      groupMember: {
        findFirst: jest.fn().mockResolvedValue(
          role ? { id: 'membership-1', role } : null,
        ),
        findMany: jest.fn().mockResolvedValue([
          { id: 'membership-1', user: { displayName: 'Edward' } },
        ]),
      },
    };
    return { service: new GroupsService(prisma as never), prisma };
  }

  it('returns group detail and the active member role', async () => {
    const { service } = setup(MemberRole.MEMBER);

    await expect(
      service.getGroupDetail('group-1', 'user-1'),
    ).resolves.toEqual({ group: activeGroup, role: MemberRole.MEMBER });
  });

  it('denies group detail to a non-member', async () => {
    const { service } = setup(null);

    await expect(
      service.getGroupDetail('group-1', 'outsider-1'),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));
  });

  it('returns GROUP_NOT_FOUND for an archived or missing group', async () => {
    const { service, prisma } = setup();
    prisma.group.findFirst.mockResolvedValue(null);

    await expect(
      service.getGroupDetail('group-1', 'user-1'),
    ).rejects.toEqual(new NotFoundException('GROUP_NOT_FOUND'));
    expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
  });

  it('authorizes members before listing active memberships', async () => {
    const { service, prisma } = setup(MemberRole.MEMBER);

    await service.listMembers('group-1', 'user-1');

    expect(prisma.groupMember.findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1', status: MemberStatus.ACTIVE },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  });

  it('allows an owner to rename the group', async () => {
    const { service, prisma } = setup(MemberRole.OWNER);

    await expect(
      service.updateGroup('group-1', 'owner-1', { name: 'Renamed Home' }),
    ).resolves.toMatchObject({ name: 'Renamed Home' });
    expect(prisma.group.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'group-1',
        status: GroupStatus.ACTIVE,
        members: {
          some: {
            userId: 'owner-1',
            role: MemberRole.OWNER,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      data: { name: 'Renamed Home' },
    });
  });

  it('denies rename to a regular member', async () => {
    const { service, prisma } = setup(MemberRole.MEMBER);

    await expect(
      service.updateGroup('group-1', 'member-1', { name: 'Nope' }),
    ).rejects.toEqual(new ForbiddenException('OWNER_REQUIRED'));
    expect(prisma.group.updateMany).not.toHaveBeenCalled();
  });

  it('denies rename when owner access changes before the write', async () => {
    const { service, prisma } = setup(MemberRole.OWNER);
    prisma.group.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateGroup('group-1', 'owner-1', { name: 'Nope' }),
    ).rejects.toEqual(new ForbiddenException('OWNER_REQUIRED'));
    expect(prisma.group.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe('GroupsService.acceptInvite', () => {
  const activeInviteTime = new Date('2026-07-16T00:00:00.000Z');
  const group = { id: 'group-1', name: 'Shared', status: GroupStatus.ACTIVE };
  const user = { id: 'user-1', email: 'partner@example.com' };
  const pendingInvite = {
    id: 'invite-1',
    groupId: group.id,
    inviteCode: 'invite-code',
    invitedEmail: 'Partner@Example.com',
    status: InviteStatus.PENDING,
    expiresAt: new Date('2026-07-17T00:00:00.000Z'),
    group,
  };

  beforeEach(() => jest.useFakeTimers().setSystemTime(activeInviteTime));
  afterEach(() => jest.useRealTimers());

  function setup(overrides: Record<string, unknown> = {}) {
    const tx = {
      groupInvite: {
        findUnique: jest.fn().mockResolvedValue(pendingInvite),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      groupMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ...overrides,
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return { service: new GroupsService(prisma as never), prisma, tx };
  }

  it('atomically consumes a pending invite and creates an active member', async () => {
    const acceptedAt = activeInviteTime;
    const { service, prisma, tx } = setup();

    await expect(service.acceptInvite(user.id, 'invite-code')).resolves.toEqual({
      invite: pendingInvite,
      group,
      membership: { id: 'membership-1' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.groupInvite.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: 'invite-code' },
      include: { group: true },
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: { id: true, email: true },
    });
    expect(tx.groupInvite.updateMany).toHaveBeenCalledWith({
      where: {
        id: pendingInvite.id,
        status: InviteStatus.PENDING,
        expiresAt: { gt: acceptedAt },
        group: { status: GroupStatus.ACTIVE },
      },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedById: user.id,
        acceptedAt,
      },
    });
    expect(tx.groupMember.create).toHaveBeenCalledWith({
      data: {
        groupId: group.id,
        userId: user.id,
        role: MemberRole.MEMBER,
        status: MemberStatus.ACTIVE,
      },
    });
  });

  it.each([
    ['missing invite', null, user],
    ['missing user', pendingInvite, null],
  ])('returns INVITE_NOT_FOUND for %s', async (_case, invite, foundUser) => {
    const { service, tx } = setup();
    tx.groupInvite.findUnique.mockResolvedValue(invite);
    tx.user.findUnique.mockResolvedValue(foundUser);
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new NotFoundException('INVITE_NOT_FOUND'),
    );
  });

  it('returns INVITE_ALREADY_USED for a non-pending invite', async () => {
    const { service, tx } = setup();
    tx.groupInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      status: InviteStatus.ACCEPTED,
    });
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ConflictException('INVITE_ALREADY_USED'),
    );
  });

  it('returns INVITE_EXPIRED when expiresAt is now', async () => {
    jest.useFakeTimers().setSystemTime(pendingInvite.expiresAt);
    const { service } = setup();
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new GoneException('INVITE_EXPIRED'),
    );
  });

  it('returns INVITE_EMAIL_MISMATCH for a different user email', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue({ ...user, email: 'other@example.com' });
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ForbiddenException('INVITE_EMAIL_MISMATCH'),
    );
  });

  it('returns ALREADY_GROUP_MEMBER when membership exists', async () => {
    const { service, tx } = setup();
    tx.groupMember.findUnique.mockResolvedValue({
      id: 'existing-membership',
      status: MemberStatus.ACTIVE,
    });
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ConflictException('ALREADY_GROUP_MEMBER'),
    );
  });

  it.each([MemberStatus.LEFT, MemberStatus.REMOVED])(
    'reactivates a %s membership instead of creating one',
    async (status) => {
      const { service, tx } = setup();
      tx.groupMember.findUnique.mockResolvedValue({
        id: 'existing-membership',
        status,
      });

      await service.acceptInvite(user.id, 'invite-code');

      expect(tx.groupMember.create).not.toHaveBeenCalled();
      expect(tx.groupMember.updateMany).toHaveBeenCalledWith({
        where: { id: 'existing-membership', status },
        data: {
          status: MemberStatus.ACTIVE,
          role: MemberRole.MEMBER,
          joinedAt: expect.any(Date),
        },
      });
      expect(tx.groupMember.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'existing-membership' },
      });
    },
  );

  it('rolls back with ALREADY_GROUP_MEMBER when inactive membership reactivation loses a race', async () => {
    const { service, prisma, tx } = setup();
    tx.groupMember.findUnique.mockResolvedValue({
      id: 'existing-membership',
      status: MemberStatus.LEFT,
    });
    tx.groupMember.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ConflictException('ALREADY_GROUP_MEMBER'),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.groupMember.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.groupMember.create).not.toHaveBeenCalled();
  });

  it('maps a membership unique race after transaction rollback to ALREADY_GROUP_MEMBER', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['group_id', 'user_id'] },
    });
    const prisma = { $transaction: jest.fn().mockRejectedValue(error) };
    const service = new GroupsService(prisma as never);

    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ConflictException('ALREADY_GROUP_MEMBER'),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not map unrelated Prisma errors', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('unique conflict', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['invite_code'] },
    });
    const prisma = { $transaction: jest.fn().mockRejectedValue(error) };
    const service = new GroupsService(prisma as never);

    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toBe(error);
  });

  it('returns INVITE_NOT_FOUND for an invite in an archived group', async () => {
    const { service, tx } = setup();
    tx.groupInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      group: { ...group, status: GroupStatus.ARCHIVED },
    });

    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new NotFoundException('INVITE_NOT_FOUND'),
    );
    expect(tx.groupInvite.updateMany).not.toHaveBeenCalled();
  });

  it('returns INVITE_NOT_FOUND and creates no membership when group is archived after read', async () => {
    const { service, tx } = setup();
    tx.groupInvite.updateMany.mockResolvedValue({ count: 0 });
    tx.groupInvite.findUnique
      .mockResolvedValueOnce(pendingInvite)
      .mockResolvedValueOnce({
        status: InviteStatus.PENDING,
        group: { status: GroupStatus.ARCHIVED },
      });

    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new NotFoundException('INVITE_NOT_FOUND'),
    );
    expect(tx.groupMember.create).not.toHaveBeenCalled();
    expect(tx.groupMember.updateMany).not.toHaveBeenCalled();
  });

  it('returns INVITE_ALREADY_USED and does not create membership when consumption loses a race', async () => {
    const { service, tx } = setup();
    tx.groupInvite.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.acceptInvite(user.id, 'invite-code')).rejects.toEqual(
      new ConflictException('INVITE_ALREADY_USED'),
    );
    expect(tx.groupMember.create).not.toHaveBeenCalled();
  });
});

describe('AcceptGroupInviteDto', () => {
  it('trims invite_code', async () => {
    const dto = plainToInstance(AcceptGroupInviteDto, {
      invite_code: '  invite-code  ',
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.invite_code).toBe('invite-code');
  });

  it.each([{}, { invite_code: '   ' }])('rejects missing or empty invite_code', async (input) => {
    const dto = plainToInstance(AcceptGroupInviteDto, input);
    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
