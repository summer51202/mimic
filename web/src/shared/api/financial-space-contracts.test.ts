import { describe, expect, it } from 'vitest';
import { financialSpaceSchema } from './financial-space-contracts';

const governance = {
  access: 'GOVERNANCE', id: '00000000-0000-4000-8000-000000000001',
  name: 'Travel', mode: 'SHARED_EXPENSES', status: 'ACTIVE',
};
const participant = {
  ...governance, access: 'PARTICIPANT', currency: 'TWD', timezone: 'Asia/Taipei',
  opened_on: '2026-09-11', group_id: '00000000-0000-4000-8000-000000000002',
  owner_user_id: null, role: 'MANAGER', version: 1, first_formal_record_at: null,
};

describe('financial space contracts', () => {
  it('parses minimal governance and full participant metadata', () => {
    expect(financialSpaceSchema.parse(governance)).toEqual(governance);
    expect(financialSpaceSchema.parse(participant)).toEqual(participant);
  });
  it.each(['balance_minor', 'participants', 'currency', 'note'])('rejects governance leakage: %s', key => {
    expect(financialSpaceSchema.safeParse({ ...governance, [key]: 'private' }).success).toBe(false);
  });
  it('rejects personal governance visibility', () => {
    expect(financialSpaceSchema.safeParse({ ...governance, mode: 'PERSONAL_EXPENSES' }).success).toBe(false);
  });
  it('requires private owner scope for personal spaces', () => {
    expect(financialSpaceSchema.safeParse({ ...participant, mode: 'PERSONAL_EXPENSES' }).success).toBe(false);
    expect(financialSpaceSchema.safeParse({ ...participant, mode: 'PERSONAL_EXPENSES',
      group_id: null, owner_user_id: participant.group_id }).success).toBe(true);
  });
  it.each([
    { group_id: null }, { owner_user_id: participant.group_id }, { role: 'OWNER' },
    { mode: 'fund' }, { opened_on: '2026-02-30' }, { version: 1.5 }, { version: 0 },
    { version: Number.MAX_SAFE_INTEGER + 1 }, { first_formal_record_at: 'yesterday' },
    { balance_minor: '1000' },
  ])('rejects inconsistent participant fields %j', value => {
    expect(financialSpaceSchema.safeParse({ ...participant, ...value }).success).toBe(false);
  });
  it('rejects legacy Fund contracts', () => {
    expect(financialSpaceSchema.safeParse({ id: governance.id, name: 'Fund', status: 'active', currency: 'TWD', balance_minor: '0' }).success).toBe(false);
  });
});
