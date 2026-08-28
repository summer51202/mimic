import { getRequiredJwtSecret } from './jwt-secrets';

describe('getRequiredJwtSecret', () => {
  const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    if (originalAccessSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = originalAccessSecret;
    }

    if (originalRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    }
  });

  it.each([
    ['JWT_ACCESS_SECRET', 'access-secret'],
    ['JWT_REFRESH_SECRET', 'refresh-secret'],
  ] as const)('returns the configured %s value', (name, value) => {
    process.env[name] = value;

    expect(getRequiredJwtSecret(name)).toBe(value);
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
  ] as const)('rejects a %s JWT access secret', (_case, value) => {
    if (value === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = value;
    }

    expect(() => getRequiredJwtSecret('JWT_ACCESS_SECRET')).toThrow(
      'JWT_ACCESS_SECRET must be set to a non-empty value',
    );
  });
});
