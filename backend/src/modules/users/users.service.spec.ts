import { Prisma } from '@prisma/client';
import * as mimicId from './mimic-id';
import { UsersService } from './users.service';

describe('UsersService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('assigns a generated Mimic ID when creating a user', async () => {
    const prisma = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };
    jest.spyOn(mimicId, 'generateMimicId').mockReturnValue('MIMIC-2345-6789');
    const service = new UsersService(prisma as never);

    await service.createUser({
      email: 'edward@example.com',
      passwordHash: 'password-hash',
      displayName: 'Edward',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'edward@example.com',
        passwordHash: 'password-hash',
        displayName: 'Edward',
        mimicId: 'MIMIC-2345-6789',
      },
    });
  });

  it('retries only a Mimic ID unique collision with a new candidate', async () => {
    const collision = uniqueConflict(['mimic_id']);
    const prisma = {
      user: {
        create: jest
          .fn()
          .mockRejectedValueOnce(collision)
          .mockResolvedValueOnce({ id: 'user-1' }),
      },
    };
    jest
      .spyOn(mimicId, 'generateMimicId')
      .mockReturnValueOnce('MIMIC-2345-6789')
      .mockReturnValueOnce('MIMIC-ABCD-EFGH');
    const service = new UsersService(prisma as never);

    await service.createUser({
      email: 'edward@example.com',
      passwordHash: 'password-hash',
      displayName: 'Edward',
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(2);
    expect(prisma.user.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ mimicId: 'MIMIC-ABCD-EFGH' }),
    });
  });

  it('rethrows the fifth Mimic ID collision after bounded retries', async () => {
    const collision = uniqueConflict(['mimic_id']);
    const prisma = {
      user: {
        create: jest.fn().mockRejectedValue(collision),
      },
    };
    jest.spyOn(mimicId, 'generateMimicId').mockReturnValue('MIMIC-2345-6789');
    const service = new UsersService(prisma as never);

    await expect(
      service.createUser({
        email: 'edward@example.com',
        passwordHash: 'password-hash',
        displayName: 'Edward',
      }),
    ).rejects.toBe(collision);
    expect(prisma.user.create).toHaveBeenCalledTimes(5);
  });

  it('does not retry an email unique conflict', async () => {
    const collision = uniqueConflict(['email']);
    const prisma = {
      user: {
        create: jest.fn().mockRejectedValue(collision),
      },
    };
    jest.spyOn(mimicId, 'generateMimicId').mockReturnValue('MIMIC-2345-6789');
    const service = new UsersService(prisma as never);

    await expect(
      service.createUser({
        email: 'edward@example.com',
        passwordHash: 'password-hash',
        displayName: 'Edward',
      }),
    ).rejects.toBe(collision);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});

function uniqueConflict(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError('unique conflict', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}
