import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/expenses/presentation/create_expense_screen.dart';

void main() {
  testWidgets('shows payer and split sections', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateExpenseScreen(fundId: 'fund-date'),
        ),
      ),
    );

    expect(find.text('Payer'), findsOneWidget);
    expect(find.text('Split mode'), findsOneWidget);
    expect(find.text('Save expense'), findsOneWidget);
  });
}
