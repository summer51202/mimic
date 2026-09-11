import { assertLocalSeedTarget } from './local-seed-target';

describe('local seed boundary', () => {
  it.each([
    undefined, '', 'not-a-url',
    'postgresql://example.com/mimic_financial_spaces_test',
    'https://localhost/mimic_financial_spaces_test',
    'postgresql://localhost/production',
    'postgresql://localhost/staging',
  ])('rejects an unapproved database target', value => {
    expect(() => assertLocalSeedTarget(value)).toThrow('LOCAL_SEED_DATABASE_REQUIRED');
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('allows an explicit local test database on %s', host => {
    expect(() => assertLocalSeedTarget(`postgresql://mimic_test@${host}:55439/mimic_financial_spaces_test`)).not.toThrow();
  });
});
