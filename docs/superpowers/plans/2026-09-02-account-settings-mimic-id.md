# Account Settings and Mimic ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated Settings experience with editable display name, read-only account information, immutable copyable Mimic ID, and logout, while exposing the stable Mimic ID in group member rosters.

**Architecture:** Add a dedicated unique `mimic_id` column and generation boundary in the users module while retaining UUIDs for all internal relations and JWTs. Extend additive Backend response contracts, then add a cookie-backed Web BFF mutation route, server-side profile query, client Settings form, active navigation destination, and member-roster presentation. Keep shared mutation retry/CSRF behavior in shared Web infrastructure.

**Tech Stack:** NestJS, Prisma, PostgreSQL 18, Jest/Supertest, Next.js App Router, React, Zod, Vitest, Testing Library, CSS Modules.

---

## File Structure

### Backend

- Create `backend/src/modules/users/mimic-id.ts`: canonical alphabet, regex, and secure generator.
- Create `backend/src/modules/users/mimic-id.spec.ts`: generator format and alphabet coverage.
- Create `backend/src/modules/users/users.service.spec.ts`: assignment and collision behavior around user creation.
- Modify `backend/prisma/schema.prisma`: add the unique mapped `mimicId` field.
- Create `backend/prisma/migrations/20260902010000_add_user_mimic_id/migration.sql`: backfill existing users, then enforce non-null uniqueness.
- Modify `backend/src/modules/users/users.service.ts`: generate and persist immutable Mimic IDs with bounded unique-collision retries.
- Modify `backend/src/modules/users/users.controller.ts`: map `mimic_id` in profile responses.
- Modify `backend/src/modules/auth/auth.service.ts`: carry `mimicId` through register/login/refresh responses.
- Create `backend/src/modules/auth/auth.service.spec.ts`: verify register/login/refresh response mapping.
- Modify `backend/src/modules/groups/groups.controller.ts`: map `mimic_id` in member responses.
- Modify `backend/test/users.e2e-spec.ts` and `backend/test/groups.e2e-spec.ts`: verify additive HTTP contracts and immutability.

### Web

- Create `web/src/shared/api/app-fetch.ts` and `web/src/shared/api/app-fetch.test.ts`: shared CSRF-aware mutation helper and typed client error.
- Modify `web/src/features/groups/group-client-api.ts` and current client callsites/tests: consume shared mutation infrastructure without changing behavior.
- Create `web/src/app/api/app/me/route.ts` and `web/src/app/api/app/me/route.test.ts`: forward profile PATCH through the authenticated BFF.
- Create `web/src/features/settings/settings-schema.ts` and `settings-schema.test.ts`: profile and display-name contracts.
- Create `web/src/features/settings/settings-queries.ts` and `settings-queries.test.ts`: authenticated server profile read.
- Create `web/src/features/settings/settings-form.tsx`, `settings-form.test.tsx`, and `settings.module.css`: profile update, Copy ID, and logout UI.
- Create `web/src/app/app/settings/page.tsx`: protected Settings route.
- Modify `web/src/shared/navigation/app-section.ts`, `app-section.test.ts`, `app-navigation.tsx`, and `app-navigation.test.tsx`: activate and highlight Settings.
- Modify `web/src/shared/api/domain-contracts.ts`, `domain-contracts.test.ts`, group fixtures, `member-roster.tsx`, and `group-actions.test.tsx`: validate and render member Mimic IDs.
- Modify `web/src/app/app/route-boundaries.test.tsx`: verify Settings success and failure boundaries.

### Documentation

- Modify `.agents/features.md`: mark PWA account Settings and public identity delivery complete.
- Modify `.agents/devlog.md`: record schema, API, UI, compatibility, and deferred work.

---

### Task 1: Add the Mimic ID data model and generator

**Files:**
- Create: `backend/src/modules/users/mimic-id.spec.ts`
- Create: `backend/src/modules/users/mimic-id.ts`
- Create: `backend/src/modules/users/users.service.spec.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260902010000_add_user_mimic_id/migration.sql`

- [ ] **Step 1: Write the failing generator test**

Create `mimic-id.spec.ts` with real generator calls:

```ts
import { generateMimicId, MIMIC_ID_PATTERN } from './mimic-id';

describe('generateMimicId', () => {
  it('creates public IDs in the unambiguous canonical format', () => {
    const ids = Array.from({ length: 128 }, () => generateMimicId());

    expect(ids.every((id) => MIMIC_ID_PATTERN.test(id))).toBe(true);
    expect(ids.every((id) => !/[01IO]/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run from `backend/`:

```powershell
npm test -- --runInBand src/modules/users/mimic-id.spec.ts
```

Expected: FAIL because `./mimic-id` does not exist.

- [ ] **Step 3: Implement the secure generator**

Create `mimic-id.ts`:

```ts
import { randomBytes } from 'node:crypto';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MIMIC_ID_PATTERN =
  /^MIMIC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

export function generateMimicId(): string {
  const bytes = randomBytes(8);
  const body = Array.from(bytes, (byte) => alphabet[byte & 31]).join('');

  return `MIMIC-${body.slice(0, 4)}-${body.slice(4)}`;
}
```

- [ ] **Step 4: Run the generator test and verify GREEN**

Run the same focused Jest command. Expected: 1 suite passes.

- [ ] **Step 5: Write failing UsersService creation tests**

Create `users.service.spec.ts` with a mocked `PrismaService`. Spy on `generateMimicId()` to return `MIMIC-2345-6789`, assert `prisma.user.create` receives `mimicId`, then add a collision case where the first call rejects with:

```ts
new Prisma.PrismaClientKnownRequestError('unique collision', {
  clientVersion: 'test',
  code: 'P2002',
  meta: { target: ['mimic_id'] },
})
```

The second generated candidate must be persisted. Add an exhaustion case with five Mimic-ID collisions and assert the fifth error is rethrown. Add an email P2002 case with `target: ['email']` and assert there is no retry.

- [ ] **Step 6: Run the service tests and verify RED**

```powershell
npm test -- --runInBand src/modules/users/users.service.spec.ts
```

Expected: FAIL because `createUser()` does not generate or retry Mimic IDs.

- [ ] **Step 7: Add schema, migration, and bounded retry behavior**

Add to `User` in `schema.prisma`:

```prisma
mimicId String @unique @map("mimic_id") @db.VarChar(15)
```

The migration must:

1. add nullable `mimic_id VARCHAR(15)`;
2. iterate existing rows in stable `created_at, id` order;
3. generate `MIMIC-XXXX-XXXX` candidates from `gen_random_uuid()`, translating `0` to `2` and `1` to `3`;
4. repeat until no current row uses the candidate;
5. set the column non-null;
6. create `users_mimic_id_key` as a unique index.

Implement `createUser()` with `MAX_MIMIC_ID_ATTEMPTS = 5`. Retry only when the caught Prisma error has `code === 'P2002'` and its `meta.target` contains `mimic_id`. Keep the original error for exhaustion and every other database error.

- [ ] **Step 8: Generate Prisma client and verify GREEN**

```powershell
npx prisma generate
npm test -- --runInBand src/modules/users/mimic-id.spec.ts src/modules/users/users.service.spec.ts
```

Expected: both suites pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add backend/prisma backend/src/modules/users/mimic-id.ts backend/src/modules/users/mimic-id.spec.ts backend/src/modules/users/users.service.ts backend/src/modules/users/users.service.spec.ts
git commit -m "feat(backend): add immutable Mimic IDs"
```

---

### Task 2: Expose Mimic ID through Backend response contracts

**Files:**
- Modify: `backend/test/users.e2e-spec.ts`
- Create: `backend/src/modules/auth/auth.service.spec.ts`
- Modify: `backend/test/groups.e2e-spec.ts`
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/groups/groups.controller.ts`

- [ ] **Step 1: Add failing profile response tests**

Update every mocked profile in `users.e2e-spec.ts` with:

```ts
mimicId: 'MIMIC-2345-6789',
```

Assert every `GET /me`, `PATCH /me`, and compatibility `POST /me` response includes:

```ts
mimic_id: 'MIMIC-2345-6789',
```

Send `mimic_id: 'MIMIC-ZZZZ-ZZZZ'` in the PATCH body and assert `updateProfile` still receives only `displayName`, `locale`, and `timezone`.

- [ ] **Step 2: Add failing auth and member response tests**

Create `auth.service.spec.ts` with mocked `UsersService`, `JwtService`, and `bcryptjs`. Cover register, login, and refresh users containing `mimicId: 'MIMIC-2345-6789'`, then assert each successful result contains `user.mimic_id` while the signed JWT payload still uses the internal `id` as `sub`. In `groups.e2e-spec.ts`, make member users include `mimicId` and assert it appears in list-member and role-update envelopes.

- [ ] **Step 3: Run focused Backend tests and verify RED**

```powershell
npm test -- --runInBand test/users.e2e-spec.ts src/modules/auth/auth.service.spec.ts test/groups.e2e-spec.ts
```

Expected: FAIL because response mappers omit `mimic_id`.

- [ ] **Step 4: Update response types and mappers**

Add `mimicId: string` to the private user shapes in `UsersController` and `AuthService.TokenUser`. Map it exactly as:

```ts
mimic_id: user.mimicId,
```

Pass `mimicId` from user records through register, login, and refresh `buildAuthResponse()` calls. Add the same mapping to both member response objects in `GroupsController`. Do not add `mimic_id` to `UpdateMeDto`.

- [ ] **Step 5: Run focused and module tests**

```powershell
npm test -- --runInBand test/users.e2e-spec.ts src/modules/auth/auth.service.spec.ts test/groups.e2e-spec.ts src/modules/users/users.service.spec.ts
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit Task 2**

```powershell
git add backend/src/modules/auth backend/src/modules/groups/groups.controller.ts backend/src/modules/users/users.controller.ts backend/test
git commit -m "feat(backend): expose Mimic IDs in user responses"
```

---

### Task 3: Add shared Web mutation infrastructure and the profile BFF

**Files:**
- Create: `web/src/shared/api/app-fetch.ts`
- Create: `web/src/shared/api/app-fetch.test.ts`
- Modify: `web/src/features/groups/group-client-api.ts`
- Modify: current imports of `appFetch` and `GroupClientError` under `web/src/features`
- Create: `web/src/app/api/app/me/route.ts`
- Create: `web/src/app/api/app/me/route.test.ts`

- [ ] **Step 1: Write a failing shared helper contract test**

Move the behavior cases currently in `group-client-api.test.ts` into a new `app-fetch.test.ts` and import this wished-for API:

```ts
import { AppClientError, appFetch } from './app-fetch';
```

Preserve tests for CSRF headers, one refresh after 401, rotated CSRF on replay, second-401 termination, caller header precedence, and typed errors. Add a 204 response case.

- [ ] **Step 2: Run the helper test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/api/app-fetch.test.ts
```

Expected: FAIL because `app-fetch.ts` does not exist.

- [ ] **Step 3: Move the generic helper into shared API**

Move `appFetch`, the error-body type, response parsing, refresh logic, CSRF loading, and `GroupClientError` from `group-client-api.ts` into `shared/api/app-fetch.ts`. Rename the error class to `AppClientError`. Keep `groupErrorMessage()` in the groups feature and make it import `AppClientError`. Update groups, funds, and invitations imports directly to the shared module; do not leave a cross-feature re-export.

- [ ] **Step 4: Run existing mutation tests and verify GREEN**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/api/app-fetch.test.ts src/features/groups/group-client-api.test.ts src/features/groups/group-form.test.tsx src/features/funds/fund-form.test.tsx src/features/invitations/invitation-flow.test.tsx
```

Expected: all selected files pass with unchanged request behavior.

- [ ] **Step 5: Write failing `/api/app/me` BFF tests**

Create `route.test.ts` following the existing `forwardAppRoute` tests. Assert:

- PATCH without valid CSRF returns 403 `CSRF_INVALID` before upstream fetch;
- PATCH with valid CSRF forwards to `/me` with method PATCH and exact `{ display_name: 'New Name' }` JSON;
- successful upstream profile is returned under `{ data: profile }`;
- upstream 401/validation/unavailable errors keep the standard app-route mappings.

- [ ] **Step 6: Run the route test and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/app/api/app/me/route.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 7: Add the BFF route**

Create `route.ts`:

```ts
import { forwardAppRoute } from '@/shared/api/app-route';

export async function PATCH(request: Request): Promise<Response> {
  return forwardAppRoute(request, '/me', { body: 'json' });
}
```

- [ ] **Step 8: Verify and commit Task 3**

Run the focused tests from Steps 4 and 6, then:

```powershell
git add web/src/shared/api web/src/features web/src/app/api/app/me
git commit -m "refactor(web): share authenticated app mutations"
```

---

### Task 4: Build the Settings profile query, page, form, Copy ID, and logout

**Files:**
- Create: `web/src/features/settings/settings-schema.ts`
- Create: `web/src/features/settings/settings-schema.test.ts`
- Create: `web/src/features/settings/settings-queries.ts`
- Create: `web/src/features/settings/settings-queries.test.ts`
- Create: `web/src/features/settings/settings-form.tsx`
- Create: `web/src/features/settings/settings-form.test.tsx`
- Create: `web/src/features/settings/settings.module.css`
- Create: `web/src/app/app/settings/page.tsx`
- Modify: `web/src/app/app/route-boundaries.test.tsx`

- [ ] **Step 1: Write failing schema tests**

Define the desired profile fixture:

```ts
const profile = {
  id: 'user-1',
  mimic_id: 'MIMIC-2345-6789',
  email: 'edward@example.com',
  display_name: 'Edward',
  locale: 'zh-TW',
  timezone: 'Asia/Taipei',
};
```

Assert `settingsProfileSchema.parse(profile)` succeeds, malformed Mimic IDs fail, and `displayNameSchema.parse({ displayName: '  Edward Lee  ' })` returns the trimmed name while blank and 101-character values fail.

- [ ] **Step 2: Verify schema RED, implement, and verify GREEN**

Run:

```powershell
node node_modules/vitest/vitest.mjs run src/features/settings/settings-schema.test.ts
```

After the missing-module failure, create Zod schemas using the exact Mimic ID regex and `z.string().trim().min(1).max(100)`. Rerun and expect PASS.

- [ ] **Step 3: Write failing query tests**

Mock `authenticatedServerApi`, return the profile fixture, and assert:

```ts
expect(authenticatedServerApiMock).toHaveBeenCalledWith('/me', {
  method: 'GET',
});
```

Add a malformed response case that throws `ZodError`.

- [ ] **Step 4: Implement `getSettingsProfile()` and verify GREEN**

The function calls `authenticatedServerApi<unknown>('/me', { method: 'GET' })` and parses with `settingsProfileSchema`. Run the focused query/schema tests.

- [ ] **Step 5: Write failing Settings form interaction tests**

Render `<SettingsForm profile={profile} onLogout={onLogout} />` and cover these independent behaviors:

1. email and Mimic ID are read-only text, while only Display name is a textbox;
2. save trims the name and sends one PATCH to `/api/app/me` with `{ display_name: 'Edward Lee' }`;
3. a second Save click while pending does not duplicate the request;
4. validation failure keeps focus and sends no request;
5. API failure preserves the typed value and announces an error;
6. Copy ID writes exactly `MIMIC-2345-6789` to the clipboard;
7. without clipboard support, Copy ID selects and focuses the rendered ID;
8. Sign out posts once to `/api/auth/logout` and calls `onLogout('/login')` only after success;
9. logout failure remains on the form and announces a retry message.

- [ ] **Step 6: Run the form tests and verify RED**

```powershell
node node_modules/vitest/vitest.mjs run src/features/settings/settings-form.test.tsx
```

Expected: FAIL because `SettingsForm` does not exist.

- [ ] **Step 7: Implement the Settings UI**

Use `PixelFrame`, `PixelField`, `PixelButton`, and `PixelNotice`. The form must have `noValidate`, a display-name ref, a Mimic-ID ref with `tabIndex={-1}`, separate pending state for save/logout, and notices with these stable messages:

```text
Profile saved.
Mimic ID copied.
Mimic ID selected. Copy it from the page.
Your session expired. Sign in again, then retry.
The service is temporarily unavailable. Mimiku kept your changes.
Unable to sign out right now. Please retry.
```

Use `appFetch` for PATCH and logout. For logout, send POST with no body-dependent assumptions and navigate through the optional `onLogout` test seam or `window.location.assign('/login')`.

- [ ] **Step 8: Add the server page and route-boundary tests**

Create the page with header `Settings`, supporting copy, and a `PixelFrame` containing the form. In `route-boundaries.test.tsx`, mock `getSettingsProfile()`, assert the successful page renders `MIMIC-2345-6789`, and assert API read failures render `AppReadFailure` consistently.

- [ ] **Step 9: Run focused Settings tests and commit Task 4**

```powershell
node node_modules/vitest/vitest.mjs run src/features/settings src/app/app/route-boundaries.test.tsx
git add web/src/features/settings web/src/app/app/settings web/src/app/app/route-boundaries.test.tsx
git commit -m "feat(web): add account settings and logout"
```

---

### Task 5: Activate Settings navigation and identify group members

**Files:**
- Modify: `web/src/shared/navigation/app-section.ts`
- Modify: `web/src/shared/navigation/app-section.test.ts`
- Modify: `web/src/shared/navigation/app-navigation.tsx`
- Modify: `web/src/shared/navigation/app-navigation.test.tsx`
- Modify: `web/src/shared/api/contracts.ts`
- Modify: `web/src/shared/api/domain-contracts.ts`
- Modify: `web/src/shared/api/domain-contracts.test.ts`
- Modify: group/member fixtures under `web/src/features/groups`
- Modify: `web/src/features/groups/member-roster.tsx`
- Modify: `web/src/features/groups/group-actions.test.tsx`
- Modify: `web/src/features/groups/group-management.module.css`

- [ ] **Step 1: Write failing navigation tests**

Update expectations so Settings is a link with `href="/app/settings"`, not a disabled coming-soon button. Add `/app/settings` and `/app/settings/profile` current-section cases. Keep Activity disabled.

- [ ] **Step 2: Verify navigation RED**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/navigation/app-navigation.test.tsx src/shared/navigation/app-section.test.ts
```

Expected: FAIL because Settings is still disabled and the section union excludes it.

- [ ] **Step 3: Activate Settings**

Add `'/app/settings'` before the `/app` fallback in `appSections` and add it to `AppSection`. Change the Settings navigation item to:

```ts
{
  icon: 'S',
  href: '/app/settings',
  label: 'Settings',
  status: 'available',
}
```

- [ ] **Step 4: Write failing member-contract and roster tests**

Extend member fixtures with `mimic_id: 'MIMIC-2345-6789'`. Assert `memberSchema` rejects a malformed ID. In the roster test, assert the canonical ID is visible under the name, owns `data-contain-text`, and remains inside `.memberMeta`.

- [ ] **Step 5: Verify member RED**

```powershell
node node_modules/vitest/vitest.mjs run src/shared/api/domain-contracts.test.ts src/features/groups/group-actions.test.tsx src/features/groups/group-queries.test.ts
```

Expected: FAIL because `Member` and `memberSchema` omit `mimic_id` and the roster does not render it.

- [ ] **Step 6: Update contracts, fixtures, and roster**

Add `mimic_id` using a shared public-ID schema matching the canonical regex. Render:

```tsx
<span className={styles.memberMimicId} data-contain-text>
  {member.mimic_id}
</span>
```

Give `.memberMimicId` readable muted styling and `overflow-wrap: anywhere`. Update every typed `Member` fixture; do not make the field optional.

- [ ] **Step 7: Verify and commit Task 5**

Run all tests from Steps 2 and 5, then:

```powershell
git add web/src/shared/navigation web/src/shared/api web/src/features/groups
git commit -m "feat(web): expose stable member identities"
```

---

### Task 6: Documentation, migrations, full verification, and self-review

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the feature map**

Add completed PWA entries for account Settings/profile/logout and stable public member identity. Update Backend identity entries so their response contracts mention `mimic_id`. Do not mark account deletion, password changes, ID search/invites, group archive, or QR support complete.

- [ ] **Step 2: Append the devlog entry**

Append:

```markdown
## 2026-09-02 — Add account Settings and stable Mimic IDs

**Task:** Add PWA account information, display-name editing, logout, and an immutable public identity visible in groups.
**Scope:** User schema/migration and generation, auth/profile/member response contracts, Web Settings/BFF/navigation/member roster, tests, feature map
**What changed:**
- Added unique `MIMIC-XXXX-XXXX` IDs without replacing internal UUID relations or JWT subjects.
- Added protected Settings profile read/update, Copy ID, and session-clearing logout flows.
- Activated Settings navigation and displayed stable IDs in group member rows.
- Added Backend and Web regression coverage for identity immutability, API mapping, CSRF/refresh behavior, form recovery, clipboard fallback, navigation, and roster rendering.
**Decisions:** Display name is the only editable profile field; Mimic ID is public but never a credential; existing additive API fields and POST /me compatibility remain intact.
**Known gaps / follow-ups:** Search or invite by Mimic ID, password/email changes, account deletion, group archive, and QR invitation support remain deferred.
```

- [ ] **Step 3: Run Backend verification**

From `backend/`:

```powershell
npx prisma generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Expected: all commands exit 0. If local e2e requires unavailable PostgreSQL, run every mocked controller e2e file explicitly and record the exact environment blocker rather than claiming the database-backed suite passed.

- [ ] **Step 4: Run Web verification**

From `web/`:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
$env:MIMIC_API_BASE_URL='http://localhost:3000/api/v1'
$env:MIMIC_COOKIE_SECURE='false'
node node_modules/next/dist/bin/next build --webpack
```

Expected: lint, typecheck, all tests, and production build exit 0. Record the existing non-fatal standalone trace warning separately if it remains.

- [ ] **Step 5: Perform self-review**

Review `git diff 8e9bd6d..HEAD` for:

- schema/backfill safety and uniqueness;
- accidental editability or authorization use of `mimic_id`;
- collision retry specificity and bounded failure;
- additive API compatibility;
- CSRF and one-shot refresh preservation;
- logout cookie clearing and redirect timing;
- accessibility, focus, notices, and text containment;
- test evidence for every new behavior.

Fix every critical or important finding with a failing regression test first, rerun affected checks, and repeat until none remain.

- [ ] **Step 6: Commit documentation**

```powershell
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record account settings and Mimic IDs"
```

- [ ] **Step 7: Confirm clean handoff**

```powershell
git status --short
git log --oneline --decorate -8
```

Expected: no feature-worktree changes remain. The main workspace's user-owned `.codex-remote-attachments/` remains untracked and untouched.
