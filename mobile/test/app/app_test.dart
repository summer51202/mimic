import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/app/app.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class _EmptySessionPersistence implements SessionPersistence {
  @override
  Future<void> clearSession() async {}

  @override
  Future<SessionState?> readSession() async => null;

  @override
  Future<void> saveSession(SessionState session) async {}
}

void main() {
  testWidgets('sets the visible application title to mimic', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionPersistenceProvider.overrideWithValue(
            _EmptySessionPersistence(),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));

    expect(app.title, 'mimic');
  });
}
