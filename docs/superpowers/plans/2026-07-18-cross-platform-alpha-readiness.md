# Cross-Platform Alpha Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PairFund's shared auth/profile/session foundation ready for a small iOS and Android alpha cohort.

**Architecture:** Keep the first batch narrow: Backend exposes the canonical `PATCH /me` contract, Mobile settings uses that contract, Dio refresh behavior is verified at the transport boundary, and docs capture the mixed-platform install and acceptance checklist. Packaging and TestFlight work stays checklist-driven until the shared foundation is green.

**Tech Stack:** NestJS, Jest, Supertest, Flutter, Riverpod, Dio, flutter_test, Markdown docs.

---

## File Structure

- Modify `backend/src/modules/users/users.controller.ts`: add `@Patch('me')` as the canonical profile update route while keeping `@Post('me')` as a temporary compatibility alias.
- Create `backend/test/users.e2e-spec.ts`: verify authenticated `GET /me`, canonical `PATCH /me`, and optional `POST /me` compatibility route against mocked `UsersService`.
- Modify `mobile/lib/features/settings/data/settings_repository.dart`: make `RemoteSettingsRepository` depend on `PairFundGroupApiClient` and call `patch('/me')`.
- Modify `mobile/test/features/settings/settings_repository_test.dart`: update the fake API client to implement patch and assert the exact `PATCH /me` call.
- Modify `mobile/test/shared/network/dio_provider_test.dart`: add focused refresh regression tests for no recursive refresh retry and no second retry loop.
- Create `docs/alpha-readiness.md`: tester-facing install, cross-platform acceptance, and feedback checklist.
- Modify `.agents/features.md`: mark `token-refresh` and `user-profile-update` done only after tests verify the behavior.
- Modify `.agents/devlog.md`: append a factual completion entry after implementation and verification.

---

### Task 1: Backend `PATCH /me` Contract

**Files:**
- Modify: `backend/src/modules/users/users.controller.ts`
- Create: `backend/test/users.e2e-spec.ts`

- [ ] **Step 1: Write the failing Backend e2e test**

Create `backend/test/users.e2e-spec.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.service';

const JWT_SECRET =
  'pairfund-users-e2e-secret-9e1e00d8e53c4f50b4e8c03d5790e4a0';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const originalSecret = process.env.JWT_ACCESS_SECRET;

  const usersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
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
      { sub: 'user-1', email: 'edward@example.com' },
      { secret: JWT_SECRET },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'edward@example.com',
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
      email: 'edward@example.com',
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
  });

  afterAll(async () => {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  it('returns the current user profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: 'user-1',
        email: 'edward@example.com',
        display_name: 'Edward',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      },
    });
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('updates the current profile through PATCH /me', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        display_name: 'Edward Lee',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      })
      .expect(200);

    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
    expect(response.body.data.display_name).toBe('Edward Lee');
  });

  it('keeps POST /me as a temporary compatibility alias', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        display_name: 'Edward Lee',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      })
      .expect(200);

    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Edward Lee',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    });
  });
});
```

- [ ] **Step 2: Run the focused Backend e2e test and confirm it fails**

Run from `backend/`:

```bash
npm run test:e2e -- users.e2e-spec.ts
```

Expected: FAIL because `PATCH /api/v1/me` is not routed yet. `GET /api/v1/me` and compatibility `POST /api/v1/me` should already pass if the test setup matches the existing group e2e pattern.

- [ ] **Step 3: Add the canonical `PATCH /me` route**

Modify `backend/src/modules/users/users.controller.ts` so the imports and update routes are:

```ts
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
```

```ts
  @Patch('me')
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.updateCurrentUser(user, dto);
  }

  @Post('me')
  async updateMeCompatibility(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMeDto,
  ) {
    return this.updateCurrentUser(user, dto);
  }

  private async updateCurrentUser(user: RequestUser, dto: UpdateMeDto) {
    const updatedUser = await this.usersService.updateProfile(user.userId, {
      displayName: dto.display_name,
      locale: dto.locale,
      timezone: dto.timezone,
    });
    return { data: this.mapMe(updatedUser) };
  }
```

- [ ] **Step 4: Run Backend verification**

Run from `backend/`:

```bash
npm run test:e2e -- users.e2e-spec.ts
npm run build
```

Expected: focused user test passes and production build succeeds.

- [ ] **Step 5: Commit Backend profile route**

```bash
git add backend/src/modules/users/users.controller.ts backend/test/users.e2e-spec.ts
git commit -m "fix(backend): expose patch current user profile"
```

---

### Task 2: Mobile Settings Uses `PATCH /me`

**Files:**
- Modify: `mobile/lib/features/settings/data/settings_repository.dart`
- Modify: `mobile/test/features/settings/settings_repository_test.dart`

- [ ] **Step 1: Write the failing Mobile repository test**

Update `mobile/test/features/settings/settings_repository_test.dart` fake client to implement `PairFundGroupApiClient` and record patch calls:

```dart
class FakeApiClient implements PairFundGroupApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  String? lastPatchPath;
  Map<String, dynamic>? lastPatchData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for GET $path');
    }
    return response;
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    throw StateError('POST should not be used by settings profile update');
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    lastPatchPath = path;
    lastPatchData = data;
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for PATCH $path');
    }
    return response;
  }

  @override
  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    throw StateError('DELETE should not be used by settings profile update');
  }
}
```

Change the update assertion to:

```dart
expect(apiClient.lastPatchPath, '/me');
expect(apiClient.lastPatchData?['display_name'], 'Edward Lee');
```

- [ ] **Step 2: Run the focused Mobile repository test and confirm it fails**

Run from `mobile/`:

```bash
flutter test test/features/settings/settings_repository_test.dart
```

Expected: FAIL because `RemoteSettingsRepository` currently accepts only `PairFundApiClient` and calls `post('/me')`.

- [ ] **Step 3: Update the repository to use the patch-capable client**

Modify `mobile/lib/features/settings/data/settings_repository.dart`:

```dart
class RemoteSettingsRepository implements SettingsRepository {
  RemoteSettingsRepository(this._apiClient);

  final PairFundGroupApiClient _apiClient;
```

```dart
  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    final response = await _apiClient.patch('/me', data: patch.toJson());
    return SettingsProfile.fromJson(readDataEnvelope(response));
  }
```

Update the provider:

```dart
  if (apiMode == AppApiMode.remote) {
    return RemoteSettingsRepository(ref.watch(pairFundGroupApiClientProvider));
  }
```

- [ ] **Step 4: Run Mobile settings verification**

Run from `mobile/`:

```bash
flutter test test/features/settings/settings_repository_test.dart test/features/settings/settings_profile_controller_test.dart test/features/settings/settings_screen_test.dart
```

Expected: all focused settings tests pass.

- [ ] **Step 5: Commit Mobile profile transport**

```bash
git add mobile/lib/features/settings/data/settings_repository.dart mobile/test/features/settings/settings_repository_test.dart
git commit -m "fix(mobile): patch current user profile"
```

---

### Task 3: Token Refresh Regression Coverage

**Files:**
- Modify: `mobile/test/shared/network/dio_provider_test.dart`

- [ ] **Step 1: Extend the fake adapter for refresh edge cases**

Add configurable paths to `FakeHttpClientAdapter`:

```dart
class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter({
    this.alwaysUnauthorized = false,
  });

  final bool alwaysUnauthorized;
  int protectedRequestCount = 0;
  int refreshRequestCount = 0;
  String? retriedAuthorizationHeader;
```

Inside `fetch`, add:

```dart
    if (options.path == '/auth/refresh') {
      refreshRequestCount += 1;
      return ResponseBody.fromString(
        '{"error":{"code":"INVALID_REFRESH_TOKEN"}}',
        401,
        headers: <String, List<String>>{
          Headers.contentTypeHeader: <String>['application/json'],
        },
      );
    }
```

Change the successful retry branch so it honors `alwaysUnauthorized`:

```dart
      if (protectedRequestCount == 1 || alwaysUnauthorized) {
        return ResponseBody.fromString(
          '{"error":{"code":"UNAUTHORIZED"}}',
          401,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>['application/json'],
          },
        );
      }
```

- [ ] **Step 2: Add a test proving refresh requests do not recursively refresh**

Append:

```dart
  test('does not try to refresh the refresh request itself', () async {
    final adapter = FakeHttpClientAdapter();
    bool refreshFailed = false;
    final dio = buildDioClient(
      'http://localhost',
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      refreshSession: (_) async {
        final refreshDio = Dio(BaseOptions(baseUrl: 'http://localhost'))
          ..httpClientAdapter = adapter;
        await refreshDio.post<Map<String, dynamic>>('/auth/refresh');
        return null;
      },
      onRefreshFailed: () async {
        refreshFailed = true;
      },
    )..httpClientAdapter = adapter;

    await expectLater(
      dio.get<Map<String, dynamic>>('/protected'),
      throwsA(isA<DioException>()),
    );

    expect(adapter.protectedRequestCount, 1);
    expect(adapter.refreshRequestCount, 1);
    expect(refreshFailed, isTrue);
  });
```

- [ ] **Step 3: Add a test proving retried requests do not loop**

Append:

```dart
  test('does not refresh the same request more than once', () async {
    final adapter = FakeHttpClientAdapter(alwaysUnauthorized: true);
    int refreshCount = 0;
    bool refreshFailed = false;
    final dio = buildDioClient(
      'http://localhost',
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      refreshSession: (_) async {
        refreshCount += 1;
        return const SessionState(
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
          userId: 'user-1',
        );
      },
      onRefreshFailed: () async {
        refreshFailed = true;
      },
    )..httpClientAdapter = adapter;

    await expectLater(
      dio.get<Map<String, dynamic>>('/protected'),
      throwsA(isA<DioException>()),
    );

    expect(adapter.protectedRequestCount, 2);
    expect(refreshCount, 1);
    expect(refreshFailed, isFalse);
  });
```

- [ ] **Step 4: Run the focused Dio tests**

Run from `mobile/`:

```bash
flutter test test/shared/network/dio_provider_test.dart
```

Expected: all Dio provider tests pass. If either new test fails, inspect `mobile/lib/shared/network/dio_provider.dart` and fix only the interceptor branch responsible for the failure.

- [ ] **Step 5: Commit token refresh coverage**

```bash
git add mobile/test/shared/network/dio_provider_test.dart mobile/lib/shared/network/dio_provider.dart
git commit -m "test(mobile): cover token refresh edge cases"
```

If `dio_provider.dart` is unchanged, omit it from `git add`.

---

### Task 4: Alpha Readiness Documentation

**Files:**
- Create: `docs/alpha-readiness.md`

- [ ] **Step 1: Create the alpha readiness checklist doc**

Create `docs/alpha-readiness.md`:

```md
# PairFund Alpha Readiness

## Audience

This alpha is for a small trusted iOS and Android test cohort. It is for product feedback, not formal financial record keeping.

## Known Limitations

- Test data may be reset during development.
- Transaction edit/delete is not available yet.
- Expense categories are not available yet.
- Audit log browsing is not available yet.
- Recurring rules are out of scope for MVP alpha.

## Android Install Checklist

- Build points to the alpha Backend URL.
- APK or internal testing build installs on a physical Android device.
- App launches without a blank screen.
- Login, logout, and app restart session persistence work.

## iOS Install Checklist

- TestFlight is the preferred distribution path.
- Ad Hoc or Xcode install is only a small-device fallback.
- Build points to the same alpha Backend URL as Android.
- App installs on a physical iOS device.
- Login, logout, and app restart session persistence work.

## Cross-Platform Acceptance Scenario

1. Android user A registers or signs in.
2. iOS user B registers or signs in.
3. A creates a group and fund.
4. A creates an invite.
5. B accepts the invite.
6. Both devices show the same group, members, fund, dashboard, and fund summary.
7. A adds a contribution; B refreshes and sees it.
8. B adds an expense; A refreshes and sees it.
9. Both devices see the same settlement suggestion.
10. One authorized user completes a settlement.
11. Both devices show the completed settlement state and locked period behavior.

## Feedback Format

Please include:

- device model;
- OS version;
- app build/version;
- account email used for testing;
- steps taken;
- expected result;
- actual result;
- screenshot or screen recording when useful.
```

- [ ] **Step 2: Review the doc for alpha-specific language**

Run:

```bash
Select-String -Path docs/alpha-readiness.md -Pattern 'App Store|production|guarantee|payment|billing'
```

Expected: no matches except deliberate text if added later. Keep this doc focused on alpha use, not public release.

- [ ] **Step 3: Commit alpha documentation**

```bash
git add docs/alpha-readiness.md
git commit -m "docs: add alpha readiness checklist"
```

---

### Task 5: Feature Map and Devlog

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update `.agents/features.md` after verification**

Change Auth & Identity rows:

```md
| done | token-refresh | Auto-refresh access token on expiry | `dio_provider.dart` | `auth.controller.ts POST /auth/refresh` |
| done | user-profile-update | Update own profile | `settings_profile_controller.dart` | `users.controller.ts PATCH /me` |
```

Change TODO backlog:

```md
- [x] Fix PATCH /me - Mobile uses canonical PATCH and Backend keeps temporary POST compatibility
- [x] Verify token-refresh is wired in mobile Dio interceptor (auto-retry on 401)
```

- [ ] **Step 2: Append `.agents/devlog.md` entry**

Append:

```md
## 2026-07-18 - Cross-platform alpha readiness foundation

**Task:** Prepare shared auth/profile/session behavior and alpha guidance for the first iOS and Android tester cohort.  
**Scope:** Backend current-user profile route, Mobile settings profile repository, Mobile Dio refresh tests, alpha readiness documentation, `.agents/features.md`  
**What changed:**
- Added canonical `PATCH /me` profile update coverage and route while preserving temporary `POST /me` compatibility.
- Updated Mobile settings profile updates to call `PATCH /me`.
- Added token refresh regression coverage for successful retry, refresh failure cleanup, non-recursive refresh handling, and single retry behavior.
- Added Android/iOS alpha install guidance and a cross-platform acceptance checklist.
**Decisions:** Keep first alpha readiness work focused on shared foundation and checklist documentation; packaging and TestFlight execution remain a follow-up batch.  
**Known gaps / follow-ups:** Transaction edit/delete, categories, audit log browsing, and actual Android/iOS build distribution remain outside this batch.
```

- [ ] **Step 3: Run final focused verification**

Run from `backend/`:

```bash
npm run test:e2e -- users.e2e-spec.ts
npm run build
```

Run from `mobile/`:

```bash
flutter test test/features/settings/settings_repository_test.dart test/features/settings/settings_profile_controller_test.dart test/features/settings/settings_screen_test.dart test/shared/network/dio_provider_test.dart
flutter analyze
```

Expected: Backend focused e2e passes, Backend build succeeds, Mobile focused tests pass, and analyzer reports no issues.

- [ ] **Step 4: Commit feature map and devlog**

```bash
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record alpha readiness foundation"
```

---

### Task 6: Optional Full-Suite Verification Before Packaging

**Files:**
- No source changes expected

- [ ] **Step 1: Run broader Backend tests**

Run from `backend/`:

```bash
npm run test
npm run test:e2e
```

Expected: all Backend unit and e2e tests pass.

- [ ] **Step 2: Run broader Mobile tests**

Run from `mobile/`:

```bash
flutter test
```

Expected: all Mobile tests pass.

- [ ] **Step 3: Record any suite limitation in the final response**

If a full suite is skipped or blocked by local environment, report the exact command and reason. Do not mark alpha foundation complete solely from skipped verification.
