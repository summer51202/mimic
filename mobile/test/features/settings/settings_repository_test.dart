import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settings/data/settings_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

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

    expect(apiClient.lastPatchPath, '/me');
    expect(apiClient.lastPatchData?['display_name'], 'Edward Lee');
    expect(profile.displayName, 'Edward Lee');
  });
}
