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
  testWidgets('loads editable profile fields and saves settings', (
    WidgetTester tester,
  ) async {
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

    await tester.enterText(
      find.byKey(const Key('settings-display-name')),
      'Edward Lee',
    );
    await tester.tap(find.text('Save settings'));
    await tester.pumpAndSettle();

    expect(repository.lastPatch?.displayName, 'Edward Lee');
    expect(find.text('Settings saved.'), findsOneWidget);
  });
}
