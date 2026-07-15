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
