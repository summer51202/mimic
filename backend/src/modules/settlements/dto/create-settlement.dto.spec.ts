import { validate } from 'class-validator';
import { CreateSettlementDto } from './create-settlement.dto';

const createDto = (periods: Partial<Pick<CreateSettlementDto, 'period_start' | 'period_end'>>) =>
  Object.assign(new CreateSettlementDto(), {
    from_user_id: 'user-a',
    to_user_id: 'user-b',
    amount_minor: 100,
    ...periods,
  });

describe('CreateSettlementDto', () => {
  it('accepts exact real YYYY-MM-DD calendar dates', async () => {
    const errors = await validate(
      createDto({ period_start: '2026-04-30', period_end: '2026-04-30' }),
    );

    expect(errors).toHaveLength(0);
  });

  it.each([
    [{ period_start: '2026-04-30T00:00:00Z' }, 'period_start'],
    [{ period_end: '2026-04-30T00:00:00Z' }, 'period_end'],
    [{ period_start: '2026-02-30' }, 'period_start'],
    [{ period_end: '2026-02-30' }, 'period_end'],
  ])('rejects invalid settlement boundary %o', async (periods, property) => {
    const errors = await validate(createDto(periods));

    expect(errors.map((error) => error.property)).toContain(property);
  });
});
