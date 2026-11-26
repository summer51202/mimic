import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.service';

const JWT_SECRET =
  'mimic-users-e2e-secret-7f58c9a2d10e4b63a91c5f8472de603b';

describe('Current user profile', () => {
  let app: INestApplication;
  let token: string;
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const usersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    token = moduleRef.get(JwtService).sign(
      { sub: 'user-1', email: 'edward@example.com' },
      { secret: JWT_SECRET },
    );
  });

  beforeEach(() => jest.resetAllMocks());

  afterAll(async () => {
    if (app) await app.close();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  it('returns the current user profile in the response envelope', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      mimicId: 'MIMIC-2345-6789',
      email: 'edward@example.com',
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          id: 'user-1',
          mimic_id: 'MIMIC-2345-6789',
          email: 'edward@example.com',
          display_name: 'Edward',
          locale: 'zh-TW',
          timezone: 'Asia/Taipei',
          avatar_class: null,
          avatar_prompt_dismissed: false,
        },
      });
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('updates the current profile through PATCH /me', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
      mimicId: 'MIMIC-2345-6789',
      email: 'edward@example.com',
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        display_name: 'Edward Lee',
        mimic_id: 'MIMIC-ZZZZ-ZZZZ',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      })
      .expect(200)
      .expect({
        data: {
          id: 'user-1',
          mimic_id: 'MIMIC-2345-6789',
          email: 'edward@example.com',
          display_name: 'Edward Lee',
          locale: 'zh-TW',
          timezone: 'Asia/Taipei',
          avatar_class: null,
          avatar_prompt_dismissed: false,
        },
      });
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
      avatarClass: undefined,
      avatarPromptDismissed: undefined,
    });
  });

  it('keeps POST /me as a compatibility alias', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
      mimicId: 'MIMIC-2345-6789',
      email: 'edward@example.com',
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });

    await request(app.getHttpServer())
      .post('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        display_name: 'Edward Lee',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      })
      .expect(201)
      .expect({
        data: {
          id: 'user-1',
          mimic_id: 'MIMIC-2345-6789',
          email: 'edward@example.com',
          display_name: 'Edward Lee',
          locale: 'zh-TW',
          timezone: 'Asia/Taipei',
          avatar_class: null,
          avatar_prompt_dismissed: false,
        },
      });
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
      avatarClass: undefined,
      avatarPromptDismissed: undefined,
    });
  });

  const profile = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    mimicId: 'MIMIC-2345-6789',
    email: 'edward@example.com',
    displayName: 'Edward',
    locale: 'zh-TW',
    timezone: 'Asia/Taipei',
    avatarClass: null,
    avatarPromptDismissedAt: null,
    ...overrides,
  });

  it('returns the chosen class and whether the first-time prompt was dismissed', async () => {
    usersService.findById.mockResolvedValue(
      profile({ avatarClass: 'bard', avatarPromptDismissedAt: new Date('2026-11-25T00:00:00Z') }),
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.data).toMatchObject({ avatar_class: 'bard', avatar_prompt_dismissed: true });
  });

  it.each(['warrior', 'mage', 'ranger', 'rogue', 'alchemist', 'bard', 'cartographer', 'physician'])(
    'accepts the %s class through PATCH /me',
    async (avatarClass) => {
      usersService.updateProfile.mockResolvedValue(profile({ avatarClass }));

      const response = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar_class: avatarClass })
        .expect(200);
      expect(response.body.data).toMatchObject({ avatar_class: avatarClass, avatar_prompt_dismissed: false });
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
        displayName: undefined,
        locale: undefined,
        timezone: undefined,
        avatarClass,
        avatarPromptDismissed: undefined,
      });
    },
  );

  it('records the dismissed prompt only when true is sent', async () => {
    usersService.updateProfile.mockResolvedValue(profile({ avatarPromptDismissedAt: new Date() }));

    const response = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar_prompt_dismissed: true })
      .expect(200);
    expect(response.body.data).toMatchObject({ avatar_class: null, avatar_prompt_dismissed: true });
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', expect.objectContaining({
      avatarClass: undefined,
      avatarPromptDismissed: true,
    }));
  });

  it.each([
    ['an unknown class', { avatar_class: 'knight' }],
    ['a capitalised class', { avatar_class: 'Warrior' }],
    ['clearing the class', { avatar_class: null }],
    ['a non-string class', { avatar_class: 1 }],
    ['re-arming the prompt', { avatar_prompt_dismissed: false }],
    ['a null dismissal', { avatar_prompt_dismissed: null }],
    ['a string dismissal', { avatar_prompt_dismissed: 'true' }],
  ])('rejects %s with 400 and writes nothing', async (_label, body) => {
    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(400);
    expect(usersService.updateProfile).not.toHaveBeenCalled();
  });
});
