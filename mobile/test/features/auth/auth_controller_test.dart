import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/auth/data/auth_repository.dart';
import 'package:pairfund_mobile/features/auth/providers/auth_controller.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.registerError, this.loginError});

  final Object? registerError;
  final Object? loginError;

  @override
  Future<AuthSessionPayload> register({
    required String displayName,
    required String email,
    required String password,
  }) async {
    if (registerError != null) {
      throw registerError!;
    }
    return const AuthSessionPayload(
      accessToken: 'register-access-token',
      refreshToken: 'register-refresh-token',
      userId: 'user-2',
    );
  }

  @override
  Future<AuthSessionPayload> login({
    required String email,
    required String password,
  }) async {
    if (loginError != null) {
      throw loginError!;
    }
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
  test('auth controller persists session after successful registration',
      () async {
    final persistence = InMemorySessionPersistence();
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
        sessionPersistenceProvider.overrideWithValue(persistence),
      ],
    );
    addTearDown(container.dispose);

    final didRegister =
        await container.read(authControllerProvider.notifier).register(
              displayName: 'Taylor',
              email: 'taylor@example.com',
              password: 'secret1',
            );

    expect(didRegister, isTrue);
    expect(container.read(sessionProvider).userId, 'user-2');
    expect(persistence.persisted?.accessToken, 'register-access-token');
  });

  test('auth controller exposes a registration-specific error', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(registerError: StateError('registration failed')),
        ),
        sessionPersistenceProvider.overrideWithValue(
          InMemorySessionPersistence(),
        ),
      ],
    );
    addTearDown(container.dispose);

    final didRegister =
        await container.read(authControllerProvider.notifier).register(
              displayName: 'Taylor',
              email: 'taylor@example.com',
              password: 'secret1',
            );

    expect(didRegister, isFalse);
    expect(
      container.read(authControllerProvider).errorMessage,
      'Unable to create your account right now.',
    );
  });

  test('duplicate registration suggests signing in instead', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(
            registerError: const ApiException(
              code: 'EMAIL_ALREADY_REGISTERED',
              message: 'sensitive duplicate registration detail',
              statusCode: 409,
            ),
          ),
        ),
        sessionPersistenceProvider.overrideWithValue(
          InMemorySessionPersistence(),
        ),
      ],
    );
    addTearDown(container.dispose);

    final didRegister =
        await container.read(authControllerProvider.notifier).register(
              displayName: 'Taylor',
              email: 'taylor@example.com',
              password: 'secret1',
            );

    expect(didRegister, isFalse);
    expect(
      container.read(authControllerProvider).errorMessage,
      'This email already has an account. Sign in instead.',
    );
  });

  test('invalid login credentials use safe credential guidance', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(
            loginError: const ApiException(
              code: 'INVALID_CREDENTIALS',
              message: 'sensitive authentication detail',
              statusCode: 401,
            ),
          ),
        ),
        sessionPersistenceProvider.overrideWithValue(
          InMemorySessionPersistence(),
        ),
      ],
    );
    addTearDown(container.dispose);

    final didLogin =
        await container.read(authControllerProvider.notifier).login(
              email: 'user@example.com',
              password: 'wrong-password',
            );

    expect(didLogin, isFalse);
    expect(
      container.read(authControllerProvider).errorMessage,
      'Email or password is incorrect.',
    );
  });

  test('network registration failure uses a safe connection error', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(
            registerError: const ApiException(
              code: 'NETWORK_ERROR',
              message: 'socket address and connection details',
            ),
          ),
        ),
        sessionPersistenceProvider.overrideWithValue(
          InMemorySessionPersistence(),
        ),
      ],
    );
    addTearDown(container.dispose);

    final didRegister =
        await container.read(authControllerProvider.notifier).register(
              displayName: 'Taylor',
              email: 'taylor@example.com',
              password: 'secret1',
            );

    expect(didRegister, isFalse);
    expect(
      container.read(authControllerProvider).errorMessage,
      "We couldn't connect. Please try again.",
    );
  });

  test('unknown login server failure uses a safe connection error', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        authRepositoryProvider.overrideWithValue(
          FakeAuthRepository(
            loginError: const ApiException(
              code: 'API_ERROR',
              message: 'database host and internal failure details',
              statusCode: 500,
            ),
          ),
        ),
        sessionPersistenceProvider.overrideWithValue(
          InMemorySessionPersistence(),
        ),
      ],
    );
    addTearDown(container.dispose);

    final didLogin =
        await container.read(authControllerProvider.notifier).login(
              email: 'user@example.com',
              password: 'secret',
            );

    expect(didLogin, isFalse);
    expect(
      container.read(authControllerProvider).errorMessage,
      "We couldn't connect. Please try again.",
    );
  });

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
