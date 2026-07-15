import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/auth/data/auth_repository.dart';
import 'package:pairfund_mobile/features/auth/providers/auth_controller.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class FakeAuthRepository implements AuthRepository {
  @override
  Future<AuthSessionPayload> login({
    required String email,
    required String password,
  }) async {
    return const AuthSessionPayload(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userId: 'user-1',
    );
  }

  @override
  Future<void> logout() async {}
}

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
  test('auth controller persists session after successful login', () async {
    final persistence = InMemorySessionPersistence();
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
        sessionPersistenceProvider.overrideWithValue(persistence),
      ],
    );
    addTearDown(container.dispose);

    final controller = container.read(authControllerProvider.notifier);
    final didLogin = await controller.login(
      email: 'user@example.com',
      password: 'secret',
    );

    final session = container.read(sessionProvider);

    expect(didLogin, isTrue);
    expect(session.userId, 'user-1');
    expect(persistence.persisted?.accessToken, 'access-token');
    expect(persistence.persisted?.refreshToken, 'refresh-token');
  });

  test('auth controller clears persisted session on logout', () async {
    final persistence = InMemorySessionPersistence()
      ..persisted = const SessionState(
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        userId: 'user-1',
      );
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
        sessionPersistenceProvider.overrideWithValue(persistence),
      ],
    );
    addTearDown(container.dispose);

    container.read(sessionProvider.notifier).setSession(
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          userId: 'user-1',
        );

    await container.read(authControllerProvider.notifier).logout();

    final session = container.read(sessionProvider);

    expect(session.isAuthenticated, isFalse);
    expect(persistence.persisted, isNull);
  });
}
