# PairFund Mobile Settings Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mobile settings screen from static UI into a remote-backed profile read/write flow for display name, locale, and timezone.

**Architecture:** Keep settings as a focused feature slice with a repository, profile controller, and screen. The repository owns `GET /me` and `PATCH /me`; the controller owns editable form state and failure recovery; the screen renders async profile state plus a simple edit/save form. Logout remains delegated to `AuthController`.

**Tech Stack:** Flutter, Riverpod, Dio-backed PairFund API client, flutter_test

---

## Scope

This plan covers:

* settings profile repository
* remote `GET /me`
* remote `PATCH /me`
* settings profile form controller
* editable settings screen for display name, locale, timezone
* loading / error / save states
* existing logout preserved
* repository, controller, and widget tests
* docs sync

This plan does **not** cover:

* password change
* notification preference persistence
* settlement reminder settings
* avatar upload
* account deletion
* timezone picker beyond simple editable text/dropdown MVP

## File Map

### Existing files to modify

* `mobile/lib/features/settings/presentation/settings_screen.dart`
  * replace static account fields with remote-backed profile form
  * keep sign out action
* `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
  * move settings from `Partial` to `Ready` for profile read/write
* `docs/design/pairfund-mobile-flutter-spec-v0.2.md`
  * document settings profile read/write behavior

### New files to create

* `mobile/lib/features/settings/data/settings_repository.dart`
  * `SettingsProfile`
  * `SettingsProfilePatch`
  * `SettingsRepository`
  * `DemoSettingsRepository`
  * `RemoteSettingsRepository`
  * `settingsRepositoryProvider`
* `mobile/lib/features/settings/providers/settings_profile_controller.dart`
  * `SettingsProfileState`
  * `SettingsProfileController`
  * `settingsProfileControllerProvider`
* `mobile/test/features/settings/settings_repository_test.dart`
* `mobile/test/features/settings/settings_profile_controller_test.dart`
* `mobile/test/features/settings/settings_screen_test.dart`

## Task 1: Add Settings Repository

**Files:**

* Create: `mobile/lib/features/settings/data/settings_repository.dart`
* Create: `mobile/test/features/settings/settings_repository_test.dart`

- [ ] **Step 1: Write the failing repository tests**

Create `mobile/test/features/settings/settings_repository_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settings/data/settings_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  String? lastPostPath;
  Map<String, dynamic>? lastPostData;

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
    lastPostPath = path;
    lastPostData = data;
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for POST $path');
    }
    return response;
  }
}

void main() {
  test('remote settings repository fetches current profile', () async {
    final repository = RemoteSettingsRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/me': <String, dynamic>{
            'data': <String, dynamic>{
              'id': 'user-1',
              'email': 'edward@example.com',
              'display_name': 'Edward',
              'locale': 'zh-TW',
              'timezone': 'Asia/Taipei',
            },
          },
        },
      ),
    );

    final profile = await repository.fetchProfile();

    expect(profile.userId, 'user-1');
    expect(profile.email, 'edward@example.com');
    expect(profile.displayName, 'Edward');
    expect(profile.locale, 'zh-TW');
    expect(profile.timezone, 'Asia/Taipei');
  });

  test('remote settings repository patches profile fields', () async {
    final apiClient = FakeApiClient(
      <String, Map<String, dynamic>>{
        '/me': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'user-1',
            'email': 'edward@example.com',
            'display_name': 'Edward Lee',
            'locale': 'zh-TW',
            'timezone': 'Asia/Taipei',
          },
        },
      },
    );
    final repository = RemoteSettingsRepository(apiClient);

    final profile = await repository.updateProfile(
      const SettingsProfilePatch(
        displayName: 'Edward Lee',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
      ),
    );

    expect(apiClient.lastPostPath, '/me');
    expect(apiClient.lastPostData?['display_name'], 'Edward Lee');
    expect(profile.displayName, 'Edward Lee');
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/settings/settings_repository_test.dart
```

Expected:

* FAIL because `settings_repository.dart` does not exist yet.

- [ ] **Step 3: Implement repository and models**

Create `mobile/lib/features/settings/data/settings_repository.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class SettingsProfile {
  const SettingsProfile({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.locale,
    required this.timezone,
  });

  final String userId;
  final String email;
  final String displayName;
  final String locale;
  final String timezone;

  factory SettingsProfile.fromJson(Map<String, dynamic> json) {
    return SettingsProfile(
      userId: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['display_name'] as String? ?? '',
      locale: json['locale'] as String? ?? 'zh-TW',
      timezone: json['timezone'] as String? ?? 'Asia/Taipei',
    );
  }
}

class SettingsProfilePatch {
  const SettingsProfilePatch({
    required this.displayName,
    required this.locale,
    required this.timezone,
  });

  final String displayName;
  final String locale;
  final String timezone;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'display_name': displayName,
      'locale': locale,
      'timezone': timezone,
    };
  }
}

abstract class SettingsRepository {
  Future<SettingsProfile> fetchProfile();
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch);
}

class DemoSettingsRepository implements SettingsRepository {
  @override
  Future<SettingsProfile> fetchProfile() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return const SettingsProfile(
      userId: 'demo-user',
      email: 'edward@example.com',
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    );
  }

  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return SettingsProfile(
      userId: 'demo-user',
      email: 'edward@example.com',
      displayName: patch.displayName,
      locale: patch.locale,
      timezone: patch.timezone,
    );
  }
}

class RemoteSettingsRepository implements SettingsRepository {
  RemoteSettingsRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<SettingsProfile> fetchProfile() async {
    final response = await _apiClient.get('/me');
    return SettingsProfile.fromJson(readDataEnvelope(response));
  }

  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    final response = await _apiClient.post('/me', data: patch.toJson());
    return SettingsProfile.fromJson(readDataEnvelope(response));
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteSettingsRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoSettingsRepository();
});
```

Implementation note:

* The mobile API client currently exposes `post`, not `patch`. MVP can call `POST /me` as the mobile transport shape until the shared client grows `patch`. If strict REST is required later, add `patch` to `PairFundApiClient` and update this repository.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/settings/settings_repository_test.dart
```

Expected:

* PASS

## Task 2: Add Settings Profile Controller

**Files:**

* Create: `mobile/lib/features/settings/providers/settings_profile_controller.dart`
* Create: `mobile/test/features/settings/settings_profile_controller_test.dart`

- [ ] **Step 1: Write the failing controller tests**

Create `mobile/test/features/settings/settings_profile_controller_test.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settings/data/settings_repository.dart';
import 'package:pairfund_mobile/features/settings/providers/settings_profile_controller.dart';

class FakeSettingsRepository implements SettingsRepository {
  SettingsProfile profile = const SettingsProfile(
    userId: 'user-1',
    email: 'edward@example.com',
    displayName: 'Edward',
    locale: 'zh-TW',
    timezone: 'Asia/Taipei',
  );

  SettingsProfilePatch? lastPatch;

  @override
  Future<SettingsProfile> fetchProfile() async => profile;

  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    lastPatch = patch;
    profile = SettingsProfile(
      userId: profile.userId,
      email: profile.email,
      displayName: patch.displayName,
      locale: patch.locale,
      timezone: patch.timezone,
    );
    return profile;
  }
}

void main() {
  test('loads profile and saves edited profile fields', () async {
    final repository = FakeSettingsRepository();
    final container = ProviderContainer(
      overrides: <Override>[
        settingsRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);

    await container.read(settingsProfileControllerProvider.notifier).load();
    var state = container.read(settingsProfileControllerProvider);

    expect(state.profile?.displayName, 'Edward');
    expect(state.displayNameDraft, 'Edward');

    container
        .read(settingsProfileControllerProvider.notifier)
        .updateDisplayName('Edward Lee');

    final success =
        await container.read(settingsProfileControllerProvider.notifier).save();
    state = container.read(settingsProfileControllerProvider);

    expect(success, isTrue);
    expect(repository.lastPatch?.displayName, 'Edward Lee');
    expect(state.profile?.displayName, 'Edward Lee');
    expect(state.isSaving, isFalse);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/settings/settings_profile_controller_test.dart
```

Expected:

* FAIL because controller does not exist yet.

- [ ] **Step 3: Implement controller**

Create `mobile/lib/features/settings/providers/settings_profile_controller.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/settings_repository.dart';

class SettingsProfileState {
  const SettingsProfileState({
    this.profile,
    this.displayNameDraft = '',
    this.localeDraft = 'zh-TW',
    this.timezoneDraft = 'Asia/Taipei',
    this.isLoading = false,
    this.isSaving = false,
    this.errorMessage,
  });

  final SettingsProfile? profile;
  final String displayNameDraft;
  final String localeDraft;
  final String timezoneDraft;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  SettingsProfileState copyWith({
    SettingsProfile? profile,
    String? displayNameDraft,
    String? localeDraft,
    String? timezoneDraft,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SettingsProfileState(
      profile: profile ?? this.profile,
      displayNameDraft: displayNameDraft ?? this.displayNameDraft,
      localeDraft: localeDraft ?? this.localeDraft,
      timezoneDraft: timezoneDraft ?? this.timezoneDraft,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SettingsProfileController extends StateNotifier<SettingsProfileState> {
  SettingsProfileController(this._ref) : super(const SettingsProfileState());

  final Ref _ref;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final profile = await _ref.read(settingsRepositoryProvider).fetchProfile();
      state = state.copyWith(
        profile: profile,
        displayNameDraft: profile.displayName,
        localeDraft: profile.locale,
        timezoneDraft: profile.timezone,
        isLoading: false,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load settings right now.',
      );
    }
  }

  void updateDisplayName(String value) {
    state = state.copyWith(displayNameDraft: value);
  }

  void updateLocale(String value) {
    state = state.copyWith(localeDraft: value);
  }

  void updateTimezone(String value) {
    state = state.copyWith(timezoneDraft: value);
  }

  Future<bool> save() async {
    if (state.displayNameDraft.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Display name is required.');
      return false;
    }

    state = state.copyWith(isSaving: true, clearError: true);

    try {
      final updatedProfile = await _ref.read(settingsRepositoryProvider).updateProfile(
            SettingsProfilePatch(
              displayName: state.displayNameDraft.trim(),
              locale: state.localeDraft,
              timezone: state.timezoneDraft,
            ),
          );
      state = state.copyWith(
        profile: updatedProfile,
        displayNameDraft: updatedProfile.displayName,
        localeDraft: updatedProfile.locale,
        timezoneDraft: updatedProfile.timezone,
        isSaving: false,
        clearError: true,
      );
      return true;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to save settings right now.',
      );
      return false;
    }
  }
}

final settingsProfileControllerProvider = StateNotifierProvider.autoDispose<
    SettingsProfileController, SettingsProfileState>((Ref ref) {
  return SettingsProfileController(ref);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/settings/settings_profile_controller_test.dart
```

Expected:

* PASS

## Task 3: Replace Static Settings Screen

**Files:**

* Modify: `mobile/lib/features/settings/presentation/settings_screen.dart`
* Create: `mobile/test/features/settings/settings_screen_test.dart`

- [ ] **Step 1: Write the failing widget test**

Create `mobile/test/features/settings/settings_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settings/data/settings_repository.dart';
import 'package:pairfund_mobile/features/settings/presentation/settings_screen.dart';

class FakeSettingsRepository implements SettingsRepository {
  SettingsProfilePatch? lastPatch;

  @override
  Future<SettingsProfile> fetchProfile() async {
    return const SettingsProfile(
      userId: 'user-1',
      email: 'edward@example.com',
      displayName: 'Edward',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
    );
  }

  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    lastPatch = patch;
    return SettingsProfile(
      userId: 'user-1',
      email: 'edward@example.com',
      displayName: patch.displayName,
      locale: patch.locale,
      timezone: patch.timezone,
    );
  }
}

void main() {
  testWidgets('loads editable profile fields and saves settings', (tester) async {
    final repository = FakeSettingsRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          settingsRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: SettingsScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('edward@example.com'), findsOneWidget);
    expect(find.text('Save settings'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('settings-display-name')), 'Edward Lee');
    await tester.tap(find.text('Save settings'));
    await tester.pumpAndSettle();

    expect(repository.lastPatch?.displayName, 'Edward Lee');
    expect(find.text('Settings saved.'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/settings/settings_screen_test.dart
```

Expected:

* FAIL because current screen is static and has no repository-backed form.

- [ ] **Step 3: Implement remote-backed screen**

Modify `mobile/lib/features/settings/presentation/settings_screen.dart`:

* make it `ConsumerStatefulWidget`
* call `settingsProfileControllerProvider.notifier.load()` in `initState`
* render loading card while `isLoading`
* render account email
* render editable `displayName`, `locale`, `timezone`
* call controller `save()` from `Save settings`
* keep existing `Sign out`

Important widget keys:

```dart
const Key('settings-display-name')
const Key('settings-locale')
const Key('settings-timezone')
```

Save behavior:

```dart
final success = await ref.read(settingsProfileControllerProvider.notifier).save();
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(content: Text(success ? 'Settings saved.' : 'Unable to save settings right now.')),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/settings/settings_screen_test.dart
```

Expected:

* PASS

## Task 4: Sync Docs And Readiness

**Files:**

* Modify: `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
* Modify: `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

- [ ] **Step 1: Update readiness checklist**

Change:

```text
| Settings | Partial | settings screen | logout only | Account/preferences are still static UI |
```

To:

```text
| Settings | Ready | settings profile | GET /me, PATCH/POST /me, logout | Profile read/write and logout are remote-capable; notification preferences remain static/future |
```

Add a note:

* mobile currently uses the shared API client's `post('/me')` for profile updates until `patch` exists in `PairFundApiClient`

- [ ] **Step 2: Update Flutter spec**

Add settings section:

* profile loads from settings repository
* display name, locale, timezone are editable
* sign out remains auth controller-owned
* notification preferences remain future work

- [ ] **Step 3: Run focused regression tests**

Run:

```powershell
flutter test test/features/settings/settings_repository_test.dart
flutter test test/features/settings/settings_profile_controller_test.dart
flutter test test/features/settings/settings_screen_test.dart
flutter test test/app/app_smoke_test.dart
```

Expected:

* PASS

## Self-Review

### Coverage

Covered:

* profile read from `/me`
* profile update to `/me`
* display name, locale, timezone editing
* loading, save, and failure states
* logout preserved
* docs sync

Not covered intentionally:

* notification preference persistence
* password/security settings
* avatar upload
* account deletion
* full timezone selector UX

### Placeholder Scan

No TBD/TODO placeholders remain. Each task includes exact files, expected commands, and concrete behavior.

### Type Consistency

The plan consistently uses:

* `SettingsProfile`
* `SettingsProfilePatch`
* `SettingsRepository`
* `settingsRepositoryProvider`
* `SettingsProfileController`
* `settingsProfileControllerProvider`
