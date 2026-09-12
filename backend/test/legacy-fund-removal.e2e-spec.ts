import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('legacy Fund route removal', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => app.close());

  it.each([undefined, 'Bearer retired-bookmark-token'])('returns only generic 404s for retired endpoints (%s)', async authorization => {
    const groupId = '10000000-0000-4000-8000-000000000001';
    const fundId = '10000000-0000-4000-8000-000000000002';
    const privateMarker = 'private-ledger-title';
    const paths = [
      `/api/v1/groups/${groupId}/funds`,
      `/api/v1/funds/${fundId}`,
      `/api/v1/funds/${fundId}/summary`,
      `/api/v1/funds/${fundId}/contributions`,
      `/api/v1/funds/${fundId}/expenses`,
      `/api/v1/funds/${fundId}/settlements`,
    ];
    for (const path of paths) {
      const call = request(app.getHttpServer()).get(path);
      if (authorization) call.set('Authorization', authorization);
      const response = await call.query({ title: privateMarker }).expect(404);
      expect(JSON.stringify(response.body)).not.toContain(privateMarker);
      expect(response.body).not.toHaveProperty('data');
    }
  });
});
