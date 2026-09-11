import { IsString } from 'class-validator';
import { RequestValidationPipe } from '../../../common/pipes/request-validation.pipe';
import { CreateSpaceDto } from './create-space.dto';
import { UpdateSpaceDto } from './update-space.dto';
import { AddParticipantDto } from './add-participant.dto';
import { UpdateParticipantRoleDto } from './update-participant-role.dto';

const valid = { name: '  Travel  ', mode: 'SHARED_EXPENSES', currency: 'TWD' };
const pipe = new RequestValidationPipe();
describe('strict financial space requests', () => {
  it('trims name and preserves explicit mode', async () => {
    await expect(pipe.transform(valid, { type: 'body', metatype: CreateSpaceDto }))
      .resolves.toMatchObject({ name: 'Travel', mode: 'SHARED_EXPENSES' });
  });
  it.each([
    { name: '' }, { name: ' '.repeat(3) }, { name: 'a'.repeat(101) },
    { name: null }, { mode: 'fund' }, { mode: null },
    { currency: 'ZZZ' }, { currency: 'twd' }, { currency: null },
    { timezone: 'Not/A_Timezone' }, { timezone: null },
    { payers: [] }, { owner_user_id: 'actor' }, { actor_user_id: 'actor' },
    { balance_minor: '0' }, { allocations: [] }, { opened_on: '2026-09-01' },
  ])('rejects invalid or foreign fields %j', async (overrides) => {
    await expect(pipe.transform({ ...valid, ...overrides }, { type: 'body', metatype: CreateSpaceDto }))
      .rejects.toThrow('SPACE_INPUT_INVALID');
  });
  it.each([undefined, null, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid version %s', async (version) => {
      await expect(pipe.transform({ version, name: 'Changed' }, { type: 'body', metatype: UpdateSpaceDto }))
        .rejects.toThrow('SPACE_INPUT_INVALID');
    },
  );
  it('rejects non-UUID participant IDs', async () => {
    await expect(pipe.transform({ version: 1, user_id: 'user-1' }, { type: 'body', metatype: AddParticipantDto }))
      .rejects.toThrow('SPACE_INPUT_INVALID');
  });
  it('retains whitelist stripping for legacy DTOs', async () => {
    class LegacyRequest { @IsString() name: string; }
    await expect(pipe.transform({ name: 'Legacy', extra: true }, { type: 'body', metatype: LegacyRequest }))
      .resolves.toEqual({ name: 'Legacy' });
  });
  it.each(['Etc/UTC', 'Asia/Kolkata'])('accepts valid IANA timezone %s', async timezone => {
    await expect(pipe.transform({ ...valid, timezone }, { type: 'body', metatype: CreateSpaceDto }))
      .resolves.toMatchObject({ timezone });
  });
  it.each(['OWNER', 'manager', null])('rejects invalid space role %s', async role => {
    await expect(pipe.transform({ version: 1, role }, { type: 'body', metatype: UpdateParticipantRoleDto }))
      .rejects.toThrow('SPACE_INPUT_INVALID');
  });
});
