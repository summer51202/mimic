import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settlements/data/settlement_repository.dart';
import 'package:pairfund_mobile/features/settlements/presentation/settlement_screen.dart';

class FakeSettlementRepository implements SettlementRepository {
  int fetchCalls = 0;
  int completeCalls = 0;
  int cancelCalls = 0;
  Object? completeError;
  Object? cancelError;
  Completer<void>? cancelCompleter;

  @override
  Future<SettlementSummary> fetchSettlementSummary(String fundId) async {
    fetchCalls += 1;
    return const SettlementSummary(
      currentSettlementId: 'settlement-1',
      periodLabel: 'Coverage: 2026-03-01 to 2026-03-31',
      lockMessage: 'This period becomes locked after completion',
      suggestions: <SettlementTransferSuggestion>[
        SettlementTransferSuggestion(
          fromUser: 'Partner',
          toUser: 'Edward',
          amountLabel: 'TWD 800',
        ),
      ],
      history: <SettlementHistoryItem>[
        SettlementHistoryItem(
          id: 'settlement-1',
          title: 'pending - TWD 800',
          subtitle: '2026-03-01 to 2026-03-31',
        ),
      ],
    );
  }

  @override
  Future<void> completeSettlement(String settlementId) async {
    completeCalls += 1;
    final error = completeError;
    if (error != null) {
      throw error;
    }
  }

  @override
  Future<void> cancelSettlement(String settlementId) async {
    cancelCalls += 1;
    final error = cancelError;
    if (error != null) {
      throw error;
    }
    final completer = cancelCompleter;
    if (completer != null) {
      await completer.future;
    }
  }
}

Future<void> pumpSettlementScreen(
  WidgetTester tester,
  FakeSettlementRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        settlementRepositoryProvider.overrideWithValue(repository),
      ],
      child: const MaterialApp(
        home: SettlementScreen(fundId: 'fund-date'),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> openCancelDialog(WidgetTester tester) async {
  await tester.ensureVisible(find.text('Cancel settlement').first);
  await tester.tap(find.text('Cancel settlement').first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('complete settlement button triggers repository call',
      (WidgetTester tester) async {
    final repository = FakeSettlementRepository();
    await pumpSettlementScreen(tester, repository);

    await tester.ensureVisible(find.text('Complete settlement'));
    await tester.tap(find.text('Complete settlement'));
    await tester.pumpAndSettle();

    expect(repository.completeCalls, 1);
    expect(find.text('Settlement marked as completed.'), findsOneWidget);
    expect(repository.fetchCalls, greaterThan(1));
  });

  testWidgets('dismissing cancellation makes no repository call',
      (WidgetTester tester) async {
    final repository = FakeSettlementRepository();
    await pumpSettlementScreen(tester, repository);

    await openCancelDialog(tester);
    await tester.tap(find.text('Keep settlement'));
    await tester.pumpAndSettle();

    expect(repository.cancelCalls, 0);
  });

  testWidgets('completion failure shows stable feedback',
      (WidgetTester tester) async {
    final repository = FakeSettlementRepository()
      ..completeError = StateError('server detail');
    await pumpSettlementScreen(tester, repository);

    await tester.ensureVisible(find.text('Complete settlement'));
    await tester.tap(find.text('Complete settlement'));
    await tester.pumpAndSettle();

    expect(repository.completeCalls, 1);
    expect(
      find.text('Unable to complete settlement right now.'),
      findsOneWidget,
    );
  });

  testWidgets('confirming cancellation calls repository and refreshes summary',
      (WidgetTester tester) async {
    final repository = FakeSettlementRepository();
    await pumpSettlementScreen(tester, repository);

    await openCancelDialog(tester);
    await tester.tap(find.text('Cancel settlement').last);
    await tester.pumpAndSettle();

    expect(repository.cancelCalls, 1);
    expect(find.text('Settlement canceled.'), findsOneWidget);
    expect(repository.fetchCalls, greaterThan(1));
  });

  testWidgets('cancellation failure shows stable feedback',
      (WidgetTester tester) async {
    final repository = FakeSettlementRepository()
      ..cancelError = StateError('server detail');
    await pumpSettlementScreen(tester, repository);

    await openCancelDialog(tester);
    await tester.tap(find.text('Cancel settlement').last);
    await tester.pumpAndSettle();

    expect(repository.cancelCalls, 1);
    expect(
      find.text('Unable to cancel settlement right now.'),
      findsOneWidget,
    );
  });

  testWidgets('pending cancellation disables both mutation actions',
      (WidgetTester tester) async {
    final completer = Completer<void>();
    final repository = FakeSettlementRepository()..cancelCompleter = completer;
    await pumpSettlementScreen(tester, repository);

    await openCancelDialog(tester);
    await tester.tap(find.text('Cancel settlement').last);
    await tester.pump();

    final completeButton = tester.widget<ElevatedButton>(
      find.widgetWithText(ElevatedButton, 'Complete settlement'),
    );
    final cancelButton = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Cancel settlement'),
    );
    expect(completeButton.onPressed, isNull);
    expect(cancelButton.onPressed, isNull);

    completer.complete();
    await tester.pumpAndSettle();
  });
}
