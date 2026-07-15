# PairFund Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working NestJS + Prisma backend MVP for PairFund using the locked-settlement accounting model defined in v0.2.

**Architecture:** Start from a clean NestJS service with Prisma and PostgreSQL, then implement core domains in this order: auth and membership, funds and categories, transactions, settlements and lock enforcement, and finally read APIs for summary and audit. Keep settlement lock checks centralized in a shared domain service so every write path enforces the same rule.

**Tech Stack:** NestJS, Prisma, PostgreSQL, JWT, class-validator, Swagger/OpenAPI, Jest, Supertest

---

### Task 1: Bootstrap Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing bootstrap test**

```ts
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('App bootstrap', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds on health route', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({
      data: { ok: true },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- test/app.e2e-spec.ts`
Expected: FAIL because `/health` route and app bootstrap do not exist yet.

- [ ] **Step 3: Write minimal bootstrap implementation**

```ts
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

```ts
// backend/src/app.module.ts
import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class HealthController {
  @Get('health')
  getHealth() {
    return { data: { ok: true } };
  }
}

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Copy v0.2 Prisma draft into backend**

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Copy the current project root prisma/schema.prisma content here.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:e2e -- test/app.e2e-spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/nest-cli.json backend/.env.example backend/src/main.ts backend/src/app.module.ts backend/prisma/schema.prisma backend/test/app.e2e-spec.ts
git commit -m "feat: bootstrap backend service"
```

### Task 2: Implement Auth, Groups, and Membership

**Files:**
- Create: `backend/src/modules/auth/auth.module.ts`
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/users/users.module.ts`
- Create: `backend/src/modules/groups/groups.module.ts`
- Create: `backend/src/modules/groups/groups.controller.ts`
- Create: `backend/src/modules/groups/groups.service.ts`
- Create: `backend/src/modules/groups/dto/create-group.dto.ts`
- Create: `backend/src/modules/groups/dto/update-group-member.dto.ts`
- Create: `backend/src/modules/prisma/prisma.module.ts`
- Create: `backend/src/modules/prisma/prisma.service.ts`
- Test: `backend/test/groups.e2e-spec.ts`

- [ ] **Step 1: Write the failing group ownership test**

```ts
it('creates a group with creator as owner member', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/groups')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'PairFund',
      group_type: 'couple',
      default_currency: 'TWD',
    })
    .expect(200);

  expect(response.body.data.name).toBe('PairFund');

  const members = await request(app.getHttpServer())
    .get(`/api/v1/groups/${response.body.data.id}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);

  expect(members.body.data[0].role).toBe('owner');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- test/groups.e2e-spec.ts`
Expected: FAIL because auth guard, group module, and Prisma access are not implemented.

- [ ] **Step 3: Implement minimal auth and group creation**

```ts
// backend/src/modules/groups/groups.service.ts
async createGroup(userId: string, dto: CreateGroupDto) {
  return this.prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: dto.name,
        groupType: dto.group_type.toUpperCase(),
        defaultCurrency: dto.default_currency,
        createdById: userId,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'OWNER',
      },
    });

    return group;
  });
}
```

- [ ] **Step 4: Add role update rule**

```ts
// backend/src/modules/groups/groups.service.ts
if (dto.role === 'member') {
  const ownerCount = await this.prisma.groupMember.count({
    where: { groupId, role: 'OWNER', status: 'ACTIVE' },
  });

  if (target.role === 'OWNER' && ownerCount <= 1) {
    throw new ConflictException('LAST_OWNER_RESTRICTION');
  }
}
```

- [ ] **Step 5: Run e2e tests**

Run: `npm run test:e2e -- test/groups.e2e-spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth backend/src/modules/users backend/src/modules/groups backend/src/modules/prisma backend/test/groups.e2e-spec.ts
git commit -m "feat: add auth and group membership flows"
```

### Task 3: Implement Funds, Contributions, and Expenses

**Files:**
- Create: `backend/src/modules/funds/funds.module.ts`
- Create: `backend/src/modules/funds/funds.controller.ts`
- Create: `backend/src/modules/funds/funds.service.ts`
- Create: `backend/src/modules/contributions/contributions.module.ts`
- Create: `backend/src/modules/contributions/contributions.controller.ts`
- Create: `backend/src/modules/contributions/contributions.service.ts`
- Create: `backend/src/modules/expenses/expenses.module.ts`
- Create: `backend/src/modules/expenses/expenses.controller.ts`
- Create: `backend/src/modules/expenses/expenses.service.ts`
- Create: `backend/src/modules/expenses/split-calculator.service.ts`
- Test: `backend/test/transactions.e2e-spec.ts`

- [ ] **Step 1: Write failing transaction tests**

```ts
it('creates a contribution', async () => {
  await request(app.getHttpServer())
    .post(`/api/v1/funds/${fundId}/contributions`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      contributor_user_id: userId,
      amount_minor: 5000,
      contribution_type: 'one_time',
      occurred_on: '2026-04-01',
      note: 'April deposit',
    })
    .expect(200);
});

it('creates a hybrid expense with valid payer and split totals', async () => {
  await request(app.getHttpServer())
    .post(`/api/v1/funds/${fundId}/expenses`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(expensePayload)
    .expect(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- test/transactions.e2e-spec.ts`
Expected: FAIL because transaction modules and split validation do not exist.

- [ ] **Step 3: Implement split calculator**

```ts
// backend/src/modules/expenses/split-calculator.service.ts
export class SplitCalculatorService {
  allocate(amountMinor: number, splits: SplitInput[]): AllocatedSplit[] {
    // Implement equal / ratio / fixed / hybrid logic here.
    // Persist allocated_amount_minor instead of recomputing in reads.
    return allocatedSplits;
  }
}
```

- [ ] **Step 4: Enforce amount sum validation**

```ts
const payerTotal = dto.payers.reduce((sum, item) => sum + item.amount_minor, 0);
if (payerTotal !== dto.amount_minor) {
  throw new BadRequestException('PAYER_TOTAL_MISMATCH');
}

const allocatedSplits = this.splitCalculator.allocate(dto.amount_minor, dto.splits);
const splitTotal = allocatedSplits.reduce((sum, item) => sum + item.allocated_amount_minor, 0);
if (splitTotal !== dto.amount_minor) {
  throw new BadRequestException('SPLIT_TOTAL_MISMATCH');
}
```

- [ ] **Step 5: Run e2e tests**

Run: `npm run test:e2e -- test/transactions.e2e-spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/funds backend/src/modules/contributions backend/src/modules/expenses backend/test/transactions.e2e-spec.ts
git commit -m "feat: add fund, contribution, and expense flows"
```

### Task 4: Implement Settlement Completion and Period Lock

**Files:**
- Create: `backend/src/modules/settlements/settlements.module.ts`
- Create: `backend/src/modules/settlements/settlements.controller.ts`
- Create: `backend/src/modules/settlements/settlements.service.ts`
- Create: `backend/src/modules/settlements/settled-period-lock.service.ts`
- Modify: `backend/src/modules/contributions/contributions.service.ts`
- Modify: `backend/src/modules/expenses/expenses.service.ts`
- Test: `backend/test/settlements.e2e-spec.ts`

- [ ] **Step 1: Write failing lock enforcement test**

```ts
it('blocks updates to transactions inside a completed settlement period', async () => {
  await completeSettlementForPeriod('2026-04-01', '2026-04-30');

  await request(app.getHttpServer())
    .patch(`/api/v1/expenses/${expenseId}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ title: 'Changed title' })
    .expect(409)
    .expect(({ body }) => {
      expect(body.error.code).toBe('SETTLED_PERIOD_LOCKED');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- test/settlements.e2e-spec.ts`
Expected: FAIL because lock checks are not enforced.

- [ ] **Step 3: Implement settled period lock service**

```ts
// backend/src/modules/settlements/settled-period-lock.service.ts
async assertUnlocked(fundId: string, occurredOn: string) {
  const locked = await this.prisma.settlement.findFirst({
    where: {
      fundId,
      status: 'COMPLETED',
      periodStart: { lte: new Date(occurredOn) },
      periodEnd: { gte: new Date(occurredOn) },
    },
  });

  if (locked) {
    throw new ConflictException({
      code: 'SETTLED_PERIOD_LOCKED',
      message: 'record is inside a settled period',
    });
  }
}
```

- [ ] **Step 4: Call lock service from every mutable write path**

```ts
await this.settledPeriodLock.assertUnlocked(record.fundId, record.occurredOn.toISOString());
```

- [ ] **Step 5: Run settlement e2e tests**

Run: `npm run test:e2e -- test/settlements.e2e-spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/settlements backend/src/modules/contributions/contributions.service.ts backend/src/modules/expenses/expenses.service.ts backend/test/settlements.e2e-spec.ts
git commit -m "feat: add settlement completion and period locking"
```

### Task 5: Add Read APIs, Audit, and Swagger

**Files:**
- Create: `backend/src/modules/audit/audit.module.ts`
- Create: `backend/src/modules/audit/audit.controller.ts`
- Create: `backend/src/modules/audit/audit.service.ts`
- Create: `backend/src/modules/dashboard/dashboard.module.ts`
- Create: `backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `backend/src/main.ts`
- Test: `backend/test/read-models.e2e-spec.ts`

- [ ] **Step 1: Write failing read API test**

```ts
it('returns fund summary with current positions', async () => {
  const response = await request(app.getHttpServer())
    .get(`/api/v1/funds/${fundId}/summary`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);

  expect(response.body.data).toHaveProperty('balance_minor');
  expect(response.body.data).toHaveProperty('current_positions');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- test/read-models.e2e-spec.ts`
Expected: FAIL because summary and audit APIs do not exist.

- [ ] **Step 3: Implement summary and audit endpoints**

```ts
// backend/src/modules/dashboard/dashboard.controller.ts
@Get('/funds/:fundId/summary')
getFundSummary(@Param('fundId') fundId: string) {
  return this.dashboardService.getFundSummary(fundId);
}
```

```ts
// backend/src/modules/audit/audit.controller.ts
@Get('/audit-logs')
listAuditLogs(@Query() query: ListAuditLogsDto) {
  return this.auditService.list(query);
}
```

- [ ] **Step 4: Expose Swagger docs from OpenAPI decorators**

```ts
// backend/src/main.ts
const config = new DocumentBuilder()
  .setTitle('PairFund API')
  .setVersion('0.2.0')
  .addBearerAuth()
  .build();
```

- [ ] **Step 5: Run full e2e suite**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/audit backend/src/modules/dashboard backend/src/main.ts backend/test/read-models.e2e-spec.ts
git commit -m "feat: add summary, audit, and swagger docs"
```

### Task 6: Verification and Documentation Sync

**Files:**
- Modify: `docs/design/pairfund-prd-v0.2-final.md`
- Modify: `docs/api/pairfund-openapi-v0.2.yaml`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Validate Prisma schema**

Run: `npx prisma validate --schema prisma/schema.prisma`
Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 2: Run OpenAPI lint or parse check**

Run: `npx @redocly/cli lint docs/api/pairfund-openapi-v0.2.yaml`
Expected: `No errors found`

- [ ] **Step 3: Sync any naming mismatches**

```text
Check these names match exactly across schema and API:
- amount_minor
- contribution_type
- expense_type
- settlement_type
- SETTLED_PERIOD_LOCKED
```

- [ ] **Step 4: Commit**

```bash
git add docs/design/pairfund-prd-v0.2-final.md docs/api/pairfund-openapi-v0.2.yaml prisma/schema.prisma
git commit -m "docs: sync backend contracts and schema"
```
