# Settlement Lock and Invite Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject every contribution or expense dated inside a completed settlement period and render the authenticated invite acceptance action when a valid Web access-token cookie is present.

**Architecture:** A reusable backend accounting guard performs an inclusive completed-settlement query inside the existing group-locked Prisma transaction. The Web extracts its JWT-shape predicate, adds a non-redirecting optional-session reader, and wires the public invite server page to the existing acceptance panel without changing BFF authorization.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, Jest, Next.js 16 App Router, React 19, Vitest, Testing Library, TypeScript.

---

## File Map

- Create `backend/src/modules/accounting/settlement-period-lock.ts`: reusable completed-settlement period guard.
- Create `backend/src/modules/accounting/settlement-period-lock.spec.ts`: focused inclusive-range and error-contract tests.
- Modify `backend/src/modules/contributions/contributions.service.ts`: call the guard before contribution writes.
- Modify `backend/src/modules/contributions/contributions.service.spec.ts`: prove contribution and correction rejection and update unlocked transaction fixtures.
- Modify `backend/src/modules/expenses/expenses.service.ts`: call the guard before expense, payer, and split writes.
- Modify `backend/src/modules/expenses/expenses.service.spec.ts`: prove expense and correction rejection and update unlocked transaction fixtures.
- Create `web/src/shared/auth/jwt-shape.ts`: shared strict access-token shape predicate.
- Create `web/src/shared/auth/has-session.ts`: non-redirecting cookie-backed session-presence reader.
- Create `web/src/shared/auth/has-session.test.ts`: optional-session behavior tests.
- Modify `web/src/shared/auth/require-session.ts`: reuse the extracted predicate.
- Modify `web/src/shared/auth/require-session.test.ts`: retain redirect behavior and prove valid-token behavior.
- Modify `web/src/app/(public)/invite/[code]/page.tsx`: pass real optional-session state to `InviteAcceptPanel`.
- Create `web/src/app/(public)/invite/[code]/page.test.tsx`: verify authenticated, anonymous, and invalid-code props.
- Modify `.agents/features.md`: record the verified create-time lock enforcement and invite-session fix.
- Modify `.agents/devlog.md`: append the required implementation record.

### Task 1: Add the reusable settlement-period guard

**Files:**
- Create: `backend/src/modules/accounting/settlement-period-lock.spec.ts`
- Create: `backend/src/modules/accounting/settlement-period-lock.ts`

- [ ] **Step 1: Write the failing guard tests**

Create `settlement-period-lock.spec.ts` with the intended public API and exact Prisma query contract:

```ts
import { ConflictException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { assertFundPeriodUnlocked } from './settlement-period-lock';

describe('assertFundPeriodUnlocked', () => {
  const occurredOn = new Date('2026-08-30T00:00:00.000Z');

  it('rejects a date covered by a completed settlement inclusive range', async () => {
    const tx = {
      settlement: {
        findFirst: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
      },
    };

    await expect(
      assertFundPeriodUnlocked(tx as never, 'fund-1', occurredOn),
    ).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));

    expect(tx.settlement.findFirst).toHaveBeenCalledWith({
      where: {
        fundId: 'fund-1',
        status: SettlementStatus.COMPLETED,
        periodStart: { lte: occurredOn },
        periodEnd: { gte: occurredOn },
      },
      select: { id: true },
    });
  });

  it('allows a date when no bounded completed settlement covers it', async () => {
    const tx = {
      settlement: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    await expect(
      assertFundPeriodUnlocked(tx as never, 'fund-1', occurredOn),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `backend/`:

```powershell
npm test -- --runInBand src/modules/accounting/settlement-period-lock.spec.ts
```

Expected: FAIL because `./settlement-period-lock` does not exist.

- [ ] **Step 3: Implement the minimal guard**

Create `settlement-period-lock.ts`:

```ts
import { ConflictException } from '@nestjs/common';
import { Prisma, SettlementStatus } from '@prisma/client';

export async function assertFundPeriodUnlocked(
  tx: Prisma.TransactionClient,
  fundId: string,
  occurredOn: Date,
): Promise<void> {
  const lockedSettlement = await tx.settlement.findFirst({
    where: {
      fundId,
      status: SettlementStatus.COMPLETED,
      periodStart: { lte: occurredOn },
      periodEnd: { gte: occurredOn },
    },
    select: { id: true },
  });

  if (lockedSettlement) {
    throw new ConflictException('LOCKED_PERIOD');
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command again.

Expected: PASS with both guard tests green.

- [ ] **Step 5: Commit the guard**

```powershell
git add backend/src/modules/accounting/settlement-period-lock.ts backend/src/modules/accounting/settlement-period-lock.spec.ts
git commit -m "fix(accounting): guard completed settlement periods"
```

### Task 2: Enforce the guard for contribution creation

**Files:**
- Modify: `backend/src/modules/contributions/contributions.service.spec.ts`
- Modify: `backend/src/modules/contributions/contributions.service.ts`

- [ ] **Step 1: Add a failing correction lock test**

Add `ConflictException` to the Nest import and add this test before the successful create test:

```ts
it('rejects a correction in a completed settlement period before writing', async () => {
  const order: string[] = [];
  const tx = {
    $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
    groupMember: {
      findMany: jest.fn().mockImplementation(() => {
        order.push('members');
        return [{ userId: 'user-1' }, { userId: 'user-2' }];
      }),
    },
    settlement: {
      findFirst: jest.fn().mockImplementation(() => {
        order.push('period');
        return { id: 'settlement-1' };
      }),
    },
    contribution: { create: jest.fn() },
  };
  const prisma = {
    fund: {
      findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }),
    },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const service = new ContributionsService(prisma as never);

  await expect(service.createContribution('fund-1', 'user-1', {
    contributor_user_id: 'user-2',
    amount_minor: 1,
    contribution_type: 'correction',
    occurred_on: '2026-08-30',
  })).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));

  expect(order).toEqual(['lock', 'members', 'period']);
  expect(tx.contribution.create).not.toHaveBeenCalled();
});
```

For every existing contribution test transaction that reaches or can reach a write, add:

```ts
settlement: { findFirst: jest.fn().mockResolvedValue(null) },
```

The affected tests are:

- `locks the group and validates active actor and contributor before writing`
- both cases in `rejects an inactive %s before writing` (the guard is not reached but the transaction shape stays explicit)
- `creates an active contribution for a fund and actor`

In the ordering test, make the settlement mock append `period` and change the expected order to `['lock', 'members', 'period', 'write']`.

- [ ] **Step 2: Run the contribution tests and verify RED**

```powershell
npm test -- --runInBand src/modules/contributions/contributions.service.spec.ts
```

Expected: the new correction test fails because the contribution is written and no settlement query occurs.

- [ ] **Step 3: Wire the guard into contribution creation**

Import the helper:

```ts
import { assertFundPeriodUnlocked } from '../accounting/settlement-period-lock';
```

Normalize the date once before the transaction:

```ts
const fund = await this.requireActiveFund(fundId);
const occurredOn = this.toUtcDate(dto.occurred_on);
```

After `requireActiveMembers()` and before `tx.contribution.create()`, add:

```ts
await assertFundPeriodUnlocked(tx, fundId, occurredOn);
```

Use `occurredOn` in the create data instead of calling `toUtcDate()` again.

- [ ] **Step 4: Run guard and contribution tests and verify GREEN**

```powershell
npm test -- --runInBand src/modules/accounting/settlement-period-lock.spec.ts src/modules/contributions/contributions.service.spec.ts
```

Expected: both suites pass; locked correction never calls `contribution.create()`.

- [ ] **Step 5: Commit contribution enforcement**

```powershell
git add backend/src/modules/contributions/contributions.service.ts backend/src/modules/contributions/contributions.service.spec.ts
git commit -m "fix(contributions): reject locked period writes"
```

### Task 3: Enforce the guard for expense creation

**Files:**
- Modify: `backend/src/modules/expenses/expenses.service.spec.ts`
- Modify: `backend/src/modules/expenses/expenses.service.ts`

- [ ] **Step 1: Add a failing correction expense lock test**

Add `ConflictException` to the Nest import and add:

```ts
it('rejects a correction expense in a completed settlement period before all writes', async () => {
  const order: string[] = [];
  const tx = {
    $executeRaw: jest.fn().mockImplementation(() => { order.push('lock'); }),
    groupMember: {
      findMany: jest.fn().mockImplementation(() => {
        order.push('members');
        return [{ userId: 'actor' }];
      }),
    },
    settlement: {
      findFirst: jest.fn().mockImplementation(() => {
        order.push('period');
        return { id: 'settlement-1' };
      }),
    },
    expense: { create: jest.fn() },
    expensePayer: { createMany: jest.fn() },
    expenseSplit: { createMany: jest.fn() },
  };
  const prisma = {
    fund: {
      findFirst: jest.fn().mockResolvedValue({ id: 'fund-1', groupId: 'group-1' }),
    },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const service = new ExpensesService(prisma as never);

  await expect(service.createExpense('fund-1', 'actor', {
    title: 'Correction',
    amount_minor: 1,
    split_mode: 'equal',
    expense_type: 'correction',
    occurred_on: '2026-08-30',
    payers: [{ payer_user_id: 'actor', amount_minor: 1 }],
    splits: [{ user_id: 'actor', split_type: 'equal', sort_order: 1 }],
  })).rejects.toEqual(new ConflictException('LOCKED_PERIOD'));

  expect(order).toEqual(['lock', 'members', 'period']);
  expect(tx.expense.create).not.toHaveBeenCalled();
  expect(tx.expensePayer.createMany).not.toHaveBeenCalled();
  expect(tx.expenseSplit.createMany).not.toHaveBeenCalled();
});
```

Add an unlocked settlement mock to every existing expense create transaction fixture:

```ts
settlement: { findFirst: jest.fn().mockResolvedValue(null) },
```

The affected tests are the group-lock ordering test, inactive participant test, inactive actor test, successful equal-split test, and hybrid-split test. In the group-lock ordering test, append `period` in the settlement mock and expect `['lock', 'members', 'period', 'write']`.

- [ ] **Step 2: Run the expense tests and verify RED**

```powershell
npm test -- --runInBand src/modules/expenses/expenses.service.spec.ts
```

Expected: the new correction expense test fails because `expense.create()` is still called.

- [ ] **Step 3: Wire the guard into expense creation**

Import `assertFundPeriodUnlocked`, normalize `occurredOn` once after the active fund lookup, and call:

```ts
await assertFundPeriodUnlocked(tx, fundId, occurredOn);
```

Place the call after `requireActiveMembers()` and before `tx.expense.create()`. Use `occurredOn` in the expense create data.

- [ ] **Step 4: Run all focused backend tests and verify GREEN**

```powershell
npm test -- --runInBand src/modules/accounting/settlement-period-lock.spec.ts src/modules/contributions/contributions.service.spec.ts src/modules/expenses/expenses.service.spec.ts
```

Expected: all three suites pass and no locked expense child rows are written.

- [ ] **Step 5: Commit expense enforcement**

```powershell
git add backend/src/modules/expenses/expenses.service.ts backend/src/modules/expenses/expenses.service.spec.ts
git commit -m "fix(expenses): reject locked period writes"
```

### Task 4: Add a shared optional Web session reader

**Files:**
- Create: `web/src/shared/auth/jwt-shape.ts`
- Create: `web/src/shared/auth/has-session.ts`
- Create: `web/src/shared/auth/has-session.test.ts`
- Modify: `web/src/shared/auth/require-session.ts`
- Modify: `web/src/shared/auth/require-session.test.ts`

- [ ] **Step 1: Write failing optional-session tests**

Create `has-session.test.ts` using the same `next/headers` mock pattern as `require-session.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authCookies } from '@/shared/auth/cookies';
import { hasSession } from './has-session';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

describe('hasSession', () => {
  beforeEach(async () => {
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockReset();
  });

  it.each([
    ['missing', undefined, false],
    ['malformed', 'not-a-jwt', false],
    ['whitespace', ' aaa.bbb.ccc ', false],
    ['valid shape', 'aaa.bbb.ccc', true],
  ])('maps a %s access token to %s', async (_label, token, expected) => {
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({
      get(name: string) {
        return name === authCookies.access && token
          ? { name, value: token }
          : undefined;
      },
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(hasSession()).resolves.toBe(expected);
  });
});
```

Add a valid-token case to `require-session.test.ts`:

```ts
it('returns an authenticated session for a strictly shaped access token', async () => {
  await mockCookies({ [authCookies.access]: 'aaa.bbb.ccc' });

  await expect(requireSession()).resolves.toEqual({
    isAuthenticated: true,
    user: null,
  });
});
```

- [ ] **Step 2: Run the auth tests and verify RED**

Run from `web/`:

```powershell
npm test -- src/shared/auth/has-session.test.ts src/shared/auth/require-session.test.ts
```

Expected: FAIL because `has-session.ts` does not exist.

- [ ] **Step 3: Extract the predicate and implement the reader**

Create `jwt-shape.ts`:

```ts
export function isJwtShaped(token: string): boolean {
  const trimmedToken = token.trim();
  if (trimmedToken !== token) return false;

  const parts = trimmedToken.split('.');
  return (
    parts.length === 3 &&
    parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  );
}
```

Create `has-session.ts`:

```ts
import 'server-only';
import { cookies } from 'next/headers';
import { authCookies } from '@/shared/auth/cookies';
import { isJwtShaped } from '@/shared/auth/jwt-shape';

export async function hasSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;
  return accessToken !== undefined && isJwtShaped(accessToken);
}
```

Import `isJwtShaped` in `require-session.ts` and remove its private duplicate implementation. Preserve all redirects and return values.

- [ ] **Step 4: Run the auth tests and verify GREEN**

Run the Step 2 command again.

Expected: both suites pass, including missing, malformed, whitespace, and valid token cases.

- [ ] **Step 5: Commit the shared session boundary**

```powershell
git add web/src/shared/auth/jwt-shape.ts web/src/shared/auth/has-session.ts web/src/shared/auth/has-session.test.ts web/src/shared/auth/require-session.ts web/src/shared/auth/require-session.test.ts
git commit -m "fix(web): expose optional session state"
```

### Task 5: Wire the invite page to optional session state

**Files:**
- Create: `web/src/app/(public)/invite/[code]/page.test.tsx`
- Modify: `web/src/app/(public)/invite/[code]/page.tsx`

- [ ] **Step 1: Write the failing invite page tests**

Create `page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitePage from './page';
import { hasSession } from '@/shared/auth/has-session';

vi.mock('@/shared/auth/has-session', () => ({ hasSession: vi.fn() }));
vi.mock('@/features/invitations/invite-accept-panel', () => ({
  InviteAcceptPanel: ({ authenticated, code }: { authenticated?: boolean; code: string }) => (
    <div
      data-testid="invite-panel"
      data-authenticated={String(authenticated)}
      data-code={code}
    />
  ),
}));

describe('InvitePage', () => {
  beforeEach(() => vi.mocked(hasSession).mockReset());

  it.each([
    [true, 'true'],
    [false, 'false'],
  ])('passes optional session state %s to the panel', async (session, expected) => {
    vi.mocked(hasSession).mockResolvedValue(session);
    render(await InvitePage({ params: Promise.resolve({ code: 'abcDEF123_-4' }) }));

    expect(screen.getByTestId('invite-panel')).toHaveAttribute(
      'data-authenticated',
      expected,
    );
  });

  it('preserves the invalid invite-code state for an authenticated session', async () => {
    vi.mocked(hasSession).mockResolvedValue(true);
    render(await InvitePage({ params: Promise.resolve({ code: 'bad code!' }) }));

    expect(screen.getByTestId('invite-panel')).toHaveAttribute('data-code', '');
  });
});
```

- [ ] **Step 2: Run the page test and verify RED**

```powershell
npm test -- "src/app/(public)/invite/[code]/page.test.tsx"
```

Expected: authenticated case fails because the page still passes `false` and never calls `hasSession()`.

- [ ] **Step 3: Wire the server page**

Import the helper:

```ts
import { hasSession } from '@/shared/auth/has-session';
```

Resolve params and session concurrently:

```ts
const [{ code }, authenticated] = await Promise.all([params, hasSession()]);
```

Replace the hardcoded prop with:

```tsx
authenticated={authenticated}
```

- [ ] **Step 4: Run invitation and auth tests and verify GREEN**

```powershell
npm test -- "src/app/(public)/invite/[code]/page.test.tsx" src/features/invitations/invitation-flow.test.tsx src/shared/auth/has-session.test.ts src/shared/auth/require-session.test.ts
```

Expected: all invite component, page, and session tests pass.

- [ ] **Step 5: Commit invite wiring**

```powershell
git add "web/src/app/(public)/invite/[code]/page.tsx" "web/src/app/(public)/invite/[code]/page.test.tsx"
git commit -m "fix(web): reflect session on invite page"
```

### Task 6: Update project records and run full local verification

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the feature map**

Set the update date to `2026-08-30`. In the stabilization backlog, replace the inaccurate create-lock statement with these exact entries:

```md
- [x] Backend: contribution and expense create handlers reject every transaction type, including corrections, when `occurred_on` is inside a completed settlement period
- [ ] Backend: apply the shared settlement-period guard when future PATCH/DELETE transaction endpoints are implemented
- [x] PWA: the public invite page derives authenticated acceptance state from the optional access-token session boundary
```

- [ ] **Step 2: Append the required devlog entry**

Append exactly one new section in the AGENTS.md format:

```md
## 2026-08-30 — Enforce settlement locks and invite session state

**Task:** Fix the Staging acceptance defects that allowed writes into completed settlement periods and hid authenticated invite acceptance.  
**Scope:** backend accounting guard, contribution/expense creation, Web session utilities, public invite page, tests, feature map  
**What changed:**
- Added a shared inclusive completed-settlement period guard returning `LOCKED_PERIOD`.
- Applied the guard to all contribution and expense creation types, including corrections.
- Added optional Web session detection and connected it to the public invite page.
- Added focused regression coverage for accounting and invite-session behavior.
**Decisions:** Preserve authorization errors by checking membership before the period guard; corrections use unlocked dates rather than altering locked history.  
**Known gaps / follow-ups:** PATCH/DELETE transaction endpoints and their lock checks remain future work; Staging acceptance data is retained.
```

- [ ] **Step 3: Run backend verification**

From `backend/`:

```powershell
npm test -- --runInBand
npm run build
```

Expected: every Jest suite passes and Nest compilation exits 0.

- [ ] **Step 4: Run Web verification**

From `web/`:

```powershell
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'; npm run build
```

Expected: lint and typecheck report no errors, all Vitest suites pass, and the production build exits 0.

- [ ] **Step 5: Inspect the final diff and commit records**

```powershell
git diff --check
git status --short
git diff HEAD -- .agents/features.md .agents/devlog.md
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record settlement lock acceptance fixes"
```

Expected: no whitespace errors; the records commit contains only feature-map and devlog updates.

### Task 7: Self-review and Staging acceptance checkpoint

**Files:**
- Review all files changed by Tasks 1-6.
- No new repository file is required.

- [ ] **Step 1: Invoke required review skills**

Use the repository `self-review` skill, then `superpowers:requesting-code-review`. Fix every critical or important finding using a fresh red-green test cycle and repeat focused/full verification for touched areas.

- [ ] **Step 2: Verify branch and commit state**

```powershell
git status --short
git log --oneline -7
```

Expected: clean working tree and separate design, backend guard, contribution, expense, Web session, invite, and documentation commits.

- [ ] **Step 3: Request deployment authorization**

Before pushing or redeploying, present the local verification evidence and request explicit permission to update Mimic Staging. Production remains untouched.

- [ ] **Step 4: Push and wait for all Staging services**

After authorization:

```powershell
git push origin codex/mimic-baseline-railway-safety
railway status --json
```

Expected: `mimic-postgres`, `mimic-api`, and `mimic-web` each report a successful deployment with one running instance. Poll deployment status without changing Production.

- [ ] **Step 5: Repeat private accounting acceptance with a temporary key**

Create and register a uniquely named temporary Railway SSH key only after explicit permission. Connect interactively to `mimic-api`, mint a 15-minute access token in container memory for the existing Staging acceptance owner, and POST a one-minor-unit contribution dated `2026-08-30` with the unique note `post-fix acceptance 20260830 locked-period probe` to fund `94d7ffbe-383b-4934-9ba5-d21d49b9cc40`.

Expected API result:

```json
{
  "http_status": 409,
  "error": "LOCKED_PERIOD",
  "contribution_created": false
}
```

Verify `post-fix acceptance 20260830 locked-period probe` does not exist in the contributions table. Do not alter or delete the earlier acceptance evidence.

- [ ] **Step 6: Verify authenticated invite rendering**

With an authenticated Staging Web session, open a syntactically valid invite URL and verify the existing accept action is rendered. Without an access-token cookie, verify the login/register guidance remains rendered. The invite may be expired or already used; this checkpoint verifies session-dependent rendering, while the BFF remains responsible for acceptance authorization.

- [ ] **Step 7: Remove temporary access and perform final health checks**

Remove the temporary key from Railway first, delete both local key copies, and freshly verify `railway ssh keys list` reports no temporary key. Then verify:

```text
GET https://mimic-web-staging.up.railway.app/api/health/ready -> 200 {"data":{"ok":true}}
```

Report exact service statuses, acceptance results, cleanup evidence, remaining gaps, and the recommendation for the next release gate.
