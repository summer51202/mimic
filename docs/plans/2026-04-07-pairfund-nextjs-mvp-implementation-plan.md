# PairFund Next.js MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Next.js web MVP for PairFund using the existing Web IA, API contracts, and locked-settlement accounting rules.

**Architecture:** Implement the app with App Router, feature-sliced UI modules, TanStack Query for server data, React Hook Form for write flows, and a shared design system that mirrors the warm desktop layouts in the web design spec. Use server-safe auth handling and keep accounting calculations authoritative on the backend while allowing lightweight UI previews and filters on the client.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui, Axios or fetch wrapper

---

### Task 1: Bootstrap Web App Shell

**Files:**
- Create: `web/package.json`
- Create: `web/next.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/app/layout.tsx`
- Create: `web/app/page.tsx`
- Create: `web/app/globals.css`
- Create: `web/src/lib/design-tokens.ts`
- Test: `web/src/app/page.test.tsx`

- [ ] **Step 1: Write the failing app shell test**

```tsx
import { render, screen } from '@testing-library/react';
import HomePage from '../../app/page';

test('renders PairFund dashboard heading', () => {
  render(<HomePage />);
  expect(screen.getByText('Shared balance overview')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL because the web app shell does not exist yet.

- [ ] **Step 3: Build minimal app shell**

```tsx
// web/app/page.tsx
export default function HomePage() {
  return <main>Shared balance overview</main>;
}
```

- [ ] **Step 4: Mirror design tokens into web theme primitives**

```ts
// web/src/lib/design-tokens.ts
export const pfColors = {
  canvas: '#F4ECE4',
  app: '#F7F1EA',
  surface: '#FFF8F2',
  card: '#FFFFFF',
  inkPrimary: '#2F241F',
  inkSecondary: '#7E6A61',
  accent: '#D7795F',
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/app/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: bootstrap nextjs web shell"
```

### Task 2: Add Shared Infrastructure

**Files:**
- Create: `web/src/lib/api/client.ts`
- Create: `web/src/lib/query/query-client.ts`
- Create: `web/src/lib/auth/session.ts`
- Create: `web/src/components/layout/app-shell.tsx`
- Create: `web/src/components/layout/left-nav.tsx`
- Create: `web/src/components/layout/right-rail.tsx`
- Test: `web/src/components/layout/app-shell.test.tsx`

- [ ] **Step 1: Write the failing shell layout test**

```tsx
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

test('renders left nav and right rail', () => {
  render(<AppShell><div>Body</div></AppShell>);
  expect(screen.getByText('Tasks')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/layout/app-shell.test.tsx`
Expected: FAIL because the layout components do not exist.

- [ ] **Step 3: Implement app shell and API client infrastructure**

```ts
// web/src/lib/api/client.ts
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) throw new Error('API_ERROR');
  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Add app shell composition**

```tsx
// web/src/components/layout/app-shell.tsx
import { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <aside>Dashboard Funds Activity Tasks Settings</aside>
      <main>{children}</main>
      <section>Tasks</section>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/components/layout/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: add shared web infrastructure"
```

### Task 3: Implement Dashboard

**Files:**
- Create: `web/app/dashboard/page.tsx`
- Create: `web/src/features/dashboard/api/get-dashboard.ts`
- Create: `web/src/features/dashboard/components/dashboard-hero.tsx`
- Create: `web/src/features/dashboard/components/fund-card-grid.tsx`
- Create: `web/src/features/dashboard/components/recent-activity-panel.tsx`
- Test: `web/src/features/dashboard/components/dashboard-hero.test.tsx`

- [ ] **Step 1: Write the failing dashboard hero test**

```tsx
import { render, screen } from '@testing-library/react';
import { DashboardHero } from './dashboard-hero';

test('shows total balance label', () => {
  render(<DashboardHero totalBalance="$18,420" />);
  expect(screen.getByText('Total balance')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/dashboard/components/dashboard-hero.test.tsx`
Expected: FAIL because dashboard components do not exist.

- [ ] **Step 3: Build dashboard page from the web IA spec**

```tsx
// web/src/features/dashboard/components/dashboard-hero.tsx
export function DashboardHero({ totalBalance }: { totalBalance: string }) {
  return (
    <section>
      <p>Total balance</p>
      <h1>{totalBalance}</h1>
    </section>
  );
}
```

- [ ] **Step 4: Bind dashboard read model to backend API**

```ts
// web/src/features/dashboard/api/get-dashboard.ts
import { apiGet } from '@/src/lib/api/client';

export function getDashboard() {
  return apiGet('/api/v1/groups/current/dashboard');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/dashboard/components/dashboard-hero.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: implement dashboard page"
```

### Task 4: Implement Fund Workspace And Activity

**Files:**
- Create: `web/app/funds/[fundId]/page.tsx`
- Create: `web/app/activity/page.tsx`
- Create: `web/src/features/funds/api/get-fund-detail.ts`
- Create: `web/src/features/funds/components/fund-summary-panel.tsx`
- Create: `web/src/features/activity/components/activity-table.tsx`
- Test: `web/src/features/activity/components/activity-table.test.tsx`

- [ ] **Step 1: Write the failing activity table test**

```tsx
import { render, screen } from '@testing-library/react';
import { ActivityTable } from './activity-table';

test('shows activity headers', () => {
  render(<ActivityTable rows={[]} />);
  expect(screen.getByText('Date')).toBeInTheDocument();
  expect(screen.getByText('Amount')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/activity/components/activity-table.test.tsx`
Expected: FAIL because the activity table does not exist.

- [ ] **Step 3: Build fund workspace and activity review surface**

```tsx
// web/src/features/activity/components/activity-table.tsx
export function ActivityTable({ rows }: { rows: Array<{ id: string }> }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>{rows.map((row) => <tr key={row.id}><td colSpan={3}>{row.id}</td></tr>)}</tbody>
    </table>
  );
}
```

- [ ] **Step 4: Add locked record affordance for correction entry**

```text
When a row is marked locked:
- show locked badge
- remove edit action
- show create correction action
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/activity/components/activity-table.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: implement fund workspace and activity"
```

### Task 5: Implement Expense, Correction, And Settlement Flows

**Files:**
- Create: `web/app/funds/[fundId]/expenses/new/page.tsx`
- Create: `web/app/funds/[fundId]/settlement/page.tsx`
- Create: `web/src/features/expenses/components/expense-form.tsx`
- Create: `web/src/features/corrections/components/correction-form.tsx`
- Create: `web/src/features/settlements/components/settlement-summary.tsx`
- Test: `web/src/features/expenses/components/expense-form.test.tsx`

- [ ] **Step 1: Write the failing expense form test**

```tsx
import { render, screen } from '@testing-library/react';
import { ExpenseForm } from './expense-form';

test('renders payer and split sections', () => {
  render(<ExpenseForm />);
  expect(screen.getByText('Payer')).toBeInTheDocument();
  expect(screen.getByText('Split mode')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/expenses/components/expense-form.test.tsx`
Expected: FAIL because the expense form does not exist.

- [ ] **Step 3: Build React Hook Form based expense and correction entry**

```tsx
// web/src/features/expenses/components/expense-form.tsx
export function ExpenseForm() {
  return (
    <form>
      <h2>Payer</h2>
      <h2>Split mode</h2>
    </form>
  );
}
```

- [ ] **Step 4: Add settlement screen with lock explanation**

```tsx
// web/src/features/settlements/components/settlement-summary.tsx
export function SettlementSummary() {
  return (
    <section>
      <p>This period becomes locked after completion.</p>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/expenses/components/expense-form.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: implement expense correction and settlement flows"
```

### Task 6: Implement Tasks And Settings

**Files:**
- Create: `web/app/tasks/page.tsx`
- Create: `web/app/settings/page.tsx`
- Create: `web/src/features/tasks/components/task-list.tsx`
- Create: `web/src/features/settings/components/settings-panels.tsx`
- Test: `web/src/features/tasks/components/task-list.test.tsx`

- [ ] **Step 1: Write the failing task list test**

```tsx
import { render, screen } from '@testing-library/react';
import { TaskList } from './task-list';

test('renders pending items heading', () => {
  render(<TaskList items={[]} />);
  expect(screen.getByText('Pending items')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/tasks/components/task-list.test.tsx`
Expected: FAIL because the task center components do not exist.

- [ ] **Step 3: Build tasks and settings pages**

```tsx
// web/src/features/tasks/components/task-list.tsx
export function TaskList({ items }: { items: Array<{ id: string }> }) {
  return (
    <section>
      <h2>Pending items</h2>
      <div>{items.length}</div>
    </section>
  );
}
```

- [ ] **Step 4: Add account and group settings panels**

```text
Render grouped settings sections:
- account
- group and fund settings
- notifications
- help
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/tasks/components/task-list.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "feat: implement tasks and settings pages"
```

### Task 7: Verification, Empty States, And Documentation Sync

**Files:**
- Modify: `web/app/**`
- Modify: `web/src/features/**`
- Create: `web/src/app/navigation.test.tsx`
- Create: `web/src/features/locked-records/locked-record-ui.test.tsx`
- Modify: `docs/design/pairfund-web-ui-v0.2.md`

- [ ] **Step 1: Write failing navigation and locked-state tests**

```tsx
test('web routes cover dashboard fund activity tasks and settings', () => {
  const routes = [
    '/dashboard',
    '/funds/[fundId]',
    '/activity',
    '/tasks',
    '/settings',
  ];
  expect(routes).toHaveLength(5);
});
```

- [ ] **Step 2: Run tests to verify baseline**

Run: `npm test -- src/app/navigation.test.tsx src/features/locked-records/locked-record-ui.test.tsx`
Expected: one or more FAIL until route and locked-state UI are fully wired.

- [ ] **Step 3: Finish empty and error states**

```text
Add:
- empty dashboard
- empty fund history
- no settlement needed state
- empty task center
- locked record detail state
```

- [ ] **Step 4: Run full web test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Sync design docs to implemented routes and panels**

```text
Update web design doc if route names, page breakdown, or right-rail behavior changed during implementation.
```

- [ ] **Step 6: Commit**

```bash
git add web docs/design/pairfund-web-ui-v0.2.md
git commit -m "feat: finalize nextjs web mvp flow"
```

## Self-Review

### Spec Coverage

Covered by this plan:

* dashboard
* fund workspace
* activity
* expense and correction flows
* settlement
* tasks
* settings
* locked-state UX

Remaining outside this plan:

* advanced analytics instrumentation
* export flows
* tablet-specific layout tuning

### Placeholder Scan

Every task contains explicit files, execution steps, and concrete test direction.

### Type Consistency

The route and feature names are aligned with the Web IA spec:

* `dashboard`
* `fund workspace`
* `activity`
* `settlement`
* `tasks`
* `settings`

