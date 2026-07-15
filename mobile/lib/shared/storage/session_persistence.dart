import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../providers/session_provider.dart';
import 'secure_storage_provider.dart';

const String _accessTokenKey = 'pairfund.access_token';
const String _refreshTokenKey = 'pairfund.refresh_token';
const String _userIdKey = 'pairfund.user_id';

abstract class SessionPersistence {
  Future<void> saveSession(SessionState session);

  Future<SessionState?> readSession();

  Future<void> clearSession();
}

class SecureSessionPersistence implements SessionPersistence {
  SecureSessionPersistence(this._storage);

  final FlutterSecureStorage _storage;

  @override
  Future<void> saveSession(SessionState session) async {
    await _storage.write(key: _accessTokenKey, value: session.accessToken);
    await _storage.write(key: _refreshTokenKey, value: session.refreshToken);
    await _storage.write(key: _userIdKey, value: session.userId);
  }

  @override
  Future<SessionState?> readSession() async {
    final accessToken = await _storage.read(key: _accessTokenKey);
    final refreshToken = await _storage.read(key: _refreshTokenKey);
    final userId = await _storage.read(key: _userIdKey);

    if (accessToken == null || userId == null) {
      return null;
    }

    return SessionState(
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: userId,
    );
  }

  @override
  Future<void> clearSession() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _userIdKey);
  }
}

final sessionPersistenceProvider = Provider<SessionPersistence>((Ref ref) {
  return SecureSessionPersistence(ref.watch(secureStorageProvider));
});
