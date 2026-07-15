import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/settlements/presentation/settlement_screen.dart';

void main() {
  testWidgets('shows lock explanation', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: SettlementScreen(fundId: 'fund-date'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('This period becomes locked after completion'),
      findsOneWidget,
    );
    expect(find.text('Complete settlement'), findsOneWidget);
  });
}
