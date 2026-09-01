import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const user = {
  id: 'user-1',
  mimicId: 'MIMIC-2345-6789',
  email: 'edward@example.com',
  passwordHash: 'password-hash',
  displayName: 'Edward',
  locale: 'zh-TW',
  timezone: 'Asia/Taipei',
};

describe('AuthService public identity responses', () => {
  const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreEnv('JWT_ACCESS_SECRET', originalAccessSecret);
    restoreEnv('JWT_REFRESH_SECRET', originalRefreshSecret);
  });

  it('includes Mimic ID after registration while signing the internal ID', async () => {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue(user),
    };
    const jwtService = jwtMock();
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('password-hash' as never);
    const service = new AuthService(usersService as never, jwtService as never);

    const result = await service.register({
      email: user.email,
      password: 'password',
      displayName: user.displayName,
    });

    expect(result.user.mimic_id).toBe(user.mimicId);
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: user.id, email: user.email },
      expect.any(Object),
    );
  });

  it('includes Mimic ID after login', async () => {
    const usersService = { findByEmail: jest.fn().mockResolvedValue(user) };
    const jwtService = jwtMock();
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    const service = new AuthService(usersService as never, jwtService as never);

    const result = await service.login(user.email, 'password');

    expect(result.user.mimic_id).toBe(user.mimicId);
  });

  it('includes Mimic ID after refresh', async () => {
    const usersService = { findById: jest.fn().mockResolvedValue(user) };
    const jwtService = jwtMock();
    jwtService.verify.mockReturnValue({ sub: user.id, email: user.email });
    const service = new AuthService(usersService as never, jwtService as never);

    const result = await service.refresh('refresh-token');

    expect(result.user.mimic_id).toBe(user.mimicId);
    expect(usersService.findById).toHaveBeenCalledWith(user.id);
  });
});

function jwtMock() {
  return {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
