# mimic PWA Groups, Funds, and Pixel World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated preview shell with a secure, real-data group and fund experience whose phone and desktop interfaces match the approved complete pixel-game direction.

**Architecture:** Next.js App Router renders private reads through focused server query modules and sends browser mutations through a CSRF-protected same-origin BFF. NestJS remains authoritative for membership, invitation, fund, and dashboard rules; its affected minor-unit fields cross the API boundary as signed decimal strings. One shared component system renders a compact mobile adventure interface and an expanded desktop HUD.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, CSS Modules, NestJS, Prisma/PostgreSQL, Flutter/Dart compatibility mappers, Vitest/Testing Library, Jest/Supertest, Playwright, Serwist

---

## File Structure

The implementation is divided into these ownership boundaries:

- `backend/src/modules/funds/`: membership authorization and canonical decimal-string money responses
- `mobile/lib/features/**/data/remote/`: temporary cross-platform compatibility with the canonical money contract
- `web/src/shared/api/`: parsed domain contracts, private server reads, and shared BFF forwarding
- `web/src/shared/finance/`: minor-unit parsing and display
- `web/src/shared/navigation/`: responsive pixel application shell and selected-group navigation
- `web/src/shared/ui/`: reusable pixel controls, frames, dialogs, notices, and state surfaces
- `web/src/features/groups/`: group queries, forms, roster, selection, rename, and leave
- `web/src/features/invitations/`: create, share, return, accept, and terminal states
- `web/src/features/funds/`: fund creation, listing, dashboard cards, and summary
- `web/public/pixel-ui/`: fixed-grid interface, avatar, scene, and Mimiku assets with provenance

## Task 1: Secure and Stabilize Fund API Contracts

**Files:**
- Create: `backend/src/modules/funds/funds.service.spec.ts`
- Modify: `backend/src/modules/funds/funds.service.ts`
- Modify: `backend/src/modules/funds/funds.controller.ts`
- Modify: `backend/src/modules/funds/fund-summary.types.ts`
- Modify: `backend/src/modules/funds/fund-summary.service.ts`
- Modify: `backend/src/modules/funds/fund-summary.service.spec.ts`
- Modify: `backend/test/fund-dashboard.e2e-spec.ts`
- Modify: `mobile/lib/features/groups/data/group_repository.dart`
- Modify: `mobile/lib/features/home/data/remote/home_remote_mapper.dart`
- Modify: `mobile/lib/features/home/data/remote/group_dashboard_remote_mapper.dart`
- Modify: `mobile/lib/features/funds/data/remote/fund_remote_mapper.dart`
- Modify: `mobile/test/features/groups/group_repository_test.dart`
- Modify: `mobile/test/features/home/home_repository_test.dart`
- Modify: `mobile/test/features/funds/fund_repository_test.dart`

- [ ] **Step 1: Write failing fund authorization tests**

Create `funds.service.spec.ts` with a Prisma mock and these cases:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { FundsService } from './funds.service';

describe('FundsService authorization', () => {
  const prisma = {
    group: { findFirst: jest.fn() },
    fund: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  };
  const service = new FundsService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('rejects fund creation by an outsider', async () => {
    prisma.group.findFirst.mockResolvedValue({ id: 'group-1', members: [] });
    await expect(
      service.createFund('group-1', 'outsider', {
        name: '旅行基金',
        currency: 'TWD',
      }),
    ).rejects.toEqual(new ForbiddenException('GROUP_ACCESS_DENIED'));
    expect(prisma.fund.create).not.toHaveBeenCalled();
  });

  it('lists funds for an active member', async () => {
    prisma.group.findFirst.mockResolvedValue({
      id: 'group-1',
      members: [{ userId: 'member-1', status: MemberStatus.ACTIVE }],
    });
    prisma.fund.findMany.mockResolvedValue([]);
    await expect(service.listFunds('group-1', 'member-1')).resolves.toEqual([]);
  });

  it('returns GROUP_NOT_FOUND before membership checks', async () => {
    prisma.group.findFirst.mockResolvedValue(null);
    await expect(service.listFunds('missing', 'member-1')).rejects.toEqual(
      new NotFoundException('GROUP_NOT_FOUND'),
    );
  });
});
```

- [ ] **Step 2: Run the focused backend tests and confirm failure**

Run:

```powershell
Set-Location backend
npm test -- --runInBand --testPathPattern=funds.service.spec
```

Expected: FAIL because `listFunds` does not accept an actor and `createFund` does not authorize membership.

- [ ] **Step 3: Implement one reusable active-member guard in `FundsService`**

Use `GroupStatus.ACTIVE`, `MemberStatus.ACTIVE`, `NotFoundException`, and `ForbiddenException`. The guard must distinguish a missing/inactive group from an outsider:

```ts
private async assertActiveMember(groupId: string, actorUserId: string) {
  const group = await this.prisma.group.findFirst({
    where: { id: groupId, status: GroupStatus.ACTIVE },
    select: {
      id: true,
      members: {
        where: { userId: actorUserId, status: MemberStatus.ACTIVE },
        select: { userId: true },
      },
    },
  });
  if (!group) throw new NotFoundException('GROUP_NOT_FOUND');
  if (group.members.length === 0) {
    throw new ForbiddenException('GROUP_ACCESS_DENIED');
  }
}
```

Call it before `fund.create`, before group fund listing, and before returning legacy fund detail. Change controller signatures to pass `user.userId` to every affected service method.

- [ ] **Step 4: Write failing canonical money serialization tests**

Add assertions to `fund-dashboard.e2e-spec.ts` and controller unit coverage that all affected minor-unit fields are strings:

```ts
expect(response.body.data.currencies[0]).toMatchObject({
  cash_balance_minor: '12500',
  current: {
    net_change_minor: '2500',
    contribution_minor: '5000',
    expense_minor: '2500',
  },
});
expect(response.body.data.currencies[0].current.member_positions[0])
  .toMatchObject({ position_minor: '1500' });
```

Cover list-fund `balance_minor`, fund summary, group dashboard totals, fund entries, and member positions.

- [ ] **Step 5: Serialize minor units at the controller boundary**

Add one exact helper and apply it to every minor-unit response field:

```ts
function minorUnit(value: number | bigint): string {
  return BigInt(value).toString(10);
}
```

Keep internal accounting calculations unchanged. The JSON boundary becomes canonical signed base-10 strings.

- [ ] **Step 6: Make Flutter mappers accept canonical integer strings**

Centralize parsing in each mapper file with:

```dart
int _minorUnit(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num && value.isFinite && value == value.truncate()) {
    return value.toInt();
  }
  if (value is String) {
    final parsed = int.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('$key must be a base-10 integer minor-unit value');
}
```

Replace direct `as num` reads for the changed API fields. Keep the existing mobile model types as `int`.

- [ ] **Step 7: Add Flutter compatibility fixtures**

Change remote repository fixtures to use string values such as `'6400'`, `'-800'`, and `'0'`. Preserve at least one numeric fixture per mapper during the migration window and assert both representations map to the same model.

- [ ] **Step 8: Run backend and Flutter verification**

Run:

```powershell
Set-Location backend
npm test -- --runInBand --testPathPattern="funds.service.spec|fund-summary.service.spec"
npm run test:e2e -- --runInBand --testPathPattern=fund-dashboard.e2e-spec
Set-Location ..\mobile
flutter test test/features/groups/group_repository_test.dart
flutter test test/features/home/home_repository_test.dart
flutter test test/features/funds/fund_repository_test.dart
```

Expected: all focused tests pass. If Flutter hangs in the known local environment, record the exact command and timeout in the final devlog instead of claiming it passed.

- [ ] **Step 9: Commit**

```powershell
git add backend/src/modules/funds backend/test/fund-dashboard.e2e-spec.ts mobile/lib/features mobile/test/features
git commit -m "fix(api): secure fund reads and stabilize money contracts"
```

## Task 2: Add Parsed Web Domain Contracts and Finance Formatting

**Files:**
- Create: `web/src/shared/api/domain-contracts.ts`
- Create: `web/src/shared/api/domain-contracts.test.ts`
- Create: `web/src/shared/finance/minor-unit.ts`
- Create: `web/src/shared/finance/minor-unit.test.ts`
- Create: `web/src/shared/navigation/safe-return-to.ts`
- Create: `web/src/shared/navigation/safe-return-to.test.ts`
- Create: `web/src/features/groups/group-selection.ts`
- Create: `web/src/features/groups/group-selection.test.ts`

- [ ] **Step 1: Write failing contract parser tests**

Use Zod parsers rather than TypeScript-only assertions:

```ts
import { describe, expect, it } from 'vitest';
import {
  groupDashboardSchema,
  groupSchema,
  inviteAcceptResultSchema,
} from './domain-contracts';

it('parses canonical group dashboard money strings', () => {
  const parsed = groupDashboardSchema.parse({
    group: { id: 'g1', name: '生活基金', default_currency: 'TWD' },
    currencies: [{
      currency: 'TWD',
      cash_balance_minor: '24680',
      current: {
        net_change_minor: '0',
        contribution_minor: '0',
        expense_minor: '0',
        member_positions: [],
      },
      all_time: {
        net_change_minor: '24680',
        contribution_minor: '24680',
        expense_minor: '0',
        member_positions: [],
      },
      funds: [],
    }],
  });
  expect(parsed.currencies[0].cash_balance_minor).toBe('24680');
});

it('rejects decimal and exponential minor units', () => {
  expect(() => groupDashboardSchema.parse({
    group: { id: 'g1', name: 'x', default_currency: 'TWD' },
    currencies: [{ currency: 'TWD', cash_balance_minor: '1e3' }],
  })).toThrow();
});

it('parses group and invite acceptance identities', () => {
  expect(groupSchema.parse({
    id: 'g1', name: '共同寶庫', group_type: 'couple',
    default_currency: 'TWD', status: 'active',
  }).id).toBe('g1');
  expect(inviteAcceptResultSchema.parse({
    group_id: 'g1', group_name: '共同寶庫',
    role: 'member', joined_at: '2026-07-29T00:00:00.000Z',
  }).group_id).toBe('g1');
});
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
Set-Location web
npm test -- src/shared/api/domain-contracts.test.ts
```

Expected: FAIL because the parsers do not exist.

- [ ] **Step 3: Implement exact shared schemas**

Define and export schemas for:

- `groupSchema`
- `groupDetailSchema`
- `memberSchema`
- `inviteCreatedSchema`
- `inviteAcceptResultSchema`
- `fundSchema`
- `periodTotalsSchema`
- `fundSummarySchema`
- `groupDashboardSchema`

Use these primitives:

```ts
export const idSchema = z.string().trim().min(1).max(128);
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const minorUnitSchema = z.string().regex(/^-?(0|[1-9]\d*)$/);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

Infer exported TypeScript types with `z.infer`.

- [ ] **Step 4: Write failing money and navigation tests**

```ts
expect(formatMinorUnit('24680', 'TWD', 'zh-TW')).toBe('$24,680');
expect(formatMinorUnit('-860', 'TWD', 'zh-TW')).toBe('-$860');
expect(() => parseMinorUnit('1.25')).toThrow();
expect(safeReturnTo('/invite/abc?source=mail', '/app')).toBe('/invite/abc?source=mail');
expect(safeReturnTo('https://evil.example', '/app')).toBe('/app');
expect(selectGroupId('g2', 'g1', [{ id: 'g1' }, { id: 'g2' }])).toBe('g2');
expect(selectGroupId('missing', 'g1', [{ id: 'g2' }])).toBe('g2');
```

- [ ] **Step 5: Implement finance, return URL, and group selection helpers**

`parseMinorUnit` returns `bigint`. `formatMinorUnit` derives currency fraction digits from `Intl.NumberFormat(...).resolvedOptions()`, inserts the decimal digits with string arithmetic, and passes only the integer/decimal text required for display. It must never call `Number()` on the full minor-unit value.

`safeReturnTo` accepts only same-origin relative paths beginning with `/app` or `/invite/`, rejects `//`, backslashes, control characters, and encoded control characters.

`selectGroupId` uses URL choice, remembered choice, then first active group in that order.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/shared/api/domain-contracts.test.ts src/shared/finance/minor-unit.test.ts src/shared/navigation/safe-return-to.test.ts src/features/groups/group-selection.test.ts
npm run typecheck
git add web/src/shared web/src/features/groups/group-selection*
git commit -m "feat(web): add group fund contracts and money formatting"
```

## Task 3: Build the Authenticated BFF and Server Query Boundary

**Files:**
- Create: `web/src/shared/api/authenticated-api.ts`
- Create: `web/src/shared/api/authenticated-api.test.ts`
- Create: `web/src/shared/api/authenticated-server-api.ts`
- Create: `web/src/shared/api/authenticated-server-api.test.ts`
- Create: `web/src/shared/api/app-route.ts`
- Create: `web/src/shared/api/app-route.test.ts`
- Create: `web/src/app/api/app/groups/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/members/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/leave/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/invites/route.ts`
- Create: `web/src/app/api/app/group-invites/accept/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/funds/route.ts`
- Create: `web/src/app/api/app/groups/[groupId]/dashboard/route.ts`
- Create: `web/src/app/api/app/funds/[fundId]/summary/route.ts`

- [ ] **Step 1: Write failing authenticated request tests**

Cover access-cookie forwarding, missing-session 401, CSRF enforcement for mutations, no token leakage, request ID propagation, and error mapping:

```ts
it('forwards the access cookie only as authorization', async () => {
  const request = new Request('http://localhost/api/app/groups', {
    headers: { cookie: 'mimic_access=header.payload.signature' },
  });
  await authenticatedApi(request, '/groups', { method: 'GET' });
  expect(requestToApi).toHaveBeenCalledWith('/groups', expect.objectContaining({
    accessToken: 'header.payload.signature',
    method: 'GET',
  }));
});

it('rejects a mutation without matching csrf', async () => {
  const response = await forwardAppRoute(
    new Request('http://localhost/api/app/groups', { method: 'POST' }),
    '/groups',
    { body: 'json' },
  );
  expect(response.status).toBe(403);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
npm test -- src/shared/api/authenticated-api.test.ts src/shared/api/authenticated-server-api.test.ts src/shared/api/app-route.test.ts
```

- [ ] **Step 3: Implement the server-only authenticated API**

`authenticatedApi<T>` reads `mimic_access` from an incoming BFF `Request`, forwards `x-request-id`, calls `requestToApi<T>` with `cache: "no-store"`, and throws `ApiError(401, "SESSION_REQUIRED")` when access is absent.

`authenticatedServerApi<T>` reads the same access cookie with `cookies()` and the incoming request ID with `headers()` for Server Component reads. Neither helper refreshes inside a data request; the existing controlled refresh redirect remains the single refresh path.

- [ ] **Step 4: Implement one whitelist forwarding helper**

`forwardAppRoute` must:

```ts
export async function forwardAppRoute(
  request: Request,
  upstreamPath: string,
  options: { body: 'json' | 'none' },
): Promise<NextResponse> {
  const method = request.method as 'GET' | 'POST' | 'PATCH' | 'DELETE';
  if (method !== 'GET' && !hasValidCsrf(request)) {
    return csrfRejectedResponse();
  }
  const body = options.body === 'json'
    ? await readJsonRequestBody(request)
    : undefined;
  if (options.body === 'json' && typeof body === 'undefined') {
    return invalidJsonResponse();
  }
  try {
    const data = await authenticatedApi(request, upstreamPath, { method, body });
    return NextResponse.json({ data }, {
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (error) {
    return appRouteErrorResponse(error);
  }
}
```

Map `ApiError`, configuration, contract, and connectivity failures to the existing `{ error: { code } }` shape. Include `x-request-id` in error responses when present.

- [ ] **Step 5: Add only explicit route handlers**

Each route exports only allowed verbs and builds upstream paths from awaited, decoded Next.js params. Reject IDs that fail `idSchema` before forwarding. Use `{ body: 'none' }` for GET and bodyless leave requests, and `{ body: 'json' }` for JSON mutations. Do not create a generic arbitrary-path proxy.

- [ ] **Step 6: Verify private caching policy**

Extend `web/src/app/pwa-cache-policy.test.ts` to assert `/api/app/**` and `/app/**` are excluded. Test every BFF response for `Cache-Control: private, no-store`.

- [ ] **Step 7: Verify and commit**

```powershell
npm test -- src/shared/api/authenticated-api.test.ts src/shared/api/authenticated-server-api.test.ts src/shared/api/app-route.test.ts src/app/pwa-cache-policy.test.ts
npm run typecheck
npm run build
git add web/src/shared/api web/src/app/api/app web/src/app/pwa-cache-policy.test.ts
git commit -m "feat(web): add authenticated group and fund BFF"
```

## Task 4: Produce the Complete Pixel UI Asset and Primitive Set

**Files:**
- Create: `web/public/pixel-ui/README.md`
- Create: `web/public/pixel-ui/mimiku-dashboard.png`
- Create: `web/public/pixel-ui/mimiku-empty-group.png`
- Create: `web/public/pixel-ui/mimiku-empty-fund.png`
- Create: `web/public/pixel-ui/mimiku-invite.png`
- Create: `web/public/pixel-ui/mimiku-success.png`
- Create: `web/public/pixel-ui/mimiku-serious.png`
- Create: `web/public/pixel-ui/treasury-mobile.png`
- Create: `web/public/pixel-ui/treasury-desktop.png`
- Create: `web/public/pixel-ui/avatar-01.png`
- Create: `web/public/pixel-ui/avatar-02.png`
- Create: `web/public/pixel-ui/avatar-03.png`
- Create: `web/public/pixel-ui/avatar-04.png`
- Create: `web/public/pixel-ui/icons-ui.png`
- Create: `web/public/pixel-ui/frames-ui.png`
- Create: `web/src/shared/brand/pixel-ui-assets.ts`
- Create: `web/src/shared/brand/pixel-ui-assets.test.ts`
- Create: `web/src/shared/ui/pixel-frame.tsx`
- Create: `web/src/shared/ui/pixel-frame.module.css`
- Create: `web/src/shared/ui/pixel-field.tsx`
- Create: `web/src/shared/ui/pixel-dialog.tsx`
- Create: `web/src/shared/ui/pixel-notice.tsx`
- Create: `web/src/shared/ui/pixel-ui.test.tsx`
- Modify: `web/src/shared/ui/pixel-button.tsx`
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Write failing asset inventory and primitive tests**

```ts
expect(pixelUiAssets.mimiku.dashboard).toBe('/pixel-ui/mimiku-dashboard.png');
expect(pixelUiAssets.avatars).toHaveLength(4);
for (const path of Object.values(pixelUiAssets.mimiku)) {
  expect(existsSync(join(process.cwd(), 'public', path))).toBe(true);
}
```

Component tests assert visible focus classes, dialog title/description wiring, field error association, and accessible names for icon-only controls.

- [ ] **Step 2: Run tests and confirm missing assets/components**

```powershell
npm test -- src/shared/brand/pixel-ui-assets.test.ts src/shared/ui/pixel-ui.test.tsx
```

- [ ] **Step 3: Generate the coherent asset family from the approved references**

Use the `imagegen` skill during execution. Supply both `icon.png` and the approved reference screenshot. Start with one model sheet and one UI sheet before exporting cutouts.

Invariant prompt:

```text
Create a production pixel-art asset sheet for mimic, a cooperative shared-finance PWA. Match the approved complete pixel-game interface reference. Preserve Mimiku's treasure-chest body, offset expressive eyes, dark navy outline, warm wood, gold hardware, teeth, and gold heart coin. Use one fixed pixel grid, one palette, identical anatomy and outline weight across dashboard, empty group, empty fund, invitation, success, and serious states. Also include four friendly human avatar archetypes and interface icons for overview, group, members, fund, invite, settings, notification, currency, copy, share, edit, leave, success, warning, and error. Crisp nearest-neighbor pixels, transparent background, no text, no watermark, no gradients, no skull emphasis.
```

Reject sheets with inconsistent eyes, teeth, coin, outline width, or non-pixel antialiasing.

- [ ] **Step 4: Export exact assets and document provenance**

Record source references, prompt, source grid, palette, export dimensions, intended integer display scales, and sprite/icon coordinates in `README.md`. Preserve root `icon.png` byte-for-byte.

- [ ] **Step 5: Implement reusable primitives**

`PixelFrame` provides `treasury`, `panel`, and `dialog` variants. `PixelField` owns label, description, input, and error IDs. `PixelDialog` uses the native `<dialog>` element or an equivalent accessible modal with focus restoration and Escape handling. `PixelNotice` supports `info`, `success`, `warning`, and `error`.

Extend tokens with named roles for dark HUD, coin action, wood accent, heart critical, grass success, sky info, warm surface, frame highlight, and stepped shadow. No component hardcodes raw palette values.

- [ ] **Step 6: Verify visual assets**

Run:

```powershell
npm test -- src/shared/brand/pixel-ui-assets.test.ts src/shared/ui/pixel-ui.test.tsx
npm run lint
npm run typecheck
```

Open every image at 100%, 200%, and intended UI size. Confirm transparent edges, consistent anatomy, no embedded text, and crisp integer scaling.

- [ ] **Step 7: Commit**

```powershell
git add web/public/pixel-ui web/src/shared/brand web/src/shared/ui web/src/styles/tokens.css web/src/app/globals.css
git commit -m "feat(web): add complete mimic pixel UI system"
```

## Task 5: Replace the Preview Shell with the Responsive Treasury Dashboard

**Files:**
- Create: `web/src/features/groups/group-queries.ts`
- Create: `web/src/features/groups/group-queries.test.ts`
- Create: `web/src/features/groups/group-switcher.tsx`
- Create: `web/src/features/groups/group-switcher.test.tsx`
- Create: `web/src/features/groups/treasury-dashboard.tsx`
- Create: `web/src/features/groups/treasury-dashboard.module.css`
- Create: `web/src/features/groups/treasury-dashboard.test.tsx`
- Create: `web/src/shared/navigation/pixel-app-shell.tsx`
- Create: `web/src/shared/navigation/pixel-app-shell.module.css`
- Create: `web/src/app/api/app/preferences/group/route.ts`
- Create: `web/src/app/api/app/preferences/group/route.test.ts`
- Modify: `web/src/shared/navigation/app-navigation.tsx`
- Modify: `web/src/shared/navigation/app-navigation.module.css`
- Modify: `web/src/app/app/layout.tsx`
- Modify: `web/src/app/app/page.tsx`

- [ ] **Step 1: Write failing query and dashboard tests**

Mock `authenticatedApi` and assert parsers are applied. Dashboard tests cover:

```tsx
render(<TreasuryDashboard groups={[]} selectedGroupId={null} dashboard={null} />);
expect(screen.getByRole('heading', { name: '建立你們的共同寶庫' })).toBeVisible();
expect(screen.getByRole('link', { name: '建立群組' })).toHaveAttribute(
  'href', '/app/groups/new',
);

render(<TreasuryDashboard
  groups={[group]}
  selectedGroupId="g1"
  dashboard={dashboard}
/>);
expect(screen.getByText('$24,680')).toBeVisible();
expect(screen.getByRole('link', { name: '生活基金' }))
  .toHaveAttribute('href', '/app/funds/f1');
expect(screen.queryByText('近期支出')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
npm test -- src/features/groups/group-queries.test.ts src/features/groups/group-switcher.test.tsx src/features/groups/treasury-dashboard.test.tsx
```

- [ ] **Step 3: Implement parsed server queries**

Export:

```ts
export async function listGroups(): Promise<Group[]>;
export async function getGroup(groupId: string): Promise<GroupDetail>;
export async function listMembers(groupId: string): Promise<Member[]>;
export async function getGroupDashboard(groupId: string): Promise<GroupDashboard>;
```

No query accepts a browser `Request`. Every query calls `authenticatedServerApi`, parses with the Task 2 schema, and never returns unvalidated upstream JSON.

- [ ] **Step 4: Implement selected-group dashboard routing**

`/app` reads awaited `searchParams.group`, the `mimic_group` preference cookie, and active groups. It calls `selectGroupId` and fetches the selected dashboard. `POST /api/app/preferences/group` accepts `{ group_id }`, confirms the ID exists in the authenticated group list, and writes a `Secure`-in-production, `SameSite=Lax`, non-HttpOnly preference cookie. An invalid group never produces a client-side authorization bypass.

- [ ] **Step 5: Implement mobile and desktop shells**

Phone: dark top bar, one-column treasury, fixed bottom navigation.

Desktop: dark top bar, persistent quest rail, wide treasury frame, member and fund columns.

Use the same children and route data. Remove all preview copy and disabled placeholder panels.

- [ ] **Step 6: Verify dashboard behavior**

```powershell
npm test -- src/features/groups/group-queries.test.ts src/features/groups/group-switcher.test.tsx src/features/groups/treasury-dashboard.test.tsx src/shared/navigation/app-navigation.test.tsx
npm run lint
npm run typecheck
npm run build
```

- [ ] **Step 7: Commit**

```powershell
git add web/src/features/groups web/src/shared/navigation web/src/app/app web/src/app/api/app/preferences
git commit -m "feat(web): add real pixel treasury dashboard"
```

## Task 6: Deliver Group Creation, Detail, Rename, Roster, and Leave

**Files:**
- Create: `web/src/features/groups/group-schema.ts`
- Create: `web/src/features/groups/group-form.tsx`
- Create: `web/src/features/groups/group-form.test.tsx`
- Create: `web/src/features/groups/group-list.tsx`
- Create: `web/src/features/groups/group-detail.tsx`
- Create: `web/src/features/groups/member-roster.tsx`
- Create: `web/src/features/groups/leave-group-dialog.tsx`
- Create: `web/src/features/groups/group-actions.test.tsx`
- Create: `web/src/app/app/groups/page.tsx`
- Create: `web/src/app/app/groups/new/page.tsx`
- Create: `web/src/app/app/groups/[groupId]/page.tsx`

- [ ] **Step 1: Write failing group schema and interaction tests**

Cover trimmed name, `couple|group`, uppercase three-letter currency, duplicate-submit lock, backend field errors, rename permissions, direct leave confirmation, success routing, and failure preservation.

```ts
expect(createGroupSchema.parse({
  name: '  我們的生活基金  ',
  groupType: 'couple',
  defaultCurrency: 'twd',
})).toEqual({
  name: '我們的生活基金',
  groupType: 'couple',
  defaultCurrency: 'TWD',
});
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
npm test -- src/features/groups/group-form.test.tsx src/features/groups/group-actions.test.tsx
```

- [ ] **Step 3: Implement group pages and forms**

POST payload:

```ts
{
  name: values.name,
  group_type: values.groupType,
  default_currency: values.defaultCurrency,
}
```

PATCH payload:

```ts
{ name: values.name }
```

After create, route to `/app/groups/{id}`. After rename, refresh group detail and dashboard. The member roster uses deterministic avatar variants and literal owner/member role labels.

- [ ] **Step 4: Implement serious leave behavior**

The dialog names the group and states that NestJS will reject departure when reconciliation rules are not satisfied. POST once to `/api/app/groups/{id}/leave`. On success, clear `mimic_group`, route to `/app`, and refresh. On failure, keep the dialog open and show mapped recovery text.

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- src/features/groups/group-form.test.tsx src/features/groups/group-actions.test.tsx
npm run lint
npm run typecheck
git add web/src/features/groups web/src/app/app/groups
git commit -m "feat(web): add group management journeys"
```

## Task 7: Deliver the Complete Invitation Loop

**Files:**
- Create: `web/src/features/invitations/invite-schema.ts`
- Create: `web/src/features/invitations/invite-errors.ts`
- Create: `web/src/features/invitations/invite-create-panel.tsx`
- Create: `web/src/features/invitations/invite-share-panel.tsx`
- Create: `web/src/features/invitations/invite-accept-panel.tsx`
- Create: `web/src/features/invitations/invitation-flow.test.tsx`
- Create: `web/src/app/app/groups/[groupId]/invite/page.tsx`
- Modify: `web/src/app/(public)/invite/[code]/page.tsx`
- Modify: `web/src/features/auth/auth-form.tsx`
- Modify: `web/src/features/auth/auth-form.test.tsx`

- [ ] **Step 1: Write failing invitation tests**

Cover optional normalized email, generated expiry display, copy fallback, Web Share availability, safe auth return, explicit acceptance, duplicate-submit lock, and these exact codes:

```ts
const inviteMessages = {
  INVITE_NOT_FOUND: '這個邀請不存在或已失效。',
  INVITE_ALREADY_USED: '這個邀請已經使用過。',
  INVITE_EXPIRED: '這個邀請已過期，請管理者重新產生。',
  INVITE_EMAIL_MISMATCH: '請使用受邀的電子郵件帳號登入。',
  ALREADY_GROUP_MEMBER: '你已經是這個群組的成員。',
} as const;
```

Also assert invite codes match `/^[A-Za-z0-9_-]{12}$/` before any request is sent.

- [ ] **Step 2: Run tests and confirm failure**

```powershell
npm test -- src/features/invitations/invitation-flow.test.tsx src/features/auth/auth-form.test.tsx
```

- [ ] **Step 3: Implement create and share**

POST `{ invited_email?: string }` to the group invite BFF. Build the URL with `new URL(`/invite/${code}`, location.origin)`. Prefer `navigator.share` only after an explicit click; always provide a copy button and selected-text fallback.

- [ ] **Step 4: Implement safe public entry and authentication return**

The public route validates the code shape and displays no group or member data. Logged-out users receive login and registration links with:

```ts
const returnTo = `/invite/${encodeURIComponent(code)}`;
const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
```

Move auth return validation to the shared `safe-return-to.ts` helper so `/invite/` is accepted and external origins remain rejected.

- [ ] **Step 5: Implement explicit acceptance**

Only the signed-in accept button POSTs `{ invite_code: code }`. On success route to `/app/groups/{group_id}` and refresh. Render each known terminal state with direct text and the corresponding Mimiku static state.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/features/invitations/invitation-flow.test.tsx src/features/auth/auth-form.test.tsx
npm run lint
npm run typecheck
npm run build
git add web/src/features/invitations web/src/features/auth web/src/app
git commit -m "feat(web): complete the mimic invitation loop"
```

## Task 8: Deliver Fund Creation, Listing, Dashboard Cards, and Summary

**Files:**
- Create: `web/src/features/funds/fund-schema.ts`
- Create: `web/src/features/funds/fund-queries.ts`
- Create: `web/src/features/funds/fund-queries.test.ts`
- Create: `web/src/features/funds/fund-form.tsx`
- Create: `web/src/features/funds/fund-form.test.tsx`
- Create: `web/src/features/funds/fund-list.tsx`
- Create: `web/src/features/funds/fund-ledger-card.tsx`
- Create: `web/src/features/funds/fund-summary.tsx`
- Create: `web/src/features/funds/fund-summary.module.css`
- Create: `web/src/features/funds/fund-summary.test.tsx`
- Create: `web/src/app/app/groups/[groupId]/funds/new/page.tsx`
- Create: `web/src/app/app/funds/[fundId]/page.tsx`

- [ ] **Step 1: Write failing fund tests**

Cover name/currency normalization, duplicate submission, create success routing, empty current period, multiple currencies, signed member positions, and absence of transaction actions.

```tsx
expect(screen.getByText('本期尚無交易')).toBeVisible();
expect(screen.getByText('-$800')).toBeVisible();
expect(screen.queryByRole('button', { name: '新增支出' })).not.toBeInTheDocument();
expect(screen.queryByRole('button', { name: '新增存款' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run tests and confirm failure**

```powershell
npm test -- src/features/funds/fund-queries.test.ts src/features/funds/fund-form.test.tsx src/features/funds/fund-summary.test.tsx
```

- [ ] **Step 3: Implement parsed fund queries and form**

POST:

```ts
{ name: values.name, currency: values.currency }
```

After success route to `/app/funds/{id}`. Fetch summary through the authorized summary endpoint and parse all money fields as strings.

- [ ] **Step 4: Implement fund summary**

Render:

- fund name and currency
- cash balance
- current period dates or the no-current-period state
- current contribution, expense, and net totals
- member positions
- all-time totals in a secondary disclosure

Use `MoneyAmount` for every amount. The page may show a non-actionable “活動功能將在下一階段開放” boundary but no disabled fake transaction buttons.

- [ ] **Step 5: Integrate fund cards into group and dashboard pages**

Use dashboard funds for the overview and authorized list-funds results on group detail. Keep currencies separated; never add unlike currencies together.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/features/funds/fund-queries.test.ts src/features/funds/fund-form.test.tsx src/features/funds/fund-summary.test.tsx src/features/groups/treasury-dashboard.test.tsx
npm run lint
npm run typecheck
npm run build
git add web/src/features/funds web/src/features/groups web/src/app/app
git commit -m "feat(web): add fund creation and summaries"
```

## Task 9: Add End-to-End, Visual, Accessibility, and PWA Privacy Acceptance

**Files:**
- Create: `web/e2e/groups-funds-flow.spec.ts`
- Create: `web/e2e/invitation-flow.spec.ts`
- Create: `web/e2e/pixel-responsive.spec.ts`
- Modify: `web/e2e/public-and-auth.spec.ts`
- Modify: `web/playwright.config.ts`
- Modify: `web/src/app/pwa-cache-policy.test.ts`
- Create: `web/e2e/fixtures/accounts.ts`

- [ ] **Step 1: Add isolated two-account E2E fixtures**

Create unique test emails per run, or reset to documented seeded accounts. Use separate Playwright browser contexts so cookies and CSRF tokens never cross accounts.

- [ ] **Step 2: Implement the primary acceptance flow**

```ts
test('two users create a group, accept an invite, and open a fund summary', async ({ browser }) => {
  const owner = await browser.newContext();
  const partner = await browser.newContext();
  const ownerPage = await owner.newPage();
  const partnerPage = await partner.newPage();

  await login(ownerPage, ownerAccount);
  const group = await createGroup(ownerPage, '我們的生活基金', 'TWD');
  const inviteUrl = await createInvite(ownerPage, group.id, partnerAccount.email);

  await partnerPage.goto(inviteUrl);
  await loginFromInvite(partnerPage, partnerAccount);
  await partnerPage.getByRole('button', { name: '加入群組' }).click();
  await expect(partnerPage).toHaveURL(new RegExp(`/app/groups/${group.id}$`));

  await ownerPage.goto(`/app/groups/${group.id}`);
  await expect(ownerPage.getByText(partnerAccount.displayName)).toBeVisible();
  const fund = await createFund(ownerPage, group.id, '旅行基金', 'TWD');
  await expect(ownerPage).toHaveURL(new RegExp(`/app/funds/${fund.id}$`));
  await expect(ownerPage.getByRole('heading', { name: '旅行基金' })).toBeVisible();
});
```

- [ ] **Step 3: Add invitation, permission, and session edge flows**

Test invalid, expired, already-used, and email-mismatch invitations; outsider group/fund access; duplicate submit; leave rejection; successful leave fallback; and login/register return to `/invite/[code]`.

- [ ] **Step 4: Add responsive visual assertions**

Configure projects for:

```ts
[
  { name: 'phone-small', use: { viewport: { width: 320, height: 720 } } },
  { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
  { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
  { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
]
```

Assert no horizontal overflow, phone bottom navigation, desktop quest rail, visible treasury hero, unblurred raster sizing, no text overlap, and focus visibility. Capture screenshots for manual comparison with the approved reference.

- [ ] **Step 5: Verify accessibility and PWA privacy**

Use keyboard-only flows for group creation, invitation acceptance, dialog confirmation, and fund creation. Emulate reduced motion and 200% zoom.

Inspect Cache Storage after private navigation and assert no key contains `/app/`, `/api/app/`, group IDs, fund IDs, or invitation codes.

- [ ] **Step 6: Run full web verification**

```powershell
Set-Location web
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: every command exits with code 0.

- [ ] **Step 7: Commit**

```powershell
git add web/e2e web/playwright.config.ts web/src/app/pwa-cache-policy.test.ts
git commit -m "test(web): cover mimic groups funds and pixel UI"
```

## Task 10: Documentation, Devlog, and Final Verification

**Files:**
- Modify: `web/README.md`
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Modify: `docs/superpowers/specs/2026-07-29-mimic-pwa-groups-funds-pixel-world-design.md`

- [ ] **Step 1: Update operating documentation**

Document:

- backend on `http://localhost:3001/api/v1`
- web on `http://localhost:3010`
- `.env.local` value
- seeded login credentials
- two-account invitation test setup
- production PWA build and Cache Storage verification
- pixel asset provenance and integer-scaling check

- [ ] **Step 2: Update feature status**

Add a PWA subsection to `.agents/features.md`. Mark only delivered web atoms done:

- PWA group list/create/detail/rename/leave
- PWA member roster
- PWA invitation create/accept loop
- PWA fund list/create/summary
- PWA pixel dashboard and responsive shell

Keep contributions, expenses, activity, settlements, role changes, member removal, and fund archive explicitly pending for the PWA.

- [ ] **Step 3: Append the required devlog entry**

Use:

```markdown
## 2026-07-29 — mimic PWA groups, funds, and pixel world

**Task:** Replace the authenticated PWA preview with real group, invitation, fund, and dashboard workflows in the approved complete pixel-game visual system.
**Scope:** NestJS fund authorization and money contracts; Flutter compatibility mappers; Next.js BFF, group, invitation, fund, pixel UI, responsive shell, tests, and operating docs.
**What changed:**
- Secured fund create/list/detail access and standardized minor-unit API fields as decimal strings.
- Added real group selection, creation, detail, rename, roster, leave, invitation, fund creation, and summary workflows.
- Added the complete pixel UI asset and component system for phone and expanded desktop HUD layouts.
- Added unit, component, integration, E2E, responsive, accessibility, and PWA privacy coverage.
**Decisions:** NestJS remains authoritative; private data is never persisted by the service worker; transaction and settlement actions remain deferred.
**Known gaps / follow-ups:** Contributions, expenses, activity, settlements, role changes, member removal, and fund archival remain in later plans.
```

Append actual verification limitations after the known gaps when a required browser or Flutter command could not run.

- [ ] **Step 4: Run final verification from clean processes**

```powershell
Set-Location backend
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
Set-Location ..\web
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
Set-Location ..\mobile
flutter test
Set-Location ..
git diff --check
git status --short
```

Expected: all available commands pass and `git diff --check` emits no output. Any environment-blocked command is named precisely in the devlog and handoff.

- [ ] **Step 5: Perform the final manual acceptance**

Verify on phone and desktop:

1. no preview placeholder remains
2. no-group onboarding is usable
3. group switching persists and safely falls back
4. invitation requires explicit acceptance
5. two accounts see the updated roster
6. fund summary uses backend data
7. deferred activity controls are absent
8. pixel assets are crisp and consistent
9. focus, zoom, and reduced motion remain usable
10. Cache Storage contains no private routes or IDs

- [ ] **Step 6: Commit**

```powershell
git add web/README.md .agents/features.md .agents/devlog.md docs/superpowers/specs/2026-07-29-mimic-pwa-groups-funds-pixel-world-design.md
git commit -m "docs: record mimic groups and funds delivery"
```

## Final Acceptance

Before merging or starting Financial Activity, verify:

- fund create, list, legacy detail, summary, and dashboard authorization is enforced server-side
- canonical minor-unit API values are decimal strings and both PWA and Flutter parse them safely
- the PWA completes the owner/partner invitation flow with isolated sessions
- group creation, selection, rename, roster, leave, fund creation, and fund summary use real NestJS data
- phone layouts match the approved complete pixel-game direction
- desktop uses the expanded adventure HUD
- no fake transactions or enabled contribution, expense, activity, or settlement controls appear
- no authenticated document, BFF response, or domain identifier persists in Cache Storage
- all available backend, web, mobile, and browser checks pass
