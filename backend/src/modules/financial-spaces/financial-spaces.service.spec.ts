import { FinancialSpacesService } from './financial-spaces.service';
import { PrismaService } from '../prisma/prisma.service';

describe('space local calendar boundaries', () => {
  const spaces = new FinancialSpacesService(new PrismaService());
  afterEach(() => jest.useRealTimers());
  it.each([
    ['2028-02-28T15:59:59Z', 'Asia/Taipei', '2028-02-28'],
    ['2028-02-28T16:00:00Z', 'Asia/Taipei', '2028-02-29'],
    ['2028-02-29T16:00:00Z', 'Asia/Taipei', '2028-03-01'],
    ['2026-09-11T00:00:00Z', 'America/Los_Angeles', '2026-09-10'],
  ])('uses calendar date at %s in %s', (now, timezone, expected) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    expect(spaces.today(timezone).toISOString()).toBe(`${expected}T00:00:00.000Z`);
  });
  it('rejects an invalid inherited profile timezone', () => {
    expect(() => spaces.today('Invalid/Profile')).toThrow('SPACE_INPUT_INVALID');
  });
});
