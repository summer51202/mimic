import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/auth/data/auth_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class FakeApiClient implements PairFundApiClient {
  FakeApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;

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
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for POST $path');
    }
    return response;
  }
}

void main() {
  test('remote auth repository maps login response', () async {
    final repository = RemoteAuthRepository(
      FakeApiClient(
        <String, Map<String, dynamic>>{
          '/auth/login': <String, dynamic>{
            'data': <String, dynamic>{
              'user': <String, dynamic>{'id': 'user-1'},
              'access_token': 'access-123',
              'refresh_token': 'refresh-123',
            },
          },
        },
      ),
    );

    final result = await repository.login(
      email: 'user@example.com',
      password: 'secret',
    );

    expect(result.userId, 'user-1');
    expect(result.accessToken, 'access-123');
    expect(result.refreshToken, 'refresh-123');
  });
}
