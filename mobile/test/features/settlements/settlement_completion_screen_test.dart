import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/settlements/data/settlement_repository.dart';
import 'package:pairfund_mobile/features/settlements/presentation/settlement_screen.dart';

class FakeSettlementRepository implements SettlementRepository {
  bool didComplete = false;

  @override
  Future<SettlementSummary> fetchSettlementSummary(String fundId) async {
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
    didComplete = true;
  }
}

void main() {
  testWidgets('complete settlement button triggers repository call', (WidgetTester tester) async {
    final repository = FakeSettlementRepository();

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

    await tester.ensureVisible(find.text('Complete settlement'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Complete settlement'));
    await tester.pumpAndSettle();

    expect(repository.didComplete, isTrue);
    expect(find.text('Settlement marked as completed.'), findsOneWidget);
  });
}
