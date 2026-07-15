import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class InMemorySessionPersistence implements SessionPersistence {
  SessionState? persisted;

  @override
  Future<void> clearSession() async {
    persisted = null;
  }

  @override
  Future<SessionState?> readSession() async {
    return persisted;
  }

  @override
  Future<void> saveSession(SessionState session) async {
    persisted = session;
  }
}

void main() {
  test('session persistence saves reads and clears session state', () async {
    final persistence = InMemorySessionPersistence();
    const session = SessionState(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userId: 'user-1',
    );

    await persistence.saveSession(session);
    final restored = await persistence.readSession();

    expect(restored?.accessToken, 'access-token');
    expect(restored?.refreshToken, 'refresh-token');
    expect(restored?.userId, 'user-1');

    await persistence.clearSession();

    expect(await persistence.readSession(), isNull);
  });
}
