import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RequestValidationPipe } from '../src/common/pipes/request-validation.pipe';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AVATAR_CLASSES } from '../src/modules/users/avatar-class';
import { assertMigrationOnlyTestDatabase } from './helpers/migration-only-db';

// Phase Avatar: the columns and CHECK constraint must exist on a database built only by
// `prisma migrate deploy`, exactly like Railway staging and production.
assertMigrationOnlyTestDatabase(process.env.DATABASE_URL);

describe('avatar class on a migrate-deploy-only database', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const users: Record<'owner' | 'member', { id: string; token: string }> = {} as never;
  let groupId: string;
  const secrets = [process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET];
  const call = (method: 'get' | 'post' | 'patch', path: string, actor: 'owner' | 'member') =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${users[actor].token}`);
  const stored = (actor: 'owner' | 'member') => prisma.user.findUniqueOrThrow({
    where: { id: users[actor].id }, select: { avatarClass: true, avatarPromptDismissedAt: true },
  });

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'phase-avatar-local-access-only';
    process.env.JWT_REFRESH_SECRET = 'phase-avatar-local-refresh-only';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new RequestValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);
    for (const actor of ['owner', 'member'] as const) {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: `${randomUUID()}@phase-avatar.test`, password: 'Test-phase-avatar-123!', display_name: `Avatar ${actor}`,
      }).expect(201);
      users[actor] = { id: response.body.data.user.id, token: response.body.data.access_token };
    }
    const group = await call('post', '/groups', 'owner')
      .send({ name: 'Avatar roster', group_type: 'group', default_currency: 'TWD' }).expect(201);
    groupId = group.body.data.id;
    const invite = await call('post', `/groups/${groupId}/invites`, 'owner').send({}).expect(201);
    await call('post', '/group-invites/accept', 'member').send({ invite_code: invite.body.data.invite_code }).expect(201);
  });

  afterAll(async () => {
    if (prisma) {
      const ids = Object.values(users).map(user => user.id);
      if (groupId) {
        await prisma.auditLog.deleteMany({ where: { groupId } });
        await prisma.groupInvite.deleteMany({ where: { groupId } });
        await prisma.groupMember.deleteMany({ where: { groupId } });
        await prisma.group.deleteMany({ where: { id: groupId } });
      }
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
    for (const [i, key] of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].entries()) {
      if (secrets[i] === undefined) delete process.env[key]; else process.env[key] = secrets[i];
    }
  });

  it('starts new users with no class and an undismissed prompt', async () => {
    const me = await call('get', '/me', 'owner').expect(200);
    expect(me.body.data).toMatchObject({ avatar_class: null, avatar_prompt_dismissed: false });
    expect(await stored('owner')).toEqual({ avatarClass: null, avatarPromptDismissedAt: null });
  });

  it('rejects invalid writes without touching the row', async () => {
    for (const body of [
      { avatar_class: 'knight' }, { avatar_class: null }, { avatar_prompt_dismissed: false },
      { avatar_class: 'bard', avatar_prompt_dismissed: false },
    ]) {
      await call('patch', '/me', 'owner').send(body).expect(400);
    }
    expect(await stored('owner')).toEqual({ avatarClass: null, avatarPromptDismissedAt: null });
  });

  it('enforces the eight classes in the database itself', async () => {
    await expect(prisma.$executeRaw`UPDATE "User" SET "avatar_class" = 'knight' WHERE "id" = ${users.owner.id}::uuid`)
      .rejects.toThrow(/User_avatar_class_check/);
    for (const avatarClass of AVATAR_CLASSES) {
      await prisma.$executeRaw`UPDATE "User" SET "avatar_class" = ${avatarClass} WHERE "id" = ${users.owner.id}::uuid`;
    }
    await prisma.$executeRaw`UPDATE "User" SET "avatar_class" = NULL WHERE "id" = ${users.owner.id}::uuid`;
  });

  it('remembers a dismissed prompt across requests and keeps the class unset', async () => {
    const patched = await call('patch', '/me', 'member').send({ avatar_prompt_dismissed: true }).expect(200);
    expect(patched.body.data).toMatchObject({ avatar_class: null, avatar_prompt_dismissed: true });
    const me = await call('get', '/me', 'member').expect(200);
    expect(me.body.data).toMatchObject({ avatar_class: null, avatar_prompt_dismissed: true });
    expect((await stored('member')).avatarPromptDismissedAt).toBeInstanceOf(Date);
  });

  it('changes the class any number of times and leaves other profile fields alone', async () => {
    const before = (await call('get', '/me', 'owner').expect(200)).body.data;
    for (const avatarClass of ['warrior', 'physician', 'bard'] as const) {
      const patched = await call('patch', '/me', 'owner').send({ avatar_class: avatarClass }).expect(200);
      expect(patched.body.data).toEqual({ ...before, avatar_class: avatarClass });
    }
    expect(await stored('owner')).toEqual({ avatarClass: 'bard', avatarPromptDismissedAt: null });
  });

  it('lists each member with their own class or null', async () => {
    const members = await call('get', `/groups/${groupId}/members`, 'member').expect(200);
    expect(members.body.data.map((member: { user_id: string; avatar_class: string | null }) =>
      [member.user_id, member.avatar_class])).toEqual([[users.owner.id, 'bard'], [users.member.id, null]]);
  });
});
