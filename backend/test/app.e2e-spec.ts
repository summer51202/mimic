import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureCors } from '../src/configure-cors';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('App bootstrap', () => {
  let app: INestApplication;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    process.env.CORS_ORIGIN = 'http://localhost:8080';
    configureCors(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  it('responds on health route', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({
      data: { ok: true },
    });
  });

  it('allows Flutter Web development preflight requests', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:8080',
    );
  });
});
