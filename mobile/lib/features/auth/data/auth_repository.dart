import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import 'remote/auth_remote_mapper.dart';

class AuthSessionPayload {
  const AuthSessionPayload({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
  });

  final String accessToken;
  final String refreshToken;
  final String userId;
}

abstract class AuthRepository {
  Future<AuthSessionPayload> register({
    required String displayName,
    required String email,
    required String password,
  });

  Future<AuthSessionPayload> login({
    required String email,
    required String password,
  });

  Future<void> logout();
}

class DemoAuthRepository implements AuthRepository {
  @override
  Future<AuthSessionPayload> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return const AuthSessionPayload(
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      userId: 'demo-user',
    );
  }

  @override
  Future<AuthSessionPayload> login({
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const AuthSessionPayload(
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      userId: 'demo-user',
    );
  }

  @override
  Future<void> logout() async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
  }
}

class RemoteAuthRepository implements AuthRepository {
  RemoteAuthRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<AuthSessionPayload> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/register',
      data: <String, dynamic>{
        'display_name': displayName,
        'email': email,
        'password': password,
      },
    );
    final dto = AuthLoginDto.fromJson(readDataEnvelope(response));
    return mapAuthSessionPayload(dto);
  }

  @override
  Future<AuthSessionPayload> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      data: <String, dynamic>{
        'email': email,
        'password': password,
      },
    );

    final data = readDataEnvelope(response);
    final dto = AuthLoginDto.fromJson(data);
    return mapAuthSessionPayload(dto);
  }

  @override
  Future<void> logout() async {
    await _apiClient.post('/auth/logout');
  }
}

final authRepositoryProvider = Provider<AuthRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteAuthRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoAuthRepository();
});
