import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GroupsService } from '../src/modules/groups/groups.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const TEST_JWT_ACCESS_SECRET =
  'mimic-e2e-only-secret-7f58c9a2d10e4b63a91c5f8472de603b';

describe('Group invites', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ownerToken: string;
  let memberToken: string;
  const originalJwtAccessSecret = process.env.JWT_ACCESS_SECRET;

  const groupsService = {
    createGroup: jest.fn(),
    listGroups: jest.fn(),
    listMembers: jest.fn(),
    createInvite: jest.fn(),
    acceptInvite: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = TEST_JWT_ACCESS_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GroupsService)
      .useValue(groupsService)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    jwtService = moduleRef.get(JwtService);
    ownerToken = jwtService.sign(
      { sub: 'owner-1', email: 'owner@example.com' },
      { secret: TEST_JWT_ACCESS_SECRET },
    );
    memberToken = jwtService.sign(
      { sub: 'member-1', email: 'member@example.com' },
      { secret: TEST_JWT_ACCESS_SECRET },
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
    } finally {
      if (originalJwtAccessSecret === undefined) {
        delete process.env.JWT_ACCESS_SECRET;
      } else {
        process.env.JWT_ACCESS_SECRET = originalJwtAccessSecret;
      }
    }
  });

  it('creates an invite and maps the exact response', async () => {
    groupsService.createInvite.mockResolvedValue({
      id: 'invite-1',
      inviteCode: 'PAIR-ABC',
      invitedEmail: 'partner@example.com',
      expiresAt: new Date('2026-07-23T12:00:00.000Z'),
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/invites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ invited_email: ' Partner@Example.com ' })
      .expect(201)
      .expect({
        data: {
          invite_id: 'invite-1',
          invite_code: 'PAIR-ABC',
          invited_email: 'partner@example.com',
          expires_at: '2026-07-23T12:00:00.000Z',
          status: 'pending',
        },
      });

    expect(groupsService.createInvite).toHaveBeenCalledWith(
      'group-1',
      'owner-1',
      { invited_email: 'partner@example.com' },
    );
  });

  it('accepts an invite and maps the exact response', async () => {
    groupsService.acceptInvite.mockResolvedValue({
      group: { id: 'group-1', name: 'Shared Home' },
      membership: {
        role: 'MEMBER',
        joinedAt: new Date('2026-07-16T12:00:00.000Z'),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/group-invites/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ invite_code: '  PAIR-ABC  ' })
      .expect(201)
      .expect({
        data: {
          group_id: 'group-1',
          group_name: 'Shared Home',
          role: 'member',
          joined_at: '2026-07-16T12:00:00.000Z',
        },
      });

    expect(groupsService.acceptInvite).toHaveBeenCalledWith(
      'member-1',
      'PAIR-ABC',
    );
  });

  it.each([
    ['/api/v1/groups/group-1/invites', { invited_email: 'a@example.com' }],
    ['/api/v1/group-invites/accept', { invite_code: 'PAIR-ABC' }],
  ])('rejects unauthenticated POST %s', async (path, body) => {
    await request(app.getHttpServer()).post(path).send(body).expect(401);
  });

  it('rejects an invalid invited email without calling the service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/invites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ invited_email: 'not-an-email' })
      .expect(400);

    expect(groupsService.createInvite).not.toHaveBeenCalled();
  });

  it('rejects a blank invite code without calling the service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/group-invites/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ invite_code: '   ' })
      .expect(400);

    expect(groupsService.acceptInvite).not.toHaveBeenCalled();
  });

  it('creates an invite when invited_email is omitted', async () => {
    groupsService.createInvite.mockResolvedValue({
      id: 'invite-2',
      inviteCode: 'PAIR-OPEN',
      invitedEmail: null,
      expiresAt: new Date('2026-07-24T12:00:00.000Z'),
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/invites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(201);

    expect(groupsService.createInvite).toHaveBeenCalledWith(
      'group-1',
      'owner-1',
      {},
    );
  });
});
