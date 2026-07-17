import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/funds/presentation/fund_detail_screen.dart';

void main() {
  testWidgets('shows fund balance and positions section', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: FundDetailScreen(fundId: 'fund-date'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Present cash'), findsOneWidget);
    expect(find.text('Current'), findsOneWidget);
    expect(find.text('All time'), findsOneWidget);
    expect(find.text('Member positions'), findsOneWidget);
    expect(find.text('View activity'), findsOneWidget);
  });
}
