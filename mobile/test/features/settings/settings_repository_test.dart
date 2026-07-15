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
