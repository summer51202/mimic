import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { RequestValidationPipe } from '../../src/common/pipes/request-validation.pipe';
import { seedTaxonomy } from '../../prisma/seed-taxonomy';
import { assertSpacesTestDatabase } from './financial-spaces-db';

export async function createSpaceTestApp() {
  assertSpacesTestDatabase(process.env.DATABASE_URL);
  const secrets = [process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET];
  process.env.JWT_ACCESS_SECRET = 'phase2-local-access-only';
  process.env.JWT_REFRESH_SECRET = 'phase2-local-refresh-only';
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new RequestValidationPipe());
  await app.init();
  const prisma = app.get(PrismaService);
  await seedTaxonomy(prisma);
  const users: Array<{ id: string; token: string }> = [];
  for (const display_name of ['Owner', 'Member', 'Group governor']) {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register')
      .send({ email: `${randomUUID()}@phase2.test`, password: 'Test-phase2-123!', display_name }).expect(201);
    users.push({ id: response.body.data.user.id, token: response.body.data.access_token });
  }
  const group = await prisma.group.create({ data: {
    name: 'P2 fixture', groupType: 'GROUP', defaultCurrency: 'TWD', createdById: users[2].id,
    members: { create: users.map((user, i) => ({ userId: user.id, role: i === 2 ? 'OWNER' : 'MEMBER' })) },
  } });
  const call = (method: 'get' | 'post' | 'patch', path: string, actor = 0) =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${users[actor].token}`);
  const close = async () => {
    const ids = users.map(user => user.id);
    const spaceWhere = { createdById: { in: ids } };
    await prisma.pooledOperationReceipt.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledTransitionPosting.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledCorrection.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledReturn.deleteMany({ where: { plan: { space: spaceWhere } } });
    await prisma.pooledReturnPlan.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledReimbursement.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledContribution.deleteMany({ where: { space: spaceWhere } });
    await prisma.pooledContributionOccurrence.deleteMany({ where: { commitment: { space: spaceWhere } } });
    await prisma.pooledCommitmentAssignment.deleteMany({ where: { commitment: { space: spaceWhere } } });
    await prisma.pooledCommitment.deleteMany({ where: { space: spaceWhere } });
    await prisma.personalReferenceReceipt.deleteMany({ where: { space: spaceWhere } });
    await prisma.personalExpenseReferenceTag.deleteMany({ where: { reference: { personalSpace: spaceWhere } } });
    await prisma.personalExpenseReference.deleteMany({ where: { personalSpace: spaceWhere } });
    await prisma.sharedOperationReceipt.deleteMany({ where: { space: spaceWhere } });
    await prisma.sharedCorrection.deleteMany({ where: { space: spaceWhere } });
    await prisma.sharedSettlementBatch.deleteMany({ where: { space: spaceWhere } });
    await prisma.expenseRecordTag.deleteMany({ where: { expense: { space: spaceWhere } } });
    await prisma.expenseMutationReceipt.deleteMany({ where: { space: spaceWhere } });
    await prisma.expenseRecord.deleteMany({ where: { space: spaceWhere } });
    await prisma.spaceAuditEvent.deleteMany({ where: { space: spaceWhere } });
    await prisma.spaceParticipant.deleteMany({ where: { space: spaceWhere } });
    await prisma.financialSpace.deleteMany({ where: spaceWhere });
    await prisma.taxonomyAuditEvent.deleteMany({ where: { actorUserId: { in: ids } } });
    await prisma.taxonomyTerm.updateMany({ where: { createdById: { in: ids } }, data: { status: 'ARCHIVED', mergedIntoId: null } });
    await prisma.taxonomyTerm.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { groupId: group.id } });
    await prisma.groupMember.deleteMany({ where: { groupId: group.id } });
    await prisma.group.delete({ where: { id: group.id } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    for (const [i, key] of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].entries()) {
      if (secrets[i] === undefined) delete process.env[key]; else process.env[key] = secrets[i];
    }
  };
  return { app, prisma, users, groupId: group.id, call, close };
}
