import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
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

describe('GroupsService.acceptInvite', () => {
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
        create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        update: jest.fn().mockResolvedValue({ id: 'membership-1' }),
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
    const acceptedAt = new Date('2026-07-16T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(acceptedAt);
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
      expect(tx.groupMember.update).toHaveBeenCalledWith({
        where: { id: 'existing-membership' },
        data: {
          status: MemberStatus.ACTIVE,
          role: MemberRole.MEMBER,
          joinedAt: expect.any(Date),
        },
      });
    },
  );

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
    expect(tx.groupMember.update).not.toHaveBeenCalled();
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
