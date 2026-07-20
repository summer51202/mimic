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

  final PairFundGroupApiClient _apiClient;

  @override
  Future<SettingsProfile> fetchProfile() async {
    final response = await _apiClient.get('/me');
    return SettingsProfile.fromJson(readDataEnvelope(response));
  }

  @override
  Future<SettingsProfile> updateProfile(SettingsProfilePatch patch) async {
    final response = await _apiClient.patch('/me', data: patch.toJson());
    return SettingsProfile.fromJson(readDataEnvelope(response));
  }
}

final settingsRepositoryProvider = Provider<SettingsRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteSettingsRepository(ref.watch(pairFundGroupApiClientProvider));
  }

  return DemoSettingsRepository();
});
