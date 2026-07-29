import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FundSummaryService } from '../src/modules/funds/fund-summary.service';
import { FundsService } from '../src/modules/funds/funds.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { ExpensesService } from '../src/modules/expenses/expenses.service';
import { ContributionsService } from '../src/modules/contributions/contributions.service';
import { SettlementsService } from '../src/modules/settlements/settlements.service';

const JWT_SECRET =
  'pairfund-dashboard-e2e-secret-7f58c9a2d10e4b63a91c5f8472de603b';

describe('Fund dashboard endpoints', () => {
  let app: INestApplication;
  let token: string;
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const fundSummaryService = {
    getFundSummary: jest.fn(),
    getGroupDashboard: jest.fn(),
  };
  const fundsService = {
    createFund: jest.fn(),
    listFunds: jest.fn(),
    getFundDetail: jest.fn(),
  };
  const expensesService = { listExpenses: jest.fn().mockResolvedValue([]) };
  const contributionsService = { listContributions: jest.fn().mockResolvedValue([]) };
  const settlementsService = {
    getSettlementSuggestion: jest.fn().mockResolvedValue({
      fund_id: 'fund-1',
      currency: 'TWD',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      suggestions: [],
    }),
    listSettlements: jest.fn().mockResolvedValue([]),
    getSettlement: jest.fn(),
    completeSettlement: jest.fn(),
    cancelSettlement: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FundSummaryService)
      .useValue(fundSummaryService)
      .overrideProvider(FundsService)
      .useValue(fundsService)
      .overrideProvider(ExpensesService)
      .useValue(expensesService)
      .overrideProvider(ContributionsService)
      .useValue(contributionsService)
      .overrideProvider(SettlementsService)
      .useValue(settlementsService)
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

  beforeEach(() => {
    jest.clearAllMocks();
    expensesService.listExpenses.mockResolvedValue([]);
    contributionsService.listContributions.mockResolvedValue([]);
    settlementsService.getSettlementSuggestion.mockResolvedValue({
      fund_id: 'fund-1',
      currency: 'TWD',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      suggestions: [],
    });
    settlementsService.listSettlements.mockResolvedValue([]);
    settlementsService.getSettlement.mockReset();
    settlementsService.completeSettlement.mockReset();
    settlementsService.cancelSettlement.mockReset();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  it('returns the exact snake_case fund summary and forwards identity', async () => {
    fundSummaryService.getFundSummary.mockResolvedValue({
      fund: {
        id: 'fund-1',
        groupId: 'group-1',
        name: 'Daily Fund',
        currency: 'TWD',
        status: 'active',
        cashBalanceMinor: 12500,
      },
      currentPeriod: {
        periodStart: '2026-07-01',
        periodEnd: '2026-07-17',
        lastCompletedSettlementId: 'settlement-1',
        lastCompletedPeriodEnd: '2026-06-30',
      },
      current: {
        netChangeMinor: 2500,
        contributionMinor: 5000,
        expenseMinor: 2500,
        memberPositions: [
          {
            userId: 'user-1',
            displayName: 'Alex',
            membershipStatus: 'active',
            positionMinor: 1500,
          },
        ],
      },
      allTime: {
        netChangeMinor: 12500,
        contributionMinor: 20000,
        expenseMinor: 7500,
        memberPositions: [],
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          fund: {
            id: 'fund-1',
            group_id: 'group-1',
            name: 'Daily Fund',
            currency: 'TWD',
            status: 'active',
            cash_balance_minor: '12500',
          },
          current_period: {
            period_start: '2026-07-01',
            period_end: '2026-07-17',
            last_completed_settlement_id: 'settlement-1',
            last_completed_period_end: '2026-06-30',
          },
          current: {
            net_change_minor: '2500',
            contribution_minor: '5000',
            expense_minor: '2500',
            member_positions: [
              {
                user_id: 'user-1',
                display_name: 'Alex',
                membership_status: 'active',
                position_minor: '1500',
              },
            ],
          },
          all_time: {
            net_change_minor: '12500',
            contribution_minor: '20000',
            expense_minor: '7500',
            member_positions: [],
          },
        },
      });
    expect(fundSummaryService.getFundSummary).toHaveBeenCalledWith(
      'fund-1',
      'user-1',
    );
  });

  it('preserves null period fields in a fund summary', async () => {
    fundSummaryService.getFundSummary.mockResolvedValue({
      fund: {
        id: 'fund-empty',
        groupId: 'group-1',
        name: 'Empty Fund',
        currency: 'TWD',
        status: 'active',
        cashBalanceMinor: 0,
      },
      currentPeriod: {
        periodStart: null,
        periodEnd: null,
        lastCompletedSettlementId: null,
        lastCompletedPeriodEnd: null,
      },
      current: emptyTotals(),
      allTime: emptyTotals(),
    });

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-empty/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          fund: {
            id: 'fund-empty',
            group_id: 'group-1',
            name: 'Empty Fund',
            currency: 'TWD',
            status: 'active',
            cash_balance_minor: '0',
          },
          current_period: {
            period_start: null,
            period_end: null,
            last_completed_settlement_id: null,
            last_completed_period_end: null,
          },
          current: mappedEmptyTotals(),
          all_time: mappedEmptyTotals(),
        },
      });
  });

  it('returns currencies unchanged in the exact group dashboard envelope', async () => {
    fundSummaryService.getGroupDashboard.mockResolvedValue({
      group: {
        id: 'group-1',
        name: 'Our Home',
        defaultCurrency: 'TWD',
      },
      currencies: [
        currency('TWD', 10000, 'fund-twd', 'Daily TWD', {
          currentMemberPositions: [
            {
              userId: 'user-1',
              displayName: 'Alex',
              membershipStatus: 'active',
              positionMinor: 1250,
            },
            {
              userId: 'user-2',
              displayName: 'Blair',
              membershipStatus: 'active',
              positionMinor: -1250,
            },
          ],
        }),
        currency('USD', 5000, 'fund-usd', 'Travel USD'),
      ],
    });

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          group: {
            id: 'group-1',
            name: 'Our Home',
            default_currency: 'TWD',
          },
          currencies: [
            mappedCurrency('TWD', 10000, 'fund-twd', 'Daily TWD', {
              currentMemberPositions: [
                {
                  user_id: 'user-1',
                  display_name: 'Alex',
                  membership_status: 'active',
                  position_minor: '1250',
                },
                {
                  user_id: 'user-2',
                  display_name: 'Blair',
                  membership_status: 'active',
                  position_minor: '-1250',
                },
              ],
            }),
            mappedCurrency('USD', 5000, 'fund-usd', 'Travel USD'),
          ],
        },
      });
    expect(fundSummaryService.getGroupDashboard).toHaveBeenCalledWith(
      'group-1',
      'user-1',
    );
  });

  it('returns fund list balances as decimal strings and forwards identity', async () => {
    fundsService.listFunds.mockResolvedValue([
      {
        id: 'fund-positive',
        name: 'Daily',
        currency: 'TWD',
        status: 'ACTIVE',
        contributions: [{ amountMinor: 7200n }],
        expenses: [{ amountMinor: 800n }],
      },
      {
        id: 'fund-negative',
        name: 'Trip',
        currency: 'USD',
        status: 'ACTIVE',
        contributions: [{ amountMinor: 0n }],
        expenses: [{ amountMinor: 800n }],
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1/funds')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: [
          {
            id: 'fund-positive',
            name: 'Daily',
            currency: 'TWD',
            status: 'active',
            balance_minor: '6400',
          },
          {
            id: 'fund-negative',
            name: 'Trip',
            currency: 'USD',
            status: 'active',
            balance_minor: '-800',
          },
        ],
      });

    expect(fundsService.listFunds).toHaveBeenCalledWith('group-1', 'user-1');
  });

  it.each([
    ['/api/v1/funds/fund-1/summary', 'getFundSummary'],
    ['/api/v1/groups/group-1/dashboard', 'getGroupDashboard'],
  ])('rejects unauthenticated GET %s without calling service', async (path, method) => {
    await request(app.getHttpServer()).get(path).expect(401);
    expect(fundSummaryService[method as keyof typeof fundSummaryService]).not.toHaveBeenCalled();
  });

  it.each([
    [new NotFoundException('FUND_NOT_FOUND'), 404, 'FUND_NOT_FOUND'],
    [new ForbiddenException('GROUP_ACCESS_DENIED'), 403, 'GROUP_ACCESS_DENIED'],
  ])('preserves domain error envelope', async (error, status, message) => {
    fundSummaryService.getFundSummary.mockRejectedValue(error);
    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .expect({ message, error: status === 404 ? 'Not Found' : 'Forbidden', statusCode: status });
  });

  it.each([
    ['/api/v1/funds/fund-1/expenses', expensesService, 'listExpenses'],
    ['/api/v1/funds/fund-1/contributions', contributionsService, 'listContributions'],
  ])('validates and forwards bounded activity query for %s', async (path, service, method) => {
    await request(app.getHttpServer())
      .get(`${path}?page=2&page_size=3&sort=occurred_on_asc`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ data: [] });
    expect(service[method as keyof typeof service]).toHaveBeenCalledWith(
      'fund-1',
      'user-1',
      { page: 2, page_size: 3, sort: 'occurred_on_asc' },
    );
  });

  it('applies explicit default activity query', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/contributions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(contributionsService.listContributions).toHaveBeenCalledWith(
      'fund-1',
      'user-1',
      { page: 1, page_size: 50, sort: 'occurred_on_desc' },
    );
  });

  it('serializes contribution activity money as decimal strings', async () => {
    contributionsService.listContributions.mockResolvedValue([
      {
        id: 'contribution-1',
        fundId: 'fund-1',
        contributorUserId: 'user-1',
        amountMinor: 9007199254740993n,
        contributionType: 'ONE_TIME',
        occurredOn: new Date('2026-07-10T00:00:00.000Z'),
        note: null,
        status: 'ACTIVE',
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/contributions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: [
          {
            id: 'contribution-1',
            fund_id: 'fund-1',
            contributor_user_id: 'user-1',
            amount_minor: '9007199254740993',
            contribution_type: 'one_time',
            occurred_on: '2026-07-10',
            note: null,
            status: 'active',
          },
        ],
      });
  });

  it('serializes expense activity money as decimal strings', async () => {
    expensesService.listExpenses.mockResolvedValue([
      {
        id: 'expense-1',
        fundId: 'fund-1',
        title: 'Rent',
        note: null,
        amountMinor: 9007199254740993n,
        splitMode: 'FIXED',
        expenseType: 'FUND_EXPENSE',
        occurredOn: new Date('2026-07-10T00:00:00.000Z'),
        status: 'ACTIVE',
        payers: [{ payerUserId: 'user-1', amountMinor: 9007199254740993n }],
        splits: [
          {
            userId: 'user-2',
            splitType: 'FIXED',
            ratioValue: null,
            fixedAmountMinor: 9007199254740993n,
            allocatedAmountMinor: 9007199254740993n,
            sortOrder: 1,
          },
        ],
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: [
          {
            id: 'expense-1',
            fund_id: 'fund-1',
            title: 'Rent',
            note: null,
            amount_minor: '9007199254740993',
            split_mode: 'fixed',
            expense_type: 'fund_expense',
            occurred_on: '2026-07-10',
            status: 'active',
            payers: [
              {
                payer_user_id: 'user-1',
                amount_minor: '9007199254740993',
              },
            ],
            splits: [
              {
                user_id: 'user-2',
                split_type: 'fixed',
                ratio_value: null,
                fixed_amount_minor: '9007199254740993',
                allocated_amount_minor: '9007199254740993',
                sort_order: 1,
              },
            ],
          },
        ],
      });
  });

  it('forwards identity for settlement suggestion reads', async () => {
    settlementsService.getSettlementSuggestion.mockResolvedValue({
      fund_id: 'fund-1',
      currency: 'TWD',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      suggestions: [
        { from_user_id: 'user-2', to_user_id: 'user-1', amount_minor: '9007199254740993' },
      ],
    });

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/settlement-suggestion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        data: {
          fund_id: 'fund-1',
          currency: 'TWD',
          period_start: '2026-07-01',
          period_end: '2026-07-31',
          suggestions: [
            { from_user_id: 'user-2', to_user_id: 'user-1', amount_minor: '9007199254740993' },
          ],
        },
      });
    expect(settlementsService.getSettlementSuggestion).toHaveBeenCalledWith('fund-1', 'user-1');
  });

  it('serializes settlement money as decimal strings and forwards identity', async () => {
    const settlement = {
      id: 'settlement-1',
      fundId: 'fund-1',
      fromUserId: 'user-2',
      toUserId: 'user-1',
      amountMinor: 9007199254740993n,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-31T00:00:00.000Z'),
      status: 'PENDING',
      settlementType: 'MANUAL',
      note: null,
      completedAt: null,
      canceledAt: null,
    };
    settlementsService.listSettlements.mockResolvedValue([settlement]);
    settlementsService.getSettlement.mockResolvedValue(settlement);
    settlementsService.completeSettlement.mockResolvedValue({
      ...settlement,
      status: 'COMPLETED',
      completedAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    settlementsService.cancelSettlement.mockResolvedValue({
      ...settlement,
      status: 'CANCELED',
      canceledAt: new Date('2026-08-02T12:00:00.000Z'),
    });

    const expectedPending = {
      id: 'settlement-1',
      fund_id: 'fund-1',
      from_user_id: 'user-2',
      to_user_id: 'user-1',
      amount_minor: '9007199254740993',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      status: 'pending',
      settlement_type: 'manual',
      note: null,
      completed_at: null,
      canceled_at: null,
    };

    await request(app.getHttpServer())
      .get('/api/v1/funds/fund-1/settlements?page_size=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ data: [expectedPending] });
    expect(settlementsService.listSettlements).toHaveBeenCalledWith('fund-1', 'user-1', 1);

    await request(app.getHttpServer())
      .get('/api/v1/settlements/settlement-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ data: expectedPending });
    expect(settlementsService.getSettlement).toHaveBeenCalledWith('settlement-1', 'user-1');

    await request(app.getHttpServer())
      .post('/api/v1/settlements/settlement-1/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ completed_at: '2026-08-01T12:00:00.000Z' })
      .expect(201)
      .expect({
        data: {
          ...expectedPending,
          status: 'completed',
          completed_at: '2026-08-01T12:00:00.000Z',
        },
      });
    expect(settlementsService.completeSettlement).toHaveBeenCalledWith(
      'settlement-1',
      'user-1',
      { completed_at: '2026-08-01T12:00:00.000Z' },
    );

    await request(app.getHttpServer())
      .post('/api/v1/settlements/settlement-1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201)
      .expect({
        data: {
          ...expectedPending,
          status: 'canceled',
          canceled_at: '2026-08-02T12:00:00.000Z',
        },
      });
    expect(settlementsService.cancelSettlement).toHaveBeenCalledWith('settlement-1', 'user-1');
  });

  it.each([
    'page=0',
    'page_size=0',
    'page_size=101',
    'sort=occurred_on:desc',
  ])('rejects invalid activity query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/api/v1/funds/fund-1/expenses?${query}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

function emptyTotals() {
  return {
    netChangeMinor: 0,
    contributionMinor: 0,
    expenseMinor: 0,
    memberPositions: [],
  };
}

function mappedEmptyTotals() {
  return {
    net_change_minor: '0',
    contribution_minor: '0',
    expense_minor: '0',
    member_positions: [],
  };
}

function currency(
  currencyCode: string,
  cash: number,
  fundId: string,
  name: string,
  options: {
    currentMemberPositions?: Array<{
      userId: string;
      displayName: string;
      membershipStatus: string;
      positionMinor: number;
    }>;
  } = {},
) {
  return {
    currency: currencyCode,
    cashBalanceMinor: cash,
    current: {
      ...emptyTotals(),
      memberPositions: options.currentMemberPositions ?? [],
    },
    allTime: emptyTotals(),
    funds: [{ fundId, name, cashBalanceMinor: cash, currentNetChangeMinor: 0, periodStart: null, periodEnd: null }],
  };
}

function mappedCurrency(
  currencyCode: string,
  cash: number,
  fundId: string,
  name: string,
  options: {
    currentMemberPositions?: Array<{
      user_id: string;
      display_name: string;
      membership_status: string;
      position_minor: string;
    }>;
  } = {},
) {
  return {
    currency: currencyCode,
    cash_balance_minor: `${cash}`,
    current: {
      ...mappedEmptyTotals(),
      member_positions: options.currentMemberPositions ?? [],
    },
    all_time: mappedEmptyTotals(),
    funds: [
      {
        fund_id: fundId,
        name,
        cash_balance_minor: `${cash}`,
        current_net_change_minor: '0',
        period_start: null,
        period_end: null,
      },
    ],
  };
}
