import { requireSharedParticipantLimit } from './shared-participant-limit';
describe('shared participant limit', () => {
  it('permits sixteen current participants', () => expect(() => requireSharedParticipantLimit('SHARED_EXPENSES', 16)).not.toThrow());
  it('rejects seventeen current participants', () => expect(() => requireSharedParticipantLimit('SHARED_EXPENSES', 17)).toThrow('SHARED_PARTICIPANT_LIMIT'));
  it('does not constrain pooled participants', () => expect(() => requireSharedParticipantLimit('POOLED_FUND', 17)).not.toThrow());
});
