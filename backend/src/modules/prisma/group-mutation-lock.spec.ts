import { Prisma } from '@prisma/client';

import { lockGroupMutation } from './group-mutation-lock';

describe('lockGroupMutation', () => {
  it('executes one parameterized transaction advisory lock for the exact group ID', async () => {
    const groupId = 'group-id-with-exact-value';
    const executeRaw = jest.fn().mockResolvedValue(1);
    const tx = {
      $executeRaw: executeRaw,
    } as unknown as Prisma.TransactionClient;

    await lockGroupMutation(tx, groupId);

    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [query] = executeRaw.mock.calls[0] as [Prisma.Sql];
    expect(query.sql).toContain('pg_advisory_xact_lock');
    expect(query.sql).toContain('?');
    expect(query.values).toEqual([groupId]);
  });
});
