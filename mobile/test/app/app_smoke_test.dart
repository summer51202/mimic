import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/app/app.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class FakeSessionNotifier extends SessionNotifier {
  FakeSessionNotifier(SessionState initialState) : super() {
    state = initialState;
  }
}

class FakeSessionPersistence implements SessionPersistence {
  FakeSessionPersistence(this._session);

  final SessionState? _session;

  @override
  Future<void> clearSession() async {}

  @override
  Future<SessionState?> readSession() async {
    return _session;
  }

  @override
  Future<void> saveSession(SessionState session) async {}
}

void main() {
  testWidgets('renders auth-first app shell for signed-out users', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(null),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('PairFund'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('redirects authenticated users to home', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(null),
          ),
          sessionProvider.overrideWith(
            (ref) => FakeSessionNotifier(
              const SessionState(
                accessToken: 'token',
                refreshToken: 'refresh',
                userId: 'user-1',
              ),
            ),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Our shared funds'), findsOneWidget);
  });

  testWidgets('restores persisted session on app startup', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(
              const SessionState(
                accessToken: 'persisted-token',
                refreshToken: 'persisted-refresh',
                userId: 'user-1',
              ),
            ),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Our shared funds'), findsOneWidget);
  });
}
