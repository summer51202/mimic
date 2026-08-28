import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GroupsService } from '../src/modules/groups/groups.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const JWT_SECRET =
  'mimic-groups-e2e-secret-7f58c9a2d10e4b63a91c5f8472de603b';

describe('Group detail and management', () => {
  let app: INestApplication;
  let token: string;
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const groupsService = {
    createGroup: jest.fn(),
    listGroups: jest.fn(),
    getGroupDetail: jest.fn(),
    listMembers: jest.fn(),
    updateGroup: jest.fn(),
    createInvite: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    leaveGroup: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GroupsService)
      .useValue(groupsService)
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
      { sub: 'user-1', email: 'user@example.com' },
      { secret: JWT_SECRET },
    );
  });

  beforeEach(() => jest.resetAllMocks());

  afterAll(async () => {
    if (app) await app.close();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  it('returns group detail with the requester role', async () => {
    groupsService.getGroupDetail.mockResolvedValue({
      group: {
        id: 'group-1',
        name: 'Our Home',
        groupType: 'COUPLE',
        defaultCurrency: 'TWD',
        status: 'ACTIVE',
      },
      role: 'OWNER',
    });

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          id: 'group-1',
          name: 'Our Home',
          group_type: 'couple',
          default_currency: 'TWD',
          status: 'active',
          role: 'owner',
          current_user_id: 'user-1',
        },
      });
    expect(groupsService.getGroupDetail).toHaveBeenCalledWith(
      'group-1',
      'user-1',
    );
  });

  it('passes requester identity when listing members', async () => {
    groupsService.listMembers.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1/members')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ data: [] });
    expect(groupsService.listMembers).toHaveBeenCalledWith(
      'group-1',
      'user-1',
    );
  });

  it('trims and forwards an owner rename', async () => {
    groupsService.updateGroup.mockResolvedValue({
      id: 'group-1',
      name: 'Renamed Home',
      groupType: 'COUPLE',
      defaultCurrency: 'TWD',
      status: 'ACTIVE',
    });
    await request(app.getHttpServer())
      .patch('/api/v1/groups/group-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  Renamed Home  ', ignored: 'value' })
      .expect(200);
    expect(groupsService.updateGroup).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      { name: 'Renamed Home' },
    );
  });

  it('rejects a blank rename before calling the service', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/groups/group-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' })
      .expect(400);
    expect(groupsService.updateGroup).not.toHaveBeenCalled();
  });

  it('updates a member role with an exact snake_case response', async () => {
    groupsService.updateMemberRole.mockResolvedValue({
      userId: 'user-2',
      user: { displayName: 'Partner' },
      role: 'OWNER',
      status: 'ACTIVE',
    });

    await request(app.getHttpServer())
      .patch('/api/v1/groups/group-1/members/user-2')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: ' OWNER ' })
      .expect(200)
      .expect({
        data: {
          user_id: 'user-2',
          display_name: 'Partner',
          role: 'owner',
          status: 'active',
        },
      });
    expect(groupsService.updateMemberRole).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      'user-2',
      { role: 'owner' },
    );
  });

  it('rejects an invalid member role before calling the service', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/groups/group-1/members/user-2')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' })
      .expect(400);
    expect(groupsService.updateMemberRole).not.toHaveBeenCalled();
  });

  it('removes a member with an exact snake_case response', async () => {
    groupsService.removeMember.mockResolvedValue({
      userId: 'user-2',
      status: 'REMOVED',
    });
    await request(app.getHttpServer())
      .delete('/api/v1/groups/group-1/members/user-2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ data: { user_id: 'user-2', status: 'removed' } });
    expect(groupsService.removeMember).toHaveBeenCalledWith(
      'group-1',
      'user-1',
      'user-2',
    );
  });

  it('leaves a group with an exact snake_case response', async () => {
    groupsService.leaveGroup.mockResolvedValue({
      groupId: 'group-1',
      status: 'LEFT',
    });
    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/leave')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect({ data: { group_id: 'group-1', status: 'left' } });
    expect(groupsService.leaveGroup).toHaveBeenCalledWith(
      'group-1',
      'user-1',
    );
  });

  it.each([
    ['get', '/api/v1/groups/group-1'],
    ['get', '/api/v1/groups/group-1/members'],
    ['patch', '/api/v1/groups/group-1'],
    ['patch', '/api/v1/groups/group-1/members/user-2'],
    ['delete', '/api/v1/groups/group-1/members/user-2'],
    ['post', '/api/v1/groups/group-1/leave'],
  ])('rejects unauthenticated %s %s', async (method, path) => {
    await request(app.getHttpServer())[
      method as 'get' | 'patch' | 'delete' | 'post'
    ](path).expect(401);
  });
});
