import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.service';

const JWT_SECRET =
  'pairfund-users-e2e-secret-7f58c9a2d10e4b63a91c5f8472de603b';

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
          email: 'edward@example.com',
          display_name: 'Edward',
          locale: 'zh-TW',
          timezone: 'Asia/Taipei',
        },
      });
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('updates the current profile through PATCH /me', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
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
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      })
      .expect(200)
      .expect({
        data: {
          id: 'user-1',
          email: 'edward@example.com',
          display_name: 'Edward Lee',
          locale: 'zh-TW',
          timezone: 'Asia/Taipei',
        },
      });
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
  });

  it('keeps POST /me as a compatibility alias', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
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
      .expect(201);
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
  });
});
