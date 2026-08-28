import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureCors } from '../src/configure-cors';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('App bootstrap', () => {
  let app: INestApplication;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalBackendRevision = process.env.MIMIC_BACKEND_REVISION;
  const originalExpectedMigration = process.env.MIMIC_EXPECTED_MIGRATION;
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    process.env.CORS_ORIGIN = 'http://localhost:8080';
    delete process.env.MIMIC_EXPECTED_MIGRATION;
    configureCors(app);
    app.setGlobalPrefix('api/v1');
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

    if (originalBackendRevision === undefined) {
      delete process.env.MIMIC_BACKEND_REVISION;
    } else {
      process.env.MIMIC_BACKEND_REVISION = originalBackendRevision;
    }

    if (originalExpectedMigration === undefined) {
      delete process.env.MIMIC_EXPECTED_MIGRATION;
    } else {
      process.env.MIMIC_EXPECTED_MIGRATION = originalExpectedMigration;
    }
  });

  it('omits backend revision from health when it is unset', async () => {
    delete process.env.MIMIC_BACKEND_REVISION;
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({
      data: { ok: true },
    });
  });

  it('exposes the backend process revision on health when it is a git SHA', async () => {
    process.env.MIMIC_BACKEND_REVISION =
      'd329f3cecada42155424a7ec8a5de23336d39111';

    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({
      data: {
        ok: true,
        revision: 'd329f3cecada42155424a7ec8a5de23336d39111',
      },
    });
  });

  it('does not reflect secret-like revision values on health', async () => {
    process.env.MIMIC_BACKEND_REVISION = 'token=do-not-expose';

    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({
      data: { ok: true },
    });
  });

  it('exposes liveness with a valid backend revision', async () => {
    process.env.MIMIC_BACKEND_REVISION = 'd329f3cecada42155424a7ec8a5de23336d39111';

    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200).expect({
      data: {
        ok: true,
        revision: 'd329f3cecada42155424a7ec8a5de23336d39111',
      },
    });
  });

  it('omits invalid backend revisions from liveness', async () => {
    process.env.MIMIC_BACKEND_REVISION = 'token=do-not-expose';

    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200).expect({
      data: { ok: true },
    });
  });

  it('reports readiness when the database probe succeeds', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ ok: 1 }]);

    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200).expect({
      data: { ok: true },
    });
  });

  it('returns the default 503 error envelope when the database probe fails', async () => {
    prisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('database password'));

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      message: 'SERVICE_NOT_READY',
      statusCode: 503,
    });
    expect(JSON.stringify(response.body)).not.toContain('database password');
  });

  it('allows PWA development preflight requests', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:8080',
    );
  });
});
