import {
  ExpenseSplitMode,
  ExpenseType,
  RecordStatus,
  SplitType,
} from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FundStatus, MemberStatus } from '@prisma/client';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  it('bounds and stably sorts expense previews', async () => {
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      groupMember: { findFirst: jest.fn().mockResolvedValue({ userId: 'actor' }) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ExpensesService(prisma as never);
    await service.listExpenses('fund-1', 'actor', { page: 2, page_size: 3, sort: 'occurred_on_desc' });
    expect(prisma.fund.findFirst).toHaveBeenCalledWith({
      where: { id: 'fund-1', status: FundStatus.ACTIVE },
      select: { id: true, groupId: true },
    });
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
      where: { groupId: 'group-1', userId: 'actor', status: MemberStatus.ACTIVE },
      select: { userId: true },
    });
    expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 3, take: 3, orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }],
    }));
  });

  it('rejects expense list reads when the actor is not an active group member', async () => {
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      groupMember: { findFirst: jest.fn().mockResolvedValue(null) },
      expense: { findMany: jest.fn() },
    };
    const service = new ExpensesService(prisma as never);

    await expect(
      service.listExpenses('fund-1', 'outsider', { page: 1, page_size: 50, sort: 'occurred_on_desc' }),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });

  it('returns FUND_NOT_FOUND before checking membership for missing expense funds', async () => {
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue(null) },
      groupMember: { findFirst: jest.fn() },
      expense: { findMany: jest.fn() },
    };
    const service = new ExpensesService(prisma as never);

    await expect(service.listExpenses('missing-fund', 'actor')).rejects.toEqual(
      new NotFoundException('FUND_NOT_FOUND'),
    );
    expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });
  it('locks the fund group and validates every unique participant before expense writes', async () => {
    const order: string[] = [];
    const tx = {
      $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
      groupMember: { findMany: jest.fn().mockImplementation(() => {
        order.push('members');
        return ['actor', 'payer', 'split'].map((userId) => ({ userId }));
      }) },
      settlement: { findFirst: jest.fn().mockImplementation(() => { order.push('period'); return null; }) },
      expense: { create: jest.fn().mockImplementation(() => { order.push('write'); return { id: 'expense-1' }; }) },
      expensePayer: { createMany: jest.fn() }, expenseSplit: { createMany: jest.fn() },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ExpensesService(prisma as never);
    await service.createExpense('fund-1', 'actor', {
      title: 'Dinner', amount_minor: 1000, split_mode: 'equal', expense_type: 'fund_expense', occurred_on: '2026-04-13',
      payers: [{ payer_user_id: 'payer', amount_minor: 1000 }],
      splits: [{ user_id: 'split', split_type: 'equal', sort_order: 1 }],
    });
    expect(prisma.fund.findFirst).toHaveBeenCalledWith({ where: { id: 'fund-1', status: FundStatus.ACTIVE }, select: { id: true, groupId: true } });
    expect(tx.groupMember.findMany).toHaveBeenCalledWith({ where: { groupId: 'group-1', userId: { in: ['actor', 'payer', 'split'] }, status: MemberStatus.ACTIVE }, select: { userId: true } });
    expect(order).toEqual(['lock', 'members', 'period', 'write']);
  });

  it('rejects a correction expense in a completed settlement period before all writes', async () => {
    const order: string[] = [];
    const tx = {
      $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
      groupMember: { findMany: jest.fn().mockImplementation(() => {
        order.push('members');
        return [{ userId: 'actor' }];
      }) },
      settlement: { findFirst: jest.fn().mockImplementation(() => {
        order.push('period');
        return { id: 'settlement-1' };
      }) },
      expense: { create: jest.fn() },
      expensePayer: { createMany: jest.fn() },
      expenseSplit: { createMany: jest.fn() },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ExpensesService(prisma as never);

    await expect(service.createExpense('fund-1', 'actor', {
      title: 'Correction', amount_minor: 1, split_mode: 'equal', expense_type: 'correction', occurred_on: '2026-08-30',
      payers: [{ payer_user_id: 'actor', amount_minor: 1 }],
      splits: [{ user_id: 'actor', split_type: 'equal', sort_order: 1 }],
    })).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));
    expect(order).toEqual(['lock', 'members', 'period']);
    expect(tx.expense.create).not.toHaveBeenCalled();
    expect(tx.expensePayer.createMany).not.toHaveBeenCalled();
    expect(tx.expenseSplit.createMany).not.toHaveBeenCalled();
  });

  it('rejects any inactive non-actor participant before all expense writes', async () => {
    const tx = { $executeRaw: jest.fn(), groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'actor' }, { userId: 'payer' }]) },
      expense: { create: jest.fn() }, expensePayer: { createMany: jest.fn() }, expenseSplit: { createMany: jest.fn() } };
    const prisma = { fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) }, $transaction: jest.fn((callback) => callback(tx)) };
    const service = new ExpensesService(prisma as never);
    await expect(service.createExpense('fund-1', 'actor', {
      title: 'Dinner', amount_minor: 1000, split_mode: 'equal', expense_type: 'fund_expense', occurred_on: '2026-04-13',
      payers: [{ payer_user_id: 'payer', amount_minor: 1000 }], splits: [{ user_id: 'missing', split_type: 'equal', sort_order: 1 }],
    })).rejects.toEqual(new NotFoundException('MEMBER_NOT_FOUND'));
    expect(tx.expense.create).not.toHaveBeenCalled();
    expect(tx.expensePayer.createMany).not.toHaveBeenCalled();
    expect(tx.expenseSplit.createMany).not.toHaveBeenCalled();
  });

  it('maps an inactive expense actor to GROUP_ACCESS_DENIED', async () => {
    const tx = { $executeRaw: jest.fn(), groupMember: { findMany: jest.fn().mockResolvedValue([]) }, expense: { create: jest.fn() } };
    const prisma = { fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) }, $transaction: jest.fn((callback) => callback(tx)) };
    const service = new ExpensesService(prisma as never);
    await expect(service.createExpense('fund-1', 'actor', {
      title: 'Dinner', amount_minor: 1000, split_mode: 'equal', expense_type: 'fund_expense', occurred_on: '2026-04-13',
      payers: [{ payer_user_id: 'actor', amount_minor: 1000 }], splits: [{ user_id: 'actor', split_type: 'equal', sort_order: 1 }],
    })).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));
    expect(tx.expense.create).not.toHaveBeenCalled();
  });
  it('creates an expense with payers and allocated equal splits in one transaction', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]) },
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
      expense: {
        create: jest.fn().mockResolvedValue({
          id: 'expense-1',
          fundId: 'fund-1',
          title: 'Dinner',
          note: 'Date night',
          amountMinor: BigInt(1001),
          splitMode: ExpenseSplitMode.EQUAL,
          expenseType: ExpenseType.FUND_EXPENSE,
          occurredOn: new Date('2026-04-13T00:00:00.000Z'),
          status: RecordStatus.ACTIVE,
        }),
      },
      expensePayer: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      expenseSplit: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ExpensesService(prisma as never);

    const result = await service.createExpense('fund-1', 'user-1', {
      title: 'Dinner',
      note: 'Date night',
      amount_minor: 1001,
      split_mode: 'equal',
      expense_type: 'fund_expense',
      occurred_on: '2026-04-13',
      payers: [{ payer_user_id: 'user-1', amount_minor: 1001 }],
      splits: [
        { user_id: 'user-1', split_type: 'equal', sort_order: 1 },
        { user_id: 'user-2', split_type: 'equal', sort_order: 2 },
      ],
    });

    expect(tx.expense.create).toHaveBeenCalledWith({
      data: {
        fundId: 'fund-1',
        title: 'Dinner',
        note: 'Date night',
        amountMinor: BigInt(1001),
        splitMode: ExpenseSplitMode.EQUAL,
        expenseType: ExpenseType.FUND_EXPENSE,
        occurredOn: new Date('2026-04-13T00:00:00.000Z'),
        createdById: 'user-1',
        updatedById: 'user-1',
      },
    });
    expect(tx.expensePayer.createMany).toHaveBeenCalledWith({
      data: [
        {
          expenseId: 'expense-1',
          payerUserId: 'user-1',
          amountMinor: BigInt(1001),
        },
      ],
    });
    expect(tx.expenseSplit.createMany).toHaveBeenCalledWith({
      data: [
        {
          expenseId: 'expense-1',
          userId: 'user-1',
          splitType: SplitType.EQUAL,
          ratioValue: null,
          fixedAmountMinor: null,
          allocatedAmountMinor: BigInt(501),
          sortOrder: 1,
        },
        {
          expenseId: 'expense-1',
          userId: 'user-2',
          splitType: SplitType.EQUAL,
          ratioValue: null,
          fixedAmountMinor: null,
          allocatedAmountMinor: BigInt(500),
          sortOrder: 2,
        },
      ],
    });
    expect(result.id).toBe('expense-1');
  });

  it('rejects payer totals that do not match expense amount', async () => {
    const service = new ExpensesService({} as never);

    await expect(
      service.createExpense('fund-1', 'user-1', {
        title: 'Dinner',
        amount_minor: 1000,
        split_mode: 'equal',
        expense_type: 'fund_expense',
        occurred_on: '2026-04-13',
        payers: [{ payer_user_id: 'user-1', amount_minor: 900 }],
        splits: [{ user_id: 'user-1', split_type: 'equal', sort_order: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allocates hybrid fixed first and ratios over the remaining amount', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      groupMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }]) },
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
      expense: {
        create: jest.fn().mockResolvedValue({
          id: 'expense-2',
          fundId: 'fund-1',
          title: 'Trip dinner',
          note: null,
          amountMinor: BigInt(1000),
          splitMode: ExpenseSplitMode.HYBRID,
          expenseType: ExpenseType.FUND_EXPENSE,
          occurredOn: new Date('2026-04-13T00:00:00.000Z'),
          status: RecordStatus.ACTIVE,
        }),
      },
      expensePayer: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      expenseSplit: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const prisma = {
      fund: { findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new ExpensesService(prisma as never);

    await service.createExpense('fund-1', 'user-1', {
      title: 'Trip dinner',
      amount_minor: 1000,
      split_mode: 'hybrid',
      expense_type: 'fund_expense',
      occurred_on: '2026-04-13',
      payers: [{ payer_user_id: 'user-1', amount_minor: 1000 }],
      splits: [
        {
          user_id: 'user-1',
          split_type: 'fixed',
          fixed_amount_minor: 300,
          sort_order: 1,
        },
        {
          user_id: 'user-2',
          split_type: 'ratio',
          ratio_value: 0.5,
          sort_order: 2,
        },
        {
          user_id: 'user-3',
          split_type: 'ratio',
          ratio_value: 0.5,
          sort_order: 3,
        },
      ],
    });

    expect(tx.expenseSplit.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          allocatedAmountMinor: BigInt(300),
        }),
        expect.objectContaining({
          userId: 'user-2',
          allocatedAmountMinor: BigInt(350),
        }),
        expect.objectContaining({
          userId: 'user-3',
          allocatedAmountMinor: BigInt(350),
        }),
      ]),
    });
  });
});
